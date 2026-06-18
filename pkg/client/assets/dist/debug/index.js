import { escapeHTML as h } from "../shared/html.js";
import { httpRequest as T, readHTTPError as Se } from "../shared/transport/http-client.js";
import { t as Pe } from "../chunks/sortable.esm-CcMbOE-M.js";
import { E as Gt, S as Ae, T as ae, _ as Zt, a as Wt, b as we, c as xe, d as Ce, f as _e, g as es, h as ts, i as ss, l as Oe, m as P, n as rs, o as is, p as $e, r as ns, s as as, t as ke, u as Le, v as os, w as ls, x as De, y as Te } from "../chunks/builtin-panels-Df3h6Xh_.js";
import { t as Ie } from "../chunks/repl-panel-DOA-vKgf.js";
import { i as Re, n as hs, r as us, t as fs } from "../chunks/icons-SGrt9O6P.js";
import { A as M, B as ms, C as gs, D as bs, E as qe, F as H, I as je, L as ys, N as Es, P as oe, R as vs, S as V, T as Ss, _ as Me, a as Ps, b as Ne, c as As, d as Fe, f as Be, g as Ue, h as He, i as Je, j as N, l as Ke, m as ws, n as ze, o as xs, p as le, s as Y, u as Cs, v as _s, w as L, x as Os, y as Qe, z as Xe } from "../chunks/server-definitions-Cw_avwJX.js";
var Ve = class {
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
}, Ye = class {
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
}, A = class o {
  static get version() {
    return "1.4.0";
  }
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + o.version;
  }
  static addUnaryOp(t) {
    return o.max_unop_len = Math.max(t.length, o.max_unop_len), o.unary_ops[t] = 1, o;
  }
  static addBinaryOp(t, s, r) {
    return o.max_binop_len = Math.max(t.length, o.max_binop_len), o.binary_ops[t] = s, r ? o.right_associative.add(t) : o.right_associative.delete(t), o;
  }
  static addIdentifierChar(t) {
    return o.additional_identifier_chars.add(t), o;
  }
  static addLiteral(t, s) {
    return o.literals[t] = s, o;
  }
  static removeUnaryOp(t) {
    return delete o.unary_ops[t], t.length === o.max_unop_len && (o.max_unop_len = o.getMaxKeyLen(o.unary_ops)), o;
  }
  static removeAllUnaryOps() {
    return o.unary_ops = {}, o.max_unop_len = 0, o;
  }
  static removeIdentifierChar(t) {
    return o.additional_identifier_chars.delete(t), o;
  }
  static removeBinaryOp(t) {
    return delete o.binary_ops[t], t.length === o.max_binop_len && (o.max_binop_len = o.getMaxKeyLen(o.binary_ops)), o.right_associative.delete(t), o;
  }
  static removeAllBinaryOps() {
    return o.binary_ops = {}, o.max_binop_len = 0, o;
  }
  static removeLiteral(t) {
    return delete o.literals[t], o;
  }
  static removeAllLiterals() {
    return o.literals = {}, o;
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
    return new o(t).parse();
  }
  static getMaxKeyLen(t) {
    return Math.max(0, ...Object.keys(t).map((s) => s.length));
  }
  static isDecimalDigit(t) {
    return t >= 48 && t <= 57;
  }
  static binaryPrecedence(t) {
    return o.binary_ops[t] || 0;
  }
  static isIdentifierStart(t) {
    return t >= 65 && t <= 90 || t >= 97 && t <= 122 || t >= 128 && !o.binary_ops[String.fromCharCode(t)] || o.additional_identifier_chars.has(String.fromCharCode(t));
  }
  static isIdentifierPart(t) {
    return o.isIdentifierStart(t) || o.isDecimalDigit(t);
  }
  throwError(t) {
    const s = /* @__PURE__ */ new Error(t + " at character " + this.index);
    throw s.index = this.index, s.description = t, s;
  }
  runHook(t, s) {
    if (o.hooks[t]) {
      const r = {
        context: this,
        node: s
      };
      return o.hooks.run(t, r), r.node;
    }
    return s;
  }
  searchHook(t) {
    if (o.hooks[t]) {
      const s = { context: this };
      return o.hooks[t].find(function(r) {
        return r.call(s.context, s), s.node;
      }), s.node;
    }
  }
  gobbleSpaces() {
    let t = this.code;
    for (; t === o.SPACE_CODE || t === o.TAB_CODE || t === o.LF_CODE || t === o.CR_CODE; ) t = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  parse() {
    this.runHook("before-all");
    const t = this.gobbleExpressions(), s = t.length === 1 ? t[0] : {
      type: o.COMPOUND,
      body: t
    };
    return this.runHook("after-all", s);
  }
  gobbleExpressions(t) {
    let s = [], r, i;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === o.SEMCOL_CODE || r === o.COMMA_CODE) this.index++;
      else if (i = this.gobbleExpression()) s.push(i);
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
    let t = this.expr.substr(this.index, o.max_binop_len), s = t.length;
    for (; s > 0; ) {
      if (o.binary_ops.hasOwnProperty(t) && (!o.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !o.isIdentifierPart(this.expr.charCodeAt(this.index + t.length))))
        return this.index += s, t;
      t = t.substr(0, --s);
    }
    return !1;
  }
  gobbleBinaryExpression() {
    let t, s, r, i, n, a, c, d, l;
    if (a = this.gobbleToken(), !a || (s = this.gobbleBinaryOp(), !s)) return a;
    for (n = {
      value: s,
      prec: o.binaryPrecedence(s),
      right_a: o.right_associative.has(s)
    }, c = this.gobbleToken(), c || this.throwError("Expected expression after " + s), i = [
      a,
      n,
      c
    ]; s = this.gobbleBinaryOp(); ) {
      if (r = o.binaryPrecedence(s), r === 0) {
        this.index -= s.length;
        break;
      }
      n = {
        value: s,
        prec: r,
        right_a: o.right_associative.has(s)
      }, l = s;
      const u = (g) => n.right_a && g.right_a ? r > g.prec : r <= g.prec;
      for (; i.length > 2 && u(i[i.length - 2]); )
        c = i.pop(), s = i.pop().value, a = i.pop(), t = {
          type: o.BINARY_EXP,
          operator: s,
          left: a,
          right: c
        }, i.push(t);
      t = this.gobbleToken(), t || this.throwError("Expected expression after " + l), i.push(n, t);
    }
    for (d = i.length - 1, t = i[d]; d > 1; )
      t = {
        type: o.BINARY_EXP,
        operator: i[d - 1].value,
        left: i[d - 2],
        right: t
      }, d -= 2;
    return t;
  }
  gobbleToken() {
    let t, s, r, i;
    if (this.gobbleSpaces(), i = this.searchHook("gobble-token"), i) return this.runHook("after-token", i);
    if (t = this.code, o.isDecimalDigit(t) || t === o.PERIOD_CODE) return this.gobbleNumericLiteral();
    if (t === o.SQUOTE_CODE || t === o.DQUOTE_CODE) i = this.gobbleStringLiteral();
    else if (t === o.OBRACK_CODE) i = this.gobbleArray();
    else {
      for (s = this.expr.substr(this.index, o.max_unop_len), r = s.length; r > 0; ) {
        if (o.unary_ops.hasOwnProperty(s) && (!o.isIdentifierStart(this.code) || this.index + s.length < this.expr.length && !o.isIdentifierPart(this.expr.charCodeAt(this.index + s.length)))) {
          this.index += r;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: o.UNARY_EXP,
            operator: s,
            argument: n,
            prefix: !0
          });
        }
        s = s.substr(0, --r);
      }
      o.isIdentifierStart(t) ? (i = this.gobbleIdentifier(), o.literals.hasOwnProperty(i.name) ? i = {
        type: o.LITERAL,
        value: o.literals[i.name],
        raw: i.name
      } : i.name === o.this_str && (i = { type: o.THIS_EXP })) : t === o.OPAREN_CODE && (i = this.gobbleGroup());
    }
    return i ? (i = this.gobbleTokenProperty(i), this.runHook("after-token", i)) : this.runHook("after-token", !1);
  }
  gobbleTokenProperty(t) {
    this.gobbleSpaces();
    let s = this.code;
    for (; s === o.PERIOD_CODE || s === o.OBRACK_CODE || s === o.OPAREN_CODE || s === o.QUMARK_CODE; ) {
      let r;
      if (s === o.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== o.PERIOD_CODE) break;
        r = !0, this.index += 2, this.gobbleSpaces(), s = this.code;
      }
      this.index++, s === o.OBRACK_CODE ? (t = {
        type: o.MEMBER_EXP,
        computed: !0,
        object: t,
        property: this.gobbleExpression()
      }, t.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), s = this.code, s !== o.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : s === o.OPAREN_CODE ? t = {
        type: o.CALL_EXP,
        arguments: this.gobbleArguments(o.CPAREN_CODE),
        callee: t
      } : (s === o.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), t = {
        type: o.MEMBER_EXP,
        computed: !1,
        object: t,
        property: this.gobbleIdentifier()
      }), r && (t.optional = !0), this.gobbleSpaces(), s = this.code;
    }
    return t;
  }
  gobbleNumericLiteral() {
    let t = "", s, r;
    for (; o.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
    if (this.code === o.PERIOD_CODE)
      for (t += this.expr.charAt(this.index++); o.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
    if (s = this.char, s === "e" || s === "E") {
      for (t += this.expr.charAt(this.index++), s = this.char, (s === "+" || s === "-") && (t += this.expr.charAt(this.index++)); o.isDecimalDigit(this.code); ) t += this.expr.charAt(this.index++);
      o.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + t + this.char + ")");
    }
    return r = this.code, o.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + t + this.char + ")") : (r === o.PERIOD_CODE || t.length === 1 && t.charCodeAt(0) === o.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: o.LITERAL,
      value: parseFloat(t),
      raw: t
    };
  }
  gobbleStringLiteral() {
    let t = "";
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
    return i || this.throwError('Unclosed quote after "' + t + '"'), {
      type: o.LITERAL,
      value: t,
      raw: this.expr.substring(s, this.index)
    };
  }
  gobbleIdentifier() {
    let t = this.code, s = this.index;
    for (o.isIdentifierStart(t) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (t = this.code, o.isIdentifierPart(t)); )
      this.index++;
    return {
      type: o.IDENTIFIER,
      name: this.expr.slice(s, this.index)
    };
  }
  gobbleArguments(t) {
    const s = [];
    let r = !1, i = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === t) {
        r = !0, this.index++, t === o.CPAREN_CODE && i && i >= s.length && this.throwError("Unexpected token " + String.fromCharCode(t));
        break;
      } else if (n === o.COMMA_CODE) {
        if (this.index++, i++, i !== s.length) {
          if (t === o.CPAREN_CODE) this.throwError("Unexpected token ,");
          else if (t === o.CBRACK_CODE) for (let a = s.length; a < i; a++) s.push(null);
        }
      } else if (s.length !== i && i !== 0) this.throwError("Expected comma");
      else {
        const a = this.gobbleExpression();
        (!a || a.type === o.COMPOUND) && this.throwError("Expected comma"), s.push(a);
      }
    }
    return r || this.throwError("Expected " + String.fromCharCode(t)), s;
  }
  gobbleGroup() {
    this.index++;
    let t = this.gobbleExpressions(o.CPAREN_CODE);
    if (this.code === o.CPAREN_CODE)
      return this.index++, t.length === 1 ? t[0] : t.length ? {
        type: o.SEQUENCE_EXP,
        expressions: t
      } : !1;
    this.throwError("Unclosed (");
  }
  gobbleArray() {
    return this.index++, {
      type: o.ARRAY_EXP,
      elements: this.gobbleArguments(o.CBRACK_CODE)
    };
  }
}, Ge = new Ve();
Object.assign(A, {
  hooks: Ge,
  plugins: new Ye(A),
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
A.max_unop_len = A.getMaxKeyLen(A.unary_ops);
A.max_binop_len = A.getMaxKeyLen(A.binary_ops);
var _ = (e) => new A(e).parse(), Ze = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(A).filter((e) => !Ze.includes(e) && _[e] === void 0).forEach((e) => {
  _[e] = A[e];
});
_.Jsep = A;
var We = "ConditionalExpression";
_.plugins.register({
  name: "ternary",
  init(e) {
    e.hooks.add("after-expression", function(s) {
      if (s.node && this.code === e.QUMARK_CODE) {
        this.index++;
        const r = s.node, i = this.gobbleExpression();
        if (i || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === e.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), s.node = {
            type: We,
            test: r,
            consequent: i,
            alternate: n
          }, r.operator && e.binary_ops[r.operator] <= 0.9) {
            let a = r;
            for (; a.right.operator && e.binary_ops[a.right.operator] <= 0.9; ) a = a.right;
            s.node.test = a.right, a.right = s.node, s.node = r;
          }
        } else this.throwError("Expected :");
      }
    });
  }
});
var ce = 47, et = 92, tt = {
  name: "regex",
  init(e) {
    e.hooks.add("gobble-token", function(s) {
      if (this.code === ce) {
        const r = ++this.index;
        let i = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === ce && !i) {
            const n = this.expr.slice(r, this.index);
            let a = "";
            for (; ++this.index < this.expr.length; ) {
              const d = this.code;
              if (d >= 97 && d <= 122 || d >= 65 && d <= 90 || d >= 48 && d <= 57) a += this.char;
              else break;
            }
            let c;
            try {
              c = new RegExp(n, a);
            } catch (d) {
              this.throwError(d.message);
            }
            return s.node = {
              type: e.LITERAL,
              value: c,
              raw: this.expr.slice(r - 1, this.index)
            }, s.node = this.gobbleTokenProperty(s.node), s.node;
          }
          this.code === e.OBRACK_CODE ? i = !0 : i && this.code === e.CBRACK_CODE && (i = !1), this.index += this.code === et ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, G = 43, R = {
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
  updateOperators: [G, 45],
  assignmentPrecedence: 0.9,
  init(e) {
    const t = [e.IDENTIFIER, e.MEMBER_EXP];
    R.assignmentOperators.forEach((r) => e.addBinaryOp(r, R.assignmentPrecedence, !0)), e.hooks.add("gobble-token", function(i) {
      const n = this.code;
      R.updateOperators.some((a) => a === n && a === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, i.node = {
        type: "UpdateExpression",
        operator: n === G ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!i.node.argument || !t.includes(i.node.argument.type)) && this.throwError(`Unexpected ${i.node.operator}`));
    }), e.hooks.add("after-token", function(i) {
      if (i.node) {
        const n = this.code;
        R.updateOperators.some((a) => a === n && a === this.expr.charCodeAt(this.index + 1)) && (t.includes(i.node.type) || this.throwError(`Unexpected ${i.node.operator}`), this.index += 2, i.node = {
          type: "UpdateExpression",
          operator: n === G ? "++" : "--",
          argument: i.node,
          prefix: !1
        });
      }
    }), e.hooks.add("after-expression", function(i) {
      i.node && s(i.node);
    });
    function s(r) {
      R.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((i) => {
        i && typeof i == "object" && s(i);
      });
    }
  }
};
_.plugins.register(tt, R);
_.addUnaryOp("typeof");
_.addLiteral("null", null);
_.addLiteral("undefined", void 0);
var st = /* @__PURE__ */ new Set([
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
      const i = e.body[r];
      s = E.evalAst(i, t);
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
    if (!Object.hasOwn(r, s) && st.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
    const i = r[s];
    return typeof i == "function" ? i.bind(r) : i;
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
}, rt = class {
  constructor(e) {
    this.code = e, this.ast = _(this.code);
  }
  runInNewContext(e) {
    const t = Object.assign(/* @__PURE__ */ Object.create(null), e);
    return E.evalAst(this.ast, t);
  }
};
function $(e, t) {
  return e = e.slice(), e.push(t), e;
}
function te(e, t) {
  return t = t.slice(), t.unshift(e), t;
}
var it = class extends Error {
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
};
function y(e, t, s, r, i) {
  if (!(this instanceof y)) try {
    return new y(e, t, s, r, i);
  } catch (a) {
    if (!a.avoidNew) throw a;
    return a.value;
  }
  typeof e == "string" && (i = r, r = s, s = t, t = e, e = null);
  const n = e && typeof e == "object";
  if (e = e || {}, this.json = e.json || s, this.path = e.path || t, this.resultType = e.resultType || "value", this.flatten = e.flatten || !1, this.wrap = Object.hasOwn(e, "wrap") ? e.wrap : !0, this.sandbox = e.sandbox || {}, this.eval = e.eval === void 0 ? "safe" : e.eval, this.ignoreEvalErrors = typeof e.ignoreEvalErrors > "u" ? !1 : e.ignoreEvalErrors, this.parent = e.parent || null, this.parentProperty = e.parentProperty || null, this.callback = e.callback || r || null, this.otherTypeCallback = e.otherTypeCallback || i || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, e.autostart !== !1) {
    const a = { path: n ? e.path : t };
    n ? "json" in e && (a.json = e.json) : a.json = s;
    const c = this.evaluate(a);
    if (!c || typeof c != "object") throw new it(c);
    return c;
  }
}
y.prototype.evaluate = function(e, t, s, r) {
  let i = this.parent, n = this.parentProperty, { flatten: a, wrap: c } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, s = s || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, t = t || this.json, e = e || this.path, e && typeof e == "object" && !Array.isArray(e)) {
    if (!e.path && e.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(e, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: t } = e), a = Object.hasOwn(e, "flatten") ? e.flatten : a, this.currResultType = Object.hasOwn(e, "resultType") ? e.resultType : this.currResultType, this.currSandbox = Object.hasOwn(e, "sandbox") ? e.sandbox : this.currSandbox, c = Object.hasOwn(e, "wrap") ? e.wrap : c, this.currEval = Object.hasOwn(e, "eval") ? e.eval : this.currEval, s = Object.hasOwn(e, "callback") ? e.callback : s, this.currOtherTypeCallback = Object.hasOwn(e, "otherTypeCallback") ? e.otherTypeCallback : this.currOtherTypeCallback, i = Object.hasOwn(e, "parent") ? e.parent : i, n = Object.hasOwn(e, "parentProperty") ? e.parentProperty : n, e = e.path;
  }
  if (i = i || null, n = n || null, Array.isArray(e) && (e = y.toPathString(e)), !e && e !== "" || !t) return;
  const d = y.toPathArray(e);
  d[0] === "$" && d.length > 1 && d.shift(), this._hasParentSelector = null;
  const l = this._trace(d, t, ["$"], i, n, s).filter(function(u) {
    return u && !u.isParentSelector;
  });
  return l.length ? !c && l.length === 1 && !l[0].hasArrExpr ? this._getPreferredOutput(l[0]) : l.reduce((u, g) => {
    const p = this._getPreferredOutput(g);
    return a && Array.isArray(p) ? u = u.concat(p) : u.push(p), u;
  }, []) : c ? [] : void 0;
};
y.prototype._getPreferredOutput = function(e) {
  const t = this.currResultType;
  switch (t) {
    case "all": {
      const s = Array.isArray(e.path) ? e.path : y.toPathArray(e.path);
      return e.pointer = y.toPointer(s), e.path = typeof e.path == "string" ? e.path : y.toPathString(e.path), e;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return e[t];
    case "path":
      return y.toPathString(e[t]);
    case "pointer":
      return y.toPointer(e.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
y.prototype._handleCallback = function(e, t, s) {
  if (t) {
    const r = this._getPreferredOutput(e);
    e.path = typeof e.path == "string" ? e.path : y.toPathString(e.path), t(r, s, e);
  }
};
y.prototype._trace = function(e, t, s, r, i, n, a, c) {
  let d;
  if (!e.length)
    return d = {
      path: s,
      value: t,
      parent: r,
      parentProperty: i,
      hasArrExpr: a
    }, this._handleCallback(d, n, "value"), d;
  const l = e[0], u = e.slice(1), g = [];
  function p(f) {
    Array.isArray(f) ? f.forEach((b) => {
      g.push(b);
    }) : g.push(f);
  }
  if ((typeof l != "string" || c) && t && Object.hasOwn(t, l)) p(this._trace(u, t[l], $(s, l), t, l, n, a));
  else if (l === "*") this._walk(t, (f) => {
    p(this._trace(u, t[f], $(s, f), t, f, n, !0, !0));
  });
  else if (l === "..")
    p(this._trace(u, t, s, r, i, n, a)), this._walk(t, (f) => {
      typeof t[f] == "object" && p(this._trace(e.slice(), t[f], $(s, f), t, f, n, !0));
    });
  else {
    if (l === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: u,
        isParentSelector: !0
      };
    if (l === "~")
      return d = {
        path: $(s, l),
        value: i,
        parent: r,
        parentProperty: null
      }, this._handleCallback(d, n, "property"), d;
    if (l === "$") p(this._trace(u, t, s, null, null, n, a));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(l)) p(this._slice(l, u, t, s, r, i, n));
    else if (l.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const f = l.replace(/^\?\((.*?)\)$/u, "$1"), b = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(f);
      b ? this._walk(t, (v) => {
        const S = [b[2]], x = b[1] ? t[v][b[1]] : t[v];
        this._trace(S, x, s, r, i, n, !0).length > 0 && p(this._trace(u, t[v], $(s, v), t, v, n, !0));
      }) : this._walk(t, (v) => {
        this._eval(f, t[v], v, s, r, i) && p(this._trace(u, t[v], $(s, v), t, v, n, !0));
      });
    } else if (l[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      p(this._trace(te(this._eval(l, t, s.at(-1), s.slice(0, -1), r, i), u), t, s, r, i, n, a));
    } else if (l[0] === "@") {
      let f = !1;
      const b = l.slice(1, -2);
      switch (b) {
        case "scalar":
          (!t || !["object", "function"].includes(typeof t)) && (f = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof t === b && (f = !0);
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
          t && typeof t === b && (f = !0);
          break;
        case "array":
          Array.isArray(t) && (f = !0);
          break;
        case "other":
          f = this.currOtherTypeCallback(t, s, r, i);
          break;
        case "null":
          t === null && (f = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + b);
      }
      if (f)
        return d = {
          path: s,
          value: t,
          parent: r,
          parentProperty: i
        }, this._handleCallback(d, n, "value"), d;
    } else if (l[0] === "`" && t && Object.hasOwn(t, l.slice(1))) {
      const f = l.slice(1);
      p(this._trace(u, t[f], $(s, f), t, f, n, a, !0));
    } else if (l.includes(",")) {
      const f = l.split(",");
      for (const b of f) p(this._trace(te(b, u), t, s, r, i, n, !0));
    } else !c && t && Object.hasOwn(t, l) && p(this._trace(u, t[l], $(s, l), t, l, n, a, !0));
  }
  if (this._hasParentSelector) for (let f = 0; f < g.length; f++) {
    const b = g[f];
    if (b && b.isParentSelector) {
      const v = this._trace(b.expr, t, b.path, r, i, n, a);
      if (Array.isArray(v)) {
        g[f] = v[0];
        const S = v.length;
        for (let x = 1; x < S; x++)
          f++, g.splice(f, 0, v[x]);
      } else g[f] = v;
    }
  }
  return g;
};
y.prototype._walk = function(e, t) {
  if (Array.isArray(e)) {
    const s = e.length;
    for (let r = 0; r < s; r++) t(r);
  } else e && typeof e == "object" && Object.keys(e).forEach((s) => {
    t(s);
  });
};
y.prototype._slice = function(e, t, s, r, i, n, a) {
  if (!Array.isArray(s)) return;
  const c = s.length, d = e.split(":"), l = d[2] && Number.parseInt(d[2]) || 1;
  let u = d[0] && Number.parseInt(d[0]) || 0, g = d[1] && Number.parseInt(d[1]) || c;
  u = u < 0 ? Math.max(0, u + c) : Math.min(c, u), g = g < 0 ? Math.max(0, g + c) : Math.min(c, g);
  const p = [];
  for (let f = u; f < g; f += l) this._trace(te(f, t), s, r, i, n, a, !0).forEach((b) => {
    p.push(b);
  });
  return p;
};
y.prototype._eval = function(e, t, s, r, i, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = i, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
  const a = e.includes("@path");
  a && (this.currSandbox._$_path = y.toPathString(r.concat([s])));
  const c = this.currEval + "Script:" + e;
  if (!y.cache[c]) {
    let d = e.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (a && (d = d.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) y.cache[c] = new this.safeVm.Script(d);
    else if (this.currEval === "native") y.cache[c] = new this.vm.Script(d);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const l = this.currEval;
      y.cache[c] = new l(d);
    } else if (typeof this.currEval == "function") y.cache[c] = { runInNewContext: (l) => this.currEval(d, l) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return y.cache[c].runInNewContext(this.currSandbox);
  } catch (d) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + d.message + ": " + e);
  }
};
y.cache = {};
y.toPathString = function(e) {
  const t = e, s = t.length;
  let r = "$";
  for (let i = 1; i < s; i++) /^(~|\^|@.*?\(\))$/u.test(t[i]) || (r += /^[0-9*]+$/u.test(t[i]) ? "[" + t[i] + "]" : "['" + t[i] + "']");
  return r;
};
y.toPointer = function(e) {
  const t = e, s = t.length;
  let r = "";
  for (let i = 1; i < s; i++) /^(~|\^|@.*?\(\))$/u.test(t[i]) || (r += "/" + t[i].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
y.toPathArray = function(e) {
  const { cache: t } = y;
  if (t[e]) return t[e].concat();
  const s = [];
  return t[e] = e.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(r, i) {
    return "[#" + (s.push(i) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(r, i) {
    return "['" + i.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(r, i) {
    return ";" + i.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(r) {
    const i = r.match(/#(\d+)/u);
    return !i || !i[1] ? r : s[i[1]];
  }), t[e].concat();
};
y.prototype.safeVm = { Script: rt };
var nt = function(e, t, s) {
  const r = e.length;
  for (let i = 0; i < r; i++) {
    const n = e[i];
    s(n) && t.push(e.splice(i--, 1)[0]);
  }
}, at = class {
  constructor(e) {
    this.code = e;
  }
  runInNewContext(e) {
    let t = this.code;
    const s = Object.keys(e), r = [];
    nt(s, r, (c) => typeof e[c] == "function");
    const i = s.map((c) => e[c]);
    t = r.reduce((c, d) => {
      let l = e[d].toString();
      return /function/u.test(l) || (l = "function " + l), "var " + d + "=" + l + ";" + c;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const n = t.lastIndexOf(";"), a = n !== -1 ? t.slice(0, n + 1) + " return " + t.slice(n + 1) : " return " + t;
    return new Function(...s, a)(...i);
  }
};
y.prototype.vm = { Script: at };
function ot(e) {
  return e ? !!(e.startsWith("$") || /\[\d+\]/.test(e) || /\[['"]/.test(e) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(e) || e.includes("..") || e.includes("*")) : !1;
}
function lt(e) {
  return e ? e.startsWith("$") ? e : `$.${e}` : "$";
}
function ct(e, t) {
  if (!e || !t) return [];
  try {
    return (y({
      path: lt(t),
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
function dt(e, t) {
  if (!t || !e) return e || {};
  const s = ot(t);
  if (console.log("[jsonpath-search] search:", t, "isJsonPath:", s), s) {
    const i = ut(e, t);
    return console.log("[jsonpath-search] JSONPath result:", i), i;
  }
  const r = ht(e, t);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function ht(e, t) {
  const s = t.toLowerCase(), r = {};
  for (const [i, n] of Object.entries(e || {})) i.toLowerCase().includes(s) && (r[i] = n);
  return r;
}
function ut(e, t) {
  const s = ct(e, t);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: i, value: n } = s[0];
    return i === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [de(i)]: n };
  }
  const r = {};
  for (const { path: i, value: n } of s) {
    const a = de(i) || `result_${Object.keys(r).length}`;
    a in r ? r[`${a}_${Object.keys(r).length}`] = n : r[a] = n;
  }
  return r;
}
function de(e) {
  if (!e) return "";
  const t = e.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (t) return t[1];
  const s = e.match(/\.([^.[\]]+)$/);
  return s ? s[1] : e.replace(/^\$\.?/, "");
}
var X = "commands", Q = "", J = "", ie = /* @__PURE__ */ new Map();
function m(e) {
  return typeof e == "string" ? e.trim() : "";
}
function w(e) {
  return m(e).toLowerCase();
}
function se(e) {
  return e === "boolean" || e === "checkbox";
}
function ft(e) {
  return !e || typeof e != "object" ? "" : h(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function Z(e) {
  return e == null ? "" : typeof e == "string" || typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function B(e, t) {
  return !!(e && Object.prototype.hasOwnProperty.call(e, t));
}
function ne(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function pt(e) {
  return typeof e == "boolean" ? e : typeof e == "string" ? e.trim().toLowerCase() === "true" : !1;
}
function Ee(e) {
  const t = w(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function mt(e, t) {
  const s = t && typeof t == "object" ? t : {}, r = Array.isArray(s.commands) ? s.commands : [], i = Array.isArray(s.diagnostics) ? s.diagnostics : [], n = Array.isArray(e.ui?.actions) ? e.ui.actions : [], a = gt(e), c = /* @__PURE__ */ new Map();
  r.forEach((p) => {
    const f = m(p?.id);
    f && c.set(f, p);
  });
  const d = /* @__PURE__ */ new Map();
  n.forEach((p) => {
    const f = w(p?.id), b = m(p.payload?.command_id);
    f && b && !d.has(b) && d.set(b, p);
  });
  const l = [], u = /* @__PURE__ */ new Set(), g = (p) => {
    p && !u.has(p) && (u.add(p), l.push(p));
  };
  return r.forEach((p) => g(m(p?.id))), n.forEach((p) => g(m(p.payload?.command_id))), {
    entries: l.map((p) => {
      const f = c.get(p), b = d.get(p), v = b ? w(b.id) : "", S = !!(b && v), x = S ? bt(b, a.get(p) || /* @__PURE__ */ new Map()) : void 0, O = m(b?.label) || m(f?.label) || p, D = m(f?.group) || "Other", k = `${p} ${O} ${D} ${(Array.isArray(f?.tags) ? f.tags.map(m).filter(Boolean) : []).join(" ")}${S ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: S ? v : `cmd:${p}`,
        actionId: v,
        commandId: p,
        label: O,
        action: x,
        descriptor: f,
        group: D,
        search: k,
        executable: S
      };
    }),
    diagnostics: i
  };
}
function gt(e) {
  const t = e.ui?.metadata && typeof e.ui.metadata == "object" ? e.ui.metadata : {}, s = t.serialized_schemas && typeof t.serialized_schemas == "object" ? t.serialized_schemas : {}, r = /* @__PURE__ */ new Map();
  return Object.entries(s).forEach(([i, n]) => {
    const a = n && typeof n == "object" ? n : {}, c = Array.isArray(a.fields) ? a.fields : [], d = /* @__PURE__ */ new Map();
    c.forEach((l) => {
      [
        m(l.id),
        m(l.name),
        m(l.path),
        m(l.payload_path).replace(/^payload\./, "")
      ].filter(Boolean).forEach((u) => d.set(u, l));
    }), r.set(i, d);
  }), r;
}
function bt(e, t) {
  const s = Array.isArray(e.fields) ? e.fields : [];
  return s.length === 0 || t.size === 0 ? e : {
    ...e,
    fields: s.map((r) => {
      const i = [
        m(r.id),
        m(r.name),
        m(r.path),
        m(r.payload_path).replace(/^payload\./, "")
      ].filter(Boolean).map((a) => t.get(a)).find(Boolean);
      if (!i) return r;
      const n = { ...r };
      return !B(n, "default") && B(i, "default") && (n.default = i.default), !B(n, "display_hints") && B(i, "display_hints") && (n.display_hints = i.display_hints), m(n.description) || (n.description = m(i.description) || m(i.help)), m(n.help) || (n.help = m(i.help)), n;
    })
  };
}
function yt(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => {
    t.has(s.group) || t.set(s.group, []), t.get(s.group).push(s);
  }), Array.from(t.entries()).sort((s, r) => s[0].localeCompare(r[0])).map(([s, r]) => ({
    group: s,
    items: r.sort((i, n) => (i.commandId || i.label).localeCompare(n.commandId || n.label))
  }));
}
function Et(e) {
  const t = m(e.descriptor?.execution_mode), s = Ee(t), r = t ? `Execution: ${t}` : "Execution mode unknown", i = e.descriptor?.mutating === !0;
  let n;
  return e.executable ? i ? n = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : n = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : n = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}" role="option" aria-selected="false"
      data-cmdl-item="${h(e.key)}"
      data-cmdl-search="${h(e.search)}"
      title="${h(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${s}" title="${h(r)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${h(e.commandId || e.label)}</span>
      ${n}
    </button>`;
}
function vt(e, t) {
  const s = e.map((r) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${h(r.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${h(r.group)}</div>
        ${r.items.map(Et).join("")}
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
function St(e, t, s) {
  const r = m(e.name);
  if (!r) return "";
  const i = w(e.kind) || "text", n = m(e.label) || r, a = m(e.payload_path) || r, c = `cmdl-${t}-${r}-${s}`, d = e.required === !0, l = d ? '<span class="cmdl-field__req" title="Required">*</span>' : "", u = m(e.placeholder), g = u ? ` placeholder="${h(u)}"` : "", p = m(e.description) || m(e.help), f = ne(e.display_hints?.units), b = [p ? `<span>${h(p)}</span>` : "", f ? `<span class="cmdl-field__units">Units: ${h(f)}</span>` : ""].filter(Boolean), v = b.length ? `<small class="cmdl-field__help">${b.join(" ")}</small>` : "", S = Array.isArray(e.options) ? e.options.map(m).filter(Boolean) : [], x = d ? " required" : "", O = `id="${h(c)}" data-action-field="${h(r)}" data-action-field-kind="${h(i)}" data-action-field-path="${h(a)}"${x}`, D = `<small class="cmdl-field__error" data-action-field-error="${h(a)}" data-action-field-name="${h(r)}" data-action-id="${h(t)}" hidden></small>`;
  if (se(i)) return `
      <div class="cmdl-field cmdl-field--full cmdl-field--bool">
        <label class="cmdl-toggle">
          <input type="checkbox" ${O}${e.default === !0 ? " checked" : ""}>
          <span class="cmdl-toggle__track" aria-hidden="true"></span>
          <span class="cmdl-toggle__text">${h(n)}${l}</span>
        </label>
        ${v}${D}
      </div>`;
  let k = "";
  if (S.length > 0 || i === "select") {
    const C = Z(e.default);
    k = `<select ${O}><option value=""></option>${S.map((j) => `<option value="${h(j)}"${j === C ? " selected" : ""}>${h(j)}</option>`).join("")}</select>`;
  } else if (i === "number" || i === "integer") {
    const C = Z(e.default);
    k = `<input type="number" ${O}${g}${C ? ` value="${h(C)}"` : ""}>`;
  } else if (i === "string_list" || i === "array") {
    const C = Array.isArray(e.default) ? e.default.map(m).filter(Boolean) : [], j = u || "Add a value, press Enter";
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--list">
        <label class="cmdl-field__label" for="${h(c)}">${h(n)}${l}</label>
        <div class="cmdl-chips" data-cmdl-chips${d ? ' data-cmdl-chips-required="true"' : ""}>
          <span class="cmdl-chips__tags" data-cmdl-chips-tags></span>
          <input type="text" id="${h(c)}" class="cmdl-chips__entry" data-cmdl-chips-entry
            placeholder="${h(j)}" autocomplete="off" spellcheck="false">
          <input type="hidden" data-action-field="${h(r)}" data-action-field-kind="string_list"
            data-action-field-path="${h(a)}"
            data-cmdl-chips-value value="${h(C.join(`
`))}">
        </div>
        ${v}${D}
      </div>`;
  } else if (i === "json" || i === "object" || i === "textarea") k = `<textarea ${O}${g} rows="3">${h(e.default !== void 0 && e.default !== null ? JSON.stringify(e.default, null, 2) : "")}</textarea>`;
  else {
    const C = Z(e.default);
    k = `<input type="text" ${O}${g}${C ? ` value="${h(C)}"` : ""}>`;
  }
  return `
    <div class="cmdl-field">
      <label class="cmdl-field__label" for="${h(c)}">${h(n)}${l}</label>
      ${k}
      ${v}${D}
    </div>`;
}
function Pt(e) {
  return At(e) ? wt(e) : xt(e);
}
function At(e) {
  return e.some((t) => {
    const s = t.display_hints || {};
    return ne(s.section) !== "" || B(s, "advanced");
  });
}
function wt(e) {
  const t = [], s = /* @__PURE__ */ new Map(), r = [];
  return e.forEach((i) => {
    const n = i.display_hints || {};
    if (pt(n.advanced)) {
      r.push(i);
      return;
    }
    const a = ne(n.section) || "Parameters";
    let c = s.get(a);
    c || (c = {
      title: a,
      fields: [],
      collapsible: !1
    }, s.set(a, c), t.push(c)), c.fields.push(i);
  }), r.length && t.push({
    title: "Advanced",
    fields: r,
    collapsible: !0
  }), t;
}
function xt(e) {
  const t = e.filter((l) => se(w(l.kind))), s = e.filter((l) => !se(w(l.kind))), r = s.filter((l) => l.required === !0), i = s.filter((l) => l.required !== !0), n = [...r, ...i];
  let a = n, c = [];
  if (n.length > 6) {
    const l = Math.max(r.length, 4);
    a = n.slice(0, l), c = n.slice(l);
  }
  const d = [];
  return a.length && d.push({
    title: "Parameters",
    fields: a,
    collapsible: !1
  }), t.length && d.push({
    title: "Options",
    fields: t,
    collapsible: !1
  }), c.length && d.push({
    title: "Advanced",
    fields: c,
    collapsible: !0
  }), d;
}
function Ct(e, t, s) {
  return `
    <fieldset class="cmdl-section${e.collapsible ? " cmdl-section--collapsed" : ""}">
      ${e.collapsible ? `<legend class="cmdl-section__head cmdl-section__head--toggle" data-cmdl-section-toggle role="button" tabindex="0" aria-expanded="false">
        <span class="cmdl-section__caret" aria-hidden="true"></span>
        <span>${h(e.title)}</span>
        <span class="cmdl-section__count">${e.fields.length}</span>
      </legend>` : `<legend class="cmdl-section__head">${h(e.title)}</legend>`}
      <div class="cmdl-section__grid">${e.fields.map((r, i) => St(r, t, s + i)).join("")}</div>
    </fieldset>`;
}
function _t(e) {
  const t = e.action;
  if (!t) return "";
  const s = Array.isArray(t.fields) ? t.fields : [], r = m(t.submit_label) || "Run command", i = m(t.confirm_text), n = t.requires_confirm === !0, a = e.descriptor?.mutating === !0;
  let c = "";
  if (s.length === 0) c = '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>';
  else {
    const l = Pt(s);
    let u = 0;
    c = l.map((g) => {
      const p = Ct(g, e.actionId, u);
      return u += g.fields.length, p;
    }).join("");
  }
  const d = a ? '<span class="cmdl-form__note">Confirms before running</span>' : "";
  return `
    <form class="cmdl-form" data-panel-action-form
      data-panel-id="${h(X)}"
      data-action-id="${h(e.actionId)}"
      data-action-confirm="${h(i)}"
      data-action-requires-confirm="${n ? "true" : "false"}"
      data-action-payload='${ft(t.payload)}'>
      ${c}
      <div class="cmdl-form__bar">
        <button type="submit" class="cmdl-btn cmdl-btn--run">${h(r)}</button>
        <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
        ${d}
      </div>
    </form>`;
}
function Ot(e) {
  const t = m(e.descriptor?.execution_mode), s = e.descriptor?.mutating === !0, r = m(e.descriptor?.summary), i = [];
  i.push(`<span class="cmdl-chip">${h(e.group)}</span>`), t && i.push(`<span class="cmdl-chip cmdl-chip--${Ee(t)}">${h(t)}</span>`), i.push(s ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || i.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let n;
  return e.executable ? n = `${s ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${_t(e)}` : n = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${h(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${h(e.commandId || e.label)}</div>
        ${r ? `<div class="cmdl-cmd__summary">${h(r)}</div>` : ""}
        <div class="cmdl-cmd__chips">${i.join("")}</div>
      </div>
      ${n}
    </div>`;
}
function he(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const s = w(t.severity) || "info", r = m(t.message), i = m(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${h(s)}">
          <span class="cmdl-diag__sev">${h(s)}</span>
          <span class="cmdl-diag__msg">${h(r)}${i ? ` <span class="cmdl-diag__code">${h(i)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function $t(e) {
  const { def: t, data: s } = e, { entries: r, diagnostics: i } = mt(t, s);
  if (r.length === 0) return `
      <div class="cmdl" data-cmdl-root>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${he(i)}
        <div class="cmdl-result" data-panel-action-result="${h(X)}"></div>
      </div>`;
  const n = yt(r), a = r.map(Ot).join("");
  return `
    <div class="cmdl" data-cmdl-root>
      <div class="cmdl__body">
        ${vt(n, r.length)}
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${a}
        </section>
      </div>
      ${he(i)}
      <div class="cmdl-result" data-panel-action-result="${h(X)}"></div>
    </div>`;
}
function K(e, t) {
  for (const s of t) {
    const r = e[s];
    if (typeof r == "string" && r.trim() !== "") return r.trim();
  }
  return "";
}
function kt(e, t, s, r) {
  const i = s && typeof s == "object" ? s : {}, n = i.receipt && typeof i.receipt == "object" ? i.receipt : {}, a = (Array.isArray(i.validation_errors) ? i.validation_errors : []).map((p) => ({
    path: m(p.path),
    message: m(p.message),
    code: m(p.code)
  })).filter((p) => p.message || p.path), c = n.Accepted ?? n.accepted, d = typeof c == "boolean" ? c : void 0;
  let l = "ok";
  e === "error" ? l = "error" : (a.length > 0 || d === !1) && (l = "invalid");
  let u = "";
  a.length > 0 ? u = "VALIDATION_ERROR" : l === "error" && (u = K(r || {}, ["code", "text_code"]));
  const g = s != null && (typeof s != "object" || Object.keys(i).length > 0);
  return {
    kind: l,
    message: m(t) || (l === "error" ? "Command failed" : "Command dispatched"),
    code: u,
    correlationId: K(n, ["CorrelationID", "correlation_id"]),
    mode: K(n, ["Mode", "mode"]),
    dispatchId: K(n, ["DispatchID", "dispatch_id"]),
    statusReference: m(i.status_reference) || m(i.statusReference),
    accepted: d,
    validationErrors: a,
    hasRaw: g,
    rawJSON: g ? Lt(s) : ""
  };
}
function Lt(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function Dt(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function Tt(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function I(e, t, s) {
  return s ? `<span class="cmdl-meta" title="${h(t)}"><span class="cmdl-meta__k">${h(e)}</span>${h(s)}</span>` : "";
}
function It(e, t = {}) {
  const s = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", r = e.code ? `<span class="cmdl-result__code">${h(e.code)}</span>` : "", i = [
    I("id", "Correlation ID", e.correlationId),
    I("mode", "Execution mode", e.mode),
    I("dispatch", "Dispatch ID", e.dispatchId),
    I("status", "Status reference", e.statusReference),
    I("took", "Round-trip duration", typeof t.durationMs == "number" ? Dt(t.durationMs) : ""),
    I("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? Tt(t.at) : "")
  ].filter(Boolean).join(""), n = i ? `<div class="cmdl-result__meta">${i}</div>` : "", a = e.validationErrors.length ? `<ul class="cmdl-result__validation">${e.validationErrors.map((l) => `<li><span class="cmdl-result__path">${h(l.path || "payload")}</span><span class="cmdl-result__vmsg">${h(l.message || l.code)}</span></li>`).join("")}</ul>` : "", c = e.hasRaw ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${h(e.rawJSON)}</pre></details>` : "", d = t.canRetry ? '<div class="cmdl-result__actions"><button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button></div>' : "";
  return `
    <div class="cmdl-result__card cmdl-result__card--${e.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${h(s)}</span>
        ${r}
      </div>
      <div class="cmdl-result__msg">${h(e.message)}</div>
      ${n}
      ${a}
      ${d}
      ${c}
    </div>`;
}
function z(e, t) {
  Q = t;
  const s = e.querySelector("[data-cmdl-empty]");
  s && (s.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((r) => {
    r.hidden = r.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((r) => {
    const i = r.dataset.cmdlItem === t;
    r.classList.toggle("cmdl-item--active", i), r.setAttribute("aria-selected", i ? "true" : "false");
  });
}
function ue(e, t) {
  const s = t.trim().toLowerCase();
  let r = !1;
  e.querySelectorAll("[data-cmdl-item]").forEach((n) => {
    const a = n.dataset.cmdlSearch || "", c = s === "" || a.includes(s);
    n.hidden = !c, c && (r = !0);
  }), e.querySelectorAll("[data-cmdl-group]").forEach((n) => {
    n.hidden = !Array.from(n.querySelectorAll("[data-cmdl-item]")).some((a) => !a.hidden);
  });
  const i = e.querySelector("[data-cmdl-noresults]");
  i && (i.hidden = r);
}
function fe(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => !t.hidden);
}
function U(e) {
  const t = e.querySelector("[data-cmdl-chips-value]");
  return !t || !t.value.trim() ? [] : t.value.split(`
`).map((s) => s.trim()).filter(Boolean);
}
function q(e, t) {
  const s = e.querySelector("[data-cmdl-chips-tags]"), r = e.querySelector("[data-cmdl-chips-value]");
  r && (r.value = t.join(`
`)), s && (s.innerHTML = t.map((n, a) => `<span class="cmdl-chip-tag">${h(n)}<button type="button" class="cmdl-chip-tag__x" data-cmdl-chip-remove="${a}" aria-label="Remove ${h(n)}">×</button></span>`).join(""));
  const i = e.querySelector("[data-cmdl-chips-entry]");
  i && (i.required = e.dataset.cmdlChipsRequired === "true" && t.length === 0);
}
function Rt(e) {
  return e instanceof HTMLInputElement && e.type === "checkbox" ? e.checked ? "true" : "false" : e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement ? e.value : "";
}
function qt(e, t) {
  if (e instanceof HTMLInputElement && e.type === "checkbox") {
    e.checked = t === "true";
    return;
  }
  if (e instanceof HTMLInputElement && e.dataset.cmdlChipsValue !== void 0) {
    const s = e.closest("[data-cmdl-chips]");
    s ? q(s, t ? t.split(`
`).map((r) => r.trim()).filter(Boolean) : []) : e.value = t;
    return;
  }
  (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (e.value = t);
}
function ve(e) {
  const t = w(e.dataset.actionId || "");
  if (!t) return;
  const s = {};
  e.querySelectorAll("[data-action-field]").forEach((r) => {
    const i = m(r.dataset.actionField);
    i && (s[i] = Rt(r));
  }), ie.set(t, s);
}
function F(e) {
  const t = e.closest("[data-panel-action-form]");
  t && ve(t);
}
function jt(e) {
  const t = w(e.dataset.actionId || ""), s = t ? ie.get(t) : void 0;
  s && e.querySelectorAll("[data-action-field]").forEach((r) => {
    const i = m(r.dataset.actionField);
    i && Object.prototype.hasOwnProperty.call(s, i) && qt(r, s[i]);
  });
}
function Mt(e) {
  e.querySelectorAll("[data-cmdl-chips]").forEach((t) => {
    const s = t.querySelector("[data-cmdl-chips-entry]");
    s && s.value.trim() && (re(t, s.value), s.value = "");
  });
}
function re(e, t) {
  const s = t.split(/[\n,]/g).map((i) => i.trim()).filter(Boolean);
  if (s.length === 0) return;
  const r = U(e);
  s.forEach((i) => {
    r.includes(i) || r.push(i);
  }), q(e, r);
}
function Nt(e) {
  e.querySelectorAll("[data-cmdl-chips]").forEach((t) => {
    q(t, U(t));
  });
}
function Ft(e) {
  const t = e.querySelector("[data-cmdl-root]");
  if (!t) return;
  Nt(t), t.querySelectorAll("[data-panel-action-form]").forEach((i) => jt(i));
  const s = t.querySelector("[data-cmdl-filter]");
  s && J && (s.value = J, ue(t, J)), Q && t.querySelector(`[data-cmdl-item="${Bt(Q)}"]`) && z(t, Q), t.addEventListener("click", (i) => {
    const n = i.target, a = n.closest("[data-cmdl-item]");
    if (a) {
      z(t, a.dataset.cmdlItem || "");
      return;
    }
    const c = n.closest("[data-cmdl-section-toggle]");
    if (c) {
      const l = c.closest(".cmdl-section");
      if (l) {
        const u = l.classList.toggle("cmdl-section--collapsed");
        c.setAttribute("aria-expanded", u ? "false" : "true");
      }
      return;
    }
    const d = n.closest("[data-cmdl-chip-remove]");
    if (d) {
      const l = d.closest("[data-cmdl-chips]");
      if (l) {
        const u = U(l), g = Number(d.dataset.cmdlChipRemove);
        Number.isInteger(g) && (u.splice(g, 1), q(l, u), F(l));
      }
    }
  }), s && (s.addEventListener("input", () => {
    J = s.value, ue(t, s.value);
  }), s.addEventListener("keydown", (i) => {
    if (i.key === "ArrowDown" || i.key === "Enter") {
      const n = fe(t)[0];
      n && (i.preventDefault(), i.key === "Enter" ? z(t, n.dataset.cmdlItem || "") : n.focus());
    }
  }));
  const r = (i) => {
    const n = i.target?.closest("[data-action-field]");
    n && F(n);
  };
  t.addEventListener("input", r), t.addEventListener("change", r), t.addEventListener("submit", (i) => {
    const n = i.target?.closest("[data-panel-action-form]");
    n && (Mt(n), ve(n));
  }, !0), t.addEventListener("keydown", (i) => {
    const n = i.target, a = n.closest("[data-cmdl-section-toggle]");
    if (a && (i.key === "Enter" || i.key === " ")) {
      i.preventDefault(), a.dispatchEvent(new MouseEvent("click", { bubbles: !0 }));
      return;
    }
    const c = n.closest("[data-cmdl-chips-entry]");
    if (c) {
      if (i.key === "Enter" || i.key === ",") {
        i.preventDefault();
        const l = c.closest("[data-cmdl-chips]");
        l && (re(l, c.value), c.value = "", F(l));
      } else if (i.key === "Backspace" && c.value === "") {
        const l = c.closest("[data-cmdl-chips]");
        if (l) {
          const u = U(l);
          u.pop(), q(l, u), F(l);
        }
      }
      return;
    }
    const d = n.closest("[data-cmdl-item]");
    if (d && (i.key === "ArrowDown" || i.key === "ArrowUp")) {
      i.preventDefault();
      const l = fe(t), u = l.indexOf(d), g = l[i.key === "ArrowDown" ? u + 1 : u - 1];
      g ? g.focus() : i.key === "ArrowUp" && s && s.focus();
      return;
    }
    d && i.key === "Enter" && (i.preventDefault(), z(t, d.dataset.cmdlItem || ""));
  }), t.addEventListener("paste", (i) => {
    const n = i.target.closest("[data-cmdl-chips-entry]");
    if (!n) return;
    const a = i.clipboardData?.getData("text") || "";
    if (/[\n,]/.test(a)) {
      i.preventDefault();
      const c = n.closest("[data-cmdl-chips]");
      c && (re(c, a), n.value = "", F(c));
    }
  }), t.addEventListener("reset", (i) => {
    const n = i.target, a = w(n.dataset.actionId || "");
    a && ie.delete(a), window.setTimeout(() => {
      n.querySelectorAll("[data-cmdl-chips]").forEach((c) => {
        q(c, U(c));
      });
    }, 0);
  });
}
function Bt(e) {
  return e.replace(/["\\]/g, "\\$&");
}
Je(X, $t);
var pe = "debug-console-active-panel", me = "debug-console-panel-order", Ut = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, ge = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, Ht = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : Ke(), W = (e, t) => dt(e, t), Jt = (e, t, s) => {
  if (!e || !t) return;
  const r = t.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0) return;
  let i = e;
  for (let n = 0; n < r.length - 1; n += 1) {
    const a = r[n];
    (!i[a] || typeof i[a] != "object") && (i[a] = {}), i = i[a];
  }
  i[r[r.length - 1]] = s;
}, ee = (e, t) => {
  if (!e) return t;
  const s = Number(e);
  return Number.isNaN(s) ? t : s;
}, be = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, Kt = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.container = e;
    const t = Ht(ge(e.dataset.panels));
    t.includes("sessions") || t.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(t), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = ee(e.dataset.maxLogEntries, 500), this.maxSQLQueries = ee(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = ee(e.dataset.slowThresholdMs, 50), this.replCommands = Ue(ge(e.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), Me.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = Y(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.bindActions(), this.updateSessionBanner(), this.stream = new ae({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = L.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.applyPanelOrder(), await ze(this.debugPath), this.eventToPanel = Y(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const s of Fe(t)) e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null;
    try {
      e = this.normalizeStoredPanelID(sessionStorage.getItem(pe));
    } catch {
      e = null;
    }
    this.activePanel = e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(pe, this.activePanel);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(me, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const e = this.panelOrderPreferencesPath.trim();
    if (!e) return !1;
    try {
      const t = await T(e, {
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
        await T(t, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: e }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const e = localStorage.getItem(me);
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
    return !t || !Ut.test(t) ? null : t;
  }
  normalizeAvailablePanelIDs(e) {
    if (!Array.isArray(e)) return [];
    const t = [], s = /* @__PURE__ */ new Set();
    for (const r of e) {
      const i = this.normalizePanelID(r);
      !i || s.has(i) || (s.add(i), t.push(i));
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
    const r = new Set(s), i = [];
    for (const n of t) r.has(n) && (i.push(n), r.delete(n));
    for (const n of s) r.has(n) && i.push(n);
    return i;
  }
  applyPanelOrder() {
    const e = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = e.length > 0 ? e : this.availablePanels, this.restoreActivePanel();
  }
  initTabDragDrop() {
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = Pe.create(this.tabsEl, {
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
    this.eventToPanel = Y(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((n) => n !== t), delete this.customFilterState[t]), this.applyPanelOrder();
    const i = s !== this.activePanel;
    this.subscribeToEvents(), this.renderTabs(), (r || i || t === this.activePanel) && this.renderActivePanel();
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
      const r = s.dataset.doctorActionRun || "", i = s.dataset.doctorActionConfirm || "", n = s.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(r, i, n);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const s = t === this.activePanel ? "debug-tab--active" : "", r = Re(Be(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${h(t)}">
            ${r}
            <span class="debug-tab__label">${h(le(t))}</span>
            <span class="debug-tab__count" data-panel-count="${h(t)}">0</span>
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
        const i = this.getPanelFilterState(e, r), n = r.renderFilters(i);
        this.filtersEl.innerHTML = n || '<span class="timestamp">No filters</span>', n && this.bindFilterInputs();
        return;
      }
    }
    if (!s?.filters && e === "requests") {
      const r = this.filters.requests, i = this.getUniqueContentTypes();
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
            ${this.renderSelectOptions(["all", ...i], r.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${h(r.search)}" placeholder="/admin/users" />
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
          <input type="search" data-filter="search" value="${h(r.search)}" placeholder="SELECT" />
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
          <input type="search" data-filter="search" value="${h(r.search)}" placeholder="database" />
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
          <input type="search" data-filter="search" value="${h(r.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && e === "sessions") {
      const r = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${h(r.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const r = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${h(r.search)}" placeholder="user.roles[0].name" />
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
      const r = this.getPanelFilterState(e, s), i = r && typeof r == "object" && !Array.isArray(r) ? { ...r } : {};
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        if (!a) return;
        const c = i[a];
        i[a] = this.readFilterInputValue(n, c);
      }), this.customFilterState[e] = i, this.renderPanel();
      return;
    }
    if (e === "requests") {
      const r = { ...this.filters.requests };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "newestFirst" || n === "hasBody" ? r[n] = i.checked : n && n in r && (r[n] = i.value);
      }), this.filters.requests = r;
    } else if (e === "sql") {
      const r = { ...this.filters.sql };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" || n === "newestFirst" ? r[n] = i.checked : n === "search" && (r[n] = i.value);
      }), this.filters.sql = r;
    } else if (e === "logs") {
      const r = { ...this.filters.logs };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "autoScroll" || n === "newestFirst" ? r[n] = i.checked : (n === "level" || n === "search") && (r[n] = i.value);
      }), this.filters.logs = r;
    } else if (e === "routes") {
      const r = { ...this.filters.routes };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in r && (r[n] = i.value);
      }), this.filters.routes = r;
    } else if (e === "sessions") {
      const r = { ...this.filters.sessions };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in r && (r[n] = i.value);
      }), this.filters.sessions = r;
    } else {
      const r = { ...this.filters.objects };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in r && (r[n] = i.value);
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
    const e = this.activePanel, t = this.panelRenderers.get(e);
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
    else if (e === "jserrors") s = xe(this.state.extra.jserrors || [], P, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const r = L.get(e);
      if (r && (r.renderConsole || r.render)) {
        const i = V(r);
        let n = this.getStateForKey(i);
        if (r.applyFilters) {
          const a = this.getPanelFilterState(e, r);
          n = r.applyFilters(n, a);
        } else if (!r.renderFilters && r.showFilters !== !1) {
          const a = this.filters.objects.search.trim();
          a && n && typeof n == "object" && !Array.isArray(n) && (n = W(n, a));
        }
        s = (r.renderConsole || r.render)(n, P, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(le(e), this.state.extra[e], this.filters.objects.search);
    }
    this.panelEl.innerHTML = s, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && De(this.panelEl, this.expandedRequests), e === "sql" && this.attachSQLSelectionListeners(), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && Ft(this.panelEl), this.renderStoredPanelActionResult(e);
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
    const r = e.dataset.panelId || "", i = e.dataset.actionId || "";
    if (!this.debugPath || !r || !i) return;
    const n = e.dataset.actionConfirm || "";
    if ((e.dataset.actionRequiresConfirm === "true" || n) && !window.confirm(n || "Run this debug panel action?")) return;
    const a = s || ke(e);
    r === "commands" && e instanceof HTMLFormElement && this.commandLauncherLastPayloads.set(i, be(a)), t && (t.disabled = !0);
    const c = Date.now();
    try {
      const d = await T(`${this.debugPath}/api/panels/${encodeURIComponent(r)}/actions/${encodeURIComponent(i)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a)
      });
      if (!d.ok) throw new Error(await Se(d, `Action failed (${d.status})`, { appendStatusToFallback: !1 }));
      const l = await d.json();
      this.showPanelActionResult(r, l.ok === !1 ? "error" : "ok", l.message || (l.ok === !1 ? "Action failed" : "Action complete"), i, l.data, l.errors, {
        at: Date.now(),
        durationMs: Date.now() - c
      }), l.event && this.handleEvent(l.event), l.refresh && await this.fetchSnapshot();
    } catch (d) {
      const l = d instanceof Error ? d.message : "Action failed";
      this.showPanelActionResult(r, "error", l, i, void 0, void 0, {
        at: Date.now(),
        durationMs: Date.now() - c
      });
    } finally {
      t && (t.disabled = !1);
    }
  }
  showPanelActionResult(e, t, s, r, i, n, a) {
    this.panelActionResults.set(e, {
      status: t,
      message: s,
      actionID: r,
      data: i,
      errors: n,
      at: a?.at,
      durationMs: a?.durationMs
    }), this.renderStoredPanelActionResult(e);
  }
  renderStoredPanelActionResult(e) {
    const t = this.panelActionResults.get(e);
    if (!t) return;
    this.clearPanelActionErrors();
    const s = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((n) => n.dataset.panelActionResult === e);
    if (!s) return;
    if (e === "commands") {
      const n = kt(t.status, t.message, t.data, t.errors), a = {};
      n.validationErrors.forEach((c) => {
        c.path && (a[c.path] = c.message || c.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(a, t.errors), this.renderPanelActionErrors(a, t.actionID), s.innerHTML = It(n, {
        canRetry: !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)),
        at: t.at,
        durationMs: t.durationMs
      }), this.attachCommandLauncherResultActions(s, t.actionID);
      return;
    }
    const r = this.renderPanelActionErrors(t.errors, t.actionID), i = t.data === void 0 ? "" : `<pre class="${P.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${h(oe(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${t.status === "error" ? P.badgeError : P.badge}">${h(t.message)}</div>${r}${i}`;
  }
  attachCommandLauncherResultActions(e, t) {
    const s = e.querySelector("[data-cmdl-retry]");
    !s || !t || s.addEventListener("click", () => {
      this.retryCommandLauncherAction(t, s);
    });
  }
  retryCommandLauncherAction(e, t) {
    const s = this.commandLauncherLastPayloads.get(e);
    if (!s) return;
    const r = Array.from(this.panelEl.querySelectorAll("[data-panel-action-form]")).find((i) => i.dataset.panelId === "commands" && i.dataset.actionId === e);
    r && this.runPanelAction(r, t, be(s));
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
    return Object.entries(e).forEach(([r, i]) => {
      const n = this.stringifyActionError(i);
      if (!n) return;
      const a = r.trim(), c = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((d) => t && d.dataset.actionId !== t ? !1 : d.dataset.actionFieldError === a || d.dataset.actionFieldName === a || d.dataset.actionFieldError === `payload.${a}`);
      if (c) {
        c.textContent = n, c.hidden = !1;
        return;
      }
      s.push(n);
    }), s.length === 0 ? "" : `<ul class="${P.badgeError}" style="margin-top:0.5rem">${s.map((r) => `<li>${h(r)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    we(this.panelEl);
  }
  attachCopyButtonListeners() {
    Te(this.panelEl, { useIconFeedback: !0 });
  }
  attachSQLSelectionListeners() {
    Ae(this.panelEl, this.state.sql, { useIconFeedback: !0 });
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new Ie({
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
  renderRequests() {
    const { method: e, status: t, search: s, newestFirst: r, hasBody: i, contentType: n } = this.filters.requests, a = s.toLowerCase(), c = this.state.requests.filter((d) => !(e !== "all" && (d.method || "").toUpperCase() !== e || t !== "all" && String(d.status || "") !== t || a && !(d.path || "").toLowerCase().includes(a) || i && !d.request_body || n !== "all" && (d.content_type || "").split(";")[0].trim() !== n));
    return c.length === 0 ? this.renderEmptyState("No requests captured yet.") : $e(c, P, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      truncatePath: !1,
      expandedRequestIds: this.expandedRequests
    });
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: s, newestFirst: r } = this.filters.sql, i = e.toLowerCase(), n = this.state.sql.filter((a) => !(s && !a.error || t && !this.isSlowQuery(a) || i && !(a.query || "").toLowerCase().includes(i)));
    return n.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : _e(n, P, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  renderLogs() {
    const { level: e, search: t, newestFirst: s } = this.filters.logs, r = t.toLowerCase(), i = this.state.logs.filter((n) => {
      if (e !== "all" && (n.level || "").toLowerCase() !== e) return !1;
      const a = `${n.message || ""} ${n.source || ""} ${oe(n.fields || {})}`.toLowerCase();
      return !(r && !a.includes(r));
    });
    return i.length === 0 ? this.renderEmptyState("No logs captured yet.") : Ce(i, P, {
      newestFirst: s,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((i) => {
      if (e !== "all" && (i.method || "").toUpperCase() !== e) return !1;
      const n = `${i.path || ""} ${i.handler || ""} ${i.summary || ""}`.toLowerCase();
      return !(s && !n.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : Le(r, P, { showName: !0 });
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
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), s.sort((n, a) => {
      const c = new Date(n.last_activity || n.started_at || 0).getTime();
      return new Date(a.last_activity || a.started_at || 0).getTime() - c;
    }), this.sessionsLoading && s.length === 0) return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const r = s.map((n) => {
      const a = n.session_id || "", c = n.username || n.user_id || "Unknown", d = je(n.last_activity || n.started_at), l = H(n.request_count ?? 0), u = !!a && a === this.activeSessionId, g = u ? "detach" : "attach", p = u ? "Detach" : "Attach", f = u ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", b = u ? "debug-session-row debug-session-row--active" : "debug-session-row", v = n.current_page || "-", S = n.ip || "-";
      return `
          <tr class="${b}">
            <td>
              <div class="debug-session-user">${h(c)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${h(a || "-")}</span>
              </div>
            </td>
            <td>${h(S)}</td>
            <td>
              <span class="debug-session-path">${h(v)}</span>
            </td>
            <td>${h(d || "-")}</td>
            <td>${h(l)}</td>
            <td>
              <button class="${f}" data-session-action="${g}" data-session-id="${h(a)}">
                ${p}
              </button>
            </td>
          </tr>
        `;
    }).join(""), i = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${H(s.length)} active`}</span>
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
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, s = this.state.custom.logs.length > 0;
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : Oe(this.state.custom, P, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (r) => W(r, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const r = t && typeof t == "object" && !Array.isArray(t), i = Array.isArray(t);
    return r && Object.keys(t || {}).length === 0 || i && (t || []).length === 0 || !r && !i && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : qe(e, t, P, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (n) => W(n, s) : void 0
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
    this.stream.close(), this.stream = new ae({
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
    }, this.expandedRequests.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
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
        return Ne({ [s]: this.getStateForKey(s) }, t);
      }
    }
    switch (e) {
      case "template":
        return M(this.state.template);
      case "session":
        return M(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return M(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return M(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return M(this.state.extra[e]);
    }
  }
  renderEmptyState(e) {
    return `
      <div class="debug-empty">
        <p>${h(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((s) => {
      const r = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${h(s)}" ${r}>${h(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), s = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      s && (s.textContent = H(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${H(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(e) {
    if (!e || !e.type) return;
    if (e.type === "snapshot") {
      this.applySnapshot(e.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused) return;
    const t = this.eventToPanel[e.type] || e.type, s = L.get(t);
    if (s) {
      const r = V(s), i = this.getStateForKey(r), n = (s.handleEvent || ((a, c) => Qe(a, c, this.maxLogEntries)))(i, e.payload);
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
        He(t) || (this.state.extra[t] = e.payload);
        break;
    }
    this.updateTabCounts(), t === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Jt(this.state.custom.data, String(e.key), e.value);
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
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = N(t.requests), this.state.sql = N(t.sql), this.state.logs = N(t.logs), this.state.config = t.config || {}, this.state.routes = N(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: N(s.logs)
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
      !r.has(n) && n in t && (i[n] = t[n]);
    }), this.state.extra = i, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; ) e.shift();
  }
  isSlowQuery(e) {
    return Xe(e?.duration, this.slowThresholdMs);
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
    this.debugPath && (this.stream.clear(), !this.activeSessionId && T(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const e = this.activePanel;
    this.stream.clear([e]), !this.activeSessionId && T(`${this.debugPath}/api/clear/${e}`, {
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
    const s = t.split(".").map((i) => i.trim()).filter(Boolean);
    if (s.length === 0) return;
    let r = e;
    for (const i of s) {
      if (!r || typeof r != "object") return;
      r = r[i];
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
    const i = t === "success" ? {
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
  async runDoctorAction(e, t = "", s = !1) {
    if (!this.debugPath || this.activeSessionId) return;
    const r = e.trim();
    if (!r) return;
    const i = t.trim();
    if (s || i) {
      const n = i || "Are you sure you want to run this doctor action?";
      if (!window.confirm(n)) return;
    }
    try {
      const n = await T(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), a = await this.parseJSONResponse(n);
      if (!n.ok) {
        const d = this.responseMessage(a, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${n.status})`;
        this.showDoctorActionToast(d, "error");
        return;
      }
      const c = this.responseMessage(a, ["message", "result.message"]) || "Doctor action completed.";
      this.showDoctorActionToast(c, "success");
    } catch {
      this.showDoctorActionToast("Doctor action failed: unable to reach debug API.", "error");
    } finally {
      this.stream.requestSnapshot();
    }
  }
  togglePause(e) {
    this.paused = !this.paused, e.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}, zt = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new Kt(t) : null;
}, ye = () => {
  zt();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ye) : ye();
export {
  Zt as DATA_ATTRS,
  fs as DEBUG_ICON_REFS,
  Kt as DebugPanel,
  ae as DebugStream,
  os as INTERACTION_CLASSES,
  Gt as RemoteDebugStream,
  Ps as applyCustomEventPayload,
  xs as applyDebugEventToSnapshot,
  Te as attachCopyListeners,
  we as attachExpandableRowListeners,
  Y as buildEventToPanel,
  P as consoleStyles,
  ls as copyToClipboard,
  M as countPayload,
  _s as defaultGetCount,
  Qe as defaultHandleEvent,
  h as escapeHTML,
  As as fetchDebugSnapshot,
  Es as formatDuration,
  oe as formatJSON,
  H as formatNumber,
  je as formatTimestamp,
  hs as getDebugIconRef,
  Ke as getDefaultPanels,
  Cs as getDefaultToolbarPanels,
  ys as getLevelClass,
  Ne as getPanelCount,
  Os as getPanelData,
  Fe as getPanelEventTypes,
  Be as getPanelIcon,
  le as getPanelLabel,
  V as getSnapshotKey,
  vs as getStatusClass,
  ts as getStyleConfig,
  ws as getToolbarCounts,
  zt as initDebugPanel,
  He as isKnownPanel,
  Xe as isSlowDuration,
  gs as normalizeEventTypes,
  Ue as normalizeReplCommands,
  L as panelRegistry,
  Oe as renderCustomPanel,
  us as renderDebugIcon,
  Re as renderDebugIconRef,
  ss as renderDoctorPanel,
  Wt as renderDoctorPanelCompact,
  qe as renderJSONPanel,
  bs as renderJSONViewer,
  Ce as renderLogsPanel,
  Ss as renderPanelContent,
  is as renderPermissionsPanel,
  as as renderPermissionsPanelCompact,
  $e as renderRequestsPanel,
  Le as renderRoutesPanel,
  _e as renderSQLPanel,
  rs as renderSiteRenderCachePanel,
  ns as renderSiteRenderCachePanelCompact,
  Me as replPanelIDs,
  es as toolbarStyles,
  ms as truncate
};

//# sourceMappingURL=index.js.map