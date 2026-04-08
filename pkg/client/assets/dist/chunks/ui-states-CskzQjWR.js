import { escapeAttribute as y, escapeHTML as i } from "../shared/html.js";
import { t as m } from "./icon-renderer-a2WAOpSe.js";
var h = {
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
function A(t = {}) {
  const { text: e = "Loading...", size: s = "md", containerClass: l = "" } = t, r = {
    sm: {
      spinner: "h-4 w-4",
      text: "text-xs",
      py: "py-4"
    },
    md: {
      spinner: "h-5 w-5",
      text: "text-sm",
      py: "py-8"
    },
    lg: {
      spinner: "h-8 w-8",
      text: "text-base",
      py: "py-16"
    }
  }[s];
  return `
    <div class="ui-state ui-state-loading flex items-center justify-center ${r.py} ${l}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <svg class="animate-spin ${r.spinner}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="${r.text}">${i(e)}</span>
      </div>
    </div>
  `;
}
function B(t = {}) {
  const { tag: e = "div", text: s = "Loading...", showSpinner: l = !0, containerClass: r = "", bodyClass: a = "flex items-center justify-center gap-3 py-8", spinnerClass: n = "w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin", textClass: c = "text-sm text-gray-500", role: o = "status", ariaLive: d, ariaLabel: x, attributes: p = {} } = t, g = $({
    role: o,
    "aria-busy": "true",
    "aria-live": d,
    "aria-label": x,
    ...p
  });
  return `
    <${e}${u(r)}${g}>
      <div${u(a)}>
        ${l ? `<div${u(n)} aria-hidden="true"></div>` : ""}
        <span${u(c)}>${i(s)}</span>
      </div>
    </${e}>
  `;
}
function F(t = {}) {
  const { tag: e = "div", containerClass: s = "", bodyClass: l = "flex flex-col items-center gap-4 text-center max-w-md", contentClass: r = "", iconHtml: a = "", title: n, titleTag: c = "p", titleClass: o = "text-lg font-medium text-gray-900", heading: d, headingTag: x = "h2", headingClass: p = "mt-2 text-xl font-semibold text-gray-900", message: g, messageClass: v = "text-sm text-gray-500 mt-1", metadata: f, metadataClass: w = "mt-2 text-xs uppercase tracking-[0.16em] text-gray-500", actionsHtml: C = "", role: S = "status", ariaLive: L, ariaLabel: T, attributes: N = {} } = t, j = $({
    role: S,
    "aria-live": L,
    "aria-label": T,
    ...N
  }), R = [
    n ? `<${c}${u(o)}>${i(n)}</${c}>` : "",
    d ? `<${x}${u(p)}>${i(d)}</${x}>` : "",
    g ? `<p${u(v)}>${i(g)}</p>` : "",
    f ? `<p${u(w)}>${i(f)}</p>` : ""
  ].filter(Boolean).join("");
  return `
    <${e}${u(s)}${j}>
      <div${u(l)}>
        ${a}
        <div${u(r)}>${R}</div>
        ${C}
      </div>
    </${e}>
  `;
}
function H(t = {}) {
  const e = h[t.type || "generic"], { icon: s = e.icon, iconClass: l = "text-gray-400", title: r = e.title, message: a = e.message, containerClass: n = "", action: c } = t;
  return `
    <div class="ui-state ui-state-empty flex items-center justify-center py-12 ${n}" role="status" aria-label="Empty">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${m(s, {
    size: "24px",
    extraClass: l
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${i(r)}</h3>
          <p class="text-sm text-gray-500 mt-1">${i(a)}</p>
        </div>
        ${c ? b(c) : ""}
      </div>
    </div>
  `;
}
function z(t = {}) {
  const { icon: e = "iconoir:search", iconClass: s = "text-gray-400", title: l = "No results found", query: r, filterCount: a = 0, containerClass: n = "", onReset: c } = t;
  let o = t.message;
  return o || (r && a > 0 ? o = `No items match "${r}" with ${a} filter${a > 1 ? "s" : ""} applied.` : r ? o = `No items match "${r}".` : a > 0 ? o = `No items match the ${a} filter${a > 1 ? "s" : ""} applied.` : o = "Try adjusting your search or filters."), `
    <div class="ui-state ui-state-no-results flex items-center justify-center py-12 ${n}" role="status" aria-label="No results">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
          ${m(e, {
    size: "24px",
    extraClass: s
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${i(l)}</h3>
          <p class="text-sm text-gray-500 mt-1">${i(o)}</p>
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
function E(t = {}) {
  const { icon: e = "iconoir:warning-triangle", iconClass: s = "text-red-500", title: l = "Something went wrong", error: r, compact: a = !1, containerClass: n = "", showRetry: c = !0, retryText: o = "Try again" } = t, d = t.message || r?.message || "An unexpected error occurred. Please try again.";
  return a ? `
      <div class="ui-state ui-state-error ui-state-error-compact p-4 ${n}" role="alert">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 text-red-500" aria-hidden="true">
            ${m(e, {
    size: "20px",
    extraClass: s
  })}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-red-800">${i(l)}</p>
            <p class="text-sm text-red-700 mt-1">${i(d)}</p>
          </div>
          ${c ? `
            <button type="button" class="ui-state-retry-btn flex-shrink-0 text-sm text-red-600 hover:text-red-700 font-medium">
              ${i(o)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : `
    <div class="ui-state ui-state-error flex items-center justify-center py-16 ${n}" role="alert">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
          ${m(e, {
    size: "24px",
    extraClass: s
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${i(l)}</h3>
          <p class="text-sm text-gray-500 mt-1">${i(d)}</p>
        </div>
        ${c ? `
          <button type="button" class="ui-state-retry-btn px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            ${i(o)}
          </button>
        ` : ""}
      </div>
    </div>
  `;
}
function k(t = {}) {
  const { icon: e = "iconoir:lock", iconClass: s = "text-amber-500", title: l = "Access Denied", resource: r, permission: a, containerClass: n = "", action: c } = t;
  let o = t.message;
  return o || (r && a ? o = `You need the "${a}" permission to view ${r}.` : r ? o = `You don't have permission to view ${r}.` : o = "You don't have permission to access this resource."), `
    <div class="ui-state ui-state-forbidden flex items-center justify-center py-16 ${n}" role="alert" aria-label="Access denied">
      <div class="flex flex-col items-center gap-4 text-center max-w-md">
        <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center" aria-hidden="true">
          ${m(e, {
    size: "24px",
    extraClass: s
  })}
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900">${i(l)}</h3>
          <p class="text-sm text-gray-500 mt-1">${i(o)}</p>
        </div>
        ${c ? b(c) : ""}
      </div>
    </div>
  `;
}
function P(t, e = {}) {
  const { text: s = "Loading...", containerClass: l = "" } = e;
  return `
    <tr class="ui-state ui-state-table-loading ${l}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-500" aria-busy="true">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm">${i(s)}</span>
        </div>
      </td>
    </tr>
  `;
}
function Y(t, e = {}) {
  const { icon: s = "iconoir:warning-triangle", iconClass: l = "text-red-500", title: r = "Failed to load data", error: a, containerClass: n = "", showRetry: c = !0, retryText: o = "Try again" } = e, d = e.message || a?.message || "An error occurred while loading.";
  return `
    <tr class="ui-state ui-state-table-error ${n}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="text-red-500 mb-2" aria-hidden="true">
          ${m(s, {
    size: "24px",
    extraClass: l
  })}
        </div>
        <p class="text-sm font-medium text-gray-900">${i(r)}</p>
        <p class="text-sm text-gray-500 mt-1">${i(d)}</p>
        ${c ? `
          <button type="button" class="ui-state-retry-btn mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            ${i(o)}
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
function I(t, e = {}) {
  const s = h[e.type || "generic"], { icon: l = s.icon, iconClass: r = "text-gray-400", title: a = s.title, message: n = s.message, containerClass: c = "" } = e;
  return `
    <tr class="ui-state ui-state-table-empty ${c}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${m(l, {
    size: "24px",
    extraClass: r
  })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${i(a)}</h3>
        <p class="text-sm text-gray-500 mt-1">${i(n)}</p>
      </td>
    </tr>
  `;
}
function D(t, e = {}) {
  const { icon: s = "iconoir:search", iconClass: l = "text-gray-400", title: r = "No results found", query: a, filterCount: n = 0, containerClass: c = "", onReset: o } = e;
  let d = e.message;
  return d || (a && n > 0 ? d = `No items match "${a}" with ${n} filter${n > 1 ? "s" : ""} applied.` : a ? d = `No items match "${a}".` : n > 0 ? d = `No items match the ${n} filter${n > 1 ? "s" : ""} applied.` : d = "Try adjusting your search or filters."), `
    <tr class="ui-state ui-state-table-no-results ${c}">
      <td colspan="${t}" class="px-4 py-12 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4" aria-hidden="true">
          ${m(s, {
    size: "24px",
    extraClass: l
  })}
        </div>
        <h3 class="text-lg font-medium text-gray-900">${i(r)}</h3>
        <p class="text-sm text-gray-500 mt-1">${i(d)}</p>
        ${o ? `
          <button type="button" class="ui-state-reset-btn mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Clear filters
          </button>
        ` : ""}
      </td>
    </tr>
  `;
}
var U = class {
  constructor(t) {
    this.currentState = "loading", this.container = t.container, this.config = t;
  }
  showLoading(t) {
    this.currentState = "loading", this.container.innerHTML = A(t);
  }
  showEmpty(t) {
    this.currentState = "empty", this.container.innerHTML = H(t);
  }
  showNoResults(t) {
    this.currentState = "no-results";
    const e = {
      ...t,
      onReset: t?.onReset || this.config.onReset
    };
    this.container.innerHTML = z(e), this.bindResetHandler();
  }
  showError(t) {
    this.currentState = "error";
    const e = {
      ...t,
      onRetry: t?.onRetry || this.config.onRetry
    };
    this.container.innerHTML = E(e), this.bindRetryHandler();
  }
  showForbidden(t) {
    this.currentState = "forbidden", this.container.innerHTML = k(t);
  }
  showContent() {
    this.currentState = "content";
  }
  getState() {
    return this.currentState;
  }
  isLoading() {
    return this.currentState === "loading";
  }
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
};
function b(t) {
  return `
    <button type="button" class="ui-state-action-btn px-4 py-2 text-sm font-medium rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${{
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  }[t.variant || "primary"]}">
      ${i(t.text)}
    </button>
  `;
}
function u(t) {
  return t ? ` class="${y(t)}"` : "";
}
function $(t) {
  return Object.entries(t).flatMap(([e, s]) => s == null || s === !1 ? [] : s === !0 ? [` ${e}="true"`] : [` ${e}="${y(s)}"`]).join("");
}
export {
  A as a,
  F as c,
  P as d,
  D as f,
  k as i,
  I as l,
  H as n,
  z as o,
  E as r,
  B as s,
  U as t,
  Y as u
};

//# sourceMappingURL=ui-states-CskzQjWR.js.map