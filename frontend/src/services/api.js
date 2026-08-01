/**
 * Servicio para consumir la API de análisis de sentimientos
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export class SearchStoppedError extends Error {
  constructor(message = 'Búsqueda detenida') {
    super(message)
    this.name = 'SearchStoppedError'
    this.stopped = true
  }
}

export const createSearchId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `search_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Helper para manejar respuestas de la API
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    const detail = error.detail || `Error HTTP ${response.status}`
    if (
      response.status === 409
      && typeof detail === 'string'
      && detail.toLowerCase().includes('detenida')
    ) {
      throw new SearchStoppedError(detail)
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return response.json();
};

/**
 * Helper para construir query params
 */
const buildQueryParams = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
};

// === SENTIMENTS API ===

/**
 * Obtener datos del dashboard
 * @param {number} days - Días hacia atrás (default: 7)
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.platform - Filtrar por plataforma (facebook, tiktok)
 * @param {number} filters.topicId - Filtrar por tema
 */
export const getDashboard = async (days = 7, filters = {}) => {
  const queryParams = buildQueryParams({
    days,
    platform: filters.platform !== 'all' ? filters.platform : null,
    topic_id: filters.topicId !== 'all' ? filters.topicId : null,
    start_date: filters.start_date || null,
    end_date: filters.end_date || null,
  });
  const response = await fetch(`${API_BASE_URL}/sentiments/dashboard?${queryParams}`);
  return handleResponse(response);
};

/**
 * Obtener estadísticas de sentimientos
 * @param {number|null} topicId - ID del tema (opcional)
 * @param {number} days - Días hacia atrás
 */
export const getSentimentStats = async (topicId = null, days = 7) => {
  const queryParams = buildQueryParams({ topic_id: topicId, days });
  const response = await fetch(`${API_BASE_URL}/sentiments/stats?${queryParams}`);
  return handleResponse(response);
};

/**
 * Obtener evolución temporal de sentimientos
 * @param {number} days - Días hacia atrás
 */
export const getSentimentEvolution = async (days = 7) => {
  const queryParams = buildQueryParams({ days });
  const response = await fetch(`${API_BASE_URL}/sentiments/evolution?${queryParams}`);
  return handleResponse(response);
};

// === TOPICS API ===

/**
 * Obtener todos los temas
 * @param {boolean} activeOnly - Solo temas activos
 */
export const getTopics = async (activeOnly = true) => {
  const queryParams = buildQueryParams({ active_only: activeOnly });
  const response = await fetch(`${API_BASE_URL}/topics?${queryParams}`);
  return handleResponse(response);
};

/**
 * Obtener un tema específico
 * @param {number} topicId - ID del tema
 */
export const getTopic = async (topicId) => {
  const response = await fetch(`${API_BASE_URL}/topics/${topicId}`);
  return handleResponse(response);
};

// === COMMENTS API ===

/**
 * Obtener comentarios con filtros
 * @param {Object} filters - Filtros opcionales
 * @param {number} filters.topicId - Filtrar por tema
 * @param {string} filters.sentiment - Filtrar por sentimiento (positivo, negativo, neutral)
 * @param {number} filters.days - Días hacia atrás
 * @param {number} filters.limit - Límite de resultados
 * @param {number} filters.offset - Offset para paginación
 */
export const getComments = async (filters = {}) => {
  const queryParams = buildQueryParams({
    topic_id: filters.topicId,
    sentiment: filters.sentiment,
    days: filters.days !== undefined && filters.days !== null ? filters.days : 7,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    start_date: filters.start_date || null,
    end_date: filters.end_date || null,
  });
  const response = await fetch(`${API_BASE_URL}/comments?${queryParams}`);
  return handleResponse(response);
};

/**
 * Obtener un comentario específico
 * @param {number} commentId - ID del comentario
 */
export const getComment = async (commentId) => {
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`);
  return handleResponse(response);
};

// === REPORTS API ===

/**
 * Obtener reportes semanales
 * @param {number|null} topicId - ID del tema (opcional)
 * @param {number} weeks - Número de semanas hacia atrás
 */
export const getReports = async (topicId = null, weeks = 4) => {
  const queryParams = buildQueryParams({ topic_id: topicId, weeks });
  const response = await fetch(`${API_BASE_URL}/reports?${queryParams}`);
  return handleResponse(response);
};

/**
 * Obtener el reporte más reciente
 * @param {number|null} topicId - ID del tema (opcional)
 */
export const getLatestReport = async (topicId = null) => {
  const queryParams = buildQueryParams({ topic_id: topicId });
  const response = await fetch(`${API_BASE_URL}/reports/latest?${queryParams}`);
  return handleResponse(response);
};

/**
 * Obtener un reporte específico
 * @param {number} reportId - ID del reporte
 */
export const getReport = async (reportId) => {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`);
  return handleResponse(response);
};

// === HEALTH CHECK ===

/**
 * Verificar estado de la API
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse(response);
};

// === TIKTOK API ===

/**
 * Buscar en TikTok, analizar sentimientos y guardar en BD
 * @param {Object} params - Parámetros de búsqueda
 * @param {string} params.keyword - Palabra clave a buscar
 * @param {string|null} params.categoria - Categoría para clasificar
 * @param {number} params.max_videos - Máximo de videos
 * @param {number} params.max_comments_per_video - Máximo comentarios por video
 */
export const searchTikTok = async (params, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/tiktok/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params),
    signal: options.signal,
  });
  return handleResponse(response);
};

/**
 * Obtener categorías y keywords disponibles para TikTok
 */
export const getTikTokCategories = async () => {
  const response = await fetch(`${API_BASE_URL}/tiktok/categories`);
  return handleResponse(response);
};

/**
 * Verificar estado del servicio TikTok
 */
export const getTikTokStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/tiktok/status`);
  return handleResponse(response);
};

// === FACEBOOK API ===

/**
 * Buscar en Facebook en tiempo real (método ppr o apify)
 * @param {Object} params - Parámetros de búsqueda
 * @param {string} params.keyword - Palabra clave
 * @param {string|null} params.categoria - Categoría opcional
 * @param {'ppr'|'apify'} params.method - Método de scraping
 * @param {number} params.max_posts - Máximo de posts
 * @param {number} params.max_comments_per_post - Máximo comentarios por post
 * @param {'global'|'pages'|'places'|'posts'} [params.search_type] - Tipo de búsqueda PPR
 * @param {string} [params.location] - Ubicación para búsqueda PPR
 * @param {boolean} [params.dual_search] - Si true, PPR ejecuta posts+global y deduplica
 */
export const searchFacebook = async (params, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/facebook/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params),
    signal: options.signal,
  });
  return handleResponse(response);
};

/**
 * Detener una búsqueda en curso (aborta runs Apify asociados).
 */
export const cancelSearch = async (searchId) => {
  if (!searchId) return { ok: false }
  try {
    const response = await fetch(`${API_BASE_URL}/search/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_id: searchId }),
    })
    return handleResponse(response)
  } catch {
    return { ok: false }
  }
}

/**
 * Obtener categorías y keywords sugeridas para Facebook
 */
export const getFacebookCategories = async () => {
  const response = await fetch(`${API_BASE_URL}/facebook/categories`);
  return handleResponse(response);
};

/**
 * Verificar estado del servicio Facebook en tiempo real
 */
export const getFacebookStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/facebook/status`);
  return handleResponse(response);
};

/**
 * Búsqueda unificada en Facebook (PPR) y TikTok en paralelo.
 * Ambos comparten search_id para que Stop aborte Apify en las dos redes.
 */
export const searchBothNetworks = async ({
  keyword,
  maxPosts = 5,
  maxVideos = 5,
  maxCommentsPerPost = 10,
  maxCommentsPerVideo = 10,
  searchId = null,
  signal = null,
}) => {
  const trimmed = keyword?.trim()
  if (!trimmed) {
    throw new Error('Por favor ingresa una palabra clave')
  }

  const facebookParams = {
    keyword: trimmed,
    categoria: null,
    method: 'ppr',
    max_posts: maxPosts,
    max_comments_per_post: maxCommentsPerPost,
    search_type: 'posts',
    location: 'Ecuador',
    dual_search: true,
    search_id: searchId,
  }

  const tiktokParams = {
    keyword: trimmed,
    categoria: null,
    max_videos: maxVideos,
    max_comments_per_video: maxCommentsPerVideo,
    search_id: searchId,
  }

  const fetchOpts = { signal }

  const wrapNetwork = (promise, label) =>
    promise
      .then((data) => ({ data, error: null }))
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.stopped) throw err
        return {
          data: null,
          error: err.message || `Error al buscar en ${label}`,
        }
      })

  const [tiktok, facebook] = await Promise.all([
    wrapNetwork(searchTikTok(tiktokParams, fetchOpts), 'TikTok'),
    wrapNetwork(searchFacebook(facebookParams, fetchOpts), 'Facebook'),
  ])

  if (signal?.aborted) {
    throw new SearchStoppedError()
  }

  return { facebook, tiktok }
}

/**
 * Registrar una búsqueda para tendencias / hot topics (fire-and-forget).
 */
export const logSearchEvent = async ({ keyword, source = 'unified', category = null }) => {
  const trimmed = keyword?.trim()
  if (!trimmed) return { ok: false }
  try {
    const response = await fetch(`${API_BASE_URL}/search/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: trimmed, source, category }),
    })
    return handleResponse(response)
  } catch {
    return { ok: false }
  }
}

/**
 * Guardar snapshot de resultados de búsqueda unificada (fire-and-forget).
 */
export const saveSearchSnapshot = async ({
  keyword,
  source = 'unified',
  facebook = null,
  tiktok = null,
  facebook_error = null,
  tiktok_error = null,
}) => {
  const trimmed = keyword?.trim()
  if (!trimmed) return { ok: false }
  if (!facebook && !tiktok) return { ok: false }
  try {
    const response = await fetch(`${API_BASE_URL}/search/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: trimmed,
        source,
        facebook,
        tiktok,
        facebook_error,
        tiktok_error,
      }),
    })
    return handleResponse(response)
  } catch {
    return { ok: false }
  }
}

/**
 * Obtener snapshot cacheado de una búsqueda (null si no existe).
 */
export const getSearchSnapshot = async (keyword) => {
  const trimmed = keyword?.trim()
  if (!trimmed) return null
  try {
    const queryParams = buildQueryParams({ keyword: trimmed })
    const response = await fetch(`${API_BASE_URL}/search/snapshot?${queryParams}`)
    if (response.status === 404) return null
    return handleResponse(response)
  } catch {
    return null
  }
}

/**
 * Posts históricos guardados en BD filtrados por categoría.
 */
export const getPostsByCategory = async ({
  category,
  platform = null,
  limit = 8,
  offset = 0,
  excludePostIds = [],
  signal = null,
}) => {
  const trimmed = category?.trim()
  if (!trimmed) {
    throw new Error('La categoría es requerida')
  }

  const queryParams = buildQueryParams({
    category: trimmed,
    platform,
    limit,
    offset,
    exclude_post_ids: excludePostIds.length ? excludePostIds.join(',') : undefined,
  })

  const response = await fetch(`${API_BASE_URL}/posts/by-category?${queryParams}`, { signal })
  return handleResponse(response)
}

/**
 * Tendencias combinadas: búsquedas populares + hot topics
 */
export const getSearchTrends = async ({
  popularDays = 0,
  hotDays = 0,
  popularLimit = 5,
  hotLimit = 6,
} = {}) => {
  const queryParams = buildQueryParams({
    popular_days: popularDays,
    hot_days: hotDays,
    popular_limit: popularLimit,
    hot_limit: hotLimit,
  })
  const response = await fetch(`${API_BASE_URL}/search/trends?${queryParams}`)
  return handleResponse(response)
}

export default {
  getDashboard,
  getSentimentStats,
  getSentimentEvolution,
  getTopics,
  getTopic,
  getComments,
  getComment,
  getReports,
  getLatestReport,
  getReport,
  checkHealth,
  searchTikTok,
  getTikTokCategories,
  getTikTokStatus,
  searchFacebook,
  getFacebookCategories,
  getFacebookStatus,
  searchBothNetworks,
  logSearchEvent,
  saveSearchSnapshot,
  getSearchSnapshot,
  getPostsByCategory,
  getSearchTrends,
  cancelSearch,
  createSearchId,
  SearchStoppedError,
};
