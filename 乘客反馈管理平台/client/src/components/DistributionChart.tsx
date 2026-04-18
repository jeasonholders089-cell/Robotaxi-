import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ECharts, EChartsOption } from 'echarts'

interface PieChartData {
  name: string
  value: number
}

interface BarChartData {
  name: string
  value: number
}

interface DistributionChartProps {
  type: 'pie' | 'bar' | 'horizontalBar' | 'rosePie' | 'heatmap'
  data: PieChartData[] | BarChartData[]
  title: string
  loading?: boolean
  height?: number
  colors?: string[]
  colorScheme?: 'lightness' | 'saturation' | 'morandi' | 'orange' | 'transparency' | 'vivid'
}

export interface DistributionChartRef {
  getEchartsInstance: () => ECharts | undefined
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

// 莫兰迪色系 - 低饱和度柔和色调
const morandiColors = [
  '#E8DED1', // 米灰
  '#D4C4B0', // 浅褐
  '#C9B8A8', // 灰褐
  '#B8A99A', // 深灰褐
  '#A99B8C', // 橄榄灰
  '#9B8E7C', // 褐灰
  '#8C7E6D', // 深褐灰
  '#7D6F5E', // 炭灰
]

// 橙色色系 - 低饱和度、高亮度、透明感
const orangeColors = [
  '#FFF5F0', '#FFE8E0', '#FFDDD5', '#FFD5C8', '#FFCDBB',
  '#FFC5AE', '#FFBDA1', '#FFB594', '#FFAD87', '#FFA57A',
  '#FF9D6D', '#FF9560', '#FF8D53', '#FF8546', '#FF7D39'
]

// 橙色色系 - 高饱和度版本
const orangeSaturationColors = [
  '#FFD4C2', '#FFAB66', '#FF8C55', '#FF6033', '#E55A2B',
  '#CC4419', '#B83300', '#992600', '#801900', '#660D00'
]

// 橙色透明度版本 - 同一颜色不同透明度
const orangeTransparencyColors = [
  'rgba(255, 96, 51, 1)',    // 100% - 最深
  'rgba(255, 96, 51, 0.85)', // 85%
  'rgba(255, 96, 51, 0.7)',  // 70%
  'rgba(255, 96, 51, 0.55)', // 55%
  'rgba(255, 96, 51, 0.45)', // 45%
  'rgba(255, 96, 51, 0.35)', // 35%
  'rgba(255, 96, 51, 0.28)', // 28%
  'rgba(255, 96, 51, 0.22)', // 22%
  'rgba(255, 96, 51, 0.16)', // 16%
  'rgba(255, 96, 51, 0.1)',   // 10% - 最浅
]

// 橙色色系 - 色相渐变，从浅橙到深橙红
const orangeVividColors = [
  '#FFF0ED',  // 1
  '#FFE8E1',  // 2
  '#FFE0D5',  // 3
  '#FFD8C9',  // 4
  '#FFD0BD',  // 5
  '#FFC8B1',  // 6
  '#FFC0A5',  // 7
  '#FFB899',  // 8
  '#FFB08D',  // 9
  '#FFA881',  // 10
  '#FFA075',  // 11
  '#FF9869',  // 12
  '#FF905D',  // 13
  '#FF8851',  // 14
  '#FF8045',  // 15
  '#FF7839',  // 16
  '#FF702D',  // 17
  '#FF6821',  // 18
  '#FF6015',  // 19
  '#FF5809',  // 20
]

// 获取配色
const getColors = (colorScheme: 'lightness' | 'saturation' | 'morandi' | 'orange' | 'transparency' | 'vivid') => {
  if (colorScheme === 'morandi') {
    return morandiColors
  } else if (colorScheme === 'orange') {
    return orangeColors
  } else if (colorScheme === 'saturation') {
    return orangeSaturationColors
  } else if (colorScheme === 'transparency') {
    return orangeTransparencyColors
  } else if (colorScheme === 'vivid') {
    return orangeVividColors
  } else if (colorScheme === 'lightness') {
    return ['#FFEEE8', '#FFD4C2', '#FFB08C', '#FF7744', '#FF6033']
  } else {
    return orangeColors
  }
}

export const DistributionChart = forwardRef<DistributionChartRef, DistributionChartProps>(({
  type,
  data,
  title,
  loading,
  height = 280,
  colors = defaultColors,
  colorScheme = 'lightness',
}, ref) => {
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

  const getOption = (): EChartsOption => {
    if (type === 'pie') {
      const pieData = data as PieChartData[]
      const pieColors = getColors(colorScheme)
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
          right: '2%',
          top: 'center',
          textStyle: {
            color: '#666',
            fontSize: 11,
          },
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 8,
        },
        color: pieColors,
        series: [
          {
            type: 'pie',
            radius: ['38%', '62%'],
            center: ['32%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}\n{d}%',
              color: '#666',
              fontSize: 11,
              lineHeight: 14,
              distanceToLabelLine: 6,
            },
            labelLine: {
              show: true,
              length: 8,
              length2: 12,
              smooth: true,
              lineStyle: {
                color: '#ccc',
                width: 1,
              },
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 13,
                fontWeight: 'bold',
              },
            },
            data: pieData.map((item, index) => ({
              name: item.name,
              value: item.value,
              itemStyle: {
                color: pieColors[index % pieColors.length],
              },
            })),
          },
        ],
      }
    }

    if (type === 'rosePie') {
      const pieData = data as PieChartData[]
      const roseColors = getColors('lightness')
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
        color: roseColors,
        series: [
          {
            type: 'pie',
            radius: ['20%', '70%'],
            center: ['50%', '50%'],
            roseType: 'radius',
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}\n{d}%',
              color: '#666',
              fontSize: 11,
              lineHeight: 16,
              distanceToLabelLine: 8,
            },
            labelLine: {
              show: true,
              length: 10,
              length2: 20,
              smooth: true,
              lineStyle: {
                color: '#ccc',
                width: 1,
              },
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
      const chartColors = getColors(colorScheme)

      // 根据数值范围分配颜色（城市分布使用）
      // 使用更少但对比度更高的颜色：每10个单位一个梯度，只取间隔较大的颜色
      const step = 10
      const colorIndices = [0, 3, 6, 9, 12, 15, 18] // 间隔取色，差异更大
      const getColorByValue = (value: number) => {
        const level = Math.floor(value / step)
        const colorIndex = colorIndices[Math.min(level, colorIndices.length - 1)]
        return chartColors[colorIndex]
      }

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
        color: chartColors,
        series: [
          {
            type: 'bar',
            barWidth: '60%',
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
            },
            data: barData.map((item) => ({
              value: item.value,
              itemStyle: {
                color: getColorByValue(item.value),
              },
            })),
          },
        ],
      }
    }

    // heatmap - 时段分布热力图
    if (type === 'heatmap') {
      const heatmapData = data as BarChartData[]
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#E5E5E5',
          textStyle: { color: '#333' },
          axisPointer: { type: 'shadow' },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: heatmapData.map((item) => item.name),
          axisLine: { lineStyle: { color: '#E5E5E5' } },
          axisLabel: { color: '#666', fontSize: 11, rotate: 30 },
        },
        yAxis: {
          type: 'category',
          data: ['时段'],
          axisLine: { lineStyle: { color: '#E5E5E5' } },
          axisLabel: { color: '#666', fontSize: 11 },
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapData.map((d) => d.value), 1),
          calculable: true,
          orient: 'vertical',
          right: '2%',
          top: 'center',
          itemWidth: 10,
          itemHeight: 120,
          textStyle: { color: '#666', fontSize: 10 },
          inRange: {
            color: ['#FFF7F5', '#FFD4C2', '#FFB08C', '#FF7744', '#FF6033', '#E55A2B'],
          },
        },
        series: [
          {
            type: 'heatmap',
            data: heatmapData.map((item, index) => [index, 0, item.value]),
            label: {
              show: true,
              color: '#fff',
              fontSize: 10,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }
    }

    // horizontalBar - 路线分布使用透明度配色
    const hBarData = data as BarChartData[]
    const hBarColors = getColors(colorScheme)

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
      series: [
        {
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
          },
          data: hBarData.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: hBarColors[index % hBarColors.length],
            },
          })).reverse(),
        },
      ],
    }
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      <ReactECharts ref={chartRef} option={getOption()} style={{ height }} />
    </div>
  )
})
