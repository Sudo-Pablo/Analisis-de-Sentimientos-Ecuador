import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutGrid, BarChart3 } from 'lucide-react'

const Header = ({ onOpenMenu, dark = false }) => (
  <header
    className={
      dark
        ? 'px-4 lg:px-8 py-3.5 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80'
        : 'glass-header px-4 lg:px-8 py-3.5 sticky top-0 z-50'
    }
  >
    <div className="flex items-center justify-between gap-4">
      <Link to="/dashboard" className="flex items-center gap-3 min-w-0 group">
        <div className="p-2 rounded-xl bg-gradient-to-br from-[#1877F2] via-[#00f2ea] to-[#ff0050] shadow-lg shadow-blue-900/30 group-hover:scale-105 transition-transform">
          <BarChart3 size={20} className="text-white" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <h1
            className={`text-base lg:text-lg font-bold truncate ${
              dark
                ? 'text-slate-100'
                : 'bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent'
            }`}
          >
            Análisis de Sentimientos
          </h1>
          <p className={`text-[11px] lg:text-xs truncate ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            Percepción pública en redes sociales
          </p>
        </div>
      </Link>

      <motion.button
        onClick={onOpenMenu}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white
                   bg-gradient-to-r from-[#1877F2] to-[#ff0050]
                   shadow-lg shadow-blue-900/20 hover:opacity-95 transition-all"
        whileTap={{ scale: 0.96 }}
        aria-label="Abrir explorador de módulos"
      >
        <LayoutGrid size={18} />
        <span className="hidden sm:inline">Explorar</span>
      </motion.button>
    </div>
  </header>
)

export default Header
