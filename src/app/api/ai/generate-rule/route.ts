import { NextRequest, NextResponse } from 'next/server'
import { generateRuleWithAI } from '@/lib/ai/rule-generator'
import { analyzeExcelBuffer, analyzeTextContent } from '@/lib/ai/local-analyzer'
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

    let content = ''
    if (fileType === 'excel') {
      const { extractExcelText } = await import('@/lib/parser/file-text')
      content = await extractExcelText(file)
    } else {
      const { extractFileText } = await import('@/lib/parser/file-text')
      content = await extractFileText(file, fileType)
    }

    let suggestion
    try {
      // 优先使用大模型生成规则
      suggestion = await generateRuleWithAI(content, fileType, file.name)
    } catch (aiError) {
      console.warn('大模型规则生成失败，降级到本地分析器', aiError)
      if (fileType === 'excel') {
        const buffer = await file.arrayBuffer()
        suggestion = analyzeExcelBuffer(buffer, file.name)
      } else {
        suggestion = analyzeTextContent(content, fileType, file.name)
      }
    }

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('规则生成失败', error)
    return NextResponse.json(
      { error: `规则生成失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
