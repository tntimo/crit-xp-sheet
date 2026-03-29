import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadKeys(filename) {
  const src = readFileSync(join(root, 'lang', filename), 'utf8');
  return [...src.matchAll(/\b(\w+)(?=:['"])/g)].map(m => m[1]);
}

function usedKeys() {
  const src = ['index.html', 'app.js']
    .map(f => readFileSync(join(root, f), 'utf8'))
    .join('\n');
  return [...new Set([...src.matchAll(/\bT\('(\w+)'\)/g)].map(m => m[1]))];
}

test('all T() calls have a translation in en and it', () => {
  const en = new Set(loadKeys('en.js'));
  const it = new Set(loadKeys('it.js'));
  const used = usedKeys();

  const missingFromEn = used.filter(k => !en.has(k));
  const missingFromIt = used.filter(k => !it.has(k));

  expect(missingFromEn, 'T() calls with no entry in en.js').toEqual([]);
  expect(missingFromIt, 'T() calls with no entry in it.js').toEqual([]);
});

test('en and it have identical keys', () => {
  const en = new Set(loadKeys('en.js'));
  const it = new Set(loadKeys('it.js'));

  const missingInIt = [...en].filter(k => !it.has(k));
  const missingInEn = [...it].filter(k => !en.has(k));

  expect(missingInIt, 'keys in en.js missing from it.js').toEqual([]);
  expect(missingInEn, 'keys in it.js missing from en.js').toEqual([]);
});

test('no unicode escapes in lang files', () => {
  for (const file of ['en.js', 'it.js']) {
    const src = readFileSync(join(root, 'lang', file), 'utf8');
    const escapes = [...src.matchAll(/\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/g)].map(m => m[0]);
    expect(escapes, `${file} contains unicode escapes`).toEqual([]);
  }
});
