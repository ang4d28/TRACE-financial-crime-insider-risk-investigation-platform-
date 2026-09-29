import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { Home } from './pages/Home'
import { CasesPage } from './pages/CasesPage'
import { DashboardPage } from './pages/DashboardPage'
import { CaseDetail } from './pages/CaseDetail'
import { GraphExplorerPage } from './pages/GraphExplorerPage'
import MetricsDashboard from './pages/MetricsDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/graph" element={<GraphExplorerPage />} />
        <Route path="/metrics" element={<MetricsDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
