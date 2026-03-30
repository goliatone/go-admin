import { r as m } from "./icon-renderer-FL11lsYV.js";
import { escapeHTML as a, escapeAttribute as y } from "../shared/html.js";
const h = {
  providers: {
    icon: "iconoir:plug",
    title: "No providers available",
    message: "No service providers are currently configured."
  },
  connections: {
    icon: "iconoir:link",
    title: "No connections found",
    message: "Connect a service to get started."
  },
  installations: {
    icon: "iconoir:download",
    title: "No installations found",
    message: "Install a service to get started."
  },
  subscriptions: {
    icon: "iconoir:bell-off",
    title: "No subscriptions found",
    message: "Subscriptions will appear here when created."
  },
  sync: {
    icon: "iconoir:sync",
    title: "No sync jobs found",
    message: "Sync jobs will appear here when syncs are triggered."
  },
  activity: {
    icon: "iconoir:activity",
    title: "No activity found",
    message: "Activity entries will appear here as actions occur."
  },
  generic: {
    icon: "iconoir:folder-empty",
    title: "No data",
    message: "Nothing to display."
  }
};
function k(e = {}) {
  const { text: t = "Loading...", size: s = "md", containerClass: i = "" } = e, r = {
    sm: { spinner: "h-4 w-4", text: "text-xs", py: "py-4" },
    md: { spinner: "h-5 w-5", text: "text-sm", py: "py-8" },
    lg: { spinner: "h-8 w-8", text: "text-base", py: "py-16" }
  }[s];
  return `
    <div class="ui-state ui-state-loading flex items-center justify-center ${r.py} ${i}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <svg class="animate-spin ${r.spinner}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="${r.text}">${a(t)}</span>
      </div>
    </div>
  `;
}
function I(e = {}) {
  const {
    tag: t = "div",
    text: s = "Loading...",
    showSpinner: i = !0,
    containerClass: n = "",
    bodyClass: r = "flex items-center justify-center gap-3 py-8",
    spinnerClass: o = "w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin",
    textClass: c = "text-sm text-gray-500",
    role: l = "status",
    ariaLive: d,
    ariaLabel: x,
    attributes: p = {}
  } = e, g = $({
    role: l,
    "aria-busy": "true",
    "aria-live": d,
    "aria-label": x,
    ...p
  });
  return `
    <${t}${u(n)}${g}>
      <div${u(r)}>
        ${i ? `<div${u(o)} aria-hidden="true"></div>` : ""}
        <span${u(c)}>${a(s)}</span>
      </div>
    </${t}>
  `;
}
function U(e = {}) {
  const {
    tag: t = "div",
    containerClass: s = "",
    bodyClass: i = "flex flex-col items-center gap-4 text-center max-w-md",
    contentClass: n = "",
    iconHtml: r = "",
    title: o,
    titleTag: c = "p",
    titleClass: l = "text-lg font-medium text-gray-900",
    heading: d,
    headingTag: x = "h2",
    headingClass: p = "mt-2 text-xl font-semibold text-gray-900",
    message: g,
    messageClass: v = "text-sm text-gray-500 mt-1",
    metadata: f,
    metadataClass: w = "mt-2 text-xs uppercase tracking-[0.16em] text-gray-500",
    actionsHtml: C = "",
    role: S = "status",
    ariaLive: L,
    ariaLabel: T,
    attributes: N = {}
  } = e, j = $({
    role: S,
    "aria-live": L,
    "aria-label": T,
    ...N
  }), H = o ? `<${c}${u(l)}>${a(o)}</${c}>` : "", R = d ? `<${x}${u(p)}>${a(d)}</${x}>` : "", z = g ? `<p${u(v)}>${a(g)}</p>` : "", A = f ? `<p${u(w)}>${a(f)}</p>` : "", E = [H, R, z, A].filter(Boolean).join("");
  return `
    <${t}${u(s)}${j}>
      <div${u(i)}>
        ${r}
        <div${u(n)}>${E}</div>
        ${C}
      </div>
    </${t}>
  `;
}
function M(e = {}) {
  const t = h[e.type || "generic"], {
    icon: s = t.icon,
    iconClass: i = "text-gray-400",
    title: n = t.title,
    message: r = t.message,
    containerClass: o = "",
    action: c
  } = e;
  return `
    <div class="ui-state ui-state-empty flex items-center justify-center py-12 ${o}" role="status" aria-label="Empty">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${m(s, { size: "24px", extraClass: i })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${a(n)}</h3>
          <p class="text-sm text-gray-500 mt-1">${a(r)}</p>
        </div>
        ${c ? b(c) : ""}
      </div>
    </div>
  `;
}
function B(e = {}) {
  const {
    icon: t = "iconoir:search",
    iconClass: s = "text-gray-400",
    title: i = "No results found",
    query: n,
    filterCount: r = 0,
    containerClass: o = "",
    onReset: c
  } = e;
  let l = e.message;
  return l || (n && r > 0 ? l = `No items match "${n}" with ${r} filter${r > 1 ? "s" : ""} applied.` : n ? l = `No items match "${n}".` : r > 0 ? l = `No items match the ${r} filter${r > 1 ? "s" : ""} applied.` : l = "Try adjusting your search or filters."), `
    <div class="ui-state ui-state-no-results flex items-center justify-center py-12 ${o}" role="status" aria-label="No results">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${m(t, { size: "24px", extraClass: s })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${a(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${a(l)}</p>
        </div>
        ${c ? `
          <button type="button" class="ui-state-reset-btn px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
            Clear filters
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function q(e = {}) {
  const {
    icon: t = "iconoir:warning-triangle",
    iconClass: s = "text-red-500",
    title: i = "Something went wrong",
    error: n,
    compact: r = !1,
    containerClass: o = "",
    showRetry: c = !0,
    retryText: l = "Try again"
  } = e, d = e.message || n?.message || "An unexpected error occurred. Please try again.";
  return r ? `
      <div class="ui-state ui-state-error ui-state-error-compact p-4 ${o}" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-red-500" aria-hidden="true">
            ${m(t, { size: "20px", extraClass: s })}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800">${a(i)}</p>
            <p class="text-sm text-red-700 mt-1">${a(d)}</p>
          </div>
          ${c ? `
            <button type="button" class="ui-state-retry-btn flex-shrink-0 text-sm text-red-600 hover:text-red-700 font-medium">
              ${a(l)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : `
    <div class="ui-state ui-state-error flex items-center justify-center py-16 ${o}" role="alert">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
          ${m(t, { size: "24px", extraClass: s })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${a(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${a(d)}</p>
        </div>
        ${c ? `
          <button type="button" class="ui-state-retry-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            ${a(l)}
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function F(e = {}) {
  const {
    icon: t = "iconoir:lock",
    iconClass: s = "text-amber-500",
    title: i = "Access Denied",
    resource: n,
    permission: r,
    containerClass: o = "",
    action: c
  } = e;
  let l = e.message;
  return l || (n && r ? l = `You need the "${r}" permission to view ${n}.` : n ? l = `You don't have permission to view ${n}.` : l = "You don't have permission to access this resource."), `
    <div class="ui-state ui-state-forbidden flex items-center justify-center py-16 ${o}" role="alert" aria-label="Access denied">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
          ${m(t, { size: "24px", extraClass: s })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${a(i)}</h3>
          <p class="text-sm text-gray-500 mt-1">${a(l)}</p>
        </div>
        ${c ? b(c) : ""}
      </div>
    </div>
  `;
}
function D(e, t = {}) {
  const { text: s = "Loading...", containerClass: i = "" } = t;
  return `
    <tr class="ui-state ui-state-table-loading ${i}">
      <td colspan="${e}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-500" aria-busy="true">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">${a(s)}</span>
        </div>
      </td>
    </tr>
  `;
}
function V(e, t = {}) {
  const {
    icon: s = "iconoir:warning-triangle",
    iconClass: i = "text-red-500",
    title: n = "Failed to load data",
    error: r,
    containerClass: o = "",
    showRetry: c = !0,
    retryText: l = "Try again"
  } = t, d = t.message || r?.message || "An error occurred while loading.";
  return `
    <tr class="ui-state ui-state-table-error ${o}">
      <td colspan="${e}" class="px-4 py-12 text-center">
        <div class="text-red-500 mb-2" aria-hidden="true">
          ${m(s, { size: "24px", extraClass: i })}
        </div>
        <p class="text-sm font-medium text-gray-900">${a(n)}</p>
        <p class="text-sm text-gray-500 mt-1">${a(d)}</p>
        ${c ? `
          <button type="button" class="ui-state-retry-btn mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            ${a(l)}
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
function _(e, t = {}) {
  const s = h[t.type || "generic"], {
    icon: i = s.icon,
    iconClass: n = "text-gray-400",
    title: r = s.title,
    message: o = s.message,
    containerClass: c = ""
  } = t;
  return `
    <tr class="ui-state ui-state-table-empty ${c}">
      <td colspan="${e}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${m(i, { size: "24px", extraClass: n })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${a(r)}</h3>
        <p class="text-sm text-gray-500 mt-1">${a(o)}</p>
      </td>
    </tr>
  `;
}
function O(e, t = {}) {
  const {
    icon: s = "iconoir:search",
    iconClass: i = "text-gray-400",
    title: n = "No results found",
    query: r,
    filterCount: o = 0,
    containerClass: c = "",
    onReset: l
  } = t;
  let d = t.message;
  return d || (r && o > 0 ? d = `No items match "${r}" with ${o} filter${o > 1 ? "s" : ""} applied.` : r ? d = `No items match "${r}".` : o > 0 ? d = `No items match the ${o} filter${o > 1 ? "s" : ""} applied.` : d = "Try adjusting your search or filters."), `
    <tr class="ui-state ui-state-table-no-results ${c}">
      <td colspan="${e}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${m(s, { size: "24px", extraClass: i })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${a(n)}</h3>
        <p class="text-sm text-gray-500 mt-1">${a(d)}</p>
        ${l ? `
          <button type="button" class="ui-state-reset-btn mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
class G {
  constructor(t) {
    this.currentState = "loading", this.container = t.container, this.config = t;
  }
  /**
   * Show loading state
   */
  showLoading(t) {
    this.currentState = "loading", this.container.innerHTML = k(t);
  }
  /**
   * Show empty state (no data)
   */
  showEmpty(t) {
    this.currentState = "empty", this.container.innerHTML = M(t);
  }
  /**
   * Show no-results state (filters returned nothing)
   */
  showNoResults(t) {
    this.currentState = "no-results";
    const s = { ...t, onReset: t?.onReset || this.config.onReset };
    this.container.innerHTML = B(s), this.bindResetHandler();
  }
  /**
   * Show error state
   */
  showError(t) {
    this.currentState = "error";
    const s = { ...t, onRetry: t?.onRetry || this.config.onRetry };
    this.container.innerHTML = q(s), this.bindRetryHandler();
  }
  /**
   * Show forbidden state
   */
  showForbidden(t) {
    this.currentState = "forbidden", this.container.innerHTML = F(t);
  }
  /**
   * Show content (clears any state and allows content rendering)
   */
  showContent() {
    this.currentState = "content";
  }
  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }
  /**
   * Check if currently showing loading
   */
  isLoading() {
    return this.currentState === "loading";
  }
  /**
   * Check if showing error
   */
  hasError() {
    return this.currentState === "error";
  }
  bindRetryHandler() {
    this.container.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => {
      this.config.onRetry?.();
    });
  }
  bindResetHandler() {
    this.container.querySelector(".ui-state-reset-btn")?.addEventListener("click", () => {
      this.config.onReset?.();
    });
  }
}
function b(e) {
  return `
    <button type="button" class="ui-state-action-btn px-4 py-2 text-sm font-medium rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${{
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  }[e.variant || "primary"]}">
      ${a(e.text)}
    </button>
  `;
}
function u(e) {
  return e ? ` class="${y(e)}"` : "";
}
function $(e) {
  return Object.entries(e).flatMap(([s, i]) => i == null || i === !1 ? [] : i === !0 ? [` ${s}="true"`] : [` ${s}="${y(i)}"`]).join("");
}
export {
  G as U,
  I as a,
  k as b,
  q as c,
  F as d,
  M as e,
  O as f,
  V as g,
  D as h,
  B as i,
  _ as j,
  U as r
};
//# sourceMappingURL=ui-states-B4-pLIrz.js.map
