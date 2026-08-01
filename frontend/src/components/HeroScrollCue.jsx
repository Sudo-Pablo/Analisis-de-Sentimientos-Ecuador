import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'

const HeroScrollCue = ({ expanded = false, onToggle }) => {
  return (
    <motion.button
      id="tour-historical-summary"
      type="button"
      onClick={onToggle}
      className="relative z-30 flex flex-col items-center gap-3 mx-auto
                 px-10 lg:px-12 py-4 lg:py-5 rounded-2xl
                 bg-slate-900/70 backdrop-blur-md border-2 border-[#67e8f9]/60
                 text-[#a5f3fc] hover:text-white hover:bg-slate-900/85 hover:border-[#67e8f9]
                 shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all duration-200
                 cursor-pointer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-expanded={expanded}
      aria-controls="dashboard-metrics-content"
      aria-label={expanded ? 'Ocultar resumen histórico' : 'Ver resumen histórico'}
    >
      <span className="text-sm lg:text-base font-bold uppercase tracking-[0.2em] text-center leading-snug">
        Resumen histórico
      </span>
      <motion.div
        animate={expanded ? undefined : { y: [0, 10, 0] }}
        transition={expanded ? undefined : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        {expanded ? (
          <ChevronUp size={36} strokeWidth={2} />
        ) : (
          <ChevronDown size={36} strokeWidth={2} />
        )}
      </motion.div>
    </motion.button>
  )
}

export default HeroScrollCue
