import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { useNavigation } from './NavigationContext'
import clsx from 'clsx'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const firstLevelMenu = [
  { path: '/', icon: LayoutDashboard, label: '工作台' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeSection, setActiveSection } = useNavigation()
  const [userFeedbackExpanded, setUserFeedbackExpanded] = useState(true)

  // 用户反馈下的二级菜单
  const feedbackSections = [
    { id: 'list', label: '反馈列表' },
    { id: 'dashboard', label: '数据仪表盘' },
    { id: 'ai', label: 'AI智能分析' },
  ]

  const isOnFeedbackPage = location.pathname === '/feedbacks'

  // 滚动到对应模块，并让标题置顶
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  // 点击用户反馈一级菜单
  const handleUserFeedbackClick = () => {
    if (!isOnFeedbackPage) {
      navigate('/feedbacks')
      setUserFeedbackExpanded(true)
      setActiveSection('list')
      setTimeout(() => scrollToSection('list'), 150)
    } else {
      setUserFeedbackExpanded(!userFeedbackExpanded)
      if (!userFeedbackExpanded) {
        setActiveSection('list')
      }
    }
  }

  // 点击二级菜单
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId)
    if (!isOnFeedbackPage) {
      navigate('/feedbacks')
      setUserFeedbackExpanded(true)
      setTimeout(() => scrollToSection(sectionId), 150)
    } else {
      scrollToSection(sectionId)
    }
  }

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
        {/* 一级菜单：工作台 */}
        {firstLevelMenu.map((item) => {
          const isActive = location.pathname === item.path
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

        {/* 一级菜单：用户反馈 */}
        <div>
          <button
            onClick={handleUserFeedbackClick}
            className={clsx(
              'sidebar-item w-full',
              isOnFeedbackPage && 'active',
              collapsed && 'justify-center px-0'
            )}
          >
            <MessageSquare
              className={clsx(
                'w-5 h-5 flex-shrink-0',
                isOnFeedbackPage ? 'text-primary' : 'text-gray-500'
              )}
            />
            {!collapsed && (
              <div className="ml-3 flex-1 flex items-center justify-between">
                <span
                  className={clsx(
                    'text-sm',
                    isOnFeedbackPage ? 'text-primary font-medium' : 'text-gray-600'
                  )}
                >
                  用户反馈
                </span>
                {userFeedbackExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 transform rotate-180" />
                )}
              </div>
            )}
          </button>

          {/* 二级菜单 */}
          {!collapsed && userFeedbackExpanded && isOnFeedbackPage && (
            <div className="ml-4 border-l border-gray-200">
              {feedbackSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={clsx(
                    'sidebar-item text-sm w-full',
                    activeSection === section.id && 'text-primary'
                  )}
                >
                  <span className="w-5 h-5 flex-shrink-0" />
                  <span
                    className={clsx(
                      activeSection === section.id ? 'text-primary font-medium' : 'text-gray-600'
                    )}
                  >
                    {section.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        )}
      </button>
    </aside>
  )
}