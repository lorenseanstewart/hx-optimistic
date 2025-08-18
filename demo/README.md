# hx-optimistic Demo & Documentation

This is the interactive demo and documentation site for the **hx-optimistic** HTMX extension. It showcases all features through live, working examples that you can interact with to understand how optimistic updates work.

## 🌟 What's Included

### Live Interactive Demos
- **Like Button with Toggle** - Shows optimistic value updates with error handling
- **Status Toggle with Templates** - Demonstrates rich HTML template-based updates  
- **Comment System** - Features input interpolation and append-mode errors
- **Inline Editor** - Real-time editing with validation and PATCH requests
- **Product Rating** - Showcases attribute and data interpolation helpers
- **Developer Warnings** - Console warnings for unsupported interpolation patterns

### Key Features Demonstrated
- ✨ **Values vs Templates** - Two approaches for different use cases
- 🔄 **Error Handling** - Automatic rollback with configurable delays
- 📝 **Input Interpolation** - `${this.value}`, `${textarea}`, `${email}`, etc.
- 🎯 **Data Helpers** - `${data:key}`, `${attr:name}`, `${this.dataset.prop}`
- ⚠️ **Developer Warnings** - Helpful console messages for unsupported patterns
- 🎨 **CSS Classes** - `.hx-optimistic`, `.hx-optimistic-error`, `.hx-optimistic-reverting`

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server  
npm run dev

# Visit http://localhost:4321 in your browser
# Open Developer Console to see warning demonstrations
```

## 📁 Project Structure

```text
demo/
├── public/
│   ├── htmx.min.js              # HTMX library
│   └── hx-optimistic.js         # The optimistic extension
├── src/
│   ├── components/              # Demo components
│   │   ├── LikeButton.astro     # Like/unlike with toggle logic
│   │   ├── StatusToggle.astro   # Status cycling with templates
│   │   ├── CommentSystem.astro  # Comments with input interpolation
│   │   ├── InlineEditor.astro   # Click-to-edit inline editing
│   │   ├── ProductRating.astro  # Rating with data helpers
│   │   └── WarningsDemo.astro   # Developer warning demonstrations
│   ├── pages/
│   │   ├── index.astro          # Main demo page with documentation
│   │   └── api/                 # API endpoints for demos
│   │       ├── like.astro       # Like button toggle logic
│   │       ├── status.astro     # Status cycling logic
│   │       ├── comments.astro   # Comment posting logic
│   │       ├── edit.astro       # Inline editing logic
│   │       ├── rating.astro     # Product rating logic
│   │       └── demo-warnings.astro # Always succeeds for warning demos
│   └── styles/
│       └── tailwind.css         # Styling with DaisyUI
├── package.json
└── README.md
```

## 🎯 How to Use This Demo

1. **Run the demo** - Start the dev server and open in your browser
2. **Open Developer Console** - Essential for seeing warnings and debugging
3. **Click the examples** - Each demo has 20-25% error simulation
4. **Watch the styling** - Notice blue optimistic states and red error states
5. **Read the code explanations** - Each demo includes detailed implementation notes

## 🧞 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |

## 🔧 For Developers

### Error Simulation
Most demos include artificial error rates (20-25%) to demonstrate error handling:
- Red error styling appears immediately
- Error messages show in console and UI
- Automatic revert after configurable delay
- Clean state restoration

### Console Warnings
The developer warnings demo shows helpful messages for:
- Unsupported interpolation patterns like `${this.querySelector('.test')}`
- Method calls like `${JSON.parse(data)}`
- Global references like `${window.location}`

### CSS Classes Applied
- `.hx-optimistic` - Applied during optimistic state (blue styling)
- `.hx-optimistic-error` - Applied on errors (red styling)  
- `.hx-optimistic-reverting` - Applied during revert animation
- `.hx-optimistic-error-message` - Applied to appended error messages

## 📖 Learning Path

1. **Start with Like Button** - Understand values-based updates
2. **Try Status Toggle** - Learn template-based updates
3. **Explore Comment System** - See input interpolation in action
4. **Test Inline Editor** - Experience real-time editing patterns
5. **Check Product Rating** - Master data and attribute helpers
6. **Open Developer Console** - Run the warnings demo

## 🌐 Integration

This demo shows patterns you can copy directly into your own projects:
- Copy component configurations for similar use cases
- Use the API endpoint patterns for your backend
- Adapt the CSS classes for your design system
- Reference the interpolation helpers for your templates

## 📚 Documentation

The main demo page serves as comprehensive documentation with:
- Live examples you can interact with
- Complete code explanations for each pattern  
- Best practices and when to use each approach
- Troubleshooting guides with developer warnings

Visit the running demo for the full interactive documentation experience!