import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import { getTopics } from '../services/api'
import { useFilters } from '../context/FilterContext'

const FilterBar = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [topics, setTopics] = useState([])
  const { filters, updateFilter, clearFilters } = useFilters()

  const hasActiveFilters =
    filters.topic !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.socialNetwork !== 'all'

  useEffect(() => {
    loadTopics()
  }, [])

  const loadTopics = async () => {
    try {
      const data = await getTopics(true)
      setTopics(data)
    } catch (err) {
      console.error('Error al cargar temas:', err)
    }
  }

  return (
    <div className="glass-filter">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary-500" />
          <span className="font-semibold text-sm">Filtros globales</span>
          {hasActiveFilters && (
            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              Activos
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      <div className={`px-4 py-4 ${isExpanded ? 'block' : 'hidden'} lg:block`}>
            <div className="flex items-center justify-between mb-3 hidden lg:flex">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-primary-500" />
                <span className="text-sm font-semibold text-slate-700">Filtros globales</span>
                {hasActiveFilters && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium animate-pulse-soft">
                    Activos
                  </span>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  <X size={14} />
                  Limpiar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Tema
                </label>
                <select
                  value={filters.topic}
                  onChange={(e) => updateFilter('topic', e.target.value)}
                  className="input-base py-2"
                >
                  <option value="all">Todos los temas</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="input-base py-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="input-base py-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Red Social
                </label>
                <select
                  value={filters.socialNetwork}
                  onChange={(e) => updateFilter('socialNetwork', e.target.value)}
                  className="input-base py-2"
                >
                  <option value="all">Todas</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex justify-end lg:hidden">
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-slate-800 font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
    </div>
  )
}

export default FilterBar
