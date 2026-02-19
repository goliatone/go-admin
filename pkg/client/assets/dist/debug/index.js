import { D as q, p as S, e as m, r as X, c as x, g as k, a as z, b as Y, d as G, f as V, h as W, i as Z, j as J, k as ee, l as te, m as se, n as L, o as re, q as ie, s as ne, t as O, u as ae, v as T, w as oe, x as H } from "../chunks/builtin-panels-CwxWfNxv.js";
import { J as Ue, K as Ke, R as He, I as Qe, y as Xe, E as ze, H as Ye, z as Ge, G as Ve, C as We, L as Ze, A as Je, B as et, F as tt } from "../chunks/builtin-panels-CwxWfNxv.js";
import { DebugReplPanel as le } from "./repl.js";
class ce {
  /**
   * @callback HookCallback
   * @this {*|Jsep} this
   * @param {Jsep} env
   * @returns: void
   */
  /**
   * Adds the given callback to the list of callbacks for the given hook.
   *
   * The callback will be invoked when the hook it is registered for is run.
   *
   * One callback function can be registered to multiple hooks and the same hook multiple times.
   *
   * @param {string|object} name The name of the hook, or an object of callbacks keyed by name
   * @param {HookCallback|boolean} callback The callback function which is given environment variables.
   * @param {?boolean} [first=false] Will add the hook to the top of the list (defaults to the bottom)
   * @public
   */
  add(e, t, r) {
    if (typeof arguments[0] != "string")
      for (let s in arguments[0])
        this.add(s, arguments[0][s], arguments[1]);
    else
      (Array.isArray(e) ? e : [e]).forEach(function(s) {
        this[s] = this[s] || [], t && this[s][r ? "unshift" : "push"](t);
      }, this);
  }
  /**
   * Runs a hook invoking all registered callbacks with the given environment variables.
   *
   * Callbacks will be invoked synchronously and in the order in which they were registered.
   *
   * @param {string} name The name of the hook.
   * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
   * @public
   */
  run(e, t) {
    this[e] = this[e] || [], this[e].forEach(function(r) {
      r.call(t && t.context ? t.context : t, t);
    });
  }
}
class he {
  constructor(e) {
    this.jsep = e, this.registered = {};
  }
  /**
   * @callback PluginSetup
   * @this {Jsep} jsep
   * @returns: void
   */
  /**
   * Adds the given plugin(s) to the registry
   *
   * @param {object} plugins
   * @param {string} plugins.name The name of the plugin
   * @param {PluginSetup} plugins.init The init function
   * @public
   */
  register() {
    for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
      t[r] = arguments[r];
    t.forEach((s) => {
      if (typeof s != "object" || !s.name || !s.init)
        throw new Error("Invalid JSEP plugin format");
      this.registered[s.name] || (s.init(this.jsep), this.registered[s.name] = s);
    });
  }
}
class o {
  /**
   * @returns {string}
   */
  static get version() {
    return "1.4.0";
  }
  /**
   * @returns {string}
   */
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + o.version;
  }
  // ==================== CONFIG ================================
  /**
   * @method addUnaryOp
   * @param {string} op_name The name of the unary op to add
   * @returns {Jsep}
   */
  static addUnaryOp(e) {
    return o.max_unop_len = Math.max(e.length, o.max_unop_len), o.unary_ops[e] = 1, o;
  }
  /**
   * @method jsep.addBinaryOp
   * @param {string} op_name The name of the binary op to add
   * @param {number} precedence The precedence of the binary op (can be a float). Higher number = higher precedence
   * @param {boolean} [isRightAssociative=false] whether operator is right-associative
   * @returns {Jsep}
   */
  static addBinaryOp(e, t, r) {
    return o.max_binop_len = Math.max(e.length, o.max_binop_len), o.binary_ops[e] = t, r ? o.right_associative.add(e) : o.right_associative.delete(e), o;
  }
  /**
   * @method addIdentifierChar
   * @param {string} char The additional character to treat as a valid part of an identifier
   * @returns {Jsep}
   */
  static addIdentifierChar(e) {
    return o.additional_identifier_chars.add(e), o;
  }
  /**
   * @method addLiteral
   * @param {string} literal_name The name of the literal to add
   * @param {*} literal_value The value of the literal
   * @returns {Jsep}
   */
  static addLiteral(e, t) {
    return o.literals[e] = t, o;
  }
  /**
   * @method removeUnaryOp
   * @param {string} op_name The name of the unary op to remove
   * @returns {Jsep}
   */
  static removeUnaryOp(e) {
    return delete o.unary_ops[e], e.length === o.max_unop_len && (o.max_unop_len = o.getMaxKeyLen(o.unary_ops)), o;
  }
  /**
   * @method removeAllUnaryOps
   * @returns {Jsep}
   */
  static removeAllUnaryOps() {
    return o.unary_ops = {}, o.max_unop_len = 0, o;
  }
  /**
   * @method removeIdentifierChar
   * @param {string} char The additional character to stop treating as a valid part of an identifier
   * @returns {Jsep}
   */
  static removeIdentifierChar(e) {
    return o.additional_identifier_chars.delete(e), o;
  }
  /**
   * @method removeBinaryOp
   * @param {string} op_name The name of the binary op to remove
   * @returns {Jsep}
   */
  static removeBinaryOp(e) {
    return delete o.binary_ops[e], e.length === o.max_binop_len && (o.max_binop_len = o.getMaxKeyLen(o.binary_ops)), o.right_associative.delete(e), o;
  }
  /**
   * @method removeAllBinaryOps
   * @returns {Jsep}
   */
  static removeAllBinaryOps() {
    return o.binary_ops = {}, o.max_binop_len = 0, o;
  }
  /**
   * @method removeLiteral
   * @param {string} literal_name The name of the literal to remove
   * @returns {Jsep}
   */
  static removeLiteral(e) {
    return delete o.literals[e], o;
  }
  /**
   * @method removeAllLiterals
   * @returns {Jsep}
   */
  static removeAllLiterals() {
    return o.literals = {}, o;
  }
  // ==================== END CONFIG ============================
  /**
   * @returns {string}
   */
  get char() {
    return this.expr.charAt(this.index);
  }
  /**
   * @returns {number}
   */
  get code() {
    return this.expr.charCodeAt(this.index);
  }
  /**
   * @param {string} expr a string with the passed in express
   * @returns Jsep
   */
  constructor(e) {
    this.expr = e, this.index = 0;
  }
  /**
   * static top-level parser
   * @returns {jsep.Expression}
   */
  static parse(e) {
    return new o(e).parse();
  }
  /**
   * Get the longest key length of any object
   * @param {object} obj
   * @returns {number}
   */
  static getMaxKeyLen(e) {
    return Math.max(0, ...Object.keys(e).map((t) => t.length));
  }
  /**
   * `ch` is a character code in the next three functions
   * @param {number} ch
   * @returns {boolean}
   */
  static isDecimalDigit(e) {
    return e >= 48 && e <= 57;
  }
  /**
   * Returns the precedence of a binary operator or `0` if it isn't a binary operator. Can be float.
   * @param {string} op_val
   * @returns {number}
   */
  static binaryPrecedence(e) {
    return o.binary_ops[e] || 0;
  }
  /**
   * Looks for start of identifier
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierStart(e) {
    return e >= 65 && e <= 90 || // A...Z
    e >= 97 && e <= 122 || // a...z
    e >= 128 && !o.binary_ops[String.fromCharCode(e)] || // any non-ASCII that is not an operator
    o.additional_identifier_chars.has(String.fromCharCode(e));
  }
  /**
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierPart(e) {
    return o.isIdentifierStart(e) || o.isDecimalDigit(e);
  }
  /**
   * throw error at index of the expression
   * @param {string} message
   * @throws
   */
  throwError(e) {
    const t = new Error(e + " at character " + this.index);
    throw t.index = this.index, t.description = e, t;
  }
  /**
   * Run a given hook
   * @param {string} name
   * @param {jsep.Expression|false} [node]
   * @returns {?jsep.Expression}
   */
  runHook(e, t) {
    if (o.hooks[e]) {
      const r = {
        context: this,
        node: t
      };
      return o.hooks.run(e, r), r.node;
    }
    return t;
  }
  /**
   * Runs a given hook until one returns a node
   * @param {string} name
   * @returns {?jsep.Expression}
   */
  searchHook(e) {
    if (o.hooks[e]) {
      const t = {
        context: this
      };
      return o.hooks[e].find(function(r) {
        return r.call(t.context, t), t.node;
      }), t.node;
    }
  }
  /**
   * Push `index` up to the next non-space character
   */
  gobbleSpaces() {
    let e = this.code;
    for (; e === o.SPACE_CODE || e === o.TAB_CODE || e === o.LF_CODE || e === o.CR_CODE; )
      e = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  /**
   * Top-level method to parse all expressions and returns compound or single node
   * @returns {jsep.Expression}
   */
  parse() {
    this.runHook("before-all");
    const e = this.gobbleExpressions(), t = e.length === 1 ? e[0] : {
      type: o.COMPOUND,
      body: e
    };
    return this.runHook("after-all", t);
  }
  /**
   * top-level parser (but can be reused within as well)
   * @param {number} [untilICode]
   * @returns {jsep.Expression[]}
   */
  gobbleExpressions(e) {
    let t = [], r, s;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === o.SEMCOL_CODE || r === o.COMMA_CODE)
        this.index++;
      else if (s = this.gobbleExpression())
        t.push(s);
      else if (this.index < this.expr.length) {
        if (r === e)
          break;
        this.throwError('Unexpected "' + this.char + '"');
      }
    return t;
  }
  /**
   * The main parsing function.
   * @returns {?jsep.Expression}
   */
  gobbleExpression() {
    const e = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    return this.gobbleSpaces(), this.runHook("after-expression", e);
  }
  /**
   * Search for the operation portion of the string (e.g. `+`, `===`)
   * Start by taking the longest possible binary operations (3 characters: `===`, `!==`, `>>>`)
   * and move down from 3 to 2 to 1 character until a matching binary operation is found
   * then, return that binary operation
   * @returns {string|boolean}
   */
  gobbleBinaryOp() {
    this.gobbleSpaces();
    let e = this.expr.substr(this.index, o.max_binop_len), t = e.length;
    for (; t > 0; ) {
      if (o.binary_ops.hasOwnProperty(e) && (!o.isIdentifierStart(this.code) || this.index + e.length < this.expr.length && !o.isIdentifierPart(this.expr.charCodeAt(this.index + e.length))))
        return this.index += t, e;
      e = e.substr(0, --t);
    }
    return !1;
  }
  /**
   * This function is responsible for gobbling an individual expression,
   * e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
   * @returns {?jsep.BinaryExpression}
   */
  gobbleBinaryExpression() {
    let e, t, r, s, n, a, l, c, h;
    if (a = this.gobbleToken(), !a || (t = this.gobbleBinaryOp(), !t))
      return a;
    for (n = {
      value: t,
      prec: o.binaryPrecedence(t),
      right_a: o.right_associative.has(t)
    }, l = this.gobbleToken(), l || this.throwError("Expected expression after " + t), s = [a, n, l]; t = this.gobbleBinaryOp(); ) {
      if (r = o.binaryPrecedence(t), r === 0) {
        this.index -= t.length;
        break;
      }
      n = {
        value: t,
        prec: r,
        right_a: o.right_associative.has(t)
      }, h = t;
      const d = (g) => n.right_a && g.right_a ? r > g.prec : r <= g.prec;
      for (; s.length > 2 && d(s[s.length - 2]); )
        l = s.pop(), t = s.pop().value, a = s.pop(), e = {
          type: o.BINARY_EXP,
          operator: t,
          left: a,
          right: l
        }, s.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + h), s.push(n, e);
    }
    for (c = s.length - 1, e = s[c]; c > 1; )
      e = {
        type: o.BINARY_EXP,
        operator: s[c - 1].value,
        left: s[c - 2],
        right: e
      }, c -= 2;
    return e;
  }
  /**
   * An individual part of a binary expression:
   * e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
   * @returns {boolean|jsep.Expression}
   */
  gobbleToken() {
    let e, t, r, s;
    if (this.gobbleSpaces(), s = this.searchHook("gobble-token"), s)
      return this.runHook("after-token", s);
    if (e = this.code, o.isDecimalDigit(e) || e === o.PERIOD_CODE)
      return this.gobbleNumericLiteral();
    if (e === o.SQUOTE_CODE || e === o.DQUOTE_CODE)
      s = this.gobbleStringLiteral();
    else if (e === o.OBRACK_CODE)
      s = this.gobbleArray();
    else {
      for (t = this.expr.substr(this.index, o.max_unop_len), r = t.length; r > 0; ) {
        if (o.unary_ops.hasOwnProperty(t) && (!o.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !o.isIdentifierPart(this.expr.charCodeAt(this.index + t.length)))) {
          this.index += r;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: o.UNARY_EXP,
            operator: t,
            argument: n,
            prefix: !0
          });
        }
        t = t.substr(0, --r);
      }
      o.isIdentifierStart(e) ? (s = this.gobbleIdentifier(), o.literals.hasOwnProperty(s.name) ? s = {
        type: o.LITERAL,
        value: o.literals[s.name],
        raw: s.name
      } : s.name === o.this_str && (s = {
        type: o.THIS_EXP
      })) : e === o.OPAREN_CODE && (s = this.gobbleGroup());
    }
    return s ? (s = this.gobbleTokenProperty(s), this.runHook("after-token", s)) : this.runHook("after-token", !1);
  }
  /**
   * Gobble properties of of identifiers/strings/arrays/groups.
   * e.g. `foo`, `bar.baz`, `foo['bar'].baz`
   * It also gobbles function calls:
   * e.g. `Math.acos(obj.angle)`
   * @param {jsep.Expression} node
   * @returns {jsep.Expression}
   */
  gobbleTokenProperty(e) {
    this.gobbleSpaces();
    let t = this.code;
    for (; t === o.PERIOD_CODE || t === o.OBRACK_CODE || t === o.OPAREN_CODE || t === o.QUMARK_CODE; ) {
      let r;
      if (t === o.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== o.PERIOD_CODE)
          break;
        r = !0, this.index += 2, this.gobbleSpaces(), t = this.code;
      }
      this.index++, t === o.OBRACK_CODE ? (e = {
        type: o.MEMBER_EXP,
        computed: !0,
        object: e,
        property: this.gobbleExpression()
      }, e.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), t = this.code, t !== o.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : t === o.OPAREN_CODE ? e = {
        type: o.CALL_EXP,
        arguments: this.gobbleArguments(o.CPAREN_CODE),
        callee: e
      } : (t === o.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), e = {
        type: o.MEMBER_EXP,
        computed: !1,
        object: e,
        property: this.gobbleIdentifier()
      }), r && (e.optional = !0), this.gobbleSpaces(), t = this.code;
    }
    return e;
  }
  /**
   * Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
   * keep track of everything in the numeric literal and then calling `parseFloat` on that string
   * @returns {jsep.Literal}
   */
  gobbleNumericLiteral() {
    let e = "", t, r;
    for (; o.isDecimalDigit(this.code); )
      e += this.expr.charAt(this.index++);
    if (this.code === o.PERIOD_CODE)
      for (e += this.expr.charAt(this.index++); o.isDecimalDigit(this.code); )
        e += this.expr.charAt(this.index++);
    if (t = this.char, t === "e" || t === "E") {
      for (e += this.expr.charAt(this.index++), t = this.char, (t === "+" || t === "-") && (e += this.expr.charAt(this.index++)); o.isDecimalDigit(this.code); )
        e += this.expr.charAt(this.index++);
      o.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + e + this.char + ")");
    }
    return r = this.code, o.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + e + this.char + ")") : (r === o.PERIOD_CODE || e.length === 1 && e.charCodeAt(0) === o.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: o.LITERAL,
      value: parseFloat(e),
      raw: e
    };
  }
  /**
   * Parses a string literal, staring with single or double quotes with basic support for escape codes
   * e.g. `"hello world"`, `'this is\nJSEP'`
   * @returns {jsep.Literal}
   */
  gobbleStringLiteral() {
    let e = "";
    const t = this.index, r = this.expr.charAt(this.index++);
    let s = !1;
    for (; this.index < this.expr.length; ) {
      let n = this.expr.charAt(this.index++);
      if (n === r) {
        s = !0;
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
      else
        e += n;
    }
    return s || this.throwError('Unclosed quote after "' + e + '"'), {
      type: o.LITERAL,
      value: e,
      raw: this.expr.substring(t, this.index)
    };
  }
  /**
   * Gobbles only identifiers
   * e.g.: `foo`, `_value`, `$x1`
   * Also, this function checks if that identifier is a literal:
   * (e.g. `true`, `false`, `null`) or `this`
   * @returns {jsep.Identifier}
   */
  gobbleIdentifier() {
    let e = this.code, t = this.index;
    for (o.isIdentifierStart(e) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (e = this.code, o.isIdentifierPart(e)); )
      this.index++;
    return {
      type: o.IDENTIFIER,
      name: this.expr.slice(t, this.index)
    };
  }
  /**
   * Gobbles a list of arguments within the context of a function call
   * or array literal. This function also assumes that the opening character
   * `(` or `[` has already been gobbled, and gobbles expressions and commas
   * until the terminator character `)` or `]` is encountered.
   * e.g. `foo(bar, baz)`, `my_func()`, or `[bar, baz]`
   * @param {number} termination
   * @returns {jsep.Expression[]}
   */
  gobbleArguments(e) {
    const t = [];
    let r = !1, s = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === e) {
        r = !0, this.index++, e === o.CPAREN_CODE && s && s >= t.length && this.throwError("Unexpected token " + String.fromCharCode(e));
        break;
      } else if (n === o.COMMA_CODE) {
        if (this.index++, s++, s !== t.length) {
          if (e === o.CPAREN_CODE)
            this.throwError("Unexpected token ,");
          else if (e === o.CBRACK_CODE)
            for (let a = t.length; a < s; a++)
              t.push(null);
        }
      } else if (t.length !== s && s !== 0)
        this.throwError("Expected comma");
      else {
        const a = this.gobbleExpression();
        (!a || a.type === o.COMPOUND) && this.throwError("Expected comma"), t.push(a);
      }
    }
    return r || this.throwError("Expected " + String.fromCharCode(e)), t;
  }
  /**
   * Responsible for parsing a group of things within parentheses `()`
   * that have no identifier in front (so not a function call)
   * This function assumes that it needs to gobble the opening parenthesis
   * and then tries to gobble everything within that parenthesis, assuming
   * that the next thing it should see is the close parenthesis. If not,
   * then the expression probably doesn't have a `)`
   * @returns {boolean|jsep.Expression}
   */
  gobbleGroup() {
    this.index++;
    let e = this.gobbleExpressions(o.CPAREN_CODE);
    if (this.code === o.CPAREN_CODE)
      return this.index++, e.length === 1 ? e[0] : e.length ? {
        type: o.SEQUENCE_EXP,
        expressions: e
      } : !1;
    this.throwError("Unclosed (");
  }
  /**
   * Responsible for parsing Array literals `[1, 2, 3]`
   * This function assumes that it needs to gobble the opening bracket
   * and then tries to gobble the expressions as arguments.
   * @returns {jsep.ArrayExpression}
   */
  gobbleArray() {
    return this.index++, {
      type: o.ARRAY_EXP,
      elements: this.gobbleArguments(o.CBRACK_CODE)
    };
  }
}
const ue = new ce();
Object.assign(o, {
  hooks: ue,
  plugins: new he(o),
  // Node Types
  // ----------
  // This is the full set of types that any JSEP node can be.
  // Store them here to save space when minified
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
  // '.'
  COMMA_CODE: 44,
  // ','
  SQUOTE_CODE: 39,
  // single quote
  DQUOTE_CODE: 34,
  // double quotes
  OPAREN_CODE: 40,
  // (
  CPAREN_CODE: 41,
  // )
  OBRACK_CODE: 91,
  // [
  CBRACK_CODE: 93,
  // ]
  QUMARK_CODE: 63,
  // ?
  SEMCOL_CODE: 59,
  // ;
  COLON_CODE: 58,
  // :
  // Operations
  // ----------
  // Use a quickly-accessible map to store all of the unary operators
  // Values are set to `1` (it really doesn't matter)
  unary_ops: {
    "-": 1,
    "!": 1,
    "~": 1,
    "+": 1
  },
  // Also use a map for the binary operations but set their values to their
  // binary precedence for quick reference (higher number = higher precedence)
  // see [Order of operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
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
  // sets specific binary_ops as right-associative
  right_associative: /* @__PURE__ */ new Set(["**"]),
  // Additional valid identifier chars, apart from a-z, A-Z and 0-9 (except on the starting char)
  additional_identifier_chars: /* @__PURE__ */ new Set(["$", "_"]),
  // Literals
  // ----------
  // Store the values to return for the various literals we may encounter
  literals: {
    true: !0,
    false: !1,
    null: null
  },
  // Except for `this`, which is special. This could be changed to something like `'self'` as well
  this_str: "this"
});
o.max_unop_len = o.getMaxKeyLen(o.unary_ops);
o.max_binop_len = o.getMaxKeyLen(o.binary_ops);
const w = (i) => new o(i).parse(), de = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(o).filter((i) => !de.includes(i) && w[i] === void 0).forEach((i) => {
  w[i] = o[i];
});
w.Jsep = o;
const fe = "ConditionalExpression";
var pe = {
  name: "ternary",
  init(i) {
    i.hooks.add("after-expression", function(t) {
      if (t.node && this.code === i.QUMARK_CODE) {
        this.index++;
        const r = t.node, s = this.gobbleExpression();
        if (s || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === i.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), t.node = {
            type: fe,
            test: r,
            consequent: s,
            alternate: n
          }, r.operator && i.binary_ops[r.operator] <= 0.9) {
            let a = r;
            for (; a.right.operator && i.binary_ops[a.right.operator] <= 0.9; )
              a = a.right;
            t.node.test = a.right, a.right = t.node, t.node = r;
          }
        } else
          this.throwError("Expected :");
      }
    });
  }
};
w.plugins.register(pe);
const F = 47, ge = 92;
var be = {
  name: "regex",
  init(i) {
    i.hooks.add("gobble-token", function(t) {
      if (this.code === F) {
        const r = ++this.index;
        let s = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === F && !s) {
            const n = this.expr.slice(r, this.index);
            let a = "";
            for (; ++this.index < this.expr.length; ) {
              const c = this.code;
              if (c >= 97 && c <= 122 || c >= 65 && c <= 90 || c >= 48 && c <= 57)
                a += this.char;
              else
                break;
            }
            let l;
            try {
              l = new RegExp(n, a);
            } catch (c) {
              this.throwError(c.message);
            }
            return t.node = {
              type: i.LITERAL,
              value: l,
              raw: this.expr.slice(r - 1, this.index)
            }, t.node = this.gobbleTokenProperty(t.node), t.node;
          }
          this.code === i.OBRACK_CODE ? s = !0 : s && this.code === i.CBRACK_CODE && (s = !1), this.index += this.code === ge ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
const _ = 43, ye = 45, P = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [_, ye],
  assignmentPrecedence: 0.9,
  init(i) {
    const e = [i.IDENTIFIER, i.MEMBER_EXP];
    P.assignmentOperators.forEach((r) => i.addBinaryOp(r, P.assignmentPrecedence, !0)), i.hooks.add("gobble-token", function(s) {
      const n = this.code;
      P.updateOperators.some((a) => a === n && a === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, s.node = {
        type: "UpdateExpression",
        operator: n === _ ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!s.node.argument || !e.includes(s.node.argument.type)) && this.throwError(`Unexpected ${s.node.operator}`));
    }), i.hooks.add("after-token", function(s) {
      if (s.node) {
        const n = this.code;
        P.updateOperators.some((a) => a === n && a === this.expr.charCodeAt(this.index + 1)) && (e.includes(s.node.type) || this.throwError(`Unexpected ${s.node.operator}`), this.index += 2, s.node = {
          type: "UpdateExpression",
          operator: n === _ ? "++" : "--",
          argument: s.node,
          prefix: !1
        });
      }
    }), i.hooks.add("after-expression", function(s) {
      s.node && t(s.node);
    });
    function t(r) {
      P.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", t(r.left), t(r.right)) : r.operator || Object.values(r).forEach((s) => {
        s && typeof s == "object" && t(s);
      });
    }
  }
};
w.plugins.register(be, P);
w.addUnaryOp("typeof");
w.addLiteral("null", null);
w.addLiteral("undefined", void 0);
const Ee = /* @__PURE__ */ new Set(["constructor", "__proto__", "__defineGetter__", "__defineSetter__"]), p = {
  /**
   * @param {jsep.Expression} ast
   * @param {Record<string, any>} subs
   */
  evalAst(i, e) {
    switch (i.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return p.evalBinaryExpression(i, e);
      case "Compound":
        return p.evalCompound(i, e);
      case "ConditionalExpression":
        return p.evalConditionalExpression(i, e);
      case "Identifier":
        return p.evalIdentifier(i, e);
      case "Literal":
        return p.evalLiteral(i, e);
      case "MemberExpression":
        return p.evalMemberExpression(i, e);
      case "UnaryExpression":
        return p.evalUnaryExpression(i, e);
      case "ArrayExpression":
        return p.evalArrayExpression(i, e);
      case "CallExpression":
        return p.evalCallExpression(i, e);
      case "AssignmentExpression":
        return p.evalAssignmentExpression(i, e);
      default:
        throw SyntaxError("Unexpected expression", i);
    }
  },
  evalBinaryExpression(i, e) {
    return {
      "||": (r, s) => r || s(),
      "&&": (r, s) => r && s(),
      "|": (r, s) => r | s(),
      "^": (r, s) => r ^ s(),
      "&": (r, s) => r & s(),
      // eslint-disable-next-line eqeqeq -- API
      "==": (r, s) => r == s(),
      // eslint-disable-next-line eqeqeq -- API
      "!=": (r, s) => r != s(),
      "===": (r, s) => r === s(),
      "!==": (r, s) => r !== s(),
      "<": (r, s) => r < s(),
      ">": (r, s) => r > s(),
      "<=": (r, s) => r <= s(),
      ">=": (r, s) => r >= s(),
      "<<": (r, s) => r << s(),
      ">>": (r, s) => r >> s(),
      ">>>": (r, s) => r >>> s(),
      "+": (r, s) => r + s(),
      "-": (r, s) => r - s(),
      "*": (r, s) => r * s(),
      "/": (r, s) => r / s(),
      "%": (r, s) => r % s()
    }[i.operator](p.evalAst(i.left, e), () => p.evalAst(i.right, e));
  },
  evalCompound(i, e) {
    let t;
    for (let r = 0; r < i.body.length; r++) {
      i.body[r].type === "Identifier" && ["var", "let", "const"].includes(i.body[r].name) && i.body[r + 1] && i.body[r + 1].type === "AssignmentExpression" && (r += 1);
      const s = i.body[r];
      t = p.evalAst(s, e);
    }
    return t;
  },
  evalConditionalExpression(i, e) {
    return p.evalAst(i.test, e) ? p.evalAst(i.consequent, e) : p.evalAst(i.alternate, e);
  },
  evalIdentifier(i, e) {
    if (Object.hasOwn(e, i.name))
      return e[i.name];
    throw ReferenceError(`${i.name} is not defined`);
  },
  evalLiteral(i) {
    return i.value;
  },
  evalMemberExpression(i, e) {
    const t = String(
      // NOTE: `String(value)` throws error when
      // value has overwritten the toString method to return non-string
      // i.e. `value = {toString: () => []}`
      i.computed ? p.evalAst(i.property) : i.property.name
      // `object.property` property is Identifier
    ), r = p.evalAst(i.object, e);
    if (r == null)
      throw TypeError(`Cannot read properties of ${r} (reading '${t}')`);
    if (!Object.hasOwn(r, t) && Ee.has(t))
      throw TypeError(`Cannot read properties of ${r} (reading '${t}')`);
    const s = r[t];
    return typeof s == "function" ? s.bind(r) : s;
  },
  evalUnaryExpression(i, e) {
    return {
      "-": (r) => -p.evalAst(r, e),
      "!": (r) => !p.evalAst(r, e),
      "~": (r) => ~p.evalAst(r, e),
      // eslint-disable-next-line no-implicit-coercion -- API
      "+": (r) => +p.evalAst(r, e),
      typeof: (r) => typeof p.evalAst(r, e)
    }[i.operator](i.argument);
  },
  evalArrayExpression(i, e) {
    return i.elements.map((t) => p.evalAst(t, e));
  },
  evalCallExpression(i, e) {
    const t = i.arguments.map((s) => p.evalAst(s, e));
    return p.evalAst(i.callee, e)(...t);
  },
  evalAssignmentExpression(i, e) {
    if (i.left.type !== "Identifier")
      throw SyntaxError("Invalid left-hand side in assignment");
    const t = i.left.name, r = p.evalAst(i.right, e);
    return e[t] = r, e[t];
  }
};
class me {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(e) {
    this.code = e, this.ast = w(this.code);
  }
  /**
   * @param {object} context Object whose items will be added
   *   to evaluation
   * @returns {EvaluatedResult} Result of evaluated code
   */
  runInNewContext(e) {
    const t = Object.assign(/* @__PURE__ */ Object.create(null), e);
    return p.evalAst(this.ast, t);
  }
}
function C(i, e) {
  return i = i.slice(), i.push(e), i;
}
function $(i, e) {
  return e = e.slice(), e.unshift(i), e;
}
class Se extends Error {
  /**
   * @param {AnyResult} value The evaluated scalar value
   */
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
}
function f(i, e, t, r, s) {
  if (!(this instanceof f))
    try {
      return new f(i, e, t, r, s);
    } catch (a) {
      if (!a.avoidNew)
        throw a;
      return a.value;
    }
  typeof i == "string" && (s = r, r = t, t = e, e = i, i = null);
  const n = i && typeof i == "object";
  if (i = i || {}, this.json = i.json || t, this.path = i.path || e, this.resultType = i.resultType || "value", this.flatten = i.flatten || !1, this.wrap = Object.hasOwn(i, "wrap") ? i.wrap : !0, this.sandbox = i.sandbox || {}, this.eval = i.eval === void 0 ? "safe" : i.eval, this.ignoreEvalErrors = typeof i.ignoreEvalErrors > "u" ? !1 : i.ignoreEvalErrors, this.parent = i.parent || null, this.parentProperty = i.parentProperty || null, this.callback = i.callback || r || null, this.otherTypeCallback = i.otherTypeCallback || s || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, i.autostart !== !1) {
    const a = {
      path: n ? i.path : e
    };
    n ? "json" in i && (a.json = i.json) : a.json = t;
    const l = this.evaluate(a);
    if (!l || typeof l != "object")
      throw new Se(l);
    return l;
  }
}
f.prototype.evaluate = function(i, e, t, r) {
  let s = this.parent, n = this.parentProperty, {
    flatten: a,
    wrap: l
  } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, t = t || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, e = e || this.json, i = i || this.path, i && typeof i == "object" && !Array.isArray(i)) {
    if (!i.path && i.path !== "")
      throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(i, "json"))
      throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({
      json: e
    } = i), a = Object.hasOwn(i, "flatten") ? i.flatten : a, this.currResultType = Object.hasOwn(i, "resultType") ? i.resultType : this.currResultType, this.currSandbox = Object.hasOwn(i, "sandbox") ? i.sandbox : this.currSandbox, l = Object.hasOwn(i, "wrap") ? i.wrap : l, this.currEval = Object.hasOwn(i, "eval") ? i.eval : this.currEval, t = Object.hasOwn(i, "callback") ? i.callback : t, this.currOtherTypeCallback = Object.hasOwn(i, "otherTypeCallback") ? i.otherTypeCallback : this.currOtherTypeCallback, s = Object.hasOwn(i, "parent") ? i.parent : s, n = Object.hasOwn(i, "parentProperty") ? i.parentProperty : n, i = i.path;
  }
  if (s = s || null, n = n || null, Array.isArray(i) && (i = f.toPathString(i)), !i && i !== "" || !e)
    return;
  const c = f.toPathArray(i);
  c[0] === "$" && c.length > 1 && c.shift(), this._hasParentSelector = null;
  const h = this._trace(c, e, ["$"], s, n, t).filter(function(d) {
    return d && !d.isParentSelector;
  });
  return h.length ? !l && h.length === 1 && !h[0].hasArrExpr ? this._getPreferredOutput(h[0]) : h.reduce((d, g) => {
    const b = this._getPreferredOutput(g);
    return a && Array.isArray(b) ? d = d.concat(b) : d.push(b), d;
  }, []) : l ? [] : void 0;
};
f.prototype._getPreferredOutput = function(i) {
  const e = this.currResultType;
  switch (e) {
    case "all": {
      const t = Array.isArray(i.path) ? i.path : f.toPathArray(i.path);
      return i.pointer = f.toPointer(t), i.path = typeof i.path == "string" ? i.path : f.toPathString(i.path), i;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return i[e];
    case "path":
      return f.toPathString(i[e]);
    case "pointer":
      return f.toPointer(i.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
f.prototype._handleCallback = function(i, e, t) {
  if (e) {
    const r = this._getPreferredOutput(i);
    i.path = typeof i.path == "string" ? i.path : f.toPathString(i.path), e(r, t, i);
  }
};
f.prototype._trace = function(i, e, t, r, s, n, a, l) {
  let c;
  if (!i.length)
    return c = {
      path: t,
      value: e,
      parent: r,
      parentProperty: s,
      hasArrExpr: a
    }, this._handleCallback(c, n, "value"), c;
  const h = i[0], d = i.slice(1), g = [];
  function b(u) {
    Array.isArray(u) ? u.forEach((y) => {
      g.push(y);
    }) : g.push(u);
  }
  if ((typeof h != "string" || l) && e && Object.hasOwn(e, h))
    b(this._trace(d, e[h], C(t, h), e, h, n, a));
  else if (h === "*")
    this._walk(e, (u) => {
      b(this._trace(d, e[u], C(t, u), e, u, n, !0, !0));
    });
  else if (h === "..")
    b(this._trace(d, e, t, r, s, n, a)), this._walk(e, (u) => {
      typeof e[u] == "object" && b(this._trace(i.slice(), e[u], C(t, u), e, u, n, !0));
    });
  else {
    if (h === "^")
      return this._hasParentSelector = !0, {
        path: t.slice(0, -1),
        expr: d,
        isParentSelector: !0
      };
    if (h === "~")
      return c = {
        path: C(t, h),
        value: s,
        parent: r,
        parentProperty: null
      }, this._handleCallback(c, n, "property"), c;
    if (h === "$")
      b(this._trace(d, e, t, null, null, n, a));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(h))
      b(this._slice(h, d, e, t, r, s, n));
    else if (h.indexOf("?(") === 0) {
      if (this.currEval === !1)
        throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = h.replace(/^\?\((.*?)\)$/u, "$1"), y = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      y ? this._walk(e, (E) => {
        const v = [y[2]], A = y[1] ? e[E][y[1]] : e[E];
        this._trace(v, A, t, r, s, n, !0).length > 0 && b(this._trace(d, e[E], C(t, E), e, E, n, !0));
      }) : this._walk(e, (E) => {
        this._eval(u, e[E], E, t, r, s) && b(this._trace(d, e[E], C(t, E), e, E, n, !0));
      });
    } else if (h[0] === "(") {
      if (this.currEval === !1)
        throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      b(this._trace($(this._eval(h, e, t.at(-1), t.slice(0, -1), r, s), d), e, t, r, s, n, a));
    } else if (h[0] === "@") {
      let u = !1;
      const y = h.slice(1, -2);
      switch (y) {
        case "scalar":
          (!e || !["object", "function"].includes(typeof e)) && (u = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof e === y && (u = !0);
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
          e && typeof e === y && (u = !0);
          break;
        case "array":
          Array.isArray(e) && (u = !0);
          break;
        case "other":
          u = this.currOtherTypeCallback(e, t, r, s);
          break;
        case "null":
          e === null && (u = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + y);
      }
      if (u)
        return c = {
          path: t,
          value: e,
          parent: r,
          parentProperty: s
        }, this._handleCallback(c, n, "value"), c;
    } else if (h[0] === "`" && e && Object.hasOwn(e, h.slice(1))) {
      const u = h.slice(1);
      b(this._trace(d, e[u], C(t, u), e, u, n, a, !0));
    } else if (h.includes(",")) {
      const u = h.split(",");
      for (const y of u)
        b(this._trace($(y, d), e, t, r, s, n, !0));
    } else !l && e && Object.hasOwn(e, h) && b(this._trace(d, e[h], C(t, h), e, h, n, a, !0));
  }
  if (this._hasParentSelector)
    for (let u = 0; u < g.length; u++) {
      const y = g[u];
      if (y && y.isParentSelector) {
        const E = this._trace(y.expr, e, y.path, r, s, n, a);
        if (Array.isArray(E)) {
          g[u] = E[0];
          const v = E.length;
          for (let A = 1; A < v; A++)
            u++, g.splice(u, 0, E[A]);
        } else
          g[u] = E;
      }
    }
  return g;
};
f.prototype._walk = function(i, e) {
  if (Array.isArray(i)) {
    const t = i.length;
    for (let r = 0; r < t; r++)
      e(r);
  } else i && typeof i == "object" && Object.keys(i).forEach((t) => {
    e(t);
  });
};
f.prototype._slice = function(i, e, t, r, s, n, a) {
  if (!Array.isArray(t))
    return;
  const l = t.length, c = i.split(":"), h = c[2] && Number.parseInt(c[2]) || 1;
  let d = c[0] && Number.parseInt(c[0]) || 0, g = c[1] && Number.parseInt(c[1]) || l;
  d = d < 0 ? Math.max(0, d + l) : Math.min(l, d), g = g < 0 ? Math.max(0, g + l) : Math.min(l, g);
  const b = [];
  for (let u = d; u < g; u += h)
    this._trace($(u, e), t, r, s, n, a, !0).forEach((E) => {
      b.push(E);
    });
  return b;
};
f.prototype._eval = function(i, e, t, r, s, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = s, this.currSandbox._$_property = t, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const a = i.includes("@path");
  a && (this.currSandbox._$_path = f.toPathString(r.concat([t])));
  const l = this.currEval + "Script:" + i;
  if (!f.cache[l]) {
    let c = i.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (a && (c = c.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0)
      f.cache[l] = new this.safeVm.Script(c);
    else if (this.currEval === "native")
      f.cache[l] = new this.vm.Script(c);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const h = this.currEval;
      f.cache[l] = new h(c);
    } else if (typeof this.currEval == "function")
      f.cache[l] = {
        runInNewContext: (h) => this.currEval(c, h)
      };
    else
      throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return f.cache[l].runInNewContext(this.currSandbox);
  } catch (c) {
    if (this.ignoreEvalErrors)
      return !1;
    throw new Error("jsonPath: " + c.message + ": " + i);
  }
};
f.cache = {};
f.toPathString = function(i) {
  const e = i, t = e.length;
  let r = "$";
  for (let s = 1; s < t; s++)
    /^(~|\^|@.*?\(\))$/u.test(e[s]) || (r += /^[0-9*]+$/u.test(e[s]) ? "[" + e[s] + "]" : "['" + e[s] + "']");
  return r;
};
f.toPointer = function(i) {
  const e = i, t = e.length;
  let r = "";
  for (let s = 1; s < t; s++)
    /^(~|\^|@.*?\(\))$/u.test(e[s]) || (r += "/" + e[s].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
f.toPathArray = function(i) {
  const {
    cache: e
  } = f;
  if (e[i])
    return e[i].concat();
  const t = [], s = i.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(n, a) {
    return "[#" + (t.push(a) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(n, a) {
    return "['" + a.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(n, a) {
    return ";" + a.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(n) {
    const a = n.match(/#(\d+)/u);
    return !a || !a[1] ? n : t[a[1]];
  });
  return e[i] = s, e[i].concat();
};
f.prototype.safeVm = {
  Script: me
};
const we = function(i, e, t) {
  const r = i.length;
  for (let s = 0; s < r; s++) {
    const n = i[s];
    t(n) && e.push(i.splice(s--, 1)[0]);
  }
};
class xe {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(e) {
    this.code = e;
  }
  /**
   * @param {object} context Object whose items will be added
   *   to evaluation
   * @returns {EvaluatedResult} Result of evaluated code
   */
  runInNewContext(e) {
    let t = this.code;
    const r = Object.keys(e), s = [];
    we(r, s, (h) => typeof e[h] == "function");
    const n = r.map((h) => e[h]);
    t = s.reduce((h, d) => {
      let g = e[d].toString();
      return /function/u.test(g) || (g = "function " + g), "var " + d + "=" + g + ";" + h;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !r.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const l = t.lastIndexOf(";"), c = l !== -1 ? t.slice(0, l + 1) + " return " + t.slice(l + 1) : " return " + t;
    return new Function(...r, c)(...n);
  }
}
f.prototype.vm = {
  Script: xe
};
function Ce(i) {
  return i ? !!(i.startsWith("$") || /\[\d+\]/.test(i) || /\[['"]/.test(i) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(i) || i.includes("..") || i.includes("*")) : !1;
}
function Ae(i) {
  return i ? i.startsWith("$") ? i : `$.${i}` : "$";
}
function Pe(i, e) {
  if (!i || !e) return [];
  try {
    const t = Ae(e);
    return (f({
      path: t,
      json: i,
      resultType: "all"
    }) || []).map((s) => ({
      path: s.path || "",
      value: s.value
    }));
  } catch {
    return [];
  }
}
function ve(i, e) {
  if (!e || !i)
    return i || {};
  const t = Ce(e);
  if (console.log("[jsonpath-search] search:", e, "isJsonPath:", t), t) {
    const s = Te(i, e);
    return console.log("[jsonpath-search] JSONPath result:", s), s;
  }
  const r = Oe(i, e);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function Oe(i, e) {
  const t = e.toLowerCase(), r = {};
  for (const [s, n] of Object.entries(i || {}))
    s.toLowerCase().includes(t) && (r[s] = n);
  return r;
}
function Te(i, e) {
  const t = Pe(i, e);
  if (t.length === 0)
    return {};
  if (t.length === 1) {
    const { path: s, value: n } = t[0];
    return s === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [N(s)]: n };
  }
  const r = {};
  for (const { path: s, value: n } of t) {
    const a = N(s) || `result_${Object.keys(r).length}`;
    a in r ? r[`${a}_${Object.keys(r).length}`] = n : r[a] = n;
  }
  return r;
}
function N(i) {
  if (!i) return "";
  const e = i.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e)
    return e[1];
  const t = i.match(/\.([^.[\]]+)$/);
  return t ? t[1] : i.replace(/^\$\.?/, "");
}
const Le = () => {
  const i = S.getSortedIds();
  return i.length > 0 ? i : ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"];
}, Q = /* @__PURE__ */ new Set(["shell", "console"]), ke = (i) => S.has(i) || Q.has(i), M = {
  shell: "Shell",
  console: "Console"
}, j = (i) => {
  if (M[i])
    return M[i];
  const e = S.get(i);
  return e ? e.label : i ? i.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "";
}, _e = (i) => {
  if (i === "sessions")
    return [];
  const e = S.get(i);
  return e ? H(e) : [i];
}, B = () => {
  const i = {};
  for (const e of S.list())
    for (const t of H(e))
      i[t] = e.id;
  return i;
}, U = (i) => {
  if (!i)
    return null;
  try {
    return JSON.parse(i);
  } catch {
    return null;
  }
}, De = (i) => {
  if (!Array.isArray(i))
    return [];
  const e = [];
  return i.forEach((t) => {
    if (!t || typeof t != "object")
      return;
    const r = t, s = typeof r.command == "string" ? r.command.trim() : "";
    if (!s)
      return;
    const n = typeof r.description == "string" ? r.description.trim() : "", a = Array.isArray(r.tags) ? r.tags.filter((h) => typeof h == "string" && h.trim() !== "").map((h) => h.trim()) : [], l = Array.isArray(r.aliases) ? r.aliases.filter((h) => typeof h == "string" && h.trim() !== "").map((h) => h.trim()) : [], c = typeof r.mutates == "boolean" ? r.mutates : typeof r.read_only == "boolean" ? !r.read_only : !1;
    e.push({
      command: s,
      description: n || void 0,
      tags: a.length > 0 ? a : void 0,
      aliases: l.length > 0 ? l : void 0,
      mutates: c
    });
  }), e;
}, Ie = (i) => Array.isArray(i) && i.length > 0 ? i.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : Le(), D = (i, e) => ve(i, e), $e = (i, e, t) => {
  if (!i || !e)
    return;
  const r = e.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0)
    return;
  let s = i;
  for (let n = 0; n < r.length - 1; n += 1) {
    const a = r[n];
    (!s[a] || typeof s[a] != "object") && (s[a] = {}), s = s[a];
  }
  s[r[r.length - 1]] = t;
}, I = (i, e) => {
  if (!i)
    return e;
  const t = Number(i);
  return Number.isNaN(t) ? e : t;
};
class Re {
  constructor(e) {
    this.customFilterState = {}, this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.container = e;
    const t = U(e.dataset.panels);
    this.panels = Ie(t), this.panels.includes("sessions") || this.panels.push("sessions"), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = I(e.dataset.maxLogEntries, 500), this.maxSQLQueries = I(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = I(e.dataset.slowThresholdMs, 50), this.replCommands = De(U(e.dataset.replCommands)), this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: { data: {}, logs: [] },
      extra: {}
    }, this.filters = {
      requests: { method: "all", status: "all", search: "", newestFirst: !0, hasBody: !1, contentType: "all" },
      sql: { search: "", slowOnly: !1, errorOnly: !1, newestFirst: !0 },
      logs: { level: "all", search: "", autoScroll: !0, newestFirst: !0 },
      routes: { method: "all", search: "" },
      sessions: { search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), Q.forEach((r) => {
      this.panelRenderers.set(r, {
        render: () => this.renderReplPanel(r),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = B(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.updateSessionBanner(), this.stream = new q({
      basePath: this.streamBasePath,
      onEvent: (r) => this.handleEvent(r),
      onStatusChange: (r) => this.updateConnectionStatus(r)
    }), this.unsubscribeRegistry = S.subscribe((r) => this.handleRegistryChange(r)), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  /**
   * Subscribe to WebSocket events for all panels based on registry
   */
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels)
      for (const r of _e(t))
        e.add(r);
    this.stream.subscribe(Array.from(e));
  }
  /**
   * Handle registry changes (panel registered/unregistered)
   */
  handleRegistryChange(e) {
    this.eventToPanel = B(), e.type === "register" ? (this.panels.includes(e.panelId) || this.panels.push(e.panelId), e.panel && e.panel.defaultFilters !== void 0 && !(e.panelId in this.customFilterState) && (this.customFilterState[e.panelId] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && delete this.customFilterState[e.panelId], this.subscribeToEvents(), this.renderTabs(), e.panelId === this.activePanel && this.renderActivePanel();
  }
  requireElement(e, t = this.container) {
    const r = t.querySelector(e);
    if (!r)
      throw new Error(`Missing debug element: ${e}`);
    return r;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (t) => {
      const r = t.target;
      if (!r)
        return;
      const s = r.closest("[data-panel]");
      if (!s)
        return;
      const n = s.dataset.panel || "";
      !n || n === this.activePanel || (this.activePanel = n, this.renderActivePanel());
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
        }
      });
    }), this.panelEl.addEventListener("click", (t) => {
      const r = t.target;
      if (!r)
        return;
      const s = r.closest("[data-doctor-action-run]");
      if (!s || s.disabled)
        return;
      const n = s.dataset.doctorActionRun || "", a = s.dataset.doctorActionConfirm || "", l = s.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(n, a, l);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => `
          <button class="debug-tab ${t === this.activePanel ? "debug-tab--active" : ""}" data-panel="${m(t)}">
            <span class="debug-tab__label">${m(j(t))}</span>
            <span class="debug-tab__count" data-panel-count="${m(t)}">0</span>
          </button>
        `).join("");
    this.tabsEl.innerHTML = e, this.updateTabCounts();
  }
  renderActivePanel() {
    this.renderTabs(), this.renderFilters(), this.renderPanel();
  }
  renderFilters() {
    const e = this.activePanel;
    let t = "";
    const r = this.panelRenderers.get(e);
    if (r?.filters)
      t = r.filters();
    else {
      const s = S.get(e);
      if (s?.showFilters === !1) {
        this.filtersEl.innerHTML = '<span class="timestamp">No filters</span>';
        return;
      }
      if (s?.renderFilters) {
        const n = this.getPanelFilterState(e, s), a = s.renderFilters(n);
        this.filtersEl.innerHTML = a || '<span class="timestamp">No filters</span>', a && this.bindFilterInputs();
        return;
      }
    }
    if (!r?.filters && e === "requests") {
      const s = this.filters.requests, n = this.getUniqueContentTypes();
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], s.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(["all", "200", "201", "204", "400", "401", "403", "404", "500"], s.status)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Content-Type</label>
          <select data-filter="contentType">
            ${this.renderSelectOptions(["all", ...n], s.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="hasBody" ${s.hasBody ? "checked" : ""} />
          <span>Has Body</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!r?.filters && e === "sql") {
      const s = this.filters.sql;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${s.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${s.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!r?.filters && e === "logs") {
      const s = this.filters.logs;
      t = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], s.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${s.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (!r?.filters && e === "routes") {
      const s = this.filters.routes;
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], s.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!r?.filters && e === "sessions") {
      const s = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!r?.filters) {
      const s = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="user.roles[0].name" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = t || '<span class="timestamp">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((t) => {
      t.addEventListener("input", () => this.updateFiltersFromInputs()), t.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), r = S.get(e);
    if (r?.renderFilters) {
      const s = this.getPanelFilterState(e, r), n = s && typeof s == "object" && !Array.isArray(s) ? { ...s } : {};
      t.forEach((a) => {
        const l = a.dataset.filter || "";
        if (!l)
          return;
        const c = n[l];
        n[l] = this.readFilterInputValue(a, c);
      }), this.customFilterState[e] = n, this.renderPanel();
      return;
    }
    if (e === "requests") {
      const s = { ...this.filters.requests };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a === "newestFirst" || a === "hasBody" ? s[a] = n.checked : a && a in s && (s[a] = n.value);
      }), this.filters.requests = s;
    } else if (e === "sql") {
      const s = { ...this.filters.sql };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a === "slowOnly" || a === "errorOnly" || a === "newestFirst" ? s[a] = n.checked : a === "search" && (s[a] = n.value);
      }), this.filters.sql = s;
    } else if (e === "logs") {
      const s = { ...this.filters.logs };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a === "autoScroll" || a === "newestFirst" ? s[a] = n.checked : (a === "level" || a === "search") && (s[a] = n.value);
      }), this.filters.logs = s;
    } else if (e === "routes") {
      const s = { ...this.filters.routes };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a && a in s && (s[a] = n.value);
      }), this.filters.routes = s;
    } else if (e === "sessions") {
      const s = { ...this.filters.sessions };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a && a in s && (s[a] = n.value);
      }), this.filters.sessions = s;
    } else {
      const s = { ...this.filters.objects };
      t.forEach((n) => {
        const a = n.dataset.filter || "";
        a && a in s && (s[a] = n.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  getPanelFilterState(e, t) {
    const r = t || S.get(e);
    return r ? (e in this.customFilterState || (this.customFilterState[e] = r.defaultFilters !== void 0 ? this.cloneFilterState(r.defaultFilters) : {}), this.customFilterState[e]) : {};
  }
  cloneFilterState(e) {
    return Array.isArray(e) ? [...e] : e && typeof e == "object" ? { ...e } : e;
  }
  readFilterInputValue(e, t) {
    if (e instanceof HTMLInputElement && e.type === "checkbox")
      return e.checked;
    const r = e.value;
    if (typeof t == "number") {
      const s = Number(r);
      return Number.isNaN(s) ? t : s;
    }
    return typeof t == "boolean" ? r === "true" || r === "1" || r.toLowerCase() === "yes" : r;
  }
  renderPanel() {
    const e = this.activePanel, t = this.panelRenderers.get(e);
    if (t) {
      t.render();
      return;
    }
    this.panelEl.classList.remove("debug-content--repl");
    let r = "";
    if (e === "template")
      r = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search);
    else if (e === "session")
      r = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search);
    else if (e === "config")
      r = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search);
    else if (e === "requests")
      r = this.renderRequests();
    else if (e === "sql")
      r = this.renderSQL();
    else if (e === "logs")
      r = this.renderLogs();
    else if (e === "routes")
      r = this.renderRoutes();
    else if (e === "sessions")
      r = this.renderSessionsPanel();
    else if (e === "custom")
      r = this.renderCustom();
    else if (e === "jserrors")
      r = X(this.state.extra.jserrors || [], x, {
        newestFirst: this.filters.logs.newestFirst,
        showSortToggle: !0
      });
    else {
      const s = S.get(e);
      if (s && (s.renderConsole || s.render)) {
        const n = k(s);
        let a = this.getStateForKey(n);
        if (s.applyFilters) {
          const c = this.getPanelFilterState(e, s);
          a = s.applyFilters(a, c);
        } else if (!s.renderFilters && s.showFilters !== !1) {
          const c = this.filters.objects.search.trim();
          c && a && typeof a == "object" && !Array.isArray(a) && (a = D(a, c));
        }
        r = (s.renderConsole || s.render)(a, x, {
          newestFirst: this.filters.logs.newestFirst
        });
      } else
        r = this.renderJSONPanel(j(e), this.state.extra[e], this.filters.objects.search);
    }
    this.panelEl.innerHTML = r, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && z(this.panelEl, this.expandedRequests), e === "sql" && this.attachSQLSelectionListeners(), e === "sessions" && this.attachSessionActions();
  }
  attachExpandableRowListeners() {
    Y(this.panelEl);
  }
  attachCopyButtonListeners() {
    G(this.panelEl, { useIconFeedback: !0 });
  }
  attachSQLSelectionListeners() {
    V(this.panelEl, this.state.sql, { useIconFeedback: !0 });
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new le({
      kind: e === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: e === "console" ? this.replCommands : []
    }), this.replPanels.set(e, t)), t.attach(this.panelEl);
  }
  getUniqueContentTypes() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.state.requests) {
      const r = t.content_type;
      r && e.add(r.split(";")[0].trim());
    }
    return [...e].sort();
  }
  renderRequests() {
    const { method: e, status: t, search: r, newestFirst: s, hasBody: n, contentType: a } = this.filters.requests, l = r.toLowerCase(), c = this.state.requests.filter((h) => !(e !== "all" && (h.method || "").toUpperCase() !== e || t !== "all" && String(h.status || "") !== t || l && !(h.path || "").toLowerCase().includes(l) || n && !h.request_body || a !== "all" && (h.content_type || "").split(";")[0].trim() !== a));
    return c.length === 0 ? this.renderEmptyState("No requests captured yet.") : W(c, x, {
      newestFirst: s,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      // Console has filter bar, not inline toggle
      truncatePath: !1,
      // Console shows full paths
      expandedRequestIds: this.expandedRequests
    });
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: r, newestFirst: s } = this.filters.sql, n = e.toLowerCase(), a = this.state.sql.filter((l) => !(r && !l.error || t && !this.isSlowQuery(l) || n && !(l.query || "").toLowerCase().includes(n)));
    return a.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : Z(a, x, {
      newestFirst: s,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      // Console has filter bar
      useIconCopyButton: !0
      // Console uses iconoir icons
    });
  }
  renderLogs() {
    const { level: e, search: t, newestFirst: r } = this.filters.logs, s = t.toLowerCase(), n = this.state.logs.filter((a) => {
      if (e !== "all" && (a.level || "").toLowerCase() !== e)
        return !1;
      const l = `${a.message || ""} ${a.source || ""} ${J(a.fields || {})}`.toLowerCase();
      return !(s && !l.includes(s));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : ee(n, x, {
      newestFirst: r,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      // Console has filter bar
      showSource: !0,
      // Console shows source column
      truncateMessage: !1
      // Console shows full messages
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, r = t.toLowerCase(), s = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e)
        return !1;
      const a = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(r && !a.includes(r));
    });
    return s.length === 0 ? this.renderEmptyState("No routes captured yet.") : te(s, x, {
      showName: !0
      // Console shows name column
    });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError)
      return this.renderEmptyState(this.sessionsError);
    const e = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, t = this.filters.sessions.search.trim().toLowerCase();
    let r = [...this.sessions];
    if (t && (r = r.filter((l) => [
      l.username,
      l.user_id,
      l.session_id,
      l.ip,
      l.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), r.sort((l, c) => {
      const h = new Date(l.last_activity || l.started_at || 0).getTime();
      return new Date(c.last_activity || c.started_at || 0).getTime() - h;
    }), this.sessionsLoading && r.length === 0)
      return this.renderEmptyState("Loading sessions...");
    if (r.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const s = r.map((l) => {
      const c = l.session_id || "", h = l.username || l.user_id || "Unknown", d = se(l.last_activity || l.started_at), g = L(l.request_count ?? 0), b = !!c && c === this.activeSessionId, u = b ? "detach" : "attach", y = b ? "Detach" : "Attach", E = b ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", v = b ? "debug-session-row debug-session-row--active" : "debug-session-row", A = l.current_page || "-", R = l.ip || "-";
      return `
          <tr class="${v}">
            <td>
              <div class="debug-session-user">${m(h)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${m(c || "-")}</span>
              </div>
            </td>
            <td>${m(R)}</td>
            <td>
              <span class="debug-session-path">${m(A)}</span>
            </td>
            <td>${m(d || "-")}</td>
            <td>${m(g)}</td>
            <td>
              <button class="${E}" data-session-action="${u}" data-session-id="${m(c)}">
                ${y}
              </button>
            </td>
          </tr>
        `;
    }).join(""), n = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${L(r.length)} active`}</span>
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
          ${s}
        </tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, r = this.state.custom.logs.length > 0;
    return !t && !r ? this.renderEmptyState("No custom data captured yet.") : re(this.state.custom, x, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      dataFilterFn: e ? (s) => D(s, e) : void 0
    });
  }
  renderJSONPanel(e, t, r) {
    const s = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    return s && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !s && !n && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : ie(e, t, x, {
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      filterFn: r ? (l) => D(l, r) : void 0
    });
  }
  attachSessionActions() {
    this.panelEl.querySelectorAll("[data-session-action]").forEach((t) => {
      t.addEventListener("click", () => {
        const r = t.dataset.sessionAction || "", s = t.dataset.sessionId || "";
        switch (r) {
          case "refresh":
            this.fetchSessions(!0);
            break;
          case "attach":
            this.attachSessionByID(s);
            break;
          case "detach":
            this.detachSession();
            break;
        }
      });
    });
  }
  async fetchSessions(e = !1) {
    if (this.debugPath && !this.sessionsLoading && !(!e && this.sessionsLoaded && this.sessionsUpdatedAt && Date.now() - this.sessionsUpdatedAt.getTime() < 3e3)) {
      this.sessionsLoading = !0, this.sessionsError = null;
      try {
        const t = await fetch(`${this.debugPath}/api/sessions`, {
          credentials: "same-origin"
        });
        if (!t.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const r = await t.json();
        if (this.sessions = Array.isArray(r.sessions) ? r.sessions : [], this.sessionsLoaded = !0, this.sessionsUpdatedAt = /* @__PURE__ */ new Date(), this.activeSessionId) {
          const s = this.sessions.find((n) => n.session_id === this.activeSessionId);
          s && (this.activeSession = s, this.updateSessionBanner());
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
    if (!t || this.activeSessionId === t)
      return;
    const r = this.sessions.find((s) => s.session_id === t) || { session_id: t };
    this.attachSession(r);
  }
  attachSession(e) {
    const t = (e.session_id || "").trim();
    t && this.activeSessionId !== t && (this.activeSessionId = t, this.activeSession = e, this.streamBasePath = this.buildSessionStreamPath(t), this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("session"), this.renderPanel());
  }
  detachSession() {
    this.activeSessionId && (this.activeSessionId = null, this.activeSession = null, this.streamBasePath = this.debugPath, this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("global"), this.renderPanel());
  }
  rebuildStream(e) {
    this.stream.close(), this.stream = new q({
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
      custom: { data: {}, logs: [] },
      extra: {}
    }, this.expandedRequests.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
  }
  buildSessionStreamPath(e) {
    const t = this.debugPath.replace(/\/+$/, ""), r = encodeURIComponent(e);
    return t ? `${t}/session/${r}` : "";
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
    const e = this.activeSession || this.sessions.find((r) => r.session_id === this.activeSessionId) || { session_id: this.activeSessionId || void 0 };
    return [
      e.username || e.user_id,
      e.session_id,
      e.ip,
      e.current_page
    ].filter(Boolean).join(" | ");
  }
  panelCount(e) {
    if (e !== "sessions") {
      const t = S.get(e);
      if (t) {
        const r = k(t), s = { [r]: this.getStateForKey(r) };
        return ne(s, t);
      }
    }
    switch (e) {
      case "template":
        return O(this.state.template);
      case "session":
        return O(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return O(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return O(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return O(this.state.extra[e]);
    }
  }
  renderEmptyState(e) {
    return `
      <div class="debug-empty">
        <p>${m(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((r) => {
      const s = r.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${m(r)}" ${s}>${m(r)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), r = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      r && (r.textContent = L(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${L(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(e) {
    if (!e || !e.type)
      return;
    if (e.type === "snapshot") {
      this.applySnapshot(e.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused)
      return;
    const t = this.eventToPanel[e.type] || e.type, r = S.get(t);
    if (r) {
      const s = k(r), n = this.getStateForKey(s), l = (r.handleEvent || ((c, h) => ae(c, h, this.maxLogEntries)))(n, e.payload);
      this.setStateForKey(s, l);
    } else
      switch (e.type) {
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
          ke(t) || (this.state.extra[t] = e.payload);
          break;
      }
    this.updateTabCounts(), t === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        $e(this.state.custom.data, String(e.key), e.value);
        return;
      }
      if (typeof e == "object" && ("category" in e || "message" in e)) {
        this.state.custom.logs.push(e), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  /**
   * Get state data for a snapshot key (used by registry-based event handling)
   */
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
  /**
   * Set state data for a snapshot key (used by registry-based event handling)
   */
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
        this.state.custom = t || { data: {}, logs: [] };
        break;
      default:
        this.state.extra[e] = t;
        break;
    }
  }
  applySnapshot(e) {
    const t = e || {};
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = T(t.requests), this.state.sql = T(t.sql), this.state.logs = T(t.logs), this.state.config = t.config || {}, this.state.routes = T(t.routes);
    const r = t.custom || {};
    this.state.custom = {
      data: r.data || {},
      logs: T(r.logs)
    };
    const s = /* @__PURE__ */ new Set([
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
      !s.has(a) && a in t && (n[a] = t[a]);
    }), this.state.extra = n, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; )
        e.shift();
  }
  isSlowQuery(e) {
    return oe(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.debugPath && !this.activeSessionId)
      try {
        const e = await fetch(`${this.debugPath}/api/snapshot`, {
          credentials: "same-origin"
        });
        if (!e.ok)
          return;
        const t = await e.json();
        this.applySnapshot(t);
      } catch {
      }
  }
  clearAll() {
    this.debugPath && (this.stream.clear(), !this.activeSessionId && fetch(`${this.debugPath}/api/clear`, { method: "POST", credentials: "same-origin" }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath)
      return;
    const e = this.activePanel;
    this.stream.clear([e]), !this.activeSessionId && fetch(`${this.debugPath}/api/clear/${e}`, { method: "POST", credentials: "same-origin" }).catch(() => {
    });
  }
  async parseJSONResponse(e) {
    if (!(e.headers.get("content-type") || "").toLowerCase().includes("application/json"))
      return null;
    try {
      const r = await e.json();
      if (r && typeof r == "object")
        return r;
    } catch {
    }
    return null;
  }
  readResponsePath(e, t) {
    if (!e || !t)
      return;
    const r = t.split(".").map((n) => n.trim()).filter(Boolean);
    if (r.length === 0)
      return;
    let s = e;
    for (const n of r) {
      if (!s || typeof s != "object")
        return;
      s = s[n];
    }
    return s;
  }
  responseMessage(e, t) {
    for (const r of t) {
      const s = this.readResponsePath(e, r);
      if (typeof s == "string" && s.trim())
        return s.trim();
    }
    return "";
  }
  showDoctorActionToast(e, t) {
    const r = e.trim();
    if (!r)
      return;
    window.getComputedStyle(this.container).position === "static" && (this.container.style.position = "relative");
    let s = this.container.querySelector("[data-debug-toast-host]");
    s || (s = document.createElement("div"), s.dataset.debugToastHost = "true", s.style.position = "absolute", s.style.right = "12px", s.style.bottom = "12px", s.style.display = "flex", s.style.flexDirection = "column", s.style.gap = "8px", s.style.pointerEvents = "none", s.style.zIndex = "1000", this.container.appendChild(s));
    const n = t === "success" ? { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.45)", color: "#bbf7d0" } : { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.45)", color: "#fecaca" }, a = document.createElement("div");
    a.style.maxWidth = "380px", a.style.padding = "10px 12px", a.style.borderRadius = "8px", a.style.border = `1px solid ${n.border}`, a.style.background = n.bg, a.style.color = n.color, a.style.fontSize = "12px", a.style.lineHeight = "1.4", a.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.25)", a.style.pointerEvents = "auto", a.textContent = r, s.appendChild(a), window.setTimeout(() => {
      a.remove(), s && s.childElementCount === 0 && s.remove();
    }, 4200);
  }
  async runDoctorAction(e, t = "", r = !1) {
    if (!this.debugPath || this.activeSessionId)
      return;
    const s = e.trim();
    if (!s)
      return;
    const n = t.trim();
    if (r || !!n) {
      const l = n || "Are you sure you want to run this doctor action?";
      if (!window.confirm(l))
        return;
    }
    try {
      const l = await fetch(`${this.debugPath}/api/doctor/${encodeURIComponent(s)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: "{}"
      }), c = await this.parseJSONResponse(l);
      if (!l.ok) {
        const d = this.responseMessage(c, ["error.message", "message", "result.message"]) || `Doctor action failed (${l.status})`;
        this.showDoctorActionToast(d, "error");
        return;
      }
      const h = this.responseMessage(c, ["message", "result.message"]) || "Doctor action completed.";
      this.showDoctorActionToast(h, "success");
    } catch {
      this.showDoctorActionToast("Doctor action failed: unable to reach debug API.", "error");
    } finally {
      this.stream.requestSnapshot();
    }
  }
  togglePause(e) {
    this.paused = !this.paused, e.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}
const qe = (i) => {
  const e = i || document.querySelector("[data-debug-console]");
  return e ? new Re(e) : null;
}, K = () => {
  qe();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", K) : K();
export {
  Ue as DATA_ATTRS,
  Re as DebugPanel,
  q as DebugStream,
  Ke as INTERACTION_CLASSES,
  He as RemoteDebugStream,
  G as attachCopyListeners,
  Y as attachExpandableRowListeners,
  x as consoleStyles,
  Qe as copyToClipboard,
  O as countPayload,
  Xe as defaultGetCount,
  ae as defaultHandleEvent,
  m as escapeHTML,
  ze as formatDuration,
  J as formatJSON,
  L as formatNumber,
  se as formatTimestamp,
  Ye as getLevelClass,
  ne as getPanelCount,
  Ge as getPanelData,
  k as getSnapshotKey,
  Ve as getStatusClass,
  We as getStyleConfig,
  qe as initDebugPanel,
  oe as isSlowDuration,
  H as normalizeEventTypes,
  S as panelRegistry,
  re as renderCustomPanel,
  ie as renderJSONPanel,
  Ze as renderJSONViewer,
  ee as renderLogsPanel,
  Je as renderPanelContent,
  W as renderRequestsPanel,
  te as renderRoutesPanel,
  Z as renderSQLPanel,
  et as toolbarStyles,
  tt as truncate
};
//# sourceMappingURL=index.js.map
