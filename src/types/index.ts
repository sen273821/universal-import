// 核心类型定义

// 解析规则
export interface ParseRule {
  id: string
  name: string
  description?: string
  fileType: 'excel' | 'word' | 'pdf'
  structure: FileStructure
  fieldMappings: FieldMapping[]
  transformations?: Transformation[]
  footerExtraction?: FooterExtraction
  aggregation?: AggregationConfig
  matrixTranspose?: MatrixTransposeConfig
  cardSplit?: CardSplitConfig
  createdAt?: Date
  updatedAt?: Date
}

// 文件结构
export interface FileStructure {
  headerRows: number        // 头部行数（跳过）
  dataStartRow: number      // 数据起始行
  footerRows?: number       // 尾部行数
  sheetIndex?: number       // Sheet 索引（Excel）
  allSheets?: boolean       // 是否遍历所有 Sheet
  cardStartPattern?: string // 卡片起始标志（正则）
}

// 字段映射
export interface FieldMapping {
  source: string           // 来源列名或正则
  target: string           // 目标字段名
  type: 'column' | 'regex' | 'static' | 'computed'
  value?: string           // 静态值或计算表达式
  columnIndex?: number     // 列索引（从0开始）
  regex?: string           // 正则表达式
  defaultValue?: string    // 默认值
  confidence?: number      // AI 生成的置信度
}

// 转换规则
export interface Transformation {
  type: 'split' | 'merge' | 'replace' | 'extract'
  sourceField: string
  targetField: string
  config: Record<string, any>
}

// 尾部信息提取
export interface FooterExtraction {
  enabled: boolean
  patterns: {
    field: string
    regex: string
  }[]
}

// 跨行聚合配置
export interface AggregationConfig {
  enabled: boolean
  groupByField: string     // 按哪个字段分组（如配送单号）
  aggregateFields: string[] // 需要聚合的字段
}

// 矩阵转置配置
export interface MatrixTransposeConfig {
  enabled: boolean
  rowField: string         // 行字段名（如门店名）
  columnField: string      // 列字段名（如日期）
  valueField: string       // 值字段名（如数量）
  splitPattern?: string    // 复合值拆分正则
}

// 卡片式拆分配置
export interface CardSplitConfig {
  enabled: boolean
  cardStartPattern: string // 卡片起始标志（正则）
  cardEndPattern?: string  // 卡片结束标志
}

// 订单
export interface Order {
  id?: string
  externalCode?: string    // 外部编码
  storeName?: string       // 收货门店
  recipientName?: string   // 收件人姓名
  recipientPhone?: string  // 收件人电话
  recipientAddress?: string // 收件人地址
  skuCode: string          // SKU 物品编码
  skuName: string          // SKU 物品名称
  skuQuantity: number      // SKU 发货数量
  skuSpec?: string         // SKU 规格型号
  remark?: string          // 备注
  ruleId?: string
  createdAt?: Date
}

// 验证结果
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// 验证错误
export interface ValidationError {
  row: number
  field: string
  message: string
  value?: any
}

// 解析结果
export interface ParseResult {
  success: boolean
  data: Order[]
  errors: ParseError[]
  warnings: string[]
  totalRows: number
  parsedRows: number
}

// 解析错误
export interface ParseError {
  row: number
  message: string
  details?: any
}

// AI 生成的规则建议
export interface AIRuleSuggestion {
  rule: ParseRule
  confidence: number
  explanation: string
  fieldConfidences: {
    field: string
    confidence: number
    reason: string
  }[]
}

// 文件上传状态
export interface UploadState {
  file: File | null
  progress: number
  status: 'idle' | 'uploading' | 'parsing' | 'success' | 'error'
  error?: string
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 搜索参数
export interface OrderSearchParams extends PaginationParams {
  externalCode?: string
  recipientName?: string
  startDate?: string
  endDate?: string
}
