// Evaluation storage (browser localStorage), validation, import and export.
// Nothing is ever sent over the network.

import { CRITERION_IDS, VERDICT_IDS, PREFERENCE_IDS, rubricAverage } from './scoring.js';

export const STORAGE_KEY = 'leb.evaluations.v1';
export const COMPARISONS_KEY = 'leb.comparisons.v1';
export const EXPORT_FORMAT = 'llm-evaluation-benchmark/evaluations';
export const EXPORT_VERSION = 1;

const LIMITS = { id: 100, model: 100, response: 50000, notes: 5000 };

export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isIsoDate(value) {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function isCount(n) {
  return Number.isInteger(n) && n >= 0 && n <= 1000;
}

/**
 * Validate an evaluation record. Returns { ok, errors, value } where value is a
 * clean copy containing only known fields.
 * @param {unknown} input
 * @param {{ caseIds?: Set<string> | string[] }} [options]
 */
export function validateEvaluation(input, options = {}) {
  const errors = [];
  const caseIds = options.caseIds ? new Set(options.caseIds) : null;

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Not an object'], value: null };
  }
  const e = input;

  if (typeof e.id !== 'string' || !e.id || e.id.length > LIMITS.id) errors.push('Invalid id');
  if (typeof e.caseId !== 'string' || (caseIds && !caseIds.has(e.caseId))) errors.push('Unknown case');
  if (typeof e.model !== 'string' || !e.model.trim() || e.model.length > LIMITS.model) errors.push('Invalid model name');
  if (typeof e.response !== 'string' || !e.response.trim() || e.response.length > LIMITS.response) {
    errors.push('Invalid response');
  }
  if (!isIsoDate(e.createdAt)) errors.push('Invalid createdAt');
  if (e.updatedAt != null && !isIsoDate(e.updatedAt)) errors.push('Invalid updatedAt');
  if (!VERDICT_IDS.includes(e.verdict)) errors.push('Invalid verdict');
  if (e.notes != null && (typeof e.notes !== 'string' || e.notes.length > LIMITS.notes)) errors.push('Invalid notes');

  const rubric = {};
  if (e.rubric === null || typeof e.rubric !== 'object' || Array.isArray(e.rubric)) {
    errors.push('Invalid rubric');
  } else {
    for (const id of CRITERION_IDS) {
      const v = e.rubric[id];
      if (v === null || v === undefined) rubric[id] = null;
      else if (Number.isInteger(v) && v >= 1 && v <= 5) rubric[id] = v;
      else errors.push(`Invalid score for ${id}`);
    }
  }

  const checks = e.checks;
  if (!checks || !isCount(checks.passed) || !isCount(checks.total) || checks.passed > checks.total) {
    errors.push('Invalid checks');
  }

  if (errors.length) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      id: e.id,
      caseId: e.caseId,
      model: e.model.trim(),
      response: e.response,
      createdAt: e.createdAt,
      ...(e.updatedAt ? { updatedAt: e.updatedAt } : {}),
      checks: { passed: checks.passed, total: checks.total },
      rubric,
      verdict: e.verdict,
      notes: e.notes ?? '',
    },
  };
}

/**
 * Validate a pairwise comparison (response A vs response B for the same case).
 * Returns { ok, errors, value } like validateEvaluation.
 */
export function validateComparison(input, options = {}) {
  const errors = [];
  const caseIds = options.caseIds ? new Set(options.caseIds) : null;

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Not an object'], value: null };
  }
  const c = input;

  if (typeof c.id !== 'string' || !c.id || c.id.length > LIMITS.id) errors.push('Invalid id');
  if (typeof c.caseId !== 'string' || (caseIds && !caseIds.has(c.caseId))) errors.push('Unknown case');
  for (const side of ['A', 'B']) {
    const model = c[`model${side}`];
    const response = c[`response${side}`];
    const checks = c[`checks${side}`];
    if (typeof model !== 'string' || !model.trim() || model.length > LIMITS.model) errors.push(`Invalid model ${side}`);
    if (typeof response !== 'string' || !response.trim() || response.length > LIMITS.response) {
      errors.push(`Invalid response ${side}`);
    }
    if (!checks || !isCount(checks.passed) || !isCount(checks.total) || checks.passed > checks.total) {
      errors.push(`Invalid checks ${side}`);
    }
  }
  if (!PREFERENCE_IDS.includes(c.preference)) errors.push('Invalid preference');
  if (typeof c.rationale !== 'string' || !c.rationale.trim() || c.rationale.length > LIMITS.notes) {
    errors.push('Invalid rationale');
  }
  if (!isIsoDate(c.createdAt)) errors.push('Invalid createdAt');
  if (c.updatedAt != null && !isIsoDate(c.updatedAt)) errors.push('Invalid updatedAt');

  if (errors.length) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      id: c.id,
      caseId: c.caseId,
      modelA: c.modelA.trim(),
      modelB: c.modelB.trim(),
      responseA: c.responseA,
      responseB: c.responseB,
      checksA: { passed: c.checksA.passed, total: c.checksA.total },
      checksB: { passed: c.checksB.passed, total: c.checksB.total },
      preference: c.preference,
      rationale: c.rationale.trim(),
      createdAt: c.createdAt,
      ...(c.updatedAt ? { updatedAt: c.updatedAt } : {}),
    },
  };
}

function probe(backend) {
  try {
    const k = '__leb_probe__';
    backend.setItem(k, '1');
    backend.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a store backed by a Storage-like object (localStorage). If the backend
 * is missing or unusable (e.g. blocked storage), data is kept in memory only.
 */
export function createStore(backend, options = {}) {
  const key = options.key ?? STORAGE_KEY;
  const validate = options.validate ?? validateEvaluation;
  const persistent = Boolean(backend) && probe(backend);
  let memory = [];

  function read() {
    if (!persistent) return memory.slice();
    try {
      const raw = backend.getItem(key);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.map((d) => validate(d)).filter((r) => r.ok).map((r) => r.value);
    } catch {
      return [];
    }
  }

  function write(list) {
    if (persistent) backend.setItem(key, JSON.stringify(list));
    else memory = list.slice();
  }

  function mustBeValid(ev) {
    const r = validate(ev);
    if (!r.ok) throw new Error(`Invalid record: ${r.errors.join(', ')}`);
    return r.value;
  }

  return {
    persistent,
    all: read,
    get(id) {
      return read().find((e) => e.id === id) ?? null;
    },
    add(ev) {
      const value = mustBeValid(ev);
      const list = read();
      if (list.some((e) => e.id === value.id)) throw new Error('Duplicate id');
      list.push(value);
      write(list);
      return value;
    },
    update(ev) {
      const value = mustBeValid(ev);
      const list = read();
      const i = list.findIndex((e) => e.id === value.id);
      if (i === -1) throw new Error('Not found');
      list[i] = value;
      write(list);
      return value;
    },
    remove(id) {
      const list = read();
      const next = list.filter((e) => e.id !== id);
      write(next);
      return next.length !== list.length;
    },
    clear() {
      write([]);
    },
    /** Add records whose id is not already stored. Returns { added, skipped }. */
    importMany(records) {
      const list = read();
      const ids = new Set(list.map((e) => e.id));
      let added = 0;
      let skipped = 0;
      for (const rec of records) {
        if (ids.has(rec.id)) {
          skipped += 1;
          continue;
        }
        list.push(mustBeValid(rec));
        ids.add(rec.id);
        added += 1;
      }
      write(list);
      return { added, skipped };
    },
  };
}

export function toJSON(evaluations, now = new Date(), comparisons = []) {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: now.toISOString(),
      evaluations,
      comparisons,
    },
    null,
    2,
  );
}

function validateAll(list, validate, options) {
  const valid = [];
  let rejected = 0;
  for (const item of list) {
    const r = validate(item, options);
    if (r.ok) valid.push(r.value);
    else rejected += 1;
  }
  return { valid, rejected };
}

/**
 * Parse an exported file. Accepts the export envelope (with or without
 * comparisons) or a bare array of evaluations.
 * Returns { valid, rejected, comparisons, comparisonsRejected, error }.
 */
export function parseImport(text, options = {}) {
  const empty = { valid: [], rejected: 0, comparisons: [], comparisonsRejected: 0 };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ...empty, error: 'The file is not valid JSON.' };
  }
  let evaluations;
  let comparisons = [];
  if (Array.isArray(data)) evaluations = data;
  else if (data && data.format === EXPORT_FORMAT && Array.isArray(data.evaluations)) {
    evaluations = data.evaluations;
    if (Array.isArray(data.comparisons)) comparisons = data.comparisons;
  } else return { ...empty, error: 'This is not an LLM Evaluation Benchmark export.' };

  const ev = validateAll(evaluations, validateEvaluation, options);
  const cmp = validateAll(comparisons, validateComparison, options);
  return {
    valid: ev.valid,
    rejected: ev.rejected,
    comparisons: cmp.valid,
    comparisonsRejected: cmp.rejected,
    error: null,
  };
}

/** Escape one CSV cell. Strings that start like a formula are prefixed with ' to prevent CSV injection. */
export function csvEscape(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const CSV_COLUMNS = [
  'id',
  'created_at',
  'model',
  'case_id',
  'category',
  'language',
  'checks_passed',
  'checks_total',
  ...CRITERION_IDS.map((id) => `score_${id}`),
  'rubric_average',
  'verdict',
  'notes',
  'response',
];

export function toCSV(evaluations, cases) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const rows = [CSV_COLUMNS.join(',')];
  for (const ev of evaluations) {
    const c = byId.get(ev.caseId);
    const avg = rubricAverage(ev.rubric);
    const cells = [
      ev.id,
      ev.createdAt,
      ev.model,
      ev.caseId,
      c?.category ?? '',
      c?.lang ?? '',
      ev.checks.passed,
      ev.checks.total,
      ...CRITERION_IDS.map((id) => ev.rubric[id] ?? ''),
      avg == null ? '' : Number(avg.toFixed(2)),
      ev.verdict,
      ev.notes ?? '',
      ev.response,
    ];
    rows.push(cells.map(csvEscape).join(','));
  }
  return rows.join('\r\n');
}

export const COMPARISON_CSV_COLUMNS = [
  'id',
  'created_at',
  'case_id',
  'category',
  'language',
  'model_a',
  'model_b',
  'checks_a',
  'checks_b',
  'preference',
  'rationale',
  'response_a',
  'response_b',
];

export function toComparisonsCSV(comparisons, cases) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const rows = [COMPARISON_CSV_COLUMNS.join(',')];
  for (const cmp of comparisons) {
    const c = byId.get(cmp.caseId);
    const cells = [
      cmp.id,
      cmp.createdAt,
      cmp.caseId,
      c?.category ?? '',
      c?.lang ?? '',
      cmp.modelA,
      cmp.modelB,
      `${cmp.checksA.passed}/${cmp.checksA.total}`,
      `${cmp.checksB.passed}/${cmp.checksB.total}`,
      cmp.preference,
      cmp.rationale,
      cmp.responseA,
      cmp.responseB,
    ];
    rows.push(cells.map(csvEscape).join(','));
  }
  return rows.join('\r\n');
}
