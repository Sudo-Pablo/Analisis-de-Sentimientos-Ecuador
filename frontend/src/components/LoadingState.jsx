import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

const LoadingState = ({ message = 'Cargando datos...', dark = false }) => (
  <motion.div
    className="flex flex-col items-center justify-center py-16"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2 }}
  >
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
      <div className={`relative p-4 rounded-2xl shadow-card border ${
        dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'
      }`}>
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    </div>
    <p className={`mt-4 text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{message}</p>
  </motion.div>
)

export default LoadingState
