import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'

// GET /api/orders - 获取订单列表（分页）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const externalCode = searchParams.get('externalCode') || undefined
    const recipientName = searchParams.get('recipientName') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const where: any = {}
    if (externalCode) {
      where.externalCode = { contains: externalCode }
    }
    if (recipientName) {
      where.recipientName = { contains: recipientName }
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      db.order.count({ where })
    ])

    return NextResponse.json({
      data: orders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - 批量创建订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orders, ruleId } = body

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: 'Invalid orders data' },
        { status: 400 }
      )
    }

    // 验证必填字段
    const errors: { row: number; field: string; message: string }[] = []
    orders.forEach((order: any, index: number) => {
      if (!order.skuCode) {
        errors.push({ row: index + 1, field: 'skuCode', message: 'SKU编码必填' })
      }
      if (!order.skuName) {
        errors.push({ row: index + 1, field: 'skuName', message: 'SKU名称必填' })
      }
      if (!order.skuQuantity || order.skuQuantity <= 0) {
        errors.push({ row: index + 1, field: 'skuQuantity', message: '数量必须为正数' })
      }
      // A组/B组二选一校验
      const hasStoreName = !!order.storeName
      const hasRecipient = !!(order.recipientName && order.recipientPhone && order.recipientAddress)
      if (!hasStoreName && !hasRecipient) {
        errors.push({ row: index + 1, field: 'recipient', message: '收货门店或收件人信息必填一组' })
      }
    })

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    // 批量插入
    const createdOrders = await db.order.createMany({
      data: orders.map((order: any) => ({
        externalCode: order.externalCode,
        storeName: order.storeName,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        recipientAddress: order.recipientAddress,
        skuCode: order.skuCode,
        skuName: order.skuName,
        skuQuantity: parseInt(order.skuQuantity),
        skuSpec: order.skuSpec,
        remark: order.remark,
        ruleId: ruleId || null
      }))
    })

    return NextResponse.json({
      success: true,
      count: createdOrders.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating orders:', error)
    return NextResponse.json(
      { error: 'Failed to create orders' },
      { status: 500 }
    )
  }
}
