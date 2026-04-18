import React, { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Clock, CheckCircle, Sparkles } from 'lucide-react'
import { StatCard, TrendChart, DistributionChart, FilterBar, FeedbackTable, FeedbackDetail, PDFExportButton } from '@/components'
import { TrendChartRef } from '@/components/TrendChart'
import { DistributionChartRef } from '@/components/DistributionChart'
import { useOverviewStats, useTrendData, useDistributionData, useAnalysisTask } from '@/hooks'
import { useFilterStore } from '@/stores'
import { useFeedbacks, useFeedbackDetail, useUpdateFeedback, useBatchUpdateStatus } from '@/hooks'
import { batchExport } from '@/api/feedback'
import { usePDFExport } from '@/hooks/usePDFExport'
import { useNavigation } from '@/components/NavigationContext'
import type { Feedback } from '@/types'

export function FeedbackManagement() {
  const navigate = useNavigate()
  const { setActiveSection } = useNavigation()
  const dashboardRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const aiRef = useRef<HTMLDivElement>(null)

  // Chart refs for PDF export
  const countTrendRef = useRef<TrendChartRef>(null)
  const ratingTrendRef = useRef<TrendChartRef>(null)
  const ratingDistRef = useRef<DistributionChartRef>(null)
  const typeDistRef = useRef<DistributionChartRef>(null)
  const cityDistRef = useRef<DistributionChartRef>(null)
  const routeDistRef = useRef<DistributionChartRef>(null)

  // PDF export
  const { exportPDF, generating: pdfGenerating } = usePDFExport()

  // Scroll spy - 滚动监听，自动更新左侧导航高亮
  useEffect(() => {
    const sectionRefs = [
      { id: 'list', ref: listRef },
      { id: 'dashboard', ref: dashboardRef },
      { id: 'ai', ref: aiRef },
    ]

    const observer = new IntersectionObserver(
      (entries) => {
        // 找出所有正在交叉的条目
        const intersectingEntries = entries.filter((entry) => entry.isIntersecting)
        if (intersectingEntries.length > 0) {
          // 取第一个正在交叉的条目（最靠上的）
          const topEntry = intersectingEntries.reduce((prev, curr) => {
            return prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
          })
          const sectionId = sectionRefs.find((s) => s.ref.current === topEntry.target)?.id
          if (sectionId) {
            setActiveSection(sectionId)
          }
        }
      },
      {
        root: null,
        rootMargin: '-80px 0px -60% 0px', // 顶部留 80px，底部保留 60% 视口高度
        threshold: 0,
      }
    )

    sectionRefs.forEach(({ ref }) => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => observer.disconnect()
  }, [setActiveSection])

  // Filter store
  const { filters } = useFilterStore()

  // Transform filters for API
  const apiFilters = {
    city: filters.city.length > 0 ? filters.city[0] : undefined,
    start_date: filters.startDate || undefined,
    end_date: filters.endDate || undefined,
    rating_min: filters.ratingMin > 1 ? filters.ratingMin : undefined,
    rating_max: filters.ratingMax < 5 ? filters.ratingMax : undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    feedback_type: filters.feedbackType.length > 0 ? filters.feedbackType.join(',') : undefined,
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

  // AI Analysis Task - v1.5 重构版本
  const {
    status: analysisStatus,
    progress,
    summary: aiSummary,
    problems,
    suggestions: aiSuggestions,
    analyzedCount,
    error: analysisError,
    isLoading: analysisLoading,
    startAnalysis,
    reset,
  } = useAnalysisTask()

  // Check if any filters are applied
  const hasFilters = Boolean(
    filters.startDate ||
    filters.endDate ||
    (filters.city && filters.city.length > 0) ||
    filters.ratingMin > 1 ||
    filters.ratingMax < 5 ||
    (filters.status && filters.status.length > 0) ||
    (filters.feedbackType && filters.feedbackType.length > 0) ||
    filters.keyword
  )

  // Estimate data count - use filtered feedback total, not overview stats
  const estimatedCount = data?.total?.toLocaleString() ?? '0'

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

  // 导出反馈列表（Excel/CSV）
  const [exporting, setExporting] = React.useState(false)
  const [exportSuccess, setExportSuccess] = React.useState(false)
  const handleExport = async () => {
    setExporting(true)
    setExportSuccess(false)
    try {
      const ids = selectedIds.length > 0 ? selectedIds : undefined
      const blob = await batchExport(ids, 'excel')
      if (!blob) {
        throw new Error('导出失败，返回数据为空')
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `反馈列表_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  // PDF Export handler
  const handleExportPDF = async () => {
    try {
      await exportPDF({
        filters: {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          city: filters.city?.[0] || undefined,
        },
        stats: stats,
        trendData: trendData,
        distributionData: distributionData,
        analysisResult: aiSummary ? {
          summary: aiSummary,
          problems: problems,
          suggestions: aiSuggestions,
          analyzed_count: analyzedCount,
        } : undefined,
        chartRefs: {
          countTrend: countTrendRef.current?.getEchartsInstance(),
          ratingTrend: ratingTrendRef.current?.getEchartsInstance(),
          ratingDistribution: ratingDistRef.current?.getEchartsInstance(),
          typeDistribution: typeDistRef.current?.getEchartsInstance(),
          cityDistribution: cityDistRef.current?.getEchartsInstance(),
          routeDistribution: routeDistRef.current?.getEchartsInstance(),
        },
      })
    } catch (error) {
      console.error('PDF导出失败:', error)
      alert('PDF导出失败，请重试')
    }
  }

  // AI Analysis handlers
  const getAnalysisButtonText = () => {
    if (analysisLoading) return '分析中...'
    if (analysisStatus === 'failed') return '重试'
    // 如果还没有分析过数据，显示"开始分析"
    if (analysisStatus === 'idle' || !aiSummary) return '开始分析'
    return '重新分析'
  }

  const isAnalyzing = analysisLoading || analysisStatus === 'processing'

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

  const cityDistribution = distributionData?.city_distribution?.slice(0, 20).map((item) => ({
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

  // ===== AI Summary Structured Parser =====
  interface ParsedSummary {
    satisfaction?: string
    positive?: string[]
    negative?: string[]
    coreSuggestion?: string
  }

  function parseSummaryText(text: string): ParsedSummary {
    const result: ParsedSummary = {}
    if (!text || !text.trim()) return result

    // Remove markdown formatting (---, #, etc.)
    const clean = text.replace(/^#+\s*/gm, '').replace(/---+/g, '').trim()
    const lines = clean.split('\n').map(l => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean)

    // Find sections by keywords
    const satisfactionKeywords = ['整体满意度', '满意度', '总体满意度']
    const positiveKeywords = ['正面体验', '正面反馈', '好评']
    const negativeKeywords = ['突出不满', '负面反馈', '差评', '主要问题']
    const suggestionKeyword = '核心建议'

    let currentSection: 'satisfaction' | 'positive' | 'negative' | 'suggestion' | null = null
    const positiveItems: string[] = []
    const negativeItems: string[] = []

    for (const line of lines) {
      const lower = line.toLowerCase()

      if (satisfactionKeywords.some(k => lower.includes(k))) {
        currentSection = 'satisfaction'
        const colonIdx = line.indexOf('：')
        if (colonIdx !== -1) {
          result.satisfaction = line.slice(colonIdx + 1).replace(/^【|】$/g, '').trim()
        }
        continue
      }
      if (suggestionKeyword && lower.includes(suggestionKeyword)) {
        currentSection = 'suggestion'
        const colonIdx = line.indexOf('：')
        if (colonIdx !== -1) {
          result.coreSuggestion = line.slice(colonIdx + 1).replace(/^【|】$/g, '').trim()
        }
        continue
      }
      if (positiveKeywords.some(k => lower.includes(k))) {
        currentSection = 'positive'
        continue
      }
      if (negativeKeywords.some(k => lower.includes(k))) {
        currentSection = 'negative'
        continue
      }

      // Collect list items (remove 【】 brackets)
      const itemText = line.replace(/^【|】$/g, '').trim()
      if (!itemText || itemText === '正面体验' || itemText === '突出不满') continue

      if (currentSection === 'satisfaction' && !result.satisfaction) {
        result.satisfaction = itemText
      } else if (currentSection === 'positive') {
        positiveItems.push(itemText)
      } else if (currentSection === 'negative') {
        negativeItems.push(itemText)
      }
    }

    result.positive = positiveItems
    result.negative = negativeItems
    return result
  }

  // ===== Collapsed Section State =====
  const [problemsExpanded, setProblemsExpanded] = React.useState(false)
  const [suggestionsExpanded, setSuggestionsExpanded] = React.useState(false)

  // Sort problems by percentage desc, show top 4 when collapsed
  const sortedProblems = [...(problems ?? [])].sort((a, b) => b.percentage - a.percentage)
  const displayProblems = problemsExpanded ? sortedProblems : sortedProblems.slice(0, 4)

  // Sort suggestions by priority: high > medium > low, show top 3 when collapsed
  // Normalize severity to lowercase to handle AI output variations (e.g. "HIGHT" -> "high")
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const sortedSuggestions = [...(aiSuggestions ?? [])].sort((a, b) => {
    const aVal = priorityOrder[String(a.severity ?? '').toLowerCase()] ?? 99
    const bVal = priorityOrder[String(b.severity ?? '').toLowerCase()] ?? 99
    return aVal - bVal
  })
  const displaySuggestions = suggestionsExpanded ? sortedSuggestions : sortedSuggestions.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* 筛选条件 */}
      <FilterBar />

      {/* ===== 反馈列表 ===== */}
      <div ref={listRef} id="list" className="space-y-4 scroll-mt-20">
        {/* Summary Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-gray-800">反馈列表</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>共 {data?.total ?? 0} 条反馈</span>
              <span>|</span>
              <span>已选 {selectedIds.length} 条</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBatchUpdateStatus('resolved')} disabled={selectedIds.length === 0} className="btn-secondary text-sm whitespace-nowrap">
              <span>批量标记已解决</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || data?.total === 0}
              className={`btn-secondary text-sm whitespace-nowrap flex items-center gap-2 ${exportSuccess ? '!border-green-500 !text-green-600' : ''}`}
            >
              {exporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>导出中...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span>已下载</span>
                </>
              ) : (
                <span>导出{selectedIds.length > 0 ? `（${selectedIds.length}条）` : ''}</span>
              )}
            </button>
            </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-800">数据仪表盘</h2>
          <PDFExportButton
            onExport={handleExportPDF}
            loading={pdfGenerating}
          />
        </div>

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
            ref={countTrendRef}
            data={trendData?.count_trend ?? []}
            type="count"
            loading={trendLoading}
          />
          <TrendChart
            ref={ratingTrendRef}
            data={trendData?.count_trend ?? []}
            type="rating"
            loading={trendLoading}
          />
        </div>

        {/* Distribution Charts - 橙色色系 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart
            ref={ratingDistRef}
            type="rosePie"
            data={ratingDistribution}
            title="评分分布"
            loading={distLoading}
            colorScheme="orange"
          />
          <DistributionChart
            ref={typeDistRef}
            type="pie"
            data={typeDistribution}
            title="反馈类型分布"
            loading={distLoading}
            colorScheme="saturation"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart
            ref={cityDistRef}
            type="bar"
            data={cityDistribution}
            title="城市分布 Top10"
            loading={distLoading}
            colorScheme="vivid"
          />
          <DistributionChart
            ref={routeDistRef}
            type="horizontalBar"
            data={routeDistribution}
            title="路线分布 Top10"
            loading={distLoading}
            colorScheme="transparency"
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
        {/* Analysis Header - v1.5 设计 */}
        <div className={`flex items-center justify-between px-6 py-4 bg-white border border-gray-200 rounded-lg ${isAnalyzing ? 'animate-pulse' : ''}`}>
          <div className="flex items-center gap-3">
            <Sparkles className={`w-5 h-5 text-primary ${isAnalyzing ? 'animate-pulse' : ''}`} />
            <h2 className="text-lg font-semibold text-gray-800">AI 智能分析</h2>
            {isAnalyzing ? (
              <span className="text-sm text-primary font-medium animate-pulse">
                分析中...
              </span>
            ) : (
              <span className="text-sm text-gray-500">
                基于当前筛选条件，预估 {estimatedCount} 条数据
              </span>
            )}
          </div>
          <button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-[#FF6033] text-white text-sm font-medium rounded-lg hover:bg-[#FF6033]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAnalyzing && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {getAnalysisButtonText()}
          </button>
        </div>

        {/* Error Display */}
        {analysisError && (
          <div className="card bg-red-50 border-red-200">
            <p className="text-red-600 text-sm">{analysisError}</p>
          </div>
        )}

        {/* AI Summary Card */}
        <div className={`card ${isAnalyzing ? 'ring-2 ring-[#FF6033]/50 shadow-lg shadow-[#FF6033]/40' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-medium text-gray-800">AI 摘要</h3>
            {isAnalyzing && (
              <span className="text-xs text-white animate-pulse bg-[#FF6033] px-2 py-0.5 rounded-full">
                正在生成...
              </span>
            )}
          </div>
          {analysisStatus === 'idle' && !isAnalyzing ? (
            <p className="text-sm text-gray-400 text-center py-8">
              点击上方「开始分析」按钮生成摘要
            </p>
          ) : isAnalyzing ? (
            <div className="relative overflow-hidden rounded-lg">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/6" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-3/6" />
              </div>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          ) : aiSummary ? (() => {
              const parsed = parseSummaryText(aiSummary)
              return (
                <div className="space-y-4">
                  {parsed.satisfaction && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-[#FF6033] bg-[#FFF1F0] px-2 py-0.5 rounded">整体满意度</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{parsed.satisfaction}</p>
                    </div>
                  )}
                  {parsed.positive && parsed.positive.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">正面体验</span>
                      </div>
                      <ul className="space-y-1">
                        {parsed.positive.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5 font-bold">+</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {parsed.negative && parsed.negative.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">突出不满</span>
                      </div>
                      <ul className="space-y-1">
                        {parsed.negative.map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-red-400 mt-0.5 font-bold">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {parsed.coreSuggestion && (
                    <div className="bg-[#FFF8F0] rounded-lg p-4 border border-[#FF6033]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-[#FF6033] bg-[#FFF1F0] px-2 py-0.5 rounded">核心建议</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{parsed.coreSuggestion}</p>
                    </div>
                  )}
                  {!parsed.satisfaction && !parsed.positive?.length && !parsed.negative?.length && !parsed.coreSuggestion && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  )}
                </div>
              )
            })() : (
            <p className="text-sm text-gray-400 text-center py-8">暂无摘要数据</p>
          )}
        </div>

        {/* Problem Categories + Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem Categories Card */}
          <div className={`card ${isAnalyzing ? 'ring-2 ring-[#FF6033]/50 shadow-lg shadow-[#FF6033]/40' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-medium text-gray-800">问题分类分布</h3>
              {isAnalyzing && (
                <span className="text-xs text-white animate-pulse bg-[#FF6033] px-2 py-0.5 rounded-full">
                  分析中...
                </span>
              )}
            </div>
            {analysisStatus === 'idle' && !isAnalyzing ? (
              <p className="text-sm text-gray-400 text-center py-8">
                分析完成后显示问题分类
              </p>
            ) : isAnalyzing ? (
              <div className="relative overflow-hidden rounded-lg">
                <div className="animate-pulse space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded" />
                  ))}
                </div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            ) : problems && problems.length > 0 ? (
              <div className="space-y-4">
                {displayProblems.map((problem, index) => (
                  <div key={index} className="animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {!problem.is_existing && (
                          <span className="text-xs text-purple-600 font-medium">[新分类]</span>
                        )}
                        <span className="text-sm text-gray-700">{problem.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{(problem.count)}条</span>
                        <span className="text-sm font-medium text-[#FF6033]">
                          {(problem.percentage * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(problem.percentage * 100).toFixed(0)}%`,
                          backgroundColor: problem.is_existing ? '#FF6033' : '#975FE4',
                        }}
                      />
                    </div>
                    {/* 问题描述 */}
                    {problem.description && (
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{problem.description}</p>
                    )}
                    {/* 常见问题列表 */}
                    {problem.common_issues && problem.common_issues.length > 0 && (
                      <div className="mt-1.5 pl-2 border-l-2 border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">典型问题：</p>
                        <ul className="space-y-0.5">
                          {problem.common_issues.slice(0, 3).map((issue: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                              <span className="text-[#FF6033] mt-0.5">·</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* 用户原声 */}
                    {problem.user_quotes && problem.user_quotes.length > 0 && (
                      <p className="text-xs text-gray-400 italic mt-1.5 bg-gray-50 p-2 rounded">
                        "{problem.user_quotes[0]}"
                      </p>
                    )}
                  </div>
                ))}
                {problems.length > 4 && (
                  <button
                    onClick={() => setProblemsExpanded(!problemsExpanded)}
                    className="w-full text-center text-sm text-primary hover:text-primary/80 py-2 border border-dashed border-gray-200 rounded-lg"
                  >
                    {problemsExpanded ? '收起' : `查看全部 ${problems.length} 个分类`}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">暂无问题分类数据</p>
            )}
          </div>

          {/* Suggestions Card */}
          <div className={`card ${isAnalyzing ? 'ring-2 ring-[#FF6033]/50 shadow-lg shadow-[#FF6033]/40' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-medium text-gray-800">产品优化建议</h3>
              {isAnalyzing && (
                <span className="text-xs text-white animate-pulse bg-[#FF6033] px-2 py-0.5 rounded-full">
                  生成中...
                </span>
              )}
            </div>
            {analysisStatus === 'idle' && !isAnalyzing ? (
              <p className="text-sm text-gray-400 text-center py-8">
                分析完成后显示优化建议
              </p>
            ) : isAnalyzing ? (
              <div className="relative overflow-hidden rounded-lg">
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded" />
                  ))}
                </div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            ) : aiSuggestions && aiSuggestions.length > 0 ? (
              <div className="space-y-4">
                {displaySuggestions.map((suggestion, index) => {
                  const config = priorityConfig[suggestion.severity] || priorityConfig.medium
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-gray-100 animate-fadeIn"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                          style={{
                            backgroundColor: config.bgColor,
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </span>
                        <h4 className="text-sm font-medium text-gray-800">
                          {suggestion.problem_category} - {suggestion.specific_problem}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        影响 {suggestion.evidence.count} 条 · 差评率 {(suggestion.evidence.negative_rate * 100).toFixed(0)}%
                      </p>
                      <div className="space-y-1">
                        {suggestion.suggestions.slice(0, 2).map((s, i) => (
                          <p key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-primary shrink-0">•</span>
                            {s}
                          </p>
                        ))}
                      </div>
                      {suggestion.evidence.user_voice && (
                        <p className="text-xs text-gray-500 italic mt-2 bg-gray-50 p-2 rounded">
                          "{suggestion.evidence.user_voice}"
                        </p>
                      )}
                    </div>
                  )
                })}
                {aiSuggestions.length > 3 && (
                  <button
                    onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
                    className="w-full text-center text-sm text-primary hover:text-primary/80 py-2 border border-dashed border-gray-200 rounded-lg"
                  >
                    {suggestionsExpanded ? '收起' : `查看全部 ${aiSuggestions.length} 条建议`}
                  </button>
                )}
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