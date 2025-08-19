(() => {
  // src/constants.js
  var CLASS_OPTIMISTIC = "hx-optimistic";
  var CLASS_ERROR = "hx-optimistic-error";
  var CLASS_REVERTING = "hx-optimistic-reverting";
  var DATASET_OPTIMISTIC_KEY = "optimistic";

  // src/utils.js
  function findClosestInAncestorSubtrees(startElt, selector) {
    let node = startElt;
    while (node) {
      const match = node.querySelector(selector);
      if (match) return match;
      node = node.parentElement;
    }
    return null;
  }
  function interpolateTemplate(str, sourceElt, data = {}) {
    if (typeof str !== "string") return str;
    return str.replace(/\${([^}]+)}/g, (match, expr) => {
      expr = expr.trim();
      if (data[expr] !== void 0) {
        return data[expr];
      }
      if (!sourceElt) return match;
      if (expr === "this.value") {
        if (sourceElt.value !== void 0) return sourceElt.value;
        if (sourceElt.tagName === "FORM") {
          const input = sourceElt.querySelector("input, textarea, select");
          if (input?.value) return input.value;
        }
      }
      if (sourceElt.tagName === "FORM") {
        const selectors = {
          textarea: "textarea",
          email: 'input[type="email"]',
          password: 'input[type="password"]',
          text: 'input[type="text"], input:not([type])',
          url: 'input[type="url"]',
          tel: 'input[type="tel"]',
          search: 'input[type="search"]'
        };
        const selector = selectors[expr] || `[name="${expr}"]`;
        const field = sourceElt.querySelector(selector);
        if (field?.value) return field.value;
      }
      if (expr === "this.textContent") return sourceElt.textContent || match;
      if (expr.startsWith("this.dataset.")) {
        const key = expr.slice(13);
        return sourceElt.dataset[key] || match;
      }
      if (expr.startsWith("data:")) {
        const key = expr.slice(5);
        const camelKey = key.replace(/-([a-z])/g, (m, l) => l.toUpperCase());
        return sourceElt.dataset[camelKey] || match;
      }
      if (expr.startsWith("attr:")) {
        const name = expr.slice(5);
        return sourceElt.getAttribute(name) || match;
      }
      if (expr.includes(".") || expr.includes(":")) {
        console.warn(
          `[hx-optimistic] Unresolved interpolation pattern: \${${expr}}`,
          "\nSupported patterns:",
          "\n  ${this.value} - element value",
          "\n  ${this.textContent} - element text content",
          "\n  ${this.dataset.key} - data attribute",
          "\n  ${data:key} - data attribute shorthand",
          "\n  ${attr:name} - any attribute",
          "\n  ${textarea}, ${email}, ${password}, etc. - form field by type",
          "\n  ${fieldName} - form field by name",
          "\n  ${status}, ${statusText}, ${error} - error context",
          "\nSee documentation for details."
        );
      }
      return match;
    });
  }
  function resolveTargetChain(sourceElt, targetSelector) {
    if (!targetSelector || targetSelector === "this") {
      return sourceElt;
    }
    const selector = String(targetSelector).trim();
    const ops = selector.split(/\s+/);
    if (["closest", "find", "next", "previous"].some((op) => selector.startsWith(op))) {
      let context = sourceElt;
      for (let i = 0; i < ops.length; ) {
        const op = ops[i++];
        const sel = ops[i++] || "";
        if (op === "closest") {
          let candidate = context ? context.closest(sel) : null;
          if (!candidate) {
            candidate = findClosestInAncestorSubtrees(context, sel);
          }
          context = candidate;
          if (!context) return null;
        } else if (op === "find") {
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
        } else if (op === "next") {
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
        } else if (op === "previous") {
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
  function setOptimisticStateClass(target, state) {
    if (!target?.classList) return;
    target.classList.remove(CLASS_OPTIMISTIC, CLASS_ERROR, CLASS_REVERTING);
    if (state === "optimistic") target.classList.add(CLASS_OPTIMISTIC);
    else if (state === "error") target.classList.add(CLASS_ERROR);
    else if (state === "reverting") target.classList.add(CLASS_REVERTING);
  }
  function hasOptimisticConfig(element) {
    return Boolean(element?.dataset?.[DATASET_OPTIMISTIC_KEY]);
  }
  function getTargetFor(sourceElt) {
    const targetSelector = sourceElt.getAttribute("hx-target");
    if (!targetSelector) return sourceElt;
    return resolveTargetChain(sourceElt, targetSelector);
  }
  function getNextToken(targetElt, tokenMap) {
    const currentToken = tokenMap.get(targetElt) || 0;
    const newToken = currentToken + 1;
    tokenMap.set(targetElt, newToken);
    return newToken;
  }
  function processWithHtmxIfAvailable(element) {
    if (typeof htmx !== "undefined" && typeof htmx.process === "function") {
      htmx.process(element);
    }
  }
  function removeOptimisticDatasetAttributes(target) {
    if (!target?.dataset) return;
    Object.keys(target.dataset).filter((key) => key.startsWith("hxOptimistic")).forEach((key) => delete target.dataset[key]);
  }
  function addCustomOptimisticClass(target, config) {
    if (config && config.class && target?.classList) {
      target.classList.add(config.class);
    }
  }
  function removeCustomOptimisticClass(target, config) {
    if (config && config.class && target?.classList) {
      target.classList.remove(config.class);
    }
  }

  // src/config.js
  function getOptimisticConfig(sourceElt, cacheMap) {
    if (!sourceElt?.dataset?.[DATASET_OPTIMISTIC_KEY]) return null;
    const raw = sourceElt.dataset[DATASET_OPTIMISTIC_KEY];
    const cached = cacheMap.get(sourceElt);
    if (cached && cached.__raw === raw) {
      return cached.config;
    }
    let config;
    try {
      if (raw === "true" || raw === "") {
        config = {};
      } else {
        config = JSON.parse(raw);
        if (typeof config !== "object" || config === null) {
          config = { values: { textContent: raw } };
        }
      }
    } catch (e) {
      config = { values: { textContent: raw } };
    }
    config.delay = config.delay ?? 2e3;
    config.errorMode = config.errorMode || "replace";
    config.errorMessage = config.errorMessage || "Request failed";
    if (!config.values && !config.template && sourceElt.tagName === "BUTTON") {
      config.values = {
        className: (sourceElt.className + " hx-optimistic-pending").trim()
      };
    }
    cacheMap.set(sourceElt, { __raw: raw, config });
    return config;
  }

  // src/extension.js
  function createExtension(htmx2) {
    const configCache = /* @__PURE__ */ new WeakMap();
    const snapshots = /* @__PURE__ */ new WeakMap();
    const tokens = /* @__PURE__ */ new WeakMap();
    const sourceTargets = /* @__PURE__ */ new WeakMap();
    return {
      onEvent: function(name, evt) {
        if (name === "htmx:beforeRequest") {
          this.handleBeforeRequest(evt);
        } else if (["htmx:responseError", "htmx:swapError", "htmx:timeout", "htmx:sendError"].includes(name)) {
          this.handleError(evt);
        } else if (name === "htmx:afterSwap") {
          this.cleanup(evt.target);
        }
      },
      handleBeforeRequest: function(evt) {
        const sourceElt = evt.target;
        if (!hasOptimisticConfig(sourceElt)) return;
        const config = getOptimisticConfig(sourceElt, configCache);
        if (!config) return;
        const targetElt = getTargetFor(sourceElt);
        if (!targetElt) {
          console.warn("[hx-optimistic] Target element not found for:", sourceElt);
          return;
        }
        sourceTargets.set(sourceElt, targetElt);
        const newToken = getNextToken(targetElt, tokens);
        this.snapshot(targetElt, sourceElt, config, newToken);
        this.applyOptimistic(targetElt, sourceElt, config);
        setOptimisticStateClass(targetElt, "optimistic");
        addCustomOptimisticClass(targetElt, config);
        try {
          htmx2.trigger && htmx2.trigger(targetElt, "optimistic:applied", { config });
        } catch (_) {
        }
      },
      handleError: function(evt) {
        const sourceElt = evt.detail?.elt || evt.target;
        const targetSelector = sourceElt?.getAttribute("hx-target");
        const targetElt = (targetSelector ? resolveTargetChain(sourceElt, targetSelector) : null) || sourceTargets.get(sourceElt) || sourceElt;
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
        setOptimisticStateClass(targetElt, "error");
        this.showError(targetElt, config, evt);
        try {
          const errorData = {
            status: evt.detail?.xhr?.status || 0,
            statusText: evt.detail?.xhr?.statusText || "Network Error",
            error: evt.detail?.error || "Request failed"
          };
          htmx2.trigger && htmx2.trigger(targetElt, "optimistic:error", { config, detail: errorData });
        } catch (_) {
        }
        if (config.delay > 0) {
          setTimeout(() => this.revert(targetElt, currentToken), config.delay);
        }
      },
      snapshot: function(targetElt, sourceElt, config, token) {
        const attributes = Array.from(targetElt.attributes).reduce((acc, { name, value }) => {
          acc[name] = value;
          return acc;
        }, {});
        const dataset = { ...targetElt.dataset };
        const pickKeys = Array.isArray(config.snapshot) && config.snapshot.length > 0 ? config.snapshot : ["innerHTML", "className"];
        const granular = {};
        pickKeys.forEach((k) => {
          if (k === "textContent") granular.textContent = targetElt.textContent;
          else if (k === "innerHTML") granular.innerHTML = targetElt.innerHTML;
          else if (k === "className") granular.className = targetElt.className;
          else if (k.startsWith("data-")) granular[k] = targetElt.dataset[k.slice(5)];
          else if (k in targetElt) granular[k] = targetElt[k];
        });
        const snapshotData = {
          innerHTML: targetElt.innerHTML,
          className: targetElt.className,
          attributes,
          dataset,
          granular,
          config,
          token
        };
        snapshots.set(targetElt, snapshotData);
      },
      applyOptimistic: function(targetElt, sourceElt, config) {
        let optimisticTarget = targetElt;
        if (config.target) {
          const resolved = resolveTargetChain(sourceElt, config.target);
          if (resolved) optimisticTarget = resolved;
        }
        if (config.template) {
          const template = this.getTemplate(config.template);
          if (template) {
            const context = config && typeof config.context === "object" ? config.context : {};
            const content = interpolateTemplate(template, sourceElt, context);
            if (config.swap === "beforeend") {
              optimisticTarget.insertAdjacentHTML("beforeend", content);
            } else if (config.swap === "afterbegin") {
              optimisticTarget.insertAdjacentHTML("afterbegin", content);
            } else {
              optimisticTarget.innerHTML = content;
              processWithHtmxIfAvailable(optimisticTarget);
            }
          } else if (typeof config.template === "string" && config.template.startsWith("#")) {
            console.warn("[hx-optimistic] Template selector did not resolve:", config.template);
          }
        } else if (config.values) {
          this.applyValues(optimisticTarget, config.values, sourceElt);
        }
      },
      showError: function(targetElt, config, evt) {
        if (targetElt.dataset.hxOptimisticErrorShown) return;
        targetElt.dataset.hxOptimisticErrorShown = "true";
        if (config.errorTemplate) {
          const template = this.getTemplate(config.errorTemplate);
          if (template) {
            const base = config && typeof config.context === "object" ? config.context : {};
            const errorData = Object.assign({}, base, {
              status: evt.detail?.xhr?.status || 0,
              statusText: evt.detail?.xhr?.statusText || "Network Error",
              error: evt.detail?.error || "Request failed"
            });
            const source = evt.detail?.elt || evt.target;
            const content = interpolateTemplate(template, source, errorData);
            if (config.errorMode === "append") {
              const errorEl = document.createElement("div");
              errorEl.className = "hx-optimistic-error-message";
              errorEl.innerHTML = content;
              targetElt.appendChild(errorEl);
            } else {
              targetElt.innerHTML = content;
            }
          } else if (typeof config.errorTemplate === "string" && config.errorTemplate.startsWith("#")) {
            console.warn("[hx-optimistic] Error template selector did not resolve:", config.errorTemplate);
          }
        } else if (config.errorMessage) {
          if (config.errorMode === "append") {
            const errorEl = document.createElement("div");
            errorEl.className = "hx-optimistic-error-message";
            errorEl.textContent = config.errorMessage;
            targetElt.appendChild(errorEl);
          } else {
            targetElt.textContent = config.errorMessage;
          }
        }
      },
      revert: function(targetElt, expectedToken) {
        const snapshot = snapshots.get(targetElt);
        if (!snapshot) return;
        if (expectedToken !== void 0 && snapshot.token !== expectedToken) return;
        setOptimisticStateClass(targetElt, "reverting");
        if (snapshot.innerHTML !== void 0) targetElt.innerHTML = snapshot.innerHTML;
        if (snapshot.className !== void 0) targetElt.className = snapshot.className;
        try {
          Array.from(targetElt.getAttributeNames()).forEach((n) => targetElt.removeAttribute(n));
          Object.entries(snapshot.attributes || {}).forEach(([n, v]) => targetElt.setAttribute(n, v));
        } catch (_) {
        }
        try {
          Object.keys(targetElt.dataset || {}).forEach((k) => delete targetElt.dataset[k]);
          Object.assign(targetElt.dataset, snapshot.dataset || {});
        } catch (_) {
        }
        snapshots.delete(targetElt);
        tokens.delete(targetElt);
        this.cleanup(targetElt);
        const toFocus = snapshot.focusRestore;
        if (toFocus && document.contains(toFocus)) {
          try {
            toFocus.focus();
          } catch (_) {
          }
        }
        try {
          htmx2.trigger && htmx2.trigger(targetElt, "optimistic:reverted", { config: snapshot.config });
        } catch (_) {
        }
      },
      cleanup: function(target) {
        if (!target) return;
        setOptimisticStateClass(target, "clean");
        target.querySelectorAll(".hx-optimistic-error-message").forEach((msg) => msg.remove());
        removeOptimisticDatasetAttributes(target);
        const snap = snapshots.get(target);
        if (snap && snap.config && snap.config.class) {
          removeCustomOptimisticClass(target, snap.config);
        }
        if (snap) snapshots.delete(target);
      },
      getTemplate: function(templateId) {
        if (templateId.startsWith("#")) {
          const template = document.querySelector(templateId);
          return template ? template.innerHTML : null;
        }
        return templateId;
      },
      applyValues: function(targetElt, values, sourceElt) {
        Object.entries(values).forEach(([key, value]) => {
          const evaluated = interpolateTemplate(value, sourceElt);
          if (key === "textContent") targetElt.textContent = evaluated;
          else if (key === "innerHTML") targetElt.innerHTML = evaluated;
          else if (key === "className") targetElt.className = evaluated;
          else if (key.startsWith("data-")) targetElt.dataset[key.slice(5)] = evaluated;
          else targetElt[key] = evaluated;
        });
      }
    };
  }

  // src/index.js
  (function() {
    "use strict";
    function define() {
      if (typeof htmx !== "undefined") {
        htmx.defineExtension("optimistic", createExtension(htmx));
      }
    }
    if (typeof htmx !== "undefined") {
      define();
    } else if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        if (typeof htmx !== "undefined") define();
      });
    }
  })();
})();
