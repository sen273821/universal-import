import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db/prisma'
import type { ExportOrderPayload, OrderRecord } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportOrderPayload
    const orders = Array.isArray(body.orders) && body.orders.length > 0
      ? body.orders
      : await fetchOrdersByFilters(body.filters)

    const worksheet = XLSX.utils.json_to_sheet(
      orders.map((order) => ({
        外部编码: order.externalCode ?? '',
        收货门店: order.storeName ?? '',
        收件人姓名: order.recipientName ?? '',
        收件人电话: order.recipientPhone ?? '',
        收件人地址: order.recipientAddress ?? '',
        SKU物品编码: order.skuCode ?? '',
        SKU物品名称: order.skuName ?? '',
        SKU发货数量: order.skuQuantity ?? 0,
        SKU规格型号: order.skuSpec ?? '',
        备注: order.remark ?? '',
        提交时间: order.createdAt ?? '',
      })),
    )

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '运单数据')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''orders-${Date.now()}.xlsx`,
      },
    })
  } catch (error) {
    console.error('导出 Excel 失败', error)
    return NextResponse.json({ error: '导出 Excel 失败' }, { status: 500 })
  }
}

async function fetchOrdersByFilters(filters?: ExportOrderPayload['filters']): Promise<OrderRecord[]> {
  const where: Prisma.OrderWhereInput = {}

  if (filters?.externalCode) {
    where.externalCode = { contains: filters.externalCode }
  }
  if (filters?.recipientName) {
    where.recipientName = { contains: filters.recipientName }
  }
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`)
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`)
    }
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return orders.map((order) => ({
    id: order.id,
    externalCode: order.externalCode ?? '',
    storeName: order.storeName ?? '',
    recipientName: order.recipientName ?? '',
    recipientPhone: order.recipientPhone ?? '',
    recipientAddress: order.recipientAddress ?? '',
    skuCode: order.skuCode,
    skuName: order.skuName,
    skuQuantity: order.skuQuantity,
    skuSpec: order.skuSpec ?? '',
    remark: order.remark ?? '',
    ruleId: order.ruleId ?? '',
    createdAt: order.createdAt.toISOString(),
  }))
}
