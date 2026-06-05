import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parser/engine'
import { ParseRule } from '@/types'

// POST /api/parse - 解析文件
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ruleJson = formData.get('rule') as string

    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      )
    }

    if (!ruleJson) {
      return NextResponse.json(
        { error: '请提供解析规则' },
        { status: 400 }
      )
    }

    const rule: ParseRule = JSON.parse(ruleJson)

    // 执行解析
    const result = await parseFile(file, rule)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { error: `解析失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
