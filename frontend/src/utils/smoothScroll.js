export const METRICS_SECTION_ID = 'dashboard-metrics-content'

/** Evento para abrir (y opcionalmente hacer scroll a) la sección de métricas del dashboard. */
export const OPEN_METRICS_EVENT = 'dashboard:open-metrics'

export function scrollToMetrics() {
  window.dispatchEvent(
    new CustomEvent(OPEN_METRICS_EVENT, { detail: { scroll: true } }),
  )
}

export function scrollToMetricsElement() {
  const element = document.getElementById(METRICS_SECTION_ID)
  if (!element) return

  const top = element.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top, behavior: 'smooth' })
}
