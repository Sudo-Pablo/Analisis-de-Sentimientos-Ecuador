import { motion } from 'framer-motion'
import { scaleIn } from '../utils/motion'

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <motion.div
    className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl bg-slate-50/80 border border-dashed border-slate-200"
    {...scaleIn}
  >
    {Icon && (
      <div className="p-4 rounded-2xl bg-white shadow-card mb-4">
        <Icon className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
      </div>
    )}
    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    {description && (
      <p className="mt-2 text-sm text-slate-500 max-w-md">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </motion.div>
)

export default EmptyState
