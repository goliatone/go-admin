import { escapeHTML as h } from "../shared/html.js";
import { httpRequest as $, readHTTPResponsePayload as w } from "../shared/transport/http-client.js";
import { onReady as E } from "../shared/dom-ready.js";
import { parseJSONValue as u } from "../shared/json-parse.js";
import { asRecord as c, coerceString as S } from "../shared/coercion.js";
var p = class extends Error {
  constructor(t, e = 500, i = "", n = {}) {
    super(t), this.name = "EntryNavigationAPIError", this.status = e, this.textCode = i, this.metadata = n;
  }
};
function _(t, e, i = t) {
  return e ? /^https?:\/\//i.test(e) || e.startsWith("/") ? e : `${t.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : i;
}
function N(t, e) {
  let i = t;
  return Object.entries(e).forEach(([n, a]) => {
    i = i.replace(`:${n}`, encodeURIComponent(String(a)));
  }), i;
}
function C(t, e = []) {
  const i = c(t), n = new Set(e.map((r) => String(r || "").trim()).filter(Boolean)), a = {};
  return Object.entries(i).forEach(([r, s]) => {
    const o = String(r || "").trim(), d = String(s || "").trim().toLowerCase();
    !o || ![
      "inherit",
      "show",
      "hide"
    ].includes(d) || n.size > 0 && !n.has(o) || (a[o] = d);
  }), a;
}
var P = class {
  constructor(t) {
    const e = t.basePath.replace(/\/+$/, "");
    this.config = {
      basePath: e,
      endpoint: String(t.endpoint || "").trim(),
      credentials: t.credentials ?? "same-origin",
      headers: t.headers ?? {}
    };
  }
  async patchEntryNavigation(t, e, i, n = []) {
    const a = this.config.endpoint || `${this.config.basePath}/content/:type/:id/navigation`, r = _(this.config.basePath, N(a, {
      type: t,
      id: e
    })), s = await $(r, {
      method: "PATCH",
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ _navigation: i })
    }), o = await w(s);
    if (!s.ok) {
      const g = c(o.payload), v = c(g.error), b = c(v.metadata ?? v.details), m = String(v.message || g.message || s.statusText || "Entry navigation request failed"), x = String(v.text_code || v.code || g.text_code || g.code || "");
      throw new p(m, s.status, x, b);
    }
    const d = c(o.payload), l = c(d.data ?? d);
    return {
      overrides: C(l._navigation, n),
      effective_visibility: c(l.effective_navigation_visibility)
    };
  }
};
function y(t, e, i = t) {
  return e ? /^https?:\/\//i.test(e) || e.startsWith("/") ? e : `${t.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : i;
}
function L(t, e) {
  const i = `${t.replace(/\/+$/, "")}/api`, n = y(t, e || i, i);
  return /\/api(\/|$)/.test(n) ? n : `${n.replace(/\/+$/, "")}/api`;
}
function f(t) {
  return S(t).toLowerCase() === "true";
}
var O = class {
  constructor(t, e, i, n, a, r) {
    this.onChange = (s) => {
      if (!this.config.editable) return;
      const o = s.target;
      if (!o.matches("[data-navigation-location]")) return;
      const d = String(o.dataset.navigationLocation || "").trim(), l = String(o.value || "").trim().toLowerCase();
      d && [
        "inherit",
        "show",
        "hide"
      ].includes(l) && (this.state.overrides[d] = l);
    }, this.onClick = async (s) => {
      s.target.closest("[data-navigation-save]") && await this.saveOverrides();
    }, this.root = t, this.client = e, this.contentType = i, this.recordID = n, this.config = a, this.state = r;
  }
  init() {
    this.root.addEventListener("change", this.onChange), this.root.addEventListener("click", this.onClick), this.render("");
  }
  destroy() {
    this.root.removeEventListener("change", this.onChange), this.root.removeEventListener("click", this.onClick);
  }
  async saveOverrides() {
    if (!this.config.enabled) {
      this.render("Navigation visibility is unavailable for this content type.");
      return;
    }
    if (!this.config.editable || !this.config.allow_instance_override) {
      this.render("Navigation visibility is read-only.");
      return;
    }
    try {
      const t = await this.client.patchEntryNavigation(this.contentType, this.recordID, this.state.overrides, this.config.eligible_locations);
      this.state = {
        overrides: { ...t.overrides },
        effective_visibility: { ...t.effective_visibility }
      }, this.render("Saved entry navigation visibility.");
    } catch (t) {
      if (t instanceof p) {
        const e = String(t.metadata.field || "").trim();
        if (e.startsWith("_navigation.")) {
          this.render(`Invalid location: ${e.replace("_navigation.", "")}`);
          return;
        }
      }
      this.render(t instanceof Error ? t.message : String(t));
    }
  }
  render(t) {
    const e = !this.config.editable || !this.config.allow_instance_override, i = this.config.eligible_locations.map((a) => {
      const r = this.state.overrides[a] || "inherit", s = this.state.effective_visibility[a] === !0;
      return `
          <div class="grid gap-2 md:grid-cols-[1fr,180px,120px] items-center">
            <div>
              <div class="text-sm font-medium text-gray-800">Show in ${h(a)}</div>
              <div class="text-xs text-gray-500">Tri-state: inherit, show, hide</div>
            </div>
            <select data-navigation-location="${h(a)}" class="rounded border border-gray-300 px-2 py-1.5 text-sm" ${e ? "disabled" : ""}>
              <option value="inherit" ${r === "inherit" ? "selected" : ""}>inherit</option>
              <option value="show" ${r === "show" ? "selected" : ""}>show</option>
              <option value="hide" ${r === "hide" ? "selected" : ""}>hide</option>
            </select>
            <span class="inline-flex justify-center rounded px-2 py-1 text-xs font-semibold ${s ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}">
              ${s ? "Visible" : "Hidden"}
            </span>
          </div>
        `;
    }).join(""), n = e ? "Navigation visibility is read-only for this entry." : "Overrides are applied per entry. Use inherit/show/hide to control each location.";
    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3" data-entry-navigation-panel>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Entry Navigation Visibility</h3>
          <p class="text-xs text-gray-500">${h(n)}</p>
        </div>
        <div class="space-y-2">${i || '<p class="text-sm text-gray-500">No eligible locations configured.</p>'}</div>
        ${t ? `<div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">${h(t)}</div>` : ""}
        <div class="flex items-center justify-end">
          <button type="button" data-navigation-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700" ${e ? "disabled" : ""}>
            Save Visibility
          </button>
        </div>
      </section>
    `;
  }
};
function I(t) {
  return {
    enabled: f(t.dataset.navigationEnabled),
    editable: f(t.dataset.navigationEditable),
    read_only: f(t.dataset.navigationReadOnly),
    endpoint: String(t.dataset.navigationEndpoint || "").trim(),
    eligible_locations: u(t.dataset.navigationEligibleLocations, []),
    default_locations: u(t.dataset.navigationDefaultLocations, []),
    allow_instance_override: f(t.dataset.navigationAllowInstanceOverride)
  };
}
function T(t) {
  return {
    overrides: u(t.dataset.navigationOverrides, {}),
    effective_visibility: u(t.dataset.navigationEffectiveVisibility, {})
  };
}
async function z(t) {
  const e = String(t.dataset.panelName || "").trim(), i = String(t.dataset.recordId || "").trim();
  if (!e || !i) return null;
  const n = y("/", String(t.dataset.basePath || "/admin"), ""), a = L(n, String(t.dataset.apiBasePath || `${n}/api`)), r = I(t), s = new P({
    basePath: a,
    endpoint: r.endpoint
  }), o = T(t), d = new O(t, s, e, i, r, o);
  return d.init(), d;
}
E(() => {
  document.querySelectorAll("[data-entry-navigation-root]").forEach((t) => {
    t.dataset.initialized !== "true" && z(t).then(() => {
      t.dataset.initialized = "true";
    }).catch((e) => {
      console.error("[entry-navigation] failed to initialize", e), t.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${e instanceof Error ? e.message : String(e)}</div>`;
    });
  });
});
export {
  P as a,
  T as i,
  z as n,
  p as o,
  I as r,
  C as s,
  O as t
};

//# sourceMappingURL=entry-navigation-CjKQoJNU.js.map