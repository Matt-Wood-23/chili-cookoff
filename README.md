# Chili Cook-Off Rating System

A full-stack web app for running chili cook-off competitions. Manages entries, collects judge ratings across multiple categories, and generates live leaderboards with stats and CSV export.

Built this mostly to replace paper scoresheets, but still allow them, at an actual chili cook-off event. Judges rate each entry on heat, flavor, texture, presentation, and overall impression using a simple mobile-friendly interface.

Paper still works two ways: an organizer can key a scoresheet in from the admin panel (always available), or a judge can photograph one and have the scores extracted by a local vision model (Ollama + Qwen2.5-VL, optional). The typed path is the one to rely on — it needs no model and no network beyond the submit.

## Features

**Admin Panel**
- Add chili entries with contestant name, description, and photo
- Edit/delete entries with live vote counts
- Enter paper ballots on a judge's behalf
- Toggle voting open/closed
- Configure event name, date, and location

**Voting Interface**
- Browse entries in a card grid with photos
- Rate each chili on 5 categories (1-10 scale) with slider controls
- Scan a paper scoresheet from inside the rating form to pre-fill scores (when OCR is available)
- Remembers the judge's name and which entries they have rated
- One rating per judge per chili; re-rating from the same device corrects the earlier score

**Results Dashboard**
- Overall leaderboard with average scores and vote counts
- Per-category rankings (heat, flavor, texture, presentation, overall)
- Event statistics — active judges, score distributions, category leaders
- CSV export for post-event analysis

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, SQLite3, Multer (photo uploads) |
| OCR (optional) | Ollama with Qwen2.5-VL vision model |

## Setup

### Server

```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:3001` by default. See `server/.env.example` for
configuration.

### Client

```bash
cd client
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Running the event on phones

The client talks to whatever hostname it was served from, so judges just need
your laptop's LAN address:

```bash
cd client && npm run dev -- --host    # serves on 0.0.0.0
```

Then send judges `http://<your-laptop-ip>:5173`. Nothing else to configure —
the API host is derived from that address. Override with `VITE_API_URL` if your
API lives elsewhere (see `client/.env.example`).

### Protecting the admin panel

Admin endpoints are open by default, which is fine on a private laptop. To
require a shared password, start the server with one:

```bash
ADMIN_TOKEN=your-secret npm run dev
```

Then enter that value once under **Admin → Voting Controls → Admin Token**. This
is a single shared password, not per-user accounts.

### OCR (optional)

If you want scoresheet photo extraction, install [Ollama](https://ollama.ai) and pull the vision model:

```bash
ollama pull qwen2.5-vl:3b
```

The app works fine without it. The server reports OCR availability on
`/api/health`, and the client hides the scan button when Ollama is unreachable.
Handwritten digits are the hardest thing for a small vision model to read, so
treat scanned scores as a draft and check them before submitting — the admin
paper-ballot form is the dependable path.

## Vote integrity

Each judge gets one rating per chili, enforced on a normalized name
(`Matt W`, `matt  w` and ` MATT W ` are the same judge):

- Re-rating from the same device replaces the earlier score, so a judge can fix
  a mistake without inflating the vote count.
- The same name from a different device is refused with a message asking for a
  last initial, rather than overwriting a stranger's scores.
- Browsers send a random per-device id. It is not identity or a security
  control — shared phones are normal at these events, so it never blocks a vote.
  It exists to tell corrections apart from collisions, and `/api/votes/stats`
  reports devices rating under several names so you can eyeball them.

Deliberately not used: IP addresses. Everyone on the venue wifi shares one
public IP (so binding to it would lock out the room after the first vote), while
cellular IPs rotate as people move around.

## Project Structure

```
ChiliCookoff/
├── client/
│   └── src/
│       ├── components/
│       │   ├── Admin/          # Entry management, paper ballots, voting controls
│       │   ├── Voter/          # Rating form, chili grid, scoresheet scan
│       │   ├── Results/        # Leaderboard, stats, category rankings
│       │   └── *.jsx           # Shared components (Header, ErrorMessage, etc.)
│       ├── services/
│       │   └── api.js          # API client, device id, admin token
│       └── App.jsx
└── server/
    ├── src/server.js           # Express app setup
    ├── config/paths.js         # Upload and database locations
    ├── middleware/adminAuth.js # Optional shared-secret gate
    ├── routes/                 # chili, votes, results, ocr, config
    └── services/
        ├── database.js         # SQLite schema, migrations, queries
        └── ollama.js           # Vision model integration
```

The server migrates its own database on boot: it adds the columns and unique
index that one-vote-per-judge needs, collapses pre-existing duplicate votes to
the earliest one, removes votes orphaned by deleted entries, and rebuilds the
votes table if it predates the foreign key. Safe to run against a database from
a previous event.

## License

MIT
