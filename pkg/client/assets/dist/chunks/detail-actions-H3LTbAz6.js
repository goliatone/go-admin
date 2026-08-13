import { escapeHTML as i } from "../shared/html.js";
import { t as x } from "./toast-manager-CEA-8d8Y.js";
import { readHTTPJSONValue as A } from "../shared/transport/http-client.js";
import { formatStructuredErrorForDisplay as y, getStructuredActionError as L, isHandledActionError as D } from "../toast/error-helpers.js";
import { N as k } from "./translation-status-vocabulary-NKPjpKF9.js";
import { t as H } from "./schema-actions-C8gcchAr.js";
function S() {
  const e = globalThis.window;
  return e?.toastManager ? e.toastManager : new x();
}
async function I(e) {
  return A(e, null);
}
function p(e, t) {
  return (typeof e.id == "string" && e.id.trim() ? e.id.trim() : `${e.label}-${t + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `action-${t + 1}`;
}
function P(e, t) {
  const r = "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  if (t) return `${r} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 focus:ring-gray-300`;
  switch ((e.variant || "secondary").toLowerCase()) {
    case "primary":
      return `${r} border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    case "danger":
      return `${r} border-red-600 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case "success":
      return `${r} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
    case "warning":
      return `${r} border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`;
    default:
      return `${r} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`;
  }
}
function C(e, t) {
  const r = "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors";
  if (t) return `${r} cursor-not-allowed text-gray-400`;
  switch ((e.variant || "secondary").toLowerCase()) {
    case "danger":
      return `${r} text-red-600 hover:bg-red-50`;
    case "success":
      return `${r} text-emerald-600 hover:bg-emerald-50`;
    case "warning":
      return `${r} text-amber-600 hover:bg-amber-50`;
    default:
      return `${r} text-gray-700 hover:bg-gray-50`;
  }
}
function $(e) {
  return {
    edit: "iconoir-edit-pencil",
    delete: "iconoir-trash",
    publish: "iconoir-cloud-upload",
    unpublish: "iconoir-cloud-download",
    submit_for_approval: "iconoir-send",
    approve: "iconoir-check-circle",
    reject: "iconoir-xmark-circle",
    archive: "iconoir-archive",
    restore: "iconoir-refresh",
    duplicate: "iconoir-copy",
    add_translation: "iconoir-translate",
    create_translation: "iconoir-translate"
  }[String(e.id || "").toLowerCase().replace(/[^a-z_]/g, "_")] || "";
}
function E(e) {
  const t = e.findIndex((n) => String(n.id || "").toLowerCase() === "edit");
  if (t >= 0) return {
    primary: e[t],
    rest: [...e.slice(0, t), ...e.slice(t + 1)]
  };
  const r = e.findIndex((n) => (n.variant || "").toLowerCase() === "primary");
  return r >= 0 ? {
    primary: e[r],
    rest: [...e.slice(0, r), ...e.slice(r + 1)]
  } : e.length === 1 ? {
    primary: e[0],
    rest: []
  } : {
    primary: null,
    rest: e
  };
}
function B(e) {
  if (e.length === 0) return "";
  const { primary: t, rest: r } = E(e);
  let n = "";
  if (t) {
    const a = t.disabled === !0, o = p(t, 0), c = $(t), s = a ? (t.disabledReason || "Action unavailable").trim() : "", h = s ? `detail-action-reason-${o}` : "", d = h ? `aria-describedby="${h}"` : "", m = s ? `${t.label} unavailable: ${s}` : t.label, u = a && t.remediation?.href && t.remediation?.label ? `
          <a
            href="${i(t.remediation.href.trim())}"
            class="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-detail-action-remediation="${i(o)}"
          >
            ${i(t.remediation.label.trim())}
          </a>
        ` : "", b = s ? `title="${i(s)}"` : "", f = a && s ? `<span
           class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
           title="${i(s)}"
           aria-hidden="true"
         >?</span>
         <span class="sr-only" data-detail-action-reason="${i(o)}" id="detail-action-reason-${i(o)}">${i(s)}</span>` : "";
    n = `
      <div data-detail-action-card="${i(o)}" class="flex items-center gap-2">
        <button
          type="button"
          class="${P(t, a)}"
          data-detail-action-button="${i(o)}"
          data-detail-action-name="${i(t.id || t.label)}"
          data-disabled="${a}"
          aria-disabled="${a ? "true" : "false"}"
          aria-label="${i(m)}"
          ${d}
          ${b}
        >
          ${c ? `<i class="${c}"></i>` : ""}
          ${i(t.label)}
          ${f}
        </button>
        ${a && u ? u : ""}
      </div>
    `;
  }
  let l = "";
  return r.length > 0 && (l = `
      <div class="relative" data-detail-actions-dropdown>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          data-detail-actions-dropdown-trigger
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="More actions"
        >
          <i class="iconoir-more-horiz text-lg"></i>
        </button>
        <div
          class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 hidden"
          data-detail-actions-dropdown-menu
          role="menu"
          aria-orientation="vertical"
        >
          ${r.map((a, o) => {
    const c = a.disabled === !0, s = p(a, t ? o + 1 : o), h = $(a), d = c ? (a.disabledReason || "Action unavailable").trim() : "", m = d ? `detail-action-reason-${s}` : "", u = m ? `aria-describedby="${m}"` : "", b = d ? `${a.label} unavailable: ${d}` : a.label, f = a.variant === "danger" && o > 0 ? '<div class="my-1 border-t border-gray-100"></div>' : "", w = d ? `title="${i(d)}"` : "", g = c && a.remediation?.href && a.remediation?.label ? `
            <a
              href="${i(a.remediation.href.trim())}"
              class="block px-4 pb-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              data-detail-action-remediation="${i(s)}"
            >
              ${i(a.remediation.label.trim())}
            </a>
          ` : "", v = c && d ? `<span
             class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-xs cursor-help"
             title="${i(d)}"
             aria-hidden="true"
           >?</span>
           <span class="sr-only" data-detail-action-reason="${i(s)}" id="detail-action-reason-${i(s)}">${i(d)}</span>` : "";
    return `
        ${f}
        <div data-detail-action-card="${i(s)}" class="space-y-1">
          <button
            type="button"
            class="${C(a, c)}"
            data-detail-action-button="${i(s)}"
            data-detail-action-name="${i(a.id || a.label)}"
            data-disabled="${c}"
            aria-disabled="${c ? "true" : "false"}"
            aria-label="${i(b)}"
            ${u}
            ${w}
          >
            ${h ? `<i class="${h} text-base"></i>` : '<span class="w-4"></span>'}
            <span class="flex-1">${i(a.label)}</span>
            ${v}
            ${c ? '<i class="iconoir-lock text-gray-400 text-xs ml-1"></i>' : ""}
          </button>
          ${c && g ? g : ""}
        </div>
      `;
  }).join("")}
        </div>
      </div>
    `), `
    <div class="flex items-start gap-2" data-panel-detail-actions-list="true" aria-label="Detail actions" role="toolbar">
      ${n}
      ${l}
    </div>
  `;
}
var j = class {
  constructor(e) {
    this.actions = [], this.record = null, this.documentClickHandler = null, this.documentKeydownHandler = null, this.mount = e.mount, this.notifier = e.notifier || S(), this.fetchImpl = e.fetchImpl || fetch.bind(globalThis);
  }
  async init() {
    this.mount && (this.mount.setAttribute("aria-busy", "true"), await this.refresh());
  }
  async refresh() {
    this.cleanupDocumentListeners();
    const e = await this.fetchDetailPayload();
    if (!e) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const t = e.data && typeof e.data == "object" ? e.data : null, r = Array.isArray(e.schema?.actions) ? e.schema.actions : [];
    if (!t || r.length === 0) {
      this.mount.innerHTML = "", this.mount.setAttribute("aria-busy", "false");
      return;
    }
    const n = this.panelName(), l = this.recordID(), a = this.panelBasePath(), o = `${this.apiBasePath()}/panels/${encodeURIComponent(n)}`, c = new URLSearchParams(window.location.search), s = c.get("locale") || void 0, h = c.get("channel") || c.get("environment") || void 0, d = new H({
      apiEndpoint: o,
      actionBasePath: a,
      panelName: n,
      locale: s,
      channel: h,
      actionContext: "detail",
      onActionSuccess: async (m) => {
        if (m === "delete") {
          const u = this.backHref();
          if (u) {
            window.location.assign(u);
            return;
          }
          window.location.assign(a);
          return;
        }
        await this.refresh();
      },
      onActionError: (m, u) => {
        this.notifier.error(y(u, `${m} failed`));
      },
      reconcileOnDomainFailure: async () => {
        await this.refresh();
      }
    });
    this.record = t, this.actions = d.buildRowActions(t, r), this.mount.innerHTML = B(this.actions), this.mount.setAttribute("aria-busy", "false"), this.attachListeners(l), this.attachDropdownListeners();
  }
  async fetchDetailPayload() {
    const e = this.detailEndpoint();
    if (!e) return null;
    const t = await this.fetchImpl(e, { headers: { Accept: "application/json" } });
    if (!t.ok)
      return this.notifier.error(`Actions unavailable (${t.status})`), null;
    const r = await I(t);
    return !r || typeof r != "object" ? null : k(r);
  }
  attachListeners(e) {
    this.actions.forEach((t, r) => {
      const n = p(t, r), l = this.mount.querySelector(`[data-detail-action-button="${n}"]`);
      l && l.addEventListener("click", async (a) => {
        if (a.preventDefault(), !(l.getAttribute("aria-disabled") === "true" || l.dataset.disabled === "true"))
          try {
            await t.action({
              ...this.record || {},
              id: e
            });
          } catch (o) {
            if (!D(o)) {
              const c = L(o), s = c ? y(c, `${t.label} failed`) : o instanceof Error ? o.message : `${t.label} failed`;
              this.notifier.error(s);
            }
          }
      });
    });
  }
  cleanupDocumentListeners() {
    this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null), this.documentKeydownHandler && (document.removeEventListener("keydown", this.documentKeydownHandler), this.documentKeydownHandler = null);
  }
  attachDropdownListeners() {
    const e = this.mount.querySelector("[data-detail-actions-dropdown]");
    if (!e) return;
    const t = e.querySelector("[data-detail-actions-dropdown-trigger]"), r = e.querySelector("[data-detail-actions-dropdown-menu]");
    !t || !r || (t.addEventListener("click", (n) => {
      n.preventDefault(), n.stopPropagation(), r.classList.contains("hidden") ? this.openDropdown(t, r) : this.closeDropdown(t, r);
    }), this.documentClickHandler = (n) => {
      e.contains(n.target) || this.closeDropdown(t, r);
    }, document.addEventListener("click", this.documentClickHandler), this.documentKeydownHandler = (n) => {
      n.key === "Escape" && !r.classList.contains("hidden") && (this.closeDropdown(t, r), t.focus());
    }, document.addEventListener("keydown", this.documentKeydownHandler), r.querySelectorAll("[data-detail-action-button]").forEach((n) => {
      n.addEventListener("click", (l) => {
        if (n.getAttribute("aria-disabled") === "true" || n.dataset.disabled === "true") {
          l.preventDefault();
          return;
        }
        this.closeDropdown(t, r);
      });
    }));
  }
  openDropdown(e, t) {
    t.classList.remove("hidden"), e.setAttribute("aria-expanded", "true");
  }
  closeDropdown(e, t) {
    t.classList.add("hidden"), e.setAttribute("aria-expanded", "false");
  }
  detailEndpoint() {
    const e = this.panelName(), t = this.recordID();
    if (!e || !t) return "";
    const r = new URLSearchParams(window.location.search), n = r.get("locale"), l = r.get("channel") || r.get("environment"), a = `${this.apiBasePath()}/panels/${encodeURIComponent(e)}/${encodeURIComponent(t)}`;
    if (!n && !l) return a;
    const o = new URLSearchParams();
    return n && o.set("locale", n), l && o.set("channel", l), `${a}?${o.toString()}`;
  }
  apiBasePath() {
    return String(this.mount.dataset.apiBasePath || "").trim().replace(/\/$/, "");
  }
  panelBasePath() {
    const e = String(this.mount.dataset.panelBasePath || "").trim();
    return e ? e.replace(/\/$/, "") : `${String(this.mount.dataset.basePath || "").trim().replace(/\/$/, "")}/${this.panelName()}`.replace(/\/{2,}/g, "/");
  }
  backHref() {
    return String(this.mount.dataset.backHref || "").trim();
  }
  panelName() {
    return String(this.mount.dataset.panel || "").trim();
  }
  recordID() {
    return String(this.mount.dataset.recordId || "").trim();
  }
};
async function U(e = document) {
  const t = Array.from(e.querySelectorAll("[data-panel-detail-actions]")), r = [];
  for (const n of t) {
    const l = new j({ mount: n });
    r.push(l), await l.init();
  }
  return r;
}
export {
  U as n,
  B as r,
  j as t
};

//# sourceMappingURL=detail-actions-H3LTbAz6.js.map