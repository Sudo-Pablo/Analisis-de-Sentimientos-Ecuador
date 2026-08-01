import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Loader2, Square } from 'lucide-react'
import { useTypewriter } from '../hooks/useTypewriter'

const EXAMPLE_QUERIES = [
  'seguridad ciudadana Ecuador',
  'reforma educativa 2026',
  'inflación del dólar',
  'vacunación infantil',
  'transporte público Quito',
  'precios de la gasolina',
  'salario minimo Ecuador',
  'precios de la vivienda',
  'asamblea nacional',
]

const TypewriterSearch = ({ onSearch, onStop, loading = false }) => {
  const [keyword, setKeyword] = useState('')
  const [focused, setFocused] = useState(false)
  const ghostText = useTypewriter(EXAMPLE_QUERIES, { paused: focused || keyword.length > 0 || loading })

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = keyword.trim()
    if (!trimmed || loading) return
    onSearch(trimmed)
  }

  const showGhost = !focused && keyword.length === 0 && !loading

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto" id="tour-main-search">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#1877F2]/50 via-[#00f2ea]/30 to-[#ff0050]/40 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 group-focus-within:opacity-70 transition-opacity duration-500" />

        <div className="relative flex items-center bg-slate-900/75 backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-hidden">
          <Search className="ml-5 text-slate-500 shrink-0" size={22} strokeWidth={2} />

          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={loading}
              className="w-full px-4 py-5 text-base lg:text-lg bg-transparent outline-none text-slate-100 placeholder-transparent"
              aria-label="Palabra clave de búsqueda"
            />

            {showGhost && (
              <div
                className="absolute inset-0 flex items-center px-4 pointer-events-none select-none"
                aria-hidden="true"
              >
                <span className="text-base lg:text-lg text-slate-500">
                  {ghostText}
                  <motion.span
                    className="inline-block w-[2px] h-[1.1em] bg-[#00f2ea] ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'steps(2)' }}
                  />
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <button
              type="button"
              onClick={() => onStop?.()}
              className="m-2 px-6 py-3 rounded-xl font-semibold text-sm lg:text-base text-white
                         bg-rose-600 hover:bg-rose-500
                         transition-all active:scale-[0.98] shrink-0 shadow-lg shadow-rose-900/30"
            >
              <span className="flex items-center gap-2">
                <Square size={16} fill="currentColor" />
                Detener
              </span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="m-2 px-6 py-3 rounded-xl font-semibold text-sm lg:text-base text-white
                         bg-gradient-to-r from-[#1877F2] via-[#0ea5e9] to-[#ff0050]
                         hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all active:scale-[0.98] shrink-0 shadow-lg shadow-blue-900/30"
            >
              <span className="flex items-center gap-2">
                <Search size={18} />
                <span className="hidden sm:inline">Buscar</span>
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-4">
        <p className="text-center text-xs text-slate-500">
          {loading
            ? 'Búsqueda en curso · pulsa Detener para cancelar la recolección y el análisis'
            : 'Búsqueda simultánea en Facebook y TikTok con análisis de sentimientos'}
        </p>
        {!loading && (
          <div className="flex items-center gap-4 text-[11px] font-medium">
            <span className="flex items-center gap-1.5 text-[#60a5fa]">
              <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
              Facebook
            </span>
            <span className="flex items-center gap-1.5 text-[#f472b6]">
              <span className="w-2 h-2 rounded-full bg-[#ff0050]" />
              TikTok
            </span>
          </div>
        )}
      </div>
    </form>
  )
}

export default TypewriterSearch
