import mammoth from 'mammoth'
import type { ParseRule, TextBlock } from '@/types'
import { splitTextBlocks } from './utils'

export async function parseWord(file: File, rule: ParseRule): Promise<TextBlock[]> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = result.value.replace(/\r/g, '')

  return splitTextBlocks(text, rule.ruleJson.textRecordSeparatorPattern)
}
