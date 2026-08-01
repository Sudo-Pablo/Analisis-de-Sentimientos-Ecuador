import { motion } from 'framer-motion'
import { pageTransition } from '../utils/motion'

const PageTransition = ({ children }) => (
  <motion.div
    initial={pageTransition.initial}
    animate={pageTransition.animate}
    exit={pageTransition.exit}
    transition={pageTransition.transition}
  >
    {children}
  </motion.div>
)

export default PageTransition
