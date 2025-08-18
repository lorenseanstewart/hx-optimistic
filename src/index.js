import { createExtension } from './extension.js';

(function () {
  'use strict';
  function define() {
    if (typeof htmx !== 'undefined') {
      htmx.defineExtension('optimistic', createExtension(htmx));
    }
  }
  if (typeof htmx !== 'undefined') {
    define();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (typeof htmx !== 'undefined') define();
    });
  }
})();


