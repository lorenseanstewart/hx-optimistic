import { CLASS_OPTIMISTIC, CLASS_ERROR, CLASS_REVERTING, DATASET_OPTIMISTIC_KEY } from './constants.js';

export function findClosestInAncestorSubtrees(startElt, selector) {
  let node = startElt;
  while (node) {
    const match = node.querySelector(selector);
    if (match) return match;
    node = node.parentElement;
  }
  return null;
}

export function interpolateTemplate(str, sourceElt, data = {}) {
  if (typeof str !== 'string') return str;
  return str.replace(/\${([^}]+)}/g, (match, expr) => {
    expr = expr.trim();
    if (data[expr] !== undefined) {
      return data[expr];
    }
    if (!sourceElt) return match;
    if (expr === 'this.value') {
      if (sourceElt.value !== undefined) return sourceElt.value;
      if (sourceElt.tagName === 'FORM') {
        const input = sourceElt.querySelector('input, textarea, select');
        if (input?.value) return input.value;
      }
    }
    if (sourceElt.tagName === 'FORM') {
      const selectors = {
        textarea: 'textarea',
        email: 'input[type="email"]',
        password: 'input[type="password"]',
        text: 'input[type="text"], input:not([type])',
        url: 'input[type="url"]',
        tel: 'input[type="tel"]',
        search: 'input[type="search"]',
      };
      const selector = selectors[expr] || `[name="${expr}"]`;
      const field = sourceElt.querySelector(selector);
      if (field?.value) return field.value;
    }
    if (expr === 'this.textContent') return sourceElt.textContent || match;
    if (expr.startsWith('this.dataset.')) {
      const key = expr.slice(13);
      return sourceElt.dataset[key] || match;
    }
    if (expr.startsWith('data:')) {
      const key = expr.slice(5);
      const camelKey = key.replace(/-([a-z])/g, (m, l) => l.toUpperCase());
      return sourceElt.dataset[camelKey] || match;
    }
    if (expr.startsWith('attr:')) {
      const name = expr.slice(5);
      return sourceElt.getAttribute(name) || match;
    }
    if (expr.includes('.') || expr.includes(':')) {
      console.warn(
        `[hx-optimistic] Unresolved interpolation pattern: \${${expr}}`,
        '\nSupported patterns:',
        '\n  ${this.value} - element value',
        '\n  ${this.textContent} - element text content',
        '\n  ${this.dataset.key} - data attribute',
        '\n  ${data:key} - data attribute shorthand',
        '\n  ${attr:name} - any attribute',
        '\n  ${textarea}, ${email}, ${password}, etc. - form field by type',
        '\n  ${fieldName} - form field by name',
        '\n  ${status}, ${statusText}, ${error} - error context',
        '\nSee documentation for details.'
      );
    }
    return match;
  });
}

export function resolveTargetChain(sourceElt, targetSelector) {
  if (!targetSelector || targetSelector === 'this') {
    return sourceElt;
  }
  const selector = String(targetSelector).trim();
  const ops = selector.split(/\s+/);
  if (['closest', 'find', 'next', 'previous'].some((op) => selector.startsWith(op))) {
    let context = sourceElt;
    for (let i = 0; i < ops.length; ) {
      const op = ops[i++];
      const sel = ops[i++] || '';
      if (op === 'closest') {
        let candidate = context ? context.closest(sel) : null;
        if (!candidate) {
          candidate = findClosestInAncestorSubtrees(context, sel);
        }
        context = candidate;
        if (!context) return null;
      } else if (op === 'find') {
        if (!context) return null;
        let found = context.querySelector(sel);
        if (!found) {
          let ancestor = context.parentElement;
          while (ancestor && !found) {
            found = ancestor.querySelector(sel);
            if (found) break;
            ancestor = ancestor.parentElement;
          }
        }
        context = found || null;
        if (!context) return null;
      } else if (op === 'next') {
        if (!context) return null;
        let next = context.nextElementSibling;
        let match = null;
        while (next) {
          if (next.matches(sel)) {
            match = next;
            break;
          }
          next = next.nextElementSibling;
        }
        context = match;
        if (!context) return null;
      } else if (op === 'previous') {
        if (!context) return null;
        let prev = context.previousElementSibling;
        let match = null;
        while (prev) {
          if (prev.matches(sel)) {
            match = prev;
            break;
          }
          prev = prev.previousElementSibling;
        }
        context = match;
        if (!context) return null;
      } else {
        return null;
      }
    }
    return context;
  }
  return document.querySelector(selector);
}

export function setOptimisticStateClass(target, state) {
  if (!target?.classList) return;
  target.classList.remove(CLASS_OPTIMISTIC, CLASS_ERROR, CLASS_REVERTING);
  if (state === 'optimistic') target.classList.add(CLASS_OPTIMISTIC);
  else if (state === 'error') target.classList.add(CLASS_ERROR);
  else if (state === 'reverting') target.classList.add(CLASS_REVERTING);
}

export function hasOptimisticConfig(element) {
  return Boolean(element?.dataset?.[DATASET_OPTIMISTIC_KEY]);
}

export function getTargetFor(sourceElt) {
  const targetSelector = sourceElt.getAttribute('hx-target');
  if (!targetSelector) return sourceElt;
  return resolveTargetChain(sourceElt, targetSelector);
}

export function getNextToken(targetElt, tokenMap) {
  const currentToken = tokenMap.get(targetElt) || 0;
  const newToken = currentToken + 1;
  tokenMap.set(targetElt, newToken);
  return newToken;
}

export function processWithHtmxIfAvailable(element) {
  if (typeof htmx !== 'undefined' && typeof htmx.process === 'function') {
    htmx.process(element);
  }
}

export function removeOptimisticDatasetAttributes(target) {
  if (!target?.dataset) return;
  Object.keys(target.dataset)
    .filter((key) => key.startsWith('hxOptimistic'))
    .forEach((key) => delete target.dataset[key]);
}

export function addCustomOptimisticClass(target, config) {
  if (config && config.class && target?.classList) {
    target.classList.add(config.class);
  }
}

export function removeCustomOptimisticClass(target, config) {
  if (config && config.class && target?.classList) {
    target.classList.remove(config.class);
  }
}

