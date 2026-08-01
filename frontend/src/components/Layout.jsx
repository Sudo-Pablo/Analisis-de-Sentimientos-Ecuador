import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from './PageTransition'
import FloatingNavDock from './FloatingNavDock'
import VisualMenuOverlay from './VisualMenuOverlay'

const Layout = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'

  return (
    <div className="min-h-screen overflow-x-hidden">
      <VisualMenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className={`min-h-screen overflow-x-hidden ${isDashboard ? '' : 'px-4 lg:px-8'}`}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      <FloatingNavDock onOpenMenu={() => setMenuOpen(true)} />
    </div>
  )
}

export default Layout
