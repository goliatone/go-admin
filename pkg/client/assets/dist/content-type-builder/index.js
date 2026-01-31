class K extends Error {
  constructor(e, t, r, a) {
    super(e), this.name = "ContentTypeAPIError", this.status = t, this.textCode = r, this.fields = a;
  }
}
class $ {
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
    const r = t.toString(), a = `${this.config.basePath}/api/content_types${r ? `?${r}` : ""}`, i = await (await this.fetch(a, { method: "GET" })).json();
    return Array.isArray(i) ? { items: i, total: i.length } : i.items && Array.isArray(i.items) ? i : i.data && Array.isArray(i.data) ? { items: i.data, total: i.total ?? i.data.length } : { items: [], total: 0 };
  }
  /**
   * Get a single content type by ID or slug
   */
  async get(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}`, a = await (await this.fetch(t, { method: "GET" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Create a new content type
   */
  async create(e) {
    const t = `${this.config.basePath}/api/content_types`, a = await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Update an existing content type
   */
  async update(e, t) {
    const r = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}`, s = await (await this.fetch(r, {
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
    const r = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/publish`, s = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ force: t ?? !1 })
    })).json();
    return s.item ?? s.data ?? s;
  }
  /**
   * Deprecate a content type
   */
  async deprecate(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/deprecate`, a = await (await this.fetch(t, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Clone a content type
   */
  async clone(e, t, r) {
    const a = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ slug: t, name: r })
    })).json();
    return i.item ?? i.data ?? i;
  }
  /**
   * Check compatibility between current schema and a new schema
   */
  async checkCompatibility(e, t, r) {
    const a = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/compatibility`;
    return await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ schema: t, ui_schema: r })
    })).json();
  }
  /**
   * Get content type schema version history
   */
  async getVersionHistory(e) {
    const t = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/versions`;
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
    e?.page && t.set("page", String(e.page)), e?.per_page && t.set("per_page", String(e.per_page)), e?.search && t.set("search", e.search), e?.category && t.set("category", e.category), e?.status && t.set("status", e.status);
    const r = t.toString(), a = `${this.config.basePath}/api/block_definitions${r ? `?${r}` : ""}`;
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
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}`, a = await (await this.fetch(t, { method: "GET" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Create a new block definition
   */
  async createBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions`, a = await (await this.fetch(t, {
      method: "POST",
      body: JSON.stringify(e)
    })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Update an existing block definition
   */
  async updateBlockDefinition(e, t) {
    const r = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}`, s = await (await this.fetch(r, {
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
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/publish`, a = await (await this.fetch(t, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Deprecate a block definition
   */
  async deprecateBlockDefinition(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/deprecate`, a = await (await this.fetch(t, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  /**
   * Clone a block definition
   */
  async cloneBlockDefinition(e, t, r) {
    const a = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ type: t, slug: r })
    })).json();
    return i.item ?? i.data ?? i;
  }
  /**
   * Get block definition schema version history
   */
  async getBlockDefinitionVersions(e) {
    const t = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/versions`;
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
    const e = `${this.config.basePath}/api/block_definitions/categories`;
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
    const e = `${this.config.basePath}/api/block_definitions/field_types`;
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
    const e = `${this.config.basePath}/api/block_definitions/field_types`;
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
      t = await e.json();
    } catch {
    }
    const r = t?.error ?? e.statusText ?? "Request failed";
    throw new K(r, e.status, t?.text_code, t?.fields);
  }
}
function C(o, e) {
  const t = {}, r = [];
  for (const s of o)
    t[s.name] = Z(s), s.required && r.push(s.name);
  const a = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: t
  };
  return e && (a.$id = e), r.length > 0 && (a.required = r), a;
}
function Z(o) {
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
  const a = {}, s = X(o.type);
  switch (s && (a.widget = s), o.placeholder && (a.placeholder = o.placeholder), o.helpText && (a.helpText = o.helpText), o.section && (a.section = o.section), o.order !== void 0 && (a.order = o.order), o.gridSpan !== void 0 && (a.grid = { span: o.gridSpan }), o.readonly && (a.readonly = !0), o.hidden && (a.hidden = !0), Object.keys(a).length > 0 && (e["x-formgen"] = a), o.type) {
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
      o.config && "fields" in o.config && o.config.fields && (e.items = C(o.config.fields));
      break;
    case "blocks": {
      const i = o.config, l = {
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
      i?.allowedBlocks && i.allowedBlocks.length > 0 && (l.oneOf = i.allowedBlocks.map((d) => ({
        type: "object",
        properties: {
          _type: { const: d }
        },
        required: ["_type"]
      })), l["x-discriminator"] = "_type"), e.items = l, i?.minBlocks !== void 0 && (e.minItems = i.minBlocks), i?.maxBlocks !== void 0 && (e.maxItems = i.maxBlocks);
      const n = {
        ...a,
        widget: "block",
        sortable: !0
      };
      i?.allowedBlocks && (n.allowedBlocks = i.allowedBlocks), i?.deniedBlocks && (n.deniedBlocks = i.deniedBlocks), e["x-formgen"] = n;
      break;
    }
  }
  return e;
}
function X(o) {
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
function F(o) {
  if (!o.properties)
    return [];
  const e = new Set(o.required ?? []), t = [];
  for (const [r, a] of Object.entries(o.properties))
    t.push(ee(r, a, e.has(r)));
  return t.sort((r, a) => (r.order ?? 999) - (a.order ?? 999)), t;
}
function ee(o, e, t) {
  const r = e["x-formgen"], a = {
    id: j(),
    name: o,
    type: te(e),
    label: e.title ?? V(o),
    description: e.description,
    placeholder: r?.placeholder,
    helpText: r?.helpText,
    required: t,
    readonly: r?.readonly,
    hidden: r?.hidden,
    defaultValue: e.default,
    section: r?.section,
    gridSpan: r?.grid?.span,
    order: r?.order
  }, s = {};
  if (e.minLength !== void 0 && (s.minLength = e.minLength), e.maxLength !== void 0 && (s.maxLength = e.maxLength), e.minimum !== void 0 && (s.min = e.minimum), e.maximum !== void 0 && (s.max = e.maximum), e.pattern && (s.pattern = e.pattern), Object.keys(s).length > 0 && (a.validation = s), e.enum && Array.isArray(e.enum) && (a.config = {
    options: e.enum.map((i) => ({
      value: String(i),
      label: V(String(i))
    }))
  }), a.type === "blocks" && e.type === "array") {
    const i = {};
    if (e.minItems !== void 0 && (i.minBlocks = e.minItems), e.maxItems !== void 0 && (i.maxBlocks = e.maxItems), r?.allowedBlocks && Array.isArray(r.allowedBlocks))
      i.allowedBlocks = r.allowedBlocks;
    else if (e.items) {
      const l = e.items;
      if (l.oneOf && Array.isArray(l.oneOf)) {
        const n = l.oneOf.map((d) => d.properties?._type?.const).filter((d) => !!d);
        n.length > 0 && (i.allowedBlocks = n);
      }
    }
    r?.deniedBlocks && Array.isArray(r.deniedBlocks) && (i.deniedBlocks = r.deniedBlocks), Object.keys(i).length > 0 && (a.config = i);
  }
  return a;
}
function te(o) {
  const e = o["x-formgen"];
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
        const r = o.items;
        if (r.oneOf) return "blocks";
        if (r.enum) return "chips";
      }
      return "repeater";
    case "object":
      return "json";
    default:
      return "text";
  }
}
function j() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function V(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
const re = {
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
function A(o) {
  return re[o] ?? "";
}
function q(o) {
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
function u(o) {
  return A(o);
}
const N = [
  // Text Fields
  {
    type: "text",
    label: "Text",
    description: "Single line text input",
    icon: u("text"),
    category: "text",
    defaultConfig: { validation: { maxLength: 255 } }
  },
  {
    type: "textarea",
    label: "Textarea",
    description: "Multi-line text input",
    icon: u("textarea"),
    category: "text",
    defaultConfig: { config: { multiline: !0, rows: 4 } }
  },
  {
    type: "rich-text",
    label: "Rich Text",
    description: "WYSIWYG editor with formatting",
    icon: u("rich-text"),
    category: "text"
  },
  {
    type: "markdown",
    label: "Markdown",
    description: "Markdown text editor",
    icon: u("markdown"),
    category: "text"
  },
  {
    type: "code",
    label: "Code",
    description: "Code editor with syntax highlighting",
    icon: u("code"),
    category: "text",
    defaultConfig: { config: { language: "json", lineNumbers: !0 } }
  },
  // Number Fields
  {
    type: "number",
    label: "Number",
    description: "Decimal number input",
    icon: u("number"),
    category: "number"
  },
  {
    type: "integer",
    label: "Integer",
    description: "Whole number input",
    icon: u("integer"),
    category: "number"
  },
  {
    type: "currency",
    label: "Currency",
    description: "Money amount with currency symbol",
    icon: u("currency"),
    category: "number",
    defaultConfig: { config: { precision: 2, prefix: "$" } }
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "Percentage value (0-100)",
    icon: u("percentage"),
    category: "number",
    defaultConfig: { validation: { min: 0, max: 100 }, config: { suffix: "%" } }
  },
  // Selection Fields
  {
    type: "select",
    label: "Select",
    description: "Dropdown selection",
    icon: u("select"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "radio",
    label: "Radio",
    description: "Radio button selection",
    icon: u("radio"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "checkbox",
    label: "Checkbox",
    description: "Single checkbox (true/false)",
    icon: u("checkbox"),
    category: "selection"
  },
  {
    type: "chips",
    label: "Chips",
    description: "Tag-style multi-select",
    icon: u("chips"),
    category: "selection",
    defaultConfig: { config: { options: [], multiple: !0 } }
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "Boolean switch",
    icon: u("toggle"),
    category: "selection"
  },
  // Date/Time Fields
  {
    type: "date",
    label: "Date",
    description: "Date picker",
    icon: u("date"),
    category: "datetime"
  },
  {
    type: "time",
    label: "Time",
    description: "Time picker",
    icon: u("time"),
    category: "datetime"
  },
  {
    type: "datetime",
    label: "Date & Time",
    description: "Date and time picker",
    icon: u("datetime"),
    category: "datetime"
  },
  // Media Fields
  {
    type: "media-picker",
    label: "Media",
    description: "Single media asset picker",
    icon: u("media-picker"),
    category: "media",
    defaultConfig: { config: { accept: "image/*" } }
  },
  {
    type: "media-gallery",
    label: "Gallery",
    description: "Multiple media assets",
    icon: u("media-gallery"),
    category: "media",
    defaultConfig: { config: { accept: "image/*", multiple: !0 } }
  },
  {
    type: "file-upload",
    label: "File",
    description: "File attachment",
    icon: u("file-upload"),
    category: "media"
  },
  // Reference Fields
  {
    type: "reference",
    label: "Reference",
    description: "Link to another content type",
    icon: u("reference"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name" } }
  },
  {
    type: "references",
    label: "References",
    description: "Multiple links to another content type",
    icon: u("references"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name", multiple: !0 } }
  },
  {
    type: "user",
    label: "User",
    description: "User reference",
    icon: u("user"),
    category: "reference"
  },
  // Structural Fields
  {
    type: "group",
    label: "Group",
    description: "Collapsible field group",
    icon: u("group"),
    category: "structural"
  },
  {
    type: "repeater",
    label: "Repeater",
    description: "Repeatable field group",
    icon: u("repeater"),
    category: "structural",
    defaultConfig: { config: { fields: [], minItems: 0, maxItems: 10 } }
  },
  {
    type: "blocks",
    label: "Blocks",
    description: "Modular content blocks",
    icon: u("blocks"),
    category: "structural",
    defaultConfig: { config: { allowedBlocks: [] } }
  },
  // Advanced Fields
  {
    type: "json",
    label: "JSON",
    description: "Raw JSON editor",
    icon: u("json"),
    category: "advanced"
  },
  {
    type: "slug",
    label: "Slug",
    description: "URL-friendly identifier",
    icon: u("slug"),
    category: "advanced",
    defaultConfig: { validation: { pattern: "^[a-z0-9-]+$" } }
  },
  {
    type: "color",
    label: "Color",
    description: "Color picker",
    icon: u("color"),
    category: "advanced"
  },
  {
    type: "location",
    label: "Location",
    description: "Geographic coordinates",
    icon: u("location"),
    category: "advanced"
  }
], ae = [
  { id: "text", label: "Text", icon: u("cat-text") },
  { id: "number", label: "Numbers", icon: u("cat-number") },
  { id: "selection", label: "Selection", icon: u("cat-selection") },
  { id: "datetime", label: "Date & Time", icon: u("cat-datetime") },
  { id: "media", label: "Media", icon: u("cat-media") },
  { id: "reference", label: "References", icon: u("cat-reference") },
  { id: "structural", label: "Structural", icon: u("cat-structural") },
  { id: "advanced", label: "Advanced", icon: u("cat-advanced") }
];
function T(o) {
  const e = q(String(o));
  return N.find((t) => t.type === e);
}
function Pe(o) {
  return N.filter((e) => e.category === o);
}
class J {
  constructor(e) {
    this.container = null, this.backdrop = null, this.selectedCategory = "text", this.searchQuery = "", this.config = e;
  }
  /**
   * Show the field type picker modal
   */
  show() {
    this.render(), this.bindEvents(), this.container?.querySelector("[data-field-type-search]")?.focus();
  }
  /**
   * Hide the field type picker modal
   */
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150", this.backdrop.setAttribute("data-field-type-picker-backdrop", "true"), this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden", this.container.setAttribute("data-field-type-picker", "true"), this.container.innerHTML = `
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  renderCategories() {
    return ae.map(
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
    let t = N.filter((r) => !e.has(r.type));
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
  bindEvents() {
    if (!this.container || !this.backdrop) return;
    this.backdrop.addEventListener("click", (t) => {
      t.target === this.backdrop && (this.config.onCancel(), this.hide());
    }), this.container.querySelector("[data-field-type-close]")?.addEventListener("click", () => {
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
    }), this.container.addEventListener("keydown", (t) => {
      t.key === "Escape" && (this.config.onCancel(), this.hide());
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
class _ {
  constructor(e) {
    this.container = null, this.backdrop = null, this.config = e, this.field = { ...e.field }, this.isNewField = !e.field.id || e.field.id.startsWith("new_");
  }
  /**
   * Show the field config form modal
   */
  show() {
    this.render(), this.bindEvents();
    const e = this.container?.querySelector('input[name="name"]');
    e?.focus(), e?.select();
  }
  /**
   * Hide the field config form modal
   */
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    const e = T(this.field.type);
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150", this.backdrop.setAttribute("data-field-config-backdrop", "true"), this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden", this.container.setAttribute("data-field-config-form", "true"), this.container.innerHTML = `
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  renderGeneralSection() {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">General</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value="${p(this.field.name)}"
              placeholder="field_name"
              pattern="^[a-z][a-z0-9_]*$"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Lowercase letters, numbers, underscores. Starts with letter.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="label"
              value="${p(this.field.label)}"
              placeholder="Field Label"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows="2"
            placeholder="Help text for editors"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          >${p(this.field.description ?? "")}</textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${p(this.field.placeholder ?? "")}"
            placeholder="Placeholder text"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="required"
              ${this.field.required ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="readonly"
              ${this.field.readonly ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Read-only</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="hidden"
              ${this.field.hidden ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
    ), r = ["number", "integer", "currency", "percentage"].includes(this.field.type);
    return !t && !r ? "" : `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Validation</h3>

        <div class="grid grid-cols-2 gap-4">
          ${t ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Length
              </label>
              <input
                type="number"
                name="minLength"
                value="${e.minLength ?? ""}"
                min="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Length
              </label>
              <input
                type="number"
                name="maxLength"
                value="${e.maxLength ?? ""}"
                min="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ` : ""}

          ${r ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum
              </label>
              <input
                type="number"
                name="min"
                value="${e.min ?? ""}"
                step="any"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum
              </label>
              <input
                type="number"
                name="max"
                value="${e.max ?? ""}"
                step="any"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ` : ""}
        </div>

        ${t ? `
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pattern (RegEx)
            </label>
            <input
              type="text"
              name="pattern"
              value="${p(e.pattern ?? "")}"
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Section/Tab
            </label>
            <input
              type="text"
              name="section"
              value="${p(this.field.section ?? "")}"
              placeholder="main"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Span (1-12)
            </label>
            <input
              type="number"
              name="gridSpan"
              value="${this.field.gridSpan ?? ""}"
              min="1"
              max="12"
              placeholder="12"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value="${p(String(a.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${s}"
                  value="${p(a.label)}"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Content Type
              </label>
              <input
                type="text"
                name="target"
                value="${p(t?.target ?? "")}"
                placeholder="users"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Field
              </label>
              <input
                type="text"
                name="displayField"
                value="${p(t?.displayField ?? "")}"
                placeholder="name"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Accept Types
              </label>
              <input
                type="text"
                name="accept"
                value="${p(t?.accept ?? "")}"
                placeholder="image/*"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Size (MB)
              </label>
              <input
                type="number"
                name="maxSize"
                value="${t?.maxSize ?? ""}"
                min="0"
                placeholder="10"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          ${this.field.type === "media-gallery" ? `
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="multiple"
                ${t?.multiple !== !1 ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              name="language"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source Field
            </label>
            <input
              type="text"
              name="sourceField"
              value="${p(t?.sourceField ?? "")}"
              placeholder="title"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Field name to generate slug from (e.g., title)</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prefix
              </label>
              <input
                type="text"
                name="slugPrefix"
                value="${p(t?.prefix ?? "")}"
                placeholder=""
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Suffix
              </label>
              <input
                type="text"
                name="slugSuffix"
                value="${p(t?.suffix ?? "")}"
                placeholder=""
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Separator
              </label>
              <select
                name="slugSeparator"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format
              </label>
              <select
                name="colorFormat"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Allow transparency (alpha)</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color Presets (comma-separated)
            </label>
            <input
              type="text"
              name="colorPresets"
              value="${p(t?.presets?.join(", ") ?? "")}"
              placeholder="#ff0000, #00ff00, #0000ff"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Latitude
              </label>
              <input
                type="number"
                name="defaultLat"
                value="${t?.defaultCenter?.lat ?? ""}"
                step="any"
                placeholder="40.7128"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Longitude
              </label>
              <input
                type="number"
                name="defaultLng"
                value="${t?.defaultCenter?.lng ?? ""}"
                step="any"
                placeholder="-74.0060"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Zoom
              </label>
              <input
                type="number"
                name="defaultZoom"
                value="${t?.defaultZoom ?? ""}"
                min="1"
                max="20"
                placeholder="12"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="searchEnabled"
              ${t?.searchEnabled !== !1 ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Date
              </label>
              <input
                type="date"
                name="minDate"
                value="${p(t?.minDate ?? "")}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Date
              </label>
              <input
                type="date"
                name="maxDate"
                value="${p(t?.maxDate ?? "")}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowSameDay"
              ${t?.allowSameDay !== !1 ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Items
              </label>
              <input
                type="number"
                name="minItems"
                value="${t?.minItems ?? ""}"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Items
              </label>
              <input
                type="number"
                name="maxItems"
                value="${t?.maxItems ?? ""}"
                min="1"
                placeholder="10"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="collapsed"
              ${t?.collapsed ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Blocks
              </label>
              <input
                type="number"
                name="minBlocks"
                value="${t?.minBlocks ?? ""}"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Blocks
              </label>
              <input
                type="number"
                name="maxBlocks"
                value="${t?.maxBlocks ?? ""}"
                min="1"
                placeholder="No limit"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${p(s)}">${p(s)}<button type="button" data-remove-allowed="${p(s)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'}
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${p(r)}' />
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
        (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${p(s)}">${p(s)}<button type="button" data-remove-denied="${p(s)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'}
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${p(a)}' />
          </div>
        </div>
      `);
    }
    return e.join("");
  }
  bindEvents() {
    if (!this.container || !this.backdrop) return;
    this.backdrop.addEventListener("click", (r) => {
      r.target === this.backdrop && (this.config.onCancel(), this.hide());
    }), this.container.querySelector("[data-field-config-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-field-config-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-field-config-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container.querySelector("[data-field-config-form-element]")?.addEventListener("submit", (r) => {
      r.preventDefault(), this.handleSave();
    }), this.container.addEventListener("keydown", (r) => {
      r.key === "Escape" && (this.config.onCancel(), this.hide());
    });
    const e = this.container.querySelector('input[name="name"]'), t = this.container.querySelector('input[name="label"]');
    e && t && this.isNewField && (t.addEventListener("input", () => {
      e.dataset.userModified || (e.value = se(t.value));
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
    const t = this.container?.querySelector(`input[name="${e}Blocks"]`), r = t?.value ? JSON.parse(t.value) : [];
    new ie({
      apiBasePath: this.config.apiBasePath ?? "/admin",
      selectedBlocks: r,
      title: e === "allowed" ? "Select Allowed Blocks" : "Select Denied Blocks",
      onSelect: (s) => {
        this.updateBlockList(e, s);
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
          (i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${s}-100 text-${s}-700 dark:bg-${s}-900/30 dark:text-${s}-400" data-block-chip="${p(i)}">${p(i)}<button type="button" data-remove-${e}="${p(i)}" class="hover:text-${s}-900 dark:hover:text-${s}-200">&times;</button></span>`
        ).join(""), a.querySelectorAll(`[data-remove-${e}]`).forEach((i) => {
          i.addEventListener("click", (l) => {
            l.preventDefault();
            const n = i.getAttribute(`data-remove-${e}`);
            n && this.removeBlockFromList(e, n);
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
    const l = {
      id: this.field.id || j(),
      name: r,
      type: this.field.type,
      label: i,
      description: t.get("description")?.trim() || void 0,
      placeholder: t.get("placeholder")?.trim() || void 0,
      required: t.get("required") === "on",
      readonly: t.get("readonly") === "on",
      hidden: t.get("hidden") === "on",
      section: t.get("section")?.trim() || void 0,
      gridSpan: t.get("gridSpan") ? parseInt(t.get("gridSpan"), 10) : void 0
    }, n = {}, d = t.get("minLength");
    d !== null && d !== "" && (n.minLength = parseInt(d, 10));
    const h = t.get("maxLength");
    h !== null && h !== "" && (n.maxLength = parseInt(h, 10));
    const v = t.get("min");
    v !== null && v !== "" && (n.min = parseFloat(v));
    const g = t.get("max");
    g !== null && g !== "" && (n.max = parseFloat(g));
    const b = t.get("pattern");
    b && b.trim() && (n.pattern = b.trim()), Object.keys(n).length > 0 && (l.validation = n);
    const w = this.buildTypeSpecificConfig(t);
    w && Object.keys(w).length > 0 && (l.config = w), this.config.onSave(l), this.hide();
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
        const t = e.get("minBlocks"), r = e.get("maxBlocks"), a = e.get("allowedBlocks")?.trim(), s = e.get("deniedBlocks")?.trim();
        let i, l;
        if (a)
          try {
            const n = JSON.parse(a);
            i = Array.isArray(n) && n.length > 0 ? n : void 0;
          } catch {
            i = a.split(",").map((n) => n.trim()).filter(Boolean), i.length === 0 && (i = void 0);
          }
        if (s)
          try {
            const n = JSON.parse(s);
            l = Array.isArray(n) && n.length > 0 ? n : void 0;
          } catch {
            l = s.split(",").map((n) => n.trim()).filter(Boolean), l.length === 0 && (l = void 0);
          }
        return {
          minBlocks: t ? parseInt(t, 10) : void 0,
          maxBlocks: r ? parseInt(r, 10) : void 0,
          allowedBlocks: i,
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
function p(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function se(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[0-9]/, "_$&");
}
class ie {
  constructor(e) {
    this.container = null, this.backdrop = null, this.availableBlocks = [], this.config = e, this.api = new $({ basePath: e.apiBasePath }), this.selectedBlocks = new Set(e.selectedBlocks);
  }
  async show() {
    this.render(), this.bindEvents(), await this.loadBlocks();
  }
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden", this.container.innerHTML = `
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${p(this.config.title)}</h3>
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  bindEvents() {
    !this.container || !this.backdrop || (this.backdrop.addEventListener("click", (e) => {
      e.target === this.backdrop && this.hide();
    }), this.container.querySelector("[data-picker-close]")?.addEventListener("click", () => this.hide()), this.container.querySelector("[data-picker-cancel]")?.addEventListener("click", () => this.hide()), this.container.querySelector("[data-picker-confirm]")?.addEventListener("click", () => {
      this.config.onSelect(Array.from(this.selectedBlocks)), this.hide();
    }));
  }
  async loadBlocks() {
    const e = this.container?.querySelector("[data-blocks-loading]"), t = this.container?.querySelector("[data-blocks-list]"), r = this.container?.querySelector("[data-blocks-empty]");
    try {
      const a = await this.api.listBlockDefinitionsSummary();
      this.availableBlocks = a, this.normalizeSelectedBlocks(), e?.classList.add("hidden"), a.length === 0 ? r?.classList.remove("hidden") : (t?.classList.remove("hidden"), this.renderBlocksList());
    } catch {
      e?.classList.add("hidden"), r?.classList.remove("hidden");
      const a = r?.querySelector("span") || r;
      a && (a.textContent = "Failed to load block definitions");
    }
  }
  blockKey(e) {
    return (e.slug || e.type || "").trim();
  }
  normalizeSelectedBlocks() {
    if (this.selectedBlocks.size === 0 || this.availableBlocks.length === 0) return;
    const e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Set();
    for (const r of this.availableBlocks) {
      const a = this.blockKey(r);
      if (!a) continue;
      const s = this.selectedBlocks.has(a), i = this.selectedBlocks.has(r.type);
      (s || i) && (e.add(a), i && r.slug && r.slug !== r.type && t.add(r.type));
    }
    for (const r of this.selectedBlocks)
      t.has(r) || e.has(r) || e.add(r);
    this.selectedBlocks = e;
  }
  renderBlocksList() {
    const e = this.container?.querySelector("[data-blocks-list]");
    e && (e.innerHTML = this.availableBlocks.map((t) => {
      const r = this.blockKey(t), a = this.selectedBlocks.has(r) || this.selectedBlocks.has(t.type);
      return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${a ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
            <input
              type="checkbox"
              value="${p(r)}"
              data-block-type="${p(t.type)}"
              ${a ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${t.icon || r.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${p(t.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${p(r)}</div>
            </div>
            ${t.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${p(t.schema_version)}</span>` : ""}
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
class oe {
  constructor(e) {
    this.container = null, this.backdrop = null, this.dragState = null, this.config = e, this.layout = JSON.parse(JSON.stringify(e.layout ?? { type: "flat", gridColumns: 12 })), this.layout.tabs || (this.layout.tabs = []);
  }
  /**
   * Show the layout editor modal
   */
  show() {
    this.render(), this.bindEvents();
  }
  /**
   * Hide the layout editor modal
   */
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150", this.backdrop.setAttribute("data-layout-editor-backdrop", "true"), this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden", this.container.setAttribute("data-layout-editor", "true"), this.container.innerHTML = `
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
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
            value="${L(e.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${t}"
            value="${L(e.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="tab_icon_${t}"
            value="${L(e.icon ?? "")}"
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
                ${s.length === 0 ? '<div class="text-xs text-gray-400">No fields</div>' : s.map((i) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${L(i.label)} <span class="font-mono">(${L(i.name)})</span></div>`).join("")}
              </div>
            </div>
          `
    ).join("")}
        </div>
      </div>
    `;
  }
  bindEvents() {
    !this.container || !this.backdrop || (this.backdrop.addEventListener("click", (e) => {
      e.target === this.backdrop && (this.config.onCancel(), this.hide());
    }), this.container.querySelector("[data-layout-close]")?.addEventListener("click", () => {
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
    }), this.bindTabEvents(), this.container.addEventListener("keydown", (e) => {
      e.key === "Escape" && (this.config.onCancel(), this.hide());
    }));
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
function L(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
class ne {
  constructor(e, t) {
    this.dragState = null, this.container = e, this.config = t, this.api = new $({ basePath: t.apiBasePath }), this.state = {
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
      this.state.contentType = t, this.state.fields = F(t.schema), t.ui_schema?.layout && (this.state.layout = {
        type: t.ui_schema.layout.type ?? "flat",
        tabs: t.ui_schema.layout.tabs ?? [],
        gridColumns: t.ui_schema.layout.gridColumns ?? 12
      }), this.state.isDirty = !1, this.render();
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
    const r = C(this.state.fields, this.getSlug()), a = {
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
      this.state.contentType?.id ? s = await this.api.update(this.state.contentType.id, a) : s = await this.api.create(a), this.state.contentType = s, this.state.isDirty = !1, this.showToast("Content type saved successfully", "success"), this.config.onSave?.(s);
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
    const t = T(e), r = {
      id: j(),
      name: `new_${e}_${this.state.fields.length + 1}`,
      type: e,
      label: t?.label ?? e,
      required: !1,
      order: this.state.fields.length,
      ...t?.defaultConfig ?? {}
    };
    new _({
      field: r,
      existingFieldNames: this.state.fields.map((s) => s.name),
      onSave: (s) => {
        this.state.fields.push(s), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState();
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
    new _({
      field: t,
      existingFieldNames: this.state.fields.filter((a) => a.id !== e).map((a) => a.name),
      onSave: (a) => {
        const s = this.state.fields.findIndex((i) => i.id === e);
        s !== -1 && (this.state.fields[s] = a, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState());
      },
      onCancel: () => {
      }
    }).show();
  }
  /**
   * Remove a field
   */
  removeField(e) {
    const t = this.state.fields.findIndex((a) => a.id === e);
    if (t === -1) return;
    const r = this.state.fields[t];
    confirm(`Remove field "${r.label}"?`) && (this.state.fields.splice(t, 1), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState());
  }
  /**
   * Move a field to a new position
   */
  moveField(e, t) {
    const r = this.state.fields.findIndex((s) => s.id === e);
    if (r === -1 || r === t) return;
    const a = this.state.fields.splice(r, 1)[0];
    this.state.fields.splice(t, 0, a), this.state.fields.forEach((s, i) => {
      s.order = i;
    }), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState();
  }
  /**
   * Validate the schema
   */
  async validateSchema() {
    const e = C(this.state.fields, this.getSlug());
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
    const e = C(this.state.fields, this.getSlug());
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
    const e = this.state.contentType, t = this.getStatusBadge(e?.status);
    this.container.innerHTML = `
      <div class="content-type-editor flex flex-col h-full" data-content-type-editor>
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                ${e ? "Edit Content Type" : "Create Content Type"}
              </h1>
              ${e ? t : ""}
              ${e?.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${y(e.schema_version)}</span>` : ""}
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              ${e ? `Editing: ${e.name}` : "Define fields and configure your content type"}
            </p>
          </div>
          <div class="flex items-center gap-3">
            ${this.state.validationErrors.length > 0 ? `
              <span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${this.state.validationErrors.length} error${this.state.validationErrors.length > 1 ? "s" : ""}
              </span>
            ` : ""}

            <!-- Lifecycle Actions (only for existing content types) -->
            ${e ? this.renderLifecycleActions(e) : ""}

            <button
              type="button"
              data-ct-validate
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Validate
            </button>
            <button
              type="button"
              data-ct-preview
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Preview
            </button>
            <button
              type="button"
              data-ct-cancel
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              data-ct-save
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ${e ? "Save Changes" : "Create Content Type"}
            </button>
          </div>
        </div>

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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${y(e?.name ?? "")}"
              placeholder="Blog Post"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${y(e?.slug ?? "")}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          >${y(e?.description ?? "")}</textarea>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Icon
          </label>
          <input
            type="text"
            data-ct-icon
            value="${y(e?.icon ?? "")}"
            placeholder="file-text"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    const r = T(e.type), a = this.state.selectedFieldId === e.id, s = this.state.validationErrors.filter(
      (n) => n.path.includes(`/${e.name}`) || n.path.includes(`properties.${e.name}`)
    ), i = s.length > 0, l = [];
    return e.validation?.minLength && l.push(`min: ${e.validation.minLength}`), e.validation?.maxLength && l.push(`max: ${e.validation.maxLength}`), e.validation?.min !== void 0 && l.push(`>= ${e.validation.min}`), e.validation?.max !== void 0 && l.push(`<= ${e.validation.max}`), e.validation?.pattern && l.push("pattern"), `
      <div
        class="field-card flex items-center gap-3 p-3 border rounded-lg transition-colors ${i ? "border-red-400 bg-red-50 dark:bg-red-900/10" : a ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600"}"
        data-field-card="${e.id}"
        data-field-index="${t}"
        draggable="true"
      >
        <!-- Drag Handle -->
        <div
          class="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          data-field-drag-handle
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
          </svg>
        </div>

        <!-- Field Type Icon -->
        <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${i ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}">
          ${i ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : r?.icon ?? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'}
        </div>

        <!-- Field Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-white truncate">${y(e.label)}</span>
            ${e.required ? '<span class="text-xs text-red-500">Required</span>' : ""}
            ${e.readonly ? '<span class="text-xs text-gray-400">Read-only</span>' : ""}
            ${e.hidden ? '<span class="text-xs text-gray-400">Hidden</span>' : ""}
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="font-mono">${y(e.name)}</span>
            <span>•</span>
            <span>${r?.label ?? e.type}</span>
            ${e.section ? `<span>• ${y(e.section)}</span>` : ""}
            ${e.gridSpan ? `<span>• ${e.gridSpan} cols</span>` : ""}
          </div>
          ${l.length > 0 ? `
            <div class="flex items-center gap-1 mt-1">
              ${l.map((n) => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${y(n)}</span>`).join("")}
            </div>
          ` : ""}
          ${i ? `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${s.map((n) => y(n.message)).join(", ")}
            </div>
          ` : ""}
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            data-field-edit="${e.id}"
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Edit field"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button
            type="button"
            data-field-remove="${e.id}"
            class="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Remove field"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
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
  getStatusBadge(e) {
    switch (e) {
      case "draft":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</span>';
      case "deprecated":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Deprecated</span>';
      case "active":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>';
      default:
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">Unknown</span>';
    }
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
    const e = C(this.state.fields, this.getSlug());
    let t = null;
    try {
      t = await this.api.checkCompatibility(
        this.state.contentType.id,
        e,
        this.buildUISchema()
      );
    } catch {
    }
    new ce({
      contentType: this.state.contentType,
      compatibilityResult: t,
      onConfirm: async (a) => {
        try {
          const s = await this.api.publish(this.state.contentType.id, a);
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
    new he({
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
    new ue({
      apiBasePath: this.config.apiBasePath,
      contentType: this.state.contentType
    }).show();
  }
  // ===========================================================================
  // Event Binding
  // ===========================================================================
  bindEvents() {
    this.container.querySelector("[data-ct-save]")?.addEventListener("click", () => this.save()), this.container.querySelector("[data-ct-validate]")?.addEventListener("click", () => this.validateSchema()), this.container.querySelector("[data-ct-preview]")?.addEventListener("click", () => this.previewSchema()), this.container.querySelector("[data-ct-cancel]")?.addEventListener("click", () => this.config.onCancel?.()), this.bindLifecycleMenuEvents(), this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener(
      "click",
      () => this.showFieldTypePicker()
    ), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.container.querySelector("[data-ct-refresh-preview]")?.addEventListener("click", () => this.previewSchema()), this.container.addEventListener("click", (r) => {
      const a = r.target, s = a.closest("[data-field-edit]");
      if (s) {
        const n = s.getAttribute("data-field-edit");
        n && this.editField(n);
        return;
      }
      const i = a.closest("[data-field-remove]");
      if (i) {
        const n = i.getAttribute("data-field-remove");
        n && this.removeField(n);
        return;
      }
      const l = a.closest("[data-field-card]");
      if (l && !a.closest("button")) {
        const n = l.getAttribute("data-field-card");
        n && (this.state.selectedFieldId = this.state.selectedFieldId === n ? null : n, this.renderFieldList());
      }
    }), this.container.addEventListener("input", (r) => {
      const a = r.target;
      (a.matches("[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]") || a.matches("[data-ct-cap]")) && (this.state.isDirty = !0, this.updateDirtyState());
    });
    const e = this.container.querySelector("[data-ct-name]"), t = this.container.querySelector("[data-ct-slug]");
    e && t && (e.addEventListener("input", () => {
      !t.dataset.userModified && !this.state.contentType?.slug && (t.value = O(e.value));
    }), t.addEventListener("input", () => {
      t.dataset.userModified = "true";
    })), this.bindDragEvents();
  }
  bindDragEvents() {
    const e = this.container.querySelector("[data-ct-field-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const r = t, s = r.target.closest("[data-field-card]");
      if (!s) return;
      const i = s.getAttribute("data-field-card"), l = parseInt(s.getAttribute("data-field-index") ?? "0", 10);
      this.dragState = {
        fieldId: i ?? "",
        startIndex: l,
        currentIndex: l
      }, s.classList.add("opacity-50"), r.dataTransfer?.setData("text/plain", i ?? ""), r.dataTransfer && (r.dataTransfer.effectAllowed = "move");
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
      const r = t;
      if (!this.dragState) return;
      const s = r.target.closest("[data-field-card]");
      if (!s || s.getAttribute("data-field-card") === this.dragState.fieldId) return;
      const i = s.getBoundingClientRect(), l = i.top + i.height / 2, n = r.clientY < l;
      e.querySelectorAll(".drop-indicator").forEach((v) => v.remove());
      const d = document.createElement("div");
      d.className = "drop-indicator h-0.5 bg-blue-500 rounded-full my-1 transition-opacity", n ? s.parentElement?.insertBefore(d, s) : s.parentElement?.insertBefore(d, s.nextSibling);
      const h = parseInt(s.getAttribute("data-field-index") ?? "0", 10);
      this.dragState.currentIndex = n ? h : h + 1;
    }), e.addEventListener("dragleave", () => {
      e.querySelectorAll(".drop-indicator").forEach((t) => t.remove());
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), e.querySelectorAll(".drop-indicator").forEach((i) => i.remove()), !this.dragState) return;
      const { fieldId: r, startIndex: a, currentIndex: s } = this.dragState;
      if (a !== s) {
        const i = s > a ? s - 1 : s;
        this.moveField(r, i);
      }
      this.dragState = null;
    }), e.addEventListener("dragend", () => {
      e.querySelectorAll(".opacity-50").forEach((t) => t.classList.remove("opacity-50")), e.querySelectorAll(".drop-indicator").forEach((t) => t.remove()), this.dragState = null;
    }));
  }
  bindLifecycleMenuEvents() {
    const e = this.container.querySelector("[data-ct-lifecycle-menu]");
    if (!e) return;
    const t = e.querySelector("[data-ct-lifecycle-trigger]"), r = e.querySelector("[data-ct-lifecycle-dropdown]");
    t && r && (t.addEventListener("click", (a) => {
      a.stopPropagation(), r.classList.toggle("hidden");
    }), document.addEventListener("click", (a) => {
      e.contains(a.target) || r.classList.add("hidden");
    })), this.container.querySelector("[data-ct-publish]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.publishContentType();
    }), this.container.querySelector("[data-ct-deprecate]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.deprecateContentType();
    }), this.container.querySelector("[data-ct-clone]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.cloneContentType();
    }), this.container.querySelector("[data-ct-versions]")?.addEventListener("click", () => {
      r?.classList.add("hidden"), this.showVersionHistory();
    });
  }
  showFieldTypePicker() {
    new J({
      onSelect: (t) => this.addField(t),
      onCancel: () => {
      }
    }).show();
  }
  showLayoutEditor() {
    new oe({
      layout: this.state.layout,
      fields: this.state.fields,
      onSave: (t) => {
        this.state.layout = t, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState();
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
    this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.bindDragEvents();
  }
  // ===========================================================================
  // Helpers
  // ===========================================================================
  getSlug() {
    const e = this.container.querySelector("[data-ct-slug]"), t = this.container.querySelector("[data-ct-name]"), r = e?.value?.trim();
    return r || O(t?.value ?? "");
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
      const r = t.getAttribute("data-ct-cap");
      r && (e[r] = t.checked);
    }), e;
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
          label: le(s.section),
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
    e && (e.innerHTML = this.renderFieldListContent(), this.bindDragEvents());
  }
  renderFieldListContent() {
    return this.state.fields.length === 0 ? `
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
      ` : `
      <div class="space-y-2">
        ${this.state.fields.map((e, t) => this.renderFieldCard(e, t)).join("")}
      </div>
    `;
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
                ${r.map((a) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${y(a.message)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${Array.from(t.entries()).map(([a, s]) => {
      const i = this.state.fields.find((l) => l.name === a);
      return `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${y(i?.label ?? a)} <span class="font-mono">(${y(a)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${s.map((l) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${y(l.message)}</li>`).join("")}
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
    const r = window.showToast;
    if (typeof r == "function") {
      r(e, t);
      return;
    }
    t === "error" ? console.error(e) : console.log(e);
  }
}
function y(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function O(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function le(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
function de(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
class ce {
  constructor(e) {
    this.container = null, this.backdrop = null, this.config = e;
  }
  show() {
    this.render(), this.bindEvents();
  }
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    const { contentType: e, compatibilityResult: t } = this.config, r = (t?.breaking_changes?.length ?? 0) > 0, a = (t?.warnings?.length ?? 0) > 0, s = t?.affected_entries_count ?? 0;
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden", this.container.innerHTML = `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${y(e.name)}</strong>.
          ${e.status === "draft" ? "This will make it available for content creation." : "This will create a new version of the schema."}
        </p>

        ${r ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Breaking Changes Detected</span>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-300 space-y-1 ml-7">
              ${t.breaking_changes.map((i) => `
                <li>• ${y(i.description || `${i.type}: ${i.path}`)}</li>
              `).join("")}
            </ul>
            ${s > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${s} content ${s === 1 ? "entry" : "entries"} will require migration.
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${a ? `
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
            </div>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-7">
              ${t.warnings.map((i) => `
                <li>• ${y(i.description || `${i.type}: ${i.path}`)}</li>
              `).join("")}
            </ul>
          </div>
        ` : ""}

        ${!r && !a ? `
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

        ${r ? `
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
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${r ? "bg-red-600 hover:bg-red-700 disabled:opacity-50" : "bg-green-600 hover:bg-green-700"}"
          ${r ? "disabled" : ""}
        >
          ${r ? "Publish with Breaking Changes" : "Publish"}
        </button>
      </div>
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  bindEvents() {
    this.backdrop?.addEventListener("click", (r) => {
      r.target === this.backdrop && (this.config.onCancel(), this.hide());
    }), this.container?.querySelector("[data-publish-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    });
    const e = this.container?.querySelector("[data-publish-confirm]"), t = this.container?.querySelector("[data-publish-force]");
    t?.addEventListener("change", () => {
      e && (e.disabled = !t.checked);
    }), e?.addEventListener("click", () => {
      const r = t?.checked ?? !1;
      this.config.onConfirm(r), this.hide();
    }), this.container?.addEventListener("keydown", (r) => {
      r.key === "Escape" && (this.config.onCancel(), this.hide());
    });
  }
}
class he {
  constructor(e) {
    this.container = null, this.backdrop = null, this.config = e;
  }
  show() {
    this.render(), this.bindEvents();
  }
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    const { contentType: e } = this.config, t = `${e.slug}-copy`, r = `${e.name} (Copy)`;
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden", this.container.innerHTML = `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Clone Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create a copy of <strong class="text-gray-900 dark:text-white">${y(e.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${y(t)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${y(r)}"
            placeholder="My Content Type"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
      const a = this.container?.querySelector("[data-clone-slug]");
      a?.focus(), a?.select();
    });
  }
  bindEvents() {
    this.backdrop?.addEventListener("click", (e) => {
      e.target === this.backdrop && (this.config.onCancel(), this.hide());
    }), this.container?.querySelector("[data-clone-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container?.querySelector("[data-clone-confirm]")?.addEventListener("click", () => {
      const e = this.container?.querySelector("[data-clone-slug]"), t = this.container?.querySelector("[data-clone-name]"), r = e?.value?.trim(), a = t?.value?.trim();
      if (!r) {
        alert("Slug is required"), e?.focus();
        return;
      }
      if (!/^[a-z][a-z0-9_\-]*$/.test(r)) {
        alert("Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter."), e?.focus();
        return;
      }
      this.config.onConfirm(r, a || void 0), this.hide();
    }), this.container?.addEventListener("keydown", (e) => {
      e.key === "Enter" ? (e.preventDefault(), this.container?.querySelector("[data-clone-confirm]")?.click()) : e.key === "Escape" && (this.config.onCancel(), this.hide());
    });
  }
}
class ue {
  constructor(e) {
    this.container = null, this.backdrop = null, this.versions = [], this.expandedVersions = /* @__PURE__ */ new Set(), this.config = e, this.api = new $({ basePath: e.apiBasePath });
  }
  async show() {
    this.render(), this.bindEvents(), await this.loadVersions();
  }
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[60] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden", this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${y(this.config.contentType.name)} (${y(this.config.contentType.slug)})</p>
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  bindEvents() {
    this.backdrop?.addEventListener("click", (e) => {
      e.target === this.backdrop && this.hide();
    }), this.container?.querySelector("[data-viewer-close]")?.addEventListener("click", () => {
      this.hide();
    }), this.container?.addEventListener("keydown", (e) => {
      e.key === "Escape" && this.hide();
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
          <p class="text-xs mt-2">Current version: ${y(this.config.contentType.schema_version ?? "1.0.0")}</p>
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
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${y(e.version)}</span>
              ${t ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ""}
              ${s ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
              ${this.getMigrationBadge(e.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${de(e.created_at)}</span>
            ${a ? `
              <button
                type="button"
                data-toggle-version="${y(e.version)}"
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
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${y(e.path)}</span>
          ${e.field ? `<span class="text-gray-500 dark:text-gray-400"> (${y(e.field)})</span>` : ""}
          ${e.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${y(e.description)}</p>` : ""}
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
class pe {
  constructor(e) {
    this.container = null, this.backdrop = null, this.categories = [], this.config = e, this.api = new $({ basePath: e.apiBasePath }), this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: !1,
      isSaving: !1,
      error: null,
      filter: "",
      categoryFilter: null
    };
  }
  /**
   * Show the block library manager
   */
  async show() {
    this.render(), this.bindEvents(), await this.loadBlocks(), await this.loadCategories();
  }
  /**
   * Hide the block library manager
   */
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    const e = this.config.mode !== "picker", t = e ? "Block Library" : "Select Block Type";
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.backdrop.setAttribute("data-block-library-backdrop", "true"), this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden", this.container.setAttribute("data-block-library-manager", "true"), this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${t}</h2>
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
          class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  bindEvents() {
    if (!this.container || !this.backdrop) return;
    this.backdrop.addEventListener("click", (a) => {
      a.target === this.backdrop && (this.config.onClose?.(), this.hide());
    }), this.container.querySelector("[data-block-library-close]")?.addEventListener("click", () => {
      this.config.onClose?.(), this.hide();
    }), this.container.querySelector("[data-block-library-cancel]")?.addEventListener("click", () => {
      this.config.onClose?.(), this.hide();
    });
    const e = this.container.querySelector("[data-block-filter]");
    e?.addEventListener("input", () => {
      this.state.filter = e.value, this.renderBlockList();
    });
    const t = this.container.querySelector("[data-block-category-filter]");
    t?.addEventListener("change", () => {
      this.state.categoryFilter = t.value || null, this.renderBlockList();
    }), this.container.querySelector("[data-block-create]")?.addEventListener("click", () => {
      this.showBlockEditor(null);
    }), this.container.addEventListener("keydown", (a) => {
      a.key === "Escape" && (this.config.onClose?.(), this.hide());
    }), this.container.querySelector("[data-block-list]")?.addEventListener("click", (a) => {
      const s = a.target, i = s.closest("[data-block-id]");
      if (i && this.config.mode === "picker") {
        const l = i.getAttribute("data-block-id"), n = this.state.blocks.find((d) => d.id === l);
        if (n && this.isBlockAllowed(n)) {
          const d = this.blockKey(n);
          this.config.onSelect?.({
            id: n.id,
            name: n.name,
            slug: n.slug,
            type: d || n.type,
            description: n.description,
            icon: n.icon,
            category: n.category,
            schema_version: n.schema_version,
            status: n.status
          }), this.hide();
        }
        return;
      }
      if (s.closest("[data-block-edit]")) {
        const n = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((h) => h.id === n);
        d && this.showBlockEditor(d);
        return;
      }
      if (s.closest("[data-block-delete]")) {
        const n = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((h) => h.id === n);
        d && this.confirmDeleteBlock(d);
        return;
      }
      if (s.closest("[data-block-clone]")) {
        const n = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((h) => h.id === n);
        d && this.cloneBlock(d);
        return;
      }
      if (s.closest("[data-block-publish]")) {
        const n = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((h) => h.id === n);
        d && this.publishBlock(d);
        return;
      }
      if (s.closest("[data-block-versions]")) {
        const n = s.closest("[data-block-id]")?.getAttribute("data-block-id"), d = this.state.blocks.find((h) => h.id === n);
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
      this.state.isLoading = !1, this.renderBlockList();
    }
  }
  async loadCategories() {
    try {
      this.categories = await this.api.getBlockCategories(), this.renderCategoryOptions();
    } catch {
      this.categories = ["content", "media", "layout", "interactive", "custom"], this.renderCategoryOptions();
    }
  }
  renderCategoryOptions() {
    const e = this.container?.querySelector("[data-block-category-filter]");
    if (e) {
      e.innerHTML = '<option value="">All Categories</option>';
      for (const t of this.categories) {
        const r = document.createElement("option");
        r.value = t, r.textContent = D(t), e.appendChild(r);
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
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${D(s)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${i.map((l) => this.renderBlockCard(l)).join("")}
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
            ${e.icon || s.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${m(e.name)}</h4>
              ${a}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${m(s)}</p>
            ${e.description ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${m(e.description)}</p>` : ""}
            ${e.schema_version ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${m(e.schema_version)}</p>` : ""}
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
    switch (e) {
      case "draft":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Draft</span>';
      case "deprecated":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Deprecated</span>';
      case "active":
      default:
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>';
    }
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
    new ge({
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
    if (confirm(`Are you sure you want to delete the block "${e.name}"? This action cannot be undone.`))
      try {
        await this.api.deleteBlockDefinition(e.id), await this.loadBlocks();
      } catch (r) {
        this.showError(r instanceof Error ? r.message : "Failed to delete block");
      }
  }
  async cloneBlock(e) {
    const t = (e.slug || e.type || "block").trim(), r = prompt("Enter a unique slug for the cloned block:", `${t}_copy`);
    if (r)
      try {
        await this.api.cloneBlockDefinition(e.id, r, r), await this.loadBlocks();
      } catch (a) {
        this.showError(a instanceof Error ? a.message : "Failed to clone block");
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
    new ye({
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
class ge {
  constructor(e) {
    this.container = null, this.backdrop = null, this.fields = [], this.config = e, this.api = new $({ basePath: e.apiBasePath }), this.isNew = !e.block, e.block?.schema && (this.fields = F(e.block.schema));
  }
  show() {
    this.render(), this.bindEvents();
  }
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    const e = this.config.block;
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[60] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden", this.container.innerHTML = `
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value="${m(e?.name ?? "")}"
                placeholder="Hero Section"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="type"
                value="${m(e?.type ?? "")}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_\\-]*$"
                required
                ${e ? "readonly" : ""}
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${e ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed" : ""}"
              />
              <p class="mt-1 text-xs text-gray-500">Unique identifier. Lowercase, numbers, hyphens, underscores.</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="2"
              placeholder="A description of this block type"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            >${m(e?.description ?? "")}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                name="category"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ${this.config.categories.map((t) => `<option value="${t}" ${e?.category === t ? "selected" : ""}>${D(t)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <input
                type="text"
                name="icon"
                value="${m(e?.icon ?? "")}"
                placeholder="emoji or text"
                maxlength="2"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
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
              <span class="text-sm font-medium text-gray-900 dark:text-white">${m(e.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${m(e.name)}</span>
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
  bindEvents() {
    !this.container || !this.backdrop || (this.backdrop.addEventListener("click", (e) => {
      e.target === this.backdrop && (this.config.onCancel(), this.hide());
    }), this.container.querySelector("[data-editor-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-editor-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-editor-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container.querySelector("[data-add-field]")?.addEventListener("click", () => {
      this.showFieldTypePicker();
    }), this.container.querySelector("[data-fields-list]")?.addEventListener("click", (e) => {
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
    }));
  }
  showFieldTypePicker() {
    new J({
      onSelect: (t) => {
        const r = {
          id: j(),
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
    new _({
      field: e,
      existingFieldNames: this.fields.filter((a, s) => s !== t).map((a) => a.name),
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
      alert("Name and Type are required");
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(a)) {
      alert("Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.");
      return;
    }
    const s = C(this.fields, a), i = {
      name: r,
      type: a,
      description: t.get("description")?.trim() || void 0,
      category: t.get("category") || "custom",
      icon: t.get("icon")?.trim() || void 0,
      schema: s,
      status: this.config.block?.status ?? "draft"
    };
    try {
      let l;
      this.isNew ? l = await this.api.createBlockDefinition(i) : l = await this.api.updateBlockDefinition(this.config.block.id, i), this.config.onSave(l), this.hide();
    } catch (l) {
      alert(l instanceof Error ? l.message : "Failed to save block");
    }
  }
}
class ye {
  constructor(e) {
    this.container = null, this.backdrop = null, this.versions = [], this.config = e, this.api = new $({ basePath: e.apiBasePath });
  }
  async show() {
    this.render(), this.bindEvents(), await this.loadVersions();
  }
  hide() {
    this.backdrop && (this.backdrop.classList.add("opacity-0"), setTimeout(() => {
      this.backdrop?.remove(), this.backdrop = null, this.container = null;
    }, 150));
  }
  render() {
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[60] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden", this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${m(this.config.block.name)} (${m(this.config.block.slug || this.config.block.type)})</p>
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
    `, this.backdrop.appendChild(this.container), document.body.appendChild(this.backdrop), requestAnimationFrame(() => {
      this.backdrop?.classList.remove("opacity-0");
    });
  }
  bindEvents() {
    this.backdrop?.addEventListener("click", (e) => {
      e.target === this.backdrop && this.hide();
    }), this.container?.querySelector("[data-viewer-close]")?.addEventListener("click", () => {
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
          <p class="text-xs mt-2">Current version: ${m(this.config.block.schema_version ?? "1.0.0")}</p>
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
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${m(t.version)}</span>
                ${t.is_breaking ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
                ${this.getMigrationBadge(t.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${be(t.created_at)}</span>
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
function m(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function D(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function be(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
function fe(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-trigger]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = t.dataset.apiBasePath ?? "/admin", a = t.dataset.mode ?? "manage";
    if (a === "manage")
      t.addEventListener("click", () => {
        window.location.href = `${r}/block_definitions`;
      });
    else {
      const s = {
        apiBasePath: r,
        mode: a
      };
      t.addEventListener("click", () => {
        new pe(s).show();
      });
    }
    t.dataset.initialized = "true";
  });
}
function me(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
me(() => fe());
const ve = {
  text: "text",
  media: "media",
  choice: "selection",
  number: "number",
  datetime: "datetime",
  relationship: "reference",
  structure: "structural",
  advanced: "advanced"
}, xe = {
  text: "cat-text",
  media: "cat-media",
  choice: "cat-selection",
  number: "cat-number",
  datetime: "cat-datetime",
  relationship: "cat-reference",
  structure: "cat-structural",
  advanced: "cat-advanced"
};
function ke(o) {
  const e = (o ?? "").trim().toLowerCase();
  return ve[e] ?? "advanced";
}
function we(o, e) {
  const t = (o ?? "").trim();
  if (t) return t;
  const r = (e ?? "").trim();
  return r ? W(r) : "Advanced";
}
function Se(o) {
  const e = (o ?? "").trim().toLowerCase(), t = xe[e] ?? "cat-advanced";
  return A(t);
}
function Ce(o) {
  const e = o.defaults;
  return !e || typeof e != "object" ? void 0 : e;
}
function $e(o, e) {
  const t = (o.type ?? "text").trim().toLowerCase(), r = t === "text" ? "textarea" : q(t), a = (o.label ?? "").trim() || W(o.type ?? r), s = (o.description ?? "").trim(), i = A(o.icon ?? "") || A(r) || "", l = Ce(o), n = {
    type: r,
    label: a,
    description: s,
    icon: i,
    category: e,
    defaultConfig: l
  };
  return (o.type ?? "").toLowerCase() === "hidden" && (n.defaultConfig = {
    ...n.defaultConfig ?? {},
    hidden: !0
  }), n;
}
function Q(o) {
  const e = [], t = [];
  for (const r of o) {
    const a = r.category ?? {}, s = (a.id ?? "").trim().toLowerCase(), i = ke(s);
    e.push({
      id: i,
      label: we(a.label, s),
      icon: Se(s),
      collapsed: a.collapsed
    });
    const l = Array.isArray(r.field_types) ? r.field_types : [];
    for (const n of l)
      t.push($e(n, i));
  }
  return { categories: e, fieldTypes: t };
}
const E = Q([
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
function W(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
const Ee = /* @__PURE__ */ new Set(["advanced"]), H = "application/x-field-palette-type", Y = "application/x-field-palette-meta";
class U {
  constructor(e) {
    this.fieldTypes = [], this.fieldTypeByKey = /* @__PURE__ */ new Map(), this.fieldTypeKeyByRef = /* @__PURE__ */ new Map(), this.categoryOrder = [], this.searchQuery = "", this.categoryStates = /* @__PURE__ */ new Map(), this.isLoading = !0, this.enabled = !1, this.config = e, this.categoryOrder = [...E.categories];
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
    try {
      const e = await this.config.api.getBlockFieldTypeGroups();
      if (e && e.length > 0) {
        const t = Q(e);
        this.fieldTypes = t.fieldTypes, this.categoryOrder = t.categories;
      } else {
        const t = await this.config.api.getFieldTypes();
        t && t.length > 0 ? (this.fieldTypes = t, this.categoryOrder = [...E.categories]) : (this.fieldTypes = [...E.fieldTypes], this.categoryOrder = [...E.categories]);
      }
    } catch {
      this.fieldTypes = [...E.fieldTypes], this.categoryOrder = [...E.categories];
    }
    this.initCategoryStates(), this.buildFieldTypeKeyMap();
  }
  initCategoryStates() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.categoryOrder)
      e.add(t.id);
    for (const t of e)
      this.categoryStates.has(t) || this.categoryStates.set(t, {
        collapsed: Ee.has(t)
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
          <svg class="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-xs text-gray-400">Select a block to see available field types</p>
        </div>`;
      return;
    }
    e.innerHTML = "", e.classList.add("flex", "flex-col", "min-h-0");
    const t = document.createElement("div");
    t.className = "px-3 py-2 border-b border-gray-100 shrink-0", t.innerHTML = `
      <div class="relative">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input type="text"
               data-palette-search
               placeholder="Search fields..."
               value="${S(this.searchQuery)}"
               class="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors" />
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
        <div data-palette-category="${S(t.id)}" class="border-b border-gray-50">
          <button type="button" data-palette-toggle="${S(t.id)}"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors group">
            <span class="w-3 h-3 text-gray-400 flex items-center justify-center" data-palette-chevron="${S(t.id)}">
              ${s ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400">${t.icon}</span>
            <span class="text-[10px] font-semibold text-gray-600 uppercase tracking-wider flex-1">${S(t.label)}</span>
            <span class="text-[9px] text-gray-400">${r.length}</span>
          </button>
          <div class="${s ? "hidden" : ""}" data-palette-category-body="${S(t.id)}">
            <div class="px-2 pb-2 space-y-0.5">
              ${r.map((i) => this.renderPaletteItem(i)).join("")}
            </div>
          </div>
        </div>`;
    }
    return e || (e = `
        <div class="px-4 py-8 text-center">
          <p class="text-xs text-gray-400">No field types available.</p>
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
          <svg class="w-8 h-8 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-gray-400">No fields match "${S(this.searchQuery)}"</p>
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
      <div data-palette-item="${S(t)}"
           draggable="true"
           class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-blue-50 active:cursor-grabbing transition-colors group select-none"
           title="${S(e.description)}">
        <span class="flex-shrink-0 text-gray-300 group-hover:text-gray-400 cursor-grab" data-palette-grip>
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
          </svg>
        </span>
        <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
          ${e.icon}
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-[11px] font-medium text-gray-700 group-hover:text-blue-700 truncate">${S(e.label)}</span>
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
        s ? (r.dataTransfer.setData(H, s.type), r.dataTransfer.setData(Y, JSON.stringify(s))) : r.dataTransfer.setData(H, a), r.dataTransfer.setData("text/plain", s?.type ?? a), t.classList.add("opacity-50");
      }), t.addEventListener("dragend", () => {
        t.classList.remove("opacity-50");
      });
    });
  }
}
function S(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
const x = "main", G = "application/x-field-reorder";
class Le {
  constructor(e) {
    this.expandedFieldId = null, this.sectionStates = /* @__PURE__ */ new Map(), this.moveMenuFieldId = null, this.dropHighlight = !1, this.dragReorder = null, this.dropTargetFieldId = null, this.saveState = "idle", this.saveMessage = "", this.saveDisplayTimer = null, this.config = e, this.block = { ...e.block }, this.fields = e.block.schema ? F(e.block.schema) : [];
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
    this.block = { ...e }, this.fields = e.schema ? F(e.schema) : [], this.expandedFieldId = null, this.moveMenuFieldId = null, this.render();
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
    const e = this.block.slug || this.block.type || "";
    return `
      <div class="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-semibold text-gray-900 truncate leading-snug" data-editor-block-name>${c(this.block.name || "Untitled")}</h2>
          <p class="text-[11px] text-gray-400 font-mono truncate mt-0.5">${c(e)}</p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <span data-editor-save-indicator>${this.renderSaveState()}</span>
          <span class="text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-md ${Be(this.block.status)}" data-editor-status-badge>${c(this.block.status || "draft")}</span>
        </div>
      </div>`;
  }
  // ===========================================================================
  // Save state indicator (Phase 11 — Task 11.2)
  // ===========================================================================
  renderSaveState() {
    switch (this.saveState) {
      case "saving":
        return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
          <span class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          Saving…
        </span>`;
      case "saved":
        return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-md">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Saved
        </span>`;
      case "error":
        return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-md" title="${c(this.saveMessage)}">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Save failed
        </span>`;
      default:
        return "";
    }
  }
  /** Update the save state indicator without a full re-render (Phase 11 — Task 11.2) */
  updateSaveState(e, t) {
    this.saveDisplayTimer && (clearTimeout(this.saveDisplayTimer), this.saveDisplayTimer = null), this.saveState = e, this.saveMessage = t ?? "";
    const r = this.config.container.querySelector("[data-editor-save-indicator]");
    r && (r.innerHTML = this.renderSaveState()), e === "saved" && (this.saveDisplayTimer = setTimeout(() => {
      this.saveState = "idle", this.saveMessage = "";
      const a = this.config.container.querySelector("[data-editor-save-indicator]");
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
    const e = this.block, t = e.slug || e.type || "", r = e.slug && e.type && e.slug !== e.type ? `<p class="mt-0.5 text-[10px] text-gray-400">Internal type: ${c(e.type)}</p>` : "";
    return `
      <div class="border-b border-gray-200" data-editor-metadata>
        <button type="button" data-toggle-metadata
                class="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50/80 transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
            <span>Block Metadata</span>
          </div>
          <span data-metadata-chevron class="w-4 h-4 text-gray-400 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </span>
        </button>
        <div class="px-5 pb-4 space-y-3" data-metadata-body>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input type="text" data-meta-field="name" value="${c(e.name)}"
                     class="${f()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input type="text" data-meta-field="slug" value="${c(t)}" pattern="^[a-z][a-z0-9_\\-]*$"
                     class="${f()} font-mono" />
              ${r}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${f()} resize-none">${c(e.description ?? "")}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select data-meta-field="category" class="${f()}">
                ${this.config.categories.map((a) => `<option value="${c(a)}" ${a === (e.category ?? "") ? "selected" : ""}>${c(B(a))}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Icon</label>
              <input type="text" data-meta-field="icon" value="${c(e.icon ?? "")}"
                     placeholder="emoji or key"
                     class="${f()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select data-meta-field="status" class="${f()}">
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
        <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
          </div>
          <span class="text-[11px] text-gray-400">0 fields</span>
        </div>
        <div data-field-drop-zone
             class="flex flex-col items-center justify-center py-16 px-5 text-center border-2 border-dashed ${this.dropHighlight ? "border-blue-400 bg-blue-50/50" : "border-transparent"} rounded-lg mx-3 my-2 transition-colors">
          <svg class="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-sm text-gray-400">No fields defined.</p>
          <p class="text-xs text-gray-300 mt-1">Drag fields from the palette or click a field type to add.</p>
        </div>`;
    let r = `
      <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
        </div>
        <span class="text-[11px] text-gray-400">${this.fields.length} field${this.fields.length !== 1 ? "s" : ""}</span>
      </div>`;
    for (const a of t) {
      const s = e.get(a), l = this.getSectionState(a).collapsed;
      r += `
        <div data-section="${c(a)}" class="border-b border-gray-100">
          <button type="button" data-toggle-section="${c(a)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 transition-colors group">
            <span class="w-3.5 h-3.5 text-gray-400 flex items-center justify-center" data-section-chevron="${c(a)}">
              ${l ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">${c(B(a))}</span>
            <span class="text-[10px] text-gray-400 ml-auto">${s.length}</span>
          </button>

          <div class="${l ? "hidden" : ""}" data-section-body="${c(a)}">
            <div class="px-3 pb-2 space-y-1" data-section-fields="${c(a)}">
              ${s.map((n) => this.renderFieldCard(n, t, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return r += `
      <div data-field-drop-zone
           class="mx-3 my-2 py-3 border-2 border-dashed rounded-lg text-center transition-colors ${this.dropHighlight ? "border-blue-400 bg-blue-50/50" : "border-gray-200 hover:border-gray-300"}">
        <p class="text-[11px] text-gray-400">Drop a field here or click a field type in the palette</p>
      </div>`, r;
  }
  // ===========================================================================
  // Rendering – Single field card (Task 8.2)
  // ===========================================================================
  renderFieldCard(e, t, r) {
    const a = e.id === this.expandedFieldId, s = T(e.type), i = e.section || x, l = r.indexOf(e), n = l === 0, d = l === r.length - 1, h = this.dropTargetFieldId === e.id;
    return `
      <div data-field-card="${c(e.id)}"
           data-field-section="${c(i)}"
           draggable="true"
           class="rounded-lg border ${h ? "border-t-2 border-t-blue-400" : ""} ${a ? "border-blue-200 bg-blue-50/30" : "border-gray-200 bg-white hover:border-gray-300"} transition-colors">
        <!-- Collapsed header -->
        <div class="flex items-center gap-1.5 px-2 py-2 select-none" data-field-toggle="${c(e.id)}">
          <!-- Drag handle (Phase 10 — Task 10.1) -->
          <span class="flex-shrink-0 text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing" data-field-grip="${c(e.id)}">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
              <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
              <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
            </svg>
          </span>
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-[11px]">
            ${s?.icon ?? "?"}
          </span>
          <span class="flex-1 min-w-0 cursor-pointer">
            <span class="block text-[13px] font-medium text-gray-800 truncate">${c(e.label || e.name)}</span>
            <span class="block text-[10px] text-gray-400 font-mono truncate">${c(e.name)} &middot; ${c(e.type)}</span>
          </span>
          ${e.required ? '<span class="flex-shrink-0 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">req</span>' : ""}
          <!-- Up/Down reorder group (Phase 10 — Task 10.2) -->
          <span class="flex-shrink-0 inline-flex flex-col border border-gray-200 rounded-md overflow-hidden">
            <button type="button" data-field-move-up="${c(e.id)}"
                    class="px-0.5 py-px ${n ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"} transition-colors"
                    title="Move up" ${n ? "disabled" : ""}>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
              </svg>
            </button>
            <span class="block h-px bg-gray-200"></span>
            <button type="button" data-field-move-down="${c(e.id)}"
                    class="px-0.5 py-px ${d ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"} transition-colors"
                    title="Move down" ${d ? "disabled" : ""}>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </span>
          <!-- Actions: move to section (Task 8.4) -->
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${c(e.id)}"
                    class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Field actions">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === e.id ? this.renderMoveToSectionMenu(e, t, i) : ""}
          </div>
          <!-- Expand/collapse toggle (distinct from reorder) -->
          <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            ${a ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>'}
          </span>
        </div>

        <!-- Expanded properties (Task 8.2) -->
        ${a ? this.renderFieldProperties(e, t) : ""}
      </div>`;
  }
  // ===========================================================================
  // Rendering – Inline field property editor (Task 8.2)
  // ===========================================================================
  renderFieldProperties(e, t) {
    const r = e.validation ?? {}, a = q(e.type), s = ["text", "textarea", "rich-text", "markdown", "code", "slug"].includes(a), i = ["number", "integer", "currency", "percentage"].includes(a), l = e.section || x;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 mt-1 pt-3" data-field-props="${c(e.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${c(e.id)}" data-prop-key="name"
                   value="${c(e.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${f("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Label</label>
            <input type="text" data-field-prop="${c(e.id)}" data-prop-key="label"
                   value="${c(e.label)}"
                   class="${f("xs")}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Description</label>
          <input type="text" data-field-prop="${c(e.id)}" data-prop-key="description"
                 value="${c(e.description ?? "")}" placeholder="Help text for editors"
                 class="${f("xs")}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${c(e.id)}" data-prop-key="placeholder"
                 value="${c(e.placeholder ?? "")}"
                 class="${f("xs")}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${c(e.id)}" data-check-key="required"
                   ${e.required ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${c(e.id)}" data-check-key="readonly"
                   ${e.readonly ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${c(e.id)}" data-check-key="hidden"
                   ${e.hidden ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600">Hidden</span>
          </label>
        </div>

        <!-- Validation (conditional) -->
        ${s ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Min Length</label>
            <input type="number" data-field-prop="${c(e.id)}" data-prop-key="validation.minLength"
                   value="${r.minLength ?? ""}" min="0"
                   class="${f("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${c(e.id)}" data-prop-key="validation.maxLength"
                   value="${r.maxLength ?? ""}" min="0"
                   class="${f("xs")}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${c(e.id)}" data-prop-key="validation.pattern"
                 value="${c(r.pattern ?? "")}" placeholder="^[a-z]+$"
                 class="${f("xs")} font-mono" />
        </div>` : ""}

        ${i ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${c(e.id)}" data-prop-key="validation.min"
                   value="${r.min ?? ""}" step="any"
                   class="${f("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${c(e.id)}" data-prop-key="validation.max"
                   value="${r.max ?? ""}" step="any"
                   class="${f("xs")}" />
          </div>
        </div>` : ""}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Section</label>
            <select data-field-section-select="${c(e.id)}"
                    class="${f("xs")}">
              ${t.map((n) => `<option value="${c(n)}" ${n === l ? "selected" : ""}>${c(B(n))}</option>`).join("")}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${c(e.id)}" data-prop-key="gridSpan"
                   value="${e.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                   class="${f("xs")}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100">
          <button type="button" data-field-remove="${c(e.id)}"
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
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400">Only one section exists.</div>
          <button type="button" data-move-new-section="${c(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50">
            + Create new section
          </button>
        </div>` : `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Move to section</div>
        ${a.map((s) => `
          <button type="button" data-move-to="${c(s)}" data-move-field="${c(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${c(B(s))}
          </button>`).join("")}
        <div class="border-t border-gray-100 mt-1 pt-1">
          <button type="button" data-move-new-section="${c(e.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50">
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
      const r = t.section || x;
      e.has(r) || e.set(r, []), e.get(r).push(t);
    }
    if (e.has(x)) {
      const t = e.get(x);
      e.delete(x);
      const r = /* @__PURE__ */ new Map();
      r.set(x, t);
      for (const [a, s] of e) r.set(a, s);
      return r;
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
      const t = e.querySelector("[data-metadata-body]"), r = e.querySelector("[data-metadata-chevron]");
      if (t) {
        const a = t.classList.toggle("hidden");
        r && (r.innerHTML = a ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
    }), e.querySelectorAll("[data-meta-field]").forEach((t) => {
      const r = t.dataset.metaField;
      t.tagName === "SELECT" ? t.addEventListener("change", () => this.handleMetadataChange(r, t.value)) : (t.tagName === "TEXTAREA" || t.tagName === "INPUT") && t.addEventListener("input", () => this.handleMetadataChange(r, t.value));
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
          const s = a.dataTransfer?.getData(Y);
          if (s)
            try {
              const l = JSON.parse(s);
              if (l && l.type) {
                this.config.onFieldDrop(l);
                return;
              }
            } catch {
            }
          const i = a.dataTransfer?.getData(H);
          if (i) {
            const l = q(i), n = T(l) ?? {
              type: l,
              label: B(l),
              description: "",
              icon: "",
              category: "advanced"
            };
            this.config.onFieldDrop(n);
          }
        }
      });
    });
  }
  handleClick(e, t) {
    const r = e.target, a = r.closest("[data-toggle-section]");
    if (a) {
      const g = a.dataset.toggleSection, b = this.getSectionState(g);
      b.collapsed = !b.collapsed, this.sectionStates.set(g, b);
      const w = t.querySelector(`[data-section-body="${g}"]`), R = t.querySelector(`[data-section-chevron="${g}"]`);
      w && w.classList.toggle("hidden", b.collapsed), R && (R.innerHTML = b.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      return;
    }
    const s = r.closest("[data-field-actions]");
    if (s) {
      e.stopPropagation();
      const g = s.dataset.fieldActions;
      this.moveMenuFieldId = this.moveMenuFieldId === g ? null : g, this.render();
      return;
    }
    const i = r.closest("[data-move-to]");
    if (i) {
      e.stopPropagation();
      const g = i.dataset.moveTo, b = i.dataset.moveField;
      this.moveFieldToSection(b, g);
      return;
    }
    const l = r.closest("[data-move-new-section]");
    if (l) {
      e.stopPropagation();
      const g = l.dataset.moveNewSection, b = prompt("Section name:");
      b && b.trim() && this.moveFieldToSection(g, b.trim().toLowerCase().replace(/\s+/g, "_"));
      return;
    }
    const n = r.closest("[data-field-move-up]");
    if (n) {
      e.stopPropagation();
      const g = n.dataset.fieldMoveUp;
      n.hasAttribute("disabled") || this.moveFieldInSection(g, -1);
      return;
    }
    const d = r.closest("[data-field-move-down]");
    if (d) {
      e.stopPropagation();
      const g = d.dataset.fieldMoveDown;
      d.hasAttribute("disabled") || this.moveFieldInSection(g, 1);
      return;
    }
    const h = r.closest("[data-field-remove]");
    if (h) {
      const g = h.dataset.fieldRemove, b = this.fields.find((w) => w.id === g);
      b && confirm(`Remove field "${b.label || b.name}"?`) && (this.fields = this.fields.filter((w) => w.id !== g), this.expandedFieldId === g && (this.expandedFieldId = null), this.notifySchemaChange(), this.render());
      return;
    }
    const v = r.closest("[data-field-toggle]");
    if (v) {
      const g = v.dataset.fieldToggle;
      this.expandedFieldId = this.expandedFieldId === g ? null : g, this.render();
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
      const i = s[0], l = a;
      typeof r == "boolean" ? l[i] = r : i === "gridSpan" ? l[i] = r ? parseInt(r, 10) : void 0 : l[i] = r || void 0;
    } else if (s[0] === "validation") {
      a.validation || (a.validation = {});
      const i = s[1];
      typeof r == "string" && (r === "" ? delete a.validation[i] : ["minLength", "maxLength"].includes(i) ? a.validation[i] = parseInt(r, 10) : ["min", "max"].includes(i) ? a.validation[i] = parseFloat(r) : a.validation[i] = r), Object.keys(a.validation).length === 0 && (a.validation = void 0);
    }
    this.notifySchemaChange();
  }
  moveFieldToSection(e, t) {
    const r = this.fields.find((a) => a.id === e);
    r && (r.section = t === x ? void 0 : t, this.moveMenuFieldId = null, this.notifySchemaChange(), this.render());
  }
  // ===========================================================================
  // Field Reorder (Phase 10 — Task 10.1 drag, Task 10.2 keyboard)
  // ===========================================================================
  /** Move a field up (-1) or down (+1) within its section */
  moveFieldInSection(e, t) {
    const r = this.fields.find((h) => h.id === e);
    if (!r) return;
    const a = r.section || x, s = this.fields.filter((h) => (h.section || x) === a), i = s.findIndex((h) => h.id === e), l = i + t;
    if (l < 0 || l >= s.length) return;
    const n = this.fields.indexOf(s[i]), d = this.fields.indexOf(s[l]);
    [this.fields[n], this.fields[d]] = [this.fields[d], this.fields[n]], this.notifySchemaChange(), this.render();
  }
  /** Reorder a field by moving it before a target field in the same section */
  reorderFieldBefore(e, t) {
    if (e === t) return;
    const r = this.fields.find((d) => d.id === e), a = this.fields.find((d) => d.id === t);
    if (!r || !a) return;
    const s = r.section || x, i = a.section || x;
    if (s !== i) return;
    const l = this.fields.indexOf(r);
    this.fields.splice(l, 1);
    const n = this.fields.indexOf(a);
    this.fields.splice(n, 0, r), this.notifySchemaChange(), this.render();
  }
  /** Bind drag events on [data-field-card] for intra-section reordering */
  bindFieldReorderEvents(e) {
    e.querySelectorAll("[data-field-card]").forEach((r) => {
      const a = r.dataset.fieldCard, s = r.dataset.fieldSection;
      let i = !1;
      r.addEventListener("mousedown", (l) => {
        i = !!l.target.closest("[data-field-grip]");
      }), r.addEventListener("dragstart", (l) => {
        if (!i) {
          l.preventDefault();
          return;
        }
        this.dragReorder = { fieldId: a, sectionName: s }, l.dataTransfer.effectAllowed = "move", l.dataTransfer.setData(G, a), r.classList.add("opacity-50");
      }), r.addEventListener("dragend", () => {
        this.dragReorder = null, this.dropTargetFieldId = null, r.classList.remove("opacity-50"), e.querySelectorAll("[data-field-card]").forEach((l) => {
          l.classList.remove("border-t-2", "border-t-blue-400");
        });
      }), r.addEventListener("dragover", (l) => {
        this.dragReorder && this.dragReorder.sectionName === s && this.dragReorder.fieldId !== a && (l.preventDefault(), l.dataTransfer.dropEffect = "move", this.dropTargetFieldId !== a && (e.querySelectorAll("[data-field-card]").forEach((n) => {
          n.classList.remove("border-t-2", "border-t-blue-400");
        }), r.classList.add("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = a));
      }), r.addEventListener("dragleave", () => {
        this.dropTargetFieldId === a && (r.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null);
      }), r.addEventListener("drop", (l) => {
        l.preventDefault();
        const n = l.dataTransfer?.getData(G);
        r.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null, this.dragReorder = null, n && n !== a && this.reorderFieldBefore(n, a);
      });
    });
  }
  /** Bind section-select dropdown changes (Phase 10 — Task 10.3) */
  bindSectionSelectEvents(e) {
    e.querySelectorAll("[data-field-section-select]").forEach((t) => {
      t.addEventListener("change", () => {
        const r = t.dataset.fieldSectionSelect;
        let a = t.value;
        if (a === "__new__") {
          const s = prompt("Section name:");
          if (s && s.trim())
            a = s.trim().toLowerCase().replace(/\s+/g, "_");
          else {
            const i = this.fields.find((l) => l.id === r);
            t.value = i?.section || x;
            return;
          }
        }
        this.moveFieldToSection(r, a);
      });
    });
  }
  notifySchemaChange() {
    this.config.onSchemaChange(this.block.id, [...this.fields]);
  }
}
function c(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function B(o) {
  return o.replace(/_/g, " ").replace(/\b\w/g, (e) => e.toUpperCase());
}
function Be(o) {
  switch (o) {
    case "active":
      return "bg-green-50 text-green-700 border border-green-200";
    case "deprecated":
      return "bg-red-50 text-red-700 border border-red-200";
    case "draft":
    default:
      return "bg-amber-50 text-amber-700 border border-amber-200";
  }
}
function f(o = "sm") {
  const e = "w-full border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  return o === "xs" ? `${e} px-2 py-1 text-[12px]` : `${e} px-2.5 py-1.5 text-sm`;
}
const P = class P {
  constructor(e) {
    this.listEl = null, this.searchInput = null, this.categorySelect = null, this.countEl = null, this.createBtn = null, this.editorEl = null, this.paletteEl = null, this.activeMenu = null, this.editorPanel = null, this.palettePanel = null, this.autosaveTimers = /* @__PURE__ */ new Map(), this.boundVisibilityChange = null, this.boundBeforeUnload = null, this.sidebarEl = null, this.paletteAsideEl = null, this.sidebarToggleBtn = null, this.gridEl = null, this.addFieldBar = null, this.paletteTriggerBtn = null, this.sidebarCollapsed = !1, this.mediaQueryLg = null, this.popoverPalettePanel = null, this.envSelectEl = null, this.currentEnvironment = "";
    const t = e.dataset.apiBasePath ?? "/admin";
    this.root = e, this.api = new $({ basePath: t }), this.state = {
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
    this.paletteEl && (this.palettePanel = new U({
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
    }, P.AUTOSAVE_DELAY);
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
          const i = this.state.blocks.find((l) => l.id === e);
          i && this.editorPanel.update(i);
        }
      } catch (s) {
        const i = s instanceof Error ? s.message : "Status change failed";
        console.error("Status change failed:", s), this.showToast(i, "error"), this.editorPanel?.revertStatus(a);
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
    r.className = "fixed z-50 w-72 max-h-[60vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden", r.dataset.palettePopover = "", r.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Field</h3>
        <button type="button" data-palette-popover-close
                class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto" data-palette-popover-content></div>
    `, r.querySelector("[data-palette-popover-close]")?.addEventListener("click", () => this.closePalettePopover());
    const a = e.getBoundingClientRect(), s = 288;
    let i = a.left, l = a.top - 8;
    i + s > window.innerWidth - 16 && (i = window.innerWidth - s - 16), i < 16 && (i = 16);
    const n = Math.min(window.innerHeight * 0.6, 480);
    l - n < 16 ? l = a.bottom + 8 : l = l - n, r.style.top = `${l}px`, r.style.left = `${i}px`, document.body.appendChild(t), document.body.appendChild(r);
    const d = r.querySelector("[data-palette-popover-content]");
    d && (this.popoverPalettePanel = new U({
      container: d,
      api: this.api,
      onAddField: (h) => {
        this.handlePaletteAddField(h), this.closePalettePopover();
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
    const t = new URLSearchParams(window.location.search).get("env") ?? "", r = sessionStorage.getItem("block-library-env") ?? "";
    this.currentEnvironment = t || r, this.api.setEnvironment(this.currentEnvironment), this.envSelectEl && (this.ensureEnvironmentOption(this.currentEnvironment), this.ensureEnvironmentOption("__add__", "Add environment..."), this.envSelectEl.value = this.currentEnvironment, this.envSelectEl.addEventListener("change", () => {
      const a = this.envSelectEl.value;
      if (a === "__add__") {
        const s = prompt("Environment name:");
        if (s && s.trim()) {
          const i = s.trim();
          this.ensureEnvironmentOption(i), this.envSelectEl.value = i, this.setEnvironment(i);
        } else
          this.envSelectEl.value = this.currentEnvironment;
        return;
      }
      this.setEnvironment(a);
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
    const r = e ?? "";
    if (r === "" || Array.from(this.envSelectEl.options).some((s) => s.value === r))
      return;
    const a = document.createElement("option");
    a.value = r, a.textContent = t ?? r, this.envSelectEl.appendChild(a);
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
      this.state.blocks = e.items;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Failed to load blocks";
    } finally {
      this.state.isLoading = !1, this.renderBlockList(), this.updateCount();
    }
  }
  async loadCategories() {
    try {
      this.state.categories = await this.api.getBlockCategories();
    } catch {
      this.state.categories = ["content", "media", "layout", "interactive", "custom"];
    }
    this.renderCategoryOptions();
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
          <p class="text-sm text-red-500">${k(this.state.error)}</p>
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
          <svg class="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500">${r ? "No blocks match your filters." : "No blocks yet."}</p>
          ${r ? "" : '<p class="text-xs text-gray-400 mt-1">Click "New Block" to create your first block definition.</p>'}
        </div>`;
      return;
    }
    let t = "";
    this.state.isCreating && (t += this.renderCreateForm()), t += '<ul class="p-2 space-y-0.5">';
    for (const r of e)
      t += this.renderBlockItem(r);
    if (t += "</ul>", this.listEl.innerHTML = t, this.state.isCreating) {
      const r = this.listEl.querySelector("[data-create-name]"), a = this.listEl.querySelector("[data-create-slug]");
      r?.focus(), r && a && (r.addEventListener("input", () => {
        a.dataset.userModified || (a.value = Me(r.value));
      }), a.addEventListener("input", () => {
        a.dataset.userModified = "true";
      }));
    }
    if (this.state.renamingBlockId) {
      const r = this.listEl.querySelector("[data-rename-input]");
      r?.focus(), r?.select();
    }
  }
  renderBlockItem(e) {
    const t = e.id === this.state.selectedBlockId, r = e.id === this.state.renamingBlockId, a = this.state.dirtyBlocks.has(e.id), s = this.state.savingBlocks.has(e.id), i = this.state.saveErrors.get(e.id), l = e.slug || e.type || "", n = t ? "bg-blue-50 border-blue-200 text-blue-800" : "hover:bg-gray-50 border-transparent", d = r ? `<input type="text" data-rename-input data-rename-block-id="${k(e.id)}"
               value="${k(e.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />` : `<span class="block font-medium text-gray-800 truncate text-[13px]">${k(e.name || "Untitled")}</span>`;
    let h = "";
    return i ? h = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Save failed: ${k(i)}"></span>` : s ? h = '<span class="flex-shrink-0 w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" title="Saving..."></span>' : a ? h = '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes"></span>' : h = Te(e.status), `
      <li>
        <div data-block-id="${k(e.id)}"
             class="relative group w-full text-left px-3 py-2 text-sm rounded-lg border ${n} transition-colors flex items-center gap-2.5 cursor-pointer">
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            ${e.icon ? `<span class="text-xs font-medium">${k(e.icon)}</span>` : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>'}
          </span>
          <span class="flex-1 min-w-0">
            ${d}
            <span class="block text-[11px] text-gray-400 font-mono truncate">${k(l)}</span>
          </span>
          ${h}
          <button type="button" data-block-actions="${k(e.id)}"
                  class="flex-shrink-0 p-0.5 rounded text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
        <div class="p-3 border border-blue-200 rounded-lg bg-blue-50/50 space-y-2">
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Name</label>
            <input type="text" data-create-name placeholder="e.g. Hero Section"
                   class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Slug</label>
            <input type="text" data-create-slug placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_\\-]*$"
                   class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <p class="mt-0.5 text-[10px] text-gray-400">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 mb-0.5">Category</label>
            <select data-create-category
                    class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              ${this.state.categories.map((e) => `<option value="${k(e)}">${k(I(e))}</option>`).join("")}
            </select>
          </div>
          <div data-create-error class="hidden text-xs text-red-600"></div>
          <div class="flex items-center gap-2 pt-1">
            <button type="button" data-create-save
                    class="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Create
            </button>
            <button type="button" data-create-cancel
                    class="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>`;
  }
  renderContextMenu(e, t) {
    this.closeContextMenu();
    const r = this.state.blocks.find((h) => h.id === e);
    if (!r) return;
    const a = document.createElement("div");
    a.setAttribute("data-block-context-menu", e), a.className = "absolute z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm text-gray-700";
    const s = [
      { label: "Rename", action: "rename", icon: M.rename },
      { label: "Duplicate", action: "duplicate", icon: M.duplicate }
    ];
    r.status === "draft" ? s.push({ label: "Publish", action: "publish", icon: M.publish }) : r.status === "active" && s.push({ label: "Deprecate", action: "deprecate", icon: M.deprecate }), s.push({ label: "Delete", action: "delete", icon: M.delete, danger: !0 }), a.innerHTML = s.map(
      (h) => `
        <button type="button" data-menu-action="${h.action}" data-menu-block-id="${k(e)}"
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 ${h.danger ? "text-red-600 hover:bg-red-50" : ""}">
          ${h.icon}
          <span>${h.label}</span>
        </button>`
    ).join("");
    const i = t.getBoundingClientRect(), l = 176;
    a.style.position = "fixed", a.style.top = `${i.bottom + 4}px`;
    let n = i.left;
    n + l > window.innerWidth - 8 && (n = window.innerWidth - l - 8), n < 8 && (n = 8), a.style.left = `${n}px`, document.body.appendChild(a);
    const d = a.getBoundingClientRect();
    d.bottom > window.innerHeight - 8 && (a.style.top = `${i.top - d.height - 4}px`), a.addEventListener("click", (h) => {
      const v = h.target.closest("[data-menu-action]");
      if (!v) return;
      const g = v.dataset.menuAction, b = v.dataset.menuBlockId;
      this.closeContextMenu(), this.handleAction(g, b);
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
        t.value = e, t.textContent = I(e), e === this.state.categoryFilter && (t.selected = !0), this.categorySelect.appendChild(t);
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
          <svg class="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm text-gray-400">Select a block from the list to edit</p>
          <p class="text-xs text-gray-300 mt-1">or create a new block to get started</p>
        </div>`, this.palettePanel?.disable(), this.updateAddFieldBar();
      return;
    }
    this.editorPanel ? this.editorPanel.update(e) : (this.editorPanel = new Le({
      container: this.editorEl,
      block: e,
      categories: this.state.categories,
      api: this.api,
      onMetadataChange: (t, r) => this.handleEditorMetadataChange(t, r),
      onSchemaChange: (t, r) => this.handleEditorSchemaChange(t, r),
      onFieldDrop: (t) => this.handlePaletteAddField(t),
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
    const r = this.state.blocks.findIndex((l) => l.id === e);
    if (r < 0) return;
    const a = this.state.blocks[r].schema, s = this.state.blocks[r].slug || this.state.blocks[r].type;
    let i = C(t, s);
    i = this.mergeSchemaExtras(a, i), this.state.blocks[r] = {
      ...this.state.blocks[r],
      schema: i
    }, this.markDirty(e), this.scheduleSave(e);
  }
  /** Handle adding a field from the palette (Phase 9 — click or drop) */
  handlePaletteAddField(e) {
    if (!this.editorPanel || !this.state.selectedBlockId) return;
    const t = e?.label ?? I(e.type), r = e.type.replace(/-/g, "_"), a = new Set(this.editorPanel.getFields().map((n) => n.name));
    let s = r, i = 1;
    for (; a.has(s); )
      s = `${r}_${i++}`;
    const l = {
      id: j(),
      name: s,
      type: e.type,
      label: t,
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
    return this.state.categoryFilter && (e = e.filter((t) => (t.category || "custom") === this.state.categoryFilter)), e;
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
    const e = this.listEl?.querySelector("[data-create-name]"), t = this.listEl?.querySelector("[data-create-slug]"), r = this.listEl?.querySelector("[data-create-category]"), a = this.listEl?.querySelector("[data-create-error]"), s = e?.value.trim() ?? "", i = t?.value.trim() ?? "", l = r?.value ?? "custom";
    if (!s) {
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
    const n = this.listEl?.querySelector("[data-create-save]");
    n && (n.disabled = !0, n.textContent = "Creating...");
    try {
      const d = await this.api.createBlockDefinition({
        name: s,
        slug: i,
        type: i,
        category: l,
        status: "draft",
        schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: {} }
      });
      d.slug || (d.slug = i), d.type || (d.type = d.slug || i), this.state.isCreating = !1, this.state.blocks.unshift(d), this.state.selectedBlockId = d.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (d) {
      const h = d instanceof K ? d.message : "Failed to create block.";
      this.showCreateError(a, h), n && (n.disabled = !1, n.textContent = "Create");
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
      const a = await this.api.updateBlockDefinition(e, { name: t }), s = this.state.blocks.findIndex((i) => i.id === e);
      s >= 0 && (this.state.blocks[s] = { ...this.state.blocks[s], ...a });
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
      const i = await this.api.cloneBlockDefinition(e, s, a);
      this.state.blocks.unshift(i), this.state.selectedBlockId = i.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
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
    if (!(!t || !confirm(`Delete "${t.name}"? This cannot be undone.`)))
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
    r >= 0 && (this.state.blocks[r] = { ...this.state.blocks[r], ...t });
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
    const r = window.__toastManager;
    if (r?.show) {
      r.show(e, { type: t });
      return;
    }
    const a = this.root.querySelector("[data-ide-toast]");
    a && a.remove();
    const s = t === "error" ? "bg-red-50 text-red-700 border-red-200" : t === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200", i = document.createElement("div");
    i.setAttribute("data-ide-toast", ""), i.className = `fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg border text-sm font-medium shadow-lg ${s} transition-opacity`, i.textContent = e, document.body.appendChild(i), setTimeout(() => {
      i.style.opacity = "0", setTimeout(() => i.remove(), 300);
    }, 3e3);
  }
};
P.AUTOSAVE_DELAY = 1500;
let z = P;
function k(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function I(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function Me(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function Te(o) {
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
const M = {
  rename: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  duplicate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  publish: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  deprecate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>',
  delete: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'
};
function je(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-ide]")).forEach((t) => {
    if (t.dataset.ideInitialized !== "true")
      try {
        new z(t).init(), t.dataset.ideInitialized = "true";
      } catch (r) {
        console.error("Block Library IDE failed to initialize:", r);
      }
  });
}
function Fe(o = document) {
  Array.from(o.querySelectorAll("[data-content-type-editor-root]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = Ae(t);
    if (!r.apiBasePath) {
      console.warn("Content type editor missing apiBasePath", t);
      return;
    }
    r.onCancel || (r.onCancel = () => {
      window.location.href = `${r.apiBasePath}/content_types`;
    }), r.onSave || (r.onSave = (a) => {
      const s = a.slug ?? a.id;
      s && (window.location.href = `${r.apiBasePath}/content_types?slug=${encodeURIComponent(s)}`);
    });
    try {
      new ne(t, r).init(), t.dataset.initialized = "true";
    } catch (a) {
      console.error("Content type editor failed to initialize:", a), t.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${a instanceof Error ? a.message : "An unexpected error occurred while initializing the editor."}
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
function Ae(o) {
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
function qe(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
qe(() => {
  Fe(), je();
});
export {
  Le as BlockEditorPanel,
  z as BlockLibraryIDE,
  pe as BlockLibraryManager,
  $ as ContentTypeAPIClient,
  K as ContentTypeAPIError,
  ne as ContentTypeEditor,
  ae as FIELD_CATEGORIES,
  N as FIELD_TYPES,
  _ as FieldConfigForm,
  U as FieldPalettePanel,
  J as FieldTypePicker,
  oe as LayoutEditor,
  H as PALETTE_DRAG_MIME,
  C as fieldsToSchema,
  j as generateFieldId,
  T as getFieldTypeMetadata,
  Pe as getFieldTypesByCategory,
  je as initBlockLibraryIDE,
  fe as initBlockLibraryManagers,
  Fe as initContentTypeEditors,
  F as schemaToFields
};
//# sourceMappingURL=index.js.map
