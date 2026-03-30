import { g as m, h as P } from "./lineage-contracts-BR7-TggW.js";
import { readHTTPErrorResult as y, readHTTPJSON as S } from "../shared/transport/http-client.js";
import { i as u, u as d } from "./dom-helpers-Cd24RS2-.js";
import { onReady as g } from "../shared/dom-ready.js";
class w {
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
    const a = 200, i = 25;
    for (; e <= i; ) {
      const r = await this.listAgreements({ page: e, per_page: a }), o = r.items || r.records || [];
      if (t.push(...o), o.length === 0 || t.length >= r.total)
        break;
      e += 1;
    }
    const s = {};
    for (const r of t) {
      const o = String(r?.status || "").trim().toLowerCase();
      o && (s[o] = (s[o] || 0) + 1);
    }
    const p = (s.sent || 0) + (s.in_progress || 0), f = p + (s.declined || 0);
    return {
      draft: s.draft || 0,
      sent: s.sent || 0,
      in_progress: s.in_progress || 0,
      completed: s.completed || 0,
      voided: s.voided || 0,
      declined: s.declined || 0,
      expired: s.expired || 0,
      pending: p,
      action_required: f
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
    return m(e);
  }
  async getGoogleImportStatus(t) {
    const e = await this.get(`/esign/google-drive/imports/${t}`);
    return P(e);
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
    const a = await fetch(`${this.apiBasePath}${t}`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: e ? JSON.stringify(e) : void 0
    });
    return this.handleResponse(a);
  }
  async put(t, e) {
    const a = await fetch(`${this.apiBasePath}${t}`, {
      method: "PUT",
      headers: this.defaultHeaders,
      body: JSON.stringify(e)
    });
    return this.handleResponse(a);
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
      const e = t.statusText || `HTTP ${t.status}`, a = E(
        await y(t, e, { appendStatusToFallback: !1 }),
        t
      );
      throw new _(a.code, a.message, a.details);
    }
    if (t.status !== 204)
      return S(t);
  }
}
function E(n, t) {
  const e = `HTTP_${t.status}`, a = n.message || t.statusText || e;
  if (!n.payload || typeof n.payload != "object")
    return {
      code: e,
      message: a
    };
  const i = n.payload;
  if (i.error && typeof i.error == "object") {
    const s = i.error;
    return {
      code: typeof s.code == "string" && s.code.trim() ? s.code.trim() : e,
      message: a,
      details: h(s.details) ? s.details : void 0
    };
  }
  return {
    code: typeof i.code == "string" && i.code.trim() ? i.code.trim() : e,
    message: a,
    details: h(i.details) ? i.details : void 0
  };
}
function h(n) {
  return !!n && typeof n == "object" && !Array.isArray(n);
}
class _ extends Error {
  constructor(t, e, a) {
    super(e), this.code = t, this.details = a, this.name = "ESignAPIError";
  }
}
let c = null;
function B() {
  if (!c)
    throw new Error("ESign API client not initialized. Call setESignClient first.");
  return c;
}
function b(n) {
  c = n;
}
function T(n) {
  const t = new w(n);
  return b(t), t;
}
class l {
  constructor(t) {
    this.config = t, this.client = T({
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
    d('count="draft"', t.draft), d('count="pending"', t.pending), d('count="completed"', t.completed), d('count="action_required"', t.action_required), this.updateStatElement("draft", t.draft), this.updateStatElement("pending", t.pending), this.updateStatElement("completed", t.completed), this.updateStatElement("action_required", t.action_required);
  }
  /**
   * Update a stat element by key
   */
  updateStatElement(t, e) {
    const a = document.querySelector(`[data-esign-count="${t}"]`);
    a && (a.textContent = String(e));
  }
}
function H(n) {
  const t = n || u(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  );
  if (!t)
    throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const e = new l(t);
  return g(() => e.init()), e;
}
function q(n, t) {
  const e = {
    basePath: n,
    apiBasePath: t || `${n}/api`
  }, a = new l(e);
  g(() => a.init());
}
typeof document < "u" && g(() => {
  if (document.querySelector(
    '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
  )) {
    const t = u(
      '[data-esign-page="admin.landing"], [data-esign-page="landing"]'
    );
    if (t) {
      const e = String(t.basePath || t.base_path || "/admin"), a = String(
        t.apiBasePath || t.api_base_path || `${e}/api`
      );
      new l({ basePath: e, apiBasePath: a }).init();
    }
  }
});
export {
  w as E,
  l as L,
  _ as a,
  q as b,
  T as c,
  B as g,
  H as i,
  b as s
};
//# sourceMappingURL=admin-landing-Us8yS3xI.js.map
