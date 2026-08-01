# Sistema de analisis de sentimientos Ecuador v0.1

Plataforma web para explorar la opinión ciudadana en Ecuador a partir de publicaciones y comentarios de **Facebook** y **TikTok**, con análisis de sentimientos en español.

## Qué incluye

- Dashboard con búsqueda unificada, tendencias y resumen histórico
- Análisis por tema (economía, educación, política, salud, seguridad, social)
- Buscadores independientes de Facebook y TikTok
- Tours guiados de onboarding en las secciones principales
- API REST (FastAPI) + frontend (React + Vite)

### Cómo se obtienen los datos

| Red | Método principal | Respaldo |
|-----|------------------|----------|
| Facebook | **Facebook Search PPR** (Apify) | Actores Apify clásicos |
| TikTok | Apify | — |

El análisis de sentimientos usa modelos en español (RoBERTuito / BETO) vía Hugging Face Transformers.

## Requisitos

- Python **3.10+**
- Node.js **18+**
- PostgreSQL **14+** (recomendado 15+)
- Cuenta Apify con token (`APIFY_TOKEN`)

## Estructura del proyecto

```text
Sentiment_analyzer_vU/
├── api/                 # API FastAPI
├── frontend/            # App React (Vite)
├── src/
│   ├── analyzers/       # Análisis de sentimientos
│   ├── collectors/      # Recolección batch (opcional)
│   ├── cleaners/
│   ├── database/        # Modelos y acceso a PostgreSQL
│   └── utils/
├── scripts/
│   ├── run_api.py
│   ├── check_setup.py
│   ├── development/     # Setup e init de BD
│   ├── scrapers/        # Recolección programada / multiplataforma
│   └── data-management/ # Utilidades de verificación de datos
├── config/              # JSON de topics, páginas, multiplataforma
├── data/                # Carpetas de trabajo (vacías en el repo)
├── .env.example
├── requirements.txt
└── pyproject.toml
```

## Configuración rápida

### 1) Clonar e instalar backend

```bash
git clone <URL_DEL_REPOSITORIO>
cd Sentiment_analyzer_vU

python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
# o: pip install -e .
```

### 2) Variables de entorno

```bash
# Raíz del proyecto
cp .env.example .env

# Frontend
cp frontend/.env.example frontend/.env
```

Edita `.env` con tu PostgreSQL y `APIFY_TOKEN`.  
Edita `frontend/.env` si la API no corre en `http://localhost:8000`.

Variables importantes:

| Variable | Uso |
|----------|-----|
| `DB_*` | Conexión PostgreSQL |
| `APIFY_TOKEN` | Búsquedas Facebook/TikTok en tiempo real |
| `ALLOWED_ORIGINS` | Orígenes CORS del frontend (producción) |
| `VITE_API_URL` | URL de la API vista por el frontend |

### 3) Base de datos

```bash
python scripts/development/setup_database.py
python scripts/development/init_database.py
```

Si actualizas una BD antigua:

```bash
python scripts/development/add_multiplatform_columns.py
python scripts/development/migrate_multiplatform_database.py
```

### 4) Arrancar API

```bash
python scripts/run_api.py
```

- API: http://localhost:8000  
- Swagger: http://localhost:8000/docs  
- Health: http://localhost:8000/api/health  

### 5) Arrancar frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

Verificación opcional del entorno:

```bash
python scripts/check_setup.py
```

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado API / BD |
| GET/POST | `/api/sentiments/*` | Métricas e históricos |
| GET | `/api/topics` | Temas |
| POST | `/api/search/unified` | Búsqueda unificada |
| POST | `/api/facebook/search` | Búsqueda Facebook (`method`: `ppr` \| `apify`) |
| POST | `/api/tiktok/search` | Búsqueda TikTok |
| GET | `/api/facebook/status` | Disponibilidad Facebook |
| GET | `/api/tiktok/status` | Disponibilidad TikTok |

## Recolección programada (opcional)

```bash
python scripts/scrapers/run_scheduled_realtime_collection.py --frequency weekly --weekly-day monday
```

También existe el recolector multiplataforma:

```bash
python scripts/scrapers/run_multiplatform_collector.py
```

## Despliegue en la nube (resumen)

1. Provisiona PostgreSQL y carga el esquema (`setup_database` / `init_database`).
2. Configura `.env` en el servidor (`DB_*`, `APIFY_TOKEN`, `ENVIRONMENT=production`, `ALLOWED_ORIGINS` con la URL pública del frontend).
3. Ejecuta la API con un process manager (systemd, Docker, Railway, etc.) escuchando en `0.0.0.0:8000` (o el puerto que uses).
4. Construye el frontend:

```bash
cd frontend
npm ci
# Define VITE_API_URL apuntando a tu API pública
npm run build
```

5. Sirve `frontend/dist` con Nginx, Cloudflare Pages, Vercel, etc.

> La primera carga del modelo de sentimientos puede tardar: la API precalienta el analizador al arrancar.

## Licencia

MIT
