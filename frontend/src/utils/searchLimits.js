/** Límite máximo compartido para posts/videos y comentarios en buscadores. */
export const SEARCH_LIMIT_MAX = 50

/**
 * Parsea el valor de un input de límite numérico.
 * - '' → campo vacío permitido
 * - solo dígitos; tope SEARCH_LIMIT_MAX
 * - null → entrada inválida (ignorar)
 */
export const parseLimitInput = (raw) => {
  if (raw === '') return ''
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  if (n > SEARCH_LIMIT_MAX) return SEARCH_LIMIT_MAX
  return n
}

/**
 * Resuelve el valor final al buscar (1..SEARCH_LIMIT_MAX).
 * Devuelve null si está vacío o es inválido.
 */
export const resolveSearchLimit = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(SEARCH_LIMIT_MAX, Math.floor(n))
}
