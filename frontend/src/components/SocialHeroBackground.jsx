import { motion, useReducedMotion } from 'framer-motion'

const FLOATERS = [
  { size: 6, top: '28%', left: '18%', color: '#1877F2', duration: 9, delay: 0 },
  { size: 4, top: '42%', left: '78%', color: '#00f2ea', duration: 11, delay: 1.2 },
  { size: 5, top: '55%', left: '12%', color: '#ff0050', duration: 10, delay: 0.6 },
  { size: 3, top: '35%', left: '88%', color: '#67e8f9', duration: 8, delay: 2 },
  { size: 4, top: '48%', left: '50%', color: '#60a5fa', duration: 12, delay: 0.3 },
  { size: 3, top: '62%', left: '65%', color: '#c9185a', duration: 9.5, delay: 1.8 },
  { size: 5, top: '32%', left: '42%', color: '#00f2ea', duration: 10.5, delay: 0.9 },
  { size: 4, top: '58%', left: '35%', color: '#1877F2', duration: 11.5, delay: 1.5 },
]

const SocialHeroBackground = () => {
  const reduceMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#0a0f1a]">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0c1222] to-slate-900" />

      {/* Auroras centrales — detrás del título y buscador */}
      <motion.div
        className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(95vw,780px)] h-[380px] rounded-full bg-[#1877F2]/22 blur-[90px] pointer-events-none"
        animate={
          reduceMotion
            ? undefined
            : { x: [-50, 55, -30, 0], y: [-35, 40, -20, 0], scale: [1, 1.15, 0.92, 1] }
        }
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(85vw,640px)] h-[300px] rounded-full bg-[#ff0050]/16 blur-[80px] pointer-events-none"
        animate={
          reduceMotion
            ? undefined
            : { x: [40, -45, 25, 0], y: [30, -35, 15, 0], scale: [1, 1.1, 0.94, 1] }
        }
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(80vw,560px)] h-[260px] rounded-full bg-[#00f2ea]/14 blur-[75px] pointer-events-none"
        animate={
          reduceMotion
            ? undefined
            : { x: [-30, 35, -15, 0], y: [25, -30, 10, 0], scale: [0.95, 1.08, 1, 0.95] }
        }
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Orbes en esquinas */}
      <motion.div
        className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-[#1877F2]/25 blur-[100px] pointer-events-none"
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 90, 40, 0], y: [0, 55, 85, 0] }
        }
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/4 -right-32 w-[480px] h-[480px] rounded-full bg-[#00f2ea]/18 blur-[90px] pointer-events-none"
        animate={
          reduceMotion
            ? undefined
            : { x: [0, -75, -25, 0], y: [0, 60, -40, 0] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/4 w-[440px] h-[440px] rounded-full bg-[#ff0050]/20 blur-[85px] pointer-events-none"
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 60, -50, 0], y: [0, -55, 35, 0] }
        }
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Halo rotatorio suave */}
      {!reduceMotion && (
        <motion.div
          className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw,900px)] h-[420px] pointer-events-none opacity-30"
          style={{
            background:
              'conic-gradient(from 0deg, transparent, #1877F2 15%, transparent 30%, #00f2ea 45%, transparent 60%, #ff0050 75%, transparent 90%)',
            filter: 'blur(60px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Grilla en movimiento */}
      <motion.div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '100% 48px, 48px 100%',
        }}
        animate={
          reduceMotion
            ? undefined
            : { backgroundPosition: ['0px 0px, 0px 0px', '0px 48px, 48px 0px'] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      {/* Partículas flotantes */}
      {FLOATERS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 18, -12, 8, 0],
                  y: [0, -22, 14, -8, 0],
                  opacity: [0.35, 0.85, 0.5, 0.9, 0.35],
                  scale: [1, 1.4, 0.9, 1.2, 1],
                }
          }
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,15,26,0.6)_100%)] pointer-events-none" />
    </div>
  )
}

export default SocialHeroBackground
