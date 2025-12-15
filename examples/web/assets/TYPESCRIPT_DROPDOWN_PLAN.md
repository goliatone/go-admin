# TypeScript DataGrid Dropdown Actions - Implementation Plan

**Date**: 2025-12-15
**Status**: Ready for implementation
**Estimated Time**: 3-4 hours

---

## Overview

Implement dropdown actions menu for the TypeScript `DataGrid` component to match the design mockup. This will enable Users, Posts, and all other resource tables to display actions in a dropdown menu instead of inline buttons.

---

## Current Architecture Analysis

### **Files Structure**

```
examples/web/assets/src/datatable/
├── actions.ts          (249 lines) - Row/bulk action rendering
├── core.ts            (1172 lines) - Main DataGrid class
├── renderers.ts        (267 lines) - Cell renderers
├── index.ts             (50 lines) - Exports
├── advanced-search.ts  (532 lines) - Search component
├── filter-builder.ts   (711 lines) - Filter component
└── behaviors/         - Behavior strategies
    └── go-crud/       - Go-crud specific behaviors
```

### **Current Action Rendering** (actions.ts)

**`ActionRenderer` class** currently has:
- ✅ `renderRowActions()` - Renders inline buttons
- ✅ `renderDefaultActions()` - Default view/edit/delete buttons
- ✅ `attachRowActionListeners()` - Event handling
- ✅ Icon rendering system
- ✅ Variant classes (primary, secondary, danger, etc.)

**Current output**: Inline buttons like this:
```html
<div class="flex justify-end gap-2">
  <button class="btn btn-sm btn-secondary">View</button>
  <button class="btn btn-sm btn-primary">Edit</button>
  <button class="btn btn-sm btn-danger">Delete</button>
</div>
```

**We need**: Dropdown menu like this:
```html
<div class="relative actions-dropdown">
  <button class="actions-menu-trigger">⋮</button>
  <div class="actions-menu">
    <a class="action-item">Details</a>
    <button class="action-item">Suspend</button>
    ...
  </div>
</div>
```

---

## Implementation Plan

### **Phase 1: Extend ActionRenderer with Dropdown Support** ⏱️ 1.5 hours

#### **Step 1.1: Add Configuration Type** (10 min)

**File**: `src/datatable/actions.ts`

```typescript
export type ActionRenderMode = 'inline' | 'dropdown';

export interface ActionRendererConfig {
  mode?: ActionRenderMode;
  actionBasePath?: string;
}
```

#### **Step 1.2: Update ActionRenderer Constructor** (10 min)

```typescript
export class ActionRenderer {
  private actionBasePath: string;
  private mode: ActionRenderMode;

  constructor(config: ActionRendererConfig = {}) {
    this.actionBasePath = config.actionBasePath || '';
    this.mode = config.mode || 'inline';
  }

  // ... existing methods
}
```

#### **Step 1.3: Create Dropdown Rendering Method** (45 min)

**Add to `actions.ts`**:

```typescript
/**
 * Render row actions as dropdown menu
 */
renderRowActionsDropdown(record: any, actions: ActionButton[]): string {
  const visibleActions = actions.filter(action =>
    !action.condition || action.condition(record)
  );

  if (visibleActions.length === 0) {
    return '<div class="text-sm text-gray-400">No actions</div>';
  }

  const menuId = `actions-menu-${record.id}`;

  // Build action items
  const actionItems = this.buildDropdownItems(record, visibleActions);

  return `
    <div class="relative actions-dropdown" data-dropdown>
      <button type="button"
              class="actions-menu-trigger p-2 hover:bg-gray-100 rounded-md"
              data-dropdown-trigger
              aria-label="Actions menu"
              aria-haspopup="true"
              aria-expanded="false">
        ${this.renderDotsIcon()}
      </button>

      <div id="${menuId}"
           class="actions-menu hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1"
           role="menu">
        ${actionItems}
      </div>
    </div>
  `;
}

/**
 * Build dropdown menu items HTML
 */
private buildDropdownItems(record: any, actions: ActionButton[]): string {
  return actions.map((action, index) => {
    const isDestructive = action.variant === 'danger';
    const icon = action.icon ? this.renderIcon(action.icon) : '';
    const needsDivider = this.shouldShowDivider(action, index, actions);

    const divider = needsDivider
      ? '<div class="action-divider border-t border-gray-200 my-1"></div>'
      : '';

    const itemClass = isDestructive
      ? 'action-item text-red-600 hover:bg-red-50'
      : 'action-item text-gray-700 hover:bg-gray-50';

    return `
      ${divider}
      <button type="button"
              class="${itemClass} flex items-center gap-3 w-full px-4 py-2.5"
              data-action-id="${this.sanitize(action.label)}"
              data-record-id="${record.id}"
              role="menuitem">
        <span class="flex-shrink-0">${icon}</span>
        <span class="text-sm font-medium">${this.sanitize(action.label)}</span>
      </button>
    `;
  }).join('');
}

/**
 * Determine if divider should be shown before action
 */
private shouldShowDivider(action: ActionButton, index: number, actions: ActionButton[]): boolean {
  if (index === 0) return false;

  // Show divider before destructive actions
  if (action.variant === 'danger') return true;

  // Show divider before certain action labels
  const dividerBefore = ['download', 'archive', 'delete', 'remove'];
  return dividerBefore.some(label =>
    action.label.toLowerCase().includes(label)
  );
}

/**
 * Render three-dot icon
 */
private renderDotsIcon(): string {
  return `
    <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
    </svg>
  `;
}
```

#### **Step 1.4: Update Main Render Method** (15 min)

```typescript
renderRowActions(record: any, actions: ActionButton[]): string {
  if (this.mode === 'dropdown') {
    return this.renderRowActionsDropdown(record, actions);
  }

  // Existing inline rendering
  const visibleActions = actions.filter(action =>
    !action.condition || action.condition(record)
  );
  // ... existing inline code
}
```

#### **Step 1.5: Add More Icons** (10 min)

Extend `renderIcon()` method with missing icons:
- `pause-circle` (suspend)
- `x-circle` (disable)
- `download`
- `copy` (clone)

---

### **Phase 2: Update DataGrid Core** ⏱️ 45 min

#### **Step 2.1: Add Mode Configuration** (15 min)

**File**: `src/datatable/core.ts`

```typescript
export interface DataGridConfig {
  // ... existing fields

  /**
   * Action rendering mode
   */
  actionRenderMode?: 'inline' | 'dropdown';
}
```

#### **Step 2.2: Update ActionRenderer Initialization** (15 min)

```typescript
export class DataGrid {
  private actionRenderer: ActionRenderer;

  constructor(config: DataGridConfig) {
    // ... existing code

    this.actionRenderer = new ActionRenderer({
      mode: config.actionRenderMode || 'inline',
      actionBasePath: config.actionBasePath || config.apiEndpoint
    });
  }
}
```

#### **Step 2.3: Add Dropdown Event Handlers** (15 min)

In `DataGrid.init()` or new method:

```typescript
private bindDropdownToggles(): void {
  // Event delegation for dropdown triggers
  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest('[data-dropdown-trigger]');

    if (trigger) {
      e.stopPropagation();
      const dropdown = trigger.closest('[data-dropdown]');
      const menu = dropdown?.querySelector('.actions-menu');

      // Close other dropdowns
      document.querySelectorAll('.actions-menu').forEach(m => {
        if (m !== menu) m.classList.add('hidden');
      });

      // Toggle this dropdown
      menu?.classList.toggle('hidden');
      trigger.setAttribute('aria-expanded',
        !menu?.classList.contains('hidden') ? 'true' : 'false'
      );
    } else {
      // Close all dropdowns when clicking outside
      document.querySelectorAll('.actions-menu').forEach(m =>
        m.classList.add('hidden')
      );
    }
  });

  // ESC key closes dropdowns
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.actions-menu').forEach(m =>
        m.classList.add('hidden')
      );
    }
  });
}
```

---

### **Phase 3: Add CSS Styles** ⏱️ 30 min

#### **Step 3.1: Create Stylesheet** (20 min)

**File**: `examples/web/assets/src/datatable/actions.css` (new file)

Copy from `.tmp/datatable-js/actions.css` and adapt:
- Action dropdown container styles
- Menu trigger button
- Dropdown menu positioning
- Action items with hover states
- Dividers
- Destructive action styling

#### **Step 3.2: Include in Build** (10 min)

Option A: Import in TypeScript
```typescript
// src/datatable/actions.ts
import './actions.css';
```

Option B: Include in layout.html
```html
<link rel="stylesheet" href="{{ base_path }}/assets/src/datatable/actions.css">
```

---

### **Phase 4: Compile TypeScript** ⏱️ 15 min

```bash
cd examples/web
npm run build:ts
```

Verify compiled output in `dist/datatable/`:
- `actions.js` - Updated with dropdown rendering
- `core.js` - Updated with mode config
- `index.js` - Re-exported types

---

### **Phase 5: Update Templates** ⏱️ 30 min

#### **Step 5.1: Users Template** (10 min)

**File**: `templates/resources/users/list.html`

```javascript
const grid = new DataGrid({
  tableId: 'users-datatable',
  apiEndpoint: '/admin/crud/users',
  actionBasePath: actionBasePath,

  // Enable dropdown mode
  actionRenderMode: 'dropdown',

  columns: [...],
  rowActions: (user) => {
    // ... existing actions
  }
});
```

#### **Step 5.2: Posts Template** (10 min)

**File**: `templates/resources/posts/list.html`

Same changes as users template.

#### **Step 5.3: Include CSS** (10 min)

**File**: `templates/layout.html`

```html
<link rel="stylesheet" href="{{ base_path }}/assets/src/datatable/actions.css">
```

---

### **Phase 6: Testing** ⏱️ 45 min

#### **Test Checklist**:

1. **Visual Verification** (15 min)
   - [ ] Three-dot menu appears in Users table
   - [ ] Three-dot menu appears in Posts table
   - [ ] Menu matches design mockup
   - [ ] Icons display correctly
   - [ ] Dividers appear before destructive actions

2. **Interaction Testing** (15 min)
   - [ ] Click three-dot opens dropdown
   - [ ] Click outside closes dropdown
   - [ ] ESC key closes dropdown
   - [ ] Only one dropdown open at a time
   - [ ] Action clicks trigger correct handlers

3. **Functional Testing** (15 min)
   - [ ] View action navigates to detail page
   - [ ] Edit action navigates to edit page
   - [ ] Suspend action executes POST to `/admin/api/users/:id/suspend`
   - [ ] Archive action executes POST to `/admin/api/users/:id/archive`
   - [ ] Delete action shows confirmation, then deletes
   - [ ] Table refreshes after action execution

---

## File Modifications Summary

### **New Files**
- ✅ `.tmp/datatable-js/` - Archived vanilla JS implementation
- ➕ `src/datatable/actions.css` - Dropdown styles

### **Modified Files**
- 📝 `src/datatable/actions.ts` - Add dropdown rendering (~120 new lines)
- 📝 `src/datatable/core.ts` - Add mode config (~20 new lines)
- 📝 `templates/resources/users/list.html` - Enable dropdown mode (~2 lines)
- 📝 `templates/resources/posts/list.html` - Enable dropdown mode (~2 lines)
- 📝 `templates/layout.html` - Include CSS (~1 line)

### **Build Artifacts**
- 🔨 `dist/datatable/actions.js` - Compiled
- 🔨 `dist/datatable/core.js` - Compiled
- 🔨 `dist/datatable/index.js` - Re-exported

---

## Rollback Plan

If issues arise:

1. **Revert TypeScript changes**:
   ```bash
   git checkout src/datatable/actions.ts src/datatable/core.ts
   npm run build:ts
   ```

2. **Remove CSS**:
   ```bash
   rm src/datatable/actions.css
   ```

3. **Revert templates**:
   ```bash
   git checkout templates/resources/users/list.html templates/resources/posts/list.html
   ```

4. **Restore vanilla JS** (if needed):
   ```bash
   mv .tmp/datatable-js/* examples/web/assets/
   ```

---

## Benefits

1. ✅ **Production Ready**: All templates get dropdown menus
2. ✅ **Type Safe**: TypeScript provides compile-time checks
3. ✅ **Backward Compatible**: Inline mode still available
4. ✅ **Maintainable**: Single source of truth
5. ✅ **Extensible**: Easy to add new action rendering modes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| TypeScript compilation errors | Low | Medium | Test build before template changes |
| Dropdown positioning issues | Medium | Low | Use absolute positioning with right-align |
| Event handler conflicts | Low | Medium | Use event delegation |
| CSS not loading | Low | High | Include in layout.html globally |
| Actions not executing | Low | High | Test with existing action handlers |

---

## Next Steps

**Awaiting approval to proceed with implementation.**

Once approved, implementation order:
1. Phase 1: Extend ActionRenderer (~1.5 hours)
2. Phase 2: Update DataGrid Core (~45 min)
3. Phase 3: Add CSS (~30 min)
4. Phase 4: Compile TypeScript (~15 min)
5. Phase 5: Update Templates (~30 min)
6. Phase 6: Testing (~45 min)

**Total estimated time**: 3-4 hours

---

**Prepared by**: Claude Code
**Date**: 2025-12-15
**Status**: Ready for implementation
