import { escapeHTML as u } from "../shared/html.js";
import { httpRequest as L, readExpectedHTTPJSON as H, readHTTPErrorResult as Ye } from "../shared/transport/http-client.js";
import { t as it } from "../chunks/sortable.esm-CcMbOE-M.js";
import { A as ot, B as Oe, C as dr, D as lt, E as ur, F as hr, I as ct, L as pr, M as fr, N as dt, O as ut, P as mr, R as gr, S as w, T as yr, V as br, _ as ht, a as Er, b as pt, c as vr, d as ft, f as mt, g as gt, h as yt, i as Sr, k as bt, l as Et, m as vt, n as We, o as wr, p as St, r as Ar, s as Pr, t as ye, u as wt, v as At, w as _r, x as Pt, y as _t, z as $r } from "../chunks/builtin-panels-DOTy-NEd.js";
import { t as $t } from "../chunks/repl-panel-Dvtc4bMw.js";
import { i as xt, n as Or, r as Lr, t as kr } from "../chunks/icons-B_VaFfsl.js";
import { A as Dr, B as Q, C as Rr, D as Ir, E as qr, F as Mr, G as Z, I as Fr, J as jr, K as Ct, L as Nr, M as Ot, N as Br, O as Ur, P as ce, S as ee, T as Hr, U as Jr, V as X, W as Le, X as Kr, Y as Lt, _ as kt, a as zr, b as Tt, c as Vr, d as Dt, f as Rt, g as It, h as qt, i as Mt, j as Qr, k as Xr, l as Ft, m as Yr, n as jt, o as Wr, p as ke, q as Gr, r as Zr, s as de, u as ea, v as ta, w as R, x as sa, y as Nt } from "../chunks/server-definitions-BeRQu0qp.js";
var Bt = class {
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
}, Ut = class {
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
      const p = (g) => n.right_a && g.right_a ? r > g.prec : r <= g.prec;
      for (; a.length > 2 && p(a[a.length - 2]); )
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
}, Ht = new Bt();
Object.assign(_, {
  hooks: Ht,
  plugins: new Ut(_),
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
var D = (e) => new _(e).parse(), Jt = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(_).filter((e) => !Jt.includes(e) && D[e] === void 0).forEach((e) => {
  D[e] = _[e];
});
D.Jsep = _;
var Kt = "ConditionalExpression";
D.plugins.register({
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
            type: Kt,
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
var Te = 47, zt = 92, Vt = {
  name: "regex",
  init(e) {
    e.hooks.add("gobble-token", function(s) {
      if (this.code === Te) {
        const r = ++this.index;
        let a = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === Te && !a) {
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
          this.code === e.OBRACK_CODE ? a = !0 : a && this.code === e.CBRACK_CODE && (a = !1), this.index += this.code === zt ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, ue = 43, J = {
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
  updateOperators: [ue, 45],
  assignmentPrecedence: 0.9,
  init(e) {
    const t = [e.IDENTIFIER, e.MEMBER_EXP];
    J.assignmentOperators.forEach((r) => e.addBinaryOp(r, J.assignmentPrecedence, !0)), e.hooks.add("gobble-token", function(a) {
      const n = this.code;
      J.updateOperators.some((i) => i === n && i === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, a.node = {
        type: "UpdateExpression",
        operator: n === ue ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!a.node.argument || !t.includes(a.node.argument.type)) && this.throwError(`Unexpected ${a.node.operator}`));
    }), e.hooks.add("after-token", function(a) {
      if (a.node) {
        const n = this.code;
        J.updateOperators.some((i) => i === n && i === this.expr.charCodeAt(this.index + 1)) && (t.includes(a.node.type) || this.throwError(`Unexpected ${a.node.operator}`), this.index += 2, a.node = {
          type: "UpdateExpression",
          operator: n === ue ? "++" : "--",
          argument: a.node,
          prefix: !1
        });
      }
    }), e.hooks.add("after-expression", function(a) {
      a.node && s(a.node);
    });
    function s(r) {
      J.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((a) => {
        a && typeof a == "object" && s(a);
      });
    }
  }
};
D.plugins.register(Vt, J);
D.addUnaryOp("typeof");
D.addLiteral("null", null);
D.addLiteral("undefined", void 0);
var Qt = /* @__PURE__ */ new Set([
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
      const a = e.body[r];
      s = v.evalAst(a, t);
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
    if (!Object.hasOwn(r, s) && Qt.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    const a = r[s];
    return typeof a == "function" ? a.bind(r) : a;
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
}, Xt = class {
  constructor(e) {
    this.code = e, this.ast = D(this.code);
  }
  runInNewContext(e) {
    const t = Object.assign(/* @__PURE__ */ Object.create(null), e);
    return v.evalAst(this.ast, t);
  }
};
function I(e, t) {
  return e = e.slice(), e.push(t), e;
}
function be(e, t) {
  return t = t.slice(), t.unshift(e), t;
}
var Yt = class extends Error {
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
};
function E(e, t, s, r, a) {
  if (!(this instanceof E)) try {
    return new E(e, t, s, r, a);
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
    if (!o || typeof o != "object") throw new Yt(o);
    return o;
  }
}
E.prototype.evaluate = function(e, t, s, r) {
  let a = this.parent, n = this.parentProperty, { flatten: i, wrap: o } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, s = s || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, t = t || this.json, e = e || this.path, e && typeof e == "object" && !Array.isArray(e)) {
    if (!e.path && e.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(e, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: t } = e), i = Object.hasOwn(e, "flatten") ? e.flatten : i, this.currResultType = Object.hasOwn(e, "resultType") ? e.resultType : this.currResultType, this.currSandbox = Object.hasOwn(e, "sandbox") ? e.sandbox : this.currSandbox, o = Object.hasOwn(e, "wrap") ? e.wrap : o, this.currEval = Object.hasOwn(e, "eval") ? e.eval : this.currEval, s = Object.hasOwn(e, "callback") ? e.callback : s, this.currOtherTypeCallback = Object.hasOwn(e, "otherTypeCallback") ? e.otherTypeCallback : this.currOtherTypeCallback, a = Object.hasOwn(e, "parent") ? e.parent : a, n = Object.hasOwn(e, "parentProperty") ? e.parentProperty : n, e = e.path;
  }
  if (a = a || null, n = n || null, Array.isArray(e) && (e = E.toPathString(e)), !e && e !== "" || !t) return;
  const l = E.toPathArray(e);
  l[0] === "$" && l.length > 1 && l.shift(), this._hasParentSelector = null;
  const d = this._trace(l, t, ["$"], a, n, s).filter(function(p) {
    return p && !p.isParentSelector;
  });
  return d.length ? !o && d.length === 1 && !d[0].hasArrExpr ? this._getPreferredOutput(d[0]) : d.reduce((p, g) => {
    const y = this._getPreferredOutput(g);
    return i && Array.isArray(y) ? p = p.concat(y) : p.push(y), p;
  }, []) : o ? [] : void 0;
};
E.prototype._getPreferredOutput = function(e) {
  const t = this.currResultType;
  switch (t) {
    case "all": {
      const s = Array.isArray(e.path) ? e.path : E.toPathArray(e.path);
      return e.pointer = E.toPointer(s), e.path = typeof e.path == "string" ? e.path : E.toPathString(e.path), e;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return e[t];
    case "path":
      return E.toPathString(e[t]);
    case "pointer":
      return E.toPointer(e.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
E.prototype._handleCallback = function(e, t, s) {
  if (t) {
    const r = this._getPreferredOutput(e);
    e.path = typeof e.path == "string" ? e.path : E.toPathString(e.path), t(r, s, e);
  }
};
E.prototype._trace = function(e, t, s, r, a, n, i, o) {
  let l;
  if (!e.length)
    return l = {
      path: s,
      value: t,
      parent: r,
      parentProperty: a,
      hasArrExpr: i
    }, this._handleCallback(l, n, "value"), l;
  const d = e[0], p = e.slice(1), g = [];
  function y(m) {
    Array.isArray(m) ? m.forEach((h) => {
      g.push(h);
    }) : g.push(m);
  }
  if ((typeof d != "string" || o) && t && Object.hasOwn(t, d)) y(this._trace(p, t[d], I(s, d), t, d, n, i));
  else if (d === "*") this._walk(t, (m) => {
    y(this._trace(p, t[m], I(s, m), t, m, n, !0, !0));
  });
  else if (d === "..")
    y(this._trace(p, t, s, r, a, n, i)), this._walk(t, (m) => {
      typeof t[m] == "object" && y(this._trace(e.slice(), t[m], I(s, m), t, m, n, !0));
    });
  else {
    if (d === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: p,
        isParentSelector: !0
      };
    if (d === "~")
      return l = {
        path: I(s, d),
        value: a,
        parent: r,
        parentProperty: null
      }, this._handleCallback(l, n, "property"), l;
    if (d === "$") y(this._trace(p, t, s, null, null, n, i));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(d)) y(this._slice(d, p, t, s, r, a, n));
    else if (d.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const m = d.replace(/^\?\((.*?)\)$/u, "$1"), h = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(m);
      h ? this._walk(t, (b) => {
        const S = [h[2]], A = h[1] ? t[b][h[1]] : t[b];
        this._trace(S, A, s, r, a, n, !0).length > 0 && y(this._trace(p, t[b], I(s, b), t, b, n, !0));
      }) : this._walk(t, (b) => {
        this._eval(m, t[b], b, s, r, a) && y(this._trace(p, t[b], I(s, b), t, b, n, !0));
      });
    } else if (d[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      y(this._trace(be(this._eval(d, t, s.at(-1), s.slice(0, -1), r, a), p), t, s, r, a, n, i));
    } else if (d[0] === "@") {
      let m = !1;
      const h = d.slice(1, -2);
      switch (h) {
        case "scalar":
          (!t || !["object", "function"].includes(typeof t)) && (m = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof t === h && (m = !0);
          break;
        case "integer":
          Number.isFinite(t) && !(t % 1) && (m = !0);
          break;
        case "number":
          Number.isFinite(t) && (m = !0);
          break;
        case "nonFinite":
          typeof t == "number" && !Number.isFinite(t) && (m = !0);
          break;
        case "object":
          t && typeof t === h && (m = !0);
          break;
        case "array":
          Array.isArray(t) && (m = !0);
          break;
        case "other":
          m = this.currOtherTypeCallback(t, s, r, a);
          break;
        case "null":
          t === null && (m = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + h);
      }
      if (m)
        return l = {
          path: s,
          value: t,
          parent: r,
          parentProperty: a
        }, this._handleCallback(l, n, "value"), l;
    } else if (d[0] === "`" && t && Object.hasOwn(t, d.slice(1))) {
      const m = d.slice(1);
      y(this._trace(p, t[m], I(s, m), t, m, n, i, !0));
    } else if (d.includes(",")) {
      const m = d.split(",");
      for (const h of m) y(this._trace(be(h, p), t, s, r, a, n, !0));
    } else !o && t && Object.hasOwn(t, d) && y(this._trace(p, t[d], I(s, d), t, d, n, i, !0));
  }
  if (this._hasParentSelector) for (let m = 0; m < g.length; m++) {
    const h = g[m];
    if (h && h.isParentSelector) {
      const b = this._trace(h.expr, t, h.path, r, a, n, i);
      if (Array.isArray(b)) {
        g[m] = b[0];
        const S = b.length;
        for (let A = 1; A < S; A++)
          m++, g.splice(m, 0, b[A]);
      } else g[m] = b;
    }
  }
  return g;
};
E.prototype._walk = function(e, t) {
  if (Array.isArray(e)) {
    const s = e.length;
    for (let r = 0; r < s; r++) t(r);
  } else e && typeof e == "object" && Object.keys(e).forEach((s) => {
    t(s);
  });
};
E.prototype._slice = function(e, t, s, r, a, n, i) {
  if (!Array.isArray(s)) return;
  const o = s.length, l = e.split(":"), d = l[2] && Number.parseInt(l[2]) || 1;
  let p = l[0] && Number.parseInt(l[0]) || 0, g = l[1] && Number.parseInt(l[1]) || o;
  p = p < 0 ? Math.max(0, p + o) : Math.min(o, p), g = g < 0 ? Math.max(0, g + o) : Math.min(o, g);
  const y = [];
  for (let m = p; m < g; m += d) this._trace(be(m, t), s, r, a, n, i, !0).forEach((h) => {
    y.push(h);
  });
  return y;
};
E.prototype._eval = function(e, t, s, r, a, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = a, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
  const i = e.includes("@path");
  i && (this.currSandbox._$_path = E.toPathString(r.concat([s])));
  const o = this.currEval + "Script:" + e;
  if (!E.cache[o]) {
    let l = e.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (i && (l = l.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) E.cache[o] = new this.safeVm.Script(l);
    else if (this.currEval === "native") E.cache[o] = new this.vm.Script(l);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const d = this.currEval;
      E.cache[o] = new d(l);
    } else if (typeof this.currEval == "function") E.cache[o] = { runInNewContext: (d) => this.currEval(l, d) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return E.cache[o].runInNewContext(this.currSandbox);
  } catch (l) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + l.message + ": " + e);
  }
};
E.cache = {};
E.toPathString = function(e) {
  const t = e, s = t.length;
  let r = "$";
  for (let a = 1; a < s; a++) /^(~|\^|@.*?\(\))$/u.test(t[a]) || (r += /^[0-9*]+$/u.test(t[a]) ? "[" + t[a] + "]" : "['" + t[a] + "']");
  return r;
};
E.toPointer = function(e) {
  const t = e, s = t.length;
  let r = "";
  for (let a = 1; a < s; a++) /^(~|\^|@.*?\(\))$/u.test(t[a]) || (r += "/" + t[a].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
E.toPathArray = function(e) {
  const { cache: t } = E;
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
E.prototype.safeVm = { Script: Xt };
var Wt = function(e, t, s) {
  const r = e.length;
  for (let a = 0; a < r; a++) {
    const n = e[a];
    s(n) && t.push(e.splice(a--, 1)[0]);
  }
}, Gt = class {
  constructor(e) {
    this.code = e;
  }
  runInNewContext(e) {
    let t = this.code;
    const s = Object.keys(e), r = [];
    Wt(s, r, (o) => typeof e[o] == "function");
    const a = s.map((o) => e[o]);
    t = r.reduce((o, l) => {
      let d = e[l].toString();
      return /function/u.test(d) || (d = "function " + d), "var " + l + "=" + d + ";" + o;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const n = t.lastIndexOf(";"), i = n !== -1 ? t.slice(0, n + 1) + " return " + t.slice(n + 1) : " return " + t;
    return new Function(...s, i)(...a);
  }
};
E.prototype.vm = { Script: Gt };
function Zt(e) {
  return e ? !!(e.startsWith("$") || /\[\d+\]/.test(e) || /\[['"]/.test(e) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(e) || e.includes("..") || e.includes("*")) : !1;
}
function es(e) {
  return e ? e.startsWith("$") ? e : `$.${e}` : "$";
}
function ts(e, t) {
  if (!e || !t) return [];
  try {
    return (E({
      path: es(t),
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
function ss(e, t) {
  if (!t || !e) return e || {};
  const s = Zt(t);
  if (console.log("[jsonpath-search] search:", t, "isJsonPath:", s), s) {
    const a = as(e, t);
    return console.log("[jsonpath-search] JSONPath result:", a), a;
  }
  const r = rs(e, t);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function rs(e, t) {
  const s = t.toLowerCase(), r = {};
  for (const [a, n] of Object.entries(e || {})) a.toLowerCase().includes(s) && (r[a] = n);
  return r;
}
function as(e, t) {
  const s = ts(e, t);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: a, value: n } = s[0];
    return a === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [De(a)]: n };
  }
  const r = {};
  for (const { path: a, value: n } of s) {
    const i = De(a) || `result_${Object.keys(r).length}`;
    i in r ? r[`${i}_${Object.keys(r).length}`] = n : r[i] = n;
  }
  return r;
}
function De(e) {
  if (!e) return "";
  const t = e.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (t) return t[1];
  const s = e.match(/\.([^.[\]]+)$/);
  return s ? s[1] : e.replace(/^\$\.?/, "");
}
var Y = "commands", ne = "", te = "", Pe = /* @__PURE__ */ new Map(), F = 0, Re = 230, _e = 180, ns = 640, is = 280, Ie = 24, Ge = "cmdl:sidebar-width", Ee = /* @__PURE__ */ new Map(), qe = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3
};
function os(e) {
  const t = e && typeof e == "object" ? e : {}, s = f(t.correlation_id) || f(t.CorrelationID), r = $(t.state) || $(t.State);
  if (!s || !r) return;
  const a = Ee.get(s);
  a && (qe[a.state] ?? -1) > (qe[r] ?? -1) || Ee.set(s, {
    state: r,
    message: f(t.message) || f(t.Message),
    at: f(t.at) || f(t.At),
    code: f(t.code) || f(t.Code)
  });
}
function ls(e) {
  return e ? Ee.get(e) : void 0;
}
function f(e) {
  return typeof e == "string" ? e.trim() : "";
}
function $(e) {
  return f(e).toLowerCase();
}
function ve(e) {
  return e === "boolean" || e === "checkbox";
}
function cs(e) {
  return !e || typeof e != "object" ? "" : u(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function he(e) {
  return e == null ? "" : typeof e == "string" || typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function k(e, t) {
  return !!(e && Object.prototype.hasOwnProperty.call(e, t));
}
function oe(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function ds(e) {
  return typeof e == "boolean" ? e : typeof e == "string" ? e.trim().toLowerCase() === "true" : !1;
}
function Ze(e) {
  const t = $(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function us(e, t) {
  const s = t && typeof t == "object" ? t : {}, r = Array.isArray(s.commands) ? s.commands : [], a = Array.isArray(s.diagnostics) ? s.diagnostics : [], n = Array.isArray(e.ui?.actions) ? e.ui.actions : [], i = hs(e), o = /* @__PURE__ */ new Map();
  r.forEach((y) => {
    const m = f(y?.id);
    m && o.set(m, y);
  });
  const l = /* @__PURE__ */ new Map();
  n.forEach((y) => {
    const m = $(y?.id), h = f(y.payload?.command_id);
    m && h && !l.has(h) && l.set(h, y);
  });
  const d = [], p = /* @__PURE__ */ new Set(), g = (y) => {
    y && !p.has(y) && (p.add(y), d.push(y));
  };
  return r.forEach((y) => g(f(y?.id))), n.forEach((y) => g(f(y.payload?.command_id))), {
    entries: d.map((y) => {
      const m = o.get(y), h = l.get(y), b = h ? $(h.id) : "", S = !!(h && b), A = S ? ps(h, i.get(y) || /* @__PURE__ */ new Map()) : void 0, x = f(h?.label) || f(m?.label) || y, q = f(m?.group) || "Other", N = `${y} ${x} ${q} ${(Array.isArray(m?.tags) ? m.tags.map(f).filter(Boolean) : []).join(" ")}${S ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: S ? b : `cmd:${y}`,
        actionId: b,
        commandId: y,
        label: x,
        action: A,
        descriptor: m,
        group: q,
        search: N,
        executable: S
      };
    }),
    diagnostics: a
  };
}
function hs(e) {
  const t = e.ui?.metadata && typeof e.ui.metadata == "object" ? e.ui.metadata : {}, s = t.serialized_schemas && typeof t.serialized_schemas == "object" ? t.serialized_schemas : {}, r = /* @__PURE__ */ new Map();
  return Object.entries(s).forEach(([a, n]) => {
    const i = n && typeof n == "object" ? n : {}, o = Array.isArray(i.fields) ? i.fields : [], l = /* @__PURE__ */ new Map();
    o.forEach((d) => {
      [
        f(d.id),
        f(d.name),
        f(d.path),
        f(d.payload_path).replace(/^payload\./, "")
      ].filter(Boolean).forEach((p) => l.set(p, d));
    }), r.set(a, l);
  }), r;
}
function ps(e, t) {
  const s = Array.isArray(e.fields) ? e.fields : [];
  return s.length === 0 || t.size === 0 ? e : {
    ...e,
    fields: s.map((r) => {
      const a = [
        f(r.id),
        f(r.name),
        f(r.path),
        f(r.payload_path).replace(/^payload\./, "")
      ].filter(Boolean).map((i) => t.get(i)).find(Boolean);
      if (!a) return r;
      const n = { ...r };
      return !k(n, "sensitive") && a.sensitive === !0 && (n.sensitive = !0), !k(n, "default") && k(a, "default") && (n.default = a.default), n.sensitive === !0 && delete n.default, !k(n, "display_hints") && k(a, "display_hints") && (n.display_hints = a.display_hints), !k(n, "option_items") && Array.isArray(a.static_options) && (n.option_items = a.static_options), !k(n, "option_source") && k(a, "option_source") && (n.option_source = a.option_source), f(n.description) || (n.description = f(a.description) || f(a.help)), f(n.help) || (n.help = f(a.help)), n;
    })
  };
}
function fs(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => {
    t.has(s.group) || t.set(s.group, []), t.get(s.group).push(s);
  }), Array.from(t.entries()).sort((s, r) => s[0].localeCompare(r[0])).map(([s, r]) => ({
    group: s,
    items: r.sort((a, n) => (a.commandId || a.label).localeCompare(n.commandId || n.label))
  }));
}
function ms(e) {
  const t = f(e.descriptor?.execution_mode), s = Ze(t), r = t ? `Execution: ${t}` : "Execution mode unknown", a = e.descriptor?.mutating === !0;
  let n;
  return e.executable ? a ? n = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : n = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : n = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}" role="option" aria-selected="false"
      data-cmdl-item="${u(e.key)}"
      data-cmdl-search="${u(e.search)}"
      title="${u(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${s}" title="${u(r)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${u(e.commandId || e.label)}</span>
      ${n}
    </button>`;
}
function gs(e, t) {
  const s = e.map((r) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${u(r.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${u(r.group)}</div>
        ${r.items.map(ms).join("")}
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
function et(e) {
  const t = Array.isArray(e.option_items) ? e.option_items : [], s = Array.isArray(e.options) ? e.options.map((n) => ({
    value: f(n),
    label: f(n)
  })) : [], r = t.length > 0 ? t : s, a = /* @__PURE__ */ new Set();
  return r.map((n) => {
    const i = f(n?.value);
    return {
      ...n,
      value: i,
      label: f(n?.label) || i,
      description: f(n?.description),
      disabled: n?.disabled === !0
    };
  }).filter((n) => !n.value || a.has(n.value) ? !1 : (a.add(n.value), !0));
}
function ys(e) {
  const t = e?.params?.depends_on;
  return (Array.isArray(t) ? t : typeof t == "string" ? t.split(",") : []).map((s) => C(f(s))).filter(Boolean);
}
function C(e) {
  return e.trim().replace(/^payload\./, "");
}
function bs(e, t) {
  const s = f(e.option_source?.id);
  if (!s) return "";
  const r = C(t), a = ys(e.option_source).join(",");
  return ` data-cmdl-option-source="${u(s)}" data-cmdl-option-field="${u(r)}"${a ? ` data-cmdl-option-depends="${u(a)}"` : ""}`;
}
function Es(e) {
  return e.length === 0 ? "" : `<div class="cmdl-option-choices" data-cmdl-option-choices>${e.map((t) => `
    <button type="button" class="cmdl-option-choice" data-cmdl-option-value="${u(t.value)}"
      ${t.disabled ? "disabled" : ""}${t.description ? ` title="${u(t.description)}"` : ""}>
      <span>${u(t.label)}</span>${t.description ? `<small>${u(t.description)}</small>` : ""}
    </button>`).join("")}</div>`;
}
function vs(e, t, s) {
  const r = f(e.name);
  if (!r) return "";
  const a = $(e.kind) || "text", n = f(e.label) || r, i = f(e.payload_path) || r, o = `cmdl-${t}-${r}-${s}`, l = e.required === !0, d = e.sensitive === !0, p = l ? '<span class="cmdl-field__req" title="Required">*</span>' : "", g = f(e.placeholder), y = g ? ` placeholder="${u(g)}"` : "", m = f(e.description), h = f(e.help), b = oe(e.display_hints?.units), S = [
    m ? `<span>${u(m)}</span>` : "",
    h && h !== m ? `<span>${u(h)}</span>` : "",
    b ? `<span class="cmdl-field__units">Units: ${u(b)}</span>` : ""
  ].filter(Boolean), A = S.length ? `<small class="cmdl-field__help">${S.join(" ")}</small>` : "", x = et(e), q = bs(e, i), N = e.option_source ? `<small class="cmdl-field__source" data-cmdl-option-status>${x.length > 0 ? "" : "Options load when this command is selected."}</small>` : "", nt = l ? " required" : "", B = `id="${u(o)}" data-action-field="${u(r)}" data-action-field-kind="${u(a)}" data-action-field-path="${u(i)}"${d ? ' data-action-field-sensitive="true"' : ""}${nt}`, W = `<small class="cmdl-field__error" data-action-field-error="${u(i)}" data-action-field-name="${u(r)}" data-action-id="${u(t)}" hidden></small>`;
  if (d) return `
      <div class="cmdl-field"${q}>
        <label class="cmdl-field__label" for="${u(o)}">${u(n)}${p}</label>
        <input type="password" ${B}${y} autocomplete="new-password" spellcheck="false">
        ${A}${N}${W}
      </div>`;
  if (ve(a)) return `
      <div class="cmdl-field cmdl-field--full cmdl-field--bool"${q}>
        <label class="cmdl-toggle">
          <input type="checkbox" ${B}${e.default === !0 ? " checked" : ""}>
          <span class="cmdl-toggle__track" aria-hidden="true"></span>
          <span class="cmdl-toggle__text">${u(n)}${p}</span>
        </label>
        ${A}${N}${W}
      </div>`;
  let V = "";
  if (a === "string_list" || a === "array") {
    const O = Array.isArray(e.default) ? e.default.map(f).filter(Boolean) : [], G = g || (x.length > 0 ? "Choose values below or type another value" : "Add a value, press Enter");
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--list"${q}>
        <label class="cmdl-field__label" for="${u(o)}">${u(n)}${p}</label>
        <div class="cmdl-chips" data-cmdl-chips${l ? ' data-cmdl-chips-required="true"' : ""}>
          <span class="cmdl-chips__tags" data-cmdl-chips-tags></span>
          <input type="text" id="${u(o)}" class="cmdl-chips__entry" data-cmdl-chips-entry
            placeholder="${u(G)}" autocomplete="off" spellcheck="false">
          <input type="hidden" data-action-field="${u(r)}" data-action-field-kind="string_list"
            data-action-field-path="${u(i)}"
            data-cmdl-chips-value value="${u(O.join(`
`))}">
        </div>
        ${Es(x)}
        ${A}${N}${W}
      </div>`;
  } else if (x.length > 0 || a === "select" || e.option_source) {
    const O = he(e.default), G = x.length === 0 && !!e.option_source;
    V = `<select ${B} data-cmdl-option-control${G ? " disabled" : ""}><option value="">${G ? "Options unavailable" : ""}</option>${x.map((M) => `<option value="${u(M.value)}"${M.value === O ? " selected" : ""}${M.disabled ? " disabled" : ""}${M.description ? ` title="${u(M.description)}" data-option-description="${u(M.description)}"` : ""}>${u(M.label)}</option>`).join("")}</select><small class="cmdl-field__option-description" data-cmdl-option-description></small>`;
  } else if (a === "number" || a === "integer") {
    const O = he(e.default);
    V = `<input type="number" ${B}${y}${O ? ` value="${u(O)}"` : ""}>`;
  } else if (a === "json" || a === "object" || a === "textarea") V = `<textarea ${B}${y} rows="3">${u(e.default !== void 0 && e.default !== null ? JSON.stringify(e.default, null, 2) : "")}</textarea>`;
  else {
    const O = he(e.default);
    V = `<input type="text" ${B}${y}${O ? ` value="${u(O)}"` : ""}>`;
  }
  return `
    <div class="cmdl-field"${q}>
      <label class="cmdl-field__label" for="${u(o)}">${u(n)}${p}</label>
      ${V}
      ${A}${N}${W}
    </div>`;
}
function Ss(e) {
  return ws(e) ? As(e) : Ps(e);
}
function ws(e) {
  return e.some((t) => {
    const s = t.display_hints || {};
    return oe(s.section) !== "" || k(s, "advanced");
  });
}
function As(e) {
  const t = [], s = /* @__PURE__ */ new Map(), r = [];
  return e.forEach((a) => {
    const n = a.display_hints || {};
    if (ds(n.advanced)) {
      r.push(a);
      return;
    }
    const i = oe(n.section) || "Parameters";
    let o = s.get(i);
    o || (o = {
      title: i,
      fields: [],
      collapsible: !1
    }, s.set(i, o), t.push(o)), o.fields.push(a);
  }), r.length && t.push({
    title: "Advanced",
    fields: r,
    collapsible: !0
  }), t;
}
function Ps(e) {
  const t = e.filter((d) => ve($(d.kind))), s = e.filter((d) => !ve($(d.kind))), r = s.filter((d) => d.required === !0), a = s.filter((d) => d.required !== !0), n = [...r, ...a];
  let i = n, o = [];
  if (n.length > 6) {
    const d = Math.max(r.length, 4);
    i = n.slice(0, d), o = n.slice(d);
  }
  const l = [];
  return i.length && l.push({
    title: "Parameters",
    fields: i,
    collapsible: !1
  }), t.length && l.push({
    title: "Options",
    fields: t,
    collapsible: !1
  }), o.length && l.push({
    title: "Advanced",
    fields: o,
    collapsible: !0
  }), l;
}
function _s(e, t, s) {
  return `
    <fieldset class="cmdl-section${e.collapsible ? " cmdl-section--collapsed" : ""}">
      ${e.collapsible ? `<legend class="cmdl-section__head cmdl-section__head--toggle" data-cmdl-section-toggle role="button" tabindex="0" aria-expanded="false">
        <span class="cmdl-section__caret" aria-hidden="true"></span>
        <span>${u(e.title)}</span>
        <span class="cmdl-section__count">${e.fields.length}</span>
      </legend>` : `<legend class="cmdl-section__head">${u(e.title)}</legend>`}
      <div class="cmdl-section__grid">${e.fields.map((r, a) => vs(r, t, s + a)).join("")}</div>
    </fieldset>`;
}
function $s(e) {
  const t = e.action;
  if (!t) return "";
  const s = Array.isArray(t.fields) ? t.fields : [], r = f(t.submit_label) || "Run command", a = f(t.confirm_text), n = t.requires_confirm === !0, i = e.descriptor?.mutating === !0, o = s.some((h) => h.sensitive === !0);
  let l = "";
  if (s.length === 0) l = '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>';
  else {
    const h = Ss(s);
    let b = 0;
    const S = h.map((A) => {
      const x = _s(A, e.actionId, b);
      return b += A.fields.length, x;
    }).join("");
    l = `
      <div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${u(e.commandId)}">
        <div class="cmdl-recall__list" data-cmdl-recall-list></div>
        <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
      </div>
      <div class="cmdl-form__fields" data-cmdl-fields>${S}</div>
      ${o ? "" : `<div class="cmdl-form__json" data-cmdl-json hidden>
        <textarea class="cmdl-json-editor" data-cmdl-json-editor
          data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
          rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
        <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
      </div>`}`;
  }
  const d = n || a !== "", p = i ? '<span class="cmdl-form__note">Confirms before running</span>' : "", g = s.length > 0 && !o ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>' : "", y = o ? '<span class="cmdl-form__note">Sensitive values are never saved and must be re-entered</span>' : "", m = d ? `
        <div class="cmdl-form__confirm" data-cmdl-confirm-row hidden>
          <span class="cmdl-form__confirm-msg">${u(a || "Run this command?")}</span>
          <button type="submit" class="cmdl-btn cmdl-btn--run cmdl-btn--confirm" data-cmdl-confirm-run>Confirm run</button>
          <button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-cancel>Cancel</button>
        </div>` : "";
  return `
    <form class="cmdl-form" data-panel-action-form data-cmdl-mode="form" data-cmdl-command="${u(e.commandId)}"
      data-panel-id="${u(Y)}"
      data-action-id="${u(e.actionId)}"
      data-action-confirm="${u(a)}"
      data-action-requires-confirm="${n ? "true" : "false"}"
      data-cmdl-confirm="${d ? "true" : "false"}"
      ${d ? 'data-action-confirm-inline="true"' : ""}
      data-action-payload='${cs(t.payload)}'>
      ${l}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
          <button type="submit" class="cmdl-btn cmdl-btn--run">${u(r)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${g}
          ${p}
          ${y}
        </div>${m}
      </div>
    </form>`;
}
function xs(e) {
  const t = f(e.descriptor?.execution_mode), s = e.descriptor?.mutating === !0, r = f(e.descriptor?.summary), a = [];
  a.push(`<span class="cmdl-chip">${u(e.group)}</span>`), t && a.push(`<span class="cmdl-chip cmdl-chip--${Ze(t)}">${u(t)}</span>`), a.push(s ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || a.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let n;
  return e.executable ? n = `${s ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${$s(e)}` : n = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${u(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${u(e.commandId || e.label)}</div>
        ${r ? `<div class="cmdl-cmd__summary">${u(r)}</div>` : ""}
        <div class="cmdl-cmd__chips">${a.join("")}</div>
      </div>
      ${n}
    </div>`;
}
function Me(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const s = $(t.severity) || "info", r = f(t.message), a = f(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${u(s)}">
          <span class="cmdl-diag__sev">${u(s)}</span>
          <span class="cmdl-diag__msg">${u(r)}${a ? ` <span class="cmdl-diag__code">${u(a)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function Cs(e) {
  const { def: t, data: s } = e, { entries: r, diagnostics: a } = us(t, s), n = f((t.ui?.metadata && typeof t.ui.metadata == "object" ? t.ui.metadata : {}).option_resolver_action), i = n ? ` data-cmdl-option-resolver="${u(n)}"` : "";
  if (r.length === 0) return `
      <div class="cmdl" data-cmdl-root${i}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${Me(a)}
        <div class="cmdl-result" data-panel-action-result="${u(Y)}"></div>
      </div>`;
  const o = fs(r), l = r.map(xs).join("");
  return `
    <div class="cmdl" data-cmdl-root${i}>
      <div class="cmdl__body" data-cmdl-body>
        ${gs(o, r.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${l}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${u(Y)}"></div>
        </section>
      </div>
      ${Me(a)}
    </div>`;
}
function se(e, t) {
  for (const s of t) {
    const r = e[s];
    if (typeof r == "string" && r.trim() !== "") return r.trim();
  }
  return "";
}
var Os = [
  "category",
  "text_code",
  "source",
  "stack_trace",
  "severity",
  "location",
  "metadata"
];
function Ls(e, t) {
  const s = [];
  e && typeof e == "object" && !Array.isArray(e) && s.push(e.error, e), t && typeof t == "object" && !Array.isArray(t) && s.push(t.error, t);
  for (const r of s) if (r && typeof r == "object" && !Array.isArray(r)) {
    const a = r;
    if (Os.some((n) => n in a)) return a;
  }
  return null;
}
function Fe(e) {
  const t = e.lastIndexOf("/");
  return t >= 0 ? e.slice(t + 1) : e;
}
function je(e) {
  const t = e.split("/").filter(Boolean);
  return t.length > 2 ? t.slice(-2).join("/") : e;
}
function Ne(e) {
  if (typeof e == "number") return e;
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function ks(e) {
  const t = e.metadata && typeof e.metadata == "object" && !Array.isArray(e.metadata) ? e.metadata : {}, s = Object.entries(t).map(([g, y]) => ({
    key: g,
    value: oe(y) || tt(y)
  })).filter((g) => g.value), r = (Array.isArray(e.stack_trace) ? e.stack_trace : []).map((g) => {
    const y = f(g.function), m = f(g.file), h = Ne(g.line);
    return {
      func: Fe(y),
      funcTitle: y,
      loc: m ? `${je(m)}${h ? `:${h}` : ""}` : "",
      locTitle: m ? `${m}${h ? `:${h}` : ""}` : "",
      app: m !== "" && !m.includes("/pkg/mod/")
    };
  }).filter((g) => g.func || g.loc), a = e.location && typeof e.location == "object" && !Array.isArray(e.location) ? e.location : {}, n = f(a.file), i = f(a.function), o = Ne(a.line), l = n ? `${je(n)}${o ? `:${o}` : ""}` : "", d = [Fe(i), l ? `(${l})` : ""].filter(Boolean).join(" "), p = [i, n ? `${n}${o ? `:${o}` : ""}` : ""].filter(Boolean).join(" ");
  return {
    category: f(e.category),
    textCode: f(e.text_code),
    source: f(e.source),
    severity: f(e.severity),
    timestamp: f(e.timestamp),
    httpCode: typeof e.code == "number" ? String(e.code) : f(e.code),
    metadata: s,
    location: d,
    locationTitle: p,
    stackTrace: r
  };
}
function Ts(e, t, s, r) {
  const a = s && typeof s == "object" ? s : {}, n = a.receipt && typeof a.receipt == "object" ? a.receipt : {}, i = (Array.isArray(a.validation_errors) ? a.validation_errors : []).map((h) => ({
    path: f(h.path),
    message: f(h.message),
    code: f(h.code)
  })).filter((h) => h.message || h.path), o = n.Accepted ?? n.accepted, l = typeof o == "boolean" ? o : void 0;
  let d = "ok";
  e === "error" ? d = "error" : (i.length > 0 || l === !1) && (d = "invalid");
  const p = d === "error" ? Ls(s, r) : null, g = p ? ks(p) : null;
  let y = "";
  i.length > 0 ? y = "VALIDATION_ERROR" : d === "error" && (y = g && g.textCode || se(r || {}, ["code", "text_code"]) || (g ? g.httpCode : ""));
  const m = s != null && (typeof s != "object" || Object.keys(a).length > 0);
  return {
    kind: d,
    message: f(t) || (d === "error" ? "Command failed" : "Command dispatched"),
    code: y,
    correlationId: se(n, ["CorrelationID", "correlation_id"]),
    mode: se(n, ["Mode", "mode"]),
    dispatchId: se(n, ["DispatchID", "dispatch_id"]),
    statusReference: f(a.status_reference) || f(a.statusReference),
    accepted: l,
    validationErrors: i,
    richError: g,
    hasRaw: m,
    rawJSON: m ? tt(s) : ""
  };
}
function tt(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function Ds(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function Rs(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function P(e, t, s) {
  return s ? `<span class="cmdl-meta" title="${u(t)}"><span class="cmdl-meta__k">${u(e)}</span>${u(s)}</span>` : "";
}
function Is(e, t = {}) {
  const s = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", r = e.code ? `<span class="cmdl-result__code">${u(e.code)}</span>` : "", a = t.liveStatus, n = a ? `<span class="cmdl-result__live cmdl-result__live--${u(a.state)}" title="Live status${a.at ? ` · ${u(a.at)}` : ""}">${u(a.state)}</span>` : "", i = e.richError, o = [
    P("id", "Correlation ID", e.correlationId),
    P("mode", "Execution mode", e.mode),
    P("dispatch", "Dispatch ID", e.dispatchId),
    P("status", "Status reference", e.statusReference),
    P("took", "Round-trip duration", typeof t.durationMs == "number" ? Ds(t.durationMs) : ""),
    P("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? Rs(t.at) : ""),
    i ? P("category", "Category", i.category) : "",
    i ? P("severity", "Severity", i.severity) : "",
    i ? P("http", "HTTP status", i.httpCode) : "",
    ...i ? i.metadata.map((h) => P(h.key, h.key, h.value)) : [],
    i ? P("when", "Timestamp", i.timestamp) : "",
    i ? P("at", i.locationTitle || "Origin", i.location) : ""
  ].filter(Boolean).join(""), l = o ? `<div class="cmdl-result__meta">${o}</div>` : "", d = i && i.source && i.source !== e.message ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${u(i.source)}</code></div>` : "", p = i && i.stackTrace.length ? `<details class="cmdl-result__trace"><summary>Stack trace · ${i.stackTrace.length} frame${i.stackTrace.length === 1 ? "" : "s"}</summary><ol class="cmdl-trace">${i.stackTrace.map((h) => `<li class="cmdl-trace__frame${h.app ? " cmdl-trace__frame--app" : ""}"><span class="cmdl-trace__fn" title="${u(h.funcTitle)}">${u(h.func)}</span>${h.loc ? `<span class="cmdl-trace__loc" title="${u(h.locTitle)}">${u(h.loc)}</span>` : ""}</li>`).join("")}</ol></details>` : "", g = e.validationErrors.length ? `<ul class="cmdl-result__validation">${e.validationErrors.map((h) => `<li><span class="cmdl-result__path">${u(h.path || "payload")}</span><span class="cmdl-result__vmsg">${u(h.message || h.code)}</span></li>`).join("")}</ul>` : "", y = e.hasRaw ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${u(e.rawJSON)}</pre></details>` : "", m = t.canRetry ? '<div class="cmdl-result__actions"><button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button></div>' : "";
  return `
    <div class="cmdl-result__card cmdl-result__card--${e.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${u(s)}</span>
        ${r}${n}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${u(e.message)}</div>
      ${d}
      ${l}
      ${g}
      ${p}
      ${m}
      ${y}
    </div>`;
}
function re(e, t) {
  ne = t;
  const s = e.querySelector("[data-cmdl-empty]");
  s && (s.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((a) => {
    a.hidden = a.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((a) => {
    const n = a.dataset.cmdlItem === t;
    a.classList.toggle("cmdl-item--active", n), a.setAttribute("aria-selected", n ? "true" : "false");
  });
  const r = e.querySelector(`[data-cmdl-detail="${at(t)}"]`);
  r && Fs(r);
}
function Be(e, t) {
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
function Ue(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => !t.hidden);
}
function j(e) {
  const t = e.querySelector("[data-cmdl-chips-value]");
  return !t || !t.value.trim() ? [] : t.value.split(`
`).map((s) => s.trim()).filter(Boolean);
}
function T(e, t) {
  const s = e.querySelector("[data-cmdl-chips-tags]"), r = e.querySelector("[data-cmdl-chips-value]");
  r && (r.value = t.join(`
`)), s && (s.innerHTML = t.map((n, i) => `<span class="cmdl-chip-tag">${u(n)}<button type="button" class="cmdl-chip-tag__x" data-cmdl-chip-remove="${i}" aria-label="Remove ${u(n)}">×</button></span>`).join(""));
  const a = e.querySelector("[data-cmdl-chips-entry]");
  a && (a.required = e.dataset.cmdlChipsRequired === "true" && t.length === 0), e.closest("[data-cmdl-option-source]")?.querySelectorAll("[data-cmdl-option-value]").forEach((n) => {
    n.classList.toggle("cmdl-option-choice--selected", t.includes(n.dataset.cmdlOptionValue || ""));
  });
}
var ae = /* @__PURE__ */ new WeakMap(), He = /* @__PURE__ */ new WeakMap();
function ie(e, t, s = "") {
  const r = e.querySelector("[data-cmdl-option-status]");
  r && (r.textContent = t, r.dataset.state = s);
}
function qs(e) {
  return e.map((t) => `
    <button type="button" class="cmdl-option-choice" data-cmdl-option-value="${u(t.value)}"
      ${t.disabled ? "disabled" : ""}${t.description ? ` title="${u(t.description)}"` : ""}>
      <span>${u(t.label)}</span>${t.description ? `<small>${u(t.description)}</small>` : ""}
    </button>`).join("");
}
function Ms(e, t) {
  const s = et({ option_items: t }), r = e.querySelector("[data-cmdl-option-control]");
  if (r) {
    const i = r.value;
    r.innerHTML = `<option value=""></option>${s.map((o) => `<option value="${u(o.value)}"${o.disabled ? " disabled" : ""}${o.description ? ` data-option-description="${u(o.description)}"` : ""}>${u(o.label)}</option>`).join("")}`, i && !s.some((o) => o.value === i) && r.insertAdjacentHTML("beforeend", `<option value="${u(i)}" data-option-stale="true">${u(i)} (current)</option>`), r.value = i, r.disabled = s.length === 0;
  }
  let a = e.querySelector("[data-cmdl-option-choices]");
  const n = e.querySelector("[data-cmdl-chips]");
  n && !a && (a = document.createElement("div"), a.className = "cmdl-option-choices", a.dataset.cmdlOptionChoices = "", n.insertAdjacentElement("afterend", a)), a && (a.innerHTML = qs(s), n && T(n, j(n))), ie(e, s.length === 0 ? "No options are currently available." : `${s.length} option${s.length === 1 ? "" : "s"} available.`, s.length === 0 ? "empty" : "ready");
}
async function st(e) {
  const t = e.closest("[data-cmdl-root]"), s = e.closest("[data-panel-action-form]"), r = t?.dataset.cmdlDebugPath || "", a = t?.dataset.cmdlOptionResolver || "", n = s?.dataset.cmdlCommand || "", i = e.dataset.cmdlOptionField || "", o = e.dataset.cmdlOptionSource || "";
  if (!t || !s || !r || !a || !n || !i || !o) {
    o && (!r || !a) && ie(e, "Dynamic options are unavailable because no option resolver is configured.", "error");
    return;
  }
  const l = (ae.get(e) || 0) + 1;
  ae.set(e, l), ie(e, "Loading options…", "loading");
  const d = e.querySelector("[data-cmdl-option-control]");
  d && (d.disabled = !0);
  try {
    const p = await L(`${r}/api/panels/${Y}/actions/${encodeURIComponent(a)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command_id: n,
        field_path: i,
        source_id: o,
        payload: Ce(s)
      })
    });
    if (!p.ok) {
      const h = await Ye(p, `Options failed to load (${p.status})`, { appendStatusToFallback: !1 });
      throw new Error(h.message);
    }
    const g = await H(p);
    if (ae.get(e) !== l) return;
    const y = Array.isArray(g.data?.option_items) ? g.data.option_items : [], m = Array.isArray(g.data?.options) ? g.data.options.map((h) => ({
      value: h,
      label: h
    })) : [];
    Ms(e, y.length > 0 ? y : m);
  } catch (p) {
    if (ae.get(e) !== l) return;
    ie(e, p instanceof Error ? p.message : "Options failed to load.", "error"), d && (d.disabled = d.options.length <= 1);
  }
}
async function Fs(e, t = "") {
  const s = C(t), r = Array.from(e.querySelectorAll("[data-cmdl-option-source]"));
  await Promise.all(r.filter((a) => s ? (a.dataset.cmdlOptionDepends || "").split(",").map((n) => C(f(n))).filter(Boolean).includes(s) : !0).map((a) => st(a)));
}
function js(e, t) {
  const s = new Set(t.map(C).filter(Boolean));
  e.querySelectorAll("[data-cmdl-option-source]").forEach((r) => {
    if (!(r.dataset.cmdlOptionDepends || "").split(",").map((n) => C(f(n))).filter(Boolean).some((n) => s.has(n))) return;
    const a = He.get(r);
    a !== void 0 && window.clearTimeout(a), He.set(r, window.setTimeout(() => {
      st(r);
    }, 200));
  });
}
function Ns(e) {
  return e instanceof HTMLInputElement && e.type === "checkbox" ? e.checked ? "true" : "false" : e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement ? e.value : "";
}
function Bs(e, t) {
  if (e instanceof HTMLInputElement && e.type === "checkbox") {
    e.checked = t === "true";
    return;
  }
  if (e instanceof HTMLInputElement && e.dataset.cmdlChipsValue !== void 0) {
    const s = e.closest("[data-cmdl-chips]");
    s ? T(s, t ? t.split(`
`).map((r) => r.trim()).filter(Boolean) : []) : e.value = t;
    return;
  }
  (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (e.value = t);
}
function $e(e) {
  const t = $(e.dataset.actionId || "");
  if (!t) return;
  const s = {};
  e.querySelectorAll("[data-action-field]").forEach((r) => {
    if (r.dataset.actionFieldSensitive === "true") return;
    const a = C(f(r.dataset.actionFieldPath)) || f(r.dataset.actionField);
    a && (s[a] = Ns(r));
  }), Pe.set(t, s);
}
function U(e) {
  const t = e.closest("[data-panel-action-form]");
  t && $e(t);
}
function Us(e) {
  const t = $(e.dataset.actionId || ""), s = t ? Pe.get(t) : void 0;
  s && e.querySelectorAll("[data-action-field]").forEach((r) => {
    if (r.dataset.actionFieldSensitive === "true") return;
    const a = C(f(r.dataset.actionFieldPath)) || f(r.dataset.actionField);
    a && Object.prototype.hasOwnProperty.call(s, a) && Bs(r, s[a]);
  });
}
function Hs(e) {
  e.querySelectorAll("[data-cmdl-chips]").forEach((t) => {
    const s = t.querySelector("[data-cmdl-chips-entry]");
    s && s.value.trim() && (Ae(t, s.value), s.value = "");
  });
}
var Js = 6;
function le() {
  try {
    return typeof localStorage < "u" ? localStorage : null;
  } catch {
    return null;
  }
}
function z(e) {
  const t = le();
  if (!t) return [];
  try {
    const s = t.getItem(e), r = s ? JSON.parse(s) : [];
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
function Se(e, t) {
  const s = le();
  if (s)
    try {
      s.setItem(e, JSON.stringify(t));
    } catch {
    }
}
function xe(e) {
  return `cmdl:recent:${e}`;
}
function K(e) {
  return `cmdl:preset:${e}`;
}
function Ks(e) {
  const t = e && typeof e == "object" ? e : {}, s = f(t.command_id), r = t.payload && typeof t.payload == "object" ? t.payload : {};
  if (!s || Object.keys(r).length === 0) return;
  const a = xe(s), n = JSON.stringify(r), i = z(a).filter((o) => JSON.stringify(o.payload) !== n);
  i.unshift({
    at: Date.now(),
    payload: r
  }), Se(a, i.slice(0, Js));
}
function Ce(e) {
  const t = ye(e, { excludeSensitive: !0 }).payload;
  return t && typeof t == "object" && !Array.isArray(t) ? t : {};
}
function zs(e, t) {
  const s = C(t).split(".").map(f).filter(Boolean);
  if (s.length === 0) return { found: !1 };
  let r = e;
  for (const a of s) {
    if (!r || typeof r != "object" || Array.isArray(r) || !Object.prototype.hasOwnProperty.call(r, a)) return { found: !1 };
    r = r[a];
  }
  return {
    found: !0,
    value: r
  };
}
function Je(e, t) {
  if (e instanceof HTMLInputElement && e.type === "checkbox") {
    e.checked = t === !0 || t === "true";
    return;
  }
  if (e instanceof HTMLInputElement && e.dataset.cmdlChipsValue !== void 0) {
    const s = Array.isArray(t) ? t.map(f).filter(Boolean) : f(t) ? [f(t)] : [], r = e.closest("[data-cmdl-chips]");
    r && T(r, s);
    return;
  }
  (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (t == null ? e.value = "" : typeof t == "object" ? e.value = JSON.stringify(t, null, 2) : e.value = String(t));
}
function rt(e, t) {
  e.querySelectorAll("[data-action-field]").forEach((s) => {
    if (s.dataset.actionFieldSensitive === "true") return;
    const r = f(s.dataset.actionField), a = zs(t, C(f(s.dataset.actionFieldPath)) || r);
    a.found ? Je(s, a.value) : r && Object.prototype.hasOwnProperty.call(t, r) && Je(s, t[r]);
  }), $e(e);
}
function we(e) {
  const t = f(e.dataset.cmdlCommand), s = e.querySelector("[data-cmdl-recall-list]");
  if (!t || !s) return;
  const r = z(xe(t)), a = z(K(t)), n = [];
  r.forEach((i, o) => {
    n.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${o}" title="Reload recent invocation ${o + 1}">↻ recent ${o + 1}</button>`);
  }), a.forEach((i, o) => {
    const l = f(i.name) || `preset ${o + 1}`;
    n.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${o}" title="Load saved preset">★ ${u(l)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${o}" aria-label="Delete preset ${u(l)}">×</button></span>`);
  }), s.innerHTML = n.length ? n.join("") : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}
function Vs(e, t) {
  const s = e.closest("[data-cmdl-load]");
  if (s) {
    const n = s.closest("[data-panel-action-form]"), i = f(s.closest("[data-cmdl-recall]")?.dataset.cmdlCommand), [o, l] = (s.dataset.cmdlLoad || "").split(":"), d = Number(l);
    if (n && i && Number.isInteger(d)) {
      const p = z(o === "preset" ? K(i) : xe(i))[d]?.payload;
      p && typeof p == "object" && rt(n, p);
    }
    return !0;
  }
  const r = e.closest("[data-cmdl-save-preset]");
  if (r) {
    const n = r.closest("[data-panel-action-form]"), i = r.closest("[data-cmdl-recall]"), o = f(i?.dataset.cmdlCommand);
    if (n && i && o) {
      const l = (typeof window < "u" && typeof window.prompt == "function" ? window.prompt("Preset name") : "") || "";
      if (l.trim()) {
        const d = z(K(o)).filter((p) => f(p.name) !== l.trim());
        d.unshift({
          name: l.trim(),
          payload: Ce(n)
        }), Se(K(o), d), we(i);
      }
    }
    return !0;
  }
  const a = e.closest("[data-cmdl-del-preset]");
  if (a) {
    const n = a.closest("[data-cmdl-recall]"), i = f(n?.dataset.cmdlCommand), o = Number(a.dataset.cmdlDelPreset);
    if (n && i && Number.isInteger(o)) {
      const l = z(K(i));
      l.splice(o, 1), Se(K(i), l), we(n);
    }
    return !0;
  }
  return !1;
}
function Qs(e, t) {
  if (We(e)) return;
  const s = e.querySelector("[data-cmdl-fields]"), r = e.querySelector("[data-cmdl-json]"), a = e.querySelector("[data-cmdl-json-editor]"), n = e.querySelector("[data-cmdl-json-toggle]"), i = e.querySelector("[data-cmdl-json-error]");
  if (!s || !r || !a) return;
  if (t) {
    a.value = JSON.stringify(Ce(e), null, 2), i && (i.hidden = !0), s.hidden = !0, r.hidden = !1, e.dataset.cmdlMode = "json", n && (n.textContent = "Form");
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
  rt(e, o), s.hidden = !1, r.hidden = !0, e.dataset.cmdlMode = "form", n && (n.textContent = "JSON");
}
function Ae(e, t) {
  const s = t.split(/[\n,]/g).map((a) => a.trim()).filter(Boolean);
  if (s.length === 0) return;
  const r = j(e);
  s.forEach((a) => {
    r.includes(a) || r.push(a);
  }), T(e, r);
}
function Xs(e) {
  e.querySelectorAll("[data-cmdl-chips]").forEach((t) => {
    T(t, j(t));
  });
}
function Ys() {
  const e = le();
  if (!e) return 0;
  try {
    const t = Number(e.getItem(Ge));
    return Number.isFinite(t) && t >= _e ? t : 0;
  } catch {
    return 0;
  }
}
function Ws(e) {
  const t = e.clientWidth || 0;
  return t > 0 ? Math.max(_e, t - is) : ns;
}
function pe(e, t) {
  const s = Math.min(Math.max(Math.round(t), _e), Ws(e));
  F = s, e.style.setProperty("--cmdl-sidebar-w", `${s}px`);
  const r = le();
  if (r) try {
    r.setItem(Ge, String(s));
  } catch {
  }
  return s;
}
function Gs(e) {
  F || (F = Ys()), F && e.style.setProperty("--cmdl-sidebar-w", `${F}px`);
}
function Zs(e) {
  const t = e.querySelector("[data-cmdl-resizer]"), s = e.querySelector("[data-cmdl-body]");
  !t || !s || (Gs(s), t.addEventListener("pointerdown", (r) => {
    r.preventDefault();
    const a = r.clientX, n = F || Re;
    if (typeof t.setPointerCapture == "function") try {
      t.setPointerCapture(r.pointerId);
    } catch {
    }
    const i = (l) => pe(s, n + (l.clientX - a)), o = (l) => {
      pe(s, n + (l.clientX - a)), t.removeEventListener("pointermove", i), t.removeEventListener("pointerup", o), t.removeEventListener("pointercancel", o);
    };
    t.addEventListener("pointermove", i), t.addEventListener("pointerup", o), t.addEventListener("pointercancel", o);
  }), t.addEventListener("keydown", (r) => {
    r.key !== "ArrowLeft" && r.key !== "ArrowRight" || (r.preventDefault(), pe(s, (F || Re) + (r.key === "ArrowRight" ? Ie : -Ie)));
  }));
}
function fe(e, t) {
  const s = e.querySelector("[data-cmdl-bar-main]"), r = e.querySelector("[data-cmdl-confirm-row]");
  if (!s || !r) return;
  s.hidden = t, r.hidden = !t;
  const a = t ? r.querySelector("[data-cmdl-confirm-run]") : s.querySelector("button");
  if (a && typeof a.focus == "function") try {
    a.focus();
  } catch {
  }
}
function er(e, t = {}) {
  const s = e.querySelector("[data-cmdl-root]");
  if (!s) return;
  s.dataset.cmdlDebugPath = f(t.debugPath), Xs(s), Zs(s), s.querySelectorAll("[data-panel-action-form]").forEach((n) => Us(n)), s.querySelectorAll("[data-cmdl-recall]").forEach((n) => we(n));
  const r = s.querySelector("[data-cmdl-filter]");
  r && te && (r.value = te, Be(s, te)), ne && s.querySelector(`[data-cmdl-item="${at(ne)}"]`) && re(s, ne), s.addEventListener("click", (n) => {
    const i = n.target;
    if (Vs(i, s)) return;
    const o = i.closest("[data-cmdl-json-toggle]");
    if (o) {
      const h = o.closest("[data-panel-action-form]");
      h && Qs(h, h.dataset.cmdlMode !== "json");
      return;
    }
    const l = i.closest("[data-cmdl-confirm-run]");
    if (l) {
      const h = l.closest("[data-panel-action-form]");
      h && (h.dataset.cmdlArmed = "true");
      return;
    }
    const d = i.closest("[data-cmdl-cancel]");
    if (d) {
      const h = d.closest("[data-panel-action-form]");
      h && (delete h.dataset.cmdlArmed, fe(h, !1));
      return;
    }
    const p = i.closest("[data-cmdl-item]");
    if (p) {
      re(s, p.dataset.cmdlItem || "");
      return;
    }
    const g = i.closest("[data-cmdl-section-toggle]");
    if (g) {
      const h = g.closest(".cmdl-section");
      if (h) {
        const b = h.classList.toggle("cmdl-section--collapsed");
        g.setAttribute("aria-expanded", b ? "false" : "true");
      }
      return;
    }
    const y = i.closest("[data-cmdl-chip-remove]");
    if (y) {
      const h = y.closest("[data-cmdl-chips]");
      if (h) {
        const b = j(h), S = Number(y.dataset.cmdlChipRemove);
        Number.isInteger(S) && (b.splice(S, 1), T(h, b), U(h));
      }
    }
    const m = i.closest("[data-cmdl-option-value]");
    if (m && !m.hasAttribute("disabled")) {
      const h = m.closest("[data-cmdl-option-source], .cmdl-field--list")?.querySelector("[data-cmdl-chips]"), b = m.dataset.cmdlOptionValue || "";
      if (h && b) {
        const S = j(h), A = S.indexOf(b);
        A >= 0 ? S.splice(A, 1) : S.push(b), T(h, S), U(h);
      }
    }
  }), r && (r.addEventListener("input", () => {
    te = r.value, Be(s, r.value);
  }), r.addEventListener("keydown", (n) => {
    if (n.key === "ArrowDown" || n.key === "Enter") {
      const i = Ue(s)[0];
      i && (n.preventDefault(), n.key === "Enter" ? re(s, i.dataset.cmdlItem || "") : i.focus());
    }
  }));
  const a = (n) => {
    const i = n.target?.closest("[data-action-field]");
    if (i) {
      U(i);
      const o = i.closest("[data-panel-action-form]"), l = C(f(i.dataset.actionFieldPath)), d = f(i.dataset.actionField);
      if (o && (l || d) && js(o, [l, d]), i instanceof HTMLSelectElement) {
        const p = i.selectedOptions[0]?.dataset.optionDescription || "", g = i.closest(".cmdl-field")?.querySelector("[data-cmdl-option-description]");
        g && (g.textContent = p);
      }
    }
  };
  s.addEventListener("input", a), s.addEventListener("change", a), s.addEventListener("submit", (n) => {
    const i = n.target?.closest("[data-panel-action-form]");
    if (i) {
      if (i.dataset.cmdlConfirm === "true" && i.dataset.cmdlArmed !== "true") {
        n.preventDefault(), n.stopImmediatePropagation(), fe(i, !0);
        return;
      }
      Hs(i), $e(i), i.dataset.cmdlConfirm === "true" && (delete i.dataset.cmdlArmed, fe(i, !1));
    }
  }, !0), s.addEventListener("keydown", (n) => {
    const i = n.target, o = i.closest("[data-cmdl-section-toggle]");
    if (o && (n.key === "Enter" || n.key === " ")) {
      n.preventDefault(), o.dispatchEvent(new MouseEvent("click", { bubbles: !0 }));
      return;
    }
    const l = i.closest("[data-cmdl-chips-entry]");
    if (l) {
      if (n.key === "Enter" || n.key === ",") {
        n.preventDefault();
        const p = l.closest("[data-cmdl-chips]");
        p && (Ae(p, l.value), l.value = "", U(p));
      } else if (n.key === "Backspace" && l.value === "") {
        const p = l.closest("[data-cmdl-chips]");
        if (p) {
          const g = j(p);
          g.pop(), T(p, g), U(p);
        }
      }
      return;
    }
    const d = i.closest("[data-cmdl-item]");
    if (d && (n.key === "ArrowDown" || n.key === "ArrowUp")) {
      n.preventDefault();
      const p = Ue(s), g = p.indexOf(d), y = p[n.key === "ArrowDown" ? g + 1 : g - 1];
      y ? y.focus() : n.key === "ArrowUp" && r && r.focus();
      return;
    }
    d && n.key === "Enter" && (n.preventDefault(), re(s, d.dataset.cmdlItem || ""));
  }), s.addEventListener("paste", (n) => {
    const i = n.target.closest("[data-cmdl-chips-entry]");
    if (!i) return;
    const o = n.clipboardData?.getData("text") || "";
    if (/[\n,]/.test(o)) {
      n.preventDefault();
      const l = i.closest("[data-cmdl-chips]");
      l && (Ae(l, o), i.value = "", U(l));
    }
  }), s.addEventListener("reset", (n) => {
    const i = n.target, o = $(i.dataset.actionId || "");
    o && Pe.delete(o), window.setTimeout(() => {
      i.querySelectorAll("[data-cmdl-chips]").forEach((l) => {
        T(l, j(l));
      });
    }, 0);
  });
}
function at(e) {
  return e.replace(/["\\]/g, "\\$&");
}
Mt(Y, Cs);
var Ke = "debug-console-active-panel", ze = "debug-console-panel-order", tr = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, Ve = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, sr = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : Ft(), me = (e, t) => ss(e, t), rr = (e, t, s) => {
  if (!e || !t) return;
  const r = t.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0) return;
  let a = e;
  for (let n = 0; n < r.length - 1; n += 1) {
    const i = r[n];
    (!a[i] || typeof a[i] != "object") && (a[i] = {}), a = a[i];
  }
  a[r[r.length - 1]] = s;
}, ge = (e, t) => {
  if (!e) return t;
  const s = Number(e);
  return Number.isNaN(s) ? t : s;
}, Qe = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, ar = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.pauseButton = null, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.container = e;
    const t = sr(Ve(e.dataset.panels));
    t.includes("sessions") || t.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(t), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = ge(e.dataset.maxLogEntries, 500), this.maxSQLQueries = ge(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = ge(e.dataset.slowThresholdMs, 50), this.replCommands = It(Ve(e.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), kt.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = de(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.sqlView = new At({
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
    }), this.logsView = new ce({
      styles: w,
      keyOf: yt,
      renderRow: (s) => gt(s, w, {
        showSource: !0,
        truncateMessage: !1
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.logEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAfterAppend: () => this.applyLogsAutoScroll()
    }), this.requestsView = new ce({
      styles: w,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: Pt,
      renderRow: (s) => _t(s, w, {
        expandedRequestIds: this.expandedRequests,
        truncatePath: !1,
        slowThresholdMs: this.slowThresholdMs
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.requestEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => bt(s, this.expandedRequests, { useIconFeedback: !0 })
    }), this.jserrorsView = new ce({
      styles: w,
      keyOf: Et,
      renderRow: (s) => wt(s, w, { compact: !1 }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => ot(s, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (s) => dt(s, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new St({
      styles: w,
      getRenderOptions: () => ({}),
      shouldDisplay: (s, r) => {
        if (!s.applyFilters) return !0;
        const a = this.getPanelFilterState(s.id, s), n = s.applyFilters([r], a);
        return Array.isArray(n) ? n.length > 0 : !0;
      },
      onNeedFullRender: () => this.renderPanel()
    }), this.bindActions(), this.updateSessionBanner(), this.stream = new Oe({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = R.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder(), await jt(this.debugPath), this.eventToPanel = de(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const s of Dt(t)) e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null;
    try {
      e = this.normalizeStoredPanelID(sessionStorage.getItem(Ke));
    } catch {
      e = null;
    }
    this.activePanel = e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(Ke, this.activePanel);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(ze, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const e = this.panelOrderPreferencesPath.trim();
    if (!e) return !1;
    try {
      const t = await L(e, {
        method: "GET",
        credentials: "same-origin"
      });
      if (!t.ok) return !1;
      const s = await H(t);
      return !s?.available || !s.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(s.panel_order), this.savedPanelOrder.length > 0);
    } catch {
      return !1;
    }
  }
  async saveServerPanelOrderPreference(e) {
    const t = this.panelOrderPreferencesPath.trim();
    if (t)
      try {
        await L(t, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: e }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const e = localStorage.getItem(ze);
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
    return !t || !tr.test(t) ? null : t;
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
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = it.create(this.tabsEl, {
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
    this.eventToPanel = de(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((n) => n !== t), delete this.customFilterState[t]), this.applyPanelOrder();
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
      const s = t.closest("[data-doctor-action-run]");
      if (!s || s.disabled) return;
      const r = s.dataset.doctorActionRun || "", a = s.dataset.doctorActionConfirm || "", n = s.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(r, a, n);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const s = t === this.activePanel ? "debug-tab--active" : "", r = xt(Rt(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${u(t)}">
            ${r}
            <span class="debug-tab__label">${u(ke(t))}</span>
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
      const r = R.get(e);
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
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), s = R.get(e);
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
    const s = t || R.get(e);
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
      const a = R.get(e);
      if (a && (a.renderConsole || a.render)) {
        const n = ee(a);
        let i = this.getStateForKey(n);
        if (a.applyFilters) {
          const o = this.getPanelFilterState(e, a);
          i = a.applyFilters(i, o);
        } else if (!a.renderFilters && a.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && i && typeof i == "object" && !Array.isArray(i) && (i = me(i, o));
        }
        s = (a.renderConsole || a.render)(i, w, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(ke(e), this.state.extra[e], this.filters.objects.search);
    }
    this.panelEl.innerHTML = s, e === "logs" && this.applyLogsAutoScroll(), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && this.requestsView.adopt(this.panelEl), e === "sql" && this.mountSQLView(), e === "logs" && this.logsView.adopt(this.panelEl), e === "jserrors" && this.jserrorsView.adopt(this.panelEl);
    const r = R.get(e);
    r && this.registryLiveList.handles(r) && this.registryLiveList.adopt(r, this.panelEl), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && er(this.panelEl, { debugPath: this.debugPath }), this.renderStoredPanelActionResult(e);
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
    const o = s || ye(e);
    let l = o;
    r === "commands" && e instanceof HTMLFormElement && (l = ye(e, { excludeSensitive: !0 }), We(e) ? this.commandLauncherLastPayloads.delete(a) : this.commandLauncherLastPayloads.set(a, Qe(o))), t && (t.disabled = !0);
    const d = Date.now();
    try {
      const p = await L(`${this.debugPath}/api/panels/${encodeURIComponent(r)}/actions/${encodeURIComponent(a)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!p.ok) {
        const y = await Ye(p, `Action failed (${p.status})`, { appendStatusToFallback: !1 });
        this.showPanelActionResult(r, "error", y.message, a, y.payload, void 0, {
          at: Date.now(),
          durationMs: Date.now() - d
        });
        return;
      }
      const g = await H(p);
      this.showPanelActionResult(r, g.ok === !1 ? "error" : "ok", g.message || (g.ok === !1 ? "Action failed" : "Action complete"), a, g.data, g.errors, {
        at: Date.now(),
        durationMs: Date.now() - d
      }), r === "commands" && Ks(l), g.event && this.handleEvent(g.event), g.refresh && await this.fetchSnapshot();
    } catch (p) {
      const g = p instanceof Error ? p.message : "Action failed";
      this.showPanelActionResult(r, "error", g, a, void 0, void 0, {
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
      const n = Ts(t.status, t.message, t.data, t.errors), i = {};
      n.validationErrors.forEach((d) => {
        d.path && (i[d.path] = d.message || d.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(i, t.errors), this.renderPanelActionErrors(i, t.actionID);
      const o = !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)), l = ls(n.correlationId);
      s.innerHTML = Is(n, {
        canRetry: o,
        at: t.at,
        durationMs: t.durationMs,
        liveStatus: l
      }), this.attachCommandLauncherResultActions(s, t.actionID);
      return;
    }
    const r = this.renderPanelActionErrors(t.errors, t.actionID), a = t.data === void 0 ? "" : `<pre class="${w.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${u(Le(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${t.status === "error" ? w.badgeError : w.badge}">${u(t.message)}</div>${r}${a}`;
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
    r && this.runPanelAction(r, t, Qe(s));
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
    return Object.entries(e).forEach(([r, a]) => {
      const n = this.stringifyActionError(a);
      if (!n) return;
      const i = r.trim(), o = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((l) => t && l.dataset.actionId !== t ? !1 : l.dataset.actionFieldError === i || l.dataset.actionFieldName === i || l.dataset.actionFieldError === `payload.${i}`);
      if (o) {
        o.textContent = n, o.hidden = !1;
        return;
      }
      s.push(n);
    }), s.length === 0 ? "" : `<ul class="${w.badgeError}" style="margin-top:0.5rem">${s.map((r) => `<li>${u(r)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    ut(this.panelEl);
  }
  attachCopyButtonListeners() {
    lt(this.panelEl, { useIconFeedback: !0 });
  }
  mountSQLView() {
    this.sqlView.adopt(this.panelEl);
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new $t({
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
    return t.length === 0 ? this.renderEmptyState("No requests captured yet.") : pt(t, w, {
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
    return t.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : ct(t, w, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  logEntryMatchesFilters(e) {
    const { level: t, search: s } = this.filters.logs;
    return !(t !== "all" && (e.level || "").toLowerCase() !== t || s && !`${e.message || ""} ${e.source || ""} ${Le(e.fields || {})}`.toLowerCase().includes(s.toLowerCase()));
  }
  applyLogsAutoScroll() {
    this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight);
  }
  renderLogs() {
    const { newestFirst: e } = this.filters.logs, t = this.state.logs.filter((s) => this.logEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No logs captured yet.") : ht(t, w, {
      newestFirst: e,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((a) => {
      if (e !== "all" && (a.method || "").toUpperCase() !== e) return !1;
      const n = `${a.path || ""} ${a.handler || ""} ${a.summary || ""}`.toLowerCase();
      return !(s && !n.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : vt(r, w, { showName: !0 });
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
      const i = n.session_id || "", o = n.username || n.user_id || "Unknown", l = Ct(n.last_activity || n.started_at), d = Z(n.request_count ?? 0), p = !!i && i === this.activeSessionId, g = p ? "detach" : "attach", y = p ? "Detach" : "Attach", m = p ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", h = p ? "debug-session-row debug-session-row--active" : "debug-session-row", b = n.current_page || "-", S = n.ip || "-";
      return `
          <tr class="${h}">
            <td>
              <div class="debug-session-user">${u(o)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${u(i || "-")}</span>
              </div>
            </td>
            <td>${u(S)}</td>
            <td>
              <span class="debug-session-path">${u(b)}</span>
            </td>
            <td>${u(l || "-")}</td>
            <td>${u(d)}</td>
            <td>
              <button class="${m}" data-session-action="${g}" data-session-id="${u(i)}">
                ${y}
              </button>
            </td>
          </tr>
        `;
    }).join(""), a = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${Z(s.length)} active`}</span>
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
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : mt(this.state.custom, w, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (r) => me(r, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const r = t && typeof t == "object" && !Array.isArray(t), a = Array.isArray(t);
    return r && Object.keys(t || {}).length === 0 || a && (t || []).length === 0 || !r && !a && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : Ot(e, t, w, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (n) => me(n, s) : void 0
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
        const t = await L(`${this.debugPath}/api/sessions`, { credentials: "same-origin" });
        if (!t.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const s = await H(t);
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
    this.stream.close(), this.stream = new Oe({
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
      const t = R.get(e);
      if (t) {
        const s = ee(t);
        return Tt({ [s]: this.getStateForKey(s) }, t);
      }
    }
    switch (e) {
      case "template":
        return Q(this.state.template);
      case "session":
        return Q(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return Q(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return Q(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return Q(this.state.extra[e]);
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
      s && (s.textContent = Z(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${Z(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
      os(e.payload), this.activePanel === "commands" && this.renderStoredPanelActionResult("commands");
      return;
    }
    const t = this.eventToPanel[e.type] || e.type, s = R.get(t);
    if (s) {
      const r = ee(s), a = this.getStateForKey(r), n = (s.handleEvent || ((i, o) => Nt(i, o, this.maxLogEntries)))(a, e.payload);
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
        qt(t) || (this.state.extra[t] = e.payload);
        break;
    }
    if (this.updateTabCounts(), t === this.activePanel) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(s)) {
      const r = this.getStateForKey(ee(s)), a = Array.isArray(r) ? r[r.length - 1] : void 0;
      this.registryLiveList.enqueue(s, a);
    } else this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        rr(this.state.custom.data, String(e.key), e.value);
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
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = X(t.requests), this.state.sql = X(t.sql), this.state.logs = X(t.logs), this.state.config = t.config || {}, this.state.routes = X(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: X(s.logs)
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
  isSlowQuery(e) {
    return Lt(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.debugPath && !this.activeSessionId)
      try {
        const e = await L(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
        if (!e.ok) return;
        const t = await H(e);
        this.applySnapshot(t);
      } catch {
      }
  }
  clearAll() {
    this.debugPath && (this.stream.clear(), !this.activeSessionId && L(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const e = this.activePanel;
    this.stream.clear([e]), !this.activeSessionId && L(`${this.debugPath}/api/clear/${e}`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    });
  }
  async parseJSONResponse(e) {
    const t = await H(e);
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
      const n = await L(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
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
}, nr = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new ar(t) : null;
}, Xe = () => {
  nr();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", Xe) : Xe();
export {
  yr as DATA_ATTRS,
  kr as DEBUG_ICON_REFS,
  ar as DebugPanel,
  Oe as DebugStream,
  ur as INTERACTION_CLASSES,
  ce as LiveListView,
  St as RegistryLiveListManager,
  br as RemoteDebugStream,
  At as SqlLiveView,
  Mr as appendListRow,
  mr as appendSqlRowDOM,
  zr as applyCustomEventPayload,
  Wr as applyDebugEventToSnapshot,
  lt as attachCopyListeners,
  ut as attachExpandableRowListeners,
  bt as attachRequestDetailListeners,
  ot as attachRowExpansion,
  de as buildEventToPanel,
  w as consoleStyles,
  fr as copyToClipboard,
  Q as countPayload,
  ta as defaultGetCount,
  Nt as defaultHandleEvent,
  u as escapeHTML,
  Fr as evictListOverflow,
  hr as evictSqlOverflow,
  Vr as fetchDebugSnapshot,
  Jr as formatDuration,
  Le as formatJSON,
  Z as formatNumber,
  Ct as formatTimestamp,
  Or as getDebugIconRef,
  Ft as getDefaultPanels,
  ea as getDefaultToolbarPanels,
  Gr as getLevelClass,
  Tt as getPanelCount,
  sa as getPanelData,
  Dt as getPanelEventTypes,
  Rt as getPanelIcon,
  ke as getPanelLabel,
  ee as getSnapshotKey,
  jr as getStatusClass,
  dr as getStyleConfig,
  Yr as getToolbarCounts,
  Nr as hashString,
  nr as initDebugPanel,
  qt as isKnownPanel,
  qr as isSchemaListRenderer,
  Lt as isSlowDuration,
  Et as jsErrorRowKey,
  yt as logRowKey,
  Rr as normalizeEventTypes,
  It as normalizeReplCommands,
  Zr as panelDefinitionFromServer,
  R as panelRegistry,
  mt as renderCustomPanel,
  Lr as renderDebugIcon,
  xt as renderDebugIconRef,
  Er as renderDoctorPanel,
  wr as renderDoctorPanelCompact,
  wt as renderErrorRow,
  ft as renderJSErrorsPanel,
  Ot as renderJSONPanel,
  Br as renderJSONViewer,
  gt as renderLogRow,
  ht as renderLogsPanel,
  Hr as renderPanelContent,
  Pr as renderPermissionsPanel,
  vr as renderPermissionsPanelCompact,
  _t as renderRequestRow,
  pt as renderRequestsPanel,
  vt as renderRoutesPanel,
  ct as renderSQLPanel,
  pr as renderSQLRow,
  gr as renderSQLRowsHTML,
  Ir as renderSchemaListRow,
  Ur as renderSchemaStatusList,
  Xr as renderSchemaTable,
  Dr as renderSchemaTimeline,
  Ar as renderSiteRenderCachePanel,
  Sr as renderSiteRenderCachePanelCompact,
  kt as replPanelIDs,
  Pt as requestRowKey,
  dt as restoreRowExpansion,
  Qr as schemaRowKey,
  $r as sqlRowKey,
  _r as toolbarStyles,
  Kr as truncate
};

//# sourceMappingURL=index.js.map