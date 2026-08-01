import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, LayoutGrid, ChevronRight } from 'lucide-react'
import {
  DOCK_NAV_ITEMS,
  isNavActive,
  resolveDockTheme,
} from '../config/navigation'

const FloatingNavDock = ({ onOpenMenu }) => {
  const [expanded, setExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const location = useLocation()
  const theme = resolveDockTheme(location.pathname)
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'

  const dockItems = [
    { id: 'hub', icon: Home, label: 'Inicio', path: '/dashboard' },
    ...DOCK_NAV_ITEMS,
  ]

  const activeItem = dockItems.find((item) =>
    item.id === 'hub' ? isDashboard : isNavActive(location.pathname, item.path)
  )
  const ActiveIcon = activeItem?.icon || Home

  const collapseMenu = () => {
    setExpanded(false)
    setShowTooltip(false)
  }

  useEffect(() => {
    collapseMenu()
  }, [location.pathname])

  useEffect(() => {
    const onExpand = () => {
      setExpanded(true)
      setShowTooltip(false)
    }
    const onCollapse = () => {
      setExpanded(false)
      setShowTooltip(false)
    }
    window.addEventListener('onboarding:expand-dock', onExpand)
    window.addEventListener('onboarding:collapse-dock', onCollapse)
    return () => {
      window.removeEventListener('onboarding:expand-dock', onExpand)
      window.removeEventListener('onboarding:collapse-dock', onCollapse)
    }
  }, [])

  const iconActiveClass = (active) =>
    active ? theme.iconActive : theme.iconIdle

  const labelClass = (active) => (active ? theme.labelActive : theme.labelIdle)

  const renderDockItem = (item) => {
    const Icon = item.icon
    const isHub = item.id === 'hub'
    const active = isHub ? isDashboard : isNavActive(location.pathname, item.path)

    const inner = (
      <motion.div
        className="relative flex flex-col items-center min-w-[44px]"
        whileHover={{ x: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {active && (
          <motion.span
            layoutId="dock-indicator"
            className={`absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1.5 rounded-full ${theme.indicator}`}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span
          className={`flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl transition-all duration-200 ${iconActiveClass(active)}`}
        >
          <Icon size={19} strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className={`text-[9px] lg:text-[10px] font-semibold mt-0.5 whitespace-nowrap ${labelClass(active)}`}>
          {item.label}
        </span>
      </motion.div>
    )

    if (isHub && isDashboard) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            collapseMenu()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="p-0.5 flex-shrink-0"
          aria-label="Ir al inicio"
        >
          {inner}
        </button>
      )
    }

    return (
      <Link key={item.id} to={item.path} onClick={collapseMenu} className="p-0.5 flex-shrink-0" aria-label={item.label}>
        {inner}
      </Link>
    )
  }

  return (
    <div className="fixed right-3 lg:right-5 top-4 lg:top-6 z-40 pointer-events-none">
      <motion.nav
        className="pointer-events-auto relative"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.3 }}
        layout
      >
        <AnimatePresence>
          {!expanded && showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className={`absolute right-[calc(100%+0.75rem)] top-5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-[60] pointer-events-none ${theme.tooltip}`}
              role="tooltip"
            >
              Explora más opciones
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          id="tour-nav-dock"
          layout
          style={theme.shellStyle}
          className={`flex flex-col items-center gap-0.5 lg:gap-1 px-1.5 py-2 lg:px-2 lg:py-2.5 rounded-2xl lg:rounded-3xl ${
            expanded ? 'max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide' : 'overflow-visible'
          } ${theme.shellClass}`}
        >
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            onMouseEnter={() => !expanded && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => !expanded && setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="p-0.5 flex-shrink-0"
            aria-label={expanded ? 'Comprimir menú de navegación' : 'Expandir menú de navegación'}
            aria-expanded={expanded}
          >
            <div className="relative flex flex-col items-center min-w-[44px]">
              <span
                className={`flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl transition-all duration-200 ${
                  expanded ? theme.toggleExpanded : theme.toggleCollapsed
                }`}
              >
                {expanded ? (
                  <ChevronRight size={19} strokeWidth={2.5} />
                ) : (
                  <ActiveIcon size={19} strokeWidth={2.5} />
                )}
              </span>
              <span className={`text-[9px] lg:text-[10px] font-semibold mt-0.5 whitespace-nowrap ${theme.menuLabel}`}>
                {expanded ? 'Ocultar' : 'Menú'}
              </span>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="dock-items"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center gap-0.5 lg:gap-1 overflow-hidden"
              >
                <div className={`w-8 h-px my-0.5 ${theme.divider}`} />

                <button
                  type="button"
                  onClick={() => {
                    collapseMenu()
                    onOpenMenu()
                  }}
                  className="p-0.5 flex-shrink-0"
                  aria-label="Abrir explorador de módulos"
                >
                  <motion.div
                    className="relative flex flex-col items-center min-w-[44px]"
                    whileHover={{ x: -4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <span
                      className={`flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl transition-all duration-200 ${theme.iconIdle}`}
                    >
                      <LayoutGrid size={19} strokeWidth={2} />
                    </span>
                    <span className={`text-[9px] lg:text-[10px] font-semibold mt-0.5 whitespace-nowrap ${theme.menuLabel}`}>
                      Explorar
                    </span>
                  </motion.div>
                </button>

                {dockItems.map(renderDockItem)}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.nav>
    </div>
  )
}

export default FloatingNavDock
