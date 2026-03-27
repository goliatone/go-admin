import { escapeHTML as u } from "../shared/html.js";
import { onReady as J } from "../shared/dom-ready.js";
const W = /* @__PURE__ */ new Set(["inherit", "show", "hide"]), G = /* @__PURE__ */ new Set(["draft", "published"]), H = /* @__PURE__ */ new Set(["content", "route", "module", "external"]), K = /* @__PURE__ */ new Set([
  "full",
  "top_level_limit",
  "max_depth",
  "include_ids",
  "exclude_ids",
  "composed"
]);
function g(a, e) {
  if (!a || typeof a != "object" || Array.isArray(a))
    throw new Error(`${e} must be an object`);
  return a;
}
function d(a, e, t = "") {
  return typeof a == "string" ? a.trim() : a == null ? t : String(a).trim();
}
function P(a) {
  return typeof a == "boolean" ? a : typeof a == "string" ? a.trim().toLowerCase() === "true" : !1;
}
function M(a, e = 0) {
  if (typeof a == "number" && Number.isFinite(a))
    return a;
  if (typeof a == "string") {
    const t = Number.parseInt(a.trim(), 10);
    if (Number.isFinite(t))
      return t;
  }
  return e;
}
function w(a) {
  return Array.isArray(a) ? a.map((e) => d(e)).filter((e) => e.length > 0) : [];
}
function T(a) {
  const e = d(a, "status", "draft").toLowerCase();
  return G.has(e) ? e : "draft";
}
function Q(a) {
  const e = d(a, "mode", "full").toLowerCase();
  return K.has(e) ? e : "full";
}
function X(a) {
  const e = g(a, "menu contracts"), t = g(e.endpoints, "menu contracts endpoints"), r = e.error_codes ?? e.errorCode ?? {}, i = g(r, "menu contracts error codes"), s = {};
  Object.entries(t).forEach(([l, c]) => {
    const p = d(c);
    p && (s[l] = p);
  });
  const n = {};
  Object.entries(i).forEach(([l, c]) => {
    const p = d(c);
    p && (n[l] = p);
  });
  const o = Y(e.content_navigation);
  return {
    endpoints: s,
    error_codes: n,
    content_navigation: o
  };
}
function Y(a) {
  if (!a || typeof a != "object" || Array.isArray(a))
    return;
  const e = a, t = e.endpoints, r = e.entry_navigation_overrides, i = e.validation, s = {};
  t && typeof t == "object" && !Array.isArray(t) && Object.entries(t).forEach(([o, l]) => {
    const c = d(l);
    c && (s[o] = c);
  });
  const n = {};
  if (Object.keys(s).length > 0 && (n.endpoints = s), r && typeof r == "object" && !Array.isArray(r)) {
    const o = r;
    n.entry_navigation_overrides = {
      value_enum: w(o.value_enum),
      write_endpoint: d(o.write_endpoint)
    };
  }
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const o = i, l = o.invalid_location, c = o.invalid_value;
    n.validation = {
      invalid_location: l && typeof l == "object" && !Array.isArray(l) ? {
        field_pattern: d(l.field_pattern),
        rule: d(l.rule),
        hint: d(l.hint)
      } : void 0,
      invalid_value: c && typeof c == "object" && !Array.isArray(c) ? {
        allowed_values: w(c.allowed_values)
      } : void 0
    };
  }
  return n;
}
function y(a) {
  const e = g(a, "menu record"), t = d(e.id, "menu.id", d(e.code, "menu.code")), r = d(e.code, "menu.code", t);
  if (!t || !r)
    throw new Error("menu record requires id and code");
  return {
    id: t,
    code: r,
    name: d(e.name, "menu.name", r),
    description: d(e.description),
    status: T(e.status),
    locale: d(e.locale),
    family_id: d(e.family_id),
    archived: P(e.archived),
    created_at: d(e.created_at),
    updated_at: d(e.updated_at),
    published_at: d(e.published_at),
    archived_at: d(e.archived_at)
  };
}
function L(a) {
  const e = g(a, "menu binding record"), t = d(e.location), r = d(e.menu_code);
  if (!t || !r)
    throw new Error("menu binding requires location and menu_code");
  return {
    id: d(e.id),
    location: t,
    menu_code: r,
    view_profile_code: d(e.view_profile_code),
    locale: d(e.locale),
    priority: M(e.priority, 0),
    status: T(e.status),
    created_at: d(e.created_at),
    updated_at: d(e.updated_at),
    published_at: d(e.published_at)
  };
}
function _(a) {
  const e = g(a, "menu view profile"), t = d(e.code);
  if (!t)
    throw new Error("menu view profile requires code");
  return {
    code: t,
    name: d(e.name, "profile.name", t),
    mode: Q(e.mode),
    max_top_level: M(e.max_top_level, 0) || void 0,
    max_depth: M(e.max_depth, 0) || void 0,
    include_item_ids: w(e.include_item_ids),
    exclude_item_ids: w(e.exclude_item_ids),
    status: T(e.status),
    created_at: d(e.created_at),
    updated_at: d(e.updated_at),
    published_at: d(e.published_at)
  };
}
function Z(a) {
  if (!a || typeof a != "object" || Array.isArray(a))
    return;
  const e = a, t = d(e.type).toLowerCase();
  if (H.has(t))
    return {
      type: t,
      id: d(e.id),
      slug: d(e.slug),
      content_type: d(e.content_type),
      path: d(e.path),
      route: d(e.route),
      module: d(e.module),
      url: d(e.url)
    };
}
function S(a, e = "menu item") {
  const t = g(a, e), r = d(t.id);
  if (!r)
    throw new Error(`${e} requires id`);
  const i = t.children ?? t.Items, s = Array.isArray(i) ? i.map((n, o) => S(n, `${e}.children[${o}]`)) : [];
  return {
    id: r,
    label: d(t.label, `${e}.label`, r),
    type: d(t.type),
    parent_id: d(t.parent_id ?? t.parentID ?? t.ParentID),
    target: Z(t.target ?? t.Target),
    children: s
  };
}
function ee(a) {
  const e = g(a, "menu preview response"), t = g(e.menu ?? e.data, "menu preview menu"), r = t.items ?? t.Items, i = Array.isArray(r) ? r.map((s, n) => S(s, `preview.menu.items[${n}]`)) : [];
  return {
    menu: {
      code: d(t.code ?? t.Code),
      items: i
    },
    simulation: e.simulation && typeof e.simulation == "object" && !Array.isArray(e.simulation) ? {
      requested_id: d(e.simulation.requested_id),
      location: d(e.simulation.location),
      locale: d(e.simulation.locale),
      view_profile: d(e.simulation.view_profile),
      include_drafts: P(e.simulation.include_drafts),
      preview_token_present: P(e.simulation.preview_token_present),
      binding: e.simulation.binding && typeof e.simulation.binding == "object" ? L(e.simulation.binding) : void 0,
      profile: e.simulation.profile && typeof e.simulation.profile == "object" ? _(e.simulation.profile) : void 0
    } : void 0
  };
}
function te(a, e = []) {
  if (!a || typeof a != "object" || Array.isArray(a))
    return {};
  const t = a, r = new Set(e.map((s) => s.trim()).filter(Boolean)), i = {};
  return Object.entries(t).forEach(([s, n]) => {
    const o = s.trim();
    if (!o)
      return;
    if (r.size > 0 && !r.has(o))
      throw new Error(`invalid navigation location: ${o}`);
    const l = d(n).toLowerCase();
    if (!W.has(l))
      throw new Error(`invalid navigation value for ${o}: ${String(n)}`);
    i[o] = l;
  }), i;
}
class $ extends Error {
  constructor(e, t = 500, r = "", i = {}) {
    super(e), this.name = "MenuBuilderAPIError", this.status = t, this.textCode = r, this.metadata = i;
  }
}
function b(a) {
  return !a || typeof a != "object" || Array.isArray(a) ? {} : a;
}
function N(a, e) {
  let t = a;
  return Object.entries(e).forEach(([r, i]) => {
    t = t.replace(`:${r}`, encodeURIComponent(String(i)));
  }), t;
}
function q(a, e) {
  return e ? /^https?:\/\//i.test(e) || e.startsWith("/") ? e : `${a.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : a;
}
class R {
  constructor(e) {
    this.contracts = null;
    const t = e.basePath.replace(/\/+$/, "");
    this.config = {
      basePath: t,
      contractsPath: e.contractsPath || `${t}/menu-contracts`,
      credentials: e.credentials ?? "same-origin",
      headers: e.headers ?? {}
    };
  }
  async loadContracts(e = !1) {
    if (this.contracts && !e)
      return this.contracts;
    const t = await this.fetchJSON(this.config.contractsPath, { method: "GET" }), r = b(t), i = X(r.contracts ?? r);
    return this.contracts = i, i;
  }
  async listMenus() {
    const e = await this.fetchFromEndpoint("menus", { method: "GET" });
    return (Array.isArray(e.menus) ? e.menus : Array.isArray(e.data) ? e.data : []).map((r) => y(r));
  }
  async getMenu(e) {
    const t = await this.fetchFromEndpoint("menus.id", {
      method: "GET",
      params: { id: e }
    }), r = y(t.menu ?? t.data ?? t), s = (Array.isArray(t.items) ? t.items : []).map((n, o) => S(n, `menu.items[${o}]`));
    return { menu: r, items: s };
  }
  async createMenu(e) {
    const t = await this.fetchFromEndpoint("menus", {
      method: "POST",
      body: e
    });
    return y(t.menu ?? t.data ?? t);
  }
  async updateMenu(e, t) {
    const r = await this.fetchFromEndpoint("menus.id", {
      method: "PUT",
      params: { id: e },
      body: t
    });
    return y(r.menu ?? r.data ?? r);
  }
  async publishMenu(e, t) {
    const r = t ? "menus.publish" : "menus.unpublish", i = await this.fetchFromEndpoint(r, {
      method: "POST",
      params: { id: e },
      body: {}
    });
    return y(i.menu ?? i.data ?? i);
  }
  async cloneMenu(e, t) {
    const r = await this.fetchFromEndpoint("menus.clone", {
      method: "POST",
      params: { id: e },
      body: { code: t }
    });
    return y(r.menu ?? r.data ?? r);
  }
  async archiveMenu(e, t) {
    const r = await this.fetchFromEndpoint("menus.archive", {
      method: "POST",
      params: { id: e },
      body: { archived: t }
    });
    return y(r.menu ?? r.data ?? r);
  }
  async upsertMenuItems(e, t) {
    const r = await this.fetchFromEndpoint("menus.items", {
      method: "PUT",
      params: { id: e },
      body: { items: t }
    }), i = b(r.menu ?? r.data ?? {});
    return (Array.isArray(i.items) ? i.items : Array.isArray(i.Items) ? i.Items : []).map((n, o) => S(n, `menu.items[${o}]`));
  }
  async previewMenu(e) {
    const t = new URLSearchParams();
    e.location && t.set("location", e.location), e.locale && t.set("locale", e.locale), e.view_profile && t.set("view_profile", e.view_profile), e.include_drafts && t.set("include_drafts", "true"), e.preview_token && t.set("preview_token", e.preview_token);
    const r = await this.fetchFromEndpoint("menus.preview", {
      method: "GET",
      params: { id: e.menuId },
      query: t
    });
    return ee(r);
  }
  async listBindings() {
    const e = await this.fetchFromEndpoint("menu.bindings", { method: "GET" });
    return (Array.isArray(e.bindings) ? e.bindings : Array.isArray(e.data) ? e.data : []).map((r) => L(r));
  }
  async upsertBinding(e, t) {
    const r = await this.fetchFromEndpoint("menu.bindings.location", {
      method: "PUT",
      params: { location: e },
      body: t
    });
    return L(r.binding ?? r.data ?? r);
  }
  async listProfiles() {
    const e = await this.fetchFromEndpoint("menu.view_profiles", { method: "GET" });
    return (Array.isArray(e.view_profiles) ? e.view_profiles : Array.isArray(e.profiles) ? e.profiles : Array.isArray(e.data) ? e.data : []).map((r) => _(r));
  }
  async createProfile(e) {
    const t = await this.fetchFromEndpoint("menu.view_profiles", {
      method: "POST",
      body: e
    });
    return _(t.view_profile ?? t.profile ?? t.data ?? t);
  }
  async updateProfile(e, t) {
    const r = await this.fetchFromEndpoint("menu.view_profiles.code", {
      method: "PUT",
      params: { code: e },
      body: t
    });
    return _(r.view_profile ?? r.profile ?? r.data ?? r);
  }
  async deleteProfile(e) {
    await this.fetchFromEndpoint("menu.view_profiles.code", {
      method: "DELETE",
      params: { code: e }
    });
  }
  async publishProfile(e, t) {
    const r = await this.fetchFromEndpoint("menu.view_profiles.publish", {
      method: "POST",
      params: { code: e },
      body: { publish: t }
    });
    return _(r.view_profile ?? r.profile ?? r.data ?? r);
  }
  async patchEntryNavigation(e, t, r, i = []) {
    let s = `${this.config.basePath}/content/:type/:id/navigation`;
    try {
      s = (await this.loadContracts()).content_navigation?.endpoints?.["content.navigation"] || s;
    } catch {
    }
    const n = q(this.config.basePath, N(s, { type: e, id: t })), o = await this.fetchJSON(n, {
      method: "PATCH",
      body: JSON.stringify({ _navigation: r }),
      headers: {
        "Content-Type": "application/json"
      }
    }), l = b(o), c = b(l.data ?? l);
    return {
      overrides: te(c._navigation, i),
      effective_visibility: b(c.effective_navigation_visibility)
    };
  }
  async fetchFromEndpoint(e, t) {
    const i = (await this.loadContracts()).endpoints[e];
    if (!i)
      throw new $(`missing endpoint contract for ${e}`, 500, "CONTRACT_MISSING");
    const s = q(this.config.basePath, N(i, t.params ?? {})), n = String(t.query ?? "").trim(), o = n ? `?${n}` : "", l = await this.fetchJSON(`${s}${o}`, {
      method: t.method,
      body: t.body ? JSON.stringify(t.body) : void 0,
      headers: t.body ? {
        "Content-Type": "application/json"
      } : void 0
    });
    return b(l);
  }
  async fetchJSON(e, t) {
    const r = await fetch(e, {
      ...t,
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        ...t.headers ?? {}
      }
    });
    let i = null;
    try {
      i = await r.json();
    } catch {
      i = null;
    }
    if (!r.ok) {
      const s = b(i?.error ?? i), n = String(s.message ?? (r.statusText || "request failed")).trim() || "request failed", o = String(s.text_code ?? "").trim(), l = b(s.metadata);
      throw new $(n, r.status, o, l);
    }
    return i;
  }
}
const re = {
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
function f(a) {
  return a.map((e) => ({
    ...e,
    target: e.target ? { ...e.target } : void 0,
    children: f(e.children || [])
  }));
}
function O(a, e = /* @__PURE__ */ new Set()) {
  return a.forEach((t) => {
    e.add(t.id), O(t.children || [], e);
  }), e;
}
function C(a, e) {
  const t = [];
  let r = null;
  return a.forEach((i) => {
    if (i.id === e) {
      r = {
        ...i,
        target: i.target ? { ...i.target } : void 0,
        children: f(i.children || [])
      };
      return;
    }
    const s = C(i.children || [], e);
    if (s.node && !r) {
      r = s.node, t.push({
        ...i,
        children: s.next
      });
      return;
    }
    t.push({
      ...i,
      children: f(i.children || [])
    });
  }), { node: r, next: t };
}
function k(a, e, t) {
  const r = [];
  let i = !1;
  return a.forEach((s) => {
    !i && s.id === e && (r.push(t), i = !0);
    const n = k(s.children || [], e, t);
    if (n.inserted) {
      i = !0, r.push({ ...s, children: n.items });
      return;
    }
    r.push({ ...s, children: f(s.children || []) });
  }), { inserted: i, items: r };
}
function F(a, e, t) {
  const r = [];
  let i = !1;
  return a.forEach((s) => {
    const n = F(s.children || [], e, t);
    if (n.inserted) {
      i = !0, r.push({ ...s, children: n.items });
      return;
    }
    r.push({ ...s, children: f(s.children || []) }), !i && s.id === e && (r.push(t), i = !0);
  }), { inserted: i, items: r };
}
function A(a, e, t) {
  let r = !1;
  const i = a.map((s) => {
    if (s.id === e)
      return r = !0, {
        ...s,
        children: [...f(s.children || []), t]
      };
    const n = A(s.children || [], e, t);
    return n.inserted ? (r = !0, {
      ...s,
      children: n.items
    }) : {
      ...s,
      children: f(s.children || [])
    };
  });
  return { inserted: r, items: i };
}
function ie(a) {
  const e = a.target;
  return !e || !e.type ? "" : e.type === "external" ? `external:${String(e.url || "").trim().toLowerCase()}` : e.type === "route" || e.type === "module" ? `${e.type}:${String(e.path || e.route || e.module || "").trim().toLowerCase()}` : `content:${String(e.content_type || "").trim().toLowerCase()}:${String(e.slug || e.id || "").trim().toLowerCase()}`;
}
function se(a) {
  const e = a.target;
  if (!e)
    return { url: "", valid: !1, message: "Target required" };
  switch (e.type) {
    case "external": {
      const t = String(e.url || "").trim(), r = /^https?:\/\//i.test(t);
      return {
        url: t,
        valid: r,
        message: r ? "Resolved external URL" : "External URL must start with http:// or https://"
      };
    }
    case "route": {
      const t = String(e.path || e.route || "").trim();
      return {
        url: t,
        valid: t.startsWith("/"),
        message: t.startsWith("/") ? "Resolved route path" : "Route path must start with /"
      };
    }
    case "module": {
      const t = String(e.path || e.module || "").trim();
      return {
        url: t,
        valid: t.startsWith("/"),
        message: t.startsWith("/") ? "Resolved module path" : "Module path must start with /"
      };
    }
    case "content": {
      const t = String(e.content_type || "").trim(), r = String(e.slug || e.id || "").trim(), i = t.length > 0 && r.length > 0;
      return {
        url: i ? `/${t}/${r}` : "",
        valid: i,
        message: i ? "Resolved content URL" : "Content target requires content type and slug/id"
      };
    }
    default:
      return { url: "", valid: !1, message: "Unsupported target type" };
  }
}
class z extends EventTarget {
  constructor(e) {
    super(), this.client = e, this.state = { ...re };
  }
  snapshot() {
    return {
      ...this.state,
      menus: [...this.state.menus],
      draft_items: f(this.state.draft_items),
      bindings: [...this.state.bindings],
      profiles: [...this.state.profiles],
      validation_issues: [...this.state.validation_issues],
      preview_result: this.state.preview_result ? {
        ...this.state.preview_result,
        menu: {
          ...this.state.preview_result.menu,
          items: f(this.state.preview_result.menu.items)
        }
      } : null
    };
  }
  async initialize() {
    this.setState({ loading: !0, error: "" });
    try {
      const e = await this.client.loadContracts(), [t, r, i] = await Promise.all([
        this.client.listMenus(),
        this.client.listBindings(),
        this.client.listProfiles()
      ]), s = t[0]?.id || "";
      this.setState({
        contracts: e,
        menus: t,
        bindings: r,
        profiles: i,
        selected_menu_id: s,
        loading: !1
      }), s && await this.selectMenu(s);
    } catch (e) {
      this.setState({
        loading: !1,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }
  async refreshMenus() {
    const e = await this.client.listMenus(), t = this.state.selected_menu_id, r = e.some((i) => i.id === t);
    this.setState({
      menus: e,
      selected_menu_id: r ? t : e[0]?.id || ""
    }), !r && e[0]?.id && await this.selectMenu(e[0].id);
  }
  async selectMenu(e) {
    const t = e.trim();
    if (!t) {
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
      selected_menu_id: t,
      selected_menu: null,
      draft_items: [],
      validation_issues: [],
      preview_result: null,
      loading: !0,
      error: ""
    });
    try {
      const r = await this.client.getMenu(t);
      this.setState({
        selected_menu_id: r.menu.id,
        selected_menu: r.menu,
        draft_items: f(r.items),
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
  async createMenu(e) {
    const t = await this.client.createMenu(e);
    await this.refreshMenus(), await this.selectMenu(t.id);
  }
  async updateMenu(e) {
    if (!this.state.selected_menu_id)
      return;
    const t = await this.client.updateMenu(this.state.selected_menu_id, e);
    this.setState({ selected_menu: t }), await this.refreshMenus();
  }
  async setPublishState(e) {
    if (!this.state.selected_menu_id)
      return;
    const t = await this.client.publishMenu(this.state.selected_menu_id, e);
    this.setState({ selected_menu: t }), await this.refreshMenus();
  }
  async cloneSelectedMenu(e) {
    if (!this.state.selected_menu_id)
      return;
    const t = await this.client.cloneMenu(this.state.selected_menu_id, e);
    await this.refreshMenus(), await this.selectMenu(t.id);
  }
  async archiveSelectedMenu(e) {
    if (!this.state.selected_menu_id)
      return;
    const t = await this.client.archiveMenu(this.state.selected_menu_id, e);
    this.setState({ selected_menu: t }), await this.refreshMenus();
  }
  setDraftItems(e) {
    const t = this.validateItems(e);
    this.setState({ draft_items: f(e), validation_issues: t });
  }
  addRootItem() {
    const e = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: "New Item",
      target: { type: "route", path: "/" },
      children: []
    };
    this.setDraftItems([...f(this.state.draft_items), e]);
  }
  updateItem(e, t) {
    const r = this.mapItems(this.state.draft_items, e, (i) => ({
      ...i,
      ...t,
      target: t.target ? { ...t.target } : i.target
    }));
    this.setDraftItems(r);
  }
  removeItem(e) {
    const t = C(this.state.draft_items, e);
    this.setDraftItems(t.next);
  }
  addChild(e) {
    const t = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: "New Child",
      target: { type: "route", path: "/" },
      children: []
    }, r = A(this.state.draft_items, e, t);
    r.inserted && this.setDraftItems(r.items);
  }
  moveItem(e, t, r) {
    if (!e || !t || e === t)
      return;
    const i = O(this.state.draft_items);
    if (!i.has(e) || !i.has(t))
      return;
    const s = C(this.state.draft_items, e);
    if (!s.node)
      return;
    let n;
    switch (r) {
      case "before":
        n = k(s.next, t, s.node);
        break;
      case "after":
        n = F(s.next, t, s.node);
        break;
      case "inside":
      default:
        n = A(s.next, t, s.node);
        break;
    }
    n.inserted && this.setDraftItems(n.items);
  }
  async saveItems() {
    if (!this.state.selected_menu_id)
      return;
    const e = this.validateItems(this.state.draft_items);
    if (this.setState({ validation_issues: e }), e.length > 0)
      throw new Error("Fix menu validation issues before saving");
    const t = await this.client.upsertMenuItems(this.state.selected_menu_id, this.state.draft_items);
    this.setState({ draft_items: f(t), validation_issues: [] });
  }
  async refreshBindings() {
    const e = await this.client.listBindings();
    this.setState({ bindings: e });
  }
  async upsertBinding(e, t) {
    await this.client.upsertBinding(e, t), await this.refreshBindings();
  }
  async refreshProfiles() {
    const e = await this.client.listProfiles();
    this.setState({ profiles: e });
  }
  async createProfile(e) {
    await this.client.createProfile(e), await this.refreshProfiles();
  }
  async updateProfile(e, t) {
    await this.client.updateProfile(e, t), await this.refreshProfiles();
  }
  async deleteProfile(e) {
    await this.client.deleteProfile(e), await this.refreshProfiles();
  }
  async publishProfile(e, t) {
    await this.client.publishProfile(e, t), await this.refreshProfiles();
  }
  async preview(e) {
    const t = await this.client.previewMenu(e);
    this.setState({ preview_result: t });
  }
  async patchEntryNavigation(e, t, r, i) {
    return this.client.patchEntryNavigation(e, t, r, i);
  }
  resolveTarget(e) {
    return se(e);
  }
  mapItems(e, t, r) {
    return e.map((i) => i.id === t ? r({ ...i, children: f(i.children || []) }) : {
      ...i,
      children: this.mapItems(i.children || [], t, r)
    });
  }
  validateItems(e) {
    const t = [], r = /* @__PURE__ */ new Map(), i = (s, n, o) => {
      s.label.trim() || t.push({
        code: "label_required",
        message: `Menu item ${s.id} requires a label`,
        item_id: s.id
      }), o.has(s.id) && t.push({
        code: "cycle",
        message: `Cycle detected at menu item ${s.id}`,
        item_id: s.id
      }), n > 8 && t.push({
        code: "depth",
        message: `Menu depth exceeds max level at ${s.id}`,
        item_id: s.id
      });
      const l = this.resolveTarget(s);
      l.valid || t.push({
        code: "invalid_target",
        message: `${s.label || s.id}: ${l.message}`,
        item_id: s.id
      });
      const c = ie(s);
      if (c) {
        const h = r.get(c);
        h && h !== s.id ? t.push({
          code: "duplicate_target",
          message: `Duplicate target detected between ${h} and ${s.id}`,
          item_id: s.id
        }) : r.set(c, s.id);
      }
      const p = new Set(o);
      p.add(s.id), (s.children || []).forEach((h) => i(h, n + 1, p));
    };
    return e.forEach((s) => i(s, 1, /* @__PURE__ */ new Set())), t;
  }
  setState(e) {
    const t = Object.prototype.hasOwnProperty.call(e, "selected_menu_id") && e.selected_menu_id !== this.state.selected_menu_id;
    this.state = {
      ...this.state,
      ...e
    }, t && !Object.prototype.hasOwnProperty.call(e, "preview_result") && (this.state.preview_result = null), this.dispatchEvent(new CustomEvent("change", { detail: this.snapshot() }));
  }
}
function E(a, e) {
  if (!a)
    return e;
  try {
    return JSON.parse(a);
  } catch {
    return e;
  }
}
function j(a) {
  return a.split(",").map((e) => e.trim()).filter(Boolean).filter((e, t, r) => r.indexOf(e) === t).sort();
}
function I(a, e = "") {
  const t = window.prompt(a, e);
  return String(t || "").trim();
}
function D(a, e) {
  return e ? e.startsWith("/") ? e : `${a.replace(/\/+$/, "")}/${e.replace(/^\/+/, "")}` : "";
}
function U(a, e) {
  const t = D(a, e || `${a}/api`);
  return /\/api(\/|$)/.test(t) ? t : `${t.replace(/\/+$/, "")}/api`;
}
function B(a) {
  return String(a || "").trim().toLowerCase() === "true";
}
class ae {
  constructor(e, t) {
    this.state = null, this.dragItemID = "", this.onClick = async (i) => {
      const s = i.target, n = s.closest("[data-menu-select]");
      if (n) {
        const o = String(n.dataset.menuSelect || "").trim();
        o && await this.store.selectMenu(o);
        return;
      }
      if (s.closest("[data-menu-create]")) {
        const o = I("New menu code (example: site.main):", "site.main");
        if (!o) return;
        try {
          await this.store.createMenu({ code: o, name: o, status: "draft" });
        } catch (l) {
          this.showError(l);
        }
        return;
      }
      if (s.closest("[data-menu-save-meta]")) {
        const o = this.root.querySelector('[data-menu-meta="code"]'), l = this.root.querySelector('[data-menu-meta="name"]'), c = this.root.querySelector('[data-menu-meta="locale"]'), p = this.root.querySelector('[data-menu-meta="description"]');
        try {
          await this.store.updateMenu({
            code: String(o?.value || "").trim(),
            name: String(l?.value || "").trim(),
            locale: String(c?.value || "").trim(),
            description: String(p?.value || "").trim()
          });
        } catch (h) {
          this.showError(h);
        }
        return;
      }
      if (s.closest("[data-menu-publish]")) {
        const o = String(s.closest("[data-menu-publish]").dataset.menuPublish || "").trim();
        try {
          await this.store.setPublishState(o === "publish");
        } catch (l) {
          this.showError(l);
        }
        return;
      }
      if (s.closest("[data-menu-clone]")) {
        const o = this.state?.selected_menu;
        if (!o) return;
        const l = I("Clone menu code:", `${o.code}_clone`);
        if (!l) return;
        try {
          await this.store.cloneSelectedMenu(l);
        } catch (c) {
          this.showError(c);
        }
        return;
      }
      if (s.closest("[data-menu-archive]")) {
        const l = String(s.closest("[data-menu-archive]").dataset.menuArchive || "").trim() === "archive";
        try {
          await this.store.archiveSelectedMenu(l);
        } catch (c) {
          this.showError(c);
        }
        return;
      }
      if (s.closest("[data-menu-add-root]")) {
        this.store.addRootItem();
        return;
      }
      if (s.closest("[data-menu-add-child]")) {
        const o = String(s.closest("[data-menu-add-child]").dataset.menuAddChild || "").trim();
        o && this.store.addChild(o);
        return;
      }
      if (s.closest("[data-menu-remove-item]")) {
        const o = String(s.closest("[data-menu-remove-item]").dataset.menuRemoveItem || "").trim();
        o && this.store.removeItem(o);
        return;
      }
      if (s.closest("[data-menu-save-items]")) {
        try {
          await this.store.saveItems();
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (s.closest("[data-binding-save]")) {
        const o = this.root.querySelector('[data-binding-field="location"]'), l = this.root.querySelector('[data-binding-field="menu_code"]'), c = this.root.querySelector('[data-binding-field="view_profile_code"]'), p = this.root.querySelector('[data-binding-field="status"]'), h = this.root.querySelector('[data-binding-field="locale"]'), v = this.root.querySelector('[data-binding-field="priority"]'), m = String(o?.value || "").trim();
        if (!m) {
          this.showError(new Error("Binding location is required"));
          return;
        }
        try {
          await this.store.upsertBinding(m, {
            location: m,
            menu_code: String(l?.value || "").trim(),
            view_profile_code: String(c?.value || "").trim(),
            status: String(p?.value || "draft").trim().toLowerCase(),
            locale: String(h?.value || "").trim(),
            priority: Number.parseInt(String(v?.value || "0").trim(), 10) || 0
          });
        } catch (x) {
          this.showError(x);
        }
        return;
      }
      if (s.closest("[data-profile-create]")) {
        const o = I("Profile code:", "footer");
        if (!o) return;
        try {
          await this.store.createProfile({ code: o, name: o, mode: "full", status: "draft" });
        } catch (l) {
          this.showError(l);
        }
        return;
      }
      if (s.closest("[data-profile-save]")) {
        const o = this.root.querySelector('[data-profile-field="code"]'), l = this.root.querySelector('[data-profile-field="name"]'), c = this.root.querySelector('[data-profile-field="mode"]'), p = this.root.querySelector('[data-profile-field="max_top_level"]'), h = this.root.querySelector('[data-profile-field="max_depth"]'), v = this.root.querySelector('[data-profile-field="include_item_ids"]'), m = this.root.querySelector('[data-profile-field="exclude_item_ids"]'), x = String(o?.value || "").trim();
        if (!x) {
          this.showError(new Error("Select a profile to update"));
          return;
        }
        try {
          await this.store.updateProfile(x, {
            code: x,
            name: String(l?.value || "").trim(),
            mode: String(c?.value || "full").trim().toLowerCase(),
            max_top_level: Number.parseInt(String(p?.value || "").trim(), 10) || void 0,
            max_depth: Number.parseInt(String(h?.value || "").trim(), 10) || void 0,
            include_item_ids: j(String(v?.value || "")),
            exclude_item_ids: j(String(m?.value || ""))
          });
        } catch (V) {
          this.showError(V);
        }
        return;
      }
      if (s.closest("[data-profile-delete]")) {
        const o = this.root.querySelector('[data-profile-field="code"]'), l = String(o?.value || "").trim();
        if (!l || l === "full") {
          this.showError(new Error("Select a non-default profile to delete"));
          return;
        }
        if (!window.confirm(`Delete profile "${l}"?`))
          return;
        try {
          await this.store.deleteProfile(l);
        } catch (c) {
          this.showError(c);
        }
        return;
      }
      if (s.closest("[data-profile-publish]")) {
        const o = String(s.closest("[data-profile-publish]").dataset.profilePublish || "").trim(), l = this.root.querySelector('[data-profile-field="code"]'), c = String(l?.value || "").trim();
        if (!c) {
          this.showError(new Error("Select a profile first"));
          return;
        }
        try {
          await this.store.publishProfile(c, o === "publish");
        } catch (p) {
          this.showError(p);
        }
        return;
      }
      if (s.closest("[data-preview-run]")) {
        const o = this.state?.selected_menu_id || "";
        if (!o) return;
        const l = this.root.querySelector('[data-preview-field="location"]'), c = this.root.querySelector('[data-preview-field="locale"]'), p = this.root.querySelector('[data-preview-field="view_profile"]'), h = this.root.querySelector('[data-preview-field="include_drafts"]'), v = this.root.querySelector('[data-preview-field="preview_token"]');
        try {
          await this.store.preview({
            menuId: o,
            location: String(l?.value || "").trim(),
            locale: String(c?.value || "").trim(),
            view_profile: String(p?.value || "").trim(),
            include_drafts: !!h?.checked,
            preview_token: String(v?.value || "").trim()
          });
        } catch (m) {
          this.showError(m);
        }
      }
    }, this.onChange = (i) => {
      const s = i.target, n = s.closest("[data-menu-item-field]");
      if (n) {
        const l = String(n.dataset.menuItemField || "").trim(), c = s, p = String(c.dataset.itemField || "").trim();
        if (!l || !p) return;
        const h = this.findItemByID(this.state?.draft_items || [], l);
        if (!h) return;
        if (p === "label") {
          this.store.updateItem(l, { label: String(c.value || "").trim() });
          return;
        }
        if (p === "target.type") {
          const m = String(c.value || "route").trim().toLowerCase();
          this.store.updateItem(l, {
            target: {
              type: m,
              path: m === "route" || m === "module" ? "/" : void 0,
              url: m === "external" ? "https://" : void 0,
              content_type: m === "content" ? "page" : void 0,
              slug: m === "content" ? "home" : void 0
            }
          });
          return;
        }
        const v = {
          ...h.target || { type: "route" }
        };
        if (p.startsWith("target.")) {
          const m = p.replace("target.", "");
          v[m] = String(c.value || "").trim(), this.store.updateItem(l, { target: v });
        }
        return;
      }
      const o = s.closest('[data-profile-field="code"]');
      o && this.syncSelectedProfile(o.value);
    }, this.onDragStart = (i) => {
      const n = i.target.closest("[data-menu-item-id]");
      if (!n) return;
      const o = String(n.dataset.menuItemId || "").trim();
      o && (this.dragItemID = o, n.classList.add("opacity-60"), i instanceof DragEvent && i.dataTransfer && (i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData("text/plain", o)));
    }, this.onDragOver = (i) => {
      if (!(i instanceof DragEvent)) return;
      const n = i.target.closest("[data-drop-zone]");
      n && (i.preventDefault(), n.classList.add("bg-blue-100"));
    }, this.onDragLeave = (i) => {
      const n = i.target.closest("[data-drop-zone]");
      n && n.classList.remove("bg-blue-100");
    }, this.onDrop = (i) => {
      if (!(i instanceof DragEvent)) return;
      const n = i.target.closest("[data-drop-zone]");
      if (!n) return;
      i.preventDefault(), n.classList.remove("bg-blue-100");
      const o = String(n.dataset.dropTarget || "").trim(), l = String(n.dataset.dropMode || "inside").trim(), c = this.dragItemID || String(i.dataTransfer?.getData("text/plain") || "").trim();
      !c || !o || c === o || this.store.moveItem(c, o, l);
    }, this.onDragEnd = (i) => {
      this.dragItemID = "";
      const n = i.target.closest("[data-menu-item-id]");
      n && n.classList.remove("opacity-60"), this.root.querySelectorAll("[data-drop-zone]").forEach((o) => o.classList.remove("bg-blue-100"));
    }, this.root = e, this.config = t;
    const r = new R({ basePath: t.apiBasePath });
    this.store = new z(r);
  }
  async init() {
    this.root.addEventListener("click", this.onClick), this.root.addEventListener("change", this.onChange), this.root.addEventListener("dragstart", this.onDragStart), this.root.addEventListener("dragover", this.onDragOver), this.root.addEventListener("dragleave", this.onDragLeave), this.root.addEventListener("drop", this.onDrop), this.root.addEventListener("dragend", this.onDragEnd), this.store.addEventListener("change", (t) => {
      const r = t.detail;
      this.state = r, this.render();
    }), await this.store.initialize();
    const e = String(this.config.initialMenuID || "").trim();
    e && await this.store.selectMenu(e);
  }
  destroy() {
    this.root.removeEventListener("click", this.onClick), this.root.removeEventListener("change", this.onChange), this.root.removeEventListener("dragstart", this.onDragStart), this.root.removeEventListener("dragover", this.onDragOver), this.root.removeEventListener("dragleave", this.onDragLeave), this.root.removeEventListener("drop", this.onDrop), this.root.removeEventListener("dragend", this.onDragEnd);
  }
  render() {
    const e = this.state;
    if (!e)
      return;
    const t = e.selected_menu, r = e.validation_issues.map((n) => `<li class="text-xs text-amber-700">${u(n.message)}</li>`).join(""), i = e.preview_result?.menu.items || [];
    this.root.innerHTML = `
      <div class="grid gap-6 lg:grid-cols-[280px,1fr,360px]">
        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 h-fit">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menus</h2>
            <button type="button" data-menu-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
          </div>
          <div class="space-y-2" data-menu-list>
            ${e.menus.length === 0 ? '<p class="text-sm text-gray-500">No menus yet.</p>' : e.menus.map((n) => this.renderMenuCard(n, e.selected_menu_id)).join("")}
          </div>
        </section>

        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-gray-900">${u(t?.name || "Menu Builder")}</h2>
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

          ${e.error ? `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${u(e.error)}</div>` : ""}

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600">
              Code
              <input data-menu-meta="code" value="${u(t?.code || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Name
              <input data-menu-meta="name" value="${u(t?.name || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Locale
              <input data-menu-meta="locale" value="${u(t?.locale || "")}" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Status
              <input value="${u(t?.status || "draft")}" disabled class="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-600" />
            </label>
          </div>

          <label class="text-xs text-gray-600 block">
            Description
            <textarea data-menu-meta="description" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">${u(t?.description || "")}</textarea>
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
            ${e.draft_items.length === 0 ? '<p class="text-sm text-gray-500">No menu items yet. Add a root item to start.</p>' : this.renderTree(e.draft_items)}
          </div>
        </section>

        <section class="space-y-4">
          <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-800">Location Binding Editor</h3>
            <p class="text-xs text-gray-500">Choose source menu and profile per location.</p>
            ${this.renderBindingList(e)}
            <div class="grid gap-2">
              <label class="text-xs text-gray-600">Location <input data-binding-field="location" placeholder="site.main" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></label>
              <label class="text-xs text-gray-600">Menu
                <select data-binding-field="menu_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Select menu</option>
                  ${e.menus.map((n) => `<option value="${u(n.code)}">${u(n.code)}</option>`).join("")}
                </select>
              </label>
              <label class="text-xs text-gray-600">View Profile
                <select data-binding-field="view_profile_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">full</option>
                  ${e.profiles.map((n) => `<option value="${u(n.code)}">${u(n.code)}</option>`).join("")}
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
                ${e.profiles.map((n) => `<option value="${u(n.code)}">${u(n.code)}</option>`).join("")}
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
            ${e.preview_result ? `
              <div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 space-y-1">
                <div><strong>Items:</strong> ${i.length}</div>
                ${e.preview_result.simulation?.location ? `<div><strong>Location:</strong> ${u(e.preview_result.simulation.location)}</div>` : ""}
                ${e.preview_result.simulation?.view_profile ? `<div><strong>Profile:</strong> ${u(e.preview_result.simulation.view_profile)}</div>` : ""}
                <div><strong>Top Labels:</strong> ${u(i.map((n) => n.label).join(", ") || "(none)")}</div>
              </div>
            ` : ""}
          </div>
        </section>
      </div>
    `;
    const s = this.root.querySelector('[data-profile-field="code"]');
    s && s.value && this.syncSelectedProfile(s.value);
  }
  renderMenuCard(e, t) {
    const r = e.id === t;
    return `
      <button type="button"
              data-menu-select="${u(e.id)}"
              class="w-full text-left rounded-lg border px-3 py-2 ${r ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-800 truncate">${u(e.name || e.code)}</span>
          <span class="text-[10px] uppercase tracking-wide ${e.status === "published" ? "text-green-700" : "text-gray-500"}">${u(e.status)}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 truncate">${u(e.code)}</div>
      </button>
    `;
  }
  renderTree(e) {
    return `<ul class="space-y-2">${e.map((t) => this.renderTreeNode(t)).join("")}</ul>`;
  }
  renderTreeNode(e) {
    const t = String(e.target?.type || "route"), r = this.store.resolveTarget(e), i = this.renderTargetFields(e, t);
    return `
      <li class="rounded border border-gray-200" data-menu-item-id="${u(e.id)}" draggable="true">
        <div class="h-1 rounded-t bg-transparent" data-drop-zone data-drop-target="${u(e.id)}" data-drop-mode="before"></div>
        <div class="px-2 py-2 space-y-2" data-drop-zone data-drop-target="${u(e.id)}" data-drop-mode="inside">
          <div class="flex items-start gap-2" data-menu-item-field="${u(e.id)}">
            <span class="cursor-move text-gray-400 pt-1" title="Drag to reorder">⋮⋮</span>
            <div class="flex-1 grid gap-2 md:grid-cols-[1fr,140px]">
              <input
                data-item-field="label"
                value="${u(e.label)}"
                placeholder="Label"
                class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select data-item-field="target.type" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
                ${["content", "route", "module", "external"].map((s) => `<option value="${s}" ${s === t ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" data-menu-add-child="${u(e.id)}" class="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded">+Child</button>
              <button type="button" data-menu-remove-item="${u(e.id)}" class="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-100 rounded">Delete</button>
            </div>
          </div>
          <div data-menu-item-field="${u(e.id)}" class="grid gap-2 md:grid-cols-[1fr,auto]">
            ${i}
            <div class="text-[11px] ${r.valid ? "text-green-700" : "text-amber-700"}">
              <div class="font-semibold">${r.valid ? "Resolved URL" : "Validation"}</div>
              <div>${u(r.url || r.message)}</div>
            </div>
          </div>
          ${e.children && e.children.length > 0 ? this.renderTree(e.children) : ""}
        </div>
        <div class="h-1 rounded-b bg-transparent" data-drop-zone data-drop-target="${u(e.id)}" data-drop-mode="after"></div>
      </li>
    `;
  }
  renderTargetFields(e, t) {
    return t === "external" ? `
        <label class="text-xs text-gray-600">External URL
          <input data-item-field="target.url" value="${u(e.target?.url || "")}" placeholder="https://example.com" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : t === "content" ? `
        <div class="grid gap-2 md:grid-cols-2">
          <label class="text-xs text-gray-600">Content Type
            <input data-item-field="target.content_type" value="${u(e.target?.content_type || "")}" placeholder="page" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="text-xs text-gray-600">Slug / ID
            <input data-item-field="target.slug" value="${u(e.target?.slug || e.target?.id || "")}" placeholder="home" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
      ` : t === "module" ? `
        <label class="text-xs text-gray-600">Module Path
          <input data-item-field="target.path" value="${u(e.target?.path || e.target?.module || "")}" placeholder="/docs" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : `
      <label class="text-xs text-gray-600">Route Path
        <input data-item-field="target.path" value="${u(e.target?.path || e.target?.route || "")}" placeholder="/" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
      </label>
    `;
  }
  renderBindingList(e) {
    return e.bindings.length === 0 ? '<p class="text-xs text-gray-500">No bindings configured.</p>' : `
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
            ${e.bindings.map((t) => `
              <tr>
                <td class="px-2 py-1">${u(t.location)}</td>
                <td class="px-2 py-1">${u(t.menu_code)}</td>
                <td class="px-2 py-1">${u(t.view_profile_code || "full")}</td>
                <td class="px-2 py-1">${u(t.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  findItemByID(e, t) {
    for (const r of e) {
      if (r.id === t)
        return r;
      const i = this.findItemByID(r.children || [], t);
      if (i)
        return i;
    }
    return null;
  }
  syncSelectedProfile(e) {
    const t = (this.state?.profiles || []).find((i) => i.code === e);
    if (!t) return;
    const r = (i, s) => {
      const n = this.root.querySelector(i);
      n && (n.value = s);
    };
    r('[data-profile-field="name"]', t.name || ""), r('[data-profile-field="mode"]', t.mode || "full"), r('[data-profile-field="max_top_level"]', t.max_top_level ? String(t.max_top_level) : ""), r('[data-profile-field="max_depth"]', t.max_depth ? String(t.max_depth) : ""), r('[data-profile-field="include_item_ids"]', (t.include_item_ids || []).join(",")), r('[data-profile-field="exclude_item_ids"]', (t.exclude_item_ids || []).join(","));
  }
  showError(e) {
    const t = this.root.parentElement?.querySelector("[data-menu-builder-error]") || null, r = this.formatError(e);
    if (t) {
      t.textContent = r, t.classList.remove("hidden");
      return;
    }
    console.error("[MenuBuilderUI]", r, e);
  }
  formatError(e) {
    if (e instanceof $) {
      const t = String(e.metadata?.field || "").trim();
      return t ? `${e.message} (${t})` : e.message;
    }
    return e instanceof Error ? e.message : String(e);
  }
}
class ne {
  constructor(e, t, r, i, s, n) {
    this.onChange = (o) => {
      const l = o.target;
      if (!l.matches("[data-navigation-location]"))
        return;
      const c = String(l.dataset.navigationLocation || "").trim(), p = String(l.value || "").trim().toLowerCase();
      c && ["inherit", "show", "hide"].includes(p) && (this.state.overrides[c] = p);
    }, this.onClick = async (o) => {
      o.target.closest("[data-navigation-save]") && await this.saveOverrides();
    }, this.root = e, this.store = t, this.contentType = r, this.recordID = i, this.config = s, this.state = n;
  }
  init() {
    this.root.addEventListener("change", this.onChange), this.root.addEventListener("click", this.onClick), this.render("");
  }
  destroy() {
    this.root.removeEventListener("change", this.onChange), this.root.removeEventListener("click", this.onClick);
  }
  async saveOverrides() {
    if (!this.config.enabled) {
      this.render("Navigation overrides are disabled for this content type.");
      return;
    }
    if (!this.config.allow_instance_override) {
      this.render("Instance overrides are disabled by content type policy.");
      return;
    }
    try {
      const e = await this.store.patchEntryNavigation(
        this.contentType,
        this.recordID,
        this.state.overrides,
        this.config.eligible_locations
      );
      this.state = {
        overrides: { ...e.overrides },
        effective_visibility: { ...e.effective_visibility }
      }, this.render("Saved entry navigation overrides.");
    } catch (e) {
      if (e instanceof $) {
        const t = String(e.metadata.field || "").trim();
        if (t.startsWith("_navigation.")) {
          this.render(`Invalid location: ${t.replace("_navigation.", "")}`);
          return;
        }
      }
      this.render(e instanceof Error ? e.message : String(e));
    }
  }
  render(e) {
    const t = this.config.eligible_locations.map((i) => {
      const s = this.state.overrides[i] || "inherit", n = this.state.effective_visibility[i] === !0;
      return `
          <div class="grid gap-2 md:grid-cols-[1fr,180px,120px] items-center">
            <div>
              <div class="text-sm font-medium text-gray-800">Show in ${u(i)}</div>
              <div class="text-xs text-gray-500">Tri-state: inherit, show, hide</div>
            </div>
            <select data-navigation-location="${u(i)}" class="rounded border border-gray-300 px-2 py-1.5 text-sm" ${this.config.allow_instance_override ? "" : "disabled"}>
              <option value="inherit" ${s === "inherit" ? "selected" : ""}>inherit</option>
              <option value="show" ${s === "show" ? "selected" : ""}>show</option>
              <option value="hide" ${s === "hide" ? "selected" : ""}>hide</option>
            </select>
            <span class="inline-flex justify-center rounded px-2 py-1 text-xs font-semibold ${n ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}">
              ${n ? "Visible" : "Hidden"}
            </span>
          </div>
        `;
    }).join(""), r = this.config.allow_instance_override ? "Overrides are applied per entry. Use inherit/show/hide to control each location." : "This content type has instance-level overrides disabled.";
    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3" data-entry-navigation-panel>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Entry Navigation Visibility</h3>
          <p class="text-xs text-gray-500">${u(r)}</p>
        </div>
        <div class="space-y-2">${t || '<p class="text-sm text-gray-500">No eligible locations configured.</p>'}</div>
        ${e ? `<div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">${u(e)}</div>` : ""}
        <div class="flex items-center justify-end">
          <button type="button" data-navigation-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700" ${this.config.allow_instance_override ? "" : "disabled"}>
            Save Visibility Overrides
          </button>
        </div>
      </section>
    `;
  }
}
function oe(a) {
  return {
    enabled: B(a.dataset.navigationEnabled),
    eligible_locations: E(a.dataset.navigationEligibleLocations, []),
    default_locations: E(a.dataset.navigationDefaultLocations, []),
    allow_instance_override: B(a.dataset.navigationAllowInstanceOverride),
    merge_mode: String(a.dataset.navigationMergeMode || "").trim()
  };
}
function le(a) {
  return {
    overrides: E(a.dataset.navigationOverrides, {}),
    effective_visibility: E(a.dataset.navigationEffectiveVisibility, {})
  };
}
async function de(a) {
  const e = D("/", String(a.dataset.basePath || "/admin")), t = U(e, String(a.dataset.apiBasePath || `${e}/api`)), r = String(a.dataset.menuId || "").trim(), i = new ae(a, {
    basePath: e,
    apiBasePath: t,
    initialMenuID: r
  });
  return await i.init(), i;
}
async function ce(a) {
  const e = String(a.dataset.panelName || "").trim(), t = String(a.dataset.recordId || "").trim();
  if (!e || !t)
    return null;
  const r = D("/", String(a.dataset.basePath || "/admin")), i = U(r, String(a.dataset.apiBasePath || `${r}/api`)), s = new z(new R({ basePath: i })), n = oe(a), o = le(a), l = new ne(a, s, e, t, n, o);
  return l.init(), l;
}
J(() => {
  document.querySelectorAll("[data-menu-builder-root]").forEach((a) => {
    a.dataset.initialized !== "true" && de(a).then(() => {
      a.dataset.initialized = "true";
    }).catch((e) => {
      console.error("[menu-builder] failed to initialize", e), a.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${e instanceof Error ? e.message : String(e)}</div>`;
    });
  }), document.querySelectorAll("[data-entry-navigation-root]").forEach((a) => {
    a.dataset.initialized !== "true" && ce(a).then(() => {
      a.dataset.initialized = "true";
    }).catch((e) => {
      console.error("[entry-navigation] failed to initialize", e), a.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${e instanceof Error ? e.message : String(e)}</div>`;
    });
  });
});
export {
  ne as EntryNavigationOverrideUI,
  R as MenuBuilderAPIClient,
  $ as MenuBuilderAPIError,
  z as MenuBuilderStore,
  ae as MenuBuilderUI,
  ce as initEntryNavigationOverrides,
  de as initMenuBuilder,
  L as parseMenuBindingRecord,
  X as parseMenuContracts,
  S as parseMenuItemNode,
  y as parseMenuRecord,
  _ as parseMenuViewProfileRecord,
  te as parseNavigationOverrides
};
//# sourceMappingURL=index.js.map
