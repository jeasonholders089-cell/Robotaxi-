import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { OverviewStats } from '@/types'

// Only register font if not already registered
if (!Font.getRegisteredFontFamilies().includes('NotoSansSC')) {
  Font.register({
    family: 'NotoSansSC',
    fonts: [
      { src: '/fonts/NotoSansSC.ttf', fontWeight: 'normal' },
      { src: '/fonts/NotoSansSC.ttf', fontWeight: 'bold' },
    ],
  })
}

// Fallback to standard font for compatibility
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSansSC',
    fontSize: 10,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6033',
    paddingBottom: 6,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    width: '30%',
    marginRight: '3%',
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6033',
  },
  text: {
    fontSize: 10,
    color: '#333',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 6,
  },
  errorBox: {
    backgroundColor: '#FFF1F0',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#F5222D',
    marginBottom: 12,
  },
})

interface SimplePDFProps {
  stats?: OverviewStats
  generatedAt: string
  errorMessage?: string
}

export function SimplePDF({ stats, generatedAt, errorMessage }: SimplePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Robotaxi 乘客反馈分析报告</Text>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.text}>注意: {errorMessage}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>数据概览</Text>
        <View style={styles.cardGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>总反馈数</Text>
            <Text style={styles.statValue}>{stats?.total_count ?? '-'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>今日反馈</Text>
            <Text style={styles.statValue}>{stats?.today_count ?? '-'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>平均评分</Text>
            <Text style={styles.statValue}>
              {stats?.avg_rating ? stats.avg_rating.toFixed(1) : '-' }
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>好评率</Text>
            <Text style={styles.statValue}>
              {stats?.positive_rate ? `${(stats.positive_rate * 100).toFixed(1)}%` : '-'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>差评率</Text>
            <Text style={styles.statValue}>
              {stats?.negative_rate ? `${(stats.negative_rate * 100).toFixed(1)}%` : '-'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>处理完成率</Text>
            <Text style={styles.statValue}>
              {stats?.total_count && stats.total_count > 0
                ? `${((1 - (stats.pending_count || 0) / stats.total_count) * 100).toFixed(1)}%`
                : '-'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>说明</Text>
        <Text style={styles.text}>• 本报告基于 Robotaxi 乘客反馈数据生成</Text>
        <Text style={styles.text}>• 数据统计截止至最近更新时间</Text>
        <Text style={styles.text}>• 如有问题请联系技术支持</Text>

        <Text style={styles.footer}>
          导出时间: {generatedAt}
        </Text>
      </Page>
    </Document>
  )
}

export default SimplePDF