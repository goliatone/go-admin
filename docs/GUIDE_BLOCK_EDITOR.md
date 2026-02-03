# Block Editor Development Guide

This guide explains how to use and configure the block editor component in `go-admin`. It covers setup, configuration options, drag/drop functionality, validation, schema versioning, and accessibility features.

## What it provides

- **Modular Content Blocks**: Add, remove, and reorder content blocks within forms.
- **Drag & Drop Reordering**: Full HTML5 drag and touch support for mobile devices.
- **Schema Versioning**: Automatic `_schema` field injection for block migration tracking.
- **Field Validation**: Required field validation with visual error feedback.
- **Conflict Detection**: Compare embedded blocks with legacy block instances.
- **Keyboard Accessibility**: Full keyboard navigation and screen reader announcements.
- **Cross-Editor Drag**: Transfer blocks between separate block editors.
- **Workflow Publishing**: Block definitions use workflow transitions (publish/deprecate) when the Content Type Builder module is enabled.

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Basic Setup](#2-basic-setup)
3. [Configuration Options](#3-configuration-options)
4. [Drag & Drop Features](#4-drag--drop-features)
5. [Schema Versioning](#5-schema-versioning)
6. [Validation](#6-validation)
7. [Conflict Detection](#7-conflict-detection)
8. [Keyboard Shortcuts](#8-keyboard-shortcuts)
9. [CSS Styling](#9-css-styling)
10. [API Reference](#10-api-reference)
11. [Icon Picker](#11-icon-picker)
12. [Best Practices](#12-best-practices)
13. [Key Files](#13-key-files)
14. [Example Implementation](#14-example-implementation)
15. [See Also](#15-see-also)

---

## 1. Architecture Overview

The block editor is a client-side TypeScript component that manages an array of content blocks within a form. Each block is defined by a template and rendered dynamically.

### Data Flow

1. **Templates**: Block definitions are provided as `<template>` elements with `data-block-template` attributes.
2. **Rendering**: When a user adds a block, the template is cloned and inserted into the list.
3. **Serialization**: Block data is serialized to JSON and stored in a hidden input field.
4. **Server Processing**: On form submission, the server receives the serialized blocks array.

### Key Components

| File | Description |
| ---- | ----------- |
| `block_editor.ts` | Main TypeScript component logic |
| `block-editor.css` | Drag/drop and validation styles |
| `block_editor.go` | Server-side renderer and configuration |
| `block.tmpl` | Pongo2 template for block editor HTML |

---

## 2. Basic Setup

### HTML Structure

The block editor requires a specific HTML structure:

```html
<div data-block-editor="true" data-block-field="content.blocks" data-block-sortable="true">
    <!-- Block type selector -->
    <div class="flex items-center gap-2">
        <select data-block-add-select="true"></select>
        <button type="button" data-block-add="true">Add block</button>
    </div>

    <!-- Block list container -->
    <div data-block-list="true"></div>

    <!-- Empty state message -->
    <p data-block-empty="true">No blocks added yet.</p>

    <!-- Hidden output field -->
    <input type="hidden" name="blocks" data-block-output="true">

    <!-- Block templates -->
    <template data-block-template="true" data-block-type="text" data-block-label="Text Block">
        <div data-block-fields="true">
            <input type="text" name="content" placeholder="Enter text...">
        </div>
    </template>

    <template data-block-template="true" data-block-type="image" data-block-label="Image Block">
        <div data-block-fields="true">
            <input type="text" name="url" placeholder="Image URL...">
            <input type="text" name="alt" placeholder="Alt text...">
        </div>
    </template>
</div>
```

### Required Data Attributes

| Attribute | Element | Description |
| --------- | ------- | ----------- |
| `data-block-editor` | Container | Marks the root block editor element |
| `data-block-field` | Container | Base field name for serialization |
| `data-block-sortable` | Container | Enable drag/drop reordering |
| `data-block-list` | Div | Container for rendered block items |
| `data-block-output` | Input | Hidden field for serialized JSON |
| `data-block-add-select` | Select | Dropdown for block type selection |
| `data-block-add` | Button | Trigger to add selected block |
| `data-block-empty` | Element | Empty state message (auto-hidden) |
| `data-block-template` | Template | Block type definition |
| `data-block-type` | Template | Unique block type identifier |
| `data-block-label` | Template | Human-readable block name |

### Server-Side Registration

Register the block editor component with the form generator:

```go
import (
    "github.com/goliatone/go-admin/admin"
    "github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

// Register the block editor component
components.Register("block", admin.BlockEditorDescriptor("/admin"))
```

---

## 3. Configuration Options

Configuration is passed via the `data-component-config` attribute as JSON:

```html
<div data-block-editor="true" data-component-config='{
    "sortable": true,
    "allowDrag": true,
    "dragFromHeader": true,
    "enableTouch": true,
    "enableAnimations": true,
    "enableCrossEditor": false,
    "validateOnInput": true,
    "addLabel": "Add content block",
    "emptyLabel": "No content blocks yet.",
    "schemaVersionPattern": "{type}@v1.0.0",
    "requiredFields": {
        "text": ["content"],
        "image": ["url"]
    }
}'>
```

### All Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `sortable` | boolean | false | Enable block reordering |
| `allowDrag` | boolean | (same as sortable) | Enable drag interactions |
| `dragFromHeader` | boolean | true | Allow dragging from entire header |
| `enableTouch` | boolean | true | Enable touch/mobile drag support |
| `enableAnimations` | boolean | true | Enable smooth reorder animations |
| `enableCrossEditor` | boolean | false | Allow drag between editors |
| `validateOnInput` | boolean | true | Validate blocks on field change |
| `addLabel` | string | "Add block" | Add button label text |
| `emptyLabel` | string | "No blocks added yet." | Empty state message |
| `schemaVersionPattern` | string | "{type}@v1.0.0" | Schema version format |
| `requiredFields` | object | {} | Required fields per block type |
| `legacyBlocks` | array | null | Legacy blocks for conflict detection |
| `showConflicts` | boolean | true | Show conflict detection UI |

---

## 4. Drag & Drop Features

### Desktop Drag (HTML5)

The block editor uses the HTML5 Drag and Drop API for desktop browsers:

- **Drag Handle**: Click and drag the "Drag" handle on each block.
- **Header Drag**: When `dragFromHeader: true`, drag from anywhere on the block header.
- **Drop Indicator**: A visual indicator shows where the block will be placed.
- **Animations**: Smooth FLIP animations when blocks are reordered.

### Mobile Touch Support

Touch support is enabled by default (`enableTouch: true`):

- **Touch and Hold**: Touch the block header and start dragging.
- **Visual Clone**: A semi-transparent clone follows your finger.
- **Auto-Scroll**: The list automatically scrolls when dragging near edges.
- **Touch Threshold**: 10px movement threshold before drag starts.

### Cross-Editor Drag

When `enableCrossEditor: true`, blocks can be dragged between separate block editors:

```html
<!-- Editor 1 -->
<div data-block-editor="true" data-component-config='{"enableCrossEditor": true}'>
    <!-- ... -->
</div>

<!-- Editor 2 -->
<div data-block-editor="true" data-component-config='{"enableCrossEditor": true}'>
    <!-- ... -->
</div>
```

Block data is transferred via the `application/x-block` MIME type.

### Drag Visual States

| Class | Description |
| ----- | ----------- |
| `.block-item--dragging` | Applied during HTML5 drag |
| `.block-item--placeholder` | Applied to original during touch drag |
| `.block-item--touch-dragging` | Applied to touch clone element |
| `.block-drop-indicator` | Drop position indicator line |

---

## 5. Schema Versioning

Each block automatically receives a `_schema` field containing the schema version:

```json
{
    "_type": "text",
    "_schema": "text@v1.0.0",
    "content": "Hello world"
}
```

### Configuring Schema Versions

Set the version pattern in configuration:

```html
<div data-component-config='{"schemaVersionPattern": "{type}@v2.0.0"}'>
```

Or per-template:

```html
<template data-block-template="true" data-block-type="text" data-block-schema-version="text@v2.1.0">
```

### How Version Resolution Works

1. Check `data-block-schema-version` on the template.
2. Fall back to config `schemaVersionPattern` with `{type}` replaced.
3. Default to `{type}@v1.0.0`.

---

## 6. Validation

### Defining Required Fields

Required fields can be defined per block type:

```html
<div data-component-config='{
    "requiredFields": {
        "text": ["content"],
        "image": ["url", "alt"],
        "video": ["src"]
    }
}'>
```

Or per-template:

```html
<template data-block-template="true"
          data-block-type="text"
          data-block-required-fields="content,title">
```

### Validation Behavior

- Validation runs on every input change when `validateOnInput: true`.
- Invalid blocks are marked with `.block-item--invalid` class.
- An error badge appears in the block header showing error count.
- Individual fields display error messages below them.

### Validation UI Classes

| Class | Description |
| ----- | ----------- |
| `.block-item--invalid` | Block container with validation errors |
| `.block-error-badge` | Error count badge in header |
| `.block-field-error` | Field-level error message |

### Programmatic Validation Check

The editor sets a data attribute indicating validation state:

```javascript
const editor = document.querySelector('[data-block-editor]');
const isValid = editor.dataset.blockEditorValid === 'true';
```

---

## 7. Conflict Detection

When migrating from legacy block storage to embedded blocks, the editor can detect and display conflicts.

### Enabling Conflict Detection

Provide legacy blocks in the configuration:

```html
<div data-component-config='{
    "showConflicts": true,
    "legacyBlocks": [
        {"_type": "text", "content": "Old content"},
        {"_type": "image", "url": "old.jpg"}
    ]
}'>
```

Or via data attribute:

```html
<div data-block-editor="true" data-block-legacy='[{"_type":"text","content":"Old"}]'>
```

### Conflict Report UI

When conflicts are detected:

- An amber warning panel appears above the block list.
- Shows count of embedded vs legacy blocks.
- Expandable details list specific field differences.
- Dismiss button to hide the report.

---

## 8. Keyboard Shortcuts

The block editor supports full keyboard navigation:

### Navigation

| Key | Action |
| --- | ------ |
| `Tab` | Navigate between blocks and controls |
| `Arrow Up` | Focus previous block header |
| `Arrow Down` | Focus next block header |
| `Enter` / `Space` | Toggle block collapse (on header) |
| `Escape` | Collapse current block |

### Reordering

| Key | Action |
| --- | ------ |
| `Alt + Arrow Up` | Move block up in list |
| `Alt + Arrow Down` | Move block down in list |

### Actions

| Key | Action |
| --- | ------ |
| `Shift + Delete` | Remove focused block |
| `Shift + Backspace` | Remove focused block |

### Screen Reader Announcements

All drag and reorder operations are announced via an ARIA live region:

- "Dragging {block} from position {n} of {total}"
- "{block} moved to position {n} of {total}"
- "Already at the top" / "Already at the bottom"

---

## 9. CSS Styling

### Required CSS Import

Include the block editor styles in your build:

```css
@import 'src/styles/block-editor.css';
```

Or link directly:

```html
<link rel="stylesheet" href="/assets/dist/styles/block-editor.css">
```

### Key CSS Classes

| Class | Description |
| ----- | ----------- |
| `[data-block-item]` | Individual block container |
| `[data-block-header]` | Block header with controls |
| `[data-block-body]` | Block content area |
| `.hidden` | Collapsed block body |

### Dark Mode Support

Styles include `prefers-color-scheme: dark` media queries for automatic dark mode support.

### Reduced Motion Support

Animations are disabled when `prefers-reduced-motion: reduce` is set:

```css
@media (prefers-reduced-motion: reduce) {
    [data-block-item],
    .block-drop-indicator,
    .block-error-badge {
        animation: none;
        transition: none;
    }
}
```

---

## 10. API Reference

### JavaScript API

Initialize block editors manually:

```javascript
import { initBlockEditors } from './formgen/block_editor';

// Initialize all block editors in document
initBlockEditors();

// Initialize within a specific scope
initBlockEditors(document.querySelector('#my-form'));
```

### Block Item Structure

Each rendered block has this structure:

```html
<div data-block-item="true"
     data-block-type="text"
     data-block-schema="text@v1.0.0"
     data-block-collapsed="false"
     data-block-valid="true"
     draggable="true">
    <div data-block-header="true" tabindex="0" role="button">
        <!-- Icon, label, type badge -->
        <!-- Action buttons: Up, Down, Collapse, Remove, Drag -->
    </div>
    <div data-block-body="true">
        <!-- Block fields from template -->
    </div>
    <input type="hidden" name="_type" value="text" data-block-type-input="true">
    <input type="hidden" name="_schema" value="text@v1.0.0" data-block-schema-input="true">
</div>
```

### Output Format

The hidden output field contains JSON:

```json
[
    {
        "_type": "text",
        "_schema": "text@v1.0.0",
        "content": "Hello world"
    },
    {
        "_type": "image",
        "_schema": "image@v1.0.0",
        "url": "https://example.com/image.jpg",
        "alt": "Example image"
    }
]
```

---

## 11. Icon Picker

The block editor, block library, content type editor, and layout editor all use a shared icon picker component for selecting icons and emoji. The picker is extensible — projects can register custom icon tabs to add their own icon sets.

### Custom Icon Uploads (Not Supported)

The icon picker does not include a file upload option. Supporting uploads would require server-side storage, SVG sanitization, validation, and a distribution endpoint. Instead, load custom icons via `registerIconTab()` (static bundles or API-backed tabs) and resolve them through `resolveIcon(value)`.

### Built-in Tabs

The picker ships with two tabs:

| Tab | Content | Storage Format |
| --- | ------- | -------------- |
| **Emoji** | ~200 curated emoji in 8 categories (smileys, people, animals, food, travel, activities, objects, symbols) | Unicode character (e.g. `"📰"`) |
| **Icons** | ~30 SVG icons from the field type registry (text, number, date, media, etc.) | Key string (e.g. `"file-text"`) |

### How Icons are Stored

Icons are stored as plain strings. Emoji stores the unicode character directly (`"📰"`). SVG icons store a key (`"file-text"`). Custom icons store whatever value the tab's entries define. At display time, `resolveIcon(value)` converts the stored string to renderable HTML.

### Resolution Order

`resolveIcon(value)` checks in this order:

1. Empty string → returns empty
2. Built-in SVG icon key match (`iconForKey()`) → returns SVG markup
3. Registered custom tab entry match → returns `entry.display`
4. Passthrough → returns the value itself (assumed emoji)

### Registering a Custom Icon Tab

Projects can add custom icon tabs that appear in every icon picker instance. Call `registerIconTab()` before or after the UI initializes — the registry is global.

```typescript
import { registerIconTab } from './content-type-builder';
import type { IconTab } from './content-type-builder';

// Define a custom Lucide icons tab
const lucideTab: IconTab = {
  id: 'lucide',
  label: 'Lucide',
  icon: '◇',
  entries: [
    {
      value: 'lucide:home',
      label: 'Home',
      keywords: 'house building main',
      display: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
    },
    {
      value: 'lucide:settings',
      label: 'Settings',
      keywords: 'gear cog preferences config',
      display: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    },
    {
      value: 'lucide:user',
      label: 'User',
      keywords: 'person account profile',
      display: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
    // ... more entries
  ],
  categories: [
    { id: 'general', label: 'General', startIndex: 0 },
  ],
};

registerIconTab(lucideTab);
```

After registration, the "Lucide" tab appears in every icon picker popover alongside Emoji and Icons. When a user selects `lucide:home`, the string `"lucide:home"` is stored. Wherever that icon is displayed (block list, field cards, etc.), `resolveIcon('lucide:home')` returns the SVG HTML from the registered entry.

### Loading Icons Dynamically

For large icon sets, load entries on demand and register when ready:

```typescript
import { registerIconTab } from './content-type-builder';

async function loadBrandIcons(): Promise<void> {
  const response = await fetch('/api/brand-icons');
  const icons = await response.json();

  registerIconTab({
    id: 'brand',
    label: 'Brand',
    icon: '★',
    entries: icons.map((icon: { key: string; name: string; svg: string }) => ({
      value: `brand:${icon.key}`,
      label: icon.name,
      display: icon.svg,
    })),
  });
}

// Call before or after page init — the tab appears on next picker open
loadBrandIcons();
```

### Replacing a Built-in Tab

To replace the default emoji set (e.g. with a corporate-approved subset):

```typescript
import { unregisterIconTab, registerIconTab } from './content-type-builder';

// Remove the default emoji tab
unregisterIconTab('emoji');

// Register a curated replacement
registerIconTab({
  id: 'emoji',
  label: 'Emoji',
  icon: '😀',
  entries: [
    { value: '✅', label: 'check mark', keywords: 'done complete yes', display: '✅' },
    { value: '⚠️', label: 'warning', keywords: 'alert caution', display: '⚠️' },
    { value: '❌', label: 'cross mark', keywords: 'no cancel error', display: '❌' },
    { value: '📌', label: 'pushpin', keywords: 'pin sticky', display: '📌' },
    // ... curated subset
  ],
});
```

### Removing a Built-in Tab

To remove the Icons tab entirely (keeping only emoji and any custom tabs):

```typescript
import { unregisterIconTab } from './content-type-builder';

unregisterIconTab('icons');
```

### IconEntry Interface

Each entry in a tab describes one selectable icon:

```typescript
interface IconEntry {
  /** Stored value — written to the field when selected */
  value: string;
  /** Display name, used for search matching */
  label: string;
  /** Additional search terms (optional) */
  keywords?: string;
  /** Rendered HTML for display in the picker grid and in the UI */
  display: string;
}
```

For emoji entries, `value` and `display` are typically the same character. For SVG or custom icons, `value` is a key string and `display` is the HTML markup.

### IconTab Interface

```typescript
interface IconTab {
  /** Unique identifier for the tab */
  id: string;
  /** Text shown on the tab button */
  label: string;
  /** Small icon/emoji shown before the tab label (optional) */
  icon?: string;
  /** All selectable items in this tab */
  entries: IconEntry[];
  /** Category grouping within the tab (optional) */
  categories?: { id: string; label: string; startIndex: number }[];
}
```

The `categories` array is optional. When provided, the picker renders category headers within the grid. Each category's `startIndex` refers to the position in the `entries` array where that category begins.

### Exported API

The following are exported from `content-type-builder/index.ts`:

| Export | Type | Description |
| ------ | ---- | ----------- |
| `registerIconTab(tab)` | function | Add or replace a tab in the global registry |
| `unregisterIconTab(id)` | function | Remove a tab by ID |
| `getIconTabs()` | function | Get all registered tabs |
| `resolveIcon(value)` | function | Convert a stored value to display HTML |
| `IconTab` | type | Tab definition interface |
| `IconEntry` | type | Single icon entry interface |
| `IconPickerConfig` | type | Picker configuration interface |

### Where the Picker Appears

The icon picker trigger replaces the plain text `<input>` in these surfaces:

| Surface | Field Attribute | Description |
| ------- | --------------- | ----------- |
| Block Editor Panel | `data-meta-field="icon"` | Block definition icon in metadata |
| Content Type Editor | `data-ct-icon` | Content type icon field |
| Block Library Manager | `name="icon"` | Block create/edit form icon |
| Layout Editor | `name="tab_icon_N"` | Tab/section icon in layout config |

### Key Files

| File | Description |
| ---- | ----------- |
| `content-type-builder/shared/icon-picker.ts` | Registry, trigger, popover, events |
| `content-type-builder/shared/icon-picker-data.ts` | Curated emoji data and SVG icon keys |

---

## 12. Best Practices

1. **Use Unique Block Types**: Each block type identifier must be unique within the editor.

2. **Provide Clear Labels**: Use descriptive `data-block-label` values for better UX.

3. **Define Required Fields**: Mark essential fields as required to prevent incomplete blocks.

4. **Enable Touch Support**: Always enable touch support for mobile-friendly forms.

5. **Consider Cross-Editor Carefully**: Only enable `enableCrossEditor` when blocks are truly compatible between editors.

6. **Test Keyboard Navigation**: Ensure all block operations work via keyboard for accessibility.

7. **Use Schema Versions**: Track schema versions to enable future migrations.

8. **Handle Conflicts**: When migrating from legacy blocks, review conflicts before going live.

9. **Keep Templates Simple**: Block templates should contain form fields, not complex logic.

10. **Respect Reduced Motion**: The CSS already handles this, but avoid JavaScript animations that bypass it.

---

## 13. Key Files

| File | Description |
| ---- | ----------- |
| `pkg/client/assets/src/formgen/block_editor.ts` | Main TypeScript component |
| `pkg/client/assets/src/styles/block-editor.css` | Drag/drop and validation styles |
| `admin/block_editor.go` | Server-side renderer and configuration |
| `pkg/client/templates/formgen/vanilla/templates/components/block.tmpl` | HTML template |
| `admin/cms_blocks.go` | Block parsing and migration utilities |
| `pkg/client/assets/src/content-type-builder/shared/icon-picker.ts` | Shared icon picker component |
| `pkg/client/assets/src/content-type-builder/shared/icon-picker-data.ts` | Emoji and SVG icon data |

---

## 14. Example Implementation

### Complete Form with Block Editor

```html
<form method="POST" action="/admin/api/pages">
    <input type="text" name="title" placeholder="Page title">

    <div data-block-editor="true"
         data-block-field="content.blocks"
         data-block-sortable="true"
         data-component-config='{
             "sortable": true,
             "dragFromHeader": true,
             "enableTouch": true,
             "enableAnimations": true,
             "validateOnInput": true,
             "addLabel": "Add content block",
             "requiredFields": {
                 "heading": ["text"],
                 "paragraph": ["content"],
                 "image": ["url"]
             }
         }'>

        <div class="flex items-center gap-2 mb-4">
            <select data-block-add-select="true" class="form-select"></select>
            <button type="button" data-block-add="true" class="btn">Add block</button>
        </div>

        <div data-block-list="true" class="space-y-4"></div>

        <p data-block-empty="true" class="text-gray-500 text-center py-8">
            No content blocks yet. Add your first block above.
        </p>

        <input type="hidden" name="blocks" data-block-output="true">

        <!-- Block templates -->
        <template data-block-template="true"
                  data-block-type="heading"
                  data-block-label="Heading"
                  data-block-icon="H"
                  data-block-required-fields="text">
            <div class="space-y-2">
                <input type="text" name="text" placeholder="Heading text" class="form-input">
                <select name="level" class="form-select">
                    <option value="h2">H2</option>
                    <option value="h3">H3</option>
                    <option value="h4">H4</option>
                </select>
            </div>
        </template>

        <template data-block-template="true"
                  data-block-type="paragraph"
                  data-block-label="Paragraph"
                  data-block-icon="P">
            <textarea name="content" placeholder="Paragraph content..." class="form-textarea" rows="4"></textarea>
        </template>

        <template data-block-template="true"
                  data-block-type="image"
                  data-block-label="Image"
                  data-block-icon="I"
                  data-block-collapsed="true">
            <div class="space-y-2">
                <input type="text" name="url" placeholder="Image URL" class="form-input">
                <input type="text" name="alt" placeholder="Alt text" class="form-input">
                <input type="text" name="caption" placeholder="Caption (optional)" class="form-input">
            </div>
        </template>
    </div>

    <button type="submit" class="btn btn-primary">Save Page</button>
</form>
```

### Server-Side Handler

```go
func handlePageCreate(c router.Context) error {
    var payload struct {
        Title  string           `json:"title"`
        Blocks []map[string]any `json:"blocks"`
    }

    if err := c.Bind(&payload); err != nil {
        return err
    }

    // Blocks are already parsed as an array of objects
    for _, block := range payload.Blocks {
        blockType := block["_type"].(string)
        schemaVersion := block["_schema"].(string)
        // Process each block...
    }

    return c.JSON(200, map[string]any{"success": true})
}
```

---

## 15. See Also

- [CMS Module Development Guide](GUIDE_CMS.md) - Content management and block storage.
- [View Customization Guide](GUIDE_VIEW_CUSTOMIZATION.md) - Theming and templates.
- [Schema Editor Component](../pkg/client/assets/src/formgen/schema_editor.ts) - JSON schema editing.
