import { escapeHTML as d } from "../shared/html.js";
import { httpRequest as R } from "../shared/transport/http-client.js";
import { onReady as N } from "../shared/dom-ready.js";
import { asRecord as f, coerceInteger as S, coerceString as o, coerceStringArray as x } from "../shared/coercion.js";
import { normalizeMenuBuilderAPIBasePath as O, normalizeMenuBuilderPath as A, normalizeMenuBuilderRoute as k } from "./shared/path-helpers.js";
import { n as ce, t as ue } from "../chunks/entry-navigation-DpuuC92n.js";
var F = /* @__PURE__ */ new Set([
  "inherit",
  "show",
  "hide"
]), z = /* @__PURE__ */ new Set(["draft", "published"]), U = /* @__PURE__ */ new Set([
  "content",
  "route",
  "module",
  "external"
]), V = /* @__PURE__ */ new Set([
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
function E(t) {
  return o(t).toLowerCase() === "true";
}
function L(t) {
  const e = o(t, "draft").toLowerCase();
  return z.has(e) ? e : "draft";
}
function G(t) {
  const e = o(t, "full").toLowerCase();
  return V.has(e) ? e : "full";
}
function J(t) {
  const e = g(t, "menu contracts"), r = g(e.endpoints, "menu contracts endpoints"), i = g(e.error_codes ?? e.errorCode ?? {}, "menu contracts error codes"), s = {};
  Object.entries(r).forEach(([n, l]) => {
    const c = o(l);
    c && (s[n] = c);
  });
  const a = {};
  return Object.entries(i).forEach(([n, l]) => {
    const c = o(l);
    c && (a[n] = c);
  }), {
    endpoints: s,
    error_codes: a,
    content_navigation: W(e.content_navigation)
  };
}
function W(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return;
  const e = t, r = e.endpoints, i = e.entry_navigation_overrides, s = e.validation, a = {};
  r && typeof r == "object" && !Array.isArray(r) && Object.entries(r).forEach(([l, c]) => {
    const u = o(c);
    u && (a[l] = u);
  });
  const n = {};
  if (Object.keys(a).length > 0 && (n.endpoints = a), i && typeof i == "object" && !Array.isArray(i)) {
    const l = i;
    n.entry_navigation_overrides = {
      value_enum: x(l.value_enum),
      write_endpoint: o(l.write_endpoint)
    };
  }
  if (s && typeof s == "object" && !Array.isArray(s)) {
    const l = s, c = l.invalid_location, u = l.invalid_value;
    n.validation = {
      invalid_location: c && typeof c == "object" && !Array.isArray(c) ? {
        field_pattern: o(c.field_pattern),
        rule: o(c.rule),
        hint: o(c.hint)
      } : void 0,
      invalid_value: u && typeof u == "object" && !Array.isArray(u) ? { allowed_values: x(u.allowed_values) } : void 0
    };
  }
  return n;
}
function b(t) {
  const e = g(t, "menu record"), r = o(e.id, o(e.code)), i = o(e.code, r);
  if (!r || !i) throw new Error("menu record requires id and code");
  return {
    id: r,
    code: i,
    name: o(e.name, i),
    description: o(e.description),
    status: L(e.status),
    locale: o(e.locale),
    family_id: o(e.family_id),
    archived: E(e.archived),
    created_at: o(e.created_at),
    updated_at: o(e.updated_at),
    published_at: o(e.published_at),
    archived_at: o(e.archived_at)
  };
}
function $(t) {
  const e = g(t, "menu binding record"), r = o(e.location), i = o(e.menu_code);
  if (!r || !i) throw new Error("menu binding requires location and menu_code");
  return {
    id: o(e.id),
    location: r,
    menu_code: i,
    view_profile_code: o(e.view_profile_code),
    locale: o(e.locale),
    priority: S(e.priority, 0),
    status: L(e.status),
    created_at: o(e.created_at),
    updated_at: o(e.updated_at),
    published_at: o(e.published_at)
  };
}
function y(t) {
  const e = g(t, "menu view profile"), r = o(e.code);
  if (!r) throw new Error("menu view profile requires code");
  return {
    code: r,
    name: o(e.name, r),
    mode: G(e.mode),
    max_top_level: S(e.max_top_level, 0) || void 0,
    max_depth: S(e.max_depth, 0) || void 0,
    include_item_ids: x(e.include_item_ids),
    exclude_item_ids: x(e.exclude_item_ids),
    status: L(e.status),
    created_at: o(e.created_at),
    updated_at: o(e.updated_at),
    published_at: o(e.published_at)
  };
}
function H(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return;
  const e = t, r = o(e.type).toLowerCase();
  if (U.has(r))
    return {
      type: r,
      id: o(e.id),
      slug: o(e.slug),
      content_type: o(e.content_type),
      path: o(e.path),
      route: o(e.route),
      module: o(e.module),
      url: o(e.url)
    };
}
function w(t, e = "menu item") {
  const r = g(t, e), i = o(r.id);
  if (!i) throw new Error(`${e} requires id`);
  const s = r.children ?? r.Items, a = Array.isArray(s) ? s.map((n, l) => w(n, `${e}.children[${l}]`)) : [];
  return {
    id: i,
    label: o(r.label, i),
    type: o(r.type),
    parent_id: o(r.parent_id ?? r.parentID ?? r.ParentID),
    target: H(r.target ?? r.Target),
    children: a
  };
}
function K(t) {
  const e = g(t, "menu preview response"), r = g(e.menu ?? e.data, "menu preview menu"), i = r.items ?? r.Items, s = Array.isArray(i) ? i.map((a, n) => w(a, `preview.menu.items[${n}]`)) : [];
  return {
    menu: {
      code: o(r.code ?? r.Code),
      items: s
    },
    simulation: e.simulation && typeof e.simulation == "object" && !Array.isArray(e.simulation) ? {
      requested_id: o(e.simulation.requested_id),
      location: o(e.simulation.location),
      locale: o(e.simulation.locale),
      view_profile: o(e.simulation.view_profile),
      include_drafts: E(e.simulation.include_drafts),
      preview_token_present: E(e.simulation.preview_token_present),
      binding: e.simulation.binding && typeof e.simulation.binding == "object" ? $(e.simulation.binding) : void 0,
      profile: e.simulation.profile && typeof e.simulation.profile == "object" ? y(e.simulation.profile) : void 0
    } : void 0
  };
}
function Q(t, e = []) {
  if (!t || typeof t != "object" || Array.isArray(t)) return {};
  const r = t, i = new Set(e.map((a) => a.trim()).filter(Boolean)), s = {};
  return Object.entries(r).forEach(([a, n]) => {
    const l = a.trim();
    if (!l) return;
    if (i.size > 0 && !i.has(l)) throw new Error(`invalid navigation location: ${l}`);
    const c = o(n).toLowerCase();
    if (!F.has(c)) throw new Error(`invalid navigation value for ${l}: ${String(n)}`);
    s[l] = c;
  }), s;
}
var I = class extends Error {
  constructor(t, e = 500, r = "", i = {}) {
    super(t), this.name = "MenuBuilderAPIError", this.status = e, this.textCode = r, this.metadata = i;
  }
};
function C(t, e) {
  let r = t;
  return Object.entries(e).forEach(([i, s]) => {
    r = r.replace(`:${i}`, encodeURIComponent(String(s)));
  }), r;
}
var X = class {
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
    const e = f(await this.fetchJSON(this.config.contractsPath, { method: "GET" })), r = J(e.contracts ?? e);
    return this.contracts = r, r;
  }
  async listMenus() {
    const t = await this.fetchFromEndpoint("menus", { method: "GET" });
    return (Array.isArray(t.menus) ? t.menus : Array.isArray(t.data) ? t.data : []).map((e) => b(e));
  }
  async getMenu(t) {
    const e = await this.fetchFromEndpoint("menus.id", {
      method: "GET",
      params: { id: t }
    });
    return {
      menu: b(e.menu ?? e.data ?? e),
      items: (Array.isArray(e.items) ? e.items : []).map((r, i) => w(r, `menu.items[${i}]`))
    };
  }
  async createMenu(t) {
    const e = await this.fetchFromEndpoint("menus", {
      method: "POST",
      body: t
    });
    return b(e.menu ?? e.data ?? e);
  }
  async updateMenu(t, e) {
    const r = await this.fetchFromEndpoint("menus.id", {
      method: "PUT",
      params: { id: t },
      body: e
    });
    return b(r.menu ?? r.data ?? r);
  }
  async publishMenu(t, e) {
    const r = e ? "menus.publish" : "menus.unpublish", i = await this.fetchFromEndpoint(r, {
      method: "POST",
      params: { id: t },
      body: {}
    });
    return b(i.menu ?? i.data ?? i);
  }
  async cloneMenu(t, e) {
    const r = await this.fetchFromEndpoint("menus.clone", {
      method: "POST",
      params: { id: t },
      body: { code: e }
    });
    return b(r.menu ?? r.data ?? r);
  }
  async archiveMenu(t, e) {
    const r = await this.fetchFromEndpoint("menus.archive", {
      method: "POST",
      params: { id: t },
      body: { archived: e }
    });
    return b(r.menu ?? r.data ?? r);
  }
  async upsertMenuItems(t, e) {
    const r = await this.fetchFromEndpoint("menus.items", {
      method: "PUT",
      params: { id: t },
      body: { items: e }
    }), i = f(r.menu ?? r.data ?? {});
    return (Array.isArray(i.items) ? i.items : Array.isArray(i.Items) ? i.Items : []).map((s, a) => w(s, `menu.items[${a}]`));
  }
  async previewMenu(t) {
    const e = new URLSearchParams();
    return t.location && e.set("location", t.location), t.locale && e.set("locale", t.locale), t.view_profile && e.set("view_profile", t.view_profile), t.include_drafts && e.set("include_drafts", "true"), t.preview_token && e.set("preview_token", t.preview_token), K(await this.fetchFromEndpoint("menus.preview", {
      method: "GET",
      params: { id: t.menuId },
      query: e
    }));
  }
  async listBindings() {
    const t = await this.fetchFromEndpoint("menu.bindings", { method: "GET" });
    return (Array.isArray(t.bindings) ? t.bindings : Array.isArray(t.data) ? t.data : []).map((e) => $(e));
  }
  async upsertBinding(t, e) {
    const r = await this.fetchFromEndpoint("menu.bindings.location", {
      method: "PUT",
      params: { location: t },
      body: e
    });
    return $(r.binding ?? r.data ?? r);
  }
  async listProfiles() {
    const t = await this.fetchFromEndpoint("menu.view_profiles", { method: "GET" });
    return (Array.isArray(t.view_profiles) ? t.view_profiles : Array.isArray(t.profiles) ? t.profiles : Array.isArray(t.data) ? t.data : []).map((e) => y(e));
  }
  async createProfile(t) {
    const e = await this.fetchFromEndpoint("menu.view_profiles", {
      method: "POST",
      body: t
    });
    return y(e.view_profile ?? e.profile ?? e.data ?? e);
  }
  async updateProfile(t, e) {
    const r = await this.fetchFromEndpoint("menu.view_profiles.code", {
      method: "PUT",
      params: { code: t },
      body: e
    });
    return y(r.view_profile ?? r.profile ?? r.data ?? r);
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
    return y(r.view_profile ?? r.profile ?? r.data ?? r);
  }
  async patchEntryNavigation(t, e, r, i = []) {
    let s = `${this.config.basePath}/content/:type/:id/navigation`;
    try {
      s = (await this.loadContracts()).content_navigation?.endpoints?.["content.navigation"] || s;
    } catch {
    }
    const a = A(this.config.basePath, C(s, {
      type: t,
      id: e
    })), n = f(await this.fetchJSON(a, {
      method: "PATCH",
      body: JSON.stringify({ _navigation: r }),
      headers: { "Content-Type": "application/json" }
    })), l = f(n.data ?? n);
    return {
      overrides: Q(l._navigation, i),
      effective_visibility: f(l.effective_navigation_visibility)
    };
  }
  async fetchFromEndpoint(t, e) {
    const r = (await this.loadContracts()).endpoints[t];
    if (!r) throw new I(`missing endpoint contract for ${t}`, 500, "CONTRACT_MISSING");
    const i = A(this.config.basePath, C(r, e.params ?? {})), s = String(e.query ?? "").trim(), a = s ? `?${s}` : "";
    return f(await this.fetchJSON(`${i}${a}`, {
      method: e.method,
      body: e.body ? JSON.stringify(e.body) : void 0,
      headers: e.body ? { "Content-Type": "application/json" } : void 0
    }));
  }
  async fetchJSON(t, e) {
    const r = await R(t, {
      ...e,
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        ...e.headers ?? {}
      }
    });
    let i = null;
    try {
      i = await r.json();
    } catch {
      i = null;
    }
    if (!r.ok) {
      const s = f(i?.error ?? i), a = String(s.message ?? (r.statusText || "request failed")).trim() || "request failed", n = String(s.text_code ?? "").trim(), l = f(s.metadata);
      throw new I(a, r.status, n, l);
    }
    return i;
  }
}, Y = {
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
function D(t, e = /* @__PURE__ */ new Set()) {
  return t.forEach((r) => {
    e.add(r.id), D(r.children || [], e);
  }), e;
}
function P(t, e) {
  const r = [];
  let i = null;
  return t.forEach((s) => {
    if (s.id === e) {
      i = {
        ...s,
        target: s.target ? { ...s.target } : void 0,
        children: h(s.children || [])
      };
      return;
    }
    const a = P(s.children || [], e);
    if (a.node && !i) {
      i = a.node, r.push({
        ...s,
        children: a.next
      });
      return;
    }
    r.push({
      ...s,
      children: h(s.children || [])
    });
  }), {
    node: i,
    next: r
  };
}
function q(t, e, r) {
  const i = [];
  let s = !1;
  return t.forEach((a) => {
    !s && a.id === e && (i.push(r), s = !0);
    const n = q(a.children || [], e, r);
    if (n.inserted) {
      s = !0, i.push({
        ...a,
        children: n.items
      });
      return;
    }
    i.push({
      ...a,
      children: h(a.children || [])
    });
  }), {
    inserted: s,
    items: i
  };
}
function j(t, e, r) {
  const i = [];
  let s = !1;
  return t.forEach((a) => {
    const n = j(a.children || [], e, r);
    if (n.inserted) {
      s = !0, i.push({
        ...a,
        children: n.items
      });
      return;
    }
    i.push({
      ...a,
      children: h(a.children || [])
    }), !s && a.id === e && (i.push(r), s = !0);
  }), {
    inserted: s,
    items: i
  };
}
function M(t, e, r) {
  let i = !1;
  const s = t.map((a) => {
    if (a.id === e)
      return i = !0, {
        ...a,
        children: [...h(a.children || []), r]
      };
    const n = M(a.children || [], e, r);
    return n.inserted ? (i = !0, {
      ...a,
      children: n.items
    }) : {
      ...a,
      children: h(a.children || [])
    };
  });
  return {
    inserted: i,
    items: s
  };
}
function Z(t) {
  const e = t.target;
  return !e || !e.type ? "" : e.type === "external" ? `external:${String(e.url || "").trim().toLowerCase()}` : e.type === "route" || e.type === "module" ? `${e.type}:${String(e.path || e.route || e.module || "").trim().toLowerCase()}` : `content:${String(e.content_type || "").trim().toLowerCase()}:${String(e.slug || e.id || "").trim().toLowerCase()}`;
}
function ee(t) {
  const e = t.target;
  if (!e) return {
    url: "",
    valid: !1,
    message: "Target required"
  };
  switch (e.type) {
    case "external": {
      const r = String(e.url || "").trim(), i = /^https?:\/\//i.test(r);
      return {
        url: r,
        valid: i,
        message: i ? "Resolved external URL" : "External URL must start with http:// or https://"
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
      const r = String(e.content_type || "").trim(), i = String(e.slug || e.id || "").trim(), s = r.length > 0 && i.length > 0;
      return {
        url: s ? `/${r}/${i}` : "",
        valid: s,
        message: s ? "Resolved content URL" : "Content target requires content type and slug/id"
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
var te = class extends EventTarget {
  constructor(t) {
    super(), this.client = t, this.state = { ...Y };
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
      const t = await this.client.loadContracts(), [e, r, i] = await Promise.all([
        this.client.listMenus(),
        this.client.listBindings(),
        this.client.listProfiles()
      ]), s = e[0]?.id || "";
      this.setState({
        contracts: t,
        menus: e,
        bindings: r,
        profiles: i,
        selected_menu_id: s,
        loading: !1
      }), s && await this.selectMenu(s);
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t.message : String(t)
      });
    }
  }
  async refreshMenus() {
    const t = await this.client.listMenus(), e = this.state.selected_menu_id, r = t.some((i) => i.id === e);
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
    const r = this.mapItems(this.state.draft_items, t, (i) => ({
      ...i,
      ...e,
      target: e.target ? { ...e.target } : i.target
    }));
    this.setDraftItems(r);
  }
  removeItem(t) {
    const e = P(this.state.draft_items, t);
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
    }, r = M(this.state.draft_items, t, e);
    r.inserted && this.setDraftItems(r.items);
  }
  moveItem(t, e, r) {
    if (!t || !e || t === e) return;
    const i = D(this.state.draft_items);
    if (!i.has(t) || !i.has(e)) return;
    const s = P(this.state.draft_items, t);
    if (!s.node) return;
    let a;
    switch (r) {
      case "before":
        a = q(s.next, e, s.node);
        break;
      case "after":
        a = j(s.next, e, s.node);
        break;
      default:
        a = M(s.next, e, s.node);
        break;
    }
    a.inserted && this.setDraftItems(a.items);
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
  async patchEntryNavigation(t, e, r, i) {
    return this.client.patchEntryNavigation(t, e, r, i);
  }
  resolveTarget(t) {
    return ee(t);
  }
  mapItems(t, e, r) {
    return t.map((i) => i.id === e ? r({
      ...i,
      children: h(i.children || [])
    }) : {
      ...i,
      children: this.mapItems(i.children || [], e, r)
    });
  }
  validateItems(t) {
    const e = [], r = /* @__PURE__ */ new Map(), i = (s, a, n) => {
      s.label.trim() || e.push({
        code: "label_required",
        message: `Menu item ${s.id} requires a label`,
        item_id: s.id
      }), n.has(s.id) && e.push({
        code: "cycle",
        message: `Cycle detected at menu item ${s.id}`,
        item_id: s.id
      }), a > 8 && e.push({
        code: "depth",
        message: `Menu depth exceeds max level at ${s.id}`,
        item_id: s.id
      });
      const l = this.resolveTarget(s);
      l.valid || e.push({
        code: "invalid_target",
        message: `${s.label || s.id}: ${l.message}`,
        item_id: s.id
      });
      const c = Z(s);
      if (c) {
        const m = r.get(c);
        m && m !== s.id ? e.push({
          code: "duplicate_target",
          message: `Duplicate target detected between ${m} and ${s.id}`,
          item_id: s.id
        }) : r.set(c, s.id);
      }
      const u = new Set(n);
      u.add(s.id), (s.children || []).forEach((m) => i(m, a + 1, u));
    };
    return t.forEach((s) => i(s, 1, /* @__PURE__ */ new Set())), e;
  }
  setState(t) {
    const e = Object.prototype.hasOwnProperty.call(t, "selected_menu_id") && t.selected_menu_id !== this.state.selected_menu_id;
    this.state = {
      ...this.state,
      ...t
    }, e && !Object.prototype.hasOwnProperty.call(t, "preview_result") && (this.state.preview_result = null), this.dispatchEvent(new CustomEvent("change", { detail: this.snapshot() }));
  }
};
function T(t) {
  return t.split(",").map((e) => e.trim()).filter(Boolean).filter((e, r, i) => i.indexOf(e) === r).sort();
}
function _(t, e = "") {
  const r = window.prompt(t, e);
  return String(r || "").trim();
}
var re = class {
  constructor(t, e) {
    this.state = null, this.dragItemID = "", this.onClick = async (r) => {
      const i = r.target, s = i.closest("[data-menu-select]");
      if (s) {
        const a = String(s.dataset.menuSelect || "").trim();
        a && await this.store.selectMenu(a);
        return;
      }
      if (i.closest("[data-menu-create]")) {
        const a = _("New menu code (example: site.main):", "site.main");
        if (!a) return;
        try {
          await this.store.createMenu({
            code: a,
            name: a,
            status: "draft"
          });
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-menu-save-meta]")) {
        const a = this.root.querySelector('[data-menu-meta="code"]'), n = this.root.querySelector('[data-menu-meta="name"]'), l = this.root.querySelector('[data-menu-meta="locale"]'), c = this.root.querySelector('[data-menu-meta="description"]');
        try {
          await this.store.updateMenu({
            code: String(a?.value || "").trim(),
            name: String(n?.value || "").trim(),
            locale: String(l?.value || "").trim(),
            description: String(c?.value || "").trim()
          });
        } catch (u) {
          this.showError(u);
        }
        return;
      }
      if (i.closest("[data-menu-publish]")) {
        const a = String(i.closest("[data-menu-publish]").dataset.menuPublish || "").trim();
        try {
          await this.store.setPublishState(a === "publish");
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-menu-clone]")) {
        const a = this.state?.selected_menu;
        if (!a) return;
        const n = _("Clone menu code:", `${a.code}_clone`);
        if (!n) return;
        try {
          await this.store.cloneSelectedMenu(n);
        } catch (l) {
          this.showError(l);
        }
        return;
      }
      if (i.closest("[data-menu-archive]")) {
        const a = String(i.closest("[data-menu-archive]").dataset.menuArchive || "").trim() === "archive";
        try {
          await this.store.archiveSelectedMenu(a);
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-menu-add-root]")) {
        this.store.addRootItem();
        return;
      }
      if (i.closest("[data-menu-add-child]")) {
        const a = String(i.closest("[data-menu-add-child]").dataset.menuAddChild || "").trim();
        a && this.store.addChild(a);
        return;
      }
      if (i.closest("[data-menu-remove-item]")) {
        const a = String(i.closest("[data-menu-remove-item]").dataset.menuRemoveItem || "").trim();
        a && this.store.removeItem(a);
        return;
      }
      if (i.closest("[data-menu-save-items]")) {
        try {
          await this.store.saveItems();
        } catch (a) {
          this.showError(a);
        }
        return;
      }
      if (i.closest("[data-binding-save]")) {
        const a = this.root.querySelector('[data-binding-field="location"]'), n = this.root.querySelector('[data-binding-field="menu_code"]'), l = this.root.querySelector('[data-binding-field="view_profile_code"]'), c = this.root.querySelector('[data-binding-field="status"]'), u = this.root.querySelector('[data-binding-field="locale"]'), m = this.root.querySelector('[data-binding-field="priority"]'), p = String(a?.value || "").trim();
        if (!p) {
          this.showError(/* @__PURE__ */ new Error("Binding location is required"));
          return;
        }
        try {
          await this.store.upsertBinding(p, {
            location: p,
            menu_code: String(n?.value || "").trim(),
            view_profile_code: String(l?.value || "").trim(),
            status: String(c?.value || "draft").trim().toLowerCase(),
            locale: String(u?.value || "").trim(),
            priority: Number.parseInt(String(m?.value || "0").trim(), 10) || 0
          });
        } catch (v) {
          this.showError(v);
        }
        return;
      }
      if (i.closest("[data-profile-create]")) {
        const a = _("Profile code:", "footer");
        if (!a) return;
        try {
          await this.store.createProfile({
            code: a,
            name: a,
            mode: "full",
            status: "draft"
          });
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-profile-save]")) {
        const a = this.root.querySelector('[data-profile-field="code"]'), n = this.root.querySelector('[data-profile-field="name"]'), l = this.root.querySelector('[data-profile-field="mode"]'), c = this.root.querySelector('[data-profile-field="max_top_level"]'), u = this.root.querySelector('[data-profile-field="max_depth"]'), m = this.root.querySelector('[data-profile-field="include_item_ids"]'), p = this.root.querySelector('[data-profile-field="exclude_item_ids"]'), v = String(a?.value || "").trim();
        if (!v) {
          this.showError(/* @__PURE__ */ new Error("Select a profile to update"));
          return;
        }
        try {
          await this.store.updateProfile(v, {
            code: v,
            name: String(n?.value || "").trim(),
            mode: String(l?.value || "full").trim().toLowerCase(),
            max_top_level: Number.parseInt(String(c?.value || "").trim(), 10) || void 0,
            max_depth: Number.parseInt(String(u?.value || "").trim(), 10) || void 0,
            include_item_ids: T(String(m?.value || "")),
            exclude_item_ids: T(String(p?.value || ""))
          });
        } catch (B) {
          this.showError(B);
        }
        return;
      }
      if (i.closest("[data-profile-delete]")) {
        const a = this.root.querySelector('[data-profile-field="code"]'), n = String(a?.value || "").trim();
        if (!n || n === "full") {
          this.showError(/* @__PURE__ */ new Error("Select a non-default profile to delete"));
          return;
        }
        if (!window.confirm(`Delete profile "${n}"?`)) return;
        try {
          await this.store.deleteProfile(n);
        } catch (l) {
          this.showError(l);
        }
        return;
      }
      if (i.closest("[data-profile-publish]")) {
        const a = String(i.closest("[data-profile-publish]").dataset.profilePublish || "").trim(), n = this.root.querySelector('[data-profile-field="code"]'), l = String(n?.value || "").trim();
        if (!l) {
          this.showError(/* @__PURE__ */ new Error("Select a profile first"));
          return;
        }
        try {
          await this.store.publishProfile(l, a === "publish");
        } catch (c) {
          this.showError(c);
        }
        return;
      }
      if (i.closest("[data-preview-run]")) {
        const a = this.state?.selected_menu_id || "";
        if (!a) return;
        const n = this.root.querySelector('[data-preview-field="location"]'), l = this.root.querySelector('[data-preview-field="locale"]'), c = this.root.querySelector('[data-preview-field="view_profile"]'), u = this.root.querySelector('[data-preview-field="include_drafts"]'), m = this.root.querySelector('[data-preview-field="preview_token"]');
        try {
          await this.store.preview({
            menuId: a,
            location: String(n?.value || "").trim(),
            locale: String(l?.value || "").trim(),
            view_profile: String(c?.value || "").trim(),
            include_drafts: !!u?.checked,
            preview_token: String(m?.value || "").trim()
          });
        } catch (p) {
          this.showError(p);
        }
      }
    }, this.onChange = (r) => {
      const i = r.target, s = i.closest("[data-menu-item-field]");
      if (s) {
        const n = String(s.dataset.menuItemField || "").trim(), l = i, c = String(l.dataset.itemField || "").trim();
        if (!n || !c) return;
        const u = this.findItemByID(this.state?.draft_items || [], n);
        if (!u) return;
        if (c === "label") {
          this.store.updateItem(n, { label: String(l.value || "").trim() });
          return;
        }
        if (c === "target.type") {
          const p = String(l.value || "route").trim().toLowerCase();
          this.store.updateItem(n, { target: {
            type: p,
            path: p === "route" || p === "module" ? "/" : void 0,
            url: p === "external" ? "https://" : void 0,
            content_type: p === "content" ? "page" : void 0,
            slug: p === "content" ? "home" : void 0
          } });
          return;
        }
        const m = { ...u.target || { type: "route" } };
        if (c.startsWith("target.")) {
          const p = c.replace("target.", "");
          m[p] = String(l.value || "").trim(), this.store.updateItem(n, { target: m });
        }
        return;
      }
      const a = i.closest('[data-profile-field="code"]');
      a && this.syncSelectedProfile(a.value);
    }, this.onDragStart = (r) => {
      const i = r.target.closest("[data-menu-item-id]");
      if (!i) return;
      const s = String(i.dataset.menuItemId || "").trim();
      s && (this.dragItemID = s, i.classList.add("opacity-60"), r instanceof DragEvent && r.dataTransfer && (r.dataTransfer.effectAllowed = "move", r.dataTransfer.setData("text/plain", s)));
    }, this.onDragOver = (r) => {
      if (!(r instanceof DragEvent)) return;
      const i = r.target.closest("[data-drop-zone]");
      i && (r.preventDefault(), i.classList.add("bg-blue-100"));
    }, this.onDragLeave = (r) => {
      const i = r.target.closest("[data-drop-zone]");
      i && i.classList.remove("bg-blue-100");
    }, this.onDrop = (r) => {
      if (!(r instanceof DragEvent)) return;
      const i = r.target.closest("[data-drop-zone]");
      if (!i) return;
      r.preventDefault(), i.classList.remove("bg-blue-100");
      const s = String(i.dataset.dropTarget || "").trim(), a = String(i.dataset.dropMode || "inside").trim(), n = this.dragItemID || String(r.dataTransfer?.getData("text/plain") || "").trim();
      !n || !s || n === s || this.store.moveItem(n, s, a);
    }, this.onDragEnd = (r) => {
      this.dragItemID = "";
      const i = r.target.closest("[data-menu-item-id]");
      i && i.classList.remove("opacity-60"), this.root.querySelectorAll("[data-drop-zone]").forEach((s) => s.classList.remove("bg-blue-100"));
    }, this.root = t, this.config = e, this.store = new te(new X({ basePath: e.apiBasePath }));
  }
  async init() {
    this.root.addEventListener("click", this.onClick), this.root.addEventListener("change", this.onChange), this.root.addEventListener("dragstart", this.onDragStart), this.root.addEventListener("dragover", this.onDragOver), this.root.addEventListener("dragleave", this.onDragLeave), this.root.addEventListener("drop", this.onDrop), this.root.addEventListener("dragend", this.onDragEnd), this.store.addEventListener("change", (e) => {
      this.state = e.detail, this.render();
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
    const e = t.selected_menu, r = t.validation_issues.map((a) => `<li class="text-xs text-amber-700">${d(a.message)}</li>`).join(""), i = t.preview_result?.menu.items || [];
    this.root.innerHTML = `
      <div class="grid gap-6 lg:grid-cols-[280px,1fr,360px]">
        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 h-fit">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menus</h2>
            <button type="button" data-menu-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
          </div>
          <div class="space-y-2" data-menu-list>
            ${t.menus.length === 0 ? '<p class="text-sm text-gray-500">No menus yet.</p>' : t.menus.map((a) => this.renderMenuCard(a, t.selected_menu_id)).join("")}
          </div>
        </section>

        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-gray-900">${d(e?.name || "Menu Builder")}</h2>
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

          ${t.error ? `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${d(t.error)}</div>` : ""}

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600">
              Code
              <input data-menu-meta="code" value="${d(e?.code || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Name
              <input data-menu-meta="name" value="${d(e?.name || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Locale
              <input data-menu-meta="locale" value="${d(e?.locale || "")}" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Status
              <input value="${d(e?.status || "draft")}" disabled class="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-600" />
            </label>
          </div>

          <label class="text-xs text-gray-600 block">
            Description
            <textarea data-menu-meta="description" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">${d(e?.description || "")}</textarea>
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
                  ${t.menus.map((a) => `<option value="${d(a.code)}">${d(a.code)}</option>`).join("")}
                </select>
              </label>
              <label class="text-xs text-gray-600">View Profile
                <select data-binding-field="view_profile_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">full</option>
                  ${t.profiles.map((a) => `<option value="${d(a.code)}">${d(a.code)}</option>`).join("")}
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
                ${t.profiles.map((a) => `<option value="${d(a.code)}">${d(a.code)}</option>`).join("")}
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
                <div><strong>Items:</strong> ${i.length}</div>
                ${t.preview_result.simulation?.location ? `<div><strong>Location:</strong> ${d(t.preview_result.simulation.location)}</div>` : ""}
                ${t.preview_result.simulation?.view_profile ? `<div><strong>Profile:</strong> ${d(t.preview_result.simulation.view_profile)}</div>` : ""}
                <div><strong>Top Labels:</strong> ${d(i.map((a) => a.label).join(", ") || "(none)")}</div>
              </div>
            ` : ""}
          </div>
        </section>
      </div>
    `;
    const s = this.root.querySelector('[data-profile-field="code"]');
    s && s.value && this.syncSelectedProfile(s.value);
  }
  renderMenuCard(t, e) {
    const r = t.id === e;
    return `
      <button type="button"
              data-menu-select="${d(t.id)}"
              class="w-full text-left rounded-lg border px-3 py-2 ${r ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-800 truncate">${d(t.name || t.code)}</span>
          <span class="text-[10px] uppercase tracking-wide ${t.status === "published" ? "text-green-700" : "text-gray-500"}">${d(t.status)}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 truncate">${d(t.code)}</div>
      </button>
    `;
  }
  renderTree(t) {
    return `<ul class="space-y-2">${t.map((e) => this.renderTreeNode(e)).join("")}</ul>`;
  }
  renderTreeNode(t) {
    const e = String(t.target?.type || "route"), r = this.store.resolveTarget(t), i = this.renderTargetFields(t, e);
    return `
      <li class="rounded border border-gray-200" data-menu-item-id="${d(t.id)}" draggable="true">
        <div class="h-1 rounded-t bg-transparent" data-drop-zone data-drop-target="${d(t.id)}" data-drop-mode="before"></div>
        <div class="px-2 py-2 space-y-2" data-drop-zone data-drop-target="${d(t.id)}" data-drop-mode="inside">
          <div class="flex items-start gap-2" data-menu-item-field="${d(t.id)}">
            <span class="cursor-move text-gray-400 pt-1" title="Drag to reorder">⋮⋮</span>
            <div class="flex-1 grid gap-2 md:grid-cols-[1fr,140px]">
              <input
                data-item-field="label"
                value="${d(t.label)}"
                placeholder="Label"
                class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select data-item-field="target.type" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
                ${[
      "content",
      "route",
      "module",
      "external"
    ].map((s) => `<option value="${s}" ${s === e ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" data-menu-add-child="${d(t.id)}" class="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded">+Child</button>
              <button type="button" data-menu-remove-item="${d(t.id)}" class="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-100 rounded">Delete</button>
            </div>
          </div>
          <div data-menu-item-field="${d(t.id)}" class="grid gap-2 md:grid-cols-[1fr,auto]">
            ${i}
            <div class="text-[11px] ${r.valid ? "text-green-700" : "text-amber-700"}">
              <div class="font-semibold">${r.valid ? "Resolved URL" : "Validation"}</div>
              <div>${d(r.url || r.message)}</div>
            </div>
          </div>
          ${t.children && t.children.length > 0 ? this.renderTree(t.children) : ""}
        </div>
        <div class="h-1 rounded-b bg-transparent" data-drop-zone data-drop-target="${d(t.id)}" data-drop-mode="after"></div>
      </li>
    `;
  }
  renderTargetFields(t, e) {
    return e === "external" ? `
        <label class="text-xs text-gray-600">External URL
          <input data-item-field="target.url" value="${d(t.target?.url || "")}" placeholder="https://example.com" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : e === "content" ? `
        <div class="grid gap-2 md:grid-cols-2">
          <label class="text-xs text-gray-600">Content Type
            <input data-item-field="target.content_type" value="${d(t.target?.content_type || "")}" placeholder="page" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="text-xs text-gray-600">Slug / ID
            <input data-item-field="target.slug" value="${d(t.target?.slug || t.target?.id || "")}" placeholder="home" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
      ` : e === "module" ? `
        <label class="text-xs text-gray-600">Module Path
          <input data-item-field="target.path" value="${d(t.target?.path || t.target?.module || "")}" placeholder="/docs" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : `
      <label class="text-xs text-gray-600">Route Path
        <input data-item-field="target.path" value="${d(t.target?.path || t.target?.route || "")}" placeholder="/" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
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
                <td class="px-2 py-1">${d(e.location)}</td>
                <td class="px-2 py-1">${d(e.menu_code)}</td>
                <td class="px-2 py-1">${d(e.view_profile_code || "full")}</td>
                <td class="px-2 py-1">${d(e.status)}</td>
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
      const i = this.findItemByID(r.children || [], e);
      if (i) return i;
    }
    return null;
  }
  syncSelectedProfile(t) {
    const e = (this.state?.profiles || []).find((i) => i.code === t);
    if (!e) return;
    const r = (i, s) => {
      const a = this.root.querySelector(i);
      a && (a.value = s);
    };
    r('[data-profile-field="name"]', e.name || ""), r('[data-profile-field="mode"]', e.mode || "full"), r('[data-profile-field="max_top_level"]', e.max_top_level ? String(e.max_top_level) : ""), r('[data-profile-field="max_depth"]', e.max_depth ? String(e.max_depth) : ""), r('[data-profile-field="include_item_ids"]', (e.include_item_ids || []).join(",")), r('[data-profile-field="exclude_item_ids"]', (e.exclude_item_ids || []).join(","));
  }
  showError(t) {
    const e = this.root.parentElement?.querySelector("[data-menu-builder-error]") || null, r = this.formatError(t);
    if (e) {
      e.textContent = r, e.classList.remove("hidden");
      return;
    }
    console.error("[MenuBuilderUI]", r, t);
  }
  formatError(t) {
    if (t instanceof I) {
      const e = String(t.metadata?.field || "").trim();
      return e ? `${t.message} (${e})` : t.message;
    }
    return t instanceof Error ? t.message : String(t);
  }
};
async function ie(t) {
  const e = k("/", String(t.dataset.basePath || "/admin")), r = new re(t, {
    basePath: e,
    apiBasePath: O(e, String(t.dataset.apiBasePath || `${e}/api`)),
    initialMenuID: String(t.dataset.menuId || "").trim()
  });
  return await r.init(), r;
}
N(() => {
  document.querySelectorAll("[data-menu-builder-root]").forEach((t) => {
    t.dataset.initialized !== "true" && ie(t).then(() => {
      t.dataset.initialized = "true";
    }).catch((e) => {
      console.error("[menu-builder] failed to initialize", e), t.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${e instanceof Error ? e.message : String(e)}</div>`;
    });
  });
});
export {
  ue as EntryNavigationOverrideUI,
  X as MenuBuilderAPIClient,
  I as MenuBuilderAPIError,
  te as MenuBuilderStore,
  re as MenuBuilderUI,
  ce as initEntryNavigationOverrides,
  ie as initMenuBuilder,
  $ as parseMenuBindingRecord,
  J as parseMenuContracts,
  w as parseMenuItemNode,
  b as parseMenuRecord,
  y as parseMenuViewProfileRecord,
  Q as parseNavigationOverrides
};

//# sourceMappingURL=index.js.map