import { motion } from 'framer-motion'

const SentimentBar = ({ positivePercent, neutralPercent, negativePercent }) => (
  <div className="space-y-2">
    <div className="flex h-3 rounded-full overflow-hidden bg-slate-200">
      <motion.div
        className="bg-emerald-500"
        initial={{ width: 0 }}
        animate={{ width: `${positivePercent}%` }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        title={`Positivos: ${positivePercent}%`}
      />
      <motion.div
        className="bg-slate-400"
        initial={{ width: 0 }}
        animate={{ width: `${neutralPercent}%` }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        title={`Neutrales: ${neutralPercent}%`}
      />
      <motion.div
        className="bg-red-500"
        initial={{ width: 0 }}
        animate={{ width: `${negativePercent}%` }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        title={`Negativos: ${negativePercent}%`}
      />
    </div>
    <div className="flex justify-between text-xs text-slate-800 font-semibold">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        {positivePercent}%
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        {neutralPercent}%
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        {negativePercent}%
      </span>
    </div>
  </div>
)

export default SentimentBar
