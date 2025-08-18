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
    // WeakMap to store snapshots for replaced elements
    const snapshotStorage = new WeakMap();
    
    htmx.defineExtension('optimistic', {
    onEvent: function(name, evt) {
      const elt = evt.target;
      
      
      // Early exit for irrelevant events
      const relevantEvents = new Set([
        'htmx:beforeRequest', 'htmx:responseError', 'htmx:swapError', 
        'htmx:timeout', 'htmx:sendError', 'htmx:afterSwap'
      ]);
      if (!relevantEvents.has(name)) return;
      
      
      // Handle afterSwap with precision cleanup
      if (name === 'htmx:afterSwap') {
        this.precisionCleanup(evt.target);
        return;
      }
      
      // For error events, we need to handle null targets differently
      const isErrorEvent = ['htmx:responseError', 'htmx:swapError', 'htmx:timeout', 'htmx:sendError'].includes(name);
      
      if (!isErrorEvent) {
        // Only handle other events for elements with data-optimistic attribute
        if (!elt || !elt.dataset || !elt.dataset.optimistic) {
          return;
        }
        
        // Auto-detect and enhance config if needed
        this.enhanceConfig(elt);
      }
      
      // Check if element has hx-target and get the target element
      let targetElement;
      
      if (!isErrorEvent && elt) {
        const targetSelector = elt.getAttribute('hx-target');
        
        if (!targetSelector || targetSelector === 'this') {
          targetElement = elt;
        } else if (targetSelector.startsWith('closest ')) {
          const selector = targetSelector.slice(8); // Remove 'closest '
          targetElement = elt.closest(selector);
        } else {
          targetElement = document.querySelector(targetSelector);
        }
      }
      
      switch(name) {
        case 'htmx:beforeRequest':
          if (!targetElement) {
            console.warn('[hx-optimistic] Target element not found for:', elt);
            return;
          }
          // Concurrency protection: increment token
          const currentToken = parseInt(targetElement.dataset.hxOptimisticToken || '0', 10);
          const newToken = currentToken + 1;
          targetElement.dataset.hxOptimisticToken = newToken;
          elt.dataset.hxOptimisticRequestToken = newToken;
          
          this.snapshot(targetElement, elt);
          this.applyOptimistic(targetElement, elt);
          // Store reference to source element for later use
          if (targetElement.dataset) {
            targetElement.dataset.hxOptimisticSource = elt.id || Math.random().toString();
            if (!elt.id) elt.id = targetElement.dataset.hxOptimisticSource;
          }
          break;
          
          
        case 'htmx:responseError':
        case 'htmx:swapError':
        case 'htmx:timeout':
        case 'htmx:sendError':
          // For error events, get the triggering element and target from event detail
          const triggeringElement = evt.detail?.elt || elt;
          let actualTarget = evt.detail?.target;
          
          // If no target in detail, try to resolve from triggering element
          if (!actualTarget && triggeringElement) {
            const targetSelector = triggeringElement.getAttribute?.('hx-target');
            if (!targetSelector || targetSelector === 'this') {
              actualTarget = triggeringElement;
            } else if (targetSelector.startsWith('closest ')) {
              const selector = targetSelector.slice(8);
              actualTarget = triggeringElement.closest(selector);
            } else {
              actualTarget = document.querySelector(targetSelector);
            }
          }
          
          
          // For template-based updates, try to find error handling config from WeakMap snapshots
          if (actualTarget) {
            const errorSnapshot = snapshotStorage.get(actualTarget);
            if (errorSnapshot && errorSnapshot.config) {
              this.handleError(actualTarget, evt, errorSnapshot.sourceElement);
              break;
            }
          }
          
          // Fallback to looking for source element with config
          if (triggeringElement && triggeringElement.dataset && triggeringElement.dataset.optimistic) {
            this.handleError(actualTarget || triggeringElement, evt, triggeringElement);
          } else {
          }
          break;
      }
    },
    
    /**
     * Snapshot current state before making changes
     */
    snapshot: function(elt, sourceElt) {
      if (!elt) return;
      sourceElt = sourceElt || elt;
      const config = this.getConfig(sourceElt);
      if (!config) return;
      
      const snapshotData = {
        innerHTML: elt.innerHTML,
        className: elt.className
      };
      
      // Store textContent if explicitly requested
      if (config.snapshot && config.snapshot.includes('textContent')) {
        snapshotData.textContent = elt.textContent;
      }
      
      // If using optimisticTemplate, store in WeakMap (element might be replaced)
      if (config.optimisticTemplate) {
        snapshotData.sourceElement = sourceElt;
        snapshotData.config = config;
        snapshotStorage.set(elt, snapshotData);
      } else {
        // Store on element dataset for simple updates
        elt.dataset.hxOptimisticInnerHTML = snapshotData.innerHTML;
        elt.dataset.hxOptimisticClassName = snapshotData.className;
        if (snapshotData.textContent !== undefined) {
          elt.dataset.hxOptimisticTextContent = snapshotData.textContent;
        }
      }
    },
    
    /**
     * Apply optimistic updates to the element
     */
    applyOptimistic: function(targetElt, sourceElt) {
      // If no sourceElt provided, target and source are the same
      sourceElt = sourceElt || targetElt;
      if (!targetElt || !sourceElt) return;
      const config = this.getConfig(sourceElt);
      if (!config) {
        return;
      }
      
      // Apply optimistic template if provided
      if (config.optimisticTemplate) {
        const template = this.getTemplate(config.optimisticTemplate);
        if (template) {
          // Store snapshot for target element too (in case target != source)
          if (targetElt !== sourceElt) {
            const sourceSnapshot = snapshotStorage.get(sourceElt);
            if (sourceSnapshot) {
              snapshotStorage.set(targetElt, sourceSnapshot);
            }
          }
          targetElt.innerHTML = this.renderTemplate(template, sourceElt);
        }
      } 
      // Apply individual values
      else if (config.values) {
        this.applyValues(targetElt, config.values, sourceElt);
      }
      
      // Add optimistic class
      targetElt.classList.add(config.class || 'hx-optimistic');
    },
    
    /**
     * Handle error responses
     */
    handleError: function(targetElt, evt, sourceElt) {
      // If no sourceElt provided, target and source are the same
      sourceElt = sourceElt || targetElt;
      if (!targetElt || !sourceElt) {
        return;
      }
      
      // Try to get config from source element or from WeakMap snapshot
      let config = this.getConfig(sourceElt);
      const snapshot = snapshotStorage.get(targetElt) || snapshotStorage.get(sourceElt);
      if (!config && snapshot && snapshot.config) {
        config = snapshot.config;
        sourceElt = snapshot.sourceElement || sourceElt;
      }
      if (!config) {
        return;
      }
      
      
      // Apply error state
      if (targetElt.classList) {
        targetElt.classList.remove('hx-optimistic');
        targetElt.classList.add('hx-optimistic-error');
      }
      
      // Store current content if we're going to show error
      if (!targetElt.dataset.hxOptimisticErrorShown) {
        targetElt.dataset.hxOptimisticErrorShown = 'true';
        
        // Show error content if configured
        if (config.errorTemplate) {
          const template = this.getTemplate(config.errorTemplate);
          if (template) {
            const errorData = {
              status: evt.detail?.xhr?.status || 0,
              statusText: evt.detail?.xhr?.statusText || 'Network Error',
              error: evt.detail?.error || 'Request failed'
            };
            
            if (config.errorTarget === 'append') {
              const errorEl = document.createElement('div');
              errorEl.className = 'hx-optimistic-error-message';
              errorEl.innerHTML = this.renderTemplate(template, targetElt, errorData);
              targetElt.appendChild(errorEl);
            } else {
              targetElt.innerHTML = this.renderTemplate(template, targetElt, errorData);
            }
          }
        } else if (config.errorMessage) {
          if (config.errorTarget === 'append') {
            const errorEl = document.createElement('div');
            errorEl.className = 'hx-optimistic-error-message';
            errorEl.textContent = config.errorMessage;
            targetElt.appendChild(errorEl);
          } else {
            targetElt.textContent = config.errorMessage;
          }
        }
      }
      
      // Schedule revert
      const revertDelay = config.revertDelay !== undefined ? config.revertDelay : 1500;
      if (revertDelay > 0) {
        setTimeout(() => this.revertOptimistic(targetElt), revertDelay);
      }
    },
    
    /**
     * Revert to original state
     */
    revertOptimistic: function(elt) {
      if (!elt) return;
      
      
      // Add reverting class for animations
      elt.classList.add('hx-optimistic-reverting');
      
      // Check for snapshot in WeakMap first (for template-based updates)
      const snapshot = snapshotStorage.get(elt);
      if (snapshot) {
        // Restore from WeakMap snapshot
        if (snapshot.innerHTML !== undefined) {
          elt.innerHTML = snapshot.innerHTML;
        }
        if (snapshot.className !== undefined) {
          elt.className = snapshot.className;
        }
        if (snapshot.textContent !== undefined) {
          elt.textContent = snapshot.textContent;
        }
        // Clean up WeakMap entry
        snapshotStorage.delete(elt);
        
        // Re-process HTMX attributes on restored content
        if (typeof htmx !== 'undefined' && htmx.process) {
          htmx.process(elt);
        }
      } else {
        // Fallback to dataset-based snapshots (for simple updates)
        if (elt.dataset.hxOptimisticInnerHTML !== undefined) {
          elt.innerHTML = elt.dataset.hxOptimisticInnerHTML;
          delete elt.dataset.hxOptimisticInnerHTML;
        }
        
        if (elt.dataset.hxOptimisticClassName !== undefined) {
          elt.className = elt.dataset.hxOptimisticClassName;
          delete elt.dataset.hxOptimisticClassName;
        }
        
        if (elt.dataset.hxOptimisticTextContent !== undefined) {
          elt.textContent = elt.dataset.hxOptimisticTextContent;
          delete elt.dataset.hxOptimisticTextContent;
        }
        
        // Clean up all optimistic data attributes
        Object.keys(elt.dataset)
          .filter(key => key.startsWith('hxOptimistic'))
          .forEach(key => delete elt.dataset[key]);
          
        // Re-process HTMX attributes on restored content
        if (typeof htmx !== 'undefined' && htmx.process) {
          htmx.process(elt);
        }
      }
      
      // Clean up classes
      elt.classList.remove('hx-optimistic', 'hx-optimistic-error', 'hx-optimistic-reverting');
      
      // Remove error messages
      const errorMsg = elt.querySelector('.hx-optimistic-error-message');
      if (errorMsg) errorMsg.remove();
    },
    
    /**
     * Precision cleanup - only clean the swap target and its descendants
     */
    precisionCleanup: function(target) {
      if (!target) return;
      
      // Clean the target itself
      if (target.classList) {
        target.classList.remove('hx-optimistic', 'hx-optimistic-error', 'optimistic-pending');
      }
      
      // Clean descendants
      const optimisticElements = target.querySelectorAll('.optimistic-pending, .hx-optimistic, .hx-optimistic-error');
      optimisticElements.forEach(el => {
        el.classList.remove('optimistic-pending', 'hx-optimistic', 'hx-optimistic-error');
      });
      
      // Clean up stored original values
      if (target.dataset) {
        Object.keys(target.dataset)
          .filter(key => key.startsWith('hxOptimistic'))
          .forEach(key => delete target.dataset[key]);
      }
    },
    
    /**
     * Auto-detect patterns and enhance config with smart defaults
     */
    enhanceConfig: function(elt) {
      let config;
      
      const value = elt.dataset.optimistic;
      if (value === 'true' || value === '') {
        config = {};
      } else {
        try {
          // Try to parse as JSON
          config = JSON.parse(value);
          // Ensure it's an object
          if (typeof config !== 'object' || config === null) {
            config = { values: { textContent: value } };
          }
        } catch (e) {
          // Treat as simple text to show
          config = { values: { textContent: value } };
        }
      }
      
      // Auto-detect element type and provide smart defaults
      const tagName = elt.tagName.toLowerCase();
      const inputType = elt.type;
      
      // Input elements - show their value optimistically
      if (tagName === 'input' && (inputType === 'text' || inputType === 'email' || inputType === 'password')) {
        if (!config.values && !config.optimisticTemplate) {
          // Check if targeting a display element
          const targetSelector = elt.getAttribute('hx-target');
          const isTargetingDisplay = targetSelector && targetSelector.includes('display');
          
          if (isTargetingDisplay) {
            // For display elements, get the input value from source element
            config.values = config.values || {
              textContent: '${this.value}',
              className: 'optimistic-pending'
            };
          } else {
            // For self-targeting inputs
            config.values = config.values || {
              textContent: '${this.value}',
              className: (elt.className + ' optimistic-pending').trim()
            };
          }
        }
      }
      
      // Textarea elements
      else if (tagName === 'textarea') {
        if (!config.values && !config.optimisticTemplate) {
          config.values = config.values || {
            textContent: '${this.value}',
            className: (elt.className + ' optimistic-pending').trim()
          };
        }
      }
      
      // Button elements - show loading state or keep content
      else if (tagName === 'button') {
        if (!config.values && !config.optimisticTemplate) {
          config.values = config.values || {
            textContent: config.loadingText || 'Loading...',
            className: (elt.className + ' optimistic-pending').trim()
          };
        }
      }
      
      // Any other element - add optimistic class
      else {
        if (!config.values && !config.optimisticTemplate) {
          config.values = config.values || {
            className: (elt.className + ' optimistic-pending').trim()
          };
        }
      }
      
      // Set default error handling
      config.errorMessage = config.errorMessage || 'Request failed';
      config.revertDelay = config.revertDelay !== undefined ? config.revertDelay : 2000;
      
      // Auto-detect target if not specified
      if (!elt.getAttribute('hx-target')) {
        // For inputs, target the input itself or a sibling display element
        if (tagName === 'input' || tagName === 'textarea') {
          // Look for a sibling with common display classes
          const displaySibling = elt.previousElementSibling || elt.nextElementSibling;
          if (displaySibling && (
            displaySibling.classList.contains('display-text') ||
            displaySibling.classList.contains('display') ||
            displaySibling.classList.contains('value')
          )) {
            // Found a display sibling - target it specifically
            if (elt.previousElementSibling && elt.previousElementSibling.classList.contains('display-text')) {
              elt.setAttribute('hx-target', 'previous .display-text');
            } else if (elt.nextElementSibling && elt.nextElementSibling.classList.contains('display-text')) {
              elt.setAttribute('hx-target', 'next .display-text');
            } else {
              elt.setAttribute('hx-target', 'previous .display, next .display, previous .value, next .value');
            }
          } else {
            elt.setAttribute('hx-target', 'this');
          }
        }
      }
      
      // Store the enhanced config back
      elt.dataset.optimistic = JSON.stringify(config);
    },
    
    // Helper functions
    
    /**
     * Get configuration from data-optimistic attribute
     */
    getConfig: function(elt) {
      if (!elt || !elt.dataset || !elt.dataset.optimistic) return null;
      try {
        return JSON.parse(elt.dataset.optimistic);
      } catch (e) {
        return null;
      }
    },
    
    /**
     * Get template content by ID or as inline string
     */
    getTemplate: function(templateId) {
      // Support template element references
      if (templateId.startsWith('#')) {
        const template = document.querySelector(templateId);
        return template ? template.innerHTML : null;
      }
      // Treat as inline HTML string
      return templateId;
    },
    
    /**
     * Render template with simple placeholder substitution
     */
    renderTemplate: function(template, elt, data) {
      data = data || {};
      
      // Simple template rendering - only support direct placeholders
      return template.replace(/\${([^}]+)}/g, (match, expr) => {
        expr = expr.trim();
        
        // Direct data properties: status, statusText, error
        if (data[expr] !== undefined) {
          return data[expr];
        }
        
        // Element value: ${this.value}
        if (expr === 'this.value' && elt.value !== undefined) {
          return elt.value;
        }
        
        // Dataset properties: ${this.dataset.foo}
        if (expr.startsWith('this.dataset.')) {
          const dataKey = expr.slice(13);
          return elt.dataset[dataKey] || match;
        }
        
        return match;
      });
    },
    
    /**
     * Apply values to element properties
     */
    applyValues: function(targetElt, values, sourceElt) {
      sourceElt = sourceElt || targetElt;
      Object.entries(values).forEach(([key, value]) => {
        const evaluated = this.evaluateValue(value, sourceElt);
        
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
    },
    
    /**
     * Evaluate simple placeholders in config values
     */
    evaluateValue: function(value, elt) {
      if (typeof value !== 'string') return value;
      
      // Simple placeholder evaluation - no dynamic expressions
      if (value.includes('${')) {
        return value.replace(/\${([^}]+)}/g, (match, expr) => {
          expr = expr.trim();
          
          // Element value
          if (expr === 'this.value' && elt.value !== undefined) {
            return elt.value;
          }
          
          // Dataset properties
          if (expr.startsWith('this.dataset.')) {
            const dataKey = expr.slice(13);
            return elt.dataset[dataKey] || match;
          }
          
          return match;
        });
      }
      return value;
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