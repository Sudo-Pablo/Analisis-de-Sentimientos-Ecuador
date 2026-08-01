import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home, BarChart3, X, Video, Globe, Sparkles,
} from 'lucide-react'

const MENU_GROUPS = [
  {
    label: 'Análisis',
    items: [
      { path: '/dashboard', icon: Home, label: 'Inicio' },
      { path: '/analisis-tema', icon: BarChart3, label: 'Análisis por tema' },
    ],
  },
  {
    label: 'Búsqueda',
    items: [
      { path: '/buscador-tiktok', icon: Video, label: 'Buscador TikTok' },
      { path: '/buscador-facebook', icon: Globe, label: 'Buscador Facebook' },
    ],
  },
  // Metodología oculta en menús por ahora; ruta /metodologia se conserva.
]

const Sidebar = ({ isOpen = true, onClose }) => {
  const location = useLocation()

  const isActive = (path) =>
    location.pathname === path ||
    (location.pathname === '/' && path === '/dashboard')

  const handleLinkClick = () => {
    if (window.innerWidth < 1024 && onClose) onClose()
  }

  return (
    <>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-64 bg-gradient-to-b from-sidebar to-sidebar-accent text-white
          fixed left-0 top-[57px] lg:top-[64px] bottom-0 overflow-y-auto z-50
          border-r border-slate-700/50 shadow-xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>

        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Panel de control
            </span>
          </div>
        </div>

        <nav className="py-4 px-3">
          {MENU_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.path)

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleLinkClick}
                        className="relative block"
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 bg-primary-500/20 border border-primary-500/30 rounded-xl"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span
                          className={`
                            relative flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors
                            ${active
                              ? 'text-white font-semibold'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                          `}
                        >
                          <Icon size={18} className="flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
                          <span className="flex-1 truncate">{item.label}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
