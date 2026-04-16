import client from './client'
import type {
  ApiResponse,
  OverviewStats,
  TrendResponse,
  DistributionResponse,
} from '@/types'

// 获取核心指标
export async function getOverviewStats(params?: {
  start_date?: string
  end_date?: string
  city?: string
}): Promise<OverviewStats> {
  const response = await client.get<ApiResponse<OverviewStats>>('/stats/overview', { params })
  return response.data
}

// 获取趋势数据
export async function getTrendData(params: {
  granularity?: 'daily' | 'weekly' | 'monthly'
  start_date?: string
  end_date?: string
  city?: string
}): Promise<TrendResponse> {
  const response = await client.get<ApiResponse<TrendResponse>>('/stats/trend', { params })
  return response.data
}

// 获取分布数据
export async function getDistributionData(params?: {
  start_date?: string
  end_date?: string
  city?: string
}): Promise<DistributionResponse> {
  const response = await client.get<ApiResponse<DistributionResponse>>('/stats/distribution', { params })
  return response.data
}
