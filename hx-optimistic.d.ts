/**
 * TypeScript definitions for hx-optimistic
 * HTMX extension for optimistic UI updates with automatic rollback on errors
 * 
 * @version 1.0.0
 */

declare global {
  namespace htmx {
    interface HtmxExtensions {
      optimistic: OptimisticExtension;
    }
  }
}

/**
 * Configuration object for the hx-optimistic extension
 * Passed as JSON in the data-optimistic attribute
 */
export interface OptimisticConfig {
  /**
   * Simple property updates to apply immediately when request starts
   * @example { "textContent": "Loading...", "className": "btn loading" }
   */
  values?: Record<string, string>;

  /**
   * HTML template to show during request
   * If starts with "#": treated as template element ID
   * Otherwise: treated as inline HTML string
   * Supports ${...} variable substitution
   * @example "#loading-template" or "<div>Loading...</div>"
   */
  template?: string;

  /**
   * Optional selector chain (e.g. "closest .card", "find .target") to resolve the optimistic target
   * If omitted, uses the source element or hx-target when provided on the element
   */
  target?: string;

  /**
   * How to swap template content
   * - replace: sets innerHTML
   * - beforeend: insertAdjacentHTML('beforeend')
   * - afterbegin: insertAdjacentHTML('afterbegin')
   */
  swap?: 'replace' | 'beforeend' | 'afterbegin';

  /**
   * Custom CSS class to apply during optimistic update
   * @default "hx-optimistic"
   */
  class?: string;

  /**
   * Simple text message to show on error
   * Replaces element content unless errorMode is "append"
   */
  errorMessage?: string;

  /**
   * HTML template for rich error display
   * If starts with "#": template element ID
   * Otherwise: inline HTML string
   * Supports error variables: ${status}, ${statusText}, ${error}
   * @example "<div>Error ${status}: ${statusText}</div>"
   */
  errorTemplate?: string;

  /**
   * How to display error content
   * @default "replace"
   */
  errorMode?: 'replace' | 'append';

  /**
   * Milliseconds before reverting to original state
   * Set to 0 to disable automatic revert
   * @default 2000
   */
  delay?: number;

  /** Optional keys to snapshot for granular restore (defaults to innerHTML & className) */
  snapshot?: string[];

  /** Additional context merged into template interpolation */
  context?: Record<string, unknown>;
}

/**
 * Supported interpolation patterns in templates and values
 * All patterns use ${...} syntax
 */
export type InterpolationPattern =
  | '${this.value}'           // Element's value property
  | '${this.textContent}'     // Element's text content
  | '${this.dataset.key}'     // Data attribute (full syntax)
  | '${data:key}'             // Data attribute (shorthand)
  | '${attr:name}'            // Any attribute
  | '${Math.max(0, count)}'   // Math with count variable
  | '${Math.min(a, b)}'       // Math functions
  | '${status}'               // Error status (error templates only)
  | '${statusText}'           // Error text (error templates only)
  | '${error}';               // Error message (error templates only)

/**
 * Internal snapshot data structure
 * @internal
 */
interface SnapshotData {
  innerHTML: string;
  className: string;
  textContent?: string;
  fullContent?: string;
  sourceElement: Element;
  config: OptimisticConfig;
  token: number;
}

/**
 * The hx-optimistic extension implementation
 * @internal
 */
interface OptimisticExtension {
  onEvent(name: string, evt: Event): void;
  handleBeforeRequest(evt: Event): void;
  handleError(evt: Event): void;
  showError(targetElt: Element, config: OptimisticConfig, evt: Event): void;
  snapshot(targetElt: Element, sourceElt: Element, config: OptimisticConfig, token: number): void;
  applyOptimistic(targetElt: Element, sourceElt: Element, config: OptimisticConfig): void;
  revert(targetElt: Element, expectedToken?: number): void;
  cleanup(target: Element): void;
  getTemplate(templateId: string): string | null;
  applyValues(targetElt: Element, values: Record<string, string>, sourceElt: Element): void;
}

/**
 * HTML element with optimistic configuration
 * Extends HTMLElement to include the data-optimistic attribute
 */
declare global {
  interface HTMLElement {
    /**
     * JSON configuration for optimistic updates
     * @example '{"template": "#loading", "errorMessage": "Failed"}'
     */
    'data-optimistic'?: string;
  }
}

export {};