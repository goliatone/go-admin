import { e as Ke, M as E } from "../chunks/error-helpers-Cqk77Doi.js";
import { b as P } from "../chunks/badge-CqKzZ9y5.js";
class se extends Error {
  constructor(e, t, a, r) {
    super(e), this.name = "ContentTypeAPIError", this.status = t, this.textCode = a, this.fields = r;
  }
}
class q {
  constructor(e) {
    this.environment = "", this.config = {
      basePath: e.basePath.replace(/\/$/, ""),
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
  /** Persist environment selection to the server session (Phase 12) */
  async setEnvironmentSession(e) {
    const t = `${this.config.basePath}/api/session/environment`;
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
    const a = t.toString(), r = `${this.config.basePath}/api/content_types${a ? `?${a}` : ""}`, i = await (await this.fetch(r, { method: "GET" })).json();
    return Array.isArray(i) ? { items: i, total: i.length } : i.items && Array.isArray(i.items) ? i : i.data && Array.isArray(i.data) ? { items: i.data, total: i.total ?? i.data.length } : { items: [], total: 0 };
  }
  /**
   * Get a single content type by ID or slug
   */
  async get(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}`, r = await (await this.fetch(t, { method: "GET" })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Create a new content type
   */
  async create(e) {
    const t = `${this.config.basePath}/api/content_types`, r = await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Update an existing content type
   */
  async update(e, t) {
    const a = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}`, s = await (await this.fetch(a, {
      method: "PUT",
      body: JSON.stringify(t)
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Delete a content type
   */
  async delete(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}`;
    await this.fetch(t, { method: "DELETE" });
  }
  // ===========================================================================
  // Content Type Lifecycle (Publish, Clone, Deprecate)
  // ===========================================================================
  /**
   * Publish a content type (change status to active)
   */
  async publish(e, t) {
    const a = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/publish`, s = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ force: t ?? !1 })
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Deprecate a content type
   */
  async deprecate(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/deprecate`, r = await (await this.fetch(t, { method: "POST" })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Clone a content type
   */
  async clone(e, t, a) {
    const r = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ slug: t, name: a })
    })).json();
    return i.item ?? i.data ?? i;
  }
  /**
   * Check compatibility between current schema and a new schema
   */
  async checkCompatibility(e, t, a) {
    const r = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/compatibility`;
    return await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ schema: t, ui_schema: a })
    })).json();
  }
  /**
   * Get content type schema version history
   */
  async getVersionHistory(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/versions`;
    try {
      const r = await (await this.fetch(t, { method: "GET" })).json();
      return { versions: r.versions ?? r.items ?? r ?? [] };
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
    const t = `${this.config.basePath}/api/content_types/validate`;
    return await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
  }
  /**
   * Generate a preview of the schema as a rendered form
   */
  async previewSchema(e) {
    const t = `${this.config.basePath}/api/content_types/preview`;
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
    const e = `${this.config.basePath}/api/block_definitions`;
    try {
      const a = await (await this.fetch(e, { method: "GET" })).json();
      return Array.isArray(a) ? a : a.items && Array.isArray(a.items) ? a.items : a.data && Array.isArray(a.data) ? a.data : [];
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
    const a = t.toString(), r = `${this.config.basePath}/api/block_definitions${a ? `?${a}` : ""}`;
    try {
      const i = await (await this.fetch(r, { method: "GET" })).json();
      return Array.isArray(i) ? { items: i, total: i.length } : i.items && Array.isArray(i.items) ? i : i.data && Array.isArray(i.data) ? { items: i.data, total: i.total ?? i.data.length } : { items: [], total: 0 };
    } catch {
      return { items: [], total: 0 };
    }
  }
  /**
   * Get a single block definition by ID or type
   */
  async getBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}`, r = await (await this.fetch(t, { method: "GET" })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Create a new block definition
   */
  async createBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions`, r = await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Update an existing block definition
   */
  async updateBlockDefinition(e, t) {
    const a = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}`, s = await (await this.fetch(a, {
      method: "PUT",
      body: JSON.stringify(t)
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Delete a block definition
   */
  async deleteBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}`;
    await this.fetch(t, { method: "DELETE" });
  }
  /**
   * Publish a block definition (change status to active)
   */
  async publishBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/publish`, r = await (await this.fetch(t, { method: "POST" })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Deprecate a block definition
   */
  async deprecateBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/deprecate`, r = await (await this.fetch(t, { method: "POST" })).json();
    return r.item ?? r.data ?? r;
  }
  /**
   * Clone a block definition
   */
  async cloneBlockDefinition(e, t, a) {
    const r = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ type: t, slug: a })
    })).json();
    return i.item ?? i.data ?? i;
  }
  /**
   * Get block definition schema version history
   */
  async getBlockDefinitionVersions(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/versions`;
    try {
      const r = await (await this.fetch(t, { method: "GET" })).json();
      return { versions: r.versions ?? r.items ?? r ?? [] };
    } catch {
      return { versions: [] };
    }
  }
  /**
   * Get block categories
   */
  async getBlockCategories() {
    const e = `${this.config.basePath}/api/block_definitions/categories`;
    try {
      const a = await (await this.fetch(e, { method: "GET" })).json();
      return Array.isArray(a) ? a : a.categories ?? [];
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
    const e = `${this.config.basePath}/api/block_definitions/field_types`;
    try {
      const a = await (await this.fetch(e, { method: "GET" })).json();
      return Array.isArray(a) ? a : a.items && Array.isArray(a.items) ? a.items : a.field_types && Array.isArray(a.field_types) ? a.field_types : null;
    } catch {
      return null;
    }
  }
  /**
   * Fetch grouped field types from the backend registry.
   * Returns null when the endpoint does not expose grouped categories.
   */
  async getBlockFieldTypeGroups() {
    const e = `${this.config.basePath}/api/block_definitions/field_types`;
    try {
      const a = await (await this.fetch(e, { method: "GET" })).json();
      return a && Array.isArray(a.categories) ? a.categories : null;
    } catch {
      return null;
    }
  }
  // ===========================================================================
  // Helpers
  // ===========================================================================
  async fetch(e, t) {
    const a = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers
    };
    if (this.environment) {
      a["X-Admin-Environment"] = this.environment;
      const s = e.includes("?") ? "&" : "?";
      e = `${e}${s}env=${encodeURIComponent(this.environment)}`;
    }
    const r = await fetch(e, {
      ...t,
      headers: a,
      credentials: this.config.credentials
    });
    return r.ok || await this.handleError(r), r;
  }
  async handleError(e) {
    let t = null;
    try {
      t = await e.clone().json();
    } catch {
    }
    const a = await Ke(e);
    let r = t?.text_code, s = t?.fields;
    if (t && typeof t.error == "object" && t.error) {
      const i = t.error;
      if (!r && typeof i.text_code == "string" && (r = i.text_code), !s) {
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
    throw new se(a, e.status, r, s);
  }
}
function H(o, e) {
  const t = {}, a = [];
  for (const s of o)
    t[s.name] = Je(s), s.required && a.push(s.name);
  const r = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: t
  };
  return e && (r.$id = e), a.length > 0 && (r.required = a), r;
}
function Se(o, e) {
  const t = H(o, e);
  if (!e)
    return t;
  t.properties = t.properties ?? {}, t.properties._type = { type: "string", const: e };
  const a = new Set(t.required ?? []);
  return a.add("_type"), t.required = Array.from(a), t;
}
function Je(o) {
  const e = {}, a = {
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
  e.type = a.type, a.format && (e.format = a.format), o.label && (e.title = o.label), o.description && (e.description = o.description), o.defaultValue !== void 0 && (e.default = o.defaultValue), o.validation && (o.validation.minLength !== void 0 && (e.minLength = o.validation.minLength), o.validation.maxLength !== void 0 && (e.maxLength = o.validation.maxLength), o.validation.min !== void 0 && (e.minimum = o.validation.min), o.validation.max !== void 0 && (e.maximum = o.validation.max), o.validation.pattern && (e.pattern = o.validation.pattern));
  const r = {}, s = Qe(o.type);
  switch (s && (r.widget = s), o.placeholder && (r.placeholder = o.placeholder), o.helpText && (r.helpText = o.helpText), o.section && (r.section = o.section), o.order !== void 0 && (r.order = o.order), o.gridSpan !== void 0 && (r.grid = { span: o.gridSpan }), o.readonly && (r.readonly = !0), o.hidden && (r.hidden = !0), Object.keys(r).length > 0 && (e["x-formgen"] = r), o.type) {
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
      o.config && "fields" in o.config && o.config.fields && (e.items = H(o.config.fields));
      break;
    case "blocks": {
      const i = o.config, n = {
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
      i?.allowedBlocks && i.allowedBlocks.length > 0 && (n.oneOf = i.allowedBlocks.map((d) => ({
        type: "object",
        properties: {
          _type: { const: d }
        },
        required: ["_type"]
      })), n["x-discriminator"] = "_type"), e.items = n, i?.minBlocks !== void 0 && (e.minItems = i.minBlocks), i?.maxBlocks !== void 0 && (e.maxItems = i.maxBlocks);
      const l = {
        ...r,
        widget: "block",
        sortable: !0
      };
      i?.allowedBlocks && (l.allowedBlocks = i.allowedBlocks), i?.deniedBlocks && (l.deniedBlocks = i.deniedBlocks), e["x-formgen"] = l;
      break;
    }
  }
  return e;
}
function Qe(o) {
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
function Q(o) {
  if (!o.properties)
    return [];
  const e = new Set(o.required ?? []), t = [];
  for (const [a, r] of Object.entries(o.properties))
    a === "_type" || a === "_schema" || t.push(Ye(a, r, e.has(a)));
  return t.sort((a, r) => (a.order ?? 999) - (r.order ?? 999)), t;
}
function Ye(o, e, t) {
  const a = e["x-formgen"], r = {
    id: z(),
    name: o,
    type: We(e),
    label: e.title ?? be(o),
    description: e.description,
    placeholder: a?.placeholder,
    helpText: a?.helpText,
    required: t,
    readonly: a?.readonly,
    hidden: a?.hidden,
    defaultValue: e.default,
    section: a?.section,
    gridSpan: a?.grid?.span,
    order: a?.order
  }, s = {};
  if (e.minLength !== void 0 && (s.minLength = e.minLength), e.maxLength !== void 0 && (s.maxLength = e.maxLength), e.minimum !== void 0 && (s.min = e.minimum), e.maximum !== void 0 && (s.max = e.maximum), e.pattern && (s.pattern = e.pattern), Object.keys(s).length > 0 && (r.validation = s), e.enum && Array.isArray(e.enum) && (r.config = {
    options: e.enum.map((i) => ({
      value: String(i),
      label: be(String(i))
    }))
  }), r.type === "blocks" && e.type === "array") {
    const i = {};
    if (e.minItems !== void 0 && (i.minBlocks = e.minItems), e.maxItems !== void 0 && (i.maxBlocks = e.maxItems), a?.allowedBlocks && Array.isArray(a.allowedBlocks))
      i.allowedBlocks = a.allowedBlocks;
    else if (e.items) {
      const n = e.items;
      if (n.oneOf && Array.isArray(n.oneOf)) {
        const l = n.oneOf.map((d) => d.properties?._type?.const).filter((d) => !!d);
        l.length > 0 && (i.allowedBlocks = l);
      }
    }
    a?.deniedBlocks && Array.isArray(a.deniedBlocks) && (i.deniedBlocks = a.deniedBlocks), Object.keys(i).length > 0 && (r.config = i);
  }
  return r;
}
function We(o) {
  const e = o["x-formgen"];
  if (e?.widget) {
    const a = {
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
    if (a[e.widget])
      return a[e.widget];
  }
  switch (Array.isArray(o.type) ? o.type[0] : o.type) {
    case "string":
      return o.format === "date-time" ? "datetime" : o.format === "date" ? "date" : o.format === "time" ? "time" : o.format === "uri" ? "media-picker" : o.format === "uuid" ? "reference" : o.enum ? "select" : "text";
    case "number":
      return "number";
    case "integer":
      return "integer";
    case "boolean":
      return "toggle";
    case "array":
      if (o.items) {
        const a = o.items;
        if (a.oneOf) return "blocks";
        if (a.enum) return "chips";
      }
      return "repeater";
    case "object":
      return "json";
    default:
      return "text";
  }
}
function z() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function be(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
const Ze = {
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
function Y(o) {
  return Ze[o] ?? "";
}
function D(o) {
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
function y(o) {
  return Y(o);
}
const X = [
  // Text Fields
  {
    type: "text",
    label: "Text",
    description: "Single line text input",
    icon: y("text"),
    category: "text",
    defaultConfig: { validation: { maxLength: 255 } }
  },
  {
    type: "textarea",
    label: "Textarea",
    description: "Multi-line text input",
    icon: y("textarea"),
    category: "text",
    defaultConfig: { config: { multiline: !0, rows: 4 } }
  },
  {
    type: "rich-text",
    label: "Rich Text",
    description: "WYSIWYG editor with formatting",
    icon: y("rich-text"),
    category: "text"
  },
  {
    type: "markdown",
    label: "Markdown",
    description: "Markdown text editor",
    icon: y("markdown"),
    category: "text"
  },
  {
    type: "code",
    label: "Code",
    description: "Code editor with syntax highlighting",
    icon: y("code"),
    category: "text",
    defaultConfig: { config: { language: "json", lineNumbers: !0 } }
  },
  // Number Fields
  {
    type: "number",
    label: "Number",
    description: "Decimal number input",
    icon: y("number"),
    category: "number"
  },
  {
    type: "integer",
    label: "Integer",
    description: "Whole number input",
    icon: y("integer"),
    category: "number"
  },
  {
    type: "currency",
    label: "Currency",
    description: "Money amount with currency symbol",
    icon: y("currency"),
    category: "number",
    defaultConfig: { config: { precision: 2, prefix: "$" } }
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "Percentage value (0-100)",
    icon: y("percentage"),
    category: "number",
    defaultConfig: { validation: { min: 0, max: 100 }, config: { suffix: "%" } }
  },
  // Selection Fields
  {
    type: "select",
    label: "Select",
    description: "Dropdown selection",
    icon: y("select"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "radio",
    label: "Radio",
    description: "Radio button selection",
    icon: y("radio"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "checkbox",
    label: "Checkbox",
    description: "Single checkbox (true/false)",
    icon: y("checkbox"),
    category: "selection"
  },
  {
    type: "chips",
    label: "Chips",
    description: "Tag-style multi-select",
    icon: y("chips"),
    category: "selection",
    defaultConfig: { config: { options: [], multiple: !0 } }
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "Boolean switch",
    icon: y("toggle"),
    category: "selection"
  },
  // Date/Time Fields
  {
    type: "date",
    label: "Date",
    description: "Date picker",
    icon: y("date"),
    category: "datetime"
  },
  {
    type: "time",
    label: "Time",
    description: "Time picker",
    icon: y("time"),
    category: "datetime"
  },
  {
    type: "datetime",
    label: "Date & Time",
    description: "Date and time picker",
    icon: y("datetime"),
    category: "datetime"
  },
  // Media Fields
  {
    type: "media-picker",
    label: "Media",
    description: "Single media asset picker",
    icon: y("media-picker"),
    category: "media",
    defaultConfig: { config: { accept: "image/*" } }
  },
  {
    type: "media-gallery",
    label: "Gallery",
    description: "Multiple media assets",
    icon: y("media-gallery"),
    category: "media",
    defaultConfig: { config: { accept: "image/*", multiple: !0 } }
  },
  {
    type: "file-upload",
    label: "File",
    description: "File attachment",
    icon: y("file-upload"),
    category: "media"
  },
  // Reference Fields
  {
    type: "reference",
    label: "Reference",
    description: "Link to another content type",
    icon: y("reference"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name" } }
  },
  {
    type: "references",
    label: "References",
    description: "Multiple links to another content type",
    icon: y("references"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name", multiple: !0 } }
  },
  {
    type: "user",
    label: "User",
    description: "User reference",
    icon: y("user"),
    category: "reference"
  },
  // Structural Fields
  {
    type: "group",
    label: "Group",
    description: "Collapsible field group",
    icon: y("group"),
    category: "structural"
  },
  {
    type: "repeater",
    label: "Repeater",
    description: "Repeatable field group",
    icon: y("repeater"),
    category: "structural",
    defaultConfig: { config: { fields: [], minItems: 0, maxItems: 10 } }
  },
  {
    type: "blocks",
    label: "Blocks",
    description: "Modular content blocks",
    icon: y("blocks"),
    category: "structural",
    defaultConfig: { config: { allowedBlocks: [] } }
  },
  // Advanced Fields
  {
    type: "json",
    label: "JSON",
    description: "Raw JSON editor",
    icon: y("json"),
    category: "advanced"
  },
  {
    type: "slug",
    label: "Slug",
    description: "URL-friendly identifier",
    icon: y("slug"),
    category: "advanced",
    defaultConfig: { validation: { pattern: "^[a-z0-9-]+$" } }
  },
  {
    type: "color",
    label: "Color",
    description: "Color picker",
    icon: y("color"),
    category: "advanced"
  },
  {
    type: "location",
    label: "Location",
    description: "Geographic coordinates",
    icon: y("location"),
    category: "advanced"
  }
], Ce = [
  { id: "text", label: "Text", icon: y("cat-text") },
  { id: "number", label: "Numbers", icon: y("cat-number") },
  { id: "selection", label: "Selection", icon: y("cat-selection") },
  { id: "datetime", label: "Date & Time", icon: y("cat-datetime") },
  { id: "media", label: "Media", icon: y("cat-media") },
  { id: "reference", label: "References", icon: y("cat-reference") },
  { id: "structural", label: "Structural", icon: y("cat-structural") },
  { id: "advanced", label: "Advanced", icon: y("cat-advanced") }
];
function ee(o) {
  const e = D(String(o));
  return X.find((t) => t.type === e);
}
function Nt(o) {
  return X.filter((e) => e.category === o);
}
class Be extends E {
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
    return Ce.map(
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
    let t = X.filter((a) => !e.has(a.type));
    if (this.searchQuery) {
      const a = this.searchQuery.toLowerCase();
      t = t.filter(
        (r) => r.label.toLowerCase().includes(a) || r.description.toLowerCase().includes(a) || r.type.toLowerCase().includes(a)
      );
    } else
      t = t.filter((a) => a.category === this.selectedCategory);
    return t.length === 0 ? `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm">No field types found</p>
        </div>
      ` : `
      <div class="grid grid-cols-2 gap-3">
        ${t.map((a) => this.renderFieldTypeCard(a)).join("")}
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
        const a = this.container?.querySelector("[data-field-type-search]");
        a && (a.value = ""), this.updateView();
      });
    }), this.container.addEventListener("click", (t) => {
      const a = t.target.closest("[data-field-type-select]");
      if (a) {
        const r = a.getAttribute("data-field-type-select");
        this.config.onSelect(r), this.hide();
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
    e && (e.innerHTML = this.renderCategories(), e.querySelectorAll("[data-field-category]").forEach((a) => {
      a.addEventListener("click", () => {
        this.selectedCategory = a.getAttribute("data-field-category"), this.searchQuery = "";
        const r = this.container?.querySelector("[data-field-type-search]");
        r && (r.value = ""), this.updateView();
      });
    }));
    const t = this.container.querySelector("[data-field-type-list]");
    t && (t.innerHTML = this.renderFieldTypes());
  }
}
const ve = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500", Ee = "px-3 py-2 text-sm border-gray-300", Le = "px-2 py-1 text-[12px] border-gray-200";
function h(o = "sm") {
  return o === "xs" ? `${ve} ${Le}` : `${ve} ${Ee}`;
}
function M(o = "sm") {
  const e = "w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white";
  return o === "xs" ? `${e} ${Le}` : `${e} ${Ee}`;
}
function he(o = {}) {
  const e = o.size ?? "sm", t = o.resize ?? "y", a = t === "none" ? "resize-none" : t === "x" ? "resize-x" : t === "both" ? "resize" : "resize-y";
  return `${h(e)} ${a}`;
}
function B() {
  return "w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500";
}
function g(o = "sm") {
  return o === "xs" ? "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" : "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
}
function Xe(o = "sm") {
  return `<svg class="${o === "xs" ? "w-3 h-3" : "w-4 h-4"}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
async function Me(o) {
  try {
    return await o.listBlockDefinitionsSummary();
  } catch {
    return [];
  }
}
function W(o) {
  return (o.slug || o.type || "").trim();
}
function ie(o, e) {
  if (o.size === 0 || e.length === 0) return new Set(o);
  const t = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set();
  for (const r of e) {
    const s = W(r);
    if (!s) continue;
    const i = o.has(s), n = o.has(r.type);
    (i || n) && (t.add(s), n && r.slug && r.slug !== r.type && a.add(r.type));
  }
  for (const r of o)
    a.has(r) || t.has(r) || t.add(r);
  return t;
}
function oe(o) {
  const { availableBlocks: e, selectedBlocks: t, searchQuery: a } = o, r = o.accent ?? "blue", s = o.label ?? "Allowed Blocks";
  if (e.length === 0)
    return `
      <div class="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
        No block definitions available.
      </div>`;
  const i = a ? e.filter((c) => {
    const v = a.toLowerCase();
    return c.name.toLowerCase().includes(v) || W(c).toLowerCase().includes(v) || (c.category ?? "").toLowerCase().includes(v);
  }) : e, n = /* @__PURE__ */ new Map();
  for (const c of i) {
    const v = c.category || "uncategorized";
    n.has(v) || n.set(v, []), n.get(v).push(c);
  }
  const l = t.size;
  let d = `
    <div class="space-y-2" data-block-picker-inline>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${A(s)}</span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500">${l} selected</span>
      </div>
      <div class="relative">
        <input type="text" data-block-picker-search
               placeholder="Search blocks..."
               value="${A(a ?? "")}"
               class="w-full px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-${r}-500" />
      </div>
      <div class="max-h-[200px] overflow-y-auto space-y-1" data-block-picker-list>`;
  if (i.length === 0)
    d += `
        <div class="text-center py-3 text-xs text-gray-400 dark:text-gray-500">No matching blocks</div>`;
  else
    for (const [c, v] of n) {
      n.size > 1 && (d += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">${A(tt(c))}</div>`);
      for (const k of v) {
        const u = W(k), f = t.has(u) || t.has(k.type);
        d += `
        <label class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${f ? `bg-${r}-50 dark:bg-${r}-900/20 border border-${r}-200 dark:border-${r}-700` : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"}">
          <input type="checkbox" value="${A(u)}" data-block-type="${A(k.type)}"
                 ${f ? "checked" : ""}
                 class="${B()}" />
          <div class="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
            ${k.icon || u.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[12px] font-medium text-gray-800 dark:text-gray-200">${A(k.name)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono ml-1">${A(u)}</span>
          </div>
        </label>`;
      }
    }
  return d += `
      </div>
    </div>`, d;
}
function et(o, e) {
  const t = o.querySelector("[data-block-picker-inline]");
  if (!t) return;
  const a = t.querySelector("[data-block-picker-search]");
  a?.addEventListener("input", () => {
    e.searchQuery = a.value;
    const s = t.querySelector("[data-block-picker-list]");
    if (s) {
      const i = { ...e, searchQuery: a.value }, n = document.createElement("div");
      n.innerHTML = oe(i);
      const l = n.querySelector("[data-block-picker-list]"), d = n.querySelector("[data-block-picker-inline] > div > span:last-child");
      l && (s.innerHTML = l.innerHTML, me(s, e));
      const c = t.querySelector(":scope > div > span:last-child");
      c && d && (c.textContent = d.textContent);
    }
  });
  const r = t.querySelector("[data-block-picker-list]");
  r && me(r, e);
}
function me(o, e) {
  o.querySelectorAll('input[type="checkbox"]').forEach((t) => {
    t.addEventListener("change", () => {
      const a = t.value, r = t.dataset.blockType;
      t.checked ? (e.selectedBlocks.add(a), r && r !== a && e.selectedBlocks.delete(r)) : (e.selectedBlocks.delete(a), r && e.selectedBlocks.delete(r)), e.onSelectionChange(e.selectedBlocks);
    });
  });
}
function A(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function tt(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
class ne extends E {
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
    const e = ee(this.field.type);
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
            <label class="${g()}">
              Field Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value="${b(this.field.name)}"
              placeholder="field_name"
              pattern="^[a-z][a-z0-9_]*$"
              required
              class="${h()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Lowercase letters, numbers, underscores. Starts with letter.</p>
          </div>

          <div>
            <label class="${g()}">
              Label <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="label"
              value="${b(this.field.label)}"
              placeholder="Field Label"
              required
              class="${h()}"
            />
          </div>
        </div>

        <div>
          <label class="${g()}">
            Description
          </label>
          <textarea
            name="description"
            rows="2"
            placeholder="Help text for editors"
            class="${he()}"
          >${b(this.field.description ?? "")}</textarea>
        </div>

        <div>
          <label class="${g()}">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${b(this.field.placeholder ?? "")}"
            placeholder="Placeholder text"
            class="${h()}"
          />
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="required"
              ${this.field.required ? "checked" : ""}
              class="${B()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="readonly"
              ${this.field.readonly ? "checked" : ""}
              class="${B()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Read-only</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="hidden"
              ${this.field.hidden ? "checked" : ""}
              class="${B()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Hidden</span>
          </label>
        </div>
      </div>
    `;
  }
  renderValidationSection() {
    const e = this.field.validation ?? {}, t = ["text", "textarea", "rich-text", "markdown", "code", "slug"].includes(
      this.field.type
    ), a = ["number", "integer", "currency", "percentage"].includes(this.field.type);
    return !t && !a ? "" : `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Validation</h3>

        <div class="grid grid-cols-2 gap-4">
          ${t ? `
            <div>
              <label class="${g()}">
                Min Length
              </label>
              <input
                type="number"
                name="minLength"
                value="${e.minLength ?? ""}"
                min="0"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Max Length
              </label>
              <input
                type="number"
                name="maxLength"
                value="${e.maxLength ?? ""}"
                min="0"
                class="${h()}"
              />
            </div>
          ` : ""}

          ${a ? `
            <div>
              <label class="${g()}">
                Minimum
              </label>
              <input
                type="number"
                name="min"
                value="${e.min ?? ""}"
                step="any"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Maximum
              </label>
              <input
                type="number"
                name="max"
                value="${e.max ?? ""}"
                step="any"
                class="${h()}"
              />
            </div>
          ` : ""}
        </div>

        ${t ? `
          <div>
            <label class="${g()}">
              Pattern (RegEx)
            </label>
            <input
              type="text"
              name="pattern"
              value="${b(e.pattern ?? "")}"
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
            <label class="${g()}">
              Section/Tab
            </label>
            <input
              type="text"
              name="section"
              value="${b(this.field.section ?? "")}"
              placeholder="main"
              class="${h()}"
            />
          </div>

          <div>
            <label class="${g()}">
              Grid Span (1-12)
            </label>
            <input
              type="number"
              name="gridSpan"
              value="${this.field.gridSpan ?? ""}"
              min="1"
              max="12"
              placeholder="12"
              class="${h()}"
            />
          </div>
        </div>
      </div>
    `;
  }
  renderTypeSpecificSection() {
    const e = [];
    if (["select", "radio", "chips"].includes(this.field.type)) {
      const a = this.field.config?.options ?? [];
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
            ${a.map(
        (r, s) => `
              <div class="flex items-center gap-2" data-option-row="${s}">
                <input
                  type="text"
                  name="option_value_${s}"
                  value="${b(String(r.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${s}"
                  value="${b(r.label)}"
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
              <label class="${g()}">
                Target Content Type
              </label>
              <input
                type="text"
                name="target"
                value="${b(t?.target ?? "")}"
                placeholder="users"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Display Field
              </label>
              <input
                type="text"
                name="displayField"
                value="${b(t?.displayField ?? "")}"
                placeholder="name"
                class="${h()}"
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
              <label class="${g()}">
                Accept Types
              </label>
              <input
                type="text"
                name="accept"
                value="${b(t?.accept ?? "")}"
                placeholder="image/*"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Max Size (MB)
              </label>
              <input
                type="number"
                name="maxSize"
                value="${t?.maxSize ?? ""}"
                min="0"
                placeholder="10"
                class="${h()}"
              />
            </div>
          </div>

          ${this.field.type === "media-gallery" ? `
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="multiple"
                ${t?.multiple !== !1 ? "checked" : ""}
                class="${B()}"
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
            <label class="${g()}">
              Language
            </label>
            <select
              name="language"
              class="${M()}"
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
              class="${B()}"
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
            <label class="${g()}">
              Source Field
            </label>
            <input
              type="text"
              name="sourceField"
              value="${b(t?.sourceField ?? "")}"
              placeholder="title"
              class="${h()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Field name to generate slug from (e.g., title)</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="${g()}">
                Prefix
              </label>
              <input
                type="text"
                name="slugPrefix"
                value="${b(t?.prefix ?? "")}"
                placeholder=""
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Suffix
              </label>
              <input
                type="text"
                name="slugSuffix"
                value="${b(t?.suffix ?? "")}"
                placeholder=""
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Separator
              </label>
              <select
                name="slugSeparator"
                class="${M()}"
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
              <label class="${g()}">
                Format
              </label>
              <select
                name="colorFormat"
                class="${M()}"
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
                  class="${B()}"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Allow transparency (alpha)</span>
              </label>
            </div>
          </div>

          <div>
            <label class="${g()}">
              Color Presets (comma-separated)
            </label>
            <input
              type="text"
              name="colorPresets"
              value="${b(t?.presets?.join(", ") ?? "")}"
              placeholder="#ff0000, #00ff00, #0000ff"
              class="${h()}"
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
              <label class="${g()}">
                Default Latitude
              </label>
              <input
                type="number"
                name="defaultLat"
                value="${t?.defaultCenter?.lat ?? ""}"
                step="any"
                placeholder="40.7128"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Default Longitude
              </label>
              <input
                type="number"
                name="defaultLng"
                value="${t?.defaultCenter?.lng ?? ""}"
                step="any"
                placeholder="-74.0060"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Default Zoom
              </label>
              <input
                type="number"
                name="defaultZoom"
                value="${t?.defaultZoom ?? ""}"
                min="1"
                max="20"
                placeholder="12"
                class="${h()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="searchEnabled"
              ${t?.searchEnabled !== !1 ? "checked" : ""}
              class="${B()}"
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
              <label class="${g()}">
                Min Date
              </label>
              <input
                type="date"
                name="minDate"
                value="${b(t?.minDate ?? "")}"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Max Date
              </label>
              <input
                type="date"
                name="maxDate"
                value="${b(t?.maxDate ?? "")}"
                class="${h()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowSameDay"
              ${t?.allowSameDay !== !1 ? "checked" : ""}
              class="${B()}"
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
              <label class="${g()}">
                Min Items
              </label>
              <input
                type="number"
                name="minItems"
                value="${t?.minItems ?? ""}"
                min="0"
                placeholder="0"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Max Items
              </label>
              <input
                type="number"
                name="maxItems"
                value="${t?.maxItems ?? ""}"
                min="1"
                placeholder="10"
                class="${h()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="collapsed"
              ${t?.collapsed ? "checked" : ""}
              class="${B()}"
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
      const t = this.field.config, a = t?.allowedBlocks ? JSON.stringify(t.allowedBlocks) : "[]", r = t?.deniedBlocks ? JSON.stringify(t.deniedBlocks) : "[]";
      e.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Blocks Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${g()}">
                Min Blocks
              </label>
              <input
                type="number"
                name="minBlocks"
                value="${t?.minBlocks ?? ""}"
                min="0"
                placeholder="0"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Max Blocks
              </label>
              <input
                type="number"
                name="maxBlocks"
                value="${t?.maxBlocks ?? ""}"
                min="1"
                placeholder="No limit"
                class="${h()}"
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
        (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${b(s)}">${b(s)}<button type="button" data-remove-allowed="${b(s)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'}
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${b(a)}' />
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
        (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${b(s)}">${b(s)}<button type="button" data-remove-denied="${b(s)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'}
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${b(r)}' />
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
    }), this.container.querySelector("[data-field-config-form-element]")?.addEventListener("submit", (a) => {
      a.preventDefault(), this.handleSave();
    });
    const e = this.container.querySelector('input[name="name"]'), t = this.container.querySelector('input[name="label"]');
    e && t && this.isNewField && (t.addEventListener("input", () => {
      e.dataset.userModified || (e.value = at(t.value));
    }), e.addEventListener("input", () => {
      e.dataset.userModified = "true";
    })), this.bindOptionsEvents(), this.bindBlockPickerEvents();
  }
  bindOptionsEvents() {
    this.container && (this.container.querySelector("[data-add-option]")?.addEventListener("click", () => {
      const e = this.container?.querySelector("[data-options-list]");
      if (!e) return;
      const t = e.querySelectorAll("[data-option-row]").length, a = document.createElement("div");
      a.className = "flex items-center gap-2", a.setAttribute("data-option-row", String(t)), a.innerHTML = `
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
      `, e.appendChild(a), a.querySelector("[data-remove-option]")?.addEventListener("click", () => {
        a.remove();
      }), a.querySelector(`input[name="option_value_${t}"]`)?.focus();
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
        const a = e.getAttribute("data-remove-allowed");
        a && this.removeBlockFromList("allowed", a);
      });
    }), this.container.querySelectorAll("[data-remove-denied]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.preventDefault();
        const a = e.getAttribute("data-remove-denied");
        a && this.removeBlockFromList("denied", a);
      });
    }));
  }
  async showBlockPicker(e) {
    const t = this.container?.querySelector(`input[name="${e}Blocks"]`), a = t?.value ? JSON.parse(t.value) : [];
    new rt({
      apiBasePath: this.config.apiBasePath ?? "/admin",
      selectedBlocks: a,
      title: e === "allowed" ? "Select Allowed Blocks" : "Select Denied Blocks",
      onSelect: (s) => {
        this.updateBlockList(e, s);
      }
    }).show();
  }
  updateBlockList(e, t) {
    const a = this.container?.querySelector(`input[name="${e}Blocks"]`), r = this.container?.querySelector(`[data-${e}-blocks-chips]`);
    if (!(!a || !r))
      if (a.value = JSON.stringify(t), t.length === 0) {
        const s = e === "allowed" ? "All blocks allowed (no restrictions)" : "No blocks denied";
        r.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500">${s}</span>`;
      } else {
        const s = e === "allowed" ? "blue" : "red";
        r.innerHTML = t.map(
          (i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${s}-100 text-${s}-700 dark:bg-${s}-900/30 dark:text-${s}-400" data-block-chip="${b(i)}">${b(i)}<button type="button" data-remove-${e}="${b(i)}" class="hover:text-${s}-900 dark:hover:text-${s}-200">&times;</button></span>`
        ).join(""), r.querySelectorAll(`[data-remove-${e}]`).forEach((i) => {
          i.addEventListener("click", (n) => {
            n.preventDefault();
            const l = i.getAttribute(`data-remove-${e}`);
            l && this.removeBlockFromList(e, l);
          });
        });
      }
  }
  removeBlockFromList(e, t) {
    const a = this.container?.querySelector(`input[name="${e}Blocks"]`);
    if (!a) return;
    const s = (a.value ? JSON.parse(a.value) : []).filter((i) => i !== t);
    this.updateBlockList(e, s);
  }
  handleSave() {
    const e = this.container?.querySelector("[data-field-config-form-element]");
    if (!e) return;
    const t = new FormData(e), a = t.get("name")?.trim();
    if (!a) {
      this.showError("name", "Field name is required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(a)) {
      this.showError("name", "Invalid field name format");
      return;
    }
    const r = this.config.existingFieldNames ?? [], s = this.config.field.name;
    if (a !== s && r.includes(a)) {
      this.showError("name", "A field with this name already exists");
      return;
    }
    const i = t.get("label")?.trim();
    if (!i) {
      this.showError("label", "Label is required");
      return;
    }
    const n = {
      id: this.field.id || z(),
      name: a,
      type: this.field.type,
      label: i,
      description: t.get("description")?.trim() || void 0,
      placeholder: t.get("placeholder")?.trim() || void 0,
      required: t.get("required") === "on",
      readonly: t.get("readonly") === "on",
      hidden: t.get("hidden") === "on",
      section: t.get("section")?.trim() || void 0,
      gridSpan: t.get("gridSpan") ? parseInt(t.get("gridSpan"), 10) : void 0
    }, l = {}, d = t.get("minLength");
    d !== null && d !== "" && (l.minLength = parseInt(d, 10));
    const c = t.get("maxLength");
    c !== null && c !== "" && (l.maxLength = parseInt(c, 10));
    const v = t.get("min");
    v !== null && v !== "" && (l.min = parseFloat(v));
    const k = t.get("max");
    k !== null && k !== "" && (l.max = parseFloat(k));
    const u = t.get("pattern");
    u && u.trim() && (l.pattern = u.trim()), Object.keys(l).length > 0 && (n.validation = l);
    const f = this.buildTypeSpecificConfig(t);
    f && Object.keys(f).length > 0 && (n.config = f), this.config.onSave(n), this.hide();
  }
  buildTypeSpecificConfig(e) {
    switch (this.field.type) {
      case "select":
      case "radio":
      case "chips": {
        const t = [];
        let a = 0;
        for (; e.has(`option_value_${a}`); ) {
          const r = e.get(`option_value_${a}`)?.trim(), s = e.get(`option_label_${a}`)?.trim();
          r && t.push({ value: r, label: s || r }), a++;
        }
        return t.length > 0 ? { options: t } : void 0;
      }
      case "reference":
      case "references":
      case "user": {
        const t = e.get("target")?.trim(), a = e.get("displayField")?.trim();
        return t ? { target: t, displayField: a || void 0 } : void 0;
      }
      case "media-picker":
      case "media-gallery":
      case "file-upload": {
        const t = e.get("accept")?.trim(), a = e.get("maxSize") ? parseInt(e.get("maxSize"), 10) : void 0, r = e.get("multiple") === "on";
        return {
          accept: t || void 0,
          maxSize: a,
          multiple: this.field.type === "media-gallery" ? r : void 0
        };
      }
      case "code": {
        const t = e.get("language")?.trim() || "json", a = e.get("lineNumbers") === "on";
        return { language: t, lineNumbers: a };
      }
      case "slug": {
        const t = e.get("sourceField")?.trim(), a = e.get("slugPrefix")?.trim(), r = e.get("slugSuffix")?.trim(), s = e.get("slugSeparator")?.trim() || "-";
        return {
          sourceField: t || void 0,
          prefix: a || void 0,
          suffix: r || void 0,
          separator: s
        };
      }
      case "color": {
        const t = e.get("colorFormat")?.trim() || "hex", a = e.get("allowAlpha") === "on", r = e.get("colorPresets")?.trim(), s = r ? r.split(",").map((i) => i.trim()).filter(Boolean) : void 0;
        return {
          format: t,
          allowAlpha: a,
          presets: s
        };
      }
      case "location": {
        const t = e.get("defaultLat"), a = e.get("defaultLng"), r = e.get("defaultZoom"), i = { searchEnabled: e.get("searchEnabled") === "on" };
        return t && a && (i.defaultCenter = {
          lat: parseFloat(t),
          lng: parseFloat(a)
        }), r && (i.defaultZoom = parseInt(r, 10)), i;
      }
      case "daterange": {
        const t = e.get("minDate")?.trim(), a = e.get("maxDate")?.trim(), r = e.get("allowSameDay") === "on";
        return {
          minDate: t || void 0,
          maxDate: a || void 0,
          allowSameDay: r
        };
      }
      case "repeater": {
        const t = e.get("minItems"), a = e.get("maxItems"), r = e.get("collapsed") === "on";
        return {
          fields: this.field.config?.fields ?? [],
          minItems: t ? parseInt(t, 10) : void 0,
          maxItems: a ? parseInt(a, 10) : void 0,
          collapsed: r
        };
      }
      case "blocks": {
        const t = e.get("minBlocks"), a = e.get("maxBlocks"), r = e.get("allowedBlocks")?.trim(), s = e.get("deniedBlocks")?.trim();
        let i, n;
        if (r)
          try {
            const l = JSON.parse(r);
            i = Array.isArray(l) && l.length > 0 ? l : void 0;
          } catch {
            i = r.split(",").map((l) => l.trim()).filter(Boolean), i.length === 0 && (i = void 0);
          }
        if (s)
          try {
            const l = JSON.parse(s);
            n = Array.isArray(l) && l.length > 0 ? l : void 0;
          } catch {
            n = s.split(",").map((l) => l.trim()).filter(Boolean), n.length === 0 && (n = void 0);
          }
        return {
          minBlocks: t ? parseInt(t, 10) : void 0,
          maxBlocks: a ? parseInt(a, 10) : void 0,
          allowedBlocks: i,
          deniedBlocks: n
        };
      }
      default:
        return;
    }
  }
  showError(e, t) {
    const a = this.container?.querySelector(`[name="${e}"]`);
    if (!a) return;
    a.classList.add("border-red-500", "focus:ring-red-500"), a.focus(), a.parentElement?.querySelector(".field-error")?.remove();
    const s = document.createElement("p");
    s.className = "field-error text-xs text-red-500 mt-1", s.textContent = t, a.parentElement?.appendChild(s);
    const i = () => {
      a.classList.remove("border-red-500", "focus:ring-red-500"), s.remove(), a.removeEventListener("input", i);
    };
    a.addEventListener("input", i);
  }
}
function b(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function at(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[0-9]/, "_$&");
}
class rt extends E {
  constructor(e) {
    super({ size: "lg", maxHeight: "max-h-[70vh]" }), this.availableBlocks = [], this.config = e, this.api = new q({ basePath: e.apiBasePath }), this.selectedBlocks = new Set(e.selectedBlocks);
  }
  async onAfterShow() {
    await this.loadBlocks();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${b(this.config.title)}</h3>
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
    const e = this.container?.querySelector("[data-blocks-loading]"), t = this.container?.querySelector("[data-blocks-list]"), a = this.container?.querySelector("[data-blocks-empty]");
    try {
      this.availableBlocks = await Me(this.api), this.selectedBlocks = ie(this.selectedBlocks, this.availableBlocks), e?.classList.add("hidden"), this.availableBlocks.length === 0 ? a?.classList.remove("hidden") : (t?.classList.remove("hidden"), this.renderBlocksList());
    } catch {
      e?.classList.add("hidden"), a?.classList.remove("hidden");
      const r = a?.querySelector("span") || a;
      r && (r.textContent = "Failed to load block definitions");
    }
  }
  renderBlocksList() {
    const e = this.container?.querySelector("[data-blocks-list]");
    e && (e.innerHTML = this.availableBlocks.map((t) => {
      const a = W(t), r = this.selectedBlocks.has(a) || this.selectedBlocks.has(t.type);
      return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${r ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
            <input
              type="checkbox"
              value="${b(a)}"
              data-block-type="${b(t.type)}"
              ${r ? "checked" : ""}
              class="${B()}"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${t.icon || a.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${b(t.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${b(a)}</div>
            </div>
            ${t.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${b(t.schema_version)}</span>` : ""}
          </label>
        `;
    }).join(""), e.querySelectorAll('input[type="checkbox"]').forEach((t) => {
      t.addEventListener("change", () => {
        const a = t.value, r = t.dataset.blockType;
        t.checked ? (this.selectedBlocks.add(a), r && r !== a && this.selectedBlocks.delete(r)) : (this.selectedBlocks.delete(a), r && this.selectedBlocks.delete(r)), this.updateSelectionCount(), this.renderBlocksList();
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
class st extends E {
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
          ` : e.map((a, r) => this.renderTabRow(a, r)).join("")}
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
            value="${R(e.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${t}"
            value="${R(e.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="tab_icon_${t}"
            value="${R(e.icon ?? "")}"
            placeholder="icon-name"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
    const e = this.layout.tabs ?? [], t = this.layout.type === "tabs" ? "tab" : "section", a = /* @__PURE__ */ new Map();
    a.set("", []);
    for (const r of e)
      a.set(r.id, []);
    for (const r of this.config.fields) {
      const s = r.section ?? "";
      a.has(s) || a.set(s, []), a.get(s).push(r);
    }
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Field Assignment</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Fields are assigned to ${t}s via the "Section/Tab" setting in each field's configuration.
        </p>

        <div class="grid grid-cols-2 gap-4">
          ${Array.from(a.entries()).map(
      ([r, s]) => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${r || "(Unassigned)"}
              </div>
              <div class="space-y-1">
                ${s.length === 0 ? '<div class="text-xs text-gray-400">No fields</div>' : s.map((i) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${R(i.label)} <span class="font-mono">(${R(i.name)})</span></div>`).join("")}
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
        const a = t.getAttribute("data-remove-tab");
        a && this.removeTab(a);
      });
    }), this.container.querySelectorAll('input[name^="tab_id_"]').forEach((t) => {
      t.addEventListener("input", () => {
        this.updateTabsFromForm();
      });
    });
    const e = this.container.querySelector("[data-tabs-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const r = t.target.closest("[data-tab-row]");
      r && (this.dragState = {
        tabId: r.getAttribute("data-tab-row") ?? "",
        startIndex: parseInt(r.getAttribute("data-tab-index") ?? "0", 10)
      }, r.classList.add("opacity-50"));
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), !this.dragState) return;
      const r = t.target.closest("[data-tab-row]");
      if (!r) return;
      const s = parseInt(r.getAttribute("data-tab-index") ?? "0", 10);
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
    const a = this.layout.tabs.findIndex((s) => s.id === e);
    if (a === -1 || a === t) return;
    const r = this.layout.tabs.splice(a, 1)[0];
    this.layout.tabs.splice(t, 0, r), this.layout.tabs.forEach((s, i) => {
      s.order = i;
    }), this.updateView();
  }
  updateTabsFromForm() {
    !this.container || !this.layout.tabs || this.layout.tabs.forEach((e, t) => {
      const a = this.container.querySelector(`input[name="tab_id_${t}"]`), r = this.container.querySelector(`input[name="tab_label_${t}"]`), s = this.container.querySelector(`input[name="tab_icon_${t}"]`);
      a && (e.id = a.value.trim()), r && (e.label = r.value.trim()), s && (e.icon = s.value.trim() || void 0);
    });
  }
  updateView() {
    if (!this.container) return;
    const e = this.container.querySelector(".overflow-y-auto");
    e && (e.innerHTML = `
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      `, this.container.querySelectorAll("[data-layout-type]").forEach((t) => {
      t.addEventListener("click", () => {
        const a = t.getAttribute("data-layout-type");
        this.layout.type = a, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (t) => {
      const a = t.target.value;
      this.layout.gridColumns = parseInt(a, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  handleSave() {
    if (this.updateTabsFromForm(), this.layout.tabs && this.layout.tabs.length > 0) {
      const e = /* @__PURE__ */ new Set();
      for (const t of this.layout.tabs) {
        if (!t.id.trim()) {
          alert("All tabs must have an ID");
          return;
        }
        if (e.has(t.id)) {
          alert(`Duplicate tab ID: ${t.id}`);
          return;
        }
        e.add(t.id);
      }
    }
    this.config.onSave(this.layout), this.hide();
  }
}
function R(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
const it = {
  text: "text",
  media: "media",
  choice: "selection",
  number: "number",
  datetime: "datetime",
  relationship: "reference",
  structure: "structural",
  advanced: "advanced"
}, ot = {
  text: "cat-text",
  media: "cat-media",
  choice: "cat-selection",
  number: "cat-number",
  datetime: "cat-datetime",
  relationship: "cat-reference",
  structure: "cat-structural",
  advanced: "cat-advanced"
};
function nt(o) {
  const e = (o ?? "").trim().toLowerCase();
  return it[e] ?? "advanced";
}
function lt(o, e) {
  const t = (o ?? "").trim();
  if (t) return t;
  const a = (e ?? "").trim();
  return a ? Fe(a) : "Advanced";
}
function dt(o) {
  const e = (o ?? "").trim().toLowerCase(), t = ot[e] ?? "cat-advanced";
  return Y(t);
}
function ct(o) {
  const e = o.defaults;
  return !e || typeof e != "object" ? void 0 : e;
}
function pt(o, e) {
  const t = (o.type ?? "text").trim().toLowerCase(), a = t === "text" ? "textarea" : D(t), r = (o.label ?? "").trim() || Fe(o.type ?? a), s = (o.description ?? "").trim(), i = Y(o.icon ?? "") || Y(a) || "", n = ct(o), l = {
    type: a,
    label: r,
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
function Te(o) {
  const e = [], t = [];
  for (const a of o) {
    const r = a.category ?? {}, s = (r.id ?? "").trim().toLowerCase(), i = nt(s);
    e.push({
      id: i,
      label: lt(r.label, s),
      icon: dt(s),
      collapsed: r.collapsed
    });
    const n = Array.isArray(a.field_types) ? a.field_types : [];
    for (const l of n)
      t.push(pt(l, i));
  }
  return { categories: e, fieldTypes: t };
}
const ht = Te([
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
function Fe(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function ut() {
  const o = /* @__PURE__ */ new Map();
  for (const t of X)
    o.set(t.type, t);
  for (const t of ht.fieldTypes)
    o.has(t.type) || o.set(t.type, t);
  return {
    categories: Ce.map((t) => ({
      id: t.id,
      label: t.label,
      icon: t.icon
    })),
    fieldTypes: Array.from(o.values())
  };
}
const J = ut();
async function gt(o) {
  try {
    const e = await o.getBlockFieldTypeGroups();
    if (e && e.length > 0) {
      const t = Te(e);
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
        categories: [...J.categories],
        fieldTypes: e
      };
  } catch {
  }
  return {
    categories: [...J.categories],
    fieldTypes: [...J.fieldTypes]
  };
}
const yt = /* @__PURE__ */ new Set(["advanced"]), le = "application/x-field-palette-type", je = "application/x-field-palette-meta";
class de {
  constructor(e) {
    this.fieldTypes = [], this.fieldTypeByKey = /* @__PURE__ */ new Map(), this.fieldTypeKeyByRef = /* @__PURE__ */ new Map(), this.categoryOrder = [], this.searchQuery = "", this.categoryStates = /* @__PURE__ */ new Map(), this.isLoading = !0, this.enabled = !1, this.config = e, this.categoryOrder = [...J.categories];
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
    const e = await gt(this.config.api);
    this.fieldTypes = e.fieldTypes, this.categoryOrder = e.categories, this.initCategoryStates(), this.buildFieldTypeKeyMap();
  }
  initCategoryStates() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.categoryOrder)
      e.add(t.id);
    for (const t of e)
      this.categoryStates.has(t) || this.categoryStates.set(t, {
        collapsed: yt.has(t)
      });
    for (const t of this.categoryOrder) {
      const a = this.categoryStates.get(t.id) ?? { collapsed: !1 };
      t.collapsed !== void 0 && (a.collapsed = t.collapsed), this.categoryStates.set(t.id, a);
    }
  }
  buildFieldTypeKeyMap() {
    this.fieldTypeByKey.clear(), this.fieldTypeKeyByRef.clear(), this.fieldTypes.forEach((e, t) => {
      const a = `${e.type}:${t}`;
      this.fieldTypeByKey.set(a, e), this.fieldTypeKeyByRef.set(e, a);
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
               value="${L(this.searchQuery)}"
               class="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-700 transition-colors" />
      </div>`, e.appendChild(t);
    const a = document.createElement("div");
    a.className = "overflow-y-auto flex-1 min-h-0", a.setAttribute("data-palette-list", ""), this.searchQuery ? a.innerHTML = this.renderSearchResults() : a.innerHTML = this.renderCategoryGroups(), e.appendChild(a), this.bindEvents(e);
  }
  // ===========================================================================
  // Rendering – Category Groups (Task 9.2)
  // ===========================================================================
  renderCategoryGroups() {
    let e = "";
    for (const t of this.categoryOrder) {
      const a = this.fieldTypes.filter((i) => i.category === t.id);
      if (a.length === 0) continue;
      const s = this.categoryStates.get(t.id)?.collapsed ?? !1;
      e += `
        <div data-palette-category="${L(t.id)}" class="border-b border-gray-50 dark:border-gray-800">
          <button type="button" data-palette-toggle="${L(t.id)}"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3 h-3 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-palette-chevron="${L(t.id)}">
              ${s ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 dark:text-gray-500">${t.icon}</span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex-1">${L(t.label)}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">${a.length}</span>
          </button>
          <div class="${s ? "hidden" : ""}" data-palette-category-body="${L(t.id)}">
            <div class="px-2 pb-2 space-y-0.5">
              ${a.map((i) => this.renderPaletteItem(i)).join("")}
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
      (a) => a.label.toLowerCase().includes(e) || (a.description ?? "").toLowerCase().includes(e) || a.type.toLowerCase().includes(e)
    );
    return t.length === 0 ? `
        <div class="px-4 py-8 text-center">
          <svg class="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-gray-400 dark:text-gray-500">No fields match "${L(this.searchQuery)}"</p>
        </div>` : `
      <div class="px-2 py-2 space-y-0.5">
        ${t.map((a) => this.renderPaletteItem(a)).join("")}
      </div>`;
  }
  // ===========================================================================
  // Rendering – Single Palette Item (Tasks 9.1 + 9.3)
  // ===========================================================================
  renderPaletteItem(e) {
    const t = this.fieldTypeKeyByRef.get(e) ?? e.type;
    return `
      <div data-palette-item="${L(t)}"
           draggable="true"
           class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-blue-50 dark:hover:bg-blue-900/20 active:cursor-grabbing transition-colors group select-none"
           title="${L(e.description)}">
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
          <span class="block text-[12px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">${L(e.label)}</span>
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
      const r = e.querySelector("[data-palette-list]");
      r && (r.innerHTML = this.searchQuery ? this.renderSearchResults() : this.renderCategoryGroups(), this.bindListEvents(r));
    });
    const a = e.querySelector("[data-palette-list]");
    a && this.bindListEvents(a);
  }
  bindListEvents(e) {
    e.querySelectorAll("[data-palette-toggle]").forEach((t) => {
      t.addEventListener("click", () => {
        const a = t.dataset.paletteToggle, r = this.categoryStates.get(a) ?? { collapsed: !1 };
        r.collapsed = !r.collapsed, this.categoryStates.set(a, r);
        const s = e.querySelector(`[data-palette-category-body="${a}"]`), i = e.querySelector(`[data-palette-chevron="${a}"]`);
        s && s.classList.toggle("hidden", r.collapsed), i && (i.innerHTML = r.collapsed ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      });
    }), e.querySelectorAll("[data-palette-item]").forEach((t) => {
      t.addEventListener("click", (a) => {
        if (a.detail === 0) return;
        const r = t.dataset.paletteItem, s = this.fieldTypeByKey.get(r) ?? this.fieldTypes.find((i) => i.type === r);
        s && this.config.onAddField(s);
      });
    }), e.querySelectorAll("[data-palette-item]").forEach((t) => {
      t.addEventListener("dragstart", (a) => {
        const r = t.dataset.paletteItem;
        a.dataTransfer.effectAllowed = "copy";
        const s = this.fieldTypeByKey.get(r) ?? this.fieldTypes.find((i) => i.type === r);
        s ? (a.dataTransfer.setData(le, s.type), a.dataTransfer.setData(je, JSON.stringify(s))) : a.dataTransfer.setData(le, r), a.dataTransfer.setData("text/plain", s?.type ?? r), t.classList.add("opacity-50");
      }), t.addEventListener("dragend", () => {
        t.classList.remove("opacity-50");
      });
    });
  }
}
function L(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function U(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function Ae(o, e) {
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
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-md"${e ? ` title="${U(e)}"` : ""}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Save failed
      </span>`;
    default:
      return "";
  }
}
function Pe(o) {
  const {
    name: e,
    subtitle: t,
    subtitleMono: a = !1,
    status: r,
    version: s,
    saveState: i = "idle",
    saveMessage: n,
    actions: l,
    compact: d = !1
  } = o, c = d ? "px-5" : "px-6", v = d ? "h2" : "h1", k = d ? "text-lg" : "text-xl", u = d ? "gap-2.5" : "gap-3", f = Ae(i, n), w = r ? P(
    d ? r : r.charAt(0).toUpperCase() + r.slice(1),
    "status",
    r,
    d ? { uppercase: !0, attrs: { "data-entity-status-badge": "" } } : { attrs: { "data-entity-status-badge": "" } }
  ) : "", T = s ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${U(s)}</span>` : "", j = t ? `<p class="${a ? "text-[11px] font-mono text-gray-400 dark:text-gray-500" : "text-sm text-gray-500 dark:text-gray-400"} mt-0.5 truncate">${U(t)}</p>` : "";
  return d ? `
      <div class="${c} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <${v} class="${k} font-semibold text-gray-900 dark:text-white truncate leading-snug" data-entity-name>${U(e)}</${v}>
          ${j}
        </div>
        <div class="flex items-center ${u} shrink-0">
          <span data-entity-save-indicator>${f}</span>
          ${w}
          ${l || ""}
        </div>
      </div>` : `
    <div class="${c} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
      <div>
        <div class="flex items-center gap-3">
          <${v} class="${k} font-semibold text-gray-900 dark:text-white" data-entity-name>${U(e)}</${v}>
          ${w}
          ${T}
        </div>
        ${j}
      </div>
      <div class="flex items-center ${u}">
        <span data-entity-save-indicator>${f}</span>
        ${l || ""}
      </div>
    </div>`;
}
function $(o) {
  return o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const ft = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>', bt = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>', vt = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>', mt = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>', xt = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
function qe(o) {
  const {
    field: e,
    isExpanded: t = !1,
    isSelected: a = !1,
    isDropTarget: r = !1,
    hasErrors: s = !1,
    errorMessages: i = [],
    showReorderButtons: n = !1,
    isFirst: l = !1,
    isLast: d = !1,
    compact: c = !1,
    renderExpandedContent: v,
    actionsHtml: k = "",
    constraintBadges: u = [],
    sectionName: f,
    index: w
  } = o, T = ee(e.type), j = typeof v == "function";
  let N;
  s ? N = "border-red-400 bg-red-50 dark:bg-red-900/10" : t ? N = "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20" : a ? N = "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : N = "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600";
  const _e = r ? "border-t-2 border-t-blue-400" : "", Ie = c ? "gap-1.5 px-2 py-2" : "gap-3 p-3", He = c ? "w-7 h-7 rounded-md" : "w-8 h-8 rounded-lg", De = c ? "text-[13px]" : "text-sm", ze = c ? "text-[10px]" : "text-xs", Ne = c ? "xs" : "sm", Re = s ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400", Ve = s ? xt : T?.icon ?? "?", G = [];
  e.required && G.push(P("req", "status", "required", { size: "sm", uppercase: !0, extraClass: "flex-shrink-0" })), e.readonly && G.push(P("ro", "status", "readonly", { size: "sm", uppercase: !0, extraClass: "flex-shrink-0" })), e.hidden && G.push(P("hid", "status", "hidden", { size: "sm", uppercase: !0, extraClass: "flex-shrink-0" }));
  const Oe = G.join(`
          `);
  let te = `data-field-card="${$(e.id)}"`;
  f != null && (te += ` data-field-section="${$(f)}"`), w != null && (te += ` data-field-index="${w}"`);
  let ae;
  if (c)
    ae = `${$(e.name)} &middot; ${$(e.type)}`;
  else {
    const F = T?.label ?? e.type, _ = [
      `<span class="font-mono">${$(e.name)}</span>`,
      "<span>&middot;</span>",
      `<span>${$(F)}</span>`
    ];
    e.section && _.push(`<span>&middot; ${$(e.section)}</span>`), e.gridSpan && _.push(`<span>&middot; ${e.gridSpan} cols</span>`), ae = _.join(" ");
  }
  let ue = "";
  u.length > 0 && (ue = `
            <div class="flex items-center gap-1 mt-1">
              ${u.map((F) => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${$(F)}</span>`).join("")}
            </div>`);
  let ge = "";
  s && i.length > 0 && (ge = `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${i.map((F) => $(F)).join(", ")}
            </div>`);
  let ye = "";
  if (n) {
    const F = l, _ = d, Ue = F ? "text-gray-200 dark:text-gray-700 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800", Ge = _ ? "text-gray-200 dark:text-gray-700 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
    ye = `
          <span class="flex-shrink-0 inline-flex flex-col border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button type="button" data-field-move-up="${$(e.id)}"
                    class="px-0.5 py-px ${Ue} transition-colors"
                    title="Move up" ${F ? "disabled" : ""}>
              ${ft}
            </button>
            <span class="block h-px bg-gray-200 dark:bg-gray-700"></span>
            <button type="button" data-field-move-down="${$(e.id)}"
                    class="px-0.5 py-px ${Ge} transition-colors"
                    title="Move down" ${_ ? "disabled" : ""}>
              ${bt}
            </button>
          </span>`;
  }
  let fe = "";
  return j && (fe = `
          <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors">
            ${t ? mt : vt}
          </span>`), `
      <div ${te}
           draggable="true"
           class="rounded-lg border ${_e} ${N} transition-colors">
        <div class="flex items-center ${Ie} select-none" ${j ? `data-field-toggle="${$(e.id)}"` : ""}>
          <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 cursor-grab active:cursor-grabbing" data-field-grip="${$(e.id)}">
            ${Xe(Ne)}
          </span>
          <span class="flex-shrink-0 ${He} flex items-center justify-center ${Re} text-[11px]">
            ${Ve}
          </span>
          <span class="flex-1 min-w-0 ${j ? "cursor-pointer" : ""}">
            <span class="block ${De} font-medium text-gray-800 dark:text-gray-100 truncate">${$(e.label || e.name)}</span>
            <span class="block ${ze} text-gray-400 dark:text-gray-500 ${c ? "font-mono" : ""} truncate">${ae}</span>${ue}${ge}
          </span>
          ${Oe}
          ${ye}
          ${k}
          ${fe}
        </div>
        ${t && j ? v() : ""}
      </div>`;
}
const V = "main";
class kt {
  constructor(e, t) {
    this.dragState = null, this.staticEventsBound = !1, this.previewDebounceTimer = null, this.palettePanel = null, this.paletteVisible = !1, this.sectionStates = /* @__PURE__ */ new Map(), this.lifecycleOutsideClickHandler = null, this.container = e, this.config = t, this.api = new q({ basePath: t.apiBasePath }), this.state = {
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
      layout: { type: "flat", gridColumns: 12, tabs: [] }
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
      this.state.contentType = t, this.state.fields = Q(t.schema), t.ui_schema?.layout && (this.state.layout = {
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
    const a = H(this.state.fields, this.getSlug()), r = {
      name: t,
      slug: this.getSlug(),
      description: this.getDescription(),
      icon: this.getIcon(),
      schema: a,
      ui_schema: this.buildUISchema(),
      capabilities: this.getCapabilities()
    };
    this.state.isSaving = !0, this.updateSavingState();
    try {
      let s;
      this.state.contentType?.id ? s = await this.api.update(this.state.contentType.id, r) : s = await this.api.create(r), this.state.contentType = s, this.state.isDirty = !1, this.showToast("Content type saved successfully", "success"), this.config.onSave?.(s);
    } catch (s) {
      console.error("Failed to save content type:", s);
      const i = s instanceof Error ? s.message : "Failed to save content type";
      this.showToast(i, "error");
    } finally {
      this.state.isSaving = !1, this.updateSavingState();
    }
  }
  /**
   * Add a new field
   */
  addField(e) {
    const t = ee(e);
    if (e === "blocks") {
      const s = new Set(this.state.fields.map((c) => c.name));
      let i = "content_blocks", n = "Content Blocks", l = 1;
      for (; s.has(i); )
        i = `content_blocks_${l}`, n = `Content Blocks ${l}`, l++;
      const d = {
        id: z(),
        name: i,
        type: e,
        label: n,
        required: !1,
        order: this.state.fields.length,
        ...t?.defaultConfig ?? {}
      };
      this.state.fields.push(d), this.state.selectedFieldId = d.id, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
      return;
    }
    const a = {
      id: z(),
      name: `new_${e}_${this.state.fields.length + 1}`,
      type: e,
      label: t?.label ?? e,
      required: !1,
      order: this.state.fields.length,
      ...t?.defaultConfig ?? {}
    };
    new ne({
      field: a,
      existingFieldNames: this.state.fields.map((s) => s.name),
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
    const t = this.state.fields.find((r) => r.id === e);
    if (!t) return;
    new ne({
      field: t,
      existingFieldNames: this.state.fields.filter((r) => r.id !== e).map((r) => r.name),
      onSave: (r) => {
        const s = this.state.fields.findIndex((i) => i.id === e);
        s !== -1 && (this.state.fields[s] = r, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
      },
      onCancel: () => {
      }
    }).show();
  }
  /**
   * Remove a field
   */
  removeField(e) {
    const t = this.state.fields.findIndex((r) => r.id === e);
    if (t === -1) return;
    const a = this.state.fields[t];
    confirm(`Remove field "${a.label}"?`) && (this.state.fields.splice(t, 1), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
  }
  /**
   * Move a field to a new position
   */
  moveField(e, t) {
    const a = this.state.fields.findIndex((s) => s.id === e);
    if (a === -1 || a === t) return;
    const r = this.state.fields.splice(a, 1)[0];
    this.state.fields.splice(t, 0, r), this.state.fields.forEach((s, i) => {
      s.order = i;
    }), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  /**
   * Validate the schema
   */
  async validateSchema() {
    const e = H(this.state.fields, this.getSlug());
    try {
      const t = await this.api.validateSchema({
        schema: e,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      t.valid ? (this.state.validationErrors = [], this.showToast("Schema is valid", "success")) : (this.state.validationErrors = t.errors ?? [], this.showToast("Schema has validation errors", "error"));
    } catch (t) {
      console.error("Validation failed:", t);
      const a = t instanceof Error ? t.message : "Validation failed";
      this.showToast(a, "error");
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
    const e = H(this.state.fields, this.getSlug());
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
      const a = t instanceof Error ? t.message : "Preview failed";
      this.state.previewHtml = null, this.state.previewError = a, this.renderPreview();
    } finally {
      this.state.isPreviewing = !1, this.updatePreviewState();
    }
  }
  // ===========================================================================
  // Rendering
  // ===========================================================================
  render() {
    this.container.innerHTML = `
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
            <label class="${g()}">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${m(e?.name ?? "")}"
              placeholder="Blog Post"
              required
              class="${h()}"
            />
          </div>

          <div>
            <label class="${g()}">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${m(e?.slug ?? "")}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="${h()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="${g()}">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="${he()}"
          >${m(e?.description ?? "")}</textarea>
        </div>

        <div class="mt-4">
          <label class="${g()}">
            Icon
          </label>
          <input
            type="text"
            data-ct-icon
            value="${m(e?.icon ?? "")}"
            placeholder="file-text"
            class="${h()}"
          />
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
  renderFieldCard(e, t) {
    const a = this.state.validationErrors.filter(
      (n) => n.path.includes(`/${e.name}`) || n.path.includes(`properties.${e.name}`)
    ), r = a.length > 0, s = [];
    e.validation?.minLength && s.push(`min: ${e.validation.minLength}`), e.validation?.maxLength && s.push(`max: ${e.validation.maxLength}`), e.validation?.min !== void 0 && s.push(`>= ${e.validation.min}`), e.validation?.max !== void 0 && s.push(`<= ${e.validation.max}`), e.validation?.pattern && s.push("pattern");
    const i = `
          <div class="flex items-center gap-1">
            <button type="button" data-field-edit="${m(e.id)}"
                    class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Edit field">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button type="button" data-field-remove="${m(e.id)}"
                    class="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Remove field">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>`;
    return qe({
      field: e,
      isSelected: this.state.selectedFieldId === e.id,
      hasErrors: r,
      errorMessages: a.map((n) => n.message),
      constraintBadges: s,
      index: t,
      actionsHtml: i,
      compact: !1
    });
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
    return Pe({
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
            ${e.status === "draft" ? `
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
            ` : e.status === "active" ? `
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
    const e = H(this.state.fields, this.getSlug());
    let t = null;
    try {
      t = await this.api.checkCompatibility(
        this.state.contentType.id,
        e,
        this.buildUISchema()
      );
    } catch {
    }
    new $t({
      contentType: this.state.contentType,
      compatibilityResult: t,
      onConfirm: async (r) => {
        try {
          const s = await this.api.publish(this.state.contentType.id, r);
          this.state.contentType = s, this.state.isDirty = !1, this.render(), this.bindEvents(), this.showToast("Content type published successfully", "success"), this.config.onSave?.(s);
        } catch (s) {
          const i = s instanceof Error ? s.message : "Failed to publish content type";
          this.showToast(i, "error");
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
    if (this.state.contentType?.id && confirm(`Are you sure you want to deprecate "${this.state.contentType.name}"?

Deprecated content types can still be used but are hidden from new content creation.`))
      try {
        const e = await this.api.deprecate(this.state.contentType.id);
        this.state.contentType = e, this.render(), this.bindEvents(), this.showToast("Content type deprecated successfully", "success"), this.config.onSave?.(e);
      } catch (e) {
        const t = e instanceof Error ? e.message : "Failed to deprecate content type";
        this.showToast(t, "error");
      }
  }
  /**
   * Clone the content type
   */
  async cloneContentType() {
    if (!this.state.contentType?.id) return;
    new St({
      contentType: this.state.contentType,
      onConfirm: async (t, a) => {
        try {
          const r = await this.api.clone(this.state.contentType.id, t, a);
          this.showToast(`Content type cloned as "${r.name}"`, "success"), this.config.onSave && this.config.onSave(r);
        } catch (r) {
          const s = r instanceof Error ? r.message : "Failed to clone content type";
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
    new Ct({
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
      const t = e.target, a = t.closest("[data-field-edit]");
      if (a) {
        const i = a.getAttribute("data-field-edit");
        i && this.editField(i);
        return;
      }
      const r = t.closest("[data-field-remove]");
      if (r) {
        const i = r.getAttribute("data-field-remove");
        i && this.removeField(i);
        return;
      }
      const s = t.closest("[data-field-card]");
      if (s && !t.closest("button")) {
        const i = s.getAttribute("data-field-card");
        i && (this.state.selectedFieldId = this.state.selectedFieldId === i ? null : i, this.renderFieldList());
      }
    }), this.container.addEventListener("input", (e) => {
      const t = e.target;
      if ((t.matches("[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]") || t.matches("[data-ct-cap]")) && (this.state.isDirty = !0, this.updateDirtyState()), t.matches("[data-ct-name]")) {
        const a = t, r = this.container.querySelector("[data-ct-slug]");
        r && !r.dataset.userModified && !this.state.contentType?.slug && (r.value = xe(a.value)), this.schedulePreview();
        return;
      }
      if (t.matches("[data-ct-slug]")) {
        const a = t;
        a.dataset.userModified = "true", this.schedulePreview();
        return;
      }
    });
  }
  bindDynamicEvents() {
    this.container.querySelector("[data-ct-save]")?.addEventListener("click", () => this.save()), this.container.querySelector("[data-ct-validate]")?.addEventListener("click", () => this.validateSchema()), this.container.querySelector("[data-ct-preview]")?.addEventListener("click", () => this.previewSchema()), this.container.querySelector("[data-ct-cancel]")?.addEventListener("click", () => this.config.onCancel?.()), this.bindLifecycleMenuEvents(), this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener(
      "click",
      () => this.showFieldTypePicker()
    ), this.container.querySelector("[data-ct-toggle-palette]")?.addEventListener("click", () => this.togglePalette()), this.initPaletteIfNeeded(), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.container.querySelector("[data-ct-refresh-preview]")?.addEventListener("click", () => this.previewSchema()), this.bindSectionToggleEvents(), this.bindDragEvents();
  }
  bindDragEvents() {
    const e = this.container.querySelector("[data-ct-field-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const a = t, s = a.target.closest("[data-field-card]");
      if (!s) return;
      const i = s.getAttribute("data-field-card"), n = parseInt(s.getAttribute("data-field-index") ?? "0", 10);
      this.dragState = {
        fieldId: i ?? "",
        startIndex: n,
        currentIndex: n
      }, s.classList.add("opacity-50"), a.dataTransfer?.setData("text/plain", i ?? ""), a.dataTransfer && (a.dataTransfer.effectAllowed = "move");
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
      const a = t;
      if (!this.dragState) return;
      const s = a.target.closest("[data-field-card]");
      if (!s || s.getAttribute("data-field-card") === this.dragState.fieldId) return;
      const i = s.getBoundingClientRect(), n = i.top + i.height / 2, l = a.clientY < n;
      e.querySelectorAll(".drop-indicator").forEach((v) => v.remove());
      const d = document.createElement("div");
      d.className = "drop-indicator h-0.5 bg-blue-500 rounded-full my-1 transition-opacity", l ? s.parentElement?.insertBefore(d, s) : s.parentElement?.insertBefore(d, s.nextSibling);
      const c = parseInt(s.getAttribute("data-field-index") ?? "0", 10);
      this.dragState.currentIndex = l ? c : c + 1;
    }), e.addEventListener("dragleave", () => {
      e.querySelectorAll(".drop-indicator").forEach((t) => t.remove());
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), e.querySelectorAll(".drop-indicator").forEach((i) => i.remove()), !this.dragState) return;
      const { fieldId: a, startIndex: r, currentIndex: s } = this.dragState;
      if (r !== s) {
        const i = s > r ? s - 1 : s;
        this.moveField(a, i);
      }
      this.dragState = null;
    }), e.addEventListener("dragend", () => {
      e.querySelectorAll(".opacity-50").forEach((t) => t.classList.remove("opacity-50")), e.querySelectorAll(".drop-indicator").forEach((t) => t.remove()), this.dragState = null;
    }));
  }
  bindLifecycleMenuEvents() {
    const e = this.container.querySelector("[data-ct-lifecycle-menu]");
    if (!e) {
      this.lifecycleOutsideClickHandler && (document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = null);
      return;
    }
    const t = e.querySelector("[data-ct-lifecycle-trigger]"), a = e.querySelector("[data-ct-lifecycle-dropdown]");
    t && a && (t.addEventListener("click", (r) => {
      r.stopPropagation(), a.classList.toggle("hidden");
    }), this.lifecycleOutsideClickHandler && document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = (r) => {
      e.contains(r.target) || a.classList.add("hidden");
    }, document.addEventListener("click", this.lifecycleOutsideClickHandler)), this.container.querySelector("[data-ct-publish]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.publishContentType();
    }), this.container.querySelector("[data-ct-deprecate]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.deprecateContentType();
    }), this.container.querySelector("[data-ct-clone]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.cloneContentType();
    }), this.container.querySelector("[data-ct-versions]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.showVersionHistory();
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
    e && (this.palettePanel = new de({
      container: e,
      api: this.api,
      onAddField: (t) => this.addField(t.type)
    }), this.palettePanel.init(), this.palettePanel.enable());
  }
  showFieldTypePicker() {
    new Be({
      onSelect: (t) => this.addField(t),
      onCancel: () => {
      }
    }).show();
  }
  showLayoutEditor() {
    new st({
      layout: this.state.layout,
      fields: this.state.fields,
      onSave: (t) => {
        this.state.layout = t, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
        const a = this.container.querySelector("[data-ct-field-list]")?.closest(".rounded-lg");
        if (a) {
          const r = document.createElement("div");
          r.innerHTML = this.renderFieldsSection(), a.replaceWith(r.firstElementChild), this.bindFieldsEvents();
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  bindFieldsEvents() {
    this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.bindSectionToggleEvents(), this.bindDragEvents();
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
    const e = this.container.querySelector("[data-ct-slug]"), t = this.container.querySelector("[data-ct-name]"), a = e?.value?.trim();
    return a || xe(t?.value ?? "");
  }
  getDescription() {
    return this.container.querySelector("[data-ct-description]")?.value?.trim() || void 0;
  }
  getIcon() {
    return this.container.querySelector("[data-ct-icon]")?.value?.trim() || void 0;
  }
  getCapabilities() {
    const e = {};
    return this.container.querySelectorAll("[data-ct-cap]").forEach((t) => {
      const a = t.getAttribute("data-ct-cap");
      a && (e[a] = t.checked);
    }), e;
  }
  buildUISchema() {
    const e = {}, t = {
      type: this.state.layout.type ?? "flat",
      gridColumns: this.state.layout.gridColumns ?? 12
    };
    if (t.type === "tabs" || t.type === "sections") {
      const r = /* @__PURE__ */ new Map();
      (this.state.layout.tabs ?? []).forEach((s, i) => {
        r.set(s.id, {
          id: s.id,
          label: s.label,
          order: s.order ?? i,
          icon: s.icon
        });
      }), this.state.fields.forEach((s) => {
        s.section && !r.has(s.section) && r.set(s.section, {
          id: s.section,
          label: ke(s.section),
          order: r.size
        });
      }), r.size > 0 && (t.tabs = Array.from(r.values()).sort((s, i) => s.order - i.order));
    }
    e.layout = t;
    const a = [];
    if (this.state.fields.forEach((r) => {
      const s = { path: `#/properties/${r.name}` }, i = {};
      r.section && (i.section = r.section), r.gridSpan && (i.grid = { span: r.gridSpan }), r.order !== void 0 && (i.order = r.order), r.readonly && (i.readonly = !0), r.hidden && (i.hidden = !0), Object.keys(i).length > 0 && (s["x-formgen"] = i, a.push(s));
    }), a.length > 0 && (e.overrides = a), !(t.type === "flat" && !t.tabs?.length && a.length === 0 || !e.layout && !e.overrides))
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
      let a = e.querySelector("[data-dirty-dot]");
      this.state.isDirty ? a || (a = document.createElement("span"), a.setAttribute("data-dirty-dot", ""), a.className = "inline-block w-2 h-2 rounded-full bg-orange-400 ml-1.5 align-middle", a.setAttribute("title", "Unsaved changes"), e.appendChild(a)) : a?.remove();
    }
    const t = this.container.querySelector("[data-content-type-editor] h1");
    if (t) {
      let a = t.parentElement?.querySelector("[data-dirty-badge]");
      this.state.isDirty ? a || (a = document.createElement("span"), a.setAttribute("data-dirty-badge", ""), a.className = "px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", a.textContent = "Modified", t.parentElement?.appendChild(a)) : a?.remove();
    }
  }
  renderFieldList() {
    const e = this.container.querySelector("[data-ct-field-list]");
    e && (e.innerHTML = this.renderFieldListContent(), this.bindDragEvents());
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
    if (t.length <= 1)
      return `
        <div class="space-y-2">
          ${this.state.fields.map((s, i) => this.renderFieldCard(s, i)).join("")}
        </div>
      `;
    let a = 0, r = "";
    for (const s of t) {
      const i = e.get(s), l = this.getSectionState(s).collapsed;
      r += `
        <div data-ct-section="${m(s)}" class="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <button type="button" data-ct-toggle-section="${m(s)}"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            <span class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
              ${l ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${m(ke(s))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${i.length}</span>
          </button>

          <div class="${l ? "hidden" : ""}" data-ct-section-body="${m(s)}">
            <div class="space-y-2 px-1 pb-2">
              ${i.map((d) => {
        const c = this.renderFieldCard(d, a);
        return a++, c;
      }).join("")}
            </div>
          </div>
        </div>`;
    }
    return r;
  }
  // ===========================================================================
  // Section Grouping
  // ===========================================================================
  groupFieldsBySection() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.state.fields) {
      const a = t.section || V;
      e.has(a) || e.set(a, []), e.get(a).push(t);
    }
    if (e.has(V)) {
      const t = e.get(V);
      e.delete(V);
      const a = /* @__PURE__ */ new Map();
      a.set(V, t);
      for (const [r, s] of e) a.set(r, s);
      return a;
    }
    return e;
  }
  getSectionState(e) {
    return this.sectionStates.has(e) || this.sectionStates.set(e, { collapsed: !1 }), this.sectionStates.get(e);
  }
  toggleSection(e) {
    const t = this.getSectionState(e);
    t.collapsed = !t.collapsed;
    const a = this.container.querySelector(`[data-ct-section-body="${e}"]`);
    a && a.classList.toggle("hidden", t.collapsed);
    const s = this.container.querySelector(`[data-ct-toggle-section="${e}"]`)?.querySelector("span:first-child");
    s && (s.innerHTML = t.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
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
      ` : this.state.previewHtml && (e.innerHTML = this.state.previewHtml));
  }
  renderValidationErrors() {
    const e = this.container.querySelector("[data-ct-validation-errors]");
    if (!e) return;
    if (this.state.validationErrors.length === 0) {
      e.classList.add("hidden"), e.innerHTML = "", this.renderFieldList();
      return;
    }
    const t = /* @__PURE__ */ new Map(), a = [];
    for (const r of this.state.validationErrors) {
      const s = r.path.match(/properties[./](\w+)/);
      if (s) {
        const i = s[1];
        t.has(i) || t.set(i, []), t.get(i).push(r);
      } else
        a.push(r);
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
          ${a.length > 0 ? `
            <div class="mb-3">
              <div class="text-xs font-medium text-red-700 dark:text-red-300 uppercase mb-1">Schema</div>
              <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                ${a.map((r) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${m(r.message)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${Array.from(t.entries()).map(([r, s]) => {
      const i = this.state.fields.find((n) => n.name === r);
      return `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${m(i?.label ?? r)} <span class="font-mono">(${m(r)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${s.map((n) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${m(n.message)}</li>`).join("")}
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
    const r = window.notify?.[t];
    if (typeof r == "function") {
      r(e);
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
function m(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function xe(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function ke(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
function wt(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
class $t extends E {
  constructor(e) {
    super({ size: "lg", flexColumn: !1 }), this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: e, compatibilityResult: t } = this.config, a = (t?.breaking_changes?.length ?? 0) > 0, r = (t?.warnings?.length ?? 0) > 0, s = t?.affected_entries_count ?? 0;
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${m(e.name)}</strong>.
          ${e.status === "draft" ? "This will make it available for content creation." : "This will create a new version of the schema."}
        </p>

        ${a ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Breaking Changes Detected</span>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-300 space-y-1 ml-7">
              ${t.breaking_changes.map((i) => `
                <li>• ${m(i.description || `${i.type}: ${i.path}`)}</li>
              `).join("")}
            </ul>
            ${s > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${s} content ${s === 1 ? "entry" : "entries"} will require migration.
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${r ? `
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
            </div>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-7">
              ${t.warnings.map((i) => `
                <li>• ${m(i.description || `${i.type}: ${i.path}`)}</li>
              `).join("")}
            </ul>
          </div>
        ` : ""}

        ${!a && !r ? `
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

        ${a ? `
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
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${a ? "bg-red-600 hover:bg-red-700 disabled:opacity-50" : "bg-green-600 hover:bg-green-700"}"
          ${a ? "disabled" : ""}
        >
          ${a ? "Publish with Breaking Changes" : "Publish"}
        </button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-publish-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    });
    const e = this.container?.querySelector("[data-publish-confirm]"), t = this.container?.querySelector("[data-publish-force]");
    t?.addEventListener("change", () => {
      e && (e.disabled = !t.checked);
    }), e?.addEventListener("click", () => {
      const a = t?.checked ?? !1;
      this.config.onConfirm(a), this.hide();
    });
  }
}
class St extends E {
  constructor(e) {
    super({ size: "md", initialFocus: "[data-clone-slug]" }), this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: e } = this.config, t = `${e.slug}-copy`, a = `${e.name} (Copy)`;
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Clone Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create a copy of <strong class="text-gray-900 dark:text-white">${m(e.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="${g()}">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${m(t)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="${h()}"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
        </div>

        <div>
          <label class="${g()}">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${m(a)}"
            placeholder="My Content Type"
            class="${h()}"
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
      const e = this.container?.querySelector("[data-clone-slug]"), t = this.container?.querySelector("[data-clone-name]"), a = e?.value?.trim(), r = t?.value?.trim();
      if (!a) {
        alert("Slug is required"), e?.focus();
        return;
      }
      if (!/^[a-z][a-z0-9_\-]*$/.test(a)) {
        alert("Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter."), e?.focus();
        return;
      }
      this.config.onConfirm(a, r || void 0), this.hide();
    }), this.container?.addEventListener("keydown", (e) => {
      e.key === "Enter" && (e.preventDefault(), this.container?.querySelector("[data-clone-confirm]")?.click());
    });
  }
}
class Ct extends E {
  constructor(e) {
    super({ size: "2xl", maxHeight: "max-h-[80vh]" }), this.versions = [], this.expandedVersions = /* @__PURE__ */ new Set(), this.config = e, this.api = new q({ basePath: e.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${m(this.config.contentType.name)} (${m(this.config.contentType.slug)})</p>
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
          <p class="text-xs mt-2">Current version: ${m(this.config.contentType.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      e.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((t, a) => this.renderVersionCard(t, a === 0)).join("")}
      </div>
    `, e.querySelectorAll("[data-toggle-version]").forEach((t) => {
        t.addEventListener("click", () => {
          const a = t.getAttribute("data-toggle-version");
          a && (this.expandedVersions.has(a) ? this.expandedVersions.delete(a) : this.expandedVersions.add(a), this.renderVersionsList());
        });
      });
    }
  }
  renderVersionCard(e, t) {
    const a = this.expandedVersions.has(e.version), r = (e.changes?.length ?? 0) > 0, s = e.is_breaking || e.changes?.some((i) => i.is_breaking);
    return `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${m(e.version)}</span>
              ${t ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ""}
              ${s ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
              ${this.getMigrationBadge(e.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${wt(e.created_at)}</span>
            ${r ? `
              <button
                type="button"
                data-toggle-version="${m(e.version)}"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <svg class="w-4 h-4 transition-transform ${a ? "rotate-180" : ""}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        ${a && r ? `
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
    }, a = {
      added: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>',
      removed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>',
      modified: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
    };
    return `
      <li class="flex items-start gap-2 text-sm">
        <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${t[e.type]}">
          <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${a[e.type]}
          </svg>
          ${e.type}
        </span>
        <div class="flex-1">
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${m(e.path)}</span>
          ${e.field ? `<span class="text-gray-500 dark:text-gray-400"> (${m(e.field)})</span>` : ""}
          ${e.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${m(e.description)}</p>` : ""}
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
class Bt extends E {
  constructor(e) {
    super({ size: "4xl", backdropDataAttr: "data-block-library-backdrop" }), this.categories = [], this.config = e, this.api = new q({ basePath: e.apiBasePath }), this.state = {
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
          class="${M()}"
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
    }), this.container?.querySelector("[data-block-list]")?.addEventListener("click", (r) => {
      const s = r.target, i = s.closest("[data-block-id]");
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
      const a = (t.category || "").trim().toLowerCase();
      a && !e.has(a) && (e.add(a), this.categories.push(a));
    }
    this.renderCategoryOptions();
  }
  renderCategoryOptions() {
    const e = this.container?.querySelector("[data-block-category-filter]");
    if (e) {
      e.innerHTML = '<option value="">All Categories</option>';
      for (const t of this.categories) {
        const a = document.createElement("option");
        a.value = t, a.textContent = ce(t), e.appendChild(a);
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
    const a = /* @__PURE__ */ new Map();
    for (const s of t) {
      const i = s.category || "custom";
      a.has(i) || a.set(i, []), a.get(i).push(s);
    }
    let r = "";
    for (const [s, i] of a)
      r += `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${ce(s)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${i.map((n) => this.renderBlockCard(n)).join("")}
          </div>
        </div>
      `;
    e.innerHTML = r;
  }
  renderBlockCard(e) {
    const t = this.config.mode !== "picker", a = this.isBlockAllowed(e), r = this.getStatusBadge(e.status), s = this.blockKey(e);
    return `
      <div
        data-block-id="${e.id}"
        class="relative p-4 border rounded-lg ${a ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed"} transition-colors"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${e.icon || s.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${C(e.name)}</h4>
              ${r}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${C(s)}</p>
            ${e.description ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${C(e.description)}</p>` : ""}
            ${e.schema_version ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${C(e.schema_version)}</p>` : ""}
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

        ${a ? "" : '<div class="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 rounded-lg"><span class="text-xs text-gray-500 dark:text-gray-400">Not allowed</span></div>'}
      </div>
    `;
  }
  getStatusBadge(e) {
    const t = e || "active", a = t.charAt(0).toUpperCase() + t.slice(1);
    return P(a, "status", t);
  }
  getFilteredBlocks() {
    let e = [...this.state.blocks];
    if (this.state.filter) {
      const t = this.state.filter.toLowerCase();
      e = e.filter(
        (a) => a.name.toLowerCase().includes(t) || a.type.toLowerCase().includes(t) || (a.slug?.toLowerCase().includes(t) ?? !1) || (a.description?.toLowerCase().includes(t) ?? !1)
      );
    }
    return this.state.categoryFilter && (e = e.filter((t) => t.category === this.state.categoryFilter)), e;
  }
  blockKey(e) {
    return (e.slug || e.type || "").trim();
  }
  blockInList(e, t) {
    if (!e || e.length === 0) return !1;
    const a = this.blockKey(t);
    return !!(a && e.includes(a) || t.slug && e.includes(t.type));
  }
  isBlockAllowed(e) {
    const { allowedBlocks: t, deniedBlocks: a } = this.config;
    return this.blockInList(a, e) ? !1 : t && t.length > 0 ? this.blockInList(t, e) : !0;
  }
  showBlockEditor(e) {
    new Et({
      apiBasePath: this.config.apiBasePath,
      block: e,
      categories: this.categories,
      onSave: async (a) => {
        await this.loadBlocks();
      },
      onCancel: () => {
      }
    }).show();
  }
  async confirmDeleteBlock(e) {
    if (confirm(`Are you sure you want to delete the block "${e.name}"? This action cannot be undone.`))
      try {
        await this.api.deleteBlockDefinition(e.id), await this.loadBlocks();
      } catch (a) {
        this.showError(a instanceof Error ? a.message : "Failed to delete block");
      }
  }
  async cloneBlock(e) {
    const t = (e.slug || e.type || "block").trim(), a = prompt("Enter a unique slug for the cloned block:", `${t}_copy`);
    if (a)
      try {
        await this.api.cloneBlockDefinition(e.id, a, a), await this.loadBlocks();
      } catch (r) {
        this.showError(r instanceof Error ? r.message : "Failed to clone block");
      }
  }
  async publishBlock(e) {
    try {
      await this.api.publishBlockDefinition(e.id), await this.loadBlocks();
    } catch (t) {
      this.showError(t instanceof Error ? t.message : "Failed to publish block");
    }
  }
  async showVersionHistory(e) {
    new Lt({
      apiBasePath: this.config.apiBasePath,
      block: e
    }).show();
  }
  showError(e) {
    const t = this.container?.querySelector("[data-block-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const a = t.querySelector("p");
    a && (a.textContent = e), setTimeout(() => {
      t.classList.add("hidden");
    }, 5e3);
  }
}
class Et extends E {
  constructor(e) {
    super({ size: "3xl" }), this.fields = [], this.config = e, this.api = new q({ basePath: e.apiBasePath }), this.isNew = !e.block, e.block?.schema && (this.fields = Q(e.block.schema));
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
              <label class="${g()}">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value="${C(e?.name ?? "")}"
                placeholder="Hero Section"
                required
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Type <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="type"
                value="${C(e?.type ?? "")}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_\\-]*$"
                required
                ${e ? "readonly" : ""}
                class="${h()} ${e ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed" : ""}"
              />
              <p class="mt-1 text-xs text-gray-500">Unique identifier. Lowercase, numbers, hyphens, underscores.</p>
            </div>
          </div>

          <div>
            <label class="${g()}">
              Description
            </label>
            <textarea
              name="description"
              rows="2"
              placeholder="A description of this block type"
              class="${he()}"
            >${C(e?.description ?? "")}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${g()}">
                Category
              </label>
              <select
                name="category"
                class="${M()}"
              >
                ${this.config.categories.map((t) => `<option value="${t}" ${e?.category === t ? "selected" : ""}>${ce(t)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="${g()}">
                Icon
              </label>
              <input
                type="text"
                name="icon"
                value="${C(e?.icon ?? "")}"
                placeholder="emoji or text"
                maxlength="2"
                class="${h()}"
              />
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
              <span class="text-sm font-medium text-gray-900 dark:text-white">${C(e.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${C(e.name)}</span>
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
    }), this.container?.querySelector("[data-fields-list]")?.addEventListener("click", (e) => {
      const t = e.target, a = t.closest("[data-edit-field]");
      if (a) {
        const s = parseInt(a.getAttribute("data-edit-field") ?? "-1", 10);
        s >= 0 && this.fields[s] && this.showFieldConfigForm(this.fields[s], s);
        return;
      }
      const r = t.closest("[data-remove-field]");
      if (r) {
        const s = parseInt(r.getAttribute("data-remove-field") ?? "-1", 10);
        s >= 0 && (this.fields.splice(s, 1), this.updateFieldsList());
        return;
      }
    });
  }
  showFieldTypePicker() {
    new Be({
      onSelect: (t) => {
        const a = {
          id: z(),
          name: "",
          type: t,
          label: "",
          required: !1
        };
        this.showFieldConfigForm(a, -1);
      },
      onCancel: () => {
      },
      excludeTypes: ["blocks", "repeater"]
      // Blocks can't nest blocks
    }).show();
  }
  showFieldConfigForm(e, t) {
    new ne({
      field: e,
      existingFieldNames: this.fields.filter((r, s) => s !== t).map((r) => r.name),
      onSave: (r) => {
        t >= 0 ? this.fields[t] = r : this.fields.push(r), this.updateFieldsList();
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
    const t = new FormData(e), a = t.get("name")?.trim(), r = t.get("type")?.trim();
    if (!a || !r) {
      alert("Name and Type are required");
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(r)) {
      alert("Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.");
      return;
    }
    const s = Se(this.fields, r), i = {
      name: a,
      type: r,
      description: t.get("description")?.trim() || void 0,
      category: t.get("category") || "custom",
      icon: t.get("icon")?.trim() || void 0,
      schema: s,
      status: this.config.block?.status ?? "draft"
    };
    try {
      let n;
      this.isNew ? n = await this.api.createBlockDefinition(i) : n = await this.api.updateBlockDefinition(this.config.block.id, i), this.config.onSave(n), this.hide();
    } catch (n) {
      alert(n instanceof Error ? n.message : "Failed to save block");
    }
  }
}
class Lt extends E {
  constructor(e) {
    super({ size: "2xl", maxHeight: "max-h-[80vh]" }), this.versions = [], this.config = e, this.api = new q({ basePath: e.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${C(this.config.block.name)} (${C(this.config.block.slug || this.config.block.type)})</p>
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
          <p class="text-xs mt-2">Current version: ${C(this.config.block.schema_version ?? "1.0.0")}</p>
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
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${C(t.version)}</span>
                ${t.is_breaking ? P("Breaking", "status", "breaking") : ""}
                ${this.getMigrationBadge(t.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${Mt(t.created_at)}</span>
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
    const a = e ? {
      pending: ["Pending", "pending"],
      in_progress: ["Migrating", "migrating"],
      completed: ["Migrated", "migrated"],
      failed: ["Failed", "failed"]
    }[e] : void 0;
    return a ? P(a[0], "status", a[1]) : "";
  }
}
function C(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function ce(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function Mt(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
function Tt(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-trigger]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const a = t.dataset.apiBasePath ?? "/admin", r = t.dataset.mode ?? "manage";
    if (r === "manage")
      t.addEventListener("click", () => {
        window.location.href = `${a}/block_definitions`;
      });
    else {
      const s = {
        apiBasePath: a,
        mode: r
      };
      t.addEventListener("click", () => {
        new Bt(s).show();
      });
    }
    t.dataset.initialized = "true";
  });
}
function Ft(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
Ft(() => Tt());
const S = "main", we = "application/x-field-reorder";
class jt {
  constructor(e) {
    this.expandedFieldId = null, this.sectionStates = /* @__PURE__ */ new Map(), this.moveMenuFieldId = null, this.dropHighlight = !1, this.dragReorder = null, this.dropTargetFieldId = null, this.saveState = "idle", this.saveMessage = "", this.saveDisplayTimer = null, this.cachedBlocks = null, this.blocksLoading = !1, this.config = e, this.block = { ...e.block }, this.fields = e.block.schema ? Q(e.block.schema) : [];
  }
  render() {
    this.config.container.innerHTML = "";
    const e = document.createElement("div");
    e.className = "flex flex-col h-full overflow-hidden", e.setAttribute("data-block-editor-panel", ""), e.innerHTML = `
      ${this.renderHeader()}
      <div class="flex-1 overflow-y-auto" data-editor-scroll>
        ${this.renderMetadataSection()}
        ${this.renderFieldsSection()}
      </div>
    `, this.config.container.appendChild(e), this.bindEvents(e);
  }
  /** Refresh the panel for a new block without a full re-mount */
  update(e) {
    this.block = { ...e }, this.fields = e.schema ? Q(e.schema) : [], this.expandedFieldId = null, this.moveMenuFieldId = null, this.render();
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
    return Pe({
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
    const a = this.config.container.querySelector("[data-entity-save-indicator]");
    a && (a.innerHTML = Ae(this.saveState, this.saveMessage)), e === "saved" && (this.saveDisplayTimer = setTimeout(() => {
      this.saveState = "idle", this.saveMessage = "";
      const r = this.config.container.querySelector("[data-entity-save-indicator]");
      r && (r.innerHTML = "");
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
    const e = this.block, t = e.slug || e.type || "", a = e.slug && e.type && e.slug !== e.type ? `<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Internal type: ${p(e.type)}</p>` : "";
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
              <input type="text" data-meta-field="name" value="${p(e.name)}"
                     class="${h()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug</label>
              <input type="text" data-meta-field="slug" value="${p(t)}" pattern="^[a-z][a-z0-9_\\-]*$"
                     class="${h()} font-mono" />
              ${a}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${h()} resize-none">${p(e.description ?? "")}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select data-meta-field="category" class="${M()}">
                ${this.config.categories.map((r) => `<option value="${p(r)}" ${r === (e.category ?? "") ? "selected" : ""}>${p(I(r))}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              <input type="text" data-meta-field="icon" value="${p(e.icon ?? "")}"
                     placeholder="emoji or key"
                     class="${h()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select data-meta-field="status" class="${M()}">
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
          </div>
          <span class="text-[11px] text-gray-400 dark:text-gray-500">0 fields</span>
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
    let a = `
      <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
        </div>
        <span class="text-[11px] text-gray-400 dark:text-gray-500">${this.fields.length} field${this.fields.length !== 1 ? "s" : ""}</span>
      </div>`;
    for (const r of t) {
      const s = e.get(r), n = this.getSectionState(r).collapsed;
      a += `
        <div data-section="${p(r)}" class="border-b border-gray-100 dark:border-gray-800">
          <button type="button" data-toggle-section="${p(r)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-section-chevron="${p(r)}">
              ${n ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${p(I(r))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${s.length}</span>
          </button>

          <div class="${n ? "hidden" : ""}" data-section-body="${p(r)}">
            <div class="px-3 pb-2 space-y-1" data-section-fields="${p(r)}">
              ${s.map((l) => this.renderFieldCard(l, t, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return a += `
      <div data-field-drop-zone
           class="mx-3 my-2 py-3 border-2 border-dashed rounded-lg text-center transition-colors ${this.dropHighlight ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
        <p class="text-[11px] text-gray-400 dark:text-gray-500">Drop a field here or click a field type in the palette</p>
      </div>`, a;
  }
  // ===========================================================================
  // Rendering – Single field card (Task 8.2)
  // ===========================================================================
  renderFieldCard(e, t, a) {
    const r = e.section || S, s = a.indexOf(e), i = `
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${p(e.id)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === e.id ? this.renderMoveToSectionMenu(e, t, r) : ""}
          </div>`;
    return qe({
      field: e,
      isExpanded: e.id === this.expandedFieldId,
      isDropTarget: this.dropTargetFieldId === e.id,
      showReorderButtons: !0,
      isFirst: s === 0,
      isLast: s === a.length - 1,
      compact: !0,
      sectionName: r,
      actionsHtml: i,
      renderExpandedContent: () => this.renderFieldProperties(e, t)
    });
  }
  // ===========================================================================
  // Rendering – Inline field property editor (Task 8.2)
  // ===========================================================================
  renderFieldProperties(e, t) {
    return D(e.type) === "blocks" ? this.renderBlocksFieldProperties(e, t) : this.renderStandardFieldProperties(e, t);
  }
  /** Standard field properties (non-blocks) */
  renderStandardFieldProperties(e, t) {
    const a = e.validation ?? {}, r = D(e.type), s = ["text", "textarea", "rich-text", "markdown", "code", "slug"].includes(r), i = ["number", "integer", "currency", "percentage"].includes(r), n = e.section || S;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${p(e.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${p(e.id)}" data-prop-key="name"
                   value="${p(e.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${h("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
            <input type="text" data-field-prop="${p(e.id)}" data-prop-key="label"
                   value="${p(e.label)}"
                   class="${h("xs")}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
          <input type="text" data-field-prop="${p(e.id)}" data-prop-key="description"
                 value="${p(e.description ?? "")}" placeholder="Help text for editors"
                 class="${h("xs")}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${p(e.id)}" data-prop-key="placeholder"
                 value="${p(e.placeholder ?? "")}"
                 class="${h("xs")}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${p(e.id)}" data-check-key="required"
                   ${e.required ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${p(e.id)}" data-check-key="readonly"
                   ${e.readonly ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${p(e.id)}" data-check-key="hidden"
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
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="validation.minLength"
                   value="${a.minLength ?? ""}" min="0"
                   class="${h("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="validation.maxLength"
                   value="${a.maxLength ?? ""}" min="0"
                   class="${h("xs")}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${p(e.id)}" data-prop-key="validation.pattern"
                 value="${p(a.pattern ?? "")}" placeholder="^[a-z]+$"
                 class="${h("xs")} font-mono" />
        </div>` : ""}

        ${i ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="validation.min"
                   value="${a.min ?? ""}" step="any"
                   class="${h("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="validation.max"
                   value="${a.max ?? ""}" step="any"
                   class="${h("xs")}" />
          </div>
        </div>` : ""}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
            <select data-field-section-select="${p(e.id)}"
                    class="${M("xs")}">
              ${t.map((l) => `<option value="${p(l)}" ${l === n ? "selected" : ""}>${p(I(l))}</option>`).join("")}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="gridSpan"
                   value="${e.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                   class="${h("xs")}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${p(e.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  /** Blocks field properties: block picker primary, field settings secondary */
  renderBlocksFieldProperties(e, t) {
    const a = e.config ?? {}, r = e.section || S, s = new Set(a.allowedBlocks ?? []);
    let i;
    if (this.cachedBlocks) {
      const n = ie(s, this.cachedBlocks);
      i = oe({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: n,
        label: "Allowed Blocks",
        accent: "blue"
      });
    } else
      i = `
        <div class="flex items-center justify-center py-6" data-blocks-loading="${p(e.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${p(e.id)}">
        <!-- Block Selection (primary) -->
        <div data-blocks-picker-container="${p(e.id)}">
          ${i}
        </div>

        <!-- Min/Max Blocks -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Blocks</label>
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="config.minBlocks"
                   value="${a.minBlocks ?? ""}" min="0" placeholder="0"
                   class="${h("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Blocks</label>
            <input type="number" data-field-prop="${p(e.id)}" data-prop-key="config.maxBlocks"
                   value="${a.maxBlocks ?? ""}" min="1" placeholder="No limit"
                   class="${h("xs")}" />
          </div>
        </div>

        <!-- Field Settings (secondary — collapsed by default) -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
          <button type="button" data-blocks-settings-toggle="${p(e.id)}"
                  class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
            <span data-blocks-settings-chevron="${p(e.id)}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
            Field Settings
          </button>

          <div class="hidden mt-2 space-y-3" data-blocks-settings-body="${p(e.id)}">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
                <input type="text" data-field-prop="${p(e.id)}" data-prop-key="name"
                       value="${p(e.name)}" pattern="^[a-z][a-z0-9_]*$"
                       class="${h("xs")}" />
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
                <input type="text" data-field-prop="${p(e.id)}" data-prop-key="label"
                       value="${p(e.label)}"
                       class="${h("xs")}" />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
              <input type="text" data-field-prop="${p(e.id)}" data-prop-key="description"
                     value="${p(e.description ?? "")}" placeholder="Help text for editors"
                     class="${h("xs")}" />
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${p(e.id)}" data-check-key="required"
                       ${e.required ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${p(e.id)}" data-check-key="readonly"
                       ${e.readonly ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${p(e.id)}" data-check-key="hidden"
                       ${e.hidden ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
                <select data-field-section-select="${p(e.id)}"
                        class="${M("xs")}">
                  ${t.map((n) => `<option value="${p(n)}" ${n === r ? "selected" : ""}>${p(I(n))}</option>`).join("")}
                  <option value="__new__">+ New section...</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
                <input type="number" data-field-prop="${p(e.id)}" data-prop-key="gridSpan"
                       value="${e.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                       class="${h("xs")}" />
              </div>
            </div>
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${p(e.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  // ===========================================================================
  // Rendering – Move to Section menu (Task 8.4)
  // ===========================================================================
  renderMoveToSectionMenu(e, t, a) {
    const r = t.filter((s) => s !== a);
    return r.length === 0 ? `
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">Only one section exists.</div>
          <button type="button" data-move-new-section="${p(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>` : `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Move to section</div>
        ${r.map((s) => `
          <button type="button" data-move-to="${p(s)}" data-move-field="${p(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${p(I(s))}
          </button>`).join("")}
        <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
          <button type="button" data-move-new-section="${p(e.id)}"
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
      const a = t.section || S;
      e.has(a) || e.set(a, []), e.get(a).push(t);
    }
    if (e.has(S)) {
      const t = e.get(S);
      e.delete(S);
      const a = /* @__PURE__ */ new Map();
      a.set(S, t);
      for (const [r, s] of e) a.set(r, s);
      return a;
    }
    return e;
  }
  getSectionState(e) {
    return this.sectionStates.has(e) || this.sectionStates.set(e, { collapsed: !1 }), this.sectionStates.get(e);
  }
  // ===========================================================================
  // Event Binding
  // ===========================================================================
  bindEvents(e) {
    e.querySelector("[data-toggle-metadata]")?.addEventListener("click", () => {
      const t = e.querySelector("[data-metadata-body]"), a = e.querySelector("[data-metadata-chevron]");
      if (t) {
        const r = t.classList.toggle("hidden");
        a && (a.innerHTML = r ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
    }), e.querySelectorAll("[data-meta-field]").forEach((t) => {
      const a = t.dataset.metaField;
      t.tagName === "SELECT" ? t.addEventListener("change", () => this.handleMetadataChange(a, t.value)) : (t.tagName === "TEXTAREA" || t.tagName === "INPUT") && t.addEventListener("input", () => this.handleMetadataChange(a, t.value));
    }), e.addEventListener("click", (t) => this.handleClick(t, e)), e.addEventListener("input", (t) => this.handleInput(t)), e.addEventListener("change", (t) => this.handleChange(t, e)), document.addEventListener("click", (t) => {
      if (this.moveMenuFieldId) {
        const a = t.target;
        !a.closest("[data-move-menu]") && !a.closest("[data-field-actions]") && (this.moveMenuFieldId = null, this.render());
      }
    }), this.bindDropZoneEvents(e), this.bindFieldReorderEvents(e), this.bindSectionSelectEvents(e);
  }
  /** Bind drag-and-drop events on all [data-field-drop-zone] elements */
  bindDropZoneEvents(e) {
    e.querySelectorAll("[data-field-drop-zone]").forEach((a) => {
      a.addEventListener("dragover", (r) => {
        r.preventDefault(), r.dataTransfer.dropEffect = "copy", this.dropHighlight || (this.dropHighlight = !0, a.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), a.classList.add("border-blue-400", "bg-blue-50/50"));
      }), a.addEventListener("dragleave", (r) => {
        a.contains(r.relatedTarget) || (this.dropHighlight = !1, a.classList.remove("border-blue-400", "bg-blue-50/50"), a.classList.add("border-gray-200", "hover:border-gray-300"));
      }), a.addEventListener("drop", (r) => {
        if (r.preventDefault(), this.dropHighlight = !1, a.classList.remove("border-blue-400", "bg-blue-50/50"), a.classList.add("border-gray-200", "hover:border-gray-300"), this.config.onFieldDrop) {
          const s = r.dataTransfer?.getData(je);
          if (s)
            try {
              const n = JSON.parse(s);
              if (n && n.type) {
                this.config.onFieldDrop(n);
                return;
              }
            } catch {
            }
          const i = r.dataTransfer?.getData(le);
          if (i) {
            const n = D(i), l = ee(n) ?? {
              type: n,
              label: I(n),
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
    const a = e.target, r = a.closest("[data-toggle-section]");
    if (r) {
      const u = r.dataset.toggleSection, f = this.getSectionState(u);
      f.collapsed = !f.collapsed, this.sectionStates.set(u, f);
      const w = t.querySelector(`[data-section-body="${u}"]`), T = t.querySelector(`[data-section-chevron="${u}"]`);
      w && w.classList.toggle("hidden", f.collapsed), T && (T.innerHTML = f.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      return;
    }
    const s = a.closest("[data-field-actions]");
    if (s) {
      e.stopPropagation();
      const u = s.dataset.fieldActions;
      this.moveMenuFieldId = this.moveMenuFieldId === u ? null : u, this.render();
      return;
    }
    const i = a.closest("[data-move-to]");
    if (i) {
      e.stopPropagation();
      const u = i.dataset.moveTo, f = i.dataset.moveField;
      this.moveFieldToSection(f, u);
      return;
    }
    const n = a.closest("[data-move-new-section]");
    if (n) {
      e.stopPropagation();
      const u = n.dataset.moveNewSection, f = prompt("Section name:");
      f && f.trim() && this.moveFieldToSection(u, f.trim().toLowerCase().replace(/\s+/g, "_"));
      return;
    }
    const l = a.closest("[data-field-move-up]");
    if (l) {
      e.stopPropagation();
      const u = l.dataset.fieldMoveUp;
      l.hasAttribute("disabled") || this.moveFieldInSection(u, -1);
      return;
    }
    const d = a.closest("[data-field-move-down]");
    if (d) {
      e.stopPropagation();
      const u = d.dataset.fieldMoveDown;
      d.hasAttribute("disabled") || this.moveFieldInSection(u, 1);
      return;
    }
    const c = a.closest("[data-field-remove]");
    if (c) {
      const u = c.dataset.fieldRemove, f = this.fields.find((w) => w.id === u);
      f && confirm(`Remove field "${f.label || f.name}"?`) && (this.fields = this.fields.filter((w) => w.id !== u), this.expandedFieldId === u && (this.expandedFieldId = null), this.notifySchemaChange(), this.render());
      return;
    }
    const v = a.closest("[data-blocks-settings-toggle]");
    if (v) {
      const u = v.dataset.blocksSettingsToggle, f = t.querySelector(`[data-blocks-settings-body="${u}"]`), w = t.querySelector(`[data-blocks-settings-chevron="${u}"]`);
      if (f) {
        const T = f.classList.toggle("hidden");
        w && (w.innerHTML = T ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
      return;
    }
    const k = a.closest("[data-field-toggle]");
    if (k) {
      if (a.closest("[data-field-grip]")) return;
      const u = k.dataset.fieldToggle;
      if (this.expandedFieldId = this.expandedFieldId === u ? null : u, this.render(), this.expandedFieldId) {
        const f = this.fields.find((w) => w.id === this.expandedFieldId);
        f && D(f.type) === "blocks" && this.loadBlocksForField(f);
      }
      return;
    }
  }
  handleInput(e) {
    const a = e.target.closest("[data-field-prop]");
    if (a) {
      const r = a.dataset.fieldProp, s = a.dataset.propKey;
      this.updateFieldProp(r, s, a.value);
      return;
    }
  }
  handleChange(e, t) {
    const r = e.target.closest("[data-field-check]");
    if (r) {
      const s = r.dataset.fieldCheck, i = r.dataset.checkKey;
      this.updateFieldProp(s, i, r.checked);
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
    const a = {}, r = this.block;
    switch (e) {
      case "name":
        a.name = t, r.name = t;
        break;
      case "slug": {
        const s = (this.block.slug || this.block.type || "").toString();
        a.slug = t, r.slug = t, (!r.type || r.type === s) && (a.type = t, r.type = t);
        break;
      }
      case "description":
        a.description = t, r.description = t;
        break;
      case "category":
        a.category = t, r.category = t;
        break;
      case "icon":
        a.icon = t, r.icon = t;
        break;
      case "status":
        a.status = t, r.status = t;
        break;
    }
    this.config.onMetadataChange(this.block.id, a);
  }
  updateFieldProp(e, t, a) {
    const r = this.fields.find((i) => i.id === e);
    if (!r) return;
    const s = t.split(".");
    if (s.length === 1) {
      const i = s[0], n = r;
      typeof a == "boolean" ? n[i] = a : i === "gridSpan" ? n[i] = a ? parseInt(a, 10) : void 0 : n[i] = a || void 0;
    } else if (s[0] === "config") {
      r.config || (r.config = {});
      const i = s[1], n = r.config;
      typeof a == "string" && (a === "" ? delete n[i] : ["minBlocks", "maxBlocks"].includes(i) ? n[i] = parseInt(a, 10) : n[i] = a), Object.keys(r.config).length === 0 && (r.config = void 0);
    } else if (s[0] === "validation") {
      r.validation || (r.validation = {});
      const i = s[1];
      typeof a == "string" && (a === "" ? delete r.validation[i] : ["minLength", "maxLength"].includes(i) ? r.validation[i] = parseInt(a, 10) : ["min", "max"].includes(i) ? r.validation[i] = parseFloat(a) : r.validation[i] = a), Object.keys(r.validation).length === 0 && (r.validation = void 0);
    }
    this.notifySchemaChange();
  }
  /** Load blocks and render inline picker for a blocks field (Phase 4) */
  async loadBlocksForField(e) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(e);
      return;
    }
    this.blocksLoading || (this.blocksLoading = !0, this.cachedBlocks = await Me(this.config.api), this.blocksLoading = !1, this.expandedFieldId === e.id && this.renderInlineBlockPickerForField(e));
  }
  /** Render and bind inline block picker into the DOM container */
  renderInlineBlockPickerForField(e) {
    const t = this.config.container.querySelector(
      `[data-blocks-picker-container="${e.id}"]`
    );
    if (!t || !this.cachedBlocks) return;
    const a = e.config ?? {}, r = ie(
      new Set(a.allowedBlocks ?? []),
      this.cachedBlocks
    );
    t.innerHTML = oe({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: r,
      label: "Allowed Blocks",
      accent: "blue"
    }), et(t, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: r,
      onSelectionChange: (s) => {
        e.config || (e.config = {});
        const i = e.config;
        i.allowedBlocks = s.size > 0 ? Array.from(s) : void 0, Object.keys(e.config).length === 0 && (e.config = void 0), this.notifySchemaChange();
      },
      label: "Allowed Blocks",
      accent: "blue"
    });
  }
  moveFieldToSection(e, t) {
    const a = this.fields.find((r) => r.id === e);
    a && (a.section = t === S ? void 0 : t, this.moveMenuFieldId = null, this.notifySchemaChange(), this.render());
  }
  // ===========================================================================
  // Field Reorder (Phase 10 — Task 10.1 drag, Task 10.2 keyboard)
  // ===========================================================================
  /** Move a field up (-1) or down (+1) within its section */
  moveFieldInSection(e, t) {
    const a = this.fields.find((c) => c.id === e);
    if (!a) return;
    const r = a.section || S, s = this.fields.filter((c) => (c.section || S) === r), i = s.findIndex((c) => c.id === e), n = i + t;
    if (n < 0 || n >= s.length) return;
    const l = this.fields.indexOf(s[i]), d = this.fields.indexOf(s[n]);
    [this.fields[l], this.fields[d]] = [this.fields[d], this.fields[l]], this.notifySchemaChange(), this.render();
  }
  /** Reorder a field by moving it before a target field in the same section */
  reorderFieldBefore(e, t) {
    if (e === t) return;
    const a = this.fields.find((d) => d.id === e), r = this.fields.find((d) => d.id === t);
    if (!a || !r) return;
    const s = a.section || S, i = r.section || S;
    if (s !== i) return;
    const n = this.fields.indexOf(a);
    this.fields.splice(n, 1);
    const l = this.fields.indexOf(r);
    this.fields.splice(l, 0, a), this.notifySchemaChange(), this.render();
  }
  /** Bind drag events on [data-field-card] for intra-section reordering */
  bindFieldReorderEvents(e) {
    e.querySelectorAll("[data-field-card]").forEach((a) => {
      const r = a.dataset.fieldCard, s = a.dataset.fieldSection;
      let i = !1;
      a.addEventListener("mousedown", (n) => {
        i = !!n.target.closest("[data-field-grip]");
      }), a.addEventListener("dragstart", (n) => {
        if (!i) {
          n.preventDefault();
          return;
        }
        this.dragReorder = { fieldId: r, sectionName: s }, n.dataTransfer.effectAllowed = "move", n.dataTransfer.setData(we, r), a.classList.add("opacity-50");
      }), a.addEventListener("dragend", () => {
        this.dragReorder = null, this.dropTargetFieldId = null, a.classList.remove("opacity-50"), e.querySelectorAll("[data-field-card]").forEach((n) => {
          n.classList.remove("border-t-2", "border-t-blue-400");
        });
      }), a.addEventListener("dragover", (n) => {
        this.dragReorder && this.dragReorder.sectionName === s && this.dragReorder.fieldId !== r && (n.preventDefault(), n.dataTransfer.dropEffect = "move", this.dropTargetFieldId !== r && (e.querySelectorAll("[data-field-card]").forEach((l) => {
          l.classList.remove("border-t-2", "border-t-blue-400");
        }), a.classList.add("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = r));
      }), a.addEventListener("dragleave", () => {
        this.dropTargetFieldId === r && (a.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null);
      }), a.addEventListener("drop", (n) => {
        n.preventDefault();
        const l = n.dataTransfer?.getData(we);
        a.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null, this.dragReorder = null, l && l !== r && this.reorderFieldBefore(l, r);
      });
    });
  }
  /** Bind section-select dropdown changes (Phase 10 — Task 10.3) */
  bindSectionSelectEvents(e) {
    e.querySelectorAll("[data-field-section-select]").forEach((t) => {
      t.addEventListener("change", () => {
        const a = t.dataset.fieldSectionSelect;
        let r = t.value;
        if (r === "__new__") {
          const s = prompt("Section name:");
          if (s && s.trim())
            r = s.trim().toLowerCase().replace(/\s+/g, "_");
          else {
            const i = this.fields.find((n) => n.id === a);
            t.value = i?.section || S;
            return;
          }
        }
        this.moveFieldToSection(a, r);
      });
    });
  }
  notifySchemaChange() {
    this.config.onSchemaChange(this.block.id, [...this.fields]);
  }
}
function p(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function I(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
const re = ["content", "media", "layout", "interactive", "custom"], Z = class Z {
  constructor(e) {
    this.listEl = null, this.searchInput = null, this.categorySelect = null, this.countEl = null, this.createBtn = null, this.editorEl = null, this.paletteEl = null, this.activeMenu = null, this.editorPanel = null, this.palettePanel = null, this.autosaveTimers = /* @__PURE__ */ new Map(), this.boundVisibilityChange = null, this.boundBeforeUnload = null, this.sidebarEl = null, this.paletteAsideEl = null, this.sidebarToggleBtn = null, this.gridEl = null, this.addFieldBar = null, this.paletteTriggerBtn = null, this.sidebarCollapsed = !1, this.mediaQueryLg = null, this.popoverPalettePanel = null, this.envSelectEl = null, this.currentEnvironment = "";
    const t = e.dataset.apiBasePath ?? "/admin";
    this.root = e, this.api = new q({ basePath: t }), this.state = {
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
    this.paletteEl && (this.palettePanel = new de({
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
    const t = this.state.blocks.find((a) => a.id === e);
    if (!t) return !1;
    this.cancelScheduledSave(e), this.markSaving(e), this.notifySaveState(e, "saving");
    try {
      const a = await this.api.updateBlockDefinition(e, {
        name: t.name,
        slug: t.slug,
        type: t.type,
        description: t.description,
        category: t.category,
        icon: t.icon,
        schema: t.schema,
        ui_schema: t.ui_schema
      });
      return this.updateBlockInState(e, a), this.markClean(e), this.notifySaveState(e, "saved"), !0;
    } catch (a) {
      const r = a instanceof Error ? a.message : "Save failed";
      return this.markSaveError(e, r), this.notifySaveState(e, "error", r), !1;
    }
  }
  /** Schedule an autosave after the debounce delay */
  scheduleSave(e) {
    this.cancelScheduledSave(e);
    const t = setTimeout(() => {
      this.autosaveTimers.delete(e), this.saveBlock(e);
    }, Z.AUTOSAVE_DELAY);
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
  notifySaveState(e, t, a) {
    this.editorPanel && this.state.selectedBlockId === e && this.editorPanel.updateSaveState(t, a);
  }
  // ===========================================================================
  // Status lifecycle (Phase 11 — Task 11.3)
  // ===========================================================================
  /** Handle status changes from the editor dropdown (publish/deprecate flow) */
  async handleEditorStatusChange(e, t) {
    const a = this.state.blocks.find((s) => s.id === e);
    if (!a) return;
    const r = a.status;
    if (r !== t) {
      if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
        this.showToast("Please fix save errors before changing status.", "error"), this.editorPanel?.revertStatus(r);
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
        if (s instanceof se && [404, 405, 501].includes(s.status))
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
        console.error("Status change failed:", s), this.showToast(n, "error"), this.editorPanel?.revertStatus(r);
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
    const a = document.createElement("div");
    a.className = "fixed z-50 w-72 max-h-[60vh] bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden", a.dataset.palettePopover = "", a.innerHTML = `
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
    `, a.querySelector("[data-palette-popover-close]")?.addEventListener("click", () => this.closePalettePopover());
    const r = e.getBoundingClientRect(), s = 288;
    let i = r.left, n = r.top - 8;
    i + s > window.innerWidth - 16 && (i = window.innerWidth - s - 16), i < 16 && (i = 16);
    const l = Math.min(window.innerHeight * 0.6, 480);
    n - l < 16 ? n = r.bottom + 8 : n = n - l, a.style.top = `${n}px`, a.style.left = `${i}px`, document.body.appendChild(t), document.body.appendChild(a);
    const d = a.querySelector("[data-palette-popover-content]");
    d && (this.popoverPalettePanel = new de({
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
  /** Initialize environment from URL param and session, bind selector */
  initEnvironment() {
    const t = new URLSearchParams(window.location.search).get("env") ?? "", a = sessionStorage.getItem("block-library-env") ?? "";
    this.currentEnvironment = t || a, this.api.setEnvironment(this.currentEnvironment), this.envSelectEl && (this.ensureEnvironmentOption(this.currentEnvironment), this.ensureEnvironmentOption("__add__", "Add environment..."), this.envSelectEl.value = this.currentEnvironment, this.envSelectEl.addEventListener("change", () => {
      const r = this.envSelectEl.value;
      if (r === "__add__") {
        this.promptForEnvironment();
        return;
      }
      this.setEnvironment(r);
    })), this.currentEnvironment && !t && this.updateUrlEnvironment(this.currentEnvironment), this.currentEnvironment && this.api.setEnvironmentSession(this.currentEnvironment).catch(() => {
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
    const a = e ?? "";
    if (a === "" || Array.from(this.envSelectEl.options).some((s) => s.value === a))
      return;
    const r = document.createElement("option");
    r.value = a, r.textContent = t ?? a, this.envSelectEl.appendChild(r);
  }
  promptForEnvironment() {
    if (!this.envSelectEl) return;
    const e = this.currentEnvironment;
    new $e({
      title: "Add Environment",
      label: "Environment name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      onConfirm: (a) => {
        const r = a.trim();
        r && (this.ensureEnvironmentOption(r), this.envSelectEl.value = r, this.setEnvironment(r));
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
    this.state.categories = [], this.mergeCategories(re), this.mergeCategories(this.loadUserCategories());
    try {
      const e = await this.api.getBlockCategories();
      this.mergeCategories(e);
    } catch {
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  refreshCategoriesFromBlocks() {
    this.state.categories.length === 0 && (this.mergeCategories(re), this.mergeCategories(this.loadUserCategories()));
    const e = new Set(this.state.categories.map((t) => this.normalizeCategory(t)));
    this.state.categories = Array.from(e);
    for (const t of this.state.blocks) {
      const a = this.normalizeCategory(t.category || "");
      a && !e.has(a) && (e.add(a), this.state.categories.push(a));
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  normalizeCategory(e) {
    return e.trim().toLowerCase();
  }
  mergeCategories(e) {
    for (const t of e) {
      const a = this.normalizeCategory(t);
      a && (this.state.categories.includes(a) || this.state.categories.push(a));
    }
  }
  loadUserCategories() {
    try {
      const e = sessionStorage.getItem("block-library-user-categories");
      if (!e) return [];
      const t = JSON.parse(e);
      return Array.isArray(t) ? t.map((a) => this.normalizeCategory(a)).filter((a) => a.length > 0) : [];
    } catch {
      return [];
    }
  }
  persistUserCategories() {
    const e = this.state.categories.filter((t) => !re.includes(t));
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
    const a = e ?? t.value;
    t.innerHTML = this.state.categories.map((r) => `<option value="${x(r)}">${x(K(r))}</option>`).join(""), t.innerHTML += '<option value="__add__">Add category...</option>', a && this.state.categories.includes(a) && (t.value = a);
  }
  promptForCategory(e, t) {
    new $e({
      title: "Add Category",
      label: "Category name",
      placeholder: "e.g. marketing",
      confirmLabel: "Add",
      onConfirm: (r) => {
        const s = this.addCategory(r);
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
          <p class="text-sm text-red-500">${x(this.state.error)}</p>
          <button type="button" data-block-ide-retry
                  class="mt-2 text-xs text-blue-600 hover:text-blue-700">
            Retry
          </button>
        </div>`;
      return;
    }
    const e = this.getFilteredBlocks();
    if (e.length === 0) {
      const a = this.state.search || this.state.categoryFilter;
      this.listEl.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">${a ? "No blocks match your filters." : "No blocks yet."}</p>
          ${a ? "" : '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "New Block" to create your first block definition.</p>'}
        </div>`;
      return;
    }
    let t = "";
    this.state.isCreating && (t += this.renderCreateForm()), t += '<ul class="p-2 space-y-0.5">';
    for (const a of e)
      t += this.renderBlockItem(a);
    if (t += "</ul>", this.listEl.innerHTML = t, this.state.isCreating) {
      const a = this.listEl.querySelector("[data-create-name]"), r = this.listEl.querySelector("[data-create-slug]"), s = this.listEl.querySelector("[data-create-category]");
      a?.focus(), a && r && (a.addEventListener("input", () => {
        r.dataset.userModified || (r.value = At(a.value));
      }), r.addEventListener("input", () => {
        r.dataset.userModified = "true";
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
      const a = this.listEl.querySelector("[data-rename-input]");
      a?.focus(), a?.select();
    }
  }
  renderBlockItem(e) {
    const t = e.id === this.state.selectedBlockId, a = e.id === this.state.renamingBlockId, r = this.state.dirtyBlocks.has(e.id), s = this.state.savingBlocks.has(e.id), i = this.state.saveErrors.get(e.id), n = e.slug || e.type || "", l = t ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" : "hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent", d = a ? `<input type="text" data-rename-input data-rename-block-id="${x(e.id)}"
               value="${x(e.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />` : `<span class="block font-medium text-gray-800 dark:text-gray-100 truncate text-[13px]">${x(e.name || "Untitled")}</span>`;
    let c = "";
    return i ? c = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Save failed: ${x(i)}"></span>` : s ? c = '<span class="flex-shrink-0 w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" title="Saving..."></span>' : r ? c = '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes"></span>' : c = Pt(e.status), `
      <li>
        <div data-block-id="${x(e.id)}"
             class="relative group w-full text-left px-3 py-2 text-sm rounded-lg border ${l} transition-colors flex items-center gap-2.5 cursor-pointer">
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            ${e.icon ? `<span class="text-xs font-medium">${x(e.icon)}</span>` : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>'}
          </span>
          <span class="flex-1 min-w-0">
            ${d}
            <span class="block text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">${x(n)}</span>
          </span>
          ${c}
          <button type="button" data-block-actions="${x(e.id)}"
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
                   class="${h()}" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Slug</label>
            <input type="text" data-create-slug placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_\\-]*$"
                   class="${h()} font-mono" />
            <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Category</label>
            <select data-create-category
                    class="${M()}">
              ${this.state.categories.map((e) => `<option value="${x(e)}">${x(K(e))}</option>`).join("")}
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
    const a = this.state.blocks.find((c) => c.id === e);
    if (!a) return;
    const r = document.createElement("div");
    r.setAttribute("data-block-context-menu", e), r.className = "absolute z-50 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm text-gray-700 dark:text-gray-300";
    const s = [
      { label: "Rename", action: "rename", icon: O.rename },
      { label: "Duplicate", action: "duplicate", icon: O.duplicate }
    ];
    a.status === "draft" ? s.push({ label: "Publish", action: "publish", icon: O.publish }) : a.status === "active" && s.push({ label: "Deprecate", action: "deprecate", icon: O.deprecate }), s.push({ label: "Delete", action: "delete", icon: O.delete, danger: !0 }), r.innerHTML = s.map(
      (c) => `
        <button type="button" data-menu-action="${c.action}" data-menu-block-id="${x(e)}"
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${c.danger ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : ""}">
          ${c.icon}
          <span>${c.label}</span>
        </button>`
    ).join("");
    const i = t.getBoundingClientRect(), n = 176;
    r.style.position = "fixed", r.style.top = `${i.bottom + 4}px`;
    let l = i.left;
    l + n > window.innerWidth - 8 && (l = window.innerWidth - n - 8), l < 8 && (l = 8), r.style.left = `${l}px`, document.body.appendChild(r);
    const d = r.getBoundingClientRect();
    d.bottom > window.innerHeight - 8 && (r.style.top = `${i.top - d.height - 4}px`), r.addEventListener("click", (c) => {
      const v = c.target.closest("[data-menu-action]");
      if (!v) return;
      const k = v.dataset.menuAction, u = v.dataset.menuBlockId;
      this.closeContextMenu(), this.handleAction(k, u);
    }), this.activeMenu = () => {
      r.remove(), this.activeMenu = null;
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
        t.value = e, t.textContent = K(e), e === this.state.categoryFilter && (t.selected = !0), this.categorySelect.appendChild(t);
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
    this.editorPanel ? this.editorPanel.update(e) : (this.editorPanel = new jt({
      container: this.editorEl,
      block: e,
      categories: this.state.categories,
      api: this.api,
      onMetadataChange: (t, a) => this.handleEditorMetadataChange(t, a),
      onSchemaChange: (t, a) => this.handleEditorSchemaChange(t, a),
      onFieldDrop: (t) => this.handlePaletteAddField(t),
      onStatusChange: (t, a) => this.handleEditorStatusChange(t, a),
      onSave: (t) => this.saveBlock(t)
    }), this.editorPanel.render()), this.palettePanel?.enable(), this.updateAddFieldBar();
  }
  handleEditorMetadataChange(e, t) {
    const a = this.state.blocks.findIndex((i) => i.id === e);
    if (a < 0) return;
    const r = this.state.blocks[a], s = { ...r, ...t };
    if (t.slug !== void 0 && t.slug !== r.slug) {
      const i = (t.slug ?? "").trim();
      i && (!t.type && (!r.type || r.type === r.slug) && (s.type = i, t.type = i), s.schema && typeof s.schema == "object" && (s.schema = { ...s.schema, $id: i }));
    }
    this.state.blocks[a] = s, this.markDirty(e), (t.name !== void 0 || t.status !== void 0 || t.slug !== void 0 || t.type !== void 0) && this.updateBlockItemDOM(e, s), this.scheduleSave(e);
  }
  handleEditorSchemaChange(e, t) {
    const a = this.state.blocks.findIndex((n) => n.id === e);
    if (a < 0) return;
    const r = this.state.blocks[a].schema, s = this.state.blocks[a].slug || this.state.blocks[a].type;
    let i = Se(t, s);
    i = this.mergeSchemaExtras(r, i), this.state.blocks[a] = {
      ...this.state.blocks[a],
      schema: i
    }, this.markDirty(e), this.scheduleSave(e);
  }
  /** Handle adding a field from the palette (Phase 9 — click or drop) */
  handlePaletteAddField(e) {
    if (!this.editorPanel || !this.state.selectedBlockId) return;
    const t = e.type === "blocks", a = t ? "Content Blocks" : e?.label ?? K(e.type), r = t ? "content_blocks" : e.type.replace(/-/g, "_"), s = new Set(this.editorPanel.getFields().map((d) => d.name));
    let i = r, n = 1;
    for (; s.has(i); )
      i = t ? `content_blocks_${n++}` : `${r}_${n++}`;
    const l = {
      id: z(),
      name: i,
      type: e.type,
      label: n > 1 && t ? `Content Blocks ${n - 1}` : a,
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
        (a) => a.name.toLowerCase().includes(t) || a.type.toLowerCase().includes(t) || (a.slug?.toLowerCase().includes(t) ?? !1) || (a.description?.toLowerCase().includes(t) ?? !1)
      );
    }
    if (this.state.categoryFilter) {
      const t = this.state.categoryFilter.toLowerCase().trim();
      e = e.filter((a) => (a.category || "custom").toLowerCase().trim() === t);
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
    const a = t.closest("[data-block-actions]");
    if (a) {
      e.stopPropagation();
      const i = a.dataset.blockActions;
      this.renderContextMenu(i, a);
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
    const e = this.listEl?.querySelector("[data-create-name]"), t = this.listEl?.querySelector("[data-create-slug]"), a = this.listEl?.querySelector("[data-create-category]"), r = this.listEl?.querySelector("[data-create-error]"), s = e?.value.trim() ?? "", i = t?.value.trim() ?? "";
    let n = a?.value ?? "custom";
    if (n === "__add__" && (n = "custom"), !s) {
      this.showCreateError(r, "Name is required."), e?.focus();
      return;
    }
    if (!i) {
      this.showCreateError(r, "Slug is required."), t?.focus();
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(i)) {
      this.showCreateError(r, "Slug must start with a letter and contain only lowercase, numbers, hyphens, underscores."), t?.focus();
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
      const c = d instanceof se ? d.message : "Failed to create block.";
      this.showCreateError(r, c), l && (l.disabled = !1, l.textContent = "Create");
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
    t && (t.addEventListener("keydown", (a) => {
      a.key === "Enter" && (a.preventDefault(), this.commitRename(e, t.value.trim())), a.key === "Escape" && (a.preventDefault(), this.cancelRename());
    }), t.addEventListener("blur", () => {
      const a = this.state.blocks.find((r) => r.id === e);
      a && t.value.trim() && t.value.trim() !== a.name ? this.commitRename(e, t.value.trim()) : this.cancelRename();
    }));
  }
  async commitRename(e, t) {
    if (!t) {
      this.cancelRename();
      return;
    }
    const a = this.state.blocks.find((r) => r.id === e);
    if (!a || a.name === t) {
      this.cancelRename();
      return;
    }
    try {
      const r = await this.api.updateBlockDefinition(e, { name: t });
      this.updateBlockInState(e, r);
    } catch (r) {
      console.error("Rename failed:", r);
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
    const r = `${(t.slug || t.type || "block").trim()}_copy`, s = r;
    try {
      const i = await this.api.cloneBlockDefinition(e, s, r), n = this.normalizeBlockDefinition(i);
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
        const a = this.state.blocks.find((r) => r.id === e);
        a && this.editorPanel.update(a);
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
        const a = this.state.blocks.find((r) => r.id === e);
        a && this.editorPanel.update(a);
      }
    } catch (t) {
      console.error("Deprecate failed:", t), this.showToast(t instanceof Error ? t.message : "Failed to deprecate block.", "error");
    }
  }
  // ===========================================================================
  // Delete Block (Task 7.3)
  // ===========================================================================
  async deleteBlock(e) {
    const t = this.state.blocks.find((r) => r.id === e);
    if (!(!t || !confirm(`Delete "${t.name}"? This cannot be undone.`)))
      try {
        await this.api.deleteBlockDefinition(e), this.state.blocks = this.state.blocks.filter((r) => r.id !== e), this.state.dirtyBlocks.delete(e), this.state.savingBlocks.delete(e), this.state.saveErrors.delete(e), this.state.selectedBlockId === e && (this.state.selectedBlockId = null, this.renderEditor()), this.updateCount(), this.renderBlockList();
      } catch (r) {
        console.error("Delete failed:", r), this.showToast(r instanceof Error ? r.message : "Failed to delete block.", "error");
      }
  }
  // ===========================================================================
  // Helpers
  // ===========================================================================
  /** Update a single block item in the sidebar DOM without re-rendering the entire list */
  updateBlockItemDOM(e, t) {
    const a = this.listEl?.querySelector(`[data-block-id="${e}"]`);
    if (!a) return;
    const r = a.querySelector(".flex-1.min-w-0");
    if (!r) return;
    const s = r.querySelectorAll(":scope > span");
    s.length >= 1 && !this.state.renamingBlockId && (s[0].textContent = t.name || "Untitled"), s.length >= 2 && (s[1].textContent = t.slug || t.type || "");
  }
  updateBlockInState(e, t) {
    const a = this.state.blocks.findIndex((r) => r.id === e);
    if (a >= 0) {
      const r = this.state.blocks[a], s = this.mergeBlockDefinition(r, t);
      this.state.blocks[a] = s;
    }
  }
  normalizeBlockDefinition(e) {
    const t = { ...e }, a = (t.slug ?? "").trim(), r = (t.type ?? "").trim();
    return !a && r && (t.slug = r), !r && a && (t.type = a), t;
  }
  mergeBlockDefinition(e, t) {
    const a = { ...e, ...t }, r = (t.slug ?? "").trim(), s = (t.type ?? "").trim();
    !r && e.slug && (a.slug = e.slug), !s && e.type && (a.type = e.type);
    const i = (a.slug ?? "").trim(), n = (a.type ?? "").trim();
    return !i && n && (a.slug = n), !n && i && (a.type = i), a;
  }
  mergeSchemaExtras(e, t) {
    if (!e || typeof e != "object")
      return t;
    const a = { ...t }, r = /* @__PURE__ */ new Set(["properties", "required", "type", "$schema"]);
    for (const [s, i] of Object.entries(e))
      if (!r.has(s)) {
        if (s === "$id") {
          !a.$id && i && (a.$id = i);
          continue;
        }
        s in a || (a[s] = i);
      }
    return a;
  }
  showToast(e, t = "info") {
    const r = window.notify?.[t];
    if (typeof r == "function") {
      r(e);
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
Z.AUTOSAVE_DELAY = 1500;
let pe = Z;
class $e extends E {
  constructor(e) {
    super({ size: "sm", initialFocus: "[data-prompt-input]" }), this.config = e;
  }
  renderContent() {
    return `
      <div class="p-5">
        <div class="text-base font-semibold text-gray-900 dark:text-white">${x(this.config.title)}</div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1">${x(this.config.label)}</label>
        <input type="text"
               data-prompt-input
               value="${x(this.config.initialValue ?? "")}"
               placeholder="${x(this.config.placeholder ?? "")}"
               class="${h()}" />
        <div data-prompt-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button type="button" data-prompt-cancel
                  class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            ${x(this.config.cancelLabel ?? "Cancel")}
          </button>
          <button type="button" data-prompt-confirm
                  class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            ${x(this.config.confirmLabel ?? "Save")}
          </button>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-prompt-input]"), t = this.container?.querySelector("[data-prompt-error]"), a = this.container?.querySelector("[data-prompt-confirm]"), r = this.container?.querySelector("[data-prompt-cancel]"), s = (n) => {
      t && (t.textContent = n, t.classList.remove("hidden"));
    }, i = () => {
      const n = e?.value.trim() ?? "";
      if (!n) {
        s("Value is required."), e?.focus();
        return;
      }
      this.config.onConfirm(n), this.hide();
    };
    a?.addEventListener("click", i), e?.addEventListener("keydown", (n) => {
      n.key === "Enter" && (n.preventDefault(), i());
    }), r?.addEventListener("click", () => {
      this.config.onCancel?.(), this.hide();
    });
  }
}
function x(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function K(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function At(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function Pt(o) {
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
const O = {
  rename: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  duplicate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  publish: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  deprecate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>',
  delete: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'
};
function qt(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-ide]")).forEach((t) => {
    if (t.dataset.ideInitialized !== "true")
      try {
        new pe(t).init(), t.dataset.ideInitialized = "true";
      } catch (a) {
        console.error("Block Library IDE failed to initialize:", a);
      }
  });
}
function _t(o = document) {
  Array.from(o.querySelectorAll("[data-content-type-editor-root]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const a = It(t);
    if (!a.apiBasePath) {
      console.warn("Content type editor missing apiBasePath", t);
      return;
    }
    a.onCancel || (a.onCancel = () => {
      window.location.href = `${a.apiBasePath}/content_types`;
    }), a.onSave || (a.onSave = (r) => {
      const s = r.slug ?? r.id;
      s && (window.location.href = `${a.apiBasePath}/content_types?slug=${encodeURIComponent(s)}`);
    });
    try {
      new kt(t, a).init(), t.dataset.initialized = "true";
    } catch (r) {
      console.error("Content type editor failed to initialize:", r), t.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${r instanceof Error ? r.message : "An unexpected error occurred while initializing the editor."}
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
function It(o) {
  const e = o.getAttribute("data-content-type-editor-config");
  if (e)
    try {
      return JSON.parse(e);
    } catch {
    }
  return {
    apiBasePath: o.dataset.apiBasePath ?? "/admin",
    contentTypeId: o.dataset.contentTypeId,
    locale: o.dataset.locale
  };
}
function Ht(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
Ht(() => {
  _t(), qt();
});
export {
  jt as BlockEditorPanel,
  pe as BlockLibraryIDE,
  Bt as BlockLibraryManager,
  q as ContentTypeAPIClient,
  se as ContentTypeAPIError,
  kt as ContentTypeEditor,
  Ce as FIELD_CATEGORIES,
  X as FIELD_TYPES,
  ne as FieldConfigForm,
  de as FieldPalettePanel,
  Be as FieldTypePicker,
  st as LayoutEditor,
  le as PALETTE_DRAG_MIME,
  H as fieldsToSchema,
  z as generateFieldId,
  ee as getFieldTypeMetadata,
  Nt as getFieldTypesByCategory,
  qt as initBlockLibraryIDE,
  Tt as initBlockLibraryManagers,
  _t as initContentTypeEditors,
  Q as schemaToFields
};
//# sourceMappingURL=index.js.map
