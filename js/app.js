import { CASES, CATEGORIES, LANGUAGES, getCase, getCategory } from './cases.js';
import { runChecks, describeCheck } from './checks.js';
import {
  CRITERIA,
  VERDICTS,
  focusCriteria,
  rubricAverage,
  summarizeByModel,
  summarizeByCategory,
  formatPercent,
  formatScore,
} from './scoring.js';
import { createStore, newId, parseImport, toCSV, toJSON } from './storage.js';
import { parseHash, buildHash, isAppHash } from './router.js';
import { h, frag } from './dom.js';
import { icon } from './icons.js';

export const REPO_URL = 'https://github.com/Victor9293/llm-evaluation-benchmark';
const LAST_MODEL_KEY = 'leb.lastModel';

const store = createStore(safeLocalStorage());
const CASE_IDS = new Set(CASES.map((c) => c.id));
const main = document.getElementById('main');
const flashRegion = document.getElementById('flash');
let pendingFlash = null;

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function prefGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function prefSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: preference is simply not remembered */
  }
}

// ───────────────────────────── shared components ─────────────────────────────

function label(text, variant = 'secondary', extra = '') {
  return h('span', { class: `tag tag--${variant} ${extra}`.trim() }, text);
}

function categoryLabel(categoryId) {
  const cat = getCategory(categoryId);
  return label(cat?.name ?? categoryId, cat?.color ?? 'secondary');
}

function langLabel(lang) {
  return label(lang === 'pt' ? 'pt-PT' : 'EN', 'secondary', 'tag--mono');
}

function verdictLabel(verdict) {
  const variant = { pass: 'success', partial: 'attention', fail: 'danger' }[verdict] ?? 'secondary';
  const text = VERDICTS.find((v) => v.id === verdict)?.label ?? verdict;
  return label(text, variant);
}

function box(title, iconName, body, { actions = null, id = null, flush = false } = {}) {
  return h(
    'section',
    { class: 'panel', id },
    h(
      'div',
      { class: 'panel-head' },
      h('h2', { class: 'panel-title' }, iconName ? icon(iconName) : null, title),
      actions ? h('div', { class: 'panel-actions' }, actions) : null,
    ),
    h('div', { class: flush ? 'panel-body panel-body--flush' : 'panel-body' }, body),
  );
}

function layout(mainChildren, sideChildren) {
  return h(
    'div',
    { class: 'layout' },
    h('div', { class: 'layout-main' }, mainChildren),
    h('aside', { class: 'layout-side' }, sideChildren),
  );
}

function pageHead(title, { subtitle = null, actions = null, crumbs = null } = {}) {
  return h(
    'div',
    { class: 'page-head' },
    crumbs ? h('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, crumbs) : null,
    h(
      'div',
      { class: 'page-head-row' },
      h('h1', { class: 'page-title', tabindex: '-1' }, title),
      actions ? h('div', { class: 'page-actions' }, actions) : null,
    ),
    subtitle ? h('p', { class: 'page-subtitle' }, subtitle) : null,
  );
}

function blankslate(iconName, title, text, actions = []) {
  return h(
    'div',
    { class: 'empty-state' },
    h('div', { class: 'empty-icon' }, icon(iconName, 24)),
    h('h2', {}, title),
    h('p', {}, text),
    actions.length ? h('div', { class: 'btn-row btn-row--center' }, actions) : null,
  );
}

function copyButton(getText, text = 'Copy') {
  const btn = h('button', { type: 'button', class: 'btn btn-sm' }, icon('copy'), h('span', {}, text));
  btn.addEventListener('click', async () => {
    const value = getText();
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      const ta = h('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
      ta.value = value;
      document.body.append(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
    }
    const span = btn.querySelector('span:last-child');
    span.textContent = ok ? 'Copied!' : 'Copy failed';
    setTimeout(() => {
      span.textContent = text;
    }, 1600);
  });
  return btn;
}

function progressBar(rate, variant = 'success') {
  const bar = h('span', { class: `progress-bar progress-bar--${variant}` });
  bar.style.width = `${Math.round((rate ?? 0) * 100)}%`;
  return h('span', { class: 'progress', role: 'presentation' }, bar);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function flash(message, kind = 'success') {
  pendingFlash = { message, kind };
}

function showFlash(message, kind = 'success') {
  const iconName = kind === 'danger' ? 'xCircle' : kind === 'warn' ? 'info' : 'checkCircle';
  const closeBtn = h('button', { type: 'button', class: 'flash-close', 'aria-label': 'Dismiss' }, icon('x'));
  const el = h('div', { class: `notice notice-${kind}`, role: kind === 'danger' ? 'alert' : 'status' }, icon(iconName), h('span', {}, message), closeBtn);
  closeBtn.addEventListener('click', () => el.remove());
  flashRegion.replaceChildren(el);
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function evaluationsFor(caseId) {
  return store.all().filter((e) => e.caseId === caseId);
}

// ───────────────────────────────── Overview ─────────────────────────────────

function viewOverview() {
  const evals = store.all();
  const ptCount = CASES.filter((c) => c.lang === 'pt').length;
  const checkCount = CASES.reduce((n, c) => n + c.checks.length, 0);
  const sample = getCase('HA-01');

  const stat = (value, text) => h('div', { class: 'stat' }, h('dt', {}, text), h('dd', {}, value));

  const hero = h(
    'section',
    { class: 'hero' },
    h(
      'div',
      { class: 'hero-copy' },
      h('p', { class: 'eyebrow' }, h('span', { class: 'pulse' }), 'Personal project · early stage'),
      h('h1', { class: 'hero-title page-title', tabindex: '-1' }, 'Evaluate LLM answers, one careful case at a time.'),
      h(
        'p',
        { class: 'hero-lead' },
        `${CASES.length} hand-written test cases in English and European Portuguese. Paste a model's response, get instant automated checks, then judge it with a clear rubric. No API keys, no server, and nothing leaves your browser.`,
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('a', { class: 'btn btn-primary btn-lg', href: '#/evaluate' }, icon('pencil'), 'Start evaluating'),
        h('a', { class: 'btn btn-lg', href: '#/benchmark' }, icon('beaker'), 'Browse the cases'),
      ),
    ),
    h(
      'div',
      { class: 'hero-demo', 'aria-hidden': 'true' },
      h('div', { class: 'term-bar' }, h('span'), h('span'), h('span'), h('em', {}, `${sample.id} · hallucination trap`)),
      h('pre', { class: 'term-body' }, h('span', { class: 'term-prompt' }, '› '), sample.prompt),
      h(
        'ul',
        { class: 'term-checks' },
        h('li', { class: 'check-pass' }, icon('checkCircle'), 'Admits it cannot verify the book'),
        h('li', { class: 'check-fail' }, icon('xCircle'), 'Invents a plot → hallucination'),
      ),
    ),
  );

  const stats = h(
    'dl',
    { class: 'stats' },
    stat(CASES.length, 'test cases'),
    stat(CATEGORIES.length, 'categories'),
    stat(ptCount, 'in European Portuguese'),
    stat(checkCount, 'automated checks'),
    stat(CRITERIA.length, 'rubric criteria'),
  );

  const steps = [
    ['Pick a case', `Browse ${CASES.length} cases across ${CATEGORIES.length} categories.`],
    ['Run it yourself', 'Copy the prompt into any chatbot or model and paste the answer back.'],
    ['Evaluate', 'Automated checks flag problems; you score five criteria and give a verdict.'],
    ['Compare', 'See results by model and category. Export as JSON or CSV.'],
  ];

  const howItWorks = h(
    'section',
    { class: 'section' },
    h('h2', { class: 'section-title' }, 'How it works'),
    h(
      'ol',
      { class: 'steps-grid' },
      steps.map(([title, text], i) => h('li', { class: 'step' }, h('span', { class: 'step-num' }, i + 1), h('strong', {}, title), h('p', {}, text))),
    ),
  );

  const categories = h(
    'section',
    { class: 'section' },
    h('h2', { class: 'section-title' }, 'Four categories'),
    h(
      'div',
      { class: 'card-grid' },
      CATEGORIES.map((cat) => {
        const inCat = CASES.filter((c) => c.category === cat.id);
        const pt = inCat.filter((c) => c.lang === 'pt').length;
        return h(
          'a',
          { class: `card cat-${cat.id}`, href: buildHash('benchmark', [], { cat: cat.id }) },
          h('div', { class: 'card-head' }, h('strong', {}, cat.name), h('span', { class: 'count' }, inCat.length)),
          h('p', { class: 'card-text' }, cat.description),
          h('p', { class: 'card-meta' }, `${cat.prefix}-01 → ${cat.prefix}-${String(inCat.length).padStart(2, '0')} · ${pt} in pt-PT`),
        );
      }),
    ),
  );

  const honesty = h(
    'section',
    { class: 'section split' },
    h(
      'div',
      { class: 'notice notice-warn' },
      icon('info'),
      h(
        'div',
        {},
        h('strong', {}, 'No results included. '),
        'This app ships with no evaluations. Everything in Results is entered and judged by you. It is a small learning project, built with AI coding assistance, not a validated research benchmark.',
      ),
    ),
    h(
      'div',
      { class: 'notice' },
      icon('shield'),
      h(
        'div',
        {},
        h('strong', {}, 'Your data. '),
        evals.length
          ? h('span', {}, `${evals.length} evaluation${evals.length === 1 ? '' : 's'} saved in this browser. `, h('a', { href: '#/results' }, 'View results →'))
          : 'No evaluations yet. They are stored only in this browser.',
      ),
    ),
  );

  return frag(hero, stats, howItWorks, categories, honesty);
}

// ───────────────────────────────── Benchmark ────────────────────────────────

function viewBenchmark(query) {
  const state = {
    cat: CATEGORIES.some((c) => c.id === query.cat) ? query.cat : 'all',
    lang: query.lang in LANGUAGES ? query.lang : 'all',
    q: query.q ?? '',
  };
  const evaluatedIds = new Set(store.all().map((e) => e.caseId));
  const listContainer = h('div');

  const search = h('input', {
    type: 'search',
    class: 'form-control input-search',
    placeholder: 'Search cases…',
    'aria-label': 'Search cases',
    value: state.q,
  });
  const langSelect = h(
    'select',
    { class: 'form-select', 'aria-label': 'Language', value: state.lang },
    h('option', { value: 'all' }, 'All languages'),
    Object.entries(LANGUAGES).map(([id, name]) => h('option', { value: id }, name)),
  );

  const tabButtons = [{ id: 'all', name: 'All' }, ...CATEGORIES].map((cat) => {
    const count = cat.id === 'all' ? CASES.length : CASES.filter((c) => c.category === cat.id).length;
    const btn = h(
      'button',
      { type: 'button', class: 'segmented-item', 'aria-pressed': String(state.cat === cat.id), dataset: { cat: cat.id } },
      cat.name,
      h('span', { class: 'count' }, count),
    );
    btn.addEventListener('click', () => {
      state.cat = cat.id;
      update();
    });
    return btn;
  });

  function matches(c) {
    if (state.cat !== 'all' && c.category !== state.cat) return false;
    if (state.lang !== 'all' && c.lang !== state.lang) return false;
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    return [c.id, c.title, c.prompt, getCategory(c.category)?.name ?? ''].join(' ').toLowerCase().includes(q);
  }

  function row(c) {
    const count = evaluatedIds.has(c.id) ? evaluationsFor(c.id).length : 0;
    return h(
      'li',
      { class: `panel-row case-row cat-${c.category}` },
      h(
        'span',
        { class: count ? 'row-icon row-icon--done' : 'row-icon', title: count ? 'Evaluated' : 'Not evaluated yet' },
        icon(count ? 'checkCircle' : 'dot'),
      ),
      h(
        'div',
        { class: 'row-main' },
        h('a', { class: 'row-title', href: buildHash('case', [c.id]) }, c.title),
        h(
          'div',
          { class: 'row-meta' },
          h('span', { class: 'mono' }, c.id),
          categoryLabel(c.category),
          langLabel(c.lang),
          h('span', {}, c.difficulty),
          h('span', {}, `${c.checks.length} check${c.checks.length === 1 ? '' : 's'}`),
        ),
      ),
      count ? h('span', { class: 'row-side', title: 'Your evaluations' }, icon('pencil'), count) : null,
    );
  }

  function update() {
    for (const btn of tabButtons) btn.setAttribute('aria-pressed', String(btn.dataset.cat === state.cat));
    const shown = CASES.filter(matches);
    const filtered = state.cat !== 'all' || state.lang !== 'all' || state.q.trim() !== '';
    const clearBtn = filtered
      ? h('button', { type: 'button', class: 'btn-link' }, 'Clear filters')
      : null;
    clearBtn?.addEventListener('click', () => {
      state.cat = 'all';
      state.lang = 'all';
      state.q = '';
      search.value = '';
      langSelect.value = 'all';
      update();
    });

    listContainer.replaceChildren(
      h(
        'section',
        { class: 'panel' },
        h(
          'div',
          { class: 'panel-head' },
          h('h2', { class: 'panel-title' }, icon('beaker'), `${shown.length} case${shown.length === 1 ? '' : 's'}`),
          clearBtn ? h('div', { class: 'panel-actions' }, clearBtn) : null,
        ),
        shown.length
          ? h('ul', { class: 'panel-list' }, shown.map(row))
          : h('div', { class: 'panel-body' }, blankslate('search', 'No cases match', 'Try a different search or clear the filters.')),
      ),
    );
    history.replaceState(null, '', buildHash('benchmark', [], { cat: state.cat === 'all' ? '' : state.cat, lang: state.lang === 'all' ? '' : state.lang, q: state.q.trim() }));
  }

  search.addEventListener('input', () => {
    state.q = search.value;
    update();
  });
  langSelect.addEventListener('change', () => {
    state.lang = langSelect.value;
    update();
  });

  update();

  return frag(
    pageHead('Test cases', {
      subtitle: `${CASES.length} cases. Each has a prompt, a reference answer, automated checks and notes for the human evaluator.`,
      actions: h('a', { class: 'btn btn-primary', href: '#/evaluate' }, icon('pencil'), 'Evaluate'),
    }),
    h('div', { class: 'segmented', role: 'group', 'aria-label': 'Category' }, tabButtons),
    h('div', { class: 'filter-bar' }, h('div', { class: 'search-wrap' }, icon('search'), search), langSelect),
    listContainer,
  );
}

// ─────────────────────────────────── Case ───────────────────────────────────

function viewCase(id) {
  const c = getCase(id);
  if (!c) return viewNotFound();
  const cat = getCategory(c.category);
  const index = CASES.indexOf(c);
  const prev = CASES[index - 1];
  const next = CASES[index + 1];
  const evals = evaluationsFor(c.id);
  const focus = focusCriteria(c);

  const mainCol = [
    box('Prompt', 'list', h('pre', { class: 'prompt' }, c.prompt), { actions: copyButton(() => c.prompt, 'Copy prompt') }),
    h(
      'details',
      { class: 'panel details-box' },
      h(
        'summary',
        { class: 'panel-head' },
        h('h2', { class: 'panel-title' }, icon('book'), 'Reference answer'),
        h('span', { class: 'muted small' }, 'Hidden to avoid biasing your evaluation. Click to show.'),
      ),
      h('div', { class: 'panel-body' }, h('p', { class: 'reference' }, c.reference)),
    ),
    box(
      `Automated checks (${c.checks.length})`,
      'checkCircle',
      h('ul', { class: 'check-list' }, c.checks.map((ch) => h('li', {}, icon('dot'), describeCheck(ch)))),
    ),
    box(
      'What to look for',
      'pencil',
      frag(
        h('p', {}, c.notes),
        h(
          'p',
          { class: 'focus-line' },
          h('span', { class: 'muted' }, 'Focus criteria: '),
          focus.map((fid) => label(CRITERIA.find((cr) => cr.id === fid).name, 'accent')),
        ),
      ),
    ),
    h(
      'nav',
      { class: 'pager', 'aria-label': 'Case navigation' },
      prev ? h('a', { class: 'btn', href: buildHash('case', [prev.id]) }, icon('arrowLeft'), prev.id) : h('span'),
      next ? h('a', { class: 'btn', href: buildHash('case', [next.id]) }, next.id, icon('arrowRight')) : h('span'),
    ),
  ];

  const side = [
    h('a', { class: 'btn btn-primary btn-block', href: buildHash('evaluate', [], { case: c.id }) }, icon('pencil'), 'Evaluate this case'),
    h(
      'div',
      { class: 'side-section' },
      h('h2', { class: 'side-title' }, 'Details'),
      h(
        'dl',
        { class: 'meta-list' },
        h('dt', {}, 'Category'),
        h('dd', {}, categoryLabel(c.category)),
        h('dt', {}, 'Language'),
        h('dd', {}, LANGUAGES[c.lang]),
        h('dt', {}, 'Difficulty'),
        h('dd', {}, c.difficulty),
      ),
      h('p', { class: 'muted small' }, cat.description),
    ),
    h(
      'div',
      { class: 'side-section' },
      h('h2', { class: 'side-title' }, 'Your evaluations'),
      evals.length
        ? h(
            'ul',
            { class: 'side-list' },
            evals.map((e) =>
              h('li', {}, verdictLabel(e.verdict), h('a', { href: buildHash('evaluate', [], { edit: e.id }) }, e.model)),
            ),
          )
        : h('p', { class: 'muted' }, 'Not evaluated yet.'),
    ),
  ];

  return frag(
    pageHead(h('span', {}, c.title, ' ', h('span', { class: 'title-id' }, c.id)), {
      crumbs: [h('a', { href: '#/benchmark' }, 'Cases'), h('span', { 'aria-hidden': 'true' }, ' / '), h('a', { href: buildHash('benchmark', [], { cat: c.category }) }, cat.name)],
    }),
    layout(mainCol, side),
  );
}

// ───────────────────────────────── Evaluate ─────────────────────────────────

function viewEvaluate(query) {
  const editing = query.edit ? store.get(query.edit) : null;
  if (query.edit && !editing) {
    return blankslate('info', 'Evaluation not found', 'It may have been deleted.', [h('a', { class: 'btn', href: '#/results' }, 'Back to results')]);
  }
  const initialCase = getCase(editing?.caseId ?? query.case) ?? CASES[0];
  let current = initialCase;

  // Case picker
  const caseSelect = h(
    'select',
    { class: 'form-select', id: 'case-select', disabled: Boolean(editing), value: current.id },
    CATEGORIES.map((cat) =>
      h('optgroup', { label: cat.name }, CASES.filter((c) => c.category === cat.id).map((c) => h('option', { value: c.id }, `${c.id} · ${c.title}`))),
    ),
  );
  const promptPre = h('pre', { class: 'prompt' });
  const caseMeta = h('div', { class: 'row-meta' });

  // Response
  const knownModels = [...new Set(store.all().map((e) => e.model))].sort();
  const modelInput = h('input', {
    type: 'text',
    class: 'form-control',
    id: 'model',
    list: 'model-list',
    maxlength: '100',
    autocomplete: 'off',
    placeholder: 'e.g. the model name and version you used',
    value: editing?.model ?? query.model ?? prefGet(LAST_MODEL_KEY) ?? '',
  });
  const modelList = h('datalist', { id: 'model-list' }, knownModels.map((m) => h('option', { value: m })));
  const responseInput = h('textarea', {
    class: 'form-control textarea-response',
    id: 'response',
    rows: '10',
    maxlength: '50000',
    placeholder: 'Paste the model’s full response here, exactly as it was given.',
    value: editing?.response ?? '',
  });
  const responseStats = h('p', { class: 'note' });

  // Live checks
  const checksSummary = h('div', { class: 'checks-summary' });
  const checksList = h('ul', { class: 'check-results' });

  // Rubric
  const rubricState = {};
  const rubricContainer = h('div', { class: 'rubric' });
  const avgOut = h('strong', {}, '—');

  function renderRubric() {
    const focus = focusCriteria(current);
    rubricContainer.replaceChildren(
      ...CRITERIA.map((crit) => {
        const isFocus = focus.includes(crit.id);
        if (!(crit.id in rubricState)) {
          const saved = editing?.rubric?.[crit.id];
          rubricState[crit.id] = editing ? (saved == null ? 'na' : String(saved)) : isFocus ? '' : 'na';
        }
        const hint = h('p', { class: 'note anchor-hint' });
        const setHint = () => {
          const v = rubricState[crit.id];
          hint.textContent = v && v !== 'na' && crit.anchors[v]
            ? `${v}: ${crit.anchors[v]}`
            : v === 'na'
              ? 'Not applicable: excluded from the average.'
              : `1: ${crit.anchors[1]} · 5: ${crit.anchors[5]}`;
        };
        const options = ['1', '2', '3', '4', '5', 'na'].map((v) => {
          const input = h('input', {
            type: 'radio',
            name: `rubric-${crit.id}`,
            value: v,
            class: 'sr-only',
            checked: rubricState[crit.id] === v,
          });
          input.addEventListener('change', () => {
            rubricState[crit.id] = v;
            setHint();
            updateAverage();
          });
          const optionText = v === 'na' ? 'N/A' : v;
          return h('label', { class: 'radio-pill', title: v === 'na' ? 'Not applicable' : crit.anchors[v] ?? '' }, input, h('span', {}, optionText));
        });
        setHint();
        return h(
          'fieldset',
          { class: 'rubric-row' },
          h('legend', {}, crit.name, isFocus ? label('Focus', 'accent', 'tag--small') : null),
          h('p', { class: 'note' }, crit.description),
          h('div', { class: 'radio-group' }, options),
          hint,
        );
      }),
    );
    updateAverage();
  }

  function rubricValues() {
    const out = {};
    for (const crit of CRITERIA) {
      const v = rubricState[crit.id];
      out[crit.id] = v && v !== 'na' ? Number(v) : null;
    }
    return out;
  }

  function updateAverage() {
    avgOut.textContent = formatScore(rubricAverage(rubricValues()));
  }

  // Verdict
  let verdict = editing?.verdict ?? '';
  const verdictGroup = h(
    'div',
    { class: 'radio-group radio-group--wide' },
    VERDICTS.map((v) => {
      const input = h('input', { type: 'radio', name: 'verdict', value: v.id, class: 'sr-only', checked: verdict === v.id });
      input.addEventListener('change', () => {
        verdict = v.id;
      });
      return h('label', { class: `radio-pill radio-pill--${v.id}`, title: v.description }, input, h('span', {}, v.label));
    }),
  );
  const notesInput = h('textarea', {
    class: 'form-control',
    id: 'notes',
    rows: '3',
    maxlength: '5000',
    placeholder: 'Why this verdict? Note specific errors, broken constraints or fabricated details.',
    value: editing?.notes ?? '',
  });

  const errorBox = h('div', { class: 'form-errors', role: 'alert' });

  function updateCase() {
    promptPre.textContent = current.prompt;
    caseMeta.replaceChildren(
      h('a', { class: 'mono', href: buildHash('case', [current.id]) }, current.id),
      categoryLabel(current.category),
      langLabel(current.lang),
      h('span', {}, current.difficulty),
    );
    renderRubric();
    updateChecks();
  }

  function updateChecks() {
    const text = responseInput.value;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    responseStats.textContent = `${text.length.toLocaleString()} characters · ${wordCount.toLocaleString()} words`;
    if (!text.trim()) {
      checksSummary.replaceChildren(h('p', { class: 'muted' }, 'Paste a response to run the checks.'));
      checksList.replaceChildren(...current.checks.map((ch) => h('li', { class: 'check-pending' }, icon('dot'), h('span', {}, describeCheck(ch)))));
      return;
    }
    const { results, passed, total } = runChecks(current.checks, text);
    const rate = total ? passed / total : 0;
    checksSummary.replaceChildren(
      h('p', { class: 'checks-count' }, h('strong', {}, `${passed} / ${total}`), ' checks passed'),
      progressBar(rate, passed === total ? 'success' : passed === 0 ? 'danger' : 'attention'),
    );
    checksList.replaceChildren(
      ...results.map((r) =>
        h(
          'li',
          { class: r.pass ? 'check-pass' : 'check-fail' },
          icon(r.pass ? 'checkCircle' : 'xCircle'),
          h('span', {}, r.label, h('span', { class: 'check-detail' }, r.detail)),
        ),
      ),
    );
  }

  caseSelect.addEventListener('change', () => {
    current = getCase(caseSelect.value) ?? current;
    for (const key of Object.keys(rubricState)) delete rubricState[key];
    history.replaceState(null, '', buildHash('evaluate', [], { case: current.id }));
    updateCase();
  });
  responseInput.addEventListener('input', updateChecks);

  function collectErrors() {
    const errors = [];
    if (!modelInput.value.trim()) errors.push('Enter the model name.');
    if (!responseInput.value.trim()) errors.push('Paste the model response.');
    const missing = CRITERIA.filter((c) => !rubricState[c.id]).map((c) => c.name);
    if (missing.length) errors.push(`Score these criteria (or choose N/A): ${missing.join(', ')}.`);
    if (!verdict) errors.push('Choose a verdict: Pass, Partial or Fail.');
    return errors;
  }

  function save(goNext) {
    const errors = collectErrors();
    if (errors.length) {
      errorBox.replaceChildren(
        h('div', { class: 'notice notice-danger' }, icon('xCircle'), h('div', {}, h('strong', {}, 'Please fix the following:'), h('ul', {}, errors.map((e) => h('li', {}, e))))),
      );
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    errorBox.replaceChildren();
    const { passed, total } = runChecks(current.checks, responseInput.value);
    const now = new Date().toISOString();
    const record = {
      id: editing?.id ?? newId(),
      caseId: current.id,
      model: modelInput.value.trim(),
      response: responseInput.value,
      createdAt: editing?.createdAt ?? now,
      ...(editing ? { updatedAt: now } : {}),
      checks: { passed, total },
      rubric: rubricValues(),
      verdict,
      notes: notesInput.value.trim(),
    };
    try {
      if (editing) store.update(record);
      else store.add(record);
    } catch (err) {
      errorBox.replaceChildren(h('div', { class: 'notice notice-danger' }, icon('xCircle'), h('span', {}, `Could not save: ${err.message}`)));
      return;
    }
    prefSet(LAST_MODEL_KEY, record.model);
    if (goNext) {
      const done = new Set(store.all().filter((e) => e.model === record.model).map((e) => e.caseId));
      const start = CASES.indexOf(current);
      const nextCase = [...CASES.slice(start + 1), ...CASES.slice(0, start)].find((c) => !done.has(c.id));
      if (nextCase) {
        flash(`Saved ${current.id}. Next up: ${nextCase.id}.`);
        navigate(buildHash('evaluate', [], { case: nextCase.id, model: record.model }));
        return;
      }
      flash(`Saved. You have evaluated every case for ${record.model}.`);
    } else {
      flash(editing ? 'Evaluation updated.' : 'Evaluation saved.');
    }
    navigate('#/results');
  }

  const saveBtn = h('button', { type: 'button', class: 'btn btn-primary' }, icon('check'), editing ? 'Save changes' : 'Save');
  saveBtn.addEventListener('click', () => save(false));
  const nextBtn = editing ? null : h('button', { type: 'button', class: 'btn' }, 'Save & next case', icon('arrowRight'));
  nextBtn?.addEventListener('click', () => save(true));

  updateCase();

  const mainCol = [
    box(
      '1 · Case',
      'beaker',
      frag(
        h('label', { class: 'form-label', for: 'case-select' }, 'Test case'),
        caseSelect,
        caseMeta,
        h('div', { class: 'prompt-head' }, h('span', { class: 'form-label' }, 'Prompt'), copyButton(() => current.prompt, 'Copy prompt')),
        promptPre,
        h('p', { class: 'note' }, 'Copy the prompt into the model you are testing, in a fresh conversation, exactly as written.'),
      ),
    ),
    box(
      '2 · Model response',
      'list',
      frag(
        h('label', { class: 'form-label', for: 'model' }, 'Model'),
        modelInput,
        modelList,
        h('label', { class: 'form-label', for: 'response' }, 'Response'),
        responseInput,
        responseStats,
      ),
    ),
    box(
      '3 · Human evaluation',
      'law',
      frag(
        h('p', { class: 'note' }, 'Score each criterion from 1 (poor) to 5 (excellent), or N/A when it does not apply. Criteria marked Focus matter most for this case.'),
        rubricContainer,
        h('fieldset', { class: 'rubric-row' }, h('legend', {}, 'Verdict'), verdictGroup),
        h('label', { class: 'form-label', for: 'notes' }, 'Notes ', h('span', { class: 'muted' }, '(optional)')),
        notesInput,
      ),
    ),
    errorBox,
    h('div', { class: 'btn-row form-actions' }, saveBtn, nextBtn, h('a', { class: 'btn btn-invisible', href: editing ? '#/results' : '#/benchmark' }, 'Cancel')),
  ];

  const side = h(
    'div',
    { class: 'sticky' },
    box(
      'Automated checks',
      'checkCircle',
      frag(
        checksSummary,
        checksList,
        h('p', { class: 'note' }, 'Heuristic signals only. Always read the response yourself: a check can pass on a wrong answer or fail on a good one.'),
      ),
    ),
    h('div', { class: 'avg-box' }, h('span', { class: 'muted' }, 'Rubric average'), avgOut),
  );

  return frag(
    pageHead(editing ? 'Edit evaluation' : 'Evaluate a response', {
      subtitle: editing
        ? `Created ${formatDate(editing.createdAt)}.`
        : 'Run the prompt in any model, paste the answer, then judge it. Everything is saved only in this browser.',
    }),
    layout(mainCol, side),
  );
}

// ───────────────────────────────── Results ──────────────────────────────────

function importButton(onDone) {
  const input = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' });
  const btn = h('button', { type: 'button', class: 'btn' }, icon('upload'), 'Import JSON');
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showFlash('That file is larger than 10 MB.', 'danger');
      return;
    }
    const text = await file.text();
    const { valid, rejected, error } = parseImport(text, { caseIds: CASE_IDS });
    if (error) {
      showFlash(error, 'danger');
      return;
    }
    let result;
    try {
      result = store.importMany(valid);
    } catch (err) {
      showFlash(`Import failed: ${err.message}`, 'danger');
      return;
    }
    const parts = [`Imported ${result.added} evaluation${result.added === 1 ? '' : 's'}`];
    if (result.skipped) parts.push(`${result.skipped} already present`);
    if (rejected) parts.push(`${rejected} invalid record${rejected === 1 ? '' : 's'} ignored`);
    flash(`${parts.join(' · ')}.`, rejected ? 'warn' : 'success');
    onDone();
  });
  return frag(btn, input);
}

function viewResults(query) {
  const all = store.all();
  if (!all.length) {
    return frag(
      pageHead('Results'),
      h(
        'section',
        { class: 'panel' },
        h(
          'div',
          { class: 'panel-body' },
          blankslate(
            'graph',
            'No evaluations yet',
            'This app ships with no results. Everything that appears here is entered and judged by you, and stays in this browser.',
            [h('a', { class: 'btn btn-primary', href: '#/evaluate' }, icon('pencil'), 'Start evaluating'), importButton(render)],
          ),
        ),
      ),
      storageNote(),
    );
  }

  const models = [...new Set(all.map((e) => e.model))].sort((a, b) => a.localeCompare(b));
  const selected = models.includes(query.model) ? query.model : 'all';
  const filtered = selected === 'all' ? all : all.filter((e) => e.model === selected);

  const modelRows = summarizeByModel(all).map((s) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, h('a', { href: buildHash('results', [], { model: s.model }) }, s.model)),
      h('td', { class: 'num' }, s.count),
      h('td', { class: 'num' }, `${s.casesCovered} / ${CASES.length}`),
      h('td', {}, h('div', { class: 'cell-bar' }, h('span', { class: 'num' }, formatPercent(s.checkRate)), progressBar(s.checkRate))),
      h('td', { class: 'num' }, formatScore(s.rubricAvg)),
      h('td', {}, h('span', { class: 'verdict-counts' }, label(`${s.verdicts.pass} pass`, 'success'), label(`${s.verdicts.partial} partial`, 'attention'), label(`${s.verdicts.fail} fail`, 'danger'))),
    ),
  );

  const catRows = summarizeByCategory(filtered, CASES, CATEGORIES).map((s) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, categoryLabel(s.category)),
      h('td', { class: 'num' }, s.count),
      h('td', { class: 'num' }, `${s.casesCovered} / ${CASES.filter((c) => c.category === s.category).length}`),
      h('td', {}, h('div', { class: 'cell-bar' }, h('span', { class: 'num' }, formatPercent(s.checkRate)), progressBar(s.checkRate))),
      h('td', { class: 'num' }, formatScore(s.rubricAvg)),
      h('td', {}, h('span', { class: 'verdict-counts' }, label(`${s.verdicts.pass}`, 'success'), label(`${s.verdicts.partial}`, 'attention'), label(`${s.verdicts.fail}`, 'danger'))),
    ),
  );

  const modelFilter = h(
    'select',
    { class: 'form-select form-select--sm', 'aria-label': 'Filter by model', value: selected },
    h('option', { value: 'all' }, 'All models'),
    models.map((m) => h('option', { value: m }, m)),
  );
  modelFilter.addEventListener('change', () => navigate(buildHash('results', [], { model: modelFilter.value === 'all' ? '' : modelFilter.value })));

  const evalRows = [...filtered]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((e) => {
      const c = getCase(e.caseId);
      const del = h('button', { type: 'button', class: 'btn btn-sm btn-danger-outline', 'aria-label': `Delete evaluation of ${e.caseId} by ${e.model}` }, icon('trash'));
      del.addEventListener('click', () => {
        if (confirm(`Delete the evaluation of ${e.caseId} for "${e.model}"?`)) {
          store.remove(e.id);
          flash('Evaluation deleted.');
          render();
        }
      });
      return h(
        'tr',
        {},
        h('td', { class: 'nowrap muted' }, formatDate(e.createdAt)),
        h('td', {}, h('a', { class: 'mono', href: buildHash('case', [e.caseId]) }, e.caseId), ' ', h('span', { class: 'muted' }, c?.title ?? '')),
        h('td', {}, e.model),
        h('td', { class: 'num' }, `${e.checks.passed}/${e.checks.total}`),
        h('td', { class: 'num' }, formatScore(rubricAverage(e.rubric))),
        h('td', {}, verdictLabel(e.verdict)),
        h('td', { class: 'actions' }, h('a', { class: 'btn btn-sm', href: buildHash('evaluate', [], { edit: e.id }), 'aria-label': `Edit evaluation of ${e.caseId} by ${e.model}` }, icon('pencil')), del),
      );
    });

  const exportJson = h('button', { type: 'button', class: 'btn' }, icon('download'), 'JSON');
  exportJson.addEventListener('click', () => download(`llm-eval-results-${new Date().toISOString().slice(0, 10)}.json`, toJSON(store.all()), 'application/json'));
  const exportCsv = h('button', { type: 'button', class: 'btn' }, icon('download'), 'CSV');
  exportCsv.addEventListener('click', () => download(`llm-eval-results-${new Date().toISOString().slice(0, 10)}.csv`, `﻿${toCSV(store.all(), CASES)}`, 'text/csv;charset=utf-8'));
  const clearAll = h('button', { type: 'button', class: 'btn btn-danger-outline' }, icon('trash'), 'Delete all');
  clearAll.addEventListener('click', () => {
    const n = store.all().length;
    if (confirm(`Delete all ${n} evaluations stored in this browser? This cannot be undone. Export them first if you want a backup.`)) {
      store.clear();
      flash('All evaluations deleted.');
      render();
    }
  });

  const table = (head, rows) =>
    h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, head.map((t) => h('th', { scope: 'col' }, t)))), h('tbody', {}, rows)));

  return frag(
    pageHead('Results', {
      subtitle: `${all.length} evaluation${all.length === 1 ? '' : 's'} across ${models.length} model${models.length === 1 ? '' : 's'}, entered in this browser.`,
      actions: [exportJson, exportCsv, importButton(render), clearAll],
    }),
    box('By model', 'graph', table(['Model', 'Evaluations', 'Cases covered', 'Checks passed', 'Rubric avg (1–5)', 'Verdicts'], modelRows), { flush: true }),
    box(
      'By category',
      'beaker',
      table(['Category', 'Evaluations', 'Cases covered', 'Checks passed', 'Rubric avg (1–5)', 'Pass / Partial / Fail'], catRows),
      { flush: true, actions: modelFilter },
    ),
    box(
      `Evaluations (${filtered.length})`,
      'list',
      table(['Date', 'Case', 'Model', 'Checks', 'Rubric', 'Verdict', ''], evalRows),
      { flush: true },
    ),
    h(
      'p',
      { class: 'note' },
      icon('info'),
      ' These numbers summarise your own manual evaluations. Small samples from a single evaluator are not statistically meaningful; treat them as notes, not as a leaderboard.',
    ),
    storageNote(),
  );
}

function storageNote() {
  return store.persistent
    ? null
    : h('div', { class: 'notice notice-warn' }, icon('info'), h('span', {}, 'Browser storage is unavailable, so evaluations are kept only until you close this tab. Export them to keep a copy.'));
}

// ────────────────────────────── Rubric & About ──────────────────────────────

function viewRubric() {
  const criteriaTable = h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'data-table data-table--top' },
      h('thead', {}, h('tr', {}, ['Criterion', '1 · Poor', '3 · Acceptable', '5 · Excellent'].map((t) => h('th', { scope: 'col' }, t)))),
      h(
        'tbody',
        {},
        CRITERIA.map((c) =>
          h('tr', {}, h('th', { scope: 'row' }, h('strong', {}, c.name), h('p', { class: 'note' }, c.description)), h('td', {}, c.anchors[1]), h('td', {}, c.anchors[3]), h('td', {}, c.anchors[5])),
        ),
      ),
    ),
  );

  const focusTable = h(
    'ul',
    { class: 'plain-list' },
    CATEGORIES.map((cat) =>
      h(
        'li',
        {},
        categoryLabel(cat.id),
        ' → ',
        focusCriteria({ category: cat.id, lang: 'en' }).map((id) => CRITERIA.find((c) => c.id === id).name).join(', '),
      ),
    ),
    h('li', {}, langLabel('pt'), ' → Portuguese cases always add Language quality (European Portuguese, not Brazilian).'),
  );

  const checkTypes = [
    ['Text match', 'Looks for (or rules out) required words, accent- and case-insensitive.'],
    ['Pattern', 'Regular expressions for exact formats, e.g. "Reply is exactly YES".'],
    ['Length & structure', 'Counts words, lines, sentences, bullet points and numbered items.'],
    ['JSON', 'Checks that the output parses as JSON and has exactly the requested keys.'],
    ['Number', 'Finds the expected number, accepting both 1,000.5 and 1.000,5 formats.'],
    ['Abstention', 'Detects phrases that admit uncertainty ("I can’t verify", "não conheço…"). Used on hallucination traps.'],
  ];

  return frag(
    pageHead('Rubric & methodology', { subtitle: 'How responses are judged, and what the numbers can and cannot tell you.' }),
    box('Human rubric', 'law', frag(h('p', {}, 'Each response is scored from 1 to 5 on five criteria. Scores of 2 and 4 sit between the anchors. Choose N/A when a criterion does not apply; it is then left out of the average.'), criteriaTable), {}),
    box('Verdict', 'checkCircle', h('ul', { class: 'plain-list' }, VERDICTS.map((v) => h('li', {}, verdictLabel(v.id), ' ', v.description)))),
    box('Focus criteria by category', 'beaker', focusTable),
    box(
      'Automated checks',
      'code',
      frag(
        h('p', {}, 'Every case has one to three deterministic checks. The test suite confirms that each reference answer passes all of its own checks.'),
        h('dl', { class: 'def-list' }, checkTypes.map(([t, d]) => frag(h('dt', {}, t), h('dd', {}, d)))),
      ),
    ),
    box(
      'Methodology & limitations',
      'info',
      h(
        'ul',
        { class: 'bullets' },
        h('li', {}, 'Responses are entered manually. The app never calls a model, so results depend on how faithfully each response is copied.'),
        h('li', {}, 'Automated checks are heuristics. They catch format errors and obvious misses but cannot judge meaning; the human rubric decides.'),
        h('li', {}, 'Scores come from a single human evaluator and are subjective. Use the anchors and write notes to stay consistent.'),
        h('li', {}, `${CASES.length} cases is a small sample. Treat differences between models as hints, not conclusions.`),
        h('li', {}, 'Models change over time. Record the exact model name and version, and run each prompt in a fresh conversation.'),
        h('li', {}, 'The cases were written for practice and have not been validated as a research benchmark.'),
      ),
    ),
  );
}

function viewAbout() {
  return frag(
    pageHead('About'),
    layout(
      [
        box(
          'About this project',
          'book',
          h(
            'div',
            { class: 'markdown' },
            h('p', {}, 'LLM Evaluation Benchmark is a small, early-stage personal project by Victor Ferreira, built to practise evaluating AI responses: factual accuracy, hallucinations, instruction following and reasoning.'),
            h('p', {}, 'It was built with AI coding assistance (Claude Code). The test cases, checks and rubric are a learning exercise, not a validated research benchmark.'),
            h('p', {}, 'The app deliberately ships with no demo results. Every evaluation is entered and judged manually by whoever uses it.'),
            h('h2', {}, 'Privacy'),
            h('p', {}, 'There are no accounts, cookies, analytics or API calls. Evaluations are stored only in your browser’s localStorage, and you can export or delete them at any time.'),
            h('h2', {}, 'Built with'),
            h('ul', {}, h('li', {}, 'Plain HTML, CSS and JavaScript modules, with no build step and no dependencies'), h('li', {}, 'Node.js built-in test runner for the unit tests'), h('li', {}, 'GitHub Actions and GitHub Pages for CI and hosting')),
          ),
        ),
      ],
      [
        h(
          'div',
          { class: 'side-section' },
          h('h2', { class: 'side-title' }, 'Links'),
          h(
            'ul',
            { class: 'side-list' },
            h('li', {}, icon('code'), h('a', { href: REPO_URL, rel: 'noopener' }, 'Source code')),
            h('li', {}, icon('info'), h('a', { href: `${REPO_URL}/issues`, rel: 'noopener' }, 'Report an issue')),
            h('li', {}, icon('shield'), h('a', { href: `${REPO_URL}/blob/main/LICENSE`, rel: 'noopener' }, 'MIT licence')),
          ),
        ),
        h('div', { class: 'side-section' }, h('h2', { class: 'side-title' }, 'Status'), label('Early stage', 'attention'), h('p', { class: 'muted small' }, 'Version 0.1.0')),
      ],
    ),
  );
}

function viewNotFound() {
  return h(
    'section',
    { class: 'panel' },
    h('div', { class: 'panel-body' }, blankslate('search', 'Page not found', 'That page does not exist.', [h('a', { class: 'btn', href: '#/' }, 'Go to the overview')])),
  );
}

// ────────────────────────────────── Router ──────────────────────────────────

const TITLES = {
  overview: 'Overview',
  benchmark: 'Cases',
  case: 'Case',
  evaluate: 'Evaluate',
  results: 'Results',
  rubric: 'Rubric',
  about: 'About',
};

const NAV_ROUTE = { case: 'benchmark' };

function render() {
  const { route, params, query } = parseHash(location.hash);
  let view;
  switch (route) {
    case 'overview':
      view = viewOverview();
      break;
    case 'benchmark':
      view = viewBenchmark(query);
      break;
    case 'case':
      view = viewCase(params[0]);
      break;
    case 'evaluate':
      view = viewEvaluate(query);
      break;
    case 'results':
      view = viewResults(query);
      break;
    case 'rubric':
      view = viewRubric();
      break;
    case 'about':
      view = viewAbout();
      break;
    default:
      view = viewNotFound();
  }

  main.replaceChildren(view);

  const active = NAV_ROUTE[route] ?? route;
  for (const link of document.querySelectorAll('.topnav-item')) {
    if (link.dataset.route === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const resultsCounter = document.getElementById('count-results');
  if (resultsCounter) {
    const n = store.all().length;
    resultsCounter.textContent = String(n);
    resultsCounter.hidden = n === 0;
  }

  const caseTitle = route === 'case' ? getCase(params[0])?.id : null;
  document.title = `${caseTitle ?? TITLES[route] ?? 'Not found'} · LLM Evaluation Benchmark`;

  if (pendingFlash) {
    showFlash(pendingFlash.message, pendingFlash.kind);
    pendingFlash = null;
  } else {
    flashRegion.replaceChildren();
  }
  window.scrollTo(0, 0);
}

function onHashChange() {
  if (!isAppHash(location.hash)) return; // e.g. the "Skip to content" link
  render();
  main.querySelector('.page-title')?.focus({ preventScroll: true });
}

function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const modes = ['auto', 'light', 'dark'];
  const names = { auto: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' };
  const icons = { auto: 'auto', light: 'sun', dark: 'moon' };
  const apply = (mode) => {
    if (mode === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    btn.replaceChildren(icon(icons[mode]));
    btn.setAttribute('aria-label', `${names[mode]} (click to change)`);
    btn.title = names[mode];
  };
  let mode = modes.includes(prefGet('leb.theme')) ? prefGet('leb.theme') : 'auto';
  apply(mode);
  btn.addEventListener('click', () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    prefSet('leb.theme', mode);
    apply(mode);
  });
}

function initNavIcons() {
  for (const el of document.querySelectorAll('[data-icon]')) el.prepend(icon(el.dataset.icon));
}

initNavIcons();
initTheme();
window.addEventListener('hashchange', onHashChange);
render();
