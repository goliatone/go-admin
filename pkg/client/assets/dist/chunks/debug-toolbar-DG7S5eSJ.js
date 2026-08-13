import { n as R } from "./rolldown-runtime-DpiKQypI.js";
import { escapeHTML as p } from "../shared/html.js";
import { httpRequest as z, readExpectedHTTPJSON as C, readHTTPError as T } from "../shared/transport/http-client.js";
import { t as _ } from "./debug-stream-o5N7-MAm.js";
import { O as M, _ as A, b as h, c as I, f as H, g as $, i as O, l as j, n as D, o as y, p as u, r as k, s as S, u as F, v as V, x as N } from "./runtime-helpers-C2cPJaEE.js";
import { C as G, E as B, F as K, I as U, K as J, M as Q, N as Y, P as W, R as X, T as Z, V as ee, _ as te, b as ae, f as oe, g as re, h as se, k as d, m as ne, p as ie, r as le, v as de, w as ce, x as pe } from "./builtin-panels-uRf1D3XB.js";
import { N as f, j as g, n as he } from "./server-definitions-yM2kAYaY.js";
import { i as be } from "./icons-CAenalpJ.js";
var ue = `
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

  .debug-identity__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    overflow: hidden;
    border: 1px solid var(--toolbar-border);
    border-radius: 8px;
    background: var(--persona-background, var(--toolbar-bg));
    color: var(--persona-foreground, var(--toolbar-text));
    font-size: 11px;
    font-weight: 800;
  }

  .debug-identity__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
`, l = d;
function v(c, e, t = 50, a) {
  const o = h.get(c);
  if (o) {
    const s = A(e, o);
    return N(o, s, l, a || {}, "toolbar");
  }
  const r = a?.newestFirst ?? !0, n = a?.slowThresholdMs ?? t;
  switch (c) {
    case "requests":
      return Z(e.requests || [], l, {
        newestFirst: r,
        slowThresholdMs: n,
        maxEntries: 50,
        showSortToggle: !0,
        truncatePath: !0,
        maxPathLength: 50,
        expandedRequestIds: a?.expandedRequestIds,
        maxDetailLength: 80
      });
    case "sql":
      return ee(e.sql || [], l, {
        newestFirst: r,
        slowThresholdMs: n,
        maxEntries: 50,
        showSortToggle: !0,
        useIconCopyButton: !1
      });
    case "logs":
      return pe(e.logs || [], l, {
        newestFirst: !0,
        maxEntries: 100,
        showSortToggle: !1,
        showSource: !1,
        truncateMessage: !0,
        maxMessageLength: 100
      });
    case "config":
      return g("Config", e.config || {}, l, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "routes":
      return te(e.routes || [], l, { showName: !1 });
    case "template":
      return g("Template Context", e.template || {}, l, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "session":
      return g("Session", e.session || {}, l, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "jserrors":
      return ne(e.jserrors || [], l, {
        newestFirst: r,
        maxEntries: 50,
        compact: !0,
        showSortToggle: !0
      });
    case "custom":
      return se(e.custom || {}, l, {
        maxLogEntries: 50,
        useIconCopyButton: !1,
        showCount: !1
      });
    default: {
      const s = e[c];
      if (s != null) {
        const i = c.replace(/[_-]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
        return g(i, s, l, {
          useIconCopyButton: !1,
          showCount: !1
        });
      }
      return `<div class="${l.emptyState}">Panel "${p(c)}" not available</div>`;
    }
  }
}
function P(c, e = 50) {
  return F(c, e);
}
var Se = /* @__PURE__ */ R({ DebugToolbar: () => w }), x, E = "debug-toolbar-active-panel", w = class b extends HTMLElement {
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
    super(), this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.stream = null, this.externalStream = null, this.snapshot = {}, this.replPanels = /* @__PURE__ */ new Map(), this.replLoadGeneration = 0, this.replCommands = [], this.expanded = !1, this.activePanel = "requests", this.connectionStatus = "disconnected", this.slowThresholdMs = 50, this.useFab = !1, this.customHeight = null, this.isResizing = !1, this.resizeStartY = 0, this.resizeStartHeight = 0, this.panelSortOrder = /* @__PURE__ */ new Map([["requests", !0], ["sql", !0]]), this.eventToPanel = {}, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.initializeGeneration = 0, this.panelActionResults = /* @__PURE__ */ new Map(), this.handleKeyDown = (e) => {
      (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d" && (e.preventDefault(), this.toggleExpanded()), e.key === "Escape" && this.expanded && this.collapse();
    }, this.shadow = this.attachShadow({ mode: "open" }), this.sqlView = new G({
      styles: d,
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
    }), this.logsView = new f({
      styles: d,
      keyOf: de,
      renderRow: (e) => ae(e, d, {
        showSource: !1,
        truncateMessage: !0,
        maxMessageLength: 100
      }),
      getRenderOptions: () => ({ newestFirst: !0 }),
      getMaxEntries: () => 100,
      onNeedFullRender: () => this.updateContent()
    }), this.requestsView = new f({
      styles: d,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: B,
      renderRow: (e) => ce(e, d, {
        slowThresholdMs: this.slowThresholdMs,
        truncatePath: !0,
        maxPathLength: 50,
        expandedRequestIds: this.expandedRequests,
        maxDetailLength: 80
      }),
      getRenderOptions: () => ({ newestFirst: this.panelSortOrder.get("requests") ?? !0 }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
      onAdopt: (e) => W(e, this.expandedRequests, { useIconFeedback: !1 })
    }), this.jserrorsView = new f({
      styles: d,
      keyOf: oe,
      renderRow: (e) => ie(e, d, { compact: !0 }),
      getRenderOptions: () => ({ newestFirst: this.panelSortOrder.get("jserrors") ?? !0 }),
      getMaxEntries: () => 50,
      onNeedFullRender: () => this.updateContent(),
      onAdopt: (e) => K(e, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (e) => X(e, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new re({
      styles: d,
      allowUpsert: !1,
      getRenderOptions: () => ({}),
      onNeedFullRender: () => this.updateContent()
    });
  }
  connectedCallback() {
    this.initializeGeneration += 1, this.initialize(this.initializeGeneration);
  }
  async initialize(e) {
    if (await he(this.debugPath), !this.isInitializationStale(e)) {
      if (this.eventToPanel = k(), this.unsubscribeRegistry = h.subscribe((t) => this.handleRegistryChange(t)), this.isInitializationStale(e)) {
        this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null;
        return;
      }
      this.loadState(), this.render(), this.useFab || (this.liveTransportEnabled && this.initWebSocket(), this.fetchInitialSnapshot(e)), this.setupKeyboardShortcut(), this.dispatchEvent(new CustomEvent("debug-toolbar-ready", {
        bubbles: !0,
        composed: !0
      }));
    }
  }
  disconnectedCallback() {
    this.initializeGeneration += 1, this.replLoadGeneration += 1, this.replPanels.forEach((e) => e.destroy()), this.replPanels.clear(), this.stream?.close(), this.stream = null, this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null, document.removeEventListener("keydown", this.handleKeyDown);
  }
  isInitializationStale(e) {
    return e !== this.initializeGeneration || !this.isConnected;
  }
  handleRegistryChange(e) {
    this.eventToPanel = k(), this.updateSubscriptions(), this.expanded && this.render();
  }
  updateSubscriptions() {
    const e = this.getStream();
    if (!e) return;
    const t = /* @__PURE__ */ new Set();
    for (const a of this.panels) for (const o of S(a)) t.add(o);
    e.subscribe(Array.from(t));
  }
  attributeChangedCallback(e, t, a) {
    t !== a && (e === "expanded" ? (this.expanded = a === "true" || a === "", this.saveState(), this.render()) : e === "slow-threshold-ms" ? this.slowThresholdMs = parseInt(a || "50", 10) || 50 : e === "use-fab" ? this.useFab = a === "true" || a === "" : e === "live-transport" && !this.useFab && !this.liveTransportEnabled && this.stream?.close());
  }
  setExpanded(e) {
    this.expanded = e, this.saveState(), this.render();
  }
  setSnapshot(e) {
    this.applySnapshot(e || {});
  }
  setConnectionStatus(e) {
    this.connectionStatus = e, this.updateConnectionStatus();
  }
  setStream(e) {
    this.externalStream = e;
  }
  isExpanded() {
    return this.expanded;
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  fallbackActivePanel() {
    return this.panels[0] || "requests";
  }
  loadState() {
    try {
      const e = localStorage.getItem("debug-toolbar-expanded");
      e !== null && (this.expanded = e === "true");
      const t = localStorage.getItem("debug-toolbar-height");
      if (t !== null) {
        const r = parseInt(t, 10);
        !isNaN(r) && r >= b.MIN_HEIGHT && (this.customHeight = r);
      }
      const a = localStorage.getItem("debug-toolbar-sort-order");
      if (a) try {
        const r = JSON.parse(a);
        Object.entries(r).forEach(([n, s]) => {
          this.panelSortOrder.set(n, s);
        });
      } catch {
      }
      const o = this.normalizeStoredPanelID(localStorage.getItem(E));
      this.activePanel = o || this.normalizeStoredPanelID(this.activePanel) || this.fallbackActivePanel();
    } catch {
      this.activePanel = this.normalizeStoredPanelID(this.activePanel) || this.fallbackActivePanel();
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.expanded)), this.customHeight !== null && localStorage.setItem("debug-toolbar-height", String(this.customHeight));
      const e = {};
      this.panelSortOrder.forEach((t, a) => {
        e[a] = t;
      }), localStorage.setItem("debug-toolbar-sort-order", JSON.stringify(e)), localStorage.setItem(E, this.activePanel);
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
    const e = (this.getAttribute("base-path") || "").trim();
    return e ? e.startsWith("http://") || e.startsWith("https://") || e.startsWith("//") ? e.replace(/\/+$/g, "") : e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "") : "";
  }
  get debugPath() {
    const e = this.getAttribute("debug-path");
    return e || `${this.basePath}/debug`;
  }
  get panels() {
    const e = this.getAttribute("panels");
    if (e) {
      const t = e.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
      return t.length ? t : y();
    }
    return y();
  }
  get liveTransportEnabled() {
    const e = this.getAttribute("live-transport");
    return e === null ? !0 : e === "" || e === "true";
  }
  get wsUrl() {
    return `${this.debugPath}/ws`;
  }
  getStream() {
    return this.externalStream || this.stream;
  }
  initWebSocket() {
    this.stream = new _({
      basePath: this.debugPath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.handleStatusChange(t)
    }), this.stream.connect();
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const a of S(t)) e.add(a);
    this.stream.subscribe(Array.from(e));
  }
  async fetchInitialSnapshot(e = this.initializeGeneration) {
    const t = await O(this.debugPath);
    this.isInitializationStale(e) || t && this.applySnapshot(t);
  }
  handleEvent(e) {
    if (!e || !e.type) return;
    if (e.type === "snapshot") {
      this.applySnapshot(e.payload);
      return;
    }
    const t = D(this.snapshot, e, { eventToPanel: this.eventToPanel }) || e.type;
    if (t === this.activePanel && this.expanded) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(h.get(t))) {
      const a = h.get(t), o = this.snapshot[V(a)], r = Array.isArray(o) ? o[o.length - 1] : void 0;
      this.registryLiveList.enqueue(a, r);
    } else this.updateContent();
  }
  handleStatusChange(e) {
    this.connectionStatus = e, this.updateConnectionStatus();
  }
  applySnapshot(e) {
    this.snapshot = e || {}, this.replCommands = H(this.snapshot.repl_commands), this.updateContent();
  }
  render() {
    const e = P(this.snapshot, this.slowThresholdMs), t = this.panels.map((s) => {
      const i = j(s), m = this.getPanelCount(s), L = this.activePanel === s ? "active" : "", q = be(I(s), {
        size: "14px",
        extraClass: "tab-icon"
      });
      return `
          <button class="tab ${L}" data-panel="${p(s)}">
            ${q}
            <span class="tab-label">${p(i)}</span>
            <span class="tab-count">${m}</span>
          </button>
        `;
    }).join(""), a = this.expanded ? "expanded" : "collapsed", o = this.useFab && !this.expanded ? "hidden" : "", r = this.expanded ? this.customHeight || b.DEFAULT_HEIGHT : 36, n = this.expanded ? `height: ${r}px;` : "";
    if (this.shadow.innerHTML = `
      <style>${ue}</style>
      <div class="toolbar ${a} ${o}" style="${n}">
        ${this.expanded ? `
          <div class="resize-handle" data-resize-handle></div>
          <div class="toolbar-header">
            <div class="toolbar-tabs">${t}</div>
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
              ${u.has(this.activePanel) ? this.renderCapabilityLoading("terminal") : v(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions())}
            </div>
          </div>
        ` : ""}
        ${this.useFab ? "" : `
          <div class="toolbar-summary">
            <div class="summary-item ${e.errors > 0 ? "has-errors" : ""}">
              <span>Requests:</span>
              <span class="count">${e.requests}</span>
            </div>
            <div class="summary-item ${e.slowQueries > 0 ? "has-slow" : ""}">
              <span>SQL:</span>
              <span class="count">${e.sql}</span>
            </div>
            <div class="summary-item">
              <span>Logs:</span>
              <span class="count">${e.logs}</span>
            </div>
            ${e.errors > 0 ? `
              <div class="summary-item has-errors">
                <span>Errors:</span>
                <span class="count">${e.errors}</span>
              </div>
            ` : ""}
            <div class="connection-status">
              <span class="status-dot ${this.connectionStatus}"></span>
              <span>${this.connectionStatus}</span>
            </div>
          </div>
        `}
      </div>
    `, this.attachEventListeners(), this.renderStoredPanelActionResult(this.activePanel), this.expanded && u.has(this.activePanel)) {
      const s = this.shadow.getElementById("panel-content");
      s && this.renderReplPanel(s, this.activePanel);
    }
  }
  updateContent() {
    if (this.expanded) {
      const e = this.shadow.getElementById("panel-content");
      e && (u.has(this.activePanel) ? this.renderReplPanel(e, this.activePanel) : (this.replLoadGeneration += 1, e.innerHTML = v(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions()), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.mountActivePanelViews(), this.attachPanelActionListeners(), this.renderStoredPanelActionResult(this.activePanel))), this.panels.forEach((t) => {
        const a = this.shadow.querySelector(`[data-panel="${t}"] .tab-count`);
        a && (a.textContent = String(this.getPanelCount(t)));
      });
    }
    this.useFab || this.updateSummary();
  }
  updateSummary() {
    const e = P(this.snapshot, this.slowThresholdMs), t = this.shadow.querySelector(".toolbar-summary");
    t && t.querySelectorAll(".summary-item").forEach((a) => {
      const o = a.querySelector("span:first-child")?.textContent?.replace(":", "").toLowerCase(), r = a.querySelector(".count");
      !r || !o || (o === "requests" ? (r.textContent = String(e.requests), a.classList.toggle("has-errors", e.errors > 0)) : o === "sql" ? (r.textContent = String(e.sql), a.classList.toggle("has-slow", e.slowQueries > 0)) : o === "logs" ? r.textContent = String(e.logs) : o === "errors" && (r.textContent = String(e.errors)));
    });
  }
  updateConnectionStatus() {
    const e = this.shadow.querySelector(".connection-indicator .status-dot");
    e && (e.className = `status-dot ${this.connectionStatus}`);
    const t = this.shadow.querySelector(".connection-status .status-dot"), a = this.shadow.querySelector(".connection-status span:last-child");
    t && (t.className = `status-dot ${this.connectionStatus}`), a && (a.textContent = this.connectionStatus);
  }
  getPanelCount(e) {
    const t = h.get(e);
    if (t) return $(this.snapshot, t);
    switch (e) {
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
        const a = this.snapshot.custom || {};
        return Object.keys(a.data || {}).length + (a.logs?.length || 0);
      default: {
        const o = this.snapshot[e];
        return Array.isArray(o) ? o.length : o != null && typeof o == "object" ? Object.keys(o).length : 0;
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
    if (this.shadow.querySelectorAll(".tab").forEach((e) => {
      e.addEventListener("click", (t) => {
        const a = t.currentTarget.dataset.panel;
        if (a && a !== this.activePanel) {
          this.activePanel = a, this.saveState(), this.shadow.querySelectorAll(".tab").forEach((r) => r.classList.remove("active")), t.currentTarget.classList.add("active");
          const o = this.shadow.getElementById("panel-content");
          o && (u.has(this.activePanel) ? this.renderReplPanel(o, this.activePanel) : (this.replLoadGeneration += 1, o.innerHTML = v(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions()), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.mountActivePanelViews(), this.attachPanelActionListeners()));
        }
      });
    }), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.mountActivePanelViews(), this.attachPanelActionListeners(), this.shadow.querySelectorAll("[data-action]").forEach((e) => {
      e.addEventListener("click", (t) => {
        const a = t.currentTarget.dataset.action, o = this.getStream();
        switch (a) {
          case "toggle":
            this.toggleExpanded();
            break;
          case "collapse":
            this.collapse();
            break;
          case "refresh":
            o?.requestSnapshot();
            break;
          case "clear":
            o?.clear(), this.snapshot = {}, this.updateContent();
        }
      });
    }), !this.useFab) {
      const e = this.shadow.querySelector(".toolbar-summary");
      e && e.addEventListener("click", () => {
        this.expanded || (this.expanded = !0, this.saveState(), this.render(), this.dispatchExpandEvent());
      });
    }
    this.attachResizeListeners(), this.attachCopyListeners();
  }
  attachPanelActionListeners() {
    this.shadow.querySelectorAll("[data-panel-action]").forEach((e) => {
      e.addEventListener("click", () => {
        e.disabled || this.runPanelAction(e, e);
      });
    }), this.shadow.querySelectorAll("[data-panel-action-form]").forEach((e) => {
      e.addEventListener("submit", (t) => {
        t.preventDefault();
        const a = e.querySelector('button[type="submit"]') || void 0;
        a?.disabled || this.runPanelAction(e, a);
      });
    });
  }
  async runPanelAction(e, t) {
    const a = e.dataset.panelId || "", o = e.dataset.actionId || "";
    if (!a || !o) return;
    const r = e.dataset.actionConfirm || "";
    if ((e.dataset.actionRequiresConfirm === "true" || r) && !window.confirm(r || "Run this debug panel action?")) return;
    const n = le(e);
    t && (t.disabled = !0);
    try {
      const s = await z(`${this.debugPath}/api/panels/${encodeURIComponent(a)}/actions/${encodeURIComponent(o)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n)
      });
      if (!s.ok) throw new Error(await T(s, `Action failed (${s.status})`, { appendStatusToFallback: !1 }));
      const i = await C(s);
      this.showPanelActionResult(a, i.ok === !1 ? "error" : "ok", i.message || (i.ok === !1 ? "Action failed" : "Action complete"), i.data), i.event && this.handleEvent(i.event), i.refresh && await this.fetchInitialSnapshot();
    } catch (s) {
      const i = s instanceof Error ? s.message : "Action failed";
      this.showPanelActionResult(a, "error", i);
    } finally {
      t && (t.disabled = !1);
    }
  }
  showPanelActionResult(e, t, a, o) {
    this.panelActionResults.set(e, {
      status: t,
      message: a,
      data: o
    }), this.renderStoredPanelActionResult(e);
  }
  renderStoredPanelActionResult(e) {
    const t = this.panelActionResults.get(e);
    if (!t) return;
    const a = Array.from(this.shadow.querySelectorAll("[data-panel-action-result]")).find((r) => r.dataset.panelActionResult === e);
    if (!a) return;
    const o = t.data === void 0 ? "" : `<pre style="margin-top:0.5rem;max-height:14rem;overflow:auto;white-space:pre-wrap;font-size:11px">${p(M(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    a.innerHTML = `<div class="${t.status === "error" ? "badge error" : "badge"}">${p(t.message)}</div>${o}`;
  }
  renderReplPanel(e, t) {
    const a = this.replPanels.get(t);
    if (a) {
      a.attach(e);
      return;
    }
    const o = ++this.replLoadGeneration;
    e.innerHTML = this.renderCapabilityLoading("terminal"), J().then(({ DebugReplPanel: r }) => {
      if (o !== this.replLoadGeneration || !this.isConnected || this.activePanel !== t) return;
      const n = new r({
        kind: t === "shell" ? "shell" : "console",
        debugPath: this.debugPath,
        commands: t === "console" ? this.replCommands : []
      });
      this.replPanels.set(t, n), n.attach(e);
    }).catch(() => {
      o !== this.replLoadGeneration || !this.isConnected || this.activePanel !== t || (e.innerHTML = this.renderCapabilityError("terminal"), e.querySelector("[data-debug-capability-retry]")?.addEventListener("click", () => {
        this.isConnected && this.activePanel === t && this.renderReplPanel(e, t);
      }, { once: !0 }));
    });
  }
  renderCapabilityLoading(e) {
    return `<div class="empty-state" role="status">Loading ${p(e)}…</div>`;
  }
  renderCapabilityError(e) {
    return `<div class="empty-state" role="alert">Unable to load ${p(e)}. <button class="debug-btn" type="button" data-debug-capability-retry>Retry</button></div>`;
  }
  attachResizeListeners() {
    const e = this.shadow.querySelector("[data-resize-handle]");
    e && (e.addEventListener("mousedown", (t) => {
      const a = t;
      a.preventDefault(), this.startResize(a.clientY);
    }), e.addEventListener("touchstart", (t) => {
      const a = t;
      a.touches.length === 1 && (a.preventDefault(), this.startResize(a.touches[0].clientY));
    }, { passive: !1 }));
  }
  startResize(e) {
    this.isResizing = !0, this.resizeStartY = e;
    const t = this.shadow.querySelector(".toolbar");
    this.resizeStartHeight = t?.offsetHeight || b.DEFAULT_HEIGHT, t?.classList.add("resizing"), document.body.style.cursor = "ns-resize", document.body.style.userSelect = "none";
    const a = (n) => {
      this.handleResize(n.clientY);
    }, o = (n) => {
      n.touches.length === 1 && this.handleResize(n.touches[0].clientY);
    }, r = () => {
      this.isResizing = !1, t?.classList.remove("resizing"), document.body.style.cursor = "", document.body.style.userSelect = "", document.removeEventListener("mousemove", a), document.removeEventListener("mouseup", r), document.removeEventListener("touchmove", o), document.removeEventListener("touchend", r), this.saveState();
    };
    document.addEventListener("mousemove", a), document.addEventListener("mouseup", r), document.addEventListener("touchmove", o, { passive: !0 }), document.addEventListener("touchend", r);
  }
  handleResize(e) {
    if (!this.isResizing) return;
    const t = this.resizeStartY - e, a = window.innerHeight * b.MAX_HEIGHT_RATIO, o = Math.min(a, Math.max(b.MIN_HEIGHT, this.resizeStartHeight + t));
    this.customHeight = o;
    const r = this.shadow.querySelector(".toolbar");
    r && (r.style.height = `${o}px`);
  }
  attachExpandableRowListeners() {
    Y(this.shadow);
  }
  attachCopyListeners() {
    Q(this.shadow, { useIconFeedback: !1 });
  }
  attachSortToggleListeners() {
    U(this.shadow, (e, t) => {
      this.panelSortOrder.set(e, t), this.saveState(), this.updateContent();
    });
  }
  mountActivePanelViews() {
    this.mountSQLView(), this.mountLogsView(), this.mountRequestsView(), this.mountJSErrorsView(), this.mountRegistryLiveView();
  }
  mountRegistryLiveView() {
    const e = h.get(this.activePanel);
    e && this.registryLiveList.handles(e) && this.registryLiveList.adopt(e, this.shadow);
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
x = w;
x.MIN_HEIGHT = 150;
x.MAX_HEIGHT_RATIO = 0.8;
x.DEFAULT_HEIGHT = 320;
customElements.get("debug-toolbar") || customElements.define("debug-toolbar", w);
export {
  v as i,
  Se as n,
  P as r,
  w as t
};

//# sourceMappingURL=debug-toolbar-DG7S5eSJ.js.map