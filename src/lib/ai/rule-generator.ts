import { ParseRule, AIRuleSuggestion } from '@/types'

// AI 分析文件结构并生成规则
export async function generateRuleWithAI(
  fileContent: string,
  fileType: 'excel' | 'word' | 'pdf',
  fileName: string
): Promise<AIRuleSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 环境变量未配置')
  }

  // 动态导入 OpenAI
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1'
  })

  const systemPrompt = `你是一个文件结构分析专家。分析用户上传的文件内容，生成解析规则。

规则必须包含：
1. 文件结构（头部行数、数据起始行、尾部行数）
2. 字段映射（列名到目标字段的映射）
3. 特殊处理（跨行聚合、矩阵转置等）

返回 JSON 格式，结构如下：
{
  "rule": {
    "name": "规则名称",
    "description": "规则描述",
    "fileType": "${fileType}",
    "structure": {
      "headerRows": 0,
      "dataStartRow": 0,
      "footerRows": 0
    },
    "fieldMappings": [
      {
        "source": "来源列名",
        "target": "目标字段名",
        "type": "column",
        "columnIndex": 0,
        "confidence": 0.9
      }
    ],
    "transformations": []
  },
  "confidence": 0.85,
  "explanation": "规则说明",
  "fieldConfidences": [
    {
      "field": "字段名",
      "confidence": 0.9,
      "reason": "置信度说明"
    }
  ]
}

目标字段包括：
- externalCode: 外部编码
- storeName: 收货门店
- recipientName: 收件人姓名
- recipientPhone: 收件人电话
- recipientAddress: 收件人地址
- skuCode: SKU物品编码
- skuName: SKU物品名称
- skuQuantity: SKU发货数量
- skuSpec: SKU规格型号
- remark: 备注

注意：
1. 不要硬编码文件名或特定列名
2. 规则应该是通用的，可以处理类似结构的文件
3. 对于不确定的映射，降低 confidence 值
4. 支持复杂结构：跨行聚合、矩阵转置、卡片式拆分等`

  const userPrompt = `分析以下文件内容，生成解析规则：

文件名：${fileName}
文件类型：${fileType}
文件内容（前5000字符）：
${fileContent.substring(0, 5000)}`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI 未返回有效内容')
    }

    const result = JSON.parse(content)
    return result as AIRuleSuggestion
  } catch (error) {
    console.error('AI rule generation error:', error)
    throw new Error(`AI 规则生成失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// AI 优化现有规则
export async function optimizeRuleWithAI(
  rule: ParseRule,
  sampleData: string,
  issues: string[]
): Promise<ParseRule> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 环境变量未配置')
  }

  // 动态导入 OpenAI
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1'
  })

  const systemPrompt = `你是一个规则优化专家。根据用户反馈的问题，优化解析规则。

当前规则：
${JSON.stringify(rule, null, 2)}

用户反馈的问题：
${issues.join('\n')}

请返回优化后的规则 JSON。`

  const userPrompt = `优化规则以解决以下问题：
${issues.join('\n')}

样例数据：
${sampleData.substring(0, 3000)}`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI 未返回有效内容')
    }

    return JSON.parse(content) as ParseRule
  } catch (error) {
    console.error('AI rule optimization error:', error)
    throw new Error(`AI 规则优化失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}
