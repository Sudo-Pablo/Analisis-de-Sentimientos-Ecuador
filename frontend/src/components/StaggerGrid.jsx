import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '../utils/motion'

const StaggerGrid = ({ children, className = '' }) => (
  <motion.div
    className={className}
    variants={staggerContainer}
    initial="initial"
    animate="animate"
  >
    {Array.isArray(children)
      ? children.map((child, index) => (
          <motion.div key={child?.key ?? index} variants={staggerItem}>
            {child}
          </motion.div>
        ))
      : children}
  </motion.div>
)

export default StaggerGrid
