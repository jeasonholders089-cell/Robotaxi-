import { StyleSheet } from '@react-pdf/renderer'

export const pdfStyles = StyleSheet.create({
  // 页面基础样式
  page: {
    padding: 40,
    fontFamily: 'NotoSansSC',
    fontSize: 10,
  },
  // 封面标题
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 120,
  },
  coverSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  coverMeta: {
    fontSize: 10,
    color: '#999999',
    marginTop: 40,
    textAlign: 'center',
  },
  // 页面标题
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6033',
    paddingBottom: 8,
  },
  // 卡片网格
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statCard: {
    width: '30%',
    marginRight: '3%',
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 4,
  },
  statCardLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6033',
    maxWidth: '100%',
  },
  // 图表容器
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  chartImage: {
    width: '100%',
    height: 160,
    objectFit: 'contain',
  },
  chartImageLarge: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
  },
  chartRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chartHalf: {
    width: '48%',
    marginRight: '4%',
  },
  // AI 分析区块
  summaryBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  // 问题分类
  problemItem: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexWrap: 'wrap',
  },
  problemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  problemName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
  },
  problemPercent: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF6033',
  },
  problemBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 4,
  },
  problemBarFill: {
    height: 4,
    backgroundColor: '#FF6033',
    borderRadius: 2,
  },
  // 建议卡片
  suggestionCard: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#fff8f0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6033',
    flexWrap: 'wrap',
  },
  suggestionPriority: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    maxWidth: '100%',
  },
  suggestionImpact: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 2,
  },
  // 页脚
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
  },
})
