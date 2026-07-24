import { escapeHTML as c } from "../shared/html.js";
import { httpRequest as M, readExpectedHTTPJSON as _, readHTTPError as $ } from "../shared/transport/http-client.js";
import { normalizeDebugBasePath as I } from "./shared/path-helpers.js";
import { C as H, E as O, F as D, G as E, I as j, M as F, N as V, P as N, R as G, T as B, V as K, _ as Q, b as J, f as U, g as Y, h as W, k as h, m as X, p as Z, r as tt, v as et, w as at, x as ot } from "../chunks/builtin-panels-BsgOzEnY.js";
import { t as st } from "../chunks/repl-panel-BKc41M7P.js";
import { i as rt } from "../chunks/icons-B_VaFfsl.js";
import { J as g, S as nt, T as it, X as v, _ as lt, a as Pt, b as dt, c as C, d as y, f as ct, g as ht, h as Lt, l as zt, m as pt, n as q, o as P, ot as bt, p as ut, s as f, u as x, w as p, x as gt } from "../chunks/server-definitions-CLmCY9H_.js";
import { t as k } from "../chunks/deployment-identity-bJVcvaOc.js";
var ft = `
  :host {
    --toolbar-bg: #1e1e2e;
    --toolbar-bg-secondary: #181825;
    --toolbar-border: #313244;
    --toolbar-text: #cdd6f4;
    --toolbar-text-muted: #6c7086;
    --toolbar-accent: #89b4fa;
    --toolbar-accent-hover: #b4befe;
    --toolbar-success: #a6e3a1;
    --toolbar-warning: #f9e2af;
    --toolbar-error: #f38ba8;
    --toolbar-info: #89dceb;
    --toolbar-height-collapsed: 36px;
    --toolbar-height-expanded: 320px;
    --toolbar-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    font-family: var(--toolbar-font);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: auto;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .toolbar {
    background: var(--toolbar-bg);
    border-top: 1px solid var(--toolbar-border);
    color: var(--toolbar-text);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
    display: flex;
    flex-direction: column;
  }

  .toolbar:not(.resizing) {
    transition: height 0.2s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  }

  /* Resize handle */
  .resize-handle {
    position: absolute;
    top: -4px;
    left: 0;
    right: 0;
    height: 8px;
    cursor: ns-resize;
    z-index: 10;
    background: transparent;
  }

  .resize-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 4px;
    background: var(--toolbar-border);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .resize-handle:hover::before,
  .toolbar.resizing .resize-handle::before {
    opacity: 1;
  }

  .toolbar.resizing .resize-handle::before {
    background: var(--toolbar-accent);
  }

  .toolbar.collapsed {
    height: var(--toolbar-height-collapsed);
  }

  .toolbar.expanded {
    height: var(--toolbar-height-expanded);
  }

  .toolbar.hidden {
    transform: translateY(100%);
    opacity: 0;
    pointer-events: none;
  }

  /* Header with tabs */
  .toolbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
    height: 36px;
    min-height: 36px;
    border-bottom: 1px solid var(--toolbar-border);
    background: var(--toolbar-bg-secondary);
  }

  .toolbar-tabs {
    display: flex;
    flex: 1 1 auto;
    gap: 2px;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-behavior: smooth;
    scroll-snap-type: x proximity;
    /* Visible thin scrollbar for discoverability */
    scrollbar-width: thin;
    scrollbar-color: var(--toolbar-border) transparent;
    /* Subtle edge shadows to indicate scrollable overflow */
    --tabs-shadow-size: 12px;
    --tabs-shadow-color: rgba(0, 0, 0, 0.4);
    background:
      /* Left fade indicator */
      linear-gradient(to right, var(--toolbar-bg-secondary) 30%, transparent) left center / var(--tabs-shadow-size) 100% no-repeat,
      /* Right fade indicator */
      linear-gradient(to left, var(--toolbar-bg-secondary) 30%, transparent) right center / var(--tabs-shadow-size) 100% no-repeat,
      /* Left shadow overlay */
      linear-gradient(to right, var(--tabs-shadow-color), transparent) left center / var(--tabs-shadow-size) 100% no-repeat,
      /* Right shadow overlay */
      linear-gradient(to left, var(--tabs-shadow-color), transparent) right center / var(--tabs-shadow-size) 100% no-repeat,
      /* Base background - inherit from parent */
      transparent;
    background-attachment: local, local, scroll, scroll, scroll;
  }

  .toolbar-tabs::-webkit-scrollbar {
    height: 5px;
  }

  .toolbar-tabs::-webkit-scrollbar-track {
    background: transparent;
  }

  .toolbar-tabs::-webkit-scrollbar-thumb {
    background: var(--toolbar-border);
    border-radius: 3px;
  }

  .toolbar-tabs::-webkit-scrollbar-thumb:hover {
    background: var(--toolbar-accent);
  }

  .tab {
    background: transparent;
    border: none;
    color: var(--toolbar-text-muted);
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 11px;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.15s ease;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 6px;
    scroll-snap-align: start;
  }

  .tab .debug-icon {
    display: inline-flex;
    flex: 0 0 14px;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    line-height: 1;
  }

  .tab .debug-icon i {
    display: block;
  }

  .tab:hover {
    background: rgba(137, 180, 250, 0.1);
    color: var(--toolbar-text);
  }

  .tab.active {
    background: var(--toolbar-accent);
    color: var(--toolbar-bg);
  }

  .tab-count {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.15);
    padding: 1px 5px;
    border-radius: 8px;
    min-width: 18px;
    text-align: center;
  }

  .tab.active .tab-count {
    background: rgba(0, 0, 0, 0.2);
  }

  /* Actions */
  .toolbar-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 4px;
    align-items: center;
  }

  .connection-indicator {
    display: flex;
    align-items: center;
    padding: 0 8px;
  }

  .connection-indicator .status-dot {
    width: 8px;
    height: 8px;
  }

  .action-btn {
    background: transparent;
    border: none;
    color: var(--toolbar-text-muted);
    cursor: pointer;
    padding: 6px 8px;
    font-size: 14px;
    font-family: inherit;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn:hover {
    background: rgba(137, 180, 250, 0.1);
    color: var(--toolbar-text);
  }

  .action-btn.toggle-btn {
    font-size: 12px;
    padding: 6px 10px;
  }

  .action-btn.collapse-btn:hover {
    background: rgba(243, 139, 168, 0.2);
    color: var(--toolbar-error);
  }

  .expand-link {
    color: var(--toolbar-text-muted);
    text-decoration: none;
    padding: 6px 8px;
    font-size: 14px;
    border-radius: 4px;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .expand-link:hover {
    background: rgba(137, 180, 250, 0.1);
    color: var(--toolbar-text);
  }

  /* Content area */
  .toolbar-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-container {
    flex: 1;
    overflow: auto;
    padding: 0 12px 8px 12px;
    scrollbar-width: thin;
    scrollbar-color: var(--toolbar-border) transparent;
  }

  .panel-container::-webkit-scrollbar {
    width: 6px;
  }

  .panel-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .panel-container::-webkit-scrollbar-thumb {
    background: var(--toolbar-border);
    border-radius: 3px;
  }

  /* Summary bar (shown when collapsed) */
  .toolbar-summary {
    display: flex;
    gap: 16px;
    padding: 0 12px;
    height: 36px;
    align-items: center;
    cursor: pointer;
    background: var(--toolbar-bg);
    transition: background 0.15s ease;
  }

  .toolbar-summary:hover {
    background: var(--toolbar-bg-secondary);
  }

  .toolbar.expanded .toolbar-summary {
    display: none;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--toolbar-text-muted);
    font-size: 11px;
  }

  .summary-item .count {
    color: var(--toolbar-text);
    font-weight: 600;
  }

  .summary-item.has-errors .count {
    color: var(--toolbar-error);
  }

  .summary-item.has-slow .count {
    color: var(--toolbar-warning);
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--toolbar-text-muted);
  }

  .status-dot.connected {
    background: var(--toolbar-success);
    box-shadow: 0 0 4px var(--toolbar-success);
  }

  .status-dot.error {
    background: var(--toolbar-error);
    box-shadow: 0 0 4px var(--toolbar-error);
  }

  .status-dot.reconnecting {
    background: var(--toolbar-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Table styles */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th, td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--toolbar-border);
    vertical-align: top;
  }

  th {
    color: var(--toolbar-text-muted);
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
    background: var(--toolbar-bg);
    z-index: 1;
  }

  tr:hover td {
    background: rgba(137, 180, 250, 0.05);
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge-method {
    background: rgba(137, 180, 250, 0.2);
    color: var(--toolbar-accent);
  }

  .badge-method.get { background: rgba(166, 227, 161, 0.2); color: var(--toolbar-success); }
  .badge-method.post { background: rgba(137, 180, 250, 0.2); color: var(--toolbar-accent); }
  .badge-method.put { background: rgba(249, 226, 175, 0.2); color: var(--toolbar-warning); }
  .badge-method.patch { background: rgba(249, 226, 175, 0.2); color: var(--toolbar-warning); }
  .badge-method.delete { background: rgba(243, 139, 168, 0.2); color: var(--toolbar-error); }

  .badge-status {
    background: rgba(166, 227, 161, 0.2);
    color: var(--toolbar-success);
  }

  .badge-status.error {
    background: rgba(243, 139, 168, 0.2);
    color: var(--toolbar-error);
  }

  .badge-status.warn {
    background: rgba(249, 226, 175, 0.2);
    color: var(--toolbar-warning);
  }

  .badge-level {
    min-width: 40px;
    text-align: center;
  }

  .badge-level.debug { background: rgba(108, 112, 134, 0.3); color: var(--toolbar-text-muted); }
  .badge-level.info { background: rgba(137, 220, 235, 0.2); color: var(--toolbar-info); }
  .badge-level.warn { background: rgba(249, 226, 175, 0.2); color: var(--toolbar-warning); }
  .badge-level.error { background: rgba(243, 139, 168, 0.2); color: var(--toolbar-error); }

  /* Query highlighting */
  .slow-query {
    color: var(--toolbar-warning);
  }

  .error-query {
    color: var(--toolbar-error);
  }

  /* Code/pre */
  pre, code {
    font-family: var(--toolbar-font);
    font-size: 11px;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--toolbar-text);
  }

  .query-text {
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Empty state */
  .empty-state {
    color: var(--toolbar-text-muted);
    text-align: center;
    padding: 24px;
    padding-top: 32px;
    font-size: 12px;
  }

  /* JSON viewer */
  .json-viewer {
    background: var(--toolbar-bg-secondary);
    border-radius: 4px;
    padding: 8px;
    margin-top: 8px;
    overflow: auto;
    max-height: 100%;
    position: relative;
  }

  .json-viewer pre {
    font-size: 11px;
    line-height: 1.5;
  }

  .json-viewer__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--toolbar-border);
  }

  .json-viewer__title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--toolbar-text-muted);
  }

  /* -------------------------------------------------------------------------
   * Declarative schema panels (server-declared identity / key_value views).
   * Mirrors the console rules in src/styles/debug/console.css at toolbar scale.
   * ---------------------------------------------------------------------- */
  .debug-identity {
    --debug-identity-color: #64748b;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 28px;
    margin-top: 8px;
    padding: 10px 12px 10px 15px;
    background: var(--toolbar-bg-secondary);
    border: 1px solid var(--toolbar-border);
    border-radius: 4px;
  }

  .debug-identity::before {
    content: "";
    position: absolute;
    top: -1px;
    bottom: -1px;
    left: -1px;
    width: 3px;
    border-radius: 4px 0 0 4px;
    background: var(--debug-identity-color);
  }

  .debug-identity[data-accent="none"]::before {
    background: var(--toolbar-border);
  }

  .debug-identity__lead {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .debug-identity__env {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    padding: 3px 9px;
    border-radius: 999px;
    border: 1px solid var(--toolbar-border);
    background: rgba(255, 255, 255, 0.04);
    color: var(--toolbar-text);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  /* Tint and dot follow the configured color; the label keeps full contrast. */
  @supports (color: color-mix(in srgb, red 10%, transparent)) {
    .debug-identity__env {
      border-color: color-mix(in srgb, var(--debug-identity-color) 50%, transparent);
      background: color-mix(in srgb, var(--debug-identity-color) 16%, transparent);
    }
  }

  .debug-identity__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--debug-identity-color);
  }

  .debug-identity__names {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .debug-identity__label {
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--toolbar-text-muted);
  }

  .debug-identity__title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--toolbar-text);
  }

  .debug-identity__title .debug-kv__mono {
    font-size: 13px;
    font-weight: 700;
  }

  .debug-identity__subtitle {
    font-size: 10px;
    color: var(--toolbar-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .debug-identity__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 0;
    min-width: 0;
  }

  .debug-identity__chip {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .debug-identity__chip dt {
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--toolbar-text-muted);
  }

  .debug-identity__chip dd {
    margin: 0;
    font-size: 11px;
    color: var(--toolbar-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .debug-schema-grid {
    column-width: 260px;
    column-gap: 8px;
    margin-top: 8px;
  }

  .debug-schema-grid > * {
    break-inside: avoid;
    -webkit-column-break-inside: avoid;
    margin: 0 0 8px;
  }

  .debug-schema-grid > .json-viewer {
    margin-top: 0;
  }

  .debug-kv {
    display: grid;
    grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
    align-items: baseline;
    margin: 0;
    font-size: 11px;
  }

  .debug-kv > dt {
    padding: 4px 8px 4px 0;
    color: var(--toolbar-text-muted);
    font-weight: 600;
  }

  .debug-kv > dd {
    margin: 0;
    padding: 4px 0;
    min-width: 0;
    color: var(--toolbar-text);
    overflow-wrap: anywhere;
  }

  .debug-kv > dt,
  .debug-kv > dd {
    border-bottom: 1px solid rgba(49, 50, 68, 0.55);
  }

  .debug-kv > dt:last-of-type,
  .debug-kv > dd:last-of-type {
    border-bottom: 0;
  }

  .debug-kv__mono {
    font-family: var(--toolbar-font);
    color: var(--toolbar-text);
  }

  .debug-kv .badge,
  .debug-identity__chip .badge {
    min-width: 0;
    background: rgba(205, 214, 244, 0.08);
    color: var(--toolbar-text);
  }

  .debug-kv__empty {
    color: var(--toolbar-text-muted);
    font-style: italic;
  }

  .debug-kv__swatch {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .debug-kv__swatch-dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border-radius: 3px;
    border: 1px solid rgba(205, 214, 244, 0.2);
    background: var(--debug-swatch-color, #64748b);
  }

  .debug-kv__copy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-width: 0;
  }

  .debug-kv__copy > code {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .debug-kv__copy-btn {
    flex: 0 0 auto;
    opacity: 0.6;
    transition: opacity 0.15s ease, background 0.15s ease;
  }

  .debug-kv__copy:hover .debug-kv__copy-btn,
  .debug-kv__copy-btn:hover,
  .debug-kv__copy-btn:focus-visible {
    opacity: 1;
  }

  .debug-kv__copy-btn:focus-visible {
    outline: 2px solid var(--toolbar-accent);
    outline-offset: 1px;
  }

  @media (max-width: 640px) {
    .debug-identity {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .debug-kv {
      grid-template-columns: minmax(0, 1fr);
    }

    .debug-kv > dt {
      padding: 4px 0 0;
      border-bottom: 0;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .debug-kv > dd {
      padding: 0 0 4px;
    }

    .debug-kv > dt:last-of-type {
      border-bottom: 0;
    }
  }

  /* Copy button */
  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid var(--toolbar-border);
    color: var(--toolbar-text-muted);
    padding: 3px 8px;
    font-size: 10px;
    font-family: inherit;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .copy-btn:hover {
    background: rgba(137, 180, 250, 0.1);
    border-color: var(--toolbar-accent);
    color: var(--toolbar-text);
  }

  .copy-btn.copied {
    background: rgba(166, 227, 161, 0.15);
    border-color: var(--toolbar-success);
    color: var(--toolbar-success);
  }

  .copy-btn svg {
    width: 12px;
    height: 12px;
  }

  /* SQL selection */
  .sql-select {
    width: 28px;
    text-align: center;
    padding-left: 6px !important;
    padding-right: 2px !important;
  }

  .sql-select input[type="checkbox"] {
    cursor: pointer;
    appearance: none;
    width: 14px;
    height: 14px;
    border: 1.5px solid var(--toolbar-text-muted);
    border-radius: 3px;
    background: transparent;
    position: relative;
    transition: all 0.15s ease;
  }

  .sql-select input[type="checkbox"]:hover {
    border-color: var(--toolbar-accent);
  }

  .sql-select input[type="checkbox"]:checked {
    background: var(--toolbar-accent);
    border-color: var(--toolbar-accent);
  }

  .sql-select input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid var(--toolbar-bg);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .sql-select input[type="checkbox"]:indeterminate {
    border-color: var(--toolbar-accent);
  }

  .sql-select input[type="checkbox"]:indeterminate::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 5px;
    width: 8px;
    height: 2px;
    background: var(--toolbar-accent);
  }

  .sql-toolbar {
    display: none;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(137, 180, 250, 0.08);
    border: 1px solid rgba(137, 180, 250, 0.2);
    border-radius: 6px;
    margin-bottom: 4px;
    font-size: 11px;
    color: var(--toolbar-text-muted);
  }

  .sql-toolbar[data-visible="true"] {
    display: flex;
  }

  .sql-toolbar span {
    font-weight: 600;
    color: var(--toolbar-accent);
    margin-right: 4px;
  }

  .sql-toolbar button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: 1px solid rgba(137, 180, 250, 0.3);
    border-radius: 4px;
    background: transparent;
    color: var(--toolbar-text-muted);
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sql-toolbar button:hover {
    background: rgba(137, 180, 250, 0.1);
    border-color: var(--toolbar-accent);
    color: var(--toolbar-text);
  }

  .sql-toolbar button svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  /* Duration formatting */
  .duration {
    color: var(--toolbar-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .duration.slow {
    color: var(--toolbar-warning);
    font-weight: 600;
  }

  /* Timestamp */
  .timestamp {
    color: var(--toolbar-text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Path/URL */
  .path {
    color: var(--toolbar-text);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Message */
  .message {
    color: var(--toolbar-text);
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message:hover {
    white-space: normal;
    word-break: break-word;
  }

  /* Prism Catppuccin Mocha Theme */
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: #6c7086;
    font-style: italic;
  }

  .token.punctuation {
    color: #9399b2;
  }

  .token.namespace {
    opacity: 0.7;
  }

  .token.property,
  .token.tag,
  .token.boolean,
  .token.number,
  .token.constant,
  .token.symbol {
    color: #fab387;
  }

  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin {
    color: #a6e3a1;
  }

  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string,
  .token.variable {
    color: #89dceb;
  }

  .token.atrule,
  .token.attr-value,
  .token.function {
    color: #f9e2af;
  }

  .token.keyword {
    color: #cba6f7;
    font-weight: 600;
  }

  .token.regex,
  .token.important {
    color: #fab387;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }

  .token.italic {
    font-style: italic;
  }

  .token.entity {
    cursor: help;
  }

  .token.deleted {
    color: #f38ba8;
  }

  .token.inserted {
    color: #a6e3a1;
  }

  /* Expandable row styles */
  .expandable-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .expandable-row:hover {
    background: rgba(137, 180, 250, 0.08) !important;
  }

  .expandable-row .expand-icon {
    display: inline-block;
    width: 12px;
    text-align: center;
    margin-right: 4px;
    transition: transform 0.2s ease;
    opacity: 0.5;
    font-size: 10px;
  }

  .expandable-row:hover .expand-icon {
    opacity: 1;
  }

  .expandable-row.expanded .expand-icon {
    transform: rotate(90deg);
  }

  .expanded-content {
    display: none;
    background: #181825;
    border: 1px solid #313244;
    border-radius: 4px;
    margin: 4px 8px 8px 8px;
    padding: 12px;
    overflow-x: auto;
  }

  .expanded-content__header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .expanded-content pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    font-size: 11px;
  }

  .expandable-row.expanded + tr .expanded-content {
    display: block;
  }

  /* Row with expanded content */
  .expansion-row {
    background: transparent !important;
  }

  .expansion-row:hover {
    background: transparent !important;
  }

  .expansion-row td {
    padding: 0 !important;
    border: none !important;
  }

  /* Panel controls (sort toggle) */
  .panel-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 8px 0 4px 0;
    border-bottom: 1px solid var(--toolbar-border);
    margin-bottom: 4px;
  }

  .sort-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 11px;
    color: var(--toolbar-text-muted);
    user-select: none;
    transition: color 0.15s ease;
  }

  .sort-toggle:hover {
    color: var(--toolbar-text);
  }

  .sort-toggle input[type="checkbox"] {
    appearance: none;
    width: 14px;
    height: 14px;
    border: 1px solid var(--toolbar-border);
    border-radius: 3px;
    background: var(--toolbar-bg-secondary);
    cursor: pointer;
    position: relative;
    transition: all 0.15s ease;
  }

  .sort-toggle input[type="checkbox"]:hover {
    border-color: var(--toolbar-accent);
  }

  .sort-toggle input[type="checkbox"]:checked {
    background: var(--toolbar-accent);
    border-color: var(--toolbar-accent);
  }

  .sort-toggle input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid var(--toolbar-bg);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  /* Request detail rows */
  .request-detail-row {
    background: transparent !important;
  }

  .request-detail-row:hover {
    background: transparent !important;
  }

  .request-detail-row td {
    padding: 0 !important;
    border: none !important;
  }

  .request-detail-pane {
    background: var(--toolbar-bg-secondary);
    border: 1px solid var(--toolbar-border);
    border-radius: 4px;
    margin: 4px 8px 8px 8px;
    padding: 10px 12px;
  }

  .request-detail-section {
    margin-bottom: 8px;
  }

  .request-detail-section:last-child {
    margin-bottom: 0;
  }

  .request-detail-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--toolbar-text-muted);
    margin-bottom: 3px;
  }

  .request-detail-value {
    font-family: var(--toolbar-font);
    font-size: 11px;
    color: var(--toolbar-text);
    word-break: break-all;
  }

  .request-detail-kv {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    font-size: 11px;
    margin: 0;
  }

  .request-detail-kv dt {
    color: var(--toolbar-accent);
    font-weight: 500;
    white-space: nowrap;
  }

  .request-detail-kv dd {
    color: var(--toolbar-text);
    margin: 0;
    word-break: break-all;
  }

  .request-detail-masked {
    color: var(--toolbar-text-muted);
    font-style: italic;
    font-size: 10px;
  }

  .request-detail-error {
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid rgba(243, 139, 168, 0.3);
    border-radius: 4px;
    padding: 6px 8px;
    color: var(--toolbar-error);
    font-size: 11px;
    word-break: break-word;
  }

  .request-detail-body {
    background: rgba(30, 30, 46, 0.6);
    border: 1px solid var(--toolbar-border);
    border-radius: 4px;
    padding: 10px 12px;
    margin-top: 4px;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
  }

  .request-detail-body pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    font-size: 11px;
    color: var(--toolbar-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  .request-detail-metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    font-size: 11px;
    color: var(--toolbar-text-muted);
    margin-bottom: 6px;
  }

  .request-detail-metadata code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: var(--toolbar-text);
    font-size: 11px;
  }

  .request-detail-metadata span {
    white-space: nowrap;
  }

  /* Content-Type badge */
  .badge-content-type {
    font-size: 9px;
    font-weight: 500;
    text-transform: none;
    padding: 1px 5px;
    margin-left: 4px;
    background: rgba(108, 112, 134, 0.2);
    color: var(--toolbar-text-muted);
    vertical-align: middle;
  }

  /* Request row cursor */
  [data-request-id] {
    cursor: pointer;
  }

  [data-request-id]:hover {
    background: rgba(137, 180, 250, 0.08) !important;
  }

  [data-request-id] [data-expand-icon] {
    display: inline-block;
    width: 12px;
    text-align: center;
    margin-right: 4px;
    opacity: 0.5;
    font-size: 10px;
    transition: opacity 0.15s ease;
  }

  [data-request-id]:hover [data-expand-icon] {
    opacity: 1;
  }

  /* Responsive */
  @media (max-width: 768px) {
    :host {
      --toolbar-height-expanded: 50vh;
    }

    .toolbar-tabs {
      max-width: 60%;
    }
  }
`, d = h;
function w(a, t, e = 50, o) {
  const s = p.get(a);
  if (s) return it(s, gt(t, s), d, o || {}, "toolbar");
  const r = o?.newestFirst ?? !0, i = o?.slowThresholdMs ?? e;
  switch (a) {
    case "requests":
      return B(t.requests || [], d, {
        newestFirst: r,
        slowThresholdMs: i,
        maxEntries: 50,
        showSortToggle: !0,
        truncatePath: !0,
        maxPathLength: 50,
        expandedRequestIds: o?.expandedRequestIds,
        maxDetailLength: 80
      });
    case "sql":
      return K(t.sql || [], d, {
        newestFirst: r,
        slowThresholdMs: i,
        maxEntries: 50,
        showSortToggle: !0,
        useIconCopyButton: !1
      });
    case "logs":
      return ot(t.logs || [], d, {
        newestFirst: !0,
        maxEntries: 100,
        showSortToggle: !1,
        showSource: !1,
        truncateMessage: !0,
        maxMessageLength: 100
      });
    case "config":
      return g("Config", t.config || {}, d, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "routes":
      return Q(t.routes || [], d, { showName: !1 });
    case "template":
      return g("Template Context", t.template || {}, d, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "session":
      return g("Session", t.session || {}, d, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "jserrors":
      return X(t.jserrors || [], d, {
        newestFirst: r,
        maxEntries: 50,
        compact: !0,
        showSortToggle: !0
      });
    case "custom":
      return W(t.custom || {}, d, {
        maxLogEntries: 50,
        useIconCopyButton: !1,
        showCount: !1
      });
    default: {
      const n = t[a];
      return n != null ? g(a.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), n, d, {
        useIconCopyButton: !1,
        showCount: !1
      }) : `<div class="${d.emptyState}">Panel "${c(a)}" not available</div>`;
    }
  }
}
function u(a, t = 50) {
  return pt(a, t);
}
var m, S = "debug-toolbar-active-panel", L = class b extends HTMLElement {
  static get observedAttributes() {
    return [
      "base-path",
      "debug-path",
      "panels",
      "expanded",
      "slow-threshold-ms",
      "use-fab",
      "live-transport"
    ];
  }
  constructor() {
    super(), this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.stream = null, this.externalStream = null, this.snapshot = {}, this.replPanels = /* @__PURE__ */ new Map(), this.replCommands = [], this.expanded = !1, this.activePanel = "requests", this.connectionStatus = "disconnected", this.slowThresholdMs = 50, this.useFab = !1, this.customHeight = null, this.isResizing = !1, this.resizeStartY = 0, this.resizeStartHeight = 0, this.panelSortOrder = /* @__PURE__ */ new Map([["requests", !0], ["sql", !0]]), this.eventToPanel = {}, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.initializeGeneration = 0, this.panelActionResults = /* @__PURE__ */ new Map(), this.handleKeyDown = (t) => {
      (t.ctrlKey || t.metaKey) && t.shiftKey && t.key.toLowerCase() === "d" && (t.preventDefault(), this.toggleExpanded()), t.key === "Escape" && this.expanded && this.collapse();
    }, this.shadow = this.attachShadow({ mode: "open" }), this.sqlView = new H({
      styles: h,
      copyOptions: { useIconFeedback: !1 },
      getQueries: () => this.snapshot.sql || [],
      getRenderOptions: () => ({
        newestFirst: this.panelSortOrder.get("sql") ?? !0,
        slowThresholdMs: this.slowThresholdMs,
        maxEntries: 50,
        useIconCopyButton: !1
      }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent()
    }), this.logsView = new v({
      styles: h,
      keyOf: et,
      renderRow: (t) => J(t, h, {
        showSource: !1,
        truncateMessage: !0,
        maxMessageLength: 100
      }),
      getRenderOptions: () => ({ newestFirst: !0 }),
      getMaxEntries: () => 100,
      onNeedFullRender: () => this.updateContent()
    }), this.requestsView = new v({
      styles: h,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: O,
      renderRow: (t) => at(t, h, {
        slowThresholdMs: this.slowThresholdMs,
        truncatePath: !0,
        maxPathLength: 50,
        expandedRequestIds: this.expandedRequests,
        maxDetailLength: 80
      }),
      getRenderOptions: () => ({ newestFirst: this.panelSortOrder.get("requests") ?? !0 }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
      onAdopt: (t) => N(t, this.expandedRequests, { useIconFeedback: !1 })
    }), this.jserrorsView = new v({
      styles: h,
      keyOf: U,
      renderRow: (t) => Z(t, h, { compact: !0 }),
      getRenderOptions: () => ({ newestFirst: this.panelSortOrder.get("jserrors") ?? !0 }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
      onAdopt: (t) => D(t, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (t) => G(t, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new Y({
      styles: h,
      allowUpsert: !1,
      getRenderOptions: () => ({}),
      onNeedFullRender: () => this.updateContent()
    });
  }
  connectedCallback() {
    this.initializeGeneration += 1, this.initialize(this.initializeGeneration);
  }
  async initialize(t) {
    if (await q(this.debugPath), !this.isInitializationStale(t)) {
      if (this.eventToPanel = f(), this.unsubscribeRegistry = p.subscribe((e) => this.handleRegistryChange(e)), this.isInitializationStale(t)) {
        this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null;
        return;
      }
      this.loadState(), this.render(), this.useFab || (this.liveTransportEnabled && this.initWebSocket(), this.fetchInitialSnapshot(t)), this.setupKeyboardShortcut();
    }
  }
  disconnectedCallback() {
    this.initializeGeneration += 1, this.stream?.close(), this.stream = null, this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null, document.removeEventListener("keydown", this.handleKeyDown);
  }
  isInitializationStale(t) {
    return t !== this.initializeGeneration || !this.isConnected;
  }
  handleRegistryChange(t) {
    this.eventToPanel = f(), this.updateSubscriptions(), this.expanded && this.render();
  }
  updateSubscriptions() {
    const t = this.getStream();
    if (!t) return;
    const e = /* @__PURE__ */ new Set();
    for (const o of this.panels) for (const s of y(o)) e.add(s);
    t.subscribe(Array.from(e));
  }
  attributeChangedCallback(t, e, o) {
    e !== o && (t === "expanded" ? (this.expanded = o === "true" || o === "", this.saveState(), this.render()) : t === "slow-threshold-ms" ? this.slowThresholdMs = parseInt(o || "50", 10) || 50 : t === "use-fab" ? this.useFab = o === "true" || o === "" : t === "live-transport" && !this.useFab && !this.liveTransportEnabled && this.stream?.close());
  }
  setExpanded(t) {
    this.expanded = t, this.saveState(), this.render();
  }
  setSnapshot(t) {
    this.applySnapshot(t || {});
  }
  setConnectionStatus(t) {
    this.connectionStatus = t, this.updateConnectionStatus();
  }
  setStream(t) {
    this.externalStream = t;
  }
  isExpanded() {
    return this.expanded;
  }
  normalizeStoredPanelID(t) {
    const e = typeof t == "string" ? t.trim() : "";
    return e && this.panels.includes(e) ? e : null;
  }
  fallbackActivePanel() {
    return this.panels[0] || "requests";
  }
  loadState() {
    try {
      const t = localStorage.getItem("debug-toolbar-expanded");
      t !== null && (this.expanded = t === "true");
      const e = localStorage.getItem("debug-toolbar-height");
      if (e !== null) {
        const s = parseInt(e, 10);
        !isNaN(s) && s >= b.MIN_HEIGHT && (this.customHeight = s);
      }
      const o = localStorage.getItem("debug-toolbar-sort-order");
      if (o) try {
        const s = JSON.parse(o);
        Object.entries(s).forEach(([r, i]) => {
          this.panelSortOrder.set(r, i);
        });
      } catch {
      }
      this.activePanel = this.normalizeStoredPanelID(localStorage.getItem(S)) || this.normalizeStoredPanelID(this.activePanel) || this.fallbackActivePanel();
    } catch {
      this.activePanel = this.normalizeStoredPanelID(this.activePanel) || this.fallbackActivePanel();
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.expanded)), this.customHeight !== null && localStorage.setItem("debug-toolbar-height", String(this.customHeight));
      const t = {};
      this.panelSortOrder.forEach((e, o) => {
        t[o] = e;
      }), localStorage.setItem("debug-toolbar-sort-order", JSON.stringify(t)), localStorage.setItem(S, this.activePanel);
    } catch {
    }
  }
  setupKeyboardShortcut() {
    document.addEventListener("keydown", this.handleKeyDown);
  }
  toggleExpanded() {
    this.expanded = !this.expanded, this.saveState(), this.render(), this.dispatchExpandEvent();
  }
  collapse() {
    this.expanded && (this.expanded = !1, this.saveState(), this.render(), this.dispatchExpandEvent());
  }
  dispatchExpandEvent() {
    this.dispatchEvent(new CustomEvent("debug-expand", {
      detail: { expanded: this.expanded },
      bubbles: !0,
      composed: !0
    }));
  }
  get basePath() {
    const t = (this.getAttribute("base-path") || "").trim();
    return t ? t.startsWith("http://") || t.startsWith("https://") || t.startsWith("//") ? t.replace(/\/+$/g, "") : t === "/" ? "" : "/" + t.replace(/^\/+|\/+$/g, "") : "";
  }
  get debugPath() {
    const t = this.getAttribute("debug-path");
    return t || `${this.basePath}/debug`;
  }
  get panels() {
    const t = this.getAttribute("panels");
    if (t) {
      const e = t.split(",").map((o) => o.trim().toLowerCase()).filter(Boolean);
      return e.length ? e : x();
    }
    return x();
  }
  get liveTransportEnabled() {
    const t = this.getAttribute("live-transport");
    return t === null ? !0 : t === "" || t === "true";
  }
  get wsUrl() {
    return `${this.debugPath}/ws`;
  }
  getStream() {
    return this.externalStream || this.stream;
  }
  initWebSocket() {
    this.stream = new E({
      basePath: this.debugPath,
      onEvent: (e) => this.handleEvent(e),
      onStatusChange: (e) => this.handleStatusChange(e)
    }), this.stream.connect();
    const t = /* @__PURE__ */ new Set();
    for (const e of this.panels) for (const o of y(e)) t.add(o);
    this.stream.subscribe(Array.from(t));
  }
  async fetchInitialSnapshot(t = this.initializeGeneration) {
    const e = await C(this.debugPath);
    this.isInitializationStale(t) || e && this.applySnapshot(e);
  }
  handleEvent(t) {
    if (!t || !t.type) return;
    if (t.type === "snapshot") {
      this.applySnapshot(t.payload);
      return;
    }
    const e = P(this.snapshot, t, { eventToPanel: this.eventToPanel }) || t.type;
    if (e === this.activePanel && this.expanded) if (e === "sql") this.sqlView.enqueue([t.payload]);
    else if (e === "logs") this.logsView.enqueue([t.payload]);
    else if (e === "requests") this.requestsView.enqueue([t.payload]);
    else if (e === "jserrors") this.jserrorsView.enqueue([t.payload]);
    else if (this.registryLiveList.handles(p.get(e))) {
      const o = p.get(e), s = this.snapshot[nt(o)], r = Array.isArray(s) ? s[s.length - 1] : void 0;
      this.registryLiveList.enqueue(o, r);
    } else this.updateContent();
  }
  handleStatusChange(t) {
    this.connectionStatus = t, this.updateConnectionStatus();
  }
  applySnapshot(t) {
    this.snapshot = t || {}, this.replCommands = ht(this.snapshot.repl_commands), this.updateContent();
  }
  render() {
    const t = u(this.snapshot, this.slowThresholdMs), e = this.panels.map((n) => {
      const l = ut(n), T = this.getPanelCount(n), R = this.activePanel === n ? "active" : "", A = rt(ct(n), {
        size: "14px",
        extraClass: "tab-icon"
      });
      return `
          <button class="tab ${R}" data-panel="${c(n)}">
            ${A}
            <span class="tab-label">${c(l)}</span>
            <span class="tab-count">${T}</span>
          </button>
        `;
    }).join(""), o = this.expanded ? "expanded" : "collapsed", s = this.useFab && !this.expanded ? "hidden" : "", r = this.expanded ? this.customHeight || b.DEFAULT_HEIGHT : 36, i = this.expanded ? `height: ${r}px;` : "";
    this.shadow.innerHTML = `
      <style>${ft}</style>
      <div class="toolbar ${o} ${s}" style="${i}">
        ${this.expanded ? `
          <div class="resize-handle" data-resize-handle></div>
          <div class="toolbar-header">
            <div class="toolbar-tabs">${e}</div>
            <div class="toolbar-actions">
              <span class="connection-indicator">
                <span class="status-dot ${this.connectionStatus}"></span>
              </span>
              <button class="action-btn" data-action="refresh" title="Refresh (get snapshot)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
              <button class="action-btn" data-action="clear" title="Clear all data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <a class="action-btn expand-link" href="${this.debugPath}" title="Open full debug page">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </a>
              <button class="action-btn collapse-btn" data-action="collapse" title="Collapse (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="toolbar-content">
            <div class="panel-container" id="panel-content">
              ${w(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions())}
            </div>
          </div>
        ` : ""}
        ${this.useFab ? "" : `
          <div class="toolbar-summary">
            <div class="summary-item ${t.errors > 0 ? "has-errors" : ""}">
              <span>Requests:</span>
              <span class="count">${t.requests}</span>
            </div>
            <div class="summary-item ${t.slowQueries > 0 ? "has-slow" : ""}">
              <span>SQL:</span>
              <span class="count">${t.sql}</span>
            </div>
            <div class="summary-item">
              <span>Logs:</span>
              <span class="count">${t.logs}</span>
            </div>
            ${t.errors > 0 ? `
              <div class="summary-item has-errors">
                <span>Errors:</span>
                <span class="count">${t.errors}</span>
              </div>
            ` : ""}
            <div class="connection-status">
              <span class="status-dot ${this.connectionStatus}"></span>
              <span>${this.connectionStatus}</span>
            </div>
          </div>
        `}
      </div>
    `, this.attachEventListeners(), this.renderStoredPanelActionResult(this.activePanel);
  }
  updateContent() {
    if (this.expanded) {
      const t = this.shadow.getElementById("panel-content");
      t && (lt.has(this.activePanel) ? this.renderReplPanel(t, this.activePanel) : (t.innerHTML = w(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions()), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.mountActivePanelViews(), this.attachPanelActionListeners(), this.renderStoredPanelActionResult(this.activePanel))), this.panels.forEach((e) => {
        const o = this.shadow.querySelector(`[data-panel="${e}"] .tab-count`);
        o && (o.textContent = String(this.getPanelCount(e)));
      });
    }
    this.useFab || this.updateSummary();
  }
  updateSummary() {
    const t = u(this.snapshot, this.slowThresholdMs), e = this.shadow.querySelector(".toolbar-summary");
    e && e.querySelectorAll(".summary-item").forEach((o) => {
      const s = o.querySelector("span:first-child")?.textContent?.replace(":", "").toLowerCase(), r = o.querySelector(".count");
      !r || !s || (s === "requests" ? (r.textContent = String(t.requests), o.classList.toggle("has-errors", t.errors > 0)) : s === "sql" ? (r.textContent = String(t.sql), o.classList.toggle("has-slow", t.slowQueries > 0)) : s === "logs" ? r.textContent = String(t.logs) : s === "errors" && (r.textContent = String(t.errors)));
    });
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".connection-indicator .status-dot");
    t && (t.className = `status-dot ${this.connectionStatus}`);
    const e = this.shadow.querySelector(".connection-status .status-dot"), o = this.shadow.querySelector(".connection-status span:last-child");
    e && (e.className = `status-dot ${this.connectionStatus}`), o && (o.textContent = this.connectionStatus);
  }
  getPanelCount(t) {
    const e = p.get(t);
    if (e) return dt(this.snapshot, e);
    switch (t) {
      case "requests":
        return this.snapshot.requests?.length || 0;
      case "sql":
        return this.snapshot.sql?.length || 0;
      case "logs":
        return this.snapshot.logs?.length || 0;
      case "routes":
        return this.snapshot.routes?.length || 0;
      case "template":
        return Object.keys(this.snapshot.template || {}).length;
      case "session":
        return Object.keys(this.snapshot.session || {}).length;
      case "config":
        return Object.keys(this.snapshot.config || {}).length;
      case "custom":
        const o = this.snapshot.custom || {};
        return Object.keys(o.data || {}).length + (o.logs?.length || 0);
      default: {
        const s = this.snapshot[t];
        return Array.isArray(s) ? s.length : s != null && typeof s == "object" ? Object.keys(s).length : 0;
      }
    }
  }
  getPanelOptions() {
    return {
      slowThresholdMs: this.slowThresholdMs,
      newestFirst: this.panelSortOrder.get(this.activePanel) ?? !0,
      expandedRequestIds: this.expandedRequests
    };
  }
  attachEventListeners() {
    if (this.shadow.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", (e) => {
        const o = e.currentTarget.dataset.panel;
        if (o && o !== this.activePanel) {
          this.activePanel = o, this.saveState(), this.shadow.querySelectorAll(".tab").forEach((r) => r.classList.remove("active")), e.currentTarget.classList.add("active");
          const s = this.shadow.getElementById("panel-content");
          s && (s.innerHTML = w(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions()), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.mountActivePanelViews(), this.attachPanelActionListeners());
        }
      });
    }), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.mountActivePanelViews(), this.attachPanelActionListeners(), this.shadow.querySelectorAll("[data-action]").forEach((t) => {
      t.addEventListener("click", (e) => {
        const o = e.currentTarget.dataset.action, s = this.getStream();
        switch (o) {
          case "toggle":
            this.toggleExpanded();
            break;
          case "collapse":
            this.collapse();
            break;
          case "refresh":
            s?.requestSnapshot();
            break;
          case "clear":
            s?.clear(), this.snapshot = {}, this.updateContent();
            break;
        }
      });
    }), !this.useFab) {
      const t = this.shadow.querySelector(".toolbar-summary");
      t && t.addEventListener("click", () => {
        this.expanded || (this.expanded = !0, this.saveState(), this.render(), this.dispatchExpandEvent());
      });
    }
    this.attachResizeListeners(), this.attachCopyListeners();
  }
  attachPanelActionListeners() {
    this.shadow.querySelectorAll("[data-panel-action]").forEach((t) => {
      t.addEventListener("click", () => {
        t.disabled || this.runPanelAction(t, t);
      });
    }), this.shadow.querySelectorAll("[data-panel-action-form]").forEach((t) => {
      t.addEventListener("submit", (e) => {
        e.preventDefault();
        const o = t.querySelector('button[type="submit"]') || void 0;
        o?.disabled || this.runPanelAction(t, o);
      });
    });
  }
  async runPanelAction(t, e) {
    const o = t.dataset.panelId || "", s = t.dataset.actionId || "";
    if (!o || !s) return;
    const r = t.dataset.actionConfirm || "";
    if ((t.dataset.actionRequiresConfirm === "true" || r) && !window.confirm(r || "Run this debug panel action?")) return;
    const i = tt(t);
    e && (e.disabled = !0);
    try {
      const n = await M(`${this.debugPath}/api/panels/${encodeURIComponent(o)}/actions/${encodeURIComponent(s)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(i)
      });
      if (!n.ok) throw new Error(await $(n, `Action failed (${n.status})`, { appendStatusToFallback: !1 }));
      const l = await _(n);
      this.showPanelActionResult(o, l.ok === !1 ? "error" : "ok", l.message || (l.ok === !1 ? "Action failed" : "Action complete"), l.data), l.event && this.handleEvent(l.event), l.refresh && await this.fetchInitialSnapshot();
    } catch (n) {
      const l = n instanceof Error ? n.message : "Action failed";
      this.showPanelActionResult(o, "error", l);
    } finally {
      e && (e.disabled = !1);
    }
  }
  showPanelActionResult(t, e, o, s) {
    this.panelActionResults.set(t, {
      status: e,
      message: o,
      data: s
    }), this.renderStoredPanelActionResult(t);
  }
  renderStoredPanelActionResult(t) {
    const e = this.panelActionResults.get(t);
    if (!e) return;
    const o = Array.from(this.shadow.querySelectorAll("[data-panel-action-result]")).find((r) => r.dataset.panelActionResult === t);
    if (!o) return;
    const s = e.data === void 0 ? "" : `<pre style="margin-top:0.5rem;max-height:14rem;overflow:auto;white-space:pre-wrap;font-size:11px">${c(bt(e.data, { nullAsEmptyObject: !1 }))}</pre>`;
    o.innerHTML = `<div class="${e.status === "error" ? "badge error" : "badge"}">${c(e.message)}</div>${s}`;
  }
  renderReplPanel(t, e) {
    let o = this.replPanels.get(e);
    o || (o = new st({
      kind: e === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: e === "console" ? this.replCommands : []
    }), this.replPanels.set(e, o)), o.attach(t);
  }
  attachResizeListeners() {
    const t = this.shadow.querySelector("[data-resize-handle]");
    t && (t.addEventListener("mousedown", (e) => {
      const o = e;
      o.preventDefault(), this.startResize(o.clientY);
    }), t.addEventListener("touchstart", (e) => {
      const o = e;
      o.touches.length === 1 && (o.preventDefault(), this.startResize(o.touches[0].clientY));
    }, { passive: !1 }));
  }
  startResize(t) {
    this.isResizing = !0, this.resizeStartY = t;
    const e = this.shadow.querySelector(".toolbar");
    this.resizeStartHeight = e?.offsetHeight || b.DEFAULT_HEIGHT, e?.classList.add("resizing"), document.body.style.cursor = "ns-resize", document.body.style.userSelect = "none";
    const o = (i) => {
      this.handleResize(i.clientY);
    }, s = (i) => {
      i.touches.length === 1 && this.handleResize(i.touches[0].clientY);
    }, r = () => {
      this.isResizing = !1, e?.classList.remove("resizing"), document.body.style.cursor = "", document.body.style.userSelect = "", document.removeEventListener("mousemove", o), document.removeEventListener("mouseup", r), document.removeEventListener("touchmove", s), document.removeEventListener("touchend", r), this.saveState();
    };
    document.addEventListener("mousemove", o), document.addEventListener("mouseup", r), document.addEventListener("touchmove", s, { passive: !0 }), document.addEventListener("touchend", r);
  }
  handleResize(t) {
    if (!this.isResizing) return;
    const e = this.resizeStartY - t, o = window.innerHeight * b.MAX_HEIGHT_RATIO, s = Math.min(o, Math.max(b.MIN_HEIGHT, this.resizeStartHeight + e));
    this.customHeight = s;
    const r = this.shadow.querySelector(".toolbar");
    r && (r.style.height = `${s}px`);
  }
  attachExpandableRowListeners() {
    V(this.shadow);
  }
  attachCopyListeners() {
    F(this.shadow, { useIconFeedback: !1 });
  }
  attachSortToggleListeners() {
    j(this.shadow, (t, e) => {
      this.panelSortOrder.set(t, e), this.saveState(), this.updateContent();
    });
  }
  mountActivePanelViews() {
    this.mountSQLView(), this.mountLogsView(), this.mountRequestsView(), this.mountJSErrorsView(), this.mountRegistryLiveView();
  }
  mountRegistryLiveView() {
    const t = p.get(this.activePanel);
    t && this.registryLiveList.handles(t) && this.registryLiveList.adopt(t, this.shadow);
  }
  mountSQLView() {
    this.activePanel === "sql" && this.sqlView.adopt(this.shadow);
  }
  mountLogsView() {
    this.activePanel === "logs" && this.logsView.adopt(this.shadow);
  }
  mountRequestsView() {
    this.activePanel === "requests" && this.requestsView.adopt(this.shadow);
  }
  mountJSErrorsView() {
    this.activePanel === "jserrors" && this.jserrorsView.adopt(this.shadow);
  }
};
m = L;
m.MIN_HEIGHT = 150;
m.MAX_HEIGHT_RATIO = 0.8;
m.DEFAULT_HEIGHT = 320;
customElements.get("debug-toolbar") || customElements.define("debug-toolbar", L);
var xt = `
  :host {
    --fab-bg: #1e1e2e;
    --fab-bg-hover: #313244;
    --fab-border: #45475a;
    --fab-text: #cdd6f4;
    --fab-text-muted: #6c7086;
    --fab-accent: #89b4fa;
    --fab-success: #a6e3a1;
    --fab-warning: #f9e2af;
    --fab-error: #f38ba8;
    --fab-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 99998;
    font-family: var(--fab-font);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: auto;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .fab {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--fab-bg);
    border: 1px solid var(--fab-border);
    border-radius: 24px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: visible;
    height: 48px;
    min-width: 48px;
  }

  .fab:hover {
    background: var(--fab-bg-hover);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }

  .fab:focus-visible {
    outline: 2px solid var(--fab-accent);
    outline-offset: 3px;
  }

  .fab.hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.8) translateY(20px);
  }

  /* Collapsed state - icon only */
  .fab-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  .fab-collapsed.has-identity {
    width: auto;
    max-width: min(360px, calc(100vw - 32px));
    padding: 0 14px 0 10px;
    gap: 10px;
  }

  /* Environment chip + instance name read as one identity unit. */
  .fab-identity {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .fab-identity-env {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--fab-border);
    background: rgba(255, 255, 255, 0.05);
    color: var(--fab-text);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.09em;
    line-height: 1.3;
    white-space: nowrap;
  }

  /* The dot and tint carry the environment color. The label stays on the
     high-contrast text token because a host may configure any hex value. */
  @supports (color: color-mix(in srgb, red 10%, transparent)) {
    .fab-identity-env {
      border-color: color-mix(in srgb, var(--fab-environment, #64748b) 50%, transparent);
      background: color-mix(in srgb, var(--fab-environment, #64748b) 18%, transparent);
    }
  }

  .fab-identity-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--fab-environment, #64748b);
    box-shadow: 0 0 6px color-mix(in srgb, var(--fab-environment, #64748b) 70%, transparent);
  }

  /* Only one of the two environment spellings is ever visible. */
  .fab-identity-env-short {
    display: none;
  }

  .fab-identity-name {
    max-width: 200px;
    overflow: hidden;
    color: var(--fab-text);
    font-size: 11px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fab-icon {
    width: 24px;
    height: 24px;
    color: var(--fab-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-icon svg {
    width: 100%;
    height: 100%;
  }

  /* Connection status dot - positioned at bottom-right of icon area */
  /* Icon is 24x24 centered in 48x48 container: icon spans 12px-36px both axes */
  /* Dot overlaps icon's bottom-right corner */
  .fab-status-dot {
    position: absolute;
    bottom: 11px;
    left: 40px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--fab-bg);
    background: var(--fab-text-muted);
    transition: background 0.2s, box-shadow 0.2s;
    z-index: 1;
  }

  /* With an identity chip the collapsed row starts earlier, so the connection
     dot follows the icon instead of colliding with the environment chip. */
  .fab.has-identity .fab-status-dot {
    left: 26px;
    bottom: 10px;
  }

  .fab[data-status="connected"] .fab-status-dot {
    background: var(--fab-success);
    box-shadow: 0 0 6px var(--fab-success);
  }

  .fab[data-status="disconnected"] .fab-status-dot {
    background: var(--fab-text-muted);
  }

  .fab[data-status="reconnecting"] .fab-status-dot {
    background: var(--fab-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  .fab[data-status="error"] .fab-status-dot {
    background: var(--fab-error);
    box-shadow: 0 0 6px var(--fab-error);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Expanded state - counters */
  .fab-expanded {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 16px;
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fab:hover .fab-expanded,
  .fab.is-hovered .fab-expanded,
  .fab:focus-visible .fab-expanded {
    max-width: 300px;
    opacity: 1;
    padding-left: 4px;
  }

  .fab-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 36px;
    padding: 4px 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.15s;
  }

  .fab-counter.has-items {
    background: rgba(137, 180, 250, 0.15);
  }

  .fab-counter.has-slow {
    background: rgba(249, 226, 175, 0.15);
  }

  .fab-counter.has-errors {
    background: rgba(243, 139, 168, 0.15);
  }

  .counter-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--fab-text);
    font-variant-numeric: tabular-nums;
  }

  .fab-counter.has-items .counter-value {
    color: var(--fab-accent);
  }

  .fab-counter.has-slow .counter-value {
    color: var(--fab-warning);
  }

  .fab-counter.has-errors .counter-value {
    color: var(--fab-error);
  }

  .counter-label {
    font-size: 9px;
    color: var(--fab-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @media (prefers-reduced-motion: reduce) {
    .fab,
    .fab-expanded,
    .fab-status-dot {
      transition: none;
    }

    .fab:hover {
      transform: none;
    }

    .fab[data-status="reconnecting"] .fab-status-dot {
      animation: none;
    }
  }

  /* Responsive */
  @media (max-width: 480px) {
    :host {
      bottom: 12px;
      right: 12px;
    }

    .fab {
      height: 44px;
      min-width: 44px;
    }

    .fab-collapsed {
      width: 44px;
      height: 44px;
    }

    .fab-collapsed.has-identity {
      width: auto;
      max-width: calc(100vw - 24px);
      padding: 0 12px 0 8px;
      gap: 8px;
    }

    /* Trade the spelled-out environment for its short token before the
       instance name starts losing characters. */
    .fab-identity-env-full {
      display: none;
    }

    .fab-identity-env-short {
      display: inline;
    }

    .fab-identity-name {
      max-width: 110px;
    }

    .fab-icon {
      width: 20px;
      height: 20px;
    }

    .fab-status-dot {
      width: 8px;
      height: 8px;
      bottom: 11px;
      left: 40px;
    }

    .fab.has-identity .fab-status-dot {
      left: 22px;
      bottom: 10px;
    }

    .fab-counter {
      min-width: 32px;
      padding: 3px 6px;
    }

    .counter-value {
      font-size: 12px;
    }

    .counter-label {
      font-size: 8px;
    }
  }

  /* Very narrow viewports keep the environment signal and drop the name. */
  @media (max-width: 380px) {
    .fab-identity-name {
      display: none;
    }

    .fab-collapsed.has-identity {
      gap: 6px;
    }
  }
`, mt = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "debug-path",
      "panels",
      "toolbar-expanded",
      "live-transport"
    ];
  }
  constructor() {
    super(), this.stream = null, this.snapshot = {}, this.connectionStatus = "disconnected", this.isHovered = !1, this.toolbarExpanded = !1, this.eventToPanel = {}, this.unsubscribeRegistry = null, this.initializeGeneration = 0, this.shadow = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.initializeGeneration += 1, this.initialize(this.initializeGeneration);
  }
  async initialize(a) {
    if (await q(this.debugPath), !this.isInitializationStale(a)) {
      if (this.eventToPanel = f(), this.unsubscribeRegistry = p.subscribe((t) => this.handleRegistryChange(t)), this.isInitializationStale(a)) {
        this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null;
        return;
      }
      this.render(), this.liveTransportEnabled && this.initWebSocket(), this.fetchInitialSnapshot(a), this.loadState();
    }
  }
  disconnectedCallback() {
    this.initializeGeneration += 1, this.stream?.close(), this.stream = null, this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null;
  }
  isInitializationStale(a) {
    return a !== this.initializeGeneration || !this.isConnected;
  }
  attributeChangedCallback(a, t, e) {
    t !== e && a === "toolbar-expanded" && (this.toolbarExpanded = e === "true" || e === "", this.render());
  }
  setToolbarExpanded(a) {
    this.toolbarExpanded = a, this.saveState(), this.render();
  }
  getSnapshot() {
    return this.snapshot;
  }
  getConnectionStatus() {
    return this.connectionStatus;
  }
  getStream() {
    return this.stream;
  }
  get debugPath() {
    return this.getAttribute("debug-path") || "/admin/debug";
  }
  get panels() {
    const a = this.getAttribute("panels");
    if (a) {
      const t = a.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
      return t.length ? t : x();
    }
    return x();
  }
  get liveTransportEnabled() {
    const a = this.getAttribute("live-transport");
    return a === null ? !0 : a === "" || a === "true";
  }
  loadState() {
    try {
      const a = localStorage.getItem("debug-toolbar-expanded");
      a !== null && (this.toolbarExpanded = a === "true", this.render());
    } catch {
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.toolbarExpanded));
    } catch {
    }
  }
  initWebSocket() {
    this.stream = new E({
      basePath: this.debugPath,
      onEvent: (a) => this.handleEvent(a),
      onStatusChange: (a) => this.handleStatusChange(a)
    }), this.stream.connect(), this.updateSubscriptions();
  }
  async fetchInitialSnapshot(a = this.initializeGeneration) {
    const t = await C(this.debugPath);
    this.isInitializationStale(a) || t && this.applySnapshot(t);
  }
  handleEvent(a) {
    if (!(!a || !a.type)) {
      if (a.type === "snapshot") {
        this.applySnapshot(a.payload);
        return;
      }
      P(this.snapshot, a, { eventToPanel: this.eventToPanel }), this.updateCounters();
    }
  }
  handleStatusChange(a) {
    this.connectionStatus = a, this.updateConnectionStatus(), this.dispatchEvent(new CustomEvent("debug-status-change", {
      detail: { status: a },
      bubbles: !0,
      composed: !0
    }));
  }
  applySnapshot(a) {
    this.snapshot = a || {}, this.render(), this.dispatchEvent(new CustomEvent("debug-snapshot", {
      detail: { snapshot: this.snapshot },
      bubbles: !0,
      composed: !0
    }));
  }
  accessibleLabel(a, t) {
    const e = (s, r, i) => `${s} ${s === 1 ? r : i}`, o = ["Open debug toolbar"];
    return a && o.push(a.title), o.push([
      e(t.requests, "request", "requests"),
      e(t.sql, "query", "queries"),
      e(t.logs, "log", "logs")
    ].join(", ")), t.errors > 0 && o.push(e(t.errors, "error", "errors")), o.push(`Debug stream ${this.connectionStatus}`), o.join(". ");
  }
  render() {
    const a = u(this.snapshot), t = a.errors > 0, e = a.slowQueries > 0, o = k(this.snapshot, this.panels), s = this.toolbarExpanded ? "hidden" : "", r = this.accessibleLabel(o, a);
    this.shadow.innerHTML = `
      <style>${xt}</style>
      <div
        class="fab ${s} ${o ? "has-identity" : ""}"
        data-status="${this.connectionStatus}"
        role="button"
        tabindex="${this.toolbarExpanded ? "-1" : "0"}"
        aria-hidden="${this.toolbarExpanded ? "true" : "false"}"
        aria-label="${c(r)}"
        title="${c(o ? o.title : "Open debug toolbar")}"
      >
        <span class="fab-status-dot"></span>
        <div class="fab-collapsed ${o ? "has-identity" : ""}" ${o ? `style="--fab-environment:${c(o.color)}"` : ""}>
          <span class="fab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.25C15.4148 2.25 18.157 4.93659 19.2445 8.53907L20.6646 7.82902C21.0351 7.64377 21.4856 7.79394 21.6709 8.16443C21.8561 8.53491 21.7059 8.98541 21.3355 9.17066L19.5919 10.0425C19.6958 10.6789 19.75 11.3341 19.75 12C19.75 12.4216 19.7283 12.839 19.6859 13.25H22C22.4142 13.25 22.75 13.5858 22.75 14C22.75 14.4142 22.4142 14.75 22 14.75H19.4347C19.2438 15.5659 18.9699 16.3431 18.6235 17.0629L20.5303 18.9697C20.8232 19.2626 20.8232 19.7374 20.5303 20.0303C20.2374 20.3232 19.7626 20.3232 19.4697 20.0303L17.8463 18.4069C16.4519 20.4331 14.3908 21.75 12 21.75C9.60921 21.75 7.54809 20.4331 6.15371 18.4069L4.53033 20.0303C4.23744 20.3232 3.76256 20.3232 3.46967 20.0303C3.17678 19.7374 3.17678 19.2626 3.46967 18.9697L5.37647 17.0629C5.03008 16.3431 4.7562 15.5659 4.56527 14.75H2C1.58579 14.75 1.25 14.4142 1.25 14C1.25 13.5858 1.58579 13.25 2 13.25H4.31407C4.27174 12.839 4.25 12.4216 4.25 12C4.25 11.3341 4.30423 10.6789 4.40814 10.0425L2.66455 9.17066C2.29406 8.98541 2.1439 8.53491 2.32914 8.16443C2.51438 7.79394 2.96488 7.64377 3.33537 7.82902L4.75547 8.53907C5.84297 4.93659 8.58522 2.25 12 2.25ZM11.25 19C11.25 19.4142 11.5858 19.75 12 19.75C12.4142 19.75 12.75 19.4142 12.75 19V9.73117C14.005 9.6696 15.2088 9.46632 16.1588 9.26042C16.5636 9.17268 16.8207 8.77339 16.7329 8.36857C16.6452 7.96376 16.2459 7.70672 15.8411 7.79445C14.7597 8.02883 13.3718 8.25 12 8.25C10.6281 8.25 9.24022 8.02883 8.15882 7.79445C7.75401 7.70672 7.35472 7.96376 7.26698 8.36857C7.17924 8.77339 7.43629 9.17268 7.8411 9.26042C8.79115 9.46632 9.99494 9.6696 11.25 9.73117V19Z" fill="currentColor"></path>
            </svg>
          </span>
          ${o ? `
            <span class="fab-identity">
              <span class="fab-identity-env">
                <span class="fab-identity-dot" aria-hidden="true"></span>
                <span class="fab-identity-env-full">${c(o.environment)}</span>
                <span class="fab-identity-env-short">${c(o.environmentShort)}</span>
              </span>
              <span class="fab-identity-name">${c(o.instance)}</span>
            </span>
          ` : ""}
        </div>
        <div class="fab-expanded" aria-hidden="true">
          <div class="fab-counter ${a.requests > 0 ? "has-items" : ""}">
            <span class="counter-value">${a.requests}</span>
            <span class="counter-label">Req</span>
          </div>
          <div class="fab-counter ${a.sql > 0 ? "has-items" : ""} ${e ? "has-slow" : ""}">
            <span class="counter-value">${a.sql}</span>
            <span class="counter-label">SQL</span>
          </div>
          <div class="fab-counter ${a.logs > 0 ? "has-items" : ""} ${t ? "has-errors" : ""}">
            <span class="counter-value">${a.logs}</span>
            <span class="counter-label">Logs</span>
          </div>
          ${t ? `
            <div class="fab-counter has-errors">
              <span class="counter-value">${a.errors}</span>
              <span class="counter-label">Err</span>
            </div>
          ` : ""}
        </div>
      </div>
    `, this.attachEventListeners();
  }
  updateCounters() {
    const a = u(this.snapshot), t = a.errors > 0, e = a.slowQueries > 0, o = this.shadow.querySelector(".fab-counter:nth-child(1)");
    if (o) {
      const n = o.querySelector(".counter-value");
      n && (n.textContent = String(a.requests)), o.classList.toggle("has-items", a.requests > 0);
    }
    const s = this.shadow.querySelector(".fab-counter:nth-child(2)");
    if (s) {
      const n = s.querySelector(".counter-value");
      n && (n.textContent = String(a.sql)), s.classList.toggle("has-items", a.sql > 0), s.classList.toggle("has-slow", e);
    }
    const r = this.shadow.querySelector(".fab-counter:nth-child(3)");
    if (r) {
      const n = r.querySelector(".counter-value");
      n && (n.textContent = String(a.logs)), r.classList.toggle("has-items", a.logs > 0), r.classList.toggle("has-errors", t);
    }
    const i = this.shadow.querySelector(".fab-counter:nth-child(4)");
    if (t && i) {
      const n = i.querySelector(".counter-value");
      n && (n.textContent = String(a.errors));
    }
    this.updateAccessibleLabel(a);
  }
  updateConnectionStatus() {
    const a = this.shadow.querySelector(".fab");
    a && a.setAttribute("data-status", this.connectionStatus), this.updateAccessibleLabel();
  }
  updateAccessibleLabel(a = u(this.snapshot)) {
    const t = this.shadow.querySelector(".fab");
    t && t.setAttribute("aria-label", this.accessibleLabel(k(this.snapshot, this.panels), a));
  }
  handleRegistryChange(a) {
    this.eventToPanel = f(), this.updateSubscriptions();
  }
  updateSubscriptions() {
    if (!this.stream) return;
    const a = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const e of y(t)) a.add(e);
    this.stream.subscribe(Array.from(a));
  }
  expand() {
    this.toolbarExpanded = !0, this.saveState(), this.render(), this.dispatchEvent(new CustomEvent("debug-expand", {
      detail: { expanded: !0 },
      bubbles: !0,
      composed: !0
    }));
  }
  attachEventListeners() {
    const a = this.shadow.querySelector(".fab");
    a && (a.addEventListener("click", () => this.expand()), a.addEventListener("keydown", (t) => {
      const e = t.key;
      e !== "Enter" && e !== " " && e !== "Spacebar" || (t.preventDefault(), this.expand());
    }), a.addEventListener("mouseenter", () => {
      this.isHovered = !0, a.classList.add("is-hovered");
    }), a.addEventListener("mouseleave", () => {
      this.isHovered = !1, a.classList.remove("is-hovered");
    }));
  }
};
customElements.get("debug-fab") || customElements.define("debug-fab", mt);
var z = class {
  constructor(a = {}) {
    this.fab = null, this.toolbar = null, this.initialized = !1, this.options = {
      panels: [
        "requests",
        "sql",
        "logs",
        "routes",
        "config"
      ],
      slowThresholdMs: 50,
      container: document.body,
      ...a
    };
    const t = I(this.options.basePath);
    t && (this.options.basePath = t), !this.options.debugPath && t && (this.options.debugPath = `${t}/debug`);
  }
  init() {
    this.initialized || (this.initialized = !0, this.createFab(), this.createToolbar(), this.wireEvents());
  }
  destroy() {
    this.fab && (this.fab.remove(), this.fab = null), this.toolbar && (this.toolbar.remove(), this.toolbar = null), this.initialized = !1;
  }
  expand() {
    !this.toolbar || !this.fab || (this.fab.setToolbarExpanded(!0), this.toolbar.setExpanded(!0));
  }
  collapse() {
    !this.toolbar || !this.fab || (this.fab.setToolbarExpanded(!1), this.toolbar.setExpanded(!1));
  }
  toggle() {
    this.toolbar && (this.toolbar.isExpanded() ? this.collapse() : this.expand());
  }
  createFab() {
    this.fab = document.createElement("debug-fab"), this.options.debugPath && this.fab.setAttribute("debug-path", this.options.debugPath), this.options.basePath && this.fab.setAttribute("base-path", this.options.basePath), typeof this.options.liveTransportEnabled == "boolean" && this.fab.setAttribute("live-transport", this.options.liveTransportEnabled ? "true" : "false"), this.options.panels && this.fab.setAttribute("panels", this.options.panels.join(",")), this.options.container?.appendChild(this.fab);
  }
  createToolbar() {
    this.toolbar = document.createElement("debug-toolbar"), this.options.debugPath && this.toolbar.setAttribute("debug-path", this.options.debugPath), this.options.basePath && this.toolbar.setAttribute("base-path", this.options.basePath), typeof this.options.liveTransportEnabled == "boolean" && this.toolbar.setAttribute("live-transport", this.options.liveTransportEnabled ? "true" : "false"), this.toolbar.setAttribute("use-fab", "true"), this.options.panels && this.toolbar.setAttribute("panels", this.options.panels.join(",")), this.options.slowThresholdMs && this.toolbar.setAttribute("slow-threshold-ms", String(this.options.slowThresholdMs)), this.options.container?.appendChild(this.toolbar);
  }
  wireEvents() {
    !this.fab || !this.toolbar || (this.fab.addEventListener("debug-expand", ((a) => {
      if (a.detail?.expanded && this.toolbar) {
        const t = this.fab?.getStream();
        t && this.toolbar.setStream(t);
        const e = this.fab?.getSnapshot();
        e && this.toolbar.setSnapshot(e);
        const o = this.fab?.getConnectionStatus();
        o && this.toolbar.setConnectionStatus(o), this.toolbar.setExpanded(!0);
      }
    })), this.fab.addEventListener("debug-status-change", ((a) => {
      this.toolbar && a.detail?.status && this.toolbar.setConnectionStatus(a.detail.status);
    })), this.fab.addEventListener("debug-snapshot", ((a) => {
      this.toolbar && a.detail?.snapshot && this.toolbar.setSnapshot(a.detail.snapshot);
    })), this.toolbar.addEventListener("debug-expand", ((a) => {
      !a.detail?.expanded && this.fab && this.fab.setToolbarExpanded(!1);
    })));
  }
};
function vt() {
  const a = window.DEBUG_CONFIG, t = document.querySelector("[data-debug-path]");
  let e = {};
  if (a ? e = {
    basePath: a.basePath,
    debugPath: a.debugPath,
    liveTransportEnabled: typeof a.liveTransportEnabled == "boolean" ? a.liveTransportEnabled : void 0,
    panels: a.panels,
    slowThresholdMs: a.slowThresholdMs
  } : t && (e = {
    basePath: t.getAttribute("data-base-path") || void 0,
    debugPath: t.getAttribute("data-debug-path") || void 0,
    panels: t.getAttribute("data-panels")?.split(","),
    slowThresholdMs: parseInt(t.getAttribute("data-slow-threshold-ms") || "50", 10)
  }), !e.debugPath && !e.basePath && !a && !t) return null;
  const o = new z(e);
  return o.init(), o;
}
window.DebugManager = z;
window.initDebugManager = vt;
export {
  mt as DebugFab,
  z as DebugManager,
  L as DebugToolbar,
  Pt as applyCustomEventPayload,
  P as applyDebugEventToSnapshot,
  f as buildEventToPanel,
  k as deploymentIndicator,
  C as fetchDebugSnapshot,
  u as getCounts,
  zt as getDefaultPanels,
  x as getDefaultToolbarPanels,
  y as getPanelEventTypes,
  ct as getPanelIcon,
  ut as getPanelLabel,
  vt as initDebugManager,
  Lt as isKnownPanel,
  ht as normalizeReplCommands,
  w as renderPanel,
  lt as replPanelIDs
};

//# sourceMappingURL=toolbar.js.map