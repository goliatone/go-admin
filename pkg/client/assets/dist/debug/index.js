import { escapeHTML as y } from "../shared/html.js";
import { httpRequest as x } from "../shared/transport/http-client.js";
import { t as Q } from "../chunks/sortable.esm-CcMbOE-M.js";
import { E as ze, S as X, T as F, _ as Qe, a as Xe, b as Y, c as G, d as V, f as Z, g as Ye, h as Ge, i as Ve, l as W, m as S, n as Ze, o as We, p as ee, r as et, s as tt, t as te, u as se, v as st, w as rt, x as re, y as ie } from "../chunks/builtin-panels-YWhSaZ1i.js";
import { t as ne } from "../chunks/repl-panel-H6p0-Pf9.js";
import { i as ae, n as at, r as ot, t as lt } from "../chunks/icons-zihLPh2q.js";
import { A as D, C as A, E as ct, F as oe, I as ut, L as dt, M as ft, N as j, P as L, R as le, S as pt, T as he, _ as gt, a as bt, b as yt, c as ce, d as ue, f as M, g as de, h as fe, i as Et, k, l as mt, m as pe, n as ge, o as _, p as St, s as Pt, u as be, v as ye, w as vt, x as I, y as Ee, z as wt } from "../chunks/server-definitions-JppbKFji.js";
var me = class {
  add(t, e, s) {
    if (typeof arguments[0] != "string") for (let r in arguments[0]) this.add(r, arguments[0][r], arguments[1]);
    else (Array.isArray(t) ? t : [t]).forEach(function(r) {
      this[r] = this[r] || [], e && this[r][s ? "unshift" : "push"](e);
    }, this);
  }
  run(t, e) {
    this[t] = this[t] || [], this[t].forEach(function(s) {
      s.call(e && e.context ? e.context : e, e);
    });
  }
}, Se = class {
  constructor(t) {
    this.jsep = t, this.registered = {};
  }
  register() {
    for (var t = arguments.length, e = new Array(t), s = 0; s < t; s++) e[s] = arguments[s];
    e.forEach((r) => {
      if (typeof r != "object" || !r.name || !r.init) throw new Error("Invalid JSEP plugin format");
      this.registered[r.name] || (r.init(this.jsep), this.registered[r.name] = r);
    });
  }
}, P = class a {
  static get version() {
    return "1.4.0";
  }
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + a.version;
  }
  static addUnaryOp(e) {
    return a.max_unop_len = Math.max(e.length, a.max_unop_len), a.unary_ops[e] = 1, a;
  }
  static addBinaryOp(e, s, r) {
    return a.max_binop_len = Math.max(e.length, a.max_binop_len), a.binary_ops[e] = s, r ? a.right_associative.add(e) : a.right_associative.delete(e), a;
  }
  static addIdentifierChar(e) {
    return a.additional_identifier_chars.add(e), a;
  }
  static addLiteral(e, s) {
    return a.literals[e] = s, a;
  }
  static removeUnaryOp(e) {
    return delete a.unary_ops[e], e.length === a.max_unop_len && (a.max_unop_len = a.getMaxKeyLen(a.unary_ops)), a;
  }
  static removeAllUnaryOps() {
    return a.unary_ops = {}, a.max_unop_len = 0, a;
  }
  static removeIdentifierChar(e) {
    return a.additional_identifier_chars.delete(e), a;
  }
  static removeBinaryOp(e) {
    return delete a.binary_ops[e], e.length === a.max_binop_len && (a.max_binop_len = a.getMaxKeyLen(a.binary_ops)), a.right_associative.delete(e), a;
  }
  static removeAllBinaryOps() {
    return a.binary_ops = {}, a.max_binop_len = 0, a;
  }
  static removeLiteral(e) {
    return delete a.literals[e], a;
  }
  static removeAllLiterals() {
    return a.literals = {}, a;
  }
  get char() {
    return this.expr.charAt(this.index);
  }
  get code() {
    return this.expr.charCodeAt(this.index);
  }
  constructor(e) {
    this.expr = e, this.index = 0;
  }
  static parse(e) {
    return new a(e).parse();
  }
  static getMaxKeyLen(e) {
    return Math.max(0, ...Object.keys(e).map((s) => s.length));
  }
  static isDecimalDigit(e) {
    return e >= 48 && e <= 57;
  }
  static binaryPrecedence(e) {
    return a.binary_ops[e] || 0;
  }
  static isIdentifierStart(e) {
    return e >= 65 && e <= 90 || e >= 97 && e <= 122 || e >= 128 && !a.binary_ops[String.fromCharCode(e)] || a.additional_identifier_chars.has(String.fromCharCode(e));
  }
  static isIdentifierPart(e) {
    return a.isIdentifierStart(e) || a.isDecimalDigit(e);
  }
  throwError(e) {
    const s = /* @__PURE__ */ new Error(e + " at character " + this.index);
    throw s.index = this.index, s.description = e, s;
  }
  runHook(e, s) {
    if (a.hooks[e]) {
      const r = {
        context: this,
        node: s
      };
      return a.hooks.run(e, r), r.node;
    }
    return s;
  }
  searchHook(e) {
    if (a.hooks[e]) {
      const s = { context: this };
      return a.hooks[e].find(function(r) {
        return r.call(s.context, s), s.node;
      }), s.node;
    }
  }
  gobbleSpaces() {
    let e = this.code;
    for (; e === a.SPACE_CODE || e === a.TAB_CODE || e === a.LF_CODE || e === a.CR_CODE; ) e = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  parse() {
    this.runHook("before-all");
    const e = this.gobbleExpressions(), s = e.length === 1 ? e[0] : {
      type: a.COMPOUND,
      body: e
    };
    return this.runHook("after-all", s);
  }
  gobbleExpressions(e) {
    let s = [], r, i;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === a.SEMCOL_CODE || r === a.COMMA_CODE) this.index++;
      else if (i = this.gobbleExpression()) s.push(i);
      else if (this.index < this.expr.length) {
        if (r === e) break;
        this.throwError('Unexpected "' + this.char + '"');
      }
    return s;
  }
  gobbleExpression() {
    const e = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    return this.gobbleSpaces(), this.runHook("after-expression", e);
  }
  gobbleBinaryOp() {
    this.gobbleSpaces();
    let e = this.expr.substr(this.index, a.max_binop_len), s = e.length;
    for (; s > 0; ) {
      if (a.binary_ops.hasOwnProperty(e) && (!a.isIdentifierStart(this.code) || this.index + e.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + e.length))))
        return this.index += s, e;
      e = e.substr(0, --s);
    }
    return !1;
  }
  gobbleBinaryExpression() {
    let e, s, r, i, n, o, l, h, c;
    if (o = this.gobbleToken(), !o || (s = this.gobbleBinaryOp(), !s)) return o;
    for (n = {
      value: s,
      prec: a.binaryPrecedence(s),
      right_a: a.right_associative.has(s)
    }, l = this.gobbleToken(), l || this.throwError("Expected expression after " + s), i = [
      o,
      n,
      l
    ]; s = this.gobbleBinaryOp(); ) {
      if (r = a.binaryPrecedence(s), r === 0) {
        this.index -= s.length;
        break;
      }
      n = {
        value: s,
        prec: r,
        right_a: a.right_associative.has(s)
      }, c = s;
      const d = (g) => n.right_a && g.right_a ? r > g.prec : r <= g.prec;
      for (; i.length > 2 && d(i[i.length - 2]); )
        l = i.pop(), s = i.pop().value, o = i.pop(), e = {
          type: a.BINARY_EXP,
          operator: s,
          left: o,
          right: l
        }, i.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + c), i.push(n, e);
    }
    for (h = i.length - 1, e = i[h]; h > 1; )
      e = {
        type: a.BINARY_EXP,
        operator: i[h - 1].value,
        left: i[h - 2],
        right: e
      }, h -= 2;
    return e;
  }
  gobbleToken() {
    let e, s, r, i;
    if (this.gobbleSpaces(), i = this.searchHook("gobble-token"), i) return this.runHook("after-token", i);
    if (e = this.code, a.isDecimalDigit(e) || e === a.PERIOD_CODE) return this.gobbleNumericLiteral();
    if (e === a.SQUOTE_CODE || e === a.DQUOTE_CODE) i = this.gobbleStringLiteral();
    else if (e === a.OBRACK_CODE) i = this.gobbleArray();
    else {
      for (s = this.expr.substr(this.index, a.max_unop_len), r = s.length; r > 0; ) {
        if (a.unary_ops.hasOwnProperty(s) && (!a.isIdentifierStart(this.code) || this.index + s.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + s.length)))) {
          this.index += r;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: a.UNARY_EXP,
            operator: s,
            argument: n,
            prefix: !0
          });
        }
        s = s.substr(0, --r);
      }
      a.isIdentifierStart(e) ? (i = this.gobbleIdentifier(), a.literals.hasOwnProperty(i.name) ? i = {
        type: a.LITERAL,
        value: a.literals[i.name],
        raw: i.name
      } : i.name === a.this_str && (i = { type: a.THIS_EXP })) : e === a.OPAREN_CODE && (i = this.gobbleGroup());
    }
    return i ? (i = this.gobbleTokenProperty(i), this.runHook("after-token", i)) : this.runHook("after-token", !1);
  }
  gobbleTokenProperty(e) {
    this.gobbleSpaces();
    let s = this.code;
    for (; s === a.PERIOD_CODE || s === a.OBRACK_CODE || s === a.OPAREN_CODE || s === a.QUMARK_CODE; ) {
      let r;
      if (s === a.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== a.PERIOD_CODE) break;
        r = !0, this.index += 2, this.gobbleSpaces(), s = this.code;
      }
      this.index++, s === a.OBRACK_CODE ? (e = {
        type: a.MEMBER_EXP,
        computed: !0,
        object: e,
        property: this.gobbleExpression()
      }, e.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), s = this.code, s !== a.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : s === a.OPAREN_CODE ? e = {
        type: a.CALL_EXP,
        arguments: this.gobbleArguments(a.CPAREN_CODE),
        callee: e
      } : (s === a.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), e = {
        type: a.MEMBER_EXP,
        computed: !1,
        object: e,
        property: this.gobbleIdentifier()
      }), r && (e.optional = !0), this.gobbleSpaces(), s = this.code;
    }
    return e;
  }
  gobbleNumericLiteral() {
    let e = "", s, r;
    for (; a.isDecimalDigit(this.code); ) e += this.expr.charAt(this.index++);
    if (this.code === a.PERIOD_CODE)
      for (e += this.expr.charAt(this.index++); a.isDecimalDigit(this.code); ) e += this.expr.charAt(this.index++);
    if (s = this.char, s === "e" || s === "E") {
      for (e += this.expr.charAt(this.index++), s = this.char, (s === "+" || s === "-") && (e += this.expr.charAt(this.index++)); a.isDecimalDigit(this.code); ) e += this.expr.charAt(this.index++);
      a.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + e + this.char + ")");
    }
    return r = this.code, a.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + e + this.char + ")") : (r === a.PERIOD_CODE || e.length === 1 && e.charCodeAt(0) === a.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: a.LITERAL,
      value: parseFloat(e),
      raw: e
    };
  }
  gobbleStringLiteral() {
    let e = "";
    const s = this.index, r = this.expr.charAt(this.index++);
    let i = !1;
    for (; this.index < this.expr.length; ) {
      let n = this.expr.charAt(this.index++);
      if (n === r) {
        i = !0;
        break;
      } else if (n === "\\")
        switch (n = this.expr.charAt(this.index++), n) {
          case "n":
            e += `
`;
            break;
          case "r":
            e += "\r";
            break;
          case "t":
            e += "	";
            break;
          case "b":
            e += "\b";
            break;
          case "f":
            e += "\f";
            break;
          case "v":
            e += "\v";
            break;
          default:
            e += n;
        }
      else e += n;
    }
    return i || this.throwError('Unclosed quote after "' + e + '"'), {
      type: a.LITERAL,
      value: e,
      raw: this.expr.substring(s, this.index)
    };
  }
  gobbleIdentifier() {
    let e = this.code, s = this.index;
    for (a.isIdentifierStart(e) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (e = this.code, a.isIdentifierPart(e)); )
      this.index++;
    return {
      type: a.IDENTIFIER,
      name: this.expr.slice(s, this.index)
    };
  }
  gobbleArguments(e) {
    const s = [];
    let r = !1, i = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === e) {
        r = !0, this.index++, e === a.CPAREN_CODE && i && i >= s.length && this.throwError("Unexpected token " + String.fromCharCode(e));
        break;
      } else if (n === a.COMMA_CODE) {
        if (this.index++, i++, i !== s.length) {
          if (e === a.CPAREN_CODE) this.throwError("Unexpected token ,");
          else if (e === a.CBRACK_CODE) for (let o = s.length; o < i; o++) s.push(null);
        }
      } else if (s.length !== i && i !== 0) this.throwError("Expected comma");
      else {
        const o = this.gobbleExpression();
        (!o || o.type === a.COMPOUND) && this.throwError("Expected comma"), s.push(o);
      }
    }
    return r || this.throwError("Expected " + String.fromCharCode(e)), s;
  }
  gobbleGroup() {
    this.index++;
    let e = this.gobbleExpressions(a.CPAREN_CODE);
    if (this.code === a.CPAREN_CODE)
      return this.index++, e.length === 1 ? e[0] : e.length ? {
        type: a.SEQUENCE_EXP,
        expressions: e
      } : !1;
    this.throwError("Unclosed (");
  }
  gobbleArray() {
    return this.index++, {
      type: a.ARRAY_EXP,
      elements: this.gobbleArguments(a.CBRACK_CODE)
    };
  }
}, Pe = new me();
Object.assign(P, {
  hooks: Pe,
  plugins: new Se(P),
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
P.max_unop_len = P.getMaxKeyLen(P.unary_ops);
P.max_binop_len = P.getMaxKeyLen(P.binary_ops);
var v = (t) => new P(t).parse(), ve = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(P).filter((t) => !ve.includes(t) && v[t] === void 0).forEach((t) => {
  v[t] = P[t];
});
v.Jsep = P;
var we = "ConditionalExpression";
v.plugins.register({
  name: "ternary",
  init(t) {
    t.hooks.add("after-expression", function(s) {
      if (s.node && this.code === t.QUMARK_CODE) {
        this.index++;
        const r = s.node, i = this.gobbleExpression();
        if (i || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === t.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), s.node = {
            type: we,
            test: r,
            consequent: i,
            alternate: n
          }, r.operator && t.binary_ops[r.operator] <= 0.9) {
            let o = r;
            for (; o.right.operator && t.binary_ops[o.right.operator] <= 0.9; ) o = o.right;
            s.node.test = o.right, o.right = s.node, s.node = r;
          }
        } else this.throwError("Expected :");
      }
    });
  }
});
var B = 47, Ae = 92, xe = {
  name: "regex",
  init(t) {
    t.hooks.add("gobble-token", function(s) {
      if (this.code === B) {
        const r = ++this.index;
        let i = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === B && !i) {
            const n = this.expr.slice(r, this.index);
            let o = "";
            for (; ++this.index < this.expr.length; ) {
              const h = this.code;
              if (h >= 97 && h <= 122 || h >= 65 && h <= 90 || h >= 48 && h <= 57) o += this.char;
              else break;
            }
            let l;
            try {
              l = new RegExp(n, o);
            } catch (h) {
              this.throwError(h.message);
            }
            return s.node = {
              type: t.LITERAL,
              value: l,
              raw: this.expr.slice(r - 1, this.index)
            }, s.node = this.gobbleTokenProperty(s.node), s.node;
          }
          this.code === t.OBRACK_CODE ? i = !0 : i && this.code === t.CBRACK_CODE && (i = !1), this.index += this.code === Ae ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, R = 43, C = {
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
  updateOperators: [R, 45],
  assignmentPrecedence: 0.9,
  init(t) {
    const e = [t.IDENTIFIER, t.MEMBER_EXP];
    C.assignmentOperators.forEach((r) => t.addBinaryOp(r, C.assignmentPrecedence, !0)), t.hooks.add("gobble-token", function(i) {
      const n = this.code;
      C.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, i.node = {
        type: "UpdateExpression",
        operator: n === R ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!i.node.argument || !e.includes(i.node.argument.type)) && this.throwError(`Unexpected ${i.node.operator}`));
    }), t.hooks.add("after-token", function(i) {
      if (i.node) {
        const n = this.code;
        C.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (e.includes(i.node.type) || this.throwError(`Unexpected ${i.node.operator}`), this.index += 2, i.node = {
          type: "UpdateExpression",
          operator: n === R ? "++" : "--",
          argument: i.node,
          prefix: !1
        });
      }
    }), t.hooks.add("after-expression", function(i) {
      i.node && s(i.node);
    });
    function s(r) {
      C.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((i) => {
        i && typeof i == "object" && s(i);
      });
    }
  }
};
v.plugins.register(xe, C);
v.addUnaryOp("typeof");
v.addLiteral("null", null);
v.addLiteral("undefined", void 0);
var Ce = /* @__PURE__ */ new Set([
  "constructor",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__"
]), p = {
  evalAst(t, e) {
    switch (t.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return p.evalBinaryExpression(t, e);
      case "Compound":
        return p.evalCompound(t, e);
      case "ConditionalExpression":
        return p.evalConditionalExpression(t, e);
      case "Identifier":
        return p.evalIdentifier(t, e);
      case "Literal":
        return p.evalLiteral(t, e);
      case "MemberExpression":
        return p.evalMemberExpression(t, e);
      case "UnaryExpression":
        return p.evalUnaryExpression(t, e);
      case "ArrayExpression":
        return p.evalArrayExpression(t, e);
      case "CallExpression":
        return p.evalCallExpression(t, e);
      case "AssignmentExpression":
        return p.evalAssignmentExpression(t, e);
      default:
        throw SyntaxError("Unexpected expression", t);
    }
  },
  evalBinaryExpression(t, e) {
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
    }[t.operator](p.evalAst(t.left, e), () => p.evalAst(t.right, e));
  },
  evalCompound(t, e) {
    let s;
    for (let r = 0; r < t.body.length; r++) {
      t.body[r].type === "Identifier" && [
        "var",
        "let",
        "const"
      ].includes(t.body[r].name) && t.body[r + 1] && t.body[r + 1].type === "AssignmentExpression" && (r += 1);
      const i = t.body[r];
      s = p.evalAst(i, e);
    }
    return s;
  },
  evalConditionalExpression(t, e) {
    return p.evalAst(t.test, e) ? p.evalAst(t.consequent, e) : p.evalAst(t.alternate, e);
  },
  evalIdentifier(t, e) {
    if (Object.hasOwn(e, t.name)) return e[t.name];
    throw ReferenceError(`${t.name} is not defined`);
  },
  evalLiteral(t) {
    return t.value;
  },
  evalMemberExpression(t, e) {
    const s = String(t.computed ? p.evalAst(t.property) : t.property.name), r = p.evalAst(t.object, e);
    if (r == null) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    if (!Object.hasOwn(r, s) && Ce.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    const i = r[s];
    return typeof i == "function" ? i.bind(r) : i;
  },
  evalUnaryExpression(t, e) {
    return {
      "-": (s) => -p.evalAst(s, e),
      "!": (s) => !p.evalAst(s, e),
      "~": (s) => ~p.evalAst(s, e),
      "+": (s) => +p.evalAst(s, e),
      typeof: (s) => typeof p.evalAst(s, e)
    }[t.operator](t.argument);
  },
  evalArrayExpression(t, e) {
    return t.elements.map((s) => p.evalAst(s, e));
  },
  evalCallExpression(t, e) {
    const s = t.arguments.map((r) => p.evalAst(r, e));
    return p.evalAst(t.callee, e)(...s);
  },
  evalAssignmentExpression(t, e) {
    if (t.left.type !== "Identifier") throw SyntaxError("Invalid left-hand side in assignment");
    const s = t.left.name;
    return e[s] = p.evalAst(t.right, e), e[s];
  }
}, Oe = class {
  constructor(t) {
    this.code = t, this.ast = v(this.code);
  }
  runInNewContext(t) {
    const e = Object.assign(/* @__PURE__ */ Object.create(null), t);
    return p.evalAst(this.ast, e);
  }
};
function w(t, e) {
  return t = t.slice(), t.push(e), t;
}
function N(t, e) {
  return e = e.slice(), e.unshift(t), e;
}
var Te = class extends Error {
  constructor(t) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = t, this.name = "NewError";
  }
};
function f(t, e, s, r, i) {
  if (!(this instanceof f)) try {
    return new f(t, e, s, r, i);
  } catch (o) {
    if (!o.avoidNew) throw o;
    return o.value;
  }
  typeof t == "string" && (i = r, r = s, s = e, e = t, t = null);
  const n = t && typeof t == "object";
  if (t = t || {}, this.json = t.json || s, this.path = t.path || e, this.resultType = t.resultType || "value", this.flatten = t.flatten || !1, this.wrap = Object.hasOwn(t, "wrap") ? t.wrap : !0, this.sandbox = t.sandbox || {}, this.eval = t.eval === void 0 ? "safe" : t.eval, this.ignoreEvalErrors = typeof t.ignoreEvalErrors > "u" ? !1 : t.ignoreEvalErrors, this.parent = t.parent || null, this.parentProperty = t.parentProperty || null, this.callback = t.callback || r || null, this.otherTypeCallback = t.otherTypeCallback || i || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, t.autostart !== !1) {
    const o = { path: n ? t.path : e };
    n ? "json" in t && (o.json = t.json) : o.json = s;
    const l = this.evaluate(o);
    if (!l || typeof l != "object") throw new Te(l);
    return l;
  }
}
f.prototype.evaluate = function(t, e, s, r) {
  let i = this.parent, n = this.parentProperty, { flatten: o, wrap: l } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, s = s || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, e = e || this.json, t = t || this.path, t && typeof t == "object" && !Array.isArray(t)) {
    if (!t.path && t.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(t, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: e } = t), o = Object.hasOwn(t, "flatten") ? t.flatten : o, this.currResultType = Object.hasOwn(t, "resultType") ? t.resultType : this.currResultType, this.currSandbox = Object.hasOwn(t, "sandbox") ? t.sandbox : this.currSandbox, l = Object.hasOwn(t, "wrap") ? t.wrap : l, this.currEval = Object.hasOwn(t, "eval") ? t.eval : this.currEval, s = Object.hasOwn(t, "callback") ? t.callback : s, this.currOtherTypeCallback = Object.hasOwn(t, "otherTypeCallback") ? t.otherTypeCallback : this.currOtherTypeCallback, i = Object.hasOwn(t, "parent") ? t.parent : i, n = Object.hasOwn(t, "parentProperty") ? t.parentProperty : n, t = t.path;
  }
  if (i = i || null, n = n || null, Array.isArray(t) && (t = f.toPathString(t)), !t && t !== "" || !e) return;
  const h = f.toPathArray(t);
  h[0] === "$" && h.length > 1 && h.shift(), this._hasParentSelector = null;
  const c = this._trace(h, e, ["$"], i, n, s).filter(function(d) {
    return d && !d.isParentSelector;
  });
  return c.length ? !l && c.length === 1 && !c[0].hasArrExpr ? this._getPreferredOutput(c[0]) : c.reduce((d, g) => {
    const E = this._getPreferredOutput(g);
    return o && Array.isArray(E) ? d = d.concat(E) : d.push(E), d;
  }, []) : l ? [] : void 0;
};
f.prototype._getPreferredOutput = function(t) {
  const e = this.currResultType;
  switch (e) {
    case "all": {
      const s = Array.isArray(t.path) ? t.path : f.toPathArray(t.path);
      return t.pointer = f.toPointer(s), t.path = typeof t.path == "string" ? t.path : f.toPathString(t.path), t;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return t[e];
    case "path":
      return f.toPathString(t[e]);
    case "pointer":
      return f.toPointer(t.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
f.prototype._handleCallback = function(t, e, s) {
  if (e) {
    const r = this._getPreferredOutput(t);
    t.path = typeof t.path == "string" ? t.path : f.toPathString(t.path), e(r, s, t);
  }
};
f.prototype._trace = function(t, e, s, r, i, n, o, l) {
  let h;
  if (!t.length)
    return h = {
      path: s,
      value: e,
      parent: r,
      parentProperty: i,
      hasArrExpr: o
    }, this._handleCallback(h, n, "value"), h;
  const c = t[0], d = t.slice(1), g = [];
  function E(u) {
    Array.isArray(u) ? u.forEach((b) => {
      g.push(b);
    }) : g.push(u);
  }
  if ((typeof c != "string" || l) && e && Object.hasOwn(e, c)) E(this._trace(d, e[c], w(s, c), e, c, n, o));
  else if (c === "*") this._walk(e, (u) => {
    E(this._trace(d, e[u], w(s, u), e, u, n, !0, !0));
  });
  else if (c === "..")
    E(this._trace(d, e, s, r, i, n, o)), this._walk(e, (u) => {
      typeof e[u] == "object" && E(this._trace(t.slice(), e[u], w(s, u), e, u, n, !0));
    });
  else {
    if (c === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: d,
        isParentSelector: !0
      };
    if (c === "~")
      return h = {
        path: w(s, c),
        value: i,
        parent: r,
        parentProperty: null
      }, this._handleCallback(h, n, "property"), h;
    if (c === "$") E(this._trace(d, e, s, null, null, n, o));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(c)) E(this._slice(c, d, e, s, r, i, n));
    else if (c.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = c.replace(/^\?\((.*?)\)$/u, "$1"), b = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      b ? this._walk(e, (m) => {
        const O = [b[2]], T = b[1] ? e[m][b[1]] : e[m];
        this._trace(O, T, s, r, i, n, !0).length > 0 && E(this._trace(d, e[m], w(s, m), e, m, n, !0));
      }) : this._walk(e, (m) => {
        this._eval(u, e[m], m, s, r, i) && E(this._trace(d, e[m], w(s, m), e, m, n, !0));
      });
    } else if (c[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      E(this._trace(N(this._eval(c, e, s.at(-1), s.slice(0, -1), r, i), d), e, s, r, i, n, o));
    } else if (c[0] === "@") {
      let u = !1;
      const b = c.slice(1, -2);
      switch (b) {
        case "scalar":
          (!e || !["object", "function"].includes(typeof e)) && (u = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof e === b && (u = !0);
          break;
        case "integer":
          Number.isFinite(e) && !(e % 1) && (u = !0);
          break;
        case "number":
          Number.isFinite(e) && (u = !0);
          break;
        case "nonFinite":
          typeof e == "number" && !Number.isFinite(e) && (u = !0);
          break;
        case "object":
          e && typeof e === b && (u = !0);
          break;
        case "array":
          Array.isArray(e) && (u = !0);
          break;
        case "other":
          u = this.currOtherTypeCallback(e, s, r, i);
          break;
        case "null":
          e === null && (u = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + b);
      }
      if (u)
        return h = {
          path: s,
          value: e,
          parent: r,
          parentProperty: i
        }, this._handleCallback(h, n, "value"), h;
    } else if (c[0] === "`" && e && Object.hasOwn(e, c.slice(1))) {
      const u = c.slice(1);
      E(this._trace(d, e[u], w(s, u), e, u, n, o, !0));
    } else if (c.includes(",")) {
      const u = c.split(",");
      for (const b of u) E(this._trace(N(b, d), e, s, r, i, n, !0));
    } else !l && e && Object.hasOwn(e, c) && E(this._trace(d, e[c], w(s, c), e, c, n, o, !0));
  }
  if (this._hasParentSelector) for (let u = 0; u < g.length; u++) {
    const b = g[u];
    if (b && b.isParentSelector) {
      const m = this._trace(b.expr, e, b.path, r, i, n, o);
      if (Array.isArray(m)) {
        g[u] = m[0];
        const O = m.length;
        for (let T = 1; T < O; T++)
          u++, g.splice(u, 0, m[T]);
      } else g[u] = m;
    }
  }
  return g;
};
f.prototype._walk = function(t, e) {
  if (Array.isArray(t)) {
    const s = t.length;
    for (let r = 0; r < s; r++) e(r);
  } else t && typeof t == "object" && Object.keys(t).forEach((s) => {
    e(s);
  });
};
f.prototype._slice = function(t, e, s, r, i, n, o) {
  if (!Array.isArray(s)) return;
  const l = s.length, h = t.split(":"), c = h[2] && Number.parseInt(h[2]) || 1;
  let d = h[0] && Number.parseInt(h[0]) || 0, g = h[1] && Number.parseInt(h[1]) || l;
  d = d < 0 ? Math.max(0, d + l) : Math.min(l, d), g = g < 0 ? Math.max(0, g + l) : Math.min(l, g);
  const E = [];
  for (let u = d; u < g; u += c) this._trace(N(u, e), s, r, i, n, o, !0).forEach((b) => {
    E.push(b);
  });
  return E;
};
f.prototype._eval = function(t, e, s, r, i, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = i, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const o = t.includes("@path");
  o && (this.currSandbox._$_path = f.toPathString(r.concat([s])));
  const l = this.currEval + "Script:" + t;
  if (!f.cache[l]) {
    let h = t.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (o && (h = h.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) f.cache[l] = new this.safeVm.Script(h);
    else if (this.currEval === "native") f.cache[l] = new this.vm.Script(h);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const c = this.currEval;
      f.cache[l] = new c(h);
    } else if (typeof this.currEval == "function") f.cache[l] = { runInNewContext: (c) => this.currEval(h, c) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return f.cache[l].runInNewContext(this.currSandbox);
  } catch (h) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + h.message + ": " + t);
  }
};
f.cache = {};
f.toPathString = function(t) {
  const e = t, s = e.length;
  let r = "$";
  for (let i = 1; i < s; i++) /^(~|\^|@.*?\(\))$/u.test(e[i]) || (r += /^[0-9*]+$/u.test(e[i]) ? "[" + e[i] + "]" : "['" + e[i] + "']");
  return r;
};
f.toPointer = function(t) {
  const e = t, s = e.length;
  let r = "";
  for (let i = 1; i < s; i++) /^(~|\^|@.*?\(\))$/u.test(e[i]) || (r += "/" + e[i].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
f.toPathArray = function(t) {
  const { cache: e } = f;
  if (e[t]) return e[t].concat();
  const s = [];
  return e[t] = t.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(r, i) {
    return "[#" + (s.push(i) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(r, i) {
    return "['" + i.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(r, i) {
    return ";" + i.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(r) {
    const i = r.match(/#(\d+)/u);
    return !i || !i[1] ? r : s[i[1]];
  }), e[t].concat();
};
f.prototype.safeVm = { Script: Oe };
var De = function(t, e, s) {
  const r = t.length;
  for (let i = 0; i < r; i++) {
    const n = t[i];
    s(n) && e.push(t.splice(i--, 1)[0]);
  }
}, ke = class {
  constructor(t) {
    this.code = t;
  }
  runInNewContext(t) {
    let e = this.code;
    const s = Object.keys(t), r = [];
    De(s, r, (l) => typeof t[l] == "function");
    const i = s.map((l) => t[l]);
    e = r.reduce((l, h) => {
      let c = t[h].toString();
      return /function/u.test(c) || (c = "function " + c), "var " + h + "=" + c + ";" + l;
    }, "") + e, !/(['"])use strict\1/u.test(e) && !s.includes("arguments") && (e = "var arguments = undefined;" + e), e = e.replace(/;\s*$/u, "");
    const n = e.lastIndexOf(";"), o = n !== -1 ? e.slice(0, n + 1) + " return " + e.slice(n + 1) : " return " + e;
    return new Function(...s, o)(...i);
  }
};
f.prototype.vm = { Script: ke };
function Le(t) {
  return t ? !!(t.startsWith("$") || /\[\d+\]/.test(t) || /\[['"]/.test(t) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(t) || t.includes("..") || t.includes("*")) : !1;
}
function _e(t) {
  return t ? t.startsWith("$") ? t : `$.${t}` : "$";
}
function Ie(t, e) {
  if (!t || !e) return [];
  try {
    return (f({
      path: _e(e),
      json: t,
      resultType: "all"
    }) || []).map((s) => ({
      path: s.path || "",
      value: s.value
    }));
  } catch {
    return [];
  }
}
function Re(t, e) {
  if (!e || !t) return t || {};
  const s = Le(e);
  if (console.log("[jsonpath-search] search:", e, "isJsonPath:", s), s) {
    const i = qe(t, e);
    return console.log("[jsonpath-search] JSONPath result:", i), i;
  }
  const r = $e(t, e);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function $e(t, e) {
  const s = e.toLowerCase(), r = {};
  for (const [i, n] of Object.entries(t || {})) i.toLowerCase().includes(s) && (r[i] = n);
  return r;
}
function qe(t, e) {
  const s = Ie(t, e);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: i, value: n } = s[0];
    return i === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [U(i)]: n };
  }
  const r = {};
  for (const { path: i, value: n } of s) {
    const o = U(i) || `result_${Object.keys(r).length}`;
    o in r ? r[`${o}_${Object.keys(r).length}`] = n : r[o] = n;
  }
  return r;
}
function U(t) {
  if (!t) return "";
  const e = t.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e) return e[1];
  const s = t.match(/\.([^.[\]]+)$/);
  return s ? s[1] : t.replace(/^\$\.?/, "");
}
var K = "debug-console-active-panel", J = "debug-console-panel-order", Ne = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, H = (t) => {
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}, Fe = (t) => Array.isArray(t) && t.length > 0 ? t.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : ce(), $ = (t, e) => Re(t, e), je = (t, e, s) => {
  if (!t || !e) return;
  const r = e.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0) return;
  let i = t;
  for (let n = 0; n < r.length - 1; n += 1) {
    const o = r[n];
    (!i[o] || typeof i[o] != "object") && (i[o] = {}), i = i[o];
  }
  i[r[r.length - 1]] = s;
}, q = (t, e) => {
  if (!t) return e;
  const s = Number(t);
  return Number.isNaN(s) ? e : s;
}, Me = class {
  constructor(t) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.container = t;
    const e = Fe(H(t.dataset.panels));
    e.includes("sessions") || e.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(e), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.panelOrderPreferencesPath = t.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = q(t.dataset.maxLogEntries, 500), this.maxSQLQueries = q(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = q(t.dataset.slowThresholdMs, 50), this.replCommands = fe(H(t.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), de.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = _(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.bindActions(), this.updateSessionBanner(), this.stream = new F({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = A.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const t = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder(), await ge(this.debugPath), this.eventToPanel = _(), this.applyPanelOrder(), t && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.panels) for (const s of be(e)) t.add(s);
    this.stream.subscribe(Array.from(t));
  }
  normalizeStoredPanelID(t) {
    const e = typeof t == "string" ? t.trim() : "";
    return e && this.panels.includes(e) ? e : null;
  }
  restoreActivePanel() {
    let t = null;
    try {
      t = this.normalizeStoredPanelID(sessionStorage.getItem(K));
    } catch {
      t = null;
    }
    this.activePanel = t || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(K, this.activePanel);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(J, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const t = this.panelOrderPreferencesPath.trim();
    if (!t) return !1;
    try {
      const e = await x(t, {
        method: "GET",
        credentials: "same-origin"
      });
      if (!e.ok) return !1;
      const s = await e.json();
      return !s?.available || !s.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(s.panel_order), this.savedPanelOrder.length > 0);
    } catch {
      return !1;
    }
  }
  async saveServerPanelOrderPreference(t) {
    const e = this.panelOrderPreferencesPath.trim();
    if (e)
      try {
        await x(e, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: t }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const t = localStorage.getItem(J);
      if (t) {
        const e = JSON.parse(t);
        return this.normalizeSavedPanelOrder(e);
      }
    } catch {
    }
    return null;
  }
  normalizePanelID(t) {
    const e = typeof t == "string" ? t.trim() : "";
    return !e || !Ne.test(e) ? null : e;
  }
  normalizeAvailablePanelIDs(t) {
    if (!Array.isArray(t)) return [];
    const e = [], s = /* @__PURE__ */ new Set();
    for (const r of t) {
      const i = this.normalizePanelID(r);
      !i || s.has(i) || (s.add(i), e.push(i));
    }
    return e;
  }
  normalizeSavedPanelOrder(t) {
    const e = this.normalizeAvailablePanelIDs(t);
    return e.length > 0 ? e : null;
  }
  mergePanelOrder(t, e) {
    const s = this.normalizeAvailablePanelIDs(t);
    if (!e || e.length === 0) return s;
    const r = new Set(s), i = [];
    for (const n of e) r.has(n) && (i.push(n), r.delete(n));
    for (const n of s) r.has(n) && i.push(n);
    return i;
  }
  applyPanelOrder() {
    const t = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = t.length > 0 ? t : this.availablePanels, this.restoreActivePanel();
  }
  initTabDragDrop() {
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = Q.create(this.tabsEl, {
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
        const t = Array.from(this.tabsEl.querySelectorAll("[data-panel]")).map((s) => s.dataset.panel || "").filter(Boolean), e = this.mergePanelOrder(this.availablePanels, t);
        e.length > 0 && (this.savedPanelOrder = e, this.panels = e, this.persistPanelOrder(), this.saveServerPanelOrderPreference(e));
      }
    });
  }
  handleRegistryChange(t) {
    const e = this.normalizePanelID(t.panelId), s = this.activePanel, r = t.type === "unregister" && e === s;
    this.eventToPanel = _(), t.type === "register" ? (e && !this.availablePanels.includes(e) && this.availablePanels.push(e), e && t.panel && t.panel.defaultFilters !== void 0 && !(e in this.customFilterState) && (this.customFilterState[e] = this.cloneFilterState(t.panel.defaultFilters))) : t.type === "unregister" && e && (this.availablePanels = this.availablePanels.filter((n) => n !== e), delete this.customFilterState[e]), this.applyPanelOrder();
    const i = s !== this.activePanel;
    this.subscribeToEvents(), this.renderTabs(), (r || i || e === this.activePanel) && this.renderActivePanel();
  }
  requireElement(t, e = this.container) {
    const s = e.querySelector(t);
    if (!s) throw new Error(`Missing debug element: ${t}`);
    return s;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (t) => {
      const e = t.target;
      if (!e) return;
      const s = e.closest("[data-panel]");
      if (!s) return;
      const r = s.dataset.panel || "";
      !r || r === this.activePanel || (this.activePanel = r, this.persistActivePanel(), this.renderActivePanel());
    }), this.container.addEventListener("click", (t) => {
      const e = t.target?.closest("[data-debug-action]");
      if (!(!e || !this.container.contains(e)))
        switch (e.dataset.debugAction || "") {
          case "snapshot":
            this.stream.requestSnapshot();
            break;
          case "clear":
            this.clearAll();
            break;
          case "pause":
            this.togglePause(e);
            break;
          case "clear-panel":
            this.clearActivePanel();
            break;
          default:
            break;
        }
    }), this.panelEl.addEventListener("click", (t) => {
      const e = t.target;
      if (!e) return;
      const s = e.closest("[data-doctor-action-run]");
      if (!s || s.disabled) return;
      const r = s.dataset.doctorActionRun || "", i = s.dataset.doctorActionConfirm || "", n = s.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(r, i, n);
    });
  }
  renderTabs() {
    const t = this.panels.map((e) => {
      const s = e === this.activePanel ? "debug-tab--active" : "", r = ae(ue(e), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${y(e)}">
            ${r}
            <span class="debug-tab__label">${y(M(e))}</span>
            <span class="debug-tab__count" data-panel-count="${y(e)}">0</span>
          </button>
        `;
    }).join("");
    this.tabsEl.innerHTML = t, this.updateTabCounts(), this.initTabDragDrop();
  }
  renderActivePanel() {
    this.renderTabs(), this.renderFilters(), this.renderPanel();
  }
  renderFilters() {
    const t = this.activePanel;
    let e = "";
    const s = this.panelRenderers.get(t);
    if (s?.filters) e = s.filters();
    else {
      const r = A.get(t);
      if (r?.showFilters === !1) {
        this.filtersEl.innerHTML = '<span class="timestamp">No filters</span>';
        return;
      }
      if (r?.renderFilters) {
        const i = this.getPanelFilterState(t, r), n = r.renderFilters(i);
        this.filtersEl.innerHTML = n || '<span class="timestamp">No filters</span>', n && this.bindFilterInputs();
        return;
      }
    }
    if (!s?.filters && t === "requests") {
      const r = this.filters.requests, i = this.getUniqueContentTypes();
      e = `
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
            ${this.renderSelectOptions(["all", ...i], r.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${y(r.search)}" placeholder="/admin/users" />
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
    } else if (!s?.filters && t === "sql") {
      const r = this.filters.sql;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${y(r.search)}" placeholder="SELECT" />
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
    } else if (!s?.filters && t === "logs") {
      const r = this.filters.logs;
      e = `
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
          <input type="search" data-filter="search" value="${y(r.search)}" placeholder="database" />
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
    } else if (!s?.filters && t === "routes") {
      const r = this.filters.routes;
      e = `
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
          <input type="search" data-filter="search" value="${y(r.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && t === "sessions") {
      const r = this.filters.sessions;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${y(r.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const r = this.filters.objects;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${y(r.search)}" placeholder="user.roles[0].name" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = e || '<span class="timestamp">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((t) => {
      t.addEventListener("input", () => this.updateFiltersFromInputs()), t.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const t = this.activePanel, e = this.filtersEl.querySelectorAll("[data-filter]"), s = A.get(t);
    if (s?.renderFilters) {
      const r = this.getPanelFilterState(t, s), i = r && typeof r == "object" && !Array.isArray(r) ? { ...r } : {};
      e.forEach((n) => {
        const o = n.dataset.filter || "";
        if (!o) return;
        const l = i[o];
        i[o] = this.readFilterInputValue(n, l);
      }), this.customFilterState[t] = i, this.renderPanel();
      return;
    }
    if (t === "requests") {
      const r = { ...this.filters.requests };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "newestFirst" || n === "hasBody" ? r[n] = i.checked : n && n in r && (r[n] = i.value);
      }), this.filters.requests = r;
    } else if (t === "sql") {
      const r = { ...this.filters.sql };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" || n === "newestFirst" ? r[n] = i.checked : n === "search" && (r[n] = i.value);
      }), this.filters.sql = r;
    } else if (t === "logs") {
      const r = { ...this.filters.logs };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "autoScroll" || n === "newestFirst" ? r[n] = i.checked : (n === "level" || n === "search") && (r[n] = i.value);
      }), this.filters.logs = r;
    } else if (t === "routes") {
      const r = { ...this.filters.routes };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in r && (r[n] = i.value);
      }), this.filters.routes = r;
    } else if (t === "sessions") {
      const r = { ...this.filters.sessions };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in r && (r[n] = i.value);
      }), this.filters.sessions = r;
    } else {
      const r = { ...this.filters.objects };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in r && (r[n] = i.value);
      }), this.filters.objects = r;
    }
    this.renderPanel();
  }
  getPanelFilterState(t, e) {
    const s = e || A.get(t);
    return s ? (t in this.customFilterState || (this.customFilterState[t] = s.defaultFilters !== void 0 ? this.cloneFilterState(s.defaultFilters) : {}), this.customFilterState[t]) : {};
  }
  cloneFilterState(t) {
    return Array.isArray(t) ? [...t] : t && typeof t == "object" ? { ...t } : t;
  }
  readFilterInputValue(t, e) {
    if (t instanceof HTMLInputElement && t.type === "checkbox") return t.checked;
    const s = t.value;
    if (typeof e == "number") {
      const r = Number(s);
      return Number.isNaN(r) ? e : r;
    }
    return typeof e == "boolean" ? s === "true" || s === "1" || s.toLowerCase() === "yes" : s;
  }
  renderPanel() {
    const t = this.activePanel, e = this.panelRenderers.get(t);
    if (e) {
      e.render();
      return;
    }
    this.panelEl.classList.remove("debug-content--repl");
    let s = "";
    if (t === "template") s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search);
    else if (t === "session") s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search);
    else if (t === "config") s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search);
    else if (t === "requests") s = this.renderRequests();
    else if (t === "sql") s = this.renderSQL();
    else if (t === "logs") s = this.renderLogs();
    else if (t === "routes") s = this.renderRoutes();
    else if (t === "sessions") s = this.renderSessionsPanel();
    else if (t === "custom") s = this.renderCustom();
    else if (t === "jserrors") s = G(this.state.extra.jserrors || [], S, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const r = A.get(t);
      if (r && (r.renderConsole || r.render)) {
        const i = I(r);
        let n = this.getStateForKey(i);
        if (r.applyFilters) {
          const o = this.getPanelFilterState(t, r);
          n = r.applyFilters(n, o);
        } else if (!r.renderFilters && r.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && n && typeof n == "object" && !Array.isArray(n) && (n = $(n, o));
        }
        s = (r.renderConsole || r.render)(n, S, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(M(t), this.state.extra[t], this.filters.objects.search);
    }
    this.panelEl.innerHTML = s, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), t === "requests" && re(this.panelEl, this.expandedRequests), t === "sql" && this.attachSQLSelectionListeners(), t === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), this.renderStoredPanelActionResult(t);
  }
  attachPanelActionListeners() {
    this.panelEl.querySelectorAll("[data-panel-action-picker]").forEach((t) => {
      const e = () => this.updatePanelActionPicker(t);
      t.addEventListener("change", e), e();
    }), this.panelEl.querySelectorAll("[data-panel-action]").forEach((t) => {
      t.addEventListener("click", () => {
        t.disabled || this.runPanelAction(t, t);
      });
    }), this.panelEl.querySelectorAll("[data-panel-action-form]").forEach((t) => {
      t.addEventListener("submit", (e) => {
        e.preventDefault();
        const s = t.querySelector('button[type="submit"]') || void 0;
        s?.disabled || this.runPanelAction(t, s);
      });
    });
  }
  async runPanelAction(t, e) {
    const s = t.dataset.panelId || "", r = t.dataset.actionId || "";
    if (!this.debugPath || !s || !r) return;
    const i = t.dataset.actionConfirm || "";
    if ((t.dataset.actionRequiresConfirm === "true" || i) && !window.confirm(i || "Run this debug panel action?")) return;
    const n = te(t);
    e && (e.disabled = !0);
    try {
      const o = await x(`${this.debugPath}/api/panels/${encodeURIComponent(s)}/actions/${encodeURIComponent(r)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n)
      });
      if (!o.ok) throw new Error(`Action failed (${o.status})`);
      const l = await o.json();
      this.showPanelActionResult(s, l.ok === !1 ? "error" : "ok", l.message || (l.ok === !1 ? "Action failed" : "Action complete"), r, l.data, l.errors), l.event && this.handleEvent(l.event), l.refresh && await this.fetchSnapshot();
    } catch (o) {
      const l = o instanceof Error ? o.message : "Action failed";
      this.showPanelActionResult(s, "error", l);
    } finally {
      e && (e.disabled = !1);
    }
  }
  showPanelActionResult(t, e, s, r, i, n) {
    this.panelActionResults.set(t, {
      status: e,
      message: s,
      actionID: r,
      data: i,
      errors: n
    }), this.renderStoredPanelActionResult(t);
  }
  renderStoredPanelActionResult(t) {
    const e = this.panelActionResults.get(t);
    if (!e) return;
    this.clearPanelActionErrors();
    const s = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((n) => n.dataset.panelActionResult === t);
    if (!s) return;
    const r = this.renderPanelActionErrors(e.errors, e.actionID), i = e.data === void 0 ? "" : `<pre class="${S.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${y(j(e.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${e.status === "error" ? S.badgeError : S.badge}">${y(e.message)}</div>${r}${i}`;
  }
  updatePanelActionPicker(t) {
    const e = t.closest("[data-panel-action-launcher]");
    if (!e) return;
    const s = t.value || "";
    e.querySelectorAll("[data-panel-action-choice]").forEach((r) => {
      r.hidden = r.dataset.panelActionChoice !== s;
    });
  }
  clearPanelActionErrors() {
    this.panelEl.querySelectorAll("[data-action-field-error]").forEach((t) => {
      t.textContent = "", t.hidden = !0;
    });
  }
  renderPanelActionErrors(t, e) {
    if (!t || typeof t != "object") return "";
    const s = [];
    return Object.entries(t).forEach(([r, i]) => {
      const n = this.stringifyActionError(i);
      if (!n) return;
      const o = r.trim(), l = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((h) => e && h.dataset.actionId !== e ? !1 : h.dataset.actionFieldError === o || h.dataset.actionFieldName === o || h.dataset.actionFieldError === `payload.${o}`);
      if (l) {
        l.textContent = n, l.hidden = !1;
        return;
      }
      s.push(n);
    }), s.length === 0 ? "" : `<ul class="${S.badgeError}" style="margin-top:0.5rem">${s.map((r) => `<li>${y(r)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(t) {
    return typeof t == "string" ? t.trim() : Array.isArray(t) ? t.map((e) => this.stringifyActionError(e)).filter(Boolean).join("; ") : t && typeof t == "object" && typeof t.message == "string" ? (t.message || "").trim() : t == null ? "" : String(t);
  }
  attachExpandableRowListeners() {
    Y(this.panelEl);
  }
  attachCopyButtonListeners() {
    ie(this.panelEl, { useIconFeedback: !0 });
  }
  attachSQLSelectionListeners() {
    X(this.panelEl, this.state.sql, { useIconFeedback: !0 });
  }
  renderReplPanel(t) {
    this.panelEl.classList.add("debug-content--repl");
    let e = this.replPanels.get(t);
    e || (e = new ne({
      kind: t === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: t === "console" ? this.replCommands : []
    }), this.replPanels.set(t, e)), e.attach(this.panelEl);
  }
  getUniqueContentTypes() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.state.requests) {
      const s = e.content_type;
      s && t.add(s.split(";")[0].trim());
    }
    return [...t].sort();
  }
  renderRequests() {
    const { method: t, status: e, search: s, newestFirst: r, hasBody: i, contentType: n } = this.filters.requests, o = s.toLowerCase(), l = this.state.requests.filter((h) => !(t !== "all" && (h.method || "").toUpperCase() !== t || e !== "all" && String(h.status || "") !== e || o && !(h.path || "").toLowerCase().includes(o) || i && !h.request_body || n !== "all" && (h.content_type || "").split(";")[0].trim() !== n));
    return l.length === 0 ? this.renderEmptyState("No requests captured yet.") : ee(l, S, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      truncatePath: !1,
      expandedRequestIds: this.expandedRequests
    });
  }
  renderSQL() {
    const { search: t, slowOnly: e, errorOnly: s, newestFirst: r } = this.filters.sql, i = t.toLowerCase(), n = this.state.sql.filter((o) => !(s && !o.error || e && !this.isSlowQuery(o) || i && !(o.query || "").toLowerCase().includes(i)));
    return n.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : Z(n, S, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  renderLogs() {
    const { level: t, search: e, newestFirst: s } = this.filters.logs, r = e.toLowerCase(), i = this.state.logs.filter((n) => {
      if (t !== "all" && (n.level || "").toLowerCase() !== t) return !1;
      const o = `${n.message || ""} ${n.source || ""} ${j(n.fields || {})}`.toLowerCase();
      return !(r && !o.includes(r));
    });
    return i.length === 0 ? this.renderEmptyState("No logs captured yet.") : V(i, S, {
      newestFirst: s,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1
    });
  }
  renderRoutes() {
    const { method: t, search: e } = this.filters.routes, s = e.toLowerCase(), r = this.state.routes.filter((i) => {
      if (t !== "all" && (i.method || "").toUpperCase() !== t) return !1;
      const n = `${i.path || ""} ${i.handler || ""} ${i.summary || ""}`.toLowerCase();
      return !(s && !n.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : se(r, S, { showName: !0 });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError) return this.renderEmptyState(this.sessionsError);
    const t = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, e = this.filters.sessions.search.trim().toLowerCase();
    let s = [...this.sessions];
    if (e && (s = s.filter((n) => [
      n.username,
      n.user_id,
      n.session_id,
      n.ip,
      n.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(e))), s.sort((n, o) => {
      const l = new Date(n.last_activity || n.started_at || 0).getTime();
      return new Date(o.last_activity || o.started_at || 0).getTime() - l;
    }), this.sessionsLoading && s.length === 0) return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return t === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const r = s.map((n) => {
      const o = n.session_id || "", l = n.username || n.user_id || "Unknown", h = oe(n.last_activity || n.started_at), c = L(n.request_count ?? 0), d = !!o && o === this.activeSessionId, g = d ? "detach" : "attach", E = d ? "Detach" : "Attach", u = d ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", b = d ? "debug-session-row debug-session-row--active" : "debug-session-row", m = n.current_page || "-", O = n.ip || "-";
      return `
          <tr class="${b}">
            <td>
              <div class="debug-session-user">${y(l)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${y(o || "-")}</span>
              </div>
            </td>
            <td>${y(O)}</td>
            <td>
              <span class="debug-session-path">${y(m)}</span>
            </td>
            <td>${y(h || "-")}</td>
            <td>${y(c)}</td>
            <td>
              <button class="${u}" data-session-action="${g}" data-session-id="${y(o)}">
                ${E}
              </button>
            </td>
          </tr>
        `;
    }).join(""), i = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${L(s.length)} active`}</span>
        <div class="debug-session-toolbar__actions">
          <button class="debug-btn" data-session-action="refresh">
            <i class="iconoir-refresh"></i> ${i}
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
    const { search: t } = this.filters.custom, e = Object.keys(this.state.custom.data).length > 0, s = this.state.custom.logs.length > 0;
    return !e && !s ? this.renderEmptyState("No custom data captured yet.") : W(this.state.custom, S, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: t ? (r) => $(r, t) : void 0
    });
  }
  renderJSONPanel(t, e, s) {
    const r = e && typeof e == "object" && !Array.isArray(e), i = Array.isArray(e);
    return r && Object.keys(e || {}).length === 0 || i && (e || []).length === 0 || !r && !i && !e ? this.renderEmptyState(`No ${t.toLowerCase()} data available.`) : he(t, e, S, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (n) => $(n, s) : void 0
    });
  }
  attachSessionActions() {
    this.panelEl.querySelectorAll("[data-session-action]").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.sessionAction || "", s = t.dataset.sessionId || "";
        switch (e) {
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
  async fetchSessions(t = !1) {
    if (this.debugPath && !this.sessionsLoading && !(!t && this.sessionsLoaded && this.sessionsUpdatedAt && Date.now() - this.sessionsUpdatedAt.getTime() < 3e3)) {
      this.sessionsLoading = !0, this.sessionsError = null;
      try {
        const e = await fetch(`${this.debugPath}/api/sessions`, { credentials: "same-origin" });
        if (!e.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const s = await e.json();
        if (this.sessions = Array.isArray(s.sessions) ? s.sessions : [], this.sessionsLoaded = !0, this.sessionsUpdatedAt = /* @__PURE__ */ new Date(), this.activeSessionId) {
          const r = this.sessions.find((i) => i.session_id === this.activeSessionId);
          r && (this.activeSession = r, this.updateSessionBanner());
        }
      } catch {
        this.sessionsError = "Failed to load active sessions.";
      } finally {
        this.sessionsLoading = !1, this.updateTabCounts(), this.activePanel === "sessions" && this.renderPanel();
      }
    }
  }
  attachSessionByID(t) {
    const e = t.trim();
    if (!e || this.activeSessionId === e) return;
    const s = this.sessions.find((r) => r.session_id === e) || { session_id: e };
    this.attachSession(s);
  }
  attachSession(t) {
    const e = (t.session_id || "").trim();
    e && this.activeSessionId !== e && (this.activeSessionId = e, this.activeSession = t, this.streamBasePath = this.buildSessionStreamPath(e), this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("session"), this.renderPanel());
  }
  detachSession() {
    this.activeSessionId && (this.activeSessionId = null, this.activeSession = null, this.streamBasePath = this.debugPath, this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("global"), this.renderPanel());
  }
  rebuildStream(t) {
    this.stream.close(), this.stream = new F({
      basePath: this.streamBasePath,
      onEvent: (e) => this.handleEvent(e),
      onStatusChange: (e) => this.updateConnectionStatus(e)
    }), this.stream.connect(), this.subscribeToEvents(), t === "session" ? this.stream.requestSnapshot() : this.fetchSnapshot();
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
    }, this.expandedRequests.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
  }
  buildSessionStreamPath(t) {
    const e = this.debugPath.replace(/\/+$/, ""), s = encodeURIComponent(t);
    return e ? `${e}/session/${s}` : "";
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
    const t = this.activeSession || this.sessions.find((e) => e.session_id === this.activeSessionId) || { session_id: this.activeSessionId || void 0 };
    return [
      t.username || t.user_id,
      t.session_id,
      t.ip,
      t.current_page
    ].filter(Boolean).join(" | ");
  }
  panelCount(t) {
    if (t !== "sessions") {
      const e = A.get(t);
      if (e) {
        const s = I(e);
        return Ee({ [s]: this.getStateForKey(s) }, e);
      }
    }
    switch (t) {
      case "template":
        return k(this.state.template);
      case "session":
        return k(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return k(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return k(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return k(this.state.extra[t]);
    }
  }
  renderEmptyState(t) {
    return `
      <div class="debug-empty">
        <p>${y(t)}</p>
      </div>
    `;
  }
  renderSelectOptions(t, e) {
    return t.map((s) => {
      const r = s.toLowerCase() === e.toLowerCase() ? "selected" : "";
      return `<option value="${y(s)}" ${r}>${y(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((t) => {
      const e = this.panelCount(t), s = this.tabsEl.querySelector(`[data-panel-count="${t}"]`);
      s && (s.textContent = L(e));
    });
  }
  updateConnectionStatus(t) {
    this.connectionEl.textContent = t, this.statusEl.setAttribute("data-status", t);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${L(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(t) {
    if (!t || !t.type) return;
    if (t.type === "snapshot") {
      this.applySnapshot(t.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused) return;
    const e = this.eventToPanel[t.type] || t.type, s = A.get(e);
    if (s) {
      const r = I(s), i = this.getStateForKey(r), n = (s.handleEvent || ((o, l) => ye(o, l, this.maxLogEntries)))(i, t.payload);
      this.setStateForKey(r, n);
    } else switch (t.type) {
      case "request":
        this.state.requests.push(t.payload), this.trim(this.state.requests, this.maxLogEntries);
        break;
      case "sql":
        this.state.sql.push(t.payload), this.trim(this.state.sql, this.maxSQLQueries);
        break;
      case "log":
        this.state.logs.push(t.payload), this.trim(this.state.logs, this.maxLogEntries);
        break;
      case "template":
        this.state.template = t.payload || {};
        break;
      case "session":
        this.state.session = t.payload || {};
        break;
      case "custom":
        this.handleCustomEvent(t.payload);
        break;
      default:
        pe(e) || (this.state.extra[e] = t.payload);
        break;
    }
    this.updateTabCounts(), e === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(t) {
    if (t) {
      if (typeof t == "object" && "key" in t && "value" in t) {
        je(this.state.custom.data, String(t.key), t.value);
        return;
      }
      if (typeof t == "object" && ("category" in t || "message" in t)) {
        this.state.custom.logs.push(t), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  getStateForKey(t) {
    switch (t) {
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
        return this.state.extra[t];
    }
  }
  setStateForKey(t, e) {
    switch (t) {
      case "template":
        this.state.template = e || {};
        break;
      case "session":
        this.state.session = e || {};
        break;
      case "requests":
        this.state.requests = e || [];
        break;
      case "sql":
        this.state.sql = e || [];
        break;
      case "logs":
        this.state.logs = e || [];
        break;
      case "config":
        this.state.config = e || {};
        break;
      case "routes":
        this.state.routes = e || [];
        break;
      case "custom":
        this.state.custom = e || {
          data: {},
          logs: []
        };
        break;
      default:
        this.state.extra[t] = e;
        break;
    }
  }
  applySnapshot(t) {
    const e = t || {};
    this.state.template = e.template || {}, this.state.session = e.session || {}, this.state.requests = D(e.requests), this.state.sql = D(e.sql), this.state.logs = D(e.logs), this.state.config = e.config || {}, this.state.routes = D(e.routes);
    const s = e.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: D(s.logs)
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
    ]), i = {};
    this.panels.forEach((n) => {
      !r.has(n) && n in e && (i[n] = e[n]);
    }), this.state.extra = i, this.updateTabCounts(), this.renderPanel();
  }
  trim(t, e) {
    if (!(!Array.isArray(t) || e <= 0))
      for (; t.length > e; ) t.shift();
  }
  isSlowQuery(t) {
    return le(t?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.debugPath && !this.activeSessionId)
      try {
        const t = await fetch(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
        if (!t.ok) return;
        const e = await t.json();
        this.applySnapshot(e);
      } catch {
      }
  }
  clearAll() {
    this.debugPath && (this.stream.clear(), !this.activeSessionId && x(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const t = this.activePanel;
    this.stream.clear([t]), !this.activeSessionId && x(`${this.debugPath}/api/clear/${t}`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    });
  }
  async parseJSONResponse(t) {
    if (!(t.headers.get("content-type") || "").toLowerCase().includes("application/json")) return null;
    try {
      const e = await t.json();
      if (e && typeof e == "object") return e;
    } catch {
    }
    return null;
  }
  readResponsePath(t, e) {
    if (!t || !e) return;
    const s = e.split(".").map((i) => i.trim()).filter(Boolean);
    if (s.length === 0) return;
    let r = t;
    for (const i of s) {
      if (!r || typeof r != "object") return;
      r = r[i];
    }
    return r;
  }
  responseMessage(t, e) {
    for (const s of e) {
      const r = this.readResponsePath(t, s);
      if (typeof r == "string" && r.trim()) return r.trim();
    }
    return "";
  }
  showDoctorActionToast(t, e) {
    const s = t.trim();
    if (!s) return;
    window.getComputedStyle(this.container).position === "static" && (this.container.style.position = "relative");
    let r = this.container.querySelector("[data-debug-toast-host]");
    r || (r = document.createElement("div"), r.dataset.debugToastHost = "true", r.style.position = "absolute", r.style.right = "12px", r.style.bottom = "12px", r.style.display = "flex", r.style.flexDirection = "column", r.style.gap = "8px", r.style.pointerEvents = "none", r.style.zIndex = "1000", this.container.appendChild(r));
    const i = e === "success" ? {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.45)",
      color: "#bbf7d0"
    } : {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.45)",
      color: "#fecaca"
    }, n = document.createElement("div");
    n.style.maxWidth = "380px", n.style.padding = "10px 12px", n.style.borderRadius = "8px", n.style.border = `1px solid ${i.border}`, n.style.background = i.bg, n.style.color = i.color, n.style.fontSize = "12px", n.style.lineHeight = "1.4", n.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.25)", n.style.pointerEvents = "auto", n.textContent = s, r.appendChild(n), window.setTimeout(() => {
      n.remove(), r && r.childElementCount === 0 && r.remove();
    }, 4200);
  }
  async runDoctorAction(t, e = "", s = !1) {
    if (!this.debugPath || this.activeSessionId) return;
    const r = t.trim();
    if (!r) return;
    const i = e.trim();
    if (s || i) {
      const n = i || "Are you sure you want to run this doctor action?";
      if (!window.confirm(n)) return;
    }
    try {
      const n = await x(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), o = await this.parseJSONResponse(n);
      if (!n.ok) {
        const h = this.responseMessage(o, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${n.status})`;
        this.showDoctorActionToast(h, "error");
        return;
      }
      const l = this.responseMessage(o, ["message", "result.message"]) || "Doctor action completed.";
      this.showDoctorActionToast(l, "success");
    } catch {
      this.showDoctorActionToast("Doctor action failed: unable to reach debug API.", "error");
    } finally {
      this.stream.requestSnapshot();
    }
  }
  togglePause(t) {
    this.paused = !this.paused, t.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}, Be = (t) => {
  const e = t || document.querySelector("[data-debug-console]");
  return e ? new Me(e) : null;
}, z = () => {
  Be();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", z) : z();
export {
  Qe as DATA_ATTRS,
  lt as DEBUG_ICON_REFS,
  Me as DebugPanel,
  F as DebugStream,
  st as INTERACTION_CLASSES,
  ze as RemoteDebugStream,
  Et as applyCustomEventPayload,
  bt as applyDebugEventToSnapshot,
  ie as attachCopyListeners,
  Y as attachExpandableRowListeners,
  _ as buildEventToPanel,
  S as consoleStyles,
  rt as copyToClipboard,
  k as countPayload,
  gt as defaultGetCount,
  ye as defaultHandleEvent,
  y as escapeHTML,
  Pt as fetchDebugSnapshot,
  ft as formatDuration,
  j as formatJSON,
  L as formatNumber,
  oe as formatTimestamp,
  at as getDebugIconRef,
  ce as getDefaultPanels,
  mt as getDefaultToolbarPanels,
  ut as getLevelClass,
  Ee as getPanelCount,
  yt as getPanelData,
  be as getPanelEventTypes,
  ue as getPanelIcon,
  M as getPanelLabel,
  I as getSnapshotKey,
  dt as getStatusClass,
  Ge as getStyleConfig,
  St as getToolbarCounts,
  Be as initDebugPanel,
  pe as isKnownPanel,
  le as isSlowDuration,
  pt as normalizeEventTypes,
  fe as normalizeReplCommands,
  A as panelRegistry,
  W as renderCustomPanel,
  ot as renderDebugIcon,
  ae as renderDebugIconRef,
  Ve as renderDoctorPanel,
  Xe as renderDoctorPanelCompact,
  he as renderJSONPanel,
  ct as renderJSONViewer,
  V as renderLogsPanel,
  vt as renderPanelContent,
  We as renderPermissionsPanel,
  tt as renderPermissionsPanelCompact,
  ee as renderRequestsPanel,
  se as renderRoutesPanel,
  Z as renderSQLPanel,
  Ze as renderSiteRenderCachePanel,
  et as renderSiteRenderCachePanelCompact,
  de as replPanelIDs,
  Ye as toolbarStyles,
  wt as truncate
};

//# sourceMappingURL=index.js.map