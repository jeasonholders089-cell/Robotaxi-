// 反馈状态
export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed'

// 情感倾向
export type Sentiment = 'positive' | 'neutral' | 'negative'

// 反馈类型
export type FeedbackType =
  | '行驶体验'
  | '车内环境'
  | '接驾体验'
  | '路线规划'
  | '安全感受'
  | '服务态度'
  | '其他'

// 反馈数据
export interface Feedback {
  id: string
  feedback_no?: string
  trip_id: string
  passenger_id: string
  vehicle_id: string
  city: string
  route: string
  route_start: string
  route_end: string
  trip_time: string
  trip_duration: number
  rating: number
  feedback_text: string
  feedback_pictures: string[]
  feedback_videos: string[]
  feedback_type: string[]
  sentiment: string
  keywords: string[]
  status: FeedbackStatus
  handler: string | null
  handler_notes: string | null
  handled_at: string | null
  ai_summary: string | null
  feedback_channel: string
  reply_text: string | null
  reply_time: string | null
  created_at: string
  updated_at: string
}

// 处理记录
export interface HandlingLog {
  id: number
  feedback_id: string
  operator: string
  action: 'status_update' | 'add_note' | 'category_correct'
  old_value: string | null
  new_value: string | null
  remark: string | null
  created_at: string
}

// 筛选状态
export interface FilterState {
  city: string[]
  route: string | null
  ratingMin: number
  ratingMax: number
  startDate: string | null
  endDate: string | null
  feedbackType: string[]
  status: string[]
  keyword: string
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: 'time' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

// 反馈列表响应
export interface FeedbackListResponse {
  total: number
  page: number
  page_size: number
  list: Feedback[]
}

// 反馈详情响应
export interface FeedbackDetailResponse extends Feedback {
  handling_logs: HandlingLog[]
}

// 核心指标
export interface OverviewStats {
  total_count: number
  today_count: number
  avg_rating: number
  positive_rate: number
  negative_rate: number
  pending_count: number
  trends: {
    total_count_change: number
    avg_rating_change: number
    positive_rate_change: number
  }
}

// 趋势数据
export interface TrendData {
  date: string
  count: number
  rating_avg: number
}

// 趋势响应
export interface TrendResponse {
  count_trend: TrendData[]
  rating_distribution: {
    rating: number
    count: number
    percentage: number
  }[]
}

// 分布数据
export interface DistributionData {
  city: string
  count: number
  percentage: number
}

export interface RouteDistribution {
  route: string
  count: number
  negative_rate: number
}

export interface TypeDistribution {
  type: string
  count: number
  percentage: number
}

export interface HourDistribution {
  hour: string
  count: number
}

export interface DistributionResponse {
  city_distribution: DistributionData[]
  route_distribution: RouteDistribution[]
  type_distribution: TypeDistribution[]
  hour_distribution: HourDistribution[]
}

// AI 摘要
export interface AISummary {
  summary: string
  generated_at: string
  analyzed_count: number
}

// 产品建议
export interface ProductSuggestion {
  priority: 'high' | 'medium' | 'low'
  category: string
  problem: string
  count: number
  percentage: number
  negative_rate: number
  user_voices: string[]
  suggestions: string[]
}

export interface AISuggestionsResponse {
  suggestions: ProductSuggestion[]
  type_distribution?: TypeDistribution[]
  generated_at: string
}

// API 响应格式
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 城市选项
export interface CityOption {
  value: string
  label: string
}

// 路线选项
export interface RouteOption {
  value: string
  label: string
  city: string
}
