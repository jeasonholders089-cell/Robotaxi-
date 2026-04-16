import React, { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, CheckCircle, MoreVertical } from 'lucide-react'
import { FilterBar, FeedbackTable, FeedbackDetail } from '@/components'
import { useFeedbacks, useFeedbackDetail, useUpdateFeedback, useBatchUpdateStatus } from '@/hooks'
import { useFilterStore } from '@/stores'
import type { Feedback } from '@/types'

export function FeedbackList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<'time' | 'rating'>('time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { filters } = useFilterStore()

  const { data, isLoading, refetch } = useFeedbacks({
    page,
    pageSize,
    sortBy,
    sortOrder,
    city: filters.city,
    route: filters.route,
    ratingMin: filters.ratingMin,
    ratingMax: filters.ratingMax,
    startDate: filters.startDate,
    endDate: filters.endDate,
    feedbackType: filters.feedbackType,
    status: filters.status,
    keyword: filters.keyword,
  })

  const { data: detailData, isLoading: detailLoading } = useFeedbackDetail(
    selectedFeedback?.id || null
  )

  const updateFeedback = useUpdateFeedback()
  const batchUpdateStatus = useBatchUpdateStatus()

  const handleSort = useCallback((by: 'time' | 'rating', order: 'asc' | 'desc') => {
    setSortBy(by)
    setSortOrder(order)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  const handleRowClick = useCallback((feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setDetailOpen(true)
  }, [])

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false)
    setSelectedFeedback(null)
  }, [])

  const handleUpdateStatus = useCallback(
    async (id: string, status: string) => {
      await updateFeedback.mutateAsync({ id, data: { status } })
    },
    [updateFeedback]
  )

  const handleAddNote = useCallback(
    async (id: string, note: string) => {
      await updateFeedback.mutateAsync({
        id,
        data: { handler_notes: note },
      })
    },
    [updateFeedback]
  )

  const handleBatchUpdateStatus = useCallback(
    async (status: string) => {
      if (selectedIds.length === 0) return
      await batchUpdateStatus.mutateAsync({ ids: selectedIds, status })
      setSelectedIds([])
      refetch()
    },
    [selectedIds, batchUpdateStatus, refetch]
  )

  const handleExport = useCallback(() => {
    // Export logic would go here
    console.log('Exporting', selectedIds.length > 0 ? selectedIds : 'all')
  }, [selectedIds])

  const feedbackList = data?.list ?? []
  const pagination = {
    page,
    pageSize,
    total: data?.total ?? 0,
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>共 {data?.total ?? 0} 条反馈</span>
          <span>|</span>
          <span>已选 {selectedIds.length} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBatchUpdateStatus('resolved')}
            disabled={selectedIds.length === 0}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>批量标记已解决</span>
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>导出</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {/* Feedback Table */}
      <FeedbackTable
        data={feedbackList}
        loading={isLoading}
        pagination={pagination}
        sortBy={sortBy}
        sortOrder={sortOrder}
        selectedIds={selectedIds}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Feedback Detail Drawer */}
      <FeedbackDetail
        feedback={detailData ?? null}
        open={detailOpen}
        loading={detailLoading}
        onClose={handleDetailClose}
        onUpdateStatus={handleUpdateStatus}
        onAddNote={handleAddNote}
      />
    </div>
  )
}
