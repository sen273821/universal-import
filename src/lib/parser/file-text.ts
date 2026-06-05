import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import * as XLSX from 'xlsx'
import type { ParserFileType } from '@/types'
import { normalizeCellValue } from './utils'

export async function extractFileText(file: File, fileType: ParserFileType): Promise<string> {
  switch (fileType) {
    case 'excel':
      return extractExcelText(file)
    case 'word':
      return extractWordText(file)
    case 'pdf':
      return extractPdfText(file)
    default:
      return ''
  }
}

async function extractExcelText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    })

    const lines = rows
      .slice(0, 50)
      .map((row) => row.map((cell) => normalizeCellValue(cell)).join('\t'))
      .join('\n')

    return `# Sheet: ${sheetName}\n${lines}`
  }).join('\n\n')
}

async function extractWordText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })
  const result = await parser.getText()
  return result.text
}
