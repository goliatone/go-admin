import { escapeHTML as n } from "../shared/html.js";
import { t as kt } from "../chunks/icon-renderer-a2WAOpSe.js";
import { n as T, r as Q, t as Y } from "../chunks/modal-C7iNT0ae.js";
import { httpRequest as xt } from "../shared/transport/http-client.js";
import { extractErrorMessage as wt } from "../toast/error-helpers.js";
import { t as O } from "../chunks/badge-DT04uHwZ.js";
import { normalizeAPIBasePath as K, trimTrailingSlash as _e } from "../shared/path-normalization.js";
import { onReady as Oe } from "../shared/dom-ready.js";
import { parseJSONValue as H } from "../shared/json-parse.js";
import { capitalizeLabel as q, nameToSlug as we, titleCaseIdentifier as ie, titleCaseWords as F } from "./shared/text.js";
import { deepCloneJSON as Ve } from "../shared/deep-clone.js";
import { formatContentTypeDate as Ue } from "./shared/date-formatters.js";
import { renderBlockStatusBadge as St, renderBlockStatusDot as $t } from "./shared/status-badges.js";
var re = class extends Error {
  constructor(t, e, a, r) {
    super(t), this.name = "ContentTypeAPIError", this.status = e, this.textCode = a, this.fields = r;
  }
}, R = class {
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
    const a = e.toString(), r = `${this.contentTypesPanelBasePath()}${a ? `?${a}` : ""}`, s = await (await this.fetch(r, { method: "GET" })).json();
    return Array.isArray(s) ? {
      items: s,
      total: s.length
    } : s.items && Array.isArray(s.items) ? s : s.data && Array.isArray(s.data) ? {
      items: s.data,
      total: s.total ?? s.data.length
    } : {
      items: [],
      total: 0
    };
  }
  async get(t) {
    const e = `${this.contentTypesPanelBasePath()}/${encodeURIComponent(t)}`, a = await (await this.fetch(e, { method: "GET" })).json();
    return a.item ?? a.data ?? a;
  }
  async create(t) {
    const e = this.contentTypesPanelBasePath(), a = await (await this.fetch(e, {
      method: "POST",
      body: JSON.stringify(t)
    })).json();
    return a.item ?? a.data ?? a;
  }
  async update(t, e) {
    const a = `${this.contentTypesPanelBasePath()}/${encodeURIComponent(t)}`, r = await (await this.fetch(a, {
      method: "PUT",
      body: JSON.stringify(e)
    })).json();
    return r.item ?? r.data ?? r;
  }
  async delete(t) {
    const e = `${this.contentTypesPanelBasePath()}/${encodeURIComponent(t)}`;
    await this.fetch(e, { method: "DELETE" });
  }
  async publish(t, e) {
    const a = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/publish`, r = await (await this.fetch(a, {
      method: "POST",
      body: JSON.stringify({ force: e ?? !1 })
    })).json();
    return r.item ?? r.data ?? r;
  }
  async deprecate(t) {
    const e = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/deprecate`, a = await (await this.fetch(e, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  async clone(t, e, a) {
    const r = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/clone`, s = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({
        slug: e,
        name: a
      })
    })).json();
    return s.item ?? s.data ?? s;
  }
  async checkCompatibility(t, e, a) {
    const r = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/compatibility`;
    return await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({
        schema: e,
        ui_schema: a
      })
    })).json();
  }
  async getVersionHistory(t) {
    const e = `${this.config.basePath}/content_types/${encodeURIComponent(t)}/versions`;
    try {
      const a = await (await this.fetch(e, { method: "GET" })).json();
      return { versions: a.versions ?? a.items ?? a ?? [] };
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
    const a = e.toString(), r = `${this.blockDefinitionsPanelBasePath()}${a ? `?${a}` : ""}`, s = await (await this.fetch(r, { method: "GET" })).json();
    return Array.isArray(s) ? {
      items: s,
      total: s.length
    } : s.items && Array.isArray(s.items) ? s : s.data && Array.isArray(s.data) ? {
      items: s.data,
      total: s.total ?? s.data.length
    } : {
      items: [],
      total: 0
    };
  }
  async getBlockDefinition(t) {
    const e = `${this.blockDefinitionsPanelBasePath()}/${encodeURIComponent(t)}`, a = await (await this.fetch(e, { method: "GET" })).json();
    return a.item ?? a.data ?? a;
  }
  async createBlockDefinition(t) {
    const e = this.blockDefinitionsPanelBasePath(), a = await (await this.fetch(e, {
      method: "POST",
      body: JSON.stringify(t)
    })).json();
    return a.item ?? a.data ?? a;
  }
  async updateBlockDefinition(t, e) {
    const a = `${this.blockDefinitionsPanelBasePath()}/${encodeURIComponent(t)}`, r = await (await this.fetch(a, {
      method: "PUT",
      body: JSON.stringify(e)
    })).json();
    return r.item ?? r.data ?? r;
  }
  async deleteBlockDefinition(t) {
    const e = `${this.blockDefinitionsPanelBasePath()}/${encodeURIComponent(t)}`;
    await this.fetch(e, { method: "DELETE" });
  }
  async publishBlockDefinition(t) {
    const e = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/publish`, a = await (await this.fetch(e, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  async deprecateBlockDefinition(t) {
    const e = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/deprecate`, a = await (await this.fetch(e, { method: "POST" })).json();
    return a.item ?? a.data ?? a;
  }
  async cloneBlockDefinition(t, e, a) {
    const r = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/clone`, s = await (await this.fetch(r, {
      method: "POST",
      body: JSON.stringify({
        type: e,
        slug: a
      })
    })).json();
    return s.item ?? s.data ?? s;
  }
  async getBlockDefinitionVersions(t) {
    const e = `${this.config.basePath}/block_definitions/${encodeURIComponent(t)}/versions`;
    try {
      const a = await (await this.fetch(e, { method: "GET" })).json();
      return { versions: a.versions ?? a.items ?? a ?? [] };
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
      const a = e, r = this.toNonEmptyString(a.effective_channel);
      if (!r) return null;
      const s = this.toNonEmptyString(a.requested_channel), i = Array.isArray(a.available_channels) ? a.available_channels : [];
      return {
        effective_channel: r,
        requested_channel: s,
        total_effective: Number.isFinite(a.total_effective) ? Number(a.total_effective) : 0,
        total_default: Number.isFinite(a.total_default) ? Number(a.total_default) : 0,
        available_channels: i.map((o) => String(o)).filter((o) => o.length > 0)
      };
    } catch {
      return null;
    }
  }
  toNonEmptyString(...t) {
    for (const e of t) if (typeof e == "string" && e.trim().length > 0) return e;
    return "";
  }
  appendQueryParamIfMissing(t, e, a) {
    if (!a) return t;
    const r = e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[?&])${r}=`).test(t) ? t : `${t}${t.includes("?") ? "&" : "?"}${e}=${encodeURIComponent(a)}`;
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
    const a = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.config.headers
    };
    this.channel && (a["X-Admin-Channel"] = this.channel, t = this.appendQueryParamIfMissing(t, "channel", this.channel));
    const r = await xt(t, {
      ...e,
      headers: a,
      credentials: this.config.credentials
    });
    return r.ok || await this.handleError(r), r;
  }
  async handleError(t) {
    let e = null;
    try {
      e = await t.clone().json();
    } catch {
    }
    const a = await wt(t);
    let r = e?.text_code, s = e?.fields;
    if (e && typeof e.error == "object" && e.error) {
      const i = e.error;
      if (!r && typeof i.text_code == "string" && (r = i.text_code), !s) {
        const o = i.metadata?.fields;
        o && typeof o == "object" && (s = o);
      }
      if (!s && Array.isArray(i.validation_errors)) {
        const o = {};
        for (const l of i.validation_errors) {
          const c = typeof l.field == "string" ? l.field : "", d = typeof l.message == "string" ? l.message : "";
          c && d && (o[c] = d);
        }
        Object.keys(o).length > 0 && (s = o);
      }
    }
    throw new re(a, t.status, r, s);
  }
};
function oe(t) {
  return Ve(t);
}
function qe(t, e) {
  return {
    ...t,
    ...e
  };
}
function j(t) {
  if (!t || t.length === 0) return [];
  const e = /* @__PURE__ */ new Set(), a = [];
  for (const r of t) {
    const s = String(r ?? "").trim();
    !s || e.has(s) || (e.add(s), a.push(s));
  }
  return a;
}
function De(t, e) {
  const a = j(t), r = j(e);
  if (a.length !== r.length) return !1;
  const s = new Set(r);
  return a.every((i) => s.has(i));
}
function Ct(t) {
  if (typeof t != "string") return {};
  const e = t.trim();
  if (!e) return {};
  const a = e.lastIndexOf("/");
  return a === -1 || a === e.length - 1 ? { type: e } : {
    type: e.slice(a + 1),
    prefix: e.slice(0, a + 1)
  };
}
function Bt(t) {
  if (!Array.isArray(t) || t.length === 0) return null;
  const e = [];
  let a;
  for (const s of t) {
    if (!s || typeof s != "object") continue;
    const i = Ct(s.$ref);
    i.type && (e.push(i.type), !a && i.prefix && (a = i.prefix));
  }
  if (e.length > 0) return {
    allowed: j(e),
    mode: "refs",
    refPrefix: a
  };
  const r = t.map((s) => {
    const i = s?.properties?._type;
    return typeof i?.const == "string" ? i.const : void 0;
  }).filter((s) => !!s);
  return r.length > 0 ? {
    allowed: j(r),
    mode: "inline"
  } : null;
}
function Lt(t) {
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
  return t && t.length > 0 && (e.oneOf = t.map((a) => ({
    type: "object",
    properties: { _type: { const: a } },
    required: ["_type"]
  })), e["x-discriminator"] = "_type"), e;
}
function Et(t, e) {
  const a = typeof e == "string" && e.trim() ? e : "#/$defs/";
  return { oneOf: t.map((r) => ({ $ref: `${a}${r}` })) };
}
function jt(t, e) {
  if (!t) return oe(e);
  const a = oe(e), r = t.$defs ?? {}, s = a.$defs ?? {};
  (Object.keys(r).length > 0 || Object.keys(s).length > 0) && (a.$defs = qe(r, s));
  const i = t.metadata, o = a.metadata;
  return (i || o) && (a.metadata = qe(i ?? {}, o ?? {})), a;
}
function ne(t, e) {
  const a = {}, r = [];
  for (const i of t)
    a[i.name] = Mt(i), i.required && r.push(i.name);
  const s = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: a
  };
  return e && (s.$id = e), r.length > 0 && (s.required = r), s;
}
function Ge(t, e) {
  const a = ne(t, e);
  if (!e) return a;
  a.properties = a.properties ?? {}, a.properties._type = {
    type: "string",
    const: e
  };
  const r = new Set(a.required ?? []);
  return r.add("_type"), a.required = Array.from(r), a;
}
function Mt(t) {
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
      format: "uri"
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
  e.type = a.type, a.format && (e.format = a.format), t.label && (e.title = t.label), t.description && (e.description = t.description), t.defaultValue !== void 0 && (e.default = t.defaultValue), t.validation && (t.validation.minLength !== void 0 && (e.minLength = t.validation.minLength), t.validation.maxLength !== void 0 && (e.maxLength = t.validation.maxLength), t.validation.min !== void 0 && (e.minimum = t.validation.min), t.validation.max !== void 0 && (e.maximum = t.validation.max), t.validation.pattern && (e.pattern = t.validation.pattern));
  const r = {}, s = Tt(t.type);
  switch (s && (r.widget = s), t.placeholder && (r.placeholder = t.placeholder), t.helpText && (r.helpText = t.helpText), t.section && (r.section = t.section), t.order !== void 0 && (r.order = t.order), t.gridSpan !== void 0 && (r.grid = { span: t.gridSpan }), t.readonly && (r.readonly = !0), t.hidden && (r.hidden = !0), t.filterable && (r.filterable = !0), Object.keys(r).length > 0 && (e["x-formgen"] = r), t.filterable && (e["x-admin"] = { filterable: !0 }), t.type) {
    case "select":
    case "radio":
      t.config && "options" in t.config && t.config.options && (e.enum = t.config.options.map((i) => i.value));
      break;
    case "chips":
      e.items = { type: "string" }, t.config && "options" in t.config && t.config.options && (e.items.enum = t.config.options.map((i) => i.value));
      break;
    case "media-gallery":
    case "references":
      e.items = {
        type: "string",
        format: "uri"
      };
      break;
    case "repeater":
      t.config && "fields" in t.config && t.config.fields ? e.items = ne(t.config.fields) : e.items = { type: "string" };
      break;
    case "blocks": {
      const i = t.config, o = j(i?.allowedBlocks), l = j(i?.deniedBlocks), c = j(i?.__sourceAllowedBlocks), d = j(i?.__sourceDeniedBlocks), h = o.length > 0, y = l.length > 0, u = !De(o, c), f = !De(l, d), p = i?.__sourceItemsSchema, b = i?.__sourceRepresentation ?? "inline";
      p && !u ? e.items = oe(p) : b === "refs" && h ? e.items = Et(o, i?.__sourceRefPrefix) : e.items = Lt(h ? o : void 0), i?.minBlocks !== void 0 && (e.minItems = i.minBlocks), i?.maxBlocks !== void 0 && (e.maxItems = i.maxBlocks);
      const k = {
        ...r,
        widget: i?.__sourceWidget || "block",
        sortable: i?.__sourceSortable ?? !0
      };
      h && (i?.__sourceHadAllowedBlocks || b !== "refs" || u) && (k.allowedBlocks = o), (y || i?.__sourceHadDeniedBlocks && f) && (k.deniedBlocks = l), e["x-formgen"] = k;
      break;
    }
  }
  return e;
}
function Tt(t) {
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
function le(t) {
  if (!t.properties) return [];
  const e = new Set(t.required ?? []), a = [];
  for (const [r, s] of Object.entries(t.properties))
    r === "_type" || r === "_schema" || a.push(Ft(r, s, e.has(r)));
  return a.sort((r, s) => (r.order ?? 999) - (s.order ?? 999)), a;
}
function Ft(t, e, a) {
  const r = e["x-formgen"], s = e["x-admin"]?.filterable ?? r?.filterable, i = {
    id: U(),
    name: t,
    type: Pt(e),
    label: e.title ?? ie(t),
    description: e.description,
    placeholder: r?.placeholder,
    helpText: r?.helpText,
    required: a,
    readonly: r?.readonly,
    hidden: r?.hidden,
    filterable: s === !0,
    defaultValue: e.default,
    section: r?.section,
    gridSpan: r?.grid?.span,
    order: r?.order
  }, o = {};
  if (e.minLength !== void 0 && (o.minLength = e.minLength), e.maxLength !== void 0 && (o.maxLength = e.maxLength), e.minimum !== void 0 && (o.min = e.minimum), e.maximum !== void 0 && (o.max = e.maximum), e.pattern && (o.pattern = e.pattern), Object.keys(o).length > 0 && (i.validation = o), e.enum && Array.isArray(e.enum) && (i.config = { options: e.enum.map((l) => ({
    value: String(l),
    label: ie(String(l))
  })) }), i.type === "blocks" && e.type === "array") {
    const l = {}, c = e.items ? oe(e.items) : void 0;
    c && (l.__sourceItemsSchema = c), typeof r?.widget == "string" && r.widget.trim() && (l.__sourceWidget = r.widget.trim()), typeof r?.sortable == "boolean" && (l.__sourceSortable = r.sortable), l.__sourceHadAllowedBlocks = Array.isArray(r?.allowedBlocks), l.__sourceHadDeniedBlocks = Array.isArray(r?.deniedBlocks), e.minItems !== void 0 && (l.minBlocks = e.minItems), e.maxItems !== void 0 && (l.maxBlocks = e.maxItems);
    const d = c?.oneOf ? Bt(c.oneOf) : null;
    d && (l.__sourceRepresentation = d.mode, d.refPrefix && (l.__sourceRefPrefix = d.refPrefix));
    let h;
    if (r?.allowedBlocks && Array.isArray(r.allowedBlocks)) {
      const y = j(r.allowedBlocks);
      h = d?.allowed.length ? d.allowed : y, y.length > 0 && (l.allowedBlocks = y);
    } else d?.allowed.length && (h = d.allowed, l.allowedBlocks = d.allowed);
    if (l.__sourceRepresentation || (l.__sourceRepresentation = "inline"), h && h.length > 0 && (l.__sourceAllowedBlocks = h), r?.deniedBlocks && Array.isArray(r.deniedBlocks)) {
      const y = j(r.deniedBlocks);
      y.length > 0 && (l.deniedBlocks = y), l.__sourceDeniedBlocks = y;
    }
    Object.keys(l).length > 0 && (i.config = l);
  }
  return i;
}
function Pt(t) {
  const e = t["x-formgen"], a = Array.isArray(t.type) ? t.type[0] : t.type;
  switch (a) {
    case "array":
      if (t.items) {
        const r = t.items;
        if (r.oneOf) return "blocks";
        if (r.enum) return "chips";
        if (e?.widget === "block") return "blocks";
        if (e?.widget === "chips") return "chips";
        if (e?.widget === "media-picker") return "media-gallery";
        if (r.format === "uuid" || r.format === "uri") return "references";
      }
      return "repeater";
    default:
      break;
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
    if (r[e.widget]) return r[e.widget];
  }
  switch (a) {
    case "string":
      return t.format === "date-time" ? "datetime" : t.format === "date" ? "date" : t.format === "time" ? "time" : t.format === "uri" ? "media-picker" : t.format === "uuid" ? "reference" : t.enum ? "select" : "text";
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
function U() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
var At = {
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
function G(t) {
  return At[t] ?? "";
}
function L(t) {
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
function v(t) {
  return G(t);
}
var pe = [
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
    defaultConfig: { config: {
      multiline: !0,
      rows: 4
    } }
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
    defaultConfig: { config: {
      language: "json",
      lineNumbers: !0
    } }
  },
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
    defaultConfig: { config: {
      precision: 2,
      prefix: "$"
    } }
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "Percentage value (0-100)",
    icon: v("percentage"),
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
    defaultConfig: { config: {
      options: [],
      multiple: !0
    } }
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "Boolean switch",
    icon: v("toggle"),
    category: "selection"
  },
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
    defaultConfig: { config: {
      accept: "image/*",
      multiple: !0
    } }
  },
  {
    type: "file-upload",
    label: "File",
    description: "File attachment",
    icon: v("file-upload"),
    category: "media"
  },
  {
    type: "reference",
    label: "Reference",
    description: "Link to another content type",
    icon: v("reference"),
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
    icon: v("references"),
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
    icon: v("user"),
    category: "reference"
  },
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
    icon: v("blocks"),
    category: "structural",
    defaultConfig: { config: { allowedBlocks: [] } }
  },
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
], Ke = [
  {
    id: "text",
    label: "Text",
    icon: v("cat-text")
  },
  {
    id: "number",
    label: "Numbers",
    icon: v("cat-number")
  },
  {
    id: "selection",
    label: "Selection",
    icon: v("cat-selection")
  },
  {
    id: "datetime",
    label: "Date & Time",
    icon: v("cat-datetime")
  },
  {
    id: "media",
    label: "Media",
    icon: v("cat-media")
  },
  {
    id: "reference",
    label: "References",
    icon: v("cat-reference")
  },
  {
    id: "structural",
    label: "Structural",
    icon: v("cat-structural")
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: v("cat-advanced")
  }
];
function ge(t) {
  const e = L(String(t));
  return pe.find((a) => a.type === e);
}
function qa(t) {
  return pe.filter((e) => e.category === t);
}
var Je = class extends T {
  constructor(t) {
    super({
      size: "3xl",
      maxHeight: "h-[80vh]",
      initialFocus: "[data-field-type-search]",
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
    return Ke.map((t) => `
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
    let e = pe.filter((a) => !t.has(a.type));
    if (this.searchQuery) {
      const a = this.searchQuery.toLowerCase();
      e = e.filter((r) => r.label.toLowerCase().includes(a) || r.description.toLowerCase().includes(a) || r.type.toLowerCase().includes(a));
    } else e = e.filter((a) => a.category === this.selectedCategory);
    return e.length === 0 ? `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm">No field types found</p>
        </div>
      ` : `
      <div class="grid grid-cols-2 gap-3">
        ${e.map((a) => this.renderFieldTypeCard(a)).join("")}
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
        const a = this.container?.querySelector("[data-field-type-search]");
        a && (a.value = ""), this.updateView();
      });
    }), this.container.addEventListener("click", (e) => {
      const a = e.target.closest("[data-field-type-select]");
      if (a) {
        const r = a.getAttribute("data-field-type-select");
        this.config.onSelect(r), this.hide();
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
    t && (t.innerHTML = this.renderCategories(), t.querySelectorAll("[data-field-category]").forEach((a) => {
      a.addEventListener("click", () => {
        this.selectedCategory = a.getAttribute("data-field-category"), this.searchQuery = "";
        const r = this.container?.querySelector("[data-field-type-search]");
        r && (r.value = ""), this.updateView();
      });
    }));
    const e = this.container.querySelector("[data-field-type-list]");
    e && (e.innerHTML = this.renderFieldTypes());
  }
}, ze = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500", We = "px-3 py-2 text-sm border-gray-300", Qe = "px-2 py-1 text-[12px] border-gray-200";
function g(t = "sm") {
  return t === "xs" ? `${ze} ${Qe}` : `${ze} ${We}`;
}
function M(t = "sm") {
  const e = "w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white";
  return t === "xs" ? `${e} ${Qe}` : `${e} ${We}`;
}
function Ee(t = {}) {
  const e = t.size ?? "sm", a = t.resize ?? "y", r = a === "none" ? "resize-none" : a === "x" ? "resize-x" : a === "both" ? "resize" : "resize-y";
  return `${g(e)} ${r}`;
}
function B() {
  return "w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500";
}
function m(t = "sm") {
  return t === "xs" ? "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" : "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
}
function It(t = "sm") {
  return `<svg class="${t === "xs" ? "w-3 h-3" : "w-4 h-4"}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
var _t = [
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
], qt = [
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
function Dt() {
  const t = [], e = [];
  for (const a of [
    "Content",
    "Objects",
    "People",
    "Business",
    "Media",
    "Communication",
    "System",
    "Misc"
  ]) {
    const r = qt.filter((s) => s.category === a);
    if (r.length !== 0) {
      e.push({
        id: a.toLowerCase(),
        label: a,
        startIndex: t.length
      });
      for (const s of r) t.push({
        value: s.value,
        label: s.label,
        keywords: s.keywords,
        display: kt(`iconoir:${s.value}`, { size: "18px" })
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
var zt = [
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
function Ht() {
  const t = [], e = [];
  for (const a of _t) {
    e.push({
      id: a.id,
      label: a.label,
      startIndex: t.length
    });
    for (const r of a.entries) t.push({
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
    entries: t,
    categories: e
  };
}
function Rt() {
  const t = [];
  for (const e of zt) {
    const a = G(e);
    a && t.push({
      value: e,
      label: e.replace(/-/g, " "),
      keywords: e.replace(/-/g, " "),
      display: a
    });
  }
  return {
    id: "icons",
    label: "Icons",
    icon: "◇",
    entries: t
  };
}
var E = [], He = !1;
function ee() {
  He || (He = !0, E.push(Dt()), E.push(Ht()), E.push(Rt()));
}
function Da(t) {
  ee();
  const e = E.findIndex((a) => a.id === t.id);
  e >= 0 ? E[e] = t : E.push(t);
}
function za(t) {
  ee();
  const e = E.findIndex((a) => a.id === t);
  e >= 0 && E.splice(e, 1);
}
function Ye() {
  return ee(), E;
}
function te(t) {
  if (!t) return "";
  const e = G(t);
  if (e) return e;
  ee();
  for (const a of E) {
    const r = a.entries.find((s) => s.value === t);
    if (r) return r.display;
  }
  return n(t);
}
function Ze(t) {
  if (!t) return "";
  ee();
  for (const e of E) {
    const a = e.entries.find((r) => r.value === t);
    if (a) return a.label;
  }
  return t;
}
function ye(t, e, a) {
  const r = te(t), s = Ze(t), i = t.length > 0, o = a ? "h-[30px]" : "h-[38px]", l = a ? "text-[12px]" : "text-sm", c = a ? "w-5 h-5 text-[14px]" : "w-6 h-6 text-base", d = a ? "w-5 h-5" : "w-6 h-6";
  return `
    <div data-icon-trigger
         class="flex items-center gap-1.5 ${o} px-2 border rounded-lg bg-white text-gray-900
                dark:border-gray-600 dark:bg-slate-800 dark:text-white
                hover:border-gray-400 dark:hover:border-gray-500
                cursor-pointer transition-colors select-none">
      <span data-icon-preview
            class="flex-shrink-0 ${c} flex items-center justify-center rounded
                   ${i ? "" : "text-gray-300 dark:text-gray-600"}">
        ${i ? r : "?"}
      </span>
      <span data-icon-label
            class="flex-1 min-w-0 truncate ${l} ${i ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}">
        ${i ? n(s) : "Choose icon…"}
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
      <input type="hidden" ${e} value="${n(t)}" />
    </div>`;
}
var x = null, _ = null, D = null, de = "iconoir", z = "", V = null, W = null;
function Nt(t, e) {
  P(), _ = e, D = t, z = "", de = Ye()[0]?.id ?? "emoji", x = document.createElement("div"), x.setAttribute("data-icon-picker-popover", ""), x.className = "fixed", x.style.zIndex = String(Vt(t) + 5), x.innerHTML = Se(), document.body.appendChild(x), Ot(t), $e(), x.querySelector("[data-icon-search]")?.focus(), V = (a) => {
    const r = a.target;
    !r.closest("[data-icon-picker-popover]") && !r.closest("[data-icon-trigger]") && P();
  }, setTimeout(() => {
    V && document.addEventListener("mousedown", V);
  }, 0), W = (a) => {
    a.key === "Escape" && P();
  }, document.addEventListener("keydown", W);
}
function P() {
  x && (x.remove(), x = null), V && (document.removeEventListener("mousedown", V), V = null), W && (document.removeEventListener("keydown", W), W = null), _ = null, D = null;
}
function Ot(t) {
  if (!x) return;
  const e = t.getBoundingClientRect(), a = 320, r = 380;
  let s = e.bottom + 4, i = e.left;
  s + r > window.innerHeight - 8 && (s = e.top - r - 4), i + a > window.innerWidth - 8 && (i = window.innerWidth - a - 8), i < 8 && (i = 8), x.style.top = `${s}px`, x.style.left = `${i}px`, x.style.width = `${a}px`;
}
function Se() {
  const t = Ye(), e = t.find((i) => i.id === de) ?? t[0];
  let a = [];
  if (z) {
    const i = z.toLowerCase();
    for (const o of t) for (const l of o.entries) (l.label.toLowerCase().includes(i) || l.value.toLowerCase().includes(i) || (l.keywords ?? "").toLowerCase().includes(i)) && a.push({
      entry: l,
      tabId: o.id
    });
  } else e && (a = e.entries.map((i) => ({
    entry: i,
    tabId: e.id
  })));
  const r = t.map((i) => {
    const o = i.id === de;
    return `
      <button type="button" data-icon-tab="${n(i.id)}"
              class="px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap
                     ${o ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"}">
        ${i.icon ? `<span class="mr-0.5">${i.icon}</span>` : ""}${n(i.label)}
      </button>`;
  }).join("");
  let s;
  if (a.length === 0) s = '<div class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">No matching icons</div>';
  else if (z) s = ke(a.map((i) => i.entry));
  else if (e?.categories && e.categories.length > 0) {
    s = "";
    for (let i = 0; i < e.categories.length; i++) {
      const o = e.categories[i], l = e.categories[i + 1]?.startIndex ?? e.entries.length, c = e.entries.slice(o.startIndex, l);
      c.length !== 0 && (s += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 pt-2 pb-1">${n(o.label)}</div>`, s += ke(c));
    }
  } else s = ke(a.map((i) => i.entry));
  return `
    <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl
                flex flex-col overflow-hidden" style="max-height: 380px;">
      <div class="px-3 pt-3 pb-2 space-y-2 flex-shrink-0">
        <div class="relative">
          <input type="text" data-icon-search
                 placeholder="Search icons…"
                 value="${n(z)}"
                 class="${g("xs")}" />
        </div>
        <div class="flex items-center gap-1 overflow-x-auto" data-icon-tab-bar>
          ${r}
        </div>
      </div>
      <div class="flex-1 overflow-y-auto px-3 pb-2" data-icon-grid-area>
        ${s}
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
function ke(t) {
  let e = '<div class="grid grid-cols-8 gap-0.5">';
  for (const a of t) {
    const r = !a.display.startsWith("<");
    e += `
      <button type="button" data-icon-pick="${n(a.value)}"
              title="${n(a.label)}"
              class="w-8 h-8 flex items-center justify-center rounded-md
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-colors cursor-pointer
                     ${r ? "text-lg" : "text-gray-600 dark:text-gray-300"}">
        ${r ? a.display : `<span class="w-5 h-5 flex items-center justify-center">${a.display}</span>`}
      </button>`;
  }
  return e += "</div>", e;
}
function $e() {
  if (!x) return;
  const t = x.querySelector("[data-icon-search]");
  t?.addEventListener("input", () => {
    z = t.value, Re();
  }), x.addEventListener("click", (e) => {
    const a = e.target, r = a.closest("[data-icon-tab]");
    if (r) {
      de = r.dataset.iconTab, z = "", Re();
      return;
    }
    const s = a.closest("[data-icon-pick]");
    if (s && _) {
      const i = s.dataset.iconPick;
      _.onSelect(i), D && Ce(D, i), P();
      return;
    }
    a.closest("[data-icon-clear-btn]") && _ && (_.onClear ? _.onClear() : _.onSelect(""), D && Ce(D, ""), P());
  });
}
function Re() {
  if (!x) return;
  if (!x.querySelector(".bg-white, .dark\\:bg-slate-800")) {
    x.innerHTML = Se(), $e();
    return;
  }
  const t = x.querySelector("[data-icon-grid-area]")?.scrollTop ?? 0;
  x.innerHTML = Se(), $e();
  const e = x.querySelector("[data-icon-grid-area]");
  e && (e.scrollTop = t);
  const a = x.querySelector("[data-icon-search]");
  a && (a.focus(), a.setSelectionRange(a.value.length, a.value.length));
}
function Ce(t, e) {
  const a = e.length > 0, r = t.querySelector("[data-icon-preview]"), s = t.querySelector("[data-icon-label]"), i = t.querySelector("[data-icon-clear]");
  r && (r.innerHTML = a ? te(e) : "?", r.classList.toggle("text-gray-300", !a), r.classList.toggle("dark:text-gray-600", !a)), s && (s.textContent = a ? Ze(e) : "Choose icon…", s.classList.toggle("text-gray-400", !a), s.classList.toggle("dark:text-gray-500", !a), s.classList.toggle("text-gray-700", a), s.classList.toggle("dark:text-gray-300", a)), i && (i.classList.toggle("hidden", !a), i.setAttribute("aria-hidden", a ? "false" : "true"));
}
function fe(t, e, a) {
  t.querySelectorAll(e).forEach((r) => {
    r.addEventListener("click", (s) => {
      if (s.target.closest("[data-icon-clear]")) {
        s.stopPropagation();
        const i = a(r);
        i.onClear ? i.onClear() : i.onSelect(""), Ce(r, "");
        return;
      }
      D === r && x ? P() : Nt(r, a(r));
    });
  });
}
function Vt(t) {
  let e = t;
  for (; e; ) {
    const a = parseInt(e.style.zIndex, 10);
    if (!isNaN(a) && a > 0) return a;
    e = e.parentElement;
  }
  return 50;
}
async function je(t) {
  return await t.listBlockDefinitionsSummary();
}
function ce(t) {
  return (t.slug || t.type || "").trim();
}
function Z(t, e) {
  if (t.size === 0 || e.length === 0) return new Set(t);
  const a = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  for (const s of e) {
    const i = ce(s);
    if (!i) continue;
    const o = t.has(i), l = t.has(s.type);
    (o || l) && (a.add(i), l && s.slug && s.slug !== s.type && r.add(s.type));
  }
  for (const s of t)
    r.has(s) || a.has(s) || a.add(s);
  return a;
}
function X(t) {
  const { availableBlocks: e, selectedBlocks: a, searchQuery: r } = t, s = t.accent ?? "blue", i = t.label ?? "Allowed Blocks", o = t.emptySelectionText;
  if (e.length === 0) return `
      <div class="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
        No block definitions available.
      </div>`;
  const l = r ? e.filter((p) => {
    const b = r.toLowerCase();
    return p.name.toLowerCase().includes(b) || ce(p).toLowerCase().includes(b) || (p.category ?? "").toLowerCase().includes(b);
  }) : e, c = /* @__PURE__ */ new Map();
  for (const p of l) {
    const b = p.category || "uncategorized";
    c.has(b) || c.set(b, []), c.get(b).push(p);
  }
  const d = a.size, h = d === 0 && o ? o : `${d} selected`, y = s === "red" ? "focus:ring-red-500" : "focus:ring-blue-500", u = s === "red" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700" : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700";
  let f = `
    <div class="space-y-2" data-block-picker-inline>
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${n(i)}</span>
        <span class="text-[10px] text-gray-400 dark:text-gray-500">${n(h)}</span>
      </div>
      <div class="relative">
        <input type="text" data-block-picker-search
               placeholder="Search blocks..."
               value="${n(r ?? "")}"
               class="w-full px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 ${y}" />
      </div>
      <div class="max-h-[200px] overflow-y-auto space-y-1" data-block-picker-list>`;
  if (l.length === 0) f += `
        <div class="text-center py-3 text-xs text-gray-400 dark:text-gray-500">No matching blocks</div>`;
  else for (const [p, b] of c) {
    c.size > 1 && (f += `
        <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">${n(F(p))}</div>`);
    for (const k of b) {
      const w = ce(k), A = a.has(w) || a.has(k.type);
      f += `
        <label class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${A ? u : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"}">
          <input type="checkbox" value="${n(w)}" data-block-type="${n(k.type)}"
                 ${A ? "checked" : ""}
                 class="${B()}" />
          <div class="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
            ${k.icon ? te(k.icon) : w.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[12px] font-medium text-gray-800 dark:text-gray-200">${n(k.name)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono ml-1">${n(w)}</span>
          </div>
        </label>`;
    }
  }
  return f += `
      </div>
    </div>`, f;
}
function Xe(t, e) {
  const a = t.querySelector("[data-block-picker-inline]");
  if (!a) return;
  const r = a.querySelector("[data-block-picker-search]");
  r?.addEventListener("input", () => {
    e.searchQuery = r.value, tt(a, e);
  });
  const s = a.querySelector("[data-block-picker-list]");
  s && et(s, e);
}
function et(t, e) {
  t.querySelectorAll('input[type="checkbox"]').forEach((a) => {
    a.addEventListener("change", () => {
      const r = a.value, s = a.dataset.blockType;
      a.checked ? (e.selectedBlocks.add(r), s && s !== r && e.selectedBlocks.delete(s)) : (e.selectedBlocks.delete(r), s && e.selectedBlocks.delete(s)), e.onSelectionChange(e.selectedBlocks);
      const i = t.closest("[data-block-picker-inline]");
      i && tt(i, e);
    });
  });
}
function tt(t, e) {
  const a = t.querySelector("[data-block-picker-list]");
  if (!a) return;
  const r = a.scrollTop, s = document.createElement("div");
  s.innerHTML = X(e);
  const i = s.querySelector("[data-block-picker-list]"), o = s.querySelector("[data-block-picker-inline] > div > span:last-child");
  i && (a.innerHTML = i.innerHTML, a.scrollTop = r, et(a, e));
  const l = t.querySelector(":scope > div > span:last-child");
  l && o && (l.textContent = o.textContent);
}
function be(...t) {
  for (const s of t) {
    const i = (s || "").trim();
    if (i) return K(i, { ensureAPISuffix: !0 });
  }
  const e = document.documentElement?.getAttribute("data-api-base-path") || document.body?.getAttribute("data-api-base-path");
  if (e && e.trim()) return K(e.trim(), { ensureAPISuffix: !0 });
  const a = document.documentElement?.getAttribute("data-base-path") || document.body?.getAttribute("data-base-path");
  if (a && a.trim()) return K(a.trim(), { ensureAPISuffix: !0 });
  const r = window?.DEBUG_CONFIG;
  return typeof r?.apiBasePath == "string" && r.apiBasePath.trim() ? K(r.apiBasePath.trim(), { ensureAPISuffix: !0 }) : typeof r?.basePath == "string" && r.basePath.trim() ? K(r.basePath.trim(), { ensureAPISuffix: !0 }) : "";
}
function Me(t, e) {
  const a = (e || "").trim();
  if (a) return _e(a);
  const r = _e((t || "").trim());
  if (!r) return "";
  const s = r.match(/^(.*)\/api(?:\/[^/]+)?$/);
  return s ? s[1] || "" : r;
}
var he = class extends T {
  constructor(t) {
    super({
      size: "2xl",
      initialFocus: 'input[name="name"]',
      backdropDataAttr: "data-field-config-backdrop"
    }), this.config = t, this.field = { ...t.field }, this.isNewField = !t.field.id || t.field.id.startsWith("new_");
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const t = ge(this.field.type);
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
            <label class="${m()}">
              Field Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value="${n(this.field.name)}"
              placeholder="field_name"
              pattern="^[a-z][a-z0-9_]*$"
              required
              class="${g()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Lowercase letters, numbers, underscores. Starts with letter.</p>
          </div>

          <div>
            <label class="${m()}">
              Label <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="label"
              value="${n(this.field.label)}"
              placeholder="Field Label"
              required
              class="${g()}"
            />
          </div>
        </div>

        <div>
          <label class="${m()}">
            Description
          </label>
          <textarea
            name="description"
            rows="2"
            placeholder="Help text for editors"
            class="${Ee()}"
          >${n(this.field.description ?? "")}</textarea>
        </div>

        <div>
          <label class="${m()}">
            Placeholder
          </label>
          <input
            type="text"
            name="placeholder"
            value="${n(this.field.placeholder ?? "")}"
            placeholder="Placeholder text"
            class="${g()}"
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

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="filterable"
              ${this.field.filterable ? "checked" : ""}
              class="${B()}"
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
    ].includes(this.field.type), a = [
      "number",
      "integer",
      "currency",
      "percentage"
    ].includes(this.field.type);
    return !e && !a ? "" : `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Validation</h3>

        <div class="grid grid-cols-2 gap-4">
          ${e ? `
            <div>
              <label class="${m()}">
                Min Length
              </label>
              <input
                type="number"
                name="minLength"
                value="${t.minLength ?? ""}"
                min="0"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Max Length
              </label>
              <input
                type="number"
                name="maxLength"
                value="${t.maxLength ?? ""}"
                min="0"
                class="${g()}"
              />
            </div>
          ` : ""}

          ${a ? `
            <div>
              <label class="${m()}">
                Minimum
              </label>
              <input
                type="number"
                name="min"
                value="${t.min ?? ""}"
                step="any"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Maximum
              </label>
              <input
                type="number"
                name="max"
                value="${t.max ?? ""}"
                step="any"
                class="${g()}"
              />
            </div>
          ` : ""}
        </div>

        ${e ? `
          <div>
            <label class="${m()}">
              Pattern (RegEx)
            </label>
            <input
              type="text"
              name="pattern"
              value="${n(t.pattern ?? "")}"
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
            <label class="${m()}">
              Section/Tab
            </label>
            <input
              type="text"
              name="section"
              value="${n(this.field.section ?? "")}"
              placeholder="main"
              class="${g()}"
            />
          </div>

          <div>
            <label class="${m()}">
              Grid Span (1-12)
            </label>
            <input
              type="number"
              name="gridSpan"
              value="${this.field.gridSpan ?? ""}"
              min="1"
              max="12"
              placeholder="12"
              class="${g()}"
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
            ${e.map((a, r) => `
              <div class="flex items-center gap-2" data-option-row="${r}">
                <input
                  type="text"
                  name="option_value_${r}"
                  value="${n(String(a.value))}"
                  placeholder="value"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="option_label_${r}"
                  value="${n(a.label)}"
                  placeholder="label"
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  data-remove-option="${r}"
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
              <label class="${m()}">
                Target Content Type
              </label>
              <input
                type="text"
                name="target"
                value="${n(e?.target ?? "")}"
                placeholder="users"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Display Field
              </label>
              <input
                type="text"
                name="displayField"
                value="${n(e?.displayField ?? "")}"
                placeholder="name"
                class="${g()}"
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
              <label class="${m()}">
                Accept Types
              </label>
              <input
                type="text"
                name="accept"
                value="${n(e?.accept ?? "")}"
                placeholder="image/*"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Max Size (MB)
              </label>
              <input
                type="number"
                name="maxSize"
                value="${e?.maxSize ?? ""}"
                min="0"
                placeholder="10"
                class="${g()}"
              />
            </div>
          </div>

          ${this.field.type === "media-gallery" ? `
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="multiple"
                ${e?.multiple !== !1 ? "checked" : ""}
                class="${B()}"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Allow multiple files</span>
            </label>
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
            <label class="${m()}">
              Language
            </label>
            <select
              name="language"
              class="${M()}"
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
              class="${B()}"
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
            <label class="${m()}">
              Source Field
            </label>
            <input
              type="text"
              name="sourceField"
              value="${n(e?.sourceField ?? "")}"
              placeholder="title"
              class="${g()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Field name to generate slug from (e.g., title)</p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="${m()}">
                Prefix
              </label>
              <input
                type="text"
                name="slugPrefix"
                value="${n(e?.prefix ?? "")}"
                placeholder=""
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Suffix
              </label>
              <input
                type="text"
                name="slugSuffix"
                value="${n(e?.suffix ?? "")}"
                placeholder=""
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Separator
              </label>
              <select
                name="slugSeparator"
                class="${M()}"
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
              <label class="${m()}">
                Format
              </label>
              <select
                name="colorFormat"
                class="${M()}"
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
                  class="${B()}"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Allow transparency (alpha)</span>
              </label>
            </div>
          </div>

          <div>
            <label class="${m()}">
              Color Presets (comma-separated)
            </label>
            <input
              type="text"
              name="colorPresets"
              value="${n(e?.presets?.join(", ") ?? "")}"
              placeholder="#ff0000, #00ff00, #0000ff"
              class="${g()}"
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
              <label class="${m()}">
                Default Latitude
              </label>
              <input
                type="number"
                name="defaultLat"
                value="${e?.defaultCenter?.lat ?? ""}"
                step="any"
                placeholder="40.7128"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Default Longitude
              </label>
              <input
                type="number"
                name="defaultLng"
                value="${e?.defaultCenter?.lng ?? ""}"
                step="any"
                placeholder="-74.0060"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Default Zoom
              </label>
              <input
                type="number"
                name="defaultZoom"
                value="${e?.defaultZoom ?? ""}"
                min="1"
                max="20"
                placeholder="12"
                class="${g()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="searchEnabled"
              ${e?.searchEnabled !== !1 ? "checked" : ""}
              class="${B()}"
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
              <label class="${m()}">
                Min Date
              </label>
              <input
                type="date"
                name="minDate"
                value="${n(e?.minDate ?? "")}"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Max Date
              </label>
              <input
                type="date"
                name="maxDate"
                value="${n(e?.maxDate ?? "")}"
                class="${g()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowSameDay"
              ${e?.allowSameDay !== !1 ? "checked" : ""}
              class="${B()}"
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
              <label class="${m()}">
                Min Items
              </label>
              <input
                type="number"
                name="minItems"
                value="${e?.minItems ?? ""}"
                min="0"
                placeholder="0"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Max Items
              </label>
              <input
                type="number"
                name="maxItems"
                value="${e?.maxItems ?? ""}"
                min="1"
                placeholder="10"
                class="${g()}"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="collapsed"
              ${e?.collapsed ? "checked" : ""}
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
      const e = this.field.config, a = e?.allowedBlocks ? JSON.stringify(e.allowedBlocks) : "[]", r = e?.deniedBlocks ? JSON.stringify(e.deniedBlocks) : "[]";
      t.push(`
        <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Blocks Settings</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${m()}">
                Min Blocks
              </label>
              <input
                type="number"
                name="minBlocks"
                value="${e?.minBlocks ?? ""}"
                min="0"
                placeholder="0"
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Max Blocks
              </label>
              <input
                type="number"
                name="maxBlocks"
                value="${e?.maxBlocks ?? ""}"
                min="1"
                placeholder="No limit"
                class="${g()}"
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
                ${e?.allowedBlocks?.length ? e.allowedBlocks.map((s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-block-chip="${n(s)}">${n(s)}<button type="button" data-remove-allowed="${n(s)}" class="hover:text-blue-900 dark:hover:text-blue-200">&times;</button></span>`).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">All blocks allowed (no restrictions)</span>'}
              </div>
            </div>
            <input type="hidden" name="allowedBlocks" value='${n(a)}' />
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
                ${e?.deniedBlocks?.length ? e.deniedBlocks.map((s) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-block-chip="${n(s)}">${n(s)}<button type="button" data-remove-denied="${n(s)}" class="hover:text-red-900 dark:hover:text-red-200">&times;</button></span>`).join("") : '<span class="text-xs text-gray-400 dark:text-gray-500">No blocks denied</span>'}
              </div>
            </div>
            <input type="hidden" name="deniedBlocks" value='${n(r)}' />
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
    }), this.container.querySelector("[data-field-config-form-element]")?.addEventListener("submit", (a) => {
      a.preventDefault(), this.handleSave();
    });
    const t = this.container.querySelector('input[name="name"]'), e = this.container.querySelector('input[name="label"]');
    t && e && this.isNewField && (e.addEventListener("input", () => {
      t.dataset.userModified || (t.value = Ut(e.value));
    }), t.addEventListener("input", () => {
      t.dataset.userModified = "true";
    })), this.bindOptionsEvents(), this.bindBlockPickerEvents();
  }
  bindOptionsEvents() {
    this.container && (this.container.querySelector("[data-add-option]")?.addEventListener("click", () => {
      const t = this.container?.querySelector("[data-options-list]");
      if (!t) return;
      const e = t.querySelectorAll("[data-option-row]").length, a = document.createElement("div");
      a.className = "flex items-center gap-2", a.setAttribute("data-option-row", String(e)), a.innerHTML = `
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
      `, t.appendChild(a), a.querySelector("[data-remove-option]")?.addEventListener("click", () => {
        a.remove();
      }), a.querySelector(`input[name="option_value_${e}"]`)?.focus();
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
        const a = t.getAttribute("data-remove-allowed");
        a && this.removeBlockFromList("allowed", a);
      });
    }), this.container.querySelectorAll("[data-remove-denied]").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault();
        const a = t.getAttribute("data-remove-denied");
        a && this.removeBlockFromList("denied", a);
      });
    }));
  }
  async showBlockPicker(t) {
    const e = this.container?.querySelector(`input[name="${t}Blocks"]`), a = this.parseBlockListValue(e?.value);
    new Gt({
      apiBasePath: be(this.config.apiBasePath),
      selectedBlocks: a,
      title: t === "allowed" ? "Select Allowed Blocks" : "Select Denied Blocks",
      onSelect: (r) => {
        this.updateBlockList(t, r);
      }
    }).show();
  }
  updateBlockList(t, e) {
    const a = this.container?.querySelector(`input[name="${t}Blocks"]`), r = this.container?.querySelector(`[data-${t}-blocks-chips]`);
    if (!(!a || !r))
      if (a.value = JSON.stringify(e), e.length === 0) r.innerHTML = `<span class="text-xs text-gray-400 dark:text-gray-500">${t === "allowed" ? "All blocks allowed (no restrictions)" : "No blocks denied"}</span>`;
      else {
        const s = t === "allowed" ? "blue" : "red";
        r.innerHTML = e.map((i) => `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${s}-100 text-${s}-700 dark:bg-${s}-900/30 dark:text-${s}-400" data-block-chip="${n(i)}">${n(i)}<button type="button" data-remove-${t}="${n(i)}" class="hover:text-${s}-900 dark:hover:text-${s}-200">&times;</button></span>`).join(""), r.querySelectorAll(`[data-remove-${t}]`).forEach((i) => {
          i.addEventListener("click", (o) => {
            o.preventDefault();
            const l = i.getAttribute(`data-remove-${t}`);
            l && this.removeBlockFromList(t, l);
          });
        });
      }
  }
  removeBlockFromList(t, e) {
    const a = this.container?.querySelector(`input[name="${t}Blocks"]`);
    if (!a) return;
    const r = this.parseBlockListValue(a.value).filter((s) => s !== e);
    this.updateBlockList(t, r);
  }
  parseBlockListValue(t) {
    const e = H(t, []);
    return Array.isArray(e) ? e.map((a) => String(a ?? "").trim()).filter(Boolean) : [];
  }
  handleSave() {
    const t = this.container?.querySelector("[data-field-config-form-element]");
    if (!t) return;
    const e = new FormData(t), a = e.get("name")?.trim();
    if (!a) {
      this.showError("name", "Field name is required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(a)) {
      this.showError("name", "Invalid field name format");
      return;
    }
    const r = this.config.existingFieldNames ?? [];
    if (a !== this.config.field.name && r.includes(a)) {
      this.showError("name", "A field with this name already exists");
      return;
    }
    const s = e.get("label")?.trim();
    if (!s) {
      this.showError("label", "Label is required");
      return;
    }
    const i = {
      id: this.field.id || U(),
      name: a,
      type: this.field.type,
      order: this.field.order,
      label: s,
      description: e.get("description")?.trim() || void 0,
      placeholder: e.get("placeholder")?.trim() || void 0,
      required: e.get("required") === "on",
      readonly: e.get("readonly") === "on",
      hidden: e.get("hidden") === "on",
      filterable: e.get("filterable") === "on",
      section: e.get("section")?.trim() || void 0,
      gridSpan: e.get("gridSpan") ? parseInt(e.get("gridSpan"), 10) : void 0
    }, o = {}, l = e.get("minLength");
    l !== null && l !== "" && (o.minLength = parseInt(l, 10));
    const c = e.get("maxLength");
    c !== null && c !== "" && (o.maxLength = parseInt(c, 10));
    const d = e.get("min");
    d !== null && d !== "" && (o.min = parseFloat(d));
    const h = e.get("max");
    h !== null && h !== "" && (o.max = parseFloat(h));
    const y = e.get("pattern");
    y && y.trim() && (o.pattern = y.trim()), Object.keys(o).length > 0 && (i.validation = o);
    const u = this.buildTypeSpecificConfig(e);
    u && Object.keys(u).length > 0 && (i.config = u), this.config.onSave(i), this.hide();
  }
  buildTypeSpecificConfig(t) {
    switch (this.field.type) {
      case "select":
      case "radio":
      case "chips": {
        const e = [];
        let a = 0;
        for (; t.has(`option_value_${a}`); ) {
          const r = t.get(`option_value_${a}`)?.trim(), s = t.get(`option_label_${a}`)?.trim();
          r && e.push({
            value: r,
            label: s || r
          }), a++;
        }
        return e.length > 0 ? { options: e } : void 0;
      }
      case "reference":
      case "references":
      case "user": {
        const e = t.get("target")?.trim(), a = t.get("displayField")?.trim();
        return e ? {
          target: e,
          displayField: a || void 0
        } : void 0;
      }
      case "media-picker":
      case "media-gallery":
      case "file-upload": {
        const e = t.get("accept")?.trim(), a = t.get("maxSize") ? parseInt(t.get("maxSize"), 10) : void 0, r = t.get("multiple") === "on";
        return {
          accept: e || void 0,
          maxSize: a,
          multiple: this.field.type === "media-gallery" ? r : void 0
        };
      }
      case "code":
        return {
          language: t.get("language")?.trim() || "json",
          lineNumbers: t.get("lineNumbers") === "on"
        };
      case "slug": {
        const e = t.get("sourceField")?.trim(), a = t.get("slugPrefix")?.trim(), r = t.get("slugSuffix")?.trim(), s = t.get("slugSeparator")?.trim() || "-";
        return {
          sourceField: e || void 0,
          prefix: a || void 0,
          suffix: r || void 0,
          separator: s
        };
      }
      case "color": {
        const e = t.get("colorFormat")?.trim() || "hex", a = t.get("allowAlpha") === "on", r = t.get("colorPresets")?.trim();
        return {
          format: e,
          allowAlpha: a,
          presets: r ? r.split(",").map((s) => s.trim()).filter(Boolean) : void 0
        };
      }
      case "location": {
        const e = t.get("defaultLat"), a = t.get("defaultLng"), r = t.get("defaultZoom"), s = { searchEnabled: t.get("searchEnabled") === "on" };
        return e && a && (s.defaultCenter = {
          lat: parseFloat(e),
          lng: parseFloat(a)
        }), r && (s.defaultZoom = parseInt(r, 10)), s;
      }
      case "daterange": {
        const e = t.get("minDate")?.trim(), a = t.get("maxDate")?.trim(), r = t.get("allowSameDay") === "on";
        return {
          minDate: e || void 0,
          maxDate: a || void 0,
          allowSameDay: r
        };
      }
      case "repeater": {
        const e = t.get("minItems"), a = t.get("maxItems"), r = t.get("collapsed") === "on";
        return {
          fields: this.field.config?.fields ?? [],
          minItems: e ? parseInt(e, 10) : void 0,
          maxItems: a ? parseInt(a, 10) : void 0,
          collapsed: r
        };
      }
      case "blocks": {
        const e = t.get("minBlocks"), a = t.get("maxBlocks"), r = t.get("allowedBlocks")?.trim(), s = t.get("deniedBlocks")?.trim(), i = this.field.config;
        let o, l;
        if (r) {
          const c = H(r, null);
          if (Array.isArray(c)) {
            const d = c.map((h) => String(h ?? "").trim()).filter(Boolean);
            o = d.length > 0 ? d : void 0;
          } else
            o = r.split(",").map((d) => d.trim()).filter(Boolean), o.length === 0 && (o = void 0);
        }
        if (s) {
          const c = H(s, null);
          if (Array.isArray(c)) {
            const d = c.map((h) => String(h ?? "").trim()).filter(Boolean);
            l = d.length > 0 ? d : void 0;
          } else
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
          minBlocks: e ? parseInt(e, 10) : void 0,
          maxBlocks: a ? parseInt(a, 10) : void 0,
          allowedBlocks: o,
          deniedBlocks: l
        };
      }
      default:
        return;
    }
  }
  showError(t, e) {
    const a = this.container?.querySelector(`[name="${t}"]`);
    if (!a) return;
    a.classList.add("border-red-500", "focus:ring-red-500"), a.focus(), a.parentElement?.querySelector(".field-error")?.remove();
    const r = document.createElement("p");
    r.className = "field-error text-xs text-red-500 mt-1", r.textContent = e, a.parentElement?.appendChild(r);
    const s = () => {
      a.classList.remove("border-red-500", "focus:ring-red-500"), r.remove(), a.removeEventListener("input", s);
    };
    a.addEventListener("input", s);
  }
};
function Ut(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[0-9]/, "_$&");
}
var Gt = class extends T {
  constructor(t) {
    super({
      size: "lg",
      maxHeight: "max-h-[70vh]"
    }), this.availableBlocks = [], this.config = t, this.api = new R({ basePath: t.apiBasePath }), this.selectedBlocks = new Set(t.selectedBlocks);
  }
  async onAfterShow() {
    await this.loadBlocks();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${n(this.config.title)}</h3>
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
    const t = this.container?.querySelector("[data-blocks-loading]"), e = this.container?.querySelector("[data-blocks-list]"), a = this.container?.querySelector("[data-blocks-empty]");
    try {
      this.availableBlocks = await je(this.api), this.selectedBlocks = Z(this.selectedBlocks, this.availableBlocks), t?.classList.add("hidden"), this.availableBlocks.length === 0 ? a?.classList.remove("hidden") : (e?.classList.remove("hidden"), this.renderBlocksList());
    } catch {
      t?.classList.add("hidden"), a?.classList.remove("hidden");
      const r = a?.querySelector("span") || a;
      r && (r.textContent = "Failed to load block definitions");
    }
  }
  renderBlocksList() {
    const t = this.container?.querySelector("[data-blocks-list]");
    t && (t.innerHTML = this.availableBlocks.map((e) => {
      const a = ce(e), r = this.selectedBlocks.has(a) || this.selectedBlocks.has(e.type);
      return `
          <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${r ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
            <input
              type="checkbox"
              value="${n(a)}"
              data-block-type="${n(e.type)}"
              ${r ? "checked" : ""}
              class="${B()}"
            />
            <div class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium">
              ${e.icon || a.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${n(e.name)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${n(a)}</div>
            </div>
            ${e.schema_version ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${n(e.schema_version)}</span>` : ""}
          </label>
        `;
    }).join(""), t.querySelectorAll('input[type="checkbox"]').forEach((e) => {
      e.addEventListener("change", () => {
        const a = e.value, r = e.dataset.blockType;
        e.checked ? (this.selectedBlocks.add(a), r && r !== a && this.selectedBlocks.delete(r)) : (this.selectedBlocks.delete(a), r && this.selectedBlocks.delete(r)), this.updateSelectionCount(), this.renderBlocksList();
      });
    }), this.updateSelectionCount());
  }
  updateSelectionCount() {
    const t = this.container?.querySelector("[data-selection-count]");
    t && (t.textContent = `${this.selectedBlocks.size} selected`);
  }
}, Kt = class extends T {
  constructor(t) {
    super({
      size: "3xl",
      backdropDataAttr: "data-layout-editor-backdrop"
    }), this.dragState = null, this.config = t, this.layout = Ve(t.layout ?? {
      type: "flat",
      gridColumns: 12
    }), this.layout.tabs || (this.layout.tabs = []);
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
    if (this.layout.type !== "tabs" && this.layout.type !== "sections") return "";
    const t = this.layout.tabs ?? [], e = this.layout.type === "tabs" ? "Tab" : "Section";
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">${e}s</h3>
          <button
            type="button"
            data-add-tab
            class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add ${e}
          </button>
        </div>

        <div data-tabs-list class="space-y-2">
          ${t.length === 0 ? `
            <div class="text-sm text-gray-500 dark:text-gray-400 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              No ${e.toLowerCase()}s defined. Fields without a section will appear in a default "${e.toLowerCase()}".
            </div>
          ` : t.map((a, r) => this.renderTabRow(a, r)).join("")}
        </div>
      </div>
    `;
  }
  renderTabRow(t, e) {
    return `
      <div
        class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900"
        data-tab-row="${t.id}"
        data-tab-index="${e}"
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
            data-tab-id="${t.id}"
            name="tab_id_${e}"
            value="${n(t.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${e}"
            value="${n(t.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          ${ye(t.icon ?? "", `name="tab_icon_${e}"`)}
        </div>

        <button
          type="button"
          data-remove-tab="${t.id}"
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
    if (this.layout.type !== "tabs" && this.layout.type !== "sections") return "";
    const t = this.layout.tabs ?? [], e = this.layout.type === "tabs" ? "tab" : "section", a = /* @__PURE__ */ new Map();
    a.set("", []);
    for (const r of t) a.set(r.id, []);
    for (const r of this.config.fields) {
      const s = r.section ?? "";
      a.has(s) || a.set(s, []), a.get(s).push(r);
    }
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Field Assignment</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Fields are assigned to ${e}s via the "Section/Tab" setting in each field's configuration.
        </p>

        <div class="grid grid-cols-2 gap-4">
          ${Array.from(a.entries()).map(([r, s]) => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${r || "(Unassigned)"}
              </div>
              <div class="space-y-1">
                ${s.length === 0 ? '<div class="text-xs text-gray-400">No fields</div>' : s.map((i) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${n(i.label)} <span class="font-mono">(${n(i.name)})</span></div>`).join("")}
              </div>
            </div>
          `).join("")}
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
    }), this.container.querySelectorAll("[data-layout-type]").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.getAttribute("data-layout-type");
        this.layout.type = e, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (t) => {
      const e = t.target.value;
      this.layout.gridColumns = parseInt(e, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  bindTabEvents() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-remove-tab]").forEach((e) => {
      e.addEventListener("click", () => {
        const a = e.getAttribute("data-remove-tab");
        a && this.removeTab(a);
      });
    }), this.container.querySelectorAll('input[name^="tab_id_"]').forEach((e) => {
      e.addEventListener("input", () => {
        this.updateTabsFromForm();
      });
    }), fe(this.container, "[data-icon-trigger]", (e) => {
      const a = e.querySelector('input[name^="tab_icon_"]');
      return {
        value: a?.value ?? "",
        onSelect: (r) => {
          a && (a.value = r);
        },
        onClear: () => {
          a && (a.value = "");
        }
      };
    });
    const t = this.container.querySelector("[data-tabs-list]");
    t && (t.addEventListener("dragstart", (e) => {
      const a = e.target.closest("[data-tab-row]");
      a && (this.dragState = {
        tabId: a.getAttribute("data-tab-row") ?? "",
        startIndex: parseInt(a.getAttribute("data-tab-index") ?? "0", 10)
      }, a.classList.add("opacity-50"));
    }), t.addEventListener("dragover", (e) => {
      e.preventDefault();
    }), t.addEventListener("drop", (e) => {
      if (e.preventDefault(), !this.dragState) return;
      const a = e.target.closest("[data-tab-row]");
      if (!a) return;
      const r = parseInt(a.getAttribute("data-tab-index") ?? "0", 10);
      this.moveTab(this.dragState.tabId, r), this.dragState = null;
    }), t.addEventListener("dragend", () => {
      t.querySelectorAll(".opacity-50").forEach((e) => e.classList.remove("opacity-50")), this.dragState = null;
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
  removeTab(t) {
    this.layout.tabs && (this.layout.tabs = this.layout.tabs.filter((e) => e.id !== t), this.updateView());
  }
  moveTab(t, e) {
    if (!this.layout.tabs) return;
    const a = this.layout.tabs.findIndex((s) => s.id === t);
    if (a === -1 || a === e) return;
    const r = this.layout.tabs.splice(a, 1)[0];
    this.layout.tabs.splice(e, 0, r), this.layout.tabs.forEach((s, i) => {
      s.order = i;
    }), this.updateView();
  }
  updateTabsFromForm() {
    !this.container || !this.layout.tabs || this.layout.tabs.forEach((t, e) => {
      const a = this.container.querySelector(`input[name="tab_id_${e}"]`), r = this.container.querySelector(`input[name="tab_label_${e}"]`), s = this.container.querySelector(`input[name="tab_icon_${e}"]`);
      a && (t.id = a.value.trim()), r && (t.label = r.value.trim()), s && (t.icon = s.value.trim() || void 0);
    });
  }
  updateView() {
    if (!this.container) return;
    P();
    const t = this.container.querySelector(".overflow-y-auto");
    t && (t.innerHTML = `
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      `, this.container.querySelectorAll("[data-layout-type]").forEach((e) => {
      e.addEventListener("click", () => {
        const a = e.getAttribute("data-layout-type");
        this.layout.type = a, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (e) => {
      const a = e.target.value;
      this.layout.gridColumns = parseInt(a, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  handleSave() {
    if (this.updateTabsFromForm(), this.layout.tabs && this.layout.tabs.length > 0) {
      const t = /* @__PURE__ */ new Set();
      for (const e of this.layout.tabs) {
        if (!e.id.trim()) {
          this.showLayoutError("All tabs must have an ID");
          return;
        }
        if (t.has(e.id)) {
          this.showLayoutError(`Duplicate tab ID: ${e.id}`);
          return;
        }
        t.add(e.id);
      }
    }
    this.config.onSave(this.layout), this.hide();
  }
  showLayoutError(t) {
    const e = this.container?.querySelector("[data-layout-error]");
    if (!e) return;
    e.classList.remove("hidden");
    const a = e.querySelector("p");
    a && (a.textContent = t), setTimeout(() => e.classList.add("hidden"), 5e3);
  }
}, Jt = {
  text: "text",
  media: "media",
  choice: "selection",
  number: "number",
  datetime: "datetime",
  relationship: "reference",
  structure: "structural",
  advanced: "advanced"
}, Wt = {
  text: "cat-text",
  media: "cat-media",
  choice: "cat-selection",
  number: "cat-number",
  datetime: "cat-datetime",
  relationship: "cat-reference",
  structure: "cat-structural",
  advanced: "cat-advanced"
};
function Qt(t) {
  return Jt[(t ?? "").trim().toLowerCase()] ?? "advanced";
}
function Yt(t, e) {
  const a = (t ?? "").trim();
  if (a) return a;
  const r = (e ?? "").trim();
  return r ? F(r) : "Advanced";
}
function Zt(t) {
  return G(Wt[(t ?? "").trim().toLowerCase()] ?? "cat-advanced");
}
function Xt(t) {
  const e = t.defaults;
  if (!(!e || typeof e != "object"))
    return e;
}
function ea(t, e) {
  const a = (t.type ?? "text").trim().toLowerCase(), r = a === "text" ? "textarea" : L(a), s = {
    type: r,
    label: (t.label ?? "").trim() || F(t.type ?? r),
    description: (t.description ?? "").trim(),
    icon: G(t.icon ?? "") || G(r) || "",
    category: e,
    defaultConfig: Xt(t)
  };
  return (t.type ?? "").toLowerCase() === "hidden" && (s.defaultConfig = {
    ...s.defaultConfig ?? {},
    hidden: !0
  }), s;
}
function at(t) {
  const e = [], a = [];
  for (const r of t) {
    const s = r.category ?? {}, i = (s.id ?? "").trim().toLowerCase(), o = Qt(i);
    e.push({
      id: o,
      label: Yt(s.label, i),
      icon: Zt(i),
      collapsed: s.collapsed
    });
    const l = Array.isArray(r.field_types) ? r.field_types : [];
    for (const c of l) a.push(ea(c, o));
  }
  return {
    categories: e,
    fieldTypes: a
  };
}
var ta = at([
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
    field_types: [{
      type: "image",
      label: "Image",
      description: "Image asset",
      category: "media",
      icon: "media-picker",
      defaults: { config: { accept: "image/*" } },
      order: 10
    }, {
      type: "file",
      label: "File",
      description: "File attachment",
      category: "media",
      icon: "file-upload",
      order: 20
    }]
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
function aa() {
  const t = /* @__PURE__ */ new Map();
  for (const e of pe) t.set(e.type, e);
  for (const e of ta.fieldTypes) t.has(e.type) || t.set(e.type, e);
  return {
    categories: Ke.map((e) => ({
      id: e.id,
      label: e.label,
      icon: e.icon
    })),
    fieldTypes: Array.from(t.values())
  };
}
var se = aa();
async function ra(t) {
  try {
    const e = await t.getBlockFieldTypeGroups();
    if (e && e.length > 0) {
      const a = at(e);
      return {
        categories: a.categories,
        fieldTypes: a.fieldTypes
      };
    }
  } catch {
  }
  try {
    const e = await t.getFieldTypes();
    if (e && e.length > 0) return {
      categories: [...se.categories],
      fieldTypes: e
    };
  } catch {
  }
  return {
    categories: [...se.categories],
    fieldTypes: [...se.fieldTypes]
  };
}
var sa = /* @__PURE__ */ new Set(["advanced"]), ue = "application/x-field-palette-type", Te = "application/x-field-palette-meta", Be = class {
  constructor(t) {
    this.fieldTypes = [], this.fieldTypeByKey = /* @__PURE__ */ new Map(), this.fieldTypeKeyByRef = /* @__PURE__ */ new Map(), this.categoryOrder = [], this.searchQuery = "", this.categoryStates = /* @__PURE__ */ new Map(), this.isLoading = !0, this.enabled = !1, this.config = t, this.categoryOrder = [...se.categories];
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
    const t = await ra(this.config.api);
    this.fieldTypes = t.fieldTypes, this.categoryOrder = t.categories, this.initCategoryStates(), this.buildFieldTypeKeyMap();
  }
  initCategoryStates() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.categoryOrder) t.add(e.id);
    for (const e of t) this.categoryStates.has(e) || this.categoryStates.set(e, { collapsed: sa.has(e) });
    for (const e of this.categoryOrder) {
      const a = this.categoryStates.get(e.id) ?? { collapsed: !1 };
      e.collapsed !== void 0 && (a.collapsed = e.collapsed), this.categoryStates.set(e.id, a);
    }
  }
  buildFieldTypeKeyMap() {
    this.fieldTypeByKey.clear(), this.fieldTypeKeyByRef.clear(), this.fieldTypes.forEach((t, e) => {
      const a = `${t.type}:${e}`;
      this.fieldTypeByKey.set(a, t), this.fieldTypeKeyByRef.set(t, a);
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
               value="${n(this.searchQuery)}"
               class="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-700 transition-colors" />
      </div>`, t.appendChild(e);
    const a = document.createElement("div");
    a.className = "overflow-y-auto flex-1 min-h-0", a.setAttribute("data-palette-list", ""), this.searchQuery ? a.innerHTML = this.renderSearchResults() : a.innerHTML = this.renderCategoryGroups(), t.appendChild(a), this.bindEvents(t);
  }
  renderCategoryGroups() {
    let t = "";
    for (const e of this.categoryOrder) {
      const a = this.fieldTypes.filter((s) => s.category === e.id);
      if (a.length === 0) continue;
      const r = this.categoryStates.get(e.id)?.collapsed ?? !1;
      t += `
        <div data-palette-category="${n(e.id)}" class="border-b border-gray-50 dark:border-gray-800">
          <button type="button" data-palette-toggle="${n(e.id)}"
                  class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3 h-3 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-palette-chevron="${n(e.id)}">
              ${r ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 dark:text-gray-500">${e.icon}</span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex-1">${n(e.label)}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">${a.length}</span>
          </button>
          <div class="${r ? "hidden" : ""}" data-palette-category-body="${n(e.id)}">
            <div class="px-2 pb-2 space-y-0.5">
              ${a.map((s) => this.renderPaletteItem(s)).join("")}
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
    const t = this.searchQuery.toLowerCase(), e = this.fieldTypes.filter((a) => a.label.toLowerCase().includes(t) || (a.description ?? "").toLowerCase().includes(t) || a.type.toLowerCase().includes(t));
    return e.length === 0 ? `
        <div class="px-4 py-8 text-center">
          <svg class="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-gray-400 dark:text-gray-500">No fields match "${n(this.searchQuery)}"</p>
        </div>` : `
      <div class="px-2 py-2 space-y-0.5">
        ${e.map((a) => this.renderPaletteItem(a)).join("")}
      </div>`;
  }
  renderPaletteItem(t) {
    return `
      <div data-palette-item="${n(this.fieldTypeKeyByRef.get(t) ?? t.type)}"
           draggable="true"
           class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-blue-50 dark:hover:bg-blue-900/20 active:cursor-grabbing transition-colors group select-none"
           title="${n(t.description)}">
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
          <span class="block text-[12px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">${n(t.label)}</span>
        </span>
      </div>`;
  }
  bindEvents(t) {
    const e = t.querySelector("[data-palette-search]");
    e?.addEventListener("input", () => {
      this.searchQuery = e.value;
      const r = t.querySelector("[data-palette-list]");
      r && (r.innerHTML = this.searchQuery ? this.renderSearchResults() : this.renderCategoryGroups(), this.bindListEvents(r));
    });
    const a = t.querySelector("[data-palette-list]");
    a && this.bindListEvents(a);
  }
  bindListEvents(t) {
    t.querySelectorAll("[data-palette-toggle]").forEach((e) => {
      e.addEventListener("click", () => {
        const a = e.dataset.paletteToggle, r = this.categoryStates.get(a) ?? { collapsed: !1 };
        r.collapsed = !r.collapsed, this.categoryStates.set(a, r);
        const s = t.querySelector(`[data-palette-category-body="${a}"]`), i = t.querySelector(`[data-palette-chevron="${a}"]`);
        s && s.classList.toggle("hidden", r.collapsed), i && (i.innerHTML = r.collapsed ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      });
    }), t.querySelectorAll("[data-palette-item]").forEach((e) => {
      e.addEventListener("click", (a) => {
        if (a.detail === 0) return;
        const r = e.dataset.paletteItem, s = this.fieldTypeByKey.get(r) ?? this.fieldTypes.find((i) => i.type === r);
        s && this.config.onAddField(s);
      });
    }), t.querySelectorAll("[data-palette-item]").forEach((e) => {
      e.addEventListener("dragstart", (a) => {
        const r = e.dataset.paletteItem;
        a.dataTransfer.effectAllowed = "copy";
        const s = this.fieldTypeByKey.get(r) ?? this.fieldTypes.find((i) => i.type === r);
        s ? (a.dataTransfer.setData(ue, s.type), a.dataTransfer.setData(Te, JSON.stringify(s))) : a.dataTransfer.setData(ue, r), a.dataTransfer.setData("text/plain", s?.type ?? r), e.classList.add("opacity-50");
      }), e.addEventListener("dragend", () => {
        e.classList.remove("opacity-50");
      });
    });
  }
};
function rt(t, e) {
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
      return `<span data-save-state class="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-md"${e ? ` title="${n(e)}"` : ""}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Save failed
      </span>`;
    default:
      return "";
  }
}
function st(t) {
  const { name: e, subtitle: a, subtitleMono: r = !1, status: s, version: i, saveState: o = "idle", saveMessage: l, actions: c, compact: d = !1 } = t, h = d ? "px-5" : "px-6", y = d ? "h2" : "h1", u = d ? "text-lg" : "text-xl", f = d ? "gap-2.5" : "gap-3", p = rt(o, l), b = s ? O(d ? s : s.charAt(0).toUpperCase() + s.slice(1), "status", s, d ? {
    uppercase: !0,
    attrs: { "data-entity-status-badge": "" }
  } : { attrs: { "data-entity-status-badge": "" } }) : "", k = i ? `<span class="text-xs text-gray-400 dark:text-gray-500">v${n(i)}</span>` : "", w = a ? `<p class="${r ? "text-[11px] font-mono text-gray-400 dark:text-gray-500" : "text-sm text-gray-500 dark:text-gray-400"} mt-0.5 truncate">${n(a)}</p>` : "";
  return d ? `
      <div class="${h} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div class="min-w-0 flex-1">
          <${y} class="${u} font-semibold text-gray-900 dark:text-white truncate leading-snug" data-entity-name>${n(e)}</${y}>
          ${w}
        </div>
        <div class="flex items-center ${f} shrink-0">
          <span data-entity-save-indicator>${p}</span>
          ${b}
          ${c || ""}
        </div>
      </div>` : `
    <div class="${h} py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
      <div>
        <div class="flex items-center gap-3">
          <${y} class="${u} font-semibold text-gray-900 dark:text-white" data-entity-name>${n(e)}</${y}>
          ${b}
          ${k}
        </div>
        ${w}
      </div>
      <div class="flex items-center ${f}">
        <span data-entity-save-indicator>${p}</span>
        ${c || ""}
      </div>
    </div>`;
}
var ia = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>', oa = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>', na = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>', la = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>', da = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
function it(t) {
  const { field: e, isExpanded: a = !1, isSelected: r = !1, isDropTarget: s = !1, hasErrors: i = !1, errorMessages: o = [], showReorderButtons: l = !1, isFirst: c = !1, isLast: d = !1, compact: h = !1, renderExpandedContent: y, actionsHtml: u = "", constraintBadges: f = [], sectionName: p, index: b } = t, k = ge(e.type), w = typeof y == "function";
  let A;
  i ? A = "border-red-400 bg-red-50 dark:bg-red-900/10" : a ? A = "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20" : r ? A = "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : A = "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600";
  const dt = s ? "border-t-2 border-t-blue-400" : "", ct = h ? "gap-1.5 px-2 py-2" : "gap-3 p-3", ht = h ? "w-7 h-7 rounded-md" : "w-8 h-8 rounded-lg", ut = h ? "text-[13px]" : "text-sm", pt = h ? "text-[10px]" : "text-xs", gt = h ? "xs" : "sm", yt = i ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400", ft = i ? da : k?.icon ?? "?", ae = [];
  e.required && ae.push(O("req", "status", "required", {
    size: "sm",
    uppercase: !0,
    extraClass: "flex-shrink-0"
  })), e.readonly && ae.push(O("ro", "status", "readonly", {
    size: "sm",
    uppercase: !0,
    extraClass: "flex-shrink-0"
  })), e.hidden && ae.push(O("hid", "status", "hidden", {
    size: "sm",
    uppercase: !0,
    extraClass: "flex-shrink-0"
  }));
  const bt = ae.join(`
          `);
  let me = `data-field-card="${n(e.id)}"`;
  p != null && (me += ` data-field-section="${n(p)}"`), b != null && (me += ` data-field-index="${b}"`);
  let ve;
  if (h) ve = `${n(e.name)} &middot; ${n(e.type)}`;
  else {
    const I = k?.label ?? e.type, N = [
      `<span class="font-mono">${n(e.name)}</span>`,
      "<span>&middot;</span>",
      `<span>${n(I)}</span>`
    ];
    e.section && N.push(`<span>&middot; ${n(e.section)}</span>`), e.gridSpan && N.push(`<span>&middot; ${e.gridSpan} cols</span>`), ve = N.join(" ");
  }
  let Fe = "";
  f.length > 0 && (Fe = `
            <div class="flex items-center gap-1 mt-1">
              ${f.map((I) => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${n(I)}</span>`).join("")}
            </div>`);
  let Pe = "";
  i && o.length > 0 && (Pe = `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${o.map((I) => n(I)).join(", ")}
            </div>`);
  let Ae = "";
  if (l) {
    const I = c, N = d, mt = I ? "text-gray-200 dark:text-gray-700 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800", vt = N ? "text-gray-200 dark:text-gray-700 cursor-not-allowed" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";
    Ae = `
          <span class="flex-shrink-0 inline-flex flex-col border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button type="button" data-field-move-up="${n(e.id)}"
                    class="px-0.5 py-px ${mt} transition-colors"
                    title="Move up" ${I ? "disabled" : ""}>
              ${ia}
            </button>
            <span class="block h-px bg-gray-200 dark:bg-gray-700"></span>
            <button type="button" data-field-move-down="${n(e.id)}"
                    class="px-0.5 py-px ${vt} transition-colors"
                    title="Move down" ${N ? "disabled" : ""}>
              ${oa}
            </button>
          </span>`;
  }
  let Ie = "";
  return w && (Ie = `
          <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors">
            ${a ? la : na}
          </span>`), `
      <div ${me}
           draggable="true"
           class="rounded-lg border ${dt} ${A} transition-colors">
        <div class="flex items-center ${ct} select-none" ${w ? `data-field-toggle="${n(e.id)}"` : ""}>
          <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 cursor-grab active:cursor-grabbing" data-field-grip="${n(e.id)}">
            ${It(gt)}
          </span>
          <span class="flex-shrink-0 ${ht} flex items-center justify-center ${yt} text-[11px]">
            ${ft}
          </span>
          <span class="flex-1 min-w-0 ${w ? "cursor-pointer" : ""}">
            <span class="block ${ut} font-medium text-gray-800 dark:text-gray-100 truncate">${n(e.label || e.name)}</span>
            <span class="block ${pt} text-gray-400 dark:text-gray-500 ${h ? "font-mono" : ""} truncate">${ve}</span>${Fe}${Pe}
          </span>
          ${bt}
          ${Ae}
          ${u}
          ${Ie}
        </div>
        ${a && w ? y() : ""}
      </div>`;
}
var ca = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>';
function ha(t) {
  return `<button type="button" data-field-actions="${n(t)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              ${ca}
            </button>`;
}
function Le(t = {}) {
  const { highlight: e = !1, text: a = "Drop a field here or click a field type in the palette" } = t;
  return `
      <div data-field-drop-zone
           class="mx-3 my-2 py-6 border-2 border-dashed rounded-lg text-center transition-colors ${e ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}">
        <p class="text-xs text-gray-400 dark:text-gray-500">${n(a)}</p>
      </div>`;
}
var S = "main", ua = class {
  constructor(t, e) {
    this.dragState = null, this.dropIndicator = null, this.dragOverRAF = null, this.staticEventsBound = !1, this.previewDebounceTimer = null, this.palettePanel = null, this.paletteVisible = !1, this.sectionStates = /* @__PURE__ */ new Map(), this.lifecycleOutsideClickHandler = null, this.cachedBlocks = null, this.blocksLoading = !1, this.blockPickerModes = /* @__PURE__ */ new Map(), this.fieldActionsMenuId = null, this.container = t, this.config = e, this.api = new R({ basePath: e.apiBasePath });
    const a = this.normalizeChannel(e.channel);
    a && this.api.setChannel(a), this.state = {
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
      layout: {
        type: "flat",
        gridColumns: 12,
        tabs: []
      },
      originalSchema: null,
      initialFieldsSignature: ""
    };
  }
  normalizeChannel(t) {
    return String(t ?? "").trim().toLowerCase();
  }
  async init() {
    this.render(), this.bindEvents(), this.config.contentTypeId && await this.loadContentType(this.config.contentTypeId);
  }
  async loadContentType(t) {
    this.state.isLoading = !0, this.updateLoadingState();
    try {
      const e = await this.api.get(t);
      this.state.contentType = e, this.state.fields = le(e.schema), this.state.originalSchema = e.schema ?? null, this.state.initialFieldsSignature = this.serializeFields(this.state.fields), e.ui_schema?.layout && (this.state.layout = {
        type: e.ui_schema.layout.type ?? "flat",
        tabs: e.ui_schema.layout.tabs ?? [],
        gridColumns: e.ui_schema.layout.gridColumns ?? 12
      }), this.state.isDirty = !1, this.render(), this.bindEvents(), this.schedulePreview();
    } catch (e) {
      console.error("Failed to load content type:", e), this.showToast("Failed to load content type", "error");
    } finally {
      this.state.isLoading = !1, this.updateLoadingState();
    }
  }
  async save() {
    if (this.state.isSaving) return;
    const t = this.container.querySelector("[data-ct-name]"), e = t?.value?.trim();
    if (!e) {
      this.showToast("Name is required", "error"), t?.focus();
      return;
    }
    const a = this.buildSchemaPayload(), r = {
      name: e,
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
      this.state.contentType?.id ? s = await this.api.update(this.state.contentType.id, r) : s = await this.api.create(r), this.state.contentType = s, this.state.originalSchema = s.schema ?? null, this.state.initialFieldsSignature = this.serializeFields(this.state.fields), this.state.isDirty = !1, this.showToast("Content type saved successfully", "success"), this.config.onSave?.(s);
    } catch (s) {
      console.error("Failed to save content type:", s);
      const i = s instanceof Error ? s.message : "Failed to save content type";
      this.showToast(i, "error");
    } finally {
      this.state.isSaving = !1, this.updateSavingState();
    }
  }
  buildSchemaPayload() {
    const t = ne(this.state.fields, this.getSlug());
    return !this.schemaHasChanges() && this.state.originalSchema ? this.state.originalSchema : jt(this.state.originalSchema, t);
  }
  schemaHasChanges() {
    return this.state.initialFieldsSignature ? this.serializeFields(this.state.fields) !== this.state.initialFieldsSignature : !0;
  }
  serializeFields(t) {
    const e = t.map((a) => ({
      name: a.name,
      type: a.type,
      label: a.label,
      description: a.description,
      placeholder: a.placeholder,
      helpText: a.helpText,
      required: a.required,
      readonly: a.readonly,
      hidden: a.hidden,
      filterable: a.filterable,
      defaultValue: a.defaultValue,
      section: a.section,
      gridSpan: a.gridSpan,
      order: a.order,
      validation: a.validation,
      config: a.config
    }));
    return JSON.stringify(e);
  }
  addField(t) {
    const e = ge(t);
    if (t === "blocks") {
      const a = new Set(this.state.fields.map((l) => l.name));
      let r = "content_blocks", s = "Content Blocks", i = 1;
      for (; a.has(r); )
        r = `content_blocks_${i}`, s = `Content Blocks ${i}`, i++;
      const o = {
        id: U(),
        name: r,
        type: t,
        label: s,
        required: !1,
        order: this.state.fields.length,
        ...e?.defaultConfig ?? {}
      };
      this.state.fields.push(o), this.state.selectedFieldId = o.id, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview(), this.loadBlocksForField(o);
      return;
    }
    new he({
      field: {
        id: U(),
        name: `new_${t}_${this.state.fields.length + 1}`,
        type: t,
        label: e?.label ?? t,
        required: !1,
        order: this.state.fields.length,
        ...e?.defaultConfig ?? {}
      },
      existingFieldNames: this.state.fields.map((a) => a.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (a) => {
        this.state.fields.push(a), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
      },
      onCancel: () => {
      }
    }).show();
  }
  editField(t) {
    const e = this.state.fields.find((a) => a.id === t);
    e && new he({
      field: e,
      existingFieldNames: this.state.fields.filter((a) => a.id !== t).map((a) => a.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (a) => {
        const r = this.state.fields.findIndex((s) => s.id === t);
        r !== -1 && (this.state.fields[r] = a, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
      },
      onCancel: () => {
      }
    }).show();
  }
  async removeField(t) {
    const e = this.state.fields.findIndex((r) => r.id === t);
    if (e === -1) return;
    const a = this.state.fields[e];
    await Y.confirm(`Remove field "${a.label}"?`, {
      title: "Remove Field",
      confirmText: "Remove",
      confirmVariant: "danger"
    }) && (this.state.fields.splice(e, 1), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
  }
  moveField(t, e, a) {
    const r = this.state.fields.findIndex((f) => f.id === t);
    if (r === -1) return;
    const s = this.state.fields[r], i = s.section || S, o = e || S, l = this.groupFieldsBySection(), c = l.get(i);
    if (!c) return;
    const d = c.findIndex((f) => f.id === t);
    if (d === -1) return;
    c.splice(d, 1), c.length === 0 && l.delete(i), l.has(o) || l.set(o, []);
    const h = l.get(o);
    let y = Math.max(0, Math.min(a, h.length));
    i === o && d < y && (y -= 1), h.splice(y, 0, s), s.section = o === S ? void 0 : o;
    const u = /* @__PURE__ */ new Map();
    l.has(S) && u.set(S, l.get(S));
    for (const [f, p] of l)
      f !== S && u.set(f, p);
    this.state.fields = Array.from(u.values()).flat(), this.state.fields.forEach((f, p) => {
      f.order = p;
    }), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  moveFieldByDirection(t, e) {
    const a = this.state.fields.find((d) => d.id === t);
    if (!a) return;
    const r = a.section || S, s = this.state.fields.filter((d) => (d.section || S) === r), i = s.findIndex((d) => d.id === t), o = i + e;
    if (o < 0 || o >= s.length) return;
    const l = this.state.fields.indexOf(s[i]), c = this.state.fields.indexOf(s[o]);
    [this.state.fields[l], this.state.fields[c]] = [this.state.fields[c], this.state.fields[l]], this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  async validateSchema() {
    const t = this.buildSchemaPayload();
    try {
      const e = await this.api.validateSchema({
        schema: t,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      e.valid ? (this.state.validationErrors = [], this.showToast("Schema is valid", "success")) : (this.state.validationErrors = e.errors ?? [], this.showToast("Schema has validation errors", "error"));
    } catch (e) {
      console.error("Validation failed:", e);
      const a = e instanceof Error ? e.message : "Validation failed";
      this.showToast(a, "error");
    }
    this.renderValidationErrors();
  }
  async previewSchema() {
    if (this.state.isPreviewing) return;
    if (this.state.fields.length === 0) {
      this.state.previewHtml = null, this.state.previewError = null;
      const e = this.container.querySelector("[data-ct-preview-container]");
      e && (e.innerHTML = `
          <div class="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <p class="text-sm">Add fields to preview the form</p>
          </div>
        `);
      return;
    }
    const t = ne(this.state.fields, this.getSlug());
    this.state.isPreviewing = !0, this.updatePreviewState();
    try {
      const e = await this.api.previewSchema({
        schema: t,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      this.state.previewHtml = e.html, this.state.previewError = null, this.renderPreview();
    } catch (e) {
      console.error("Preview failed:", e);
      const a = e instanceof Error ? e.message : "Preview failed";
      this.state.previewHtml = null, this.state.previewError = a, this.renderPreview();
    } finally {
      this.state.isPreviewing = !1, this.updatePreviewState();
    }
  }
  render() {
    P(), this.palettePanel = null, this.container.innerHTML = `
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
    const t = this.state.contentType;
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Basic Information</h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="${m()}">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${n(t?.name ?? "")}"
              placeholder="Blog Post"
              required
              class="${g()}"
            />
          </div>

          <div>
            <label class="${m()}">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${n(t?.slug ?? "")}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="${g()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="${m()}">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="${Ee()}"
          >${n(t?.description ?? "")}</textarea>
        </div>

        <div class="mt-4">
          <label class="${m()}">
            Icon
          </label>
          ${ye(t?.icon ?? "", "data-ct-icon")}
        </div>
      </div>
    `;
  }
  renderFieldsSection() {
    const t = this.state.layout.type ?? "flat", e = t === "tabs" ? "Tabs" : t === "sections" ? "Sections" : "Flat";
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
              Layout: ${e}
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
  renderFieldCard(t, e, a) {
    const r = L(t.type) === "blocks", s = r && this.state.selectedFieldId === t.id, i = this.state.validationErrors.filter((u) => u.path.includes(`/${t.name}`) || u.path.includes(`properties.${t.name}`)), o = i.length > 0, l = [];
    t.validation?.minLength !== void 0 && l.push(`min: ${t.validation.minLength}`), t.validation?.maxLength !== void 0 && l.push(`max: ${t.validation.maxLength}`), t.validation?.min !== void 0 && l.push(`>= ${t.validation.min}`), t.validation?.max !== void 0 && l.push(`<= ${t.validation.max}`), t.validation?.pattern && l.push("pattern");
    const c = a ?? this.state.fields, d = c.indexOf(t), h = this.fieldActionsMenuId === t.id, y = `
          <div class="relative flex-shrink-0">
            ${ha(t.id)}
            ${h ? this.renderFieldActionsMenu(t) : ""}
          </div>`;
    return it({
      field: t,
      sectionName: t.section || S,
      isSelected: this.state.selectedFieldId === t.id,
      isExpanded: s,
      hasErrors: o,
      errorMessages: i.map((u) => u.message),
      constraintBadges: l,
      index: e,
      actionsHtml: y,
      showReorderButtons: !0,
      isFirst: d === 0,
      isLast: d === c.length - 1,
      compact: !1,
      renderExpandedContent: r ? () => this.renderBlocksInlineContent(t) : void 0
    });
  }
  renderFieldActionsMenu(t) {
    const e = "w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2";
    return `
      <div data-ct-field-actions-menu class="absolute right-0 top-full mt-1 z-30 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <button type="button" data-field-action-edit="${n(t.id)}" class="${e}">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </button>
        <button type="button" data-field-action-remove="${n(t.id)}" class="${e} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Remove
        </button>
      </div>`;
  }
  renderBlocksInlineContent(t) {
    const e = t.config ?? {}, a = this.getBlocksPickerMode(t.id) === "allowed", r = new Set(a ? e.allowedBlocks ?? [] : e.deniedBlocks ?? []), s = "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded", i = a ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", o = a ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300", l = a ? "Allowed Blocks" : "Denied Blocks", c = a ? "blue" : "red", d = a ? "All blocks allowed (no restrictions)" : "No blocks denied";
    let h;
    if (this.cachedBlocks) {
      const y = Z(r, this.cachedBlocks);
      h = X({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: y,
        onSelectionChange: () => {
        },
        label: l,
        accent: c,
        emptySelectionText: d
      });
    } else h = `
        <div class="flex items-center justify-center py-6" data-ct-blocks-loading="${n(t.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${n(t.id)}">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-ct-blocks-mode-toggle="${n(t.id)}" data-ct-blocks-mode="allowed"
                    class="${s} ${i}">
              Allowed
            </button>
            <button type="button" data-ct-blocks-mode-toggle="${n(t.id)}" data-ct-blocks-mode="denied"
                    class="${s} ${o}">
              Denied
            </button>
          </div>
          <button type="button" data-ct-blocks-open-library="${n(t.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-ct-blocks-picker-container="${n(t.id)}">
          ${h}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-ct-blocks-advanced="${n(t.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>
      </div>`;
  }
  renderCapabilitiesSection() {
    const t = this.state.contentType?.capabilities ?? {}, e = typeof t.navigation == "object" && t.navigation !== null ? t.navigation : {}, a = e.enabled === !0, r = Array.isArray(e.eligible_locations) ? e.eligible_locations.map((d) => String(d).trim()).filter(Boolean).join(", ") : "", s = Array.isArray(e.default_locations) ? e.default_locations.map((d) => String(d).trim()).filter(Boolean).join(", ") : "", i = e.allow_instance_override !== !1, o = e.default_visible !== !1, l = String(e.merge_mode ?? "append").trim().toLowerCase(), c = [
      "append",
      "prepend",
      "replace"
    ].includes(l) ? l : "append";
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Capabilities</h2>

        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="versioning"
              ${t.versioning ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Versioning</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="scheduling"
              ${t.scheduling ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Scheduling</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="seo"
              ${t.seo ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">SEO Fields</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="localization"
              ${t.localization ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Localization</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="blocks"
              ${t.blocks ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Block Editor</span>
          </label>
        </div>

        <div class="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Navigation Settings</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Configure eligible/default locations and per-entry override policy.</p>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                data-ct-navigation-enabled
                ${a ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              Enabled
            </label>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600 dark:text-gray-300">
              Eligible Locations (csv)
              <input
                type="text"
                data-ct-navigation-eligible
                value="${n(r)}"
                placeholder="site.main, site.footer"
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
              />
            </label>
            <label class="text-xs text-gray-600 dark:text-gray-300">
              Default Locations (csv)
              <input
                type="text"
                data-ct-navigation-defaults
                value="${n(s)}"
                placeholder="site.main"
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
              />
            </label>
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                data-ct-navigation-allow-override
                ${i ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              Allow instance override
            </label>
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                data-ct-navigation-default-visible
                ${o ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              Default visible
            </label>
            <label class="text-xs text-gray-600 dark:text-gray-300 md:col-span-2">
              Merge Mode
              <select
                data-ct-navigation-merge-mode
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
              >
                <option value="append" ${c === "append" ? "selected" : ""}>append</option>
                <option value="prepend" ${c === "prepend" ? "selected" : ""}>prepend</option>
                <option value="replace" ${c === "replace" ? "selected" : ""}>replace</option>
              </select>
            </label>
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">Task 13.8: defaults must remain a subset of eligible locations.</p>
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
  renderHeader() {
    const t = this.state.contentType;
    return st({
      name: t ? "Edit Content Type" : "Create Content Type",
      subtitle: t ? `Editing: ${t.name}` : "Define fields and configure your content type",
      status: t?.status,
      version: t?.schema_version,
      actions: this.renderHeaderActions()
    });
  }
  renderHeaderActions() {
    const t = this.state.contentType, e = "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700";
    return `
      ${this.state.validationErrors.length > 0 ? `
        <span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          ${this.state.validationErrors.length} error${this.state.validationErrors.length > 1 ? "s" : ""}
        </span>
      ` : ""}
      ${t ? this.renderLifecycleActions(t) : ""}
      <button type="button" data-ct-validate class="${e}">Validate</button>
      <button type="button" data-ct-preview class="${e}">Preview</button>
      <button type="button" data-ct-cancel class="${e}">Cancel</button>
      <button type="button" data-ct-save class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
        ${t ? "Save Changes" : "Create Content Type"}
      </button>
    `;
  }
  renderLifecycleActions(t) {
    const e = (t.status ?? "").toLowerCase();
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
            ${e === "" || e === "draft" ? `
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
            ` : e === "active" || e === "published" ? `
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
  async publishContentType() {
    if (!this.state.contentType?.id) return;
    const t = this.buildSchemaPayload();
    let e = null, a = null;
    try {
      e = await this.api.checkCompatibility(this.state.contentType.id, t, this.buildUISchema());
    } catch (r) {
      a = r instanceof Error ? r.message : "Compatibility check failed";
    }
    new pa({
      contentType: this.state.contentType,
      compatibilityResult: e,
      compatibilityError: a ?? void 0,
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
  async deprecateContentType() {
    if (this.state.contentType?.id && await Y.confirm(`Are you sure you want to deprecate "${this.state.contentType.name}"? Deprecated content types can still be used but are hidden from new content creation.`, {
      title: "Deprecate Content Type",
      confirmText: "Deprecate",
      confirmVariant: "danger"
    }))
      try {
        const t = await this.api.deprecate(this.state.contentType.id);
        this.state.contentType = t, this.render(), this.bindEvents(), this.showToast("Content type deprecated successfully", "success"), this.config.onSave?.(t);
      } catch (t) {
        const e = t instanceof Error ? t.message : "Failed to deprecate content type";
        this.showToast(e, "error");
      }
  }
  async cloneContentType() {
    this.state.contentType?.id && new ga({
      contentType: this.state.contentType,
      onConfirm: async (t, e) => {
        try {
          const a = await this.api.clone(this.state.contentType.id, t, e);
          this.showToast(`Content type cloned as "${a.name}"`, "success"), this.config.onSave && this.config.onSave(a);
        } catch (a) {
          const r = a instanceof Error ? a.message : "Failed to clone content type";
          this.showToast(r, "error");
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  showVersionHistory() {
    this.state.contentType?.id && new ya({
      apiBasePath: this.config.apiBasePath,
      contentType: this.state.contentType
    }).show();
  }
  bindEvents() {
    this.staticEventsBound || (this.bindStaticEvents(), this.staticEventsBound = !0), this.bindDynamicEvents();
  }
  bindStaticEvents() {
    this.container.addEventListener("click", (t) => {
      const e = t.target, a = e.closest("[data-field-actions]");
      if (a) {
        t.stopPropagation();
        const u = a.dataset.fieldActions;
        this.fieldActionsMenuId = this.fieldActionsMenuId === u ? null : u, this.renderFieldList();
        return;
      }
      const r = e.closest("[data-field-action-edit]");
      if (r) {
        const u = r.dataset.fieldActionEdit;
        this.fieldActionsMenuId = null, this.editField(u);
        return;
      }
      const s = e.closest("[data-field-action-remove]");
      if (s) {
        const u = s.dataset.fieldActionRemove;
        this.fieldActionsMenuId = null, this.removeField(u);
        return;
      }
      const i = e.closest("[data-field-move-up]");
      if (i && !i.hasAttribute("disabled")) {
        t.stopPropagation();
        const u = i.dataset.fieldMoveUp;
        this.moveFieldByDirection(u, -1);
        return;
      }
      const o = e.closest("[data-field-move-down]");
      if (o && !o.hasAttribute("disabled")) {
        t.stopPropagation();
        const u = o.dataset.fieldMoveDown;
        this.moveFieldByDirection(u, 1);
        return;
      }
      const l = e.closest("[data-ct-blocks-mode-toggle]");
      if (l) {
        const u = l.dataset.ctBlocksModeToggle, f = l.dataset.ctBlocksMode ?? "allowed";
        this.blockPickerModes.set(u, f), this.renderFieldList();
        const p = this.state.fields.find((b) => b.id === u);
        p && L(p.type) === "blocks" && this.loadBlocksForField(p);
        return;
      }
      if (e.closest("[data-ct-blocks-open-library]")) {
        const u = this.api.getBasePath();
        window.location.href = `${u}/content/block-library`;
        return;
      }
      const c = e.closest("[data-ct-blocks-advanced]");
      if (c) {
        const u = c.dataset.ctBlocksAdvanced;
        u && this.editField(u);
        return;
      }
      const d = e.closest("[data-ct-blocks-retry]");
      if (d) {
        const u = d.dataset.ctBlocksRetry, f = this.state.fields.find((p) => p.id === u);
        f && (this.cachedBlocks = null, this.loadBlocksForField(f));
        return;
      }
      const h = e.closest("[data-field-toggle]");
      if (h && !e.closest("button")) {
        const u = h.dataset.fieldToggle;
        if (this.state.selectedFieldId = this.state.selectedFieldId === u ? null : u, this.renderFieldList(), this.state.selectedFieldId) {
          const f = this.state.fields.find((p) => p.id === this.state.selectedFieldId);
          f && L(f.type) === "blocks" && this.loadBlocksForField(f);
        }
        return;
      }
      const y = e.closest("[data-field-card]");
      if (y && !e.closest("button") && !e.closest("[data-field-props]")) {
        const u = y.getAttribute("data-field-card");
        u && (this.state.selectedFieldId = this.state.selectedFieldId === u ? null : u, this.renderFieldList());
      }
      this.fieldActionsMenuId && !e.closest("[data-field-actions]") && !e.closest("[data-ct-field-actions-menu]") && (this.fieldActionsMenuId = null, this.renderFieldList());
    }), this.container.addEventListener("input", (t) => {
      const e = t.target;
      if ((e.matches("[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]") || e.matches("[data-ct-cap]")) && (this.state.isDirty = !0, this.updateDirtyState()), e.matches("[data-ct-name]")) {
        const a = e, r = this.container.querySelector("[data-ct-slug]");
        r && !r.dataset.userModified && !this.state.contentType?.slug && (r.value = we(a.value)), this.schedulePreview();
        return;
      }
      if (e.matches("[data-ct-slug]")) {
        const a = e;
        a.dataset.userModified = "true", this.schedulePreview();
        return;
      }
    });
  }
  bindDynamicEvents() {
    this.container.querySelector("[data-ct-save]")?.addEventListener("click", () => this.save()), this.container.querySelector("[data-ct-validate]")?.addEventListener("click", () => this.validateSchema()), this.container.querySelector("[data-ct-preview]")?.addEventListener("click", () => this.previewSchema()), this.container.querySelector("[data-ct-cancel]")?.addEventListener("click", () => this.config.onCancel?.()), this.bindLifecycleMenuEvents(), this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-toggle-palette]")?.addEventListener("click", () => this.togglePalette()), this.initPaletteIfNeeded(), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.container.querySelector("[data-ct-refresh-preview]")?.addEventListener("click", () => this.previewSchema()), fe(this.container, "[data-icon-trigger]", (t) => {
      const e = t.querySelector("[data-ct-icon]");
      return {
        value: e?.value ?? "",
        onSelect: (a) => {
          e && (e.value = a, this.state.isDirty = !0, this.updateDirtyState());
        },
        onClear: () => {
          e && (e.value = "", this.state.isDirty = !0, this.updateDirtyState());
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
    const t = this.container.querySelector("[data-ct-field-list]");
    t && (t.addEventListener("dragstart", (e) => {
      const a = e, r = a.target.closest("[data-field-card]");
      if (!r) return;
      const s = r.getAttribute("data-field-card"), i = parseInt(r.getAttribute("data-field-index") ?? "0", 10), o = r.getAttribute("data-field-section") ?? S;
      this.dragState = {
        fieldId: s ?? "",
        startSection: o,
        currentSection: o,
        startIndex: i,
        currentIndex: i
      }, r.classList.add("opacity-50"), a.dataTransfer?.setData("text/plain", s ?? ""), a.dataTransfer && (a.dataTransfer.effectAllowed = "move");
    }), t.addEventListener("dragenter", (e) => {
      e.preventDefault();
    }), t.addEventListener("dragover", (e) => {
      e.preventDefault();
      const a = e;
      if (!this.dragState) return;
      const r = a.clientY, s = a.target;
      this.dragOverRAF || (this.dragOverRAF = requestAnimationFrame(() => {
        if (this.dragOverRAF = null, !this.dragState) return;
        const i = s.closest("[data-field-card]");
        if (!i || i.getAttribute("data-field-card") === this.dragState.fieldId) return;
        const o = i.getBoundingClientRect(), l = r < o.top + o.height / 2, c = this.getOrCreateDropIndicator(), d = l ? i : i.nextSibling;
        (c.nextSibling !== d || c.parentNode !== i.parentElement) && i.parentElement?.insertBefore(c, d);
        const h = parseInt(i.getAttribute("data-field-index") ?? "0", 10), y = i.getAttribute("data-field-section") ?? S;
        this.dragState.currentSection = y, this.dragState.currentIndex = l ? h : h + 1;
      }));
    }), t.addEventListener("dragleave", (e) => {
      const a = e.relatedTarget;
      (!a || !t.contains(a)) && this.removeDropIndicator();
    }), t.addEventListener("drop", (e) => {
      if (e.preventDefault(), this.removeDropIndicator(), !this.dragState) return;
      const { fieldId: a, startIndex: r, currentIndex: s, startSection: i, currentSection: o } = this.dragState;
      (r !== s || i !== o) && this.moveField(a, o, s), this.dragState = null;
    }), t.addEventListener("dragend", () => {
      t.querySelectorAll(".opacity-50").forEach((e) => e.classList.remove("opacity-50")), this.removeDropIndicator(), this.dragOverRAF && (cancelAnimationFrame(this.dragOverRAF), this.dragOverRAF = null), this.dragState = null;
    }));
  }
  bindFieldDropZoneEvents(t) {
    t.querySelectorAll("[data-field-drop-zone]").forEach((e) => {
      e.addEventListener("dragover", (a) => {
        a.preventDefault(), a.dataTransfer.dropEffect = "copy", e.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), e.classList.add("border-blue-400", "bg-blue-50/50");
      }), e.addEventListener("dragleave", (a) => {
        e.contains(a.relatedTarget) || (e.classList.remove("border-blue-400", "bg-blue-50/50"), e.classList.add("border-gray-200", "hover:border-gray-300"));
      }), e.addEventListener("drop", (a) => {
        a.preventDefault(), e.classList.remove("border-blue-400", "bg-blue-50/50"), e.classList.add("border-gray-200", "hover:border-gray-300");
        const r = a.dataTransfer?.getData(Te);
        if (r) {
          const i = H(r, null);
          if (i?.type) {
            this.addField(i.type);
            return;
          }
        }
        const s = a.dataTransfer?.getData(ue);
        s && this.addField(s);
      });
    });
  }
  bindLifecycleMenuEvents() {
    const t = this.container.querySelector("[data-ct-lifecycle-menu]");
    if (!t) {
      this.lifecycleOutsideClickHandler && (document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = null);
      return;
    }
    const e = t.querySelector("[data-ct-lifecycle-trigger]"), a = t.querySelector("[data-ct-lifecycle-dropdown]");
    e && a && (e.addEventListener("click", (r) => {
      r.stopPropagation(), a.classList.toggle("hidden");
    }), this.lifecycleOutsideClickHandler && document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = (r) => {
      t.contains(r.target) || a.classList.add("hidden");
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
    const t = this.container.querySelector("[data-ct-palette]");
    t && t.classList.toggle("hidden", !this.paletteVisible);
    const e = this.container.querySelector("[data-ct-toggle-palette]");
    e && e.setAttribute("aria-expanded", String(this.paletteVisible)), this.initPaletteIfNeeded();
  }
  initPaletteIfNeeded() {
    if (!this.paletteVisible || this.palettePanel) return;
    const t = this.container.querySelector("[data-ct-palette-container]");
    t && (this.palettePanel = new Be({
      container: t,
      api: this.api,
      onAddField: (e) => this.addField(e.type)
    }), this.palettePanel.init(), this.palettePanel.enable());
  }
  showFieldTypePicker() {
    new Je({
      onSelect: (t) => this.addField(t),
      onCancel: () => {
      }
    }).show();
  }
  showLayoutEditor() {
    new Kt({
      layout: this.state.layout,
      fields: this.state.fields,
      onSave: (t) => {
        this.state.layout = t, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
        const e = this.container.querySelector("[data-ct-field-list]")?.closest(".rounded-lg");
        if (e) {
          const a = document.createElement("div");
          a.innerHTML = this.renderFieldsSection(), e.replaceWith(a.firstElementChild), this.bindFieldsEvents();
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
    this.container.querySelectorAll("[data-ct-toggle-section]").forEach((t) => {
      const e = t.getAttribute("data-ct-toggle-section");
      e && t.addEventListener("click", () => this.toggleSection(e));
    });
  }
  getSlug() {
    const t = this.container.querySelector("[data-ct-slug]"), e = this.container.querySelector("[data-ct-name]"), a = t?.value?.trim();
    return a || we(e?.value ?? "");
  }
  getDescription() {
    const t = this.container.querySelector("[data-ct-description]");
    if (t)
      return t.value.trim();
  }
  getIcon() {
    const t = this.container.querySelector("[data-ct-icon]");
    if (t)
      return t.value.trim();
  }
  getCapabilities() {
    const t = this.state.contentType?.capabilities, e = t && typeof t == "object" ? { ...t } : {};
    this.container.querySelectorAll("[data-ct-cap]").forEach((d) => {
      const h = d.getAttribute("data-ct-cap");
      h && (e[h] = d.checked);
    });
    const a = (d) => d.split(",").map((h) => h.trim()).filter(Boolean).filter((h, y, u) => u.indexOf(h) === y).sort(), r = this.container.querySelector("[data-ct-navigation-enabled]"), s = this.container.querySelector("[data-ct-navigation-eligible]"), i = this.container.querySelector("[data-ct-navigation-defaults]"), o = this.container.querySelector("[data-ct-navigation-allow-override]"), l = this.container.querySelector("[data-ct-navigation-default-visible]"), c = this.container.querySelector("[data-ct-navigation-merge-mode]");
    if (r) {
      const d = a(s?.value ?? ""), h = a(i?.value ?? ""), y = new Set(d), u = h.filter((f) => !y.has(f));
      u.length > 0 && this.showToast(`Navigation defaults must be a subset of eligible locations. Invalid: ${u.join(", ")}`, "error"), e.navigation = {
        enabled: r.checked,
        eligible_locations: d,
        default_locations: h.filter((f) => y.has(f)),
        allow_instance_override: o ? o.checked : !0,
        default_visible: l ? l.checked : !0,
        merge_mode: c?.value || "append"
      };
    }
    return e;
  }
  buildUISchema() {
    const t = {}, e = {
      type: this.state.layout.type ?? "flat",
      gridColumns: this.state.layout.gridColumns ?? 12
    };
    if (e.type === "tabs" || e.type === "sections") {
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
          label: ie(s.section),
          order: r.size
        });
      }), r.size > 0 && (e.tabs = Array.from(r.values()).sort((s, i) => s.order - i.order));
    }
    t.layout = e;
    const a = [];
    if (this.state.fields.forEach((r) => {
      const s = { path: `#/properties/${r.name}` }, i = {};
      r.section && (i.section = r.section), r.gridSpan && (i.grid = { span: r.gridSpan }), r.order !== void 0 && (i.order = r.order), r.readonly && (i.readonly = !0), r.hidden && (i.hidden = !0), Object.keys(i).length > 0 && (s["x-formgen"] = i, a.push(s));
    }), a.length > 0 && (t.overrides = a), !(e.type === "flat" && !e.tabs?.length && a.length === 0 || !t.layout && !t.overrides))
      return t;
  }
  updateLoadingState() {
    const t = this.container.querySelector("[data-ct-save]");
    t && (t.disabled = this.state.isLoading);
  }
  updateSavingState() {
    const t = this.container.querySelector("[data-ct-save]");
    t && (t.disabled = this.state.isSaving, t.textContent = this.state.isSaving ? "Saving..." : this.state.contentType ? "Save Changes" : "Create Content Type");
  }
  updatePreviewState() {
    const t = this.container.querySelector("[data-ct-preview]");
    t && (t.disabled = this.state.isPreviewing, t.textContent = this.state.isPreviewing ? "Loading..." : "Preview");
  }
  updateDirtyState() {
    const t = this.container.querySelector("[data-ct-save]");
    if (t) {
      let a = t.querySelector("[data-dirty-dot]");
      this.state.isDirty ? a || (a = document.createElement("span"), a.setAttribute("data-dirty-dot", ""), a.className = "inline-block w-2 h-2 rounded-full bg-orange-400 ml-1.5 align-middle", a.setAttribute("title", "Unsaved changes"), t.appendChild(a)) : a?.remove();
    }
    const e = this.container.querySelector("[data-content-type-editor] h1");
    if (e) {
      let a = e.parentElement?.querySelector("[data-dirty-badge]");
      this.state.isDirty ? a || (a = document.createElement("span"), a.setAttribute("data-dirty-badge", ""), a.className = "px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", a.textContent = "Modified", e.parentElement?.appendChild(a)) : a?.remove();
    }
  }
  renderFieldList() {
    const t = this.container.querySelector("[data-ct-field-list]");
    if (t) {
      t.innerHTML = this.renderFieldListContent(), this.bindSectionToggleEvents(), this.bindDragEvents(), this.bindFieldDropZoneEvents(t);
      const e = this.state.fields.find((a) => a.id === this.state.selectedFieldId);
      e && L(e.type) === "blocks" && this.cachedBlocks && this.renderInlineBlockPickerForField(e);
    }
  }
  renderFieldListContent() {
    if (this.state.fields.length === 0) return `
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
    const t = this.groupFieldsBySection(), e = Array.from(t.keys());
    if (e.length <= 1) {
      const r = this.state.fields;
      return `
        <div class="space-y-2">
          ${r.map((s, i) => this.renderFieldCard(s, i, r)).join("")}
        </div>
        ${Le({ highlight: !1 })}
      `;
    }
    let a = "";
    for (const r of e) {
      const s = t.get(r), i = this.getSectionState(r).collapsed;
      a += `
        <div data-ct-section="${n(r)}" class="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <button type="button" data-ct-toggle-section="${n(r)}"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            <span class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
              ${i ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${n(ie(r))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${s.length}</span>
          </button>

          <div class="${i ? "hidden" : ""}" data-ct-section-body="${n(r)}">
            <div class="space-y-2 px-1 pb-2">
              ${s.map((o, l) => this.renderFieldCard(o, l, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return a += Le({ highlight: !1 }), a;
  }
  groupFieldsBySection() {
    const t = /* @__PURE__ */ new Map();
    for (const e of this.state.fields) {
      const a = e.section || S;
      t.has(a) || t.set(a, []), t.get(a).push(e);
    }
    if (t.has(S)) {
      const e = t.get(S);
      t.delete(S);
      const a = /* @__PURE__ */ new Map();
      a.set(S, e);
      for (const [r, s] of t) a.set(r, s);
      return a;
    }
    return t;
  }
  getSectionState(t) {
    return this.sectionStates.has(t) || this.sectionStates.set(t, { collapsed: !1 }), this.sectionStates.get(t);
  }
  toggleSection(t) {
    const e = this.getSectionState(t);
    e.collapsed = !e.collapsed;
    const a = this.container.querySelector(`[data-ct-section-body="${t}"]`);
    a && a.classList.toggle("hidden", e.collapsed);
    const r = this.container.querySelector(`[data-ct-toggle-section="${t}"]`)?.querySelector("span:first-child");
    r && (r.innerHTML = e.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
  }
  getBlocksPickerMode(t) {
    return this.blockPickerModes.get(t) ?? "allowed";
  }
  async loadBlocksForField(t) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(t);
      return;
    }
    if (!this.blocksLoading) {
      this.blocksLoading = !0;
      try {
        this.cachedBlocks = await je(this.api), this.state.selectedFieldId === t.id && this.renderInlineBlockPickerForField(t);
      } catch (e) {
        const a = e instanceof Error ? e.message : "Failed to load block definitions";
        this.renderInlineBlockPickerError(t.id, a), this.showToast(`Failed to load block definitions: ${a}`, "error");
      } finally {
        this.blocksLoading = !1;
      }
    }
  }
  renderInlineBlockPickerError(t, e) {
    const a = this.container.querySelector(`[data-ct-blocks-picker-container="${t}"]`);
    a && (a.innerHTML = `
      <div class="rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20">
        <div class="flex items-start gap-2">
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-red-700 dark:text-red-300">${n(e)}</p>
        </div>
        <button type="button" data-ct-blocks-retry="${n(t)}"
                class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Retry
        </button>
      </div>
    `);
  }
  renderInlineBlockPickerForField(t) {
    const e = this.container.querySelector(`[data-ct-blocks-picker-container="${t.id}"]`);
    if (!e || !this.cachedBlocks) return;
    const a = t.config ?? {}, r = this.getBlocksPickerMode(t.id), s = r === "allowed", i = Z(new Set(s ? a.allowedBlocks ?? [] : a.deniedBlocks ?? []), this.cachedBlocks), o = s ? "Allowed Blocks" : "Denied Blocks", l = s ? "blue" : "red", c = s ? "All blocks allowed (no restrictions)" : "No blocks denied";
    e.innerHTML = X({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      onSelectionChange: (d) => this.applyBlockSelection(t, r, d),
      label: o,
      accent: l,
      emptySelectionText: c
    }), Xe(e, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      onSelectionChange: (d) => this.applyBlockSelection(t, r, d),
      label: o,
      accent: l,
      emptySelectionText: c
    });
  }
  applyBlockSelection(t, e, a) {
    t.config || (t.config = {});
    const r = t.config;
    e === "allowed" ? a.size > 0 ? r.allowedBlocks = Array.from(a) : delete r.allowedBlocks : a.size > 0 ? r.deniedBlocks = Array.from(a) : delete r.deniedBlocks, Object.keys(t.config).length === 0 && (t.config = void 0), this.state.isDirty = !0, this.updateDirtyState(), this.schedulePreview();
  }
  renderPreview() {
    const t = this.container.querySelector("[data-ct-preview-container]");
    t && (this.state.previewError ? t.innerHTML = `
        <div class="flex flex-col items-center justify-center h-40 text-red-400">
          <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-sm font-medium">Preview failed</p>
          <p class="text-xs text-red-300 mt-1 max-w-xs text-center">${this.state.previewError}</p>
        </div>
      ` : this.state.previewHtml && (t.innerHTML = this.state.previewHtml, this.initPreviewEditors()));
  }
  initPreviewEditors() {
    const t = window.FormgenBehaviors;
    typeof t?.initJSONEditors == "function" && t.initJSONEditors();
    const e = window.FormgenRelationships?.autoInitWysiwyg ?? t?.autoInitWysiwyg;
    typeof e == "function" && e();
  }
  renderValidationErrors() {
    const t = this.container.querySelector("[data-ct-validation-errors]");
    if (!t) return;
    if (this.state.validationErrors.length === 0) {
      t.classList.add("hidden"), t.innerHTML = "", this.renderFieldList();
      return;
    }
    const e = /* @__PURE__ */ new Map(), a = [];
    for (const r of this.state.validationErrors) {
      const s = r.path.match(/properties[./](\w+)/);
      if (s) {
        const i = s[1];
        e.has(i) || e.set(i, []), e.get(i).push(r);
      } else a.push(r);
    }
    t.classList.remove("hidden"), t.innerHTML = `
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
                ${a.map((r) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${n(r.message)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${Array.from(e.entries()).map(([r, s]) => `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${n(this.state.fields.find((i) => i.name === r)?.label ?? r)} <span class="font-mono">(${n(r)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${s.map((i) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${n(i.message)}</li>`).join("")}
                </ul>
              </div>
            `).join("")}
        </div>
      </div>
    `, t.querySelector("[data-close-validation-errors]")?.addEventListener("click", () => {
      t.classList.add("hidden");
    }), this.renderFieldList();
  }
  showToast(t, e) {
    const a = window.notify?.[e];
    if (typeof a == "function") {
      a(t);
      return;
    }
    e === "error" ? console.error(t) : console.log(t);
  }
  schedulePreview(t = 400) {
    this.previewDebounceTimer && clearTimeout(this.previewDebounceTimer), this.previewDebounceTimer = setTimeout(() => {
      this.previewDebounceTimer = null, this.previewSchema();
    }, t);
  }
}, pa = class extends T {
  constructor(t) {
    super({
      size: "lg",
      flexColumn: !1
    }), this.config = t;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: t, compatibilityResult: e, compatibilityError: a } = this.config, r = !!a, s = (e?.breaking_changes?.length ?? 0) > 0, i = (e?.warnings?.length ?? 0) > 0, o = e?.affected_entries_count ?? 0, l = r || s, c = r ? "bg-gray-400 cursor-not-allowed" : s ? "bg-red-600 hover:bg-red-700 disabled:opacity-50" : "bg-green-600 hover:bg-green-700";
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${n(t.name)}</strong>.
          ${t.status === "draft" ? "This will make it available for content creation." : "This will create a new version of the schema."}
        </p>

        ${r ? `
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
            ${a ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${n(a)}
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${!r && s ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Breaking Changes Detected</span>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-300 space-y-1 ml-7">
              ${e.breaking_changes.map((d) => `
                <li>• ${n(d.description || `${d.type}: ${d.path}`)}</li>
              `).join("")}
            </ul>
            ${o > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${o} content ${o === 1 ? "entry" : "entries"} will require migration.
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${!r && i ? `
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
            </div>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-7">
              ${e.warnings.map((d) => `
                <li>• ${n(d.description || `${d.type}: ${d.path}`)}</li>
              `).join("")}
            </ul>
          </div>
        ` : ""}

        ${!r && !s && !i ? `
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

        ${!r && s ? `
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
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${c}"
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
    const t = this.container?.querySelector("[data-publish-confirm]"), e = this.container?.querySelector("[data-publish-force]"), a = !!this.config.compatibilityError;
    e?.addEventListener("change", () => {
      t && !a && (t.disabled = !e.checked);
    }), t?.addEventListener("click", () => {
      if (a) return;
      const r = e?.checked ?? !1;
      this.config.onConfirm(r), this.hide();
    });
  }
}, ga = class extends T {
  constructor(t) {
    super({
      size: "md",
      initialFocus: "[data-clone-slug]"
    }), this.config = t;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: t } = this.config, e = `${t.slug}-copy`, a = `${t.name} (Copy)`;
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Clone Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create a copy of <strong class="text-gray-900 dark:text-white">${n(t.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="${m()}">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${n(e)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="${g()}"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
          <div data-clone-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        </div>

        <div>
          <label class="${m()}">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${n(a)}"
            placeholder="My Content Type"
            class="${g()}"
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
      const t = this.container?.querySelector("[data-clone-slug]"), e = this.container?.querySelector("[data-clone-name]"), a = t?.value?.trim(), r = e?.value?.trim(), s = this.container?.querySelector("[data-clone-error]"), i = (o) => {
        s && (s.textContent = o, s.classList.remove("hidden"));
      };
      if (!a) {
        i("Slug is required"), t?.focus();
        return;
      }
      if (!/^[a-z][a-z0-9_\-]*$/.test(a)) {
        i("Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter."), t?.focus();
        return;
      }
      this.config.onConfirm(a, r || void 0), this.hide();
    }), this.container?.addEventListener("keydown", (t) => {
      t.key === "Enter" && (t.preventDefault(), this.container?.querySelector("[data-clone-confirm]")?.click());
    });
  }
}, ya = class extends T {
  constructor(t) {
    super({
      size: "2xl",
      maxHeight: "max-h-[80vh]"
    }), this.versions = [], this.expandedVersions = /* @__PURE__ */ new Set(), this.config = t, this.api = new R({ basePath: t.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${n(this.config.contentType.name)} (${n(this.config.contentType.slug)})</p>
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
      this.versions = (await this.api.getVersionHistory(this.config.contentType.id)).versions, this.renderVersionsList();
    } catch {
      this.renderVersionsList();
    }
  }
  renderVersionsList() {
    const t = this.container?.querySelector("[data-versions-list]");
    if (t) {
      if (this.versions.length === 0) {
        t.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No version history available.</p>
          <p class="text-xs mt-2">Current version: ${n(this.config.contentType.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      t.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((e, a) => this.renderVersionCard(e, a === 0)).join("")}
      </div>
    `, t.querySelectorAll("[data-toggle-version]").forEach((e) => {
        e.addEventListener("click", () => {
          const a = e.getAttribute("data-toggle-version");
          a && (this.expandedVersions.has(a) ? this.expandedVersions.delete(a) : this.expandedVersions.add(a), this.renderVersionsList());
        });
      });
    }
  }
  renderVersionCard(t, e) {
    const a = this.expandedVersions.has(t.version), r = (t.changes?.length ?? 0) > 0, s = t.is_breaking || t.changes?.some((i) => i.is_breaking);
    return `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${n(t.version)}</span>
              ${e ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ""}
              ${s ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
              ${this.getMigrationBadge(t.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${Ue(t.created_at)}</span>
            ${r ? `
              <button
                type="button"
                data-toggle-version="${n(t.version)}"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <svg class="w-4 h-4 transition-transform ${a ? "rotate-180" : ""}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            ` : ""}
          </div>
        </div>

        ${t.migration_status && t.total_count ? `
          <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Migration Progress</span>
              <span>${t.migrated_count ?? 0}/${t.total_count}</span>
            </div>
            <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full" style="width: ${(t.migrated_count ?? 0) / t.total_count * 100}%"></div>
            </div>
          </div>
        ` : ""}

        ${a && r ? `
          <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
            <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Changes</h4>
            <ul class="space-y-2">
              ${t.changes.map((i) => this.renderChangeItem(i)).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    `;
  }
  renderChangeItem(t) {
    return `
      <li class="flex items-start gap-2 text-sm">
        <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${{
      added: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      removed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      modified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    }[t.type]}">
          <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${{
      added: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>',
      removed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>',
      modified: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
    }[t.type]}
          </svg>
          ${t.type}
        </span>
        <div class="flex-1">
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${n(t.path)}</span>
          ${t.field ? `<span class="text-gray-500 dark:text-gray-400"> (${n(t.field)})</span>` : ""}
          ${t.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${n(t.description)}</p>` : ""}
          ${t.is_breaking ? '<span class="ml-1 text-xs text-red-500 dark:text-red-400">Breaking</span>' : ""}
        </div>
      </li>
    `;
  }
  getMigrationBadge(t) {
    switch (t) {
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
}, fa = class extends T {
  constructor(t) {
    super({
      size: "4xl",
      backdropDataAttr: "data-block-library-backdrop"
    }), this.categories = [], this.config = t, this.api = new R({ basePath: t.apiBasePath }), this.state = {
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
    const t = this.config.mode !== "picker";
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${t ? "Block Library" : "Select Block Type"}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              ${t ? "Create, edit, and manage reusable block definitions" : "Choose a block type to add"}
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
        ${t ? `
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
    const t = this.container?.querySelector("[data-block-filter]");
    t?.addEventListener("input", () => {
      this.state.filter = t.value, this.renderBlockList();
    });
    const e = this.container?.querySelector("[data-block-category-filter]");
    e?.addEventListener("change", () => {
      this.state.categoryFilter = e.value || null, this.renderBlockList();
    }), this.container?.querySelector("[data-block-create]")?.addEventListener("click", () => {
      this.showBlockEditor(null);
    }), this.container?.querySelector("[data-block-list]")?.addEventListener("click", (a) => {
      const r = a.target, s = r.closest("[data-block-id]");
      if (s && this.config.mode === "picker") {
        const i = s.getAttribute("data-block-id"), o = this.state.blocks.find((l) => l.id === i);
        if (o && this.isBlockAllowed(o)) {
          const l = this.blockKey(o);
          this.config.onSelect?.({
            id: o.id,
            name: o.name,
            slug: o.slug,
            type: l || o.type,
            description: o.description,
            icon: o.icon,
            category: o.category,
            schema_version: o.schema_version,
            status: o.status
          }), this.hide();
        }
        return;
      }
      if (r.closest("[data-block-edit]")) {
        const i = r.closest("[data-block-id]")?.getAttribute("data-block-id"), o = this.state.blocks.find((l) => l.id === i);
        o && this.showBlockEditor(o);
        return;
      }
      if (r.closest("[data-block-delete]")) {
        const i = r.closest("[data-block-id]")?.getAttribute("data-block-id"), o = this.state.blocks.find((l) => l.id === i);
        o && this.confirmDeleteBlock(o);
        return;
      }
      if (r.closest("[data-block-clone]")) {
        const i = r.closest("[data-block-id]")?.getAttribute("data-block-id"), o = this.state.blocks.find((l) => l.id === i);
        o && this.cloneBlock(o);
        return;
      }
      if (r.closest("[data-block-publish]")) {
        const i = r.closest("[data-block-id]")?.getAttribute("data-block-id"), o = this.state.blocks.find((l) => l.id === i);
        o && this.publishBlock(o);
        return;
      }
      if (r.closest("[data-block-versions]")) {
        const i = r.closest("[data-block-id]")?.getAttribute("data-block-id"), o = this.state.blocks.find((l) => l.id === i);
        o && this.showVersionHistory(o);
        return;
      }
    });
  }
  async loadBlocks() {
    this.state.isLoading = !0, this.state.error = null, this.renderBlockList();
    try {
      const t = await this.api.listBlockDefinitions();
      this.state.blocks = t.items;
    } catch (t) {
      this.state.error = t instanceof Error ? t.message : "Failed to load blocks";
    } finally {
      this.state.isLoading = !1, this.refreshCategoriesFromBlocks(), this.renderBlockList();
    }
  }
  async loadCategories() {
    try {
      const t = await this.api.getBlockCategories();
      t.length > 0 && (this.categories = t);
    } catch {
    }
    this.renderCategoryOptions();
  }
  refreshCategoriesFromBlocks() {
    const t = new Set(this.categories);
    for (const e of this.state.blocks) {
      const a = (e.category || "").trim().toLowerCase();
      a && !t.has(a) && (t.add(a), this.categories.push(a));
    }
    this.renderCategoryOptions();
  }
  renderCategoryOptions() {
    const t = this.container?.querySelector("[data-block-category-filter]");
    if (t) {
      t.innerHTML = '<option value="">All Categories</option>';
      for (const e of this.categories) {
        const a = document.createElement("option");
        a.value = e, a.textContent = q(e), t.appendChild(a);
      }
    }
  }
  renderBlockList() {
    const t = this.container?.querySelector("[data-block-list]");
    if (!t) return;
    if (this.state.isLoading) {
      t.innerHTML = `
        <div data-block-loading class="flex items-center justify-center py-12">
          <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      `;
      return;
    }
    const e = this.getFilteredBlocks();
    if (e.length === 0) {
      t.innerHTML = `
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
      `, t.querySelector("[data-block-create-empty]")?.addEventListener("click", () => {
        this.showBlockEditor(null);
      });
      return;
    }
    const a = /* @__PURE__ */ new Map();
    for (const s of e) {
      const i = s.category || "custom";
      a.has(i) || a.set(i, []), a.get(i).push(s);
    }
    let r = "";
    for (const [s, i] of a) r += `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${q(s)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${i.map((o) => this.renderBlockCard(o)).join("")}
          </div>
        </div>
      `;
    t.innerHTML = r;
  }
  renderBlockCard(t) {
    const e = this.config.mode !== "picker", a = this.isBlockAllowed(t), r = St(t.status), s = this.blockKey(t);
    return `
      <div
        data-block-id="${t.id}"
        class="relative p-4 border rounded-lg ${a ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed"} transition-colors"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${t.icon ? te(t.icon) : s.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${n(t.name)}</h4>
              ${r}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${n(s)}</p>
            ${t.description ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${n(t.description)}</p>` : ""}
            ${t.schema_version ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${n(t.schema_version)}</p>` : ""}
          </div>
        </div>

        ${e ? `
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
            ${t.status === "draft" ? `
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
  getFilteredBlocks() {
    let t = [...this.state.blocks];
    if (this.state.filter) {
      const e = this.state.filter.toLowerCase();
      t = t.filter((a) => a.name.toLowerCase().includes(e) || a.type.toLowerCase().includes(e) || (a.slug?.toLowerCase().includes(e) ?? !1) || (a.description?.toLowerCase().includes(e) ?? !1));
    }
    return this.state.categoryFilter && (t = t.filter((e) => e.category === this.state.categoryFilter)), t;
  }
  blockKey(t) {
    return (t.slug || t.type || "").trim();
  }
  blockInList(t, e) {
    if (!t || t.length === 0) return !1;
    const a = this.blockKey(e);
    return !!(a && t.includes(a) || e.slug && t.includes(e.type));
  }
  isBlockAllowed(t) {
    const { allowedBlocks: e, deniedBlocks: a } = this.config;
    return this.blockInList(a, t) ? !1 : e && e.length > 0 ? this.blockInList(e, t) : !0;
  }
  showBlockEditor(t) {
    new ba({
      apiBasePath: this.config.apiBasePath,
      block: t,
      categories: this.categories,
      onSave: async (e) => {
        await this.loadBlocks();
      },
      onCancel: () => {
      }
    }).show();
  }
  async confirmDeleteBlock(t) {
    if (await Y.confirm(`Are you sure you want to delete the block "${t.name}"? This action cannot be undone.`, {
      title: "Delete Block",
      confirmText: "Delete",
      confirmVariant: "danger"
    }))
      try {
        await this.api.deleteBlockDefinition(t.id), await this.loadBlocks();
      } catch (e) {
        this.showError(e instanceof Error ? e.message : "Failed to delete block");
      }
  }
  cloneBlock(t) {
    new Q({
      title: "Clone Block",
      label: "Enter a unique slug for the cloned block",
      placeholder: "e.g. hero_copy",
      initialValue: `${(t.slug || t.type || "block").trim()}_copy`,
      confirmLabel: "Clone",
      inputClass: g(),
      onConfirm: async (e) => {
        const a = e.trim();
        if (a)
          try {
            await this.api.cloneBlockDefinition(t.id, a, a), await this.loadBlocks();
          } catch (r) {
            this.showError(r instanceof Error ? r.message : "Failed to clone block");
          }
      }
    }).show();
  }
  async publishBlock(t) {
    try {
      await this.api.publishBlockDefinition(t.id), await this.loadBlocks();
    } catch (e) {
      this.showError(e instanceof Error ? e.message : "Failed to publish block");
    }
  }
  async showVersionHistory(t) {
    new ma({
      apiBasePath: this.config.apiBasePath,
      block: t
    }).show();
  }
  showError(t) {
    const e = this.container?.querySelector("[data-block-error]");
    if (!e) return;
    e.classList.remove("hidden");
    const a = e.querySelector("p");
    a && (a.textContent = t), setTimeout(() => {
      e.classList.add("hidden");
    }, 5e3);
  }
}, ba = class extends T {
  constructor(t) {
    super({ size: "3xl" }), this.fields = [], this.config = t, this.api = new R({ basePath: t.apiBasePath }), this.isNew = !t.block, t.block?.schema && (this.fields = le(t.block.schema));
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const t = this.config.block;
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
              <label class="${m()}">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value="${n(t?.name ?? "")}"
                placeholder="Hero Section"
                required
                class="${g()}"
              />
            </div>
            <div>
              <label class="${m()}">
                Type <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="type"
                value="${n(t?.type ?? "")}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_\\-]*$"
                required
                ${t ? "readonly" : ""}
                class="${g()} ${t ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed" : ""}"
              />
              <p class="mt-1 text-xs text-gray-500">Unique identifier. Lowercase, numbers, hyphens, underscores.</p>
            </div>
          </div>

          <div>
            <label class="${m()}">
              Description
            </label>
            <textarea
              name="description"
              rows="2"
              placeholder="A description of this block type"
              class="${Ee()}"
            >${n(t?.description ?? "")}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${m()}">
                Category
              </label>
              <select
                name="category"
                class="${M()}"
              >
                ${this.config.categories.map((e) => `<option value="${e}" ${t?.category === e ? "selected" : ""}>${q(e)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="${m()}">
                Icon
              </label>
              ${ye(t?.icon ?? "", 'name="icon"')}
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
      ` : this.fields.map((t, e) => `
        <div class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-field-index="${e}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">${n(t.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${n(t.name)}</span>
              <span class="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${t.type}</span>
              ${t.required ? '<span class="text-xs text-red-500">required</span>' : ""}
            </div>
          </div>
          <button type="button" data-edit-field="${e}" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button type="button" data-remove-field="${e}" class="p-1 text-gray-400 hover:text-red-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `).join("");
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
    }), this.container && fe(this.container, "[data-icon-trigger]", (t) => {
      const e = t.querySelector('[name="icon"]');
      return {
        value: e?.value ?? "",
        onSelect: (a) => {
          e && (e.value = a);
        },
        onClear: () => {
          e && (e.value = "");
        }
      };
    }), this.container?.querySelector("[data-fields-list]")?.addEventListener("click", (t) => {
      const e = t.target, a = e.closest("[data-edit-field]");
      if (a) {
        const s = parseInt(a.getAttribute("data-edit-field") ?? "-1", 10);
        s >= 0 && this.fields[s] && this.showFieldConfigForm(this.fields[s], s);
        return;
      }
      const r = e.closest("[data-remove-field]");
      if (r) {
        const s = parseInt(r.getAttribute("data-remove-field") ?? "-1", 10);
        s >= 0 && (this.fields.splice(s, 1), this.updateFieldsList());
        return;
      }
    });
  }
  showFieldTypePicker() {
    new Je({
      onSelect: (t) => {
        const e = {
          id: U(),
          name: "",
          type: t,
          label: "",
          required: !1
        };
        this.showFieldConfigForm(e, -1);
      },
      onCancel: () => {
      },
      excludeTypes: ["blocks", "repeater"]
    }).show();
  }
  showFieldConfigForm(t, e) {
    new he({
      field: t,
      existingFieldNames: this.fields.filter((a, r) => r !== e).map((a) => a.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (a) => {
        e >= 0 ? this.fields[e] = a : this.fields.push(a), this.updateFieldsList();
      },
      onCancel: () => {
      }
    }).show();
  }
  updateFieldsList() {
    const t = this.container?.querySelector("[data-fields-list]");
    t && (t.innerHTML = this.renderFieldsList());
  }
  async handleSave() {
    const t = this.container?.querySelector("[data-block-form]");
    if (!t) return;
    const e = new FormData(t), a = e.get("name")?.trim(), r = e.get("type")?.trim();
    if (!a || !r) {
      this.showEditorError("Name and Type are required");
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(r)) {
      this.showEditorError("Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.");
      return;
    }
    const s = Ge(this.fields, r), i = e.get("description"), o = e.get("icon"), l = {
      name: a,
      type: r,
      description: typeof i == "string" ? i.trim() : void 0,
      category: e.get("category") || "custom",
      icon: typeof o == "string" ? o.trim() : void 0,
      schema: s,
      status: this.config.block?.status ?? "draft"
    };
    try {
      let c;
      this.isNew ? c = await this.api.createBlockDefinition(l) : c = await this.api.updateBlockDefinition(this.config.block.id, l), this.config.onSave(c), this.hide();
    } catch (c) {
      this.showEditorError(c instanceof Error ? c.message : "Failed to save block");
    }
  }
  showEditorError(t) {
    const e = this.container?.querySelector("[data-editor-error]");
    if (!e) return;
    e.classList.remove("hidden");
    const a = e.querySelector("p");
    a && (a.textContent = t), setTimeout(() => e.classList.add("hidden"), 5e3);
  }
}, ma = class extends T {
  constructor(t) {
    super({
      size: "2xl",
      maxHeight: "max-h-[80vh]"
    }), this.versions = [], this.config = t, this.api = new R({ basePath: t.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${n(this.config.block.name)} (${n(this.config.block.slug || this.config.block.type)})</p>
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
      this.versions = (await this.api.getBlockDefinitionVersions(this.config.block.id)).versions, this.renderVersionsList();
    } catch {
      this.renderVersionsList();
    }
  }
  renderVersionsList() {
    const t = this.container?.querySelector("[data-versions-list]");
    if (t) {
      if (this.versions.length === 0) {
        t.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No version history available.</p>
          <p class="text-xs mt-2">Current version: ${n(this.config.block.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      t.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((e) => `
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${n(e.version)}</span>
                ${e.is_breaking ? O("Breaking", "status", "breaking") : ""}
                ${this.getMigrationBadge(e.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${Ue(e.created_at)}</span>
            </div>
            ${e.migration_status && e.total_count ? `
              <div class="mt-2">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Migration Progress</span>
                  <span>${e.migrated_count ?? 0}/${e.total_count}</span>
                </div>
                <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${(e.migrated_count ?? 0) / e.total_count * 100}%"></div>
                </div>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
    }
  }
  getMigrationBadge(t) {
    const e = t ? {
      pending: ["Pending", "pending"],
      in_progress: ["Migrating", "migrating"],
      completed: ["Migrated", "migrated"],
      failed: ["Failed", "failed"]
    }[t] : void 0;
    return e ? O(e[0], "status", e[1]) : "";
  }
};
function va(t = document) {
  Array.from(t.querySelectorAll("[data-block-library-trigger]")).forEach((e) => {
    if (e.dataset.initialized === "true") return;
    const a = be(e.dataset.apiBasePath, e.dataset.basePath), r = Me(a, e.dataset.basePath), s = e.dataset.mode ?? "manage";
    if (s === "manage") e.addEventListener("click", () => {
      window.location.href = `${r}/content/block-library`;
    });
    else {
      const i = {
        apiBasePath: a,
        mode: s
      };
      e.addEventListener("click", () => {
        new fa(i).show();
      });
    }
    e.dataset.initialized = "true";
  });
}
Oe(() => va());
var C = "main", Ne = "application/x-field-reorder", ka = class {
  constructor(t) {
    this.expandedFieldId = null, this.sectionStates = /* @__PURE__ */ new Map(), this.moveMenuFieldId = null, this.dropHighlight = !1, this.dragReorder = null, this.dropTargetFieldId = null, this.saveState = "idle", this.saveMessage = "", this.saveDisplayTimer = null, this.cachedBlocks = null, this.blocksLoading = !1, this.blockPickerModes = /* @__PURE__ */ new Map(), this.config = t, this.block = { ...t.block }, this.fields = t.block.schema ? le(t.block.schema) : [];
  }
  render() {
    P(), this.config.container.innerHTML = "";
    const t = document.createElement("div");
    t.className = "flex flex-col h-full overflow-hidden", t.setAttribute("data-block-editor-panel", ""), t.innerHTML = `
      ${this.renderHeader()}
      <div class="flex-1 overflow-y-auto" data-editor-scroll>
        ${this.renderMetadataSection()}
        ${this.renderFieldsSection()}
      </div>
    `, this.config.container.appendChild(t), this.bindEvents(t), this.ensureInlineBlocksPicker();
  }
  update(t) {
    this.block = { ...t }, this.fields = t.schema ? le(t.schema) : [], this.expandedFieldId = null, this.moveMenuFieldId = null, this.render();
  }
  getFields() {
    return [...this.fields];
  }
  addField(t) {
    this.fields.push(t), this.expandedFieldId = t.id, this.render();
  }
  renderHeader() {
    return st({
      name: this.block.name || "Untitled",
      subtitle: this.block.slug || this.block.type || "",
      subtitleMono: !0,
      status: this.block.status || "draft",
      saveState: this.saveState,
      saveMessage: this.saveMessage,
      compact: !0
    });
  }
  updateSaveState(t, e) {
    this.saveDisplayTimer && (clearTimeout(this.saveDisplayTimer), this.saveDisplayTimer = null), this.saveState = t, this.saveMessage = e ?? "";
    const a = this.config.container.querySelector("[data-entity-save-indicator]");
    a && (a.innerHTML = rt(this.saveState, this.saveMessage)), t === "saved" && (this.saveDisplayTimer = setTimeout(() => {
      this.saveState = "idle", this.saveMessage = "";
      const r = this.config.container.querySelector("[data-entity-save-indicator]");
      r && (r.innerHTML = "");
    }, 2e3));
  }
  revertStatus(t) {
    const e = this.config.container.querySelector('[data-meta-field="status"]');
    e && (e.value = t ?? "draft"), this.block.status = t ?? "draft";
  }
  renderMetadataSection() {
    const t = this.block, e = t.slug || t.type || "", a = t.slug && t.type && t.slug !== t.type ? `<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Internal type: ${n(t.type)}</p>` : "";
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
              <input type="text" data-meta-field="name" value="${n(t.name)}"
                     class="${g()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug</label>
              <input type="text" data-meta-field="slug" value="${n(e)}" pattern="^[a-z][a-z0-9_\\-]*$"
                     class="${g()} font-mono" />
              ${a}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${g()} resize-none">${n(t.description ?? "")}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select data-meta-field="category" class="${M()}">
                ${this.config.categories.map((r) => `<option value="${n(r)}" ${r === (t.category ?? "") ? "selected" : ""}>${n(F(r))}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              ${ye(t.icon ?? "", 'data-meta-field="icon"', !0)}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select data-meta-field="status" class="${M()}">
                <option value="draft" ${t.status === "draft" ? "selected" : ""}>Draft</option>
                <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
                <option value="deprecated" ${t.status === "deprecated" ? "selected" : ""}>Deprecated</option>
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }
  renderFieldsSection() {
    const t = this.groupFieldsBySection(), e = Array.from(t.keys());
    if (this.fields.length === 0) return `
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
    let a = `
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
    for (const r of e) {
      const s = t.get(r), i = this.getSectionState(r).collapsed;
      a += `
        <div data-section="${n(r)}" class="border-b border-gray-100 dark:border-gray-800">
          <button type="button" data-toggle-section="${n(r)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-section-chevron="${n(r)}">
              ${i ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${n(F(r))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${s.length}</span>
          </button>

          <div class="${i ? "hidden" : ""}" data-section-body="${n(r)}">
            <div class="px-3 pb-2 space-y-1" data-section-fields="${n(r)}">
              ${s.map((o) => this.renderFieldCard(o, e, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return a += Le({ highlight: this.dropHighlight }), a;
  }
  renderFieldCard(t, e, a) {
    const r = t.section || C, s = a.indexOf(t), i = [];
    t.validation?.minLength !== void 0 && i.push(`min: ${t.validation.minLength}`), t.validation?.maxLength !== void 0 && i.push(`max: ${t.validation.maxLength}`), t.validation?.min !== void 0 && i.push(`>= ${t.validation.min}`), t.validation?.max !== void 0 && i.push(`<= ${t.validation.max}`), t.validation?.pattern && i.push("pattern");
    const o = `
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${n(t.id)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === t.id ? this.renderMoveToSectionMenu(t, e, r) : ""}
          </div>`;
    return it({
      field: t,
      isExpanded: t.id === this.expandedFieldId,
      isDropTarget: this.dropTargetFieldId === t.id,
      showReorderButtons: !0,
      isFirst: s === 0,
      isLast: s === a.length - 1,
      compact: !1,
      sectionName: r,
      actionsHtml: o,
      constraintBadges: i,
      renderExpandedContent: () => this.renderFieldProperties(t, e)
    });
  }
  renderFieldProperties(t, e) {
    return L(t.type) === "blocks" ? this.renderBlocksFieldProperties(t, e) : this.renderStandardFieldProperties(t, e);
  }
  renderStandardFieldProperties(t, e) {
    const a = t.validation ?? {}, r = L(t.type), s = [
      "text",
      "textarea",
      "rich-text",
      "markdown",
      "code",
      "slug"
    ].includes(r), i = [
      "number",
      "integer",
      "currency",
      "percentage"
    ].includes(r), o = t.section || C;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${n(t.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${n(t.id)}" data-prop-key="name"
                   value="${n(t.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${g("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
            <input type="text" data-field-prop="${n(t.id)}" data-prop-key="label"
                   value="${n(t.label)}"
                   class="${g("xs")}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
          <input type="text" data-field-prop="${n(t.id)}" data-prop-key="description"
                 value="${n(t.description ?? "")}" placeholder="Help text for editors"
                 class="${g("xs")}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${n(t.id)}" data-prop-key="placeholder"
                 value="${n(t.placeholder ?? "")}"
                 class="${g("xs")}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${n(t.id)}" data-check-key="required"
                   ${t.required ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${n(t.id)}" data-check-key="readonly"
                   ${t.readonly ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${n(t.id)}" data-check-key="hidden"
                   ${t.hidden ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
          </label>
        </div>

        <!-- Validation (conditional) -->
        ${s ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Length</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="validation.minLength"
                   value="${a.minLength ?? ""}" min="0"
                   class="${g("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="validation.maxLength"
                   value="${a.maxLength ?? ""}" min="0"
                   class="${g("xs")}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${n(t.id)}" data-prop-key="validation.pattern"
                 value="${n(a.pattern ?? "")}" placeholder="^[a-z]+$"
                 class="${g("xs")} font-mono" />
        </div>` : ""}

        ${i ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="validation.min"
                   value="${a.min ?? ""}" step="any"
                   class="${g("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="validation.max"
                   value="${a.max ?? ""}" step="any"
                   class="${g("xs")}" />
          </div>
        </div>` : ""}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
            <select data-field-section-select="${n(t.id)}"
                    class="${M("xs")}">
              ${e.map((l) => `<option value="${n(l)}" ${l === o ? "selected" : ""}>${n(F(l))}</option>`).join("")}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="gridSpan"
                   value="${t.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                   class="${g("xs")}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${n(t.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  renderBlocksFieldProperties(t, e) {
    const a = t.config ?? {}, r = t.section || C, s = this.getBlocksPickerMode(t.id) === "allowed", i = new Set(s ? a.allowedBlocks ?? [] : a.deniedBlocks ?? []), o = "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded", l = s ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", c = s ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300", d = s ? "Allowed Blocks" : "Denied Blocks", h = s ? "blue" : "red", y = s ? "All blocks allowed (no restrictions)" : "No blocks denied";
    let u;
    if (this.cachedBlocks) {
      const f = Z(i, this.cachedBlocks);
      u = X({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: f,
        onSelectionChange: () => {
        },
        label: d,
        accent: h,
        emptySelectionText: y
      });
    } else u = `
        <div class="flex items-center justify-center py-6" data-blocks-loading="${n(t.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${n(t.id)}">
        <!-- Block Selection (primary) -->
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-blocks-mode-toggle="${n(t.id)}" data-blocks-mode="allowed"
                    class="${o} ${l}">
              Allowed
            </button>
            <button type="button" data-blocks-mode-toggle="${n(t.id)}" data-blocks-mode="denied"
                    class="${o} ${c}">
              Denied
            </button>
          </div>
          <button type="button" data-blocks-open-library="${n(t.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-blocks-picker-container="${n(t.id)}">
          ${u}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-blocks-advanced="${n(t.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>

        <!-- Min/Max Blocks -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Blocks</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="config.minBlocks"
                   value="${a.minBlocks ?? ""}" min="0" placeholder="0"
                   class="${g("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Blocks</label>
            <input type="number" data-field-prop="${n(t.id)}" data-prop-key="config.maxBlocks"
                   value="${a.maxBlocks ?? ""}" min="1" placeholder="No limit"
                   class="${g("xs")}" />
          </div>
        </div>

        <!-- Field Settings (secondary — collapsed by default) -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
          <button type="button" data-blocks-settings-toggle="${n(t.id)}"
                  class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
            <span data-blocks-settings-chevron="${n(t.id)}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
            Field Settings
          </button>

          <div class="hidden mt-2 space-y-3" data-blocks-settings-body="${n(t.id)}">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
                <input type="text" data-field-prop="${n(t.id)}" data-prop-key="name"
                       value="${n(t.name)}" pattern="^[a-z][a-z0-9_]*$"
                       class="${g("xs")}" />
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
                <input type="text" data-field-prop="${n(t.id)}" data-prop-key="label"
                       value="${n(t.label)}"
                       class="${g("xs")}" />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
              <input type="text" data-field-prop="${n(t.id)}" data-prop-key="description"
                     value="${n(t.description ?? "")}" placeholder="Help text for editors"
                     class="${g("xs")}" />
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${n(t.id)}" data-check-key="required"
                       ${t.required ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${n(t.id)}" data-check-key="readonly"
                       ${t.readonly ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${n(t.id)}" data-check-key="hidden"
                       ${t.hidden ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
                <select data-field-section-select="${n(t.id)}"
                        class="${M("xs")}">
                  ${e.map((f) => `<option value="${n(f)}" ${f === r ? "selected" : ""}>${n(F(f))}</option>`).join("")}
                  <option value="__new__">+ New section...</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
                <input type="number" data-field-prop="${n(t.id)}" data-prop-key="gridSpan"
                       value="${t.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                       class="${g("xs")}" />
              </div>
            </div>
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${n(t.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  renderMoveToSectionMenu(t, e, a) {
    const r = e.filter((s) => s !== a);
    return r.length === 0 ? `
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">Only one section exists.</div>
          <button type="button" data-move-new-section="${n(t.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>` : `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Move to section</div>
        ${r.map((s) => `
          <button type="button" data-move-to="${n(s)}" data-move-field="${n(t.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${n(F(s))}
          </button>`).join("")}
        <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
          <button type="button" data-move-new-section="${n(t.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>
      </div>`;
  }
  groupFieldsBySection() {
    const t = /* @__PURE__ */ new Map();
    for (const e of this.fields) {
      const a = e.section || C;
      t.has(a) || t.set(a, []), t.get(a).push(e);
    }
    if (t.has(C)) {
      const e = t.get(C);
      t.delete(C);
      const a = /* @__PURE__ */ new Map();
      a.set(C, e);
      for (const [r, s] of t) a.set(r, s);
      return a;
    }
    return t;
  }
  getSectionState(t) {
    return this.sectionStates.has(t) || this.sectionStates.set(t, { collapsed: !1 }), this.sectionStates.get(t);
  }
  getBlocksPickerMode(t) {
    return this.blockPickerModes.get(t) ?? "allowed";
  }
  ensureInlineBlocksPicker() {
    if (!this.expandedFieldId) return;
    const t = this.fields.find((e) => e.id === this.expandedFieldId);
    t && L(t.type) === "blocks" && this.loadBlocksForField(t);
  }
  bindEvents(t) {
    t.querySelector("[data-toggle-metadata]")?.addEventListener("click", () => {
      const e = t.querySelector("[data-metadata-body]"), a = t.querySelector("[data-metadata-chevron]");
      if (e) {
        const r = e.classList.toggle("hidden");
        a && (a.innerHTML = r ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
    }), t.querySelectorAll("[data-meta-field]").forEach((e) => {
      const a = e.dataset.metaField;
      e.tagName === "SELECT" ? e.addEventListener("change", () => this.handleMetadataChange(a, e.value)) : (e.tagName === "TEXTAREA" || e.tagName === "INPUT") && e.addEventListener("input", () => this.handleMetadataChange(a, e.value));
    }), fe(t, "[data-icon-trigger]", (e) => {
      const a = e.querySelector('[data-meta-field="icon"]');
      return {
        value: a?.value ?? "",
        onSelect: (r) => {
          a && (a.value = r, a.dispatchEvent(new Event("input", { bubbles: !0 })));
        },
        onClear: () => {
          a && (a.value = "", a.dispatchEvent(new Event("input", { bubbles: !0 })));
        },
        compact: !0
      };
    }), t.addEventListener("click", (e) => this.handleClick(e, t)), t.addEventListener("input", (e) => this.handleInput(e)), t.addEventListener("change", (e) => this.handleChange(e, t)), document.addEventListener("click", (e) => {
      if (this.moveMenuFieldId) {
        const a = e.target;
        !a.closest("[data-move-menu]") && !a.closest("[data-field-actions]") && (this.moveMenuFieldId = null, this.render());
      }
    }), this.bindDropZoneEvents(t), this.bindFieldReorderEvents(t), this.bindSectionSelectEvents(t);
  }
  bindDropZoneEvents(t) {
    t.querySelectorAll("[data-field-drop-zone]").forEach((e) => {
      e.addEventListener("dragover", (a) => {
        a.preventDefault(), a.dataTransfer.dropEffect = "copy", this.dropHighlight || (this.dropHighlight = !0, e.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), e.classList.add("border-blue-400", "bg-blue-50/50"));
      }), e.addEventListener("dragleave", (a) => {
        e.contains(a.relatedTarget) || (this.dropHighlight = !1, e.classList.remove("border-blue-400", "bg-blue-50/50"), e.classList.add("border-gray-200", "hover:border-gray-300"));
      }), e.addEventListener("drop", (a) => {
        if (a.preventDefault(), this.dropHighlight = !1, e.classList.remove("border-blue-400", "bg-blue-50/50"), e.classList.add("border-gray-200", "hover:border-gray-300"), this.config.onFieldDrop) {
          const r = a.dataTransfer?.getData(Te);
          if (r) {
            const i = H(r, null);
            if (i && i.type) {
              this.config.onFieldDrop(i);
              return;
            }
          }
          const s = a.dataTransfer?.getData(ue);
          if (s) {
            const i = L(s), o = ge(i) ?? {
              type: i,
              label: F(i),
              description: "",
              icon: "",
              category: "advanced"
            };
            this.config.onFieldDrop(o);
          }
        }
      });
    });
  }
  handleClick(t, e) {
    const a = t.target;
    if (a.closest("[data-block-add-field]")) {
      this.config.onAddFieldClick && this.config.onAddFieldClick();
      return;
    }
    const r = a.closest("[data-toggle-section]");
    if (r) {
      const p = r.dataset.toggleSection, b = this.getSectionState(p);
      b.collapsed = !b.collapsed, this.sectionStates.set(p, b);
      const k = e.querySelector(`[data-section-body="${p}"]`), w = e.querySelector(`[data-section-chevron="${p}"]`);
      k && k.classList.toggle("hidden", b.collapsed), w && (w.innerHTML = b.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      return;
    }
    const s = a.closest("[data-field-actions]");
    if (s) {
      t.stopPropagation();
      const p = s.dataset.fieldActions;
      this.moveMenuFieldId = this.moveMenuFieldId === p ? null : p, this.render();
      return;
    }
    const i = a.closest("[data-move-to]");
    if (i) {
      t.stopPropagation();
      const p = i.dataset.moveTo, b = i.dataset.moveField;
      this.moveFieldToSection(b, p);
      return;
    }
    const o = a.closest("[data-move-new-section]");
    if (o) {
      t.stopPropagation();
      const p = o.dataset.moveNewSection;
      new Q({
        title: "Create New Section",
        label: "Section name",
        placeholder: "e.g. sidebar",
        confirmLabel: "Create",
        inputClass: g(),
        onConfirm: (b) => {
          const k = b.trim().toLowerCase().replace(/\s+/g, "_");
          k && this.moveFieldToSection(p, k);
        }
      }).show();
      return;
    }
    const l = a.closest("[data-field-move-up]");
    if (l) {
      t.stopPropagation();
      const p = l.dataset.fieldMoveUp;
      l.hasAttribute("disabled") || this.moveFieldInSection(p, -1);
      return;
    }
    const c = a.closest("[data-field-move-down]");
    if (c) {
      t.stopPropagation();
      const p = c.dataset.fieldMoveDown;
      c.hasAttribute("disabled") || this.moveFieldInSection(p, 1);
      return;
    }
    const d = a.closest("[data-field-remove]");
    if (d) {
      const p = d.dataset.fieldRemove, b = this.fields.find((k) => k.id === p);
      b && Y.confirm(`Remove field "${b.label || b.name}"?`, {
        title: "Remove Field",
        confirmText: "Remove",
        confirmVariant: "danger"
      }).then((k) => {
        k && (this.fields = this.fields.filter((w) => w.id !== p), this.expandedFieldId === p && (this.expandedFieldId = null), this.notifySchemaChange(), this.render());
      });
      return;
    }
    const h = a.closest("[data-blocks-settings-toggle]");
    if (h) {
      const p = h.dataset.blocksSettingsToggle, b = e.querySelector(`[data-blocks-settings-body="${p}"]`), k = e.querySelector(`[data-blocks-settings-chevron="${p}"]`);
      if (b) {
        const w = b.classList.toggle("hidden");
        k && (k.innerHTML = w ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
      return;
    }
    const y = a.closest("[data-blocks-mode-toggle]");
    if (y) {
      t.stopPropagation();
      const p = y.dataset.blocksModeToggle, b = y.dataset.blocksMode ?? "allowed";
      this.blockPickerModes.set(p, b), this.render();
      return;
    }
    if (a.closest("[data-blocks-open-library]")) {
      t.stopPropagation();
      const p = this.config.api.getBasePath();
      window.location.href = `${p}/content/block-library`;
      return;
    }
    const u = a.closest("[data-blocks-advanced]");
    if (u) {
      t.stopPropagation();
      const p = u.dataset.blocksAdvanced, b = this.fields.find((k) => k.id === p);
      b && this.openFieldConfigModal(b);
      return;
    }
    const f = a.closest("[data-field-toggle]");
    if (f) {
      if (a.closest("[data-field-grip]")) return;
      const p = f.dataset.fieldToggle;
      if (this.expandedFieldId = this.expandedFieldId === p ? null : p, this.render(), this.expandedFieldId) {
        const b = this.fields.find((k) => k.id === this.expandedFieldId);
        b && L(b.type) === "blocks" && this.loadBlocksForField(b);
      }
      return;
    }
  }
  handleInput(t) {
    const e = t.target.closest("[data-field-prop]");
    if (e) {
      const a = e.dataset.fieldProp, r = e.dataset.propKey;
      this.updateFieldProp(a, r, e.value);
      return;
    }
  }
  handleChange(t, e) {
    const a = t.target.closest("[data-field-check]");
    if (a) {
      const r = a.dataset.fieldCheck, s = a.dataset.checkKey;
      this.updateFieldProp(r, s, a.checked);
      return;
    }
  }
  handleMetadataChange(t, e) {
    if (t === "status" && this.config.onStatusChange) {
      this.config.onStatusChange(this.block.id, e);
      return;
    }
    const a = {}, r = this.block;
    switch (t) {
      case "name":
        a.name = e, r.name = e;
        break;
      case "slug": {
        const s = (this.block.slug || this.block.type || "").toString();
        a.slug = e, r.slug = e, (!r.type || r.type === s) && (a.type = e, r.type = e);
        break;
      }
      case "description":
        a.description = e, r.description = e;
        break;
      case "category":
        a.category = e, r.category = e;
        break;
      case "icon":
        a.icon = e, r.icon = e;
        break;
      case "status":
        a.status = e, r.status = e;
        break;
    }
    this.config.onMetadataChange(this.block.id, a);
  }
  updateFieldProp(t, e, a) {
    const r = this.fields.find((i) => i.id === t);
    if (!r) return;
    const s = e.split(".");
    if (s.length === 1) {
      const i = s[0], o = r;
      typeof a == "boolean" ? o[i] = a : i === "gridSpan" ? o[i] = a ? parseInt(a, 10) : void 0 : o[i] = a || void 0;
    } else if (s[0] === "config") {
      r.config || (r.config = {});
      const i = s[1], o = r.config;
      typeof a == "string" && (a === "" ? delete o[i] : ["minBlocks", "maxBlocks"].includes(i) ? o[i] = parseInt(a, 10) : o[i] = a), Object.keys(r.config).length === 0 && (r.config = void 0);
    } else if (s[0] === "validation") {
      r.validation || (r.validation = {});
      const i = s[1];
      typeof a == "string" && (a === "" ? delete r.validation[i] : ["minLength", "maxLength"].includes(i) ? r.validation[i] = parseInt(a, 10) : ["min", "max"].includes(i) ? r.validation[i] = parseFloat(a) : r.validation[i] = a), Object.keys(r.validation).length === 0 && (r.validation = void 0);
    }
    this.notifySchemaChange();
  }
  async loadBlocksForField(t) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(t);
      return;
    }
    this.blocksLoading || (this.blocksLoading = !0, this.cachedBlocks = await je(this.config.api), this.blocksLoading = !1, this.expandedFieldId === t.id && this.renderInlineBlockPickerForField(t));
  }
  renderInlineBlockPickerForField(t) {
    const e = this.config.container.querySelector(`[data-blocks-picker-container="${t.id}"]`);
    if (!e || !this.cachedBlocks) return;
    const a = t.config ?? {}, r = this.getBlocksPickerMode(t.id) === "allowed", s = Z(new Set(r ? a.allowedBlocks ?? [] : a.deniedBlocks ?? []), this.cachedBlocks), i = r ? "Allowed Blocks" : "Denied Blocks", o = r ? "blue" : "red", l = r ? "All blocks allowed (no restrictions)" : "No blocks denied";
    e.innerHTML = X({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: s,
      onSelectionChange: (c) => {
        t.config || (t.config = {});
        const d = t.config;
        r ? c.size > 0 ? d.allowedBlocks = Array.from(c) : delete d.allowedBlocks : c.size > 0 ? d.deniedBlocks = Array.from(c) : delete d.deniedBlocks, Object.keys(t.config).length === 0 && (t.config = void 0), this.notifySchemaChange();
      },
      label: i,
      accent: o,
      emptySelectionText: l
    }), Xe(e, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: s,
      onSelectionChange: (c) => {
        t.config || (t.config = {});
        const d = t.config;
        r ? c.size > 0 ? d.allowedBlocks = Array.from(c) : delete d.allowedBlocks : c.size > 0 ? d.deniedBlocks = Array.from(c) : delete d.deniedBlocks, Object.keys(t.config).length === 0 && (t.config = void 0), this.notifySchemaChange();
      },
      label: i,
      accent: o,
      emptySelectionText: l
    });
  }
  openFieldConfigModal(t) {
    new he({
      field: t,
      existingFieldNames: this.fields.filter((e) => e.id !== t.id).map((e) => e.name),
      apiBasePath: this.config.api.getBasePath(),
      onSave: (e) => {
        const a = this.fields.findIndex((r) => r.id === t.id);
        a !== -1 && (this.fields[a] = e, this.notifySchemaChange(), this.render());
      },
      onCancel: () => {
      }
    }).show();
  }
  moveFieldToSection(t, e) {
    const a = this.fields.find((r) => r.id === t);
    a && (a.section = e === C ? void 0 : e, this.moveMenuFieldId = null, this.notifySchemaChange(), this.render());
  }
  moveFieldInSection(t, e) {
    const a = this.fields.find((d) => d.id === t);
    if (!a) return;
    const r = a.section || C, s = this.fields.filter((d) => (d.section || C) === r), i = s.findIndex((d) => d.id === t), o = i + e;
    if (o < 0 || o >= s.length) return;
    const l = this.fields.indexOf(s[i]), c = this.fields.indexOf(s[o]);
    [this.fields[l], this.fields[c]] = [this.fields[c], this.fields[l]], this.notifySchemaChange(), this.render();
  }
  reorderFieldBefore(t, e) {
    if (t === e) return;
    const a = this.fields.find((o) => o.id === t), r = this.fields.find((o) => o.id === e);
    if (!a || !r || (a.section || C) !== (r.section || C)) return;
    const s = this.fields.indexOf(a);
    this.fields.splice(s, 1);
    const i = this.fields.indexOf(r);
    this.fields.splice(i, 0, a), this.notifySchemaChange(), this.render();
  }
  bindFieldReorderEvents(t) {
    t.querySelectorAll("[data-field-card]").forEach((e) => {
      const a = e.dataset.fieldCard, r = e.dataset.fieldSection;
      let s = !1;
      e.addEventListener("mousedown", (i) => {
        s = !!i.target.closest("[data-field-grip]");
      }), e.addEventListener("dragstart", (i) => {
        if (!s) {
          i.preventDefault();
          return;
        }
        this.dragReorder = {
          fieldId: a,
          sectionName: r
        }, i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData(Ne, a), e.classList.add("opacity-50");
      }), e.addEventListener("dragend", () => {
        this.dragReorder = null, this.dropTargetFieldId = null, e.classList.remove("opacity-50"), t.querySelectorAll("[data-field-card]").forEach((i) => {
          i.classList.remove("border-t-2", "border-t-blue-400");
        });
      }), e.addEventListener("dragover", (i) => {
        this.dragReorder && this.dragReorder.sectionName === r && this.dragReorder.fieldId !== a && (i.preventDefault(), i.dataTransfer.dropEffect = "move", this.dropTargetFieldId !== a && (t.querySelectorAll("[data-field-card]").forEach((o) => {
          o.classList.remove("border-t-2", "border-t-blue-400");
        }), e.classList.add("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = a));
      }), e.addEventListener("dragleave", () => {
        this.dropTargetFieldId === a && (e.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null);
      }), e.addEventListener("drop", (i) => {
        i.preventDefault();
        const o = i.dataTransfer?.getData(Ne);
        e.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null, this.dragReorder = null, o && o !== a && this.reorderFieldBefore(o, a);
      });
    });
  }
  bindSectionSelectEvents(t) {
    t.querySelectorAll("[data-field-section-select]").forEach((e) => {
      e.addEventListener("change", () => {
        const a = e.dataset.fieldSectionSelect, r = e.value;
        if (r === "__new__") {
          const s = this.fields.find((i) => i.id === a)?.section || C;
          new Q({
            title: "Create New Section",
            label: "Section name",
            placeholder: "e.g. sidebar",
            confirmLabel: "Create",
            inputClass: g(),
            onConfirm: (i) => {
              const o = i.trim().toLowerCase().replace(/\s+/g, "_");
              o && this.moveFieldToSection(a, o);
            },
            onCancel: () => {
              e.value = s;
            }
          }).show();
          return;
        }
        this.moveFieldToSection(a, r);
      });
    });
  }
  notifySchemaChange() {
    this.config.onSchemaChange(this.block.id, [...this.fields]);
  }
}, ot, xe = [
  "content",
  "media",
  "layout",
  "interactive",
  "custom"
], $ = "default", nt = class lt {
  constructor(e) {
    this.listEl = null, this.searchInput = null, this.categorySelect = null, this.countEl = null, this.createBtn = null, this.editorEl = null, this.paletteEl = null, this.activeMenu = null, this.editorPanel = null, this.palettePanel = null, this.autosaveTimers = /* @__PURE__ */ new Map(), this.boundVisibilityChange = null, this.boundBeforeUnload = null, this.sidebarEl = null, this.paletteAsideEl = null, this.sidebarToggleBtn = null, this.gridEl = null, this.addFieldBar = null, this.paletteTriggerBtn = null, this.sidebarCollapsed = !1, this.mediaQueryLg = null, this.popoverPalettePanel = null, this.channelSelectEl = null, this.channelResetBtn = null, this.channelAddBtn = null, this.backToContentTypesLink = null, this.currentChannel = $, this.availableChannels = [$], this.channelDiagnostics = null;
    const a = be(e.dataset.apiBasePath, e.dataset.basePath);
    this.root = e, this.api = new R({ basePath: a }), this.state = {
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
    this.bindDOM(), this.bindEvents(), this.initPalette(), this.bindAutosaveListeners(), this.bindResponsive(), this.initChannel(), await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }
  initPalette() {
    this.paletteEl && (this.palettePanel = new Be({
      container: this.paletteEl,
      api: this.api,
      onAddField: (e) => this.handlePaletteAddField(e)
    }), this.palettePanel.init());
  }
  bindAutosaveListeners() {
    this.root.addEventListener("keydown", (e) => {
      (e.ctrlKey || e.metaKey) && e.key === "s" && (e.preventDefault(), this.saveCurrentBlock());
    }), this.boundVisibilityChange = () => {
      document.hidden && this.saveAllDirty();
    }, document.addEventListener("visibilitychange", this.boundVisibilityChange), this.boundBeforeUnload = (e) => {
      this.state.dirtyBlocks.size > 0 && (e.preventDefault(), e.returnValue = "");
    }, window.addEventListener("beforeunload", this.boundBeforeUnload);
  }
  async saveBlock(e) {
    if (!this.state.dirtyBlocks.has(e)) return !0;
    const a = this.state.blocks.find((r) => r.id === e);
    if (!a) return !1;
    this.cancelScheduledSave(e), this.markSaving(e), this.notifySaveState(e, "saving");
    try {
      const r = await this.api.updateBlockDefinition(e, {
        name: a.name,
        slug: a.slug,
        type: a.type,
        description: a.description,
        category: a.category,
        icon: a.icon,
        schema: a.schema,
        ui_schema: a.ui_schema
      });
      return this.updateBlockInState(e, r), this.markClean(e), this.notifySaveState(e, "saved"), !0;
    } catch (r) {
      const s = r instanceof Error ? r.message : "Save failed";
      return this.markSaveError(e, s), this.notifySaveState(e, "error", s), !1;
    }
  }
  scheduleSave(e) {
    this.cancelScheduledSave(e);
    const a = setTimeout(() => {
      this.autosaveTimers.delete(e), this.saveBlock(e);
    }, lt.AUTOSAVE_DELAY);
    this.autosaveTimers.set(e, a);
  }
  cancelScheduledSave(e) {
    const a = this.autosaveTimers.get(e);
    a && (clearTimeout(a), this.autosaveTimers.delete(e));
  }
  async saveCurrentBlock() {
    this.state.selectedBlockId && await this.saveBlock(this.state.selectedBlockId);
  }
  async saveAllDirty() {
    const e = [...this.state.dirtyBlocks];
    await Promise.all(e.map((a) => this.saveBlock(a)));
  }
  notifySaveState(e, a, r) {
    this.editorPanel && this.state.selectedBlockId === e && this.editorPanel.updateSaveState(a, r);
  }
  async handleEditorStatusChange(e, a) {
    const r = this.state.blocks.find((i) => i.id === e);
    if (!r) return;
    const s = r.status;
    if (s !== a) {
      if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
        this.showToast("Please fix save errors before changing status.", "error"), this.editorPanel?.revertStatus(s);
        return;
      }
      try {
        let i;
        if (a === "active" ? (i = await this.api.publishBlockDefinition(e), this.showToast("Block published.", "success")) : a === "deprecated" ? (i = await this.api.deprecateBlockDefinition(e), this.showToast("Block deprecated.", "info")) : (i = await this.api.updateBlockDefinition(e, { status: "draft" }), this.showToast("Block reverted to draft.", "info")), this.updateBlockInState(e, i), this.renderBlockList(), this.editorPanel && this.state.selectedBlockId === e) {
          const o = this.state.blocks.find((l) => l.id === e);
          o && this.editorPanel.update(o);
        }
      } catch (i) {
        const o = a === "active" ? "Block published." : a === "deprecated" ? "Block deprecated." : "Block reverted to draft.";
        if (i instanceof re && [
          404,
          405,
          501
        ].includes(i.status)) try {
          const c = await this.api.updateBlockDefinition(e, { status: a });
          if (this.updateBlockInState(e, c), this.renderBlockList(), this.editorPanel && this.state.selectedBlockId === e) {
            const d = this.state.blocks.find((h) => h.id === e);
            d && this.editorPanel.update(d);
          }
          this.showToast(o, a === "active" ? "success" : "info");
          return;
        } catch (c) {
          console.error("Status change fallback failed:", c);
        }
        const l = i instanceof Error ? i.message : "Status change failed";
        console.error("Status change failed:", i), this.showToast(l, "error"), this.editorPanel?.revertStatus(s);
      }
    }
  }
  bindResponsive() {
    this.sidebarToggleBtn?.addEventListener("click", () => this.toggleSidebar()), this.paletteTriggerBtn?.addEventListener("click", () => {
      this.paletteTriggerBtn && this.openPalettePopover(this.paletteTriggerBtn);
    }), this.mediaQueryLg = window.matchMedia("(min-width: 1024px)"), this.mediaQueryLg.addEventListener("change", () => this.handleBreakpointChange());
  }
  handleBreakpointChange() {
    (this.mediaQueryLg?.matches ?? !0) && this.closePalettePopover();
  }
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed, this.sidebarEl && this.sidebarEl.classList.toggle("hidden", this.sidebarCollapsed), this.gridEl && (this.sidebarCollapsed ? (this.gridEl.classList.remove("md:grid-cols-[240px,1fr]", "lg:grid-cols-[240px,1fr,260px]"), this.gridEl.classList.add("md:grid-cols-[1fr]", "lg:grid-cols-[1fr,260px]")) : (this.gridEl.classList.remove("md:grid-cols-[1fr]", "lg:grid-cols-[1fr,260px]"), this.gridEl.classList.add("md:grid-cols-[240px,1fr]", "lg:grid-cols-[240px,1fr,260px]"))), this.sidebarToggleBtn && this.sidebarToggleBtn.setAttribute("title", this.sidebarCollapsed ? "Show sidebar" : "Hide sidebar");
  }
  openPalettePopover(e) {
    this.closePalettePopover();
    const a = document.createElement("div");
    a.className = "fixed inset-0 z-40", a.dataset.paletteBackdrop = "", a.addEventListener("click", () => this.closePalettePopover());
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
    const s = e.getBoundingClientRect(), i = 288;
    let o = s.left, l = s.top - 8;
    o + i > window.innerWidth - 16 && (o = window.innerWidth - i - 16), o < 16 && (o = 16);
    const c = Math.min(window.innerHeight * 0.6, 480);
    l - c < 16 ? l = s.bottom + 8 : l = l - c, r.style.top = `${l}px`, r.style.left = `${o}px`, document.body.appendChild(a), document.body.appendChild(r);
    const d = r.querySelector("[data-palette-popover-content]");
    d && (this.popoverPalettePanel = new Be({
      container: d,
      api: this.api,
      onAddField: (h) => {
        this.handlePaletteAddField(h), this.closePalettePopover();
      }
    }), this.popoverPalettePanel.init(), this.state.selectedBlockId && this.popoverPalettePanel.enable());
  }
  closePalettePopover() {
    document.querySelector("[data-palette-backdrop]")?.remove(), document.querySelector("[data-palette-popover]")?.remove(), this.popoverPalettePanel = null;
  }
  updateAddFieldBar() {
    this.addFieldBar && this.addFieldBar.classList.toggle("hidden", !this.state.selectedBlockId);
  }
  initChannel() {
    const e = new URLSearchParams(window.location.search).get("channel");
    this.currentChannel = this.normalizeChannel(e), this.api.setChannel(this.currentChannel), this.refreshChannelOptions(), this.updateChannelStatus(), this.updateBackLink(), this.channelSelectEl?.addEventListener("change", () => {
      const a = this.channelSelectEl?.value ?? $;
      this.setChannel(a);
    }), this.channelResetBtn?.addEventListener("click", () => {
      this.setChannel($);
    }), this.channelAddBtn?.addEventListener("click", () => {
      this.promptForChannel();
    }), this.api.setChannelSession(this.currentChannel).catch(() => {
    });
  }
  async setChannel(e) {
    const a = this.normalizeChannel(e);
    this.currentChannel = a, this.api.setChannel(a), this.refreshChannelOptions(), this.updateChannelStatus();
    try {
      await this.api.setChannelSession(a);
    } catch {
    }
    this.updateUrlChannel(a), this.state.selectedBlockId = null, this.state.dirtyBlocks.clear(), this.state.savingBlocks.clear(), this.state.saveErrors.clear(), this.editorPanel = null, this.renderEditor(), await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }
  updateUrlChannel(e) {
    const a = new URL(window.location.href);
    e && e !== $ ? a.searchParams.set("channel", e) : a.searchParams.delete("channel"), window.history.replaceState({}, "", a.toString());
  }
  promptForChannel() {
    if (!this.channelSelectEl) return;
    const e = this.currentChannel;
    new Q({
      title: "Add Channel",
      label: "Channel name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      inputClass: g(),
      onConfirm: (a) => {
        const r = a.trim();
        if (!r) return;
        const s = this.normalizeChannel(r);
        this.upsertChannelOption(s), this.channelSelectEl.value = s, this.setChannel(s);
      },
      onCancel: () => {
        this.channelSelectEl.value = e;
      }
    }).show();
  }
  normalizeChannel(e) {
    return String(e ?? "").trim().toLowerCase() || $;
  }
  refreshChannelOptions() {
    if (!this.channelSelectEl) return;
    const e = this.normalizeChannel(this.currentChannel), a = /* @__PURE__ */ new Set([$]);
    for (const s of this.availableChannels) a.add(this.normalizeChannel(s));
    a.add(e);
    const r = Array.from(a).sort((s, i) => s === $ ? -1 : i === $ ? 1 : s.localeCompare(i));
    this.channelSelectEl.innerHTML = "";
    for (const s of r) {
      const i = document.createElement("option");
      i.value = s, i.textContent = this.channelLabel(s), this.channelSelectEl.appendChild(i);
    }
    this.channelSelectEl.value = e;
  }
  channelLabel(e) {
    const a = this.normalizeChannel(e);
    return a === $ ? "Default" : a;
  }
  upsertChannelOption(e) {
    const a = this.normalizeChannel(e);
    this.availableChannels.includes(a) || this.availableChannels.push(a), this.refreshChannelOptions();
  }
  updateChannelStatus() {
    const e = this.normalizeChannel(this.currentChannel) === $;
    this.channelResetBtn && this.channelResetBtn.classList.toggle("hidden", e), this.updateBackLink();
  }
  updateBackLink() {
    if (!this.backToContentTypesLink) return;
    const e = this.normalizeChannel(this.currentChannel), a = `${this.root.dataset.basePath || ""}/content/types`;
    e && e !== $ ? this.backToContentTypesLink.href = `${a}?channel=${encodeURIComponent(e)}` : this.backToContentTypesLink.href = a;
  }
  getSelectedBlock() {
    return this.state.selectedBlockId ? this.state.blocks.find((e) => e.id === this.state.selectedBlockId) ?? null : null;
  }
  selectBlock(e) {
    const a = this.state.selectedBlockId;
    a && a !== e && this.state.dirtyBlocks.has(a) && (this.cancelScheduledSave(a), this.saveBlock(a)), this.state.selectedBlockId = e, this.editorPanel && a !== e && this.editorPanel.updateSaveState("idle"), this.renderBlockList(), this.renderEditor();
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
  markSaveError(e, a) {
    this.state.savingBlocks.delete(e), this.state.saveErrors.set(e, a), this.updateBlockIndicator(e);
  }
  async refreshBlocks() {
    await this.loadBlocks();
  }
  bindDOM() {
    this.listEl = this.root.querySelector("[data-block-ide-list]"), this.searchInput = this.root.querySelector("[data-block-ide-search]"), this.categorySelect = this.root.querySelector("[data-block-ide-category-filter]"), this.countEl = this.root.querySelector("[data-block-ide-count]"), this.createBtn = this.root.querySelector("[data-block-ide-create]"), this.editorEl = this.root.querySelector("[data-block-ide-editor]"), this.paletteEl = this.root.querySelector("[data-block-ide-palette]"), this.sidebarEl = this.root.querySelector("[data-block-ide-sidebar]"), this.paletteAsideEl = this.root.querySelector("[data-block-ide-palette-aside]"), this.gridEl = this.root.querySelector("[data-block-ide-grid]"), this.addFieldBar = this.root.querySelector("[data-block-ide-add-field-bar]"), this.paletteTriggerBtn = this.root.querySelector("[data-block-ide-palette-trigger]"), this.sidebarToggleBtn = document.querySelector("[data-block-ide-sidebar-toggle]"), this.channelSelectEl = document.querySelector("[data-block-ide-channel], [data-block-ide-env]"), this.channelResetBtn = document.querySelector("[data-block-ide-channel-reset], [data-block-ide-env-reset]"), this.channelAddBtn = document.querySelector("[data-block-ide-channel-add], [data-block-ide-env-add]"), this.backToContentTypesLink = document.querySelector("[data-back-to-content-types]");
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
        const a = e.target;
        !a.closest("[data-block-context-menu]") && !a.closest("[data-block-actions]") && this.closeContextMenu();
      }
    }), this.root.addEventListener("keydown", (e) => {
      e.key === "Escape" && (this.state.isCreating && this.cancelCreate(), this.state.renamingBlockId && this.cancelRename(), this.closeContextMenu());
    });
  }
  async loadBlocks() {
    this.state.isLoading = !0, this.state.error = null, this.renderBlockList();
    try {
      const [e, a] = await Promise.all([this.api.listBlockDefinitions(), this.api.getBlockDefinitionDiagnostics()]);
      this.state.blocks = e.items.map((i) => this.normalizeBlockDefinition(i)), this.channelDiagnostics = a;
      const r = Array.isArray(a?.available_channels) ? a.available_channels : [];
      r.length > 0 && (this.availableChannels = r.map((i) => this.normalizeChannel(i)).filter((i, o, l) => i && l.indexOf(i) === o));
      const s = a?.effective_channel;
      if (s) {
        const i = this.normalizeChannel(s);
        i !== this.currentChannel && (this.currentChannel = i, this.api.setChannel(i), this.updateUrlChannel(i));
      }
      this.refreshChannelOptions(), this.updateChannelStatus();
    } catch (e) {
      this.state.blocks = [], this.channelDiagnostics = null, this.availableChannels = [$], this.state.error = this.formatBlockLoadError(e), this.refreshChannelOptions(), this.updateChannelStatus();
    } finally {
      this.state.isLoading = !1, this.refreshCategoriesFromBlocks(), this.renderBlockList(), this.updateCount();
    }
  }
  formatBlockLoadError(e) {
    return e instanceof re ? e.status === 404 ? `Block Library API route not found. Expected GET ${this.api.getBasePath()}/panels/block_definitions.` : e.status === 403 ? "Access denied while loading block definitions. Check your admin permissions." : e.message ? `Failed to load block definitions: ${e.message}` : `Failed to load block definitions (HTTP ${e.status}).` : e instanceof Error && e.message ? `Failed to load block definitions: ${e.message}` : "Failed to load block definitions.";
  }
  async loadCategories() {
    this.state.categories = [], this.mergeCategories(xe), this.mergeCategories(this.loadUserCategories());
    try {
      const e = await this.api.getBlockCategories();
      this.mergeCategories(e);
    } catch {
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  refreshCategoriesFromBlocks() {
    this.state.categories.length === 0 && (this.mergeCategories(xe), this.mergeCategories(this.loadUserCategories()));
    const e = new Set(this.state.categories.map((a) => this.normalizeCategory(a)));
    this.state.categories = Array.from(e);
    for (const a of this.state.blocks) {
      const r = this.normalizeCategory(a.category || "");
      r && !e.has(r) && (e.add(r), this.state.categories.push(r));
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  normalizeCategory(e) {
    return e.trim().toLowerCase();
  }
  mergeCategories(e) {
    for (const a of e) {
      const r = this.normalizeCategory(a);
      r && (this.state.categories.includes(r) || this.state.categories.push(r));
    }
  }
  loadUserCategories() {
    const e = H(sessionStorage.getItem("block-library-user-categories"), []);
    return Array.isArray(e) ? e.map((a) => this.normalizeCategory(a)).filter((a) => a.length > 0) : [];
  }
  persistUserCategories() {
    const e = this.state.categories.filter((a) => !xe.includes(a));
    try {
      sessionStorage.setItem("block-library-user-categories", JSON.stringify(e));
    } catch {
    }
  }
  addCategory(e) {
    const a = this.normalizeCategory(e);
    return a ? (this.state.categories.includes(a) || (this.state.categories.push(a), this.persistUserCategories(), this.renderCategoryOptions(), this.updateCreateCategorySelect(a), this.renderEditor()), a) : null;
  }
  updateCreateCategorySelect(e) {
    const a = this.listEl?.querySelector("[data-create-category]");
    if (!a) return;
    const r = e ?? a.value;
    a.innerHTML = this.state.categories.map((s) => `<option value="${n(s)}">${n(q(s))}</option>`).join(""), a.innerHTML += '<option value="__add__">Add category...</option>', r && this.state.categories.includes(r) && (a.value = r);
  }
  promptForCategory(e, a) {
    new Q({
      title: "Add Category",
      label: "Category name",
      placeholder: "e.g. marketing",
      confirmLabel: "Add",
      inputClass: g(),
      onConfirm: (r) => {
        const s = this.addCategory(r);
        if (s) {
          this.updateCreateCategorySelect(s), e.value = s, e.dataset.prevValue = s;
          return;
        }
        e.value = a;
      },
      onCancel: () => {
        e.value = a;
      }
    }).show();
  }
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
        <div class="mx-4 my-6 rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20">
          <div class="flex items-start gap-2">
            <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-xs text-red-700 dark:text-red-300">${n(this.state.error)}</p>
          </div>
          <button type="button" data-block-ide-retry
                  class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Retry
          </button>
        </div>`;
      return;
    }
    const e = this.getFilteredBlocks();
    if (e.length === 0) {
      const r = this.state.search || this.state.categoryFilter, s = this.normalizeChannel(this.currentChannel), i = s === $, o = r ? "" : i ? `No block definitions were found in the "${$}" channel.` : `No block definitions were found in channel "${s}".`, l = !r && !i ? `<button type="button"
                 data-block-ide-empty-reset-channel
                 class="mt-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
               Reset to Default Channel
             </button>` : "", c = !r && this.channelDiagnostics ? `<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Visible in active channel: ${this.channelDiagnostics.total_effective}. Default channel total: ${this.channelDiagnostics.total_default}.</p>` : "";
      this.listEl.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">${r ? "No blocks match your filters." : "No blocks yet."}</p>
          ${r ? "" : '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "New Block" to create your first block definition.</p>'}
          ${o ? `<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-2">${n(o)}</p>` : ""}
          ${c}
          ${l}
        </div>`;
      return;
    }
    let a = "";
    this.state.isCreating && (a += this.renderCreateForm()), a += '<ul class="p-2 space-y-0.5">';
    for (const r of e) a += this.renderBlockItem(r);
    if (a += "</ul>", this.listEl.innerHTML = a, this.state.isCreating) {
      const r = this.listEl.querySelector("[data-create-name]"), s = this.listEl.querySelector("[data-create-slug]"), i = this.listEl.querySelector("[data-create-category]");
      r?.focus(), r && s && (r.addEventListener("input", () => {
        s.dataset.userModified || (s.value = we(r.value));
      }), s.addEventListener("input", () => {
        s.dataset.userModified = "true";
      })), i && (i.dataset.prevValue = i.value, i.addEventListener("change", () => {
        const o = i.value;
        if (o === "__add__") {
          const l = i.dataset.prevValue ?? "";
          this.promptForCategory(i, l);
          return;
        }
        i.dataset.prevValue = o;
      }));
    }
    if (this.state.renamingBlockId) {
      const r = this.listEl.querySelector("[data-rename-input]");
      r?.focus(), r?.select();
    }
  }
  renderBlockItem(e) {
    const a = e.id === this.state.selectedBlockId, r = e.id === this.state.renamingBlockId, s = this.state.dirtyBlocks.has(e.id), i = this.state.savingBlocks.has(e.id), o = this.state.saveErrors.get(e.id), l = e.slug || e.type || "", c = a ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" : "hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent", d = r ? `<input type="text" data-rename-input data-rename-block-id="${n(e.id)}"
               value="${n(e.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />` : `<span class="block font-medium text-gray-800 dark:text-gray-100 truncate text-[13px]">${n(e.name || "Untitled")}</span>`;
    let h = "";
    return o ? h = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Save failed: ${n(o)}"></span>` : i ? h = '<span class="flex-shrink-0 w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" title="Saving..."></span>' : s ? h = '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes"></span>' : h = $t(e.status), `
      <li>
        <div data-block-id="${n(e.id)}"
             class="relative group w-full text-left px-3 py-2 text-sm rounded-lg border ${c} transition-colors flex items-center gap-2.5 cursor-pointer">
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            ${e.icon ? te(e.icon) : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>'}
          </span>
          <span class="flex-1 min-w-0">
            ${d}
            <span class="block text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">${n(l)}</span>
          </span>
          ${h}
          <button type="button" data-block-actions="${n(e.id)}"
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
                   class="${g()}" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Slug</label>
            <input type="text" data-create-slug placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_\\-]*$"
                   class="${g()} font-mono" />
            <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Category</label>
            <select data-create-category
                    class="${M()}">
              ${this.state.categories.map((e) => `<option value="${n(e)}">${n(q(e))}</option>`).join("")}
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
  renderContextMenu(e, a) {
    this.closeContextMenu();
    const r = this.state.blocks.find((h) => h.id === e);
    if (!r) return;
    const s = document.createElement("div");
    s.setAttribute("data-block-context-menu", e), s.className = "absolute z-50 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm text-gray-700 dark:text-gray-300";
    const i = [{
      label: "Rename",
      action: "rename",
      icon: J.rename
    }, {
      label: "Duplicate",
      action: "duplicate",
      icon: J.duplicate
    }];
    r.status === "draft" ? i.push({
      label: "Publish",
      action: "publish",
      icon: J.publish
    }) : r.status === "active" && i.push({
      label: "Deprecate",
      action: "deprecate",
      icon: J.deprecate
    }), i.push({
      label: "Delete",
      action: "delete",
      icon: J.delete,
      danger: !0
    }), s.innerHTML = i.map((h) => `
        <button type="button" data-menu-action="${h.action}" data-menu-block-id="${n(e)}"
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${h.danger ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : ""}">
          ${h.icon}
          <span>${h.label}</span>
        </button>`).join("");
    const o = a.getBoundingClientRect(), l = 176;
    s.style.position = "fixed", s.style.top = `${o.bottom + 4}px`;
    let c = o.left;
    c + l > window.innerWidth - 8 && (c = window.innerWidth - l - 8), c < 8 && (c = 8), s.style.left = `${c}px`, document.body.appendChild(s);
    const d = s.getBoundingClientRect();
    d.bottom > window.innerHeight - 8 && (s.style.top = `${o.top - d.height - 4}px`), s.addEventListener("click", (h) => {
      const y = h.target.closest("[data-menu-action]");
      if (!y) return;
      const u = y.dataset.menuAction, f = y.dataset.menuBlockId;
      this.closeContextMenu(), this.handleAction(u, f);
    }), this.activeMenu = () => {
      s.remove(), this.activeMenu = null;
    };
  }
  closeContextMenu() {
    this.activeMenu && this.activeMenu();
  }
  renderCategoryOptions() {
    if (this.categorySelect) {
      this.categorySelect.innerHTML = '<option value="">All Categories</option>';
      for (const e of this.state.categories) {
        const a = document.createElement("option");
        a.value = e, a.textContent = q(e), e === this.state.categoryFilter && (a.selected = !0), this.categorySelect.appendChild(a);
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
    this.editorPanel ? this.editorPanel.update(e) : (this.editorPanel = new ka({
      container: this.editorEl,
      block: e,
      categories: this.state.categories,
      api: this.api,
      onMetadataChange: (a, r) => this.handleEditorMetadataChange(a, r),
      onSchemaChange: (a, r) => this.handleEditorSchemaChange(a, r),
      onFieldDrop: (a) => this.handlePaletteAddField(a),
      onAddFieldClick: () => this.handleAddFieldClick(),
      onStatusChange: (a, r) => this.handleEditorStatusChange(a, r),
      onSave: (a) => this.saveBlock(a)
    }), this.editorPanel.render()), this.palettePanel?.enable(), this.updateAddFieldBar();
  }
  handleEditorMetadataChange(e, a) {
    const r = this.state.blocks.findIndex((o) => o.id === e);
    if (r < 0) return;
    const s = this.state.blocks[r], i = {
      ...s,
      ...a
    };
    if (a.slug !== void 0 && a.slug !== s.slug) {
      const o = (a.slug ?? "").trim();
      o && (!a.type && (!s.type || s.type === s.slug) && (i.type = o, a.type = o), i.schema && typeof i.schema == "object" && (i.schema = {
        ...i.schema,
        $id: o
      }));
    }
    this.state.blocks[r] = i, this.markDirty(e), (a.name !== void 0 || a.status !== void 0 || a.slug !== void 0 || a.type !== void 0) && this.updateBlockItemDOM(e, i), this.scheduleSave(e);
  }
  handleEditorSchemaChange(e, a) {
    const r = this.state.blocks.findIndex((o) => o.id === e);
    if (r < 0) return;
    const s = this.state.blocks[r].schema;
    let i = Ge(a, this.state.blocks[r].slug || this.state.blocks[r].type);
    i = this.mergeSchemaExtras(s, i), this.state.blocks[r] = {
      ...this.state.blocks[r],
      schema: i
    }, this.markDirty(e), this.scheduleSave(e);
  }
  handleAddFieldClick() {
    this.paletteEl && this.paletteEl.offsetParent !== null ? this.paletteEl.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    }) : this.paletteTriggerBtn && this.openPalettePopover(this.paletteTriggerBtn);
  }
  handlePaletteAddField(e) {
    if (!this.editorPanel || !this.state.selectedBlockId) return;
    const a = e.type === "blocks", r = a ? "Content Blocks" : e?.label ?? q(e.type), s = a ? "content_blocks" : e.type.replace(/-/g, "_"), i = new Set(this.editorPanel.getFields().map((d) => d.name));
    let o = s, l = 1;
    for (; i.has(o); ) o = a ? `content_blocks_${l++}` : `${s}_${l++}`;
    const c = {
      id: U(),
      name: o,
      type: e.type,
      label: l > 1 && a ? `Content Blocks ${l - 1}` : r,
      required: !1,
      ...e.defaultConfig ?? {}
    };
    this.editorPanel.addField(c), this.handleEditorSchemaChange(this.state.selectedBlockId, this.editorPanel.getFields());
  }
  getFilteredBlocks() {
    let e = [...this.state.blocks];
    if (this.state.search) {
      const a = this.state.search.toLowerCase();
      e = e.filter((r) => r.name.toLowerCase().includes(a) || r.type.toLowerCase().includes(a) || (r.slug?.toLowerCase().includes(a) ?? !1) || (r.description?.toLowerCase().includes(a) ?? !1));
    }
    if (this.state.categoryFilter) {
      const a = this.state.categoryFilter.toLowerCase().trim();
      e = e.filter((r) => (r.category || "custom").toLowerCase().trim() === a);
    }
    return e;
  }
  handleListClick(e) {
    const a = e.target;
    if (a.closest("[data-block-ide-retry]")) {
      this.loadBlocks();
      return;
    }
    if (a.closest("[data-block-ide-empty-reset-channel], [data-block-ide-empty-reset-env]")) {
      this.setChannel($);
      return;
    }
    if (a.closest("[data-create-save]")) {
      this.handleCreateSave();
      return;
    }
    if (a.closest("[data-create-cancel]")) {
      this.cancelCreate();
      return;
    }
    const r = a.closest("[data-block-actions]");
    if (r) {
      e.stopPropagation();
      const i = r.dataset.blockActions;
      this.renderContextMenu(i, r);
      return;
    }
    if (a.closest("[data-rename-input]")) {
      e.stopPropagation();
      return;
    }
    const s = a.closest("[data-block-id]");
    if (s) {
      const i = s.dataset.blockId;
      this.selectBlock(i);
      return;
    }
  }
  handleAction(e, a) {
    switch (e) {
      case "rename":
        this.startRename(a);
        break;
      case "duplicate":
        this.duplicateBlock(a);
        break;
      case "publish":
        this.publishBlock(a);
        break;
      case "deprecate":
        this.deprecateBlock(a);
        break;
      case "delete":
        this.deleteBlock(a);
        break;
    }
  }
  showCreateForm() {
    this.state.isCreating = !0, this.renderBlockList();
  }
  cancelCreate() {
    this.state.isCreating = !1, this.renderBlockList();
  }
  async handleCreateSave() {
    const e = this.listEl?.querySelector("[data-create-name]"), a = this.listEl?.querySelector("[data-create-slug]"), r = this.listEl?.querySelector("[data-create-category]"), s = this.listEl?.querySelector("[data-create-error]"), i = e?.value.trim() ?? "", o = a?.value.trim() ?? "";
    let l = r?.value ?? "custom";
    if (l === "__add__" && (l = "custom"), !i) {
      this.showCreateError(s, "Name is required."), e?.focus();
      return;
    }
    if (!o) {
      this.showCreateError(s, "Slug is required."), a?.focus();
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(o)) {
      this.showCreateError(s, "Slug must start with a letter and contain only lowercase, numbers, hyphens, underscores."), a?.focus();
      return;
    }
    const c = this.listEl?.querySelector("[data-create-save]");
    c && (c.disabled = !0, c.textContent = "Creating...");
    try {
      const d = await this.api.createBlockDefinition({
        name: i,
        slug: o,
        type: o,
        category: l,
        status: "draft",
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {}
        }
      });
      d.slug || (d.slug = o), d.type || (d.type = d.slug || o);
      const h = this.normalizeBlockDefinition(d);
      this.state.isCreating = !1, this.state.blocks.unshift(h), this.state.selectedBlockId = h.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (d) {
      const h = d instanceof re ? d.message : "Failed to create block.";
      this.showCreateError(s, h), c && (c.disabled = !1, c.textContent = "Create");
    }
  }
  showCreateError(e, a) {
    e && (e.textContent = a, e.classList.remove("hidden"));
  }
  startRename(e) {
    this.state.renamingBlockId = e, this.renderBlockList();
    const a = this.listEl?.querySelector("[data-rename-input]");
    a && (a.addEventListener("keydown", (r) => {
      r.key === "Enter" && (r.preventDefault(), this.commitRename(e, a.value.trim())), r.key === "Escape" && (r.preventDefault(), this.cancelRename());
    }), a.addEventListener("blur", () => {
      const r = this.state.blocks.find((s) => s.id === e);
      r && a.value.trim() && a.value.trim() !== r.name ? this.commitRename(e, a.value.trim()) : this.cancelRename();
    }));
  }
  async commitRename(e, a) {
    if (!a) {
      this.cancelRename();
      return;
    }
    const r = this.state.blocks.find((s) => s.id === e);
    if (!r || r.name === a) {
      this.cancelRename();
      return;
    }
    try {
      const s = await this.api.updateBlockDefinition(e, { name: a });
      this.updateBlockInState(e, s);
    } catch (s) {
      console.error("Rename failed:", s);
    } finally {
      this.state.renamingBlockId = null, this.renderBlockList();
    }
  }
  cancelRename() {
    this.state.renamingBlockId = null, this.renderBlockList();
  }
  async duplicateBlock(e) {
    const a = this.state.blocks.find((i) => i.id === e);
    if (!a) return;
    const r = `${(a.slug || a.type || "block").trim()}_copy`, s = r;
    try {
      const i = await this.api.cloneBlockDefinition(e, s, r), o = this.normalizeBlockDefinition(i);
      this.state.blocks.unshift(o), this.state.selectedBlockId = o.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (i) {
      console.error("Duplicate failed:", i), this.showToast(i instanceof Error ? i.message : "Failed to duplicate block.", "error");
    }
  }
  async publishBlock(e) {
    if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
      this.showToast("Please fix save errors before publishing.", "error");
      return;
    }
    try {
      const a = await this.api.publishBlockDefinition(e);
      if (this.updateBlockInState(e, a), this.renderBlockList(), this.showToast("Block published.", "success"), this.state.selectedBlockId === e && this.editorPanel) {
        const r = this.state.blocks.find((s) => s.id === e);
        r && this.editorPanel.update(r);
      }
    } catch (a) {
      console.error("Publish failed:", a), this.showToast(a instanceof Error ? a.message : "Failed to publish block.", "error");
    }
  }
  async deprecateBlock(e) {
    if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
      this.showToast("Please fix save errors before deprecating.", "error");
      return;
    }
    try {
      const a = await this.api.deprecateBlockDefinition(e);
      if (this.updateBlockInState(e, a), this.renderBlockList(), this.showToast("Block deprecated.", "info"), this.state.selectedBlockId === e && this.editorPanel) {
        const r = this.state.blocks.find((s) => s.id === e);
        r && this.editorPanel.update(r);
      }
    } catch (a) {
      console.error("Deprecate failed:", a), this.showToast(a instanceof Error ? a.message : "Failed to deprecate block.", "error");
    }
  }
  async deleteBlock(e) {
    const a = this.state.blocks.find((r) => r.id === e);
    if (a && await Y.confirm(`Delete "${a.name}"? This cannot be undone.`, {
      title: "Delete Block",
      confirmText: "Delete",
      confirmVariant: "danger"
    }))
      try {
        await this.api.deleteBlockDefinition(e), this.state.blocks = this.state.blocks.filter((r) => r.id !== e), this.state.dirtyBlocks.delete(e), this.state.savingBlocks.delete(e), this.state.saveErrors.delete(e), this.state.selectedBlockId === e && (this.state.selectedBlockId = null, this.renderEditor()), this.updateCount(), this.renderBlockList();
      } catch (r) {
        console.error("Delete failed:", r), this.showToast(r instanceof Error ? r.message : "Failed to delete block.", "error");
      }
  }
  updateBlockItemDOM(e, a) {
    const r = this.listEl?.querySelector(`[data-block-id="${e}"]`);
    if (!r) return;
    const s = r.querySelector(".flex-1.min-w-0");
    if (!s) return;
    const i = s.querySelectorAll(":scope > span");
    i.length >= 1 && !this.state.renamingBlockId && (i[0].textContent = a.name || "Untitled"), i.length >= 2 && (i[1].textContent = a.slug || a.type || "");
  }
  updateBlockInState(e, a) {
    const r = this.state.blocks.findIndex((s) => s.id === e);
    if (r >= 0) {
      const s = this.state.blocks[r], i = this.mergeBlockDefinition(s, a);
      this.state.blocks[r] = i;
    }
  }
  normalizeBlockDefinition(e) {
    const a = { ...e }, r = (a.slug ?? "").trim(), s = (a.type ?? "").trim();
    return !r && s && (a.slug = s), !s && r && (a.type = r), a;
  }
  mergeBlockDefinition(e, a) {
    const r = {
      ...e,
      ...a
    };
    a.icon == null && e.icon && (r.icon = e.icon), a.description == null && e.description && (r.description = e.description), a.category == null && e.category && (r.category = e.category);
    const s = (a.slug ?? "").trim(), i = (a.type ?? "").trim();
    !s && e.slug && (r.slug = e.slug), !i && e.type && (r.type = e.type);
    const o = (r.slug ?? "").trim(), l = (r.type ?? "").trim();
    return !o && l && (r.slug = l), !l && o && (r.type = o), r;
  }
  mergeSchemaExtras(e, a) {
    if (!e || typeof e != "object") return a;
    const r = { ...a }, s = /* @__PURE__ */ new Set([
      "properties",
      "required",
      "type",
      "$schema"
    ]);
    for (const [i, o] of Object.entries(e))
      if (!s.has(i)) {
        if (i === "$id") {
          !r.$id && o && (r.$id = o);
          continue;
        }
        i in r || (r[i] = o);
      }
    return r;
  }
  showToast(e, a = "info") {
    const r = window.notify?.[a];
    if (typeof r == "function") {
      r(e);
      return;
    }
    const s = this.root.querySelector("[data-ide-toast]");
    s && s.remove();
    const i = a === "error" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800" : a === "success" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800" : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800", o = document.createElement("div");
    o.setAttribute("data-ide-toast", ""), o.className = `fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg border text-sm font-medium shadow-lg ${i} transition-opacity`, o.textContent = e, document.body.appendChild(o), setTimeout(() => {
      o.style.opacity = "0", setTimeout(() => o.remove(), 300);
    }, 3e3);
  }
};
ot = nt;
ot.AUTOSAVE_DELAY = 1500;
var J = {
  rename: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  duplicate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  publish: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  deprecate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>',
  delete: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'
};
function xa(t = document) {
  Array.from(t.querySelectorAll("[data-block-library-ide]")).forEach((e) => {
    if (e.dataset.ideInitialized !== "true")
      try {
        new nt(e).init(), e.dataset.ideInitialized = "true";
      } catch (a) {
        console.error("Block Library IDE failed to initialize:", a);
      }
  });
}
function wa(t = document) {
  Array.from(t.querySelectorAll("[data-content-type-editor-root]")).forEach((e) => {
    if (e.dataset.initialized === "true") return;
    const a = Sa(e);
    if (!a.apiBasePath) {
      console.warn("Content type editor missing apiBasePath", e);
      return;
    }
    const r = a.basePath ?? Me(a.apiBasePath), s = String(a.channel ?? "").trim().toLowerCase(), i = s && s !== "default" ? `channel=${encodeURIComponent(s)}` : "";
    a.onCancel || (a.onCancel = () => {
      const o = `${r}/content/types`;
      window.location.href = i ? `${o}?${i}` : o;
    }), a.onSave || (a.onSave = (o) => {
      const l = o.slug ?? o.id;
      if (l) {
        const c = [`slug=${encodeURIComponent(l)}`];
        i && c.push(i), window.location.href = `${r}/content/types?${c.join("&")}`;
      }
    });
    try {
      new ua(e, a).init(), e.dataset.initialized = "true";
    } catch (o) {
      console.error("Content type editor failed to initialize:", o), e.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${o instanceof Error ? o.message : "An unexpected error occurred while initializing the editor."}
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
function Sa(t) {
  let e = {};
  const a = t.getAttribute("data-content-type-editor-config");
  a && (e = H(a, {}));
  const r = be(e.apiBasePath, t.dataset.apiBasePath, t.dataset.basePath), s = e.basePath ?? Me(r, t.dataset.basePath);
  return {
    ...e,
    apiBasePath: r,
    basePath: s,
    contentTypeId: e.contentTypeId ?? t.dataset.contentTypeId,
    channel: e.channel ?? t.dataset.channel,
    locale: e.locale ?? t.dataset.locale
  };
}
Oe(() => {
  wa(), xa();
});
export {
  ka as BlockEditorPanel,
  nt as BlockLibraryIDE,
  fa as BlockLibraryManager,
  R as ContentTypeAPIClient,
  re as ContentTypeAPIError,
  ua as ContentTypeEditor,
  Ke as FIELD_CATEGORIES,
  pe as FIELD_TYPES,
  he as FieldConfigForm,
  Be as FieldPalettePanel,
  Je as FieldTypePicker,
  Kt as LayoutEditor,
  ue as PALETTE_DRAG_MIME,
  ne as fieldsToSchema,
  U as generateFieldId,
  ge as getFieldTypeMetadata,
  qa as getFieldTypesByCategory,
  Ye as getIconTabs,
  xa as initBlockLibraryIDE,
  va as initBlockLibraryManagers,
  wa as initContentTypeEditors,
  Da as registerIconTab,
  te as resolveIcon,
  le as schemaToFields,
  za as unregisterIconTab
};

//# sourceMappingURL=index.js.map