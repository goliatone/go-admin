import { n as Mu } from "./chunk-BUbnbzFL.js";
import { a as Eu, i as _, n as u, r as g, t as a } from "./classPrivateFieldGet2-dZB8y7sE.js";
function da(i) {
  "@babel/helpers - typeof";
  return da = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, da(i);
}
function Cu(i, t) {
  if (da(i) != "object" || !i) return i;
  var e = i[Symbol.toPrimitive];
  if (e !== void 0) {
    var s = e.call(i, t || "default");
    if (da(s) != "object") return s;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(i);
}
function Pu(i) {
  var t = Cu(i, "string");
  return da(t) == "symbol" ? t : t + "";
}
function L(i, t, e) {
  return (t = Pu(t)) in i ? Object.defineProperty(i, t, {
    value: e,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : i[t] = e, i;
}
function G(i, t) {
  Eu(i, t), t.add(i);
}
function Vr(i, t, e) {
  t || (t = []);
  var s = t.length++;
  return Object.defineProperty({}, "_", { set: function(r) {
    t[s] = r, i.apply(e, t);
  } });
}
var Tu = /* @__PURE__ */ Mu({
  AbortException: () => lm,
  AnnotationEditorLayer: () => cm,
  AnnotationEditorParamsType: () => dm,
  AnnotationEditorType: () => um,
  AnnotationEditorUIManager: () => pm,
  AnnotationLayer: () => gm,
  AnnotationMode: () => fm,
  ColorPicker: () => mm,
  DOMSVGFactory: () => vm,
  DrawLayer: () => _m,
  FeatureTest: () => bm,
  GlobalWorkerOptions: () => wm,
  ImageKind: () => Am,
  InvalidPDFException: () => ym,
  MissingPDFException: () => xm,
  OPS: () => Sm,
  OutputScale: () => km,
  PDFDataRangeTransport: () => Mm,
  PDFDateString: () => Em,
  PDFWorker: () => Cm,
  PasswordResponses: () => Pm,
  PermissionFlag: () => Tm,
  PixelsPerInch: () => Rm,
  RenderingCancelledException: () => Dm,
  TextLayer: () => Im,
  TouchManager: () => Lm,
  UnexpectedResponseException: () => Fm,
  Util: () => Nm,
  VerbosityLevel: () => Om,
  XfaLayer: () => Wm,
  build: () => Bm,
  createValidAbsoluteUrl: () => Hm,
  fetchData: () => $m,
  getDocument: () => zm,
  getFilenameFromUrl: () => Gm,
  getPdfFilenameFromUrl: () => jm,
  getXfaPageViewport: () => Vm,
  isDataScheme: () => Um,
  isPdfFile: () => qm,
  noContextMenu: () => Xm,
  normalizeUnicode: () => Ym,
  setLayerDimensions: () => Km,
  shadow: () => Qm,
  stopEvent: () => Jm,
  version: () => Zm
}), mr, Mh, ld, cd, Kt, It, Ns, Os, ki, ni, zt, Ui, Oe, R, Nn, dd, ud, ua, pd, gd, Ur, fd, Eh = {
  d: (i, t) => {
    for (var e in t) Eh.o(t, e) && !Eh.o(i, e) && Object.defineProperty(i, e, {
      enumerable: !0,
      get: t[e]
    });
  },
  o: (i, t) => Object.prototype.hasOwnProperty.call(i, t)
}, N = globalThis.pdfjsLib = {};
Eh.d(N, {
  AbortException: () => Ei,
  AnnotationEditorLayer: () => Su,
  AnnotationEditorParamsType: () => U,
  AnnotationEditorType: () => W,
  AnnotationEditorUIManager: () => hs,
  AnnotationLayer: () => Af,
  AnnotationMode: () => xi,
  ColorPicker: () => Yl,
  DOMSVGFactory: () => Vl,
  DrawLayer: () => ku,
  FeatureTest: () => Gt,
  GlobalWorkerOptions: () => Js,
  ImageKind: () => _r,
  InvalidPDFException: () => Ph,
  MissingPDFException: () => pa,
  OPS: () => ve,
  OutputScale: () => Ol,
  PDFDataRangeTransport: () => tu,
  PDFDateString: () => wd,
  PDFWorker: () => na,
  PasswordResponses: () => hp,
  PermissionFlag: () => Ou,
  PixelsPerInch: () => Le,
  RenderingCancelledException: () => Fl,
  TextLayer: () => Jr,
  TouchManager: () => Hl,
  UnexpectedResponseException: () => Xr,
  Util: () => C,
  VerbosityLevel: () => ho,
  XfaLayer: () => iu,
  build: () => Yg,
  createValidAbsoluteUrl: () => dp,
  fetchData: () => po,
  getDocument: () => Hg,
  getFilenameFromUrl: () => gp,
  getPdfFilenameFromUrl: () => fp,
  getXfaPageViewport: () => mp,
  isDataScheme: () => go,
  isPdfFile: () => Nl,
  noContextMenu: () => ke,
  normalizeUnicode: () => pp,
  setLayerDimensions: () => os,
  shadow: () => $,
  stopEvent: () => ie,
  version: () => Xg
});
var Dt = !(typeof process != "object" || process + "" != "[object process]" || process.versions.nw || process.versions.electron && process.type && process.type !== "browser"), md = [
  1,
  0,
  0,
  1,
  0,
  0
], Ch = [
  1e-3,
  0,
  0,
  1e-3,
  0,
  0
], wo = 1.35, Ru = 1, Rl = 2, qr = 4, Du = 16, Iu = 32, Lu = 64, Fu = 128, Nu = 256, xi = {
  DISABLE: 0,
  ENABLE: 1,
  ENABLE_FORMS: 2,
  ENABLE_STORAGE: 3
}, W = {
  DISABLE: -1,
  NONE: 0,
  FREETEXT: 3,
  HIGHLIGHT: 9,
  STAMP: 13,
  INK: 15
}, U = {
  RESIZE: 1,
  CREATE: 2,
  FREETEXT_SIZE: 11,
  FREETEXT_COLOR: 12,
  FREETEXT_OPACITY: 13,
  INK_COLOR: 21,
  INK_THICKNESS: 22,
  INK_OPACITY: 23,
  HIGHLIGHT_COLOR: 31,
  HIGHLIGHT_DEFAULT_COLOR: 32,
  HIGHLIGHT_THICKNESS: 33,
  HIGHLIGHT_FREE: 34,
  HIGHLIGHT_SHOW_ALL: 35,
  DRAW_STEP: 41
}, Ou = {
  PRINT: 4,
  MODIFY_CONTENTS: 8,
  COPY: 16,
  MODIFY_ANNOTATIONS: 32,
  FILL_INTERACTIVE_FORMS: 256,
  COPY_FOR_ACCESSIBILITY: 512,
  ASSEMBLE: 1024,
  PRINT_HIGH_QUALITY: 2048
}, vr = 0, Ao = 1, Zs = 2, Wu = 3, Ql = 3, Bu = 4, _r = {
  GRAYSCALE_1BPP: 1,
  RGB_24BPP: 2,
  RGBA_32BPP: 3
}, Hu = 1, $u = 2, zu = 3, Gu = 4, ju = 5, Vu = 6, Uu = 7, qu = 8, Xu = 9, Yu = 10, Ku = 11, Qu = 12, Ju = 13, Zu = 14, tp = 15, vd = 16, ep = 17, ip = 20, sp = 1, np = 2, ap = 3, rp = 4, op = 5, ho = {
  ERRORS: 0,
  WARNINGS: 1,
  INFOS: 5
}, ve = {
  dependency: 1,
  setLineWidth: 2,
  setLineCap: 3,
  setLineJoin: 4,
  setMiterLimit: 5,
  setDash: 6,
  setRenderingIntent: 7,
  setFlatness: 8,
  setGState: 9,
  save: 10,
  restore: 11,
  transform: 12,
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  curveTo2: 16,
  curveTo3: 17,
  closePath: 18,
  rectangle: 19,
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  clip: 29,
  eoClip: 30,
  beginText: 31,
  endText: 32,
  setCharSpacing: 33,
  setWordSpacing: 34,
  setHScale: 35,
  setLeading: 36,
  setFont: 37,
  setTextRenderingMode: 38,
  setTextRise: 39,
  moveText: 40,
  setLeadingMoveText: 41,
  setTextMatrix: 42,
  nextLine: 43,
  showText: 44,
  showSpacedText: 45,
  nextLineShowText: 46,
  nextLineSetSpacingShowText: 47,
  setCharWidth: 48,
  setCharWidthAndBounds: 49,
  setStrokeColorSpace: 50,
  setFillColorSpace: 51,
  setStrokeColor: 52,
  setStrokeColorN: 53,
  setFillColor: 54,
  setFillColorN: 55,
  setStrokeGray: 56,
  setFillGray: 57,
  setStrokeRGBColor: 58,
  setFillRGBColor: 59,
  setStrokeCMYKColor: 60,
  setFillCMYKColor: 61,
  shadingFill: 62,
  beginInlineImage: 63,
  beginImageData: 64,
  endInlineImage: 65,
  paintXObject: 66,
  markPoint: 67,
  markPointProps: 68,
  beginMarkedContent: 69,
  beginMarkedContentProps: 70,
  endMarkedContent: 71,
  beginCompat: 72,
  endCompat: 73,
  paintFormXObjectBegin: 74,
  paintFormXObjectEnd: 75,
  beginGroup: 76,
  endGroup: 77,
  beginAnnotation: 80,
  endAnnotation: 81,
  paintImageMaskXObject: 83,
  paintImageMaskXObjectGroup: 84,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintInlineImageXObjectGroup: 87,
  paintImageXObjectRepeat: 88,
  paintImageMaskXObjectRepeat: 89,
  paintSolidColorImageMask: 90,
  constructPath: 91,
  setStrokeTransparent: 92,
  setFillTransparent: 93
}, hp = {
  NEED_PASSWORD: 1,
  INCORRECT_PASSWORD: 2
}, lo = ho.WARNINGS;
function lp(i) {
  Number.isInteger(i) && (lo = i);
}
function cp() {
  return lo;
}
function co(i) {
  lo >= ho.INFOS && console.log(`Info: ${i}`);
}
function B(i) {
  lo >= ho.WARNINGS && console.log(`Warning: ${i}`);
}
function et(i) {
  throw new Error(i);
}
function ut(i, t) {
  i || et(t);
}
function dp(i, t = null, e = null) {
  if (!i) return null;
  try {
    if (e && typeof i == "string" && (e.addDefaultProtocol && i.startsWith("www.") && i.match(/\./g)?.length >= 2 && (i = `http://${i}`), e.tryConvertEncoding))
      try {
        i = (function(r) {
          return decodeURIComponent(escape(r));
        })(i);
      } catch {
      }
    const s = t ? new URL(i, t) : new URL(i);
    if ((function(r) {
      switch (r?.protocol) {
        case "http:":
        case "https:":
        case "ftp:":
        case "mailto:":
        case "tel:":
          return !0;
        default:
          return !1;
      }
    })(s)) return s;
  } catch {
  }
  return null;
}
function $(i, t, e, s = !1) {
  return Object.defineProperty(i, t, {
    value: e,
    enumerable: !s,
    configurable: !0,
    writable: !1
  }), e;
}
var Pi = (function() {
  function t(e, s) {
    this.message = e, this.name = s;
  }
  return t.prototype = /* @__PURE__ */ new Error(), t.constructor = t, t;
})(), Jl = class extends Pi {
  constructor(i, t) {
    super(i, "PasswordException"), this.code = t;
  }
}, yo = class extends Pi {
  constructor(i, t) {
    super(i, "UnknownErrorException"), this.details = t;
  }
}, Ph = class extends Pi {
  constructor(i) {
    super(i, "InvalidPDFException");
  }
}, pa = class extends Pi {
  constructor(i) {
    super(i, "MissingPDFException");
  }
}, Xr = class extends Pi {
  constructor(i, t) {
    super(i, "UnexpectedResponseException"), this.status = t;
  }
}, up = class extends Pi {
  constructor(i) {
    super(i, "FormatError");
  }
}, Ei = class extends Pi {
  constructor(i) {
    super(i, "AbortException");
  }
};
function _d(i) {
  typeof i == "object" && i?.length !== void 0 || et("Invalid argument for bytesToString");
  const t = i.length, e = 8192;
  if (t < e) return String.fromCharCode.apply(null, i);
  const s = [];
  for (let n = 0; n < t; n += e) {
    const r = Math.min(n + e, t), o = i.subarray(n, r);
    s.push(String.fromCharCode.apply(null, o));
  }
  return s.join("");
}
function uo(i) {
  typeof i != "string" && et("Invalid argument for stringToBytes");
  const t = i.length, e = new Uint8Array(t);
  for (let s = 0; s < t; ++s) e[s] = 255 & i.charCodeAt(s);
  return e;
}
function Dl(i) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const [e, s] of i) t[e] = s;
  return t;
}
var Gt = class {
  static get isLittleEndian() {
    return $(this, "isLittleEndian", (function() {
      const t = new Uint8Array(4);
      return t[0] = 1, new Uint32Array(t.buffer, 0, 1)[0] === 1;
    })());
  }
  static get isEvalSupported() {
    return $(this, "isEvalSupported", (function() {
      try {
        return new Function(""), !0;
      } catch {
        return !1;
      }
    })());
  }
  static get isOffscreenCanvasSupported() {
    return $(this, "isOffscreenCanvasSupported", typeof OffscreenCanvas < "u");
  }
  static get isImageDecoderSupported() {
    return $(this, "isImageDecoderSupported", typeof ImageDecoder < "u");
  }
  static get platform() {
    return typeof navigator < "u" && typeof navigator?.platform == "string" ? $(this, "platform", {
      isMac: navigator.platform.includes("Mac"),
      isWindows: navigator.platform.includes("Win"),
      isFirefox: typeof navigator?.userAgent == "string" && navigator.userAgent.includes("Firefox")
    }) : $(this, "platform", {
      isMac: !1,
      isWindows: !1,
      isFirefox: !1
    });
  }
  static get isCSSRoundSupported() {
    return $(this, "isCSSRoundSupported", globalThis.CSS?.supports?.("width: round(1.5px, 1px)"));
  }
}, xo = Array.from(Array(256).keys(), ((i) => i.toString(16).padStart(2, "0"))), C = class Th {
  static makeHexColor(t, e, s) {
    return `#${xo[t]}${xo[e]}${xo[s]}`;
  }
  static scaleMinMax(t, e) {
    let s;
    t[0] ? (t[0] < 0 && (s = e[0], e[0] = e[2], e[2] = s), e[0] *= t[0], e[2] *= t[0], t[3] < 0 && (s = e[1], e[1] = e[3], e[3] = s), e[1] *= t[3], e[3] *= t[3]) : (s = e[0], e[0] = e[1], e[1] = s, s = e[2], e[2] = e[3], e[3] = s, t[1] < 0 && (s = e[1], e[1] = e[3], e[3] = s), e[1] *= t[1], e[3] *= t[1], t[2] < 0 && (s = e[0], e[0] = e[2], e[2] = s), e[0] *= t[2], e[2] *= t[2]), e[0] += t[4], e[1] += t[5], e[2] += t[4], e[3] += t[5];
  }
  static transform(t, e) {
    return [
      t[0] * e[0] + t[2] * e[1],
      t[1] * e[0] + t[3] * e[1],
      t[0] * e[2] + t[2] * e[3],
      t[1] * e[2] + t[3] * e[3],
      t[0] * e[4] + t[2] * e[5] + t[4],
      t[1] * e[4] + t[3] * e[5] + t[5]
    ];
  }
  static applyTransform(t, e) {
    return [t[0] * e[0] + t[1] * e[2] + e[4], t[0] * e[1] + t[1] * e[3] + e[5]];
  }
  static applyInverseTransform(t, e) {
    const s = e[0] * e[3] - e[1] * e[2];
    return [(t[0] * e[3] - t[1] * e[2] + e[2] * e[5] - e[4] * e[3]) / s, (-t[0] * e[1] + t[1] * e[0] + e[4] * e[1] - e[5] * e[0]) / s];
  }
  static getAxialAlignedBoundingBox(t, e) {
    const s = this.applyTransform(t, e), n = this.applyTransform(t.slice(2, 4), e), r = this.applyTransform([t[0], t[3]], e), o = this.applyTransform([t[2], t[1]], e);
    return [
      Math.min(s[0], n[0], r[0], o[0]),
      Math.min(s[1], n[1], r[1], o[1]),
      Math.max(s[0], n[0], r[0], o[0]),
      Math.max(s[1], n[1], r[1], o[1])
    ];
  }
  static inverseTransform(t) {
    const e = t[0] * t[3] - t[1] * t[2];
    return [
      t[3] / e,
      -t[1] / e,
      -t[2] / e,
      t[0] / e,
      (t[2] * t[5] - t[4] * t[3]) / e,
      (t[4] * t[1] - t[5] * t[0]) / e
    ];
  }
  static singularValueDecompose2dScale(t) {
    const e = [
      t[0],
      t[2],
      t[1],
      t[3]
    ], s = t[0] * e[0] + t[1] * e[2], n = t[0] * e[1] + t[1] * e[3], r = t[2] * e[0] + t[3] * e[2], o = t[2] * e[1] + t[3] * e[3], h = (s + o) / 2, l = Math.sqrt((s + o) ** 2 - 4 * (s * o - r * n)) / 2, c = h + l || 1, d = h - l || 1;
    return [Math.sqrt(c), Math.sqrt(d)];
  }
  static normalizeRect(t) {
    const e = t.slice(0);
    return t[0] > t[2] && (e[0] = t[2], e[2] = t[0]), t[1] > t[3] && (e[1] = t[3], e[3] = t[1]), e;
  }
  static intersect(t, e) {
    const s = Math.max(Math.min(t[0], t[2]), Math.min(e[0], e[2])), n = Math.min(Math.max(t[0], t[2]), Math.max(e[0], e[2]));
    if (s > n) return null;
    const r = Math.max(Math.min(t[1], t[3]), Math.min(e[1], e[3])), o = Math.min(Math.max(t[1], t[3]), Math.max(e[1], e[3]));
    return r > o ? null : [
      s,
      r,
      n,
      o
    ];
  }
  static bezierBoundingBox(t, e, s, n, r, o, h, l, c) {
    return c ? (c[0] = Math.min(c[0], t, h), c[1] = Math.min(c[1], e, l), c[2] = Math.max(c[2], t, h), c[3] = Math.max(c[3], e, l)) : c = [
      Math.min(t, h),
      Math.min(e, l),
      Math.max(t, h),
      Math.max(e, l)
    ], g(Th, this, Zl).call(this, t, s, r, h, e, n, o, l, 3 * (3 * (s - r) - t + h), 6 * (t - 2 * s + r), 3 * (s - t), c), g(Th, this, Zl).call(this, t, s, r, h, e, n, o, l, 3 * (3 * (n - o) - e + l), 6 * (e - 2 * n + o), 3 * (n - e), c), c;
  }
};
mr = C;
function So(i, t, e, s, n, r, o, h, l, c) {
  if (l <= 0 || l >= 1) return;
  const d = 1 - l, p = l * l, f = p * l, v = d * (d * (d * i + 3 * l * t) + 3 * p * e) + f * s, m = d * (d * (d * n + 3 * l * r) + 3 * p * o) + f * h;
  c[0] = Math.min(c[0], v), c[1] = Math.min(c[1], m), c[2] = Math.max(c[2], v), c[3] = Math.max(c[3], m);
}
function Zl(i, t, e, s, n, r, o, h, l, c, d, p) {
  if (Math.abs(l) < 1e-12) {
    Math.abs(c) >= 1e-12 && g(mr, this, So).call(this, i, t, e, s, n, r, o, h, -d / c, p);
    return;
  }
  const f = c ** 2 - 4 * d * l;
  if (f < 0) return;
  const v = Math.sqrt(f), m = 2 * l;
  g(mr, this, So).call(this, i, t, e, s, n, r, o, h, (-c + v) / m, p), g(mr, this, So).call(this, i, t, e, s, n, r, o, h, (-c - v) / m, p);
}
var ko = null, tc = null;
function pp(i) {
  return ko || (ko = /([\u00a0\u00b5\u037e\u0eb3\u2000-\u200a\u202f\u2126\ufb00-\ufb04\ufb06\ufb20-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufba1\ufba4-\ufba9\ufbae-\ufbb1\ufbd3-\ufbdc\ufbde-\ufbe7\ufbea-\ufbf8\ufbfc-\ufbfd\ufc00-\ufc5d\ufc64-\ufcf1\ufcf5-\ufd3d\ufd88\ufdf4\ufdfa-\ufdfb\ufe71\ufe77\ufe79\ufe7b\ufe7d]+)|(\ufb05+)/gu, tc = /* @__PURE__ */ new Map([["ﬅ", "ſt"]])), i.replaceAll(ko, ((t, e, s) => e ? e.normalize("NFKC") : tc.get(s)));
}
var Il = "pdfjs_internal_id_";
typeof Promise.try != "function" && (Promise.try = function(i, ...t) {
  return new Promise(((e) => {
    e(i(...t));
  }));
});
var ii = "http://www.w3.org/2000/svg", Le = class {
};
Mh = Le;
L(Le, "CSS", 96);
L(Le, "PDF", 72);
L(Le, "PDF_TO_CSS_UNITS", Mh.CSS / Mh.PDF);
async function po(i, t = "text") {
  if (On(i, document.baseURI)) {
    const e = await fetch(i);
    if (!e.ok) throw new Error(e.statusText);
    switch (t) {
      case "arraybuffer":
        return e.arrayBuffer();
      case "blob":
        return e.blob();
      case "json":
        return e.json();
    }
    return e.text();
  }
  return new Promise(((e, s) => {
    const n = new XMLHttpRequest();
    n.open("GET", i, !0), n.responseType = t, n.onreadystatechange = () => {
      if (n.readyState === XMLHttpRequest.DONE) if (n.status !== 200 && n.status !== 0) s(new Error(n.statusText));
      else {
        switch (t) {
          case "arraybuffer":
          case "blob":
          case "json":
            e(n.response);
            return;
        }
        e(n.responseText);
      }
    }, n.send(null);
  }));
}
var Ll = class bd {
  constructor({ viewBox: t, userUnit: e, scale: s, rotation: n, offsetX: r = 0, offsetY: o = 0, dontFlip: h = !1 }) {
    this.viewBox = t, this.userUnit = e, this.scale = s, this.rotation = n, this.offsetX = r, this.offsetY = o, s *= e;
    const l = (t[2] + t[0]) / 2, c = (t[3] + t[1]) / 2;
    let d, p, f, v, m, b, w, A;
    switch ((n %= 360) < 0 && (n += 360), n) {
      case 180:
        d = -1, p = 0, f = 0, v = 1;
        break;
      case 90:
        d = 0, p = 1, f = 1, v = 0;
        break;
      case 270:
        d = 0, p = -1, f = -1, v = 0;
        break;
      case 0:
        d = 1, p = 0, f = 0, v = -1;
        break;
      default:
        throw new Error("PageViewport: Invalid rotation, must be a multiple of 90 degrees.");
    }
    h && (f = -f, v = -v), d === 0 ? (m = Math.abs(c - t[1]) * s + r, b = Math.abs(l - t[0]) * s + o, w = (t[3] - t[1]) * s, A = (t[2] - t[0]) * s) : (m = Math.abs(l - t[0]) * s + r, b = Math.abs(c - t[1]) * s + o, w = (t[2] - t[0]) * s, A = (t[3] - t[1]) * s), this.transform = [
      d * s,
      p * s,
      f * s,
      v * s,
      m - d * s * l - f * s * c,
      b - p * s * l - v * s * c
    ], this.width = w, this.height = A;
  }
  get rawDims() {
    const { userUnit: t, viewBox: e } = this, s = e.map(((n) => n * t));
    return $(this, "rawDims", {
      pageWidth: s[2] - s[0],
      pageHeight: s[3] - s[1],
      pageX: s[0],
      pageY: s[1]
    });
  }
  clone({ scale: t = this.scale, rotation: e = this.rotation, offsetX: s = this.offsetX, offsetY: n = this.offsetY, dontFlip: r = !1 } = {}) {
    return new bd({
      viewBox: this.viewBox.slice(),
      userUnit: this.userUnit,
      scale: t,
      rotation: e,
      offsetX: s,
      offsetY: n,
      dontFlip: r
    });
  }
  convertToViewportPoint(t, e) {
    return C.applyTransform([t, e], this.transform);
  }
  convertToViewportRectangle(t) {
    const e = C.applyTransform([t[0], t[1]], this.transform), s = C.applyTransform([t[2], t[3]], this.transform);
    return [
      e[0],
      e[1],
      s[0],
      s[1]
    ];
  }
  convertToPdfPoint(t, e) {
    return C.applyInverseTransform([t, e], this.transform);
  }
}, Fl = class extends Pi {
  constructor(i, t = 0) {
    super(i, "RenderingCancelledException"), this.extraDelay = t;
  }
};
function go(i) {
  const t = i.length;
  let e = 0;
  for (; e < t && i[e].trim() === ""; ) e++;
  return i.substring(e, e + 5).toLowerCase() === "data:";
}
function Nl(i) {
  return typeof i == "string" && /\.pdf$/i.test(i);
}
function gp(i) {
  return [i] = i.split(/[#?]/, 1), i.substring(i.lastIndexOf("/") + 1);
}
function fp(i, t = "document.pdf") {
  if (typeof i != "string") return t;
  if (go(i))
    return B('getPdfFilenameFromUrl: ignore "data:"-URL for performance reasons.'), t;
  const e = /[^/?#=]+\.pdf\b(?!.*\.pdf\b)/i, s = /^(?:(?:[^:]+:)?\/\/[^/]+)?([^?#]*)(\?[^#]*)?(#.*)?$/.exec(i);
  let n = e.exec(s[1]) || e.exec(s[2]) || e.exec(s[3]);
  if (n && (n = n[0], n.includes("%")))
    try {
      n = e.exec(decodeURIComponent(n))[0];
    } catch {
    }
  return n || t;
}
var ec = class {
  constructor() {
    L(this, "started", /* @__PURE__ */ Object.create(null)), L(this, "times", []);
  }
  time(i) {
    i in this.started && B(`Timer is already running for ${i}`), this.started[i] = Date.now();
  }
  timeEnd(i) {
    i in this.started || B(`Timer has not been started for ${i}`), this.times.push({
      name: i,
      start: this.started[i],
      end: Date.now()
    }), delete this.started[i];
  }
  toString() {
    const i = [];
    let t = 0;
    for (const { name: e } of this.times) t = Math.max(e.length, t);
    for (const { name: e, start: s, end: n } of this.times) i.push(`${e.padEnd(t)} ${n - s}ms
`);
    return i.join("");
  }
};
function On(i, t) {
  try {
    const { protocol: e } = t ? new URL(i, t) : new URL(i);
    return e === "http:" || e === "https:";
  } catch {
    return !1;
  }
}
function ke(i) {
  i.preventDefault();
}
function ie(i) {
  i.preventDefault(), i.stopPropagation();
}
var wd = class br {
  static toDateObject(t) {
    if (!t || typeof t != "string") return null;
    g(br, this, Mo)._ || (Mo._ = g(br, this, null));
    const e = g(br, this, Mo)._.exec(t);
    if (!e) return null;
    const s = parseInt(e[1], 10);
    let n = parseInt(e[2], 10);
    n = n >= 1 && n <= 12 ? n - 1 : 0;
    let r = parseInt(e[3], 10);
    r = r >= 1 && r <= 31 ? r : 1;
    let o = parseInt(e[4], 10);
    o = o >= 0 && o <= 23 ? o : 0;
    let h = parseInt(e[5], 10);
    h = h >= 0 && h <= 59 ? h : 0;
    let l = parseInt(e[6], 10);
    l = l >= 0 && l <= 59 ? l : 0;
    const c = e[7] || "Z";
    let d = parseInt(e[8], 10);
    d = d >= 0 && d <= 23 ? d : 0;
    let p = parseInt(e[9], 10) || 0;
    return p = p >= 0 && p <= 59 ? p : 0, c === "-" ? (o += d, h += p) : c === "+" && (o -= d, h -= p), new Date(Date.UTC(s, n, r, o, h, l));
  }
}, Mo = { _: void 0 };
function mp(i, { scale: t = 1, rotation: e = 0 }) {
  const { width: s, height: n } = i.attributes.style;
  return new Ll({
    viewBox: [
      0,
      0,
      parseInt(s),
      parseInt(n)
    ],
    userUnit: 1,
    scale: t,
    rotation: e
  });
}
function Rh(i) {
  if (i.startsWith("#")) {
    const t = parseInt(i.slice(1), 16);
    return [
      (16711680 & t) >> 16,
      (65280 & t) >> 8,
      255 & t
    ];
  }
  return i.startsWith("rgb(") ? i.slice(4, -1).split(",").map(((t) => parseInt(t))) : i.startsWith("rgba(") ? i.slice(5, -1).split(",").map(((t) => parseInt(t))).slice(0, 3) : (B(`Not a valid color format: "${i}"`), [
    0,
    0,
    0
  ]);
}
function st(i) {
  const { a: t, b: e, c: s, d: n, e: r, f: o } = i.getTransform();
  return [
    t,
    e,
    s,
    n,
    r,
    o
  ];
}
function Ee(i) {
  const { a: t, b: e, c: s, d: n, e: r, f: o } = i.getTransform().invertSelf();
  return [
    t,
    e,
    s,
    n,
    r,
    o
  ];
}
function os(i, t, e = !1, s = !0) {
  if (t instanceof Ll) {
    const { pageWidth: n, pageHeight: r } = t.rawDims, { style: o } = i, h = Gt.isCSSRoundSupported, l = `var(--scale-factor) * ${n}px`, c = `var(--scale-factor) * ${r}px`, d = h ? `round(down, ${l}, var(--scale-round-x, 1px))` : `calc(${l})`, p = h ? `round(down, ${c}, var(--scale-round-y, 1px))` : `calc(${c})`;
    e && t.rotation % 180 != 0 ? (o.width = p, o.height = d) : (o.width = d, o.height = p);
  }
  s && i.setAttribute("data-main-rotation", t.rotation);
}
var Ol = class {
  constructor() {
    const i = window.devicePixelRatio || 1;
    this.sx = i, this.sy = i;
  }
  get scaled() {
    return this.sx !== 1 || this.sy !== 1;
  }
  get symmetric() {
    return this.sx === this.sy;
  }
}, us = /* @__PURE__ */ new WeakMap(), tn = /* @__PURE__ */ new WeakMap(), Ze = /* @__PURE__ */ new WeakMap(), Wn = /* @__PURE__ */ new WeakMap(), Eo = /* @__PURE__ */ new WeakMap(), Ke = /* @__PURE__ */ new WeakSet(), vp = class {
  constructor(i) {
    G(this, Ke), _(this, us, null), _(this, tn, null), _(this, Ze, void 0), _(this, Wn, null), _(this, Eo, null), u(Ze, this, i), Ih._ || (Ih._ = Object.freeze({
      freetext: "pdfjs-editor-remove-freetext-button",
      highlight: "pdfjs-editor-remove-highlight-button",
      ink: "pdfjs-editor-remove-ink-button",
      stamp: "pdfjs-editor-remove-stamp-button"
    }));
  }
  render() {
    const i = u(us, this, document.createElement("div"));
    i.classList.add("editToolbar", "hidden"), i.setAttribute("role", "toolbar");
    const t = a(Ze, this)._uiManager._signal;
    i.addEventListener("contextmenu", ke, { signal: t }), i.addEventListener("pointerdown", _p, { signal: t });
    const e = u(Wn, this, document.createElement("div"));
    e.className = "buttons", i.append(e);
    const s = a(Ze, this).toolbarPosition;
    if (s) {
      const { style: n } = i;
      n.insetInlineEnd = 100 * (a(Ze, this)._uiManager.direction === "ltr" ? 1 - s[0] : s[0]) + "%", n.top = `calc(${100 * s[1]}% + var(--editor-toolbar-vert-offset))`;
    }
    return g(Ke, this, Ap).call(this), i;
  }
  get div() {
    return a(us, this);
  }
  hide() {
    a(us, this).classList.add("hidden"), a(tn, this)?.hideDropdown();
  }
  show() {
    a(us, this).classList.remove("hidden"), a(Eo, this)?.shown();
  }
  async addAltText(i) {
    const t = await i.render();
    g(Ke, this, Dh).call(this, t), a(Wn, this).prepend(t, ic.call(g(Ke, this))), u(Eo, this, i);
  }
  addColorPicker(i) {
    u(tn, this, i);
    const t = i.renderButton();
    g(Ke, this, Dh).call(this, t), a(Wn, this).prepend(t, ic.call(g(Ke, this)));
  }
  remove() {
    a(us, this).remove(), a(tn, this)?.destroy(), u(tn, this, null);
  }
};
function _p(i) {
  i.stopPropagation();
}
function bp(i) {
  a(Ze, this)._focusEventsAllowed = !1, ie(i);
}
function wp(i) {
  a(Ze, this)._focusEventsAllowed = !0, ie(i);
}
function Dh(i) {
  const t = a(Ze, this)._uiManager._signal;
  i.addEventListener("focusin", g(Ke, this, bp).bind(this), {
    capture: !0,
    signal: t
  }), i.addEventListener("focusout", g(Ke, this, wp).bind(this), {
    capture: !0,
    signal: t
  }), i.addEventListener("contextmenu", ke, { signal: t });
}
function Ap() {
  const { editorType: i, _uiManager: t } = a(Ze, this), e = document.createElement("button");
  e.className = "delete", e.tabIndex = 0, e.setAttribute("data-l10n-id", Ih._[i]), g(Ke, this, Dh).call(this, e), e.addEventListener("click", ((s) => {
    t.delete();
  }), { signal: t._signal }), a(Wn, this).append(e);
}
function ic() {
  const i = document.createElement("div");
  return i.className = "divider", i;
}
var Ih = { _: null }, Wl = /* @__PURE__ */ new WeakMap(), Rs = /* @__PURE__ */ new WeakMap(), ga = /* @__PURE__ */ new WeakMap(), wr = /* @__PURE__ */ new WeakSet(), yp = class {
  constructor(i) {
    G(this, wr), _(this, Wl, null), _(this, Rs, null), _(this, ga, void 0), u(ga, this, i);
  }
  show(i, t, e) {
    const [s, n] = g(wr, this, Sp).call(this, t, e), { style: r } = a(Rs, this) || u(Rs, this, g(wr, this, xp).call(this));
    i.append(a(Rs, this)), r.insetInlineEnd = 100 * s + "%", r.top = `calc(${100 * n}% + var(--editor-toolbar-vert-offset))`;
  }
  hide() {
    a(Rs, this).remove();
  }
};
function xp() {
  const i = u(Rs, this, document.createElement("div"));
  i.className = "editToolbar", i.setAttribute("role", "toolbar"), i.addEventListener("contextmenu", ke, { signal: a(ga, this)._signal });
  const t = u(Wl, this, document.createElement("div"));
  return t.className = "buttons", i.append(t), g(wr, this, kp).call(this), i;
}
function Sp(i, t) {
  let e = 0, s = 0;
  for (const n of i) {
    const r = n.y + n.height;
    if (r < e) continue;
    const o = n.x + (t ? n.width : 0);
    r > e ? (s = o, e = r) : t ? o > s && (s = o) : o < s && (s = o);
  }
  return [t ? 1 - s : s, e];
}
function kp() {
  const i = document.createElement("button");
  i.className = "highlightButton", i.tabIndex = 0, i.setAttribute("data-l10n-id", "pdfjs-highlight-floating-button1");
  const t = document.createElement("span");
  i.append(t), t.className = "visuallyHidden", t.setAttribute("data-l10n-id", "pdfjs-highlight-floating-button-label");
  const e = a(ga, this)._signal;
  i.addEventListener("contextmenu", ke, { signal: e }), i.addEventListener("click", (() => {
    a(ga, this).highlightSelection("floating_button");
  }), { signal: e }), a(Wl, this).append(i);
}
function Yr(i, t, e) {
  for (const s of e) t.addEventListener(s, i[s].bind(i));
}
var Co = /* @__PURE__ */ new WeakMap(), Mp = class {
  constructor() {
    _(this, Co, 0);
  }
  get id() {
    var i, t;
    return "pdfjs_internal_editor_" + (u(Co, this, (i = a(Co, this), t = i++, i)), t);
  }
}, Ar = /* @__PURE__ */ new WeakMap(), Kn = /* @__PURE__ */ new WeakMap(), bt = /* @__PURE__ */ new WeakMap(), Aa = /* @__PURE__ */ new WeakSet(), Ad = class {
  constructor() {
    G(this, Aa), _(this, Ar, (function() {
      if (typeof crypto.randomUUID == "function") return crypto.randomUUID();
      const t = new Uint8Array(32);
      return crypto.getRandomValues(t), _d(t);
    })()), _(this, Kn, 0), _(this, bt, null);
  }
  static get _isSVGFittingCanvas() {
    const i = new OffscreenCanvas(1, 3).getContext("2d", { willReadFrequently: !0 }), t = new Image();
    return t.src = 'data:image/svg+xml;charset=UTF-8,<svg viewBox="0 0 1 1" width="1" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" style="fill:red;"/></svg>', $(this, "_isSVGFittingCanvas", t.decode().then((() => (i.drawImage(t, 0, 0, 1, 1, 0, 0, 1, 3), new Uint32Array(i.getImageData(0, 0, 1, 1).data.buffer)[0] === 0))));
  }
  async getFromFile(i) {
    const { lastModified: t, name: e, size: s, type: n } = i;
    return g(Aa, this, Po).call(this, `${t}_${e}_${s}_${n}`, i);
  }
  async getFromUrl(i) {
    return g(Aa, this, Po).call(this, i, i);
  }
  async getFromBlob(i, t) {
    const e = await t;
    return g(Aa, this, Po).call(this, i, e);
  }
  async getFromId(i) {
    a(bt, this) || u(bt, this, /* @__PURE__ */ new Map());
    const t = a(bt, this).get(i);
    if (!t) return null;
    if (t.bitmap)
      return t.refCounter += 1, t;
    if (t.file) return this.getFromFile(t.file);
    if (t.blobPromise) {
      const { blobPromise: e } = t;
      return delete t.blobPromise, this.getFromBlob(t.id, e);
    }
    return this.getFromUrl(t.url);
  }
  getFromCanvas(i, t) {
    var e, s;
    a(bt, this) || u(bt, this, /* @__PURE__ */ new Map());
    let n = a(bt, this).get(i);
    if (n?.bitmap)
      return n.refCounter += 1, n;
    const r = new OffscreenCanvas(t.width, t.height);
    return r.getContext("2d").drawImage(t, 0, 0), n = {
      bitmap: r.transferToImageBitmap(),
      id: `image_${a(Ar, this)}_${u(Kn, this, (e = a(Kn, this), s = e++, e)), s}`,
      refCounter: 1,
      isSvg: !1
    }, a(bt, this).set(i, n), a(bt, this).set(n.id, n), n;
  }
  getSvgUrl(i) {
    const t = a(bt, this).get(i);
    return t?.isSvg ? t.svgUrl : null;
  }
  deleteId(i) {
    a(bt, this) || u(bt, this, /* @__PURE__ */ new Map());
    const t = a(bt, this).get(i);
    if (!t || (t.refCounter -= 1, t.refCounter !== 0)) return;
    const { bitmap: e } = t;
    if (!t.url && !t.file) {
      const s = new OffscreenCanvas(e.width, e.height);
      s.getContext("bitmaprenderer").transferFromImageBitmap(e), t.blobPromise = s.convertToBlob();
    }
    e.close?.(), t.bitmap = null;
  }
  isValidId(i) {
    return i.startsWith(`image_${a(Ar, this)}_`);
  }
};
ld = Ad;
async function Po(i, t) {
  a(bt, this) || u(bt, this, /* @__PURE__ */ new Map());
  let e = a(bt, this).get(i);
  if (e === null) return null;
  if (e?.bitmap)
    return e.refCounter += 1, e;
  try {
    var s, n;
    e || (e = {
      bitmap: null,
      id: `image_${a(Ar, this)}_${u(Kn, this, (s = a(Kn, this), n = s++, s)), n}`,
      refCounter: 0,
      isSvg: !1
    });
    let r;
    if (typeof t == "string" ? (e.url = t, r = await po(t, "blob")) : t instanceof File ? r = e.file = t : t instanceof Blob && (r = t), r.type === "image/svg+xml") {
      const o = ld._isSVGFittingCanvas, h = new FileReader(), l = new Image(), c = new Promise(((d, p) => {
        l.onload = () => {
          e.bitmap = l, e.isSvg = !0, d();
        }, h.onload = async () => {
          const f = e.svgUrl = h.result;
          l.src = await o ? `${f}#svgView(preserveAspectRatio(none))` : f;
        }, l.onerror = h.onerror = p;
      }));
      h.readAsDataURL(r), await c;
    } else e.bitmap = await createImageBitmap(r);
    e.refCounter = 1;
  } catch (r) {
    B(r), e = null;
  }
  return a(bt, this).set(i, e), e && a(bt, this).set(e.id, e), e;
}
var gt = /* @__PURE__ */ new WeakMap(), ps = /* @__PURE__ */ new WeakMap(), To = /* @__PURE__ */ new WeakMap(), nt = /* @__PURE__ */ new WeakMap(), Ep = class {
  constructor(i = 128) {
    _(this, gt, []), _(this, ps, !1), _(this, To, void 0), _(this, nt, -1), u(To, this, i);
  }
  add({ cmd: i, undo: t, post: e, mustExec: s, type: n = NaN, overwriteIfSameType: r = !1, keepUndo: o = !1 }) {
    if (s && i(), a(ps, this)) return;
    const h = {
      cmd: i,
      undo: t,
      post: e,
      type: n
    };
    if (a(nt, this) === -1) {
      a(gt, this).length > 0 && (a(gt, this).length = 0), u(nt, this, 0), a(gt, this).push(h);
      return;
    }
    if (r && a(gt, this)[a(nt, this)].type === n) {
      o && (h.undo = a(gt, this)[a(nt, this)].undo), a(gt, this)[a(nt, this)] = h;
      return;
    }
    const l = a(nt, this) + 1;
    l === a(To, this) ? a(gt, this).splice(0, 1) : (u(nt, this, l), l < a(gt, this).length && a(gt, this).splice(l)), a(gt, this).push(h);
  }
  undo() {
    if (a(nt, this) === -1) return;
    u(ps, this, !0);
    const { undo: i, post: t } = a(gt, this)[a(nt, this)];
    i(), t?.(), u(ps, this, !1), u(nt, this, a(nt, this) - 1);
  }
  redo() {
    if (a(nt, this) < a(gt, this).length - 1) {
      u(nt, this, a(nt, this) + 1), u(ps, this, !0);
      const { cmd: i, post: t } = a(gt, this)[a(nt, this)];
      i(), t?.(), u(ps, this, !1);
    }
  }
  hasSomethingToUndo() {
    return a(nt, this) !== -1;
  }
  hasSomethingToRedo() {
    return a(nt, this) < a(gt, this).length - 1;
  }
  cleanType(i) {
    if (a(nt, this) !== -1) {
      for (let t = a(nt, this); t >= 0; t--) if (a(gt, this)[t].type !== i) {
        a(gt, this).splice(t + 1, a(nt, this) - t), u(nt, this, t);
        return;
      }
      a(gt, this).length = 0, u(nt, this, -1);
    }
  }
  destroy() {
    u(gt, this, null);
  }
}, sc = /* @__PURE__ */ new WeakSet(), _a = class {
  constructor(i) {
    G(this, sc), this.buffer = [], this.callbacks = /* @__PURE__ */ new Map(), this.allKeys = /* @__PURE__ */ new Set();
    const { isMac: t } = Gt.platform;
    for (const [e, s, n = {}] of i) for (const r of e) {
      const o = r.startsWith("mac+");
      t && o ? (this.callbacks.set(r.slice(4), {
        callback: s,
        options: n
      }), this.allKeys.add(r.split("+").at(-1))) : !t && !o && (this.callbacks.set(r, {
        callback: s,
        options: n
      }), this.allKeys.add(r.split("+").at(-1)));
    }
  }
  exec(i, t) {
    if (!this.allKeys.has(t.key)) return;
    const e = this.callbacks.get(g(sc, this, Cp).call(this, t));
    if (!e) return;
    const { callback: s, options: { bubbles: n = !1, args: r = [], checker: o = null } } = e;
    (!o || o(i, t)) && (s.bind(i, ...r, t)(), n || ie(t));
  }
};
function Cp(i) {
  i.altKey && this.buffer.push("alt"), i.ctrlKey && this.buffer.push("ctrl"), i.metaKey && this.buffer.push("meta"), i.shiftKey && this.buffer.push("shift"), this.buffer.push(i.key);
  const t = this.buffer.join("+");
  return this.buffer.length = 0, t;
}
var yd = class xd {
  get _colors() {
    const t = /* @__PURE__ */ new Map([["CanvasText", null], ["Canvas", null]]);
    return (function(s) {
      const n = document.createElement("span");
      n.style.visibility = "hidden", document.body.append(n);
      for (const r of s.keys()) {
        n.style.color = r;
        const o = window.getComputedStyle(n).color;
        s.set(r, Rh(o));
      }
      n.remove();
    })(t), $(this, "_colors", t);
  }
  convert(t) {
    const e = Rh(t);
    if (!window.matchMedia("(forced-colors: active)").matches) return e;
    for (const [s, n] of this._colors) if (n.every(((r, o) => r === e[o]))) return xd._colorsMapping.get(s);
    return e;
  }
  getHexCode(t) {
    const e = this._colors.get(t);
    return e ? C.makeHexColor(...e) : t;
  }
};
L(yd, "_colorsMapping", /* @__PURE__ */ new Map([["CanvasText", [
  0,
  0,
  0
]], ["Canvas", [
  255,
  255,
  255
]]]));
var ya = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), St = /* @__PURE__ */ new WeakMap(), Ot = /* @__PURE__ */ new WeakMap(), xa = /* @__PURE__ */ new WeakMap(), Di = /* @__PURE__ */ new WeakMap(), en = /* @__PURE__ */ new WeakMap(), Ce = /* @__PURE__ */ new WeakMap(), zs = /* @__PURE__ */ new WeakMap(), sn = /* @__PURE__ */ new WeakMap(), Sa = /* @__PURE__ */ new WeakMap(), nn = /* @__PURE__ */ new WeakMap(), ai = /* @__PURE__ */ new WeakMap(), We = /* @__PURE__ */ new WeakMap(), an = /* @__PURE__ */ new WeakMap(), Lh = /* @__PURE__ */ new WeakMap(), Ro = /* @__PURE__ */ new WeakMap(), ka = /* @__PURE__ */ new WeakMap(), Do = /* @__PURE__ */ new WeakMap(), ri = /* @__PURE__ */ new WeakMap(), Gs = /* @__PURE__ */ new WeakMap(), Ma = /* @__PURE__ */ new WeakMap(), Ds = /* @__PURE__ */ new WeakMap(), ei = /* @__PURE__ */ new WeakMap(), nc = /* @__PURE__ */ new WeakMap(), Qs = /* @__PURE__ */ new WeakMap(), Io = /* @__PURE__ */ new WeakMap(), js = /* @__PURE__ */ new WeakMap(), rn = /* @__PURE__ */ new WeakMap(), Lo = /* @__PURE__ */ new WeakMap(), Fo = /* @__PURE__ */ new WeakMap(), Tt = /* @__PURE__ */ new WeakMap(), tt = /* @__PURE__ */ new WeakMap(), $i = /* @__PURE__ */ new WeakMap(), on = /* @__PURE__ */ new WeakMap(), Ea = /* @__PURE__ */ new WeakMap(), Fh = /* @__PURE__ */ new WeakMap(), gs = /* @__PURE__ */ new WeakMap(), oi = /* @__PURE__ */ new WeakMap(), Ii = /* @__PURE__ */ new WeakMap(), No = /* @__PURE__ */ new WeakMap(), Pe = /* @__PURE__ */ new WeakMap(), D = /* @__PURE__ */ new WeakSet(), hs = class Nh {
  static get _keyboardManager() {
    const t = Nh.prototype, e = (o) => a(Ii, o).contains(document.activeElement) && document.activeElement.tagName !== "BUTTON" && o.hasSomethingToControl(), s = (o, { target: h }) => {
      if (h instanceof HTMLInputElement) {
        const { type: l } = h;
        return l !== "text" && l !== "number";
      }
      return !0;
    }, n = this.TRANSLATE_SMALL, r = this.TRANSLATE_BIG;
    return $(this, "_keyboardManager", new _a([
      [
        ["ctrl+a", "mac+meta+a"],
        t.selectAll,
        { checker: s }
      ],
      [
        ["ctrl+z", "mac+meta+z"],
        t.undo,
        { checker: s }
      ],
      [
        [
          "ctrl+y",
          "ctrl+shift+z",
          "mac+meta+shift+z",
          "ctrl+shift+Z",
          "mac+meta+shift+Z"
        ],
        t.redo,
        { checker: s }
      ],
      [
        [
          "Backspace",
          "alt+Backspace",
          "ctrl+Backspace",
          "shift+Backspace",
          "mac+Backspace",
          "mac+alt+Backspace",
          "mac+ctrl+Backspace",
          "Delete",
          "ctrl+Delete",
          "shift+Delete",
          "mac+Delete"
        ],
        t.delete,
        { checker: s }
      ],
      [
        ["Enter", "mac+Enter"],
        t.addNewEditorFromKeyboard,
        { checker: (o, { target: h }) => !(h instanceof HTMLButtonElement) && a(Ii, o).contains(h) && !o.isEnterHandled }
      ],
      [
        [" ", "mac+ "],
        t.addNewEditorFromKeyboard,
        { checker: (o, { target: h }) => !(h instanceof HTMLButtonElement) && a(Ii, o).contains(document.activeElement) }
      ],
      [["Escape", "mac+Escape"], t.unselectAll],
      [
        ["ArrowLeft", "mac+ArrowLeft"],
        t.translateSelectedEditors,
        {
          args: [-n, 0],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowLeft", "mac+shift+ArrowLeft"],
        t.translateSelectedEditors,
        {
          args: [-r, 0],
          checker: e
        }
      ],
      [
        ["ArrowRight", "mac+ArrowRight"],
        t.translateSelectedEditors,
        {
          args: [n, 0],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowRight", "mac+shift+ArrowRight"],
        t.translateSelectedEditors,
        {
          args: [r, 0],
          checker: e
        }
      ],
      [
        ["ArrowUp", "mac+ArrowUp"],
        t.translateSelectedEditors,
        {
          args: [0, -n],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowUp", "mac+shift+ArrowUp"],
        t.translateSelectedEditors,
        {
          args: [0, -r],
          checker: e
        }
      ],
      [
        ["ArrowDown", "mac+ArrowDown"],
        t.translateSelectedEditors,
        {
          args: [0, n],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowDown", "mac+shift+ArrowDown"],
        t.translateSelectedEditors,
        {
          args: [0, r],
          checker: e
        }
      ]
    ]));
  }
  constructor(t, e, s, n, r, o, h, l, c, d, p, f, v) {
    G(this, D), _(this, ya, new AbortController()), _(this, ce, null), _(this, St, /* @__PURE__ */ new Map()), _(this, Ot, /* @__PURE__ */ new Map()), _(this, xa, null), _(this, Di, null), _(this, en, null), _(this, Ce, new Ep()), _(this, zs, null), _(this, sn, null), _(this, Sa, 0), _(this, nn, /* @__PURE__ */ new Set()), _(this, ai, null), _(this, We, null), _(this, an, /* @__PURE__ */ new Set()), L(this, "_editorUndoBar", null), _(this, Lh, !1), _(this, Ro, !1), _(this, ka, !1), _(this, Do, null), _(this, ri, null), _(this, Gs, null), _(this, Ma, null), _(this, Ds, !1), _(this, ei, null), _(this, nc, new Mp()), _(this, Qs, !1), _(this, Io, !1), _(this, js, null), _(this, rn, null), _(this, Lo, null), _(this, Fo, null), _(this, Tt, W.NONE), _(this, tt, /* @__PURE__ */ new Set()), _(this, $i, null), _(this, on, null), _(this, Ea, null), _(this, Fh, {
      isEditing: !1,
      isEmpty: !0,
      hasSomethingToUndo: !1,
      hasSomethingToRedo: !1,
      hasSelectedEditor: !1,
      hasSelectedText: !1
    }), _(this, gs, [0, 0]), _(this, oi, null), _(this, Ii, null), _(this, No, null), _(this, Pe, null);
    const m = this._signal = a(ya, this).signal;
    u(Ii, this, t), u(No, this, e), u(xa, this, s), this._eventBus = n, n._on("editingaction", this.onEditingAction.bind(this), { signal: m }), n._on("pagechanging", this.onPageChanging.bind(this), { signal: m }), n._on("scalechanging", this.onScaleChanging.bind(this), { signal: m }), n._on("rotationchanging", this.onRotationChanging.bind(this), { signal: m }), n._on("setpreference", this.onSetPreference.bind(this), { signal: m }), n._on("switchannotationeditorparams", ((b) => this.updateParams(b.type, b.value)), { signal: m }), g(D, this, Rp).call(this), g(D, this, Fp).call(this), g(D, this, ac).call(this), u(Di, this, r.annotationStorage), u(Do, this, r.filterFactory), u(on, this, o), u(Ma, this, h || null), u(Lh, this, l), u(Ro, this, c), u(ka, this, d), u(Fo, this, p || null), this.viewParameters = {
      realScale: Le.PDF_TO_CSS_UNITS,
      rotation: 0
    }, this.isShiftKeyDown = !1, this._editorUndoBar = f || null, this._supportsPinchToZoom = v !== !1;
  }
  destroy() {
    a(Pe, this)?.resolve(), u(Pe, this, null), a(ya, this)?.abort(), u(ya, this, null), this._signal = null;
    for (const t of a(Ot, this).values()) t.destroy();
    a(Ot, this).clear(), a(St, this).clear(), a(an, this).clear(), u(ce, this, null), a(tt, this).clear(), a(Ce, this).destroy(), a(xa, this)?.destroy(), a(ei, this)?.hide(), u(ei, this, null), a(ri, this) && (clearTimeout(a(ri, this)), u(ri, this, null)), a(oi, this) && (clearTimeout(a(oi, this)), u(oi, this, null)), this._editorUndoBar?.destroy();
  }
  combinedSignal(t) {
    return AbortSignal.any([this._signal, t.signal]);
  }
  get mlManager() {
    return a(Fo, this);
  }
  get useNewAltTextFlow() {
    return a(Ro, this);
  }
  get useNewAltTextWhenAddingImage() {
    return a(ka, this);
  }
  get hcmFilter() {
    return $(this, "hcmFilter", a(on, this) ? a(Do, this).addHCMFilter(a(on, this).foreground, a(on, this).background) : "none");
  }
  get direction() {
    return $(this, "direction", getComputedStyle(a(Ii, this)).direction);
  }
  get highlightColors() {
    return $(this, "highlightColors", a(Ma, this) ? new Map(a(Ma, this).split(",").map(((t) => t.split("=").map(((e) => e.trim()))))) : null);
  }
  get highlightColorNames() {
    return $(this, "highlightColorNames", this.highlightColors ? new Map(Array.from(this.highlightColors, ((t) => t.reverse()))) : null);
  }
  setCurrentDrawingSession(t) {
    t ? (this.unselectAll(), this.disableUserSelect(!0)) : this.disableUserSelect(!1), u(sn, this, t);
  }
  setMainHighlightColorPicker(t) {
    u(Lo, this, t);
  }
  editAltText(t, e = !1) {
    a(xa, this)?.editAltText(this, t, e);
  }
  switchToMode(t, e) {
    this._eventBus.on("annotationeditormodechanged", e, {
      once: !0,
      signal: this._signal
    }), this._eventBus.dispatch("showannotationeditorui", {
      source: this,
      mode: t
    });
  }
  setPreference(t, e) {
    this._eventBus.dispatch("setpreference", {
      source: this,
      name: t,
      value: e
    });
  }
  onSetPreference({ name: t, value: e }) {
    t === "enableNewAltTextWhenAddingImage" && u(ka, this, e);
  }
  onPageChanging({ pageNumber: t }) {
    u(Sa, this, t - 1);
  }
  focusMainContainer() {
    a(Ii, this).focus();
  }
  findParent(t, e) {
    for (const s of a(Ot, this).values()) {
      const { x: n, y: r, width: o, height: h } = s.div.getBoundingClientRect();
      if (t >= n && t <= n + o && e >= r && e <= r + h) return s;
    }
    return null;
  }
  disableUserSelect(t = !1) {
    a(No, this).classList.toggle("noUserSelect", t);
  }
  addShouldRescale(t) {
    a(an, this).add(t);
  }
  removeShouldRescale(t) {
    a(an, this).delete(t);
  }
  onScaleChanging({ scale: t }) {
    this.commitOrRemove(), this.viewParameters.realScale = t * Le.PDF_TO_CSS_UNITS;
    for (const e of a(an, this)) e.onScaleChanging();
    a(sn, this)?.onScaleChanging();
  }
  onRotationChanging({ pagesRotation: t }) {
    this.commitOrRemove(), this.viewParameters.rotation = t;
  }
  highlightSelection(t = "") {
    const e = document.getSelection();
    if (!e || e.isCollapsed) return;
    const { anchorNode: s, anchorOffset: n, focusNode: r, focusOffset: o } = e, h = e.toString(), l = g(D, this, Bl).call(this, e).closest(".textLayer"), c = this.getSelectionBoxes(l);
    if (!c) return;
    e.empty();
    const d = g(D, this, Sd).call(this, l), p = a(Tt, this) === W.NONE, f = () => {
      d?.createAndAddNewEditor({
        x: 0,
        y: 0
      }, !1, {
        methodOfCreation: t,
        boxes: c,
        anchorNode: s,
        anchorOffset: n,
        focusNode: r,
        focusOffset: o,
        text: h
      }), p && this.showAllEditors("highlight", !0, !0);
    };
    p ? this.switchToMode(W.HIGHLIGHT, f) : f();
  }
  addToAnnotationStorage(t) {
    t.isEmpty() || !a(Di, this) || a(Di, this).has(t.id) || a(Di, this).setValue(t.id, t);
  }
  blur() {
    if (this.isShiftKeyDown = !1, a(Ds, this) && (u(Ds, this, !1), g(D, this, Oh).call(this, "main_toolbar")), !this.hasSelection) return;
    const { activeElement: t } = document;
    for (const e of a(tt, this)) if (e.div.contains(t)) {
      u(rn, this, [e, t]), e._focusEventsAllowed = !1;
      break;
    }
  }
  focus() {
    if (!a(rn, this)) return;
    const [t, e] = a(rn, this);
    u(rn, this, null), e.addEventListener("focusin", (() => {
      t._focusEventsAllowed = !0;
    }), {
      once: !0,
      signal: this._signal
    }), e.focus();
  }
  addEditListeners() {
    g(D, this, ac).call(this), g(D, this, rc).call(this);
  }
  removeEditListeners() {
    g(D, this, Lp).call(this), g(D, this, oc).call(this);
  }
  dragOver(t) {
    for (const { type: e } of t.dataTransfer.items) for (const s of a(We, this)) if (s.isHandlingMimeForPasting(e)) {
      t.dataTransfer.dropEffect = "copy", t.preventDefault();
      return;
    }
  }
  drop(t) {
    for (const e of t.dataTransfer.items) for (const s of a(We, this)) if (s.isHandlingMimeForPasting(e.type)) {
      s.paste(e, this.currentLayer), t.preventDefault();
      return;
    }
  }
  copy(t) {
    if (t.preventDefault(), a(ce, this)?.commitOrRemove(), !this.hasSelection) return;
    const e = [];
    for (const s of a(tt, this)) {
      const n = s.serialize(!0);
      n && e.push(n);
    }
    e.length !== 0 && t.clipboardData.setData("application/pdfjs", JSON.stringify(e));
  }
  cut(t) {
    this.copy(t), this.delete();
  }
  async paste(t) {
    t.preventDefault();
    const { clipboardData: e } = t;
    for (const r of e.items) for (const o of a(We, this)) if (o.isHandlingMimeForPasting(r.type)) {
      o.paste(r, this.currentLayer);
      return;
    }
    let s = e.getData("application/pdfjs");
    if (!s) return;
    try {
      s = JSON.parse(s);
    } catch (r) {
      B(`paste: "${r.message}".`);
      return;
    }
    if (!Array.isArray(s)) return;
    this.unselectAll();
    const n = this.currentLayer;
    try {
      const r = [];
      for (const l of s) {
        const c = await n.deserialize(l);
        if (!c) return;
        r.push(c);
      }
      const o = () => {
        for (const l of r) g(D, this, hc).call(this, l);
        g(D, this, lc).call(this, r);
      }, h = () => {
        for (const l of r) l.remove();
      };
      this.addCommands({
        cmd: o,
        undo: h,
        mustExec: !0
      });
    } catch (r) {
      B(`paste: "${r.message}".`);
    }
  }
  keydown(t) {
    this.isShiftKeyDown || t.key !== "Shift" || (this.isShiftKeyDown = !0), a(Tt, this) === W.NONE || this.isEditorHandlingKeyboard || Nh._keyboardManager.exec(this, t);
  }
  keyup(t) {
    this.isShiftKeyDown && t.key === "Shift" && (this.isShiftKeyDown = !1, a(Ds, this) && (u(Ds, this, !1), g(D, this, Oh).call(this, "main_toolbar")));
  }
  onEditingAction({ name: t }) {
    switch (t) {
      case "undo":
      case "redo":
      case "delete":
      case "selectAll":
        this[t]();
        break;
      case "highlightSelection":
        this.highlightSelection("context_menu");
    }
  }
  setEditingState(t) {
    t ? (g(D, this, Dp).call(this), g(D, this, rc).call(this), g(D, this, Vt).call(this, {
      isEditing: a(Tt, this) !== W.NONE,
      isEmpty: g(D, this, Ca).call(this),
      hasSomethingToUndo: a(Ce, this).hasSomethingToUndo(),
      hasSomethingToRedo: a(Ce, this).hasSomethingToRedo(),
      hasSelectedEditor: !1
    })) : (g(D, this, Ip).call(this), g(D, this, oc).call(this), g(D, this, Vt).call(this, { isEditing: !1 }), this.disableUserSelect(!1));
  }
  registerEditorTypes(t) {
    if (!a(We, this)) {
      u(We, this, t);
      for (const e of a(We, this)) g(D, this, mi).call(this, e.defaultPropertiesToUpdate);
    }
  }
  getId() {
    return a(nc, this).id;
  }
  get currentLayer() {
    return a(Ot, this).get(a(Sa, this));
  }
  getLayer(t) {
    return a(Ot, this).get(t);
  }
  get currentPageIndex() {
    return a(Sa, this);
  }
  addLayer(t) {
    a(Ot, this).set(t.pageIndex, t), a(Qs, this) ? t.enable() : t.disable();
  }
  removeLayer(t) {
    a(Ot, this).delete(t.pageIndex);
  }
  async updateMode(t, e = null, s = !1) {
    if (a(Tt, this) !== t) {
      if (a(Pe, this) && (await a(Pe, this).promise, !a(Pe, this)))
        return;
      if (u(Pe, this, Promise.withResolvers()), u(Tt, this, t), t !== W.NONE) {
        this.setEditingState(!0), await g(D, this, Np).call(this), this.unselectAll();
        for (const n of a(Ot, this).values()) n.updateMode(t);
        if (e) {
          for (const n of a(St, this).values()) n.annotationElementId === e ? (this.setSelected(n), n.enterInEditMode()) : n.unselect();
          a(Pe, this).resolve();
        } else
          s && this.addNewEditorFromKeyboard(), a(Pe, this).resolve();
      } else
        this.setEditingState(!1), g(D, this, Op).call(this), this._editorUndoBar?.hide(), a(Pe, this).resolve();
    }
  }
  addNewEditorFromKeyboard() {
    this.currentLayer.canCreateNewEmptyEditor() && this.currentLayer.addNewEditor();
  }
  updateToolbar(t) {
    t !== a(Tt, this) && this._eventBus.dispatch("switchannotationeditormode", {
      source: this,
      mode: t
    });
  }
  updateParams(t, e) {
    if (a(We, this)) {
      switch (t) {
        case U.CREATE:
          this.currentLayer.addNewEditor();
          return;
        case U.HIGHLIGHT_DEFAULT_COLOR:
          a(Lo, this)?.updateColor(e);
          break;
        case U.HIGHLIGHT_SHOW_ALL:
          this._eventBus.dispatch("reporttelemetry", {
            source: this,
            details: {
              type: "editing",
              data: {
                type: "highlight",
                action: "toggle_visibility"
              }
            }
          }), (a(Ea, this) || u(Ea, this, /* @__PURE__ */ new Map())).set(t, e), this.showAllEditors("highlight", e);
      }
      for (const s of a(tt, this)) s.updateParams(t, e);
      for (const s of a(We, this)) s.updateDefaultParams(t, e);
    }
  }
  showAllEditors(t, e, s = !1) {
    for (const n of a(St, this).values()) n.editorType === t && n.show(e);
    (a(Ea, this)?.get(U.HIGHLIGHT_SHOW_ALL) ?? !0) !== e && g(D, this, mi).call(this, [[U.HIGHLIGHT_SHOW_ALL, e]]);
  }
  enableWaiting(t = !1) {
    if (a(Io, this) !== t) {
      u(Io, this, t);
      for (const e of a(Ot, this).values())
        t ? e.disableClick() : e.enableClick(), e.div.classList.toggle("waiting", t);
    }
  }
  getEditors(t) {
    const e = [];
    for (const s of a(St, this).values()) s.pageIndex === t && e.push(s);
    return e;
  }
  getEditor(t) {
    return a(St, this).get(t);
  }
  addEditor(t) {
    a(St, this).set(t.id, t);
  }
  removeEditor(t) {
    t.div.contains(document.activeElement) && (a(ri, this) && clearTimeout(a(ri, this)), u(ri, this, setTimeout((() => {
      this.focusMainContainer(), u(ri, this, null);
    }), 0))), a(St, this).delete(t.id), this.unselect(t), t.annotationElementId && a(nn, this).has(t.annotationElementId) || a(Di, this)?.remove(t.id);
  }
  addDeletedAnnotationElement(t) {
    a(nn, this).add(t.annotationElementId), this.addChangedExistingAnnotation(t), t.deleted = !0;
  }
  isDeletedAnnotationElement(t) {
    return a(nn, this).has(t);
  }
  removeDeletedAnnotationElement(t) {
    a(nn, this).delete(t.annotationElementId), this.removeChangedExistingAnnotation(t), t.deleted = !1;
  }
  setActiveEditor(t) {
    a(ce, this) !== t && (u(ce, this, t), t && g(D, this, mi).call(this, t.propertiesToUpdate));
  }
  updateUI(t) {
    Wp.call(g(D, this)) === t && g(D, this, mi).call(this, t.propertiesToUpdate);
  }
  updateUIForDefaultProperties(t) {
    g(D, this, mi).call(this, t.defaultPropertiesToUpdate);
  }
  toggleSelected(t) {
    a(tt, this).has(t) ? (a(tt, this).delete(t), t.unselect(), g(D, this, Vt).call(this, { hasSelectedEditor: this.hasSelection })) : (a(tt, this).add(t), t.select(), g(D, this, mi).call(this, t.propertiesToUpdate), g(D, this, Vt).call(this, { hasSelectedEditor: !0 }));
  }
  setSelected(t) {
    a(sn, this)?.commitOrRemove();
    for (const e of a(tt, this)) e !== t && e.unselect();
    a(tt, this).clear(), a(tt, this).add(t), t.select(), g(D, this, mi).call(this, t.propertiesToUpdate), g(D, this, Vt).call(this, { hasSelectedEditor: !0 });
  }
  isSelected(t) {
    return a(tt, this).has(t);
  }
  get firstSelectedEditor() {
    return a(tt, this).values().next().value;
  }
  unselect(t) {
    t.unselect(), a(tt, this).delete(t), g(D, this, Vt).call(this, { hasSelectedEditor: this.hasSelection });
  }
  get hasSelection() {
    return a(tt, this).size !== 0;
  }
  get isEnterHandled() {
    return a(tt, this).size === 1 && this.firstSelectedEditor.isEnterHandled;
  }
  undo() {
    a(Ce, this).undo(), g(D, this, Vt).call(this, {
      hasSomethingToUndo: a(Ce, this).hasSomethingToUndo(),
      hasSomethingToRedo: !0,
      isEmpty: g(D, this, Ca).call(this)
    }), this._editorUndoBar?.hide();
  }
  redo() {
    a(Ce, this).redo(), g(D, this, Vt).call(this, {
      hasSomethingToUndo: !0,
      hasSomethingToRedo: a(Ce, this).hasSomethingToRedo(),
      isEmpty: g(D, this, Ca).call(this)
    });
  }
  addCommands(t) {
    a(Ce, this).add(t), g(D, this, Vt).call(this, {
      hasSomethingToUndo: !0,
      hasSomethingToRedo: !1,
      isEmpty: g(D, this, Ca).call(this)
    });
  }
  cleanUndoStack(t) {
    a(Ce, this).cleanType(t);
  }
  delete() {
    this.commitOrRemove();
    const t = this.currentLayer?.endDrawingSession(!0);
    if (!this.hasSelection && !t) return;
    const e = t ? [t] : [...a(tt, this)], s = () => {
      for (const n of e) g(D, this, hc).call(this, n);
    };
    this.addCommands({
      cmd: () => {
        this._editorUndoBar?.show(s, e.length === 1 ? e[0].editorType : e.length);
        for (const n of e) n.remove();
      },
      undo: s,
      mustExec: !0
    });
  }
  commitOrRemove() {
    a(ce, this)?.commitOrRemove();
  }
  hasSomethingToControl() {
    return a(ce, this) || this.hasSelection;
  }
  selectAll() {
    for (const t of a(tt, this)) t.commit();
    g(D, this, lc).call(this, a(St, this).values());
  }
  unselectAll() {
    if (!(a(ce, this) && (a(ce, this).commitOrRemove(), a(Tt, this) !== W.NONE)) && !a(sn, this)?.commitOrRemove() && this.hasSelection) {
      for (const t of a(tt, this)) t.unselect();
      a(tt, this).clear(), g(D, this, Vt).call(this, { hasSelectedEditor: !1 });
    }
  }
  translateSelectedEditors(t, e, s = !1) {
    if (s || this.commitOrRemove(), !this.hasSelection) return;
    a(gs, this)[0] += t, a(gs, this)[1] += e;
    const [n, r] = a(gs, this), o = [...a(tt, this)];
    a(oi, this) && clearTimeout(a(oi, this)), u(oi, this, setTimeout((() => {
      u(oi, this, null), a(gs, this)[0] = a(gs, this)[1] = 0, this.addCommands({
        cmd: () => {
          for (const h of o) a(St, this).has(h.id) && h.translateInPage(n, r);
        },
        undo: () => {
          for (const h of o) a(St, this).has(h.id) && h.translateInPage(-n, -r);
        },
        mustExec: !1
      });
    }), 1e3));
    for (const h of o) h.translateInPage(t, e);
  }
  setUpDragSession() {
    if (this.hasSelection) {
      this.disableUserSelect(!0), u(ai, this, /* @__PURE__ */ new Map());
      for (const t of a(tt, this)) a(ai, this).set(t, {
        savedX: t.x,
        savedY: t.y,
        savedPageIndex: t.pageIndex,
        newX: 0,
        newY: 0,
        newPageIndex: -1
      });
    }
  }
  endDragSession() {
    if (!a(ai, this)) return !1;
    this.disableUserSelect(!1);
    const t = a(ai, this);
    u(ai, this, null);
    let e = !1;
    for (const [{ x: n, y: r, pageIndex: o }, h] of t)
      h.newX = n, h.newY = r, h.newPageIndex = o, e || (e = n !== h.savedX || r !== h.savedY || o !== h.savedPageIndex);
    if (!e) return !1;
    const s = (n, r, o, h) => {
      if (a(St, this).has(n.id)) {
        const l = a(Ot, this).get(h);
        l ? n._setParentAndPosition(l, r, o) : (n.pageIndex = h, n.x = r, n.y = o);
      }
    };
    return this.addCommands({
      cmd: () => {
        for (const [n, { newX: r, newY: o, newPageIndex: h }] of t) s(n, r, o, h);
      },
      undo: () => {
        for (const [n, { savedX: r, savedY: o, savedPageIndex: h }] of t) s(n, r, o, h);
      },
      mustExec: !0
    }), !0;
  }
  dragSelectedEditors(t, e) {
    if (a(ai, this)) for (const s of a(ai, this).keys()) s.drag(t, e);
  }
  rebuild(t) {
    if (t.parent === null) {
      const e = this.getLayer(t.pageIndex);
      e ? (e.changeParent(t), e.addOrRebuild(t)) : (this.addEditor(t), this.addToAnnotationStorage(t), t.rebuild());
    } else t.parent.addOrRebuild(t);
  }
  get isEditorHandlingKeyboard() {
    return this.getActive()?.shouldGetKeyboardEvents() || a(tt, this).size === 1 && this.firstSelectedEditor.shouldGetKeyboardEvents();
  }
  isActive(t) {
    return a(ce, this) === t;
  }
  getActive() {
    return a(ce, this);
  }
  getMode() {
    return a(Tt, this);
  }
  get imageManager() {
    return $(this, "imageManager", new Ad());
  }
  getSelectionBoxes(t) {
    if (!t) return null;
    const e = document.getSelection();
    for (let c = 0, d = e.rangeCount; c < d; c++) if (!t.contains(e.getRangeAt(c).commonAncestorContainer)) return null;
    const { x: s, y: n, width: r, height: o } = t.getBoundingClientRect();
    let h;
    switch (t.getAttribute("data-main-rotation")) {
      case "90":
        h = (c, d, p, f) => ({
          x: (d - n) / o,
          y: 1 - (c + p - s) / r,
          width: f / o,
          height: p / r
        });
        break;
      case "180":
        h = (c, d, p, f) => ({
          x: 1 - (c + p - s) / r,
          y: 1 - (d + f - n) / o,
          width: p / r,
          height: f / o
        });
        break;
      case "270":
        h = (c, d, p, f) => ({
          x: 1 - (d + f - n) / o,
          y: (c - s) / r,
          width: f / o,
          height: p / r
        });
        break;
      default:
        h = (c, d, p, f) => ({
          x: (c - s) / r,
          y: (d - n) / o,
          width: p / r,
          height: f / o
        });
    }
    const l = [];
    for (let c = 0, d = e.rangeCount; c < d; c++) {
      const p = e.getRangeAt(c);
      if (!p.collapsed) for (const { x: f, y: v, width: m, height: b } of p.getClientRects()) m !== 0 && b !== 0 && l.push(h(f, v, m, b));
    }
    return l.length === 0 ? null : l;
  }
  addChangedExistingAnnotation({ annotationElementId: t, id: e }) {
    (a(en, this) || u(en, this, /* @__PURE__ */ new Map())).set(t, e);
  }
  removeChangedExistingAnnotation({ annotationElementId: t }) {
    a(en, this)?.delete(t);
  }
  renderAnnotationElement(t) {
    const e = a(en, this)?.get(t.data.id);
    if (!e) return;
    const s = a(Di, this).getRawValue(e);
    s && (a(Tt, this) !== W.NONE || s.hasBeenModified) && s.renderAnnotationElement(t);
  }
};
function Bl({ anchorNode: i }) {
  return i.nodeType === Node.TEXT_NODE ? i.parentElement : i;
}
function Sd(i) {
  const { currentLayer: t } = this;
  if (t.hasTextLayer(i)) return t;
  for (const e of a(Ot, this).values()) if (e.hasTextLayer(i)) return e;
  return null;
}
function Pp() {
  const i = document.getSelection();
  if (!i || i.isCollapsed) return;
  const t = g(D, this, Bl).call(this, i).closest(".textLayer"), e = this.getSelectionBoxes(t);
  e && (a(ei, this) || u(ei, this, new yp(this)), a(ei, this).show(t, e, this.direction === "ltr"));
}
function Tp() {
  const i = document.getSelection();
  if (!i || i.isCollapsed) {
    a($i, this) && (a(ei, this)?.hide(), u($i, this, null), g(D, this, Vt).call(this, { hasSelectedText: !1 }));
    return;
  }
  const { anchorNode: t } = i;
  if (t === a($i, this)) return;
  const e = g(D, this, Bl).call(this, i).closest(".textLayer");
  if (e) {
    if (a(ei, this)?.hide(), u($i, this, t), g(D, this, Vt).call(this, { hasSelectedText: !0 }), (a(Tt, this) === W.HIGHLIGHT || a(Tt, this) === W.NONE) && (a(Tt, this) === W.HIGHLIGHT && this.showAllEditors("highlight", !0, !0), u(Ds, this, this.isShiftKeyDown), !this.isShiftKeyDown)) {
      const s = a(Tt, this) === W.HIGHLIGHT ? g(D, this, Sd).call(this, e) : null;
      s?.toggleDrawing();
      const n = new AbortController(), r = this.combinedSignal(n), o = (h) => {
        (h.type !== "pointerup" || h.button === 0) && (n.abort(), s?.toggleDrawing(!0), h.type === "pointerup" && g(D, this, Oh).call(this, "main_toolbar"));
      };
      window.addEventListener("pointerup", o, { signal: r }), window.addEventListener("blur", o, { signal: r });
    }
  } else a($i, this) && (a(ei, this)?.hide(), u($i, this, null), g(D, this, Vt).call(this, { hasSelectedText: !1 }));
}
function Oh(i = "") {
  a(Tt, this) === W.HIGHLIGHT ? this.highlightSelection(i) : a(Lh, this) && g(D, this, Pp).call(this);
}
function Rp() {
  document.addEventListener("selectionchange", g(D, this, Tp).bind(this), { signal: this._signal });
}
function Dp() {
  if (a(Gs, this)) return;
  u(Gs, this, new AbortController());
  const i = this.combinedSignal(a(Gs, this));
  window.addEventListener("focus", this.focus.bind(this), { signal: i }), window.addEventListener("blur", this.blur.bind(this), { signal: i });
}
function Ip() {
  a(Gs, this)?.abort(), u(Gs, this, null);
}
function ac() {
  if (a(js, this)) return;
  u(js, this, new AbortController());
  const i = this.combinedSignal(a(js, this));
  window.addEventListener("keydown", this.keydown.bind(this), { signal: i }), window.addEventListener("keyup", this.keyup.bind(this), { signal: i });
}
function Lp() {
  a(js, this)?.abort(), u(js, this, null);
}
function rc() {
  if (a(zs, this)) return;
  u(zs, this, new AbortController());
  const i = this.combinedSignal(a(zs, this));
  document.addEventListener("copy", this.copy.bind(this), { signal: i }), document.addEventListener("cut", this.cut.bind(this), { signal: i }), document.addEventListener("paste", this.paste.bind(this), { signal: i });
}
function oc() {
  a(zs, this)?.abort(), u(zs, this, null);
}
function Fp() {
  const i = this._signal;
  document.addEventListener("dragover", this.dragOver.bind(this), { signal: i }), document.addEventListener("drop", this.drop.bind(this), { signal: i });
}
function Vt(i) {
  Object.entries(i).some((([t, e]) => a(Fh, this)[t] !== e)) && (this._eventBus.dispatch("annotationeditorstateschanged", {
    source: this,
    details: Object.assign(a(Fh, this), i)
  }), a(Tt, this) === W.HIGHLIGHT && i.hasSelectedEditor === !1 && g(D, this, mi).call(this, [[U.HIGHLIGHT_FREE, !0]]));
}
function mi(i) {
  this._eventBus.dispatch("annotationeditorparamschanged", {
    source: this,
    details: i
  });
}
async function Np() {
  if (!a(Qs, this)) {
    u(Qs, this, !0);
    const i = [];
    for (const t of a(Ot, this).values()) i.push(t.enable());
    await Promise.all(i);
    for (const t of a(St, this).values()) t.enable();
  }
}
function Op() {
  if (this.unselectAll(), a(Qs, this)) {
    u(Qs, this, !1);
    for (const i of a(Ot, this).values()) i.disable();
    for (const i of a(St, this).values()) i.disable();
  }
}
function hc(i) {
  const t = a(Ot, this).get(i.pageIndex);
  t ? t.addOrRebuild(i) : (this.addEditor(i), this.addToAnnotationStorage(i));
}
function Wp() {
  let i = null;
  for (i of a(tt, this)) ;
  return i;
}
function Ca() {
  if (a(St, this).size === 0) return !0;
  if (a(St, this).size === 1) for (const i of a(St, this).values()) return i.isEmpty();
  return !1;
}
function lc(i) {
  for (const t of a(tt, this)) t.unselect();
  a(tt, this).clear();
  for (const t of i) t.isEmpty() || (a(tt, this).add(t), t.select());
  g(D, this, Vt).call(this, { hasSelectedEditor: this.hasSelection });
}
L(hs, "TRANSLATE_SMALL", 1);
L(hs, "TRANSLATE_BIG", 10);
var Rt = /* @__PURE__ */ new WeakMap(), _i = /* @__PURE__ */ new WeakMap(), He = /* @__PURE__ */ new WeakMap(), yr = /* @__PURE__ */ new WeakMap(), bi = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), Pa = /* @__PURE__ */ new WeakMap(), hi = /* @__PURE__ */ new WeakMap(), re = /* @__PURE__ */ new WeakMap(), Li = /* @__PURE__ */ new WeakMap(), hn = /* @__PURE__ */ new WeakMap(), vi = /* @__PURE__ */ new WeakMap(), wi = /* @__PURE__ */ new WeakSet(), Wh = class xr {
  constructor(t) {
    G(this, wi), _(this, Rt, null), _(this, _i, !1), _(this, He, null), _(this, yr, null), _(this, bi, null), _(this, we, null), _(this, Pa, !1), _(this, hi, null), _(this, re, null), _(this, Li, null), _(this, hn, null), _(this, vi, !1), u(re, this, t), u(vi, this, t._uiManager.useNewAltTextFlow), Ws._ || (Ws._ = Object.freeze({
      added: "pdfjs-editor-new-alt-text-added-button",
      "added-label": "pdfjs-editor-new-alt-text-added-button-label",
      missing: "pdfjs-editor-new-alt-text-missing-button",
      "missing-label": "pdfjs-editor-new-alt-text-missing-button-label",
      review: "pdfjs-editor-new-alt-text-to-review-button",
      "review-label": "pdfjs-editor-new-alt-text-to-review-button-label"
    }));
  }
  static initialize(t) {
    xr._l10n ?? (xr._l10n = t);
  }
  async render() {
    const t = u(He, this, document.createElement("button"));
    t.className = "altText", t.tabIndex = "0";
    const e = u(yr, this, document.createElement("span"));
    t.append(e), a(vi, this) ? (t.classList.add("new"), t.setAttribute("data-l10n-id", Ws._.missing), e.setAttribute("data-l10n-id", Ws._["missing-label"])) : (t.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-button"), e.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-button-label"));
    const s = a(re, this)._uiManager._signal;
    t.addEventListener("contextmenu", ke, { signal: s }), t.addEventListener("pointerdown", ((r) => r.stopPropagation()), { signal: s });
    const n = (r) => {
      r.preventDefault(), a(re, this)._uiManager.editAltText(a(re, this)), a(vi, this) && a(re, this)._reportTelemetry({
        action: "pdfjs.image.alt_text.image_status_label_clicked",
        data: { label: Kr.call(g(wi, this)) }
      });
    };
    return t.addEventListener("click", n, {
      capture: !0,
      signal: s
    }), t.addEventListener("keydown", ((r) => {
      r.target === t && r.key === "Enter" && (u(Pa, this, !0), n(r));
    }), { signal: s }), await g(wi, this, Oo).call(this), t;
  }
  finish() {
    a(He, this) && (a(He, this).focus({ focusVisible: a(Pa, this) }), u(Pa, this, !1));
  }
  isEmpty() {
    return a(vi, this) ? a(Rt, this) === null : !a(Rt, this) && !a(_i, this);
  }
  hasData() {
    return a(vi, this) ? a(Rt, this) !== null || !!a(Li, this) : this.isEmpty();
  }
  get guessedText() {
    return a(Li, this);
  }
  async setGuessedText(t) {
    a(Rt, this) === null && (u(Li, this, t), u(hn, this, await xr._l10n.get("pdfjs-editor-new-alt-text-generated-alt-text-with-disclaimer", { generatedAltText: t })), g(wi, this, Oo).call(this));
  }
  toggleAltTextBadge(t = !1) {
    if (a(vi, this) && !a(Rt, this)) {
      if (!a(hi, this)) {
        const e = u(hi, this, document.createElement("div"));
        e.className = "noAltTextBadge", a(re, this).div.append(e);
      }
      a(hi, this).classList.toggle("hidden", !t);
    } else
      a(hi, this)?.remove(), u(hi, this, null);
  }
  serialize(t) {
    let e = a(Rt, this);
    return t || a(Li, this) !== e || (e = a(hn, this)), {
      altText: e,
      decorative: a(_i, this),
      guessedText: a(Li, this),
      textWithDisclaimer: a(hn, this)
    };
  }
  get data() {
    return {
      altText: a(Rt, this),
      decorative: a(_i, this)
    };
  }
  set data({ altText: t, decorative: e, guessedText: s, textWithDisclaimer: n, cancel: r = !1 }) {
    s && (u(Li, this, s), u(hn, this, n)), (a(Rt, this) !== t || a(_i, this) !== e) && (r || (u(Rt, this, t), u(_i, this, e)), g(wi, this, Oo).call(this));
  }
  toggle(t = !1) {
    a(He, this) && (!t && a(we, this) && (clearTimeout(a(we, this)), u(we, this, null)), a(He, this).disabled = !t);
  }
  shown() {
    a(re, this)._reportTelemetry({
      action: "pdfjs.image.alt_text.image_status_label_displayed",
      data: { label: Kr.call(g(wi, this)) }
    });
  }
  destroy() {
    a(He, this)?.remove(), u(He, this, null), u(yr, this, null), u(bi, this, null), a(hi, this)?.remove(), u(hi, this, null);
  }
};
function Kr() {
  return (a(Rt, this) ? "added" : a(Rt, this) === null && this.guessedText && "review") || "missing";
}
async function Oo() {
  const i = a(He, this);
  if (!i) return;
  if (a(vi, this)) {
    if (i.classList.toggle("done", !!a(Rt, this)), i.setAttribute("data-l10n-id", Ws._[Kr.call(g(wi, this))]), a(yr, this)?.setAttribute("data-l10n-id", Ws._[`${Kr.call(g(wi, this))}-label`]), !a(Rt, this)) {
      a(bi, this)?.remove();
      return;
    }
  } else {
    if (!a(Rt, this) && !a(_i, this)) {
      i.classList.remove("done"), a(bi, this)?.remove();
      return;
    }
    i.classList.add("done"), i.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-edit-button");
  }
  let t = a(bi, this);
  if (!t) {
    u(bi, this, t = document.createElement("span")), t.className = "tooltip", t.setAttribute("role", "tooltip"), t.id = `alt-text-tooltip-${a(re, this).id}`;
    const e = 100, s = a(re, this)._uiManager._signal;
    s.addEventListener("abort", (() => {
      clearTimeout(a(we, this)), u(we, this, null);
    }), { once: !0 }), i.addEventListener("mouseenter", (() => {
      u(we, this, setTimeout((() => {
        u(we, this, null), a(bi, this).classList.add("show"), a(re, this)._reportTelemetry({ action: "alt_text_tooltip" });
      }), e));
    }), { signal: s }), i.addEventListener("mouseleave", (() => {
      a(we, this) && (clearTimeout(a(we, this)), u(we, this, null)), a(bi, this)?.classList.remove("show");
    }), { signal: s });
  }
  a(_i, this) ? t.setAttribute("data-l10n-id", "pdfjs-editor-alt-text-decorative-tooltip") : (t.removeAttribute("data-l10n-id"), t.textContent = a(Rt, this)), t.parentNode || i.append(t), a(re, this).getImageForAltText()?.setAttribute("aria-describedby", t.id);
}
var Ws = { _: null };
L(Wh, "_l10n", null);
var Bh = /* @__PURE__ */ new WeakMap(), Qn = /* @__PURE__ */ new WeakMap(), Hh = /* @__PURE__ */ new WeakMap(), $h = /* @__PURE__ */ new WeakMap(), zh = /* @__PURE__ */ new WeakMap(), Gh = /* @__PURE__ */ new WeakMap(), jh = /* @__PURE__ */ new WeakMap(), Sr = /* @__PURE__ */ new WeakMap(), ls = /* @__PURE__ */ new WeakMap(), ln = /* @__PURE__ */ new WeakMap(), Vs = /* @__PURE__ */ new WeakMap(), Jn = /* @__PURE__ */ new WeakSet(), Hl = class {
  constructor({ container: i, isPinchingDisabled: t = null, isPinchingStopped: e = null, onPinchStart: s = null, onPinching: n = null, onPinchEnd: r = null, signal: o }) {
    G(this, Jn), _(this, Bh, void 0), _(this, Qn, !1), _(this, Hh, null), _(this, $h, void 0), _(this, zh, void 0), _(this, Gh, void 0), _(this, jh, void 0), _(this, Sr, void 0), _(this, ls, null), _(this, ln, void 0), _(this, Vs, null), u(Bh, this, i), u(Hh, this, e), u($h, this, t), u(zh, this, s), u(Gh, this, n), u(jh, this, r), u(ln, this, new AbortController()), u(Sr, this, AbortSignal.any([o, a(ln, this).signal])), i.addEventListener("touchstart", g(Jn, this, Bp).bind(this), {
      passive: !1,
      signal: a(Sr, this)
    });
  }
  get MIN_TOUCH_DISTANCE_TO_PINCH() {
    return $(this, "MIN_TOUCH_DISTANCE_TO_PINCH", 35 / (window.devicePixelRatio || 1));
  }
  destroy() {
    a(ln, this)?.abort(), u(ln, this, null);
  }
};
cd = Hl;
function Bp(i) {
  if (a($h, this)?.call(this) || i.touches.length < 2) return;
  if (!a(Vs, this)) {
    u(Vs, this, new AbortController());
    const s = AbortSignal.any([a(Sr, this), a(Vs, this).signal]), n = a(Bh, this), r = {
      signal: s,
      passive: !1
    };
    n.addEventListener("touchmove", g(Jn, this, Hp).bind(this), r), n.addEventListener("touchend", g(Jn, this, cc).bind(this), r), n.addEventListener("touchcancel", g(Jn, this, cc).bind(this), r), a(zh, this)?.call(this);
  }
  if (ie(i), i.touches.length !== 2 || a(Hh, this)?.call(this)) {
    u(ls, this, null);
    return;
  }
  let [t, e] = i.touches;
  t.identifier > e.identifier && ([t, e] = [e, t]), u(ls, this, {
    touch0X: t.screenX,
    touch0Y: t.screenY,
    touch1X: e.screenX,
    touch1Y: e.screenY
  });
}
function Hp(i) {
  if (!a(ls, this) || i.touches.length !== 2) return;
  let [t, e] = i.touches;
  t.identifier > e.identifier && ([t, e] = [e, t]);
  const { screenX: s, screenY: n } = t, { screenX: r, screenY: o } = e, h = a(ls, this), { touch0X: l, touch0Y: c, touch1X: d, touch1Y: p } = h, f = d - l, v = p - c, m = r - s, b = o - n, w = Math.hypot(m, b) || 1, A = Math.hypot(f, v) || 1;
  if (!a(Qn, this) && Math.abs(A - w) <= cd.MIN_TOUCH_DISTANCE_TO_PINCH) return;
  if (h.touch0X = s, h.touch0Y = n, h.touch1X = r, h.touch1Y = o, i.preventDefault(), !a(Qn, this)) {
    u(Qn, this, !0);
    return;
  }
  const y = [(s + r) / 2, (n + o) / 2];
  a(Gh, this)?.call(this, y, A, w);
}
function cc(i) {
  a(Vs, this).abort(), u(Vs, this, null), a(jh, this)?.call(this), a(ls, this) && (i.preventDefault(), u(ls, this, null), u(Qn, this, !1));
}
var cn = /* @__PURE__ */ new WeakMap(), Ve = /* @__PURE__ */ new WeakMap(), at = /* @__PURE__ */ new WeakMap(), Ta = /* @__PURE__ */ new WeakMap(), Is = /* @__PURE__ */ new WeakMap(), Vh = /* @__PURE__ */ new WeakMap(), dn = /* @__PURE__ */ new WeakMap(), Ht = /* @__PURE__ */ new WeakMap(), Zn = /* @__PURE__ */ new WeakMap(), ss = /* @__PURE__ */ new WeakMap(), Us = /* @__PURE__ */ new WeakMap(), Uh = /* @__PURE__ */ new WeakMap(), Bn = /* @__PURE__ */ new WeakMap(), Wt = /* @__PURE__ */ new WeakMap(), Wo = /* @__PURE__ */ new WeakMap(), un = /* @__PURE__ */ new WeakMap(), Ki = /* @__PURE__ */ new WeakMap(), li = /* @__PURE__ */ new WeakMap(), kr = /* @__PURE__ */ new WeakMap(), Mr = /* @__PURE__ */ new WeakMap(), de = /* @__PURE__ */ new WeakMap(), Ls = /* @__PURE__ */ new WeakMap(), Bo = /* @__PURE__ */ new WeakMap(), dc = /* @__PURE__ */ new WeakMap(), q = /* @__PURE__ */ new WeakSet(), Q = class yt {
  static get _resizerKeyboardManager() {
    const t = yt.prototype._resizeWithKeyboard, e = hs.TRANSLATE_SMALL, s = hs.TRANSLATE_BIG;
    return $(this, "_resizerKeyboardManager", new _a([
      [
        ["ArrowLeft", "mac+ArrowLeft"],
        t,
        { args: [-e, 0] }
      ],
      [
        ["ctrl+ArrowLeft", "mac+shift+ArrowLeft"],
        t,
        { args: [-s, 0] }
      ],
      [
        ["ArrowRight", "mac+ArrowRight"],
        t,
        { args: [e, 0] }
      ],
      [
        ["ctrl+ArrowRight", "mac+shift+ArrowRight"],
        t,
        { args: [s, 0] }
      ],
      [
        ["ArrowUp", "mac+ArrowUp"],
        t,
        { args: [0, -e] }
      ],
      [
        ["ctrl+ArrowUp", "mac+shift+ArrowUp"],
        t,
        { args: [0, -s] }
      ],
      [
        ["ArrowDown", "mac+ArrowDown"],
        t,
        { args: [0, e] }
      ],
      [
        ["ctrl+ArrowDown", "mac+shift+ArrowDown"],
        t,
        { args: [0, s] }
      ],
      [["Escape", "mac+Escape"], yt.prototype._stopResizingWithKeyboard]
    ]));
  }
  constructor(t) {
    G(this, q), _(this, cn, null), _(this, Ve, null), _(this, at, null), _(this, Ta, !1), _(this, Is, null), _(this, Vh, ""), _(this, dn, !1), _(this, Ht, null), _(this, Zn, null), _(this, ss, null), _(this, Us, null), _(this, Uh, ""), _(this, Bn, !1), _(this, Wt, null), _(this, Wo, !1), _(this, un, !1), _(this, Ki, !1), _(this, li, null), _(this, kr, 0), _(this, Mr, 0), _(this, de, null), _(this, Ls, null), L(this, "_editToolbar", null), L(this, "_initialOptions", /* @__PURE__ */ Object.create(null)), L(this, "_initialData", null), L(this, "_isVisible", !0), L(this, "_uiManager", null), L(this, "_focusEventsAllowed", !0), _(this, Bo, !1), _(this, dc, yt._zIndex++), this.parent = t.parent, this.id = t.id, this.width = this.height = null, this.pageIndex = t.parent.pageIndex, this.name = t.name, this.div = null, this._uiManager = t.uiManager, this.annotationElementId = null, this._willKeepAspectRatio = !1, this._initialOptions.isCentered = t.isCentered, this._structTreeParentId = null;
    const { rotation: e, rawDims: { pageWidth: s, pageHeight: n, pageX: r, pageY: o } } = this.parent.viewport;
    this.rotation = e, this.pageRotation = (360 + e - this._uiManager.viewParameters.rotation) % 360, this.pageDimensions = [s, n], this.pageTranslation = [r, o];
    const [h, l] = this.parentDimensions;
    this.x = t.x / h, this.y = t.y / l, this.isAttachedToDOM = !1, this.deleted = !1;
  }
  get editorType() {
    return Object.getPrototypeOf(this).constructor._type;
  }
  static get isDrawer() {
    return !1;
  }
  static get _defaultLineColor() {
    return $(this, "_defaultLineColor", this._colorManager.getHexCode("CanvasText"));
  }
  static deleteAnnotationElement(t) {
    const e = new Kp({
      id: t.parent.getNextId(),
      parent: t.parent,
      uiManager: t._uiManager
    });
    e.annotationElementId = t.annotationElementId, e.deleted = !0, e._uiManager.addToAnnotationStorage(e);
  }
  static initialize(t, e) {
    if (yt._l10n ?? (yt._l10n = t), yt._l10nResizer || (yt._l10nResizer = Object.freeze({
      topLeft: "pdfjs-editor-resizer-top-left",
      topMiddle: "pdfjs-editor-resizer-top-middle",
      topRight: "pdfjs-editor-resizer-top-right",
      middleRight: "pdfjs-editor-resizer-middle-right",
      bottomRight: "pdfjs-editor-resizer-bottom-right",
      bottomMiddle: "pdfjs-editor-resizer-bottom-middle",
      bottomLeft: "pdfjs-editor-resizer-bottom-left",
      middleLeft: "pdfjs-editor-resizer-middle-left"
    })), yt._borderLineWidth !== -1) return;
    const s = getComputedStyle(document.documentElement);
    yt._borderLineWidth = parseFloat(s.getPropertyValue("--outline-width")) || 0;
  }
  static updateDefaultParams(t, e) {
  }
  static get defaultPropertiesToUpdate() {
    return [];
  }
  static isHandlingMimeForPasting(t) {
    return !1;
  }
  static paste(t, e) {
    et("Not implemented");
  }
  get propertiesToUpdate() {
    return [];
  }
  get _isDraggable() {
    return a(Bo, this);
  }
  set _isDraggable(t) {
    u(Bo, this, t), this.div?.classList.toggle("draggable", t);
  }
  get isEnterHandled() {
    return !0;
  }
  center() {
    const [t, e] = this.pageDimensions;
    switch (this.parentRotation) {
      case 90:
        this.x -= this.height * e / (2 * t), this.y += this.width * t / (2 * e);
        break;
      case 180:
        this.x += this.width / 2, this.y += this.height / 2;
        break;
      case 270:
        this.x += this.height * e / (2 * t), this.y -= this.width * t / (2 * e);
        break;
      default:
        this.x -= this.width / 2, this.y -= this.height / 2;
    }
    this.fixAndSetPosition();
  }
  addCommands(t) {
    this._uiManager.addCommands(t);
  }
  get currentLayer() {
    return this._uiManager.currentLayer;
  }
  setInBackground() {
    this.div.style.zIndex = 0;
  }
  setInForeground() {
    this.div.style.zIndex = a(dc, this);
  }
  setParent(t) {
    t !== null ? (this.pageIndex = t.pageIndex, this.pageDimensions = t.pageDimensions) : g(q, this, Er).call(this), this.parent = t;
  }
  focusin(t) {
    this._focusEventsAllowed && (a(Bn, this) ? u(Bn, this, !1) : this.parent.setSelected(this));
  }
  focusout(t) {
    this._focusEventsAllowed && this.isAttachedToDOM && (t.relatedTarget?.closest(`#${this.id}`) || (t.preventDefault(), this.parent?.isMultipleSelection || this.commitOrRemove()));
  }
  commitOrRemove() {
    this.isEmpty() ? this.remove() : this.commit();
  }
  commit() {
    this.addToAnnotationStorage();
  }
  addToAnnotationStorage() {
    this._uiManager.addToAnnotationStorage(this);
  }
  setAt(t, e, s, n) {
    const [r, o] = this.parentDimensions;
    [s, n] = this.screenToPageTranslation(s, n), this.x = (t + s) / r, this.y = (e + n) / o, this.fixAndSetPosition();
  }
  translate(t, e) {
    g(q, this, uc).call(this, this.parentDimensions, t, e);
  }
  translateInPage(t, e) {
    a(Wt, this) || u(Wt, this, [
      this.x,
      this.y,
      this.width,
      this.height
    ]), g(q, this, uc).call(this, this.pageDimensions, t, e), this.div.scrollIntoView({ block: "nearest" });
  }
  drag(t, e) {
    a(Wt, this) || u(Wt, this, [
      this.x,
      this.y,
      this.width,
      this.height
    ]);
    const { div: s, parentDimensions: [n, r] } = this;
    if (this.x += t / n, this.y += e / r, this.parent && (this.x < 0 || this.x > 1 || this.y < 0 || this.y > 1)) {
      const { x: p, y: f } = this.div.getBoundingClientRect();
      this.parent.findNewParent(this, p, f) && (this.x -= Math.floor(this.x), this.y -= Math.floor(this.y));
    }
    let { x: o, y: h } = this;
    const [l, c] = this.getBaseTranslation();
    o += l, h += c;
    const { style: d } = s;
    d.left = `${(100 * o).toFixed(2)}%`, d.top = `${(100 * h).toFixed(2)}%`, this._onTranslating(o, h), s.scrollIntoView({ block: "nearest" });
  }
  _onTranslating(t, e) {
  }
  _onTranslated(t, e) {
  }
  get _hasBeenMoved() {
    return !!a(Wt, this) && (a(Wt, this)[0] !== this.x || a(Wt, this)[1] !== this.y);
  }
  get _hasBeenResized() {
    return !!a(Wt, this) && (a(Wt, this)[2] !== this.width || a(Wt, this)[3] !== this.height);
  }
  getBaseTranslation() {
    const [t, e] = this.parentDimensions, { _borderLineWidth: s } = yt, n = s / t, r = s / e;
    switch (this.rotation) {
      case 90:
        return [-n, r];
      case 180:
        return [n, r];
      case 270:
        return [n, -r];
      default:
        return [-n, -r];
    }
  }
  get _mustFixPosition() {
    return !0;
  }
  fixAndSetPosition(t = this.rotation) {
    const { div: { style: e }, pageDimensions: [s, n] } = this;
    let { x: r, y: o, width: h, height: l } = this;
    if (h *= s, l *= n, r *= s, o *= n, this._mustFixPosition) switch (t) {
      case 0:
        r = Math.max(0, Math.min(s - h, r)), o = Math.max(0, Math.min(n - l, o));
        break;
      case 90:
        r = Math.max(0, Math.min(s - l, r)), o = Math.min(n, Math.max(h, o));
        break;
      case 180:
        r = Math.min(s, Math.max(h, r)), o = Math.min(n, Math.max(l, o));
        break;
      case 270:
        r = Math.min(s, Math.max(l, r)), o = Math.max(0, Math.min(n - h, o));
    }
    this.x = r /= s, this.y = o /= n;
    const [c, d] = this.getBaseTranslation();
    r += c, o += d, e.left = `${(100 * r).toFixed(2)}%`, e.top = `${(100 * o).toFixed(2)}%`, this.moveInDOM();
  }
  screenToPageTranslation(t, e) {
    return pc.call(yt, t, e, this.parentRotation);
  }
  pageTranslationToScreen(t, e) {
    return pc.call(yt, t, e, 360 - this.parentRotation);
  }
  get parentScale() {
    return this._uiManager.viewParameters.realScale;
  }
  get parentRotation() {
    return (this._uiManager.viewParameters.rotation + this.pageRotation) % 360;
  }
  get parentDimensions() {
    const { parentScale: t, pageDimensions: [e, s] } = this;
    return [e * t, s * t];
  }
  setDims(t, e) {
    const [s, n] = this.parentDimensions, { style: r } = this.div;
    r.width = `${(100 * t / s).toFixed(2)}%`, a(dn, this) || (r.height = `${(100 * e / n).toFixed(2)}%`);
  }
  fixDims() {
    const { style: t } = this.div, { height: e, width: s } = t, n = s.endsWith("%"), r = !a(dn, this) && e.endsWith("%");
    if (n && r) return;
    const [o, h] = this.parentDimensions;
    n || (t.width = `${(100 * parseFloat(s) / o).toFixed(2)}%`), a(dn, this) || r || (t.height = `${(100 * parseFloat(e) / h).toFixed(2)}%`);
  }
  getInitialTranslation() {
    return [0, 0];
  }
  _onResized() {
  }
  static _round(t) {
    return Math.round(1e4 * t) / 1e4;
  }
  _onResizing() {
  }
  altTextFinish() {
    a(at, this)?.finish();
  }
  async addEditToolbar() {
    return this._editToolbar || a(un, this) ? this._editToolbar : (this._editToolbar = new vp(this), this.div.append(this._editToolbar.render()), a(at, this) && await this._editToolbar.addAltText(a(at, this)), this._editToolbar);
  }
  removeEditToolbar() {
    this._editToolbar && (this._editToolbar.remove(), this._editToolbar = null, a(at, this)?.destroy());
  }
  addContainer(t) {
    const e = this._editToolbar?.div;
    e ? e.before(t) : this.div.append(t);
  }
  getClientDimensions() {
    return this.div.getBoundingClientRect();
  }
  async addAltTextButton() {
    a(at, this) || (Wh.initialize(yt._l10n), u(at, this, new Wh(this)), a(cn, this) && (a(at, this).data = a(cn, this), u(cn, this, null)), await this.addEditToolbar());
  }
  get altTextData() {
    return a(at, this)?.data;
  }
  set altTextData(t) {
    a(at, this) && (a(at, this).data = t);
  }
  get guessedAltText() {
    return a(at, this)?.guessedText;
  }
  async setGuessedAltText(t) {
    await a(at, this)?.setGuessedText(t);
  }
  serializeAltText(t) {
    return a(at, this)?.serialize(t);
  }
  hasAltText() {
    return !!a(at, this) && !a(at, this).isEmpty();
  }
  hasAltTextData() {
    return a(at, this)?.hasData() ?? !1;
  }
  render() {
    this.div = document.createElement("div"), this.div.setAttribute("data-editor-rotation", (360 - this.rotation) % 360), this.div.className = this.name, this.div.setAttribute("id", this.id), this.div.tabIndex = a(Ta, this) ? -1 : 0, this._isVisible || this.div.classList.add("hidden"), this.setInForeground(), g(q, this, fc).call(this);
    const [t, e] = this.parentDimensions;
    this.parentRotation % 180 != 0 && (this.div.style.maxWidth = `${(100 * e / t).toFixed(2)}%`, this.div.style.maxHeight = `${(100 * t / e).toFixed(2)}%`);
    const [s, n] = this.getInitialTranslation();
    return this.translate(s, n), Yr(this, this.div, ["pointerdown"]), this.isResizable && this._uiManager._supportsPinchToZoom && (a(Ls, this) || u(Ls, this, new Hl({
      container: this.div,
      isPinchingDisabled: () => !this.isSelected,
      onPinchStart: g(q, this, Gp).bind(this),
      onPinching: g(q, this, jp).bind(this),
      onPinchEnd: g(q, this, Vp).bind(this),
      signal: this._uiManager._signal
    }))), this._uiManager._editorUndoBar?.hide(), this.div;
  }
  pointerdown(t) {
    const { isMac: e } = Gt.platform;
    t.button !== 0 || t.ctrlKey && e ? t.preventDefault() : (u(Bn, this, !0), this._isDraggable ? g(q, this, Up).call(this, t) : g(q, this, Md).call(this, t));
  }
  get isSelected() {
    return this._uiManager.isSelected(this);
  }
  _onStartDragging() {
  }
  _onStopDragging() {
  }
  moveInDOM() {
    a(li, this) && clearTimeout(a(li, this)), u(li, this, setTimeout((() => {
      u(li, this, null), this.parent?.moveEditorInDOM(this);
    }), 0));
  }
  _setParentAndPosition(t, e, s) {
    t.changeParent(this), this.x = e, this.y = s, this.fixAndSetPosition(), this._onTranslated();
  }
  getRect(t, e, s = this.rotation) {
    const n = this.parentScale, [r, o] = this.pageDimensions, [h, l] = this.pageTranslation, c = t / n, d = e / n, p = this.x * r, f = this.y * o, v = this.width * r, m = this.height * o;
    switch (s) {
      case 0:
        return [
          p + c + h,
          o - f - d - m + l,
          p + c + v + h,
          o - f - d + l
        ];
      case 90:
        return [
          p + d + h,
          o - f + c + l,
          p + d + m + h,
          o - f + c + v + l
        ];
      case 180:
        return [
          p - c - v + h,
          o - f + d + l,
          p - c + h,
          o - f + d + m + l
        ];
      case 270:
        return [
          p - d - m + h,
          o - f - c - v + l,
          p - d + h,
          o - f - c + l
        ];
      default:
        throw new Error("Invalid rotation");
    }
  }
  getRectInCurrentCoords(t, e) {
    const [s, n, r, o] = t, h = r - s, l = o - n;
    switch (this.rotation) {
      case 0:
        return [
          s,
          e - o,
          h,
          l
        ];
      case 90:
        return [
          s,
          e - n,
          l,
          h
        ];
      case 180:
        return [
          r,
          e - n,
          h,
          l
        ];
      case 270:
        return [
          r,
          e - o,
          l,
          h
        ];
      default:
        throw new Error("Invalid rotation");
    }
  }
  onceAdded(t) {
  }
  isEmpty() {
    return !1;
  }
  enableEditMode() {
    u(un, this, !0);
  }
  disableEditMode() {
    u(un, this, !1);
  }
  isInEditMode() {
    return a(un, this);
  }
  shouldGetKeyboardEvents() {
    return a(Ki, this);
  }
  needsToBeRebuilt() {
    return this.div && !this.isAttachedToDOM;
  }
  get isOnScreen() {
    const { top: t, left: e, bottom: s, right: n } = this.getClientDimensions(), { innerHeight: r, innerWidth: o } = window;
    return e < o && n > 0 && t < r && s > 0;
  }
  rebuild() {
    g(q, this, fc).call(this);
  }
  rotate(t) {
  }
  resize() {
  }
  serializeDeleted() {
    return {
      id: this.annotationElementId,
      deleted: !0,
      pageIndex: this.pageIndex,
      popupRef: this._initialData?.popupRef || ""
    };
  }
  serialize(t = !1, e = null) {
    et("An editor must be serializable");
  }
  static async deserialize(t, e, s) {
    const n = new this.prototype.constructor({
      parent: e,
      id: e.getNextId(),
      uiManager: s
    });
    n.rotation = t.rotation, u(cn, n, t.accessibilityData);
    const [r, o] = n.pageDimensions, [h, l, c, d] = n.getRectInCurrentCoords(t.rect, o);
    return n.x = h / r, n.y = l / o, n.width = c / r, n.height = d / o, n;
  }
  get hasBeenModified() {
    return !!this.annotationElementId && (this.deleted || this.serialize() !== null);
  }
  remove() {
    if (a(Us, this)?.abort(), u(Us, this, null), this.isEmpty() || this.commit(), this.parent ? this.parent.remove(this) : this._uiManager.removeEditor(this), a(li, this) && (clearTimeout(a(li, this)), u(li, this, null)), g(q, this, Er).call(this), this.removeEditToolbar(), a(de, this)) {
      for (const t of a(de, this).values()) clearTimeout(t);
      u(de, this, null);
    }
    this.parent = null, a(Ls, this)?.destroy(), u(Ls, this, null);
  }
  get isResizable() {
    return !1;
  }
  makeResizable() {
    this.isResizable && (g(q, this, $p).call(this), a(Ht, this).classList.remove("hidden"), Yr(this, this.div, ["keydown"]));
  }
  get toolbarPosition() {
    return null;
  }
  keydown(t) {
    if (!this.isResizable || t.target !== this.div || t.key !== "Enter") return;
    this._uiManager.setSelected(this), u(ss, this, {
      savedX: this.x,
      savedY: this.y,
      savedWidth: this.width,
      savedHeight: this.height
    });
    const e = a(Ht, this).children;
    if (!a(Ve, this)) {
      u(Ve, this, Array.from(e));
      const o = g(q, this, qp).bind(this), h = g(q, this, Xp).bind(this), l = this._uiManager._signal;
      for (const c of a(Ve, this)) {
        const d = c.getAttribute("data-resizer-name");
        c.setAttribute("role", "spinbutton"), c.addEventListener("keydown", o, { signal: l }), c.addEventListener("blur", h, { signal: l }), c.addEventListener("focus", g(q, this, Yp).bind(this, d), { signal: l }), c.setAttribute("data-l10n-id", yt._l10nResizer[d]);
      }
    }
    const s = a(Ve, this)[0];
    let n = 0;
    for (const o of e) {
      if (o === s) break;
      n++;
    }
    const r = (360 - this.rotation + this.parentRotation) % 360 / 90 * (a(Ve, this).length / 4);
    if (r !== n) {
      if (r < n) for (let h = 0; h < n - r; h++) a(Ht, this).append(a(Ht, this).firstChild);
      else if (r > n) for (let h = 0; h < r - n; h++) a(Ht, this).firstChild.before(a(Ht, this).lastChild);
      let o = 0;
      for (const h of e) {
        const l = a(Ve, this)[o++].getAttribute("data-resizer-name");
        h.setAttribute("data-l10n-id", yt._l10nResizer[l]);
      }
    }
    g(q, this, Ed).call(this, 0), u(Ki, this, !0), a(Ht, this).firstChild.focus({ focusVisible: !0 }), t.preventDefault(), t.stopImmediatePropagation();
  }
  _resizeWithKeyboard(t, e) {
    a(Ki, this) && g(q, this, kd).call(this, a(Uh, this), {
      deltaX: t,
      deltaY: e,
      fromKeyboard: !0
    });
  }
  _stopResizingWithKeyboard() {
    g(q, this, Er).call(this), this.div.focus();
  }
  select() {
    this.makeResizable(), this.div?.classList.add("selectedEditor"), this._editToolbar ? (this._editToolbar?.show(), a(at, this)?.toggleAltTextBadge(!1)) : this.addEditToolbar().then((() => {
      this.div?.classList.contains("selectedEditor") && this._editToolbar?.show();
    }));
  }
  unselect() {
    a(Ht, this)?.classList.add("hidden"), this.div?.classList.remove("selectedEditor"), this.div?.contains(document.activeElement) && this._uiManager.currentLayer.div.focus({ preventScroll: !0 }), this._editToolbar?.hide(), a(at, this)?.toggleAltTextBadge(!0);
  }
  updateParams(t, e) {
  }
  disableEditing() {
  }
  enableEditing() {
  }
  enterInEditMode() {
  }
  getImageForAltText() {
    return null;
  }
  get contentDiv() {
    return this.div;
  }
  get isEditing() {
    return a(Wo, this);
  }
  set isEditing(t) {
    u(Wo, this, t), this.parent && (t ? (this.parent.setSelected(this), this.parent.setActiveEditor(this)) : this.parent.setActiveEditor(null));
  }
  setAspectRatio(t, e) {
    u(dn, this, !0);
    const s = t / e, { style: n } = this.div;
    n.aspectRatio = s, n.height = "auto";
  }
  static get MIN_SIZE() {
    return 16;
  }
  static canCreateNewEmptyEditor() {
    return !0;
  }
  get telemetryInitialData() {
    return { action: "added" };
  }
  get telemetryFinalData() {
    return null;
  }
  _reportTelemetry(t, e = !1) {
    if (e) {
      a(de, this) || u(de, this, /* @__PURE__ */ new Map());
      const { action: s } = t;
      let n = a(de, this).get(s);
      n && clearTimeout(n), n = setTimeout((() => {
        this._reportTelemetry(t), a(de, this).delete(s), a(de, this).size === 0 && u(de, this, null);
      }), yt._telemetryTimeout), a(de, this).set(s, n);
    } else
      t.type || (t.type = this.editorType), this._uiManager._eventBus.dispatch("reporttelemetry", {
        source: this,
        details: {
          type: "editing",
          data: t
        }
      });
  }
  show(t = this._isVisible) {
    this.div.classList.toggle("hidden", !t), this._isVisible = t;
  }
  enable() {
    this.div && (this.div.tabIndex = 0), u(Ta, this, !1);
  }
  disable() {
    this.div && (this.div.tabIndex = -1), u(Ta, this, !0);
  }
  renderAnnotationElement(t) {
    let e = t.container.querySelector(".annotationContent");
    if (e) {
      if (e.nodeName === "CANVAS") {
        const s = e;
        e = document.createElement("div"), e.classList.add("annotationContent", this.editorType), s.before(e);
      }
    } else
      e = document.createElement("div"), e.classList.add("annotationContent", this.editorType), t.container.prepend(e);
    return e;
  }
  resetAnnotationElement(t) {
    const { firstChild: e } = t.container;
    e?.nodeName === "DIV" && e.classList.contains("annotationContent") && e.remove();
  }
};
Kt = Q;
function uc([i, t], e, s) {
  [e, s] = this.screenToPageTranslation(e, s), this.x += e / i, this.y += s / t, this._onTranslating(this.x, this.y), this.fixAndSetPosition();
}
function pc(i, t, e) {
  switch (e) {
    case 90:
      return [t, -i];
    case 180:
      return [-i, -t];
    case 270:
      return [-t, i];
    default:
      return [i, t];
  }
}
function qh(i) {
  switch (i) {
    case 90: {
      const [t, e] = this.pageDimensions;
      return [
        0,
        -t / e,
        e / t,
        0
      ];
    }
    case 180:
      return [
        -1,
        0,
        0,
        -1
      ];
    case 270: {
      const [t, e] = this.pageDimensions;
      return [
        0,
        t / e,
        -e / t,
        0
      ];
    }
    default:
      return [
        1,
        0,
        0,
        1
      ];
  }
}
function $p() {
  if (a(Ht, this)) return;
  u(Ht, this, document.createElement("div")), a(Ht, this).classList.add("resizers");
  const i = this._willKeepAspectRatio ? [
    "topLeft",
    "topRight",
    "bottomRight",
    "bottomLeft"
  ] : [
    "topLeft",
    "topMiddle",
    "topRight",
    "middleRight",
    "bottomRight",
    "bottomMiddle",
    "bottomLeft",
    "middleLeft"
  ], t = this._uiManager._signal;
  for (const e of i) {
    const s = document.createElement("div");
    a(Ht, this).append(s), s.classList.add("resizer", e), s.setAttribute("data-resizer-name", e), s.addEventListener("pointerdown", g(q, this, zp).bind(this, e), { signal: t }), s.addEventListener("contextmenu", ke, { signal: t }), s.tabIndex = -1;
  }
  this.div.prepend(a(Ht, this));
}
function zp(i, t) {
  t.preventDefault();
  const { isMac: e } = Gt.platform;
  if (t.button !== 0 || t.ctrlKey && e) return;
  a(at, this)?.toggle(!1);
  const s = this._isDraggable;
  this._isDraggable = !1, u(Zn, this, [t.screenX, t.screenY]);
  const n = new AbortController(), r = this._uiManager.combinedSignal(n);
  this.parent.togglePointerEvents(!1), window.addEventListener("pointermove", g(q, this, kd).bind(this, i), {
    passive: !0,
    capture: !0,
    signal: r
  }), window.addEventListener("touchmove", ie, {
    passive: !1,
    signal: r
  }), window.addEventListener("contextmenu", ke, { signal: r }), u(ss, this, {
    savedX: this.x,
    savedY: this.y,
    savedWidth: this.width,
    savedHeight: this.height
  });
  const o = this.parent.div.style.cursor, h = this.div.style.cursor;
  this.div.style.cursor = this.parent.div.style.cursor = window.getComputedStyle(t.target).cursor;
  const l = () => {
    n.abort(), this.parent.togglePointerEvents(!0), a(at, this)?.toggle(!0), this._isDraggable = s, this.parent.div.style.cursor = o, this.div.style.cursor = h, g(q, this, $l).call(this);
  };
  window.addEventListener("pointerup", l, { signal: r }), window.addEventListener("blur", l, { signal: r });
}
function gc(i, t, e, s) {
  this.width = e, this.height = s, this.x = i, this.y = t;
  const [n, r] = this.parentDimensions;
  this.setDims(n * e, r * s), this.fixAndSetPosition(), this._onResized();
}
function $l() {
  if (!a(ss, this)) return;
  const { savedX: i, savedY: t, savedWidth: e, savedHeight: s } = a(ss, this);
  u(ss, this, null);
  const n = this.x, r = this.y, o = this.width, h = this.height;
  n === i && r === t && o === e && h === s || this.addCommands({
    cmd: g(q, this, gc).bind(this, n, r, o, h),
    undo: g(q, this, gc).bind(this, i, t, e, s),
    mustExec: !0
  });
}
function kd(i, t) {
  const [e, s] = this.parentDimensions, n = this.x, r = this.y, o = this.width, h = this.height, l = Kt.MIN_SIZE / e, c = Kt.MIN_SIZE / s, d = g(q, this, qh).call(this, this.rotation), p = (I, O) => [d[0] * I + d[2] * O, d[1] * I + d[3] * O], f = g(q, this, qh).call(this, 360 - this.rotation);
  let v, m, b = !1, w = !1;
  switch (i) {
    case "topLeft":
      b = !0, v = (I, O) => [0, 0], m = (I, O) => [I, O];
      break;
    case "topMiddle":
      v = (I, O) => [I / 2, 0], m = (I, O) => [I / 2, O];
      break;
    case "topRight":
      b = !0, v = (I, O) => [I, 0], m = (I, O) => [0, O];
      break;
    case "middleRight":
      w = !0, v = (I, O) => [I, O / 2], m = (I, O) => [0, O / 2];
      break;
    case "bottomRight":
      b = !0, v = (I, O) => [I, O], m = (I, O) => [0, 0];
      break;
    case "bottomMiddle":
      v = (I, O) => [I / 2, O], m = (I, O) => [I / 2, 0];
      break;
    case "bottomLeft":
      b = !0, v = (I, O) => [0, O], m = (I, O) => [I, 0];
      break;
    case "middleLeft":
      w = !0, v = (I, O) => [0, O / 2], m = (I, O) => [I, O / 2];
  }
  const A = v(o, h), y = m(o, h);
  let x = p(...y);
  const S = Kt._round(n + x[0]), M = Kt._round(r + x[1]);
  let P, k, F = 1, H = 1;
  if (t.fromKeyboard) ({ deltaX: P, deltaY: k } = t);
  else {
    const { screenX: I, screenY: O } = t, [Qt, se] = a(Zn, this);
    [P, k] = this.screenToPageTranslation(I - Qt, O - se), a(Zn, this)[0] = I, a(Zn, this)[1] = O;
  }
  [P, k] = (j = P / e, z = k / s, [f[0] * j + f[2] * z, f[1] * j + f[3] * z]);
  var j, z;
  if (b) {
    const I = Math.hypot(o, h);
    F = H = Math.max(Math.min(Math.hypot(y[0] - A[0] - P, y[1] - A[1] - k) / I, 1 / o, 1 / h), l / o, c / h);
  } else w ? F = Math.max(l, Math.min(1, Math.abs(y[0] - A[0] - P))) / o : H = Math.max(c, Math.min(1, Math.abs(y[1] - A[1] - k))) / h;
  const Y = Kt._round(o * F), pt = Kt._round(h * H);
  x = p(...m(Y, pt));
  const X = S - x[0], ot = M - x[1];
  a(Wt, this) || u(Wt, this, [
    this.x,
    this.y,
    this.width,
    this.height
  ]), this.width = Y, this.height = pt, this.x = X, this.y = ot, this.setDims(e * Y, s * pt), this.fixAndSetPosition(), this._onResizing();
}
function Gp() {
  u(ss, this, {
    savedX: this.x,
    savedY: this.y,
    savedWidth: this.width,
    savedHeight: this.height
  }), a(at, this)?.toggle(!1), this.parent.togglePointerEvents(!1);
}
function jp(i, t, e) {
  let s = e / t * 0.7 + 1 - 0.7;
  if (s === 1) return;
  const n = g(q, this, qh).call(this, this.rotation), r = (S, M) => [n[0] * S + n[2] * M, n[1] * S + n[3] * M], [o, h] = this.parentDimensions, l = this.x, c = this.y, d = this.width, p = this.height, f = Kt.MIN_SIZE / o, v = Kt.MIN_SIZE / h;
  s = Math.max(Math.min(s, 1 / d, 1 / p), f / d, v / p);
  const m = Kt._round(d * s), b = Kt._round(p * s);
  if (m === d && b === p) return;
  a(Wt, this) || u(Wt, this, [
    l,
    c,
    d,
    p
  ]);
  const w = r(d / 2, p / 2), A = Kt._round(l + w[0]), y = Kt._round(c + w[1]), x = r(m / 2, b / 2);
  this.x = A - x[0], this.y = y - x[1], this.width = m, this.height = b, this.setDims(o * m, h * b), this.fixAndSetPosition(), this._onResizing();
}
function Vp() {
  a(at, this)?.toggle(!0), this.parent.togglePointerEvents(!0), g(q, this, $l).call(this);
}
function Md(i) {
  const { isMac: t } = Gt.platform;
  i.ctrlKey && !t || i.shiftKey || i.metaKey && t ? this.parent.toggleSelected(this) : this.parent.setSelected(this);
}
function Up(i) {
  const { isSelected: t } = this;
  this._uiManager.setUpDragSession();
  let e = !1;
  const s = new AbortController(), n = this._uiManager.combinedSignal(s), r = {
    capture: !0,
    passive: !1,
    signal: n
  }, o = (l) => {
    s.abort(), u(Is, this, null), u(Bn, this, !1), this._uiManager.endDragSession() || g(q, this, Md).call(this, l), e && this._onStopDragging();
  };
  t && (u(kr, this, i.clientX), u(Mr, this, i.clientY), u(Is, this, i.pointerId), u(Vh, this, i.pointerType), window.addEventListener("pointermove", ((l) => {
    e || (e = !0, this._onStartDragging());
    const { clientX: c, clientY: d, pointerId: p } = l;
    if (p !== a(Is, this)) {
      ie(l);
      return;
    }
    const [f, v] = this.screenToPageTranslation(c - a(kr, this), d - a(Mr, this));
    u(kr, this, c), u(Mr, this, d), this._uiManager.dragSelectedEditors(f, v);
  }), r), window.addEventListener("touchmove", ie, r), window.addEventListener("pointerdown", ((l) => {
    l.pointerType === a(Vh, this) && (a(Ls, this) || l.isPrimary) && o(l), ie(l);
  }), r));
  const h = (l) => {
    a(Is, this) && a(Is, this) !== l.pointerId ? ie(l) : o(l);
  };
  window.addEventListener("pointerup", h, { signal: n }), window.addEventListener("blur", h, { signal: n });
}
function fc() {
  if (a(Us, this) || !this.div) return;
  u(Us, this, new AbortController());
  const i = this._uiManager.combinedSignal(a(Us, this));
  this.div.addEventListener("focusin", this.focusin.bind(this), { signal: i }), this.div.addEventListener("focusout", this.focusout.bind(this), { signal: i });
}
function qp(i) {
  Kt._resizerKeyboardManager.exec(this, i);
}
function Xp(i) {
  a(Ki, this) && i.relatedTarget?.parentNode !== a(Ht, this) && g(q, this, Er).call(this);
}
function Yp(i) {
  u(Uh, this, a(Ki, this) ? i : "");
}
function Ed(i) {
  if (a(Ve, this)) for (const t of a(Ve, this)) t.tabIndex = i;
}
function Er() {
  u(Ki, this, !1), g(q, this, Ed).call(this, -1), g(q, this, $l).call(this);
}
L(Q, "_l10n", null);
L(Q, "_l10nResizer", null);
L(Q, "_borderLineWidth", -1);
L(Q, "_colorManager", new yd());
L(Q, "_zIndex", 1);
L(Q, "_telemetryTimeout", 1e3);
var Kp = class extends Q {
  constructor(i) {
    super(i), this.annotationElementId = i.annotationElementId, this.deleted = !0;
  }
  serialize() {
    return this.serializeDeleted();
  }
}, mc = 3285377520, ne = 4294901760, ci = 65535, Cd = class {
  constructor(i) {
    this.h1 = i ? 4294967295 & i : mc, this.h2 = i ? 4294967295 & i : mc;
  }
  update(i) {
    let t, e;
    if (typeof i == "string") {
      t = new Uint8Array(2 * i.length), e = 0;
      for (let m = 0, b = i.length; m < b; m++) {
        const w = i.charCodeAt(m);
        w <= 255 ? t[e++] = w : (t[e++] = w >>> 8, t[e++] = 255 & w);
      }
    } else {
      if (!ArrayBuffer.isView(i)) throw new Error("Invalid data format, must be a string or TypedArray.");
      t = i.slice(), e = t.byteLength;
    }
    const s = e >> 2, n = e - 4 * s, r = new Uint32Array(t.buffer, 0, s);
    let o = 0, h = 0, l = this.h1, c = this.h2;
    const d = 3432918353, p = 461845907, f = 11601, v = 13715;
    for (let m = 0; m < s; m++) 1 & m ? (o = r[m], o = o * d & ne | o * f & ci, o = o << 15 | o >>> 17, o = o * p & ne | o * v & ci, l ^= o, l = l << 13 | l >>> 19, l = 5 * l + 3864292196) : (h = r[m], h = h * d & ne | h * f & ci, h = h << 15 | h >>> 17, h = h * p & ne | h * v & ci, c ^= h, c = c << 13 | c >>> 19, c = 5 * c + 3864292196);
    switch (o = 0, n) {
      case 3:
        o ^= t[4 * s + 2] << 16;
      case 2:
        o ^= t[4 * s + 1] << 8;
      case 1:
        o ^= t[4 * s], o = o * d & ne | o * f & ci, o = o << 15 | o >>> 17, o = o * p & ne | o * v & ci, 1 & s ? l ^= o : c ^= o;
    }
    this.h1 = l, this.h2 = c;
  }
  hexdigest() {
    let i = this.h1, t = this.h2;
    return i ^= t >>> 1, i = 3981806797 * i & ne | 36045 * i & ci, t = 4283543511 * t & ne | (2950163797 * (t << 16 | i >>> 16) & ne) >>> 16, i ^= t >>> 1, i = 444984403 * i & ne | 60499 * i & ci, t = 3301882366 * t & ne | (3120437893 * (t << 16 | i >>> 16) & ne) >>> 16, i ^= t >>> 1, (i >>> 0).toString(16).padStart(8, "0") + (t >>> 0).toString(16).padStart(8, "0");
  }
}, Xh = Object.freeze({
  map: null,
  hash: "",
  transfer: void 0
}), ta = /* @__PURE__ */ new WeakMap(), pn = /* @__PURE__ */ new WeakMap(), Mt = /* @__PURE__ */ new WeakMap(), vc = /* @__PURE__ */ new WeakSet(), zl = class {
  constructor() {
    G(this, vc), _(this, ta, !1), _(this, pn, null), _(this, Mt, /* @__PURE__ */ new Map()), this.onSetModified = null, this.onResetModified = null, this.onAnnotationEditor = null;
  }
  getValue(i, t) {
    const e = a(Mt, this).get(i);
    return e === void 0 ? t : Object.assign(t, e);
  }
  getRawValue(i) {
    return a(Mt, this).get(i);
  }
  remove(i) {
    if (a(Mt, this).delete(i), a(Mt, this).size === 0 && this.resetModified(), typeof this.onAnnotationEditor == "function") {
      for (const t of a(Mt, this).values()) if (t instanceof Q) return;
      this.onAnnotationEditor(null);
    }
  }
  setValue(i, t) {
    const e = a(Mt, this).get(i);
    let s = !1;
    if (e !== void 0)
      for (const [n, r] of Object.entries(t)) e[n] !== r && (s = !0, e[n] = r);
    else
      s = !0, a(Mt, this).set(i, t);
    s && g(vc, this, Qp).call(this), t instanceof Q && typeof this.onAnnotationEditor == "function" && this.onAnnotationEditor(t.constructor._type);
  }
  has(i) {
    return a(Mt, this).has(i);
  }
  getAll() {
    return a(Mt, this).size > 0 ? Dl(a(Mt, this)) : null;
  }
  setAll(i) {
    for (const [t, e] of Object.entries(i)) this.setValue(t, e);
  }
  get size() {
    return a(Mt, this).size;
  }
  resetModified() {
    a(ta, this) && (u(ta, this, !1), typeof this.onResetModified == "function" && this.onResetModified());
  }
  get print() {
    return new Pd(this);
  }
  get serializable() {
    if (a(Mt, this).size === 0) return Xh;
    const i = /* @__PURE__ */ new Map(), t = new Cd(), e = [], s = /* @__PURE__ */ Object.create(null);
    let n = !1;
    for (const [r, o] of a(Mt, this)) {
      const h = o instanceof Q ? o.serialize(!1, s) : o;
      h && (i.set(r, h), t.update(`${r}:${JSON.stringify(h)}`), n || (n = !!h.bitmap));
    }
    if (n) for (const r of i.values()) r.bitmap && e.push(r.bitmap);
    return i.size > 0 ? {
      map: i,
      hash: t.hexdigest(),
      transfer: e
    } : Xh;
  }
  get editorStats() {
    let i = null;
    const t = /* @__PURE__ */ new Map();
    for (const s of a(Mt, this).values()) {
      var e;
      if (!(s instanceof Q)) continue;
      const n = s.telemetryFinalData;
      if (!n) continue;
      const { type: r } = n;
      t.has(r) || t.set(r, Object.getPrototypeOf(s).constructor), i || (i = /* @__PURE__ */ Object.create(null));
      const o = (e = i)[r] || (e[r] = /* @__PURE__ */ new Map());
      for (const [h, l] of Object.entries(n)) {
        if (h === "type") continue;
        let c = o.get(h);
        c || (c = /* @__PURE__ */ new Map(), o.set(h, c));
        const d = c.get(l) ?? 0;
        c.set(l, d + 1);
      }
    }
    for (const [s, n] of t) i[s] = n.computeTelemetryFinalData(i[s]);
    return i;
  }
  resetModifiedIds() {
    u(pn, this, null);
  }
  get modifiedIds() {
    if (a(pn, this)) return a(pn, this);
    const i = [];
    for (const t of a(Mt, this).values()) t instanceof Q && t.annotationElementId && t.serialize() && i.push(t.annotationElementId);
    return u(pn, this, {
      ids: new Set(i),
      hash: i.join(",")
    });
  }
};
function Qp() {
  a(ta, this) || (u(ta, this, !0), typeof this.onSetModified == "function" && this.onSetModified());
}
var Ho = /* @__PURE__ */ new WeakMap(), Pd = class extends zl {
  constructor(i) {
    super(), _(this, Ho, void 0);
    const { map: t, hash: e, transfer: s } = i.serializable, n = structuredClone(t, s ? { transfer: s } : null);
    u(Ho, this, {
      map: n,
      hash: e,
      transfer: s
    });
  }
  get print() {
    et("Should not call PrintAnnotationStorage.print");
  }
  get serializable() {
    return a(Ho, this);
  }
  get modifiedIds() {
    return $(this, "modifiedIds", {
      ids: /* @__PURE__ */ new Set(),
      hash: ""
    });
  }
}, Ra = /* @__PURE__ */ new WeakMap(), Jp = class {
  constructor({ ownerDocument: i = globalThis.document, styleElement: t = null }) {
    _(this, Ra, /* @__PURE__ */ new Set()), this._document = i, this.nativeFontFaces = /* @__PURE__ */ new Set(), this.styleElement = null, this.loadingRequests = [], this.loadTestFontId = 0;
  }
  addNativeFontFace(i) {
    this.nativeFontFaces.add(i), this._document.fonts.add(i);
  }
  removeNativeFontFace(i) {
    this.nativeFontFaces.delete(i), this._document.fonts.delete(i);
  }
  insertRule(i) {
    this.styleElement || (this.styleElement = this._document.createElement("style"), this._document.documentElement.getElementsByTagName("head")[0].append(this.styleElement));
    const t = this.styleElement.sheet;
    t.insertRule(i, t.cssRules.length);
  }
  clear() {
    for (const i of this.nativeFontFaces) this._document.fonts.delete(i);
    this.nativeFontFaces.clear(), a(Ra, this).clear(), this.styleElement && (this.styleElement.remove(), this.styleElement = null);
  }
  async loadSystemFont({ systemFontInfo: i, _inspectFont: t }) {
    if (i && !a(Ra, this).has(i.loadedName))
      if (ut(!this.disableFontFace, "loadSystemFont shouldn't be called when `disableFontFace` is set."), this.isFontLoadingAPISupported) {
        const { loadedName: e, src: s, style: n } = i, r = new FontFace(e, s, n);
        this.addNativeFontFace(r);
        try {
          await r.load(), a(Ra, this).add(e), t?.(i);
        } catch {
          B(`Cannot load system font: ${i.baseFontName}, installing it could help to improve PDF rendering.`), this.removeNativeFontFace(r);
        }
      } else et("Not implemented: loadSystemFont without the Font Loading API.");
  }
  async bind(i) {
    if (i.attached || i.missingFile && !i.systemFontInfo) return;
    if (i.attached = !0, i.systemFontInfo) {
      await this.loadSystemFont(i);
      return;
    }
    if (this.isFontLoadingAPISupported) {
      const e = i.createNativeFontFace();
      if (e) {
        this.addNativeFontFace(e);
        try {
          await e.loaded;
        } catch (s) {
          throw B(`Failed to load font '${e.family}': '${s}'.`), i.disableFontFace = !0, s;
        }
      }
      return;
    }
    const t = i.createFontFaceRule();
    if (t) {
      if (this.insertRule(t), this.isSyncFontLoadingSupported) return;
      await new Promise(((e) => {
        const s = this._queueLoadingCallback(e);
        this._prepareFontLoadEvent(i, s);
      }));
    }
  }
  get isFontLoadingAPISupported() {
    return $(this, "isFontLoadingAPISupported", !!this._document?.fonts);
  }
  get isSyncFontLoadingSupported() {
    let i = !1;
    return (Dt || typeof navigator < "u" && typeof navigator?.userAgent == "string" && /Mozilla\/5.0.*?rv:\d+.*? Gecko/.test(navigator.userAgent)) && (i = !0), $(this, "isSyncFontLoadingSupported", i);
  }
  _queueLoadingCallback(i) {
    const { loadingRequests: t } = this, e = {
      done: !1,
      complete: function() {
        for (ut(!e.done, "completeRequest() cannot be called twice."), e.done = !0; t.length > 0 && t[0].done; ) {
          const n = t.shift();
          setTimeout(n.callback, 0);
        }
      },
      callback: i
    };
    return t.push(e), e;
  }
  get _loadTestFont() {
    return $(this, "_loadTestFont", atob("T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQAABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwAAAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbmFtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAAAADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6AABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAAMQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAAAAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAAAAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQAAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMAAQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAAEAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgcA/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQAAAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAgABAAAAAAAAAAAD6AAAAAAAAA=="));
  }
  _prepareFontLoadEvent(i, t) {
    function e(b, w) {
      return b.charCodeAt(w) << 24 | b.charCodeAt(w + 1) << 16 | b.charCodeAt(w + 2) << 8 | 255 & b.charCodeAt(w + 3);
    }
    function s(b, w, A, y) {
      return b.substring(0, w) + y + b.substring(w + A);
    }
    let n, r;
    const o = this._document.createElement("canvas");
    o.width = 1, o.height = 1;
    const h = o.getContext("2d");
    let l = 0;
    const c = `lt${Date.now()}${this.loadTestFontId++}`;
    let d = this._loadTestFont;
    d = s(d, 976, c.length, c);
    const p = 1482184792;
    let f = e(d, 16);
    for (n = 0, r = c.length - 3; n < r; n += 4) f = f - p + e(c, n) | 0;
    n < c.length && (f = f - p + e(c + "XXX", n) | 0), d = s(d, 16, 4, (function(w) {
      return String.fromCharCode(w >> 24 & 255, w >> 16 & 255, w >> 8 & 255, 255 & w);
    })(f));
    const v = `@font-face {font-family:"${c}";src:${`url(data:font/opentype;base64,${btoa(d)});`}}`;
    this.insertRule(v);
    const m = this._document.createElement("div");
    m.style.visibility = "hidden", m.style.width = m.style.height = "10px", m.style.position = "absolute", m.style.top = m.style.left = "0px";
    for (const b of [i.loadedName, c]) {
      const w = this._document.createElement("span");
      w.textContent = "Hi", w.style.fontFamily = b, m.append(w);
    }
    this._document.body.append(m), (function b(w, A) {
      if (++l > 30) {
        B("Load test font never loaded."), A();
        return;
      }
      h.font = "30px " + w, h.fillText(".", 0, 20), h.getImageData(0, 0, 1, 1).data[3] > 0 ? A() : setTimeout(b.bind(null, w, A));
    })(c, (() => {
      m.remove(), t.complete();
    }));
  }
}, Zp = class {
  constructor(i, { disableFontFace: t = !1, fontExtraProperties: e = !1, inspectFont: s = null }) {
    this.compiledGlyphs = /* @__PURE__ */ Object.create(null);
    for (const n in i) this[n] = i[n];
    this.disableFontFace = t === !0, this.fontExtraProperties = e === !0, this._inspectFont = s;
  }
  createNativeFontFace() {
    if (!this.data || this.disableFontFace) return null;
    let i;
    if (this.cssFontInfo) {
      const t = { weight: this.cssFontInfo.fontWeight };
      this.cssFontInfo.italicAngle && (t.style = `oblique ${this.cssFontInfo.italicAngle}deg`), i = new FontFace(this.cssFontInfo.fontFamily, this.data, t);
    } else i = new FontFace(this.loadedName, this.data, {});
    return this._inspectFont?.(this), i;
  }
  createFontFaceRule() {
    if (!this.data || this.disableFontFace) return null;
    const i = `url(data:${this.mimetype};base64,${(function(s) {
      return Uint8Array.prototype.toBase64 ? s.toBase64() : btoa(_d(s));
    })(this.data)});`;
    let t;
    if (this.cssFontInfo) {
      let e = `font-weight: ${this.cssFontInfo.fontWeight};`;
      this.cssFontInfo.italicAngle && (e += `font-style: oblique ${this.cssFontInfo.italicAngle}deg;`), t = `@font-face {font-family:"${this.cssFontInfo.fontFamily}";${e}src:${i}}`;
    } else t = `@font-face {font-family:"${this.loadedName}";src:${i}}`;
    return this._inspectFont?.(this, i), t;
  }
  getPathGenerator(i, t) {
    if (this.compiledGlyphs[t] !== void 0) return this.compiledGlyphs[t];
    const e = this.loadedName + "_path_" + t;
    let s;
    try {
      s = i.get(e);
    } catch (r) {
      B(`getPathGenerator - ignoring character: "${r}".`);
    }
    const n = new Path2D(s || "");
    return this.fontExtraProperties || i.delete(e), this.compiledGlyphs[t] = n;
  }
}, _c = 1, bc = 2, Td = 1, $o = 2, Rd = 3, Dd = 4, Id = 5, Ld = 6, Da = 7, Yh = 8;
function wc() {
}
function Yt(i) {
  if (i instanceof Ei || i instanceof Ph || i instanceof pa || i instanceof Jl || i instanceof Xr || i instanceof yo) return i;
  switch (i instanceof Error || typeof i == "object" && i !== null || et('wrapReason: Expected "reason" to be a (possibly cloned) Error.'), i.name) {
    case "AbortException":
      return new Ei(i.message);
    case "InvalidPDFException":
      return new Ph(i.message);
    case "MissingPDFException":
      return new pa(i.message);
    case "PasswordException":
      return new Jl(i.message, i.code);
    case "UnexpectedResponseException":
      return new Xr(i.message, i.status);
    case "UnknownErrorException":
      return new yo(i.message, i.details);
  }
  return new yo(i.message, i.toString());
}
var Ia = /* @__PURE__ */ new WeakMap(), ns = /* @__PURE__ */ new WeakSet(), Hn = class {
  constructor(i, t, e) {
    G(this, ns), _(this, Ia, new AbortController()), this.sourceName = i, this.targetName = t, this.comObj = e, this.callbackId = 1, this.streamId = 1, this.streamSinks = /* @__PURE__ */ Object.create(null), this.streamControllers = /* @__PURE__ */ Object.create(null), this.callbackCapabilities = /* @__PURE__ */ Object.create(null), this.actionHandler = /* @__PURE__ */ Object.create(null), e.addEventListener("message", g(ns, this, tg).bind(this), { signal: a(Ia, this).signal });
  }
  on(i, t) {
    const e = this.actionHandler;
    if (e[i]) throw new Error(`There is already an actionName called "${i}"`);
    e[i] = t;
  }
  send(i, t, e) {
    this.comObj.postMessage({
      sourceName: this.sourceName,
      targetName: this.targetName,
      action: i,
      data: t
    }, e);
  }
  sendWithPromise(i, t, e) {
    const s = this.callbackId++, n = Promise.withResolvers();
    this.callbackCapabilities[s] = n;
    try {
      this.comObj.postMessage({
        sourceName: this.sourceName,
        targetName: this.targetName,
        action: i,
        callbackId: s,
        data: t
      }, e);
    } catch (r) {
      n.reject(r);
    }
    return n.promise;
  }
  sendWithStream(i, t, e, s) {
    const n = this.streamId++, r = this.sourceName, o = this.targetName, h = this.comObj;
    return new ReadableStream({
      start: (l) => {
        const c = Promise.withResolvers();
        return this.streamControllers[n] = {
          controller: l,
          startCall: c,
          pullCall: null,
          cancelCall: null,
          isClosed: !1
        }, h.postMessage({
          sourceName: r,
          targetName: o,
          action: i,
          streamId: n,
          data: t,
          desiredSize: l.desiredSize
        }, s), c.promise;
      },
      pull: (l) => {
        const c = Promise.withResolvers();
        return this.streamControllers[n].pullCall = c, h.postMessage({
          sourceName: r,
          targetName: o,
          stream: Ld,
          streamId: n,
          desiredSize: l.desiredSize
        }), c.promise;
      },
      cancel: (l) => {
        ut(l instanceof Error, "cancel must have a valid reason");
        const c = Promise.withResolvers();
        return this.streamControllers[n].cancelCall = c, this.streamControllers[n].isClosed = !0, h.postMessage({
          sourceName: r,
          targetName: o,
          stream: Td,
          streamId: n,
          reason: Yt(l)
        }), c.promise;
      }
    }, e);
  }
  destroy() {
    a(Ia, this)?.abort(), u(Ia, this, null);
  }
};
function tg({ data: i }) {
  if (i.targetName !== this.sourceName) return;
  if (i.stream) {
    g(ns, this, ig).call(this, i);
    return;
  }
  if (i.callback) {
    const e = i.callbackId, s = this.callbackCapabilities[e];
    if (!s) throw new Error(`Cannot resolve callback ${e}`);
    if (delete this.callbackCapabilities[e], i.callback === _c) s.resolve(i.data);
    else {
      if (i.callback !== bc) throw new Error("Unexpected callback case");
      s.reject(Yt(i.reason));
    }
    return;
  }
  const t = this.actionHandler[i.action];
  if (!t) throw new Error(`Unknown action from worker: ${i.action}`);
  if (i.callbackId) {
    const e = this.sourceName, s = i.sourceName, n = this.comObj;
    Promise.try(t, i.data).then((function(r) {
      n.postMessage({
        sourceName: e,
        targetName: s,
        callback: _c,
        callbackId: i.callbackId,
        data: r
      });
    }), (function(r) {
      n.postMessage({
        sourceName: e,
        targetName: s,
        callback: bc,
        callbackId: i.callbackId,
        reason: Yt(r)
      });
    }));
  } else i.streamId ? g(ns, this, eg).call(this, i) : t(i.data);
}
function eg(i) {
  const t = i.streamId, e = this.sourceName, s = i.sourceName, n = this.comObj, r = this, o = this.actionHandler[i.action], h = {
    enqueue(l, c = 1, d) {
      if (this.isCancelled) return;
      const p = this.desiredSize;
      this.desiredSize -= c, p > 0 && this.desiredSize <= 0 && (this.sinkCapability = Promise.withResolvers(), this.ready = this.sinkCapability.promise), n.postMessage({
        sourceName: e,
        targetName: s,
        stream: Dd,
        streamId: t,
        chunk: l
      }, d);
    },
    close() {
      this.isCancelled || (this.isCancelled = !0, n.postMessage({
        sourceName: e,
        targetName: s,
        stream: Rd,
        streamId: t
      }), delete r.streamSinks[t]);
    },
    error(l) {
      ut(l instanceof Error, "error must have a valid reason"), this.isCancelled || (this.isCancelled = !0, n.postMessage({
        sourceName: e,
        targetName: s,
        stream: Id,
        streamId: t,
        reason: Yt(l)
      }));
    },
    sinkCapability: Promise.withResolvers(),
    onPull: null,
    onCancel: null,
    isCancelled: !1,
    desiredSize: i.desiredSize,
    ready: null
  };
  h.sinkCapability.resolve(), h.ready = h.sinkCapability.promise, this.streamSinks[t] = h, Promise.try(o, i.data, h).then((function() {
    n.postMessage({
      sourceName: e,
      targetName: s,
      stream: Yh,
      streamId: t,
      success: !0
    });
  }), (function(l) {
    n.postMessage({
      sourceName: e,
      targetName: s,
      stream: Yh,
      streamId: t,
      reason: Yt(l)
    });
  }));
}
function ig(i) {
  const t = i.streamId, e = this.sourceName, s = i.sourceName, n = this.comObj, r = this.streamControllers[t], o = this.streamSinks[t];
  switch (i.stream) {
    case Yh:
      i.success ? r.startCall.resolve() : r.startCall.reject(Yt(i.reason));
      break;
    case Da:
      i.success ? r.pullCall.resolve() : r.pullCall.reject(Yt(i.reason));
      break;
    case Ld:
      if (!o) {
        n.postMessage({
          sourceName: e,
          targetName: s,
          stream: Da,
          streamId: t,
          success: !0
        });
        break;
      }
      o.desiredSize <= 0 && i.desiredSize > 0 && o.sinkCapability.resolve(), o.desiredSize = i.desiredSize, Promise.try(o.onPull || wc).then((function() {
        n.postMessage({
          sourceName: e,
          targetName: s,
          stream: Da,
          streamId: t,
          success: !0
        });
      }), (function(l) {
        n.postMessage({
          sourceName: e,
          targetName: s,
          stream: Da,
          streamId: t,
          reason: Yt(l)
        });
      }));
      break;
    case Dd:
      if (ut(r, "enqueue should have stream controller"), r.isClosed) break;
      r.controller.enqueue(i.chunk);
      break;
    case Rd:
      if (ut(r, "close should have stream controller"), r.isClosed) break;
      r.isClosed = !0, r.controller.close(), g(ns, this, zo).call(this, r, t);
      break;
    case Id:
      ut(r, "error should have stream controller"), r.controller.error(Yt(i.reason)), g(ns, this, zo).call(this, r, t);
      break;
    case $o:
      i.success ? r.cancelCall.resolve() : r.cancelCall.reject(Yt(i.reason)), g(ns, this, zo).call(this, r, t);
      break;
    case Td:
      if (!o) break;
      const h = Yt(i.reason);
      Promise.try(o.onCancel || wc, h).then((function() {
        n.postMessage({
          sourceName: e,
          targetName: s,
          stream: $o,
          streamId: t,
          success: !0
        });
      }), (function(l) {
        n.postMessage({
          sourceName: e,
          targetName: s,
          stream: $o,
          streamId: t,
          reason: Yt(l)
        });
      })), o.sinkCapability.reject(h), o.isCancelled = !0, delete this.streamSinks[t];
      break;
    default:
      throw new Error("Unexpected stream case");
  }
}
async function zo(i, t) {
  await Promise.allSettled([
    i.startCall?.promise,
    i.pullCall?.promise,
    i.cancelCall?.promise
  ]), delete this.streamControllers[t];
}
var Go = /* @__PURE__ */ new WeakMap(), Ac = class {
  constructor({ enableHWA: i = !1 }) {
    _(this, Go, !1), u(Go, this, i);
  }
  create(i, t) {
    if (i <= 0 || t <= 0) throw new Error("Invalid canvas size");
    const e = this._createCanvas(i, t);
    return {
      canvas: e,
      context: e.getContext("2d", { willReadFrequently: !a(Go, this) })
    };
  }
  reset(i, t, e) {
    if (!i.canvas) throw new Error("Canvas is not specified");
    if (t <= 0 || e <= 0) throw new Error("Invalid canvas size");
    i.canvas.width = t, i.canvas.height = e;
  }
  destroy(i) {
    if (!i.canvas) throw new Error("Canvas is not specified");
    i.canvas.width = 0, i.canvas.height = 0, i.canvas = null, i.context = null;
  }
  _createCanvas(i, t) {
    et("Abstract method `_createCanvas` called.");
  }
}, Fd = class {
  constructor({ baseUrl: i = null, isCompressed: t = !0 }) {
    this.baseUrl = i, this.isCompressed = t;
  }
  async fetch({ name: i }) {
    if (!this.baseUrl) throw new Error("Ensure that the `cMapUrl` and `cMapPacked` API parameters are provided.");
    if (!i) throw new Error("CMap name must be specified.");
    const t = this.baseUrl + i + (this.isCompressed ? ".bcmap" : "");
    return this._fetch(t).then(((e) => ({
      cMapData: e,
      isCompressed: this.isCompressed
    }))).catch(((e) => {
      throw new Error(`Unable to load ${this.isCompressed ? "binary " : ""}CMap at: ${t}`);
    }));
  }
  async _fetch(i) {
    et("Abstract method `_fetch` called.");
  }
}, Nd = class extends Fd {
  async _fetch(i) {
    const t = await po(i, this.isCompressed ? "arraybuffer" : "text");
    return t instanceof ArrayBuffer ? new Uint8Array(t) : uo(t);
  }
}, yc = class {
  addFilter(i) {
    return "none";
  }
  addHCMFilter(i, t) {
    return "none";
  }
  addAlphaFilter(i) {
    return "none";
  }
  addLuminosityFilter(i) {
    return "none";
  }
  addHighlightHCMFilter(i, t, e, s, n) {
    return "none";
  }
  destroy(i = !1) {
  }
}, Od = class {
  constructor({ baseUrl: i = null }) {
    this.baseUrl = i;
  }
  async fetch({ filename: i }) {
    if (!this.baseUrl) throw new Error("Ensure that the `standardFontDataUrl` API parameter is provided.");
    if (!i) throw new Error("Font filename must be specified.");
    const t = `${this.baseUrl}${i}`;
    return this._fetch(t).catch(((e) => {
      throw new Error(`Unable to load font data at: ${t}`);
    }));
  }
  async _fetch(i) {
    et("Abstract method `_fetch` called.");
  }
}, Wd = class extends Od {
  async _fetch(i) {
    const t = await po(i, "arraybuffer");
    return new Uint8Array(t);
  }
};
Dt && B("Please use the `legacy` build in Node.js environments.");
async function Bd(i) {
  const t = await process.getBuiltinModule("fs").promises.readFile(i);
  return new Uint8Array(t);
}
var Qi = "Fill", Qr = "Stroke", ea = "Shading";
function Kh(i, t) {
  if (!t) return;
  const e = t[2] - t[0], s = t[3] - t[1], n = new Path2D();
  n.rect(t[0], t[1], e, s), i.clip(n);
}
var Gl = class {
  getPattern() {
    et("Abstract method `getPattern` called.");
  }
}, sg = class extends Gl {
  constructor(i) {
    super(), this._type = i[1], this._bbox = i[2], this._colorStops = i[3], this._p0 = i[4], this._p1 = i[5], this._r0 = i[6], this._r1 = i[7], this.matrix = null;
  }
  _createGradient(i) {
    let t;
    this._type === "axial" ? t = i.createLinearGradient(this._p0[0], this._p0[1], this._p1[0], this._p1[1]) : this._type === "radial" && (t = i.createRadialGradient(this._p0[0], this._p0[1], this._r0, this._p1[0], this._p1[1], this._r1));
    for (const e of this._colorStops) t.addColorStop(e[0], e[1]);
    return t;
  }
  getPattern(i, t, e, s) {
    let n;
    if (s === Qr || s === Qi) {
      const r = t.current.getClippedPathBoundingBox(s, st(i)) || [
        0,
        0,
        0,
        0
      ], o = Math.ceil(r[2] - r[0]) || 1, h = Math.ceil(r[3] - r[1]) || 1, l = t.cachedCanvases.getCanvas("pattern", o, h), c = l.context;
      c.clearRect(0, 0, c.canvas.width, c.canvas.height), c.beginPath(), c.rect(0, 0, c.canvas.width, c.canvas.height), c.translate(-r[0], -r[1]), e = C.transform(e, [
        1,
        0,
        0,
        1,
        r[0],
        r[1]
      ]), c.transform(...t.baseTransform), this.matrix && c.transform(...this.matrix), Kh(c, this._bbox), c.fillStyle = this._createGradient(c), c.fill(), n = i.createPattern(l.canvas, "no-repeat");
      const d = new DOMMatrix(e);
      n.setTransform(d);
    } else
      Kh(i, this._bbox), n = this._createGradient(i);
    return n;
  }
};
function jo(i, t, e, s, n, r, o, h) {
  const l = t.coords, c = t.colors, d = i.data, p = 4 * i.width;
  let f;
  l[e + 1] > l[s + 1] && (f = e, e = s, s = f, f = r, r = o, o = f), l[s + 1] > l[n + 1] && (f = s, s = n, n = f, f = o, o = h, h = f), l[e + 1] > l[s + 1] && (f = e, e = s, s = f, f = r, r = o, o = f);
  const v = (l[e] + t.offsetX) * t.scaleX, m = (l[e + 1] + t.offsetY) * t.scaleY, b = (l[s] + t.offsetX) * t.scaleX, w = (l[s + 1] + t.offsetY) * t.scaleY, A = (l[n] + t.offsetX) * t.scaleX, y = (l[n + 1] + t.offsetY) * t.scaleY;
  if (m >= y) return;
  const x = c[r], S = c[r + 1], M = c[r + 2], P = c[o], k = c[o + 1], F = c[o + 2], H = c[h], j = c[h + 1], z = c[h + 2], Y = Math.round(m), pt = Math.round(y);
  let X, ot, I, O, Qt, se, Ri, Ne;
  for (let Lt = Y; Lt <= pt; Lt++) {
    if (Lt < w) {
      const ht = Lt < m ? 0 : (m - Lt) / (m - w);
      X = v - (v - b) * ht, ot = x - (x - P) * ht, I = S - (S - k) * ht, O = M - (M - F) * ht;
    } else {
      let ht;
      ht = Lt > y ? 1 : w === y ? 0 : (w - Lt) / (w - y), X = b - (b - A) * ht, ot = P - (P - H) * ht, I = k - (k - j) * ht, O = F - (F - z) * ht;
    }
    let At;
    At = Lt < m ? 0 : Lt > y ? 1 : (m - Lt) / (m - y), Qt = v - (v - A) * At, se = x - (x - H) * At, Ri = S - (S - j) * At, Ne = M - (M - z) * At;
    const si = Math.round(Math.min(X, Qt)), Jt = Math.round(Math.max(X, Qt));
    let J = p * Lt + 4 * si;
    for (let ht = si; ht <= Jt; ht++)
      At = (X - ht) / (X - Qt), At < 0 ? At = 0 : At > 1 && (At = 1), d[J++] = ot - (ot - se) * At | 0, d[J++] = I - (I - Ri) * At | 0, d[J++] = O - (O - Ne) * At | 0, d[J++] = 255;
  }
}
function ng(i, t, e) {
  const s = t.coords, n = t.colors;
  let r, o;
  switch (t.type) {
    case "lattice":
      const h = t.verticesPerRow, l = Math.floor(s.length / h) - 1, c = h - 1;
      for (r = 0; r < l; r++) {
        let d = r * h;
        for (let p = 0; p < c; p++, d++)
          jo(i, e, s[d], s[d + 1], s[d + h], n[d], n[d + 1], n[d + h]), jo(i, e, s[d + h + 1], s[d + 1], s[d + h], n[d + h + 1], n[d + 1], n[d + h]);
      }
      break;
    case "triangles":
      for (r = 0, o = s.length; r < o; r += 3) jo(i, e, s[r], s[r + 1], s[r + 2], n[r], n[r + 1], n[r + 2]);
      break;
    default:
      throw new Error("illegal figure");
  }
}
var ag = class extends Gl {
  constructor(i) {
    super(), this._coords = i[2], this._colors = i[3], this._figures = i[4], this._bounds = i[5], this._bbox = i[7], this._background = i[8], this.matrix = null;
  }
  _createMeshCanvas(i, t, e) {
    const s = Math.floor(this._bounds[0]), n = Math.floor(this._bounds[1]), r = Math.ceil(this._bounds[2]) - s, o = Math.ceil(this._bounds[3]) - n, h = Math.min(Math.ceil(Math.abs(r * i[0] * 1.1)), 3e3), l = Math.min(Math.ceil(Math.abs(o * i[1] * 1.1)), 3e3), c = r / h, d = o / l, p = {
      coords: this._coords,
      colors: this._colors,
      offsetX: -s,
      offsetY: -n,
      scaleX: 1 / c,
      scaleY: 1 / d
    }, f = h + 4, v = l + 4, m = e.getCanvas("mesh", f, v), b = m.context, w = b.createImageData(h, l);
    if (t) {
      const A = w.data;
      for (let y = 0, x = A.length; y < x; y += 4)
        A[y] = t[0], A[y + 1] = t[1], A[y + 2] = t[2], A[y + 3] = 255;
    }
    for (const A of this._figures) ng(w, A, p);
    return b.putImageData(w, 2, 2), {
      canvas: m.canvas,
      offsetX: s - 2 * c,
      offsetY: n - 2 * d,
      scaleX: c,
      scaleY: d
    };
  }
  getPattern(i, t, e, s) {
    Kh(i, this._bbox);
    let n;
    if (s === ea) n = C.singularValueDecompose2dScale(st(i));
    else if (n = C.singularValueDecompose2dScale(t.baseTransform), this.matrix) {
      const o = C.singularValueDecompose2dScale(this.matrix);
      n = [n[0] * o[0], n[1] * o[1]];
    }
    const r = this._createMeshCanvas(n, s === ea ? null : this._background, t.cachedCanvases);
    return s !== ea && (i.setTransform(...t.baseTransform), this.matrix && i.transform(...this.matrix)), i.translate(r.offsetX, r.offsetY), i.scale(r.scaleX, r.scaleY), i.createPattern(r.canvas, "no-repeat");
  }
}, rg = class extends Gl {
  getPattern() {
    return "hotpink";
  }
}, og = 1, hg = 2, Hd = class $d {
  constructor(t, e, s, n, r) {
    this.operatorList = t[2], this.matrix = t[3], this.bbox = t[4], this.xstep = t[5], this.ystep = t[6], this.paintType = t[7], this.tilingType = t[8], this.color = e, this.ctx = s, this.canvasGraphicsFactory = n, this.baseTransform = r;
  }
  createPatternCanvas(t) {
    const { bbox: e, operatorList: s, paintType: n, tilingType: r, color: o, canvasGraphicsFactory: h } = this;
    let { xstep: l, ystep: c } = this;
    l = Math.abs(l), c = Math.abs(c), co("TilingType: " + r);
    const d = e[0], p = e[1], f = e[2], v = e[3], m = f - d, b = v - p, w = C.singularValueDecompose2dScale(this.matrix), A = C.singularValueDecompose2dScale(this.baseTransform), y = w[0] * A[0], x = w[1] * A[1];
    let S = m, M = b, P = !1, k = !1;
    const F = Math.ceil(l * y), H = Math.ceil(c * x);
    F >= Math.ceil(m * y) ? S = l : P = !0, H >= Math.ceil(b * x) ? M = c : k = !0;
    const j = this.getSizeAndScale(S, this.ctx.canvas.width, y), z = this.getSizeAndScale(M, this.ctx.canvas.height, x), Y = t.cachedCanvases.getCanvas("pattern", j.size, z.size), pt = Y.context, X = h.createCanvasGraphics(pt);
    if (X.groupLevel = t.groupLevel, this.setFillAndStrokeStyleToContext(X, n, o), pt.translate(-j.scale * d, -z.scale * p), X.transform(j.scale, 0, 0, z.scale, 0, 0), pt.save(), this.clipBbox(X, d, p, f, v), X.baseTransform = st(X.ctx), X.executeOperatorList(s), X.endDrawing(), pt.restore(), P || k) {
      const ot = Y.canvas;
      P && (S = l), k && (M = c);
      const I = this.getSizeAndScale(S, this.ctx.canvas.width, y), O = this.getSizeAndScale(M, this.ctx.canvas.height, x), Qt = I.size, se = O.size, Ri = t.cachedCanvases.getCanvas("pattern-workaround", Qt, se), Ne = Ri.context, Lt = P ? Math.floor(m / l) : 0, At = k ? Math.floor(b / c) : 0;
      for (let si = 0; si <= Lt; si++) for (let Jt = 0; Jt <= At; Jt++) Ne.drawImage(ot, Qt * si, se * Jt, Qt, se, 0, 0, Qt, se);
      return {
        canvas: Ri.canvas,
        scaleX: I.scale,
        scaleY: O.scale,
        offsetX: d,
        offsetY: p
      };
    }
    return {
      canvas: Y.canvas,
      scaleX: j.scale,
      scaleY: z.scale,
      offsetX: d,
      offsetY: p
    };
  }
  getSizeAndScale(t, e, s) {
    const n = Math.max($d.MAX_PATTERN_SIZE, e);
    let r = Math.ceil(t * s);
    return r >= n ? r = n : s = r / t, {
      scale: s,
      size: r
    };
  }
  clipBbox(t, e, s, n, r) {
    const o = n - e, h = r - s;
    t.ctx.rect(e, s, o, h), t.current.updateRectMinMax(st(t.ctx), [
      e,
      s,
      n,
      r
    ]), t.clip(), t.endPath();
  }
  setFillAndStrokeStyleToContext(t, e, s) {
    const n = t.ctx, r = t.current;
    switch (e) {
      case og:
        const o = this.ctx;
        n.fillStyle = o.fillStyle, n.strokeStyle = o.strokeStyle, r.fillColor = o.fillStyle, r.strokeColor = o.strokeStyle;
        break;
      case hg:
        const h = C.makeHexColor(s[0], s[1], s[2]);
        n.fillStyle = h, n.strokeStyle = h, r.fillColor = h, r.strokeColor = h;
        break;
      default:
        throw new up(`Unsupported paint type: ${e}`);
    }
  }
  getPattern(t, e, s, n) {
    let r = s;
    n !== ea && (r = C.transform(r, e.baseTransform), this.matrix && (r = C.transform(r, this.matrix)));
    const o = this.createPatternCanvas(e);
    let h = new DOMMatrix(r);
    h = h.translate(o.offsetX, o.offsetY), h = h.scale(1 / o.scaleX, 1 / o.scaleY);
    const l = t.createPattern(o.canvas, "repeat");
    return l.setTransform(h), l;
  }
};
L(Hd, "MAX_PATTERN_SIZE", 3e3);
function lg({ src: i, srcPos: t = 0, dest: e, width: s, height: n, nonBlackColor: r = 4294967295, inverseDecode: o = !1 }) {
  const h = Gt.isLittleEndian ? 4278190080 : 255, [l, c] = o ? [r, h] : [h, r], d = s >> 3, p = 7 & s, f = i.length;
  e = new Uint32Array(e.buffer);
  let v = 0;
  for (let m = 0; m < n; m++) {
    for (const w = t + d; t < w; t++) {
      const A = t < f ? i[t] : 255;
      e[v++] = 128 & A ? c : l, e[v++] = 64 & A ? c : l, e[v++] = 32 & A ? c : l, e[v++] = 16 & A ? c : l, e[v++] = 8 & A ? c : l, e[v++] = 4 & A ? c : l, e[v++] = 2 & A ? c : l, e[v++] = 1 & A ? c : l;
    }
    if (p === 0) continue;
    const b = t < f ? i[t++] : 255;
    for (let w = 0; w < p; w++) e[v++] = b & 1 << 7 - w ? c : l;
  }
  return {
    srcPos: t,
    destPos: v
  };
}
var Ut = 16, cg = class {
  constructor(i) {
    this.canvasFactory = i, this.cache = /* @__PURE__ */ Object.create(null);
  }
  getCanvas(i, t, e) {
    let s;
    return this.cache[i] !== void 0 ? (s = this.cache[i], this.canvasFactory.reset(s, t, e)) : (s = this.canvasFactory.create(t, e), this.cache[i] = s), s;
  }
  delete(i) {
    delete this.cache[i];
  }
  clear() {
    for (const i in this.cache) {
      const t = this.cache[i];
      this.canvasFactory.destroy(t), delete this.cache[i];
    }
  }
};
function La(i, t, e, s, n, r, o, h, l, c) {
  const [d, p, f, v, m, b] = st(i);
  if (p === 0 && f === 0) {
    const w = o * d + m, A = Math.round(w), y = h * v + b, x = Math.round(y), S = (o + l) * d + m, M = Math.abs(Math.round(S) - A) || 1, P = (h + c) * v + b, k = Math.abs(Math.round(P) - x) || 1;
    return i.setTransform(Math.sign(d), 0, 0, Math.sign(v), A, x), i.drawImage(t, e, s, n, r, 0, 0, M, k), i.setTransform(d, p, f, v, m, b), [M, k];
  }
  if (d === 0 && v === 0) {
    const w = h * f + m, A = Math.round(w), y = o * p + b, x = Math.round(y), S = (h + c) * f + m, M = Math.abs(Math.round(S) - A) || 1, P = (o + l) * p + b, k = Math.abs(Math.round(P) - x) || 1;
    return i.setTransform(0, Math.sign(p), Math.sign(f), 0, A, x), i.drawImage(t, e, s, n, r, 0, 0, k, M), i.setTransform(d, p, f, v, m, b), [k, M];
  }
  return i.drawImage(t, e, s, n, r, o, h, l, c), [Math.hypot(d, p) * l, Math.hypot(f, v) * c];
}
var xc = class {
  constructor(i, t) {
    this.alphaIsShape = !1, this.fontSize = 0, this.fontSizeScale = 1, this.textMatrix = md, this.textMatrixScale = 1, this.fontMatrix = Ch, this.leading = 0, this.x = 0, this.y = 0, this.lineX = 0, this.lineY = 0, this.charSpacing = 0, this.wordSpacing = 0, this.textHScale = 1, this.textRenderingMode = vr, this.textRise = 0, this.fillColor = "#000000", this.strokeColor = "#000000", this.patternFill = !1, this.patternStroke = !1, this.fillAlpha = 1, this.strokeAlpha = 1, this.lineWidth = 1, this.activeSMask = null, this.transferMaps = "none", this.startNewPathAndClipBox([
      0,
      0,
      i,
      t
    ]);
  }
  clone() {
    const i = Object.create(this);
    return i.clipBox = this.clipBox.slice(), i;
  }
  setCurrentPoint(i, t) {
    this.x = i, this.y = t;
  }
  updatePathMinMax(i, t, e) {
    [t, e] = C.applyTransform([t, e], i), this.minX = Math.min(this.minX, t), this.minY = Math.min(this.minY, e), this.maxX = Math.max(this.maxX, t), this.maxY = Math.max(this.maxY, e);
  }
  updateRectMinMax(i, t) {
    const e = C.applyTransform(t, i), s = C.applyTransform(t.slice(2), i), n = C.applyTransform([t[0], t[3]], i), r = C.applyTransform([t[2], t[1]], i);
    this.minX = Math.min(this.minX, e[0], s[0], n[0], r[0]), this.minY = Math.min(this.minY, e[1], s[1], n[1], r[1]), this.maxX = Math.max(this.maxX, e[0], s[0], n[0], r[0]), this.maxY = Math.max(this.maxY, e[1], s[1], n[1], r[1]);
  }
  updateScalingPathMinMax(i, t) {
    C.scaleMinMax(i, t), this.minX = Math.min(this.minX, t[0]), this.minY = Math.min(this.minY, t[1]), this.maxX = Math.max(this.maxX, t[2]), this.maxY = Math.max(this.maxY, t[3]);
  }
  updateCurvePathMinMax(i, t, e, s, n, r, o, h, l, c) {
    const d = C.bezierBoundingBox(t, e, s, n, r, o, h, l, c);
    c || this.updateRectMinMax(i, d);
  }
  getPathBoundingBox(i = Qi, t = null) {
    const e = [
      this.minX,
      this.minY,
      this.maxX,
      this.maxY
    ];
    if (i === Qr) {
      t || et("Stroke bounding box must include transform.");
      const s = C.singularValueDecompose2dScale(t), n = s[0] * this.lineWidth / 2, r = s[1] * this.lineWidth / 2;
      e[0] -= n, e[1] -= r, e[2] += n, e[3] += r;
    }
    return e;
  }
  updateClipFromPath() {
    const i = C.intersect(this.clipBox, this.getPathBoundingBox());
    this.startNewPathAndClipBox(i || [
      0,
      0,
      0,
      0
    ]);
  }
  isEmptyClip() {
    return this.minX === 1 / 0;
  }
  startNewPathAndClipBox(i) {
    this.clipBox = i, this.minX = 1 / 0, this.minY = 1 / 0, this.maxX = 0, this.maxY = 0;
  }
  getClippedPathBoundingBox(i = Qi, t = null) {
    return C.intersect(this.clipBox, this.getPathBoundingBox(i, t));
  }
};
function Sc(i, t) {
  if (t instanceof ImageData) {
    i.putImageData(t, 0, 0);
    return;
  }
  const e = t.height, s = t.width, n = e % Ut, r = (e - n) / Ut, o = n === 0 ? r : r + 1, h = i.createImageData(s, Ut);
  let l, c = 0;
  const d = t.data, p = h.data;
  let f, v, m, b;
  if (t.kind === _r.GRAYSCALE_1BPP) {
    const w = d.byteLength, A = new Uint32Array(p.buffer, 0, p.byteLength >> 2), y = A.length, x = s + 7 >> 3, S = 4294967295, M = Gt.isLittleEndian ? 4278190080 : 255;
    for (f = 0; f < o; f++) {
      for (m = f < r ? Ut : n, l = 0, v = 0; v < m; v++) {
        const P = w - c;
        let k = 0;
        const F = P > x ? s : 8 * P - 7, H = -8 & F;
        let j = 0, z = 0;
        for (; k < H; k += 8)
          z = d[c++], A[l++] = 128 & z ? S : M, A[l++] = 64 & z ? S : M, A[l++] = 32 & z ? S : M, A[l++] = 16 & z ? S : M, A[l++] = 8 & z ? S : M, A[l++] = 4 & z ? S : M, A[l++] = 2 & z ? S : M, A[l++] = 1 & z ? S : M;
        for (; k < F; k++)
          j === 0 && (z = d[c++], j = 128), A[l++] = z & j ? S : M, j >>= 1;
      }
      for (; l < y; ) A[l++] = 0;
      i.putImageData(h, 0, f * Ut);
    }
  } else if (t.kind === _r.RGBA_32BPP) {
    for (v = 0, b = s * Ut * 4, f = 0; f < r; f++)
      p.set(d.subarray(c, c + b)), c += b, i.putImageData(h, 0, v), v += Ut;
    f < o && (b = s * n * 4, p.set(d.subarray(c, c + b)), i.putImageData(h, 0, v));
  } else {
    if (t.kind !== _r.RGB_24BPP) throw new Error(`bad image kind: ${t.kind}`);
    for (m = Ut, b = s * m, f = 0; f < o; f++) {
      for (f >= r && (m = n, b = s * m), l = 0, v = b; v--; )
        p[l++] = d[c++], p[l++] = d[c++], p[l++] = d[c++], p[l++] = 255;
      i.putImageData(h, 0, f * Ut);
    }
  }
}
function kc(i, t) {
  if (t.bitmap) {
    i.drawImage(t.bitmap, 0, 0);
    return;
  }
  const e = t.height, s = t.width, n = e % Ut, r = (e - n) / Ut, o = n === 0 ? r : r + 1, h = i.createImageData(s, Ut);
  let l = 0;
  const c = t.data, d = h.data;
  for (let p = 0; p < o; p++) {
    const f = p < r ? Ut : n;
    ({ srcPos: l } = lg({
      src: c,
      srcPos: l,
      dest: d,
      width: s,
      height: f,
      nonBlackColor: 0
    })), i.putImageData(h, 0, p * Ut);
  }
}
function gn(i, t) {
  for (const e of [
    "strokeStyle",
    "fillStyle",
    "fillRule",
    "globalAlpha",
    "lineWidth",
    "lineCap",
    "lineJoin",
    "miterLimit",
    "globalCompositeOperation",
    "font",
    "filter"
  ]) i[e] !== void 0 && (t[e] = i[e]);
  i.setLineDash !== void 0 && (t.setLineDash(i.getLineDash()), t.lineDashOffset = i.lineDashOffset);
}
function Fa(i) {
  if (i.strokeStyle = i.fillStyle = "#000000", i.fillRule = "nonzero", i.globalAlpha = 1, i.lineWidth = 1, i.lineCap = "butt", i.lineJoin = "miter", i.miterLimit = 10, i.globalCompositeOperation = "source-over", i.font = "10px sans-serif", i.setLineDash !== void 0 && (i.setLineDash([]), i.lineDashOffset = 0), !Dt) {
    const { filter: t } = i;
    t !== "none" && t !== "" && (i.filter = "none");
  }
}
function Mc(i, t) {
  if (t) return !0;
  const e = C.singularValueDecompose2dScale(i);
  e[0] = Math.fround(e[0]), e[1] = Math.fround(e[1]);
  const s = Math.fround((globalThis.devicePixelRatio || 1) * Le.PDF_TO_CSS_UNITS);
  return e[0] <= s && e[1] <= s;
}
var dg = [
  "butt",
  "round",
  "square"
], ug = [
  "miter",
  "round",
  "bevel"
], pg = {}, Ec = {}, Fi = /* @__PURE__ */ new WeakSet(), Cr = class zd {
  constructor(t, e, s, n, r, { optionalContentConfig: o, markedContentStack: h = null }, l, c) {
    G(this, Fi), this.ctx = t, this.current = new xc(this.ctx.canvas.width, this.ctx.canvas.height), this.stateStack = [], this.pendingClip = null, this.pendingEOFill = !1, this.res = null, this.xobjs = null, this.commonObjs = e, this.objs = s, this.canvasFactory = n, this.filterFactory = r, this.groupStack = [], this.processingType3 = null, this.baseTransform = null, this.baseTransformStack = [], this.groupLevel = 0, this.smaskStack = [], this.smaskCounter = 0, this.tempSMask = null, this.suspendedCtx = null, this.contentVisible = !0, this.markedContentStack = h || [], this.optionalContentConfig = o, this.cachedCanvases = new cg(this.canvasFactory), this.cachedPatterns = /* @__PURE__ */ new Map(), this.annotationCanvasMap = l, this.viewportScale = 1, this.outputScaleX = 1, this.outputScaleY = 1, this.pageColors = c, this._cachedScaleForStroking = [-1, 0], this._cachedGetSinglePixelWidth = null, this._cachedBitmapsMap = /* @__PURE__ */ new Map();
  }
  getObject(t, e = null) {
    return typeof t == "string" ? t.startsWith("g_") ? this.commonObjs.get(t) : this.objs.get(t) : e;
  }
  beginDrawing({ transform: t, viewport: e, transparency: s = !1, background: n = null }) {
    const r = this.ctx.canvas.width, o = this.ctx.canvas.height, h = this.ctx.fillStyle;
    if (this.ctx.fillStyle = n || "#ffffff", this.ctx.fillRect(0, 0, r, o), this.ctx.fillStyle = h, s) {
      const l = this.cachedCanvases.getCanvas("transparent", r, o);
      this.compositeCtx = this.ctx, this.transparentCanvas = l.canvas, this.ctx = l.context, this.ctx.save(), this.ctx.transform(...st(this.compositeCtx));
    }
    this.ctx.save(), Fa(this.ctx), t && (this.ctx.transform(...t), this.outputScaleX = t[0], this.outputScaleY = t[0]), this.ctx.transform(...e.transform), this.viewportScale = e.scale, this.baseTransform = st(this.ctx);
  }
  executeOperatorList(t, e, s, n) {
    const r = t.argsArray, o = t.fnArray;
    let h = e || 0;
    const l = r.length;
    if (l === h) return h;
    const c = l - h > 10 && typeof s == "function", d = c ? Date.now() + 15 : 0;
    let p = 0;
    const f = this.commonObjs, v = this.objs;
    let m;
    for (; ; ) {
      if (n !== void 0 && h === n.nextBreakPoint)
        return n.breakIt(h, s), h;
      if (m = o[h], m !== ve.dependency) this[m].apply(this, r[h]);
      else for (const b of r[h]) {
        const w = b.startsWith("g_") ? f : v;
        if (!w.has(b))
          return w.get(b, s), h;
      }
      if (h++, h === l) return h;
      if (c && ++p > 10) {
        if (Date.now() > d)
          return s(), h;
        p = 0;
      }
    }
  }
  endDrawing() {
    g(Fi, this, Cc).call(this), this.cachedCanvases.clear(), this.cachedPatterns.clear();
    for (const t of this._cachedBitmapsMap.values()) {
      for (const e of t.values()) typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement && (e.width = e.height = 0);
      t.clear();
    }
    this._cachedBitmapsMap.clear(), g(Fi, this, Pc).call(this);
  }
  _scaleImage(t, e) {
    const s = t.width ?? t.displayWidth, n = t.height ?? t.displayHeight;
    let r, o, h = Math.max(Math.hypot(e[0], e[1]), 1), l = Math.max(Math.hypot(e[2], e[3]), 1), c = s, d = n, p = "prescale1";
    for (; h > 2 && c > 1 || l > 2 && d > 1; ) {
      let f = c, v = d;
      h > 2 && c > 1 && (f = c >= 16384 ? Math.floor(c / 2) - 1 || 1 : Math.ceil(c / 2), h /= c / f), l > 2 && d > 1 && (v = d >= 16384 ? Math.floor(d / 2) - 1 || 1 : Math.ceil(d) / 2, l /= d / v), r = this.cachedCanvases.getCanvas(p, f, v), o = r.context, o.clearRect(0, 0, f, v), o.drawImage(t, 0, 0, c, d, 0, 0, f, v), t = r.canvas, c = f, d = v, p = p === "prescale1" ? "prescale2" : "prescale1";
    }
    return {
      img: t,
      paintWidth: c,
      paintHeight: d
    };
  }
  _createMaskCanvas(t) {
    const e = this.ctx, { width: s, height: n } = t, r = this.current.fillColor, o = this.current.patternFill, h = st(e);
    let l, c, d, p;
    if ((t.bitmap || t.data) && t.count > 1) {
      const F = t.bitmap || t.data.buffer;
      c = JSON.stringify(o ? h : [h.slice(0, 4), r]), l = this._cachedBitmapsMap.get(F), l || (l = /* @__PURE__ */ new Map(), this._cachedBitmapsMap.set(F, l));
      const H = l.get(c);
      if (H && !o) return {
        canvas: H,
        offsetX: Math.round(Math.min(h[0], h[2]) + h[4]),
        offsetY: Math.round(Math.min(h[1], h[3]) + h[5])
      };
      d = H;
    }
    d || (p = this.cachedCanvases.getCanvas("maskCanvas", s, n), kc(p.context, t));
    let f = C.transform(h, [
      1 / s,
      0,
      0,
      -1 / n,
      0,
      0
    ]);
    f = C.transform(f, [
      1,
      0,
      0,
      1,
      0,
      -n
    ]);
    const [v, m, b, w] = C.getAxialAlignedBoundingBox([
      0,
      0,
      s,
      n
    ], f), A = Math.round(b - v) || 1, y = Math.round(w - m) || 1, x = this.cachedCanvases.getCanvas("fillCanvas", A, y), S = x.context, M = v, P = m;
    S.translate(-M, -P), S.transform(...f), d || (d = this._scaleImage(p.canvas, Ee(S)), d = d.img, l && o && l.set(c, d)), S.imageSmoothingEnabled = Mc(st(S), t.interpolate), La(S, d, 0, 0, d.width, d.height, 0, 0, s, n), S.globalCompositeOperation = "source-in";
    const k = C.transform(Ee(S), [
      1,
      0,
      0,
      1,
      -M,
      -P
    ]);
    return S.fillStyle = o ? r.getPattern(e, this, k, Qi) : r, S.fillRect(0, 0, s, n), l && !o && (this.cachedCanvases.delete("fillCanvas"), l.set(c, x.canvas)), {
      canvas: x.canvas,
      offsetX: Math.round(M),
      offsetY: Math.round(P)
    };
  }
  setLineWidth(t) {
    t !== this.current.lineWidth && (this._cachedScaleForStroking[0] = -1), this.current.lineWidth = t, this.ctx.lineWidth = t;
  }
  setLineCap(t) {
    this.ctx.lineCap = dg[t];
  }
  setLineJoin(t) {
    this.ctx.lineJoin = ug[t];
  }
  setMiterLimit(t) {
    this.ctx.miterLimit = t;
  }
  setDash(t, e) {
    const s = this.ctx;
    s.setLineDash !== void 0 && (s.setLineDash(t), s.lineDashOffset = e);
  }
  setRenderingIntent(t) {
  }
  setFlatness(t) {
  }
  setGState(t) {
    for (const [e, s] of t) switch (e) {
      case "LW":
        this.setLineWidth(s);
        break;
      case "LC":
        this.setLineCap(s);
        break;
      case "LJ":
        this.setLineJoin(s);
        break;
      case "ML":
        this.setMiterLimit(s);
        break;
      case "D":
        this.setDash(s[0], s[1]);
        break;
      case "RI":
        this.setRenderingIntent(s);
        break;
      case "FL":
        this.setFlatness(s);
        break;
      case "Font":
        this.setFont(s[0], s[1]);
        break;
      case "CA":
        this.current.strokeAlpha = s;
        break;
      case "ca":
        this.current.fillAlpha = s, this.ctx.globalAlpha = s;
        break;
      case "BM":
        this.ctx.globalCompositeOperation = s;
        break;
      case "SMask":
        this.current.activeSMask = s ? this.tempSMask : null, this.tempSMask = null, this.checkSMaskState();
        break;
      case "TR":
        this.ctx.filter = this.current.transferMaps = this.filterFactory.addFilter(s);
    }
  }
  get inSMaskMode() {
    return !!this.suspendedCtx;
  }
  checkSMaskState() {
    const t = this.inSMaskMode;
    this.current.activeSMask && !t ? this.beginSMaskMode() : !this.current.activeSMask && t && this.endSMaskMode();
  }
  beginSMaskMode() {
    if (this.inSMaskMode) throw new Error("beginSMaskMode called while already in smask mode");
    const t = this.ctx.canvas.width, e = this.ctx.canvas.height, s = "smaskGroupAt" + this.groupLevel, n = this.cachedCanvases.getCanvas(s, t, e);
    this.suspendedCtx = this.ctx, this.ctx = n.context;
    const r = this.ctx;
    r.setTransform(...st(this.suspendedCtx)), gn(this.suspendedCtx, r), (function(h, l) {
      if (h._removeMirroring) throw new Error("Context is already forwarding operations.");
      h.__originalSave = h.save, h.__originalRestore = h.restore, h.__originalRotate = h.rotate, h.__originalScale = h.scale, h.__originalTranslate = h.translate, h.__originalTransform = h.transform, h.__originalSetTransform = h.setTransform, h.__originalResetTransform = h.resetTransform, h.__originalClip = h.clip, h.__originalMoveTo = h.moveTo, h.__originalLineTo = h.lineTo, h.__originalBezierCurveTo = h.bezierCurveTo, h.__originalRect = h.rect, h.__originalClosePath = h.closePath, h.__originalBeginPath = h.beginPath, h._removeMirroring = () => {
        h.save = h.__originalSave, h.restore = h.__originalRestore, h.rotate = h.__originalRotate, h.scale = h.__originalScale, h.translate = h.__originalTranslate, h.transform = h.__originalTransform, h.setTransform = h.__originalSetTransform, h.resetTransform = h.__originalResetTransform, h.clip = h.__originalClip, h.moveTo = h.__originalMoveTo, h.lineTo = h.__originalLineTo, h.bezierCurveTo = h.__originalBezierCurveTo, h.rect = h.__originalRect, h.closePath = h.__originalClosePath, h.beginPath = h.__originalBeginPath, delete h._removeMirroring;
      }, h.save = function() {
        l.save(), this.__originalSave();
      }, h.restore = function() {
        l.restore(), this.__originalRestore();
      }, h.translate = function(d, p) {
        l.translate(d, p), this.__originalTranslate(d, p);
      }, h.scale = function(d, p) {
        l.scale(d, p), this.__originalScale(d, p);
      }, h.transform = function(d, p, f, v, m, b) {
        l.transform(d, p, f, v, m, b), this.__originalTransform(d, p, f, v, m, b);
      }, h.setTransform = function(d, p, f, v, m, b) {
        l.setTransform(d, p, f, v, m, b), this.__originalSetTransform(d, p, f, v, m, b);
      }, h.resetTransform = function() {
        l.resetTransform(), this.__originalResetTransform();
      }, h.rotate = function(d) {
        l.rotate(d), this.__originalRotate(d);
      }, h.clip = function(d) {
        l.clip(d), this.__originalClip(d);
      }, h.moveTo = function(c, d) {
        l.moveTo(c, d), this.__originalMoveTo(c, d);
      }, h.lineTo = function(c, d) {
        l.lineTo(c, d), this.__originalLineTo(c, d);
      }, h.bezierCurveTo = function(c, d, p, f, v, m) {
        l.bezierCurveTo(c, d, p, f, v, m), this.__originalBezierCurveTo(c, d, p, f, v, m);
      }, h.rect = function(c, d, p, f) {
        l.rect(c, d, p, f), this.__originalRect(c, d, p, f);
      }, h.closePath = function() {
        l.closePath(), this.__originalClosePath();
      }, h.beginPath = function() {
        l.beginPath(), this.__originalBeginPath();
      };
    })(r, this.suspendedCtx), this.setGState([
      ["BM", "source-over"],
      ["ca", 1],
      ["CA", 1]
    ]);
  }
  endSMaskMode() {
    if (!this.inSMaskMode) throw new Error("endSMaskMode called while not in smask mode");
    this.ctx._removeMirroring(), gn(this.ctx, this.suspendedCtx), this.ctx = this.suspendedCtx, this.suspendedCtx = null;
  }
  compose(t) {
    if (!this.current.activeSMask) return;
    t ? (t[0] = Math.floor(t[0]), t[1] = Math.floor(t[1]), t[2] = Math.ceil(t[2]), t[3] = Math.ceil(t[3])) : t = [
      0,
      0,
      this.ctx.canvas.width,
      this.ctx.canvas.height
    ];
    const e = this.current.activeSMask, s = this.suspendedCtx;
    this.composeSMask(s, e, this.ctx, t), this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height), this.ctx.restore();
  }
  composeSMask(t, e, s, n) {
    const r = n[0], o = n[1], h = n[2] - r, l = n[3] - o;
    h !== 0 && l !== 0 && (this.genericComposeSMask(e.context, s, h, l, e.subtype, e.backdrop, e.transferMap, r, o, e.offsetX, e.offsetY), t.save(), t.globalAlpha = 1, t.globalCompositeOperation = "source-over", t.setTransform(1, 0, 0, 1, 0, 0), t.drawImage(s.canvas, 0, 0), t.restore());
  }
  genericComposeSMask(t, e, s, n, r, o, h, l, c, d, p) {
    let f = t.canvas, v = l - d, m = c - p;
    if (o) {
      const w = C.makeHexColor(...o);
      if (v < 0 || m < 0 || v + s > f.width || m + n > f.height) {
        const A = this.cachedCanvases.getCanvas("maskExtension", s, n), y = A.context;
        y.drawImage(f, -v, -m), y.globalCompositeOperation = "destination-atop", y.fillStyle = w, y.fillRect(0, 0, s, n), y.globalCompositeOperation = "source-over", f = A.canvas, v = m = 0;
      } else {
        t.save(), t.globalAlpha = 1, t.setTransform(1, 0, 0, 1, 0, 0);
        const A = new Path2D();
        A.rect(v, m, s, n), t.clip(A), t.globalCompositeOperation = "destination-atop", t.fillStyle = w, t.fillRect(v, m, s, n), t.restore();
      }
    }
    e.save(), e.globalAlpha = 1, e.setTransform(1, 0, 0, 1, 0, 0), r === "Alpha" && h ? e.filter = this.filterFactory.addAlphaFilter(h) : r === "Luminosity" && (e.filter = this.filterFactory.addLuminosityFilter(h));
    const b = new Path2D();
    b.rect(l, c, s, n), e.clip(b), e.globalCompositeOperation = "destination-in", e.drawImage(f, v, m, s, n, l, c, s, n), e.restore();
  }
  save() {
    this.inSMaskMode ? (gn(this.ctx, this.suspendedCtx), this.suspendedCtx.save()) : this.ctx.save();
    const t = this.current;
    this.stateStack.push(t), this.current = t.clone();
  }
  restore() {
    this.stateStack.length === 0 && this.inSMaskMode && this.endSMaskMode(), this.stateStack.length !== 0 && (this.current = this.stateStack.pop(), this.inSMaskMode ? (this.suspendedCtx.restore(), gn(this.suspendedCtx, this.ctx)) : this.ctx.restore(), this.checkSMaskState(), this.pendingClip = null, this._cachedScaleForStroking[0] = -1, this._cachedGetSinglePixelWidth = null);
  }
  transform(t, e, s, n, r, o) {
    this.ctx.transform(t, e, s, n, r, o), this._cachedScaleForStroking[0] = -1, this._cachedGetSinglePixelWidth = null;
  }
  constructPath(t, e, s) {
    const n = this.ctx, r = this.current;
    let o, h, l = r.x, c = r.y;
    const d = st(n), p = d[0] === 0 && d[3] === 0 || d[1] === 0 && d[2] === 0, f = p ? s.slice(0) : null;
    for (let v = 0, m = 0, b = t.length; v < b; v++) switch (0 | t[v]) {
      case ve.rectangle:
        l = e[m++], c = e[m++];
        const w = e[m++], A = e[m++], y = l + w, x = c + A;
        n.moveTo(l, c), w === 0 || A === 0 ? n.lineTo(y, x) : (n.lineTo(y, c), n.lineTo(y, x), n.lineTo(l, x)), p || r.updateRectMinMax(d, [
          l,
          c,
          y,
          x
        ]), n.closePath();
        break;
      case ve.moveTo:
        l = e[m++], c = e[m++], n.moveTo(l, c), p || r.updatePathMinMax(d, l, c);
        break;
      case ve.lineTo:
        l = e[m++], c = e[m++], n.lineTo(l, c), p || r.updatePathMinMax(d, l, c);
        break;
      case ve.curveTo:
        o = l, h = c, l = e[m + 4], c = e[m + 5], n.bezierCurveTo(e[m], e[m + 1], e[m + 2], e[m + 3], l, c), r.updateCurvePathMinMax(d, o, h, e[m], e[m + 1], e[m + 2], e[m + 3], l, c, f), m += 6;
        break;
      case ve.curveTo2:
        o = l, h = c, n.bezierCurveTo(l, c, e[m], e[m + 1], e[m + 2], e[m + 3]), r.updateCurvePathMinMax(d, o, h, l, c, e[m], e[m + 1], e[m + 2], e[m + 3], f), l = e[m + 2], c = e[m + 3], m += 4;
        break;
      case ve.curveTo3:
        o = l, h = c, l = e[m + 2], c = e[m + 3], n.bezierCurveTo(e[m], e[m + 1], l, c, l, c), r.updateCurvePathMinMax(d, o, h, e[m], e[m + 1], l, c, l, c, f), m += 4;
        break;
      case ve.closePath:
        n.closePath();
    }
    p && r.updateScalingPathMinMax(d, f), r.setCurrentPoint(l, c);
  }
  closePath() {
    this.ctx.closePath();
  }
  stroke(t = !0) {
    const e = this.ctx, s = this.current.strokeColor;
    e.globalAlpha = this.current.strokeAlpha, this.contentVisible && (typeof s == "object" && s?.getPattern ? (e.save(), e.strokeStyle = s.getPattern(e, this, Ee(e), Qr), this.rescaleAndStroke(!1), e.restore()) : this.rescaleAndStroke(!0)), t && this.consumePath(this.current.getClippedPathBoundingBox()), e.globalAlpha = this.current.fillAlpha;
  }
  closeStroke() {
    this.closePath(), this.stroke();
  }
  fill(t = !0) {
    const e = this.ctx, s = this.current.fillColor;
    let n = !1;
    this.current.patternFill && (e.save(), e.fillStyle = s.getPattern(e, this, Ee(e), Qi), n = !0);
    const r = this.current.getClippedPathBoundingBox();
    this.contentVisible && r !== null && (this.pendingEOFill ? (e.fill("evenodd"), this.pendingEOFill = !1) : e.fill()), n && e.restore(), t && this.consumePath(r);
  }
  eoFill() {
    this.pendingEOFill = !0, this.fill();
  }
  fillStroke() {
    this.fill(!1), this.stroke(!1), this.consumePath();
  }
  eoFillStroke() {
    this.pendingEOFill = !0, this.fillStroke();
  }
  closeFillStroke() {
    this.closePath(), this.fillStroke();
  }
  closeEOFillStroke() {
    this.pendingEOFill = !0, this.closePath(), this.fillStroke();
  }
  endPath() {
    this.consumePath();
  }
  clip() {
    this.pendingClip = pg;
  }
  eoClip() {
    this.pendingClip = Ec;
  }
  beginText() {
    this.current.textMatrix = md, this.current.textMatrixScale = 1, this.current.x = this.current.lineX = 0, this.current.y = this.current.lineY = 0;
  }
  endText() {
    const t = this.pendingTextPaths, e = this.ctx;
    if (t === void 0) {
      e.beginPath();
      return;
    }
    const s = new Path2D(), n = e.getTransform().invertSelf();
    for (const { transform: r, x: o, y: h, fontSize: l, path: c } of t) s.addPath(c, new DOMMatrix(r).preMultiplySelf(n).translate(o, h).scale(l, -l));
    e.clip(s), e.beginPath(), delete this.pendingTextPaths;
  }
  setCharSpacing(t) {
    this.current.charSpacing = t;
  }
  setWordSpacing(t) {
    this.current.wordSpacing = t;
  }
  setHScale(t) {
    this.current.textHScale = t / 100;
  }
  setLeading(t) {
    this.current.leading = -t;
  }
  setFont(t, e) {
    const s = this.commonObjs.get(t), n = this.current;
    if (!s) throw new Error(`Can't find font for ${t}`);
    if (n.fontMatrix = s.fontMatrix || Ch, n.fontMatrix[0] !== 0 && n.fontMatrix[3] !== 0 || B("Invalid font matrix for font " + t), e < 0 ? (e = -e, n.fontDirection = -1) : n.fontDirection = 1, this.current.font = s, this.current.fontSize = e, s.isType3Font) return;
    const r = s.loadedName || "sans-serif", o = s.systemFontInfo?.css || `"${r}", ${s.fallbackName}`;
    let h = "normal";
    s.black ? h = "900" : s.bold && (h = "bold");
    const l = s.italic ? "italic" : "normal";
    let c = e;
    e < 16 ? c = 16 : e > 100 && (c = 100), this.current.fontSizeScale = e / c, this.ctx.font = `${l} ${h} ${c}px ${o}`;
  }
  setTextRenderingMode(t) {
    this.current.textRenderingMode = t;
  }
  setTextRise(t) {
    this.current.textRise = t;
  }
  moveText(t, e) {
    this.current.x = this.current.lineX += t, this.current.y = this.current.lineY += e;
  }
  setLeadingMoveText(t, e) {
    this.setLeading(-e), this.moveText(t, e);
  }
  setTextMatrix(t, e, s, n, r, o) {
    this.current.textMatrix = [
      t,
      e,
      s,
      n,
      r,
      o
    ], this.current.textMatrixScale = Math.hypot(t, e), this.current.x = this.current.lineX = 0, this.current.y = this.current.lineY = 0;
  }
  nextLine() {
    this.moveText(0, this.current.leading);
  }
  paintChar(t, e, s, n, r) {
    const o = this.ctx, h = this.current, l = h.font, c = h.textRenderingMode, d = h.fontSize / h.fontSizeScale, p = c & Ql, f = !!(c & Bu), v = h.patternFill && !l.missingFile, m = h.patternStroke && !l.missingFile;
    let b;
    if ((l.disableFontFace || f || v || m) && (b = l.getPathGenerator(this.commonObjs, t)), l.disableFontFace || v || m) {
      if (o.save(), o.translate(e, s), o.scale(d, -d), p === vr || p === Zs) if (n) {
        const w = o.getTransform();
        o.setTransform(...n), o.fill(g(Fi, this, Tc).call(this, b, w, n));
      } else o.fill(b);
      if (p === Ao || p === Zs) if (r) {
        const w = o.getTransform();
        o.setTransform(...r), o.stroke(g(Fi, this, Tc).call(this, b, w, r));
      } else
        o.lineWidth /= d, o.stroke(b);
      o.restore();
    } else
      p !== vr && p !== Zs || o.fillText(t, e, s), p !== Ao && p !== Zs || o.strokeText(t, e, s);
    f && (this.pendingTextPaths || (this.pendingTextPaths = [])).push({
      transform: st(o),
      x: e,
      y: s,
      fontSize: d,
      path: b
    });
  }
  get isFontSubpixelAAEnabled() {
    const { context: t } = this.cachedCanvases.getCanvas("isFontSubpixelAAEnabled", 10, 10);
    t.scale(1.5, 1), t.fillText("I", 0, 10);
    const e = t.getImageData(0, 0, 10, 10).data;
    let s = !1;
    for (let n = 3; n < e.length; n += 4) if (e[n] > 0 && e[n] < 255) {
      s = !0;
      break;
    }
    return $(this, "isFontSubpixelAAEnabled", s);
  }
  showText(t) {
    const e = this.current, s = e.font;
    if (s.isType3Font) return this.showType3Text(t);
    const n = e.fontSize;
    if (n === 0) return;
    const r = this.ctx, o = e.fontSizeScale, h = e.charSpacing, l = e.wordSpacing, c = e.fontDirection, d = e.textHScale * c, p = t.length, f = s.vertical, v = f ? 1 : -1, m = s.defaultVMetrics, b = n * e.fontMatrix[0], w = e.textRenderingMode === vr && !s.disableFontFace && !e.patternFill;
    r.save(), r.transform(...e.textMatrix), r.translate(e.x, e.y + e.textRise), c > 0 ? r.scale(d, -1) : r.scale(d, 1);
    let A, y;
    if (e.patternFill) {
      r.save();
      const k = e.fillColor.getPattern(r, this, Ee(r), Qi);
      A = st(r), r.restore(), r.fillStyle = k;
    }
    if (e.patternStroke) {
      r.save();
      const k = e.strokeColor.getPattern(r, this, Ee(r), Qr);
      y = st(r), r.restore(), r.strokeStyle = k;
    }
    let x = e.lineWidth;
    const S = e.textMatrixScale;
    if (S === 0 || x === 0) {
      const k = e.textRenderingMode & Ql;
      k !== Ao && k !== Zs || (x = this.getSinglePixelWidth());
    } else x /= S;
    if (o !== 1 && (r.scale(o, o), x /= o), r.lineWidth = x, s.isInvalidPDFjsFont) {
      const k = [];
      let F = 0;
      for (const H of t)
        k.push(H.unicode), F += H.width;
      r.fillText(k.join(""), 0, 0), e.x += F * b * d, r.restore(), this.compose();
      return;
    }
    let M, P = 0;
    for (M = 0; M < p; ++M) {
      const k = t[M];
      if (typeof k == "number") {
        P += v * k * n / 1e3;
        continue;
      }
      let F = !1;
      const H = (k.isSpace ? l : 0) + h, j = k.fontChar, z = k.accent;
      let Y, pt, X = k.width;
      if (f) {
        const ot = k.vmetric || m, I = -(k.vmetric ? ot[1] : 0.5 * X) * b, O = ot[2] * b;
        X = ot ? -ot[0] : X, Y = I / o, pt = (P + O) / o;
      } else
        Y = P / o, pt = 0;
      if (s.remeasure && X > 0) {
        const ot = 1e3 * r.measureText(j).width / n * o;
        if (X < ot && this.isFontSubpixelAAEnabled) {
          const I = X / ot;
          F = !0, r.save(), r.scale(I, 1), Y /= I;
        } else X !== ot && (Y += (X - ot) / 2e3 * n / o);
      }
      if (this.contentVisible && (k.isInFont || s.missingFile)) {
        if (w && !z) r.fillText(j, Y, pt);
        else if (this.paintChar(j, Y, pt, A, y), z) {
          const ot = Y + n * z.offset.x / o, I = pt - n * z.offset.y / o;
          this.paintChar(z.fontChar, ot, I, A, y);
        }
      }
      P += f ? X * b - H * c : X * b + H * c, F && r.restore();
    }
    f ? e.y -= P : e.x += P * d, r.restore(), this.compose();
  }
  showType3Text(t) {
    const e = this.ctx, s = this.current, n = s.font, r = s.fontSize, o = s.fontDirection, h = n.vertical ? 1 : -1, l = s.charSpacing, c = s.wordSpacing, d = s.textHScale * o, p = s.fontMatrix || Ch, f = t.length;
    let v, m, b, w;
    if (s.textRenderingMode !== Wu && r !== 0) {
      for (this._cachedScaleForStroking[0] = -1, this._cachedGetSinglePixelWidth = null, e.save(), e.transform(...s.textMatrix), e.translate(s.x, s.y), e.scale(d, o), v = 0; v < f; ++v) {
        if (m = t[v], typeof m == "number") {
          w = h * m * r / 1e3, this.ctx.translate(w, 0), s.x += w * d;
          continue;
        }
        const A = (m.isSpace ? c : 0) + l, y = n.charProcOperatorList[m.operatorListId];
        if (!y) {
          B(`Type3 character "${m.operatorListId}" is not available.`);
          continue;
        }
        this.contentVisible && (this.processingType3 = m, this.save(), e.scale(r, r), e.transform(...p), this.executeOperatorList(y), this.restore()), b = C.applyTransform([m.width, 0], p)[0] * r + A, e.translate(b, 0), s.x += b * d;
      }
      e.restore(), this.processingType3 = null;
    }
  }
  setCharWidth(t, e) {
  }
  setCharWidthAndBounds(t, e, s, n, r, o) {
    this.ctx.rect(s, n, r - s, o - n), this.ctx.clip(), this.endPath();
  }
  getColorN_Pattern(t) {
    let e;
    if (t[0] === "TilingPattern") {
      const s = t[1], n = this.baseTransform || st(this.ctx);
      e = new Hd(t, s, this.ctx, { createCanvasGraphics: (r) => new zd(r, this.commonObjs, this.objs, this.canvasFactory, this.filterFactory, {
        optionalContentConfig: this.optionalContentConfig,
        markedContentStack: this.markedContentStack
      }) }, n);
    } else e = this._getPattern(t[1], t[2]);
    return e;
  }
  setStrokeColorN() {
    this.current.strokeColor = this.getColorN_Pattern(arguments), this.current.patternStroke = !0;
  }
  setFillColorN() {
    this.current.fillColor = this.getColorN_Pattern(arguments), this.current.patternFill = !0;
  }
  setStrokeRGBColor(t, e, s) {
    this.ctx.strokeStyle = this.current.strokeColor = C.makeHexColor(t, e, s), this.current.patternStroke = !1;
  }
  setStrokeTransparent() {
    this.ctx.strokeStyle = this.current.strokeColor = "transparent", this.current.patternStroke = !1;
  }
  setFillRGBColor(t, e, s) {
    this.ctx.fillStyle = this.current.fillColor = C.makeHexColor(t, e, s), this.current.patternFill = !1;
  }
  setFillTransparent() {
    this.ctx.fillStyle = this.current.fillColor = "transparent", this.current.patternFill = !1;
  }
  _getPattern(t, e = null) {
    let s;
    return this.cachedPatterns.has(t) ? s = this.cachedPatterns.get(t) : (s = (function(r) {
      switch (r[0]) {
        case "RadialAxial":
          return new sg(r);
        case "Mesh":
          return new ag(r);
        case "Dummy":
          return new rg();
      }
      throw new Error(`Unknown IR type: ${r[0]}`);
    })(this.getObject(t)), this.cachedPatterns.set(t, s)), e && (s.matrix = e), s;
  }
  shadingFill(t) {
    if (!this.contentVisible) return;
    const e = this.ctx;
    this.save(), e.fillStyle = this._getPattern(t).getPattern(e, this, Ee(e), ea);
    const s = Ee(e);
    if (s) {
      const { width: n, height: r } = e.canvas, [o, h, l, c] = C.getAxialAlignedBoundingBox([
        0,
        0,
        n,
        r
      ], s);
      this.ctx.fillRect(o, h, l - o, c - h);
    } else this.ctx.fillRect(-1e10, -1e10, 2e10, 2e10);
    this.compose(this.current.getClippedPathBoundingBox()), this.restore();
  }
  beginInlineImage() {
    et("Should not call beginInlineImage");
  }
  beginImageData() {
    et("Should not call beginImageData");
  }
  paintFormXObjectBegin(t, e) {
    if (this.contentVisible && (this.save(), this.baseTransformStack.push(this.baseTransform), t && this.transform(...t), this.baseTransform = st(this.ctx), e)) {
      const s = e[2] - e[0], n = e[3] - e[1];
      this.ctx.rect(e[0], e[1], s, n), this.current.updateRectMinMax(st(this.ctx), e), this.clip(), this.endPath();
    }
  }
  paintFormXObjectEnd() {
    this.contentVisible && (this.restore(), this.baseTransform = this.baseTransformStack.pop());
  }
  beginGroup(t) {
    if (!this.contentVisible) return;
    this.save(), this.inSMaskMode && (this.endSMaskMode(), this.current.activeSMask = null);
    const e = this.ctx;
    t.isolated || co("TODO: Support non-isolated groups."), t.knockout && B("Knockout groups not supported.");
    const s = st(e);
    if (t.matrix && e.transform(...t.matrix), !t.bbox) throw new Error("Bounding box is required.");
    let n = C.getAxialAlignedBoundingBox(t.bbox, st(e));
    const r = [
      0,
      0,
      e.canvas.width,
      e.canvas.height
    ];
    n = C.intersect(n, r) || [
      0,
      0,
      0,
      0
    ];
    const o = Math.floor(n[0]), h = Math.floor(n[1]), l = Math.max(Math.ceil(n[2]) - o, 1), c = Math.max(Math.ceil(n[3]) - h, 1);
    this.current.startNewPathAndClipBox([
      0,
      0,
      l,
      c
    ]);
    let d = "groupAt" + this.groupLevel;
    t.smask && (d += "_smask_" + this.smaskCounter++ % 2);
    const p = this.cachedCanvases.getCanvas(d, l, c), f = p.context;
    f.translate(-o, -h), f.transform(...s), t.smask ? this.smaskStack.push({
      canvas: p.canvas,
      context: f,
      offsetX: o,
      offsetY: h,
      subtype: t.smask.subtype,
      backdrop: t.smask.backdrop,
      transferMap: t.smask.transferMap || null,
      startTransformInverse: null
    }) : (e.setTransform(1, 0, 0, 1, 0, 0), e.translate(o, h), e.save()), gn(e, f), this.ctx = f, this.setGState([
      ["BM", "source-over"],
      ["ca", 1],
      ["CA", 1]
    ]), this.groupStack.push(e), this.groupLevel++;
  }
  endGroup(t) {
    if (!this.contentVisible) return;
    this.groupLevel--;
    const e = this.ctx;
    if (this.ctx = this.groupStack.pop(), this.ctx.imageSmoothingEnabled = !1, t.smask)
      this.tempSMask = this.smaskStack.pop(), this.restore();
    else {
      this.ctx.restore();
      const s = st(this.ctx);
      this.restore(), this.ctx.save(), this.ctx.setTransform(...s);
      const n = C.getAxialAlignedBoundingBox([
        0,
        0,
        e.canvas.width,
        e.canvas.height
      ], s);
      this.ctx.drawImage(e.canvas, 0, 0), this.ctx.restore(), this.compose(n);
    }
  }
  beginAnnotation(t, e, s, n, r) {
    if (g(Fi, this, Cc).call(this), Fa(this.ctx), this.ctx.save(), this.save(), this.baseTransform && this.ctx.setTransform(...this.baseTransform), e) {
      const o = e[2] - e[0], h = e[3] - e[1];
      if (r && this.annotationCanvasMap) {
        (s = s.slice())[4] -= e[0], s[5] -= e[1], (e = e.slice())[0] = e[1] = 0, e[2] = o, e[3] = h;
        const [l, c] = C.singularValueDecompose2dScale(st(this.ctx)), { viewportScale: d } = this, p = Math.ceil(o * this.outputScaleX * d), f = Math.ceil(h * this.outputScaleY * d);
        this.annotationCanvas = this.canvasFactory.create(p, f);
        const { canvas: v, context: m } = this.annotationCanvas;
        this.annotationCanvasMap.set(t, v), this.annotationCanvas.savedCtx = this.ctx, this.ctx = m, this.ctx.save(), this.ctx.setTransform(l, 0, 0, -c, 0, h * c), Fa(this.ctx);
      } else
        Fa(this.ctx), this.endPath(), this.ctx.rect(e[0], e[1], o, h), this.ctx.clip(), this.ctx.beginPath();
    }
    this.current = new xc(this.ctx.canvas.width, this.ctx.canvas.height), this.transform(...s), this.transform(...n);
  }
  endAnnotation() {
    this.annotationCanvas && (this.ctx.restore(), g(Fi, this, Pc).call(this), this.ctx = this.annotationCanvas.savedCtx, delete this.annotationCanvas.savedCtx, delete this.annotationCanvas);
  }
  paintImageMaskXObject(t) {
    if (!this.contentVisible) return;
    const e = t.count;
    (t = this.getObject(t.data, t)).count = e;
    const s = this.ctx, n = this.processingType3;
    if (n && (n.compiled === void 0 && (n.compiled = (function(l) {
      const { width: c, height: d } = l;
      if (c > 1e3 || d > 1e3) return null;
      const p = new Uint8Array([
        0,
        2,
        4,
        0,
        1,
        0,
        5,
        4,
        8,
        10,
        0,
        8,
        0,
        2,
        1,
        0
      ]), f = c + 1;
      let v, m, b, w = new Uint8Array(f * (d + 1));
      const A = c + 7 & -8;
      let y = new Uint8Array(A * d), x = 0;
      for (const k of l.data) {
        let F = 128;
        for (; F > 0; )
          y[x++] = k & F ? 0 : 255, F >>= 1;
      }
      let S = 0;
      for (x = 0, y[x] !== 0 && (w[0] = 1, ++S), m = 1; m < c; m++)
        y[x] !== y[x + 1] && (w[m] = y[x] ? 2 : 1, ++S), x++;
      for (y[x] !== 0 && (w[m] = 2, ++S), v = 1; v < d; v++) {
        x = v * A, b = v * f, y[x - A] !== y[x] && (w[b] = y[x] ? 1 : 8, ++S);
        let k = (y[x] ? 4 : 0) + (y[x - A] ? 8 : 0);
        for (m = 1; m < c; m++)
          k = (k >> 2) + (y[x + 1] ? 4 : 0) + (y[x - A + 1] ? 8 : 0), p[k] && (w[b + m] = p[k], ++S), x++;
        if (y[x - A] !== y[x] && (w[b + m] = y[x] ? 2 : 4, ++S), S > 1e3) return null;
      }
      for (x = A * (d - 1), b = v * f, y[x] !== 0 && (w[b] = 8, ++S), m = 1; m < c; m++)
        y[x] !== y[x + 1] && (w[b + m] = y[x] ? 4 : 8, ++S), x++;
      if (y[x] !== 0 && (w[b + m] = 4, ++S), S > 1e3) return null;
      const M = new Int32Array([
        0,
        f,
        -1,
        0,
        -f,
        0,
        0,
        0,
        1
      ]), P = new Path2D();
      for (v = 0; S && v <= d; v++) {
        let k = v * f;
        const F = k + c;
        for (; k < F && !w[k]; ) k++;
        if (k === F) continue;
        P.moveTo(k % f, v);
        const H = k;
        let j = w[k];
        do {
          const z = M[j];
          do
            k += z;
          while (!w[k]);
          const Y = w[k];
          Y !== 5 && Y !== 10 ? (j = Y, w[k] = 0) : (j = Y & 51 * j >> 4, w[k] &= j >> 2 | j << 2), P.lineTo(k % f, k / f | 0), w[k] || --S;
        } while (H !== k);
        --v;
      }
      return y = null, w = null, function(k) {
        k.save(), k.scale(1 / c, -1 / d), k.translate(0, -d), k.fill(P), k.beginPath(), k.restore();
      };
    })(t)), n.compiled)) {
      n.compiled(s);
      return;
    }
    const r = this._createMaskCanvas(t), o = r.canvas;
    s.save(), s.setTransform(1, 0, 0, 1, 0, 0), s.drawImage(o, r.offsetX, r.offsetY), s.restore(), this.compose();
  }
  paintImageMaskXObjectRepeat(t, e, s = 0, n = 0, r, o) {
    if (!this.contentVisible) return;
    t = this.getObject(t.data, t);
    const h = this.ctx;
    h.save();
    const l = st(h);
    h.transform(e, s, n, r, 0, 0);
    const c = this._createMaskCanvas(t);
    h.setTransform(1, 0, 0, 1, c.offsetX - l[4], c.offsetY - l[5]);
    for (let d = 0, p = o.length; d < p; d += 2) {
      const f = C.transform(l, [
        e,
        s,
        n,
        r,
        o[d],
        o[d + 1]
      ]), [v, m] = C.applyTransform([0, 0], f);
      h.drawImage(c.canvas, v, m);
    }
    h.restore(), this.compose();
  }
  paintImageMaskXObjectGroup(t) {
    if (!this.contentVisible) return;
    const e = this.ctx, s = this.current.fillColor, n = this.current.patternFill;
    for (const r of t) {
      const { data: o, width: h, height: l, transform: c } = r, d = this.cachedCanvases.getCanvas("maskCanvas", h, l), p = d.context;
      p.save(), kc(p, this.getObject(o, r)), p.globalCompositeOperation = "source-in", p.fillStyle = n ? s.getPattern(p, this, Ee(e), Qi) : s, p.fillRect(0, 0, h, l), p.restore(), e.save(), e.transform(...c), e.scale(1, -1), La(e, d.canvas, 0, 0, h, l, 0, -1, 1, 1), e.restore();
    }
    this.compose();
  }
  paintImageXObject(t) {
    if (!this.contentVisible) return;
    const e = this.getObject(t);
    e ? this.paintInlineImageXObject(e) : B("Dependent image isn't ready yet");
  }
  paintImageXObjectRepeat(t, e, s, n) {
    if (!this.contentVisible) return;
    const r = this.getObject(t);
    if (!r) {
      B("Dependent image isn't ready yet");
      return;
    }
    const o = r.width, h = r.height, l = [];
    for (let c = 0, d = n.length; c < d; c += 2) l.push({
      transform: [
        e,
        0,
        0,
        s,
        n[c],
        n[c + 1]
      ],
      x: 0,
      y: 0,
      w: o,
      h
    });
    this.paintInlineImageXObjectGroup(r, l);
  }
  applyTransferMapsToCanvas(t) {
    return this.current.transferMaps !== "none" && (t.filter = this.current.transferMaps, t.drawImage(t.canvas, 0, 0), t.filter = "none"), t.canvas;
  }
  applyTransferMapsToBitmap(t) {
    if (this.current.transferMaps === "none") return t.bitmap;
    const { bitmap: e, width: s, height: n } = t, r = this.cachedCanvases.getCanvas("inlineImage", s, n), o = r.context;
    return o.filter = this.current.transferMaps, o.drawImage(e, 0, 0), o.filter = "none", r.canvas;
  }
  paintInlineImageXObject(t) {
    if (!this.contentVisible) return;
    const e = t.width, s = t.height, n = this.ctx;
    if (this.save(), !Dt) {
      const { filter: h } = n;
      h !== "none" && h !== "" && (n.filter = "none");
    }
    n.scale(1 / e, -1 / s);
    let r;
    if (t.bitmap) r = this.applyTransferMapsToBitmap(t);
    else if (typeof HTMLElement == "function" && t instanceof HTMLElement || !t.data) r = t;
    else {
      const h = this.cachedCanvases.getCanvas("inlineImage", e, s).context;
      Sc(h, t), r = this.applyTransferMapsToCanvas(h);
    }
    const o = this._scaleImage(r, Ee(n));
    n.imageSmoothingEnabled = Mc(st(n), t.interpolate), La(n, o.img, 0, 0, o.paintWidth, o.paintHeight, 0, -s, e, s), this.compose(), this.restore();
  }
  paintInlineImageXObjectGroup(t, e) {
    if (!this.contentVisible) return;
    const s = this.ctx;
    let n;
    if (t.bitmap) n = t.bitmap;
    else {
      const r = t.width, o = t.height, h = this.cachedCanvases.getCanvas("inlineImage", r, o).context;
      Sc(h, t), n = this.applyTransferMapsToCanvas(h);
    }
    for (const r of e)
      s.save(), s.transform(...r.transform), s.scale(1, -1), La(s, n, r.x, r.y, r.w, r.h, 0, -1, 1, 1), s.restore();
    this.compose();
  }
  paintSolidColorImageMask() {
    this.contentVisible && (this.ctx.fillRect(0, 0, 1, 1), this.compose());
  }
  markPoint(t) {
  }
  markPointProps(t, e) {
  }
  beginMarkedContent(t) {
    this.markedContentStack.push({ visible: !0 });
  }
  beginMarkedContentProps(t, e) {
    t === "OC" ? this.markedContentStack.push({ visible: this.optionalContentConfig.isVisible(e) }) : this.markedContentStack.push({ visible: !0 }), this.contentVisible = this.isContentVisible();
  }
  endMarkedContent() {
    this.markedContentStack.pop(), this.contentVisible = this.isContentVisible();
  }
  beginCompat() {
  }
  endCompat() {
  }
  consumePath(t) {
    const e = this.current.isEmptyClip();
    this.pendingClip && this.current.updateClipFromPath(), this.pendingClip || this.compose(t);
    const s = this.ctx;
    this.pendingClip && (e || (this.pendingClip === Ec ? s.clip("evenodd") : s.clip()), this.pendingClip = null), this.current.startNewPathAndClipBox(this.current.clipBox), s.beginPath();
  }
  getSinglePixelWidth() {
    if (!this._cachedGetSinglePixelWidth) {
      const t = st(this.ctx);
      if (t[1] === 0 && t[2] === 0) this._cachedGetSinglePixelWidth = 1 / Math.min(Math.abs(t[0]), Math.abs(t[3]));
      else {
        const e = Math.abs(t[0] * t[3] - t[2] * t[1]), s = Math.hypot(t[0], t[2]), n = Math.hypot(t[1], t[3]);
        this._cachedGetSinglePixelWidth = Math.max(s, n) / e;
      }
    }
    return this._cachedGetSinglePixelWidth;
  }
  getScaleForStroking() {
    if (this._cachedScaleForStroking[0] === -1) {
      const { lineWidth: t } = this.current, { a: e, b: s, c: n, d: r } = this.ctx.getTransform();
      let o, h;
      if (s === 0 && n === 0) {
        const l = Math.abs(e), c = Math.abs(r);
        if (l === c) if (t === 0) o = h = 1 / l;
        else {
          const d = l * t;
          o = h = d < 1 ? 1 / d : 1;
        }
        else if (t === 0)
          o = 1 / l, h = 1 / c;
        else {
          const d = l * t, p = c * t;
          o = d < 1 ? 1 / d : 1, h = p < 1 ? 1 / p : 1;
        }
      } else {
        const l = Math.abs(e * r - s * n), c = Math.hypot(e, s), d = Math.hypot(n, r);
        if (t === 0)
          o = d / l, h = c / l;
        else {
          const p = t * l;
          o = d > p ? d / p : 1, h = c > p ? c / p : 1;
        }
      }
      this._cachedScaleForStroking[0] = o, this._cachedScaleForStroking[1] = h;
    }
    return this._cachedScaleForStroking;
  }
  rescaleAndStroke(t) {
    const { ctx: e } = this, { lineWidth: s } = this.current, [n, r] = this.getScaleForStroking();
    if (e.lineWidth = s || 1, n === 1 && r === 1) {
      e.stroke();
      return;
    }
    const o = e.getLineDash();
    if (t && e.save(), e.scale(n, r), o.length > 0) {
      const h = Math.max(n, r);
      e.setLineDash(o.map(((l) => l / h))), e.lineDashOffset /= h;
    }
    e.stroke(), t && e.restore();
  }
  isContentVisible() {
    for (let t = this.markedContentStack.length - 1; t >= 0; t--) if (!this.markedContentStack[t].visible) return !1;
    return !0;
  }
};
function Cc() {
  for (; this.stateStack.length || this.inSMaskMode; ) this.restore();
  this.current.activeSMask = null, this.ctx.restore(), this.transparentCanvas && (this.ctx = this.compositeCtx, this.ctx.save(), this.ctx.setTransform(1, 0, 0, 1, 0, 0), this.ctx.drawImage(this.transparentCanvas, 0, 0), this.ctx.restore(), this.transparentCanvas = null);
}
function Pc() {
  if (this.pageColors) {
    const i = this.filterFactory.addHCMFilter(this.pageColors.foreground, this.pageColors.background);
    if (i !== "none") {
      const t = this.ctx.filter;
      this.ctx.filter = i, this.ctx.drawImage(this.ctx.canvas, 0, 0), this.ctx.filter = t;
    }
  }
}
function Tc(i, t, e) {
  const s = new Path2D();
  return s.addPath(i, new DOMMatrix(e).invertSelf().multiplySelf(t)), s;
}
for (const i in ve) Cr.prototype[i] !== void 0 && (Cr.prototype[ve[i]] = Cr.prototype[i]);
var Js = class $n {
  static get workerPort() {
    return g($n, this, Rc)._;
  }
  static set workerPort(t) {
    if (!(typeof Worker < "u" && t instanceof Worker) && t !== null) throw new Error("Invalid `workerPort` type.");
    Rc._ = g($n, this, t);
  }
  static get workerSrc() {
    return g($n, this, Dc)._;
  }
  static set workerSrc(t) {
    if (typeof t != "string") throw new Error("Invalid `workerSrc` type.");
    Dc._ = g($n, this, t);
  }
}, Rc = { _: null }, Dc = { _: "" }, fn = /* @__PURE__ */ new WeakMap(), Vo = /* @__PURE__ */ new WeakMap(), gg = class {
  constructor({ parsedData: i, rawData: t }) {
    _(this, fn, void 0), _(this, Vo, void 0), u(fn, this, i), u(Vo, this, t);
  }
  getRaw() {
    return a(Vo, this);
  }
  get(i) {
    return a(fn, this).get(i) ?? null;
  }
  getAll() {
    return Dl(a(fn, this));
  }
  has(i) {
    return a(fn, this).has(i);
  }
}, Fs = /* @__PURE__ */ Symbol("INTERNAL"), Uo = /* @__PURE__ */ new WeakMap(), qo = /* @__PURE__ */ new WeakMap(), Xo = /* @__PURE__ */ new WeakMap(), Na = /* @__PURE__ */ new WeakMap(), fg = class {
  constructor(i, { name: t, intent: e, usage: s, rbGroups: n }) {
    _(this, Uo, !1), _(this, qo, !1), _(this, Xo, !1), _(this, Na, !0), u(Uo, this, !!(i & Rl)), u(qo, this, !!(i & qr)), this.name = t, this.intent = e, this.usage = s, this.rbGroups = n;
  }
  get visible() {
    if (a(Xo, this)) return a(Na, this);
    if (!a(Na, this)) return !1;
    const { print: i, view: t } = this.usage;
    return a(Uo, this) ? t?.viewState !== "OFF" : !a(qo, this) || i?.printState !== "OFF";
  }
  _setVisible(i, t, e = !1) {
    i !== Fs && et("Internal method `_setVisible` called."), u(Xo, this, e), u(Na, this, t);
  }
}, fs = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakMap(), Oa = /* @__PURE__ */ new WeakMap(), Wa = /* @__PURE__ */ new WeakMap(), Qh = /* @__PURE__ */ new WeakSet(), mg = class {
  constructor(i, t = Rl) {
    if (G(this, Qh), _(this, fs, null), _(this, Z, /* @__PURE__ */ new Map()), _(this, Oa, null), _(this, Wa, null), this.renderingIntent = t, this.name = null, this.creator = null, i !== null) {
      this.name = i.name, this.creator = i.creator, u(Wa, this, i.order);
      for (const e of i.groups) a(Z, this).set(e.id, new fg(t, e));
      if (i.baseState === "OFF") for (const e of a(Z, this).values()) e._setVisible(Fs, !1);
      for (const e of i.on) a(Z, this).get(e)._setVisible(Fs, !0);
      for (const e of i.off) a(Z, this).get(e)._setVisible(Fs, !1);
      u(Oa, this, this.getHash());
    }
  }
  isVisible(i) {
    if (a(Z, this).size === 0) return !0;
    if (!i)
      return co("Optional content group not defined."), !0;
    if (i.type === "OCG")
      return a(Z, this).has(i.id) ? a(Z, this).get(i.id).visible : (B(`Optional content group not found: ${i.id}`), !0);
    if (i.type === "OCMD") {
      if (i.expression) return g(Qh, this, Gd).call(this, i.expression);
      if (!i.policy || i.policy === "AnyOn") {
        for (const t of i.ids) {
          if (!a(Z, this).has(t))
            return B(`Optional content group not found: ${t}`), !0;
          if (a(Z, this).get(t).visible) return !0;
        }
        return !1;
      }
      if (i.policy === "AllOn") {
        for (const t of i.ids) {
          if (!a(Z, this).has(t))
            return B(`Optional content group not found: ${t}`), !0;
          if (!a(Z, this).get(t).visible) return !1;
        }
        return !0;
      }
      if (i.policy === "AnyOff") {
        for (const t of i.ids) {
          if (!a(Z, this).has(t))
            return B(`Optional content group not found: ${t}`), !0;
          if (!a(Z, this).get(t).visible) return !0;
        }
        return !1;
      }
      if (i.policy === "AllOff") {
        for (const t of i.ids) {
          if (!a(Z, this).has(t))
            return B(`Optional content group not found: ${t}`), !0;
          if (a(Z, this).get(t).visible) return !1;
        }
        return !0;
      }
      return B(`Unknown optional content policy ${i.policy}.`), !0;
    }
    return B(`Unknown group type ${i.type}.`), !0;
  }
  setVisibility(i, t = !0, e = !0) {
    const s = a(Z, this).get(i);
    if (s) {
      if (e && t && s.rbGroups.length) for (const n of s.rbGroups) for (const r of n) r !== i && a(Z, this).get(r)?._setVisible(Fs, !1, !0);
      s._setVisible(Fs, !!t, !0), u(fs, this, null);
    } else B(`Optional content group not found: ${i}`);
  }
  setOCGState({ state: i, preserveRB: t }) {
    let e;
    for (const s of i) {
      switch (s) {
        case "ON":
        case "OFF":
        case "Toggle":
          e = s;
          continue;
      }
      const n = a(Z, this).get(s);
      if (n) switch (e) {
        case "ON":
          this.setVisibility(s, !0, t);
          break;
        case "OFF":
          this.setVisibility(s, !1, t);
          break;
        case "Toggle":
          this.setVisibility(s, !n.visible, t);
      }
    }
    u(fs, this, null);
  }
  get hasInitialVisibility() {
    return a(Oa, this) === null || this.getHash() === a(Oa, this);
  }
  getOrder() {
    return a(Z, this).size ? a(Wa, this) ? a(Wa, this).slice() : [...a(Z, this).keys()] : null;
  }
  getGroups() {
    return a(Z, this).size > 0 ? Dl(a(Z, this)) : null;
  }
  getGroup(i) {
    return a(Z, this).get(i) || null;
  }
  getHash() {
    if (a(fs, this) !== null) return a(fs, this);
    const i = new Cd();
    for (const [t, e] of a(Z, this)) i.update(`${t}:${e.visible}`);
    return u(fs, this, i.hexdigest());
  }
};
function Gd(i) {
  const t = i.length;
  if (t < 2) return !0;
  const e = i[0];
  for (let s = 1; s < t; s++) {
    const n = i[s];
    let r;
    if (Array.isArray(n)) r = g(Qh, this, Gd).call(this, n);
    else {
      if (!a(Z, this).has(n))
        return B(`Optional content group not found: ${n}`), !0;
      r = a(Z, this).get(n).visible;
    }
    switch (e) {
      case "And":
        if (!r) return !1;
        break;
      case "Or":
        if (r) return !0;
        break;
      case "Not":
        return !r;
      default:
        return !0;
    }
  }
  return e === "And";
}
var vg = class {
  constructor(i, { disableRange: t = !1, disableStream: e = !1 }) {
    ut(i, 'PDFDataTransportStream - missing required "pdfDataRangeTransport" argument.');
    const { length: s, initialData: n, progressiveDone: r, contentDispositionFilename: o } = i;
    if (this._queuedChunks = [], this._progressiveDone = r, this._contentDispositionFilename = o, n?.length > 0) {
      const h = n instanceof Uint8Array && n.byteLength === n.buffer.byteLength ? n.buffer : new Uint8Array(n).buffer;
      this._queuedChunks.push(h);
    }
    this._pdfDataRangeTransport = i, this._isStreamingSupported = !e, this._isRangeSupported = !t, this._contentLength = s, this._fullRequestReader = null, this._rangeReaders = [], i.addRangeListener(((h, l) => {
      this._onReceiveData({
        begin: h,
        chunk: l
      });
    })), i.addProgressListener(((h, l) => {
      this._onProgress({
        loaded: h,
        total: l
      });
    })), i.addProgressiveReadListener(((h) => {
      this._onReceiveData({ chunk: h });
    })), i.addProgressiveDoneListener((() => {
      this._onProgressiveDone();
    })), i.transportReady();
  }
  _onReceiveData({ begin: i, chunk: t }) {
    const e = t instanceof Uint8Array && t.byteLength === t.buffer.byteLength ? t.buffer : new Uint8Array(t).buffer;
    i === void 0 ? this._fullRequestReader ? this._fullRequestReader._enqueue(e) : this._queuedChunks.push(e) : ut(this._rangeReaders.some((function(s) {
      return s._begin !== i ? !1 : (s._enqueue(e), !0);
    })), "_onReceiveData - no `PDFDataTransportStreamRangeReader` instance found.");
  }
  get _progressiveDataLength() {
    return this._fullRequestReader?._loaded ?? 0;
  }
  _onProgress(i) {
    i.total === void 0 ? this._rangeReaders[0]?.onProgress?.({ loaded: i.loaded }) : this._fullRequestReader?.onProgress?.({
      loaded: i.loaded,
      total: i.total
    });
  }
  _onProgressiveDone() {
    this._fullRequestReader?.progressiveDone(), this._progressiveDone = !0;
  }
  _removeRangeReader(i) {
    const t = this._rangeReaders.indexOf(i);
    t >= 0 && this._rangeReaders.splice(t, 1);
  }
  getFullReader() {
    ut(!this._fullRequestReader, "PDFDataTransportStream.getFullReader can only be called once.");
    const i = this._queuedChunks;
    return this._queuedChunks = null, new _g(this, i, this._progressiveDone, this._contentDispositionFilename);
  }
  getRangeReader(i, t) {
    if (t <= this._progressiveDataLength) return null;
    const e = new bg(this, i, t);
    return this._pdfDataRangeTransport.requestDataRange(i, t), this._rangeReaders.push(e), e;
  }
  cancelAllRequests(i) {
    this._fullRequestReader?.cancel(i);
    for (const t of this._rangeReaders.slice(0)) t.cancel(i);
    this._pdfDataRangeTransport.abort();
  }
}, _g = class {
  constructor(i, t, e = !1, s = null) {
    this._stream = i, this._done = e || !1, this._filename = Nl(s) ? s : null, this._queuedChunks = t || [], this._loaded = 0;
    for (const n of this._queuedChunks) this._loaded += n.byteLength;
    this._requests = [], this._headersReady = Promise.resolve(), i._fullRequestReader = this, this.onProgress = null;
  }
  _enqueue(i) {
    this._done || (this._requests.length > 0 ? this._requests.shift().resolve({
      value: i,
      done: !1
    }) : this._queuedChunks.push(i), this._loaded += i.byteLength);
  }
  get headersReady() {
    return this._headersReady;
  }
  get filename() {
    return this._filename;
  }
  get isRangeSupported() {
    return this._stream._isRangeSupported;
  }
  get isStreamingSupported() {
    return this._stream._isStreamingSupported;
  }
  get contentLength() {
    return this._stream._contentLength;
  }
  async read() {
    if (this._queuedChunks.length > 0) return {
      value: this._queuedChunks.shift(),
      done: !1
    };
    if (this._done) return {
      value: void 0,
      done: !0
    };
    const i = Promise.withResolvers();
    return this._requests.push(i), i.promise;
  }
  cancel(i) {
    this._done = !0;
    for (const t of this._requests) t.resolve({
      value: void 0,
      done: !0
    });
    this._requests.length = 0;
  }
  progressiveDone() {
    this._done || (this._done = !0);
  }
}, bg = class {
  constructor(i, t, e) {
    this._stream = i, this._begin = t, this._end = e, this._queuedChunk = null, this._requests = [], this._done = !1, this.onProgress = null;
  }
  _enqueue(i) {
    if (!this._done) {
      if (this._requests.length === 0) this._queuedChunk = i;
      else {
        this._requests.shift().resolve({
          value: i,
          done: !1
        });
        for (const t of this._requests) t.resolve({
          value: void 0,
          done: !0
        });
        this._requests.length = 0;
      }
      this._done = !0, this._stream._removeRangeReader(this);
    }
  }
  get isStreamingSupported() {
    return !1;
  }
  async read() {
    if (this._queuedChunk) {
      const t = this._queuedChunk;
      return this._queuedChunk = null, {
        value: t,
        done: !1
      };
    }
    if (this._done) return {
      value: void 0,
      done: !0
    };
    const i = Promise.withResolvers();
    return this._requests.push(i), i.promise;
  }
  cancel(i) {
    this._done = !0;
    for (const t of this._requests) t.resolve({
      value: void 0,
      done: !0
    });
    this._requests.length = 0, this._stream._removeRangeReader(this);
  }
};
function jd(i, t) {
  const e = new Headers();
  if (!i || !t || typeof t != "object") return e;
  for (const s in t) {
    const n = t[s];
    n !== void 0 && e.append(s, n);
  }
  return e;
}
function fo(i) {
  try {
    return new URL(i).origin;
  } catch {
  }
  return null;
}
function Vd({ responseHeaders: i, isHttp: t, rangeChunkSize: e, disableRange: s }) {
  const n = {
    allowRangeRequests: !1,
    suggestedLength: void 0
  }, r = parseInt(i.get("Content-Length"), 10);
  return !Number.isInteger(r) || (n.suggestedLength = r, r <= 2 * e) || s || !t || i.get("Accept-Ranges") !== "bytes" || (i.get("Content-Encoding") || "identity") !== "identity" || (n.allowRangeRequests = !0), n;
}
function Ud(i) {
  const t = i.get("Content-Disposition");
  if (t) {
    let e = (function(n) {
      let r = !0, o = h("filename\\*", "i").exec(n);
      if (o) {
        o = o[1];
        let v = d(o);
        return v = unescape(v), v = p(v), v = f(v), c(v);
      }
      if (o = (function(m) {
        const b = [];
        let w;
        const A = h("filename\\*((?!0\\d)\\d+)(\\*?)", "ig");
        for (; (w = A.exec(m)) !== null; ) {
          let [, x, S, M] = w;
          if (x = parseInt(x, 10), x in b) {
            if (x === 0) break;
          } else b[x] = [S, M];
        }
        const y = [];
        for (let x = 0; x < b.length && x in b; ++x) {
          let [S, M] = b[x];
          M = d(M), S && (M = unescape(M), x === 0 && (M = p(M))), y.push(M);
        }
        return y.join("");
      })(n), o) return c(f(o));
      if (o = h("filename", "i").exec(n), o) {
        o = o[1];
        let v = d(o);
        return v = f(v), c(v);
      }
      function h(v, m) {
        return new RegExp("(?:^|;)\\s*" + v + '\\s*=\\s*([^";\\s][^;\\s]*|"(?:[^"\\\\]|\\\\"?)+"?)', m);
      }
      function l(v, m) {
        if (v) {
          if (!/^[\x00-\xFF]+$/.test(m)) return m;
          try {
            const b = new TextDecoder(v, { fatal: !0 }), w = uo(m);
            m = b.decode(w), r = !1;
          } catch {
          }
        }
        return m;
      }
      function c(v) {
        return r && /[\x80-\xff]/.test(v) && (v = l("utf-8", v), r && (v = l("iso-8859-1", v))), v;
      }
      function d(v) {
        if (v.startsWith('"')) {
          const m = v.slice(1).split('\\"');
          for (let b = 0; b < m.length; ++b) {
            const w = m[b].indexOf('"');
            w !== -1 && (m[b] = m[b].slice(0, w), m.length = b + 1), m[b] = m[b].replaceAll(/\\(.)/g, "$1");
          }
          v = m.join('"');
        }
        return v;
      }
      function p(v) {
        const m = v.indexOf("'");
        return m === -1 ? v : l(v.slice(0, m), v.slice(m + 1).replace(/^[^']*'/, ""));
      }
      function f(v) {
        return !v.startsWith("=?") || /[\x00-\x19\x80-\xff]/.test(v) ? v : v.replaceAll(/=\?([\w-]*)\?([QqBb])\?((?:[^?]|\?(?!=))*)\?=/g, (function(m, b, w, A) {
          if (w === "q" || w === "Q") return l(b, A = (A = A.replaceAll("_", " ")).replaceAll(/=([0-9a-fA-F]{2})/g, (function(y, x) {
            return String.fromCharCode(parseInt(x, 16));
          })));
          try {
            A = atob(A);
          } catch {
          }
          return l(b, A);
        }));
      }
      return "";
    })(t);
    if (e.includes("%")) try {
      e = decodeURIComponent(e);
    } catch {
    }
    if (Nl(e)) return e;
  }
  return null;
}
function mo(i, t) {
  return i === 404 || i === 0 && t.startsWith("file:") ? new pa('Missing PDF "' + t + '".') : new Xr(`Unexpected server response (${i}) while retrieving PDF "${t}".`, i);
}
function qd(i) {
  return i === 200 || i === 206;
}
function Xd(i, t, e) {
  return {
    method: "GET",
    headers: i,
    signal: e.signal,
    mode: "cors",
    credentials: t ? "include" : "same-origin",
    redirect: "follow"
  };
}
function Yd(i) {
  return i instanceof Uint8Array ? i.buffer : i instanceof ArrayBuffer ? i : (B(`getArrayBuffer - unexpected data format: ${i}`), new Uint8Array(i).buffer);
}
var Ic = class {
  constructor(i) {
    L(this, "_responseOrigin", null), this.source = i, this.isHttp = /^https?:/i.test(i.url), this.headers = jd(this.isHttp, i.httpHeaders), this._fullRequestReader = null, this._rangeRequestReaders = [];
  }
  get _progressiveDataLength() {
    return this._fullRequestReader?._loaded ?? 0;
  }
  getFullReader() {
    return ut(!this._fullRequestReader, "PDFFetchStream.getFullReader can only be called once."), this._fullRequestReader = new wg(this), this._fullRequestReader;
  }
  getRangeReader(i, t) {
    if (t <= this._progressiveDataLength) return null;
    const e = new Ag(this, i, t);
    return this._rangeRequestReaders.push(e), e;
  }
  cancelAllRequests(i) {
    this._fullRequestReader?.cancel(i);
    for (const t of this._rangeRequestReaders.slice(0)) t.cancel(i);
  }
}, wg = class {
  constructor(i) {
    this._stream = i, this._reader = null, this._loaded = 0, this._filename = null;
    const t = i.source;
    this._withCredentials = t.withCredentials || !1, this._contentLength = t.length, this._headersCapability = Promise.withResolvers(), this._disableRange = t.disableRange || !1, this._rangeChunkSize = t.rangeChunkSize, this._rangeChunkSize || this._disableRange || (this._disableRange = !0), this._abortController = new AbortController(), this._isStreamingSupported = !t.disableStream, this._isRangeSupported = !t.disableRange;
    const e = new Headers(i.headers), s = t.url;
    fetch(s, Xd(e, this._withCredentials, this._abortController)).then(((n) => {
      if (i._responseOrigin = fo(n.url), !qd(n.status)) throw mo(n.status, s);
      this._reader = n.body.getReader(), this._headersCapability.resolve();
      const r = n.headers, { allowRangeRequests: o, suggestedLength: h } = Vd({
        responseHeaders: r,
        isHttp: i.isHttp,
        rangeChunkSize: this._rangeChunkSize,
        disableRange: this._disableRange
      });
      this._isRangeSupported = o, this._contentLength = h || this._contentLength, this._filename = Ud(r), !this._isStreamingSupported && this._isRangeSupported && this.cancel(new Ei("Streaming is disabled."));
    })).catch(this._headersCapability.reject), this.onProgress = null;
  }
  get headersReady() {
    return this._headersCapability.promise;
  }
  get filename() {
    return this._filename;
  }
  get contentLength() {
    return this._contentLength;
  }
  get isRangeSupported() {
    return this._isRangeSupported;
  }
  get isStreamingSupported() {
    return this._isStreamingSupported;
  }
  async read() {
    await this._headersCapability.promise;
    const { value: i, done: t } = await this._reader.read();
    return t ? {
      value: i,
      done: t
    } : (this._loaded += i.byteLength, this.onProgress?.({
      loaded: this._loaded,
      total: this._contentLength
    }), {
      value: Yd(i),
      done: !1
    });
  }
  cancel(i) {
    this._reader?.cancel(i), this._abortController.abort();
  }
}, Ag = class {
  constructor(i, t, e) {
    this._stream = i, this._reader = null, this._loaded = 0;
    const s = i.source;
    this._withCredentials = s.withCredentials || !1, this._readCapability = Promise.withResolvers(), this._isStreamingSupported = !s.disableStream, this._abortController = new AbortController();
    const n = new Headers(i.headers);
    n.append("Range", `bytes=${t}-${e - 1}`);
    const r = s.url;
    fetch(r, Xd(n, this._withCredentials, this._abortController)).then(((o) => {
      const h = fo(o.url);
      if (h !== i._responseOrigin) throw new Error(`Expected range response-origin "${h}" to match "${i._responseOrigin}".`);
      if (!qd(o.status)) throw mo(o.status, r);
      this._readCapability.resolve(), this._reader = o.body.getReader();
    })).catch(this._readCapability.reject), this.onProgress = null;
  }
  get isStreamingSupported() {
    return this._isStreamingSupported;
  }
  async read() {
    await this._readCapability.promise;
    const { value: i, done: t } = await this._reader.read();
    return t ? {
      value: i,
      done: t
    } : (this._loaded += i.byteLength, this.onProgress?.({ loaded: this._loaded }), {
      value: Yd(i),
      done: !1
    });
  }
  cancel(i) {
    this._reader?.cancel(i), this._abortController.abort();
  }
}, yg = class {
  constructor({ url: i, httpHeaders: t, withCredentials: e }) {
    L(this, "_responseOrigin", null), this.url = i, this.isHttp = /^https?:/i.test(i), this.headers = jd(this.isHttp, t), this.withCredentials = e || !1, this.currXhrId = 0, this.pendingRequests = /* @__PURE__ */ Object.create(null);
  }
  request(i) {
    const t = new XMLHttpRequest(), e = this.currXhrId++, s = this.pendingRequests[e] = { xhr: t };
    t.open("GET", this.url), t.withCredentials = this.withCredentials;
    for (const [n, r] of this.headers) t.setRequestHeader(n, r);
    return this.isHttp && "begin" in i && "end" in i ? (t.setRequestHeader("Range", `bytes=${i.begin}-${i.end - 1}`), s.expectedStatus = 206) : s.expectedStatus = 200, t.responseType = "arraybuffer", ut(i.onError, "Expected `onError` callback to be provided."), t.onerror = () => {
      i.onError(t.status);
    }, t.onreadystatechange = this.onStateChange.bind(this, e), t.onprogress = this.onProgress.bind(this, e), s.onHeadersReceived = i.onHeadersReceived, s.onDone = i.onDone, s.onError = i.onError, s.onProgress = i.onProgress, t.send(null), e;
  }
  onProgress(i, t) {
    const e = this.pendingRequests[i];
    e && e.onProgress?.(t);
  }
  onStateChange(i, t) {
    const e = this.pendingRequests[i];
    if (!e) return;
    const s = e.xhr;
    if (s.readyState >= 2 && e.onHeadersReceived && (e.onHeadersReceived(), delete e.onHeadersReceived), s.readyState !== 4 || !(i in this.pendingRequests)) return;
    if (delete this.pendingRequests[i], s.status === 0 && this.isHttp) {
      e.onError(s.status);
      return;
    }
    const n = s.status || 200;
    if (!(n === 200 && e.expectedStatus === 206) && n !== e.expectedStatus) {
      e.onError(s.status);
      return;
    }
    const r = (function(h) {
      const l = h.response;
      return typeof l != "string" ? l : uo(l).buffer;
    })(s);
    if (n === 206) {
      const o = s.getResponseHeader("Content-Range"), h = /bytes (\d+)-(\d+)\/(\d+)/.exec(o);
      h ? e.onDone({
        begin: parseInt(h[1], 10),
        chunk: r
      }) : (B('Missing or invalid "Content-Range" header.'), e.onError(0));
    } else r ? e.onDone({
      begin: 0,
      chunk: r
    }) : e.onError(s.status);
  }
  getRequestXhr(i) {
    return this.pendingRequests[i].xhr;
  }
  isPendingRequest(i) {
    return i in this.pendingRequests;
  }
  abortRequest(i) {
    const t = this.pendingRequests[i].xhr;
    delete this.pendingRequests[i], t.abort();
  }
}, xg = class {
  constructor(i) {
    this._source = i, this._manager = new yg(i), this._rangeChunkSize = i.rangeChunkSize, this._fullRequestReader = null, this._rangeRequestReaders = [];
  }
  _onRangeRequestReaderClosed(i) {
    const t = this._rangeRequestReaders.indexOf(i);
    t >= 0 && this._rangeRequestReaders.splice(t, 1);
  }
  getFullReader() {
    return ut(!this._fullRequestReader, "PDFNetworkStream.getFullReader can only be called once."), this._fullRequestReader = new Sg(this._manager, this._source), this._fullRequestReader;
  }
  getRangeReader(i, t) {
    const e = new kg(this._manager, i, t);
    return e.onClosed = this._onRangeRequestReaderClosed.bind(this), this._rangeRequestReaders.push(e), e;
  }
  cancelAllRequests(i) {
    this._fullRequestReader?.cancel(i);
    for (const t of this._rangeRequestReaders.slice(0)) t.cancel(i);
  }
}, Sg = class {
  constructor(i, t) {
    this._manager = i, this._url = t.url, this._fullRequestId = i.request({
      onHeadersReceived: this._onHeadersReceived.bind(this),
      onDone: this._onDone.bind(this),
      onError: this._onError.bind(this),
      onProgress: this._onProgress.bind(this)
    }), this._headersCapability = Promise.withResolvers(), this._disableRange = t.disableRange || !1, this._contentLength = t.length, this._rangeChunkSize = t.rangeChunkSize, this._rangeChunkSize || this._disableRange || (this._disableRange = !0), this._isStreamingSupported = !1, this._isRangeSupported = !1, this._cachedChunks = [], this._requests = [], this._done = !1, this._storedError = void 0, this._filename = null, this.onProgress = null;
  }
  _onHeadersReceived() {
    const i = this._fullRequestId, t = this._manager.getRequestXhr(i);
    this._manager._responseOrigin = fo(t.responseURL);
    const e = t.getAllResponseHeaders(), s = new Headers(e ? e.trimStart().replace(/[^\S ]+$/, "").split(/[\r\n]+/).map(((o) => {
      const [h, ...l] = o.split(": ");
      return [h, l.join(": ")];
    })) : []), { allowRangeRequests: n, suggestedLength: r } = Vd({
      responseHeaders: s,
      isHttp: this._manager.isHttp,
      rangeChunkSize: this._rangeChunkSize,
      disableRange: this._disableRange
    });
    n && (this._isRangeSupported = !0), this._contentLength = r || this._contentLength, this._filename = Ud(s), this._isRangeSupported && this._manager.abortRequest(i), this._headersCapability.resolve();
  }
  _onDone(i) {
    if (i && (this._requests.length > 0 ? this._requests.shift().resolve({
      value: i.chunk,
      done: !1
    }) : this._cachedChunks.push(i.chunk)), this._done = !0, !(this._cachedChunks.length > 0)) {
      for (const t of this._requests) t.resolve({
        value: void 0,
        done: !0
      });
      this._requests.length = 0;
    }
  }
  _onError(i) {
    this._storedError = mo(i, this._url), this._headersCapability.reject(this._storedError);
    for (const t of this._requests) t.reject(this._storedError);
    this._requests.length = 0, this._cachedChunks.length = 0;
  }
  _onProgress(i) {
    this.onProgress?.({
      loaded: i.loaded,
      total: i.lengthComputable ? i.total : this._contentLength
    });
  }
  get filename() {
    return this._filename;
  }
  get isRangeSupported() {
    return this._isRangeSupported;
  }
  get isStreamingSupported() {
    return this._isStreamingSupported;
  }
  get contentLength() {
    return this._contentLength;
  }
  get headersReady() {
    return this._headersCapability.promise;
  }
  async read() {
    if (await this._headersCapability.promise, this._storedError) throw this._storedError;
    if (this._cachedChunks.length > 0) return {
      value: this._cachedChunks.shift(),
      done: !1
    };
    if (this._done) return {
      value: void 0,
      done: !0
    };
    const i = Promise.withResolvers();
    return this._requests.push(i), i.promise;
  }
  cancel(i) {
    this._done = !0, this._headersCapability.reject(i);
    for (const t of this._requests) t.resolve({
      value: void 0,
      done: !0
    });
    this._requests.length = 0, this._manager.isPendingRequest(this._fullRequestId) && this._manager.abortRequest(this._fullRequestId), this._fullRequestReader = null;
  }
}, kg = class {
  constructor(i, t, e) {
    this._manager = i, this._url = i.url, this._requestId = i.request({
      begin: t,
      end: e,
      onHeadersReceived: this._onHeadersReceived.bind(this),
      onDone: this._onDone.bind(this),
      onError: this._onError.bind(this),
      onProgress: this._onProgress.bind(this)
    }), this._requests = [], this._queuedChunk = null, this._done = !1, this._storedError = void 0, this.onProgress = null, this.onClosed = null;
  }
  _onHeadersReceived() {
    const i = fo(this._manager.getRequestXhr(this._requestId)?.responseURL);
    i !== this._manager._responseOrigin && (this._storedError = /* @__PURE__ */ new Error(`Expected range response-origin "${i}" to match "${this._manager._responseOrigin}".`), this._onError(0));
  }
  _close() {
    this.onClosed?.(this);
  }
  _onDone(i) {
    const t = i.chunk;
    this._requests.length > 0 ? this._requests.shift().resolve({
      value: t,
      done: !1
    }) : this._queuedChunk = t, this._done = !0;
    for (const e of this._requests) e.resolve({
      value: void 0,
      done: !0
    });
    this._requests.length = 0, this._close();
  }
  _onError(i) {
    this._storedError ?? (this._storedError = mo(i, this._url));
    for (const t of this._requests) t.reject(this._storedError);
    this._requests.length = 0, this._queuedChunk = null;
  }
  _onProgress(i) {
    this.isStreamingSupported || this.onProgress?.({ loaded: i.loaded });
  }
  get isStreamingSupported() {
    return !1;
  }
  async read() {
    if (this._storedError) throw this._storedError;
    if (this._queuedChunk !== null) {
      const t = this._queuedChunk;
      return this._queuedChunk = null, {
        value: t,
        done: !1
      };
    }
    if (this._done) return {
      value: void 0,
      done: !0
    };
    const i = Promise.withResolvers();
    return this._requests.push(i), i.promise;
  }
  cancel(i) {
    this._done = !0;
    for (const t of this._requests) t.resolve({
      value: void 0,
      done: !0
    });
    this._requests.length = 0, this._manager.isPendingRequest(this._requestId) && this._manager.abortRequest(this._requestId), this._close();
  }
}, Mg = /^[a-z][a-z0-9\-+.]+:/i, Eg = class {
  constructor(i) {
    this.source = i, this.url = (function(e) {
      if (Mg.test(e)) return new URL(e);
      const s = process.getBuiltinModule("url");
      return new URL(s.pathToFileURL(e));
    })(i.url), ut(this.url.protocol === "file:", "PDFNodeStream only supports file:// URLs."), this._fullRequestReader = null, this._rangeRequestReaders = [];
  }
  get _progressiveDataLength() {
    return this._fullRequestReader?._loaded ?? 0;
  }
  getFullReader() {
    return ut(!this._fullRequestReader, "PDFNodeStream.getFullReader can only be called once."), this._fullRequestReader = new Cg(this), this._fullRequestReader;
  }
  getRangeReader(i, t) {
    if (t <= this._progressiveDataLength) return null;
    const e = new Pg(this, i, t);
    return this._rangeRequestReaders.push(e), e;
  }
  cancelAllRequests(i) {
    this._fullRequestReader?.cancel(i);
    for (const t of this._rangeRequestReaders.slice(0)) t.cancel(i);
  }
}, Cg = class {
  constructor(i) {
    this._url = i.url, this._done = !1, this._storedError = null, this.onProgress = null;
    const t = i.source;
    this._contentLength = t.length, this._loaded = 0, this._filename = null, this._disableRange = t.disableRange || !1, this._rangeChunkSize = t.rangeChunkSize, this._rangeChunkSize || this._disableRange || (this._disableRange = !0), this._isStreamingSupported = !t.disableStream, this._isRangeSupported = !t.disableRange, this._readableStream = null, this._readCapability = Promise.withResolvers(), this._headersCapability = Promise.withResolvers();
    const e = process.getBuiltinModule("fs");
    e.promises.lstat(this._url).then(((s) => {
      this._contentLength = s.size, this._setReadableStream(e.createReadStream(this._url)), this._headersCapability.resolve();
    }), ((s) => {
      s.code === "ENOENT" && (s = new pa(`Missing PDF "${this._url}".`)), this._storedError = s, this._headersCapability.reject(s);
    }));
  }
  get headersReady() {
    return this._headersCapability.promise;
  }
  get filename() {
    return this._filename;
  }
  get contentLength() {
    return this._contentLength;
  }
  get isRangeSupported() {
    return this._isRangeSupported;
  }
  get isStreamingSupported() {
    return this._isStreamingSupported;
  }
  async read() {
    if (await this._readCapability.promise, this._done) return {
      value: void 0,
      done: !0
    };
    if (this._storedError) throw this._storedError;
    const i = this._readableStream.read();
    return i === null ? (this._readCapability = Promise.withResolvers(), this.read()) : (this._loaded += i.length, this.onProgress?.({
      loaded: this._loaded,
      total: this._contentLength
    }), {
      value: new Uint8Array(i).buffer,
      done: !1
    });
  }
  cancel(i) {
    this._readableStream ? this._readableStream.destroy(i) : this._error(i);
  }
  _error(i) {
    this._storedError = i, this._readCapability.resolve();
  }
  _setReadableStream(i) {
    this._readableStream = i, i.on("readable", (() => {
      this._readCapability.resolve();
    })), i.on("end", (() => {
      i.destroy(), this._done = !0, this._readCapability.resolve();
    })), i.on("error", ((t) => {
      this._error(t);
    })), !this._isStreamingSupported && this._isRangeSupported && this._error(new Ei("streaming is disabled")), this._storedError && this._readableStream.destroy(this._storedError);
  }
}, Pg = class {
  constructor(i, t, e) {
    this._url = i.url, this._done = !1, this._storedError = null, this.onProgress = null, this._loaded = 0, this._readableStream = null, this._readCapability = Promise.withResolvers(), this._isStreamingSupported = !i.source.disableStream;
    const s = process.getBuiltinModule("fs");
    this._setReadableStream(s.createReadStream(this._url, {
      start: t,
      end: e - 1
    }));
  }
  get isStreamingSupported() {
    return this._isStreamingSupported;
  }
  async read() {
    if (await this._readCapability.promise, this._done) return {
      value: void 0,
      done: !0
    };
    if (this._storedError) throw this._storedError;
    const i = this._readableStream.read();
    return i === null ? (this._readCapability = Promise.withResolvers(), this.read()) : (this._loaded += i.length, this.onProgress?.({ loaded: this._loaded }), {
      value: new Uint8Array(i).buffer,
      done: !1
    });
  }
  cancel(i) {
    this._readableStream ? this._readableStream.destroy(i) : this._error(i);
  }
  _error(i) {
    this._storedError = i, this._readCapability.resolve();
  }
  _setReadableStream(i) {
    this._readableStream = i, i.on("readable", (() => {
      this._readCapability.resolve();
    })), i.on("end", (() => {
      i.destroy(), this._done = !0, this._readCapability.resolve();
    })), i.on("error", ((t) => {
      this._error(t);
    })), this._storedError && this._readableStream.destroy(this._storedError);
  }
}, jt = 30, ms = /* @__PURE__ */ new WeakMap(), he = /* @__PURE__ */ new WeakMap(), Jh = /* @__PURE__ */ new WeakMap(), Zh = /* @__PURE__ */ new WeakMap(), Bs = /* @__PURE__ */ new WeakMap(), as = /* @__PURE__ */ new WeakMap(), tl = /* @__PURE__ */ new WeakMap(), el = /* @__PURE__ */ new WeakMap(), mn = /* @__PURE__ */ new WeakMap(), Pr = /* @__PURE__ */ new WeakMap(), Ba = /* @__PURE__ */ new WeakMap(), Hs = /* @__PURE__ */ new WeakMap(), Tr = /* @__PURE__ */ new WeakMap(), il = /* @__PURE__ */ new WeakMap(), Ha = /* @__PURE__ */ new WeakMap(), ia = /* @__PURE__ */ new WeakMap(), sl = /* @__PURE__ */ new WeakMap(), nl = /* @__PURE__ */ new WeakMap(), sa = /* @__PURE__ */ new WeakSet(), Jr = class zi {
  constructor({ textContentSource: t, container: e, viewport: s }) {
    if (G(this, sa), _(this, ms, Promise.withResolvers()), _(this, he, null), _(this, Jh, !1), _(this, Zh, !!globalThis.FontInspector?.enabled), _(this, Bs, null), _(this, as, null), _(this, tl, 0), _(this, el, 0), _(this, mn, null), _(this, Pr, null), _(this, Ba, 0), _(this, Hs, 0), _(this, Tr, /* @__PURE__ */ Object.create(null)), _(this, il, []), _(this, Ha, null), _(this, ia, []), _(this, sl, /* @__PURE__ */ new WeakMap()), _(this, nl, null), t instanceof ReadableStream) u(Ha, this, t);
    else {
      if (typeof t != "object") throw new Error('No "textContentSource" parameter specified.');
      u(Ha, this, new ReadableStream({ start(l) {
        l.enqueue(t), l.close();
      } }));
    }
    u(he, this, u(Pr, this, e)), u(Hs, this, s.scale * (globalThis.devicePixelRatio || 1)), u(Ba, this, s.rotation), u(as, this, {
      div: null,
      properties: null,
      ctx: null
    });
    const { pageWidth: n, pageHeight: r, pageX: o, pageY: h } = s.rawDims;
    u(nl, this, [
      1,
      0,
      0,
      -1,
      -o,
      h + r
    ]), u(el, this, n), u(tl, this, r), Dg.call(zi), os(e, s), a(ms, this).promise.finally((() => {
      Yo._.delete(this), u(as, this, null), u(Tr, this, null);
    })).catch((() => {
    }));
  }
  static get fontFamilyMap() {
    const { isWindows: t, isFirefox: e } = Gt.platform;
    return $(this, "fontFamilyMap", /* @__PURE__ */ new Map([["sans-serif", (t && e ? "Calibri, " : "") + "sans-serif"], ["monospace", (t && e ? "Lucida Console, " : "") + "monospace"]]));
  }
  render() {
    const t = () => {
      a(mn, this).read().then((({ value: e, done: s }) => {
        s ? a(ms, this).resolve() : (a(Bs, this) ?? u(Bs, this, e.lang), Object.assign(a(Tr, this), e.styles), g(sa, this, Tg).call(this, e.items), t());
      }), a(ms, this).reject);
    };
    return u(mn, this, a(Ha, this).getReader()), Yo._.add(this), t(), a(ms, this).promise;
  }
  update({ viewport: t, onBefore: e = null }) {
    const s = t.scale * (globalThis.devicePixelRatio || 1), n = t.rotation;
    if (n !== a(Ba, this) && (e?.(), u(Ba, this, n), os(a(Pr, this), { rotation: n })), s !== a(Hs, this)) {
      e?.(), u(Hs, this, s);
      const r = {
        div: null,
        properties: null,
        ctx: jl.call(zi, a(Bs, this))
      };
      for (const o of a(ia, this))
        r.properties = a(sl, this).get(o), r.div = o, g(sa, this, Kd).call(this, r);
    }
  }
  cancel() {
    const t = new Ei("TextLayer task cancelled.");
    a(mn, this)?.cancel(t).catch((() => {
    })), u(mn, this, null), a(ms, this).reject(t);
  }
  get textDivs() {
    return a(ia, this);
  }
  get textContentItemsStr() {
    return a(il, this);
  }
  static cleanup() {
    if (!(g(zi, this, Yo)._.size > 0)) {
      g(zi, this, Rr)._.clear();
      for (const { canvas: t } of g(zi, this, Zr)._.values()) t.remove();
      g(zi, this, Zr)._.clear();
    }
  }
};
It = Jr;
function Tg(i) {
  var t;
  if (a(Jh, this)) return;
  (t = a(as, this)).ctx ?? (t.ctx = jl.call(It, a(Bs, this)));
  const e = a(ia, this), s = a(il, this);
  for (const n of i) {
    if (e.length > 1e5) {
      B("Ignoring additional textDivs for performance reasons."), u(Jh, this, !0);
      return;
    }
    if (n.str !== void 0)
      s.push(n.str), g(sa, this, Rg).call(this, n);
    else if (n.type === "beginMarkedContentProps" || n.type === "beginMarkedContent") {
      const r = a(he, this);
      u(he, this, document.createElement("span")), a(he, this).classList.add("markedContent"), n.id !== null && a(he, this).setAttribute("id", `${n.id}`), r.append(a(he, this));
    } else n.type === "endMarkedContent" && u(he, this, a(he, this).parentNode);
  }
}
function Rg(i) {
  const t = document.createElement("span"), e = {
    angle: 0,
    canvasWidth: 0,
    hasText: i.str !== "",
    hasEOL: i.hasEOL,
    fontSize: 0
  };
  a(ia, this).push(t);
  const s = C.transform(a(nl, this), i.transform);
  let n = Math.atan2(s[1], s[0]);
  const r = a(Tr, this)[i.fontName];
  r.vertical && (n += Math.PI / 2);
  let o = a(Zh, this) && r.fontSubstitution || r.fontFamily;
  o = It.fontFamilyMap.get(o) || o;
  const h = Math.hypot(s[2], s[3]), l = h * Ig.call(It, o, a(Bs, this));
  let c, d;
  n === 0 ? (c = s[4], d = s[5] - l) : (c = s[4] + l * Math.sin(n), d = s[5] - l * Math.cos(n));
  const p = "calc(var(--scale-factor)*", f = t.style;
  a(he, this) === a(Pr, this) ? (f.left = `${(100 * c / a(el, this)).toFixed(2)}%`, f.top = `${(100 * d / a(tl, this)).toFixed(2)}%`) : (f.left = `${p}${c.toFixed(2)}px)`, f.top = `${p}${d.toFixed(2)}px)`), f.fontSize = `${p}${(fa._ * h).toFixed(2)}px)`, f.fontFamily = o, e.fontSize = h, t.setAttribute("role", "presentation"), t.textContent = i.str, t.dir = i.dir, a(Zh, this) && (t.dataset.fontName = r.fontSubstitutionLoadedName || i.fontName), n !== 0 && (e.angle = n * (180 / Math.PI));
  let v = !1;
  if (i.str.length > 1) v = !0;
  else if (i.str !== " " && i.transform[0] !== i.transform[3]) {
    const m = Math.abs(i.transform[0]), b = Math.abs(i.transform[3]);
    m !== b && Math.max(m, b) / Math.min(m, b) > 1.5 && (v = !0);
  }
  if (v && (e.canvasWidth = r.vertical ? i.height : i.width), a(sl, this).set(t, e), a(as, this).div = t, a(as, this).properties = e, g(sa, this, Kd).call(this, a(as, this)), e.hasText && a(he, this).append(t), e.hasEOL) {
    const m = document.createElement("br");
    m.setAttribute("role", "presentation"), a(he, this).append(m);
  }
}
function Kd(i) {
  const { div: t, properties: e, ctx: s } = i, { style: n } = t;
  let r = "";
  if (fa._ > 1 && (r = `scale(${1 / fa._})`), e.canvasWidth !== 0 && e.hasText) {
    const { fontFamily: o } = n, { canvasWidth: h, fontSize: l } = e;
    Qd.call(It, s, l * a(Hs, this), o);
    const { width: c } = s.measureText(t.textContent);
    c > 0 && (r = `scaleX(${h * a(Hs, this) / c}) ${r}`);
  }
  e.angle !== 0 && (r = `rotate(${e.angle}deg) ${r}`), r.length > 0 && (n.transform = r);
}
function jl(i = null) {
  let t = g(It, this, Zr)._.get(i || (i = ""));
  if (!t) {
    const e = document.createElement("canvas");
    e.className = "hiddenCanvasElement", e.lang = i, document.body.append(e), t = e.getContext("2d", {
      alpha: !1,
      willReadFrequently: !0
    }), g(It, this, Zr)._.set(i, t), g(It, this, Jd)._.set(t, {
      size: 0,
      family: ""
    });
  }
  return t;
}
function Qd(i, t, e) {
  const s = g(It, this, Jd)._.get(i);
  (t !== s.size || e !== s.family) && (i.font = `${t}px ${e}`, s.size = t, s.family = e);
}
function Dg() {
  if (g(It, this, fa)._ !== null) return;
  const i = document.createElement("div");
  i.style.opacity = 0, i.style.lineHeight = 1, i.style.fontSize = "1px", i.style.position = "absolute", i.textContent = "X", document.body.append(i), fa._ = g(It, this, i.getBoundingClientRect().height), i.remove();
}
function Ig(i, t) {
  const e = g(It, this, Rr)._.get(i);
  if (e) return e;
  const s = g(It, this, jl).call(this, t);
  s.canvas.width = s.canvas.height = jt, g(It, this, Qd).call(this, s, jt, i);
  const n = s.measureText("");
  let r = n.fontBoundingBoxAscent, o = Math.abs(n.fontBoundingBoxDescent);
  if (r) {
    const c = r / (r + o);
    return g(It, this, Rr)._.set(i, c), s.canvas.width = s.canvas.height = 0, c;
  }
  s.strokeStyle = "red", s.clearRect(0, 0, jt, jt), s.strokeText("g", 0, 0);
  let h = s.getImageData(0, 0, jt, jt).data;
  o = 0;
  for (let c = h.length - 1 - 3; c >= 0; c -= 4) if (h[c] > 0) {
    o = Math.ceil(c / 4 / jt);
    break;
  }
  s.clearRect(0, 0, jt, jt), s.strokeText("A", 0, jt), h = s.getImageData(0, 0, jt, jt).data, r = 0;
  for (let c = 0, d = h.length; c < d; c += 4) if (h[c] > 0) {
    r = jt - Math.floor(c / 4 / jt);
    break;
  }
  s.canvas.width = s.canvas.height = 0;
  const l = r ? r / (r + o) : 0.8;
  return g(It, this, Rr)._.set(i, l), l;
}
var Rr = { _: /* @__PURE__ */ new Map() }, Zr = { _: /* @__PURE__ */ new Map() }, Jd = { _: /* @__PURE__ */ new WeakMap() }, fa = { _: null }, Yo = { _: /* @__PURE__ */ new Set() }, al = class Zd {
  static textContent(t) {
    const e = [], s = {
      items: e,
      styles: /* @__PURE__ */ Object.create(null)
    };
    return (function n(r) {
      if (!r) return;
      let o = null;
      const h = r.name;
      if (h === "#text") o = r.value;
      else {
        if (!Zd.shouldBuildText(h)) return;
        r?.attributes?.textContent ? o = r.attributes.textContent : r.value && (o = r.value);
      }
      if (o !== null && e.push({ str: o }), r.children) for (const l of r.children) n(l);
    })(t), s;
  }
  static shouldBuildText(t) {
    return !(t === "textarea" || t === "input" || t === "option" || t === "select");
  }
}, Lg = 65536, Fg = Dt ? class extends Ac {
  _createCanvas(t, e) {
    return process.getBuiltinModule("module").createRequire(import.meta.url)("@napi-rs/canvas").createCanvas(t, e);
  }
} : class extends Ac {
  constructor({ ownerDocument: t = globalThis.document, enableHWA: e = !1 }) {
    super({ enableHWA: e }), this._document = t;
  }
  _createCanvas(t, e) {
    const s = this._document.createElement("canvas");
    return s.width = t, s.height = e, s;
  }
}, Ng = Dt ? class extends Fd {
  async _fetch(t) {
    return Bd(t);
  }
} : Nd, Og = Dt ? class extends yc {
} : (Ns = /* @__PURE__ */ new WeakMap(), Os = /* @__PURE__ */ new WeakMap(), ki = /* @__PURE__ */ new WeakMap(), ni = /* @__PURE__ */ new WeakMap(), zt = /* @__PURE__ */ new WeakMap(), Ui = /* @__PURE__ */ new WeakMap(), Oe = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakSet(), class extends yc {
  constructor({ docId: t, ownerDocument: e = globalThis.document }) {
    super(), G(this, R), _(this, Ns, void 0), _(this, Os, void 0), _(this, ki, void 0), _(this, ni, void 0), _(this, zt, void 0), _(this, Ui, void 0), _(this, Oe, 0), u(ni, this, t), u(zt, this, e);
  }
  addFilter(t) {
    var e, s;
    if (!t) return "none";
    let n = Ft.call(g(R, this)).get(t);
    if (n) return n;
    const [r, o, h] = g(R, this, Ko).call(this, t), l = t.length === 1 ? r : `${r}${o}${h}`;
    if (n = Ft.call(g(R, this)).get(l), n)
      return Ft.call(g(R, this)).set(t, n), n;
    const c = `g_${a(ni, this)}_transfer_map_${u(Oe, this, (e = a(Oe, this), s = e++, e)), s}`, d = g(R, this, vn).call(this, c);
    Ft.call(g(R, this)).set(t, d), Ft.call(g(R, this)).set(l, d);
    const p = g(R, this, _n).call(this, c);
    return g(R, this, za).call(this, r, o, h, p), d;
  }
  addHCMFilter(t, e) {
    const s = `${t}-${e}`, n = "base";
    let r = $a.call(g(R, this)).get(n);
    if (r?.key === s || (r ? (r.filter?.remove(), r.key = s, r.url = "none", r.filter = null) : (r = {
      key: s,
      url: "none",
      filter: null
    }, $a.call(g(R, this)).set(n, r)), !t || !e)) return r.url;
    const o = g(R, this, Ga).call(this, t);
    t = C.makeHexColor(...o);
    const h = g(R, this, Ga).call(this, e);
    if (e = C.makeHexColor(...h), ma.call(g(R, this)).style.color = "", t === "#000000" && e === "#ffffff" || t === e) return r.url;
    const l = new Array(256);
    for (let v = 0; v <= 255; v++) {
      const m = v / 255;
      l[v] = m <= 0.03928 ? m / 12.92 : ((m + 0.055) / 1.055) ** 2.4;
    }
    const c = l.join(","), d = `g_${a(ni, this)}_hcm_filter`, p = r.filter = g(R, this, _n).call(this, d);
    g(R, this, za).call(this, c, c, c, p), g(R, this, Lc).call(this, p);
    const f = (v, m) => {
      const b = o[v] / 255, w = h[v] / 255, A = new Array(m + 1);
      for (let y = 0; y <= m; y++) A[y] = b + y / m * (w - b);
      return A.join(",");
    };
    return g(R, this, za).call(this, f(0, 5), f(1, 5), f(2, 5), p), r.url = g(R, this, vn).call(this, d), r.url;
  }
  addAlphaFilter(t) {
    var e, s;
    let n = Ft.call(g(R, this)).get(t);
    if (n) return n;
    const [r] = g(R, this, Ko).call(this, [t]), o = `alpha_${r}`;
    if (n = Ft.call(g(R, this)).get(o), n)
      return Ft.call(g(R, this)).set(t, n), n;
    const h = `g_${a(ni, this)}_alpha_map_${u(Oe, this, (e = a(Oe, this), s = e++, e)), s}`, l = g(R, this, vn).call(this, h);
    Ft.call(g(R, this)).set(t, l), Ft.call(g(R, this)).set(o, l);
    const c = g(R, this, _n).call(this, h);
    return g(R, this, Fc).call(this, r, c), l;
  }
  addLuminosityFilter(t) {
    var e, s;
    let n, r, o = Ft.call(g(R, this)).get(t || "luminosity");
    if (o) return o;
    if (t ? ([n] = g(R, this, Ko).call(this, [t]), r = `luminosity_${n}`) : r = "luminosity", o = Ft.call(g(R, this)).get(r), o)
      return Ft.call(g(R, this)).set(t, o), o;
    const h = `g_${a(ni, this)}_luminosity_map_${u(Oe, this, (e = a(Oe, this), s = e++, e)), s}`, l = g(R, this, vn).call(this, h);
    Ft.call(g(R, this)).set(t, l), Ft.call(g(R, this)).set(r, l);
    const c = g(R, this, _n).call(this, h);
    return g(R, this, Bg).call(this, c), t && g(R, this, Fc).call(this, n, c), l;
  }
  addHighlightHCMFilter(t, e, s, n, r) {
    const o = `${e}-${s}-${n}-${r}`;
    let h = $a.call(g(R, this)).get(t);
    if (h?.key === o || (h ? (h.filter?.remove(), h.key = o, h.url = "none", h.filter = null) : (h = {
      key: o,
      url: "none",
      filter: null
    }, $a.call(g(R, this)).set(t, h)), !e || !s)) return h.url;
    const [l, c] = [e, s].map(g(R, this, Ga).bind(this));
    let d = Math.round(0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]), p = Math.round(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]), [f, v] = [n, r].map(g(R, this, Ga).bind(this));
    p < d && ([d, p, f, v] = [
      p,
      d,
      v,
      f
    ]), ma.call(g(R, this)).style.color = "";
    const m = (A, y, x) => {
      const S = new Array(256), M = (p - d) / x, P = A / 255, k = (y - A) / (255 * x);
      let F = 0;
      for (let H = 0; H <= x; H++) {
        const j = Math.round(d + H * M), z = P + H * k;
        for (let Y = F; Y <= j; Y++) S[Y] = z;
        F = j + 1;
      }
      for (let H = F; H < 256; H++) S[H] = S[F - 1];
      return S.join(",");
    }, b = `g_${a(ni, this)}_hcm_${t}_filter`, w = h.filter = g(R, this, _n).call(this, b);
    return g(R, this, Lc).call(this, w), g(R, this, za).call(this, m(f[0], v[0], 5), m(f[1], v[1], 5), m(f[2], v[2], 5), w), h.url = g(R, this, vn).call(this, b), h.url;
  }
  destroy(t = !1) {
    (!t || !a(Ui, this)?.size) && (a(ki, this)?.parentNode.parentNode.remove(), u(ki, this, null), a(Os, this)?.clear(), u(Os, this, null), a(Ui, this)?.clear(), u(Ui, this, null), u(Oe, this, 0));
  }
}), Wg = Dt ? class extends Od {
  async _fetch(t) {
    return Bd(t);
  }
} : Wd;
function Ft() {
  return a(Os, this) || u(Os, this, /* @__PURE__ */ new Map());
}
function $a() {
  return a(Ui, this) || u(Ui, this, /* @__PURE__ */ new Map());
}
function ma() {
  if (!a(ki, this)) {
    const i = a(zt, this).createElement("div"), { style: t } = i;
    t.visibility = "hidden", t.contain = "strict", t.width = t.height = 0, t.position = "absolute", t.top = t.left = 0, t.zIndex = -1;
    const e = a(zt, this).createElementNS(ii, "svg");
    e.setAttribute("width", 0), e.setAttribute("height", 0), u(ki, this, a(zt, this).createElementNS(ii, "defs")), i.append(e), e.append(a(ki, this)), a(zt, this).body.append(i);
  }
  return a(ki, this);
}
function Ko(i) {
  if (i.length === 1) {
    const h = i[0], l = new Array(256);
    for (let d = 0; d < 256; d++) l[d] = h[d] / 255;
    const c = l.join(",");
    return [
      c,
      c,
      c
    ];
  }
  const [t, e, s] = i, n = new Array(256), r = new Array(256), o = new Array(256);
  for (let h = 0; h < 256; h++)
    n[h] = t[h] / 255, r[h] = e[h] / 255, o[h] = s[h] / 255;
  return [
    n.join(","),
    r.join(","),
    o.join(",")
  ];
}
function vn(i) {
  if (a(Ns, this) === void 0) {
    u(Ns, this, "");
    const t = a(zt, this).URL;
    t !== a(zt, this).baseURI && (go(t) ? B('#createUrl: ignore "data:"-URL for performance reasons.') : u(Ns, this, t.split("#", 1)[0]));
  }
  return `url(${a(Ns, this)}#${i})`;
}
function Bg(i) {
  const t = a(zt, this).createElementNS(ii, "feColorMatrix");
  t.setAttribute("type", "matrix"), t.setAttribute("values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0.59 0.11 0 0"), i.append(t);
}
function Lc(i) {
  const t = a(zt, this).createElementNS(ii, "feColorMatrix");
  t.setAttribute("type", "matrix"), t.setAttribute("values", "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"), i.append(t);
}
function _n(i) {
  const t = a(zt, this).createElementNS(ii, "filter");
  return t.setAttribute("color-interpolation-filters", "sRGB"), t.setAttribute("id", i), ma.call(g(R, this)).append(t), t;
}
function Dr(i, t, e) {
  const s = a(zt, this).createElementNS(ii, t);
  s.setAttribute("type", "discrete"), s.setAttribute("tableValues", e), i.append(s);
}
function za(i, t, e, s) {
  const n = a(zt, this).createElementNS(ii, "feComponentTransfer");
  s.append(n), g(R, this, Dr).call(this, n, "feFuncR", i), g(R, this, Dr).call(this, n, "feFuncG", t), g(R, this, Dr).call(this, n, "feFuncB", e);
}
function Fc(i, t) {
  const e = a(zt, this).createElementNS(ii, "feComponentTransfer");
  t.append(e), g(R, this, Dr).call(this, e, "feFuncA", i);
}
function Ga(i) {
  return ma.call(g(R, this)).style.color = i, Rh(getComputedStyle(ma.call(g(R, this))).getPropertyValue("color"));
}
function Hg(i = {}) {
  typeof i == "string" || i instanceof URL ? i = { url: i } : (i instanceof ArrayBuffer || ArrayBuffer.isView(i)) && (i = { data: i });
  const t = new $g(), { docId: e } = t, s = i.url ? (function(J) {
    if (J instanceof URL) return J.href;
    try {
      return new URL(J, window.location).href;
    } catch {
      if (Dt && typeof J == "string") return J;
    }
    throw new Error("Invalid PDF url data: either string or URL-object is expected in the url property.");
  })(i.url) : null, n = i.data ? (function(J) {
    if (Dt && typeof Buffer < "u" && J instanceof Buffer) throw new Error("Please provide binary data as `Uint8Array`, rather than `Buffer`.");
    if (J instanceof Uint8Array && J.byteLength === J.buffer.byteLength) return J;
    if (typeof J == "string") return uo(J);
    if (J instanceof ArrayBuffer || ArrayBuffer.isView(J) || typeof J == "object" && !isNaN(J?.length)) return new Uint8Array(J);
    throw new Error("Invalid PDF binary data: either TypedArray, string, or array-like object is expected in the data property.");
  })(i.data) : null, r = i.httpHeaders || null, o = i.withCredentials === !0, h = i.password ?? null, l = i.range instanceof tu ? i.range : null, c = Number.isInteger(i.rangeChunkSize) && i.rangeChunkSize > 0 ? i.rangeChunkSize : Lg;
  let d = i.worker instanceof na ? i.worker : null;
  const p = i.verbosity, f = typeof i.docBaseUrl != "string" || go(i.docBaseUrl) ? null : i.docBaseUrl, v = typeof i.cMapUrl == "string" ? i.cMapUrl : null, m = i.cMapPacked !== !1, b = i.CMapReaderFactory || Ng, w = typeof i.standardFontDataUrl == "string" ? i.standardFontDataUrl : null, A = i.StandardFontDataFactory || Wg, y = i.stopAtErrors !== !0, x = Number.isInteger(i.maxImageSize) && i.maxImageSize > -1 ? i.maxImageSize : -1, S = i.isEvalSupported !== !1, M = typeof i.isOffscreenCanvasSupported == "boolean" ? i.isOffscreenCanvasSupported : !Dt, P = typeof i.isImageDecoderSupported == "boolean" ? i.isImageDecoderSupported : !Dt && (Gt.platform.isFirefox || !globalThis.chrome), k = Number.isInteger(i.canvasMaxAreaInBytes) ? i.canvasMaxAreaInBytes : -1, F = typeof i.disableFontFace == "boolean" ? i.disableFontFace : Dt, H = i.fontExtraProperties === !0, j = i.enableXfa === !0, z = i.ownerDocument || globalThis.document, Y = i.disableRange === !0, pt = i.disableStream === !0, X = i.disableAutoFetch === !0, ot = i.pdfBug === !0, I = i.CanvasFactory || Fg, O = i.FilterFactory || Og, Qt = i.enableHWA === !0, se = l ? l.length : i.length ?? NaN, Ri = typeof i.useSystemFonts == "boolean" ? i.useSystemFonts : !Dt && !F, Ne = typeof i.useWorkerFetch == "boolean" ? i.useWorkerFetch : b === Nd && A === Wd && v && w && On(v, document.baseURI) && On(w, document.baseURI);
  lp(p);
  const Lt = {
    canvasFactory: new I({
      ownerDocument: z,
      enableHWA: Qt
    }),
    filterFactory: new O({
      docId: e,
      ownerDocument: z
    }),
    cMapReaderFactory: Ne ? null : new b({
      baseUrl: v,
      isCompressed: m
    }),
    standardFontDataFactory: Ne ? null : new A({ baseUrl: w })
  };
  if (!d) {
    const Jt = {
      verbosity: p,
      port: Js.workerPort
    };
    d = Jt.port ? na.fromPort(Jt) : new na(Jt), t._worker = d;
  }
  const At = {
    docId: e,
    apiVersion: "4.10.38",
    data: n,
    password: h,
    disableAutoFetch: X,
    rangeChunkSize: c,
    length: se,
    docBaseUrl: f,
    enableXfa: j,
    evaluatorOptions: {
      maxImageSize: x,
      disableFontFace: F,
      ignoreErrors: y,
      isEvalSupported: S,
      isOffscreenCanvasSupported: M,
      isImageDecoderSupported: P,
      canvasMaxAreaInBytes: k,
      fontExtraProperties: H,
      useSystemFonts: Ri,
      cMapUrl: Ne ? v : null,
      standardFontDataUrl: Ne ? w : null
    }
  }, si = {
    disableFontFace: F,
    fontExtraProperties: H,
    ownerDocument: z,
    pdfBug: ot,
    styleElement: null,
    loadingParams: {
      disableAutoFetch: X,
      enableXfa: j
    }
  };
  return d.promise.then((function() {
    if (t.destroyed) throw new Error("Loading aborted");
    if (d.destroyed) throw new Error("Worker was destroyed");
    const Jt = d.messageHandler.sendWithPromise("GetDocRequest", At, n ? [n.buffer] : null);
    let J;
    if (l) J = new vg(l, {
      disableRange: Y,
      disableStream: pt
    });
    else if (!n) {
      if (!s) throw new Error("getDocument - no `url` parameter provided.");
      let ht;
      if (Dt) if (On(s)) {
        if (typeof fetch > "u" || typeof Response > "u" || !("body" in Response.prototype)) throw new Error("getDocument - the Fetch API was disabled in Node.js, see `--no-experimental-fetch`.");
        ht = Ic;
      } else ht = Eg;
      else ht = On(s) ? Ic : xg;
      J = new ht({
        url: s,
        length: se,
        httpHeaders: r,
        withCredentials: o,
        rangeChunkSize: c,
        disableRange: Y,
        disableStream: pt
      });
    }
    return Jt.then(((ht) => {
      if (t.destroyed) throw new Error("Loading aborted");
      if (d.destroyed) throw new Error("Worker was destroyed");
      const Kl = new Hn(e, ht, d.port);
      t._transport = new Vg(Kl, t, J, si, Lt), Kl.send("Ready", null);
    }));
  })).catch(t._capability.reject), t;
}
function Nc(i) {
  return typeof i == "object" && Number.isInteger(i?.num) && i.num >= 0 && Number.isInteger(i?.gen) && i.gen >= 0;
}
var $g = class {
  constructor() {
    var i, t;
    this._capability = Promise.withResolvers(), this._transport = null, this._worker = null, this.docId = "d" + (Oc._ = (i = Oc._, t = i++, i), t), this.destroyed = !1, this.onPassword = null, this.onProgress = null;
  }
  get promise() {
    return this._capability.promise;
  }
  async destroy() {
    this.destroyed = !0;
    try {
      this._worker?.port && (this._worker._pendingDestroy = !0), await this._transport?.destroy();
    } catch (i) {
      throw this._worker?.port && delete this._worker._pendingDestroy, i;
    }
    this._transport = null, this._worker?.destroy(), this._worker = null;
  }
}, Oc = { _: 0 }, tu = class {
  constructor(i, t, e = !1, s = null) {
    this.length = i, this.initialData = t, this.progressiveDone = e, this.contentDispositionFilename = s, this._rangeListeners = [], this._progressListeners = [], this._progressiveReadListeners = [], this._progressiveDoneListeners = [], this._readyCapability = Promise.withResolvers();
  }
  addRangeListener(i) {
    this._rangeListeners.push(i);
  }
  addProgressListener(i) {
    this._progressListeners.push(i);
  }
  addProgressiveReadListener(i) {
    this._progressiveReadListeners.push(i);
  }
  addProgressiveDoneListener(i) {
    this._progressiveDoneListeners.push(i);
  }
  onDataRange(i, t) {
    for (const e of this._rangeListeners) e(i, t);
  }
  onDataProgress(i, t) {
    this._readyCapability.promise.then((() => {
      for (const e of this._progressListeners) e(i, t);
    }));
  }
  onDataProgressiveRead(i) {
    this._readyCapability.promise.then((() => {
      for (const t of this._progressiveReadListeners) t(i);
    }));
  }
  onDataProgressiveDone() {
    this._readyCapability.promise.then((() => {
      for (const i of this._progressiveDoneListeners) i();
    }));
  }
  transportReady() {
    this._readyCapability.resolve();
  }
  requestDataRange(i, t) {
    et("Abstract method PDFDataRangeTransport.requestDataRange");
  }
  abort() {
  }
}, zg = class {
  constructor(i, t) {
    this._pdfInfo = i, this._transport = t;
  }
  get annotationStorage() {
    return this._transport.annotationStorage;
  }
  get canvasFactory() {
    return this._transport.canvasFactory;
  }
  get filterFactory() {
    return this._transport.filterFactory;
  }
  get numPages() {
    return this._pdfInfo.numPages;
  }
  get fingerprints() {
    return this._pdfInfo.fingerprints;
  }
  get isPureXfa() {
    return $(this, "isPureXfa", !!this._transport._htmlForXfa);
  }
  get allXfaHtml() {
    return this._transport._htmlForXfa;
  }
  getPage(i) {
    return this._transport.getPage(i);
  }
  getPageIndex(i) {
    return this._transport.getPageIndex(i);
  }
  getDestinations() {
    return this._transport.getDestinations();
  }
  getDestination(i) {
    return this._transport.getDestination(i);
  }
  getPageLabels() {
    return this._transport.getPageLabels();
  }
  getPageLayout() {
    return this._transport.getPageLayout();
  }
  getPageMode() {
    return this._transport.getPageMode();
  }
  getViewerPreferences() {
    return this._transport.getViewerPreferences();
  }
  getOpenAction() {
    return this._transport.getOpenAction();
  }
  getAttachments() {
    return this._transport.getAttachments();
  }
  getJSActions() {
    return this._transport.getDocJSActions();
  }
  getOutline() {
    return this._transport.getOutline();
  }
  getOptionalContentConfig({ intent: i = "display" } = {}) {
    const { renderingIntent: t } = this._transport.getRenderingIntent(i);
    return this._transport.getOptionalContentConfig(t);
  }
  getPermissions() {
    return this._transport.getPermissions();
  }
  getMetadata() {
    return this._transport.getMetadata();
  }
  getMarkInfo() {
    return this._transport.getMarkInfo();
  }
  getData() {
    return this._transport.getData();
  }
  saveDocument() {
    return this._transport.saveDocument();
  }
  getDownloadInfo() {
    return this._transport.downloadInfoCapability.promise;
  }
  cleanup(i = !1) {
    return this._transport.startCleanup(i || this.isPureXfa);
  }
  destroy() {
    return this.loadingTask.destroy();
  }
  cachedPageNumber(i) {
    return this._transport.cachedPageNumber(i);
  }
  get loadingParams() {
    return this._transport.loadingParams;
  }
  get loadingTask() {
    return this._transport.loadingTask;
  }
  getFieldObjects() {
    return this._transport.getFieldObjects();
  }
  hasJSActions() {
    return this._transport.hasJSActions();
  }
  getCalculationOrderIds() {
    return this._transport.getCalculationOrderIds();
  }
}, qs = /* @__PURE__ */ new WeakMap(), qi = /* @__PURE__ */ new WeakMap(), Ue = /* @__PURE__ */ new WeakSet(), Gg = class {
  constructor(i, t, e, s = !1) {
    G(this, Ue), _(this, qs, null), _(this, qi, !1), this._pageIndex = i, this._pageInfo = t, this._transport = e, this._stats = s ? new ec() : null, this._pdfBug = s, this.commonObjs = e.commonObjs, this.objs = new eu(), this._maybeCleanupAfterRender = !1, this._intentStates = /* @__PURE__ */ new Map(), this.destroyed = !1;
  }
  get pageNumber() {
    return this._pageIndex + 1;
  }
  get rotate() {
    return this._pageInfo.rotate;
  }
  get ref() {
    return this._pageInfo.ref;
  }
  get userUnit() {
    return this._pageInfo.userUnit;
  }
  get view() {
    return this._pageInfo.view;
  }
  getViewport({ scale: i, rotation: t = this.rotate, offsetX: e = 0, offsetY: s = 0, dontFlip: n = !1 } = {}) {
    return new Ll({
      viewBox: this.view,
      userUnit: this.userUnit,
      scale: i,
      rotation: t,
      offsetX: e,
      offsetY: s,
      dontFlip: n
    });
  }
  getAnnotations({ intent: i = "display" } = {}) {
    const { renderingIntent: t } = this._transport.getRenderingIntent(i);
    return this._transport.getAnnotations(this._pageIndex, t);
  }
  getJSActions() {
    return this._transport.getPageJSActions(this._pageIndex);
  }
  get filterFactory() {
    return this._transport.filterFactory;
  }
  get isPureXfa() {
    return $(this, "isPureXfa", !!this._transport._htmlForXfa);
  }
  async getXfa() {
    return this._transport._htmlForXfa?.children[this._pageIndex] || null;
  }
  render({ canvasContext: i, viewport: t, intent: e = "display", annotationMode: s = xi.ENABLE, transform: n = null, background: r = null, optionalContentConfigPromise: o = null, annotationCanvasMap: h = null, pageColors: l = null, printAnnotationStorage: c = null, isEditing: d = !1 }) {
    var p;
    this._stats?.time("Overall");
    const f = this._transport.getRenderingIntent(e, s, c, d), { renderingIntent: v, cacheKey: m } = f;
    u(qi, this, !1), g(Ue, this, rl).call(this), o || (o = this._transport.getOptionalContentConfig(v));
    let b = this._intentStates.get(m);
    b || (b = /* @__PURE__ */ Object.create(null), this._intentStates.set(m, b)), b.streamReaderCancelTimeout && (clearTimeout(b.streamReaderCancelTimeout), b.streamReaderCancelTimeout = null);
    const w = !!(v & qr);
    b.displayReadyCapability || (b.displayReadyCapability = Promise.withResolvers(), b.operatorList = {
      fnArray: [],
      argsArray: [],
      lastChunk: !1,
      separateAnnots: null
    }, this._stats?.time("Page Request"), this._pumpOperatorList(f));
    const A = (S) => {
      b.renderTasks.delete(y), (this._maybeCleanupAfterRender || w) && u(qi, this, !0), g(Ue, this, zn).call(this, !w), S ? (y.capability.reject(S), this._abortOperatorList({
        intentState: b,
        reason: S instanceof Error ? S : new Error(S)
      })) : y.capability.resolve(), this._stats && (this._stats.timeEnd("Rendering"), this._stats.timeEnd("Overall"), globalThis.Stats?.enabled && globalThis.Stats.add(this.pageNumber, this._stats));
    }, y = new qg({
      callback: A,
      params: {
        canvasContext: i,
        viewport: t,
        transform: n,
        background: r
      },
      objs: this.objs,
      commonObjs: this.commonObjs,
      annotationCanvasMap: h,
      operatorList: b.operatorList,
      pageIndex: this._pageIndex,
      canvasFactory: this._transport.canvasFactory,
      filterFactory: this._transport.filterFactory,
      useRequestAnimationFrame: !w,
      pdfBug: this._pdfBug,
      pageColors: l
    });
    ((p = b).renderTasks || (p.renderTasks = /* @__PURE__ */ new Set())).add(y);
    const x = y.task;
    return Promise.all([b.displayReadyCapability.promise, o]).then((([S, M]) => {
      if (this.destroyed) A();
      else {
        if (this._stats?.time("Rendering"), !(M.renderingIntent & v)) throw new Error("Must use the same `intent`-argument when calling the `PDFPageProxy.render` and `PDFDocumentProxy.getOptionalContentConfig` methods.");
        y.initializeGraphics({
          transparency: S,
          optionalContentConfig: M
        }), y.operatorListChanged();
      }
    })).catch(A), x;
  }
  getOperatorList({ intent: i = "display", annotationMode: t = xi.ENABLE, printAnnotationStorage: e = null, isEditing: s = !1 } = {}) {
    const n = this._transport.getRenderingIntent(i, t, e, s, !0);
    let r, o = this._intentStates.get(n.cacheKey);
    if (o || (o = /* @__PURE__ */ Object.create(null), this._intentStates.set(n.cacheKey, o)), !o.opListReadCapability) {
      var h;
      r = /* @__PURE__ */ Object.create(null), r.operatorListChanged = function() {
        o.operatorList.lastChunk && (o.opListReadCapability.resolve(o.operatorList), o.renderTasks.delete(r));
      }, o.opListReadCapability = Promise.withResolvers(), ((h = o).renderTasks || (h.renderTasks = /* @__PURE__ */ new Set())).add(r), o.operatorList = {
        fnArray: [],
        argsArray: [],
        lastChunk: !1,
        separateAnnots: null
      }, this._stats?.time("Page Request"), this._pumpOperatorList(n);
    }
    return o.opListReadCapability.promise;
  }
  streamTextContent({ includeMarkedContent: i = !1, disableNormalization: t = !1 } = {}) {
    return this._transport.messageHandler.sendWithStream("GetTextContent", {
      pageIndex: this._pageIndex,
      includeMarkedContent: i === !0,
      disableNormalization: t === !0
    }, {
      highWaterMark: 100,
      size: (e) => e.items.length
    });
  }
  getTextContent(i = {}) {
    if (this._transport._htmlForXfa) return this.getXfa().then(((e) => al.textContent(e)));
    const t = this.streamTextContent(i);
    return new Promise((function(e, s) {
      const n = t.getReader(), r = {
        items: [],
        styles: /* @__PURE__ */ Object.create(null),
        lang: null
      };
      (function o() {
        n.read().then((function({ value: h, done: l }) {
          l ? e(r) : (r.lang ?? (r.lang = h.lang), Object.assign(r.styles, h.styles), r.items.push(...h.items), o());
        }), s);
      })();
    }));
  }
  getStructTree() {
    return this._transport.getStructTree(this._pageIndex);
  }
  _destroy() {
    this.destroyed = !0;
    const i = [];
    for (const t of this._intentStates.values())
      if (this._abortOperatorList({
        intentState: t,
        reason: /* @__PURE__ */ new Error("Page was destroyed."),
        force: !0
      }), !t.opListReadCapability) for (const e of t.renderTasks)
        i.push(e.completed), e.cancel();
    return this.objs.clear(), u(qi, this, !1), g(Ue, this, rl).call(this), Promise.all(i);
  }
  cleanup(i = !1) {
    u(qi, this, !0);
    const t = g(Ue, this, zn).call(this, !1);
    return i && t && this._stats && (this._stats = new ec()), t;
  }
  _startRenderPage(i, t) {
    const e = this._intentStates.get(t);
    e && (this._stats?.timeEnd("Page Request"), e.displayReadyCapability?.resolve(i));
  }
  _renderPageChunk(i, t) {
    for (let e = 0, s = i.length; e < s; e++)
      t.operatorList.fnArray.push(i.fnArray[e]), t.operatorList.argsArray.push(i.argsArray[e]);
    t.operatorList.lastChunk = i.lastChunk, t.operatorList.separateAnnots = i.separateAnnots;
    for (const e of t.renderTasks) e.operatorListChanged();
    i.lastChunk && g(Ue, this, zn).call(this, !0);
  }
  _pumpOperatorList({ renderingIntent: i, cacheKey: t, annotationStorageSerializable: e, modifiedIds: s }) {
    const { map: n, transfer: r } = e, o = this._transport.messageHandler.sendWithStream("GetOperatorList", {
      pageIndex: this._pageIndex,
      intent: i,
      cacheKey: t,
      annotationStorage: n,
      modifiedIds: s
    }, r).getReader(), h = this._intentStates.get(t);
    h.streamReader = o;
    const l = () => {
      o.read().then((({ value: c, done: d }) => {
        d ? h.streamReader = null : this._transport.destroyed || (this._renderPageChunk(c, h), l());
      }), ((c) => {
        if (h.streamReader = null, !this._transport.destroyed) {
          if (h.operatorList) {
            h.operatorList.lastChunk = !0;
            for (const d of h.renderTasks) d.operatorListChanged();
            g(Ue, this, zn).call(this, !0);
          }
          if (h.displayReadyCapability) h.displayReadyCapability.reject(c);
          else {
            if (!h.opListReadCapability) throw c;
            h.opListReadCapability.reject(c);
          }
        }
      }));
    };
    l();
  }
  _abortOperatorList({ intentState: i, reason: t, force: e = !1 }) {
    if (i.streamReader) {
      if (i.streamReaderCancelTimeout && (clearTimeout(i.streamReaderCancelTimeout), i.streamReaderCancelTimeout = null), !e) {
        if (i.renderTasks.size > 0) return;
        if (t instanceof Fl) {
          let s = 100;
          t.extraDelay > 0 && t.extraDelay < 1e3 && (s += t.extraDelay), i.streamReaderCancelTimeout = setTimeout((() => {
            i.streamReaderCancelTimeout = null, this._abortOperatorList({
              intentState: i,
              reason: t,
              force: !0
            });
          }), s);
          return;
        }
      }
      if (i.streamReader.cancel(new Ei(t.message)).catch((() => {
      })), i.streamReader = null, !this._transport.destroyed) {
        for (const [s, n] of this._intentStates) if (n === i) {
          this._intentStates.delete(s);
          break;
        }
        this.cleanup();
      }
    }
  }
  get stats() {
    return this._stats;
  }
};
function zn(i = !1) {
  if (g(Ue, this, rl).call(this), !a(qi, this) || this.destroyed) return !1;
  if (i)
    return u(qs, this, setTimeout((() => {
      u(qs, this, null), g(Ue, this, zn).call(this, !1);
    }), 5e3)), !1;
  for (const { renderTasks: t, operatorList: e } of this._intentStates.values()) if (t.size > 0 || !e.lastChunk) return !1;
  return this._intentStates.clear(), this.objs.clear(), u(qi, this, !1), !0;
}
function rl() {
  a(qs, this) && (clearTimeout(a(qs, this)), u(qs, this, null));
}
var Ni = /* @__PURE__ */ new WeakMap(), Wc = /* @__PURE__ */ new WeakMap(), jg = class {
  constructor() {
    _(this, Ni, /* @__PURE__ */ new Map()), _(this, Wc, Promise.resolve());
  }
  postMessage(i, t) {
    const e = { data: structuredClone(i, t ? { transfer: t } : null) };
    a(Wc, this).then((() => {
      for (const [s] of a(Ni, this)) s.call(this, e);
    }));
  }
  addEventListener(i, t, e = null) {
    let s = null;
    if (e?.signal instanceof AbortSignal) {
      const { signal: n } = e;
      if (n.aborted) {
        B("LoopbackPort - cannot use an `aborted` signal.");
        return;
      }
      const r = () => this.removeEventListener(i, t);
      s = () => n.removeEventListener("abort", r), n.addEventListener("abort", r);
    }
    a(Ni, this).set(t, s);
  }
  removeEventListener(i, t) {
    a(Ni, this).get(t)?.(), a(Ni, this).delete(t);
  }
  terminate() {
    for (const [, i] of a(Ni, this)) i?.();
    a(Ni, this).clear();
  }
}, ja = /* @__PURE__ */ new WeakSet(), na = class Re {
  constructor({ name: t = null, port: e = null, verbosity: s = cp() } = {}) {
    if (G(this, ja), this.name = t, this.destroyed = !1, this.verbosity = s, this._readyCapability = Promise.withResolvers(), this._port = null, this._webWorker = null, this._messageHandler = null, e) {
      if (bn._?.has(e)) throw new Error("Cannot use more than one PDFWorker per port.");
      (bn._ || (bn._ = /* @__PURE__ */ new WeakMap())).set(e, this), this._initializeFromPort(e);
    } else this._initialize();
  }
  get promise() {
    return this._readyCapability.promise;
  }
  get port() {
    return this._port;
  }
  get messageHandler() {
    return this._messageHandler;
  }
  _initializeFromPort(t) {
    this._port = t, this._messageHandler = new Hn("main", "worker", t), this._messageHandler.on("ready", (function() {
    })), g(ja, this, Qo).call(this);
  }
  _initialize() {
    if (Ir._ || Jo.call(Re)) {
      this._setupFakeWorker();
      return;
    }
    let { workerSrc: t } = Re;
    try {
      Re._isSameOrigin(window.location.href, t) || (t = Re._createCDNWrapper(new URL(t, window.location).href));
      const e = new Worker(t, { type: "module" }), s = new Hn("main", "worker", e), n = () => {
        r.abort(), s.destroy(), e.terminate(), this.destroyed ? this._readyCapability.reject(/* @__PURE__ */ new Error("Worker was destroyed")) : this._setupFakeWorker();
      }, r = new AbortController();
      e.addEventListener("error", (() => {
        this._webWorker || n();
      }), { signal: r.signal }), s.on("test", ((h) => {
        r.abort(), !this.destroyed && h ? (this._messageHandler = s, this._port = e, this._webWorker = e, g(ja, this, Qo).call(this)) : n();
      })), s.on("ready", ((h) => {
        if (r.abort(), this.destroyed) n();
        else try {
          o();
        } catch {
          this._setupFakeWorker();
        }
      }));
      const o = () => {
        const h = new Uint8Array();
        s.send("test", h, [h.buffer]);
      };
      o();
      return;
    } catch {
      co("The worker has been disabled.");
    }
    this._setupFakeWorker();
  }
  _setupFakeWorker() {
    Ir._ || (B("Setting up fake worker."), Ir._ = !0), Re._setupFakeWorkerGlobal.then(((t) => {
      var e, s;
      if (this.destroyed) {
        this._readyCapability.reject(/* @__PURE__ */ new Error("Worker was destroyed"));
        return;
      }
      const n = new jg();
      this._port = n;
      const r = "fake" + (Bc._ = (e = Bc._, s = e++, e), s), o = new Hn(r + "_worker", r, n);
      t.setup(o, n), this._messageHandler = new Hn(r, r + "_worker", n), g(ja, this, Qo).call(this);
    })).catch(((t) => {
      this._readyCapability.reject(/* @__PURE__ */ new Error(`Setting up fake worker failed: "${t.message}".`));
    }));
  }
  destroy() {
    this.destroyed = !0, this._webWorker?.terminate(), this._webWorker = null, bn._?.delete(this._port), this._port = null, this._messageHandler?.destroy(), this._messageHandler = null;
  }
  static fromPort(t) {
    if (!t?.port) throw new Error("PDFWorker.fromPort - invalid method signature.");
    const e = g(Re, this, bn)._?.get(t.port);
    if (e) {
      if (e._pendingDestroy) throw new Error("PDFWorker.fromPort - the worker is being destroyed.\nPlease remember to await `PDFDocumentLoadingTask.destroy()`-calls.");
      return e;
    }
    return new Re(t);
  }
  static get workerSrc() {
    if (Js.workerSrc) return Js.workerSrc;
    throw new Error('No "GlobalWorkerOptions.workerSrc" specified.');
  }
  static get _setupFakeWorkerGlobal() {
    return $(this, "_setupFakeWorkerGlobal", (async () => Jo.call(g(Re, this)) ? Jo.call(g(Re, this)) : (await import(this.workerSrc)).WorkerMessageHandler)());
  }
};
Nn = na;
function Qo() {
  this._readyCapability.resolve(), this._messageHandler.send("configure", { verbosity: this.verbosity });
}
function Jo() {
  try {
    return globalThis.pdfjsWorker?.WorkerMessageHandler || null;
  } catch {
    return null;
  }
}
var Bc = { _: 0 }, Ir = { _: !1 }, bn = { _: void 0 };
Dt && (Ir._ = g(Nn, Nn, !0), Js.workerSrc || (Js.workerSrc = "./pdf.worker.mjs")), Nn._isSameOrigin = (i, t) => {
  let e;
  try {
    if (e = new URL(i), !e.origin || e.origin === "null") return !1;
  } catch {
    return !1;
  }
  const s = new URL(t, e);
  return e.origin === s.origin;
}, Nn._createCDNWrapper = (i) => {
  const t = `await import("${i}");`;
  return URL.createObjectURL(new Blob([t], { type: "text/javascript" }));
};
var Xi = /* @__PURE__ */ new WeakMap(), di = /* @__PURE__ */ new WeakMap(), Va = /* @__PURE__ */ new WeakMap(), Ua = /* @__PURE__ */ new WeakMap(), Oi = /* @__PURE__ */ new WeakMap(), wn = /* @__PURE__ */ new WeakSet(), Vg = class {
  constructor(i, t, e, s, n) {
    G(this, wn), _(this, Xi, /* @__PURE__ */ new Map()), _(this, di, /* @__PURE__ */ new Map()), _(this, Va, /* @__PURE__ */ new Map()), _(this, Ua, /* @__PURE__ */ new Map()), _(this, Oi, null), this.messageHandler = i, this.loadingTask = t, this.commonObjs = new eu(), this.fontLoader = new Jp({
      ownerDocument: s.ownerDocument,
      styleElement: s.styleElement
    }), this.loadingParams = s.loadingParams, this._params = s, this.canvasFactory = n.canvasFactory, this.filterFactory = n.filterFactory, this.cMapReaderFactory = n.cMapReaderFactory, this.standardFontDataFactory = n.standardFontDataFactory, this.destroyed = !1, this.destroyCapability = null, this._networkStream = e, this._fullReader = null, this._lastProgress = null, this.downloadInfoCapability = Promise.withResolvers(), this.setupMessageHandler();
  }
  get annotationStorage() {
    return $(this, "annotationStorage", new zl());
  }
  getRenderingIntent(i, t = xi.ENABLE, e = null, s = !1, n = !1) {
    let r = Rl, o = Xh;
    switch (i) {
      case "any":
        r = Ru;
        break;
      case "display":
        break;
      case "print":
        r = qr;
        break;
      default:
        B(`getRenderingIntent - invalid intent: ${i}`);
    }
    const h = r & qr && e instanceof Pd ? e : this.annotationStorage;
    switch (t) {
      case xi.DISABLE:
        r += Lu;
        break;
      case xi.ENABLE:
        break;
      case xi.ENABLE_FORMS:
        r += Du;
        break;
      case xi.ENABLE_STORAGE:
        r += Iu, o = h.serializable;
        break;
      default:
        B(`getRenderingIntent - invalid annotationMode: ${t}`);
    }
    s && (r += Fu), n && (r += Nu);
    const { ids: l, hash: c } = h.modifiedIds;
    return {
      renderingIntent: r,
      cacheKey: [
        r,
        o.hash,
        c
      ].join("_"),
      annotationStorageSerializable: o,
      modifiedIds: l
    };
  }
  destroy() {
    if (this.destroyCapability) return this.destroyCapability.promise;
    this.destroyed = !0, this.destroyCapability = Promise.withResolvers(), a(Oi, this)?.reject(/* @__PURE__ */ new Error("Worker was destroyed during onPassword callback"));
    const i = [];
    for (const e of a(di, this).values()) i.push(e._destroy());
    a(di, this).clear(), a(Va, this).clear(), a(Ua, this).clear(), this.hasOwnProperty("annotationStorage") && this.annotationStorage.resetModified();
    const t = this.messageHandler.sendWithPromise("Terminate", null);
    return i.push(t), Promise.all(i).then((() => {
      this.commonObjs.clear(), this.fontLoader.clear(), a(Xi, this).clear(), this.filterFactory.destroy(), Jr.cleanup(), this._networkStream?.cancelAllRequests(new Ei("Worker was terminated.")), this.messageHandler?.destroy(), this.messageHandler = null, this.destroyCapability.resolve();
    }), this.destroyCapability.reject), this.destroyCapability.promise;
  }
  setupMessageHandler() {
    const { messageHandler: i, loadingTask: t } = this;
    i.on("GetReader", ((e, s) => {
      ut(this._networkStream, "GetReader - no `IPDFStream` instance available."), this._fullReader = this._networkStream.getFullReader(), this._fullReader.onProgress = (n) => {
        this._lastProgress = {
          loaded: n.loaded,
          total: n.total
        };
      }, s.onPull = () => {
        this._fullReader.read().then((function({ value: n, done: r }) {
          r ? s.close() : (ut(n instanceof ArrayBuffer, "GetReader - expected an ArrayBuffer."), s.enqueue(new Uint8Array(n), 1, [n]));
        })).catch(((n) => {
          s.error(n);
        }));
      }, s.onCancel = (n) => {
        this._fullReader.cancel(n), s.ready.catch(((r) => {
          if (!this.destroyed) throw r;
        }));
      };
    })), i.on("ReaderHeadersReady", (async (e) => {
      await this._fullReader.headersReady;
      const { isStreamingSupported: s, isRangeSupported: n, contentLength: r } = this._fullReader;
      return (!s || !n) && (this._lastProgress && t.onProgress?.(this._lastProgress), this._fullReader.onProgress = (o) => {
        t.onProgress?.({
          loaded: o.loaded,
          total: o.total
        });
      }), {
        isStreamingSupported: s,
        isRangeSupported: n,
        contentLength: r
      };
    })), i.on("GetRangeReader", ((e, s) => {
      ut(this._networkStream, "GetRangeReader - no `IPDFStream` instance available.");
      const n = this._networkStream.getRangeReader(e.begin, e.end);
      n ? (s.onPull = () => {
        n.read().then((function({ value: r, done: o }) {
          o ? s.close() : (ut(r instanceof ArrayBuffer, "GetRangeReader - expected an ArrayBuffer."), s.enqueue(new Uint8Array(r), 1, [r]));
        })).catch(((r) => {
          s.error(r);
        }));
      }, s.onCancel = (r) => {
        n.cancel(r), s.ready.catch(((o) => {
          if (!this.destroyed) throw o;
        }));
      }) : s.close();
    })), i.on("GetDoc", (({ pdfInfo: e }) => {
      this._numPages = e.numPages, this._htmlForXfa = e.htmlForXfa, delete e.htmlForXfa, t._capability.resolve(new zg(e, this));
    })), i.on("DocException", ((e) => {
      t._capability.reject(Yt(e));
    })), i.on("PasswordRequest", ((e) => {
      u(Oi, this, Promise.withResolvers());
      try {
        if (!t.onPassword) throw Yt(e);
        const s = (n) => {
          n instanceof Error ? a(Oi, this).reject(n) : a(Oi, this).resolve({ password: n });
        };
        t.onPassword(s, e.code);
      } catch (s) {
        a(Oi, this).reject(s);
      }
      return a(Oi, this).promise;
    })), i.on("DataLoaded", ((e) => {
      t.onProgress?.({
        loaded: e.length,
        total: e.length
      }), this.downloadInfoCapability.resolve(e);
    })), i.on("StartRenderPage", ((e) => {
      this.destroyed || a(di, this).get(e.pageIndex)._startRenderPage(e.transparency, e.cacheKey);
    })), i.on("commonobj", (([e, s, n]) => {
      if (this.destroyed || this.commonObjs.has(e)) return null;
      switch (s) {
        case "Font":
          const { disableFontFace: r, fontExtraProperties: o, pdfBug: h } = this._params;
          if ("error" in n) {
            const d = n.error;
            B(`Error during font loading: ${d}`), this.commonObjs.resolve(e, d);
            break;
          }
          const l = new Zp(n, {
            disableFontFace: r,
            fontExtraProperties: o,
            inspectFont: h && globalThis.FontInspector?.enabled ? (d, p) => globalThis.FontInspector.fontAdded(d, p) : null
          });
          this.fontLoader.bind(l).catch((() => i.sendWithPromise("FontFallback", { id: e }))).finally((() => {
            !o && l.data && (l.data = null), this.commonObjs.resolve(e, l);
          }));
          break;
        case "CopyLocalImage":
          const { imageRef: c } = n;
          ut(c, "The imageRef must be defined.");
          for (const d of a(di, this).values()) for (const [, p] of d.objs) if (p?.ref === c)
            return p.dataLen ? (this.commonObjs.resolve(e, structuredClone(p)), p.dataLen) : null;
          break;
        case "FontPath":
        case "Image":
        case "Pattern":
          this.commonObjs.resolve(e, n);
          break;
        default:
          throw new Error(`Got unknown common object type ${s}`);
      }
      return null;
    })), i.on("obj", (([e, s, n, r]) => {
      if (this.destroyed) return;
      const o = a(di, this).get(s);
      if (!o.objs.has(e)) if (o._intentStates.size !== 0) switch (n) {
        case "Image":
          o.objs.resolve(e, r), r?.dataLen > 1e7 && (o._maybeCleanupAfterRender = !0);
          break;
        case "Pattern":
          o.objs.resolve(e, r);
          break;
        default:
          throw new Error(`Got unknown object type ${n}`);
      }
      else r?.bitmap?.close();
    })), i.on("DocProgress", ((e) => {
      this.destroyed || t.onProgress?.({
        loaded: e.loaded,
        total: e.total
      });
    })), i.on("FetchBuiltInCMap", (async (e) => {
      if (this.destroyed) throw new Error("Worker was destroyed.");
      if (!this.cMapReaderFactory) throw new Error("CMapReaderFactory not initialized, see the `useWorkerFetch` parameter.");
      return this.cMapReaderFactory.fetch(e);
    })), i.on("FetchStandardFontData", (async (e) => {
      if (this.destroyed) throw new Error("Worker was destroyed.");
      if (!this.standardFontDataFactory) throw new Error("StandardFontDataFactory not initialized, see the `useWorkerFetch` parameter.");
      return this.standardFontDataFactory.fetch(e);
    }));
  }
  getData() {
    return this.messageHandler.sendWithPromise("GetData", null);
  }
  saveDocument() {
    this.annotationStorage.size <= 0 && B("saveDocument called while `annotationStorage` is empty, please use the getData-method instead.");
    const { map: i, transfer: t } = this.annotationStorage.serializable;
    return this.messageHandler.sendWithPromise("SaveDocument", {
      isPureXfa: !!this._htmlForXfa,
      numPages: this._numPages,
      annotationStorage: i,
      filename: this._fullReader?.filename ?? null
    }, t).finally((() => {
      this.annotationStorage.resetModified();
    }));
  }
  getPage(i) {
    if (!Number.isInteger(i) || i <= 0 || i > this._numPages) return Promise.reject(/* @__PURE__ */ new Error("Invalid page request."));
    const t = i - 1, e = a(Va, this).get(t);
    if (e) return e;
    const s = this.messageHandler.sendWithPromise("GetPage", { pageIndex: t }).then(((n) => {
      if (this.destroyed) throw new Error("Transport destroyed");
      n.refStr && a(Ua, this).set(n.refStr, i);
      const r = new Gg(t, n, this, this._params.pdfBug);
      return a(di, this).set(t, r), r;
    }));
    return a(Va, this).set(t, s), s;
  }
  getPageIndex(i) {
    return Nc(i) ? this.messageHandler.sendWithPromise("GetPageIndex", {
      num: i.num,
      gen: i.gen
    }) : Promise.reject(/* @__PURE__ */ new Error("Invalid pageIndex request."));
  }
  getAnnotations(i, t) {
    return this.messageHandler.sendWithPromise("GetAnnotations", {
      pageIndex: i,
      intent: t
    });
  }
  getFieldObjects() {
    return g(wn, this, qa).call(this, "GetFieldObjects");
  }
  hasJSActions() {
    return g(wn, this, qa).call(this, "HasJSActions");
  }
  getCalculationOrderIds() {
    return this.messageHandler.sendWithPromise("GetCalculationOrderIds", null);
  }
  getDestinations() {
    return this.messageHandler.sendWithPromise("GetDestinations", null);
  }
  getDestination(i) {
    return typeof i != "string" ? Promise.reject(/* @__PURE__ */ new Error("Invalid destination request.")) : this.messageHandler.sendWithPromise("GetDestination", { id: i });
  }
  getPageLabels() {
    return this.messageHandler.sendWithPromise("GetPageLabels", null);
  }
  getPageLayout() {
    return this.messageHandler.sendWithPromise("GetPageLayout", null);
  }
  getPageMode() {
    return this.messageHandler.sendWithPromise("GetPageMode", null);
  }
  getViewerPreferences() {
    return this.messageHandler.sendWithPromise("GetViewerPreferences", null);
  }
  getOpenAction() {
    return this.messageHandler.sendWithPromise("GetOpenAction", null);
  }
  getAttachments() {
    return this.messageHandler.sendWithPromise("GetAttachments", null);
  }
  getDocJSActions() {
    return g(wn, this, qa).call(this, "GetDocJSActions");
  }
  getPageJSActions(i) {
    return this.messageHandler.sendWithPromise("GetPageJSActions", { pageIndex: i });
  }
  getStructTree(i) {
    return this.messageHandler.sendWithPromise("GetStructTree", { pageIndex: i });
  }
  getOutline() {
    return this.messageHandler.sendWithPromise("GetOutline", null);
  }
  getOptionalContentConfig(i) {
    return g(wn, this, qa).call(this, "GetOptionalContentConfig").then(((t) => new mg(t, i)));
  }
  getPermissions() {
    return this.messageHandler.sendWithPromise("GetPermissions", null);
  }
  getMetadata() {
    const i = "GetMetadata", t = a(Xi, this).get(i);
    if (t) return t;
    const e = this.messageHandler.sendWithPromise(i, null).then(((s) => ({
      info: s[0],
      metadata: s[1] ? new gg(s[1]) : null,
      contentDispositionFilename: this._fullReader?.filename ?? null,
      contentLength: this._fullReader?.contentLength ?? null
    })));
    return a(Xi, this).set(i, e), e;
  }
  getMarkInfo() {
    return this.messageHandler.sendWithPromise("GetMarkInfo", null);
  }
  async startCleanup(i = !1) {
    if (!this.destroyed) {
      await this.messageHandler.sendWithPromise("Cleanup", null);
      for (const t of a(di, this).values()) if (!t.cleanup()) throw new Error(`startCleanup: Page ${t.pageNumber} is currently rendering.`);
      this.commonObjs.clear(), i || this.fontLoader.clear(), a(Xi, this).clear(), this.filterFactory.destroy(!0), Jr.cleanup();
    }
  }
  cachedPageNumber(i) {
    if (!Nc(i)) return null;
    const t = i.gen === 0 ? `${i.num}R` : `${i.num}R${i.gen}`;
    return a(Ua, this).get(t) ?? null;
  }
};
function qa(i, t = null) {
  const e = a(Xi, this).get(i);
  if (e) return e;
  const s = this.messageHandler.sendWithPromise(i, t);
  return a(Xi, this).set(i, s), s;
}
var Gn = /* @__PURE__ */ Symbol("INITIAL_DATA"), pe = /* @__PURE__ */ new WeakMap(), Zo = /* @__PURE__ */ new WeakSet();
fd = Symbol.iterator;
var eu = class {
  constructor() {
    G(this, Zo), _(this, pe, /* @__PURE__ */ Object.create(null));
  }
  get(i, t = null) {
    if (t) {
      const s = g(Zo, this, Hc).call(this, i);
      return s.promise.then((() => t(s.data))), null;
    }
    const e = a(pe, this)[i];
    if (!e || e.data === Gn) throw new Error(`Requesting object that isn't resolved yet ${i}.`);
    return e.data;
  }
  has(i) {
    const t = a(pe, this)[i];
    return !!t && t.data !== Gn;
  }
  delete(i) {
    const t = a(pe, this)[i];
    return !t || t.data === Gn ? !1 : (delete a(pe, this)[i], !0);
  }
  resolve(i, t = null) {
    const e = g(Zo, this, Hc).call(this, i);
    e.data = t, e.resolve();
  }
  clear() {
    for (const i in a(pe, this)) {
      const { data: t } = a(pe, this)[i];
      t?.bitmap?.close();
    }
    u(pe, this, /* @__PURE__ */ Object.create(null));
  }
  *[fd]() {
    for (const i in a(pe, this)) {
      const { data: t } = a(pe, this)[i];
      t !== Gn && (yield [i, t]);
    }
  }
};
function Hc(i) {
  var t;
  return (t = a(pe, this))[i] || (t[i] = {
    ...Promise.withResolvers(),
    data: Gn
  });
}
var vs = /* @__PURE__ */ new WeakMap(), Ug = class {
  constructor(i) {
    _(this, vs, null), u(vs, this, i), this.onContinue = null;
  }
  get promise() {
    return a(vs, this).capability.promise;
  }
  cancel(i = 0) {
    a(vs, this).cancel(null, i);
  }
  get separateAnnots() {
    const { separateAnnots: i } = a(vs, this).operatorList;
    if (!i) return !1;
    const { annotationCanvasMap: t } = a(vs, this);
    return i.form || i.canvas && t?.size > 0;
  }
}, _s = /* @__PURE__ */ new WeakMap(), qg = class {
  constructor({ callback: i, params: t, objs: e, commonObjs: s, annotationCanvasMap: n, operatorList: r, pageIndex: o, canvasFactory: h, filterFactory: l, useRequestAnimationFrame: c = !1, pdfBug: d = !1, pageColors: p = null }) {
    _(this, _s, null), this.callback = i, this.params = t, this.objs = e, this.commonObjs = s, this.annotationCanvasMap = n, this.operatorListIdx = null, this.operatorList = r, this._pageIndex = o, this.canvasFactory = h, this.filterFactory = l, this._pdfBug = d, this.pageColors = p, this.running = !1, this.graphicsReadyCallback = null, this.graphicsReady = !1, this._useRequestAnimationFrame = c === !0 && typeof window < "u", this.cancelled = !1, this.capability = Promise.withResolvers(), this.task = new Ug(this), this._cancelBound = this.cancel.bind(this), this._continueBound = this._continue.bind(this), this._scheduleNextBound = this._scheduleNext.bind(this), this._nextBound = this._next.bind(this), this._canvas = t.canvasContext.canvas;
  }
  get completed() {
    return this.capability.promise.catch((function() {
    }));
  }
  initializeGraphics({ transparency: i = !1, optionalContentConfig: t }) {
    if (this.cancelled) return;
    if (this._canvas) {
      if (Xa._.has(this._canvas)) throw new Error("Cannot use the same canvas during multiple render() operations. Use different canvas or ensure previous operations were cancelled or completed.");
      Xa._.add(this._canvas);
    }
    this._pdfBug && globalThis.StepperManager?.enabled && (this.stepper = globalThis.StepperManager.create(this._pageIndex), this.stepper.init(this.operatorList), this.stepper.nextBreakPoint = this.stepper.getNextBreakPoint());
    const { canvasContext: e, viewport: s, transform: n, background: r } = this.params;
    this.gfx = new Cr(e, this.commonObjs, this.objs, this.canvasFactory, this.filterFactory, { optionalContentConfig: t }, this.annotationCanvasMap, this.pageColors), this.gfx.beginDrawing({
      transform: n,
      viewport: s,
      transparency: i,
      background: r
    }), this.operatorListIdx = 0, this.graphicsReady = !0, this.graphicsReadyCallback?.();
  }
  cancel(i = null, t = 0) {
    this.running = !1, this.cancelled = !0, this.gfx?.endDrawing(), a(_s, this) && (window.cancelAnimationFrame(a(_s, this)), u(_s, this, null)), Xa._.delete(this._canvas), this.callback(i || new Fl(`Rendering cancelled, page ${this._pageIndex + 1}`, t));
  }
  operatorListChanged() {
    this.graphicsReady ? (this.stepper?.updateOperatorList(this.operatorList), this.running || this._continue()) : this.graphicsReadyCallback || (this.graphicsReadyCallback = this._continueBound);
  }
  _continue() {
    this.running = !0, this.cancelled || (this.task.onContinue ? this.task.onContinue(this._scheduleNextBound) : this._scheduleNext());
  }
  _scheduleNext() {
    this._useRequestAnimationFrame ? u(_s, this, window.requestAnimationFrame((() => {
      u(_s, this, null), this._nextBound().catch(this._cancelBound);
    }))) : Promise.resolve().then(this._nextBound).catch(this._cancelBound);
  }
  async _next() {
    this.cancelled || (this.operatorListIdx = this.gfx.executeOperatorList(this.operatorList, this.operatorListIdx, this._continueBound, this.stepper), this.operatorListIdx === this.operatorList.argsArray.length && (this.running = !1, this.operatorList.lastChunk && (this.gfx.endDrawing(), Xa._.delete(this._canvas), this.callback())));
  }
}, Xa = { _: /* @__PURE__ */ new WeakSet() }, Xg = "4.10.38", Yg = "f9bea397f";
function $c(i) {
  return Math.floor(255 * Math.max(0, Math.min(1, i))).toString(16).padStart(2, "0");
}
function An(i) {
  return Math.max(0, Math.min(255, 255 * i));
}
var zc = class {
  static CMYK_G([i, t, e, s]) {
    return ["G", 1 - Math.min(1, 0.3 * i + 0.59 * e + 0.11 * t + s)];
  }
  static G_CMYK([i]) {
    return [
      "CMYK",
      0,
      0,
      0,
      1 - i
    ];
  }
  static G_RGB([i]) {
    return [
      "RGB",
      i,
      i,
      i
    ];
  }
  static G_rgb([i]) {
    return [
      i = An(i),
      i,
      i
    ];
  }
  static G_HTML([i]) {
    const t = $c(i);
    return `#${t}${t}${t}`;
  }
  static RGB_G([i, t, e]) {
    return ["G", 0.3 * i + 0.59 * t + 0.11 * e];
  }
  static RGB_rgb(i) {
    return i.map(An);
  }
  static RGB_HTML(i) {
    return `#${i.map($c).join("")}`;
  }
  static T_HTML() {
    return "#00000000";
  }
  static T_rgb() {
    return [null];
  }
  static CMYK_RGB([i, t, e, s]) {
    return [
      "RGB",
      1 - Math.min(1, i + s),
      1 - Math.min(1, e + s),
      1 - Math.min(1, t + s)
    ];
  }
  static CMYK_rgb([i, t, e, s]) {
    return [
      An(1 - Math.min(1, i + s)),
      An(1 - Math.min(1, e + s)),
      An(1 - Math.min(1, t + s))
    ];
  }
  static CMYK_HTML(i) {
    const t = this.CMYK_RGB(i).slice(1);
    return this.RGB_HTML(t);
  }
  static RGB_CMYK([i, t, e]) {
    const s = 1 - i, n = 1 - t, r = 1 - e;
    return [
      "CMYK",
      s,
      n,
      r,
      Math.min(s, n, r)
    ];
  }
}, Kg = class {
  create(i, t, e = !1) {
    if (i <= 0 || t <= 0) throw new Error("Invalid SVG dimensions");
    const s = this._createSVG("svg:svg");
    return s.setAttribute("version", "1.1"), e || (s.setAttribute("width", `${i}px`), s.setAttribute("height", `${t}px`)), s.setAttribute("preserveAspectRatio", "none"), s.setAttribute("viewBox", `0 0 ${i} ${t}`), s;
  }
  createElement(i) {
    if (typeof i != "string") throw new Error("Invalid SVG element type");
    return this._createSVG(i);
  }
  _createSVG(i) {
    et("Abstract method `_createSVG` called.");
  }
}, Vl = class extends Kg {
  _createSVG(i) {
    return document.createElementNS(ii, i);
  }
}, iu = class {
  static setupStorage(i, t, e, s, n) {
    const r = s.getValue(t, { value: null });
    switch (e.name) {
      case "textarea":
        if (r.value !== null && (i.textContent = r.value), n === "print") break;
        i.addEventListener("input", ((o) => {
          s.setValue(t, { value: o.target.value });
        }));
        break;
      case "input":
        if (e.attributes.type === "radio" || e.attributes.type === "checkbox") {
          if (r.value === e.attributes.xfaOn ? i.setAttribute("checked", !0) : r.value === e.attributes.xfaOff && i.removeAttribute("checked"), n === "print") break;
          i.addEventListener("change", ((o) => {
            s.setValue(t, { value: o.target.checked ? o.target.getAttribute("xfaOn") : o.target.getAttribute("xfaOff") });
          }));
        } else {
          if (r.value !== null && i.setAttribute("value", r.value), n === "print") break;
          i.addEventListener("input", ((o) => {
            s.setValue(t, { value: o.target.value });
          }));
        }
        break;
      case "select":
        if (r.value !== null) {
          i.setAttribute("value", r.value);
          for (const o of e.children) o.attributes.value === r.value ? o.attributes.selected = !0 : o.attributes.hasOwnProperty("selected") && delete o.attributes.selected;
        }
        i.addEventListener("input", ((o) => {
          const h = o.target.options, l = h.selectedIndex === -1 ? "" : h[h.selectedIndex].value;
          s.setValue(t, { value: l });
        }));
    }
  }
  static setAttributes({ html: i, element: t, storage: e = null, intent: s, linkService: n }) {
    const { attributes: r } = t, o = i instanceof HTMLAnchorElement;
    r.type === "radio" && (r.name = `${r.name}-${s}`);
    for (const [h, l] of Object.entries(r)) if (l != null) switch (h) {
      case "class":
        l.length && i.setAttribute(h, l.join(" "));
        break;
      case "dataId":
        break;
      case "id":
        i.setAttribute("data-element-id", l);
        break;
      case "style":
        Object.assign(i.style, l);
        break;
      case "textContent":
        i.textContent = l;
        break;
      default:
        (!o || h !== "href" && h !== "newWindow") && i.setAttribute(h, l);
    }
    o && n.addLinkAttributes(i, r.href, r.newWindow), e && r.dataId && this.setupStorage(i, r.dataId, t, e);
  }
  static render(i) {
    const t = i.annotationStorage, e = i.linkService, s = i.xfaHtml, n = i.intent || "display", r = document.createElement(s.name);
    s.attributes && this.setAttributes({
      html: r,
      element: s,
      intent: n,
      linkService: e
    });
    const o = n !== "richText", h = i.div;
    if (h.append(r), i.viewport) {
      const d = `matrix(${i.viewport.transform.join(",")})`;
      h.style.transform = d;
    }
    o && h.setAttribute("class", "xfaLayer xfaFont");
    const l = [];
    if (s.children.length === 0) {
      if (s.value) {
        const d = document.createTextNode(s.value);
        r.append(d), o && al.shouldBuildText(s.name) && l.push(d);
      }
      return { textDivs: l };
    }
    const c = [[
      s,
      -1,
      r
    ]];
    for (; c.length > 0; ) {
      const [d, p, f] = c.at(-1);
      if (p + 1 === d.children.length) {
        c.pop();
        continue;
      }
      const v = d.children[++c.at(-1)[1]];
      if (v === null) continue;
      const { name: m } = v;
      if (m === "#text") {
        const w = document.createTextNode(v.value);
        l.push(w), f.append(w);
        continue;
      }
      const b = v?.attributes?.xmlns ? document.createElementNS(v.attributes.xmlns, m) : document.createElement(m);
      if (f.append(b), v.attributes && this.setAttributes({
        html: b,
        element: v,
        storage: t,
        intent: n,
        linkService: e
      }), v.children?.length > 0) c.push([
        v,
        -1,
        b
      ]);
      else if (v.value) {
        const w = document.createTextNode(v.value);
        o && al.shouldBuildText(m) && l.push(w), b.append(w);
      }
    }
    for (const d of h.querySelectorAll(".xfaNonInteractive input, .xfaNonInteractive textarea")) d.setAttribute("readOnly", !0);
    return { textDivs: l };
  }
  static update(i) {
    const t = `matrix(${i.viewport.transform.join(",")})`;
    i.div.style.transform = t, i.div.hidden = !1;
  }
}, ba = 1e3, cs = /* @__PURE__ */ new WeakSet();
function Ci(i) {
  return {
    width: i[2] - i[0],
    height: i[3] - i[1]
  };
}
var Qg = class {
  static create(i) {
    switch (i.data.annotationType) {
      case $u:
        return new nu(i);
      case Hu:
        return new tf(i);
      case ip:
        switch (i.data.fieldType) {
          case "Tx":
            return new ef(i);
          case "Btn":
            return i.data.radioButton ? new au(i) : i.data.checkBox ? new nf(i) : new af(i);
          case "Ch":
            return new rf(i);
          case "Sig":
            return new sf(i);
        }
        return new ds(i);
      case vd:
        return new ol(i);
      case zu:
        return new ou(i);
      case Gu:
        return new uf(i);
      case ju:
        return new pf(i);
      case Vu:
        return new gf(i);
      case qu:
        return new hu(i);
      case Zu:
        return new mf(i);
      case tp:
        return new ql(i);
      case Uu:
        return new ff(i);
      case Xu:
        return new lu(i);
      case Yu:
        return new vf(i);
      case Ku:
        return new _f(i);
      case Qu:
        return new bf(i);
      case Ju:
        return new cu(i);
      case ep:
        return new wf(i);
      default:
        return new mt(i);
    }
  }
}, bs = /* @__PURE__ */ new WeakMap(), Ya = /* @__PURE__ */ new WeakMap(), Ka = /* @__PURE__ */ new WeakMap(), th = /* @__PURE__ */ new WeakSet(), mt = class su {
  constructor(t, { isRenderable: e = !1, ignoreBorder: s = !1, createQuadrilaterals: n = !1 } = {}) {
    G(this, th), _(this, bs, null), _(this, Ya, !1), _(this, Ka, null), this.isRenderable = e, this.data = t.data, this.layer = t.layer, this.linkService = t.linkService, this.downloadManager = t.downloadManager, this.imageResourcesPath = t.imageResourcesPath, this.renderForms = t.renderForms, this.svgFactory = t.svgFactory, this.annotationStorage = t.annotationStorage, this.enableScripting = t.enableScripting, this.hasJSActions = t.hasJSActions, this._fieldObjects = t.fieldObjects, this.parent = t.parent, e && (this.container = this._createContainer(s)), n && this._createQuadrilaterals();
  }
  static _hasPopupData({ titleObj: t, contentsObj: e, richText: s }) {
    return !!(t?.str || e?.str || s?.str);
  }
  get _isEditable() {
    return this.data.isEditable;
  }
  get hasPopupData() {
    return su._hasPopupData(this.data);
  }
  updateEdited(t) {
    if (!this.container) return;
    a(bs, this) || u(bs, this, { rect: this.data.rect.slice(0) });
    const { rect: e } = t;
    e && g(th, this, Gc).call(this, e), a(Ka, this)?.popup.updateEdited(t);
  }
  resetEdited() {
    a(bs, this) && (g(th, this, Gc).call(this, a(bs, this).rect), a(Ka, this)?.popup.resetEdited(), u(bs, this, null));
  }
  _createContainer(t) {
    const { data: e, parent: { page: s, viewport: n } } = this, r = document.createElement("section");
    r.setAttribute("data-annotation-id", e.id), this instanceof ds || (r.tabIndex = ba);
    const { style: o } = r;
    if (o.zIndex = this.parent.zIndex++, e.alternativeText && (r.title = e.alternativeText), e.noRotate && r.classList.add("norotate"), !e.rect || this instanceof ol) {
      const { rotation: b } = e;
      return e.hasOwnCanvas || b === 0 || this.setRotation(b, r), r;
    }
    const { width: h, height: l } = Ci(e.rect);
    if (!t && e.borderStyle.width > 0) {
      o.borderWidth = `${e.borderStyle.width}px`;
      const b = e.borderStyle.horizontalCornerRadius, w = e.borderStyle.verticalCornerRadius;
      switch (b > 0 || w > 0 ? o.borderRadius = `calc(${b}px * var(--scale-factor)) / calc(${w}px * var(--scale-factor))` : this instanceof au && (o.borderRadius = `calc(${h}px * var(--scale-factor)) / calc(${l}px * var(--scale-factor))`), e.borderStyle.style) {
        case sp:
          o.borderStyle = "solid";
          break;
        case np:
          o.borderStyle = "dashed";
          break;
        case ap:
          B("Unimplemented border style: beveled");
          break;
        case rp:
          B("Unimplemented border style: inset");
          break;
        case op:
          o.borderBottomStyle = "solid";
      }
      const A = e.borderColor || null;
      A ? (u(Ya, this, !0), o.borderColor = C.makeHexColor(0 | A[0], 0 | A[1], 0 | A[2])) : o.borderWidth = 0;
    }
    const c = C.normalizeRect([
      e.rect[0],
      s.view[3] - e.rect[1] + s.view[1],
      e.rect[2],
      s.view[3] - e.rect[3] + s.view[1]
    ]), { pageWidth: d, pageHeight: p, pageX: f, pageY: v } = n.rawDims;
    o.left = 100 * (c[0] - f) / d + "%", o.top = 100 * (c[1] - v) / p + "%";
    const { rotation: m } = e;
    return e.hasOwnCanvas || m === 0 ? (o.width = 100 * h / d + "%", o.height = 100 * l / p + "%") : this.setRotation(m, r), r;
  }
  setRotation(t, e = this.container) {
    if (!this.data.rect) return;
    const { pageWidth: s, pageHeight: n } = this.parent.viewport.rawDims, { width: r, height: o } = Ci(this.data.rect);
    let h, l;
    t % 180 == 0 ? (h = 100 * r / s, l = 100 * o / n) : (h = 100 * o / s, l = 100 * r / n), e.style.width = `${h}%`, e.style.height = `${l}%`, e.setAttribute("data-main-rotation", (360 - t) % 360);
  }
  get _commonActions() {
    const t = (e, s, n) => {
      const r = n.detail[e], o = r[0], h = r.slice(1);
      n.target.style[s] = zc[`${o}_HTML`](h), this.annotationStorage.setValue(this.data.id, { [s]: zc[`${o}_rgb`](h) });
    };
    return $(this, "_commonActions", {
      display: (e) => {
        const { display: s } = e.detail, n = s % 2 == 1;
        this.container.style.visibility = n ? "hidden" : "visible", this.annotationStorage.setValue(this.data.id, {
          noView: n,
          noPrint: s === 1 || s === 2
        });
      },
      print: (e) => {
        this.annotationStorage.setValue(this.data.id, { noPrint: !e.detail.print });
      },
      hidden: (e) => {
        const { hidden: s } = e.detail;
        this.container.style.visibility = s ? "hidden" : "visible", this.annotationStorage.setValue(this.data.id, {
          noPrint: s,
          noView: s
        });
      },
      focus: (e) => {
        setTimeout((() => e.target.focus({ preventScroll: !1 })), 0);
      },
      userName: (e) => {
        e.target.title = e.detail.userName;
      },
      readonly: (e) => {
        e.target.disabled = e.detail.readonly;
      },
      required: (e) => {
        this._setRequired(e.target, e.detail.required);
      },
      bgColor: (e) => {
        t("bgColor", "backgroundColor", e);
      },
      fillColor: (e) => {
        t("fillColor", "backgroundColor", e);
      },
      fgColor: (e) => {
        t("fgColor", "color", e);
      },
      textColor: (e) => {
        t("textColor", "color", e);
      },
      borderColor: (e) => {
        t("borderColor", "borderColor", e);
      },
      strokeColor: (e) => {
        t("strokeColor", "borderColor", e);
      },
      rotation: (e) => {
        const s = e.detail.rotation;
        this.setRotation(s), this.annotationStorage.setValue(this.data.id, { rotation: s });
      }
    });
  }
  _dispatchEventFromSandbox(t, e) {
    const s = this._commonActions;
    for (const n of Object.keys(e.detail)) (t[n] || s[n])?.(e);
  }
  _setDefaultPropertiesFromJS(t) {
    if (!this.enableScripting) return;
    const e = this.annotationStorage.getRawValue(this.data.id);
    if (!e) return;
    const s = this._commonActions;
    for (const [n, r] of Object.entries(e)) {
      const o = s[n];
      o && (o({
        detail: { [n]: r },
        target: t
      }), delete e[n]);
    }
  }
  _createQuadrilaterals() {
    if (!this.container) return;
    const { quadPoints: t } = this.data;
    if (!t) return;
    const [e, s, n, r] = this.data.rect.map(((b) => Math.fround(b)));
    if (t.length === 8) {
      const [b, w, A, y] = t.subarray(2, 6);
      if (n === b && r === w && e === A && s === y) return;
    }
    const { style: o } = this.container;
    let h;
    if (a(Ya, this)) {
      const { borderColor: b, borderWidth: w } = o;
      o.borderWidth = 0, h = [
        "url('data:image/svg+xml;utf8,",
        '<svg xmlns="http://www.w3.org/2000/svg"',
        ' preserveAspectRatio="none" viewBox="0 0 1 1">',
        `<g fill="transparent" stroke="${b}" stroke-width="${w}">`
      ], this.container.classList.add("hasBorder");
    }
    const l = n - e, c = r - s, { svgFactory: d } = this, p = d.createElement("svg");
    p.classList.add("quadrilateralsContainer"), p.setAttribute("width", 0), p.setAttribute("height", 0);
    const f = d.createElement("defs");
    p.append(f);
    const v = d.createElement("clipPath"), m = `clippath_${this.data.id}`;
    v.setAttribute("id", m), v.setAttribute("clipPathUnits", "objectBoundingBox"), f.append(v);
    for (let b = 2, w = t.length; b < w; b += 8) {
      const A = t[b], y = t[b + 1], x = t[b + 2], S = t[b + 3], M = d.createElement("rect"), P = (x - e) / l, k = (r - y) / c, F = (A - x) / l, H = (y - S) / c;
      M.setAttribute("x", P), M.setAttribute("y", k), M.setAttribute("width", F), M.setAttribute("height", H), v.append(M), h?.push(`<rect vector-effect="non-scaling-stroke" x="${P}" y="${k}" width="${F}" height="${H}"/>`);
    }
    a(Ya, this) && (h.push("</g></svg>')"), o.backgroundImage = h.join("")), this.container.append(p), this.container.style.clipPath = `url(#${m})`;
  }
  _createPopup() {
    const { data: t } = this, e = u(Ka, this, new ol({
      data: {
        color: t.color,
        titleObj: t.titleObj,
        modificationDate: t.modificationDate,
        contentsObj: t.contentsObj,
        richText: t.richText,
        parentRect: t.rect,
        borderStyle: 0,
        id: `popup_${t.id}`,
        rotation: t.rotation
      },
      parent: this.parent,
      elements: [this]
    }));
    this.parent.div.append(e.render());
  }
  render() {
    et("Abstract method `AnnotationElement.render` called");
  }
  _getElementsByName(t, e = null) {
    const s = [];
    if (this._fieldObjects) {
      const n = this._fieldObjects[t];
      if (n) for (const { page: r, id: o, exportValues: h } of n) {
        if (r === -1 || o === e) continue;
        const l = typeof h == "string" ? h : null, c = document.querySelector(`[data-element-id="${o}"]`);
        !c || cs.has(c) ? s.push({
          id: o,
          exportValue: l,
          domElement: c
        }) : B(`_getElementsByName - element not allowed: ${o}`);
      }
      return s;
    }
    for (const n of document.getElementsByName(t)) {
      const { exportValue: r } = n, o = n.getAttribute("data-element-id");
      o !== e && cs.has(n) && s.push({
        id: o,
        exportValue: r,
        domElement: n
      });
    }
    return s;
  }
  show() {
    this.container && (this.container.hidden = !1), this.popup?.maybeShow();
  }
  hide() {
    this.container && (this.container.hidden = !0), this.popup?.forceHide();
  }
  getElementsToTriggerPopup() {
    return this.container;
  }
  addHighlightArea() {
    const t = this.getElementsToTriggerPopup();
    if (Array.isArray(t)) for (const e of t) e.classList.add("highlightArea");
    else t.classList.add("highlightArea");
  }
  _editOnDoubleClick() {
    if (!this._isEditable) return;
    const { annotationEditorType: t, data: { id: e } } = this;
    this.container.addEventListener("dblclick", (() => {
      this.linkService.eventBus?.dispatch("switchannotationeditormode", {
        source: this,
        mode: t,
        editId: e
      });
    }));
  }
};
function Gc(i) {
  const { container: { style: t }, data: { rect: e, rotation: s }, parent: { viewport: { rawDims: { pageWidth: n, pageHeight: r, pageX: o, pageY: h } } } } = this;
  e?.splice(0, 4, ...i);
  const { width: l, height: c } = Ci(i);
  t.left = 100 * (i[0] - o) / n + "%", t.top = 100 * (r - i[3] + h) / r + "%", s === 0 ? (t.width = 100 * l / n + "%", t.height = 100 * c / r + "%") : this.setRotation(s);
}
var qe = /* @__PURE__ */ new WeakSet(), nu = class extends mt {
  constructor(i, t = null) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !!t?.ignoreBorder,
      createQuadrilaterals: !0
    }), G(this, qe), this.isTooltipOnly = i.data.isTooltipOnly;
  }
  render() {
    const { data: i, linkService: t } = this, e = document.createElement("a");
    e.setAttribute("data-element-id", i.id);
    let s = !1;
    return i.url ? (t.addLinkAttributes(e, i.url, i.newWindow), s = !0) : i.action ? (this._bindNamedAction(e, i.action), s = !0) : i.attachment ? (g(qe, this, Jg).call(this, e, i.attachment, i.attachmentDest), s = !0) : i.setOCGState ? (g(qe, this, Zg).call(this, e, i.setOCGState), s = !0) : i.dest ? (this._bindLink(e, i.dest), s = !0) : (i.actions && (i.actions.Action || i.actions["Mouse Up"] || i.actions["Mouse Down"]) && this.enableScripting && this.hasJSActions && (this._bindJSAction(e, i), s = !0), i.resetForm ? (this._bindResetFormAction(e, i.resetForm), s = !0) : this.isTooltipOnly && !s && (this._bindLink(e, ""), s = !0)), this.container.classList.add("linkAnnotation"), s && this.container.append(e), this.container;
  }
  _bindLink(i, t) {
    i.href = this.linkService.getDestinationHash(t), i.onclick = () => (t && this.linkService.goToDestination(t), !1), (t || t === "") && g(qe, this, $s).call(this);
  }
  _bindNamedAction(i, t) {
    i.href = this.linkService.getAnchorUrl(""), i.onclick = () => (this.linkService.executeNamedAction(t), !1), g(qe, this, $s).call(this);
  }
  _bindJSAction(i, t) {
    i.href = this.linkService.getAnchorUrl("");
    const e = /* @__PURE__ */ new Map([
      ["Action", "onclick"],
      ["Mouse Up", "onmouseup"],
      ["Mouse Down", "onmousedown"]
    ]);
    for (const s of Object.keys(t.actions)) {
      const n = e.get(s);
      n && (i[n] = () => (this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
        source: this,
        detail: {
          id: t.id,
          name: s
        }
      }), !1));
    }
    i.onclick || (i.onclick = () => !1), g(qe, this, $s).call(this);
  }
  _bindResetFormAction(i, t) {
    const e = i.onclick;
    e || (i.href = this.linkService.getAnchorUrl("")), g(qe, this, $s).call(this), this._fieldObjects ? i.onclick = () => {
      e?.();
      const { fields: s, refs: n, include: r } = t, o = [];
      if (s.length !== 0 || n.length !== 0) {
        const c = new Set(n);
        for (const d of s) {
          const p = this._fieldObjects[d] || [];
          for (const { id: f } of p) c.add(f);
        }
        for (const d of Object.values(this._fieldObjects)) for (const p of d) c.has(p.id) === r && o.push(p);
      } else for (const c of Object.values(this._fieldObjects)) o.push(...c);
      const h = this.annotationStorage, l = [];
      for (const c of o) {
        const { id: d } = c;
        switch (l.push(d), c.type) {
          case "text": {
            const f = c.defaultValue || "";
            h.setValue(d, { value: f });
            break;
          }
          case "checkbox":
          case "radiobutton": {
            const f = c.defaultValue === c.exportValues;
            h.setValue(d, { value: f });
            break;
          }
          case "combobox":
          case "listbox": {
            const f = c.defaultValue || "";
            h.setValue(d, { value: f });
            break;
          }
          default:
            continue;
        }
        const p = document.querySelector(`[data-element-id="${d}"]`);
        p && (cs.has(p) ? p.dispatchEvent(new Event("resetform")) : B(`_bindResetFormAction - element not allowed: ${d}`));
      }
      return this.enableScripting && this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
        source: this,
        detail: {
          id: "app",
          ids: l,
          name: "ResetForm"
        }
      }), !1;
    } : (B('_bindResetFormAction - "resetForm" action not supported, ensure that the `fieldObjects` parameter is provided.'), e || (i.onclick = () => !1));
  }
};
function $s() {
  this.container.setAttribute("data-internal-link", "");
}
function Jg(i, t, e = null) {
  i.href = this.linkService.getAnchorUrl(""), t.description && (i.title = t.description), i.onclick = () => (this.downloadManager?.openOrDownloadData(t.content, t.filename, e), !1), g(qe, this, $s).call(this);
}
function Zg(i, t) {
  i.href = this.linkService.getAnchorUrl(""), i.onclick = () => (this.linkService.executeSetOCGState(t), !1), g(qe, this, $s).call(this);
}
var tf = class extends mt {
  constructor(i) {
    super(i, { isRenderable: !0 });
  }
  render() {
    this.container.classList.add("textAnnotation");
    const i = document.createElement("img");
    return i.src = this.imageResourcesPath + "annotation-" + this.data.name.toLowerCase() + ".svg", i.setAttribute("data-l10n-id", "pdfjs-text-annotation-type"), i.setAttribute("data-l10n-args", JSON.stringify({ type: this.data.name })), !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.append(i), this.container;
  }
}, ds = class extends mt {
  render() {
    return this.container;
  }
  showElementAndHideCanvas(i) {
    this.data.hasOwnCanvas && (i.previousSibling?.nodeName === "CANVAS" && (i.previousSibling.hidden = !0), i.hidden = !1);
  }
  _getKeyModifier(i) {
    return Gt.platform.isMac ? i.metaKey : i.ctrlKey;
  }
  _setEventListener(i, t, e, s, n) {
    e.includes("mouse") ? i.addEventListener(e, ((r) => {
      this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
        source: this,
        detail: {
          id: this.data.id,
          name: s,
          value: n(r),
          shift: r.shiftKey,
          modifier: this._getKeyModifier(r)
        }
      });
    })) : i.addEventListener(e, ((r) => {
      if (e === "blur") {
        if (!t.focused || !r.relatedTarget) return;
        t.focused = !1;
      } else if (e === "focus") {
        if (t.focused) return;
        t.focused = !0;
      }
      n && this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
        source: this,
        detail: {
          id: this.data.id,
          name: s,
          value: n(r)
        }
      });
    }));
  }
  _setEventListeners(i, t, e, s) {
    for (const [n, r] of e) (r === "Action" || this.data.actions?.[r]) && (r !== "Focus" && r !== "Blur" || t || (t = { focused: !1 }), this._setEventListener(i, t, n, r, s), r !== "Focus" || this.data.actions?.Blur ? r !== "Blur" || this.data.actions?.Focus || this._setEventListener(i, t, "focus", "Focus", null) : this._setEventListener(i, t, "blur", "Blur", null));
  }
  _setBackgroundColor(i) {
    const t = this.data.backgroundColor || null;
    i.style.backgroundColor = t === null ? "transparent" : C.makeHexColor(t[0], t[1], t[2]);
  }
  _setTextStyle(i) {
    const t = [
      "left",
      "center",
      "right"
    ], { fontColor: e } = this.data.defaultAppearanceData, s = this.data.defaultAppearanceData.fontSize || 9, n = i.style;
    let r;
    const o = (h) => Math.round(10 * h) / 10;
    if (this.data.multiLine) {
      const h = Math.abs(this.data.rect[3] - this.data.rect[1] - 2), l = h / (Math.round(h / (wo * s)) || 1);
      r = Math.min(s, o(l / wo));
    } else {
      const h = Math.abs(this.data.rect[3] - this.data.rect[1] - 2);
      r = Math.min(s, o(h / wo));
    }
    n.fontSize = `calc(${r}px * var(--scale-factor))`, n.color = C.makeHexColor(e[0], e[1], e[2]), this.data.textAlignment !== null && (n.textAlign = t[this.data.textAlignment]);
  }
  _setRequired(i, t) {
    t ? i.setAttribute("required", !0) : i.removeAttribute("required"), i.setAttribute("aria-required", t);
  }
}, ef = class extends ds {
  constructor(i) {
    super(i, { isRenderable: i.renderForms || i.data.hasOwnCanvas || !i.data.hasAppearance && !!i.data.fieldValue });
  }
  setPropertyOnSiblings(i, t, e, s) {
    const n = this.annotationStorage;
    for (const r of this._getElementsByName(i.name, i.id))
      r.domElement && (r.domElement[t] = e), n.setValue(r.id, { [s]: e });
  }
  render() {
    const i = this.annotationStorage, t = this.data.id;
    this.container.classList.add("textWidgetAnnotation");
    let e = null;
    if (this.renderForms) {
      const s = i.getValue(t, { value: this.data.fieldValue });
      let n = s.value || "";
      const r = i.getValue(t, { charLimit: this.data.maxLen }).charLimit;
      r && n.length > r && (n = n.slice(0, r));
      let o = s.formattedValue || this.data.textContent?.join(`
`) || null;
      o && this.data.comb && (o = o.replaceAll(/\s+/g, ""));
      const h = {
        userValue: n,
        formattedValue: o,
        lastCommittedValue: null,
        commitKey: 1,
        focused: !1
      };
      this.data.multiLine ? (e = document.createElement("textarea"), e.textContent = o ?? n, this.data.doNotScroll && (e.style.overflowY = "hidden")) : (e = document.createElement("input"), e.type = "text", e.setAttribute("value", o ?? n), this.data.doNotScroll && (e.style.overflowX = "hidden")), this.data.hasOwnCanvas && (e.hidden = !0), cs.add(e), e.setAttribute("data-element-id", t), e.disabled = this.data.readOnly, e.name = this.data.fieldName, e.tabIndex = ba, this._setRequired(e, this.data.required), r && (e.maxLength = r), e.addEventListener("input", ((c) => {
        i.setValue(t, { value: c.target.value }), this.setPropertyOnSiblings(e, "value", c.target.value, "value"), h.formattedValue = null;
      })), e.addEventListener("resetform", ((c) => {
        const d = this.data.defaultFieldValue ?? "";
        e.value = h.userValue = d, h.formattedValue = null;
      }));
      let l = (c) => {
        const { formattedValue: d } = h;
        d != null && (c.target.value = d), c.target.scrollLeft = 0;
      };
      if (this.enableScripting && this.hasJSActions) {
        e.addEventListener("focus", ((d) => {
          if (h.focused) return;
          const { target: p } = d;
          h.userValue && (p.value = h.userValue), h.lastCommittedValue = p.value, h.commitKey = 1, this.data.actions?.Focus || (h.focused = !0);
        })), e.addEventListener("updatefromsandbox", ((d) => {
          this.showElementAndHideCanvas(d.target), this._dispatchEventFromSandbox({
            value(p) {
              h.userValue = p.detail.value ?? "", i.setValue(t, { value: h.userValue.toString() }), p.target.value = h.userValue;
            },
            formattedValue(p) {
              const { formattedValue: f } = p.detail;
              h.formattedValue = f, f != null && p.target !== document.activeElement && (p.target.value = f), i.setValue(t, { formattedValue: f });
            },
            selRange(p) {
              p.target.setSelectionRange(...p.detail.selRange);
            },
            charLimit: (p) => {
              const { charLimit: f } = p.detail, { target: v } = p;
              if (f === 0) {
                v.removeAttribute("maxLength");
                return;
              }
              v.setAttribute("maxLength", f);
              let m = h.userValue;
              m && !(m.length <= f) && (m = m.slice(0, f), v.value = h.userValue = m, i.setValue(t, { value: m }), this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
                source: this,
                detail: {
                  id: t,
                  name: "Keystroke",
                  value: m,
                  willCommit: !0,
                  commitKey: 1,
                  selStart: v.selectionStart,
                  selEnd: v.selectionEnd
                }
              }));
            }
          }, d);
        })), e.addEventListener("keydown", ((d) => {
          h.commitKey = 1;
          let p = -1;
          if (d.key === "Escape" ? p = 0 : d.key !== "Enter" || this.data.multiLine ? d.key === "Tab" && (h.commitKey = 3) : p = 2, p === -1) return;
          const { value: f } = d.target;
          h.lastCommittedValue !== f && (h.lastCommittedValue = f, h.userValue = f, this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
            source: this,
            detail: {
              id: t,
              name: "Keystroke",
              value: f,
              willCommit: !0,
              commitKey: p,
              selStart: d.target.selectionStart,
              selEnd: d.target.selectionEnd
            }
          }));
        }));
        const c = l;
        l = null, e.addEventListener("blur", ((d) => {
          if (!h.focused || !d.relatedTarget) return;
          this.data.actions?.Blur || (h.focused = !1);
          const { value: p } = d.target;
          h.userValue = p, h.lastCommittedValue !== p && this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
            source: this,
            detail: {
              id: t,
              name: "Keystroke",
              value: p,
              willCommit: !0,
              commitKey: h.commitKey,
              selStart: d.target.selectionStart,
              selEnd: d.target.selectionEnd
            }
          }), c(d);
        })), this.data.actions?.Keystroke && e.addEventListener("beforeinput", ((d) => {
          h.lastCommittedValue = null;
          const { data: p, target: f } = d, { value: v, selectionStart: m, selectionEnd: b } = f;
          let w = m, A = b;
          switch (d.inputType) {
            case "deleteWordBackward": {
              const y = v.substring(0, m).match(/\w*[^\w]*$/);
              y && (w -= y[0].length);
              break;
            }
            case "deleteWordForward": {
              const y = v.substring(m).match(/^[^\w]*\w*/);
              y && (A += y[0].length);
              break;
            }
            case "deleteContentBackward":
              m === b && (w -= 1);
              break;
            case "deleteContentForward":
              m === b && (A += 1);
          }
          d.preventDefault(), this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
            source: this,
            detail: {
              id: t,
              name: "Keystroke",
              value: v,
              change: p || "",
              willCommit: !1,
              selStart: w,
              selEnd: A
            }
          });
        })), this._setEventListeners(e, h, [
          ["focus", "Focus"],
          ["blur", "Blur"],
          ["mousedown", "Mouse Down"],
          ["mouseenter", "Mouse Enter"],
          ["mouseleave", "Mouse Exit"],
          ["mouseup", "Mouse Up"]
        ], ((d) => d.target.value));
      }
      if (l && e.addEventListener("blur", l), this.data.comb) {
        const c = (this.data.rect[2] - this.data.rect[0]) / r;
        e.classList.add("comb"), e.style.letterSpacing = `calc(${c}px * var(--scale-factor) - 1ch)`;
      }
    } else
      e = document.createElement("div"), e.textContent = this.data.fieldValue, e.style.verticalAlign = "middle", e.style.display = "table-cell", this.data.hasOwnCanvas && (e.hidden = !0);
    return this._setTextStyle(e), this._setBackgroundColor(e), this._setDefaultPropertiesFromJS(e), this.container.append(e), this.container;
  }
}, sf = class extends ds {
  constructor(i) {
    super(i, { isRenderable: !!i.data.hasOwnCanvas });
  }
}, nf = class extends ds {
  constructor(i) {
    super(i, { isRenderable: i.renderForms });
  }
  render() {
    const i = this.annotationStorage, t = this.data, e = t.id;
    let s = i.getValue(e, { value: t.exportValue === t.fieldValue }).value;
    typeof s == "string" && (s = s !== "Off", i.setValue(e, { value: s })), this.container.classList.add("buttonWidgetAnnotation", "checkBox");
    const n = document.createElement("input");
    return cs.add(n), n.setAttribute("data-element-id", e), n.disabled = t.readOnly, this._setRequired(n, this.data.required), n.type = "checkbox", n.name = t.fieldName, s && n.setAttribute("checked", !0), n.setAttribute("exportValue", t.exportValue), n.tabIndex = ba, n.addEventListener("change", ((r) => {
      const { name: o, checked: h } = r.target;
      for (const l of this._getElementsByName(o, e)) {
        const c = h && l.exportValue === t.exportValue;
        l.domElement && (l.domElement.checked = c), i.setValue(l.id, { value: c });
      }
      i.setValue(e, { value: h });
    })), n.addEventListener("resetform", ((r) => {
      const o = t.defaultFieldValue || "Off";
      r.target.checked = o === t.exportValue;
    })), this.enableScripting && this.hasJSActions && (n.addEventListener("updatefromsandbox", ((r) => {
      this._dispatchEventFromSandbox({ value(o) {
        o.target.checked = o.detail.value !== "Off", i.setValue(e, { value: o.target.checked });
      } }, r);
    })), this._setEventListeners(n, null, [
      ["change", "Validate"],
      ["change", "Action"],
      ["focus", "Focus"],
      ["blur", "Blur"],
      ["mousedown", "Mouse Down"],
      ["mouseenter", "Mouse Enter"],
      ["mouseleave", "Mouse Exit"],
      ["mouseup", "Mouse Up"]
    ], ((r) => r.target.checked))), this._setBackgroundColor(n), this._setDefaultPropertiesFromJS(n), this.container.append(n), this.container;
  }
}, au = class extends ds {
  constructor(i) {
    super(i, { isRenderable: i.renderForms });
  }
  render() {
    this.container.classList.add("buttonWidgetAnnotation", "radioButton");
    const i = this.annotationStorage, t = this.data, e = t.id;
    let s = i.getValue(e, { value: t.fieldValue === t.buttonValue }).value;
    if (typeof s == "string" && (s = s !== t.buttonValue, i.setValue(e, { value: s })), s) for (const r of this._getElementsByName(t.fieldName, e)) i.setValue(r.id, { value: !1 });
    const n = document.createElement("input");
    if (cs.add(n), n.setAttribute("data-element-id", e), n.disabled = t.readOnly, this._setRequired(n, this.data.required), n.type = "radio", n.name = t.fieldName, s && n.setAttribute("checked", !0), n.tabIndex = ba, n.addEventListener("change", ((r) => {
      const { name: o, checked: h } = r.target;
      for (const l of this._getElementsByName(o, e)) i.setValue(l.id, { value: !1 });
      i.setValue(e, { value: h });
    })), n.addEventListener("resetform", ((r) => {
      const o = t.defaultFieldValue;
      r.target.checked = o != null && o === t.buttonValue;
    })), this.enableScripting && this.hasJSActions) {
      const r = t.buttonValue;
      n.addEventListener("updatefromsandbox", ((o) => {
        this._dispatchEventFromSandbox({ value: (h) => {
          const l = r === h.detail.value;
          for (const c of this._getElementsByName(h.target.name)) {
            const d = l && c.id === e;
            c.domElement && (c.domElement.checked = d), i.setValue(c.id, { value: d });
          }
        } }, o);
      })), this._setEventListeners(n, null, [
        ["change", "Validate"],
        ["change", "Action"],
        ["focus", "Focus"],
        ["blur", "Blur"],
        ["mousedown", "Mouse Down"],
        ["mouseenter", "Mouse Enter"],
        ["mouseleave", "Mouse Exit"],
        ["mouseup", "Mouse Up"]
      ], ((o) => o.target.checked));
    }
    return this._setBackgroundColor(n), this._setDefaultPropertiesFromJS(n), this.container.append(n), this.container;
  }
}, af = class extends nu {
  constructor(i) {
    super(i, { ignoreBorder: i.data.hasAppearance });
  }
  render() {
    const i = super.render();
    i.classList.add("buttonWidgetAnnotation", "pushButton");
    const t = i.lastChild;
    return this.enableScripting && this.hasJSActions && t && (this._setDefaultPropertiesFromJS(t), t.addEventListener("updatefromsandbox", ((e) => {
      this._dispatchEventFromSandbox({}, e);
    }))), i;
  }
}, rf = class extends ds {
  constructor(i) {
    super(i, { isRenderable: i.renderForms });
  }
  render() {
    this.container.classList.add("choiceWidgetAnnotation");
    const i = this.annotationStorage, t = this.data.id, e = i.getValue(t, { value: this.data.fieldValue }), s = document.createElement("select");
    cs.add(s), s.setAttribute("data-element-id", t), s.disabled = this.data.readOnly, this._setRequired(s, this.data.required), s.name = this.data.fieldName, s.tabIndex = ba;
    let n = this.data.combo && this.data.options.length > 0;
    this.data.combo || (s.size = this.data.options.length, this.data.multiSelect && (s.multiple = !0)), s.addEventListener("resetform", ((c) => {
      const d = this.data.defaultFieldValue;
      for (const p of s.options) p.selected = p.value === d;
    }));
    for (const c of this.data.options) {
      const d = document.createElement("option");
      d.textContent = c.displayValue, d.value = c.exportValue, e.value.includes(c.exportValue) && (d.setAttribute("selected", !0), n = !1), s.append(d);
    }
    let r = null;
    if (n) {
      const c = document.createElement("option");
      c.value = " ", c.setAttribute("hidden", !0), c.setAttribute("selected", !0), s.prepend(c), r = () => {
        c.remove(), s.removeEventListener("input", r), r = null;
      }, s.addEventListener("input", r);
    }
    const o = (c) => {
      const d = c ? "value" : "textContent", { options: p, multiple: f } = s;
      return f ? Array.prototype.filter.call(p, ((v) => v.selected)).map(((v) => v[d])) : p.selectedIndex === -1 ? null : p[p.selectedIndex][d];
    };
    let h = o(!1);
    const l = (c) => {
      const d = c.target.options;
      return Array.prototype.map.call(d, ((p) => ({
        displayValue: p.textContent,
        exportValue: p.value
      })));
    };
    return this.enableScripting && this.hasJSActions ? (s.addEventListener("updatefromsandbox", ((c) => {
      this._dispatchEventFromSandbox({
        value(d) {
          r?.();
          const p = d.detail.value, f = new Set(Array.isArray(p) ? p : [p]);
          for (const v of s.options) v.selected = f.has(v.value);
          i.setValue(t, { value: o(!0) }), h = o(!1);
        },
        multipleSelection(d) {
          s.multiple = !0;
        },
        remove(d) {
          const p = s.options, f = d.detail.remove;
          p[f].selected = !1, s.remove(f), p.length > 0 && Array.prototype.findIndex.call(p, ((v) => v.selected)) === -1 && (p[0].selected = !0), i.setValue(t, {
            value: o(!0),
            items: l(d)
          }), h = o(!1);
        },
        clear(d) {
          for (; s.length !== 0; ) s.remove(0);
          i.setValue(t, {
            value: null,
            items: []
          }), h = o(!1);
        },
        insert(d) {
          const { index: p, displayValue: f, exportValue: v } = d.detail.insert, m = s.children[p], b = document.createElement("option");
          b.textContent = f, b.value = v, m ? m.before(b) : s.append(b), i.setValue(t, {
            value: o(!0),
            items: l(d)
          }), h = o(!1);
        },
        items(d) {
          const { items: p } = d.detail;
          for (; s.length !== 0; ) s.remove(0);
          for (const f of p) {
            const { displayValue: v, exportValue: m } = f, b = document.createElement("option");
            b.textContent = v, b.value = m, s.append(b);
          }
          s.options.length > 0 && (s.options[0].selected = !0), i.setValue(t, {
            value: o(!0),
            items: l(d)
          }), h = o(!1);
        },
        indices(d) {
          const p = new Set(d.detail.indices);
          for (const f of d.target.options) f.selected = p.has(f.index);
          i.setValue(t, { value: o(!0) }), h = o(!1);
        },
        editable(d) {
          d.target.disabled = !d.detail.editable;
        }
      }, c);
    })), s.addEventListener("input", ((c) => {
      const d = o(!0), p = o(!1);
      i.setValue(t, { value: d }), c.preventDefault(), this.linkService.eventBus?.dispatch("dispatcheventinsandbox", {
        source: this,
        detail: {
          id: t,
          name: "Keystroke",
          value: h,
          change: p,
          changeEx: d,
          willCommit: !1,
          commitKey: 1,
          keyDown: !1
        }
      });
    })), this._setEventListeners(s, null, [
      ["focus", "Focus"],
      ["blur", "Blur"],
      ["mousedown", "Mouse Down"],
      ["mouseenter", "Mouse Enter"],
      ["mouseleave", "Mouse Exit"],
      ["mouseup", "Mouse Up"],
      ["input", "Action"],
      ["input", "Validate"]
    ], ((c) => c.target.value))) : s.addEventListener("input", (function(c) {
      i.setValue(t, { value: o(!0) });
    })), this.data.combo && this._setTextStyle(s), this._setBackgroundColor(s), this._setDefaultPropertiesFromJS(s), this.container.append(s), this.container;
  }
}, ol = class extends mt {
  constructor(i) {
    const { data: t, elements: e } = i;
    super(i, { isRenderable: mt._hasPopupData(t) }), this.elements = e, this.popup = null;
  }
  render() {
    this.container.classList.add("popupAnnotation");
    const i = this.popup = new of({
      container: this.container,
      color: this.data.color,
      titleObj: this.data.titleObj,
      modificationDate: this.data.modificationDate,
      contentsObj: this.data.contentsObj,
      richText: this.data.richText,
      rect: this.data.rect,
      parentRect: this.data.parentRect || null,
      parent: this.parent,
      elements: this.elements,
      open: this.data.open
    }), t = [];
    for (const e of this.elements)
      e.popup = i, e.container.ariaHasPopup = "dialog", t.push(e.data.id), e.addHighlightArea();
    return this.container.setAttribute("aria-controls", t.map(((e) => `${Il}${e}`)).join(",")), this.container;
  }
}, to = /* @__PURE__ */ new WeakMap(), jc = /* @__PURE__ */ new WeakMap(), Vc = /* @__PURE__ */ new WeakMap(), eo = /* @__PURE__ */ new WeakMap(), yn = /* @__PURE__ */ new WeakMap(), dt = /* @__PURE__ */ new WeakMap(), Gi = /* @__PURE__ */ new WeakMap(), Qa = /* @__PURE__ */ new WeakMap(), hl = /* @__PURE__ */ new WeakMap(), ll = /* @__PURE__ */ new WeakMap(), io = /* @__PURE__ */ new WeakMap(), rs = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap(), Ji = /* @__PURE__ */ new WeakMap(), cl = /* @__PURE__ */ new WeakMap(), Yi = /* @__PURE__ */ new WeakMap(), eh = /* @__PURE__ */ new WeakMap(), ws = /* @__PURE__ */ new WeakMap(), xn = /* @__PURE__ */ new WeakMap(), wt = /* @__PURE__ */ new WeakSet(), of = class {
  constructor({ container: i, color: t, elements: e, titleObj: s, modificationDate: n, contentsObj: r, richText: o, parent: h, rect: l, parentRect: c, open: d }) {
    G(this, wt), _(this, to, g(wt, this, cf).bind(this)), _(this, jc, g(wt, this, ru).bind(this)), _(this, Vc, g(wt, this, ul).bind(this)), _(this, eo, g(wt, this, dl).bind(this)), _(this, yn, null), _(this, dt, null), _(this, Gi, null), _(this, Qa, null), _(this, hl, null), _(this, ll, null), _(this, io, null), _(this, rs, !1), _(this, $e, null), _(this, Ji, null), _(this, cl, null), _(this, Yi, null), _(this, eh, null), _(this, ws, null), _(this, xn, !1), u(dt, this, i), u(eh, this, s), u(Gi, this, r), u(Yi, this, o), u(ll, this, h), u(yn, this, t), u(cl, this, l), u(io, this, c), u(hl, this, e), u(Qa, this, wd.toDateObject(n)), this.trigger = e.flatMap(((p) => p.getElementsToTriggerPopup()));
    for (const p of this.trigger)
      p.addEventListener("click", a(eo, this)), p.addEventListener("mouseenter", a(Vc, this)), p.addEventListener("mouseleave", a(jc, this)), p.classList.add("popupTriggerArea");
    for (const p of e) p.container?.addEventListener("keydown", a(to, this));
    a(dt, this).hidden = !0, d && g(wt, this, dl).call(this);
  }
  render() {
    if (a($e, this)) return;
    const i = u($e, this, document.createElement("div"));
    if (i.className = "popup", a(yn, this)) {
      const n = i.style.outlineColor = C.makeHexColor(...a(yn, this));
      CSS.supports("background-color", "color-mix(in srgb, red 30%, white)") ? i.style.backgroundColor = `color-mix(in srgb, ${n} 30%, white)` : i.style.backgroundColor = C.makeHexColor(...a(yn, this).map(((o) => Math.floor(0.7 * (255 - o) + o))));
    }
    const t = document.createElement("span");
    t.className = "header";
    const e = document.createElement("h1");
    if (t.append(e), { dir: e.dir, str: e.textContent } = a(eh, this), i.append(t), a(Qa, this)) {
      const n = document.createElement("span");
      n.classList.add("popupDate"), n.setAttribute("data-l10n-id", "pdfjs-annotation-date-time-string"), n.setAttribute("data-l10n-args", JSON.stringify({ dateObj: a(Qa, this).valueOf() })), t.append(n);
    }
    const s = Ul.call(g(wt, this));
    if (s)
      iu.render({
        xfaHtml: s,
        intent: "richText",
        div: i
      }), i.lastChild.classList.add("richText", "popupContent");
    else {
      const n = this._formatContents(a(Gi, this));
      i.append(n);
    }
    a(dt, this).append(i);
  }
  _formatContents({ str: i, dir: t }) {
    const e = document.createElement("p");
    e.classList.add("popupContent"), e.dir = t;
    const s = i.split(/(?:\r\n?|\n)/);
    for (let n = 0, r = s.length; n < r; ++n) {
      const o = s[n];
      e.append(document.createTextNode(o)), n < r - 1 && e.append(document.createElement("br"));
    }
    return e;
  }
  updateEdited({ rect: i, popupContent: t }) {
    a(ws, this) || u(ws, this, {
      contentsObj: a(Gi, this),
      richText: a(Yi, this)
    }), i && u(Ji, this, null), t && (u(Yi, this, g(wt, this, lf).call(this, t)), u(Gi, this, null)), a($e, this)?.remove(), u($e, this, null);
  }
  resetEdited() {
    a(ws, this) && ({ contentsObj: Vr(u, [Gi, this])._, richText: Vr(u, [Yi, this])._ } = a(ws, this), u(ws, this, null), a($e, this)?.remove(), u($e, this, null), u(Ji, this, null));
  }
  forceHide() {
    u(xn, this, this.isVisible), a(xn, this) && (a(dt, this).hidden = !0);
  }
  maybeShow() {
    a(xn, this) && (a($e, this) || g(wt, this, ul).call(this), u(xn, this, !1), a(dt, this).hidden = !1);
  }
  get isVisible() {
    return a(dt, this).hidden === !1;
  }
};
function Ul() {
  const i = a(Yi, this), t = a(Gi, this);
  return !i?.str || t?.str && t.str !== i.str ? null : a(Yi, this).html || null;
}
function Uc() {
  return Ul.call(g(wt, this))?.attributes?.style?.fontSize || 0;
}
function hf() {
  return Ul.call(g(wt, this))?.attributes?.style?.color || null;
}
function lf(i) {
  const t = [], e = {
    str: i,
    html: {
      name: "div",
      attributes: { dir: "auto" },
      children: [{
        name: "p",
        children: t
      }]
    }
  }, s = { style: {
    color: hf.call(g(wt, this)),
    fontSize: Uc.call(g(wt, this)) ? `calc(${Uc.call(g(wt, this))}px * var(--scale-factor))` : ""
  } };
  for (const n of i.split(`
`)) t.push({
    name: "span",
    value: n,
    attributes: s
  });
  return e;
}
function cf(i) {
  i.altKey || i.shiftKey || i.ctrlKey || i.metaKey || (i.key === "Enter" || i.key === "Escape" && a(rs, this)) && g(wt, this, dl).call(this);
}
function df() {
  if (a(Ji, this) !== null) return;
  const { page: { view: i }, viewport: { rawDims: { pageWidth: t, pageHeight: e, pageX: s, pageY: n } } } = a(ll, this);
  let r = !!a(io, this), o = r ? a(io, this) : a(cl, this);
  for (const f of a(hl, this)) if (!o || C.intersect(f.data.rect, o) !== null) {
    o = f.data.rect, r = !0;
    break;
  }
  const h = C.normalizeRect([
    o[0],
    i[3] - o[1] + i[1],
    o[2],
    i[3] - o[3] + i[1]
  ]), l = r ? o[2] - o[0] + 5 : 0, c = h[0] + l, d = h[1];
  u(Ji, this, [100 * (c - s) / t, 100 * (d - n) / e]);
  const { style: p } = a(dt, this);
  p.left = `${a(Ji, this)[0]}%`, p.top = `${a(Ji, this)[1]}%`;
}
function dl() {
  u(rs, this, !a(rs, this)), a(rs, this) ? (g(wt, this, ul).call(this), a(dt, this).addEventListener("click", a(eo, this)), a(dt, this).addEventListener("keydown", a(to, this))) : (g(wt, this, ru).call(this), a(dt, this).removeEventListener("click", a(eo, this)), a(dt, this).removeEventListener("keydown", a(to, this)));
}
function ul() {
  a($e, this) || this.render(), this.isVisible ? a(rs, this) && a(dt, this).classList.add("focused") : (g(wt, this, df).call(this), a(dt, this).hidden = !1, a(dt, this).style.zIndex = parseInt(a(dt, this).style.zIndex) + 1e3);
}
function ru() {
  a(dt, this).classList.remove("focused"), !a(rs, this) && this.isVisible && (a(dt, this).hidden = !0, a(dt, this).style.zIndex = parseInt(a(dt, this).style.zIndex) - 1e3);
}
var ou = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), this.textContent = i.data.textContent, this.textPosition = i.data.textPosition, this.annotationEditorType = W.FREETEXT;
  }
  render() {
    if (this.container.classList.add("freeTextAnnotation"), this.textContent) {
      const i = document.createElement("div");
      i.classList.add("annotationTextContent"), i.setAttribute("role", "comment");
      for (const t of this.textContent) {
        const e = document.createElement("span");
        e.textContent = t, i.append(e);
      }
      this.container.append(i);
    }
    return !this.data.popupRef && this.hasPopupData && this._createPopup(), this._editOnDoubleClick(), this.container;
  }
}, ih = /* @__PURE__ */ new WeakMap(), uf = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), _(this, ih, null);
  }
  render() {
    this.container.classList.add("lineAnnotation");
    const i = this.data, { width: t, height: e } = Ci(i.rect), s = this.svgFactory.create(t, e, !0), n = u(ih, this, this.svgFactory.createElement("svg:line"));
    return n.setAttribute("x1", i.rect[2] - i.lineCoordinates[0]), n.setAttribute("y1", i.rect[3] - i.lineCoordinates[1]), n.setAttribute("x2", i.rect[2] - i.lineCoordinates[2]), n.setAttribute("y2", i.rect[3] - i.lineCoordinates[3]), n.setAttribute("stroke-width", i.borderStyle.width || 1), n.setAttribute("stroke", "transparent"), n.setAttribute("fill", "transparent"), s.append(n), this.container.append(s), !i.popupRef && this.hasPopupData && this._createPopup(), this.container;
  }
  getElementsToTriggerPopup() {
    return a(ih, this);
  }
  addHighlightArea() {
    this.container.classList.add("highlightArea");
  }
}, sh = /* @__PURE__ */ new WeakMap(), pf = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), _(this, sh, null);
  }
  render() {
    this.container.classList.add("squareAnnotation");
    const i = this.data, { width: t, height: e } = Ci(i.rect), s = this.svgFactory.create(t, e, !0), n = i.borderStyle.width, r = u(sh, this, this.svgFactory.createElement("svg:rect"));
    return r.setAttribute("x", n / 2), r.setAttribute("y", n / 2), r.setAttribute("width", t - n), r.setAttribute("height", e - n), r.setAttribute("stroke-width", n || 1), r.setAttribute("stroke", "transparent"), r.setAttribute("fill", "transparent"), s.append(r), this.container.append(s), !i.popupRef && this.hasPopupData && this._createPopup(), this.container;
  }
  getElementsToTriggerPopup() {
    return a(sh, this);
  }
  addHighlightArea() {
    this.container.classList.add("highlightArea");
  }
}, nh = /* @__PURE__ */ new WeakMap(), gf = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), _(this, nh, null);
  }
  render() {
    this.container.classList.add("circleAnnotation");
    const i = this.data, { width: t, height: e } = Ci(i.rect), s = this.svgFactory.create(t, e, !0), n = i.borderStyle.width, r = u(nh, this, this.svgFactory.createElement("svg:ellipse"));
    return r.setAttribute("cx", t / 2), r.setAttribute("cy", e / 2), r.setAttribute("rx", t / 2 - n / 2), r.setAttribute("ry", e / 2 - n / 2), r.setAttribute("stroke-width", n || 1), r.setAttribute("stroke", "transparent"), r.setAttribute("fill", "transparent"), s.append(r), this.container.append(s), !i.popupRef && this.hasPopupData && this._createPopup(), this.container;
  }
  getElementsToTriggerPopup() {
    return a(nh, this);
  }
  addHighlightArea() {
    this.container.classList.add("highlightArea");
  }
}, ah = /* @__PURE__ */ new WeakMap(), hu = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), _(this, ah, null), this.containerClassName = "polylineAnnotation", this.svgElementName = "svg:polyline";
  }
  render() {
    this.container.classList.add(this.containerClassName);
    const { data: { rect: i, vertices: t, borderStyle: e, popupRef: s } } = this;
    if (!t) return this.container;
    const { width: n, height: r } = Ci(i), o = this.svgFactory.create(n, r, !0);
    let h = [];
    for (let c = 0, d = t.length; c < d; c += 2) {
      const p = t[c] - i[0], f = i[3] - t[c + 1];
      h.push(`${p},${f}`);
    }
    h = h.join(" ");
    const l = u(ah, this, this.svgFactory.createElement(this.svgElementName));
    return l.setAttribute("points", h), l.setAttribute("stroke-width", e.width || 1), l.setAttribute("stroke", "transparent"), l.setAttribute("fill", "transparent"), o.append(l), this.container.append(o), !s && this.hasPopupData && this._createPopup(), this.container;
  }
  getElementsToTriggerPopup() {
    return a(ah, this);
  }
  addHighlightArea() {
    this.container.classList.add("highlightArea");
  }
}, ff = class extends hu {
  constructor(i) {
    super(i), this.containerClassName = "polygonAnnotation", this.svgElementName = "svg:polygon";
  }
}, mf = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    });
  }
  render() {
    return this.container.classList.add("caretAnnotation"), !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container;
  }
}, rh = /* @__PURE__ */ new WeakMap(), Sn = /* @__PURE__ */ new WeakMap(), oh = /* @__PURE__ */ new WeakSet(), ql = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), G(this, oh), _(this, rh, null), _(this, Sn, []), this.containerClassName = "inkAnnotation", this.svgElementName = "svg:polyline", this.annotationEditorType = this.data.it === "InkHighlight" ? W.HIGHLIGHT : W.INK;
  }
  render() {
    this.container.classList.add(this.containerClassName);
    const { data: { rect: i, rotation: t, inkLists: e, borderStyle: s, popupRef: n } } = this, { transform: r, width: o, height: h } = g(oh, this, qc).call(this, t, i), l = this.svgFactory.create(o, h, !0), c = u(rh, this, this.svgFactory.createElement("svg:g"));
    l.append(c), c.setAttribute("stroke-width", s.width || 1), c.setAttribute("stroke-linecap", "round"), c.setAttribute("stroke-linejoin", "round"), c.setAttribute("stroke-miterlimit", 10), c.setAttribute("stroke", "transparent"), c.setAttribute("fill", "transparent"), c.setAttribute("transform", r);
    for (let d = 0, p = e.length; d < p; d++) {
      const f = this.svgFactory.createElement(this.svgElementName);
      a(Sn, this).push(f), f.setAttribute("points", e[d].join(",")), c.append(f);
    }
    return !n && this.hasPopupData && this._createPopup(), this.container.append(l), this._editOnDoubleClick(), this.container;
  }
  updateEdited(i) {
    super.updateEdited(i);
    const { thickness: t, points: e, rect: s } = i, n = a(rh, this);
    if (t >= 0 && n.setAttribute("stroke-width", t || 1), e) for (let r = 0, o = a(Sn, this).length; r < o; r++) a(Sn, this)[r].setAttribute("points", e[r].join(","));
    if (s) {
      const { transform: r, width: o, height: h } = g(oh, this, qc).call(this, this.data.rotation, s);
      n.parentElement.setAttribute("viewBox", `0 0 ${o} ${h}`), n.setAttribute("transform", r);
    }
  }
  getElementsToTriggerPopup() {
    return a(Sn, this);
  }
  addHighlightArea() {
    this.container.classList.add("highlightArea");
  }
};
function qc(i, t) {
  switch (i) {
    case 90:
      return {
        transform: `rotate(90) translate(${-t[0]},${t[1]}) scale(1,-1)`,
        width: t[3] - t[1],
        height: t[2] - t[0]
      };
    case 180:
      return {
        transform: `rotate(180) translate(${-t[2]},${t[1]}) scale(1,-1)`,
        width: t[2] - t[0],
        height: t[3] - t[1]
      };
    case 270:
      return {
        transform: `rotate(270) translate(${-t[2]},${t[3]}) scale(1,-1)`,
        width: t[3] - t[1],
        height: t[2] - t[0]
      };
    default:
      return {
        transform: `translate(${-t[0]},${t[3]}) scale(1,-1)`,
        width: t[2] - t[0],
        height: t[3] - t[1]
      };
  }
}
var lu = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0,
      createQuadrilaterals: !0
    }), this.annotationEditorType = W.HIGHLIGHT;
  }
  render() {
    return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("highlightAnnotation"), this._editOnDoubleClick(), this.container;
  }
}, vf = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0,
      createQuadrilaterals: !0
    });
  }
  render() {
    return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("underlineAnnotation"), this.container;
  }
}, _f = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0,
      createQuadrilaterals: !0
    });
  }
  render() {
    return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("squigglyAnnotation"), this.container;
  }
}, bf = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0,
      createQuadrilaterals: !0
    });
  }
  render() {
    return !this.data.popupRef && this.hasPopupData && this._createPopup(), this.container.classList.add("strikeoutAnnotation"), this.container;
  }
}, cu = class extends mt {
  constructor(i) {
    super(i, {
      isRenderable: !0,
      ignoreBorder: !0
    }), this.annotationEditorType = W.STAMP;
  }
  render() {
    return this.container.classList.add("stampAnnotation"), this.container.setAttribute("role", "img"), !this.data.popupRef && this.hasPopupData && this._createPopup(), this._editOnDoubleClick(), this.container;
  }
}, hh = /* @__PURE__ */ new WeakMap(), lh = /* @__PURE__ */ new WeakSet(), wf = class extends mt {
  constructor(i) {
    super(i, { isRenderable: !0 }), G(this, lh), _(this, hh, null);
    const { file: t } = this.data;
    this.filename = t.filename, this.content = t.content, this.linkService.eventBus?.dispatch("fileattachmentannotation", {
      source: this,
      ...t
    });
  }
  render() {
    this.container.classList.add("fileAttachmentAnnotation");
    const { container: i, data: t } = this;
    let e;
    t.hasAppearance || t.fillAlpha === 0 ? e = document.createElement("div") : (e = document.createElement("img"), e.src = `${this.imageResourcesPath}annotation-${/paperclip/i.test(t.name) ? "paperclip" : "pushpin"}.svg`, t.fillAlpha && t.fillAlpha < 1 && (e.style = `filter: opacity(${Math.round(100 * t.fillAlpha)}%);`)), e.addEventListener("dblclick", g(lh, this, Xc).bind(this)), u(hh, this, e);
    const { isMac: s } = Gt.platform;
    return i.addEventListener("keydown", ((n) => {
      n.key === "Enter" && (s ? n.metaKey : n.ctrlKey) && g(lh, this, Xc).call(this);
    })), !t.popupRef && this.hasPopupData ? this._createPopup() : e.classList.add("popupTriggerArea"), i.append(e), i;
  }
  getElementsToTriggerPopup() {
    return a(hh, this);
  }
  addHighlightArea() {
    this.container.classList.add("highlightArea");
  }
};
function Xc() {
  this.downloadManager?.openOrDownloadData(this.content, this.filename);
}
var pl = /* @__PURE__ */ new WeakMap(), aa = /* @__PURE__ */ new WeakMap(), kn = /* @__PURE__ */ new WeakMap(), gl = /* @__PURE__ */ new WeakMap(), Ja = /* @__PURE__ */ new WeakSet(), Af = class {
  constructor({ div: i, accessibilityManager: t, annotationCanvasMap: e, annotationEditorUIManager: s, page: n, viewport: r, structTreeLayer: o }) {
    G(this, Ja), _(this, pl, null), _(this, aa, null), _(this, kn, /* @__PURE__ */ new Map()), _(this, gl, null), this.div = i, u(pl, this, t), u(aa, this, e), u(gl, this, o || null), this.page = n, this.viewport = r, this.zIndex = 0, this._annotationEditorUIManager = s;
  }
  hasEditableAnnotations() {
    return a(kn, this).size > 0;
  }
  async render(i) {
    const { annotations: t } = i, e = this.div;
    os(e, this.viewport);
    const s = /* @__PURE__ */ new Map(), n = {
      data: null,
      layer: e,
      linkService: i.linkService,
      downloadManager: i.downloadManager,
      imageResourcesPath: i.imageResourcesPath || "",
      renderForms: i.renderForms !== !1,
      svgFactory: new Vl(),
      annotationStorage: i.annotationStorage || new zl(),
      enableScripting: i.enableScripting === !0,
      hasJSActions: i.hasJSActions,
      fieldObjects: i.fieldObjects,
      parent: this,
      elements: null
    };
    for (const r of t) {
      if (r.noHTML) continue;
      const o = r.annotationType === vd;
      if (o) {
        const c = s.get(r.id);
        if (!c) continue;
        n.elements = c;
      } else {
        const { width: c, height: d } = Ci(r.rect);
        if (c <= 0 || d <= 0) continue;
      }
      n.data = r;
      const h = Qg.create(n);
      if (!h.isRenderable) continue;
      if (!o && r.popupRef) {
        const c = s.get(r.popupRef);
        c ? c.push(h) : s.set(r.popupRef, [h]);
      }
      const l = h.render();
      r.hidden && (l.style.visibility = "hidden"), await g(Ja, this, yf).call(this, l, r.id), h._isEditable && (a(kn, this).set(h.data.id, h), this._annotationEditorUIManager?.renderAnnotationElement(h));
    }
    g(Ja, this, Yc).call(this);
  }
  update({ viewport: i }) {
    const t = this.div;
    this.viewport = i, os(t, { rotation: i.rotation }), g(Ja, this, Yc).call(this), t.hidden = !1;
  }
  getEditableAnnotations() {
    return Array.from(a(kn, this).values());
  }
  getEditableAnnotation(i) {
    return a(kn, this).get(i);
  }
};
async function yf(i, t) {
  const e = i.firstChild || i, s = e.id = `${Il}${t}`, n = await a(gl, this)?.getAriaAttributes(s);
  if (n) for (const [r, o] of n) e.setAttribute(r, o);
  this.div.append(i), a(pl, this)?.moveElementInDOM(this.div, i, e, !1);
}
function Yc() {
  if (!a(aa, this)) return;
  const i = this.div;
  for (const [t, e] of a(aa, this)) {
    const s = i.querySelector(`[data-annotation-id="${t}"]`);
    if (!s) continue;
    e.className = "annotationContent";
    const { firstChild: n } = s;
    n ? n.nodeName === "CANVAS" ? n.replaceWith(e) : n.classList.contains("annotationContent") ? n.after(e) : n.before(e) : s.append(e);
  }
  a(aa, this).clear();
}
var Lr = /\r\n?|\n/g, Xe = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap(), ch = /* @__PURE__ */ new WeakMap(), Mn = /* @__PURE__ */ new WeakMap(), be = /* @__PURE__ */ new WeakMap(), ae = /* @__PURE__ */ new WeakSet(), Ti = class xt extends Q {
  static get _keyboardManager() {
    const t = xt.prototype, e = (r) => r.isEmpty(), s = hs.TRANSLATE_SMALL, n = hs.TRANSLATE_BIG;
    return $(this, "_keyboardManager", new _a([
      [
        [
          "ctrl+s",
          "mac+meta+s",
          "ctrl+p",
          "mac+meta+p"
        ],
        t.commitOrRemove,
        { bubbles: !0 }
      ],
      [[
        "ctrl+Enter",
        "mac+meta+Enter",
        "Escape",
        "mac+Escape"
      ], t.commitOrRemove],
      [
        ["ArrowLeft", "mac+ArrowLeft"],
        t._translateEmpty,
        {
          args: [-s, 0],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowLeft", "mac+shift+ArrowLeft"],
        t._translateEmpty,
        {
          args: [-n, 0],
          checker: e
        }
      ],
      [
        ["ArrowRight", "mac+ArrowRight"],
        t._translateEmpty,
        {
          args: [s, 0],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowRight", "mac+shift+ArrowRight"],
        t._translateEmpty,
        {
          args: [n, 0],
          checker: e
        }
      ],
      [
        ["ArrowUp", "mac+ArrowUp"],
        t._translateEmpty,
        {
          args: [0, -s],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowUp", "mac+shift+ArrowUp"],
        t._translateEmpty,
        {
          args: [0, -n],
          checker: e
        }
      ],
      [
        ["ArrowDown", "mac+ArrowDown"],
        t._translateEmpty,
        {
          args: [0, s],
          checker: e
        }
      ],
      [
        ["ctrl+ArrowDown", "mac+shift+ArrowDown"],
        t._translateEmpty,
        {
          args: [0, n],
          checker: e
        }
      ]
    ]));
  }
  constructor(t) {
    super({
      ...t,
      name: "freeTextEditor"
    }), G(this, ae), _(this, Xe, void 0), _(this, _e, ""), _(this, ch, `${this.id}-editor`), _(this, Mn, null), _(this, be, void 0), u(Xe, this, t.color || xt._defaultColor || Q._defaultLineColor), u(be, this, t.fontSize || xt._defaultFontSize);
  }
  static initialize(t, e) {
    Q.initialize(t, e);
    const s = getComputedStyle(document.documentElement);
    this._internalPadding = parseFloat(s.getPropertyValue("--freetext-padding"));
  }
  static updateDefaultParams(t, e) {
    switch (t) {
      case U.FREETEXT_SIZE:
        xt._defaultFontSize = e;
        break;
      case U.FREETEXT_COLOR:
        xt._defaultColor = e;
    }
  }
  updateParams(t, e) {
    switch (t) {
      case U.FREETEXT_SIZE:
        g(ae, this, xf).call(this, e);
        break;
      case U.FREETEXT_COLOR:
        g(ae, this, Sf).call(this, e);
    }
  }
  static get defaultPropertiesToUpdate() {
    return [[U.FREETEXT_SIZE, xt._defaultFontSize], [U.FREETEXT_COLOR, xt._defaultColor || Q._defaultLineColor]];
  }
  get propertiesToUpdate() {
    return [[U.FREETEXT_SIZE, a(be, this)], [U.FREETEXT_COLOR, a(Xe, this)]];
  }
  _translateEmpty(t, e) {
    this._uiManager.translateSelectedEditors(t, e, !0);
  }
  getInitialTranslation() {
    const t = this.parentScale;
    return [-xt._internalPadding * t, -(xt._internalPadding + a(be, this)) * t];
  }
  rebuild() {
    this.parent && (super.rebuild(), this.div !== null && (this.isAttachedToDOM || this.parent.add(this)));
  }
  enableEditMode() {
    if (this.isInEditMode()) return;
    this.parent.setEditingState(!1), this.parent.updateToolbar(W.FREETEXT), super.enableEditMode(), this.overlayDiv.classList.remove("enabled"), this.editorDiv.contentEditable = !0, this._isDraggable = !1, this.div.removeAttribute("aria-activedescendant"), u(Mn, this, new AbortController());
    const t = this._uiManager.combinedSignal(a(Mn, this));
    this.editorDiv.addEventListener("keydown", this.editorDivKeydown.bind(this), { signal: t }), this.editorDiv.addEventListener("focus", this.editorDivFocus.bind(this), { signal: t }), this.editorDiv.addEventListener("blur", this.editorDivBlur.bind(this), { signal: t }), this.editorDiv.addEventListener("input", this.editorDivInput.bind(this), { signal: t }), this.editorDiv.addEventListener("paste", this.editorDivPaste.bind(this), { signal: t });
  }
  disableEditMode() {
    this.isInEditMode() && (this.parent.setEditingState(!0), super.disableEditMode(), this.overlayDiv.classList.add("enabled"), this.editorDiv.contentEditable = !1, this.div.setAttribute("aria-activedescendant", a(ch, this)), this._isDraggable = !0, a(Mn, this)?.abort(), u(Mn, this, null), this.div.focus({ preventScroll: !0 }), this.isEditing = !1, this.parent.div.classList.add("freetextEditing"));
  }
  focusin(t) {
    this._focusEventsAllowed && (super.focusin(t), t.target !== this.editorDiv && this.editorDiv.focus());
  }
  onceAdded(t) {
    this.width || (this.enableEditMode(), t && this.editorDiv.focus(), this._initialOptions?.isCentered && this.center(), this._initialOptions = null);
  }
  isEmpty() {
    return !this.editorDiv || this.editorDiv.innerText.trim() === "";
  }
  remove() {
    this.isEditing = !1, this.parent && (this.parent.setEditingState(!0), this.parent.div.classList.add("freetextEditing")), super.remove();
  }
  commit() {
    if (!this.isInEditMode()) return;
    super.commit(), this.disableEditMode();
    const t = a(_e, this), e = u(_e, this, g(ae, this, kf).call(this).trimEnd());
    if (t === e) return;
    const s = (n) => {
      u(_e, this, n), n ? (g(ae, this, dh).call(this), this._uiManager.rebuild(this), g(ae, this, fl).call(this)) : this.remove();
    };
    this.addCommands({
      cmd: () => {
        s(e);
      },
      undo: () => {
        s(t);
      },
      mustExec: !1
    }), g(ae, this, fl).call(this);
  }
  shouldGetKeyboardEvents() {
    return this.isInEditMode();
  }
  enterInEditMode() {
    this.enableEditMode(), this.editorDiv.focus();
  }
  dblclick(t) {
    this.enterInEditMode();
  }
  keydown(t) {
    t.target === this.div && t.key === "Enter" && (this.enterInEditMode(), t.preventDefault());
  }
  editorDivKeydown(t) {
    xt._keyboardManager.exec(this, t);
  }
  editorDivFocus(t) {
    this.isEditing = !0;
  }
  editorDivBlur(t) {
    this.isEditing = !1;
  }
  editorDivInput(t) {
    this.parent.div.classList.toggle("freetextEditing", this.isEmpty());
  }
  disableEditing() {
    this.editorDiv.setAttribute("role", "comment"), this.editorDiv.removeAttribute("aria-multiline");
  }
  enableEditing() {
    this.editorDiv.setAttribute("role", "textbox"), this.editorDiv.setAttribute("aria-multiline", !0);
  }
  render() {
    if (this.div) return this.div;
    let t, e;
    this.width && (t = this.x, e = this.y), super.render(), this.editorDiv = document.createElement("div"), this.editorDiv.className = "internal", this.editorDiv.setAttribute("id", a(ch, this)), this.editorDiv.setAttribute("data-l10n-id", "pdfjs-free-text2"), this.editorDiv.setAttribute("data-l10n-attrs", "default-content"), this.enableEditing(), this.editorDiv.contentEditable = !0;
    const { style: s } = this.editorDiv;
    if (s.fontSize = `calc(${a(be, this)}px * var(--scale-factor))`, s.color = a(Xe, this), this.div.append(this.editorDiv), this.overlayDiv = document.createElement("div"), this.overlayDiv.classList.add("overlay", "enabled"), this.div.append(this.overlayDiv), Yr(this, this.div, ["dblclick", "keydown"]), this.width) {
      const [n, r] = this.parentDimensions;
      if (this.annotationElementId) {
        const { position: o } = this._initialData;
        let [h, l] = this.getInitialTranslation();
        [h, l] = this.pageTranslationToScreen(h, l);
        const [c, d] = this.pageDimensions, [p, f] = this.pageTranslation;
        let v, m;
        switch (this.rotation) {
          case 0:
            v = t + (o[0] - p) / c, m = e + this.height - (o[1] - f) / d;
            break;
          case 90:
            v = t + (o[0] - p) / c, m = e - (o[1] - f) / d, [h, l] = [l, -h];
            break;
          case 180:
            v = t - this.width + (o[0] - p) / c, m = e - (o[1] - f) / d, [h, l] = [-h, -l];
            break;
          case 270:
            v = t + (o[0] - p - this.height * d) / c, m = e + (o[1] - f - this.width * c) / d, [h, l] = [-l, h];
        }
        this.setAt(v * n, m * r, h, l);
      } else this.setAt(t * n, e * r, this.width * n, this.height * r);
      g(ae, this, dh).call(this), this._isDraggable = !0, this.editorDiv.contentEditable = !1;
    } else
      this._isDraggable = !1, this.editorDiv.contentEditable = !0;
    return this.div;
  }
  editorDivPaste(t) {
    const e = t.clipboardData || window.clipboardData, { types: s } = e;
    if (s.length === 1 && s[0] === "text/plain") return;
    t.preventDefault();
    const n = Kc.call(xt, e.getData("text") || "").replaceAll(Lr, `
`);
    if (!n) return;
    const r = window.getSelection();
    if (!r.rangeCount) return;
    this.editorDiv.normalize(), r.deleteFromDocument();
    const o = r.getRangeAt(0);
    if (!n.includes(`
`)) {
      o.insertNode(document.createTextNode(n)), this.editorDiv.normalize(), r.collapseToStart();
      return;
    }
    const { startContainer: h, startOffset: l } = o, c = [], d = [];
    if (h.nodeType === Node.TEXT_NODE) {
      const v = h.parentElement;
      if (d.push(h.nodeValue.slice(l).replaceAll(Lr, "")), v !== this.editorDiv) {
        let m = c;
        for (const b of this.editorDiv.childNodes) b !== v ? m.push(ml.call(xt, b)) : m = d;
      }
      c.push(h.nodeValue.slice(0, l).replaceAll(Lr, ""));
    } else if (h === this.editorDiv) {
      let v = c, m = 0;
      for (const b of this.editorDiv.childNodes)
        m++ === l && (v = d), v.push(ml.call(xt, b));
    }
    u(_e, this, `${c.join(`
`)}${n}${d.join(`
`)}`), g(ae, this, dh).call(this);
    const p = new Range();
    let f = c.reduce(((v, m) => v + m.length), 0);
    for (const { firstChild: v } of this.editorDiv.childNodes) if (v.nodeType === Node.TEXT_NODE) {
      const m = v.nodeValue.length;
      if (f <= m) {
        p.setStart(v, f), p.setEnd(v, f);
        break;
      }
      f -= m;
    }
    r.removeAllRanges(), r.addRange(p);
  }
  get contentDiv() {
    return this.editorDiv;
  }
  static async deserialize(t, e, s) {
    let n = null;
    if (t instanceof ou) {
      const { data: { defaultAppearanceData: { fontSize: o, fontColor: h }, rect: l, rotation: c, id: d, popupRef: p }, textContent: f, textPosition: v, parent: { page: { pageNumber: m } } } = t;
      if (!f || f.length === 0) return null;
      n = t = {
        annotationType: W.FREETEXT,
        color: Array.from(h),
        fontSize: o,
        value: f.join(`
`),
        position: v,
        pageIndex: m - 1,
        rect: l.slice(0),
        rotation: c,
        id: d,
        deleted: !1,
        popupRef: p
      };
    }
    const r = await super.deserialize(t, e, s);
    return u(be, r, t.fontSize), u(Xe, r, C.makeHexColor(...t.color)), u(_e, r, Kc.call(xt, t.value)), r.annotationElementId = t.id || null, r._initialData = n, r;
  }
  serialize(t = !1) {
    if (this.isEmpty()) return null;
    if (this.deleted) return this.serializeDeleted();
    const e = xt._internalPadding * this.parentScale, s = this.getRect(e, e), n = Q._colorManager.convert(this.isAttachedToDOM ? getComputedStyle(this.editorDiv).color : a(Xe, this)), r = {
      annotationType: W.FREETEXT,
      color: n,
      fontSize: a(be, this),
      value: g(ae, this, Mf).call(this),
      pageIndex: this.pageIndex,
      rect: s,
      rotation: this.rotation,
      structTreeParentId: this._structTreeParentId
    };
    return t ? r : this.annotationElementId && !g(ae, this, Ef).call(this, r) ? null : (r.id = this.annotationElementId, r);
  }
  renderAnnotationElement(t) {
    const e = super.renderAnnotationElement(t);
    if (this.deleted) return e;
    const { style: s } = e;
    s.fontSize = `calc(${a(be, this)}px * var(--scale-factor))`, s.color = a(Xe, this), e.replaceChildren();
    for (const r of a(_e, this).split(`
`)) {
      const o = document.createElement("div");
      o.append(r ? document.createTextNode(r) : document.createElement("br")), e.append(o);
    }
    const n = xt._internalPadding * this.parentScale;
    return t.updateEdited({
      rect: this.getRect(n, n),
      popupContent: a(_e, this)
    }), e;
  }
  resetAnnotationElement(t) {
    super.resetAnnotationElement(t), t.resetEdited();
  }
};
dd = Ti;
function xf(i) {
  const t = (s) => {
    this.editorDiv.style.fontSize = `calc(${s}px * var(--scale-factor))`, this.translate(0, -(s - a(be, this)) * this.parentScale), u(be, this, s), g(ae, this, fl).call(this);
  }, e = a(be, this);
  this.addCommands({
    cmd: t.bind(this, i),
    undo: t.bind(this, e),
    post: this._uiManager.updateUI.bind(this._uiManager, this),
    mustExec: !0,
    type: U.FREETEXT_SIZE,
    overwriteIfSameType: !0,
    keepUndo: !0
  });
}
function Sf(i) {
  const t = (s) => {
    u(Xe, this, this.editorDiv.style.color = s);
  }, e = a(Xe, this);
  this.addCommands({
    cmd: t.bind(this, i),
    undo: t.bind(this, e),
    post: this._uiManager.updateUI.bind(this._uiManager, this),
    mustExec: !0,
    type: U.FREETEXT_COLOR,
    overwriteIfSameType: !0,
    keepUndo: !0
  });
}
function kf() {
  const i = [];
  this.editorDiv.normalize();
  let t = null;
  for (const e of this.editorDiv.childNodes) (t?.nodeType !== Node.TEXT_NODE || e.nodeName !== "BR") && (i.push(ml.call(dd, e)), t = e);
  return i.join(`
`);
}
function fl() {
  const [i, t] = this.parentDimensions;
  let e;
  if (this.isAttachedToDOM) e = this.div.getBoundingClientRect();
  else {
    const { currentLayer: s, div: n } = this, r = n.style.display, o = n.classList.contains("hidden");
    n.classList.remove("hidden"), n.style.display = "hidden", s.div.append(this.div), e = n.getBoundingClientRect(), n.remove(), n.style.display = r, n.classList.toggle("hidden", o);
  }
  this.rotation % 180 == this.parentRotation % 180 ? (this.width = e.width / i, this.height = e.height / t) : (this.width = e.height / i, this.height = e.width / t), this.fixAndSetPosition();
}
function ml(i) {
  return (i.nodeType === Node.TEXT_NODE ? i.nodeValue : i.innerText).replaceAll(Lr, "");
}
function dh() {
  if (this.editorDiv.replaceChildren(), a(_e, this)) for (const i of a(_e, this).split(`
`)) {
    const t = document.createElement("div");
    t.append(i ? document.createTextNode(i) : document.createElement("br")), this.editorDiv.append(t);
  }
}
function Mf() {
  return a(_e, this).replaceAll(" ", " ");
}
function Kc(i) {
  return i.replaceAll(" ", " ");
}
function Ef(i) {
  const { value: t, fontSize: e, color: s, pageIndex: n } = this._initialData;
  return this._hasBeenMoved || i.value !== t || i.fontSize !== e || i.color.some(((r, o) => r !== s[o])) || i.pageIndex !== n;
}
L(Ti, "_freeTextDefaultContent", "");
L(Ti, "_internalPadding", 0);
L(Ti, "_defaultColor", null);
L(Ti, "_defaultFontSize", 10);
L(Ti, "_type", "freetext");
L(Ti, "_editorType", W.FREETEXT);
var E = class {
  toSVGPath() {
    et("Abstract method `toSVGPath` must be implemented.");
  }
  get box() {
    et("Abstract getter `box` must be implemented.");
  }
  serialize(i, t) {
    et("Abstract method `serialize` must be implemented.");
  }
  static _rescale(i, t, e, s, n, r) {
    r || (r = new Float32Array(i.length));
    for (let o = 0, h = i.length; o < h; o += 2)
      r[o] = t + i[o] * s, r[o + 1] = e + i[o + 1] * n;
    return r;
  }
  static _rescaleAndSwap(i, t, e, s, n, r) {
    r || (r = new Float32Array(i.length));
    for (let o = 0, h = i.length; o < h; o += 2)
      r[o] = t + i[o + 1] * s, r[o + 1] = e + i[o] * n;
    return r;
  }
  static _translate(i, t, e, s) {
    s || (s = new Float32Array(i.length));
    for (let n = 0, r = i.length; n < r; n += 2)
      s[n] = t + i[n], s[n + 1] = e + i[n + 1];
    return s;
  }
  static svgRound(i) {
    return Math.round(1e4 * i);
  }
  static _normalizePoint(i, t, e, s, n) {
    switch (n) {
      case 90:
        return [1 - t / e, i / s];
      case 180:
        return [1 - i / e, 1 - t / s];
      case 270:
        return [t / e, 1 - i / s];
      default:
        return [i / e, t / s];
    }
  }
  static _normalizePagePoint(i, t, e) {
    switch (e) {
      case 90:
        return [1 - t, i];
      case 180:
        return [1 - i, 1 - t];
      case 270:
        return [t, 1 - i];
      default:
        return [i, t];
    }
  }
  static createBezierPoints(i, t, e, s, n, r) {
    return [
      (i + 5 * e) / 6,
      (t + 5 * s) / 6,
      (5 * e + n) / 6,
      (5 * s + r) / 6,
      (e + n) / 2,
      (s + r) / 2
    ];
  }
};
L(E, "PRECISION", 1e-4);
var xe = /* @__PURE__ */ new WeakMap(), Ye = /* @__PURE__ */ new WeakMap(), Fr = /* @__PURE__ */ new WeakMap(), Nr = /* @__PURE__ */ new WeakMap(), ui = /* @__PURE__ */ new WeakMap(), V = /* @__PURE__ */ new WeakMap(), ra = /* @__PURE__ */ new WeakMap(), oa = /* @__PURE__ */ new WeakMap(), uh = /* @__PURE__ */ new WeakMap(), ph = /* @__PURE__ */ new WeakMap(), Or = /* @__PURE__ */ new WeakMap(), Za = /* @__PURE__ */ new WeakMap(), As = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakSet(), du = class {
  constructor({ x: i, y: t }, e, s, n, r, o = 0) {
    G(this, Ae), _(this, xe, void 0), _(this, Ye, []), _(this, Fr, void 0), _(this, Nr, void 0), _(this, ui, []), _(this, V, new Float32Array(18)), _(this, ra, void 0), _(this, oa, void 0), _(this, uh, void 0), _(this, ph, void 0), _(this, Or, void 0), _(this, Za, void 0), _(this, As, []), u(xe, this, e), u(Za, this, n * s), u(Nr, this, r), a(V, this).set([
      NaN,
      NaN,
      NaN,
      NaN,
      i,
      t
    ], 6), u(Fr, this, o), u(ph, this, uu._ * s), u(uh, this, Lf._ * s), u(Or, this, s), a(As, this).push(i, t);
  }
  isEmpty() {
    return isNaN(a(V, this)[8]);
  }
  add({ x: i, y: t }) {
    u(ra, this, i), u(oa, this, t);
    const [e, s, n, r] = a(xe, this);
    let [o, h, l, c] = a(V, this).subarray(8, 12);
    const d = i - l, p = t - c, f = Math.hypot(d, p);
    if (f < a(uh, this)) return !1;
    const v = f - a(ph, this), m = v / f, b = m * d, w = m * p;
    let A = o, y = h;
    o = l, h = c, l += b, c += w, a(As, this)?.push(i, t);
    const x = b / v, S = -w / v * a(Za, this), M = x * a(Za, this);
    return a(V, this).set(a(V, this).subarray(2, 8), 0), a(V, this).set([l + S, c + M], 4), a(V, this).set(a(V, this).subarray(14, 18), 12), a(V, this).set([l - S, c - M], 16), isNaN(a(V, this)[6]) ? (a(ui, this).length === 0 && (a(V, this).set([o + S, h + M], 2), a(ui, this).push(NaN, NaN, NaN, NaN, (o + S - e) / n, (h + M - s) / r), a(V, this).set([o - S, h - M], 14), a(Ye, this).push(NaN, NaN, NaN, NaN, (o - S - e) / n, (h - M - s) / r)), a(V, this).set([
      A,
      y,
      o,
      h,
      l,
      c
    ], 6), !this.isEmpty()) : (a(V, this).set([
      A,
      y,
      o,
      h,
      l,
      c
    ], 6), Math.abs(Math.atan2(y - h, A - o) - Math.atan2(w, b)) < Math.PI / 2 ? ([o, h, l, c] = a(V, this).subarray(2, 6), a(ui, this).push(NaN, NaN, NaN, NaN, ((o + l) / 2 - e) / n, ((h + c) / 2 - s) / r), [o, h, A, y] = a(V, this).subarray(14, 18), a(Ye, this).push(NaN, NaN, NaN, NaN, ((A + o) / 2 - e) / n, ((y + h) / 2 - s) / r), !0) : ([A, y, o, h, l, c] = a(V, this).subarray(0, 6), a(ui, this).push(((A + 5 * o) / 6 - e) / n, ((y + 5 * h) / 6 - s) / r, ((5 * o + l) / 6 - e) / n, ((5 * h + c) / 6 - s) / r, ((o + l) / 2 - e) / n, ((h + c) / 2 - s) / r), [l, c, o, h, A, y] = a(V, this).subarray(12, 18), a(Ye, this).push(((A + 5 * o) / 6 - e) / n, ((y + 5 * h) / 6 - s) / r, ((5 * o + l) / 6 - e) / n, ((5 * h + c) / 6 - s) / r, ((o + l) / 2 - e) / n, ((h + c) / 2 - s) / r), !0));
  }
  toSVGPath() {
    if (this.isEmpty()) return "";
    const i = a(ui, this), t = a(Ye, this);
    if (isNaN(a(V, this)[6]) && !this.isEmpty()) return g(Ae, this, Cf).call(this);
    const e = [];
    e.push(`M${i[4]} ${i[5]}`);
    for (let s = 6; s < i.length; s += 6) isNaN(i[s]) ? e.push(`L${i[s + 4]} ${i[s + 5]}`) : e.push(`C${i[s]} ${i[s + 1]} ${i[s + 2]} ${i[s + 3]} ${i[s + 4]} ${i[s + 5]}`);
    g(Ae, this, Tf).call(this, e);
    for (let s = t.length - 6; s >= 6; s -= 6) isNaN(t[s]) ? e.push(`L${t[s + 4]} ${t[s + 5]}`) : e.push(`C${t[s]} ${t[s + 1]} ${t[s + 2]} ${t[s + 3]} ${t[s + 4]} ${t[s + 5]}`);
    return g(Ae, this, Pf).call(this, e), e.join(" ");
  }
  newFreeDrawOutline(i, t, e, s, n, r) {
    return new pu(i, t, e, s, n, r);
  }
  getOutlines() {
    const i = a(ui, this), t = a(Ye, this), e = a(V, this), [s, n, r, o] = a(xe, this), h = new Float32Array((a(As, this)?.length ?? 0) + 2);
    for (let d = 0, p = h.length - 2; d < p; d += 2)
      h[d] = (a(As, this)[d] - s) / r, h[d + 1] = (a(As, this)[d + 1] - n) / o;
    if (h[h.length - 2] = (a(ra, this) - s) / r, h[h.length - 1] = (a(oa, this) - n) / o, isNaN(e[6]) && !this.isEmpty()) return g(Ae, this, Rf).call(this, h);
    const l = new Float32Array(a(ui, this).length + 24 + a(Ye, this).length);
    let c = i.length;
    for (let d = 0; d < c; d += 2) isNaN(i[d]) ? l[d] = l[d + 1] = NaN : (l[d] = i[d], l[d + 1] = i[d + 1]);
    c = g(Ae, this, If).call(this, l, c);
    for (let d = t.length - 6; d >= 6; d -= 6) for (let p = 0; p < 6; p += 2) isNaN(t[d + p]) ? (l[c] = l[c + 1] = NaN, c += 2) : (l[c] = t[d + p], l[c + 1] = t[d + p + 1], c += 2);
    return g(Ae, this, Df).call(this, l, c), this.newFreeDrawOutline(l, h, a(xe, this), a(Or, this), a(Fr, this), a(Nr, this));
  }
};
function vo() {
  const i = a(V, this).subarray(4, 6), t = a(V, this).subarray(16, 18), [e, s, n, r] = a(xe, this);
  return [
    (a(ra, this) + (i[0] - t[0]) / 2 - e) / n,
    (a(oa, this) + (i[1] - t[1]) / 2 - s) / r,
    (a(ra, this) + (t[0] - i[0]) / 2 - e) / n,
    (a(oa, this) + (t[1] - i[1]) / 2 - s) / r
  ];
}
function Cf() {
  const [i, t, e, s] = a(xe, this), [n, r, o, h] = g(Ae, this, vo).call(this);
  return `M${(a(V, this)[2] - i) / e} ${(a(V, this)[3] - t) / s} L${(a(V, this)[4] - i) / e} ${(a(V, this)[5] - t) / s} L${n} ${r} L${o} ${h} L${(a(V, this)[16] - i) / e} ${(a(V, this)[17] - t) / s} L${(a(V, this)[14] - i) / e} ${(a(V, this)[15] - t) / s} Z`;
}
function Pf(i) {
  const t = a(Ye, this);
  i.push(`L${t[4]} ${t[5]} Z`);
}
function Tf(i) {
  const [t, e, s, n] = a(xe, this), r = a(V, this).subarray(4, 6), o = a(V, this).subarray(16, 18), [h, l, c, d] = g(Ae, this, vo).call(this);
  i.push(`L${(r[0] - t) / s} ${(r[1] - e) / n} L${h} ${l} L${c} ${d} L${(o[0] - t) / s} ${(o[1] - e) / n}`);
}
function Rf(i) {
  const t = a(V, this), [e, s, n, r] = a(xe, this), [o, h, l, c] = g(Ae, this, vo).call(this), d = new Float32Array(36);
  return d.set([
    NaN,
    NaN,
    NaN,
    NaN,
    (t[2] - e) / n,
    (t[3] - s) / r,
    NaN,
    NaN,
    NaN,
    NaN,
    (t[4] - e) / n,
    (t[5] - s) / r,
    NaN,
    NaN,
    NaN,
    NaN,
    o,
    h,
    NaN,
    NaN,
    NaN,
    NaN,
    l,
    c,
    NaN,
    NaN,
    NaN,
    NaN,
    (t[16] - e) / n,
    (t[17] - s) / r,
    NaN,
    NaN,
    NaN,
    NaN,
    (t[14] - e) / n,
    (t[15] - s) / r
  ], 0), this.newFreeDrawOutline(d, i, a(xe, this), a(Or, this), a(Fr, this), a(Nr, this));
}
function Df(i, t) {
  const e = a(Ye, this);
  return i.set([
    NaN,
    NaN,
    NaN,
    NaN,
    e[4],
    e[5]
  ], t), t + 6;
}
function If(i, t) {
  const e = a(V, this).subarray(4, 6), s = a(V, this).subarray(16, 18), [n, r, o, h] = a(xe, this), [l, c, d, p] = g(Ae, this, vo).call(this);
  return i.set([
    NaN,
    NaN,
    NaN,
    NaN,
    (e[0] - n) / o,
    (e[1] - r) / h,
    NaN,
    NaN,
    NaN,
    NaN,
    l,
    c,
    NaN,
    NaN,
    NaN,
    NaN,
    d,
    p,
    NaN,
    NaN,
    NaN,
    NaN,
    (s[0] - n) / o,
    (s[1] - r) / h
  ], t), t + 24;
}
var uu = { _: 8 }, Lf = { _: uu._ + 2 }, tr = /* @__PURE__ */ new WeakMap(), jn = /* @__PURE__ */ new WeakMap(), Zi = /* @__PURE__ */ new WeakMap(), gh = /* @__PURE__ */ new WeakMap(), ue = /* @__PURE__ */ new WeakMap(), fh = /* @__PURE__ */ new WeakMap(), ft = /* @__PURE__ */ new WeakMap(), Qc = /* @__PURE__ */ new WeakSet(), pu = class extends E {
  constructor(i, t, e, s, n, r) {
    super(), G(this, Qc), _(this, tr, void 0), _(this, jn, new Float32Array(4)), _(this, Zi, void 0), _(this, gh, void 0), _(this, ue, void 0), _(this, fh, void 0), _(this, ft, void 0), u(ft, this, i), u(ue, this, t), u(tr, this, e), u(fh, this, s), u(Zi, this, n), u(gh, this, r), this.lastPoint = [NaN, NaN], g(Qc, this, Ff).call(this, r);
    const [o, h, l, c] = a(jn, this);
    for (let d = 0, p = i.length; d < p; d += 2)
      i[d] = (i[d] - o) / l, i[d + 1] = (i[d + 1] - h) / c;
    for (let d = 0, p = t.length; d < p; d += 2)
      t[d] = (t[d] - o) / l, t[d + 1] = (t[d + 1] - h) / c;
  }
  toSVGPath() {
    const i = [`M${a(ft, this)[4]} ${a(ft, this)[5]}`];
    for (let t = 6, e = a(ft, this).length; t < e; t += 6) isNaN(a(ft, this)[t]) ? i.push(`L${a(ft, this)[t + 4]} ${a(ft, this)[t + 5]}`) : i.push(`C${a(ft, this)[t]} ${a(ft, this)[t + 1]} ${a(ft, this)[t + 2]} ${a(ft, this)[t + 3]} ${a(ft, this)[t + 4]} ${a(ft, this)[t + 5]}`);
    return i.push("Z"), i.join(" ");
  }
  serialize([i, t, e, s], n) {
    const r = e - i, o = s - t;
    let h, l;
    switch (n) {
      case 0:
        h = E._rescale(a(ft, this), i, s, r, -o), l = E._rescale(a(ue, this), i, s, r, -o);
        break;
      case 90:
        h = E._rescaleAndSwap(a(ft, this), i, t, r, o), l = E._rescaleAndSwap(a(ue, this), i, t, r, o);
        break;
      case 180:
        h = E._rescale(a(ft, this), e, t, -r, o), l = E._rescale(a(ue, this), e, t, -r, o);
        break;
      case 270:
        h = E._rescaleAndSwap(a(ft, this), e, s, -r, -o), l = E._rescaleAndSwap(a(ue, this), e, s, -r, -o);
    }
    return {
      outline: Array.from(h),
      points: [Array.from(l)]
    };
  }
  get box() {
    return a(jn, this);
  }
  newOutliner(i, t, e, s, n, r = 0) {
    return new du(i, t, e, s, n, r);
  }
  getNewOutline(i, t) {
    const [e, s, n, r] = a(jn, this), [o, h, l, c] = a(tr, this), d = n * l, p = r * c, f = e * l + o, v = s * c + h, m = this.newOutliner({
      x: a(ue, this)[0] * d + f,
      y: a(ue, this)[1] * p + v
    }, a(tr, this), a(fh, this), i, a(gh, this), t ?? a(Zi, this));
    for (let b = 2; b < a(ue, this).length; b += 2) m.add({
      x: a(ue, this)[b] * d + f,
      y: a(ue, this)[b + 1] * p + v
    });
    return m.getOutlines();
  }
};
function Ff(i) {
  const t = a(ft, this);
  let e = t[4], s = t[5], n = e, r = s, o = e, h = s, l = e, c = s;
  const d = i ? Math.max : Math.min;
  for (let f = 6, v = t.length; f < v; f += 6) {
    if (isNaN(t[f]))
      n = Math.min(n, t[f + 4]), r = Math.min(r, t[f + 5]), o = Math.max(o, t[f + 4]), h = Math.max(h, t[f + 5]), c < t[f + 5] ? (l = t[f + 4], c = t[f + 5]) : c === t[f + 5] && (l = d(l, t[f + 4]));
    else {
      const m = C.bezierBoundingBox(e, s, ...t.slice(f, f + 6));
      n = Math.min(n, m[0]), r = Math.min(r, m[1]), o = Math.max(o, m[2]), h = Math.max(h, m[3]), c < m[3] ? (l = m[2], c = m[3]) : c === m[3] && (l = d(l, m[2]));
    }
    e = t[f + 4], s = t[f + 5];
  }
  const p = a(jn, this);
  p[0] = n - a(Zi, this), p[1] = r - a(Zi, this), p[2] = o - n + 2 * a(Zi, this), p[3] = h - r + 2 * a(Zi, this), this.lastPoint = [l, c];
}
var vl = /* @__PURE__ */ new WeakMap(), _l = /* @__PURE__ */ new WeakMap(), ys = /* @__PURE__ */ new WeakMap(), ti = /* @__PURE__ */ new WeakMap(), Qe = /* @__PURE__ */ new WeakSet(), bl = class {
  constructor(i, t = 0, e = 0, s = !0) {
    G(this, Qe), _(this, vl, void 0), _(this, _l, void 0), _(this, ys, []), _(this, ti, []);
    let n = 1 / 0, r = -1 / 0, o = 1 / 0, h = -1 / 0;
    const l = 10 ** -4;
    for (const { x: b, y: w, width: A, height: y } of i) {
      const x = Math.floor((b - t) / l) * l, S = Math.ceil((b + A + t) / l) * l, M = Math.floor((w - t) / l) * l, P = Math.ceil((w + y + t) / l) * l, k = [
        x,
        M,
        P,
        !0
      ], F = [
        S,
        M,
        P,
        !1
      ];
      a(ys, this).push(k, F), n = Math.min(n, x), r = Math.max(r, S), o = Math.min(o, M), h = Math.max(h, P);
    }
    const c = r - n + 2 * e, d = h - o + 2 * e, p = n - e, f = o - e, v = a(ys, this).at(s ? -1 : -2), m = [v[0], v[2]];
    for (const b of a(ys, this)) {
      const [w, A, y] = b;
      b[0] = (w - p) / c, b[1] = (A - f) / d, b[2] = (y - f) / d;
    }
    u(vl, this, new Float32Array([
      p,
      f,
      c,
      d
    ])), u(_l, this, m);
  }
  getOutlines() {
    a(ys, this).sort(((t, e) => t[0] - e[0] || t[1] - e[1] || t[2] - e[2]));
    const i = [];
    for (const t of a(ys, this)) t[3] ? (i.push(...g(Qe, this, Jc).call(this, t)), g(Qe, this, Of).call(this, t)) : (g(Qe, this, Wf).call(this, t), i.push(...g(Qe, this, Jc).call(this, t)));
    return g(Qe, this, Nf).call(this, i);
  }
};
function Nf(i) {
  const t = [], e = /* @__PURE__ */ new Set();
  for (const r of i) {
    const [o, h, l] = r;
    t.push([
      o,
      h,
      r
    ], [
      o,
      l,
      r
    ]);
  }
  t.sort(((r, o) => r[1] - o[1] || r[0] - o[0]));
  for (let r = 0, o = t.length; r < o; r += 2) {
    const h = t[r][2], l = t[r + 1][2];
    h.push(l), l.push(h), e.add(h), e.add(l);
  }
  const s = [];
  let n;
  for (; e.size > 0; ) {
    const r = e.values().next().value;
    let [o, h, l, c, d] = r;
    e.delete(r);
    let p = o, f = h;
    for (n = [o, l], s.push(n); ; ) {
      let v;
      if (e.has(c)) v = c;
      else {
        if (!e.has(d)) break;
        v = d;
      }
      e.delete(v), [o, h, l, c, d] = v, p !== o && (n.push(p, f, o, f === h ? h : l), p = o), f = f === h ? l : h;
    }
    n.push(p, f);
  }
  return new Bf(s, a(vl, this), a(_l, this));
}
function Xl(i) {
  const t = a(ti, this);
  let e = 0, s = t.length - 1;
  for (; e <= s; ) {
    const n = e + s >> 1, r = t[n][0];
    if (r === i) return n;
    r < i ? e = n + 1 : s = n - 1;
  }
  return s + 1;
}
function Of([, i, t]) {
  const e = g(Qe, this, Xl).call(this, i);
  a(ti, this).splice(e, 0, [i, t]);
}
function Wf([, i, t]) {
  const e = g(Qe, this, Xl).call(this, i);
  for (let s = e; s < a(ti, this).length; s++) {
    const [n, r] = a(ti, this)[s];
    if (n !== i) break;
    if (n === i && r === t) {
      a(ti, this).splice(s, 1);
      return;
    }
  }
  for (let s = e - 1; s >= 0; s--) {
    const [n, r] = a(ti, this)[s];
    if (n !== i) break;
    if (n === i && r === t) {
      a(ti, this).splice(s, 1);
      return;
    }
  }
}
function Jc(i) {
  const [t, e, s] = i, n = [[
    t,
    e,
    s
  ]], r = g(Qe, this, Xl).call(this, s);
  for (let o = 0; o < r; o++) {
    const [h, l] = a(ti, this)[o];
    for (let c = 0, d = n.length; c < d; c++) {
      const [, p, f] = n[c];
      if (!(l <= p || f <= h)) if (p >= h) if (f > l) n[c][1] = l;
      else {
        if (d === 1) return [];
        n.splice(c, 1), c--, d--;
      }
      else
        n[c][2] = h, f > l && n.push([
          t,
          l,
          f
        ]);
    }
  }
  return n;
}
var mh = /* @__PURE__ */ new WeakMap(), er = /* @__PURE__ */ new WeakMap(), Bf = class extends E {
  constructor(i, t, e) {
    super(), _(this, mh, void 0), _(this, er, void 0), u(er, this, i), u(mh, this, t), this.lastPoint = e;
  }
  toSVGPath() {
    const i = [];
    for (const t of a(er, this)) {
      let [e, s] = t;
      i.push(`M${e} ${s}`);
      for (let n = 2; n < t.length; n += 2) {
        const r = t[n], o = t[n + 1];
        r === e ? (i.push(`V${o}`), s = o) : o === s && (i.push(`H${r}`), e = r);
      }
      i.push("Z");
    }
    return i.join(" ");
  }
  serialize([i, t, e, s], n) {
    const r = [], o = e - i, h = s - t;
    for (const l of a(er, this)) {
      const c = new Array(l.length);
      for (let d = 0; d < l.length; d += 2)
        c[d] = i + l[d] * o, c[d + 1] = s - l[d + 1] * h;
      r.push(c);
    }
    return r;
  }
  get box() {
    return a(mh, this);
  }
  get classNamesForOutlining() {
    return ["highlightOutline"];
  }
}, wl = class extends du {
  newFreeDrawOutline(i, t, e, s, n, r) {
    return new Hf(i, t, e, s, n, r);
  }
}, Hf = class extends pu {
  newOutliner(i, t, e, s, n, r = 0) {
    return new wl(i, t, e, s, n, r);
  }
}, ze = /* @__PURE__ */ new WeakMap(), En = /* @__PURE__ */ new WeakMap(), Wr = /* @__PURE__ */ new WeakMap(), kt = /* @__PURE__ */ new WeakMap(), Al = /* @__PURE__ */ new WeakMap(), ir = /* @__PURE__ */ new WeakMap(), vh = /* @__PURE__ */ new WeakMap(), yl = /* @__PURE__ */ new WeakMap(), Xs = /* @__PURE__ */ new WeakMap(), Je = /* @__PURE__ */ new WeakMap(), Br = /* @__PURE__ */ new WeakMap(), lt = /* @__PURE__ */ new WeakSet(), Yl = class ji {
  static get _keyboardManager() {
    return $(this, "_keyboardManager", new _a([
      [["Escape", "mac+Escape"], ji.prototype._hideDropdownFromKeyboard],
      [[" ", "mac+ "], ji.prototype._colorSelectFromKeyboard],
      [[
        "ArrowDown",
        "ArrowRight",
        "mac+ArrowDown",
        "mac+ArrowRight"
      ], ji.prototype._moveToNext],
      [[
        "ArrowUp",
        "ArrowLeft",
        "mac+ArrowUp",
        "mac+ArrowLeft"
      ], ji.prototype._moveToPrevious],
      [["Home", "mac+Home"], ji.prototype._moveToBeginning],
      [["End", "mac+End"], ji.prototype._moveToEnd]
    ]));
  }
  constructor({ editor: t = null, uiManager: e = null }) {
    G(this, lt), _(this, ze, null), _(this, En, null), _(this, Wr, void 0), _(this, kt, null), _(this, Al, !1), _(this, ir, !1), _(this, vh, null), _(this, yl, void 0), _(this, Xs, null), _(this, Je, null), _(this, Br, void 0), t ? (u(ir, this, !1), u(Br, this, U.HIGHLIGHT_COLOR), u(vh, this, t)) : (u(ir, this, !0), u(Br, this, U.HIGHLIGHT_DEFAULT_COLOR)), u(Je, this, t?._uiManager || e), u(yl, this, a(Je, this)._eventBus), u(Wr, this, t?.color || a(Je, this)?.highlightColors.values().next().value || "#FFFF98"), xl._ || (xl._ = Object.freeze({
      blue: "pdfjs-editor-colorpicker-blue",
      green: "pdfjs-editor-colorpicker-green",
      pink: "pdfjs-editor-colorpicker-pink",
      red: "pdfjs-editor-colorpicker-red",
      yellow: "pdfjs-editor-colorpicker-yellow"
    }));
  }
  renderButton() {
    const t = u(ze, this, document.createElement("button"));
    t.className = "colorPicker", t.tabIndex = "0", t.setAttribute("data-l10n-id", "pdfjs-editor-colorpicker-button"), t.setAttribute("aria-haspopup", !0);
    const e = a(Je, this)._signal;
    t.addEventListener("click", g(lt, this, xs).bind(this), { signal: e }), t.addEventListener("keydown", g(lt, this, mu).bind(this), { signal: e });
    const s = u(En, this, document.createElement("span"));
    return s.className = "swatch", s.setAttribute("aria-hidden", !0), s.style.backgroundColor = a(Wr, this), t.append(s), t;
  }
  renderMainDropdown() {
    const t = u(kt, this, g(lt, this, gu).call(this));
    return t.setAttribute("aria-orientation", "horizontal"), t.setAttribute("aria-labelledby", "highlightColorPickerLabel"), t;
  }
  _colorSelectFromKeyboard(t) {
    if (t.target === a(ze, this)) {
      g(lt, this, xs).call(this, t);
      return;
    }
    const e = t.target.getAttribute("data-color");
    e && g(lt, this, fu).call(this, e, t);
  }
  _moveToNext(t) {
    Vi.call(g(lt, this)) ? t.target !== a(ze, this) ? t.target.nextSibling?.focus() : a(kt, this).firstChild?.focus() : g(lt, this, xs).call(this, t);
  }
  _moveToPrevious(t) {
    t.target !== a(kt, this)?.firstChild && t.target !== a(ze, this) ? (Vi.call(g(lt, this)) || g(lt, this, xs).call(this, t), t.target.previousSibling?.focus()) : Vi.call(g(lt, this)) && this._hideDropdownFromKeyboard();
  }
  _moveToBeginning(t) {
    Vi.call(g(lt, this)) ? a(kt, this).firstChild?.focus() : g(lt, this, xs).call(this, t);
  }
  _moveToEnd(t) {
    Vi.call(g(lt, this)) ? a(kt, this).lastChild?.focus() : g(lt, this, xs).call(this, t);
  }
  hideDropdown() {
    a(kt, this)?.classList.add("hidden"), a(Xs, this)?.abort(), u(Xs, this, null);
  }
  _hideDropdownFromKeyboard() {
    a(ir, this) || (Vi.call(g(lt, this)) ? (this.hideDropdown(), a(ze, this).focus({
      preventScroll: !0,
      focusVisible: a(Al, this)
    })) : a(vh, this)?.unselect());
  }
  updateColor(t) {
    if (a(En, this) && (a(En, this).style.backgroundColor = t), !a(kt, this)) return;
    const e = a(Je, this).highlightColors.values();
    for (const s of a(kt, this).children) s.setAttribute("aria-selected", e.next().value === t);
  }
  destroy() {
    a(ze, this)?.remove(), u(ze, this, null), u(En, this, null), a(kt, this)?.remove(), u(kt, this, null);
  }
};
ud = Yl;
function gu() {
  const i = document.createElement("div"), t = a(Je, this)._signal;
  i.addEventListener("contextmenu", ke, { signal: t }), i.className = "dropdown", i.role = "listbox", i.setAttribute("aria-multiselectable", !1), i.setAttribute("aria-orientation", "vertical"), i.setAttribute("data-l10n-id", "pdfjs-editor-colorpicker-dropdown");
  for (const [e, s] of a(Je, this).highlightColors) {
    const n = document.createElement("button");
    n.tabIndex = "0", n.role = "option", n.setAttribute("data-color", s), n.title = e, n.setAttribute("data-l10n-id", xl._[e]);
    const r = document.createElement("span");
    n.append(r), r.className = "swatch", r.style.backgroundColor = s, n.setAttribute("aria-selected", s === a(Wr, this)), n.addEventListener("click", g(lt, this, fu).bind(this, s), { signal: t }), i.append(n);
  }
  return i.addEventListener("keydown", g(lt, this, mu).bind(this), { signal: t }), i;
}
function fu(i, t) {
  t.stopPropagation(), a(yl, this).dispatch("switchannotationeditorparams", {
    source: this,
    type: a(Br, this),
    value: i
  });
}
function mu(i) {
  ud._keyboardManager.exec(this, i);
}
function xs(i) {
  if (Vi.call(g(lt, this))) {
    this.hideDropdown();
    return;
  }
  if (u(Al, this, i.detail === 0), a(Xs, this) || (u(Xs, this, new AbortController()), window.addEventListener("pointerdown", g(lt, this, $f).bind(this), { signal: a(Je, this).combinedSignal(a(Xs, this)) })), a(kt, this)) {
    a(kt, this).classList.remove("hidden");
    return;
  }
  const t = u(kt, this, g(lt, this, gu).call(this));
  a(ze, this).append(t);
}
function $f(i) {
  a(kt, this)?.contains(i.target) || this.hideDropdown();
}
function Vi() {
  return a(kt, this) && !a(kt, this).classList.contains("hidden");
}
var xl = { _: null }, so = /* @__PURE__ */ new WeakMap(), Sl = /* @__PURE__ */ new WeakMap(), ts = /* @__PURE__ */ new WeakMap(), va = /* @__PURE__ */ new WeakMap(), Hr = /* @__PURE__ */ new WeakMap(), le = /* @__PURE__ */ new WeakMap(), kl = /* @__PURE__ */ new WeakMap(), Ml = /* @__PURE__ */ new WeakMap(), ha = /* @__PURE__ */ new WeakMap(), Fe = /* @__PURE__ */ new WeakMap(), Se = /* @__PURE__ */ new WeakMap(), $t = /* @__PURE__ */ new WeakMap(), no = /* @__PURE__ */ new WeakMap(), es = /* @__PURE__ */ new WeakMap(), qt = /* @__PURE__ */ new WeakMap(), sr = /* @__PURE__ */ new WeakMap(), Ie = /* @__PURE__ */ new WeakMap(), _h = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ new WeakSet(), Me = class vt extends Q {
  static get _keyboardManager() {
    const t = vt.prototype;
    return $(this, "_keyboardManager", new _a([
      [
        ["ArrowLeft", "mac+ArrowLeft"],
        t._moveCaret,
        { args: [0] }
      ],
      [
        ["ArrowRight", "mac+ArrowRight"],
        t._moveCaret,
        { args: [1] }
      ],
      [
        ["ArrowUp", "mac+ArrowUp"],
        t._moveCaret,
        { args: [2] }
      ],
      [
        ["ArrowDown", "mac+ArrowDown"],
        t._moveCaret,
        { args: [3] }
      ]
    ]));
  }
  constructor(t) {
    super({
      ...t,
      name: "highlightEditor"
    }), G(this, K), _(this, so, null), _(this, Sl, 0), _(this, ts, void 0), _(this, va, null), _(this, Hr, null), _(this, le, null), _(this, kl, null), _(this, Ml, 0), _(this, ha, null), _(this, Fe, null), _(this, Se, null), _(this, $t, !1), _(this, no, null), _(this, es, void 0), _(this, qt, null), _(this, sr, ""), _(this, Ie, void 0), _(this, _h, ""), this.color = t.color || vt._defaultColor, u(Ie, this, t.thickness || vt._defaultThickness), u(es, this, t.opacity || vt._defaultOpacity), u(ts, this, t.boxes || null), u(_h, this, t.methodOfCreation || ""), u(sr, this, t.text || ""), this._isDraggable = !1, t.highlightId > -1 ? (u($t, this, !0), g(K, this, El).call(this, t), g(K, this, Ss).call(this)) : a(ts, this) && (u(so, this, t.anchorNode), u(Sl, this, t.anchorOffset), u(kl, this, t.focusNode), u(Ml, this, t.focusOffset), g(K, this, Zc).call(this), g(K, this, Ss).call(this), this.rotate(this.rotation));
  }
  get telemetryInitialData() {
    return {
      action: "added",
      type: a($t, this) ? "free_highlight" : "highlight",
      color: this._uiManager.highlightColorNames.get(this.color),
      thickness: a(Ie, this),
      methodOfCreation: a(_h, this)
    };
  }
  get telemetryFinalData() {
    return {
      type: "highlight",
      color: this._uiManager.highlightColorNames.get(this.color)
    };
  }
  static computeTelemetryFinalData(t) {
    return { numberOfColors: t.get("color").size };
  }
  static initialize(t, e) {
    Q.initialize(t, e), vt._defaultColor || (vt._defaultColor = e.highlightColors?.values().next().value || "#fff066");
  }
  static updateDefaultParams(t, e) {
    switch (t) {
      case U.HIGHLIGHT_DEFAULT_COLOR:
        vt._defaultColor = e;
        break;
      case U.HIGHLIGHT_THICKNESS:
        vt._defaultThickness = e;
    }
  }
  translateInPage(t, e) {
  }
  get toolbarPosition() {
    return a(no, this);
  }
  updateParams(t, e) {
    switch (t) {
      case U.HIGHLIGHT_COLOR:
        g(K, this, zf).call(this, e);
        break;
      case U.HIGHLIGHT_THICKNESS:
        g(K, this, Gf).call(this, e);
    }
  }
  static get defaultPropertiesToUpdate() {
    return [[U.HIGHLIGHT_DEFAULT_COLOR, vt._defaultColor], [U.HIGHLIGHT_THICKNESS, vt._defaultThickness]];
  }
  get propertiesToUpdate() {
    return [
      [U.HIGHLIGHT_COLOR, this.color || vt._defaultColor],
      [U.HIGHLIGHT_THICKNESS, a(Ie, this) || vt._defaultThickness],
      [U.HIGHLIGHT_FREE, a($t, this)]
    ];
  }
  async addEditToolbar() {
    const t = await super.addEditToolbar();
    return t ? (this._uiManager.highlightColors && (u(Hr, this, new Yl({ editor: this })), t.addColorPicker(a(Hr, this))), t) : null;
  }
  disableEditing() {
    super.disableEditing(), this.div.classList.toggle("disabled", !0);
  }
  enableEditing() {
    super.enableEditing(), this.div.classList.toggle("disabled", !1);
  }
  fixAndSetPosition() {
    return super.fixAndSetPosition(g(K, this, $r).call(this));
  }
  getBaseTranslation() {
    return [0, 0];
  }
  getRect(t, e) {
    return super.getRect(t, e, g(K, this, $r).call(this));
  }
  onceAdded(t) {
    this.annotationElementId || this.parent.addUndoableEditor(this), t && this.div.focus();
  }
  remove() {
    g(K, this, td).call(this), this._reportTelemetry({ action: "deleted" }), super.remove();
  }
  rebuild() {
    this.parent && (super.rebuild(), this.div !== null && (g(K, this, Ss).call(this), this.isAttachedToDOM || this.parent.add(this)));
  }
  setParent(t) {
    let e = !1;
    this.parent && !t ? g(K, this, td).call(this) : t && (g(K, this, Ss).call(this, t), e = !this.parent && this.div?.classList.contains("selectedEditor")), super.setParent(t), this.show(this._isVisible), e && this.select();
  }
  rotate(t) {
    const { drawLayer: e } = this.parent;
    let s;
    a($t, this) ? (t = (t - this.rotation + 360) % 360, s = la.call(vt, a(Fe, this).box, t)) : s = la.call(vt, [
      this.x,
      this.y,
      this.width,
      this.height
    ], t), e.updateProperties(a(Se, this), {
      bbox: s,
      root: { "data-main-rotation": t }
    }), e.updateProperties(a(qt, this), {
      bbox: la.call(vt, a(le, this).box, t),
      root: { "data-main-rotation": t }
    });
  }
  render() {
    if (this.div) return this.div;
    const t = super.render();
    a(sr, this) && (t.setAttribute("aria-label", a(sr, this)), t.setAttribute("role", "mark")), a($t, this) ? t.classList.add("free") : this.div.addEventListener("keydown", g(K, this, Vf).bind(this), { signal: this._uiManager._signal });
    const e = u(ha, this, document.createElement("div"));
    t.append(e), e.setAttribute("aria-hidden", "true"), e.className = "internal", e.style.clipPath = a(va, this);
    const [s, n] = this.parentDimensions;
    return this.setDims(this.width * s, this.height * n), Yr(this, a(ha, this), ["pointerover", "pointerleave"]), this.enableEditing(), t;
  }
  pointerover() {
    this.isSelected || this.parent?.drawLayer.updateProperties(a(qt, this), { rootClass: { hovered: !0 } });
  }
  pointerleave() {
    this.isSelected || this.parent?.drawLayer.updateProperties(a(qt, this), { rootClass: { hovered: !1 } });
  }
  _moveCaret(t) {
    switch (this.parent.unselect(this), t) {
      case 0:
      case 2:
        g(K, this, bh).call(this, !0);
        break;
      case 1:
      case 3:
        g(K, this, bh).call(this, !1);
    }
  }
  select() {
    super.select(), a(qt, this) && this.parent?.drawLayer.updateProperties(a(qt, this), { rootClass: {
      hovered: !1,
      selected: !0
    } });
  }
  unselect() {
    super.unselect(), a(qt, this) && (this.parent?.drawLayer.updateProperties(a(qt, this), { rootClass: { selected: !1 } }), a($t, this) || g(K, this, bh).call(this, !1));
  }
  get _mustFixPosition() {
    return !a($t, this);
  }
  show(t = this._isVisible) {
    super.show(t), this.parent && (this.parent.drawLayer.updateProperties(a(Se, this), { rootClass: { hidden: !t } }), this.parent.drawLayer.updateProperties(a(qt, this), { rootClass: { hidden: !t } }));
  }
  static startHighlighting(t, e, { target: s, x: n, y: r }) {
    const { x: o, y: h, width: l, height: c } = s.getBoundingClientRect(), d = new AbortController(), p = t.combinedSignal(d), f = (v) => {
      d.abort(), g(vt, this, Yf).call(this, t, v);
    };
    window.addEventListener("blur", f, { signal: p }), window.addEventListener("pointerup", f, { signal: p }), window.addEventListener("pointerdown", ie, {
      capture: !0,
      passive: !1,
      signal: p
    }), window.addEventListener("contextmenu", ke, { signal: p }), s.addEventListener("pointermove", g(vt, this, Xf).bind(this, t), { signal: p }), this._freeHighlight = new wl({
      x: n,
      y: r
    }, [
      o,
      h,
      l,
      c
    ], t.scale, this._defaultThickness / 2, e, 1e-3), { id: this._freeHighlightId, clipPathId: this._freeHighlightClipId } = t.drawLayer.draw({
      bbox: [
        0,
        0,
        1,
        1
      ],
      root: {
        viewBox: "0 0 1 1",
        fill: this._defaultColor,
        "fill-opacity": this._defaultOpacity
      },
      rootClass: {
        highlight: !0,
        free: !0
      },
      path: { d: this._freeHighlight.toSVGPath() }
    }, !0, !0);
  }
  static async deserialize(t, e, s) {
    let n = null;
    if (t instanceof lu) {
      const { data: { quadPoints: m, rect: b, rotation: w, id: A, color: y, opacity: x, popupRef: S }, parent: { page: { pageNumber: M } } } = t;
      n = t = {
        annotationType: W.HIGHLIGHT,
        color: Array.from(y),
        opacity: x,
        quadPoints: m,
        boxes: null,
        pageIndex: M - 1,
        rect: b.slice(0),
        rotation: w,
        id: A,
        deleted: !1,
        popupRef: S
      };
    } else if (t instanceof ql) {
      const { data: { inkLists: m, rect: b, rotation: w, id: A, color: y, borderStyle: { rawWidth: x }, popupRef: S }, parent: { page: { pageNumber: M } } } = t;
      n = t = {
        annotationType: W.HIGHLIGHT,
        color: Array.from(y),
        thickness: x,
        inkLists: m,
        boxes: null,
        pageIndex: M - 1,
        rect: b.slice(0),
        rotation: w,
        id: A,
        deleted: !1,
        popupRef: S
      };
    }
    const { color: r, quadPoints: o, inkLists: h, opacity: l } = t, c = await super.deserialize(t, e, s);
    c.color = C.makeHexColor(...r), u(es, c, l || 1), h && u(Ie, c, t.thickness), c.annotationElementId = t.id || null, c._initialData = n;
    const [d, p] = c.pageDimensions, [f, v] = c.pageTranslation;
    if (o) {
      const m = u(ts, c, []);
      for (let b = 0; b < o.length; b += 8) m.push({
        x: (o[b] - f) / d,
        y: 1 - (o[b + 1] - v) / p,
        width: (o[b + 2] - o[b]) / d,
        height: (o[b + 1] - o[b + 5]) / p
      });
      g(K, c, Zc).call(c), g(K, c, Ss).call(c), c.rotate(c.rotation);
    } else if (h) {
      u($t, c, !0);
      const m = h[0], b = {
        x: m[0] - f,
        y: p - (m[1] - v)
      }, w = new wl(b, [
        0,
        0,
        d,
        p
      ], 1, a(Ie, c) / 2, !0, 1e-3);
      for (let x = 0, S = m.length; x < S; x += 2)
        b.x = m[x] - f, b.y = p - (m[x + 1] - v), w.add(b);
      const { id: A, clipPathId: y } = e.drawLayer.draw({
        bbox: [
          0,
          0,
          1,
          1
        ],
        root: {
          viewBox: "0 0 1 1",
          fill: c.color,
          "fill-opacity": c._defaultOpacity
        },
        rootClass: {
          highlight: !0,
          free: !0
        },
        path: { d: w.toSVGPath() }
      }, !0, !0);
      g(K, c, El).call(c, {
        highlightOutlines: w.getOutlines(),
        highlightId: A,
        clipPathId: y
      }), g(K, c, Ss).call(c);
    }
    return c;
  }
  serialize(t = !1) {
    if (this.isEmpty() || t) return null;
    if (this.deleted) return this.serializeDeleted();
    const e = this.getRect(0, 0), s = Q._colorManager.convert(this.color), n = {
      annotationType: W.HIGHLIGHT,
      color: s,
      opacity: a(es, this),
      thickness: a(Ie, this),
      quadPoints: g(K, this, Uf).call(this),
      outlines: g(K, this, qf).call(this, e),
      pageIndex: this.pageIndex,
      rect: e,
      rotation: g(K, this, $r).call(this),
      structTreeParentId: this._structTreeParentId
    };
    return this.annotationElementId && !g(K, this, Kf).call(this, n) ? null : (n.id = this.annotationElementId, n);
  }
  renderAnnotationElement(t) {
    return t.updateEdited({ rect: this.getRect(0, 0) }), null;
  }
  static canCreateNewEmptyEditor() {
    return !1;
  }
};
ua = Me;
function Zc() {
  const i = new bl(a(ts, this), 1e-3);
  u(Fe, this, i.getOutlines()), [this.x, this.y, this.width, this.height] = a(Fe, this).box;
  const t = new bl(a(ts, this), 25e-4, 1e-3, this._uiManager.direction === "ltr");
  u(le, this, t.getOutlines());
  const { lastPoint: e } = a(le, this);
  u(no, this, [(e[0] - this.x) / this.width, (e[1] - this.y) / this.height]);
}
function El({ highlightOutlines: i, highlightId: t, clipPathId: e }) {
  if (u(Fe, this, i), u(le, this, i.getNewOutline(a(Ie, this) / 2 + 1.5, 25e-4)), t >= 0)
    u(Se, this, t), u(va, this, e), this.parent.drawLayer.finalizeDraw(t, {
      bbox: i.box,
      path: { d: i.toSVGPath() }
    }), u(qt, this, this.parent.drawLayer.drawOutline({
      rootClass: {
        highlightOutline: !0,
        free: !0
      },
      bbox: a(le, this).box,
      path: { d: a(le, this).toSVGPath() }
    }, !0));
  else if (this.parent) {
    const l = this.parent.viewport.rotation;
    this.parent.drawLayer.updateProperties(a(Se, this), {
      bbox: la.call(ua, a(Fe, this).box, (l - this.rotation + 360) % 360),
      path: { d: i.toSVGPath() }
    }), this.parent.drawLayer.updateProperties(a(qt, this), {
      bbox: la.call(ua, a(le, this).box, l),
      path: { d: a(le, this).toSVGPath() }
    });
  }
  const [s, n, r, o] = i.box;
  switch (this.rotation) {
    case 0:
      this.x = s, this.y = n, this.width = r, this.height = o;
      break;
    case 90: {
      const [l, c] = this.parentDimensions;
      this.x = n, this.y = 1 - s, this.width = r * c / l, this.height = o * l / c;
      break;
    }
    case 180:
      this.x = 1 - s, this.y = 1 - n, this.width = r, this.height = o;
      break;
    case 270: {
      const [l, c] = this.parentDimensions;
      this.x = 1 - n, this.y = s, this.width = r * c / l, this.height = o * l / c;
      break;
    }
  }
  const { lastPoint: h } = a(le, this);
  u(no, this, [(h[0] - s) / r, (h[1] - n) / o]);
}
function zf(i) {
  const t = (n, r) => {
    this.color = n, u(es, this, r), this.parent?.drawLayer.updateProperties(a(Se, this), { root: {
      fill: n,
      "fill-opacity": r
    } }), a(Hr, this)?.updateColor(n);
  }, e = this.color, s = a(es, this);
  this.addCommands({
    cmd: t.bind(this, i, ua._defaultOpacity),
    undo: t.bind(this, e, s),
    post: this._uiManager.updateUI.bind(this._uiManager, this),
    mustExec: !0,
    type: U.HIGHLIGHT_COLOR,
    overwriteIfSameType: !0,
    keepUndo: !0
  }), this._reportTelemetry({
    action: "color_changed",
    color: this._uiManager.highlightColorNames.get(i)
  }, !0);
}
function Gf(i) {
  const t = a(Ie, this), e = (s) => {
    u(Ie, this, s), g(K, this, jf).call(this, s);
  };
  this.addCommands({
    cmd: e.bind(this, i),
    undo: e.bind(this, t),
    post: this._uiManager.updateUI.bind(this._uiManager, this),
    mustExec: !0,
    type: U.INK_THICKNESS,
    overwriteIfSameType: !0,
    keepUndo: !0
  }), this._reportTelemetry({
    action: "thickness_changed",
    thickness: i
  }, !0);
}
function jf(i) {
  if (!a($t, this)) return;
  g(K, this, El).call(this, { highlightOutlines: a(Fe, this).getNewOutline(i / 2) }), this.fixAndSetPosition();
  const [t, e] = this.parentDimensions;
  this.setDims(this.width * t, this.height * e);
}
function td() {
  a(Se, this) !== null && this.parent && (this.parent.drawLayer.remove(a(Se, this)), u(Se, this, null), this.parent.drawLayer.remove(a(qt, this)), u(qt, this, null));
}
function Ss(i = this.parent) {
  a(Se, this) === null && ({ id: Vr(u, [Se, this])._, clipPathId: Vr(u, [va, this])._ } = i.drawLayer.draw({
    bbox: a(Fe, this).box,
    root: {
      viewBox: "0 0 1 1",
      fill: this.color,
      "fill-opacity": a(es, this)
    },
    rootClass: {
      highlight: !0,
      free: a($t, this)
    },
    path: { d: a(Fe, this).toSVGPath() }
  }, !1, !0), u(qt, this, i.drawLayer.drawOutline({
    rootClass: {
      highlightOutline: !0,
      free: a($t, this)
    },
    bbox: a(le, this).box,
    path: { d: a(le, this).toSVGPath() }
  }, a($t, this))), a(ha, this) && (a(ha, this).style.clipPath = a(va, this)));
}
function la([i, t, e, s], n) {
  switch (n) {
    case 90:
      return [
        1 - t - s,
        i,
        s,
        e
      ];
    case 180:
      return [
        1 - i - e,
        1 - t - s,
        e,
        s
      ];
    case 270:
      return [
        t,
        1 - i - e,
        s,
        e
      ];
  }
  return [
    i,
    t,
    e,
    s
  ];
}
function Vf(i) {
  ua._keyboardManager.exec(this, i);
}
function bh(i) {
  if (!a(so, this)) return;
  const t = window.getSelection();
  i ? t.setPosition(a(so, this), a(Sl, this)) : t.setPosition(a(kl, this), a(Ml, this));
}
function $r() {
  return a($t, this) ? this.rotation : 0;
}
function Uf() {
  if (a($t, this)) return null;
  const [i, t] = this.pageDimensions, [e, s] = this.pageTranslation, n = a(ts, this), r = new Float32Array(8 * n.length);
  let o = 0;
  for (const { x: h, y: l, width: c, height: d } of n) {
    const p = h * i + e, f = (1 - l) * t + s;
    r[o] = r[o + 4] = p, r[o + 1] = r[o + 3] = f, r[o + 2] = r[o + 6] = p + c * i, r[o + 5] = r[o + 7] = f - d * t, o += 8;
  }
  return r;
}
function qf(i) {
  return a(Fe, this).serialize(i, g(K, this, $r).call(this));
}
function Xf(i, t) {
  this._freeHighlight.add(t) && i.drawLayer.updateProperties(this._freeHighlightId, { path: { d: this._freeHighlight.toSVGPath() } });
}
function Yf(i, t) {
  this._freeHighlight.isEmpty() ? i.drawLayer.remove(this._freeHighlightId) : i.createAndAddNewEditor(t, !1, {
    highlightId: this._freeHighlightId,
    highlightOutlines: this._freeHighlight.getOutlines(),
    clipPathId: this._freeHighlightClipId,
    methodOfCreation: "main_toolbar"
  }), this._freeHighlightId = -1, this._freeHighlight = null, this._freeHighlightClipId = "";
}
function Kf(i) {
  const { color: t } = this._initialData;
  return i.color.some(((e, s) => e !== t[s]));
}
L(Me, "_defaultColor", null);
L(Me, "_defaultOpacity", 1);
L(Me, "_defaultThickness", 12);
L(Me, "_type", "highlight");
L(Me, "_editorType", W.HIGHLIGHT);
L(Me, "_freeHighlightId", -1);
L(Me, "_freeHighlight", null);
L(Me, "_freeHighlightClipId", "");
var Cn = /* @__PURE__ */ new WeakMap(), Qf = class {
  constructor() {
    _(this, Cn, /* @__PURE__ */ Object.create(null));
  }
  updateProperty(i, t) {
    this[i] = t, this.updateSVGProperty(i, t);
  }
  updateProperties(i) {
    if (i) for (const [t, e] of Object.entries(i)) this.updateProperty(t, e);
  }
  updateSVGProperty(i, t) {
    a(Cn, this)[i] = t;
  }
  toSVGProperties() {
    const i = a(Cn, this);
    return u(Cn, this, /* @__PURE__ */ Object.create(null)), { root: i };
  }
  reset() {
    u(Cn, this, /* @__PURE__ */ Object.create(null));
  }
  updateAll(i = this) {
    this.updateProperties(i);
  }
  clone() {
    et("Not implemented");
  }
}, me = /* @__PURE__ */ new WeakMap(), nr = /* @__PURE__ */ new WeakMap(), it = /* @__PURE__ */ new WeakSet(), wa = class Vn extends Q {
  constructor(t) {
    super(t), G(this, it), _(this, me, null), _(this, nr, void 0), L(this, "_drawId", null), u(nr, this, t.mustBeCommitted || !1), t.drawOutlines && (g(it, this, ed).call(this, t), g(it, this, ar).call(this));
  }
  static _mergeSVGProperties(t, e) {
    const s = new Set(Object.keys(t));
    for (const [n, r] of Object.entries(e)) s.has(n) ? Object.assign(t[n], r) : t[n] = r;
    return t;
  }
  static getDefaultDrawingOptions(t) {
    et("Not implemented");
  }
  static get typesMap() {
    et("Not implemented");
  }
  static get isDrawer() {
    return !0;
  }
  static get supportMultipleDrawings() {
    return !1;
  }
  static updateDefaultParams(t, e) {
    const s = this.typesMap.get(t);
    s && this._defaultDrawingOptions.updateProperty(s, e), this._currentParent && (Nt._.updateProperty(s, e), this._currentParent.drawLayer.updateProperties(this._currentDrawId, this._defaultDrawingOptions.toSVGProperties()));
  }
  updateParams(t, e) {
    const s = this.constructor.typesMap.get(t);
    s && this._updateProperty(t, s, e);
  }
  static get defaultPropertiesToUpdate() {
    const t = [], e = this._defaultDrawingOptions;
    for (const [s, n] of this.typesMap) t.push([s, e[n]]);
    return t;
  }
  get propertiesToUpdate() {
    const t = [], { _drawingOptions: e } = this;
    for (const [s, n] of this.constructor.typesMap) t.push([s, e[n]]);
    return t;
  }
  _updateProperty(t, e, s) {
    const n = this._drawingOptions, r = n[e], o = (h) => {
      n.updateProperty(e, h);
      const l = a(me, this).updateProperty(e, h);
      l && g(it, this, zr).call(this, l), this.parent?.drawLayer.updateProperties(this._drawId, n.toSVGProperties());
    };
    this.addCommands({
      cmd: o.bind(this, s),
      undo: o.bind(this, r),
      post: this._uiManager.updateUI.bind(this._uiManager, this),
      mustExec: !0,
      type: t,
      overwriteIfSameType: !0,
      keepUndo: !0
    });
  }
  _onResizing() {
    this.parent?.drawLayer.updateProperties(this._drawId, Vn._mergeSVGProperties(a(me, this).getPathResizingSVGProperties(g(it, this, wh).call(this)), { bbox: g(it, this, Pn).call(this) }));
  }
  _onResized() {
    this.parent?.drawLayer.updateProperties(this._drawId, Vn._mergeSVGProperties(a(me, this).getPathResizedSVGProperties(g(it, this, wh).call(this)), { bbox: g(it, this, Pn).call(this) }));
  }
  _onTranslating(t, e) {
    this.parent?.drawLayer.updateProperties(this._drawId, { bbox: g(it, this, Pn).call(this, t, e) });
  }
  _onTranslated() {
    this.parent?.drawLayer.updateProperties(this._drawId, Vn._mergeSVGProperties(a(me, this).getPathTranslatedSVGProperties(g(it, this, wh).call(this), this.parentDimensions), { bbox: g(it, this, Pn).call(this) }));
  }
  _onStartDragging() {
    this.parent?.drawLayer.updateProperties(this._drawId, { rootClass: { moving: !0 } });
  }
  _onStopDragging() {
    this.parent?.drawLayer.updateProperties(this._drawId, { rootClass: { moving: !1 } });
  }
  commit() {
    super.commit(), this.disableEditMode(), this.disableEditing();
  }
  disableEditing() {
    super.disableEditing(), this.div.classList.toggle("disabled", !0);
  }
  enableEditing() {
    super.enableEditing(), this.div.classList.toggle("disabled", !1);
  }
  getBaseTranslation() {
    return [0, 0];
  }
  get isResizable() {
    return !0;
  }
  onceAdded(t) {
    this.annotationElementId || this.parent.addUndoableEditor(this), this._isDraggable = !0, a(nr, this) && (u(nr, this, !1), this.commit(), this.parent.setSelected(this), t && this.isOnScreen && this.div.focus());
  }
  remove() {
    g(it, this, id).call(this), super.remove();
  }
  rebuild() {
    this.parent && (super.rebuild(), this.div !== null && (g(it, this, ar).call(this), g(it, this, zr).call(this, a(me, this).box), this.isAttachedToDOM || this.parent.add(this)));
  }
  setParent(t) {
    let e = !1;
    this.parent && !t ? (this._uiManager.removeShouldRescale(this), g(it, this, id).call(this)) : t && (this._uiManager.addShouldRescale(this), g(it, this, ar).call(this, t), e = !this.parent && this.div?.classList.contains("selectedEditor")), super.setParent(t), e && this.select();
  }
  rotate() {
    this.parent && this.parent.drawLayer.updateProperties(this._drawId, Vn._mergeSVGProperties({ bbox: g(it, this, Pn).call(this) }, a(me, this).updateRotation((this.parentRotation - this.rotation + 360) % 360)));
  }
  onScaleChanging() {
    this.parent && g(it, this, zr).call(this, a(me, this).updateParentDimensions(this.parentDimensions, this.parent.scale));
  }
  static onScaleChangingWhenDrawing() {
  }
  render() {
    if (this.div) return this.div;
    const t = super.render();
    t.classList.add("draw");
    const e = document.createElement("div");
    t.append(e), e.setAttribute("aria-hidden", "true"), e.className = "internal";
    const [s, n] = this.parentDimensions;
    return this.setDims(this.width * s, this.height * n), this._uiManager.addShouldRescale(this), this.disableEditing(), t;
  }
  static createDrawerInstance(t, e, s, n, r) {
    et("Not implemented");
  }
  static startDrawing(t, e, s, n) {
    const { target: r, offsetX: o, offsetY: h, pointerId: l, pointerType: c } = n;
    if (Ms._ && Ms._ !== c) return;
    const { viewport: { rotation: d } } = t, { width: p, height: f } = r.getBoundingClientRect(), v = rr._ = new AbortController(), m = t.combinedSignal(v);
    ks._ || (ks._ = l), Ms._ ?? (Ms._ = c), window.addEventListener("pointerup", ((b) => {
      ks._ === b.pointerId ? this._endDraw(b) : Es._?.delete(b.pointerId);
    }), { signal: m }), window.addEventListener("pointercancel", ((b) => {
      ks._ === b.pointerId ? this._currentParent.endDrawingSession() : Es._?.delete(b.pointerId);
    }), { signal: m }), window.addEventListener("pointerdown", ((b) => {
      Ms._ === b.pointerType && ((Es._ || (Es._ = /* @__PURE__ */ new Set())).add(b.pointerId), Nt._.isCancellable() && (Nt._.removeLastElement(), Nt._.isEmpty() ? this._currentParent.endDrawingSession(!0) : this._endDraw(null)));
    }), {
      capture: !0,
      passive: !1,
      signal: m
    }), window.addEventListener("contextmenu", ke, { signal: m }), r.addEventListener("pointermove", this._drawMove.bind(this), { signal: m }), r.addEventListener("touchmove", ((b) => {
      b.timeStamp === hr._ && ie(b);
    }), { signal: m }), t.toggleDrawing(), e._editorUndoBar?.hide(), Nt._ ? t.drawLayer.updateProperties(this._currentDrawId, Nt._.startNew(o, h, p, f, d)) : (e.updateUIForDefaultProperties(this), Nt._ = this.createDrawerInstance(o, h, p, f, d), or._ = this.getDefaultDrawingOptions(), this._currentParent = t, { id: this._currentDrawId } = t.drawLayer.draw(this._mergeSVGProperties(or._.toSVGProperties(), Nt._.defaultSVGProperties), !0, !1));
  }
  static _drawMove(t) {
    if (hr._ = -1, !Nt._) return;
    const { offsetX: e, offsetY: s, pointerId: n } = t;
    ks._ === n && (Es._?.size >= 1 ? this._endDraw(t) : (this._currentParent.drawLayer.updateProperties(this._currentDrawId, Nt._.add(e, s)), hr._ = t.timeStamp, ie(t)));
  }
  static _cleanup(t) {
    t && (this._currentDrawId = -1, this._currentParent = null, Nt._ = null, or._ = null, Ms._ = null, hr._ = NaN), rr._ && (rr._.abort(), rr._ = null, ks._ = NaN, Es._ = null);
  }
  static _endDraw(t) {
    const e = this._currentParent;
    if (e)
      if (e.toggleDrawing(!0), this._cleanup(!1), t && e.drawLayer.updateProperties(this._currentDrawId, Nt._.end(t.offsetX, t.offsetY)), this.supportMultipleDrawings) {
        const s = Nt._, n = this._currentDrawId, r = s.getLastElement();
        e.addCommands({
          cmd: () => {
            e.drawLayer.updateProperties(n, s.setLastElement(r));
          },
          undo: () => {
            e.drawLayer.updateProperties(n, s.removeLastElement());
          },
          mustExec: !1,
          type: U.DRAW_STEP
        });
      } else this.endDrawing(!1);
  }
  static endDrawing(t) {
    const e = this._currentParent;
    if (!e) return null;
    if (e.toggleDrawing(!0), e.cleanUndoStack(U.DRAW_STEP), !Nt._.isEmpty()) {
      const { pageDimensions: [s, n], scale: r } = e, o = e.createAndAddNewEditor({
        offsetX: 0,
        offsetY: 0
      }, !1, {
        drawId: this._currentDrawId,
        drawOutlines: Nt._.getOutlines(s * r, n * r, r, this._INNER_MARGIN),
        drawingOptions: or._,
        mustBeCommitted: !t
      });
      return this._cleanup(!0), o;
    }
    return e.drawLayer.remove(this._currentDrawId), this._cleanup(!0), null;
  }
  createDrawingOptions(t) {
  }
  static deserializeDraw(t, e, s, n, r, o) {
    et("Not implemented");
  }
  static async deserialize(t, e, s) {
    const { rawDims: { pageWidth: n, pageHeight: r, pageX: o, pageY: h } } = e.viewport, l = this.deserializeDraw(o, h, n, r, this._INNER_MARGIN, t), c = await super.deserialize(t, e, s);
    return c.createDrawingOptions(t), g(it, c, ed).call(c, { drawOutlines: l }), g(it, c, ar).call(c), c.onScaleChanging(), c.rotate(), c;
  }
  serializeDraw(t) {
    const [e, s] = this.pageTranslation, [n, r] = this.pageDimensions;
    return a(me, this).serialize([
      e,
      s,
      n,
      r
    ], t);
  }
  renderAnnotationElement(t) {
    return t.updateEdited({ rect: this.getRect(0, 0) }), null;
  }
  static canCreateNewEmptyEditor() {
    return !1;
  }
};
pd = wa;
function ed({ drawOutlines: i, drawId: t, drawingOptions: e }) {
  u(me, this, i), this._drawingOptions || (this._drawingOptions = e), t >= 0 ? (this._drawId = t, this.parent.drawLayer.finalizeDraw(t, i.defaultProperties)) : this._drawId = g(it, this, vu).call(this, i, this.parent), g(it, this, zr).call(this, i.box);
}
function vu(i, t) {
  const { id: e } = t.drawLayer.draw(pd._mergeSVGProperties(this._drawingOptions.toSVGProperties(), i.defaultSVGProperties), !1, !1);
  return e;
}
function id() {
  this._drawId !== null && this.parent && (this.parent.drawLayer.remove(this._drawId), this._drawId = null, this._drawingOptions.reset());
}
function ar(i = this.parent) {
  (this._drawId === null || this.parent !== i) && (this._drawId === null ? (this._drawingOptions.updateAll(), this._drawId = g(it, this, vu).call(this, a(me, this), i)) : this.parent.drawLayer.updateParent(this._drawId, i.drawLayer));
}
function Jf([i, t, e, s]) {
  const { parentDimensions: [n, r], rotation: o } = this;
  switch (o) {
    case 90:
      return [
        t,
        1 - i,
        e * (r / n),
        s * (n / r)
      ];
    case 180:
      return [
        1 - i,
        1 - t,
        e,
        s
      ];
    case 270:
      return [
        1 - t,
        i,
        e * (r / n),
        s * (n / r)
      ];
    default:
      return [
        i,
        t,
        e,
        s
      ];
  }
}
function wh() {
  const { x: i, y: t, width: e, height: s, parentDimensions: [n, r], rotation: o } = this;
  switch (o) {
    case 90:
      return [
        1 - t,
        i,
        e * (n / r),
        s * (r / n)
      ];
    case 180:
      return [
        1 - i,
        1 - t,
        e,
        s
      ];
    case 270:
      return [
        t,
        1 - i,
        e * (n / r),
        s * (r / n)
      ];
    default:
      return [
        i,
        t,
        e,
        s
      ];
  }
}
function zr(i) {
  if ([this.x, this.y, this.width, this.height] = g(it, this, Jf).call(this, i), this.div) {
    this.fixAndSetPosition();
    const [t, e] = this.parentDimensions;
    this.setDims(this.width * t, this.height * e);
  }
  this._onResized();
}
function Pn() {
  const { x: i, y: t, width: e, height: s, rotation: n, parentRotation: r, parentDimensions: [o, h] } = this;
  switch ((4 * n + r) / 90) {
    case 1:
      return [
        1 - t - s,
        i,
        s,
        e
      ];
    case 2:
      return [
        1 - i - e,
        1 - t - s,
        e,
        s
      ];
    case 3:
      return [
        t,
        1 - i - e,
        s,
        e
      ];
    case 4:
      return [
        i,
        t - e * (o / h),
        s * (h / o),
        e * (o / h)
      ];
    case 5:
      return [
        1 - t,
        i,
        e * (o / h),
        s * (h / o)
      ];
    case 6:
      return [
        1 - i - s * (h / o),
        1 - t,
        s * (h / o),
        e * (o / h)
      ];
    case 7:
      return [
        t - e * (o / h),
        1 - i - s * (h / o),
        e * (o / h),
        s * (h / o)
      ];
    case 8:
      return [
        i - e,
        t - s,
        e,
        s
      ];
    case 9:
      return [
        1 - t,
        i - e,
        s,
        e
      ];
    case 10:
      return [
        1 - i,
        1 - t,
        e,
        s
      ];
    case 11:
      return [
        t - s,
        1 - i,
        s,
        e
      ];
    case 12:
      return [
        i - s * (h / o),
        t,
        s * (h / o),
        e * (o / h)
      ];
    case 13:
      return [
        1 - t - e * (o / h),
        i - s * (h / o),
        e * (o / h),
        s * (h / o)
      ];
    case 14:
      return [
        1 - i,
        1 - t - e * (o / h),
        s * (h / o),
        e * (o / h)
      ];
    case 15:
      return [
        t,
        1 - i,
        e * (o / h),
        s * (h / o)
      ];
    default:
      return [
        i,
        t,
        e,
        s
      ];
  }
}
L(wa, "_currentDrawId", -1);
L(wa, "_currentParent", null);
var Nt = { _: null }, rr = { _: null }, or = { _: null }, ks = { _: NaN }, Ms = { _: null }, Es = { _: null }, hr = { _: NaN };
L(wa, "_INNER_MARGIN", 3);
var pi = /* @__PURE__ */ new WeakMap(), Et = /* @__PURE__ */ new WeakMap(), Ct = /* @__PURE__ */ new WeakMap(), Un = /* @__PURE__ */ new WeakMap(), lr = /* @__PURE__ */ new WeakMap(), Zt = /* @__PURE__ */ new WeakMap(), Pt = /* @__PURE__ */ new WeakMap(), Te = /* @__PURE__ */ new WeakMap(), Tn = /* @__PURE__ */ new WeakMap(), qn = /* @__PURE__ */ new WeakMap(), Xn = /* @__PURE__ */ new WeakMap(), cr = /* @__PURE__ */ new WeakSet(), Zf = class {
  constructor(i, t, e, s, n, r) {
    G(this, cr), _(this, pi, new Float64Array(6)), _(this, Et, void 0), _(this, Ct, void 0), _(this, Un, void 0), _(this, lr, void 0), _(this, Zt, void 0), _(this, Pt, ""), _(this, Te, 0), _(this, Tn, new _u()), _(this, qn, void 0), _(this, Xn, void 0), u(qn, this, e), u(Xn, this, s), u(Un, this, n), u(lr, this, r), [i, t] = g(cr, this, Ah).call(this, i, t);
    const o = u(Et, this, [
      NaN,
      NaN,
      NaN,
      NaN,
      i,
      t
    ]);
    u(Zt, this, [i, t]), u(Ct, this, [{
      line: o,
      points: a(Zt, this)
    }]), a(pi, this).set(o, 0);
  }
  updateProperty(i, t) {
    i === "stroke-width" && u(lr, this, t);
  }
  isEmpty() {
    return !a(Ct, this) || a(Ct, this).length === 0;
  }
  isCancellable() {
    return a(Zt, this).length <= 10;
  }
  add(i, t) {
    [i, t] = g(cr, this, Ah).call(this, i, t);
    const [e, s, n, r] = a(pi, this).subarray(2, 6), o = i - n, h = t - r;
    return Math.hypot(a(qn, this) * o, a(Xn, this) * h) <= 2 ? null : (a(Zt, this).push(i, t), isNaN(e) ? (a(pi, this).set([
      n,
      r,
      i,
      t
    ], 2), a(Et, this).push(NaN, NaN, NaN, NaN, i, t), { path: { d: this.toSVGPath() } }) : (isNaN(a(pi, this)[0]) && a(Et, this).splice(6, 6), a(pi, this).set([
      e,
      s,
      n,
      r,
      i,
      t
    ], 0), a(Et, this).push(...E.createBezierPoints(e, s, n, r, i, t)), { path: { d: this.toSVGPath() } }));
  }
  end(i, t) {
    return this.add(i, t) || (a(Zt, this).length === 2 ? { path: { d: this.toSVGPath() } } : null);
  }
  startNew(i, t, e, s, n) {
    u(qn, this, e), u(Xn, this, s), u(Un, this, n), [i, t] = g(cr, this, Ah).call(this, i, t);
    const r = u(Et, this, [
      NaN,
      NaN,
      NaN,
      NaN,
      i,
      t
    ]);
    u(Zt, this, [i, t]);
    const o = a(Ct, this).at(-1);
    return o && (o.line = new Float32Array(o.line), o.points = new Float32Array(o.points)), a(Ct, this).push({
      line: r,
      points: a(Zt, this)
    }), a(pi, this).set(r, 0), u(Te, this, 0), this.toSVGPath(), null;
  }
  getLastElement() {
    return a(Ct, this).at(-1);
  }
  setLastElement(i) {
    return a(Ct, this) ? (a(Ct, this).push(i), u(Et, this, i.line), u(Zt, this, i.points), u(Te, this, 0), { path: { d: this.toSVGPath() } }) : a(Tn, this).setLastElement(i);
  }
  removeLastElement() {
    if (!a(Ct, this)) return a(Tn, this).removeLastElement();
    a(Ct, this).pop(), u(Pt, this, "");
    for (let i = 0, t = a(Ct, this).length; i < t; i++) {
      const { line: e, points: s } = a(Ct, this)[i];
      u(Et, this, e), u(Zt, this, s), u(Te, this, 0), this.toSVGPath();
    }
    return { path: { d: a(Pt, this) } };
  }
  toSVGPath() {
    const i = E.svgRound(a(Et, this)[4]), t = E.svgRound(a(Et, this)[5]);
    if (a(Zt, this).length === 2)
      return u(Pt, this, `${a(Pt, this)} M ${i} ${t} Z`), a(Pt, this);
    if (a(Zt, this).length <= 6) {
      const s = a(Pt, this).lastIndexOf("M");
      u(Pt, this, `${a(Pt, this).slice(0, s)} M ${i} ${t}`), u(Te, this, 6);
    }
    if (a(Zt, this).length === 4) {
      const s = E.svgRound(a(Et, this)[10]), n = E.svgRound(a(Et, this)[11]);
      return u(Pt, this, `${a(Pt, this)} L ${s} ${n}`), u(Te, this, 12), a(Pt, this);
    }
    const e = [];
    a(Te, this) === 0 && (e.push(`M ${i} ${t}`), u(Te, this, 6));
    for (let s = a(Te, this), n = a(Et, this).length; s < n; s += 6) {
      const [r, o, h, l, c, d] = a(Et, this).slice(s, s + 6).map(E.svgRound);
      e.push(`C${r} ${o} ${h} ${l} ${c} ${d}`);
    }
    return u(Pt, this, a(Pt, this) + e.join(" ")), u(Te, this, a(Et, this).length), a(Pt, this);
  }
  getOutlines(i, t, e, s) {
    const n = a(Ct, this).at(-1);
    return n.line = new Float32Array(n.line), n.points = new Float32Array(n.points), a(Tn, this).build(a(Ct, this), i, t, e, a(Un, this), a(lr, this), s), u(pi, this, null), u(Et, this, null), u(Ct, this, null), u(Pt, this, null), a(Tn, this);
  }
  get defaultSVGProperties() {
    return {
      root: { viewBox: "0 0 10000 10000" },
      rootClass: { draw: !0 },
      bbox: [
        0,
        0,
        1,
        1
      ]
    };
  }
};
function Ah(i, t) {
  return E._normalizePoint(i, t, a(qn, this), a(Xn, this), a(Un, this));
}
var ee = /* @__PURE__ */ new WeakMap(), yh = /* @__PURE__ */ new WeakMap(), Cl = /* @__PURE__ */ new WeakMap(), ge = /* @__PURE__ */ new WeakMap(), Ai = /* @__PURE__ */ new WeakMap(), yi = /* @__PURE__ */ new WeakMap(), Gr = /* @__PURE__ */ new WeakMap(), jr = /* @__PURE__ */ new WeakMap(), ao = /* @__PURE__ */ new WeakMap(), oe = /* @__PURE__ */ new WeakSet(), _u = class bu extends E {
  constructor(...t) {
    super(...t), G(this, oe), _(this, ee, void 0), _(this, yh, 0), _(this, Cl, void 0), _(this, ge, void 0), _(this, Ai, void 0), _(this, yi, void 0), _(this, Gr, void 0), _(this, jr, void 0), _(this, ao, void 0);
  }
  build(t, e, s, n, r, o, h) {
    u(Ai, this, e), u(yi, this, s), u(Gr, this, n), u(jr, this, r), u(ao, this, o), u(Cl, this, h ?? 0), u(ge, this, t), g(oe, this, em).call(this);
  }
  setLastElement(t) {
    return a(ge, this).push(t), { path: { d: this.toSVGPath() } };
  }
  removeLastElement() {
    return a(ge, this).pop(), { path: { d: this.toSVGPath() } };
  }
  toSVGPath() {
    const t = [];
    for (const { line: e } of a(ge, this))
      if (t.push(`M${E.svgRound(e[4])} ${E.svgRound(e[5])}`), e.length !== 6) if (e.length !== 12) for (let s = 6, n = e.length; s < n; s += 6) {
        const [r, o, h, l, c, d] = e.subarray(s, s + 6).map(E.svgRound);
        t.push(`C${r} ${o} ${h} ${l} ${c} ${d}`);
      }
      else t.push(`L${E.svgRound(e[10])} ${E.svgRound(e[11])}`);
      else t.push("Z");
    return t.join("");
  }
  serialize([t, e, s, n], r) {
    const o = [], h = [], [l, c, d, p] = g(oe, this, tm).call(this);
    let f, v, m, b, w, A, y, x, S;
    switch (a(jr, this)) {
      case 0:
        S = E._rescale, f = t, v = e + n, m = s, b = -n, w = t + l * s, A = e + (1 - c - p) * n, y = t + (l + d) * s, x = e + (1 - c) * n;
        break;
      case 90:
        S = E._rescaleAndSwap, f = t, v = e, m = s, b = n, w = t + c * s, A = e + l * n, y = t + (c + p) * s, x = e + (l + d) * n;
        break;
      case 180:
        S = E._rescale, f = t + s, v = e, m = -s, b = n, w = t + (1 - l - d) * s, A = e + c * n, y = t + (1 - l) * s, x = e + (c + p) * n;
        break;
      case 270:
        S = E._rescaleAndSwap, f = t + s, v = e + n, m = -s, b = -n, w = t + (1 - c - p) * s, A = e + (1 - l - d) * n, y = t + (1 - c) * s, x = e + (1 - l) * n;
    }
    for (const { line: M, points: P } of a(ge, this))
      o.push(S(M, f, v, m, b, r ? new Array(M.length) : null)), h.push(S(P, f, v, m, b, r ? new Array(P.length) : null));
    return {
      lines: o,
      points: h,
      rect: [
        w,
        A,
        y,
        x
      ]
    };
  }
  static deserialize(t, e, s, n, r, { paths: { lines: o, points: h }, rotation: l, thickness: c }) {
    const d = [];
    let p, f, v, m, b;
    switch (l) {
      case 0:
        b = E._rescale, p = -t / s, f = e / n + 1, v = 1 / s, m = -1 / n;
        break;
      case 90:
        b = E._rescaleAndSwap, p = -e / n, f = -t / s, v = 1 / n, m = 1 / s;
        break;
      case 180:
        b = E._rescale, p = t / s + 1, f = -e / n, v = -1 / s, m = 1 / n;
        break;
      case 270:
        b = E._rescaleAndSwap, p = e / n + 1, f = t / s + 1, v = -1 / n, m = -1 / s;
    }
    if (!o) {
      o = [];
      for (const A of h) {
        const y = A.length;
        if (y === 2) {
          o.push(new Float32Array([
            NaN,
            NaN,
            NaN,
            NaN,
            A[0],
            A[1]
          ]));
          continue;
        }
        if (y === 4) {
          o.push(new Float32Array([
            NaN,
            NaN,
            NaN,
            NaN,
            A[0],
            A[1],
            NaN,
            NaN,
            NaN,
            NaN,
            A[2],
            A[3]
          ]));
          continue;
        }
        const x = new Float32Array(3 * (y - 2));
        o.push(x);
        let [S, M, P, k] = A.subarray(0, 4);
        x.set([
          NaN,
          NaN,
          NaN,
          NaN,
          S,
          M
        ], 0);
        for (let F = 4; F < y; F += 2) {
          const H = A[F], j = A[F + 1];
          x.set(E.createBezierPoints(S, M, P, k, H, j), 3 * (F - 2)), [S, M, P, k] = [
            P,
            k,
            H,
            j
          ];
        }
      }
    }
    for (let A = 0, y = o.length; A < y; A++) d.push({
      line: b(o[A].map(((x) => x ?? NaN)), p, f, v, m),
      points: b(h[A].map(((x) => x ?? NaN)), p, f, v, m)
    });
    const w = new bu();
    return w.build(d, s, n, 1, l, c, r), w;
  }
  get box() {
    return a(ee, this);
  }
  updateProperty(t, e) {
    return t === "stroke-width" ? g(oe, this, im).call(this, e) : null;
  }
  updateParentDimensions([t, e], s) {
    const [n, r] = g(oe, this, Mi).call(this);
    u(Ai, this, t), u(yi, this, e), u(Gr, this, s);
    const [o, h] = g(oe, this, Mi).call(this), l = o - n, c = h - r, d = a(ee, this);
    return d[0] -= l, d[1] -= c, d[2] += 2 * l, d[3] += 2 * c, d;
  }
  updateRotation(t) {
    return u(yh, this, t), { path: { transform: this.rotationTransform } };
  }
  get viewBox() {
    return a(ee, this).map(E.svgRound).join(" ");
  }
  get defaultProperties() {
    const [t, e] = a(ee, this);
    return {
      root: { viewBox: this.viewBox },
      path: { "transform-origin": `${E.svgRound(t)} ${E.svgRound(e)}` }
    };
  }
  get rotationTransform() {
    const [, , t, e] = a(ee, this);
    let s = 0, n = 0, r = 0, o = 0, h = 0, l = 0;
    switch (a(yh, this)) {
      case 90:
        n = e / t, r = -t / e, h = t;
        break;
      case 180:
        s = -1, o = -1, h = t, l = e;
        break;
      case 270:
        n = -e / t, r = t / e, l = e;
        break;
      default:
        return "";
    }
    return `matrix(${s} ${n} ${r} ${o} ${E.svgRound(h)} ${E.svgRound(l)})`;
  }
  getPathResizingSVGProperties([t, e, s, n]) {
    const [r, o] = g(oe, this, Mi).call(this), [h, l, c, d] = a(ee, this);
    if (Math.abs(c - r) <= E.PRECISION || Math.abs(d - o) <= E.PRECISION) {
      const b = t + s / 2 - (h + c / 2), w = e + n / 2 - (l + d / 2);
      return { path: {
        "transform-origin": `${E.svgRound(t)} ${E.svgRound(e)}`,
        transform: `${this.rotationTransform} translate(${b} ${w})`
      } };
    }
    const p = (s - 2 * r) / (c - 2 * r), f = (n - 2 * o) / (d - 2 * o), v = c / s, m = d / n;
    return { path: {
      "transform-origin": `${E.svgRound(h)} ${E.svgRound(l)}`,
      transform: `${this.rotationTransform} scale(${v} ${m}) translate(${E.svgRound(r)} ${E.svgRound(o)}) scale(${p} ${f}) translate(${E.svgRound(-r)} ${E.svgRound(-o)})`
    } };
  }
  getPathResizedSVGProperties([t, e, s, n]) {
    const [r, o] = g(oe, this, Mi).call(this), h = a(ee, this), [l, c, d, p] = h;
    if (h[0] = t, h[1] = e, h[2] = s, h[3] = n, Math.abs(d - r) <= E.PRECISION || Math.abs(p - o) <= E.PRECISION) {
      const w = t + s / 2 - (l + d / 2), A = e + n / 2 - (c + p / 2);
      for (const { line: y, points: x } of a(ge, this))
        E._translate(y, w, A, y), E._translate(x, w, A, x);
      return {
        root: { viewBox: this.viewBox },
        path: {
          "transform-origin": `${E.svgRound(t)} ${E.svgRound(e)}`,
          transform: this.rotationTransform || null,
          d: this.toSVGPath()
        }
      };
    }
    const f = (s - 2 * r) / (d - 2 * r), v = (n - 2 * o) / (p - 2 * o), m = -f * (l + r) + t + r, b = -v * (c + o) + e + o;
    if (f !== 1 || v !== 1 || m !== 0 || b !== 0) for (const { line: w, points: A } of a(ge, this))
      E._rescale(w, m, b, f, v, w), E._rescale(A, m, b, f, v, A);
    return {
      root: { viewBox: this.viewBox },
      path: {
        "transform-origin": `${E.svgRound(t)} ${E.svgRound(e)}`,
        transform: this.rotationTransform || null,
        d: this.toSVGPath()
      }
    };
  }
  getPathTranslatedSVGProperties([t, e], s) {
    const [n, r] = s, o = a(ee, this), h = t - o[0], l = e - o[1];
    if (a(Ai, this) === n && a(yi, this) === r) for (const { line: c, points: d } of a(ge, this))
      E._translate(c, h, l, c), E._translate(d, h, l, d);
    else {
      const c = a(Ai, this) / n, d = a(yi, this) / r;
      u(Ai, this, n), u(yi, this, r);
      for (const { line: p, points: f } of a(ge, this))
        E._rescale(p, h, l, c, d, p), E._rescale(f, h, l, c, d, f);
      o[2] *= c, o[3] *= d;
    }
    return o[0] = t, o[1] = e, {
      root: { viewBox: this.viewBox },
      path: {
        d: this.toSVGPath(),
        "transform-origin": `${E.svgRound(t)} ${E.svgRound(e)}`
      }
    };
  }
  get defaultSVGProperties() {
    const t = a(ee, this);
    return {
      root: { viewBox: this.viewBox },
      rootClass: { draw: !0 },
      path: {
        d: this.toSVGPath(),
        "transform-origin": `${E.svgRound(t[0])} ${E.svgRound(t[1])}`,
        transform: this.rotationTransform || null
      },
      bbox: t
    };
  }
};
function Mi(i = a(ao, this)) {
  const t = a(Cl, this) + i / 2 * a(Gr, this);
  return a(jr, this) % 180 == 0 ? [t / a(Ai, this), t / a(yi, this)] : [t / a(yi, this), t / a(Ai, this)];
}
function tm() {
  const [i, t, e, s] = a(ee, this), [n, r] = g(oe, this, Mi).call(this, 0);
  return [
    i + n,
    t + r,
    e - 2 * n,
    s - 2 * r
  ];
}
function em() {
  const i = u(ee, this, new Float32Array([
    1 / 0,
    1 / 0,
    -1 / 0,
    -1 / 0
  ]));
  for (const { line: s } of a(ge, this)) {
    if (s.length <= 12) {
      for (let o = 4, h = s.length; o < h; o += 6) {
        const [l, c] = s.subarray(o, o + 2);
        i[0] = Math.min(i[0], l), i[1] = Math.min(i[1], c), i[2] = Math.max(i[2], l), i[3] = Math.max(i[3], c);
      }
      continue;
    }
    let n = s[4], r = s[5];
    for (let o = 6, h = s.length; o < h; o += 6) {
      const [l, c, d, p, f, v] = s.subarray(o, o + 6);
      C.bezierBoundingBox(n, r, l, c, d, p, f, v, i), n = f, r = v;
    }
  }
  const [t, e] = g(oe, this, Mi).call(this);
  i[0] = Math.min(1, Math.max(0, i[0] - t)), i[1] = Math.min(1, Math.max(0, i[1] - e)), i[2] = Math.min(1, Math.max(0, i[2] + t)), i[3] = Math.min(1, Math.max(0, i[3] + e)), i[2] -= i[0], i[3] -= i[1];
}
function im(i) {
  const [t, e] = g(oe, this, Mi).call(this);
  u(ao, this, i);
  const [s, n] = g(oe, this, Mi).call(this), [r, o] = [s - t, n - e], h = a(ee, this);
  return h[0] -= r, h[1] -= o, h[2] += 2 * r, h[3] += 2 * o, h;
}
var dr = /* @__PURE__ */ new WeakMap(), sm = class wu extends Qf {
  constructor(t) {
    super(), _(this, dr, void 0), u(dr, this, t), super.updateProperties({
      fill: "none",
      stroke: Q._defaultLineColor,
      "stroke-opacity": 1,
      "stroke-width": 1,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": 10
    });
  }
  updateSVGProperty(t, e) {
    t === "stroke-width" && (e ?? (e = this["stroke-width"]), e *= a(dr, this).realScale), super.updateSVGProperty(t, e);
  }
  clone() {
    const t = new wu(a(dr, this));
    return t.updateAll(this), t;
  }
}, sd = /* @__PURE__ */ new WeakSet(), _o = class Au extends wa {
  constructor(t) {
    super({
      ...t,
      name: "inkEditor"
    }), G(this, sd), this._willKeepAspectRatio = !0;
  }
  static initialize(t, e) {
    Q.initialize(t, e), this._defaultDrawingOptions = new sm(e.viewParameters);
  }
  static getDefaultDrawingOptions(t) {
    const e = this._defaultDrawingOptions.clone();
    return e.updateProperties(t), e;
  }
  static get supportMultipleDrawings() {
    return !0;
  }
  static get typesMap() {
    return $(this, "typesMap", /* @__PURE__ */ new Map([
      [U.INK_THICKNESS, "stroke-width"],
      [U.INK_COLOR, "stroke"],
      [U.INK_OPACITY, "stroke-opacity"]
    ]));
  }
  static createDrawerInstance(t, e, s, n, r) {
    return new Zf(t, e, s, n, r, this._defaultDrawingOptions["stroke-width"]);
  }
  static deserializeDraw(t, e, s, n, r, o) {
    return _u.deserialize(t, e, s, n, r, o);
  }
  static async deserialize(t, e, s) {
    let n = null;
    if (t instanceof ql) {
      const { data: { inkLists: o, rect: h, rotation: l, id: c, color: d, opacity: p, borderStyle: { rawWidth: f }, popupRef: v }, parent: { page: { pageNumber: m } } } = t;
      n = t = {
        annotationType: W.INK,
        color: Array.from(d),
        thickness: f,
        opacity: p,
        paths: { points: o },
        boxes: null,
        pageIndex: m - 1,
        rect: h.slice(0),
        rotation: l,
        id: c,
        deleted: !1,
        popupRef: v
      };
    }
    const r = await super.deserialize(t, e, s);
    return r.annotationElementId = t.id || null, r._initialData = n, r;
  }
  onScaleChanging() {
    if (!this.parent) return;
    super.onScaleChanging();
    const { _drawId: t, _drawingOptions: e, parent: s } = this;
    e.updateSVGProperty("stroke-width"), s.drawLayer.updateProperties(t, e.toSVGProperties());
  }
  static onScaleChangingWhenDrawing() {
    const t = this._currentParent;
    t && (super.onScaleChangingWhenDrawing(), this._defaultDrawingOptions.updateSVGProperty("stroke-width"), t.drawLayer.updateProperties(this._currentDrawId, this._defaultDrawingOptions.toSVGProperties()));
  }
  createDrawingOptions({ color: t, thickness: e, opacity: s }) {
    this._drawingOptions = Au.getDefaultDrawingOptions({
      stroke: C.makeHexColor(...t),
      "stroke-width": e,
      "stroke-opacity": s
    });
  }
  serialize(t = !1) {
    if (this.isEmpty()) return null;
    if (this.deleted) return this.serializeDeleted();
    const { lines: e, points: s, rect: n } = this.serializeDraw(t), { _drawingOptions: { stroke: r, "stroke-opacity": o, "stroke-width": h } } = this, l = {
      annotationType: W.INK,
      color: Q._colorManager.convert(r),
      opacity: o,
      thickness: h,
      paths: {
        lines: e,
        points: s
      },
      pageIndex: this.pageIndex,
      rect: n,
      rotation: this.rotation,
      structTreeParentId: this._structTreeParentId
    };
    return t ? l : this.annotationElementId && !g(sd, this, nm).call(this, l) ? null : (l.id = this.annotationElementId, l);
  }
  renderAnnotationElement(t) {
    const { points: e, rect: s } = this.serializeDraw(!1);
    return t.updateEdited({
      rect: s,
      thickness: this._drawingOptions["stroke-width"],
      points: e
    }), null;
  }
};
function nm(i) {
  const { color: t, thickness: e, opacity: s, pageIndex: n } = this._initialData;
  return this._hasBeenMoved || this._hasBeenResized || i.color.some(((r, o) => r !== t[o])) || i.thickness !== e || i.opacity !== s || i.pageIndex !== n;
}
L(_o, "_type", "ink");
L(_o, "_editorType", W.INK);
L(_o, "_defaultDrawingOptions", null);
var ct = /* @__PURE__ */ new WeakMap(), Bt = /* @__PURE__ */ new WeakMap(), Ys = /* @__PURE__ */ new WeakMap(), is = /* @__PURE__ */ new WeakMap(), Ks = /* @__PURE__ */ new WeakMap(), ro = /* @__PURE__ */ new WeakMap(), Si = /* @__PURE__ */ new WeakMap(), gi = /* @__PURE__ */ new WeakMap(), ye = /* @__PURE__ */ new WeakMap(), oo = /* @__PURE__ */ new WeakMap(), rt = /* @__PURE__ */ new WeakSet(), bo = class extends Q {
  constructor(i) {
    super({
      ...i,
      name: "stampEditor"
    }), G(this, rt), _(this, ct, null), _(this, Bt, null), _(this, Ys, null), _(this, is, null), _(this, Ks, null), _(this, ro, ""), _(this, Si, null), _(this, gi, null), _(this, ye, !1), _(this, oo, !1), u(is, this, i.bitmapUrl), u(Ks, this, i.bitmapFile);
  }
  static initialize(i, t) {
    Q.initialize(i, t);
  }
  static get supportedTypes() {
    return $(this, "supportedTypes", [
      "apng",
      "avif",
      "bmp",
      "gif",
      "jpeg",
      "png",
      "svg+xml",
      "webp",
      "x-icon"
    ].map(((i) => `image/${i}`)));
  }
  static get supportedTypesStr() {
    return $(this, "supportedTypesStr", this.supportedTypes.join(","));
  }
  static isHandlingMimeForPasting(i) {
    return this.supportedTypes.includes(i);
  }
  static paste(i, t) {
    t.pasteEditor(W.STAMP, { bitmapFile: i.getAsFile() });
  }
  altTextFinish() {
    this._uiManager.useNewAltTextFlow && (this.div.hidden = !1), super.altTextFinish();
  }
  get telemetryFinalData() {
    return {
      type: "stamp",
      hasAltText: !!this.altTextData?.altText
    };
  }
  static computeTelemetryFinalData(i) {
    const t = i.get("hasAltText");
    return {
      hasAltText: t.get(!0) ?? 0,
      hasNoAltText: t.get(!1) ?? 0
    };
  }
  async mlGuessAltText(i = null, t = !0) {
    if (this.hasAltTextData()) return null;
    const { mlManager: e } = this._uiManager;
    if (!e) throw new Error("No ML.");
    if (!await e.isEnabledFor("altText")) throw new Error("ML isn't enabled for alt text.");
    const { data: s, width: n, height: r } = i || this.copyCanvas(null, null, !0).imageData, o = await e.guess({
      name: "altText",
      request: {
        data: s,
        width: n,
        height: r,
        channels: s.length / (n * r)
      }
    });
    if (!o) throw new Error("No response from the AI service.");
    if (o.error) throw new Error("Error from the AI service.");
    if (o.cancel) return null;
    if (!o.output) throw new Error("No valid response from the AI service.");
    const h = o.output;
    return await this.setGuessedAltText(h), t && !this.hasAltTextData() && (this.altTextData = {
      alt: h,
      decorative: !1
    }), h;
  }
  remove() {
    a(Bt, this) && (u(ct, this, null), this._uiManager.imageManager.deleteId(a(Bt, this)), a(Si, this)?.remove(), u(Si, this, null), a(gi, this) && (clearTimeout(a(gi, this)), u(gi, this, null))), super.remove();
  }
  rebuild() {
    this.parent ? (super.rebuild(), this.div !== null && (a(Bt, this) && a(Si, this) === null && g(rt, this, xh).call(this), this.isAttachedToDOM || this.parent.add(this))) : a(Bt, this) && g(rt, this, xh).call(this);
  }
  onceAdded(i) {
    this._isDraggable = !0, i && this.div.focus();
  }
  isEmpty() {
    return !(a(Ys, this) || a(ct, this) || a(is, this) || a(Ks, this) || a(Bt, this));
  }
  get isResizable() {
    return !0;
  }
  render() {
    if (this.div) return this.div;
    let i, t;
    if (this.width && (i = this.x, t = this.y), super.render(), this.div.hidden = !0, this.div.setAttribute("role", "figure"), this.addAltTextButton(), a(ct, this) ? g(rt, this, yu).call(this) : g(rt, this, xh).call(this), this.width && !this.annotationElementId) {
      const [e, s] = this.parentDimensions;
      this.setAt(i * e, t * s, this.width * e, this.height * s);
    }
    return this._uiManager.addShouldRescale(this), this.div;
  }
  _onResized() {
    this.onScaleChanging();
  }
  onScaleChanging() {
    this.parent && (a(gi, this) !== null && clearTimeout(a(gi, this)), u(gi, this, setTimeout((() => {
      u(gi, this, null), g(rt, this, xu).call(this);
    }), 200)));
  }
  copyCanvas(i, t, e = !1) {
    i || (i = 224);
    const { width: s, height: n } = a(ct, this), r = new Ol();
    let o = a(ct, this), h = s, l = n, c = null;
    if (t) {
      if (s > t || n > t) {
        const M = Math.min(t / s, t / n);
        h = Math.floor(s * M), l = Math.floor(n * M);
      }
      c = document.createElement("canvas");
      const p = c.width = Math.ceil(h * r.sx), f = c.height = Math.ceil(l * r.sy);
      a(ye, this) || (o = g(rt, this, Pl).call(this, p, f));
      const v = c.getContext("2d");
      v.filter = this._uiManager.hcmFilter;
      let m = "white", b = "#cfcfd8";
      this._uiManager.hcmFilter !== "none" ? b = "black" : window.matchMedia?.("(prefers-color-scheme: dark)").matches && (m = "#8f8f9d", b = "#42414d");
      const w = 15, A = w * r.sx, y = w * r.sy, x = new OffscreenCanvas(2 * A, 2 * y), S = x.getContext("2d");
      S.fillStyle = m, S.fillRect(0, 0, 2 * A, 2 * y), S.fillStyle = b, S.fillRect(0, 0, A, y), S.fillRect(A, y, A, y), v.fillStyle = v.createPattern(x, "repeat"), v.fillRect(0, 0, p, f), v.drawImage(o, 0, 0, o.width, o.height, 0, 0, p, f);
    }
    let d = null;
    if (e) {
      let p, f;
      if (r.symmetric && o.width < i && o.height < i)
        p = o.width, f = o.height;
      else if (o = a(ct, this), s > i || n > i) {
        const m = Math.min(i / s, i / n);
        p = Math.floor(s * m), f = Math.floor(n * m), a(ye, this) || (o = g(rt, this, Pl).call(this, p, f));
      }
      const v = new OffscreenCanvas(p, f).getContext("2d", { willReadFrequently: !0 });
      v.drawImage(o, 0, 0, o.width, o.height, 0, 0, p, f), d = {
        width: p,
        height: f,
        data: v.getImageData(0, 0, p, f).data
      };
    }
    return {
      canvas: c,
      width: h,
      height: l,
      imageData: d
    };
  }
  getImageForAltText() {
    return a(Si, this);
  }
  static async deserialize(i, t, e) {
    let s = null;
    if (i instanceof cu) {
      const { data: { rect: v, rotation: m, id: b, structParent: w, popupRef: A }, container: y, parent: { page: { pageNumber: x } } } = i, S = y.querySelector("canvas"), M = e.imageManager.getFromCanvas(y.id, S);
      S.remove();
      const P = (await t._structTree.getAriaAttributes(`${Il}${b}`))?.get("aria-label") || "";
      s = i = {
        annotationType: W.STAMP,
        bitmapId: M.id,
        bitmap: M.bitmap,
        pageIndex: x - 1,
        rect: v.slice(0),
        rotation: m,
        id: b,
        deleted: !1,
        accessibilityData: {
          decorative: !1,
          altText: P
        },
        isSvg: !1,
        structParent: w,
        popupRef: A
      };
    }
    const n = await super.deserialize(i, t, e), { rect: r, bitmap: o, bitmapUrl: h, bitmapId: l, isSvg: c, accessibilityData: d } = i;
    l && e.imageManager.isValidId(l) ? (u(Bt, n, l), o && u(ct, n, o)) : u(is, n, h), u(ye, n, c);
    const [p, f] = n.pageDimensions;
    return n.width = (r[2] - r[0]) / p, n.height = (r[3] - r[1]) / f, n.annotationElementId = i.id || null, d && (n.altTextData = d), n._initialData = s, u(oo, n, !!s), n;
  }
  serialize(i = !1, t = null) {
    if (this.isEmpty()) return null;
    if (this.deleted) return this.serializeDeleted();
    const e = {
      annotationType: W.STAMP,
      bitmapId: a(Bt, this),
      pageIndex: this.pageIndex,
      rect: this.getRect(0, 0),
      rotation: this.rotation,
      isSvg: a(ye, this),
      structTreeParentId: this._structTreeParentId
    };
    if (i)
      return e.bitmapUrl = g(rt, this, Sh).call(this, !0), e.accessibilityData = this.serializeAltText(!0), e;
    const { decorative: s, altText: n } = this.serializeAltText(!1);
    if (!s && n && (e.accessibilityData = {
      type: "Figure",
      alt: n
    }), this.annotationElementId) {
      const o = g(rt, this, am).call(this, e);
      if (o.isSame) return null;
      o.isSameAltText ? delete e.accessibilityData : e.accessibilityData.structParent = this._initialData.structParent ?? -1;
    }
    if (e.id = this.annotationElementId, t === null) return e;
    t.stamps || (t.stamps = /* @__PURE__ */ new Map());
    const r = a(ye, this) ? (e.rect[2] - e.rect[0]) * (e.rect[3] - e.rect[1]) : null;
    if (t.stamps.has(a(Bt, this))) {
      if (a(ye, this)) {
        const o = t.stamps.get(a(Bt, this));
        r > o.area && (o.area = r, o.serialized.bitmap.close(), o.serialized.bitmap = g(rt, this, Sh).call(this, !1));
      }
    } else
      t.stamps.set(a(Bt, this), {
        area: r,
        serialized: e
      }), e.bitmap = g(rt, this, Sh).call(this, !1);
    return e;
  }
  renderAnnotationElement(i) {
    return i.updateEdited({ rect: this.getRect(0, 0) }), null;
  }
};
gd = bo;
function ur(i, t = !1) {
  i ? (u(ct, this, i.bitmap), t || (u(Bt, this, i.id), u(ye, this, i.isSvg)), i.file && u(ro, this, i.file.name), g(rt, this, yu).call(this)) : this.remove();
}
function pr() {
  if (u(Ys, this, null), this._uiManager.enableWaiting(!1), a(Si, this)) if (this._uiManager.useNewAltTextWhenAddingImage && this._uiManager.useNewAltTextFlow && a(ct, this))
    this._editToolbar.hide(), this._uiManager.editAltText(this, !0);
  else {
    if (!this._uiManager.useNewAltTextWhenAddingImage && this._uiManager.useNewAltTextFlow && a(ct, this)) {
      this._reportTelemetry({
        action: "pdfjs.image.image_added",
        data: {
          alt_text_modal: !1,
          alt_text_type: "empty"
        }
      });
      try {
        this.mlGuessAltText();
      } catch {
      }
    }
    this.div.focus();
  }
}
function xh() {
  if (a(Bt, this)) {
    this._uiManager.enableWaiting(!0), this._uiManager.imageManager.getFromId(a(Bt, this)).then(((e) => g(rt, this, ur).call(this, e, !0))).finally((() => g(rt, this, pr).call(this)));
    return;
  }
  if (a(is, this)) {
    const e = a(is, this);
    u(is, this, null), this._uiManager.enableWaiting(!0), u(Ys, this, this._uiManager.imageManager.getFromUrl(e).then(((s) => g(rt, this, ur).call(this, s))).finally((() => g(rt, this, pr).call(this))));
    return;
  }
  if (a(Ks, this)) {
    const e = a(Ks, this);
    u(Ks, this, null), this._uiManager.enableWaiting(!0), u(Ys, this, this._uiManager.imageManager.getFromFile(e).then(((s) => g(rt, this, ur).call(this, s))).finally((() => g(rt, this, pr).call(this))));
    return;
  }
  const i = document.createElement("input");
  i.type = "file", i.accept = gd.supportedTypesStr;
  const t = this._uiManager._signal;
  u(Ys, this, new Promise(((e) => {
    i.addEventListener("change", (async () => {
      if (i.files && i.files.length !== 0) {
        this._uiManager.enableWaiting(!0);
        const s = await this._uiManager.imageManager.getFromFile(i.files[0]);
        this._reportTelemetry({
          action: "pdfjs.image.image_selected",
          data: { alt_text_modal: this._uiManager.useNewAltTextFlow }
        }), g(rt, this, ur).call(this, s);
      } else this.remove();
      e();
    }), { signal: t }), i.addEventListener("cancel", (() => {
      this.remove(), e();
    }), { signal: t });
  })).finally((() => g(rt, this, pr).call(this)))), i.click();
}
function yu() {
  const { div: i } = this;
  let { width: t, height: e } = a(ct, this);
  const [s, n] = this.pageDimensions, r = 0.75;
  if (this.width)
    t = this.width * s, e = this.height * n;
  else if (t > r * s || e > r * n) {
    const c = Math.min(r * s / t, r * n / e);
    t *= c, e *= c;
  }
  const [o, h] = this.parentDimensions;
  this.setDims(t * o / s, e * h / n), this._uiManager.enableWaiting(!1);
  const l = u(Si, this, document.createElement("canvas"));
  l.setAttribute("role", "img"), this.addContainer(l), this.width = t / s, this.height = e / n, this._initialOptions?.isCentered ? this.center() : this.fixAndSetPosition(), this._initialOptions = null, this._uiManager.useNewAltTextWhenAddingImage && this._uiManager.useNewAltTextFlow && !this.annotationElementId || (i.hidden = !1), g(rt, this, xu).call(this), a(oo, this) || (this.parent.addUndoableEditor(this), u(oo, this, !0)), this._reportTelemetry({ action: "inserted_image" }), a(ro, this) && l.setAttribute("aria-label", a(ro, this));
}
function Pl(i, t) {
  const { width: e, height: s } = a(ct, this);
  let n = e, r = s, o = a(ct, this);
  for (; n > 2 * i || r > 2 * t; ) {
    const h = n, l = r;
    n > 2 * i && (n = n >= 16384 ? Math.floor(n / 2) - 1 : Math.ceil(n / 2)), r > 2 * t && (r = r >= 16384 ? Math.floor(r / 2) - 1 : Math.ceil(r / 2));
    const c = new OffscreenCanvas(n, r);
    c.getContext("2d").drawImage(o, 0, 0, h, l, 0, 0, n, r), o = c.transferToImageBitmap();
  }
  return o;
}
function xu() {
  const [i, t] = this.parentDimensions, { width: e, height: s } = this, n = new Ol(), r = Math.ceil(e * i * n.sx), o = Math.ceil(s * t * n.sy), h = a(Si, this);
  if (!h || h.width === r && h.height === o) return;
  h.width = r, h.height = o;
  const l = a(ye, this) ? a(ct, this) : g(rt, this, Pl).call(this, r, o), c = h.getContext("2d");
  c.filter = this._uiManager.hcmFilter, c.drawImage(l, 0, 0, l.width, l.height, 0, 0, r, o);
}
function Sh(i) {
  if (i) {
    if (a(ye, this)) {
      const e = this._uiManager.imageManager.getSvgUrl(a(Bt, this));
      if (e) return e;
    }
    const t = document.createElement("canvas");
    return { width: t.width, height: t.height } = a(ct, this), t.getContext("2d").drawImage(a(ct, this), 0, 0), t.toDataURL();
  }
  if (a(ye, this)) {
    const [t, e] = this.pageDimensions, s = Math.round(this.width * t * Le.PDF_TO_CSS_UNITS), n = Math.round(this.height * e * Le.PDF_TO_CSS_UNITS), r = new OffscreenCanvas(s, n);
    return r.getContext("2d").drawImage(a(ct, this), 0, 0, a(ct, this).width, a(ct, this).height, 0, 0, s, n), r.transferToImageBitmap();
  }
  return structuredClone(a(ct, this));
}
function am(i) {
  const { pageIndex: t, accessibilityData: { altText: e } } = this._initialData, s = i.pageIndex === t, n = (i.accessibilityData?.alt || "") === e;
  return {
    isSame: !this._hasBeenMoved && !this._hasBeenResized && s && n,
    isSameAltText: n
  };
}
L(bo, "_type", "stamp");
L(bo, "_editorType", W.STAMP);
var Rn = /* @__PURE__ */ new WeakMap(), gr = /* @__PURE__ */ new WeakMap(), fi = /* @__PURE__ */ new WeakMap(), Cs = /* @__PURE__ */ new WeakMap(), Wi = /* @__PURE__ */ new WeakMap(), De = /* @__PURE__ */ new WeakMap(), Ps = /* @__PURE__ */ new WeakMap(), fr = /* @__PURE__ */ new WeakMap(), Dn = /* @__PURE__ */ new WeakMap(), Be = /* @__PURE__ */ new WeakMap(), Bi = /* @__PURE__ */ new WeakMap(), Xt = /* @__PURE__ */ new WeakMap(), Hi = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakMap(), _t = /* @__PURE__ */ new WeakSet(), Su = class Tl {
  constructor({ uiManager: t, pageIndex: e, div: s, structTreeLayer: n, accessibilityManager: r, annotationLayer: o, drawLayer: h, textLayer: l, viewport: c, l10n: d }) {
    G(this, _t), _(this, Rn, void 0), _(this, gr, !1), _(this, fi, null), _(this, Cs, null), _(this, Wi, null), _(this, De, /* @__PURE__ */ new Map()), _(this, Ps, !1), _(this, fr, !1), _(this, Dn, !1), _(this, Be, null), _(this, Bi, null), _(this, Xt, null), _(this, Hi, null), _(this, T, void 0);
    const p = [...Yn._.values()];
    if (!Tl._initialized) {
      Tl._initialized = !0;
      for (const f of p) f.initialize(d, t);
    }
    t.registerEditorTypes(p), u(T, this, t), this.pageIndex = e, this.div = s, u(Rn, this, r), u(fi, this, o), this.viewport = c, u(Xt, this, l), this.drawLayer = h, this._structTree = n, a(T, this).addLayer(this);
  }
  get isEmpty() {
    return a(De, this).size === 0;
  }
  get isInvisible() {
    return this.isEmpty && a(T, this).getMode() === W.NONE;
  }
  updateToolbar(t) {
    a(T, this).updateToolbar(t);
  }
  updateMode(t = a(T, this).getMode()) {
    switch (g(_t, this, kh).call(this), t) {
      case W.NONE:
        this.disableTextSelection(), this.togglePointerEvents(!1), this.toggleAnnotationLayerPointerEvents(!0), this.disableClick();
        return;
      case W.INK:
        this.disableTextSelection(), this.togglePointerEvents(!0), this.enableClick();
        break;
      case W.HIGHLIGHT:
        this.enableTextSelection(), this.togglePointerEvents(!1), this.disableClick();
        break;
      default:
        this.disableTextSelection(), this.togglePointerEvents(!0), this.enableClick();
    }
    this.toggleAnnotationLayerPointerEvents(!1);
    const { classList: e } = this.div;
    for (const s of Yn._.values()) e.toggle(`${s._type}Editing`, t === s._editorType);
    this.div.hidden = !1;
  }
  hasTextLayer(t) {
    return t === a(Xt, this)?.div;
  }
  setEditingState(t) {
    a(T, this).setEditingState(t);
  }
  addCommands(t) {
    a(T, this).addCommands(t);
  }
  cleanUndoStack(t) {
    a(T, this).cleanUndoStack(t);
  }
  toggleDrawing(t = !1) {
    this.div.classList.toggle("drawing", !t);
  }
  togglePointerEvents(t = !1) {
    this.div.classList.toggle("disabled", !t);
  }
  toggleAnnotationLayerPointerEvents(t = !1) {
    a(fi, this)?.div.classList.toggle("disabled", !t);
  }
  async enable() {
    u(Dn, this, !0), this.div.tabIndex = 0, this.togglePointerEvents(!0);
    const t = /* @__PURE__ */ new Set();
    for (const s of a(De, this).values())
      s.enableEditing(), s.show(!0), s.annotationElementId && (a(T, this).removeChangedExistingAnnotation(s), t.add(s.annotationElementId));
    if (!a(fi, this)) {
      u(Dn, this, !1);
      return;
    }
    const e = a(fi, this).getEditableAnnotations();
    for (const s of e) {
      if (s.hide(), a(T, this).isDeletedAnnotationElement(s.data.id) || t.has(s.data.id)) continue;
      const n = await this.deserialize(s);
      n && (this.addOrRebuild(n), n.enableEditing());
    }
    u(Dn, this, !1);
  }
  disable() {
    u(fr, this, !0), this.div.tabIndex = -1, this.togglePointerEvents(!1);
    const t = /* @__PURE__ */ new Map(), e = /* @__PURE__ */ new Map();
    for (const n of a(De, this).values())
      n.disableEditing(), n.annotationElementId && (n.serialize() === null ? (e.set(n.annotationElementId, n), this.getEditableAnnotation(n.annotationElementId)?.show(), n.remove()) : t.set(n.annotationElementId, n));
    if (a(fi, this)) {
      const n = a(fi, this).getEditableAnnotations();
      for (const r of n) {
        const { id: o } = r.data;
        if (a(T, this).isDeletedAnnotationElement(o)) continue;
        let h = e.get(o);
        h ? (h.resetAnnotationElement(r), h.show(!1), r.show()) : (h = t.get(o), h && (a(T, this).addChangedExistingAnnotation(h), h.renderAnnotationElement(r) && h.show(!1)), r.show());
      }
    }
    g(_t, this, kh).call(this), this.isEmpty && (this.div.hidden = !0);
    const { classList: s } = this.div;
    for (const n of Yn._.values()) s.remove(`${n._type}Editing`);
    this.disableTextSelection(), this.toggleAnnotationLayerPointerEvents(!0), u(fr, this, !1);
  }
  getEditableAnnotation(t) {
    return a(fi, this)?.getEditableAnnotation(t) || null;
  }
  setActiveEditor(t) {
    a(T, this).getActive() !== t && a(T, this).setActiveEditor(t);
  }
  enableTextSelection() {
    if (this.div.tabIndex = -1, a(Xt, this)?.div && !a(Hi, this)) {
      u(Hi, this, new AbortController());
      const t = a(T, this).combinedSignal(a(Hi, this));
      a(Xt, this).div.addEventListener("pointerdown", g(_t, this, rm).bind(this), { signal: t }), a(Xt, this).div.classList.add("highlighting");
    }
  }
  disableTextSelection() {
    this.div.tabIndex = 0, a(Xt, this)?.div && a(Hi, this) && (a(Hi, this).abort(), u(Hi, this, null), a(Xt, this).div.classList.remove("highlighting"));
  }
  enableClick() {
    if (a(Cs, this)) return;
    u(Cs, this, new AbortController());
    const t = a(T, this).combinedSignal(a(Cs, this));
    this.div.addEventListener("pointerdown", this.pointerdown.bind(this), { signal: t });
    const e = this.pointerup.bind(this);
    this.div.addEventListener("pointerup", e, { signal: t }), this.div.addEventListener("pointercancel", e, { signal: t });
  }
  disableClick() {
    a(Cs, this)?.abort(), u(Cs, this, null);
  }
  attach(t) {
    a(De, this).set(t.id, t);
    const { annotationElementId: e } = t;
    e && a(T, this).isDeletedAnnotationElement(e) && a(T, this).removeDeletedAnnotationElement(t);
  }
  detach(t) {
    a(De, this).delete(t.id), a(Rn, this)?.removePointerInTextLayer(t.contentDiv), !a(fr, this) && t.annotationElementId && a(T, this).addDeletedAnnotationElement(t);
  }
  remove(t) {
    this.detach(t), a(T, this).removeEditor(t), t.div.remove(), t.isAttachedToDOM = !1;
  }
  changeParent(t) {
    t.parent !== this && (t.parent && t.annotationElementId && (a(T, this).addDeletedAnnotationElement(t.annotationElementId), Q.deleteAnnotationElement(t), t.annotationElementId = null), this.attach(t), t.parent?.detach(t), t.setParent(this), t.div && t.isAttachedToDOM && (t.div.remove(), this.div.append(t.div)));
  }
  add(t) {
    if (t.parent !== this || !t.isAttachedToDOM) {
      if (this.changeParent(t), a(T, this).addEditor(t), this.attach(t), !t.isAttachedToDOM) {
        const e = t.render();
        this.div.append(e), t.isAttachedToDOM = !0;
      }
      t.fixAndSetPosition(), t.onceAdded(!a(Dn, this)), a(T, this).addToAnnotationStorage(t), t._reportTelemetry(t.telemetryInitialData);
    }
  }
  moveEditorInDOM(t) {
    if (!t.isAttachedToDOM) return;
    const { activeElement: e } = document;
    t.div.contains(e) && !a(Wi, this) && (t._focusEventsAllowed = !1, u(Wi, this, setTimeout((() => {
      u(Wi, this, null), t.div.contains(document.activeElement) ? t._focusEventsAllowed = !0 : (t.div.addEventListener("focusin", (() => {
        t._focusEventsAllowed = !0;
      }), {
        once: !0,
        signal: a(T, this)._signal
      }), e.focus());
    }), 0))), t._structTreeParentId = a(Rn, this)?.moveElementInDOM(this.div, t.div, t.contentDiv, !0);
  }
  addOrRebuild(t) {
    t.needsToBeRebuilt() ? (t.parent || (t.parent = this), t.rebuild(), t.show()) : this.add(t);
  }
  addUndoableEditor(t) {
    this.addCommands({
      cmd: () => t._uiManager.rebuild(t),
      undo: () => {
        t.remove();
      },
      mustExec: !1
    });
  }
  getNextId() {
    return a(T, this).getId();
  }
  combinedSignal(t) {
    return a(T, this).combinedSignal(t);
  }
  canCreateNewEmptyEditor() {
    return Ge.call(g(_t, this))?.canCreateNewEmptyEditor();
  }
  pasteEditor(t, e) {
    a(T, this).updateToolbar(t), a(T, this).updateMode(t);
    const { offsetX: s, offsetY: n } = g(_t, this, ad).call(this), r = this.getNextId(), o = g(_t, this, nd).call(this, {
      parent: this,
      id: r,
      x: s,
      y: n,
      uiManager: a(T, this),
      isCentered: !0,
      ...e
    });
    o && this.add(o);
  }
  async deserialize(t) {
    return await Yn._.get(t.annotationType ?? t.annotationEditorType)?.deserialize(t, this, a(T, this)) || null;
  }
  createAndAddNewEditor(t, e, s = {}) {
    const n = this.getNextId(), r = g(_t, this, nd).call(this, {
      parent: this,
      id: n,
      x: t.offsetX,
      y: t.offsetY,
      uiManager: a(T, this),
      isCentered: e,
      ...s
    });
    return r && this.add(r), r;
  }
  addNewEditor() {
    this.createAndAddNewEditor(g(_t, this, ad).call(this), !0);
  }
  setSelected(t) {
    a(T, this).setSelected(t);
  }
  toggleSelected(t) {
    a(T, this).toggleSelected(t);
  }
  unselect(t) {
    a(T, this).unselect(t);
  }
  pointerup(t) {
    const { isMac: e } = Gt.platform;
    !(t.button !== 0 || t.ctrlKey && e) && t.target === this.div && a(Ps, this) && (u(Ps, this, !1), Ge.call(g(_t, this))?.isDrawer && Ge.call(g(_t, this)).supportMultipleDrawings || (a(gr, this) ? a(T, this).getMode() !== W.STAMP ? this.createAndAddNewEditor(t, !1) : a(T, this).unselectAll() : u(gr, this, !0)));
  }
  pointerdown(t) {
    if (a(T, this).getMode() === W.HIGHLIGHT && this.enableTextSelection(), a(Ps, this)) {
      u(Ps, this, !1);
      return;
    }
    const { isMac: e } = Gt.platform;
    if (t.button !== 0 || t.ctrlKey && e || t.target !== this.div) return;
    if (u(Ps, this, !0), Ge.call(g(_t, this))?.isDrawer) {
      this.startDrawingSession(t);
      return;
    }
    const s = a(T, this).getActive();
    u(gr, this, !s || s.isEmpty());
  }
  startDrawingSession(t) {
    if (this.div.focus(), a(Be, this)) {
      Ge.call(g(_t, this)).startDrawing(this, a(T, this), !1, t);
      return;
    }
    a(T, this).setCurrentDrawingSession(this), u(Be, this, new AbortController());
    const e = a(T, this).combinedSignal(a(Be, this));
    this.div.addEventListener("blur", (({ relatedTarget: s }) => {
      s && !this.div.contains(s) && (u(Bi, this, null), this.commitOrRemove());
    }), { signal: e }), Ge.call(g(_t, this)).startDrawing(this, a(T, this), !1, t);
  }
  pause(t) {
    if (t) {
      const { activeElement: e } = document;
      this.div.contains(e) && u(Bi, this, e);
    } else a(Bi, this) && setTimeout((() => {
      a(Bi, this)?.focus(), u(Bi, this, null);
    }), 0);
  }
  endDrawingSession(t = !1) {
    return a(Be, this) ? (a(T, this).setCurrentDrawingSession(null), a(Be, this).abort(), u(Be, this, null), u(Bi, this, null), Ge.call(g(_t, this)).endDrawing(t)) : null;
  }
  findNewParent(t, e, s) {
    const n = a(T, this).findParent(e, s);
    return n === null || n === this ? !1 : (n.changeParent(t), !0);
  }
  commitOrRemove() {
    return a(Be, this) ? (this.endDrawingSession(), !0) : !1;
  }
  onScaleChanging() {
    a(Be, this) && Ge.call(g(_t, this)).onScaleChangingWhenDrawing(this);
  }
  destroy() {
    this.commitOrRemove(), a(T, this).getActive()?.parent === this && (a(T, this).commitOrRemove(), a(T, this).setActiveEditor(null)), a(Wi, this) && (clearTimeout(a(Wi, this)), u(Wi, this, null));
    for (const t of a(De, this).values())
      a(Rn, this)?.removePointerInTextLayer(t.contentDiv), t.setParent(null), t.isAttachedToDOM = !1, t.div.remove();
    this.div = null, a(De, this).clear(), a(T, this).removeLayer(this);
  }
  render({ viewport: t }) {
    this.viewport = t, os(this.div, t);
    for (const e of a(T, this).getEditors(this.pageIndex))
      this.add(e), e.rebuild();
    this.updateMode();
  }
  update({ viewport: t }) {
    a(T, this).commitOrRemove(), g(_t, this, kh).call(this);
    const e = this.viewport.rotation, s = t.rotation;
    if (this.viewport = t, os(this.div, { rotation: s }), e !== s) for (const n of a(De, this).values()) n.rotate(s);
  }
  get pageDimensions() {
    const { pageWidth: t, pageHeight: e } = this.viewport.rawDims;
    return [t, e];
  }
  get scale() {
    return a(T, this).viewParameters.realScale;
  }
};
function rm(i) {
  a(T, this).unselectAll();
  const { target: t } = i;
  if (t === a(Xt, this).div || (t.getAttribute("role") === "img" || t.classList.contains("endOfContent")) && a(Xt, this).div.contains(t)) {
    const { isMac: e } = Gt.platform;
    if (i.button !== 0 || i.ctrlKey && e) return;
    a(T, this).showAllEditors("highlight", !0, !0), a(Xt, this).div.classList.add("free"), this.toggleDrawing(), Me.startHighlighting(this, a(T, this).direction === "ltr", {
      target: a(Xt, this).div,
      x: i.x,
      y: i.y
    }), a(Xt, this).div.addEventListener("pointerup", (() => {
      a(Xt, this).div.classList.remove("free"), this.toggleDrawing(!0);
    }), {
      once: !0,
      signal: a(T, this)._signal
    }), i.preventDefault();
  }
}
function Ge() {
  return Yn._.get(a(T, this).getMode());
}
function nd(i) {
  const t = Ge.call(g(_t, this));
  return t ? new t.prototype.constructor(i) : null;
}
function ad() {
  const { x: i, y: t, width: e, height: s } = this.div.getBoundingClientRect(), n = Math.max(0, i), r = Math.max(0, t), o = (n + Math.min(window.innerWidth, i + e)) / 2 - i, h = (r + Math.min(window.innerHeight, t + s)) / 2 - t, [l, c] = this.viewport.rotation % 180 == 0 ? [o, h] : [h, o];
  return {
    offsetX: l,
    offsetY: c
  };
}
function kh() {
  for (const i of a(De, this).values()) i.isEmpty() && i.remove();
}
L(Su, "_initialized", !1);
var Yn = { _: new Map([
  Ti,
  _o,
  bo,
  Me
].map(((i) => [i._editorType, i]))) }, je = /* @__PURE__ */ new WeakMap(), In = /* @__PURE__ */ new WeakMap(), te = /* @__PURE__ */ new WeakMap(), Ln = /* @__PURE__ */ new WeakMap(), Ts = /* @__PURE__ */ new WeakSet(), ku = class fe {
  constructor({ pageIndex: t }) {
    G(this, Ts), _(this, je, null), _(this, In, 0), _(this, te, /* @__PURE__ */ new Map()), _(this, Ln, /* @__PURE__ */ new Map()), this.pageIndex = t;
  }
  setParent(t) {
    if (a(je, this)) {
      if (a(je, this) !== t) {
        if (a(te, this).size > 0) for (const e of a(te, this).values())
          e.remove(), t.append(e);
        u(je, this, t);
      }
    } else u(je, this, t);
  }
  static get _svgFactory() {
    return $(this, "_svgFactory", new Vl());
  }
  draw(t, e = !1, s = !1) {
    var n, r;
    const o = (u(In, this, (n = a(In, this), r = n++, n)), r), h = g(Ts, this, rd).call(this), l = fe._svgFactory.createElement("defs");
    h.append(l);
    const c = fe._svgFactory.createElement("path");
    l.append(c);
    const d = `path_p${this.pageIndex}_${o}`;
    c.setAttribute("id", d), c.setAttribute("vector-effect", "non-scaling-stroke"), e && a(Ln, this).set(o, c);
    const p = s ? g(Ts, this, hm).call(this, l, d) : null, f = fe._svgFactory.createElement("use");
    return h.append(f), f.setAttribute("href", `#${d}`), this.updateProperties(h, t), a(te, this).set(o, h), {
      id: o,
      clipPathId: `url(#${p})`
    };
  }
  drawOutline(t, e) {
    var s, n;
    const r = (u(In, this, (s = a(In, this), n = s++, s)), n), o = g(Ts, this, rd).call(this), h = fe._svgFactory.createElement("defs");
    o.append(h);
    const l = fe._svgFactory.createElement("path");
    h.append(l);
    const c = `path_p${this.pageIndex}_${r}`;
    l.setAttribute("id", c), l.setAttribute("vector-effect", "non-scaling-stroke");
    let d;
    if (e) {
      const v = fe._svgFactory.createElement("mask");
      h.append(v), d = `mask_p${this.pageIndex}_${r}`, v.setAttribute("id", d), v.setAttribute("maskUnits", "objectBoundingBox");
      const m = fe._svgFactory.createElement("rect");
      v.append(m), m.setAttribute("width", "1"), m.setAttribute("height", "1"), m.setAttribute("fill", "white");
      const b = fe._svgFactory.createElement("use");
      v.append(b), b.setAttribute("href", `#${c}`), b.setAttribute("stroke", "none"), b.setAttribute("fill", "black"), b.setAttribute("fill-rule", "nonzero"), b.classList.add("mask");
    }
    const p = fe._svgFactory.createElement("use");
    o.append(p), p.setAttribute("href", `#${c}`), d && p.setAttribute("mask", `url(#${d})`);
    const f = p.cloneNode();
    return o.append(f), p.classList.add("mainOutline"), f.classList.add("secondaryOutline"), this.updateProperties(o, t), a(te, this).set(r, o), r;
  }
  finalizeDraw(t, e) {
    a(Ln, this).delete(t), this.updateProperties(t, e);
  }
  updateProperties(t, e) {
    if (!e) return;
    const { root: s, bbox: n, rootClass: r, path: o } = e, h = typeof t == "number" ? a(te, this).get(t) : t;
    if (h) {
      if (s && g(Ts, this, od).call(this, h, s), n && om.call(fe, h, n), r) {
        const { classList: l } = h;
        for (const [c, d] of Object.entries(r)) l.toggle(c, d);
      }
      if (o) {
        const l = h.firstChild.firstChild;
        g(Ts, this, od).call(this, l, o);
      }
    }
  }
  updateParent(t, e) {
    if (e === this) return;
    const s = a(te, this).get(t);
    s && (a(je, e).append(s), a(te, this).delete(t), a(te, e).set(t, s));
  }
  remove(t) {
    a(Ln, this).delete(t), a(je, this) !== null && (a(te, this).get(t).remove(), a(te, this).delete(t));
  }
  destroy() {
    u(je, this, null);
    for (const t of a(te, this).values()) t.remove();
    a(te, this).clear(), a(Ln, this).clear();
  }
};
Ur = ku;
function om(i, [t, e, s, n]) {
  const { style: r } = i;
  r.top = 100 * e + "%", r.left = 100 * t + "%", r.width = 100 * s + "%", r.height = 100 * n + "%";
}
function rd() {
  const i = Ur._svgFactory.create(1, 1, !0);
  return a(je, this).append(i), i.setAttribute("aria-hidden", !0), i;
}
function hm(i, t) {
  const e = Ur._svgFactory.createElement("clipPath");
  i.append(e);
  const s = `clip_${t}`;
  e.setAttribute("id", s), e.setAttribute("clipPathUnits", "objectBoundingBox");
  const n = Ur._svgFactory.createElement("use");
  return e.append(n), n.setAttribute("href", `#${t}`), n.classList.add("clip"), s;
}
function od(i, t) {
  for (const [e, s] of Object.entries(t)) s === null ? i.removeAttribute(e) : i.setAttribute(e, s);
}
globalThis.pdfjsTestingUtils = { HighlightOutliner: bl };
var lm = N.AbortException, cm = N.AnnotationEditorLayer, dm = N.AnnotationEditorParamsType, um = N.AnnotationEditorType, pm = N.AnnotationEditorUIManager, gm = N.AnnotationLayer, fm = N.AnnotationMode, mm = N.ColorPicker, vm = N.DOMSVGFactory, _m = N.DrawLayer, bm = N.FeatureTest, wm = N.GlobalWorkerOptions, Am = N.ImageKind, ym = N.InvalidPDFException, xm = N.MissingPDFException, Sm = N.OPS, km = N.OutputScale, Mm = N.PDFDataRangeTransport, Em = N.PDFDateString, Cm = N.PDFWorker, Pm = N.PasswordResponses, Tm = N.PermissionFlag, Rm = N.PixelsPerInch, Dm = N.RenderingCancelledException, Im = N.TextLayer, Lm = N.TouchManager, Fm = N.UnexpectedResponseException, Nm = N.Util, Om = N.VerbosityLevel, Wm = N.XfaLayer, Bm = N.build, Hm = N.createValidAbsoluteUrl, $m = N.fetchData, zm = N.getDocument, Gm = N.getFilenameFromUrl, jm = N.getPdfFilenameFromUrl, Vm = N.getXfaPageViewport, Um = N.isDataScheme, qm = N.isPdfFile, Xm = N.noContextMenu, Ym = N.normalizeUnicode, Km = N.setLayerDimensions, Qm = N.shadow, Jm = N.stopEvent, Zm = N.version, ca = Tu, tv = "unknown", Fn = new URL(
  /* @vite-ignore */
  "../pdf.worker.min.mjs",
  import.meta.url
).toString(), hd = null;
function ev() {
  return String(ca.version || "unknown").trim() || "unknown";
}
function iv(i) {
  const t = i.match(/\((\d{3})\)|status[:\s]+(\d{3})|^(\d{3})$/i);
  if (!t) return null;
  const e = parseInt(t[1] || t[2] || t[3], 10);
  return Number.isNaN(e) || e < 400 || e > 599 ? null : e;
}
function sv() {
  if (!ca.GlobalWorkerOptions) throw new Error("PDF worker configuration is unavailable.");
  return (hd !== Fn || ca.GlobalWorkerOptions.workerSrc !== Fn) && (ca.GlobalWorkerOptions.workerSrc = Fn, hd = Fn), Fn;
}
function nv() {
  return sv(), ca;
}
function gv(i) {
  const t = nv(), e = typeof i.withCredentials == "boolean" ? i.withCredentials : null, s = e === null ? i.url : {
    url: i.url,
    withCredentials: e
  };
  return t.getDocument(s);
}
function av(i, t = {}) {
  const e = (i instanceof Error ? String(i.message || i.name || "Failed to load PDF") : typeof i == "string" ? i : "Failed to load PDF").trim() || "Failed to load PDF", s = e.toLowerCase(), n = iv(e);
  let r = "pdf_load_failed", o = "Preview unavailable", h = "Unable to load the document preview.", l = !0;
  return s.includes("globalworkeroptions.workersrc") || s.includes("worker configuration") || s.includes("worker src") ? (r = "pdf_worker_configuration", o = "Preview unavailable", h = "The document preview is temporarily unavailable. Please try again.") : s.includes("network") || s.includes("failed to fetch") || s.includes("connection") ? (r = "pdf_network_error", o = "Connection problem", h = "Please check your connection and try again.") : n === 401 ? (r = "pdf_unauthorized", o = "Unable to access this document", h = "Please sign in again and try again.", l = !1) : n === 403 ? (r = "pdf_forbidden", o = "Access denied", h = "You do not have permission to view this document.", l = !1) : n === 404 ? (r = "pdf_not_found", o = "Document not found", h = "This document may have been moved or deleted.", l = !1) : n !== null && n >= 500 ? (r = "pdf_server_error", o = "Service temporarily unavailable", h = "Please try again in a moment.") : s.includes("invalidpdf") || s.includes("invalid pdf") || s.includes("corrupt") || s.includes("malformed") ? (r = "pdf_invalid", o = "Unsupported PDF", h = "This PDF could not be rendered for preview.", l = !1) : s.includes("password") && (r = "pdf_password_protected", o = "Password-protected PDF", h = "This PDF requires a password and cannot be previewed here.", l = !1), {
    code: r,
    message: o,
    suggestion: h,
    rawMessage: e,
    status: n,
    isRetryable: l,
    surface: String(t.surface || tv),
    documentId: t.documentId ? String(t.documentId) : null,
    url: t.url ? String(t.url) : null,
    workerMode: "dedicated_worker",
    version: ev()
  };
}
function fv(i, t = {}) {
  const e = av(i, t);
  return console.error("[esign-pdf]", e), e;
}
export {
  fv as n,
  gv as t
};

//# sourceMappingURL=runtime-CmD8_aZj.js.map