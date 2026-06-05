import * as XLSX from 'xlsx'
import type { GridSheet, ParseRule } from '@/types'
import { normalizeCellValue, trimTrailingEmptyRows } from './utils'

export async function parseExcel(file: File, rule: ParseRule): Promise<GridSheet[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const config = rule.ruleJson
  const headerRowIndex = Math.max(0, (config.headerRows ?? 0) - 1)
  const dataStartRow = Math.max(0, config.dataStartRow ?? config.headerRows ?? 0)
  const allowedSheetNames = config.sheetNames?.length ? new Set(config.sheetNames) : null

  return workbook.SheetNames
    .filter((sheetName, index) => {
      if (!config.multiSheet && index > 0) {
        return false
      }

      if (allowedSheetNames && !allowedSheetNames.has(sheetName)) {
        return false
      }

      return true
    })
    .map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils
        .sheet_to_json<(string | number | null)[]>(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
          raw: false,
        })
        .map((row) => row.map((cell) => normalizeCellValue(cell)))

      const slicedRows = rows.slice(dataStartRow)
      const effectiveRows = config.trimTrailingEmptyRows === false ? slicedRows : trimTrailingEmptyRows(slicedRows)

      return {
        sheetName,
        headerRow: rows[headerRowIndex]?.map((cell) => normalizeCellValue(cell)) ?? [],
        rows: effectiveRows,
        startRowIndex: dataStartRow,
      }
    })
}
