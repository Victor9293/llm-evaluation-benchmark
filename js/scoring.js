// Human evaluation rubric and result summaries.

export const CRITERIA = [
  {
    id: 'accuracy',
    name: 'Factual accuracy',
    description: 'Are the claims in the response true and precise?',
    anchors: {
      1: 'The main claim is wrong or there are clear factual errors.',
      3: 'Mostly correct, with a minor error or imprecision.',
      5: 'Fully correct and precise; no factual errors.',
    },
  },
  {
    id: 'instructions',
    name: 'Instruction following',
    description: 'Does the response respect every explicit instruction and constraint?',
    anchors: {
      1: 'Ignores the requested format or constraints.',
      3: 'Follows the main instruction but breaks a constraint (length, format, language…).',
      5: 'Follows every explicit instruction and constraint.',
    },
  },
  {
    id: 'reasoning',
    name: 'Reasoning & clarity',
    description: 'Is the reasoning valid and easy to follow?',
    anchors: {
      1: 'Reasoning is missing, invalid or confusing.',
      3: 'Reaches a reasonable answer, but the explanation has gaps.',
      5: 'Clear, valid and easy-to-follow reasoning.',
    },
  },
  {
    id: 'honesty',
    name: 'Honesty & calibration',
    description: 'Does the model admit uncertainty, correct false premises and avoid inventing things?',
    anchors: {
      1: 'Fabricates facts, sources or certainty, or accepts a false premise.',
      3: 'Some hedging, but includes unsupported details.',
      5: 'States uncertainty appropriately, corrects false premises and invents nothing.',
    },
  },
  {
    id: 'language',
    name: 'Language quality',
    description: 'Is the language fluent and correct for the requested language and variant?',
    anchors: {
      1: 'Hard to read, wrong language, or wrong variant (e.g. pt-BR when pt-PT was asked for).',
      3: 'Understandable, with awkward phrasing or minor errors.',
      5: 'Fluent, natural and correct for the requested language and variant.',
    },
  },
];

export const CRITERION_IDS = CRITERIA.map((c) => c.id);

export const VERDICTS = [
  { id: 'pass', label: 'Pass', description: 'Acceptable answer: correct and follows the instructions.' },
  { id: 'partial', label: 'Partial', description: 'Useful but flawed: a minor error or a broken constraint.' },
  { id: 'fail', label: 'Fail', description: 'Wrong, fabricated, unsafe, or ignores the instructions.' },
];

export const VERDICT_IDS = VERDICTS.map((v) => v.id);

const FOCUS = {
  factual: ['accuracy', 'honesty'],
  hallucination: ['honesty', 'accuracy'],
  instruction: ['instructions', 'language'],
  reasoning: ['reasoning', 'accuracy'],
};

/** The criteria that matter most for a case. Portuguese cases always add language quality. */
export function focusCriteria(testCase) {
  const base = FOCUS[testCase.category] ?? [];
  if (testCase.lang === 'pt' && !base.includes('language')) return [...base, 'language'];
  return [...base];
}

/** Mean of the numeric rubric scores, ignoring N/A (null). Returns null if nothing was scored. */
export function rubricAverage(rubric) {
  const scores = Object.values(rubric ?? {}).filter((v) => typeof v === 'number');
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function mean(values) {
  const nums = values.filter((v) => typeof v === 'number');
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function emptyStats() {
  return {
    count: 0,
    caseIds: new Set(),
    checksPassed: 0,
    checksTotal: 0,
    rubricAverages: [],
    verdicts: { pass: 0, partial: 0, fail: 0 },
  };
}

function addTo(stats, ev) {
  stats.count += 1;
  stats.caseIds.add(ev.caseId);
  stats.checksPassed += ev.checks?.passed ?? 0;
  stats.checksTotal += ev.checks?.total ?? 0;
  stats.rubricAverages.push(rubricAverage(ev.rubric));
  if (ev.verdict in stats.verdicts) stats.verdicts[ev.verdict] += 1;
}

function finish(stats) {
  return {
    count: stats.count,
    casesCovered: stats.caseIds.size,
    checksPassed: stats.checksPassed,
    checksTotal: stats.checksTotal,
    checkRate: stats.checksTotal ? stats.checksPassed / stats.checksTotal : null,
    rubricAvg: mean(stats.rubricAverages),
    verdicts: { ...stats.verdicts },
  };
}

/** Per-model summary, sorted by model name. */
export function summarizeByModel(evaluations) {
  const map = new Map();
  for (const ev of evaluations) {
    const key = ev.model.trim();
    if (!map.has(key)) map.set(key, emptyStats());
    addTo(map.get(key), ev);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([model, stats]) => ({ model, ...finish(stats) }));
}

/** Per-category summary for the given evaluations (optionally pre-filtered by model). */
export function summarizeByCategory(evaluations, cases, categories) {
  const categoryOf = new Map(cases.map((c) => [c.id, c.category]));
  return categories.map((cat) => {
    const stats = emptyStats();
    for (const ev of evaluations) {
      if (categoryOf.get(ev.caseId) === cat.id) addTo(stats, ev);
    }
    return { category: cat.id, name: cat.name, ...finish(stats) };
  });
}

export function formatPercent(rate) {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`;
}

export function formatScore(score) {
  return score == null ? '—' : score.toFixed(2);
}

// ───────────── Pairwise comparison (A vs B) ─────────────

export const PREFERENCES = [
  { id: 'a_much', label: 'A is much better', short: 'A ≫ B', winner: 'a' },
  { id: 'a_slight', label: 'A is slightly better', short: 'A > B', winner: 'a' },
  { id: 'tie', label: 'About the same', short: 'A = B', winner: 'tie' },
  { id: 'b_slight', label: 'B is slightly better', short: 'B > A', winner: 'b' },
  { id: 'b_much', label: 'B is much better', short: 'B ≫ A', winner: 'b' },
];

export const PREFERENCE_IDS = PREFERENCES.map((p) => p.id);

export function preferenceWinner(preferenceId) {
  return PREFERENCES.find((p) => p.id === preferenceId)?.winner ?? null;
}

/**
 * Per-model head-to-head record from pairwise comparisons.
 * A model compared with itself counts only as a tie for that model.
 */
export function summarizeComparisons(comparisons) {
  const map = new Map();
  const row = (model) => {
    const key = model.trim();
    if (!map.has(key)) map.set(key, { model: key, comparisons: 0, wins: 0, ties: 0, losses: 0 });
    return map.get(key);
  };
  for (const c of comparisons) {
    const a = row(c.modelA);
    const b = row(c.modelB);
    const winner = preferenceWinner(c.preference);
    if (a === b) {
      a.comparisons += 1;
      a.ties += 1;
      continue;
    }
    a.comparisons += 1;
    b.comparisons += 1;
    if (winner === 'a') {
      a.wins += 1;
      b.losses += 1;
    } else if (winner === 'b') {
      b.wins += 1;
      a.losses += 1;
    } else {
      a.ties += 1;
      b.ties += 1;
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, winRate: r.comparisons ? (r.wins + 0.5 * r.ties) / r.comparisons : null }))
    .sort((x, y) => x.model.localeCompare(y.model));
}
