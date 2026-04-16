import React, { useState } from 'react'
import { X, Star, Clock, MapPin, Car, User, Calendar, Tag, MessageSquare, Edit2 } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import type { FeedbackDetailResponse, FeedbackStatus } from '@/types'

const statusConfig: Record<FeedbackStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待处理', color: '#FAAD14', bgColor: '#FFFBE6' },
  processing: { label: '处理中', color: '#1890FF', bgColor: '#E6F7FF' },
  resolved: { label: '已解决', color: '#52C41A', bgColor: '#F6FFED' },
  closed: { label: '已关闭', color: '#999999', bgColor: '#F5F5F5' },
}

const typeColors: Record<string, string> = {
  '行驶体验': '#FF7A45',
  '车内环境': '#36CBCB',
  '接驾体验': '#1890FF',
  '路线规划': '#975FE4',
  '安全感受': '#F5222D',
  '服务态度': '#FAAD14',
  '其他': '#999999',
}

const sentimentConfig: Record<string, { label: string; color: string }> = {
  '正面': { label: '正面', color: '#52C41A' },
  '中性': { label: '中性', color: '#FAAD14' },
  '负面': { label: '负面', color: '#F5222D' },
}

interface FeedbackDetailProps {
  feedback: FeedbackDetailResponse | null
  open: boolean
  loading: boolean
  onClose: () => void
  onUpdateStatus: (id: string, status: string) => void
  onAddNote: (id: string, note: string) => void
}

export function FeedbackDetail({
  feedback,
  open,
  loading,
  onClose,
  onUpdateStatus,
  onAddNote,
}: FeedbackDetailProps) {
  const [editing, setEditing] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleStatusChange = async () => {
    if (!feedback || !newStatus) return
    setSaving(true)
    try {
      await onUpdateStatus(feedback.id, newStatus)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!feedback || !newNote.trim()) return
    setSaving(true)
    try {
      await onAddNote(feedback.id, newNote)
      setNewNote('')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">反馈详情</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-100 rounded-lg mb-4" />
              <div className="h-48 bg-gray-100 rounded-lg mb-4" />
              <div className="h-32 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ) : feedback ? (
          <div className="p-6 space-y-6">
            {/* Basic Info Card */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-4">基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">反馈ID</p>
                  <p className="text-sm font-medium text-gray-800">{feedback.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">状态</p>
                  <div className="flex items-center gap-2">
                    {editing ? (
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="select flex-1"
                      >
                        <option value="pending">待处理</option>
                        <option value="processing">处理中</option>
                        <option value="resolved">已解决</option>
                        <option value="closed">已关闭</option>
                      </select>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: statusConfig[feedback.status].bgColor,
                          color: statusConfig[feedback.status].color,
                        }}
                      >
                        {statusConfig[feedback.status].label}
                      </span>
                    )}
                    {!editing && (
                      <button
                        onClick={() => {
                          setEditing(true)
                          setNewStatus(feedback.status)
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    {editing && (
                      <>
                        <button
                          onClick={handleStatusChange}
                          disabled={saving}
                          className="btn-primary text-xs py-1"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          className="btn-secondary text-xs py-1"
                        >
                          取消
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">评分</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={clsx(
                          'w-4 h-4',
                          star <= feedback.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                    <span className="text-sm text-gray-600">{feedback.rating}星</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">行程时间</p>
                  <p className="text-sm text-gray-800">
                    {dayjs(feedback.trip_time).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">时长</p>
                  <p className="text-sm text-gray-800">{feedback.trip_duration}分钟</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">城市</p>
                  <p className="text-sm text-gray-800">{feedback.city}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-1">路线</p>
                  <p className="text-sm text-gray-800">
                    {feedback.route_start} → {feedback.route_end}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">车辆ID</p>
                  <p className="text-sm text-gray-800">{feedback.vehicle_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">乘客ID</p>
                  <p className="text-sm text-gray-800">{feedback.passenger_id}</p>
                </div>
              </div>
            </div>

            {/* Feedback Content */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-4">反馈内容</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {feedback.feedback_text}
              </p>
            </div>

            {/* Media Attachments */}
            {(feedback.feedback_pictures?.length || feedback.feedback_videos?.length) ? (
              <div className="card">
                <h3 className="text-sm font-medium text-gray-500 mb-4">附件媒体</h3>
                <div className="space-y-4">
                  {/* Pictures */}
                  {feedback.feedback_pictures && feedback.feedback_pictures.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">图片 ({feedback.feedback_pictures.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {feedback.feedback_pictures.map((pic, idx) => (
                          <a
                            key={idx}
                            href={pic}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-video bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={pic}
                              alt={`附件图片 ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999">图片</text></svg>'
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Videos */}
                  {feedback.feedback_videos && feedback.feedback_videos.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">视频 ({feedback.feedback_videos.length})</p>
                      <div className="space-y-2">
                        {feedback.feedback_videos.map((vid, idx) => (
                          <a
                            key={idx}
                            href={vid}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                            <span className="text-sm text-gray-600">视频 {idx + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* AI Analysis */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-4">AI 分析结果</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">分类标签</p>
                  <div className="flex flex-wrap gap-2">
                    {feedback.feedback_type.map((type) => (
                      <span
                        key={type}
                        className="badge"
                        style={{
                          backgroundColor: `${typeColors[type]}20`,
                          color: typeColors[type],
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">关键词</p>
                  <div className="flex flex-wrap gap-2">
                    {feedback.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        #{keyword}
                      </span>
                    ))}
                  </div>
                </div>
                {feedback.ai_summary && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">AI 摘要</p>
                    <p className="text-sm text-gray-700">{feedback.ai_summary}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Handling Logs */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-4">处理记录</h3>
              {feedback.handling_logs && feedback.handling_logs.length > 0 ? (
                <div className="space-y-4">
                  {feedback.handling_logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0"
                    >
                      <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            {log.operator}
                          </span>
                          <span className="text-xs text-gray-400">
                            {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {log.action === 'status_update' && log.old_value && log.new_value && (
                            <>状态更新: {log.old_value} → {log.new_value}</>
                          )}
                          {log.action === 'add_note' && log.remark && (
                            <>添加备注: {log.remark}</>
                          )}
                          {log.action === 'category_correct' && (
                            <>分类校正</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">暂无处理记录</p>
              )}

              {/* Add Note */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="添加处理备注..."
                  className="input resize-none"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    className="btn-primary"
                  >
                    添加备注
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">未找到反馈详情</div>
        )}
      </div>
    </>
  )
}
