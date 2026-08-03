# Checklist de despliegue — Render + Vercel

Orden recomendado. Marca cada ítem al completarlo.

## 0. Seguridad del repo (antes de push público)

- [ ] `.env` está en `.gitignore` y **no** se sube
- [ ] `config/scrapers/facebook_session.json` no está en el repo (o está ignorado)
- [ ] Solo existen plantillas `.env.example` / `frontend/.env.example`
- [ ] Rotar `APIFY_TOKEN`, contraseñas de BD y de Facebook si alguna vez estuvieron en GitHub

## 1. Job automático (código local) — hecho en el repo

- [x] Servicio `api/services/scheduled_collection.py` (6 categorías + persistencia)
- [x] Endpoint `POST /api/internal/scheduled-collection` (header `X-Cron-Secret`)
- [x] Preview `GET /api/internal/scheduled-collection/preview`
- [x] Script CLI `scripts/scrapers/run_scheduled_realtime_collection.py`
- [x] Keywords en `config/scheduled_collection.json`
- [x] `render.yaml`

### Prueba local pequeña

```powershell
# En la raíz del proyecto, con venv activo y API/DB locales OK
# 1) Añade CRON_SECRET a tu .env (ej. una cadena larga aleatoria)

# 2) Corrida mínima (1 categoría, 1 plataforma) — consume créditos Apify
python scripts/scrapers/run_scheduled_realtime_collection.py --categories Salud --platforms tiktok --max-posts 1 --max-comments 3

# 3) Con la API corriendo (async encola; sync espera el resultado):
# curl.exe -X POST "http://localhost:8000/api/internal/scheduled-collection?async_mode=false" `
#   -H "X-Cron-Secret: TU_CRON_SECRET" `
#   -H "Content-Type: application/json" `
#   -d "{\"categories\":[\"Salud\"],\"platforms\":[\"tiktok\"],\"max_posts\":1,\"max_comments\":3}"
```

- [ ] La corrida local termina sin el error `background_tasks`
- [ ] Aparecen filas nuevas en PostgreSQL (`fb_posts` / `fb_comments`)

## 2. PostgreSQL en Render + migración

- [ ] Crear Postgres en Render (Blueprint `sentiment-db` o manual)
- [ ] Anotar External Database URL (para `pg_dump` desde tu PC)
- [ ] Export local:

```powershell
pg_dump -h 127.0.0.1 -U postgres -d sentiment_analysis -F c -f sentiment_backup.dump
```

- [ ] Restore en Render (External URL):

```powershell
pg_restore --clean --if-exists -d "postgresql://USER:PASS@HOST:PORT/DBNAME" sentiment_backup.dump
```

- [ ] Alternativa sin datos históricos: crear esquema vacío con tus scripts `scripts/development/init_database.py`

## 3. Desplegar API en Render

Variables del **Web Service** (`sentiment-api`):

| Variable | Origen | Notas |
|---|---|---|
| `DB_HOST` | Render Postgres | Auto vía `render.yaml` |
| `DB_PORT` | Render Postgres | Auto |
| `DB_NAME` | Render Postgres | Auto |
| `DB_USER` | Render Postgres | Auto |
| `DB_PASSWORD` | Render Postgres | Auto |
| `APIFY_TOKEN` | Manual (secret) | Consola Apify |
| `CRON_SECRET` | Manual (secret) | Cadena larga aleatoria |
| `ALLOWED_ORIGINS` | Manual | URL(s) de Vercel, sin barra final |
| `ENVIRONMENT` | `production` | |
| `LOG_LEVEL` | `INFO` | |
| `DATA_DIR` | `./data` | |
| `PYTHON_VERSION` | `3.10.14` | |

- [ ] Deploy del Web Service OK (`GET /` responde)
- [ ] `GET /api/health` → `database: connected`
- [ ] `GET /api/facebook/status` y `/api/tiktok/status` → `available: true`

## 4. Probar búsqueda manual en la nube

- [ ] `POST /api/tiktok/search` con 1 video / 3 comentarios
- [ ] `POST /api/facebook/search` con `method=ppr`, 1 post / 3 comentarios
- [ ] Datos visibles en dashboard / tablas remotas

## 5. Cron cada 3 horas

El Blueprint define el Cron Job `sentiment-scheduled-collection`:

```text
schedule: 0 */3 * * *
command: python scripts/scrapers/run_scheduled_realtime_collection.py --max-posts 5 --max-comments 5
```

Variables del **Cron** (mismas DB + `APIFY_TOKEN`).

- [ ] Primera ejecución manual del Cron desde el dashboard de Render
- [ ] Logs sin errores de token/BD
- [ ] Filas nuevas tras la corrida

Opcional (HTTP, útil para disparos puntuales; puede cortarse por timeout si `async_mode=false`):

```bash
curl -X POST "https://TU-API.onrender.com/api/internal/scheduled-collection" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
```

## 6. Frontend en Vercel

Root directory: `frontend`

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://TU-API.onrender.com/api` |

- [ ] Build/deploy Vercel OK
- [ ] En Render, `ALLOWED_ORIGINS` incluye `https://tu-app.vercel.app`
- [ ] Búsqueda manual desde el navegador funciona contra la API en Render

## 7. Ajustes de límites (siempre modificables)

En producción el cron usa **todas las categorías** y **facebook + tiktok** por defecto.

| Qué quieres cambiar | Dónde |
|---|---|
| Posts/videos por keyword | `config/scheduled_collection.json` → `defaults.max_posts` (ahora **5**) |
| Comentarios por post/video | `defaults.max_comments` (ahora **15**) |
| Keywords por categoría/corrida | `defaults.keywords_per_category` |
| Plataformas | `defaults.platforms` o flag `--platforms` |
| Categorías | omitir flags = las 6; o `--categories Salud Politica ...` |
| Override en Render Cron | `startCommand` en `render.yaml` / dashboard (ej. `--max-posts 10`) |
| Override por HTTP | body JSON del endpoint `/api/internal/scheduled-collection` |

Ejemplos:

```powershell
# Producción local (todas las categorías, ambas plataformas, defaults del JSON)
python scripts/scrapers/run_scheduled_realtime_collection.py

# Subir volumen sin editar el JSON
python scripts/scrapers/run_scheduled_realtime_collection.py --max-posts 10 --max-comments 25 --keywords-per-category 2
```

La prueba con `--categories Salud --platforms tiktok --max-posts 1` **no limita** producción: solo fue un smoke test.

## Notas Render

- `torch` + `transformers` requieren bastante RAM; el plan `free` del web service suele ser insuficiente → Blueprint usa `starter`.
- Free Postgres de Render puede expirar; para tesis/producción valora plan de pago o Neon.
- El Cron Job Python es preferible al `curl` largo: evita timeouts HTTP de corridas de varios minutos.
