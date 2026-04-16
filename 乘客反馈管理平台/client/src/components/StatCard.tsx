import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

interface StatCardProps {
  title: string
  value: number | string
  suffix?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  trendLabel?: string
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
  loading?: boolean
}

export function StatCard({
  title,
  value,
  suffix,
  trend,
  trendLabel = '较上期',
  icon,
  className,
  onClick,
  loading,
}: StatCardProps) {
  const getTrendColor = () => {
    if (!trend) return 'text-gray-500'
    if (trend.direction === 'up') return 'text-green-500'
    if (trend.direction === 'down') return 'text-red-500'
    return 'text-gray-500'
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.direction === 'up') return <TrendingUp className="w-3 h-3" />
    if (trend.direction === 'down') return <TrendingDown className="w-3 h-3" />
    return <Minus className="w-3 h-3" />
  }

  if (loading) {
    return (
      <div className={clsx('card', className)}>
        <div className="animate-pulse">
          <div className="h-4 w-20 bg-gray-100 rounded mb-3" />
          <div className="h-8 w-24 bg-gray-100 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'card card-hover cursor-pointer',
        onClick && 'hover:border-primary hover:shadow-card-hover',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-800">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
        </p>
      </div>
      {trend && (
        <div className={clsx('mt-2 flex items-center gap-1', getTrendColor())}>
          {getTrendIcon()}
          <span className="text-xs">
            {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '' : ''}
            {trend.value}% {trendLabel}
          </span>
        </div>
      )}
    </div>
  )
}
