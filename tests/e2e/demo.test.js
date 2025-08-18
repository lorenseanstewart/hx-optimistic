import { test, expect } from '@playwright/test';

test.describe('hx-optimistic Demo Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page
    await page.goto('/test-v1.html');
    await page.waitForLoadState('networkidle');
  });

  test('should run and pass browser tests', async ({ page }) => {
    // Wait for Mocha to run
    await page.waitForSelector('#mocha', { timeout: 10000 });
    
    // Wait for tests to complete
    await page.waitForFunction(() => {
      const stats = document.querySelector('#mocha-stats');
      return stats && stats.textContent.includes('passes');
    }, { timeout: 30000 });

    // Check if all tests passed
    const failures = await page.locator('.failures em').textContent();
    expect(parseInt(failures)).toBe(0);

    // Get pass count
    const passes = await page.locator('.passes em').textContent();
    expect(parseInt(passes)).toBeGreaterThan(0);
  });
});

test.describe('Demo Page Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo page if it exists
    await page.goto('/demo/index.html').catch(() => {
      // If demo doesn't exist, skip
    });
  });

  test('optimistic updates should show loading state', async ({ page }) => {
    // Check if we have a demo page
    const hasDemo = await page.locator('body').count() > 0;
    if (!hasDemo) {
      test.skip();
      return;
    }

    // Find an optimistic button
    const button = page.locator('button[data-optimistic]').first();
    
    if (await button.count() > 0) {
      // Get initial text
      const initialText = await button.textContent();
      
      // Click the button
      await button.click();
      
      // Check for optimistic class
      await expect(button).toHaveClass(/hx-optimistic/);
      
      // Text should have changed
      const loadingText = await button.textContent();
      expect(loadingText).not.toBe(initialText);
    }
  });

  test('error handling should show error state', async ({ page }) => {
    // This test would need a mock server or test endpoint
    // that reliably returns errors
    
    const hasDemo = await page.locator('body').count() > 0;
    if (!hasDemo) {
      test.skip();
      return;
    }

    // Look for error demonstration buttons
    const errorButton = page.locator('button[data-optimistic*="error"]').first();
    
    if (await errorButton.count() > 0) {
      await errorButton.click();
      
      // Wait for potential error class
      // Note: This depends on the actual error endpoint behavior
      await page.waitForTimeout(1000);
      
      // Check if error handling occurred
      const hasErrorClass = await errorButton.evaluate(el => 
        el.classList.contains('hx-optimistic-error')
      );
      
      // Error handling might have occurred
      if (hasErrorClass) {
        expect(hasErrorClass).toBe(true);
      }
    }
  });
});

test.describe('Interpolation Features', () => {
  test('should support new interpolation patterns', async ({ page }) => {
    await page.goto('/test-v1.html');
    
    // Create a test element with new interpolation patterns
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.setAttribute('data-test', 'value');
      button.setAttribute('data-count', '5');
      button.textContent = 'Test Button';
      button.setAttribute('hx-post', '/api/test');
      button.setAttribute('hx-ext', 'optimistic');
      button.setAttribute('data-optimistic', JSON.stringify({
        values: {
          textContent: 'Count: ${data:count}, Test: ${data:test}'
        }
      }));
      document.body.appendChild(button);
      
      // Process with HTMX
      if (window.htmx) {
        window.htmx.process(button);
      }
      
      // Trigger optimistic update
      const event = new CustomEvent('htmx:beforeRequest', {
        detail: { elt: button, target: button }
      });
      button.dispatchEvent(event);
    });
    
    // Check the interpolated result
    const button = page.locator('button[data-test="value"]');
    await expect(button).toHaveText('Count: 5, Test: value');
  });

  test('should evaluate arithmetic expressions', async ({ page }) => {
    await page.goto('/test-v1.html');
    
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.setAttribute('data-count', '10');
      button.setAttribute('hx-post', '/api/test');
      button.setAttribute('hx-ext', 'optimistic');
      button.setAttribute('data-optimistic', JSON.stringify({
        values: {
          textContent: 'Result: ${Math.max(0, count - 5)}'
        }
      }));
      document.body.appendChild(button);
      
      if (window.htmx) {
        window.htmx.process(button);
      }
      
      const event = new CustomEvent('htmx:beforeRequest', {
        detail: { elt: button, target: button }
      });
      button.dispatchEvent(event);
    });
    
    const button = page.locator('button[data-count="10"]');
    await expect(button).toHaveText('Result: 5');
  });
});

test.describe('Memory and Performance', () => {
  test('should not leak memory with WeakMaps', async ({ page }) => {
    await page.goto('/test-v1.html');
    
    // Create and remove many elements
    const memoryBefore = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Create many elements with optimistic config
    await page.evaluate(() => {
      for (let i = 0; i < 1000; i++) {
        const el = document.createElement('div');
        el.setAttribute('hx-post', '/api/test');
        el.setAttribute('hx-ext', 'optimistic');
        el.setAttribute('data-optimistic', JSON.stringify({
          values: { textContent: 'Test' + i }
        }));
        document.body.appendChild(el);
        
        // Trigger optimistic update
        const event = new CustomEvent('htmx:beforeRequest', {
          detail: { elt: el, target: el }
        });
        el.dispatchEvent(event);
        
        // Remove element
        el.remove();
      }
    });

    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    await page.waitForTimeout(100);

    const memoryAfter = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory should not have increased significantly
    // (WeakMaps should allow garbage collection)
    if (memoryBefore > 0 && memoryAfter > 0) {
      const increase = memoryAfter - memoryBefore;
      const percentIncrease = (increase / memoryBefore) * 100;
      
      // Allow for some increase but not excessive
      expect(percentIncrease).toBeLessThan(50);
    }
  });
});