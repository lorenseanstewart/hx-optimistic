/**
 * HTMX Optimistic Updates Extension
 * 
 * Provides optimistic UI updates with automatic rollback on errors.
 * No CSS included - you control all styling through the provided class names.
 * 
 * @version 1.0.0
 * @license MIT
 */
(function() {
  'use strict';

  function defineExtension() {
    // Core storage WeakMaps for memory-efficient storage
    const configCache = new WeakMap();
    const snapshots = new WeakMap();
    const tokens = new WeakMap();
    
    /**
     * Simple interpolation for templates and values
     */
    function interpolate(str, sourceElt, data = {}) {
      if (typeof str !== 'string') return str;
      
      return str.replace(/\${([^}]+)}/g, (match, expr) => {
        expr = expr.trim();
        
        // Error context data
        if (data[expr] !== undefined) {
          return data[expr];
        }
        
        if (!sourceElt) return match;
        
        // Element value: ${this.value}
        if (expr === 'this.value') {
          if (sourceElt.value !== undefined) return sourceElt.value;
          if (sourceElt.tagName === 'FORM') {
            const input = sourceElt.querySelector('input, textarea, select');
            if (input?.value) return input.value;
          }
        }
        
        // Input by type: ${textarea}, ${email}, etc.
        if (sourceElt.tagName === 'FORM') {
          const selectors = {
            'textarea': 'textarea',
            'email': 'input[type="email"]',
            'password': 'input[type="password"]',
            'text': 'input[type="text"], input:not([type])',
            'url': 'input[type="url"]',
            'tel': 'input[type="tel"]',
            'search': 'input[type="search"]'
          };
          
          const selector = selectors[expr] || `[name="${expr}"]`;
          const field = sourceElt.querySelector(selector);
          if (field?.value) return field.value;
        }
        
        // Element properties
        if (expr === 'this.textContent') return sourceElt.textContent || match;
        
        // Dataset: ${this.dataset.foo} or ${data:foo}
        if (expr.startsWith('this.dataset.')) {
          const key = expr.slice(13);
          return sourceElt.dataset[key] || match;
        }
        if (expr.startsWith('data:')) {
          const key = expr.slice(5);
          return sourceElt.dataset[key] || match;
        }
        
        // Attributes: ${attr:name}
        if (expr.startsWith('attr:')) {
          const name = expr.slice(5);
          return sourceElt.getAttribute(name) || match;
        }
        
        // Show warning for unresolved patterns that look like they should be interpolated
        if ((expr.includes('.') || expr.includes(':')) && !expr.includes('Math.')) {
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
    
    /**
     * Resolve target element from source element
     */
    function resolveTarget(sourceElt, targetSelector) {
      if (!targetSelector || targetSelector === 'this') {
        return sourceElt;
      }
      if (targetSelector.startsWith('closest ')) {
        return sourceElt.closest(targetSelector.slice(8));
      }
      if (targetSelector.startsWith('find ')) {
        return sourceElt.querySelector(targetSelector.slice(5));
      }
      if (targetSelector.startsWith('next ')) {
        const selector = targetSelector.slice(5);
        let next = sourceElt.nextElementSibling;
        while (next) {
          if (next.matches(selector)) return next;
          next = next.nextElementSibling;
        }
        return null;
      }
      if (targetSelector.startsWith('previous ')) {
        const selector = targetSelector.slice(9);
        let prev = sourceElt.previousElementSibling;
        while (prev) {
          if (prev.matches(selector)) return prev;
          prev = prev.previousElementSibling;
        }
        return null;
      }
      return document.querySelector(targetSelector);
    }
    
    /**
     * Manage optimistic state classes
     */
    function setState(target, state) {
      if (!target?.classList) return;
      
      target.classList.remove('hx-optimistic', 'hx-optimistic-error', 'hx-optimistic-reverting');
      
      if (state === 'optimistic') target.classList.add('hx-optimistic');
      else if (state === 'error') target.classList.add('hx-optimistic-error');
      else if (state === 'reverting') target.classList.add('hx-optimistic-reverting');
    }
    
    /**
     * Normalize configuration with smart defaults
     */
    function normalizeConfig(sourceElt) {
      if (!sourceElt?.dataset?.optimistic) return null;
      
      if (configCache.has(sourceElt)) {
        return configCache.get(sourceElt);
      }
      
      let config;
      const value = sourceElt.dataset.optimistic;
      
      try {
        if (value === 'true' || value === '') {
          config = {};
        } else {
          config = JSON.parse(value);
          if (typeof config !== 'object' || config === null) {
            config = { values: { textContent: value } };
          }
        }
      } catch (e) {
        config = { values: { textContent: value } };
      }
      
      // Set defaults
      config.delay = config.delay ?? 2000;
      config.errorMode = config.errorMode || 'replace';
      config.errorMessage = config.errorMessage || 'Request failed';
      
      // Smart defaults for buttons - just add CSS class
      if (!config.values && !config.template && sourceElt.tagName === 'BUTTON') {
        config.values = {
          className: (sourceElt.className + ' hx-optimistic-pending').trim()
        };
      }
      
      configCache.set(sourceElt, config);
      return config;
    }
    
    htmx.defineExtension('optimistic', {
      onEvent: function(name, evt) {
        if (name === 'htmx:beforeRequest') {
          this.handleBeforeRequest(evt);
        } else if (['htmx:responseError', 'htmx:swapError', 'htmx:timeout', 'htmx:sendError'].includes(name)) {
          this.handleError(evt);
        } else if (name === 'htmx:afterSwap') {
          this.cleanup(evt.target);
        }
      },
      
      handleBeforeRequest: function(evt) {
        const sourceElt = evt.target;
        if (!sourceElt?.dataset?.optimistic) return;
        
        const config = normalizeConfig(sourceElt);
        if (!config) return;
        
        const targetSelector = sourceElt.getAttribute('hx-target');
        const targetElt = resolveTarget(sourceElt, targetSelector) || sourceElt;
        
        if (!targetElt) {
          console.warn('[hx-optimistic] Target element not found for:', sourceElt);
          return;
        }
        
        // Token for concurrency control
        const currentToken = tokens.get(targetElt) || 0;
        const newToken = currentToken + 1;
        tokens.set(targetElt, newToken);
        
        // Take snapshot and apply optimistic state
        this.snapshot(targetElt, sourceElt, config, newToken);
        this.applyOptimistic(targetElt, sourceElt, config);
        setState(targetElt, 'optimistic');
      },
      
      handleError: function(evt) {
        const sourceElt = evt.detail?.elt || evt.target;
        const targetSelector = sourceElt?.getAttribute('hx-target');
        const targetElt = resolveTarget(sourceElt, targetSelector) || sourceElt;
        
        if (!targetElt) return;
        
        const snapshot = snapshots.get(targetElt);
        const config = snapshot?.config || normalizeConfig(sourceElt);
        if (!config) return;
        
        // Check token to prevent stale error handling
        const currentToken = tokens.get(targetElt);
        if (snapshot && snapshot.token !== currentToken) return;
        
        setState(targetElt, 'error');
        this.showError(targetElt, config, evt);
        
        // Schedule revert
        if (config.delay > 0) {
          setTimeout(() => this.revert(targetElt, currentToken), config.delay);
        }
      },
      
      snapshot: function(targetElt, sourceElt, config, token) {
        const snapshotData = {
          innerHTML: targetElt.innerHTML,
          className: targetElt.className,
          config: config,
          token: token
        };
        snapshots.set(targetElt, snapshotData);
      },
      
      applyOptimistic: function(targetElt, sourceElt, config) {
        // Handle different targets for optimistic updates
        let optimisticTarget = targetElt;
        if (config.target) {
          const resolved = resolveTarget(sourceElt, config.target);
          if (resolved) optimisticTarget = resolved;
        }
        
        if (config.template) {
          const template = this.getTemplate(config.template);
          if (template) {
            const content = interpolate(template, sourceElt);
            
            // Handle swap modes
            if (config.swap === 'beforeend') {
              optimisticTarget.insertAdjacentHTML('beforeend', content);
            } else if (config.swap === 'afterbegin') {
              optimisticTarget.insertAdjacentHTML('afterbegin', content);
            } else {
              optimisticTarget.innerHTML = content;
            }
          }
        } else if (config.values) {
          this.applyValues(optimisticTarget, config.values, sourceElt);
        }
      },
      
      showError: function(targetElt, config, evt) {
        if (targetElt.dataset.hxOptimisticErrorShown) return;
        targetElt.dataset.hxOptimisticErrorShown = 'true';
        
        if (config.errorTemplate) {
          const template = this.getTemplate(config.errorTemplate);
          if (template) {
            const errorData = {
              status: evt.detail?.xhr?.status || 0,
              statusText: evt.detail?.xhr?.statusText || 'Network Error',
              error: evt.detail?.error || 'Request failed'
            };
            
            const content = interpolate(template, targetElt, errorData);
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
      
      revert: function(targetElt, expectedToken) {
        const snapshot = snapshots.get(targetElt);
        if (!snapshot) return;
        
        // Check token to prevent stale reverts
        if (expectedToken !== undefined && snapshot.token !== expectedToken) return;
        
        setState(targetElt, 'reverting');
        
        // Restore from snapshot
        if (snapshot.innerHTML !== undefined) {
          targetElt.innerHTML = snapshot.innerHTML;
        }
        if (snapshot.className !== undefined) {
          targetElt.className = snapshot.className;
        }
        
        // Clean up
        snapshots.delete(targetElt);
        tokens.delete(targetElt);
        this.cleanup(targetElt);
      },
      
      cleanup: function(target) {
        if (!target) return;
        
        setState(target, 'clean');
        
        // Remove error messages
        target.querySelectorAll('.hx-optimistic-error-message').forEach(msg => msg.remove());
        
        // Clean up dataset attributes
        if (target.dataset) {
          Object.keys(target.dataset)
            .filter(key => key.startsWith('hxOptimistic'))
            .forEach(key => delete target.dataset[key]);
        }
      },
      
      getTemplate: function(templateId) {
        if (templateId.startsWith('#')) {
          const template = document.querySelector(templateId);
          return template ? template.innerHTML : null;
        }
        return templateId;
      },
      
      applyValues: function(targetElt, values, sourceElt) {
        Object.entries(values).forEach(([key, value]) => {
          const evaluated = interpolate(value, sourceElt);
          
          if (key === 'textContent') {
            targetElt.textContent = evaluated;
          } else if (key === 'innerHTML') {
            targetElt.innerHTML = evaluated;
          } else if (key === 'className') {
            targetElt.className = evaluated;
          } else if (key.startsWith('data-')) {
            targetElt.dataset[key.slice(5)] = evaluated;
          } else {
            targetElt[key] = evaluated;
          }
        });
      }
    });
  }

  // Wait for HTMX to be available
  if (typeof htmx !== 'undefined') {
    defineExtension();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof htmx !== 'undefined') {
        defineExtension();
      }
    });
  }
})();