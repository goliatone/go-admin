import { escapeHTML as u } from "../shared/html.js";
import { httpRequest as q, readHTTPErrorResult as He } from "../shared/transport/http-client.js";
import { t as Je } from "../chunks/sortable.esm-CcMbOE-M.js";
import { B as Js, C as Ks, D as Ke, E as ze, F as Ve, I as zs, L as Vs, M as Qe, N as Qs, O as Xe, P as Xs, R as Ys, S as Ws, T as Gs, _ as Ye, a as Zs, b as We, c as Ge, d as Ze, f as et, g as tt, h as st, i as er, j as tr, k as rt, l as nt, m as at, n as sr, o as rr, p as it, r as nr, s as ar, t as ot, u as lt, v as ct, w as ir, x as S, y as dt, z as Ee } from "../chunks/builtin-panels-DipfJKBZ.js";
import { t as ut } from "../chunks/repl-panel-Dvtc4bMw.js";
import { i as ht, n as cr, r as dr, t as ur } from "../chunks/icons-B_VaFfsl.js";
import { A as pr, B, C as fr, D as mr, E as gr, F as yr, G as z, I as br, J as Er, K as pt, L as vr, M as ft, N as Sr, O as wr, P as te, S as V, T as Ar, U as Pr, V as U, W as ve, X as _r, Y as mt, _ as gt, a as xr, b as yt, c as Cr, d as bt, f as Et, g as vt, h as St, i as wt, j as Or, k as $r, l as At, m as Lr, n as Pt, o as kr, p as Se, q as Tr, r as Rr, s as se, u as Dr, v as Ir, w as L, x as qr, y as _t } from "../chunks/server-definitions-Bn3L9Ams.js";
var xt = class {
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
}, Ct = class {
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
}, _ = class l {
  static get version() {
    return "1.4.0";
  }
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + l.version;
  }
  static addUnaryOp(t) {
    return l.max_unop_len = Math.max(t.length, l.max_unop_len), l.unary_ops[t] = 1, l;
  }
  static addBinaryOp(t, s, r) {
    return l.max_binop_len = Math.max(t.length, l.max_binop_len), l.binary_ops[t] = s, r ? l.right_associative.add(t) : l.right_associative.delete(t), l;
  }
  static addIdentifierChar(t) {
    return l.additional_identifier_chars.add(t), l;
  }
  static addLiteral(t, s) {
    return l.literals[t] = s, l;
  }
  static removeUnaryOp(t) {
    return delete l.unary_ops[t], t.length === l.max_unop_len && (l.max_unop_len = l.getMaxKeyLen(l.unary_ops)), l;
  }
  static removeAllUnaryOps() {
    return l.unary_ops = {}, l.max_unop_len = 0, l;
  }
  static removeIdentifierChar(t) {
    return l.additional_identifier_chars.delete(t), l;
  }
  static removeBinaryOp(t) {
    return delete l.binary_ops[t], t.length === l.max_binop_len && (l.max_binop_len = l.getMaxKeyLen(l.binary_ops)), l.right_associative.delete(t), l;
  }
  static removeAllBinaryOps() {
    return l.binary_ops = {}, l.max_binop_len = 0, l;
  }
  static removeLiteral(t) {
    return delete l.literals[t], l;
  }
  static removeAllLiterals() {
    return l.literals = {}, l;
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
    return new l(t).parse();
  }
  static getMaxKeyLen(t) {
    return Math.max(0, ...Object.keys(t).map((s) => s.length));
  }
  static isDecimalDigit(t) {
    return t >= 48 && t <= 57;
  }
  static binaryPrecedence(t) {
    return l.binary_ops[t] || 0;
  }
  static isIdentifierStart(t) {
    return t >= 65 && t <= 90 || t >= 97 && t <= 122 || t >= 128 && !l.binary_ops[String.fromCharCode(t)] || l.additional_identifier_chars.has(String.fromCharCode(t));
  }
  static isIdentifierPart(t) {
    return l.isIdentifierStart(t) || l.isDecimalDigit(t);
  }
  throwError(t) {
    const s = /* @__PURE__ */ new Error(t + " at character " + this.index);
    throw s.index = this.index, s.description = t, s;
  }
  runHook(t, s) {
    if (l.hooks[t]) {
      const r = {
        context: this,
        node: s
      };
      return l.hooks.run(t, r), r.node;
    }
    return s;
  }
  searchHook(t) {
    if (l.hooks[t]) {
      const s = { context: this };
      return l.hooks[t].find(function(r) {
        return r.call(s.context, s), s.node;
      }), s.node;
    }
  }
  gobbleSpaces() {
    let t = this.code;
    for (; t === l.SPACE_CODE || t === l.TAB_CODE || t === l.LF_CODE || t === l.CR_CODE; ) t = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  parse() {
    this.runHook("before-all");
    const t = this.gobbleExpressions(), s = t.length === 1 ? t[0] : {
      type: l.COMPOUND,
      body: t
    };
    return this.runHook("after-all", s);
  }
  gobbleExpressions(t) {
    let s = [], r, n;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === l.SEMCOL_CODE || r === l.COMMA_CODE) this.index++;
      else if (n = this.gobbleExpression()) s.push(n);
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
    let t = this.expr.substr(this.index, l.max_binop_len), s = t.length;
    for (; s > 0; ) {
      if (l.binary_ops.hasOwnProperty(t) && (!l.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !l.isIdentifierPart(this.expr.charCodeAt(this.index + t.length))))
        return this.index += s, t;
      t = t.substr(0, --s);
    }
    return !1;
  }
  gobbleBinaryExpression() {
    let t, s, r, n, a, i, o, d, c;
    if (i = this.gobbleToken(), !i || (s = this.gobbleBinaryOp(), !s)) return i;
    for (a = {
      value: s,
      prec: l.binaryPrecedence(s),
      right_a: l.right_associative.has(s)
    }, o = this.gobbleToken(), o || this.throwError("Expected expression after " + s), n = [
      i,
      a,
      o
    ]; s = this.gobbleBinaryOp(); ) {
      if (r = l.binaryPrecedence(s), r === 0) {
        this.index -= s.length;
        break;
      }
      a = {
        value: s,
        prec: r,
        right_a: l.right_associative.has(s)
      }, c = s;
      const f = (y) => a.right_a && y.right_a ? r > y.prec : r <= y.prec;
      for (; n.length > 2 && f(n[n.length - 2]); )
        o = n.pop(), s = n.pop().value, i = n.pop(), t = {
          type: l.BINARY_EXP,
          operator: s,
          left: i,
          right: o
        }, n.push(t);
      t = this.gobbleToken(), t || this.throwError("Expected expression after " + c), n.push(a, t);
    }
    for (d = n.length - 1, t = n[d]; d > 1; )
      t = {
        type: l.BINARY_EXP,
        operator: n[d - 1].value,
        left: n[d - 2],
        right: t
      }, d -= 2;
    return t;
  }
  gobbleToken() {
    let t, s, r, n;
    if (this.gobbleSpaces(), n = this.searchHook("gobble-token"), n) return this.runHook("after-token", n);
    if (t = this.code, l.isDecimalDigit(t) || t === l.PERIOD_CODE) return this.gobbleNumericLiteral();
    if (t === l.SQUOTE_CODE || t === l.DQUOTE_CODE) n = this.gobbleStringLiteral();
    else if (t === l.OBRACK_CODE) n = this.gobbleArray();
    else {
      for (s = this.expr.substr(this.index, l.max_unop_len), r = s.length; r > 0; ) {
        if (l.unary_ops.hasOwnProperty(s) && (!l.isIdentifierStart(this.code) || this.index + s.length < this.expr.length && !l.isIdentifierPart(this.expr.charCodeAt(this.index + s.length)))) {
          this.index += r;
          const a = this.gobbleToken();
          return a || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: l.UNARY_EXP,
            operator: s,
            argument: a,
            prefix: !0
          });
        }
        s = s.substr(0, --r);
      }
      l.isIdentifierStart(t) ? (n = this.gobbleIdentifier(), l.literals.hasOwnProperty(n.name) ? n = {
        type: l.LITERAL,
        value: l.literals[n.name],
        raw: n.name
      } : n.name === l.this_str && (n = { type: l.THIS_EXP })) : t === l.OPAREN_CODE && (n = this.gobbleGroup());
    }
    return n ? (n = this.gobbleTokenProperty(n), this.runHook("after-token", n)) : this.runHook("after-token", !1);
  }
  gobbleTokenProperty(t) {
    this.gobbleSpaces();
    let s = this.code;
    for (; s === l.PERIOD_CODE || s === l.OBRACK_CODE || s === l.OPAREN_CODE || s === l.QUMARK_CODE; ) {
      let r;
      if (s === l.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== l.PERIOD_CODE) break;
        r = !0, this.index += 2, this.gobbleSpaces(), s = this.code;
      }
      this.index++, s === l.OBRACK_CODE ? (t = {
        type: l.MEMBER_EXP,
        computed: !0,
        object: t,
        property: this.gobbleExpression()
      }, t.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), s = this.code, s !== l.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : s === l.OPAREN_CODE ? t = {
        type: l.CALL_EXP,
        arguments: this.gobbleArguments(l.CPAREN_CODE),
        callee: t
      } : (s === l.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), t = {
        type: l.MEMBER_EXP,
        computed: !1,
        object: t,
        property: this.gobbleIdentifier()
      }), r && (t.optional = !0), this.gobbleSpaces(), s = this.code;
    }
    return t;
  }
  gobbleNumericLiteral() {
    let t = "", s, r;
    for (; l.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
    if (this.code === l.PERIOD_CODE)
      for (t += this.expr.charAt(this.index++); l.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
    if (s = this.char, s === "e" || s === "E") {
      for (t += this.expr.charAt(this.index++), s = this.char, (s === "+" || s === "-") && (t += this.expr.charAt(this.index++)); l.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
      l.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + t + this.char + ")");
    }
    return r = this.code, l.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + t + this.char + ")") : (r === l.PERIOD_CODE || t.length === 1 && t.charCodeAt(0) === l.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: l.LITERAL,
      value: parseFloat(t),
      raw: t
    };
  }
  gobbleStringLiteral() {
    let t = "";
    const s = this.index, r = this.expr.charAt(this.index++);
    let n = !1;
    for (; this.index < this.expr.length; ) {
      let a = this.expr.charAt(this.index++);
      if (a === r) {
        n = !0;
        break;
      } else if (a === "\\")
        switch (a = this.expr.charAt(this.index++), a) {
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
            t += a;
        }
      else t += a;
    }
    return n || this.throwError('Unclosed quote after "' + t + '"'), {
      type: l.LITERAL,
      value: t,
      raw: this.expr.substring(s, this.index)
    };
  }
  gobbleIdentifier() {
    let t = this.code, s = this.index;
    for (l.isIdentifierStart(t) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (t = this.code, l.isIdentifierPart(t)); )
      this.index++;
    return {
      type: l.IDENTIFIER,
      name: this.expr.slice(s, this.index)
    };
  }
  gobbleArguments(t) {
    const s = [];
    let r = !1, n = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let a = this.code;
      if (a === t) {
        r = !0, this.index++, t === l.CPAREN_CODE && n && n >= s.length && this.throwError("Unexpected token " + String.fromCharCode(t));
        break;
      } else if (a === l.COMMA_CODE) {
        if (this.index++, n++, n !== s.length) {
          if (t === l.CPAREN_CODE) this.throwError("Unexpected token ,");
          else if (t === l.CBRACK_CODE) for (let i = s.length; i < n; i++) s.push(null);
        }
      } else if (s.length !== n && n !== 0) this.throwError("Expected comma");
      else {
        const i = this.gobbleExpression();
        (!i || i.type === l.COMPOUND) && this.throwError("Expected comma"), s.push(i);
      }
    }
    return r || this.throwError("Expected " + String.fromCharCode(t)), s;
  }
  gobbleGroup() {
    this.index++;
    let t = this.gobbleExpressions(l.CPAREN_CODE);
    if (this.code === l.CPAREN_CODE)
      return this.index++, t.length === 1 ? t[0] : t.length ? {
        type: l.SEQUENCE_EXP,
        expressions: t
      } : !1;
    this.throwError("Unclosed (");
  }
  gobbleArray() {
    return this.index++, {
      type: l.ARRAY_EXP,
      elements: this.gobbleArguments(l.CBRACK_CODE)
    };
  }
}, Ot = new xt();
Object.assign(_, {
  hooks: Ot,
  plugins: new Ct(_),
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
_.max_unop_len = _.getMaxKeyLen(_.unary_ops);
_.max_binop_len = _.getMaxKeyLen(_.binary_ops);
var O = (e) => new _(e).parse(), $t = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(_).filter((e) => !$t.includes(e) && O[e] === void 0).forEach((e) => {
  O[e] = _[e];
});
O.Jsep = _;
var Lt = "ConditionalExpression";
O.plugins.register({
  name: "ternary",
  init(e) {
    e.hooks.add("after-expression", function(s) {
      if (s.node && this.code === e.QUMARK_CODE) {
        this.index++;
        const r = s.node, n = this.gobbleExpression();
        if (n || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === e.COLON_CODE) {
          this.index++;
          const a = this.gobbleExpression();
          if (a || this.throwError("Expected expression"), s.node = {
            type: Lt,
            test: r,
            consequent: n,
            alternate: a
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
var we = 47, kt = 92, Tt = {
  name: "regex",
  init(e) {
    e.hooks.add("gobble-token", function(s) {
      if (this.code === we) {
        const r = ++this.index;
        let n = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === we && !n) {
            const a = this.expr.slice(r, this.index);
            let i = "";
            for (; ++this.index < this.expr.length; ) {
              const d = this.code;
              if (d >= 97 && d <= 122 || d >= 65 && d <= 90 || d >= 48 && d <= 57) i += this.char;
              else break;
            }
            let o;
            try {
              o = new RegExp(a, i);
            } catch (d) {
              this.throwError(d.message);
            }
            return s.node = {
              type: e.LITERAL,
              value: o,
              raw: this.expr.slice(r - 1, this.index)
            }, s.node = this.gobbleTokenProperty(s.node), s.node;
          }
          this.code === e.OBRACK_CODE ? n = !0 : n && this.code === e.CBRACK_CODE && (n = !1), this.index += this.code === kt ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, re = 43, M = {
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
  updateOperators: [re, 45],
  assignmentPrecedence: 0.9,
  init(e) {
    const t = [e.IDENTIFIER, e.MEMBER_EXP];
    M.assignmentOperators.forEach((r) => e.addBinaryOp(r, M.assignmentPrecedence, !0)), e.hooks.add("gobble-token", function(n) {
      const a = this.code;
      M.updateOperators.some((i) => i === a && i === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, n.node = {
        type: "UpdateExpression",
        operator: a === re ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!n.node.argument || !t.includes(n.node.argument.type)) && this.throwError(`Unexpected ${n.node.operator}`));
    }), e.hooks.add("after-token", function(n) {
      if (n.node) {
        const a = this.code;
        M.updateOperators.some((i) => i === a && i === this.expr.charCodeAt(this.index + 1)) && (t.includes(n.node.type) || this.throwError(`Unexpected ${n.node.operator}`), this.index += 2, n.node = {
          type: "UpdateExpression",
          operator: a === re ? "++" : "--",
          argument: n.node,
          prefix: !1
        });
      }
    }), e.hooks.add("after-expression", function(n) {
      n.node && s(n.node);
    });
    function s(r) {
      M.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((n) => {
        n && typeof n == "object" && s(n);
      });
    }
  }
};
O.plugins.register(Tt, M);
O.addUnaryOp("typeof");
O.addLiteral("null", null);
O.addLiteral("undefined", void 0);
var Rt = /* @__PURE__ */ new Set([
  "constructor",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__"
]), v = {
  evalAst(e, t) {
    switch (e.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return v.evalBinaryExpression(e, t);
      case "Compound":
        return v.evalCompound(e, t);
      case "ConditionalExpression":
        return v.evalConditionalExpression(e, t);
      case "Identifier":
        return v.evalIdentifier(e, t);
      case "Literal":
        return v.evalLiteral(e, t);
      case "MemberExpression":
        return v.evalMemberExpression(e, t);
      case "UnaryExpression":
        return v.evalUnaryExpression(e, t);
      case "ArrayExpression":
        return v.evalArrayExpression(e, t);
      case "CallExpression":
        return v.evalCallExpression(e, t);
      case "AssignmentExpression":
        return v.evalAssignmentExpression(e, t);
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
    }[e.operator](v.evalAst(e.left, t), () => v.evalAst(e.right, t));
  },
  evalCompound(e, t) {
    let s;
    for (let r = 0; r < e.body.length; r++) {
      e.body[r].type === "Identifier" && [
        "var",
        "let",
        "const"
      ].includes(e.body[r].name) && e.body[r + 1] && e.body[r + 1].type === "AssignmentExpression" && (r += 1);
      const n = e.body[r];
      s = v.evalAst(n, t);
    }
    return s;
  },
  evalConditionalExpression(e, t) {
    return v.evalAst(e.test, t) ? v.evalAst(e.consequent, t) : v.evalAst(e.alternate, t);
  },
  evalIdentifier(e, t) {
    if (Object.hasOwn(t, e.name)) return t[e.name];
    throw ReferenceError(`${e.name} is not defined`);
  },
  evalLiteral(e) {
    return e.value;
  },
  evalMemberExpression(e, t) {
    const s = String(e.computed ? v.evalAst(e.property) : e.property.name), r = v.evalAst(e.object, t);
    if (r == null) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    if (!Object.hasOwn(r, s) && Rt.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    const n = r[s];
    return typeof n == "function" ? n.bind(r) : n;
  },
  evalUnaryExpression(e, t) {
    return {
      "-": (s) => -v.evalAst(s, t),
      "!": (s) => !v.evalAst(s, t),
      "~": (s) => ~v.evalAst(s, t),
      "+": (s) => +v.evalAst(s, t),
      typeof: (s) => typeof v.evalAst(s, t)
    }[e.operator](e.argument);
  },
  evalArrayExpression(e, t) {
    return e.elements.map((s) => v.evalAst(s, t));
  },
  evalCallExpression(e, t) {
    const s = e.arguments.map((r) => v.evalAst(r, t));
    return v.evalAst(e.callee, t)(...s);
  },
  evalAssignmentExpression(e, t) {
    if (e.left.type !== "Identifier") throw SyntaxError("Invalid left-hand side in assignment");
    const s = e.left.name;
    return t[s] = v.evalAst(e.right, t), t[s];
  }
}, Dt = class {
  constructor(e) {
    this.code = e, this.ast = O(this.code);
  }
  runInNewContext(e) {
    const t = Object.assign(/* @__PURE__ */ Object.create(null), e);
    return v.evalAst(this.ast, t);
  }
};
function k(e, t) {
  return e = e.slice(), e.push(t), e;
}
function ce(e, t) {
  return t = t.slice(), t.unshift(e), t;
}
var It = class extends Error {
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
};
function b(e, t, s, r, n) {
  if (!(this instanceof b)) try {
    return new b(e, t, s, r, n);
  } catch (i) {
    if (!i.avoidNew) throw i;
    return i.value;
  }
  typeof e == "string" && (n = r, r = s, s = t, t = e, e = null);
  const a = e && typeof e == "object";
  if (e = e || {}, this.json = e.json || s, this.path = e.path || t, this.resultType = e.resultType || "value", this.flatten = e.flatten || !1, this.wrap = Object.hasOwn(e, "wrap") ? e.wrap : !0, this.sandbox = e.sandbox || {}, this.eval = e.eval === void 0 ? "safe" : e.eval, this.ignoreEvalErrors = typeof e.ignoreEvalErrors > "u" ? !1 : e.ignoreEvalErrors, this.parent = e.parent || null, this.parentProperty = e.parentProperty || null, this.callback = e.callback || r || null, this.otherTypeCallback = e.otherTypeCallback || n || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, e.autostart !== !1) {
    const i = { path: a ? e.path : t };
    a ? "json" in e && (i.json = e.json) : i.json = s;
    const o = this.evaluate(i);
    if (!o || typeof o != "object") throw new It(o);
    return o;
  }
}
b.prototype.evaluate = function(e, t, s, r) {
  let n = this.parent, a = this.parentProperty, { flatten: i, wrap: o } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, s = s || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, t = t || this.json, e = e || this.path, e && typeof e == "object" && !Array.isArray(e)) {
    if (!e.path && e.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(e, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: t } = e), i = Object.hasOwn(e, "flatten") ? e.flatten : i, this.currResultType = Object.hasOwn(e, "resultType") ? e.resultType : this.currResultType, this.currSandbox = Object.hasOwn(e, "sandbox") ? e.sandbox : this.currSandbox, o = Object.hasOwn(e, "wrap") ? e.wrap : o, this.currEval = Object.hasOwn(e, "eval") ? e.eval : this.currEval, s = Object.hasOwn(e, "callback") ? e.callback : s, this.currOtherTypeCallback = Object.hasOwn(e, "otherTypeCallback") ? e.otherTypeCallback : this.currOtherTypeCallback, n = Object.hasOwn(e, "parent") ? e.parent : n, a = Object.hasOwn(e, "parentProperty") ? e.parentProperty : a, e = e.path;
  }
  if (n = n || null, a = a || null, Array.isArray(e) && (e = b.toPathString(e)), !e && e !== "" || !t) return;
  const d = b.toPathArray(e);
  d[0] === "$" && d.length > 1 && d.shift(), this._hasParentSelector = null;
  const c = this._trace(d, t, ["$"], n, a, s).filter(function(f) {
    return f && !f.isParentSelector;
  });
  return c.length ? !o && c.length === 1 && !c[0].hasArrExpr ? this._getPreferredOutput(c[0]) : c.reduce((f, y) => {
    const h = this._getPreferredOutput(y);
    return i && Array.isArray(h) ? f = f.concat(h) : f.push(h), f;
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
b.prototype._trace = function(e, t, s, r, n, a, i, o) {
  let d;
  if (!e.length)
    return d = {
      path: s,
      value: t,
      parent: r,
      parentProperty: n,
      hasArrExpr: i
    }, this._handleCallback(d, a, "value"), d;
  const c = e[0], f = e.slice(1), y = [];
  function h(p) {
    Array.isArray(p) ? p.forEach((g) => {
      y.push(g);
    }) : y.push(p);
  }
  if ((typeof c != "string" || o) && t && Object.hasOwn(t, c)) h(this._trace(f, t[c], k(s, c), t, c, a, i));
  else if (c === "*") this._walk(t, (p) => {
    h(this._trace(f, t[p], k(s, p), t, p, a, !0, !0));
  });
  else if (c === "..")
    h(this._trace(f, t, s, r, n, a, i)), this._walk(t, (p) => {
      typeof t[p] == "object" && h(this._trace(e.slice(), t[p], k(s, p), t, p, a, !0));
    });
  else {
    if (c === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: f,
        isParentSelector: !0
      };
    if (c === "~")
      return d = {
        path: k(s, c),
        value: n,
        parent: r,
        parentProperty: null
      }, this._handleCallback(d, a, "property"), d;
    if (c === "$") h(this._trace(f, t, s, null, null, a, i));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(c)) h(this._slice(c, f, t, s, r, n, a));
    else if (c.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const p = c.replace(/^\?\((.*?)\)$/u, "$1"), g = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(p);
      g ? this._walk(t, (E) => {
        const w = [g[2]], x = g[1] ? t[E][g[1]] : t[E];
        this._trace(w, x, s, r, n, a, !0).length > 0 && h(this._trace(f, t[E], k(s, E), t, E, a, !0));
      }) : this._walk(t, (E) => {
        this._eval(p, t[E], E, s, r, n) && h(this._trace(f, t[E], k(s, E), t, E, a, !0));
      });
    } else if (c[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      h(this._trace(ce(this._eval(c, t, s.at(-1), s.slice(0, -1), r, n), f), t, s, r, n, a, i));
    } else if (c[0] === "@") {
      let p = !1;
      const g = c.slice(1, -2);
      switch (g) {
        case "scalar":
          (!t || !["object", "function"].includes(typeof t)) && (p = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof t === g && (p = !0);
          break;
        case "integer":
          Number.isFinite(t) && !(t % 1) && (p = !0);
          break;
        case "number":
          Number.isFinite(t) && (p = !0);
          break;
        case "nonFinite":
          typeof t == "number" && !Number.isFinite(t) && (p = !0);
          break;
        case "object":
          t && typeof t === g && (p = !0);
          break;
        case "array":
          Array.isArray(t) && (p = !0);
          break;
        case "other":
          p = this.currOtherTypeCallback(t, s, r, n);
          break;
        case "null":
          t === null && (p = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + g);
      }
      if (p)
        return d = {
          path: s,
          value: t,
          parent: r,
          parentProperty: n
        }, this._handleCallback(d, a, "value"), d;
    } else if (c[0] === "`" && t && Object.hasOwn(t, c.slice(1))) {
      const p = c.slice(1);
      h(this._trace(f, t[p], k(s, p), t, p, a, i, !0));
    } else if (c.includes(",")) {
      const p = c.split(",");
      for (const g of p) h(this._trace(ce(g, f), t, s, r, n, a, !0));
    } else !o && t && Object.hasOwn(t, c) && h(this._trace(f, t[c], k(s, c), t, c, a, i, !0));
  }
  if (this._hasParentSelector) for (let p = 0; p < y.length; p++) {
    const g = y[p];
    if (g && g.isParentSelector) {
      const E = this._trace(g.expr, t, g.path, r, n, a, i);
      if (Array.isArray(E)) {
        y[p] = E[0];
        const w = E.length;
        for (let x = 1; x < w; x++)
          p++, y.splice(p, 0, E[x]);
      } else y[p] = E;
    }
  }
  return y;
};
b.prototype._walk = function(e, t) {
  if (Array.isArray(e)) {
    const s = e.length;
    for (let r = 0; r < s; r++) t(r);
  } else e && typeof e == "object" && Object.keys(e).forEach((s) => {
    t(s);
  });
};
b.prototype._slice = function(e, t, s, r, n, a, i) {
  if (!Array.isArray(s)) return;
  const o = s.length, d = e.split(":"), c = d[2] && Number.parseInt(d[2]) || 1;
  let f = d[0] && Number.parseInt(d[0]) || 0, y = d[1] && Number.parseInt(d[1]) || o;
  f = f < 0 ? Math.max(0, f + o) : Math.min(o, f), y = y < 0 ? Math.max(0, y + o) : Math.min(o, y);
  const h = [];
  for (let p = f; p < y; p += c) this._trace(ce(p, t), s, r, n, a, i, !0).forEach((g) => {
    h.push(g);
  });
  return h;
};
b.prototype._eval = function(e, t, s, r, n, a) {
  this.currSandbox._$_parentProperty = a, this.currSandbox._$_parent = n, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
  const i = e.includes("@path");
  i && (this.currSandbox._$_path = b.toPathString(r.concat([s])));
  const o = this.currEval + "Script:" + e;
  if (!b.cache[o]) {
    let d = e.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (i && (d = d.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) b.cache[o] = new this.safeVm.Script(d);
    else if (this.currEval === "native") b.cache[o] = new this.vm.Script(d);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const c = this.currEval;
      b.cache[o] = new c(d);
    } else if (typeof this.currEval == "function") b.cache[o] = { runInNewContext: (c) => this.currEval(d, c) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return b.cache[o].runInNewContext(this.currSandbox);
  } catch (d) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + d.message + ": " + e);
  }
};
b.cache = {};
b.toPathString = function(e) {
  const t = e, s = t.length;
  let r = "$";
  for (let n = 1; n < s; n++) /^(~|\^|@.*?\(\))$/u.test(t[n]) || (r += /^[0-9*]+$/u.test(t[n]) ? "[" + t[n] + "]" : "['" + t[n] + "']");
  return r;
};
b.toPointer = function(e) {
  const t = e, s = t.length;
  let r = "";
  for (let n = 1; n < s; n++) /^(~|\^|@.*?\(\))$/u.test(t[n]) || (r += "/" + t[n].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
b.toPathArray = function(e) {
  const { cache: t } = b;
  if (t[e]) return t[e].concat();
  const s = [];
  return t[e] = e.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(r, n) {
    return "[#" + (s.push(n) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(r, n) {
    return "['" + n.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(r, n) {
    return ";" + n.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(r) {
    const n = r.match(/#(\d+)/u);
    return !n || !n[1] ? r : s[n[1]];
  }), t[e].concat();
};
b.prototype.safeVm = { Script: Dt };
var qt = function(e, t, s) {
  const r = e.length;
  for (let n = 0; n < r; n++) {
    const a = e[n];
    s(a) && t.push(e.splice(n--, 1)[0]);
  }
}, Mt = class {
  constructor(e) {
    this.code = e;
  }
  runInNewContext(e) {
    let t = this.code;
    const s = Object.keys(e), r = [];
    qt(s, r, (o) => typeof e[o] == "function");
    const n = s.map((o) => e[o]);
    t = r.reduce((o, d) => {
      let c = e[d].toString();
      return /function/u.test(c) || (c = "function " + c), "var " + d + "=" + c + ";" + o;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const a = t.lastIndexOf(";"), i = a !== -1 ? t.slice(0, a + 1) + " return " + t.slice(a + 1) : " return " + t;
    return new Function(...s, i)(...n);
  }
};
b.prototype.vm = { Script: Mt };
function jt(e) {
  return e ? !!(e.startsWith("$") || /\[\d+\]/.test(e) || /\[['"]/.test(e) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(e) || e.includes("..") || e.includes("*")) : !1;
}
function Ft(e) {
  return e ? e.startsWith("$") ? e : `$.${e}` : "$";
}
function Nt(e, t) {
  if (!e || !t) return [];
  try {
    return (b({
      path: Ft(t),
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
function Bt(e, t) {
  if (!t || !e) return e || {};
  const s = jt(t);
  if (console.log("[jsonpath-search] search:", t, "isJsonPath:", s), s) {
    const n = Ht(e, t);
    return console.log("[jsonpath-search] JSONPath result:", n), n;
  }
  const r = Ut(e, t);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function Ut(e, t) {
  const s = t.toLowerCase(), r = {};
  for (const [n, a] of Object.entries(e || {})) n.toLowerCase().includes(s) && (r[n] = a);
  return r;
}
function Ht(e, t) {
  const s = Nt(e, t);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: n, value: a } = s[0];
    return n === "$" && typeof a == "object" && a !== null || typeof a == "object" && a !== null && !Array.isArray(a) ? a : { [Ae(n)]: a };
  }
  const r = {};
  for (const { path: n, value: a } of s) {
    const i = Ae(n) || `result_${Object.keys(r).length}`;
    i in r ? r[`${i}_${Object.keys(r).length}`] = a : r[i] = a;
  }
  return r;
}
function Ae(e) {
  if (!e) return "";
  const t = e.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (t) return t[1];
  const s = e.match(/\.([^.[\]]+)$/);
  return s ? s[1] : e.replace(/^\$\.?/, "");
}
var G = "commands", W = "", Q = "", me = /* @__PURE__ */ new Map(), R = 0, Pe = 230, ge = 180, Jt = 640, Kt = 280, _e = 24, je = "cmdl:sidebar-width", de = /* @__PURE__ */ new Map(), xe = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3
};
function zt(e) {
  const t = e && typeof e == "object" ? e : {}, s = m(t.correlation_id) || m(t.CorrelationID), r = A(t.state) || A(t.State);
  if (!s || !r) return;
  const n = de.get(s);
  n && (xe[n.state] ?? -1) > (xe[r] ?? -1) || de.set(s, {
    state: r,
    message: m(t.message) || m(t.Message),
    at: m(t.at) || m(t.At),
    code: m(t.code) || m(t.Code)
  });
}
function Vt(e) {
  return e ? de.get(e) : void 0;
}
function m(e) {
  return typeof e == "string" ? e.trim() : "";
}
function A(e) {
  return m(e).toLowerCase();
}
function ue(e) {
  return e === "boolean" || e === "checkbox";
}
function Qt(e) {
  return !e || typeof e != "object" ? "" : u(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function ne(e) {
  return e == null ? "" : typeof e == "string" || typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function J(e, t) {
  return !!(e && Object.prototype.hasOwnProperty.call(e, t));
}
function Z(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function Xt(e) {
  return typeof e == "boolean" ? e : typeof e == "string" ? e.trim().toLowerCase() === "true" : !1;
}
function Fe(e) {
  const t = A(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function Yt(e, t) {
  const s = t && typeof t == "object" ? t : {}, r = Array.isArray(s.commands) ? s.commands : [], n = Array.isArray(s.diagnostics) ? s.diagnostics : [], a = Array.isArray(e.ui?.actions) ? e.ui.actions : [], i = Wt(e), o = /* @__PURE__ */ new Map();
  r.forEach((h) => {
    const p = m(h?.id);
    p && o.set(p, h);
  });
  const d = /* @__PURE__ */ new Map();
  a.forEach((h) => {
    const p = A(h?.id), g = m(h.payload?.command_id);
    p && g && !d.has(g) && d.set(g, h);
  });
  const c = [], f = /* @__PURE__ */ new Set(), y = (h) => {
    h && !f.has(h) && (f.add(h), c.push(h));
  };
  return r.forEach((h) => y(m(h?.id))), a.forEach((h) => y(m(h.payload?.command_id))), {
    entries: c.map((h) => {
      const p = o.get(h), g = d.get(h), E = g ? A(g.id) : "", w = !!(g && E), x = w ? Gt(g, i.get(h) || /* @__PURE__ */ new Map()) : void 0, $ = m(g?.label) || m(p?.label) || h, I = m(p?.group) || "Other", T = `${h} ${$} ${I} ${(Array.isArray(p?.tags) ? p.tags.map(m).filter(Boolean) : []).join(" ")}${w ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: w ? E : `cmd:${h}`,
        actionId: E,
        commandId: h,
        label: $,
        action: x,
        descriptor: p,
        group: I,
        search: T,
        executable: w
      };
    }),
    diagnostics: n
  };
}
function Wt(e) {
  const t = e.ui?.metadata && typeof e.ui.metadata == "object" ? e.ui.metadata : {}, s = t.serialized_schemas && typeof t.serialized_schemas == "object" ? t.serialized_schemas : {}, r = /* @__PURE__ */ new Map();
  return Object.entries(s).forEach(([n, a]) => {
    const i = a && typeof a == "object" ? a : {}, o = Array.isArray(i.fields) ? i.fields : [], d = /* @__PURE__ */ new Map();
    o.forEach((c) => {
      [
        m(c.id),
        m(c.name),
        m(c.path),
        m(c.payload_path).replace(/^payload\./, "")
      ].filter(Boolean).forEach((f) => d.set(f, c));
    }), r.set(n, d);
  }), r;
}
function Gt(e, t) {
  const s = Array.isArray(e.fields) ? e.fields : [];
  return s.length === 0 || t.size === 0 ? e : {
    ...e,
    fields: s.map((r) => {
      const n = [
        m(r.id),
        m(r.name),
        m(r.path),
        m(r.payload_path).replace(/^payload\./, "")
      ].filter(Boolean).map((i) => t.get(i)).find(Boolean);
      if (!n) return r;
      const a = { ...r };
      return !J(a, "default") && J(n, "default") && (a.default = n.default), !J(a, "display_hints") && J(n, "display_hints") && (a.display_hints = n.display_hints), m(a.description) || (a.description = m(n.description) || m(n.help)), m(a.help) || (a.help = m(n.help)), a;
    })
  };
}
function Zt(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => {
    t.has(s.group) || t.set(s.group, []), t.get(s.group).push(s);
  }), Array.from(t.entries()).sort((s, r) => s[0].localeCompare(r[0])).map(([s, r]) => ({
    group: s,
    items: r.sort((n, a) => (n.commandId || n.label).localeCompare(a.commandId || a.label))
  }));
}
function es(e) {
  const t = m(e.descriptor?.execution_mode), s = Fe(t), r = t ? `Execution: ${t}` : "Execution mode unknown", n = e.descriptor?.mutating === !0;
  let a;
  return e.executable ? n ? a = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : a = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : a = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}" role="option" aria-selected="false"
      data-cmdl-item="${u(e.key)}"
      data-cmdl-search="${u(e.search)}"
      title="${u(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${s}" title="${u(r)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${u(e.commandId || e.label)}</span>
      ${a}
    </button>`;
}
function ts(e, t) {
  const s = e.map((r) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${u(r.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${u(r.group)}</div>
        ${r.items.map(es).join("")}
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
function ss(e, t, s) {
  const r = m(e.name);
  if (!r) return "";
  const n = A(e.kind) || "text", a = m(e.label) || r, i = m(e.payload_path) || r, o = `cmdl-${t}-${r}-${s}`, d = e.required === !0, c = d ? '<span class="cmdl-field__req" title="Required">*</span>' : "", f = m(e.placeholder), y = f ? ` placeholder="${u(f)}"` : "", h = m(e.description) || m(e.help), p = Z(e.display_hints?.units), g = [h ? `<span>${u(h)}</span>` : "", p ? `<span class="cmdl-field__units">Units: ${u(p)}</span>` : ""].filter(Boolean), E = g.length ? `<small class="cmdl-field__help">${g.join(" ")}</small>` : "", w = Array.isArray(e.options) ? e.options.map(m).filter(Boolean) : [], x = d ? " required" : "", $ = `id="${u(o)}" data-action-field="${u(r)}" data-action-field-kind="${u(n)}" data-action-field-path="${u(i)}"${x}`, I = `<small class="cmdl-field__error" data-action-field-error="${u(i)}" data-action-field-name="${u(r)}" data-action-id="${u(t)}" hidden></small>`;
  if (ue(n)) return `
      <div class="cmdl-field cmdl-field--full cmdl-field--bool">
        <label class="cmdl-toggle">
          <input type="checkbox" ${$}${e.default === !0 ? " checked" : ""}>
          <span class="cmdl-toggle__track" aria-hidden="true"></span>
          <span class="cmdl-toggle__text">${u(a)}${c}</span>
        </label>
        ${E}${I}
      </div>`;
  let T = "";
  if (w.length > 0 || n === "select") {
    const C = ne(e.default);
    T = `<select ${$}><option value=""></option>${w.map((N) => `<option value="${u(N)}"${N === C ? " selected" : ""}>${u(N)}</option>`).join("")}</select>`;
  } else if (n === "number" || n === "integer") {
    const C = ne(e.default);
    T = `<input type="number" ${$}${y}${C ? ` value="${u(C)}"` : ""}>`;
  } else if (n === "string_list" || n === "array") {
    const C = Array.isArray(e.default) ? e.default.map(m).filter(Boolean) : [], N = f || "Add a value, press Enter";
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--list">
        <label class="cmdl-field__label" for="${u(o)}">${u(a)}${c}</label>
        <div class="cmdl-chips" data-cmdl-chips${d ? ' data-cmdl-chips-required="true"' : ""}>
          <span class="cmdl-chips__tags" data-cmdl-chips-tags></span>
          <input type="text" id="${u(o)}" class="cmdl-chips__entry" data-cmdl-chips-entry
            placeholder="${u(N)}" autocomplete="off" spellcheck="false">
          <input type="hidden" data-action-field="${u(r)}" data-action-field-kind="string_list"
            data-action-field-path="${u(i)}"
            data-cmdl-chips-value value="${u(C.join(`
`))}">
        </div>
        ${E}${I}
      </div>`;
  } else if (n === "json" || n === "object" || n === "textarea") T = `<textarea ${$}${y} rows="3">${u(e.default !== void 0 && e.default !== null ? JSON.stringify(e.default, null, 2) : "")}</textarea>`;
  else {
    const C = ne(e.default);
    T = `<input type="text" ${$}${y}${C ? ` value="${u(C)}"` : ""}>`;
  }
  return `
    <div class="cmdl-field">
      <label class="cmdl-field__label" for="${u(o)}">${u(a)}${c}</label>
      ${T}
      ${E}${I}
    </div>`;
}
function rs(e) {
  return ns(e) ? as(e) : is(e);
}
function ns(e) {
  return e.some((t) => {
    const s = t.display_hints || {};
    return Z(s.section) !== "" || J(s, "advanced");
  });
}
function as(e) {
  const t = [], s = /* @__PURE__ */ new Map(), r = [];
  return e.forEach((n) => {
    const a = n.display_hints || {};
    if (Xt(a.advanced)) {
      r.push(n);
      return;
    }
    const i = Z(a.section) || "Parameters";
    let o = s.get(i);
    o || (o = {
      title: i,
      fields: [],
      collapsible: !1
    }, s.set(i, o), t.push(o)), o.fields.push(n);
  }), r.length && t.push({
    title: "Advanced",
    fields: r,
    collapsible: !0
  }), t;
}
function is(e) {
  const t = e.filter((c) => ue(A(c.kind))), s = e.filter((c) => !ue(A(c.kind))), r = s.filter((c) => c.required === !0), n = s.filter((c) => c.required !== !0), a = [...r, ...n];
  let i = a, o = [];
  if (a.length > 6) {
    const c = Math.max(r.length, 4);
    i = a.slice(0, c), o = a.slice(c);
  }
  const d = [];
  return i.length && d.push({
    title: "Parameters",
    fields: i,
    collapsible: !1
  }), t.length && d.push({
    title: "Options",
    fields: t,
    collapsible: !1
  }), o.length && d.push({
    title: "Advanced",
    fields: o,
    collapsible: !0
  }), d;
}
function os(e, t, s) {
  return `
    <fieldset class="cmdl-section${e.collapsible ? " cmdl-section--collapsed" : ""}">
      ${e.collapsible ? `<legend class="cmdl-section__head cmdl-section__head--toggle" data-cmdl-section-toggle role="button" tabindex="0" aria-expanded="false">
        <span class="cmdl-section__caret" aria-hidden="true"></span>
        <span>${u(e.title)}</span>
        <span class="cmdl-section__count">${e.fields.length}</span>
      </legend>` : `<legend class="cmdl-section__head">${u(e.title)}</legend>`}
      <div class="cmdl-section__grid">${e.fields.map((r, n) => ss(r, t, s + n)).join("")}</div>
    </fieldset>`;
}
function ls(e) {
  const t = e.action;
  if (!t) return "";
  const s = Array.isArray(t.fields) ? t.fields : [], r = m(t.submit_label) || "Run command", n = m(t.confirm_text), a = t.requires_confirm === !0, i = e.descriptor?.mutating === !0;
  let o = "";
  if (s.length === 0) o = '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>';
  else {
    const h = rs(s);
    let p = 0;
    const g = h.map((E) => {
      const w = os(E, e.actionId, p);
      return p += E.fields.length, w;
    }).join("");
    o = `
      <div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${u(e.commandId)}">
        <div class="cmdl-recall__list" data-cmdl-recall-list></div>
        <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
      </div>
      <div class="cmdl-form__fields" data-cmdl-fields>${g}</div>
      <div class="cmdl-form__json" data-cmdl-json hidden>
        <textarea class="cmdl-json-editor" data-cmdl-json-editor
          data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
          rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
        <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
      </div>`;
  }
  const d = a || n !== "", c = i ? '<span class="cmdl-form__note">Confirms before running</span>' : "", f = s.length > 0 ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>' : "", y = d ? `
        <div class="cmdl-form__confirm" data-cmdl-confirm-row hidden>
          <span class="cmdl-form__confirm-msg">${u(n || "Run this command?")}</span>
          <button type="submit" class="cmdl-btn cmdl-btn--run cmdl-btn--confirm" data-cmdl-confirm-run>Confirm run</button>
          <button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-cancel>Cancel</button>
        </div>` : "";
  return `
    <form class="cmdl-form" data-panel-action-form data-cmdl-mode="form"
      data-panel-id="${u(G)}"
      data-action-id="${u(e.actionId)}"
      data-action-confirm="${u(n)}"
      data-action-requires-confirm="${a ? "true" : "false"}"
      data-cmdl-confirm="${d ? "true" : "false"}"
      ${d ? 'data-action-confirm-inline="true"' : ""}
      data-action-payload='${Qt(t.payload)}'>
      ${o}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
          <button type="submit" class="cmdl-btn cmdl-btn--run">${u(r)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${f}
          ${c}
        </div>${y}
      </div>
    </form>`;
}
function cs(e) {
  const t = m(e.descriptor?.execution_mode), s = e.descriptor?.mutating === !0, r = m(e.descriptor?.summary), n = [];
  n.push(`<span class="cmdl-chip">${u(e.group)}</span>`), t && n.push(`<span class="cmdl-chip cmdl-chip--${Fe(t)}">${u(t)}</span>`), n.push(s ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || n.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let a;
  return e.executable ? a = `${s ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${ls(e)}` : a = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${u(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${u(e.commandId || e.label)}</div>
        ${r ? `<div class="cmdl-cmd__summary">${u(r)}</div>` : ""}
        <div class="cmdl-cmd__chips">${n.join("")}</div>
      </div>
      ${a}
    </div>`;
}
function Ce(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const s = A(t.severity) || "info", r = m(t.message), n = m(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${u(s)}">
          <span class="cmdl-diag__sev">${u(s)}</span>
          <span class="cmdl-diag__msg">${u(r)}${n ? ` <span class="cmdl-diag__code">${u(n)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function ds(e) {
  const { def: t, data: s } = e, { entries: r, diagnostics: n } = Yt(t, s);
  if (r.length === 0) return `
      <div class="cmdl" data-cmdl-root>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${Ce(n)}
        <div class="cmdl-result" data-panel-action-result="${u(G)}"></div>
      </div>`;
  const a = Zt(r), i = r.map(cs).join("");
  return `
    <div class="cmdl" data-cmdl-root>
      <div class="cmdl__body" data-cmdl-body>
        ${ts(a, r.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${i}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${u(G)}"></div>
        </section>
      </div>
      ${Ce(n)}
    </div>`;
}
function X(e, t) {
  for (const s of t) {
    const r = e[s];
    if (typeof r == "string" && r.trim() !== "") return r.trim();
  }
  return "";
}
var us = [
  "category",
  "text_code",
  "source",
  "stack_trace",
  "severity",
  "location",
  "metadata"
];
function hs(e, t) {
  const s = [];
  e && typeof e == "object" && !Array.isArray(e) && s.push(e.error, e), t && typeof t == "object" && !Array.isArray(t) && s.push(t.error, t);
  for (const r of s) if (r && typeof r == "object" && !Array.isArray(r)) {
    const n = r;
    if (us.some((a) => a in n)) return n;
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
function ps(e) {
  const t = e.metadata && typeof e.metadata == "object" && !Array.isArray(e.metadata) ? e.metadata : {}, s = Object.entries(t).map(([y, h]) => ({
    key: y,
    value: Z(h) || Ne(h)
  })).filter((y) => y.value), r = (Array.isArray(e.stack_trace) ? e.stack_trace : []).map((y) => {
    const h = m(y.function), p = m(y.file), g = Le(y.line);
    return {
      func: Oe(h),
      funcTitle: h,
      loc: p ? `${$e(p)}${g ? `:${g}` : ""}` : "",
      locTitle: p ? `${p}${g ? `:${g}` : ""}` : "",
      app: p !== "" && !p.includes("/pkg/mod/")
    };
  }).filter((y) => y.func || y.loc), n = e.location && typeof e.location == "object" && !Array.isArray(e.location) ? e.location : {}, a = m(n.file), i = m(n.function), o = Le(n.line), d = a ? `${$e(a)}${o ? `:${o}` : ""}` : "", c = [Oe(i), d ? `(${d})` : ""].filter(Boolean).join(" "), f = [i, a ? `${a}${o ? `:${o}` : ""}` : ""].filter(Boolean).join(" ");
  return {
    category: m(e.category),
    textCode: m(e.text_code),
    source: m(e.source),
    severity: m(e.severity),
    timestamp: m(e.timestamp),
    httpCode: typeof e.code == "number" ? String(e.code) : m(e.code),
    metadata: s,
    location: c,
    locationTitle: f,
    stackTrace: r
  };
}
function fs(e, t, s, r) {
  const n = s && typeof s == "object" ? s : {}, a = n.receipt && typeof n.receipt == "object" ? n.receipt : {}, i = (Array.isArray(n.validation_errors) ? n.validation_errors : []).map((g) => ({
    path: m(g.path),
    message: m(g.message),
    code: m(g.code)
  })).filter((g) => g.message || g.path), o = a.Accepted ?? a.accepted, d = typeof o == "boolean" ? o : void 0;
  let c = "ok";
  e === "error" ? c = "error" : (i.length > 0 || d === !1) && (c = "invalid");
  const f = c === "error" ? hs(s, r) : null, y = f ? ps(f) : null;
  let h = "";
  i.length > 0 ? h = "VALIDATION_ERROR" : c === "error" && (h = y && y.textCode || X(r || {}, ["code", "text_code"]) || (y ? y.httpCode : ""));
  const p = s != null && (typeof s != "object" || Object.keys(n).length > 0);
  return {
    kind: c,
    message: m(t) || (c === "error" ? "Command failed" : "Command dispatched"),
    code: h,
    correlationId: X(a, ["CorrelationID", "correlation_id"]),
    mode: X(a, ["Mode", "mode"]),
    dispatchId: X(a, ["DispatchID", "dispatch_id"]),
    statusReference: m(n.status_reference) || m(n.statusReference),
    accepted: d,
    validationErrors: i,
    richError: y,
    hasRaw: p,
    rawJSON: p ? Ne(s) : ""
  };
}
function Ne(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function ms(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function gs(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function P(e, t, s) {
  return s ? `<span class="cmdl-meta" title="${u(t)}"><span class="cmdl-meta__k">${u(e)}</span>${u(s)}</span>` : "";
}
function ys(e, t = {}) {
  const s = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", r = e.code ? `<span class="cmdl-result__code">${u(e.code)}</span>` : "", n = t.liveStatus, a = n ? `<span class="cmdl-result__live cmdl-result__live--${u(n.state)}" title="Live status${n.at ? ` · ${u(n.at)}` : ""}">${u(n.state)}</span>` : "", i = e.richError, o = [
    P("id", "Correlation ID", e.correlationId),
    P("mode", "Execution mode", e.mode),
    P("dispatch", "Dispatch ID", e.dispatchId),
    P("status", "Status reference", e.statusReference),
    P("took", "Round-trip duration", typeof t.durationMs == "number" ? ms(t.durationMs) : ""),
    P("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? gs(t.at) : ""),
    i ? P("category", "Category", i.category) : "",
    i ? P("severity", "Severity", i.severity) : "",
    i ? P("http", "HTTP status", i.httpCode) : "",
    ...i ? i.metadata.map((g) => P(g.key, g.key, g.value)) : [],
    i ? P("when", "Timestamp", i.timestamp) : "",
    i ? P("at", i.locationTitle || "Origin", i.location) : ""
  ].filter(Boolean).join(""), d = o ? `<div class="cmdl-result__meta">${o}</div>` : "", c = i && i.source && i.source !== e.message ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${u(i.source)}</code></div>` : "", f = i && i.stackTrace.length ? `<details class="cmdl-result__trace"><summary>Stack trace · ${i.stackTrace.length} frame${i.stackTrace.length === 1 ? "" : "s"}</summary><ol class="cmdl-trace">${i.stackTrace.map((g) => `<li class="cmdl-trace__frame${g.app ? " cmdl-trace__frame--app" : ""}"><span class="cmdl-trace__fn" title="${u(g.funcTitle)}">${u(g.func)}</span>${g.loc ? `<span class="cmdl-trace__loc" title="${u(g.locTitle)}">${u(g.loc)}</span>` : ""}</li>`).join("")}</ol></details>` : "", y = e.validationErrors.length ? `<ul class="cmdl-result__validation">${e.validationErrors.map((g) => `<li><span class="cmdl-result__path">${u(g.path || "payload")}</span><span class="cmdl-result__vmsg">${u(g.message || g.code)}</span></li>`).join("")}</ul>` : "", h = e.hasRaw ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${u(e.rawJSON)}</pre></details>` : "", p = t.canRetry ? '<div class="cmdl-result__actions"><button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button></div>' : "";
  return `
    <div class="cmdl-result__card cmdl-result__card--${e.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${u(s)}</span>
        ${r}${a}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${u(e.message)}</div>
      ${c}
      ${d}
      ${y}
      ${f}
      ${p}
      ${h}
    </div>`;
}
function Y(e, t) {
  W = t;
  const s = e.querySelector("[data-cmdl-empty]");
  s && (s.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((r) => {
    r.hidden = r.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((r) => {
    const n = r.dataset.cmdlItem === t;
    r.classList.toggle("cmdl-item--active", n), r.setAttribute("aria-selected", n ? "true" : "false");
  });
}
function ke(e, t) {
  const s = t.trim().toLowerCase();
  let r = !1;
  e.querySelectorAll("[data-cmdl-item]").forEach((a) => {
    const i = a.dataset.cmdlSearch || "", o = s === "" || i.includes(s);
    a.hidden = !o, o && (r = !0);
  }), e.querySelectorAll("[data-cmdl-group]").forEach((a) => {
    a.hidden = !Array.from(a.querySelectorAll("[data-cmdl-item]")).some((i) => !i.hidden);
  });
  const n = e.querySelector("[data-cmdl-noresults]");
  n && (n.hidden = r);
}
function Te(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => !t.hidden);
}
function K(e) {
  const t = e.querySelector("[data-cmdl-chips-value]");
  return !t || !t.value.trim() ? [] : t.value.split(`
`).map((s) => s.trim()).filter(Boolean);
}
function D(e, t) {
  const s = e.querySelector("[data-cmdl-chips-tags]"), r = e.querySelector("[data-cmdl-chips-value]");
  r && (r.value = t.join(`
`)), s && (s.innerHTML = t.map((a, i) => `<span class="cmdl-chip-tag">${u(a)}<button type="button" class="cmdl-chip-tag__x" data-cmdl-chip-remove="${i}" aria-label="Remove ${u(a)}">×</button></span>`).join(""));
  const n = e.querySelector("[data-cmdl-chips-entry]");
  n && (n.required = e.dataset.cmdlChipsRequired === "true" && t.length === 0);
}
function bs(e) {
  return e instanceof HTMLInputElement && e.type === "checkbox" ? e.checked ? "true" : "false" : e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement ? e.value : "";
}
function Es(e, t) {
  if (e instanceof HTMLInputElement && e.type === "checkbox") {
    e.checked = t === "true";
    return;
  }
  if (e instanceof HTMLInputElement && e.dataset.cmdlChipsValue !== void 0) {
    const s = e.closest("[data-cmdl-chips]");
    s ? D(s, t ? t.split(`
`).map((r) => r.trim()).filter(Boolean) : []) : e.value = t;
    return;
  }
  (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (e.value = t);
}
function ye(e) {
  const t = A(e.dataset.actionId || "");
  if (!t) return;
  const s = {};
  e.querySelectorAll("[data-action-field]").forEach((r) => {
    const n = m(r.dataset.actionField);
    n && (s[n] = bs(r));
  }), me.set(t, s);
}
function H(e) {
  const t = e.closest("[data-panel-action-form]");
  t && ye(t);
}
function vs(e) {
  const t = A(e.dataset.actionId || ""), s = t ? me.get(t) : void 0;
  s && e.querySelectorAll("[data-action-field]").forEach((r) => {
    const n = m(r.dataset.actionField);
    n && Object.prototype.hasOwnProperty.call(s, n) && Es(r, s[n]);
  });
}
function Ss(e) {
  e.querySelectorAll("[data-cmdl-chips]").forEach((t) => {
    const s = t.querySelector("[data-cmdl-chips-entry]");
    s && s.value.trim() && (fe(t, s.value), s.value = "");
  });
}
var ws = 6;
function ee() {
  try {
    return typeof localStorage < "u" ? localStorage : null;
  } catch {
    return null;
  }
}
function F(e) {
  const t = ee();
  if (!t) return [];
  try {
    const s = t.getItem(e), r = s ? JSON.parse(s) : [];
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
function he(e, t) {
  const s = ee();
  if (s)
    try {
      s.setItem(e, JSON.stringify(t));
    } catch {
    }
}
function be(e) {
  return `cmdl:recent:${e}`;
}
function j(e) {
  return `cmdl:preset:${e}`;
}
function As(e) {
  const t = e && typeof e == "object" ? e : {}, s = m(t.command_id), r = t.payload && typeof t.payload == "object" ? t.payload : {};
  if (!s || Object.keys(r).length === 0) return;
  const n = be(s), a = JSON.stringify(r), i = F(n).filter((o) => JSON.stringify(o.payload) !== a);
  i.unshift({
    at: Date.now(),
    payload: r
  }), he(n, i.slice(0, ws));
}
function Ps(e) {
  const t = A(e.dataset.actionFieldKind);
  if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
  const s = e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement ? e.value.trim() : "";
  if (s !== "") {
    if (t === "number" || t === "integer") {
      const r = Number(s);
      return Number.isFinite(r) ? r : s;
    }
    if (t === "string_list" || t === "array") return s.split(/[\n,]/g).map((r) => r.trim()).filter(Boolean);
    if (t === "json" || t === "object") try {
      return JSON.parse(s);
    } catch {
      return s;
    }
    return s;
  }
}
function Be(e) {
  const t = {};
  return e.querySelectorAll("[data-action-field]").forEach((s) => {
    const r = s.closest("[hidden]");
    if (r && e.contains(r)) return;
    const n = m(s.dataset.actionField);
    if (!n || n.startsWith("__")) return;
    const a = Ps(s);
    a !== void 0 && (t[n] = a);
  }), t;
}
function _s(e, t) {
  if (e instanceof HTMLInputElement && e.type === "checkbox") {
    e.checked = t === !0 || t === "true";
    return;
  }
  if (e instanceof HTMLInputElement && e.dataset.cmdlChipsValue !== void 0) {
    const s = Array.isArray(t) ? t.map(m).filter(Boolean) : m(t) ? [m(t)] : [], r = e.closest("[data-cmdl-chips]");
    r && D(r, s);
    return;
  }
  (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (t == null ? e.value = "" : typeof t == "object" ? e.value = JSON.stringify(t, null, 2) : e.value = String(t));
}
function Ue(e, t) {
  e.querySelectorAll("[data-action-field]").forEach((s) => {
    const r = m(s.dataset.actionField);
    r && Object.prototype.hasOwnProperty.call(t, r) && _s(s, t[r]);
  }), ye(e);
}
function pe(e) {
  const t = m(e.dataset.cmdlCommand), s = e.querySelector("[data-cmdl-recall-list]");
  if (!t || !s) return;
  const r = F(be(t)), n = F(j(t)), a = [];
  r.forEach((i, o) => {
    a.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${o}" title="Reload recent invocation ${o + 1}">↻ recent ${o + 1}</button>`);
  }), n.forEach((i, o) => {
    const d = m(i.name) || `preset ${o + 1}`;
    a.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${o}" title="Load saved preset">★ ${u(d)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${o}" aria-label="Delete preset ${u(d)}">×</button></span>`);
  }), s.innerHTML = a.length ? a.join("") : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}
function xs(e, t) {
  const s = e.closest("[data-cmdl-load]");
  if (s) {
    const a = s.closest("[data-panel-action-form]"), i = m(s.closest("[data-cmdl-recall]")?.dataset.cmdlCommand), [o, d] = (s.dataset.cmdlLoad || "").split(":"), c = Number(d);
    if (a && i && Number.isInteger(c)) {
      const f = F(o === "preset" ? j(i) : be(i))[c]?.payload;
      f && typeof f == "object" && Ue(a, f);
    }
    return !0;
  }
  const r = e.closest("[data-cmdl-save-preset]");
  if (r) {
    const a = r.closest("[data-panel-action-form]"), i = r.closest("[data-cmdl-recall]"), o = m(i?.dataset.cmdlCommand);
    if (a && i && o) {
      const d = (typeof window < "u" && typeof window.prompt == "function" ? window.prompt("Preset name") : "") || "";
      if (d.trim()) {
        const c = F(j(o)).filter((f) => m(f.name) !== d.trim());
        c.unshift({
          name: d.trim(),
          payload: Be(a)
        }), he(j(o), c), pe(i);
      }
    }
    return !0;
  }
  const n = e.closest("[data-cmdl-del-preset]");
  if (n) {
    const a = n.closest("[data-cmdl-recall]"), i = m(a?.dataset.cmdlCommand), o = Number(n.dataset.cmdlDelPreset);
    if (a && i && Number.isInteger(o)) {
      const d = F(j(i));
      d.splice(o, 1), he(j(i), d), pe(a);
    }
    return !0;
  }
  return !1;
}
function Cs(e, t) {
  const s = e.querySelector("[data-cmdl-fields]"), r = e.querySelector("[data-cmdl-json]"), n = e.querySelector("[data-cmdl-json-editor]"), a = e.querySelector("[data-cmdl-json-toggle]"), i = e.querySelector("[data-cmdl-json-error]");
  if (!s || !r || !n) return;
  if (t) {
    n.value = JSON.stringify(Be(e), null, 2), i && (i.hidden = !0), s.hidden = !0, r.hidden = !1, e.dataset.cmdlMode = "json", a && (a.textContent = "Form");
    return;
  }
  let o;
  try {
    o = n.value.trim() ? JSON.parse(n.value) : {};
  } catch (d) {
    i && (i.textContent = `Invalid JSON: ${d.message}`, i.hidden = !1);
    return;
  }
  if (!o || typeof o != "object" || Array.isArray(o)) {
    i && (i.textContent = "Payload must be a JSON object.", i.hidden = !1);
    return;
  }
  Ue(e, o), s.hidden = !1, r.hidden = !0, e.dataset.cmdlMode = "form", a && (a.textContent = "JSON");
}
function fe(e, t) {
  const s = t.split(/[\n,]/g).map((n) => n.trim()).filter(Boolean);
  if (s.length === 0) return;
  const r = K(e);
  s.forEach((n) => {
    r.includes(n) || r.push(n);
  }), D(e, r);
}
function Os(e) {
  e.querySelectorAll("[data-cmdl-chips]").forEach((t) => {
    D(t, K(t));
  });
}
function $s() {
  const e = ee();
  if (!e) return 0;
  try {
    const t = Number(e.getItem(je));
    return Number.isFinite(t) && t >= ge ? t : 0;
  } catch {
    return 0;
  }
}
function Ls(e) {
  const t = e.clientWidth || 0;
  return t > 0 ? Math.max(ge, t - Kt) : Jt;
}
function ae(e, t) {
  const s = Math.min(Math.max(Math.round(t), ge), Ls(e));
  R = s, e.style.setProperty("--cmdl-sidebar-w", `${s}px`);
  const r = ee();
  if (r) try {
    r.setItem(je, String(s));
  } catch {
  }
  return s;
}
function ks(e) {
  R || (R = $s()), R && e.style.setProperty("--cmdl-sidebar-w", `${R}px`);
}
function Ts(e) {
  const t = e.querySelector("[data-cmdl-resizer]"), s = e.querySelector("[data-cmdl-body]");
  !t || !s || (ks(s), t.addEventListener("pointerdown", (r) => {
    r.preventDefault();
    const n = r.clientX, a = R || Pe;
    if (typeof t.setPointerCapture == "function") try {
      t.setPointerCapture(r.pointerId);
    } catch {
    }
    const i = (d) => ae(s, a + (d.clientX - n)), o = (d) => {
      ae(s, a + (d.clientX - n)), t.removeEventListener("pointermove", i), t.removeEventListener("pointerup", o), t.removeEventListener("pointercancel", o);
    };
    t.addEventListener("pointermove", i), t.addEventListener("pointerup", o), t.addEventListener("pointercancel", o);
  }), t.addEventListener("keydown", (r) => {
    r.key !== "ArrowLeft" && r.key !== "ArrowRight" || (r.preventDefault(), ae(s, (R || Pe) + (r.key === "ArrowRight" ? _e : -_e)));
  }));
}
function ie(e, t) {
  const s = e.querySelector("[data-cmdl-bar-main]"), r = e.querySelector("[data-cmdl-confirm-row]");
  if (!s || !r) return;
  s.hidden = t, r.hidden = !t;
  const n = t ? r.querySelector("[data-cmdl-confirm-run]") : s.querySelector("button");
  if (n && typeof n.focus == "function") try {
    n.focus();
  } catch {
  }
}
function Rs(e) {
  const t = e.querySelector("[data-cmdl-root]");
  if (!t) return;
  Os(t), Ts(t), t.querySelectorAll("[data-panel-action-form]").forEach((n) => vs(n)), t.querySelectorAll("[data-cmdl-recall]").forEach((n) => pe(n));
  const s = t.querySelector("[data-cmdl-filter]");
  s && Q && (s.value = Q, ke(t, Q)), W && t.querySelector(`[data-cmdl-item="${Ds(W)}"]`) && Y(t, W), t.addEventListener("click", (n) => {
    const a = n.target;
    if (xs(a, t)) return;
    const i = a.closest("[data-cmdl-json-toggle]");
    if (i) {
      const h = i.closest("[data-panel-action-form]");
      h && Cs(h, h.dataset.cmdlMode !== "json");
      return;
    }
    const o = a.closest("[data-cmdl-confirm-run]");
    if (o) {
      const h = o.closest("[data-panel-action-form]");
      h && (h.dataset.cmdlArmed = "true");
      return;
    }
    const d = a.closest("[data-cmdl-cancel]");
    if (d) {
      const h = d.closest("[data-panel-action-form]");
      h && (delete h.dataset.cmdlArmed, ie(h, !1));
      return;
    }
    const c = a.closest("[data-cmdl-item]");
    if (c) {
      Y(t, c.dataset.cmdlItem || "");
      return;
    }
    const f = a.closest("[data-cmdl-section-toggle]");
    if (f) {
      const h = f.closest(".cmdl-section");
      if (h) {
        const p = h.classList.toggle("cmdl-section--collapsed");
        f.setAttribute("aria-expanded", p ? "false" : "true");
      }
      return;
    }
    const y = a.closest("[data-cmdl-chip-remove]");
    if (y) {
      const h = y.closest("[data-cmdl-chips]");
      if (h) {
        const p = K(h), g = Number(y.dataset.cmdlChipRemove);
        Number.isInteger(g) && (p.splice(g, 1), D(h, p), H(h));
      }
    }
  }), s && (s.addEventListener("input", () => {
    Q = s.value, ke(t, s.value);
  }), s.addEventListener("keydown", (n) => {
    if (n.key === "ArrowDown" || n.key === "Enter") {
      const a = Te(t)[0];
      a && (n.preventDefault(), n.key === "Enter" ? Y(t, a.dataset.cmdlItem || "") : a.focus());
    }
  }));
  const r = (n) => {
    const a = n.target?.closest("[data-action-field]");
    a && H(a);
  };
  t.addEventListener("input", r), t.addEventListener("change", r), t.addEventListener("submit", (n) => {
    const a = n.target?.closest("[data-panel-action-form]");
    if (a) {
      if (a.dataset.cmdlConfirm === "true" && a.dataset.cmdlArmed !== "true") {
        n.preventDefault(), n.stopImmediatePropagation(), ie(a, !0);
        return;
      }
      Ss(a), ye(a), a.dataset.cmdlConfirm === "true" && (delete a.dataset.cmdlArmed, ie(a, !1));
    }
  }, !0), t.addEventListener("keydown", (n) => {
    const a = n.target, i = a.closest("[data-cmdl-section-toggle]");
    if (i && (n.key === "Enter" || n.key === " ")) {
      n.preventDefault(), i.dispatchEvent(new MouseEvent("click", { bubbles: !0 }));
      return;
    }
    const o = a.closest("[data-cmdl-chips-entry]");
    if (o) {
      if (n.key === "Enter" || n.key === ",") {
        n.preventDefault();
        const c = o.closest("[data-cmdl-chips]");
        c && (fe(c, o.value), o.value = "", H(c));
      } else if (n.key === "Backspace" && o.value === "") {
        const c = o.closest("[data-cmdl-chips]");
        if (c) {
          const f = K(c);
          f.pop(), D(c, f), H(c);
        }
      }
      return;
    }
    const d = a.closest("[data-cmdl-item]");
    if (d && (n.key === "ArrowDown" || n.key === "ArrowUp")) {
      n.preventDefault();
      const c = Te(t), f = c.indexOf(d), y = c[n.key === "ArrowDown" ? f + 1 : f - 1];
      y ? y.focus() : n.key === "ArrowUp" && s && s.focus();
      return;
    }
    d && n.key === "Enter" && (n.preventDefault(), Y(t, d.dataset.cmdlItem || ""));
  }), t.addEventListener("paste", (n) => {
    const a = n.target.closest("[data-cmdl-chips-entry]");
    if (!a) return;
    const i = n.clipboardData?.getData("text") || "";
    if (/[\n,]/.test(i)) {
      n.preventDefault();
      const o = a.closest("[data-cmdl-chips]");
      o && (fe(o, i), a.value = "", H(o));
    }
  }), t.addEventListener("reset", (n) => {
    const a = n.target, i = A(a.dataset.actionId || "");
    i && me.delete(i), window.setTimeout(() => {
      a.querySelectorAll("[data-cmdl-chips]").forEach((o) => {
        D(o, K(o));
      });
    }, 0);
  });
}
function Ds(e) {
  return e.replace(/["\\]/g, "\\$&");
}
wt(G, ds);
var Re = "debug-console-active-panel", De = "debug-console-panel-order", Is = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, Ie = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, qs = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : At(), oe = (e, t) => Bt(e, t), Ms = (e, t, s) => {
  if (!e || !t) return;
  const r = t.split(".").map((a) => a.trim()).filter(Boolean);
  if (r.length === 0) return;
  let n = e;
  for (let a = 0; a < r.length - 1; a += 1) {
    const i = r[a];
    (!n[i] || typeof n[i] != "object") && (n[i] = {}), n = n[i];
  }
  n[r[r.length - 1]] = s;
}, le = (e, t) => {
  if (!e) return t;
  const s = Number(e);
  return Number.isNaN(s) ? t : s;
}, qe = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, js = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.pauseButton = null, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.container = e;
    const t = qs(Ie(e.dataset.panels));
    t.includes("sessions") || t.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(t), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = le(e.dataset.maxLogEntries, 500), this.maxSQLQueries = le(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = le(e.dataset.slowThresholdMs, 50), this.replCommands = vt(Ie(e.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), gt.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = se(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.sqlView = new Ye({
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
    }), this.logsView = new te({
      styles: S,
      keyOf: at,
      renderRow: (s) => st(s, S, {
        showSource: !0,
        truncateMessage: !1
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.logEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAfterAppend: () => this.applyLogsAutoScroll()
    }), this.requestsView = new te({
      styles: S,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: We,
      renderRow: (s) => ct(s, S, {
        expandedRequestIds: this.expandedRequests,
        truncatePath: !1,
        slowThresholdMs: this.slowThresholdMs
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.requestEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => Xe(s, this.expandedRequests, { useIconFeedback: !0 })
    }), this.jserrorsView = new te({
      styles: S,
      keyOf: Ge,
      renderRow: (s) => nt(s, S, { compact: !1 }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => rt(s, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (s) => Qe(s, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new et({
      styles: S,
      getRenderOptions: () => ({}),
      shouldDisplay: (s, r) => {
        if (!s.applyFilters) return !0;
        const n = this.getPanelFilterState(s.id, s), a = s.applyFilters([r], n);
        return Array.isArray(a) ? a.length > 0 : !0;
      },
      onNeedFullRender: () => this.renderPanel()
    }), this.bindActions(), this.updateSessionBanner(), this.stream = new Ee({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = L.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder(), await Pt(this.debugPath), this.eventToPanel = se(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const s of bt(t)) e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null;
    try {
      e = this.normalizeStoredPanelID(sessionStorage.getItem(Re));
    } catch {
      e = null;
    }
    this.activePanel = e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(Re, this.activePanel);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(De, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const e = this.panelOrderPreferencesPath.trim();
    if (!e) return !1;
    try {
      const t = await q(e, {
        method: "GET",
        credentials: "same-origin"
      });
      if (!t.ok) return !1;
      const s = await t.json();
      return !s?.available || !s.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(s.panel_order), this.savedPanelOrder.length > 0);
    } catch {
      return !1;
    }
  }
  async saveServerPanelOrderPreference(e) {
    const t = this.panelOrderPreferencesPath.trim();
    if (t)
      try {
        await q(t, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: e }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const e = localStorage.getItem(De);
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
    return !t || !Is.test(t) ? null : t;
  }
  normalizeAvailablePanelIDs(e) {
    if (!Array.isArray(e)) return [];
    const t = [], s = /* @__PURE__ */ new Set();
    for (const r of e) {
      const n = this.normalizePanelID(r);
      !n || s.has(n) || (s.add(n), t.push(n));
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
    const r = new Set(s), n = [];
    for (const a of t) r.has(a) && (n.push(a), r.delete(a));
    for (const a of s) r.has(a) && n.push(a);
    return n;
  }
  applyPanelOrder() {
    const e = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = e.length > 0 ? e : this.availablePanels, this.restoreActivePanel();
  }
  initTabDragDrop() {
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = Je.create(this.tabsEl, {
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
    this.eventToPanel = se(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((a) => a !== t), delete this.customFilterState[t]), this.applyPanelOrder();
    const n = s !== this.activePanel;
    this.subscribeToEvents(), this.renderTabs(), (r || n || t === this.activePanel) && this.renderActivePanel();
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
      const s = t.closest("[data-doctor-action-run]");
      if (!s || s.disabled) return;
      const r = s.dataset.doctorActionRun || "", n = s.dataset.doctorActionConfirm || "", a = s.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(r, n, a);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const s = t === this.activePanel ? "debug-tab--active" : "", r = ht(Et(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${u(t)}">
            ${r}
            <span class="debug-tab__label">${u(Se(t))}</span>
            <span class="debug-tab__count" data-panel-count="${u(t)}">0</span>
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
        const n = this.getPanelFilterState(e, r), a = r.renderFilters(n);
        this.filtersEl.innerHTML = a || '<span class="timestamp">No filters</span>', a && this.bindFilterInputs();
        return;
      }
    }
    if (!s?.filters && e === "requests") {
      const r = this.filters.requests, n = this.getUniqueContentTypes();
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
            ${this.renderSelectOptions(["all", ...n], r.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${u(r.search)}" placeholder="/admin/users" />
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
          <input type="search" data-filter="search" value="${u(r.search)}" placeholder="SELECT" />
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
          <input type="search" data-filter="search" value="${u(r.search)}" placeholder="database" />
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
          <input type="search" data-filter="search" value="${u(r.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && e === "sessions") {
      const r = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${u(r.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const r = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${u(r.search)}" placeholder="user.roles[0].name" />
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
      const r = this.getPanelFilterState(e, s), n = r && typeof r == "object" && !Array.isArray(r) ? { ...r } : {};
      t.forEach((a) => {
        const i = a.dataset.filter || "";
        if (!i) return;
        const o = n[i];
        n[i] = this.readFilterInputValue(a, o);
      }), this.customFilterState[e] = n, this.renderPanel();
      return;
    }
    if (e === "requests") {
      const r = { ...this.filters.requests };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a === "newestFirst" || a === "hasBody" ? r[a] = n.checked : a && a in r && (r[a] = n.value);
      }), this.filters.requests = r;
    } else if (e === "sql") {
      const r = { ...this.filters.sql };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a === "slowOnly" || a === "errorOnly" || a === "newestFirst" ? r[a] = n.checked : a === "search" && (r[a] = n.value);
      }), this.filters.sql = r;
    } else if (e === "logs") {
      const r = { ...this.filters.logs };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a === "autoScroll" || a === "newestFirst" ? r[a] = n.checked : (a === "level" || a === "search") && (r[a] = n.value);
      }), this.filters.logs = r;
    } else if (e === "routes") {
      const r = { ...this.filters.routes };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a && a in r && (r[a] = n.value);
      }), this.filters.routes = r;
    } else if (e === "sessions") {
      const r = { ...this.filters.sessions };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a && a in r && (r[a] = n.value);
      }), this.filters.sessions = r;
    } else {
      const r = { ...this.filters.objects };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a && a in r && (r[a] = n.value);
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
    else if (e === "jserrors") s = lt(this.state.extra.jserrors || [], S, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const n = L.get(e);
      if (n && (n.renderConsole || n.render)) {
        const a = V(n);
        let i = this.getStateForKey(a);
        if (n.applyFilters) {
          const o = this.getPanelFilterState(e, n);
          i = n.applyFilters(i, o);
        } else if (!n.renderFilters && n.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && i && typeof i == "object" && !Array.isArray(i) && (i = oe(i, o));
        }
        s = (n.renderConsole || n.render)(i, S, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(Se(e), this.state.extra[e], this.filters.objects.search);
    }
    this.panelEl.innerHTML = s, e === "logs" && this.applyLogsAutoScroll(), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && this.requestsView.adopt(this.panelEl), e === "sql" && this.mountSQLView(), e === "logs" && this.logsView.adopt(this.panelEl), e === "jserrors" && this.jserrorsView.adopt(this.panelEl);
    const r = L.get(e);
    r && this.registryLiveList.handles(r) && this.registryLiveList.adopt(r, this.panelEl), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && Rs(this.panelEl), this.renderStoredPanelActionResult(e);
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
    const r = e.dataset.panelId || "", n = e.dataset.actionId || "";
    if (!this.debugPath || !r || !n) return;
    const a = e.dataset.actionConfirm || "", i = e.dataset.actionRequiresConfirm === "true";
    if (e.dataset.actionConfirmInline !== "true" && (i || a) && !window.confirm(a || "Run this debug panel action?")) return;
    const o = s || ot(e);
    r === "commands" && e instanceof HTMLFormElement && this.commandLauncherLastPayloads.set(n, qe(o)), t && (t.disabled = !0);
    const d = Date.now();
    try {
      const c = await q(`${this.debugPath}/api/panels/${encodeURIComponent(r)}/actions/${encodeURIComponent(n)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!c.ok) {
        const y = await He(c, `Action failed (${c.status})`, { appendStatusToFallback: !1 });
        this.showPanelActionResult(r, "error", y.message, n, y.payload, void 0, {
          at: Date.now(),
          durationMs: Date.now() - d
        });
        return;
      }
      const f = await c.json();
      this.showPanelActionResult(r, f.ok === !1 ? "error" : "ok", f.message || (f.ok === !1 ? "Action failed" : "Action complete"), n, f.data, f.errors, {
        at: Date.now(),
        durationMs: Date.now() - d
      }), r === "commands" && As(o), f.event && this.handleEvent(f.event), f.refresh && await this.fetchSnapshot();
    } catch (c) {
      const f = c instanceof Error ? c.message : "Action failed";
      this.showPanelActionResult(r, "error", f, n, void 0, void 0, {
        at: Date.now(),
        durationMs: Date.now() - d
      });
    } finally {
      t && (t.disabled = !1);
    }
  }
  showPanelActionResult(e, t, s, r, n, a, i) {
    if (this.panelActionResults.set(e, {
      status: t,
      message: s,
      actionID: r,
      data: n,
      errors: a,
      at: i?.at,
      durationMs: i?.durationMs
    }), this.renderStoredPanelActionResult(e), e === "commands") {
      const o = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((d) => d.dataset.panelActionResult === "commands");
      o && typeof o.scrollIntoView == "function" && o.scrollIntoView({ block: "nearest" });
    }
  }
  renderStoredPanelActionResult(e) {
    const t = this.panelActionResults.get(e);
    if (!t) return;
    this.clearPanelActionErrors();
    const s = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((a) => a.dataset.panelActionResult === e);
    if (!s) return;
    if (e === "commands") {
      const a = fs(t.status, t.message, t.data, t.errors), i = {};
      a.validationErrors.forEach((c) => {
        c.path && (i[c.path] = c.message || c.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(i, t.errors), this.renderPanelActionErrors(i, t.actionID);
      const o = !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)), d = Vt(a.correlationId);
      s.innerHTML = ys(a, {
        canRetry: o,
        at: t.at,
        durationMs: t.durationMs,
        liveStatus: d
      }), this.attachCommandLauncherResultActions(s, t.actionID);
      return;
    }
    const r = this.renderPanelActionErrors(t.errors, t.actionID), n = t.data === void 0 ? "" : `<pre class="${S.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${u(ve(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${t.status === "error" ? S.badgeError : S.badge}">${u(t.message)}</div>${r}${n}`;
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
    const r = Array.from(this.panelEl.querySelectorAll("[data-panel-action-form]")).find((n) => n.dataset.panelId === "commands" && n.dataset.actionId === e);
    r && this.runPanelAction(r, t, qe(s));
  }
  updatePanelActionPicker(e) {
    const t = e.closest("[data-panel-action-launcher]");
    if (!t) return;
    const s = e.value || "";
    t.querySelectorAll("[data-panel-action-choice]").forEach((r) => {
      r.hidden = r.dataset.panelActionChoice !== s;
    });
  }
  clearPanelActionErrors() {
    this.panelEl.querySelectorAll("[data-action-field-error]").forEach((e) => {
      e.textContent = "", e.hidden = !0;
    });
  }
  renderPanelActionErrors(e, t) {
    if (!e || typeof e != "object") return "";
    const s = [];
    return Object.entries(e).forEach(([r, n]) => {
      const a = this.stringifyActionError(n);
      if (!a) return;
      const i = r.trim(), o = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((d) => t && d.dataset.actionId !== t ? !1 : d.dataset.actionFieldError === i || d.dataset.actionFieldName === i || d.dataset.actionFieldError === `payload.${i}`);
      if (o) {
        o.textContent = a, o.hidden = !1;
        return;
      }
      s.push(a);
    }), s.length === 0 ? "" : `<ul class="${S.badgeError}" style="margin-top:0.5rem">${s.map((r) => `<li>${u(r)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    Ke(this.panelEl);
  }
  attachCopyButtonListeners() {
    ze(this.panelEl, { useIconFeedback: !0 });
  }
  mountSQLView() {
    this.sqlView.adopt(this.panelEl);
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new ut({
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
    const { method: t, status: s, search: r, hasBody: n, contentType: a } = this.filters.requests;
    return !(t !== "all" && (e.method || "").toUpperCase() !== t || s !== "all" && String(e.status || "") !== s || r && !(e.path || "").toLowerCase().includes(r.toLowerCase()) || n && !e.request_body || a !== "all" && (e.content_type || "").split(";")[0].trim() !== a);
  }
  renderRequests() {
    const { newestFirst: e } = this.filters.requests, t = this.state.requests.filter((s) => this.requestEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No requests captured yet.") : dt(t, S, {
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
    return t.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : Ve(t, S, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  logEntryMatchesFilters(e) {
    const { level: t, search: s } = this.filters.logs;
    return !(t !== "all" && (e.level || "").toLowerCase() !== t || s && !`${e.message || ""} ${e.source || ""} ${ve(e.fields || {})}`.toLowerCase().includes(s.toLowerCase()));
  }
  applyLogsAutoScroll() {
    this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight);
  }
  renderLogs() {
    const { newestFirst: e } = this.filters.logs, t = this.state.logs.filter((s) => this.logEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No logs captured yet.") : tt(t, S, {
      newestFirst: e,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e) return !1;
      const a = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(s && !a.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : it(r, S, { showName: !0 });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError) return this.renderEmptyState(this.sessionsError);
    const e = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, t = this.filters.sessions.search.trim().toLowerCase();
    let s = [...this.sessions];
    if (t && (s = s.filter((a) => [
      a.username,
      a.user_id,
      a.session_id,
      a.ip,
      a.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), s.sort((a, i) => {
      const o = new Date(a.last_activity || a.started_at || 0).getTime();
      return new Date(i.last_activity || i.started_at || 0).getTime() - o;
    }), this.sessionsLoading && s.length === 0) return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const r = s.map((a) => {
      const i = a.session_id || "", o = a.username || a.user_id || "Unknown", d = pt(a.last_activity || a.started_at), c = z(a.request_count ?? 0), f = !!i && i === this.activeSessionId, y = f ? "detach" : "attach", h = f ? "Detach" : "Attach", p = f ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", g = f ? "debug-session-row debug-session-row--active" : "debug-session-row", E = a.current_page || "-", w = a.ip || "-";
      return `
          <tr class="${g}">
            <td>
              <div class="debug-session-user">${u(o)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${u(i || "-")}</span>
              </div>
            </td>
            <td>${u(w)}</td>
            <td>
              <span class="debug-session-path">${u(E)}</span>
            </td>
            <td>${u(d || "-")}</td>
            <td>${u(c)}</td>
            <td>
              <button class="${p}" data-session-action="${y}" data-session-id="${u(i)}">
                ${h}
              </button>
            </td>
          </tr>
        `;
    }).join(""), n = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${z(s.length)} active`}</span>
        <div class="debug-session-toolbar__actions">
          <button class="debug-btn" data-session-action="refresh">
            <i class="iconoir-refresh"></i> ${n}
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
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : Ze(this.state.custom, S, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (r) => oe(r, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const r = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    return r && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !r && !n && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : ft(e, t, S, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (a) => oe(a, s) : void 0
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
        const t = await fetch(`${this.debugPath}/api/sessions`, { credentials: "same-origin" });
        if (!t.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const s = await t.json();
        if (this.sessions = Array.isArray(s.sessions) ? s.sessions : [], this.sessionsLoaded = !0, this.sessionsUpdatedAt = /* @__PURE__ */ new Date(), this.activeSessionId) {
          const r = this.sessions.find((n) => n.session_id === this.activeSessionId);
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
    this.stream.close(), this.stream = new Ee({
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
    }, this.expandedRequests.clear(), this.jserrorsExpanded.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
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
        const s = V(t);
        return yt({ [s]: this.getStateForKey(s) }, t);
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
        <p>${u(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((s) => {
      const r = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${u(s)}" ${r}>${u(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), s = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      s && (s.textContent = z(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${z(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
      zt(e.payload), this.activePanel === "commands" && this.renderStoredPanelActionResult("commands");
      return;
    }
    const t = this.eventToPanel[e.type] || e.type, s = L.get(t);
    if (s) {
      const r = V(s), n = this.getStateForKey(r), a = (s.handleEvent || ((i, o) => _t(i, o, this.maxLogEntries)))(n, e.payload);
      this.setStateForKey(r, a);
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
        St(t) || (this.state.extra[t] = e.payload);
        break;
    }
    if (this.updateTabCounts(), t === this.activePanel) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(s)) {
      const r = this.getStateForKey(V(s)), n = Array.isArray(r) ? r[r.length - 1] : void 0;
      this.registryLiveList.enqueue(s, n);
    } else this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Ms(this.state.custom.data, String(e.key), e.value);
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
        this.state.logs = t || [];
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
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = U(t.requests), this.state.sql = U(t.sql), this.state.logs = U(t.logs), this.state.config = t.config || {}, this.state.routes = U(t.routes);
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
    ]), n = {};
    this.panels.forEach((a) => {
      !r.has(a) && a in t && (n[a] = t[a]);
    }), this.state.extra = n, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; ) e.shift();
  }
  isSlowQuery(e) {
    return mt(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.debugPath && !this.activeSessionId)
      try {
        const e = await fetch(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
        if (!e.ok) return;
        const t = await e.json();
        this.applySnapshot(t);
      } catch {
      }
  }
  clearAll() {
    this.debugPath && (this.stream.clear(), !this.activeSessionId && q(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const e = this.activePanel;
    this.stream.clear([e]), !this.activeSessionId && q(`${this.debugPath}/api/clear/${e}`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    });
  }
  async parseJSONResponse(e) {
    if (!(e.headers.get("content-type") || "").toLowerCase().includes("application/json")) return null;
    try {
      const t = await e.json();
      if (t && typeof t == "object") return t;
    } catch {
    }
    return null;
  }
  readResponsePath(e, t) {
    if (!e || !t) return;
    const s = t.split(".").map((n) => n.trim()).filter(Boolean);
    if (s.length === 0) return;
    let r = e;
    for (const n of s) {
      if (!r || typeof r != "object") return;
      r = r[n];
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
    const n = t === "success" ? {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.45)",
      color: "#bbf7d0"
    } : {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.45)",
      color: "#fecaca"
    }, a = document.createElement("div");
    a.style.maxWidth = "380px", a.style.padding = "10px 12px", a.style.borderRadius = "8px", a.style.border = `1px solid ${n.border}`, a.style.background = n.bg, a.style.color = n.color, a.style.fontSize = "12px", a.style.lineHeight = "1.4", a.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.25)", a.style.pointerEvents = "auto", a.textContent = s, r.appendChild(a), window.setTimeout(() => {
      a.remove(), r && r.childElementCount === 0 && r.remove();
    }, 4200);
  }
  async runDoctorAction(e, t = "", s = !1) {
    if (!this.debugPath || this.activeSessionId) return;
    const r = e.trim();
    if (!r) return;
    const n = t.trim();
    if (s || n) {
      const a = n || "Are you sure you want to run this doctor action?";
      if (!window.confirm(a)) return;
    }
    try {
      const a = await q(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), i = await this.parseJSONResponse(a);
      if (!a.ok) {
        const d = this.responseMessage(i, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${a.status})`;
        this.showDoctorActionToast(d, "error");
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
}, Fs = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new js(t) : null;
}, Me = () => {
  Fs();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", Me) : Me();
export {
  ir as DATA_ATTRS,
  ur as DEBUG_ICON_REFS,
  js as DebugPanel,
  Ee as DebugStream,
  Gs as INTERACTION_CLASSES,
  te as LiveListView,
  et as RegistryLiveListManager,
  Js as RemoteDebugStream,
  Ye as SqlLiveView,
  yr as appendListRow,
  Qs as appendSqlRowDOM,
  xr as applyCustomEventPayload,
  kr as applyDebugEventToSnapshot,
  ze as attachCopyListeners,
  Ke as attachExpandableRowListeners,
  Xe as attachRequestDetailListeners,
  rt as attachRowExpansion,
  se as buildEventToPanel,
  S as consoleStyles,
  tr as copyToClipboard,
  B as countPayload,
  Ir as defaultGetCount,
  _t as defaultHandleEvent,
  u as escapeHTML,
  br as evictListOverflow,
  Xs as evictSqlOverflow,
  Cr as fetchDebugSnapshot,
  Pr as formatDuration,
  ve as formatJSON,
  z as formatNumber,
  pt as formatTimestamp,
  cr as getDebugIconRef,
  At as getDefaultPanels,
  Dr as getDefaultToolbarPanels,
  Tr as getLevelClass,
  yt as getPanelCount,
  qr as getPanelData,
  bt as getPanelEventTypes,
  Et as getPanelIcon,
  Se as getPanelLabel,
  V as getSnapshotKey,
  Er as getStatusClass,
  Ws as getStyleConfig,
  Lr as getToolbarCounts,
  vr as hashString,
  Fs as initDebugPanel,
  St as isKnownPanel,
  gr as isSchemaListRenderer,
  mt as isSlowDuration,
  Ge as jsErrorRowKey,
  at as logRowKey,
  fr as normalizeEventTypes,
  vt as normalizeReplCommands,
  Rr as panelDefinitionFromServer,
  L as panelRegistry,
  Ze as renderCustomPanel,
  dr as renderDebugIcon,
  ht as renderDebugIconRef,
  er as renderDoctorPanel,
  Zs as renderDoctorPanelCompact,
  nt as renderErrorRow,
  lt as renderJSErrorsPanel,
  ft as renderJSONPanel,
  Sr as renderJSONViewer,
  st as renderLogRow,
  tt as renderLogsPanel,
  Ar as renderPanelContent,
  rr as renderPermissionsPanel,
  ar as renderPermissionsPanelCompact,
  ct as renderRequestRow,
  dt as renderRequestsPanel,
  it as renderRoutesPanel,
  Ve as renderSQLPanel,
  zs as renderSQLRow,
  Vs as renderSQLRowsHTML,
  mr as renderSchemaListRow,
  wr as renderSchemaStatusList,
  $r as renderSchemaTable,
  pr as renderSchemaTimeline,
  sr as renderSiteRenderCachePanel,
  nr as renderSiteRenderCachePanelCompact,
  gt as replPanelIDs,
  We as requestRowKey,
  Qe as restoreRowExpansion,
  Or as schemaRowKey,
  Ys as sqlRowKey,
  Ks as toolbarStyles,
  _r as truncate
};

//# sourceMappingURL=index.js.map