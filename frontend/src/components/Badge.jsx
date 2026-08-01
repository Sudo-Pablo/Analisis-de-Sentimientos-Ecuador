import { getSentimentColor } from '../utils/formatters'

const VARIANT_STYLES = {
  success: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  danger: 'text-red-700 bg-red-50 border border-red-200',
  secondary: 'text-slate-600 bg-slate-100 border border-slate-200',
}

const Badge = ({ sentiment, variant, children, className = '' }) => {
  const styleClass = variant
    ? VARIANT_STYLES[variant] || VARIANT_STYLES.secondary
    : getSentimentColor(sentiment)

  const label = children ?? sentiment

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize
        ${styleClass}
        ${className}
      `}
    >
      {label}
    </span>
  )
}

export default Badge
