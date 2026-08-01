import {
  Home, BarChart3, Video, Globe, Info, Sparkles,
} from 'lucide-react'

/** Módulos implementados y navegables en la app */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    path: '/dashboard',
    icon: Home,
    label: 'Inicio',
    title: 'Inicio',
    description: 'Búsqueda unificada y métricas generales de sentimiento',
    gradient: 'from-[#1877F2] via-[#2563eb] to-[#1e40af]',
    glow: 'shadow-[0_0_40px_rgba(24,119,242,0.35)]',
    size: 'large',
    scrollTo: '#dashboard-metrics-content',
  },
  {
    id: 'analisis',
    path: '/analisis-tema',
    icon: BarChart3,
    label: 'Por tema',
    title: 'Análisis por tema',
    description: 'Profundiza en un tema específico con gráficos detallados',
    gradient: 'from-slate-600 via-slate-500 to-slate-700',
    glow: 'shadow-[0_0_40px_rgba(100,116,139,0.3)]',
    size: 'medium',
  },
  {
    id: 'tiktok',
    path: '/buscador-tiktok',
    icon: Video,
    label: 'TikTok',
    title: 'Buscador TikTok',
    description: 'Busca videos y analiza comentarios recopilados',
    gradient: 'from-[#ff0050] via-[#db2777] to-[#9333ea]',
    glow: 'shadow-[0_0_40px_rgba(255,0,80,0.35)]',
    size: 'medium',
  },
  {
    id: 'facebook',
    path: '/buscador-facebook',
    icon: Globe,
    label: 'Facebook',
    title: 'Buscador Facebook',
    description: 'Explora posts y sentimiento en Facebook',
    gradient: 'from-[#1877F2] via-[#3b82f6] to-[#1d4ed8]',
    glow: 'shadow-[0_0_40px_rgba(24,119,242,0.35)]',
    size: 'medium',
  },
  {
    id: 'metodologia',
    path: '/metodologia',
    icon: Info,
    label: 'Metodología',
    title: 'Metodología',
    description: 'Cómo funciona el sistema de análisis NLP',
    gradient: 'from-slate-700 via-slate-600 to-slate-800',
    glow: 'shadow-[0_0_30px_rgba(71,85,105,0.3)]',
    size: 'medium',
  },
  {
    id: 'tutorial',
    path: '/dashboard',
    action: 'restart-tour',
    icon: Sparkles,
    label: 'Tutorial',
    title: 'Tutorial',
    description: 'Vuelve a ver el recorrido guiado de la página de inicio',
    gradient: 'from-[#67e8f9] via-[#22d3ee] to-[#0891b2]',
    glow: 'shadow-[0_0_40px_rgba(103,232,249,0.3)]',
    size: 'medium',
  },
]

export const isNavActive = (pathname, path) =>
  pathname === path || (pathname === '/' && path === '/dashboard')

/** Ocultos en el dock flotante (la definición del ítem se conserva) */
export const DOCK_HIDDEN_IDS = new Set(['metodologia', 'tutorial'])

/**
 * Ocultos en el menú Explorar (ítem y ruta se conservan para reactivar después).
 * Quitar el id de este Set para volver a mostrarlo.
 */
export const EXPLORE_HIDDEN_IDS = new Set(['metodologia'])

export const DOCK_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.id !== 'dashboard' && !DOCK_HIDDEN_IDS.has(item.id)
)

export const EXPLORE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !EXPLORE_HIDDEN_IDS.has(item.id)
)

export const DOCK_THEMES = {
  dashboard: {
    shellClass: 'backdrop-blur-xl border border-slate-600/50 shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
    shellStyle: {
      background:
        'linear-gradient(165deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.9) 50%, rgba(15,23,42,0.92) 100%)',
    },
    divider: 'bg-slate-600/50',
    toggleCollapsed:
      'bg-gradient-to-br from-[#1877F2] via-[#4267B2] to-[#ff0050] text-white shadow-[0_4px_22px_rgba(24,119,242,0.45)]',
    toggleExpanded: 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200',
    menuLabel: 'text-slate-500',
    iconIdle: 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200',
    iconActive:
      'bg-gradient-to-br from-[#1877F2] to-[#ff0050] text-white shadow-lg shadow-blue-900/30',
    labelActive: 'text-[#67e8f9]',
    labelIdle: 'text-slate-500',
    indicator: 'bg-[#67e8f9]',
    tooltip: 'bg-slate-800 text-slate-100 border border-slate-600/60 shadow-xl',
  },
  facebook: {
    shellClass:
      'backdrop-blur-xl border shadow-[0_8px_32px_rgba(24,119,242,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
    shellStyle: {
      background: `
        radial-gradient(ellipse 120% 80% at 0% 0%, rgba(24,119,242,0.35), transparent 55%),
        radial-gradient(ellipse 90% 70% at 100% 100%, rgba(66,103,178,0.25), transparent 50%),
        linear-gradient(155deg, rgba(10,22,40,0.94) 0%, rgba(26,58,110,0.9) 42%, rgba(59,108,181,0.82) 100%)
      `,
      borderColor: 'rgba(24,119,242,0.42)',
    },
    divider: 'bg-[#1877F2]/35',
    toggleCollapsed:
      'bg-gradient-to-br from-[#1877F2] via-[#3b82f6] to-[#1e40af] text-white shadow-[0_4px_22px_rgba(24,119,242,0.5)]',
    toggleExpanded: 'text-[#7eb3ff] hover:bg-[#1877F2]/25 hover:text-[#a5c9ff]',
    menuLabel: 'text-[#7eb3ff]',
    iconIdle: 'text-[#6ba3f0] hover:bg-[#1877F2]/20 hover:text-[#a5c9ff]',
    iconActive:
      'bg-gradient-to-br from-[#1877F2] via-[#2563eb] to-[#1d4ed8] text-white shadow-[0_4px_18px_rgba(24,119,242,0.45)]',
    labelActive: 'text-[#a5c9ff]',
    labelIdle: 'text-[#6ba3f0]',
    indicator: 'bg-[#60a5fa]',
    tooltip:
      'bg-[#0a1628]/95 text-[#a5c9ff] border border-[#1877F2]/40 shadow-xl backdrop-blur-md',
  },
  tiktok: {
    shellClass:
      'backdrop-blur-xl border shadow-[0_8px_32px_rgba(255,0,80,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]',
    shellStyle: {
      background: `
        radial-gradient(ellipse 110% 75% at 0% 0%, rgba(255,0,80,0.32), transparent 52%),
        radial-gradient(ellipse 90% 70% at 100% 0%, rgba(168,85,247,0.28), transparent 48%),
        radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,242,234,0.12), transparent 55%),
        linear-gradient(155deg, rgba(12,8,20,0.95) 0%, rgba(45,18,56,0.92) 40%, rgba(90,32,96,0.85) 100%)
      `,
      borderColor: 'rgba(255,0,80,0.35)',
    },
    divider: 'bg-[#ff0050]/30',
    toggleCollapsed:
      'bg-gradient-to-br from-[#ff0050] via-[#e11d8f] to-[#a855f7] text-white shadow-[0_4px_22px_rgba(255,0,80,0.45)]',
    toggleExpanded: 'text-[#f9a8d4] hover:bg-[#ff0050]/20 hover:text-[#fbcfe8]',
    menuLabel: 'text-[#f9a8d4]',
    iconIdle: 'text-[#e879a8] hover:bg-[#ff0050]/18 hover:text-[#fbcfe8]',
    iconActive:
      'bg-gradient-to-br from-[#ff0050] via-[#db2777] to-[#9333ea] text-white shadow-[0_4px_18px_rgba(255,0,80,0.4)]',
    labelActive: 'text-[#fbcfe8]',
    labelIdle: 'text-[#e879a8]',
    indicator: 'bg-[#ff0050]',
    tooltip:
      'bg-[#1a0a1e]/95 text-[#fbcfe8] border border-[#ff0050]/35 shadow-xl backdrop-blur-md',
  },
  topics: {
    shellClass:
      'backdrop-blur-xl border shadow-[0_8px_32px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]',
    shellStyle: {
      background: `
        radial-gradient(ellipse 100% 70% at 10% 0%, rgba(24,119,242,0.18), transparent 50%),
        radial-gradient(ellipse 90% 65% at 90% 5%, rgba(255,0,80,0.12), transparent 48%),
        radial-gradient(ellipse 80% 55% at 50% 100%, rgba(103,232,249,0.1), transparent 52%),
        linear-gradient(155deg, rgba(18,24,38,0.92) 0%, rgba(36,48,72,0.88) 45%, rgba(90,109,134,0.78) 100%)
      `,
      borderColor: 'rgba(148,163,184,0.35)',
    },
    divider: 'bg-slate-500/35',
    toggleCollapsed:
      'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 text-white shadow-[0_4px_20px_rgba(30,41,59,0.4)] ring-1 ring-white/10',
    toggleExpanded: 'text-slate-300 hover:bg-white/10 hover:text-white',
    menuLabel: 'text-slate-400',
    iconIdle: 'text-slate-400 hover:bg-white/10 hover:text-slate-200',
    iconActive:
      'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 text-white shadow-[0_4px_16px_rgba(30,41,59,0.35)] ring-1 ring-white/15',
    labelActive: 'text-[#67e8f9]',
    labelIdle: 'text-slate-400',
    indicator: 'bg-[#67e8f9]',
    tooltip: 'bg-slate-800/95 text-slate-100 border border-slate-500/40 shadow-xl backdrop-blur-md',
  },
}

export const resolveDockTheme = (pathname) => {
  if (pathname === '/' || pathname === '/dashboard') return DOCK_THEMES.dashboard
  if (pathname.startsWith('/buscador-facebook')) return DOCK_THEMES.facebook
  if (pathname.startsWith('/buscador-tiktok')) return DOCK_THEMES.tiktok
  if (pathname.startsWith('/analisis-tema')) return DOCK_THEMES.topics
  return DOCK_THEMES.topics
}
