import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash, isAppHash } from '../js/router.js';

test('parseHash defaults to the overview', () => {
  for (const h of ['', '#', '#/']) assert.deepEqual(parseHash(h), { route: 'overview', params: [], query: {} });
});

test('parseHash reads route, params and query', () => {
  assert.deepEqual(parseHash('#/case/FA-01'), { route: 'case', params: ['FA-01'], query: {} });
  assert.deepEqual(parseHash('#/evaluate?case=RE-05&model=My%20Model'), {
    route: 'evaluate',
    params: [],
    query: { case: 'RE-05', model: 'My Model' },
  });
});

test('parseHash survives malformed escapes', () => {
  assert.deepEqual(parseHash('#/case/%E0%A4%A').params, ['%E0%A4%A']);
});

test('buildHash round-trips through parseHash and drops empty values', () => {
  const hash = buildHash('benchmark', [], { cat: 'reasoning', lang: '', q: 'bat & ball' });
  assert.equal(hash, '#/benchmark?cat=reasoning&q=bat+%26+ball');
  assert.deepEqual(parseHash(hash).query, { cat: 'reasoning', q: 'bat & ball' });
  assert.equal(buildHash('overview'), '#/');
  assert.equal(buildHash('case', ['FA-01']), '#/case/FA-01');
});

test('isAppHash ignores plain anchors such as the skip link', () => {
  assert.equal(isAppHash('#/results'), true);
  assert.equal(isAppHash(''), true);
  assert.equal(isAppHash('#main'), false);
});
