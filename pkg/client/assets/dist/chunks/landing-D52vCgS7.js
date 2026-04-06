import { httpRequest as d, readHTTPErrorResult as m, readHTTPJSON as P } from "../shared/transport/http-client.js";
import { onReady as l } from "../shared/dom-ready.js";
import { _ as S, g as y } from "./lineage-contracts-Ix6WeIZs.js";
import { h as c, o as h } from "./dom-helpers-PJrpTqcW.js";
var w = class {
  constructor(t) {
    this.basePath = t.basePath, this.apiBasePath = t.apiBasePath || `${t.basePath}/api`, this.defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...t.defaultHeaders
    };
  }
  async listAgreements(t) {
    const e = new URLSearchParams();
    return t?.page && e.set("page", String(t.page)), t?.per_page && e.set("per_page", String(t.per_page)), t?.status && e.set("status", t.status), t?.search && e.set("search", t.search), this.get(`/panels/esign_agreements?${e.toString()}`);
  }
  async getAgreementStats() {
    const t = [];
    let e = 1;
    const n = 200, r = 25;
    for (; e <= r; ) {
      const o = await this.listAgreements({
        page: e,
        per_page: n
      }), i = o.items || o.records || [];
      if (t.push(...i), i.length === 0 || t.length >= o.total) break;
      e += 1;
    }
    const a = {};
    for (const o of t) {
      const i = String(o?.status || "").trim().toLowerCase();
      i && (a[i] = (a[i] || 0) + 1);
    }
    const s = (a.sent || 0) + (a.in_progress || 0), f = s + (a.declined || 0);
    return {
      draft: a.draft || 0,
      sent: a.sent || 0,
      in_progress: a.in_progress || 0,
      completed: a.completed || 0,
      voided: a.voided || 0,
      declined: a.declined || 0,
      expired: a.expired || 0,
      pending: s,
      action_required: f
    };
  }
  async listDocuments(t) {
    const e = new URLSearchParams();
    return t?.page && e.set("page", String(t.page)), t?.per_page && e.set("per_page", String(t.per_page)), t?.search && e.set("search", t.search), this.get(`/panels/esign_documents?${e.toString()}`);
  }
  async getGoogleIntegrationStatus() {
    return this.get("/esign/integrations/google/status");
  }
  async startGoogleImport(t) {
    return S(await this.post("/esign/google-drive/imports", t));
  }
  async getGoogleImportStatus(t) {
    return y(await this.get(`/esign/google-drive/imports/${t}`));
  }
  async get(t) {
    const e = await d(`${this.apiBasePath}${t}`, {
      method: "GET",
      headers: this.defaultHeaders
    });
    return this.handleResponse(e);
  }
  async post(t, e) {
    const n = await d(`${this.apiBasePath}${t}`, {
      method: "POST",
      headers: this.defaultHeaders,
      body: e ? JSON.stringify(e) : void 0
    });
    return this.handleResponse(n);
  }
  async put(t, e) {
    const n = await d(`${this.apiBasePath}${t}`, {
      method: "PUT",
      headers: this.defaultHeaders,
      body: JSON.stringify(e)
    });
    return this.handleResponse(n);
  }
  async delete(t) {
    const e = await d(`${this.apiBasePath}${t}`, {
      method: "DELETE",
      headers: this.defaultHeaders
    });
    return this.handleResponse(e);
  }
  async handleResponse(t) {
    if (!t.ok) {
      const e = E(await m(t, t.statusText || `HTTP ${t.status}`, { appendStatusToFallback: !1 }), t);
      throw new _(e.code, e.message, e.details);
    }
    if (t.status !== 204)
      return P(t);
  }
};
function E(t, e) {
  const n = `HTTP_${e.status}`, r = t.message || e.statusText || n;
  if (!t.payload || typeof t.payload != "object") return {
    code: n,
    message: r
  };
  const a = t.payload;
  if (a.error && typeof a.error == "object") {
    const s = a.error;
    return {
      code: typeof s.code == "string" && s.code.trim() ? s.code.trim() : n,
      message: r,
      details: u(s.details) ? s.details : void 0
    };
  }
  return {
    code: typeof a.code == "string" && a.code.trim() ? a.code.trim() : n,
    message: r,
    details: u(a.details) ? a.details : void 0
  };
}
function u(t) {
  return !!t && typeof t == "object" && !Array.isArray(t);
}
var _ = class extends Error {
  constructor(t, e, n) {
    super(e), this.code = t, this.details = n, this.name = "ESignAPIError";
  }
}, g = null;
function q() {
  if (!g) throw new Error("ESign API client not initialized. Call setESignClient first.");
  return g;
}
function T(t) {
  g = t;
}
function $(t) {
  const e = new w(t);
  return T(e), e;
}
var p = class {
  constructor(t) {
    this.config = t, this.client = $({
      basePath: t.basePath,
      apiBasePath: t.apiBasePath
    });
  }
  async init() {
    try {
      await this.loadStats();
    } catch (t) {
      console.debug("Could not fetch agreement stats:", t);
    }
  }
  async loadStats() {
    const t = await this.client.getAgreementStats();
    c('count="draft"', t.draft), c('count="pending"', t.pending), c('count="completed"', t.completed), c('count="action_required"', t.action_required), this.updateStatElement("draft", t.draft), this.updateStatElement("pending", t.pending), this.updateStatElement("completed", t.completed), this.updateStatElement("action_required", t.action_required);
  }
  updateStatElement(t, e) {
    const n = document.querySelector(`[data-esign-count="${t}"]`);
    n && (n.textContent = String(e));
  }
};
function B(t) {
  const e = t || h('[data-esign-page="admin.landing"], [data-esign-page="landing"]');
  if (!e) throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const n = new p(e);
  return l(() => n.init()), n;
}
function H(t, e) {
  const n = new p({
    basePath: t,
    apiBasePath: e || `${t}/api`
  });
  l(() => n.init());
}
typeof document < "u" && l(() => {
  if (document.querySelector('[data-esign-page="admin.landing"], [data-esign-page="landing"]')) {
    const t = h('[data-esign-page="admin.landing"], [data-esign-page="landing"]');
    if (t) {
      const e = String(t.basePath || t.base_path || "/admin");
      new p({
        basePath: e,
        apiBasePath: String(t.apiBasePath || t.api_base_path || `${e}/api`)
      }).init();
    }
  }
});
export {
  _ as a,
  T as c,
  w as i,
  H as n,
  $ as o,
  B as r,
  q as s,
  p as t
};

//# sourceMappingURL=landing-D52vCgS7.js.map