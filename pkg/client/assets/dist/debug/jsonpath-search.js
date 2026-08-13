import { createLogger as R } from "../shared/logger.js";
import { n as T, r as $, t as L } from "../chunks/simple-object-search-Dd_AEBhz.js";
var j = class {
  add(r, e, t) {
    if (typeof arguments[0] != "string") for (let i in arguments[0]) this.add(i, arguments[0][i], arguments[1]);
    else (Array.isArray(r) ? r : [r]).forEach(function(i) {
      this[i] = this[i] || [], e && this[i][t ? "unshift" : "push"](e);
    }, this);
  }
  run(r, e) {
    this[r] = this[r] || [], this[r].forEach(function(t) {
      t.call(e && e.context ? e.context : e, e);
    });
  }
}, N = class {
  constructor(r) {
    this.jsep = r, this.registered = {};
  }
  register() {
    for (var r = arguments.length, e = new Array(r), t = 0; t < r; t++) e[t] = arguments[t];
    e.forEach((i) => {
      if (typeof i != "object" || !i.name || !i.init) throw new Error("Invalid JSEP plugin format");
      this.registered[i.name] || (i.init(this.jsep), this.registered[i.name] = i);
    });
  }
}, x = class s {
  static get version() {
    return "1.4.0";
  }
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + s.version;
  }
  static addUnaryOp(e) {
    return s.max_unop_len = Math.max(e.length, s.max_unop_len), s.unary_ops[e] = 1, s;
  }
  static addBinaryOp(e, t, i) {
    return s.max_binop_len = Math.max(e.length, s.max_binop_len), s.binary_ops[e] = t, i ? s.right_associative.add(e) : s.right_associative.delete(e), s;
  }
  static addIdentifierChar(e) {
    return s.additional_identifier_chars.add(e), s;
  }
  static addLiteral(e, t) {
    return s.literals[e] = t, s;
  }
  static removeUnaryOp(e) {
    return delete s.unary_ops[e], e.length === s.max_unop_len && (s.max_unop_len = s.getMaxKeyLen(s.unary_ops)), s;
  }
  static removeAllUnaryOps() {
    return s.unary_ops = {}, s.max_unop_len = 0, s;
  }
  static removeIdentifierChar(e) {
    return s.additional_identifier_chars.delete(e), s;
  }
  static removeBinaryOp(e) {
    return delete s.binary_ops[e], e.length === s.max_binop_len && (s.max_binop_len = s.getMaxKeyLen(s.binary_ops)), s.right_associative.delete(e), s;
  }
  static removeAllBinaryOps() {
    return s.binary_ops = {}, s.max_binop_len = 0, s;
  }
  static removeLiteral(e) {
    return delete s.literals[e], s;
  }
  static removeAllLiterals() {
    return s.literals = {}, s;
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
    return new s(e).parse();
  }
  static getMaxKeyLen(e) {
    return Math.max(0, ...Object.keys(e).map((t) => t.length));
  }
  static isDecimalDigit(e) {
    return e >= 48 && e <= 57;
  }
  static binaryPrecedence(e) {
    return s.binary_ops[e] || 0;
  }
  static isIdentifierStart(e) {
    return e >= 65 && e <= 90 || e >= 97 && e <= 122 || e >= 128 && !s.binary_ops[String.fromCharCode(e)] || s.additional_identifier_chars.has(String.fromCharCode(e));
  }
  static isIdentifierPart(e) {
    return s.isIdentifierStart(e) || s.isDecimalDigit(e);
  }
  throwError(e) {
    const t = /* @__PURE__ */ new Error(e + " at character " + this.index);
    throw t.index = this.index, t.description = e, t;
  }
  runHook(e, t) {
    if (s.hooks[e]) {
      const i = {
        context: this,
        node: t
      };
      return s.hooks.run(e, i), i.node;
    }
    return t;
  }
  searchHook(e) {
    if (s.hooks[e]) {
      const t = { context: this };
      return s.hooks[e].find(function(i) {
        return i.call(t.context, t), t.node;
      }), t.node;
    }
  }
  gobbleSpaces() {
    let e = this.code;
    for (; e === s.SPACE_CODE || e === s.TAB_CODE || e === s.LF_CODE || e === s.CR_CODE; ) e = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  parse() {
    this.runHook("before-all");
    const e = this.gobbleExpressions(), t = e.length === 1 ? e[0] : {
      type: s.COMPOUND,
      body: e
    };
    return this.runHook("after-all", t);
  }
  gobbleExpressions(e) {
    let t = [], i, n;
    for (; this.index < this.expr.length; )
      if (i = this.code, i === s.SEMCOL_CODE || i === s.COMMA_CODE) this.index++;
      else if (n = this.gobbleExpression()) t.push(n);
      else if (this.index < this.expr.length) {
        if (i === e) break;
        this.throwError('Unexpected "' + this.char + '"');
      }
    return t;
  }
  gobbleExpression() {
    const e = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    return this.gobbleSpaces(), this.runHook("after-expression", e);
  }
  gobbleBinaryOp() {
    this.gobbleSpaces();
    let e = this.expr.substr(this.index, s.max_binop_len), t = e.length;
    for (; t > 0; ) {
      if (s.binary_ops.hasOwnProperty(e) && (!s.isIdentifierStart(this.code) || this.index + e.length < this.expr.length && !s.isIdentifierPart(this.expr.charCodeAt(this.index + e.length))))
        return this.index += t, e;
      e = e.substr(0, --t);
    }
    return !1;
  }
  gobbleBinaryExpression() {
    let e, t, i, n, o, a, u, h, l;
    if (a = this.gobbleToken(), !a || (t = this.gobbleBinaryOp(), !t)) return a;
    for (o = {
      value: t,
      prec: s.binaryPrecedence(t),
      right_a: s.right_associative.has(t)
    }, u = this.gobbleToken(), u || this.throwError("Expected expression after " + t), n = [
      a,
      o,
      u
    ]; t = this.gobbleBinaryOp(); ) {
      if (i = s.binaryPrecedence(t), i === 0) {
        this.index -= t.length;
        break;
      }
      o = {
        value: t,
        prec: i,
        right_a: s.right_associative.has(t)
      }, l = t;
      const f = (E) => o.right_a && E.right_a ? i > E.prec : i <= E.prec;
      for (; n.length > 2 && f(n[n.length - 2]); )
        u = n.pop(), t = n.pop().value, a = n.pop(), e = {
          type: s.BINARY_EXP,
          operator: t,
          left: a,
          right: u
        }, n.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + l), n.push(o, e);
    }
    for (h = n.length - 1, e = n[h]; h > 1; )
      e = {
        type: s.BINARY_EXP,
        operator: n[h - 1].value,
        left: n[h - 2],
        right: e
      }, h -= 2;
    return e;
  }
  gobbleToken() {
    let e, t, i, n;
    if (this.gobbleSpaces(), n = this.searchHook("gobble-token"), n) return this.runHook("after-token", n);
    if (e = this.code, s.isDecimalDigit(e) || e === s.PERIOD_CODE) return this.gobbleNumericLiteral();
    if (e === s.SQUOTE_CODE || e === s.DQUOTE_CODE) n = this.gobbleStringLiteral();
    else if (e === s.OBRACK_CODE) n = this.gobbleArray();
    else {
      for (t = this.expr.substr(this.index, s.max_unop_len), i = t.length; i > 0; ) {
        if (s.unary_ops.hasOwnProperty(t) && (!s.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !s.isIdentifierPart(this.expr.charCodeAt(this.index + t.length)))) {
          this.index += i;
          const o = this.gobbleToken();
          return o || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: s.UNARY_EXP,
            operator: t,
            argument: o,
            prefix: !0
          });
        }
        t = t.substr(0, --i);
      }
      s.isIdentifierStart(e) ? (n = this.gobbleIdentifier(), s.literals.hasOwnProperty(n.name) ? n = {
        type: s.LITERAL,
        value: s.literals[n.name],
        raw: n.name
      } : n.name === s.this_str && (n = { type: s.THIS_EXP })) : e === s.OPAREN_CODE && (n = this.gobbleGroup());
    }
    return n ? (n = this.gobbleTokenProperty(n), this.runHook("after-token", n)) : this.runHook("after-token", !1);
  }
  gobbleTokenProperty(e) {
    this.gobbleSpaces();
    let t = this.code;
    for (; t === s.PERIOD_CODE || t === s.OBRACK_CODE || t === s.OPAREN_CODE || t === s.QUMARK_CODE; ) {
      let i;
      if (t === s.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== s.PERIOD_CODE) break;
        i = !0, this.index += 2, this.gobbleSpaces(), t = this.code;
      }
      this.index++, t === s.OBRACK_CODE ? (e = {
        type: s.MEMBER_EXP,
        computed: !0,
        object: e,
        property: this.gobbleExpression()
      }, e.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), t = this.code, t !== s.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : t === s.OPAREN_CODE ? e = {
        type: s.CALL_EXP,
        arguments: this.gobbleArguments(s.CPAREN_CODE),
        callee: e
      } : (t === s.PERIOD_CODE || i) && (i && this.index--, this.gobbleSpaces(), e = {
        type: s.MEMBER_EXP,
        computed: !1,
        object: e,
        property: this.gobbleIdentifier()
      }), i && (e.optional = !0), this.gobbleSpaces(), t = this.code;
    }
    return e;
  }
  gobbleNumericLiteral() {
    let e = "", t, i;
    for (; s.isDecimalDigit(this.code); ) e += this.expr.charAt(this.index++);
    if (this.code === s.PERIOD_CODE)
      for (e += this.expr.charAt(this.index++); s.isDecimalDigit(this.code); ) e += this.expr.charAt(this.index++);
    if (t = this.char, t === "e" || t === "E") {
      for (e += this.expr.charAt(this.index++), t = this.char, (t === "+" || t === "-") && (e += this.expr.charAt(this.index++)); s.isDecimalDigit(this.code); ) e += this.expr.charAt(this.index++);
      s.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + e + this.char + ")");
    }
    return i = this.code, s.isIdentifierStart(i) ? this.throwError("Variable names cannot start with a number (" + e + this.char + ")") : (i === s.PERIOD_CODE || e.length === 1 && e.charCodeAt(0) === s.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: s.LITERAL,
      value: parseFloat(e),
      raw: e
    };
  }
  gobbleStringLiteral() {
    let e = "";
    const t = this.index, i = this.expr.charAt(this.index++);
    let n = !1;
    for (; this.index < this.expr.length; ) {
      let o = this.expr.charAt(this.index++);
      if (o === i) {
        n = !0;
        break;
      } else if (o === "\\")
        switch (o = this.expr.charAt(this.index++), o) {
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
            e += o;
        }
      else e += o;
    }
    return n || this.throwError('Unclosed quote after "' + e + '"'), {
      type: s.LITERAL,
      value: e,
      raw: this.expr.substring(t, this.index)
    };
  }
  gobbleIdentifier() {
    let e = this.code, t = this.index;
    for (s.isIdentifierStart(e) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (e = this.code, s.isIdentifierPart(e)); )
      this.index++;
    return {
      type: s.IDENTIFIER,
      name: this.expr.slice(t, this.index)
    };
  }
  gobbleArguments(e) {
    const t = [];
    let i = !1, n = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let o = this.code;
      if (o === e) {
        i = !0, this.index++, e === s.CPAREN_CODE && n && n >= t.length && this.throwError("Unexpected token " + String.fromCharCode(e));
        break;
      } else if (o === s.COMMA_CODE) {
        if (this.index++, n++, n !== t.length) {
          if (e === s.CPAREN_CODE) this.throwError("Unexpected token ,");
          else if (e === s.CBRACK_CODE) for (let a = t.length; a < n; a++) t.push(null);
        }
      } else if (t.length !== n && n !== 0) this.throwError("Expected comma");
      else {
        const a = this.gobbleExpression();
        (!a || a.type === s.COMPOUND) && this.throwError("Expected comma"), t.push(a);
      }
    }
    return i || this.throwError("Expected " + String.fromCharCode(e)), t;
  }
  gobbleGroup() {
    this.index++;
    let e = this.gobbleExpressions(s.CPAREN_CODE);
    if (this.code === s.CPAREN_CODE)
      return this.index++, e.length === 1 ? e[0] : e.length ? {
        type: s.SEQUENCE_EXP,
        expressions: e
      } : !1;
    this.throwError("Unclosed (");
  }
  gobbleArray() {
    return this.index++, {
      type: s.ARRAY_EXP,
      elements: this.gobbleArguments(s.CBRACK_CODE)
    };
  }
}, M = new j();
Object.assign(x, {
  hooks: M,
  plugins: new N(x),
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
x.max_unop_len = x.getMaxKeyLen(x.unary_ops);
x.max_binop_len = x.getMaxKeyLen(x.binary_ops);
var O = (r) => new x(r).parse(), U = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(x).filter((r) => !U.includes(r) && O[r] === void 0).forEach((r) => {
  O[r] = x[r];
});
O.Jsep = x;
var B = "ConditionalExpression";
O.plugins.register({
  name: "ternary",
  init(r) {
    r.hooks.add("after-expression", function(t) {
      if (t.node && this.code === r.QUMARK_CODE) {
        this.index++;
        const i = t.node, n = this.gobbleExpression();
        if (n || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === r.COLON_CODE) {
          this.index++;
          const o = this.gobbleExpression();
          if (o || this.throwError("Expected expression"), t.node = {
            type: B,
            test: i,
            consequent: n,
            alternate: o
          }, i.operator && r.binary_ops[i.operator] <= 0.9) {
            let a = i;
            for (; a.right.operator && r.binary_ops[a.right.operator] <= 0.9; ) a = a.right;
            t.node.test = a.right, a.right = t.node, t.node = i;
          }
        } else this.throwError("Expected :");
      }
    });
  }
});
var D = 47, K = 92, J = {
  name: "regex",
  init(r) {
    r.hooks.add("gobble-token", function(t) {
      if (this.code === D) {
        const i = ++this.index;
        let n = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === D && !n) {
            const o = this.expr.slice(i, this.index);
            let a = "";
            for (; ++this.index < this.expr.length; ) {
              const h = this.code;
              if (h >= 97 && h <= 122 || h >= 65 && h <= 90 || h >= 48 && h <= 57) a += this.char;
              else break;
            }
            let u;
            try {
              u = new RegExp(o, a);
            } catch (h) {
              this.throwError(h.message);
            }
            return t.node = {
              type: r.LITERAL,
              value: u,
              raw: this.expr.slice(i - 1, this.index)
            }, t.node = this.gobbleTokenProperty(t.node), t.node;
          }
          this.code === r.OBRACK_CODE ? n = !0 : n && this.code === r.CBRACK_CODE && (n = !1), this.index += this.code === K ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
}, m = 43, C = {
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
  updateOperators: [m, 45],
  assignmentPrecedence: 0.9,
  init(r) {
    const e = [r.IDENTIFIER, r.MEMBER_EXP];
    C.assignmentOperators.forEach((i) => r.addBinaryOp(i, C.assignmentPrecedence, !0)), r.hooks.add("gobble-token", function(n) {
      const o = this.code;
      C.updateOperators.some((a) => a === o && a === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, n.node = {
        type: "UpdateExpression",
        operator: o === m ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!n.node.argument || !e.includes(n.node.argument.type)) && this.throwError(`Unexpected ${n.node.operator}`));
    }), r.hooks.add("after-token", function(n) {
      if (n.node) {
        const o = this.code;
        C.updateOperators.some((a) => a === o && a === this.expr.charCodeAt(this.index + 1)) && (e.includes(n.node.type) || this.throwError(`Unexpected ${n.node.operator}`), this.index += 2, n.node = {
          type: "UpdateExpression",
          operator: o === m ? "++" : "--",
          argument: n.node,
          prefix: !1
        });
      }
    }), r.hooks.add("after-expression", function(n) {
      n.node && t(n.node);
    });
    function t(i) {
      C.assignmentOperators.has(i.operator) ? (i.type = "AssignmentExpression", t(i.left), t(i.right)) : i.operator || Object.values(i).forEach((n) => {
        n && typeof n == "object" && t(n);
      });
    }
  }
};
O.plugins.register(J, C);
O.addUnaryOp("typeof");
O.addLiteral("null", null);
O.addLiteral("undefined", void 0);
var X = /* @__PURE__ */ new Set([
  "constructor",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__"
]), d = {
  evalAst(r, e) {
    switch (r.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return d.evalBinaryExpression(r, e);
      case "Compound":
        return d.evalCompound(r, e);
      case "ConditionalExpression":
        return d.evalConditionalExpression(r, e);
      case "Identifier":
        return d.evalIdentifier(r, e);
      case "Literal":
        return d.evalLiteral(r, e);
      case "MemberExpression":
        return d.evalMemberExpression(r, e);
      case "UnaryExpression":
        return d.evalUnaryExpression(r, e);
      case "ArrayExpression":
        return d.evalArrayExpression(r, e);
      case "CallExpression":
        return d.evalCallExpression(r, e);
      case "AssignmentExpression":
        return d.evalAssignmentExpression(r, e);
      default:
        throw SyntaxError("Unexpected expression", r);
    }
  },
  evalBinaryExpression(r, e) {
    return {
      "||": (t, i) => t || i(),
      "&&": (t, i) => t && i(),
      "|": (t, i) => t | i(),
      "^": (t, i) => t ^ i(),
      "&": (t, i) => t & i(),
      "==": (t, i) => t == i(),
      "!=": (t, i) => t != i(),
      "===": (t, i) => t === i(),
      "!==": (t, i) => t !== i(),
      "<": (t, i) => t < i(),
      ">": (t, i) => t > i(),
      "<=": (t, i) => t <= i(),
      ">=": (t, i) => t >= i(),
      "<<": (t, i) => t << i(),
      ">>": (t, i) => t >> i(),
      ">>>": (t, i) => t >>> i(),
      "+": (t, i) => t + i(),
      "-": (t, i) => t - i(),
      "*": (t, i) => t * i(),
      "/": (t, i) => t / i(),
      "%": (t, i) => t % i()
    }[r.operator](d.evalAst(r.left, e), () => d.evalAst(r.right, e));
  },
  evalCompound(r, e) {
    let t;
    for (let i = 0; i < r.body.length; i++) {
      r.body[i].type === "Identifier" && [
        "var",
        "let",
        "const"
      ].includes(r.body[i].name) && r.body[i + 1] && r.body[i + 1].type === "AssignmentExpression" && (i += 1);
      const n = r.body[i];
      t = d.evalAst(n, e);
    }
    return t;
  },
  evalConditionalExpression(r, e) {
    return d.evalAst(r.test, e) ? d.evalAst(r.consequent, e) : d.evalAst(r.alternate, e);
  },
  evalIdentifier(r, e) {
    if (Object.hasOwn(e, r.name)) return e[r.name];
    throw ReferenceError(`${r.name} is not defined`);
  },
  evalLiteral(r) {
    return r.value;
  },
  evalMemberExpression(r, e) {
    const t = String(r.computed ? d.evalAst(r.property) : r.property.name), i = d.evalAst(r.object, e);
    if (i == null) throw TypeError(`Cannot read properties of ${i} (reading '${t}')`);
    if (!Object.hasOwn(i, t) && X.has(t)) throw TypeError(`Cannot read properties of ${i} (reading '${t}')`);
    const n = i[t];
    return typeof n == "function" ? n.bind(i) : n;
  },
  evalUnaryExpression(r, e) {
    return {
      "-": (t) => -d.evalAst(t, e),
      "!": (t) => !d.evalAst(t, e),
      "~": (t) => ~d.evalAst(t, e),
      "+": (t) => +d.evalAst(t, e),
      typeof: (t) => typeof d.evalAst(t, e)
    }[r.operator](r.argument);
  },
  evalArrayExpression(r, e) {
    return r.elements.map((t) => d.evalAst(t, e));
  },
  evalCallExpression(r, e) {
    const t = r.arguments.map((i) => d.evalAst(i, e));
    return d.evalAst(r.callee, e)(...t);
  },
  evalAssignmentExpression(r, e) {
    if (r.left.type !== "Identifier") throw SyntaxError("Invalid left-hand side in assignment");
    const t = r.left.name;
    return e[t] = d.evalAst(r.right, e), e[t];
  }
}, H = class {
  constructor(r) {
    this.code = r, this.ast = O(this.code);
  }
  runInNewContext(r) {
    const e = Object.assign(/* @__PURE__ */ Object.create(null), r);
    return d.evalAst(this.ast, e);
  }
};
function A(r, e) {
  return r = r.slice(), r.push(e), r;
}
function v(r, e) {
  return e = e.slice(), e.unshift(r), e;
}
var F = class extends Error {
  constructor(r) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = r, this.name = "NewError";
  }
};
function p(r, e, t, i, n) {
  if (!(this instanceof p)) try {
    return new p(r, e, t, i, n);
  } catch (a) {
    if (!a.avoidNew) throw a;
    return a.value;
  }
  typeof r == "string" && (n = i, i = t, t = e, e = r, r = null);
  const o = r && typeof r == "object";
  if (r = r || {}, this.json = r.json || t, this.path = r.path || e, this.resultType = r.resultType || "value", this.flatten = r.flatten || !1, this.wrap = Object.hasOwn(r, "wrap") ? r.wrap : !0, this.sandbox = r.sandbox || {}, this.eval = r.eval === void 0 ? "safe" : r.eval, this.ignoreEvalErrors = typeof r.ignoreEvalErrors > "u" ? !1 : r.ignoreEvalErrors, this.parent = r.parent || null, this.parentProperty = r.parentProperty || null, this.callback = r.callback || i || null, this.otherTypeCallback = r.otherTypeCallback || n || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, r.autostart !== !1) {
    const a = { path: o ? r.path : e };
    o ? "json" in r && (a.json = r.json) : a.json = t;
    const u = this.evaluate(a);
    if (!u || typeof u != "object") throw new F(u);
    return u;
  }
}
p.prototype.evaluate = function(r, e, t, i) {
  let n = this.parent, o = this.parentProperty, { flatten: a, wrap: u } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, t = t || this.callback, this.currOtherTypeCallback = i || this.otherTypeCallback, e = e || this.json, r = r || this.path, r && typeof r == "object" && !Array.isArray(r)) {
    if (!r.path && r.path !== "") throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(r, "json")) throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({ json: e } = r), a = Object.hasOwn(r, "flatten") ? r.flatten : a, this.currResultType = Object.hasOwn(r, "resultType") ? r.resultType : this.currResultType, this.currSandbox = Object.hasOwn(r, "sandbox") ? r.sandbox : this.currSandbox, u = Object.hasOwn(r, "wrap") ? r.wrap : u, this.currEval = Object.hasOwn(r, "eval") ? r.eval : this.currEval, t = Object.hasOwn(r, "callback") ? r.callback : t, this.currOtherTypeCallback = Object.hasOwn(r, "otherTypeCallback") ? r.otherTypeCallback : this.currOtherTypeCallback, n = Object.hasOwn(r, "parent") ? r.parent : n, o = Object.hasOwn(r, "parentProperty") ? r.parentProperty : o, r = r.path;
  }
  if (n = n || null, o = o || null, Array.isArray(r) && (r = p.toPathString(r)), !r && r !== "" || !e) return;
  const h = p.toPathArray(r);
  h[0] === "$" && h.length > 1 && h.shift(), this._hasParentSelector = null;
  const l = this._trace(h, e, ["$"], n, o, t).filter(function(f) {
    return f && !f.isParentSelector;
  });
  return l.length ? !u && l.length === 1 && !l[0].hasArrExpr ? this._getPreferredOutput(l[0]) : l.reduce((f, E) => {
    const y = this._getPreferredOutput(E);
    return a && Array.isArray(y) ? f = f.concat(y) : f.push(y), f;
  }, []) : u ? [] : void 0;
};
p.prototype._getPreferredOutput = function(r) {
  const e = this.currResultType;
  switch (e) {
    case "all": {
      const t = Array.isArray(r.path) ? r.path : p.toPathArray(r.path);
      return r.pointer = p.toPointer(t), r.path = typeof r.path == "string" ? r.path : p.toPathString(r.path), r;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return r[e];
    case "path":
      return p.toPathString(r[e]);
    case "pointer":
      return p.toPointer(r.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
p.prototype._handleCallback = function(r, e, t) {
  if (e) {
    const i = this._getPreferredOutput(r);
    r.path = typeof r.path == "string" ? r.path : p.toPathString(r.path), e(i, t, r);
  }
};
p.prototype._trace = function(r, e, t, i, n, o, a, u) {
  let h;
  if (!r.length)
    return h = {
      path: t,
      value: e,
      parent: i,
      parentProperty: n,
      hasArrExpr: a
    }, this._handleCallback(h, o, "value"), h;
  const l = r[0], f = r.slice(1), E = [];
  function y(c) {
    Array.isArray(c) ? c.forEach((g) => {
      E.push(g);
    }) : E.push(c);
  }
  if ((typeof l != "string" || u) && e && Object.hasOwn(e, l)) y(this._trace(f, e[l], A(t, l), e, l, o, a));
  else if (l === "*") this._walk(e, (c) => {
    y(this._trace(f, e[c], A(t, c), e, c, o, !0, !0));
  });
  else if (l === "..")
    y(this._trace(f, e, t, i, n, o, a)), this._walk(e, (c) => {
      typeof e[c] == "object" && y(this._trace(r.slice(), e[c], A(t, c), e, c, o, !0));
    });
  else {
    if (l === "^")
      return this._hasParentSelector = !0, {
        path: t.slice(0, -1),
        expr: f,
        isParentSelector: !0
      };
    if (l === "~")
      return h = {
        path: A(t, l),
        value: n,
        parent: i,
        parentProperty: null
      }, this._handleCallback(h, o, "property"), h;
    if (l === "$") y(this._trace(f, e, t, null, null, o, a));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(l)) y(this._slice(l, f, e, t, i, n, o));
    else if (l.indexOf("?(") === 0) {
      if (this.currEval === !1) throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const c = l.replace(/^\?\((.*?)\)$/u, "$1"), g = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(c);
      g ? this._walk(e, (b) => {
        const P = [g[2]], w = g[1] ? e[b][g[1]] : e[b];
        this._trace(P, w, t, i, n, o, !0).length > 0 && y(this._trace(f, e[b], A(t, b), e, b, o, !0));
      }) : this._walk(e, (b) => {
        this._eval(c, e[b], b, t, i, n) && y(this._trace(f, e[b], A(t, b), e, b, o, !0));
      });
    } else if (l[0] === "(") {
      if (this.currEval === !1) throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      y(this._trace(v(this._eval(l, e, t.at(-1), t.slice(0, -1), i, n), f), e, t, i, n, o, a));
    } else if (l[0] === "@") {
      let c = !1;
      const g = l.slice(1, -2);
      switch (g) {
        case "scalar":
          (!e || !["object", "function"].includes(typeof e)) && (c = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof e === g && (c = !0);
          break;
        case "integer":
          Number.isFinite(e) && !(e % 1) && (c = !0);
          break;
        case "number":
          Number.isFinite(e) && (c = !0);
          break;
        case "nonFinite":
          typeof e == "number" && !Number.isFinite(e) && (c = !0);
          break;
        case "object":
          e && typeof e === g && (c = !0);
          break;
        case "array":
          Array.isArray(e) && (c = !0);
          break;
        case "other":
          c = this.currOtherTypeCallback(e, t, i, n);
          break;
        case "null":
          e === null && (c = !0);
          break;
        /* c8 ignore next 2 */
        default:
          throw new TypeError("Unknown value type " + g);
      }
      if (c)
        return h = {
          path: t,
          value: e,
          parent: i,
          parentProperty: n
        }, this._handleCallback(h, o, "value"), h;
    } else if (l[0] === "`" && e && Object.hasOwn(e, l.slice(1))) {
      const c = l.slice(1);
      y(this._trace(f, e[c], A(t, c), e, c, o, a, !0));
    } else if (l.includes(",")) {
      const c = l.split(",");
      for (const g of c) y(this._trace(v(g, f), e, t, i, n, o, !0));
    } else !u && e && Object.hasOwn(e, l) && y(this._trace(f, e[l], A(t, l), e, l, o, a, !0));
  }
  if (this._hasParentSelector) for (let c = 0; c < E.length; c++) {
    const g = E[c];
    if (g && g.isParentSelector) {
      const b = this._trace(g.expr, e, g.path, i, n, o, a);
      if (Array.isArray(b)) {
        E[c] = b[0];
        const P = b.length;
        for (let w = 1; w < P; w++)
          c++, E.splice(c, 0, b[w]);
      } else E[c] = b;
    }
  }
  return E;
};
p.prototype._walk = function(r, e) {
  if (Array.isArray(r)) {
    const t = r.length;
    for (let i = 0; i < t; i++) e(i);
  } else r && typeof r == "object" && Object.keys(r).forEach((t) => {
    e(t);
  });
};
p.prototype._slice = function(r, e, t, i, n, o, a) {
  if (!Array.isArray(t)) return;
  const u = t.length, h = r.split(":"), l = h[2] && Number.parseInt(h[2]) || 1;
  let f = h[0] && Number.parseInt(h[0]) || 0, E = h[1] && Number.parseInt(h[1]) || u;
  f = f < 0 ? Math.max(0, f + u) : Math.min(u, f), E = E < 0 ? Math.max(0, E + u) : Math.min(u, E);
  const y = [];
  for (let c = f; c < E; c += l) this._trace(v(c, e), t, i, n, o, a, !0).forEach((g) => {
    y.push(g);
  });
  return y;
};
p.prototype._eval = function(r, e, t, i, n, o) {
  this.currSandbox._$_parentProperty = o, this.currSandbox._$_parent = n, this.currSandbox._$_property = t, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const a = r.includes("@path");
  a && (this.currSandbox._$_path = p.toPathString(i.concat([t])));
  const u = this.currEval + "Script:" + r;
  if (!p.cache[u]) {
    let h = r.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (a && (h = h.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) p.cache[u] = new this.safeVm.Script(h);
    else if (this.currEval === "native") p.cache[u] = new this.vm.Script(h);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const l = this.currEval;
      p.cache[u] = new l(h);
    } else if (typeof this.currEval == "function") p.cache[u] = { runInNewContext: (l) => this.currEval(h, l) };
    else throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return p.cache[u].runInNewContext(this.currSandbox);
  } catch (h) {
    if (this.ignoreEvalErrors) return !1;
    throw new Error("jsonPath: " + h.message + ": " + r);
  }
};
p.cache = {};
p.toPathString = function(r) {
  const e = r, t = e.length;
  let i = "$";
  for (let n = 1; n < t; n++) /^(~|\^|@.*?\(\))$/u.test(e[n]) || (i += /^[0-9*]+$/u.test(e[n]) ? "[" + e[n] + "]" : "['" + e[n] + "']");
  return i;
};
p.toPointer = function(r) {
  const e = r, t = e.length;
  let i = "";
  for (let n = 1; n < t; n++) /^(~|\^|@.*?\(\))$/u.test(e[n]) || (i += "/" + e[n].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return i;
};
p.toPathArray = function(r) {
  const { cache: e } = p;
  if (e[r]) return e[r].concat();
  const t = [];
  return e[r] = r.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(i, n) {
    return "[#" + (t.push(n) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(i, n) {
    return "['" + n.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(i, n) {
    return ";" + n.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(i) {
    const n = i.match(/#(\d+)/u);
    return !n || !n[1] ? i : t[n[1]];
  }), e[r].concat();
};
p.prototype.safeVm = { Script: H };
var Q = function(r, e, t) {
  const i = r.length;
  for (let n = 0; n < i; n++) {
    const o = r[n];
    t(o) && e.push(r.splice(n--, 1)[0]);
  }
}, Y = class {
  constructor(r) {
    this.code = r;
  }
  runInNewContext(r) {
    let e = this.code;
    const t = Object.keys(r), i = [];
    Q(t, i, (u) => typeof r[u] == "function");
    const n = t.map((u) => r[u]);
    e = i.reduce((u, h) => {
      let l = r[h].toString();
      return /function/u.test(l) || (l = "function " + l), "var " + h + "=" + l + ";" + u;
    }, "") + e, !/(['"])use strict\1/u.test(e) && !t.includes("arguments") && (e = "var arguments = undefined;" + e), e = e.replace(/;\s*$/u, "");
    const o = e.lastIndexOf(";"), a = o !== -1 ? e.slice(0, o + 1) + " return " + e.slice(o + 1) : " return " + e;
    return new Function(...t, a)(...n);
  }
};
p.prototype.vm = { Script: Y };
var S = R("JSONPathSearch");
function _(r, e) {
  if (!r || !e) return [];
  try {
    const t = $(e);
    return (p({
      path: t,
      json: r,
      resultType: "all"
    }) || []).map((i) => ({
      path: i.path || "",
      value: i.value
    }));
  } catch {
    return [];
  }
}
function W(r, e) {
  if (!e || !r) return r || {};
  const t = T(e);
  if (S.debug("[jsonpath-search] search:", e, "isJsonPath:", t), t) {
    const n = q(r, e);
    return S.debug("[jsonpath-search] JSONPath result:", n), n;
  }
  const i = L(r, e);
  return S.debug("[jsonpath-search] key match result:", i), i;
}
function q(r, e) {
  const t = _(r, e);
  if (t.length === 0) return {};
  if (t.length === 1) {
    const { path: n, value: o } = t[0];
    return n === "$" && typeof o == "object" && o !== null || typeof o == "object" && o !== null && !Array.isArray(o) ? o : { [k(n)]: o };
  }
  const i = {};
  for (const { path: n, value: o } of t) {
    const a = k(n) || `result_${Object.keys(i).length}`;
    a in i ? i[`${a}_${Object.keys(i).length}`] = o : i[a] = o;
  }
  return i;
}
function k(r) {
  if (!r) return "";
  const e = r.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e) return e[1];
  const t = r.match(/\.([^.[\]]+)$/);
  return t ? t[1] : r.replace(/^\$\.?/, "");
}
function Z(r, e) {
  if (!e || r === null || r === void 0) return !e;
  if (T(e)) return _(r, e).length > 0;
  const t = e.toLowerCase();
  return JSON.stringify(r).toLowerCase().includes(t);
}
function ee(r, e) {
  if (!(!r || !e))
    try {
      const t = _(r, e);
      return t.length > 0 ? t[0].value : void 0;
    } catch {
      return;
    }
}
function I(r, e = 5, t = "") {
  const i = [];
  if (e <= 0 || r === null || r === void 0) return i;
  if (Array.isArray(r))
    r.slice(0, 10).forEach((n, o) => {
      const a = t ? `${t}[${o}]` : `[${o}]`;
      i.push(a), i.push(...I(n, e - 1, a));
    }), r.length > 10 && i.push(t ? `${t}[...]` : "[...]");
  else if (typeof r == "object") for (const [n, o] of Object.entries(r)) {
    const a = t ? `${t}.${n}` : n;
    i.push(a), i.push(...I(o, e - 1, a));
  }
  return i;
}
export {
  L as filterByKeyMatch,
  W as filterObjectBySearch,
  I as getAllPaths,
  ee as getByPath,
  T as isJsonPathExpression,
  $ as normalizeToJsonPath,
  Z as objectMatchesSearch,
  _ as searchWithJsonPath
};

//# sourceMappingURL=jsonpath-search.js.map