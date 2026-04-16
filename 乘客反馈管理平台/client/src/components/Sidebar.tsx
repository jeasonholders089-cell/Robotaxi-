import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '工作台' },
  { path: '/feedbacks', icon: ListTodo, label: '反馈列表' },
  { path: '/dashboard', icon: BarChart3, label: '数据仪表盘' },
  { path: '/ai-analysis', icon: Sparkles, label: 'AI 智能分析' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-20',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        {collapsed ? (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">滴</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">滴</span>
            </div>
            <span className="font-semibold text-gray-800">Robotaxi</span>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="py-4">
        {menuItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'sidebar-item',
                isActive && 'active',
                collapsed && 'justify-center px-0'
              )}
            >
              <item.icon
                className={clsx(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-primary' : 'text-gray-500'
                )}
              />
              {!collapsed && (
                <span
                  className={clsx(
                    'ml-3 text-sm',
                    isActive ? 'text-primary font-medium' : 'text-gray-600'
                  )}
                >
                  {item.label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        )}
      </button>
    </aside>
  )
}
