import client from './client'
import type {
  OverviewStats,
  TrendResponse,
  DistributionResponse,
} from '@/types'

// 获取核心指标
export async function getOverviewStats(params?: {
  start_date?: string
  end_date?: string
  city?: string
  rating_min?: number
  rating_max?: number
  status?: string
  feedback_type?: string
}): Promise<OverviewStats> {
  const { data } = await client.get<OverviewStats>('/stats/overview', { params })
  return data
}

// 获取趋势数据
export async function getTrendData(params: {
  granularity?: 'daily' | 'weekly' | 'monthly'
  start_date?: string
  end_date?: string
  city?: string
}): Promise<TrendResponse> {
  const { data } = await client.get<TrendResponse>('/stats/trend', { params })
  return data
}

// 获取分布数据
export async function getDistributionData(params?: {
  start_date?: string
  end_date?: string
  city?: string
}): Promise<DistributionResponse> {
  const { data } = await client.get<DistributionResponse>('/stats/distribution', { params })
  return data
}
