import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { OverviewStats, TrendResponse, DistributionResponse } from '@/types'
import type { AnalysisTaskResult } from '@/api/ai'
import { pdfStyles } from '@/utils/pdfStyles'

interface ChartImages {
  countTrend?: string
  ratingTrend?: string
  ratingDistribution?: string
  typeDistribution?: string
  cityDistribution?: string
  routeDistribution?: string
}

interface PDFReportProps {
  filters: { startDate?: string; endDate?: string; city?: string }
  stats?: OverviewStats
  trendData?: TrendResponse
  distributionData?: DistributionResponse
  analysisResult?: Pick<AnalysisTaskResult, 'summary' | 'problems' | 'suggestions' | 'analyzed_count'>
  chartImages: ChartImages
  generatedAt: string
}

const priorityConfig = {
  high: { label: '高优先级', color: '#F5222D', bgColor: '#FFF1F0' },
  medium: { label: '中优先级', color: '#FAAD14', bgColor: '#FFFBE6' },
  low: { label: '低优先级', color: '#52C41A', bgColor: '#F6FFED' },
}

function StatCardPDF({ title, value, suffix = '' }: { title: string; value?: string | number; suffix?: string }) {
  return (
    <View style={pdfStyles.statCard}>
      <Text style={pdfStyles.statCardLabel}>{title}</Text>
      <Text style={pdfStyles.statCardValue}>{value ?? '-'} {suffix}</Text>
    </View>
  )
}

export function FeedbackPDFReport({
  filters,
  stats,
  trendData,
  distributionData,
  analysisResult,
  chartImages,
  generatedAt,
}: PDFReportProps) {
  return (
    <Document>
      {/* 封面页 */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.coverTitle}>Robotaxi 乘客反馈分析报告</Text>
        <Text style={pdfStyles.coverSubtitle}>Robotaxi Passenger Feedback Analysis Report</Text>
        <Text style={pdfStyles.coverMeta}>
          导出时间: {generatedAt}
        </Text>
        <Text style={pdfStyles.coverMeta}>
          筛选时间: {filters.startDate || '开始'} ~ {filters.endDate || '至今'}
          {filters.city && ` | 城市: ${filters.city}`}
        </Text>
        <Text style={pdfStyles.coverMeta}>
          共分析 {analysisResult?.analyzed_count || 0} 条反馈
        </Text>
      </Page>

      {/* 数据概览页 */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>一、数据概览</Text>
        <View style={pdfStyles.cardGrid}>
          <StatCardPDF title="总反馈数" value={stats?.total_count} />
          <StatCardPDF title="今日反馈" value={stats?.today_count} />
          <StatCardPDF title="平均评分" value={stats?.avg_rating?.toFixed(1)} suffix="分" />
          <StatCardPDF title="好评率" value={`${((stats?.positive_rate || 0) * 100).toFixed(1)}%`} />
          <StatCardPDF title="差评率" value={`${((stats?.negative_rate || 0) * 100).toFixed(1)}%`} />
          <StatCardPDF
            title="处理完成率"
            value={`${((1 - (stats?.pending_count || 0) / (stats?.total_count || 1)) * 100).toFixed(1)}%`}
          />
        </View>

        <Text style={pdfStyles.sectionTitle}>二、趋势分析</Text>
        {chartImages.countTrend && (
          <View style={pdfStyles.chartContainer}>
            <Text style={pdfStyles.chartTitle}>反馈数量趋势</Text>
            <Image src={chartImages.countTrend} style={pdfStyles.chartImage} />
          </View>
        )}
        {chartImages.ratingTrend && (
          <View style={pdfStyles.chartContainer}>
            <Text style={pdfStyles.chartTitle}>平均评分趋势</Text>
            <Image src={chartImages.ratingTrend} style={pdfStyles.chartImage} />
          </View>
        )}
      </Page>

      {/* 分布分析页 */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>三、分布分析</Text>
        <View style={pdfStyles.chartRow}>
          {chartImages.ratingDistribution && (
            <View style={pdfStyles.chartHalf}>
              <Text style={pdfStyles.chartTitle}>评分分布</Text>
              <Image src={chartImages.ratingDistribution} style={pdfStyles.chartImage} />
            </View>
          )}
          {chartImages.typeDistribution && (
            <View style={pdfStyles.chartHalf}>
              <Text style={pdfStyles.chartTitle}>反馈类型分布</Text>
              <Image src={chartImages.typeDistribution} style={pdfStyles.chartImage} />
            </View>
          )}
        </View>
        {chartImages.cityDistribution && (
          <View style={pdfStyles.chartContainer}>
            <Text style={pdfStyles.chartTitle}>城市分布 Top10</Text>
            <Image src={chartImages.cityDistribution} style={{ ...pdfStyles.chartImage, height: 220 }} />
          </View>
        )}
      </Page>

      {/* AI 分析页 */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.sectionTitle}>四、AI 智能分析</Text>

        {analysisResult?.summary && (
          <View style={pdfStyles.summaryBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>摘要</Text>
            <Text style={{ fontSize: 9, color: '#333333', lineHeight: 1.4 }}>
              {analysisResult.summary}
            </Text>
          </View>
        )}

        {analysisResult?.problems && analysisResult.problems.length > 0 && (
          <>
            <Text style={{ ...pdfStyles.sectionTitle, marginTop: 16 }}>问题分类分布</Text>
            {analysisResult.problems.slice(0, 6).map((problem, index) => (
              <View key={index} style={pdfStyles.problemItem}>
                <View style={pdfStyles.problemHeader}>
                  <Text style={pdfStyles.problemName}>{problem.name}</Text>
                  <Text style={pdfStyles.problemPercent}>
                    {(problem.percentage * 100).toFixed(1)}% · {problem.count}条
                  </Text>
                </View>
                <View style={pdfStyles.problemBar}>
                  <View style={{ ...pdfStyles.problemBarFill, width: `${(problem.percentage * 100).toFixed(1)}%` }} />
                </View>
                {problem.description && (
                  <Text style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>{problem.description}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {analysisResult?.suggestions && analysisResult.suggestions.length > 0 && (
          <>
            <Text style={{ ...pdfStyles.sectionTitle, marginTop: 16 }}>产品优化建议</Text>
            {analysisResult.suggestions.slice(0, 4).map((suggestion, index) => {
              const config = priorityConfig[suggestion.severity] || priorityConfig.medium
              return (
                <View key={index} style={pdfStyles.suggestionCard}>
                  <View style={pdfStyles.tagRow}>
                    <Text style={{ ...pdfStyles.suggestionPriority, backgroundColor: config.bgColor, color: config.color }}>
                      {config.label}
                    </Text>
                  </View>
                  <Text style={pdfStyles.suggestionTitle}>
                    {suggestion.problem_category} - {suggestion.specific_problem}
                  </Text>
                  <Text style={pdfStyles.suggestionImpact}>
                    影响 {suggestion.evidence.count} 条 · 差评率 {(suggestion.evidence.negative_rate * 100).toFixed(0)}%
                  </Text>
                  {suggestion.suggestions.slice(0, 2).map((s, i) => (
                    <Text key={i} style={pdfStyles.suggestionText}>• {s}</Text>
                  ))}
                </View>
              )
            })}
          </>
        )}
      </Page>
    </Document>
  )
}
