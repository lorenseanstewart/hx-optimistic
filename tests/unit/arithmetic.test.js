import { describe, it, expect } from 'vitest';

// We'll need to extract the arithmetic functions from the extension
// For now, we'll test through the interpolation interface

describe('Arithmetic Evaluator', () => {
  describe('Basic operations', () => {
    it('should evaluate addition', () => {
      const element = document.createElement('div');
      element.dataset.count = '5';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count + 3}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('8');
    });

    it('should evaluate subtraction', () => {
      const element = document.createElement('div');
      element.dataset.count = '10';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count - 3}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('7');
    });

    it('should evaluate multiplication', () => {
      const element = document.createElement('div');
      element.dataset.count = '4';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count * 3}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('12');
    });

    it('should evaluate division', () => {
      const element = document.createElement('div');
      element.dataset.count = '12';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count / 3}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('4');
    });
  });

  describe('Parentheses and precedence', () => {
    it('should respect parentheses', () => {
      const element = document.createElement('div');
      element.dataset.count = '2';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${(count + 3) * 4}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('20'); // (2 + 3) * 4 = 20
    });

    it('should follow operator precedence without parentheses', () => {
      const element = document.createElement('div');
      element.dataset.count = '2';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count + 3 * 4}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('14'); // 2 + (3 * 4) = 14
    });

    it('should handle nested parentheses', () => {
      const element = document.createElement('div');
      element.dataset.count = '5';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${((count + 1) * 2) - 3}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('9'); // ((5 + 1) * 2) - 3 = 9
    });
  });

  describe('Math functions', () => {
    it('should evaluate Math.max with two arguments', () => {
      const element = document.createElement('div');
      element.dataset.count = '3';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${Math.max(count, 5)}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('5');
    });

    it('should evaluate Math.max with expressions', () => {
      const element = document.createElement('div');
      element.dataset.count = '10';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${Math.max(0, count - 15)}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('0'); // max(0, -5) = 0
    });

    it('should evaluate Math.min', () => {
      const element = document.createElement('div');
      element.dataset.count = '10';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${Math.min(count, 5)}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('5');
    });

    it('should handle Math functions with multiple arguments', () => {
      const element = document.createElement('div');
      element.dataset.count = '7';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${Math.max(1, count, 5)}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('7');
    });

    it('should handle nested Math functions', () => {
      const element = document.createElement('div');
      element.dataset.count = '10';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${Math.min(Math.max(0, count - 5), 3)}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('3'); // min(max(0, 5), 3) = min(5, 3) = 3
    });
  });

  describe('Edge cases', () => {
    it('should handle decimal numbers', () => {
      const element = document.createElement('div');
      element.dataset.count = '3.5';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count * 2}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('7');
    });

    it('should handle missing count (default to 0)', () => {
      const element = document.createElement('div');
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count + 10}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      expect(element.textContent).toBe('10');
    });

    it('should handle invalid expressions gracefully', () => {
      const element = document.createElement('div');
      element.dataset.count = '5';
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${count ++ 3}' } // Invalid syntax
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      // Should keep the original pattern when evaluation fails
      expect(element.textContent).toBe('${count ++ 3}');
    });

    it('should not evaluate dangerous expressions', () => {
      const element = document.createElement('div');
      element.setAttribute('data-optimistic', JSON.stringify({
        values: { textContent: '${eval("alert(1)")}' }
      }));

      const extension = global.htmx.extensions.optimistic;
      extension.applyOptimistic(element, element);

      // Should not execute and keep the original pattern
      expect(element.textContent).toBe('${eval("alert(1)")}');
    });
  });
});