# Chili Cook-Off Rating System

A full-stack web app for running chili cook-off competitions. Manages entries, collects judge ratings across multiple categories, and generates live leaderboards with stats and CSV export.

Built this mostly to replace paper scoresheets, but still allow them, at an actual chili cook-off event. Judges rate each entry on heat, flavor, texture, presentation, and overall impression using a simple mobile-friendly interface. Judges can photograph a paper scoresheet and have scores extracted automatically via a local vision model (Ollama + Qwen2.5-VL).

## Features

**Admin Panel**
- Add chili entries with contestant name, description, and photo
- Edit/delete entries with live vote counts
- Toggle voting open/closed
- Configure event name, date, and location

**Voting Interface**
- Browse entries in a card grid with photos
- Rate each chili on 5 categories (1-10 scale) with slider controls
- OCR scoresheet upload — snap a photo of a paper scoresheet to auto-fill ratings
- Tracks which entries each judge has already voted on

**Results Dashboard**
- Overall leaderboard with average scores and vote counts
- Per-category rankings (heat, flavor, texture, presentation, overall)
- Event statistics — active judges, score distributions, category leaders
- CSV export for post-event analysis

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Chart.js |
| Backend | Node.js, Express, SQLite3, Multer (photo uploads) |
| OCR (optional) | Ollama with Qwen2.5-VL vision model |

## Setup

### Server

```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:3001` by default.

### Client

```bash
cd client
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### OCR (optional)

If you want scoresheet photo extraction, install [Ollama](https://ollama.ai) and pull the vision model:

```bash
ollama pull qwen2.5-vl:3b
```

The app works fine without it — OCR just won't be available.

## Project Structure

```
ChiliCookoff/
├── client/
│   └── src/
│       ├── components/
│       │   ├── Admin/          # Entry management, voting controls
│       │   ├── Voter/          # Rating form, chili grid, OCR upload
│       │   ├── Results/        # Leaderboard, stats, category rankings
│       │   └── *.jsx           # Shared components (Header, ErrorMessage, etc.)
│       ├── services/
│       │   └── api.js          # API client
│       └── App.jsx
└── server/
    ├── src/server.js           # Express app setup
    ├── routes/                 # chili, votes, results, ocr, config
    └── services/
        ├── database.js         # SQLite schema and queries
        └── ollama.js           # Vision model integration
```

## License

MIT
