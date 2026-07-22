import { escapeHTML as p } from "../shared/html.js";
import { httpRequest as $, readCSRFToken as Qe, readExpectedHTTPJSON as j, readHTTPErrorResult as Xe } from "../shared/transport/http-client.js";
import { t as We } from "../chunks/sortable.esm-CcMbOE-M.js";
import { A as Bs, B as Us, C as Ye, D as S, E as Ge, F as me, G as ge, H as Js, K as Ks, L as Vs, M as Ze, N as et, O as Hs, P as tt, R as ye, S as zs, T as st, U as Qs, V as rt, W as Xs, _ as at, a as Ws, b as nt, c as Ys, d as Gs, f as it, g as ot, h as lt, i as I, j as Zs, k as er, l as tr, m as ct, n as sr, o as rr, p as dt, r as be, s as ar, t as ut, u as nr, v as Ee, w as ht, x as ft, y as pt, z as ir } from "../chunks/builtin-panels-LsMU86_3.js";
import { t as mt } from "../chunks/repl-panel-Dvtc4bMw.js";
import { i as gt, n as cr, r as dr, t as ur } from "../chunks/icons-B_VaFfsl.js";
import { A as fr, B, C as pr, D as mr, E as gr, F as yr, G as V, I as br, J as Er, K as yt, L as vr, M as bt, N as Sr, O as wr, P as G, S as H, T as Pr, U as Ar, V as U, W as Et, X as Cr, Y as vt, _ as St, a as xr, b as wt, c as _r, d as Pt, f as At, g as Ct, h as xt, i as _t, j as Or, k as $r, l as Ot, m as Lr, n as $t, o as Rr, p as ve, q as Dr, r as kr, s as Z, u as Ir, v as Tr, w as L, x as qr, y as Lt } from "../chunks/server-definitions-C0QmC9Ua.js";
var Rt = class {
  add(e, t, s) {
    if (typeof arguments[0] != "string") for (let r in arguments[0]) this.add(r, arguments[0][r], arguments[1]);
    else (Array.isArray(e) ? e : [e]).forEach(function(r) {
      this[r] = this[r] || [], t && this[r][s ? "unshift" : "push"](t);
    }, this);
  }
  run(e, t) {
    this[e] = this[e] || [], this[e].forEach(function(s) {
      s.call(t && t.context ? t.context : t, t);
    });
  }
}, Dt = class {
  constructor(e) {
    this.jsep = e, this.registered = {};
  }
  register() {
    for (var e = arguments.length, t = new Array(e), s = 0; s < e; s++) t[s] = arguments[s];
    t.forEach((r) => {
      if (typeof r != "object" || !r.name || !r.init) throw new Error("Invalid JSEP plugin format");
      this.registered[r.name] || (r.init(this.jsep), this.registered[r.name] = r);
    });
  }
}, C = class c {
  static get version() {
    return "1.4.0";
  }
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + c.version;
  }
  static addUnaryOp(t) {
    return c.max_unop_len = Math.max(t.length, c.max_unop_len), c.unary_ops[t] = 1, c;
  }
  static addBinaryOp(t, s, r) {
    return c.max_binop_len = Math.max(t.length, c.max_binop_len), c.binary_ops[t] = s, r ? c.right_associative.add(t) : c.right_associative.delete(t), c;
  }
  static addIdentifierChar(t) {
    return c.additional_identifier_chars.add(t), c;
  }
  static addLiteral(t, s) {
    return c.literals[t] = s, c;
  }
  static removeUnaryOp(t) {
    return delete c.unary_ops[t], t.length === c.max_unop_len && (c.max_unop_len = c.getMaxKeyLen(c.unary_ops)), c;
  }
  static removeAllUnaryOps() {
    return c.unary_ops = {}, c.max_unop_len = 0, c;
  }
  static removeIdentifierChar(t) {
    return c.additional_identifier_chars.delete(t), c;
  }
  static removeBinaryOp(t) {
    return delete c.binary_ops[t], t.length === c.max_binop_len && (c.max_binop_len = c.getMaxKeyLen(c.binary_ops)), c.right_associative.delete(t), c;
  }
  static removeAllBinaryOps() {
    return c.binary_ops = {}, c.max_binop_len = 0, c;
  }
  static removeLiteral(t) {
    return delete c.literals[t], c;
  }
  static removeAllLiterals() {
    return c.literals = {}, c;
  }
  get char() {
    return this.expr.charAt(this.index);
  }
  get code() {
    return this.expr.charCodeAt(this.index);
  }
  constructor(t) {
    this.expr = t, this.index = 0;
  }
  static parse(t) {
    return new c(t).parse();
  }
  static getMaxKeyLen(t) {
    return Math.max(0, ...Object.keys(t).map((s) => s.length));
  }
  static isDecimalDigit(t) {
    return t >= 48 && t <= 57;
  }
  static binaryPrecedence(t) {
    return c.binary_ops[t] || 0;
  }
  static isIdentifierStart(t) {
    return t >= 65 && t <= 90 || t >= 97 && t <= 122 || t >= 128 && !c.binary_ops[String.fromCharCode(t)] || c.additional_identifier_chars.has(String.fromCharCode(t));
  }
  static isIdentifierPart(t) {
    return c.isIdentifierStart(t) || c.isDecimalDigit(t);
  }
  throwError(t) {
    const s = /* @__PURE__ */ new Error(t + " at character " + this.index);
    throw s.index = this.index, s.description = t, s;
  }
  runHook(t, s) {
    if (c.hooks[t]) {
      const r = {
        context: this,
        node: s
      };
      return c.hooks.run(t, r), r.node;
    }
    return s;
  }
  searchHook(t) {
    if (c.hooks[t]) {
      const s = { context: this };
      return c.hooks[t].find(function(r) {
        return r.call(s.context, s), s.node;
      }), s.node;
    }
  }
  gobbleSpaces() {
    let t = this.code;
    for (; t === c.SPACE_CODE || t === c.TAB_CODE || t === c.LF_CODE || t === c.CR_CODE; ) t = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  parse() {
    this.runHook("before-all");
    const t = this.gobbleExpressions(), s = t.length === 1 ? t[0] : {
      type: c.COMPOUND,
      body: t
    };
    return this.runHook("after-all", s);
  }
  gobbleExpressions(t) {
    let s = [], r, a;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === c.SEMCOL_CODE || r === c.COMMA_CODE) this.index++;
      else if (a = this.gobbleExpression()) s.push(a);
      else if (this.index < this.expr.length) {
        if (r === t) break;
        this.throwError('Unexpected "' + this.char + '"');
      }
    return s;
  }
  gobbleExpression() {
    const t = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    return this.gobbleSpaces(), this.runHook("after-expression", t);
  }
  gobbleBinaryOp() {
    this.gobbleSpaces();
    let t = this.expr.substr(this.index, c.max_binop_len), s = t.length;
    for (; s > 0; ) {
      if (c.binary_ops.hasOwnProperty(t) && (!c.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !c.isIdentifierPart(this.expr.charCodeAt(this.index + t.length))))
        return this.index += s, t;
      t = t.substr(0, --s);
    }
    return !1;
  }
  gobbleBinaryExpression() {
    let t, s, r, a, n, i, o, l, d;
    if (i = this.gobbleToken(), !i || (s = this.gobbleBinaryOp(), !s)) return i;
    for (n = {
      value: s,
      prec: c.binaryPrecedence(s),
      right_a: c.right_associative.has(s)
    }, o = this.gobbleToken(), o || this.throwError("Expected expression after " + s), a = [
      i,
      n,
      o
    ]; s = this.gobbleBinaryOp(); ) {
      if (r = c.binaryPrecedence(s), r === 0) {
        this.index -= s.length;
        break;
      }
      n = {
        value: s,
        prec: r,
        right_a: c.right_associative.has(s)
      }, d = s;
      const h = (u) => n.right_a && u.right_a ? r > u.prec : r <= u.prec;
      for (; a.length > 2 && h(a[a.length - 2]); )
        o = a.pop(), s = a.pop().value, i = a.pop(), t = {
          type: c.BINARY_EXP,
          operator: s,
          left: i,
          right: o
        }, a.push(t);
      t = this.gobbleToken(), t || this.throwError("Expected expression after " + d), a.push(n, t);
    }
    for (l = a.length - 1, t = a[l]; l > 1; )
      t = {
        type: c.BINARY_EXP,
        operator: a[l - 1].value,
        left: a[l - 2],
        right: t
      }, l -= 2;
    return t;
  }
  gobbleToken() {
    let t, s, r, a;
    if (this.gobbleSpaces(), a = this.searchHook("gobble-token"), a) return this.runHook("after-token", a);
    if (t = this.code, c.isDecimalDigit(t) || t === c.PERIOD_CODE) return this.gobbleNumericLiteral();
    if (t === c.SQUOTE_CODE || t === c.DQUOTE_CODE) a = this.gobbleStringLiteral();
    else if (t === c.OBRACK_CODE) a = this.gobbleArray();
    else {
      for (s = this.expr.substr(this.index, c.max_unop_len), r = s.length; r > 0; ) {
        if (c.unary_ops.hasOwnProperty(s) && (!c.isIdentifierStart(this.code) || this.index + s.length < this.expr.length && !c.isIdentifierPart(this.expr.charCodeAt(this.index + s.length)))) {
          this.index += r;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: c.UNARY_EXP,
            operator: s,
            argument: n,
            prefix: !0
          });
        }
        s = s.substr(0, --r);
      }
      c.isIdentifierStart(t) ? (a = this.gobbleIdentifier(), c.literals.hasOwnProperty(a.name) ? a = {
        type: c.LITERAL,
        value: c.literals[a.name],
        raw: a.name
      } : a.name === c.this_str && (a = { type: c.THIS_EXP })) : t === c.OPAREN_CODE && (a = this.gobbleGroup());
    }
    return a ? (a = this.gobbleTokenProperty(a), this.runHook("after-token", a)) : this.runHook("after-token", !1);
  }
  gobbleTokenProperty(t) {
    this.gobbleSpaces();
    let s = this.code;
    for (; s === c.PERIOD_CODE || s === c.OBRACK_CODE || s === c.OPAREN_CODE || s === c.QUMARK_CODE; ) {
      let r;
      if (s === c.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== c.PERIOD_CODE) break;
        r = !0, this.index += 2, this.gobbleSpaces(), s = this.code;
      }
      this.index++, s === c.OBRACK_CODE ? (t = {
        type: c.MEMBER_EXP,
        computed: !0,
        object: t,
        property: this.gobbleExpression()
      }, t.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), s = this.code, s !== c.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : s === c.OPAREN_CODE ? t = {
        type: c.CALL_EXP,
        arguments: this.gobbleArguments(c.CPAREN_CODE),
        callee: t
      } : (s === c.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), t = {
        type: c.MEMBER_EXP,
        computed: !1,
        object: t,
        property: this.gobbleIdentifier()
      }), r && (t.optional = !0), this.gobbleSpaces(), s = this.code;
    }
    return t;
  }
  gobbleNumericLiteral() {
    let t = "", s, r;
    for (; c.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
    if (this.code === c.PERIOD_CODE)
      for (t += this.expr.charAt(this.index++); c.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
    if (s = this.char, s === "e" || s === "E") {
      for (t += this.expr.charAt(this.index++), s = this.char, (s === "+" || s === "-") && (t += this.expr.charAt(this.index++)); c.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
      c.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + t + this.char + ")");
    }
    return r = this.code, c.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + t + this.char + ")") : (r === c.PERIOD_CODE || t.length === 1 && t.charCodeAt(0) === c.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: c.LITERAL,
      value: parseFloat(t),
      raw: t
    };
  }
  gobbleStringLiteral() {
    let t = "";
    const s = this.index, r = this.expr.charAt(this.index++);
    let a = !1;
    for (; this.index < this.expr.length; ) {
      let n = this.expr.charAt(this.index++);
      if (n === r) {
        a = !0;
        break;
      } else if (n === "\\")
        switch (n = this.expr.charAt(this.index++), n) {
          case "n":
            t += `
`;
            break;
          case "r":
            t += "\r";
            break;
          case "t":
            t += "	";
            break;
          case "b":
            t += "\b";
            break;
          case "f":
            t += "\f";
            break;
          case "v":
            t += "\v";
            break;
          default:
            t += n;
        }
      else t += n;
    }
    return a || this.throwError('Unclosed quote after "' + t + '"'), {
      type: c.LITERAL,
      value: t,
      raw: this.expr.substring(s, this.index)
    };
  }
  gobbleIdentifier() {
    let t = this.code, s = this.index;
    for (c.isIdentifierStart(t) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (t = this.code, c.isIdentifierPart(t)); )
      this.index++;
    return {
      type: c.IDENTIFIER,
      name: this.expr.slice(s, this.index)
    };
  }
  gobbleArguments(t) {
    const s = [];
    let r = !1, a = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === t) {
        r = !0, this.index++, t === c.CPAREN_CODE && a && a >= s.length && this.throwError("Unexpected token " + String.fromCharCode(t));
        break;
      } else if (n === c.COMMA_CODE) {
        if (this.index++, a++, a !== s.length) {
          if (t === c.CPAREN_CODE) this.throwError("Unexpected token ,");
          else if (t === c.CBRACK_CODE) for (let i = s.length; i < a; i++) s.push(null);
        }
      } else if (s.length !== a && a !== 0) this.throwError("Expected comma");
      else {
        const i = this.gobbleExpression();
        (!i || i.type === c.COMPOUND) && this.throwError("Expected comma"), s.push(i);
      }
    }
    return r || this.throwError("Expected " + String.fromCharCode(t)), s;
  }
  gobbleGroup() {
    this.index++;
    let t = this.gobbleExpressions(c.CPAREN_CODE);
    if (this.code === c.CPAREN_CODE)
      return this.index++, t.length === 1 ? t[0] : t.length ? {
        type: c.SEQUENCE_EXP,
        expressions: t
      } : !1;
    this.throwError("Unclosed (");
  }
  gobbleArray() {
    return this.index++, {
      type: c.ARRAY_EXP,
      elements: this.gobbleArguments(c.CBRACK_CODE)
    };
  }
}, kt = new Rt();
Object.assign(C, {
  hooks: kt,
  plugins: new Dt(C),
  COMPOUND: "Compound",
  SEQUENCE_EXP: "SequenceExpression",
  IDENTIFIER: "Identifier",
  MEMBER_EXP: "MemberExpression",
  LITERAL: "Literal",
  THIS_EXP: "ThisExpression",
  CALL_EXP: "CallExpression",
  UNARY_EXP: "UnaryExpression",
  BINARY_EXP: "BinaryExpression",
  ARRAY_EXP: "ArrayExpression",
  TAB_CODE: 9,
  LF_CODE: 10,
  CR_CODE: 13,
  SPACE_CODE: 32,
  PERIOD_CODE: 46,
  COMMA_CODE: 44,
  SQUOTE_CODE: 39,
  DQUOTE_CODE: 34,
  OPAREN_CODE: 40,
  CPAREN_CODE: 41,
  OBRACK_CODE: 91,
  CBRACK_CODE: 93,
  QUMARK_CODE: 63,
  SEMCOL_CODE: 59,
  COLON_CODE: 58,
  unary_ops: {
    "-": 1,
    "!": 1,
    "~": 1,
    "+": 1
  },
  binary_ops: {
    "||": 1,
    "??": 1,
    "&&": 2,
    "|": 3,
    "^": 4,
    "&": 5,
    "==": 6,
    "!=": 6,
    "===": 6,
    "!==": 6,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "<<": 8,
    ">>": 8,
    ">>>": 8,
    "+": 9,
    "-": 9,
    "*": 10,
    "/": 10,
    "%": 10,
    "**": 11
  },
  right_associative: /* @__PURE__ */ new Set(["**"]),
  additional_identifier_chars: /* @__PURE__ */ new Set(["$", "_"]),
  literals: {
    true: !0,
    false: !1,
    null: null
  },
  this_str: "this"
});
C.max_unop_len = C.getMaxKeyLen(C.unary_ops);
C.max_binop_len = C.getMaxKeyLen(C.binary_ops);
var x = (e) => new C(e).parse(), It = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(C).filter((e) => !It.includes(e) && x[e] === void 0).forEach((e) => {
  x[e] = C[e];
});
x.Jsep = C;
var Tt = "ConditionalExpression";
x.plugins.register({
  name: "ternary",
  init(e) {
    e.hooks.add("after-expression", function(s) {
      if (s.node && this.code === e.QUMARK_CODE) {
        this.index++;
        const r = s.node, a = this.gobbleExpression();
        if (a || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === e.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), s.node = {
            type: Tt,
            test: r,
            consequent: a,
            alternate: n
          }, r.operator && e.binary_ops[r.operator] <= 0.9) {
            let i = r;
            for (; i.right.operator && e.binary_ops[i.right.operator] <= 0.9; ) i = i.right;
            s.node.test = i.right, i.right = s.node, s.node = r;
          }
        } else this.throwError("Expected :");
      }
    });
  }
});
var Se = 47, qt = 92, Ft = {
  name: "regex",
  init(e) {
    e.hooks.add("gobble-token", function(s) {
      if (this.code === Se) {
        const r = ++this.index;
        let a = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === Se && !a) {
            const n = this.expr.slice(r, this.index);
            let i = "";
            for (; ++this.index < this.expr.length; ) {
              const l = this.code;
              if (l >= 97 && l <= 122 || l >= 65 && l <= 90 || l >= 48 && l <= 57) i += this.char;
              else break;
            }
            let o;
            try {
              o = new RegExp(n, i);
            } catch (l) {
              this.throwError(l.message);
            }
            return s.node = {
              type: e.LITERAL,
              value: o,
              raw: this.expr.slice(r - 1, this.index)
            }, s.node = this.gobbleTokenProperty(s.node), s.node;
          }
          this.code === e.OBRACK_CODE ? a = !0 : a && this.code === e.CBRACK_CODE && (a = !1), this.index += this.code === qt ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, ee = 43, T = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set([
    "=",
    "*=",
    "**=",
    "/=",
    "%=",
    "+=",
    "-=",
    "<<=",
    ">>=",
    ">>>=",
    "&=",
    "^=",
    "|=",
    "||=",
    "&&=",
    "??="
  ]),
  updateOperators: [ee, 45],
  assignmentPrecedence: 0.9,
  init(e) {
    const t = [e.IDENTIFIER, e.MEMBER_EXP];
    T.assignmentOperators.forEach((r) => e.addBinaryOp(r, T.assignmentPrecedence, !0)), e.hooks.add("gobble-token", function(a) {
      const n = this.code;
      T.updateOperators.some((i) => i === n && i === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, a.node = {
        type: "UpdateExpression",
        operator: n === ee ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!a.node.argument || !t.includes(a.node.argument.type)) && this.throwError(`Unexpected ${a.node.operator}`));
    }), e.hooks.add("after-token", function(a) {
      if (a.node) {
        const n = this.code;
        T.updateOperators.some((i) => i === n && i === this.expr.charCodeAt(this.index + 1)) && (t.includes(a.node.type) || this.throwError(`Unexpected ${a.node.operator}`), this.index += 2, a.node = {
          type: "UpdateExpression",
          operator: n === ee ? "++" : "--",
          argument: a.node,
          prefix: !1
        });
      }
    }), e.hooks.add("after-expression", function(a) {
      a.node && s(a.node);
    });
    function s(r) {
      T.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((a) => {
        a && typeof a == "object" && s(a);
      });
    }
  }
};
x.plugins.register(Ft, T);
x.addUnaryOp("typeof");
x.addLiteral("null", null);
x.addLiteral("undefined", void 0);
var Nt = /* @__PURE__ */ new Set([
  "constructor",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__"
]), E = {
  evalAst(e, t) {
    switch (e.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return E.evalBinaryExpression(e, t);
      case "Compound":
        return E.evalCompound(e, t);
      case "ConditionalExpression":
        return E.evalConditionalExpression(e, t);
      case "Identifier":
        return E.evalIdentifier(e, t);
      case "Literal":
        return E.evalLiteral(e, t);
      case "MemberExpression":
        return E.evalMemberExpression(e, t);
      case "UnaryExpression":
        return E.evalUnaryExpression(e, t);
      case "ArrayExpression":
        return E.evalArrayExpression(e, t);
      case "CallExpression":
        return E.evalCallExpression(e, t);
      case "AssignmentExpression":
        return E.evalAssignmentExpression(e, t);
      default:
        throw SyntaxError("Unexpected expression", e);
    }
  },
  evalBinaryExpression(e, t) {
    return {
      "||": (s, r) => s || r(),
      "&&": (s, r) => s && r(),
      "|": (s, r) => s | r(),
      "^": (s, r) => s ^ r(),
      "&": (s, r) => s & r(),
      "==": (s, r) => s == r(),
      "!=": (s, r) => s != r(),
      "===": (s, r) => s === r(),
      "!==": (s, r) => s !== r(),
      "<": (s, r) => s < r(),
      ">": (s, r) => s > r(),
      "<=": (s, r) => s <= r(),
      ">=": (s, r) => s >= r(),
      "<<": (s, r) => s << r(),
      ">>": (s, r) => s >> r(),
      ">>>": (s, r) => s >>> r(),
      "+": (s, r) => s + r(),
      "-": (s, r) => s - r(),
      "*": (s, r) => s * r(),
      "/": (s, r) => s / r(),
      "%": (s, r) => s % r()
    }[e.operator](E.evalAst(e.left, t), () => E.evalAst(e.right, t));
  },
  evalCompound(e, t) {
    let s;
    for (let r = 0; r < e.body.length; r++) {
      e.body[r].type === "Identifier" && [
        "var",
        "let",
        "const"
      ].includes(e.body[r].name) && e.body[r + 1] && e.body[r + 1].type === "AssignmentExpression" && (r += 1);
      const a = e.body[r];
      s = E.evalAst(a, t);
    }
    return s;
  },
  evalConditionalExpression(e, t) {
    return E.evalAst(e.test, t) ? E.evalAst(e.consequent, t) : E.evalAst(e.alternate, t);
  },
  evalIdentifier(e, t) {
    if (Object.hasOwn(t, e.name)) return t[e.name];
    throw ReferenceError(`${e.name} is not defined`);
  },
  evalLiteral(e) {
    return e.value;
  },
  evalMemberExpression(e, t) {
    const s = String(e.computed ? E.evalAst(e.property) : e.property.name), r = E.evalAst(e.object, t);
    if (r == null) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    if (!Object.hasOwn(r, s) && Nt.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    const a = r[s];
    return typeof a == "function" ? a.bind(r) : a;
  },
  evalUnaryExpression(e, t) {
    return {
      "-": (s) => -E.evalAst(s, t),
      "!": (s) => !E.evalAst(s, t),
      "~": (s) => ~E.evalAst(s, t),
      "+": (s) => +E.evalAst(s, t),
      typeof: (s) => typeof E.evalAst(s, t)
    }[e.operator](e.argument);
  },
  evalArrayExpression(e, t) {
    return e.elements.map((s) => E.evalAst(s, t));
  },
  evalCallExpression(e, t) {
    const s = e.arguments.map((r) => E.evalAst(r, t));
    return E.evalAst(e.callee, t)(...s);
  },
  evalAssignmentExpression(e, t) {
    if (e.left.type !== "Identifier") throw SyntaxError("Invalid left-hand side in assignment");
    const s = e.left.name;
    return t[s] = E.evalAst(e.right, t), t[s];
  }
}, Mt = class {
  constructor(e) {
    this.code = e, this.ast = x(this.code);
  }
  runInNewContext(e) {
    const t = Object.assign(/* @__PURE__ */ Object.create(null), e);
    return E.evalAst(this.ast, t);
  }
};
function R(e, t) {
  return e = e.slice(), e.push(t), e;
}
function oe(e, t) {
  return t = t.slice(), t.unshift(e), t;
}
var jt = class extends Error {
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
};
function b(e, t, s, r, a) {
  if (!(this instanceof b)) try {
    return new b(e, t, s, r, a);
  } catch (i) {
    if (!i.avoidNew) throw i;
    return i.value;
  }
  typeof e == "string" && (a = r, r = s, s = t, t = e, e = null);
  const n = e && typeof e == "object";
  if (e = e || {}, this.json = e.json || s, this.path = e.path || t, this.resultType = e.resultType || "value", this.flatten = e.flatten || !1, this.wrap = Object.hasOwn(e, "wrap") ? e.wrap : !0, this.sandbox = e.sandbox || {}, this.eval = e.eval === void 0 ? "safe" : e.eval, this.ignoreEvalErrors = typeof e.ignoreEvalErrors > "u" ? !1 : e.ignoreEvalErrors, this.parent = e.parent || null, this.parentProperty = e.parentProperty || null, this.callback = e.callback || r || null, this.otherTypeCallback = e.otherTypeCallback || a || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, e.autostart !== !1) {
    const i = { path: n ? e.path : t };
    n ? "json" in e && (i.json = e.json) : i.json = s;
    const o = this.evaluate(i);
    if (!o || typeof o != "object") throw new jt(o);
    return o;
  }
}
b.prototype.evaluate = function(e, t, s, r) {
  let a = this.parent, n = this.parentProperty, { flatten: i, wrap: o } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, s = s || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, t = t || this.json, e = e || this.path, e && typeof e == "object" && !Array.isArray(e)) {
    if (!e.path && e.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(e, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: t } = e), i = Object.hasOwn(e, "flatten") ? e.flatten : i, this.currResultType = Object.hasOwn(e, "resultType") ? e.resultType : this.currResultType, this.currSandbox = Object.hasOwn(e, "sandbox") ? e.sandbox : this.currSandbox, o = Object.hasOwn(e, "wrap") ? e.wrap : o, this.currEval = Object.hasOwn(e, "eval") ? e.eval : this.currEval, s = Object.hasOwn(e, "callback") ? e.callback : s, this.currOtherTypeCallback = Object.hasOwn(e, "otherTypeCallback") ? e.otherTypeCallback : this.currOtherTypeCallback, a = Object.hasOwn(e, "parent") ? e.parent : a, n = Object.hasOwn(e, "parentProperty") ? e.parentProperty : n, e = e.path;
  }
  if (a = a || null, n = n || null, Array.isArray(e) && (e = b.toPathString(e)), !e && e !== "" || !t) return;
  const l = b.toPathArray(e);
  l[0] === "$" && l.length > 1 && l.shift(), this._hasParentSelector = null;
  const d = this._trace(l, t, ["$"], a, n, s).filter(function(h) {
    return h && !h.isParentSelector;
  });
  return d.length ? !o && d.length === 1 && !d[0].hasArrExpr ? this._getPreferredOutput(d[0]) : d.reduce((h, u) => {
    const y = this._getPreferredOutput(u);
    return i && Array.isArray(y) ? h = h.concat(y) : h.push(y), h;
  }, []) : o ? [] : void 0;
};
b.prototype._getPreferredOutput = function(e) {
  const t = this.currResultType;
  switch (t) {
    case "all": {
      const s = Array.isArray(e.path) ? e.path : b.toPathArray(e.path);
      return e.pointer = b.toPointer(s), e.path = typeof e.path == "string" ? e.path : b.toPathString(e.path), e;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return e[t];
    case "path":
      return b.toPathString(e[t]);
    case "pointer":
      return b.toPointer(e.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
b.prototype._handleCallback = function(e, t, s) {
  if (t) {
    const r = this._getPreferredOutput(e);
    e.path = typeof e.path == "string" ? e.path : b.toPathString(e.path), t(r, s, e);
  }
};
b.prototype._trace = function(e, t, s, r, a, n, i, o) {
  let l;
  if (!e.length)
    return l = {
      path: s,
      value: t,
      parent: r,
      parentProperty: a,
      hasArrExpr: i
    }, this._handleCallback(l, n, "value"), l;
  const d = e[0], h = e.slice(1), u = [];
  function y(f) {
    Array.isArray(f) ? f.forEach((m) => {
      u.push(m);
    }) : u.push(f);
  }
  if ((typeof d != "string" || o) && t && Object.hasOwn(t, d)) y(this._trace(h, t[d], R(s, d), t, d, n, i));
  else if (d === "*") this._walk(t, (f) => {
    y(this._trace(h, t[f], R(s, f), t, f, n, !0, !0));
  });
  else if (d === "..")
    y(this._trace(h, t, s, r, a, n, i)), this._walk(t, (f) => {
      typeof t[f] == "object" && y(this._trace(e.slice(), t[f], R(s, f), t, f, n, !0));
    });
  else {
    if (d === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: h,
        isParentSelector: !0
      };
    if (d === "~")
      return l = {
        path: R(s, d),
        value: a,
        parent: r,
        parentProperty: null
      }, this._handleCallback(l, n, "property"), l;
    if (d === "$") y(this._trace(h, t, s, null, null, n, i));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(d)) y(this._slice(d, h, t, s, r, a, n));
    else if (d.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const f = d.replace(/^\?\((.*?)\)$/u, "$1"), m = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(f);
      m ? this._walk(t, (v) => {
        const _ = [m[2]], O = m[1] ? t[v][m[1]] : t[v];
        this._trace(_, O, s, r, a, n, !0).length > 0 && y(this._trace(h, t[v], R(s, v), t, v, n, !0));
      }) : this._walk(t, (v) => {
        this._eval(f, t[v], v, s, r, a) && y(this._trace(h, t[v], R(s, v), t, v, n, !0));
      });
    } else if (d[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      y(this._trace(oe(this._eval(d, t, s.at(-1), s.slice(0, -1), r, a), h), t, s, r, a, n, i));
    } else if (d[0] === "@") {
      let f = !1;
      const m = d.slice(1, -2);
      switch (m) {
        case "scalar":
          (!t || !["object", "function"].includes(typeof t)) && (f = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof t === m && (f = !0);
          break;
        case "integer":
          Number.isFinite(t) && !(t % 1) && (f = !0);
          break;
        case "number":
          Number.isFinite(t) && (f = !0);
          break;
        case "nonFinite":
          typeof t == "number" && !Number.isFinite(t) && (f = !0);
          break;
        case "object":
          t && typeof t === m && (f = !0);
          break;
        case "array":
          Array.isArray(t) && (f = !0);
          break;
        case "other":
          f = this.currOtherTypeCallback(t, s, r, a);
          break;
        case "null":
          t === null && (f = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + m);
      }
      if (f)
        return l = {
          path: s,
          value: t,
          parent: r,
          parentProperty: a
        }, this._handleCallback(l, n, "value"), l;
    } else if (d[0] === "`" && t && Object.hasOwn(t, d.slice(1))) {
      const f = d.slice(1);
      y(this._trace(h, t[f], R(s, f), t, f, n, i, !0));
    } else if (d.includes(",")) {
      const f = d.split(",");
      for (const m of f) y(this._trace(oe(m, h), t, s, r, a, n, !0));
    } else !o && t && Object.hasOwn(t, d) && y(this._trace(h, t[d], R(s, d), t, d, n, i, !0));
  }
  if (this._hasParentSelector) for (let f = 0; f < u.length; f++) {
    const m = u[f];
    if (m && m.isParentSelector) {
      const v = this._trace(m.expr, t, m.path, r, a, n, i);
      if (Array.isArray(v)) {
        u[f] = v[0];
        const _ = v.length;
        for (let O = 1; O < _; O++)
          f++, u.splice(f, 0, v[O]);
      } else u[f] = v;
    }
  }
  return u;
};
b.prototype._walk = function(e, t) {
  if (Array.isArray(e)) {
    const s = e.length;
    for (let r = 0; r < s; r++) t(r);
  } else e && typeof e == "object" && Object.keys(e).forEach((s) => {
    t(s);
  });
};
b.prototype._slice = function(e, t, s, r, a, n, i) {
  if (!Array.isArray(s)) return;
  const o = s.length, l = e.split(":"), d = l[2] && Number.parseInt(l[2]) || 1;
  let h = l[0] && Number.parseInt(l[0]) || 0, u = l[1] && Number.parseInt(l[1]) || o;
  h = h < 0 ? Math.max(0, h + o) : Math.min(o, h), u = u < 0 ? Math.max(0, u + o) : Math.min(o, u);
  const y = [];
  for (let f = h; f < u; f += d) this._trace(oe(f, t), s, r, a, n, i, !0).forEach((m) => {
    y.push(m);
  });
  return y;
};
b.prototype._eval = function(e, t, s, r, a, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = a, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
  const i = e.includes("@path");
  i && (this.currSandbox._$_path = b.toPathString(r.concat([s])));
  const o = this.currEval + "Script:" + e;
  if (!b.cache[o]) {
    let l = e.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (i && (l = l.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) b.cache[o] = new this.safeVm.Script(l);
    else if (this.currEval === "native") b.cache[o] = new this.vm.Script(l);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const d = this.currEval;
      b.cache[o] = new d(l);
    } else if (typeof this.currEval == "function") b.cache[o] = { runInNewContext: (d) => this.currEval(l, d) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return b.cache[o].runInNewContext(this.currSandbox);
  } catch (l) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + l.message + ": " + e);
  }
};
b.cache = {};
b.toPathString = function(e) {
  const t = e, s = t.length;
  let r = "$";
  for (let a = 1; a < s; a++) /^(~|\^|@.*?\(\))$/u.test(t[a]) || (r += /^[0-9*]+$/u.test(t[a]) ? "[" + t[a] + "]" : "['" + t[a] + "']");
  return r;
};
b.toPointer = function(e) {
  const t = e, s = t.length;
  let r = "";
  for (let a = 1; a < s; a++) /^(~|\^|@.*?\(\))$/u.test(t[a]) || (r += "/" + t[a].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
b.toPathArray = function(e) {
  const { cache: t } = b;
  if (t[e]) return t[e].concat();
  const s = [];
  return t[e] = e.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(r, a) {
    return "[#" + (s.push(a) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(r, a) {
    return "['" + a.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(r, a) {
    return ";" + a.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(r) {
    const a = r.match(/#(\d+)/u);
    return !a || !a[1] ? r : s[a[1]];
  }), t[e].concat();
};
b.prototype.safeVm = { Script: Mt };
var Bt = function(e, t, s) {
  const r = e.length;
  for (let a = 0; a < r; a++) {
    const n = e[a];
    s(n) && t.push(e.splice(a--, 1)[0]);
  }
}, Ut = class {
  constructor(e) {
    this.code = e;
  }
  runInNewContext(e) {
    let t = this.code;
    const s = Object.keys(e), r = [];
    Bt(s, r, (o) => typeof e[o] == "function");
    const a = s.map((o) => e[o]);
    t = r.reduce((o, l) => {
      let d = e[l].toString();
      return /function/u.test(d) || (d = "function " + d), "var " + l + "=" + d + ";" + o;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const n = t.lastIndexOf(";"), i = n !== -1 ? t.slice(0, n + 1) + " return " + t.slice(n + 1) : " return " + t;
    return new Function(...s, i)(...a);
  }
};
b.prototype.vm = { Script: Ut };
function Jt(e) {
  return e ? !!(e.startsWith("$") || /\[\d+\]/.test(e) || /\[['"]/.test(e) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(e) || e.includes("..") || e.includes("*")) : !1;
}
function Kt(e) {
  return e ? e.startsWith("$") ? e : `$.${e}` : "$";
}
function Vt(e, t) {
  if (!e || !t) return [];
  try {
    return (b({
      path: Kt(t),
      json: e,
      resultType: "all"
    }) || []).map((s) => ({
      path: s.path || "",
      value: s.value
    }));
  } catch {
    return [];
  }
}
function Ht(e, t) {
  if (!t || !e) return e || {};
  const s = Jt(t);
  if (console.log("[jsonpath-search] search:", t, "isJsonPath:", s), s) {
    const a = Qt(e, t);
    return console.log("[jsonpath-search] JSONPath result:", a), a;
  }
  const r = zt(e, t);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function zt(e, t) {
  const s = t.toLowerCase(), r = {};
  for (const [a, n] of Object.entries(e || {})) a.toLowerCase().includes(s) && (r[a] = n);
  return r;
}
function Qt(e, t) {
  const s = Vt(e, t);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: a, value: n } = s[0];
    return a === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [we(a)]: n };
  }
  const r = {};
  for (const { path: a, value: n } of s) {
    const i = we(a) || `result_${Object.keys(r).length}`;
    i in r ? r[`${i}_${Object.keys(r).length}`] = n : r[i] = n;
  }
  return r;
}
function we(e) {
  if (!e) return "";
  const t = e.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (t) return t[1];
  const s = e.match(/\.([^.[\]]+)$/);
  return s ? s[1] : e.replace(/^\$\.?/, "");
}
var K = "commands", Pe = "command-options://", J = "", z = "", W = /* @__PURE__ */ new Map(), A = /* @__PURE__ */ new Map(), D = 0, Ae = 230, ue = 180, Xt = 640, Wt = 280, Ce = 24, Ne = "cmdl:sidebar-width", le = /* @__PURE__ */ new Map(), xe = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3
};
function Yt(e) {
  const t = e && typeof e == "object" ? e : {}, s = g(t.correlation_id) || g(t.CorrelationID), r = w(t.state) || w(t.State);
  if (!s || !r) return;
  const a = le.get(s);
  a && (xe[a.state] ?? -1) > (xe[r] ?? -1) || le.set(s, {
    state: r,
    message: g(t.message) || g(t.Message),
    at: g(t.at) || g(t.At),
    code: g(t.code) || g(t.Code)
  });
}
function Gt(e) {
  return e ? le.get(e) : void 0;
}
function g(e) {
  return typeof e == "string" ? e.trim() : "";
}
function w(e) {
  return g(e).toLowerCase();
}
function Zt(e) {
  return !e || typeof e != "object" ? "" : p(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function Me(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function je(e) {
  const t = w(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function es(e, t) {
  const s = t && typeof t == "object" ? t : {}, r = Array.isArray(s.commands) ? s.commands : [], a = Array.isArray(s.diagnostics) ? s.diagnostics : [], n = Array.isArray(e.ui?.actions) ? e.ui.actions : [], i = /* @__PURE__ */ new Map();
  r.forEach((u) => {
    const y = g(u?.id);
    y && i.set(y, u);
  });
  const o = /* @__PURE__ */ new Map();
  n.forEach((u) => {
    const y = w(u?.id), f = g(u.payload?.command_id);
    y && f && !o.has(f) && o.set(f, u);
  });
  const l = [], d = /* @__PURE__ */ new Set(), h = (u) => {
    u && !d.has(u) && (d.add(u), l.push(u));
  };
  return r.forEach((u) => h(g(u?.id))), n.forEach((u) => h(g(u.payload?.command_id))), {
    entries: l.map((u) => {
      const y = i.get(u), f = o.get(u), m = f ? w(f.id) : "", v = !!(f && m && w(f.form?.renderer) === "formgen"), _ = g(f?.label) || g(y?.label) || u, O = g(y?.group) || "Other", ze = `${u} ${_} ${O} ${(Array.isArray(y?.tags) ? y.tags.map(g).filter(Boolean) : []).join(" ")}${v ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: v ? m : `cmd:${u}`,
        actionId: m,
        commandId: u,
        label: _,
        action: v ? f : void 0,
        descriptor: y,
        group: O,
        search: ze,
        executable: v
      };
    }),
    diagnostics: a
  };
}
function ts(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => {
    t.has(s.group) || t.set(s.group, []), t.get(s.group).push(s);
  }), Array.from(t.entries()).sort((s, r) => s[0].localeCompare(r[0])).map(([s, r]) => ({
    group: s,
    items: r.sort((a, n) => (a.commandId || a.label).localeCompare(n.commandId || n.label))
  }));
}
function ss(e) {
  const t = g(e.descriptor?.execution_mode), s = je(t), r = t ? `Execution: ${t}` : "Execution mode unknown", a = e.descriptor?.mutating === !0;
  let n;
  return e.executable ? a ? n = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : n = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : n = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}" role="option" aria-selected="false"
      data-cmdl-item="${p(e.key)}"
      data-cmdl-search="${p(e.search)}"
      title="${p(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${s}" title="${p(r)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${p(e.commandId || e.label)}</span>
      ${n}
    </button>`;
}
function rs(e, t) {
  const s = e.map((r) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${p(r.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${p(r.group)}</div>
        ${r.items.map(ss).join("")}
      </div>`).join("");
  return `
    <aside class="cmdl__list">
      <div class="cmdl__search">
        <input type="search" class="cmdl__search-input" data-cmdl-filter
          placeholder="Filter ${t} command${t === 1 ? "" : "s"}…"
          aria-label="Filter commands" autocomplete="off" spellcheck="false">
      </div>
      <div class="cmdl__groups" role="listbox" aria-label="Commands" data-cmdl-groups>
        ${s}
        <div class="cmdl__noresults" data-cmdl-noresults hidden>No commands match your filter.</div>
      </div>
    </aside>`;
}
function as(e) {
  return e.trim().replace(/^payload\./, "");
}
function ns(e) {
  const t = e.action;
  if (!t) return "";
  const s = t.form, r = typeof s.html == "string" ? s.html : "", a = r.trim() !== "", n = g(t.submit_label) || "Run command", i = g(t.confirm_text), o = t.requires_confirm === !0, l = e.descriptor?.mutating === !0, d = s.sensitive === !0, h = `${a && !d ? `<div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${p(e.commandId)}">
      <div class="cmdl-recall__list" data-cmdl-recall-list></div>
      <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
    </div>` : ""}
    <div class="cmdl-form__fields" data-cmdl-fields data-cmdl-formgen-root data-operation-id="${p(g(s.operation_id))}">
      ${a ? r : '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>'}
    </div>
    <input type="hidden" data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
      data-cmdl-controller-payload${d ? ' data-action-field-sensitive="true"' : ""} value="{}">
    ${a && !d ? `<div class="cmdl-form__json" data-cmdl-json hidden>
      <textarea class="cmdl-json-editor" data-cmdl-json-editor rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
      <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
    </div>` : ""}`, u = o || i !== "", y = l ? '<span class="cmdl-form__note">Confirms before running</span>' : "", f = a && !d ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>' : "", m = d ? '<span class="cmdl-form__note">Sensitive values are never saved and must be re-entered</span>' : "", v = u ? `
        <div class="cmdl-form__confirm" data-cmdl-confirm-row hidden>
          <span class="cmdl-form__confirm-msg">${p(i || "Run this command?")}</span>
          <button type="submit" class="cmdl-btn cmdl-btn--run cmdl-btn--confirm" data-cmdl-confirm-run>Confirm run</button>
          <button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-cancel>Cancel</button>
        </div>` : "";
  return `
    <form class="cmdl-form" data-panel-action-form data-cmdl-mode="form" data-cmdl-command="${p(e.commandId)}"
      data-panel-id="${p(K)}"
      data-action-id="${p(e.actionId)}"
      data-action-confirm="${p(i)}"
      data-action-requires-confirm="${o ? "true" : "false"}"
      data-cmdl-confirm="${u ? "true" : "false"}"
      ${u ? 'data-action-confirm-inline="true"' : ""}
      data-action-payload='${Zt(t.payload)}'>
      ${h}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
		  <button type="submit" class="cmdl-btn cmdl-btn--run" disabled data-cmdl-formgen-submit>${p(n)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${f}
          ${y}
          ${m}
        </div>${v}
      </div>
    </form>`;
}
function is(e) {
  const t = g(e.descriptor?.execution_mode), s = e.descriptor?.mutating === !0, r = g(e.descriptor?.summary), a = [];
  a.push(`<span class="cmdl-chip">${p(e.group)}</span>`), t && a.push(`<span class="cmdl-chip cmdl-chip--${je(t)}">${p(t)}</span>`), a.push(s ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || a.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let n;
  return e.executable ? n = `${s ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${ns(e)}` : n = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${p(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${p(e.commandId || e.label)}</div>
        ${r ? `<div class="cmdl-cmd__summary">${p(r)}</div>` : ""}
        <div class="cmdl-cmd__chips">${a.join("")}</div>
      </div>
      ${n}
    </div>`;
}
function _e(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const s = w(t.severity) || "info", r = g(t.message), a = g(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${p(s)}">
          <span class="cmdl-diag__sev">${p(s)}</span>
          <span class="cmdl-diag__msg">${p(r)}${a ? ` <span class="cmdl-diag__code">${p(a)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function os(e) {
  const { def: t, data: s } = e, { entries: r, diagnostics: a } = es(t, s), n = g((t.ui?.metadata && typeof t.ui.metadata == "object" ? t.ui.metadata : {}).option_resolver_action), i = n ? ` data-cmdl-option-resolver="${p(n)}"` : "";
  if (r.length === 0) return `
      <div class="cmdl" data-cmdl-root${i}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${_e(a)}
        <div class="cmdl-result" data-panel-action-result="${p(K)}"></div>
      </div>`;
  const o = ts(r), l = r.map(is).join("");
  return `
    <div class="cmdl" data-cmdl-root${i}>
      <div class="cmdl__body" data-cmdl-body>
        ${rs(o, r.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${l}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${p(K)}"></div>
        </section>
      </div>
      ${_e(a)}
    </div>`;
}
function Q(e, t) {
  for (const s of t) {
    const r = e[s];
    if (typeof r == "string" && r.trim() !== "") return r.trim();
  }
  return "";
}
var ls = [
  "category",
  "text_code",
  "source",
  "stack_trace",
  "severity",
  "location",
  "metadata"
];
function cs(e, t) {
  const s = [];
  e && typeof e == "object" && !Array.isArray(e) && s.push(e.error, e), t && typeof t == "object" && !Array.isArray(t) && s.push(t.error, t);
  for (const r of s) if (r && typeof r == "object" && !Array.isArray(r)) {
    const a = r;
    if (ls.some((n) => n in a)) return a;
  }
  return null;
}
function Oe(e) {
  const t = e.lastIndexOf("/");
  return t >= 0 ? e.slice(t + 1) : e;
}
function $e(e) {
  const t = e.split("/").filter(Boolean);
  return t.length > 2 ? t.slice(-2).join("/") : e;
}
function Le(e) {
  if (typeof e == "number") return e;
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function ds(e) {
  const t = e.metadata && typeof e.metadata == "object" && !Array.isArray(e.metadata) ? e.metadata : {}, s = Object.entries(t).map(([u, y]) => ({
    key: u,
    value: Me(y) || Be(y)
  })).filter((u) => u.value), r = (Array.isArray(e.stack_trace) ? e.stack_trace : []).map((u) => {
    const y = g(u.function), f = g(u.file), m = Le(u.line);
    return {
      func: Oe(y),
      funcTitle: y,
      loc: f ? `${$e(f)}${m ? `:${m}` : ""}` : "",
      locTitle: f ? `${f}${m ? `:${m}` : ""}` : "",
      app: f !== "" && !f.includes("/pkg/mod/")
    };
  }).filter((u) => u.func || u.loc), a = e.location && typeof e.location == "object" && !Array.isArray(e.location) ? e.location : {}, n = g(a.file), i = g(a.function), o = Le(a.line), l = n ? `${$e(n)}${o ? `:${o}` : ""}` : "", d = [Oe(i), l ? `(${l})` : ""].filter(Boolean).join(" "), h = [i, n ? `${n}${o ? `:${o}` : ""}` : ""].filter(Boolean).join(" ");
  return {
    category: g(e.category),
    textCode: g(e.text_code),
    source: g(e.source),
    severity: g(e.severity),
    timestamp: g(e.timestamp),
    httpCode: typeof e.code == "number" ? String(e.code) : g(e.code),
    metadata: s,
    location: d,
    locationTitle: h,
    stackTrace: r
  };
}
function us(e, t, s, r) {
  const a = s && typeof s == "object" ? s : {}, n = a.receipt && typeof a.receipt == "object" ? a.receipt : {}, i = (Array.isArray(a.validation_errors) ? a.validation_errors : []).map((m) => ({
    path: g(m.path),
    message: g(m.message),
    code: g(m.code)
  })).filter((m) => m.message || m.path), o = n.Accepted ?? n.accepted, l = typeof o == "boolean" ? o : void 0;
  let d = "ok";
  e === "error" ? d = "error" : (i.length > 0 || l === !1) && (d = "invalid");
  const h = d === "error" ? cs(s, r) : null, u = h ? ds(h) : null;
  let y = "";
  i.length > 0 ? y = "VALIDATION_ERROR" : d === "error" && (y = u && u.textCode || Q(r || {}, ["code", "text_code"]) || (u ? u.httpCode : ""));
  const f = s != null && (typeof s != "object" || Object.keys(a).length > 0);
  return {
    kind: d,
    message: g(t) || (d === "error" ? "Command failed" : "Command dispatched"),
    code: y,
    correlationId: Q(n, ["CorrelationID", "correlation_id"]),
    mode: Q(n, ["Mode", "mode"]),
    dispatchId: Q(n, ["DispatchID", "dispatch_id"]),
    statusReference: g(a.status_reference) || g(a.statusReference),
    accepted: l,
    validationErrors: i,
    richError: u,
    hasRaw: f,
    rawJSON: f ? Be(s) : ""
  };
}
function Be(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function hs(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function fs(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function P(e, t, s) {
  return s ? `<span class="cmdl-meta" title="${p(t)}"><span class="cmdl-meta__k">${p(e)}</span>${p(s)}</span>` : "";
}
function ps(e, t = {}) {
  const s = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", r = e.code ? `<span class="cmdl-result__code">${p(e.code)}</span>` : "", a = t.liveStatus, n = a ? `<span class="cmdl-result__live cmdl-result__live--${p(a.state)}" title="Live status${a.at ? ` · ${p(a.at)}` : ""}">${p(a.state)}</span>` : "", i = e.richError, o = [
    P("id", "Correlation ID", e.correlationId),
    P("mode", "Execution mode", e.mode),
    P("dispatch", "Dispatch ID", e.dispatchId),
    P("status", "Status reference", e.statusReference),
    P("took", "Round-trip duration", typeof t.durationMs == "number" ? hs(t.durationMs) : ""),
    P("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? fs(t.at) : ""),
    i ? P("category", "Category", i.category) : "",
    i ? P("severity", "Severity", i.severity) : "",
    i ? P("http", "HTTP status", i.httpCode) : "",
    ...i ? i.metadata.map((m) => P(m.key, m.key, m.value)) : [],
    i ? P("when", "Timestamp", i.timestamp) : "",
    i ? P("at", i.locationTitle || "Origin", i.location) : ""
  ].filter(Boolean).join(""), l = o ? `<div class="cmdl-result__meta">${o}</div>` : "", d = i && i.source && i.source !== e.message ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${p(i.source)}</code></div>` : "", h = i && i.stackTrace.length ? `<details class="cmdl-result__trace"><summary>Stack trace · ${i.stackTrace.length} frame${i.stackTrace.length === 1 ? "" : "s"}</summary><ol class="cmdl-trace">${i.stackTrace.map((m) => `<li class="cmdl-trace__frame${m.app ? " cmdl-trace__frame--app" : ""}"><span class="cmdl-trace__fn" title="${p(m.funcTitle)}">${p(m.func)}</span>${m.loc ? `<span class="cmdl-trace__loc" title="${p(m.locTitle)}">${p(m.loc)}</span>` : ""}</li>`).join("")}</ol></details>` : "", u = e.validationErrors.length ? `<ul class="cmdl-result__validation">${e.validationErrors.map((m) => `<li><span class="cmdl-result__path">${p(m.path || "payload")}</span><span class="cmdl-result__vmsg">${p(m.message || m.code)}</span></li>`).join("")}</ul>` : "", y = e.hasRaw ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${p(e.rawJSON)}</pre></details>` : "", f = t.canRetry ? '<div class="cmdl-result__actions"><button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button></div>' : "";
  return `
    <div class="cmdl-result__card cmdl-result__card--${e.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${p(s)}</span>
        ${r}${n}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${p(e.message)}</div>
      ${d}
      ${l}
      ${u}
      ${h}
      ${f}
      ${y}
    </div>`;
}
var te = /* @__PURE__ */ new WeakMap();
function Ue() {
  A.forEach((e) => {
    try {
      e.unsubscribe();
    } catch {
    }
    try {
      e.controller.destroy();
    } catch {
    }
  }), A.clear();
}
function ms() {
  Ue();
}
function gs(e) {
  A.forEach((t, s) => {
    if (s !== e) {
      try {
        t.unsubscribe();
      } catch {
      }
      try {
        t.controller.destroy();
      } catch {
      }
      A.delete(s);
    }
  });
}
function ys() {
  const e = globalThis, t = e.FormgenRelationships && typeof e.FormgenRelationships == "object" ? e.FormgenRelationships : {}, s = e.Formgen && typeof e.Formgen == "object" ? e.Formgen : void 0;
  return {
    ...t,
    Formgen: t.Formgen || s
  };
}
function M(e) {
  const t = w(e.dataset.actionId || "");
  return t ? A.get(t) : void 0;
}
function bs(e, t) {
  const s = A.get(w(e));
  if (!s) return !1;
  const r = {};
  if (Object.entries(t || {}).forEach(([n, i]) => {
    const o = as(n).replace(/^payload\./, "");
    if (o) {
      if (typeof i == "string") r[o] = i;
      else if (Array.isArray(i)) {
        const l = i.map(Me).filter(Boolean);
        l.length > 0 && (r[o] = l);
      }
    }
  }), s.controller.clearErrors(), Object.keys(r).length === 0) return !0;
  s.controller.setErrors(r);
  const a = Object.keys(r)[0];
  return s.controller.focus(a), !0;
}
function Es(e, t) {
  const s = A.get(w(e));
  if (!s) return !1;
  const r = t.payload && typeof t.payload == "object" && !Array.isArray(t.payload) ? t.payload : t;
  s.controller.setValues(r);
  const a = s.controller.getValues();
  return k(s.form, a), N(s.form, a), !0;
}
function k(e, t) {
  const s = e.querySelector("[data-cmdl-controller-payload]");
  s && (s.value = JSON.stringify(t || {}));
}
function N(e, t) {
  const s = w(e.dataset.actionId || "");
  !s || I(e) || W.set(s, Je(t));
}
function Je(e) {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}
function se(e, t, s = "") {
  e.dataset.cmdlFormgenReady = t ? "true" : "false", e.querySelectorAll("[data-cmdl-formgen-submit]").forEach((a) => {
    a.disabled = !t;
  });
  let r = e.querySelector("[data-cmdl-formgen-error]");
  s && !r && (r = document.createElement("div"), r.dataset.cmdlFormgenError = "", r.className = "cmdl-form__runtime-error", e.querySelector("[data-cmdl-fields]")?.insertAdjacentElement("afterend", r)), r && (r.textContent = s, r.hidden = s === "");
}
function vs(e) {
  return { beforeFetch(t) {
    const s = Ss(t.request.url);
    if (!s) return;
    const r = e.closest("[data-cmdl-root]"), a = g(r?.dataset.cmdlDebugPath), n = g(r?.dataset.cmdlOptionResolver);
    if (!a || !n) throw new Error("Dynamic command options are unavailable because no protected resolver action is configured.");
    const i = s.searchParams.get("command_id") || g(e.dataset.cmdlCommand), o = s.searchParams.get("field_path") || "", l = s.searchParams.get("source_id") || "";
    if (!i || !o || !l) throw new Error("Dynamic command option metadata is incomplete.");
    const d = M(e)?.controller.getValues() || pe(e), h = new Headers(t.request.init.headers || {});
    h.set("Accept", "application/json"), h.set("Content-Type", "application/json");
    const u = Qe();
    u && h.set("X-CSRF-Token", u), t.request.url = `${a}/api/panels/${K}/actions/${encodeURIComponent(n)}`, t.request.init.method = "POST", t.request.init.credentials = "same-origin", t.request.init.headers = h, t.request.init.body = JSON.stringify({
      command_id: i,
      field_path: o,
      source_id: l,
      payload: d
    });
  } };
}
function Ss(e) {
  const t = e.startsWith(`/${Pe}`) ? e.slice(1) : e;
  if (!t.startsWith(Pe)) return null;
  try {
    return new URL(t);
  } catch {
    throw new Error("Dynamic command option metadata contains an invalid resolver URL.");
  }
}
function he(e) {
  if (!e.querySelector("[data-cmdl-formgen-root]")) return Promise.resolve();
  const t = te.get(e);
  if (t) return t;
  if (M(e) && e.dataset.cmdlFormgenReady === "true") return Promise.resolve();
  const s = (async () => {
    const r = w(e.dataset.actionId || ""), a = e.querySelector("[data-cmdl-formgen-root]"), n = ys();
    if (!r || !a || !n?.initFormgenRoot || !n.Formgen?.attach) {
      se(e, !1, "The form runtime is unavailable. Refresh after loading the formgen assets.");
      return;
    }
    const i = a.querySelector("[data-formgen-auto-init]") || a;
    try {
      const o = n.Formgen.attach(i), l = W.get(r);
      l && !I(e) && o.setValues(l), A.set(r, {
        form: e,
        root: i,
        controller: o,
        unsubscribe: () => {
        }
      }), k(e, o.getValues());
      const d = await n.initFormgenRoot(i, vs(e));
      if (!e.isConnected || J !== r) {
        o.destroy(), d.destroy(i), A.delete(r);
        return;
      }
      o.destroy();
      const h = n.Formgen.attach(i, { registry: d });
      l && !I(e) && h.setValues(l);
      const u = h.onChange((f) => {
        k(e, f), N(e, f);
      });
      A.set(r, {
        form: e,
        root: i,
        controller: h,
        unsubscribe: u
      });
      const y = h.getValues();
      k(e, y), N(e, y), se(e, !0);
    } catch (o) {
      const l = A.get(r);
      if (l?.form === e) {
        try {
          l.unsubscribe();
        } catch {
        }
        try {
          l.controller.destroy();
        } catch {
        }
        A.delete(r);
      }
      se(e, !1, o instanceof Error ? o.message : "Unable to initialize the generated form.");
    } finally {
      te.delete(e);
    }
  })();
  return te.set(e, s), s;
}
function X(e, t) {
  J = t, gs(t);
  const s = e.querySelector("[data-cmdl-empty]");
  s && (s.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((a) => {
    a.hidden = a.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((a) => {
    const n = a.dataset.cmdlItem === t;
    a.classList.toggle("cmdl-item--active", n), a.setAttribute("aria-selected", n ? "true" : "false");
  });
  const r = e.querySelector(`[data-cmdl-detail="${He(t)}"]`);
  if (r) {
    const a = r.querySelector("[data-panel-action-form]");
    a && he(a);
  }
}
function Re(e, t) {
  const s = t.trim().toLowerCase();
  let r = !1;
  e.querySelectorAll("[data-cmdl-item]").forEach((n) => {
    const i = n.dataset.cmdlSearch || "", o = s === "" || i.includes(s);
    n.hidden = !o, o && (r = !0);
  }), e.querySelectorAll("[data-cmdl-group]").forEach((n) => {
    n.hidden = !Array.from(n.querySelectorAll("[data-cmdl-item]")).some((i) => !i.hidden);
  });
  const a = e.querySelector("[data-cmdl-noresults]");
  a && (a.hidden = r);
}
function De(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => !t.hidden);
}
function ws(e) {
  if (!w(e.dataset.actionId || "")) return;
  const t = M(e)?.controller?.getValues() || pe(e);
  k(e, t), N(e, t);
}
var Ps = 6;
function Y() {
  try {
    return typeof localStorage < "u" ? localStorage : null;
  } catch {
    return null;
  }
}
function F(e) {
  const t = Y();
  if (!t) return [];
  try {
    const s = t.getItem(e), r = s ? JSON.parse(s) : [];
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
function ce(e, t) {
  const s = Y();
  if (s)
    try {
      s.setItem(e, JSON.stringify(t));
    } catch {
    }
}
function fe(e) {
  return `cmdl:recent:${e}`;
}
function q(e) {
  return `cmdl:preset:${e}`;
}
function As(e) {
  const t = e && typeof e == "object" ? e : {}, s = g(t.command_id), r = t.payload && typeof t.payload == "object" ? t.payload : {};
  if (!s || Object.keys(r).length === 0) return;
  const a = fe(s), n = JSON.stringify(r), i = F(a).filter((o) => JSON.stringify(o.payload) !== n);
  i.unshift({
    at: Date.now(),
    payload: r
  }), ce(a, i.slice(0, Ps));
}
function Ke(e) {
  return I(e) ? {} : M(e)?.controller.getValues() || pe(e);
}
function pe(e) {
  const t = e.querySelector("[data-cmdl-controller-payload]");
  if (!t?.value) return {};
  try {
    const s = JSON.parse(t.value);
    return s && typeof s == "object" && !Array.isArray(s) ? s : {};
  } catch {
    return {};
  }
}
function Ve(e, t) {
  const s = M(e);
  if (s) {
    s.controller.setValues(t), k(e, s.controller.getValues()), N(e, s.controller.getValues());
    return;
  }
  const r = w(e.dataset.actionId || "");
  r && !I(e) && W.set(r, Je(t)), he(e);
}
function de(e) {
  const t = g(e.dataset.cmdlCommand), s = e.querySelector("[data-cmdl-recall-list]");
  if (!t || !s) return;
  const r = F(fe(t)), a = F(q(t)), n = [];
  r.forEach((i, o) => {
    n.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${o}" title="Reload recent invocation ${o + 1}">↻ recent ${o + 1}</button>`);
  }), a.forEach((i, o) => {
    const l = g(i.name) || `preset ${o + 1}`;
    n.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${o}" title="Load saved preset">★ ${p(l)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${o}" aria-label="Delete preset ${p(l)}">×</button></span>`);
  }), s.innerHTML = n.length ? n.join("") : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}
function Cs(e, t) {
  const s = e.closest("[data-cmdl-load]");
  if (s) {
    const n = s.closest("[data-panel-action-form]"), i = g(s.closest("[data-cmdl-recall]")?.dataset.cmdlCommand), [o, l] = (s.dataset.cmdlLoad || "").split(":"), d = Number(l);
    if (n && i && Number.isInteger(d)) {
      const h = F(o === "preset" ? q(i) : fe(i))[d]?.payload;
      h && typeof h == "object" && Ve(n, h);
    }
    return !0;
  }
  const r = e.closest("[data-cmdl-save-preset]");
  if (r) {
    const n = r.closest("[data-panel-action-form]"), i = r.closest("[data-cmdl-recall]"), o = g(i?.dataset.cmdlCommand);
    if (n && i && o) {
      const l = (typeof window < "u" && typeof window.prompt == "function" ? window.prompt("Preset name") : "") || "";
      if (l.trim()) {
        const d = F(q(o)).filter((h) => g(h.name) !== l.trim());
        d.unshift({
          name: l.trim(),
          payload: Ke(n)
        }), ce(q(o), d), de(i);
      }
    }
    return !0;
  }
  const a = e.closest("[data-cmdl-del-preset]");
  if (a) {
    const n = a.closest("[data-cmdl-recall]"), i = g(n?.dataset.cmdlCommand), o = Number(a.dataset.cmdlDelPreset);
    if (n && i && Number.isInteger(o)) {
      const l = F(q(i));
      l.splice(o, 1), ce(q(i), l), de(n);
    }
    return !0;
  }
  return !1;
}
function xs(e, t) {
  if (I(e)) return;
  const s = e.querySelector("[data-cmdl-fields]"), r = e.querySelector("[data-cmdl-json]"), a = e.querySelector("[data-cmdl-json-editor]"), n = e.querySelector("[data-cmdl-json-toggle]"), i = e.querySelector("[data-cmdl-json-error]");
  if (!s || !r || !a) return;
  if (t) {
    a.value = JSON.stringify(Ke(e), null, 2), i && (i.hidden = !0), s.hidden = !0, r.hidden = !1, e.dataset.cmdlMode = "json", n && (n.textContent = "Form");
    return;
  }
  let o;
  try {
    o = a.value.trim() ? JSON.parse(a.value) : {};
  } catch (l) {
    i && (i.textContent = `Invalid JSON: ${l.message}`, i.hidden = !1);
    return;
  }
  if (!o || typeof o != "object" || Array.isArray(o)) {
    i && (i.textContent = "Payload must be a JSON object.", i.hidden = !1);
    return;
  }
  Ve(e, o), s.hidden = !1, r.hidden = !0, e.dataset.cmdlMode = "form", n && (n.textContent = "JSON");
}
function _s() {
  const e = Y();
  if (!e) return 0;
  try {
    const t = Number(e.getItem(Ne));
    return Number.isFinite(t) && t >= ue ? t : 0;
  } catch {
    return 0;
  }
}
function Os(e) {
  const t = e.clientWidth || 0;
  return t > 0 ? Math.max(ue, t - Wt) : Xt;
}
function re(e, t) {
  const s = Math.min(Math.max(Math.round(t), ue), Os(e));
  D = s, e.style.setProperty("--cmdl-sidebar-w", `${s}px`);
  const r = Y();
  if (r) try {
    r.setItem(Ne, String(s));
  } catch {
  }
  return s;
}
function $s(e) {
  D || (D = _s()), D && e.style.setProperty("--cmdl-sidebar-w", `${D}px`);
}
function Ls(e) {
  const t = e.querySelector("[data-cmdl-resizer]"), s = e.querySelector("[data-cmdl-body]");
  !t || !s || ($s(s), t.addEventListener("pointerdown", (r) => {
    r.preventDefault();
    const a = r.clientX, n = D || Ae;
    if (typeof t.setPointerCapture == "function") try {
      t.setPointerCapture(r.pointerId);
    } catch {
    }
    const i = (l) => re(s, n + (l.clientX - a)), o = (l) => {
      re(s, n + (l.clientX - a)), t.removeEventListener("pointermove", i), t.removeEventListener("pointerup", o), t.removeEventListener("pointercancel", o);
    };
    t.addEventListener("pointermove", i), t.addEventListener("pointerup", o), t.addEventListener("pointercancel", o);
  }), t.addEventListener("keydown", (r) => {
    r.key !== "ArrowLeft" && r.key !== "ArrowRight" || (r.preventDefault(), re(s, (D || Ae) + (r.key === "ArrowRight" ? Ce : -Ce)));
  }));
}
function ae(e, t) {
  const s = e.querySelector("[data-cmdl-bar-main]"), r = e.querySelector("[data-cmdl-confirm-row]");
  if (!s || !r) return;
  s.hidden = t, r.hidden = !t;
  const a = t ? r.querySelector("[data-cmdl-confirm-run]") : s.querySelector("button");
  if (a && typeof a.focus == "function") try {
    a.focus();
  } catch {
  }
}
function Rs(e, t = {}) {
  const s = e.querySelector("[data-cmdl-root]");
  if (!s) return;
  Ue(), s.dataset.cmdlDebugPath = g(t.debugPath), Ls(s), s.querySelectorAll("[data-cmdl-recall]").forEach((a) => de(a));
  const r = s.querySelector("[data-cmdl-filter]");
  r && z && (r.value = z, Re(s, z)), J && s.querySelector(`[data-cmdl-item="${He(J)}"]`) && X(s, J), s.addEventListener("click", (a) => {
    const n = a.target;
    if (Cs(n, s)) return;
    const i = n.closest("[data-cmdl-json-toggle]");
    if (i) {
      const h = i.closest("[data-panel-action-form]");
      h && xs(h, h.dataset.cmdlMode !== "json");
      return;
    }
    const o = n.closest("[data-cmdl-confirm-run]");
    if (o) {
      const h = o.closest("[data-panel-action-form]");
      h && (h.dataset.cmdlArmed = "true");
      return;
    }
    const l = n.closest("[data-cmdl-cancel]");
    if (l) {
      const h = l.closest("[data-panel-action-form]");
      h && (delete h.dataset.cmdlArmed, ae(h, !1));
      return;
    }
    const d = n.closest("[data-cmdl-item]");
    if (d) {
      X(s, d.dataset.cmdlItem || "");
      return;
    }
  }), r && (r.addEventListener("input", () => {
    z = r.value, Re(s, r.value);
  }), r.addEventListener("keydown", (a) => {
    if (a.key === "ArrowDown" || a.key === "Enter") {
      const n = De(s)[0];
      n && (a.preventDefault(), a.key === "Enter" ? X(s, n.dataset.cmdlItem || "") : n.focus());
    }
  })), s.addEventListener("submit", (a) => {
    const n = a.target?.closest("[data-panel-action-form]");
    if (n) {
      if (n.dataset.cmdlFormgenReady !== "true") {
        a.preventDefault(), a.stopImmediatePropagation(), he(n);
        return;
      }
      if (n.dataset.cmdlConfirm === "true" && n.dataset.cmdlArmed !== "true") {
        a.preventDefault(), a.stopImmediatePropagation(), ae(n, !0);
        return;
      }
      ws(n), n.dataset.cmdlConfirm === "true" && (delete n.dataset.cmdlArmed, ae(n, !1));
    }
  }, !0), s.addEventListener("keydown", (a) => {
    const n = a.target.closest("[data-cmdl-item]");
    if (n && (a.key === "ArrowDown" || a.key === "ArrowUp")) {
      a.preventDefault();
      const i = De(s), o = i.indexOf(n), l = i[a.key === "ArrowDown" ? o + 1 : o - 1];
      l ? l.focus() : a.key === "ArrowUp" && r && r.focus();
      return;
    }
    n && a.key === "Enter" && (a.preventDefault(), X(s, n.dataset.cmdlItem || ""));
  }), s.addEventListener("reset", (a) => {
    const n = a.target, i = w(n.dataset.actionId || "");
    i && W.delete(i), window.setTimeout(() => {
      const o = M(n);
      if (o) {
        o.controller.reset();
        const l = o.controller.getValues();
        k(n, l), N(n, l);
      }
    }, 0);
  });
}
function He(e) {
  return e.replace(/["\\]/g, "\\$&");
}
_t(K, os);
var ke = "debug-console-active-panel", Ie = "debug-console-panel-order", Ds = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, Te = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, ks = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : Ot(), ne = (e, t) => Ht(e, t), Is = (e, t, s) => {
  if (!e || !t) return;
  const r = t.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0) return;
  let a = e;
  for (let n = 0; n < r.length - 1; n += 1) {
    const i = r[n];
    (!a[i] || typeof a[i] != "object") && (a[i] = {}), a = a[i];
  }
  a[r[r.length - 1]] = s;
}, ie = (e, t) => {
  if (!e) return t;
  const s = Number(e);
  return Number.isNaN(s) ? t : s;
}, qe = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, Ts = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.logsExpanded = /* @__PURE__ */ new Set(), this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.pauseButton = null, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.container = e;
    const t = ks(Te(e.dataset.panels));
    t.includes("sessions") || t.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(t), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = ie(e.dataset.maxLogEntries, 500), this.maxSQLQueries = ie(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = ie(e.dataset.slowThresholdMs, 50), this.replCommands = Ct(Te(e.dataset.replCommands)), this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: {
        data: {},
        logs: []
      },
      extra: {}
    }, this.filters = {
      requests: {
        method: "all",
        status: "all",
        search: "",
        newestFirst: !0,
        hasBody: !1,
        contentType: "all"
      },
      sql: {
        search: "",
        slowOnly: !1,
        errorOnly: !1,
        newestFirst: !0
      },
      logs: {
        level: "all",
        search: "",
        autoScroll: !0,
        newestFirst: !0
      },
      routes: {
        method: "all",
        search: ""
      },
      sessions: { search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), St.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = Z(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.sqlView = new Ye({
      styles: S,
      copyOptions: { useIconFeedback: !0 },
      getQueries: () => this.state.sql,
      getRenderOptions: () => ({
        newestFirst: this.filters.sql.newestFirst,
        slowThresholdMs: this.slowThresholdMs,
        maxEntries: this.maxSQLQueries,
        useIconCopyButton: !0
      }),
      getMaxEntries: () => this.maxSQLQueries,
      shouldDisplay: (s) => this.sqlEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onPendingChange: (s) => this.updatePauseIndicator(s)
    }), this.logsView = new G({
      styles: S,
      keyOf: Ee,
      renderRow: (s) => nt(s, S, {
        showSource: !0,
        truncateMessage: !1,
        expandable: !0
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.logEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => me(s, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.logsExpanded
      }),
      onRestore: (s) => ye(s, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.logsExpanded
      }),
      onEvict: (s) => s.forEach((r) => this.logsExpanded.delete(r)),
      onAfterAppend: () => {
        this.attachCopyButtonListeners(), this.applyLogsAutoScroll();
      }
    }), this.requestsView = new G({
      styles: S,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: Ge,
      renderRow: (s) => ht(s, S, {
        expandedRequestIds: this.expandedRequests,
        truncatePath: !1,
        slowThresholdMs: this.slowThresholdMs
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.requestEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => tt(s, this.expandedRequests, { useIconFeedback: !0 })
    }), this.jserrorsView = new G({
      styles: S,
      keyOf: it,
      renderRow: (s) => dt(s, S, { compact: !1 }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => me(s, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (s) => ye(s, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new ot({
      styles: S,
      getRenderOptions: () => ({}),
      shouldDisplay: (s, r) => {
        if (!s.applyFilters) return !0;
        const a = this.getPanelFilterState(s.id, s), n = s.applyFilters([r], a);
        return Array.isArray(n) ? n.length > 0 : !0;
      },
      onNeedFullRender: () => this.renderPanel()
    }), this.bindActions(), this.updateSessionBanner(), this.stream = new ge({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = L.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder(), await $t(this.debugPath), this.eventToPanel = Z(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const s of Pt(t)) e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null;
    try {
      e = this.normalizeStoredPanelID(sessionStorage.getItem(ke));
    } catch {
      e = null;
    }
    this.activePanel = e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(ke, this.activePanel);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(Ie, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const e = this.panelOrderPreferencesPath.trim();
    if (!e) return !1;
    try {
      const t = await $(e, {
        method: "GET",
        credentials: "same-origin"
      });
      if (!t.ok) return !1;
      const s = await j(t);
      return !s?.available || !s.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(s.panel_order), this.savedPanelOrder.length > 0);
    } catch {
      return !1;
    }
  }
  async saveServerPanelOrderPreference(e) {
    const t = this.panelOrderPreferencesPath.trim();
    if (t)
      try {
        await $(t, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: e }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const e = localStorage.getItem(Ie);
      if (e) {
        const t = JSON.parse(e);
        return this.normalizeSavedPanelOrder(t);
      }
    } catch {
    }
    return null;
  }
  normalizePanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return !t || !Ds.test(t) ? null : t;
  }
  normalizeAvailablePanelIDs(e) {
    if (!Array.isArray(e)) return [];
    const t = [], s = /* @__PURE__ */ new Set();
    for (const r of e) {
      const a = this.normalizePanelID(r);
      !a || s.has(a) || (s.add(a), t.push(a));
    }
    return t;
  }
  normalizeSavedPanelOrder(e) {
    const t = this.normalizeAvailablePanelIDs(e);
    return t.length > 0 ? t : null;
  }
  mergePanelOrder(e, t) {
    const s = this.normalizeAvailablePanelIDs(e);
    if (!t || t.length === 0) return s;
    const r = new Set(s), a = [];
    for (const n of t) r.has(n) && (a.push(n), r.delete(n));
    for (const n of s) r.has(n) && a.push(n);
    return a;
  }
  applyPanelOrder() {
    const e = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = e.length > 0 ? e : this.availablePanels, this.restoreActivePanel();
  }
  initTabDragDrop() {
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = We.create(this.tabsEl, {
      animation: 150,
      draggable: ".debug-tab",
      fallbackTolerance: 5,
      delayOnTouchOnly: !0,
      delay: 120,
      touchStartThreshold: 8,
      scroll: !0,
      bubbleScroll: !0,
      ghostClass: "debug-tab--ghost",
      chosenClass: "debug-tab--chosen",
      dragClass: "debug-tab--drag",
      direction: "horizontal",
      onEnd: () => {
        const e = Array.from(this.tabsEl.querySelectorAll("[data-panel]")).map((s) => s.dataset.panel || "").filter(Boolean), t = this.mergePanelOrder(this.availablePanels, e);
        t.length > 0 && (this.savedPanelOrder = t, this.panels = t, this.persistPanelOrder(), this.saveServerPanelOrderPreference(t));
      }
    });
  }
  handleRegistryChange(e) {
    const t = this.normalizePanelID(e.panelId), s = this.activePanel, r = e.type === "unregister" && t === s;
    this.eventToPanel = Z(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((n) => n !== t), delete this.customFilterState[t]), this.applyPanelOrder();
    const a = s !== this.activePanel;
    this.subscribeToEvents(), this.renderTabs(), (r || a || t === this.activePanel) && this.renderActivePanel();
  }
  requireElement(e, t = this.container) {
    const s = t.querySelector(e);
    if (!s) throw new Error(`Missing debug element: ${e}`);
    return s;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      const s = t.closest("[data-panel]");
      if (!s) return;
      const r = s.dataset.panel || "";
      !r || r === this.activePanel || (this.activePanel = r, this.persistActivePanel(), this.renderActivePanel());
    }), this.container.addEventListener("click", (e) => {
      const t = e.target?.closest("[data-debug-action]");
      if (!(!t || !this.container.contains(t)))
        switch (t.dataset.debugAction || "") {
          case "snapshot":
            this.stream.requestSnapshot();
            break;
          case "clear":
            this.clearAll();
            break;
          case "pause":
            this.togglePause(t);
            break;
          case "clear-panel":
            this.clearActivePanel();
            break;
          default:
            break;
        }
    }), this.panelEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      const s = t.closest("[data-doctor-action-navigate]");
      if (s && !s.disabled) {
        this.navigateFromDoctorAction(s);
        return;
      }
      const r = t.closest("[data-doctor-action-run]");
      if (!r || r.disabled) return;
      const a = r.dataset.doctorActionRun || "", n = r.dataset.doctorActionConfirm || "", i = r.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(a, n, i);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const s = t === this.activePanel ? "debug-tab--active" : "", r = gt(At(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${p(t)}">
            ${r}
            <span class="debug-tab__label">${p(ve(t))}</span>
            <span class="debug-tab__count" data-panel-count="${p(t)}">0</span>
          </button>
        `;
    }).join("");
    this.tabsEl.innerHTML = e, this.updateTabCounts(), this.initTabDragDrop();
  }
  renderActivePanel() {
    this.renderTabs(), this.renderFilters(), this.renderPanel();
  }
  renderFilters() {
    const e = this.activePanel;
    let t = "";
    const s = this.panelRenderers.get(e);
    if (s?.filters) t = s.filters();
    else {
      const r = L.get(e);
      if (r?.showFilters === !1) {
        this.filtersEl.innerHTML = '<span class="timestamp">No filters</span>';
        return;
      }
      if (r?.renderFilters) {
        const a = this.getPanelFilterState(e, r), n = r.renderFilters(a);
        this.filtersEl.innerHTML = n || '<span class="timestamp">No filters</span>', n && this.bindFilterInputs();
        return;
      }
    }
    if (!s?.filters && e === "requests") {
      const r = this.filters.requests, a = this.getUniqueContentTypes();
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions([
        "all",
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
      ], r.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions([
        "all",
        "200",
        "201",
        "204",
        "400",
        "401",
        "403",
        "404",
        "500"
      ], r.status)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Content-Type</label>
          <select data-filter="contentType">
            ${this.renderSelectOptions(["all", ...a], r.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(r.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="hasBody" ${r.hasBody ? "checked" : ""} />
          <span>Has Body</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${r.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!s?.filters && e === "sql") {
      const r = this.filters.sql;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(r.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${r.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${r.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${r.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!s?.filters && e === "logs") {
      const r = this.filters.logs;
      t = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions([
        "all",
        "debug",
        "info",
        "warn",
        "error"
      ], r.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(r.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${r.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${r.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (!s?.filters && e === "routes") {
      const r = this.filters.routes;
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions([
        "all",
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
      ], r.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(r.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && e === "sessions") {
      const r = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(r.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const r = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${p(r.search)}" placeholder="user.roles[0].name" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = t || '<span class="timestamp">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((e) => {
      e.addEventListener("input", () => this.updateFiltersFromInputs()), e.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), s = L.get(e);
    if (s?.renderFilters) {
      const r = this.getPanelFilterState(e, s), a = r && typeof r == "object" && !Array.isArray(r) ? { ...r } : {};
      t.forEach((n) => {
        const i = n.dataset.filter || "";
        if (!i) return;
        const o = a[i];
        a[i] = this.readFilterInputValue(n, o);
      }), this.customFilterState[e] = a, this.renderPanel();
      return;
    }
    if (e === "requests") {
      const r = { ...this.filters.requests };
      t.forEach((a) => {
        const n = a.dataset.filter || "";
        n === "newestFirst" || n === "hasBody" ? r[n] = a.checked : n && n in r && (r[n] = a.value);
      }), this.filters.requests = r;
    } else if (e === "sql") {
      const r = { ...this.filters.sql };
      t.forEach((a) => {
        const n = a.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" || n === "newestFirst" ? r[n] = a.checked : n === "search" && (r[n] = a.value);
      }), this.filters.sql = r;
    } else if (e === "logs") {
      const r = { ...this.filters.logs };
      t.forEach((a) => {
        const n = a.dataset.filter || "";
        n === "autoScroll" || n === "newestFirst" ? r[n] = a.checked : (n === "level" || n === "search") && (r[n] = a.value);
      }), this.filters.logs = r;
    } else if (e === "routes") {
      const r = { ...this.filters.routes };
      t.forEach((a) => {
        const n = a.dataset.filter || "";
        n && n in r && (r[n] = a.value);
      }), this.filters.routes = r;
    } else if (e === "sessions") {
      const r = { ...this.filters.sessions };
      t.forEach((a) => {
        const n = a.dataset.filter || "";
        n && n in r && (r[n] = a.value);
      }), this.filters.sessions = r;
    } else {
      const r = { ...this.filters.objects };
      t.forEach((a) => {
        const n = a.dataset.filter || "";
        n && n in r && (r[n] = a.value);
      }), this.filters.objects = r;
    }
    this.renderPanel();
  }
  getPanelFilterState(e, t) {
    const s = t || L.get(e);
    return s ? (e in this.customFilterState || (this.customFilterState[e] = s.defaultFilters !== void 0 ? this.cloneFilterState(s.defaultFilters) : {}), this.customFilterState[e]) : {};
  }
  cloneFilterState(e) {
    return Array.isArray(e) ? [...e] : e && typeof e == "object" ? { ...e } : e;
  }
  readFilterInputValue(e, t) {
    if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
    const s = e.value;
    if (typeof t == "number") {
      const r = Number(s);
      return Number.isNaN(r) ? t : r;
    }
    return typeof t == "boolean" ? s === "true" || s === "1" || s.toLowerCase() === "yes" : s;
  }
  renderPanel() {
    const e = this.activePanel;
    this.panelEl.classList.toggle("debug-content--launcher", e === "commands");
    const t = this.panelRenderers.get(e);
    if (t) {
      t.render();
      return;
    }
    this.panelEl.classList.remove("debug-content--repl");
    let s = "";
    if (e === "template") s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search);
    else if (e === "session") s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search);
    else if (e === "config") s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search);
    else if (e === "requests") s = this.renderRequests();
    else if (e === "sql") s = this.renderSQL();
    else if (e === "logs") s = this.renderLogs();
    else if (e === "routes") s = this.renderRoutes();
    else if (e === "sessions") s = this.renderSessionsPanel();
    else if (e === "custom") s = this.renderCustom();
    else if (e === "jserrors") s = ct(this.state.extra.jserrors || [], S, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const a = L.get(e);
      if (a && (a.renderConsole || a.render)) {
        const n = H(a);
        let i = this.getStateForKey(n);
        if (a.applyFilters) {
          const o = this.getPanelFilterState(e, a);
          i = a.applyFilters(i, o);
        } else if (!a.renderFilters && a.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && i && typeof i == "object" && !Array.isArray(i) && (i = ne(i, o));
        }
        s = (a.renderConsole || a.render)(i, S, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(ve(e), this.state.extra[e], this.filters.objects.search);
    }
    ms(), this.panelEl.innerHTML = s, e === "logs" && this.applyLogsAutoScroll(), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && this.requestsView.adopt(this.panelEl), e === "sql" && this.mountSQLView(), e === "logs" && this.logsView.adopt(this.panelEl), e === "jserrors" && this.jserrorsView.adopt(this.panelEl);
    const r = L.get(e);
    r && this.registryLiveList.handles(r) && this.registryLiveList.adopt(r, this.panelEl), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && Rs(this.panelEl, { debugPath: this.debugPath }), this.renderStoredPanelActionResult(e);
  }
  attachPanelActionListeners() {
    this.panelEl.querySelectorAll("[data-panel-action-picker]").forEach((e) => {
      const t = () => this.updatePanelActionPicker(e);
      e.addEventListener("change", t), t();
    }), this.panelEl.querySelectorAll("[data-panel-action]").forEach((e) => {
      e.addEventListener("click", () => {
        e.disabled || this.runPanelAction(e, e);
      });
    }), this.panelEl.querySelectorAll("[data-panel-action-form]").forEach((e) => {
      e.addEventListener("submit", (t) => {
        t.preventDefault();
        const s = e.querySelector('button[type="submit"]') || void 0;
        s?.disabled || this.runPanelAction(e, s);
      });
    });
  }
  async runPanelAction(e, t, s) {
    const r = e.dataset.panelId || "", a = e.dataset.actionId || "";
    if (!this.debugPath || !r || !a) return;
    const n = e.dataset.actionConfirm || "", i = e.dataset.actionRequiresConfirm === "true";
    if (e.dataset.actionConfirmInline !== "true" && (i || n) && !window.confirm(n || "Run this debug panel action?")) return;
    const o = s || be(e);
    let l = o;
    r === "commands" && e instanceof HTMLFormElement && (l = be(e, { excludeSensitive: !0 }), I(e) ? this.commandLauncherLastPayloads.delete(a) : this.commandLauncherLastPayloads.set(a, qe(o))), t && (t.disabled = !0);
    const d = Date.now();
    try {
      const h = await $(`${this.debugPath}/api/panels/${encodeURIComponent(r)}/actions/${encodeURIComponent(a)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!h.ok) {
        const y = await Xe(h, `Action failed (${h.status})`, { appendStatusToFallback: !1 });
        this.showPanelActionResult(r, "error", y.message, a, y.payload, void 0, {
          at: Date.now(),
          durationMs: Date.now() - d
        });
        return;
      }
      const u = await j(h);
      this.showPanelActionResult(r, u.ok === !1 ? "error" : "ok", u.message || (u.ok === !1 ? "Action failed" : "Action complete"), a, u.data, u.errors, {
        at: Date.now(),
        durationMs: Date.now() - d
      }), r === "commands" && As(l), u.event && this.handleEvent(u.event), u.refresh && await this.fetchSnapshot();
    } catch (h) {
      const u = h instanceof Error ? h.message : "Action failed";
      this.showPanelActionResult(r, "error", u, a, void 0, void 0, {
        at: Date.now(),
        durationMs: Date.now() - d
      });
    } finally {
      t && (t.disabled = !1);
    }
  }
  showPanelActionResult(e, t, s, r, a, n, i) {
    if (this.panelActionResults.set(e, {
      status: t,
      message: s,
      actionID: r,
      data: a,
      errors: n,
      at: i?.at,
      durationMs: i?.durationMs
    }), this.renderStoredPanelActionResult(e), e === "commands") {
      const o = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((l) => l.dataset.panelActionResult === "commands");
      o && typeof o.scrollIntoView == "function" && o.scrollIntoView({ block: "nearest" });
    }
  }
  renderStoredPanelActionResult(e) {
    const t = this.panelActionResults.get(e);
    if (!t) return;
    this.clearPanelActionErrors();
    const s = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((n) => n.dataset.panelActionResult === e);
    if (!s) return;
    if (e === "commands") {
      const n = us(t.status, t.message, t.data, t.errors), i = {};
      n.validationErrors.forEach((d) => {
        d.path && (i[d.path] = d.message || d.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(i, t.errors), (!t.actionID || !bs(t.actionID, i)) && this.renderPanelActionErrors(i, t.actionID);
      const o = !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)), l = Gt(n.correlationId);
      s.innerHTML = ps(n, {
        canRetry: o,
        at: t.at,
        durationMs: t.durationMs,
        liveStatus: l
      }), this.attachCommandLauncherResultActions(s, t.actionID);
      return;
    }
    const r = this.renderPanelActionErrors(t.errors, t.actionID), a = t.data === void 0 ? "" : `<pre class="${S.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${p(Et(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${t.status === "error" ? S.badgeError : S.badge}">${p(t.message)}</div>${r}${a}`;
  }
  attachCommandLauncherResultActions(e, t) {
    const s = e.querySelector("[data-cmdl-dismiss]");
    s && s.addEventListener("click", () => {
      this.panelActionResults.delete("commands"), e.innerHTML = "";
    });
    const r = e.querySelector("[data-cmdl-retry]");
    !r || !t || r.addEventListener("click", () => {
      this.retryCommandLauncherAction(t, r);
    });
  }
  retryCommandLauncherAction(e, t) {
    const s = this.commandLauncherLastPayloads.get(e);
    if (!s) return;
    const r = Array.from(this.panelEl.querySelectorAll("[data-panel-action-form]")).find((a) => a.dataset.panelId === "commands" && a.dataset.actionId === e);
    r && (Es(e, s), this.runPanelAction(r, t, qe(s)));
  }
  updatePanelActionPicker(e) {
    const t = e.closest("[data-panel-action-launcher]");
    if (!t) return;
    const s = e.value || "";
    t.querySelectorAll("[data-panel-action-choice]").forEach((r) => {
      r.hidden = r.dataset.panelActionChoice !== s;
    });
  }
  navigateFromDoctorAction(e) {
    const t = this.normalizePanelID(e.dataset.doctorActionNavigate || "");
    if (!t || !this.panels.includes(t)) return;
    let s = {};
    try {
      const r = decodeURIComponent(e.dataset.doctorActionState || ""), a = r ? JSON.parse(r) : {};
      a && typeof a == "object" && !Array.isArray(a) && (s = a);
    } catch {
      s = {};
    }
    this.activePanel = t, this.persistActivePanel(), this.renderActivePanel(), this.applyDoctorNavigationState(t, s);
  }
  applyDoctorNavigationState(e, t) {
    ut(this.panelEl, e, t);
  }
  clearPanelActionErrors() {
    this.panelEl.querySelectorAll("[data-action-field-error]").forEach((e) => {
      e.textContent = "", e.hidden = !0;
    });
  }
  renderPanelActionErrors(e, t) {
    if (!e || typeof e != "object") return "";
    const s = [];
    return Object.entries(e).forEach(([r, a]) => {
      const n = this.stringifyActionError(a);
      if (!n) return;
      const i = r.trim(), o = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((l) => t && l.dataset.actionId !== t ? !1 : l.dataset.actionFieldError === i || l.dataset.actionFieldName === i || l.dataset.actionFieldError === `payload.${i}`);
      if (o) {
        o.textContent = n, o.hidden = !1;
        return;
      }
      s.push(n);
    }), s.length === 0 ? "" : `<ul class="${S.badgeError}" style="margin-top:0.5rem">${s.map((r) => `<li>${p(r)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    et(this.panelEl);
  }
  attachCopyButtonListeners() {
    Ze(this.panelEl, { useIconFeedback: !0 });
  }
  mountSQLView() {
    this.sqlView.adopt(this.panelEl);
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new mt({
      kind: e === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: e === "console" ? this.replCommands : []
    }), this.replPanels.set(e, t)), t.attach(this.panelEl);
  }
  getUniqueContentTypes() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.state.requests) {
      const s = t.content_type;
      s && e.add(s.split(";")[0].trim());
    }
    return [...e].sort();
  }
  requestEntryMatchesFilters(e) {
    const { method: t, status: s, search: r, hasBody: a, contentType: n } = this.filters.requests;
    return !(t !== "all" && (e.method || "").toUpperCase() !== t || s !== "all" && String(e.status || "") !== s || r && !(e.path || "").toLowerCase().includes(r.toLowerCase()) || a && !e.request_body || n !== "all" && (e.content_type || "").split(";")[0].trim() !== n);
  }
  renderRequests() {
    const { newestFirst: e } = this.filters.requests, t = this.state.requests.filter((s) => this.requestEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No requests captured yet.") : st(t, S, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      truncatePath: !1,
      expandedRequestIds: this.expandedRequests
    });
  }
  sqlEntryMatchesFilters(e) {
    const { search: t, slowOnly: s, errorOnly: r } = this.filters.sql;
    return !(r && !e.error || s && !this.isSlowQuery(e) || t && !(e.query || "").toLowerCase().includes(t.toLowerCase()));
  }
  renderSQL() {
    const { newestFirst: e } = this.filters.sql, t = this.state.sql.filter((s) => this.sqlEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : rt(t, S, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  logEntryMatchesFilters(e) {
    const { level: t, search: s } = this.filters.logs;
    return !(t !== "all" && (e.level || "").toLowerCase() !== t || s && !pt(e).includes(s.toLowerCase()));
  }
  applyLogsAutoScroll() {
    this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight);
  }
  renderLogs() {
    const { newestFirst: e } = this.filters.logs, t = this.state.logs.filter((s) => this.logEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No logs captured yet.") : ft(t, S, {
      newestFirst: e,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1,
      expandable: !0
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((a) => {
      if (e !== "all" && (a.method || "").toUpperCase() !== e) return !1;
      const n = `${a.path || ""} ${a.handler || ""} ${a.summary || ""}`.toLowerCase();
      return !(s && !n.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : at(r, S, { showName: !0 });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError) return this.renderEmptyState(this.sessionsError);
    const e = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, t = this.filters.sessions.search.trim().toLowerCase();
    let s = [...this.sessions];
    if (t && (s = s.filter((n) => [
      n.username,
      n.user_id,
      n.session_id,
      n.ip,
      n.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), s.sort((n, i) => {
      const o = new Date(n.last_activity || n.started_at || 0).getTime();
      return new Date(i.last_activity || i.started_at || 0).getTime() - o;
    }), this.sessionsLoading && s.length === 0) return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const r = s.map((n) => {
      const i = n.session_id || "", o = n.username || n.user_id || "Unknown", l = yt(n.last_activity || n.started_at), d = V(n.request_count ?? 0), h = !!i && i === this.activeSessionId, u = h ? "detach" : "attach", y = h ? "Detach" : "Attach", f = h ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", m = h ? "debug-session-row debug-session-row--active" : "debug-session-row", v = n.current_page || "-", _ = n.ip || "-";
      return `
          <tr class="${m}">
            <td>
              <div class="debug-session-user">${p(o)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${p(i || "-")}</span>
              </div>
            </td>
            <td>${p(_)}</td>
            <td>
              <span class="debug-session-path">${p(v)}</span>
            </td>
            <td>${p(l || "-")}</td>
            <td>${p(d)}</td>
            <td>
              <button class="${f}" data-session-action="${u}" data-session-id="${p(i)}">
                ${y}
              </button>
            </td>
          </tr>
        `;
    }).join(""), a = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${V(s.length)} active`}</span>
        <div class="debug-session-toolbar__actions">
          <button class="debug-btn" data-session-action="refresh">
            <i class="iconoir-refresh"></i> ${a}
          </button>
        </div>
      </div>
      <table class="debug-table debug-session-table">
        <thead>
          <tr>
            <th>User</th>
            <th>IP</th>
            <th>Current Page</th>
            <th>Last Activity</th>
            <th>Requests</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${r}
        </tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, s = this.state.custom.logs.length > 0;
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : lt(this.state.custom, S, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (r) => ne(r, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const r = t && typeof t == "object" && !Array.isArray(t), a = Array.isArray(t);
    return r && Object.keys(t || {}).length === 0 || a && (t || []).length === 0 || !r && !a && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : bt(e, t, S, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (n) => ne(n, s) : void 0
    });
  }
  attachSessionActions() {
    this.panelEl.querySelectorAll("[data-session-action]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.sessionAction || "", s = e.dataset.sessionId || "";
        switch (t) {
          case "refresh":
            this.fetchSessions(!0);
            break;
          case "attach":
            this.attachSessionByID(s);
            break;
          case "detach":
            this.detachSession();
            break;
          default:
            break;
        }
      });
    });
  }
  async fetchSessions(e = !1) {
    if (this.debugPath && !this.sessionsLoading && !(!e && this.sessionsLoaded && this.sessionsUpdatedAt && Date.now() - this.sessionsUpdatedAt.getTime() < 3e3)) {
      this.sessionsLoading = !0, this.sessionsError = null;
      try {
        const t = await $(`${this.debugPath}/api/sessions`, { credentials: "same-origin" });
        if (!t.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const s = await j(t);
        if (this.sessions = Array.isArray(s.sessions) ? s.sessions : [], this.sessionsLoaded = !0, this.sessionsUpdatedAt = /* @__PURE__ */ new Date(), this.activeSessionId) {
          const r = this.sessions.find((a) => a.session_id === this.activeSessionId);
          r && (this.activeSession = r, this.updateSessionBanner());
        }
      } catch {
        this.sessionsError = "Failed to load active sessions.";
      } finally {
        this.sessionsLoading = !1, this.updateTabCounts(), this.activePanel === "sessions" && this.renderPanel();
      }
    }
  }
  attachSessionByID(e) {
    const t = e.trim();
    if (!t || this.activeSessionId === t) return;
    const s = this.sessions.find((r) => r.session_id === t) || { session_id: t };
    this.attachSession(s);
  }
  attachSession(e) {
    const t = (e.session_id || "").trim();
    t && this.activeSessionId !== t && (this.activeSessionId = t, this.activeSession = e, this.streamBasePath = this.buildSessionStreamPath(t), this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("session"), this.renderPanel());
  }
  detachSession() {
    this.activeSessionId && (this.activeSessionId = null, this.activeSession = null, this.streamBasePath = this.debugPath, this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("global"), this.renderPanel());
  }
  rebuildStream(e) {
    this.stream.close(), this.stream = new ge({
      basePath: this.streamBasePath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.updateConnectionStatus(t)
    }), this.stream.connect(), this.subscribeToEvents(), e === "session" ? this.stream.requestSnapshot() : this.fetchSnapshot();
  }
  resetDebugState() {
    this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: {
        data: {},
        logs: []
      },
      extra: {}
    }, this.expandedRequests.clear(), this.logsExpanded.clear(), this.jserrorsExpanded.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
  }
  buildSessionStreamPath(e) {
    const t = this.debugPath.replace(/\/+$/, ""), s = encodeURIComponent(e);
    return t ? `${t}/session/${s}` : "";
  }
  updateSessionBanner() {
    if (this.sessionBannerEl) {
      if (!this.activeSessionId) {
        this.sessionBannerEl.setAttribute("hidden", "true");
        return;
      }
      this.sessionBannerEl.removeAttribute("hidden"), this.sessionMetaEl && (this.sessionMetaEl.textContent = this.sessionMetaText());
    }
  }
  sessionMetaText() {
    const e = this.activeSession || this.sessions.find((t) => t.session_id === this.activeSessionId) || { session_id: this.activeSessionId || void 0 };
    return [
      e.username || e.user_id,
      e.session_id,
      e.ip,
      e.current_page
    ].filter(Boolean).join(" | ");
  }
  panelCount(e) {
    if (e !== "sessions") {
      const t = L.get(e);
      if (t) {
        const s = H(t);
        return wt({ [s]: this.getStateForKey(s) }, t);
      }
    }
    switch (e) {
      case "template":
        return B(this.state.template);
      case "session":
        return B(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return B(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return B(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return B(this.state.extra[e]);
    }
  }
  renderEmptyState(e) {
    return `
      <div class="debug-empty">
        <p>${p(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((s) => {
      const r = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${p(s)}" ${r}>${p(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), s = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      s && (s.textContent = V(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${V(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(e) {
    if (!e || !e.type) return;
    if (e.type === "snapshot") {
      this.applySnapshot(e.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused) {
      (this.eventToPanel[e.type] || e.type) === "sql" && this.activePanel === "sql" && this.sqlView.enqueue([e.payload]);
      return;
    }
    if (e.type === "command_status") {
      Yt(e.payload), this.activePanel === "commands" && this.renderStoredPanelActionResult("commands");
      return;
    }
    const t = this.eventToPanel[e.type] || e.type, s = L.get(t);
    if (s) {
      const r = H(s), a = this.getStateForKey(r), n = (s.handleEvent || ((i, o) => Lt(i, o, this.maxLogEntries)))(a, e.payload);
      this.setStateForKey(r, n);
    } else switch (e.type) {
      case "request":
        this.state.requests.push(e.payload), this.trim(this.state.requests, this.maxLogEntries);
        break;
      case "sql":
        this.state.sql.push(e.payload), this.trim(this.state.sql, this.maxSQLQueries);
        break;
      case "log":
        this.state.logs.push(e.payload), this.trim(this.state.logs, this.maxLogEntries);
        break;
      case "template":
        this.state.template = e.payload || {};
        break;
      case "session":
        this.state.session = e.payload || {};
        break;
      case "custom":
        this.handleCustomEvent(e.payload);
        break;
      default:
        xt(t) || (this.state.extra[t] = e.payload);
        break;
    }
    if (this.updateTabCounts(), t === this.activePanel) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(s)) {
      const r = this.getStateForKey(H(s)), a = Array.isArray(r) ? r[r.length - 1] : void 0;
      this.registryLiveList.enqueue(s, a);
    } else this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Is(this.state.custom.data, String(e.key), e.value);
        return;
      }
      if (typeof e == "object" && ("category" in e || "message" in e)) {
        this.state.custom.logs.push(e), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  getStateForKey(e) {
    switch (e) {
      case "template":
        return this.state.template;
      case "session":
        return this.state.session;
      case "requests":
        return this.state.requests;
      case "sql":
        return this.state.sql;
      case "logs":
        return this.state.logs;
      case "config":
        return this.state.config;
      case "routes":
        return this.state.routes;
      case "custom":
        return this.state.custom;
      default:
        return this.state.extra[e];
    }
  }
  setStateForKey(e, t) {
    switch (e) {
      case "template":
        this.state.template = t || {};
        break;
      case "session":
        this.state.session = t || {};
        break;
      case "requests":
        this.state.requests = t || [];
        break;
      case "sql":
        this.state.sql = t || [];
        break;
      case "logs":
        this.state.logs = t || [], this.reconcileLogExpansion();
        break;
      case "config":
        this.state.config = t || {};
        break;
      case "routes":
        this.state.routes = t || [];
        break;
      case "custom":
        this.state.custom = t || {
          data: {},
          logs: []
        };
        break;
      default:
        this.state.extra[e] = t;
        break;
    }
  }
  applySnapshot(e) {
    const t = e || {};
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = U(t.requests), this.state.sql = U(t.sql), this.state.logs = U(t.logs), this.reconcileLogExpansion(), this.state.config = t.config || {}, this.state.routes = U(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: U(s.logs)
    };
    const r = /* @__PURE__ */ new Set([
      "template",
      "session",
      "requests",
      "sql",
      "logs",
      "config",
      "routes",
      "custom"
    ]), a = {};
    this.panels.forEach((n) => {
      !r.has(n) && n in t && (a[n] = t[n]);
    }), this.state.extra = a, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; ) e.shift();
  }
  reconcileLogExpansion() {
    const e = new Set(this.state.logs.map(Ee));
    this.logsExpanded.forEach((t) => {
      e.has(t) || this.logsExpanded.delete(t);
    });
  }
  isSlowQuery(e) {
    return vt(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.debugPath && !this.activeSessionId)
      try {
        const e = await $(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
        if (!e.ok) return;
        const t = await j(e);
        this.applySnapshot(t);
      } catch {
      }
  }
  clearAll() {
    this.debugPath && (this.logsExpanded.clear(), this.stream.clear(), !this.activeSessionId && $(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const e = this.activePanel;
    e === "logs" && this.logsExpanded.clear(), this.stream.clear([e]), !this.activeSessionId && $(`${this.debugPath}/api/clear/${e}`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    });
  }
  async parseJSONResponse(e) {
    const t = await j(e);
    return t && typeof t == "object" ? t : null;
  }
  readResponsePath(e, t) {
    if (!e || !t) return;
    const s = t.split(".").map((a) => a.trim()).filter(Boolean);
    if (s.length === 0) return;
    let r = e;
    for (const a of s) {
      if (!r || typeof r != "object") return;
      r = r[a];
    }
    return r;
  }
  responseMessage(e, t) {
    for (const s of t) {
      const r = this.readResponsePath(e, s);
      if (typeof r == "string" && r.trim()) return r.trim();
    }
    return "";
  }
  showDoctorActionToast(e, t) {
    const s = e.trim();
    if (!s) return;
    window.getComputedStyle(this.container).position === "static" && (this.container.style.position = "relative");
    let r = this.container.querySelector("[data-debug-toast-host]");
    r || (r = document.createElement("div"), r.dataset.debugToastHost = "true", r.style.position = "absolute", r.style.right = "12px", r.style.bottom = "12px", r.style.display = "flex", r.style.flexDirection = "column", r.style.gap = "8px", r.style.pointerEvents = "none", r.style.zIndex = "1000", this.container.appendChild(r));
    const a = t === "success" ? {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.45)",
      color: "#bbf7d0"
    } : {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.45)",
      color: "#fecaca"
    }, n = document.createElement("div");
    n.style.maxWidth = "380px", n.style.padding = "10px 12px", n.style.borderRadius = "8px", n.style.border = `1px solid ${a.border}`, n.style.background = a.bg, n.style.color = a.color, n.style.fontSize = "12px", n.style.lineHeight = "1.4", n.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.25)", n.style.pointerEvents = "auto", n.textContent = s, r.appendChild(n), window.setTimeout(() => {
      n.remove(), r && r.childElementCount === 0 && r.remove();
    }, 4200);
  }
  async runDoctorAction(e, t = "", s = !1) {
    if (!this.debugPath || this.activeSessionId) return;
    const r = e.trim();
    if (!r) return;
    const a = t.trim();
    if (s || a) {
      const n = a || "Are you sure you want to run this doctor action?";
      if (!window.confirm(n)) return;
    }
    try {
      const n = await $(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), i = await this.parseJSONResponse(n);
      if (!n.ok) {
        const l = this.responseMessage(i, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${n.status})`;
        this.showDoctorActionToast(l, "error");
        return;
      }
      const o = this.responseMessage(i, ["message", "result.message"]) || "Doctor action completed.";
      this.showDoctorActionToast(o, "success");
    } catch {
      this.showDoctorActionToast("Doctor action failed: unable to reach debug API.", "error");
    } finally {
      this.stream.requestSnapshot();
    }
  }
  togglePause(e) {
    if (this.paused = !this.paused, this.pauseButton = e, this.sqlView.setPaused(this.paused), this.paused) {
      e.textContent = "Resume";
      return;
    }
    this.sqlView.discardPending(), e.textContent = "Pause", this.stream.requestSnapshot();
  }
  updatePauseIndicator(e) {
    !this.paused || !this.pauseButton || (this.pauseButton.textContent = e > 0 ? `Resume (${e})` : "Resume");
  }
}, qs = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new Ts(t) : null;
}, Fe = () => {
  qs();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", Fe) : Fe();
export {
  Bs as DATA_ATTRS,
  ur as DEBUG_ICON_REFS,
  Ts as DebugPanel,
  ge as DebugStream,
  Zs as INTERACTION_CLASSES,
  G as LiveListView,
  ot as RegistryLiveListManager,
  Ks as RemoteDebugStream,
  Ye as SqlLiveView,
  yr as appendListRow,
  ir as appendSqlRowDOM,
  xr as applyCustomEventPayload,
  Rr as applyDebugEventToSnapshot,
  ut as applyPanelActionNavigation,
  sr as applyPanelActionPayload,
  Ze as attachCopyListeners,
  et as attachExpandableRowListeners,
  tt as attachRequestDetailListeners,
  me as attachRowExpansion,
  Z as buildEventToPanel,
  S as consoleStyles,
  Vs as copyToClipboard,
  B as countPayload,
  Tr as defaultGetCount,
  Lt as defaultHandleEvent,
  ar as doctorNavigation,
  p as escapeHTML,
  br as evictListOverflow,
  Us as evictSqlOverflow,
  _r as fetchDebugSnapshot,
  Ar as formatDuration,
  Et as formatJSON,
  V as formatNumber,
  yt as formatTimestamp,
  cr as getDebugIconRef,
  Ot as getDefaultPanels,
  Ir as getDefaultToolbarPanels,
  Dr as getLevelClass,
  wt as getPanelCount,
  qr as getPanelData,
  Pt as getPanelEventTypes,
  At as getPanelIcon,
  ve as getPanelLabel,
  H as getSnapshotKey,
  Er as getStatusClass,
  Hs as getStyleConfig,
  Lr as getToolbarCounts,
  vr as hashString,
  qs as initDebugPanel,
  xt as isKnownPanel,
  gr as isSchemaListRenderer,
  vt as isSlowDuration,
  it as jsErrorRowKey,
  Ee as logRowKey,
  pt as logSearchText,
  pr as normalizeEventTypes,
  Ct as normalizeReplCommands,
  kr as panelDefinitionFromServer,
  L as panelRegistry,
  lt as renderCustomPanel,
  dr as renderDebugIcon,
  gt as renderDebugIconRef,
  Ys as renderDoctorPanel,
  tr as renderDoctorPanelCompact,
  dt as renderErrorRow,
  ct as renderJSErrorsPanel,
  bt as renderJSONPanel,
  Sr as renderJSONViewer,
  nt as renderLogRow,
  ft as renderLogsPanel,
  Pr as renderPanelContent,
  nr as renderPermissionsPanel,
  Gs as renderPermissionsPanelCompact,
  ht as renderRequestRow,
  st as renderRequestsPanel,
  at as renderRoutesPanel,
  rt as renderSQLPanel,
  Js as renderSQLRow,
  Qs as renderSQLRowsHTML,
  mr as renderSchemaListRow,
  wr as renderSchemaStatusList,
  $r as renderSchemaTable,
  fr as renderSchemaTimeline,
  Ws as renderSiteRenderCachePanel,
  rr as renderSiteRenderCachePanelCompact,
  St as replPanelIDs,
  Ge as requestRowKey,
  ye as restoreRowExpansion,
  Or as schemaRowKey,
  zs as serializeLogEntry,
  Xs as sqlRowKey,
  er as toolbarStyles,
  Cr as truncate
};

//# sourceMappingURL=index.js.map