import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeedbacks, getFeedbackDetail, updateFeedback, batchUpdateStatus } from '@/api/feedback'
import type { PaginationParams, FilterState } from '@/types'

export function useFeedbacks(params: PaginationParams & Partial<FilterState>) {
  return useQuery({
    queryKey: ['feedbacks', params],
    queryFn: () => getFeedbacks(params),
  })
}

export function useFeedbackDetail(id: string | null) {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: () => getFeedbackDetail(id!),
    enabled: !!id,
  })
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; handler?: string; handler_notes?: string } }) =>
      updateFeedback(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedback', id] })
    },
  })
}

export function useBatchUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) => batchUpdateStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    },
  })
}
