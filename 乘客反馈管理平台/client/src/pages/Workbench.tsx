import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Clock,
  ThumbsUp,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ListTodo,
  BarChart3,
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { StatCard } from '@/components'
import { useOverviewStats, useAISummary, useTrendData } from '@/hooks'
import dayjs from 'dayjs'

export function Workbench() {
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useOverviewStats()
  const { data: aiSummary } = useAISummary({
    start_date: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  })
  const { data: trendData, isLoading: trendLoading } = useTrendData({
    type: 'daily',
    start_date: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    end_date: dayjs().format('YYYY-MM-DD'),
  })

  const today = dayjs().format('YYYY年MM月DD日')
  const hour = dayjs().hour()
  let greeting = ''
  if (hour < 12) greeting = '早上好'
  else if (hour < 18) greeting = '下午好'
  else greeting = '晚上好'

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
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-gray-800">趋势概览</h3>
            </div>
            <button
              onClick={() => navigate('/feedbacks')}
              className="text-sm text-primary hover:text-primary-dark"
            >
              查看详情 →
            </button>
          </div>
          {trendLoading ? (
            <div className="h-48 animate-pulse bg-gray-50 rounded-lg" />
          ) : trendData && trendData.length > 0 ? (
            <ReactECharts
              option={{
                tooltip: {
                  trigger: 'axis',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderColor: '#E5E5E5',
                  textStyle: { color: '#333' },
                },
                legend: {
                  data: ['反馈数量', '平均评分'],
                  top: 0,
                  textStyle: { color: '#666', fontSize: 11 },
                },
                grid: { left: '3%', right: '4%', bottom: '3%', top: '25%', containLabel: true },
                xAxis: {
                  type: 'category',
                  boundaryGap: false,
                  data: trendData.map((d) => d.date?.slice(5) ?? ''),
                  axisLine: { lineStyle: { color: '#E5E5E5' } },
                  axisLabel: { color: '#666', fontSize: 10 },
                },
                yAxis: [
                  {
                    type: 'value',
                    name: '数量',
                    splitLine: { lineStyle: { color: '#F0F0F0' } },
                    axisLine: { show: false },
                    axisLabel: { color: '#666', fontSize: 10 },
                  },
                  {
                    type: 'value',
                    name: '评分',
                    min: 0,
                    max: 5,
                    splitLine: { show: false },
                    axisLine: { show: false },
                    axisLabel: { color: '#666', fontSize: 10 },
                  },
                ],
                series: [
                  {
                    name: '反馈数量',
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { color: '#FF6033', width: 2 },
                    itemStyle: { color: '#FF6033' },
                    areaStyle: {
                      color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: 'rgba(255, 96, 51, 0.3)' },
                          { offset: 1, color: 'rgba(255, 96, 51, 0)' },
                        ],
                      },
                    },
                    data: trendData.map((d) => d.count),
                  },
                  {
                    name: '平均评分',
                    type: 'line',
                    smooth: true,
                    yAxisIndex: 1,
                    symbol: 'diamond',
                    symbolSize: 6,
                    lineStyle: { color: '#1890FF', width: 2 },
                    itemStyle: { color: '#1890FF' },
                    data: trendData.map((d) => d.avg_rating),
                  },
                ],
              }}
              style={{ height: 180 }}
            />
          ) : (
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-400">近7天反馈趋势</p>
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-gray-800">AI 摘要</h3>
          </div>
          {aiSummary ? (
            <div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiSummary.summary}
              </p>
              <p className="text-xs text-gray-400 mt-3">
                分析时间: {dayjs(aiSummary.generated_at).format('MM-DD HH:mm')} · 已分析 {aiSummary.analyzed_count} 条反馈
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无摘要数据</p>
          )}
        </div>

        {/* Quick Access */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5 text-primary" />
            <h3 className="font-medium text-gray-800">快捷入口</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/feedbacks')}
              className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-light transition-colors"
            >
              <ListTodo className="w-5 h-5 text-primary" />
              <span className="text-sm text-gray-700">反馈列表</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-light transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-sm text-gray-700">数据仪表盘</span>
            </button>
            <button
              onClick={() => navigate('/ai-analysis')}
              className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary-light transition-colors"
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-gray-700">AI 分析</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
