import type { GridSheet, OrderField, OrderRecord, ParseError, TextBlock, ValidationError } from '@/types'

export function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }

  return String(value).replace(/\r/g, '').trim()
}

export function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => normalizeCellValue(cell) === '')
}

export function trimTrailingEmptyRows(rows: string[][]): string[][] {
  const nextRows = [...rows]

  while (nextRows.length > 0 && isRowEmpty(nextRows[nextRows.length - 1])) {
    nextRows.pop()
  }

  return nextRows
}

export function buildRegex(pattern: string): RegExp {
  return new RegExp(pattern, 'im')
}

export function extractByPattern(text: string, pattern: string, groupIndex = 1): string {
  const matched = text.match(buildRegex(pattern))
  if (!matched) {
    return ''
  }

  return normalizeCellValue(matched[groupIndex] ?? matched[0])
}

export function detectHeaderIndex(headerRow: string[] | undefined, pattern?: string, fallbacks?: string[]): number | undefined {
  if (!headerRow || headerRow.length === 0) {
    return undefined
  }

  const patterns = [pattern, ...(fallbacks ?? [])].filter(Boolean) as string[]

  for (const candidate of patterns) {
    const regex = buildRegex(candidate)
    const columnIndex = headerRow.findIndex((header) => regex.test(header))
    if (columnIndex >= 0) {
      return columnIndex
    }
  }

  return undefined
}

export function splitTextBlocks(text: string, separatorPattern?: string): TextBlock[] {
  const separator = separatorPattern ? new RegExp(separatorPattern, 'm') : /(?:\n\s*\n|(?:^|\n)[━─—=-]{3,}(?=\n|$))/m
  const blocks = text
    .split(separator)
    .map((content) => content.trim())
    .filter(Boolean)

  return blocks.map((content, index) => ({
    index,
    content,
  }))
}

export function collectFooterText(rows: string[][], searchFromBottomRows?: number): string {
  const effectiveRows = searchFromBottomRows && searchFromBottomRows > 0
    ? rows.slice(Math.max(0, rows.length - searchFromBottomRows))
    : rows

  return effectiveRows
    .map((row) => row.filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n')
}

export function extractFooterLabels(rows: string[][], labels: string[]): string {
  if (labels.length === 0) {
    return ''
  }

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = normalizeCellValue(row[i])
      const isLabel = labels.some((label) => cell.includes(label))
      if (isLabel) {
        // Look for value in the next non-empty cell
        for (let j = i + 1; j < row.length; j++) {
          const nextCell = normalizeCellValue(row[j])
          if (nextCell) {
            // Check if next cell is another label
            const isNextLabel = ['收货人', '收货电话', '收货地址', '收货机构', '备注', '备用', '联系电话', '联系人'].some(
              (l) => nextCell.includes(l),
            )
            if (!isNextLabel) {
              return nextCell
            }
          }
        }
      }
    }
  }

  return ''
}

export function validateOrders(records: OrderRecord[]): ValidationError[] {
  const errors: ValidationError[] = []

  records.forEach((record, index) => {
    const row = index + 1

    if (!normalizeCellValue(record.skuCode)) {
      errors.push({ row, field: 'skuCode', message: 'SKU物品编码必填' })
    }

    if (!normalizeCellValue(record.skuName)) {
      errors.push({ row, field: 'skuName', message: 'SKU物品名称必填' })
    }

    if (!Number.isFinite(record.skuQuantity) || record.skuQuantity <= 0) {
      errors.push({ row, field: 'skuQuantity', message: 'SKU发货数量必须为正数', value: record.skuQuantity })
    }

    const hasGroupA = normalizeCellValue(record.storeName) !== ''
    const hasGroupB = [record.recipientName, record.recipientPhone, record.recipientAddress].every(
      (value) => normalizeCellValue(value) !== '',
    )

    if (!hasGroupA && !hasGroupB) {
      errors.push({ row, field: 'recipientGroup', message: '收货门店或收件人信息至少填写一组' })
    }
  })

  const duplicateCounter = new Map<string, number[]>()
  records.forEach((record, index) => {
    const code = normalizeCellValue(record.externalCode)
    if (!code) {
      return
    }

    const rows = duplicateCounter.get(code) ?? []
    rows.push(index + 1)
    duplicateCounter.set(code, rows)
  })

  duplicateCounter.forEach((rows, code) => {
    if (rows.length < 2) {
      return
    }

    rows.forEach((row) => {
      errors.push({ row, field: 'externalCode', message: `外部编码重复：${code}` })
    })
  })

  return errors
}

export function mapValidationToParseErrors(errors: ValidationError[]): ParseError[] {
  return errors.map((error) => ({
    row: error.row,
    message: `${error.field}: ${error.message}`,
    details: error,
  }))
}

export function makeRawPreviewFromSheets(sheets: GridSheet[]): string[][] {
  return sheets.flatMap((sheet) => sheet.rows.slice(0, 10))
}

export function makeRawPreviewFromBlocks(blocks: TextBlock[]): string[][] {
  return blocks.slice(0, 10).map((block) => [block.content])
}

export function setRecordField(record: Partial<OrderRecord>, field: OrderField, value: string): void {
  if (field === 'skuQuantity') {
    const quantity = Number.parseInt(value, 10)
    record[field] = Number.isFinite(quantity) ? quantity : 0
    return
  }

  record[field] = value as never
}

export function toSafeOrderRecord(record: Partial<OrderRecord>): OrderRecord {
  return {
    externalCode: normalizeCellValue(record.externalCode),
    storeName: normalizeCellValue(record.storeName),
    recipientName: normalizeCellValue(record.recipientName),
    recipientPhone: normalizeCellValue(record.recipientPhone),
    recipientAddress: normalizeCellValue(record.recipientAddress),
    skuCode: normalizeCellValue(record.skuCode),
    skuName: normalizeCellValue(record.skuName),
    skuQuantity: Number.isFinite(record.skuQuantity) ? Number(record.skuQuantity) : 0,
    skuSpec: normalizeCellValue(record.skuSpec),
    remark: normalizeCellValue(record.remark),
  }
}
