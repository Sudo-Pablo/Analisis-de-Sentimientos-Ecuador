import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AnalisisTema from './pages/AnalisisTema'
import Metodologia from './pages/Metodologia'
import BuscadorTikTok from './pages/BuscadorTikTok'
import BuscadorFacebook from './pages/BuscadorFacebook'

function App() {
  return (
    <FilterProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analisis-tema" element={<AnalisisTema />} />
            <Route path="/metodologia" element={<Metodologia />} />
            <Route path="/buscador-tiktok" element={<BuscadorTikTok />} />
            <Route path="/buscador-facebook" element={<BuscadorFacebook />} />
          </Route>
        </Routes>
      </Router>
    </FilterProvider>
  )
}

export default App
