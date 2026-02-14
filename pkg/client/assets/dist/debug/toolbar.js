import { w as P, p as u, z, A as M, q as b, B as T, e as A, o as R, r as $, l as H, k as I, i as j, h as D, D as q, g as O, u as F, a as f, s as B, b as N, d as Q, M as _, f as G, x as E } from "../chunks/builtin-panels-BrE08f6x.js";
import { DebugReplPanel as K } from "./repl.js";
const Y = `
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
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .toolbar-tabs::-webkit-scrollbar {
    display: none;
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
    align-items: center;
    gap: 6px;
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
`, c = T;
function x(o, t, e = 50, s) {
  const a = u.get(o);
  if (a) {
    const l = z(t, a);
    return M(a, l, c, s || {}, "toolbar");
  }
  const r = s?.newestFirst ?? !0, n = s?.slowThresholdMs ?? e;
  switch (o) {
    case "requests":
      return D(t.requests || [], c, {
        newestFirst: r,
        slowThresholdMs: n,
        maxEntries: 50,
        showSortToggle: !0,
        truncatePath: !0,
        maxPathLength: 50,
        expandedRequestIds: s?.expandedRequestIds,
        maxDetailLength: 80
      });
    case "sql":
      return j(t.sql || [], c, {
        newestFirst: r,
        slowThresholdMs: n,
        maxEntries: 50,
        showSortToggle: !0,
        useIconCopyButton: !1
        // Toolbar uses SVG icons
      });
    case "logs":
      return I(t.logs || [], c, {
        newestFirst: !0,
        // Logs always show newest first in toolbar
        maxEntries: 100,
        showSortToggle: !1,
        // Logs don't have sort toggle in toolbar
        showSource: !1,
        // Toolbar doesn't show source column
        truncateMessage: !0,
        maxMessageLength: 100
      });
    case "config":
      return b("Config", t.config || {}, c, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "routes":
      return H(t.routes || [], c, {
        showName: !1
        // Toolbar doesn't show name column
      });
    case "template":
      return b("Template Context", t.template || {}, c, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "session":
      return b("Session", t.session || {}, c, {
        useIconCopyButton: !1,
        showCount: !1
      });
    case "jserrors":
      return $(t.jserrors || [], c, {
        newestFirst: r,
        maxEntries: 50,
        compact: !0,
        showSortToggle: !0
      });
    case "custom":
      return R(t.custom || {}, c, {
        maxLogEntries: 50,
        useIconCopyButton: !1,
        showCount: !1
      });
    default: {
      const l = t[o];
      if (l != null) {
        const i = o.replace(/[_-]/g, " ").replace(/\b\w/g, (d) => d.toUpperCase());
        return b(i, l, c, {
          useIconCopyButton: !1,
          showCount: !1
        });
      }
      return `<div class="${c.emptyState}">Panel "${A(o)}" not available</div>`;
    }
  }
}
function g(o, t = 50) {
  const e = o.requests?.length || 0, s = o.sql?.length || 0, a = o.logs?.length || 0, r = o.jserrors?.length || 0, n = (o.requests || []).filter((p) => (p.status || 0) >= 400).length, l = (o.sql || []).filter((p) => p.error).length, i = (o.logs || []).filter((p) => {
    const v = (p.level || "").toLowerCase();
    return v === "error" || v === "fatal";
  }).length, d = (o.sql || []).filter((p) => P(p.duration, t)).length;
  return {
    requests: e,
    sql: s,
    logs: a,
    jserrors: r,
    errors: n + l + i + r,
    slowQueries: d
  };
}
const U = /* @__PURE__ */ new Set(["console", "shell"]), w = {
  console: "Console",
  shell: "Shell"
}, y = () => {
  const o = u.getToolbarPanels();
  return o.length > 0 ? o.filter((t) => t.category === "core" || t.category === "system").map((t) => t.id) : ["requests", "sql", "logs", "routes", "config"];
}, W = (o) => {
  if (w[o])
    return w[o];
  const t = u.get(o);
  return t ? t.label : o.charAt(0).toUpperCase() + o.slice(1);
}, k = (o) => {
  const t = u.get(o);
  return t ? E(t) : [o];
}, S = () => {
  const o = {};
  for (const t of u.list())
    for (const e of E(t))
      o[e] = t.id;
  return o;
}, J = (o) => {
  if (!Array.isArray(o))
    return [];
  const t = [];
  return o.forEach((e) => {
    if (!e || typeof e != "object")
      return;
    const s = e, a = typeof s.command == "string" ? s.command.trim() : "";
    if (!a)
      return;
    const r = typeof s.description == "string" ? s.description.trim() : "", n = Array.isArray(s.tags) ? s.tags.filter((d) => typeof d == "string" && d.trim() !== "").map((d) => d.trim()) : [], l = Array.isArray(s.aliases) ? s.aliases.filter((d) => typeof d == "string" && d.trim() !== "").map((d) => d.trim()) : [], i = typeof s.mutates == "boolean" ? s.mutates : typeof s.read_only == "boolean" ? !s.read_only : !1;
    t.push({
      command: a,
      description: r || void 0,
      tags: n.length > 0 ? n : void 0,
      aliases: l.length > 0 ? l : void 0,
      mutates: i
    });
  }), t;
}, h = class h extends HTMLElement {
  constructor() {
    super(), this.stream = null, this.externalStream = null, this.snapshot = {}, this.replPanels = /* @__PURE__ */ new Map(), this.replCommands = [], this.expanded = !1, this.activePanel = "requests", this.connectionStatus = "disconnected", this.slowThresholdMs = 50, this.useFab = !1, this.customHeight = null, this.isResizing = !1, this.resizeStartY = 0, this.resizeStartHeight = 0, this.panelSortOrder = /* @__PURE__ */ new Map([
      ["requests", !0],
      ["sql", !0]
    ]), this.eventToPanel = {}, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.handleKeyDown = (t) => {
      (t.ctrlKey || t.metaKey) && t.shiftKey && t.key.toLowerCase() === "d" && (t.preventDefault(), this.toggleExpanded()), t.key === "Escape" && this.expanded && this.collapse();
    }, this.shadow = this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["base-path", "debug-path", "panels", "expanded", "slow-threshold-ms", "use-fab"];
  }
  connectedCallback() {
    this.eventToPanel = S(), this.unsubscribeRegistry = u.subscribe((t) => this.handleRegistryChange(t)), this.loadState(), this.render(), this.useFab || (this.initWebSocket(), this.fetchInitialSnapshot()), this.setupKeyboardShortcut();
  }
  disconnectedCallback() {
    this.stream?.close(), this.unsubscribeRegistry?.(), document.removeEventListener("keydown", this.handleKeyDown);
  }
  /**
   * Handle registry changes (panel registered/unregistered)
   */
  handleRegistryChange(t) {
    this.eventToPanel = S(), this.updateSubscriptions(), this.expanded && this.render();
  }
  /**
   * Update WebSocket subscriptions based on current panels
   */
  updateSubscriptions() {
    const t = this.getStream();
    if (!t) return;
    const e = /* @__PURE__ */ new Set();
    for (const s of this.panels)
      for (const a of k(s))
        e.add(a);
    t.subscribe(Array.from(e));
  }
  attributeChangedCallback(t, e, s) {
    e !== s && (t === "expanded" ? (this.expanded = s === "true" || s === "", this.saveState(), this.render()) : t === "slow-threshold-ms" ? this.slowThresholdMs = parseInt(s || "50", 10) || 50 : t === "use-fab" && (this.useFab = s === "true" || s === ""));
  }
  // Public API for FAB integration
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
  // State persistence
  loadState() {
    try {
      const t = localStorage.getItem("debug-toolbar-expanded");
      t !== null && (this.expanded = t === "true");
      const e = localStorage.getItem("debug-toolbar-height");
      if (e !== null) {
        const a = parseInt(e, 10);
        !isNaN(a) && a >= h.MIN_HEIGHT && (this.customHeight = a);
      }
      const s = localStorage.getItem("debug-toolbar-sort-order");
      if (s)
        try {
          const a = JSON.parse(s);
          Object.entries(a).forEach(([r, n]) => {
            this.panelSortOrder.set(r, n);
          });
        } catch {
        }
    } catch {
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.expanded)), this.customHeight !== null && localStorage.setItem("debug-toolbar-height", String(this.customHeight));
      const t = {};
      this.panelSortOrder.forEach((e, s) => {
        t[s] = e;
      }), localStorage.setItem("debug-toolbar-sort-order", JSON.stringify(t));
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
  // Attribute getters
  get basePath() {
    const e = (this.getAttribute("base-path") || "").trim();
    return e ? e.startsWith("http://") || e.startsWith("https://") || e.startsWith("//") ? e.replace(/\/+$/g, "") : e === "/" ? "" : "/" + e.replace(/^\/+|\/+$/g, "") : "";
  }
  get debugPath() {
    const t = this.getAttribute("debug-path");
    return t || `${this.basePath}/debug`;
  }
  get panels() {
    const t = this.getAttribute("panels");
    if (t) {
      const e = t.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      return e.length ? e : y();
    }
    return y();
  }
  get wsUrl() {
    return `${this.debugPath}/ws`;
  }
  // Get the active stream (external from FAB or internal)
  getStream() {
    return this.externalStream || this.stream;
  }
  // WebSocket initialization
  initWebSocket() {
    this.stream = new q({
      basePath: this.debugPath,
      onEvent: (e) => this.handleEvent(e),
      onStatusChange: (e) => this.handleStatusChange(e)
    }), this.stream.connect();
    const t = /* @__PURE__ */ new Set();
    for (const e of this.panels)
      for (const s of k(e))
        t.add(s);
    this.stream.subscribe(Array.from(t));
  }
  // Fetch initial snapshot via HTTP
  async fetchInitialSnapshot() {
    try {
      const t = await fetch(`${this.debugPath}/api/snapshot`, {
        credentials: "same-origin"
      });
      if (t.ok) {
        const e = await t.json();
        this.applySnapshot(e);
      }
    } catch {
    }
  }
  // Event handlers
  handleEvent(t) {
    if (!t || !t.type) return;
    if (t.type === "snapshot") {
      this.applySnapshot(t.payload);
      return;
    }
    const e = this.eventToPanel[t.type] || t.type, s = u.get(e);
    if (s) {
      const a = O(s), r = this.snapshot[a], l = (s.handleEvent || ((i, d) => F(i, d, 500)))(r, t.payload);
      this.snapshot[a] = l;
    } else
      switch (t.type) {
        case "request":
          this.snapshot.requests = this.snapshot.requests || [], this.snapshot.requests.push(t.payload), this.trimArray(this.snapshot.requests, 500);
          break;
        case "sql":
          this.snapshot.sql = this.snapshot.sql || [], this.snapshot.sql.push(t.payload), this.trimArray(this.snapshot.sql, 200);
          break;
        case "log":
          this.snapshot.logs = this.snapshot.logs || [], this.snapshot.logs.push(t.payload), this.trimArray(this.snapshot.logs, 500);
          break;
        case "template":
          this.snapshot.template = t.payload || {};
          break;
        case "session":
          this.snapshot.session = t.payload || {};
          break;
        case "custom":
          this.handleCustomEvent(t.payload);
          break;
      }
    e === this.activePanel && this.expanded && this.updateContent();
  }
  handleCustomEvent(t) {
    if (!t || typeof t != "object") return;
    this.snapshot.custom = this.snapshot.custom || { data: {}, logs: [] };
    const e = t;
    "key" in e && "value" in e ? (this.snapshot.custom.data = this.snapshot.custom.data || {}, this.snapshot.custom.data[String(e.key)] = e.value) : ("category" in e || "message" in e) && (this.snapshot.custom.logs = this.snapshot.custom.logs || [], this.snapshot.custom.logs.push(t), this.trimArray(this.snapshot.custom.logs, 500));
  }
  handleStatusChange(t) {
    this.connectionStatus = t, this.updateConnectionStatus();
  }
  applySnapshot(t) {
    this.snapshot = t || {}, this.replCommands = J(this.snapshot.repl_commands), this.updateContent();
  }
  trimArray(t, e) {
    for (; t.length > e; )
      t.shift();
  }
  // Rendering
  render() {
    const t = g(this.snapshot, this.slowThresholdMs), e = this.panels.map((l) => {
      const i = W(l), d = this.getPanelCount(l);
      return `
          <button class="tab ${this.activePanel === l ? "active" : ""}" data-panel="${l}">
            ${i}
            <span class="tab-count">${d}</span>
          </button>
        `;
    }).join(""), s = this.expanded ? "expanded" : "collapsed", a = this.useFab && !this.expanded ? "hidden" : "", r = this.expanded ? this.customHeight || h.DEFAULT_HEIGHT : 36, n = this.expanded ? `height: ${r}px;` : "";
    this.shadow.innerHTML = `
      <style>${Y}</style>
      <div class="toolbar ${s} ${a}" style="${n}">
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
              ${x(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions())}
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
    `, this.attachEventListeners();
  }
  updateContent() {
    if (this.expanded) {
      const t = this.shadow.getElementById("panel-content");
      t && (U.has(this.activePanel) ? this.renderReplPanel(t, this.activePanel) : (t.innerHTML = x(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions()), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.attachSQLSelectionListeners(), this.activePanel === "requests" && f(this.shadow, this.expandedRequests))), this.panels.forEach((e) => {
        const s = this.shadow.querySelector(`[data-panel="${e}"] .tab-count`);
        s && (s.textContent = String(this.getPanelCount(e)));
      });
    }
    this.useFab || this.updateSummary();
  }
  updateSummary() {
    const t = g(this.snapshot, this.slowThresholdMs), e = this.shadow.querySelector(".toolbar-summary");
    if (!e) return;
    e.querySelectorAll(".summary-item").forEach((a) => {
      const r = a.querySelector("span:first-child")?.textContent?.replace(":", "").toLowerCase(), n = a.querySelector(".count");
      !n || !r || (r === "requests" ? (n.textContent = String(t.requests), a.classList.toggle("has-errors", t.errors > 0)) : r === "sql" ? (n.textContent = String(t.sql), a.classList.toggle("has-slow", t.slowQueries > 0)) : r === "logs" ? n.textContent = String(t.logs) : r === "errors" && (n.textContent = String(t.errors)));
    });
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".connection-indicator .status-dot");
    t && (t.className = `status-dot ${this.connectionStatus}`);
    const e = this.shadow.querySelector(".connection-status .status-dot"), s = this.shadow.querySelector(".connection-status span:last-child");
    e && (e.className = `status-dot ${this.connectionStatus}`), s && (s.textContent = this.connectionStatus);
  }
  getPanelCount(t) {
    const e = u.get(t);
    if (e)
      return B(this.snapshot, e);
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
        const s = this.snapshot.custom || {};
        return Object.keys(s.data || {}).length + (s.logs?.length || 0);
      default: {
        const a = this.snapshot[t];
        return Array.isArray(a) ? a.length : a != null && typeof a == "object" ? Object.keys(a).length : 0;
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
        const s = e.currentTarget.dataset.panel;
        if (s && s !== this.activePanel) {
          this.activePanel = s, this.shadow.querySelectorAll(".tab").forEach((r) => r.classList.remove("active")), e.currentTarget.classList.add("active");
          const a = this.shadow.getElementById("panel-content");
          a && (a.innerHTML = x(this.activePanel, this.snapshot, this.slowThresholdMs, this.getPanelOptions()), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.attachSQLSelectionListeners(), this.activePanel === "requests" && f(this.shadow, this.expandedRequests));
        }
      });
    }), this.attachExpandableRowListeners(), this.attachCopyListeners(), this.attachSortToggleListeners(), this.attachSQLSelectionListeners(), this.activePanel === "requests" && f(this.shadow, this.expandedRequests), this.shadow.querySelectorAll("[data-action]").forEach((t) => {
      t.addEventListener("click", (e) => {
        const s = e.currentTarget.dataset.action, a = this.getStream();
        switch (s) {
          case "toggle":
            this.toggleExpanded();
            break;
          case "collapse":
            this.collapse();
            break;
          case "refresh":
            a?.requestSnapshot();
            break;
          case "clear":
            a?.clear(), this.snapshot = {}, this.updateContent();
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
  renderReplPanel(t, e) {
    let s = this.replPanels.get(e);
    s || (s = new K({
      kind: e === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: e === "console" ? this.replCommands : []
    }), this.replPanels.set(e, s)), s.attach(t);
  }
  attachResizeListeners() {
    const t = this.shadow.querySelector("[data-resize-handle]");
    t && (t.addEventListener("mousedown", (e) => {
      const s = e;
      s.preventDefault(), this.startResize(s.clientY);
    }), t.addEventListener("touchstart", (e) => {
      const s = e;
      s.touches.length === 1 && (s.preventDefault(), this.startResize(s.touches[0].clientY));
    }, { passive: !1 }));
  }
  startResize(t) {
    this.isResizing = !0, this.resizeStartY = t;
    const e = this.shadow.querySelector(".toolbar");
    this.resizeStartHeight = e?.offsetHeight || h.DEFAULT_HEIGHT, e?.classList.add("resizing"), document.body.style.cursor = "ns-resize", document.body.style.userSelect = "none";
    const s = (n) => {
      this.handleResize(n.clientY);
    }, a = (n) => {
      n.touches.length === 1 && this.handleResize(n.touches[0].clientY);
    }, r = () => {
      this.isResizing = !1, e?.classList.remove("resizing"), document.body.style.cursor = "", document.body.style.userSelect = "", document.removeEventListener("mousemove", s), document.removeEventListener("mouseup", r), document.removeEventListener("touchmove", a), document.removeEventListener("touchend", r), this.saveState();
    };
    document.addEventListener("mousemove", s), document.addEventListener("mouseup", r), document.addEventListener("touchmove", a, { passive: !0 }), document.addEventListener("touchend", r);
  }
  handleResize(t) {
    if (!this.isResizing) return;
    const e = this.resizeStartY - t, s = window.innerHeight * h.MAX_HEIGHT_RATIO, a = Math.min(s, Math.max(h.MIN_HEIGHT, this.resizeStartHeight + e));
    this.customHeight = a;
    const r = this.shadow.querySelector(".toolbar");
    r && (r.style.height = `${a}px`);
  }
  attachExpandableRowListeners() {
    N(this.shadow);
  }
  attachCopyListeners() {
    Q(this.shadow, { useIconFeedback: !1 });
  }
  attachSortToggleListeners() {
    _(this.shadow, (t, e) => {
      this.panelSortOrder.set(t, e), this.saveState(), this.updateContent();
    });
  }
  attachSQLSelectionListeners() {
    this.activePanel === "sql" && G(this.shadow, this.snapshot.sql || [], { useIconFeedback: !1 });
  }
};
h.MIN_HEIGHT = 150, h.MAX_HEIGHT_RATIO = 0.8, h.DEFAULT_HEIGHT = 320;
let m = h;
customElements.get("debug-toolbar") || customElements.define("debug-toolbar", m);
const X = `
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
  .fab.is-hovered .fab-expanded {
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
`, Z = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, C = ["requests", "sql", "logs", "routes", "config"];
class V extends HTMLElement {
  constructor() {
    super(), this.stream = null, this.snapshot = {}, this.connectionStatus = "disconnected", this.isHovered = !1, this.toolbarExpanded = !1, this.shadow = this.attachShadow({ mode: "open" });
  }
  static get observedAttributes() {
    return ["debug-path", "panels", "toolbar-expanded"];
  }
  connectedCallback() {
    this.render(), this.initWebSocket(), this.fetchInitialSnapshot(), this.loadState();
  }
  disconnectedCallback() {
    this.stream?.close();
  }
  attributeChangedCallback(t, e, s) {
    e !== s && t === "toolbar-expanded" && (this.toolbarExpanded = s === "true" || s === "", this.render());
  }
  // Public API
  setToolbarExpanded(t) {
    this.toolbarExpanded = t, this.saveState(), this.render();
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
  // Attribute getters
  get debugPath() {
    return this.getAttribute("debug-path") || "/admin/debug";
  }
  get panels() {
    const t = this.getAttribute("panels");
    if (t) {
      const e = t.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      return e.length ? e : C;
    }
    return C;
  }
  // State persistence
  loadState() {
    try {
      const t = localStorage.getItem("debug-toolbar-expanded");
      t !== null && (this.toolbarExpanded = t === "true", this.render());
    } catch {
    }
  }
  saveState() {
    try {
      localStorage.setItem("debug-toolbar-expanded", String(this.toolbarExpanded));
    } catch {
    }
  }
  // WebSocket initialization
  initWebSocket() {
    this.stream = new q({
      basePath: this.debugPath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.handleStatusChange(t)
    }), this.stream.connect(), this.stream.subscribe(this.panels.map((t) => Z[t] || t));
  }
  // Fetch initial snapshot via HTTP
  async fetchInitialSnapshot() {
    try {
      const t = await fetch(`${this.debugPath}/api/snapshot`, {
        credentials: "same-origin"
      });
      if (t.ok) {
        const e = await t.json();
        this.applySnapshot(e);
      }
    } catch {
    }
  }
  // Event handlers
  handleEvent(t) {
    if (!(!t || !t.type)) {
      if (t.type === "snapshot") {
        this.applySnapshot(t.payload);
        return;
      }
      switch (t.type) {
        case "request":
          this.snapshot.requests = this.snapshot.requests || [], this.snapshot.requests.push(t.payload), this.trimArray(this.snapshot.requests, 500);
          break;
        case "sql":
          this.snapshot.sql = this.snapshot.sql || [], this.snapshot.sql.push(t.payload), this.trimArray(this.snapshot.sql, 200);
          break;
        case "log":
          this.snapshot.logs = this.snapshot.logs || [], this.snapshot.logs.push(t.payload), this.trimArray(this.snapshot.logs, 500);
          break;
        case "template":
          this.snapshot.template = t.payload || {};
          break;
        case "session":
          this.snapshot.session = t.payload || {};
          break;
        case "custom":
          this.handleCustomEvent(t.payload);
          break;
      }
      this.updateCounters();
    }
  }
  handleCustomEvent(t) {
    if (!t || typeof t != "object") return;
    this.snapshot.custom = this.snapshot.custom || { data: {}, logs: [] };
    const e = t;
    "key" in e && "value" in e ? (this.snapshot.custom.data = this.snapshot.custom.data || {}, this.snapshot.custom.data[String(e.key)] = e.value) : ("category" in e || "message" in e) && (this.snapshot.custom.logs = this.snapshot.custom.logs || [], this.snapshot.custom.logs.push(t), this.trimArray(this.snapshot.custom.logs, 500));
  }
  handleStatusChange(t) {
    this.connectionStatus = t, this.updateConnectionStatus(), this.dispatchEvent(new CustomEvent("debug-status-change", {
      detail: { status: t },
      bubbles: !0,
      composed: !0
    }));
  }
  applySnapshot(t) {
    this.snapshot = t || {}, this.updateCounters(), this.dispatchEvent(new CustomEvent("debug-snapshot", {
      detail: { snapshot: this.snapshot },
      bubbles: !0,
      composed: !0
    }));
  }
  trimArray(t, e) {
    for (; t.length > e; )
      t.shift();
  }
  // Rendering
  render() {
    const t = g(this.snapshot), e = t.errors > 0, s = t.slowQueries > 0, a = this.toolbarExpanded ? "hidden" : "";
    this.shadow.innerHTML = `
      <style>${X}</style>
      <div class="fab ${a}" data-status="${this.connectionStatus}">
        <span class="fab-status-dot"></span>
        <div class="fab-collapsed">
          <span class="fab-icon">
            <svg viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.25C15.4148 2.25 18.157 4.93659 19.2445 8.53907L20.6646 7.82902C21.0351 7.64377 21.4856 7.79394 21.6709 8.16443C21.8561 8.53491 21.7059 8.98541 21.3355 9.17066L19.5919 10.0425C19.6958 10.6789 19.75 11.3341 19.75 12C19.75 12.4216 19.7283 12.839 19.6859 13.25H22C22.4142 13.25 22.75 13.5858 22.75 14C22.75 14.4142 22.4142 14.75 22 14.75H19.4347C19.2438 15.5659 18.9699 16.3431 18.6235 17.0629L20.5303 18.9697C20.8232 19.2626 20.8232 19.7374 20.5303 20.0303C20.2374 20.3232 19.7626 20.3232 19.4697 20.0303L17.8463 18.4069C16.4519 20.4331 14.3908 21.75 12 21.75C9.60921 21.75 7.54809 20.4331 6.15371 18.4069L4.53033 20.0303C4.23744 20.3232 3.76256 20.3232 3.46967 20.0303C3.17678 19.7374 3.17678 19.2626 3.46967 18.9697L5.37647 17.0629C5.03008 16.3431 4.7562 15.5659 4.56527 14.75H2C1.58579 14.75 1.25 14.4142 1.25 14C1.25 13.5858 1.58579 13.25 2 13.25H4.31407C4.27174 12.839 4.25 12.4216 4.25 12C4.25 11.3341 4.30423 10.6789 4.40814 10.0425L2.66455 9.17066C2.29406 8.98541 2.1439 8.53491 2.32914 8.16443C2.51438 7.79394 2.96488 7.64377 3.33537 7.82902L4.75547 8.53907C5.84297 4.93659 8.58522 2.25 12 2.25ZM11.25 19C11.25 19.4142 11.5858 19.75 12 19.75C12.4142 19.75 12.75 19.4142 12.75 19V9.73117C14.005 9.6696 15.2088 9.46632 16.1588 9.26042C16.5636 9.17268 16.8207 8.77339 16.7329 8.36857C16.6452 7.96376 16.2459 7.70672 15.8411 7.79445C14.7597 8.02883 13.3718 8.25 12 8.25C10.6281 8.25 9.24022 8.02883 8.15882 7.79445C7.75401 7.70672 7.35472 7.96376 7.26698 8.36857C7.17924 8.77339 7.43629 9.17268 7.8411 9.26042C8.79115 9.46632 9.99494 9.6696 11.25 9.73117V19Z" fill="currentColor"></path>
            </svg>
          </span>
        </div>
        <div class="fab-expanded">
          <div class="fab-counter ${t.requests > 0 ? "has-items" : ""}">
            <span class="counter-value">${t.requests}</span>
            <span class="counter-label">Req</span>
          </div>
          <div class="fab-counter ${t.sql > 0 ? "has-items" : ""} ${s ? "has-slow" : ""}">
            <span class="counter-value">${t.sql}</span>
            <span class="counter-label">SQL</span>
          </div>
          <div class="fab-counter ${t.logs > 0 ? "has-items" : ""} ${e ? "has-errors" : ""}">
            <span class="counter-value">${t.logs}</span>
            <span class="counter-label">Logs</span>
          </div>
          ${e ? `
            <div class="fab-counter has-errors">
              <span class="counter-value">${t.errors}</span>
              <span class="counter-label">Err</span>
            </div>
          ` : ""}
        </div>
      </div>
    `, this.attachEventListeners();
  }
  updateCounters() {
    const t = g(this.snapshot), e = t.errors > 0, s = t.slowQueries > 0, a = this.shadow.querySelector(".fab-counter:nth-child(1)");
    if (a) {
      const i = a.querySelector(".counter-value");
      i && (i.textContent = String(t.requests)), a.classList.toggle("has-items", t.requests > 0);
    }
    const r = this.shadow.querySelector(".fab-counter:nth-child(2)");
    if (r) {
      const i = r.querySelector(".counter-value");
      i && (i.textContent = String(t.sql)), r.classList.toggle("has-items", t.sql > 0), r.classList.toggle("has-slow", s);
    }
    const n = this.shadow.querySelector(".fab-counter:nth-child(3)");
    if (n) {
      const i = n.querySelector(".counter-value");
      i && (i.textContent = String(t.logs)), n.classList.toggle("has-items", t.logs > 0), n.classList.toggle("has-errors", e);
    }
    const l = this.shadow.querySelector(".fab-counter:nth-child(4)");
    if (e && l) {
      const i = l.querySelector(".counter-value");
      i && (i.textContent = String(t.errors));
    }
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".fab");
    t && t.setAttribute("data-status", this.connectionStatus);
  }
  attachEventListeners() {
    const t = this.shadow.querySelector(".fab");
    t && (t.addEventListener("click", () => {
      this.toolbarExpanded = !0, this.saveState(), this.render(), this.dispatchEvent(new CustomEvent("debug-expand", {
        detail: { expanded: !0 },
        bubbles: !0,
        composed: !0
      }));
    }), t.addEventListener("mouseenter", () => {
      this.isHovered = !0, t.classList.add("is-hovered");
    }), t.addEventListener("mouseleave", () => {
      this.isHovered = !1, t.classList.remove("is-hovered");
    }));
  }
}
customElements.get("debug-fab") || customElements.define("debug-fab", V);
const tt = (o) => {
  const t = (o || "").trim();
  return !t || t === "/" ? "" : "/" + t.replace(/^\/+|\/+$/g, "");
};
class L {
  constructor(t = {}) {
    this.fab = null, this.toolbar = null, this.initialized = !1, this.options = {
      panels: ["requests", "sql", "logs", "routes", "config"],
      slowThresholdMs: 50,
      container: document.body,
      ...t
    };
    const e = tt(this.options.basePath);
    e && (this.options.basePath = e), !this.options.debugPath && e && (this.options.debugPath = `${e}/debug`);
  }
  /**
   * Initialize the debug UI with FAB and Toolbar
   */
  init() {
    this.initialized || (this.initialized = !0, this.createFab(), this.createToolbar(), this.wireEvents());
  }
  /**
   * Destroy the debug UI
   */
  destroy() {
    this.fab && (this.fab.remove(), this.fab = null), this.toolbar && (this.toolbar.remove(), this.toolbar = null), this.initialized = !1;
  }
  /**
   * Expand the toolbar programmatically
   */
  expand() {
    !this.toolbar || !this.fab || (this.fab.setToolbarExpanded(!0), this.toolbar.setExpanded(!0));
  }
  /**
   * Collapse the toolbar programmatically
   */
  collapse() {
    !this.toolbar || !this.fab || (this.fab.setToolbarExpanded(!1), this.toolbar.setExpanded(!1));
  }
  /**
   * Toggle the toolbar state
   */
  toggle() {
    this.toolbar && (this.toolbar.isExpanded() ? this.collapse() : this.expand());
  }
  createFab() {
    this.fab = document.createElement("debug-fab"), this.options.debugPath && this.fab.setAttribute("debug-path", this.options.debugPath), this.options.basePath && this.fab.setAttribute("base-path", this.options.basePath), this.options.panels && this.fab.setAttribute("panels", this.options.panels.join(",")), this.options.container?.appendChild(this.fab);
  }
  createToolbar() {
    this.toolbar = document.createElement("debug-toolbar"), this.options.debugPath && this.toolbar.setAttribute("debug-path", this.options.debugPath), this.options.basePath && this.toolbar.setAttribute("base-path", this.options.basePath), this.toolbar.setAttribute("use-fab", "true"), this.options.panels && this.toolbar.setAttribute("panels", this.options.panels.join(",")), this.options.slowThresholdMs && this.toolbar.setAttribute("slow-threshold-ms", String(this.options.slowThresholdMs)), this.options.container?.appendChild(this.toolbar);
  }
  wireEvents() {
    !this.fab || !this.toolbar || (this.fab.addEventListener("debug-expand", (t) => {
      if (t.detail?.expanded && this.toolbar) {
        const e = this.fab?.getStream();
        e && this.toolbar.setStream(e);
        const s = this.fab?.getSnapshot();
        s && this.toolbar.setSnapshot(s);
        const a = this.fab?.getConnectionStatus();
        a && this.toolbar.setConnectionStatus(a), this.toolbar.setExpanded(!0);
      }
    }), this.fab.addEventListener("debug-status-change", (t) => {
      this.toolbar && t.detail?.status && this.toolbar.setConnectionStatus(t.detail.status);
    }), this.fab.addEventListener("debug-snapshot", (t) => {
      this.toolbar && t.detail?.snapshot && this.toolbar.setSnapshot(t.detail.snapshot);
    }), this.toolbar.addEventListener("debug-expand", (t) => {
      !t.detail?.expanded && this.fab && this.fab.setToolbarExpanded(!1);
    }));
  }
}
function et() {
  const o = window.DEBUG_CONFIG, t = document.querySelector("[data-debug-path]");
  let e = {};
  if (o ? e = {
    basePath: o.basePath,
    debugPath: o.debugPath,
    panels: o.panels,
    slowThresholdMs: o.slowThresholdMs
  } : t && (e = {
    basePath: t.getAttribute("data-base-path") || void 0,
    debugPath: t.getAttribute("data-debug-path") || void 0,
    panels: t.getAttribute("data-panels")?.split(","),
    slowThresholdMs: parseInt(t.getAttribute("data-slow-threshold-ms") || "50", 10)
  }), !e.debugPath && !e.basePath && !o && !t)
    return null;
  const s = new L(e);
  return s.init(), s;
}
window.DebugManager = L;
window.initDebugManager = et;
export {
  V as DebugFab,
  L as DebugManager,
  m as DebugToolbar,
  g as getCounts,
  et as initDebugManager,
  x as renderPanel
};
//# sourceMappingURL=toolbar.js.map
