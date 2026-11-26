// Automated checks: small, pure, deterministic heuristics run against a model
// response. They flag likely problems; they never replace a human judgement.

export const ABSTAIN_PHRASES = [
  // English
  "i don't know",
  'i do not know',
  'not aware of',
  "i'm not aware",
  'no information',
  "couldn't find",
  'could not find',
  "can't find",
  'cannot find',
  'unable to find',
  'no record',
  'not familiar',
  "doesn't exist",
  'does not exist',
  "don't know of",
  "don't have access",
  "don't have",
  'do not have',
  "can't verify",
  'cannot verify',
  'unable to verify',
  'not able to verify',
  'appear to be fictional',
  'fictional',
  'fictitious',
  'no such',
  // Portuguese
  'nao sei',
  'nao conheco',
  'desconheco',
  'nao tenho',
  'nao encontr',
  'nao existe',
  'nao consigo',
  'nao ha registo',
  'nao ha registro',
  'sem informacao',
  'ficticio',
  'ficticia',
];

export const CHECK_TYPES = [
  'includesAny',
  'includesAll',
  'excludesAll',
  'regex',
  'notRegex',
  'minWords',
  'maxWords',
  'lineCount',
  'bulletCount',
  'numberedCount',
  'sentenceCount',
  'startsWith',
  'noUppercase',
  'jsonValid',
  'jsonKeys',
  'containsNumber',
  'abstains',
];

/** Lower-case, strip accents and normalise apostrophes for tolerant matching. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase();
}

/** Words = whitespace-separated tokens containing at least one letter or digit. */
export function words(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
}

/** Non-empty lines. */
export function lines(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
}

/** Approximate sentence split on . ! ? … followed by whitespace. */
export function sentences(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/**
 * Extract numbers, tolerating both "1,000.5" (English) and "1.000,5" (Portuguese)
 * formats. Each token can yield more than one candidate value.
 */
export function extractNumbers(text) {
  const tokens = String(text ?? '').match(/\d+(?:[.,]\d+)*/g) ?? [];
  const values = new Set();
  for (const t of tokens) {
    const candidates = [t.replace(/,/g, ''), t.replace(/\./g, '').replace(/,/g, '.'), t];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n)) values.add(n);
    }
  }
  return [...values];
}

function inRange(n, { min, max }) {
  if (typeof min === 'number' && n < min) return false;
  if (typeof max === 'number' && n > max) return false;
  return true;
}

function rangeText({ min, max }) {
  if (typeof min === 'number' && typeof max === 'number') {
    return min === max ? `exactly ${min}` : `${min}–${max}`;
  }
  if (typeof min === 'number') return `at least ${min}`;
  if (typeof max === 'number') return `at most ${max}`;
  return 'any number of';
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function quoteList(values) {
  return values.map((v) => `"${v}"`).join(', ');
}

/** Human-readable description of a check, used in the UI. */
export function describeCheck(check) {
  if (check.label) return check.label;
  switch (check.type) {
    case 'includesAny':
      return `Mentions any of ${quoteList(check.values)}`;
    case 'includesAll':
      return `Mentions all of ${quoteList(check.values)}`;
    case 'excludesAll':
      return `Does not mention ${quoteList(check.values)}`;
    case 'regex':
      return `Matches /${check.pattern}/${check.flags ?? ''}`;
    case 'notRegex':
      return `Does not match /${check.pattern}/${check.flags ?? ''}`;
    case 'minWords':
      return `At least ${plural(check.value, 'word')}`;
    case 'maxWords':
      return `At most ${plural(check.value, 'word')}`;
    case 'lineCount':
      return `Has ${rangeText(check)} non-empty lines`;
    case 'bulletCount':
      return `Has ${rangeText(check)} bullet points`;
    case 'numberedCount':
      return `Has ${rangeText(check)} numbered items`;
    case 'sentenceCount':
      return `Has ${rangeText(check)} sentences`;
    case 'startsWith':
      return `Starts with "${check.value}"`;
    case 'noUppercase':
      return 'Uses no uppercase letters';
    case 'jsonValid':
      return 'Is valid JSON with nothing around it';
    case 'jsonKeys':
      return `JSON object has ${check.exact ? 'exactly' : 'at least'} the keys ${quoteList(check.keys)}`;
    case 'containsNumber':
      return `Mentions the number ${check.value}`;
    case 'abstains':
      return 'Admits it cannot know or verify (no fabrication)';
    default:
      return `Unknown check "${check.type}"`;
  }
}

function result(pass, detail) {
  return { pass: Boolean(pass), detail };
}

function safeRegex(pattern, flags = '') {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/** Run one check against a response. Returns { pass, detail }. */
export function runCheck(check, response) {
  const text = String(response ?? '');
  const norm = normalize(text);

  switch (check.type) {
    case 'includesAny': {
      const hit = check.values.find((v) => norm.includes(normalize(v)));
      return result(hit !== undefined, hit !== undefined ? `Found "${hit}"` : 'None of the expected terms found');
    }
    case 'includesAll': {
      const missing = check.values.filter((v) => !norm.includes(normalize(v)));
      return result(missing.length === 0, missing.length ? `Missing ${quoteList(missing)}` : 'All terms found');
    }
    case 'excludesAll': {
      const found = check.values.filter((v) => norm.includes(normalize(v)));
      return result(found.length === 0, found.length ? `Found ${quoteList(found)}` : 'None found');
    }
    case 'regex':
    case 'notRegex': {
      const re = safeRegex(check.pattern, check.flags);
      if (!re) return result(false, 'Invalid pattern');
      const matched = re.test(text);
      const pass = check.type === 'regex' ? matched : !matched;
      return result(pass, matched ? 'Pattern found' : 'Pattern not found');
    }
    case 'minWords':
    case 'maxWords': {
      const n = words(text).length;
      const pass = check.type === 'minWords' ? n >= check.value : n <= check.value;
      return result(pass, `${plural(n, 'word')} (limit ${check.value})`);
    }
    case 'lineCount': {
      const n = lines(text).length;
      return result(inRange(n, check), `${plural(n, 'line')} (expected ${rangeText(check)})`);
    }
    case 'bulletCount': {
      const n = lines(text).filter((l) => /^\s*[-*•]\s+/.test(l)).length;
      return result(inRange(n, check), `${plural(n, 'bullet')} (expected ${rangeText(check)})`);
    }
    case 'numberedCount': {
      const n = lines(text).filter((l) => /^\s*\d+[.)]\s+/.test(l)).length;
      return result(inRange(n, check), `${plural(n, 'numbered item')} (expected ${rangeText(check)})`);
    }
    case 'sentenceCount': {
      const n = sentences(text).length;
      return result(inRange(n, check), `${plural(n, 'sentence')} (expected ${rangeText(check)})`);
    }
    case 'startsWith': {
      const pass = text.trimStart().startsWith(check.value);
      return result(pass, pass ? 'Prefix present' : `Does not start with "${check.value}"`);
    }
    case 'noUppercase': {
      const pass = text === text.toLocaleLowerCase();
      return result(pass, pass ? 'No uppercase letters' : 'Contains uppercase letters');
    }
    case 'jsonValid': {
      try {
        JSON.parse(text.trim());
        return result(true, 'Parses as JSON');
      } catch {
        return result(false, 'Does not parse as JSON');
      }
    }
    case 'jsonKeys': {
      let data;
      try {
        data = JSON.parse(text.trim());
      } catch {
        return result(false, 'Not valid JSON');
      }
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        return result(false, 'Not a JSON object');
      }
      const keys = Object.keys(data);
      const missing = check.keys.filter((k) => !keys.includes(k));
      const extra = check.exact ? keys.filter((k) => !check.keys.includes(k)) : [];
      const problems = [];
      if (missing.length) problems.push(`missing ${quoteList(missing)}`);
      if (extra.length) problems.push(`unexpected ${quoteList(extra)}`);
      return result(problems.length === 0, problems.length ? problems.join('; ') : 'Keys match');
    }
    case 'containsNumber': {
      const tolerance = check.tolerance ?? 1e-9;
      const pass = extractNumbers(text).some((n) => Math.abs(n - check.value) <= tolerance);
      return result(pass, pass ? `Found ${check.value}` : `${check.value} not found`);
    }
    case 'abstains': {
      const phrases = [...ABSTAIN_PHRASES, ...(check.values ?? [])];
      const hit = phrases.find((p) => norm.includes(normalize(p)));
      return result(hit !== undefined, hit ? `Found "${hit}"` : 'No admission of uncertainty found');
    }
    default:
      return result(false, `Unknown check type "${check.type}"`);
  }
}

/** Run every check of a case. An empty response fails all checks. */
export function runChecks(checks, response) {
  const empty = String(response ?? '').trim() === '';
  const results = checks.map((check) => {
    const r = empty ? result(false, 'Empty response') : runCheck(check, response);
    return { label: describeCheck(check), ...r };
  });
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, total: results.length };
}
