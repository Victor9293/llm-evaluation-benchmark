// Tiny hash router: "#/case/FA-01?x=1" -> { route: 'case', params: ['FA-01'], query: { x: '1' } }

export const ROUTES = ['overview', 'benchmark', 'case', 'evaluate', 'results', 'rubric', 'about'];

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function parseHash(hash) {
  const raw = String(hash ?? '').replace(/^#\/?/, '');
  const qIndex = raw.indexOf('?');
  const pathPart = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const queryPart = qIndex === -1 ? '' : raw.slice(qIndex + 1);
  const segments = pathPart.split('/').filter(Boolean).map(safeDecode);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { route: segments[0] ?? 'overview', params: segments.slice(1), query };
}

export function buildHash(route, params = [], query = {}) {
  const path = route === 'overview' ? '' : [route, ...params].map(encodeURIComponent).join('/');
  const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const qs = entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
  return `#/${path}${qs}`;
}

/** App routes always start with "#/". Plain anchors like "#main" are left to the browser. */
export function isAppHash(hash) {
  return hash === '' || hash === '#' || String(hash).startsWith('#/');
}
