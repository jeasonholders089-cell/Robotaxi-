import React from 'react'
import { Star, ChevronUp, ChevronDown, Eye } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import type { Feedback, FeedbackStatus } from '@/types'

const statusConfig: Record<FeedbackStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待处理', color: '#FAAD14', bgColor: '#FFFBE6' },
  processing: { label: '处理中', color: '#1890FF', bgColor: '#E6F7FF' },
  resolved: { label: '已解决', color: '#52C41A', bgColor: '#F6FFED' },
  closed: { label: '已关闭', color: '#999999', bgColor: '#F5F5F5' },
}

const typeColors: Record<string, string> = {
  '行驶体验': '#FF7A45',
  '车内环境': '#36CBCB',
  '接驾体验': '#1890FF',
  '路线规划': '#975FE4',
  '安全感受': '#F5222D',
  '服务态度': '#FAAD14',
  '其他': '#999999',
}

interface FeedbackTableProps {
  data: Feedback[]
  loading: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  sortBy?: 'time' | 'rating'
  sortOrder?: 'asc' | 'desc'
  selectedIds: string[]
  onPageChange: (page: number) => void
  onSort: (sortBy: 'time' | 'rating', order: 'asc' | 'desc') => void
  onRowClick: (feedback: Feedback) => void
  onSelectionChange: (ids: string[]) => void
  onPageSizeChange: (size: number) => void
}

export function FeedbackTable({
  data,
  loading,
  pagination,
  sortBy,
  sortOrder,
  selectedIds,
  onPageChange,
  onSort,
  onRowClick,
  onSelectionChange,
  onPageSizeChange,
}: FeedbackTableProps) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize)
  const startIndex = (pagination.page - 1) * pagination.pageSize + 1
  const endIndex = Math.min(pagination.page * pagination.pageSize, pagination.total)

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map((item) => item.id))
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={clsx(
              'w-4 h-4',
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            )}
          />
        ))}
      </div>
    )
  }

  const renderPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (pagination.page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (pagination.page >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = pagination.page - 1; i <= pagination.page + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 rounded mb-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-left">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">反馈ID</th>
              <th
                className="py-3 px-4 text-left text-sm font-medium text-gray-600 cursor-pointer"
                onClick={() => onSort('rating', sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                <div className="flex items-center gap-1">
                  评分
                  {sortBy === 'rating' && (
                    sortOrder === 'desc' ? (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-primary" />
                    )
                  )}
                </div>
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">反馈类型</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">反馈摘要</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">路线</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">城市</th>
              <th
                className="py-3 px-4 text-left text-sm font-medium text-gray-600 cursor-pointer"
                onClick={() => onSort('time', sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                <div className="flex items-center gap-1">
                  行程时间
                  {sortBy === 'time' && (
                    sortOrder === 'desc' ? (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-primary" />
                    )
                  )}
                </div>
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const status = statusConfig[item.status]
              return (
                <tr
                  key={item.id}
                  className={clsx(
                    'border-b border-gray-50 hover:bg-primary-light transition-colors cursor-pointer',
                    selectedIds.includes(item.id) && 'bg-primary-light'
                  )}
                  onClick={() => onRowClick(item)}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelectOne(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-primary hover:underline">{item.feedback_no}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {renderStars(item.rating)}
                      <span className="text-sm text-gray-600">{item.rating}星</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {item.feedback_type.slice(0, 2).map((type) => (
                        <span
                          key={type}
                          className="badge"
                          style={{
                            backgroundColor: `${typeColors[type]}20`,
                            color: typeColors[type],
                          }}
                        >
                          {type}
                        </span>
                      ))}
                      {item.feedback_type.length > 2 && (
                        <span className="badge bg-gray-100 text-gray-500">
                          +{item.feedback_type.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-600 truncate max-w-[200px]">
                      {item.feedback_text.slice(0, 50)}
                      {item.feedback_text.length > 50 && '...'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-600 truncate max-w-[150px]">{item.route}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge badge-info">{item.city}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-600">
                      {dayjs(item.trip_time).format('YYYY-MM-DD HH:mm')}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: status.bgColor,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onRowClick(item)}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"
                    >
                      <Eye className="w-4 h-4" />
                      查看
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">暂无反馈数据</p>
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              显示 {startIndex}-{endIndex} 条，共 {pagination.total} 条
            </span>
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="select w-24"
            >
              <option value={10}>10 条</option>
              <option value={20}>20 条</option>
              <option value={50}>50 条</option>
              <option value={100}>100 条</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>

            {renderPageNumbers().map((page, index) =>
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={clsx(
                    'px-3 py-1.5 text-sm border rounded-md',
                    pagination.page === page
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
