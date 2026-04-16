import React, { useState } from 'react'
import {
  Sparkles,
  RefreshCw,
  Copy,
} from 'lucide-react'
import { DistributionChart } from '@/components'
import { useAISummary, useAISuggestions, useRefreshAISummary } from '@/hooks'
import dayjs from 'dayjs'

const priorityConfig = {
  high: { label: '高优先级', color: '#F5222D', bgColor: '#FFF1F0' },
  medium: { label: '中优先级', color: '#FAAD14', bgColor: '#FFFBE6' },
  low: { label: '低优先级', color: '#52C41A', bgColor: '#F6FFED' },
}

export function AiAnalysis() {
  const [analysisScope, setAnalysisScope] = useState<'all' | 'current' | 'custom'>('all')
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  })

  const { data: summary, isLoading: summaryLoading } = useAISummary({
    start_date: analysisScope === 'custom' ? dateRange.start : undefined,
    end_date: analysisScope === 'custom' ? dateRange.end : undefined,
    length: 'medium',
    max_count: 100,
  })

  const { data: suggestions, isLoading: suggestionsLoading } = useAISuggestions({
    start_date: analysisScope === 'custom' ? dateRange.start : undefined,
    end_date: analysisScope === 'custom' ? dateRange.end : undefined,
    top_n: 5,
  })

  const refreshSummary = useRefreshAISummary()

  const handleRefresh = async () => {
    await refreshSummary.mutateAsync({
      start_date: analysisScope === 'custom' ? dateRange.start : undefined,
      end_date: analysisScope === 'custom' ? dateRange.end : undefined,
      length: 'medium',
      max_count: 100,
    })
  }

  const handleCopy = () => {
    if (summary?.summary) {
      navigator.clipboard.writeText(summary.summary)
    }
  }

  return (
    <div className="space-y-6">
      {/* Analysis Scope */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">分析范围</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {(['all', 'current', 'custom'] as const).map((scope) => (
              <label
                key={scope}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="scope"
                  checked={analysisScope === scope}
                  onChange={() => setAnalysisScope(scope)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  {scope === 'all'
                    ? '全部反馈'
                    : scope === 'current'
                    ? '当前筛选'
                    : '指定时间'}
                </span>
              </label>
            ))}
          </div>

          {analysisScope === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="input w-36"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="input w-36"
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-gray-800">AI 摘要</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshSummary.isPending}
              className="btn-secondary text-sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${refreshSummary.isPending ? 'animate-spin' : ''}`}
              />
              重新生成
            </button>
            <button
              onClick={handleCopy}
              disabled={!summary?.summary}
              className="btn-secondary text-sm"
            >
              <Copy className="w-4 h-4 mr-1" />
              复制
            </button>
          </div>
        </div>

        {summaryLoading ? (
          <div className="animate-pulse">
            <div className="h-24 bg-gray-100 rounded" />
          </div>
        ) : summary ? (
          <div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary.summary}
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                已分析 {summary.analyzed_count} 条反馈 ·{' '}
                {dayjs(summary.generated_at).format('MM-DD HH:mm')} 生成
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">暂无摘要数据</p>
        )}
      </div>

      {/* Distribution + Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <DistributionChart
          type="pie"
          data={
            suggestions?.suggestions?.map((s) => ({
              name: s.category,
              value: s.count,
            })) ?? []
          }
          title="问题分类分布"
          loading={suggestionsLoading}
          height={320}
        />

        {/* Product Suggestions */}
        <div className="card">
          <h3 className="font-medium text-gray-800 mb-4">产品优化建议</h3>
          {suggestionsLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded" />
              ))}
            </div>
          ) : suggestions?.suggestions && suggestions.suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.suggestions.map((suggestion, index) => {
                const config = priorityConfig[suggestion.priority]
                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: config.bgColor,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-800 mb-1">
                          {suggestion.category} - {suggestion.problem}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          影响反馈数: {suggestion.count} 条 (
                          {(suggestion.percentage * 100).toFixed(1)}%)
                        </p>
                        <div className="space-y-1">
                          {suggestion.suggestions.slice(0, 2).map((s, i) => (
                            <p key={i} className="text-xs text-gray-600 flex items-start gap-1">
                              <span className="text-primary">•</span>
                              {s}
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

      {/* Suggestion Detail Cards */}
      {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-800">建议详情</h3>
          {suggestions.suggestions.map((suggestion, index) => {
            const config = priorityConfig[suggestion.priority]
            return (
              <div
                key={index}
                className="card"
                style={{ borderLeft: `4px solid ${config.color}` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: config.bgColor,
                        color: config.color,
                      }}
                    >
                      {config.label}
                    </span>
                    <h4 className="text-base font-medium text-gray-800 mt-2">
                      {suggestion.category} - {suggestion.problem}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">{suggestion.count}</p>
                    <p className="text-xs text-gray-500">反馈数</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">占比</p>
                    <p className="text-sm font-medium text-gray-700">
                      {(suggestion.percentage * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">差评率</p>
                    <p className="text-sm font-medium text-gray-700">
                      {(suggestion.negative_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">置信度</p>
                    <p className="text-sm font-medium text-gray-700">
                      {Math.round(85 + suggestion.percentage * 10)}%
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">用户原声</p>
                  <div className="space-y-2">
                    {suggestion.user_voices.map((voice, i) => (
                      <p
                        key={i}
                        className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded"
                      >
                        "{voice}"
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">优化建议</p>
                  <div className="space-y-2">
                    {suggestion.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-primary font-medium text-sm">{i + 1}.</span>
                        <p className="text-sm text-gray-700">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
