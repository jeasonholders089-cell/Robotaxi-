import type { ECharts } from 'echarts'

/**
 * 将 ECharts 实例导出为 base64 PNG 图片
 * 用于嵌入 PDF 文档
 */
export function chartToDataURL(chartInstance: ECharts | undefined): string {
  if (!chartInstance) return ''

  return chartInstance.getConnectedDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    excludeComponents: ['toolbox'],
  })
}
