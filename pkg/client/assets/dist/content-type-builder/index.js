class T extends Error {
  constructor(e, t, r, a) {
    super(e), this.name = "ContentTypeAPIError", this.status = t, this.textCode = r, this.fields = a;
  }
}
class f {
  constructor(e) {
    this.config = {
      basePath: e.basePath.replace(/\/$/, ""),
      headers: e.headers ?? {},
      credentials: e.credentials ?? "same-origin"
    };
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
    const r = t.toString(), a = `${this.config.basePath}/api/content_types${r ? `?${r}` : ""}`, s = await (await this.fetch(a, { method: "GET" })).json();
    return Array.isArray(s) ? { items: s, total: s.length } : s.items && Array.isArray(s.items) ? s : s.data && Array.isArray(s.data) ? { items: s.data, total: s.total ?? s.data.length } : { items: [], total: 0 };
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
    const r = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}`, i = await (await this.fetch(r, {
      method: "PUT",
      body: JSON.stringify(t)
    })).json();
    return i.item ?? i.data ?? i;
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
    const r = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/publish`, i = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ force: t ?? !1 })
    })).json();
    return i.item ?? i.data ?? i;
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
    const a = `${this.config.basePath}/api/content_types/${encodeURIComponent(e)}/clone`, s = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ slug: t, name: r })
    })).json();
    return s.item ?? s.data ?? s;
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
      const s = await (await this.fetch(a, { method: "GET" })).json();
      return Array.isArray(s) ? { items: s, total: s.length } : s.items && Array.isArray(s.items) ? s : s.data && Array.isArray(s.data) ? { items: s.data, total: s.total ?? s.data.length } : { items: [], total: 0 };
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
    const r = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}`, i = await (await this.fetch(r, {
      method: "PUT",
      body: JSON.stringify(t)
    })).json();
    return i.item ?? i.data ?? i;
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
  async cloneBlockDefinition(e, t) {
    const r = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(e)}/clone`, i = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ type: t })
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
  // Helpers
  // ===========================================================================
  async fetch(e, t) {
    const r = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers
    }, a = await fetch(e, {
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
    throw new T(r, e.status, t?.text_code, t?.fields);
  }
}
function b(o, e) {
  const t = {}, r = [];
  for (const i of o)
    t[i.name] = q(i), i.required && r.push(i.name);
  const a = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: t
  };
  return e && (a.$id = e), r.length > 0 && (a.required = r), a;
}
function q(o) {
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
  const a = {}, i = A(o.type);
  switch (i && (a.widget = i), o.placeholder && (a.placeholder = o.placeholder), o.helpText && (a.helpText = o.helpText), o.section && (a.section = o.section), o.order !== void 0 && (a.order = o.order), o.gridSpan !== void 0 && (a.grid = { span: o.gridSpan }), o.readonly && (a.readonly = !0), o.hidden && (a.hidden = !0), Object.keys(a).length > 0 && (e["x-formgen"] = a), o.type) {
    case "select":
    case "radio":
      o.config && "options" in o.config && o.config.options && (e.enum = o.config.options.map((s) => s.value));
      break;
    case "chips":
      e.items = { type: "string" }, o.config && "options" in o.config && o.config.options && (e.items.enum = o.config.options.map((s) => s.value));
      break;
    case "media-gallery":
    case "references":
      e.items = { type: "string", format: "uri" };
      break;
    case "repeater":
      o.config && "fields" in o.config && o.config.fields && (e.items = b(o.config.fields));
      break;
    case "blocks": {
      const s = o.config, d = {
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
      s?.allowedBlocks && s.allowedBlocks.length > 0 && (d.oneOf = s.allowedBlocks.map((u) => ({
        type: "object",
        properties: {
          _type: { const: u }
        },
        required: ["_type"]
      })), d["x-discriminator"] = "_type"), e.items = d, s?.minBlocks !== void 0 && (e.minItems = s.minBlocks), s?.maxBlocks !== void 0 && (e.maxItems = s.maxBlocks);
      const n = {
        ...a,
        widget: "block",
        sortable: !0
      };
      s?.allowedBlocks && (n.allowedBlocks = s.allowedBlocks), s?.deniedBlocks && (n.deniedBlocks = s.deniedBlocks), e["x-formgen"] = n;
      break;
    }
  }
  return e;
}
function A(o) {
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
function M(o) {
  if (!o.properties)
    return [];
  const e = new Set(o.required ?? []), t = [];
  for (const [r, a] of Object.entries(o.properties))
    t.push(F(r, a, e.has(r)));
  return t.sort((r, a) => (r.order ?? 999) - (a.order ?? 999)), t;
}
function F(o, e, t) {
  const r = e["x-formgen"], a = {
    id: x(),
    name: o,
    type: I(e),
    label: e.title ?? E(o),
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
  }, i = {};
  if (e.minLength !== void 0 && (i.minLength = e.minLength), e.maxLength !== void 0 && (i.maxLength = e.maxLength), e.minimum !== void 0 && (i.min = e.minimum), e.maximum !== void 0 && (i.max = e.maximum), e.pattern && (i.pattern = e.pattern), Object.keys(i).length > 0 && (a.validation = i), e.enum && Array.isArray(e.enum) && (a.config = {
    options: e.enum.map((s) => ({
      value: String(s),
      label: E(String(s))
    }))
  }), a.type === "blocks" && e.type === "array") {
    const s = {};
    if (e.minItems !== void 0 && (s.minBlocks = e.minItems), e.maxItems !== void 0 && (s.maxBlocks = e.maxItems), r?.allowedBlocks && Array.isArray(r.allowedBlocks))
      s.allowedBlocks = r.allowedBlocks;
    else if (e.items) {
      const d = e.items;
      if (d.oneOf && Array.isArray(d.oneOf)) {
        const n = d.oneOf.map((u) => u.properties?._type?.const).filter((u) => !!u);
        n.length > 0 && (s.allowedBlocks = n);
      }
    }
    r?.deniedBlocks && Array.isArray(r.deniedBlocks) && (s.deniedBlocks = r.deniedBlocks), Object.keys(s).length > 0 && (a.config = s);
  }
  return a;
}
function I(o) {
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
function x() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function E(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
const P = {
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
function l(o) {
  return P[o] ?? "";
}
const L = [
  // Text Fields
  {
    type: "text",
    label: "Text",
    description: "Single line text input",
    icon: l("text"),
    category: "text",
    defaultConfig: { validation: { maxLength: 255 } }
  },
  {
    type: "textarea",
    label: "Textarea",
    description: "Multi-line text input",
    icon: l("textarea"),
    category: "text",
    defaultConfig: { config: { multiline: !0, rows: 4 } }
  },
  {
    type: "rich-text",
    label: "Rich Text",
    description: "WYSIWYG editor with formatting",
    icon: l("rich-text"),
    category: "text"
  },
  {
    type: "markdown",
    label: "Markdown",
    description: "Markdown text editor",
    icon: l("markdown"),
    category: "text"
  },
  {
    type: "code",
    label: "Code",
    description: "Code editor with syntax highlighting",
    icon: l("code"),
    category: "text",
    defaultConfig: { config: { language: "json", lineNumbers: !0 } }
  },
  // Number Fields
  {
    type: "number",
    label: "Number",
    description: "Decimal number input",
    icon: l("number"),
    category: "number"
  },
  {
    type: "integer",
    label: "Integer",
    description: "Whole number input",
    icon: l("integer"),
    category: "number"
  },
  {
    type: "currency",
    label: "Currency",
    description: "Money amount with currency symbol",
    icon: l("currency"),
    category: "number",
    defaultConfig: { config: { precision: 2, prefix: "$" } }
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "Percentage value (0-100)",
    icon: l("percentage"),
    category: "number",
    defaultConfig: { validation: { min: 0, max: 100 }, config: { suffix: "%" } }
  },
  // Selection Fields
  {
    type: "select",
    label: "Select",
    description: "Dropdown selection",
    icon: l("select"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "radio",
    label: "Radio",
    description: "Radio button selection",
    icon: l("radio"),
    category: "selection",
    defaultConfig: { config: { options: [] } }
  },
  {
    type: "checkbox",
    label: "Checkbox",
    description: "Single checkbox (true/false)",
    icon: l("checkbox"),
    category: "selection"
  },
  {
    type: "chips",
    label: "Chips",
    description: "Tag-style multi-select",
    icon: l("chips"),
    category: "selection",
    defaultConfig: { config: { options: [], multiple: !0 } }
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "Boolean switch",
    icon: l("toggle"),
    category: "selection"
  },
  // Date/Time Fields
  {
    type: "date",
    label: "Date",
    description: "Date picker",
    icon: l("date"),
    category: "datetime"
  },
  {
    type: "time",
    label: "Time",
    description: "Time picker",
    icon: l("time"),
    category: "datetime"
  },
  {
    type: "datetime",
    label: "Date & Time",
    description: "Date and time picker",
    icon: l("datetime"),
    category: "datetime"
  },
  // Media Fields
  {
    type: "media-picker",
    label: "Media",
    description: "Single media asset picker",
    icon: l("media-picker"),
    category: "media",
    defaultConfig: { config: { accept: "image/*" } }
  },
  {
    type: "media-gallery",
    label: "Gallery",
    description: "Multiple media assets",
    icon: l("media-gallery"),
    category: "media",
    defaultConfig: { config: { accept: "image/*", multiple: !0 } }
  },
  {
    type: "file-upload",
    label: "File",
    description: "File attachment",
    icon: l("file-upload"),
    category: "media"
  },
  // Reference Fields
  {
    type: "reference",
    label: "Reference",
    description: "Link to another content type",
    icon: l("reference"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name" } }
  },
  {
    type: "references",
    label: "References",
    description: "Multiple links to another content type",
    icon: l("references"),
    category: "reference",
    defaultConfig: { config: { target: "", displayField: "name", multiple: !0 } }
  },
  {
    type: "user",
    label: "User",
    description: "User reference",
    icon: l("user"),
    category: "reference"
  },
  // Structural Fields
  {
    type: "group",
    label: "Group",
    description: "Collapsible field group",
    icon: l("group"),
    category: "structural"
  },
  {
    type: "repeater",
    label: "Repeater",
    description: "Repeatable field group",
    icon: l("repeater"),
    category: "structural",
    defaultConfig: { config: { fields: [], minItems: 0, maxItems: 10 } }
  },
  {
    type: "blocks",
    label: "Blocks",
    description: "Modular content blocks",
    icon: l("blocks"),
    category: "structural",
    defaultConfig: { config: { allowedBlocks: [] } }
  },
  // Advanced Fields
  {
    type: "json",
    label: "JSON",
    description: "Raw JSON editor",
    icon: l("json"),
    category: "advanced"
  },
  {
    type: "slug",
    label: "Slug",
    description: "URL-friendly identifier",
    icon: l("slug"),
    category: "advanced",
    defaultConfig: { validation: { pattern: "^[a-z0-9-]+$" } }
  },
  {
    type: "color",
    label: "Color",
    description: "Color picker",
    icon: l("color"),
    category: "advanced"
  },
  {
    type: "location",
    label: "Location",
    description: "Geographic coordinates",
    icon: l("location"),
    category: "advanced"
  }
], _ = [
  { id: "text", label: "Text", icon: l("cat-text") },
  { id: "number", label: "Numbers", icon: l("cat-number") },
  { id: "selection", label: "Selection", icon: l("cat-selection") },
  { id: "datetime", label: "Date & Time", icon: l("cat-datetime") },
  { id: "media", label: "Media", icon: l("cat-media") },
  { id: "reference", label: "References", icon: l("cat-reference") },
  { id: "structural", label: "Structural", icon: l("cat-structural") },
  { id: "advanced", label: "Advanced", icon: l("cat-advanced") }
];
function S(o) {
  return L.find((e) => e.type === o);
}
function re(o) {
  return L.filter((e) => e.category === o);
}
class j {
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
    return _.map(
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
    let t = L.filter((r) => !e.has(r.type));
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
class $ {
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
    const e = S(this.field.type);
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
              value="${c(this.field.name)}"
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
              value="${c(this.field.label)}"
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
          >${c(this.field.description ?? "")}</textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${c(this.field.placeholder ?? "")}"
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
              value="${c(e.pattern ?? "")}"
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
              value="${c(this.field.section ?? "")}"
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
        (a, i) => `
              <div class="flex items-center gap-2" data-option-row="${i}">
                <input
                  type="text"
                  name="option_value_${i}"
                  value="${c(String(a.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${i}"
                  value="${c(a.label)}"
                  placeholder="label"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  data-remove-option="${i}"
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
                value="${c(t?.target ?? "")}"
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
                value="${c(t?.displayField ?? "")}"
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
                value="${c(t?.accept ?? "")}"
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
              value="${c(t?.sourceField ?? "")}"
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
                value="${c(t?.prefix ?? "")}"
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
                value="${c(t?.suffix ?? "")}"
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
              value="${c(t?.presets?.join(", ") ?? "")}"
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
                value="${c(t?.minDate ?? "")}"
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
                value="${c(t?.maxDate ?? "")}"
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
        (i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${c(i)}">${c(i)}<button type="button" data-remove-allowed="${c(i)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'}
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${c(r)}' />
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
        (i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${c(i)}">${c(i)}<button type="button" data-remove-denied="${c(i)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`
      ).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'}
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${c(a)}' />
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
      e.dataset.userModified || (e.value = H(t.value));
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
    new z({
      apiBasePath: this.config.apiBasePath ?? "/admin",
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
        const i = e === "allowed" ? "All blocks allowed (no restrictions)" : "No blocks denied";
        a.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500">${i}</span>`;
      } else {
        const i = e === "allowed" ? "blue" : "red";
        a.innerHTML = t.map(
          (s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${i}-100 text-${i}-700 dark:bg-${i}-900/30 dark:text-${i}-400" data-block-chip="${c(s)}">${c(s)}<button type="button" data-remove-${e}="${c(s)}" class="hover:text-${i}-900 dark:hover:text-${i}-200">&times;</button></span>`
        ).join(""), a.querySelectorAll(`[data-remove-${e}]`).forEach((s) => {
          s.addEventListener("click", (d) => {
            d.preventDefault();
            const n = s.getAttribute(`data-remove-${e}`);
            n && this.removeBlockFromList(e, n);
          });
        });
      }
  }
  removeBlockFromList(e, t) {
    const r = this.container?.querySelector(`input[name="${e}Blocks"]`);
    if (!r) return;
    const i = (r.value ? JSON.parse(r.value) : []).filter((s) => s !== t);
    this.updateBlockList(e, i);
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
    const a = this.config.existingFieldNames ?? [], i = this.config.field.name;
    if (r !== i && a.includes(r)) {
      this.showError("name", "A field with this name already exists");
      return;
    }
    const s = t.get("label")?.trim();
    if (!s) {
      this.showError("label", "Label is required");
      return;
    }
    const d = {
      id: this.field.id || x(),
      name: r,
      type: this.field.type,
      label: s,
      description: t.get("description")?.trim() || void 0,
      placeholder: t.get("placeholder")?.trim() || void 0,
      required: t.get("required") === "on",
      readonly: t.get("readonly") === "on",
      hidden: t.get("hidden") === "on",
      section: t.get("section")?.trim() || void 0,
      gridSpan: t.get("gridSpan") ? parseInt(t.get("gridSpan"), 10) : void 0
    }, n = {}, u = t.get("minLength");
    u !== null && u !== "" && (n.minLength = parseInt(u, 10));
    const h = t.get("maxLength");
    h !== null && h !== "" && (n.maxLength = parseInt(h, 10));
    const y = t.get("min");
    y !== null && y !== "" && (n.min = parseFloat(y));
    const k = t.get("max");
    k !== null && k !== "" && (n.max = parseFloat(k));
    const v = t.get("pattern");
    v && v.trim() && (n.pattern = v.trim()), Object.keys(n).length > 0 && (d.validation = n);
    const w = this.buildTypeSpecificConfig(t);
    w && Object.keys(w).length > 0 && (d.config = w), this.config.onSave(d), this.hide();
  }
  buildTypeSpecificConfig(e) {
    switch (this.field.type) {
      case "select":
      case "radio":
      case "chips": {
        const t = [];
        let r = 0;
        for (; e.has(`option_value_${r}`); ) {
          const a = e.get(`option_value_${r}`)?.trim(), i = e.get(`option_label_${r}`)?.trim();
          a && t.push({ value: a, label: i || a }), r++;
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
        const t = e.get("sourceField")?.trim(), r = e.get("slugPrefix")?.trim(), a = e.get("slugSuffix")?.trim(), i = e.get("slugSeparator")?.trim() || "-";
        return {
          sourceField: t || void 0,
          prefix: r || void 0,
          suffix: a || void 0,
          separator: i
        };
      }
      case "color": {
        const t = e.get("colorFormat")?.trim() || "hex", r = e.get("allowAlpha") === "on", a = e.get("colorPresets")?.trim(), i = a ? a.split(",").map((s) => s.trim()).filter(Boolean) : void 0;
        return {
          format: t,
          allowAlpha: r,
          presets: i
        };
      }
      case "location": {
        const t = e.get("defaultLat"), r = e.get("defaultLng"), a = e.get("defaultZoom"), s = { searchEnabled: e.get("searchEnabled") === "on" };
        return t && r && (s.defaultCenter = {
          lat: parseFloat(t),
          lng: parseFloat(r)
        }), a && (s.defaultZoom = parseInt(a, 10)), s;
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
        const t = e.get("minBlocks"), r = e.get("maxBlocks"), a = e.get("allowedBlocks")?.trim(), i = e.get("deniedBlocks")?.trim();
        let s, d;
        if (a)
          try {
            const n = JSON.parse(a);
            s = Array.isArray(n) && n.length > 0 ? n : void 0;
          } catch {
            s = a.split(",").map((n) => n.trim()).filter(Boolean), s.length === 0 && (s = void 0);
          }
        if (i)
          try {
            const n = JSON.parse(i);
            d = Array.isArray(n) && n.length > 0 ? n : void 0;
          } catch {
            d = i.split(",").map((n) => n.trim()).filter(Boolean), d.length === 0 && (d = void 0);
          }
        return {
          minBlocks: t ? parseInt(t, 10) : void 0,
          maxBlocks: r ? parseInt(r, 10) : void 0,
          allowedBlocks: s,
          deniedBlocks: d
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
    const i = document.createElement("p");
    i.className = "field-error text-xs text-red-500 mt-1", i.textContent = t, r.parentElement?.appendChild(i);
    const s = () => {
      r.classList.remove("border-red-500", "focus:ring-red-500"), i.remove(), r.removeEventListener("input", s);
    };
    r.addEventListener("input", s);
  }
}
function c(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function H(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[0-9]/, "_$&");
}
class z {
  constructor(e) {
    this.container = null, this.backdrop = null, this.availableBlocks = [], this.config = e, this.api = new f({ basePath: e.apiBasePath }), this.selectedBlocks = new Set(e.selectedBlocks);
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
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${c(this.config.title)}</h3>
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
      this.availableBlocks = a, e?.classList.add("hidden"), a.length === 0 ? r?.classList.remove("hidden") : (t?.classList.remove("hidden"), this.renderBlocksList());
    } catch {
      e?.classList.add("hidden"), r?.classList.remove("hidden");
      const a = r?.querySelector("span") || r;
      a && (a.textContent = "Failed to load block definitions");
    }
  }
  renderBlocksList() {
    const e = this.container?.querySelector("[data-blocks-list]");
    e && (e.innerHTML = this.availableBlocks.map((t) => {
      const r = this.selectedBlocks.has(t.type);
      return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${r ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
            <input
              type="checkbox"
              value="${c(t.type)}"
              ${r ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${t.icon || t.type.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${c(t.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${c(t.type)}</div>
            </div>
            ${t.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${c(t.schema_version)}</span>` : ""}
          </label>
        `;
    }).join(""), e.querySelectorAll('input[type="checkbox"]').forEach((t) => {
      t.addEventListener("change", () => {
        const r = t.value;
        t.checked ? this.selectedBlocks.add(r) : this.selectedBlocks.delete(r), this.updateSelectionCount(), this.renderBlocksList();
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
class N {
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
            value="${m(e.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${t}"
            value="${m(e.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="tab_icon_${t}"
            value="${m(e.icon ?? "")}"
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
      const i = a.section ?? "";
      r.has(i) || r.set(i, []), r.get(i).push(a);
    }
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Field Assignment</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Fields are assigned to ${t}s via the "Section/Tab" setting in each field's configuration.
        </p>

        <div class="grid grid-cols-2 gap-4">
          ${Array.from(r.entries()).map(
      ([a, i]) => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${a || "(Unassigned)"}
              </div>
              <div class="space-y-1">
                ${i.length === 0 ? '<div class="text-xs text-gray-400">No fields</div>' : i.map((s) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${m(s.label)} <span class="font-mono">(${m(s.name)})</span></div>`).join("")}
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
      const i = parseInt(a.getAttribute("data-tab-index") ?? "0", 10);
      this.moveTab(this.dragState.tabId, i), this.dragState = null;
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
    const r = this.layout.tabs.findIndex((i) => i.id === e);
    if (r === -1 || r === t) return;
    const a = this.layout.tabs.splice(r, 1)[0];
    this.layout.tabs.splice(t, 0, a), this.layout.tabs.forEach((i, s) => {
      i.order = s;
    }), this.updateView();
  }
  updateTabsFromForm() {
    !this.container || !this.layout.tabs || this.layout.tabs.forEach((e, t) => {
      const r = this.container.querySelector(`input[name="tab_id_${t}"]`), a = this.container.querySelector(`input[name="tab_label_${t}"]`), i = this.container.querySelector(`input[name="tab_icon_${t}"]`);
      r && (e.id = r.value.trim()), a && (e.label = a.value.trim()), i && (e.icon = i.value.trim() || void 0);
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
function m(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
class V {
  constructor(e, t) {
    this.dragState = null, this.container = e, this.config = t, this.api = new f({ basePath: t.apiBasePath }), this.state = {
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
      this.state.contentType = t, this.state.fields = M(t.schema), t.ui_schema?.layout && (this.state.layout = {
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
    const r = b(this.state.fields, this.getSlug()), a = {
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
      let i;
      this.state.contentType?.id ? i = await this.api.update(this.state.contentType.id, a) : i = await this.api.create(a), this.state.contentType = i, this.state.isDirty = !1, this.showToast("Content type saved successfully", "success"), this.config.onSave?.(i);
    } catch (i) {
      console.error("Failed to save content type:", i);
      const s = i instanceof Error ? i.message : "Failed to save content type";
      this.showToast(s, "error");
    } finally {
      this.state.isSaving = !1, this.updateSavingState();
    }
  }
  /**
   * Add a new field
   */
  addField(e) {
    const t = S(e), r = {
      id: x(),
      name: `new_${e}_${this.state.fields.length + 1}`,
      type: e,
      label: t?.label ?? e,
      required: !1,
      order: this.state.fields.length,
      ...t?.defaultConfig ?? {}
    };
    new $({
      field: r,
      existingFieldNames: this.state.fields.map((i) => i.name),
      onSave: (i) => {
        this.state.fields.push(i), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState();
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
    new $({
      field: t,
      existingFieldNames: this.state.fields.filter((a) => a.id !== e).map((a) => a.name),
      onSave: (a) => {
        const i = this.state.fields.findIndex((s) => s.id === e);
        i !== -1 && (this.state.fields[i] = a, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState());
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
    const r = this.state.fields.findIndex((i) => i.id === e);
    if (r === -1 || r === t) return;
    const a = this.state.fields.splice(r, 1)[0];
    this.state.fields.splice(t, 0, a), this.state.fields.forEach((i, s) => {
      i.order = s;
    }), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState();
  }
  /**
   * Validate the schema
   */
  async validateSchema() {
    const e = b(this.state.fields, this.getSlug());
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
    const e = b(this.state.fields, this.getSlug());
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
              ${e?.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${g(e.schema_version)}</span>` : ""}
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
              value="${g(e?.name ?? "")}"
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
              value="${g(e?.slug ?? "")}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_-]*$"
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
          >${g(e?.description ?? "")}</textarea>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Icon
          </label>
          <input
            type="text"
            data-ct-icon
            value="${g(e?.icon ?? "")}"
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
    const r = S(e.type), a = this.state.selectedFieldId === e.id, i = this.state.validationErrors.filter(
      (n) => n.path.includes(`/${e.name}`) || n.path.includes(`properties.${e.name}`)
    ), s = i.length > 0, d = [];
    return e.validation?.minLength && d.push(`min: ${e.validation.minLength}`), e.validation?.maxLength && d.push(`max: ${e.validation.maxLength}`), e.validation?.min !== void 0 && d.push(`>= ${e.validation.min}`), e.validation?.max !== void 0 && d.push(`<= ${e.validation.max}`), e.validation?.pattern && d.push("pattern"), `
      <div
        class="field-card flex items-center gap-3 p-3 border rounded-lg transition-colors ${s ? "border-red-400 bg-red-50 dark:bg-red-900/10" : a ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600"}"
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
        <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${s ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}">
          ${s ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : r?.icon ?? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'}
        </div>

        <!-- Field Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-white truncate">${g(e.label)}</span>
            ${e.required ? '<span class="text-xs text-red-500">Required</span>' : ""}
            ${e.readonly ? '<span class="text-xs text-gray-400">Read-only</span>' : ""}
            ${e.hidden ? '<span class="text-xs text-gray-400">Hidden</span>' : ""}
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="font-mono">${g(e.name)}</span>
            <span>•</span>
            <span>${r?.label ?? e.type}</span>
            ${e.section ? `<span>• ${g(e.section)}</span>` : ""}
            ${e.gridSpan ? `<span>• ${e.gridSpan} cols</span>` : ""}
          </div>
          ${d.length > 0 ? `
            <div class="flex items-center gap-1 mt-1">
              ${d.map((n) => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${g(n)}</span>`).join("")}
            </div>
          ` : ""}
          ${s ? `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${i.map((n) => g(n.message)).join(", ")}
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
    const e = b(this.state.fields, this.getSlug());
    let t = null;
    try {
      t = await this.api.checkCompatibility(
        this.state.contentType.id,
        e,
        this.buildUISchema()
      );
    } catch {
    }
    new R({
      contentType: this.state.contentType,
      compatibilityResult: t,
      onConfirm: async (a) => {
        try {
          const i = await this.api.publish(this.state.contentType.id, a);
          this.state.contentType = i, this.state.isDirty = !1, this.render(), this.bindEvents(), this.showToast("Content type published successfully", "success"), this.config.onSave?.(i);
        } catch (i) {
          const s = i instanceof Error ? i.message : "Failed to publish content type";
          this.showToast(s, "error");
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
    new U({
      contentType: this.state.contentType,
      onConfirm: async (t, r) => {
        try {
          const a = await this.api.clone(this.state.contentType.id, t, r);
          this.showToast(`Content type cloned as "${a.name}"`, "success"), this.config.onSave && this.config.onSave(a);
        } catch (a) {
          const i = a instanceof Error ? a.message : "Failed to clone content type";
          this.showToast(i, "error");
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
    new J({
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
      const a = r.target, i = a.closest("[data-field-edit]");
      if (i) {
        const n = i.getAttribute("data-field-edit");
        n && this.editField(n);
        return;
      }
      const s = a.closest("[data-field-remove]");
      if (s) {
        const n = s.getAttribute("data-field-remove");
        n && this.removeField(n);
        return;
      }
      const d = a.closest("[data-field-card]");
      if (d && !a.closest("button")) {
        const n = d.getAttribute("data-field-card");
        n && (this.state.selectedFieldId = this.state.selectedFieldId === n ? null : n, this.renderFieldList());
      }
    }), this.container.addEventListener("input", (r) => {
      const a = r.target;
      (a.matches("[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]") || a.matches("[data-ct-cap]")) && (this.state.isDirty = !0, this.updateDirtyState());
    });
    const e = this.container.querySelector("[data-ct-name]"), t = this.container.querySelector("[data-ct-slug]");
    e && t && (e.addEventListener("input", () => {
      !t.dataset.userModified && !this.state.contentType?.slug && (t.value = B(e.value));
    }), t.addEventListener("input", () => {
      t.dataset.userModified = "true";
    })), this.bindDragEvents();
  }
  bindDragEvents() {
    const e = this.container.querySelector("[data-ct-field-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const r = t, i = r.target.closest("[data-field-card]");
      if (!i) return;
      const s = i.getAttribute("data-field-card"), d = parseInt(i.getAttribute("data-field-index") ?? "0", 10);
      this.dragState = {
        fieldId: s ?? "",
        startIndex: d,
        currentIndex: d
      }, i.classList.add("opacity-50"), r.dataTransfer?.setData("text/plain", s ?? ""), r.dataTransfer && (r.dataTransfer.effectAllowed = "move");
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
      const r = t;
      if (!this.dragState) return;
      const i = r.target.closest("[data-field-card]");
      if (!i || i.getAttribute("data-field-card") === this.dragState.fieldId) return;
      const s = i.getBoundingClientRect(), d = s.top + s.height / 2, n = r.clientY < d;
      e.querySelectorAll(".drop-indicator").forEach((y) => y.remove());
      const u = document.createElement("div");
      u.className = "drop-indicator h-0.5 bg-blue-500 rounded-full my-1 transition-opacity", n ? i.parentElement?.insertBefore(u, i) : i.parentElement?.insertBefore(u, i.nextSibling);
      const h = parseInt(i.getAttribute("data-field-index") ?? "0", 10);
      this.dragState.currentIndex = n ? h : h + 1;
    }), e.addEventListener("dragleave", () => {
      e.querySelectorAll(".drop-indicator").forEach((t) => t.remove());
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), e.querySelectorAll(".drop-indicator").forEach((s) => s.remove()), !this.dragState) return;
      const { fieldId: r, startIndex: a, currentIndex: i } = this.dragState;
      if (a !== i) {
        const s = i > a ? i - 1 : i;
        this.moveField(r, s);
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
    new j({
      onSelect: (t) => this.addField(t),
      onCancel: () => {
      }
    }).show();
  }
  showLayoutEditor() {
    new N({
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
    return r || B(t?.value ?? "");
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
      (this.state.layout.tabs ?? []).forEach((i, s) => {
        a.set(i.id, {
          id: i.id,
          label: i.label,
          order: i.order ?? s,
          icon: i.icon
        });
      }), this.state.fields.forEach((i) => {
        i.section && !a.has(i.section) && a.set(i.section, {
          id: i.section,
          label: D(i.section),
          order: a.size
        });
      }), a.size > 0 && (t.tabs = Array.from(a.values()).sort((i, s) => i.order - s.order));
    }
    e.layout = t;
    const r = [];
    if (this.state.fields.forEach((a) => {
      const i = { path: `#/properties/${a.name}` }, s = {};
      a.section && (s.section = a.section), a.gridSpan && (s.grid = { span: a.gridSpan }), a.order !== void 0 && (s.order = a.order), a.readonly && (s.readonly = !0), a.hidden && (s.hidden = !0), Object.keys(s).length > 0 && (i["x-formgen"] = s, r.push(i));
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
      const i = a.path.match(/properties[./](\w+)/);
      if (i) {
        const s = i[1];
        t.has(s) || t.set(s, []), t.get(s).push(a);
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
                ${r.map((a) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${g(a.message)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${Array.from(t.entries()).map(([a, i]) => {
      const s = this.state.fields.find((d) => d.name === a);
      return `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${g(s?.label ?? a)} <span class="font-mono">(${g(a)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${i.map((d) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${g(d.message)}</li>`).join("")}
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
function g(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function B(o) {
  return o.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function D(o) {
  return o.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((e) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()).join(" ");
}
function O(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
class R {
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
    const { contentType: e, compatibilityResult: t } = this.config, r = (t?.breaking_changes?.length ?? 0) > 0, a = (t?.warnings?.length ?? 0) > 0, i = t?.affected_entries_count ?? 0;
    this.backdrop = document.createElement("div"), this.backdrop.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/50 transition-opacity duration-150 opacity-0", this.container = document.createElement("div"), this.container.className = "bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden", this.container.innerHTML = `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${g(e.name)}</strong>.
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
              ${t.breaking_changes.map((s) => `
                <li>• ${g(s.description || `${s.type}: ${s.path}`)}</li>
              `).join("")}
            </ul>
            ${i > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${i} content ${i === 1 ? "entry" : "entries"} will require migration.
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
              ${t.warnings.map((s) => `
                <li>• ${g(s.description || `${s.type}: ${s.path}`)}</li>
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
class U {
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
          Create a copy of <strong class="text-gray-900 dark:text-white">${g(e.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${g(t)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_-]*$"
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
            value="${g(r)}"
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
      if (!/^[a-z][a-z0-9_-]*$/.test(r)) {
        alert("Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter."), e?.focus();
        return;
      }
      this.config.onConfirm(r, a || void 0), this.hide();
    }), this.container?.addEventListener("keydown", (e) => {
      e.key === "Enter" ? (e.preventDefault(), this.container?.querySelector("[data-clone-confirm]")?.click()) : e.key === "Escape" && (this.config.onCancel(), this.hide());
    });
  }
}
class J {
  constructor(e) {
    this.container = null, this.backdrop = null, this.versions = [], this.expandedVersions = /* @__PURE__ */ new Set(), this.config = e, this.api = new f({ basePath: e.apiBasePath });
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
          <p class="text-sm text-gray-500 dark:text-gray-400">${g(this.config.contentType.name)} (${g(this.config.contentType.slug)})</p>
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
          <p class="text-xs mt-2">Current version: ${g(this.config.contentType.schema_version ?? "1.0.0")}</p>
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
    const r = this.expandedVersions.has(e.version), a = (e.changes?.length ?? 0) > 0, i = e.is_breaking || e.changes?.some((s) => s.is_breaking);
    return `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${g(e.version)}</span>
              ${t ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ""}
              ${i ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
              ${this.getMigrationBadge(e.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${O(e.created_at)}</span>
            ${a ? `
              <button
                type="button"
                data-toggle-version="${g(e.version)}"
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
              ${e.changes.map((s) => this.renderChangeItem(s)).join("")}
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
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${g(e.path)}</span>
          ${e.field ? `<span class="text-gray-500 dark:text-gray-400"> (${g(e.field)})</span>` : ""}
          ${e.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${g(e.description)}</p>` : ""}
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
class G {
  constructor(e) {
    this.container = null, this.backdrop = null, this.categories = [], this.config = e, this.api = new f({ basePath: e.apiBasePath }), this.state = {
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
      const i = a.target, s = i.closest("[data-block-id]");
      if (s && this.config.mode === "picker") {
        const d = s.getAttribute("data-block-id"), n = this.state.blocks.find((u) => u.id === d);
        n && this.isBlockAllowed(n) && (this.config.onSelect?.({
          id: n.id,
          name: n.name,
          type: n.type,
          description: n.description,
          icon: n.icon,
          category: n.category,
          schema_version: n.schema_version,
          status: n.status
        }), this.hide());
        return;
      }
      if (i.closest("[data-block-edit]")) {
        const n = i.closest("[data-block-id]")?.getAttribute("data-block-id"), u = this.state.blocks.find((h) => h.id === n);
        u && this.showBlockEditor(u);
        return;
      }
      if (i.closest("[data-block-delete]")) {
        const n = i.closest("[data-block-id]")?.getAttribute("data-block-id"), u = this.state.blocks.find((h) => h.id === n);
        u && this.confirmDeleteBlock(u);
        return;
      }
      if (i.closest("[data-block-clone]")) {
        const n = i.closest("[data-block-id]")?.getAttribute("data-block-id"), u = this.state.blocks.find((h) => h.id === n);
        u && this.cloneBlock(u);
        return;
      }
      if (i.closest("[data-block-publish]")) {
        const n = i.closest("[data-block-id]")?.getAttribute("data-block-id"), u = this.state.blocks.find((h) => h.id === n);
        u && this.publishBlock(u);
        return;
      }
      if (i.closest("[data-block-versions]")) {
        const n = i.closest("[data-block-id]")?.getAttribute("data-block-id"), u = this.state.blocks.find((h) => h.id === n);
        u && this.showVersionHistory(u);
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
        r.value = t, r.textContent = C(t), e.appendChild(r);
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
    for (const i of t) {
      const s = i.category || "custom";
      r.has(s) || r.set(s, []), r.get(s).push(i);
    }
    let a = "";
    for (const [i, s] of r)
      a += `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${C(i)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${s.map((d) => this.renderBlockCard(d)).join("")}
          </div>
        </div>
      `;
    e.innerHTML = a;
  }
  renderBlockCard(e) {
    const t = this.config.mode !== "picker", r = this.isBlockAllowed(e), a = this.getStatusBadge(e.status);
    return `
      <div
        data-block-id="${e.id}"
        class="relative p-4 border rounded-lg ${r ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed"} transition-colors"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${e.icon || e.type.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${p(e.name)}</h4>
              ${a}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${p(e.type)}</p>
            ${e.description ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${p(e.description)}</p>` : ""}
            ${e.schema_version ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${p(e.schema_version)}</p>` : ""}
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
        (r) => r.name.toLowerCase().includes(t) || r.type.toLowerCase().includes(t) || (r.description?.toLowerCase().includes(t) ?? !1)
      );
    }
    return this.state.categoryFilter && (e = e.filter((t) => t.category === this.state.categoryFilter)), e;
  }
  isBlockAllowed(e) {
    const { allowedBlocks: t, deniedBlocks: r } = this.config;
    return r && r.includes(e.type) ? !1 : t && t.length > 0 ? t.includes(e.type) : !0;
  }
  showBlockEditor(e) {
    new Q({
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
    const t = prompt("Enter a unique type for the cloned block:", `${e.type}_copy`);
    if (t)
      try {
        await this.api.cloneBlockDefinition(e.id, t), await this.loadBlocks();
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
    new W({
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
class Q {
  constructor(e) {
    this.container = null, this.backdrop = null, this.fields = [], this.config = e, this.api = new f({ basePath: e.apiBasePath }), this.isNew = !e.block, e.block?.schema && (this.fields = M(e.block.schema));
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
                value="${p(e?.name ?? "")}"
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
                value="${p(e?.type ?? "")}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_-]*$"
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
            >${p(e?.description ?? "")}</textarea>
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
                ${this.config.categories.map((t) => `<option value="${t}" ${e?.category === t ? "selected" : ""}>${C(t)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <input
                type="text"
                name="icon"
                value="${p(e?.icon ?? "")}"
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
              <span class="text-sm font-medium text-gray-900 dark:text-white">${p(e.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${p(e.name)}</span>
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
        const i = parseInt(r.getAttribute("data-edit-field") ?? "-1", 10);
        i >= 0 && this.fields[i] && this.showFieldConfigForm(this.fields[i], i);
        return;
      }
      const a = t.closest("[data-remove-field]");
      if (a) {
        const i = parseInt(a.getAttribute("data-remove-field") ?? "-1", 10);
        i >= 0 && (this.fields.splice(i, 1), this.updateFieldsList());
        return;
      }
    }));
  }
  showFieldTypePicker() {
    new j({
      onSelect: (t) => {
        const r = {
          id: x(),
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
    new $({
      field: e,
      existingFieldNames: this.fields.filter((a, i) => i !== t).map((a) => a.name),
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
    if (!/^[a-z][a-z0-9_-]*$/.test(a)) {
      alert("Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.");
      return;
    }
    const i = b(this.fields, a), s = {
      name: r,
      type: a,
      description: t.get("description")?.trim() || void 0,
      category: t.get("category") || "custom",
      icon: t.get("icon")?.trim() || void 0,
      schema: i,
      status: this.config.block?.status ?? "draft"
    };
    try {
      let d;
      this.isNew ? d = await this.api.createBlockDefinition(s) : d = await this.api.updateBlockDefinition(this.config.block.id, s), this.config.onSave(d), this.hide();
    } catch (d) {
      alert(d instanceof Error ? d.message : "Failed to save block");
    }
  }
}
class W {
  constructor(e) {
    this.container = null, this.backdrop = null, this.versions = [], this.config = e, this.api = new f({ basePath: e.apiBasePath });
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
          <p class="text-sm text-gray-500 dark:text-gray-400">${p(this.config.block.name)} (${p(this.config.block.type)})</p>
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
          <p class="text-xs mt-2">Current version: ${p(this.config.block.schema_version ?? "1.0.0")}</p>
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
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${p(t.version)}</span>
                ${t.is_breaking ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
                ${this.getMigrationBadge(t.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${Z(t.created_at)}</span>
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
function p(o) {
  const e = document.createElement("div");
  return e.textContent = o, e.innerHTML;
}
function C(o) {
  return o.charAt(0).toUpperCase() + o.slice(1).toLowerCase();
}
function Z(o) {
  try {
    return new Date(o).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return o;
  }
}
function Y(o = document) {
  Array.from(o.querySelectorAll("[data-block-library-trigger]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = {
      apiBasePath: t.dataset.apiBasePath ?? "/admin",
      mode: t.dataset.mode ?? "manage"
    };
    t.addEventListener("click", () => {
      new G(r).show();
    }), t.dataset.initialized = "true";
  });
}
function X(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
X(() => Y());
function K(o = document) {
  Array.from(o.querySelectorAll("[data-content-type-editor-root]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = ee(t);
    if (!r.apiBasePath) {
      console.warn("Content type editor missing apiBasePath", t);
      return;
    }
    r.onCancel || (r.onCancel = () => {
      window.location.href = `${r.apiBasePath}/content_types`;
    }), r.onSave || (r.onSave = (a) => {
      const i = a.slug ?? a.id;
      i && (window.location.href = `${r.apiBasePath}/content_types?slug=${encodeURIComponent(i)}`);
    });
    try {
      new V(t, r).init(), t.dataset.initialized = "true";
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
function ee(o) {
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
function te(o) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o, { once: !0 }) : o();
}
te(() => K());
export {
  G as BlockLibraryManager,
  f as ContentTypeAPIClient,
  T as ContentTypeAPIError,
  V as ContentTypeEditor,
  _ as FIELD_CATEGORIES,
  L as FIELD_TYPES,
  $ as FieldConfigForm,
  j as FieldTypePicker,
  N as LayoutEditor,
  b as fieldsToSchema,
  x as generateFieldId,
  S as getFieldTypeMetadata,
  re as getFieldTypesByCategory,
  Y as initBlockLibraryManagers,
  K as initContentTypeEditors,
  M as schemaToFields
};
//# sourceMappingURL=index.js.map
