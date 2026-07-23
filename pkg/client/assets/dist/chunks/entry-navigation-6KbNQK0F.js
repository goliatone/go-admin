import { escapeHTML as g } from "../shared/html.js";
import { httpRequest as x, readHTTPResponsePayload as $ } from "../shared/transport/http-client.js";
import { onReady as w } from "../shared/dom-ready.js";
import { parseJSONValue as f } from "../shared/json-parse.js";
import { asRecord as l, coerceString as E } from "../shared/coercion.js";
var u = class extends Error {
  constructor(t, e = 500, i = "", n = {}) {
    super(t), this.name = "EntryNavigationAPIError", this.status = e, this.textCode = i, this.metadata = n;
  }
};
function S(t, e, i = t) {
  return e ? /^https?:\/\//i.test(e) || e.startsWith("/") ? e : `${t.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : i;
}
function _(t, e) {
  let i = t;
  return Object.entries(e).forEach(([n, s]) => {
    i = i.replace(`:${n}`, encodeURIComponent(String(s)));
  }), i;
}
function N(t, e = []) {
  const i = l(t), n = new Set(e.map((a) => String(a || "").trim()).filter(Boolean)), s = {};
  return Object.entries(i).forEach(([a, r]) => {
    const o = String(a || "").trim(), d = String(r || "").trim().toLowerCase();
    !o || ![
      "inherit",
      "show",
      "hide"
    ].includes(d) || n.size > 0 && !n.has(o) || (s[o] = d);
  }), s;
}
var C = class {
  constructor(t) {
    this.config = {
      basePath: t.basePath.replace(/\/+$/, ""),
      endpoint: String(t.endpoint || "").trim(),
      credentials: t.credentials ?? "same-origin",
      headers: t.headers ?? {}
    };
  }
  async patchEntryNavigation(t, e, i, n = []) {
    const s = this.config.endpoint || `${this.config.basePath}/content/:type/:id/navigation`, a = await x(S(this.config.basePath, _(s, {
      type: t,
      id: e
    })), {
      method: "PATCH",
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ _navigation: i })
    }), r = await $(a);
    if (!a.ok) {
      const c = l(r.payload), v = l(c.error), y = l(v.metadata ?? v.details), b = String(v.message || c.message || a.statusText || "Entry navigation request failed"), m = String(v.text_code || v.code || c.text_code || c.code || "");
      throw new u(b, a.status, m, y);
    }
    const o = l(r.payload), d = l(o.data ?? o);
    return {
      overrides: N(d._navigation, n),
      effective_visibility: l(d.effective_navigation_visibility)
    };
  }
};
function p(t, e, i = t) {
  return e ? /^https?:\/\//i.test(e) || e.startsWith("/") ? e : `${t.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : i;
}
function P(t, e) {
  const i = `${t.replace(/\/+$/, "")}/api`, n = p(t, e || i, i);
  return /\/api(\/|$)/.test(n) ? n : `${n.replace(/\/+$/, "")}/api`;
}
function h(t) {
  return E(t).toLowerCase() === "true";
}
var L = class {
  constructor(t, e, i, n, s, a) {
    this.onChange = (r) => {
      if (!this.config.editable) return;
      const o = r.target;
      if (!o.matches("[data-navigation-location]")) return;
      const d = String(o.dataset.navigationLocation || "").trim(), c = String(o.value || "").trim().toLowerCase();
      d && [
        "inherit",
        "show",
        "hide"
      ].includes(c) && (this.state.overrides[d] = c);
    }, this.onClick = async (r) => {
      r.target.closest("[data-navigation-save]") && await this.saveOverrides();
    }, this.root = t, this.client = e, this.contentType = i, this.recordID = n, this.config = s, this.state = a;
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
      if (t instanceof u) {
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
    const e = !this.config.editable || !this.config.allow_instance_override, i = this.config.eligible_locations.map((s) => {
      const a = this.state.overrides[s] || "inherit", r = this.state.effective_visibility[s] === !0;
      return `
          <div class="grid gap-2 md:grid-cols-[1fr,180px,120px] items-center">
            <div>
              <div class="text-sm font-medium text-gray-800">Show in ${g(s)}</div>
              <div class="text-xs text-gray-500">Tri-state: inherit, show, hide</div>
            </div>
            <select data-navigation-location="${g(s)}" class="rounded border border-gray-300 px-2 py-1.5 text-sm" ${e ? "disabled" : ""}>
              <option value="inherit" ${a === "inherit" ? "selected" : ""}>inherit</option>
              <option value="show" ${a === "show" ? "selected" : ""}>show</option>
              <option value="hide" ${a === "hide" ? "selected" : ""}>hide</option>
            </select>
            <span class="inline-flex justify-center rounded px-2 py-1 text-xs font-semibold ${r ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}">
              ${r ? "Visible" : "Hidden"}
            </span>
          </div>
        `;
    }).join(""), n = e ? "Navigation visibility is read-only for this entry." : "Overrides are applied per entry. Use inherit/show/hide to control each location.";
    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3" data-entry-navigation-panel>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Entry Navigation Visibility</h3>
          <p class="text-xs text-gray-500">${g(n)}</p>
        </div>
        <div class="space-y-2">${i || '<p class="text-sm text-gray-500">No eligible locations configured.</p>'}</div>
        ${t ? `<div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">${g(t)}</div>` : ""}
        <div class="flex items-center justify-end">
          <button type="button" data-navigation-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700" ${e ? "disabled" : ""}>
            Save Visibility
          </button>
        </div>
      </section>
    `;
  }
};
function O(t) {
  return {
    enabled: h(t.dataset.navigationEnabled),
    editable: h(t.dataset.navigationEditable),
    read_only: h(t.dataset.navigationReadOnly),
    endpoint: String(t.dataset.navigationEndpoint || "").trim(),
    eligible_locations: f(t.dataset.navigationEligibleLocations, []),
    default_locations: f(t.dataset.navigationDefaultLocations, []),
    allow_instance_override: h(t.dataset.navigationAllowInstanceOverride)
  };
}
function I(t) {
  return {
    overrides: f(t.dataset.navigationOverrides, {}),
    effective_visibility: f(t.dataset.navigationEffectiveVisibility, {})
  };
}
async function T(t) {
  const e = String(t.dataset.panelName || "").trim(), i = String(t.dataset.recordId || "").trim();
  if (!e || !i) return null;
  const n = p("/", String(t.dataset.basePath || "/admin"), ""), s = P(n, String(t.dataset.apiBasePath || `${n}/api`)), a = O(t), r = new L(t, new C({
    basePath: s,
    endpoint: a.endpoint
  }), e, i, a, I(t));
  return r.init(), r;
}
w(() => {
  document.querySelectorAll("[data-entry-navigation-root]").forEach((t) => {
    t.dataset.initialized !== "true" && T(t).then(() => {
      t.dataset.initialized = "true";
    }).catch((e) => {
      console.error("[entry-navigation] failed to initialize", e), t.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${e instanceof Error ? e.message : String(e)}</div>`;
    });
  });
});
export {
  C as a,
  I as i,
  T as n,
  u as o,
  O as r,
  N as s,
  L as t
};

//# sourceMappingURL=entry-navigation-6KbNQK0F.js.map