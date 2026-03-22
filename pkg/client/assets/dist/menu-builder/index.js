var U = /* @__PURE__ */ new Set([
  "inherit",
  "show",
  "hide"
]), V = /* @__PURE__ */ new Set(["draft", "published"]), J = /* @__PURE__ */ new Set([
  "content",
  "route",
  "module",
  "external"
]), W = /* @__PURE__ */ new Set([
  "full",
  "top_level_limit",
  "max_depth",
  "include_ids",
  "exclude_ids",
  "composed"
]);
function f(e, t) {
  if (!e || typeof e != "object" || Array.isArray(e)) throw new Error(`${t} must be an object`);
  return e;
}
function d(e, t, r = "") {
  return typeof e == "string" ? e.trim() : e == null ? r : String(e).trim();
}
function E(e) {
  return typeof e == "boolean" ? e : typeof e == "string" ? e.trim().toLowerCase() === "true" : !1;
}
function I(e, t = 0) {
  if (typeof e == "number" && Number.isFinite(e)) return e;
  if (typeof e == "string") {
    const r = Number.parseInt(e.trim(), 10);
    if (Number.isFinite(r)) return r;
  }
  return t;
}
function x(e) {
  return Array.isArray(e) ? e.map((t) => d(t, "value")).filter((t) => t.length > 0) : [];
}
function C(e) {
  const t = d(e, "status", "draft").toLowerCase();
  return V.has(t) ? t : "draft";
}
function G(e) {
  const t = d(e, "mode", "full").toLowerCase();
  return W.has(t) ? t : "full";
}
function H(e) {
  const t = f(e, "menu contracts"), r = f(t.endpoints, "menu contracts endpoints"), i = f(t.error_codes ?? t.errorCode ?? {}, "menu contracts error codes"), a = {};
  Object.entries(r).forEach(([n, o]) => {
    const c = d(o, `endpoints.${n}`);
    c && (a[n] = c);
  });
  const s = {};
  return Object.entries(i).forEach(([n, o]) => {
    const c = d(o, `error_codes.${n}`);
    c && (s[n] = c);
  }), {
    endpoints: a,
    error_codes: s,
    content_navigation: K(t.content_navigation)
  };
}
function K(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return;
  const t = e, r = t.endpoints, i = t.entry_navigation_overrides, a = t.validation, s = {};
  r && typeof r == "object" && !Array.isArray(r) && Object.entries(r).forEach(([o, c]) => {
    const u = d(c, `content_navigation.endpoints.${o}`);
    u && (s[o] = u);
  });
  const n = {};
  if (Object.keys(s).length > 0 && (n.endpoints = s), i && typeof i == "object" && !Array.isArray(i)) {
    const o = i;
    n.entry_navigation_overrides = {
      value_enum: x(o.value_enum),
      write_endpoint: d(o.write_endpoint, "content_navigation.entry_navigation_overrides.write_endpoint")
    };
  }
  if (a && typeof a == "object" && !Array.isArray(a)) {
    const o = a, c = o.invalid_location, u = o.invalid_value;
    n.validation = {
      invalid_location: c && typeof c == "object" && !Array.isArray(c) ? {
        field_pattern: d(c.field_pattern, "invalid_location.field_pattern"),
        rule: d(c.rule, "invalid_location.rule"),
        hint: d(c.hint, "invalid_location.hint")
      } : void 0,
      invalid_value: u && typeof u == "object" && !Array.isArray(u) ? { allowed_values: x(u.allowed_values) } : void 0
    };
  }
  return n;
}
function v(e) {
  const t = f(e, "menu record"), r = d(t.id, "menu.id", d(t.code, "menu.code")), i = d(t.code, "menu.code", r);
  if (!r || !i) throw new Error("menu record requires id and code");
  return {
    id: r,
    code: i,
    name: d(t.name, "menu.name", i),
    description: d(t.description, "menu.description"),
    status: C(t.status),
    locale: d(t.locale, "menu.locale"),
    family_id: d(t.family_id, "menu.family_id"),
    archived: E(t.archived),
    created_at: d(t.created_at, "menu.created_at"),
    updated_at: d(t.updated_at, "menu.updated_at"),
    published_at: d(t.published_at, "menu.published_at"),
    archived_at: d(t.archived_at, "menu.archived_at")
  };
}
function P(e) {
  const t = f(e, "menu binding record"), r = d(t.location, "binding.location"), i = d(t.menu_code, "binding.menu_code");
  if (!r || !i) throw new Error("menu binding requires location and menu_code");
  return {
    id: d(t.id, "binding.id"),
    location: r,
    menu_code: i,
    view_profile_code: d(t.view_profile_code, "binding.view_profile_code"),
    locale: d(t.locale, "binding.locale"),
    priority: I(t.priority, 0),
    status: C(t.status),
    created_at: d(t.created_at, "binding.created_at"),
    updated_at: d(t.updated_at, "binding.updated_at"),
    published_at: d(t.published_at, "binding.published_at")
  };
}
function y(e) {
  const t = f(e, "menu view profile"), r = d(t.code, "profile.code");
  if (!r) throw new Error("menu view profile requires code");
  return {
    code: r,
    name: d(t.name, "profile.name", r),
    mode: G(t.mode),
    max_top_level: I(t.max_top_level, 0) || void 0,
    max_depth: I(t.max_depth, 0) || void 0,
    include_item_ids: x(t.include_item_ids),
    exclude_item_ids: x(t.exclude_item_ids),
    status: C(t.status),
    created_at: d(t.created_at, "profile.created_at"),
    updated_at: d(t.updated_at, "profile.updated_at"),
    published_at: d(t.published_at, "profile.published_at")
  };
}
function Q(e) {
  if (!e || typeof e != "object" || Array.isArray(e)) return;
  const t = e, r = d(t.type, "menu item target.type").toLowerCase();
  if (J.has(r))
    return {
      type: r,
      id: d(t.id, "target.id"),
      slug: d(t.slug, "target.slug"),
      content_type: d(t.content_type, "target.content_type"),
      path: d(t.path, "target.path"),
      route: d(t.route, "target.route"),
      module: d(t.module, "target.module"),
      url: d(t.url, "target.url")
    };
}
function _(e, t = "menu item") {
  const r = f(e, t), i = d(r.id, `${t}.id`);
  if (!i) throw new Error(`${t} requires id`);
  const a = r.children ?? r.Items, s = Array.isArray(a) ? a.map((n, o) => _(n, `${t}.children[${o}]`)) : [];
  return {
    id: i,
    label: d(r.label, `${t}.label`, i),
    type: d(r.type, `${t}.type`),
    parent_id: d(r.parent_id ?? r.parentID ?? r.ParentID, `${t}.parent_id`),
    target: Q(r.target ?? r.Target),
    children: s
  };
}
function X(e) {
  const t = f(e, "menu preview response"), r = f(t.menu ?? t.data, "menu preview menu"), i = r.items ?? r.Items, a = Array.isArray(i) ? i.map((s, n) => _(s, `preview.menu.items[${n}]`)) : [];
  return {
    menu: {
      code: d(r.code ?? r.Code, "preview.menu.code"),
      items: a
    },
    simulation: t.simulation && typeof t.simulation == "object" && !Array.isArray(t.simulation) ? {
      requested_id: d(t.simulation.requested_id, "preview.simulation.requested_id"),
      location: d(t.simulation.location, "preview.simulation.location"),
      locale: d(t.simulation.locale, "preview.simulation.locale"),
      view_profile: d(t.simulation.view_profile, "preview.simulation.view_profile"),
      include_drafts: E(t.simulation.include_drafts),
      preview_token_present: E(t.simulation.preview_token_present),
      binding: t.simulation.binding && typeof t.simulation.binding == "object" ? P(t.simulation.binding) : void 0,
      profile: t.simulation.profile && typeof t.simulation.profile == "object" ? y(t.simulation.profile) : void 0
    } : void 0
  };
}
function Y(e, t = []) {
  if (!e || typeof e != "object" || Array.isArray(e)) return {};
  const r = e, i = new Set(t.map((s) => s.trim()).filter(Boolean)), a = {};
  return Object.entries(r).forEach(([s, n]) => {
    const o = s.trim();
    if (!o) return;
    if (i.size > 0 && !i.has(o)) throw new Error(`invalid navigation location: ${o}`);
    const c = d(n, `_navigation.${o}`).toLowerCase();
    if (!U.has(c)) throw new Error(`invalid navigation value for ${o}: ${String(n)}`);
    a[o] = c;
  }), a;
}
var w = class extends Error {
  constructor(e, t = 500, r = "", i = {}) {
    super(e), this.name = "MenuBuilderAPIError", this.status = t, this.textCode = r, this.metadata = i;
  }
};
function g(e) {
  return !e || typeof e != "object" || Array.isArray(e) ? {} : e;
}
function T(e, t) {
  let r = e;
  return Object.entries(t).forEach(([i, a]) => {
    r = r.replace(`:${i}`, encodeURIComponent(String(a)));
  }), r;
}
function D(e, t) {
  return t ? /^https?:\/\//i.test(t) || t.startsWith("/") ? t : `${e.replace(/\/+$/, "")}/${t.replace(/^\/+/, "")}` : e;
}
var j = class {
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
    if (this.contracts && !e) return this.contracts;
    const t = g(await this.fetchJSON(this.config.contractsPath, { method: "GET" })), r = H(t.contracts ?? t);
    return this.contracts = r, r;
  }
  async listMenus() {
    const e = await this.fetchFromEndpoint("menus", { method: "GET" });
    return (Array.isArray(e.menus) ? e.menus : Array.isArray(e.data) ? e.data : []).map((t) => v(t));
  }
  async getMenu(e) {
    const t = await this.fetchFromEndpoint("menus.id", {
      method: "GET",
      params: { id: e }
    });
    return {
      menu: v(t.menu ?? t.data ?? t),
      items: (Array.isArray(t.items) ? t.items : []).map((r, i) => _(r, `menu.items[${i}]`))
    };
  }
  async createMenu(e) {
    const t = await this.fetchFromEndpoint("menus", {
      method: "POST",
      body: e
    });
    return v(t.menu ?? t.data ?? t);
  }
  async updateMenu(e, t) {
    const r = await this.fetchFromEndpoint("menus.id", {
      method: "PUT",
      params: { id: e },
      body: t
    });
    return v(r.menu ?? r.data ?? r);
  }
  async publishMenu(e, t) {
    const r = t ? "menus.publish" : "menus.unpublish", i = await this.fetchFromEndpoint(r, {
      method: "POST",
      params: { id: e },
      body: {}
    });
    return v(i.menu ?? i.data ?? i);
  }
  async cloneMenu(e, t) {
    const r = await this.fetchFromEndpoint("menus.clone", {
      method: "POST",
      params: { id: e },
      body: { code: t }
    });
    return v(r.menu ?? r.data ?? r);
  }
  async archiveMenu(e, t) {
    const r = await this.fetchFromEndpoint("menus.archive", {
      method: "POST",
      params: { id: e },
      body: { archived: t }
    });
    return v(r.menu ?? r.data ?? r);
  }
  async upsertMenuItems(e, t) {
    const r = await this.fetchFromEndpoint("menus.items", {
      method: "PUT",
      params: { id: e },
      body: { items: t }
    }), i = g(r.menu ?? r.data ?? {});
    return (Array.isArray(i.items) ? i.items : Array.isArray(i.Items) ? i.Items : []).map((a, s) => _(a, `menu.items[${s}]`));
  }
  async previewMenu(e) {
    const t = new URLSearchParams();
    return e.location && t.set("location", e.location), e.locale && t.set("locale", e.locale), e.view_profile && t.set("view_profile", e.view_profile), e.include_drafts && t.set("include_drafts", "true"), e.preview_token && t.set("preview_token", e.preview_token), X(await this.fetchFromEndpoint("menus.preview", {
      method: "GET",
      params: { id: e.menuId },
      query: t
    }));
  }
  async listBindings() {
    const e = await this.fetchFromEndpoint("menu.bindings", { method: "GET" });
    return (Array.isArray(e.bindings) ? e.bindings : Array.isArray(e.data) ? e.data : []).map((t) => P(t));
  }
  async upsertBinding(e, t) {
    const r = await this.fetchFromEndpoint("menu.bindings.location", {
      method: "PUT",
      params: { location: e },
      body: t
    });
    return P(r.binding ?? r.data ?? r);
  }
  async listProfiles() {
    const e = await this.fetchFromEndpoint("menu.view_profiles", { method: "GET" });
    return (Array.isArray(e.view_profiles) ? e.view_profiles : Array.isArray(e.profiles) ? e.profiles : Array.isArray(e.data) ? e.data : []).map((t) => y(t));
  }
  async createProfile(e) {
    const t = await this.fetchFromEndpoint("menu.view_profiles", {
      method: "POST",
      body: e
    });
    return y(t.view_profile ?? t.profile ?? t.data ?? t);
  }
  async updateProfile(e, t) {
    const r = await this.fetchFromEndpoint("menu.view_profiles.code", {
      method: "PUT",
      params: { code: e },
      body: t
    });
    return y(r.view_profile ?? r.profile ?? r.data ?? r);
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
    return y(r.view_profile ?? r.profile ?? r.data ?? r);
  }
  async patchEntryNavigation(e, t, r, i = []) {
    let a = `${this.config.basePath}/content/:type/:id/navigation`;
    try {
      a = (await this.loadContracts()).content_navigation?.endpoints?.["content.navigation"] || a;
    } catch {
    }
    const s = D(this.config.basePath, T(a, {
      type: e,
      id: t
    })), n = g(await this.fetchJSON(s, {
      method: "PATCH",
      body: JSON.stringify({ _navigation: r }),
      headers: { "Content-Type": "application/json" }
    })), o = g(n.data ?? n);
    return {
      overrides: Y(o._navigation, i),
      effective_visibility: g(o.effective_navigation_visibility)
    };
  }
  async fetchFromEndpoint(e, t) {
    const r = (await this.loadContracts()).endpoints[e];
    if (!r) throw new w(`missing endpoint contract for ${e}`, 500, "CONTRACT_MISSING");
    const i = D(this.config.basePath, T(r, t.params ?? {})), a = String(t.query ?? "").trim(), s = a ? `?${a}` : "";
    return g(await this.fetchJSON(`${i}${s}`, {
      method: t.method,
      body: t.body ? JSON.stringify(t.body) : void 0,
      headers: t.body ? { "Content-Type": "application/json" } : void 0
    }));
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
      const a = g(i?.error ?? i), s = String(a.message ?? (r.statusText || "request failed")).trim() || "request failed", n = String(a.text_code ?? "").trim(), o = g(a.metadata);
      throw new w(s, r.status, n, o);
    }
    return i;
  }
}, Z = {
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
function m(e) {
  return e.map((t) => ({
    ...t,
    target: t.target ? { ...t.target } : void 0,
    children: m(t.children || [])
  }));
}
function O(e, t = /* @__PURE__ */ new Set()) {
  return e.forEach((r) => {
    t.add(r.id), O(r.children || [], t);
  }), t;
}
function M(e, t) {
  const r = [];
  let i = null;
  return e.forEach((a) => {
    if (a.id === t) {
      i = {
        ...a,
        target: a.target ? { ...a.target } : void 0,
        children: m(a.children || [])
      };
      return;
    }
    const s = M(a.children || [], t);
    if (s.node && !i) {
      i = s.node, r.push({
        ...a,
        children: s.next
      });
      return;
    }
    r.push({
      ...a,
      children: m(a.children || [])
    });
  }), {
    node: i,
    next: r
  };
}
function B(e, t, r) {
  const i = [];
  let a = !1;
  return e.forEach((s) => {
    !a && s.id === t && (i.push(r), a = !0);
    const n = B(s.children || [], t, r);
    if (n.inserted) {
      a = !0, i.push({
        ...s,
        children: n.items
      });
      return;
    }
    i.push({
      ...s,
      children: m(s.children || [])
    });
  }), {
    inserted: a,
    items: i
  };
}
function R(e, t, r) {
  const i = [];
  let a = !1;
  return e.forEach((s) => {
    const n = R(s.children || [], t, r);
    if (n.inserted) {
      a = !0, i.push({
        ...s,
        children: n.items
      });
      return;
    }
    i.push({
      ...s,
      children: m(s.children || [])
    }), !a && s.id === t && (i.push(r), a = !0);
  }), {
    inserted: a,
    items: i
  };
}
function L(e, t, r) {
  let i = !1;
  const a = e.map((s) => {
    if (s.id === t)
      return i = !0, {
        ...s,
        children: [...m(s.children || []), r]
      };
    const n = L(s.children || [], t, r);
    return n.inserted ? (i = !0, {
      ...s,
      children: n.items
    }) : {
      ...s,
      children: m(s.children || [])
    };
  });
  return {
    inserted: i,
    items: a
  };
}
function ee(e) {
  const t = e.target;
  return !t || !t.type ? "" : t.type === "external" ? `external:${String(t.url || "").trim().toLowerCase()}` : t.type === "route" || t.type === "module" ? `${t.type}:${String(t.path || t.route || t.module || "").trim().toLowerCase()}` : `content:${String(t.content_type || "").trim().toLowerCase()}:${String(t.slug || t.id || "").trim().toLowerCase()}`;
}
function te(e) {
  const t = e.target;
  if (!t) return {
    url: "",
    valid: !1,
    message: "Target required"
  };
  switch (t.type) {
    case "external": {
      const r = String(t.url || "").trim(), i = /^https?:\/\//i.test(r);
      return {
        url: r,
        valid: i,
        message: i ? "Resolved external URL" : "External URL must start with http:// or https://"
      };
    }
    case "route": {
      const r = String(t.path || t.route || "").trim();
      return {
        url: r,
        valid: r.startsWith("/"),
        message: r.startsWith("/") ? "Resolved route path" : "Route path must start with /"
      };
    }
    case "module": {
      const r = String(t.path || t.module || "").trim();
      return {
        url: r,
        valid: r.startsWith("/"),
        message: r.startsWith("/") ? "Resolved module path" : "Module path must start with /"
      };
    }
    case "content": {
      const r = String(t.content_type || "").trim(), i = String(t.slug || t.id || "").trim(), a = r.length > 0 && i.length > 0;
      return {
        url: a ? `/${r}/${i}` : "",
        valid: a,
        message: a ? "Resolved content URL" : "Content target requires content type and slug/id"
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
var k = class extends EventTarget {
  constructor(e) {
    super(), this.client = e, this.state = { ...Z };
  }
  snapshot() {
    return {
      ...this.state,
      menus: [...this.state.menus],
      draft_items: m(this.state.draft_items),
      bindings: [...this.state.bindings],
      profiles: [...this.state.profiles],
      validation_issues: [...this.state.validation_issues],
      preview_result: this.state.preview_result ? {
        ...this.state.preview_result,
        menu: {
          ...this.state.preview_result.menu,
          items: m(this.state.preview_result.menu.items)
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
      const e = await this.client.loadContracts(), [t, r, i] = await Promise.all([
        this.client.listMenus(),
        this.client.listBindings(),
        this.client.listProfiles()
      ]), a = t[0]?.id || "";
      this.setState({
        contracts: e,
        menus: t,
        bindings: r,
        profiles: i,
        selected_menu_id: a,
        loading: !1
      }), a && await this.selectMenu(a);
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
        draft_items: m(r.items),
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
    if (!this.state.selected_menu_id) return;
    const t = await this.client.updateMenu(this.state.selected_menu_id, e);
    this.setState({ selected_menu: t }), await this.refreshMenus();
  }
  async setPublishState(e) {
    if (!this.state.selected_menu_id) return;
    const t = await this.client.publishMenu(this.state.selected_menu_id, e);
    this.setState({ selected_menu: t }), await this.refreshMenus();
  }
  async cloneSelectedMenu(e) {
    if (!this.state.selected_menu_id) return;
    const t = await this.client.cloneMenu(this.state.selected_menu_id, e);
    await this.refreshMenus(), await this.selectMenu(t.id);
  }
  async archiveSelectedMenu(e) {
    if (!this.state.selected_menu_id) return;
    const t = await this.client.archiveMenu(this.state.selected_menu_id, e);
    this.setState({ selected_menu: t }), await this.refreshMenus();
  }
  setDraftItems(e) {
    const t = this.validateItems(e);
    this.setState({
      draft_items: m(e),
      validation_issues: t
    });
  }
  addRootItem() {
    const e = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: "New Item",
      target: {
        type: "route",
        path: "/"
      },
      children: []
    };
    this.setDraftItems([...m(this.state.draft_items), e]);
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
    const t = M(this.state.draft_items, e);
    this.setDraftItems(t.next);
  }
  addChild(e) {
    const t = {
      id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: "New Child",
      target: {
        type: "route",
        path: "/"
      },
      children: []
    }, r = L(this.state.draft_items, e, t);
    r.inserted && this.setDraftItems(r.items);
  }
  moveItem(e, t, r) {
    if (!e || !t || e === t) return;
    const i = O(this.state.draft_items);
    if (!i.has(e) || !i.has(t)) return;
    const a = M(this.state.draft_items, e);
    if (!a.node) return;
    let s;
    switch (r) {
      case "before":
        s = B(a.next, t, a.node);
        break;
      case "after":
        s = R(a.next, t, a.node);
        break;
      default:
        s = L(a.next, t, a.node);
        break;
    }
    s.inserted && this.setDraftItems(s.items);
  }
  async saveItems() {
    if (!this.state.selected_menu_id) return;
    const e = this.validateItems(this.state.draft_items);
    if (this.setState({ validation_issues: e }), e.length > 0) throw new Error("Fix menu validation issues before saving");
    const t = await this.client.upsertMenuItems(this.state.selected_menu_id, this.state.draft_items);
    this.setState({
      draft_items: m(t),
      validation_issues: []
    });
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
    return te(e);
  }
  mapItems(e, t, r) {
    return e.map((i) => i.id === t ? r({
      ...i,
      children: m(i.children || [])
    }) : {
      ...i,
      children: this.mapItems(i.children || [], t, r)
    });
  }
  validateItems(e) {
    const t = [], r = /* @__PURE__ */ new Map(), i = (a, s, n) => {
      a.label.trim() || t.push({
        code: "label_required",
        message: `Menu item ${a.id} requires a label`,
        item_id: a.id
      }), n.has(a.id) && t.push({
        code: "cycle",
        message: `Cycle detected at menu item ${a.id}`,
        item_id: a.id
      }), s > 8 && t.push({
        code: "depth",
        message: `Menu depth exceeds max level at ${a.id}`,
        item_id: a.id
      });
      const o = this.resolveTarget(a);
      o.valid || t.push({
        code: "invalid_target",
        message: `${a.label || a.id}: ${o.message}`,
        item_id: a.id
      });
      const c = ee(a);
      if (c) {
        const h = r.get(c);
        h && h !== a.id ? t.push({
          code: "duplicate_target",
          message: `Duplicate target detected between ${h} and ${a.id}`,
          item_id: a.id
        }) : r.set(c, a.id);
      }
      const u = new Set(n);
      u.add(a.id), (a.children || []).forEach((h) => i(h, s + 1, u));
    };
    return e.forEach((a) => i(a, 1, /* @__PURE__ */ new Set())), t;
  }
  setState(e) {
    const t = Object.prototype.hasOwnProperty.call(e, "selected_menu_id") && e.selected_menu_id !== this.state.selected_menu_id;
    this.state = {
      ...this.state,
      ...e
    }, t && !Object.prototype.hasOwnProperty.call(e, "preview_result") && (this.state.preview_result = null), this.dispatchEvent(new CustomEvent("change", { detail: this.snapshot() }));
  }
};
function l(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function S(e, t) {
  if (!e) return t;
  try {
    return JSON.parse(e);
  } catch {
    return t;
  }
}
function q(e) {
  return e.split(",").map((t) => t.trim()).filter(Boolean).filter((t, r, i) => i.indexOf(t) === r).sort();
}
function $(e, t = "") {
  const r = window.prompt(e, t);
  return String(r || "").trim();
}
function A(e, t) {
  return t ? t.startsWith("/") ? t : `${e.replace(/\/+$/, "")}/${t.replace(/^\/+/, "")}` : "";
}
function F(e, t) {
  const r = A(e, t || `${e}/api`);
  return /\/api(\/|$)/.test(r) ? r : `${r.replace(/\/+$/, "")}/api`;
}
function N(e) {
  return String(e || "").trim().toLowerCase() === "true";
}
var re = class {
  constructor(e, t) {
    this.state = null, this.dragItemID = "", this.onClick = async (r) => {
      const i = r.target, a = i.closest("[data-menu-select]");
      if (a) {
        const s = String(a.dataset.menuSelect || "").trim();
        s && await this.store.selectMenu(s);
        return;
      }
      if (i.closest("[data-menu-create]")) {
        const s = $("New menu code (example: site.main):", "site.main");
        if (!s) return;
        try {
          await this.store.createMenu({
            code: s,
            name: s,
            status: "draft"
          });
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-menu-save-meta]")) {
        const s = this.root.querySelector('[data-menu-meta="code"]'), n = this.root.querySelector('[data-menu-meta="name"]'), o = this.root.querySelector('[data-menu-meta="locale"]'), c = this.root.querySelector('[data-menu-meta="description"]');
        try {
          await this.store.updateMenu({
            code: String(s?.value || "").trim(),
            name: String(n?.value || "").trim(),
            locale: String(o?.value || "").trim(),
            description: String(c?.value || "").trim()
          });
        } catch (u) {
          this.showError(u);
        }
        return;
      }
      if (i.closest("[data-menu-publish]")) {
        const s = String(i.closest("[data-menu-publish]").dataset.menuPublish || "").trim();
        try {
          await this.store.setPublishState(s === "publish");
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-menu-clone]")) {
        const s = this.state?.selected_menu;
        if (!s) return;
        const n = $("Clone menu code:", `${s.code}_clone`);
        if (!n) return;
        try {
          await this.store.cloneSelectedMenu(n);
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (i.closest("[data-menu-archive]")) {
        const s = String(i.closest("[data-menu-archive]").dataset.menuArchive || "").trim() === "archive";
        try {
          await this.store.archiveSelectedMenu(s);
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
        const s = String(i.closest("[data-menu-add-child]").dataset.menuAddChild || "").trim();
        s && this.store.addChild(s);
        return;
      }
      if (i.closest("[data-menu-remove-item]")) {
        const s = String(i.closest("[data-menu-remove-item]").dataset.menuRemoveItem || "").trim();
        s && this.store.removeItem(s);
        return;
      }
      if (i.closest("[data-menu-save-items]")) {
        try {
          await this.store.saveItems();
        } catch (s) {
          this.showError(s);
        }
        return;
      }
      if (i.closest("[data-binding-save]")) {
        const s = this.root.querySelector('[data-binding-field="location"]'), n = this.root.querySelector('[data-binding-field="menu_code"]'), o = this.root.querySelector('[data-binding-field="view_profile_code"]'), c = this.root.querySelector('[data-binding-field="status"]'), u = this.root.querySelector('[data-binding-field="locale"]'), h = this.root.querySelector('[data-binding-field="priority"]'), p = String(s?.value || "").trim();
        if (!p) {
          this.showError(/* @__PURE__ */ new Error("Binding location is required"));
          return;
        }
        try {
          await this.store.upsertBinding(p, {
            location: p,
            menu_code: String(n?.value || "").trim(),
            view_profile_code: String(o?.value || "").trim(),
            status: String(c?.value || "draft").trim().toLowerCase(),
            locale: String(u?.value || "").trim(),
            priority: Number.parseInt(String(h?.value || "0").trim(), 10) || 0
          });
        } catch (b) {
          this.showError(b);
        }
        return;
      }
      if (i.closest("[data-profile-create]")) {
        const s = $("Profile code:", "footer");
        if (!s) return;
        try {
          await this.store.createProfile({
            code: s,
            name: s,
            mode: "full",
            status: "draft"
          });
        } catch (n) {
          this.showError(n);
        }
        return;
      }
      if (i.closest("[data-profile-save]")) {
        const s = this.root.querySelector('[data-profile-field="code"]'), n = this.root.querySelector('[data-profile-field="name"]'), o = this.root.querySelector('[data-profile-field="mode"]'), c = this.root.querySelector('[data-profile-field="max_top_level"]'), u = this.root.querySelector('[data-profile-field="max_depth"]'), h = this.root.querySelector('[data-profile-field="include_item_ids"]'), p = this.root.querySelector('[data-profile-field="exclude_item_ids"]'), b = String(s?.value || "").trim();
        if (!b) {
          this.showError(/* @__PURE__ */ new Error("Select a profile to update"));
          return;
        }
        try {
          await this.store.updateProfile(b, {
            code: b,
            name: String(n?.value || "").trim(),
            mode: String(o?.value || "full").trim().toLowerCase(),
            max_top_level: Number.parseInt(String(c?.value || "").trim(), 10) || void 0,
            max_depth: Number.parseInt(String(u?.value || "").trim(), 10) || void 0,
            include_item_ids: q(String(h?.value || "")),
            exclude_item_ids: q(String(p?.value || ""))
          });
        } catch (z) {
          this.showError(z);
        }
        return;
      }
      if (i.closest("[data-profile-delete]")) {
        const s = this.root.querySelector('[data-profile-field="code"]'), n = String(s?.value || "").trim();
        if (!n || n === "full") {
          this.showError(/* @__PURE__ */ new Error("Select a non-default profile to delete"));
          return;
        }
        if (!window.confirm(`Delete profile "${n}"?`)) return;
        try {
          await this.store.deleteProfile(n);
        } catch (o) {
          this.showError(o);
        }
        return;
      }
      if (i.closest("[data-profile-publish]")) {
        const s = String(i.closest("[data-profile-publish]").dataset.profilePublish || "").trim(), n = this.root.querySelector('[data-profile-field="code"]'), o = String(n?.value || "").trim();
        if (!o) {
          this.showError(/* @__PURE__ */ new Error("Select a profile first"));
          return;
        }
        try {
          await this.store.publishProfile(o, s === "publish");
        } catch (c) {
          this.showError(c);
        }
        return;
      }
      if (i.closest("[data-preview-run]")) {
        const s = this.state?.selected_menu_id || "";
        if (!s) return;
        const n = this.root.querySelector('[data-preview-field="location"]'), o = this.root.querySelector('[data-preview-field="locale"]'), c = this.root.querySelector('[data-preview-field="view_profile"]'), u = this.root.querySelector('[data-preview-field="include_drafts"]'), h = this.root.querySelector('[data-preview-field="preview_token"]');
        try {
          await this.store.preview({
            menuId: s,
            location: String(n?.value || "").trim(),
            locale: String(o?.value || "").trim(),
            view_profile: String(c?.value || "").trim(),
            include_drafts: !!u?.checked,
            preview_token: String(h?.value || "").trim()
          });
        } catch (p) {
          this.showError(p);
        }
      }
    }, this.onChange = (r) => {
      const i = r.target, a = i.closest("[data-menu-item-field]");
      if (a) {
        const n = String(a.dataset.menuItemField || "").trim(), o = i, c = String(o.dataset.itemField || "").trim();
        if (!n || !c) return;
        const u = this.findItemByID(this.state?.draft_items || [], n);
        if (!u) return;
        if (c === "label") {
          this.store.updateItem(n, { label: String(o.value || "").trim() });
          return;
        }
        if (c === "target.type") {
          const p = String(o.value || "route").trim().toLowerCase();
          this.store.updateItem(n, { target: {
            type: p,
            path: p === "route" || p === "module" ? "/" : void 0,
            url: p === "external" ? "https://" : void 0,
            content_type: p === "content" ? "page" : void 0,
            slug: p === "content" ? "home" : void 0
          } });
          return;
        }
        const h = { ...u.target || { type: "route" } };
        if (c.startsWith("target.")) {
          const p = c.replace("target.", "");
          h[p] = String(o.value || "").trim(), this.store.updateItem(n, { target: h });
        }
        return;
      }
      const s = i.closest('[data-profile-field="code"]');
      s && this.syncSelectedProfile(s.value);
    }, this.onDragStart = (r) => {
      const i = r.target.closest("[data-menu-item-id]");
      if (!i) return;
      const a = String(i.dataset.menuItemId || "").trim();
      a && (this.dragItemID = a, i.classList.add("opacity-60"), r instanceof DragEvent && r.dataTransfer && (r.dataTransfer.effectAllowed = "move", r.dataTransfer.setData("text/plain", a)));
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
      const a = String(i.dataset.dropTarget || "").trim(), s = String(i.dataset.dropMode || "inside").trim(), n = this.dragItemID || String(r.dataTransfer?.getData("text/plain") || "").trim();
      !n || !a || n === a || this.store.moveItem(n, a, s);
    }, this.onDragEnd = (r) => {
      this.dragItemID = "";
      const i = r.target.closest("[data-menu-item-id]");
      i && i.classList.remove("opacity-60"), this.root.querySelectorAll("[data-drop-zone]").forEach((a) => a.classList.remove("bg-blue-100"));
    }, this.root = e, this.config = t, this.store = new k(new j({ basePath: t.apiBasePath }));
  }
  async init() {
    this.root.addEventListener("click", this.onClick), this.root.addEventListener("change", this.onChange), this.root.addEventListener("dragstart", this.onDragStart), this.root.addEventListener("dragover", this.onDragOver), this.root.addEventListener("dragleave", this.onDragLeave), this.root.addEventListener("drop", this.onDrop), this.root.addEventListener("dragend", this.onDragEnd), this.store.addEventListener("change", (t) => {
      this.state = t.detail, this.render();
    }), await this.store.initialize();
    const e = String(this.config.initialMenuID || "").trim();
    e && await this.store.selectMenu(e);
  }
  destroy() {
    this.root.removeEventListener("click", this.onClick), this.root.removeEventListener("change", this.onChange), this.root.removeEventListener("dragstart", this.onDragStart), this.root.removeEventListener("dragover", this.onDragOver), this.root.removeEventListener("dragleave", this.onDragLeave), this.root.removeEventListener("drop", this.onDrop), this.root.removeEventListener("dragend", this.onDragEnd);
  }
  render() {
    const e = this.state;
    if (!e) return;
    const t = e.selected_menu, r = e.validation_issues.map((s) => `<li class="text-xs text-amber-700">${l(s.message)}</li>`).join(""), i = e.preview_result?.menu.items || [];
    this.root.innerHTML = `
      <div class="grid gap-6 lg:grid-cols-[280px,1fr,360px]">
        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 h-fit">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-800 uppercase tracking-wide">Menus</h2>
            <button type="button" data-menu-create class="text-xs font-semibold text-blue-600 hover:text-blue-700">+ New</button>
          </div>
          <div class="space-y-2" data-menu-list>
            ${e.menus.length === 0 ? '<p class="text-sm text-gray-500">No menus yet.</p>' : e.menus.map((s) => this.renderMenuCard(s, e.selected_menu_id)).join("")}
          </div>
        </section>

        <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <header class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-gray-900">${l(t?.name || "Menu Builder")}</h2>
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

          ${e.error ? `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${l(e.error)}</div>` : ""}

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600">
              Code
              <input data-menu-meta="code" value="${l(t?.code || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Name
              <input data-menu-meta="name" value="${l(t?.name || "")}" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Locale
              <input data-menu-meta="locale" value="${l(t?.locale || "")}" placeholder="en" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </label>
            <label class="text-xs text-gray-600">
              Status
              <input value="${l(t?.status || "draft")}" disabled class="mt-1 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-600" />
            </label>
          </div>

          <label class="text-xs text-gray-600 block">
            Description
            <textarea data-menu-meta="description" rows="2" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">${l(t?.description || "")}</textarea>
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
                  ${e.menus.map((s) => `<option value="${l(s.code)}">${l(s.code)}</option>`).join("")}
                </select>
              </label>
              <label class="text-xs text-gray-600">View Profile
                <select data-binding-field="view_profile_code" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">full</option>
                  ${e.profiles.map((s) => `<option value="${l(s.code)}">${l(s.code)}</option>`).join("")}
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
                ${e.profiles.map((s) => `<option value="${l(s.code)}">${l(s.code)}</option>`).join("")}
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
                ${e.preview_result.simulation?.location ? `<div><strong>Location:</strong> ${l(e.preview_result.simulation.location)}</div>` : ""}
                ${e.preview_result.simulation?.view_profile ? `<div><strong>Profile:</strong> ${l(e.preview_result.simulation.view_profile)}</div>` : ""}
                <div><strong>Top Labels:</strong> ${l(i.map((s) => s.label).join(", ") || "(none)")}</div>
              </div>
            ` : ""}
          </div>
        </section>
      </div>
    `;
    const a = this.root.querySelector('[data-profile-field="code"]');
    a && a.value && this.syncSelectedProfile(a.value);
  }
  renderMenuCard(e, t) {
    const r = e.id === t;
    return `
      <button type="button"
              data-menu-select="${l(e.id)}"
              class="w-full text-left rounded-lg border px-3 py-2 ${r ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-gray-800 truncate">${l(e.name || e.code)}</span>
          <span class="text-[10px] uppercase tracking-wide ${e.status === "published" ? "text-green-700" : "text-gray-500"}">${l(e.status)}</span>
        </div>
        <div class="mt-0.5 text-xs text-gray-500 truncate">${l(e.code)}</div>
      </button>
    `;
  }
  renderTree(e) {
    return `<ul class="space-y-2">${e.map((t) => this.renderTreeNode(t)).join("")}</ul>`;
  }
  renderTreeNode(e) {
    const t = String(e.target?.type || "route"), r = this.store.resolveTarget(e), i = this.renderTargetFields(e, t);
    return `
      <li class="rounded border border-gray-200" data-menu-item-id="${l(e.id)}" draggable="true">
        <div class="h-1 rounded-t bg-transparent" data-drop-zone data-drop-target="${l(e.id)}" data-drop-mode="before"></div>
        <div class="px-2 py-2 space-y-2" data-drop-zone data-drop-target="${l(e.id)}" data-drop-mode="inside">
          <div class="flex items-start gap-2" data-menu-item-field="${l(e.id)}">
            <span class="cursor-move text-gray-400 pt-1" title="Drag to reorder">⋮⋮</span>
            <div class="flex-1 grid gap-2 md:grid-cols-[1fr,140px]">
              <input
                data-item-field="label"
                value="${l(e.label)}"
                placeholder="Label"
                class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select data-item-field="target.type" class="rounded border border-gray-300 px-2 py-1.5 text-sm">
                ${[
      "content",
      "route",
      "module",
      "external"
    ].map((a) => `<option value="${a}" ${a === t ? "selected" : ""}>${a}</option>`).join("")}
              </select>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" data-menu-add-child="${l(e.id)}" class="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded">+Child</button>
              <button type="button" data-menu-remove-item="${l(e.id)}" class="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-100 rounded">Delete</button>
            </div>
          </div>
          <div data-menu-item-field="${l(e.id)}" class="grid gap-2 md:grid-cols-[1fr,auto]">
            ${i}
            <div class="text-[11px] ${r.valid ? "text-green-700" : "text-amber-700"}">
              <div class="font-semibold">${r.valid ? "Resolved URL" : "Validation"}</div>
              <div>${l(r.url || r.message)}</div>
            </div>
          </div>
          ${e.children && e.children.length > 0 ? this.renderTree(e.children) : ""}
        </div>
        <div class="h-1 rounded-b bg-transparent" data-drop-zone data-drop-target="${l(e.id)}" data-drop-mode="after"></div>
      </li>
    `;
  }
  renderTargetFields(e, t) {
    return t === "external" ? `
        <label class="text-xs text-gray-600">External URL
          <input data-item-field="target.url" value="${l(e.target?.url || "")}" placeholder="https://example.com" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : t === "content" ? `
        <div class="grid gap-2 md:grid-cols-2">
          <label class="text-xs text-gray-600">Content Type
            <input data-item-field="target.content_type" value="${l(e.target?.content_type || "")}" placeholder="page" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="text-xs text-gray-600">Slug / ID
            <input data-item-field="target.slug" value="${l(e.target?.slug || e.target?.id || "")}" placeholder="home" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
      ` : t === "module" ? `
        <label class="text-xs text-gray-600">Module Path
          <input data-item-field="target.path" value="${l(e.target?.path || e.target?.module || "")}" placeholder="/docs" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      ` : `
      <label class="text-xs text-gray-600">Route Path
        <input data-item-field="target.path" value="${l(e.target?.path || e.target?.route || "")}" placeholder="/" class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
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
                <td class="px-2 py-1">${l(t.location)}</td>
                <td class="px-2 py-1">${l(t.menu_code)}</td>
                <td class="px-2 py-1">${l(t.view_profile_code || "full")}</td>
                <td class="px-2 py-1">${l(t.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  findItemByID(e, t) {
    for (const r of e) {
      if (r.id === t) return r;
      const i = this.findItemByID(r.children || [], t);
      if (i) return i;
    }
    return null;
  }
  syncSelectedProfile(e) {
    const t = (this.state?.profiles || []).find((i) => i.code === e);
    if (!t) return;
    const r = (i, a) => {
      const s = this.root.querySelector(i);
      s && (s.value = a);
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
    if (e instanceof w) {
      const t = String(e.metadata?.field || "").trim();
      return t ? `${e.message} (${t})` : e.message;
    }
    return e instanceof Error ? e.message : String(e);
  }
}, ie = class {
  constructor(e, t, r, i, a, s) {
    this.onChange = (n) => {
      const o = n.target;
      if (!o.matches("[data-navigation-location]")) return;
      const c = String(o.dataset.navigationLocation || "").trim(), u = String(o.value || "").trim().toLowerCase();
      c && [
        "inherit",
        "show",
        "hide"
      ].includes(u) && (this.state.overrides[c] = u);
    }, this.onClick = async (n) => {
      n.target.closest("[data-navigation-save]") && await this.saveOverrides();
    }, this.root = e, this.store = t, this.contentType = r, this.recordID = i, this.config = a, this.state = s;
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
      const e = await this.store.patchEntryNavigation(this.contentType, this.recordID, this.state.overrides, this.config.eligible_locations);
      this.state = {
        overrides: { ...e.overrides },
        effective_visibility: { ...e.effective_visibility }
      }, this.render("Saved entry navigation overrides.");
    } catch (e) {
      if (e instanceof w) {
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
      const a = this.state.overrides[i] || "inherit", s = this.state.effective_visibility[i] === !0;
      return `
          <div class="grid gap-2 md:grid-cols-[1fr,180px,120px] items-center">
            <div>
              <div class="text-sm font-medium text-gray-800">Show in ${l(i)}</div>
              <div class="text-xs text-gray-500">Tri-state: inherit, show, hide</div>
            </div>
            <select data-navigation-location="${l(i)}" class="rounded border border-gray-300 px-2 py-1.5 text-sm" ${this.config.allow_instance_override ? "" : "disabled"}>
              <option value="inherit" ${a === "inherit" ? "selected" : ""}>inherit</option>
              <option value="show" ${a === "show" ? "selected" : ""}>show</option>
              <option value="hide" ${a === "hide" ? "selected" : ""}>hide</option>
            </select>
            <span class="inline-flex justify-center rounded px-2 py-1 text-xs font-semibold ${s ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}">
              ${s ? "Visible" : "Hidden"}
            </span>
          </div>
        `;
    }).join(""), r = this.config.allow_instance_override ? "Overrides are applied per entry. Use inherit/show/hide to control each location." : "This content type has instance-level overrides disabled.";
    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl p-4 space-y-3" data-entry-navigation-panel>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Entry Navigation Visibility</h3>
          <p class="text-xs text-gray-500">${l(r)}</p>
        </div>
        <div class="space-y-2">${t || '<p class="text-sm text-gray-500">No eligible locations configured.</p>'}</div>
        ${e ? `<div class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">${l(e)}</div>` : ""}
        <div class="flex items-center justify-end">
          <button type="button" data-navigation-save class="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700" ${this.config.allow_instance_override ? "" : "disabled"}>
            Save Visibility Overrides
          </button>
        </div>
      </section>
    `;
  }
};
function ae(e) {
  return {
    enabled: N(e.dataset.navigationEnabled),
    eligible_locations: S(e.dataset.navigationEligibleLocations, []),
    default_locations: S(e.dataset.navigationDefaultLocations, []),
    allow_instance_override: N(e.dataset.navigationAllowInstanceOverride),
    merge_mode: String(e.dataset.navigationMergeMode || "").trim()
  };
}
function se(e) {
  return {
    overrides: S(e.dataset.navigationOverrides, {}),
    effective_visibility: S(e.dataset.navigationEffectiveVisibility, {})
  };
}
async function ne(e) {
  const t = A("/", String(e.dataset.basePath || "/admin")), r = new re(e, {
    basePath: t,
    apiBasePath: F(t, String(e.dataset.apiBasePath || `${t}/api`)),
    initialMenuID: String(e.dataset.menuId || "").trim()
  });
  return await r.init(), r;
}
async function oe(e) {
  const t = String(e.dataset.panelName || "").trim(), r = String(e.dataset.recordId || "").trim();
  if (!t || !r) return null;
  const i = A("/", String(e.dataset.basePath || "/admin")), a = new ie(e, new k(new j({ basePath: F(i, String(e.dataset.apiBasePath || `${i}/api`)) })), t, r, ae(e), se(e));
  return a.init(), a;
}
function de(e) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e, { once: !0 }) : e();
}
de(() => {
  document.querySelectorAll("[data-menu-builder-root]").forEach((e) => {
    e.dataset.initialized !== "true" && ne(e).then(() => {
      e.dataset.initialized = "true";
    }).catch((t) => {
      console.error("[menu-builder] failed to initialize", t), e.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${t instanceof Error ? t.message : String(t)}</div>`;
    });
  }), document.querySelectorAll("[data-entry-navigation-root]").forEach((e) => {
    e.dataset.initialized !== "true" && oe(e).then(() => {
      e.dataset.initialized = "true";
    }).catch((t) => {
      console.error("[entry-navigation] failed to initialize", t), e.innerHTML = `<div class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">${t instanceof Error ? t.message : String(t)}</div>`;
    });
  });
});
export {
  ie as EntryNavigationOverrideUI,
  j as MenuBuilderAPIClient,
  w as MenuBuilderAPIError,
  k as MenuBuilderStore,
  re as MenuBuilderUI,
  oe as initEntryNavigationOverrides,
  ne as initMenuBuilder,
  P as parseMenuBindingRecord,
  H as parseMenuContracts,
  _ as parseMenuItemNode,
  v as parseMenuRecord,
  y as parseMenuViewProfileRecord,
  Y as parseNavigationOverrides
};

//# sourceMappingURL=index.js.map