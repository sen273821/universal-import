import type { OrderRecord } from '@/types'

export function normalizeOrderInput(order: Partial<OrderRecord>, ruleId?: string): OrderRecord & { ruleId?: string } {
  return {
    externalCode: normalizeText(order.externalCode),
    storeName: normalizeText(order.storeName),
    recipientName: normalizeText(order.recipientName),
    recipientPhone: normalizeText(order.recipientPhone),
    recipientAddress: normalizeText(order.recipientAddress),
    skuCode: normalizeText(order.skuCode),
    skuName: normalizeText(order.skuName),
    skuQuantity: Number.isFinite(order.skuQuantity) ? Number(order.skuQuantity) : Number.parseInt(String(order.skuQuantity ?? 0), 10) || 0,
    skuSpec: normalizeText(order.skuSpec),
    remark: normalizeText(order.remark),
    ruleId,
  }
}

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}
