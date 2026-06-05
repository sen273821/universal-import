import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parser/engine'
import { normalizeIncomingRule } from '@/lib/rules'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ruleJson = formData.get('rule') as string

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 })
    }

    if (!ruleJson) {
      return NextResponse.json({ error: '请提供解析规则' }, { status: 400 })
    }

    const rule = normalizeIncomingRule(JSON.parse(ruleJson))
    const result = await parseFile(file, rule)
    return NextResponse.json(result)
  } catch (error) {
    console.error('解析失败', error)
    return NextResponse.json(
      { error: `解析失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
