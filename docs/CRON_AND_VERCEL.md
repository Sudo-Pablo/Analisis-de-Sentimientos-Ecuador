# Guía rápida: Cron 12h + Vercel

API producción: `https://sentiment-api-i0wt.onrender.com`

## 1) Cron Job cada 12 horas (Render)

1. Dashboard Render → **New** → **Cron Job**
2. Conecta el mismo repo `Sudo-Pablo/Analisis-de-Sentimientos-Ecuador`, branch `main`
3. Configura:

| Campo | Valor |
|---|---|
| **Name** | `sentiment-scheduled-collection` |
| **Region** | Virginia (US East) — misma que la API/BD |
| **Schedule** | `0 */12 * * *` (cada 12 horas) |
| **Build Command** | `pip install -r requirements.txt` |
| **Command** | `python scripts/scrapers/run_scheduled_realtime_collection.py --max-posts 2 --max-comments 5` |

4. **Environment** (mismas credenciales Internal que `sentiment-api`):

- `PYTHON_VERSION=3.10.14`
- `ENVIRONMENT=production`
- `DB_SSLMODE=require`
- `DB_HOST` = solo `dpg-d9n81te1egvs73figlc0-a` (sin `/dbname`)
- `DB_PORT=5432`
- `DB_NAME=sentiment_analysis_a5uy`
- `DB_USER=sentiment`
- `DB_PASSWORD=...`
- `APIFY_TOKEN=...`
- `WARMUP_SENTIMENT=false`

5. Crea el Cron. Luego **Trigger Run** manual una vez y revisa logs.

**Nota RAM:** el Cron también carga BETO al analizar. En plan Starter (512 MB) puede fallar por OOM; para corridas estables conviene Standard (2 GB) o más, igual que la API.

Alternativa HTTP (si prefieres disparar el endpoint):

```bash
curl -X POST "https://sentiment-api-i0wt.onrender.com/api/internal/scheduled-collection" \
  -H "X-Cron-Secret: TU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"max_posts\":2,\"max_comments\":5}"
```

(Requiere `CRON_SECRET` en Environment de la API.)

## 2) Frontend en Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importa el repo de GitHub
2. Configura:

| Campo | Valor |
|---|---|
| **Root Directory** | `frontend` |
| **Framework** | Vite |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default) |

3. **Environment Variable**:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://sentiment-api-i0wt.onrender.com/api` |

4. Deploy. Copia la URL (ej. `https://tu-app.vercel.app`).

5. En Render → `sentiment-api` → **Environment** → actualiza:

```text
ALLOWED_ORIGINS=https://tu-app.vercel.app,http://localhost:5173,http://localhost:3000
```

(Guarda y redeploya la API para aplicar CORS.)

6. Abre el frontend en Vercel y prueba el dashboard / una búsqueda corta.
