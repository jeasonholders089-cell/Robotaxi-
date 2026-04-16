import { useQuery } from '@tanstack/react-query'
import { getAISuggestions } from '@/api/ai'

export function useAISuggestions(params: {
  start_date?: string
  end_date?: string
  top_n?: number
}) {
  return useQuery({
    queryKey: ['ai', 'suggestions', params],
    queryFn: () => getAISuggestions(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
