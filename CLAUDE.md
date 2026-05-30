# Memory Game (Concentration) — Google Trends Edition

## Project Purpose

A browser-based memory match (concentration) card game where the pictures on the cards are sourced from **Google Trends and Wikipedia trending topics**. Players flip cards to find matching pairs; each pair reveals a trending topic and its associated images. Trends are fetched fresh daily, so the game always reflects what's happening in the world right now.

The game features:
- Progressive difficulty across levels (more cards, fewer allowed mistakes)
- A lives system (3 lives) with a scoring mechanic based on matched trends and view counts
- **Normal mode** (any matching images) and **Challenge mode** (each pair shows different images of the same trend)
- Light/dark theme toggle
- Date picker to play with trends from previous days
- Fully responsive layout for desktop and mobile

---

## Repository Layout

```
memorygame/          ← frontend (this repo)
  index.html
  js/
  css/
  images/
  words/offline.json ← offline fallback trend data
  resources/         ← Capacitor icon source (icon-only.png)
  android/           ← Capacitor Android project (committed)
  ios/               ← Capacitor iOS project (committed)
  capacitor.config.json

memorygame-backend/  ← separate repo, data pipeline
  build.js
  google-trend-query.js
  wikipedia-trend-query.js
  image-indexer.js
  combine.js
  data/              ← generated JSON indexes
```

---

## Frontend Architecture

All JS files use camelCase naming. Files exporting a single class are named after the class (e.g. `game.js` exports `Game`).

### Entry Point

**[js/main.js](js/main.js)** — Bootstraps the app. Fetches today's trend data from the backend (with a fallback chain: today → yesterday → offline.json), restores any saved game from localStorage, and wires up the `Menu` and `Game` instances.

### Core Game Modules

| File | Responsibility |
|---|---|
| [js/game.js](js/game.js) | Central game controller. Manages the game loop, level progression, lives, score, cell activation/matching, board teardown/setup with transitions, face-expression feedback, and card-click handling (`onCellClick`). |
| [js/trendSelector.js](js/trendSelector.js) | Manages pools of available trends (unused, deferred, used, unusable). Validates image URLs before use (HEAD + Image.onload), caches results in localStorage. Computes scores from trend view counts. |
| [js/board.js](js/board.js) | Defines `Board` (cell count + allowed mistakes) and `BoardCreator` (generates progressively harder boards by level, adapting to phone vs desktop). |
| [js/cell.js](js/cell.js) | Individual card logic. Manages cell states (DEFAULT, REVEALED, SOLVED, INACTIVE), renders trend images and labels, drives the 3D card-flip animation, and handles image-slide for challenge mode. |
| [js/cellSolvedLoop.js](js/cellSolvedLoop.js) | `CellLoopScheduler` drives the post-match animation sequence on solved pairs: image slide, text type-in for the trend name, background color reveal, and optional bespoke color animation for high-view-count trends. `CellSolvedLoop` manages the per-pair animation state. |

### UI Modules

| File | Responsibility |
|---|---|
| [js/menu.js](js/menu.js) | Menu screen with date picker (navigate past trend days), Normal/Challenge mode toggle, light/dark theme toggle, and Continue/Restart buttons. |
| [js/graphics.js](js/graphics.js) | `Elements` (DOM node references), `Graphics` (static visual helpers: type-text, splash, win screen, prompts), `FaceChanger` (face emotion system), `PercentScorer` (score bar animator), `ColorSequencer` (cycles palette colors). |
| [js/gridLayout.js](js/gridLayout.js) | `GridLayout` — calculates optimal grid dimensions for the current cell count and viewport. Manages CSS perspective and scale for 3D card effects. Reacts to window resize. |
| [js/pixelTransition.js](js/pixelTransition.js) | `PixelTransition` — mosaic fill-in/fill-out animation used on level loss. |
| [js/soundEffects.js](js/soundEffects.js) | `SoundEffects` class + shared `soundEffects` singleton. Web Audio API sound generation and pre-decoded MP3 playback. |

### Configuration

**[js/config.js](js/config.js)** — Pure data module (no imports, no side effects). Single source of truth for:
- Backend base URL and endpoint names (`today`, `fallback`, `index`)
- `isDev` flag (true when not on the production hostname and not running as a native Capacitor app)
- Timing constants (animation durations, delays)
- RGBA color palettes for light and dark themes
- Game messages (victory, failure, near-miss, etc.)
- Animation keyframe definitions (shake, slide, splash)
- Difficulty thresholds, max lives, and intro message word lists

### Utilities

**[js/utils.js](js/utils.js)** — Shared helpers:
- `ImageValidator` class + `imageValidator` singleton — validates image URLs (HEAD request + `Image.onload` fallback), caches results in localStorage
- `fitFontSize(element, text, maxHeight)` — binary-searches for the largest font size that fits within `maxHeight` (O(log n) forced reflows)
- `shuffle`, `randomItem`, `waitForFlag`, `isPhone`, `hideBackground`, `percentScoreFloat`, `percentScoreString`

### CSS

| File | Covers |
|---|---|
| [css/style.css](css/style.css) | CSS custom properties for theming, global layout, typography, fade animations |
| [css/cell.css](css/cell.css) | 3D card-flip mechanics (`transform-style: preserve-3d`), front/back faces, image container, hover shadows |
| [css/game.css](css/game.css) | HUD (level counter, score display, face container), grid layout |
| [css/menu.css](css/menu.css) | Menu card-flip exit animation, Google-color scheme, toggle/button states, date navigation |

---

## Native Builds (Capacitor)

The game is wrapped with [Capacitor](https://capacitorjs.com/) to produce native Android and iOS apps from the same web codebase.

- **`capacitor.config.json`** — app ID (`net.clayrobot.memorygame`), app name, and web dir (`dist`)
- **`android/`** — Android Studio project; committed to the repo
- **`ios/`** — Xcode project; committed to the repo
- **`resources/icon-only.png`** — 1024×1024 source icon used by `@capacitor/assets` to generate all platform-specific icon sizes

### Key npm scripts

| Script | What it does |
|---|---|
| `npm run build` | Vite bundle only (web deploy) |
| `npm run sync` | Vite build + `cap sync` (copies bundle into native projects) |
| `npm run open:android` | Opens Android Studio |
| `npm run open:ios` | Opens Xcode |
| `npm run generate:icons` | Regenerates all Android/iOS icons from `resources/icon-only.png` |

### Gitignored native artifacts

`android/local.properties` (local SDK path), Gradle/Xcode build outputs, and the `android/app/src/main/assets/public/` and `ios/App/App/public/` directories (copies of `dist/`, regenerated by `cap sync`).

---

## Backend Architecture (`memorygame-backend/`)

The backend is a **Node.js data pipeline** that runs on a cron schedule and produces static JSON files served to the frontend.

### Pipeline

```
Cron (noon daily)
  → google-trend-query.js    scrape Google Trends (Puppeteer + stealth)
  → wikipedia-trend-query.js fetch Wikipedia trending articles (Wikimedia API)
  → image-indexer.js         fetch 3 images per trend (Yandex / Wikipedia thumbnails)
  → combine.js               merge Google + Wikipedia indexes
  → build.js                 write timestamped JSON + update index.json manifest
```

### Key Backend Files

| File | Responsibility |
|---|---|
| `build.js` | Orchestrates the pipeline; checks file freshness (120-min max age); writes `data/index.json` manifest mapping dates to filenames. |
| `google-trend-query.js` | Puppeteer scrapes Google Trends across 19 categories. Applies ~53 regex filters (sports, finance, short codes, profanity). Marks trends with >100k views as "special". |
| `wikipedia-trend-query.js` | Hits the Wikimedia trending API; filters via profanity detection. |
| `image-indexer.js` | Coordinates image fetching per trend, validates URLs, produces the final index. |
| `yandexImages.js` | Scrapes Yandex Image Search for 3 images per trend; filters bad/blocked domains. |
| `wikipediaImages.js` | Extracts Wikipedia article thumbnail URLs. |
| `combine.js` | Merges Google and Wikipedia indexes (Google takes priority; Wikipedia fills in unique entries). |
| `puppeteerSession.js` | Manages Puppeteer browser instances with rotating proxy IPs to avoid bot detection. |

### Trend Data Shape (served to frontend)

```json
{
  "fetchedDate": "2026/05/27",
  "count": 168,
  "trends": {
    "Obsession (2025 film)": {
      "url": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "https://example.com/image3.jpg"
      ],
      "category": null,
      "rank": 1,
      "views": "230K",
      "special": true
    },
    "ken paxton": {
      "url": ["..."],
      "category": "Law and Government",
      "rank": 2,
      "views": "450K",
      "special": true
    }
  }
}
```

**Field notes:**
- `url` — array of up to 3 image URLs; validated at runtime by `ImageValidator` before use
- `views` — formatted string (e.g. `"230K"`, `"1.2M"`); displayed on solved cards
- `special` — true when views > 100k; triggers the bespoke cycling-color animation on solved cells
- `category` — Google Trends category string, or `null` for Wikipedia trends and uncategorised entries
- `rank` — position in the day's trending list (1 = most searched)
- `nickname` (optional) — display name override; falls back to the trend key lowercased if absent

---

## Data Flow: Frontend ↔ Backend

1. `main.js` fetches `/index` → receives `{ "2026/05/27": "image-index-2026-05-27T12-00-00.json", ... }`
2. Menu lets the user pick a date; `main.js` fetches the corresponding JSON file
3. `TrendSelector` consumes the trend list; validates image URLs on demand; feeds valid trends to `Game`
4. If the backend is unreachable, the game falls back to `words/offline.json`

---

## State Persistence (localStorage)

Per-date entries are keyed by `fetchedDate` (e.g. `"2026/05/27"`) and contain separate `normal` and `challenge` sub-objects.

| Key inside date entry | Contents |
|---|---|
| `trendKeys` | Used/deferred/unusable trend key pools (sets serialised as arrays) |
| `score` | `{ num, denominator, won }` — cumulative score object |
| `session` | `{ board, level, lives }` — current level state |

| Top-level localStorage key | Contents |
|---|---|
| `images` | Per-URL image validation cache (`{ url: boolean }`) |
| `pref_theme` | `"dark"` or absent |
| `pref_challenge` | `"true"` or absent |
| `pref_sound` | `"true"` (muted) or absent |
| `pref_date` | `{ date, latestAtPick }` — last selected date, cleared when a newer date arrives |
