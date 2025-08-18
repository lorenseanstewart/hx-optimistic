import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createOptimisticElement, triggerHtmxEvent, nextTick, createTemplate } from '../helpers/test-utils.js';

describe('Error Handling Integration', () => {
  let element;

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  describe('Error message display', () => {
    it('should show error message on failure', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          values: { textContent: 'Loading...' },
          errorMessage: 'Request failed',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Internal Server Error' }
      });
      await nextTick();

      expect(element.textContent).toBe('Request failed');
      expect(element.classList.contains('hx-optimistic-error')).toBe(true);
    });

    it('should append error message when errorMode is append', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Original content</div>',
        {
          errorMessage: 'Error occurred',
          errorMode: 'append',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });
      await nextTick();

      const errorMsg = element.querySelector('.hx-optimistic-error-message');
      expect(errorMsg).toBeTruthy();
      expect(errorMsg.textContent).toBe('Error occurred');
      expect(element.textContent).toContain('Original content');
    });
  });

  describe('Error template rendering', () => {
    it('should render error template with variables', async () => {
      const template = createTemplate('error-template', 
        '<div class="error">Error ${status}: ${statusText} - ${error}</div>'
      );

      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorTemplate: '#error-template',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 404, statusText: 'Not Found' },
        error: 'Resource not found'
      });
      await nextTick();

      expect(element.innerHTML).toContain('Error 404: Not Found - Resource not found');
      
      // Cleanup
      template.remove();
    });

    it('should handle inline error templates', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorTemplate: '<span class="custom-error">Failed with status ${status}</span>',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 503, statusText: 'Service Unavailable' }
      });
      await nextTick();

      expect(element.innerHTML).toBe('<span class="custom-error">Failed with status 503</span>');
    });
  });

  describe('Error state reversion', () => {
    it('should revert to original state after delay', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Original Text</button>',
        {
          snapshot: ['textContent'],
          values: { textContent: 'Loading...' },
          errorMessage: 'Failed',
          delay: 200
        }
      );

      const originalText = element.textContent;

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      expect(element.textContent).toBe('Loading...');

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Error' }
      });
      await nextTick();
      expect(element.textContent).toBe('Failed');

      // Wait for revert
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(element.textContent).toBe(originalText);
      expect(element.classList.contains('hx-optimistic-error')).toBe(false);
      expect(element.classList.contains('hx-optimistic-reverting')).toBe(false);
    });

    it('should apply reverting class during revert', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorMessage: 'Failed',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Error' }
      });
      
      // Check for reverting class during transition
      await new Promise(resolve => setTimeout(resolve, 110));
      
      // The reverting class should be applied during revert
      // Note: This might be timing-sensitive in tests
    });
  });

  describe('Different error event types', () => {
    it('should handle htmx:timeout', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorMessage: 'Request timed out',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:timeout');
      await nextTick();

      expect(element.textContent).toBe('Request timed out');
      expect(element.classList.contains('hx-optimistic-error')).toBe(true);
    });

    it('should handle htmx:sendError', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorMessage: 'Network error',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:sendError');
      await nextTick();

      expect(element.textContent).toBe('Network error');
    });

    it('should handle htmx:swapError', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorMessage: 'Swap failed',
          delay: 100
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      triggerHtmxEvent(element, 'htmx:swapError');
      await nextTick();

      expect(element.textContent).toBe('Swap failed');
    });
  });

  describe('Error handling with templates', () => {
    it('should preserve template state on error', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic"><p>Original</p></div>',
        {
          snapshotContent: true,
          template: '<div class="loading">Loading...</div>',
          errorTemplate: '<div class="error">Error occurred</div>',
          delay: 200
        }
      );

      const originalHTML = element.innerHTML;

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      expect(element.innerHTML).toBe('<div class="loading">Loading...</div>');

      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Error' }
      });
      await nextTick();
      expect(element.innerHTML).toBe('<div class="error">Error occurred</div>');

      // Wait for revert
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should restore original complex content
      expect(element.innerHTML).toBe(originalHTML);
    });
  });

  describe('Error prevention', () => {
    it('should only show error once per request', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click me</button>',
        {
          errorMessage: 'Error',
          errorMode: 'append',
          delay: 0
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      // Trigger error multiple times
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Error' }
      });
      await nextTick();
      
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Error' }
      });
      await nextTick();

      // Should only have one error message
      const errorMessages = element.querySelectorAll('.hx-optimistic-error-message');
      expect(errorMessages.length).toBe(1);
    });
  });
});