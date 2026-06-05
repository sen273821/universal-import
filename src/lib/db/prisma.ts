// 简化的数据库客户端
// 实际项目中需要配置真实的数据库连接

// 临时使用内存存储
const orders: any[] = []
const rules: any[] = []

export const db = {
  // 订单操作
  order: {
    findMany: async (options?: any) => {
      let result = [...orders]
      if (options?.where) {
        // 简单过滤
        if (options.where.externalCode?.contains) {
          result = result.filter(o => o.externalCode?.includes(options.where.externalCode.contains))
        }
        if (options.where.recipientName?.contains) {
          result = result.filter(o => o.recipientName?.includes(options.where.recipientName.contains))
        }
      }
      if (options?.orderBy) {
        result.sort((a, b) => {
          const key = Object.keys(options.orderBy)[0]
          const order = options.orderBy[key]
          return order === 'desc' ? b[key] - a[key] : a[key] - b[key]
        })
      }
      if (options?.skip) {
        result = result.slice(options.skip)
      }
      if (options?.take) {
        result = result.slice(0, options.take)
      }
      return result
    },
    count: async (options?: any) => {
      let result = [...orders]
      if (options?.where) {
        if (options.where.externalCode?.contains) {
          result = result.filter(o => o.externalCode?.includes(options.where.externalCode.contains))
        }
        if (options.where.recipientName?.contains) {
          result = result.filter(o => o.recipientName?.includes(options.where.recipientName.contains))
        }
      }
      return result.length
    },
    createMany: async (options: any) => {
      const data = options.data.map((item: any, index: number) => ({
        ...item,
        id: `order_${Date.now()}_${index}`,
        createdAt: new Date()
      }))
      orders.push(...data)
      return { count: data.length }
    }
  },
  // 规则操作
  parseRule: {
    findMany: async (options?: any) => {
      let result = [...rules]
      if (options?.orderBy) {
        result.sort((a, b) => {
          const key = Object.keys(options.orderBy)[0]
          const order = options.orderBy[key]
          return order === 'desc' ? b[key] - a[key] : a[key] - b[key]
        })
      }
      return result
    },
    findUnique: async (options: any) => {
      return rules.find(r => r.id === options.where.id) || null
    },
    create: async (options: any) => {
      const rule = {
        ...options.data,
        id: `rule_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      rules.push(rule)
      return rule
    },
    update: async (options: any) => {
      const index = rules.findIndex(r => r.id === options.where.id)
      if (index !== -1) {
        rules[index] = { ...rules[index], ...options.data, updatedAt: new Date() }
        return rules[index]
      }
      throw new Error('Rule not found')
    },
    delete: async (options: any) => {
      const index = rules.findIndex(r => r.id === options.where.id)
      if (index !== -1) {
        rules.splice(index, 1)
        return { id: options.where.id }
      }
      throw new Error('Rule not found')
    }
  }
}
