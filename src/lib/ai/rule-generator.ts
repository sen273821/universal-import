import OpenAI from 'openai'
import type { AIRuleSuggestion, ParseRule, ParserFileType } from '@/types'
import { createEmptyRule, normalizeIncomingRule, parseRuleConfig } from '@/lib/rules'

const MODEL_NAME = 'deepseek-chat'
const BASE_URL = 'https://api.deepseek.com'

export async function generateRuleWithAI(
  fileContent: string,
  fileType: ParserFileType,
  fileName?: string,
): Promise<AIRuleSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 未配置')
  }

  const client = new OpenAI({
    apiKey,
    baseURL: BASE_URL,
  })

  const templateRule = createEmptyRule(fileType)
  const prompt = [
    '你是物流批量下单文件的规则设计器。',
    '目标是分析文件内容结构，只输出通用 ParseRule JSON，不要硬编码文件名，也不要依赖某个固定客户模板名称。',
    '规则必须通过配置描述表头行、数据起始行、字段映射、页尾提取、跨行聚合、矩阵转置、卡片拆分、多 Sheet、复合单元格拆分等能力。',
    '如果无法确认某项能力，保持 enabled=false，不要臆造。',
    '必须返回 JSON，对象结构如下：',
    JSON.stringify(
      {
        rule: {
          ...templateRule,
          ruleJson: templateRule.ruleJson,
        },
        confidence: 0.86,
        explanation: '说明为什么这样判断结构。',
        assumptions: ['列出 1 到 5 条待用户确认的假设。'],
      },
      null,
      2,
    ),
    '字段只允许使用这些目标字段：externalCode, storeName, recipientName, recipientPhone, recipientAddress, skuCode, skuName, skuQuantity, skuSpec, remark。',
    '请优先生成列匹配正则和文本提取正则，不要写死具体列号，除非从样本中非常明显。',
    `文件类型：${fileType}`,
    `文件名：${fileName ?? 'unknown'}`,
    '文件内容样本如下：',
    fileContent.slice(0, 12000),
  ].join('\n\n')

  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '你是物流导入规则设计助手，只能返回 JSON。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const rawText = response.choices[0]?.message?.content?.trim()
  if (!rawText) {
    throw new Error('AI 未返回内容')
  }

  const parsed = safeParseJson(rawText)
  const parsedRule = parsed.rule as Record<string, unknown> | undefined
  const rule = normalizeIncomingRule({
    ...parsedRule,
    fileType,
    ruleJson: parseRuleConfig((parsedRule?.ruleJson as Record<string, unknown>) ?? {}),
  })

  return {
    rule,
    confidence: normalizeConfidence(parsed.confidence),
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : 'AI 已生成候选规则，请在保存前人工确认。',
    assumptions: Array.isArray(parsed.assumptions)
      ? parsed.assumptions.filter((item): item is string => typeof item === 'string')
      : ['AI 已输出候选规则，请重点确认字段映射和数据起始行。'],
  }
}

export async function optimizeRuleWithAI(rule: ParseRule, fileContent: string, issues: string[]): Promise<AIRuleSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 未配置')
  }

  const client = new OpenAI({
    apiKey,
    baseURL: BASE_URL,
  })

  const prompt = [
    '你是物流导入规则修正助手。',
    '请基于当前规则和问题描述，输出一个新的 ParseRule JSON，并给出置信度、解释和待确认假设。',
    JSON.stringify({ rule, issues, fileContent: fileContent.slice(0, 10000) }, null, 2),
  ].join('\n\n')

  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: '你是物流导入规则修正助手，只能返回 JSON。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const rawText = response.choices[0]?.message?.content?.trim()
  if (!rawText) {
    throw new Error('AI 未返回内容')
  }

  const parsed = safeParseJson(rawText)
  const parsedRule = parsed.rule as Record<string, unknown> | undefined
  return {
    rule: normalizeIncomingRule({
      ...parsedRule,
      fileType: rule.fileType,
      ruleJson: parseRuleConfig((parsedRule?.ruleJson as Record<string, unknown>) ?? rule.ruleJson),
    }),
    confidence: normalizeConfidence(parsed.confidence),
    explanation: typeof parsed.explanation === 'string' ? parsed.explanation : 'AI 已根据问题重新整理规则。',
    assumptions: Array.isArray(parsed.assumptions)
      ? parsed.assumptions.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function safeParseJson(rawText: string): Record<string, unknown> {
  const normalized = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  return JSON.parse(normalized) as Record<string, unknown>
}

function normalizeConfidence(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) {
    return 0.5
  }

  return Math.max(0, Math.min(1, num))
}
