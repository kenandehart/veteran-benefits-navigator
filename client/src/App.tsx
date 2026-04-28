import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import { usePageViewTracking } from './hooks/usePageViewTracking'
import { hasAnonResults } from './anonResults'
import ScrollToTop from './components/ScrollToTop'
import LandingPage from './LandingPage'
import Questionnaire from './Questionnaire'
import ResultsPage from './ResultsPage'
import CataloguePage from './CataloguePage'
import BenefitDetailPage from './BenefitDetailPage'
import DashboardPage from './DashboardPage'
import AdminPage from './AdminPage'
import PrivacyPage from './PrivacyPage'
import AboutPage from './AboutPage'
import ResourcesPage from './ResourcesPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'

function App() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  usePageViewTracking()

  useEffect(() => {
    if (isLoading) return
    if (location.pathname !== '/') return
    if (user?.hasResults) {
      navigate('/dashboard', { replace: true })
      return
    }
    if (!user && hasAnonResults()) {
      navigate('/results', { replace: true, state: { fromAnonSnapshot: true } })
    }
  }, [isLoading, user, location.pathname, navigate])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/benefits" element={<CataloguePage />} />
        <Route path="/benefits/:slug" element={<BenefitDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/feedback" element={<Navigate to="/admin" replace />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </>
  )
}

export default App
