import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
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

    let suggestion

    if (fileType === 'excel') {
      // Excel: 读取 buffer 进行本地分析
      const buffer = await file.arrayBuffer()
      suggestion = analyzeExcelBuffer(buffer, file.name)
    } else {
      // Word/PDF: 提取文本进行本地分析
      const { extractFileText } = await import('@/lib/parser/file-text')
      const text = await extractFileText(file, fileType)
      suggestion = analyzeTextContent(text, fileType, file.name)
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
