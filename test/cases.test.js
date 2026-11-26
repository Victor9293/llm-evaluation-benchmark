import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASES, CATEGORIES, LANGUAGES, DIFFICULTIES, getCase, getCategory, casesInCategory } from '../js/cases.js';
import { CHECK_TYPES, runChecks } from '../js/checks.js';

test('there are exactly 56 cases', () => {
  assert.equal(CASES.length, 56);
});

test('each category has 14 cases', () => {
  for (const cat of CATEGORIES) {
    assert.equal(casesInCategory(cat.id).length, 14, cat.id);
  }
});

test('case ids are unique and use the category prefix with sequential numbers', () => {
  const ids = new Set(CASES.map((c) => c.id));
  assert.equal(ids.size, CASES.length);
  for (const cat of CATEGORIES) {
    const expected = Array.from({ length: 14 }, (_, i) => `${cat.prefix}-${String(i + 1).padStart(2, '0')}`);
    assert.deepEqual(casesInCategory(cat.id).map((c) => c.id), expected);
  }
});

test('every case has the required fields', () => {
  for (const c of CASES) {
    for (const field of ['id', 'category', 'lang', 'difficulty', 'title', 'prompt', 'reference', 'notes']) {
      assert.equal(typeof c[field], 'string', `${c.id}.${field}`);
      assert.ok(c[field].trim().length > 0, `${c.id}.${field} is empty`);
    }
    assert.ok(getCategory(c.category), `${c.id} has unknown category`);
    assert.ok(c.lang in LANGUAGES, `${c.id} has unknown language`);
    assert.ok(DIFFICULTIES.includes(c.difficulty), `${c.id} has unknown difficulty`);
  }
});

test('every case has 1–3 checks of a known type', () => {
  for (const c of CASES) {
    assert.ok(Array.isArray(c.checks) && c.checks.length >= 1 && c.checks.length <= 3, c.id);
    for (const ch of c.checks) assert.ok(CHECK_TYPES.includes(ch.type), `${c.id}: ${ch.type}`);
  }
});

test('every regex in the dataset compiles', () => {
  for (const c of CASES) {
    for (const ch of c.checks) {
      if (ch.type === 'regex' || ch.type === 'notRegex') {
        assert.doesNotThrow(() => new RegExp(ch.pattern, ch.flags ?? ''), `${c.id}: /${ch.pattern}/`);
      }
    }
  }
});

test('every reference answer passes all of its own checks', () => {
  for (const c of CASES) {
    const { results, passed, total } = runChecks(c.checks, c.reference);
    const failed = results.filter((r) => !r.pass).map((r) => `${r.label} (${r.detail})`);
    assert.equal(passed, total, `${c.id} reference fails: ${failed.join('; ')}`);
  }
});

test('both languages are represented in every category', () => {
  for (const cat of CATEGORIES) {
    const langs = new Set(casesInCategory(cat.id).map((c) => c.lang));
    assert.ok(langs.has('en') && langs.has('pt'), cat.id);
  }
});

test('16 cases are in European Portuguese', () => {
  assert.equal(CASES.filter((c) => c.lang === 'pt').length, 16);
});

test('getCase returns null for unknown ids', () => {
  assert.equal(getCase('FA-01').title, 'Chemical symbol for gold');
  assert.equal(getCase('XX-99'), null);
});

test('the dataset ships without any results', () => {
  for (const c of CASES) {
    for (const key of ['results', 'scores', 'evaluations', 'responses']) {
      assert.equal(c[key], undefined, `${c.id} must not contain ${key}`);
    }
  }
});
