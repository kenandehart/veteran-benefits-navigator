import { Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import Questionnaire from './Questionnaire'
import ResultsPage from './ResultsPage'
import CataloguePage from './CataloguePage'
import DashboardPage from './DashboardPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/benefits" element={<CataloguePage />} />
    </Routes>
  )
}

export default App
