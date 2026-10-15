# Dashboard Widget Grid

A reusable, pluggable dashboard widget system with drag & drop, resize, and layout persistence capabilities.

## Features

- **Drag & Drop**: Rearrange widgets within and across areas
- **Resize**: Toggle widgets between half-width and full-width (configurable per area)
- **Hide/Show**: Temporarily hide widgets without deleting them
- **Persistence**: Save layout preferences automatically
- **Pluggable Behaviors**: Customize drag/drop, resize, visibility, and persistence logic
- **Type-Safe**: Full TypeScript support with exported types

## Quick Start

### 1. HTML Structure

```html
<div data-widget-grid>
  <section data-area-code="admin.dashboard.main">
    <div class="widgets-grid" data-widgets-grid data-area-grid="admin.dashboard.main">
      <article class="widget"
               data-widget="widget-1"
               data-span="12"
               data-resizable="true">
        <div class="widget__toolbar" data-widget-toolbar>
          <button data-action="toggle-hide">Hide</button>
          <button data-action="toggle-width">Resize</button>
        </div>
        <div class="widget__content">
          <!-- Widget content here -->
        </div>
      </article>
    </div>
  </section>
</div>
```

### 2. Initialize Widget Grid

```typescript
import { WidgetGrid } from './dashboard/index.js';

const grid = new WidgetGrid({
  apiEndpoint: '/admin/api/dashboard',
  preferencesEndpoint: '/admin/api/dashboard/preferences',
  areas: ['admin.dashboard.main', 'admin.dashboard.sidebar'],
  onSave: (layout) => console.log('Layout saved:', layout),
});

await grid.init();
```

### 3. Backend API

`WidgetGrid.init(serverState?)` hydrates existing server-rendered widget DOM;
it does not fetch the widgets from `apiEndpoint`. Optional server state supplies
schema/data for hydration validation. `apiEndpoint` is required configuration
and supplies the default preferences path, but a host still owns initial widget
rendering/data loading. See `widget-grid.ts` and `types.ts` for the current
hydration contracts.

Layout changes use `DefaultPersistenceBehavior.save`, which posts JSON through
the shared HTTP client to the configured `preferencesEndpoint`. Derive these
URLs from the host route configuration; the paths below are an example mount.

**POST /admin/api/dashboard/preferences**
```json
{
  "area_order": {
    "admin.dashboard.main": ["widget-1", "widget-2"]
  },
  "hidden_widget_ids": ["widget-3"],
  "layout_rows": {
    "admin.dashboard.main": [
      { "widgets": [{ "id": "widget-1", "width": 6 }, { "id": "widget-2", "width": 6 }] }
    ]
  }
}
```

## Configuration

### WidgetGridConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiEndpoint` | `string` | - | **Required.** Dashboard widgets endpoint |
| `preferencesEndpoint` | `string` | `{apiEndpoint}/preferences` | Preferences save endpoint |
| `areas` | `string[]` | `[]` | Widget area codes |
| `defaultSpan` | `number` | `12` | Default widget width (1-12) |
| `maxColumns` | `number` | `12` | Grid column count |
| `saveDelay` | `number` | `200` | Debounce delay for save (ms) |
| `behaviors` | `WidgetGridBehaviors` | Default behaviors | Custom behaviors |
| `selectors` | `WidgetGridSelectors` | Shared data-attribute selectors | Override area/widget/toolbar/button selectors |
| `onSave` | `(layout) => void` | `noop` | Save callback |
| `onError` | `(error) => void` | Scoped logger | Error handler; default logging is silent until a host sink is configured |

## Custom Behaviors

You can customize any behavior by implementing the corresponding interface:

```typescript
import {
  WidgetGrid,
  DragDropBehavior,
  ResizeBehavior,
  VisibilityBehavior,
  PersistenceBehavior
} from './dashboard/index.js';

// Custom resize behavior that supports 3 sizes
class TripleResizeBehavior implements ResizeBehavior {
  toggleWidth(widget: HTMLElement, currentSpan: number, maxColumns: number): number {
    const sizes = [4, 8, 12];
    const currentIndex = sizes.indexOf(currentSpan);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const newSpan = sizes[nextIndex];
    this.applyWidth(widget, newSpan);
    return newSpan;
  }

  applyWidth(widget: HTMLElement, span: number): void {
    widget.dataset.span = span.toString();
    widget.style.setProperty('--span', span.toString());
  }
}

// Use custom behavior
const grid = new WidgetGrid({
  apiEndpoint: '/admin/api/dashboard',
  behaviors: {
    resize: new TripleResizeBehavior(),
  }
});
```

## CSS

Required CSS for the grid system:

```css
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
}

.widget {
  grid-column: span var(--span, 12);
  cursor: grab;
}

.widget.dragging {
  opacity: 0.5;
}

.widget[data-hidden="true"] {
  opacity: 0.3;
}
```

## Architecture

The widget grid follows a behavior-based architecture:

```
WidgetGrid (Core)
├── DragDropBehavior    - Drag & drop logic
├── ResizeBehavior      - Width toggle logic
├── VisibilityBehavior  - Hide/show logic
└── PersistenceBehavior - Save/load logic
```

All behaviors are pluggable and can be replaced with custom implementations.

## License

MIT
