import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'

// GET /api/rules - 获取所有规则
export async function GET(request: NextRequest) {
  try {
    const rules = await db.parseRule.findMany({
      orderBy: { updatedAt: 'desc' }
    })
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    )
  }
}

// POST /api/rules - 创建新规则
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, fileType, ruleJson } = body

    if (!name || !fileType || !ruleJson) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const rule = await db.parseRule.create({
      data: {
        name,
        description,
        fileType,
        ruleJson
      }
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating rule:', error)
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    )
  }
}
