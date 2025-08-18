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
   * Properties to snapshot before making optimistic changes
   * @example ["textContent", "innerHTML", "className", "data-state"]
   */
  snapshot?: string[];

  /**
   * When true, automatically preserves the entire innerHTML for complex rollbacks
   * Use for elements with rich content that will be completely replaced by templates
   */
  snapshotContent?: boolean;

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
   * Alternative name for template property
   */
  optimisticTemplate?: string;

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
   * Alternative name for errorMode property
   */
  errorTarget?: 'replace' | 'append';

  /**
   * Milliseconds before reverting to original state
   * Set to 0 to disable automatic revert
   * @default 2000
   */
  delay?: number;

  /**
   * Alternative name for delay property
   */
  revertDelay?: number;

  /**
   * Text to show for button elements during loading
   * Only used for smart defaults when no values/template provided
   * @default "Loading..."
   */
  loadingText?: string;
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
  handleAfterSwap(evt: Event): void;
  showError(targetElt: Element, config: OptimisticConfig, evt: Event): void;
  snapshot(elt: Element, sourceElt?: Element, token?: number): void;
  applyOptimistic(targetElt: Element, sourceElt?: Element): void;
  revertOptimistic(elt: Element, expectedToken?: number): void;
  cleanup(target: Element): void;
  precisionCleanup(target: Element): void;
  getTemplate(templateId: string): string | null;
  applyValues(targetElt: Element, values: Record<string, string>, sourceElt?: Element): void;
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