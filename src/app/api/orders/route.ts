import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'
import { normalizeOrderInput } from '@/lib/orders'
import type { OrderRecord } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20))
    const externalCode = searchParams.get('externalCode')?.trim() ?? ''
    const recipientName = searchParams.get('recipientName')?.trim() ?? ''
    const startDate = searchParams.get('startDate')?.trim() ?? ''
    const endDate = searchParams.get('endDate')?.trim() ?? ''

    const where: Prisma.OrderWhereInput = {}
    if (externalCode) {
      where.externalCode = { contains: externalCode }
    }
    if (recipientName) {
      where.recipientName = { contains: recipientName }
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`)
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`)
      }
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      data: orders.map(serializeOrder),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (error) {
    console.error('获取运单列表失败', error)
    return NextResponse.json({ error: '获取运单列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orders = Array.isArray(body.orders) ? body.orders : []
    const ruleId = typeof body.ruleId === 'string' && body.ruleId.trim() ? body.ruleId.trim() : undefined

    if (orders.length === 0) {
      return NextResponse.json({ error: '请提供要提交的运单数据' }, { status: 400 })
    }

    const normalizedOrders = orders.map((order: Record<string, unknown>) => normalizeOrderInput(order, ruleId))
    const validationErrors = validateOrderPayload(normalizedOrders)

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: '运单校验失败', validationErrors }, { status: 400 })
    }

    const result = await db.order.createMany({
      data: normalizedOrders,
    })

    return NextResponse.json({ success: true, count: result.count }, { status: 201 })
  } catch (error) {
    console.error('提交运单失败', error)
    return NextResponse.json({ error: '提交运单失败' }, { status: 500 })
  }
}

function validateOrderPayload(orders: Array<OrderRecord & { ruleId?: string }>) {
  return orders.flatMap((order, index) => {
    const row = index + 1
    const errors: Array<{ row: number; field: string; message: string }> = []

    if (!order.skuCode) {
      errors.push({ row, field: 'skuCode', message: 'SKU物品编码必填' })
    }
    if (!order.skuName) {
      errors.push({ row, field: 'skuName', message: 'SKU物品名称必填' })
    }
    if (!Number.isFinite(order.skuQuantity) || order.skuQuantity <= 0) {
      errors.push({ row, field: 'skuQuantity', message: 'SKU发货数量必须为正数' })
    }

    const hasGroupA = Boolean(order.storeName)
    const hasGroupB = Boolean(order.recipientName && order.recipientPhone && order.recipientAddress)
    if (!hasGroupA && !hasGroupB) {
      errors.push({ row, field: 'recipientGroup', message: '收货门店或收件人信息至少填写一组' })
    }

    return errors
  })
}

function serializeOrder(order: Awaited<ReturnType<typeof db.order.findMany>>[number]): OrderRecord {
  return {
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
  }
}
