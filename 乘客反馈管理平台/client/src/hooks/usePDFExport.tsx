import { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { FeedbackPDFReport } from '@/pages/FeedbackPDFReport'
import { chartToDataURL } from '@/utils/chartToImage'
import type { ECharts } from 'echarts'
import type { OverviewStats, TrendResponse, DistributionResponse } from '@/types'
import type { AnalysisTaskResult } from '@/api/ai'

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

  const exportPDF = useCallback(async (options: ExportOptions) => {
    setGenerating(true)

    try {
      const chartImages: Record<string, string> = {}

      if (options.chartRefs.countTrend) {
        chartImages.countTrend = chartToDataURL(options.chartRefs.countTrend)
      }
      if (options.chartRefs.ratingTrend) {
        chartImages.ratingTrend = chartToDataURL(options.chartRefs.ratingTrend)
      }
      if (options.chartRefs.ratingDistribution) {
        chartImages.ratingDistribution = chartToDataURL(options.chartRefs.ratingDistribution)
      }
      if (options.chartRefs.typeDistribution) {
        chartImages.typeDistribution = chartToDataURL(options.chartRefs.typeDistribution)
      }
      if (options.chartRefs.cityDistribution) {
        chartImages.cityDistribution = chartToDataURL(options.chartRefs.cityDistribution)
      }
      if (options.chartRefs.routeDistribution) {
        chartImages.routeDistribution = chartToDataURL(options.chartRefs.routeDistribution)
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

      const blob = await pdf(doc).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `反馈分析报告_${new Date().toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }, [])

  return { exportPDF, generating }
}
