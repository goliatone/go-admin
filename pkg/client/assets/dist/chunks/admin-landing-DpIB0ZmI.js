import { g as u, h as f } from "./lineage-contracts-BR7-TggW.js";
import { u as c, i as m } from "./dom-helpers-cltCUiC5.js";
import { onReady as l } from "../shared/dom-ready.js";
class S {
  constructor(t) {
    this.basePath = t.basePath, this.apiBasePath = t.apiBasePath || `${t.basePath}/api`, this.defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...t.defaultHeaders
    };
  }
  // Agreement endpoints
  async listAgreements(t) {
    const e = new URLSearchParams();
    return t?.page && e.set("page", String(t.page)), t?.per_page && e.set("per_page", String(t.per_page)), t?.status && e.set("status", t.status), t?.search && e.set("search", t.search), this.get(
      `/panels/esign_agreements?${e.toString()}`
    );
  }
  async getAgreementStats() {
    const t = [];
    let e = 1;
    const n = 200, i = 25;
    for (; e <= i; ) {
      const r = await this.listAgreements({ page: e, per_page: n }), o = r.items || r.records || [];
      if (t.push(...o), o.length === 0 || t.length >= r.total)
        break;
      e += 1;
    }
    const s = {};
    for (const r of t) {
      const o = String(r?.status || "").trim().toLowerCase();
      o && (s[o] = (s[o] || 0) + 1);
    }
    const g = (s.sent || 0) + (s.in_progress || 0), h = g + (s.declined || 0);
    return {
      draft: s.draft || 0,
      sent: s.sent || 0,
      in_progress: s.in_progress || 0,
      completed: s.completed || 0,
      voided: s.voided || 0,
      declined: s.declined || 0,
      expired: s.expired || 0,
      pending: g,
      action_required: h
    };
  }
  // Document endpoints
  async listDocuments(t) {
    const e = new URLSearchParams();
    return t?.page && e.set("page", String(t.page)), t?.per_page && e.set("per_page", String(t.per_page)), t?.search && e.set("search", t.search), this.get(
      `/panels/esign_documents?${e.toString()}`
    );
  }
  // Google integration endpoints
  async getGoogleIntegrationStatus() {
    return this.get("/esign/integrations/google/status");
  }
  async startGoogleImport(t) {
    const e = await this.post("/esign/google-drive/imports", t);
    return u(e);
  }
  async getGoogleImportStatus(t) {
    const e = await this.get(`/esign/google-drive/imports/${t}`);
    return f(e);
  }
  // Generic HTTP methods
  async get(t) {
    const e = await fetch(`${this.apiBasePath}${t}`, {
      method: "GET",
      headers: this.defaultHeaders
    });
    return this.handleResponse(e);
  }
  async post(t, e) {
    const n = await fetch(`${this.apiBasePath}${t}`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: e ? JSON.stringify(e) : void 0
    });
    return this.handleResponse(n);
  }
  async put(t, e) {
    const n = await fetch(`${this.apiBasePath}${t}`, {
      method: "PUT",
      headers: this.defaultHeaders,
      body: JSON.stringify(e)
    });
    return this.handleResponse(n);
  }
  async delete(t) {
    const e = await fetch(`${this.apiBasePath}${t}`, {
      method: "DELETE",
      headers: this.defaultHeaders
    });
    return this.handleResponse(e);
  }
  async handleResponse(t) {
    if (!t.ok) {
      let e;
      try {
        e = (await t.json()).error || {
          code: `HTTP_${t.status}`,
          message: t.statusText
        };
      } catch {
        e = {
          code: `HTTP_${t.status}`,
          message: t.statusText
        };
      }
      throw new P(e.code, e.message, e.details);
    }
    if (t.status !== 204)
      return t.json();
  }
}
class P extends Error {
  constructor(t, e, n) {
    super(e), this.code = t, this.details = n, this.name = "ESignAPIError";
  }
}
let d = null;
function $() {
  if (!d)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return d;
}
function w(a) {
  d = a;
}
function y(a) {
  const t = new S(a);
  return w(t), t;
}
class p {
  constructor(t) {
    this.config = t, this.client = y({
      basePath: t.basePath,
      apiBasePath: t.apiBasePath
    });
  }
  /**
   * Initialize the landing page
   */
  async init() {
    try {
      await this.loadStats();
    } catch (t) {
      console.debug("Could not fetch agreement stats:", t);
    }
  }
  /**
   * Load and display agreement statistics
   */
  async loadStats() {
    const t = await this.client.getAgreementStats();
    c('count="draft"', t.draft), c('count="pending"', t.pending), c('count="completed"', t.completed), c('count="action_required"', t.action_required), this.updateStatElement("draft", t.draft), this.updateStatElement("pending", t.pending), this.updateStatElement("completed", t.completed), this.updateStatElement("action_required", t.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(t, e) {
    const n = document.querySelector(`[data-esign-count="${t}"]`);
    n && (n.textContent = String(e));
  }
}
function b(a) {
  const t = a || m(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!t)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const e = new p(t);
  return l(() => e.init()), e;
}
function A(a, t) {
  const e = {
    basePath: a,
    apiBasePath: t || `${a}/api`
  }, n = new p(e);
  l(() => n.init());
}
typeof document < "u" && l(() => {
  const a = document.querySelector(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (a) {
    const t = document.getElementById("esign-page-config"), e = a.getAttribute("data-esign-config"), n = (() => {
      if (t?.textContent)
        try {
          return JSON.parse(t.textContent);
        } catch (i) {
          console.warn("Failed to parse landing page config script:", i);
        }
      if (e)
        try {
          return JSON.parse(e);
        } catch (i) {
          console.warn("Failed to parse landing page config attribute:", i);
        }
      return null;
    })();
    if (n) {
      const i = String(n.basePath || n.base_path || "/admin"), s = String(
        n.apiBasePath || n.api_base_path || `${i}/api`
      );
      new p({ basePath: i, apiBasePath: s }).init();
    }
  }
});
export {
  S as E,
  p as L,
  P as a,
  A as b,
  y as c,
  $ as g,
  b as i,
  w as s
};
//# sourceMappingURL=admin-landing-DpIB0ZmI.js.map
