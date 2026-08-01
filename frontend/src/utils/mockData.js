// Generar datos de sentimiento simulados
export const generateSentimentData = (days = 7) => {
  const data = []
  const today = new Date('2026-02-01')
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      dateLabel: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      positive: Math.floor(Math.random() * 100) + 50,
      negative: Math.floor(Math.random() * 80) + 20,
      neutral: Math.floor(Math.random() * 120) + 80
    })
  }
  
  return data
}

// Generar datos por tema
export const generateTopicData = () => {
  return [
    { topic: 'Seguridad', value: Math.floor(Math.random() * 200) + 150, color: '#ef4444' },
    { topic: 'Política', value: Math.floor(Math.random() * 180) + 120, color: '#3b82f6' },
    { topic: 'Economía', value: Math.floor(Math.random() * 160) + 100, color: '#10b981' },
    { topic: 'Salud', value: Math.floor(Math.random() * 140) + 80, color: '#f59e0b' },
    { topic: 'Daniel Noboa', value: Math.floor(Math.random() * 130) + 70, color: '#8b5cf6' }
  ]
}

// Generar comentarios simulados
export const generateComments = (count = 10) => {
  const comments = []
  const sampleComments = [
    { text: 'Excelente trabajo, sigan así!', sentiment: 'Positivo' },
    { text: 'No estoy de acuerdo con estas políticas', sentiment: 'Negativo' },
    { text: 'Esperemos que mejore la situación', sentiment: 'Neutral' },
    { text: 'Muy decepcionado con los resultados', sentiment: 'Negativo' },
    { text: 'Gran avance para el país', sentiment: 'Positivo' },
    { text: 'Necesitamos más información al respecto', sentiment: 'Neutral' },
    { text: 'Totalmente en desacuerdo', sentiment: 'Negativo' },
    { text: 'Esto es lo que necesitábamos', sentiment: 'Positivo' },
    { text: 'No tengo opinión formada aún', sentiment: 'Neutral' },
    { text: 'Pésima gestión de recursos', sentiment: 'Negativo' }
  ]
  
  const topics = ['Seguridad', 'Política', 'Economía', 'Salud', 'Daniel Noboa']
  const sources = ['Facebook', 'TikTok']
  
  for (let i = 0; i < count; i++) {
    const sample = sampleComments[i % sampleComments.length]
    comments.push({
      id: i + 1,
      text: sample.text,
      sentiment: sample.sentiment,
      confidence: (Math.random() * 0.3 + 0.7).toFixed(2), // 0.70 - 1.00
      topic: topics[Math.floor(Math.random() * topics.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      date: new Date(2026, 0, Math.floor(Math.random() * 28) + 1).toLocaleDateString('es-ES')
    })
  }
  
  return comments
}

// Generar datos de heatmap (día/hora)
export const generateHeatmapData = () => {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const data = []
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        day: days[day],
        hour: hour,
        value: Math.floor(Math.random() * 100)
      })
    }
  }
  
  return data
}

// Generar datos de distribución de redes sociales
export const generateSocialNetworkData = () => {
  return [
    { name: 'Facebook', value: Math.floor(Math.random() * 1000) + 500, color: '#1877F2' },
    { name: 'TikTok', value: Math.floor(Math.random() * 800) + 400, color: '#000000' }
  ]
}

// Generar métricas de KPI
export const generateKPIs = () => {
  const total = Math.floor(Math.random() * 2000) + 1000
  const positive = Math.floor(total * (Math.random() * 0.2 + 0.3)) // 30-50%
  const negative = Math.floor(total * (Math.random() * 0.15 + 0.15)) // 15-30%
  const neutral = total - positive - negative
  
  return {
    positive: { value: positive, change: Math.floor(Math.random() * 30) - 10 },
    neutral: { value: neutral, change: Math.floor(Math.random() * 20) - 5 },
    negative: { value: negative, change: Math.floor(Math.random() * 25) - 15 },
    total: { value: total, change: Math.floor(Math.random() * 40) - 10 }
  }
}
