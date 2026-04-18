import type { ECharts } from 'echarts'

/**
 * 将 ECharts 实例导出为 base64 PNG 图片
 * 用于嵌入 PDF 文档
 */
export function chartToDataURL(chartInstance: ECharts | undefined): string {
  if (!chartInstance) return ''

  // Check if chartInstance has the getConnectedDataURL method
  if (typeof chartInstance.getConnectedDataURL !== 'function') {
    console.warn('chartToDataURL: chartInstance does not have getConnectedDataURL method')
    return ''
  }

  try {
    return chartInstance.getConnectedDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      excludeComponents: ['toolbox'],
    })
  } catch (error) {
    console.warn('chartToDataURL failed:', error)
    return ''
  }
}
