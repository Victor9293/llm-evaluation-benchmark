// Builds a shareable Markdown report from the evaluator's own data.
// Pure function: no DOM, no storage, easy to test.

import {
  CRITERIA,
  PREFERENCES,
  VERDICTS,
  rubricAverage,
  summarizeByModel,
  summarizeByCategory,
  summarizeComparisons,
  formatPercent,
  formatScore,
} from './scoring.js';

const RESPONSE_PREVIEW = 600;

/** Escape text for a Markdown table cell (pipes and line breaks). */
export function mdCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

/** Quote multi-line text as a Markdown blockquote, optionally truncated. */
export function mdQuote(text, max = Infinity) {
  let t = String(text ?? '').trim();
  if (t.length > max) t = `${t.slice(0, max).trimEnd()} […]`;
  return t
    .split(/\r?\n/)
    .map((line) => `> ${line}`.trimEnd())
    .join('\n');
}

function table(head, rows) {
  return [
    `| ${head.map(mdCell).join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`),
  ].join('\n');
}

function verdictName(id) {
  return VERDICTS.find((v) => v.id === id)?.label ?? id;
}

function preferenceName(id) {
  return PREFERENCES.find((p) => p.id === id)?.label ?? id;
}

/**
 * @param {{ evaluations: object[], comparisons: object[], cases: object[], categories: object[],
 *           generatedAt?: Date, appUrl?: string, evaluator?: string }} input
 */
export function buildReport({ evaluations, comparisons, cases, categories, generatedAt = new Date(), appUrl = '', evaluator = '' }) {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const out = [];
  const date = generatedAt.toISOString().slice(0, 10);

  out.push('# LLM evaluation report');
  out.push('');
  out.push(`Generated ${date}${evaluator ? ` by ${evaluator}` : ''}${appUrl ? ` with [LLM Evaluation Benchmark](${appUrl})` : ''}.`);
  out.push('');
  out.push(
    '> Every response below was produced by the named model and judged manually by the evaluator. ' +
      'Automated checks are heuristics. This is a small sample from a single evaluator, so treat the numbers as notes, not as a leaderboard.',
  );
  out.push('');
  out.push(`**${evaluations.length}** evaluation${evaluations.length === 1 ? '' : 's'} · **${comparisons.length}** pairwise comparison${comparisons.length === 1 ? '' : 's'}`);

  if (evaluations.length) {
    out.push('', '## Summary by model', '');
    out.push(
      table(
        ['Model', 'Evaluations', 'Cases covered', 'Checks passed', 'Rubric avg (1–5)', 'Pass / Partial / Fail'],
        summarizeByModel(evaluations).map((s) => [
          s.model,
          s.count,
          `${s.casesCovered} / ${cases.length}`,
          formatPercent(s.checkRate),
          formatScore(s.rubricAvg),
          `${s.verdicts.pass} / ${s.verdicts.partial} / ${s.verdicts.fail}`,
        ]),
      ),
    );
    out.push('', '## Summary by category', '');
    out.push(
      table(
        ['Category', 'Evaluations', 'Checks passed', 'Rubric avg (1–5)', 'Pass / Partial / Fail'],
        summarizeByCategory(evaluations, cases, categories).map((s) => [
          s.name,
          s.count,
          formatPercent(s.checkRate),
          formatScore(s.rubricAvg),
          `${s.verdicts.pass} / ${s.verdicts.partial} / ${s.verdicts.fail}`,
        ]),
      ),
    );
  }

  if (comparisons.length) {
    out.push('', '## Head-to-head (pairwise comparisons)', '');
    out.push(
      table(
        ['Model', 'Comparisons', 'Wins', 'Ties', 'Losses', 'Win rate'],
        summarizeComparisons(comparisons).map((s) => [s.model, s.comparisons, s.wins, s.ties, s.losses, formatPercent(s.winRate)]),
      ),
    );
  }

  if (evaluations.length) {
    out.push('', '## Evaluations', '');
    const sorted = [...evaluations].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.model.localeCompare(b.model));
    for (const ev of sorted) {
      const c = byId.get(ev.caseId);
      out.push(`### ${ev.caseId} · ${c?.title ?? ''} · ${ev.model}`);
      out.push('');
      out.push(`**Verdict:** ${verdictName(ev.verdict)} · **Checks:** ${ev.checks.passed}/${ev.checks.total} · **Rubric avg:** ${formatScore(rubricAverage(ev.rubric))}`);
      out.push('');
      const scores = CRITERIA.map((cr) => `${cr.name}: ${ev.rubric[cr.id] ?? 'N/A'}`).join(' · ');
      out.push(`**Scores:** ${scores}`);
      if (c) {
        out.push('', '**Prompt**', '', mdQuote(c.prompt));
      }
      out.push('', `**Response** (${ev.model})`, '', mdQuote(ev.response, RESPONSE_PREVIEW));
      if (ev.notes) out.push('', '**Evaluator notes**', '', ev.notes.trim());
      out.push('');
    }
  }

  if (comparisons.length) {
    out.push('', '## Pairwise comparisons', '');
    const sorted = [...comparisons].sort((a, b) => a.caseId.localeCompare(b.caseId));
    for (const cmp of sorted) {
      const c = byId.get(cmp.caseId);
      out.push(`### ${cmp.caseId} · ${c?.title ?? ''} · ${cmp.modelA} vs ${cmp.modelB}`);
      out.push('');
      out.push(`**Preference:** ${preferenceName(cmp.preference)} (A = ${cmp.modelA}, B = ${cmp.modelB})`);
      out.push('', '**Rationale**', '', cmp.rationale.trim());
      out.push('', `**Response A** (${cmp.modelA})`, '', mdQuote(cmp.responseA, RESPONSE_PREVIEW));
      out.push('', `**Response B** (${cmp.modelB})`, '', mdQuote(cmp.responseB, RESPONSE_PREVIEW));
      out.push('');
    }
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
