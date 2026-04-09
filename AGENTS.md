# AGENTS.md — Developer Context for Critical Base · XP Sheet

PWA (`index.html`) for tracking experience points in tabletop RPGs.
Live at: https://tntimo.github.io/crit-xp-sheet/

---

## Architecture

Currently everything is in `index.html` (inline CSS, inline JS). Additional `.css` / `.js` files alongside `index.html` are fine — GitHub Pages serves them with no build step. Alpine.js is loaded from CDN.

Alpine.js v3 is loaded from CDN (`defer`). The single `app()` factory function is bound to `<body x-data="app()" x-init="init()">`. All XP lookup tables and `STRINGS` are plain module-level constants outside the Alpine component.

### Storage

Character data is stored in **IndexedDB** via [idb](https://github.com/jakearchibald/idb) v8 (loaded from CDN as an ES module). `app.js` is loaded with `<script type="module">` so the import works without a build step. The Alpine `app()` factory is exposed as `window.app` to remain accessible from the HTML `x-data` attribute.

The DB is named `cb_db` (version 1) with two object stores:

#### `characters` store — keyPath `id`

One row per character. No log embedded.

| Field | Type | Notes |
|---|---|---|
| `id` | number | `Date.now()` assigned on first save |
| `name` | string | |
| `cls` | string | optional |
| `level` | number | manually set by user |
| `startXp` | number | XP from before the session |

#### `entries` store — keyPath `id`, index `by_char` on `charId`

One row per XP log entry.

| Field | Type | Notes |
|---|---|---|
| `id` | number | `Date.now()` |
| `charId` | number | FK → `characters.id` |
| `cat` | string | see Categories |
| `xp` | number | |
| `descData` | object | structured description (re-localised on render) |
| `note` | string | optional free-text |
| `ts` | string | ISO timestamp |

Individual entries are inserted/updated/deleted directly — `saveState()` only writes character metadata, never touches the entries store.

#### localStorage keys (preferences — not in IDB)

| Key | Value | Notes |
|---|---|---|
| `cb_active_char` | character `id` (number as string) | Which character is active |
| `cb_lang` | `'en'` or `'it'` | Language preference |
| `cb_consent` | `'1'` | Whether the user has acknowledged the privacy notice |
| `cb_theme` | `'auto'` \| `'light'` \| `'dark'` | Manual theme override; defaults to `'auto'` (follows OS) |

**Legacy keys (auto-migrated on first load then deleted):**
- `cb_chars` / `cb_active_char` / `cb_state` in localStorage → migrated to IDB `characters` + `entries` stores

### Storage backward compatibility

**Always maintain backward compatibility.** New character fields must have sensible defaults so that existing saved data loads correctly. Use the spread-with-defaults pattern everywhere a character object is constructed:
```js
{ id: null, name:'', cls:'', level:1, startXp:0, log:[], ...saved }
```
Migrations belong in `init()`. The async `init()` migrates legacy localStorage keys (`cb_chars`, `cb_active_char`, `cb_state`) into IndexedDB on first load and removes them. Follow the existing patterns for any new field migrations.

---

## State Schema

### Character object (stored in `cb_chars` array)

```js
{
  id:      number,   // Date.now() assigned on first save
  name:    string,   // character name
  cls:     string,   // character class (optional, may be empty)
  level:   number,   // current level (manually set by user, not derived from XP)
  startXp: number,   // XP imported from before the session began
  log:     Entry[],  // ordered array of XP log entries
}
```

### Alpine component state

```js
characters:   Character[],  // full list, mirrors cb_chars
activeCharId: number|null,  // id of the currently active character
char:         Character,    // working copy of the active character
```

`saveState()` syncs `char` back into the `characters` array (via `splice`) and persists both `cb_chars` and `cb_active_char`.

### Log Entry

```js
{
  id:       number,   // Date.now()
  cat:      string,   // see Categories below
  xp:       number,   // XP value (always positive)
  descData: object,   // structured description — re-localised on render (see I18N)
  note:     string,   // optional free-text note from user
  ts:       string    // ISO timestamp
}
```

### Categories

`maneuver` | `save` | `crit-done` | `crit-recv` | `kill` | `spell`

---

## Level Tracking

Level is **not derived from XP**. There are no XP thresholds. The user sets their level manually in the Character tab. Only `level` is stored — it is used solely to compute XP values (kills, spells, crits).

---

## I18N

Two languages: `en` and `it`. **Always write literal Unicode characters** (e.g. `à`, `è`, `⭐`) in language files — never `\uXXXX` or `\xNN` escapes, which make the files hard to review and edit manually. All strings live in the `STRINGS` object.

Journal entries store a `descData` object (not a plain string) so they can be re-rendered in the current language at any time. `renderDesc(descData)` turns it into a localised string. Always add new description fields to `renderDesc` and both language string tables.

```js
// Example descData objects:
{ type: 'maneuver', diff: 'Hard', risk: 'Peril' }
{ type: 'crit-done', grade: 'C', opp: '5' }
{ type: 'kill', opp: '3', you: 4 }
```

Difficulty and risk values are stored in English internally and translated via `localDiff()` / `localRisk()` lookup maps.

---

## CSS Tokens

All colours are CSS custom properties, set in `:root` with a `@media (prefers-color-scheme: dark)` override. Never hardcode colours.

Key tokens: `--bg` `--bg2` `--bg3` `--border` `--text` `--text2` `--text3` `--accent` `--accent-bg` `--danger` `--warn` `--warn-bg`

Category colours: `--c-maneuver` `--c-save` `--c-critd` `--c-critr` `--c-kill` `--c-spell` `--c-levelup`

---

## Accessibility — WCAG 2.2 AA

This app targets WCAG 2.2 Level AA. Enforce the following at all times:

- **Font sizes** — base is `18px`. Minimums: `0.75rem` (13.5px) for pure metadata (timestamps); `0.8rem` (14.4px) for secondary labels; `0.875rem` (15.75px) for body/interactive text. Never go below `0.75rem` anywhere.
- **Contrast** — `--text` on `--bg` and `--border` on `--bg` must meet 4.5:1 for normal text, 3:1 for large text (≥ 18px regular or ≥ 14px bold). `--text2` on `--bg` must also meet 4.5:1. Check both light and dark themes when changing colours.
- **Touch targets** — interactive elements must be at least 44×44px effective tap area (WCAG 2.5.5). Use padding to meet this even if the visual element is smaller.
- **Focus** — do not suppress `:focus-visible` outlines. If the default browser outline is removed, replace it with a visible custom style.
- **No colour-only cues** — category differentiation must not rely on colour alone (labels/text provide the same information).

---

## Key Constraints

- **No build step, no npm** — additional `.css` / `.js` files are fine, but there is no bundler. All assets must be plain files loadable directly by the browser. **When adding a new file, also add it to the `cp` commands in `.github/workflows/deploy.yml`** — only explicitly listed files are published to GitHub Pages.
- **No localStorage in Claude artifacts** — when prototyping changes as Claude artifacts, use in-memory state.
- **Alpine.js v3** — use `x-data`, `x-model`, `x-text`, `x-show`, `x-for`, `:class`, `@click`. No jQuery or other libs.
- **Mobile-first** — max-width 480px, touch targets ≥ 44px, sticky header + nav.
- **No XP thresholds** — different rule sets use different progressions; the app deliberately ignores level-up logic.
- **Always run tests after changes** — run `npm test` after every code change and fix any failures before finishing.
