import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  EXPORT_FORMAT,
  createStore,
  validateEvaluation,
  parseImport,
  toJSON,
  toCSV,
  csvEscape,
  newId,
  CSV_COLUMNS,
} from '../js/storage.js';
import { CASES } from '../js/cases.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
}

class BrokenStorage {
  getItem() {
    throw new Error('blocked');
  }
  setItem() {
    throw new Error('blocked');
  }
  removeItem() {
    throw new Error('blocked');
  }
}

const caseIds = new Set(CASES.map((c) => c.id));

const valid = (overrides = {}) => ({
  id: 'ev-1',
  caseId: 'FA-01',
  model: 'Model A',
  response: 'The symbol is Au.',
  createdAt: '2026-11-26T10:00:00.000Z',
  checks: { passed: 1, total: 1 },
  rubric: { accuracy: 5, instructions: 4, reasoning: null, honesty: 5, language: 5 },
  verdict: 'pass',
  notes: 'Correct.',
  ...overrides,
});

test('validateEvaluation accepts a valid record and strips unknown fields', () => {
  const r = validateEvaluation({ ...valid(), injected: '<script>' }, { caseIds });
  assert.equal(r.ok, true);
  assert.equal(r.value.injected, undefined);
});

test('validateEvaluation rejects bad data', () => {
  const bad = [
    null,
    [],
    valid({ id: '' }),
    valid({ caseId: 'ZZ-01' }),
    valid({ model: '   ' }),
    valid({ response: '' }),
    valid({ createdAt: 'not a date' }),
    valid({ verdict: 'great' }),
    valid({ rubric: { accuracy: 6 } }),
    valid({ rubric: { accuracy: 2.5 } }),
    valid({ checks: { passed: 2, total: 1 } }),
    valid({ notes: 42 }),
  ];
  for (const b of bad) assert.equal(validateEvaluation(b, { caseIds }).ok, false, JSON.stringify(b));
});

test('missing rubric scores become N/A (null)', () => {
  const r = validateEvaluation(valid({ rubric: { accuracy: 3 } }), { caseIds });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.rubric, { accuracy: 3, instructions: null, reasoning: null, honesty: null, language: null });
});

test('store: add, get, update, remove, clear', () => {
  const backend = new MemoryStorage();
  const store = createStore(backend);
  assert.equal(store.persistent, true);
  assert.deepEqual(store.all(), []);

  store.add(valid());
  assert.equal(store.all().length, 1);
  assert.throws(() => store.add(valid()), /Duplicate/);

  store.update(valid({ verdict: 'partial' }));
  assert.equal(store.get('ev-1').verdict, 'partial');
  assert.throws(() => store.update(valid({ id: 'missing' })), /Not found/);

  assert.equal(store.remove('ev-1'), true);
  assert.equal(store.remove('ev-1'), false);

  store.add(valid({ id: 'a' }));
  store.add(valid({ id: 'b' }));
  store.clear();
  assert.deepEqual(store.all(), []);
});

test('store persists to the backend under a versioned key', () => {
  const backend = new MemoryStorage();
  createStore(backend).add(valid());
  assert.equal(JSON.parse(backend.getItem(STORAGE_KEY)).length, 1);
  assert.equal(createStore(backend).all().length, 1);
});

test('store rejects invalid records and ignores corrupted storage', () => {
  const backend = new MemoryStorage();
  const store = createStore(backend);
  assert.throws(() => store.add(valid({ verdict: 'x' })), /Invalid evaluation/);
  backend.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(store.all(), []);
  backend.setItem(STORAGE_KEY, JSON.stringify([valid(), { junk: true }]));
  assert.equal(store.all().length, 1);
});

test('store falls back to memory when storage is blocked or missing', () => {
  for (const backend of [new BrokenStorage(), null]) {
    const store = createStore(backend);
    assert.equal(store.persistent, false);
    store.add(valid());
    assert.equal(store.all().length, 1);
  }
});

test('importMany skips ids that already exist', () => {
  const store = createStore(new MemoryStorage());
  store.add(valid({ id: 'a' }));
  const r = store.importMany([valid({ id: 'a' }), valid({ id: 'b' })]);
  assert.deepEqual(r, { added: 1, skipped: 1 });
  assert.equal(store.all().length, 2);
});

test('export → import round trip', () => {
  const json = toJSON([valid()], new Date('2026-11-26T12:00:00Z'));
  const data = JSON.parse(json);
  assert.equal(data.format, EXPORT_FORMAT);
  assert.equal(data.exportedAt, '2026-11-26T12:00:00.000Z');
  const r = parseImport(json, { caseIds });
  assert.equal(r.error, null);
  assert.equal(r.valid.length, 1);
  assert.deepEqual(r.valid[0], validateEvaluation(valid()).value);
});

test('parseImport reports bad files and counts rejected records', () => {
  assert.match(parseImport('nope').error, /not valid JSON/);
  assert.match(parseImport('{"foo":1}').error, /not an LLM Evaluation Benchmark export/);
  const r = parseImport(JSON.stringify([valid(), valid({ caseId: 'ZZ-99' })]), { caseIds });
  assert.equal(r.valid.length, 1);
  assert.equal(r.rejected, 1);
});

test('csvEscape quotes special characters and neutralises formulas', () => {
  assert.equal(csvEscape('plain'), 'plain');
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('line\nbreak'), '"line\nbreak"');
  assert.equal(csvEscape('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvEscape('@cmd'), "'@cmd");
  assert.equal(csvEscape(4.5), '4.5');
  assert.equal(csvEscape(null), '');
});

test('toCSV writes a header and one row per evaluation', () => {
  const csv = toCSV([valid(), valid({ id: 'ev-2', response: 'Line 1\nLine 2, "quoted"' })], CASES);
  const [header] = csv.split('\r\n');
  assert.equal(header, CSV_COLUMNS.join(','));
  assert.ok(csv.includes('factual'));
  assert.ok(csv.includes('"Line 1\nLine 2, ""quoted"""'));
  assert.equal(csv.split('\r\n').length, 3);
});

test('newId returns unique ids', () => {
  const ids = new Set(Array.from({ length: 100 }, newId));
  assert.equal(ids.size, 100);
});
