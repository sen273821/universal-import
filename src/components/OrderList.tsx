'use client'

import { useState, useEffect } from 'react'
import { Order, OrderSearchParams, PaginatedResult } from '@/types'
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'

interface OrderListProps {
  onExport?: () => void
}

export default function OrderList({ onExport }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState<OrderSearchParams>({
    page: 1,
    pageSize: 20,
    externalCode: '',
    recipientName: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  })

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(searchParams.page))
      params.append('pageSize', String(searchParams.pageSize))
      if (searchParams.externalCode) params.append('externalCode', searchParams.externalCode)
      if (searchParams.recipientName) params.append('recipientName', searchParams.recipientName)
      if (searchParams.startDate) params.append('startDate', searchParams.startDate)
      if (searchParams.endDate) params.append('endDate', searchParams.endDate)

      const response = await fetch(`/api/orders?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setOrders(data.data)
        setPagination({
          total: data.total,
          totalPages: data.totalPages
        })
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [searchParams.page, searchParams.pageSize])

  const handleSearch = () => {
    setSearchParams(prev => ({ ...prev, page: 1 }))
    fetchOrders()
  }

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">已导入运单</h3>
          <button
            onClick={onExport}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="外部编码"
            value={searchParams.externalCode}
            onChange={(e) => setSearchParams(prev => ({ ...prev, externalCode: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
          />
          <input
            type="text"
            placeholder="收件人姓名"
            value={searchParams.recipientName}
            onChange={(e) => setSearchParams(prev => ({ ...prev, recipientName: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
          />
          <input
            type="date"
            value={searchParams.startDate}
            onChange={(e) => setSearchParams(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
          />
          <input
            type="date"
            value={searchParams.endDate}
            onChange={(e) => setSearchParams(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0fc6c2]/20 focus:border-[#0fc6c2]"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#0fc6c2] text-white rounded-lg hover:bg-[#0db5b1] flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">外部编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">收货门店</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">收件人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">提交时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              orders.map((order, index) => (
                <tr key={order.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{order.externalCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.storeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.recipientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.recipientPhone}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.skuCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.skuName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.skuQuantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {pagination.total} 条，第 {searchParams.page} / {pagination.totalPages} 页
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(searchParams.page - 1)}
              disabled={searchParams.page <= 1}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(searchParams.page + 1)}
              disabled={searchParams.page >= pagination.totalPages}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
