import { extractErrorMessage as Lt } from "../toast/error-helpers.js";
import { M as H, C as se, T as ie } from "../chunks/modal-DXPBR0f5.js";
import { r as Et } from "../chunks/icon-renderer-CRbgoQtj.js";
import { b as J } from "../chunks/badge-CqKzZ9y5.js";
class Te extends Error {
  constructor(e, t, r, a) {
    super(e), this.name = "ContentTypeAPIError", this.status = t, this.textCode = r, this.fields = a;
  }
}
class K {
  constructor(e) {
    this.environment = "";
    let t = e.basePath.replace(/\/+$/, "");
    t && !/\/api(\/|$)/.test(t) && (t = `${t}/api`), this.config = {
      basePath: t,
      headers: e.headers ?? {},
      credentials: e.credentials ?? "same-origin"
    };
  }
  /** Set the active environment for all subsequent API requests (Phase 12 — Task 12.3) */
  setEnvironment(e) {
    this.environment = e;
  }
  /** Get the current environment */
  getEnvironment() {
    return this.environment;
  }
  /** Get the configured base path */
  getBasePath() {
    return this.config.basePath;
  }
  /** Persist environment selection to the server session (Phase 12) */
  async setEnvironmentSession(e) {
    const t = `${this.config.basePath}/session/environment`;
    await this.fetch(t, {
      method: "POST",
      body: JSON.stringify({ environment: e })
    });
  }
  // ===========================================================================
  // Content Type CRUD
  // ===========================================================================
  /**
   * List all content types
   */
  async list(e) {
    const t = new URLSearchParams();
    e?.page && t.set("page", String(e.page)), e?.per_page && t.set("per_page", String(e.per_page)), e?.search && t.set("search", e.search);
    const r = t.toString(), a = `${this.config.basePath}/content_types${r ? `?${r}` : ""}`, i = await (await this.fetch(a, { method: "GET" })).json();
    return Array.isArray(i) ? { items: i, total: i.length } : i.items && Array.isArray(i.items) ? i : i.data && Array.isArray(i.data) ? { items: i.data, total: i.total ?? i.data.length } : { items: [], total: 0 };
  }
  /**
   * Get a single content type by ID or slug
   */
  async get(e) {
    const t = `${this.config.basePath}/content_types/${encodeURIComponent(e)}`, a = await (await this.fetch(t, { method: "GET" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Create a new content type
   */
  async create(e) {
    const t = `${this.config.basePath}/content_types`, a = await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Update an existing content type
   */
  async update(e, t) {
    const r = `${this.config.basePath}/content_types/${encodeURIComponent(e)}`, s = await (await this.fetch(r, {
      method: "PUT",
      body: JSON.stringify(t)
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Delete a content type
   */
  async delete(e) {
    const t = `${this.config.basePath}/content_types/${encodeURIComponent(e)}`;
    await this.fetch(t, { method: "DELETE" });
  }
  // ===========================================================================
  // Content Type Lifecycle (Publish, Clone, Deprecate)
  // ===========================================================================
  /**
   * Publish a content type (change status to active)
   */
  async publish(e, t) {
    const r = `${this.config.basePath}/content_types/${encodeURIComponent(e)}/publish`, s = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ force: t ?? !1 })
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Deprecate a content type
   */
  async deprecate(e) {
    const t = `${this.config.basePath}/content_types/${encodeURIComponent(e)}/deprecate`, a = await (await this.fetch(t, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Clone a content type
   */
  async clone(e, t, r) {
    const a = `${this.config.basePath}/content_types/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ slug: t, name: r })
    })).json();
    return i.item ?? i.data ?? i;
  }
  /**
   * Check compatibility between current schema and a new schema
   */
  async checkCompatibility(e, t, r) {
    const a = `${this.config.basePath}/content_types/${encodeURIComponent(e)}/compatibility`;
    return await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ schema: t, ui_schema: r })
    })).json();
  }
  /**
   * Get content type schema version history
   */
  async getVersionHistory(e) {
    const t = `${this.config.basePath}/content_types/${encodeURIComponent(e)}/versions`;
    try {
      const a = await (await this.fetch(t, { method: "GET" })).json();
      return { versions: a.versions ?? a.items ?? a ?? [] };
    } catch {
      return { versions: [] };
    }
  }
  // ===========================================================================
  // Schema Validation & Preview
  // ===========================================================================
  /**
   * Validate a JSON schema
   */
  async validateSchema(e) {
    const t = `${this.config.basePath}/content_types/validate`;
    return await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
  }
  /**
   * Generate a preview of the schema as a rendered form
   */
  async previewSchema(e) {
    const t = `${this.config.basePath}/content_types/preview`;
    return await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
  }
  // ===========================================================================
  // Block Definitions (for blocks field configuration)
  // ===========================================================================
  /**
   * List available block definitions (summary)
   */
  async listBlockDefinitionsSummary() {
    const e = `${this.config.basePath}/block_definitions`;
    try {
      const r = await (await this.fetch(e, { method: "GET" })).json();
      return Array.isArray(r) ? r : r.items && Array.isArray(r.items) ? r.items : r.data && Array.isArray(r.data) ? r.data : [];
    } catch {
      return [];
    }
  }
  /**
   * List block definitions with full details
   */
  async listBlockDefinitions(e) {
    const t = new URLSearchParams();
    e?.page && t.set("page", String(e.page)), e?.per_page && t.set("per_page", String(e.per_page)), e?.search && t.set("search", e.search), e?.category && t.set("filter_category", e.category), e?.status && t.set("filter_status", e.status);
    const r = t.toString(), a = `${this.config.basePath}/block_definitions${r ? `?${r}` : ""}`;
    try {
      const i = await (await this.fetch(a, { method: "GET" })).json();
      return Array.isArray(i) ? { items: i, total: i.length } : i.items && Array.isArray(i.items) ? i : i.data && Array.isArray(i.data) ? { items: i.data, total: i.total ?? i.data.length } : { items: [], total: 0 };
    } catch {
      return { items: [], total: 0 };
    }
  }
  /**
   * Get a single block definition by ID or type
   */
  async getBlockDefinition(e) {
    const t = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}`, a = await (await this.fetch(t, { method: "GET" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Create a new block definition
   */
  async createBlockDefinition(e) {
    const t = `${this.config.basePath}/block_definitions`, a = await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Update an existing block definition
   */
  async updateBlockDefinition(e, t) {
    const r = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}`, s = await (await this.fetch(r, {
      method: "PUT",
      body: JSON.stringify(t)
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Delete a block definition
   */
  async deleteBlockDefinition(e) {
    const t = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}`;
    await this.fetch(t, { method: "DELETE" });
  }
  /**
   * Publish a block definition (change status to active)
   */
  async publishBlockDefinition(e) {
    const t = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}/publish`, a = await (await this.fetch(t, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Deprecate a block definition
   */
  async deprecateBlockDefinition(e) {
    const t = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}/deprecate`, a = await (await this.fetch(t, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Clone a block definition
   */
  async cloneBlockDefinition(e, t, r) {
    const a = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ type: t, slug: r })
    })).json();
    return i.item ?? i.data ?? i;
  }
  /**
   * Get block definition schema version history
   */
  async getBlockDefinitionVersions(e) {
    const t = `${this.config.basePath}/block_definitions/${encodeURIComponent(e)}/versions`;
    try {
      const a = await (await this.fetch(t, { method: "GET" })).json();
      return { versions: a.versions ?? a.items ?? a ?? [] };
    } catch {
      return { versions: [] };
    }
  }
  /**
   * Get block categories
   */
  async getBlockCategories() {
    const e = `${this.config.basePath}/block_definitions_meta/categories`;
    try {
      const r = await (await this.fetch(e, { method: "GET" })).json();
      return Array.isArray(r) ? r : r.categories ?? [];
    } catch {
      return ["content", "media", "layout", "interactive", "custom"];
    }
  }
  // ===========================================================================
  // Field Types Registry (Phase 9)
  // ===========================================================================
  /**
   * Fetch field types from the backend registry.
   * Falls back to null if the endpoint is not available (Phase 3 not deployed).
   */
  async getFieldTypes() {
    const e = `${this.config.basePath}/block_definitions_meta/field_types`;
    try {
      const r = await (await this.fetch(e, { method: "GET" })).json();
      return Array.isArray(r) ? r : r.items && Array.isArray(r.items) ? r.items : r.field_types && Array.isArray(r.field_types) ? r.field_types : null;
    } catch {
      return null;
    }
  }
  /**
   * Fetch grouped field types from the backend registry.
   * Returns null when the endpoint does not expose grouped categories.
   */
  async getBlockFieldTypeGroups() {
    const e = `${this.config.basePath}/block_definitions_meta/field_types`;
    try {
      const r = await (await this.fetch(e, { method: "GET" })).json();
      return r && Array.isArray(r.categories) ? r.categories : null;
    } catch {
      return null;
    }
  }
  // ===========================================================================
  // Helpers
  // ===========================================================================
  async fetch(e, t) {
    const r = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers
    };
    if (this.environment) {
      r["X-Admin-Environment"] = this.environment;
      const s = e.includes("?") ? "&" : "?";
      e = `${e}${s}env=${encodeURIComponent(this.environment)}`;
    }
    const a = await fetch(e, {
      ...t,
      headers: r,
      credentials: this.config.credentials
    });
    return a.ok || await this.handleError(a), a;
  }
  async handleError(e) {
    let t = null;
    try {
      t = await e.clone().json();
    } catch {
    }
    const r = await Lt(e);
    let a = t?.text_code, s = t?.fields;
    if (t && typeof t.error == "object" && t.error) {
      const i = t.error;
      if (!a && typeof i.text_code == "string" && (a = i.text_code), !s) {
        const l = i.metadata?.fields;
        l && typeof l == "object" && (s = l);
      }
      if (!s && Array.isArray(i.validation_errors)) {
        const n = {};
        for (const l of i.validation_errors) {
          const d = typeof l.field == "string" ? l.field : "", c = typeof l.message == "string" ? l.message : "";
          d && c && (n[d] = c);
        }
        Object.keys(n).length > 0 && (s = n);
      }
    }
    throw new Te(r, e.status, a, s);
  }
}
function ge(o) {
  return JSON.parse(JSON.stringify(o));
}
function Ke(o, e) {
  return { ...o, ...e };
}
function q(o) {
  if (!o || o.length === 0)
    return [];
  const e = /* @__PURE__ */ new Set(), t = [];
  for (const r of o) {
    const a = String(r ?? "").trim();
    !a || e.has(a) || (e.add(a), t.push(a));
  }
  return t;
}
function We(o, e) {
  const t = q(o), r = q(e);
  if (t.length !== r.length)
    return !1;
  const a = new Set(r);
  return t.every((s) => a.has(s));
}
function jt(o) {
  if (typeof o != "string")
    return {};
  const e = o.trim();
  if (!e)
    return {};
  const t = e.lastIndexOf("/");
  return t === -1 || t === e.length - 1 ? { type: e } : {
    type: e.slice(t + 1),
    prefix: e.slice(0, t + 1)
  };
}
function Mt(o) {
  if (!Array.isArray(o) || o.length === 0)
    return null;
  const e = [];
  let t;
  for (const a of o) {
    if (!a || typeof a != "object")
      continue;
    const i = jt(a.$ref);
    i.type && (e.push(i.type), !t && i.prefix && (t = i.prefix));
  }
  if (e.length > 0)
    return { allowed: q(e), mode: "refs", refPrefix: t };
  const r = o.map((a) => {
    const i = a?.properties?._type;
    return typeof i?.const == "string" ? i.const : void 0;
  }).filter((a) => !!a);
  return r.length > 0 ? { allowed: q(r), mode: "inline" } : null;
}
function Tt(o) {
  const e = {
    type: "object",
    properties: {
      _type: {
        type: "string",
        description: "Block type discriminator"
      },
      _schema: {
        type: "string",
        description: "Block schema version"
      }
    },
    required: ["_type"]
  };
  return o && o.length > 0 && (e.oneOf = o.map((t) => ({
    type: "object",
    properties: {
      _type: { const: t }
    },
    required: ["_type"]
  })), e["x-discriminator"] = "_type"), e;
}
function Ft(o, e) {
  const t = typeof e == "string" && e.trim() ? e : "#/$defs/";
  return {
    oneOf: o.map((r) => ({
      $ref: `${t}${r}`
    }))
  };
}
function At(o, e) {
  if (!o)
    return ge(e);
  const t = ge(e), r = o.$defs ?? {}, a = t.$defs ?? {};
  (Object.keys(r).length > 0 || Object.keys(a).length > 0) && (t.$defs = Ke(r, a));
  const s = o.metadata, i = t.metadata;
  return (s || i) && (t.metadata = Ke(s ?? {}, i ?? {})), t;
}
function ye(o, e) {
  const t = {}, r = [];
  for (const s of o)
    t[s.name] = Pt(s), s.required && r.push(s.name);
  const a = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: t
  };
  return e && (a.$id = e), r.length > 0 && (a.required = r), a;
}
function at(o, e) {
  const t = ye(o, e);
  if (!e)
    return t;
  t.properties = t.properties ?? {}, t.properties._type = { type: "string", const: e };
  const r = new Set(t.required ?? []);
  return r.add("_type"), t.required = Array.from(r), t;
}
function Pt(o) {
  const e = {}, r = {
    text: { type: "string" },
    textarea: { type: "string" },
    "rich-text": { type: "string" },
    markdown: { type: "string" },
    code: { type: "string" },
    number: { type: "number" },
    integer: { type: "integer" },
    currency: { type: "number" },
    percentage: { type: "number" },
    select: { type: "string" },
    radio: { type: "string" },
    checkbox: { type: "boolean" },
    chips: { type: "array" },
    toggle: { type: "boolean" },
    date: { type: "string", format: "date" },
    time: { type: "string", format: "time" },
    datetime: { type: "string", format: "date-time" },
    daterange: { type: "object" },
    "media-picker": { type: "string", format: "uri" },
    "media-gallery": { type: "array" },
    "file-upload": { type: "string", format: "uri" },
    reference: { type: "string", format: "uuid" },
    references: { type: "array" },
    user: { type: "string", format: "uuid" },
    group: { type: "object" },
    repeater: { type: "array" },
    blocks: { type: "array" },
    json: { type: "object" },
    slug: { type: "string" },
    color: { type: "string" },
    location: { type: "object" }
  }[o.type] ?? { type: "string" };
  e.type = r.type, r.format && (e.format = r.format), o.label && (e.title = o.label), o.description && (e.description = o.description), o.defaultValue !== void 0 && (e.default = o.defaultValue), o.validation && (o.validation.minLength !== void 0 && (e.minLength = o.validation.minLength), o.validation.maxLength !== void 0 && (e.maxLength = o.validation.maxLength), o.validation.min !== void 0 && (e.minimum = o.validation.min), o.validation.max !== void 0 && (e.maximum = o.validation.max), o.validation.pattern && (e.pattern = o.validation.pattern));
  const a = {}, s = It(o.type);
  switch (s && (a.widget = s), o.placeholder && (a.placeholder = o.placeholder), o.helpText && (a.helpText = o.helpText), o.section && (a.section = o.section), o.order !== void 0 && (a.order = o.order), o.gridSpan !== void 0 && (a.grid = { span: o.gridSpan }), o.readonly && (a.readonly = !0), o.hidden && (a.hidden = !0), o.filterable && (a.filterable = !0), Object.keys(a).length > 0 && (e["x-formgen"] = a), o.filterable && (e["x-admin"] = { filterable: !0 }), o.type) {
    case "select":
    case "radio":
      o.config && "options" in o.config && o.config.options && (e.enum = o.config.options.map((i) => i.value));
      break;
    case "chips":
      e.items = { type: "string" }, o.config && "options" in o.config && o.config.options && (e.items.enum = o.config.options.map((i) => i.value));
      break;
    case "media-gallery":
    case "references":
      e.items = { type: "string", format: "uri" };
      break;
    case "repeater":
      o.config && "fields" in o.config && o.config.fields ? e.items = ye(o.config.fields) : e.items = { type: "string" };
      break;
    case "blocks": {
      const i = o.config, n = q(i?.allowedBlocks), l = q(i?.deniedBlocks), d = q(i?.__sourceAllowedBlocks), c = q(i?.__sourceDeniedBlocks), g = n.length > 0, m = l.length > 0, h = !We(n, d), b = !We(l, c), k = i?.__sourceItemsSchema, C = i?.__sourceRepresentation ?? "inline";
      k && !h ? e.items = ge(k) : C === "refs" && g ? e.items = Ft(n, i?.__sourceRefPrefix) : e.items = Tt(g ? n : void 0), i?.minBlocks !== void 0 && (e.minItems = i.minBlocks), i?.maxBlocks !== void 0 && (e.maxItems = i.maxBlocks);
      const y = {
        ...a,
        widget: i?.__sourceWidget || "block",
        sortable: i?.__sourceSortable ?? !0
      };
      g && (i?.__sourceHadAllowedBlocks || C !== "refs" || h) && (y.allowedBlocks = n), (m || i?.__sourceHadDeniedBlocks && b) && (y.deniedBlocks = l), e["x-formgen"] = y;
      break;
    }
  }
  return e;
}
function It(o) {
  return {
    textarea: "textarea",
    "rich-text": "rich-text",
    markdown: "markdown",
    code: "code-editor",
    toggle: "toggle",
    chips: "chips",
    "media-picker": "media-picker",
    "media-gallery": "media-picker",
    "file-upload": "file-upload",
    blocks: "block",
    json: "json-editor",
    slug: "slug",
    color: "color"
  }[o];
}
function me(o) {
  if (!o.properties)
    return [];
  const e = new Set(o.required ?? []), t = [];
  for (const [r, a] of Object.entries(o.properties))
    r === "_type" || r === "_schema" || t.push(_t(r, a, e.has(r)));
  return t.sort((r, a) => (r.order ?? 999) - (a.order ?? 999)), t;
}
function _t(o, e, t) {
  const r = e["x-formgen"], s = e["x-admin"]?.filterable ?? r?.filterable, i = {
    id: Z(),
    name: o,
    type: qt(e),
    label: e.title ?? Ye(o),
    description: e.description,
    placeholder: r?.placeholder,
    helpText: r?.helpText,
    required: t,
    readonly: r?.readonly,
    hidden: r?.hidden,
    filterable: s === !0,
    defaultValue: e.default,
    section: r?.section,
    gridSpan: r?.grid?.span,
    order: r?.order
  }, n = {};
  if (e.minLength !== void 0 && (n.minLength = e.minLength), e.maxLength !== void 0 && (n.maxLength = e.maxLength), e.minimum !== void 0 && (n.min = e.minimum), e.maximum !== void 0 && (n.max = e.maximum), e.pattern && (n.pattern = e.pattern), Object.keys(n).length > 0 && (i.validation = n), e.enum && Array.isArray(e.enum) && (i.config = {
    options: e.enum.map((l) => ({
      value: String(l),
      label: Ye(String(l))
    }))
  }), i.type === "blocks" && e.type === "array") {
    const l = {}, d = e.items ? ge(e.items) : void 0;
    d && (l.__sourceItemsSchema = d), typeof r?.widget == "string" && r.widget.trim() && (l.__sourceWidget = r.widget.trim()), typeof r?.sortable == "boolean" && (l.__sourceSortable = r.sortable), l.__sourceHadAllowedBlocks = Array.isArray(r?.allowedBlocks), l.__sourceHadDeniedBlocks = Array.isArray(r?.deniedBlocks), e.minItems !== void 0 && (l.minBlocks = e.minItems), e.maxItems !== void 0 && (l.maxBlocks = e.maxItems);
    const c = d?.oneOf ? Mt(d.oneOf) : null;
    c && (l.__sourceRepresentation = c.mode, c.refPrefix && (l.__sourceRefPrefix = c.refPrefix));
    let g;
    if (r?.allowedBlocks && Array.isArray(r.allowedBlocks)) {
      const m = q(r.allowedBlocks);
      g = c?.allowed.length ? c.allowed : m, m.length > 0 && (l.allowedBlocks = m);
    } else c?.allowed.length && (g = c.allowed, l.allowedBlocks = c.allowed);
    if (l.__sourceRepresentation || (l.__sourceRepresentation = "inline"), g && g.length > 0 && (l.__sourceAllowedBlocks = g), r?.deniedBlocks && Array.isArray(r.deniedBlocks)) {
      const m = q(r.deniedBlocks);
      m.length > 0 && (l.deniedBlocks = m), l.__sourceDeniedBlocks = m;
    }
    Object.keys(l).length > 0 && (i.config = l);
  }
  return i;
}
function qt(o) {
  const e = o["x-formgen"], t = Array.isArray(o.type) ? o.type[0] : o.type;
  switch (t) {
    case "array": {
      if (o.items) {
        const r = o.items;
        if (r.oneOf) return "blocks";
        if (r.enum) return "chips";
        if (e?.widget === "block") return "blocks";
        if (e?.widget === "chips") return "chips";
        if (e?.widget === "media-picker") return "media-gallery";
        if (r.format === "uuid" || r.format === "uri") return "references";
      }
      return "repeater";
    }
  }
  if (e?.widget) {
    const r = {
      textarea: "textarea",
      "rich-text": "rich-text",
      markdown: "markdown",
      "code-editor": "code",
      toggle: "toggle",
      chips: "chips",
      "media-picker": "media-picker",
      "file-upload": "file-upload",
      block: "blocks",
      "json-editor": "json",
      slug: "slug",
      color: "color"
    };
    if (r[e.widget])
      return r[e.widget];
  }
  switch (t) {
    case "string":
      return o.format === "date-time" ? "datetime" : o.format === "date" ? "date" : o.format === "time" ? "time" : o.format === "uri" ? "media-picker" : o.format === "uuid" ? "reference" : o.enum ? "select" : "text";
    case "number":
      return "number";
    case "integer":
      return "integer";
    case "boolean":
      return "toggle";
    case "object":
      return "json";
    default:
      return "text";
  }
}
function Z() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function Ye(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
const Dt = {
  // Text
  text: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8"></path></svg>',
  textarea: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6"></path></svg>',
  "rich-text": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  markdown: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>',
  code: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
  // Number
  number: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>',
  integer: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m-3-3v18"></path></svg>',
  currency: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  percentage: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 5L5 19M9 7a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>',
  // Selection
  select: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>',
  radio: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  checkbox: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  chips: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>',
  toggle: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="6" width="22" height="12" rx="6" stroke-width="2"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>',
  // Date/Time
  date: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  time: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  datetime: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13l-2 2-1-1"></path></svg>',
  // Media
  "media-picker": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  "media-gallery": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',
  "file-upload": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>',
  // Reference
  reference: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>',
  references: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8h2m2 0h-2m0 0V6m0 2v2"></path></svg>',
  user: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
  // Structural
  group: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>',
  repeater: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>',
  blocks: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"></path></svg>',
  // Advanced
  json: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
  slug: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 18h8"></path></svg>',
  color: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>',
  location: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
  // Category icons
  "cat-text": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8"></path></svg>',
  "cat-number": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>',
  "cat-selection": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>',
  "cat-datetime": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  "cat-media": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  "cat-reference": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>',
  "cat-structural": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>',
  "cat-advanced": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
};
function X(o) {
  return Dt[o] ?? "";
}
function P(o) {
  const e = o.trim().toLowerCase();
  return {
    string: "text",
    richtext: "rich-text",
    decimal: "number",
    boolean: "toggle",
    multiselect: "chips",
    image: "media-picker",
    file: "file-upload",
    url: "text",
    email: "text",
    hidden: "text"
  }[e] ?? e;
}
function v(o) {
  return X(o);
}
const we = [
  // Text Fields
  {
    type: "text",
    label: "Text",
    description: "Single line text input",
    icon: v("text"),
    category: "text",
    defaultConfig: { validation: { maxLength: 255 } }
  },
  {
    type: "textarea",
    label: "Textarea",
    description: "Multi-line text input",
    icon: v("textarea"),
    category: "text",
    defaultConfig: { config: { multiline: !0, rows: 4 } }
  },
  {
    type: "rich-text",
    label: "Rich Text",
    description: "WYSIWYG editor with formatting",
    icon: v("rich-text"),
    category: "text"
  },
  {
    type: "markdown",
    label: "Markdown",
    description: "Markdown text editor",
    icon: v("markdown"),
    category: "text"
  },
  {
    type: "code",
    label: "Code",
    description: "Code editor with syntax highlighting",
    icon: v("code"),
    category: "text",
    defaultConfig: { config: { language: "json", lineNumbers: !0 } }
  },
  // Number Fields
  {
    type: "number",
    label: "Number",
    description: "Decimal number input",
    icon: v("number"),
    category: "number"
  },
  {
    type: "integer",
    label: "Integer",
    description: "Whole number input",
    icon: v("integer"),
    category: "number"
  },
  {
    type: "currency",
    label: "Currency",
    description: "Money amount with currency symbol",
    icon: v("currency"),
    category: "number",
    defaultConfig: { config: { precision: 2, prefix: "$" } }
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "Percentage value (0-100)",
    icon: v("percentage"),
    category: "number",
    defaultConfig: { validation: { min: 0, max: 100 }, config: { suffix: "%" } }
  },
  // Selection Fields
  {
    type: "select",
    label: "Select",
    description: "Dropdown selection",
    icon: v("select"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "radio",
    label: "Radio",
    description: "Radio button selection",
    icon: v("radio"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "checkbox",
    label: "Checkbox",
    description: "Single checkbox (true/false)",
    icon: v("checkbox"),
    category: "selection"
  },
  {
    type: "chips",
    label: "Chips",
    description: "Tag-style multi-select",
    icon: v("chips"),
    category: "selection",
    defaultConfig: { config: { options: [], multiple: !0 } }
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "Boolean switch",
    icon: v("toggle"),
    category: "selection"
  },
  // Date/Time Fields
  {
    type: "date",
    label: "Date",
    description: "Date picker",
    icon: v("date"),
    category: "datetime"
  },
  {
    type: "time",
    label: "Time",
    description: "Time picker",
    icon: v("time"),
    category: "datetime"
  },
  {
    type: "datetime",
    label: "Date & Time",
    description: "Date and time picker",
    icon: v("datetime"),
    category: "datetime"
  },
  // Media Fields
  {
    type: "media-picker",
    label: "Media",
    description: "Single media asset picker",
    icon: v("media-picker"),
    category: "media",
    defaultConfig: { config: { accept: "image/*" } }
  },
  {
    type: "media-gallery",
    label: "Gallery",
    description: "Multiple media assets",
    icon: v("media-gallery"),
    category: "media",
    defaultConfig: { config: { accept: "image/*", multiple: !0 } }
  },
  {
    type: "file-upload",
    label: "File",
    description: "File attachment",
    icon: v("file-upload"),
    category: "media"
  },
  // Reference Fields
  {
    type: "reference",
    label: "Reference",
    description: "Link to another content type",
    icon: v("reference"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name" } }
  },
  {
    type: "references",
    label: "References",
    description: "Multiple links to another content type",
    icon: v("references"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name", multiple: !0 } }
  },
  {
    type: "user",
    label: "User",
    description: "User reference",
    icon: v("user"),
    category: "reference"
  },
  // Structural Fields
  {
    type: "group",
    label: "Group",
    description: "Collapsible field group",
    icon: v("group"),
    category: "structural"
  },
  {
    type: "repeater",
    label: "Repeater",
    description: "Repeatable field group",
    icon: v("repeater"),
    category: "structural",
    defaultConfig: { config: { fields: [], minItems: 0, maxItems: 10 } }
  },
  {
    type: "blocks",
    label: "Blocks",
    description: "Modular content blocks",
    icon: v("blocks"),
    category: "structural",
    defaultConfig: { config: { allowedBlocks: [] } }
  },
  // Advanced Fields
  {
    type: "json",
    label: "JSON",
    description: "Raw JSON editor",
    icon: v("json"),
    category: "advanced"
  },
  {
    type: "slug",
    label: "Slug",
    description: "URL-friendly identifier",
    icon: v("slug"),
    category: "advanced",
    defaultConfig: { validation: { pattern: "^[a-z0-9-]+$" } }
  },
  {
    type: "color",
    label: "Color",
    description: "Color picker",
    icon: v("color"),
    category: "advanced"
  },
  {
    type: "location",
    label: "Location",
    description: "Geographic coordinates",
    icon: v("location"),
    category: "advanced"
  }
], st = [
  { id: "text", label: "Text", icon: v("cat-text") },
  { id: "number", label: "Numbers", icon: v("cat-number") },
  { id: "selection", label: "Selection", icon: v("cat-selection") },
  { id: "datetime", label: "Date & Time", icon: v("cat-datetime") },
  { id: "media", label: "Media", icon: v("cat-media") },
  { id: "reference", label: "References", icon: v("cat-reference") },
  { id: "structural", label: "Structural", icon: v("cat-structural") },
  { id: "advanced", label: "Advanced", icon: v("cat-advanced") }
];
function Se(o) {
  const e = P(String(o));
  return we.find((t) => t.type === e);
}
function Hr(o) {
  return we.filter((e) => e.category === o);
}
class it extends H {
  constructor(e) {
    super({
      size: "3xl",
      maxHeight: "h-[80vh]",
      initialFocus: "[data-field-type-search]",
      backdropDataAttr: "data-field-type-picker-backdrop"
    }), this.selectedCategory = "text", this.searchQuery = "", this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Add Field</h2>
        <button type="button" data-field-type-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            data-field-type-search
            placeholder="Search field types..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-48 border-r border-gray-200 dark:border-gray-700 overflow-y-auto" data-field-type-categories>
          ${this.renderCategories()}
        </div>

        <div class="flex-1 overflow-y-auto p-4" data-field-type-list>
          ${this.renderFieldTypes()}
        </div>
      </div>
    `;
  }
  renderCategories() {
    return st.map(
      (e) => `
      <button
        type="button"
        data-field-category="${e.id}"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${e.id === this.selectedCategory ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}"
      >
        <span class="flex-shrink-0 w-6 flex items-center justify-center">${e.icon}</span>
        <span>${e.label}</span>
      </button>
    `
    ).join("");
  }
  renderFieldTypes() {
    const e = new Set(this.config.excludeTypes ?? []);
    let t = we.filter((r) => !e.has(r.type));
    if (this.searchQuery) {
      const r = this.searchQuery.toLowerCase();
      t = t.filter(
        (a) => a.label.toLowerCase().includes(r) || a.description.toLowerCase().includes(r) || a.type.toLowerCase().includes(r)
      );
    } else
      t = t.filter((r) => r.category === this.selectedCategory);
    return t.length === 0 ? `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm">No field types found</p>
        </div>
      ` : `
      <div class="grid grid-cols-2 gap-3">
        ${t.map((r) => this.renderFieldTypeCard(r)).join("")}
      </div>
    `;
  }
  renderFieldTypeCard(e) {
    return `
      <button
        type="button"
        data-field-type-select="${e.type}"
        class="flex items-start gap-3 p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
      >
        <span class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          ${e.icon}
        </span>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 dark:text-white">${e.label}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">${e.description}</div>
        </div>
      </button>
    `;
  }
  bindContentEvents() {
    if (!this.container) return;
    this.container.querySelector("[data-field-type-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelectorAll("[data-field-category]").forEach((t) => {
      t.addEventListener("click", () => {
        this.selectedCategory = t.getAttribute("data-field-category"), this.searchQuery = "";
        const r = this.container?.querySelector("[data-field-type-search]");
        r && (r.value = ""), this.updateView();
      });
    }), this.container.addEventListener("click", (t) => {
      const r = t.target.closest("[data-field-type-select]");
      if (r) {
        const a = r.getAttribute("data-field-type-select");
        this.config.onSelect(a), this.hide();
      }
    });
    const e = this.container.querySelector("[data-field-type-search]");
    e?.addEventListener("input", () => {
      this.searchQuery = e.value, this.updateView();
    });
  }
  updateView() {
    if (!this.container) return;
    const e = this.container.querySelector("[data-field-type-categories]");
    e && (e.innerHTML = this.renderCategories(), e.querySelectorAll("[data-field-category]").forEach((r) => {
      r.addEventListener("click", () => {
        this.selectedCategory = r.getAttribute("data-field-category"), this.searchQuery = "";
        const a = this.container?.querySelector("[data-field-type-search]");
        a && (a.value = ""), this.updateView();
      });
    }));
    const t = this.container.querySelector("[data-field-type-list]");
    t && (t.innerHTML = this.renderFieldTypes());
  }
}
const Qe = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500", ot = "px-3 py-2 text-sm border-gray-300", nt = "px-2 py-1 text-[12px] border-gray-200";
function p(o = "sm") {
  return o === "xs" ? `${Qe} ${nt}` : `${Qe} ${ot}`;
}
function D(o = "sm") {
  const e = "w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white";
  return o === "xs" ? `${e} ${nt}` : `${e} ${ot}`;
}
function ze(o = {}) {
  const e = o.size ?? "sm", t = o.resize ?? "y", r = t === "none" ? "resize-none" : t === "x" ? "resize-x" : t === "both" ? "resize" : "resize-y";
  return `${p(e)} ${r}`;
}
function F() {
  return "w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500";
}
function f(o = "sm") {
  return o === "xs" ? "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" : "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
}
function Ht(o = "sm") {
  return `<svg class="${o === "xs" ? "w-3 h-3" : "w-4 h-4"}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
const zt = [
  {
    id: "smileys",
    label: "Smileys",
    emoji: "😀",
    entries: [
      { emoji: "😀", name: "grinning face", keywords: "happy smile" },
      { emoji: "😃", name: "smiley", keywords: "happy face" },
      { emoji: "😄", name: "smile", keywords: "happy joy" },
      { emoji: "😁", name: "grin", keywords: "happy teeth" },
      { emoji: "😅", name: "sweat smile", keywords: "nervous relief" },
      { emoji: "😂", name: "joy", keywords: "laugh tears funny" },
      { emoji: "🤣", name: "rofl", keywords: "laugh rolling" },
      { emoji: "😊", name: "blush", keywords: "happy shy" },
      { emoji: "😇", name: "innocent", keywords: "angel halo" },
      { emoji: "😍", name: "heart eyes", keywords: "love crush" },
      { emoji: "🤩", name: "star struck", keywords: "wow excited" },
      { emoji: "😘", name: "kissing heart", keywords: "love kiss" },
      { emoji: "🤔", name: "thinking", keywords: "consider wonder hmm" },
      { emoji: "🤗", name: "hugging", keywords: "hug embrace warm" },
      { emoji: "😎", name: "sunglasses", keywords: "cool confident" },
      { emoji: "🥳", name: "partying", keywords: "celebrate birthday party" },
      { emoji: "😤", name: "triumph", keywords: "frustrated angry huff" },
      { emoji: "😢", name: "cry", keywords: "sad tear" },
      { emoji: "😱", name: "scream", keywords: "fear shock horror" },
      { emoji: "🤯", name: "exploding head", keywords: "mind blown shock" },
      { emoji: "😴", name: "sleeping", keywords: "zzz tired rest" },
      { emoji: "🤮", name: "vomiting", keywords: "sick disgusting" },
      { emoji: "🥺", name: "pleading", keywords: "puppy eyes beg" },
      { emoji: "😈", name: "smiling imp", keywords: "devil evil mischief" },
      { emoji: "💀", name: "skull", keywords: "dead death skeleton" }
    ]
  },
  {
    id: "people",
    label: "People",
    emoji: "👋",
    entries: [
      { emoji: "👋", name: "wave", keywords: "hello hi greeting" },
      { emoji: "👍", name: "thumbs up", keywords: "approve like yes good" },
      { emoji: "👎", name: "thumbs down", keywords: "reject dislike no bad" },
      { emoji: "👏", name: "clap", keywords: "applause congrats" },
      { emoji: "🙌", name: "raised hands", keywords: "celebrate hooray" },
      { emoji: "🤝", name: "handshake", keywords: "deal agreement" },
      { emoji: "✋", name: "raised hand", keywords: "stop high five" },
      { emoji: "✌️", name: "peace", keywords: "victory two" },
      { emoji: "🤞", name: "crossed fingers", keywords: "luck hope wish" },
      { emoji: "💪", name: "flexed biceps", keywords: "strong power muscle" },
      { emoji: "👀", name: "eyes", keywords: "look see watch" },
      { emoji: "👁️", name: "eye", keywords: "look see vision" },
      { emoji: "🧠", name: "brain", keywords: "think smart intelligence" },
      { emoji: "❤️", name: "red heart", keywords: "love like" },
      { emoji: "🔥", name: "fire", keywords: "hot flame lit popular" },
      { emoji: "✨", name: "sparkles", keywords: "stars magic new shiny" },
      { emoji: "💫", name: "dizzy", keywords: "star shooting" },
      { emoji: "💥", name: "collision", keywords: "boom bang explosion" },
      { emoji: "💬", name: "speech bubble", keywords: "comment chat message" },
      { emoji: "💡", name: "light bulb", keywords: "idea thought bright" }
    ]
  },
  {
    id: "animals-nature",
    label: "Nature",
    emoji: "🌿",
    entries: [
      { emoji: "🐶", name: "dog face", keywords: "pet puppy" },
      { emoji: "🐱", name: "cat face", keywords: "pet kitten" },
      { emoji: "🐻", name: "bear", keywords: "animal" },
      { emoji: "🦊", name: "fox", keywords: "clever sly" },
      { emoji: "🦁", name: "lion", keywords: "king brave" },
      { emoji: "🐸", name: "frog", keywords: "toad" },
      { emoji: "🦋", name: "butterfly", keywords: "insect beauty" },
      { emoji: "🐝", name: "honeybee", keywords: "buzz insect" },
      { emoji: "🌸", name: "cherry blossom", keywords: "flower spring pink" },
      { emoji: "🌺", name: "hibiscus", keywords: "flower tropical" },
      { emoji: "🌻", name: "sunflower", keywords: "flower sun yellow" },
      { emoji: "🌹", name: "rose", keywords: "flower love red" },
      { emoji: "🌲", name: "evergreen tree", keywords: "pine forest" },
      { emoji: "🌿", name: "herb", keywords: "plant leaf green" },
      { emoji: "🍀", name: "four leaf clover", keywords: "luck lucky irish" },
      { emoji: "🌊", name: "wave", keywords: "ocean sea water surf" },
      { emoji: "⛰️", name: "mountain", keywords: "peak hill" },
      { emoji: "🌈", name: "rainbow", keywords: "colors pride" },
      { emoji: "☀️", name: "sun", keywords: "sunny bright warm weather" },
      { emoji: "🌙", name: "crescent moon", keywords: "night sleep" }
    ]
  },
  {
    id: "food",
    label: "Food",
    emoji: "🍕",
    entries: [
      { emoji: "🍕", name: "pizza", keywords: "food slice" },
      { emoji: "🍔", name: "hamburger", keywords: "burger food" },
      { emoji: "☕", name: "coffee", keywords: "drink hot tea cup" },
      { emoji: "🍺", name: "beer", keywords: "drink alcohol mug" },
      { emoji: "🍷", name: "wine", keywords: "drink glass red" },
      { emoji: "🎂", name: "birthday cake", keywords: "dessert party celebrate" },
      { emoji: "🍰", name: "shortcake", keywords: "dessert sweet" },
      { emoji: "🍩", name: "doughnut", keywords: "donut dessert sweet" },
      { emoji: "🍎", name: "red apple", keywords: "fruit health" },
      { emoji: "🍋", name: "lemon", keywords: "fruit citrus sour" },
      { emoji: "🍉", name: "watermelon", keywords: "fruit summer" },
      { emoji: "🌶️", name: "hot pepper", keywords: "spicy chili" },
      { emoji: "🥑", name: "avocado", keywords: "fruit green" },
      { emoji: "🍿", name: "popcorn", keywords: "movie snack" },
      { emoji: "🧁", name: "cupcake", keywords: "dessert sweet muffin" }
    ]
  },
  {
    id: "travel",
    label: "Travel",
    emoji: "✈️",
    entries: [
      { emoji: "✈️", name: "airplane", keywords: "travel flight fly" },
      { emoji: "🚀", name: "rocket", keywords: "launch space ship fast" },
      { emoji: "🚗", name: "car", keywords: "auto vehicle drive" },
      { emoji: "🚲", name: "bicycle", keywords: "bike cycle pedal" },
      { emoji: "🏠", name: "house", keywords: "home building" },
      { emoji: "🏢", name: "office building", keywords: "work corporate" },
      { emoji: "🏭", name: "factory", keywords: "industry manufacturing" },
      { emoji: "🏥", name: "hospital", keywords: "health medical doctor" },
      { emoji: "🏫", name: "school", keywords: "education learn" },
      { emoji: "🏰", name: "castle", keywords: "medieval fortress" },
      { emoji: "⛪", name: "church", keywords: "religion worship" },
      { emoji: "🗽", name: "statue of liberty", keywords: "new york freedom" },
      { emoji: "🌍", name: "globe europe africa", keywords: "earth world map" },
      { emoji: "🌏", name: "globe asia", keywords: "earth world map" },
      { emoji: "🗺️", name: "world map", keywords: "earth globe travel" }
    ]
  },
  {
    id: "activities",
    label: "Activities",
    emoji: "⚽",
    entries: [
      { emoji: "⚽", name: "soccer", keywords: "football sport ball" },
      { emoji: "🏀", name: "basketball", keywords: "sport ball hoop" },
      { emoji: "🎮", name: "video game", keywords: "gaming controller play" },
      { emoji: "🎯", name: "direct hit", keywords: "target bullseye goal" },
      { emoji: "🎲", name: "game die", keywords: "dice random chance" },
      { emoji: "🧩", name: "puzzle", keywords: "piece jigsaw game" },
      { emoji: "🎨", name: "artist palette", keywords: "art paint draw color" },
      { emoji: "🎵", name: "musical note", keywords: "music song sound" },
      { emoji: "🎸", name: "guitar", keywords: "music instrument rock" },
      { emoji: "🎬", name: "clapper board", keywords: "movie film cinema" },
      { emoji: "📸", name: "camera flash", keywords: "photo picture" },
      { emoji: "🏆", name: "trophy", keywords: "win prize award champion" },
      { emoji: "🥇", name: "gold medal", keywords: "first winner" },
      { emoji: "🎪", name: "circus tent", keywords: "carnival fun" },
      { emoji: "🎭", name: "performing arts", keywords: "theater drama masks" }
    ]
  },
  {
    id: "objects",
    label: "Objects",
    emoji: "📦",
    entries: [
      { emoji: "📰", name: "newspaper", keywords: "news article press media" },
      { emoji: "📄", name: "page", keywords: "document file paper" },
      { emoji: "📋", name: "clipboard", keywords: "list copy paste" },
      { emoji: "📌", name: "pushpin", keywords: "pin location mark" },
      { emoji: "📎", name: "paperclip", keywords: "attach clip" },
      { emoji: "🔗", name: "link", keywords: "chain url href" },
      { emoji: "📦", name: "package", keywords: "box shipping delivery" },
      { emoji: "🗂️", name: "card index", keywords: "folder organize dividers" },
      { emoji: "📁", name: "file folder", keywords: "directory" },
      { emoji: "📂", name: "open folder", keywords: "directory files" },
      { emoji: "📝", name: "memo", keywords: "note write edit pencil" },
      { emoji: "✏️", name: "pencil", keywords: "write edit draw" },
      { emoji: "🖊️", name: "pen", keywords: "write sign" },
      { emoji: "📐", name: "triangular ruler", keywords: "measure geometry" },
      { emoji: "📏", name: "straight ruler", keywords: "measure length" },
      { emoji: "🔍", name: "magnifying glass", keywords: "search find zoom" },
      { emoji: "🔒", name: "locked", keywords: "secure private padlock" },
      { emoji: "🔓", name: "unlocked", keywords: "open access" },
      { emoji: "🔑", name: "key", keywords: "unlock password access" },
      { emoji: "🔧", name: "wrench", keywords: "tool fix settings" },
      { emoji: "🔨", name: "hammer", keywords: "tool build construct" },
      { emoji: "⚙️", name: "gear", keywords: "settings config cog" },
      { emoji: "🧲", name: "magnet", keywords: "attract pull" },
      { emoji: "💾", name: "floppy disk", keywords: "save storage" },
      { emoji: "💻", name: "laptop", keywords: "computer device" },
      { emoji: "🖥️", name: "desktop computer", keywords: "monitor screen" },
      { emoji: "📱", name: "mobile phone", keywords: "cell smartphone device" },
      { emoji: "🖨️", name: "printer", keywords: "print output" },
      { emoji: "📷", name: "camera", keywords: "photo picture" },
      { emoji: "🎙️", name: "microphone", keywords: "audio record podcast" },
      { emoji: "📡", name: "satellite antenna", keywords: "signal broadcast" },
      { emoji: "🔔", name: "bell", keywords: "notification alert ring" },
      { emoji: "📊", name: "bar chart", keywords: "graph statistics data" },
      { emoji: "📈", name: "chart increasing", keywords: "graph growth up trend" },
      { emoji: "📉", name: "chart decreasing", keywords: "graph down decline" },
      { emoji: "🗓️", name: "calendar", keywords: "date schedule event" },
      { emoji: "⏰", name: "alarm clock", keywords: "time timer" },
      { emoji: "⏱️", name: "stopwatch", keywords: "time timer speed" },
      { emoji: "🧪", name: "test tube", keywords: "science lab experiment" },
      { emoji: "💊", name: "pill", keywords: "medicine health drug" },
      { emoji: "🛒", name: "shopping cart", keywords: "buy store ecommerce" },
      { emoji: "💰", name: "money bag", keywords: "cash dollar rich finance" },
      { emoji: "💳", name: "credit card", keywords: "payment buy charge" },
      { emoji: "📮", name: "postbox", keywords: "mail letter send" },
      { emoji: "📬", name: "open mailbox", keywords: "email inbox receive" },
      { emoji: "🏷️", name: "label", keywords: "tag price category" },
      { emoji: "🧾", name: "receipt", keywords: "invoice bill purchase" },
      { emoji: "📚", name: "books", keywords: "library read study" },
      { emoji: "🎁", name: "wrapped gift", keywords: "present box surprise" },
      { emoji: "🪄", name: "magic wand", keywords: "wizard spell sparkle" }
    ]
  },
  {
    id: "symbols",
    label: "Symbols",
    emoji: "⚡",
    entries: [
      { emoji: "⚡", name: "zap", keywords: "lightning bolt electric power" },
      { emoji: "✅", name: "check mark", keywords: "done complete yes success" },
      { emoji: "❌", name: "cross mark", keywords: "no wrong delete remove" },
      { emoji: "⭐", name: "star", keywords: "favorite bookmark rating" },
      { emoji: "🌟", name: "glowing star", keywords: "sparkle shine bright" },
      { emoji: "💠", name: "diamond", keywords: "shape gem crystal" },
      { emoji: "🔶", name: "large orange diamond", keywords: "shape" },
      { emoji: "🔷", name: "large blue diamond", keywords: "shape" },
      { emoji: "🔴", name: "red circle", keywords: "dot round" },
      { emoji: "🟢", name: "green circle", keywords: "dot round" },
      { emoji: "🔵", name: "blue circle", keywords: "dot round" },
      { emoji: "🟡", name: "yellow circle", keywords: "dot round" },
      { emoji: "🟣", name: "purple circle", keywords: "dot round" },
      { emoji: "⬛", name: "black square", keywords: "shape" },
      { emoji: "⬜", name: "white square", keywords: "shape" },
      { emoji: "▶️", name: "play button", keywords: "start forward" },
      { emoji: "⏸️", name: "pause button", keywords: "stop wait" },
      { emoji: "⏹️", name: "stop button", keywords: "halt end" },
      { emoji: "♻️", name: "recycling symbol", keywords: "eco green recycle" },
      { emoji: "⚠️", name: "warning", keywords: "caution alert danger" },
      { emoji: "🚫", name: "prohibited", keywords: "no ban forbidden stop" },
      { emoji: "ℹ️", name: "information", keywords: "info help about" },
      { emoji: "❓", name: "question mark", keywords: "help what why" },
      { emoji: "❗", name: "exclamation mark", keywords: "alert important bang" },
      { emoji: "➕", name: "plus", keywords: "add new create" },
      { emoji: "➖", name: "minus", keywords: "remove subtract delete" },
      { emoji: "➡️", name: "right arrow", keywords: "forward next direction" },
      { emoji: "⬅️", name: "left arrow", keywords: "back previous direction" },
      { emoji: "⬆️", name: "up arrow", keywords: "top direction" },
      { emoji: "⬇️", name: "down arrow", keywords: "bottom direction" },
      { emoji: "↩️", name: "right arrow curving left", keywords: "return reply back undo" },
      { emoji: "🔀", name: "shuffle", keywords: "random mix" },
      { emoji: "🔁", name: "repeat", keywords: "loop cycle" },
      { emoji: "♾️", name: "infinity", keywords: "forever unlimited" },
      { emoji: "🏁", name: "checkered flag", keywords: "finish race end" },
      { emoji: "🚩", name: "triangular flag", keywords: "report mark milestone" },
      { emoji: "🔰", name: "Japanese symbol for beginner", keywords: "new start" },
      { emoji: "💲", name: "heavy dollar sign", keywords: "money currency price" },
      { emoji: "#️⃣", name: "hash", keywords: "number pound tag" },
      { emoji: "🔣", name: "input symbols", keywords: "character special" }
    ]
  }
], Ot = [
  // Content & Documents
  { value: "page", label: "Page", keywords: "document paper", category: "Content" },
  { value: "page-edit", label: "Page Edit", keywords: "document write", category: "Content" },
  { value: "journal", label: "Journal", keywords: "book notebook blog", category: "Content" },
  { value: "book", label: "Book", keywords: "read documentation", category: "Content" },
  { value: "clipboard", label: "Clipboard", keywords: "copy paste list", category: "Content" },
  { value: "edit-pencil", label: "Edit", keywords: "write pencil compose", category: "Content" },
  { value: "post", label: "Post", keywords: "article blog entry", category: "Content" },
  // Objects & Layout
  { value: "cube", label: "Cube", keywords: "box 3d model block", category: "Objects" },
  { value: "view-grid", label: "Grid", keywords: "layout blocks tiles", category: "Objects" },
  { value: "dashboard", label: "Dashboard", keywords: "home overview panel", category: "Objects" },
  { value: "folder", label: "Folder", keywords: "directory files", category: "Objects" },
  { value: "archive", label: "Archive", keywords: "box storage", category: "Objects" },
  { value: "table-rows", label: "Table", keywords: "list rows data", category: "Objects" },
  { value: "puzzle", label: "Puzzle", keywords: "piece component module", category: "Objects" },
  // People & Auth
  { value: "user", label: "User", keywords: "person account profile", category: "People" },
  { value: "users", label: "Users", keywords: "people group team", category: "People" },
  { value: "user-circle", label: "User Circle", keywords: "profile avatar", category: "People" },
  { value: "shield", label: "Shield", keywords: "security auth role", category: "People" },
  { value: "community", label: "Community", keywords: "group organization", category: "People" },
  { value: "lock", label: "Lock", keywords: "secure private", category: "People" },
  // Commerce & Business
  { value: "building", label: "Building", keywords: "office company tenant", category: "Business" },
  { value: "briefcase", label: "Briefcase", keywords: "work business", category: "Business" },
  { value: "cart", label: "Cart", keywords: "shop ecommerce buy", category: "Business" },
  { value: "credit-card", label: "Credit Card", keywords: "payment money", category: "Business" },
  { value: "gift", label: "Gift", keywords: "present reward", category: "Business" },
  { value: "shop", label: "Shop", keywords: "store ecommerce", category: "Business" },
  // Media
  { value: "media-image", label: "Image", keywords: "photo picture", category: "Media" },
  { value: "camera", label: "Camera", keywords: "photo picture", category: "Media" },
  { value: "play", label: "Play", keywords: "video media", category: "Media" },
  { value: "music-note", label: "Music", keywords: "audio song", category: "Media" },
  { value: "attachment", label: "Attachment", keywords: "file clip", category: "Media" },
  // Communication
  { value: "bell", label: "Bell", keywords: "notification alert", category: "Communication" },
  { value: "chat-bubble", label: "Chat", keywords: "message comment", category: "Communication" },
  { value: "mail", label: "Mail", keywords: "email message", category: "Communication" },
  { value: "megaphone", label: "Megaphone", keywords: "announce broadcast", category: "Communication" },
  { value: "send", label: "Send", keywords: "share submit", category: "Communication" },
  // System & Settings
  { value: "settings", label: "Settings", keywords: "config gear cog", category: "System" },
  { value: "switch-on", label: "Toggle", keywords: "switch feature flag", category: "System" },
  { value: "bug", label: "Bug", keywords: "debug error issue", category: "System" },
  { value: "clock", label: "Clock", keywords: "time schedule activity", category: "System" },
  { value: "database", label: "Database", keywords: "storage data", category: "System" },
  { value: "code", label: "Code", keywords: "developer programming", category: "System" },
  { value: "terminal", label: "Terminal", keywords: "console command line", category: "System" },
  // Misc & Navigation
  { value: "star", label: "Star", keywords: "favorite bookmark rating", category: "Misc" },
  { value: "heart", label: "Heart", keywords: "love favorite", category: "Misc" },
  { value: "bookmark", label: "Bookmark", keywords: "save favorite", category: "Misc" },
  { value: "pin-alt", label: "Pin", keywords: "location map", category: "Misc" },
  { value: "link", label: "Link", keywords: "url chain href", category: "Misc" },
  { value: "search", label: "Search", keywords: "find magnifier", category: "Misc" },
  { value: "download", label: "Download", keywords: "save get export", category: "Misc" },
  { value: "cloud", label: "Cloud", keywords: "upload sync", category: "Misc" },
  { value: "flash", label: "Flash", keywords: "lightning bolt fast", category: "Misc" },
  { value: "calendar", label: "Calendar", keywords: "date event schedule", category: "Misc" },
  { value: "graph-up", label: "Analytics", keywords: "chart statistics", category: "Misc" },
  { value: "color-picker", label: "Theme", keywords: "color palette style", category: "Misc" },
  { value: "globe", label: "Globe", keywords: "world international web", category: "Misc" },
  { value: "rocket", label: "Rocket", keywords: "launch deploy fast", category: "Misc" },
  { value: "flag", label: "Flag", keywords: "mark milestone report", category: "Misc" },
  { value: "trash", label: "Trash", keywords: "delete remove", category: "Misc" }
];
function Nt() {
  const o = [], e = [], t = ["Content", "Objects", "People", "Business", "Media", "Communication", "System", "Misc"];
  for (const r of t) {
    const a = Ot.filter((s) => s.category === r);
    if (a.length !== 0) {
      e.push({ id: r.toLowerCase(), label: r, startIndex: o.length });
      for (const s of a)
        o.push({
          value: s.value,
          label: s.label,
          keywords: s.keywords,
          display: Et(`iconoir:${s.value}`, { size: "18px" })
        });
    }
  }
  return {
    id: "iconoir",
    label: "Sidebar",
    icon: "🧭",
    entries: o,
    categories: e
  };
}
const Rt = [
  "text",
  "textarea",
  "rich-text",
  "markdown",
  "code",
  "number",
  "integer",
  "currency",
  "percentage",
  "select",
  "radio",
  "checkbox",
  "chips",
  "toggle",
  "date",
  "time",
  "datetime",
  "media-picker",
  "media-gallery",
  "file-upload",
  "reference",
  "references",
  "user",
  "group",
  "repeater",
  "blocks",
  "json",
  "slug",
  "color",
  "location"
];
function Vt() {
  const o = [], e = [];
  for (const t of zt) {
    e.push({ id: t.id, label: t.label, startIndex: o.length });
    for (const r of t.entries)
      o.push({
        value: r.emoji,
        label: r.name,
        keywords: r.keywords,
        display: r.emoji
      });
  }
  return {
    id: "emoji",
    label: "Emoji",
    icon: "😀",
    entries: o,
    categories: e
  };
}
function Ut() {
  const o = [];
  for (const e of Rt) {
    const t = X(e);
    t && o.push({
      value: e,
      label: e.replace(/-/g, " "),
      keywords: e.replace(/-/g, " "),
      display: t
    });
  }
  return {
    id: "icons",
    label: "Icons",
    icon: "◇",
    entries: o
  };
}
const I = [];
let Ze = !1;
function le() {
  Ze || (Ze = !0, I.push(Nt()), I.push(Vt()), I.push(Ut()));
}
function zr(o) {
  le();
  const e = I.findIndex((t) => t.id === o.id);
  e >= 0 ? I[e] = o : I.push(o);
}
function Or(o) {
  le();
  const e = I.findIndex((t) => t.id === o);
  e >= 0 && I.splice(e, 1);
}
function lt() {
  return le(), I;
}
function de(o) {
  if (!o) return "";
  const e = X(o);
  if (e) return e;
  le();
  for (const t of I) {
    const r = t.entries.find((a) => a.value === o);
    if (r) return r.display;
  }
  return z(o);
}
function dt(o) {
  if (!o) return "";
  le();
  for (const e of I) {
    const t = e.entries.find((r) => r.value === o);
    if (t) return t.label;
  }
  return o;
}
function $e(o, e, t) {
  const r = de(o), a = dt(o), s = o.length > 0, i = t ? "h-[30px]" : "h-[38px]", n = t ? "text-[12px]" : "text-sm", l = t ? "w-5 h-5 text-[14px]" : "w-6 h-6 text-base", d = t ? "w-5 h-5" : "w-6 h-6";
  return `
    <div data-icon-trigger
         class="flex items-center gap-1.5 ${i} px-2 border rounded-lg bg-white text-gray-900
                dark:border-gray-600 dark:bg-slate-800 dark:text-white
                hover:border-gray-400 dark:hover:border-gray-500
                cursor-pointer transition-colors select-none">
      <span data-icon-preview
            class="flex-shrink-0 ${l} flex items-center justify-center rounded
                   ${s ? "" : "text-gray-300 dark:text-gray-600"}">
        ${s ? r : "?"}
      </span>
      <span data-icon-label
            class="flex-1 min-w-0 truncate ${n} ${s ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}">
        ${s ? z(a) : "Choose icon…"}
      </span>
      <button type="button" data-icon-clear
              class="flex-shrink-0 ${d} flex items-center justify-center rounded
                     text-gray-300 dark:text-gray-600
                     hover:text-gray-500 dark:hover:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                     ${s ? "" : "hidden"}"
              title="Clear icon" aria-hidden="${s ? "false" : "true"}">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <span class="flex-shrink-0 ${d} flex items-center justify-center rounded
                   text-gray-400 dark:text-gray-500">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </span>
      <input type="hidden" ${e} value="${z(o)}" />
    </div>`;
}
let $ = null, V = null, U = null, fe = "iconoir", G = "", Q = null, ae = null;
function Gt(o, e) {
  O(), V = e, U = o, G = "", fe = lt()[0]?.id ?? "emoji", $ = document.createElement("div"), $.setAttribute("data-icon-picker-popover", ""), $.className = "fixed", $.style.zIndex = String(Kt(o) + 5), $.innerHTML = Fe(), document.body.appendChild($), Jt(o), Ae(), $.querySelector("[data-icon-search]")?.focus(), Q = (r) => {
    const a = r.target;
    !a.closest("[data-icon-picker-popover]") && !a.closest("[data-icon-trigger]") && O();
  }, setTimeout(() => {
    Q && document.addEventListener("mousedown", Q);
  }, 0), ae = (r) => {
    r.key === "Escape" && O();
  }, document.addEventListener("keydown", ae);
}
function O() {
  $ && ($.remove(), $ = null), Q && (document.removeEventListener("mousedown", Q), Q = null), ae && (document.removeEventListener("keydown", ae), ae = null), V = null, U = null;
}
function Jt(o) {
  if (!$) return;
  const e = o.getBoundingClientRect(), t = 320, r = 380;
  let a = e.bottom + 4, s = e.left;
  a + r > window.innerHeight - 8 && (a = e.top - r - 4), s + t > window.innerWidth - 8 && (s = window.innerWidth - t - 8), s < 8 && (s = 8), $.style.top = `${a}px`, $.style.left = `${s}px`, $.style.width = `${t}px`;
}
function Fe() {
  const o = lt(), e = o.find((s) => s.id === fe) ?? o[0];
  let t = [];
  if (G) {
    const s = G.toLowerCase();
    for (const i of o)
      for (const n of i.entries)
        (n.label.toLowerCase().includes(s) || n.value.toLowerCase().includes(s) || (n.keywords ?? "").toLowerCase().includes(s)) && t.push({ entry: n, tabId: i.id });
  } else e && (t = e.entries.map((s) => ({ entry: s, tabId: e.id })));
  const r = o.map((s) => {
    const i = s.id === fe;
    return `
      <button type="button" data-icon-tab="${z(s.id)}"
              class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap
                     ${i ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"}">
        ${s.icon ? `<span class="mr-0.5">${s.icon}</span>` : ""}${z(s.label)}
      </button>`;
  }).join("");
  let a;
  if (t.length === 0)
    a = '<div class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">No matching icons</div>';
  else if (G)
    a = je(t.map((s) => s.entry));
  else if (e?.categories && e.categories.length > 0) {
    a = "";
    for (let s = 0; s < e.categories.length; s++) {
      const i = e.categories[s], n = e.categories[s + 1]?.startIndex ?? e.entries.length, l = e.entries.slice(i.startIndex, n);
      l.length !== 0 && (a += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 pt-2 pb-1">${z(i.label)}</div>`, a += je(l));
    }
  } else
    a = je(t.map((s) => s.entry));
  return `
    <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl
                flex flex-col overflow-hidden" style="max-height: 380px;">
      <div class="px-3 pt-3 pb-2 space-y-2 flex-shrink-0">
        <div class="relative">
          <input type="text" data-icon-search
                 placeholder="Search icons…"
                 value="${z(G)}"
                 class="${p("xs")}" />
        </div>
        <div class="flex items-center gap-1 overflow-x-auto" data-icon-tab-bar>
          ${r}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-3 pb-2" data-icon-grid-area>
        ${a}
      </div>
      <div class="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 px-3 py-2">
        <button type="button" data-icon-clear-btn
                class="w-full text-center text-[11px] text-gray-400 dark:text-gray-500
                       hover:text-red-500 dark:hover:text-red-400 transition-colors py-1">
          Clear selection
        </button>
      </div>
    </div>`;
}
function je(o) {
  let e = '<div class="grid grid-cols-8 gap-0.5">';
  for (const t of o) {
    const r = !t.display.startsWith("<");
    e += `
      <button type="button" data-icon-pick="${z(t.value)}"
              title="${z(t.label)}"
              class="w-8 h-8 flex items-center justify-center rounded-md
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-colors cursor-pointer
                     ${r ? "text-lg" : "text-gray-600 dark:text-gray-300"}">
        ${r ? t.display : `<span class="w-5 h-5 flex items-center justify-center">${t.display}</span>`}
      </button>`;
  }
  return e += "</div>", e;
}
function Ae() {
  if (!$) return;
  const o = $.querySelector("[data-icon-search]");
  o?.addEventListener("input", () => {
    G = o.value, Xe();
  }), $.addEventListener("click", (e) => {
    const t = e.target, r = t.closest("[data-icon-tab]");
    if (r) {
      fe = r.dataset.iconTab, G = "", Xe();
      return;
    }
    const a = t.closest("[data-icon-pick]");
    if (a && V) {
      const i = a.dataset.iconPick;
      V.onSelect(i), U && Pe(U, i), O();
      return;
    }
    t.closest("[data-icon-clear-btn]") && V && (V.onClear ? V.onClear() : V.onSelect(""), U && Pe(U, ""), O());
  });
}
function Xe() {
  if (!$) return;
  if (!$.querySelector(".bg-white, .dark\\:bg-slate-800")) {
    $.innerHTML = Fe(), Ae();
    return;
  }
  const e = $.querySelector("[data-icon-grid-area]")?.scrollTop ?? 0;
  $.innerHTML = Fe(), Ae();
  const t = $.querySelector("[data-icon-grid-area]");
  t && (t.scrollTop = e);
  const r = $.querySelector("[data-icon-search]");
  r && (r.focus(), r.setSelectionRange(r.value.length, r.value.length));
}
function Pe(o, e) {
  const t = e.length > 0, r = o.querySelector("[data-icon-preview]"), a = o.querySelector("[data-icon-label]"), s = o.querySelector("[data-icon-clear]");
  r && (r.innerHTML = t ? de(e) : "?", r.classList.toggle("text-gray-300", !t), r.classList.toggle("dark:text-gray-600", !t)), a && (a.textContent = t ? dt(e) : "Choose icon…", a.classList.toggle("text-gray-400", !t), a.classList.toggle("dark:text-gray-500", !t), a.classList.toggle("text-gray-700", t), a.classList.toggle("dark:text-gray-300", t)), s && (s.classList.toggle("hidden", !t), s.setAttribute("aria-hidden", t ? "false" : "true"));
}
function Ce(o, e, t) {
  o.querySelectorAll(e).forEach((r) => {
    r.addEventListener("click", (a) => {
      if (a.target.closest("[data-icon-clear]")) {
        a.stopPropagation();
        const i = t(r);
        i.onClear ? i.onClear() : i.onSelect(""), Pe(r, "");
        return;
      }
      U === r && $ ? O() : Gt(r, t(r));
    });
  });
}
function Kt(o) {
  let e = o;
  for (; e; ) {
    const t = parseInt(e.style.zIndex, 10);
    if (!isNaN(t) && t > 0) return t;
    e = e.parentElement;
  }
  return 50;
}
function z(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function Oe(o) {
  try {
    return await o.listBlockDefinitionsSummary();
  } catch {
    return [];
  }
}
function be(o) {
  return (o.slug || o.type || "").trim();
}
function oe(o, e) {
  if (o.size === 0 || e.length === 0) return new Set(o);
  const t = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  for (const a of e) {
    const s = be(a);
    if (!s) continue;
    const i = o.has(s), n = o.has(a.type);
    (i || n) && (t.add(s), n && a.slug && a.slug !== a.type && r.add(a.type));
  }
  for (const a of o)
    r.has(a) || t.has(a) || t.add(a);
  return t;
}
function ne(o) {
  const { availableBlocks: e, selectedBlocks: t, searchQuery: r } = o, a = o.accent ?? "blue", s = o.label ?? "Allowed Blocks", i = o.emptySelectionText;
  if (e.length === 0)
    return `
      <div class="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
        No block definitions available.
      </div>`;
  const n = r ? e.filter((b) => {
    const k = r.toLowerCase();
    return b.name.toLowerCase().includes(k) || be(b).toLowerCase().includes(k) || (b.category ?? "").toLowerCase().includes(k);
  }) : e, l = /* @__PURE__ */ new Map();
  for (const b of n) {
    const k = b.category || "uncategorized";
    l.has(k) || l.set(k, []), l.get(k).push(b);
  }
  const d = t.size, c = d === 0 && i ? i : `${d} selected`, g = a === "red" ? "focus:ring-red-500" : "focus:ring-blue-500", m = a === "red" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700" : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700";
  let h = `
    <div class="space-y-2" data-block-picker-inline>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${R(s)}</span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500">${R(c)}</span>
      </div>
      <div class="relative">
        <input type="text" data-block-picker-search
               placeholder="Search blocks..."
               value="${R(r ?? "")}"
               class="w-full px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 ${g}" />
      </div>
      <div class="max-h-[200px] overflow-y-auto space-y-1" data-block-picker-list>`;
  if (n.length === 0)
    h += `
        <div class="text-center py-3 text-xs text-gray-400 dark:text-gray-500">No matching blocks</div>`;
  else
    for (const [b, k] of l) {
      l.size > 1 && (h += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">${R(Wt(b))}</div>`);
      for (const C of k) {
        const y = be(C), S = t.has(y) || t.has(C.type);
        h += `
        <label class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${S ? m : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"}">
          <input type="checkbox" value="${R(y)}" data-block-type="${R(C.type)}"
                 ${S ? "checked" : ""}
                 class="${F()}" />
          <div class="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
            ${C.icon ? de(C.icon) : y.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[12px] font-medium text-gray-800 dark:text-gray-200">${R(C.name)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono ml-1">${R(y)}</span>
          </div>
        </label>`;
      }
    }
  return h += `
      </div>
    </div>`, h;
}
function ct(o, e) {
  const t = o.querySelector("[data-block-picker-inline]");
  if (!t) return;
  const r = t.querySelector("[data-block-picker-search]");
  r?.addEventListener("input", () => {
    e.searchQuery = r.value, ht(t, e);
  });
  const a = t.querySelector("[data-block-picker-list]");
  a && ut(a, e);
}
function ut(o, e) {
  o.querySelectorAll('input[type="checkbox"]').forEach((t) => {
    t.addEventListener("change", () => {
      const r = t.value, a = t.dataset.blockType;
      t.checked ? (e.selectedBlocks.add(r), a && a !== r && e.selectedBlocks.delete(a)) : (e.selectedBlocks.delete(r), a && e.selectedBlocks.delete(a)), e.onSelectionChange(e.selectedBlocks);
      const s = o.closest("[data-block-picker-inline]");
      s && ht(s, e);
    });
  });
}
function ht(o, e) {
  const t = o.querySelector("[data-block-picker-list]");
  if (!t) return;
  const r = t.scrollTop, a = document.createElement("div");
  a.innerHTML = ne(e);
  const s = a.querySelector("[data-block-picker-list]"), i = a.querySelector("[data-block-picker-inline] > div > span:last-child");
  s && (t.innerHTML = s.innerHTML, t.scrollTop = r, ut(t, e));
  const n = o.querySelector(":scope > div > span:last-child");
  n && i && (n.textContent = i.textContent);
}
function R(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function Wt(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function Ie(o) {
  return o.replace(/\/+$/, "");
}
function ee(o) {
  const e = o.trim();
  if (!e) return "";
  const t = Ie(e);
  return t ? /\/api(\/|$)/.test(t) ? t : `${t}/api` : "/api";
}
function Be(...o) {
  for (const a of o) {
    const s = (a || "").trim();
    if (s) return ee(s);
  }
  const e = document.documentElement?.getAttribute("data-api-base-path") || document.body?.getAttribute("data-api-base-path");
  if (e && e.trim())
    return ee(e.trim());
  const t = document.documentElement?.getAttribute("data-base-path") || document.body?.getAttribute("data-base-path");
  if (t && t.trim())
    return ee(t.trim());
  const r = window?.DEBUG_CONFIG;
  return typeof r?.apiBasePath == "string" && r.apiBasePath.trim() ? ee(r.apiBasePath.trim()) : typeof r?.basePath == "string" && r.basePath.trim() ? ee(r.basePath.trim()) : "";
}
function Ne(o, e) {
  const t = (e || "").trim();
  if (t) return Ie(t);
  const r = Ie((o || "").trim());
  if (!r) return "";
  const a = r.match(/^(.*)\/api(?:\/[^/]+)?$/);
  return a ? a[1] || "" : r;
}
class ve extends H {
  constructor(e) {
    super({
      size: "2xl",
      initialFocus: 'input[name="name"]',
      backdropDataAttr: "data-field-config-backdrop"
    }), this.config = e, this.field = { ...e.field }, this.isNewField = !e.field.id || e.field.id.startsWith("new_");
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const e = Se(this.field.type);
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${e?.icon ?? "?"}
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              ${this.isNewField ? "Add" : "Edit"} ${e?.label ?? "Field"}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">${e?.description ?? ""}</p>
          </div>
        </div>
        <button type="button" data-field-config-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <form data-field-config-form-element class="space-y-6">
          ${this.renderGeneralSection()}
          ${this.renderValidationSection()}
          ${this.renderAppearanceSection()}
          ${this.renderTypeSpecificSection()}
        </form>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-field-config-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-field-config-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ${this.isNewField ? "Add Field" : "Save Changes"}
        </button>
      </div>
    `;
  }
  renderGeneralSection() {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">General</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="${f()}">
              Field Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value="${w(this.field.name)}"
              placeholder="field_name"
              pattern="^[a-z][a-z0-9_]*$"
              required
              class="${p()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Lowercase letters, numbers, underscores. Starts with letter.</p>
          </div>

          <div>
            <label class="${f()}">
              Label <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="label"
              value="${w(this.field.label)}"
              placeholder="Field Label"
              required
              class="${p()}"
            />
          </div>
        </div>

        <div>
          <label class="${f()}">
            Description
          </label>
          <textarea
            name="description"
            rows="2"
            placeholder="Help text for editors"
            class="${ze()}"
          >${w(this.field.description ?? "")}</textarea>
        </div>

        <div>
          <label class="${f()}">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${w(this.field.placeholder ?? "")}"
            placeholder="Placeholder text"
            class="${p()}"
          />
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="required"
              ${this.field.required ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="readonly"
              ${this.field.readonly ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Read-only</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="hidden"
              ${this.field.hidden ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Hidden</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="filterable"
              ${this.field.filterable ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Filterable</span>
          </label>
        </div>
      </div>
    `;
  }
  renderValidationSection() {
    const e = this.field.validation ?? {}, t = ["text", "textarea", "rich-text", "markdown", "code", "slug"].includes(
      this.field.type
    ), r = ["number", "integer", "currency", "percentage"].includes(this.field.type);
    return !t && !r ? "" : `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Validation</h3>

        <div class="grid grid-cols-2 gap-4">
          ${t ? `
            <div>
              <label class="${f()}">
                Min Length
              </label>
              <input
                type="number"
                name="minLength"
                value="${e.minLength ?? ""}"
                min="0"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Max Length
              </label>
              <input
                type="number"
                name="maxLength"
                value="${e.maxLength ?? ""}"
                min="0"
                class="${p()}"
              />
            </div>
          ` : ""}

          ${r ? `
            <div>
              <label class="${f()}">
                Minimum
              </label>
              <input
                type="number"
                name="min"
                value="${e.min ?? ""}"
                step="any"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Maximum
              </label>
              <input
                type="number"
                name="max"
                value="${e.max ?? ""}"
                step="any"
                class="${p()}"
              />
            </div>
          ` : ""}
        </div>

        ${t ? `
          <div>
            <label class="${f()}">
              Pattern (RegEx)
            </label>
            <input
              type="text"
              name="pattern"
              value="${w(e.pattern ?? "")}"
              placeholder="^[a-z]+$"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        ` : ""}
      </div>
    `;
  }
  renderAppearanceSection() {
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Appearance</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="${f()}">
              Section/Tab
            </label>
            <input
              type="text"
              name="section"
              value="${w(this.field.section ?? "")}"
              placeholder="main"
              class="${p()}"
            />
          </div>

          <div>
            <label class="${f()}">
              Grid Span (1-12)
            </label>
            <input
              type="number"
              name="gridSpan"
              value="${this.field.gridSpan ?? ""}"
              min="1"
              max="12"
              placeholder="12"
              class="${p()}"
            />
          </div>
        </div>
      </div>
    `;
  }
  renderTypeSpecificSection() {
    const e = [];
    if (["select", "radio", "chips"].includes(this.field.type)) {
      const r = this.field.config?.options ?? [];
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Options</h3>
            <button
              type="button"
              data-add-option
              class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              + Add Option
            </button>
          </div>

          <div data-options-list class="space-y-2">
            ${r.map(
        (a, s) => `
              <div class="flex items-center gap-2" data-option-row="${s}">
                <input
                  type="text"
                  name="option_value_${s}"
                  value="${w(String(a.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${s}"
                  value="${w(a.label)}"
                  placeholder="label"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  data-remove-option="${s}"
                  class="p-2 text-gray-400 hover:text-red-500"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            `
      ).join("")}
          </div>
        </div>
      `);
    }
    if (["reference", "references", "user"].includes(this.field.type)) {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Reference Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Target Content Type
              </label>
              <input
                type="text"
                name="target"
                value="${w(t?.target ?? "")}"
                placeholder="users"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Display Field
              </label>
              <input
                type="text"
                name="displayField"
                value="${w(t?.displayField ?? "")}"
                placeholder="name"
                class="${p()}"
              />
            </div>
          </div>
        </div>
      `);
    }
    if (["media-picker", "media-gallery", "file-upload"].includes(this.field.type)) {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Media Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Accept Types
              </label>
              <input
                type="text"
                name="accept"
                value="${w(t?.accept ?? "")}"
                placeholder="image/*"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Max Size (MB)
              </label>
              <input
                type="number"
                name="maxSize"
                value="${t?.maxSize ?? ""}"
                min="0"
                placeholder="10"
                class="${p()}"
              />
            </div>
          </div>

          ${this.field.type === "media-gallery" ? `
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="multiple"
                ${t?.multiple !== !1 ? "checked" : ""}
                class="${F()}"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Allow multiple files</span>
            </label>
          ` : ""}
        </div>
      `);
    }
    if (this.field.type === "code") {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Code Editor Settings</h3>

          <div>
            <label class="${f()}">
              Language
            </label>
            <select
              name="language"
              class="${D()}"
            >
              <option value="json" ${t?.language === "json" ? "selected" : ""}>JSON</option>
              <option value="javascript" ${t?.language === "javascript" ? "selected" : ""}>JavaScript</option>
              <option value="typescript" ${t?.language === "typescript" ? "selected" : ""}>TypeScript</option>
              <option value="html" ${t?.language === "html" ? "selected" : ""}>HTML</option>
              <option value="css" ${t?.language === "css" ? "selected" : ""}>CSS</option>
              <option value="sql" ${t?.language === "sql" ? "selected" : ""}>SQL</option>
              <option value="yaml" ${t?.language === "yaml" ? "selected" : ""}>YAML</option>
              <option value="markdown" ${t?.language === "markdown" ? "selected" : ""}>Markdown</option>
            </select>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="lineNumbers"
              ${t?.lineNumbers !== !1 ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Show line numbers</span>
          </label>
        </div>
      `);
    }
    if (this.field.type === "slug") {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Slug Settings</h3>

          <div>
            <label class="${f()}">
              Source Field
            </label>
            <input
              type="text"
              name="sourceField"
              value="${w(t?.sourceField ?? "")}"
              placeholder="title"
              class="${p()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Field name to generate slug from (e.g., title)</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="${f()}">
                Prefix
              </label>
              <input
                type="text"
                name="slugPrefix"
                value="${w(t?.prefix ?? "")}"
                placeholder=""
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Suffix
              </label>
              <input
                type="text"
                name="slugSuffix"
                value="${w(t?.suffix ?? "")}"
                placeholder=""
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Separator
              </label>
              <select
                name="slugSeparator"
                class="${D()}"
              >
                <option value="-" ${t?.separator === "-" || !t?.separator ? "selected" : ""}>Hyphen (-)</option>
                <option value="_" ${t?.separator === "_" ? "selected" : ""}>Underscore (_)</option>
              </select>
            </div>
          </div>
        </div>
      `);
    }
    if (this.field.type === "color") {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Color Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Format
              </label>
              <select
                name="colorFormat"
                class="${D()}"
              >
                <option value="hex" ${t?.format === "hex" || !t?.format ? "selected" : ""}>HEX (#ff0000)</option>
                <option value="rgb" ${t?.format === "rgb" ? "selected" : ""}>RGB (rgb(255,0,0))</option>
                <option value="hsl" ${t?.format === "hsl" ? "selected" : ""}>HSL (hsl(0,100%,50%))</option>
              </select>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  name="allowAlpha"
                  ${t?.allowAlpha ? "checked" : ""}
                  class="${F()}"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Allow transparency (alpha)</span>
              </label>
            </div>
          </div>

          <div>
            <label class="${f()}">
              Color Presets (comma-separated)
            </label>
            <input
              type="text"
              name="colorPresets"
              value="${w(t?.presets?.join(", ") ?? "")}"
              placeholder="#ff0000, #00ff00, #0000ff"
              class="${p()}"
            />
          </div>
        </div>
      `);
    }
    if (this.field.type === "location") {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Location Settings</h3>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="${f()}">
                Default Latitude
              </label>
              <input
                type="number"
                name="defaultLat"
                value="${t?.defaultCenter?.lat ?? ""}"
                step="any"
                placeholder="40.7128"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Default Longitude
              </label>
              <input
                type="number"
                name="defaultLng"
                value="${t?.defaultCenter?.lng ?? ""}"
                step="any"
                placeholder="-74.0060"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Default Zoom
              </label>
              <input
                type="number"
                name="defaultZoom"
                value="${t?.defaultZoom ?? ""}"
                min="1"
                max="20"
                placeholder="12"
                class="${p()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="searchEnabled"
              ${t?.searchEnabled !== !1 ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Enable location search</span>
          </label>
        </div>
      `);
    }
    if (this.field.type === "daterange") {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Date Range Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Min Date
              </label>
              <input
                type="date"
                name="minDate"
                value="${w(t?.minDate ?? "")}"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Max Date
              </label>
              <input
                type="date"
                name="maxDate"
                value="${w(t?.maxDate ?? "")}"
                class="${p()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowSameDay"
              ${t?.allowSameDay !== !1 ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Allow same start and end date</span>
          </label>
        </div>
      `);
    }
    if (this.field.type === "repeater") {
      const t = this.field.config;
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Repeater Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Min Items
              </label>
              <input
                type="number"
                name="minItems"
                value="${t?.minItems ?? ""}"
                min="0"
                placeholder="0"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Max Items
              </label>
              <input
                type="number"
                name="maxItems"
                value="${t?.maxItems ?? ""}"
                min="1"
                placeholder="10"
                class="${p()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="collapsed"
              ${t?.collapsed ? "checked" : ""}
              class="${F()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Start collapsed</span>
          </label>

          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Nested fields can be configured after saving. Edit this field to define repeater sub-fields.
            </p>
          </div>
        </div>
      `);
    }
    if (this.field.type === "blocks") {
      const t = this.field.config, r = t?.allowedBlocks ? JSON.stringify(t.allowedBlocks) : "[]", a = t?.deniedBlocks ? JSON.stringify(t.deniedBlocks) : "[]";
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Blocks Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Min Blocks
              </label>
              <input
                type="number"
                name="minBlocks"
                value="${t?.minBlocks ?? ""}"
                min="0"
                placeholder="0"
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Max Blocks
              </label>
              <input
                type="number"
                name="maxBlocks"
                value="${t?.maxBlocks ?? ""}"
                min="1"
                placeholder="No limit"
                class="${p()}"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Allowed Blocks
              </label>
              <button
                type="button"
                data-block-picker-allowed
                class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Select blocks...
              </button>
            </div>
            <div
              data-allowed-blocks-list
              class="min-h-[48px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div data-allowed-blocks-chips class="flex flex-wrap gap-2">
                ${t?.allowedBlocks?.length ? t.allowedBlocks.map(
        (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${w(s)}">${w(s)}<button type="button" data-remove-allowed="${w(s)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'}
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${w(r)}' />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to allow all block types</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Denied Blocks
              </label>
              <button
                type="button"
                data-block-picker-denied
                class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Select blocks...
              </button>
            </div>
            <div
              data-denied-blocks-list
              class="min-h-[48px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div data-denied-blocks-chips class="flex flex-wrap gap-2">
                ${t?.deniedBlocks?.length ? t.deniedBlocks.map(
        (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${w(s)}">${w(s)}<button type="button" data-remove-denied="${w(s)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'}
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${w(a)}' />
          </div>
        </div>
      `);
    }
    return e.join("");
  }
  bindContentEvents() {
    if (!this.container) return;
    this.container.querySelector("[data-field-config-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-field-config-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-field-config-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container.querySelector("[data-field-config-form-element]")?.addEventListener("submit", (r) => {
      r.preventDefault(), this.handleSave();
    });
    const e = this.container.querySelector('input[name="name"]'), t = this.container.querySelector('input[name="label"]');
    e && t && this.isNewField && (t.addEventListener("input", () => {
      e.dataset.userModified || (e.value = Yt(t.value));
    }), e.addEventListener("input", () => {
      e.dataset.userModified = "true";
    })), this.bindOptionsEvents(), this.bindBlockPickerEvents();
  }
  bindOptionsEvents() {
    this.container && (this.container.querySelector("[data-add-option]")?.addEventListener("click", () => {
      const e = this.container?.querySelector("[data-options-list]");
      if (!e) return;
      const t = e.querySelectorAll("[data-option-row]").length, r = document.createElement("div");
      r.className = "flex items-center gap-2", r.setAttribute("data-option-row", String(t)), r.innerHTML = `
        <input
          type="text"
          name="option_value_${t}"
          placeholder="value"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="option_label_${t}"
          placeholder="label"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          data-remove-option="${t}"
          class="p-2 text-gray-400 hover:text-red-500"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `, e.appendChild(r), r.querySelector("[data-remove-option]")?.addEventListener("click", () => {
        r.remove();
      }), r.querySelector(`input[name="option_value_${t}"]`)?.focus();
    }), this.container.querySelectorAll("[data-remove-option]").forEach((e) => {
      e.addEventListener("click", () => {
        e.closest("[data-option-row]")?.remove();
      });
    }));
  }
  bindBlockPickerEvents() {
    !this.container || this.field.type !== "blocks" || (this.container.querySelector("[data-block-picker-allowed]")?.addEventListener("click", () => {
      this.showBlockPicker("allowed");
    }), this.container.querySelector("[data-block-picker-denied]")?.addEventListener("click", () => {
      this.showBlockPicker("denied");
    }), this.container.querySelectorAll("[data-remove-allowed]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.preventDefault();
        const r = e.getAttribute("data-remove-allowed");
        r && this.removeBlockFromList("allowed", r);
      });
    }), this.container.querySelectorAll("[data-remove-denied]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.preventDefault();
        const r = e.getAttribute("data-remove-denied");
        r && this.removeBlockFromList("denied", r);
      });
    }));
  }
  async showBlockPicker(e) {
    const t = this.container?.querySelector(`input[name="${e}Blocks"]`), r = t?.value ? JSON.parse(t.value) : [], a = Be(this.config.apiBasePath);
    new Qt({
      apiBasePath: a,
      selectedBlocks: r,
      title: e === "allowed" ? "Select Allowed Blocks" : "Select Denied Blocks",
      onSelect: (i) => {
        this.updateBlockList(e, i);
      }
    }).show();
  }
  updateBlockList(e, t) {
    const r = this.container?.querySelector(`input[name="${e}Blocks"]`), a = this.container?.querySelector(`[data-${e}-blocks-chips]`);
    if (!(!r || !a))
      if (r.value = JSON.stringify(t), t.length === 0) {
        const s = e === "allowed" ? "All blocks allowed (no restrictions)" : "No blocks denied";
        a.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500">${s}</span>`;
      } else {
        const s = e === "allowed" ? "blue" : "red";
        a.innerHTML = t.map(
          (i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${s}-100 text-${s}-700 dark:bg-${s}-900/30 dark:text-${s}-400" data-block-chip="${w(i)}">${w(i)}<button type="button" data-remove-${e}="${w(i)}" class="hover:text-${s}-900 dark:hover:text-${s}-200">&times;</button></span>`
        ).join(""), a.querySelectorAll(`[data-remove-${e}]`).forEach((i) => {
          i.addEventListener("click", (n) => {
            n.preventDefault();
            const l = i.getAttribute(`data-remove-${e}`);
            l && this.removeBlockFromList(e, l);
          });
        });
      }
  }
  removeBlockFromList(e, t) {
    const r = this.container?.querySelector(`input[name="${e}Blocks"]`);
    if (!r) return;
    const s = (r.value ? JSON.parse(r.value) : []).filter((i) => i !== t);
    this.updateBlockList(e, s);
  }
  handleSave() {
    const e = this.container?.querySelector("[data-field-config-form-element]");
    if (!e) return;
    const t = new FormData(e), r = t.get("name")?.trim();
    if (!r) {
      this.showError("name", "Field name is required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(r)) {
      this.showError("name", "Invalid field name format");
      return;
    }
    const a = this.config.existingFieldNames ?? [], s = this.config.field.name;
    if (r !== s && a.includes(r)) {
      this.showError("name", "A field with this name already exists");
      return;
    }
    const i = t.get("label")?.trim();
    if (!i) {
      this.showError("label", "Label is required");
      return;
    }
    const n = {
      id: this.field.id || Z(),
      name: r,
      type: this.field.type,
      order: this.field.order,
      label: i,
      description: t.get("description")?.trim() || void 0,
      placeholder: t.get("placeholder")?.trim() || void 0,
      required: t.get("required") === "on",
      readonly: t.get("readonly") === "on",
      hidden: t.get("hidden") === "on",
      filterable: t.get("filterable") === "on",
      section: t.get("section")?.trim() || void 0,
      gridSpan: t.get("gridSpan") ? parseInt(t.get("gridSpan"), 10) : void 0
    }, l = {}, d = t.get("minLength");
    d !== null && d !== "" && (l.minLength = parseInt(d, 10));
    const c = t.get("maxLength");
    c !== null && c !== "" && (l.maxLength = parseInt(c, 10));
    const g = t.get("min");
    g !== null && g !== "" && (l.min = parseFloat(g));
    const m = t.get("max");
    m !== null && m !== "" && (l.max = parseFloat(m));
    const h = t.get("pattern");
    h && h.trim() && (l.pattern = h.trim()), Object.keys(l).length > 0 && (n.validation = l);
    const b = this.buildTypeSpecificConfig(t);
    b && Object.keys(b).length > 0 && (n.config = b), this.config.onSave(n), this.hide();
  }
  buildTypeSpecificConfig(e) {
    switch (this.field.type) {
      case "select":
      case "radio":
      case "chips": {
        const t = [];
        let r = 0;
        for (; e.has(`option_value_${r}`); ) {
          const a = e.get(`option_value_${r}`)?.trim(), s = e.get(`option_label_${r}`)?.trim();
          a && t.push({ value: a, label: s || a }), r++;
        }
        return t.length > 0 ? { options: t } : void 0;
      }
      case "reference":
      case "references":
      case "user": {
        const t = e.get("target")?.trim(), r = e.get("displayField")?.trim();
        return t ? { target: t, displayField: r || void 0 } : void 0;
      }
      case "media-picker":
      case "media-gallery":
      case "file-upload": {
        const t = e.get("accept")?.trim(), r = e.get("maxSize") ? parseInt(e.get("maxSize"), 10) : void 0, a = e.get("multiple") === "on";
        return {
          accept: t || void 0,
          maxSize: r,
          multiple: this.field.type === "media-gallery" ? a : void 0
        };
      }
      case "code": {
        const t = e.get("language")?.trim() || "json", r = e.get("lineNumbers") === "on";
        return { language: t, lineNumbers: r };
      }
      case "slug": {
        const t = e.get("sourceField")?.trim(), r = e.get("slugPrefix")?.trim(), a = e.get("slugSuffix")?.trim(), s = e.get("slugSeparator")?.trim() || "-";
        return {
          sourceField: t || void 0,
          prefix: r || void 0,
          suffix: a || void 0,
          separator: s
        };
      }
      case "color": {
        const t = e.get("colorFormat")?.trim() || "hex", r = e.get("allowAlpha") === "on", a = e.get("colorPresets")?.trim(), s = a ? a.split(",").map((i) => i.trim()).filter(Boolean) : void 0;
        return {
          format: t,
          allowAlpha: r,
          presets: s
        };
      }
      case "location": {
        const t = e.get("defaultLat"), r = e.get("defaultLng"), a = e.get("defaultZoom"), i = { searchEnabled: e.get("searchEnabled") === "on" };
        return t && r && (i.defaultCenter = {
          lat: parseFloat(t),
          lng: parseFloat(r)
        }), a && (i.defaultZoom = parseInt(a, 10)), i;
      }
      case "daterange": {
        const t = e.get("minDate")?.trim(), r = e.get("maxDate")?.trim(), a = e.get("allowSameDay") === "on";
        return {
          minDate: t || void 0,
          maxDate: r || void 0,
          allowSameDay: a
        };
      }
      case "repeater": {
        const t = e.get("minItems"), r = e.get("maxItems"), a = e.get("collapsed") === "on";
        return {
          fields: this.field.config?.fields ?? [],
          minItems: t ? parseInt(t, 10) : void 0,
          maxItems: r ? parseInt(r, 10) : void 0,
          collapsed: a
        };
      }
      case "blocks": {
        const t = e.get("minBlocks"), r = e.get("maxBlocks"), a = e.get("allowedBlocks")?.trim(), s = e.get("deniedBlocks")?.trim(), i = this.field.config;
        let n, l;
        if (a)
          try {
            const d = JSON.parse(a);
            n = Array.isArray(d) && d.length > 0 ? d : void 0;
          } catch {
            n = a.split(",").map((d) => d.trim()).filter(Boolean), n.length === 0 && (n = void 0);
          }
        if (s)
          try {
            const d = JSON.parse(s);
            l = Array.isArray(d) && d.length > 0 ? d : void 0;
          } catch {
            l = s.split(",").map((d) => d.trim()).filter(Boolean), l.length === 0 && (l = void 0);
          }
        return {
          __sourceItemsSchema: i?.__sourceItemsSchema,
          __sourceAllowedBlocks: i?.__sourceAllowedBlocks,
          __sourceDeniedBlocks: i?.__sourceDeniedBlocks,
          __sourceRefPrefix: i?.__sourceRefPrefix,
          __sourceRepresentation: i?.__sourceRepresentation,
          __sourceWidget: i?.__sourceWidget,
          __sourceSortable: i?.__sourceSortable,
          __sourceHadAllowedBlocks: i?.__sourceHadAllowedBlocks,
          __sourceHadDeniedBlocks: i?.__sourceHadDeniedBlocks,
          minBlocks: t ? parseInt(t, 10) : void 0,
          maxBlocks: r ? parseInt(r, 10) : void 0,
          allowedBlocks: n,
          deniedBlocks: l
        };
      }
      default:
        return;
    }
  }
  showError(e, t) {
    const r = this.container?.querySelector(`[name="${e}"]`);
    if (!r) return;
    r.classList.add("border-red-500", "focus:ring-red-500"), r.focus(), r.parentElement?.querySelector(".field-error")?.remove();
    const s = document.createElement("p");
    s.className = "field-error text-xs text-red-500 mt-1", s.textContent = t, r.parentElement?.appendChild(s);
    const i = () => {
      r.classList.remove("border-red-500", "focus:ring-red-500"), s.remove(), r.removeEventListener("input", i);
    };
    r.addEventListener("input", i);
  }
}
function w(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function Yt(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[0-9]/, "_$&");
}
class Qt extends H {
  constructor(e) {
    super({ size: "lg", maxHeight: "max-h-[70vh]" }), this.availableBlocks = [], this.config = e, this.api = new K({ basePath: e.apiBasePath }), this.selectedBlocks = new Set(e.selectedBlocks);
  }
  async onAfterShow() {
    await this.loadBlocks();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${w(this.config.title)}</h3>
        <button type="button" data-picker-close class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div data-blocks-loading class="flex items-center justify-center py-8">
          <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
        <div data-blocks-list class="hidden space-y-2"></div>
        <div data-blocks-empty class="hidden text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No block definitions available. Create some in the Block Library first.
        </div>
      </div>

      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <span class="text-xs text-gray-500 dark:text-gray-400" data-selection-count>0 selected</span>
        <div class="flex gap-2">
          <button
            type="button"
            data-picker-cancel
            class="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            data-picker-confirm
            class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    this.container && (this.container.querySelector("[data-picker-close]")?.addEventListener("click", () => this.hide()), this.container.querySelector("[data-picker-cancel]")?.addEventListener("click", () => this.hide()), this.container.querySelector("[data-picker-confirm]")?.addEventListener("click", () => {
      this.config.onSelect(Array.from(this.selectedBlocks)), this.hide();
    }));
  }
  async loadBlocks() {
    const e = this.container?.querySelector("[data-blocks-loading]"), t = this.container?.querySelector("[data-blocks-list]"), r = this.container?.querySelector("[data-blocks-empty]");
    try {
      this.availableBlocks = await Oe(this.api), this.selectedBlocks = oe(this.selectedBlocks, this.availableBlocks), e?.classList.add("hidden"), this.availableBlocks.length === 0 ? r?.classList.remove("hidden") : (t?.classList.remove("hidden"), this.renderBlocksList());
    } catch {
      e?.classList.add("hidden"), r?.classList.remove("hidden");
      const a = r?.querySelector("span") || r;
      a && (a.textContent = "Failed to load block definitions");
    }
  }
  renderBlocksList() {
    const e = this.container?.querySelector("[data-blocks-list]");
    e && (e.innerHTML = this.availableBlocks.map((t) => {
      const r = be(t), a = this.selectedBlocks.has(r) || this.selectedBlocks.has(t.type);
      return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${a ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
            <input
              type="checkbox"
              value="${w(r)}"
              data-block-type="${w(t.type)}"
              ${a ? "checked" : ""}
              class="${F()}"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${t.icon || r.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${w(t.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${w(r)}</div>
            </div>
            ${t.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${w(t.schema_version)}</span>` : ""}
          </label>
        `;
    }).join(""), e.querySelectorAll('input[type="checkbox"]').forEach((t) => {
      t.addEventListener("change", () => {
        const r = t.value, a = t.dataset.blockType;
        t.checked ? (this.selectedBlocks.add(r), a && a !== r && this.selectedBlocks.delete(a)) : (this.selectedBlocks.delete(r), a && this.selectedBlocks.delete(a)), this.updateSelectionCount(), this.renderBlocksList();
      });
    }), this.updateSelectionCount());
  }
  updateSelectionCount() {
    const e = this.container?.querySelector("[data-selection-count]");
    if (e) {
      const t = this.selectedBlocks.size;
      e.textContent = `${t} selected`;
    }
  }
}
class Zt extends H {
  constructor(e) {
    super({ size: "3xl", backdropDataAttr: "data-layout-editor-backdrop" }), this.dragState = null, this.config = e, this.layout = JSON.parse(JSON.stringify(e.layout ?? { type: "flat", gridColumns: 12 })), this.layout.tabs || (this.layout.tabs = []);
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Layout Settings</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configure tabs, sections, and grid layout</p>
        </div>
        <button type="button" data-layout-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      </div>

      <div data-layout-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-layout-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-layout-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Apply Layout
        </button>
      </div>
    `;
  }
  renderLayoutTypeSection() {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Layout Type</h3>

        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            data-layout-type="flat"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${this.layout.type === "flat" || !this.layout.type ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Flat</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">All fields in one view</span>
          </button>

          <button
            type="button"
            data-layout-type="tabs"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${this.layout.type === "tabs" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tabs</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Organize with tabs</span>
          </button>

          <button
            type="button"
            data-layout-type="sections"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${this.layout.type === "sections" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Sections</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Collapsible sections</span>
          </button>
        </div>
      </div>
    `;
  }
  renderGridSection() {
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Grid Settings</h3>

        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Columns
            </label>
            <select
              data-grid-columns
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1" ${this.layout.gridColumns === 1 ? "selected" : ""}>1 Column</option>
              <option value="2" ${this.layout.gridColumns === 2 ? "selected" : ""}>2 Columns</option>
              <option value="3" ${this.layout.gridColumns === 3 ? "selected" : ""}>3 Columns</option>
              <option value="4" ${this.layout.gridColumns === 4 ? "selected" : ""}>4 Columns</option>
              <option value="6" ${this.layout.gridColumns === 6 ? "selected" : ""}>6 Columns</option>
              <option value="12" ${this.layout.gridColumns === 12 || !this.layout.gridColumns ? "selected" : ""}>12 Columns (default)</option>
            </select>
          </div>

          <div class="flex-1">
            <div class="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              Fields use <code class="text-xs">gridSpan</code> to control width. Set per-field in field settings.
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderTabsSection() {
    if (this.layout.type !== "tabs" && this.layout.type !== "sections")
      return "";
    const e = this.layout.tabs ?? [], t = this.layout.type === "tabs" ? "Tab" : "Section";
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">${t}s</h3>
          <button
            type="button"
            data-add-tab
            class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add ${t}
          </button>
        </div>

        <div data-tabs-list class="space-y-2">
          ${e.length === 0 ? `
            <div class="text-sm text-gray-500 dark:text-gray-400 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              No ${t.toLowerCase()}s defined. Fields without a section will appear in a default "${t.toLowerCase()}".
            </div>
          ` : e.map((r, a) => this.renderTabRow(r, a)).join("")}
        </div>
      </div>
    `;
  }
  renderTabRow(e, t) {
    return `
      <div
        class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900"
        data-tab-row="${e.id}"
        data-tab-index="${t}"
        draggable="true"
      >
        <div class="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-tab-drag-handle>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
          </svg>
        </div>

        <div class="flex-1 grid grid-cols-3 gap-3">
          <input
            type="text"
            data-tab-id="${e.id}"
            name="tab_id_${t}"
            value="${ue(e.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${t}"
            value="${ue(e.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          ${$e(e.icon ?? "", `name="tab_icon_${t}"`)}
        </div>

        <button
          type="button"
          data-remove-tab="${e.id}"
          class="p-2 text-gray-400 hover:text-red-500"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }
  renderFieldAssignment() {
    if (this.layout.type !== "tabs" && this.layout.type !== "sections")
      return "";
    const e = this.layout.tabs ?? [], t = this.layout.type === "tabs" ? "tab" : "section", r = /* @__PURE__ */ new Map();
    r.set("", []);
    for (const a of e)
      r.set(a.id, []);
    for (const a of this.config.fields) {
      const s = a.section ?? "";
      r.has(s) || r.set(s, []), r.get(s).push(a);
    }
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Field Assignment</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Fields are assigned to ${t}s via the "Section/Tab" setting in each field's configuration.
        </p>

        <div class="grid grid-cols-2 gap-4">
          ${Array.from(r.entries()).map(
      ([a, s]) => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${a || "(Unassigned)"}
              </div>
              <div class="space-y-1">
                ${s.length === 0 ? '<div class="text-xs text-gray-400">No fields</div>' : s.map((i) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${ue(i.label)} <span class="font-mono">(${ue(i.name)})</span></div>`).join("")}
              </div>
            </div>
          `
    ).join("")}
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    this.container && (this.container.querySelector("[data-layout-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-layout-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-layout-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container.querySelectorAll("[data-layout-type]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.getAttribute("data-layout-type");
        this.layout.type = t, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (e) => {
      const t = e.target.value;
      this.layout.gridColumns = parseInt(t, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  bindTabEvents() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-remove-tab]").forEach((t) => {
      t.addEventListener("click", () => {
        const r = t.getAttribute("data-remove-tab");
        r && this.removeTab(r);
      });
    }), this.container.querySelectorAll('input[name^="tab_id_"]').forEach((t) => {
      t.addEventListener("input", () => {
        this.updateTabsFromForm();
      });
    }), Ce(this.container, "[data-icon-trigger]", (t) => {
      const r = t.querySelector('input[name^="tab_icon_"]');
      return {
        value: r?.value ?? "",
        onSelect: (a) => {
          r && (r.value = a);
        },
        onClear: () => {
          r && (r.value = "");
        }
      };
    });
    const e = this.container.querySelector("[data-tabs-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const a = t.target.closest("[data-tab-row]");
      a && (this.dragState = {
        tabId: a.getAttribute("data-tab-row") ?? "",
        startIndex: parseInt(a.getAttribute("data-tab-index") ?? "0", 10)
      }, a.classList.add("opacity-50"));
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), !this.dragState) return;
      const a = t.target.closest("[data-tab-row]");
      if (!a) return;
      const s = parseInt(a.getAttribute("data-tab-index") ?? "0", 10);
      this.moveTab(this.dragState.tabId, s), this.dragState = null;
    }), e.addEventListener("dragend", () => {
      e.querySelectorAll(".opacity-50").forEach((t) => t.classList.remove("opacity-50")), this.dragState = null;
    }));
  }
  addTab() {
    const t = {
      id: `section_${(this.layout.tabs?.length ?? 0) + 1}`,
      label: `Section ${(this.layout.tabs?.length ?? 0) + 1}`,
      order: this.layout.tabs?.length ?? 0
    };
    this.layout.tabs || (this.layout.tabs = []), this.layout.tabs.push(t), this.updateView();
  }
  removeTab(e) {
    this.layout.tabs && (this.layout.tabs = this.layout.tabs.filter((t) => t.id !== e), this.updateView());
  }
  moveTab(e, t) {
    if (!this.layout.tabs) return;
    const r = this.layout.tabs.findIndex((s) => s.id === e);
    if (r === -1 || r === t) return;
    const a = this.layout.tabs.splice(r, 1)[0];
    this.layout.tabs.splice(t, 0, a), this.layout.tabs.forEach((s, i) => {
      s.order = i;
    }), this.updateView();
  }
  updateTabsFromForm() {
    !this.container || !this.layout.tabs || this.layout.tabs.forEach((e, t) => {
      const r = this.container.querySelector(`input[name="tab_id_${t}"]`), a = this.container.querySelector(`input[name="tab_label_${t}"]`), s = this.container.querySelector(`input[name="tab_icon_${t}"]`);
      r && (e.id = r.value.trim()), a && (e.label = a.value.trim()), s && (e.icon = s.value.trim() || void 0);
    });
  }
  updateView() {
    if (!this.container) return;
    O();
    const e = this.container.querySelector(".overflow-y-auto");
    e && (e.innerHTML = `
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      `, this.container.querySelectorAll("[data-layout-type]").forEach((t) => {
      t.addEventListener("click", () => {
        const r = t.getAttribute("data-layout-type");
        this.layout.type = r, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (t) => {
      const r = t.target.value;
      this.layout.gridColumns = parseInt(r, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  handleSave() {
    if (this.updateTabsFromForm(), this.layout.tabs && this.layout.tabs.length > 0) {
      const e = /* @__PURE__ */ new Set();
      for (const t of this.layout.tabs) {
        if (!t.id.trim()) {
          this.showLayoutError("All tabs must have an ID");
          return;
        }
        if (e.has(t.id)) {
          this.showLayoutError(`Duplicate tab ID: ${t.id}`);
          return;
        }
        e.add(t.id);
      }
    }
    this.config.onSave(this.layout), this.hide();
  }
  showLayoutError(e) {
    const t = this.container?.querySelector("[data-layout-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const r = t.querySelector("p");
    r && (r.textContent = e), setTimeout(() => t.classList.add("hidden"), 5e3);
  }
}
function ue(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
const Xt = {
  text: "text",
  media: "media",
  choice: "selection",
  number: "number",
  datetime: "datetime",
  relationship: "reference",
  structure: "structural",
  advanced: "advanced"
}, er = {
  text: "cat-text",
  media: "cat-media",
  choice: "cat-selection",
  number: "cat-number",
  datetime: "cat-datetime",
  relationship: "cat-reference",
  structure: "cat-structural",
  advanced: "cat-advanced"
};
function tr(o) {
  const e = (o ?? "").trim().toLowerCase();
  return Xt[e] ?? "advanced";
}
function rr(o, e) {
  const t = (o ?? "").trim();
  if (t) return t;
  const r = (e ?? "").trim();
  return r ? gt(r) : "Advanced";
}
function ar(o) {
  const e = (o ?? "").trim().toLowerCase(), t = er[e] ?? "cat-advanced";
  return X(t);
}
function sr(o) {
  const e = o.defaults;
  return !e || typeof e != "object" ? void 0 : e;
}
function ir(o, e) {
  const t = (o.type ?? "text").trim().toLowerCase(), r = t === "text" ? "textarea" : P(t), a = (o.label ?? "").trim() || gt(o.type ?? r), s = (o.description ?? "").trim(), i = X(o.icon ?? "") || X(r) || "", n = sr(o), l = {
    type: r,
    label: a,
    description: s,
    icon: i,
    category: e,
    defaultConfig: n
  };
  return (o.type ?? "").toLowerCase() === "hidden" && (l.defaultConfig = {
    ...l.defaultConfig ?? {},
    hidden: !0
  }), l;
}
function pt(o) {
  const e = [], t = [];
  for (const r of o) {
    const a = r.category ?? {}, s = (a.id ?? "").trim().toLowerCase(), i = tr(s);
    e.push({
      id: i,
      label: rr(a.label, s),
      icon: ar(s),
      collapsed: a.collapsed
    });
    const n = Array.isArray(r.field_types) ? r.field_types : [];
    for (const l of n)
      t.push(ir(l, i));
  }
  return { categories: e, fieldTypes: t };
}
const or = pt([
  {
    category: { id: "text", label: "Text", icon: "text", order: 10 },
    field_types: [
      {
        type: "string",
        label: "Single Line Text",
        description: "Short text value",
        category: "text",
        icon: "text",
        defaults: { validation: { maxLength: 255 } },
        order: 10
      },
      {
        type: "text",
        label: "Multi Line Text",
        description: "Paragraph text",
        category: "text",
        icon: "textarea",
        defaults: { config: { rows: 4 } },
        order: 20
      },
      {
        type: "richtext",
        label: "Rich Text",
        description: "Formatted text editor",
        category: "text",
        icon: "rich-text",
        defaults: { config: { toolbar: "standard" } },
        order: 30
      },
      {
        type: "slug",
        label: "Slug",
        description: "URL-friendly identifier",
        category: "text",
        icon: "slug",
        defaults: { config: { sourceField: null } },
        order: 40
      },
      {
        type: "url",
        label: "URL",
        description: "Website link",
        category: "text",
        icon: "url",
        order: 50
      },
      {
        type: "email",
        label: "Email",
        description: "Email address",
        category: "text",
        icon: "email",
        order: 60
      }
    ]
  },
  {
    category: { id: "media", label: "Media", icon: "media", order: 20 },
    field_types: [
      {
        type: "image",
        label: "Image",
        description: "Image asset",
        category: "media",
        icon: "media-picker",
        defaults: { config: { accept: "image/*" } },
        order: 10
      },
      {
        type: "file",
        label: "File",
        description: "File attachment",
        category: "media",
        icon: "file-upload",
        order: 20
      }
    ]
  },
  {
    category: { id: "choice", label: "Choice", icon: "choice", order: 30 },
    field_types: [
      {
        type: "boolean",
        label: "Boolean",
        description: "True/false toggle",
        category: "choice",
        icon: "toggle",
        defaults: { config: { displayAs: "toggle" } },
        order: 10
      },
      {
        type: "select",
        label: "Select",
        description: "Dropdown selection",
        category: "choice",
        icon: "select",
        defaults: { config: { options: [], multiple: !1 } },
        order: 20
      },
      {
        type: "multiselect",
        label: "Multi Select",
        description: "Multiple selections",
        category: "choice",
        icon: "chips",
        defaults: { config: { options: [], multiple: !0 } },
        order: 30
      }
    ]
  },
  {
    category: { id: "number", label: "Number", icon: "number", order: 40 },
    field_types: [
      { type: "integer", label: "Integer", description: "Whole number", category: "number", icon: "integer", order: 10 },
      {
        type: "decimal",
        label: "Decimal",
        description: "Decimal number",
        category: "number",
        icon: "number",
        defaults: { config: { precision: 2 } },
        order: 20
      }
    ]
  },
  {
    category: { id: "datetime", label: "Date & Time", icon: "datetime", order: 50 },
    field_types: [
      {
        type: "date",
        label: "Date",
        description: "Calendar date",
        category: "datetime",
        icon: "date",
        defaults: { config: { format: "YYYY-MM-DD" } },
        order: 10
      },
      {
        type: "datetime",
        label: "Date & Time",
        description: "Date with time",
        category: "datetime",
        icon: "datetime",
        order: 20
      }
    ]
  },
  {
    category: { id: "relationship", label: "Relationship", icon: "relationship", order: 60 },
    field_types: [
      {
        type: "reference",
        label: "Reference",
        description: "Link to another type",
        category: "relationship",
        icon: "reference",
        defaults: { config: { targetType: null } },
        order: 10
      }
    ]
  },
  {
    category: { id: "structure", label: "Structure", icon: "structure", order: 70 },
    field_types: [
      {
        type: "group",
        label: "Group",
        description: "Nested fields",
        category: "structure",
        icon: "group",
        defaults: { config: { fields: [] } },
        order: 10
      }
    ]
  },
  {
    category: { id: "advanced", label: "Advanced", icon: "advanced", order: 80, collapsed: !0 },
    field_types: [
      { type: "json", label: "JSON", description: "Raw JSON input", category: "advanced", icon: "json", order: 10 },
      {
        type: "color",
        label: "Color",
        description: "Color picker",
        category: "advanced",
        icon: "color",
        defaults: { config: { format: "hex" } },
        order: 20
      },
      {
        type: "hidden",
        label: "Hidden",
        description: "Hidden field",
        category: "advanced",
        icon: "json",
        order: 30
      }
    ]
  }
]);
function gt(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function nr() {
  const o = /* @__PURE__ */ new Map();
  for (const t of we)
    o.set(t.type, t);
  for (const t of or.fieldTypes)
    o.has(t.type) || o.set(t.type, t);
  return {
    categories: st.map((t) => ({
      id: t.id,
      label: t.label,
      icon: t.icon
    })),
    fieldTypes: Array.from(o.values())
  };
}
const pe = nr();
async function lr(o) {
  try {
    const e = await o.getBlockFieldTypeGroups();
    if (e && e.length > 0) {
      const t = pt(e);
      return {
        categories: t.categories,
        fieldTypes: t.fieldTypes
      };
    }
  } catch {
  }
  try {
    const e = await o.getFieldTypes();
    if (e && e.length > 0)
      return {
        categories: [...pe.categories],
        fieldTypes: e
      };
  } catch {
  }
  return {
    categories: [...pe.categories],
    fieldTypes: [...pe.fieldTypes]
  };
}
const dr = /* @__PURE__ */ new Set(["advanced"]), ke = "application/x-field-palette-type", Re = "application/x-field-palette-meta";
class _e {
  constructor(e) {
    this.fieldTypes = [], this.fieldTypeByKey = /* @__PURE__ */ new Map(), this.fieldTypeKeyByRef = /* @__PURE__ */ new Map(), this.categoryOrder = [], this.searchQuery = "", this.categoryStates = /* @__PURE__ */ new Map(), this.isLoading = !0, this.enabled = !1, this.config = e, this.categoryOrder = [...pe.categories];
  }
  // ===========================================================================
  // Public API
  // ===========================================================================
  /** Initialize: fetch field types and render */
  async init() {
    this.isLoading = !0, this.render(), await this.loadFieldTypes(), this.isLoading = !1, this.render();
  }
  /** Enable the palette (a block is selected) */
  enable() {
    this.enabled = !0, this.render();
  }
  /** Disable the palette (no block selected) */
  disable() {
    this.enabled = !1, this.render();
  }
  /** Refresh field types from the API */
  async refresh() {
    await this.loadFieldTypes(), this.render();
  }
  // ===========================================================================
  // Data Loading (Task 9.1)
  // ===========================================================================
  async loadFieldTypes() {
    const e = await lr(this.config.api);
    this.fieldTypes = e.fieldTypes, this.categoryOrder = e.categories, this.initCategoryStates(), this.buildFieldTypeKeyMap();
  }
  initCategoryStates() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.categoryOrder)
      e.add(t.id);
    for (const t of e)
      this.categoryStates.has(t) || this.categoryStates.set(t, {
        collapsed: dr.has(t)
      });
    for (const t of this.categoryOrder) {
      const r = this.categoryStates.get(t.id) ?? { collapsed: !1 };
      t.collapsed !== void 0 && (r.collapsed = t.collapsed), this.categoryStates.set(t.id, r);
    }
  }
  buildFieldTypeKeyMap() {
    this.fieldTypeByKey.clear(), this.fieldTypeKeyByRef.clear(), this.fieldTypes.forEach((e, t) => {
      const r = `${e.type}:${t}`;
      this.fieldTypeByKey.set(r, e), this.fieldTypeKeyByRef.set(e, r);
    });
  }
  // ===========================================================================
  // Rendering
  // ===========================================================================
  render() {
    const e = this.config.container;
    if (this.isLoading) {
      e.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>`;
      return;
    }
    if (!this.enabled) {
      e.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-xs text-gray-400 dark:text-gray-500">Select a block to see available field types</p>
        </div>`;
      return;
    }
    e.innerHTML = "", e.classList.add("flex", "flex-col", "min-h-0");
    const t = document.createElement("div");
    t.className = "px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0", t.innerHTML = `
      <div class="relative">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input type="text"
               data-palette-search
               placeholder="Search fields..."
               value="${_(this.searchQuery)}"
               class="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-700 transition-colors" />
      </div>`, e.appendChild(t);
    const r = document.createElement("div");
    r.className = "overflow-y-auto flex-1 min-h-0", r.setAttribute("data-palette-list", ""), this.searchQuery ? r.innerHTML = this.renderSearchResults() : r.innerHTML = this.renderCategoryGroups(), e.appendChild(r), this.bindEvents(e);
  }
  // ===========================================================================
  // Rendering – Category Groups (Task 9.2)
  // ===========================================================================
  renderCategoryGroups() {
    let e = "";
    for (const t of this.categoryOrder) {
      const r = this.fieldTypes.filter((i) => i.category === t.id);
      if (r.length === 0) continue;
      const s = this.categoryStates.get(t.id)?.collapsed ?? !1;
      e += `
        <div data-palette-category="${_(t.id)}" class="border-b border-gray-50 dark:border-gray-800">
          <button type="button" data-palette-toggle="${_(t.id)}"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3 h-3 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-palette-chevron="${_(t.id)}">
              ${s ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 dark:text-gray-500">${t.icon}</span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex-1">${_(t.label)}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">${r.length}</span>
          </button>
          <div class="${s ? "hidden" : ""}" data-palette-category-body="${_(t.id)}">
            <div class="px-2 pb-2 space-y-0.5">
              ${r.map((i) => this.renderPaletteItem(i)).join("")}
            </div>
          </div>
        </div>`;
    }
    return e || (e = `
        <div class="px-4 py-8 text-center">
          <p class="text-xs text-gray-400 dark:text-gray-500">No field types available.</p>
        </div>`), e;
  }
  // ===========================================================================
  // Rendering – Search Results (Task 9.2)
  // ===========================================================================
  renderSearchResults() {
    const e = this.searchQuery.toLowerCase(), t = this.fieldTypes.filter(
      (r) => r.label.toLowerCase().includes(e) || (r.description ?? "").toLowerCase().includes(e) || r.type.toLowerCase().includes(e)
    );
    return t.length === 0 ? `
        <div class="px-4 py-8 text-center">
          <svg class="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-gray-400 dark:text-gray-500">No fields match "${_(this.searchQuery)}"</p>
        </div>` : `
      <div class="px-2 py-2 space-y-0.5">
        ${t.map((r) => this.renderPaletteItem(r)).join("")}
      </div>`;
  }
  // ===========================================================================
  // Rendering – Single Palette Item (Tasks 9.1 + 9.3)
  // ===========================================================================
  renderPaletteItem(e) {
    const t = this.fieldTypeKeyByRef.get(e) ?? e.type;
    return `
      <div data-palette-item="${_(t)}"
           draggable="true"
           class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-blue-50 dark:hover:bg-blue-900/20 active:cursor-grabbing transition-colors group select-none"
           title="${_(e.description)}">
        <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 cursor-grab" data-palette-grip>
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
          </svg>
        </span>
        <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          ${e.icon}
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-[12px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">${_(e.label)}</span>
        </span>
      </div>`;
  }
  // ===========================================================================
  // Event Binding
  // ===========================================================================
  bindEvents(e) {
    const t = e.querySelector("[data-palette-search]");
    t?.addEventListener("input", () => {
      this.searchQuery = t.value;
      const a = e.querySelector("[data-palette-list]");
      a && (a.innerHTML = this.searchQuery ? this.renderSearchResults() : this.renderCategoryGroups(), this.bindListEvents(a));
    });
    const r = e.querySelector("[data-palette-list]");
    r && this.bindListEvents(r);
  }
  bindListEvents(e) {
    e.querySelectorAll("[data-palette-toggle]").forEach((t) => {
      t.addEventListener("click", () => {
        const r = t.dataset.paletteToggle, a = this.categoryStates.get(r) ?? { collapsed: !1 };
        a.collapsed = !a.collapsed, this.categoryStates.set(r, a);
        const s = e.querySelector(`[data-palette-category-body="${r}"]`), i = e.querySelector(`[data-palette-chevron="${r}"]`);
        s && s.classList.toggle("hidden", a.collapsed), i && (i.innerHTML = a.collapsed ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      });
    }), e.querySelectorAll("[data-palette-item]").forEach((t) => {
      t.addEventListener("click", (r) => {
        if (r.detail === 0) return;
        const a = t.dataset.paletteItem, s = this.fieldTypeByKey.get(a) ?? this.fieldTypes.find((i) => i.type === a);
        s && this.config.onAddField(s);
      });
    }), e.querySelectorAll("[data-palette-item]").forEach((t) => {
      t.addEventListener("dragstart", (r) => {
        const a = t.dataset.paletteItem;
        r.dataTransfer.effectAllowed = "copy";
        const s = this.fieldTypeByKey.get(a) ?? this.fieldTypes.find((i) => i.type === a);
        s ? (r.dataTransfer.setData(ke, s.type), r.dataTransfer.setData(Re, JSON.stringify(s))) : r.dataTransfer.setData(ke, a), r.dataTransfer.setData("text/plain", s?.type ?? a), t.classList.add("opacity-50");
      }), t.addEventListener("dragend", () => {
        t.classList.remove("opacity-50");
      });
    });
  }
}
function _(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function re(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function yt(o, e) {
  switch (o) {
    case "saving":
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
        <span class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
        Saving…
      </span>`;
    case "saved":
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-md">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Saved
      </span>`;
    case "error":
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-md"${e ? ` title="${re(e)}"` : ""}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Save failed
      </span>`;
    default:
      return "";
  }
}
function mt(o) {
  const {
    name: e,
    subtitle: t,
    subtitleMono: r = !1,
    status: a,
    version: s,
    saveState: i = "idle",
    saveMessage: n,
    actions: l,
    compact: d = !1
  } = o, c = d ? "px-5" : "px-6", g = d ? "h2" : "h1", m = d ? "text-lg" : "text-xl", h = d ? "gap-2.5" : "gap-3", b = yt(i, n), k = a ? J(
    d ? a : a.charAt(0).toUpperCase() + a.slice(1),
    "status",
    a,
    d ? { uppercase: !0, attrs: { "data-entity-status-badge": "" } } : { attrs: { "data-entity-status-badge": "" } }
  ) : "", C = s ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${re(s)}</span>` : "", y = t ? `<p class="${r ? "text-[11px] font-mono text-gray-400 dark:text-gray-500" : "text-sm text-gray-500 dark:text-gray-400"} mt-0.5 truncate">${re(t)}</p>` : "";
  return d ? `
      <div class="${c} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <${g} class="${m} font-semibold text-gray-900 dark:text-white truncate leading-snug" data-entity-name>${re(e)}</${g}>
          ${y}
        </div>
        <div class="flex items-center ${h} shrink-0">
          <span data-entity-save-indicator>${b}</span>
          ${k}
          ${l || ""}
        </div>
      </div>` : `
    <div class="${c} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
      <div>
        <div class="flex items-center gap-3">
          <${g} class="${m} font-semibold text-gray-900 dark:text-white" data-entity-name>${re(e)}</${g}>
          ${k}
          ${C}
        </div>
        ${y}
      </div>
      <div class="flex items-center ${h}">
        <span data-entity-save-indicator>${b}</span>
        ${l || ""}
      </div>
    </div>`;
}
function E(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const cr = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>', ur = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>', hr = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>', pr = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>', gr = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
function ft(o) {
  const {
    field: e,
    isExpanded: t = !1,
    isSelected: r = !1,
    isDropTarget: a = !1,
    hasErrors: s = !1,
    errorMessages: i = [],
    showReorderButtons: n = !1,
    isFirst: l = !1,
    isLast: d = !1,
    compact: c = !1,
    renderExpandedContent: g,
    actionsHtml: m = "",
    constraintBadges: h = [],
    sectionName: b,
    index: k
  } = o, C = Se(e.type), y = typeof g == "function";
  let S;
  s ? S = "border-red-400 bg-red-50 dark:bg-red-900/10" : t ? S = "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20" : r ? S = "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : S = "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600";
  const B = a ? "border-t-2 border-t-blue-400" : "", A = c ? "gap-1.5 px-2 py-2" : "gap-3 p-3", bt = c ? "w-7 h-7 rounded-md" : "w-8 h-8 rounded-lg", vt = c ? "text-[13px]" : "text-sm", kt = c ? "text-[10px]" : "text-xs", xt = c ? "xs" : "sm", wt = s ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400", St = s ? gr : C?.icon ?? "?", ce = [];
  e.required && ce.push(J("req", "status", "required", { size: "sm", uppercase: !0, extraClass: "flex-shrink-0" })), e.readonly && ce.push(J("ro", "status", "readonly", { size: "sm", uppercase: !0, extraClass: "flex-shrink-0" })), e.hidden && ce.push(J("hid", "status", "hidden", { size: "sm", uppercase: !0, extraClass: "flex-shrink-0" }));
  const $t = ce.join(`
          `);
  let Le = `data-field-card="${E(e.id)}"`;
  b != null && (Le += ` data-field-section="${E(b)}"`), k != null && (Le += ` data-field-index="${k}"`);
  let Ee;
  if (c)
    Ee = `${E(e.name)} &middot; ${E(e.type)}`;
  else {
    const N = C?.label ?? e.type, W = [
      `<span class="font-mono">${E(e.name)}</span>`,
      "<span>&middot;</span>",
      `<span>${E(N)}</span>`
    ];
    e.section && W.push(`<span>&middot; ${E(e.section)}</span>`), e.gridSpan && W.push(`<span>&middot; ${e.gridSpan} cols</span>`), Ee = W.join(" ");
  }
  let Ve = "";
  h.length > 0 && (Ve = `
            <div class="flex items-center gap-1 mt-1">
              ${h.map((N) => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${E(N)}</span>`).join("")}
            </div>`);
  let Ue = "";
  s && i.length > 0 && (Ue = `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${i.map((N) => E(N)).join(", ")}
            </div>`);
  let Ge = "";
  if (n) {
    const N = l, W = d, Ct = N ? "text-gray-200 dark:text-gray-700 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800", Bt = W ? "text-gray-200 dark:text-gray-700 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
    Ge = `
          <span class="flex-shrink-0 inline-flex flex-col border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button type="button" data-field-move-up="${E(e.id)}"
                    class="px-0.5 py-px ${Ct} transition-colors"
                    title="Move up" ${N ? "disabled" : ""}>
              ${cr}
            </button>
            <span class="block h-px bg-gray-200 dark:bg-gray-700"></span>
            <button type="button" data-field-move-down="${E(e.id)}"
                    class="px-0.5 py-px ${Bt} transition-colors"
                    title="Move down" ${W ? "disabled" : ""}>
              ${ur}
            </button>
          </span>`;
  }
  let Je = "";
  return y && (Je = `
          <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors">
            ${t ? pr : hr}
          </span>`), `
      <div ${Le}
           draggable="true"
           class="rounded-lg border ${B} ${S} transition-colors">
        <div class="flex items-center ${A} select-none" ${y ? `data-field-toggle="${E(e.id)}"` : ""}>
          <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 cursor-grab active:cursor-grabbing" data-field-grip="${E(e.id)}">
            ${Ht(xt)}
          </span>
          <span class="flex-shrink-0 ${bt} flex items-center justify-center ${wt} text-[11px]">
            ${St}
          </span>
          <span class="flex-1 min-w-0 ${y ? "cursor-pointer" : ""}">
            <span class="block ${vt} font-medium text-gray-800 dark:text-gray-100 truncate">${E(e.label || e.name)}</span>
            <span class="block ${kt} text-gray-400 dark:text-gray-500 ${c ? "font-mono" : ""} truncate">${Ee}</span>${Ve}${Ue}
          </span>
          ${$t}
          ${Ge}
          ${m}
          ${Je}
        </div>
        ${t && y ? g() : ""}
      </div>`;
}
const yr = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>';
function mr(o) {
  return `<button type="button" data-field-actions="${E(o)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              ${yr}
            </button>`;
}
function qe(o = {}) {
  const {
    highlight: e = !1,
    text: t = "Drop a field here or click a field type in the palette"
  } = o;
  return `
      <div data-field-drop-zone
           class="mx-3 my-2 py-6 border-2 border-dashed rounded-lg text-center transition-colors ${e ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
        <p class="text-xs text-gray-400 dark:text-gray-500">${E(t)}</p>
      </div>`;
}
const L = "main";
class fr {
  constructor(e, t) {
    this.dragState = null, this.dropIndicator = null, this.dragOverRAF = null, this.staticEventsBound = !1, this.previewDebounceTimer = null, this.palettePanel = null, this.paletteVisible = !1, this.sectionStates = /* @__PURE__ */ new Map(), this.lifecycleOutsideClickHandler = null, this.cachedBlocks = null, this.blocksLoading = !1, this.blockPickerModes = /* @__PURE__ */ new Map(), this.fieldActionsMenuId = null, this.container = e, this.config = t, this.api = new K({ basePath: t.apiBasePath }), this.state = {
      contentType: null,
      fields: [],
      isDirty: !1,
      isLoading: !1,
      isSaving: !1,
      isPreviewing: !1,
      validationErrors: [],
      selectedFieldId: null,
      previewHtml: null,
      previewError: null,
      layout: { type: "flat", gridColumns: 12, tabs: [] },
      originalSchema: null,
      initialFieldsSignature: ""
    };
  }
  /**
   * Initialize the editor
   */
  async init() {
    this.render(), this.bindEvents(), this.config.contentTypeId && await this.loadContentType(this.config.contentTypeId);
  }
  /**
   * Load a content type for editing
   */
  async loadContentType(e) {
    this.state.isLoading = !0, this.updateLoadingState();
    try {
      const t = await this.api.get(e);
      this.state.contentType = t, this.state.fields = me(t.schema), this.state.originalSchema = t.schema ?? null, this.state.initialFieldsSignature = this.serializeFields(this.state.fields), t.ui_schema?.layout && (this.state.layout = {
        type: t.ui_schema.layout.type ?? "flat",
        tabs: t.ui_schema.layout.tabs ?? [],
        gridColumns: t.ui_schema.layout.gridColumns ?? 12
      }), this.state.isDirty = !1, this.render(), this.bindEvents(), this.schedulePreview();
    } catch (t) {
      console.error("Failed to load content type:", t), this.showToast("Failed to load content type", "error");
    } finally {
      this.state.isLoading = !1, this.updateLoadingState();
    }
  }
  /**
   * Save the content type
   */
  async save() {
    if (this.state.isSaving) return;
    const e = this.container.querySelector("[data-ct-name]"), t = e?.value?.trim();
    if (!t) {
      this.showToast("Name is required", "error"), e?.focus();
      return;
    }
    const r = this.buildSchemaPayload(), a = {
      name: t,
      slug: this.getSlug(),
      description: this.getDescription(),
      icon: this.getIcon(),
      schema: r,
      ui_schema: this.buildUISchema(),
      capabilities: this.getCapabilities()
    };
    this.state.isSaving = !0, this.updateSavingState();
    try {
      let s;
      this.state.contentType?.id ? s = await this.api.update(this.state.contentType.id, a) : s = await this.api.create(a), this.state.contentType = s, this.state.originalSchema = s.schema ?? null, this.state.initialFieldsSignature = this.serializeFields(this.state.fields), this.state.isDirty = !1, this.showToast("Content type saved successfully", "success"), this.config.onSave?.(s);
    } catch (s) {
      console.error("Failed to save content type:", s);
      const i = s instanceof Error ? s.message : "Failed to save content type";
      this.showToast(i, "error");
    } finally {
      this.state.isSaving = !1, this.updateSavingState();
    }
  }
  buildSchemaPayload() {
    const e = ye(this.state.fields, this.getSlug());
    return !this.schemaHasChanges() && this.state.originalSchema ? this.state.originalSchema : At(this.state.originalSchema, e);
  }
  schemaHasChanges() {
    return this.state.initialFieldsSignature ? this.serializeFields(this.state.fields) !== this.state.initialFieldsSignature : !0;
  }
  serializeFields(e) {
    const t = e.map((r) => ({
      name: r.name,
      type: r.type,
      label: r.label,
      description: r.description,
      placeholder: r.placeholder,
      helpText: r.helpText,
      required: r.required,
      readonly: r.readonly,
      hidden: r.hidden,
      filterable: r.filterable,
      defaultValue: r.defaultValue,
      section: r.section,
      gridSpan: r.gridSpan,
      order: r.order,
      validation: r.validation,
      config: r.config
    }));
    return JSON.stringify(t);
  }
  /**
   * Add a new field
   */
  addField(e) {
    const t = Se(e);
    if (e === "blocks") {
      const s = new Set(this.state.fields.map((c) => c.name));
      let i = "content_blocks", n = "Content Blocks", l = 1;
      for (; s.has(i); )
        i = `content_blocks_${l}`, n = `Content Blocks ${l}`, l++;
      const d = {
        id: Z(),
        name: i,
        type: e,
        label: n,
        required: !1,
        order: this.state.fields.length,
        ...t?.defaultConfig ?? {}
      };
      this.state.fields.push(d), this.state.selectedFieldId = d.id, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview(), this.loadBlocksForField(d);
      return;
    }
    const r = {
      id: Z(),
      name: `new_${e}_${this.state.fields.length + 1}`,
      type: e,
      label: t?.label ?? e,
      required: !1,
      order: this.state.fields.length,
      ...t?.defaultConfig ?? {}
    };
    new ve({
      field: r,
      existingFieldNames: this.state.fields.map((s) => s.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (s) => {
        this.state.fields.push(s), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
      },
      onCancel: () => {
      }
    }).show();
  }
  /**
   * Edit an existing field
   */
  editField(e) {
    const t = this.state.fields.find((a) => a.id === e);
    if (!t) return;
    new ve({
      field: t,
      existingFieldNames: this.state.fields.filter((a) => a.id !== e).map((a) => a.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (a) => {
        const s = this.state.fields.findIndex((i) => i.id === e);
        s !== -1 && (this.state.fields[s] = a, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
      },
      onCancel: () => {
      }
    }).show();
  }
  /**
   * Remove a field
   */
  async removeField(e) {
    const t = this.state.fields.findIndex((s) => s.id === e);
    if (t === -1) return;
    const r = this.state.fields[t];
    await se.confirm(
      `Remove field "${r.label}"?`,
      { title: "Remove Field", confirmText: "Remove", confirmVariant: "danger" }
    ) && (this.state.fields.splice(t, 1), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
  }
  /**
   * Move a field to a new position (optionally across sections)
   */
  moveField(e, t, r) {
    const a = this.state.fields.findIndex((b) => b.id === e);
    if (a === -1) return;
    const s = this.state.fields[a], i = s.section || L, n = t || L, l = this.groupFieldsBySection(), d = l.get(i);
    if (!d) return;
    const c = d.findIndex((b) => b.id === e);
    if (c === -1) return;
    d.splice(c, 1), d.length === 0 && l.delete(i), l.has(n) || l.set(n, []);
    const g = l.get(n);
    let m = Math.max(0, Math.min(r, g.length));
    i === n && c < m && (m -= 1), g.splice(m, 0, s), s.section = n === L ? void 0 : n;
    const h = /* @__PURE__ */ new Map();
    l.has(L) && h.set(L, l.get(L));
    for (const [b, k] of l)
      b !== L && h.set(b, k);
    this.state.fields = Array.from(h.values()).flat(), this.state.fields.forEach((b, k) => {
      b.order = k;
    }), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  /**
   * Move a field up (-1) or down (+1) within its section
   */
  moveFieldByDirection(e, t) {
    const r = this.state.fields.find((c) => c.id === e);
    if (!r) return;
    const a = r.section || L, s = this.state.fields.filter((c) => (c.section || L) === a), i = s.findIndex((c) => c.id === e), n = i + t;
    if (n < 0 || n >= s.length) return;
    const l = this.state.fields.indexOf(s[i]), d = this.state.fields.indexOf(s[n]);
    [this.state.fields[l], this.state.fields[d]] = [this.state.fields[d], this.state.fields[l]], this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  /**
   * Validate the schema
   */
  async validateSchema() {
    const e = this.buildSchemaPayload();
    try {
      const t = await this.api.validateSchema({
        schema: e,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      t.valid ? (this.state.validationErrors = [], this.showToast("Schema is valid", "success")) : (this.state.validationErrors = t.errors ?? [], this.showToast("Schema has validation errors", "error"));
    } catch (t) {
      console.error("Validation failed:", t);
      const r = t instanceof Error ? t.message : "Validation failed";
      this.showToast(r, "error");
    }
    this.renderValidationErrors();
  }
  /**
   * Preview the schema as a rendered form
   */
  async previewSchema() {
    if (this.state.isPreviewing) return;
    if (this.state.fields.length === 0) {
      this.state.previewHtml = null, this.state.previewError = null;
      const t = this.container.querySelector("[data-ct-preview-container]");
      t && (t.innerHTML = `
          <div class="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <p class="text-sm">Add fields to preview the form</p>
          </div>
        `);
      return;
    }
    const e = ye(this.state.fields, this.getSlug());
    this.state.isPreviewing = !0, this.updatePreviewState();
    try {
      const t = await this.api.previewSchema({
        schema: e,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      this.state.previewHtml = t.html, this.state.previewError = null, this.renderPreview();
    } catch (t) {
      console.error("Preview failed:", t);
      const r = t instanceof Error ? t.message : "Preview failed";
      this.state.previewHtml = null, this.state.previewError = r, this.renderPreview();
    } finally {
      this.state.isPreviewing = !1, this.updatePreviewState();
    }
  }
  // ===========================================================================
  // Rendering
  // ===========================================================================
  render() {
    O(), this.palettePanel = null, this.container.innerHTML = `
      <div class="content-type-editor flex flex-col h-full" data-content-type-editor>
        <!-- Header -->
        ${this.renderHeader()}

        <!-- Main Content -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Left Panel: Basic Info + Fields -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            ${this.renderBasicInfo()}
            ${this.renderFieldsSection()}
            ${this.renderCapabilitiesSection()}
          </div>

          <!-- Right Panel: Preview -->
          <div class="w-[400px] border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-950 overflow-y-auto">
            ${this.renderPreviewPanel()}
          </div>
        </div>

        <!-- Validation Errors -->
        <div data-ct-validation-errors class="hidden"></div>
      </div>
    `;
  }
  renderBasicInfo() {
    const e = this.state.contentType;
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Basic Information</h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="${f()}">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${x(e?.name ?? "")}"
              placeholder="Blog Post"
              required
              class="${p()}"
            />
          </div>

          <div>
            <label class="${f()}">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${x(e?.slug ?? "")}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="${p()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="${f()}">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="${ze()}"
          >${x(e?.description ?? "")}</textarea>
        </div>

        <div class="mt-4">
          <label class="${f()}">
            Icon
          </label>
          ${$e(e?.icon ?? "", "data-ct-icon")}
        </div>
      </div>
    `;
  }
  renderFieldsSection() {
    const e = this.state.layout.type ?? "flat", t = e === "tabs" ? "Tabs" : e === "sections" ? "Sections" : "Flat";
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-4">
            <h2 class="text-sm font-medium text-gray-900 dark:text-white">
              Fields (${this.state.fields.length})
            </h2>
            <button
              type="button"
              data-ct-layout
              class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
              </svg>
              Layout: ${t}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-ct-toggle-palette
              class="flex items-center gap-1 px-2 py-1 text-xs ${this.paletteVisible ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"} rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"></path>
              </svg>
              Palette
            </button>
            <button
              type="button"
              data-ct-add-field
              class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Field
            </button>
          </div>
        </div>

        <div data-ct-palette class="${this.paletteVisible ? "" : "hidden"} border-b border-gray-200 dark:border-gray-700">
          <div data-ct-palette-container class="h-[300px] overflow-y-auto"></div>
        </div>

        <div data-ct-field-list class="p-4">
          ${this.renderFieldListHTML()}
        </div>
      </div>
    `;
  }
  renderFieldListHTML() {
    return this.renderFieldListContent();
  }
  renderFieldCard(e, t, r) {
    const a = P(e.type) === "blocks", s = a && this.state.selectedFieldId === e.id, i = this.state.validationErrors.filter(
      (h) => h.path.includes(`/${e.name}`) || h.path.includes(`properties.${e.name}`)
    ), n = i.length > 0, l = [];
    e.validation?.minLength !== void 0 && l.push(`min: ${e.validation.minLength}`), e.validation?.maxLength !== void 0 && l.push(`max: ${e.validation.maxLength}`), e.validation?.min !== void 0 && l.push(`>= ${e.validation.min}`), e.validation?.max !== void 0 && l.push(`<= ${e.validation.max}`), e.validation?.pattern && l.push("pattern");
    const d = r ?? this.state.fields, c = d.indexOf(e), g = this.fieldActionsMenuId === e.id, m = `
          <div class="relative flex-shrink-0">
            ${mr(e.id)}
            ${g ? this.renderFieldActionsMenu(e) : ""}
          </div>`;
    return ft({
      field: e,
      sectionName: e.section || L,
      isSelected: this.state.selectedFieldId === e.id,
      isExpanded: s,
      hasErrors: n,
      errorMessages: i.map((h) => h.message),
      constraintBadges: l,
      index: t,
      actionsHtml: m,
      showReorderButtons: !0,
      isFirst: c === 0,
      isLast: c === d.length - 1,
      compact: !1,
      renderExpandedContent: a ? () => this.renderBlocksInlineContent(e) : void 0
    });
  }
  renderFieldActionsMenu(e) {
    const t = "w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2";
    return `
      <div data-ct-field-actions-menu class="absolute right-0 top-full mt-1 z-30 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <button type="button" data-field-action-edit="${x(e.id)}" class="${t}">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </button>
        <button type="button" data-field-action-remove="${x(e.id)}" class="${t} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Remove
        </button>
      </div>`;
  }
  renderBlocksInlineContent(e) {
    const t = e.config ?? {}, a = this.getBlocksPickerMode(e.id) === "allowed", s = new Set(
      a ? t.allowedBlocks ?? [] : t.deniedBlocks ?? []
    ), i = "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded", n = a ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", l = a ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300", d = a ? "Allowed Blocks" : "Denied Blocks", c = a ? "blue" : "red", g = a ? "All blocks allowed (no restrictions)" : "No blocks denied";
    let m;
    if (this.cachedBlocks) {
      const h = oe(s, this.cachedBlocks);
      m = ne({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: h,
        label: d,
        accent: c,
        emptySelectionText: g
      });
    } else
      m = `
        <div class="flex items-center justify-center py-6" data-ct-blocks-loading="${x(e.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${x(e.id)}">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-ct-blocks-mode-toggle="${x(e.id)}" data-ct-blocks-mode="allowed"
                    class="${i} ${n}">
              Allowed
            </button>
            <button type="button" data-ct-blocks-mode-toggle="${x(e.id)}" data-ct-blocks-mode="denied"
                    class="${i} ${l}">
              Denied
            </button>
          </div>
          <button type="button" data-ct-blocks-open-library="${x(e.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-ct-blocks-picker-container="${x(e.id)}">
          ${m}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-ct-blocks-advanced="${x(e.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>
      </div>`;
  }
  renderCapabilitiesSection() {
    const e = this.state.contentType?.capabilities ?? {};
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Capabilities</h2>

        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="versioning"
              ${e.versioning ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Versioning</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="scheduling"
              ${e.scheduling ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Scheduling</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="seo"
              ${e.seo ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">SEO Fields</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="localization"
              ${e.localization ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Localization</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="blocks"
              ${e.blocks ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Block Editor</span>
          </label>
        </div>
      </div>
    `;
  }
  renderPreviewPanel() {
    return `
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-gray-900 dark:text-white">Form Preview</h2>
          <button
            type="button"
            data-ct-refresh-preview
            class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Refresh
          </button>
        </div>

        <div
          data-ct-preview-container
          class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[200px]"
        >
          ${this.state.previewHtml ? this.state.previewHtml : `
            <div class="flex flex-col items-center justify-center h-40 text-gray-400">
              <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <p class="text-sm">Click "Preview" to see the generated form</p>
            </div>
          `}
        </div>
      </div>
    `;
  }
  // ===========================================================================
  // Status Badges & Lifecycle Actions
  // ===========================================================================
  renderHeader() {
    const e = this.state.contentType;
    return mt({
      name: e ? "Edit Content Type" : "Create Content Type",
      subtitle: e ? `Editing: ${e.name}` : "Define fields and configure your content type",
      status: e?.status,
      version: e?.schema_version,
      actions: this.renderHeaderActions()
    });
  }
  renderHeaderActions() {
    const e = this.state.contentType, t = "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700";
    return `
      ${this.state.validationErrors.length > 0 ? `
        <span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          ${this.state.validationErrors.length} error${this.state.validationErrors.length > 1 ? "s" : ""}
        </span>
      ` : ""}
      ${e ? this.renderLifecycleActions(e) : ""}
      <button type="button" data-ct-validate class="${t}">Validate</button>
      <button type="button" data-ct-preview class="${t}">Preview</button>
      <button type="button" data-ct-cancel class="${t}">Cancel</button>
      <button type="button" data-ct-save class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
        ${e ? "Save Changes" : "Create Content Type"}
      </button>
    `;
  }
  renderLifecycleActions(e) {
    const t = (e.status ?? "").toLowerCase();
    return `
      <div class="relative" data-ct-lifecycle-menu>
        <button
          type="button"
          data-ct-lifecycle-trigger
          class="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
          Actions
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div
          data-ct-lifecycle-dropdown
          class="hidden absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
        >
          <div class="py-1">
            ${t === "" || t === "draft" ? `
              <button
                type="button"
                data-ct-publish
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Publish
              </button>
            ` : t === "active" || t === "published" ? `
              <button
                type="button"
                data-ct-deprecate
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                Deprecate
              </button>
            ` : ""}
            <button
              type="button"
              data-ct-clone
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              Clone
            </button>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button
              type="button"
              data-ct-versions
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Version History
            </button>
          </div>
        </div>
      </div>
    `;
  }
  // ===========================================================================
  // Lifecycle Actions
  // ===========================================================================
  /**
   * Publish the content type
   */
  async publishContentType() {
    if (!this.state.contentType?.id) return;
    const e = this.buildSchemaPayload();
    let t = null, r = null;
    try {
      t = await this.api.checkCompatibility(
        this.state.contentType.id,
        e,
        this.buildUISchema()
      );
    } catch (s) {
      r = s instanceof Error ? s.message : "Compatibility check failed";
    }
    new vr({
      contentType: this.state.contentType,
      compatibilityResult: t,
      compatibilityError: r ?? void 0,
      onConfirm: async (s) => {
        try {
          const i = await this.api.publish(this.state.contentType.id, s);
          this.state.contentType = i, this.state.isDirty = !1, this.render(), this.bindEvents(), this.showToast("Content type published successfully", "success"), this.config.onSave?.(i);
        } catch (i) {
          const n = i instanceof Error ? i.message : "Failed to publish content type";
          this.showToast(n, "error");
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  /**
   * Deprecate the content type
   */
  async deprecateContentType() {
    if (!(!this.state.contentType?.id || !await se.confirm(
      `Are you sure you want to deprecate "${this.state.contentType.name}"? Deprecated content types can still be used but are hidden from new content creation.`,
      { title: "Deprecate Content Type", confirmText: "Deprecate", confirmVariant: "danger" }
    )))
      try {
        const t = await this.api.deprecate(this.state.contentType.id);
        this.state.contentType = t, this.render(), this.bindEvents(), this.showToast("Content type deprecated successfully", "success"), this.config.onSave?.(t);
      } catch (t) {
        const r = t instanceof Error ? t.message : "Failed to deprecate content type";
        this.showToast(r, "error");
      }
  }
  /**
   * Clone the content type
   */
  async cloneContentType() {
    if (!this.state.contentType?.id) return;
    new kr({
      contentType: this.state.contentType,
      onConfirm: async (t, r) => {
        try {
          const a = await this.api.clone(this.state.contentType.id, t, r);
          this.showToast(`Content type cloned as "${a.name}"`, "success"), this.config.onSave && this.config.onSave(a);
        } catch (a) {
          const s = a instanceof Error ? a.message : "Failed to clone content type";
          this.showToast(s, "error");
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  /**
   * Show version history
   */
  showVersionHistory() {
    if (!this.state.contentType?.id) return;
    new xr({
      apiBasePath: this.config.apiBasePath,
      contentType: this.state.contentType
    }).show();
  }
  // ===========================================================================
  // Event Binding
  // ===========================================================================
  bindEvents() {
    this.staticEventsBound || (this.bindStaticEvents(), this.staticEventsBound = !0), this.bindDynamicEvents();
  }
  bindStaticEvents() {
    this.container.addEventListener("click", (e) => {
      const t = e.target, r = t.closest("[data-field-actions]");
      if (r) {
        e.stopPropagation();
        const h = r.dataset.fieldActions;
        this.fieldActionsMenuId = this.fieldActionsMenuId === h ? null : h, this.renderFieldList();
        return;
      }
      const a = t.closest("[data-field-action-edit]");
      if (a) {
        const h = a.dataset.fieldActionEdit;
        this.fieldActionsMenuId = null, this.editField(h);
        return;
      }
      const s = t.closest("[data-field-action-remove]");
      if (s) {
        const h = s.dataset.fieldActionRemove;
        this.fieldActionsMenuId = null, this.removeField(h);
        return;
      }
      const i = t.closest("[data-field-move-up]");
      if (i && !i.hasAttribute("disabled")) {
        e.stopPropagation();
        const h = i.dataset.fieldMoveUp;
        this.moveFieldByDirection(h, -1);
        return;
      }
      const n = t.closest("[data-field-move-down]");
      if (n && !n.hasAttribute("disabled")) {
        e.stopPropagation();
        const h = n.dataset.fieldMoveDown;
        this.moveFieldByDirection(h, 1);
        return;
      }
      const l = t.closest("[data-ct-blocks-mode-toggle]");
      if (l) {
        const h = l.dataset.ctBlocksModeToggle, b = l.dataset.ctBlocksMode ?? "allowed";
        this.blockPickerModes.set(h, b), this.renderFieldList();
        const k = this.state.fields.find((C) => C.id === h);
        k && P(k.type) === "blocks" && this.loadBlocksForField(k);
        return;
      }
      if (t.closest("[data-ct-blocks-open-library]")) {
        const h = this.api.getBasePath();
        window.location.href = `${h}/content/block-library`;
        return;
      }
      const c = t.closest("[data-ct-blocks-advanced]");
      if (c) {
        const h = c.dataset.ctBlocksAdvanced;
        h && this.editField(h);
        return;
      }
      const g = t.closest("[data-field-toggle]");
      if (g && !t.closest("button")) {
        const h = g.dataset.fieldToggle;
        if (this.state.selectedFieldId = this.state.selectedFieldId === h ? null : h, this.renderFieldList(), this.state.selectedFieldId) {
          const b = this.state.fields.find((k) => k.id === this.state.selectedFieldId);
          b && P(b.type) === "blocks" && this.loadBlocksForField(b);
        }
        return;
      }
      const m = t.closest("[data-field-card]");
      if (m && !t.closest("button") && !t.closest("[data-field-props]")) {
        const h = m.getAttribute("data-field-card");
        h && (this.state.selectedFieldId = this.state.selectedFieldId === h ? null : h, this.renderFieldList());
      }
      this.fieldActionsMenuId && !t.closest("[data-field-actions]") && !t.closest("[data-ct-field-actions-menu]") && (this.fieldActionsMenuId = null, this.renderFieldList());
    }), this.container.addEventListener("input", (e) => {
      const t = e.target;
      if ((t.matches("[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]") || t.matches("[data-ct-cap]")) && (this.state.isDirty = !0, this.updateDirtyState()), t.matches("[data-ct-name]")) {
        const r = t, a = this.container.querySelector("[data-ct-slug]");
        a && !a.dataset.userModified && !this.state.contentType?.slug && (a.value = et(r.value)), this.schedulePreview();
        return;
      }
      if (t.matches("[data-ct-slug]")) {
        const r = t;
        r.dataset.userModified = "true", this.schedulePreview();
        return;
      }
    });
  }
  bindDynamicEvents() {
    this.container.querySelector("[data-ct-save]")?.addEventListener("click", () => this.save()), this.container.querySelector("[data-ct-validate]")?.addEventListener("click", () => this.validateSchema()), this.container.querySelector("[data-ct-preview]")?.addEventListener("click", () => this.previewSchema()), this.container.querySelector("[data-ct-cancel]")?.addEventListener("click", () => this.config.onCancel?.()), this.bindLifecycleMenuEvents(), this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener(
      "click",
      () => this.showFieldTypePicker()
    ), this.container.querySelector("[data-ct-toggle-palette]")?.addEventListener("click", () => this.togglePalette()), this.initPaletteIfNeeded(), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.container.querySelector("[data-ct-refresh-preview]")?.addEventListener("click", () => this.previewSchema()), Ce(this.container, "[data-icon-trigger]", (e) => {
      const t = e.querySelector("[data-ct-icon]");
      return {
        value: t?.value ?? "",
        onSelect: (r) => {
          t && (t.value = r, this.state.isDirty = !0, this.updateDirtyState());
        },
        onClear: () => {
          t && (t.value = "", this.state.isDirty = !0, this.updateDirtyState());
        }
      };
    }), this.bindSectionToggleEvents(), this.bindDragEvents();
  }
  removeDropIndicator() {
    this.dropIndicator && this.dropIndicator.parentNode && this.dropIndicator.parentNode.removeChild(this.dropIndicator), this.dropIndicator = null;
  }
  getOrCreateDropIndicator() {
    return this.dropIndicator || (this.dropIndicator = document.createElement("div"), this.dropIndicator.className = "drop-indicator h-0.5 bg-blue-500 rounded-full my-1 pointer-events-none"), this.dropIndicator;
  }
  bindDragEvents() {
    const e = this.container.querySelector("[data-ct-field-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const r = t, s = r.target.closest("[data-field-card]");
      if (!s) return;
      const i = s.getAttribute("data-field-card"), n = parseInt(s.getAttribute("data-field-index") ?? "0", 10), l = s.getAttribute("data-field-section") ?? L;
      this.dragState = {
        fieldId: i ?? "",
        startSection: l,
        currentSection: l,
        startIndex: n,
        currentIndex: n
      }, s.classList.add("opacity-50"), r.dataTransfer?.setData("text/plain", i ?? ""), r.dataTransfer && (r.dataTransfer.effectAllowed = "move");
    }), e.addEventListener("dragenter", (t) => {
      t.preventDefault();
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
      const r = t;
      if (!this.dragState) return;
      const a = r.clientY, s = r.target;
      this.dragOverRAF || (this.dragOverRAF = requestAnimationFrame(() => {
        if (this.dragOverRAF = null, !this.dragState) return;
        const i = s.closest("[data-field-card]");
        if (!i || i.getAttribute("data-field-card") === this.dragState.fieldId) return;
        const n = i.getBoundingClientRect(), l = n.top + n.height / 2, d = a < l, c = this.getOrCreateDropIndicator(), g = d ? i : i.nextSibling;
        (c.nextSibling !== g || c.parentNode !== i.parentElement) && i.parentElement?.insertBefore(c, g);
        const m = parseInt(i.getAttribute("data-field-index") ?? "0", 10), h = i.getAttribute("data-field-section") ?? L;
        this.dragState.currentSection = h, this.dragState.currentIndex = d ? m : m + 1;
      }));
    }), e.addEventListener("dragleave", (t) => {
      const a = t.relatedTarget;
      (!a || !e.contains(a)) && this.removeDropIndicator();
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), this.removeDropIndicator(), !this.dragState) return;
      const { fieldId: r, startIndex: a, currentIndex: s, startSection: i, currentSection: n } = this.dragState;
      (a !== s || i !== n) && this.moveField(r, n, s), this.dragState = null;
    }), e.addEventListener("dragend", () => {
      e.querySelectorAll(".opacity-50").forEach((t) => t.classList.remove("opacity-50")), this.removeDropIndicator(), this.dragOverRAF && (cancelAnimationFrame(this.dragOverRAF), this.dragOverRAF = null), this.dragState = null;
    }));
  }
  /** Bind drag-and-drop events on [data-field-drop-zone] for palette drops */
  bindFieldDropZoneEvents(e) {
    e.querySelectorAll("[data-field-drop-zone]").forEach((r) => {
      r.addEventListener("dragover", (a) => {
        a.preventDefault(), a.dataTransfer.dropEffect = "copy", r.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), r.classList.add("border-blue-400", "bg-blue-50/50");
      }), r.addEventListener("dragleave", (a) => {
        r.contains(a.relatedTarget) || (r.classList.remove("border-blue-400", "bg-blue-50/50"), r.classList.add("border-gray-200", "hover:border-gray-300"));
      }), r.addEventListener("drop", (a) => {
        a.preventDefault(), r.classList.remove("border-blue-400", "bg-blue-50/50"), r.classList.add("border-gray-200", "hover:border-gray-300");
        const s = a.dataTransfer?.getData(Re);
        if (s)
          try {
            const n = JSON.parse(s);
            if (n?.type) {
              this.addField(n.type);
              return;
            }
          } catch {
          }
        const i = a.dataTransfer?.getData(ke);
        i && this.addField(i);
      });
    });
  }
  bindLifecycleMenuEvents() {
    const e = this.container.querySelector("[data-ct-lifecycle-menu]");
    if (!e) {
      this.lifecycleOutsideClickHandler && (document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = null);
      return;
    }
    const t = e.querySelector("[data-ct-lifecycle-trigger]"), r = e.querySelector("[data-ct-lifecycle-dropdown]");
    t && r && (t.addEventListener("click", (a) => {
      a.stopPropagation(), r.classList.toggle("hidden");
    }), this.lifecycleOutsideClickHandler && document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = (a) => {
      e.contains(a.target) || r.classList.add("hidden");
    }, document.addEventListener("click", this.lifecycleOutsideClickHandler)), this.container.querySelector("[data-ct-publish]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.publishContentType();
    }), this.container.querySelector("[data-ct-deprecate]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.deprecateContentType();
    }), this.container.querySelector("[data-ct-clone]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.cloneContentType();
    }), this.container.querySelector("[data-ct-versions]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.showVersionHistory();
    });
  }
  togglePalette() {
    this.paletteVisible = !this.paletteVisible;
    const e = this.container.querySelector("[data-ct-palette]");
    e && e.classList.toggle("hidden", !this.paletteVisible);
    const t = this.container.querySelector("[data-ct-toggle-palette]");
    t && t.setAttribute("aria-expanded", String(this.paletteVisible)), this.initPaletteIfNeeded();
  }
  initPaletteIfNeeded() {
    if (!this.paletteVisible || this.palettePanel) return;
    const e = this.container.querySelector("[data-ct-palette-container]");
    e && (this.palettePanel = new _e({
      container: e,
      api: this.api,
      onAddField: (t) => this.addField(t.type)
    }), this.palettePanel.init(), this.palettePanel.enable());
  }
  showFieldTypePicker() {
    new it({
      onSelect: (t) => this.addField(t),
      onCancel: () => {
      }
    }).show();
  }
  showLayoutEditor() {
    new Zt({
      layout: this.state.layout,
      fields: this.state.fields,
      onSave: (t) => {
        this.state.layout = t, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
        const r = this.container.querySelector("[data-ct-field-list]")?.closest(".rounded-lg");
        if (r) {
          const a = document.createElement("div");
          a.innerHTML = this.renderFieldsSection(), r.replaceWith(a.firstElementChild), this.bindFieldsEvents();
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  bindFieldsEvents() {
    this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.container.querySelector("[data-ct-toggle-palette]")?.addEventListener("click", () => this.togglePalette()), this.palettePanel = null, this.initPaletteIfNeeded(), this.bindSectionToggleEvents(), this.bindDragEvents();
  }
  bindSectionToggleEvents() {
    this.container.querySelectorAll("[data-ct-toggle-section]").forEach((e) => {
      const t = e.getAttribute("data-ct-toggle-section");
      t && e.addEventListener("click", () => this.toggleSection(t));
    });
  }
  // ===========================================================================
  // Helpers
  // ===========================================================================
  getSlug() {
    const e = this.container.querySelector("[data-ct-slug]"), t = this.container.querySelector("[data-ct-name]"), r = e?.value?.trim();
    return r || et(t?.value ?? "");
  }
  getDescription() {
    const e = this.container.querySelector("[data-ct-description]");
    if (e)
      return e.value.trim();
  }
  getIcon() {
    const e = this.container.querySelector("[data-ct-icon]");
    if (e)
      return e.value.trim();
  }
  getCapabilities() {
    const e = this.state.contentType?.capabilities, t = e && typeof e == "object" ? { ...e } : {};
    return this.container.querySelectorAll("[data-ct-cap]").forEach((r) => {
      const a = r.getAttribute("data-ct-cap");
      a && (t[a] = r.checked);
    }), t;
  }
  buildUISchema() {
    const e = {}, t = {
      type: this.state.layout.type ?? "flat",
      gridColumns: this.state.layout.gridColumns ?? 12
    };
    if (t.type === "tabs" || t.type === "sections") {
      const a = /* @__PURE__ */ new Map();
      (this.state.layout.tabs ?? []).forEach((s, i) => {
        a.set(s.id, {
          id: s.id,
          label: s.label,
          order: s.order ?? i,
          icon: s.icon
        });
      }), this.state.fields.forEach((s) => {
        s.section && !a.has(s.section) && a.set(s.section, {
          id: s.section,
          label: tt(s.section),
          order: a.size
        });
      }), a.size > 0 && (t.tabs = Array.from(a.values()).sort((s, i) => s.order - i.order));
    }
    e.layout = t;
    const r = [];
    if (this.state.fields.forEach((a) => {
      const s = { path: `#/properties/${a.name}` }, i = {};
      a.section && (i.section = a.section), a.gridSpan && (i.grid = { span: a.gridSpan }), a.order !== void 0 && (i.order = a.order), a.readonly && (i.readonly = !0), a.hidden && (i.hidden = !0), Object.keys(i).length > 0 && (s["x-formgen"] = i, r.push(s));
    }), r.length > 0 && (e.overrides = r), !(t.type === "flat" && !t.tabs?.length && r.length === 0 || !e.layout && !e.overrides))
      return e;
  }
  updateLoadingState() {
    const e = this.container.querySelector("[data-ct-save]");
    e && (e.disabled = this.state.isLoading);
  }
  updateSavingState() {
    const e = this.container.querySelector("[data-ct-save]");
    e && (e.disabled = this.state.isSaving, e.textContent = this.state.isSaving ? "Saving..." : this.state.contentType ? "Save Changes" : "Create Content Type");
  }
  updatePreviewState() {
    const e = this.container.querySelector("[data-ct-preview]");
    e && (e.disabled = this.state.isPreviewing, e.textContent = this.state.isPreviewing ? "Loading..." : "Preview");
  }
  updateDirtyState() {
    const e = this.container.querySelector("[data-ct-save]");
    if (e) {
      let r = e.querySelector("[data-dirty-dot]");
      this.state.isDirty ? r || (r = document.createElement("span"), r.setAttribute("data-dirty-dot", ""), r.className = "inline-block w-2 h-2 rounded-full bg-orange-400 ml-1.5 align-middle", r.setAttribute("title", "Unsaved changes"), e.appendChild(r)) : r?.remove();
    }
    const t = this.container.querySelector("[data-content-type-editor] h1");
    if (t) {
      let r = t.parentElement?.querySelector("[data-dirty-badge]");
      this.state.isDirty ? r || (r = document.createElement("span"), r.setAttribute("data-dirty-badge", ""), r.className = "px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", r.textContent = "Modified", t.parentElement?.appendChild(r)) : r?.remove();
    }
  }
  renderFieldList() {
    const e = this.container.querySelector("[data-ct-field-list]");
    if (e) {
      e.innerHTML = this.renderFieldListContent(), this.bindSectionToggleEvents(), this.bindDragEvents(), this.bindFieldDropZoneEvents(e);
      const t = this.state.fields.find((r) => r.id === this.state.selectedFieldId);
      t && P(t.type) === "blocks" && this.cachedBlocks && this.renderInlineBlockPickerForField(t);
    }
  }
  renderFieldListContent() {
    if (this.state.fields.length === 0)
      return `
        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <p class="text-sm mb-3">No fields yet</p>
          <button
            type="button"
            data-ct-add-field-empty
            class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add your first field
          </button>
        </div>
      `;
    const e = this.groupFieldsBySection(), t = Array.from(e.keys());
    if (t.length <= 1) {
      const a = this.state.fields;
      return `
        <div class="space-y-2">
          ${a.map((s, i) => this.renderFieldCard(s, i, a)).join("")}
        </div>
        ${qe({ highlight: !1 })}
      `;
    }
    let r = "";
    for (const a of t) {
      const s = e.get(a), n = this.getSectionState(a).collapsed;
      r += `
        <div data-ct-section="${x(a)}" class="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <button type="button" data-ct-toggle-section="${x(a)}"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            <span class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
              ${n ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${x(tt(a))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${s.length}</span>
          </button>

          <div class="${n ? "hidden" : ""}" data-ct-section-body="${x(a)}">
            <div class="space-y-2 px-1 pb-2">
              ${s.map((l, d) => this.renderFieldCard(l, d, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return r += qe({ highlight: !1 }), r;
  }
  // ===========================================================================
  // Section Grouping
  // ===========================================================================
  groupFieldsBySection() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.state.fields) {
      const r = t.section || L;
      e.has(r) || e.set(r, []), e.get(r).push(t);
    }
    if (e.has(L)) {
      const t = e.get(L);
      e.delete(L);
      const r = /* @__PURE__ */ new Map();
      r.set(L, t);
      for (const [a, s] of e) r.set(a, s);
      return r;
    }
    return e;
  }
  getSectionState(e) {
    return this.sectionStates.has(e) || this.sectionStates.set(e, { collapsed: !1 }), this.sectionStates.get(e);
  }
  toggleSection(e) {
    const t = this.getSectionState(e);
    t.collapsed = !t.collapsed;
    const r = this.container.querySelector(`[data-ct-section-body="${e}"]`);
    r && r.classList.toggle("hidden", t.collapsed);
    const s = this.container.querySelector(`[data-ct-toggle-section="${e}"]`)?.querySelector("span:first-child");
    s && (s.innerHTML = t.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
  }
  getBlocksPickerMode(e) {
    return this.blockPickerModes.get(e) ?? "allowed";
  }
  async loadBlocksForField(e) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(e);
      return;
    }
    this.blocksLoading || (this.blocksLoading = !0, this.cachedBlocks = await Oe(this.api), this.blocksLoading = !1, this.state.selectedFieldId === e.id && this.renderInlineBlockPickerForField(e));
  }
  renderInlineBlockPickerForField(e) {
    const t = this.container.querySelector(
      `[data-ct-blocks-picker-container="${e.id}"]`
    );
    if (!t || !this.cachedBlocks) return;
    const r = e.config ?? {}, a = this.getBlocksPickerMode(e.id), s = a === "allowed", i = oe(
      new Set(s ? r.allowedBlocks ?? [] : r.deniedBlocks ?? []),
      this.cachedBlocks
    ), n = s ? "Allowed Blocks" : "Denied Blocks", l = s ? "blue" : "red", d = s ? "All blocks allowed (no restrictions)" : "No blocks denied";
    t.innerHTML = ne({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      label: n,
      accent: l,
      emptySelectionText: d
    }), ct(t, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      onSelectionChange: (c) => this.applyBlockSelection(e, a, c),
      label: n,
      accent: l,
      emptySelectionText: d
    });
  }
  applyBlockSelection(e, t, r) {
    e.config || (e.config = {});
    const a = e.config;
    t === "allowed" ? r.size > 0 ? a.allowedBlocks = Array.from(r) : delete a.allowedBlocks : r.size > 0 ? a.deniedBlocks = Array.from(r) : delete a.deniedBlocks, Object.keys(e.config).length === 0 && (e.config = void 0), this.state.isDirty = !0, this.updateDirtyState(), this.schedulePreview();
  }
  renderPreview() {
    const e = this.container.querySelector("[data-ct-preview-container]");
    e && (this.state.previewError ? e.innerHTML = `
        <div class="flex flex-col items-center justify-center h-40 text-red-400">
          <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-sm font-medium">Preview failed</p>
          <p class="text-xs text-red-300 mt-1 max-w-xs text-center">${this.state.previewError}</p>
        </div>
      ` : this.state.previewHtml && (e.innerHTML = this.state.previewHtml, this.initPreviewEditors()));
  }
  /**
   * Initialize preview field enhancements that require client-side behavior.
   * formgen-behaviors provides JSON editor hydration and
   * formgen-relationships provides WYSIWYG hydration.
   */
  initPreviewEditors() {
    const e = window.FormgenBehaviors;
    typeof e?.initJSONEditors == "function" && e.initJSONEditors();
    const r = window.FormgenRelationships?.autoInitWysiwyg ?? e?.autoInitWysiwyg;
    typeof r == "function" && r();
  }
  renderValidationErrors() {
    const e = this.container.querySelector("[data-ct-validation-errors]");
    if (!e) return;
    if (this.state.validationErrors.length === 0) {
      e.classList.add("hidden"), e.innerHTML = "", this.renderFieldList();
      return;
    }
    const t = /* @__PURE__ */ new Map(), r = [];
    for (const a of this.state.validationErrors) {
      const s = a.path.match(/properties[./](\w+)/);
      if (s) {
        const i = s[1];
        t.has(i) || t.set(i, []), t.get(i).push(a);
      } else
        r.push(a);
    }
    e.classList.remove("hidden"), e.innerHTML = `
      <div class="fixed bottom-4 right-4 max-w-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg overflow-hidden z-40">
        <div class="flex items-center justify-between px-4 py-2 bg-red-100 dark:bg-red-900/40 border-b border-red-200 dark:border-red-800">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-red-800 dark:text-red-200">
              ${this.state.validationErrors.length} Validation Error${this.state.validationErrors.length > 1 ? "s" : ""}
            </span>
          </div>
          <button type="button" class="text-red-400 hover:text-red-600" data-close-validation-errors>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="px-4 py-3 max-h-64 overflow-y-auto">
          ${r.length > 0 ? `
            <div class="mb-3">
              <div class="text-xs font-medium text-red-700 dark:text-red-300 uppercase mb-1">Schema</div>
              <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                ${r.map((a) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${x(a.message)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${Array.from(t.entries()).map(([a, s]) => {
      const i = this.state.fields.find((n) => n.name === a);
      return `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${x(i?.label ?? a)} <span class="font-mono">(${x(a)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${s.map((n) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${x(n.message)}</li>`).join("")}
                </ul>
              </div>
            `;
    }).join("")}
        </div>
      </div>
    `, e.querySelector("[data-close-validation-errors]")?.addEventListener("click", () => {
      e.classList.add("hidden");
    }), this.renderFieldList();
  }
  showToast(e, t) {
    const a = window.notify?.[t];
    if (typeof a == "function") {
      a(e);
      return;
    }
    t === "error" ? console.error(e) : console.log(e);
  }
  schedulePreview(e = 400) {
    this.previewDebounceTimer && clearTimeout(this.previewDebounceTimer), this.previewDebounceTimer = setTimeout(() => {
      this.previewDebounceTimer = null, this.previewSchema();
    }, e);
  }
}
function x(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function et(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function tt(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
function br(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
class vr extends H {
  constructor(e) {
    super({ size: "lg", flexColumn: !1 }), this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: e, compatibilityResult: t, compatibilityError: r } = this.config, a = !!r, s = (t?.breaking_changes?.length ?? 0) > 0, i = (t?.warnings?.length ?? 0) > 0, n = t?.affected_entries_count ?? 0, l = a || s, d = a ? "bg-gray-400 cursor-not-allowed" : s ? "bg-red-600 hover:bg-red-700 disabled:opacity-50" : "bg-green-600 hover:bg-green-700";
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${x(e.name)}</strong>.
          ${e.status === "draft" ? "This will make it available for content creation." : "This will create a new version of the schema."}
        </p>

        ${a ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Compatibility Check Failed</span>
            </div>
            <p class="ml-7 text-sm text-red-700 dark:text-red-300">
              Publishing is blocked until compatibility can be verified.
            </p>
            ${r ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${x(r)}
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${!a && s ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Breaking Changes Detected</span>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-300 space-y-1 ml-7">
              ${t.breaking_changes.map((c) => `
                <li>• ${x(c.description || `${c.type}: ${c.path}`)}</li>
              `).join("")}
            </ul>
            ${n > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${n} content ${n === 1 ? "entry" : "entries"} will require migration.
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${!a && i ? `
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
            </div>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-7">
              ${t.warnings.map((c) => `
                <li>• ${x(c.description || `${c.type}: ${c.path}`)}</li>
              `).join("")}
            </ul>
          </div>
        ` : ""}

        ${!a && !s && !i ? `
          <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-green-800 dark:text-green-200">Schema is compatible</span>
            </div>
            <p class="mt-1 ml-7 text-sm text-green-700 dark:text-green-300">
              No breaking changes detected. Publishing is safe.
            </p>
          </div>
        ` : ""}

        ${!a && s ? `
          <label class="flex items-start gap-2">
            <input
              type="checkbox"
              data-publish-force
              class="mt-0.5 w-4 h-4 text-red-600 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">
              I understand there are breaking changes and want to publish anyway
            </span>
          </label>
        ` : ""}
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-publish-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-publish-confirm
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${d}"
          ${l ? "disabled" : ""}
        >
          ${s ? "Publish with Breaking Changes" : "Publish"}
        </button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-publish-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    });
    const e = this.container?.querySelector("[data-publish-confirm]"), t = this.container?.querySelector("[data-publish-force]"), r = !!this.config.compatibilityError;
    t?.addEventListener("change", () => {
      e && !r && (e.disabled = !t.checked);
    }), e?.addEventListener("click", () => {
      if (r)
        return;
      const a = t?.checked ?? !1;
      this.config.onConfirm(a), this.hide();
    });
  }
}
class kr extends H {
  constructor(e) {
    super({ size: "md", initialFocus: "[data-clone-slug]" }), this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: e } = this.config, t = `${e.slug}-copy`, r = `${e.name} (Copy)`;
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Clone Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create a copy of <strong class="text-gray-900 dark:text-white">${x(e.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="${f()}">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${x(t)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="${p()}"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
          <div data-clone-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        </div>

        <div>
          <label class="${f()}">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${x(r)}"
            placeholder="My Content Type"
            class="${p()}"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-clone-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-clone-confirm
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Clone
        </button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-clone-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container?.querySelector("[data-clone-confirm]")?.addEventListener("click", () => {
      const e = this.container?.querySelector("[data-clone-slug]"), t = this.container?.querySelector("[data-clone-name]"), r = e?.value?.trim(), a = t?.value?.trim(), s = this.container?.querySelector("[data-clone-error]"), i = (n) => {
        s && (s.textContent = n, s.classList.remove("hidden"));
      };
      if (!r) {
        i("Slug is required"), e?.focus();
        return;
      }
      if (!/^[a-z][a-z0-9_\-]*$/.test(r)) {
        i("Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter."), e?.focus();
        return;
      }
      this.config.onConfirm(r, a || void 0), this.hide();
    }), this.container?.addEventListener("keydown", (e) => {
      e.key === "Enter" && (e.preventDefault(), this.container?.querySelector("[data-clone-confirm]")?.click());
    });
  }
}
class xr extends H {
  constructor(e) {
    super({ size: "2xl", maxHeight: "max-h-[80vh]" }), this.versions = [], this.expandedVersions = /* @__PURE__ */ new Set(), this.config = e, this.api = new K({ basePath: e.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${x(this.config.contentType.name)} (${x(this.config.contentType.slug)})</p>
        </div>
        <button type="button" data-viewer-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-versions-list class="p-4">
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-viewer-close]")?.addEventListener("click", () => {
      this.hide();
    });
  }
  async loadVersions() {
    try {
      const e = await this.api.getVersionHistory(this.config.contentType.id);
      this.versions = e.versions, this.renderVersionsList();
    } catch {
      this.renderVersionsList();
    }
  }
  renderVersionsList() {
    const e = this.container?.querySelector("[data-versions-list]");
    if (e) {
      if (this.versions.length === 0) {
        e.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No version history available.</p>
          <p class="text-xs mt-2">Current version: ${x(this.config.contentType.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      e.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((t, r) => this.renderVersionCard(t, r === 0)).join("")}
      </div>
    `, e.querySelectorAll("[data-toggle-version]").forEach((t) => {
        t.addEventListener("click", () => {
          const r = t.getAttribute("data-toggle-version");
          r && (this.expandedVersions.has(r) ? this.expandedVersions.delete(r) : this.expandedVersions.add(r), this.renderVersionsList());
        });
      });
    }
  }
  renderVersionCard(e, t) {
    const r = this.expandedVersions.has(e.version), a = (e.changes?.length ?? 0) > 0, s = e.is_breaking || e.changes?.some((i) => i.is_breaking);
    return `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${x(e.version)}</span>
              ${t ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ""}
              ${s ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
              ${this.getMigrationBadge(e.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${br(e.created_at)}</span>
            ${a ? `
              <button
                type="button"
                data-toggle-version="${x(e.version)}"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <svg class="w-4 h-4 transition-transform ${r ? "rotate-180" : ""}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            ` : ""}
          </div>
        </div>

        ${e.migration_status && e.total_count ? `
          <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Migration Progress</span>
              <span>${e.migrated_count ?? 0}/${e.total_count}</span>
            </div>
            <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full" style="width: ${(e.migrated_count ?? 0) / e.total_count * 100}%"></div>
            </div>
          </div>
        ` : ""}

        ${r && a ? `
          <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
            <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Changes</h4>
            <ul class="space-y-2">
              ${e.changes.map((i) => this.renderChangeItem(i)).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    `;
  }
  renderChangeItem(e) {
    const t = {
      added: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      removed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      modified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    }, r = {
      added: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>',
      removed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>',
      modified: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
    };
    return `
      <li class="flex items-start gap-2 text-sm">
        <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${t[e.type]}">
          <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${r[e.type]}
          </svg>
          ${e.type}
        </span>
        <div class="flex-1">
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${x(e.path)}</span>
          ${e.field ? `<span class="text-gray-500 dark:text-gray-400"> (${x(e.field)})</span>` : ""}
          ${e.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${x(e.description)}</p>` : ""}
          ${e.is_breaking ? '<span class="ml-1 text-xs text-red-500 dark:text-red-400">Breaking</span>' : ""}
        </div>
      </li>
    `;
  }
  getMigrationBadge(e) {
    switch (e) {
      case "pending":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>';
      case "in_progress":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Migrating</span>';
      case "completed":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Migrated</span>';
      case "failed":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Failed</span>';
      default:
        return "";
    }
  }
}
class wr extends H {
  constructor(e) {
    super({ size: "4xl", backdropDataAttr: "data-block-library-backdrop" }), this.categories = [], this.config = e, this.api = new K({ basePath: e.apiBasePath }), this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: !1,
      isSaving: !1,
      error: null,
      filter: "",
      categoryFilter: null
    };
  }
  onBeforeHide() {
    return this.config.onClose?.(), !0;
  }
  async onAfterShow() {
    this.container?.setAttribute("data-block-library-manager", "true"), await this.loadBlocks(), await this.loadCategories();
  }
  renderContent() {
    const e = this.config.mode !== "picker";
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${e ? "Block Library" : "Select Block Type"}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              ${e ? "Create, edit, and manage reusable block definitions" : "Choose a block type to add"}
            </p>
          </div>
        </div>
        <button type="button" data-block-library-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div class="flex-1 relative">
          <input
            type="text"
            data-block-filter
            placeholder="Search blocks..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <select
          data-block-category-filter
          class="${D()}"
        >
          <option value="">All Categories</option>
        </select>
        ${e ? `
          <button
            type="button"
            data-block-create
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            New Block
          </button>
        ` : ""}
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-block-list class="p-4">
          <div data-block-loading class="flex items-center justify-center py-12">
            <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>

      <div data-block-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      ${this.config.mode === "picker" ? `
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            data-block-library-cancel
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      ` : ""}
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-block-library-close]")?.addEventListener("click", () => {
      this.requestHide();
    }), this.container?.querySelector("[data-block-library-cancel]")?.addEventListener("click", () => {
      this.requestHide();
    });
    const e = this.container?.querySelector("[data-block-filter]");
    e?.addEventListener("input", () => {
      this.state.filter = e.value, this.renderBlockList();
    });
    const t = this.container?.querySelector("[data-block-category-filter]");
    t?.addEventListener("change", () => {
      this.state.categoryFilter = t.value || null, this.renderBlockList();
    }), this.container?.querySelector("[data-block-create]")?.addEventListener("click", () => {
      this.showBlockEditor(null);
    }), this.container?.querySelector("[data-block-list]")?.addEventListener("click", (a) => {
      const s = a.target, i = s.closest("[data-block-id]");
      if (i && this.config.mode === "picker") {
        const n = i.getAttribute("data-block-id"), l = this.state.blocks.find((d) => d.id === n);
        if (l && this.isBlockAllowed(l)) {
          const d = this.blockKey(l);
          this.config.onSelect?.({
            id: l.id,
            name: l.name,
            slug: l.slug,
            type: d || l.type,
            description: l.description,
            icon: l.icon,
            category: l.category,
            schema_version: l.schema_version,
            status: l.status
          }), this.hide();
        }
        return;
      }
      if (s.closest("[data-block-edit]")) {
        const l = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((c) => c.id === l);
        d && this.showBlockEditor(d);
        return;
      }
      if (s.closest("[data-block-delete]")) {
        const l = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((c) => c.id === l);
        d && this.confirmDeleteBlock(d);
        return;
      }
      if (s.closest("[data-block-clone]")) {
        const l = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((c) => c.id === l);
        d && this.cloneBlock(d);
        return;
      }
      if (s.closest("[data-block-publish]")) {
        const l = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((c) => c.id === l);
        d && this.publishBlock(d);
        return;
      }
      if (s.closest("[data-block-versions]")) {
        const l = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((c) => c.id === l);
        d && this.showVersionHistory(d);
        return;
      }
    });
  }
  async loadBlocks() {
    this.state.isLoading = !0, this.state.error = null, this.renderBlockList();
    try {
      const e = await this.api.listBlockDefinitions();
      this.state.blocks = e.items;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Failed to load blocks";
    } finally {
      this.state.isLoading = !1, this.refreshCategoriesFromBlocks(), this.renderBlockList();
    }
  }
  async loadCategories() {
    try {
      const e = await this.api.getBlockCategories();
      e.length > 0 && (this.categories = e);
    } catch {
    }
    this.renderCategoryOptions();
  }
  refreshCategoriesFromBlocks() {
    const e = new Set(this.categories);
    for (const t of this.state.blocks) {
      const r = (t.category || "").trim().toLowerCase();
      r && !e.has(r) && (e.add(r), this.categories.push(r));
    }
    this.renderCategoryOptions();
  }
  renderCategoryOptions() {
    const e = this.container?.querySelector("[data-block-category-filter]");
    if (e) {
      e.innerHTML = '<option value="">All Categories</option>';
      for (const t of this.categories) {
        const r = document.createElement("option");
        r.value = t, r.textContent = De(t), e.appendChild(r);
      }
    }
  }
  renderBlockList() {
    const e = this.container?.querySelector("[data-block-list]");
    if (!e) return;
    if (this.state.isLoading) {
      e.innerHTML = `
        <div data-block-loading class="flex items-center justify-center py-12">
          <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      `;
      return;
    }
    const t = this.getFilteredBlocks();
    if (t.length === 0) {
      e.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <svg class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-gray-500 dark:text-gray-400">
            ${this.state.filter || this.state.categoryFilter ? "No blocks match your filters" : "No blocks defined yet"}
          </p>
          ${this.config.mode !== "picker" && !this.state.filter && !this.state.categoryFilter ? `
            <button
              type="button"
              data-block-create-empty
              class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Create your first block
            </button>
          ` : ""}
        </div>
      `, e.querySelector("[data-block-create-empty]")?.addEventListener("click", () => {
        this.showBlockEditor(null);
      });
      return;
    }
    const r = /* @__PURE__ */ new Map();
    for (const s of t) {
      const i = s.category || "custom";
      r.has(i) || r.set(i, []), r.get(i).push(s);
    }
    let a = "";
    for (const [s, i] of r)
      a += `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${De(s)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${i.map((n) => this.renderBlockCard(n)).join("")}
          </div>
        </div>
      `;
    e.innerHTML = a;
  }
  renderBlockCard(e) {
    const t = this.config.mode !== "picker", r = this.isBlockAllowed(e), a = this.getStatusBadge(e.status), s = this.blockKey(e);
    return `
      <div
        data-block-id="${e.id}"
        class="relative p-4 border rounded-lg ${r ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed"} transition-colors"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${e.icon ? de(e.icon) : s.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${T(e.name)}</h4>
              ${a}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${T(s)}</p>
            ${e.description ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${T(e.description)}</p>` : ""}
            ${e.schema_version ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${T(e.schema_version)}</p>` : ""}
          </div>
        </div>

        ${t ? `
          <div class="absolute top-2 right-2 flex items-center gap-1">
            <button
              type="button"
              data-block-versions
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Version history"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
            ${e.status === "draft" ? `
              <button
                type="button"
                data-block-publish
                class="p-1.5 text-green-500 hover:text-green-600 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                title="Publish"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            ` : ""}
            <button
              type="button"
              data-block-clone
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clone"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
            <button
              type="button"
              data-block-edit
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button
              type="button"
              data-block-delete
              class="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        ` : ""}

        ${r ? "" : '<div class="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 rounded-lg"><span class="text-xs text-gray-500 dark:text-gray-400">Not allowed</span></div>'}
      </div>
    `;
  }
  getStatusBadge(e) {
    const t = e || "active", r = t.charAt(0).toUpperCase() + t.slice(1);
    return J(r, "status", t);
  }
  getFilteredBlocks() {
    let e = [...this.state.blocks];
    if (this.state.filter) {
      const t = this.state.filter.toLowerCase();
      e = e.filter(
        (r) => r.name.toLowerCase().includes(t) || r.type.toLowerCase().includes(t) || (r.slug?.toLowerCase().includes(t) ?? !1) || (r.description?.toLowerCase().includes(t) ?? !1)
      );
    }
    return this.state.categoryFilter && (e = e.filter((t) => t.category === this.state.categoryFilter)), e;
  }
  blockKey(e) {
    return (e.slug || e.type || "").trim();
  }
  blockInList(e, t) {
    if (!e || e.length === 0) return !1;
    const r = this.blockKey(t);
    return !!(r && e.includes(r) || t.slug && e.includes(t.type));
  }
  isBlockAllowed(e) {
    const { allowedBlocks: t, deniedBlocks: r } = this.config;
    return this.blockInList(r, e) ? !1 : t && t.length > 0 ? this.blockInList(t, e) : !0;
  }
  showBlockEditor(e) {
    new Sr({
      apiBasePath: this.config.apiBasePath,
      block: e,
      categories: this.categories,
      onSave: async (r) => {
        await this.loadBlocks();
      },
      onCancel: () => {
      }
    }).show();
  }
  async confirmDeleteBlock(e) {
    if (await se.confirm(
      `Are you sure you want to delete the block "${e.name}"? This action cannot be undone.`,
      { title: "Delete Block", confirmText: "Delete", confirmVariant: "danger" }
    ))
      try {
        await this.api.deleteBlockDefinition(e.id), await this.loadBlocks();
      } catch (r) {
        this.showError(r instanceof Error ? r.message : "Failed to delete block");
      }
  }
  cloneBlock(e) {
    const t = (e.slug || e.type || "block").trim();
    new ie({
      title: "Clone Block",
      label: "Enter a unique slug for the cloned block",
      placeholder: "e.g. hero_copy",
      initialValue: `${t}_copy`,
      confirmLabel: "Clone",
      inputClass: p(),
      onConfirm: async (a) => {
        const s = a.trim();
        if (s)
          try {
            await this.api.cloneBlockDefinition(e.id, s, s), await this.loadBlocks();
          } catch (i) {
            this.showError(i instanceof Error ? i.message : "Failed to clone block");
          }
      }
    }).show();
  }
  async publishBlock(e) {
    try {
      await this.api.publishBlockDefinition(e.id), await this.loadBlocks();
    } catch (t) {
      this.showError(t instanceof Error ? t.message : "Failed to publish block");
    }
  }
  async showVersionHistory(e) {
    new $r({
      apiBasePath: this.config.apiBasePath,
      block: e
    }).show();
  }
  showError(e) {
    const t = this.container?.querySelector("[data-block-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const r = t.querySelector("p");
    r && (r.textContent = e), setTimeout(() => {
      t.classList.add("hidden");
    }, 5e3);
  }
}
class Sr extends H {
  constructor(e) {
    super({ size: "3xl" }), this.fields = [], this.config = e, this.api = new K({ basePath: e.apiBasePath }), this.isNew = !e.block, e.block?.schema && (this.fields = me(e.block.schema));
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const e = this.config.block;
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${this.isNew ? "Create Block Definition" : "Edit Block Definition"}
        </h2>
        <button type="button" data-editor-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <form data-block-form class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value="${T(e?.name ?? "")}"
                placeholder="Hero Section"
                required
                class="${p()}"
              />
            </div>
            <div>
              <label class="${f()}">
                Type <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="type"
                value="${T(e?.type ?? "")}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_\\-]*$"
                required
                ${e ? "readonly" : ""}
                class="${p()} ${e ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed" : ""}"
              />
              <p class="mt-1 text-xs text-gray-500">Unique identifier. Lowercase, numbers, hyphens, underscores.</p>
            </div>
          </div>

          <div>
            <label class="${f()}">
              Description
            </label>
            <textarea
              name="description"
              rows="2"
              placeholder="A description of this block type"
              class="${ze()}"
            >${T(e?.description ?? "")}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${f()}">
                Category
              </label>
              <select
                name="category"
                class="${D()}"
              >
                ${this.config.categories.map((t) => `<option value="${t}" ${e?.category === t ? "selected" : ""}>${De(t)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="${f()}">
                Icon
              </label>
              ${$e(e?.icon ?? "", 'name="icon"')}
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Block Fields</h3>
              <button
                type="button"
                data-add-field
                class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Field
              </button>
            </div>
            <div data-fields-list class="space-y-2">
              ${this.renderFieldsList()}
            </div>
          </div>
        </form>
      </div>

      <div data-editor-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-editor-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-editor-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ${this.isNew ? "Create Block" : "Save Changes"}
        </button>
      </div>
    `;
  }
  renderFieldsList() {
    return this.fields.length === 0 ? `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No fields defined. Click "Add Field" to start.</p>
        </div>
      ` : this.fields.map(
      (e, t) => `
        <div class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-field-index="${t}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">${T(e.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${T(e.name)}</span>
              <span class="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${e.type}</span>
              ${e.required ? '<span class="text-xs text-red-500">required</span>' : ""}
            </div>
          </div>
          <button type="button" data-edit-field="${t}" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button type="button" data-remove-field="${t}" class="p-1 text-gray-400 hover:text-red-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `
    ).join("");
  }
  bindContentEvents() {
    this.container?.querySelector("[data-editor-close]")?.addEventListener("click", () => {
      this.requestHide();
    }), this.container?.querySelector("[data-editor-cancel]")?.addEventListener("click", () => {
      this.requestHide();
    }), this.container?.querySelector("[data-editor-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container?.querySelector("[data-add-field]")?.addEventListener("click", () => {
      this.showFieldTypePicker();
    }), this.container && Ce(this.container, "[data-icon-trigger]", (e) => {
      const t = e.querySelector('[name="icon"]');
      return {
        value: t?.value ?? "",
        onSelect: (r) => {
          t && (t.value = r);
        },
        onClear: () => {
          t && (t.value = "");
        }
      };
    }), this.container?.querySelector("[data-fields-list]")?.addEventListener("click", (e) => {
      const t = e.target, r = t.closest("[data-edit-field]");
      if (r) {
        const s = parseInt(r.getAttribute("data-edit-field") ?? "-1", 10);
        s >= 0 && this.fields[s] && this.showFieldConfigForm(this.fields[s], s);
        return;
      }
      const a = t.closest("[data-remove-field]");
      if (a) {
        const s = parseInt(a.getAttribute("data-remove-field") ?? "-1", 10);
        s >= 0 && (this.fields.splice(s, 1), this.updateFieldsList());
        return;
      }
    });
  }
  showFieldTypePicker() {
    new it({
      onSelect: (t) => {
        const r = {
          id: Z(),
          name: "",
          type: t,
          label: "",
          required: !1
        };
        this.showFieldConfigForm(r, -1);
      },
      onCancel: () => {
      },
      excludeTypes: ["blocks", "repeater"]
      // Blocks can't nest blocks
    }).show();
  }
  showFieldConfigForm(e, t) {
    new ve({
      field: e,
      existingFieldNames: this.fields.filter((a, s) => s !== t).map((a) => a.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (a) => {
        t >= 0 ? this.fields[t] = a : this.fields.push(a), this.updateFieldsList();
      },
      onCancel: () => {
      }
    }).show();
  }
  updateFieldsList() {
    const e = this.container?.querySelector("[data-fields-list]");
    e && (e.innerHTML = this.renderFieldsList());
  }
  async handleSave() {
    const e = this.container?.querySelector("[data-block-form]");
    if (!e) return;
    const t = new FormData(e), r = t.get("name")?.trim(), a = t.get("type")?.trim();
    if (!r || !a) {
      this.showEditorError("Name and Type are required");
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(a)) {
      this.showEditorError("Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.");
      return;
    }
    const s = at(this.fields, a), i = t.get("description"), n = t.get("icon"), l = {
      name: r,
      type: a,
      description: typeof i == "string" ? i.trim() : void 0,
      category: t.get("category") || "custom",
      icon: typeof n == "string" ? n.trim() : void 0,
      schema: s,
      status: this.config.block?.status ?? "draft"
    };
    try {
      let d;
      this.isNew ? d = await this.api.createBlockDefinition(l) : d = await this.api.updateBlockDefinition(this.config.block.id, l), this.config.onSave(d), this.hide();
    } catch (d) {
      this.showEditorError(d instanceof Error ? d.message : "Failed to save block");
    }
  }
  showEditorError(e) {
    const t = this.container?.querySelector("[data-editor-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const r = t.querySelector("p");
    r && (r.textContent = e), setTimeout(() => t.classList.add("hidden"), 5e3);
  }
}
class $r extends H {
  constructor(e) {
    super({ size: "2xl", maxHeight: "max-h-[80vh]" }), this.versions = [], this.config = e, this.api = new K({ basePath: e.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${T(this.config.block.name)} (${T(this.config.block.slug || this.config.block.type)})</p>
        </div>
        <button type="button" data-viewer-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-versions-list class="p-4">
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-viewer-close]")?.addEventListener("click", () => {
      this.hide();
    });
  }
  async loadVersions() {
    try {
      const e = await this.api.getBlockDefinitionVersions(this.config.block.id);
      this.versions = e.versions, this.renderVersionsList();
    } catch {
      this.renderVersionsList();
    }
  }
  renderVersionsList() {
    const e = this.container?.querySelector("[data-versions-list]");
    if (e) {
      if (this.versions.length === 0) {
        e.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No version history available.</p>
          <p class="text-xs mt-2">Current version: ${T(this.config.block.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      e.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map(
        (t) => `
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${T(t.version)}</span>
                ${t.is_breaking ? J("Breaking", "status", "breaking") : ""}
                ${this.getMigrationBadge(t.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${Cr(t.created_at)}</span>
            </div>
            ${t.migration_status && t.total_count ? `
              <div class="mt-2">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Migration Progress</span>
                  <span>${t.migrated_count ?? 0}/${t.total_count}</span>
                </div>
                <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${(t.migrated_count ?? 0) / t.total_count * 100}%"></div>
                </div>
              </div>
            ` : ""}
          </div>
        `
      ).join("")}
      </div>
    `;
    }
  }
  getMigrationBadge(e) {
    const r = e ? {
      pending: ["Pending", "pending"],
      in_progress: ["Migrating", "migrating"],
      completed: ["Migrated", "migrated"],
      failed: ["Failed", "failed"]
    }[e] : void 0;
    return r ? J(r[0], "status", r[1]) : "";
  }
}
function T(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function De(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function Cr(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
function Br(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-trigger]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = Be(t.dataset.apiBasePath, t.dataset.basePath), a = Ne(r, t.dataset.basePath), s = t.dataset.mode ?? "manage";
    if (s === "manage")
      t.addEventListener("click", () => {
        window.location.href = `${a}/content/block-library`;
      });
    else {
      const i = {
        apiBasePath: r,
        mode: s
      };
      t.addEventListener("click", () => {
        new wr(i).show();
      });
    }
    t.dataset.initialized = "true";
  });
}
function Lr(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
Lr(() => Br());
const j = "main", rt = "application/x-field-reorder";
class Er {
  constructor(e) {
    this.expandedFieldId = null, this.sectionStates = /* @__PURE__ */ new Map(), this.moveMenuFieldId = null, this.dropHighlight = !1, this.dragReorder = null, this.dropTargetFieldId = null, this.saveState = "idle", this.saveMessage = "", this.saveDisplayTimer = null, this.cachedBlocks = null, this.blocksLoading = !1, this.blockPickerModes = /* @__PURE__ */ new Map(), this.config = e, this.block = { ...e.block }, this.fields = e.block.schema ? me(e.block.schema) : [];
  }
  render() {
    O(), this.config.container.innerHTML = "";
    const e = document.createElement("div");
    e.className = "flex flex-col h-full overflow-hidden", e.setAttribute("data-block-editor-panel", ""), e.innerHTML = `
      ${this.renderHeader()}
      <div class="flex-1 overflow-y-auto" data-editor-scroll>
        ${this.renderMetadataSection()}
        ${this.renderFieldsSection()}
      </div>
    `, this.config.container.appendChild(e), this.bindEvents(e), this.ensureInlineBlocksPicker();
  }
  /** Refresh the panel for a new block without a full re-mount */
  update(e) {
    this.block = { ...e }, this.fields = e.schema ? me(e.schema) : [], this.expandedFieldId = null, this.moveMenuFieldId = null, this.render();
  }
  getFields() {
    return [...this.fields];
  }
  /** Add a field to the end of the fields list (Phase 9 — palette insert) */
  addField(e) {
    this.fields.push(e), this.expandedFieldId = e.id, this.render();
  }
  // ===========================================================================
  // Rendering – Header
  // ===========================================================================
  renderHeader() {
    return mt({
      name: this.block.name || "Untitled",
      subtitle: this.block.slug || this.block.type || "",
      subtitleMono: !0,
      status: this.block.status || "draft",
      saveState: this.saveState,
      saveMessage: this.saveMessage,
      compact: !0
    });
  }
  // ===========================================================================
  // Save state indicator (Phase 11 — Task 11.2)
  // ===========================================================================
  /** Update the save state indicator without a full re-render */
  updateSaveState(e, t) {
    this.saveDisplayTimer && (clearTimeout(this.saveDisplayTimer), this.saveDisplayTimer = null), this.saveState = e, this.saveMessage = t ?? "";
    const r = this.config.container.querySelector("[data-entity-save-indicator]");
    r && (r.innerHTML = yt(this.saveState, this.saveMessage)), e === "saved" && (this.saveDisplayTimer = setTimeout(() => {
      this.saveState = "idle", this.saveMessage = "";
      const a = this.config.container.querySelector("[data-entity-save-indicator]");
      a && (a.innerHTML = "");
    }, 2e3));
  }
  /** Revert the status dropdown to a previous value (used on status change failure) */
  revertStatus(e) {
    const t = this.config.container.querySelector('[data-meta-field="status"]');
    t && (t.value = e ?? "draft"), this.block.status = e ?? "draft";
  }
  // ===========================================================================
  // Rendering – Metadata (Task 8.1)
  // ===========================================================================
  renderMetadataSection() {
    const e = this.block, t = e.slug || e.type || "", r = e.slug && e.type && e.slug !== e.type ? `<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Internal type: ${u(e.type)}</p>` : "";
    return `
      <div class="border-b border-gray-200 dark:border-gray-700" data-editor-metadata>
        <button type="button" data-toggle-metadata
                class="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
            <span>Block Metadata</span>
          </div>
          <span data-metadata-chevron class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </span>
        </button>
        <div class="px-5 pb-4 space-y-3" data-metadata-body>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <input type="text" data-meta-field="name" value="${u(e.name)}"
                     class="${p()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug</label>
              <input type="text" data-meta-field="slug" value="${u(t)}" pattern="^[a-z][a-z0-9_\\-]*$"
                     class="${p()} font-mono" />
              ${r}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${p()} resize-none">${u(e.description ?? "")}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select data-meta-field="category" class="${D()}">
                ${this.config.categories.map((a) => `<option value="${u(a)}" ${a === (e.category ?? "") ? "selected" : ""}>${u(Y(a))}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              ${$e(e.icon ?? "", 'data-meta-field="icon"', !0)}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select data-meta-field="status" class="${D()}">
                <option value="draft" ${e.status === "draft" ? "selected" : ""}>Draft</option>
                <option value="active" ${e.status === "active" ? "selected" : ""}>Active</option>
                <option value="deprecated" ${e.status === "deprecated" ? "selected" : ""}>Deprecated</option>
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }
  // ===========================================================================
  // Rendering – Fields grouped by section (Tasks 8.2 + 8.3)
  // ===========================================================================
  renderFieldsSection() {
    const e = this.groupFieldsBySection(), t = Array.from(e.keys());
    if (this.fields.length === 0)
      return `
        <div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fields</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">0 fields</span>
          </div>
          <button type="button" data-block-add-field
                  class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Field
          </button>
        </div>
        <div data-field-drop-zone
             class="flex flex-col items-center justify-center py-16 px-5 text-center border-2 border-dashed ${this.dropHighlight ? "border-blue-400 bg-blue-50/50" : "border-transparent"} rounded-lg mx-3 my-2 transition-colors">
          <svg class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-sm text-gray-400 dark:text-gray-500">No fields defined.</p>
          <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">Drag fields from the palette or click a field type to add.</p>
        </div>`;
    let r = `
      <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
          <span class="text-[11px] text-gray-400 dark:text-gray-500">${this.fields.length} field${this.fields.length !== 1 ? "s" : ""}</span>
        </div>
        <button type="button" data-block-add-field
                class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Field
        </button>
      </div>`;
    for (const a of t) {
      const s = e.get(a), n = this.getSectionState(a).collapsed;
      r += `
        <div data-section="${u(a)}" class="border-b border-gray-100 dark:border-gray-800">
          <button type="button" data-toggle-section="${u(a)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-section-chevron="${u(a)}">
              ${n ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${u(Y(a))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${s.length}</span>
          </button>

          <div class="${n ? "hidden" : ""}" data-section-body="${u(a)}">
            <div class="px-3 pb-2 space-y-1" data-section-fields="${u(a)}">
              ${s.map((l) => this.renderFieldCard(l, t, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return r += qe({ highlight: this.dropHighlight }), r;
  }
  // ===========================================================================
  // Rendering – Single field card (Task 8.2)
  // ===========================================================================
  renderFieldCard(e, t, r) {
    const a = e.section || j, s = r.indexOf(e), i = [];
    e.validation?.minLength !== void 0 && i.push(`min: ${e.validation.minLength}`), e.validation?.maxLength !== void 0 && i.push(`max: ${e.validation.maxLength}`), e.validation?.min !== void 0 && i.push(`>= ${e.validation.min}`), e.validation?.max !== void 0 && i.push(`<= ${e.validation.max}`), e.validation?.pattern && i.push("pattern");
    const n = `
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${u(e.id)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === e.id ? this.renderMoveToSectionMenu(e, t, a) : ""}
          </div>`;
    return ft({
      field: e,
      isExpanded: e.id === this.expandedFieldId,
      isDropTarget: this.dropTargetFieldId === e.id,
      showReorderButtons: !0,
      isFirst: s === 0,
      isLast: s === r.length - 1,
      compact: !1,
      sectionName: a,
      actionsHtml: n,
      constraintBadges: i,
      renderExpandedContent: () => this.renderFieldProperties(e, t)
    });
  }
  // ===========================================================================
  // Rendering – Inline field property editor (Task 8.2)
  // ===========================================================================
  renderFieldProperties(e, t) {
    return P(e.type) === "blocks" ? this.renderBlocksFieldProperties(e, t) : this.renderStandardFieldProperties(e, t);
  }
  /** Standard field properties (non-blocks) */
  renderStandardFieldProperties(e, t) {
    const r = e.validation ?? {}, a = P(e.type), s = ["text", "textarea", "rich-text", "markdown", "code", "slug"].includes(a), i = ["number", "integer", "currency", "percentage"].includes(a), n = e.section || j;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${u(e.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${u(e.id)}" data-prop-key="name"
                   value="${u(e.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${p("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
            <input type="text" data-field-prop="${u(e.id)}" data-prop-key="label"
                   value="${u(e.label)}"
                   class="${p("xs")}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
          <input type="text" data-field-prop="${u(e.id)}" data-prop-key="description"
                 value="${u(e.description ?? "")}" placeholder="Help text for editors"
                 class="${p("xs")}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${u(e.id)}" data-prop-key="placeholder"
                 value="${u(e.placeholder ?? "")}"
                 class="${p("xs")}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${u(e.id)}" data-check-key="required"
                   ${e.required ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${u(e.id)}" data-check-key="readonly"
                   ${e.readonly ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${u(e.id)}" data-check-key="hidden"
                   ${e.hidden ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
          </label>
        </div>

        <!-- Validation (conditional) -->
        ${s ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Length</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="validation.minLength"
                   value="${r.minLength ?? ""}" min="0"
                   class="${p("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="validation.maxLength"
                   value="${r.maxLength ?? ""}" min="0"
                   class="${p("xs")}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${u(e.id)}" data-prop-key="validation.pattern"
                 value="${u(r.pattern ?? "")}" placeholder="^[a-z]+$"
                 class="${p("xs")} font-mono" />
        </div>` : ""}

        ${i ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="validation.min"
                   value="${r.min ?? ""}" step="any"
                   class="${p("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="validation.max"
                   value="${r.max ?? ""}" step="any"
                   class="${p("xs")}" />
          </div>
        </div>` : ""}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
            <select data-field-section-select="${u(e.id)}"
                    class="${D("xs")}">
              ${t.map((l) => `<option value="${u(l)}" ${l === n ? "selected" : ""}>${u(Y(l))}</option>`).join("")}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="gridSpan"
                   value="${e.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                   class="${p("xs")}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${u(e.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  /** Blocks field properties: block picker primary, field settings secondary */
  renderBlocksFieldProperties(e, t) {
    const r = e.config ?? {}, a = e.section || j, i = this.getBlocksPickerMode(e.id) === "allowed", n = new Set(
      i ? r.allowedBlocks ?? [] : r.deniedBlocks ?? []
    ), l = "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded", d = i ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", c = i ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300", g = i ? "Allowed Blocks" : "Denied Blocks", m = i ? "blue" : "red", h = i ? "All blocks allowed (no restrictions)" : "No blocks denied";
    let b;
    if (this.cachedBlocks) {
      const k = oe(n, this.cachedBlocks);
      b = ne({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: k,
        label: g,
        accent: m,
        emptySelectionText: h
      });
    } else
      b = `
        <div class="flex items-center justify-center py-6" data-blocks-loading="${u(e.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${u(e.id)}">
        <!-- Block Selection (primary) -->
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-blocks-mode-toggle="${u(e.id)}" data-blocks-mode="allowed"
                    class="${l} ${d}">
              Allowed
            </button>
            <button type="button" data-blocks-mode-toggle="${u(e.id)}" data-blocks-mode="denied"
                    class="${l} ${c}">
              Denied
            </button>
          </div>
          <button type="button" data-blocks-open-library="${u(e.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-blocks-picker-container="${u(e.id)}">
          ${b}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-blocks-advanced="${u(e.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>

        <!-- Min/Max Blocks -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Blocks</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="config.minBlocks"
                   value="${r.minBlocks ?? ""}" min="0" placeholder="0"
                   class="${p("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Blocks</label>
            <input type="number" data-field-prop="${u(e.id)}" data-prop-key="config.maxBlocks"
                   value="${r.maxBlocks ?? ""}" min="1" placeholder="No limit"
                   class="${p("xs")}" />
          </div>
        </div>

        <!-- Field Settings (secondary — collapsed by default) -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
          <button type="button" data-blocks-settings-toggle="${u(e.id)}"
                  class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
            <span data-blocks-settings-chevron="${u(e.id)}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
            Field Settings
          </button>

          <div class="hidden mt-2 space-y-3" data-blocks-settings-body="${u(e.id)}">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
                <input type="text" data-field-prop="${u(e.id)}" data-prop-key="name"
                       value="${u(e.name)}" pattern="^[a-z][a-z0-9_]*$"
                       class="${p("xs")}" />
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
                <input type="text" data-field-prop="${u(e.id)}" data-prop-key="label"
                       value="${u(e.label)}"
                       class="${p("xs")}" />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
              <input type="text" data-field-prop="${u(e.id)}" data-prop-key="description"
                     value="${u(e.description ?? "")}" placeholder="Help text for editors"
                     class="${p("xs")}" />
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${u(e.id)}" data-check-key="required"
                       ${e.required ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${u(e.id)}" data-check-key="readonly"
                       ${e.readonly ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${u(e.id)}" data-check-key="hidden"
                       ${e.hidden ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
                <select data-field-section-select="${u(e.id)}"
                        class="${D("xs")}">
                  ${t.map((k) => `<option value="${u(k)}" ${k === a ? "selected" : ""}>${u(Y(k))}</option>`).join("")}
                  <option value="__new__">+ New section...</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
                <input type="number" data-field-prop="${u(e.id)}" data-prop-key="gridSpan"
                       value="${e.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                       class="${p("xs")}" />
              </div>
            </div>
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${u(e.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  // ===========================================================================
  // Rendering – Move to Section menu (Task 8.4)
  // ===========================================================================
  renderMoveToSectionMenu(e, t, r) {
    const a = t.filter((s) => s !== r);
    return a.length === 0 ? `
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">Only one section exists.</div>
          <button type="button" data-move-new-section="${u(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>` : `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Move to section</div>
        ${a.map((s) => `
          <button type="button" data-move-to="${u(s)}" data-move-field="${u(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${u(Y(s))}
          </button>`).join("")}
        <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
          <button type="button" data-move-new-section="${u(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>
      </div>`;
  }
  // ===========================================================================
  // Section helpers
  // ===========================================================================
  groupFieldsBySection() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.fields) {
      const r = t.section || j;
      e.has(r) || e.set(r, []), e.get(r).push(t);
    }
    if (e.has(j)) {
      const t = e.get(j);
      e.delete(j);
      const r = /* @__PURE__ */ new Map();
      r.set(j, t);
      for (const [a, s] of e) r.set(a, s);
      return r;
    }
    return e;
  }
  getSectionState(e) {
    return this.sectionStates.has(e) || this.sectionStates.set(e, { collapsed: !1 }), this.sectionStates.get(e);
  }
  getBlocksPickerMode(e) {
    return this.blockPickerModes.get(e) ?? "allowed";
  }
  ensureInlineBlocksPicker() {
    if (!this.expandedFieldId) return;
    const e = this.fields.find((t) => t.id === this.expandedFieldId);
    e && P(e.type) === "blocks" && this.loadBlocksForField(e);
  }
  // ===========================================================================
  // Event Binding
  // ===========================================================================
  bindEvents(e) {
    e.querySelector("[data-toggle-metadata]")?.addEventListener("click", () => {
      const t = e.querySelector("[data-metadata-body]"), r = e.querySelector("[data-metadata-chevron]");
      if (t) {
        const a = t.classList.toggle("hidden");
        r && (r.innerHTML = a ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
    }), e.querySelectorAll("[data-meta-field]").forEach((t) => {
      const r = t.dataset.metaField;
      t.tagName === "SELECT" ? t.addEventListener("change", () => this.handleMetadataChange(r, t.value)) : (t.tagName === "TEXTAREA" || t.tagName === "INPUT") && t.addEventListener("input", () => this.handleMetadataChange(r, t.value));
    }), Ce(e, "[data-icon-trigger]", (t) => {
      const r = t.querySelector('[data-meta-field="icon"]');
      return {
        value: r?.value ?? "",
        onSelect: (a) => {
          r && (r.value = a, r.dispatchEvent(new Event("input", { bubbles: !0 })));
        },
        onClear: () => {
          r && (r.value = "", r.dispatchEvent(new Event("input", { bubbles: !0 })));
        },
        compact: !0
      };
    }), e.addEventListener("click", (t) => this.handleClick(t, e)), e.addEventListener("input", (t) => this.handleInput(t)), e.addEventListener("change", (t) => this.handleChange(t, e)), document.addEventListener("click", (t) => {
      if (this.moveMenuFieldId) {
        const r = t.target;
        !r.closest("[data-move-menu]") && !r.closest("[data-field-actions]") && (this.moveMenuFieldId = null, this.render());
      }
    }), this.bindDropZoneEvents(e), this.bindFieldReorderEvents(e), this.bindSectionSelectEvents(e);
  }
  /** Bind drag-and-drop events on all [data-field-drop-zone] elements */
  bindDropZoneEvents(e) {
    e.querySelectorAll("[data-field-drop-zone]").forEach((r) => {
      r.addEventListener("dragover", (a) => {
        a.preventDefault(), a.dataTransfer.dropEffect = "copy", this.dropHighlight || (this.dropHighlight = !0, r.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), r.classList.add("border-blue-400", "bg-blue-50/50"));
      }), r.addEventListener("dragleave", (a) => {
        r.contains(a.relatedTarget) || (this.dropHighlight = !1, r.classList.remove("border-blue-400", "bg-blue-50/50"), r.classList.add("border-gray-200", "hover:border-gray-300"));
      }), r.addEventListener("drop", (a) => {
        if (a.preventDefault(), this.dropHighlight = !1, r.classList.remove("border-blue-400", "bg-blue-50/50"), r.classList.add("border-gray-200", "hover:border-gray-300"), this.config.onFieldDrop) {
          const s = a.dataTransfer?.getData(Re);
          if (s)
            try {
              const n = JSON.parse(s);
              if (n && n.type) {
                this.config.onFieldDrop(n);
                return;
              }
            } catch {
            }
          const i = a.dataTransfer?.getData(ke);
          if (i) {
            const n = P(i), l = Se(n) ?? {
              type: n,
              label: Y(n),
              description: "",
              icon: "",
              category: "advanced"
            };
            this.config.onFieldDrop(l);
          }
        }
      });
    });
  }
  handleClick(e, t) {
    const r = e.target;
    if (r.closest("[data-block-add-field]")) {
      this.config.onAddFieldClick && this.config.onAddFieldClick();
      return;
    }
    const s = r.closest("[data-toggle-section]");
    if (s) {
      const y = s.dataset.toggleSection, S = this.getSectionState(y);
      S.collapsed = !S.collapsed, this.sectionStates.set(y, S);
      const B = t.querySelector(`[data-section-body="${y}"]`), A = t.querySelector(`[data-section-chevron="${y}"]`);
      B && B.classList.toggle("hidden", S.collapsed), A && (A.innerHTML = S.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      return;
    }
    const i = r.closest("[data-field-actions]");
    if (i) {
      e.stopPropagation();
      const y = i.dataset.fieldActions;
      this.moveMenuFieldId = this.moveMenuFieldId === y ? null : y, this.render();
      return;
    }
    const n = r.closest("[data-move-to]");
    if (n) {
      e.stopPropagation();
      const y = n.dataset.moveTo, S = n.dataset.moveField;
      this.moveFieldToSection(S, y);
      return;
    }
    const l = r.closest("[data-move-new-section]");
    if (l) {
      e.stopPropagation();
      const y = l.dataset.moveNewSection;
      new ie({
        title: "Create New Section",
        label: "Section name",
        placeholder: "e.g. sidebar",
        confirmLabel: "Create",
        inputClass: p(),
        onConfirm: (B) => {
          const A = B.trim().toLowerCase().replace(/\s+/g, "_");
          A && this.moveFieldToSection(y, A);
        }
      }).show();
      return;
    }
    const d = r.closest("[data-field-move-up]");
    if (d) {
      e.stopPropagation();
      const y = d.dataset.fieldMoveUp;
      d.hasAttribute("disabled") || this.moveFieldInSection(y, -1);
      return;
    }
    const c = r.closest("[data-field-move-down]");
    if (c) {
      e.stopPropagation();
      const y = c.dataset.fieldMoveDown;
      c.hasAttribute("disabled") || this.moveFieldInSection(y, 1);
      return;
    }
    const g = r.closest("[data-field-remove]");
    if (g) {
      const y = g.dataset.fieldRemove, S = this.fields.find((B) => B.id === y);
      S && se.confirm(`Remove field "${S.label || S.name}"?`, {
        title: "Remove Field",
        confirmText: "Remove",
        confirmVariant: "danger"
      }).then((B) => {
        B && (this.fields = this.fields.filter((A) => A.id !== y), this.expandedFieldId === y && (this.expandedFieldId = null), this.notifySchemaChange(), this.render());
      });
      return;
    }
    const m = r.closest("[data-blocks-settings-toggle]");
    if (m) {
      const y = m.dataset.blocksSettingsToggle, S = t.querySelector(`[data-blocks-settings-body="${y}"]`), B = t.querySelector(`[data-blocks-settings-chevron="${y}"]`);
      if (S) {
        const A = S.classList.toggle("hidden");
        B && (B.innerHTML = A ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
      return;
    }
    const h = r.closest("[data-blocks-mode-toggle]");
    if (h) {
      e.stopPropagation();
      const y = h.dataset.blocksModeToggle, S = h.dataset.blocksMode ?? "allowed";
      this.blockPickerModes.set(y, S), this.render();
      return;
    }
    if (r.closest("[data-blocks-open-library]")) {
      e.stopPropagation();
      const y = this.config.api.getBasePath();
      window.location.href = `${y}/content/block-library`;
      return;
    }
    const k = r.closest("[data-blocks-advanced]");
    if (k) {
      e.stopPropagation();
      const y = k.dataset.blocksAdvanced, S = this.fields.find((B) => B.id === y);
      S && this.openFieldConfigModal(S);
      return;
    }
    const C = r.closest("[data-field-toggle]");
    if (C) {
      if (r.closest("[data-field-grip]")) return;
      const y = C.dataset.fieldToggle;
      if (this.expandedFieldId = this.expandedFieldId === y ? null : y, this.render(), this.expandedFieldId) {
        const S = this.fields.find((B) => B.id === this.expandedFieldId);
        S && P(S.type) === "blocks" && this.loadBlocksForField(S);
      }
      return;
    }
  }
  handleInput(e) {
    const r = e.target.closest("[data-field-prop]");
    if (r) {
      const a = r.dataset.fieldProp, s = r.dataset.propKey;
      this.updateFieldProp(a, s, r.value);
      return;
    }
  }
  handleChange(e, t) {
    const a = e.target.closest("[data-field-check]");
    if (a) {
      const s = a.dataset.fieldCheck, i = a.dataset.checkKey;
      this.updateFieldProp(s, i, a.checked);
      return;
    }
  }
  // ===========================================================================
  // Data mutations
  // ===========================================================================
  handleMetadataChange(e, t) {
    if (e === "status" && this.config.onStatusChange) {
      this.config.onStatusChange(this.block.id, t);
      return;
    }
    const r = {}, a = this.block;
    switch (e) {
      case "name":
        r.name = t, a.name = t;
        break;
      case "slug": {
        const s = (this.block.slug || this.block.type || "").toString();
        r.slug = t, a.slug = t, (!a.type || a.type === s) && (r.type = t, a.type = t);
        break;
      }
      case "description":
        r.description = t, a.description = t;
        break;
      case "category":
        r.category = t, a.category = t;
        break;
      case "icon":
        r.icon = t, a.icon = t;
        break;
      case "status":
        r.status = t, a.status = t;
        break;
    }
    this.config.onMetadataChange(this.block.id, r);
  }
  updateFieldProp(e, t, r) {
    const a = this.fields.find((i) => i.id === e);
    if (!a) return;
    const s = t.split(".");
    if (s.length === 1) {
      const i = s[0], n = a;
      typeof r == "boolean" ? n[i] = r : i === "gridSpan" ? n[i] = r ? parseInt(r, 10) : void 0 : n[i] = r || void 0;
    } else if (s[0] === "config") {
      a.config || (a.config = {});
      const i = s[1], n = a.config;
      typeof r == "string" && (r === "" ? delete n[i] : ["minBlocks", "maxBlocks"].includes(i) ? n[i] = parseInt(r, 10) : n[i] = r), Object.keys(a.config).length === 0 && (a.config = void 0);
    } else if (s[0] === "validation") {
      a.validation || (a.validation = {});
      const i = s[1];
      typeof r == "string" && (r === "" ? delete a.validation[i] : ["minLength", "maxLength"].includes(i) ? a.validation[i] = parseInt(r, 10) : ["min", "max"].includes(i) ? a.validation[i] = parseFloat(r) : a.validation[i] = r), Object.keys(a.validation).length === 0 && (a.validation = void 0);
    }
    this.notifySchemaChange();
  }
  /** Load blocks and render inline picker for a blocks field (Phase 4) */
  async loadBlocksForField(e) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(e);
      return;
    }
    this.blocksLoading || (this.blocksLoading = !0, this.cachedBlocks = await Oe(this.config.api), this.blocksLoading = !1, this.expandedFieldId === e.id && this.renderInlineBlockPickerForField(e));
  }
  /** Render and bind inline block picker into the DOM container */
  renderInlineBlockPickerForField(e) {
    const t = this.config.container.querySelector(
      `[data-blocks-picker-container="${e.id}"]`
    );
    if (!t || !this.cachedBlocks) return;
    const r = e.config ?? {}, s = this.getBlocksPickerMode(e.id) === "allowed", i = oe(
      new Set(s ? r.allowedBlocks ?? [] : r.deniedBlocks ?? []),
      this.cachedBlocks
    ), n = s ? "Allowed Blocks" : "Denied Blocks", l = s ? "blue" : "red", d = s ? "All blocks allowed (no restrictions)" : "No blocks denied";
    t.innerHTML = ne({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      label: n,
      accent: l,
      emptySelectionText: d
    }), ct(t, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      onSelectionChange: (c) => {
        e.config || (e.config = {});
        const g = e.config;
        s ? c.size > 0 ? g.allowedBlocks = Array.from(c) : delete g.allowedBlocks : c.size > 0 ? g.deniedBlocks = Array.from(c) : delete g.deniedBlocks, Object.keys(e.config).length === 0 && (e.config = void 0), this.notifySchemaChange();
      },
      label: n,
      accent: l,
      emptySelectionText: d
    });
  }
  openFieldConfigModal(e) {
    new ve({
      field: e,
      existingFieldNames: this.fields.filter((r) => r.id !== e.id).map((r) => r.name),
      apiBasePath: this.config.api.getBasePath(),
      onSave: (r) => {
        const a = this.fields.findIndex((s) => s.id === e.id);
        a !== -1 && (this.fields[a] = r, this.notifySchemaChange(), this.render());
      },
      onCancel: () => {
      }
    }).show();
  }
  moveFieldToSection(e, t) {
    const r = this.fields.find((a) => a.id === e);
    r && (r.section = t === j ? void 0 : t, this.moveMenuFieldId = null, this.notifySchemaChange(), this.render());
  }
  // ===========================================================================
  // Field Reorder (Phase 10 — Task 10.1 drag, Task 10.2 keyboard)
  // ===========================================================================
  /** Move a field up (-1) or down (+1) within its section */
  moveFieldInSection(e, t) {
    const r = this.fields.find((c) => c.id === e);
    if (!r) return;
    const a = r.section || j, s = this.fields.filter((c) => (c.section || j) === a), i = s.findIndex((c) => c.id === e), n = i + t;
    if (n < 0 || n >= s.length) return;
    const l = this.fields.indexOf(s[i]), d = this.fields.indexOf(s[n]);
    [this.fields[l], this.fields[d]] = [this.fields[d], this.fields[l]], this.notifySchemaChange(), this.render();
  }
  /** Reorder a field by moving it before a target field in the same section */
  reorderFieldBefore(e, t) {
    if (e === t) return;
    const r = this.fields.find((d) => d.id === e), a = this.fields.find((d) => d.id === t);
    if (!r || !a) return;
    const s = r.section || j, i = a.section || j;
    if (s !== i) return;
    const n = this.fields.indexOf(r);
    this.fields.splice(n, 1);
    const l = this.fields.indexOf(a);
    this.fields.splice(l, 0, r), this.notifySchemaChange(), this.render();
  }
  /** Bind drag events on [data-field-card] for intra-section reordering */
  bindFieldReorderEvents(e) {
    e.querySelectorAll("[data-field-card]").forEach((r) => {
      const a = r.dataset.fieldCard, s = r.dataset.fieldSection;
      let i = !1;
      r.addEventListener("mousedown", (n) => {
        i = !!n.target.closest("[data-field-grip]");
      }), r.addEventListener("dragstart", (n) => {
        if (!i) {
          n.preventDefault();
          return;
        }
        this.dragReorder = { fieldId: a, sectionName: s }, n.dataTransfer.effectAllowed = "move", n.dataTransfer.setData(rt, a), r.classList.add("opacity-50");
      }), r.addEventListener("dragend", () => {
        this.dragReorder = null, this.dropTargetFieldId = null, r.classList.remove("opacity-50"), e.querySelectorAll("[data-field-card]").forEach((n) => {
          n.classList.remove("border-t-2", "border-t-blue-400");
        });
      }), r.addEventListener("dragover", (n) => {
        this.dragReorder && this.dragReorder.sectionName === s && this.dragReorder.fieldId !== a && (n.preventDefault(), n.dataTransfer.dropEffect = "move", this.dropTargetFieldId !== a && (e.querySelectorAll("[data-field-card]").forEach((l) => {
          l.classList.remove("border-t-2", "border-t-blue-400");
        }), r.classList.add("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = a));
      }), r.addEventListener("dragleave", () => {
        this.dropTargetFieldId === a && (r.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null);
      }), r.addEventListener("drop", (n) => {
        n.preventDefault();
        const l = n.dataTransfer?.getData(rt);
        r.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null, this.dragReorder = null, l && l !== a && this.reorderFieldBefore(l, a);
      });
    });
  }
  /** Bind section-select dropdown changes (Phase 10 — Task 10.3) */
  bindSectionSelectEvents(e) {
    e.querySelectorAll("[data-field-section-select]").forEach((t) => {
      t.addEventListener("change", () => {
        const r = t.dataset.fieldSectionSelect, a = t.value;
        if (a === "__new__") {
          const i = this.fields.find((l) => l.id === r)?.section || j;
          new ie({
            title: "Create New Section",
            label: "Section name",
            placeholder: "e.g. sidebar",
            confirmLabel: "Create",
            inputClass: p(),
            onConfirm: (l) => {
              const d = l.trim().toLowerCase().replace(/\s+/g, "_");
              d && this.moveFieldToSection(r, d);
            },
            onCancel: () => {
              t.value = i;
            }
          }).show();
          return;
        }
        this.moveFieldToSection(r, a);
      });
    });
  }
  notifySchemaChange() {
    this.config.onSchemaChange(this.block.id, [...this.fields]);
  }
}
function u(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function Y(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
const Me = ["content", "media", "layout", "interactive", "custom"], xe = class xe {
  constructor(e) {
    this.listEl = null, this.searchInput = null, this.categorySelect = null, this.countEl = null, this.createBtn = null, this.editorEl = null, this.paletteEl = null, this.activeMenu = null, this.editorPanel = null, this.palettePanel = null, this.autosaveTimers = /* @__PURE__ */ new Map(), this.boundVisibilityChange = null, this.boundBeforeUnload = null, this.sidebarEl = null, this.paletteAsideEl = null, this.sidebarToggleBtn = null, this.gridEl = null, this.addFieldBar = null, this.paletteTriggerBtn = null, this.sidebarCollapsed = !1, this.mediaQueryLg = null, this.popoverPalettePanel = null, this.envSelectEl = null, this.currentEnvironment = "";
    const t = Be(e.dataset.apiBasePath, e.dataset.basePath);
    this.root = e, this.api = new K({ basePath: t }), this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: !1,
      error: null,
      search: "",
      categoryFilter: null,
      categories: [],
      isCreating: !1,
      renamingBlockId: null,
      dirtyBlocks: /* @__PURE__ */ new Set(),
      savingBlocks: /* @__PURE__ */ new Set(),
      saveErrors: /* @__PURE__ */ new Map()
    };
  }
  async init() {
    this.bindDOM(), this.bindEvents(), this.initPalette(), this.bindAutosaveListeners(), this.bindResponsive(), this.initEnvironment(), await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }
  /** Initialize the field palette panel (Phase 9) */
  initPalette() {
    this.paletteEl && (this.palettePanel = new _e({
      container: this.paletteEl,
      api: this.api,
      onAddField: (e) => this.handlePaletteAddField(e)
    }), this.palettePanel.init());
  }
  // ===========================================================================
  // Autosave system (Phase 11 — Task 11.1)
  // ===========================================================================
  /** Set up global listeners for autosave: Ctrl+S, visibility change, beforeunload */
  bindAutosaveListeners() {
    this.root.addEventListener("keydown", (e) => {
      (e.ctrlKey || e.metaKey) && e.key === "s" && (e.preventDefault(), this.saveCurrentBlock());
    }), this.boundVisibilityChange = () => {
      document.hidden && this.saveAllDirty();
    }, document.addEventListener("visibilitychange", this.boundVisibilityChange), this.boundBeforeUnload = (e) => {
      this.state.dirtyBlocks.size > 0 && (e.preventDefault(), e.returnValue = "");
    }, window.addEventListener("beforeunload", this.boundBeforeUnload);
  }
  /** Persist a dirty block to the backend */
  async saveBlock(e) {
    if (!this.state.dirtyBlocks.has(e)) return !0;
    const t = this.state.blocks.find((r) => r.id === e);
    if (!t) return !1;
    this.cancelScheduledSave(e), this.markSaving(e), this.notifySaveState(e, "saving");
    try {
      const r = await this.api.updateBlockDefinition(e, {
        name: t.name,
        slug: t.slug,
        type: t.type,
        description: t.description,
        category: t.category,
        icon: t.icon,
        schema: t.schema,
        ui_schema: t.ui_schema
      });
      return this.updateBlockInState(e, r), this.markClean(e), this.notifySaveState(e, "saved"), !0;
    } catch (r) {
      const a = r instanceof Error ? r.message : "Save failed";
      return this.markSaveError(e, a), this.notifySaveState(e, "error", a), !1;
    }
  }
  /** Schedule an autosave after the debounce delay */
  scheduleSave(e) {
    this.cancelScheduledSave(e);
    const t = setTimeout(() => {
      this.autosaveTimers.delete(e), this.saveBlock(e);
    }, xe.AUTOSAVE_DELAY);
    this.autosaveTimers.set(e, t);
  }
  /** Cancel a pending autosave for a block */
  cancelScheduledSave(e) {
    const t = this.autosaveTimers.get(e);
    t && (clearTimeout(t), this.autosaveTimers.delete(e));
  }
  /** Save the currently selected block immediately */
  async saveCurrentBlock() {
    this.state.selectedBlockId && await this.saveBlock(this.state.selectedBlockId);
  }
  /** Save all dirty blocks (used on visibility change) */
  async saveAllDirty() {
    const e = [...this.state.dirtyBlocks];
    await Promise.all(e.map((t) => this.saveBlock(t)));
  }
  /** Notify the editor panel of a save state change */
  notifySaveState(e, t, r) {
    this.editorPanel && this.state.selectedBlockId === e && this.editorPanel.updateSaveState(t, r);
  }
  // ===========================================================================
  // Status lifecycle (Phase 11 — Task 11.3)
  // ===========================================================================
  /** Handle status changes from the editor dropdown (publish/deprecate flow) */
  async handleEditorStatusChange(e, t) {
    const r = this.state.blocks.find((s) => s.id === e);
    if (!r) return;
    const a = r.status;
    if (a !== t) {
      if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
        this.showToast("Please fix save errors before changing status.", "error"), this.editorPanel?.revertStatus(a);
        return;
      }
      try {
        let s;
        if (t === "active" ? (s = await this.api.publishBlockDefinition(e), this.showToast("Block published.", "success")) : t === "deprecated" ? (s = await this.api.deprecateBlockDefinition(e), this.showToast("Block deprecated.", "info")) : (s = await this.api.updateBlockDefinition(e, { status: "draft" }), this.showToast("Block reverted to draft.", "info")), this.updateBlockInState(e, s), this.renderBlockList(), this.editorPanel && this.state.selectedBlockId === e) {
          const i = this.state.blocks.find((n) => n.id === e);
          i && this.editorPanel.update(i);
        }
      } catch (s) {
        const i = t === "active" ? "Block published." : t === "deprecated" ? "Block deprecated." : "Block reverted to draft.";
        if (s instanceof Te && [404, 405, 501].includes(s.status))
          try {
            const l = await this.api.updateBlockDefinition(e, { status: t });
            if (this.updateBlockInState(e, l), this.renderBlockList(), this.editorPanel && this.state.selectedBlockId === e) {
              const d = this.state.blocks.find((c) => c.id === e);
              d && this.editorPanel.update(d);
            }
            this.showToast(i, t === "active" ? "success" : "info");
            return;
          } catch (l) {
            console.error("Status change fallback failed:", l);
          }
        const n = s instanceof Error ? s.message : "Status change failed";
        console.error("Status change failed:", s), this.showToast(n, "error"), this.editorPanel?.revertStatus(a);
      }
    }
  }
  // ===========================================================================
  // Responsive layout (Phase 12 — Task 12.1)
  // ===========================================================================
  /** Set up media query listeners and responsive behaviors */
  bindResponsive() {
    this.sidebarToggleBtn?.addEventListener("click", () => this.toggleSidebar()), this.paletteTriggerBtn?.addEventListener("click", () => {
      this.paletteTriggerBtn && this.openPalettePopover(this.paletteTriggerBtn);
    }), this.mediaQueryLg = window.matchMedia("(min-width: 1024px)"), this.mediaQueryLg.addEventListener("change", () => this.handleBreakpointChange());
  }
  /** React to viewport breakpoint changes */
  handleBreakpointChange() {
    (this.mediaQueryLg?.matches ?? !0) && this.closePalettePopover();
  }
  /** Toggle the left sidebar collapsed state */
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed, this.sidebarEl && this.sidebarEl.classList.toggle("hidden", this.sidebarCollapsed), this.gridEl && (this.sidebarCollapsed ? (this.gridEl.classList.remove("md:grid-cols-[240px,1fr]", "lg:grid-cols-[240px,1fr,260px]"), this.gridEl.classList.add("md:grid-cols-[1fr]", "lg:grid-cols-[1fr,260px]")) : (this.gridEl.classList.remove("md:grid-cols-[1fr]", "lg:grid-cols-[1fr,260px]"), this.gridEl.classList.add("md:grid-cols-[240px,1fr]", "lg:grid-cols-[240px,1fr,260px]"))), this.sidebarToggleBtn && this.sidebarToggleBtn.setAttribute("title", this.sidebarCollapsed ? "Show sidebar" : "Hide sidebar");
  }
  /** Open the field palette as a popover overlay (< lg screens) */
  openPalettePopover(e) {
    this.closePalettePopover();
    const t = document.createElement("div");
    t.className = "fixed inset-0 z-40", t.dataset.paletteBackdrop = "", t.addEventListener("click", () => this.closePalettePopover());
    const r = document.createElement("div");
    r.className = "fixed z-50 w-72 max-h-[60vh] bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden", r.dataset.palettePopover = "", r.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add Field</h3>
        <button type="button" data-palette-popover-close
                class="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto" data-palette-popover-content></div>
    `, r.querySelector("[data-palette-popover-close]")?.addEventListener("click", () => this.closePalettePopover());
    const a = e.getBoundingClientRect(), s = 288;
    let i = a.left, n = a.top - 8;
    i + s > window.innerWidth - 16 && (i = window.innerWidth - s - 16), i < 16 && (i = 16);
    const l = Math.min(window.innerHeight * 0.6, 480);
    n - l < 16 ? n = a.bottom + 8 : n = n - l, r.style.top = `${n}px`, r.style.left = `${i}px`, document.body.appendChild(t), document.body.appendChild(r);
    const d = r.querySelector("[data-palette-popover-content]");
    d && (this.popoverPalettePanel = new _e({
      container: d,
      api: this.api,
      onAddField: (c) => {
        this.handlePaletteAddField(c), this.closePalettePopover();
      }
    }), this.popoverPalettePanel.init(), this.state.selectedBlockId && this.popoverPalettePanel.enable());
  }
  /** Close the palette popover if open */
  closePalettePopover() {
    document.querySelector("[data-palette-backdrop]")?.remove(), document.querySelector("[data-palette-popover]")?.remove(), this.popoverPalettePanel = null;
  }
  /** Show or hide the "Add Field" bar based on whether a block is selected */
  updateAddFieldBar() {
    this.addFieldBar && this.addFieldBar.classList.toggle("hidden", !this.state.selectedBlockId);
  }
  // ===========================================================================
  // Environment management (Phase 12 — Tasks 12.2 + 12.3)
  // ===========================================================================
  /** Initialize environment from URL param and bind selector */
  initEnvironment() {
    const t = new URLSearchParams(window.location.search).get("env") ?? "";
    this.currentEnvironment = t, this.api.setEnvironment(this.currentEnvironment), this.envSelectEl && (this.ensureEnvironmentOption(this.currentEnvironment), this.ensureEnvironmentOption("__add__", "Add environment..."), this.envSelectEl.value = this.currentEnvironment, this.envSelectEl.addEventListener("change", () => {
      const r = this.envSelectEl.value;
      if (r === "__add__") {
        this.promptForEnvironment();
        return;
      }
      this.setEnvironment(r);
    })), this.currentEnvironment && this.api.setEnvironmentSession(this.currentEnvironment).catch(() => {
    });
  }
  /** Change the active environment and reload data */
  async setEnvironment(e) {
    this.currentEnvironment = e, this.api.setEnvironment(e), this.envSelectEl && (this.ensureEnvironmentOption(e), this.envSelectEl.value = e), e ? sessionStorage.setItem("block-library-env", e) : sessionStorage.removeItem("block-library-env");
    try {
      await this.api.setEnvironmentSession(e);
    } catch {
    }
    this.updateUrlEnvironment(e), this.state.selectedBlockId = null, this.state.dirtyBlocks.clear(), this.state.savingBlocks.clear(), this.state.saveErrors.clear(), this.editorPanel = null, this.renderEditor(), await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }
  /** Update the ?env= query parameter in the URL without a page reload */
  updateUrlEnvironment(e) {
    const t = new URL(window.location.href);
    e ? t.searchParams.set("env", e) : t.searchParams.delete("env"), window.history.replaceState({}, "", t.toString());
  }
  /** Ensure the environment select contains a specific option */
  ensureEnvironmentOption(e, t) {
    if (!this.envSelectEl) return;
    const r = e ?? "";
    if (r === "" || Array.from(this.envSelectEl.options).some((s) => s.value === r))
      return;
    const a = document.createElement("option");
    a.value = r, a.textContent = t ?? r, this.envSelectEl.appendChild(a);
  }
  promptForEnvironment() {
    if (!this.envSelectEl) return;
    const e = this.currentEnvironment;
    new ie({
      title: "Add Environment",
      label: "Environment name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      inputClass: p(),
      onConfirm: (r) => {
        const a = r.trim();
        a && (this.ensureEnvironmentOption(a), this.envSelectEl.value = a, this.setEnvironment(a));
      },
      onCancel: () => {
        this.envSelectEl.value = e;
      }
    }).show();
  }
  // ===========================================================================
  // Public API (for cross-panel communication in later phases)
  // ===========================================================================
  getSelectedBlock() {
    return this.state.selectedBlockId ? this.state.blocks.find((e) => e.id === this.state.selectedBlockId) ?? null : null;
  }
  selectBlock(e) {
    const t = this.state.selectedBlockId;
    t && t !== e && this.state.dirtyBlocks.has(t) && (this.cancelScheduledSave(t), this.saveBlock(t)), this.state.selectedBlockId = e, this.editorPanel && t !== e && this.editorPanel.updateSaveState("idle"), this.renderBlockList(), this.renderEditor();
  }
  markDirty(e) {
    this.state.dirtyBlocks.add(e), this.updateBlockIndicator(e);
  }
  markClean(e) {
    this.state.dirtyBlocks.delete(e), this.state.saveErrors.delete(e), this.state.savingBlocks.delete(e), this.updateBlockIndicator(e);
  }
  markSaving(e) {
    this.state.savingBlocks.add(e), this.updateBlockIndicator(e);
  }
  markSaveError(e, t) {
    this.state.savingBlocks.delete(e), this.state.saveErrors.set(e, t), this.updateBlockIndicator(e);
  }
  async refreshBlocks() {
    await this.loadBlocks();
  }
  // ===========================================================================
  // DOM Binding
  // ===========================================================================
  bindDOM() {
    this.listEl = this.root.querySelector("[data-block-ide-list]"), this.searchInput = this.root.querySelector("[data-block-ide-search]"), this.categorySelect = this.root.querySelector("[data-block-ide-category-filter]"), this.countEl = this.root.querySelector("[data-block-ide-count]"), this.createBtn = this.root.querySelector("[data-block-ide-create]"), this.editorEl = this.root.querySelector("[data-block-ide-editor]"), this.paletteEl = this.root.querySelector("[data-block-ide-palette]"), this.sidebarEl = this.root.querySelector("[data-block-ide-sidebar]"), this.paletteAsideEl = this.root.querySelector("[data-block-ide-palette-aside]"), this.gridEl = this.root.querySelector("[data-block-ide-grid]"), this.addFieldBar = this.root.querySelector("[data-block-ide-add-field-bar]"), this.paletteTriggerBtn = this.root.querySelector("[data-block-ide-palette-trigger]"), this.sidebarToggleBtn = document.querySelector("[data-block-ide-sidebar-toggle]"), this.envSelectEl = document.querySelector("[data-block-ide-env]");
  }
  bindEvents() {
    this.searchInput?.addEventListener("input", () => {
      this.state.search = this.searchInput.value, this.renderBlockList();
    }), this.categorySelect?.addEventListener("change", () => {
      this.state.categoryFilter = this.categorySelect.value || null, this.renderBlockList();
    }), this.createBtn?.addEventListener("click", () => {
      this.showCreateForm();
    }), this.listEl?.addEventListener("click", (e) => {
      this.handleListClick(e);
    }), document.addEventListener("click", (e) => {
      if (this.activeMenu) {
        const t = e.target;
        !t.closest("[data-block-context-menu]") && !t.closest("[data-block-actions]") && this.closeContextMenu();
      }
    }), this.root.addEventListener("keydown", (e) => {
      e.key === "Escape" && (this.state.isCreating && this.cancelCreate(), this.state.renamingBlockId && this.cancelRename(), this.closeContextMenu());
    });
  }
  // ===========================================================================
  // Data Loading
  // ===========================================================================
  async loadBlocks() {
    this.state.isLoading = !0, this.state.error = null, this.renderBlockList();
    try {
      const e = await this.api.listBlockDefinitions();
      this.state.blocks = e.items.map((t) => this.normalizeBlockDefinition(t));
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Failed to load blocks";
    } finally {
      this.state.isLoading = !1, this.refreshCategoriesFromBlocks(), this.renderBlockList(), this.updateCount();
    }
  }
  async loadCategories() {
    this.state.categories = [], this.mergeCategories(Me), this.mergeCategories(this.loadUserCategories());
    try {
      const e = await this.api.getBlockCategories();
      this.mergeCategories(e);
    } catch {
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  refreshCategoriesFromBlocks() {
    this.state.categories.length === 0 && (this.mergeCategories(Me), this.mergeCategories(this.loadUserCategories()));
    const e = new Set(this.state.categories.map((t) => this.normalizeCategory(t)));
    this.state.categories = Array.from(e);
    for (const t of this.state.blocks) {
      const r = this.normalizeCategory(t.category || "");
      r && !e.has(r) && (e.add(r), this.state.categories.push(r));
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  normalizeCategory(e) {
    return e.trim().toLowerCase();
  }
  mergeCategories(e) {
    for (const t of e) {
      const r = this.normalizeCategory(t);
      r && (this.state.categories.includes(r) || this.state.categories.push(r));
    }
  }
  loadUserCategories() {
    try {
      const e = sessionStorage.getItem("block-library-user-categories");
      if (!e) return [];
      const t = JSON.parse(e);
      return Array.isArray(t) ? t.map((r) => this.normalizeCategory(r)).filter((r) => r.length > 0) : [];
    } catch {
      return [];
    }
  }
  persistUserCategories() {
    const e = this.state.categories.filter((t) => !Me.includes(t));
    try {
      sessionStorage.setItem("block-library-user-categories", JSON.stringify(e));
    } catch {
    }
  }
  addCategory(e) {
    const t = this.normalizeCategory(e);
    return t ? (this.state.categories.includes(t) || (this.state.categories.push(t), this.persistUserCategories(), this.renderCategoryOptions(), this.updateCreateCategorySelect(t), this.renderEditor()), t) : null;
  }
  updateCreateCategorySelect(e) {
    const t = this.listEl?.querySelector("[data-create-category]");
    if (!t) return;
    const r = e ?? t.value;
    t.innerHTML = this.state.categories.map((a) => `<option value="${M(a)}">${M(he(a))}</option>`).join(""), t.innerHTML += '<option value="__add__">Add category...</option>', r && this.state.categories.includes(r) && (t.value = r);
  }
  promptForCategory(e, t) {
    new ie({
      title: "Add Category",
      label: "Category name",
      placeholder: "e.g. marketing",
      confirmLabel: "Add",
      inputClass: p(),
      onConfirm: (a) => {
        const s = this.addCategory(a);
        if (s) {
          this.updateCreateCategorySelect(s), e.value = s, e.dataset.prevValue = s;
          return;
        }
        e.value = t;
      },
      onCancel: () => {
        e.value = t;
      }
    }).show();
  }
  // ===========================================================================
  // Rendering
  // ===========================================================================
  renderBlockList() {
    if (!this.listEl) return;
    if (this.state.isLoading) {
      this.listEl.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>`;
      return;
    }
    if (this.state.error) {
      this.listEl.innerHTML = `
        <div class="px-4 py-6 text-center">
          <p class="text-sm text-red-500">${M(this.state.error)}</p>
          <button type="button" data-block-ide-retry
                  class="mt-2 text-xs text-blue-600 hover:text-blue-700">
            Retry
          </button>
        </div>`;
      return;
    }
    const e = this.getFilteredBlocks();
    if (e.length === 0) {
      const r = this.state.search || this.state.categoryFilter;
      this.listEl.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">${r ? "No blocks match your filters." : "No blocks yet."}</p>
          ${r ? "" : '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "New Block" to create your first block definition.</p>'}
        </div>`;
      return;
    }
    let t = "";
    this.state.isCreating && (t += this.renderCreateForm()), t += '<ul class="p-2 space-y-0.5">';
    for (const r of e)
      t += this.renderBlockItem(r);
    if (t += "</ul>", this.listEl.innerHTML = t, this.state.isCreating) {
      const r = this.listEl.querySelector("[data-create-name]"), a = this.listEl.querySelector("[data-create-slug]"), s = this.listEl.querySelector("[data-create-category]");
      r?.focus(), r && a && (r.addEventListener("input", () => {
        a.dataset.userModified || (a.value = jr(r.value));
      }), a.addEventListener("input", () => {
        a.dataset.userModified = "true";
      })), s && (s.dataset.prevValue = s.value, s.addEventListener("change", () => {
        const i = s.value;
        if (i === "__add__") {
          const n = s.dataset.prevValue ?? "";
          this.promptForCategory(s, n);
          return;
        }
        s.dataset.prevValue = i;
      }));
    }
    if (this.state.renamingBlockId) {
      const r = this.listEl.querySelector("[data-rename-input]");
      r?.focus(), r?.select();
    }
  }
  renderBlockItem(e) {
    const t = e.id === this.state.selectedBlockId, r = e.id === this.state.renamingBlockId, a = this.state.dirtyBlocks.has(e.id), s = this.state.savingBlocks.has(e.id), i = this.state.saveErrors.get(e.id), n = e.slug || e.type || "", l = t ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" : "hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent", d = r ? `<input type="text" data-rename-input data-rename-block-id="${M(e.id)}"
               value="${M(e.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />` : `<span class="block font-medium text-gray-800 dark:text-gray-100 truncate text-[13px]">${M(e.name || "Untitled")}</span>`;
    let c = "";
    return i ? c = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Save failed: ${M(i)}"></span>` : s ? c = '<span class="flex-shrink-0 w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" title="Saving..."></span>' : a ? c = '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes"></span>' : c = Mr(e.status), `
      <li>
        <div data-block-id="${M(e.id)}"
             class="relative group w-full text-left px-3 py-2 text-sm rounded-lg border ${l} transition-colors flex items-center gap-2.5 cursor-pointer">
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            ${e.icon ? de(e.icon) : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>'}
          </span>
          <span class="flex-1 min-w-0">
            ${d}
            <span class="block text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">${M(n)}</span>
          </span>
          ${c}
          <button type="button" data-block-actions="${M(e.id)}"
                  class="flex-shrink-0 p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Actions">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>
        </div>
      </li>`;
  }
  renderCreateForm() {
    return `
      <div class="p-2 mb-1" data-block-create-form>
        <div class="p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 space-y-2">
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Name</label>
            <input type="text" data-create-name placeholder="e.g. Hero Section"
                   class="${p()}" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Slug</label>
            <input type="text" data-create-slug placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_\\-]*$"
                   class="${p()} font-mono" />
            <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Category</label>
            <select data-create-category
                    class="${D()}">
              ${this.state.categories.map((e) => `<option value="${M(e)}">${M(he(e))}</option>`).join("")}
              <option value="__add__">Add category...</option>
            </select>
          </div>
          <div data-create-error class="hidden text-xs text-red-600 dark:text-red-400"></div>
          <div class="flex items-center gap-2 pt-1">
            <button type="button" data-create-save
                    class="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Create
            </button>
            <button type="button" data-create-cancel
                    class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>`;
  }
  renderContextMenu(e, t) {
    this.closeContextMenu();
    const r = this.state.blocks.find((c) => c.id === e);
    if (!r) return;
    const a = document.createElement("div");
    a.setAttribute("data-block-context-menu", e), a.className = "absolute z-50 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm text-gray-700 dark:text-gray-300";
    const s = [
      { label: "Rename", action: "rename", icon: te.rename },
      { label: "Duplicate", action: "duplicate", icon: te.duplicate }
    ];
    r.status === "draft" ? s.push({ label: "Publish", action: "publish", icon: te.publish }) : r.status === "active" && s.push({ label: "Deprecate", action: "deprecate", icon: te.deprecate }), s.push({ label: "Delete", action: "delete", icon: te.delete, danger: !0 }), a.innerHTML = s.map(
      (c) => `
        <button type="button" data-menu-action="${c.action}" data-menu-block-id="${M(e)}"
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${c.danger ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : ""}">
          ${c.icon}
          <span>${c.label}</span>
        </button>`
    ).join("");
    const i = t.getBoundingClientRect(), n = 176;
    a.style.position = "fixed", a.style.top = `${i.bottom + 4}px`;
    let l = i.left;
    l + n > window.innerWidth - 8 && (l = window.innerWidth - n - 8), l < 8 && (l = 8), a.style.left = `${l}px`, document.body.appendChild(a);
    const d = a.getBoundingClientRect();
    d.bottom > window.innerHeight - 8 && (a.style.top = `${i.top - d.height - 4}px`), a.addEventListener("click", (c) => {
      const g = c.target.closest("[data-menu-action]");
      if (!g) return;
      const m = g.dataset.menuAction, h = g.dataset.menuBlockId;
      this.closeContextMenu(), this.handleAction(m, h);
    }), this.activeMenu = () => {
      a.remove(), this.activeMenu = null;
    };
  }
  closeContextMenu() {
    this.activeMenu && this.activeMenu();
  }
  renderCategoryOptions() {
    if (this.categorySelect) {
      this.categorySelect.innerHTML = '<option value="">All Categories</option>';
      for (const e of this.state.categories) {
        const t = document.createElement("option");
        t.value = e, t.textContent = he(e), e === this.state.categoryFilter && (t.selected = !0), this.categorySelect.appendChild(t);
      }
    }
  }
  updateCount() {
    this.countEl && (this.countEl.textContent = String(this.state.blocks.length));
  }
  updateBlockIndicator(e) {
    this.listEl?.querySelector(`[data-block-id="${e}"]`) && this.renderBlockList();
  }
  renderEditor() {
    if (!this.editorEl) return;
    const e = this.getSelectedBlock();
    if (!e) {
      this.editorPanel = null, this.editorEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg class="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm text-gray-400 dark:text-gray-500">Select a block from the list to edit</p>
          <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">or create a new block to get started</p>
        </div>`, this.palettePanel?.disable(), this.updateAddFieldBar();
      return;
    }
    this.editorPanel ? this.editorPanel.update(e) : (this.editorPanel = new Er({
      container: this.editorEl,
      block: e,
      categories: this.state.categories,
      api: this.api,
      onMetadataChange: (t, r) => this.handleEditorMetadataChange(t, r),
      onSchemaChange: (t, r) => this.handleEditorSchemaChange(t, r),
      onFieldDrop: (t) => this.handlePaletteAddField(t),
      onAddFieldClick: () => this.handleAddFieldClick(),
      onStatusChange: (t, r) => this.handleEditorStatusChange(t, r),
      onSave: (t) => this.saveBlock(t)
    }), this.editorPanel.render()), this.palettePanel?.enable(), this.updateAddFieldBar();
  }
  handleEditorMetadataChange(e, t) {
    const r = this.state.blocks.findIndex((i) => i.id === e);
    if (r < 0) return;
    const a = this.state.blocks[r], s = { ...a, ...t };
    if (t.slug !== void 0 && t.slug !== a.slug) {
      const i = (t.slug ?? "").trim();
      i && (!t.type && (!a.type || a.type === a.slug) && (s.type = i, t.type = i), s.schema && typeof s.schema == "object" && (s.schema = { ...s.schema, $id: i }));
    }
    this.state.blocks[r] = s, this.markDirty(e), (t.name !== void 0 || t.status !== void 0 || t.slug !== void 0 || t.type !== void 0) && this.updateBlockItemDOM(e, s), this.scheduleSave(e);
  }
  handleEditorSchemaChange(e, t) {
    const r = this.state.blocks.findIndex((n) => n.id === e);
    if (r < 0) return;
    const a = this.state.blocks[r].schema, s = this.state.blocks[r].slug || this.state.blocks[r].type;
    let i = at(t, s);
    i = this.mergeSchemaExtras(a, i), this.state.blocks[r] = {
      ...this.state.blocks[r],
      schema: i
    }, this.markDirty(e), this.scheduleSave(e);
  }
  /** Handle "+ Add Field" button click from the editor panel */
  handleAddFieldClick() {
    this.paletteEl && this.paletteEl.offsetParent !== null ? this.paletteEl.scrollIntoView({ behavior: "smooth", block: "nearest" }) : this.paletteTriggerBtn && this.openPalettePopover(this.paletteTriggerBtn);
  }
  /** Handle adding a field from the palette (Phase 9 — click or drop) */
  handlePaletteAddField(e) {
    if (!this.editorPanel || !this.state.selectedBlockId) return;
    const t = e.type === "blocks", r = t ? "Content Blocks" : e?.label ?? he(e.type), a = t ? "content_blocks" : e.type.replace(/-/g, "_"), s = new Set(this.editorPanel.getFields().map((d) => d.name));
    let i = a, n = 1;
    for (; s.has(i); )
      i = t ? `content_blocks_${n++}` : `${a}_${n++}`;
    const l = {
      id: Z(),
      name: i,
      type: e.type,
      label: n > 1 && t ? `Content Blocks ${n - 1}` : r,
      required: !1,
      ...e.defaultConfig ?? {}
    };
    this.editorPanel.addField(l), this.handleEditorSchemaChange(this.state.selectedBlockId, this.editorPanel.getFields());
  }
  // ===========================================================================
  // Filtering
  // ===========================================================================
  getFilteredBlocks() {
    let e = [...this.state.blocks];
    if (this.state.search) {
      const t = this.state.search.toLowerCase();
      e = e.filter(
        (r) => r.name.toLowerCase().includes(t) || r.type.toLowerCase().includes(t) || (r.slug?.toLowerCase().includes(t) ?? !1) || (r.description?.toLowerCase().includes(t) ?? !1)
      );
    }
    if (this.state.categoryFilter) {
      const t = this.state.categoryFilter.toLowerCase().trim();
      e = e.filter((r) => (r.category || "custom").toLowerCase().trim() === t);
    }
    return e;
  }
  // ===========================================================================
  // Event Handling
  // ===========================================================================
  handleListClick(e) {
    const t = e.target;
    if (t.closest("[data-block-ide-retry]")) {
      this.loadBlocks();
      return;
    }
    if (t.closest("[data-create-save]")) {
      this.handleCreateSave();
      return;
    }
    if (t.closest("[data-create-cancel]")) {
      this.cancelCreate();
      return;
    }
    const r = t.closest("[data-block-actions]");
    if (r) {
      e.stopPropagation();
      const i = r.dataset.blockActions;
      this.renderContextMenu(i, r);
      return;
    }
    if (t.closest("[data-rename-input]")) {
      e.stopPropagation();
      return;
    }
    const s = t.closest("[data-block-id]");
    if (s) {
      const i = s.dataset.blockId;
      this.selectBlock(i);
      return;
    }
  }
  handleAction(e, t) {
    switch (e) {
      case "rename":
        this.startRename(t);
        break;
      case "duplicate":
        this.duplicateBlock(t);
        break;
      case "publish":
        this.publishBlock(t);
        break;
      case "deprecate":
        this.deprecateBlock(t);
        break;
      case "delete":
        this.deleteBlock(t);
        break;
    }
  }
  // ===========================================================================
  // Create Block (Task 7.2)
  // ===========================================================================
  showCreateForm() {
    this.state.isCreating = !0, this.renderBlockList();
  }
  cancelCreate() {
    this.state.isCreating = !1, this.renderBlockList();
  }
  async handleCreateSave() {
    const e = this.listEl?.querySelector("[data-create-name]"), t = this.listEl?.querySelector("[data-create-slug]"), r = this.listEl?.querySelector("[data-create-category]"), a = this.listEl?.querySelector("[data-create-error]"), s = e?.value.trim() ?? "", i = t?.value.trim() ?? "";
    let n = r?.value ?? "custom";
    if (n === "__add__" && (n = "custom"), !s) {
      this.showCreateError(a, "Name is required."), e?.focus();
      return;
    }
    if (!i) {
      this.showCreateError(a, "Slug is required."), t?.focus();
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(i)) {
      this.showCreateError(a, "Slug must start with a letter and contain only lowercase, numbers, hyphens, underscores."), t?.focus();
      return;
    }
    const l = this.listEl?.querySelector("[data-create-save]");
    l && (l.disabled = !0, l.textContent = "Creating...");
    try {
      const d = await this.api.createBlockDefinition({
        name: s,
        slug: i,
        type: i,
        category: n,
        status: "draft",
        schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: {} }
      });
      d.slug || (d.slug = i), d.type || (d.type = d.slug || i);
      const c = this.normalizeBlockDefinition(d);
      this.state.isCreating = !1, this.state.blocks.unshift(c), this.state.selectedBlockId = c.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (d) {
      const c = d instanceof Te ? d.message : "Failed to create block.";
      this.showCreateError(a, c), l && (l.disabled = !1, l.textContent = "Create");
    }
  }
  showCreateError(e, t) {
    e && (e.textContent = t, e.classList.remove("hidden"));
  }
  // ===========================================================================
  // Rename Block (Task 7.3)
  // ===========================================================================
  startRename(e) {
    this.state.renamingBlockId = e, this.renderBlockList();
    const t = this.listEl?.querySelector("[data-rename-input]");
    t && (t.addEventListener("keydown", (r) => {
      r.key === "Enter" && (r.preventDefault(), this.commitRename(e, t.value.trim())), r.key === "Escape" && (r.preventDefault(), this.cancelRename());
    }), t.addEventListener("blur", () => {
      const r = this.state.blocks.find((a) => a.id === e);
      r && t.value.trim() && t.value.trim() !== r.name ? this.commitRename(e, t.value.trim()) : this.cancelRename();
    }));
  }
  async commitRename(e, t) {
    if (!t) {
      this.cancelRename();
      return;
    }
    const r = this.state.blocks.find((a) => a.id === e);
    if (!r || r.name === t) {
      this.cancelRename();
      return;
    }
    try {
      const a = await this.api.updateBlockDefinition(e, { name: t });
      this.updateBlockInState(e, a);
    } catch (a) {
      console.error("Rename failed:", a);
    } finally {
      this.state.renamingBlockId = null, this.renderBlockList();
    }
  }
  cancelRename() {
    this.state.renamingBlockId = null, this.renderBlockList();
  }
  // ===========================================================================
  // Duplicate Block (Task 7.3)
  // ===========================================================================
  async duplicateBlock(e) {
    const t = this.state.blocks.find((i) => i.id === e);
    if (!t) return;
    const a = `${(t.slug || t.type || "block").trim()}_copy`, s = a;
    try {
      const i = await this.api.cloneBlockDefinition(e, s, a), n = this.normalizeBlockDefinition(i);
      this.state.blocks.unshift(n), this.state.selectedBlockId = n.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (i) {
      console.error("Duplicate failed:", i), this.showToast(i instanceof Error ? i.message : "Failed to duplicate block.", "error");
    }
  }
  // ===========================================================================
  // Publish / Deprecate (Task 7.3)
  // ===========================================================================
  async publishBlock(e) {
    if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
      this.showToast("Please fix save errors before publishing.", "error");
      return;
    }
    try {
      const t = await this.api.publishBlockDefinition(e);
      if (this.updateBlockInState(e, t), this.renderBlockList(), this.showToast("Block published.", "success"), this.state.selectedBlockId === e && this.editorPanel) {
        const r = this.state.blocks.find((a) => a.id === e);
        r && this.editorPanel.update(r);
      }
    } catch (t) {
      console.error("Publish failed:", t), this.showToast(t instanceof Error ? t.message : "Failed to publish block.", "error");
    }
  }
  async deprecateBlock(e) {
    if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
      this.showToast("Please fix save errors before deprecating.", "error");
      return;
    }
    try {
      const t = await this.api.deprecateBlockDefinition(e);
      if (this.updateBlockInState(e, t), this.renderBlockList(), this.showToast("Block deprecated.", "info"), this.state.selectedBlockId === e && this.editorPanel) {
        const r = this.state.blocks.find((a) => a.id === e);
        r && this.editorPanel.update(r);
      }
    } catch (t) {
      console.error("Deprecate failed:", t), this.showToast(t instanceof Error ? t.message : "Failed to deprecate block.", "error");
    }
  }
  // ===========================================================================
  // Delete Block (Task 7.3)
  // ===========================================================================
  async deleteBlock(e) {
    const t = this.state.blocks.find((a) => a.id === e);
    if (!(!t || !await se.confirm(
      `Delete "${t.name}"? This cannot be undone.`,
      { title: "Delete Block", confirmText: "Delete", confirmVariant: "danger" }
    )))
      try {
        await this.api.deleteBlockDefinition(e), this.state.blocks = this.state.blocks.filter((a) => a.id !== e), this.state.dirtyBlocks.delete(e), this.state.savingBlocks.delete(e), this.state.saveErrors.delete(e), this.state.selectedBlockId === e && (this.state.selectedBlockId = null, this.renderEditor()), this.updateCount(), this.renderBlockList();
      } catch (a) {
        console.error("Delete failed:", a), this.showToast(a instanceof Error ? a.message : "Failed to delete block.", "error");
      }
  }
  // ===========================================================================
  // Helpers
  // ===========================================================================
  /** Update a single block item in the sidebar DOM without re-rendering the entire list */
  updateBlockItemDOM(e, t) {
    const r = this.listEl?.querySelector(`[data-block-id="${e}"]`);
    if (!r) return;
    const a = r.querySelector(".flex-1.min-w-0");
    if (!a) return;
    const s = a.querySelectorAll(":scope > span");
    s.length >= 1 && !this.state.renamingBlockId && (s[0].textContent = t.name || "Untitled"), s.length >= 2 && (s[1].textContent = t.slug || t.type || "");
  }
  updateBlockInState(e, t) {
    const r = this.state.blocks.findIndex((a) => a.id === e);
    if (r >= 0) {
      const a = this.state.blocks[r], s = this.mergeBlockDefinition(a, t);
      this.state.blocks[r] = s;
    }
  }
  normalizeBlockDefinition(e) {
    const t = { ...e }, r = (t.slug ?? "").trim(), a = (t.type ?? "").trim();
    return !r && a && (t.slug = a), !a && r && (t.type = r), t;
  }
  mergeBlockDefinition(e, t) {
    const r = { ...e, ...t };
    t.icon == null && e.icon && (r.icon = e.icon), t.description == null && e.description && (r.description = e.description), t.category == null && e.category && (r.category = e.category);
    const a = (t.slug ?? "").trim(), s = (t.type ?? "").trim();
    !a && e.slug && (r.slug = e.slug), !s && e.type && (r.type = e.type);
    const i = (r.slug ?? "").trim(), n = (r.type ?? "").trim();
    return !i && n && (r.slug = n), !n && i && (r.type = i), r;
  }
  mergeSchemaExtras(e, t) {
    if (!e || typeof e != "object")
      return t;
    const r = { ...t }, a = /* @__PURE__ */ new Set(["properties", "required", "type", "$schema"]);
    for (const [s, i] of Object.entries(e))
      if (!a.has(s)) {
        if (s === "$id") {
          !r.$id && i && (r.$id = i);
          continue;
        }
        s in r || (r[s] = i);
      }
    return r;
  }
  showToast(e, t = "info") {
    const a = window.notify?.[t];
    if (typeof a == "function") {
      a(e);
      return;
    }
    const s = this.root.querySelector("[data-ide-toast]");
    s && s.remove();
    const i = t === "error" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800" : t === "success" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800" : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800", n = document.createElement("div");
    n.setAttribute("data-ide-toast", ""), n.className = `fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg border text-sm font-medium shadow-lg ${i} transition-opacity`, n.textContent = e, document.body.appendChild(n), setTimeout(() => {
      n.style.opacity = "0", setTimeout(() => n.remove(), 300);
    }, 3e3);
  }
};
xe.AUTOSAVE_DELAY = 1500;
let He = xe;
function M(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function he(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function jr(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function Mr(o) {
  switch (o) {
    case "draft":
      return '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400" title="Draft"></span>';
    case "deprecated":
      return '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400" title="Deprecated"></span>';
    case "active":
    default:
      return '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400" title="Active"></span>';
  }
}
const te = {
  rename: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  duplicate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  publish: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  deprecate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>',
  delete: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'
};
function Tr(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-ide]")).forEach((t) => {
    if (t.dataset.ideInitialized !== "true")
      try {
        new He(t).init(), t.dataset.ideInitialized = "true";
      } catch (r) {
        console.error("Block Library IDE failed to initialize:", r);
      }
  });
}
function Fr(o = document) {
  Array.from(o.querySelectorAll("[data-content-type-editor-root]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = Ar(t);
    if (!r.apiBasePath) {
      console.warn("Content type editor missing apiBasePath", t);
      return;
    }
    const a = r.basePath ?? Ne(r.apiBasePath);
    r.onCancel || (r.onCancel = () => {
      window.location.href = `${a}/content/types`;
    }), r.onSave || (r.onSave = (s) => {
      const i = s.slug ?? s.id;
      i && (window.location.href = `${a}/content/types?slug=${encodeURIComponent(i)}`);
    });
    try {
      new fr(t, r).init(), t.dataset.initialized = "true";
    } catch (s) {
      console.error("Content type editor failed to initialize:", s), t.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${s instanceof Error ? s.message : "An unexpected error occurred while initializing the editor."}
          </p>
          <button
            type="button"
            onclick="window.location.reload()"
            class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
          >
            Reload page
          </button>
        </div>
      `;
    }
  });
}
function Ar(o) {
  let e = {};
  const t = o.getAttribute("data-content-type-editor-config");
  if (t)
    try {
      e = JSON.parse(t);
    } catch {
    }
  const r = Be(e.apiBasePath, o.dataset.apiBasePath, o.dataset.basePath), a = e.basePath ?? Ne(r, o.dataset.basePath);
  return {
    ...e,
    apiBasePath: r,
    basePath: a,
    contentTypeId: e.contentTypeId ?? o.dataset.contentTypeId,
    locale: e.locale ?? o.dataset.locale
  };
}
function Pr(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
Pr(() => {
  Fr(), Tr();
});
export {
  Er as BlockEditorPanel,
  He as BlockLibraryIDE,
  wr as BlockLibraryManager,
  K as ContentTypeAPIClient,
  Te as ContentTypeAPIError,
  fr as ContentTypeEditor,
  st as FIELD_CATEGORIES,
  we as FIELD_TYPES,
  ve as FieldConfigForm,
  _e as FieldPalettePanel,
  it as FieldTypePicker,
  Zt as LayoutEditor,
  ke as PALETTE_DRAG_MIME,
  ye as fieldsToSchema,
  Z as generateFieldId,
  Se as getFieldTypeMetadata,
  Hr as getFieldTypesByCategory,
  lt as getIconTabs,
  Tr as initBlockLibraryIDE,
  Br as initBlockLibraryManagers,
  Fr as initContentTypeEditors,
  zr as registerIconTab,
  de as resolveIcon,
  me as schemaToFields,
  Or as unregisterIconTab
};
//# sourceMappingURL=index.js.map
