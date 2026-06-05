'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, Trash2, Save, Download, Eye } from 'lucide-react'
import type { ParseRule } from '@/types'

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
  const [previewRule, setPreviewRule] = useState<ParseRule | null>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
      // 清空input
      e.target.value = ''
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

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <div className="ui-card">
        <div className="ui-card-header">
          <div>
            <div className="ui-title">上传自定义模版</div>
            <p className="ui-subtitle mt-1">上传JSON格式的规则文件，保存为模版供文件导入时使用</p>
          </div>
        </div>
        <div className="ui-card-body">
          <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--line)] p-8 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Upload className="h-10 w-10 text-[var(--text-muted)] mb-3" />
            <div className="text-sm font-medium text-[var(--text)]">
              {uploading ? '上传中...' : '点击或拖拽JSON规则文件到此处'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">仅支持 .json 格式</div>
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
              <div className="text-xs mt-1">上传JSON文件或在文件导入页面创建并保存规则</div>
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
                      <FileText className="h-5 w-5" />
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
