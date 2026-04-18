import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { NavigationProvider } from './NavigationContext'
import clsx from 'clsx'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <NavigationProvider>
      <div className="min-h-screen bg-gray-100">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main
          className={clsx(
            'pt-16 min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'ml-16' : 'ml-[220px]'
          )}
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </NavigationProvider>
  )
}
