import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTargetTestElement, triggerHtmxEvent, nextTick, getExtension, verifyWeakMapUsage } from '../helpers/test-utils.js';

describe('Target Resolution with sourceTargets WeakMap', () => {
  let testSetup;
  let extension;

  beforeEach(() => {
    extension = getExtension();
    expect(extension).toBeDefined();
  });

  afterEach(() => {
    if (testSetup && testSetup.container && testSetup.container.parentNode) {
      testSetup.container.parentNode.removeChild(testSetup.container);
    }
  });

  describe('Basic target resolution', () => {
    it('should resolve target to self when no hx-target specified', async () => {
      testSetup = createTargetTestElement({
        text: 'Click me',
        optimisticConfig: {
          values: {
            textContent: 'Loading...'
          }
        }
      });

      triggerHtmxEvent(testSetup.source, 'htmx:beforeRequest');
      await nextTick();

      expect(testSetup.source.textContent).toBe('Loading...');
      expect(testSetup.source.classList.contains('hx-optimistic')).toBe(true);
    });

    it('should resolve target using hx-target selector', async () => {
      testSetup = createTargetTestElement({
        text: 'Click me',
        hxTarget: '#test-target',
        optimisticConfig: {
          values: {
            textContent: 'Loading...'
          }
        }
      }, {
        id: 'test-target',
        text: 'Target content'
      });

      triggerHtmxEvent(testSetup.source, 'htmx:beforeRequest');
      await nextTick();

      expect(testSetup.target.textContent).toBe('Loading...');
      expect(testSetup.target.classList.contains('hx-optimistic')).toBe(true);
      expect(testSetup.source.textContent).toBe('Click me'); // Source unchanged
    });
  });

  describe('Closest selector resolution', () => {
    it('should resolve "closest" selector correctly', async () => {
      testSetup = createTargetTestElement({
        text: 'Click me',
        hxTarget: 'closest .parent',
        optimisticConfig: {
          values: {
            className: 'parent updated'
          }
        }
      }, {
        className: 'target',
        parent: 'parent',
        text: 'Target content'
      });

      triggerHtmxEvent(testSetup.source, 'htmx:beforeRequest');
      await nextTick();

      const parent = testSetup.container.querySelector('.parent');
      expect(parent.className).toBe('parent updated hx-optimistic');
    });
  });

  describe('Find selector resolution', () => {
    it('should resolve "find" selector correctly', async () => {
      testSetup = createTargetTestElement({
        text: 'Click me',
        hxTarget: 'find .target',
        optimisticConfig: {
          values: {
            textContent: 'Found and updated'
          }
        }
      }, {
        className: 'target',
        text: 'Original target'
      });

      triggerHtmxEvent(testSetup.source, 'htmx:beforeRequest');
      await nextTick();

      expect(testSetup.target.textContent).toBe('Found and updated');
      expect(testSetup.target.classList.contains('hx-optimistic')).toBe(true);
    });
  });

  describe('Next selector resolution', () => {
    it('should resolve "next" selector correctly', async () => {
      const container = document.createElement('div');
      const source = document.createElement('button');
      source.textContent = 'Click me';
      source.setAttribute('hx-post', '/api/test');
      source.setAttribute('hx-ext', 'optimistic');
      source.setAttribute('hx-target', 'next .target');
      source.setAttribute('data-optimistic', JSON.stringify({
        values: {
          textContent: 'Next element updated'
        }
      }));

      const sibling1 = document.createElement('div');
      sibling1.className = 'other';
      sibling1.textContent = 'Not target';

      const target = document.createElement('div');
      target.className = 'target';
      target.textContent = 'Target element';

      container.appendChild(source);
      container.appendChild(sibling1);
      container.appendChild(target);
      document.body.appendChild(container);

      triggerHtmxEvent(source, 'htmx:beforeRequest');
      await nextTick();

      expect(target.textContent).toBe('Next element updated');
      expect(target.classList.contains('hx-optimistic')).toBe(true);

      // Cleanup
      container.parentNode.removeChild(container);
    });
  });

  describe('Previous selector resolution', () => {
    it('should resolve "previous" selector correctly', async () => {
      const container = document.createElement('div');
      
      const target = document.createElement('div');
      target.className = 'target';
      target.textContent = 'Target element';

      const sibling1 = document.createElement('div');
      sibling1.className = 'other';
      sibling1.textContent = 'Not target';

      const source = document.createElement('button');
      source.textContent = 'Click me';
      source.setAttribute('hx-post', '/api/test');
      source.setAttribute('hx-ext', 'optimistic');
      source.setAttribute('hx-target', 'previous .target');
      source.setAttribute('data-optimistic', JSON.stringify({
        values: {
          textContent: 'Previous element updated'
        }
      }));

      container.appendChild(target);
      container.appendChild(sibling1);
      container.appendChild(source);
      document.body.appendChild(container);

      triggerHtmxEvent(source, 'htmx:beforeRequest');
      await nextTick();

      expect(target.textContent).toBe('Previous element updated');
      expect(target.classList.contains('hx-optimistic')).toBe(true);

      // Cleanup
      container.parentNode.removeChild(container);
    });
  });

  describe('sourceTargets WeakMap functionality', () => {
    it('should store source-target mapping in WeakMap during error handling', async () => {
      testSetup = createTargetTestElement({
        text: 'Click me',
        hxTarget: '#test-target',
        optimisticConfig: {
          values: {
            textContent: 'Loading...'
          },
          errorMessage: 'Failed',
          delay: 100
        }
      }, {
        id: 'test-target',
        text: 'Target content'
      });

      // Trigger optimistic update
      triggerHtmxEvent(testSetup.source, 'htmx:beforeRequest');
      await nextTick();

      expect(testSetup.target.textContent).toBe('Loading...');

      // Trigger error - should use sourceTargets WeakMap to find the target
      triggerHtmxEvent(testSetup.source, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });
      await nextTick();

      expect(testSetup.target.textContent).toBe('Failed');
      expect(testSetup.target.classList.contains('hx-optimistic-error')).toBe(true);

      // Verify no data leaked to dataset
      const verification = verifyWeakMapUsage(testSetup.source);
      expect(verification.hasNoWeakMapLeaks).toBe(true);
    });

    it('should handle error when source element has no stored target', async () => {
      const orphanSource = document.createElement('button');
      orphanSource.textContent = 'Orphan button';
      document.body.appendChild(orphanSource);

      // Trigger error on element that was never processed
      triggerHtmxEvent(orphanSource, 'htmx:responseError', {
        xhr: { status: 500, statusText: 'Server Error' }
      });
      await nextTick();

      // Should not throw error and should gracefully handle missing target
      expect(orphanSource.textContent).toBe('Orphan button');

      // Cleanup
      orphanSource.parentNode.removeChild(orphanSource);
    });
  });

  describe('Complex target scenarios', () => {
    it('should handle nested target resolution', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="outer">
          <div class="middle">
            <button hx-post="/api/test" 
                    hx-ext="optimistic" 
                    hx-target="closest .outer find .deep-target"
                    data-optimistic='{"values": {"textContent": "Deep target updated"}}'>
              Click me
            </button>
            <div class="inner">
              <div class="deep-target">Original deep content</div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const button = container.querySelector('button');
      const deepTarget = container.querySelector('.deep-target');

      triggerHtmxEvent(button, 'htmx:beforeRequest');
      await nextTick();

      expect(deepTarget.textContent).toBe('Deep target updated');
      expect(deepTarget.classList.contains('hx-optimistic')).toBe(true);

      // Cleanup
      container.parentNode.removeChild(container);
    });

    it('should handle target not found gracefully', async () => {
      testSetup = createTargetTestElement({
        text: 'Click me',
        hxTarget: '#nonexistent-target',
        optimisticConfig: {
          values: {
            textContent: 'Loading...'
          }
        }
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      triggerHtmxEvent(testSetup.source, 'htmx:beforeRequest');
      await nextTick();

      // Should warn about target not found
      expect(consoleSpy).toHaveBeenCalledWith(
        '[hx-optimistic] Target element not found for:',
        testSetup.source
      );

      // Source should remain unchanged
      expect(testSetup.source.textContent).toBe('Click me');
      expect(testSetup.source.classList.contains('hx-optimistic')).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});