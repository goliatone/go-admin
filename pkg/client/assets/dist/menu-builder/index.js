import { createLogger as q } from "../shared/logger.js";
import { escapeHTML as c } from "../shared/html.js";
import { httpRequest as O } from "../shared/transport/http-client.js";
import { onReady as k } from "../shared/dom-ready.js";
import { asRecord as f, coerceInteger as E, coerceString as l, coerceStringArray as w } from "../shared/coercion.js";
import { normalizeMenuBuilderAPIBasePath as F, normalizeMenuBuilderPath as C, normalizeMenuBuilderRoute as z } from "./shared/path-helpers.js";
import { n as fe, t as ge } from "../chunks/entry-navigation-CDCMhcIB.js";
var U = /* @__PURE__ */ new Set([
  "inherit",
  "show",
  "hide"
]), V = /* @__PURE__ */ new Set(["draft", "published"]), G = /* @__PURE__ */ new Set([
  "content",
  "route",
  "module",
  "external"
]), J = /* @__PURE__ */ new Set([
  "full",
  "top_level_limit",
  "max_depth",
  "include_ids",
  "exclude_ids",
  "composed"
]);
function g(t, e) {
  const r = f(t);
  if (!t || Array.isArray(t) || r !== t) throw new Error(`${e} must be an object`);
  return r;
}
function $(t) {
  return l(t).toLowerCase() === "true";
}
function A(t) {
  const e = l(t, "draft").toLowerCase();
  return V.has(e) ? e : "draft";
}
function W(t) {
  const e = l(t, "full").toLowerCase();
  return J.has(e) ? e : "full";
}
function H(t) {
  const e = g(t, "menu contracts"), r = g(e.endpoints, "menu contracts endpoints"), a = g(e.error_codes ?? e.errorCode ?? {}, "menu contracts error codes"), i = {};
  Object.entries(r).forEach(([n, o]) => {
    const d = l(o);
    d && (i[n] = d);
  });
  const s = {};
  return Object.entries(a).forEach(([n, o]) => {
    const d = l(o);
    d && (s[n] = d);
  }), {
    endpoints: i,
    error_codes: s,
    content_navigation: K(e.content_navigation)
  };
}
function K(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return;
  const e = t, r = e.endpoints, a = e.entry_navigation_overrides, i = e.validation, s = {};
  r && typeof r == "object" && !Array.isArray(r) && Object.entries(r).forEach(([o, d]) => {
    const u = l(d);
    u && (s[o] = u);
  });
  const n = {};
  if (Object.keys(s).length > 0 && (n.endpoints = s), a && typeof a == "object" && !Array.isArray(a)) {
    const o = a;
    n.entry_navigation_overrides = {
      value_enum: w(o.value_enum),
      write_endpoint: l(o.write_endpoint)
    };
  }
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const o = i, d = o.invalid_location, u = o.invalid_value;
    n.validation = {
      invalid_location: d && typeof d == "object" && !Array.isArray(d) ? {
        field_pattern: l(d.field_pattern),
        rule: l(d.rule),
        hint: l(d.hint)
      } : void 0,
      invalid_value: u && typeof u == "object" && !Array.isArray(u) ? { allowed_values: w(u.allowed_values) } : void 0
    };
  }
  return n;
}
function y(t) {
  const e = g(t, "menu record"), r = l(e.id, l(e.code)), a = l(e.code, r);
  if (!r || !a) throw new Error("menu record requires id and code");
  return {
    id: r,
    code: a,
    name: l(e.name, a),
    description: l(e.description),
    status: A(e.status),
    locale: l(e.locale),
    family_id: l(e.family_id),
    archived: $(e.archived),
    created_at: l(e.created_at),
    updated_at: l(e.updated_at),
    published_at: l(e.published_at),
    archived_at: l(e.archived_at)
  };
}
function I(t) {
  const e = g(t, "menu binding record"), r = l(e.location), a = l(e.menu_code);
  if (!r || !a) throw new Error("menu binding requires location and menu_code");
  return {
    id: l(e.id),
    location: r,
    menu_code: a,
    view_profile_code: l(e.view_profile_code),
    locale: l(e.locale),
    priority: E(e.priority, 0),
    status: A(e.status),
    created_at: l(e.created_at),
    updated_at: l(e.updated_at),
    published_at: l(e.published_at)
  };
}
function x(t) {
  const e = g(t, "menu view profile"), r = l(e.code);
  if (!r) throw new Error("menu view profile requires code");
  return {
    code: r,
    name: l(e.name, r),
    mode: W(e.mode),
    max_top_level: E(e.max_top_level, 0) || void 0,
    max_depth: E(e.max_depth, 0) || void 0,
    include_item_ids: w(e.include_item_ids),
    exclude_item_ids: w(e.exclude_item_ids),
    status: A(e.status),
    created_at: l(e.created_at),
    updated_at: l(e.updated_at),
    published_at: l(e.published_at)
  };
}
function Q(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return;
  const e = t, r = l(e.type).toLowerCase();
  if (G.has(r))
    return {
      type: r,
      id: l(e.id),
      slug: l(e.slug),
      content_type: l(e.content_type),
      path: l(e.path),
      route: l(e.route),
      module: l(e.module),
      url: l(e.url)
    };
}
function _(t, e = "menu item") {
  const r = g(t, e), a = l(r.id);
  if (!a) throw new Error(`${e} requires id`);
  const i = r.children ?? r.Items, s = Array.isArray(i) ? i.map((n, o) => _(n, `${e}.children[${o}]`)) : [];
  return {
    id: a,
    label: l(r.label, a),
    type: l(r.type),
    parent_id: l(r.parent_id ?? r.parentID ?? r.ParentID),
    target: Q(r.target ?? r.Target),
    children: s
  };
}
function X(t) {
  const e = g(t, "menu preview response"), r = g(e.menu ?? e.data, "menu preview menu"), a = r.items ?? r.Items, i = Array.isArray(a) ? a.map((s, n) => _(s, `preview.menu.items[${n}]`)) : [];
  return {
    menu: {
      code: l(r.code ?? r.Code),
      items: i
    },
    simulation: e.simulation && typeof e.simulation == "object" && !Array.isArray(e.simulation) ? {
      requested_id: l(e.simulation.requested_id),
      location: l(e.simulation.location),
      locale: l(e.simulation.locale),
      view_profile: l(e.simulation.view_profile),
      include_drafts: $(e.simulation.include_drafts),
      preview_token_present: $(e.simulation.preview_token_present),
      binding: e.simulation.binding && typeof e.simulation.binding == "object" ? I(e.simulation.binding) : void 0,
      profile: e.simulation.profile && typeof e.simulation.profile == "object" ? x(e.simulation.profile) : void 0
    } : void 0
  };
}
function Y(t, e = []) {
  if (!t || typeof t != "object" || Array.isArray(t)) return {};
  const r = t, a = new Set(e.map((s) => s.trim()).filter(Boolean)), i = {};
  return Object.entries(r).forEach(([s, n]) => {
    const o = s.trim();
    if (!o) return;
    if (a.size > 0 && !a.has(o)) throw new Error(`invalid navigation location: ${o}`);
    const d = l(n).toLowerCase();
    if (!U.has(d)) throw new Error(`invalid navigation value for ${o}: ${String(n)}`);
    i[o] = d;
  }), i;
}
var P = class extends Error {
  constructor(t, e = 500, r = "", a = {}) {
    super(t), this.name = "MenuBuilderAPIError", this.status = e, this.textCode = r, this.metadata = a;
  }
};
function T(t, e) {
  let r = t;
  return Object.entries(e).forEach(([a, i]) => {
    r = r.replace(`:${a}`, encodeURIComponent(String(i)));
  }), r;
}
var Z = class {
  constructor(t) {
    this.contracts = null;
    const e = t.basePath.replace(/\/+$/, "");
    this.config = {
      basePath: e,
      contractsPath: t.contractsPath || `${e}/menu-contracts`,
      credentials: t.credentials ?? "same-origin",
      headers: t.headers ?? {}
    };
  }
  async loadContracts(t = !1) {
    if (this.contracts && !t) return this.contracts;
    const e = await this.fetchJSON(this.config.contractsPath, { method: "GET" }), r = f(e), a = H(r.contracts ?? r);
    return this.contracts = a, a;
  }
  async listMenus() {
    const t = await this.fetchFromEndpoint("menus", { method: "GET" });
    return (Array.isArray(t.menus) ? t.menus : Array.isArray(t.data) ? t.data : []).map((e) => y(e));
  }
  async getMenu(t) {
    const e = await this.fetchFromEndpoint("menus.id", {
      method: "GET",
      params: { id: t }
    });
    return {
      menu: y(e.menu ?? e.data ?? e),
      items: (Array.isArray(e.items) ? e.items : []).map((r, a) => _(r, `menu.items[${a}]`))
    };
  }
  async createMenu(t) {
    const e = await this.fetchFromEndpoint("menus", {
      method: "POST",
      body: t
    });
    return y(e.menu ?? e.data ?? e);
  }
  async updateMenu(t, e) {
    const r = await this.fetchFromEndpoint("menus.id", {
      method: "PUT",
      params: { id: t },
      body: e
    });
    return y(r.menu ?? r.data ?? r);
  }
  async publishMenu(t, e) {
    const r = e ? "menus.publish" : "menus.unpublish", a = await this.fetchFromEndpoint(r, {
      method: "POST",
      params: { id: t },
      body: {}
    });
    return y(a.menu ?? a.data ?? a);
  }
  async cloneMenu(t, e) {
    const r = await this.fetchFromEndpoint("menus.clone", {
      method: "POST",
      params: { id: t },
      body: { code: e }
    });
    return y(r.menu ?? r.data ?? r);
  }
  async archiveMenu(t, e) {
    const r = await this.fetchFromEndpoint("menus.archive", {
      method: "POST",
      params: { id: t },
      body: { archived: e }
    });
    return y(r.menu ?? r.data ?? r);
  }
  async upsertMenuItems(t, e) {
    const r = await this.fetchFromEndpoint("menus.items", {
      method: "PUT",
      params: { id: t },
      body: { items: e }
    }), a = f(r.menu ?? r.data ?? {});
    return (Array.isArray(a.items) ? a.items : Array.isArray(a.Items) ? a.Items : []).map((i, s) => _(i, `menu.items[${s}]`));
  }
  async previewMenu(t) {
    const e = new URLSearchParams();
    t.location && e.set("location", t.location), t.locale && e.set("locale", t.locale), t.view_profile && e.set("view_profile", t.view_profile), t.include_drafts && e.set("include_drafts", "true"), t.preview_token && e.set("preview_token", t.preview_token);
    const r = await this.fetchFromEndpoint("menus.preview", {
      method: "GET",
      params: { id: t.menuId },
      query: e
    });
    return X(r);
  }
  async listBindings() {
    const t = await this.fetchFromEndpoint("menu.bindings", { method: "GET" });
    return (Array.isArray(t.bindings) ? t.bindings : Array.isArray(t.data) ? t.data : []).map((e) => I(e));
  }
  async upsertBinding(t, e) {
    const r = await this.fetchFromEndpoint("menu.bindings.location", {
      method: "PUT",
      params: { location: t },
      body: e
    });
    return I(r.binding ?? r.data ?? r);
  }
  async listProfiles() {
    const t = await this.fetchFromEndpoint("menu.view_profiles", { method: "GET" });
    return (Array.isArray(t.view_profiles) ? t.view_profiles : Array.isArray(t.profiles) ? t.profiles : Array.isArray(t.data) ? t.data : []).map((e) => x(e));
  }
  async createProfile(t) {
    const e = await this.fetchFromEndpoint("menu.view_profiles", {
      method: "POST",
      body: t
    });
    return x(e.view_profile ?? e.profile ?? e.data ?? e);
  }
  async updateProfile(t, e) {
    const r = await this.fetchFromEndpoint("menu.view_profiles.code", {
      method: "PUT",
      params: { code: t },
      body: e
    });
    return x(r.view_profile ?? r.profile ?? r.data ?? r);
  }
  async deleteProfile(t) {
    await this.fetchFromEndpoint("menu.view_profiles.code", {
      method: "DELETE",
      params: { code: t }
    });
  }
  async publishProfile(t, e) {
    const r = await this.fetchFromEndpoint("menu.view_profiles.publish", {
      method: "POST",
      params: { code: t },
      body: { publish: e }
    });
    return x(r.view_profile ?? r.profile ?? r.data ?? r);
  }
  async patchEntryNavigation(t, e, r, a = []) {
    let i = `${this.config.basePath}/content/:type/:id/navigation`;
    try {
      i = (await this.loadContracts()).content_navigation?.endpoints?.["content.navigation"] || i;
    } catch {
    }
    const s = C(this.config.basePath, T(i, {
      type: t,
      id: e
    })), n = await this.fetchJSON(s, {
      method: "PATCH",
      body: JSON.stringify({ _navigation: r }),
      headers: { "Content-Type": "application/json" }
    }), o = f(n), d = f(o.data ?? o);
    return {
      overrides: Y(d._navigation, a),
      effective_visibility: f(d.effective_navigation_visibility)
    };
  }
  async fetchFromEndpoint(t, e) {
    const r = (await this.loadContracts()).endpoints[t];
    if (!r) throw new P(`missing endpoint contract for ${t}`, 500, "CONTRACT_MISSING");
    const a = C(this.config.basePath, T(r, e.params ?? {})), i = String(e.query ?? "").trim(), s = i ? `?${i}` : "", n = await this.fetchJSON(`${a}${s}`, {
      method: e.method,
      body: e.body ? JSON.stringify(e.body) : void 0,
      headers: e.body ? { "Content-Type": "application/json" } : void 0
    });
    return f(n);
  }
  async fetchJSON(t, e) {
    const r = await O(t, {
      ...e,
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        ...e.headers ?? {}
      }
    });
    let a = null;
    try {
      a = await r.json();
    } catch {
      a = null;
    }
    if (!r.ok) {
      const i = f(a?.error ?? a), s = String(i.message ?? (r.statusText || "request failed")).trim() || "request failed", n = String(i.text_code ?? "").trim(), o = f(i.metadata);
      throw new P(s, r.status, n, o);
    }
    return a;
  }
}, ee = {
  loading: !1,
  error: "",
  contracts: null,
  menus: [],
  selected_menu_id: "",
  selected_menu: null,
  draft_items: [],
  bindings: [],
  profiles: [],
  validation_issues: [],
  preview_result: null
};
function h(t) {
  return t.map((e) => ({
    ...e,
    target: e.target ? { ...e.target } : void 0,
    children: h(e.children || [])
  }));
}
function B(t, e = /* @__PURE__ */ new Set()) {
  return t.forEach((r) => {
    e.add(r.id), B(r.children || [], e);
  }), e;
}
function M(t, e) {
  const r = [];
  let a = null;
  return t.forEach((i) => {
    if (i.id === e) {
      a = {
        ...i,
        target: i.target ? { ...i.target } : void 0,
        children: h(i.children || [])
      };
      return;
    }
    const s = M(i.children || [], e);
    if (s.node && !a) {
      a = s.node, r.push({
        ...i,
        children: s.next
      });
      return;
    }
    r.push({
      ...i,
      children: h(i.children || [])
    });
  }), {
    node: a,
    next: r
  };
}
function j(t, e, r) {
  const a = [];
  let i = !1;
  return t.forEach((s) => {
    !i && s.id === e && (a.push(r), i = !0);
    const n = j(s.children || [], e, r);
    if (n.inserted) {
      i = !0, a.push({
        ...s,
        children: n.items
      });
      return;
    }
    a.push({
      ...s,
      children: h(s.children || [])
    });
  }), {
    inserted: i,
    items: a
  };
}
function R(t, e, r) {
  const a = [];
  let i = !1;
  return t.forEach((s) => {
    const n = R(s.children || [], e, r);
    if (n.inserted) {
      i = !0, a.push({
        ...s,
        children: n.items
      });
      return;
    }
    a.push({
      ...s,
      children: h(s.children || [])
    }), !i && s.id === e && (a.push(r), i = !0);
  }), {
    inserted: i,
    items: a
  };
}
function L(t, e, r) {
  let a = !1;
  const i = t.map((s) => {
    if (s.id === e)
      return a = !0, {
        ...s,
        children: [...h(s.children || []), r]
      };
    const n = L(s.children || [], e, r);
    return n.inserted ? (a = !0, {
      ...s,
      children: n.items
    }) : {
      ...s,
      children: h(s.children || [])
    };
  });
  return {
    inserted: a,
    items: i
  };
}
function te(t) {
  const e = t.target;
  return !e || !e.type ? "" : e.type === "external" ? `external:${String(e.url || "").trim().toLowerCase()}` : e.type === "route" || e.type === "module" ? `${e.type}:${String(e.path || e.route || e.module || "").trim().toLowerCase()}` : `content:${String(e.content_type || "").trim().toLowerCase()}:${String(e.slug || e.id || "").trim().toLowerCase()}`;
}
function re(t) {
  const e = t.target;
  if (!e) return {
    url: "",
    valid: !1,
    message: "Target required"
  };
  switch (e.type) {
    case "external": {
      const r = String(e.url || "").trim(), a = /^https?:\/\//i.test(r);
      return {
        url: r,
        valid: a,
        message: a ? "Resolved external URL" : "External URL must start with http:// or https://"
      };
    }
    case "route": {
      const r = String(e.path || e.route || "").trim();
      return {
        url: r,
        valid: r.startsWith("/"),
        message: r.startsWith("/") ? "Resolved route path" : "Route path must start with /"
      };
    }
    case "module": {
      const r = String(e.path || e.module || "").trim();
      return {
        url: r,
        valid: r.startsWith("/"),
        message: r.startsWith("/") ? "Resolved module path" : "Module path must start with /"
      };
    }
    case "content": {
      const r = String(e.content_type || "").trim(), a = String(e.slug || e.id || "").trim(), i = r.length > 0 && a.length > 0;
      return {
        url: i ? `/${r}/${a}` : "",
        valid: i,
        message: i ? "Resolved content URL" : "Content target requires content type and slug/id"
      };
    }
    default:
      return {
        url: "",
        valid: !1,
        message: "Unsupported target type"
      };
  }
}
var ie = class extends EventTarget {
  constructor(t) {
    super(), this.client = t, this.state = { ...ee };
  }
  snapshot() {
    return {
      ...this.state,
      menus: [...this.state.menus],
      draft_items: h(this.state.draft_items),
      bindings: [...this.state.bindings],
      profiles: [...this.state.profiles],
      validation_issues: [...this.state.validation_issues],
      preview_result: this.state.preview_result ? {
        ...this.state.preview_result,
        menu: {
          ...this.state.preview_result.menu,
          items: h(this.state.preview_result.menu.items)
        }
      } : null
    };
  }
  async initialize() {
    this.setState({
      loading: !0,
      error: ""
    });
    try {
      const t = await this.client.loadContracts(), [e, r, a] = await Promise.all([
        this.client.listMenus(),
        this.client.listBindings(),
        this.client.listProfiles()
      ]), i = e[0]?.id || "";
      this.setState({
        contracts: t,
        menus: e,
        bindings: r,
        profiles: a,
        selected_menu_id: i,
        loading: !1
      }), i && await this.selectMenu(i);
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t.message : String(t)
      });
    }
  }
  async refreshMenus() {
    const t = await this.client.listMenus(), e = this.state.selected_menu_id, r = t.some((a) => a.id === e);
    this.setState({
      menus: t,
      selected_menu_id: r ? e : t[0]?.id || ""
    }), !r && t[0]?.id && await this.selectMenu(t[0].id);
  }
  async selectMenu(t) {
    const e = t.trim();
    if (!e) {
      this.setState({
        selected_menu_id: "",
        selected_menu: null,
        draft_items: [],
        validation_issues: [],
        preview_result: null
      });
      return;
    }
    this.setState({
      selected_menu_id: e,
      selected_menu: null,
      draft_items: [],
      validation_issues: [],
      preview_result: null,
      loading: !0,
      error: ""
    });
    try {
      const r = await this.client.getMenu(e);
      this.setState({
        selected_menu_id: r.menu.id,
        selected_menu: r.menu,
        draft_items: h(r.items),
        validation_issues: this.validateItems(r.items),
        loading: !1
      });
    } catch (r) {
      this.setState({
        loading: !1,
        error: r instanceof Error ? r.message : String(r)
      });
    }
  }
  async createMenu(t) {
    const e = await this.client.createMenu(t);
    await this.refreshMenus(), await this.selectMenu(e.id);
  }
  async updateMenu(t) {
    if (!this.state.selected_menu_id) return;
    const e = await this.client.updateMenu(this.state.selected_menu_id, t);
    this.setState({ selected_menu: e }), await this.refreshMenus();
  }
  async setPublishState(t) {
    if (!this.state.selected_menu_id) return;
    const e = await this.client.publishMenu(this.state.selected_menu_id, t);
    this.setState({ selected_menu: e }), await this.refreshMenus();
  }
  async cloneSelectedMenu(t) {
    if (!this.state.selected_menu_id) return;
    const e = await this.client.cloneMenu(this.state.selected_menu_id, t);
    await this.refreshMenus(), await this.selectMenu(e.id);
  }
  async archiveSelectedMenu(t) {
    if (!this.state.selected_menu_id) return;
    const e = await this.client.archiveMenu(this.state.selected_menu_id, t);
    this.setState({ selected_menu: e }), await this.refreshMenus();
  }
  setDraftItems(t) {
    const e = this.validateItems(t);
    this.setState({
      draft_items: h(t),
      validation_issues: e
    });
  }
  addRootItem() {
    const t = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: "New Item",
      target: {
        type: "route",
        path: "/"
      },
      children: []
    };
    this.setDraftItems([...h(this.state.draft_items), t]);
  }
  updateItem(t, e) {
    const r = this.mapItems(this.state.draft_items, t, (a) => ({
      ...a,
      ...e,
      target: e.target ? { ...e.target } : a.target
    }));
    this.setDraftItems(r);
  }
  removeItem(t) {
    const e = M(this.state.draft_items, t);
    this.setDraftItems(e.next);
  }
  addChild(t) {
    const e = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: "New Child",
      target: {
        type: "route",
        path: "/"
      },
      children: []
    }, r = L(this.state.draft_items, t, e);
    r.inserted && this.setDraftItems(r.items);
  }
  moveItem(t, e, r) {
    if (!t || !e || t === e) return;
    const a = B(this.state.draft_items);
    if (!a.has(t) || !a.has(e)) return;
    const i = M(this.state.draft_items, t);
    if (!i.node) return;
    let s;
    switch (r) {
      case "before":
        s = j(i.next, e, i.node);
        break;
      case "after":
        s = R(i.next, e, i.node);
        break;
      default:
        s = L(i.next, e, i.node);
    }
    s.inserted && this.setDraftItems(s.items);
  }
  async saveItems() {
    if (!this.state.selected_menu_id) return;
    const t = this.validateItems(this.state.draft_items);
    if (this.setState({ validation_issues: t }), t.length > 0) throw new Error("Fix menu validation issues before saving");
    const e = await this.client.upsertMenuItems(this.state.selected_menu_id, this.state.draft_items);
    this.setState({
      draft_items: h(e),
      validation_issues: []
    });
  }
  async refreshBindings() {
    const t = await this.client.listBindings();
    this.setState({ bindings: t });
  }
  async upsertBinding(t, e) {
    await this.client.upsertBinding(t, e), await this.refreshBindings();
  }
  async refreshProfiles() {
    const t = await this.client.listProfiles();
    this.setState({ profiles: t });
  }
  async createProfile(t) {
    await this.client.createProfile(t), await this.refreshProfiles();
  }
  async updateProfile(t, e) {
    await this.client.updateProfile(t, e), await this.refreshProfiles();
  }
  async deleteProfile(t) {
    await this.client.deleteProfile(t), await this.refreshProfiles();
  }
  async publishProfile(t, e) {
    await this.client.publishProfile(t, e), await this.refreshProfiles();
  }
  async preview(t) {
    const e = await this.client.previewMenu(t);
    this.setState({ preview_result: e });
  }
  async patchEntryNavigation(t, e, r, a) {
    return this.client.patchEntryNavigation(t, e, r, a);
  }
  resolveTarget(t) {
    return re(t);
  }
  mapItems(t, e, r) {
    return t.map((a) => a.id === e ? r({
      ...a,
      children: h(a.children || [])
    }) : {
      ...a,
      children: this.mapItems(a.children || [], e, r)
    });
  }
  validateItems(t) {
    const e = [], r = /* @__PURE__ */ new Map(), a = (i, s, n) => {
      i.label.trim() || e.push({
        code: "label_required",
        message: `Menu item ${i.id} requires a label`,
        item_id: i.id
      }), n.has(i.id) && e.push({
        code: "cycle",
        message: `Cycle detected at menu item ${i.id}`,
        item_id: i.id
      }), s > 8 && e.push({
        code: "depth",
        message: `Menu depth exceeds max level at ${i.id}`,
        item_id: i.id
      });
      const o = this.resolveTarget(i);
      o.valid || e.push({
        code: "invalid_target",
        message: `${i.label || i.id}: ${o.message}`,
        item_id: i.id
      });
      const d = te(i);
      if (d) {
        const p = r.get(d);
        p && p !== i.id ? e.push({
          code: "duplicate_target",
          message: `Duplicate target detected between ${p} and ${i.id}`,
          item_id: i.id
        }) : r.set(d, i.id);
      }
      const u = new Set(n);
      u.add(i.id), (i.children || []).forEach((p) => a(p, s + 1, u));
    };
    return t.forEach((i) => a(i, 1, /* @__PURE__ */ new Set())), e;
  }
  setState(t) {
    const e = Object.prototype.hasOwnProperty.call(t, "selected_menu_id") && t.selected_menu_id !== this.state.selected_menu_id;
    this.state = {
      ...this.state,
      ...t
    }, e && !Object.prototype.hasOwnProperty.call(t, "preview_result") && (this.state.preview_result = null), this.dispatchEvent(new CustomEvent("change", { detail: this.snapshot() }));
  }
}, ae = q("MenuBuilder");
function D(t) {
  return t.split(",").map((e) => e.trim()).filter(Boolean).filter((e, r, a) => a.indexOf(e) === r).sort();
}
function S(t, e = "") {
  const r = window.prompt(t, e);
  return String(r || "").trim();
}
var se = class {
  constructor(t, e) {
    this.state = null, this.dragItemID = "", this.onClick = async (a) => {
      const i = a.target, s = i.closest("[data-menu-select]");
      if (s) {
        const n = String(s.dataset.menuSelect || "").trim();
        n && await this.store.selectMenu(n);
        return;
      }
      if (i.closest("[data-menu-create]")) {
        const n = S("New menu code (example: site.main):", "site.main");
        if (!n) return;
        try {
          await this.store.createMenu({
            code: n,
            name: n,
            status: "draft"
          });
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (i.closest("[data-menu-save-meta]")) {
        const n = this.root.querySelector('[data-menu-meta="code"]'), o = this.root.querySelector('[data-menu-meta="name"]'), d = this.root.querySelector('[data-menu-meta="locale"]'), u = this.root.querySelector('[data-menu-meta="description"]');
        try {
          await this.store.updateMenu({
            code: String(n?.value || "").trim(),
            name: String(o?.value || "").trim(),
            locale: String(d?.value || "").trim(),
            description: String(u?.value || "").trim()
          });
        } catch (p) {
          this.showError(p);
        }
        return;
      }
      if (i.closest("[data-menu-publish]")) {
        const n = String(i.closest("[data-menu-publish]").dataset.menuPublish || "").trim();
        try {
          await this.store.setPublishState(n === "publish");
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (i.closest("[data-menu-clone]")) {
        const n = this.state?.selected_menu;
        if (!n) return;
        const o = S("Clone menu code:", `${n.code}_clone`);
        if (!o) return;
        try {
          await this.store.cloneSelectedMenu(o);
        } catch (d) {
          this.showError(d);
        }
        return;
      }
      if (i.closest("[data-menu-archive]")) {
        const n = String(i.closest("[data-menu-archive]").dataset.menuArchive || "").trim() === "archive";
        try {
          await this.store.archiveSelectedMenu(n);
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (i.closest("[data-menu-add-root]")) {
        this.store.addRootItem();
        return;
      }
      if (i.closest("[data-menu-add-child]")) {
        const n = String(i.closest("[data-menu-add-child]").dataset.menuAddChild || "").trim();
        n && this.store.addChild(n);
        return;
      }
      if (i.closest("[data-menu-remove-item]")) {
        const n = String(i.closest("[data-menu-remove-item]").dataset.menuRemoveItem || "").trim();
        n && this.store.removeItem(n);
        return;
      }
      if (i.closest("[data-menu-save-items]")) {
        try {
          await this.store.saveItems();
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-binding-save]")) {
        const n = this.root.querySelector('[data-binding-field="location"]'), o = this.root.querySelector('[data-binding-field="menu_code"]'), d = this.root.querySelector('[data-binding-field="view_profile_code"]'), u = this.root.querySelector('[data-binding-field="status"]'), p = this.root.querySelector('[data-binding-field="locale"]'), b = this.root.querySelector('[data-binding-field="priority"]'), m = String(n?.value || "").trim();
        if (!m) {
          this.showError(/* @__PURE__ */ new Error("Binding location is required"));
          return;
        }
        try {
          await this.store.upsertBinding(m, {
            location: m,
            menu_code: String(o?.value || "").trim(),
            view_profile_code: String(d?.value || "").trim(),
            status: String(u?.value || "draft").trim().toLowerCase(),
            locale: String(p?.value || "").trim(),
            priority: Number.parseInt(String(b?.value || "0").trim(), 10) || 0
          });
        } catch (v) {
          this.showError(v);
        }
        return;
      }
      if (i.closest("[data-profile-create]")) {
        const n = S("Profile code:", "footer");
        if (!n) return;
        try {
          await this.store.createProfile({
            code: n,
            name: n,
            mode: "full",
            status: "draft"
          });
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (i.closest("[data-profile-save]")) {
        const n = this.root.querySelector('[data-profile-field="code"]'), o = this.root.querySelector('[data-profile-field="name"]'), d = this.root.querySelector('[data-profile-field="mode"]'), u = this.root.querySelector('[data-profile-field="max_top_level"]'), p = this.root.querySelector('[data-profile-field="max_depth"]'), b = this.root.querySelector('[data-profile-field="include_item_ids"]'), m = this.root.querySelector('[data-profile-field="exclude_item_ids"]'), v = String(n?.value || "").trim();
        if (!v) {
          this.showError(/* @__PURE__ */ new Error("Select a profile to update"));
          return;
        }
        try {
          await this.store.updateProfile(v, {
            code: v,
            name: String(o?.value || "").trim(),
            mode: String(d?.value || "full").trim().toLowerCase(),
            max_top_level: Number.parseInt(String(u?.value || "").trim(), 10) || void 0,
            max_depth: Number.parseInt(String(p?.value || "").trim(), 10) || void 0,
            include_item_ids: D(String(b?.value || "")),
            exclude_item_ids: D(String(m?.value || ""))
          });
        } catch (N) {
          this.showError(N);
        }
        return;
      }
      if (i.closest("[data-profile-delete]")) {
        const n = this.root.querySelector('[data-profile-field="code"]'), o = String(n?.value || "").trim();
        if (!o || o === "full") {
          this.showError(/* @__PURE__ */ new Error("Select a non-default profile to delete"));
          return;
        }
        if (!window.confirm(`Delete profile "${o}"?`)) return;
        try {
          await this.store.deleteProfile(o);
        } catch (d) {
          this.showError(d);
        }
        return;
      }
      if (i.closest("[data-profile-publish]")) {
        const n = String(i.closest("[data-profile-publish]").dataset.profilePublish || "").trim(), o = this.root.querySelector('[data-profile-field="code"]'), d = String(o?.value || "").trim();
        if (!d) {
          this.showError(/* @__PURE__ */ new Error("Select a profile first"));
          return;
        }
        try {
          await this.store.publishProfile(d, n === "publish");
        } catch (u) {
          this.showError(u);
        }
        return;
      }
      if (i.closest("[data-preview-run]")) {
        const n = this.state?.selected_menu_id || "";
        if (!n) return;
        const o = this.root.querySelector('[data-preview-field="location"]'), d = this.root.querySelector('[data-preview-field="locale"]'), u = this.root.querySelector('[data-preview-field="view_profile"]'), p = this.root.querySelector('[data-preview-field="include_drafts"]'), b = this.root.querySelector('[data-preview-field="preview_token"]');
        try {
          await this.store.preview({
            menuId: n,
            location: String(o?.value || "").trim(),
            locale: String(d?.value || "").trim(),
            view_profile: String(u?.value || "").trim(),
            include_drafts: !!p?.checked,
            preview_token: String(b?.value || "").trim()
          });
        } catch (m) {
          this.showError(m);
        }
      }
    }, this.onChange = (a) => {
      const i = a.target, s = i.closest("[data-menu-item-field]");
      if (s) {
        const o = String(s.dataset.menuItemField || "").trim(), d = i, u = String(d.dataset.itemField || "").trim();
        if (!o || !u) return;
        const p = this.findItemByID(this.state?.draft_items || [], o);
        if (!p) return;
        if (u === "label") {
          this.store.updateItem(o, { label: String(d.value || "").trim() });
          return;
        }
        if (u === "target.type") {
          const m = String(d.value || "route").trim().toLowerCase();
          this.store.updateItem(o, { target: {
            type: m,
            path: m === "route" || m === "module" ? "/" : void 0,
            url: m === "external" ? "https://" : void 0,
            content_type: m === "content" ? "page" : void 0,
            slug: m === "content" ? "home" : void 0
          } });
          return;
        }
        const b = { ...p.target || { type: "route" } };
        if (u.startsWith("target.")) {
          const m = u.replace("target.", "");
          b[m] = String(d.value || "").trim(), this.store.updateItem(o, { target: b });
        }
        return;
      }
      const n = i.closest('[data-profile-field="code"]');
      n && this.syncSelectedProfile(n.value);
    }, this.onDragStart = (a) => {
      const i = a.target.closest("[data-menu-item-id]");
      if (!i) return;
      const s = String(i.dataset.menuItemId || "").trim();
      s && (this.dragItemID = s, i.classList.add("opacity-60"), a instanceof DragEvent && a.dataTransfer && (a.dataTransfer.effectAllowed = "move", a.dataTransfer.setData("text/plain", s)));
    }, this.onDragOver = (a) => {
      if (!(a instanceof DragEvent)) return;
      const i = a.target.closest("[data-drop-zone]");
      i && (a.preventDefault(), i.classList.add("bg-blue-100"));
    }, this.onDragLeave = (a) => {
      const i = a.target.closest("[data-drop-zone]");
      i && i.classList.remove("bg-blue-100");
    }, this.onDrop = (a) => {
      if (!(a instanceof DragEvent)) return;
      const i = a.target.closest("[data-drop-zone]");
      if (!i) return;
      a.preventDefault(), i.classList.remove("bg-blue-100");
      const s = String(i.dataset.dropTarget || "").trim(), n = String(i.dataset.dropMode || "inside").trim(), o = this.dragItemID || String(a.dataTransfer?.getData("text/plain") || "").trim();
      !o || !s || o === s || this.store.moveItem(o, s, n);
    }, this.onDragEnd = (a) => {
      this.dragItemID = "";
      const i = a.target.closest("[data-menu-item-id]");
      i && i.classList.remove("opacity-60"), this.root.querySelectorAll("[data-drop-zone]").forEach((s) => s.classList.remove("bg-blue-100"));
    }, this.root = t, this.config = e;
    const r = new Z({ basePath: e.apiBasePath });
    this.store = new ie(r);
  }
  async init() {
    this.root.addEventListener("click", this.onClick), this.root.addEventListener("change", this.onChange), this.root.addEventListener("dragstart", this.onDragStart), this.root.addEventListener("dragover", this.onDragOver), this.root.addEventListener("dragleave", this.onDragLeave), this.root.addEventListener("drop", this.onDrop), this.root.addEventListener("dragend", this.onDragEnd), this.store.addEventListener("change", (e) => {
      const r = e.detail;
      this.state = r, this.render();
    }), await this.store.initialize();
    const t = String(this.config.initialMenuID || "").trim();
    t && await this.store.selectMenu(t);
  }
  destroy() {
    this.root.removeEventListener("click", this.onClick), this.root.removeEventListener("change", this.onChange), this.root.removeEventListener("dragstart", this.onDragStart), this.root.removeEventListener("dragover", this.onDragOver), this.root.removeEventListener("dragleave", this.onDragLeave), this.root.removeEventListener("drop", this.onDrop), this.root.removeEventListener("dragend", this.onDragEnd);
  }
  render() {
    const t = this.state;
    if (!t) return;
    const e = t.selected_menu, r = t.validation_issues.map((s) => `<li class="text-xs text-amber-700">${c(s.message)}</li>`).join(""), a = t.preview_result?.menu.items || [];
    this.root.innerHTML = `
      <div class="grid gap-6 lg:grid-cols-[280px,1fr,360px]">
        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 h-fit">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menus</h2>
            <button type="button" data-menu-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
          </div>
          <div class="space-y-2" data-menu-list>
            ${t.menus.length === 0 ? '<p class="text-sm text-gray-500">No menus yet.</p>' : t.menus.map((s) => this.renderMenuCard(s, t.selected_menu_id)).join("")}
          </div>
        </section>

        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-gray-900">${c(e?.name || "Menu Builder")}</h2>
              <p class="text-xs text-gray-500">List, create, edit, publish, clone, and archive menu trees.</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-menu-publish="publish" class="px-2.5 py-1.5 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700">Publish</button>
              <button type="button" data-menu-publish="unpublish" class="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Unpublish</button>
              <button type="button" data-menu-clone class="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Clone</button>
              <button type="button" data-menu-archive="archive" class="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded hover:bg-amber-200">Archive</button>
              <button type="button" data-menu-archive="restore" class="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded hover:bg-blue-200">Restore</button>
            </div>
          </header>

          ${t.error ? `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${c(t.error)}</div>` : ""}

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600">
              Code
              <input data-menu-meta="code" value="${c(e?.code || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Name
              <input data-menu-meta="name" value="${c(e?.name || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Locale
              <input data-menu-meta="locale" value="${c(e?.locale || "")}" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Status
              <input value="${c(e?.status || "draft")}" disabled class="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-600" />
            </label>
          </div>

          <label class="text-xs text-gray-600 block">
            Description
            <textarea data-menu-meta="description" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">${c(e?.description || "")}</textarea>
          </label>

          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800">Menu Tree Editor</h3>
            <div class="flex items-center gap-2">
              <button type="button" data-menu-add-root class="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded hover:bg-blue-200">Add Root Item</button>
              <button type="button" data-menu-save-items class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Tree</button>
            </div>
          </div>

          ${r ? `<ul class="space-y-1 rounded border border-amber-200 bg-amber-50 px-3 py-2">${r}</ul>` : ""}

          <div class="rounded border border-gray-200 p-3" data-menu-tree>
            ${t.draft_items.length === 0 ? '<p class="text-sm text-gray-500">No menu items yet. Add a root item to start.</p>' : this.renderTree(t.draft_items)}
          </div>
        </section>

        <section class="space-y-4">
          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-800">Location Binding Editor</h3>
            <p class="text-xs text-gray-500">Choose source menu and profile per location.</p>
            ${this.renderBindingList(t)}
            <div class="grid gap-2">
              <label class="text-xs text-gray-600">Location <input data-binding-field="location" placeholder="site.main" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Menu
                <select data-binding-field="menu_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Select menu</option>
                  ${t.menus.map((s) => `<option value="${c(s.code)}">${c(s.code)}</option>`).join("")}
                </select>
              </label>
              <label class="text-xs text-gray-600">View Profile
                <select data-binding-field="view_profile_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">full</option>
                  ${t.profiles.map((s) => `<option value="${c(s.code)}">${c(s.code)}</option>`).join("")}
                </select>
              </label>
              <label class="text-xs text-gray-600">Locale <input data-binding-field="locale" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Priority <input data-binding-field="priority" type="number" value="0" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Status
                <select data-binding-field="status" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </label>
              <button type="button" data-binding-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Binding</button>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">View Profile Editor</h3>
              <button type="button" data-profile-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
            </div>
            <label class="text-xs text-gray-600">Profile
              <select data-profile-field="code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                <option value="">Select profile</option>
                ${t.profiles.map((s) => `<option value="${c(s.code)}">${c(s.code)}</option>`).join("")}
              </select>
            </label>
            <label class="text-xs text-gray-600">Name <input data-profile-field="name" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Mode
              <select data-profile-field="mode" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                <option value="full">full</option>
                <option value="top_level_limit">top_level_limit</option>
                <option value="max_depth">max_depth</option>
                <option value="include_ids">include_ids</option>
                <option value="exclude_ids">exclude_ids</option>
              </select>
            </label>
            <label class="text-xs text-gray-600">Max Top Level <input data-profile-field="max_top_level" type="number" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Max Depth <input data-profile-field="max_depth" type="number" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Include Item IDs (csv) <input data-profile-field="include_item_ids" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Exclude Item IDs (csv) <input data-profile-field="exclude_item_ids" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <div class="flex items-center gap-2">
              <button type="button" data-profile-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Profile</button>
              <button type="button" data-profile-publish="publish" class="px-2.5 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded hover:bg-green-200">Publish</button>
              <button type="button" data-profile-publish="unpublish" class="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Unpublish</button>
              <button type="button" data-profile-delete class="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-100 rounded hover:bg-red-200">Delete</button>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-800">Preview Simulation</h3>
            <p class="text-xs text-gray-500">Preview location/profile output and draft behavior.</p>
            <label class="text-xs text-gray-600">Location <input data-preview-field="location" placeholder="site.main" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Locale <input data-preview-field="locale" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">View Profile <input data-preview-field="view_profile" placeholder="full" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="text-xs text-gray-600">Preview Token <input data-preview-field="preview_token" placeholder="optional" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
            <label class="inline-flex items-center gap-2 text-xs text-gray-700"><input data-preview-field="include_drafts" type="checkbox" class="rounded border-gray-300" /> include drafts</label>
            <button type="button" data-preview-run class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Run Preview</button>
            ${t.preview_result ? `
              <div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 space-y-1">
                <div><strong>Items:</strong> ${a.length}</div>
                ${t.preview_result.simulation?.location ? `<div><strong>Location:</strong> ${c(t.preview_result.simulation.location)}</div>` : ""}
                ${t.preview_result.simulation?.view_profile ? `<div><strong>Profile:</strong> ${c(t.preview_result.simulation.view_profile)}</div>` : ""}
                <div><strong>Top Labels:</strong> ${c(a.map((s) => s.label).join(", ") || "(none)")}</div>
              </div>
            ` : ""}
          </div>
        </section>
      </div>
    `;
    const i = this.root.querySelector('[data-profile-field="code"]');
    i && i.value && this.syncSelectedProfile(i.value);
  }
  renderMenuCard(t, e) {
    const r = t.id === e;
    return `
      <button type="button"
              data-menu-select="${c(t.id)}"
              class="w-full text-left rounded-lg border px-3 py-2 ${r ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-800 truncate">${c(t.name || t.code)}</span>
          <span class="text-[10px] uppercase tracking-wide ${t.status === "published" ? "text-green-700" : "text-gray-500"}">${c(t.status)}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 truncate">${c(t.code)}</div>
      </button>
    `;
  }
  renderTree(t) {
    return `<ul class="space-y-2">${t.map((e) => this.renderTreeNode(e)).join("")}</ul>`;
  }
  renderTreeNode(t) {
    const e = String(t.target?.type || "route"), r = this.store.resolveTarget(t), a = this.renderTargetFields(t, e);
    return `
      <li class="rounded border border-gray-200" data-menu-item-id="${c(t.id)}" draggable="true">
        <div class="h-1 rounded-t bg-transparent" data-drop-zone data-drop-target="${c(t.id)}" data-drop-mode="before"></div>
        <div class="px-2 py-2 space-y-2" data-drop-zone data-drop-target="${c(t.id)}" data-drop-mode="inside">
          <div class="flex items-start gap-2" data-menu-item-field="${c(t.id)}">
            <span class="cursor-move text-gray-400 pt-1" title="Drag to reorder">⋮⋮</span>
            <div class="flex-1 grid gap-2 md:grid-cols-[1fr,140px]">
              <input
                data-item-field="label"
                value="${c(t.label)}"
                placeholder="Label"
                class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select data-item-field="target.type" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
                ${[
      "content",
      "route",
      "module",
      "external"
    ].map((i) => `<option value="${i}" ${i === e ? "selected" : ""}>${i}</option>`).join("")}
              </select>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" data-menu-add-child="${c(t.id)}" class="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded">+Child</button>
              <button type="button" data-menu-remove-item="${c(t.id)}" class="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-100 rounded">Delete</button>
            </div>
          </div>
          <div data-menu-item-field="${c(t.id)}" class="grid gap-2 md:grid-cols-[1fr,auto]">
            ${a}
            <div class="text-[11px] ${r.valid ? "text-green-700" : "text-amber-700"}">
              <div class="font-semibold">${r.valid ? "Resolved URL" : "Validation"}</div>
              <div>${c(r.url || r.message)}</div>
            </div>
          </div>
          ${t.children && t.children.length > 0 ? this.renderTree(t.children) : ""}
        </div>
        <div class="h-1 rounded-b bg-transparent" data-drop-zone data-drop-target="${c(t.id)}" data-drop-mode="after"></div>
      </li>
    `;
  }
  renderTargetFields(t, e) {
    return e === "external" ? `
        <label class="text-xs text-gray-600">External URL
          <input data-item-field="target.url" value="${c(t.target?.url || "")}" placeholder="https://example.com" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : e === "content" ? `
        <div class="grid gap-2 md:grid-cols-2">
          <label class="text-xs text-gray-600">Content Type
            <input data-item-field="target.content_type" value="${c(t.target?.content_type || "")}" placeholder="page" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="text-xs text-gray-600">Slug / ID
            <input data-item-field="target.slug" value="${c(t.target?.slug || t.target?.id || "")}" placeholder="home" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
      ` : e === "module" ? `
        <label class="text-xs text-gray-600">Module Path
          <input data-item-field="target.path" value="${c(t.target?.path || t.target?.module || "")}" placeholder="/docs" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : `
      <label class="text-xs text-gray-600">Route Path
        <input data-item-field="target.path" value="${c(t.target?.path || t.target?.route || "")}" placeholder="/" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
    `;
  }
  renderBindingList(t) {
    return t.bindings.length === 0 ? '<p class="text-xs text-gray-500">No bindings configured.</p>' : `
      <div class="max-h-40 overflow-auto rounded border border-gray-200">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 text-gray-500 uppercase tracking-wide">
            <tr>
              <th class="text-left px-2 py-1">Location</th>
              <th class="text-left px-2 py-1">Menu</th>
              <th class="text-left px-2 py-1">Profile</th>
              <th class="text-left px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            ${t.bindings.map((e) => `
              <tr>
                <td class="px-2 py-1">${c(e.location)}</td>
                <td class="px-2 py-1">${c(e.menu_code)}</td>
                <td class="px-2 py-1">${c(e.view_profile_code || "full")}</td>
                <td class="px-2 py-1">${c(e.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  findItemByID(t, e) {
    for (const r of t) {
      if (r.id === e) return r;
      const a = this.findItemByID(r.children || [], e);
      if (a) return a;
    }
    return null;
  }
  syncSelectedProfile(t) {
    const e = (this.state?.profiles || []).find((a) => a.code === t);
    if (!e) return;
    const r = (a, i) => {
      const s = this.root.querySelector(a);
      s && (s.value = i);
    };
    r('[data-profile-field="name"]', e.name || ""), r('[data-profile-field="mode"]', e.mode || "full"), r('[data-profile-field="max_top_level"]', e.max_top_level ? String(e.max_top_level) : ""), r('[data-profile-field="max_depth"]', e.max_depth ? String(e.max_depth) : ""), r('[data-profile-field="include_item_ids"]', (e.include_item_ids || []).join(",")), r('[data-profile-field="exclude_item_ids"]', (e.exclude_item_ids || []).join(","));
  }
  showError(t) {
    const e = this.root.parentElement?.querySelector("[data-menu-builder-error]") || null, r = this.formatError(t);
    if (e) {
      e.textContent = r, e.classList.remove("hidden");
      return;
    }
    ae.error("[MenuBuilderUI]", r, t);
  }
  formatError(t) {
    if (t instanceof P) {
      const e = String(t.metadata?.field || "").trim();
      return e ? `${t.message} (${e})` : t.message;
    }
    return t instanceof Error ? t.message : String(t);
  }
};
async function ne(t) {
  const e = z("/", String(t.dataset.basePath || "/admin")), r = F(e, String(t.dataset.apiBasePath || `${e}/api`)), a = String(t.dataset.menuId || "").trim(), i = new se(t, {
    basePath: e,
    apiBasePath: r,
    initialMenuID: a
  });
  return await i.init(), i;
}
var oe = q("MenuBuilder");
k(() => {
  document.querySelectorAll("[data-menu-builder-root]").forEach((t) => {
    t.dataset.initialized !== "true" && ne(t).then(() => {
      t.dataset.initialized = "true";
    }).catch((e) => {
      oe.error("[menu-builder] failed to initialize", e), t.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${e instanceof Error ? e.message : String(e)}</div>`;
    });
  });
});
export {
  ge as EntryNavigationOverrideUI,
  Z as MenuBuilderAPIClient,
  P as MenuBuilderAPIError,
  ie as MenuBuilderStore,
  se as MenuBuilderUI,
  fe as initEntryNavigationOverrides,
  ne as initMenuBuilder,
  I as parseMenuBindingRecord,
  H as parseMenuContracts,
  _ as parseMenuItemNode,
  y as parseMenuRecord,
  x as parseMenuViewProfileRecord,
  Y as parseNavigationOverrides
};

//# sourceMappingURL=index.js.map