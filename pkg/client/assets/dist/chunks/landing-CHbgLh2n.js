import { _ as h, g as u } from "./lineage-contracts-Clh6Zaep.js";
import { a as f, c as g, m as o } from "./dom-helpers-CDdChTSn.js";
var m = class {
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
    const n = 200, s = 25;
    for (; e <= s; ) {
      const r = await this.listAgreements({
        page: e,
        per_page: n
      }), i = r.items || r.records || [];
      if (t.push(...i), i.length === 0 || t.length >= r.total) break;
      e += 1;
    }
    const a = {};
    for (const r of t) {
      const i = String(r?.status || "").trim().toLowerCase();
      i && (a[i] = (a[i] || 0) + 1);
    }
    const l = (a.sent || 0) + (a.in_progress || 0), p = l + (a.declined || 0);
    return {
      draft: a.draft || 0,
      sent: a.sent || 0,
      in_progress: a.in_progress || 0,
      completed: a.completed || 0,
      voided: a.voided || 0,
      declined: a.declined || 0,
      expired: a.expired || 0,
      pending: l,
      action_required: p
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
    return h(await this.post("/esign/google-drive/imports", t));
  }
  async getGoogleImportStatus(t) {
    return u(await this.get(`/esign/google-drive/imports/${t}`));
  }
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
      throw new S(e.code, e.message, e.details);
    }
    if (t.status !== 204)
      return t.json();
  }
}, S = class extends Error {
  constructor(t, e, n) {
    super(e), this.code = t, this.details = n, this.name = "ESignAPIError";
  }
}, c = null;
function _() {
  if (!c) throw new Error("ESign API client not initialized. Call setESignClient first.");
  return c;
}
function P(t) {
  c = t;
}
function w(t) {
  const e = new m(t);
  return P(e), e;
}
var d = class {
  constructor(t) {
    this.config = t, this.client = w({
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
    o('count="draft"', t.draft), o('count="pending"', t.pending), o('count="completed"', t.completed), o('count="action_required"', t.action_required), this.updateStatElement("draft", t.draft), this.updateStatElement("pending", t.pending), this.updateStatElement("completed", t.completed), this.updateStatElement("action_required", t.action_required);
  }
  updateStatElement(t, e) {
    const n = document.querySelector(`[data-esign-count="${t}"]`);
    n && (n.textContent = String(e));
  }
};
function C(t) {
  const e = t || f('[data-esign-page="admin.landing"], [data-esign-page="landing"]');
  if (!e) throw new Error('Landing page config not found. Add data-esign-page="landing" with config.');
  const n = new d(e);
  return g(() => n.init()), n;
}
function $(t, e) {
  const n = new d({
    basePath: t,
    apiBasePath: e || `${t}/api`
  });
  g(() => n.init());
}
typeof document < "u" && g(() => {
  const t = document.querySelector('[data-esign-page="admin.landing"], [data-esign-page="landing"]');
  if (t) {
    const e = document.getElementById("esign-page-config"), n = t.getAttribute("data-esign-config"), s = (() => {
      if (e?.textContent) try {
        return JSON.parse(e.textContent);
      } catch (a) {
        console.warn("Failed to parse landing page config script:", a);
      }
      if (n) try {
        return JSON.parse(n);
      } catch (a) {
        console.warn("Failed to parse landing page config attribute:", a);
      }
      return null;
    })();
    if (s) {
      const a = String(s.basePath || s.base_path || "/admin");
      new d({
        basePath: a,
        apiBasePath: String(s.apiBasePath || s.api_base_path || `${a}/api`)
      }).init();
    }
  }
});
export {
  S as a,
  P as c,
  m as i,
  $ as n,
  w as o,
  C as r,
  _ as s,
  d as t
};

//# sourceMappingURL=landing-CHbgLh2n.js.map