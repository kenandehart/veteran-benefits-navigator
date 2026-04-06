import { Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import Questionnaire from './Questionnaire'
import ResultsPage from './ResultsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  )
}

export default App
