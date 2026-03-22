import { A as m, B as qe, C as Q, D as Fe, F as Ne, I as je, L as X, M as z, N as L, O as T, P as Y, R as Me, S as G, T as V, _ as v, a as _, b as Be, c as Ue, d as W, f as Ke, g as Z, h as ee, i as Je, j as He, k, l as te, m as se, n as re, o as J, p as ie, r as ne, s as S, t as Qe, u as ae, v as Xe, w as oe, x as ze, y as Ye, z as q } from "../chunks/builtin-panels-Dm8EsEAm.js";
import { t as le } from "../chunks/repl-panel-Cxtz4VCo.js";
var he = class {
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
}, ce = class {
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
}, w = class a {
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
    let e, s, r, i, n, o, c, l, h;
    if (o = this.gobbleToken(), !o || (s = this.gobbleBinaryOp(), !s)) return o;
    for (n = {
      value: s,
      prec: a.binaryPrecedence(s),
      right_a: a.right_associative.has(s)
    }, c = this.gobbleToken(), c || this.throwError("Expected expression after " + s), i = [
      o,
      n,
      c
    ]; s = this.gobbleBinaryOp(); ) {
      if (r = a.binaryPrecedence(s), r === 0) {
        this.index -= s.length;
        break;
      }
      n = {
        value: s,
        prec: r,
        right_a: a.right_associative.has(s)
      }, h = s;
      const d = (g) => n.right_a && g.right_a ? r > g.prec : r <= g.prec;
      for (; i.length > 2 && d(i[i.length - 2]); )
        c = i.pop(), s = i.pop().value, o = i.pop(), e = {
          type: a.BINARY_EXP,
          operator: s,
          left: o,
          right: c
        }, i.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + h), i.push(n, e);
    }
    for (l = i.length - 1, e = i[l]; l > 1; )
      e = {
        type: a.BINARY_EXP,
        operator: i[l - 1].value,
        left: i[l - 2],
        right: e
      }, l -= 2;
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
}, ue = new he();
Object.assign(w, {
  hooks: ue,
  plugins: new ce(w),
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
w.max_unop_len = w.getMaxKeyLen(w.unary_ops);
w.max_binop_len = w.getMaxKeyLen(w.binary_ops);
var x = (t) => new w(t).parse(), de = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(w).filter((t) => !de.includes(t) && x[t] === void 0).forEach((t) => {
  x[t] = w[t];
});
x.Jsep = w;
var fe = "ConditionalExpression";
x.plugins.register({
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
            type: fe,
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
var F = 47, pe = 92, ge = {
  name: "regex",
  init(t) {
    t.hooks.add("gobble-token", function(s) {
      if (this.code === F) {
        const r = ++this.index;
        let i = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === F && !i) {
            const n = this.expr.slice(r, this.index);
            let o = "";
            for (; ++this.index < this.expr.length; ) {
              const l = this.code;
              if (l >= 97 && l <= 122 || l >= 65 && l <= 90 || l >= 48 && l <= 57) o += this.char;
              else break;
            }
            let c;
            try {
              c = new RegExp(n, o);
            } catch (l) {
              this.throwError(l.message);
            }
            return s.node = {
              type: t.LITERAL,
              value: c,
              raw: this.expr.slice(r - 1, this.index)
            }, s.node = this.gobbleTokenProperty(s.node), s.node;
          }
          this.code === t.OBRACK_CODE ? i = !0 : i && this.code === t.CBRACK_CODE && (i = !1), this.index += this.code === pe ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, D = 43, A = {
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
  updateOperators: [D, 45],
  assignmentPrecedence: 0.9,
  init(t) {
    const e = [t.IDENTIFIER, t.MEMBER_EXP];
    A.assignmentOperators.forEach((r) => t.addBinaryOp(r, A.assignmentPrecedence, !0)), t.hooks.add("gobble-token", function(i) {
      const n = this.code;
      A.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, i.node = {
        type: "UpdateExpression",
        operator: n === D ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!i.node.argument || !e.includes(i.node.argument.type)) && this.throwError(`Unexpected ${i.node.operator}`));
    }), t.hooks.add("after-token", function(i) {
      if (i.node) {
        const n = this.code;
        A.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (e.includes(i.node.type) || this.throwError(`Unexpected ${i.node.operator}`), this.index += 2, i.node = {
          type: "UpdateExpression",
          operator: n === D ? "++" : "--",
          argument: i.node,
          prefix: !1
        });
      }
    }), t.hooks.add("after-expression", function(i) {
      i.node && s(i.node);
    });
    function s(r) {
      A.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", s(r.left), s(r.right)) : r.operator || Object.values(r).forEach((i) => {
        i && typeof i == "object" && s(i);
      });
    }
  }
};
x.plugins.register(ge, A);
x.addUnaryOp("typeof");
x.addLiteral("null", null);
x.addLiteral("undefined", void 0);
var be = /* @__PURE__ */ new Set([
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
    if (!Object.hasOwn(r, s) && be.has(s)) throw TypeError(`Cannot read properties of ${r} (reading '${s}')`);
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
}, ye = class {
  constructor(t) {
    this.code = t, this.ast = x(this.code);
  }
  runInNewContext(t) {
    const e = Object.assign(/* @__PURE__ */ Object.create(null), t);
    return p.evalAst(this.ast, e);
  }
};
function C(t, e) {
  return t = t.slice(), t.push(e), t;
}
function R(t, e) {
  return e = e.slice(), e.unshift(t), e;
}
var Ee = class extends Error {
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
    const c = this.evaluate(o);
    if (!c || typeof c != "object") throw new Ee(c);
    return c;
  }
}
f.prototype.evaluate = function(t, e, s, r) {
  let i = this.parent, n = this.parentProperty, { flatten: o, wrap: c } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, s = s || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, e = e || this.json, t = t || this.path, t && typeof t == "object" && !Array.isArray(t)) {
    if (!t.path && t.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(t, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: e } = t), o = Object.hasOwn(t, "flatten") ? t.flatten : o, this.currResultType = Object.hasOwn(t, "resultType") ? t.resultType : this.currResultType, this.currSandbox = Object.hasOwn(t, "sandbox") ? t.sandbox : this.currSandbox, c = Object.hasOwn(t, "wrap") ? t.wrap : c, this.currEval = Object.hasOwn(t, "eval") ? t.eval : this.currEval, s = Object.hasOwn(t, "callback") ? t.callback : s, this.currOtherTypeCallback = Object.hasOwn(t, "otherTypeCallback") ? t.otherTypeCallback : this.currOtherTypeCallback, i = Object.hasOwn(t, "parent") ? t.parent : i, n = Object.hasOwn(t, "parentProperty") ? t.parentProperty : n, t = t.path;
  }
  if (i = i || null, n = n || null, Array.isArray(t) && (t = f.toPathString(t)), !t && t !== "" || !e) return;
  const l = f.toPathArray(t);
  l[0] === "$" && l.length > 1 && l.shift(), this._hasParentSelector = null;
  const h = this._trace(l, e, ["$"], i, n, s).filter(function(d) {
    return d && !d.isParentSelector;
  });
  return h.length ? !c && h.length === 1 && !h[0].hasArrExpr ? this._getPreferredOutput(h[0]) : h.reduce((d, g) => {
    const y = this._getPreferredOutput(g);
    return o && Array.isArray(y) ? d = d.concat(y) : d.push(y), d;
  }, []) : c ? [] : void 0;
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
f.prototype._trace = function(t, e, s, r, i, n, o, c) {
  let l;
  if (!t.length)
    return l = {
      path: s,
      value: e,
      parent: r,
      parentProperty: i,
      hasArrExpr: o
    }, this._handleCallback(l, n, "value"), l;
  const h = t[0], d = t.slice(1), g = [];
  function y(u) {
    Array.isArray(u) ? u.forEach((b) => {
      g.push(b);
    }) : g.push(u);
  }
  if ((typeof h != "string" || c) && e && Object.hasOwn(e, h)) y(this._trace(d, e[h], C(s, h), e, h, n, o));
  else if (h === "*") this._walk(e, (u) => {
    y(this._trace(d, e[u], C(s, u), e, u, n, !0, !0));
  });
  else if (h === "..")
    y(this._trace(d, e, s, r, i, n, o)), this._walk(e, (u) => {
      typeof e[u] == "object" && y(this._trace(t.slice(), e[u], C(s, u), e, u, n, !0));
    });
  else {
    if (h === "^")
      return this._hasParentSelector = !0, {
        path: s.slice(0, -1),
        expr: d,
        isParentSelector: !0
      };
    if (h === "~")
      return l = {
        path: C(s, h),
        value: i,
        parent: r,
        parentProperty: null
      }, this._handleCallback(l, n, "property"), l;
    if (h === "$") y(this._trace(d, e, s, null, null, n, o));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(h)) y(this._slice(h, d, e, s, r, i, n));
    else if (h.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = h.replace(/^\?\((.*?)\)$/u, "$1"), b = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      b ? this._walk(e, (E) => {
        const P = [b[2]], O = b[1] ? e[E][b[1]] : e[E];
        this._trace(P, O, s, r, i, n, !0).length > 0 && y(this._trace(d, e[E], C(s, E), e, E, n, !0));
      }) : this._walk(e, (E) => {
        this._eval(u, e[E], E, s, r, i) && y(this._trace(d, e[E], C(s, E), e, E, n, !0));
      });
    } else if (h[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      y(this._trace(R(this._eval(h, e, s.at(-1), s.slice(0, -1), r, i), d), e, s, r, i, n, o));
    } else if (h[0] === "@") {
      let u = !1;
      const b = h.slice(1, -2);
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
        return l = {
          path: s,
          value: e,
          parent: r,
          parentProperty: i
        }, this._handleCallback(l, n, "value"), l;
    } else if (h[0] === "`" && e && Object.hasOwn(e, h.slice(1))) {
      const u = h.slice(1);
      y(this._trace(d, e[u], C(s, u), e, u, n, o, !0));
    } else if (h.includes(",")) {
      const u = h.split(",");
      for (const b of u) y(this._trace(R(b, d), e, s, r, i, n, !0));
    } else !c && e && Object.hasOwn(e, h) && y(this._trace(d, e[h], C(s, h), e, h, n, o, !0));
  }
  if (this._hasParentSelector) for (let u = 0; u < g.length; u++) {
    const b = g[u];
    if (b && b.isParentSelector) {
      const E = this._trace(b.expr, e, b.path, r, i, n, o);
      if (Array.isArray(E)) {
        g[u] = E[0];
        const P = E.length;
        for (let O = 1; O < P; O++)
          u++, g.splice(u, 0, E[O]);
      } else g[u] = E;
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
  const c = s.length, l = t.split(":"), h = l[2] && Number.parseInt(l[2]) || 1;
  let d = l[0] && Number.parseInt(l[0]) || 0, g = l[1] && Number.parseInt(l[1]) || c;
  d = d < 0 ? Math.max(0, d + c) : Math.min(c, d), g = g < 0 ? Math.max(0, g + c) : Math.min(c, g);
  const y = [];
  for (let u = d; u < g; u += h) this._trace(R(u, e), s, r, i, n, o, !0).forEach((b) => {
    y.push(b);
  });
  return y;
};
f.prototype._eval = function(t, e, s, r, i, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = i, this.currSandbox._$_property = s, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const o = t.includes("@path");
  o && (this.currSandbox._$_path = f.toPathString(r.concat([s])));
  const c = this.currEval + "Script:" + t;
  if (!f.cache[c]) {
    let l = t.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (o && (l = l.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) f.cache[c] = new this.safeVm.Script(l);
    else if (this.currEval === "native") f.cache[c] = new this.vm.Script(l);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const h = this.currEval;
      f.cache[c] = new h(l);
    } else if (typeof this.currEval == "function") f.cache[c] = { runInNewContext: (h) => this.currEval(l, h) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return f.cache[c].runInNewContext(this.currSandbox);
  } catch (l) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + l.message + ": " + t);
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
f.prototype.safeVm = { Script: ye };
var me = function(t, e, s) {
  const r = t.length;
  for (let i = 0; i < r; i++) {
    const n = t[i];
    s(n) && e.push(t.splice(i--, 1)[0]);
  }
}, Se = class {
  constructor(t) {
    this.code = t;
  }
  runInNewContext(t) {
    let e = this.code;
    const s = Object.keys(t), r = [];
    me(s, r, (c) => typeof t[c] == "function");
    const i = s.map((c) => t[c]);
    e = r.reduce((c, l) => {
      let h = t[l].toString();
      return /function/u.test(h) || (h = "function " + h), "var " + l + "=" + h + ";" + c;
    }, "") + e, !/(['"])use strict\1/u.test(e) && !s.includes("arguments") && (e = "var arguments = undefined;" + e), e = e.replace(/;\s*$/u, "");
    const n = e.lastIndexOf(";"), o = n !== -1 ? e.slice(0, n + 1) + " return " + e.slice(n + 1) : " return " + e;
    return new Function(...s, o)(...i);
  }
};
f.prototype.vm = { Script: Se };
function we(t) {
  return t ? !!(t.startsWith("$") || /\[\d+\]/.test(t) || /\[['"]/.test(t) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(t) || t.includes("..") || t.includes("*")) : !1;
}
function xe(t) {
  return t ? t.startsWith("$") ? t : `$.${t}` : "$";
}
function ve(t, e) {
  if (!t || !e) return [];
  try {
    return (f({
      path: xe(e),
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
function Ce(t, e) {
  if (!e || !t) return t || {};
  const s = we(e);
  if (console.log("[jsonpath-search] search:", e, "isJsonPath:", s), s) {
    const i = Pe(t, e);
    return console.log("[jsonpath-search] JSONPath result:", i), i;
  }
  const r = Ae(t, e);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function Ae(t, e) {
  const s = e.toLowerCase(), r = {};
  for (const [i, n] of Object.entries(t || {})) i.toLowerCase().includes(s) && (r[i] = n);
  return r;
}
function Pe(t, e) {
  const s = ve(t, e);
  if (s.length === 0) return {};
  if (s.length === 1) {
    const { path: i, value: n } = s[0];
    return i === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [N(i)]: n };
  }
  const r = {};
  for (const { path: i, value: n } of s) {
    const o = N(i) || `result_${Object.keys(r).length}`;
    o in r ? r[`${o}_${Object.keys(r).length}`] = n : r[o] = n;
  }
  return r;
}
function N(t) {
  if (!t) return "";
  const e = t.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e) return e[1];
  const s = t.match(/\.([^.[\]]+)$/);
  return s ? s[1] : t.replace(/^\$\.?/, "");
}
var Oe = () => {
  const t = S.getSortedIds();
  return t.length > 0 ? t : [
    "template",
    "session",
    "requests",
    "sql",
    "logs",
    "config",
    "routes",
    "custom"
  ];
}, H = /* @__PURE__ */ new Set(["shell", "console"]), Te = (t) => S.has(t) || H.has(t), j = {
  shell: "Shell",
  console: "Console"
}, M = (t) => {
  if (j[t]) return j[t];
  const e = S.get(t);
  return e ? e.label : t ? t.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (s) => s.toUpperCase()) : "";
}, ke = (t) => {
  if (t === "sessions") return [];
  const e = S.get(t);
  return e ? J(e) : [t];
}, B = () => {
  const t = {};
  for (const e of S.list()) for (const s of J(e)) t[s] = e.id;
  return t;
}, U = (t) => {
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}, Le = (t) => {
  if (!Array.isArray(t)) return [];
  const e = [];
  return t.forEach((s) => {
    if (!s || typeof s != "object") return;
    const r = s, i = typeof r.command == "string" ? r.command.trim() : "";
    if (!i) return;
    const n = typeof r.description == "string" ? r.description.trim() : "", o = Array.isArray(r.tags) ? r.tags.filter((h) => typeof h == "string" && h.trim() !== "").map((h) => h.trim()) : [], c = Array.isArray(r.aliases) ? r.aliases.filter((h) => typeof h == "string" && h.trim() !== "").map((h) => h.trim()) : [], l = typeof r.mutates == "boolean" ? r.mutates : typeof r.read_only == "boolean" ? !r.read_only : !1;
    e.push({
      command: i,
      description: n || void 0,
      tags: o.length > 0 ? o : void 0,
      aliases: c.length > 0 ? c : void 0,
      mutates: l
    });
  }), e;
}, _e = (t) => Array.isArray(t) && t.length > 0 ? t.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : Oe(), I = (t, e) => Ce(t, e), De = (t, e, s) => {
  if (!t || !e) return;
  const r = e.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0) return;
  let i = t;
  for (let n = 0; n < r.length - 1; n += 1) {
    const o = r[n];
    (!i[o] || typeof i[o] != "object") && (i[o] = {}), i = i[o];
  }
  i[r[r.length - 1]] = s;
}, $ = (t, e) => {
  if (!t) return e;
  const s = Number(t);
  return Number.isNaN(s) ? e : s;
}, Ie = class {
  constructor(t) {
    this.customFilterState = {}, this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.container = t, this.panels = _e(U(t.dataset.panels)), this.panels.includes("sessions") || this.panels.push("sessions"), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = $(t.dataset.maxLogEntries, 500), this.maxSQLQueries = $(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = $(t.dataset.slowThresholdMs, 50), this.replCommands = Le(U(t.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), H.forEach((e) => {
      this.panelRenderers.set(e, {
        render: () => this.renderReplPanel(e),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = B(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.updateSessionBanner(), this.stream = new q({
      basePath: this.streamBasePath,
      onEvent: (e) => this.handleEvent(e),
      onStatusChange: (e) => this.updateConnectionStatus(e)
    }), this.unsubscribeRegistry = S.subscribe((e) => this.handleRegistryChange(e)), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  subscribeToEvents() {
    const t = /* @__PURE__ */ new Set();
    for (const e of this.panels) for (const s of ke(e)) t.add(s);
    this.stream.subscribe(Array.from(t));
  }
  handleRegistryChange(t) {
    this.eventToPanel = B(), t.type === "register" ? (this.panels.includes(t.panelId) || this.panels.push(t.panelId), t.panel && t.panel.defaultFilters !== void 0 && !(t.panelId in this.customFilterState) && (this.customFilterState[t.panelId] = this.cloneFilterState(t.panel.defaultFilters))) : t.type === "unregister" && delete this.customFilterState[t.panelId], this.subscribeToEvents(), this.renderTabs(), t.panelId === this.activePanel && this.renderActivePanel();
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
      !r || r === this.activePanel || (this.activePanel = r, this.renderActivePanel());
    }), this.container.querySelectorAll("[data-debug-action]").forEach((t) => {
      t.addEventListener("click", () => {
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
      });
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
    const t = this.panels.map((e) => `
          <button class="debug-tab ${e === this.activePanel ? "debug-tab--active" : ""}" data-panel="${m(e)}">
            <span class="debug-tab__label">${m(M(e))}</span>
            <span class="debug-tab__count" data-panel-count="${m(e)}">0</span>
          </button>
        `).join("");
    this.tabsEl.innerHTML = t, this.updateTabCounts();
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
      const r = S.get(t);
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
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="/admin/users" />
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
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="SELECT" />
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
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="database" />
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
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && t === "sessions") {
      const r = this.filters.sessions;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const r = this.filters.objects;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="user.roles[0].name" />
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
    const t = this.activePanel, e = this.filtersEl.querySelectorAll("[data-filter]"), s = S.get(t);
    if (s?.renderFilters) {
      const r = this.getPanelFilterState(t, s), i = r && typeof r == "object" && !Array.isArray(r) ? { ...r } : {};
      e.forEach((n) => {
        const o = n.dataset.filter || "";
        if (!o) return;
        const c = i[o];
        i[o] = this.readFilterInputValue(n, c);
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
    const s = e || S.get(t);
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
    else if (t === "jserrors") s = te(this.state.extra.jserrors || [], v, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const r = S.get(t);
      if (r && (r.renderConsole || r.render)) {
        const i = _(r);
        let n = this.getStateForKey(i);
        if (r.applyFilters) {
          const o = this.getPanelFilterState(t, r);
          n = r.applyFilters(n, o);
        } else if (!r.renderFilters && r.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && n && typeof n == "object" && !Array.isArray(n) && (n = I(n, o));
        }
        s = (r.renderConsole || r.render)(n, v, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(M(t), this.state.extra[t], this.filters.objects.search);
    }
    this.panelEl.innerHTML = s, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), t === "requests" && oe(this.panelEl, this.expandedRequests), t === "sql" && this.attachSQLSelectionListeners(), t === "sessions" && this.attachSessionActions();
  }
  attachExpandableRowListeners() {
    Q(this.panelEl);
  }
  attachCopyButtonListeners() {
    G(this.panelEl, { useIconFeedback: !0 });
  }
  attachSQLSelectionListeners() {
    V(this.panelEl, this.state.sql, { useIconFeedback: !0 });
  }
  renderReplPanel(t) {
    this.panelEl.classList.add("debug-content--repl");
    let e = this.replPanels.get(t);
    e || (e = new le({
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
    const { method: t, status: e, search: s, newestFirst: r, hasBody: i, contentType: n } = this.filters.requests, o = s.toLowerCase(), c = this.state.requests.filter((l) => !(t !== "all" && (l.method || "").toUpperCase() !== t || e !== "all" && String(l.status || "") !== e || o && !(l.path || "").toLowerCase().includes(o) || i && !l.request_body || n !== "all" && (l.content_type || "").split(";")[0].trim() !== n));
    return c.length === 0 ? this.renderEmptyState("No requests captured yet.") : Z(c, v, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      truncatePath: !1,
      expandedRequestIds: this.expandedRequests
    });
  }
  renderSQL() {
    const { search: t, slowOnly: e, errorOnly: s, newestFirst: r } = this.filters.sql, i = t.toLowerCase(), n = this.state.sql.filter((o) => !(s && !o.error || e && !this.isSlowQuery(o) || i && !(o.query || "").toLowerCase().includes(i)));
    return n.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : ee(n, v, {
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
      const o = `${n.message || ""} ${n.source || ""} ${z(n.fields || {})}`.toLowerCase();
      return !(r && !o.includes(r));
    });
    return i.length === 0 ? this.renderEmptyState("No logs captured yet.") : se(i, v, {
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
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : ie(r, v, { showName: !0 });
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
      const c = new Date(n.last_activity || n.started_at || 0).getTime();
      return new Date(o.last_activity || o.started_at || 0).getTime() - c;
    }), this.sessionsLoading && s.length === 0) return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return t === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const r = s.map((n) => {
      const o = n.session_id || "", c = n.username || n.user_id || "Unknown", l = Y(n.last_activity || n.started_at), h = L(n.request_count ?? 0), d = !!o && o === this.activeSessionId, g = d ? "detach" : "attach", y = d ? "Detach" : "Attach", u = d ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", b = d ? "debug-session-row debug-session-row--active" : "debug-session-row", E = n.current_page || "-", P = n.ip || "-";
      return `
          <tr class="${b}">
            <td>
              <div class="debug-session-user">${m(c)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${m(o || "-")}</span>
              </div>
            </td>
            <td>${m(P)}</td>
            <td>
              <span class="debug-session-path">${m(E)}</span>
            </td>
            <td>${m(l || "-")}</td>
            <td>${m(h)}</td>
            <td>
              <button class="${u}" data-session-action="${g}" data-session-id="${m(o)}">
                ${y}
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
    return !e && !s ? this.renderEmptyState("No custom data captured yet.") : ae(this.state.custom, v, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: t ? (r) => I(r, t) : void 0
    });
  }
  renderJSONPanel(t, e, s) {
    const r = e && typeof e == "object" && !Array.isArray(e), i = Array.isArray(e);
    return r && Object.keys(e || {}).length === 0 || i && (e || []).length === 0 || !r && !i && !e ? this.renderEmptyState(`No ${t.toLowerCase()} data available.`) : W(t, e, v, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (n) => I(n, s) : void 0
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
    this.stream.close(), this.stream = new q({
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
      const e = S.get(t);
      if (e) {
        const s = _(e);
        return ne({ [s]: this.getStateForKey(s) }, e);
      }
    }
    switch (t) {
      case "template":
        return T(this.state.template);
      case "session":
        return T(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return T(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return T(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return T(this.state.extra[t]);
    }
  }
  renderEmptyState(t) {
    return `
      <div class="debug-empty">
        <p>${m(t)}</p>
      </div>
    `;
  }
  renderSelectOptions(t, e) {
    return t.map((s) => {
      const r = s.toLowerCase() === e.toLowerCase() ? "selected" : "";
      return `<option value="${m(s)}" ${r}>${m(s)}</option>`;
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
    const e = this.eventToPanel[t.type] || t.type, s = S.get(e);
    if (s) {
      const r = _(s), i = this.getStateForKey(r), n = (s.handleEvent || ((o, c) => re(o, c, this.maxLogEntries)))(i, t.payload);
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
        Te(e) || (this.state.extra[e] = t.payload);
        break;
    }
    this.updateTabCounts(), e === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(t) {
    if (t) {
      if (typeof t == "object" && "key" in t && "value" in t) {
        De(this.state.custom.data, String(t.key), t.value);
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
    this.state.template = e.template || {}, this.state.session = e.session || {}, this.state.requests = k(e.requests), this.state.sql = k(e.sql), this.state.logs = k(e.logs), this.state.config = e.config || {}, this.state.routes = k(e.routes);
    const s = e.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: k(s.logs)
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
    return X(t?.duration, this.slowThresholdMs);
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
    this.debugPath && (this.stream.clear(), !this.activeSessionId && fetch(`${this.debugPath}/api/clear`, {
      method: "POST",
      credentials: "same-origin"
    }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath) return;
    const t = this.activePanel;
    this.stream.clear([t]), !this.activeSessionId && fetch(`${this.debugPath}/api/clear/${t}`, {
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
      const n = await fetch(`${this.debugPath}/api/doctor/${encodeURIComponent(r)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), o = await this.parseJSONResponse(n);
      if (!n.ok) {
        const l = this.responseMessage(o, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${n.status})`;
        this.showDoctorActionToast(l, "error");
        return;
      }
      const c = this.responseMessage(o, ["message", "result.message"]) || "Doctor action completed.";
      this.showDoctorActionToast(c, "success");
    } catch {
      this.showDoctorActionToast("Doctor action failed: unable to reach debug API.", "error");
    } finally {
      this.stream.requestSnapshot();
    }
  }
  togglePause(t) {
    this.paused = !this.paused, t.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}, $e = (t) => {
  const e = t || document.querySelector("[data-debug-console]");
  return e ? new Ie(e) : null;
}, K = () => {
  $e();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", K) : K();
export {
  Be as DATA_ATTRS,
  Ie as DebugPanel,
  q as DebugStream,
  ze as INTERACTION_CLASSES,
  qe as RemoteDebugStream,
  G as attachCopyListeners,
  Q as attachExpandableRowListeners,
  v as consoleStyles,
  Fe as copyToClipboard,
  T as countPayload,
  Qe as defaultGetCount,
  re as defaultHandleEvent,
  m as escapeHTML,
  He as formatDuration,
  z as formatJSON,
  L as formatNumber,
  Y as formatTimestamp,
  Ne as getLevelClass,
  ne as getPanelCount,
  Je as getPanelData,
  _ as getSnapshotKey,
  je as getStatusClass,
  Xe as getStyleConfig,
  $e as initDebugPanel,
  X as isSlowDuration,
  J as normalizeEventTypes,
  S as panelRegistry,
  ae as renderCustomPanel,
  W as renderJSONPanel,
  Ke as renderJSONViewer,
  se as renderLogsPanel,
  Ue as renderPanelContent,
  Z as renderRequestsPanel,
  ie as renderRoutesPanel,
  ee as renderSQLPanel,
  Ye as toolbarStyles,
  Me as truncate
};

//# sourceMappingURL=index.js.map