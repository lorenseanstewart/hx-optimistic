/**
 * Test setup file for Vitest
 * Loads HTMX and the hx-optimistic extension into the test environment
 */

import { beforeAll, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

beforeAll(() => {
  // Create a comprehensive HTMX mock that matches the real API
  global.htmx = {
    version: '1.9.10',
    config: {
      defaultSwapStyle: 'innerHTML',
      defaultSwapDelay: 0
    },
    defineExtension: vi.fn((name, extension) => {
      global.htmx.extensions = global.htmx.extensions || {};
      global.htmx.extensions[name] = extension;
      console.log(`✓ Extension "${name}" registered`);
    }),
    process: vi.fn((element) => {
      // Mock process function that actually processes hx-* attributes
      if (element && element.setAttribute) {
        // Simulate htmx processing by ensuring hx-ext elements are marked
        if (element.getAttribute('hx-ext')) {
          element.classList.add('htmx-processed');
        }
      }
      return element;
    }),
    on: vi.fn(),
    trigger: vi.fn(),
    find: vi.fn((selector) => document.querySelector(selector)),
    findAll: vi.fn((selector) => Array.from(document.querySelectorAll(selector))),
    extensions: {},
    // Add methods that the extension might call
    swap: vi.fn(),
    settle: vi.fn(),
    values: vi.fn(() => ({})),
    closest: vi.fn((element, selector) => element.closest(selector))
  };

  // Make htmx available globally (needed for extension)
  global.window = global;
  global.window.htmx = global.htmx;

  // Load the hx-optimistic extension
  const extensionPath = path.join(__dirname, '../../hx-optimistic.js');
  const extensionCode = fs.readFileSync(extensionPath, 'utf8');
  
  try {
    // Execute the extension code in the global context
    eval(extensionCode);
    
    // Verify the extension was loaded
    if (!global.htmx.extensions.optimistic) {
      throw new Error('hx-optimistic extension was not properly loaded');
    }
    
    console.log('✓ hx-optimistic extension loaded successfully');
    console.log('Available extension methods:', Object.keys(global.htmx.extensions.optimistic));
  } catch (error) {
    console.error('Failed to load extension:', error);
    console.error('Extension code length:', extensionCode.length);
    throw error;
  }
});

afterEach(() => {
  // Clean up DOM after each test
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset HTMX mock call history
  if (global.htmx && global.htmx.defineExtension) {
    global.htmx.defineExtension.mockClear();
    global.htmx.process.mockClear();
    global.htmx.on && global.htmx.on.mockClear();
    global.htmx.trigger && global.htmx.trigger.mockClear();
  }
  
  // Clean up any error attributes set during testing
  const elements = document.querySelectorAll('[data-hx-optimistic-error-shown]');
  elements.forEach(el => {
    el.removeAttribute('data-hx-optimistic-error-shown');
  });
  
  // Clear any test-specific CSS classes
  const classElements = document.querySelectorAll('.hx-optimistic, .hx-optimistic-error, .hx-optimistic-reverting');
  classElements.forEach(el => {
    el.classList.remove('hx-optimistic', 'hx-optimistic-error', 'hx-optimistic-reverting');
  });
});