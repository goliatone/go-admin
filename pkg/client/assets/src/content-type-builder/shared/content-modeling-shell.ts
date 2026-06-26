/**
 * Content Modeling Shell
 *
 * Declarative bootstrap that turns a server-rendered (or JS-rendered) modeling
 * shell into a live, persistent {@link PaneLayoutController}. Both content-modeling
 * surfaces — Content Types and Block Library — mark up their shells the same way
 * so they share one collapse / resize / focus behavior and do not drift.
 *
 * Markup contract:
 *
 *   <div data-content-modeling-shell data-cm-surface="content-types">
 *     <aside data-pane-rail="list"
 *            data-pane-resizable data-pane-edge="trailing"
 *            data-pane-min="240" data-pane-max="420" data-pane-default-width="320"> … </aside>
 *     <div data-pane-resize="list"></div>            <!-- splitter -->
 *     <div data-pane="builder">
 *       <button data-pane-toggle="list">…</button>   <!-- collapse the list rail -->
 *       <button data-pane-focus-toggle="builder">…</button>
 *       … builder …
 *     </div>
 *   </div>
 *
 * Only rails whose wrapper element is NOT replaced by a surface's own re-render
 * may be declared here (the controller applies state once at init). Content Types
 * keeps its palette/preview inside the JS-rendered editor root, so those are owned
 * by the editor; only the list rail lives in the shell.
 */

import {
  createPaneLayout,
  PaneLayoutController,
  type PaneLayoutConfig,
  type PaneRailDef,
  type PaneRailEdge,
  type StorageLike,
} from './pane-layout';

export interface ContentModelingShellOptions {
  /** Injectable storage for tests; defaults to the controller's safe localStorage. */
  storage?: StorageLike | null;
  /** Optional change hook forwarded to the controller. */
  onChange?: PaneLayoutConfig['onChange'];
}

function numericAttr(el: HTMLElement, name: string): number | undefined {
  const raw = el.getAttribute(name);
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function railFromElement(el: HTMLElement): PaneRailDef | null {
  const id = el.getAttribute('data-pane-rail');
  if (!id) return null;
  const resizable = el.hasAttribute('data-pane-resizable');
  const edgeAttr = el.getAttribute('data-pane-edge');
  const edge: PaneRailEdge | undefined = edgeAttr === 'leading' || edgeAttr === 'trailing' ? edgeAttr : undefined;
  return {
    id,
    resizable,
    edge,
    min: numericAttr(el, 'data-pane-min'),
    max: numericAttr(el, 'data-pane-max'),
    defaultWidth: numericAttr(el, 'data-pane-default-width'),
    defaultCollapsed: el.hasAttribute('data-pane-default-collapsed'),
  };
}

/**
 * Build a {@link PaneLayoutConfig} by reading the declarative attributes inside a
 * shell root. Exposed for testing.
 */
export function buildShellConfig(root: HTMLElement, opts?: ContentModelingShellOptions): PaneLayoutConfig {
  const surface = root.getAttribute('data-cm-surface')?.trim() || 'content-modeling';

  const rails: PaneRailDef[] = [];
  const seenRails = new Set<string>();
  root.querySelectorAll<HTMLElement>('[data-pane-rail]').forEach((el) => {
    const rail = railFromElement(el);
    if (rail && !seenRails.has(rail.id)) {
      seenRails.add(rail.id);
      rails.push(rail);
    }
  });

  const focusPanes: string[] = [];
  root.querySelectorAll<HTMLElement>('[data-pane-focus-toggle]').forEach((el) => {
    const target = el.getAttribute('data-pane-focus-toggle');
    if (target && !focusPanes.includes(target)) focusPanes.push(target);
  });

  const config: PaneLayoutConfig = { surface, rails, focusPanes };
  if (opts && 'storage' in opts) config.storage = opts.storage;
  if (opts?.onChange) config.onChange = opts.onChange;
  return config;
}

/**
 * Initialize a single shell root. Idempotent — a second call on the same root
 * returns null. Returns null when the root has no declared rails.
 */
export function initContentModelingShell(
  root: HTMLElement | null,
  opts?: ContentModelingShellOptions,
): PaneLayoutController | null {
  if (!root) return null;
  if (root.dataset.cmShellInit === 'true') return null;
  const config = buildShellConfig(root, opts);
  if (config.rails.length === 0) return null;
  const controller = createPaneLayout(root, config);
  if (controller) root.dataset.cmShellInit = 'true';
  return controller;
}

/** Initialize every content-modeling shell within a scope. */
export function initContentModelingShells(
  scope: ParentNode = document,
  opts?: ContentModelingShellOptions,
): PaneLayoutController[] {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>('[data-content-modeling-shell]'));
  const controllers: PaneLayoutController[] = [];
  for (const root of roots) {
    const controller = initContentModelingShell(root, opts);
    if (controller) controllers.push(controller);
  }
  return controllers;
}
