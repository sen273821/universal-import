import * as XLSX from 'xlsx'
import { ParseRule } from '@/types'

// 解析 Excel 文件
export async function parseExcel(file: File, rule: ParseRule): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const allData: any[] = []

        // 确定要解析的 Sheet
        const sheetsToParse = rule.structure.allSheets
          ? workbook.SheetNames
          : [workbook.SheetNames[rule.structure.sheetIndex || 0]]

        sheetsToParse.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName]
          if (!worksheet) return

          // 转换为 JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false
          })

          if (jsonData.length === 0) return

          // 跳过头部行
          const headerRow = jsonData[rule.structure.headerRows] as any[]
          const dataRows = jsonData.slice(rule.structure.dataStartRow)

          // 跳过尾部行
          const footerRows = rule.structure.footerRows || 0
          const validRows = footerRows > 0
            ? dataRows.slice(0, -footerRows)
            : dataRows

          // 转换为对象数组
          const headers = headerRow.map((h: any) => String(h || '').trim())
          const sheetData = validRows.map((row: unknown) => {
            const rowArray = row as any[]
            const obj: any = {}
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = rowArray[index] !== undefined ? rowArray[index] : ''
              }
            })
            return obj
          })

          allData.push(...sheetData)
        })

        resolve(allData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

// 提取尾部信息
export function extractFooterInfo(
  jsonData: any[][],
  footerStartRow: number,
  patterns: { field: string; regex: string }[]
): Record<string, string> {
  const result: Record<string, string> = {}

  const footerRows = jsonData.slice(footerStartRow)

  footerRows.forEach(row => {
    const rowText = row.join(' ')

    patterns.forEach(({ field, regex }) => {
      const match = rowText.match(new RegExp(regex))
      if (match) {
        result[field] = match[1] || match[0]
      }
    })
  })

  return result
}

// 合并多 Sheet 数据
export function mergeSheetData(sheetsData: any[][]): any[] {
  return sheetsData.flat()
}
