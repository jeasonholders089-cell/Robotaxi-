import client from './client'
import type {
  AISummary,
  AISuggestionsResponse,
} from '@/types'

// 生成 AI 摘要
export async function getAISummary(params: {
  start_date?: string
  end_date?: string
  city?: string
  rating_min?: number
  rating_max?: number
  status?: string[]
  feedback_type?: string[]
  keyword?: string
  length?: 'short' | 'medium' | 'long'
  max_count?: number
}): Promise<AISummary> {
  const { data } = await client.post<AISummary>('/ai/summary', params)
  return data
}

// 获取产品建议
export async function getAISuggestions(params: {
  start_date?: string
  end_date?: string
  city?: string
  rating_min?: number
  rating_max?: number
  status?: string[]
  feedback_type?: string[]
  keyword?: string
  top_n?: number
}): Promise<AISuggestionsResponse> {
  const { data } = await client.post<AISuggestionsResponse>('/ai/suggestions', params)
  return data
}

// 批量 AI 分类
export async function batchClassify(ids: string[]): Promise<{
  success_count: number
  failed_count: number
  results: { id: string; feedback_type: string[]; sentiment: string }[]
}> {
  const { data } = await client.post<{
    success_count: number
    failed_count: number
    results: { id: string; feedback_type: string[]; sentiment: string }[]
  }>('/feedbacks/batch-classify', { ids })
  return data
}

// ===== v1.5 Analysis Pipeline APIs =====

// 问题分类
export interface ProblemCategory {
  name: string
  is_existing: boolean
  count: number
  percentage: number
  negative_rate: number
  common_issues?: string[]
  user_quotes?: string[]
  description?: string
}

// 分析建议
export interface AnalysisSuggestion {
  problem_category: string
  specific_problem: string
  severity: 'high' | 'medium' | 'low'
  evidence: {
    count: number
    negative_rate: number
    user_voice: string
  }
  suggestions: string[]
  expected_impact?: string
}

// 分析任务状态
export interface AnalysisTaskResult {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  summary: string | null
  problems: ProblemCategory[] | null
  suggestions: AnalysisSuggestion[] | null
  analyzed_count: number
  error: string | null
}

// 发起分析任务
export async function startAnalysis(params: {
  start_date?: string
  end_date?: string
  city?: string
  rating_min?: number
  rating_max?: number
  status?: string[]
  feedback_type?: string[]
  keyword?: string
}): Promise<{ task_id: string }> {
  const { data } = await client.post<{ task_id: string }>('/ai/analyze', params)
  return data
}

// 查询分析结果
export async function getAnalysisResult(taskId: string): Promise<AnalysisTaskResult> {
  const { data } = await client.get<AnalysisTaskResult>(`/ai/analyze/${taskId}`)
  return data
}
