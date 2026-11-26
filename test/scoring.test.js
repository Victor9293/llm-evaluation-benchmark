import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRITERIA,
  VERDICTS,
  focusCriteria,
  rubricAverage,
  summarizeByModel,
  summarizeByCategory,
  formatPercent,
  formatScore,
} from '../js/scoring.js';
import { CASES, CATEGORIES } from '../js/cases.js';

const ev = (overrides) => ({
  id: 'x',
  caseId: 'FA-01',
  model: 'Model A',
  response: 'Au',
  createdAt: '2026-11-26T10:00:00.000Z',
  checks: { passed: 1, total: 1 },
  rubric: { accuracy: 5, instructions: 5, reasoning: null, honesty: 5, language: 5 },
  verdict: 'pass',
  notes: '',
  ...overrides,
});

test('rubric has five criteria with 1/3/5 anchors', () => {
  assert.equal(CRITERIA.length, 5);
  for (const c of CRITERIA) {
    for (const k of [1, 3, 5]) assert.ok(c.anchors[k], `${c.id} anchor ${k}`);
  }
  assert.deepEqual(VERDICTS.map((v) => v.id), ['pass', 'partial', 'fail']);
});

test('rubricAverage ignores N/A and returns null when nothing is scored', () => {
  assert.equal(rubricAverage({ a: 4, b: 2, c: null }), 3);
  assert.equal(rubricAverage({ a: null }), null);
  assert.equal(rubricAverage(undefined), null);
});

test('focusCriteria depends on category and adds language for Portuguese', () => {
  assert.deepEqual(focusCriteria({ category: 'reasoning', lang: 'en' }), ['reasoning', 'accuracy']);
  assert.deepEqual(focusCriteria({ category: 'reasoning', lang: 'pt' }), ['reasoning', 'accuracy', 'language']);
  assert.deepEqual(focusCriteria({ category: 'instruction', lang: 'pt' }), ['instructions', 'language']);
});

test('summarizeByModel aggregates counts, coverage, checks and verdicts', () => {
  const rows = summarizeByModel([
    ev({ id: '1' }),
    ev({ id: '2', caseId: 'FA-02', checks: { passed: 0, total: 1 }, verdict: 'fail', rubric: { accuracy: 1 } }),
    ev({ id: '3', model: 'Model B', verdict: 'partial' }),
    ev({ id: '4', model: ' Model A ' }),
  ]);
  assert.deepEqual(rows.map((r) => r.model), ['Model A', 'Model B']);
  const a = rows[0];
  assert.equal(a.count, 3);
  assert.equal(a.casesCovered, 2);
  assert.equal(a.checksPassed, 2);
  assert.equal(a.checksTotal, 3);
  assert.equal(a.checkRate, 2 / 3);
  assert.equal(a.rubricAvg, (5 + 1 + 5) / 3);
  assert.deepEqual(a.verdicts, { pass: 2, partial: 0, fail: 1 });
});

test('summarizeByCategory returns a row per category, empty ones included', () => {
  const rows = summarizeByCategory([ev({ id: '1' }), ev({ id: '2', caseId: 'RE-05' })], CASES, CATEGORIES);
  assert.equal(rows.length, 4);
  const factual = rows.find((r) => r.category === 'factual');
  const hallucination = rows.find((r) => r.category === 'hallucination');
  assert.equal(factual.count, 1);
  assert.equal(hallucination.count, 0);
  assert.equal(hallucination.checkRate, null);
  assert.equal(hallucination.rubricAvg, null);
});

test('formatting helpers', () => {
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(0.666), '67%');
  assert.equal(formatScore(null), '—');
  assert.equal(formatScore(4), '4.00');
});
