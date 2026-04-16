import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Clock, CheckCircle, Sparkles, RefreshCw, Copy } from 'lucide-react'
import { StatCard, TrendChart, DistributionChart, FilterBar, FeedbackTable, FeedbackDetail } from '@/components'
import { useOverviewStats, useTrendData, useDistributionData, useAISummary, useAISuggestions, useRefreshAISummary } from '@/hooks'
import { useFilterStore } from '@/stores'
import { useFeedbacks, useFeedbackDetail, useUpdateFeedback, useBatchUpdateStatus } from '@/hooks'
import type { Feedback } from '@/types'
import dayjs from 'dayjs'

export function FeedbackManagement() {
  const navigate = useNavigate()
  const dashboardRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const aiRef = useRef<HTMLDivElement>(null)

  // Filter store
  const { filters } = useFilterStore()

  // Transform filters for API
  const apiFilters = {
    city: filters.city.length > 0 ? filters.city[0] : undefined,
    start_date: filters.startDate || undefined,
    end_date: filters.endDate || undefined,
  }

  // Overview stats with filters
  const { data: stats, isLoading: statsLoading } = useOverviewStats(apiFilters)

  // Trend data with filters
  const { data: trendData, isLoading: trendLoading } = useTrendData({
    type: 'daily',
    ...apiFilters,
  })

  // Distribution data with filters
  const { data: distributionData, isLoading: distLoading } = useDistributionData(apiFilters)

  // AI Summary with filters
  const { data: summary, isLoading: summaryLoading } = useAISummary({
    ...apiFilters,
    length: 'medium',
    max_count: 100,
  })

  // AI Suggestions with filters
  const { data: suggestions, isLoading: suggestionsLoading } = useAISuggestions({
    start_date: filters.startDate || undefined,
    end_date: filters.endDate || undefined,
    top_n: 5,
  })

  const refreshSummary = useRefreshAISummary()

  // Feedback list state
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [sortBy, setSortBy] = React.useState<'time' | 'rating'>('time')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [selectedFeedback, setSelectedFeedback] = React.useState<Feedback | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

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

  const { data: detailData, isLoading: detailLoading } = useFeedbackDetail(selectedFeedback?.id || null)
  const updateFeedback = useUpdateFeedback()
  const batchUpdateStatus = useBatchUpdateStatus()

  // Handlers
  const handleSort = (by: 'time' | 'rating', order: 'asc' | 'desc') => {
    setSortBy(by)
    setSortOrder(order)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(1) }
  const handleRowClick = (feedback: Feedback) => { setSelectedFeedback(feedback); setDetailOpen(true) }
  const handleSelectionChange = (ids: string[]) => setSelectedIds(ids)
  const handleDetailClose = () => { setDetailOpen(false); setSelectedFeedback(null) }

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateFeedback.mutateAsync({ id, data: { status } })
  }

  const handleAddNote = async (id: string, note: string) => {
    await updateFeedback.mutateAsync({ id, data: { handler_notes: note } })
  }

  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0) return
    await batchUpdateStatus.mutateAsync({ ids: selectedIds, status })
    setSelectedIds([])
    refetch()
  }

  const handleRefresh = async () => {
    await refreshSummary.mutateAsync({
      ...apiFilters,
      length: 'medium',
      max_count: 100,
    })
  }

  const handleCopy = () => {
    if (summary?.summary) {
      navigator.clipboard.writeText(summary.summary)
    }
  }

  // Distribution chart data
  // rating_distribution 来自 trendData，不是 distributionData
  const ratingDistribution = trendData?.rating_distribution?.map((item) => ({
    name: `${item.rating}星`,
    value: item.count,
  })) ?? []

  const typeDistribution = distributionData?.type_distribution?.map((item) => ({
    name: item.type,
    value: item.count,
  })) ?? []

  const cityDistribution = distributionData?.city_distribution?.slice(0, 10).map((item) => ({
    name: item.city,
    value: item.count,
  })) ?? []

  const routeDistribution = distributionData?.route_distribution?.slice(0, 10).map((item) => ({
    name: item.route,
    value: item.count,
  })) ?? []

  const hourDistribution = distributionData?.hour_distribution?.map((item) => ({
    name: item.hour,
    value: item.count,
  })) ?? []

  // AI priority config
  const priorityConfig = {
    high: { label: '高优先级', color: '#F5222D', bgColor: '#FFF1F0' },
    medium: { label: '中优先级', color: '#FAAD14', bgColor: '#FFFBE6' },
    low: { label: '低优先级', color: '#52C41A', bgColor: '#F6FFED' },
  }

  return (
    <div className="space-y-6">
      {/* 筛选条件 */}
      <FilterBar />

      {/* ===== 反馈列表 ===== */}
      <div ref={listRef} id="list" className="space-y-4 scroll-mt-20">
        <h2 className="text-lg font-medium text-gray-800">反馈列表</h2>

        {/* Summary Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>共 {data?.total ?? 0} 条反馈</span>
            <span>|</span>
            <span>已选 {selectedIds.length} 条</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBatchUpdateStatus('resolved')} disabled={selectedIds.length === 0} className="btn-secondary text-sm whitespace-nowrap">
              <span>批量标记已解决</span>
            </button>
            <button className="btn-secondary text-sm whitespace-nowrap">
              <span>导出</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <FeedbackTable
          data={data?.list ?? []}
          loading={isLoading}
          pagination={{ page: page, pageSize: pageSize, total: data?.total ?? 0 }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectedIds={selectedIds}
          onPageChange={handlePageChange}
          onSort={handleSort}
          onRowClick={handleRowClick}
          onSelectionChange={handleSelectionChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* ===== 数据仪表盘 ===== */}
      <div ref={dashboardRef} id="dashboard" className="space-y-6 scroll-mt-20">
        <h2 className="text-lg font-medium text-gray-800">数据仪表盘</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="总反馈数"
            value={stats?.total_count ?? 0}
            icon={<MessageSquare className="w-5 h-5" />}
            trend={
              stats?.trends.total_count_change
                ? {
                    value: Math.abs(stats.trends.total_count_change),
                    direction: stats.trends.total_count_change >= 0 ? 'up' : 'down',
                  }
                : undefined
            }
            loading={statsLoading}
            onClick={() => navigate('/feedbacks')}
          />
          <StatCard
            title="平均评分"
            value={stats?.avg_rating?.toFixed(1) ?? '0'}
            suffix="分"
            icon={<Star className="w-5 h-5" />}
            loading={statsLoading}
          />
          <StatCard
            title="好评率"
            value={stats ? `${(stats.positive_rate * 100).toFixed(1)}` : '0'}
            suffix="%"
            icon={<ThumbsUp className="w-5 h-5 text-success" />}
            trend={
              stats?.trends.positive_rate_change
                ? {
                    value: Math.abs(stats.trends.positive_rate_change),
                    direction: stats.trends.positive_rate_change >= 0 ? 'up' : 'down',
                  }
                : undefined
            }
            loading={statsLoading}
          />
          <StatCard
            title="差评率"
            value={stats ? `${(stats.negative_rate * 100).toFixed(1)}` : '0'}
            suffix="%"
            icon={<ThumbsDown className="w-5 h-5 text-error" />}
            trend={
              stats?.trends.positive_rate_change
                ? {
                    value: Math.abs(stats.negative_rate * 10),
                    direction: stats.negative_rate > 0.15 ? 'up' : 'down',
                  }
                : undefined
            }
            loading={statsLoading}
          />
          <StatCard
            title="待处理"
            value={stats?.pending_count ?? 0}
            icon={<Clock className="w-5 h-5 text-warning" />}
            loading={statsLoading}
            onClick={() => navigate('/feedbacks?status=pending')}
          />
          <StatCard
            title="处理完成率"
            value={stats ? `${((1 - stats.pending_count / (stats.total_count || 1)) * 100).toFixed(1)}` : '0'}
            suffix="%"
            icon={<CheckCircle className="w-5 h-5 text-success" />}
            loading={statsLoading}
          />
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart
            data={trendData?.count_trend ?? []}
            type="count"
            loading={trendLoading}
          />
          <TrendChart
            data={trendData?.count_trend ?? []}
            type="rating"
            loading={trendLoading}
          />
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart
            type="pie"
            data={ratingDistribution}
            title="评分分布"
            loading={distLoading}
          />
          <DistributionChart
            type="pie"
            data={typeDistribution}
            title="反馈类型分布"
            loading={distLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart
            type="bar"
            data={cityDistribution}
            title="城市分布 Top10"
            loading={distLoading}
          />
          <DistributionChart
            type="horizontalBar"
            data={routeDistribution}
            title="路线分布 Top10"
            loading={distLoading}
            barColor="#FF6033"
          />
        </div>

        <DistributionChart
          type="heatmap"
          data={hourDistribution}
          title="时段分布"
          loading={distLoading}
          height={200}
        />
      </div>

      {/* ===== AI智能分析 ===== */}
      <div ref={aiRef} id="ai" className="space-y-6 scroll-mt-20">
        <h2 className="text-lg font-medium text-gray-800">AI智能分析</h2>

        {/* AI Summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-gray-800">AI 摘要</h3>
          </div>

          {summaryLoading ? (
            <div className="animate-pulse"><div className="h-24 bg-gray-100 rounded" /></div>
          ) : summary ? (
            <div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary.summary}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  已分析 {summary.analyzed_count} 条反馈 · {dayjs(summary.generated_at).format('MM-DD HH:mm')} 生成
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">暂无摘要数据</p>
          )}
        </div>

        {/* Distribution + Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart type="pie" data={suggestions?.suggestions?.map((s) => ({ name: s.category, value: s.count })) ?? []} title="问题分类分布" loading={suggestionsLoading} height={320} />

          <div className="card">
            <h3 className="font-medium text-gray-800 mb-4">产品优化建议</h3>
            {suggestionsLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (<div key={i} className="h-24 bg-gray-100 rounded" />))}
              </div>
            ) : suggestions?.suggestions && suggestions.suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.suggestions.map((suggestion, index) => {
                  const config = priorityConfig[suggestion.priority]
                  return (
                    <div key={index} className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>
                          {config.label}
                        </span>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-800 mb-1">{suggestion.category} - {suggestion.problem}</h4>
                          <p className="text-xs text-gray-500 mb-2">影响反馈数: {suggestion.count} 条 ({(suggestion.percentage * 100).toFixed(1)}%)</p>
                          <div className="space-y-1">
                            {suggestion.suggestions.slice(0, 2).map((s, i) => (
                              <p key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                <span className="text-primary">•</span>{s}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">暂无建议数据</p>
            )}
          </div>
        </div>
      </div>

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