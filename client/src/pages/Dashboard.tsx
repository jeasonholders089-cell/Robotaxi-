import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Clock, CheckCircle } from 'lucide-react'
import { StatCard, TrendChart, DistributionChart } from '@/components'
import { useOverviewStats, useTrendData, useDistributionData } from '@/hooks'

export function Dashboard() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')

  const { data: stats, isLoading: statsLoading } = useOverviewStats()
  const { data: trendData, isLoading: trendLoading } = useTrendData({
    type: timeRange === '7d' ? 'daily' : timeRange === '30d' ? 'weekly' : 'monthly',
    start_date: timeRange === '7d'
      ? undefined
      : timeRange === '30d'
      ? undefined
      : undefined,
  })
  const { data: distributionData, isLoading: distLoading } = useDistributionData()

  const ratingDistribution = distributionData?.rating_distribution?.map((item) => ({
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

  const hourDistribution = distributionData?.hour_distribution?.map((item) => ({
    name: item.hour,
    value: item.count,
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Time Range Tabs */}
      <div className="flex items-center justify-end gap-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === range
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {range === '7d' ? '近7天' : range === '30d' ? '近30天' : '近90天'}
          </button>
        ))}
      </div>

      {/* Overview Stats */}
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
          data={hourDistribution}
          title="时段分布"
          loading={distLoading}
        />
      </div>
    </div>
  )
}
