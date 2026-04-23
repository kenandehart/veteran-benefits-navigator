import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.tsx'
import LandingPage from './LandingPage'
import Questionnaire from './Questionnaire'
import ResultsPage from './ResultsPage'
import CataloguePage from './CataloguePage'
import DashboardPage from './DashboardPage'
import AdminFeedbackPage from './AdminFeedbackPage'
import PrivacyPage from './PrivacyPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import ResetPasswordPage from './ResetPasswordPage'

function App() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user?.hasResults && location.pathname === '/') {
      navigate('/dashboard', { replace: true })
    }
  }, [isLoading, user, location.pathname, navigate])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/benefits" element={<CataloguePage />} />
      <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  )
}

export default App
