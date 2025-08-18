# hx-optimistic Testing

This directory contains comprehensive tests for the hx-optimistic extension.

## Test Structure

```
tests/
├── unit/           # Pure function tests (fast)
│   ├── interpolation.test.js
│   └── arithmetic.test.js
├── integration/    # HTMX integration tests 
│   ├── basic-updates.test.js
│   └── error-handling.test.js
├── e2e/           # Full browser tests
│   └── demo.test.js
├── fixtures/       # Test HTML templates
└── helpers/        # Test utilities
    ├── setup.js
    └── test-utils.js
```

## Running Tests

### All Tests
```bash
npm test                    # Run unit & integration tests in watch mode
npm run test:run           # Run tests once
npm run test:all           # Run unit, integration, and E2E tests
```

### Specific Test Types
```bash
npm run test:coverage      # Run with coverage report
npm run test:ui           # Open Vitest UI
npm run test:e2e          # Run Playwright E2E tests
npm run test:browser      # Open manual test page
```

### Manual Testing
```bash
npm run test:browser      # Opens test-v1.html for manual testing
```

## Test Categories

### Unit Tests
- Test pure functions without DOM/HTMX
- Interpolation patterns
- Arithmetic evaluation
- Config normalization

### Integration Tests
- Test HTMX event interactions
- WeakMap storage behavior
- Error handling flows
- Template rendering

### E2E Tests
- Real browser scenarios
- Demo functionality
- Memory leak detection
- Cross-browser compatibility

## Writing Tests

### Unit Test Example
```javascript
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should work correctly', () => {
    // Test pure function behavior
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example
```javascript
import { createOptimisticElement, triggerHtmxEvent } from '../helpers/test-utils.js';

it('should handle HTMX events', async () => {
  const element = createOptimisticElement(
    '<button hx-post="/api/test">Click</button>',
    { values: { textContent: 'Loading...' } }
  );
  
  triggerHtmxEvent(element, 'htmx:beforeRequest');
  expect(element.textContent).toBe('Loading...');
});
```

### E2E Test Example
```javascript
import { test, expect } from '@playwright/test';

test('demo should work', async ({ page }) => {
  await page.goto('/demo');
  await page.click('button[data-optimistic]');
  await expect(page.locator('.hx-optimistic')).toBeVisible();
});
```

## Coverage

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - Visual report
- `coverage/lcov.info` - LCOV format for CI

Target coverage thresholds:
- Branches: 85%
- Functions: 90%
- Lines: 90%
- Statements: 90%

## CI/CD

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Multiple Node.js versions (16, 18, 20)
- Multiple browsers (Chrome, Firefox, Safari)

## Manual Testing

For quick manual testing during development:

1. Open `test-v1.html` in your browser
2. Use `test.html` for legacy comparison
3. Check browser console for test results
4. All tests should pass in green

## Debugging

### Vitest Debugging
```bash
npm run test:ui    # Visual test runner
```

### Playwright Debugging
```bash
npx playwright test --debug
npx playwright test --headed
```

### Browser DevTools
Open `test-v1.html` and use browser DevTools to:
- Inspect DOM changes
- Monitor console warnings
- Check network requests
- Debug extension behavior

## Test Utilities

The `helpers/test-utils.js` provides utilities:
- `createOptimisticElement()` - Create test elements
- `triggerHtmxEvent()` - Simulate HTMX events
- `waitFor()` - Wait for conditions
- `nextTick()` - Wait for next event loop
- `createTemplate()` - Create template elements

## Performance Testing

E2E tests include memory leak detection:
- Creates many elements with optimistic config
- Removes elements
- Checks memory usage
- Ensures WeakMaps allow garbage collection