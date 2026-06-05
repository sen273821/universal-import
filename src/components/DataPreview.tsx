'use client'

import { useState, useMemo, useCallback } from 'react'
import { Order, ValidationError } from '@/types'
import { Download, Plus, Trash2, AlertCircle } from 'lucide-react'

interface DataPreviewProps {
  data: Order[]
  errors: ValidationError[]
  onDataChange: (data: Order[]) => void
  onSubmit: () => void
  onExport: () => void
}

export default function DataPreview({ data, errors, onDataChange, onSubmit, onExport }: DataPreviewProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const columns = [
    { key: 'externalCode', label: '外部编码', required: false },
    { key: 'storeName', label: '收货门店', required: false },
    { key: 'recipientName', label: '收件人姓名', required: false },
    { key: 'recipientPhone', label: '收件人电话', required: false },
    { key: 'recipientAddress', label: '收件人地址', required: false },
    { key: 'skuCode', label: 'SKU编码', required: true },
    { key: 'skuName', label: 'SKU名称', required: true },
    { key: 'skuQuantity', label: '数量', required: true },
    { key: 'skuSpec', label: '规格型号', required: false },
    { key: 'remark', label: '备注', required: false }
  ]

  const getCellError = useCallback((row: number, field: string) => {
    return errors.find(e => e.row === row && e.field === field)
  }, [errors])

  const handleCellClick = (row: number, field: string, value: any) => {
    setEditingCell({ row, field })
    setEditValue(String(value || ''))
  }

  const handleCellBlur = () => {
    if (editingCell) {
      const newData = [...data]
      const { row, field } = editingCell
      const value = field === 'skuQuantity' ? parseInt(editValue) || 0 : editValue
      newData[row] = { ...newData[row], [field]: value }
      onDataChange(newData)
      setEditingCell(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const addRow = () => {
    onDataChange([...data, {
      skuCode: '',
      skuName: '',
      skuQuantity: 0
    }])
  }

  const deleteRow = (index: number) => {
    onDataChange(data.filter((_, i) => i !== index))
  }

  const hasErrors = errors.length > 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">数据预览</h3>
          <p className="text-sm text-gray-500">
            共 {data.length} 条数据
            {hasErrors && (
              <span className="text-red-500 ml-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {errors.length} 个错误
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addRow}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            添加行
          </button>
          <button
            onClick={onExport}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
          <button
            onClick={onSubmit}
            disabled={hasErrors}
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-1 ${
              hasErrors
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#0fc6c2] text-white hover:bg-[#0db5b1]'
            }`}
          >
            提交下单
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                  {col.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">
                  {rowIndex + 1}
                </td>
                {columns.map(col => {
                  const error = getCellError(rowIndex + 1, col.key)
                  const isEditing = editingCell?.row === rowIndex && editingCell?.field === col.key
                  const value = row[col.key as keyof Order]

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${
                        error ? 'bg-red-50' : ''
                      }`}
                    >
                      {isEditing ? (
                        <input
                          type={col.key === 'skuQuantity' ? 'number' : 'text'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          className="w-full px-2 py-1 border border-[#0fc6c2] rounded focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(rowIndex, col.key, value)}
                          className={`cursor-pointer min-h-[28px] px-2 py-1 rounded ${
                            error
                              ? 'text-red-600 border border-red-300'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {value ? String(value) : <span className="text-gray-400">点击编辑</span>}
                          {error && (
                            <div className="text-xs text-red-500 mt-1">
                              {error.message}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteRow(rowIndex)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
