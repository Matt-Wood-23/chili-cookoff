# Chili Cook-Off Rating System

A full-stack web app for running chili cook-off competitions. Manages entries, collects judge ratings across multiple categories, and generates live leaderboards with stats and CSV export.

Built this mostly to replace paper scoresheets, but still allow them, at an actual chili cook-off event. Judges rate each entry on heat, flavor, texture, presentation, and overall impression using a simple mobile-friendly interface.

Paper still works two ways: an organizer can key a scoresheet in from the admin panel (always available), or a judge can photograph one and have the scores extracted by a local vision model (Ollama + Qwen2.5-VL, optional). The typed path is the one to rely on — it needs no model and no network beyond the submit.

## Features

**Admin Panel**
- Add chili entries with contestant name, description, and photo
- Edit/delete entries with live vote counts
- Enter paper ballots on a judge's behalf
- Generate, print and revoke judge codes
- Toggle voting open/closed
- Configure event name, date, and location

**Voting Interface**
- Browse entries in a card grid with photos
- Rate each chili on 5 categories (1-10 scale) with slider controls
- Scan a paper scoresheet from inside the rating form to pre-fill scores (when OCR is available)
- Remembers the judge's name and which entries they have rated
- One rating per judge per chili; re-rating from the same device corrects the earlier score

**Results Dashboard**
- Overall leaderboard with rating coverage, totals and averages
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

Admin endpoints are open by default, which is fine on a private laptop. **Set a
token for any event where guests are on the same network** — otherwise anyone
who opens the app can close voting or clear every vote:

```bash
ADMIN_TOKEN=your-secret npm run dev
```

With a token set, the Admin link disappears from the nav for everyone, and the
per-judge vote list (`GET /api/votes`) requires it. Aggregate results and the
leaderboard stay public. Navigate to `/admin` directly, enter the token once
under **Voting Controls → Admin Token**, and the link comes back on that device.

This is a single shared password, not per-user accounts.

## How the winner is decided

Only the **overall** score places entries. Heat, flavor, texture and presentation
are collected and shown, and drive the per-category rankings, but they do not
affect who wins — heat especially, since a mild chili is not a worse chili.

**Entries are ranked by total overall points**, always. Ranking an incomplete
board by average lets one generous rating outrank a chili twenty people scored
well, and a wrong winner is worse than a chili placing lower because fewer people
tried it. Under full coverage the two agree anyway, and the total is the nicer
number to announce.

The consequence to be aware of: until coverage is complete, an entry fewer people
have reached scores lower than it otherwise would. That is the point at which you
chase ratings rather than call a winner.

**Coverage is tracked so you can do that chasing.** The judge count is however
many people have cast at least one vote, so it grows as latecomers arrive. Each
entry shows `3 of 12 — needs 9 more`, the board lists everything outstanding, and
closing voting with gaps warns you first, naming each chili and its shortfall,
before letting you proceed.

**Genuine ties share a place** — two entries on the same score both show `T-1`,
and the next entry is `#3`. Break it with a taste-off rather than letting a sort
order decide.

The average is still shown for every entry. It is interesting — it tells you
whether a chili was loved by a few or liked by many — but it does not decide the
winner.

## Judge codes

Optional, off by default. When on, a judge needs a code from a printed slip
before they can rate anything — which closes the one hole name-based voting
leaves open: someone deliberately voting twice under two different names.

**Running it:** Admin → Judge Codes → generate a batch → **Print Slips** → cut
them up and put them in a bowl by the food. Then flip **Require Codes to Vote**.
Generate more than you expect; latecomers and lost slips are the usual reason to
reprint. Printing only ever gives you codes nobody has used yet.

Codes are four characters from an alphabet with no `I`, `L`, `O`, `0` or `1`,
because they get read off paper and typed on a phone.

**A code is a ballot, not a person.** Nothing identifies who holds it, and no
names are stored unless a judge optionally types one for the results. Details:

- One code rates every entry — it is an identity, not a single-use ticket.
- Re-rating under the same code corrects the earlier score instead of adding a
  second vote.
- Two judges who both type "Matt" are no longer a conflict; their codes tell
  them apart, so the "add a last initial" prompt disappears.
- A code works from any phone. First use is recorded, and reuse elsewhere is
  visible to the admin but never blocked, because people hand each other phones.
- Revoking a code stops further use; votes already cast under it stay counted.

Turning codes off returns to name-based voting with everything intact.

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

Each judge gets one rating per chili. Without codes this is enforced on a
normalized name (`Matt W`, `matt  w` and ` MATT W ` are the same judge); with
codes it is enforced on the code:

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
    ├── routes/                 # chili, votes, results, ocr, config, judgeCodes
    └── services/
        ├── database.js         # SQLite schema, migrations, queries
        └── ollama.js           # Vision model integration
```

The server migrates its own database on boot: it adds the columns and unique
index that one-vote-per-judge needs, backfills the `voter_key` identity every
vote is unique on, collapses pre-existing duplicate votes to the earliest one,
removes votes orphaned by deleted entries, and rebuilds the votes table if it
predates the foreign key. Safe to run against a database from a previous event —
but back it up first, since the duplicate collapse deletes rows.

## License

MIT
