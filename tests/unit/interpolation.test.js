import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOptimisticElement } from '../helpers/test-utils.js';

describe('Interpolation', () => {
  let element;
  let consoleWarnSpy;

  beforeEach(() => {
    // Spy on console.warn to test developer warnings
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Basic interpolation patterns', () => {
    it('should interpolate ${this.value} for input elements', () => {
      element = createOptimisticElement(
        '<input type="text" value="test value" hx-post="/api/test" hx-ext="optimistic">',
        {
          values: {
            textContent: 'Saving: ${this.value}'
          }
        }
      );

      // Trigger optimistic update
      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Saving: test value');
    });

    it('should interpolate ${this.textContent}', () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Original Text</div>',
        {
          values: {
            title: 'Was: ${this.textContent}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.title).toBe('Was: Original Text');
    });

    it('should interpolate ${this.dataset.key} for data attributes', () => {
      element = createOptimisticElement(
        '<button data-count="42" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Count: ${this.dataset.count}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Count: 42');
    });
  });

  describe('New interpolation helpers', () => {
    it('should support ${data:key} shorthand for data attributes', () => {
      element = createOptimisticElement(
        '<button data-user-id="123" data-user-name="John" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'User ${data:user-name} (ID: ${data:user-id})'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('User John (ID: 123)');
    });

    it('should support ${attr:name} for any attribute', () => {
      element = createOptimisticElement(
        '<a href="/page" title="My Page" hx-post="/api/test" hx-ext="optimistic">Link</a>',
        {
          values: {
            textContent: 'Link to ${attr:href} - ${attr:title}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Link to /page - My Page');
    });

    it('should handle missing attributes gracefully', () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Content</div>',
        {
          values: {
            textContent: 'Missing: ${data:nonexistent} and ${attr:missing}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      // Should keep the original pattern when attribute is missing
      expect(element.textContent).toBe('Missing: ${data:nonexistent} and ${attr:missing}');
    });
  });

  describe('Math expressions', () => {
    it('should evaluate Math.max with count variable', () => {
      element = createOptimisticElement(
        '<button data-count="5" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Result: ${Math.max(0, count - 1)}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Result: 4');
    });

    it('should evaluate Math.min with count variable', () => {
      element = createOptimisticElement(
        '<button data-count="10" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Capped: ${Math.min(count, 5)}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Capped: 5');
    });

    it('should handle complex arithmetic expressions', () => {
      element = createOptimisticElement(
        '<button data-count="10" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Result: ${(count + 5) * 2}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Result: 30');
    });

    it('should default count to 0 when data-count is missing', () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Count: ${count + 1}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('Count: 1');
    });
  });

  describe('Developer warnings', () => {
    it('should warn about unsupported querySelector patterns', () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Content</div>',
        {
          values: {
            textContent: 'Result: ${this.querySelector(".test")}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Unresolved interpolation pattern');
    });

    it('should warn about unsupported window references', () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Content</div>',
        {
          values: {
            textContent: 'URL: ${window.location.href}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Unresolved interpolation pattern');
    });

    it('should not warn about supported patterns', () => {
      element = createOptimisticElement(
        '<button data-test="value" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Valid: ${data:test} and ${this.textContent}'
          }
        }
      );

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error template interpolation', () => {
    it('should interpolate error variables in error templates', () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          errorTemplate: 'Error ${status}: ${statusText} - ${error}'
        }
      );

      const extension = global.htmx.extensions.optimistic;
      const evt = {
        detail: {
          xhr: {
            status: 404,
            statusText: 'Not Found'
          },
          error: 'Resource not found'
        }
      };

      extension.showError(element, { errorTemplate: 'Error ${status}: ${statusText} - ${error}' }, evt);

      expect(element.innerHTML).toBe('Error 404: Not Found - Resource not found');
    });
  });
});