const CONTENT_CATEGORIES = {
  Politica: [
    'gobierno ecuador', 'asamblea ecuador', 'presidente ecuador',
    'elecciones ecuador', 'politica nacional', 'gobierno', 'asamblea',
    'presidente', 'elecciones', 'decreto', 'ley', 'ministro', 'alcalde',
  ],
  Economia: [
    'economia ecuador', 'inflacion ecuador', 'empleo ecuador',
    'dolar ecuador', 'precio combustible', 'economia', 'inflacion',
    'empleo', 'presupuesto', 'impuestos', 'dolar',
  ],
  Salud: [
    'salud publica', 'hospitales ecuador', 'iess ecuador',
    'medicina ecuador', 'ministerio de salud', 'salud', 'hospital',
    'medico', 'enfermedad', 'vacuna', 'msp',
  ],
  Seguridad: [
    'seguridad ecuador', 'delincuencia ecuador', 'policia ecuador',
    'violencia ecuador', 'estado de excepcion', 'seguridad', 'delincuencia',
    'policia', 'violencia', 'robo', 'inseguridad',
  ],
  Educacion: [
    'educacion ecuador', 'universidad ecuador', 'escuelas ecuador',
    'educacion', 'universidad', 'colegio', 'estudiante', 'profesor',
  ],
  Social: [
    'sociedad ecuador', 'cultura ecuador', 'comunidad ecuador',
    'sociedad', 'cultura', 'comunidad', 'tradicion', 'familia',
  ],
}

export const CATEGORY_LABELS = {
  Politica: 'Política',
  Economia: 'Economía',
  Salud: 'Salud',
  Seguridad: 'Seguridad',
  Educacion: 'Educación',
  Social: 'Social',
}

const normalizeText = (value) => {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const classifyKeyword = (keyword) => {
  const textNorm = normalizeText(keyword)
  if (!textNorm) return 'Social'

  let bestCategory = null
  let bestScore = 0

  Object.entries(CONTENT_CATEGORIES).forEach(([category, keywords]) => {
    const score = keywords.reduce(
      (acc, item) => (normalizeText(item) && textNorm.includes(normalizeText(item)) ? acc + 1 : acc),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  })

  return bestCategory || 'Social'
}

const dominantTopic = (topics) => {
  if (!topics.length) return null

  const counts = topics.reduce((acc, topic) => {
    const key = (topic || '').trim()
    if (!key) return acc
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const entries = Object.entries(counts)
  if (!entries.length) return null

  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

export const collectCurrentPostIds = (facebook, tiktok) => {
  const ids = []

  facebook?.posts?.forEach((post) => {
    if (post?.post_id) ids.push(post.post_id)
  })

  tiktok?.videos?.forEach((video) => {
    if (video?.video_id) ids.push(video.video_id)
  })

  return ids
}

export const resolveSearchCategory = ({ keyword, facebook, tiktok }) => {
  const topics = []

  facebook?.posts?.forEach((post) => {
    if (post?.topic) topics.push(post.topic)
  })

  tiktok?.videos?.forEach((video) => {
    if (video?.topic) topics.push(video.topic)
  })

  return dominantTopic(topics) || classifyKeyword(keyword)
}

export const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category
