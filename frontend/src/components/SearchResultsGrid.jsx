import { useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import ChartCard from './ChartCard'

const SENTIMENT_COLORS = {
  Positivo: '#10b981',
  Negativo: '#ef4444',
  Neutral: '#6b7280',
  positivo: '#10b981',
  negativo: '#ef4444',
  neutral: '#6b7280',
}

const SENTIMENT_LABEL_COLORS = {
  Positivo: '#047857',
  Negativo: '#b91c1c',
  Neutral: '#374151',
}

const BAR_TO_SENTIMENT = {
  Positivo: 'positivo',
  Negativo: 'negativo',
  Neutral: 'neutral',
}

export const renderSentimentPieLabel = ({
  name,
  percent,
  cx,
  cy,
  midAngle,
  outerRadius,
}) => {
  if (percent == null || Number.isNaN(percent)) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius * 1.22
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const fill = SENTIMENT_LABEL_COLORS[name] || '#0f172a'

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={12}
      fontWeight={600}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ pointerEvents: 'none' }}
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const SearchResultsGrid = ({
  barData,
  pieData,
  contentTitle,
  contentChildren,
  commentsTitle,
  commentsChildren,
  showCharts = true,
  selectedSentiment = null,
  onSentimentSelect,
}) => {
  const [hoveredBar, setHoveredBar] = useState(null)
  const [hoveredPie, setHoveredPie] = useState(null)

  const barChartData = barData || []
  const pieChartData = pieData || []
  const filteringEnabled = typeof onSentimentSelect === 'function'

  const handleSentimentClick = (entry) => {
    if (!filteringEnabled) return
    const sentiment = BAR_TO_SENTIMENT[entry?.name]
    if (!sentiment) return
    onSentimentSelect(selectedSentiment === sentiment ? null : sentiment)
  }

  const getSliceStyle = (entryName) => {
    if (!filteringEnabled) {
      return { opacity: 1, stroke: 'transparent', strokeWidth: 0 }
    }
    const sentiment = BAR_TO_SENTIMENT[entryName]
    const isSelected = selectedSentiment === sentiment
    const isHovered = hoveredPie === entryName || hoveredBar === entryName
    const isDimmed = selectedSentiment && !isSelected
    let opacity = 1
    if (isDimmed) opacity = 0.35
    else if (isHovered) opacity = 0.72
    return {
      opacity,
      stroke: isSelected || isHovered ? 'rgba(15,23,42,0.35)' : 'transparent',
      strokeWidth: isSelected || isHovered ? 1.5 : 0,
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 lg:items-start">
      <div className="flex flex-col gap-4 lg:gap-6">
        {contentTitle && (
          <ChartCard title={contentTitle} muted>
            {contentChildren}
          </ChartCard>
        )}
        {!contentTitle && contentChildren}

        {commentsTitle && (
          <ChartCard title={commentsTitle} muted>
            <div className="max-h-[44rem] overflow-y-auto scrollbar-hide pr-1 space-y-3">
              {commentsChildren}
            </div>
          </ChartCard>
        )}
      </div>

      {showCharts && barChartData.length > 0 && (
        <div className="flex flex-col gap-4 lg:gap-6">
          {filteringEnabled && (
            <div className="rounded-xl px-4 py-3 border bg-sky-50 border-sky-300 text-sky-900">
              <p className="text-sm sm:text-base font-semibold leading-snug">
                Tip: haga clic en las barras o en el diagrama circular para filtrar los comentarios por sentimiento
              </p>
              <p className="text-xs sm:text-sm mt-1 text-sky-700/90">
                Puede activar y desactivar el filtro tocando de nuevo el mismo color
              </p>
            </div>
          )}

          <ChartCard title="Conteo por Sentimiento" muted>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.35)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} />
                <Tooltip cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  cursor={filteringEnabled ? 'pointer' : 'default'}
                  activeBar={false}
                >
                  {barChartData.map((entry, index) => {
                    const style = getSliceStyle(entry.name)
                    return (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.fill || SENTIMENT_COLORS[entry.name]}
                        opacity={style.opacity}
                        stroke={style.stroke}
                        strokeWidth={style.strokeWidth}
                        onClick={() => handleSentimentClick(entry)}
                        onMouseEnter={() => filteringEnabled && setHoveredBar(entry.name)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución de Sentimientos" muted>
            <div className="overflow-visible">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderSentimentPieLabel}
                    labelLine={false}
                    isAnimationActive={false}
                    activeShape={false}
                  >
                    {pieChartData.map((entry, index) => {
                      const style = getSliceStyle(entry.name)
                      return (
                        <Cell
                          key={`pie-${index}`}
                          fill={entry.color || entry.fill}
                          opacity={style.opacity}
                          stroke={style.stroke}
                          strokeWidth={style.strokeWidth}
                          cursor={filteringEnabled ? 'pointer' : 'default'}
                          onClick={() => handleSentimentClick(entry)}
                          onMouseEnter={() => filteringEnabled && setHoveredPie(entry.name)}
                          onMouseLeave={() => setHoveredPie(null)}
                        />
                      )
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-1 px-1">
                {pieChartData.map((entry) => {
                  const total = pieChartData.reduce((sum, d) => sum + (d.value || 0), 0) || 1
                  const pct = Math.round(((entry.value || 0) / total) * 100)
                  return (
                    <span
                      key={`legend-${entry.name}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color || entry.fill || SENTIMENT_COLORS[entry.name] }}
                      />
                      {entry.name}: {pct}%
                    </span>
                  )
                })}
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  )
}

export const buildSentimentChartData = (summary) => {
  if (!summary) return { barData: [], pieData: [] }
  const pieData = [
    { name: 'Positivo', value: summary.positive || 0, color: SENTIMENT_COLORS.Positivo },
    { name: 'Negativo', value: summary.negative || 0, color: SENTIMENT_COLORS.Negativo },
    { name: 'Neutral', value: summary.neutral || 0, color: SENTIMENT_COLORS.Neutral },
  ].filter((d) => d.value > 0)

  const barData = pieData.map((d) => ({ name: d.name, count: d.value, fill: d.color }))
  return { barData, pieData }
}

export default SearchResultsGrid
