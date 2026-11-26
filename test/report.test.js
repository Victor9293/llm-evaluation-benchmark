import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, mdCell, mdQuote } from '../js/report.js';
import { CASES, CATEGORIES } from '../js/cases.js';

const evaluation = (overrides = {}) => ({
  id: 'e1',
  caseId: 'FA-01',
  model: 'Model | X',
  response: 'The symbol is Au.\nFrom "aurum".',
  createdAt: '2026-11-26T10:00:00.000Z',
  checks: { passed: 1, total: 1 },
  rubric: { accuracy: 5, instructions: 5, reasoning: null, honesty: 5, language: 4 },
  verdict: 'pass',
  notes: 'Correct and precise.',
  ...overrides,
});

const comparison = {
  id: 'c1',
  caseId: 'HA-01',
  modelA: 'Model X',
  modelB: 'Model Y',
  responseA: "I can't verify that book.",
  responseB: 'It follows a young cartographer.',
  checksA: { passed: 1, total: 1 },
  checksB: { passed: 0, total: 1 },
  preference: 'a_much',
  rationale: 'A admits uncertainty; B invents a plot.',
  createdAt: '2026-11-26T11:00:00.000Z',
};

const fixedDate = new Date('2026-11-27T09:00:00Z');

test('mdCell escapes pipes and flattens line breaks', () => {
  assert.equal(mdCell('a | b\nc'), 'a \\| b c');
});

test('mdQuote quotes every line and truncates long text', () => {
  assert.equal(mdQuote('one\ntwo'), '> one\n> two');
  assert.equal(mdQuote('abcdefghij', 4), '> abcd […]');
});

test('an empty report says so and has no sections', () => {
  const md = buildReport({ evaluations: [], comparisons: [], cases: CASES, categories: CATEGORIES, generatedAt: fixedDate });
  assert.match(md, /^# LLM evaluation report/);
  assert.match(md, /\*\*0\*\* evaluations · \*\*0\*\* pairwise comparisons/);
  assert.doesNotMatch(md, /## Summary by model/);
});

test('report includes summaries, per-case details and comparisons', () => {
  const md = buildReport({
    evaluations: [evaluation()],
    comparisons: [comparison],
    cases: CASES,
    categories: CATEGORIES,
    generatedAt: fixedDate,
    appUrl: 'https://example.test/',
    evaluator: 'Victor',
  });
  assert.match(md, /Generated 2026-11-27 by Victor with \[LLM Evaluation Benchmark\]\(https:\/\/example\.test\/\)/);
  assert.match(md, /## Summary by model/);
  assert.match(md, /\| Model \\\| X \| 1 \| 1 \/ 56 \| 100% \| 4\.75 \| 1 \/ 0 \/ 0 \|/);
  assert.match(md, /## Summary by category/);
  assert.match(md, /### FA-01 · Chemical symbol for gold · Model \| X/);
  assert.match(md, /Reasoning & clarity: N\/A/);
  assert.match(md, /> The symbol is Au\.\n> From "aurum"\./);
  assert.match(md, /## Head-to-head/);
  assert.match(md, /\*\*Preference:\*\* A is much better \(A = Model X, B = Model Y\)/);
  assert.doesNotMatch(md, /\n{3,}/);
});
