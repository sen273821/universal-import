import { v4 as uuidv4 } from 'uuid'
import type { OrderField, ParseRule, ParseRuleConfig, ParserFileType } from '@/types'

export const ORDER_FIELD_LABELS: Record<OrderField, string> = {
  externalCode: '外部编码',
  storeName: '收货门店',
  recipientName: '收件人姓名',
  recipientPhone: '收件人电话',
  recipientAddress: '收件人地址',
  skuCode: 'SKU物品编码',
  skuName: 'SKU物品名称',
  skuQuantity: 'SKU发货数量',
  skuSpec: 'SKU规格型号',
  remark: '备注',
}

export function createEmptyRule(fileType: ParserFileType = 'excel'): ParseRule {
  return {
    id: `draft-${uuidv4()}`,
    name: '未命名规则',
    description: '',
    fileType,
    ruleJson: {
      headerRows: 1,
      dataStartRow: 1,
      trimTrailingEmptyRows: true,
      multiSheet: false,
      textRecordSeparatorPattern: '',
      columnMappings: [],
      textMappings: [],
      footerExtraction: {
        enabled: false,
        searchFromBottomRows: 5,
        patterns: [],
      },
      footerInfo: {
        enabled: false,
        labels: {
          recipientName: ['收件人', '姓名'],
          recipientPhone: ['电话', '手机号'],
          recipientAddress: ['地址', '收货地址'],
          storeName: ['门店', '收货门店'],
        },
        maxSearchRows: 5,
      },
      aggregation: {
        enabled: false,
        groupByField: 'externalCode',
        joinFields: ['remark'],
        sumFields: ['skuQuantity'],
        keepFirstFields: ['storeName', 'recipientName', 'recipientPhone', 'recipientAddress'],
      },
      matrixTranspose: {
        enabled: false,
        storeColumnIndex: 0,
        startColumnIndex: 1,
        startRowIndex: 0,
        quantityPattern: '(.+?)[x×*](\\d+)',
        skipEmpty: true,
      },
      cardSplit: {
        enabled: false,
        startPattern: '',
        endPattern: '',
      },
      splitCellValue: {
        enabled: false,
        sourceField: 'skuName',
        itemSeparatorPattern: '\\n+',
        quantityPattern: '(.+?)[x×*](\\d+)',
      },
    },
  }
}

export function parseStoredRule(rule: {
  id: string
  name: string
  description: string | null
  fileType: string
  ruleJson: string
  createdAt: Date
  updatedAt: Date
}): ParseRule {
  const parsed = parseRuleConfig(rule.ruleJson)

  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? '',
    fileType: normalizeFileType(rule.fileType),
    ruleJson: parsed,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}

export function parseRuleConfig(ruleJson: string | ParseRuleConfig): ParseRuleConfig {
  if (typeof ruleJson === 'string') {
    const parsed = JSON.parse(ruleJson) as ParseRuleConfig
    return withRuleDefaults(parsed)
  }

  return withRuleDefaults(ruleJson)
}

export function serializeRuleConfig(ruleJson: string | ParseRuleConfig): string {
  return JSON.stringify(parseRuleConfig(ruleJson))
}

export function normalizeIncomingRule(input: Partial<ParseRule>): ParseRule {
  return {
    id: input.id,
    name: input.name?.trim() || '未命名规则',
    description: input.description?.trim() || '',
    fileType: normalizeFileType(input.fileType),
    ruleJson: parseRuleConfig(input.ruleJson ?? {}),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}

function normalizeFileType(fileType?: string): ParserFileType {
  if (fileType === 'word' || fileType === 'pdf') {
    return fileType
  }

  return 'excel'
}

function withRuleDefaults(ruleJson: ParseRuleConfig): ParseRuleConfig {
  const base = createEmptyRule().ruleJson

  // 安全合并 footerExtraction
  const footerExtraction = {
    enabled: ruleJson.footerExtraction?.enabled ?? base.footerExtraction!.enabled,
    searchFromBottomRows: ruleJson.footerExtraction?.searchFromBottomRows ?? base.footerExtraction!.searchFromBottomRows,
    patterns: ruleJson.footerExtraction?.patterns ?? base.footerExtraction!.patterns ?? [],
  }

  // 安全合并 footerInfo
  const footerInfo = {
    enabled: ruleJson.footerInfo?.enabled ?? base.footerInfo!.enabled,
    labels: {
      ...base.footerInfo!.labels,
      ...ruleJson.footerInfo?.labels,
    },
    maxSearchRows: ruleJson.footerInfo?.maxSearchRows ?? base.footerInfo!.maxSearchRows,
  }

  // 安全合并 aggregation
  const aggregation = {
    enabled: ruleJson.aggregation?.enabled ?? base.aggregation!.enabled,
    groupByField: ruleJson.aggregation?.groupByField ?? base.aggregation!.groupByField,
    joinFields: ruleJson.aggregation?.joinFields ?? base.aggregation!.joinFields,
    sumFields: ruleJson.aggregation?.sumFields ?? base.aggregation!.sumFields,
    keepFirstFields: ruleJson.aggregation?.keepFirstFields ?? base.aggregation!.keepFirstFields,
  }

  // 安全合并 matrixTranspose
  const matrixTranspose = {
    enabled: ruleJson.matrixTranspose?.enabled ?? base.matrixTranspose!.enabled,
    storeColumnIndex: ruleJson.matrixTranspose?.storeColumnIndex ?? base.matrixTranspose!.storeColumnIndex,
    startColumnIndex: ruleJson.matrixTranspose?.startColumnIndex ?? base.matrixTranspose!.startColumnIndex,
    startRowIndex: ruleJson.matrixTranspose?.startRowIndex ?? base.matrixTranspose!.startRowIndex,
    quantityPattern: ruleJson.matrixTranspose?.quantityPattern ?? base.matrixTranspose!.quantityPattern,
    skipEmpty: ruleJson.matrixTranspose?.skipEmpty ?? base.matrixTranspose!.skipEmpty,
  }

  // 安全合并 cardSplit
  const cardSplit = {
    enabled: ruleJson.cardSplit?.enabled ?? base.cardSplit!.enabled,
    startPattern: ruleJson.cardSplit?.startPattern ?? base.cardSplit!.startPattern,
    endPattern: ruleJson.cardSplit?.endPattern ?? base.cardSplit!.endPattern,
  }

  // 安全合并 splitCellValue
  const splitCellValue = {
    enabled: ruleJson.splitCellValue?.enabled ?? base.splitCellValue!.enabled,
    sourceField: ruleJson.splitCellValue?.sourceField ?? base.splitCellValue!.sourceField,
    itemSeparatorPattern: ruleJson.splitCellValue?.itemSeparatorPattern ?? base.splitCellValue!.itemSeparatorPattern,
    quantityPattern: ruleJson.splitCellValue?.quantityPattern ?? base.splitCellValue!.quantityPattern,
  }

  return {
    headerRows: ruleJson.headerRows ?? base.headerRows,
    dataStartRow: ruleJson.dataStartRow ?? base.dataStartRow,
    trimTrailingEmptyRows: ruleJson.trimTrailingEmptyRows ?? base.trimTrailingEmptyRows,
    multiSheet: ruleJson.multiSheet ?? base.multiSheet,
    textRecordSeparatorPattern: ruleJson.textRecordSeparatorPattern ?? base.textRecordSeparatorPattern,
    columnMappings: ruleJson.columnMappings ?? base.columnMappings ?? [],
    textMappings: ruleJson.textMappings ?? base.textMappings ?? [],
    sheetNames: ruleJson.sheetNames ?? [],
    footerExtraction,
    footerInfo,
    aggregation,
    matrixTranspose,
    cardSplit,
    splitCellValue,
  }
}
