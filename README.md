# hx-optimistic

A lightweight HTMX extension for optimistic UI updates with automatic rollback on errors. Show immediate user feedback while requests are in-flight, with intelligent error handling and seamless state management.

## ✨ Features

- 🎯 **Optimistic Updates** - Immediate UI feedback while requests are processing
- 🔄 **Automatic Rollback** - Intelligent revert to original state on errors
- 📝 **Input Interpolation** - Dynamic templates with `${this.value}`, `${textarea}`, `${data:key}` helpers
- 🎨 **Template Support** - Rich HTML templates for loading and error states
- ⚠️ **Developer Warnings** - Console warnings for unsupported patterns
- 🚫 **No CSS Required** - You control all styling through provided class names
- 📦 **Tiny** - Only **14.7KB** uncompressed, **6.6KB** minified, **2.5KB** gzipped
- 🔧 **Highly Configurable** - Fine-tune behavior per element

## 🚀 Quick Start

### Installation

**Via CDN (jsDelivr, pinned major):**
```html
<script src="https://unpkg.com/htmx.org@2"></script>
<script src="https://cdn.jsdelivr.net/npm/hx-optimistic@1/hx-optimistic.min.js"></script>
```

Alternative (unpkg, pin exact version):
```html
<script src="https://unpkg.com/htmx.org@2"></script>
<script src="https://unpkg.com/hx-optimistic@1.0.0/hx-optimistic.min.js"></script>
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

## 📦 Bundle Size

| Artifact | Size |
|---------|------|
| Unminified (`hx-optimistic.js`) | 14.7 KB |
| Minified (`hx-optimistic.min.js`) | 6.6 KB |
| Minified + gzip | 2.5 KB |

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
      "textContent": "❤️ Liked! (was ${data:count})",
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
| `${this.dataset.key}` | Data attribute via dataset | `"ID: ${this.dataset.userId}"` |
| `${textarea}` | First textarea in form | `"Comment: ${textarea}"` |
| `${email}` | First email input | `"Email: ${email}"` |
| `${data:key}` | Data attribute shorthand | `"Count: ${data:count}"` |
| `${attr:name}` | Any HTML attribute | `"ID: ${attr:id}"` |
| `${status}` | HTTP status (errors only) | `"Error ${status}"` |
| `${statusText}` | HTTP status text (errors only) | `"Error: ${statusText}"` |
| `${error}` | Error message (errors only) | `"Failed: ${error}"` |

**Form Field Helpers:**
- `${textarea}`, `${email}`, `${password}`, `${text}`, `${url}`, `${tel}`, `${search}`
- `${fieldName}` - Any field with `name="fieldName"`

## ⚙️ Configuration Options

Complete configuration reference for `data-optimistic`:

### Snapshot Behavior
innerHTML and className are automatically captured and restored on revert; no configuration is required.

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

This library does not include any CSS. These classes are applied so you can style them as you wish:

- `hx-optimistic`: applied during the optimistic update
- `hx-optimistic-error`: applied when an error is shown
- `hx-optimistic-reverting`: applied while reverting to the snapshot
- `hx-optimistic-error-message`: wrapper added when errorMode is "append"

## 📚 Examples
See usage snippets above for common patterns.

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

## 🎮 Live Demo
[View the demo](https://hx-optimistic-demo.example.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `npm test`
4. Make your changes
5. Submit a pull request

## 📦 Release

Tag-based releases trigger npm publish in CI:

1. Update version in `package.json` if needed
2. Create a tag and push it:
```bash
git tag v1.0.0
git push origin v1.0.0
```
3. Ensure `NPM_TOKEN` is set in GitHub Actions secrets

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**hx-optimistic** - Making HTMX interactions feel instant with intelligent optimistic updates. ⚡