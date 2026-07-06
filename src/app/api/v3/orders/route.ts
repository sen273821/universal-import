import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/** GET /api/v3/orders
 *  V3 查询/校验运单是否存在并获取详情
 *  Query: externalCode, page, pageSize, startDate, endDate, recipientName
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalCode = searchParams.get('externalCode')?.trim() ?? ''
    const recipientName = searchParams.get('recipientName')?.trim() ?? ''
    const startDate = searchParams.get('startDate')?.trim() ?? ''
    const endDate = searchParams.get('endDate')?.trim() ?? ''
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20))

    const where: Record<string, unknown> = {}
    if (externalCode) where.externalCode = { contains: externalCode }
    if (recipientName) where.recipientName = { contains: recipientName }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(`${startDate}T00:00:00.000Z`)
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(`${endDate}T23:59:59.999Z`)
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
    console.error('V3 查询运单失败', error)
    return NextResponse.json({ error: '查询运单失败' }, { status: 500 })
  }
}

/** POST /api/v3/orders/validate-sku
 *  校验 SKU 是否归属于指定运单
 *  Body: { externalCode, skuCode }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const externalCode = String(body.externalCode ?? '').trim()
    const skuCode = String(body.skuCode ?? '').trim()

    if (!externalCode || !skuCode) {
      return NextResponse.json({ error: '缺少 externalCode 或 skuCode' }, { status: 400 })
    }

    const match = await db.order.findFirst({
      where: { externalCode, skuCode },
    })

    if (!match) {
      return NextResponse.json({ valid: false, error: 'SKU 不属于该运单或运单不存在' }, { status: 404 })
    }

    return NextResponse.json({ valid: true, order: serializeOrder(match) })
  } catch (error) {
    console.error('V3 校验 SKU 归属失败', error)
    return NextResponse.json({ error: '校验失败' }, { status: 500 })
  }
}

function serializeOrder(order: Awaited<ReturnType<typeof db.order.findMany>>[number]) {
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
