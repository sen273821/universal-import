import { NextRequest, NextResponse } from 'next/server'
import { generateRuleWithAI } from '@/lib/ai/rule-generator'

// POST /api/ai/generate-rule - AI 生成解析规则
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string

    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      )
    }

    // 读取文件内容
    let fileContent = ''
    if (fileType === 'excel') {
      // Excel 文件需要特殊处理
      const arrayBuffer = await file.arrayBuffer()
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      fileContent = XLSX.utils.sheet_to_csv(firstSheet)
    } else if (fileType === 'word') {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      fileContent = result.value
    } else {
      // PDF 或其他格式
      fileContent = await file.text()
    }

    // 调用 AI 生成规则
    const suggestion = await generateRuleWithAI(
      fileContent,
      fileType as 'excel' | 'word' | 'pdf',
      file.name
    )

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('AI rule generation error:', error)
    return NextResponse.json(
      { error: `AI 规则生成失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
