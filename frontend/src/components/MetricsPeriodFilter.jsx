const PERIOD_OPTIONS = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 0, label: 'Todo el historial' },
]

export const METRICS_PERIOD_DESCRIPTIONS = {
  7: 'Resumen histórico de sentimientos en redes sociales — última semana',
  30: 'Resumen histórico de sentimientos en redes sociales — últimos 30 días',
  0: 'Resumen histórico de sentimientos en redes sociales — todos los datos recolectados',
}

export const TOPIC_PERIOD_DESCRIPTIONS = {
  7: 'Análisis detallado de sentimientos para el tema seleccionado — última semana',
  30: 'Análisis detallado de sentimientos para el tema seleccionado — últimos 30 días',
  0: 'Análisis detallado de sentimientos para el tema seleccionado — todo el historial acumulado',
}

export const METRICS_PERIOD_LABELS = {
  7: 'Últimos 7 días',
  30: 'Últimos 30 días',
  0: 'Todo el historial',
}

const MetricsPeriodFilter = ({ value, onChange, dark = false }) => (
  <div className="flex flex-wrap gap-2">
    {PERIOD_OPTIONS.map((option) => {
      const active = value !== null && value !== undefined && value === option.value
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            active
              ? dark
                ? 'bg-[#67e8f9]/15 text-[#a5f3fc] border border-[#67e8f9]/45 shadow-sm shadow-cyan-900/20'
                : 'bg-primary-100 text-primary-700 border border-primary-200'
              : dark
                ? 'bg-slate-800/50 text-slate-400 border border-slate-700/60 hover:text-slate-200 hover:border-slate-600'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/80'
          }`}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

export default MetricsPeriodFilter
