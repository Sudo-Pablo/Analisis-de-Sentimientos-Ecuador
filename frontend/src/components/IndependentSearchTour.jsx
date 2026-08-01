import { useCallback } from 'react'
import GuidedTour from './GuidedTour'
import {
  hasCompletedTikTokTour,
  markTikTokTourComplete,
  START_TIKTOK_TOUR_EVENT,
  EXPAND_TIKTOK_PARAMS_EVENT,
  hasCompletedFacebookTour,
  markFacebookTourComplete,
  START_FACEBOOK_TOUR_EVENT,
  EXPAND_FACEBOOK_PARAMS_EVENT,
} from '../utils/onboarding'

const TOUR_BY_PLATFORM = {
  tiktok: {
    hasCompleted: hasCompletedTikTokTour,
    markComplete: markTikTokTourComplete,
    startEvent: START_TIKTOK_TOUR_EVENT,
    expandParamsEvent: EXPAND_TIKTOK_PARAMS_EVENT,
    steps: [
      {
        id: 'welcome',
        title: 'Buscador TikTok',
        body: 'Desde aquí puedes buscar videos por palabra clave y analizar el sentimiento de sus comentarios.',
        target: null,
      },
      {
        id: 'search',
        title: 'Realizar una búsqueda',
        body: 'Escribe una palabra clave y pulsa «Buscar y Analizar» para obtener videos, comentarios y el análisis de sentimientos.',
        target: 'tour-tiktok-search',
      },
      {
        id: 'params',
        title: 'Personalizar la búsqueda',
        body: 'Puedes ajustar el máximo de videos y de comentarios por video para controlar cuánto contenido se analiza.',
        target: 'tour-tiktok-params',
        expandParams: true,
      },
      {
        id: 'farewell',
        title: '¡Listo!',
        body: 'Cuando quieras volver a ver este recorrido, usa el botón Tutorial junto al estado del servicio.',
        target: null,
      },
    ],
  },
  facebook: {
    hasCompleted: hasCompletedFacebookTour,
    markComplete: markFacebookTourComplete,
    startEvent: START_FACEBOOK_TOUR_EVENT,
    expandParamsEvent: EXPAND_FACEBOOK_PARAMS_EVENT,
    steps: [
      {
        id: 'welcome',
        title: 'Buscador Facebook',
        body: 'Desde aquí puedes buscar publicaciones por palabra clave y analizar el sentimiento de sus comentarios.',
        target: null,
      },
      {
        id: 'search',
        title: 'Realizar una búsqueda',
        body: 'Escribe una palabra clave y pulsa «Buscar y Analizar» para obtener publicaciones, comentarios y el análisis de sentimientos.',
        target: 'tour-facebook-search',
      },
      {
        id: 'params',
        title: 'Personalizar la búsqueda',
        body: 'Puedes ajustar el máximo de publicaciones y de comentarios por publicación para controlar cuánto contenido se analiza.',
        target: 'tour-facebook-params',
        expandParams: true,
      },
      {
        id: 'farewell',
        title: '¡Listo!',
        body: 'Cuando quieras volver a ver este recorrido, usa el botón Tutorial junto al estado del servicio.',
        target: null,
      },
    ],
  },
}

const IndependentSearchTour = ({ platform = 'tiktok', enabled = true }) => {
  const config = TOUR_BY_PLATFORM[platform] || TOUR_BY_PLATFORM.tiktok

  const onStepEnter = useCallback((step, { refreshSpotlight, schedule }) => {
    if (step.expandParams) {
      window.dispatchEvent(new CustomEvent(config.expandParamsEvent))
      schedule(refreshSpotlight, 280)
      schedule(refreshSpotlight, 480)
    }
  }, [config.expandParamsEvent])

  return (
    <GuidedTour
      steps={config.steps}
      enabled={enabled}
      hasCompleted={config.hasCompleted}
      markComplete={config.markComplete}
      startEvent={config.startEvent}
      onStepEnter={onStepEnter}
      startDelay={800}
    />
  )
}

export default IndependentSearchTour
