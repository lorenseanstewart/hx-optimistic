/**
 * Test setup file for Vitest
 * Loads HTMX and the hx-optimistic extension into the test environment
 */

import { beforeAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

beforeAll(() => {
  // Load HTMX from CDN content (we'll fetch this or mock it)
  // For testing, we'll create a minimal HTMX mock
  global.htmx = {
    version: '1.9.10',
    config: {
      defaultSwapStyle: 'innerHTML',
      defaultSwapDelay: 0
    },
    defineExtension: vi.fn((name, extension) => {
      global.htmx.extensions = global.htmx.extensions || {};
      global.htmx.extensions[name] = extension;
    }),
    process: vi.fn((element) => {
      // Mock process function
      return element;
    }),
    on: vi.fn(),
    trigger: vi.fn(),
    extensions: {}
  };

  // Load the hx-optimistic extension
  const extensionPath = path.join(__dirname, '../../hx-optimistic.js');
  const extensionCode = fs.readFileSync(extensionPath, 'utf8');
  
  // Execute the extension code in the global context
  // Remove the IIFE wrapper and execute
  const codeToExecute = extensionCode
    .replace(/^\(function\(\)\s*{/, '')
    .replace(/}\)\(\);?\s*$/, '');
  
  try {
    // Create a function and execute it
    const func = new Function(codeToExecute);
    func.call(global);
  } catch (error) {
    console.error('Failed to load extension:', error);
  }
});

afterEach(() => {
  // Clean up DOM after each test
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset any global state
  if (global.htmx && global.htmx.extensions && global.htmx.extensions.optimistic) {
    // Clear any WeakMaps if we have access to them
  }
});