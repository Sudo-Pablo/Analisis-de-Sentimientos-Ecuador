import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { isNavActive } from '../config/navigation'
import { staggerItem } from '../utils/motion'
import { scrollToMetrics } from '../utils/smoothScroll'
import { requestOnboardingRestart, resetOnboarding } from '../utils/onboarding'

const SIZE_CLASSES = {
  large: 'col-span-2 row-span-1 min-h-[140px] lg:min-h-[168px]',
  medium: 'col-span-1 row-span-1 min-h-[140px] lg:min-h-[168px]',
  small: 'col-span-1 row-span-1 min-h-[120px] lg:min-h-[140px]',
}

const NavCard = ({ item, variant = 'hub', onNavigate }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const active = isNavActive(location.pathname, item.path)
  const Icon = item.icon
  const isCompact = variant === 'dock' || variant === 'overlay'

  const handleClick = (e) => {
    if (item.action === 'restart-tour') {
      e.preventDefault()
      onNavigate?.()
      const onDashboard = location.pathname === '/dashboard' || location.pathname === '/'
      if (onDashboard) {
        requestOnboardingRestart()
      } else {
        // Al montar el Dashboard, el tour arranca solo si no está marcado como completado
        resetOnboarding()
        navigate('/dashboard')
      }
      return
    }

    const onDashboard = location.pathname === '/dashboard' || location.pathname === '/'
    if (item.scrollTo && onDashboard) {
      e.preventDefault()
      scrollToMetrics()
      onNavigate?.()
    } else {
      onNavigate?.()
    }
  }

  const content = (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative overflow-hidden rounded-2xl lg:rounded-3xl
        bg-gradient-to-br ${item.gradient}
        ${item.glow}
        ${isCompact ? 'p-4' : SIZE_CLASSES[item.size] || SIZE_CLASSES.medium}
        cursor-pointer
        ${active && item.action !== 'restart-tour' ? 'ring-2 ring-[#67e8f9]/50 ring-offset-2 ring-offset-slate-950' : ''}
        transition-shadow duration-300
      `}
    >
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
      <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-black/10 blur-xl" />

      <div className={`relative h-full flex flex-col justify-between ${isCompact ? '' : 'p-5 lg:p-6'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className={`${isCompact ? 'p-2' : 'p-3'} rounded-xl lg:rounded-2xl bg-white/20 backdrop-blur-sm`}>
            <Icon className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6 lg:w-8 lg:h-8'} text-white`} strokeWidth={1.75} />
          </div>
          {!isCompact && (
            <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          )}
        </div>

        <div className={isCompact ? 'mt-3' : 'mt-auto pt-4'}>
          <h3 className={`font-bold text-white ${isCompact ? 'text-sm' : 'text-base lg:text-xl'}`}>
            {item.title}
          </h3>
          {!isCompact && (
            <p className="text-white/75 text-xs lg:text-sm mt-1 line-clamp-2 max-w-[95%]">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )

  if (item.action === 'restart-tour') {
    return (
      <button type="button" onClick={handleClick} className="block w-full h-full text-left">
        {content}
      </button>
    )
  }

  const onDashboard = location.pathname === '/dashboard' || location.pathname === '/'
  if (item.scrollTo && onDashboard) {
    return (
      <button type="button" onClick={handleClick} className="block w-full h-full text-left">
        {content}
      </button>
    )
  }

  return (
    <Link to={item.path} onClick={handleClick} className="block h-full">
      {content}
    </Link>
  )
}

export { NavCard }
export default NavCard
