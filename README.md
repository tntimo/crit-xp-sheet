# RPG Experience Points Tracker

A lightweight, mobile-friendly experience point tracker for tabletop RPGs — designed for systems where XP is earned through maneuvers, saving throws, criticals, kills, and spells (e.g. HARP).

**→ [Open the app](https://tntimo.github.io/crit-xp-sheet/)**

No installation needed. Open the link above on any device, or clone/download the repository and open `index.html` locally (all files must be present together).

On mobile you can use **Add to Home Screen** from your browser menu to get an app-like experience.

## Development

```bash
npm install
npx playwright install --with-deps chromium
npm test
```

Tests are end-to-end UI tests (Playwright/Chromium). They spin up a local static server, exercise real user flows in a headless browser, and shut down automatically.
