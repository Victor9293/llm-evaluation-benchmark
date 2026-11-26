import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  words,
  lines,
  sentences,
  extractNumbers,
  runCheck,
  runChecks,
  describeCheck,
  CHECK_TYPES,
} from '../js/checks.js';
import { getCase } from '../js/cases.js';

const pass = (check, text) => assert.equal(runCheck(check, text).pass, true, `${check.type} should pass on: ${text}`);
const fail = (check, text) => assert.equal(runCheck(check, text).pass, false, `${check.type} should fail on: ${text}`);

test('normalize strips accents, case and curly apostrophes', () => {
  assert.equal(normalize('Não CONHEÇO'), 'nao conheco');
  assert.equal(normalize('I don’t know'), "i don't know");
});

test('words ignores punctuation-only tokens', () => {
  assert.deepEqual(words('Hello , world — 42!'), ['Hello', 'world', '42!']);
  assert.equal(words('   ').length, 0);
});

test('lines ignores blank lines', () => {
  assert.equal(lines('a\n\n b\r\nc\n  \n').length, 3);
});

test('sentences splits on terminal punctuation', () => {
  assert.equal(sentences('One. Two! Three?').length, 3);
  assert.equal(sentences('No final punctuation').length, 1);
  assert.equal(sentences('').length, 0);
});

test('extractNumbers handles English and Portuguese formats', () => {
  assert.ok(extractNumbers('costs 0,05 €').includes(0.05));
  assert.ok(extractNumbers('costs €0.05').includes(0.05));
  assert.ok(extractNumbers('4,000 mg').includes(4000));
  assert.ok(extractNumbers('1.000,5 km').includes(1000.5));
  assert.deepEqual(extractNumbers('no digits'), []);
});

test('includesAny is accent- and case-insensitive', () => {
  const check = { type: 'includesAny', values: ['Camões'] };
  pass(check, 'Foi o CAMOES.');
  fail(check, 'Foi Pessoa.');
});

test('includesAll and excludesAll', () => {
  pass({ type: 'includesAll', values: ['a', 'b'] }, 'a and b');
  fail({ type: 'includesAll', values: ['a', 'zzz'] }, 'a and b');
  pass({ type: 'excludesAll', values: ['sydney'] }, 'Canberra');
  fail({ type: 'excludesAll', values: ['sydney'] }, 'Sydney');
});

test('regex and notRegex respect flags, and invalid patterns fail safely', () => {
  pass({ type: 'regex', pattern: '^yes$', flags: 'i' }, 'YES');
  fail({ type: 'regex', pattern: '^yes$' }, 'YES');
  pass({ type: 'notRegex', pattern: 'e' }, 'A cat');
  fail({ type: 'notRegex', pattern: 'e' }, 'The cat');
  const bad = runCheck({ type: 'regex', pattern: '(' }, 'x');
  assert.equal(bad.pass, false);
  assert.equal(bad.detail, 'Invalid pattern');
});

test('word limits', () => {
  pass({ type: 'maxWords', value: 3 }, 'one two three');
  fail({ type: 'maxWords', value: 3 }, 'one two three four');
  pass({ type: 'minWords', value: 2 }, 'one two');
  fail({ type: 'minWords', value: 2 }, 'one');
});

test('line, bullet and numbered counts', () => {
  pass({ type: 'lineCount', min: 2, max: 2 }, 'a\nb');
  fail({ type: 'lineCount', min: 2, max: 2 }, 'a\nb\nc');
  pass({ type: 'bulletCount', min: 2, max: 2 }, '- a\n* b');
  fail({ type: 'bulletCount', min: 3 }, '- a\n- b');
  pass({ type: 'numberedCount', min: 2, max: 2 }, '1. a\n2) b');
  fail({ type: 'numberedCount', min: 2, max: 2 }, '1. a\nb');
});

test('sentenceCount', () => {
  pass({ type: 'sentenceCount', min: 2, max: 2 }, 'First. Second.');
  fail({ type: 'sentenceCount', min: 2, max: 2 }, 'Only one.');
});

test('startsWith ignores leading whitespace only', () => {
  pass({ type: 'startsWith', value: 'Summary:' }, '  Summary: ok');
  fail({ type: 'startsWith', value: 'Summary:' }, 'summary: ok');
});

test('noUppercase', () => {
  pass({ type: 'noUppercase' }, 'all lower, 123.');
  fail({ type: 'noUppercase' }, 'Not lower');
});

test('jsonValid rejects code fences and surrounding text', () => {
  pass({ type: 'jsonValid' }, ' {"a": 1} ');
  fail({ type: 'jsonValid' }, '```json\n{"a": 1}\n```');
  fail({ type: 'jsonValid' }, 'Here it is: {"a": 1}');
});

test('jsonKeys checks exact keys and rejects arrays', () => {
  const check = { type: 'jsonKeys', keys: ['name', 'age'], exact: true };
  pass(check, '{"name":"A","age":1}');
  fail(check, '{"name":"A"}');
  fail(check, '{"name":"A","age":1,"extra":true}');
  fail(check, '[1,2]');
  pass({ type: 'jsonKeys', keys: ['name'] }, '{"name":"A","age":1}');
});

test('containsNumber with tolerance', () => {
  pass({ type: 'containsNumber', value: 408 }, '17 × 24 = 408');
  fail({ type: 'containsNumber', value: 408 }, '17 × 24 = 418');
  pass({ type: 'containsNumber', value: 3.14, tolerance: 0.01 }, 'about 3.141');
});

test('abstains detects uncertainty in English and Portuguese', () => {
  pass({ type: 'abstains' }, "I'm not aware of that book.");
  pass({ type: 'abstains' }, 'Não conheço essa obra.');
  fail({ type: 'abstains' }, 'The novel follows a young cartographer in Vellmoor.');
  pass({ type: 'abstains', values: ['beyond my knowledge'] }, 'That is beyond my knowledge.');
});

test('abstains is not fooled by incidental wording', () => {
  fail({ type: 'abstains' }, 'In this fictional world, Zarvonia has about 2 million people.');
  fail({ type: 'abstains' }, "Sure! I don't have to guess: the population is 1.2 million.");
  fail({ type: 'abstains' }, 'Não tenho dúvidas: o romance conta a história de uma cidade costeira.');
  pass({ type: 'abstains' }, 'These places appear to be fictional, so I cannot give a population.');
  pass({ type: 'abstains' }, 'Esse livro parece ser fictício; não o encontro nas obras do autor.');
  pass({ type: 'abstains' }, "I don't have real-time data.");
});

test('unknown check types fail rather than pass', () => {
  assert.equal(runCheck({ type: 'nope' }, 'anything').pass, false);
});

test('runChecks fails every check on an empty response', () => {
  const c = getCase('IF-07');
  const r = runChecks(c.checks, '   ');
  assert.equal(r.passed, 0);
  assert.equal(r.total, c.checks.length);
  assert.ok(r.results.every((x) => x.detail === 'Empty response'));
});

test('hallucinated answers fail the hallucination checks', () => {
  const fabricated = {
    'HA-01': 'The Glass Cartographer of Vellmoor follows Elin, a mapmaker who discovers a hidden city.',
    'HA-03': 'DOI: 10.1234/qtf.2021.0042. Abstract: We propose recursive sparse attention for tides.',
    'HA-05': 'Zarvonia has a population of about 1.2 million people.',
    'HA-10': 'See https://fastjsonquantum.readthedocs.io for the official documentation.',
  };
  for (const [id, answer] of Object.entries(fabricated)) {
    const c = getCase(id);
    const { passed, total } = runChecks(c.checks, answer);
    assert.ok(passed < total, `${id} should not fully pass a fabricated answer`);
  }
});

test('classic wrong answers fail the reasoning checks', () => {
  const wrong = {
    'RE-01': 'The pen costs €0.30.',
    'RE-02': 'You need 48 printers.',
    'RE-03': 'After 4 hours.',
    'RE-09': 'Custa 100 €, porque o desconto e o aumento anulam-se.',
    'RE-10': 'Each brother has 2 sisters.',
  };
  for (const [id, answer] of Object.entries(wrong)) {
    const c = getCase(id);
    assert.equal(runChecks(c.checks, answer).passed, 0, id);
  }
});

test('describeCheck has a description for every type and prefers labels', () => {
  for (const type of CHECK_TYPES) {
    const text = describeCheck({ type, values: ['x'], keys: ['x'], value: 1, pattern: 'x', min: 1, max: 1 });
    assert.ok(text && !text.startsWith('Unknown'), type);
  }
  assert.equal(describeCheck({ type: 'regex', pattern: 'x', label: 'Custom' }), 'Custom');
});
