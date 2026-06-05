import type { ParserFileType } from '@/types'

export function detectFileType(fileName: string): ParserFileType {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith('.docx')) {
    return 'word'
  }

  if (lowerName.endsWith('.pdf')) {
    return 'pdf'
  }

  return 'excel'
}

export const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
}
