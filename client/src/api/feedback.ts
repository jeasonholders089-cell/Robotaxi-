import client from './client'
import type {
  Feedback,
  FeedbackListResponse,
  FeedbackDetailResponse,
  PaginationParams,
  FilterState,
  HandlingLog,
} from '@/types'

// 获取反馈列表
export async function getFeedbacks(
  params: PaginationParams & Partial<FilterState>
): Promise<FeedbackListResponse> {
  // Transform camelCase to snake_case for backend API
  const apiParams = {
    page: params.page,
    page_size: params.pageSize,
    sort_by: params.sortBy === 'time' ? 'trip_time' : params.sortBy,
    sort_order: params.sortOrder,
    city: params.city?.join(',') || undefined,
    route: params.route || undefined,
    rating_min: params.ratingMin,
    rating_max: params.ratingMax,
    start_date: params.startDate || undefined,
    end_date: params.endDate || undefined,
    status: params.status?.join(',') || undefined,
    keyword: params.keyword || undefined,
    feedback_type: params.feedbackType?.join(',') || undefined,
  }
  const { data } = await client.get<FeedbackListResponse>('/feedbacks', { params: apiParams })
  return data
}

// 获取反馈详情
export async function getFeedbackDetail(id: string): Promise<FeedbackDetailResponse> {
  const { data } = await client.get<FeedbackDetailResponse>(`/feedbacks/${id}`)
  return data
}

// 更新反馈状态
export async function updateFeedback(
  id: string,
  data: { status?: string; handler?: string; handler_notes?: string }
): Promise<Feedback> {
  const { data: result } = await client.patch<Feedback>(`/feedbacks/${id}`, data)
  return result
}

// 批量更新状态
export async function batchUpdateStatus(ids: string[], status: string): Promise<{ success_count: number; failed_count: number }> {
  const { data } = await client.post<{ success_count: number; failed_count: number }>('/feedbacks/batch-update', {
    ids,
    status,
  })
  return data
}

// 批量导出
export async function batchExport(
  ids?: string[],
  format: 'excel' | 'csv' = 'excel',
  filters?: {
    city?: string
    rating_min?: number
    rating_max?: number
    start_date?: string
    end_date?: string
    status?: string
    keyword?: string
    feedback_type?: string
  }
): Promise<Blob> {
  const response = await client.post<Blob>(
    '/feedbacks/batch-export',
    { ids, format, ...filters },
    { responseType: 'blob' }
  )
  return response.data
}

// 添加处理备注
export async function addHandlingLog(
  feedbackId: string,
  data: { operator: string; action: string; remark?: string }
): Promise<HandlingLog> {
  const { data: result } = await client.post<HandlingLog>(
    `/feedbacks/${feedbackId}/handling-logs`,
    data
  )
  return result
}
