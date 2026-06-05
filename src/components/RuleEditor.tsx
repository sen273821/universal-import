'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Copy,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { ORDER_FIELDS, type OrderField, type ParseRule } from '@/types'
import { createEmptyRule } from '@/lib/rules'

interface RuleEditorProps {
  rules: ParseRule[]
  currentRule: ParseRule | null
  aiSummary?: {
    confidence: number
    explanation: string
    assumptions: string[]
  } | null
  isGenerating?: boolean
  isTesting?: boolean
  onChange: (rule: ParseRule) => void
  onSelect: (rule: ParseRule) => void
  onCreate: (rule: ParseRule) => void
  onSave: (rule: ParseRule) => void
  onDelete: (ruleId: string) => void
  onDuplicate: (rule: ParseRule) => void
  onGenerateAI: () => void
  onTest: () => void
}

const FIELD_OPTIONS: Array<{ value: OrderField; label: string }> = ORDER_FIELDS.map((field) => ({
  value: field,
  label: field,
}))

export default function RuleEditor({
  rules,
  currentRule,
  aiSummary,
  isGenerating,
  isTesting,
  onChange,
  onSelect,
  onCreate,
  onSave,
  onDelete,
  onDuplicate,
  onGenerateAI,
  onTest,
}: RuleEditorProps) {
  const [draft, setDraft] = useState<ParseRule>(currentRule ?? createEmptyRule())

  useEffect(() => {
    setDraft(currentRule ?? createEmptyRule())
  }, [currentRule])

  const isTextRule = draft.fileType !== 'excel'
  const canDelete = Boolean(draft.id && !draft.id.startsWith('draft-'))

  const createForCurrentType = () => {
    const nextRule = createEmptyRule(draft.fileType)
    setDraft(nextRule)
    onCreate(nextRule)
  }

  const updateRule = (updater: (rule: ParseRule) => ParseRule) => {
    const nextRule = updater(draft)
    setDraft(nextRule)
    onChange(nextRule)
  }

  const activeMappings = useMemo(
    () => (isTextRule ? draft.ruleJson.textMappings ?? [] : draft.ruleJson.columnMappings ?? []),
    [draft, isTextRule],
  )

  return (
    <div className="ui-card" id="rule-center">
      <div className="ui-card-header">
        <div>
          <div className="ui-title">规则管理</div>
          <p className="ui-subtitle mt-1">AI 只生成候选规则，保存前必须由人工确认。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-button ui-button-secondary" onClick={createForCurrentType}>
            <Plus className="h-4 w-4" />
            新建规则
          </button>
          <button type="button" className="ui-button ui-button-secondary" onClick={onGenerateAI} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'AI 分析中' : 'AI 生成规则'}
          </button>
          <button type="button" className="ui-button ui-button-primary" onClick={() => onSave(draft)}>
            <Save className="h-4 w-4" />
            保存规则
          </button>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-r border-[rgba(216,235,238,0.9)] p-5 xl:border-b-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">已保存规则</div>
            <span className="ui-badge bg-cyan-50 text-cyan-700">{rules.length}</span>
          </div>

          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cyan-100 bg-cyan-50/40 p-4 text-sm text-slate-500">
                暂无已保存规则，可以先上传文件后使用 AI 生成候选规则。
              </div>
            ) : (
              rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => onSelect(rule)}
                  className={`w-full rounded-3xl border px-4 py-3 text-left transition ${
                    rule.id === draft.id
                      ? 'border-cyan-300 bg-cyan-50/70 shadow-sm'
                      : 'border-transparent bg-white/75 hover:border-cyan-100 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{rule.name}</div>
                    <span className="ui-badge bg-slate-100 text-slate-600">{rule.fileType}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{rule.description || '未填写说明'}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="ui-grid-label">规则名称</span>
                  <input
                    className="ui-input"
                    value={draft.name}
                    onChange={(event) => updateRule((rule) => ({ ...rule, name: event.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="ui-grid-label">文件类型</span>
                  <select
                    className="ui-select"
                    value={draft.fileType}
                    onChange={(event) =>
                      updateRule((rule) => ({
                        ...rule,
                        fileType: event.target.value as ParseRule['fileType'],
                      }))
                    }
                  >
                    <option value="excel">Excel</option>
                    <option value="word">Word</option>
                    <option value="pdf">PDF</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="ui-grid-label">规则描述</span>
                <textarea
                  className="ui-textarea"
                  value={draft.description ?? ''}
                  onChange={(event) => updateRule((rule) => ({ ...rule, description: event.target.value }))}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="ui-grid-label">头部行数</span>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    value={draft.ruleJson.headerRows ?? 0}
                    onChange={(event) =>
                      updateRule((rule) => ({
                        ...rule,
                        ruleJson: {
                          ...rule.ruleJson,
                          headerRows: Number.parseInt(event.target.value, 10) || 0,
                        },
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="ui-grid-label">数据起始行</span>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    value={draft.ruleJson.dataStartRow ?? 0}
                    onChange={(event) =>
                      updateRule((rule) => ({
                        ...rule,
                        ruleJson: {
                          ...rule.ruleJson,
                          dataStartRow: Number.parseInt(event.target.value, 10) || 0,
                        },
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="ui-grid-label">遍历全部 Sheet</span>
                  <select
                    className="ui-select"
                    value={draft.ruleJson.multiSheet ? 'yes' : 'no'}
                    onChange={(event) =>
                      updateRule((rule) => ({
                        ...rule,
                        ruleJson: {
                          ...rule.ruleJson,
                          multiSheet: event.target.value === 'yes',
                        },
                      }))
                    }
                  >
                    <option value="no">否</option>
                    <option value="yes">是</option>
                  </select>
                </label>
              </div>

              {isTextRule ? (
                <label className="block">
                  <span className="ui-grid-label">记录分隔线正则</span>
                  <input
                    className="ui-input"
                    value={draft.ruleJson.textRecordSeparatorPattern ?? ''}
                    onChange={(event) =>
                      updateRule((rule) => ({
                        ...rule,
                        ruleJson: {
                          ...rule.ruleJson,
                          textRecordSeparatorPattern: event.target.value,
                        },
                      }))
                    }
                    placeholder="例如：(?:\\n\\s*\\n|(?:^|\\n)━━━+(?=\\n|$))"
                  />
                </label>
              ) : null}

              <div className="rounded-[28px] border border-cyan-100 bg-cyan-50/45 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-800">
                  <Bot className="h-4 w-4" />
                  AI 候选说明
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div>置信度：{Math.round((aiSummary?.confidence ?? 0) * 100)}%</div>
                  <div>{aiSummary?.explanation ?? '暂无 AI 说明。生成后请逐项确认映射和结构设置。'}</div>
                  {(aiSummary?.assumptions ?? []).length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {aiSummary?.assumptions.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-[rgba(216,235,238,0.9)] bg-white/75 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">{isTextRule ? '文本字段提取' : '列映射配置'}</div>
                  <button
                    type="button"
                    className="ui-button ui-button-secondary"
                    onClick={() =>
                      updateRule((rule) => ({
                        ...rule,
                        ruleJson: isTextRule
                          ? {
                              ...rule.ruleJson,
                              textMappings: [...(rule.ruleJson.textMappings ?? []), { targetField: 'skuName', pattern: '', groupIndex: 1 }],
                            }
                          : {
                              ...rule.ruleJson,
                              columnMappings: [...(rule.ruleJson.columnMappings ?? []), { targetField: 'skuName', headerPattern: '' }],
                            },
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </button>
                </div>

                <div className="space-y-3">
                  {activeMappings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-cyan-100 bg-cyan-50/40 px-4 py-3 text-sm text-slate-500">
                      当前规则还没有字段映射。
                    </div>
                  ) : null}

                  {isTextRule
                    ? (draft.ruleJson.textMappings ?? []).map((mapping, index) => (
                        <div key={`${mapping.targetField}-${index}`} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-3">
                          <div className="grid gap-3 md:grid-cols-[160px_1fr_96px_44px]">
                            <select
                              className="ui-select"
                              value={mapping.targetField}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.textMappings ?? [])]
                                  next[index] = { ...mapping, targetField: event.target.value as OrderField }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, textMappings: next } }
                                })
                              }
                            >
                              {FIELD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <input
                              className="ui-input"
                              value={mapping.pattern}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.textMappings ?? [])]
                                  next[index] = { ...mapping, pattern: event.target.value }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, textMappings: next } }
                                })
                              }
                              placeholder="正则表达式"
                            />
                            <input
                              className="ui-input"
                              type="number"
                              min={0}
                              value={mapping.groupIndex ?? 1}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.textMappings ?? [])]
                                  next[index] = { ...mapping, groupIndex: Number.parseInt(event.target.value, 10) || 1 }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, textMappings: next } }
                                })
                              }
                            />
                            <button
                              type="button"
                              className="ui-button ui-button-danger h-[44px] px-0"
                              onClick={() =>
                                updateRule((rule) => ({
                                  ...rule,
                                  ruleJson: {
                                    ...rule.ruleJson,
                                    textMappings: (rule.ruleJson.textMappings ?? []).filter((_, currentIndex) => currentIndex !== index),
                                  },
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    : (draft.ruleJson.columnMappings ?? []).map((mapping, index) => (
                        <div key={`${mapping.targetField}-${index}`} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-3">
                          <div className="grid gap-3 xl:grid-cols-[160px_1fr_96px_1fr_44px]">
                            <select
                              className="ui-select"
                              value={mapping.targetField}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.columnMappings ?? [])]
                                  next[index] = { ...mapping, targetField: event.target.value as OrderField }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, columnMappings: next } }
                                })
                              }
                            >
                              {FIELD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <input
                              className="ui-input"
                              value={mapping.headerPattern ?? ''}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.columnMappings ?? [])]
                                  next[index] = { ...mapping, headerPattern: event.target.value }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, columnMappings: next } }
                                })
                              }
                              placeholder="表头匹配正则"
                            />
                            <input
                              className="ui-input"
                              type="number"
                              min={0}
                              value={mapping.columnIndex ?? ''}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.columnMappings ?? [])]
                                  next[index] = {
                                    ...mapping,
                                    columnIndex: event.target.value === '' ? undefined : Number.parseInt(event.target.value, 10) || 0,
                                  }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, columnMappings: next } }
                                })
                              }
                              placeholder="列号"
                            />
                            <input
                              className="ui-input"
                              value={mapping.valuePattern ?? ''}
                              onChange={(event) =>
                                updateRule((rule) => {
                                  const next = [...(rule.ruleJson.columnMappings ?? [])]
                                  next[index] = { ...mapping, valuePattern: event.target.value }
                                  return { ...rule, ruleJson: { ...rule.ruleJson, columnMappings: next } }
                                })
                              }
                              placeholder="值提取正则（可选）"
                            />
                            <button
                              type="button"
                              className="ui-button ui-button-danger h-[44px] px-0"
                              onClick={() =>
                                updateRule((rule) => ({
                                  ...rule,
                                  ruleJson: {
                                    ...rule.ruleJson,
                                    columnMappings: (rule.ruleJson.columnMappings ?? []).filter((_, currentIndex) => currentIndex !== index),
                                  },
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="rounded-[28px] border border-cyan-100 bg-cyan-50/45 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">复合单元格拆分</div>
                  <div className="space-y-3">
                    <select
                      className="ui-select"
                      value={draft.ruleJson.splitCellValue?.enabled ? 'yes' : 'no'}
                      onChange={(event) =>
                        updateRule((rule) => ({
                          ...rule,
                          ruleJson: {
                            ...rule.ruleJson,
                            splitCellValue: {
                              sourceField: 'skuName',
                              itemSeparatorPattern: '\\n+',
                              quantityPattern: '(.+?)[x×*](\\d+)',
                              ...rule.ruleJson.splitCellValue,
                              enabled: event.target.value === 'yes',
                            },
                          },
                        }))
                      }
                    >
                      <option value="no">关闭</option>
                      <option value="yes">启用</option>
                    </select>
                    <input
                      className="ui-input"
                      value={draft.ruleJson.splitCellValue?.itemSeparatorPattern ?? ''}
                      onChange={(event) =>
                        updateRule((rule) => ({
                          ...rule,
                          ruleJson: {
                            ...rule.ruleJson,
                            splitCellValue: {
                              sourceField: 'skuName' as const,
                              enabled: false,
                              quantityPattern: '(.+?)[x×*](\\d+)',
                              ...rule.ruleJson.splitCellValue,
                              itemSeparatorPattern: event.target.value,
                            },
                          },
                        }))
                      }
                      placeholder="拆分正则，例如：\\n+"
                    />
                  </div>
                </label>

                <label className="rounded-[28px] border border-cyan-100 bg-cyan-50/45 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">跨行聚合</div>
                  <div className="space-y-3">
                    <select
                      className="ui-select"
                      value={draft.ruleJson.aggregation?.enabled ? 'yes' : 'no'}
                      onChange={(event) =>
                        updateRule((rule) => ({
                          ...rule,
                          ruleJson: {
                            ...rule.ruleJson,
                            aggregation: {
                              groupByField: 'externalCode' as const,
                              joinFields: ['remark' as const],
                              sumFields: ['skuQuantity' as const],
                              keepFirstFields: ['storeName' as const, 'recipientName' as const, 'recipientPhone' as const, 'recipientAddress' as const],
                              ...rule.ruleJson.aggregation,
                              enabled: event.target.value === 'yes',
                            },
                          },
                        }))
                      }
                    >
                      <option value="no">关闭</option>
                      <option value="yes">启用</option>
                    </select>
                    <select
                      className="ui-select"
                      value={draft.ruleJson.aggregation?.groupByField ?? 'externalCode'}
                      onChange={(event) =>
                        updateRule((rule) => ({
                          ...rule,
                          ruleJson: {
                            ...rule.ruleJson,
                            aggregation: {
                              enabled: false,
                              ...rule.ruleJson.aggregation,
                              groupByField: event.target.value as OrderField,
                            },
                          },
                        }))
                      }
                    >
                      {FIELD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="ui-button ui-button-secondary" onClick={onTest} disabled={isTesting}>
                  <Play className="h-4 w-4" />
                  {isTesting ? '测试中' : '规则预览测试'}
                </button>
                <button type="button" className="ui-button ui-button-secondary" onClick={() => onDuplicate(draft)}>
                  <Copy className="h-4 w-4" />
                  复制规则
                </button>
                {canDelete ? (
                  <button type="button" className="ui-button ui-button-danger" onClick={() => draft.id && onDelete(draft.id)}>
                    <Trash2 className="h-4 w-4" />
                    删除规则
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
