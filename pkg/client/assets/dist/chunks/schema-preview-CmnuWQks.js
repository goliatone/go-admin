import { escapeHTML as s } from "../shared/html.js";
import { t as Be } from "./icon-renderer-CRFyVbyB.js";
import { r as Q } from "./modal-ClEsOn-S.js";
import { httpRequest as Je } from "../shared/transport/http-client.js";
import { extractErrorMessage as We } from "../toast/error-helpers.js";
import { t as H } from "./badge-uRjgR9qC.js";
import { parseJSONValue as ee } from "../shared/json-parse.js";
import { titleCaseIdentifier as ve, titleCaseWords as pe } from "../content-type-builder/shared/text.js";
import { deepCloneJSON as ue } from "../shared/deep-clone.js";
import { a as S, c as g, l as D, o as Qe, s as h, u as Ye } from "./channel-validation-BBf_63LY.js";
import { normalizeAPIBasePath as O, trimTrailingSlash as xe } from "../shared/path-normalization.js";
var Ze = class extends Error {
  constructor(t, e, r, a) {
    super(t), this.name = "ContentTypeAPIError", this.status = e, this.textCode = r, this.fields = a;
  }
}, Xe = class {
  constructor(t) {
    this.channel = "";
    let e = t.basePath.replace(/\/+$/, "");
    e && !/\/api(\/|$)/.test(e) && (e = `${e}/api`), this.config = {
      basePath: e,
      headers: t.headers ?? {},
      credentials: t.credentials ?? "same-origin"
    };
  }
  setChannel(t) {
    this.channel = t;
  }
  getChannel() {
    return this.channel;
  }
  getBasePath() {
    return this.config.basePath;
  }
  async setChannelSession(t) {
    const e = String(t ?? "").trim();
    await this.fetch(`${this.config.basePath}/session/channel`, {
      method: "POST",
      body: JSON.stringify({ channel: e })
    });
  }
  contentTypesPanelBasePath() {
    return `${this.config.basePath}/panels/content_types`;
  }
  async list(t) {
    const e = new URLSearchParams();
    t?.page && e.set("page", String(t.page)), t?.per_page && e.set("per_page", String(t.per_page)), t?.search && e.set("search", t.search);
    const r = e.toString(), a = `${this.contentTypesPanelBasePath()}${r ? `?${r}` : ""}`, o = await (await this.fetch(a, { method: "GET" })).json();
    return Array.isArray(o) ? {
      items: o,
      total: o.length
    } : o.items && Array.isArray(o.items) ? o : o.data && Array.isArray(o.data) ? {
      items: o.data,
      total: o.total ?? o.data.length
    } : {
      items: [],
      total: 0
    };
  }
  async get(t) {
    const e = `${this.contentTypesPanelBasePath()}/${encodeURIComponent(t)}`, r = await (await this.fetch(e, { method: "GET" })).json();
    return r.item ?? r.data ?? r;
  }
  async create(t) {
    const e = this.contentTypesPanelBasePath(), r = await (await this.fetch(e, {
      method: "POST",
      body: JSON.stringify(t)
    })).json();
    return r.item ?? r.data ?? r;
  }
  async update(t, e) {
    const r = `${this.contentTypesPanelBasePath()}/${encodeURIComponent(t)}`, a = await (await this.fetch(r, {
      method: "PUT",
      body: JSON.stringify(e)
    })).json();
    return a.item ?? a.data ?? a;
  }
  async delete(t) {
    const e = `${this.contentTypesPanelBasePath()}/${encodeURIComponent(t)}`;
    await this.fetch(e, { method: "DELETE" });
  }
  async publish(t, e) {
    const r = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/publish`, a = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({ force: e ?? !1 })
    })).json();
    return a.item ?? a.data ?? a;
  }
  async deprecate(t) {
    const e = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/deprecate`, r = await (await this.fetch(e, { method: "POST" })).json();
    return r.item ?? r.data ?? r;
  }
  async clone(t, e, r) {
    const a = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/clone`, o = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({
        slug: e,
        name: r
      })
    })).json();
    return o.item ?? o.data ?? o;
  }
  async checkCompatibility(t, e, r) {
    const a = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/compatibility`;
    return await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({
        schema: e,
        ui_schema: r
      })
    })).json();
  }
  async getVersionHistory(t) {
    const e = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/versions`;
    try {
      const r = await (await this.fetch(e, { method: "GET" })).json();
      return { versions: r.versions ?? r.items ?? r ?? [] };
    } catch {
      return { versions: [] };
    }
  }
  async validateSchema(t) {
    const e = `${this.config.basePath}/content_types/validate`;
    return await (await this.fetch(e, {
      method: "POST",
      body: JSON.stringify(t)
    })).json();
  }
  async previewSchema(t) {
    const e = `${this.config.basePath}/content_types/preview`;
    return await (await this.fetch(e, {
      method: "POST",
      body: JSON.stringify(t)
    })).json();
  }
  blockDefinitionsPanelBasePath() {
    return `${this.config.basePath}/panels/block_definitions`;
  }
  async listBlockDefinitionsSummary() {
    const t = await (await this.fetch(this.blockDefinitionsPanelBasePath(), { method: "GET" })).json();
    return Array.isArray(t) ? t : t.items && Array.isArray(t.items) ? t.items : t.data && Array.isArray(t.data) ? t.data : [];
  }
  async listBlockDefinitions(t) {
    const e = new URLSearchParams();
    t?.page && e.set("page", String(t.page)), t?.per_page && e.set("per_page", String(t.per_page)), t?.search && e.set("search", t.search), t?.category && e.set("filter_category", t.category), t?.status && e.set("filter_status", t.status);
    const r = e.toString(), a = `${this.blockDefinitionsPanelBasePath()}${r ? `?${r}` : ""}`, o = await (await this.fetch(a, { method: "GET" })).json();
    return Array.isArray(o) ? {
      items: o,
      total: o.length
    } : o.items && Array.isArray(o.items) ? o : o.data && Array.isArray(o.data) ? {
      items: o.data,
      total: o.total ?? o.data.length
    } : {
      items: [],
      total: 0
    };
  }
  async getBlockDefinition(t) {
    const e = `${this.blockDefinitionsPanelBasePath()}/${encodeURIComponent(t)}`, r = await (await this.fetch(e, { method: "GET" })).json();
    return r.item ?? r.data ?? r;
  }
  async createBlockDefinition(t) {
    const e = this.blockDefinitionsPanelBasePath(), r = await (await this.fetch(e, {
      method: "POST",
      body: JSON.stringify(t)
    })).json();
    return r.item ?? r.data ?? r;
  }
  async updateBlockDefinition(t, e) {
    const r = `${this.blockDefinitionsPanelBasePath()}/${encodeURIComponent(t)}`, a = await (await this.fetch(r, {
      method: "PUT",
      body: JSON.stringify(e)
    })).json();
    return a.item ?? a.data ?? a;
  }
  async deleteBlockDefinition(t) {
    const e = `${this.blockDefinitionsPanelBasePath()}/${encodeURIComponent(t)}`;
    await this.fetch(e, { method: "DELETE" });
  }
  async publishBlockDefinition(t) {
    const e = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/publish`, r = await (await this.fetch(e, { method: "POST" })).json();
    return r.item ?? r.data ?? r;
  }
  async deprecateBlockDefinition(t) {
    const e = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/deprecate`, r = await (await this.fetch(e, { method: "POST" })).json();
    return r.item ?? r.data ?? r;
  }
  async cloneBlockDefinition(t, e, r) {
    const a = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/clone`, o = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({
        type: e,
        slug: r
      })
    })).json();
    return o.item ?? o.data ?? o;
  }
  async getBlockDefinitionVersions(t) {
    const e = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/versions`;
    try {
      const r = await (await this.fetch(e, { method: "GET" })).json();
      return { versions: r.versions ?? r.items ?? r ?? [] };
    } catch {
      return { versions: [] };
    }
  }
  async getBlockCategories() {
    const t = `${this.config.basePath}/block_definitions_meta/categories`;
    try {
      const e = await (await this.fetch(t, { method: "GET" })).json();
      return Array.isArray(e) ? e : e.categories ?? [];
    } catch {
      return [
        "content",
        "media",
        "layout",
        "interactive",
        "custom"
      ];
    }
  }
  async getBlockDefinitionDiagnostics() {
    return await this.fetchBlockDefinitionDiagnostics(`${this.config.basePath}/block_definitions_meta/diagnostics`);
  }
  async fetchBlockDefinitionDiagnostics(t) {
    try {
      const e = await (await this.fetch(t, { method: "GET" })).json();
      if (!e || typeof e != "object") return null;
      const r = e, a = this.toNonEmptyString(r.effective_channel);
      if (!a) return null;
      const o = this.toNonEmptyString(r.requested_channel), i = Array.isArray(r.available_channels) ? r.available_channels : [];
      return {
        effective_channel: a,
        requested_channel: o,
        total_effective: Number.isFinite(r.total_effective) ? Number(r.total_effective) : 0,
        total_default: Number.isFinite(r.total_default) ? Number(r.total_default) : 0,
        available_channels: i.map((n) => String(n)).filter((n) => n.length > 0)
      };
    } catch {
      return null;
    }
  }
  toNonEmptyString(...t) {
    for (const e of t) if (typeof e == "string" && e.trim().length > 0) return e;
    return "";
  }
  appendQueryParamIfMissing(t, e, r) {
    if (!r) return t;
    const a = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[?&])${a}=`).test(t) ? t : `${t}${t.includes("?") ? "&" : "?"}${e}=${encodeURIComponent(r)}`;
  }
  async getFieldTypes() {
    const t = `${this.config.basePath}/block_definitions_meta/field_types`;
    try {
      const e = await (await this.fetch(t, { method: "GET" })).json();
      return Array.isArray(e) ? e : e.items && Array.isArray(e.items) ? e.items : e.field_types && Array.isArray(e.field_types) ? e.field_types : null;
    } catch {
      return null;
    }
  }
  async getBlockFieldTypeGroups() {
    const t = `${this.config.basePath}/block_definitions_meta/field_types`;
    try {
      const e = await (await this.fetch(t, { method: "GET" })).json();
      return e && Array.isArray(e.categories) ? e.categories : null;
    } catch {
      return null;
    }
  }
  async fetch(t, e) {
    const r = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers
    };
    this.channel && (r["X-Admin-Channel"] = this.channel, t = this.appendQueryParamIfMissing(t, "channel", this.channel));
    const a = await Je(t, {
      ...e,
      headers: r,
      credentials: this.config.credentials
    });
    return a.ok || await this.handleError(a), a;
  }
  async handleError(t) {
    let e = null;
    try {
      e = await t.clone().json();
    } catch {
    }
    const r = await We(t);
    let a = e?.text_code, o = e?.fields;
    if (e && typeof e.error == "object" && e.error) {
      const i = e.error;
      if (!a && typeof i.text_code == "string" && (a = i.text_code), !o) {
        const n = i.metadata?.fields;
        n && typeof n == "object" && (o = n);
      }
      if (!o && Array.isArray(i.validation_errors)) {
        const n = {};
        for (const c of i.validation_errors) {
          const l = typeof c.field == "string" ? c.field : "", d = typeof c.message == "string" ? c.message : "";
          l && d && (n[l] = d);
        }
        Object.keys(n).length > 0 && (o = n);
      }
    }
    throw new Ze(r, t.status, a, o);
  }
}, V = "uri-reference";
function I(t) {
  return ue(t);
}
function G(t, e) {
  return {
    ...t,
    ...e
  };
}
function re(t) {
  const e = String(t ?? "").trim().toLowerCase();
  return e === "id" || e === "url" ? e : void 0;
}
function we(t) {
  return t === "uri" || t === V;
}
function ae(t) {
  if (!(!t || typeof t != "object" || Array.isArray(t)))
    return ue(t);
}
function oe(t) {
  if (!(!t || typeof t != "object" || Array.isArray(t)))
    return ue(t);
}
function ie(t) {
  if (!Array.isArray(t)) return;
  const e = t.map((r) => String(r ?? "").trim()).filter(Boolean);
  return e.length > 0 ? e : void 0;
}
function ne(t) {
  return Array.isArray(t) ? t.map((e) => String(e ?? "").trim()).filter(Boolean).join(",") || void 0 : String(t ?? "").trim() || void 0;
}
function et(t, e, r) {
  const a = re(r?.valueMode);
  return a || (e === "media-gallery" && t.items && typeof t.items == "object" && !Array.isArray(t.items) ? t.items.format === "uuid" ? "id" : "url" : t.format === "uuid" ? "id" : "url");
}
function $(t) {
  if (!t || t.length === 0) return [];
  const e = /* @__PURE__ */ new Set(), r = [];
  for (const a of t) {
    const o = String(a ?? "").trim();
    !o || e.has(o) || (e.add(o), r.push(o));
  }
  return r;
}
function $e(t, e) {
  const r = $(t), a = $(e);
  if (r.length !== a.length) return !1;
  const o = new Set(a);
  return r.every((i) => o.has(i));
}
function tt(t) {
  if (typeof t != "string") return {};
  const e = t.trim();
  if (!e) return {};
  const r = e.lastIndexOf("/");
  return r === -1 || r === e.length - 1 ? { type: e } : {
    type: e.slice(r + 1),
    prefix: e.slice(0, r + 1)
  };
}
function rt(t) {
  if (!Array.isArray(t) || t.length === 0) return null;
  const e = [];
  let r;
  for (const o of t) {
    if (!o || typeof o != "object") continue;
    const i = tt(o.$ref);
    i.type && (e.push(i.type), !r && i.prefix && (r = i.prefix));
  }
  if (e.length > 0) return {
    allowed: $(e),
    mode: "refs",
    refPrefix: r
  };
  const a = t.map((o) => {
    const i = o?.properties?._type;
    return typeof i?.const == "string" ? i.const : void 0;
  }).filter((o) => !!o);
  return a.length > 0 ? {
    allowed: $(a),
    mode: "inline"
  } : null;
}
function at(t) {
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
  return t && t.length > 0 && (e.oneOf = t.map((r) => ({
    type: "object",
    properties: { _type: { const: r } },
    required: ["_type"]
  })), e["x-discriminator"] = "_type"), e;
}
function ot(t, e) {
  const r = typeof e == "string" && e.trim() ? e : "#/$defs/";
  return { oneOf: t.map((a) => ({ $ref: `${r}${a}` })) };
}
function or(t, e) {
  if (!t) return I(e);
  const r = I(e), a = t.$defs ?? {}, o = r.$defs ?? {};
  (Object.keys(a).length > 0 || Object.keys(o).length > 0) && (r.$defs = G(a, o));
  const i = t.metadata, n = r.metadata;
  return (i || n) && (r.metadata = G(i ?? {}, n ?? {})), r;
}
function Me(t, e) {
  const r = {}, a = [];
  for (const i of t)
    r[i.name] = it(i), i.required && a.push(i.name);
  const o = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: r
  };
  return e && (o.$id = e), a.length > 0 && (o.required = a), o;
}
function ir(t, e) {
  const r = Me(t, e);
  if (!e) return r;
  r.properties = r.properties ?? {}, r.properties._type = {
    type: "string",
    const: e
  };
  const a = new Set(r.required ?? []);
  return a.add("_type"), r.required = Array.from(a), r;
}
function it(t) {
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
    date: {
      type: "string",
      format: "date"
    },
    time: {
      type: "string",
      format: "time"
    },
    datetime: {
      type: "string",
      format: "date-time"
    },
    daterange: { type: "object" },
    "media-picker": {
      type: "string",
      format: V
    },
    "media-gallery": { type: "array" },
    "file-upload": {
      type: "string",
      format: "uri"
    },
    reference: {
      type: "string",
      format: "uuid"
    },
    references: { type: "array" },
    user: {
      type: "string",
      format: "uuid"
    },
    group: { type: "object" },
    repeater: { type: "array" },
    blocks: { type: "array" },
    json: { type: "object" },
    slug: { type: "string" },
    color: { type: "string" },
    location: { type: "object" }
  }[t.type] ?? { type: "string" };
  e.type = r.type, r.format && (e.format = r.format), t.label && (e.title = t.label), t.description && (e.description = t.description), t.defaultValue !== void 0 && (e.default = t.defaultValue), t.validation && (t.validation.minLength !== void 0 && (e.minLength = t.validation.minLength), t.validation.maxLength !== void 0 && (e.maxLength = t.validation.maxLength), t.validation.min !== void 0 && (e.minimum = t.validation.min), t.validation.max !== void 0 && (e.maximum = t.validation.max), t.validation.pattern && (e.pattern = t.validation.pattern));
  const a = {}, o = nt(t.type);
  switch (o && (a.widget = o), t.placeholder && (a.placeholder = t.placeholder), t.helpText && (a.helpText = t.helpText), t.section && (a.section = t.section), t.order !== void 0 && (a.order = t.order), t.gridSpan !== void 0 && (a.grid = { span: t.gridSpan }), t.readonly && (a.readonly = !0), t.hidden && (a.hidden = !0), t.filterable && (a.filterable = !0), Object.keys(a).length > 0 && (e["x-formgen"] = a), t.filterable && (e["x-admin"] = { filterable: !0 }), t.type) {
    case "select":
    case "radio":
      t.config && "options" in t.config && t.config.options && (e.enum = t.config.options.map((i) => i.value));
      break;
    case "chips":
      e.items = { type: "string" }, t.config && "options" in t.config && t.config.options && (e.items.enum = t.config.options.map((i) => i.value));
      break;
    case "media-gallery": {
      const i = t.config, n = ae(i?.__sourceComponentOptions) ?? {}, c = oe(i?.__sourceAdminMedia) ?? {}, l = re(i?.valueMode ?? n.valueMode) ?? "url", d = {
        ...n,
        variant: "media-picker",
        multiple: !0,
        valueMode: l
      }, p = ne(i?.accept ?? n.accept);
      p ? d.accept = p : delete d.accept, typeof i?.maxSize == "number" && Number.isFinite(i.maxSize) && (d.maxSize = i.maxSize, c.maxSize = i.maxSize);
      const y = ie(i?.acceptedKinds ?? n.acceptedKinds);
      y ? (d.acceptedKinds = y, c.acceptedKinds = y) : delete d.acceptedKinds, e.items = {
        type: "string",
        format: l === "id" ? "uuid" : V
      }, a.componentOptions = d, e["x-formgen"] = a, c.valueMode = l, e["x-admin"] = G(e["x-admin"] ?? {}, { media: c });
      break;
    }
    case "references":
      e.items = {
        type: "string",
        format: "uri"
      };
      break;
    case "media-picker":
    case "file-upload": {
      const i = t.config, n = ae(i?.__sourceComponentOptions) ?? {}, c = oe(i?.__sourceAdminMedia) ?? {}, l = t.type === "file-upload" ? "url" : re(i?.valueMode ?? n.valueMode) ?? "url", d = {
        ...n,
        variant: t.type,
        valueMode: l
      }, p = ne(i?.accept ?? n.accept);
      p ? d.accept = p : delete d.accept, typeof i?.maxSize == "number" && Number.isFinite(i.maxSize) && (d.maxSize = i.maxSize, c.maxSize = i.maxSize);
      const y = ie(i?.acceptedKinds ?? n.acceptedKinds);
      y ? (d.acceptedKinds = y, c.acceptedKinds = y) : delete d.acceptedKinds, t.type === "file-upload" && (delete d.itemEndpoint, delete d.resolveEndpoint), e.format = l === "id" ? "uuid" : t.type === "file-upload" ? "uri" : V, a.componentOptions = d, e["x-formgen"] = a, c.valueMode = l, e["x-admin"] = G(e["x-admin"] ?? {}, { media: c });
      break;
    }
    case "repeater":
      t.config && "fields" in t.config && t.config.fields ? e.items = Me(t.config.fields) : e.items = { type: "string" };
      break;
    case "blocks": {
      const i = t.config, n = $(i?.allowedBlocks), c = $(i?.deniedBlocks), l = $(i?.__sourceAllowedBlocks), d = $(i?.__sourceDeniedBlocks), p = U(i?.__sourceWidget) || "block", y = U(i?.__sourceComponentName), f = dt(i?.__sourceComponentConfig), m = n.length > 0, k = c.length > 0, b = !$e(n, l), w = !$e(c, d), x = i?.__sourceItemsSchema, j = i?.__sourceRepresentation ?? "inline";
      x && !b ? e.items = I(x) : j === "refs" && m ? e.items = ot(n, i?.__sourceRefPrefix) : e.items = at(m ? n : void 0), i?.minBlocks !== void 0 && (e.minItems = i.minBlocks), i?.maxBlocks !== void 0 && (e.maxItems = i.maxBlocks);
      const _ = {
        ...a,
        widget: p,
        sortable: i?.__sourceSortable ?? !0
      }, N = y || (se(p) ? p : "");
      N && (_["component.name"] = N), se(p) && (m ? f.allowedBlocks = Array.from(n) : (i?.__sourceHadAllowedBlocks || Array.isArray(f.allowedBlocks)) && delete f.allowedBlocks, k ? f.deniedBlocks = Array.from(c) : (i?.__sourceHadDeniedBlocks || Array.isArray(f.deniedBlocks)) && delete f.deniedBlocks), Object.keys(f).length > 0 && (_["component.config"] = f), m && (i?.__sourceHadAllowedBlocks || j !== "refs" || b) && (_.allowedBlocks = n), (k || i?.__sourceHadDeniedBlocks && w) && (_.deniedBlocks = c), e["x-formgen"] = _;
      break;
    }
  }
  return e;
}
function nt(t) {
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
  }[t];
}
function nr(t) {
  if (!t.properties) return [];
  const e = new Set(t.required ?? []), r = [];
  for (const [a, o] of Object.entries(t.properties))
    a === "_type" || a === "_schema" || r.push(st(a, o, e.has(a)));
  return r.sort((a, o) => (a.order ?? 999) - (o.order ?? 999)), r;
}
function st(t, e, r) {
  const a = e["x-formgen"], o = e["x-admin"], i = o?.filterable ?? a?.filterable, n = {
    id: _e(),
    name: t,
    type: lt(e),
    label: e.title ?? ve(t),
    description: e.description,
    placeholder: a?.placeholder,
    helpText: a?.helpText,
    required: r,
    readonly: a?.readonly,
    hidden: a?.hidden,
    filterable: i === !0,
    defaultValue: e.default,
    section: a?.section,
    gridSpan: a?.grid?.span,
    order: a?.order
  }, c = {};
  if (e.minLength !== void 0 && (c.minLength = e.minLength), e.maxLength !== void 0 && (c.maxLength = e.maxLength), e.minimum !== void 0 && (c.min = e.minimum), e.maximum !== void 0 && (c.max = e.maximum), e.pattern && (c.pattern = e.pattern), Object.keys(c).length > 0 && (n.validation = c), e.enum && Array.isArray(e.enum) && (n.config = { options: e.enum.map((l) => ({
    value: String(l),
    label: ve(String(l))
  })) }), n.type === "media-picker" || n.type === "media-gallery" || n.type === "file-upload") {
    const l = {}, d = ae(a?.componentOptions), p = oe(o?.media), y = et(e, n.type, d), f = ne(d?.accept), m = ie(d?.acceptedKinds ?? p?.acceptedKinds);
    f && (l.accept = f), typeof d?.maxSize == "number" ? l.maxSize = d.maxSize : typeof p?.maxSize == "number" && (l.maxSize = p.maxSize), n.type === "media-gallery" && (l.multiple = !0), l.valueMode = y, m && (l.acceptedKinds = m), d && Object.keys(d).length > 0 && (l.__sourceComponentOptions = d), p && Object.keys(p).length > 0 && (l.__sourceAdminMedia = p), Object.keys(l).length > 0 && (n.config = l);
  }
  if (n.type === "blocks" && e.type === "array") {
    const l = {}, d = e.items ? I(e.items) : void 0, p = Le(a?.["component.config"]), y = $(Array.isArray(p?.allowedBlocks) ? p.allowedBlocks : void 0), f = $(Array.isArray(p?.deniedBlocks) ? p.deniedBlocks : void 0);
    d && (l.__sourceItemsSchema = d), typeof a?.widget == "string" && a.widget.trim() && (l.__sourceWidget = a.widget.trim()), typeof a?.["component.name"] == "string" && a["component.name"].trim() && (l.__sourceComponentName = a["component.name"].trim()), p && Object.keys(p).length > 0 && (l.__sourceComponentConfig = p), typeof a?.sortable == "boolean" && (l.__sourceSortable = a.sortable), l.__sourceHadAllowedBlocks = Array.isArray(a?.allowedBlocks) || y.length > 0, l.__sourceHadDeniedBlocks = Array.isArray(a?.deniedBlocks) || f.length > 0, e.minItems !== void 0 && (l.minBlocks = e.minItems), e.maxItems !== void 0 && (l.maxBlocks = e.maxItems);
    const m = d?.oneOf ? rt(d.oneOf) : null;
    m && (l.__sourceRepresentation = m.mode, m.refPrefix && (l.__sourceRefPrefix = m.refPrefix));
    let k;
    if (a?.allowedBlocks && Array.isArray(a.allowedBlocks)) {
      const b = $(a.allowedBlocks);
      k = m?.allowed.length ? m.allowed : b, b.length > 0 && (l.allowedBlocks = b);
    } else y.length > 0 ? (k = m?.allowed.length ? m.allowed : y, l.allowedBlocks = k) : m?.allowed.length && (k = m.allowed, l.allowedBlocks = m.allowed);
    if (l.__sourceRepresentation || (l.__sourceRepresentation = "inline"), k && k.length > 0 && (l.__sourceAllowedBlocks = k), a?.deniedBlocks && Array.isArray(a.deniedBlocks)) {
      const b = $(a.deniedBlocks);
      b.length > 0 && (l.deniedBlocks = b), l.__sourceDeniedBlocks = b;
    } else f.length > 0 && (l.deniedBlocks = f, l.__sourceDeniedBlocks = f);
    Object.keys(l).length > 0 && (n.config = l);
  }
  return n;
}
function lt(t) {
  const e = t["x-formgen"], r = Array.isArray(t.type) ? t.type[0] : t.type;
  switch (r) {
    case "array":
      if (t.items) {
        const a = t.items;
        if (a.oneOf) return "blocks";
        if (a.enum) return "chips";
        if (ct(e?.widget)) return "blocks";
        if (e?.widget === "chips") return "chips";
        if (e?.widget === "media-picker") return "media-gallery";
        if (a.format === "uuid" || we(a.format)) return "references";
      }
      return "repeater";
  }
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
      "block-library-picker": "blocks",
      "block-library": "blocks",
      "json-editor": "json",
      slug: "slug",
      color: "color"
    };
    if (a[e.widget]) return a[e.widget];
  }
  switch (r) {
    case "string":
      return t.format === "date-time" ? "datetime" : t.format === "date" ? "date" : t.format === "time" ? "time" : we(t.format) ? "media-picker" : t.format === "uuid" ? "reference" : t.enum ? "select" : "text";
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
function _e() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function U(t) {
  return typeof t == "string" ? t.trim() : "";
}
function se(t) {
  const e = U(t).toLowerCase();
  return e === "block-library-picker" || e === "block-library";
}
function ct(t) {
  const e = U(t).toLowerCase();
  return e === "block" || se(e);
}
function Le(t) {
  if (t && typeof t == "object" && !Array.isArray(t)) return I(t);
  if (typeof t == "string" && t.trim()) try {
    const e = JSON.parse(t);
    if (e && typeof e == "object" && !Array.isArray(e)) return I(e);
  } catch {
    return;
  }
}
function dt(t) {
  return Le(t) ?? {};
}
var pt = {
  text: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8"></path></svg>',
  textarea: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6"></path></svg>',
  "rich-text": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  markdown: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>',
  code: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
  number: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>',
  integer: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m-3-3v18"></path></svg>',
  currency: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  percentage: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 5L5 19M9 7a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>',
  select: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>',
  radio: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  checkbox: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  chips: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>',
  toggle: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="6" width="22" height="12" rx="6" stroke-width="2"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>',
  date: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  time: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  datetime: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13l-2 2-1-1"></path></svg>',
  "media-picker": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  "media-gallery": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',
  "file-upload": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>',
  reference: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>',
  references: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8h2m2 0h-2m0 0V6m0 2v2"></path></svg>',
  user: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
  group: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>',
  repeater: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>',
  blocks: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"></path></svg>',
  json: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
  slug: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 18h8"></path></svg>',
  color: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>',
  location: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
  "cat-text": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8"></path></svg>',
  "cat-number": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>',
  "cat-selection": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>',
  "cat-datetime": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  "cat-media": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  "cat-reference": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>',
  "cat-structural": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>',
  "cat-advanced": '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
};
function z(t) {
  return pt[t] ?? "";
}
function Ae(t) {
  const e = t.trim().toLowerCase();
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
function u(t) {
  return z(t);
}
var Y = [
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
    defaultConfig: { config: {
      multiline: !0,
      rows: 4
    } }
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
    defaultConfig: { config: {
      language: "json",
      lineNumbers: !0
    } }
  },
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
    defaultConfig: { config: {
      precision: 2,
      prefix: "$"
    } }
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "Percentage value (0-100)",
    icon: u("percentage"),
    category: "number",
    defaultConfig: {
      validation: {
        min: 0,
        max: 100
      },
      config: { suffix: "%" }
    }
  },
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
    defaultConfig: { config: {
      options: [],
      multiple: !0
    } }
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "Boolean switch",
    icon: u("toggle"),
    category: "selection"
  },
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
    defaultConfig: { config: {
      accept: "image/*",
      multiple: !0
    } }
  },
  {
    type: "file-upload",
    label: "File",
    description: "File attachment",
    icon: u("file-upload"),
    category: "media"
  },
  {
    type: "reference",
    label: "Reference",
    description: "Link to another content type",
    icon: u("reference"),
    category: "reference",
    defaultConfig: { config: {
      target: "",
      displayField: "name"
    } }
  },
  {
    type: "references",
    label: "References",
    description: "Multiple links to another content type",
    icon: u("references"),
    category: "reference",
    defaultConfig: { config: {
      target: "",
      displayField: "name",
      multiple: !0
    } }
  },
  {
    type: "user",
    label: "User",
    description: "User reference",
    icon: u("user"),
    category: "reference"
  },
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
    defaultConfig: { config: {
      fields: [],
      minItems: 0,
      maxItems: 10
    } }
  },
  {
    type: "blocks",
    label: "Blocks",
    description: "Modular content blocks",
    icon: u("blocks"),
    category: "structural",
    defaultConfig: { config: { allowedBlocks: [] } }
  },
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
], Te = [
  {
    id: "text",
    label: "Text",
    icon: u("cat-text")
  },
  {
    id: "number",
    label: "Numbers",
    icon: u("cat-number")
  },
  {
    id: "selection",
    label: "Selection",
    icon: u("cat-selection")
  },
  {
    id: "datetime",
    label: "Date & Time",
    icon: u("cat-datetime")
  },
  {
    id: "media",
    label: "Media",
    icon: u("cat-media")
  },
  {
    id: "reference",
    label: "References",
    icon: u("cat-reference")
  },
  {
    id: "structural",
    label: "Structural",
    icon: u("cat-structural")
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: u("cat-advanced")
  }
];
function Ee(t) {
  const e = Ae(String(t));
  return Y.find((r) => r.type === e);
}
function sr(t) {
  return Y.filter((e) => e.category === t);
}
var lr = class extends Q {
  constructor(t) {
    super({
      size: "3xl",
      maxHeight: "h-[80vh]",
      initialFocus: "[data-field-type-search]",
      ariaLabel: "Choose field type",
      backdropDataAttr: "data-field-type-picker-backdrop"
    }), this.selectedCategory = "text", this.searchQuery = "", this.config = t;
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
    return Te.map((t) => `
      <button
        type="button"
        data-field-category="${t.id}"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${t.id === this.selectedCategory ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}"
      >
        <span class="flex-shrink-0 w-6 flex items-center justify-center">${t.icon}</span>
        <span>${t.label}</span>
      </button>
    `).join("");
  }
  renderFieldTypes() {
    const t = new Set(this.config.excludeTypes ?? []);
    let e = Y.filter((r) => !t.has(r.type));
    if (this.searchQuery) {
      const r = this.searchQuery.toLowerCase();
      e = e.filter((a) => a.label.toLowerCase().includes(r) || a.description.toLowerCase().includes(r) || a.type.toLowerCase().includes(r));
    } else e = e.filter((r) => r.category === this.selectedCategory);
    return e.length === 0 ? `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm">No field types found</p>
        </div>
      ` : `
      <div class="grid grid-cols-2 gap-3">
        ${e.map((r) => this.renderFieldTypeCard(r)).join("")}
      </div>
    `;
  }
  renderFieldTypeCard(t) {
    return `
      <button
        type="button"
        data-field-type-select="${t.type}"
        class="flex items-start gap-3 p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
      >
        <span class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          ${t.icon}
        </span>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 dark:text-white">${t.label}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">${t.description}</div>
        </div>
      </button>
    `;
  }
  bindContentEvents() {
    if (!this.container) return;
    this.container.querySelector("[data-field-type-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelectorAll("[data-field-category]").forEach((e) => {
      e.addEventListener("click", () => {
        this.selectedCategory = e.getAttribute("data-field-category"), this.searchQuery = "";
        const r = this.container?.querySelector("[data-field-type-search]");
        r && (r.value = ""), this.updateView();
      });
    }), this.container.addEventListener("click", (e) => {
      const r = e.target.closest("[data-field-type-select]");
      if (r) {
        const a = r.getAttribute("data-field-type-select");
        this.config.onSelect(a), this.hide();
      }
    });
    const t = this.container.querySelector("[data-field-type-search]");
    t?.addEventListener("input", () => {
      this.searchQuery = t.value, this.updateView();
    });
  }
  updateView() {
    if (!this.container) return;
    const t = this.container.querySelector("[data-field-type-categories]");
    t && (t.innerHTML = this.renderCategories(), t.querySelectorAll("[data-field-category]").forEach((r) => {
      r.addEventListener("click", () => {
        this.selectedCategory = r.getAttribute("data-field-category"), this.searchQuery = "";
        const a = this.container?.querySelector("[data-field-type-search]");
        a && (a.value = ""), this.updateView();
      });
    }));
    const e = this.container.querySelector("[data-field-type-list]");
    e && (e.innerHTML = this.renderFieldTypes());
  }
}, ut = [
  {
    id: "smileys",
    label: "Smileys",
    emoji: "😀",
    entries: [
      {
        emoji: "😀",
        name: "grinning face",
        keywords: "happy smile"
      },
      {
        emoji: "😃",
        name: "smiley",
        keywords: "happy face"
      },
      {
        emoji: "😄",
        name: "smile",
        keywords: "happy joy"
      },
      {
        emoji: "😁",
        name: "grin",
        keywords: "happy teeth"
      },
      {
        emoji: "😅",
        name: "sweat smile",
        keywords: "nervous relief"
      },
      {
        emoji: "😂",
        name: "joy",
        keywords: "laugh tears funny"
      },
      {
        emoji: "🤣",
        name: "rofl",
        keywords: "laugh rolling"
      },
      {
        emoji: "😊",
        name: "blush",
        keywords: "happy shy"
      },
      {
        emoji: "😇",
        name: "innocent",
        keywords: "angel halo"
      },
      {
        emoji: "😍",
        name: "heart eyes",
        keywords: "love crush"
      },
      {
        emoji: "🤩",
        name: "star struck",
        keywords: "wow excited"
      },
      {
        emoji: "😘",
        name: "kissing heart",
        keywords: "love kiss"
      },
      {
        emoji: "🤔",
        name: "thinking",
        keywords: "consider wonder hmm"
      },
      {
        emoji: "🤗",
        name: "hugging",
        keywords: "hug embrace warm"
      },
      {
        emoji: "😎",
        name: "sunglasses",
        keywords: "cool confident"
      },
      {
        emoji: "🥳",
        name: "partying",
        keywords: "celebrate birthday party"
      },
      {
        emoji: "😤",
        name: "triumph",
        keywords: "frustrated angry huff"
      },
      {
        emoji: "😢",
        name: "cry",
        keywords: "sad tear"
      },
      {
        emoji: "😱",
        name: "scream",
        keywords: "fear shock horror"
      },
      {
        emoji: "🤯",
        name: "exploding head",
        keywords: "mind blown shock"
      },
      {
        emoji: "😴",
        name: "sleeping",
        keywords: "zzz tired rest"
      },
      {
        emoji: "🤮",
        name: "vomiting",
        keywords: "sick disgusting"
      },
      {
        emoji: "🥺",
        name: "pleading",
        keywords: "puppy eyes beg"
      },
      {
        emoji: "😈",
        name: "smiling imp",
        keywords: "devil evil mischief"
      },
      {
        emoji: "💀",
        name: "skull",
        keywords: "dead death skeleton"
      }
    ]
  },
  {
    id: "people",
    label: "People",
    emoji: "👋",
    entries: [
      {
        emoji: "👋",
        name: "wave",
        keywords: "hello hi greeting"
      },
      {
        emoji: "👍",
        name: "thumbs up",
        keywords: "approve like yes good"
      },
      {
        emoji: "👎",
        name: "thumbs down",
        keywords: "reject dislike no bad"
      },
      {
        emoji: "👏",
        name: "clap",
        keywords: "applause congrats"
      },
      {
        emoji: "🙌",
        name: "raised hands",
        keywords: "celebrate hooray"
      },
      {
        emoji: "🤝",
        name: "handshake",
        keywords: "deal agreement"
      },
      {
        emoji: "✋",
        name: "raised hand",
        keywords: "stop high five"
      },
      {
        emoji: "✌️",
        name: "peace",
        keywords: "victory two"
      },
      {
        emoji: "🤞",
        name: "crossed fingers",
        keywords: "luck hope wish"
      },
      {
        emoji: "💪",
        name: "flexed biceps",
        keywords: "strong power muscle"
      },
      {
        emoji: "👀",
        name: "eyes",
        keywords: "look see watch"
      },
      {
        emoji: "👁️",
        name: "eye",
        keywords: "look see vision"
      },
      {
        emoji: "🧠",
        name: "brain",
        keywords: "think smart intelligence"
      },
      {
        emoji: "❤️",
        name: "red heart",
        keywords: "love like"
      },
      {
        emoji: "🔥",
        name: "fire",
        keywords: "hot flame lit popular"
      },
      {
        emoji: "✨",
        name: "sparkles",
        keywords: "stars magic new shiny"
      },
      {
        emoji: "💫",
        name: "dizzy",
        keywords: "star shooting"
      },
      {
        emoji: "💥",
        name: "collision",
        keywords: "boom bang explosion"
      },
      {
        emoji: "💬",
        name: "speech bubble",
        keywords: "comment chat message"
      },
      {
        emoji: "💡",
        name: "light bulb",
        keywords: "idea thought bright"
      }
    ]
  },
  {
    id: "animals-nature",
    label: "Nature",
    emoji: "🌿",
    entries: [
      {
        emoji: "🐶",
        name: "dog face",
        keywords: "pet puppy"
      },
      {
        emoji: "🐱",
        name: "cat face",
        keywords: "pet kitten"
      },
      {
        emoji: "🐻",
        name: "bear",
        keywords: "animal"
      },
      {
        emoji: "🦊",
        name: "fox",
        keywords: "clever sly"
      },
      {
        emoji: "🦁",
        name: "lion",
        keywords: "king brave"
      },
      {
        emoji: "🐸",
        name: "frog",
        keywords: "toad"
      },
      {
        emoji: "🦋",
        name: "butterfly",
        keywords: "insect beauty"
      },
      {
        emoji: "🐝",
        name: "honeybee",
        keywords: "buzz insect"
      },
      {
        emoji: "🌸",
        name: "cherry blossom",
        keywords: "flower spring pink"
      },
      {
        emoji: "🌺",
        name: "hibiscus",
        keywords: "flower tropical"
      },
      {
        emoji: "🌻",
        name: "sunflower",
        keywords: "flower sun yellow"
      },
      {
        emoji: "🌹",
        name: "rose",
        keywords: "flower love red"
      },
      {
        emoji: "🌲",
        name: "evergreen tree",
        keywords: "pine forest"
      },
      {
        emoji: "🌿",
        name: "herb",
        keywords: "plant leaf green"
      },
      {
        emoji: "🍀",
        name: "four leaf clover",
        keywords: "luck lucky irish"
      },
      {
        emoji: "🌊",
        name: "wave",
        keywords: "ocean sea water surf"
      },
      {
        emoji: "⛰️",
        name: "mountain",
        keywords: "peak hill"
      },
      {
        emoji: "🌈",
        name: "rainbow",
        keywords: "colors pride"
      },
      {
        emoji: "☀️",
        name: "sun",
        keywords: "sunny bright warm weather"
      },
      {
        emoji: "🌙",
        name: "crescent moon",
        keywords: "night sleep"
      }
    ]
  },
  {
    id: "food",
    label: "Food",
    emoji: "🍕",
    entries: [
      {
        emoji: "🍕",
        name: "pizza",
        keywords: "food slice"
      },
      {
        emoji: "🍔",
        name: "hamburger",
        keywords: "burger food"
      },
      {
        emoji: "☕",
        name: "coffee",
        keywords: "drink hot tea cup"
      },
      {
        emoji: "🍺",
        name: "beer",
        keywords: "drink alcohol mug"
      },
      {
        emoji: "🍷",
        name: "wine",
        keywords: "drink glass red"
      },
      {
        emoji: "🎂",
        name: "birthday cake",
        keywords: "dessert party celebrate"
      },
      {
        emoji: "🍰",
        name: "shortcake",
        keywords: "dessert sweet"
      },
      {
        emoji: "🍩",
        name: "doughnut",
        keywords: "donut dessert sweet"
      },
      {
        emoji: "🍎",
        name: "red apple",
        keywords: "fruit health"
      },
      {
        emoji: "🍋",
        name: "lemon",
        keywords: "fruit citrus sour"
      },
      {
        emoji: "🍉",
        name: "watermelon",
        keywords: "fruit summer"
      },
      {
        emoji: "🌶️",
        name: "hot pepper",
        keywords: "spicy chili"
      },
      {
        emoji: "🥑",
        name: "avocado",
        keywords: "fruit green"
      },
      {
        emoji: "🍿",
        name: "popcorn",
        keywords: "movie snack"
      },
      {
        emoji: "🧁",
        name: "cupcake",
        keywords: "dessert sweet muffin"
      }
    ]
  },
  {
    id: "travel",
    label: "Travel",
    emoji: "✈️",
    entries: [
      {
        emoji: "✈️",
        name: "airplane",
        keywords: "travel flight fly"
      },
      {
        emoji: "🚀",
        name: "rocket",
        keywords: "launch space ship fast"
      },
      {
        emoji: "🚗",
        name: "car",
        keywords: "auto vehicle drive"
      },
      {
        emoji: "🚲",
        name: "bicycle",
        keywords: "bike cycle pedal"
      },
      {
        emoji: "🏠",
        name: "house",
        keywords: "home building"
      },
      {
        emoji: "🏢",
        name: "office building",
        keywords: "work corporate"
      },
      {
        emoji: "🏭",
        name: "factory",
        keywords: "industry manufacturing"
      },
      {
        emoji: "🏥",
        name: "hospital",
        keywords: "health medical doctor"
      },
      {
        emoji: "🏫",
        name: "school",
        keywords: "education learn"
      },
      {
        emoji: "🏰",
        name: "castle",
        keywords: "medieval fortress"
      },
      {
        emoji: "⛪",
        name: "church",
        keywords: "religion worship"
      },
      {
        emoji: "🗽",
        name: "statue of liberty",
        keywords: "new york freedom"
      },
      {
        emoji: "🌍",
        name: "globe europe africa",
        keywords: "earth world map"
      },
      {
        emoji: "🌏",
        name: "globe asia",
        keywords: "earth world map"
      },
      {
        emoji: "🗺️",
        name: "world map",
        keywords: "earth globe travel"
      }
    ]
  },
  {
    id: "activities",
    label: "Activities",
    emoji: "⚽",
    entries: [
      {
        emoji: "⚽",
        name: "soccer",
        keywords: "football sport ball"
      },
      {
        emoji: "🏀",
        name: "basketball",
        keywords: "sport ball hoop"
      },
      {
        emoji: "🎮",
        name: "video game",
        keywords: "gaming controller play"
      },
      {
        emoji: "🎯",
        name: "direct hit",
        keywords: "target bullseye goal"
      },
      {
        emoji: "🎲",
        name: "game die",
        keywords: "dice random chance"
      },
      {
        emoji: "🧩",
        name: "puzzle",
        keywords: "piece jigsaw game"
      },
      {
        emoji: "🎨",
        name: "artist palette",
        keywords: "art paint draw color"
      },
      {
        emoji: "🎵",
        name: "musical note",
        keywords: "music song sound"
      },
      {
        emoji: "🎸",
        name: "guitar",
        keywords: "music instrument rock"
      },
      {
        emoji: "🎬",
        name: "clapper board",
        keywords: "movie film cinema"
      },
      {
        emoji: "📸",
        name: "camera flash",
        keywords: "photo picture"
      },
      {
        emoji: "🏆",
        name: "trophy",
        keywords: "win prize award champion"
      },
      {
        emoji: "🥇",
        name: "gold medal",
        keywords: "first winner"
      },
      {
        emoji: "🎪",
        name: "circus tent",
        keywords: "carnival fun"
      },
      {
        emoji: "🎭",
        name: "performing arts",
        keywords: "theater drama masks"
      }
    ]
  },
  {
    id: "objects",
    label: "Objects",
    emoji: "📦",
    entries: [
      {
        emoji: "📰",
        name: "newspaper",
        keywords: "news article press media"
      },
      {
        emoji: "📄",
        name: "page",
        keywords: "document file paper"
      },
      {
        emoji: "📋",
        name: "clipboard",
        keywords: "list copy paste"
      },
      {
        emoji: "📌",
        name: "pushpin",
        keywords: "pin location mark"
      },
      {
        emoji: "📎",
        name: "paperclip",
        keywords: "attach clip"
      },
      {
        emoji: "🔗",
        name: "link",
        keywords: "chain url href"
      },
      {
        emoji: "📦",
        name: "package",
        keywords: "box shipping delivery"
      },
      {
        emoji: "🗂️",
        name: "card index",
        keywords: "folder organize dividers"
      },
      {
        emoji: "📁",
        name: "file folder",
        keywords: "directory"
      },
      {
        emoji: "📂",
        name: "open folder",
        keywords: "directory files"
      },
      {
        emoji: "📝",
        name: "memo",
        keywords: "note write edit pencil"
      },
      {
        emoji: "✏️",
        name: "pencil",
        keywords: "write edit draw"
      },
      {
        emoji: "🖊️",
        name: "pen",
        keywords: "write sign"
      },
      {
        emoji: "📐",
        name: "triangular ruler",
        keywords: "measure geometry"
      },
      {
        emoji: "📏",
        name: "straight ruler",
        keywords: "measure length"
      },
      {
        emoji: "🔍",
        name: "magnifying glass",
        keywords: "search find zoom"
      },
      {
        emoji: "🔒",
        name: "locked",
        keywords: "secure private padlock"
      },
      {
        emoji: "🔓",
        name: "unlocked",
        keywords: "open access"
      },
      {
        emoji: "🔑",
        name: "key",
        keywords: "unlock password access"
      },
      {
        emoji: "🔧",
        name: "wrench",
        keywords: "tool fix settings"
      },
      {
        emoji: "🔨",
        name: "hammer",
        keywords: "tool build construct"
      },
      {
        emoji: "⚙️",
        name: "gear",
        keywords: "settings config cog"
      },
      {
        emoji: "🧲",
        name: "magnet",
        keywords: "attract pull"
      },
      {
        emoji: "💾",
        name: "floppy disk",
        keywords: "save storage"
      },
      {
        emoji: "💻",
        name: "laptop",
        keywords: "computer device"
      },
      {
        emoji: "🖥️",
        name: "desktop computer",
        keywords: "monitor screen"
      },
      {
        emoji: "📱",
        name: "mobile phone",
        keywords: "cell smartphone device"
      },
      {
        emoji: "🖨️",
        name: "printer",
        keywords: "print output"
      },
      {
        emoji: "📷",
        name: "camera",
        keywords: "photo picture"
      },
      {
        emoji: "🎙️",
        name: "microphone",
        keywords: "audio record podcast"
      },
      {
        emoji: "📡",
        name: "satellite antenna",
        keywords: "signal broadcast"
      },
      {
        emoji: "🔔",
        name: "bell",
        keywords: "notification alert ring"
      },
      {
        emoji: "📊",
        name: "bar chart",
        keywords: "graph statistics data"
      },
      {
        emoji: "📈",
        name: "chart increasing",
        keywords: "graph growth up trend"
      },
      {
        emoji: "📉",
        name: "chart decreasing",
        keywords: "graph down decline"
      },
      {
        emoji: "🗓️",
        name: "calendar",
        keywords: "date schedule event"
      },
      {
        emoji: "⏰",
        name: "alarm clock",
        keywords: "time timer"
      },
      {
        emoji: "⏱️",
        name: "stopwatch",
        keywords: "time timer speed"
      },
      {
        emoji: "🧪",
        name: "test tube",
        keywords: "science lab experiment"
      },
      {
        emoji: "💊",
        name: "pill",
        keywords: "medicine health drug"
      },
      {
        emoji: "🛒",
        name: "shopping cart",
        keywords: "buy store ecommerce"
      },
      {
        emoji: "💰",
        name: "money bag",
        keywords: "cash dollar rich finance"
      },
      {
        emoji: "💳",
        name: "credit card",
        keywords: "payment buy charge"
      },
      {
        emoji: "📮",
        name: "postbox",
        keywords: "mail letter send"
      },
      {
        emoji: "📬",
        name: "open mailbox",
        keywords: "email inbox receive"
      },
      {
        emoji: "🏷️",
        name: "label",
        keywords: "tag price category"
      },
      {
        emoji: "🧾",
        name: "receipt",
        keywords: "invoice bill purchase"
      },
      {
        emoji: "📚",
        name: "books",
        keywords: "library read study"
      },
      {
        emoji: "🎁",
        name: "wrapped gift",
        keywords: "present box surprise"
      },
      {
        emoji: "🪄",
        name: "magic wand",
        keywords: "wizard spell sparkle"
      }
    ]
  },
  {
    id: "symbols",
    label: "Symbols",
    emoji: "⚡",
    entries: [
      {
        emoji: "⚡",
        name: "zap",
        keywords: "lightning bolt electric power"
      },
      {
        emoji: "✅",
        name: "check mark",
        keywords: "done complete yes success"
      },
      {
        emoji: "❌",
        name: "cross mark",
        keywords: "no wrong delete remove"
      },
      {
        emoji: "⭐",
        name: "star",
        keywords: "favorite bookmark rating"
      },
      {
        emoji: "🌟",
        name: "glowing star",
        keywords: "sparkle shine bright"
      },
      {
        emoji: "💠",
        name: "diamond",
        keywords: "shape gem crystal"
      },
      {
        emoji: "🔶",
        name: "large orange diamond",
        keywords: "shape"
      },
      {
        emoji: "🔷",
        name: "large blue diamond",
        keywords: "shape"
      },
      {
        emoji: "🔴",
        name: "red circle",
        keywords: "dot round"
      },
      {
        emoji: "🟢",
        name: "green circle",
        keywords: "dot round"
      },
      {
        emoji: "🔵",
        name: "blue circle",
        keywords: "dot round"
      },
      {
        emoji: "🟡",
        name: "yellow circle",
        keywords: "dot round"
      },
      {
        emoji: "🟣",
        name: "purple circle",
        keywords: "dot round"
      },
      {
        emoji: "⬛",
        name: "black square",
        keywords: "shape"
      },
      {
        emoji: "⬜",
        name: "white square",
        keywords: "shape"
      },
      {
        emoji: "▶️",
        name: "play button",
        keywords: "start forward"
      },
      {
        emoji: "⏸️",
        name: "pause button",
        keywords: "stop wait"
      },
      {
        emoji: "⏹️",
        name: "stop button",
        keywords: "halt end"
      },
      {
        emoji: "♻️",
        name: "recycling symbol",
        keywords: "eco green recycle"
      },
      {
        emoji: "⚠️",
        name: "warning",
        keywords: "caution alert danger"
      },
      {
        emoji: "🚫",
        name: "prohibited",
        keywords: "no ban forbidden stop"
      },
      {
        emoji: "ℹ️",
        name: "information",
        keywords: "info help about"
      },
      {
        emoji: "❓",
        name: "question mark",
        keywords: "help what why"
      },
      {
        emoji: "❗",
        name: "exclamation mark",
        keywords: "alert important bang"
      },
      {
        emoji: "➕",
        name: "plus",
        keywords: "add new create"
      },
      {
        emoji: "➖",
        name: "minus",
        keywords: "remove subtract delete"
      },
      {
        emoji: "➡️",
        name: "right arrow",
        keywords: "forward next direction"
      },
      {
        emoji: "⬅️",
        name: "left arrow",
        keywords: "back previous direction"
      },
      {
        emoji: "⬆️",
        name: "up arrow",
        keywords: "top direction"
      },
      {
        emoji: "⬇️",
        name: "down arrow",
        keywords: "bottom direction"
      },
      {
        emoji: "↩️",
        name: "right arrow curving left",
        keywords: "return reply back undo"
      },
      {
        emoji: "🔀",
        name: "shuffle",
        keywords: "random mix"
      },
      {
        emoji: "🔁",
        name: "repeat",
        keywords: "loop cycle"
      },
      {
        emoji: "♾️",
        name: "infinity",
        keywords: "forever unlimited"
      },
      {
        emoji: "🏁",
        name: "checkered flag",
        keywords: "finish race end"
      },
      {
        emoji: "🚩",
        name: "triangular flag",
        keywords: "report mark milestone"
      },
      {
        emoji: "🔰",
        name: "Japanese symbol for beginner",
        keywords: "new start"
      },
      {
        emoji: "💲",
        name: "heavy dollar sign",
        keywords: "money currency price"
      },
      {
        emoji: "#️⃣",
        name: "hash",
        keywords: "number pound tag"
      },
      {
        emoji: "🔣",
        name: "input symbols",
        keywords: "character special"
      }
    ]
  }
], gt = [
  {
    value: "page",
    label: "Page",
    keywords: "document paper",
    category: "Content"
  },
  {
    value: "page-edit",
    label: "Page Edit",
    keywords: "document write",
    category: "Content"
  },
  {
    value: "journal",
    label: "Journal",
    keywords: "book notebook blog",
    category: "Content"
  },
  {
    value: "book",
    label: "Book",
    keywords: "read documentation",
    category: "Content"
  },
  {
    value: "clipboard",
    label: "Clipboard",
    keywords: "copy paste list",
    category: "Content"
  },
  {
    value: "edit-pencil",
    label: "Edit",
    keywords: "write pencil compose",
    category: "Content"
  },
  {
    value: "post",
    label: "Post",
    keywords: "article blog entry",
    category: "Content"
  },
  {
    value: "cube",
    label: "Cube",
    keywords: "box 3d model block",
    category: "Objects"
  },
  {
    value: "view-grid",
    label: "Grid",
    keywords: "layout blocks tiles",
    category: "Objects"
  },
  {
    value: "dashboard",
    label: "Dashboard",
    keywords: "home overview panel",
    category: "Objects"
  },
  {
    value: "folder",
    label: "Folder",
    keywords: "directory files",
    category: "Objects"
  },
  {
    value: "archive",
    label: "Archive",
    keywords: "box storage",
    category: "Objects"
  },
  {
    value: "table-rows",
    label: "Table",
    keywords: "list rows data",
    category: "Objects"
  },
  {
    value: "puzzle",
    label: "Puzzle",
    keywords: "piece component module",
    category: "Objects"
  },
  {
    value: "user",
    label: "User",
    keywords: "person account profile",
    category: "People"
  },
  {
    value: "users",
    label: "Users",
    keywords: "people group team",
    category: "People"
  },
  {
    value: "user-circle",
    label: "User Circle",
    keywords: "profile avatar",
    category: "People"
  },
  {
    value: "shield",
    label: "Shield",
    keywords: "security auth role",
    category: "People"
  },
  {
    value: "community",
    label: "Community",
    keywords: "group organization",
    category: "People"
  },
  {
    value: "lock",
    label: "Lock",
    keywords: "secure private",
    category: "People"
  },
  {
    value: "building",
    label: "Building",
    keywords: "office company tenant",
    category: "Business"
  },
  {
    value: "briefcase",
    label: "Briefcase",
    keywords: "work business",
    category: "Business"
  },
  {
    value: "cart",
    label: "Cart",
    keywords: "shop ecommerce buy",
    category: "Business"
  },
  {
    value: "credit-card",
    label: "Credit Card",
    keywords: "payment money",
    category: "Business"
  },
  {
    value: "gift",
    label: "Gift",
    keywords: "present reward",
    category: "Business"
  },
  {
    value: "shop",
    label: "Shop",
    keywords: "store ecommerce",
    category: "Business"
  },
  {
    value: "media-image",
    label: "Image",
    keywords: "photo picture",
    category: "Media"
  },
  {
    value: "camera",
    label: "Camera",
    keywords: "photo picture",
    category: "Media"
  },
  {
    value: "play",
    label: "Play",
    keywords: "video media",
    category: "Media"
  },
  {
    value: "music-note",
    label: "Music",
    keywords: "audio song",
    category: "Media"
  },
  {
    value: "attachment",
    label: "Attachment",
    keywords: "file clip",
    category: "Media"
  },
  {
    value: "bell",
    label: "Bell",
    keywords: "notification alert",
    category: "Communication"
  },
  {
    value: "chat-bubble",
    label: "Chat",
    keywords: "message comment",
    category: "Communication"
  },
  {
    value: "mail",
    label: "Mail",
    keywords: "email message",
    category: "Communication"
  },
  {
    value: "megaphone",
    label: "Megaphone",
    keywords: "announce broadcast",
    category: "Communication"
  },
  {
    value: "send",
    label: "Send",
    keywords: "share submit",
    category: "Communication"
  },
  {
    value: "settings",
    label: "Settings",
    keywords: "config gear cog",
    category: "System"
  },
  {
    value: "switch-on",
    label: "Toggle",
    keywords: "switch feature flag",
    category: "System"
  },
  {
    value: "bug",
    label: "Bug",
    keywords: "debug error issue",
    category: "System"
  },
  {
    value: "clock",
    label: "Clock",
    keywords: "time schedule activity",
    category: "System"
  },
  {
    value: "database",
    label: "Database",
    keywords: "storage data",
    category: "System"
  },
  {
    value: "code",
    label: "Code",
    keywords: "developer programming",
    category: "System"
  },
  {
    value: "terminal",
    label: "Terminal",
    keywords: "console command line",
    category: "System"
  },
  {
    value: "star",
    label: "Star",
    keywords: "favorite bookmark rating",
    category: "Misc"
  },
  {
    value: "heart",
    label: "Heart",
    keywords: "love favorite",
    category: "Misc"
  },
  {
    value: "bookmark",
    label: "Bookmark",
    keywords: "save favorite",
    category: "Misc"
  },
  {
    value: "pin-alt",
    label: "Pin",
    keywords: "location map",
    category: "Misc"
  },
  {
    value: "link",
    label: "Link",
    keywords: "url chain href",
    category: "Misc"
  },
  {
    value: "search",
    label: "Search",
    keywords: "find magnifier",
    category: "Misc"
  },
  {
    value: "download",
    label: "Download",
    keywords: "save get export",
    category: "Misc"
  },
  {
    value: "cloud",
    label: "Cloud",
    keywords: "upload sync",
    category: "Misc"
  },
  {
    value: "flash",
    label: "Flash",
    keywords: "lightning bolt fast",
    category: "Misc"
  },
  {
    value: "calendar",
    label: "Calendar",
    keywords: "date event schedule",
    category: "Misc"
  },
  {
    value: "graph-up",
    label: "Analytics",
    keywords: "chart statistics",
    category: "Misc"
  },
  {
    value: "color-picker",
    label: "Theme",
    keywords: "color palette style",
    category: "Misc"
  },
  {
    value: "globe",
    label: "Globe",
    keywords: "world international web",
    category: "Misc"
  },
  {
    value: "rocket",
    label: "Rocket",
    keywords: "launch deploy fast",
    category: "Misc"
  },
  {
    value: "flag",
    label: "Flag",
    keywords: "mark milestone report",
    category: "Misc"
  },
  {
    value: "trash",
    label: "Trash",
    keywords: "delete remove",
    category: "Misc"
  }
];
function mt() {
  const t = [], e = [];
  for (const r of [
    "Content",
    "Objects",
    "People",
    "Business",
    "Media",
    "Communication",
    "System",
    "Misc"
  ]) {
    const a = gt.filter((o) => o.category === r);
    if (a.length !== 0) {
      e.push({
        id: r.toLowerCase(),
        label: r,
        startIndex: t.length
      });
      for (const o of a) t.push({
        value: o.value,
        label: o.label,
        keywords: o.keywords,
        display: Be(`iconoir:${o.value}`, { size: "18px" })
      });
    }
  }
  return {
    id: "iconoir",
    label: "Sidebar",
    icon: "🧭",
    entries: t,
    categories: e
  };
}
var yt = [
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
function ht() {
  const t = [], e = [];
  for (const r of ut) {
    e.push({
      id: r.id,
      label: r.label,
      startIndex: t.length
    });
    for (const a of r.entries) t.push({
      value: a.emoji,
      label: a.name,
      keywords: a.keywords,
      display: a.emoji
    });
  }
  return {
    id: "emoji",
    label: "Emoji",
    icon: "😀",
    entries: t,
    categories: e
  };
}
function ft() {
  const t = [];
  for (const e of yt) {
    const r = z(e);
    r && t.push({
      value: e,
      label: e.replace(/-/g, " "),
      keywords: e.replace(/-/g, " "),
      display: r
    });
  }
  return {
    id: "icons",
    label: "Icons",
    icon: "◇",
    entries: t
  };
}
var bt = /^[a-z0-9]+(?:[:_-][a-z0-9]+)*$/i, C = [], je = !1;
function q() {
  je || (je = !0, C.push(mt()), C.push(ht()), C.push(ft()));
}
function cr(t) {
  q();
  const e = C.findIndex((r) => r.id === t.id);
  e >= 0 ? C[e] = t : C.push(t);
}
function dr(t) {
  q();
  const e = C.findIndex((r) => r.id === t);
  e >= 0 && C.splice(e, 1);
}
function Pe() {
  return q(), C;
}
function ge(t) {
  if (!t) return "";
  const e = z(t);
  if (e) return e;
  q();
  for (const a of C) {
    const o = a.entries.find((i) => i.value === t);
    if (o) return o.display;
  }
  const r = t.trim();
  return bt.test(r) ? Be(r) : `<span class="inline-flex max-w-full items-center truncate rounded px-1 text-[9px] font-mono leading-none text-gray-500 dark:text-gray-400" title="${s(t)}">${s(t)}</span>`;
}
function Ie(t) {
  if (!t) return "";
  q();
  for (const e of C) {
    const r = e.entries.find((a) => a.value === t);
    if (r) return r.label;
  }
  return t;
}
function pr(t, e, r) {
  const a = ge(t), o = Ie(t), i = t.length > 0, n = r ? "h-[30px]" : "h-[38px]", c = r ? "text-[12px]" : "text-sm", l = r ? "w-5 h-5 text-[14px]" : "w-6 h-6 text-base", d = r ? "w-5 h-5" : "w-6 h-6";
  return `
    <div data-icon-trigger
         class="flex items-center gap-1.5 ${n} px-2 border rounded-lg bg-white text-gray-900
                dark:border-gray-600 dark:bg-slate-800 dark:text-white
                hover:border-gray-400 dark:hover:border-gray-500
                cursor-pointer transition-colors select-none">
      <span data-icon-preview
            class="flex-shrink-0 ${l} flex items-center justify-center overflow-hidden rounded
                   ${i ? "" : "text-gray-300 dark:text-gray-600"}">
        ${i ? a : "?"}
      </span>
      <span data-icon-label
            class="flex-1 min-w-0 truncate ${c} ${i ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}">
        ${i ? s(o) : "Choose icon…"}
      </span>
      <button type="button" data-icon-clear
              class="flex-shrink-0 ${d} flex items-center justify-center rounded
                     text-gray-300 dark:text-gray-600
                     hover:text-gray-500 dark:hover:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                     ${i ? "" : "hidden"}"
              title="Clear icon" aria-hidden="${i ? "false" : "true"}">
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
      <input type="hidden" ${e} value="${s(t)}" />
    </div>`;
}
var v = null, M = null, L = null, J = "iconoir", A = "", E = null, F = null;
function kt(t, e) {
  P(), M = e, L = t, A = "", J = Pe()[0]?.id ?? "emoji", v = document.createElement("div"), v.setAttribute("data-icon-picker-popover", ""), v.className = "fixed", v.style.zIndex = String(xt(t) + 5), v.innerHTML = le(), document.body.appendChild(v), vt(t), ce(), v.querySelector("[data-icon-search]")?.focus(), E = (r) => {
    const a = r.target;
    !a.closest("[data-icon-picker-popover]") && !a.closest("[data-icon-trigger]") && P();
  }, setTimeout(() => {
    E && document.addEventListener("mousedown", E);
  }, 0), F = (r) => {
    r.key === "Escape" && P();
  }, document.addEventListener("keydown", F);
}
function P() {
  v && (v.remove(), v = null), E && (document.removeEventListener("mousedown", E), E = null), F && (document.removeEventListener("keydown", F), F = null), M = null, L = null;
}
function vt(t) {
  if (!v) return;
  const e = t.getBoundingClientRect(), r = 320, a = 380;
  let o = e.bottom + 4, i = e.left;
  o + a > window.innerHeight - 8 && (o = e.top - a - 4), i + r > window.innerWidth - 8 && (i = window.innerWidth - r - 8), i < 8 && (i = 8), v.style.top = `${o}px`, v.style.left = `${i}px`, v.style.width = `${r}px`;
}
function le() {
  const t = Pe(), e = t.find((i) => i.id === J) ?? t[0];
  let r = [];
  if (A) {
    const i = A.toLowerCase();
    for (const n of t) for (const c of n.entries) (c.label.toLowerCase().includes(i) || c.value.toLowerCase().includes(i) || (c.keywords ?? "").toLowerCase().includes(i)) && r.push({
      entry: c,
      tabId: n.id
    });
  } else e && (r = e.entries.map((i) => ({
    entry: i,
    tabId: e.id
  })));
  const a = t.map((i) => {
    const n = i.id === J;
    return `
      <button type="button" data-icon-tab="${s(i.id)}"
              class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap
                     ${n ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"}">
        ${i.icon ? `<span class="mr-0.5">${i.icon}</span>` : ""}${s(i.label)}
      </button>`;
  }).join("");
  let o;
  if (r.length === 0) o = '<div class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">No matching icons</div>';
  else if (A) o = te(r.map((i) => i.entry));
  else if (e?.categories && e.categories.length > 0) {
    o = "";
    for (let i = 0; i < e.categories.length; i++) {
      const n = e.categories[i], c = e.categories[i + 1]?.startIndex ?? e.entries.length, l = e.entries.slice(n.startIndex, c);
      l.length !== 0 && (o += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 pt-2 pb-1">${s(n.label)}</div>`, o += te(l));
    }
  } else o = te(r.map((i) => i.entry));
  return `
    <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl
                flex flex-col overflow-hidden" style="max-height: 380px;">
      <div class="px-3 pt-3 pb-2 space-y-2 flex-shrink-0">
        <div class="relative">
          <input type="text" data-icon-search
                 placeholder="Search icons…"
                 value="${s(A)}"
                 class="${h("xs")}" />
        </div>
        <div class="flex items-center gap-1 overflow-x-auto" data-icon-tab-bar>
          ${a}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-3 pb-2" data-icon-grid-area>
        ${o}
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
function te(t) {
  let e = '<div class="grid grid-cols-8 gap-0.5">';
  for (const r of t) {
    const a = !r.display.startsWith("<");
    e += `
      <button type="button" data-icon-pick="${s(r.value)}"
              title="${s(r.label)}"
              class="w-8 h-8 flex items-center justify-center rounded-md
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-colors cursor-pointer
                     ${a ? "text-lg" : "text-gray-600 dark:text-gray-300"}">
        ${a ? r.display : `<span class="w-5 h-5 flex items-center justify-center">${r.display}</span>`}
      </button>`;
  }
  return e += "</div>", e;
}
function ce() {
  if (!v) return;
  const t = v.querySelector("[data-icon-search]");
  t?.addEventListener("input", () => {
    A = t.value, Se();
  }), v.addEventListener("click", (e) => {
    const r = e.target, a = r.closest("[data-icon-tab]");
    if (a) {
      J = a.dataset.iconTab, A = "", Se();
      return;
    }
    const o = r.closest("[data-icon-pick]");
    if (o && M) {
      const i = o.dataset.iconPick;
      M.onSelect(i), L && de(L, i), P();
      return;
    }
    r.closest("[data-icon-clear-btn]") && M && (M.onClear ? M.onClear() : M.onSelect(""), L && de(L, ""), P());
  });
}
function Se() {
  if (!v) return;
  if (!v.querySelector(".bg-white, .dark\\:bg-slate-800")) {
    v.innerHTML = le(), ce();
    return;
  }
  const t = v.querySelector("[data-icon-grid-area]")?.scrollTop ?? 0;
  v.innerHTML = le(), ce();
  const e = v.querySelector("[data-icon-grid-area]");
  e && (e.scrollTop = t);
  const r = v.querySelector("[data-icon-search]");
  r && (r.focus(), r.setSelectionRange(r.value.length, r.value.length));
}
function de(t, e) {
  const r = e.length > 0, a = t.querySelector("[data-icon-preview]"), o = t.querySelector("[data-icon-label]"), i = t.querySelector("[data-icon-clear]");
  a && (a.innerHTML = r ? ge(e) : "?", a.classList.toggle("text-gray-300", !r), a.classList.toggle("dark:text-gray-600", !r)), o && (o.textContent = r ? Ie(e) : "Choose icon…", o.classList.toggle("text-gray-400", !r), o.classList.toggle("dark:text-gray-500", !r), o.classList.toggle("text-gray-700", r), o.classList.toggle("dark:text-gray-300", r)), i && (i.classList.toggle("hidden", !r), i.setAttribute("aria-hidden", r ? "false" : "true"));
}
function ur(t, e, r) {
  t.querySelectorAll(e).forEach((a) => {
    a.addEventListener("click", (o) => {
      if (o.target.closest("[data-icon-clear]")) {
        o.stopPropagation();
        const i = r(a);
        i.onClear ? i.onClear() : i.onSelect(""), de(a, "");
        return;
      }
      L === a && v ? P() : kt(a, r(a));
    });
  });
}
function xt(t) {
  let e = t;
  for (; e; ) {
    const r = parseInt(e.style.zIndex, 10);
    if (!isNaN(r) && r > 0) return r;
    e = e.parentElement;
  }
  return 50;
}
async function wt(t) {
  return await t.listBlockDefinitionsSummary();
}
function W(t) {
  return (t.slug || t.type || "").trim();
}
function $t(t, e) {
  if (t.size === 0 || e.length === 0) return new Set(t);
  const r = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set();
  for (const o of e) {
    const i = W(o);
    if (!i) continue;
    const n = t.has(i), c = t.has(o.type);
    (n || c) && (r.add(i), c && o.slug && o.slug !== o.type && a.add(o.type));
  }
  for (const o of t)
    a.has(o) || r.has(o) || r.add(o);
  return r;
}
function jt(t) {
  const { availableBlocks: e, selectedBlocks: r, searchQuery: a } = t, o = t.accent ?? "blue", i = t.label ?? "Allowed Blocks", n = t.emptySelectionText;
  if (e.length === 0) return `
      <div class="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
        No block definitions available.
      </div>`;
  const c = a ? e.filter((k) => {
    const b = a.toLowerCase();
    return k.name.toLowerCase().includes(b) || W(k).toLowerCase().includes(b) || (k.category ?? "").toLowerCase().includes(b);
  }) : e, l = /* @__PURE__ */ new Map();
  for (const k of c) {
    const b = k.category || "uncategorized";
    l.has(b) || l.set(b, []), l.get(b).push(k);
  }
  const d = r.size, p = d === 0 && n ? n : `${d} selected`, y = o === "red" ? "focus:ring-red-500" : "focus:ring-blue-500", f = o === "red" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700" : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700";
  let m = `
    <div class="space-y-2" data-block-picker-inline>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${s(i)}</span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500">${s(p)}</span>
      </div>
      <div class="relative">
        <input type="text" data-block-picker-search
               placeholder="Search blocks..."
               value="${s(a ?? "")}"
               class="w-full px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 ${y}" />
      </div>
      <div class="max-h-[200px] overflow-y-auto space-y-1" data-block-picker-list>`;
  if (c.length === 0) m += `
        <div class="text-center py-3 text-xs text-gray-400 dark:text-gray-500">No matching blocks</div>`;
  else for (const [k, b] of l) {
    l.size > 1 && (m += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">${s(pe(k))}</div>`);
    for (const w of b) {
      const x = W(w), j = r.has(x) || r.has(w.type);
      m += `
        <label class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${j ? f : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"}">
          <input type="checkbox" value="${s(x)}" data-block-type="${s(w.type)}"
                 ${j ? "checked" : ""}
                 class="${S()}" />
          <div class="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
            ${w.icon ? ge(w.icon) : x.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[12px] font-medium text-gray-800 dark:text-gray-200">${s(w.name)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono ml-1">${s(x)}</span>
          </div>
        </label>`;
    }
  }
  return m += `
      </div>
    </div>`, m;
}
function gr(t, e) {
  const r = t.querySelector("[data-block-picker-inline]");
  if (!r) return;
  const a = r.querySelector("[data-block-picker-search]");
  a?.addEventListener("input", () => {
    e.searchQuery = a.value, Oe(r, e);
  });
  const o = r.querySelector("[data-block-picker-list]");
  o && ze(o, e);
}
function ze(t, e) {
  t.querySelectorAll('input[type="checkbox"]').forEach((r) => {
    r.addEventListener("change", () => {
      const a = r.value, o = r.dataset.blockType;
      r.checked ? (e.selectedBlocks.add(a), o && o !== a && e.selectedBlocks.delete(o)) : (e.selectedBlocks.delete(a), o && e.selectedBlocks.delete(o)), e.onSelectionChange(e.selectedBlocks);
      const i = t.closest("[data-block-picker-inline]");
      i && Oe(i, e);
    });
  });
}
function Oe(t, e) {
  const r = t.querySelector("[data-block-picker-list]");
  if (!r) return;
  const a = r.scrollTop, o = document.createElement("div");
  o.innerHTML = jt(e);
  const i = o.querySelector("[data-block-picker-list]"), n = o.querySelector("[data-block-picker-inline] > div > span:last-child");
  i && (r.innerHTML = i.innerHTML, r.scrollTop = a, ze(r, e));
  const c = t.querySelector(":scope > div > span:last-child");
  c && n && (c.textContent = n.textContent);
}
function St(...t) {
  for (const o of t) {
    const i = (o || "").trim();
    if (i) return O(i, { ensureAPISuffix: !0 });
  }
  const e = document.documentElement?.getAttribute("data-api-base-path") || document.body?.getAttribute("data-api-base-path");
  if (e && e.trim()) return O(e.trim(), { ensureAPISuffix: !0 });
  const r = document.documentElement?.getAttribute("data-base-path") || document.body?.getAttribute("data-base-path");
  if (r && r.trim()) return O(r.trim(), { ensureAPISuffix: !0 });
  const a = window?.DEBUG_CONFIG;
  return typeof a?.apiBasePath == "string" && a.apiBasePath.trim() ? O(a.apiBasePath.trim(), { ensureAPISuffix: !0 }) : typeof a?.basePath == "string" && a.basePath.trim() ? O(a.basePath.trim(), { ensureAPISuffix: !0 }) : "";
}
function mr(t, e) {
  const r = (e || "").trim();
  if (r) return xe(r);
  const a = xe((t || "").trim());
  if (!a) return "";
  const o = a.match(/^(.*)\/api(?:\/[^/]+)?$/);
  return o ? o[1] || "" : a;
}
var yr = class extends Q {
  constructor(t) {
    super({
      size: "2xl",
      initialFocus: 'input[name="name"]',
      ariaLabel: "Field configuration",
      backdropDataAttr: "data-field-config-backdrop"
    }), this.config = t, this.field = { ...t.field }, this.isNewField = !t.field.id || t.field.id.startsWith("new_");
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const t = Ee(this.field.type);
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${t?.icon ?? "?"}
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              ${this.isNewField ? "Add" : "Edit"} ${t?.label ?? "Field"}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">${t?.description ?? ""}</p>
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
              value="${s(this.field.name)}"
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
              value="${s(this.field.label)}"
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
            class="${Ye()}"
          >${s(this.field.description ?? "")}</textarea>
        </div>

        <div>
          <label class="${g()}">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${s(this.field.placeholder ?? "")}"
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
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="readonly"
              ${this.field.readonly ? "checked" : ""}
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Read-only</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="hidden"
              ${this.field.hidden ? "checked" : ""}
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Hidden</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="filterable"
              ${this.field.filterable ? "checked" : ""}
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Filterable</span>
          </label>
        </div>
      </div>
    `;
  }
  renderValidationSection() {
    const t = this.field.validation ?? {}, e = [
      "text",
      "textarea",
      "rich-text",
      "markdown",
      "code",
      "slug"
    ].includes(this.field.type), r = [
      "number",
      "integer",
      "currency",
      "percentage"
    ].includes(this.field.type);
    return !e && !r ? "" : `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Validation</h3>

        <div class="grid grid-cols-2 gap-4">
          ${e ? `
            <div>
              <label class="${g()}">
                Min Length
              </label>
              <input
                type="number"
                name="minLength"
                value="${t.minLength ?? ""}"
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
                value="${t.maxLength ?? ""}"
                min="0"
                class="${h()}"
              />
            </div>
          ` : ""}

          ${r ? `
            <div>
              <label class="${g()}">
                Minimum
              </label>
              <input
                type="number"
                name="min"
                value="${t.min ?? ""}"
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
                value="${t.max ?? ""}"
                step="any"
                class="${h()}"
              />
            </div>
          ` : ""}
        </div>

        ${e ? `
          <div>
            <label class="${g()}">
              Pattern (RegEx)
            </label>
            <input
              type="text"
              name="pattern"
              value="${s(t.pattern ?? "")}"
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
              value="${s(this.field.section ?? "")}"
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
    const t = [];
    if ([
      "select",
      "radio",
      "chips"
    ].includes(this.field.type)) {
      const e = this.field.config?.options ?? [];
      t.push(`
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
            ${e.map((r, a) => `
              <div class="flex items-center gap-2" data-option-row="${a}">
                <input
                  type="text"
                  name="option_value_${a}"
                  value="${s(String(r.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${a}"
                  value="${s(r.label)}"
                  placeholder="label"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  data-remove-option="${a}"
                  class="p-2 text-gray-400 hover:text-red-500"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      `);
    }
    if ([
      "reference",
      "references",
      "user"
    ].includes(this.field.type)) {
      const e = this.field.config;
      t.push(`
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
                value="${s(e?.target ?? "")}"
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
                value="${s(e?.displayField ?? "")}"
                placeholder="name"
                class="${h()}"
              />
            </div>
          </div>
        </div>
      `);
    }
    if ([
      "media-picker",
      "media-gallery",
      "file-upload"
    ].includes(this.field.type)) {
      const e = this.field.config;
      t.push(`
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
                value="${s(e?.accept ?? "")}"
                placeholder="image/*"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Value Mode
              </label>
              <select
                name="valueMode"
                class="${D()}"
                ${this.field.type === "file-upload" ? "disabled" : ""}
              >
                <option value="url" ${e?.valueMode !== "id" ? "selected" : ""}>URL</option>
                <option value="id" ${e?.valueMode === "id" ? "selected" : ""}>ID</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${g()}">
                Max Size (MB)
              </label>
              <input
                type="number"
                name="maxSize"
                value="${e?.maxSize ?? ""}"
                min="0"
                placeholder="10"
                class="${h()}"
              />
            </div>
            <div>
              <label class="${g()}">
                Accepted Kinds
              </label>
              <input
                type="text"
                name="acceptedKinds"
                value="${s((e?.acceptedKinds ?? []).join(", "))}"
                placeholder="image, audio"
                class="${h()}"
              />
            </div>
          </div>

          ${this.field.type === "media-gallery" ? `
            <p class="text-sm text-gray-500 dark:text-gray-400">Media gallery fields always store multiple assets.</p>
          ` : ""}
        </div>
      `);
    }
    if (this.field.type === "code") {
      const e = this.field.config;
      t.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Code Editor Settings</h3>

          <div>
            <label class="${g()}">
              Language
            </label>
            <select
              name="language"
              class="${D()}"
            >
              <option value="json" ${e?.language === "json" ? "selected" : ""}>JSON</option>
              <option value="javascript" ${e?.language === "javascript" ? "selected" : ""}>JavaScript</option>
              <option value="typescript" ${e?.language === "typescript" ? "selected" : ""}>TypeScript</option>
              <option value="html" ${e?.language === "html" ? "selected" : ""}>HTML</option>
              <option value="css" ${e?.language === "css" ? "selected" : ""}>CSS</option>
              <option value="sql" ${e?.language === "sql" ? "selected" : ""}>SQL</option>
              <option value="yaml" ${e?.language === "yaml" ? "selected" : ""}>YAML</option>
              <option value="markdown" ${e?.language === "markdown" ? "selected" : ""}>Markdown</option>
            </select>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="lineNumbers"
              ${e?.lineNumbers !== !1 ? "checked" : ""}
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Show line numbers</span>
          </label>
        </div>
      `);
    }
    if (this.field.type === "slug") {
      const e = this.field.config;
      t.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Slug Settings</h3>

          <div>
            <label class="${g()}">
              Source Field
            </label>
            <input
              type="text"
              name="sourceField"
              value="${s(e?.sourceField ?? "")}"
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
                value="${s(e?.prefix ?? "")}"
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
                value="${s(e?.suffix ?? "")}"
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
                class="${D()}"
              >
                <option value="-" ${e?.separator === "-" || !e?.separator ? "selected" : ""}>Hyphen (-)</option>
                <option value="_" ${e?.separator === "_" ? "selected" : ""}>Underscore (_)</option>
              </select>
            </div>
          </div>
        </div>
      `);
    }
    if (this.field.type === "color") {
      const e = this.field.config;
      t.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Color Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${g()}">
                Format
              </label>
              <select
                name="colorFormat"
                class="${D()}"
              >
                <option value="hex" ${e?.format === "hex" || !e?.format ? "selected" : ""}>HEX (#ff0000)</option>
                <option value="rgb" ${e?.format === "rgb" ? "selected" : ""}>RGB (rgb(255,0,0))</option>
                <option value="hsl" ${e?.format === "hsl" ? "selected" : ""}>HSL (hsl(0,100%,50%))</option>
              </select>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  name="allowAlpha"
                  ${e?.allowAlpha ? "checked" : ""}
                  class="${S()}"
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
              value="${s(e?.presets?.join(", ") ?? "")}"
              placeholder="#ff0000, #00ff00, #0000ff"
              class="${h()}"
            />
          </div>
        </div>
      `);
    }
    if (this.field.type === "location") {
      const e = this.field.config;
      t.push(`
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
                value="${e?.defaultCenter?.lat ?? ""}"
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
                value="${e?.defaultCenter?.lng ?? ""}"
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
                value="${e?.defaultZoom ?? ""}"
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
              ${e?.searchEnabled !== !1 ? "checked" : ""}
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Enable location search</span>
          </label>
        </div>
      `);
    }
    if (this.field.type === "daterange") {
      const e = this.field.config;
      t.push(`
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
                value="${s(e?.minDate ?? "")}"
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
                value="${s(e?.maxDate ?? "")}"
                class="${h()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowSameDay"
              ${e?.allowSameDay !== !1 ? "checked" : ""}
              class="${S()}"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Allow same start and end date</span>
          </label>
        </div>
      `);
    }
    if (this.field.type === "repeater") {
      const e = this.field.config;
      t.push(`
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
                value="${e?.minItems ?? ""}"
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
                value="${e?.maxItems ?? ""}"
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
              ${e?.collapsed ? "checked" : ""}
              class="${S()}"
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
      const e = this.field.config, r = e?.allowedBlocks ? JSON.stringify(e.allowedBlocks) : "[]", a = e?.deniedBlocks ? JSON.stringify(e.deniedBlocks) : "[]";
      t.push(`
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
                value="${e?.minBlocks ?? ""}"
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
                value="${e?.maxBlocks ?? ""}"
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
                ${e?.allowedBlocks?.length ? e.allowedBlocks.map((o) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${s(o)}">${s(o)}<button type="button" data-remove-allowed="${s(o)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'}
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${s(r)}' />
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
                ${e?.deniedBlocks?.length ? e.deniedBlocks.map((o) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${s(o)}">${s(o)}<button type="button" data-remove-denied="${s(o)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'}
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${s(a)}' />
          </div>
        </div>
      `);
    }
    return t.join("");
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
    const t = this.container.querySelector('input[name="name"]'), e = this.container.querySelector('input[name="label"]');
    t && e && this.isNewField && (e.addEventListener("input", () => {
      t.dataset.userModified || (t.value = Ct(e.value));
    }), t.addEventListener("input", () => {
      t.dataset.userModified = "true";
    })), this.bindOptionsEvents(), this.bindBlockPickerEvents();
  }
  bindOptionsEvents() {
    this.container && (this.container.querySelector("[data-add-option]")?.addEventListener("click", () => {
      const t = this.container?.querySelector("[data-options-list]");
      if (!t) return;
      const e = t.querySelectorAll("[data-option-row]").length, r = document.createElement("div");
      r.className = "flex items-center gap-2", r.setAttribute("data-option-row", String(e)), r.innerHTML = `
        <input
          type="text"
          name="option_value_${e}"
          placeholder="value"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="option_label_${e}"
          placeholder="label"
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          data-remove-option="${e}"
          class="p-2 text-gray-400 hover:text-red-500"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `, t.appendChild(r), r.querySelector("[data-remove-option]")?.addEventListener("click", () => {
        r.remove();
      }), r.querySelector(`input[name="option_value_${e}"]`)?.focus();
    }), this.container.querySelectorAll("[data-remove-option]").forEach((t) => {
      t.addEventListener("click", () => {
        t.closest("[data-option-row]")?.remove();
      });
    }));
  }
  bindBlockPickerEvents() {
    !this.container || this.field.type !== "blocks" || (this.container.querySelector("[data-block-picker-allowed]")?.addEventListener("click", () => {
      this.showBlockPicker("allowed");
    }), this.container.querySelector("[data-block-picker-denied]")?.addEventListener("click", () => {
      this.showBlockPicker("denied");
    }), this.container.querySelectorAll("[data-remove-allowed]").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault();
        const r = t.getAttribute("data-remove-allowed");
        r && this.removeBlockFromList("allowed", r);
      });
    }), this.container.querySelectorAll("[data-remove-denied]").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault();
        const r = t.getAttribute("data-remove-denied");
        r && this.removeBlockFromList("denied", r);
      });
    }));
  }
  async showBlockPicker(t) {
    const e = this.container?.querySelector(`input[name="${t}Blocks"]`), r = this.parseBlockListValue(e?.value), a = St(this.config.apiBasePath);
    new Bt({
      apiBasePath: a,
      selectedBlocks: r,
      title: t === "allowed" ? "Select Allowed Blocks" : "Select Denied Blocks",
      onSelect: (o) => {
        this.updateBlockList(t, o);
      }
    }).show();
  }
  updateBlockList(t, e) {
    const r = this.container?.querySelector(`input[name="${t}Blocks"]`), a = this.container?.querySelector(`[data-${t}-blocks-chips]`);
    if (!(!r || !a))
      if (r.value = JSON.stringify(e), e.length === 0) a.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500">${t === "allowed" ? "All blocks allowed (no restrictions)" : "No blocks denied"}</span>`;
      else {
        const o = t === "allowed" ? "blue" : "red";
        a.innerHTML = e.map((i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${o}-100 text-${o}-700 dark:bg-${o}-900/30 dark:text-${o}-400" data-block-chip="${s(i)}">${s(i)}<button type="button" data-remove-${t}="${s(i)}" class="hover:text-${o}-900 dark:hover:text-${o}-200">&times;</button></span>`).join(""), a.querySelectorAll(`[data-remove-${t}]`).forEach((i) => {
          i.addEventListener("click", (n) => {
            n.preventDefault();
            const c = i.getAttribute(`data-remove-${t}`);
            c && this.removeBlockFromList(t, c);
          });
        });
      }
  }
  removeBlockFromList(t, e) {
    const r = this.container?.querySelector(`input[name="${t}Blocks"]`);
    if (!r) return;
    const a = this.parseBlockListValue(r.value).filter((o) => o !== e);
    this.updateBlockList(t, a);
  }
  parseBlockListValue(t) {
    const e = ee(t, []);
    return Array.isArray(e) ? e.map((r) => String(r ?? "").trim()).filter(Boolean) : [];
  }
  handleSave() {
    const t = this.container?.querySelector("[data-field-config-form-element]");
    if (!t) return;
    const e = new FormData(t), r = e.get("name")?.trim();
    if (!r) {
      this.showError("name", "Field name is required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(r)) {
      this.showError("name", "Invalid field name format");
      return;
    }
    const a = this.config.existingFieldNames ?? [];
    if (r !== this.config.field.name && a.includes(r)) {
      this.showError("name", "A field with this name already exists");
      return;
    }
    const o = e.get("label")?.trim();
    if (!o) {
      this.showError("label", "Label is required");
      return;
    }
    const i = {
      id: this.field.id || _e(),
      name: r,
      type: this.field.type,
      order: this.field.order,
      label: o,
      description: e.get("description")?.trim() || void 0,
      placeholder: e.get("placeholder")?.trim() || void 0,
      required: e.get("required") === "on",
      readonly: e.get("readonly") === "on",
      hidden: e.get("hidden") === "on",
      filterable: e.get("filterable") === "on",
      section: e.get("section")?.trim() || void 0,
      gridSpan: e.get("gridSpan") ? parseInt(e.get("gridSpan"), 10) : void 0
    }, n = {}, c = e.get("minLength");
    c !== null && c !== "" && (n.minLength = parseInt(c, 10));
    const l = e.get("maxLength");
    l !== null && l !== "" && (n.maxLength = parseInt(l, 10));
    const d = e.get("min");
    d !== null && d !== "" && (n.min = parseFloat(d));
    const p = e.get("max");
    p !== null && p !== "" && (n.max = parseFloat(p));
    const y = e.get("pattern");
    y && y.trim() && (n.pattern = y.trim()), Object.keys(n).length > 0 && (i.validation = n);
    const f = this.buildTypeSpecificConfig(e);
    f && Object.keys(f).length > 0 && (i.config = f), this.config.onSave(i), this.hide();
  }
  buildTypeSpecificConfig(t) {
    switch (this.field.type) {
      case "select":
      case "radio":
      case "chips": {
        const e = [];
        let r = 0;
        for (; t.has(`option_value_${r}`); ) {
          const a = t.get(`option_value_${r}`)?.trim(), o = t.get(`option_label_${r}`)?.trim();
          a && e.push({
            value: a,
            label: o || a
          }), r++;
        }
        return e.length > 0 ? { options: e } : void 0;
      }
      case "reference":
      case "references":
      case "user": {
        const e = t.get("target")?.trim(), r = t.get("displayField")?.trim();
        return e ? {
          target: e,
          displayField: r || void 0
        } : void 0;
      }
      case "media-picker":
      case "media-gallery":
      case "file-upload": {
        const e = t.get("accept")?.trim(), r = t.get("maxSize") ? parseInt(t.get("maxSize"), 10) : void 0, a = t.get("valueMode")?.trim() || "url", o = (t.get("acceptedKinds") || "").split(",").map((i) => i.trim()).filter(Boolean);
        return {
          accept: e || void 0,
          maxSize: r,
          multiple: this.field.type === "media-gallery" ? !0 : void 0,
          valueMode: this.field.type === "file-upload" ? "url" : a,
          acceptedKinds: o.length > 0 ? o : void 0
        };
      }
      case "code":
        return {
          language: t.get("language")?.trim() || "json",
          lineNumbers: t.get("lineNumbers") === "on"
        };
      case "slug": {
        const e = t.get("sourceField")?.trim(), r = t.get("slugPrefix")?.trim(), a = t.get("slugSuffix")?.trim(), o = t.get("slugSeparator")?.trim() || "-";
        return {
          sourceField: e || void 0,
          prefix: r || void 0,
          suffix: a || void 0,
          separator: o
        };
      }
      case "color": {
        const e = t.get("colorFormat")?.trim() || "hex", r = t.get("allowAlpha") === "on", a = t.get("colorPresets")?.trim();
        return {
          format: e,
          allowAlpha: r,
          presets: a ? a.split(",").map((o) => o.trim()).filter(Boolean) : void 0
        };
      }
      case "location": {
        const e = t.get("defaultLat"), r = t.get("defaultLng"), a = t.get("defaultZoom"), o = { searchEnabled: t.get("searchEnabled") === "on" };
        return e && r && (o.defaultCenter = {
          lat: parseFloat(e),
          lng: parseFloat(r)
        }), a && (o.defaultZoom = parseInt(a, 10)), o;
      }
      case "daterange": {
        const e = t.get("minDate")?.trim(), r = t.get("maxDate")?.trim(), a = t.get("allowSameDay") === "on";
        return {
          minDate: e || void 0,
          maxDate: r || void 0,
          allowSameDay: a
        };
      }
      case "repeater": {
        const e = t.get("minItems"), r = t.get("maxItems"), a = t.get("collapsed") === "on";
        return {
          fields: this.field.config?.fields ?? [],
          minItems: e ? parseInt(e, 10) : void 0,
          maxItems: r ? parseInt(r, 10) : void 0,
          collapsed: a
        };
      }
      case "blocks": {
        const e = t.get("minBlocks"), r = t.get("maxBlocks"), a = t.get("allowedBlocks")?.trim(), o = t.get("deniedBlocks")?.trim(), i = this.field.config;
        let n, c;
        if (a) {
          const l = ee(a, null);
          if (Array.isArray(l)) {
            const d = l.map((p) => String(p ?? "").trim()).filter(Boolean);
            n = d.length > 0 ? d : void 0;
          } else
            n = a.split(",").map((d) => d.trim()).filter(Boolean), n.length === 0 && (n = void 0);
        }
        if (o) {
          const l = ee(o, null);
          if (Array.isArray(l)) {
            const d = l.map((p) => String(p ?? "").trim()).filter(Boolean);
            c = d.length > 0 ? d : void 0;
          } else
            c = o.split(",").map((d) => d.trim()).filter(Boolean), c.length === 0 && (c = void 0);
        }
        return {
          __sourceItemsSchema: i?.__sourceItemsSchema,
          __sourceAllowedBlocks: i?.__sourceAllowedBlocks,
          __sourceDeniedBlocks: i?.__sourceDeniedBlocks,
          __sourceRefPrefix: i?.__sourceRefPrefix,
          __sourceRepresentation: i?.__sourceRepresentation,
          __sourceWidget: i?.__sourceWidget,
          __sourceComponentName: i?.__sourceComponentName,
          __sourceComponentConfig: i?.__sourceComponentConfig,
          __sourceSortable: i?.__sourceSortable,
          __sourceHadAllowedBlocks: i?.__sourceHadAllowedBlocks,
          __sourceHadDeniedBlocks: i?.__sourceHadDeniedBlocks,
          minBlocks: e ? parseInt(e, 10) : void 0,
          maxBlocks: r ? parseInt(r, 10) : void 0,
          allowedBlocks: n,
          deniedBlocks: c
        };
      }
      default:
        return;
    }
  }
  showError(t, e) {
    const r = this.container?.querySelector(`[name="${t}"]`);
    if (!r) return;
    r.classList.add("border-red-500", "focus:ring-red-500"), r.focus(), r.parentElement?.querySelector(".field-error")?.remove();
    const a = document.createElement("p");
    a.className = "field-error text-xs text-red-500 mt-1", a.textContent = e, r.parentElement?.appendChild(a);
    const o = () => {
      r.classList.remove("border-red-500", "focus:ring-red-500"), a.remove(), r.removeEventListener("input", o);
    };
    r.addEventListener("input", o);
  }
};
function Ct(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[0-9]/, "_$&");
}
var Bt = class extends Q {
  constructor(t) {
    super({
      size: "lg",
      maxHeight: "max-h-[70vh]",
      ariaLabel: t.title
    }), this.availableBlocks = [], this.config = t, this.api = new Xe({ basePath: t.apiBasePath }), this.selectedBlocks = new Set(t.selectedBlocks);
  }
  async onAfterShow() {
    await this.loadBlocks();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${s(this.config.title)}</h3>
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
    const t = this.container?.querySelector("[data-blocks-loading]"), e = this.container?.querySelector("[data-blocks-list]"), r = this.container?.querySelector("[data-blocks-empty]");
    try {
      this.availableBlocks = await wt(this.api), this.selectedBlocks = $t(this.selectedBlocks, this.availableBlocks), t?.classList.add("hidden"), this.availableBlocks.length === 0 ? r?.classList.remove("hidden") : (e?.classList.remove("hidden"), this.renderBlocksList());
    } catch {
      t?.classList.add("hidden"), r?.classList.remove("hidden");
      const a = r?.querySelector("span") || r;
      a && (a.textContent = "Failed to load block definitions");
    }
  }
  renderBlocksList() {
    const t = this.container?.querySelector("[data-blocks-list]");
    t && (t.innerHTML = this.availableBlocks.map((e) => {
      const r = W(e), a = this.selectedBlocks.has(r) || this.selectedBlocks.has(e.type);
      return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${a ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
            <input
              type="checkbox"
              value="${s(r)}"
              data-block-type="${s(e.type)}"
              ${a ? "checked" : ""}
              class="${S()}"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${e.icon || r.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${s(e.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${s(r)}</div>
            </div>
            ${e.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${s(e.schema_version)}</span>` : ""}
          </label>
        `;
    }).join(""), t.querySelectorAll('input[type="checkbox"]').forEach((e) => {
      e.addEventListener("change", () => {
        const r = e.value, a = e.dataset.blockType;
        e.checked ? (this.selectedBlocks.add(r), a && a !== r && this.selectedBlocks.delete(a)) : (this.selectedBlocks.delete(r), a && this.selectedBlocks.delete(a)), this.updateSelectionCount(), this.renderBlocksList();
      });
    }), this.updateSelectionCount());
  }
  updateSelectionCount() {
    const t = this.container?.querySelector("[data-selection-count]");
    t && (t.textContent = `${this.selectedBlocks.size} selected`);
  }
}, Mt = {
  text: "text",
  media: "media",
  choice: "selection",
  number: "number",
  datetime: "datetime",
  relationship: "reference",
  structure: "structural",
  advanced: "advanced"
}, _t = {
  text: "cat-text",
  media: "cat-media",
  choice: "cat-selection",
  number: "cat-number",
  datetime: "cat-datetime",
  relationship: "cat-reference",
  structure: "cat-structural",
  advanced: "cat-advanced"
};
function Lt(t) {
  const e = (t ?? "").trim().toLowerCase();
  return Mt[e] ?? "advanced";
}
function At(t, e) {
  const r = (t ?? "").trim();
  if (r) return r;
  const a = (e ?? "").trim();
  return a ? pe(a) : "Advanced";
}
function Tt(t) {
  const e = (t ?? "").trim().toLowerCase(), r = _t[e] ?? "cat-advanced";
  return z(r);
}
function Et(t) {
  const e = t.defaults;
  if (!(!e || typeof e != "object"))
    return e;
}
function Pt(t, e) {
  const r = (t.type ?? "text").trim().toLowerCase(), a = r === "text" ? "textarea" : Ae(r), o = {
    type: a,
    label: (t.label ?? "").trim() || pe(t.type ?? a),
    description: (t.description ?? "").trim(),
    icon: z(t.icon ?? "") || z(a) || "",
    category: e,
    defaultConfig: Et(t)
  };
  return (t.type ?? "").toLowerCase() === "hidden" && (o.defaultConfig = {
    ...o.defaultConfig ?? {},
    hidden: !0
  }), o;
}
function Fe(t) {
  const e = [], r = [];
  for (const a of t) {
    const o = a.category ?? {}, i = (o.id ?? "").trim().toLowerCase(), n = Lt(i);
    e.push({
      id: n,
      label: At(o.label, i),
      icon: Tt(i),
      collapsed: o.collapsed
    });
    const c = Array.isArray(a.field_types) ? a.field_types : [];
    for (const l of c) r.push(Pt(l, n));
  }
  return {
    categories: e,
    fieldTypes: r
  };
}
var It = Fe([
  {
    category: {
      id: "text",
      label: "Text",
      icon: "text",
      order: 10
    },
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
    category: {
      id: "media",
      label: "Media",
      icon: "media",
      order: 20
    },
    field_types: [
      {
        type: "media-picker",
        label: "Media",
        description: "Single media asset picker",
        category: "media",
        icon: "media-picker",
        defaults: { config: { valueMode: "url" } },
        order: 10
      },
      {
        type: "media-gallery",
        label: "Media Gallery",
        description: "Multiple media assets",
        category: "media",
        icon: "media-gallery",
        defaults: { config: {
          multiple: !0,
          valueMode: "url"
        } },
        order: 20
      },
      {
        type: "file-upload",
        label: "File Upload",
        description: "Direct file upload field",
        category: "media",
        icon: "file-upload",
        order: 30
      }
    ]
  },
  {
    category: {
      id: "choice",
      label: "Choice",
      icon: "choice",
      order: 30
    },
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
        defaults: { config: {
          options: [],
          multiple: !1
        } },
        order: 20
      },
      {
        type: "multiselect",
        label: "Multi Select",
        description: "Multiple selections",
        category: "choice",
        icon: "chips",
        defaults: { config: {
          options: [],
          multiple: !0
        } },
        order: 30
      }
    ]
  },
  {
    category: {
      id: "number",
      label: "Number",
      icon: "number",
      order: 40
    },
    field_types: [{
      type: "integer",
      label: "Integer",
      description: "Whole number",
      category: "number",
      icon: "integer",
      order: 10
    }, {
      type: "decimal",
      label: "Decimal",
      description: "Decimal number",
      category: "number",
      icon: "number",
      defaults: { config: { precision: 2 } },
      order: 20
    }]
  },
  {
    category: {
      id: "datetime",
      label: "Date & Time",
      icon: "datetime",
      order: 50
    },
    field_types: [{
      type: "date",
      label: "Date",
      description: "Calendar date",
      category: "datetime",
      icon: "date",
      defaults: { config: { format: "YYYY-MM-DD" } },
      order: 10
    }, {
      type: "datetime",
      label: "Date & Time",
      description: "Date with time",
      category: "datetime",
      icon: "datetime",
      order: 20
    }]
  },
  {
    category: {
      id: "relationship",
      label: "Relationship",
      icon: "relationship",
      order: 60
    },
    field_types: [{
      type: "reference",
      label: "Reference",
      description: "Link to another type",
      category: "relationship",
      icon: "reference",
      defaults: { config: { targetType: null } },
      order: 10
    }]
  },
  {
    category: {
      id: "structure",
      label: "Structure",
      icon: "structure",
      order: 70
    },
    field_types: [{
      type: "group",
      label: "Group",
      description: "Nested fields",
      category: "structure",
      icon: "group",
      defaults: { config: { fields: [] } },
      order: 10
    }]
  },
  {
    category: {
      id: "advanced",
      label: "Advanced",
      icon: "advanced",
      order: 80,
      collapsed: !0
    },
    field_types: [
      {
        type: "json",
        label: "JSON",
        description: "Raw JSON input",
        category: "advanced",
        icon: "json",
        order: 10
      },
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
function zt() {
  const t = /* @__PURE__ */ new Map();
  for (const e of Y) t.set(e.type, e);
  for (const e of It.fieldTypes) t.has(e.type) || t.set(e.type, e);
  return {
    categories: Te.map((e) => ({
      id: e.id,
      label: e.label,
      icon: e.icon
    })),
    fieldTypes: Array.from(t.values())
  };
}
var K = zt();
async function Ot(t) {
  try {
    const e = await t.getBlockFieldTypeGroups();
    if (e && e.length > 0) {
      const r = Fe(e);
      return {
        categories: r.categories,
        fieldTypes: r.fieldTypes
      };
    }
  } catch {
  }
  try {
    const e = await t.getFieldTypes();
    if (e && e.length > 0) return {
      categories: [...K.categories],
      fieldTypes: e
    };
  } catch {
  }
  return {
    categories: [...K.categories],
    fieldTypes: [...K.fieldTypes]
  };
}
var Ft = /* @__PURE__ */ new Set(["advanced"]), Ce = "application/x-field-palette-type", qt = "application/x-field-palette-meta", hr = class {
  constructor(t) {
    this.fieldTypes = [], this.fieldTypeByKey = /* @__PURE__ */ new Map(), this.fieldTypeKeyByRef = /* @__PURE__ */ new Map(), this.categoryOrder = [], this.searchQuery = "", this.categoryStates = /* @__PURE__ */ new Map(), this.isLoading = !0, this.enabled = !1, this.config = t, this.categoryOrder = [...K.categories];
  }
  async init() {
    this.isLoading = !0, this.render(), await this.loadFieldTypes(), this.isLoading = !1, this.render();
  }
  enable() {
    this.enabled = !0, this.render();
  }
  disable() {
    this.enabled = !1, this.render();
  }
  async refresh() {
    await this.loadFieldTypes(), this.render();
  }
  async loadFieldTypes() {
    const t = await Ot(this.config.api);
    this.fieldTypes = t.fieldTypes, this.categoryOrder = t.categories, this.initCategoryStates(), this.buildFieldTypeKeyMap();
  }
  initCategoryStates() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.categoryOrder) t.add(e.id);
    for (const e of t) this.categoryStates.has(e) || this.categoryStates.set(e, { collapsed: Ft.has(e) });
    for (const e of this.categoryOrder) {
      const r = this.categoryStates.get(e.id) ?? { collapsed: !1 };
      e.collapsed !== void 0 && (r.collapsed = e.collapsed), this.categoryStates.set(e.id, r);
    }
  }
  buildFieldTypeKeyMap() {
    this.fieldTypeByKey.clear(), this.fieldTypeKeyByRef.clear(), this.fieldTypes.forEach((t, e) => {
      const r = `${t.type}:${e}`;
      this.fieldTypeByKey.set(r, t), this.fieldTypeKeyByRef.set(t, r);
    });
  }
  render() {
    const t = this.config.container;
    if (this.isLoading) {
      t.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>`;
      return;
    }
    if (!this.enabled) {
      t.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-xs text-gray-400 dark:text-gray-500">Select a block to see available field types</p>
        </div>`;
      return;
    }
    t.innerHTML = "", t.classList.add("flex", "flex-col", "min-h-0");
    const e = document.createElement("div");
    e.className = "px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0", e.innerHTML = `
      <div class="relative">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input type="text"
               data-palette-search
               placeholder="Search fields..."
               value="${s(this.searchQuery)}"
               class="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-700 transition-colors" />
      </div>`, t.appendChild(e);
    const r = document.createElement("div");
    r.className = "overflow-y-auto flex-1 min-h-0", r.setAttribute("data-palette-list", ""), this.searchQuery ? r.innerHTML = this.renderSearchResults() : r.innerHTML = this.renderCategoryGroups(), t.appendChild(r), this.bindEvents(t);
  }
  renderCategoryGroups() {
    let t = "";
    for (const e of this.categoryOrder) {
      const r = this.fieldTypes.filter((o) => o.category === e.id);
      if (r.length === 0) continue;
      const a = this.categoryStates.get(e.id)?.collapsed ?? !1;
      t += `
        <div data-palette-category="${s(e.id)}" class="border-b border-gray-50 dark:border-gray-800">
          <button type="button" data-palette-toggle="${s(e.id)}"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3 h-3 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-palette-chevron="${s(e.id)}">
              ${a ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 dark:text-gray-500">${e.icon}</span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex-1">${s(e.label)}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">${r.length}</span>
          </button>
          <div class="${a ? "hidden" : ""}" data-palette-category-body="${s(e.id)}">
            <div class="px-2 pb-2 space-y-0.5">
              ${r.map((o) => this.renderPaletteItem(o)).join("")}
            </div>
          </div>
        </div>`;
    }
    return t || (t = `
        <div class="px-4 py-8 text-center">
          <p class="text-xs text-gray-400 dark:text-gray-500">No field types available.</p>
        </div>`), t;
  }
  renderSearchResults() {
    const t = this.searchQuery.toLowerCase(), e = this.fieldTypes.filter((r) => r.label.toLowerCase().includes(t) || (r.description ?? "").toLowerCase().includes(t) || r.type.toLowerCase().includes(t));
    return e.length === 0 ? `
        <div class="px-4 py-8 text-center">
          <svg class="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-gray-400 dark:text-gray-500">No fields match "${s(this.searchQuery)}"</p>
        </div>` : `
      <div class="px-2 py-2 space-y-0.5">
        ${e.map((r) => this.renderPaletteItem(r)).join("")}
      </div>`;
  }
  renderPaletteItem(t) {
    const e = this.fieldTypeKeyByRef.get(t) ?? t.type;
    return `
      <div data-palette-item="${s(e)}"
           draggable="true"
           class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-blue-50 dark:hover:bg-blue-900/20 active:cursor-grabbing transition-colors group select-none"
           title="${s(t.description)}">
        <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 cursor-grab" data-palette-grip>
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
          </svg>
        </span>
        <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          ${t.icon}
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-[12px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">${s(t.label)}</span>
        </span>
      </div>`;
  }
  bindEvents(t) {
    const e = t.querySelector("[data-palette-search]");
    e?.addEventListener("input", () => {
      this.searchQuery = e.value;
      const a = t.querySelector("[data-palette-list]");
      a && (a.innerHTML = this.searchQuery ? this.renderSearchResults() : this.renderCategoryGroups(), this.bindListEvents(a));
    });
    const r = t.querySelector("[data-palette-list]");
    r && this.bindListEvents(r);
  }
  bindListEvents(t) {
    t.querySelectorAll("[data-palette-toggle]").forEach((e) => {
      e.addEventListener("click", () => {
        const r = e.dataset.paletteToggle, a = this.categoryStates.get(r) ?? { collapsed: !1 };
        a.collapsed = !a.collapsed, this.categoryStates.set(r, a);
        const o = t.querySelector(`[data-palette-category-body="${r}"]`), i = t.querySelector(`[data-palette-chevron="${r}"]`);
        o && o.classList.toggle("hidden", a.collapsed), i && (i.innerHTML = a.collapsed ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      });
    }), t.querySelectorAll("[data-palette-item]").forEach((e) => {
      e.addEventListener("click", (r) => {
        if (r.detail === 0) return;
        const a = e.dataset.paletteItem, o = this.fieldTypeByKey.get(a) ?? this.fieldTypes.find((i) => i.type === a);
        o && this.config.onAddField(o);
      });
    }), t.querySelectorAll("[data-palette-item]").forEach((e) => {
      e.addEventListener("dragstart", (r) => {
        const a = e.dataset.paletteItem;
        r.dataTransfer.effectAllowed = "copy";
        const o = this.fieldTypeByKey.get(a) ?? this.fieldTypes.find((i) => i.type === a);
        o ? (r.dataTransfer.setData(Ce, o.type), r.dataTransfer.setData(qt, JSON.stringify(o))) : r.dataTransfer.setData(Ce, a), r.dataTransfer.setData("text/plain", o?.type ?? a), e.classList.add("opacity-50");
      }), e.addEventListener("dragend", () => {
        e.classList.remove("opacity-50");
      });
    });
  }
};
function Nt(t, e) {
  switch (t) {
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
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-md"${e ? ` title="${s(e)}"` : ""}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Save failed
      </span>`;
    default:
      return "";
  }
}
function fr(t) {
  const { name: e, subtitle: r, subtitleMono: a = !1, status: o, version: i, saveState: n = "idle", saveMessage: c, actions: l, compact: d = !1 } = t, p = d ? "px-5" : "px-6", y = d ? "h2" : "h1", f = d ? "text-lg" : "text-xl", m = d ? "gap-2.5" : "gap-3", k = Nt(n, c), b = o ? H(d ? o : o.charAt(0).toUpperCase() + o.slice(1), "status", o, d ? {
    uppercase: !0,
    attrs: { "data-entity-status-badge": "" }
  } : { attrs: { "data-entity-status-badge": "" } }) : "", w = i ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${s(i)}</span>` : "", x = r ? `<p class="${a ? "text-[11px] font-mono text-gray-400 dark:text-gray-500" : "text-sm text-gray-500 dark:text-gray-400"} mt-0.5 truncate">${s(r)}</p>` : "";
  return d ? `
      <div class="${p} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <${y} class="${f} font-semibold text-gray-900 dark:text-white truncate leading-snug" data-entity-name>${s(e)}</${y}>
          ${x}
        </div>
        <div class="flex items-center ${m} shrink-0">
          <span data-entity-save-indicator>${k}</span>
          ${b}
          ${l || ""}
        </div>
      </div>` : `
    <div class="${p} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
      <div>
        <div class="flex items-center gap-3">
          <${y} class="${f} font-semibold text-gray-900 dark:text-white" data-entity-name>${s(e)}</${y}>
          ${b}
          ${w}
        </div>
        ${x}
      </div>
      <div class="flex items-center ${m}">
        <span data-entity-save-indicator>${k}</span>
        ${l || ""}
      </div>
    </div>`;
}
var Rt = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>', Dt = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>', Ht = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>', Vt = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>', Kt = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
function br(t) {
  const { field: e, isExpanded: r = !1, isSelected: a = !1, isDropTarget: o = !1, hasErrors: i = !1, errorMessages: n = [], showReorderButtons: c = !1, isFirst: l = !1, isLast: d = !1, compact: p = !1, renderExpandedContent: y, actionsHtml: f = "", constraintBadges: m = [], sectionName: k, index: b } = t, w = Ee(e.type), x = typeof y == "function";
  let j;
  i ? j = "border-red-400 bg-red-50 dark:bg-red-900/10" : r ? j = "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20" : a ? j = "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : j = "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600";
  const _ = o ? "border-t-2 border-t-blue-400" : "", N = p ? "gap-1.5 px-2 py-2" : "gap-3 p-3", qe = p ? "w-7 h-7 rounded-md" : "w-8 h-8 rounded-lg", Ne = p ? "text-[13px]" : "text-sm", Re = p ? "text-[10px]" : "text-xs", De = p ? "xs" : "sm", He = i ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400", Ve = i ? Kt : w?.icon ?? "?", R = [];
  e.required && R.push(H("req", "status", "required", {
    size: "sm",
    uppercase: !0,
    extraClass: "flex-shrink-0"
  })), e.readonly && R.push(H("ro", "status", "readonly", {
    size: "sm",
    uppercase: !0,
    extraClass: "flex-shrink-0"
  })), e.hidden && R.push(H("hid", "status", "hidden", {
    size: "sm",
    uppercase: !0,
    extraClass: "flex-shrink-0"
  }));
  const Ke = R.join(`
          `);
  let Z = `data-field-card="${s(e.id)}"`;
  k != null && (Z += ` data-field-section="${s(k)}"`), b != null && (Z += ` data-field-index="${b}"`);
  let X;
  if (p) X = `${s(e.name)} &middot; ${s(e.type)}`;
  else {
    const B = w?.label ?? e.type, T = [
      `<span class="font-mono">${s(e.name)}</span>`,
      "<span>&middot;</span>",
      `<span>${s(B)}</span>`
    ];
    e.section && T.push(`<span>&middot; ${s(e.section)}</span>`), e.gridSpan && T.push(`<span>&middot; ${e.gridSpan} cols</span>`), X = T.join(" ");
  }
  let me = "";
  m.length > 0 && (me = `
            <div class="flex items-center gap-1 mt-1">
              ${m.map((B) => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${s(B)}</span>`).join("")}
            </div>`);
  let ye = "";
  i && n.length > 0 && (ye = `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${n.map((B) => s(B)).join(", ")}
            </div>`);
  let he = "";
  if (c) {
    const B = l, T = d, be = "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800", ke = "text-gray-200 dark:text-gray-700 cursor-not-allowed", Ge = B ? ke : be, Ue = T ? ke : be;
    he = `
          <span class="inline-flex flex-col leading-none" role="group" aria-label="Reorder field">
            <button type="button" data-field-move-up="${s(e.id)}"
                    class="flex items-center justify-center w-5 h-3.5 rounded ${Ge} transition-colors"
                    aria-label="Move field up" title="Move up" ${B ? "disabled" : ""}>
              ${Rt}
            </button>
            <button type="button" data-field-move-down="${s(e.id)}"
                    class="flex items-center justify-center w-5 h-3.5 rounded ${Ue} transition-colors"
                    aria-label="Move field down" title="Move down" ${T ? "disabled" : ""}>
              ${Dt}
            </button>
          </span>`;
  }
  let fe = "";
  return x && (fe = `
          <button
            type="button"
            data-field-expand-toggle="${s(e.id)}"
            class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="${r ? "Collapse field" : "Expand field"}"
            aria-expanded="${r ? "true" : "false"}"
            title="${r ? "Collapse field" : "Expand field"}">
            ${r ? Vt : Ht}
          </button>`), `
      <div ${Z}
           draggable="true"
           class="rounded-lg border ${_} ${j} transition-colors">
        <div class="flex items-center ${N} select-none" ${x ? `data-field-toggle="${s(e.id)}"` : ""}>
          <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 cursor-grab active:cursor-grabbing" data-field-grip="${s(e.id)}">
            ${Qe(De)}
          </span>
          <span class="flex-shrink-0 ${qe} flex items-center justify-center ${He} text-[11px]">
            ${Ve}
          </span>
          <span class="flex-1 min-w-0 ${x ? "cursor-pointer" : ""}">
            <span class="block ${Ne} font-medium text-gray-800 dark:text-gray-100 truncate">${s(e.label || e.name)}</span>
            <span class="block ${Re} text-gray-400 dark:text-gray-500 ${p ? "font-mono" : ""} truncate">${X}</span>${me}${ye}
          </span>
          ${Ke}
          <div class="flex items-center gap-0.5 flex-shrink-0">${he}${f}${fe}</div>
        </div>
        ${r && x ? y() : ""}
      </div>`;
}
var Gt = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>';
function kr(t) {
  return `<button type="button" data-field-actions="${s(t)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Field actions" title="Field actions" aria-haspopup="true">
              ${Gt}
            </button>`;
}
function vr(t = {}) {
  const { highlight: e = !1, text: r = "Drop a field here or click a field type in the palette" } = t;
  return `
      <div data-field-drop-zone
           class="mx-3 my-2 py-6 border-2 border-dashed rounded-lg text-center transition-colors ${e ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
        <p class="text-xs text-gray-400 dark:text-gray-500">${s(r)}</p>
      </div>`;
}
function xr(t) {
  return `<div class="ct-preview-readonly pointer-events-none select-none" aria-label="Read-only form preview">${t}</div>`;
}
function wr() {
  const t = window.FormgenBehaviors;
  typeof t?.initJSONEditors == "function" && t.initJSONEditors();
  const e = window.FormgenRelationships?.autoInitWysiwyg ?? t?.autoInitWysiwyg;
  typeof e == "function" && e();
}
var $r = class extends Q {
  constructor(t, e) {
    super({
      size: "4xl",
      maxHeight: "max-h-[90vh]",
      initialFocus: "[data-preview-modal-close]",
      ariaLabel: "Interactive form preview"
    }), this.previewHtml = t, this.hydrate = e;
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Interactive Form Preview</h2>
        <button type="button" data-preview-modal-close
                class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                aria-label="Close preview">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="overflow-y-auto p-6" data-preview-modal-body>${this.previewHtml}</div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-preview-modal-close]")?.addEventListener("click", () => this.hide());
  }
  async onAfterShow() {
    this.hydrate();
  }
};
export {
  sr as A,
  pr as C,
  Y as D,
  Te as E,
  Me as F,
  _e as I,
  or as L,
  Xe as M,
  Ze as N,
  lr as O,
  ir as P,
  nr as R,
  cr as S,
  dr as T,
  $t as _,
  br as a,
  P as b,
  Nt as c,
  Ce as d,
  yr as f,
  wt as g,
  gr as h,
  vr as i,
  Ae as j,
  Ee as k,
  hr as l,
  St as m,
  wr as n,
  kr as o,
  mr as p,
  xr as r,
  fr as s,
  $r as t,
  qt as u,
  jt as v,
  ge as w,
  Pe as x,
  ur as y
};

//# sourceMappingURL=schema-preview-CmnuWQks.js.map