import { motion, AnimatePresence } from 'framer-motion'
import { X, LayoutGrid } from 'lucide-react'
import { EXPLORE_NAV_ITEMS } from '../config/navigation'
import { NavCard } from './NavigationHub'
import SocialHeroBackground from './SocialHeroBackground'
import { staggerContainer } from '../utils/motion'

const VisualMenuOverlay = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="fixed inset-x-0 top-0 bottom-0 z-[70] overflow-y-auto"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="explore-menu-title"
        >
          <div className="relative min-h-full">
            <SocialHeroBackground />

            <div className="relative z-10 p-4 lg:p-8 pt-8 lg:pt-12 pb-28">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start justify-between gap-4 mb-8 lg:mb-10">
                  <div>
                    <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-[#1877F2] via-[#00f2ea] to-[#ff0050] shadow-lg shadow-blue-900/40 mb-4">
                      <LayoutGrid size={20} className="text-white" strokeWidth={1.75} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] mb-2">
                      <span className="text-[#60a5fa]">Navegación</span>
                      <span className="text-slate-500 mx-2">·</span>
                      <span className="text-[#67e8f9]">Módulos</span>
                    </p>
                    <h2
                      id="explore-menu-title"
                      className="text-2xl lg:text-4xl font-bold text-slate-100 tracking-tight"
                    >
                      Explorar
                    </h2>
                    <p className="text-slate-400 text-sm lg:text-base mt-2 max-w-md">
                      Accede a las secciones disponibles del sistema.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-3 rounded-2xl bg-slate-900/70 border border-slate-600/50 text-slate-300
                               hover:bg-slate-800 hover:text-white transition-colors backdrop-blur-sm"
                    aria-label="Cerrar menú"
                  >
                    <X size={22} />
                  </button>
                </div>

                <motion.div
                  className="grid grid-cols-2 gap-3 lg:gap-4"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {EXPLORE_NAV_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className={item.size === 'large' ? 'col-span-2' : 'col-span-1'}
                    >
                      <NavCard item={item} onNavigate={onClose} />
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
)

export default VisualMenuOverlay
