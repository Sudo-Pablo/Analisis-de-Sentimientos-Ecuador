import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatNumber } from '../utils/formatters'

const ACCENT_BORDER = {
  primary: 'border-t-primary-500',
  positive: 'border-t-positive',
  negative: 'border-t-negative',
  neutral: 'border-t-neutral',
  purple: 'border-t-purple-500',
  blue: 'border-t-blue-500',
  green: 'border-t-emerald-500',
  gray: 'border-t-slate-400',
}

const ICON_STYLES = {
  primary: 'text-primary-600 bg-primary-50',
  positive: 'text-positive bg-emerald-50',
  negative: 'text-negative bg-red-50',
  neutral: 'text-neutral bg-slate-100',
  purple: 'text-purple-600 bg-purple-50',
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-emerald-600 bg-emerald-50',
  gray: 'text-slate-600 bg-slate-100',
}

const StatCard = ({ title, value, change, subtitle, icon: Icon, color = 'primary', index = 0 }) => {
  const isPositive = change > 0
  const displayValue = typeof value === 'string' ? value : formatNumber(value)
  const borderClass = ACCENT_BORDER[color] || ACCENT_BORDER.primary
  const iconClass = ICON_STYLES[color] || ICON_STYLES.primary

  return (
    <motion.div
      className={`card-interactive p-4 lg:p-6 border-t-[3px] ${borderClass}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs lg:text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1 lg:mb-2 truncate">
            {title}
          </p>
          <p className="text-xl lg:text-3xl font-bold text-slate-900 tabular-nums mb-1">
            {displayValue}
          </p>

          {subtitle && (
            <p className="text-xs lg:text-sm text-slate-500 mb-1">{subtitle}</p>
          )}

          {change !== undefined && change !== 0 && (
            <div className={`flex items-center gap-1 text-xs lg:text-sm ${isPositive ? 'text-positive' : 'text-negative'}`}>
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="font-semibold">{Math.abs(change)}%</span>
              <span className="text-slate-400 hidden lg:inline">vs. sem. anterior</span>
            </div>
          )}
        </div>

        {Icon && (
          <motion.div
            className={`p-2.5 lg:p-3 rounded-xl ${iconClass}`}
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Icon size={22} className="lg:hidden" strokeWidth={2} />
            <Icon size={26} className="hidden lg:block" strokeWidth={2} />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default StatCard
