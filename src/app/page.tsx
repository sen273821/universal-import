'use client'

import { useCallback, useEffect, useState } from 'react'
import { List, Upload } from 'lucide-react'

import ImportWizard from '@/components/ImportWizard'
import OrderList from '@/components/OrderList'
import ToastStack, { type ToastItem } from '@/components/ToastStack'

import type { AIRuleSuggestion, OrderRecord, ParseResult, ParseRule, ValidationError } from '@/types'
import { normalizeIncomingRule } from '@/lib/rules'

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

/* ─────────────── Tab 配置 ─────────────── */

type TabKey = 'import' | 'orders'

const TABS: { key: TabKey; hash: string; label: string; icon: React.ReactNode }[] = [
  { key: 'import', hash: '#file-import', label: '文件导入', icon: <Upload className="h-4 w-4" /> },
  { key: 'orders', hash: '#order-history', label: '已导入运单', icon: <List className="h-4 w-4" /> },
]

function tabFromHash(hash: string): TabKey {
  return hash === '#order-history' ? 'orders' : 'import'
}

/* ─────────────── 页面组件 ─────────────── */

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('import')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [fileBusy, setFileBusy] = useState(false)
  const [rules, setRules] = useState<ParseRule[]>([])
  const [currentRule, setCurrentRule] = useState<ParseRule | null>(null)
  const [aiSummary, setAiSummary] = useState<AIRuleSuggestion | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [parsedData, setParsedData] = useState<OrderRecord[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderReloadToken, setOrderReloadToken] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((title: string, description?: string, tone: ToastItem['tone'] = 'info') => {
    setToasts((prev) => [...prev, { id: uid(), title, description, tone }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /* ─── Hash 路由 ─── */
  useEffect(() => {
    setActiveTab(tabFromHash(window.location.hash))
    const onHash = () => setActiveTab(tabFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const switchTab = useCallback((tab: TabKey) => {
    const def = TABS.find((t) => t.key === tab)
    if (def) window.location.hash = def.hash
    setActiveTab(tab)
  }, [])

  /* ─── 加载规则 ─── */
  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/rules')
      if (!res.ok) throw new Error('加载规则失败')
      const data = await res.json()
      setRules(Array.isArray(data) ? data.map((r: any) => normalizeIncomingRule(r)) : [])
    } catch (err) {
      console.error('加载规则列表失败:', err)
    }
  }, [])

  useEffect(() => { loadRules() }, [loadRules])

  /* ─── 文件操作 ─── */
  const handleFileSelect = useCallback((f: File | null) => {
    setFile(f)
    setParsedData([])
    setErrors([])
    setProgress(0)
  }, [])

  /* ─── 智能生成规则 ─── */
  const handleGenerateRule = useCallback(async () => {
    if (!file) {
      pushToast('请先上传文件', '需要先选择一个文件再生成规则', 'error')
      return
    }
    setIsGenerating(true)
    setFileBusy(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', inferFileType(file))
      const res = await fetch('/api/ai/generate-rule', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || '生成规则失败')
      const suggestion: AIRuleSuggestion = body
      setCurrentRule(normalizeIncomingRule(suggestion.rule))
      setAiSummary(suggestion)
      pushToast('规则已生成', `匹配度 ${Math.round(suggestion.confidence * 100)}%，请确认后保存`, 'success')
    } catch (err) {
      pushToast('生成规则失败', (err as Error).message, 'error')
    } finally {
      setIsGenerating(false)
      setFileBusy(false)
    }
  }, [file, pushToast])

  /* ─── 规则 CRUD ─── */
  const handleRuleChange = useCallback((rule: ParseRule) => { setCurrentRule(rule) }, [])
  const handleRuleSelect = useCallback((rule: ParseRule) => { setCurrentRule({ ...rule, ruleJson: { ...rule.ruleJson } }); setAiSummary(null) }, [])
  const handleRuleCreate = useCallback((rule: ParseRule) => { setCurrentRule(rule); setAiSummary(null) }, [])

  const handleRuleSave = useCallback(async (rule: ParseRule) => {
    try {
      const res = await fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rule) })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || '保存失败') }
      const saved: ParseRule = normalizeIncomingRule(await res.json())
      setRules((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
      setCurrentRule(saved)
      pushToast('规则保存成功', saved.name, 'success')
    } catch (err) {
      pushToast('保存规则失败', (err as Error).message, 'error')
    }
  }, [pushToast])

  const handleRuleDelete = useCallback(async (ruleId: string) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || '删除失败') }
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      setCurrentRule((prev) => (prev?.id === ruleId ? null : prev))
      pushToast('规则已删除', undefined, 'success')
    } catch (err) {
      pushToast('删除规则失败', (err as Error).message, 'error')
    }
  }, [pushToast])

  const handleRuleDuplicate = useCallback((rule: ParseRule) => {
    setCurrentRule({ ...rule, id: `draft-${uid()}`, name: `${rule.name}（副本）`, createdAt: undefined, updatedAt: undefined })
    pushToast('已复制规则', '请修改后保存为新规则', 'info')
  }, [pushToast])

  /* ─── 解析 ─── */
  const handleTest = useCallback(async () => {
    if (!file || !currentRule) {
      pushToast('请先上传文件并选择规则', undefined, 'error')
      return
    }
    setIsTesting(true)
    setFileBusy(true)
    setProgress(0)
    try {
      const timer = setInterval(() => setProgress((p) => Math.min(p + 8, 90)), 120)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('rule', JSON.stringify(currentRule))
      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      clearInterval(timer)
      setProgress(100)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || '解析失败')
      const result: ParseResult = body
      setParsedData(result.data)
      setErrors(result.validationErrors ?? [])
      pushToast('解析完成', `共 ${result.totalRows} 行，成功 ${result.parsedRows} 行`, result.validationErrors?.length ? 'info' : 'success')
    } catch (err) {
      pushToast('解析失败', (err as Error).message, 'error')
      setParsedData([])
      setErrors([])
    } finally {
      setIsTesting(false)
      setFileBusy(false)
    }
  }, [file, currentRule, pushToast])

  /* ─── 提交 ─── */
  const handleSubmit = useCallback(async () => {
    if (parsedData.length === 0) { pushToast('没有可提交的数据', undefined, 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orders: parsedData, ruleId: currentRule?.id }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || '提交失败')
      pushToast('提交成功', `成功导入 ${body.count} 条运单`, 'success')
      setParsedData([])
      setErrors([])
      setOrderReloadToken((t) => t + 1)
      switchTab('orders')
    } catch (err) {
      pushToast('提交失败', (err as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }, [parsedData, currentRule, pushToast, switchTab])

  /* ─── 导出 ─── */
  const handleExport = useCallback(async () => {
    if (parsedData.length === 0) { pushToast('没有可导出的数据', undefined, 'error'); return }
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orders: parsedData }) })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || '导出失败') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `运单导出_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      pushToast('导出成功', `已导出 ${parsedData.length} 条记录`, 'success')
    } catch (err) {
      pushToast('导出失败', (err as Error).message, 'error')
    }
  }, [parsedData, pushToast])

  /* ─── 渲染 ─── */

  return (
    <>
      {/* 标签页栏 */}
      <div className="ui-tabs-bar">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" onClick={() => switchTab(tab.key)}
            className={`ui-tab-item flex items-center gap-2 ${activeTab === tab.key ? 'active' : ''}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* 主内容 */}
      <div className="ui-page">
        {activeTab === 'import' ? (
          <ImportWizard
            file={file} progress={progress} fileBusy={fileBusy}
            rules={rules} currentRule={currentRule} aiSummary={aiSummary}
            isGenerating={isGenerating} isTesting={isTesting}
            parsedData={parsedData} errors={errors} submitting={submitting}
            onFileSelect={handleFileSelect} onGenerateRule={handleGenerateRule}
            onRuleChange={handleRuleChange} onRuleSelect={handleRuleSelect}
            onRuleCreate={handleRuleCreate} onRuleSave={handleRuleSave}
            onRuleDelete={handleRuleDelete} onRuleDuplicate={handleRuleDuplicate}
            onTest={handleTest} onSubmit={handleSubmit} onExport={handleExport}
            onDataChange={setParsedData} onErrorsChange={setErrors}
          />
        ) : (
          <OrderList onExport={handleExport} />
        )}
      </div>

      <ToastStack toasts={toasts} onRemove={removeToast} />
    </>
  )
}
