import { escapeHTML as p } from "../shared/html.js";
import { httpRequest as R, readCSRFToken as Ye, readExpectedHTTPJSON as B, readHTTPErrorResult as Ze } from "../shared/transport/http-client.js";
import { t as et } from "../chunks/sortable.esm-CcMbOE-M.js";
import { A as zs, B as Qs, C as tt, D as w, E as st, F as me, G as ge, H as Xs, K as Gs, L as Ws, M as rt, N as nt, O as Ys, P as at, R as ye, S as Zs, T as it, U as er, V as ot, W as tr, _ as lt, a as sr, b as ct, c as rr, d as nr, f as dt, g as ut, h as ht, i as k, j as ar, k as ir, l as or, m as ft, n as lr, o as cr, p as pt, r as be, s as dr, t as mt, u as ur, v as Ee, w as gt, x as yt, y as bt, z as hr } from "../chunks/builtin-panels-PNUdAgjs.js";
import { t as Et } from "../chunks/repl-panel-BKc41M7P.js";
import { i as vt, n as mr, r as gr, t as yr } from "../chunks/icons-B_VaFfsl.js";
import { $ as Er, A as ve, B as vr, C as Sr, D as wr, E as Pr, F as Ar, G as Cr, H as _r, I as St, K as xr, L as Or, M as Se, N as we, O as wt, P as Rr, Q as Y, R as Pe, S as V, T as $r, U as Lr, V as Dr, W as Ir, X as Pt, Z as kr, _ as At, a as Tr, at as U, b as Ct, c as qr, ct as _t, d as xt, dt as Fr, et as Nr, f as Ot, ft as Mr, g as Rt, h as $t, i as Lt, it as J, j as jr, k as Br, l as Dt, lt as z, m as Ur, mt as Jr, n as It, o as Hr, p as Ae, pt as kt, q as Kr, r as Vr, s as Z, st as zr, tt as Qr, u as Xr, ut as Tt, v as Gr, w as $, x as Wr, y as qt, z as Yr } from "../chunks/server-definitions-4iGaxxbT.js";
var Ft = class {
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
}, Nt = class {
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
}, _ = class c {
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
    let s = [], r, n;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === c.SEMCOL_CODE || r === c.COMMA_CODE) this.index++;
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
    let t = this.expr.substr(this.index, c.max_binop_len), s = t.length;
    for (; s > 0; ) {
      if (c.binary_ops.hasOwnProperty(t) && (!c.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !c.isIdentifierPart(this.expr.charCodeAt(this.index + t.length))))
        return this.index += s, t;
      t = t.substr(0, --s);
    }
    return !1;
  }
  gobbleBinaryExpression() {
    let t, s, r, n, a, i, o, l, d;
    if (i = this.gobbleToken(), !i || (s = this.gobbleBinaryOp(), !s)) return i;
    for (a = {
      value: s,
      prec: c.binaryPrecedence(s),
      right_a: c.right_associative.has(s)
    }, o = this.gobbleToken(), o || this.throwError("Expected expression after " + s), n = [
      i,
      a,
      o
    ]; s = this.gobbleBinaryOp(); ) {
      if (r = c.binaryPrecedence(s), r === 0) {
        this.index -= s.length;
        break;
      }
      a = {
        value: s,
        prec: r,
        right_a: c.right_associative.has(s)
      }, d = s;
      const u = (h) => a.right_a && h.right_a ? r > h.prec : r <= h.prec;
      for (; n.length > 2 && u(n[n.length - 2]); )
        o = n.pop(), s = n.pop().value, i = n.pop(), t = {
          type: c.BINARY_EXP,
          operator: s,
          left: i,
          right: o
        }, n.push(t);
      t = this.gobbleToken(), t || this.throwError("Expected expression after " + d), n.push(a, t);
    }
    for (l = n.length - 1, t = n[l]; l > 1; )
      t = {
        type: c.BINARY_EXP,
        operator: n[l - 1].value,
        left: n[l - 2],
        right: t
      }, l -= 2;
    return t;
  }
  gobbleToken() {
    let t, s, r, n;
    if (this.gobbleSpaces(), n = this.searchHook("gobble-token"), n) return this.runHook("after-token", n);
    if (t = this.code, c.isDecimalDigit(t) || t === c.PERIOD_CODE) return this.gobbleNumericLiteral();
    if (t === c.SQUOTE_CODE || t === c.DQUOTE_CODE) n = this.gobbleStringLiteral();
    else if (t === c.OBRACK_CODE) n = this.gobbleArray();
    else {
      for (s = this.expr.substr(this.index, c.max_unop_len), r = s.length; r > 0; ) {
        if (c.unary_ops.hasOwnProperty(s) && (!c.isIdentifierStart(this.code) || this.index + s.length < this.expr.length && !c.isIdentifierPart(this.expr.charCodeAt(this.index + s.length)))) {
          this.index += r;
          const a = this.gobbleToken();
          return a || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: c.UNARY_EXP,
            operator: s,
            argument: a,
            prefix: !0
          });
        }
        s = s.substr(0, --r);
      }
      c.isIdentifierStart(t) ? (n = this.gobbleIdentifier(), c.literals.hasOwnProperty(n.name) ? n = {
        type: c.LITERAL,
        value: c.literals[n.name],
        raw: n.name
      } : n.name === c.this_str && (n = { type: c.THIS_EXP })) : t === c.OPAREN_CODE && (n = this.gobbleGroup());
    }
    return n ? (n = this.gobbleTokenProperty(n), this.runHook("after-token", n)) : this.runHook("after-token", !1);
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
    let r = !1, n = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let a = this.code;
      if (a === t) {
        r = !0, this.index++, t === c.CPAREN_CODE && n && n >= s.length && this.throwError("Unexpected token " + String.fromCharCode(t));
        break;
      } else if (a === c.COMMA_CODE) {
        if (this.index++, n++, n !== s.length) {
          if (t === c.CPAREN_CODE) this.throwError("Unexpected token ,");
          else if (t === c.CBRACK_CODE) for (let i = s.length; i < n; i++) s.push(null);
        }
      } else if (s.length !== n && n !== 0) this.throwError("Expected comma");
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
}, Mt = new Ft();
Object.assign(_, {
  hooks: Mt,
  plugins: new Nt(_),
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
var x = (e) => new _(e).parse(), jt = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(_).filter((e) => !jt.includes(e) && x[e] === void 0).forEach((e) => {
  x[e] = _[e];
});
x.Jsep = _;
var Bt = "ConditionalExpression";
x.plugins.register({
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
            type: Bt,
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
var Ce = 47, Ut = 92, Jt = {
  name: "regex",
  init(e) {
    e.hooks.add("gobble-token", function(s) {
      if (this.code === Ce) {
        const r = ++this.index;
        let n = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === Ce && !n) {
            const a = this.expr.slice(r, this.index);
            let i = "";
            for (; ++this.index < this.expr.length; ) {
              const l = this.code;
              if (l >= 97 && l <= 122 || l >= 65 && l <= 90 || l >= 48 && l <= 57) i += this.char;
              else break;
            }
            let o;
            try {
              o = new RegExp(a, i);
            } catch (l) {
              this.throwError(l.message);
            }
            return s.node = {
              type: e.LITERAL,
              value: o,
              raw: this.expr.slice(r - 1, this.index)
            }, s.node = this.gobbleTokenProperty(s.node), s.node;
          }
          this.code === e.OBRACK_CODE ? n = !0 : n && this.code === e.CBRACK_CODE && (n = !1), this.index += this.code === Ut ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, ee = 43, q = {
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
    q.assignmentOperators.forEach((r) => e.addBinaryOp(r, q.assignmentPrecedence, !0)), e.hooks.add("gobble-token", function(n) {
      const a = this.code;
      q.updateOperators.some((i) => i === a && i === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, n.node = {
        type: "UpdateExpression",
        operator: a === ee ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!n.node.argument || !t.includes(n.node.argument.type)) && this.throwError(`Unexpected ${n.node.operator}`));
    }), e.hooks.add("after-token", function(n) {
      if (n.node) {
        const a = this.code;
        q.updateOperators.some((i) => i === a && i === this.expr.charCodeAt(this.index + 1)) && (t.includes(n.node.type) || this.throwError(`Unexpected ${n.node.operator}`), this.index += 2, n.node = {
          type: "UpdateExpression",
          operator: a === ee ? "++" : "--",
          argument: n.node,
          prefix: !1
        });
      }
    }), e.hooks.add("after-expression", function(n) {
      n.node && s(n.node);
    });
    function s(r) {
      q.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((n) => {
        n && typeof n == "object" && s(n);
      });
    }
  }
};
x.plugins.register(Jt, q);
x.addUnaryOp("typeof");
x.addLiteral("null", null);
x.addLiteral("undefined", void 0);
var Ht = /* @__PURE__ */ new Set([
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
    if (!Object.hasOwn(r, s) && Ht.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
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
}, Kt = class {
  constructor(e) {
    this.code = e, this.ast = x(this.code);
  }
  runInNewContext(e) {
    const t = Object.assign(/* @__PURE__ */ Object.create(null), e);
    return v.evalAst(this.ast, t);
  }
};
function L(e, t) {
  return e = e.slice(), e.push(t), e;
}
function oe(e, t) {
  return t = t.slice(), t.unshift(e), t;
}
var Vt = class extends Error {
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
    if (!o || typeof o != "object") throw new Vt(o);
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
  const l = b.toPathArray(e);
  l[0] === "$" && l.length > 1 && l.shift(), this._hasParentSelector = null;
  const d = this._trace(l, t, ["$"], n, a, s).filter(function(u) {
    return u && !u.isParentSelector;
  });
  return d.length ? !o && d.length === 1 && !d[0].hasArrExpr ? this._getPreferredOutput(d[0]) : d.reduce((u, h) => {
    const g = this._getPreferredOutput(h);
    return i && Array.isArray(g) ? u = u.concat(g) : u.push(g), u;
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
  let l;
  if (!e.length)
    return l = {
      path: s,
      value: t,
      parent: r,
      parentProperty: n,
      hasArrExpr: i
    }, this._handleCallback(l, a, "value"), l;
  const d = e[0], u = e.slice(1), h = [];
  function g(f) {
    Array.isArray(f) ? f.forEach((y) => {
      h.push(y);
    }) : h.push(f);
  }
  if ((typeof d != "string" || o) && t && Object.hasOwn(t, d)) g(this._trace(u, t[d], L(s, d), t, d, a, i));
  else if (d === "*") this._walk(t, (f) => {
    g(this._trace(u, t[f], L(s, f), t, f, a, !0, !0));
  });
  else if (d === "..")
    g(this._trace(u, t, s, r, n, a, i)), this._walk(t, (f) => {
      typeof t[f] == "object" && g(this._trace(e.slice(), t[f], L(s, f), t, f, a, !0));
    });
  else {
    if (d === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: u,
        isParentSelector: !0
      };
    if (d === "~")
      return l = {
        path: L(s, d),
        value: n,
        parent: r,
        parentProperty: null
      }, this._handleCallback(l, a, "property"), l;
    if (d === "$") g(this._trace(u, t, s, null, null, a, i));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(d)) g(this._slice(d, u, t, s, r, n, a));
    else if (d.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const f = d.replace(/^\?\((.*?)\)$/u, "$1"), y = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(f);
      y ? this._walk(t, (E) => {
        const S = [y[2]], O = y[1] ? t[E][y[1]] : t[E];
        this._trace(S, O, s, r, n, a, !0).length > 0 && g(this._trace(u, t[E], L(s, E), t, E, a, !0));
      }) : this._walk(t, (E) => {
        this._eval(f, t[E], E, s, r, n) && g(this._trace(u, t[E], L(s, E), t, E, a, !0));
      });
    } else if (d[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      g(this._trace(oe(this._eval(d, t, s.at(-1), s.slice(0, -1), r, n), u), t, s, r, n, a, i));
    } else if (d[0] === "@") {
      let f = !1;
      const y = d.slice(1, -2);
      switch (y) {
        case "scalar":
          (!t || !["object", "function"].includes(typeof t)) && (f = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof t === y && (f = !0);
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
          t && typeof t === y && (f = !0);
          break;
        case "array":
          Array.isArray(t) && (f = !0);
          break;
        case "other":
          f = this.currOtherTypeCallback(t, s, r, n);
          break;
        case "null":
          t === null && (f = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + y);
      }
      if (f)
        return l = {
          path: s,
          value: t,
          parent: r,
          parentProperty: n
        }, this._handleCallback(l, a, "value"), l;
    } else if (d[0] === "`" && t && Object.hasOwn(t, d.slice(1))) {
      const f = d.slice(1);
      g(this._trace(u, t[f], L(s, f), t, f, a, i, !0));
    } else if (d.includes(",")) {
      const f = d.split(",");
      for (const y of f) g(this._trace(oe(y, u), t, s, r, n, a, !0));
    } else !o && t && Object.hasOwn(t, d) && g(this._trace(u, t[d], L(s, d), t, d, a, i, !0));
  }
  if (this._hasParentSelector) for (let f = 0; f < h.length; f++) {
    const y = h[f];
    if (y && y.isParentSelector) {
      const E = this._trace(y.expr, t, y.path, r, n, a, i);
      if (Array.isArray(E)) {
        h[f] = E[0];
        const S = E.length;
        for (let O = 1; O < S; O++)
          f++, h.splice(f, 0, E[O]);
      } else h[f] = E;
    }
  }
  return h;
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
  const o = s.length, l = e.split(":"), d = l[2] && Number.parseInt(l[2]) || 1;
  let u = l[0] && Number.parseInt(l[0]) || 0, h = l[1] && Number.parseInt(l[1]) || o;
  u = u < 0 ? Math.max(0, u + o) : Math.min(o, u), h = h < 0 ? Math.max(0, h + o) : Math.min(o, h);
  const g = [];
  for (let f = u; f < h; f += d) this._trace(oe(f, t), s, r, n, a, i, !0).forEach((y) => {
    g.push(y);
  });
  return g;
};
b.prototype._eval = function(e, t, s, r, n, a) {
  this.currSandbox._$_parentProperty = a, this.currSandbox._$_parent = n, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
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
b.prototype.safeVm = { Script: Kt };
var zt = function(e, t, s) {
  const r = e.length;
  for (let n = 0; n < r; n++) {
    const a = e[n];
    s(a) && t.push(e.splice(n--, 1)[0]);
  }
}, Qt = class {
  constructor(e) {
    this.code = e;
  }
  runInNewContext(e) {
    let t = this.code;
    const s = Object.keys(e), r = [];
    zt(s, r, (o) => typeof e[o] == "function");
    const n = s.map((o) => e[o]);
    t = r.reduce((o, l) => {
      let d = e[l].toString();
      return /function/u.test(d) || (d = "function " + d), "var " + l + "=" + d + ";" + o;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const a = t.lastIndexOf(";"), i = a !== -1 ? t.slice(0, a + 1) + " return " + t.slice(a + 1) : " return " + t;
    return new Function(...s, i)(...n);
  }
};
b.prototype.vm = { Script: Qt };
function Xt(e) {
  return e ? !!(e.startsWith("$") || /\[\d+\]/.test(e) || /\[['"]/.test(e) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(e) || e.includes("..") || e.includes("*")) : !1;
}
function Gt(e) {
  return e ? e.startsWith("$") ? e : `$.${e}` : "$";
}
function Wt(e, t) {
  if (!e || !t) return [];
  try {
    return (b({
      path: Gt(t),
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
function Yt(e, t) {
  if (!t || !e) return e || {};
  const s = Xt(t);
  if (console.log("[jsonpath-search] search:", t, "isJsonPath:", s), s) {
    const n = es(e, t);
    return console.log("[jsonpath-search] JSONPath result:", n), n;
  }
  const r = Zt(e, t);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function Zt(e, t) {
  const s = t.toLowerCase(), r = {};
  for (const [n, a] of Object.entries(e || {})) n.toLowerCase().includes(s) && (r[n] = a);
  return r;
}
function es(e, t) {
  const s = Wt(e, t);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: n, value: a } = s[0];
    return n === "$" && typeof a == "object" && a !== null || typeof a == "object" && a !== null && !Array.isArray(a) ? a : { [_e(n)]: a };
  }
  const r = {};
  for (const { path: n, value: a } of s) {
    const i = _e(n) || `result_${Object.keys(r).length}`;
    i in r ? r[`${i}_${Object.keys(r).length}`] = a : r[i] = a;
  }
  return r;
}
function _e(e) {
  if (!e) return "";
  const t = e.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (t) return t[1];
  const s = e.match(/\.([^.[\]]+)$/);
  return s ? s[1] : e.replace(/^\$\.?/, "");
}
var K = "commands", xe = "command-options://", H = "", Q = "", G = /* @__PURE__ */ new Map(), C = /* @__PURE__ */ new Map(), D = 0, Oe = 230, ue = 180, ts = 640, ss = 280, Re = 24, Ue = "cmdl:sidebar-width", le = /* @__PURE__ */ new Map(), $e = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3,
  canceled: 3,
  cancelled: 3,
  rejected: 3
};
function rs(e) {
  const t = e && typeof e == "object" ? e : {}, s = Array.from(new Set([
    m(t.correlation_id) || m(t.CorrelationID),
    m(t.run_id) || m(t.RunID),
    m(t.dispatch_id) || m(t.DispatchID)
  ].filter(Boolean))), r = P(t.state) || P(t.State);
  if (s.length === 0 || !r) return;
  const n = m(t.run_id) || m(t.RunID), a = m(t.correlation_id) || m(t.CorrelationID), i = m(t.dispatch_id) || m(t.DispatchID);
  s.forEach((o) => {
    const l = le.get(o);
    l && ($e[l.state] ?? -1) > ($e[r] ?? -1) || le.set(o, {
      state: r,
      message: m(t.message) || m(t.Message),
      at: m(t.at) || m(t.At),
      code: m(t.code) || m(t.Code),
      runID: n,
      correlationID: a,
      dispatchID: i
    });
  });
}
function ns(e) {
  return e ? le.get(e) : void 0;
}
function m(e) {
  return typeof e == "string" ? e.trim() : "";
}
function P(e) {
  return m(e).toLowerCase();
}
function as(e) {
  return !e || typeof e != "object" ? "" : p(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function Je(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function He(e) {
  const t = P(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function is(e, t) {
  const s = t && typeof t == "object" ? t : {}, r = Array.isArray(s.commands) ? s.commands : [], n = Array.isArray(s.diagnostics) ? s.diagnostics : [], a = Array.isArray(e.ui?.actions) ? e.ui.actions : [], i = /* @__PURE__ */ new Map();
  r.forEach((h) => {
    const g = m(h?.id);
    g && i.set(g, h);
  });
  const o = /* @__PURE__ */ new Map();
  a.forEach((h) => {
    const g = P(h?.id), f = m(h.payload?.command_id);
    g && f && !o.has(f) && o.set(f, h);
  });
  const l = [], d = /* @__PURE__ */ new Set(), u = (h) => {
    h && !d.has(h) && (d.add(h), l.push(h));
  };
  return r.forEach((h) => u(m(h?.id))), a.forEach((h) => u(m(h.payload?.command_id))), {
    entries: l.map((h) => {
      const g = i.get(h), f = o.get(h), y = f ? P(f.id) : "", E = !!(f && y && P(f.form?.renderer) === "formgen"), S = m(f?.label) || m(g?.label) || h, O = m(g?.group) || "Other", We = `${h} ${S} ${O} ${(Array.isArray(g?.tags) ? g.tags.map(m).filter(Boolean) : []).join(" ")}${E ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: E ? y : `cmd:${h}`,
        actionId: y,
        commandId: h,
        label: S,
        action: E ? f : void 0,
        descriptor: g,
        group: O,
        search: We,
        executable: E
      };
    }),
    diagnostics: n
  };
}
function os(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => {
    t.has(s.group) || t.set(s.group, []), t.get(s.group).push(s);
  }), Array.from(t.entries()).sort((s, r) => s[0].localeCompare(r[0])).map(([s, r]) => ({
    group: s,
    items: r.sort((n, a) => (n.commandId || n.label).localeCompare(a.commandId || a.label))
  }));
}
function ls(e) {
  const t = m(e.descriptor?.execution_mode), s = He(t), r = t ? `Execution: ${t}` : "Execution mode unknown", n = e.descriptor?.mutating === !0;
  let a;
  return e.executable ? n ? a = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : a = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : a = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}" role="option" aria-selected="false"
      data-cmdl-item="${p(e.key)}"
      data-cmdl-search="${p(e.search)}"
      title="${p(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${s}" title="${p(r)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${p(e.commandId || e.label)}</span>
      ${a}
    </button>`;
}
function cs(e, t) {
  const s = e.map((r) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${p(r.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${p(r.group)}</div>
        ${r.items.map(ls).join("")}
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
function ds(e) {
  return e.trim().replace(/^payload\./, "");
}
function us(e) {
  const t = e.action;
  if (!t) return "";
  const s = t.form, r = typeof s.html == "string" ? s.html : "", n = r.trim() !== "", a = m(t.submit_label) || "Run command", i = m(t.confirm_text), o = t.requires_confirm === !0, l = e.descriptor?.mutating === !0, d = s.sensitive === !0, u = `${n && !d ? `<div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${p(e.commandId)}">
      <div class="cmdl-recall__list" data-cmdl-recall-list></div>
      <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
    </div>` : ""}
    <div class="cmdl-form__fields" data-cmdl-fields data-cmdl-formgen-root data-operation-id="${p(m(s.operation_id))}">
      ${n ? r : '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>'}
    </div>
    <input type="hidden" data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
      data-cmdl-controller-payload${d ? ' data-action-field-sensitive="true"' : ""} value="{}">
    ${n && !d ? `<div class="cmdl-form__json" data-cmdl-json hidden>
      <textarea class="cmdl-json-editor" data-cmdl-json-editor rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
      <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
    </div>` : ""}`, h = o || i !== "", g = l ? '<span class="cmdl-form__note">Confirms before running</span>' : "", f = n && !d ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>' : "", y = d ? '<span class="cmdl-form__note">Sensitive values are never saved and must be re-entered</span>' : "", E = h ? `
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
      data-cmdl-confirm="${h ? "true" : "false"}"
      ${h ? 'data-action-confirm-inline="true"' : ""}
      data-action-payload='${as(t.payload)}'>
      ${u}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
		  <button type="submit" class="cmdl-btn cmdl-btn--run" disabled data-cmdl-formgen-submit>${p(a)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${f}
          ${g}
          ${y}
        </div>${E}
      </div>
    </form>`;
}
function hs(e) {
  const t = m(e.descriptor?.execution_mode), s = e.descriptor?.mutating === !0, r = m(e.descriptor?.summary), n = [];
  n.push(`<span class="cmdl-chip">${p(e.group)}</span>`), t && n.push(`<span class="cmdl-chip cmdl-chip--${He(t)}">${p(t)}</span>`), n.push(s ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || n.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let a;
  return e.executable ? a = `${s ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${us(e)}` : a = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${p(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${p(e.commandId || e.label)}</div>
        ${r ? `<div class="cmdl-cmd__summary">${p(r)}</div>` : ""}
        <div class="cmdl-cmd__chips">${n.join("")}</div>
      </div>
      ${a}
    </div>`;
}
function Le(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const s = P(t.severity) || "info", r = m(t.message), n = m(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${p(s)}">
          <span class="cmdl-diag__sev">${p(s)}</span>
          <span class="cmdl-diag__msg">${p(r)}${n ? ` <span class="cmdl-diag__code">${p(n)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function fs(e) {
  const { def: t, data: s } = e, { entries: r, diagnostics: n } = is(t, s), a = m((t.ui?.metadata && typeof t.ui.metadata == "object" ? t.ui.metadata : {}).option_resolver_action), i = a ? ` data-cmdl-option-resolver="${p(a)}"` : "";
  if (r.length === 0) return `
      <div class="cmdl" data-cmdl-root${i}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${Le(n)}
        <div class="cmdl-result" data-panel-action-result="${p(K)}"></div>
      </div>`;
  const o = os(r), l = r.map(hs).join("");
  return `
    <div class="cmdl" data-cmdl-root${i}>
      <div class="cmdl__body" data-cmdl-body>
        ${cs(o, r.length)}
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
      ${Le(n)}
    </div>`;
}
function T(e, t) {
  for (const s of t) {
    const r = e[s];
    if (typeof r == "string" && r.trim() !== "") return r.trim();
  }
  return "";
}
var ps = [
  "category",
  "text_code",
  "source",
  "stack_trace",
  "severity",
  "location",
  "metadata"
];
function ms(e, t) {
  const s = [];
  e && typeof e == "object" && !Array.isArray(e) && s.push(e.error, e), t && typeof t == "object" && !Array.isArray(t) && s.push(t.error, t);
  for (const r of s) if (r && typeof r == "object" && !Array.isArray(r)) {
    const n = r;
    if (ps.some((a) => a in n)) return n;
  }
  return null;
}
function De(e) {
  const t = e.lastIndexOf("/");
  return t >= 0 ? e.slice(t + 1) : e;
}
function Ie(e) {
  const t = e.split("/").filter(Boolean);
  return t.length > 2 ? t.slice(-2).join("/") : e;
}
function ke(e) {
  if (typeof e == "number") return e;
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function gs(e) {
  const t = e.metadata && typeof e.metadata == "object" && !Array.isArray(e.metadata) ? e.metadata : {}, s = Object.entries(t).map(([h, g]) => ({
    key: h,
    value: Je(g) || Ke(g)
  })).filter((h) => h.value), r = (Array.isArray(e.stack_trace) ? e.stack_trace : []).map((h) => {
    const g = m(h.function), f = m(h.file), y = ke(h.line);
    return {
      func: De(g),
      funcTitle: g,
      loc: f ? `${Ie(f)}${y ? `:${y}` : ""}` : "",
      locTitle: f ? `${f}${y ? `:${y}` : ""}` : "",
      app: f !== "" && !f.includes("/pkg/mod/")
    };
  }).filter((h) => h.func || h.loc), n = e.location && typeof e.location == "object" && !Array.isArray(e.location) ? e.location : {}, a = m(n.file), i = m(n.function), o = ke(n.line), l = a ? `${Ie(a)}${o ? `:${o}` : ""}` : "", d = [De(i), l ? `(${l})` : ""].filter(Boolean).join(" "), u = [i, a ? `${a}${o ? `:${o}` : ""}` : ""].filter(Boolean).join(" ");
  return {
    category: m(e.category),
    textCode: m(e.text_code),
    source: m(e.source),
    severity: m(e.severity),
    timestamp: m(e.timestamp),
    httpCode: typeof e.code == "number" ? String(e.code) : m(e.code),
    metadata: s,
    location: d,
    locationTitle: u,
    stackTrace: r
  };
}
function ys(e, t, s, r) {
  const n = s && typeof s == "object" ? s : {}, a = n.receipt && typeof n.receipt == "object" ? n.receipt : {}, i = (Array.isArray(n.validation_errors) ? n.validation_errors : []).map((y) => ({
    path: m(y.path),
    message: m(y.message),
    code: m(y.code)
  })).filter((y) => y.message || y.path), o = a.Accepted ?? a.accepted, l = typeof o == "boolean" ? o : void 0;
  let d = "ok";
  e === "error" ? d = "error" : (i.length > 0 || l === !1) && (d = "invalid");
  const u = d === "error" ? ms(s, r) : null, h = u ? gs(u) : null;
  let g = "";
  i.length > 0 ? g = "VALIDATION_ERROR" : d === "error" && (g = h && h.textCode || T(r || {}, ["code", "text_code"]) || (h ? h.httpCode : ""));
  const f = s != null && (typeof s != "object" || Object.keys(n).length > 0);
  return {
    kind: d,
    message: m(t) || (d === "error" ? "Command failed" : "Command dispatched"),
    code: g,
    correlationId: T(a, ["CorrelationID", "correlation_id"]),
    runId: T(a, ["RunID", "run_id"]) || T(n, ["run_id", "RunID"]),
    mode: T(a, ["Mode", "mode"]),
    dispatchId: T(a, ["DispatchID", "dispatch_id"]),
    statusReference: m(n.status_reference) || m(n.statusReference),
    accepted: l,
    validationErrors: i,
    richError: h,
    hasRaw: f,
    rawJSON: f ? Ke(s) : ""
  };
}
function Ke(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function bs(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function Es(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function A(e, t, s) {
  return s ? `<span class="cmdl-meta" title="${p(t)}"><span class="cmdl-meta__k">${p(e)}</span>${p(s)}</span>` : "";
}
function vs(e, t = {}) {
  const s = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", r = e.code ? `<span class="cmdl-result__code">${p(e.code)}</span>` : "", n = t.liveStatus, a = n ? `<span class="cmdl-result__live cmdl-result__live--${p(n.state)}" title="Live status${n.at ? ` · ${p(n.at)}` : ""}">${p(n.state)}</span>` : "", i = e.richError, o = [
    A("id", "Correlation ID", e.correlationId),
    A("mode", "Execution mode", e.mode),
    A("dispatch", "Dispatch ID", e.dispatchId),
    A("status", "Status reference", e.statusReference),
    A("took", "Round-trip duration", typeof t.durationMs == "number" ? bs(t.durationMs) : ""),
    A("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? Es(t.at) : ""),
    i ? A("category", "Category", i.category) : "",
    i ? A("severity", "Severity", i.severity) : "",
    i ? A("http", "HTTP status", i.httpCode) : "",
    ...i ? i.metadata.map((S) => A(S.key, S.key, S.value)) : [],
    i ? A("when", "Timestamp", i.timestamp) : "",
    i ? A("at", i.locationTitle || "Origin", i.location) : ""
  ].filter(Boolean).join(""), l = o ? `<div class="cmdl-result__meta">${o}</div>` : "", d = i && i.source && i.source !== e.message ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${p(i.source)}</code></div>` : "", u = i && i.stackTrace.length ? `<details class="cmdl-result__trace"><summary>Stack trace · ${i.stackTrace.length} frame${i.stackTrace.length === 1 ? "" : "s"}</summary><ol class="cmdl-trace">${i.stackTrace.map((S) => `<li class="cmdl-trace__frame${S.app ? " cmdl-trace__frame--app" : ""}"><span class="cmdl-trace__fn" title="${p(S.funcTitle)}">${p(S.func)}</span>${S.loc ? `<span class="cmdl-trace__loc" title="${p(S.locTitle)}">${p(S.loc)}</span>` : ""}</li>`).join("")}</ol></details>` : "", h = e.validationErrors.length ? `<ul class="cmdl-result__validation">${e.validationErrors.map((S) => `<li><span class="cmdl-result__path">${p(S.path || "payload")}</span><span class="cmdl-result__vmsg">${p(S.message || S.code)}</span></li>`).join("")}</ul>` : "", g = e.hasRaw ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${p(e.rawJSON)}</pre></details>` : "", f = t.commandRunsHref ? `<a class="cmdl-btn cmdl-btn--ghost" data-cmdl-command-runs href="${p(t.commandRunsHref)}">View command run</a>` : "", y = t.canRetry ? '<button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button>' : "", E = f || y ? `<div class="cmdl-result__actions">${f}${y}</div>` : "";
  return `
    <div class="cmdl-result__card cmdl-result__card--${e.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${p(s)}</span>
        ${r}${a}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${p(e.message)}</div>
      ${d}
      ${l}
      ${h}
      ${u}
      ${E}
      ${g}
    </div>`;
}
var te = /* @__PURE__ */ new WeakMap();
function Ve() {
  C.forEach((e) => {
    try {
      e.unsubscribe();
    } catch {
    }
    try {
      e.controller.destroy();
    } catch {
    }
  }), C.clear();
}
function Ss() {
  Ve();
}
function ws(e) {
  C.forEach((t, s) => {
    if (s !== e) {
      try {
        t.unsubscribe();
      } catch {
      }
      try {
        t.controller.destroy();
      } catch {
      }
      C.delete(s);
    }
  });
}
function Ps() {
  const e = globalThis, t = e.FormgenRelationships && typeof e.FormgenRelationships == "object" ? e.FormgenRelationships : {}, s = e.Formgen && typeof e.Formgen == "object" ? e.Formgen : void 0;
  return {
    ...t,
    Formgen: t.Formgen || s
  };
}
function j(e) {
  const t = P(e.dataset.actionId || "");
  return t ? C.get(t) : void 0;
}
function As(e, t) {
  const s = C.get(P(e));
  if (!s) return !1;
  const r = {};
  if (Object.entries(t || {}).forEach(([a, i]) => {
    const o = ds(a).replace(/^payload\./, "");
    if (o) {
      if (typeof i == "string") r[o] = i;
      else if (Array.isArray(i)) {
        const l = i.map(Je).filter(Boolean);
        l.length > 0 && (r[o] = l);
      }
    }
  }), s.controller.clearErrors(), Object.keys(r).length === 0) return !0;
  s.controller.setErrors(r);
  const n = Object.keys(r)[0];
  return s.controller.focus(n), !0;
}
function Cs(e, t) {
  const s = C.get(P(e));
  if (!s) return !1;
  const r = t.payload && typeof t.payload == "object" && !Array.isArray(t.payload) ? t.payload : t;
  s.controller.setValues(r);
  const n = s.controller.getValues();
  return I(s.form, n), M(s.form, n), !0;
}
function I(e, t) {
  const s = e.querySelector("[data-cmdl-controller-payload]");
  s && (s.value = JSON.stringify(t || {}));
}
function M(e, t) {
  const s = P(e.dataset.actionId || "");
  !s || k(e) || G.set(s, ze(t));
}
function ze(e) {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}
function se(e, t, s = "") {
  e.dataset.cmdlFormgenReady = t ? "true" : "false", e.querySelectorAll("[data-cmdl-formgen-submit]").forEach((n) => {
    n.disabled = !t;
  });
  let r = e.querySelector("[data-cmdl-formgen-error]");
  s && !r && (r = document.createElement("div"), r.dataset.cmdlFormgenError = "", r.className = "cmdl-form__runtime-error", e.querySelector("[data-cmdl-fields]")?.insertAdjacentElement("afterend", r)), r && (r.textContent = s, r.hidden = s === "");
}
function _s(e) {
  return { beforeFetch(t) {
    const s = xs(t.request.url);
    if (!s) return;
    const r = e.closest("[data-cmdl-root]"), n = m(r?.dataset.cmdlDebugPath), a = m(r?.dataset.cmdlOptionResolver);
    if (!n || !a) throw new Error("Dynamic command options are unavailable because no protected resolver action is configured.");
    const i = s.searchParams.get("command_id") || m(e.dataset.cmdlCommand), o = s.searchParams.get("field_path") || "", l = s.searchParams.get("source_id") || "";
    if (!i || !o || !l) throw new Error("Dynamic command option metadata is incomplete.");
    const d = j(e)?.controller.getValues() || pe(e), u = new Headers(t.request.init.headers || {});
    u.set("Accept", "application/json"), u.set("Content-Type", "application/json");
    const h = Ye();
    h && u.set("X-CSRF-Token", h), t.request.url = `${n}/api/panels/${K}/actions/${encodeURIComponent(a)}`, t.request.init.method = "POST", t.request.init.credentials = "same-origin", t.request.init.headers = u, t.request.init.body = JSON.stringify({
      command_id: i,
      field_path: o,
      source_id: l,
      payload: d
    });
  } };
}
function xs(e) {
  const t = e.startsWith(`/${xe}`) ? e.slice(1) : e;
  if (!t.startsWith(xe)) return null;
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
  if (j(e) && e.dataset.cmdlFormgenReady === "true") return Promise.resolve();
  const s = (async () => {
    const r = P(e.dataset.actionId || ""), n = e.querySelector("[data-cmdl-formgen-root]"), a = Ps();
    if (!r || !n || !a?.initFormgenRoot || !a.Formgen?.attach) {
      se(e, !1, "The form runtime is unavailable. Refresh after loading the formgen assets.");
      return;
    }
    const i = n.querySelector("[data-formgen-auto-init]") || n;
    try {
      const o = a.Formgen.attach(i), l = G.get(r);
      l && !k(e) && o.setValues(l), C.set(r, {
        form: e,
        root: i,
        controller: o,
        unsubscribe: () => {
        }
      }), I(e, o.getValues());
      const d = await a.initFormgenRoot(i, _s(e));
      if (!e.isConnected || H !== r) {
        o.destroy(), d.destroy(i), C.delete(r);
        return;
      }
      o.destroy();
      const u = a.Formgen.attach(i, { registry: d });
      l && !k(e) && u.setValues(l);
      const h = u.onChange((f) => {
        I(e, f), M(e, f);
      });
      C.set(r, {
        form: e,
        root: i,
        controller: u,
        unsubscribe: h
      });
      const g = u.getValues();
      I(e, g), M(e, g), se(e, !0);
    } catch (o) {
      const l = C.get(r);
      if (l?.form === e) {
        try {
          l.unsubscribe();
        } catch {
        }
        try {
          l.controller.destroy();
        } catch {
        }
        C.delete(r);
      }
      se(e, !1, o instanceof Error ? o.message : "Unable to initialize the generated form.");
    } finally {
      te.delete(e);
    }
  })();
  return te.set(e, s), s;
}
function X(e, t) {
  H = t, ws(t);
  const s = e.querySelector("[data-cmdl-empty]");
  s && (s.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((n) => {
    n.hidden = n.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((n) => {
    const a = n.dataset.cmdlItem === t;
    n.classList.toggle("cmdl-item--active", a), n.setAttribute("aria-selected", a ? "true" : "false");
  });
  const r = e.querySelector(`[data-cmdl-detail="${Ge(t)}"]`);
  if (r) {
    const n = r.querySelector("[data-panel-action-form]");
    n && he(n);
  }
}
function Te(e, t) {
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
function qe(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => !t.hidden);
}
function Os(e) {
  if (!P(e.dataset.actionId || "")) return;
  const t = j(e)?.controller?.getValues() || pe(e);
  I(e, t), M(e, t);
}
var Rs = 6;
function W() {
  try {
    return typeof localStorage < "u" ? localStorage : null;
  } catch {
    return null;
  }
}
function N(e) {
  const t = W();
  if (!t) return [];
  try {
    const s = t.getItem(e), r = s ? JSON.parse(s) : [];
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
function ce(e, t) {
  const s = W();
  if (s)
    try {
      s.setItem(e, JSON.stringify(t));
    } catch {
    }
}
function fe(e) {
  return `cmdl:recent:${e}`;
}
function F(e) {
  return `cmdl:preset:${e}`;
}
function $s(e) {
  const t = e && typeof e == "object" ? e : {}, s = m(t.command_id), r = t.payload && typeof t.payload == "object" ? t.payload : {};
  if (!s || Object.keys(r).length === 0) return;
  const n = fe(s), a = JSON.stringify(r), i = N(n).filter((o) => JSON.stringify(o.payload) !== a);
  i.unshift({
    at: Date.now(),
    payload: r
  }), ce(n, i.slice(0, Rs));
}
function Qe(e) {
  return k(e) ? {} : j(e)?.controller.getValues() || pe(e);
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
function Xe(e, t) {
  const s = j(e);
  if (s) {
    s.controller.setValues(t), I(e, s.controller.getValues()), M(e, s.controller.getValues());
    return;
  }
  const r = P(e.dataset.actionId || "");
  r && !k(e) && G.set(r, ze(t)), he(e);
}
function de(e) {
  const t = m(e.dataset.cmdlCommand), s = e.querySelector("[data-cmdl-recall-list]");
  if (!t || !s) return;
  const r = N(fe(t)), n = N(F(t)), a = [];
  r.forEach((i, o) => {
    a.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${o}" title="Reload recent invocation ${o + 1}">↻ recent ${o + 1}</button>`);
  }), n.forEach((i, o) => {
    const l = m(i.name) || `preset ${o + 1}`;
    a.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${o}" title="Load saved preset">★ ${p(l)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${o}" aria-label="Delete preset ${p(l)}">×</button></span>`);
  }), s.innerHTML = a.length ? a.join("") : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}
function Ls(e, t) {
  const s = e.closest("[data-cmdl-load]");
  if (s) {
    const a = s.closest("[data-panel-action-form]"), i = m(s.closest("[data-cmdl-recall]")?.dataset.cmdlCommand), [o, l] = (s.dataset.cmdlLoad || "").split(":"), d = Number(l);
    if (a && i && Number.isInteger(d)) {
      const u = N(o === "preset" ? F(i) : fe(i))[d]?.payload;
      u && typeof u == "object" && Xe(a, u);
    }
    return !0;
  }
  const r = e.closest("[data-cmdl-save-preset]");
  if (r) {
    const a = r.closest("[data-panel-action-form]"), i = r.closest("[data-cmdl-recall]"), o = m(i?.dataset.cmdlCommand);
    if (a && i && o) {
      const l = (typeof window < "u" && typeof window.prompt == "function" ? window.prompt("Preset name") : "") || "";
      if (l.trim()) {
        const d = N(F(o)).filter((u) => m(u.name) !== l.trim());
        d.unshift({
          name: l.trim(),
          payload: Qe(a)
        }), ce(F(o), d), de(i);
      }
    }
    return !0;
  }
  const n = e.closest("[data-cmdl-del-preset]");
  if (n) {
    const a = n.closest("[data-cmdl-recall]"), i = m(a?.dataset.cmdlCommand), o = Number(n.dataset.cmdlDelPreset);
    if (a && i && Number.isInteger(o)) {
      const l = N(F(i));
      l.splice(o, 1), ce(F(i), l), de(a);
    }
    return !0;
  }
  return !1;
}
function Ds(e, t) {
  if (k(e)) return;
  const s = e.querySelector("[data-cmdl-fields]"), r = e.querySelector("[data-cmdl-json]"), n = e.querySelector("[data-cmdl-json-editor]"), a = e.querySelector("[data-cmdl-json-toggle]"), i = e.querySelector("[data-cmdl-json-error]");
  if (!s || !r || !n) return;
  if (t) {
    n.value = JSON.stringify(Qe(e), null, 2), i && (i.hidden = !0), s.hidden = !0, r.hidden = !1, e.dataset.cmdlMode = "json", a && (a.textContent = "Form");
    return;
  }
  let o;
  try {
    o = n.value.trim() ? JSON.parse(n.value) : {};
  } catch (l) {
    i && (i.textContent = `Invalid JSON: ${l.message}`, i.hidden = !1);
    return;
  }
  if (!o || typeof o != "object" || Array.isArray(o)) {
    i && (i.textContent = "Payload must be a JSON object.", i.hidden = !1);
    return;
  }
  Xe(e, o), s.hidden = !1, r.hidden = !0, e.dataset.cmdlMode = "form", a && (a.textContent = "JSON");
}
function Is() {
  const e = W();
  if (!e) return 0;
  try {
    const t = Number(e.getItem(Ue));
    return Number.isFinite(t) && t >= ue ? t : 0;
  } catch {
    return 0;
  }
}
function ks(e) {
  const t = e.clientWidth || 0;
  return t > 0 ? Math.max(ue, t - ss) : ts;
}
function re(e, t) {
  const s = Math.min(Math.max(Math.round(t), ue), ks(e));
  D = s, e.style.setProperty("--cmdl-sidebar-w", `${s}px`);
  const r = W();
  if (r) try {
    r.setItem(Ue, String(s));
  } catch {
  }
  return s;
}
function Ts(e) {
  D || (D = Is()), D && e.style.setProperty("--cmdl-sidebar-w", `${D}px`);
}
function qs(e) {
  const t = e.querySelector("[data-cmdl-resizer]"), s = e.querySelector("[data-cmdl-body]");
  !t || !s || (Ts(s), t.addEventListener("pointerdown", (r) => {
    r.preventDefault();
    const n = r.clientX, a = D || Oe;
    if (typeof t.setPointerCapture == "function") try {
      t.setPointerCapture(r.pointerId);
    } catch {
    }
    const i = (l) => re(s, a + (l.clientX - n)), o = (l) => {
      re(s, a + (l.clientX - n)), t.removeEventListener("pointermove", i), t.removeEventListener("pointerup", o), t.removeEventListener("pointercancel", o);
    };
    t.addEventListener("pointermove", i), t.addEventListener("pointerup", o), t.addEventListener("pointercancel", o);
  }), t.addEventListener("keydown", (r) => {
    r.key !== "ArrowLeft" && r.key !== "ArrowRight" || (r.preventDefault(), re(s, (D || Oe) + (r.key === "ArrowRight" ? Re : -Re)));
  }));
}
function ne(e, t) {
  const s = e.querySelector("[data-cmdl-bar-main]"), r = e.querySelector("[data-cmdl-confirm-row]");
  if (!s || !r) return;
  s.hidden = t, r.hidden = !t;
  const n = t ? r.querySelector("[data-cmdl-confirm-run]") : s.querySelector("button");
  if (n && typeof n.focus == "function") try {
    n.focus();
  } catch {
  }
}
function Fs(e, t = {}) {
  const s = e.querySelector("[data-cmdl-root]");
  if (!s) return;
  Ve(), s.dataset.cmdlDebugPath = m(t.debugPath), qs(s), s.querySelectorAll("[data-cmdl-recall]").forEach((n) => de(n));
  const r = s.querySelector("[data-cmdl-filter]");
  r && Q && (r.value = Q, Te(s, Q)), H && s.querySelector(`[data-cmdl-item="${Ge(H)}"]`) && X(s, H), s.addEventListener("click", (n) => {
    const a = n.target;
    if (Ls(a, s)) return;
    const i = a.closest("[data-cmdl-json-toggle]");
    if (i) {
      const u = i.closest("[data-panel-action-form]");
      u && Ds(u, u.dataset.cmdlMode !== "json");
      return;
    }
    const o = a.closest("[data-cmdl-confirm-run]");
    if (o) {
      const u = o.closest("[data-panel-action-form]");
      u && (u.dataset.cmdlArmed = "true");
      return;
    }
    const l = a.closest("[data-cmdl-cancel]");
    if (l) {
      const u = l.closest("[data-panel-action-form]");
      u && (delete u.dataset.cmdlArmed, ne(u, !1));
      return;
    }
    const d = a.closest("[data-cmdl-item]");
    if (d) {
      X(s, d.dataset.cmdlItem || "");
      return;
    }
  }), r && (r.addEventListener("input", () => {
    Q = r.value, Te(s, r.value);
  }), r.addEventListener("keydown", (n) => {
    if (n.key === "ArrowDown" || n.key === "Enter") {
      const a = qe(s)[0];
      a && (n.preventDefault(), n.key === "Enter" ? X(s, a.dataset.cmdlItem || "") : a.focus());
    }
  })), s.addEventListener("submit", (n) => {
    const a = n.target?.closest("[data-panel-action-form]");
    if (a) {
      if (a.dataset.cmdlFormgenReady !== "true") {
        n.preventDefault(), n.stopImmediatePropagation(), he(a);
        return;
      }
      if (a.dataset.cmdlConfirm === "true" && a.dataset.cmdlArmed !== "true") {
        n.preventDefault(), n.stopImmediatePropagation(), ne(a, !0);
        return;
      }
      Os(a), a.dataset.cmdlConfirm === "true" && (delete a.dataset.cmdlArmed, ne(a, !1));
    }
  }, !0), s.addEventListener("keydown", (n) => {
    const a = n.target.closest("[data-cmdl-item]");
    if (a && (n.key === "ArrowDown" || n.key === "ArrowUp")) {
      n.preventDefault();
      const i = qe(s), o = i.indexOf(a), l = i[n.key === "ArrowDown" ? o + 1 : o - 1];
      l ? l.focus() : n.key === "ArrowUp" && r && r.focus();
      return;
    }
    a && n.key === "Enter" && (n.preventDefault(), X(s, a.dataset.cmdlItem || ""));
  }), s.addEventListener("reset", (n) => {
    const a = n.target, i = P(a.dataset.actionId || "");
    i && G.delete(i), window.setTimeout(() => {
      const o = j(a);
      if (o) {
        o.controller.reset();
        const l = o.controller.getValues();
        I(a, l), M(a, l);
      }
    }, 0);
  });
}
function Ge(e) {
  return e.replace(/["\\]/g, "\\$&");
}
Lt(K, fs);
var Fe = "debug-console-active-panel", Ne = "debug-console-panel-order", Ns = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, Me = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, Ms = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : Dt(), ae = (e, t) => Yt(e, t), js = (e, t, s) => {
  if (!e || !t) return;
  const r = t.split(".").map((a) => a.trim()).filter(Boolean);
  if (r.length === 0) return;
  let n = e;
  for (let a = 0; a < r.length - 1; a += 1) {
    const i = r[a];
    (!n[i] || typeof n[i] != "object") && (n[i] = {}), n = n[i];
  }
  n[r[r.length - 1]] = s;
}, ie = (e, t) => {
  if (!e) return t;
  const s = Number(e);
  return Number.isNaN(s) ? t : s;
}, je = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, Bs = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.logsExpanded = /* @__PURE__ */ new Set(), this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.pauseButton = null, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.commandRunStateGeneration = 0, this.container = e;
    const t = Ms(Me(e.dataset.panels));
    t.includes("sessions") || t.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(t), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = ie(e.dataset.maxLogEntries, 500), this.maxSQLQueries = ie(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = ie(e.dataset.slowThresholdMs, 50), this.replCommands = Rt(Me(e.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), At.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = Z(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.sqlView = new tt({
      styles: w,
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
    }), this.logsView = new Y({
      styles: w,
      keyOf: Ee,
      renderRow: (s) => ct(s, w, {
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
    }), this.requestsView = new Y({
      styles: w,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: st,
      renderRow: (s) => gt(s, w, {
        expandedRequestIds: this.expandedRequests,
        truncatePath: !1,
        slowThresholdMs: this.slowThresholdMs
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.requestEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => at(s, this.expandedRequests, { useIconFeedback: !0 })
    }), this.jserrorsView = new Y({
      styles: w,
      keyOf: dt,
      renderRow: (s) => pt(s, w, { compact: !1 }),
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
    }), this.registryLiveList = new ut({
      styles: w,
      getRenderOptions: () => ({}),
      shouldDisplay: (s, r) => {
        if (!s.applyFilters) return !0;
        const n = this.getPanelFilterState(s.id, s), a = s.applyFilters([r], n);
        return Array.isArray(a) ? a.length > 0 : !0;
      },
      onNeedFullRender: () => this.renderPanel()
    }), this.bindActions(), this.updateSessionBanner(), this.stream = new ge({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = $.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder(), await It(this.debugPath), this.eventToPanel = Z(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const s of xt(t)) e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null, t = null;
    try {
      e = this.normalizeStoredPanelID(sessionStorage.getItem(Fe));
      const s = new URLSearchParams(window.location.search);
      t = this.normalizeStoredPanelID(s.get("panel"));
      const r = Se(s.toString());
      !t && (r.runID || r.correlationID) && this.panels.includes("command_runs") && (t = "command_runs"), t === "command_runs" && Pe(r);
    } catch {
      e = null, t = null;
    }
    this.activePanel = t || e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(Fe, this.activePanel);
    } catch {
    }
  }
  replacePanelURL(e, t = "", s = "") {
    try {
      const r = window.location.href, n = e === "command_runs" ? ve(r, {
        runID: t,
        correlationID: s
      }) : (() => {
        const a = new URL(r);
        return a.searchParams.set("panel", e), a.searchParams.delete("run_id"), a.searchParams.delete("correlation_id"), `${a.pathname}${a.search}${a.hash}`;
      })();
      window.history.replaceState(window.history.state, "", n);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(Ne, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const e = this.panelOrderPreferencesPath.trim();
    if (!e) return !1;
    try {
      const t = await R(e, {
        method: "GET",
        credentials: "same-origin"
      });
      if (!t.ok) return !1;
      const s = await B(t);
      return !s?.available || !s.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(s.panel_order), this.savedPanelOrder.length > 0);
    } catch {
      return !1;
    }
  }
  async saveServerPanelOrderPreference(e) {
    const t = this.panelOrderPreferencesPath.trim();
    if (t)
      try {
        await R(t, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: e }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const e = localStorage.getItem(Ne);
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
    return !t || !Ns.test(t) ? null : t;
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
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = et.create(this.tabsEl, {
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
    this.eventToPanel = Z(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((a) => a !== t), delete this.customFilterState[t]), this.applyPanelOrder();
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
      !r || r === this.activePanel || (this.activePanel = r, this.persistActivePanel(), this.replacePanelURL(r), this.renderActivePanel());
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
      const n = r.dataset.doctorActionRun || "", a = r.dataset.doctorActionConfirm || "", i = r.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(n, a, i);
    }), this.panelEl.addEventListener(wt, (e) => {
      if (this.activePanel !== "command_runs") return;
      const t = e.detail, s = typeof t?.runID == "string" ? t.runID : "";
      s && this.replacePanelURL("command_runs", s);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const s = t === this.activePanel ? "debug-tab--active" : "", r = vt(Ot(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${p(t)}">
            ${r}
            <span class="debug-tab__label">${p(Ae(t))}</span>
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
      const r = $.get(e);
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
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), s = $.get(e);
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
    const s = t || $.get(e);
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
    else if (e === "jserrors") s = ft(this.state.extra.jserrors || [], w, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const n = $.get(e);
      if (n && (n.renderConsole || n.render)) {
        const a = V(n);
        let i = this.getStateForKey(a);
        if (n.applyFilters) {
          const o = this.getPanelFilterState(e, n);
          i = n.applyFilters(i, o);
        } else if (!n.renderFilters && n.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && i && typeof i == "object" && !Array.isArray(i) && (i = ae(i, o));
        }
        s = (n.renderConsole || n.render)(i, w, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(Ae(e), this.state.extra[e], this.filters.objects.search);
    }
    Ss(), this.panelEl.innerHTML = s, e === "logs" && this.applyLogsAutoScroll(), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && this.requestsView.adopt(this.panelEl), e === "sql" && this.mountSQLView(), e === "logs" && this.logsView.adopt(this.panelEl), e === "jserrors" && this.jserrorsView.adopt(this.panelEl);
    const r = $.get(e);
    r && this.registryLiveList.handles(r) && this.registryLiveList.adopt(r, this.panelEl), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && Fs(this.panelEl, { debugPath: this.debugPath }), this.renderStoredPanelActionResult(e);
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
    const o = s || be(e);
    let l = o;
    r === "commands" && e instanceof HTMLFormElement && (l = be(e, { excludeSensitive: !0 }), k(e) ? this.commandLauncherLastPayloads.delete(n) : this.commandLauncherLastPayloads.set(n, je(o))), t && (t.disabled = !0);
    const d = Date.now();
    try {
      const u = await R(`${this.debugPath}/api/panels/${encodeURIComponent(r)}/actions/${encodeURIComponent(n)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!u.ok) {
        const g = await Ze(u, `Action failed (${u.status})`, { appendStatusToFallback: !1 });
        this.showPanelActionResult(r, "error", g.message, n, g.payload, void 0, {
          at: Date.now(),
          durationMs: Date.now() - d
        });
        return;
      }
      const h = await B(u);
      this.showPanelActionResult(r, h.ok === !1 ? "error" : "ok", h.message || (h.ok === !1 ? "Action failed" : "Action complete"), n, h.data, h.errors, {
        at: Date.now(),
        durationMs: Date.now() - d
      }), r === "commands" && $s(l), h.event && this.handleEvent(h.event), h.refresh && await this.fetchSnapshot();
    } catch (u) {
      const h = u instanceof Error ? u.message : "Action failed";
      this.showPanelActionResult(r, "error", h, n, void 0, void 0, {
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
      const o = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((l) => l.dataset.panelActionResult === "commands");
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
      const a = ys(t.status, t.message, t.data, t.errors), i = {};
      a.validationErrors.forEach((u) => {
        u.path && (i[u.path] = u.message || u.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(i, t.errors), (!t.actionID || !As(t.actionID, i)) && this.renderPanelActionErrors(i, t.actionID);
      const o = !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)), l = ns(a.correlationId || a.runId || a.dispatchId), d = a.runId || l?.runID || a.correlationId || l?.correlationID ? ve(window.location.href, {
        runID: a.runId || l?.runID,
        correlationID: a.correlationId || l?.correlationID
      }) : "";
      s.innerHTML = vs(a, {
        canRetry: o,
        at: t.at,
        durationMs: t.durationMs,
        liveStatus: l,
        commandRunsHref: d
      }), this.attachCommandLauncherResultActions(s, t.actionID);
      return;
    }
    const r = this.renderPanelActionErrors(t.errors, t.actionID), n = t.data === void 0 ? "" : `<pre class="${w.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${p(_t(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${t.status === "error" ? w.badgeError : w.badge}">${p(t.message)}</div>${r}${n}`;
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
    r && (Cs(e, s), this.runPanelAction(r, t, je(s)));
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
      const r = decodeURIComponent(e.dataset.doctorActionState || ""), n = r ? JSON.parse(r) : {};
      n && typeof n == "object" && !Array.isArray(n) && (s = n);
    } catch {
      s = {};
    }
    this.activePanel = t, this.persistActivePanel(), this.renderActivePanel(), this.applyDoctorNavigationState(t, s);
  }
  applyDoctorNavigationState(e, t) {
    mt(this.panelEl, e, t);
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
      const i = r.trim(), o = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((l) => t && l.dataset.actionId !== t ? !1 : l.dataset.actionFieldError === i || l.dataset.actionFieldName === i || l.dataset.actionFieldError === `payload.${i}`);
      if (o) {
        o.textContent = a, o.hidden = !1;
        return;
      }
      s.push(a);
    }), s.length === 0 ? "" : `<ul class="${w.badgeError}" style="margin-top:0.5rem">${s.map((r) => `<li>${p(r)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    nt(this.panelEl);
  }
  attachCopyButtonListeners() {
    rt(this.panelEl, { useIconFeedback: !0 });
  }
  mountSQLView() {
    this.sqlView.adopt(this.panelEl);
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new Et({
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
    return t.length === 0 ? this.renderEmptyState("No requests captured yet.") : it(t, w, {
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
    return t.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : ot(t, w, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  logEntryMatchesFilters(e) {
    const { level: t, search: s } = this.filters.logs;
    return !(t !== "all" && (e.level || "").toLowerCase() !== t || s && !bt(e).includes(s.toLowerCase()));
  }
  applyLogsAutoScroll() {
    this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight);
  }
  renderLogs() {
    const { newestFirst: e } = this.filters.logs, t = this.state.logs.filter((s) => this.logEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No logs captured yet.") : yt(t, w, {
      newestFirst: e,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1,
      expandable: !0
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e) return !1;
      const a = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(s && !a.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : lt(r, w, { showName: !0 });
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
      const i = a.session_id || "", o = a.username || a.user_id || "Unknown", l = Tt(a.last_activity || a.started_at), d = z(a.request_count ?? 0), u = !!i && i === this.activeSessionId, h = u ? "detach" : "attach", g = u ? "Detach" : "Attach", f = u ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", y = u ? "debug-session-row debug-session-row--active" : "debug-session-row", E = a.current_page || "-", S = a.ip || "-";
      return `
          <tr class="${y}">
            <td>
              <div class="debug-session-user">${p(o)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${p(i || "-")}</span>
              </div>
            </td>
            <td>${p(S)}</td>
            <td>
              <span class="debug-session-path">${p(E)}</span>
            </td>
            <td>${p(l || "-")}</td>
            <td>${p(d)}</td>
            <td>
              <button class="${f}" data-session-action="${h}" data-session-id="${p(i)}">
                ${g}
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
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : ht(this.state.custom, w, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (r) => ae(r, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const r = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    return r && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !r && !n && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : Pt(e, t, w, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (a) => ae(a, s) : void 0
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
        const t = await R(`${this.debugPath}/api/sessions`, { credentials: "same-origin" });
        if (!t.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const s = await B(t);
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
    }, this.expandedRequests.clear(), this.logsExpanded.clear(), this.jserrorsExpanded.clear(), St(), Pe(Se(window.location.search)), this.commandRunStateGeneration += 1, this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
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
      const t = $.get(e);
      if (t) {
        const s = V(t);
        return Ct({ [s]: this.getStateForKey(s) }, t);
      }
    }
    switch (e) {
      case "template":
        return J(this.state.template);
      case "session":
        return J(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return J(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return J(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return J(this.state.extra[e]);
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
      rs(e.payload), this.activePanel === "commands" && this.renderStoredPanelActionResult("commands");
      return;
    }
    const t = this.eventToPanel[e.type] || e.type, s = $.get(t);
    if (s) {
      const r = V(s), n = this.getStateForKey(r), a = (s.handleEvent || ((i, o) => qt(i, o, this.maxLogEntries)))(n, e.payload);
      this.setStateForKey(r, a), r === "command_runs" && (this.commandRunStateGeneration += 1, we(a));
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
        $t(t) || (this.state.extra[t] = e.payload);
        break;
    }
    if (this.updateTabCounts(), t === this.activePanel) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(s)) {
      const r = this.getStateForKey(V(s)), n = s.liveList?.updateMode === "upsert" ? e.payload : Array.isArray(r) ? r[r.length - 1] : void 0;
      this.registryLiveList.enqueue(s, n);
    } else this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        js(this.state.custom.data, String(e.key), e.value);
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
  applySnapshot(e, t) {
    const s = e || {}, r = this.state.extra.command_runs, n = t !== void 0 && t !== this.commandRunStateGeneration;
    this.state.template = s.template || {}, this.state.session = s.session || {}, this.state.requests = U(s.requests), this.state.sql = U(s.sql), this.state.logs = U(s.logs), this.reconcileLogExpansion(), this.state.config = s.config || {}, this.state.routes = U(s.routes);
    const a = s.custom || {};
    this.state.custom = {
      data: a.data || {},
      logs: U(a.logs)
    };
    const i = /* @__PURE__ */ new Set([
      "template",
      "session",
      "requests",
      "sql",
      "logs",
      "config",
      "routes",
      "custom"
    ]), o = {};
    this.panels.forEach((l) => {
      !i.has(l) && l in s && (o[l] = s[l]);
    }), n && (r !== void 0 ? o.command_runs = r : delete o.command_runs), this.state.extra = o, this.commandRunStateGeneration += 1, we(o.command_runs, !0), this.updateTabCounts(), this.renderPanel();
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
    return kt(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (!this.debugPath || this.activeSessionId) return;
    const e = this.commandRunStateGeneration;
    try {
      const t = await R(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
      if (!t.ok) return;
      const s = await B(t);
      this.applySnapshot(s, e);
    } catch {
    }
  }
  clearAll() {
    this.debugPath && (this.logsExpanded.clear(), this.stream.clear(), !this.activeSessionId && R(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const e = this.activePanel;
    e === "logs" && this.logsExpanded.clear(), this.stream.clear([e]), !this.activeSessionId && R(`${this.debugPath}/api/clear/${e}`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    });
  }
  async parseJSONResponse(e) {
    const t = await B(e);
    return t && typeof t == "object" ? t : null;
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
      const a = await R(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), i = await this.parseJSONResponse(a);
      if (!a.ok) {
        const l = this.responseMessage(i, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${a.status})`;
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
}, Us = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new Bs(t) : null;
}, Be = () => {
  Us();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", Be) : Be();
export {
  zs as DATA_ATTRS,
  yr as DEBUG_ICON_REFS,
  Bs as DebugPanel,
  ge as DebugStream,
  ar as INTERACTION_CLASSES,
  Y as LiveListView,
  ut as RegistryLiveListManager,
  Gs as RemoteDebugStream,
  tt as SqlLiveView,
  Er as appendListRow,
  hr as appendSqlRowDOM,
  Tr as applyCustomEventPayload,
  Hr as applyDebugEventToSnapshot,
  mt as applyPanelActionNavigation,
  lr as applyPanelActionPayload,
  rt as attachCopyListeners,
  nt as attachExpandableRowListeners,
  at as attachRequestDetailListeners,
  me as attachRowExpansion,
  Z as buildEventToPanel,
  Pr as commandRunKey,
  wr as commandRunRevision,
  wt as commandRunSelectionEvent,
  Br as commandRunTerminal,
  ve as commandRunsNavigationHref,
  jr as commandRunsSelection,
  w as consoleStyles,
  Ws as copyToClipboard,
  J as countPayload,
  Gr as defaultGetCount,
  qt as defaultHandleEvent,
  dr as doctorNavigation,
  p as escapeHTML,
  Nr as evictListOverflow,
  Qs as evictSqlOverflow,
  qr as fetchDebugSnapshot,
  zr as formatDuration,
  _t as formatJSON,
  z as formatNumber,
  Tt as formatTimestamp,
  mr as getDebugIconRef,
  Dt as getDefaultPanels,
  Xr as getDefaultToolbarPanels,
  Fr as getLevelClass,
  Ct as getPanelCount,
  Wr as getPanelData,
  xt as getPanelEventTypes,
  Ot as getPanelIcon,
  Ae as getPanelLabel,
  V as getSnapshotKey,
  Mr as getStatusClass,
  Ys as getStyleConfig,
  Ur as getToolbarCounts,
  Qr as hashString,
  Us as initDebugPanel,
  $t as isKnownPanel,
  Yr as isSchemaListRenderer,
  kt as isSlowDuration,
  dt as jsErrorRowKey,
  Ee as logRowKey,
  bt as logSearchText,
  Sr as normalizeEventTypes,
  Rt as normalizeReplCommands,
  Vr as panelDefinitionFromServer,
  $ as panelRegistry,
  Se as parseCommandRunsNavigation,
  we as reconcileCommandRunsRows,
  Rr as renderCommandRunRow,
  Ar as renderCommandRunsPanel,
  ht as renderCustomPanel,
  gr as renderDebugIcon,
  vt as renderDebugIconRef,
  rr as renderDoctorPanel,
  or as renderDoctorPanelCompact,
  pt as renderErrorRow,
  ft as renderJSErrorsPanel,
  Pt as renderJSONPanel,
  kr as renderJSONViewer,
  ct as renderLogRow,
  yt as renderLogsPanel,
  $r as renderPanelContent,
  ur as renderPermissionsPanel,
  nr as renderPermissionsPanelCompact,
  gt as renderRequestRow,
  it as renderRequestsPanel,
  lt as renderRoutesPanel,
  ot as renderSQLPanel,
  Xs as renderSQLRow,
  er as renderSQLRowsHTML,
  vr as renderSchemaIdentity,
  Dr as renderSchemaKeyValue,
  _r as renderSchemaListRow,
  Lr as renderSchemaMetrics,
  Ir as renderSchemaStatusList,
  Cr as renderSchemaTable,
  xr as renderSchemaTimeline,
  sr as renderSiteRenderCachePanel,
  cr as renderSiteRenderCachePanelCompact,
  At as replPanelIDs,
  st as requestRowKey,
  St as resetCommandRunsState,
  ye as restoreRowExpansion,
  Kr as schemaRowKey,
  Or as selectCommandRun,
  Zs as serializeLogEntry,
  Pe as setCommandRunsNavigationTarget,
  tr as sqlRowKey,
  ir as toolbarStyles,
  Jr as truncate
};

//# sourceMappingURL=index.js.map