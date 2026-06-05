import type {
  ColumnMappingRule,
  GridSheet,
  OrderRecord,
  ParseResult,
  ParseRule,
  RawRow,
  TextBlock,
  TextMappingRule,
} from '@/types'
import { parseExcel } from './excel'
import { parsePDF } from './pdf'
import {
  collectFooterText,
  detectHeaderIndex,
  extractByPattern,
  extractFooterLabels,
  makeRawPreviewFromBlocks,
  makeRawPreviewFromSheets,
  mapValidationToParseErrors,
  normalizeCellValue,
  setRecordField,
  toSafeOrderRecord,
  validateOrders,
} from './utils'
import { parseWord } from './word'

type SourcePayload =
  | { kind: 'grid'; sheets: GridSheet[] }
  | { kind: 'text'; blocks: TextBlock[] }

export async function parseFile(file: File, rule: ParseRule): Promise<ParseResult> {
  try {
    const source = await readByFileType(file, rule)
    const records = source.kind === 'grid'
      ? parseGridSource(source.sheets, rule)
      : parseTextSource(source.blocks, rule)

    const normalized = applyRecordPipeline(records, rule)
    const validationErrors = validateOrders(normalized)

    return {
      success: validationErrors.length === 0,
      data: normalized,
      errors: mapValidationToParseErrors(validationErrors),
      validationErrors,
      warnings: [],
      totalRows: records.length,
      parsedRows: normalized.length,
      rawPreview: source.kind === 'grid' ? makeRawPreviewFromSheets(source.sheets) : makeRawPreviewFromBlocks(source.blocks),
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [
        {
          row: 0,
          message: `解析失败：${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      validationErrors: [],
      warnings: [],
      totalRows: 0,
      parsedRows: 0,
      rawPreview: [],
    }
  }
}

async function readByFileType(file: File, rule: ParseRule): Promise<SourcePayload> {
  switch (rule.fileType) {
    case 'excel':
      return { kind: 'grid', sheets: await parseExcel(file, rule) }
    case 'word':
      return { kind: 'text', blocks: await parseWord(file, rule) }
    case 'pdf':
      return { kind: 'text', blocks: await parsePDF(file, rule) }
    default:
      throw new Error(`不支持的文件类型：${rule.fileType}`)
  }
}

function parseGridSource(sheets: GridSheet[], rule: ParseRule): OrderRecord[] {
  const config = rule.ruleJson

  if (config.matrixTranspose?.enabled) {
    const records = sheets.flatMap((sheet) => parseMatrixSheet(sheet, rule))
    return appendGridFooterInfo(records, sheets, rule)
  }

  const rawRows = sheets.flatMap((sheet) =>
    sheet.rows.map<RawRow>((cells, index) => ({
      rowIndex: (sheet.startRowIndex ?? 0) + index,
      sheetName: sheet.sheetName,
      cells,
    })),
  )

  const records = rawRows
    .filter((row) => row.cells.some((cell) => normalizeCellValue(cell) !== ''))
    .map((row) => mapGridRowToRecord(row, sheets.find((sheet) => sheet.sheetName === row.sheetName), rule))
    .filter((record) => isValidDataRow(record))
    .map((record) => toSafeOrderRecord(record))

  return appendGridFooterInfo(records, sheets, rule)
}

function parseTextSource(blocks: TextBlock[], rule: ParseRule): OrderRecord[] {
  const baseBlocks = rule.ruleJson.cardSplit?.enabled
    ? splitCardBlocks(blocks, rule.ruleJson.cardSplit.startPattern, rule.ruleJson.cardSplit.endPattern)
    : blocks

  return baseBlocks
    .map((block) => mapTextBlockToRecord(block, rule))
    .filter((record) => Object.values(record).some((value) => normalizeCellValue(value) !== '' && value !== 0))
    .map((record) => toSafeOrderRecord(record))
}

// 验证是否为有效数据行
function isValidDataRow(record: Partial<OrderRecord>): boolean {
  // 跳过合计行、汇总行等非数据行
  const summaryPatterns = ['合计', '总计', '小计', '汇总', '合计数', '总计数']
  const firstValue = normalizeCellValue(record.skuCode || record.externalCode || '')
  if (summaryPatterns.some(pattern => firstValue.includes(pattern))) {
    return false
  }

  // 至少要有 skuCode 或 skuName 才算有效行
  const hasSkuCode = normalizeCellValue(record.skuCode) !== ''
  const hasSkuName = normalizeCellValue(record.skuName) !== ''
  if (!hasSkuCode && !hasSkuName) {
    return false
  }

  // 如果 skuCode 或 skuName 是明显的非数据内容，跳过
  const nonDataPatterns = ['单据', '电话', '地址', '收货人', '备注', '签字', '创建', '操作', '复审', '状态']
  const codeValue = normalizeCellValue(record.skuCode)
  const nameValue = normalizeCellValue(record.skuName)
  if (hasSkuCode && nonDataPatterns.some(pattern => codeValue.includes(pattern))) {
    return false
  }
  if (hasSkuName && nonDataPatterns.some(pattern => nameValue.includes(pattern))) {
    return false
  }

  return true
}

function mapGridRowToRecord(row: RawRow, sheet: GridSheet | undefined, rule: ParseRule): Partial<OrderRecord> {
  const record: Partial<OrderRecord> = {}

  for (const mapping of rule.ruleJson.columnMappings ?? []) {
    const value = extractColumnValue(mapping, row, sheet)
    if (value !== '') {
      setRecordField(record, mapping.targetField, value)
    }
  }

  return record
}

function extractColumnValue(mapping: ColumnMappingRule, row: RawRow, sheet: GridSheet | undefined): string {
  if (mapping.staticValue) {
    return normalizeCellValue(mapping.staticValue)
  }

  const resolvedIndex = mapping.columnIndex ?? detectHeaderIndex(sheet?.headerRow, mapping.headerPattern, mapping.fallbackPatterns)

  if (resolvedIndex === undefined) {
    return normalizeCellValue(mapping.defaultValue)
  }

  const rawValue = normalizeCellValue(row.cells[resolvedIndex] ?? '')
  const extractedValue = mapping.valuePattern ? extractByPattern(rawValue, mapping.valuePattern) : rawValue
  return extractedValue || normalizeCellValue(mapping.defaultValue)
}

function mapTextBlockToRecord(block: TextBlock, rule: ParseRule): Partial<OrderRecord> {
  const record: Partial<OrderRecord> = {}

  for (const mapping of rule.ruleJson.textMappings ?? []) {
    const value = extractTextValue(mapping, block)
    if (value !== '') {
      setRecordField(record, mapping.targetField, value)
    }
  }

  return record
}

function extractTextValue(mapping: TextMappingRule, block: TextBlock): string {
  const extractedValue = extractByPattern(block.content, mapping.pattern, mapping.groupIndex)
  return extractedValue || normalizeCellValue(mapping.defaultValue)
}

function appendGridFooterInfo(records: OrderRecord[], sheets: GridSheet[], rule: ParseRule): OrderRecord[] {
  if (records.length === 0) {
    return records
  }

  const footerValues = extractGridFooterValues(sheets, rule)
  if (Object.keys(footerValues).length === 0) {
    return records
  }

  return records.map((record) => ({
    ...footerValues,
    ...record,
    storeName: normalizeCellValue(record.storeName) || footerValues.storeName,
    recipientName: normalizeCellValue(record.recipientName) || footerValues.recipientName,
    recipientPhone: normalizeCellValue(record.recipientPhone) || footerValues.recipientPhone,
    recipientAddress: normalizeCellValue(record.recipientAddress) || footerValues.recipientAddress,
  }))
}

function extractGridFooterValues(sheets: GridSheet[], rule: ParseRule): Partial<OrderRecord> {
  const footerValues: Partial<OrderRecord> = {}

  if (rule.ruleJson.footerExtraction?.enabled) {
    const footerText = sheets
      .map((sheet) => collectFooterText(sheet.rows, rule.ruleJson.footerExtraction?.searchFromBottomRows))
      .filter(Boolean)
      .join('\n')

    for (const pattern of rule.ruleJson.footerExtraction.patterns) {
      const value = extractByPattern(footerText, pattern.pattern, pattern.groupIndex)
      if (value) {
        setRecordField(footerValues, pattern.field, value)
      }
    }
  }

  if (rule.ruleJson.footerInfo?.enabled) {
    const footerRows = sheets.flatMap((sheet) => {
      const maxRows = rule.ruleJson.footerInfo?.maxSearchRows ?? 5
      return sheet.rows.slice(Math.max(0, sheet.rows.length - maxRows))
    })

    const labelMap = rule.ruleJson.footerInfo.labels
    if (labelMap.recipientName?.length) {
      footerValues.recipientName = extractFooterLabels(footerRows, labelMap.recipientName)
    }
    if (labelMap.recipientPhone?.length) {
      footerValues.recipientPhone = extractFooterLabels(footerRows, labelMap.recipientPhone)
    }
    if (labelMap.recipientAddress?.length) {
      footerValues.recipientAddress = extractFooterLabels(footerRows, labelMap.recipientAddress)
    }
    if (labelMap.storeName?.length) {
      footerValues.storeName = extractFooterLabels(footerRows, labelMap.storeName)
    }
  }

  return footerValues
}

function parseMatrixSheet(sheet: GridSheet, rule: ParseRule): OrderRecord[] {
  const config = rule.ruleJson.matrixTranspose
  if (!config?.enabled) {
    return []
  }

  const headerRow = sheet.headerRow ?? []
  const startColumnIndex = config.startColumnIndex ?? 1
  const endColumnIndex = config.endColumnIndex ?? Math.max(headerRow.length - 1, 0)
  const storeColumnIndex = config.storeColumnIndex ?? 0
  const startRowIndex = config.startRowIndex ?? 0
  const quantityPattern = config.quantityPattern ? new RegExp(config.quantityPattern, 'i') : /(.+?)[x×*](\d+)/i

  const results: OrderRecord[] = []

  for (let rowIndex = startRowIndex; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? []
    const skuCode = normalizeCellValue(config.skuCodeColumnIndex !== undefined ? row[config.skuCodeColumnIndex] : '')
    const skuName = normalizeCellValue(config.skuNameColumnIndex !== undefined ? row[config.skuNameColumnIndex] : '')
    const skuSpec = normalizeCellValue(config.skuSpecColumnIndex !== undefined ? row[config.skuSpecColumnIndex] : '')

    for (let columnIndex = startColumnIndex; columnIndex <= endColumnIndex; columnIndex += 1) {
      const storeName = normalizeCellValue(config.storeRowIndex !== undefined ? headerRow[columnIndex] : row[storeColumnIndex])
      const cellValue = normalizeCellValue(row[columnIndex])

      if (config.skipEmpty !== false && (!storeName || !cellValue)) {
        continue
      }

      let quantity = Number.parseInt(cellValue, 10)
      let effectiveSkuName = skuName

      if ((!Number.isFinite(quantity) || quantity <= 0) && cellValue) {
        const matched = cellValue.match(quantityPattern)
        if (matched) {
          effectiveSkuName = normalizeCellValue(matched[1]) || skuName
          quantity = Number.parseInt(matched[2], 10)
        }
      }

      results.push({
        externalCode: '',
        storeName,
        recipientName: '',
        recipientPhone: '',
        recipientAddress: '',
        skuCode,
        skuName: effectiveSkuName,
        skuQuantity: Number.isFinite(quantity) ? quantity : 0,
        skuSpec,
        remark: '',
      })
    }
  }

  return results
}

function splitCardBlocks(blocks: TextBlock[], startPattern: string, endPattern?: string): TextBlock[] {
  const startRegex = new RegExp(startPattern, 'im')
  const endRegex = endPattern ? new RegExp(endPattern, 'im') : null
  const lines = blocks.flatMap((block) => block.content.split('\n'))
  const nextBlocks: TextBlock[] = []
  let current: string[] = []

  const pushCurrent = () => {
    const content = current.join('\n').trim()
    if (!content) {
      current = []
      return
    }

    nextBlocks.push({
      index: nextBlocks.length,
      content,
    })
    current = []
  }

  for (const line of lines) {
    if (startRegex.test(line) && current.length > 0) {
      pushCurrent()
    }

    current.push(line)

    if (endRegex?.test(line)) {
      pushCurrent()
    }
  }

  pushCurrent()
  return nextBlocks
}

function applyRecordPipeline(records: OrderRecord[], rule: ParseRule): OrderRecord[] {
  let current = records

  if (rule.ruleJson.splitCellValue?.enabled) {
    current = applySplitCellValue(current, rule)
  }

  if (rule.ruleJson.aggregation?.enabled) {
    current = applyAggregation(current, rule)
  }

  return current
}

function applySplitCellValue(records: OrderRecord[], rule: ParseRule): OrderRecord[] {
  const config = rule.ruleJson.splitCellValue
  if (!config?.enabled) {
    return records
  }

  const separator = new RegExp(config.itemSeparatorPattern, 'm')
  const quantityRegex = config.quantityPattern ? new RegExp(config.quantityPattern, 'i') : /(.+?)[x×*](\d+)/i

  return records.flatMap((record) => {
    const rawValue = normalizeCellValue(record[config.sourceField])
    if (!rawValue.includes('\n') && !separator.test(rawValue)) {
      return [record]
    }

    return rawValue
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const nextRecord: OrderRecord = { ...record }
        const matched = item.match(quantityRegex)
        if (matched) {
          nextRecord.skuName = normalizeCellValue(matched[1]) || record.skuName
          nextRecord.skuQuantity = Number.parseInt(matched[2], 10) || record.skuQuantity
        } else {
          nextRecord.skuName = item
        }

        return nextRecord
      })
  })
}

function applyAggregation(records: OrderRecord[], rule: ParseRule): OrderRecord[] {
  const config = rule.ruleJson.aggregation
  if (!config?.enabled) {
    return records
  }

  const grouped = new Map<string, OrderRecord[]>()

  for (const record of records) {
    const key = normalizeCellValue(record[config.groupByField])
    if (!key) {
      const fallbackKey = `__row_${grouped.size}_${record.skuCode}_${record.skuName}`
      grouped.set(fallbackKey, [record])
      continue
    }

    const items = grouped.get(key) ?? []
    items.push(record)
    grouped.set(key, items)
  }

  return Array.from(grouped.values()).map((items) => {
    if (items.length === 1) {
      return items[0]
    }

    const base = { ...items[0] }

    for (const field of config.keepFirstFields ?? []) {
      const found = items.find((item) => normalizeCellValue(item[field]) !== '')
      if (found) {
        base[field] = found[field] as never
      }
    }

    for (const field of config.joinFields ?? []) {
      const joined = Array.from(new Set(items.map((item) => normalizeCellValue(item[field])).filter(Boolean))).join(' / ')
      if (joined) {
        base[field] = joined as never
      }
    }

    for (const field of config.sumFields ?? []) {
      const total = items.reduce((sum, item) => sum + (Number(item[field] ?? 0) || 0), 0)
      base[field] = total as never
    }

    if (!(config.sumFields ?? []).includes('skuQuantity')) {
      base.skuQuantity = items.reduce((sum, item) => sum + item.skuQuantity, 0)
    }

    return base
  })
}
