import React from 'react'
import { useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useNavigation } from './NavigationContext'
import clsx from 'clsx'

interface HeaderProps {
  sidebarCollapsed: boolean
}

const sectionLabels: Record<string, string> = {
  'list': '反馈列表',
  'dashboard': '数据仪表盘',
  'ai': 'AI智能分析',
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const location = useLocation()
  const { activeSection } = useNavigation()

  const isFeedbackPage = location.pathname === '/feedbacks'
  const isWorkbenchPage = location.pathname === '/'

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-6 transition-all duration-300 z-10',
        sidebarCollapsed ? 'left-16' : 'left-[220px]'
      )}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Home className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400">/</span>
        {isWorkbenchPage ? (
          <span className="text-gray-800 font-medium">工作台</span>
        ) : isFeedbackPage ? (
          <>
            <span className="text-gray-600">用户反馈</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-medium">
              {sectionLabels[activeSection] || '反馈列表'}
            </span>
          </>
        ) : null}
      </div>
    </header>
  )
}
