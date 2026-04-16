import React, { useState } from 'react'
import { ChevronDown, X, Search, Filter } from 'lucide-react'
import clsx from 'clsx'
import { useFilterStore } from '@/stores'
import dayjs from 'dayjs'

const ratingOptions = [
  { value: 5, label: '5星' },
  { value: 4, label: '4星' },
  { value: 3, label: '3星' },
  { value: 2, label: '2星' },
  { value: 1, label: '1星' },
]

const feedbackTypeOptions = [
  '行驶体验',
  '车内环境',
  '接驾体验',
  '路线规划',
  '安全感受',
  '其他',
]

const statusOptions = [
  { value: 'pending', label: '待处理', color: '#FAAD14' },
  { value: 'processing', label: '处理中', color: '#1890FF' },
  { value: 'resolved', label: '已解决', color: '#52C41A' },
  { value: 'closed', label: '已关闭', color: '#999999' },
]

const cityOptions = ['北京', '上海', '广州', '深圳', '武汉', '杭州', '成都', '重庆']

const routeOptions = [
  '望京SOHO → 798艺术区',
  '北京首都机场 → 国贸CBD',
  '武汉天河机场 → 光谷广场',
  '深圳湾体育中心 → 华强北',
  '广州塔 → 珠江新城',
]

interface FilterBarProps {
  onSearch?: () => void
}

export function FilterBar({ onSearch }: FilterBarProps) {
  const { filters, setFilters, resetFilters, setRatingRange, setCities, setFeedbackTypes, setStatuses, setDateRange, setKeyword } = useFilterStore()
  const [expanded, setExpanded] = useState(false)
  const [showRatingDropdown, setShowRatingDropdown] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showRouteDropdown, setShowRouteDropdown] = useState(false)

  const handleRatingChange = (rating: number) => {
    const currentRatings = []
    for (let i = filters.ratingMin; i <= filters.ratingMax; i++) {
      currentRatings.push(i)
    }

    if (currentRatings.includes(rating)) {
      const newRatings = currentRatings.filter((r) => r !== rating)
      if (newRatings.length > 0) {
        setRatingRange(Math.min(...newRatings), Math.max(...newRatings))
      } else {
        setRatingRange(1, 5)
      }
    } else {
      const newRatings = [...currentRatings, rating].sort()
      setRatingRange(Math.min(...newRatings), Math.max(...newRatings))
    }
  }

  const getSelectedRatings = () => {
    const ratings = []
    for (let i = filters.ratingMin; i <= filters.ratingMax; i++) {
      ratings.push(i)
    }
    return ratings
  }

  const handleCityToggle = (city: string) => {
    if (filters.city.includes(city)) {
      setCities(filters.city.filter((c) => c !== city))
    } else {
      setCities([...filters.city, city])
    }
  }

  const handleTypeToggle = (type: string) => {
    if (filters.feedbackType.includes(type)) {
      setFeedbackTypes(filters.feedbackType.filter((t) => t !== type))
    } else {
      setFeedbackTypes([...filters.feedbackType, type])
    }
  }

  const handleStatusToggle = (status: string) => {
    if (filters.status.includes(status)) {
      setStatuses(filters.status.filter((s) => s !== status))
    } else {
      setStatuses([...filters.status, status])
    }
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.ratingMin > 1 || filters.ratingMax < 5) count++
    if (filters.city.length > 0) count++
    if (filters.feedbackType.length > 0) count++
    if (filters.status.length > 0) count++
    if (filters.startDate || filters.endDate) count++
    if (filters.route) count++
    if (filters.keyword) count++
    return count
  }

  return (
    <div className="card mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">筛选条件</span>
          {getActiveFilterCount() > 0 && (
            <span className="badge bg-primary text-white">
              {getActiveFilterCount()} 个条件
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getActiveFilterCount() > 0 && (
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-primary"
            >
              清除全部
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary hover:text-primary-dark"
          >
            {expanded ? '收起筛选' : '展开筛选'}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Rating Filter */}
        <div className="relative">
          <button
            onClick={() => setShowRatingDropdown(!showRatingDropdown)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors',
              filters.ratingMin > 1 || filters.ratingMax < 5
                ? 'border-primary bg-primary-light text-primary'
                : 'border-gray-200 text-gray-600 hover:border-primary'
            )}
          >
            评分范围
            {filters.ratingMin > 1 || filters.ratingMax < 5
              ? `${filters.ratingMin}-${filters.ratingMax}星`
              : '全部'}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showRatingDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
              {ratingOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={getSelectedRatings().includes(option.value)}
                    onChange={() => handleRatingChange(option.value)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* City Filter */}
        <div className="relative">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors',
              filters.city.length > 0
                ? 'border-primary bg-primary-light text-primary'
                : 'border-gray-200 text-gray-600 hover:border-primary'
            )}
          >
            城市 {filters.city.length > 0 && `(${filters.city.length})`}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showCityDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
              {cityOptions.map((city) => (
                <label
                  key={city}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={filters.city.includes(city)}
                    onChange={() => handleCityToggle(city)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{city}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Type Filter */}
        <div className="relative">
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors',
              filters.feedbackType.length > 0
                ? 'border-primary bg-primary-light text-primary'
                : 'border-gray-200 text-gray-600 hover:border-primary'
            )}
          >
            反馈类型 {filters.feedbackType.length > 0 && `(${filters.feedbackType.length})`}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showTypeDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
              {feedbackTypeOptions.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={filters.feedbackType.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors',
              filters.status.length > 0
                ? 'border-primary bg-primary-light text-primary'
                : 'border-gray-200 text-gray-600 hover:border-primary'
            )}
          >
            状态 {filters.status.length > 0 && `(${filters.status.length})`}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={filters.status.includes(option.value)}
                    onChange={() => handleStatusToggle(option.value)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="flex items-center gap-1.5 text-sm text-gray-700">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Keyword Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索关键词..."
              value={filters.keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* Route Filter */}
            <div className="relative">
              <button
                onClick={() => setShowRouteDropdown(!showRouteDropdown)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors',
                  filters.route
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary'
                )}
              >
                路线 {filters.route ? '已选' : '全部'}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showRouteDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilters({ route: null })
                      setShowRouteDropdown(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    全部路线
                  </button>
                  {routeOptions.map((route) => (
                    <button
                      key={route}
                      onClick={() => {
                        setFilters({ route })
                        setShowRouteDropdown(false)
                      }}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 rounded',
                        filters.route === route ? 'text-primary bg-primary-light' : 'text-gray-600'
                      )}
                    >
                      {route}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">时间范围：</span>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setDateRange(e.target.value || null, filters.endDate)}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setDateRange(filters.startDate, e.target.value || null)}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {getActiveFilterCount() > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">已选条件：</span>

            {(filters.ratingMin > 1 || filters.ratingMax < 5) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs">
                {filters.ratingMin}-{filters.ratingMax}星
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => setRatingRange(1, 5)}
                />
              </span>
            )}

            {filters.city.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs"
              >
                {city}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => handleCityToggle(city)}
                />
              </span>
            ))}

            {filters.feedbackType.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs"
              >
                {type}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => handleTypeToggle(type)}
                />
              </span>
            ))}

            {filters.status.map((status) => {
              const statusOption = statusOptions.find((s) => s.value === status)
              return (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs"
                >
                  {statusOption?.label}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                    onClick={() => handleStatusToggle(status)}
                  />
                </span>
              )
            })}

            {filters.startDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs">
                {dayjs(filters.startDate).format('YYYY-MM-DD')}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => setDateRange(null, filters.endDate)}
                />
              </span>
            )}

            {filters.endDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs">
                {dayjs(filters.endDate).format('YYYY-MM-DD')}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => setDateRange(filters.startDate, null)}
                />
              </span>
            )}

            {filters.route && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs">
                {filters.route}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => setFilters({ route: null })}
                />
              </span>
            )}

            {filters.keyword && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-light text-primary rounded text-xs">
                关键词: {filters.keyword}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-primary-dark"
                  onClick={() => setKeyword('')}
                />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showRatingDropdown || showCityDropdown || showTypeDropdown || showStatusDropdown || showRouteDropdown) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowRatingDropdown(false)
            setShowCityDropdown(false)
            setShowTypeDropdown(false)
            setShowStatusDropdown(false)
            setShowRouteDropdown(false)
          }}
        />
      )}
    </div>
  )
}
