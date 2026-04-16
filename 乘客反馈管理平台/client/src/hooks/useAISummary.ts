import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAISummary } from '@/api/ai'

export function useAISummary(params: {
  start_date?: string
  end_date?: string
  city?: string
  length?: 'short' | 'medium' | 'long'
  max_count?: number
}) {
  return useQuery({
    queryKey: ['ai', 'summary', params],
    queryFn: () => getAISummary(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useRefreshAISummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: Parameters<typeof getAISummary>[0]) => getAISummary(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'summary'] })
    },
  })
}
