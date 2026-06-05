import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'
import { normalizeIncomingRule, parseStoredRule, serializeRuleConfig } from '@/lib/rules'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rule = await db.parseRule.findUnique({ where: { id } })

    if (!rule) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 })
    }

    return NextResponse.json(parseStoredRule(rule))
  } catch (error) {
    console.error('获取规则详情失败', error)
    return NextResponse.json({ error: '获取规则详情失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const incoming = normalizeIncomingRule(await request.json())

    const rule = await db.parseRule.update({
      where: { id },
      data: {
        name: incoming.name,
        description: incoming.description,
        fileType: incoming.fileType,
        ruleJson: serializeRuleConfig(incoming.ruleJson),
      },
    })

    return NextResponse.json(parseStoredRule(rule))
  } catch (error) {
    console.error('更新规则失败', error)
    return NextResponse.json({ error: '更新规则失败' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.parseRule.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除规则失败', error)
    return NextResponse.json({ error: '删除规则失败' }, { status: 500 })
  }
}
