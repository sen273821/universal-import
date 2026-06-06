'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertTriangle, CheckSquare, Download, MinusSquare, Plus, Square, Trash2 } from 'lucide-react'
import type { OrderField, OrderRecord, ValidationError } from '@/types'
import { ORDER_FIELD_LABELS } from '@/lib/rules'

// ---------- 类型定义 ----------

interface DataPreviewProps {
  data: OrderRecord[]
  errors: ValidationError[]
  onDataChange: (data: OrderRecord[]) => void
  onSubmit: () => void
  onExport: () => void
  submitting?: boolean
}

/** 列配置：key 对应 OrderRecord 字段，width 为固定列宽 */
const COLUMNS: Array<{ key: OrderField; width: string; required?: boolean }> = [
  { key: 'externalCode', width: '180px' },
  { key: 'storeName', width: '180px' },
  { key: 'recipientName', width: '140px' },
  { key: 'recipientPhone', width: '160px' },
  { key: 'recipientAddress', width: '260px' },
  { key: 'skuCode', width: '180px', required: true },
  { key: 'skuName', width: '200px', required: true },
  { key: 'skuQuantity', width: '120px', required: true },
  { key: 'skuSpec', width: '160px' },
  { key: 'remark', width: '200px' },
]

/** 新增空行模板 */
const EMPTY_ROW: OrderRecord = {
  externalCode: '',
  storeName: '',
  recipientName: '',
  recipientPhone: '',
  recipientAddress: '',
  skuCode: '',
  skuName: '',
  skuQuantity: 0,
  skuSpec: '',
  remark: '',
}

/** 固定行高 (px)，与虚拟滚动 estimateSize 保持一致 */
const ROW_HEIGHT = 62
const HEADER_HEIGHT = 54
/** 序号列宽度 */
const INDEX_COL_WIDTH = 72
/** 选择列宽度 */
const SELECT_COL_WIDTH = 48
/** 操作列宽度 */
const ACTION_COL_WIDTH = 48

// ---------- 主组件 ----------

export default function DataPreview({
  data,
  errors,
  onDataChange,
  onSubmit,
  onExport,
  submitting,
}: DataPreviewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // 当前正在编辑的单元格
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: keyof OrderRecord } | null>(null)
  const [editValue, setEditValue] = useState('')

  // 被选中的行索引集合
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set())

  // 当前悬浮的错误提示（用于 tooltip）
  const [hoveredError, setHoveredError] = useState<{ rowIndex: number; field: string } | null>(null)

  // 横向滚动阴影指示
  const [showRightShadow, setShowRightShadow] = useState(false)

  // 监听横向滚动，显示右侧阴影
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      setShowRightShadow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    }
    check()
    el.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [data])

  // ===================== 派生数据 =====================

  /** 外部编码重复检测 */
  const duplicateCodes = useMemo(() => {
    const counter = new Map<string, number>()
    for (const row of data) {
      const code = (row.externalCode ?? '').trim()
      if (!code) continue
      counter.set(code, (counter.get(code) ?? 0) + 1)
    }
    return new Set(
      Array.from(counter.entries())
        .filter(([, count]) => count > 1)
        .map(([code]) => code),
    )
  }, [data])

  /** 构建行 → 字段 → 错误 的快速索引 */
  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationError>()
    for (const err of errors) {
      // ValidationError.row 是 1-based
      map.set(`${err.row - 1}__${err.field}`, err)
    }
    return map
  }, [errors])

  /** 全部列总宽度（用于横向滚动） */
  const totalGridWidth = useMemo(() => {
    const colWidth = COLUMNS.reduce((s, c) => s + parseInt(c.width, 10), 0)
    return INDEX_COL_WIDTH + SELECT_COL_WIDTH + colWidth + ACTION_COL_WIDTH
  }, [])

  /** grid-template-columns 值 */
  const gridCols = useMemo(
    () =>
      `${INDEX_COL_WIDTH}px ${SELECT_COL_WIDTH}px ${COLUMNS.map((c) => c.width).join(' ')} ${ACTION_COL_WIDTH}px`,
    [],
  )

  // ===================== 虚拟滚动 =====================

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  // ===================== 回调函数 =====================

  /** 获取单元格校验错误 */
  const getCellError = useCallback(
    (rowIndex: number, field: string) => errorMap.get(`${rowIndex}__${field}`),
    [errorMap],
  )

  /** 提交当前编辑 */
  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const { rowIndex, field } = editingCell
    const nextRows = [...data]
    const targetRow = { ...nextRows[rowIndex] }
    // skuQuantity 为数字字段
    const value = field === 'skuQuantity' ? parseInt(editValue, 10) || 0 : editValue
    ;(targetRow as Record<string, unknown>)[field] = value
    nextRows[rowIndex] = targetRow
    onDataChange(nextRows)
    setEditingCell(null)
  }, [editingCell, editValue, data, onDataChange])

  /** 取消编辑 */
  const cancelEdit = useCallback(() => {
    setEditingCell(null)
  }, [])

  /** 开始编辑 */
  const startEdit = useCallback(
    (rowIndex: number, field: keyof OrderRecord, currentValue: unknown) => {
      setEditingCell({ rowIndex, field })
      setEditValue(String(currentValue ?? ''))
    },
    [],
  )

  /** 新增空行 */
  const handleAddRow = useCallback(() => {
    onDataChange([...data, { ...EMPTY_ROW }])
  }, [data, onDataChange])

  /** 删除单行 */
  const handleDeleteRow = useCallback(
    (index: number) => {
      onDataChange(data.filter((_, i) => i !== index))
      // 同步清除选中状态
      setSelectedRows((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    },
    [data, onDataChange],
  )

  /** 切换某行选中状态 */
  const toggleRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  /** 全选 / 取消全选 */
  const toggleAll = useCallback(() => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)))
    }
  }, [data, selectedRows])

  /** 删除所有选中行 */
  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.size === 0) return
    onDataChange(data.filter((_, i) => !selectedRows.has(i)))
    setSelectedRows(new Set())
  }, [data, selectedRows, onDataChange])

  // ===================== 渲染 =====================

  return (
    <div className="ui-card">
      {/* ====== 顶部工具栏 ====== */}
      <div className="ui-card-header">
        <div>
          <div className="ui-title">数据预览</div>
          <p className="ui-subtitle mt-1">
            共 {data.length} 条记录，{errors.length} 个校验问题
            {duplicateCodes.size > 0 ? `，${duplicateCodes.size} 个重复编码` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-button ui-button-secondary"
            onClick={handleAddRow}
            title="在末尾追加一行空白记录"
          >
            <Plus className="h-4 w-4" />
            新增空行
          </button>

          <button
            type="button"
            className="ui-button ui-button-danger"
            disabled={selectedRows.size === 0}
            onClick={handleDeleteSelected}
            title="删除勾选的行"
          >
            <Trash2 className="h-4 w-4" />
            删除选中行{selectedRows.size > 0 ? ` (${selectedRows.size})` : ''}
          </button>

          <button
            type="button"
            className="ui-button ui-button-secondary"
            disabled={data.length === 0}
            onClick={onExport}
          >
            <Download className="h-4 w-4" />
            导出Excel
          </button>

          <button
            type="button"
            className="ui-button ui-button-primary"
            disabled={data.length === 0 || errors.length > 0 || !!submitting}
            onClick={onSubmit}
          >
            {submitting ? '提交中…' : '提交下单'}
          </button>
        </div>
      </div>

      {/* ====== 主体：表格 + 错误面板 ====== */}
      <div className="ui-card-body grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- 左侧表格 ---- */}
        <div className="border-b border-[rgba(216,235,238,0.9)] xl:border-b-0 xl:border-r">
          {/* 空状态 */}
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">暂无数据，请上传文件或手动新增行</span>
            </div>
          ) : (
            <div className={`ui-table-wrap ${showRightShadow ? 'show-right-shadow' : ''}`} ref={scrollRef}>
              <div
                style={{
                  width: totalGridWidth,
                  position: 'relative',
                  height: `${rowVirtualizer.getTotalSize() + HEADER_HEIGHT}px`,
                }}
              >
                {/* ---- 表头 ---- */}
                <div
                  className="sticky top-0 z-20 grid border-b bg-[rgba(238,250,250,0.98)] text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div className="flex items-center justify-center px-2 py-3">序号</div>
                  <div className="flex items-center justify-center px-2 py-3">
                    {/* 全选复选框 */}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-cyan-600 transition"
                      onClick={toggleAll}
                      title={selectedRows.size === data.length ? '取消全选' : '全选'}
                    >
                      {selectedRows.size === data.length && data.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : selectedRows.size > 0 ? (
                        <MinusSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {COLUMNS.map((col) => (
                    <div key={col.key} className="flex items-center px-3 py-3">
                      {ORDER_FIELD_LABELS[col.key] ?? col.key}
                      {col.required && <span className="ml-1 text-red-500">*</span>}
                    </div>
                  ))}
                  <div className="flex items-center justify-center px-2 py-3">删</div>
                </div>

                {/* ---- 虚拟行 ---- */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const rowIndex = virtualRow.index
                  const row = data[rowIndex]
                  const isSelected = selectedRows.has(rowIndex)
                  const hasDupCode = row.externalCode ? duplicateCodes.has(row.externalCode.trim()) : false

                  return (
                    <div
                      key={virtualRow.key}
                      className={`absolute left-0 grid border-b text-sm ${
                        isSelected
                          ? 'bg-cyan-50/80'
                          : rowIndex % 2 === 0
                            ? 'bg-white/80'
                            : 'bg-slate-50/75'
                      }`}
                      style={{
                        gridTemplateColumns: gridCols,
                        top: HEADER_HEIGHT + virtualRow.start,
                        height: virtualRow.size,
                        width: totalGridWidth,
                      }}
                    >
                      {/* 序号 */}
                      <div className="flex items-center justify-center px-2 text-slate-500">{rowIndex + 1}</div>

                      {/* 选择框 */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          className={`transition ${isSelected ? 'text-cyan-600' : 'text-slate-300 hover:text-slate-500'}`}
                          onClick={() => toggleRow(rowIndex)}
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* 数据列 */}
                      {COLUMNS.map((col) => {
                        const isEditing =
                          editingCell?.rowIndex === rowIndex && editingCell.field === col.key
                        const cellError = getCellError(rowIndex, col.key)
                        const hasError = !!cellError || (col.key === 'externalCode' && hasDupCode)
                        const cellValue = row[col.key]

                        // 错误单元格样式
                        const cellClass = hasError
                          ? 'border-red-200 bg-red-50/85 text-red-700'
                          : 'border-transparent hover:bg-cyan-50/60'

                        return (
                          <div
                            key={`${rowIndex}-${String(col.key)}`}
                            className="relative px-2 py-2"
                            onMouseEnter={() => {
                              if (cellError) setHoveredError({ rowIndex, field: col.key })
                            }}
                            onMouseLeave={() => setHoveredError(null)}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                className="ui-input h-[42px] w-full rounded-xl px-3 py-2 text-sm"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit()
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                className={`flex min-h-[42px] w-full items-start rounded-2xl border px-3 py-2 text-left transition ${cellClass}`}
                                onClick={() => startEdit(rowIndex, col.key, cellValue)}
                              >
                                <span className="line-clamp-2 break-all">
                                  {String(cellValue ?? '') || (
                                    <span className="text-slate-300">点击编辑</span>
                                  )}
                                </span>
                              </button>
                            )}

                            {/* 错误 tooltip */}
                            {hoveredError?.rowIndex === rowIndex &&
                              hoveredError?.field === col.key &&
                              cellError && (
                                <div className="absolute bottom-full left-0 z-30 mb-1 w-56 rounded-xl border border-red-200 bg-white p-2 text-xs text-red-600 shadow-lg">
                                  {cellError.message}
                                  {cellError.value !== undefined && (
                                    <span className="ml-1 text-slate-400">(值: {String(cellError.value)})</span>
                                  )}
                                </div>
                              )}
                          </div>
                        )
                      })}

                      {/* 操作列 - 删除按钮 */}
                      <div className="flex items-center justify-center px-2">
                        <button
                          type="button"
                          className="ui-button ui-button-danger h-[36px] w-[36px] p-0"
                          onClick={() => handleDeleteRow(rowIndex)}
                          title="删除此行"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ---- 右侧错误面板 ---- */}
        <aside className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            校验错误面板
          </div>

          <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
            {errors.length === 0 ? (
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-700">
                ✅ 当前没有校验错误，可以直接提交或导出。
              </div>
            ) : (
              errors.map((error, index) => (
                <div
                  key={`${error.row}-${error.field}-${index}`}
                  className="rounded-[24px] border border-red-100 bg-red-50/86 px-4 py-3 text-sm text-red-700"
                >
                  <div className="font-semibold">
                    第 {error.row} 行 · {ORDER_FIELD_LABELS[error.field as keyof typeof ORDER_FIELD_LABELS] ?? error.field}
                  </div>
                  <div className="mt-1">{error.message}</div>
                  {error.value !== undefined && (
                    <div className="mt-1 text-xs text-slate-400">当前值: {String(error.value)}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 重复外部编码警告 */}
          {duplicateCodes.size > 0 && (
            <div className="mt-5 rounded-[28px] border border-amber-100 bg-amber-50/80 px-4 py-4 text-sm text-amber-700">
              <div className="font-semibold">⚠️ 重复外部编码</div>
              <div className="mt-2 break-all">{Array.from(duplicateCodes).join('、')}</div>
            </div>
          )}
        </aside>
      </div>

      {/* ====== 底部汇总栏 ====== */}
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            总行数: <strong className="text-slate-700">{data.length}</strong>
          </span>
          <span>
            校验错误: <strong className={errors.length > 0 ? 'text-red-600' : 'text-emerald-600'}>{errors.length}</strong>
          </span>
          {duplicateCodes.size > 0 && (
            <span>
              重复编码: <strong className="text-amber-600">{duplicateCodes.size}</strong>
            </span>
          )}
        </div>
        <div>
          {selectedRows.size > 0 && (
            <span className="text-cyan-600">已选中 {selectedRows.size} 行</span>
          )}
        </div>
      </div>
    </div>
  )
}
