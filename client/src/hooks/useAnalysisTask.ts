import { useState, useCallback, useRef } from 'react'
import { startAnalysis, getAnalysisResult, AnalysisTaskResult } from '@/api/ai'
import { useFilterStore } from '@/stores/filterStore'

export type AnalysisStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface UseAnalysisTaskReturn {
  // 状态
  taskId: string | null
  status: AnalysisStatus
  progress: number
  summary: string | null
  problems: AnalysisTaskResult['problems']
  suggestions: AnalysisTaskResult['suggestions']
  analyzedCount: number
  error: string | null
  isLoading: boolean

  // 操作
  startAnalysis: () => Promise<void>
  reset: () => void
}

export function useAnalysisTask(): UseAnalysisTaskReturn {
  const { filters } = useFilterStore()

  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<string | null>(null)
  const [problems, setProblems] = useState<AnalysisTaskResult['problems']>(null)
  const [suggestions, setSuggestions] = useState<AnalysisTaskResult['suggestions']>(null)
  const [analyzedCount, setAnalyzedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const result = await getAnalysisResult(taskId)

      setProgress(result.progress)
      setStatus(result.status as AnalysisStatus)

      if (result.status === 'completed') {
        setSummary(result.summary)
        setProblems(result.problems)
        setSuggestions(result.suggestions)
        setAnalyzedCount(result.analyzed_count)
        setError(null)
        stopPolling()
      } else if (result.status === 'failed') {
        setError(result.error)
        stopPolling()
      }
      // If still processing, continue polling
    } catch (err) {
      setError('查询分析结果失败')
      setStatus('failed')
      stopPolling()
    }
  }, [stopPolling])

  const startAnalysisHandler = useCallback(async () => {
    stopPolling()
    setIsLoading(true)
    setError(null)

    try {
      // Build filter params
      const params: Parameters<typeof startAnalysis>[0] = {}

      if (filters.city && filters.city.length > 0) {
        params.city = filters.city[0]
      }
      if (filters.startDate) {
        params.start_date = filters.startDate
      }
      if (filters.endDate) {
        params.end_date = filters.endDate
      }
      // Always pass rating filters if they differ from defaults
      if (filters.ratingMin !== undefined && filters.ratingMin !== 1) {
        params.rating_min = filters.ratingMin
      }
      if (filters.ratingMax !== undefined && filters.ratingMax !== 5) {
        params.rating_max = filters.ratingMax
      }
      if (filters.status && filters.status.length > 0) {
        params.status = filters.status
      }
      if (filters.feedbackType && filters.feedbackType.length > 0) {
        params.feedback_type = filters.feedbackType
      }
      if (filters.keyword) {
        params.keyword = filters.keyword
      }

      // Start analysis
      const result = await startAnalysis(params)
      setTaskId(result.task_id)
      setStatus('processing')
      setProgress(0)

      // Start polling
      pollingRef.current = setInterval(() => {
        pollTaskStatus(result.task_id)
      }, 3000)
    } catch (err) {
      setError('发起分析失败')
      setStatus('failed')
    } finally {
      setIsLoading(false)
    }
  }, [filters, pollTaskStatus, stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    setTaskId(null)
    setStatus('idle')
    setProgress(0)
    setSummary(null)
    setProblems(null)
    setSuggestions(null)
    setAnalyzedCount(0)
    setError(null)
  }, [stopPolling])

  return {
    taskId,
    status,
    progress,
    summary,
    problems,
    suggestions,
    analyzedCount,
    error,
    isLoading,
    startAnalysis: startAnalysisHandler,
    reset,
  }
}