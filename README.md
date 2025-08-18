# hx-optimistic

An HTMX extension for optimistic UI updates with automatic rollback on errors.

## Features

- 🎯 **Optimistic Updates** - Show immediate UI feedback while requests are in-flight
- 🔄 **Automatic Rollback** - Revert to original state on errors
- 🎨 **Template Support** - Use HTML templates for rich loading and error states
- 🚫 **No CSS Included** - You control all styling through provided class names
- 📦 **Tiny** - ~2KB gzipped
- 🔧 **Configurable** - Fine-tune behavior per element

## Installation

### Via CDN

```html
<script src="https://unpkg.com/htmx.org"></script>
<script src="https://unpkg.com/hx-optimistic/hx-optimistic.js"></script>
```

### Via NPM

```bash
npm install hx-optimistic
```

```javascript
import "htmx.org";
import "hx-optimistic";
```

## Quick Start

Enable the extension on your body tag or specific elements:

```html
<body hx-ext="optimistic">
  <!-- Simple optimistic update -->
  <button
    hx-post="/api/like"
    hx-target="this"
    data-optimistic='{
            "snapshot": ["textContent"],
            "values": {
              "textContent": "❤️ Liked"
            }
          }'
  >
    🤍 Like
  </button>
</body>
```

## Configuration

Configure optimistic behavior using the `data-optimistic` attribute with JSON:

### Configuration Options Reference

All configuration options and their detailed explanations:

#### Snapshot Options

These control what gets preserved for potential rollback:

```javascript
{
  "snapshot": ["textContent", "innerHTML", "className", "data-state"],
  "snapshotContent": true
}
```

- **`snapshot`** _(array)_: List of specific element properties to preserve before making optimistic changes
  - `"textContent"` - Preserves the text content only (no HTML tags)
  - `"innerHTML"` - Preserves the complete HTML content inside the element
  - `"className"` - Preserves the complete CSS class string
  - `"data-*"` - Preserves specific data attributes (e.g., `"data-state"`, `"data-count"`)
  - Any other element property name (e.g., `"value"`, `"disabled"`)

- **`snapshotContent`** _(boolean)_: When `true`, automatically preserves the entire `innerHTML` for complex rollbacks. Use this for elements with rich content that will be completely replaced by templates.

#### Optimistic Update Options

These define what happens immediately when a request starts:

```javascript
{
  "values": {
    "textContent": "Loading...",
    "className": "btn loading",
    "data-state": "pending"
  },
  "optimisticTemplate": "#loading-template",
  "class": "hx-optimistic-custom"
}
```

- **`values`** _(object)_: Simple property updates to apply immediately
  - Key: Element property name (`textContent`, `innerHTML`, `className`, `data-*`, etc.)
  - Value: New value (can include template expressions like `"${this.dataset.count}"`)

- **`optimisticTemplate`** _(string)_: HTML content to show during request
  - If starts with `#`: Treated as template element ID (`"#my-template"`)
  - Otherwise: Treated as inline HTML string (`"<div>Loading...</div>"`)
  - Supports variable substitution with `${...}` syntax

- **`class`** _(string)_: Custom CSS class to apply during optimistic update (default: `"hx-optimistic"`)

#### Error Handling Options

These control what happens when requests fail:

```javascript
{
  "errorMessage": "Request failed",
  "errorTemplate": "#error-template",
  "errorTarget": "append",
  "revertDelay": 3000
}
```

- **`errorMessage`** _(string)_: Simple text message to show on error
  - Replaces element content unless `errorTarget` is set to `"append"`

- **`errorTemplate`** _(string)_: HTML template for rich error display
  - If starts with `#`: Template element ID
  - Otherwise: Inline HTML string
  - Supports variables: `${status}`, `${statusText}`, `${error}`, `${this.*}`
  - Example: `"<div>Error ${status}: ${statusText}</div>"`

- **`errorTarget`** _(string)_: How to display error content
  - `"replace"` _(default)_: Replace element content with error
  - `"append"`: Add error as a child element (preserves original content)

- **`revertDelay`** _(number)_: Milliseconds before reverting to original state
  - Default: `1500` (1.5 seconds)
  - Set to `0` to disable automatic revert (error state persists)

### Complete Example with All Options

```javascript
{
  // Snapshot configuration
  "snapshot": ["textContent", "className", "data-count"],
  "snapshotContent": false,

  // Optimistic state (choose one approach)
  "values": {
    "textContent": "Processing ${this.dataset.action}...",
    "className": "btn loading",
    "data-state": "pending"
  },
  // OR use a template
  "optimisticTemplate": "#processing-template",

  // Custom optimistic class
  "class": "hx-optimistic-processing",

  // Error handling
  "errorTemplate": "<div class='error'>Failed: ${status}</div>",
  "errorTarget": "append",
  "revertDelay": 2500
}
```

### Simple vs Template Approaches

**Simple Values Approach** - Good for basic text/class changes:

```javascript
{
  "snapshot": ["textContent"],
  "values": {
    "textContent": "Saving..."
  },
  "errorMessage": "Save failed"
}
```

**Template Approach** - Good for rich HTML content:

```javascript
{
  "snapshotContent": true,
  "optimisticTemplate": "<div class='saving'><spinner/> Saving...</div>",
  "errorTemplate": "<div class='error'>❌ Save failed</div>"
}
```

## CSS Classes

The extension provides these classes for styling:

```css
/* Applied during optimistic update */
.hx-optimistic {
  opacity: 0.7;
  background-color: #fef3c7;
}

/* Applied when request fails */
.hx-optimistic-error {
  background-color: #fee2e2;
  color: #dc2626;
}

/* Applied during revert animation */
.hx-optimistic-reverting {
  animation: fadeBack 0.3s ease-out;
}

/* Error messages appended to elements */
.hx-optimistic-error-message {
  padding: 0.5rem;
  margin-top: 0.25rem;
  border-radius: 0.25rem;
  background: #fee2e2;
  color: #dc2626;
  font-size: 0.875rem;
}
```

## Examples

### Inline Editing

```html
<div
  class="editable"
  hx-patch="/api/products/1/name"
  hx-trigger="blur from:input"
  hx-target="this"
  data-optimistic='{
       "snapshotContent": true,
       "optimisticTemplate": "<span class=\"saving\">Saving...</span>",
       "errorMessage": "Failed to save"
     }'
>
  <span
    onclick="this.style.display='none'; 
                 this.nextElementSibling.style.display='block';
                 this.nextElementSibling.focus();"
  >
    Click to edit
  </span>
  <input style="display:none" type="text" value="Click to edit" />
</div>
```

### Form Submission

```html
<form
  hx-post="/api/contact"
  hx-ext="optimistic"
  data-optimistic='{
        "snapshotContent": true,
        "optimisticTemplate": "<div class=\"success\">✓ Message sent!</div>",
        "errorTemplate": "<div class=\"error\">Failed to send. Please try again.</div>",
        "revertDelay": 3000
      }'
>
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Send Message</button>
</form>
```

### Like Button with Counter

```html
<button
  data-count="42"
  hx-post="/api/posts/1/like"
  hx-target="this"
  hx-ext="optimistic"
  data-optimistic='{
          "snapshot": ["textContent", "data-count"],
          "values": {
            "textContent": "❤️ ${parseInt(this.dataset.count) + 1}",
            "data-count": "${parseInt(this.dataset.count) + 1}"
          },
          "errorMessage": "Could not like post"
        }'
>
  🤍 42
</button>
```

### Shopping Cart

```html
<!-- Template for loading state -->
<template id="adding-to-cart">
  <div class="cart-feedback">
    <svg class="spinner">...</svg>
    <span>Adding to cart...</span>
  </div>
</template>

<!-- Template for error state -->
<template id="cart-error">
  <div class="alert alert-error">
    <h4>Could not add to cart</h4>
    <p>${status === 409 ? "Item already in cart" : "Please try again"}</p>
  </div>
</template>

<button
  hx-post="/api/cart/add/123"
  hx-ext="optimistic"
  data-optimistic='{
          "snapshotContent": true,
          "optimisticTemplate": "#adding-to-cart",
          "errorTemplate": "#cart-error",
          "revertDelay": 3000
        }'
>
  Add to Cart
</button>
```

### Field Validation

```html
<div class="form-field">
  <input
    type="email"
    name="email"
    hx-patch="/api/validate/email"
    hx-trigger="blur changed"
    hx-target="next .feedback"
    hx-ext="optimistic"
    data-optimistic='{
           "snapshot": ["innerHTML"],
           "optimisticTemplate": "<span class=\"validating\">Checking...</span>",
           "errorTemplate": "<span class=\"error\">Invalid email format</span>"
         }'
  />
  <div class="feedback"></div>
</div>
```

## Template Variables

Templates can use these variables with `${}` syntax:

### In Optimistic Templates

- `${this.property}` - Any property of the current element
- `${this.dataset.name}` - Data attributes
- `${parseInt(this.dataset.count) + 1}` - Simple expressions

### In Error Templates

- `${status}` - HTTP status code (404, 500, etc.)
- `${statusText}` - HTTP status text
- `${error}` - Error message
- `${this.property}` - Element properties still available

### Conditional Rendering

```html
"errorTemplate": "
<div>${status === 422 ? 'Validation failed' : 'Server error'}</div>
"
```

## Advanced Configuration

### Custom Classes

```javascript
{
  "class": "hx-optimistic-custom",  // Custom class instead of default
  "values": {
    "className": "my-loading-state"  // Complete className replacement
  }
}
```

### Complex Updates

```javascript
{
  // Snapshot multiple attributes
  "snapshot": ["textContent", "className", "data-state", "innerHTML"],

  // Update multiple properties
  "values": {
    "textContent": "Processing...",
    "className": "btn btn-loading",
    "data-state": "pending"
  }
}
```

### Append Error Messages

```javascript
{
  "errorMessage": "Network error occurred",
  "errorTarget": "append",  // Append instead of replace
  "revertDelay": 5000
}
```

### No Automatic Revert

```javascript
{
  "revertDelay": 0  // Don't automatically revert on error
}
```

## Events Handled

The extension responds to these HTMX events:

- `htmx:beforeRequest` - Applies optimistic state
- `htmx:afterSwap` - Confirms successful update
- `htmx:responseError` - Server returned an error
- `htmx:swapError` - Error during swap
- `htmx:timeout` - Request timed out
- `htmx:sendError` - Network error

## Testing

### Running Tests

The extension includes a comprehensive test suite using Mocha, Chai, and Sinon (all loaded via CDN). To run the tests:

**Option 1: Open in Browser**
```bash
# Open test.html directly in your browser
open test.html
# or on Linux/Windows
xdg-open test.html  # Linux
start test.html     # Windows
```

**Option 2: Using Local Server**
```bash
# Install a simple HTTP server if you don't have one
npm install -g http-server

# Serve the files and open tests
http-server -p 8080 -o test.html
```

**Option 3: Using the Package Scripts**
```bash
# If you've cloned the repo and have package.json
npm install
npm test        # Opens test.html in default browser
npm run dev     # Starts dev server on port 8080
```

### Test Coverage

The test suite covers:
- ✅ Basic optimistic updates
- ✅ Error handling and automatic rollback
- ✅ Template rendering (ID references and inline HTML)
- ✅ Dynamic value evaluation (`${this.dataset.*}`)
- ✅ Snapshot and restore functionality
- ✅ Error message handling (append vs replace)
- ✅ Custom CSS classes
- ✅ Conditional template expressions
- ✅ Multiple attribute snapshotting
- ✅ No-revert option (`revertDelay: 0`)

### Interactive Examples

To see the extension in action with working examples:

```bash
# Open the examples file
open examples.html
```

The examples page includes mock server responses and demonstrates all major features with visual feedback.

## Size

- Unminified: ~8KB
- Minified: ~3.5KB
- Gzipped: ~1.8KB

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Credits

Created for use with [HTMX](https://htmx.org) by the community.

## Changelog

### 1.0.0

- Initial release
- Template support
- Configurable rollback
- Error handling
- Simple expression evaluation
