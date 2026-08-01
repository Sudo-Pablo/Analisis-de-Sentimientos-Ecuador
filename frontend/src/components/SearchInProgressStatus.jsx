import { Loader2 } from 'lucide-react'

/**
 * Indicador visual junto al botón Detener mientras corre una búsqueda.
 */
const SearchInProgressStatus = ({
  keyword = '',
  estimatedTime = 'puede tardar unos momentos',
  accentClass = 'text-sky-700',
  borderClass = 'border-sky-300/70',
  bgClass = 'bg-sky-50/90',
  dotClass = 'bg-sky-600',
}) => {
  const topic = (keyword || '').trim()

  return (
    <div
      className={`flex-1 min-w-[220px] flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${bgClass} ${borderClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative mt-0.5 shrink-0 h-5 w-5">
        <span className={`absolute inset-0 rounded-full opacity-35 animate-ping ${dotClass}`} />
        <Loader2 className={`relative h-5 w-5 animate-spin ${accentClass}`} />
      </div>
      <div className="min-w-0 space-y-1">
        <p className={`text-sm font-semibold leading-snug ${accentClass}`}>
          Búsqueda en curso — por favor espere
        </p>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          Estamos recolectando y analizando comentarios
          {topic ? (
            <>
              {' '}sobre <span className="font-semibold text-slate-900">«{topic}»</span>
            </>
          ) : null}
          . {estimatedTime}. Puede pulsar <span className="font-semibold">Detener</span> para cancelar la búsqueda.
        </p>
        <div className="flex items-center gap-1.5 pt-0.5" aria-hidden="true">
          <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${dotClass}`} style={{ animationDelay: '0ms' }} />
          <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${dotClass}`} style={{ animationDelay: '150ms' }} />
          <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${dotClass}`} style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export default SearchInProgressStatus
