import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOptimisticElement, triggerHtmxEvent, nextTick, waitFor } from '../helpers/test-utils.js';

describe('Basic Optimistic Updates Integration', () => {
  let element;

  beforeEach(() => {
    // Ensure extension is loaded
    expect(global.htmx.extensions.optimistic).toBeDefined();
  });

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  describe('Optimistic state application', () => {
    it('should apply optimistic values on beforeRequest', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          values: {
            textContent: 'Loading...',
            className: 'btn loading'
          }
        }
      );

      // Trigger beforeRequest event
      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.textContent).toBe('Loading...');
      expect(element.className).toBe('btn loading hx-optimistic');
    });

    it('should apply template on beforeRequest', async () => {
      // Create a template
      const template = document.createElement('template');
      template.id = 'loading-template';
      template.innerHTML = '<span class="spinner">Loading...</span>';
      document.body.appendChild(template);

      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          template: '#loading-template'
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.innerHTML).toBe('<span class="spinner">Loading...</span>');
      expect(element.classList.contains('hx-optimistic')).toBe(true);

      // Cleanup
      template.remove();
    });

    it('should handle inline template strings', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          template: '<div class="custom-loading">Please wait...</div>'
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.innerHTML).toBe('<div class="custom-loading">Please wait...</div>');
    });
  });

  describe('Snapshot functionality', () => {
    it('should snapshot specified properties', async () => {
      element = createOptimisticElement(
        '<button class="original-class" hx-post="/api/test" hx-ext="optimistic">Original Text</button>',
        {
          snapshot: ['textContent', 'className'],
          values: {
            textContent: 'Loading...',
            className: 'loading'
          }
        }
      );

      const originalText = element.textContent;
      const originalClass = element.className;

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      // Values should be changed
      expect(element.textContent).toBe('Loading...');
      expect(element.className).not.toContain('original-class');

      // Trigger error to revert
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });

      // Wait for revert (default delay)
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Should be reverted
      expect(element.textContent).toBe(originalText);
      expect(element.className).toContain('original-class');
    });

    it('should handle snapshotContent flag', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic"><p>Complex</p><span>Content</span></div>',
        {
          snapshotContent: true,
          template: '<div>Loading...</div>'
        }
      );

      const originalHTML = element.innerHTML;

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.innerHTML).toBe('<div>Loading...</div>');

      // Trigger error
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });

      // Wait for revert
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Complex content should be restored
      expect(element.innerHTML).toBe(originalHTML);
    });
  });

  describe('Cleanup on success', () => {
    it('should remove optimistic class on afterSwap', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          values: { textContent: 'Loading...' }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.classList.contains('hx-optimistic')).toBe(true);

      // Simulate successful swap
      triggerHtmxEvent(element, 'htmx:afterSwap');
      await nextTick();

      expect(element.classList.contains('hx-optimistic')).toBe(false);
    });
  });

  describe('Multiple requests handling', () => {
    it('should handle concurrent requests with tokens', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          values: { textContent: 'Loading...' },
          errorMessage: 'Error',
          delay: 100
        }
      );

      // First request
      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      expect(element.textContent).toBe('Loading...');

      // Second request before first completes
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: 'Loading again...' },
        errorMessage: 'Error 2',
        delay: 100
      }));
      
      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      expect(element.textContent).toBe('Loading again...');

      // First request fails (should be ignored due to token mismatch)
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });
      await nextTick();

      // Should show the second request's error, not the first
      expect(element.textContent).toBe('Error 2');
    });
  });

  describe('Custom class support', () => {
    it('should apply custom optimistic class', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          class: 'custom-optimistic-class',
          values: { textContent: 'Loading...' }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.classList.contains('custom-optimistic-class')).toBe(true);
      expect(element.classList.contains('hx-optimistic')).toBe(true); // Default also applied
    });
  });

  describe('No automatic revert option', () => {
    it('should not revert when delay is 0', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          values: { textContent: 'Loading...' },
          errorMessage: 'Error occurred',
          delay: 0
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });
      await nextTick();

      expect(element.textContent).toBe('Error occurred');

      // Wait to ensure no revert happens
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should still show error
      expect(element.textContent).toBe('Error occurred');
      expect(element.classList.contains('hx-optimistic-error')).toBe(true);
    });
  });
});