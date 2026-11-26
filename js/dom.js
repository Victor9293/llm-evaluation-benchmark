// Minimal DOM helper. User-provided text is always inserted as text nodes, never as HTML.

const PROPERTY_KEYS = new Set(['value', 'checked', 'selected', 'disabled', 'open']);

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  const deferred = [];
  for (const [key, val] of Object.entries(props ?? {})) {
    if (val === null || val === undefined || val === false) continue;
    if (key === 'class') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key === 'svg') el.innerHTML = val; // trusted, static icon markup only
    else if (PROPERTY_KEYS.has(key)) deferred.push([key, val]);
    else el.setAttribute(key, val === true ? '' : String(val));
  }
  appendChildren(el, children);
  for (const [key, val] of deferred) el[key] = val;
  return el;
}

export function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function frag(...children) {
  return appendChildren(document.createDocumentFragment(), children);
}
