import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components'

// Lazy load pages for code splitting
const Workbench = lazy(() => import('@/pages/Workbench').then((m) => ({ default: m.Workbench })))
const FeedbackManagement = lazy(() => import('@/pages/FeedbackManagement').then((m) => ({ default: m.FeedbackManagement })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const AiAnalysis = lazy(() => import('@/pages/AiAnalysis').then((m) => ({ default: m.AiAnalysis })))

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Workbench />} />
          <Route path="feedbacks" element={<FeedbackManagement />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="ai-analysis" element={<AiAnalysis />} />
        </Route>
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
