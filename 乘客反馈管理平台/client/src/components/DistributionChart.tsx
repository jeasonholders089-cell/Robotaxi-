import React from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

interface PieChartData {
  name: string
  value: number
}

interface BarChartData {
  name: string
  value: number
}

interface DistributionChartProps {
  type: 'pie' | 'bar' | 'horizontalBar'
  data: PieChartData[] | BarChartData[]
  title: string
  loading?: boolean
  height?: number
  colors?: string[]
}

const defaultColors = [
  '#FF6033',
  '#36CBCB',
  '#1890FF',
  '#975FE4',
  '#F5222D',
  '#FAAD14',
  '#52C41A',
  '#FF7A45',
]

export function DistributionChart({
  type,
  data,
  title,
  loading,
  height = 280,
  colors = defaultColors,
}: DistributionChartProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse" style={{ height }}>
          <div className="h-full bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  const getOption = (): EChartsOption => {
    if (type === 'pie') {
      const pieData = data as PieChartData[]
      return {
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#E5E5E5',
          textStyle: {
            color: '#333',
          },
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          textStyle: {
            color: '#666',
            fontSize: 12,
          },
        },
        color: colors,
        series: [
          {
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: false,
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
              },
            },
            data: pieData.map((item) => ({
              name: item.name,
              value: item.value,
            })),
          },
        ],
      }
    }

    if (type === 'bar') {
      const barData = data as BarChartData[]
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#E5E5E5',
          textStyle: {
            color: '#333',
          },
          axisPointer: {
            type: 'shadow',
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
          data: barData.map((item) => item.name),
          axisLine: {
            lineStyle: {
              color: '#E5E5E5',
            },
          },
          axisLabel: {
            color: '#666',
            fontSize: 11,
            rotate: 30,
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
        color: colors,
        series: [
          {
            type: 'bar',
            barWidth: '60%',
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
            },
            data: barData.map((item) => item.value),
          },
        ],
      }
    }

    // horizontalBar
    const hBarData = data as BarChartData[]
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E5E5',
        textStyle: {
          color: '#333',
        },
        axisPointer: {
          type: 'shadow',
        },
      },
      grid: {
        left: '3%',
        right: '15%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
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
      yAxis: {
        type: 'category',
        data: hBarData.map((item) => item.name).reverse(),
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
      color: colors,
      series: [
        {
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
          },
          data: hBarData.map((item) => item.value).reverse(),
        },
      ],
    }
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      <ReactECharts option={getOption()} style={{ height }} />
    </div>
  )
}
