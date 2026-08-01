import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { scaleIn } from '../utils/motion'

const ChartCard = ({
  title,
  subtitle,
  titleAction,
  children,
  className = '',
  delay = 0,
  dark = false,
  muted = false,
  collapsible = false,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen)

  const shell = dark
    ? 'bg-transparent border border-slate-700/40 rounded-2xl'
    : muted
      ? 'bg-white/45 backdrop-blur-md border border-white/50 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
      : 'card-base'

  const titleClass = dark ? 'text-slate-100' : muted ? 'text-slate-900' : 'text-slate-900'
  const subtitleClass = dark ? 'text-slate-400' : muted ? 'text-slate-800' : 'text-slate-500'

  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`text-base lg:text-lg font-bold ${titleClass}`}>{title}</h3>
        {titleAction}
      </div>
      {subtitle && (
        <p className={`text-xs lg:text-sm mt-0.5 ${subtitleClass}`}>{subtitle}</p>
      )}
    </>
  )

  const fillHeight = className.includes('h-full') || className.includes('flex-col')

  return (
    <motion.div
      className={`${shell} p-4 lg:p-6 ${collapsible ? 'overflow-hidden' : 'overflow-visible'} ${className}`}
      initial={scaleIn.initial}
      animate={scaleIn.animate}
      transition={{ ...scaleIn.transition, delay }}
    >
      <div className={collapsible && open ? 'mb-3 lg:mb-4' : collapsible ? '' : 'mb-3 lg:mb-4'}>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left group"
            aria-expanded={open}
          >
            <div className="min-w-0">{header}</div>
            <ChevronDown
              size={20}
              className={`shrink-0 transition-transform duration-200 group-hover:opacity-80 ${
                open ? 'rotate-180' : ''
              } ${dark ? 'text-slate-400' : 'text-slate-500'}`}
            />
          </button>
        ) : (
          header
        )}
        {collapsible && !open && (
          <p className={`text-xs mt-2 ${subtitleClass}`}>Pulsa para expandir</p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            key="content"
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`w-full ${collapsible ? 'overflow-hidden' : 'overflow-visible'} ${fillHeight ? 'flex-1 min-h-0 flex flex-col' : ''}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ChartCard
