'use client'

import { useState, useEffect } from 'react'
import { ParseRule, FieldMapping } from '@/types'
import { Save, Trash2, Copy, Wand2 } from 'lucide-react'

interface RuleEditorProps {
  rule: ParseRule | null
  onSave: (rule: ParseRule) => void
  onDelete: (ruleId: string) => void
  onGenerateAI: () => void
  isGenerating?: boolean
}

export default function RuleEditor({ rule, onSave, onDelete, onGenerateAI, isGenerating }: RuleEditorProps) {
  const [editedRule, setEditedRule] = useState<ParseRule | null>(null)
  const [activeTab, setActiveTab] = useState<'structure' | 'mappings' | 'transformations'>('structure')

  useEffect(() => {
    setEditedRule(rule)
  }, [rule])

  if (!editedRule) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">暂无规则，请创建或选择一个规则</p>
          <button
            onClick={onGenerateAI}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#0fc6c2] text-white rounded-lg hover:bg-[#0db5b1] disabled:bg-gray-300 flex items-center gap-2 mx-auto"
          >
            <Wand2 className="w-4 h-4" />
            {isGenerating ? 'AI 生成中...' : 'AI 自动生成规则'}
          </button>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    if (editedRule) {
      onSave(editedRule)
    }
  }

  const handleDelete = () => {
    if (editedRule.id && confirm('确定要删除此规则吗？')) {
      onDelete(editedRule.id)
    }
  }

  const updateStructure = (key: string, value: any) => {
    setEditedRule(prev => prev ? {
      ...prev,
      structure: { ...prev.structure, [key]: value }
    } : null)
  }

  const addFieldMapping = () => {
    setEditedRule(prev => prev ? {
      ...prev,
      fieldMappings: [
        ...prev.fieldMappings,
        {
          source: '',
          target: '',
          type: 'column',
          columnIndex: 0
        }
      ]
    } : null)
  }

  const updateFieldMapping = (index: number, key: string, value: any) => {
    setEditedRule(prev => prev ? {
      ...prev,
      fieldMappings: prev.fieldMappings.map((m, i) =>
        i === index ? { ...m, [key]: value } : m
      )
    } : null)
  }

  const removeFieldMapping = (index: number) => {
    setEditedRule(prev => prev ? {
      ...prev,
      fieldMappings: prev.fieldMappings.filter((_, i) => i !== index)
    } : null)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <input
              type="text"
              value={editedRule.name}
              onChange={(e) => setEditedRule(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="text-lg font-semibold text-gray-900 border-none focus:outline-none focus:ring-0"
              placeholder="规则名称"
            />
            <p className="text-sm text-gray-500 mt-1">
              文件类型: {editedRule.fileType.toUpperCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onGenerateAI}
              disabled={isGenerating}
              className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
            >
              <Wand2 className="w-4 h-4" />
              {isGenerating ? '生成中...' : 'AI 优化'}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-2 text-sm bg-[#0fc6c2] text-white rounded-lg hover:bg-[#0db5b1] flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
            {editedRule.id && (
              <button
                onClick={handleDelete}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {(['structure', 'mappings', 'transformations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-lg ${
                activeTab === tab
                  ? 'bg-[#0fc6c2] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab === 'structure' ? '文件结构' : tab === 'mappings' ? '字段映射' : '转换规则'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'structure' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                头部行数（跳过）
              </label>
              <input
                type="number"
                value={editedRule.structure.headerRows}
                onChange={(e) => updateStructure('headerRows', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据起始行
              </label>
              <input
                type="number"
                value={editedRule.structure.dataStartRow}
                onChange={(e) => updateStructure('dataStartRow', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                尾部行数（跳过）
              </label>
              <input
                type="number"
                value={editedRule.structure.footerRows || 0}
                onChange={(e) => updateStructure('footerRows', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
              />
            </div>
          </div>
        )}

        {activeTab === 'mappings' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">字段映射</h4>
              <button
                onClick={addFieldMapping}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                + 添加映射
              </button>
            </div>
            <div className="space-y-3">
              {editedRule.fieldMappings.map((mapping, index) => (
                <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={mapping.source}
                    onChange={(e) => updateFieldMapping(index, 'source', e.target.value)}
                    placeholder="来源列名"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20"
                  />
                  <span className="text-gray-400">→</span>
                  <select
                    value={mapping.target}
                    onChange={(e) => updateFieldMapping(index, 'target', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20"
                  >
                    <option value="">选择目标字段</option>
                    <option value="externalCode">外部编码</option>
                    <option value="storeName">收货门店</option>
                    <option value="recipientName">收件人姓名</option>
                    <option value="recipientPhone">收件人电话</option>
                    <option value="recipientAddress">收件人地址</option>
                    <option value="skuCode">SKU编码</option>
                    <option value="skuName">SKU名称</option>
                    <option value="skuQuantity">数量</option>
                    <option value="skuSpec">规格型号</option>
                    <option value="remark">备注</option>
                  </select>
                  <button
                    onClick={() => removeFieldMapping(index)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transformations' && (
          <div className="text-center text-gray-500 py-8">
            <p>转换规则配置（待实现）</p>
          </div>
        )}
      </div>
    </div>
  )
}
