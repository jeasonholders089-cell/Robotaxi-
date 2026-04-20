import { useState, useCallback } from 'react'
import { pdf, Font, Document, Page, Text } from '@react-pdf/renderer'
import { FeedbackPDFReport } from '@/pages/FeedbackPDFReport'
import { SimplePDF } from '@/pages/SimplePDF'
import { chartToDataURL } from '@/utils/chartToImage'
import type { ECharts } from 'echarts'
import type { OverviewStats, TrendResponse, DistributionResponse } from '@/types'
import type { AnalysisTaskResult } from '@/api/ai'

// Pre-register Chinese font from local file (16MB NotoSansSC)
// Using synchronous registration for reliability
Font.register({
  family: 'NotoSansSC',
  fonts: [
    { src: '/fonts/NotoSansSC.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSansSC.ttf', fontWeight: 'bold' },
  ],
})
console.log('Chinese font registered from local file')

// Wait for font to be ready before generating PDF
async function ensureFontLoaded(): Promise<void> {
  return new Promise((resolve) => {
    // Font.register is synchronous, so we just need a small delay for processing
    setTimeout(resolve, 100)
  })
}

// Create a minimal fallback PDF that doesn't require Chinese fonts
function createFallbackDocument(stats: any, generatedAt: string, errorMsg: string) {
  return (
    <Document>
      <Page size="A4" style={{ padding: 40, fontFamily: 'Helvetica', fontSize: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          Robotaxi Feedback Report
        </Text>
        <Text style={{ fontSize: 12, marginBottom: 10, color: '#666' }}>
          Generated: {generatedAt}
        </Text>
        {errorMsg && (
          <Text style={{ fontSize: 10, color: '#F5222D', marginBottom: 10 }}>
            Note: {errorMsg}
          </Text>
        )}
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>
          Stats Summary:
        </Text>
        <Text>Total: {stats?.total_count ?? '-'}</Text>
        <Text>Today: {stats?.today_count ?? '-'}</Text>
        <Text>Avg Rating: {stats?.avg_rating?.toFixed(1) ?? '-'}</Text>
        <Text>Positive Rate: {stats?.positive_rate ? `${(stats.positive_rate * 100).toFixed(1)}%` : '-'}</Text>
        <Text>Negative Rate: {stats?.negative_rate ? `${(stats.negative_rate * 100).toFixed(1)}%` : '-'}</Text>
      </Page>
    </Document>
  )
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

      // Ensure font is registered before PDF generation
      await ensureFontLoaded()

      const pdfPromise = pdf(doc).toBlob()

      const timeoutPromise = new Promise<Blob>((_, reject) => {
        setTimeout(() => reject(new Error('PDF generation timeout (180s)')), timeoutMs)
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

      // Try fallback to simple PDF without Chinese fonts
      try {
        console.log('Attempting fallback PDF with Helvetica...')
        const generatedAt = new Date().toLocaleString('zh-CN')
        const fallbackDoc = createFallbackDocument(options.stats, generatedAt, errorMsg)
        const fallbackBlob = await Promise.race([
          pdf(fallbackDoc).toBlob(),
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