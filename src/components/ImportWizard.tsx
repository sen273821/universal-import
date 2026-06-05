'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  PackageOpen,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { ORDER_FIELDS, type OrderField, type ParseRule } from '@/types'
import { createEmptyRule } from '@/lib/rules'
import { ACCEPTED_FILE_TYPES } from '@/lib/file'

/* ─────────────── 步骤定义 ─────────────── */

type Step = 'upload' | 'strategy' | 'mapping' | 'review'

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'upload', label: '上传文件', icon: <UploadCloud className="h-4 w-4" /> },
  { key: 'strategy', label: '解析策略', icon: <Settings2 className="h-4 w-4" /> },
  { key: 'mapping', label: '字段映射', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { key: 'review', label: '预览提交', icon: <Check className="h-4 w-4" /> },
]

/* ─────────────── 工具函数 ─────────────── */

function inferFileType(file: File): ParseRule['fileType'] {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) return 'word'
  if (name.endsWith('.pdf')) return 'pdf'
  return 'excel'
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

/* ─────────────── Props ─────────────── */

interface Props {
  file: File | null
  progress: number
  fileBusy: boolean
  rules: ParseRule[]
  currentRule: ParseRule | null
  aiSummary: { confidence: number; explanation: string; assumptions: string[] } | null
  isGenerating: boolean
  isTesting: boolean
  parsedData: any[]
  errors: any[]
  submitting: boolean
  onFileSelect: (f: File | null) => void
  onGenerateRule: () => void
  onRuleChange: (rule: ParseRule) => void
  onRuleSelect: (rule: ParseRule) => void
  onRuleCreate: (rule: ParseRule) => void
  onRuleSave: (rule: ParseRule) => void
  onRuleDelete: (ruleId: string) => void
  onRuleDuplicate: (rule: ParseRule) => void
  onTest: () => void
  onSubmit: () => void
  onExport: () => void
  onDataChange: (data: any[]) => void
}

/* ─────────────── 主组件 ─────────────── */

export default function ImportWizard({
  file, progress, fileBusy, rules, currentRule, aiSummary,
  isGenerating, isTesting, parsedData, errors, submitting,
  onFileSelect, onGenerateRule, onRuleChange, onRuleSelect,
  onRuleCreate, onRuleSave, onRuleDelete, onRuleDuplicate,
  onTest, onSubmit, onExport, onDataChange,
}: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [draft, setDraft] = useState<ParseRule>(currentRule ?? createEmptyRule())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSavedRules, setShowSavedRules] = useState(false)

  useEffect(() => {
    setDraft(currentRule ?? createEmptyRule())
  }, [currentRule])

  // 文件选择后自动进入下一步
  useEffect(() => {
    if (file && step === 'upload') {
      setStep('strategy')
    }
  }, [file])

  // 解析完成后自动进入预览
  useEffect(() => {
    if (parsedData.length > 0 && step === 'mapping') {
      setStep('review')
    }
  }, [parsedData])

  const updateRule = useCallback((updater: (rule: ParseRule) => ParseRule) => {
    const next = updater(draft)
    setDraft(next)
    onRuleChange(next)
  }, [draft, onRuleChange])

  const isTextRule = draft.fileType !== 'excel'
  const canDelete = Boolean(draft.id && !draft.id.startsWith('draft-'))

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].key)
    }
  }

  const goPrev = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key)
    }
  }

  /* ─── 文件上传 dropzone ─── */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileSelect(acceptedFiles[0] ?? null)
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: false,
    maxSize: 25 * 1024 * 1024,
  })

  const rejectionMessage = useMemo(() => {
    const first = fileRejections[0]
    return first ? (first.errors[0]?.message ?? '文件格式或大小不符合要求') : ''
  }, [fileRejections])

  const activeMappings = useMemo(
    () => (isTextRule ? draft.ruleJson.textMappings ?? [] : draft.ruleJson.columnMappings ?? []),
    [draft, isTextRule],
  )

  const FIELD_OPTIONS = ORDER_FIELDS.map((f) => ({ value: f, label: f }))

  /* ─────────────── 步骤渲染 ─────────────── */

  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        {...getRootProps()}
        className={`w-full max-w-xl rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-[var(--primary)] bg-[var(--primary-soft)] scale-[1.02]'
            : 'border-[var(--line)] bg-white hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]'
        }`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] mb-4">
          <UploadCloud className="h-10 w-10" />
        </div>
        <div className="text-lg font-semibold text-[var(--text)] mb-2">
          {isDragActive ? '释放文件开始加载' : '拖拽文件到此处，或点击选择'}
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          支持 .xlsx .xls .docx .pdf，单文件 ≤ 25MB
        </p>
      </div>

      {rejectionMessage && (
        <div className="mt-4 w-full max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {rejectionMessage}
        </div>
      )}

      {file && (
        <div className="mt-6 w-full max-w-xl rounded-lg border border-[var(--line)] bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              {file.name.toLowerCase().endsWith('.docx') ? <FileText className="h-6 w-6" /> :
               file.name.toLowerCase().endsWith('.pdf') ? <PackageOpen className="h-6 w-6" /> :
               <FileSpreadsheet className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text)] truncate">{file.name}</div>
              <div className="text-sm text-[var(--text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button type="button" className="text-[var(--text-muted)] hover:text-[var(--danger)]" onClick={(e) => { e.stopPropagation(); onFileSelect(null); setStep('upload') }}>
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          {progress > 0 && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-[var(--primary-soft)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 已保存规则快速选择 */}
      {rules.length > 0 && (
        <div className="mt-6 w-full max-w-xl">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
            onClick={() => setShowSavedRules(!showSavedRules)}
          >
            或选择已保存的规则 ({rules.length})
            {showSavedRules ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSavedRules && (
            <div className="mt-2 space-y-2">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => { onRuleSelect(rule); setStep('strategy') }}
                  className="w-full text-left rounded-lg border border-[var(--line)] bg-white px-4 py-3 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{rule.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)]">{rule.fileType}</span>
                  </div>
                  {rule.description && <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1">{rule.description}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderStrategy = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 智能分析 */}
      <div className="rounded-lg border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-[var(--text)]">智能识别</div>
            <div className="text-sm text-[var(--text-muted)]">自动分析文件结构，匹配表头关键字生成规则</div>
          </div>
        </div>
        <button
          type="button"
          className="ui-button ui-button-primary w-full justify-center"
          onClick={onGenerateRule}
          disabled={isGenerating || !file}
        >
          {isGenerating ? (
            <><LoaderCircle className="h-4 w-4 animate-spin" /> 分析中...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> 一键智能生成规则</>
          )}
        </button>
        {aiSummary && (
          <div className="mt-4 rounded-lg bg-white p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-[var(--primary)]" />
              <span className="font-medium">分析结果</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                匹配度 {Math.round(aiSummary.confidence * 100)}%
              </span>
            </div>
            <p className="text-[var(--text-muted)]">{aiSummary.explanation}</p>
            {aiSummary.assumptions.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)] list-disc pl-4">
                {aiSummary.assumptions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 分隔线 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[var(--line)]" />
        <span className="text-xs text-[var(--text-muted)]">或手动配置</span>
        <div className="flex-1 h-px bg-[var(--line)]" />
      </div>

      {/* 基础配置 */}
      <div className="rounded-lg border border-[var(--line)] bg-white p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="ui-grid-label">规则名称</span>
            <input className="ui-input" value={draft.name} onChange={(e) => updateRule((r) => ({ ...r, name: e.target.value }))} />
          </label>
          <label className="block">
            <span className="ui-grid-label">文件类型</span>
            <select className="ui-select" value={draft.fileType} onChange={(e) => updateRule((r) => ({ ...r, fileType: e.target.value as any }))}>
              <option value="excel">Excel</option>
              <option value="word">Word</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="ui-grid-label">规则说明（可选）</span>
          <input className="ui-input" value={draft.description ?? ''} onChange={(e) => updateRule((r) => ({ ...r, description: e.target.value }))} placeholder="描述这个规则适用于什么文件" />
        </label>

        {/* 高级选项折叠 */}
        <div className="border-t border-[var(--line)] pt-4">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            高级选项
          </button>
          {showAdvanced && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="ui-grid-label">头部行数</span>
                <input className="ui-input" type="number" min={0} value={draft.ruleJson.headerRows ?? 0}
                  onChange={(e) => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, headerRows: parseInt(e.target.value) || 0 } }))} />
              </label>
              <label className="block">
                <span className="ui-grid-label">数据起始行</span>
                <input className="ui-input" type="number" min={0} value={draft.ruleJson.dataStartRow ?? 0}
                  onChange={(e) => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, dataStartRow: parseInt(e.target.value) || 0 } }))} />
              </label>
              <label className="block">
                <span className="ui-grid-label">遍历全部 Sheet</span>
                <select className="ui-select" value={draft.ruleJson.multiSheet ? 'yes' : 'no'}
                  onChange={(e) => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, multiSheet: e.target.value === 'yes' } }))}>
                  <option value="no">否</option>
                  <option value="yes">是</option>
                </select>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderMapping = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 字段映射 */}
      <div className="rounded-lg border border-[var(--line)] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-[var(--text)]">{isTextRule ? '文本字段提取规则' : '列映射配置'}</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">
              {isTextRule ? '用正则表达式从文本中提取字段' : '将文件列映射到系统字段'}
            </div>
          </div>
          <button type="button" className="ui-button ui-button-secondary" onClick={() =>
            updateRule((r) => ({
              ...r,
              ruleJson: isTextRule
                ? { ...r.ruleJson, textMappings: [...(r.ruleJson.textMappings ?? []), { targetField: 'skuName', pattern: '', groupIndex: 1 }] }
                : { ...r.ruleJson, columnMappings: [...(r.ruleJson.columnMappings ?? []), { targetField: 'skuName', headerPattern: '' }] },
            }))
          }>
            <Plus className="h-4 w-4" /> 添加映射
          </button>
        </div>

        {activeMappings.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-[var(--line)] p-8 text-center text-[var(--text-muted)]">
            <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>暂无字段映射</div>
            <div className="text-xs mt-1">点击上方"添加映射"或使用 AI 自动生成</div>
          </div>
        ) : (
          <div className="space-y-3">
            {isTextRule ? (draft.ruleJson.textMappings ?? []).map((m, i) => (
              <div key={i} className="rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr_80px_40px]">
                  <select className="ui-select" value={m.targetField}
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.textMappings ?? [])]; next[i] = { ...m, targetField: e.target.value as OrderField }; return { ...r, ruleJson: { ...r.ruleJson, textMappings: next } } })}>
                    {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input className="ui-input" value={m.pattern} placeholder="正则表达式"
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.textMappings ?? [])]; next[i] = { ...m, pattern: e.target.value }; return { ...r, ruleJson: { ...r.ruleJson, textMappings: next } } })} />
                  <input className="ui-input" type="number" min={0} value={m.groupIndex ?? 1} placeholder="组号"
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.textMappings ?? [])]; next[i] = { ...m, groupIndex: parseInt(e.target.value) || 1 }; return { ...r, ruleJson: { ...r.ruleJson, textMappings: next } } })} />
                  <button type="button" className="text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center justify-center"
                    onClick={() => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, textMappings: (r.ruleJson.textMappings ?? []).filter((_, j) => j !== i) } }))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )) : (draft.ruleJson.columnMappings ?? []).map((m, i) => (
              <div key={i} className="rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_80px_1fr_40px]">
                  <select className="ui-select" value={m.targetField}
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.columnMappings ?? [])]; next[i] = { ...m, targetField: e.target.value as OrderField }; return { ...r, ruleJson: { ...r.ruleJson, columnMappings: next } } })}>
                    {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input className="ui-input" value={m.headerPattern ?? ''} placeholder="表头关键字"
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.columnMappings ?? [])]; next[i] = { ...m, headerPattern: e.target.value }; return { ...r, ruleJson: { ...r.ruleJson, columnMappings: next } } })} />
                  <input className="ui-input" type="number" min={0} value={m.columnIndex ?? ''} placeholder="列号"
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.columnMappings ?? [])]; next[i] = { ...m, columnIndex: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }; return { ...r, ruleJson: { ...r.ruleJson, columnMappings: next } } })} />
                  <input className="ui-input" value={m.valuePattern ?? ''} placeholder="值提取（可选）"
                    onChange={(e) => updateRule((r) => { const next = [...(r.ruleJson.columnMappings ?? [])]; next[i] = { ...m, valuePattern: e.target.value }; return { ...r, ruleJson: { ...r.ruleJson, columnMappings: next } } })} />
                  <button type="button" className="text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center justify-center"
                    onClick={() => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, columnMappings: (r.ruleJson.columnMappings ?? []).filter((_, j) => j !== i) } }))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 高级处理选项 */}
      <div className="rounded-lg border border-[var(--line)] bg-white p-6">
        <button type="button" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          数据处理选项（复合拆分 / 跨行聚合）
        </button>
        {showAdvanced && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="rounded-lg border border-[var(--line)] p-4 block">
              <div className="text-sm font-medium mb-2">复合单元格拆分</div>
              <select className="ui-select" value={draft.ruleJson.splitCellValue?.enabled ? 'yes' : 'no'}
                onChange={(e) => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, splitCellValue: { sourceField: 'skuName', itemSeparatorPattern: '\\n+', quantityPattern: '(.+?)[x×*](\\d+)', ...r.ruleJson.splitCellValue, enabled: e.target.value === 'yes' } } }))}>
                <option value="no">关闭</option><option value="yes">启用</option>
              </select>
            </label>
            <label className="rounded-lg border border-[var(--line)] p-4 block">
              <div className="text-sm font-medium mb-2">跨行聚合</div>
              <select className="ui-select" value={draft.ruleJson.aggregation?.enabled ? 'yes' : 'no'}
                onChange={(e) => updateRule((r) => ({ ...r, ruleJson: { ...r.ruleJson, aggregation: { groupByField: 'externalCode', joinFields: ['remark'], sumFields: ['skuQuantity'], keepFirstFields: ['storeName', 'recipientName', 'recipientPhone', 'recipientAddress'], ...r.ruleJson.aggregation, enabled: e.target.value === 'yes' } } }))}>
                <option value="no">关闭</option><option value="yes">启用</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  )

  const renderReview = () => (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white px-6 py-4">
        <div>
          <span className="text-sm text-[var(--text-muted)]">解析结果：</span>
          <span className="font-semibold text-[var(--text)] ml-1">{parsedData.length} 条</span>
          {errors.length > 0 && (
            <span className="ml-3 text-sm text-[var(--warning)]">{errors.length} 个校验问题</span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="ui-button ui-button-secondary" onClick={onExport}>导出 Excel</button>
          <button type="button" className="ui-button ui-button-primary" onClick={onSubmit} disabled={submitting || parsedData.length === 0}>
            {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> 提交中</> : '提交运单'}
          </button>
        </div>
      </div>

      {/* 数据表格预览 */}
      {parsedData.length > 0 && (
        <div className="rounded-lg border border-[var(--line)] bg-white overflow-hidden">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>外部单号</th>
                  <th>门店</th>
                  <th>收货人</th>
                  <th>电话</th>
                  <th>地址</th>
                  <th>商品</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 100).map((row, i) => (
                  <tr key={i}>
                    <td className="text-[var(--text-muted)]">{i + 1}</td>
                    <td>{row.externalCode}</td>
                    <td>{row.storeName}</td>
                    <td>{row.recipientName}</td>
                    <td>{row.recipientPhone}</td>
                    <td className="max-w-[200px] truncate">{row.recipientAddress}</td>
                    <td>{row.skuName}</td>
                    <td>{row.skuQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedData.length > 100 && (
            <div className="px-4 py-2 text-xs text-[var(--text-muted)] text-center border-t border-[var(--line)]">
              显示前 100 条，共 {parsedData.length} 条
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderStepContent = () => {
    switch (step) {
      case 'upload': return renderUpload()
      case 'strategy': return renderStrategy()
      case 'mapping': return renderMapping()
      case 'review': return renderReview()
    }
  }

  /* ─────────────── 主渲染 ─────────────── */

  return (
    <>
      {/* 步骤导航条 */}
      <div className="rounded-lg border border-[var(--line)] bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  // 只允许跳转到已完成或当前步骤
                  if (i <= stepIndex) setStep(s.key)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  step === s.key
                    ? 'bg-[var(--primary)] text-white'
                    : i < stepIndex
                    ? 'bg-[var(--primary-soft)] text-[var(--primary)] cursor-pointer'
                    : 'text-[var(--text-muted)] cursor-default'
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step === s.key ? 'bg-white text-[var(--primary)]' :
                  i < stepIndex ? 'bg-[var(--primary)] text-white' :
                  'bg-[var(--surface-muted)] text-[var(--text-muted)]'
                }`}>
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-2 ${i < stepIndex ? 'bg-[var(--primary)]' : 'bg-[var(--line)]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white px-6 py-4">
        <button
          type="button"
          className="ui-button ui-button-secondary"
          onClick={goPrev}
          disabled={stepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4" /> 上一步
        </button>

        <div className="flex gap-2">
          {/* 中间步骤的操作按钮 */}
          {step === 'strategy' && (
            <>
              <button type="button" className="ui-button ui-button-secondary" onClick={() => onRuleSave(draft)}>
                <Save className="h-4 w-4" /> 保存规则
              </button>
              {canDelete && (
                <button type="button" className="ui-button ui-button-danger" onClick={() => draft.id && onRuleDelete(draft.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {step === 'mapping' && (
            <button type="button" className="ui-button ui-button-primary" onClick={onTest} disabled={isTesting || !file}>
              {isTesting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> 解析中</> : <><Play className="h-4 w-4" /> 测试解析</>}
            </button>
          )}
        </div>

        <button
          type="button"
          className="ui-button ui-button-primary"
          onClick={goNext}
          disabled={stepIndex === STEPS.length - 1 || (step === 'upload' && !file)}
        >
          下一步 <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
