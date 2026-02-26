# M2 Market Analytics

A full-stack market analysis dashboard for Metin2 — track item prices in real time, get Telegram alerts when prices drop, and manage your watchlist across every server.

> **Based on [metin2-marketscanner](https://github.com/uzunbugra/metin2-marketscanner) by [@uzunbugra](https://github.com/uzunbugra).**
> Huge thanks for building the original project — it was the foundation for everything here! 🙏

---

## 🚀 Features

| Feature | Description |
|---|---|
| **JSON-API Scraper** | Fetches data directly from the metin2alerts.com JSON API — no browser/Playwright required |
| **100+ Servers** | Full server list (TR, DE, EN, ES, IT, PL, RO, CZ, …) with per-server data |
| **Watchlist & Auto-Scrape** | Add items to a watchlist with configurable scrape intervals; the scheduler runs in the background |
| **Telegram Alerts** | Configure a Telegram bot and set price thresholds — get notified instantly when a deal appears |
| **Price History & Charts** | Interactive Chart.js graphs showing price trends over time |
| **Fake-Seller Filter** | Mark known fake sellers to exclude them from your results |
| **Favorites** | Star items for quick access |
| **Upgrade-Level Filter** | Filter listings by upgrade level (+0 … +9) |
| **Docker-Ready** | One-command deployment with `docker compose up` |

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** SQLite
- **Scraping:** httpx + JSON API (lightweight, no headless browser)
- **ORM:** SQLAlchemy
- **Scheduling:** Custom tick-based scheduler with watchlist support
- **Notifications:** Telegram Bot API via httpx

### Frontend
- **Framework:** Next.js 14 (React, App Router)
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Charts:** Chart.js / react-chartjs-2
- **Icons:** Lucide React

## 📂 Project Structure

```
M2-Market-Analytics/
├── backend/                # FastAPI backend, scraper & scheduler
│   ├── database/           # SQLite schema
│   ├── routers/            # API endpoints (market.py)
│   ├── main.py             # FastAPI app entry point
│   ├── scraper.py          # JSON-API scraper (100+ servers)
│   ├── scheduler.py        # Watchlist auto-scrape & Telegram alerts
│   ├── telegram_bot.py     # Telegram Bot integration
│   └── ...
├── frontend/               # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # UI components (ListingTable, PriceChart, FavoritesList, …)
│   └── lib/api.ts          # API client
├── docker-compose.yml      # Full-stack Docker deployment
├── Dockerfile.backend      # Backend image (Python 3.11-slim)
├── Dockerfile.frontend     # Frontend image (Node 20-alpine, standalone)
├── entrypoint.sh           # Backend entrypoint (scheduler + uvicorn)
└── data/                   # SQLite database (created at runtime)
```

## ⚡ Getting Started

### Option A: Docker (recommended)

```bash
# Clone the repo
git clone https://github.com/XythError/M2-Market-Analytics.git
cd M2-Market-Analytics

# (Optional) edit docker-compose.yml to set SEARCH_QUERY, SERVER_NAME, NEXT_PUBLIC_API_URL

# Build & start
docker compose up -d --build
```

- **Backend API:** `http://localhost:8085`
- **Frontend:** `http://localhost:3001`

### Option B: Manual Setup

#### Prerequisites
- Python 3.11+
- Node.js 18+

#### 1. Backend

```bash
pip install -r requirements.txt
cp backend/.env.example backend/.env   # edit as needed
uvicorn backend.main:app --reload
```

#### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:3000`.

## 🔔 Telegram Alerts

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token.
2. Open the dashboard → **Settings** → enter your Bot Token and Chat ID.
3. Add watchlist items and set price thresholds — you'll receive alerts when prices cross your limits.

## 🔒 Security Note

- Never commit `.env` or `.env.local` files — they are excluded via `.gitignore`.
- `ALLOWED_ORIGINS` can be set in `backend/.env` to restrict CORS.

## 🙏 Acknowledgements

This project is a fork / extension of **[metin2-marketscanner](https://github.com/uzunbugra/metin2-marketscanner)** by **[@uzunbugra](https://github.com/uzunbugra)**. The original project provided the core architecture (FastAPI backend, Next.js frontend, SQLite database, and the initial scraping logic). Thank you for the excellent foundation!

### What was added in this version
- Replaced Playwright/browser scraping with a direct JSON-API approach (faster, lighter)
- Full server list (100+ servers across all regions)
- Watchlist system with configurable auto-scrape intervals
- Telegram Bot integration with price alerts
- Fake-seller filtering
- Favorites system
- Upgrade-level filtering (+0 … +9)
- Docker Compose deployment (backend + frontend)
- Various UI/UX improvements

## 📝 License

[MIT](LICENSE)
