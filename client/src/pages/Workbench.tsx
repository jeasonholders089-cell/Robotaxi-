import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Clock,
  ThumbsUp,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ListTodo,
  BarChart3,
} from 'lucide-react'
import { StatCard, TrendChart } from '@/components'
import { useOverviewStats, useTrendData, useAnalysisTask } from '@/hooks'
import dayjs from 'dayjs'

export function Workbench() {
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useOverviewStats()
  const { data: trendData, isLoading: trendLoading } = useTrendData({
    type: 'daily',
    start_date: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  })

  // AI Analysis Task
  const {
    status: analysisStatus,
    progress,
    summary: aiSummary,
    problems,
    suggestions: aiSuggestions,
    analyzedCount,
    isLoading: analysisLoading,
  } = useAnalysisTask()

  const today = dayjs().format('YYYY年MM月DD日')
  const hour = dayjs().hour()
  let greeting = ''
  if (hour < 12) greeting = '早上好'
  else if (hour < 18) greeting = '下午好'
  else greeting = '晚上好'

  // AI Summary Structured Parser
  interface ParsedSummary {
    satisfaction?: string
    positive?: string[]
    negative?: string[]
    coreSuggestion?: string
  }

  function parseSummaryText(text: string): ParsedSummary {
    const result: ParsedSummary = {}
    if (!text || !text.trim()) return result

    const clean = text.replace(/^#+\s*/gm, '').replace(/---+/g, '').trim()
    const lines = clean.split('\n').map(l => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean)

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

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{greeting}</h2>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日反馈"
          value={stats?.today_count ?? 0}
          icon={<MessageSquare className="w-5 h-5" />}
          loading={statsLoading}
          onClick={() => navigate('/feedbacks')}
        />
        <StatCard
          title="待处理"
          value={stats?.pending_count ?? 0}
          icon={<Clock className="w-5 h-5" />}
          trend={
            stats?.pending_count
              ? { value: 12, direction: stats.pending_count > 10 ? 'up' : 'down' }
              : undefined
          }
          loading={statsLoading}
          onClick={() => navigate('/feedbacks?status=pending')}
        />
        <StatCard
          title="好评率"
          value={stats ? `${(stats.positive_rate * 100).toFixed(1)}` : '0'}
          suffix="%"
          icon={<ThumbsUp className="w-5 h-5" />}
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
          title="平均评分"
          value={stats?.avg_rating?.toFixed(1) ?? '0'}
          suffix="分"
          icon={<AlertCircle className="w-5 h-5" />}
          trend={
            stats?.trends.avg_rating_change
              ? {
                  value: Math.abs(stats.trends.avg_rating_change),
                  direction: stats.trends.avg_rating_change >= 0 ? 'up' : 'down',
                }
              : undefined
          }
          loading={statsLoading}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-error" />
            <h3 className="font-medium text-gray-800">待处理提醒</h3>
          </div>
          {statsLoading ? (
            <div className="animate-pulse">
              <div className="h-16 bg-gray-100 rounded mb-2" />
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => navigate('/feedbacks?rating=1,2&status=pending')}
              >
                <div>
                  <p className="text-sm font-medium text-error">差评反馈</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    需要优先处理的负面反馈
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-error">
                    {stats?.negative_rate ? Math.round(stats.total_count * stats.negative_rate * 0.3) : 0}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                onClick={() => navigate('/feedbacks?status=processing')}
              >
                <div>
                  <p className="text-sm font-medium text-warning">处理中反馈</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    正在处理中的反馈
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-warning">
                    {Math.round((stats?.pending_count ?? 0) * 0.5)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trend Preview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-gray-800">趋势概览</h3>
            </div>
            <button
              onClick={() => navigate('/feedbacks#dashboard')}
              className="text-sm text-primary hover:text-primary-dark"
            >
              查看详情 →
            </button>
          </div>
          <TrendChart
            data={trendData?.count_trend ?? []}
            type="count"
            loading={trendLoading}
            height={180}
          />
        </div>

        {/* AI Summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-gray-800">AI 摘要</h3>
            {analysisLoading && (
              <span className="text-xs text-white animate-pulse bg-[#FF6033] px-2 py-0.5 rounded-full">
                生成中...
              </span>
            )}
          </div>
          {analysisStatus === 'idle' ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">暂无摘要数据</p>
              <p className="text-xs text-gray-400">点击快捷入口「AI 分析」生成</p>
            </div>
          ) : aiSummary ? (() => {
              const parsed = parseSummaryText(aiSummary)
              return (
                <div className="space-y-3">
                  {parsed.satisfaction && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[#FF6033] bg-[#FFF1F0] px-2 py-0.5 rounded">整体满意度</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{parsed.satisfaction}</p>
                    </div>
                  )}
                  {(parsed.positive ?? []).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">正面体验</span>
                      </div>
                      <ul className="space-y-1">
                        {parsed.positive?.slice(0, 2).map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">👍</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(parsed.negative ?? []).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">突出不满</span>
                      </div>
                      <ul className="space-y-1">
                        {parsed.negative?.slice(0, 2).map((item, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">👎</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!parsed.satisfaction && !(parsed.positive ?? []).length && !(parsed.negative ?? []).length && (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  )}
                  {analyzedCount > 0 && (
                    <p className="text-xs text-gray-400">
                      已分析 {analyzedCount} 条反馈
                    </p>
                  )}
                </div>
              )
            })() : (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded w-4/6" />
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-gray-800">快捷入口</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/feedbacks#list')}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-[#FF6033] hover:bg-[#FFF8F0] transition-colors"
            >
              <ListTodo className="w-6 h-6 text-[#FF6033]" />
              <span className="text-sm text-gray-700">反馈列表</span>
            </button>
            <button
              onClick={() => navigate('/feedbacks#dashboard')}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-[#FF6033] hover:bg-[#FFF8F0] transition-colors"
            >
              <BarChart3 className="w-6 h-6 text-[#FF6033]" />
              <span className="text-sm text-gray-700">数据仪表盘</span>
            </button>
            <button
              onClick={() => navigate('/feedbacks#ai')}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-[#FF6033] hover:bg-[#FFF8F0] transition-colors"
            >
              <Sparkles className="w-6 h-6 text-[#FF6033]" />
              <span className="text-sm text-gray-700">AI 分析</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
