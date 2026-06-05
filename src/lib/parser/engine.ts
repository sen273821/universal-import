import { ParseRule, ParseResult, Order, FieldMapping } from '@/types'
import { parseExcel } from './excel'
import { parseWord } from './word'
import { parsePDF } from './pdf'

// 规则引擎核心
export async function parseFile(
  file: File,
  rule: ParseRule
): Promise<ParseResult> {
  try {
    let parsedData: any[] = []

    // 根据文件类型选择解析器
    switch (rule.fileType) {
      case 'excel':
        parsedData = await parseExcel(file, rule)
        break
      case 'word':
        parsedData = await parseWord(file, rule)
        break
      case 'pdf':
        parsedData = await parsePDF(file, rule)
        break
      default:
        throw new Error(`Unsupported file type: ${rule.fileType}`)
    }

    // 应用字段映射
    const mappedData = applyFieldMappings(parsedData, rule.fieldMappings)

    // 应用转换规则
    let transformedData = mappedData
    if (rule.transformations && rule.transformations.length > 0) {
      transformedData = applyTransformations(mappedData, rule.transformations)
    }

    // 应用跨行聚合
    if (rule.aggregation?.enabled) {
      transformedData = applyAggregation(transformedData, rule.aggregation.groupByField)
    }

    // 应用矩阵转置
    if (rule.matrixTranspose?.enabled) {
      transformedData = applyMatrixTranspose(transformedData, rule.matrixTranspose)
    }

    // 应用卡片式拆分
    if (rule.cardSplit?.enabled) {
      transformedData = applyCardSplit(transformedData, rule.cardSplit.cardStartPattern)
    }

    // 验证数据
    const { validOrders, errors } = validateOrders(transformedData)

    return {
      success: errors.length === 0,
      data: validOrders,
      errors: errors.map((e, i) => ({ row: i + 1, message: e })),
      warnings: [],
      totalRows: parsedData.length,
      parsedRows: validOrders.length
    }
  } catch (error) {
    console.error('Parse error:', error)
    return {
      success: false,
      data: [],
      errors: [{ row: 0, message: `解析失败: ${error instanceof Error ? error.message : String(error)}` }],
      warnings: [],
      totalRows: 0,
      parsedRows: 0
    }
  }
}

// 应用字段映射
function applyFieldMappings(data: any[], mappings: FieldMapping[]): any[] {
  return data.map(row => {
    const mappedRow: any = {}

    mappings.forEach(mapping => {
      let value: any = null

      switch (mapping.type) {
        case 'column':
          // 按列名或列索引获取值
          if (mapping.columnIndex !== undefined) {
            const keys = Object.keys(row)
            value = row[keys[mapping.columnIndex]]
          } else {
            value = row[mapping.source]
          }
          break
        case 'regex':
          // 从某个字段中用正则提取
          const sourceValue = row[mapping.source] || ''
          if (mapping.regex) {
            const match = String(sourceValue).match(new RegExp(mapping.regex))
            value = match ? match[1] || match[0] : null
          }
          break
        case 'static':
          // 静态值
          value = mapping.value
          break
        case 'computed':
          // 计算值（简单表达式）
          if (mapping.value) {
            try {
              // 替换变量
              let expr = mapping.value
              Object.keys(row).forEach(key => {
                expr = expr.replace(`{${key}}`, row[key] || '')
              })
              value = expr
            } catch {
              value = null
            }
          }
          break
      }

      // 应用默认值
      if ((value === null || value === undefined || value === '') && mapping.defaultValue) {
        value = mapping.defaultValue
      }

      mappedRow[mapping.target] = value
    })

    return mappedRow
  })
}

// 应用转换规则
function applyTransformations(data: any[], transformations: any[]): any[] {
  return data.map(row => {
    const newRow = { ...row }

    transformations.forEach(trans => {
      switch (trans.type) {
        case 'split':
          // 拆分字段
          const splitValue = newRow[trans.sourceField] || ''
          if (typeof splitValue === 'string') {
            const parts = splitValue.split(trans.config.separator || ',')
            parts.forEach((part: string, index: number) => {
              newRow[`${trans.targetField}_${index}`] = part.trim()
            })
          }
          break
        case 'merge':
          // 合并字段
          const mergeValues = (trans.config.fields || [])
            .map((f: string) => newRow[f] || '')
            .filter(Boolean)
          newRow[trans.targetField] = mergeValues.join(trans.config.separator || ' ')
          break
        case 'replace':
          // 替换值
          const replaceValue = newRow[trans.sourceField] || ''
          if (trans.config.replaceMap) {
            newRow[trans.targetField] = trans.config.replaceMap[replaceValue] || replaceValue
          }
          break
        case 'extract':
          // 提取值
          const extractValue = newRow[trans.sourceField] || ''
          if (trans.config.regex) {
            const match = String(extractValue).match(new RegExp(trans.config.regex))
            newRow[trans.targetField] = match ? match[1] || match[0] : null
          }
          break
      }
    })

    return newRow
  })
}

// 应用跨行聚合
function applyAggregation(data: any[], groupByField: string): any[] {
  const groups = new Map<string, any[]>()

  data.forEach(row => {
    const key = row[groupByField] || '__no_group__'
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(row)
  })

  const result: any[] = []
  groups.forEach((rows, key) => {
    if (key === '__no_group__') {
      result.push(...rows)
    } else {
      // 合并同一组的行
      const merged = { ...rows[0] }
      const skuList: any[] = []

      rows.forEach(row => {
        if (row.skuCode && row.skuName) {
          skuList.push({
            skuCode: row.skuCode,
            skuName: row.skuName,
            skuQuantity: row.skuQuantity,
            skuSpec: row.skuSpec
          })
        }
      })

      merged.skuList = skuList
      result.push(merged)
    }
  })

  return result
}

// 应用矩阵转置
function applyMatrixTranspose(data: any[], config: any): any[] {
  const result: any[] = []

  data.forEach(row => {
    const rowValue = row[config.rowField]
    if (!rowValue) return

    Object.keys(row).forEach(col => {
      if (col === config.rowField) return

      const value = row[col]
      if (!value) return

      // 处理复合值（如 "物品名x数量\n物品名x数量"）
      if (config.splitPattern && typeof value === 'string') {
        const items = value.split(new RegExp(config.splitPattern))
        items.forEach((item: string) => {
          const match = item.trim().match(/(.+?)[x×](\d+)/)
          if (match) {
            result.push({
              [config.rowField]: rowValue,
              [config.columnField]: col,
              skuName: match[1].trim(),
              skuQuantity: parseInt(match[2])
            })
          }
        })
      } else {
        result.push({
          [config.rowField]: rowValue,
          [config.columnField]: col,
          [config.valueField]: value
        })
      }
    })
  })

  return result
}

// 应用卡片式拆分
function applyCardSplit(data: any[], cardStartPattern: string): any[] {
  const result: any[] = []
  let currentCard: any[] = []
  let inCard = false

  data.forEach(row => {
    const firstValue = Object.values(row)[0]
    const isFirstValuePattern = typeof firstValue === 'string' &&
      firstValue.match(new RegExp(cardStartPattern))

    if (isFirstValuePattern) {
      // 新卡片开始
      if (currentCard.length > 0) {
        result.push(...processCard(currentCard))
      }
      currentCard = [row]
      inCard = true
    } else if (inCard) {
      currentCard.push(row)
    }
  })

  // 处理最后一个卡片
  if (currentCard.length > 0) {
    result.push(...processCard(currentCard))
  }

  return result
}

// 处理单个卡片
function processCard(cardData: any[]): any[] {
  // 简单实现：将卡片数据视为一个订单
  // 实际应用中可能需要更复杂的逻辑
  return cardData
}

// 验证订单
function validateOrders(data: any[]): { validOrders: Order[]; errors: string[] } {
  const validOrders: Order[] = []
  const errors: string[] = []

  data.forEach((row, index) => {
    const order: Order = {
      externalCode: row.externalCode,
      storeName: row.storeName,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      recipientAddress: row.recipientAddress,
      skuCode: row.skuCode || '',
      skuName: row.skuName || '',
      skuQuantity: parseInt(row.skuQuantity) || 0,
      skuSpec: row.skuSpec,
      remark: row.remark
    }

    // 验证必填字段
    if (!order.skuCode) {
      errors.push(`第 ${index + 1} 行: SKU编码必填`)
      return
    }
    if (!order.skuName) {
      errors.push(`第 ${index + 1} 行: SKU名称必填`)
      return
    }
    if (!order.skuQuantity || order.skuQuantity <= 0) {
      errors.push(`第 ${index + 1} 行: 数量必须为正数`)
      return
    }

    // A组/B组二选一校验
    const hasStoreName = !!order.storeName
    const hasRecipient = !!(order.recipientName && order.recipientPhone && order.recipientAddress)
    if (!hasStoreName && !hasRecipient) {
      errors.push(`第 ${index + 1} 行: 收货门店或收件人信息必填一组`)
      return
    }

    validOrders.push(order)
  })

  return { validOrders, errors }
}
