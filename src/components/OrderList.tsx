'use client'

import { useEffect, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Package, Search } from 'lucide-react'
import type { OrderRecord, OrderSearchParams, PaginatedResult } from '@/types'

/* ──────────────────────────────────────────────
 * Props
 * ────────────────────────────────────────────── */
interface OrderListProps {
  onExport: () => void
}

/* ──────────────────────────────────────────────
 * OrderList – 已导入运单列表
 * 支持按外部编码、收件人、日期范围搜索，分页浏览
 * ────────────────────────────────────────────── */
export default function OrderList({ onExport }: OrderListProps) {
  // 搜索参数
  const [searchParams, setSearchParams] = useState<OrderSearchParams>({
    page: 1,
    pageSize: 20,
    externalCode: '',
    recipientName: '',
    startDate: '',
    endDate: '',
  })

  // 运单数据 & 分页信息
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // 加载状态
  const [loading, setLoading] = useState(false)

  /* ---------- 拉取运单列表 ---------- */
  const loadOrders = async (params: OrderSearchParams) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      query.set('page', String(params.page))
      query.set('pageSize', String(params.pageSize))
      if (params.externalCode) query.set('externalCode', params.externalCode)
      if (params.recipientName) query.set('recipientName', params.recipientName)
      if (params.startDate) query.set('startDate', params.startDate)
      if (params.endDate) query.set('endDate', params.endDate)

      const res = await fetch(`/api/orders?${query.toString()}`)
      const payload: PaginatedResult<OrderRecord> & { error?: string } = await res.json()

      if (!res.ok) {
        throw new Error(payload.error || '加载运单列表失败')
      }

      setOrders(payload.data)
      setTotal(payload.total)
      setTotalPages(payload.totalPages)
    } catch (err) {
      console.error('加载运单失败:', err)
      setOrders([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // 翻页 / 初始加载
  useEffect(() => {
    void loadOrders(searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.page, searchParams.pageSize])

  /* ---------- 搜索按钮 ---------- */
  const handleSearch = () => {
    const next = { ...searchParams, page: 1 }
    setSearchParams(next)
    void loadOrders(next)
  }

  /* ---------- 翻页 ---------- */
  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages))
    setSearchParams((prev) => ({ ...prev, page: clamped }))
  }

  /* ---------- 生成页码按钮数组 ---------- */
  const getPageNumbers = (): number[] => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, searchParams.page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  /* ---------- 渲染 ---------- */
  return (
    <div className="ui-card" id="order-history">
      {/* 卡片头部 */}
      <div className="ui-card-header">
        <div>
          <div className="ui-title flex items-center gap-2">
            <Package className="h-5 w-5" />
            已导入运单
          </div>
          <p className="ui-subtitle mt-1">支持按外部编码、收件人姓名、提交时间范围筛选。</p>
        </div>
        <button
          type="button"
          className="ui-button ui-button-secondary"
          onClick={onExport}
        >
          导出当前结果
        </button>
      </div>

      {/* 卡片内容 */}
      <div className="ui-card-body space-y-4">
        {/* ── 搜索栏 ── */}
        <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_180px_180px_120px]">
          {/* 外部编码 */}
          <input
            className="ui-input"
            placeholder="外部编码"
            value={searchParams.externalCode ?? ''}
            onChange={(e) =>
              setSearchParams((prev) => ({ ...prev, externalCode: e.target.value }))
            }
          />
          {/* 收件人姓名 */}
          <input
            className="ui-input"
            placeholder="收件人姓名"
            value={searchParams.recipientName ?? ''}
            onChange={(e) =>
              setSearchParams((prev) => ({ ...prev, recipientName: e.target.value }))
            }
          />
          {/* 开始日期 */}
          <div className="relative">
            <input
              className="ui-input w-full pr-8"
              type="date"
              value={searchParams.startDate ?? ''}
              onChange={(e) =>
                setSearchParams((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
            <Calendar className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          {/* 结束日期 */}
          <div className="relative">
            <input
              className="ui-input w-full pr-8"
              type="date"
              value={searchParams.endDate ?? ''}
              onChange={(e) =>
                setSearchParams((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
            <Calendar className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          {/* 搜索按钮 */}
          <button
            type="button"
            className="ui-button ui-button-primary"
            onClick={handleSearch}
            disabled={loading}
          >
            <Search className="h-4 w-4" />
            搜索
          </button>
        </div>

        {/* ── 表格 ── */}
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>外部编码</th>
                <th>收货门店</th>
                <th>收件人</th>
                <th>电话</th>
                <th>地址</th>
                <th>SKU编码</th>
                <th>SKU名称</th>
                <th>规格</th>
                <th>数量</th>
                <th>备注</th>
                <th>提交时间</th>
              </tr>
            </thead>
            <tbody>
              {/* 加载中 */}
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      正在加载运单列表...
                    </div>
                  </td>
                </tr>
              )}

              {/* 空状态 */}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-slate-300" />
                      <span>暂无导入数据</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* 数据行 */}
              {!loading &&
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.externalCode || '-'}</td>
                    <td>{order.storeName || '-'}</td>
                    <td>{order.recipientName || '-'}</td>
                    <td>{order.recipientPhone || '-'}</td>
                    <td>{order.recipientAddress || '-'}</td>
                    <td>{order.skuCode}</td>
                    <td>{order.skuName}</td>
                    <td>{order.skuSpec || '-'}</td>
                    <td>{order.skuQuantity}</td>
                    <td>{order.remark || '-'}</td>
                    <td>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString('zh-CN')
                        : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ── 分页控件 ── */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            {/* 统计信息 */}
            <div>
              共 <span className="font-medium text-slate-700">{total}</span> 条，第{' '}
              <span className="font-medium text-slate-700">{searchParams.page}</span> /{' '}
              <span className="font-medium text-slate-700">{totalPages}</span> 页
            </div>

            {/* 翻页按钮 */}
            <div className="flex items-center gap-1">
              {/* 上一页 */}
              <button
                type="button"
                className="ui-button ui-button-secondary"
                disabled={searchParams.page <= 1}
                onClick={() => goToPage(searchParams.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* 页码 */}
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`ui-button ${
                    pageNum === searchParams.page
                      ? 'ui-button-primary'
                      : 'ui-button-secondary'
                  }`}
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              {/* 下一页 */}
              <button
                type="button"
                className="ui-button ui-button-secondary"
                disabled={searchParams.page >= totalPages}
                onClick={() => goToPage(searchParams.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
