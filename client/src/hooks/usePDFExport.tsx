import { useState, useCallback } from 'react'
import { pdf, Font } from '@react-pdf/renderer'
import { FeedbackPDFReport } from '@/pages/FeedbackPDFReport'
import { SimplePDF } from '@/pages/SimplePDF'
import { chartToDataURL } from '@/utils/chartToImage'
import type { ECharts } from 'echarts'
import type { OverviewStats, TrendResponse, DistributionResponse } from '@/types'
import type { AnalysisTaskResult } from '@/api/ai'

// Pre-register Chinese font
try {
  Font.register({
    family: 'NotoSansSC',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeALhL4iJ-Q7m8w.woff2',
        fontWeight: 'normal',
      },
      {
        src: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeALhL4iJ-Q7m8w.woff2',
        fontWeight: 'bold',
      },
    ],
  })
} catch (e) {
  console.warn('Font registration warning:', e)
}

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

    const timeoutMs = 180000

    try {
      const chartImages: Record<string, string> = {}
      const chartErrors: string[] = []

      // Capture charts with error handling
      const captureChart = (key: string, chart: ECharts | undefined) => {
        if (!chart) return
        try {
          const dataUrl = chartToDataURL(chart)
          if (dataUrl) {
            chartImages[key] = dataUrl
          } else {
            chartErrors.push(`${key}: empty result`)
          }
        } catch (e: any) {
          chartErrors.push(`${key}: ${e.message}`)
          console.warn(`Failed to capture ${key}:`, e)
        }
      }

      const { chartRefs } = options
      if (chartRefs.countTrend) captureChart('countTrend', chartRefs.countTrend)
      if (chartRefs.ratingTrend) captureChart('ratingTrend', chartRefs.ratingTrend)
      if (chartRefs.ratingDistribution) captureChart('ratingDistribution', chartRefs.ratingDistribution)
      if (chartRefs.typeDistribution) captureChart('typeDistribution', chartRefs.typeDistribution)
      if (chartRefs.cityDistribution) captureChart('cityDistribution', chartRefs.cityDistribution)
      if (chartRefs.routeDistribution) captureChart('routeDistribution', chartRefs.routeDistribution)

      console.log(`Chart capture: ${Object.keys(chartImages).length} succeeded, ${chartErrors.length} failed`)

      const generatedAt = new Date().toLocaleString('zh-CN')
      const doc = (
        <FeedbackPDFReport
          filters={options.filters}
          stats={options.stats}
          trendData={options.trendData}
          distributionData={options.distributionData}
          analysisResult={options.analysisResult}
          chartImages={chartImages}
          generatedAt={generatedAt}
        />
      )

      // PDF generation with timeout
      let blob: Blob | null = null
      const pdfPromise = pdf(doc).toBlob()

      const timeoutPromise = new Promise<Blob>((_, reject) => {
        setTimeout(() => reject(new Error('PDF generation timeout (60s)')), timeoutMs)
      })

      blob = await Promise.race([pdfPromise, timeoutPromise])

      if (!blob) {
        throw new Error('PDF generation returned empty blob')
      }

      if (blob.size < 1000) {
        throw new Error(`PDF too small: ${blob.size} bytes`)
      }

      console.log(`PDF generated successfully: ${blob.size} bytes`)

      // Trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `反馈分析报告_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err: any) {
      const errorMsg = err.message || 'PDF导出失败'
      console.error('PDF export failed:', errorMsg, err)

      // Try fallback to simple PDF
      try {
        console.log('Attempting fallback PDF...')
        const generatedAt = new Date().toLocaleString('zh-CN')
        const simpleDoc = <SimplePDF stats={options.stats} generatedAt={generatedAt} errorMessage={errorMsg} />
        const fallbackBlob = await Promise.race([
          pdf(simpleDoc).toBlob(),
          new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error('Fallback timeout')), 60000))
        ])

        if (fallbackBlob && fallbackBlob.size > 1000) {
          const url = URL.createObjectURL(fallbackBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `反馈分析报告_${new Date().toISOString().split('T')[0]}_backup.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          setError('已生成简化版报告（图表未包含）')
          return
        }
      } catch (fallbackErr) {
        console.error('Fallback PDF also failed:', fallbackErr)
      }

      setError(errorMsg)
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  return { exportPDF, generating, error }
}