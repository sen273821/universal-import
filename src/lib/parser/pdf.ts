import type { ParseRule, TextBlock } from '@/types'
import { splitTextBlocks } from './utils'

export async function parsePDF(file: File, rule: ParseRule): Promise<TextBlock[]> {
  // Polyfill browser APIs for serverless environment (pdfjs-dist requires them)
  const g = globalThis as any
  
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = function DOMMatrix() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1
      this.is2D = true
      this.isIdentity = true
    }
    g.DOMMatrix.prototype.multiplySelf = function() { return this }
    g.DOMMatrix.prototype.translateSelf = function() { return this }
    g.DOMMatrix.prototype.scaleSelf = function() { return this }
    g.DOMMatrix.prototype.rotateSelf = function() { return this }
    g.DOMMatrix.prototype.invertSelf = function() { return this }
    g.DOMMatrix.prototype.toFloat32Array = function() { return new Float32Array(16) }
  }

  if (typeof g.ImageData === 'undefined') {
    g.ImageData = function ImageData(dataOrWidth: any, widthOrHeight: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth
        this.width = widthOrHeight
        this.height = height ?? widthOrHeight
      } else {
        this.width = dataOrWidth
        this.height = widthOrHeight
        this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4)
      }
    }
  }

  if (typeof g.Path2D === 'undefined') {
    g.Path2D = function Path2D() {}
    g.Path2D.prototype.addPath = function() {}
    g.Path2D.prototype.closePath = function() {}
    g.Path2D.prototype.moveTo = function() {}
    g.Path2D.prototype.lineTo = function() {}
    g.Path2D.prototype.bezierCurveTo = function() {}
    g.Path2D.prototype.quadraticCurveTo = function() {}
    g.Path2D.prototype.arc = function() {}
    g.Path2D.prototype.arcTo = function() {}
    g.Path2D.prototype.ellipse = function() {}
    g.Path2D.prototype.rect = function() {}
  }

  // 动态导入避免 pdfjs-dist 在模块加载时访问 DOMMatrix
  const { PDFParse } = await import('pdf-parse')
  
  const arrayBuffer = await file.arrayBuffer()
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })

  try {
    const textResult = await parser.getText()
    const text = textResult.text
    
    // 如果有列映射配置，使用表格解析模式
    if (rule.ruleJson.columnMappings && rule.ruleJson.columnMappings.length > 0) {
      return parseTablePDF(text, rule)
    }
    
    // 否则使用文本解析模式
    return splitTextBlocks(text, rule.ruleJson.textRecordSeparatorPattern)
  } finally {
    await parser.destroy()
  }
}

function normalizeTableRow(cells: string[], expectedCols: number): string[] {
  // 如果列数已经正确，直接返回
  if (cells.length >= expectedCols) return cells

  // 尝试修复合并的单元格
  const result: string[] = []
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]

    // 检测是否是 "SKU编码 名称 规格 单位" 合并单元格
    // 如 "ZBWP0001 茶语柠听紫苏风味糖浆 750ml*6瓶/件"
    // 需要拆分为: 编码 + 名称 + 规格(含单位)
    const skuFullMatch = cell.match(/^(ZBWP\d+)\s+(.+?)\s+(\d[\d.]*(?:ml|g|kg|L|cm|m)\b.*)$/i)
    if (skuFullMatch) {
      result.push(skuFullMatch[1]) // 物品编码
      result.push(skuFullMatch[2]) // 物品名称
      result.push(skuFullMatch[3]) // 规格型号（含单位）
      continue
    }

    // 仅 "SKU编码+名称" 合并（无规格信息）
    const skuMatch = cell.match(/^(ZBWP\d+)\s+(.+)$/)
    if (skuMatch) {
      result.push(skuMatch[1])
      result.push(skuMatch[2])
      continue
    }

    // 检测是否是 "序号+类别" 合并单元格（如 "8 自助调料类"）
    const idxCatMatch = cell.match(/^(\d+)\s+(.+类)$/)
    if (idxCatMatch && i === 0) {
      result.push(idxCatMatch[1])
      result.push(idxCatMatch[2])
      continue
    }

    // 检测 "名称 规格" 合并单元格（如 "片片软哨（精） 500g*20包/件"）
    // 规格部分以数字+单位开头
    if (i >= 2 && result.length < expectedCols - 1) {
      const nameSpecMatch = cell.match(/^(.+?)\s+(\d[\d.]*(?:ml|g|kg|L|cm|m)\b.*)$/i)
      if (nameSpecMatch) {
        result.push(nameSpecMatch[1])
        result.push(nameSpecMatch[2])
        continue
      }
    }

    result.push(cell)
  }

  // 如果仍然不够列，尝试从最后一个单元格拆分（名称+规格+单位 合并的情况）
  if (result.length < expectedCols && result.length >= 2) {
    const lastCell = result[result.length - 1]
    // 匹配 "名称 数字+单位*数字+单位/单位" 模式
    const nameSpecMatch = lastCell.match(/^(.+?)\s+(\d[\d.]*(?:ml|g|kg|L|cm|m)\b.*)$/i)
    if (nameSpecMatch) {
      result.splice(result.length - 1, 1, nameSpecMatch[1], nameSpecMatch[2])
    }
  }

  return result
}

function parseTablePDF(text: string, rule: ParseRule): TextBlock[] {
  const lines = text.split('\n').filter(line => line.trim())
  const headerRow = (rule.ruleJson.headerRows ?? 1) - 1
  const dataStartRow = (rule.ruleJson.dataStartRow ?? 1) - 1
  const mappings = rule.ruleJson.columnMappings ?? []
  
  const blocks: TextBlock[] = []
  
  // 解析表头行以确定列位置
  const headerLine = lines[headerRow] ?? ''
  const headerCells = headerLine.split('\t').map(c => c.trim())
  
  // 如果规则中没有指定列索引，尝试从表头匹配
  const columnMap = new Map<number, string>()
  for (const mapping of mappings) {
    if (mapping.columnIndex !== undefined) {
      columnMap.set(mapping.columnIndex, mapping.targetField)
    } else {
      // 从表头匹配
      for (let i = 0; i < headerCells.length; i++) {
        const cell = headerCells[i]
        if (mapping.headerPattern && cell.includes(mapping.headerPattern.replace(/\\(.)/g, '$1'))) {
          columnMap.set(i, mapping.targetField)
          break
        }
      }
    }
  }
  
  // 计算期望的列数（取表头列数和映射最大列索引的较大值）
  const maxMappingIdx = Math.max(...mappings.map(m => m.columnIndex ?? 0), 0)
  const expectedCols = Math.max(headerCells.length, maxMappingIdx + 1)
  
  // 收集已知的表头关键字，用于检测重复的表头行
  const headerKeywords = ['物品编码', '物品名称', '物品类别', '规格型号', '订货单位', '发货数量', '序号']
  
  // 解析数据行
  for (let i = dataStartRow; i < lines.length; i++) {
    const line = lines[i]
    
    // 跳过页码行和其他非数据行
    if (line.includes('第') && line.includes('页') && line.includes('共')) continue
    if (/^\d+ of \d+$/.test(line.trim()) || /^--\s*\d+ of \d+\s*--$/.test(line.trim())) continue
    if (line.includes('---')) continue
    
    // 跳过重复的表头行（在PDF多页场景中表头会重复出现）
    const trimmedLine = line.trim()
    if (headerKeywords.some(kw => trimmedLine === kw || trimmedLine.startsWith(kw + '\t'))) {
      // 检查是否整行都是表头关键字
      const lineCells = trimmedLine.split('\t').map(c => c.trim())
      const headerMatchCount = lineCells.filter(c => headerKeywords.some(kw => c.includes(kw))).length
      if (headerMatchCount >= 3) continue
    }
    
    // 跳过合计行
    if (trimmedLine.startsWith('合计') || trimmedLine.startsWith('总计') || trimmedLine.startsWith('小计')) continue
    
    const cells = line.split('\t').map(c => c.trim())
    
    // 规范化列数
    const normalizedCells = normalizeTableRow(cells, expectedCols)
    
    // 检查是否是有效数据行（第一列应该是数字序号）
    const firstCell = normalizedCells[0]
    if (!firstCell || isNaN(Number(firstCell))) continue
    
    // 构建文本块
    const record: Record<string, string> = {}
    for (const [colIdx, field] of columnMap.entries()) {
      if (colIdx < normalizedCells.length) {
        record[field] = normalizedCells[colIdx]
      }
    }
    
    // 只添加有实际数据的记录
    if (Object.keys(record).length > 0) {
      blocks.push({
        content: line,
        record,
      })
    }
  }
  
  return blocks
}
