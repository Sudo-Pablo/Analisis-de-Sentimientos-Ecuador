import { useCallback } from 'react'
import GuidedTour from './GuidedTour'
import { OPEN_METRICS_EVENT } from '../utils/smoothScroll'
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  START_ONBOARDING_EVENT,
} from '../utils/onboarding'

const DASHBOARD_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenido a las Voces del pueblo Ecuatoriano',
    body: 'Te guiaremos en un recorrido corto por las opciones principales para que conozcas cómo explorar la opinión ciudadana en redes sociales.',
    target: null,
  },
  {
    id: 'search',
    title: 'Buscador principal',
    body: 'Escribe una palabra clave y pulsa buscar para obtener publicaciones, comentarios y el análisis de sentimientos.',
    target: 'tour-main-search',
  },
  {
    id: 'trends',
    title: 'Lo más buscado y Hot topics',
    body: 'Esta es la lista de las búsquedas más realizadas en el sitio. Puedes abrir una de ellas para ver el análisis de esos temas de mayor interés. A la derecha, Hot topics te lleva al análisis histórico por categoría.',
    target: 'tour-search-trends',
  },
  {
    id: 'history-btn',
    title: 'Resumen histórico',
    body: 'Ahí verás métricas, gráficos y comentarios acumulados de lo ya analizado en la plataforma.',
    target: 'tour-historical-summary',
    openMetrics: true,
  },
  {
    id: 'filters',
    title: 'Filtros de período',
    body: 'Puedes filtrar por fechas o por períodos rápidos (7 días, 30 días o todo el historial) para ajustar el resumen a lo que te interesa.',
    target: 'tour-metrics-filters',
    openMetrics: true,
  },
  {
    id: 'nav-menu',
    title: 'Menú de navegación',
    body: 'Puedes explorar las diferentes opciones desde el menú, como análisis por tema y buscadores independientes. Si deseas ver este tutorial nuevamente, accede a Menú → Explorar → Tutorial.',
    target: 'tour-nav-dock',
    expandDock: true,
    scrollTop: true,
    cardAlign: 'center',
  },
  {
    id: 'farewell',
    title: '¡Listo para explorar!',
    body: 'Gracias por utilizar este servicio y ser parte de un análisis más crítico de nuestro país. ¡Que las voces del pueblo te ayuden a entender mejor lo que ocurre en Ecuador!',
    target: null,
  },
]

const OnboardingTour = ({ enabled = true }) => {
  const markComplete = useCallback(() => {
    window.dispatchEvent(new CustomEvent('onboarding:collapse-dock'))
    markOnboardingComplete()
  }, [])

  const onStepEnter = useCallback((step, { refreshSpotlight, schedule }) => {
    if (step.scrollTop) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      schedule(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        refreshSpotlight()
      }, 350)
    }
    if (step.openMetrics) {
      window.dispatchEvent(
        new CustomEvent(OPEN_METRICS_EVENT, { detail: { scroll: true } }),
      )
      schedule(refreshSpotlight, 420)
    }
    if (step.id === 'trends') {
      window.dispatchEvent(new CustomEvent('onboarding:expand-trends'))
    }
    if (step.expandDock) {
      window.dispatchEvent(new CustomEvent('onboarding:expand-dock'))
      schedule(refreshSpotlight, 320)
      schedule(refreshSpotlight, 520)
    } else if (step.id === 'farewell') {
      window.dispatchEvent(new CustomEvent('onboarding:collapse-dock'))
    }
  }, [])

  return (
    <GuidedTour
      steps={DASHBOARD_TOUR_STEPS}
      enabled={enabled}
      hasCompleted={hasCompletedOnboarding}
      markComplete={markComplete}
      startEvent={START_ONBOARDING_EVENT}
      onStepEnter={onStepEnter}
    />
  )
}

export default OnboardingTour
