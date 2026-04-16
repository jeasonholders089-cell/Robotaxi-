import { useQuery } from '@tanstack/react-query'
import { getAISuggestions } from '@/api/ai'

export function useAISuggestions(params: {
  start_date?: string
  end_date?: string
  city?: string
  rating_min?: number
  rating_max?: number
  status?: string[]
  feedback_type?: string[]
  keyword?: string
  top_n?: number
}) {
  return useQuery({
    queryKey: ['ai', 'suggestions', params],
    queryFn: () => getAISuggestions(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
