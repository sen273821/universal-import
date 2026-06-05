import { NextRequest, NextResponse } from 'next/server'
import { generateRuleWithAI } from '@/lib/ai/rule-generator'
import { extractFileText } from '@/lib/parser/file-text'
import type { ParserFileType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as ParserFileType

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 })
    }

    if (!fileType || !['excel', 'word', 'pdf'].includes(fileType)) {
      return NextResponse.json({ error: '文件类型不正确' }, { status: 400 })
    }

    const fileContent = await extractFileText(file, fileType)
    const suggestion = await generateRuleWithAI(fileContent, fileType, file.name)

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('AI 规则生成失败', error)
    return NextResponse.json(
      { error: `AI 规则生成失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
