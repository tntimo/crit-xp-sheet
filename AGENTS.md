# CLAUDE.md — Developer Context for Critical Base · XP Sheet

Single-file PWA (`index.html`) for tracking experience points in tabletop RPGs.
Live at: https://tntimo.github.io/crit-xp-sheet/

---

## Architecture

Everything is in one HTML file: inline CSS, inline JS, no dependencies, no build step.
Data persists in `localStorage` under key `cb_state`.
Language preference persists under key `cb_lang`.

---

## State Schema

```js
{
  name:    string,   // character name
  level:   number,   // current level (manually set by user, not derived from XP)
  startXp: number,   // XP imported from before the session began
  log:     Entry[],  // ordered array of XP log entries
  notes:   string    // free-text notes field
}
```

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

Two languages: `en` and `it`. All strings live in the `STRINGS` object.

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

- **Character** — name, starting level (number input), starting XP, notes textarea, save/reset buttons. Default tab on first load; goes to Overview if character already saved.
- **Overview** — total XP card, 6 category stat cards (maneuver/save/crit-done/crit-recv/kill/spell), Log XP shortcut button.
- **Log XP** — 6 action buttons → bottom-sheet modal with dropdowns, live XP preview, optional note.
- **Journal** — filter chips (all + 6 categories, flex-wrap), entry list newest-first, each entry deletable.

---

## CSS Tokens

All colours are CSS custom properties, set in `:root` with a `@media (prefers-color-scheme: dark)` override. Never hardcode colours.

Key tokens: `--bg` `--bg2` `--bg3` `--border` `--text` `--text2` `--text3` `--accent` `--accent-bg` `--danger` `--warn` `--warn-bg`

Category colours: `--c-maneuver` `--c-save` `--c-critd` `--c-critr` `--c-kill` `--c-spell` `--c-levelup`

---

## Key Constraints

- **Single HTML file** — no external assets, no build step, no npm.
- **No localStorage in artifacts** — when prototyping changes as Claude artifacts, use in-memory state.
- **No framework** — vanilla JS only.
- **Mobile-first** — max-width 480px, touch targets ≥ 44px, sticky header + nav.
- **No XP thresholds** — different rule sets use different progressions; the app deliberately ignores level-up logic.
