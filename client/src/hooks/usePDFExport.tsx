import { useState, useCallback } from 'react'
import { pdf, Font } from '@react-pdf/renderer'
import { FeedbackPDFReport } from '@/pages/FeedbackPDFReport'
import { chartToDataURL } from '@/utils/chartToImage'
import type { ECharts } from 'echarts'
import type { OverviewStats, TrendResponse, DistributionResponse } from '@/types'
import type { AnalysisTaskResult } from '@/api/ai'

// Pre-register Chinese font before any PDF generation
Font.register({
  family: 'NotoSansSC',
  src: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeALhL4iJ-Q7m8w.woff2',
})

export interface ChartRefs {
  countTrend?: ECharts
  ratingTrend?: ECharts
  ratingDistribution?: ECharts
  typeDistribution?: ECharts
  cityDistribution?: ECharts
  routeDistribution?: ECharts
}

interface ExportOptions {
  filters: { startDate?: string; endDate?: string; city?: string }
  stats?: OverviewStats
  trendData?: TrendResponse
  distributionData?: DistributionResponse
  analysisResult?: Pick<AnalysisTaskResult, 'summary' | 'problems' | 'suggestions' | 'analyzed_count'>
  chartRefs: ChartRefs
}

export function usePDFExport() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportPDF = useCallback(async (options: ExportOptions) => {
    setGenerating(true)
    setError(null)

    try {
      const chartImages: Record<string, string> = {}

      if (options.chartRefs.countTrend) {
        try {
          chartImages.countTrend = chartToDataURL(options.chartRefs.countTrend)
        } catch (e) {
          console.warn('Failed to capture countTrend chart:', e)
        }
      }
      if (options.chartRefs.ratingTrend) {
        try {
          chartImages.ratingTrend = chartToDataURL(options.chartRefs.ratingTrend)
        } catch (e) {
          console.warn('Failed to capture ratingTrend chart:', e)
        }
      }
      if (options.chartRefs.ratingDistribution) {
        try {
          chartImages.ratingDistribution = chartToDataURL(options.chartRefs.ratingDistribution)
        } catch (e) {
          console.warn('Failed to capture ratingDistribution chart:', e)
        }
      }
      if (options.chartRefs.typeDistribution) {
        try {
          chartImages.typeDistribution = chartToDataURL(options.chartRefs.typeDistribution)
        } catch (e) {
          console.warn('Failed to capture typeDistribution chart:', e)
        }
      }
      if (options.chartRefs.cityDistribution) {
        try {
          chartImages.cityDistribution = chartToDataURL(options.chartRefs.cityDistribution)
        } catch (e) {
          console.warn('Failed to capture cityDistribution chart:', e)
        }
      }
      if (options.chartRefs.routeDistribution) {
        try {
          chartImages.routeDistribution = chartToDataURL(options.chartRefs.routeDistribution)
        } catch (e) {
          console.warn('Failed to capture routeDistribution chart:', e)
        }
      }

      const doc = (
        <FeedbackPDFReport
          filters={options.filters}
          stats={options.stats}
          trendData={options.trendData}
          distributionData={options.distributionData}
          analysisResult={options.analysisResult}
          chartImages={chartImages}
          generatedAt={new Date().toLocaleString('zh-CN')}
        />
      )

      // Add timeout to prevent hanging
      const pdfPromise = pdf(doc).toBlob()
      const timeoutPromise = new Promise<Blob>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timeout')), 60000)
      )

      const blob = await Promise.race([pdfPromise, timeoutPromise])

      if (!blob || blob.size === 0) {
        throw new Error('Generated PDF is empty')
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `反馈分析报告_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('PDF export failed:', err)
      setError(err.message || 'PDF导出失败')
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  return { exportPDF, generating, error }
}
