import { escapeHTML as r } from "../shared/html.js";
import { normalizeDebugBasePath as c } from "../debug/shared/path-helpers.js";
import { t as f } from "./debug-stream-o5N7-MAm.js";
import { C as g, F as x, b as v, i as m, n as y, o as h, r as b, s as w, u as S } from "./runtime-helpers-C2cPJaEE.js";
import { t as p } from "./deployment-identity-qBgNJ52n.js";
var C = `
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

  .fab-persona-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    overflow: hidden;
    border: 1px solid var(--fab-border);
    border-radius: 7px;
    background: var(--persona-background, rgba(255, 255, 255, 0.08));
    color: var(--persona-foreground, var(--fab-text));
    font-size: 9px;
    font-weight: 800;
  }

  .fab-persona-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
`, d = S, E = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "debug-path",
      "panels",
      "toolbar-expanded",
      "live-transport"
    ];
  }
  constructor() {
    super(), this.stream = null, this.snapshot = {}, this.connectionStatus = "disconnected", this.isHovered = !1, this.toolbarExpanded = !1, this.toolbarLoading = !1, this.toolbarLoadError = !1, this.eventToPanel = {}, this.unsubscribeRegistry = null, this.initializeGeneration = 0, this.shadow = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.initializeGeneration += 1, this.initialize(this.initializeGeneration);
  }
  async initialize(t) {
    if (this.eventToPanel = b(), this.unsubscribeRegistry = v.subscribe((e) => this.handleRegistryChange(e)), this.isInitializationStale(t)) {
      this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null;
      return;
    }
    this.render(), this.liveTransportEnabled && this.initWebSocket(), this.fetchInitialSnapshot(t), this.loadState();
  }
  disconnectedCallback() {
    this.initializeGeneration += 1, this.stream?.close(), this.stream = null, this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null;
  }
  isInitializationStale(t) {
    return t !== this.initializeGeneration || !this.isConnected;
  }
  attributeChangedCallback(t, e, a) {
    e !== a && t === "toolbar-expanded" && (this.toolbarExpanded = a === "true" || a === "", this.render());
  }
  setToolbarExpanded(t) {
    this.toolbarExpanded = t, this.saveState(), this.render();
  }
  setToolbarLoading(t) {
    this.toolbarLoading = t, t && (this.toolbarLoadError = !1), this.render();
  }
  setToolbarLoadError(t) {
    this.toolbarLoadError = t, t && (this.toolbarLoading = !1), this.render();
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
    const t = this.getAttribute("panels");
    if (t) {
      const e = t.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
      return e.length ? e : h();
    }
    return h();
  }
  get liveTransportEnabled() {
    const t = this.getAttribute("live-transport");
    return t === null ? !0 : t === "" || t === "true";
  }
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
  initWebSocket() {
    this.stream = new f({
      basePath: this.debugPath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.handleStatusChange(t)
    }), this.stream.connect(), this.updateSubscriptions();
  }
  async fetchInitialSnapshot(t = this.initializeGeneration) {
    const e = await m(this.debugPath);
    this.isInitializationStale(t) || e && this.applySnapshot(e);
  }
  handleEvent(t) {
    if (!(!t || !t.type)) {
      if (t.type === "snapshot") {
        this.applySnapshot(t.payload);
        return;
      }
      y(this.snapshot, t, { eventToPanel: this.eventToPanel }), this.updateCounters();
    }
  }
  handleStatusChange(t) {
    this.connectionStatus = t, this.updateConnectionStatus(), this.dispatchEvent(new CustomEvent("debug-status-change", {
      detail: { status: t },
      bubbles: !0,
      composed: !0
    }));
  }
  applySnapshot(t) {
    this.snapshot = t || {}, this.render(), this.dispatchEvent(new CustomEvent("debug-snapshot", {
      detail: { snapshot: this.snapshot },
      bubbles: !0,
      composed: !0
    }));
  }
  accessibleLabel(t, e) {
    const a = (i, o, l) => `${i} ${i === 1 ? o : l}`, s = [this.toolbarLoadError ? "Debug toolbar failed to load. Activate to retry" : this.toolbarLoading ? "Loading debug toolbar" : "Open debug toolbar"];
    return t && s.push(t.title), s.push([
      a(e.requests, "request", "requests"),
      a(e.sql, "query", "queries"),
      a(e.logs, "log", "logs")
    ].join(", ")), e.errors > 0 && s.push(a(e.errors, "error", "errors")), s.push(`Debug stream ${this.connectionStatus}`), s.join(". ");
  }
  render() {
    const t = d(this.snapshot), e = t.errors > 0, a = t.slowQueries > 0, s = p(this.snapshot, this.panels), i = this.toolbarExpanded && !this.toolbarLoading ? "hidden" : "", o = this.accessibleLabel(s, t);
    this.shadow.innerHTML = `
      <style>${C}</style>
      <div
        class="fab ${i} ${s ? "has-identity" : ""}"
        data-status="${this.connectionStatus}"
        role="button"
        tabindex="${this.toolbarExpanded && !this.toolbarLoading ? "-1" : "0"}"
        aria-hidden="${this.toolbarExpanded && !this.toolbarLoading ? "true" : "false"}"
        aria-busy="${this.toolbarLoading ? "true" : "false"}"
        aria-label="${r(o)}"
        title="${r(this.toolbarLoadError ? "Debug toolbar failed to load. Activate to retry." : s ? s.title : "Open debug toolbar")}"
      >
        <span class="fab-status-dot"></span>
        <div class="fab-collapsed ${s ? "has-identity" : ""}" ${s ? `style="--fab-environment:${r(s.color)}"` : ""}>
          <span class="fab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.25C15.4148 2.25 18.157 4.93659 19.2445 8.53907L20.6646 7.82902C21.0351 7.64377 21.4856 7.79394 21.6709 8.16443C21.8561 8.53491 21.7059 8.98541 21.3355 9.17066L19.5919 10.0425C19.6958 10.6789 19.75 11.3341 19.75 12C19.75 12.4216 19.7283 12.839 19.6859 13.25H22C22.4142 13.25 22.75 13.5858 22.75 14C22.75 14.4142 22.4142 14.75 22 14.75H19.4347C19.2438 15.5659 18.9699 16.3431 18.6235 17.0629L20.5303 18.9697C20.8232 19.2626 20.8232 19.7374 20.5303 20.0303C20.2374 20.3232 19.7626 20.3232 19.4697 20.0303L17.8463 18.4069C16.4519 20.4331 14.3908 21.75 12 21.75C9.60921 21.75 7.54809 20.4331 6.15371 18.4069L4.53033 20.0303C4.23744 20.3232 3.76256 20.3232 3.46967 20.0303C3.17678 19.7374 3.17678 19.2626 3.46967 18.9697L5.37647 17.0629C5.03008 16.3431 4.7562 15.5659 4.56527 14.75H2C1.58579 14.75 1.25 14.4142 1.25 14C1.25 13.5858 1.58579 13.25 2 13.25H4.31407C4.27174 12.839 4.25 12.4216 4.25 12C4.25 11.3341 4.30423 10.6789 4.40814 10.0425L2.66455 9.17066C2.29406 8.98541 2.1439 8.53491 2.32914 8.16443C2.51438 7.79394 2.96488 7.64377 3.33537 7.82902L4.75547 8.53907C5.84297 4.93659 8.58522 2.25 12 2.25ZM11.25 19C11.25 19.4142 11.5858 19.75 12 19.75C12.4142 19.75 12.75 19.4142 12.75 19V9.73117C14.005 9.6696 15.2088 9.46632 16.1588 9.26042C16.5636 9.17268 16.8207 8.77339 16.7329 8.36857C16.6452 7.96376 16.2459 7.70672 15.8411 7.79445C14.7597 8.02883 13.3718 8.25 12 8.25C10.6281 8.25 9.24022 8.02883 8.15882 7.79445C7.75401 7.70672 7.35472 7.96376 7.26698 8.36857C7.17924 8.77339 7.43629 9.17268 7.8411 9.26042C8.79115 9.46632 9.99494 9.6696 11.25 9.73117V19Z" fill="currentColor"></path>
            </svg>
          </span>
          ${s ? `
            <span class="fab-identity">
              ${s.persona ? g(s.persona, "fab-persona-avatar") : ""}
              <span class="fab-identity-env">
                <span class="fab-identity-dot" aria-hidden="true"></span>
                <span class="fab-identity-env-full">${r(s.environment)}</span>
                <span class="fab-identity-env-short">${r(s.environmentShort)}</span>
              </span>
              <span class="fab-identity-name">${r(s.persona?.name || s.instance)}</span>
            </span>
          ` : ""}
        </div>
        <div class="fab-expanded" aria-hidden="true">
          <div class="fab-counter ${t.requests > 0 ? "has-items" : ""}">
            <span class="counter-value">${t.requests}</span>
            <span class="counter-label">Req</span>
          </div>
          <div class="fab-counter ${t.sql > 0 ? "has-items" : ""} ${a ? "has-slow" : ""}">
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
    const t = d(this.snapshot), e = t.errors > 0, a = t.slowQueries > 0, s = this.shadow.querySelector(".fab-counter:nth-child(1)");
    if (s) {
      const n = s.querySelector(".counter-value");
      n && (n.textContent = String(t.requests)), s.classList.toggle("has-items", t.requests > 0);
    }
    const i = this.shadow.querySelector(".fab-counter:nth-child(2)");
    if (i) {
      const n = i.querySelector(".counter-value");
      n && (n.textContent = String(t.sql)), i.classList.toggle("has-items", t.sql > 0), i.classList.toggle("has-slow", a);
    }
    const o = this.shadow.querySelector(".fab-counter:nth-child(3)");
    if (o) {
      const n = o.querySelector(".counter-value");
      n && (n.textContent = String(t.logs)), o.classList.toggle("has-items", t.logs > 0), o.classList.toggle("has-errors", e);
    }
    const l = this.shadow.querySelector(".fab-counter:nth-child(4)");
    if (e && l) {
      const n = l.querySelector(".counter-value");
      n && (n.textContent = String(t.errors));
    }
    this.updateAccessibleLabel(t);
  }
  updateConnectionStatus() {
    const t = this.shadow.querySelector(".fab");
    t && t.setAttribute("data-status", this.connectionStatus), this.updateAccessibleLabel();
  }
  updateAccessibleLabel(t = d(this.snapshot)) {
    const e = this.shadow.querySelector(".fab");
    e && e.setAttribute("aria-label", this.accessibleLabel(p(this.snapshot, this.panels), t));
  }
  handleRegistryChange(t) {
    this.eventToPanel = b(), this.updateSubscriptions();
  }
  updateSubscriptions() {
    if (!this.stream) return;
    const t = /* @__PURE__ */ new Set();
    for (const e of this.panels) for (const a of w(e)) t.add(a);
    this.stream.subscribe(Array.from(t));
  }
  expand() {
    this.toolbarExpanded = !0, this.saveState(), this.render(), this.dispatchEvent(new CustomEvent("debug-expand", {
      detail: { expanded: !0 },
      bubbles: !0,
      composed: !0
    }));
  }
  attachEventListeners() {
    const t = this.shadow.querySelector(".fab");
    t && (t.addEventListener("click", () => this.expand()), t.addEventListener("keydown", (e) => {
      const a = e.key;
      a !== "Enter" && a !== " " && a !== "Spacebar" || (e.preventDefault(), this.expand());
    }), t.addEventListener("mouseenter", () => {
      this.isHovered = !0, t.classList.add("is-hovered");
    }), t.addEventListener("mouseleave", () => {
      this.isHovered = !1, t.classList.remove("is-hovered");
    }));
  }
};
customElements.get("debug-fab") || customElements.define("debug-fab", E);
function L(t) {
  return x(t).load;
}
var T = L(() => import("./debug-toolbar-DG7S5eSJ.js").then((t) => t.n)), u = class {
  constructor(t = {}) {
    this.fab = null, this.toolbar = null, this.initialized = !1, this.expanded = !1, this.toolbarMountGeneration = 0, this.options = {
      panels: [
        "requests",
        "sql",
        "logs",
        "routes",
        "config"
      ],
      slowThresholdMs: 50,
      container: document.body,
      ...t
    };
    const e = c(this.options.basePath);
    e && (this.options.basePath = e), !this.options.debugPath && e && (this.options.debugPath = `${e}/debug`);
  }
  init() {
    this.initialized || (this.initialized = !0, this.createFab(), this.wireFabEvents(), this.shouldRestoreExpanded() && this.expand());
  }
  destroy() {
    this.toolbarMountGeneration += 1, this.fab && (this.fab.remove(), this.fab = null), this.toolbar && (this.toolbar.remove(), this.toolbar = null), this.initialized = !1, this.expanded = !1;
  }
  expand() {
    this.fab && (this.expanded = !0, this.fab.setToolbarLoadError(!1), this.fab.setToolbarLoading(!0), this.fab.setToolbarExpanded(!0), this.ensureToolbar());
  }
  collapse() {
    this.fab && (this.expanded = !1, this.fab.setToolbarLoading(!1), this.fab.setToolbarExpanded(!1), this.toolbar?.setExpanded(!1));
  }
  toggle() {
    this.expanded ? this.collapse() : this.expand();
  }
  createFab() {
    this.fab = document.createElement("debug-fab"), this.options.debugPath && this.fab.setAttribute("debug-path", this.options.debugPath), this.options.basePath && this.fab.setAttribute("base-path", this.options.basePath), typeof this.options.liveTransportEnabled == "boolean" && this.fab.setAttribute("live-transport", this.options.liveTransportEnabled ? "true" : "false"), this.options.panels && this.fab.setAttribute("panels", this.options.panels.join(",")), this.options.container?.appendChild(this.fab);
  }
  createToolbar(t) {
    return this.toolbar = new t(), this.options.debugPath && this.toolbar.setAttribute("debug-path", this.options.debugPath), this.options.basePath && this.toolbar.setAttribute("base-path", this.options.basePath), typeof this.options.liveTransportEnabled == "boolean" && this.toolbar.setAttribute("live-transport", this.options.liveTransportEnabled ? "true" : "false"), this.toolbar.setAttribute("use-fab", "true"), this.options.panels && this.toolbar.setAttribute("panels", this.options.panels.join(",")), this.options.slowThresholdMs && this.toolbar.setAttribute("slow-threshold-ms", String(this.options.slowThresholdMs)), this.options.container?.appendChild(this.toolbar), this.toolbar;
  }
  wireFabEvents() {
    this.fab && (this.fab.addEventListener("debug-expand", ((t) => {
      t.detail?.expanded && this.expand();
    })), this.fab.addEventListener("debug-status-change", ((t) => {
      this.toolbar && t.detail?.status && this.toolbar.setConnectionStatus(t.detail.status);
    })), this.fab.addEventListener("debug-snapshot", ((t) => {
      this.toolbar && t.detail?.snapshot && this.toolbar.setSnapshot(t.detail.snapshot);
    })));
  }
  wireToolbarEvents(t) {
    t.addEventListener("debug-expand", ((e) => {
      !e.detail?.expanded && this.fab && (this.expanded = !1, this.fab.setToolbarExpanded(!1));
    })), t.addEventListener("debug-toolbar-ready", (() => {
      const e = this.fab?.getStream();
      e && (t.setStream(e), e.requestSnapshot());
      const a = this.fab?.getSnapshot();
      a && t.setSnapshot(a);
      const s = this.fab?.getConnectionStatus();
      s && t.setConnectionStatus(s);
    }));
  }
  async ensureToolbar() {
    if (this.toolbar) {
      this.expanded && (this.fab?.setToolbarLoading(!1), this.toolbar.setExpanded(!0));
      return;
    }
    const t = ++this.toolbarMountGeneration;
    try {
      const { DebugToolbar: e } = await T();
      if (!this.initialized || !this.expanded || t !== this.toolbarMountGeneration) return;
      const a = this.createToolbar(e);
      this.wireToolbarEvents(a);
      const s = this.fab?.getStream();
      s && a.setStream(s);
      const i = this.fab?.getSnapshot();
      i && a.setSnapshot(i);
      const o = this.fab?.getConnectionStatus();
      o && a.setConnectionStatus(o), this.fab?.setToolbarLoading(!1), a.setExpanded(!0);
    } catch {
      if (!this.initialized || t !== this.toolbarMountGeneration) return;
      this.expanded = !1, this.fab?.setToolbarLoadError(!0), this.fab?.setToolbarExpanded(!1), this.fab?.dispatchEvent(new CustomEvent("debug-toolbar-load-error", {
        detail: { retryable: !0 },
        bubbles: !0,
        composed: !0
      }));
    }
  }
  shouldRestoreExpanded() {
    try {
      return localStorage.getItem("debug-toolbar-expanded") === "true";
    } catch {
      return !1;
    }
  }
};
function P() {
  const t = window.DEBUG_CONFIG, e = document.querySelector("[data-debug-path]");
  let a = {};
  if (t ? a = {
    basePath: t.basePath,
    debugPath: t.debugPath,
    liveTransportEnabled: typeof t.liveTransportEnabled == "boolean" ? t.liveTransportEnabled : void 0,
    panels: t.panels,
    slowThresholdMs: t.slowThresholdMs
  } : e && (a = {
    basePath: e.getAttribute("data-base-path") || void 0,
    debugPath: e.getAttribute("data-debug-path") || void 0,
    panels: e.getAttribute("data-panels")?.split(","),
    slowThresholdMs: parseInt(e.getAttribute("data-slow-threshold-ms") || "50", 10)
  }), !a.debugPath && !a.basePath && !t && !e) return null;
  const s = new u(a);
  return s.init(), s;
}
window.DebugManager = u;
window.initDebugManager = P;
export {
  E as a,
  T as i,
  P as n,
  L as r,
  u as t
};

//# sourceMappingURL=debug-manager-CDofd6Ls.js.map