/**
 * Test utility functions for hx-optimistic tests
 */

/**
 * Create a test element with optimistic configuration
 */
export function createOptimisticElement(html, config = {}) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const element = container.firstElementChild;
  
  if (config && Object.keys(config).length > 0) {
    element.setAttribute('data-optimistic', JSON.stringify(config));
  }
  
  document.body.appendChild(element);
  return element;
}

/**
 * Trigger an HTMX event on an element and call extension handlers
 */
export function triggerHtmxEvent(element, eventName, detail = {}) {
  const eventDetail = {
    elt: element,
    target: element,
    ...detail
  };
  
  const event = new CustomEvent(eventName, {
    detail: eventDetail,
    bubbles: true,
    cancelable: true
  });
  
  // Set target for event
  Object.defineProperty(event, 'target', {
    value: element,
    enumerable: true
  });
  
  // Call the extension's onEvent handler directly
  const extension = global.htmx?.extensions?.optimistic;
  if (extension && extension.onEvent) {
    extension.onEvent(eventName, event);
  }
  
  // Also dispatch the event normally
  element.dispatchEvent(event);
  return event;
}

/**
 * Create a mock XHR response
 */
export function createMockXhr(status = 200, statusText = 'OK', responseText = '') {
  return {
    status,
    statusText,
    responseText,
    getAllResponseHeaders: () => '',
    getResponseHeader: (name) => null
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(condition, timeout = 1000) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * Wait for next tick
 */
export async function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Get the optimistic extension instance
 */
export function getExtension() {
  return global.htmx?.extensions?.optimistic;
}

/**
 * Verify WeakMap usage by checking that no data is stored in element dataset
 */
export function verifyWeakMapUsage(element) {
  const datasetKeys = Object.keys(element.dataset);
  const optimisticKeys = datasetKeys.filter(key => 
    key.startsWith('hxOptimistic') && key !== 'hxOptimisticErrorShown'
  );
  
  return {
    hasNoWeakMapLeaks: optimisticKeys.length === 0,
    leakedKeys: optimisticKeys
  };
}

/**
 * Create a template element for testing
 */
export function createTemplate(id, content) {
  const template = document.createElement('template');
  template.id = id;
  template.innerHTML = content;
  document.body.appendChild(template);
  return template;
}

/**
 * Create a form element with various input types for testing
 */
export function createTestForm(config = {}) {
  const form = document.createElement('form');
  form.setAttribute('hx-post', config.endpoint || '/api/test');
  form.setAttribute('hx-ext', 'optimistic');
  
  if (config.optimisticConfig) {
    form.setAttribute('data-optimistic', JSON.stringify(config.optimisticConfig));
  }
  
  // Add various input types
  const inputs = [
    { type: 'text', name: 'username', value: config.username || 'testuser' },
    { type: 'email', name: 'email', value: config.email || 'test@example.com' },
    { type: 'password', name: 'password', value: config.password || 'secret' },
    { type: 'url', name: 'website', value: config.website || 'https://example.com' },
    { type: 'tel', name: 'phone', value: config.phone || '555-1234' },
    { type: 'search', name: 'query', value: config.query || 'search term' }
  ];
  
  inputs.forEach(inputConfig => {
    const input = document.createElement('input');
    input.type = inputConfig.type;
    input.name = inputConfig.name;
    input.value = inputConfig.value;
    form.appendChild(input);
  });
  
  // Add textarea
  const textarea = document.createElement('textarea');
  textarea.name = 'comment';
  textarea.value = config.comment || 'This is a test comment';
  form.appendChild(textarea);
  
  // Add select
  const select = document.createElement('select');
  select.name = 'category';
  const option = document.createElement('option');
  option.value = 'test';
  option.textContent = config.category || 'Test Category';
  option.selected = true;
  select.appendChild(option);
  form.appendChild(select);
  
  document.body.appendChild(form);
  return form;
}

/**
 * Create an element with target resolution testing
 */
export function createTargetTestElement(sourceConfig, targetConfig) {
  const container = document.createElement('div');
  container.className = 'test-container';
  
  // Create source element
  const source = document.createElement(sourceConfig.tagName || 'button');
  source.textContent = sourceConfig.text || 'Click me';
  source.setAttribute('hx-post', sourceConfig.endpoint || '/api/test');
  source.setAttribute('hx-ext', 'optimistic');
  
  if (sourceConfig.hxTarget) {
    source.setAttribute('hx-target', sourceConfig.hxTarget);
  }
  
  if (sourceConfig.optimisticConfig) {
    source.setAttribute('data-optimistic', JSON.stringify(sourceConfig.optimisticConfig));
  }
  
  // Add data attributes if specified
  if (sourceConfig.dataAttributes) {
    Object.entries(sourceConfig.dataAttributes).forEach(([key, value]) => {
      source.setAttribute(`data-${key}`, value);
    });
  }
  
  container.appendChild(source);
  
  // Create target element if specified
  if (targetConfig) {
    const target = document.createElement(targetConfig.tagName || 'div');
    target.className = targetConfig.className || 'target';
    target.textContent = targetConfig.text || 'Target content';
    target.id = targetConfig.id || 'test-target';
    
    if (targetConfig.parent) {
      const parent = document.createElement('div');
      parent.className = targetConfig.parent;
      parent.appendChild(target);
      container.appendChild(parent);
    } else {
      container.appendChild(target);
    }
  }
  
  document.body.appendChild(container);
  return { container, source, target: targetConfig ? container.querySelector('.target, #test-target') : null };
}

/**
 * Create a mock error event with detailed properties
 */
export function createErrorEvent(element, errorDetails = {}) {
  const mockXhr = {
    status: errorDetails.status || 500,
    statusText: errorDetails.statusText || 'Internal Server Error',
    responseText: errorDetails.responseText || 'Server error occurred'
  };
  
  return {
    detail: {
      elt: element,
      target: element,
      xhr: mockXhr,
      error: errorDetails.error || 'Request failed'
    },
    bubbles: true,
    cancelable: true
  };
}

/**
 * Test interpolation by applying values and checking results
 */
export function testInterpolation(element, config, expectedValues) {
  const extension = getExtension();
  if (!extension) {
    throw new Error('hx-optimistic extension not loaded');
  }
  
  // Apply the configuration
  element.setAttribute('data-optimistic', JSON.stringify(config));
  
  // Apply optimistic update
  extension.applyOptimistic(element, element, config);
  
  // Check results
  const results = {};
  Object.entries(expectedValues).forEach(([property, expectedValue]) => {
    if (property === 'textContent') {
      results[property] = element.textContent;
    } else if (property === 'innerHTML') {
      results[property] = element.innerHTML;
    } else if (property === 'className') {
      results[property] = element.className;
    } else if (property.startsWith('data-')) {
      results[property] = element.dataset[property.slice(5)];
    } else {
      results[property] = element[property];
    }
  });
  
  return results;
}

/**
 * Simulate a complete request lifecycle
 */
export async function simulateRequestLifecycle(element, options = {}) {
  const extension = getExtension();
  
  // Step 1: beforeRequest
  triggerHtmxEvent(element, 'htmx:beforeRequest');
  await nextTick();
  
  const results = {
    beforeRequest: {
      hasOptimisticClass: element.classList.contains('hx-optimistic'),
      textContent: element.textContent,
      innerHTML: element.innerHTML
    }
  };
  
  if (options.shouldError) {
    // Step 2: Error
    const errorEvent = createErrorEvent(element, options.errorDetails);
    triggerHtmxEvent(element, 'htmx:responseError', errorEvent.detail);
    await nextTick();
    
    results.afterError = {
      hasErrorClass: element.classList.contains('hx-optimistic-error'),
      textContent: element.textContent,
      innerHTML: element.innerHTML
    };
    
    // Step 3: Revert (if delay specified)
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay + 50));
      
      results.afterRevert = {
        hasRevertingClass: element.classList.contains('hx-optimistic-reverting'),
        hasCleanState: !element.classList.contains('hx-optimistic') &&
                       !element.classList.contains('hx-optimistic-error'),
        textContent: element.textContent,
        innerHTML: element.innerHTML
      };
    }
  } else {
    // Step 2: Success
    triggerHtmxEvent(element, 'htmx:afterSwap');
    await nextTick();
    
    results.afterSuccess = {
      hasCleanState: !element.classList.contains('hx-optimistic'),
      textContent: element.textContent,
      innerHTML: element.innerHTML
    };
  }
  
  return results;
}