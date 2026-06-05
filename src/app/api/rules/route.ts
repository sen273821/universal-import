import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'
import { normalizeIncomingRule, parseStoredRule, serializeRuleConfig } from '@/lib/rules'

export async function GET() {
  try {
    const rules = await db.parseRule.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(rules.map(parseStoredRule))
  } catch (error) {
    console.error('获取规则列表失败', error)
    return NextResponse.json({ error: '获取规则列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = normalizeIncomingRule(await request.json())

    if (!incoming.name || !incoming.fileType) {
      return NextResponse.json({ error: '规则名称和文件类型必填' }, { status: 400 })
    }

    const rule = await db.parseRule.create({
      data: {
        name: incoming.name,
        description: incoming.description,
        fileType: incoming.fileType,
        ruleJson: serializeRuleConfig(incoming.ruleJson),
      },
    })

    return NextResponse.json(parseStoredRule(rule), { status: 201 })
  } catch (error) {
    console.error('创建规则失败', error)
    return NextResponse.json({ error: '创建规则失败' }, { status: 500 })
  }
}
