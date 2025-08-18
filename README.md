# hx-optimistic

A lightweight HTMX extension for optimistic UI updates with automatic rollback on errors. Show immediate user feedback while requests are in-flight, with intelligent error handling and seamless state management.

## ✨ Features

- 🎯 **Optimistic Updates** - Immediate UI feedback while requests are processing
- 🔄 **Automatic Rollback** - Intelligent revert to original state on errors
- 📝 **Input Interpolation** - Dynamic templates with `${this.value}`, `${textarea}`, `${data:key}` helpers
- 🎨 **Template Support** - Rich HTML templates for loading and error states
- ⚠️ **Developer Warnings** - Console warnings for unsupported patterns
- 🚫 **No CSS Required** - You control all styling through provided class names
- 📦 **Tiny** - Only **13.5KB** uncompressed, **8.8KB** minified, **3.1KB** gzipped
- 🔧 **Highly Configurable** - Fine-tune behavior per element

## 🚀 Quick Start

### Installation

**Via CDN:**
```html
<script src="https://unpkg.com/htmx.org"></script>
<script src="https://cdn.jsdelivr.net/npm/hx-optimistic@latest/hx-optimistic.min.js"></script>
```

**Via NPM:**
```bash
npm install hx-optimistic
```

### Basic Usage

Enable the extension and add optimistic behavior to any HTMX element:

```html
<body hx-ext="optimistic">
  <!-- Simple like button with optimistic updates -->
  <button
    hx-post="/api/like"
    hx-target="this"
    hx-swap="outerHTML"
    data-optimistic='{"values":{"textContent":"❤️ Liked!","className":"btn liked"},"errorMessage":"Failed to like"}'
  >
    🤍 Like
  </button>
</body>
```

## 🎯 Core Concepts

### Values vs Templates

**Values** - Perfect for simple optimistic updates:
```html
<button 
  data-count="42" 
  data-liked="false"
  hx-post="/api/like"
  hx-target="this" 
  hx-swap="outerHTML"
  data-optimistic='{
    "values": {
      "textContent": "❤️ Liked! (${count + 1})",  // Show liked state with +1 count
      "className": "btn liked",
      "data-liked": "true"
    }
  }'>
  🤍 Like (42)
</button>
```

**Templates** - Ideal for complex optimistic UI changes:
```html
<form hx-post="/api/comments" hx-target=".comments" hx-swap="beforeend"
      data-optimistic='{
        "template": "<div class='comment optimistic'><strong>You:</strong> ${textarea}</div>",
        "errorTemplate": "<div class='error'>❌ Comment failed to post</div>"
      }'>
  <textarea name="comment" placeholder="Your comment here"></textarea>
  <button type="submit">Post Comment</button>
</form>
```

### Input Interpolation

Dynamic content using `${...}` syntax with powerful helpers:

```html
<form hx-post="/api/comments" hx-ext="optimistic"
      data-optimistic='{"template":"<div>Posting: ${textarea}</div>"}'>
  <textarea name="comment">Your comment here</textarea>
  <button type="submit">Post</button>
</form>
```

## 📖 Interpolation Reference

All `${...}` patterns supported in templates and values:

| Pattern | Description | Example |
|---------|-------------|---------|
| `${this.value}` | Element's input value | `"Saving: ${this.value}"` |
| `${this.textContent}` | Element's text content | `"Was: ${this.textContent}"` |
| `${textarea}` | First textarea in form | `"Comment: ${textarea}"` |
| `${email}` | First email input | `"Email: ${email}"` |
| `${data:key}` | Data attribute shorthand | `"Count: ${data:count}"` |
| `${attr:name}` | Any HTML attribute | `"ID: ${attr:id}"` |
| `${status}` | HTTP status (errors only) | `"Error ${status}"` |
| `${error}` | Error message (errors only) | `"Failed: ${error}"` |

**Form Field Helpers:**
- `${textarea}`, `${email}`, `${password}`, `${text}`, `${url}`, `${tel}`, `${search}`
- `${fieldName}` - Any field with `name="fieldName"`

## ⚙️ Configuration Options

Complete configuration reference for `data-optimistic`:

### Snapshot Options
```javascript
{
  "snapshot": ["textContent", "className", "data-count"],  // Specific properties
  "snapshotContent": true  // Full innerHTML backup
}
```

### Optimistic Updates
```javascript
{
  // Simple property updates
  "values": {
    "textContent": "Loading...",
    "className": "btn loading"
  },
  
  // Rich HTML templates
  "template": "#loading-template",  // Or inline HTML
  "target": "closest .card",       // Different target for optimistic update
  "swap": "beforeend"              // Append instead of replace
}
```

### Error Handling
```javascript
{
  "errorMessage": "Request failed",
  "errorTemplate": "<div class='error'>Error ${status}: ${statusText}</div>",
  "errorMode": "append",  // "replace" (default) or "append"
  "delay": 2000          // Auto-revert delay in ms
}
```

## 🎨 CSS Classes

Style the different states with these automatically applied classes:

```css
/* During optimistic update */
.hx-optimistic {
  opacity: 0.8;
  background-color: #bfdbfe;
  box-shadow: 0 0 0 2px #3b82f6;
  transition: all 0.2s ease-in-out;
}

/* During error state */
.hx-optimistic-error {
  background-color: #fee2e2;
  color: #dc2626;
  box-shadow: 0 0 0 2px #ef4444;
}

/* During revert animation */
.hx-optimistic-reverting {
  animation: fadeBack 0.3s ease-out;
}

/* Appended error messages */
.hx-optimistic-error-message {
  padding: 0.5rem;
  margin-top: 0.25rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 0.25rem;
}
```

## 📚 Examples

For comprehensive examples and patterns, see the [demo documentation](demo/README.md) which includes:

- **Like Button** - Toggle states with counter updates
- **Comment System** - Input interpolation with `${textarea}` 
- **Inline Editing** - Click-to-edit with validation
- **Status Toggle** - Rich templates with attribute helpers
- **Product Rating** - Complex data interpolation patterns
- **Error Handling** - Different error modes and recovery

Each example includes complete working code, API endpoints, and detailed explanations of the patterns used.

## 🔧 Developer Features

### Console Warnings
The extension provides helpful warnings for unsupported patterns:

```javascript
// ❌ These will show console warnings
"${this.querySelector('.test')}"    // DOM queries not allowed
"${window.location.href}"           // Global object access
"${JSON.parse(data)}"               // Method calls not supported

// ✅ These are supported
"${data:user-id}"                   // Data attributes
"${attr:title}"                     // HTML attributes  
"${this.value}"                     // Element properties
```

### Template References
Use `<template>` elements for better organization:

```html
<template id="loading-state">
  <div class="loading">
    <svg class="spinner">...</svg>
    <span>Processing ${this.textContent}...</span>
  </div>
</template>

<!-- Reference with # prefix -->
<button data-optimistic='{"template": "#loading-state"}'>
  Process Data
</button>
```

## 🎮 Interactive Demo

Explore all features with the comprehensive demo:

```bash
cd demo/
npm install
npm run dev
# Visit http://localhost:4321
```

The demo includes:
- Live examples of all patterns
- Error simulation for testing
- Developer console warnings
- Complete code explanations
- Copy-paste ready configurations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `npm test`
4. Make your changes
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**hx-optimistic** - Making HTMX interactions feel instant with intelligent optimistic updates. ⚡