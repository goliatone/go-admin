/**
 * Dashboard Widget Grid - Main export
 * Reusable dashboard widget system with drag & drop, resize, and persistence
 */

export { WidgetGrid } from './widget-grid.js';

export type {
  Widget,
  WidgetArea,
  WidgetLayoutRow,
  WidgetSlot,
  LayoutPreferences,
  WidgetGridConfig,
  WidgetGridSelectors,
  WidgetGridBehaviors,
  DragDropBehavior,
  ResizeBehavior,
  VisibilityBehavior,
  PersistenceBehavior,
} from './types.js';

export { DefaultDragDropBehavior } from './behaviors/drag-drop.js';
export { DefaultResizeBehavior } from './behaviors/resize.js';
export { DefaultVisibilityBehavior } from './behaviors/visibility.js';
export { DefaultPersistenceBehavior } from './behaviors/persistence.js';
