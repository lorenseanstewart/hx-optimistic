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

      setOptimisticStateClass(targetElt, 'error');
      this.showError(targetElt, config, evt);

      if (config.delay > 0) {
        setTimeout(() => this.revert(targetElt, currentToken), config.delay);
      }
    },

    snapshot: function (targetElt, sourceElt, config, token) {
      const snapshotData = {
        innerHTML: targetElt.innerHTML,
        className: targetElt.className,
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
          const content = interpolateTemplate(template, sourceElt);
          if (config.swap === 'beforeend') {
            optimisticTarget.insertAdjacentHTML('beforeend', content);
          } else if (config.swap === 'afterbegin') {
            optimisticTarget.insertAdjacentHTML('afterbegin', content);
          } else {
            optimisticTarget.innerHTML = content;
            processWithHtmxIfAvailable(optimisticTarget);
          }
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
          const errorData = {
            status: evt.detail?.xhr?.status || 0,
            statusText: evt.detail?.xhr?.statusText || 'Network Error',
            error: evt.detail?.error || 'Request failed',
          };
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
      snapshots.delete(targetElt);
      tokens.delete(targetElt);
      this.cleanup(targetElt);
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

