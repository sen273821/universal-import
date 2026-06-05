import mammoth from 'mammoth'
import { ParseRule } from '@/types'

// 解析 Word 文件
export async function parseWord(file: File, rule: ParseRule): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const result = await mammoth.extractRawText({ arrayBuffer })
        const text = result.value

        // 按行分割
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

        // 跳过头部行
        const dataLines = lines.slice(rule.structure.headerRows)

        // 跳过尾部行
        const footerRows = rule.structure.footerRows || 0
        const validLines = footerRows > 0
          ? dataLines.slice(0, -footerRows)
          : dataLines

        // 解析每一行
        const parsedData: any[] = []
        let currentRecord: any = {}

        validLines.forEach(line => {
          // 检查是否是分隔线
          if (line.match(/^[-=]{3,}$/)) {
            if (Object.keys(currentRecord).length > 0) {
              parsedData.push(currentRecord)
              currentRecord = {}
            }
            return
          }

          // 尝试解析键值对
          const kvMatch = line.match(/^([^:：]+)[：:]\s*(.+)$/)
          if (kvMatch) {
            const key = kvMatch[1].trim()
            const value = kvMatch[2].trim()
            currentRecord[key] = value
            return
          }

          // 尝试解析物品信息行（如 "1. 编码 | 名称 | 规格 | 数量"）
          const itemMatch = line.match(/^\d+\.\s*(.+)/)
          if (itemMatch) {
            const itemParts = itemMatch[1].split('|').map(p => p.trim())
            if (itemParts.length >= 3) {
              if (!currentRecord.items) {
                currentRecord.items = []
              }
              currentRecord.items.push({
                code: itemParts[0],
                name: itemParts[1],
                spec: itemParts[2],
                quantity: itemParts[3] || '1'
              })
            }
          }
        })

        // 添加最后一条记录
        if (Object.keys(currentRecord).length > 0) {
          parsedData.push(currentRecord)
        }

        // 展开 items 为独立行
        const expandedData: any[] = []
        parsedData.forEach(record => {
          const { items, ...rest } = record
          if (items && items.length > 0) {
            items.forEach((item: any) => {
              expandedData.push({
                ...rest,
                skuCode: item.code,
                skuName: item.name,
                skuSpec: item.spec,
                skuQuantity: item.quantity
              })
            })
          } else {
            expandedData.push(record)
          }
        })

        resolve(expandedData)
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
