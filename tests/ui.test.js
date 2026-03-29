import { test, expect } from '@playwright/test';

// Seed localStorage before the page loads so Alpine sees the data on init().
async function setup(page, { char, lang } = {}) {
  await page.addInitScript(({ char, lang }) => {
    localStorage.setItem('cb_consent', '1');
    if (lang) localStorage.setItem('cb_lang', lang);
    if (char) {
      localStorage.setItem('cb_chars', JSON.stringify([char]));
      localStorage.setItem('cb_active_char', String(char.id));
    }
  }, { char, lang });
  await page.goto('/');
  await expect(page.locator('#app')).toBeVisible();
}

// Selectors for form fields (labels have no for/id, so we use placeholder/type).
const nameInput   = page => page.getByPlaceholder('Aragorn...');
const classInput  = page => page.getByPlaceholder('Ranger...');
// XP preview inside the open modal (all 6 panels are in DOM; scope to the backdrop).
const xpPreview   = page => page.locator('.modal-backdrop .xp-preview-value').first();
// Note input in modal (only text input inside modal).
const noteInput   = page => page.locator('.modal-backdrop input[type="text"]');
// Score number input in the Save modal.
const scoreInput  = page => page.locator('.modal-backdrop input[type="number"][min="1"]');

const BASE_CHAR = {
  id: 1000,
  name: 'Aragorn',
  cls: 'Ranger',
  level: 5,
  startXp: 0,
  log: [],
};


// ── Consent gate ──────────────────────────────────────────────────────────────

test('consent overlay is shown on first visit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Got it' })).toBeVisible();
});

test('accepting consent dismisses the overlay and persists across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('button', { name: 'Got it' })).not.toBeVisible();

  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Got it' })).not.toBeVisible();
});


// ── Character creation ────────────────────────────────────────────────────────

test('creating a character updates the header strip and switches to Log tab', async ({ page }) => {
  await setup(page);

  await nameInput(page).fill('Gimli');
  await classInput(page).fill('Warrior');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.char-name')).toContainText('Gimli');
  await expect(page.locator('.char-name')).toContainText('Warrior');
  await expect(page.locator('.action-grid')).toBeVisible();
});

test('character info persists after page reload', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await expect(page.locator('.char-name')).toContainText('Aragorn');
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('.char-name')).toContainText('Aragorn');
});


// ── Log entries ───────────────────────────────────────────────────────────────

test('logging a Saving Throw adds an entry and updates total XP', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await page.getByRole('button', { name: 'Saving Throw' }).click();
  await page.getByRole('button', { name: '80', exact: true }).click();
  await expect(xpPreview(page)).toHaveText('80');
  await page.getByRole('button', { name: 'Record XP' }).click();

  await expect(page.locator('.journal-entry')).toBeVisible();
  await expect(page.locator('.entry-xp')).toHaveText('80');
  await expect(page.locator('.char-xp')).toContainText('80');
});

test('logging a Crit Received adds the correct fixed XP', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await page.getByRole('button', { name: 'Crit Received' }).click();
  // Default grade A → 100 XP
  await expect(xpPreview(page)).toHaveText('100');
  await page.getByRole('button', { name: 'Record XP' }).click();

  await expect(page.locator('.entry-xp')).toHaveText('100');
  await expect(page.locator('.char-xp')).toContainText('100');
});

test('adding a note attaches it to the journal entry', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await page.getByRole('button', { name: 'Kill' }).click();
  await noteInput(page).fill('Final boss!');
  await page.getByRole('button', { name: 'Record XP' }).click();

  await expect(page.locator('.entry-note')).toHaveText('Final boss!');
});

test('editing an entry changes its XP and updates the total', async ({ page }) => {
  const char = {
    ...BASE_CHAR,
    log: [{
      id: 2000, cat: 'save', xp: 80,
      descData: { type: 'save', score: 80 },
      note: '', ts: new Date().toISOString(),
    }],
  };
  await setup(page, { char });

  await expect(page.locator('.char-xp')).toContainText('80');

  await page.locator('.entry-edit').click();
  await scoreInput(page).fill('150');
  await expect(xpPreview(page)).toHaveText('150');
  await page.getByRole('button', { name: 'Record XP' }).click();

  await expect(page.locator('.entry-xp')).toHaveText('150');
  await expect(page.locator('.char-xp')).toContainText('150');
});

test('deleting an entry removes it from the log and updates total XP', async ({ page }) => {
  const char = {
    ...BASE_CHAR,
    log: [{
      id: 3000, cat: 'save', xp: 120,
      descData: { type: 'save', score: 120 },
      note: '', ts: new Date().toISOString(),
    }],
  };
  await setup(page, { char });

  await expect(page.locator('.char-xp')).toContainText('120');

  page.once('dialog', d => d.accept());
  await page.locator('.entry-delete').click();

  await expect(page.locator('.journal-entry')).not.toBeVisible();
  await expect(page.locator('.char-xp')).toContainText('0');
});


// ── Multi-character ───────────────────────────────────────────────────────────

test('creating a second character and switching back shows correct XP per character', async ({ page }) => {
  const char1 = {
    ...BASE_CHAR,
    log: [{
      id: 4000, cat: 'save', xp: 200,
      descData: { type: 'save', score: 200 },
      note: '', ts: new Date().toISOString(),
    }],
  };
  await setup(page, { char: char1 });
  await expect(page.locator('.char-xp')).toContainText('200');

  // Go to Character tab and create a second character
  await page.locator('nav').getByRole('button', { name: 'Character' }).click();
  await page.getByRole('button', { name: '+ New Character' }).click();
  await nameInput(page).fill('Legolas');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.char-name')).toContainText('Legolas');
  await expect(page.locator('.char-xp')).toContainText('0');

  // Switch back to Aragorn
  await page.locator('nav').getByRole('button', { name: 'Character' }).click();
  await page.locator('.char-list-name', { hasText: 'Aragorn' }).click();

  await expect(page.locator('.char-name')).toContainText('Aragorn');
  await expect(page.locator('.char-xp')).toContainText('200');
});

test('deleting a character removes it from the list', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await page.locator('nav').getByRole('button', { name: 'Character' }).click();
  page.once('dialog', d => d.accept());
  await page.locator('.char-list-delete').click();

  await expect(page.locator('.char-list-item')).not.toBeVisible();
});


// ── Language ──────────────────────────────────────────────────────────────────

test('toggling language switches UI to Italian', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await page.locator('.lang-btn', { hasText: 'EN' }).click();

  await expect(page.getByRole('button', { name: 'Registra' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Manovra' })).toBeVisible();
});

test('language preference persists after reload', async ({ page }) => {
  await setup(page, { char: BASE_CHAR, lang: 'it' });
  await expect(page.getByRole('button', { name: 'Registra' })).toBeVisible();
});


// ── XP preview in modal ───────────────────────────────────────────────────────

test('XP preview in maneuver modal updates when difficulty or risk changes', async ({ page }) => {
  await setup(page, { char: BASE_CHAR });

  await page.getByRole('button', { name: 'Maneuver' }).click();

  // Default: Medium / Some → 50
  await expect(xpPreview(page)).toHaveText('50');

  // Risk Extreme → 50 * 4 = 200
  await page.locator('.modal-backdrop').getByRole('button', { name: 'Extreme', exact: true }).click();
  await expect(xpPreview(page)).toHaveText('200');

  // Difficulty Absurd → 500 * 4 = 2000
  await page.locator('.modal-backdrop').getByRole('button', { name: 'Absurd' }).click();
  await expect(xpPreview(page)).toHaveText('2000');
});
