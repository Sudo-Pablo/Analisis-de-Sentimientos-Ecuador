import { motion } from 'framer-motion'
import { fadeInUp } from '../utils/motion'

const PageHeader = ({
  title,
  description,
  action,
  titleAction,
  badge,
  filter,
  dark = false,
  filterBelowTitle = false,
}) => (
  <motion.div
    className={
      filterBelowTitle
        ? 'flex flex-col gap-4'
        : 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'
    }
    {...fadeInUp}
  >
    <div className={filterBelowTitle ? 'w-full' : undefined}>
      {badge && (
        typeof badge === 'string' ? (
          <span
            className={`inline-block mb-2 px-3 py-1 text-xs font-semibold rounded-full ${
              dark
                ? 'bg-slate-800/80 text-slate-300 border border-slate-600/60'
                : 'bg-primary-50 text-primary-600'
            }`}
          >
            {badge}
          </span>
        ) : (
          badge
        )
      )}
      {!filterBelowTitle && filter && (
        <div className="mb-5 lg:mb-6">{filter}</div>
      )}
      <div className={titleAction ? 'flex items-start justify-between gap-3' : undefined}>
        <div className="min-w-0">
          <h2 className={`text-2xl lg:text-3xl font-bold tracking-tight ${
            dark ? 'text-slate-50' : 'text-slate-900'
          }`}>
            {title}
          </h2>
          {description && (
            <p className={`text-sm lg:text-base mt-1.5 max-w-2xl ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {description}
            </p>
          )}
        </div>
        {titleAction}
      </div>
      {filterBelowTitle && (filter || action) && (
        <div className="mt-5 lg:mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {filter && <div className="min-w-0 flex-1">{filter}</div>}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
    </div>
    {!filterBelowTitle && action && (
      <div className="flex-shrink-0">{action}</div>
    )}
  </motion.div>
)

export default PageHeader
