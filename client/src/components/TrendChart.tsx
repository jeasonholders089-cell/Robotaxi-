import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ECharts, EChartsOption } from 'echarts'
import type { TrendData } from '@/types'

interface TrendChartProps {
  data: TrendData[]
  type: 'count' | 'rating'
  loading?: boolean
  height?: number
}

export interface TrendChartRef {
  getEchartsInstance: () => ECharts | undefined
}

export const TrendChart = forwardRef<TrendChartRef, TrendChartProps>(({ data, type, loading, height = 300 }, ref) => {
  // Use any type because ReactECharts ref receives the component instance, not ECharts directly
  const chartRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getEchartsInstance: () => chartRef.current?.getEchartsInstance?.(),
  }))
  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse" style={{ height }}>
          <div className="h-full bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E5E5',
      textStyle: {
        color: '#333',
      },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; seriesName: string }[]
        if (!p || !p[0]) return ''
        if (type === 'count') {
          return `${p[0].name}<br/>反馈数量: ${p[0].value}`
        } else {
          return `${p[0].name}<br/>平均评分: ${p[0].value.toFixed(1)}`
        }
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((item) => item.date),
      axisLine: {
        lineStyle: {
          color: '#E5E5E5',
        },
      },
      axisLabel: {
        color: '#666',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: '#F0F0F0',
        },
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: '#666',
        fontSize: 11,
      },
    },
    series: [
      {
        name: type === 'count' ? '反馈数量' : '平均评分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#FF6033',
          width: 2,
        },
        itemStyle: {
          color: '#FF6033',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 96, 51, 0.2)' },
              { offset: 1, color: 'rgba(255, 96, 51, 0)' },
            ],
          },
        },
        data: data.map((item) => (type === 'count' ? item.count : item.rating_avg)),
      },
    ],
  }

  // Add reference line for rating chart
  if (type === 'rating') {
    option.series = (option.series as { markLine?: object }[]).map((s) => ({
      ...s,
      markLine: {
        silent: true,
        lineStyle: {
          color: '#FAAD14',
          type: 'dashed',
        },
        data: [{ yAxis: 4.0 }],
        label: {
          formatter: '基准线 4.0',
          position: 'end',
          color: '#FAAD14',
          fontSize: 10,
        },
      },
    })) as typeof option.series
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        {type === 'count' ? '反馈数量趋势' : '平均评分趋势'}
      </h3>
      <ReactECharts ref={chartRef} option={option} style={{ height }} />
    </div>
  )
})
