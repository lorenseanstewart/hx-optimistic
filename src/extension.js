import {
  interpolateTemplate,
  resolveTargetChain,
  setOptimisticStateClass,
  hasOptimisticConfig,
  getTargetFor,
  getNextToken,
  processWithHtmxIfAvailable,
  removeOptimisticDatasetAttributes,
  addCustomOptimisticClass,
  removeCustomOptimisticClass,
} from './utils.js';
import { getOptimisticConfig } from './config.js';

export function createExtension(htmx) {
  const configCache = new WeakMap();
  const snapshots = new WeakMap();
  const tokens = new WeakMap();
  const sourceTargets = new WeakMap();

  return {
    onEvent: function (name, evt) {
      if (name === 'htmx:beforeRequest') {
        this.handleBeforeRequest(evt);
      } else if (
        ['htmx:responseError', 'htmx:swapError', 'htmx:timeout', 'htmx:sendError'].includes(name)
      ) {
        this.handleError(evt);
      } else if (name === 'htmx:afterSwap') {
        this.cleanup(evt.target);
      }
    },

    handleBeforeRequest: function (evt) {
      const sourceElt = evt.target;
      if (!hasOptimisticConfig(sourceElt)) return;

      const config = getOptimisticConfig(sourceElt, configCache);
      if (!config) return;

      const targetElt = getTargetFor(sourceElt);
      if (!targetElt) {
        console.warn('[hx-optimistic] Target element not found for:', sourceElt);
        return;
      }
      sourceTargets.set(sourceElt, targetElt);

      const newToken = getNextToken(targetElt, tokens);

      this.snapshot(targetElt, sourceElt, config, newToken);
      this.applyOptimistic(targetElt, sourceElt, config);
      setOptimisticStateClass(targetElt, 'optimistic');
      addCustomOptimisticClass(targetElt, config);
      try { htmx.trigger && htmx.trigger(targetElt, 'optimistic:applied', { config }); } catch (_) {}
    },

    handleError: function (evt) {
      const sourceElt = evt.detail?.elt || evt.target;
      const targetSelector = sourceElt?.getAttribute('hx-target');
      const targetElt = (targetSelector ? resolveTargetChain(sourceElt, targetSelector) : null) ||
        sourceTargets.get(sourceElt) || sourceElt;
      if (!targetElt) return;

      const snapshot = snapshots.get(targetElt);
      const config = snapshot?.config || getOptimisticConfig(sourceElt, configCache);
      if (!config) return;

      const currentToken = tokens.get(targetElt);
      if (snapshot && snapshot.token !== currentToken) return;

      const active = document.activeElement;
      if (active && targetElt.contains(active)) {
        const existing = snapshots.get(targetElt) || { config, token: currentToken };
        existing.focusRestore = active;
        snapshots.set(targetElt, existing);
      }

      setOptimisticStateClass(targetElt, 'error');
      this.showError(targetElt, config, evt);
      try {
        const errorData = {
          status: evt.detail?.xhr?.status || 0,
          statusText: evt.detail?.xhr?.statusText || 'Network Error',
          error: evt.detail?.error || 'Request failed',
        };
        htmx.trigger && htmx.trigger(targetElt, 'optimistic:error', { config, detail: errorData });
      } catch (_) {}

      if (config.delay > 0) {
        setTimeout(() => this.revert(targetElt, currentToken), config.delay);
      }
    },

    snapshot: function (targetElt, sourceElt, config, token) {
      const attributes = Array.from(targetElt.attributes).reduce((acc, { name, value }) => { acc[name] = value; return acc; }, {});
      const dataset = { ...targetElt.dataset };
      const pickKeys = Array.isArray(config.snapshot) && config.snapshot.length > 0 ? config.snapshot : ['innerHTML', 'className'];
      const granular = {};
      pickKeys.forEach((k) => {
        if (k === 'textContent') granular.textContent = targetElt.textContent;
        else if (k === 'innerHTML') granular.innerHTML = targetElt.innerHTML;
        else if (k === 'className') granular.className = targetElt.className;
        else if (k.startsWith('data-')) granular[k] = targetElt.dataset[k.slice(5)];
        else if (k in targetElt) granular[k] = targetElt[k];
      });
      const snapshotData = {
        innerHTML: targetElt.innerHTML,
        className: targetElt.className,
        attributes,
        dataset,
        granular,
        config: config,
        token: token,
      };
      snapshots.set(targetElt, snapshotData);
    },

    applyOptimistic: function (targetElt, sourceElt, config) {
      let optimisticTarget = targetElt;
      if (config.target) {
        const resolved = resolveTargetChain(sourceElt, config.target);
        if (resolved) optimisticTarget = resolved;
      }
      if (config.template) {
        const template = this.getTemplate(config.template);
        if (template) {
          const context = (config && typeof config.context === 'object') ? config.context : {};
          const content = interpolateTemplate(template, sourceElt, context);
          if (config.swap === 'beforeend') {
            optimisticTarget.insertAdjacentHTML('beforeend', content);
          } else if (config.swap === 'afterbegin') {
            optimisticTarget.insertAdjacentHTML('afterbegin', content);
          } else {
            optimisticTarget.innerHTML = content;
            processWithHtmxIfAvailable(optimisticTarget);
          }
        } else if (typeof config.template === 'string' && config.template.startsWith('#')) {
          console.warn('[hx-optimistic] Template selector did not resolve:', config.template);
        }
      } else if (config.values) {
        this.applyValues(optimisticTarget, config.values, sourceElt);
      }
    },

    showError: function (targetElt, config, evt) {
      if (targetElt.dataset.hxOptimisticErrorShown) return;
      targetElt.dataset.hxOptimisticErrorShown = 'true';
      if (config.errorTemplate) {
        const template = this.getTemplate(config.errorTemplate);
        if (template) {
          const base = (config && typeof config.context === 'object') ? config.context : {};
          const errorData = Object.assign({}, base, {
            status: evt.detail?.xhr?.status || 0,
            statusText: evt.detail?.xhr?.statusText || 'Network Error',
            error: evt.detail?.error || 'Request failed',
          });
          const source = evt.detail?.elt || evt.target;
          const content = interpolateTemplate(template, source, errorData);
          if (config.errorMode === 'append') {
            const errorEl = document.createElement('div');
            errorEl.className = 'hx-optimistic-error-message';
            errorEl.innerHTML = content;
            targetElt.appendChild(errorEl);
          } else {
            targetElt.innerHTML = content;
          }
        } else if (typeof config.errorTemplate === 'string' && config.errorTemplate.startsWith('#')) {
          console.warn('[hx-optimistic] Error template selector did not resolve:', config.errorTemplate);
        }
      } else if (config.errorMessage) {
        if (config.errorMode === 'append') {
          const errorEl = document.createElement('div');
          errorEl.className = 'hx-optimistic-error-message';
          errorEl.textContent = config.errorMessage;
          targetElt.appendChild(errorEl);
        } else {
          targetElt.textContent = config.errorMessage;
        }
      }
    },

    revert: function (targetElt, expectedToken) {
      const snapshot = snapshots.get(targetElt);
      if (!snapshot) return;
      if (expectedToken !== undefined && snapshot.token !== expectedToken) return;
      setOptimisticStateClass(targetElt, 'reverting');
      if (snapshot.innerHTML !== undefined) targetElt.innerHTML = snapshot.innerHTML;
      if (snapshot.className !== undefined) targetElt.className = snapshot.className;
      try {
        Array.from(targetElt.getAttributeNames()).forEach((n) => targetElt.removeAttribute(n));
        Object.entries(snapshot.attributes || {}).forEach(([n, v]) => targetElt.setAttribute(n, v));
      } catch (_) {}
      try {
        Object.keys(targetElt.dataset || {}).forEach((k) => delete targetElt.dataset[k]);
        Object.assign(targetElt.dataset, snapshot.dataset || {});
      } catch (_) {}
      snapshots.delete(targetElt);
      tokens.delete(targetElt);
      this.cleanup(targetElt);
      const cfg = snapshot.config;
      if (cfg && cfg.reprocessOnRevert) {
        processWithHtmxIfAvailable(targetElt);
      }
      const toFocus = snapshot.focusRestore;
      if (toFocus && document.contains(toFocus)) {
        try { toFocus.focus(); } catch (_) {}
      }
      try { htmx.trigger && htmx.trigger(targetElt, 'optimistic:reverted', { config: snapshot.config }); } catch (_) {}
    },

    cleanup: function (target) {
      if (!target) return;
      setOptimisticStateClass(target, 'clean');
      target.querySelectorAll('.hx-optimistic-error-message').forEach((msg) => msg.remove());
      removeOptimisticDatasetAttributes(target);
      const snap = snapshots.get(target);
      if (snap && snap.config && snap.config.class) {
        removeCustomOptimisticClass(target, snap.config);
      }
      if (snap) snapshots.delete(target);
    },

    getTemplate: function (templateId) {
      if (templateId.startsWith('#')) {
        const template = document.querySelector(templateId);
        return template ? template.innerHTML : null;
      }
      return templateId;
    },

    applyValues: function (targetElt, values, sourceElt) {
      Object.entries(values).forEach(([key, value]) => {
        const evaluated = interpolateTemplate(value, sourceElt);
        if (key === 'textContent') targetElt.textContent = evaluated;
        else if (key === 'innerHTML') targetElt.innerHTML = evaluated;
        else if (key === 'className') targetElt.className = evaluated;
        else if (key.startsWith('data-')) targetElt.dataset[key.slice(5)] = evaluated;
        else targetElt[key] = evaluated;
      });
    },
  };
}

