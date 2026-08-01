import GuidedTour from './GuidedTour'
import {
  hasCompletedTopicTour,
  markTopicTourComplete,
  START_TOPIC_TOUR_EVENT,
} from '../utils/onboarding'

export const TOPIC_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Análisis por tema',
    body: 'Aquí puedes profundizar en categorías como economía, política o seguridad. Te mostramos cómo filtrar y leer los resultados.',
    target: null,
  },
  {
    id: 'dates',
    title: 'Filtros de fechas',
    body: 'Puedes filtrar por un rango de fechas o por períodos rápidos (7 días, 30 días o todo el historial). El filtro aplica a todas las categorías.',
    target: 'tour-topic-filters',
  },
  {
    id: 'topics',
    title: 'Filtro por temas',
    body: 'Elige una categoría para ver el sentimiento acumulado de ese tema en el período seleccionado.',
    target: 'tour-topic-pills',
  },
  {
    id: 'results',
    title: 'Gráficos y comentarios',
    body: 'Aquí verás los gráficos de sentimiento y los comentarios relacionados al tema. Puedes hacer clic en un sentimiento del gráfico para filtrar la lista.',
    target: 'tour-topic-results',
  },
  {
    id: 'farewell',
    title: '¡A explorar!',
    body: 'Cambia de tema o de período cuando quieras para comparar cómo se habla de Ecuador en redes sociales.',
    target: null,
  },
]

const TopicAnalysisTour = ({ enabled = true }) => (
  <GuidedTour
    steps={TOPIC_TOUR_STEPS}
    enabled={enabled}
    hasCompleted={hasCompletedTopicTour}
    markComplete={markTopicTourComplete}
    startEvent={START_TOPIC_TOUR_EVENT}
    startDelay={900}
  />
)

export default TopicAnalysisTour
