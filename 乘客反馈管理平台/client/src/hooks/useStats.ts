import { useQuery } from '@tanstack/react-query'
import { getOverviewStats, getTrendData, getDistributionData } from '@/api/stats'

export function useOverviewStats() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: getOverviewStats,
  })
}

export function useTrendData(params: {
  type?: 'daily' | 'weekly' | 'monthly'
  start_date?: string
  end_date?: string
  city?: string
}) {
  // Transform 'type' to 'granularity' for backend API
  const apiParams = {
    granularity: params.type,
    start_date: params.start_date,
    end_date: params.end_date,
    city: params.city,
  }
  return useQuery({
    queryKey: ['stats', 'trend', params],
    queryFn: () => getTrendData(apiParams),
  })
}

export function useDistributionData(params?: {
  start_date?: string
  end_date?: string
  city?: string
}) {
  return useQuery({
    queryKey: ['stats', 'distribution', params],
    queryFn: () => getDistributionData(params),
  })
}
