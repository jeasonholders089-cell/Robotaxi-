import React from 'react'
import { Sparkles } from 'lucide-react'
import { useAnalysisTask } from '@/hooks'
import { useFilterStore } from '@/stores/filterStore'
import { useFeedbacks } from '@/hooks/useFeedbacks'

const priorityConfig = {
  high: { label: '高优先级', color: '#F5222D', bgColor: '#FFF1F0' },
  medium: { label: '中优先级', color: '#FAAD14', bgColor: '#FFFBE6' },
  low: { label: '低优先级', color: '#52C41A', bgColor: '#F6FFED' },
}

// 问题分类颜色
const categoryColors = {
  '行驶体验': '#FF6033',
  '车内环境': '#FF7A45',
  '接驾体验': '#FFAB66',
  '路线规划': '#FFDCC2',
  '安全感受': '#FFF7F0',
  '服务态度': '#975FE4',
  '其他': '#E5E5E5',
}

export function AiAnalysis() {
  const { filters } = useFilterStore()
  const {
    status,
    progress,
    summary,
    problems,
    suggestions,
    analyzedCount,
    error,
    isLoading,
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

  // Get actual filtered count for display (query with pageSize=1 to get total only)
  const { data: feedbackData } = useFeedbacks({
    page: 1,
    pageSize: 1,
    sortBy: 'time',
    sortOrder: 'desc',
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

  // Use actual total count if available, otherwise fall back to analyzedCount or placeholder
  const estimatedCount = feedbackData?.total != null ? feedbackData.total : (analyzedCount > 0 ? analyzedCount : (hasFilters ? '...' : '100'))

  // Determine button text
  const getButtonText = () => {
    if (isLoading) return '分析中...'
    if (status === 'idle') return '开始分析'
    if (status === 'failed') return '重试'
    return '重新分析'
  }

  // Handle analysis error display
  const renderError = () => {
    if (!error) return null
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  // Render analysis header
  const renderHeader = () => (
    <div className="flex items-center justify-between px-6 py-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-gray-800">AI 智能分析</h2>
        <span className="text-sm text-gray-500">
          📊 基于当前筛选条件，预估 {estimatedCount} 条数据
        </span>
      </div>
      <button
        onClick={status === 'idle' || status === 'failed' ? startAnalysis : reset}
        disabled={isLoading}
        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {getButtonText()}
      </button>
    </div>
  )

  // Render AI Summary Card
  const renderSummaryCard = () => {
    if (status === 'idle') {
      return (
        <div className="card">
          <h3 className="font-medium text-gray-800 mb-4">AI 摘要</h3>
          <p className="text-sm text-gray-400 text-center py-8">
            点击「开始分析」按钮生成摘要
          </p>
        </div>
      )
    }

    return (
      <div className="card">
        <h3 className="font-medium text-gray-800 mb-4">AI 摘要</h3>
        {isLoading || status === 'processing' ? (
          <div className="animate-pulse">
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ) : summary ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">暂无摘要数据</p>
        )}
      </div>
    )
  }

  // Render Problem Categories Card
  const renderProblemCategoriesCard = () => {
    if (status === 'idle') {
      return (
        <div className="card">
          <h3 className="font-medium text-gray-800 mb-4">问题分类</h3>
          <p className="text-sm text-gray-400 text-center py-8">
            分析完成后显示问题分类
          </p>
        </div>
      )
    }

    return (
      <div className="card">
        <h3 className="font-medium text-gray-800 mb-4">问题分类分布</h3>
        {isLoading || status === 'processing' ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded" />
            ))}
          </div>
        ) : problems && problems.length > 0 ? (
          <div className="space-y-3">
            {problems.map((problem, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {!problem.is_existing && (
                      <span className="text-xs text-purple-600 font-medium">[新]</span>
                    )}
                    <span className="text-sm text-gray-700">{problem.name}</span>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {(problem.percentage * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(problem.percentage * 100).toFixed(0)}%`,
                      backgroundColor: problem.is_existing
                        ? (categoryColors[problem.name as keyof typeof categoryColors] || '#FF6033')
                        : '#975FE4',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">暂无问题分类数据</p>
        )}
      </div>
    )
  }

  // Render Suggestions Card
  const renderSuggestionsCard = () => {
    if (status === 'idle') {
      return (
        <div className="card">
          <h3 className="font-medium text-gray-800 mb-4">产品优化建议</h3>
          <p className="text-sm text-gray-400 text-center py-8">
            分析完成后显示优化建议
          </p>
        </div>
      )
    }

    return (
      <div className="card">
        <h3 className="font-medium text-gray-800 mb-4">产品优化建议</h3>
        {isLoading || status === 'processing' ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded" />
            ))}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => {
              const config = priorityConfig[suggestion.severity] || priorityConfig.medium
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-gray-100"
                  style={{ borderLeft: `4px solid ${config.color}` }}
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
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">暂无建议数据</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      {renderHeader()}

      {/* Error Display */}
      {renderError()}

      {/* Summary Card */}
      {renderSummaryCard()}

      {/* Problem Categories + Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderProblemCategoriesCard()}
        {renderSuggestionsCard()}
      </div>
    </div>
  )
}
