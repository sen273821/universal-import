import * as XLSX from 'xlsx'
import type { OrderField, ParseRule, ParseRuleConfig, ParserFileType, AIRuleSuggestion } from '@/types'
import { createEmptyRule } from '@/lib/rules'

/* ─────────────── 关键字映射 ─────────────── */

const FIELD_KEYWORDS: Record<OrderField, string[]> = {
  externalCode: ['外部单号', '外部编码', '外部编号', '订单号', '单号', '运单号', '快递单号', 'external', 'order no', 'order no.'],
  storeName: ['门店', '店铺', '店名', '收货门店', '收货店铺', 'store', 'shop'],
  recipientName: ['收件人', '收货人', '姓名', '联系人', 'recipient', 'name', 'consignee'],
  recipientPhone: ['电话', '手机', '联系电话', '手机号', '收件人电话', '收货人电话', 'phone', 'tel', 'mobile'],
  recipientAddress: ['地址', '收货地址', '收件地址', '详细地址', 'address'],
  skuCode: ['物品编码', '商品编码', 'SKU编码', '货号', '编码', 'sku', 'item code', 'product code'],
  skuName: ['物品名称', '商品名称', '品名', '商品', '货品名称', '品名', 'product', 'item', 'sku name'],
  skuQuantity: ['数量', '发货数量', '件数', '物品数量', '商品数量', 'qty', 'quantity', 'count'],
  skuSpec: ['规格', '规格型号', '型号', '包装', 'spec', 'specification', 'model'],
  remark: ['备注', '说明', 'remark', 'note', 'memo'],
}

/* ─────────────── Excel 分析器 ─────────────── */

function analyzeExcel(file: File): AIRuleSuggestion {
  // 使用同步方式读取 Excel（在 API 路由中已经读取过 buffer）
  // 这里返回一个需要 buffer 的函数
  throw new Error('请使用 analyzeExcelBuffer')
}

export function analyzeExcelBuffer(buffer: ArrayBuffer, fileName: string): AIRuleSuggestion {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  })

  if (rows.length === 0) {
    return makeResult('excel', 0.3, '文件为空，无法分析', ['文件没有数据行'])
  }

  const textRows = rows.map((row) => row.map((cell) => String(cell ?? '').trim()))

  // 1. 检测表头行
  const headerResult = detectHeaderRow(textRows)

  // 2. 检测是否矩阵转置布局（门店作为列头）
  const matrixResult = detectMatrixTranspose(textRows, headerResult.headerRow)

  // 3. 检测尾部信息
  const footerResult = detectFooterInfo(textRows)

  // 4. 检测多 Sheet
  const multiSheet = workbook.SheetNames.length > 1

  // 5. 检测复合单元格（包含换行符的单元格）
  const splitResult = detectSplitCells(textRows, headerResult.headerRow)

  // 构建规则
  const rule = createEmptyRule('excel')
  const assumptions: string[] = []
  let confidence = 0.7

  // 设置表头和数据起始行
  rule.ruleJson.headerRows = headerResult.headerRow + 1
  rule.ruleJson.dataStartRow = headerResult.headerRow + 1

  if (matrixResult.isMatrix) {
    // 矩阵转置布局
    rule.ruleJson.matrixTranspose = {
      enabled: true,
      storeColumnIndex: matrixResult.storeColumnIndex,
      startColumnIndex: matrixResult.startColumnIndex,
      endColumnIndex: matrixResult.endColumnIndex,
      startRowIndex: headerResult.headerRow + 1,
      skipEmpty: true,
    }
    rule.name = `矩阵转置规则 - ${fileName}`
    confidence = 0.65
    assumptions.push('检测到矩阵转置布局（门店作为列头），请确认门店列和商品列的范围')
  } else if (headerResult.mappings && headerResult.mappings.length > 0) {
    // 标准列映射布局
    rule.ruleJson.columnMappings = headerResult.mappings
    rule.name = `标准导入规则 - ${fileName}`
    confidence = 0.8
  }

  // 设置尾部信息
  if (footerResult.hasFooter) {
    rule.ruleJson.footerInfo = {
      enabled: true,
      labels: footerResult.labels,
      maxSearchRows: footerResult.searchRows,
    }
    assumptions.push('检测到尾部包含收货人信息（姓名/电话/地址），已自动启用尾部提取')
    confidence = Math.min(confidence, 0.75)
  }

  // 设置多 Sheet
  if (multiSheet) {
    rule.ruleJson.multiSheet = true
    assumptions.push(`文件包含 ${workbook.SheetNames.length} 个 Sheet，已启用全部遍历`)
  }

  // 设置复合单元格拆分
  if (splitResult.hasSplit) {
    rule.ruleJson.splitCellValue = {
      enabled: true,
      sourceField: 'skuName',
      itemSeparatorPattern: '\\n+',
      quantityPattern: '(.+?)[x×*](\\d+)',
    }
    assumptions.push('检测到部分单元格包含多行数据（换行分隔），已启用复合拆分')
  }

  // 生成说明
  const explanation = buildExplanation(headerResult, matrixResult, footerResult, multiSheet, splitResult)

  return {
    rule,
    confidence,
    explanation,
    assumptions,
  }
}

/* ─────────────── 表头检测 ─────────────── */

interface HeaderResult {
  headerRow: number
  mappings?: ParseRuleConfig['columnMappings']
  matchedFields: number
}

function detectHeaderRow(rows: string[][]): HeaderResult {
  let bestRow = 0
  let bestScore = 0
  let bestMappings: ParseRuleConfig['columnMappings'] = []

  // 遍历前 10 行找最佳表头行
  const searchLimit = Math.min(rows.length, 10)
  for (let i = 0; i < searchLimit; i++) {
    const row = rows[i]
    const { score, mappings } = scoreHeaderRow(row)

    if (score > bestScore) {
      bestScore = score
      bestRow = i
      bestMappings = mappings
    }
  }

  return {
    headerRow: bestRow,
    mappings: bestMappings,
    matchedFields: bestScore,
  }
}

function scoreHeaderRow(row: string[]): { score: number; mappings: ParseRuleConfig['columnMappings'] } {
  const mappings: ParseRuleConfig['columnMappings'] = []
  let score = 0

  for (let col = 0; col < row.length; col++) {
    const cellText = row[col].toLowerCase()
    if (!cellText) continue

    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      for (const keyword of keywords) {
        if (cellText.includes(keyword.toLowerCase())) {
          mappings.push({
            targetField: field as OrderField,
            headerPattern: escapeRegex(keyword),
            columnIndex: col,
          })
          score++
          break
        }
      }
    }
  }

  return { score, mappings }
}

/* ─────────────── 矩阵转置检测 ─────────────── */

interface MatrixResult {
  isMatrix: boolean
  storeColumnIndex: number
  startColumnIndex: number
  endColumnIndex: number
}

function detectMatrixTranspose(rows: string[][], headerRow: number): MatrixResult {
  const result: MatrixResult = { isMatrix: false, storeColumnIndex: 0, startColumnIndex: 1, endColumnIndex: 0 }

  if (headerRow >= rows.length - 1) return result

  const header = rows[headerRow]
  const dataRow = rows[headerRow + 1]

  if (!header || !dataRow) return result

  // 检测特征：第一列是"门店"关键字，后续列是门店名称
  const firstCol = header[0]?.toLowerCase() ?? ''
  const isStoreCol = FIELD_KEYWORDS.storeName.some((kw) => firstCol.includes(kw.toLowerCase()))

  if (!isStoreCol) return result

  // 检查后续列是否看起来像门店名称（非数字、非标准字段名）
  let storeCount = 0
  for (let i = 1; i < header.length; i++) {
    const cell = header[i]
    if (cell && !isStandardFieldName(cell) && !isNumeric(cell)) {
      storeCount++
    }
  }

  // 如果有 2+ 个看起来像门店的列头，认为是矩阵布局
  if (storeCount >= 2) {
    result.isMatrix = true
    result.storeColumnIndex = 0
    result.startColumnIndex = 1
    result.endColumnIndex = header.length - 1
  }

  return result
}

/* ─────────────── 尾部信息检测 ─────────────── */

interface FooterResult {
  hasFooter: boolean
  labels: Record<string, string[]>
  searchRows: number
}

function detectFooterInfo(rows: string[][]): FooterResult {
  const result: FooterResult = {
    hasFooter: false,
    labels: { recipientName: [], recipientPhone: [], recipientAddress: [], storeName: [] },
    searchRows: 5,
  }

  // 从末尾向前搜索最多 10 行
  const searchLimit = Math.min(rows.length, 10)
  const footerRows: string[] = []

  for (let i = rows.length - 1; i >= Math.max(0, rows.length - searchLimit); i--) {
    const rowText = rows[i].join(' ')
    footerRows.push(rowText)
  }

  const footerText = footerRows.join(' ')

  // 检测尾部是否包含收货人信息关键字
  const recipientNameKeywords = ['收件人', '收货人', '姓名', '联系人']
  const recipientPhoneKeywords = ['电话', '手机', '联系电话']
  const recipientAddressKeywords = ['地址', '收货地址', '收件地址']
  const storeNameKeywords = ['门店', '店铺']

  let matchCount = 0

  for (const kw of recipientNameKeywords) {
    if (footerText.includes(kw)) {
      result.labels.recipientName.push(kw)
      matchCount++
    }
  }

  for (const kw of recipientPhoneKeywords) {
    if (footerText.includes(kw)) {
      result.labels.recipientPhone.push(kw)
      matchCount++
    }
  }

  for (const kw of recipientAddressKeywords) {
    if (footerText.includes(kw)) {
      result.labels.recipientAddress.push(kw)
      matchCount++
    }
  }

  for (const kw of storeNameKeywords) {
    if (footerText.includes(kw)) {
      result.labels.storeName.push(kw)
      matchCount++
    }
  }

  // 如果匹配到 2+ 个关键字，认为有尾部信息
  if (matchCount >= 2) {
    result.hasFooter = true
    result.searchRows = searchLimit
  }

  return result
}

/* ─────────────── 复合单元格检测 ─────────────── */

interface SplitResult {
  hasSplit: boolean
}

function detectSplitCells(rows: string[][], headerRow: number): SplitResult {
  const result: SplitResult = { hasSplit: false }

  // 检查数据行中是否有包含换行符的单元格
  const dataRows = rows.slice(headerRow + 1, Math.min(rows.length, headerRow + 20))

  for (const row of dataRows) {
    for (const cell of row) {
      if (typeof cell === 'string' && cell.includes('\n')) {
        result.hasSplit = true
        return result
      }
    }
  }

  return result
}

/* ─────────────── 辅助函数 ─────────────── */

function isStandardFieldName(text: string): boolean {
  const lower = text.toLowerCase()
  for (const keywords of Object.values(FIELD_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return true
    }
  }
  return false
}

function isNumeric(text: string): boolean {
  return /^\d+(\.\d+)?$/.test(text.trim())
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildExplanation(
  headerResult: HeaderResult,
  matrixResult: MatrixResult,
  footerResult: FooterResult,
  multiSheet: boolean,
  splitResult: SplitResult,
): string {
  const parts: string[] = []

  if (matrixResult.isMatrix) {
    parts.push('检测到矩阵转置布局（门店名称作为列头，商品作为行）')
  } else {
    parts.push(`在第 ${headerResult.headerRow + 1} 行检测到表头，匹配了 ${headerResult.matchedFields} 个字段`)
  }

  if (footerResult.hasFooter) {
    parts.push('文件末尾包含收货人信息（姓名/电话/地址）')
  }

  if (multiSheet) {
    parts.push('文件包含多个 Sheet')
  }

  if (splitResult.hasSplit) {
    parts.push('部分单元格包含多行数据（换行分隔）')
  }

  return parts.join('。') + '。'
}

function makeResult(fileType: ParserFileType, confidence: number, explanation: string, assumptions: string[]): AIRuleSuggestion {
  return {
    rule: createEmptyRule(fileType),
    confidence,
    explanation,
    assumptions,
  }
}

/* ─────────────── 文本文件分析器（Word/PDF） ─────────────── */

export function analyzeTextContent(text: string, fileType: ParserFileType, fileName: string): AIRuleSuggestion {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const rule = createEmptyRule(fileType)
  const assumptions: string[] = []
  let confidence = 0.6

  // 检测是否是配送单/发货单格式（带表格的PDF）
  const tableResult = detectTableStructure(lines)
  
  if (tableResult.hasTable) {
    // 表格型PDF：使用列映射
    rule.ruleJson.columnMappings = tableResult.mappings
    rule.ruleJson.headerRows = tableResult.headerRow + 1
    rule.ruleJson.dataStartRow = tableResult.dataStartRow + 1
    rule.name = `PDF配送单规则 - ${fileName}`
    confidence = 0.75
    assumptions.push(`检测到表格结构，表头在第 ${tableResult.headerRow + 1} 行`)
    assumptions.push(`数据从第 ${tableResult.dataStartRow + 1} 行开始`)
  } else {
    // 纯文本型：使用正则提取
    const separatorResult = detectRecordSeparator(lines)
    if (separatorResult.pattern) {
      rule.ruleJson.textRecordSeparatorPattern = separatorResult.pattern
      confidence = 0.7
      assumptions.push('已检测到记录分隔模式，请确认是否正确')
    }

    const textMappings = extractTextPatterns(lines)
    if (textMappings.length > 0) {
      rule.ruleJson.textMappings = textMappings
      confidence = 0.65
      assumptions.push('已从文本中提取字段匹配模式，请逐项确认')
    }
    
    rule.name = `文本解析规则 - ${fileName}`
  }

  // 检测尾部信息
  const footerResult = detectFooterInText(lines)
  if (footerResult.hasFooter) {
    rule.ruleJson.footerInfo = {
      enabled: true,
      labels: footerResult.labels,
      maxSearchRows: 5,
    }
    assumptions.push('检测到文本末尾包含收货人信息')
  }

  const explanation = [
    `文本共 ${lines.length} 行`,
    tableResult.hasTable ? `检测到表格结构，匹配了 ${tableResult.mappings.length} 个字段` : '未检测到表格结构',
    `提取了 ${(rule.ruleJson.textMappings ?? []).length} 个字段匹配规则`,
  ].join('。') + '。'

  return { rule, confidence, explanation, assumptions }
}

/* ─────────────── PDF 表格结构检测 ─────────────── */

interface TableResult {
  hasTable: boolean
  headerRow: number
  dataStartRow: number
  mappings: NonNullable<ParseRuleConfig['columnMappings']>
}

function detectTableStructure(lines: string[]): TableResult {
  const result: TableResult = { hasTable: false, headerRow: 0, dataStartRow: 0, mappings: [] }
  
  // 检测表头关键字
  const headerKeywords = ['物品编码', '物品名称', '商品编码', '商品名称', 'SKU', '规格', '数量', '单位', '订货', '发货']
  
  // 遍历查找表头行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const cells = line.split('\t').map(c => c.trim())
    
    // 检查是否包含多个表头关键字
    let matchCount = 0
    let matchedKeywords: string[] = []
    for (const cell of cells) {
      for (const kw of headerKeywords) {
        if (cell.includes(kw)) {
          matchCount++
          matchedKeywords.push(kw)
          break
        }
      }
    }
    
    // 如果一行中有3+个关键字，认为是表头
    if (matchCount >= 3) {
      result.hasTable = true
      result.headerRow = i
      
      // 查找数据起始行（跳过分页标记）
      let dataStart = i + 1
      while (dataStart < lines.length) {
        const line = lines[dataStart]
        // 跳过分页标记行
        if (line.includes('第') && line.includes('页') && line.includes('共')) {
          dataStart++
          continue
        }
        if (/^\d+ of \d+$/.test(line.trim()) || /^--\s*\d+ of \d+\s*--$/.test(line.trim())) {
          dataStart++
          continue
        }
        if (line.includes('---')) {
          dataStart++
          continue
        }
        break
      }
      result.dataStartRow = dataStart
      
      // 检测数据行是否有额外的序号列
      const headerCells = cells
      const dataLine = lines[dataStart] ?? ''
      const dataCells = dataLine.split('\t').map(c => c.trim())
      
      // 计算列偏移
      let columnOffset = 0
      
      // 检查数据行第一列是否是数字（序号）
      if (dataCells.length > 0 && /^\d+$/.test(dataCells[0])) {
        // 检查表头第一列是否不是数字
        if (headerCells.length > 0 && !/^\d+$/.test(headerCells[0])) {
          // 数据行有序号列，表头没有
          columnOffset = 1
        }
      }
      
      // 解析表头列
      for (let col = 0; col < headerCells.length; col++) {
        const cell = headerCells[col]
        if (!cell) continue
        
        // 匹配字段
        const field = matchFieldFromHeader(cell)
        if (field) {
          result.mappings.push({
            targetField: field,
            headerPattern: escapeRegex(cell),
            columnIndex: col + columnOffset,
          })
        }
      }
      
      break
    }
  }
  
  return result
}

function matchFieldFromHeader(header: string): OrderField | null {
  const lower = header.toLowerCase()
  
  // 按优先级匹配
  const fieldPatterns: Array<{ field: OrderField; patterns: string[] }> = [
    { field: 'skuCode', patterns: ['物品编码', '商品编码', 'sku编码', '货号', '编码'] },
    { field: 'skuName', patterns: ['物品名称', '商品名称', '品名', '商品', '货品名称'] },
    { field: 'skuSpec', patterns: ['规格', '规格型号', '型号', '包装'] },
    { field: 'skuQuantity', patterns: ['数量', '发货数量', '件数', '物品数量', '商品数量', '订货数量'] },
    { field: 'remark', patterns: ['备注', '说明'] },
    { field: 'externalCode', patterns: ['单号', '订单号', '运单号', '外部单号'] },
    { field: 'storeName', patterns: ['门店', '店铺', '店名', '收货门店'] },
    { field: 'recipientName', patterns: ['收件人', '收货人', '姓名', '联系人'] },
    { field: 'recipientPhone', patterns: ['电话', '手机', '联系电话'] },
    { field: 'recipientAddress', patterns: ['地址', '收货地址', '收件地址'] },
  ]
  
  for (const { field, patterns } of fieldPatterns) {
    for (const pattern of patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return field
      }
    }
  }
  
  return null
}

function detectRecordSeparator(lines: string[]): { pattern: string | null } {
  // 检测常见的分隔模式：空行、分隔线、编号等
  let emptyLineCount = 0
  let separatorLineCount = 0
  let numberedCount = 0

  for (const line of lines) {
    if (line === '') emptyLineCount++
    if (/^[━─═\-=_]{3,}$/.test(line)) separatorLineCount++
    if (/^\d+[.、)）]\s*/.test(line)) numberedCount++
  }

  if (separatorLineCount > 2) {
    return { pattern: '(?:\\n\\s*\\n|(?:^|\\n)━━━+(?=\\n|$))' }
  }

  if (emptyLineCount > lines.length * 0.2) {
    return { pattern: '\\n\\s*\\n' }
  }

  if (numberedCount > 2) {
    return { pattern: '(?=\\d+[.、)）]\\s*)' }
  }

  return { pattern: null }
}

function extractTextPatterns(lines: string[]): Array<{ targetField: OrderField; pattern: string; groupIndex: number }> {
  const patterns: Array<{ targetField: OrderField; pattern: string; groupIndex: number }> = []
  const sampleText = lines.slice(0, 50).join('\n')

  // 常见的文本提取模式
  const extractPatterns: Array<{ field: OrderField; regex: RegExp }> = [
    { field: 'recipientName', regex: /(?:收件人|收货人|姓名)[：:]\s*(.+?)(?:\s|$)/ },
    { field: 'recipientPhone', regex: /(?:电话|手机|联系电话)[：:]\s*(\d[\d\s-]{6,})/ },
    { field: 'recipientAddress', regex: /(?:地址|收货地址)[：:]\s*(.+)/ },
    { field: 'storeName', regex: /(?:门店|店铺)[：:]\s*(.+?)(?:\s|$)/ },
    { field: 'externalCode', regex: /(?:单号|订单号|运单号)[：:]\s*(\S+)/ },
  ]

  for (const { field, regex } of extractPatterns) {
    const match = sampleText.match(regex)
    if (match) {
      patterns.push({
        targetField: field,
        pattern: regex.source,
        groupIndex: 1,
      })
    }
  }

  return patterns
}

function detectFooterInText(lines: string[]): { hasFooter: boolean; labels: Record<string, string[]> } {
  const result = { hasFooter: false, labels: {} as Record<string, string[]> }
  const lastLines = lines.slice(-10).join(' ')

  const keywords = {
    recipientName: ['收件人', '收货人', '姓名'],
    recipientPhone: ['电话', '手机'],
    recipientAddress: ['地址'],
    storeName: ['门店', '店铺'],
  }

  let matchCount = 0
  for (const [field, kws] of Object.entries(keywords)) {
    for (const kw of kws) {
      if (lastLines.includes(kw)) {
        if (!result.labels[field]) result.labels[field] = []
        result.labels[field].push(kw)
        matchCount++
        break
      }
    }
  }

  result.hasFooter = matchCount >= 2
  return result
}
