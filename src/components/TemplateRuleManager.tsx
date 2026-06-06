'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, Trash2, Save, Download, Eye, Sparkles, LoaderCircle, FileSpreadsheet, PackageOpen } from 'lucide-react'
import type { ParseRule } from '@/types'
import { ACCEPTED_FILE_TYPES } from '@/lib/file'

interface TemplateRuleManagerProps {
  rules: ParseRule[]
  onRuleSave: (rule: ParseRule) => void
  onRuleDelete: (ruleId: string) => void
  onRuleSelect: (rule: ParseRule) => void
}

export default function TemplateRuleManager({
  rules,
  onRuleSave,
  onRuleDelete,
  onRuleSelect,
}: TemplateRuleManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewRule, setPreviewRule] = useState<ParseRule | null>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const isDataFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                       fileName.endsWith('.docx') || fileName.endsWith('.pdf')

    if (isDataFile) {
      // 数据文件：智能生成规则
      setGenerating(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        // 推断文件类型
        let fileType = 'excel'
        if (fileName.endsWith('.docx')) fileType = 'word'
        if (fileName.endsWith('.pdf')) fileType = 'pdf'
        formData.append('fileType', fileType)

        const res = await fetch('/api/ai/generate-rule', { method: 'POST', body: formData })
        const body = await res.json()
        
        if (!res.ok) throw new Error(body.error || '生成规则失败')

        // 保存生成的规则
        onRuleSave(body.rule)
        alert(`已从 ${file.name} 智能生成规则`)
      } catch (err) {
        console.error('生成规则失败:', err)
        alert(`生成规则失败: ${(err as Error).message}`)
      } finally {
        setGenerating(false)
        e.target.value = ''
      }
    } else {
      // JSON文件：直接导入
      setUploading(true)
      try {
        const text = await file.text()
        let ruleJson

        try {
          ruleJson = JSON.parse(text)
        } catch {
          alert('文件格式错误，请上传有效的JSON规则文件')
          return
        }

        // 构建规则对象
        const rule: ParseRule = {
          id: `template-${Date.now()}`,
          name: file.name.replace(/\.json$/i, ''),
          description: `从文件 ${file.name} 导入的模版规则`,
          fileType: ruleJson.fileType || 'excel',
          ruleJson: ruleJson,
        }

        onRuleSave(rule)
      } catch (err) {
        console.error('上传失败:', err)
        alert('上传失败，请重试')
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    }
  }, [onRuleSave])

  const handleExportRule = useCallback((rule: ParseRule) => {
    const blob = new Blob([JSON.stringify(rule.ruleJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${rule.name}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.docx')) return <FileText className="h-5 w-5" />
    if (lower.endsWith('.pdf')) return <PackageOpen className="h-5 w-5" />
    return <FileSpreadsheet className="h-5 w-5" />
  }

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <div className="ui-card">
        <div className="ui-card-header">
          <div>
            <div className="ui-title">上传模版文件</div>
            <p className="ui-subtitle mt-1">上传数据文件（Excel/PDF/Word）自动智能生成规则，或上传JSON规则文件直接导入</p>
          </div>
        </div>
        <div className="ui-card-body">
          <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--line)] p-8 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition">
            <input
              type="file"
              accept=".json,.xlsx,.xls,.docx,.pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading || generating}
            />
            {generating ? (
              <LoaderCircle className="h-10 w-10 text-[var(--primary)] mb-3 animate-spin" />
            ) : (
              <Upload className="h-10 w-10 text-[var(--text-muted)] mb-3" />
            )}
            <div className="text-sm font-medium text-[var(--text)]">
              {generating ? '智能分析中...' : uploading ? '上传中...' : '点击或拖拽文件到此处'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              支持 .xlsx .xls .docx .pdf（智能生成规则）或 .json（直接导入规则）
            </div>
          </label>
        </div>
      </div>

      {/* 已保存模版列表 */}
      <div className="ui-card">
        <div className="ui-card-header">
          <div>
            <div className="ui-title">已保存模版</div>
            <p className="ui-subtitle mt-1">共 {rules.length} 个模版规则</p>
          </div>
        </div>
        <div className="ui-card-body">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <div className="text-sm">暂无保存的模版规则</div>
              <div className="text-xs mt-1">上传文件自动生成规则，或在文件导入页面创建并保存规则</div>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] p-4 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      {rule.fileType === 'word' ? <FileText className="h-5 w-5" /> :
                       rule.fileType === 'pdf' ? <PackageOpen className="h-5 w-5" /> :
                       <FileSpreadsheet className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--text)] truncate">{rule.name}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {rule.fileType.toUpperCase()} · {rule.description || '无描述'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      className="ui-button ui-button-secondary text-xs px-3 py-1.5"
                      onClick={() => setPreviewRule(previewRule?.id === rule.id ? null : rule)}
                      title="预览规则"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      预览
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button-secondary text-xs px-3 py-1.5"
                      onClick={() => handleExportRule(rule)}
                      title="导出规则"
                    >
                      <Download className="h-3.5 w-3.5" />
                      导出
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button-primary text-xs px-3 py-1.5"
                      onClick={() => onRuleSelect(rule)}
                      title="使用此规则"
                    >
                      使用
                    </button>
                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] p-1"
                      onClick={() => {
                        if (confirm(`确定要删除模版"${rule.name}"吗？`) && rule.id) {
                          onRuleDelete(rule.id)
                        }
                      }}
                      title="删除规则"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 规则预览 */}
      {previewRule && (
        <div className="ui-card">
          <div className="ui-card-header">
            <div>
              <div className="ui-title">规则预览：{previewRule.name}</div>
              <p className="ui-subtitle mt-1">{previewRule.description}</p>
            </div>
            <button
              type="button"
              className="ui-button ui-button-secondary"
              onClick={() => setPreviewRule(null)}
            >
              关闭预览
            </button>
          </div>
          <div className="ui-card-body">
            <pre className="bg-[var(--surface-muted)] rounded-lg p-4 text-xs overflow-auto max-h-[400px]">
              {JSON.stringify(previewRule.ruleJson, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
