// Formatear números con separadores de miles
export const formatNumber = (num) => {
  return new Intl.NumberFormat('es-ES').format(num)
}

// Formatear porcentajes
export const formatPercent = (num, decimals = 1) => {
  return `${num.toFixed(decimals)}%`
}

// Formatear fecha a formato legible
export const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  })
}

// Formatear fecha completa
export const formatDateFull = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

const normalizeSentiment = (sentiment) => {
  if (!sentiment) return 'neutral'
  const key = String(sentiment).toLowerCase()
  if (key.startsWith('pos')) return 'positive'
  if (key.startsWith('neg')) return 'negative'
  return 'neutral'
}

// Obtener clase CSS de color según sentimiento
export const getSentimentColor = (sentiment) => {
  const colors = {
    positive: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    negative: 'text-red-700 bg-red-50 border border-red-200',
    neutral: 'text-slate-600 bg-slate-100 border border-slate-200',
  }
  return colors[normalizeSentiment(sentiment)]
}

// Obtener clase CSS de borde según sentimiento
export const getSentimentBorderColor = (sentiment) => {
  const colors = {
    'Positivo': 'border-positive',
    'Negativo': 'border-negative',
    'Neutral': 'border-neutral'
  }
  return colors[sentiment] || colors['Neutral']
}

// Calcular cambio porcentual
export const calculateChange = (current, previous) => {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}
