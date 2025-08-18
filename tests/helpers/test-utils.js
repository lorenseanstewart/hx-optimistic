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
 * Trigger an HTMX event on an element
 */
export function triggerHtmxEvent(element, eventName, detail = {}) {
  const event = new CustomEvent(eventName, {
    detail: {
      elt: element,
      target: element,
      ...detail
    },
    bubbles: true,
    cancelable: true
  });
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
 * Create a template element for testing
 */
export function createTemplate(id, content) {
  const template = document.createElement('template');
  template.id = id;
  template.innerHTML = content;
  document.body.appendChild(template);
  return template;
}