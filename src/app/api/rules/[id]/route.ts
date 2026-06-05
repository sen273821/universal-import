import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'

// GET /api/rules/[id] - 获取单个规则
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rule = await db.parseRule.findUnique({
      where: { id }
    })

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error fetching rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rule' },
      { status: 500 }
    )
  }
}

// PUT /api/rules/[id] - 更新规则
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, fileType, ruleJson } = body

    const rule = await db.parseRule.update({
      where: { id },
      data: {
        name,
        description,
        fileType,
        ruleJson
      }
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error updating rule:', error)
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    )
  }
}

// DELETE /api/rules/[id] - 删除规则
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.parseRule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    )
  }
}
