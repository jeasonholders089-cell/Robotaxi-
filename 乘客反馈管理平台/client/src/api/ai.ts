import client from './client'
import type {
  ApiResponse,
  AISummary,
  AISuggestionsResponse,
} from '@/types'

// 生成 AI 摘要
export async function getAISummary(params: {
  start_date?: string
  end_date?: string
  city?: string
  length?: 'short' | 'medium' | 'long'
  max_count?: number
}): Promise<AISummary> {
  const response = await client.post<ApiResponse<AISummary>>('/api/ai/summary', params)
  return response.data
}

// 获取产品建议
export async function getAISuggestions(params: {
  start_date?: string
  end_date?: string
  top_n?: number
}): Promise<AISuggestionsResponse> {
  const response = await client.post<ApiResponse<AISuggestionsResponse>>('/api/ai/suggestions', params)
  return response.data
}

// 批量 AI 分类
export async function batchClassify(ids: string[]): Promise<{
  success_count: number
  failed_count: number
  results: { id: string; feedback_type: string[]; sentiment: string }[]
}> {
  const response = await client.post<ApiResponse<{
    success_count: number
    failed_count: number
    results: { id: string; feedback_type: string[]; sentiment: string }[]
  }>>('/api/feedbacks/batch-classify', { ids })
  return response.data
}
