import { PDFParse } from 'pdf-parse'
import type { ParseRule, TextBlock } from '@/types'
import { splitTextBlocks } from './utils'

export async function parsePDF(file: File, rule: ParseRule): Promise<TextBlock[]> {
  const arrayBuffer = await file.arrayBuffer()
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })

  try {
    const textResult = await parser.getText()
    return splitTextBlocks(textResult.text, rule.ruleJson.textRecordSeparatorPattern)
  } finally {
    await parser.destroy()
  }
}
