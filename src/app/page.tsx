'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileSpreadsheet, List, Upload } from 'lucide-react'

import FileUpload from '@/components/FileUpload'
import RuleEditor from '@/components/RuleEditor'
import DataPreview from '@/components/DataPreview'
import OrderList from '@/components/OrderList'
import ToastStack, { type ToastItem } from '@/components/ToastStack'

import type { AIRuleSuggestion, OrderRecord, ParseResult, ParseRule, ValidationError } from '@/types'
import { createEmptyRule, normalizeIncomingRule } from '@/lib/rules'

/* ─────────────── 工具函数 ─────────────── */

/** 根据文件扩展名推断文件类型 */
function inferFileType(file: File): ParseRule['fileType'] {
  const name = file.name.toLowerCase()
  if (name.endsWith('.docx')) return 'word'
  if (name.endsWith('.pdf')) return 'pdf'
  return 'excel'
}

/** 生成唯一 ID */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

/* ─────────────── Tab 配置 ─────────────── */

type TabKey = 'import' | 'orders'

interface TabDef {
  key: TabKey
  hash: string
  label: string
  icon: React.ReactNode
}

const TABS: TabDef[] = [
  { key: 'import', hash: '#file-import', label: '文件导入', icon: <Upload className="h-4 w-4" /> },
  { key: 'orders', hash: '#order-history', label: '已导入运单', icon: <List className="h-4 w-4" /> },
]

/** 根据 URL hash 返回对应的 tab key */
function tabFromHash(hash: string): TabKey {
  if (hash === '#order-history') return 'orders'
  return 'import'
}

/* ─────────────── 页面组件 ─────────────── */

export default function Home() {
  /* ─── 导航 ─── */
  const [activeTab, setActiveTab] = useState<TabKey>('import')

  /* ─── 文件状态 ─── */
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [fileBusy, setFileBusy] = useState(false)

  /* ─── 规则状态 ─── */
  const [rules, setRules] = useState<ParseRule[]>([])
  const [currentRule, setCurrentRule] = useState<ParseRule | null>(null)
  const [aiSummary, setAiSummary] = useState<AIRuleSuggestion | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  /* ─── 解析 / 提交状态 ─── */
  const [parsedData, setParsedData] = useState<OrderRecord[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /* ─── 订单列表刷新令牌 ─── */
  const [orderReloadToken, setOrderReloadToken] = useState(0)

  /* ─── Toast 通知 ─── */
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((title: string, description?: string, tone: ToastItem['tone'] = 'info') => {
    setToasts((prev) => [...prev, { id: uid(), title, description, tone }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /* ─────────────── Hash 路由 ─────────────── */

  useEffect(() => {
    // 初始化时读取 hash
    setActiveTab(tabFromHash(window.location.hash))

    const onHash = () => setActiveTab(tabFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  /** 切换 tab 并同步 hash */
  const switchTab = useCallback((tab: TabKey) => {
    const def = TABS.find((t) => t.key === tab)
    if (def) {
      window.location.hash = def.hash
    }
    setActiveTab(tab)
  }, [])

  /* ─────────────── 加载已保存规则 ─────────────── */

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/rules')
      if (!res.ok) throw new Error('加载规则失败')
      const data = await res.json()
      // API already returns parsed ruleJson as object, just ensure types
      setRules(Array.isArray(data) ? data.map((r: any) => ({
        id: r.id,
        name: r.name?.trim() || '未命名规则',
        description: r.description?.trim() || '',
        fileType: r.fileType === 'word' || r.fileType === 'pdf' ? r.fileType : 'excel',
        ruleJson: r.ruleJson,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      } as ParseRule)) : [])
    } catch (err) {
      console.error('加载规则列表失败:', err)
      pushToast('加载规则失败', (err as Error).message, 'error')
    }
  }, [pushToast])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  /* ─────────────── 文件操作 ─────────────── */

  const handleFileSelect = useCallback(
    (f: File | null) => {
      setFile(f)
      // 文件变更时清空之前的解析结果
      setParsedData([])
      setErrors([])
      setProgress(0)
    },
    [],
  )

  /* ─────────────── AI 生成规则 ─────────────── */

  const handleGenerateAI = useCallback(async () => {
    if (!file) {
      pushToast('请先上传文件', '需要先选择一个文件再让 AI 生成规则', 'error')
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

      if (!res.ok) {
        throw new Error(body.error || 'AI 生成规则失败')
      }

      const suggestion: AIRuleSuggestion = body
      const normalized = normalizeIncomingRule(suggestion.rule)
      setCurrentRule(normalized)
      setAiSummary(suggestion)
      pushToast('AI 规则已生成', `置信度 ${Math.round(suggestion.confidence * 100)}%，请确认后再保存`, 'success')
    } catch (err) {
      console.error('AI 规则生成异常:', err)
      pushToast('AI 生成失败', (err as Error).message, 'error')
    } finally {
      setIsGenerating(false)
      setFileBusy(false)
    }
  }, [file, pushToast])

  /* ─────────────── 规则 CRUD ─────────────── */

  const handleRuleChange = useCallback((rule: ParseRule) => {
    setCurrentRule(rule)
  }, [])

  const handleRuleSelect = useCallback((rule: ParseRule) => {
    setCurrentRule(rule)
    setAiSummary(null)
  }, [])

  const handleRuleCreate = useCallback((rule: ParseRule) => {
    setCurrentRule(rule)
    setAiSummary(null)
  }, [])

  const handleRuleSave = useCallback(
    async (rule: ParseRule) => {
      try {
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '保存失败')
        }

        const saved: ParseRule = normalizeIncomingRule(await res.json())
        // 更新列表：已存在则替换，否则追加
        setRules((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = saved
            return next
          }
          return [...prev, saved]
        })
        setCurrentRule(saved)
        pushToast('规则保存成功', saved.name, 'success')
      } catch (err) {
        console.error('保存规则异常:', err)
        pushToast('保存规则失败', (err as Error).message, 'error')
      }
    },
    [pushToast],
  )

  const handleRuleDelete = useCallback(
    async (ruleId: string) => {
      try {
        const res = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || '删除失败')
        }

        setRules((prev) => prev.filter((r) => r.id !== ruleId))
        // 如果删除的是当前选中的规则，清空选中
        setCurrentRule((prev) => (prev?.id === ruleId ? null : prev))
        pushToast('规则已删除', undefined, 'success')
      } catch (err) {
        console.error('删除规则异常:', err)
        pushToast('删除规则失败', (err as Error).message, 'error')
      }
    },
    [pushToast],
  )

  const handleRuleDuplicate = useCallback(
    (rule: ParseRule) => {
      const copy: ParseRule = {
        ...rule,
        id: `draft-${uid()}`,
        name: `${rule.name}（副本）`,
        createdAt: undefined,
        updatedAt: undefined,
      }
      setCurrentRule(copy)
      pushToast('已复制规则', '请修改后保存为新规则', 'info')
    },
    [pushToast],
  )

  /* ─────────────── 解析（测试解析） ─────────────── */

  const handleTest = useCallback(async () => {
    if (!file || !currentRule) {
      pushToast('请先上传文件并选择规则', undefined, 'error')
      return
    }

    setIsTesting(true)
    setFileBusy(true)
    setProgress(0)

    try {
      // 模拟进度动画
      const timer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 8, 90))
      }, 120)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('rule', JSON.stringify(currentRule))

      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      clearInterval(timer)
      setProgress(100)

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || '解析失败')
      }

      const result: ParseResult = body
      setParsedData(result.data)
      setErrors(result.validationErrors ?? [])
      pushToast(
        '解析完成',
        `共 ${result.totalRows} 行，成功 ${result.parsedRows} 行，${result.validationErrors?.length ?? 0} 个校验问题`,
        result.validationErrors?.length ? 'info' : 'success',
      )
    } catch (err) {
      console.error('解析异常:', err)
      pushToast('解析失败', (err as Error).message, 'error')
      setParsedData([])
      setErrors([])
    } finally {
      setIsTesting(false)
      setFileBusy(false)
    }
  }, [file, currentRule, pushToast])

  /* ─────────────── 提交下单 ─────────────── */

  const handleSubmit = useCallback(async () => {
    if (parsedData.length === 0) {
      pushToast('没有可提交的数据', undefined, 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: parsedData, ruleId: currentRule?.id }),
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error || '提交失败')
      }

      pushToast('提交成功', `成功导入 ${body.count} 条运单`, 'success')
      setParsedData([])
      setErrors([])
      // 切换到订单列表并刷新
      setOrderReloadToken((t) => t + 1)
      switchTab('orders')
    } catch (err) {
      console.error('提交异常:', err)
      pushToast('提交失败', (err as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }, [parsedData, currentRule, pushToast, switchTab])

  /* ─────────────── 导出 Excel ─────────────── */

  const handleExport = useCallback(async () => {
    const data = parsedData
    if (data.length === 0) {
      pushToast('没有可导出的数据', undefined, 'error')
      return
    }

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: data }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '导出失败')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `运单导出_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      pushToast('导出成功', `已导出 ${data.length} 条记录`, 'success')
    } catch (err) {
      console.error('导出异常:', err)
      pushToast('导出失败', (err as Error).message, 'error')
    }
  }, [parsedData, pushToast])

  /* ─────────────── 渲染 ─────────────── */

  return (
    <div className="ui-page min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-[var(--primary)]" />
              <div>
                <h1 className="text-xl font-bold text-[var(--primary)]">万能导入 V2</h1>
                <span className="hidden sm:inline text-xs text-gray-400">智能多格式批量下单系统</span>
              </div>
            </div>

            {/* Tab 导航 */}
            <nav className="flex gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchTab(tab.key)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'import' ? (
          <div className="space-y-6">
            {/* 第一行：文件上传 + 规则编辑 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FileUpload
                file={file}
                progress={progress}
                busy={fileBusy}
                onFileSelect={handleFileSelect}
              />
              <RuleEditor
                rules={rules}
                currentRule={currentRule}
                aiSummary={aiSummary}
                isGenerating={isGenerating}
                isTesting={isTesting}
                onChange={handleRuleChange}
                onSelect={handleRuleSelect}
                onCreate={handleRuleCreate}
                onSave={handleRuleSave}
                onDelete={handleRuleDelete}
                onDuplicate={handleRuleDuplicate}
                onGenerateAI={handleGenerateAI}
                onTest={handleTest}
              />
            </div>

            {/* 第二行：数据预览（有解析数据时显示） */}
            {parsedData.length > 0 && (
              <DataPreview
                data={parsedData}
                errors={errors}
                submitting={submitting}
                onDataChange={setParsedData}
                onSubmit={handleSubmit}
                onExport={handleExport}
              />
            )}
          </div>
        ) : (
          /* 订单历史列表 */
          <OrderList onExport={handleExport} />
        )}
      </main>

      {/* 全局 Toast 通知 */}
      <ToastStack toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
