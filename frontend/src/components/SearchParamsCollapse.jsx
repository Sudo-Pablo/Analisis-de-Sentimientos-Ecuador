import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Settings2 } from 'lucide-react'

const SearchParamsCollapse = ({ children, theme = 'topics', id, expandEvent }) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!expandEvent) return undefined
    const onExpand = () => setOpen(true)
    window.addEventListener(expandEvent, onExpand)
    return () => window.removeEventListener(expandEvent, onExpand)
  }, [expandEvent])

  const shellClass = {
    facebook: 'bg-white/40 border-white/50 text-slate-800',
    tiktok: 'bg-white/40 border-white/50 text-slate-800',
    topics: 'bg-white/35 border-white/40 text-slate-800',
  }[theme] || 'bg-white/35 border-white/40 text-slate-800'

  return (
    <div id={id} className={`rounded-2xl border backdrop-blur-md overflow-hidden ${shellClass}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 lg:px-5 py-3.5 text-left font-semibold text-sm lg:text-base hover:bg-white/20 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Settings2 size={18} className="opacity-70" />
          Personalización de parámetros de búsqueda
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 lg:px-5 pb-4 lg:pb-5 pt-1 border-t border-white/30 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchParamsCollapse
