import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'

const PADDING = 10

const getTargetRect = (targetId) => {
  if (!targetId) return null
  const el = document.getElementById(targetId)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * Tour guiado genérico con spotlight.
 * @param {Array} steps - [{ id, title, body, target? }]
 * @param {() => boolean} hasCompleted
 * @param {() => void} markComplete
 * @param {string} [startEvent] - CustomEvent para reiniciar el tour
 * @param {boolean} [enabled=true]
 * @param {(step, helpers) => void} [onStepEnter] - efectos al entrar a un paso
 */
const GuidedTour = ({
  steps = [],
  hasCompleted,
  markComplete,
  startEvent,
  enabled = true,
  onStepEnter,
  startDelay = 700,
}) => {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState(null)

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const finish = useCallback(() => {
    markComplete?.()
    setActive(false)
  }, [markComplete])

  const refreshSpotlight = useCallback(() => {
    const next = getTargetRect(step?.target)
    setSpotlight(next)
    if (step?.target && next && !step.scrollTop && step.cardAlign !== 'center') {
      const el = document.getElementById(step.target)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [step])

  useEffect(() => {
    if (!enabled || !steps.length) return undefined
    if (hasCompleted?.()) return undefined

    const timer = setTimeout(() => {
      setActive(true)
      setStepIndex(0)
    }, startDelay)

    return () => clearTimeout(timer)
  }, [enabled, hasCompleted, steps.length, startDelay])

  useEffect(() => {
    if (!enabled || !startEvent) return undefined
    const onStart = () => {
      setStepIndex(0)
      setActive(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener(startEvent, onStart)
    return () => window.removeEventListener(startEvent, onStart)
  }, [enabled, startEvent])

  useEffect(() => {
    if (!active || !step) return undefined
    const timers = []
    const schedule = (fn, ms) => {
      timers.push(window.setTimeout(fn, ms))
    }
    onStepEnter?.(step, { refreshSpotlight, schedule })
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [active, step, onStepEnter, refreshSpotlight])

  useLayoutEffect(() => {
    if (!active) return undefined
    refreshSpotlight()
    const onResize = () => refreshSpotlight()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [active, stepIndex, refreshSpotlight])

  const goNext = () => {
    if (isLast) {
      finish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  if (!active || !step) return null

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const cardWidth = Math.min(360, vw - 32)

  let cardTop = vh / 2 - 120
  let cardLeft = (vw - cardWidth) / 2

  if (step.cardAlign === 'center') {
    cardTop = Math.max(16, vh / 2 - 140)
    cardLeft = (vw - cardWidth) / 2
  } else if (spotlight) {
    const below = spotlight.top + spotlight.height + 16
    const above = spotlight.top - 200
    const preferBelow = below + 220 < vh
    cardTop = preferBelow ? below : Math.max(16, above)
    cardLeft = clamp(spotlight.left + spotlight.width / 2 - cardWidth / 2, 16, vw - cardWidth - 16)
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
      >
        {spotlight ? (
          <>
            <div className="absolute inset-0" onClick={finish} aria-hidden="true" />
            <motion.div
              className="absolute rounded-2xl pointer-events-none bg-transparent border-2 border-[#67e8f9]/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.42)]"
              initial={false}
              animate={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-950/40" onClick={finish} />
        )}

        <motion.div
          key={step.id}
          className="absolute z-[101] rounded-2xl border border-slate-600/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-5 text-left"
          style={{ top: cardTop, left: cardLeft, width: cardWidth }}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1877F2] via-[#00f2ea] to-[#ff0050] text-white shrink-0">
                <Sparkles size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Tour {stepIndex + 1} / {steps.length}
                </p>
                <h2 id="guided-tour-title" className="text-base font-bold text-slate-50 leading-snug">
                  {step.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={finish}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Cerrar tour"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            {step.body}
          </p>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors px-1"
            >
              Saltar
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 border border-slate-600/70 hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Atrás
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-[#67e8f9] hover:bg-[#a5f3fc] transition-colors"
              >
                {isLast ? 'Listo' : 'Siguiente'}
                {!isLast && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

export default GuidedTour
