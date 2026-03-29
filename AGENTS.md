# AGENTS.md — Developer Context for Critical Base · XP Sheet

PWA (`index.html`) for tracking experience points in tabletop RPGs.
Live at: https://tntimo.github.io/crit-xp-sheet/

---

## Architecture

Currently everything is in `index.html` (inline CSS, inline JS). Additional `.css` / `.js` files alongside `index.html` are fine — GitHub Pages serves them with no build step. Alpine.js is loaded from CDN.

Alpine.js v3 is loaded from CDN (`defer`). The single `app()` factory function is bound to `<body x-data="app()" x-init="init()">`. All XP lookup tables and `STRINGS` are plain module-level constants outside the Alpine component.

### localStorage keys

| Key | Value | Notes |
|---|---|---|
| `cb_chars` | JSON array of character objects | Current multi-character format |
| `cb_active_char` | character `id` (number as string) | Which character is active |
| `cb_lang` | `'en'` or `'it'` | Language preference |
| `cb_consent` | `'1'` | Whether the user has acknowledged the privacy notice |
| `cb_theme` | `'auto'` \| `'light'` \| `'dark'` | Manual theme override; defaults to `'auto'` (follows OS) |

**Legacy key:** `cb_state` (single-character JSON object) — migrated to `cb_chars` on first load, then deleted.

### Storage backward compatibility

**Always maintain backward compatibility.** New character fields must have sensible defaults so that existing saved data loads correctly. Use the spread-with-defaults pattern everywhere a character object is constructed:
```js
{ id: null, name:'', cls:'', level:1, startXp:0, log:[], ...saved }
```
Migrations belong in `init()`, following the existing patterns (`startCp → startXp`, `cb_state → cb_chars`).

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

No `levelup` category — level is set manually in Character tab, not tracked in the log.

---

## XP Tables

### Maneuver
`XP = MANEUVER_XP[difficulty] × MANEUVER_RISK[risk]`

| Difficulty | XP | Risk | Multiplier |
|---|---|---|---|
| Routine | 0 | None | ×0.5 |
| Easy | 5 | Some | ×1.0 |
| Light | 10 | Peril | ×2.0 |
| Medium | 50 | Grave | ×3.0 |
| Hard | 100 | Extreme | ×4.0 |
| Very Hard | 150 | | |
| Extremely Hard | 200 | | |
| Sheer Folly | 300 | | |
| Absurd | 500 | | |

Defaults: Medium / Some.

### Saving Throw
User enters the difficulty score directly; that number = XP gained.
Default: 100.

### Critical Done
`getCritDoneXP(oppLevel, grade)` — lookup in `CRIT_DONE_BASE[oppLevel][grade]` for levels 0–10, then extrapolates above 10 using `CRIT_DONE_STEP[grade]` per level.
Grades: A–F.

| Opp Level | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| 0 | 3 | 5 | 8 | 10 | 13 | 16 |
| 1 | 5 | 10 | 15 | 20 | 25 | 30 |
| 2 | 10 | 20 | 30 | 40 | 50 | 60 |
| 3 | 15 | 30 | 45 | 60 | 75 | 90 |
| 4 | 20 | 40 | 60 | 80 | 100 | 120 |
| 5 | 25 | 50 | 75 | 100 | 125 | 150 |
| 6 | 30 | 60 | 90 | 120 | 150 | 180 |
| 7 | 35 | 70 | 105 | 140 | 175 | 210 |
| 8 | 40 | 80 | 120 | 160 | 200 | 240 |
| 9 | 45 | 90 | 135 | 180 | 225 | 270 |
| 10 | 50 | 100 | 150 | 200 | 250 | 300 |

Step per level above 10: A+5, B+10, C+15, D+20, E+25, F+30.

### Critical Received
Fixed table — foe level is always treated as 20 regardless of actual level.

| Grade | XP |
|---|---|
| A | 100 |
| B | 200 |
| C | 300 |
| D | 400 |
| E | 500 |
| F | 600 |

### Kill
`getKillXP(oppLevel, charLevel)` — lookup in `KILL_TABLE[oppLevel][charLevel-1]` for opp 0–9 and char 1–10.
For opp level 10+ or char level 10+: `max(200, 200 + 50 × (oppLevel − charLevel))`.

### Spell
`getSpellXP(spellLevel, casterLevel)` — lookup in `SPELL_TABLE[spellLevel-1][casterLevel-1]` for levels 1–10.
For spell ≥ 11 or caster ≥ 11: `min(200, max(0, 100 − 10 × (casterLevel − spellLevel)))`.

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

## UI Structure

Four tabs (left to right in nav): **Character** · **Overview** · **Log XP** · **Journal**

- **Character** — two rows of paired fields (name+class, level+starting XP), save button. Below: character manager with "+ New Character" button and a list of all saved characters (click to switch, ✕ to delete with confirmation). Default tab on first load; goes to Overview if a character is already saved.
- **Overview** — total XP card, 6 category stat cards (maneuver/save/crit-done/crit-recv/kill/spell), Log XP shortcut button.
- **Log XP** — 6 action buttons → bottom-sheet modal with dropdowns, live XP preview, optional note.
- **Journal** — filter chips (all + 6 categories, flex-wrap), entry list newest-first, each entry deletable.

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

- **No build step, no npm** — additional `.css` / `.js` files are fine, but there is no bundler. All assets must be plain files loadable directly by the browser.
- **No localStorage in Claude artifacts** — when prototyping changes as Claude artifacts, use in-memory state.
- **Alpine.js v3** — use `x-data`, `x-model`, `x-text`, `x-show`, `x-for`, `:class`, `@click`. No jQuery or other libs.
- **Mobile-first** — max-width 480px, touch targets ≥ 44px, sticky header + nav.
- **No XP thresholds** — different rule sets use different progressions; the app deliberately ignores level-up logic.
