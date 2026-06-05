export const ORDER_FIELDS = [
  'externalCode',
  'storeName',
  'recipientName',
  'recipientPhone',
  'recipientAddress',
  'skuCode',
  'skuName',
  'skuQuantity',
  'skuSpec',
  'remark',
] as const

export type OrderField = (typeof ORDER_FIELDS)[number]

export type ParserFileType = 'excel' | 'word' | 'pdf'

export interface CellReference {
  row: number
  col: number
  sheetName?: string
}

export interface FileCell extends CellReference {
  value: string
}

export interface RawRow {
  rowIndex: number
  sheetName?: string
  cells: string[]
}

export interface GridSheet {
  sheetName: string
  rows: string[][]
  headerRow?: string[]
  startRowIndex?: number
}

export interface TextBlock {
  index: number
  content: string
}

export interface ExtractPattern {
  field: OrderField
  pattern: string
  groupIndex?: number
  required?: boolean
}

export interface FooterExtractionRule {
  enabled: boolean
  searchFromBottomRows?: number
  patterns: ExtractPattern[]
}

export interface FooterInfoRule {
  enabled: boolean
  labels: Partial<Record<'recipientName' | 'recipientPhone' | 'recipientAddress' | 'storeName', string[]>>
  maxSearchRows?: number
}

export interface AggregationRule {
  enabled: boolean
  groupByField: OrderField
  joinFields?: OrderField[]
  sumFields?: OrderField[]
  keepFirstFields?: OrderField[]
}

export interface MatrixTransposeRule {
  enabled: boolean
  storeColumnIndex?: number
  storeRowIndex?: number
  skuCodeColumnIndex?: number
  skuNameColumnIndex?: number
  skuSpecColumnIndex?: number
  startColumnIndex?: number
  endColumnIndex?: number
  startRowIndex?: number
  quantityPattern?: string
  skipEmpty?: boolean
}

export interface CardSplitRule {
  enabled: boolean
  startPattern: string
  endPattern?: string
}

export interface SplitCellValueRule {
  enabled: boolean
  sourceField: OrderField
  itemSeparatorPattern: string
  quantityPattern?: string
  codePattern?: string
  specPattern?: string
}

export interface ColumnMappingRule {
  targetField: OrderField
  columnIndex?: number
  headerPattern?: string
  fallbackPatterns?: string[]
  valuePattern?: string
  defaultValue?: string
  staticValue?: string
  required?: boolean
}

export interface TextMappingRule {
  targetField: OrderField
  pattern: string
  groupIndex?: number
  required?: boolean
  defaultValue?: string
}

export interface ParseRuleConfig {
  headerRows?: number
  dataStartRow?: number
  trimTrailingEmptyRows?: boolean
  multiSheet?: boolean
  textRecordSeparatorPattern?: string
  sheetNames?: string[]
  columnMappings?: ColumnMappingRule[]
  textMappings?: TextMappingRule[]
  footerExtraction?: FooterExtractionRule
  footerInfo?: FooterInfoRule
  aggregation?: AggregationRule
  matrixTranspose?: MatrixTransposeRule
  cardSplit?: CardSplitRule
  splitCellValue?: SplitCellValueRule
}

export interface ParseRule {
  id?: string
  name: string
  description?: string
  fileType: ParserFileType
  ruleJson: ParseRuleConfig
  createdAt?: string
  updatedAt?: string
}

export interface OrderRecord {
  id?: string
  externalCode?: string
  storeName?: string
  recipientName?: string
  recipientPhone?: string
  recipientAddress?: string
  skuCode: string
  skuName: string
  skuQuantity: number
  skuSpec?: string
  remark?: string
  ruleId?: string
  createdAt?: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: unknown
}

export interface ParseError {
  row: number
  message: string
  details?: unknown
}

export interface ParseResult {
  success: boolean
  data: OrderRecord[]
  errors: ParseError[]
  validationErrors: ValidationError[]
  warnings: string[]
  totalRows: number
  parsedRows: number
  rawPreview?: string[][]
}

export interface ExportOrderPayload {
  orders?: OrderRecord[]
  filters?: Partial<Omit<OrderSearchParams, 'page' | 'pageSize'>>
}

export interface AIRuleSuggestion {
  rule: ParseRule
  confidence: number
  explanation: string
  assumptions: string[]
}

export interface UploadState {
  file: File | null
  progress: number
  status: 'idle' | 'uploading' | 'parsing' | 'success' | 'error'
  error?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface OrderSearchParams extends PaginationParams {
  externalCode?: string
  recipientName?: string
  startDate?: string
  endDate?: string
}
