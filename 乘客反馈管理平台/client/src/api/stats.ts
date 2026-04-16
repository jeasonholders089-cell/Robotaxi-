import client from './client'
import type {
  ApiResponse,
  OverviewStats,
  TrendResponse,
  DistributionResponse,
} from '@/types'

// 获取核心指标
export async function getOverviewStats(): Promise<OverviewStats> {
  const response = await client.get<ApiResponse<OverviewStats>>('/api/stats/overview')
  return response.data
}

// 获取趋势数据
export async function getTrendData(params: {
  granularity?: 'daily' | 'weekly' | 'monthly'
  start_date?: string
  end_date?: string
  city?: string
}): Promise<TrendResponse> {
  const response = await client.get<ApiResponse<TrendResponse>>('/api/stats/trend', { params })
  // Response interceptor already returns response.data (the unwrapped data)
  return response as unknown as TrendResponse
}

// 获取分布数据
export async function getDistributionData(params?: {
  start_date?: string
  end_date?: string
  city?: string
}): Promise<DistributionResponse> {
  const response = await client.get<ApiResponse<DistributionResponse>>('/api/stats/distribution', { params })
  return response.data
}
