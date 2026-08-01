import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Facebook, Video, MessageSquare, Smile, Frown,
  Clock, AlertCircle, ExternalLink, Newspaper, X, Search, Sparkles, Square
} from 'lucide-react'
import StatCard from './StatCard'
import ChartCard from './ChartCard'
import Badge from './Badge'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { renderSentimentPieLabel } from './SearchResultsGrid'

const SENTIMENT_COLORS = {
  positivo: '#10b981',
  negativo: '#ef4444',
  neutral: '#6b7280',
}

const BAR_TO_SENTIMENT = {
  Positivo: 'positivo',
  Negativo: 'negativo',
  Neutral: 'neutral',
}

const SENTIMENT_LABELS = {
  positivo: 'Positivos',
  negativo: 'Negativos',
  neutral: 'Neutros',
}

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
]

const normalizeSentiment = (sentiment) => {
  const s = (sentiment || 'neutral').toLowerCase()
  if (s.startsWith('pos')) return 'positivo'
  if (s.startsWith('neg')) return 'negativo'
  return 'neutral'
}

const SentimentMiniChart = ({ summary, selectedSentiment, onSentimentSelect, dark = false }) => {
  const [hoveredBar, setHoveredBar] = useState(null)
  const [hoveredPie, setHoveredPie] = useState(null)

  if (!summary) return null

  const pieData = [
    { name: 'Positivo', value: summary.positive || 0, color: SENTIMENT_COLORS.positivo },
    { name: 'Negativo', value: summary.negative || 0, color: SENTIMENT_COLORS.negativo },
    { name: 'Neutral', value: summary.neutral || 0, color: SENTIMENT_COLORS.neutral },
  ].filter((d) => d.value > 0)

  const barData = pieData.map((d) => ({ name: d.name, count: d.value, fill: d.color }))

  if (pieData.length === 0) return null

  const handleSentimentClick = (entry) => {
    const sentiment = BAR_TO_SENTIMENT[entry?.name]
    if (!sentiment) return
    onSentimentSelect?.(selectedSentiment === sentiment ? null : sentiment)
  }

  const getSliceStyle = (entryName) => {
    const sentiment = BAR_TO_SENTIMENT[entryName]
    const isSelected = selectedSentiment === sentiment
    const isHovered = hoveredPie === entryName || hoveredBar === entryName
    const isDimmed = selectedSentiment && !isSelected
    let opacity = 1
    if (isDimmed) opacity = 0.35
    else if (isHovered) opacity = 0.72
    return {
      opacity,
      stroke: isSelected || isHovered ? 'rgba(255,255,255,0.35)' : 'transparent',
      strokeWidth: isSelected || isHovered ? 1 : 0,
    }
  }

  return (
    <div className="space-y-3 text-left">
      <div
        className={`rounded-xl px-4 py-3 border text-center sm:text-left ${
          dark
            ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-100'
            : 'bg-sky-50 border-sky-300 text-sky-900'
        }`}
      >
        <p className="text-sm sm:text-base font-semibold leading-snug">
          Tip: haga clic en el diagrama circular o en las barras para filtrar los comentarios por sentimiento
        </p>
        <p className={`text-xs sm:text-sm mt-1 ${dark ? 'text-cyan-200/80' : 'text-sky-700/90'}`}>
          Puede activar y desactivar el filtro tocando de nuevo el mismo color
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                activeShape={false}
                label={renderSentimentPieLabel}
                labelLine={false}
                isAnimationActive={false}
              >
                {pieData.map((entry, i) => {
                  const style = getSliceStyle(entry.name)
                  return (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={style.opacity}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      cursor="pointer"
                      onClick={() => handleSentimentClick(entry)}
                      onMouseEnter={() => setHoveredPie(entry.name)}
                      onMouseLeave={() => setHoveredPie(null)}
                    />
                  )
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} />
              <Tooltip
                cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" activeBar={false}>
                {barData.map((entry) => {
                  const style = getSliceStyle(entry.name)

                  return (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      opacity={style.opacity}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      onClick={() => handleSentimentClick(entry)}
                      onMouseEnter={() => setHoveredBar(entry.name)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

const ClearFilterButton = ({ onClick, dark = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
      dark
        ? 'text-slate-300 bg-slate-700/70 hover:bg-slate-700 border border-slate-600/80'
        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
    }`}
  >
    <X size={12} strokeWidth={2.5} />
    Quitar filtro
  </button>
)

/** En lugar de Tiempo: Negativo; si no hay negativos, Neutral. */
const getSecondarySentimentCard = (summary) => {
  const negative = Number(summary?.negative ?? 0)
  const negativePct = Number(summary?.negative_pct ?? 0)
  const neutralPct = Number(summary?.neutral_pct ?? 0)
  if (negative > 0 || negativePct > 0) {
    return {
      title: 'Negativo',
      value: `${negativePct}%`,
      icon: Frown,
      color: 'negative',
    }
  }
  return {
    title: 'Neutral',
    value: `${neutralPct}%`,
    icon: MessageSquare,
    color: 'neutral',
  }
}

const CommentsList = ({ comments, selectedSentiment, showAuthor = false, dark = false }) => {
  const filtered = selectedSentiment
    ? comments.filter((c) => normalizeSentiment(c.sentiment) === selectedSentiment)
    : comments

  if (filtered.length === 0) {
    return (
      <p className={`text-sm py-4 text-left ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        {selectedSentiment
          ? `No hay comentarios ${SENTIMENT_LABELS[selectedSentiment]?.toLowerCase() || ''} en esta búsqueda.`
          : 'No hay comentarios para mostrar.'}
      </p>
    )
  }

  const dividerClass = dark ? 'border-slate-700/60' : 'border-slate-200'

  return (
    <div className="space-y-0 max-h-64 overflow-y-auto scrollbar-hide text-left">
      {filtered.map((c, i) => {
        const metaParts = []
        if (typeof c.likes === 'number' && c.likes > 0) metaParts.push(`${c.likes} likes`)
        else if (c.created_at) {
          try {
            metaParts.push(new Date(c.created_at).toLocaleDateString('es-ES'))
          } catch {
            /* ignore */
          }
        }

        return (
          <div
            key={c.comment_id || i}
            className={`py-3 text-sm text-left border-l-[3px] pl-3 ${
              i < filtered.length - 1 ? `border-b ${dividerClass}` : ''
            }`}
            style={{ borderLeftColor: SENTIMENT_COLORS[normalizeSentiment(c.sentiment)] }}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap justify-start">
              {showAuthor && c.author && (
                <span className={`font-medium ${dark ? 'text-slate-100' : 'text-slate-800'}`}>
                  @{c.author}
                </span>
              )}
              <Badge sentiment={c.sentiment} />
            </div>
            <p className={`line-clamp-3 text-left ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
              {c.text || c.original_text}
            </p>
            {metaParts.length > 0 && (
              <span className={`text-xs mt-1 inline-block text-left ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                {metaParts.join(' · ')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const FacebookPanel = ({ data, dark = false }) => {
  const [selectedSentiment, setSelectedSentiment] = useState(null)

  if (!data) return null

  const posts = data.posts || []
  const comments = data.comments || []
  const dividerClass = dark ? 'border-slate-700/60' : 'border-slate-200'

  const commentsTitle = selectedSentiment
    ? `Comentarios ${SENTIMENT_LABELS[selectedSentiment]} (${comments.filter((c) => normalizeSentiment(c.sentiment) === selectedSentiment).length})`
    : `Comentarios analizados (${comments.length})`

  const secondarySentiment = getSecondarySentimentCard(data.sentiment_summary)

  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Posts" value={data.posts_found || 0} icon={Facebook} color="primary" index={0} />
        <StatCard title="Comentarios" value={data.comments_analyzed || 0} icon={MessageSquare} color="neutral" index={1} />
        <StatCard title="Positivo" value={`${data.sentiment_summary?.positive_pct ?? 0}%`} icon={Smile} color="positive" index={2} />
        <StatCard
          title={secondarySentiment.title}
          value={secondarySentiment.value}
          icon={secondarySentiment.icon}
          color={secondarySentiment.color}
          index={3}
        />
      </div>

      <SentimentMiniChart
        summary={data.sentiment_summary}
        selectedSentiment={selectedSentiment}
        onSentimentSelect={setSelectedSentiment}
        dark={dark}
      />

      {comments.length > 0 && (
        <ChartCard
          dark={dark}
          title={commentsTitle}
          titleAction={
            selectedSentiment ? (
              <ClearFilterButton dark={dark} onClick={() => setSelectedSentiment(null)} />
            ) : null
          }
        >
          <CommentsList
            comments={comments}
            selectedSentiment={selectedSentiment}
            showAuthor
            dark={dark}
          />
        </ChartCard>
      )}

      {posts.length > 0 && (
        <ChartCard
          dark={dark}
          collapsible
          defaultOpen={false}
          title={`Posts analizados (${posts.length})`}
        >
          <div className="max-h-72 overflow-y-auto scrollbar-hide text-left">
            {posts.map((post, idx) => (
              <div
                key={post.post_id || idx}
                className={`py-3 text-left ${idx < posts.length - 1 ? `border-b ${dividerClass}` : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1 flex-wrap justify-start">
                      <Newspaper size={14} className="text-[#1877F2] shrink-0" />
                      <span className={`font-medium ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {post.page_name || post.author}
                      </span>
                      {post.topic && (
                        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                          dark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {post.topic}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm line-clamp-3 text-left ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {post.text}
                    </p>
                  </div>
                  <div className={`flex flex-col items-end gap-2 text-sm shrink-0 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {post.comments_count?.toLocaleString?.() ?? post.comments_count ?? 0}
                    </div>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1877F2] hover:text-[#60a5fa]"
                        aria-label="Abrir post en Facebook"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}

const TikTokPanel = ({ data, dark = false }) => {
  const [selectedSentiment, setSelectedSentiment] = useState(null)

  if (!data) return null

  const comments = data.comments || []
  const dividerClass = dark ? 'border-slate-700/60' : 'border-slate-200'

  const commentsTitle = selectedSentiment
    ? `Comentarios ${SENTIMENT_LABELS[selectedSentiment]} (${comments.filter((c) => normalizeSentiment(c.sentiment) === selectedSentiment).length})`
    : `Comentarios analizados (${comments.length})`

  const secondarySentiment = getSecondarySentimentCard(data.sentiment_summary)

  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Videos" value={data.videos_found || 0} icon={Video} color="purple" index={0} />
        <StatCard title="Comentarios" value={data.comments_analyzed || 0} icon={MessageSquare} color="neutral" index={1} />
        <StatCard title="Positivo" value={`${data.sentiment_summary?.positive_pct ?? 0}%`} icon={Smile} color="positive" index={2} />
        <StatCard
          title={secondarySentiment.title}
          value={secondarySentiment.value}
          icon={secondarySentiment.icon}
          color={secondarySentiment.color}
          index={3}
        />
      </div>

      <SentimentMiniChart
        summary={data.sentiment_summary}
        selectedSentiment={selectedSentiment}
        onSentimentSelect={setSelectedSentiment}
        dark={dark}
      />

      {comments.length > 0 && (
        <ChartCard
          dark={dark}
          title={commentsTitle}
          titleAction={
            selectedSentiment ? (
              <ClearFilterButton dark={dark} onClick={() => setSelectedSentiment(null)} />
            ) : null
          }
        >
          <CommentsList
            comments={comments}
            selectedSentiment={selectedSentiment}
            showAuthor
            dark={dark}
          />
        </ChartCard>
      )}

      {data.videos?.length > 0 && (
        <ChartCard
          dark={dark}
          collapsible
          defaultOpen={false}
          title={`Videos analizados (${data.videos.length})`}
        >
          <div className="max-h-72 overflow-y-auto scrollbar-hide text-left">
            {data.videos.map((v, i) => (
              <div
                key={v.video_id || i}
                className={`py-3 flex justify-between gap-3 text-sm text-left ${
                  i < data.videos.length - 1 ? `border-b ${dividerClass}` : ''
                }`}
              >
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1 flex-wrap justify-start">
                    <span className={`font-medium ${dark ? 'text-slate-100' : 'text-slate-800'}`}>@{v.author}</span>
                    {v.topic && (
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                        dark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {v.topic}
                      </span>
                    )}
                  </div>
                  <p className={`line-clamp-2 mt-0.5 text-left ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{v.text}</p>
                </div>
                <div className={`flex flex-col items-end gap-2 text-sm shrink-0 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    {v.comments_count?.toLocaleString?.() ?? v.comments_count ?? 0}
                  </div>
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-400">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}

const SearchQueryHeader = ({ keyword, dark }) => {
  if (!keyword) return null

  return (
    <div className="text-center space-y-2 mb-6 px-2">
      <p className={`text-sm lg:text-base leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        Esta es la opinión más reciente sobre el tema de su búsqueda
      </p>
      <p
        className={`text-2xl lg:text-3xl font-bold tracking-tight leading-snug break-words ${
          dark
            ? 'bg-gradient-to-r from-[#60a5fa] via-[#67e8f9] to-[#f472b6] bg-clip-text text-transparent'
            : 'text-primary-700'
        }`}
      >
        &ldquo;{keyword}&rdquo;
      </p>
    </div>
  )
}

const SummaryPanel = ({ facebook, tiktok, dark }) => {
  const fbSummary = facebook?.sentiment_summary
  const ttSummary = tiktok?.sentiment_summary

  const totalComments = (facebook?.comments_analyzed || 0) + (tiktok?.comments_analyzed || 0)
  const totalPositive = (fbSummary?.positive || 0) + (ttSummary?.positive || 0)
  const totalNegative = (fbSummary?.negative || 0) + (ttSummary?.negative || 0)
  const totalNeutral = (fbSummary?.neutral || 0) + (ttSummary?.neutral || 0)
  const totalAll = totalPositive + totalNegative + totalNeutral

  const combinedPie = totalAll > 0 ? [
    { name: 'Positivo', value: totalPositive, color: SENTIMENT_COLORS.positivo },
    { name: 'Negativo', value: totalNegative, color: SENTIMENT_COLORS.negativo },
    { name: 'Neutral', value: totalNeutral, color: SENTIMENT_COLORS.neutral },
  ].filter((d) => d.value > 0) : []

  return (
    <div className="space-y-4 text-left">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total comentarios" value={totalComments} icon={MessageSquare} color="primary" index={0} />
        <StatCard title="Positivos" value={totalPositive} icon={Smile} color="positive" index={1} />
        <StatCard title="Negativos" value={totalNegative} icon={Frown} color="negative" index={2} />
        <StatCard title="Neutrales" value={totalNeutral} icon={MessageSquare} color="neutral" index={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-5 border-l-4 border-l-[#1877F2] rounded-2xl ${dark ? 'bg-slate-800/50 border border-slate-700/40' : 'card-base'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Facebook size={18} className="text-[#60a5fa]" />
            <h4 className={`font-semibold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>Facebook</h4>
          </div>
          {facebook ? (
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><p className="text-2xl font-bold text-emerald-600">{fbSummary?.positive_pct ?? 0}%</p><p className="text-slate-500 text-xs">Positivo</p></div>
              <div><p className="text-2xl font-bold text-slate-500">{fbSummary?.neutral_pct ?? 0}%</p><p className="text-slate-500 text-xs">Neutral</p></div>
              <div><p className="text-2xl font-bold text-red-500">{fbSummary?.negative_pct ?? 0}%</p><p className="text-slate-500 text-xs">Negativo</p></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin datos</p>
          )}
        </div>
        <div className={`p-5 border-l-4 border-l-[#ff0050] rounded-2xl ${dark ? 'bg-slate-800/50 border border-slate-700/40' : 'card-base'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Video size={18} className="text-[#f472b6]" />
            <h4 className={`font-semibold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>TikTok</h4>
          </div>
          {tiktok ? (
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><p className="text-2xl font-bold text-emerald-600">{ttSummary?.positive_pct ?? 0}%</p><p className="text-slate-500 text-xs">Positivo</p></div>
              <div><p className="text-2xl font-bold text-slate-500">{ttSummary?.neutral_pct ?? 0}%</p><p className="text-slate-500 text-xs">Neutral</p></div>
              <div><p className="text-2xl font-bold text-red-500">{ttSummary?.negative_pct ?? 0}%</p><p className="text-slate-500 text-xs">Negativo</p></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin datos</p>
          )}
        </div>
      </div>

      {combinedPie.length > 0 && (
        <ChartCard dark={dark} title="Sentimiento combinado">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
                <Pie
                  data={combinedPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderSentimentPieLabel}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {combinedPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  )
}

const LOADING_STEPS = [
  // Pesos realistas: scrape + análisis son lo más lento; la visualización es breve.
  { id: 'search', label: 'Buscando en Redes Sociales', icon: Search, durationMs: 14000, progressStart: 0, progressEnd: 16 },
  { id: 'comments', label: 'Recopilando comentarios recientes', icon: MessageSquare, durationMs: 52000, progressStart: 16, progressEnd: 52 },
  { id: 'analyze', label: 'Analizando sentir del comentario', icon: Sparkles, durationMs: 58000, progressStart: 52, progressEnd: 90 },
  { id: 'prepare', label: 'Preparando visualización de los resultados', icon: Clock, durationMs: 10000, progressStart: 90, progressEnd: 96 },
]

const UnifiedSearchLoading = ({ keyword, dark = false, complete = false, onStop = null }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(2)

  useEffect(() => {
    if (complete) {
      setStepIndex(LOADING_STEPS.length - 1)
      setProgress(100)
      return undefined
    }

    setStepIndex(0)
    setProgress(2)
    let step = 0
    let stepStartedAt = Date.now()

    const tick = setInterval(() => {
      const cfg = LOADING_STEPS[step]
      const elapsed = Date.now() - stepStartedAt
      const t = Math.min(1, elapsed / cfg.durationMs)
      // Avance decelerado dentro del paso (más tiempo en la parte “pesada”)
      const eased = 1 - (1 - t) ** 1.65
      const value = cfg.progressStart + (cfg.progressEnd - cfg.progressStart) * eased
      setProgress(Math.min(cfg.progressEnd, Math.max(2, value)))

      if (t >= 1) {
        if (step < LOADING_STEPS.length - 1) {
          step += 1
          stepStartedAt = Date.now()
          setStepIndex(step)
        } else {
          // No llega a 100% hasta que la búsqueda realmente termine
          setProgress(cfg.progressEnd)
        }
      }
    }, 180)

    return () => clearInterval(tick)
  }, [keyword, complete])

  const textMuted = dark ? 'text-slate-400' : 'text-slate-500'
  const textMain = dark ? 'text-slate-200' : 'text-slate-800'
  const panelBg = dark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
  const activeStep = LOADING_STEPS[stepIndex]

  return (
    <div className="relative py-10 lg:py-14 text-center px-2">
      {onStop && !complete && (
        <button
          type="button"
          onClick={() => onStop()}
          className="absolute top-0 right-0 z-20 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white
                     bg-rose-600 hover:bg-rose-500 transition-all active:scale-[0.98] shadow-lg shadow-rose-900/30"
        >
          <Square size={14} fill="currentColor" />
          Detener
        </button>
      )}

      <div className="relative mx-auto mb-8 flex items-center justify-center gap-6 lg:gap-10">
        <motion.div
          className="absolute w-40 h-40 lg:w-52 lg:h-52 rounded-full bg-gradient-to-br from-[#1877F2]/20 via-[#00f2ea]/10 to-[#ff0050]/20 blur-2xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="relative z-10 flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-2xl bg-[#1877F2]/15 border border-[#1877F2]/40 shadow-lg shadow-[#1877F2]/20"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Facebook size={32} className="text-[#60a5fa]" />
          <span className="absolute -inset-1 rounded-2xl border border-[#1877F2]/30 animate-ping opacity-40" />
        </motion.div>

        <motion.div
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 border border-slate-600/60"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#1877F2] to-[#ff0050]" />
        </motion.div>

        <motion.div
          className="relative z-10 flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-2xl bg-[#ff0050]/15 border border-[#ff0050]/40 shadow-lg shadow-[#ff0050]/20"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <Video size={32} className="text-[#f472b6]" />
          <span className="absolute -inset-1 rounded-2xl border border-[#ff0050]/30 animate-ping opacity-40" style={{ animationDelay: '0.5s' }} />
        </motion.div>
      </div>

      <p className={`text-sm lg:text-base mb-2 ${textMuted}`}>
        Analizando la opinión ciudadana sobre
      </p>
      <p className="text-xl lg:text-2xl font-bold tracking-tight mb-3 bg-gradient-to-r from-[#60a5fa] via-[#67e8f9] to-[#f472b6] bg-clip-text text-transparent break-words">
        &ldquo;{keyword}&rdquo;
      </p>
      <p className={`text-xs lg:text-sm mb-8 max-w-lg mx-auto ${textMuted}`}>
        Este proceso puede tardar entre 1 y 3 minutos. Por favor espera mientras recopilamos y analizamos los comentarios.
      </p>

      <div className={`max-w-md mx-auto rounded-2xl border p-4 lg:p-5 text-left ${panelBg}`}>
        <div className="space-y-3 mb-5">
          {LOADING_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = !complete && index === stepIndex
            const isDone = complete || index < stepIndex
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 transition-opacity duration-300 ${
                  isActive ? 'opacity-100' : isDone ? 'opacity-70' : 'opacity-35'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                    isActive || (complete && index === LOADING_STEPS.length - 1)
                      ? 'bg-gradient-to-br from-[#1877F2] to-[#ff0050] text-white'
                      : dark
                        ? 'bg-slate-700/70 text-slate-400'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className={`text-sm ${isActive ? `font-semibold ${textMain}` : textMuted}`}>
                  {step.label}
                  {isActive && (
                    <motion.span
                      className="inline-block ml-1"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      …
                    </motion.span>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <div className={`h-1.5 w-full rounded-full overflow-hidden ${dark ? 'bg-slate-700/80' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1877F2] via-[#00f2ea] to-[#ff0050] transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`mt-3 text-center text-xs ${textMuted}`}>
          {complete
            ? 'Listo'
            : `${activeStep?.label || ''} · ${Math.round(progress)}%`}
        </p>
      </div>
    </div>
  )
}

const UnifiedSearchResults = ({
  keyword,
  facebook,
  tiktok,
  facebookError,
  tiktokError,
  loading = false,
  stoppedMessage = null,
  stoppedFading = false,
  onStoppedFadeComplete = null,
  onStop = null,
  dark = false,
}) => {
  const [activeTab, setActiveTab] = useState('summary')
  const [showLoading, setShowLoading] = useState(false)
  const [loadComplete, setLoadComplete] = useState(false)

  useEffect(() => {
    if (stoppedMessage) {
      setShowLoading(false)
      setLoadComplete(false)
      return undefined
    }

    if (loading) {
      setActiveTab('summary')
      setShowLoading(true)
      setLoadComplete(false)
      return undefined
    }

    if (showLoading) {
      setLoadComplete(true)
      setActiveTab('summary')
      const timer = setTimeout(() => {
        setShowLoading(false)
        setLoadComplete(false)
      }, 700)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [loading, showLoading, stoppedMessage])

  const hasAnyResult = facebook || tiktok
  const hasAnyError = facebookError || tiktokError
  const shouldShow = Boolean(keyword || loading || hasAnyResult || hasAnyError || stoppedMessage)

  return (
    <AnimatePresence>
      {shouldShow && (
      <motion.div
        key="unified-search-results"
        id="unified-search-results"
        className="w-full max-w-5xl mx-auto mt-10 scroll-mt-8 text-left"
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: stoppedFading ? 0 : 1,
          y: stoppedFading ? 4 : 0,
          transition: stoppedFading
            ? { duration: 2.6, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.4 },
        }}
        exit={{
          opacity: 0,
          y: 6,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        }}
        onAnimationComplete={() => {
          if (stoppedFading) onStoppedFadeComplete?.()
        }}
      >
        <div className={`p-5 lg:p-7 rounded-2xl text-left ${
          dark
            ? 'bg-slate-900/75 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/30'
            : 'card-base'
        }`}>
          {stoppedMessage ? (
            <div className={`py-10 text-center ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              <p className="text-lg lg:text-xl font-semibold mb-2">{stoppedMessage}</p>
              <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                La búsqueda se ha cancelado, realice una nueva búsqueda pulsando en el buscador
              </p>
            </div>
          ) : showLoading ? (
            <UnifiedSearchLoading
              keyword={keyword}
              dark={dark}
              complete={loadComplete}
              onStop={loading ? onStop : null}
            />
          ) : (
            <>
              <SearchQueryHeader keyword={keyword} dark={dark} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 mb-5">
                <div className={`flex gap-1 p-1 rounded-xl ${dark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? dark
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : dark
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {(facebookError || tiktokError) && (
                <div className="mb-4 space-y-2">
                  {facebookError && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${
                      dark ? 'text-red-300 bg-red-950/50 border border-red-900/50' : 'text-red-700 bg-red-50'
                    }`}>
                      <AlertCircle size={16} />
                      <span><strong>Facebook:</strong> {facebookError}</span>
                    </div>
                  )}
                  {tiktokError && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${
                      dark ? 'text-red-300 bg-red-950/50 border border-red-900/50' : 'text-red-700 bg-red-50'
                    }`}>
                      <AlertCircle size={16} />
                      <span><strong>TikTok:</strong> {tiktokError}</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'summary' && <SummaryPanel facebook={facebook} tiktok={tiktok} dark={dark} />}
              {activeTab === 'facebook' && (
                facebook ? <FacebookPanel data={facebook} dark={dark} /> : (
                  <p className={`text-center py-8 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No hay resultados de Facebook
                  </p>
                )
              )}
              {activeTab === 'tiktok' && (
                tiktok ? <TikTokPanel data={tiktok} dark={dark} /> : (
                  <p className={`text-center py-8 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No hay resultados de TikTok
                  </p>
                )
              )}
            </>
          )}
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UnifiedSearchResults
