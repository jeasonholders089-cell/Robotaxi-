import React from 'react'
import { useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import clsx from 'clsx'

interface HeaderProps {
  sidebarCollapsed: boolean
}

const pageTitles: Record<string, { title: string; breadcrumbs: string[] }> = {
  '/': { title: '工作台', breadcrumbs: ['首页'] },
  '/feedbacks': { title: '反馈列表', breadcrumbs: ['反馈管理', '反馈列表'] },
  '/dashboard': { title: '数据仪表盘', breadcrumbs: ['数据统计', '仪表盘'] },
  '/ai-analysis': { title: 'AI 智能分析', breadcrumbs: ['AI 智能', '分析中心'] },
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const location = useLocation()
  const pageInfo = pageTitles[location.pathname] || { title: '', breadcrumbs: [] }

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
        {pageInfo.breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb}>
            <span className="text-gray-400">/</span>
            <span
              className={clsx(
                index === pageInfo.breadcrumbs.length - 1
                  ? 'text-gray-800 font-medium'
                  : 'text-gray-400'
              )}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Page Title */}
      <h1 className="ml-6 text-xl font-semibold text-gray-800">
        {pageInfo.title}
      </h1>
    </header>
  )
}
