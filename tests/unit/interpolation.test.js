import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOptimisticElement, createTestForm, triggerHtmxEvent, nextTick, verifyWeakMapUsage } from '../helpers/test-utils.js';

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
    it('should interpolate ${this.value} for input elements', async () => {
      element = createOptimisticElement(
        '<input type="text" value="test value" hx-post="/api/test" hx-ext="optimistic">',
        {
          values: {
            textContent: 'Saving: ${this.value}'
          }
        }
      );

      // Trigger optimistic update through HTMX event
      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.textContent).toBe('Saving: test value');
    });

    it('should interpolate ${this.textContent}', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Original Text</div>',
        {
          values: {
            title: 'Was: ${this.textContent}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.title).toBe('Was: Original Text');
    });

    it('should interpolate ${this.dataset.key} for data attributes', async () => {
      element = createOptimisticElement(
        '<button data-count="42" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Count: ${this.dataset.count}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.textContent).toBe('Count: 42');
    });
  });

  describe('New interpolation helpers', () => {
    it('should support ${data:key} shorthand for data attributes', async () => {
      element = createOptimisticElement(
        '<button data-user-id="123" data-user-name="John" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'User ${data:user-name} (ID: ${data:user-id})'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.textContent).toBe('User John (ID: 123)');
    });

    it('should support ${attr:name} for any attribute', async () => {
      element = createOptimisticElement(
        '<a href="/page" title="My Page" hx-post="/api/test" hx-ext="optimistic">Link</a>',
        {
          values: {
            textContent: 'Link to ${attr:href} - ${attr:title}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(element.textContent).toBe('Link to /page - My Page');
    });

    it('should handle missing attributes gracefully', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Content</div>',
        {
          values: {
            textContent: 'Missing: ${data:nonexistent} and ${attr:missing}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      // Should keep the original pattern when attribute is missing
      expect(element.textContent).toBe('Missing: ${data:nonexistent} and ${attr:missing}');
    });
  });

  describe('Form field interpolation', () => {
    let form;

    afterEach(() => {
      if (form && form.parentNode) {
        form.parentNode.removeChild(form);
      }
    });

    it('should interpolate ${textarea} from form', async () => {
      form = createTestForm({
        comment: 'This is my comment',
        optimisticConfig: {
          values: {
            textContent: 'Posting: ${textarea}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('Posting: This is my comment');
    });

    it('should interpolate ${email} from form', async () => {
      form = createTestForm({
        email: 'user@example.com',
        optimisticConfig: {
          values: {
            textContent: 'Email: ${email}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('Email: user@example.com');
    });

    it('should interpolate ${password} from form', async () => {
      form = createTestForm({
        password: 'secret123',
        optimisticConfig: {
          values: {
            textContent: 'Password: ${password}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('Password: secret123');
    });

    it('should interpolate ${url} from form', async () => {
      form = createTestForm({
        website: 'https://mysite.com',
        optimisticConfig: {
          values: {
            textContent: 'Website: ${url}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('Website: https://mysite.com');
    });

    it('should interpolate ${tel} from form', async () => {
      form = createTestForm({
        phone: '555-0123',
        optimisticConfig: {
          values: {
            textContent: 'Phone: ${tel}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('Phone: 555-0123');
    });

    it('should interpolate ${search} from form', async () => {
      form = createTestForm({
        query: 'my search query',
        optimisticConfig: {
          values: {
            textContent: 'Search: ${search}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('Search: my search query');
    });

    it('should handle multiple form field interpolations', async () => {
      form = createTestForm({
        username: 'john',
        email: 'john@example.com',
        comment: 'Hello world',
        optimisticConfig: {
          values: {
            textContent: 'User ${text} (${email}): ${textarea}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('User john (john@example.com): Hello world');
    });

    it('should handle form fields by name', async () => {
      form = createTestForm({
        username: 'testuser',
        optimisticConfig: {
          values: {
            textContent: 'User: ${username}'
          }
        }
      });

      triggerHtmxEvent(form, 'htmx:beforeRequest');
      await nextTick();

      expect(form.textContent).toContain('User: testuser');
    });
  });

  describe('Developer warnings', () => {
    it('should warn about unsupported querySelector patterns', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Content</div>',
        {
          values: {
            textContent: 'Result: ${this.querySelector(".test")}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Unresolved interpolation pattern');
    });

    it('should warn about unsupported window references', async () => {
      element = createOptimisticElement(
        '<div hx-post="/api/test" hx-ext="optimistic">Content</div>',
        {
          values: {
            textContent: 'URL: ${window.location.href}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Unresolved interpolation pattern');
    });

    it('should not warn about supported patterns', async () => {
      element = createOptimisticElement(
        '<button data-test="value" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Valid: ${data:test} and ${this.textContent}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should warn about Math expressions since arithmetic was removed', async () => {
      element = createOptimisticElement(
        '<button data-count="5" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Result: ${Math.max(0, count)}'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Unresolved interpolation pattern');
    });
  });

  describe('WeakMap usage verification', () => {
    it('should not store data in element dataset', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          values: {
            textContent: 'Loading...'
          }
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();

      const verification = verifyWeakMapUsage(element);
      expect(verification.hasNoWeakMapLeaks).toBe(true);
      expect(verification.leakedKeys).toEqual([]);
    });
  });

  describe('Error template interpolation', () => {
    it('should interpolate error variables in error templates', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          errorTemplate: 'Error ${status}: ${statusText} - ${error}'
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: {
          status: 404,
          statusText: 'Not Found'
        },
        error: 'Resource not found'
      });
      await nextTick();

      expect(element.innerHTML).toBe('Error 404: Not Found - Resource not found');
    });

    it('should handle missing error data gracefully', async () => {
      element = createOptimisticElement(
        '<button hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          errorTemplate: 'Error ${status}: ${statusText} - ${error}'
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      
      triggerHtmxEvent(element, 'htmx:responseError', {});
      await nextTick();

      expect(element.innerHTML).toBe('Error 0: Network Error - Request failed');
    });

    it('should interpolate error variables with source element data', async () => {
      element = createOptimisticElement(
        '<button data-context="user-profile" hx-post="/api/test" hx-ext="optimistic">Click</button>',
        {
          errorTemplate: 'Error ${status} in ${data:context}: ${error}'
        }
      );

      triggerHtmxEvent(element, 'htmx:beforeRequest');
      await nextTick();
      
      triggerHtmxEvent(element, 'htmx:responseError', {
        xhr: {
          status: 403,
          statusText: 'Forbidden'
        },
        error: 'Access denied'
      });
      await nextTick();

      expect(element.innerHTML).toBe('Error 403 in user-profile: Access denied');
    });
  });
});