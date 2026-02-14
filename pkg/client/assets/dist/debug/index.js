import { D as q, p as S, e as m, r as X, c as x, g as k, a as z, b as Y, d as G, f as V, h as Z, i as W, j as J, k as ee, l as te, m as se, n as T, o as re, q as ie, s as ne, t as v, u as ae, v as L, w as oe, x as H } from "../chunks/builtin-panels-BrE08f6x.js";
import { J as Ue, K as Ke, R as He, I as Qe, y as Xe, E as ze, H as Ye, z as Ge, G as Ve, C as Ze, L as We, A as Je, B as et, F as tt } from "../chunks/builtin-panels-BrE08f6x.js";
import { DebugReplPanel as le } from "./repl.js";
class he {
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
  add(e, t, s) {
    if (typeof arguments[0] != "string")
      for (let r in arguments[0])
        this.add(r, arguments[0][r], arguments[1]);
    else
      (Array.isArray(e) ? e : [e]).forEach(function(r) {
        this[r] = this[r] || [], t && this[r][s ? "unshift" : "push"](t);
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
    this[e] = this[e] || [], this[e].forEach(function(s) {
      s.call(t && t.context ? t.context : t, t);
    });
  }
}
class ce {
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
    for (var e = arguments.length, t = new Array(e), s = 0; s < e; s++)
      t[s] = arguments[s];
    t.forEach((r) => {
      if (typeof r != "object" || !r.name || !r.init)
        throw new Error("Invalid JSEP plugin format");
      this.registered[r.name] || (r.init(this.jsep), this.registered[r.name] = r);
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
  static addBinaryOp(e, t, s) {
    return o.max_binop_len = Math.max(e.length, o.max_binop_len), o.binary_ops[e] = t, s ? o.right_associative.add(e) : o.right_associative.delete(e), o;
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
      const s = {
        context: this,
        node: t
      };
      return o.hooks.run(e, s), s.node;
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
      return o.hooks[e].find(function(s) {
        return s.call(t.context, t), t.node;
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
    let t = [], s, r;
    for (; this.index < this.expr.length; )
      if (s = this.code, s === o.SEMCOL_CODE || s === o.COMMA_CODE)
        this.index++;
      else if (r = this.gobbleExpression())
        t.push(r);
      else if (this.index < this.expr.length) {
        if (s === e)
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
    let e, t, s, r, n, a, l, h, c;
    if (a = this.gobbleToken(), !a || (t = this.gobbleBinaryOp(), !t))
      return a;
    for (n = {
      value: t,
      prec: o.binaryPrecedence(t),
      right_a: o.right_associative.has(t)
    }, l = this.gobbleToken(), l || this.throwError("Expected expression after " + t), r = [a, n, l]; t = this.gobbleBinaryOp(); ) {
      if (s = o.binaryPrecedence(t), s === 0) {
        this.index -= t.length;
        break;
      }
      n = {
        value: t,
        prec: s,
        right_a: o.right_associative.has(t)
      }, c = t;
      const d = (g) => n.right_a && g.right_a ? s > g.prec : s <= g.prec;
      for (; r.length > 2 && d(r[r.length - 2]); )
        l = r.pop(), t = r.pop().value, a = r.pop(), e = {
          type: o.BINARY_EXP,
          operator: t,
          left: a,
          right: l
        }, r.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + c), r.push(n, e);
    }
    for (h = r.length - 1, e = r[h]; h > 1; )
      e = {
        type: o.BINARY_EXP,
        operator: r[h - 1].value,
        left: r[h - 2],
        right: e
      }, h -= 2;
    return e;
  }
  /**
   * An individual part of a binary expression:
   * e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
   * @returns {boolean|jsep.Expression}
   */
  gobbleToken() {
    let e, t, s, r;
    if (this.gobbleSpaces(), r = this.searchHook("gobble-token"), r)
      return this.runHook("after-token", r);
    if (e = this.code, o.isDecimalDigit(e) || e === o.PERIOD_CODE)
      return this.gobbleNumericLiteral();
    if (e === o.SQUOTE_CODE || e === o.DQUOTE_CODE)
      r = this.gobbleStringLiteral();
    else if (e === o.OBRACK_CODE)
      r = this.gobbleArray();
    else {
      for (t = this.expr.substr(this.index, o.max_unop_len), s = t.length; s > 0; ) {
        if (o.unary_ops.hasOwnProperty(t) && (!o.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !o.isIdentifierPart(this.expr.charCodeAt(this.index + t.length)))) {
          this.index += s;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: o.UNARY_EXP,
            operator: t,
            argument: n,
            prefix: !0
          });
        }
        t = t.substr(0, --s);
      }
      o.isIdentifierStart(e) ? (r = this.gobbleIdentifier(), o.literals.hasOwnProperty(r.name) ? r = {
        type: o.LITERAL,
        value: o.literals[r.name],
        raw: r.name
      } : r.name === o.this_str && (r = {
        type: o.THIS_EXP
      })) : e === o.OPAREN_CODE && (r = this.gobbleGroup());
    }
    return r ? (r = this.gobbleTokenProperty(r), this.runHook("after-token", r)) : this.runHook("after-token", !1);
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
      let s;
      if (t === o.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== o.PERIOD_CODE)
          break;
        s = !0, this.index += 2, this.gobbleSpaces(), t = this.code;
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
      } : (t === o.PERIOD_CODE || s) && (s && this.index--, this.gobbleSpaces(), e = {
        type: o.MEMBER_EXP,
        computed: !1,
        object: e,
        property: this.gobbleIdentifier()
      }), s && (e.optional = !0), this.gobbleSpaces(), t = this.code;
    }
    return e;
  }
  /**
   * Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
   * keep track of everything in the numeric literal and then calling `parseFloat` on that string
   * @returns {jsep.Literal}
   */
  gobbleNumericLiteral() {
    let e = "", t, s;
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
    return s = this.code, o.isIdentifierStart(s) ? this.throwError("Variable names cannot start with a number (" + e + this.char + ")") : (s === o.PERIOD_CODE || e.length === 1 && e.charCodeAt(0) === o.PERIOD_CODE) && this.throwError("Unexpected period"), {
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
    const t = this.index, s = this.expr.charAt(this.index++);
    let r = !1;
    for (; this.index < this.expr.length; ) {
      let n = this.expr.charAt(this.index++);
      if (n === s) {
        r = !0;
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
    return r || this.throwError('Unclosed quote after "' + e + '"'), {
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
    let s = !1, r = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === e) {
        s = !0, this.index++, e === o.CPAREN_CODE && r && r >= t.length && this.throwError("Unexpected token " + String.fromCharCode(e));
        break;
      } else if (n === o.COMMA_CODE) {
        if (this.index++, r++, r !== t.length) {
          if (e === o.CPAREN_CODE)
            this.throwError("Unexpected token ,");
          else if (e === o.CBRACK_CODE)
            for (let a = t.length; a < r; a++)
              t.push(null);
        }
      } else if (t.length !== r && r !== 0)
        this.throwError("Expected comma");
      else {
        const a = this.gobbleExpression();
        (!a || a.type === o.COMPOUND) && this.throwError("Expected comma"), t.push(a);
      }
    }
    return s || this.throwError("Expected " + String.fromCharCode(e)), t;
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
const ue = new he();
Object.assign(o, {
  hooks: ue,
  plugins: new ce(o),
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
        const s = t.node, r = this.gobbleExpression();
        if (r || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === i.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), t.node = {
            type: fe,
            test: s,
            consequent: r,
            alternate: n
          }, s.operator && i.binary_ops[s.operator] <= 0.9) {
            let a = s;
            for (; a.right.operator && i.binary_ops[a.right.operator] <= 0.9; )
              a = a.right;
            t.node.test = a.right, a.right = t.node, t.node = s;
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
        const s = ++this.index;
        let r = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === F && !r) {
            const n = this.expr.slice(s, this.index);
            let a = "";
            for (; ++this.index < this.expr.length; ) {
              const h = this.code;
              if (h >= 97 && h <= 122 || h >= 65 && h <= 90 || h >= 48 && h <= 57)
                a += this.char;
              else
                break;
            }
            let l;
            try {
              l = new RegExp(n, a);
            } catch (h) {
              this.throwError(h.message);
            }
            return t.node = {
              type: i.LITERAL,
              value: l,
              raw: this.expr.slice(s - 1, this.index)
            }, t.node = this.gobbleTokenProperty(t.node), t.node;
          }
          this.code === i.OBRACK_CODE ? r = !0 : r && this.code === i.CBRACK_CODE && (r = !1), this.index += this.code === ge ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
const _ = 43, ye = 45, A = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [_, ye],
  assignmentPrecedence: 0.9,
  init(i) {
    const e = [i.IDENTIFIER, i.MEMBER_EXP];
    A.assignmentOperators.forEach((s) => i.addBinaryOp(s, A.assignmentPrecedence, !0)), i.hooks.add("gobble-token", function(r) {
      const n = this.code;
      A.updateOperators.some((a) => a === n && a === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, r.node = {
        type: "UpdateExpression",
        operator: n === _ ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!r.node.argument || !e.includes(r.node.argument.type)) && this.throwError(`Unexpected ${r.node.operator}`));
    }), i.hooks.add("after-token", function(r) {
      if (r.node) {
        const n = this.code;
        A.updateOperators.some((a) => a === n && a === this.expr.charCodeAt(this.index + 1)) && (e.includes(r.node.type) || this.throwError(`Unexpected ${r.node.operator}`), this.index += 2, r.node = {
          type: "UpdateExpression",
          operator: n === _ ? "++" : "--",
          argument: r.node,
          prefix: !1
        });
      }
    }), i.hooks.add("after-expression", function(r) {
      r.node && t(r.node);
    });
    function t(s) {
      A.assignmentOperators.has(s.operator) ? (s.type = "AssignmentExpression", t(s.left), t(s.right)) : s.operator || Object.values(s).forEach((r) => {
        r && typeof r == "object" && t(r);
      });
    }
  }
};
w.plugins.register(be, A);
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
      "||": (s, r) => s || r(),
      "&&": (s, r) => s && r(),
      "|": (s, r) => s | r(),
      "^": (s, r) => s ^ r(),
      "&": (s, r) => s & r(),
      // eslint-disable-next-line eqeqeq -- API
      "==": (s, r) => s == r(),
      // eslint-disable-next-line eqeqeq -- API
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
    }[i.operator](p.evalAst(i.left, e), () => p.evalAst(i.right, e));
  },
  evalCompound(i, e) {
    let t;
    for (let s = 0; s < i.body.length; s++) {
      i.body[s].type === "Identifier" && ["var", "let", "const"].includes(i.body[s].name) && i.body[s + 1] && i.body[s + 1].type === "AssignmentExpression" && (s += 1);
      const r = i.body[s];
      t = p.evalAst(r, e);
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
    ), s = p.evalAst(i.object, e);
    if (s == null)
      throw TypeError(`Cannot read properties of ${s} (reading '${t}')`);
    if (!Object.hasOwn(s, t) && Ee.has(t))
      throw TypeError(`Cannot read properties of ${s} (reading '${t}')`);
    const r = s[t];
    return typeof r == "function" ? r.bind(s) : r;
  },
  evalUnaryExpression(i, e) {
    return {
      "-": (s) => -p.evalAst(s, e),
      "!": (s) => !p.evalAst(s, e),
      "~": (s) => ~p.evalAst(s, e),
      // eslint-disable-next-line no-implicit-coercion -- API
      "+": (s) => +p.evalAst(s, e),
      typeof: (s) => typeof p.evalAst(s, e)
    }[i.operator](i.argument);
  },
  evalArrayExpression(i, e) {
    return i.elements.map((t) => p.evalAst(t, e));
  },
  evalCallExpression(i, e) {
    const t = i.arguments.map((r) => p.evalAst(r, e));
    return p.evalAst(i.callee, e)(...t);
  },
  evalAssignmentExpression(i, e) {
    if (i.left.type !== "Identifier")
      throw SyntaxError("Invalid left-hand side in assignment");
    const t = i.left.name, s = p.evalAst(i.right, e);
    return e[t] = s, e[t];
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
function f(i, e, t, s, r) {
  if (!(this instanceof f))
    try {
      return new f(i, e, t, s, r);
    } catch (a) {
      if (!a.avoidNew)
        throw a;
      return a.value;
    }
  typeof i == "string" && (r = s, s = t, t = e, e = i, i = null);
  const n = i && typeof i == "object";
  if (i = i || {}, this.json = i.json || t, this.path = i.path || e, this.resultType = i.resultType || "value", this.flatten = i.flatten || !1, this.wrap = Object.hasOwn(i, "wrap") ? i.wrap : !0, this.sandbox = i.sandbox || {}, this.eval = i.eval === void 0 ? "safe" : i.eval, this.ignoreEvalErrors = typeof i.ignoreEvalErrors > "u" ? !1 : i.ignoreEvalErrors, this.parent = i.parent || null, this.parentProperty = i.parentProperty || null, this.callback = i.callback || s || null, this.otherTypeCallback = i.otherTypeCallback || r || function() {
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
f.prototype.evaluate = function(i, e, t, s) {
  let r = this.parent, n = this.parentProperty, {
    flatten: a,
    wrap: l
  } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, t = t || this.callback, this.currOtherTypeCallback = s || this.otherTypeCallback, e = e || this.json, i = i || this.path, i && typeof i == "object" && !Array.isArray(i)) {
    if (!i.path && i.path !== "")
      throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(i, "json"))
      throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({
      json: e
    } = i), a = Object.hasOwn(i, "flatten") ? i.flatten : a, this.currResultType = Object.hasOwn(i, "resultType") ? i.resultType : this.currResultType, this.currSandbox = Object.hasOwn(i, "sandbox") ? i.sandbox : this.currSandbox, l = Object.hasOwn(i, "wrap") ? i.wrap : l, this.currEval = Object.hasOwn(i, "eval") ? i.eval : this.currEval, t = Object.hasOwn(i, "callback") ? i.callback : t, this.currOtherTypeCallback = Object.hasOwn(i, "otherTypeCallback") ? i.otherTypeCallback : this.currOtherTypeCallback, r = Object.hasOwn(i, "parent") ? i.parent : r, n = Object.hasOwn(i, "parentProperty") ? i.parentProperty : n, i = i.path;
  }
  if (r = r || null, n = n || null, Array.isArray(i) && (i = f.toPathString(i)), !i && i !== "" || !e)
    return;
  const h = f.toPathArray(i);
  h[0] === "$" && h.length > 1 && h.shift(), this._hasParentSelector = null;
  const c = this._trace(h, e, ["$"], r, n, t).filter(function(d) {
    return d && !d.isParentSelector;
  });
  return c.length ? !l && c.length === 1 && !c[0].hasArrExpr ? this._getPreferredOutput(c[0]) : c.reduce((d, g) => {
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
    const s = this._getPreferredOutput(i);
    i.path = typeof i.path == "string" ? i.path : f.toPathString(i.path), e(s, t, i);
  }
};
f.prototype._trace = function(i, e, t, s, r, n, a, l) {
  let h;
  if (!i.length)
    return h = {
      path: t,
      value: e,
      parent: s,
      parentProperty: r,
      hasArrExpr: a
    }, this._handleCallback(h, n, "value"), h;
  const c = i[0], d = i.slice(1), g = [];
  function b(u) {
    Array.isArray(u) ? u.forEach((y) => {
      g.push(y);
    }) : g.push(u);
  }
  if ((typeof c != "string" || l) && e && Object.hasOwn(e, c))
    b(this._trace(d, e[c], C(t, c), e, c, n, a));
  else if (c === "*")
    this._walk(e, (u) => {
      b(this._trace(d, e[u], C(t, u), e, u, n, !0, !0));
    });
  else if (c === "..")
    b(this._trace(d, e, t, s, r, n, a)), this._walk(e, (u) => {
      typeof e[u] == "object" && b(this._trace(i.slice(), e[u], C(t, u), e, u, n, !0));
    });
  else {
    if (c === "^")
      return this._hasParentSelector = !0, {
        path: t.slice(0, -1),
        expr: d,
        isParentSelector: !0
      };
    if (c === "~")
      return h = {
        path: C(t, c),
        value: r,
        parent: s,
        parentProperty: null
      }, this._handleCallback(h, n, "property"), h;
    if (c === "$")
      b(this._trace(d, e, t, null, null, n, a));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(c))
      b(this._slice(c, d, e, t, s, r, n));
    else if (c.indexOf("?(") === 0) {
      if (this.currEval === !1)
        throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = c.replace(/^\?\((.*?)\)$/u, "$1"), y = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      y ? this._walk(e, (E) => {
        const O = [y[2]], P = y[1] ? e[E][y[1]] : e[E];
        this._trace(O, P, t, s, r, n, !0).length > 0 && b(this._trace(d, e[E], C(t, E), e, E, n, !0));
      }) : this._walk(e, (E) => {
        this._eval(u, e[E], E, t, s, r) && b(this._trace(d, e[E], C(t, E), e, E, n, !0));
      });
    } else if (c[0] === "(") {
      if (this.currEval === !1)
        throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      b(this._trace($(this._eval(c, e, t.at(-1), t.slice(0, -1), s, r), d), e, t, s, r, n, a));
    } else if (c[0] === "@") {
      let u = !1;
      const y = c.slice(1, -2);
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
          u = this.currOtherTypeCallback(e, t, s, r);
          break;
        case "null":
          e === null && (u = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + y);
      }
      if (u)
        return h = {
          path: t,
          value: e,
          parent: s,
          parentProperty: r
        }, this._handleCallback(h, n, "value"), h;
    } else if (c[0] === "`" && e && Object.hasOwn(e, c.slice(1))) {
      const u = c.slice(1);
      b(this._trace(d, e[u], C(t, u), e, u, n, a, !0));
    } else if (c.includes(",")) {
      const u = c.split(",");
      for (const y of u)
        b(this._trace($(y, d), e, t, s, r, n, !0));
    } else !l && e && Object.hasOwn(e, c) && b(this._trace(d, e[c], C(t, c), e, c, n, a, !0));
  }
  if (this._hasParentSelector)
    for (let u = 0; u < g.length; u++) {
      const y = g[u];
      if (y && y.isParentSelector) {
        const E = this._trace(y.expr, e, y.path, s, r, n, a);
        if (Array.isArray(E)) {
          g[u] = E[0];
          const O = E.length;
          for (let P = 1; P < O; P++)
            u++, g.splice(u, 0, E[P]);
        } else
          g[u] = E;
      }
    }
  return g;
};
f.prototype._walk = function(i, e) {
  if (Array.isArray(i)) {
    const t = i.length;
    for (let s = 0; s < t; s++)
      e(s);
  } else i && typeof i == "object" && Object.keys(i).forEach((t) => {
    e(t);
  });
};
f.prototype._slice = function(i, e, t, s, r, n, a) {
  if (!Array.isArray(t))
    return;
  const l = t.length, h = i.split(":"), c = h[2] && Number.parseInt(h[2]) || 1;
  let d = h[0] && Number.parseInt(h[0]) || 0, g = h[1] && Number.parseInt(h[1]) || l;
  d = d < 0 ? Math.max(0, d + l) : Math.min(l, d), g = g < 0 ? Math.max(0, g + l) : Math.min(l, g);
  const b = [];
  for (let u = d; u < g; u += c)
    this._trace($(u, e), t, s, r, n, a, !0).forEach((E) => {
      b.push(E);
    });
  return b;
};
f.prototype._eval = function(i, e, t, s, r, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = r, this.currSandbox._$_property = t, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const a = i.includes("@path");
  a && (this.currSandbox._$_path = f.toPathString(s.concat([t])));
  const l = this.currEval + "Script:" + i;
  if (!f.cache[l]) {
    let h = i.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (a && (h = h.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0)
      f.cache[l] = new this.safeVm.Script(h);
    else if (this.currEval === "native")
      f.cache[l] = new this.vm.Script(h);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const c = this.currEval;
      f.cache[l] = new c(h);
    } else if (typeof this.currEval == "function")
      f.cache[l] = {
        runInNewContext: (c) => this.currEval(h, c)
      };
    else
      throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return f.cache[l].runInNewContext(this.currSandbox);
  } catch (h) {
    if (this.ignoreEvalErrors)
      return !1;
    throw new Error("jsonPath: " + h.message + ": " + i);
  }
};
f.cache = {};
f.toPathString = function(i) {
  const e = i, t = e.length;
  let s = "$";
  for (let r = 1; r < t; r++)
    /^(~|\^|@.*?\(\))$/u.test(e[r]) || (s += /^[0-9*]+$/u.test(e[r]) ? "[" + e[r] + "]" : "['" + e[r] + "']");
  return s;
};
f.toPointer = function(i) {
  const e = i, t = e.length;
  let s = "";
  for (let r = 1; r < t; r++)
    /^(~|\^|@.*?\(\))$/u.test(e[r]) || (s += "/" + e[r].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return s;
};
f.toPathArray = function(i) {
  const {
    cache: e
  } = f;
  if (e[i])
    return e[i].concat();
  const t = [], r = i.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(n, a) {
    return "[#" + (t.push(a) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(n, a) {
    return "['" + a.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(n, a) {
    return ";" + a.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(n) {
    const a = n.match(/#(\d+)/u);
    return !a || !a[1] ? n : t[a[1]];
  });
  return e[i] = r, e[i].concat();
};
f.prototype.safeVm = {
  Script: me
};
const we = function(i, e, t) {
  const s = i.length;
  for (let r = 0; r < s; r++) {
    const n = i[r];
    t(n) && e.push(i.splice(r--, 1)[0]);
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
    const s = Object.keys(e), r = [];
    we(s, r, (c) => typeof e[c] == "function");
    const n = s.map((c) => e[c]);
    t = r.reduce((c, d) => {
      let g = e[d].toString();
      return /function/u.test(g) || (g = "function " + g), "var " + d + "=" + g + ";" + c;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const l = t.lastIndexOf(";"), h = l !== -1 ? t.slice(0, l + 1) + " return " + t.slice(l + 1) : " return " + t;
    return new Function(...s, h)(...n);
  }
}
f.prototype.vm = {
  Script: xe
};
function Ce(i) {
  return i ? !!(i.startsWith("$") || /\[\d+\]/.test(i) || /\[['"]/.test(i) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(i) || i.includes("..") || i.includes("*")) : !1;
}
function Pe(i) {
  return i ? i.startsWith("$") ? i : `$.${i}` : "$";
}
function Ae(i, e) {
  if (!i || !e) return [];
  try {
    const t = Pe(e);
    return (f({
      path: t,
      json: i,
      resultType: "all"
    }) || []).map((r) => ({
      path: r.path || "",
      value: r.value
    }));
  } catch {
    return [];
  }
}
function Oe(i, e) {
  if (!e || !i)
    return i || {};
  const t = Ce(e);
  if (console.log("[jsonpath-search] search:", e, "isJsonPath:", t), t) {
    const r = Le(i, e);
    return console.log("[jsonpath-search] JSONPath result:", r), r;
  }
  const s = ve(i, e);
  return console.log("[jsonpath-search] key match result:", s), s;
}
function ve(i, e) {
  const t = e.toLowerCase(), s = {};
  for (const [r, n] of Object.entries(i || {}))
    r.toLowerCase().includes(t) && (s[r] = n);
  return s;
}
function Le(i, e) {
  const t = Ae(i, e);
  if (t.length === 0)
    return {};
  if (t.length === 1) {
    const { path: r, value: n } = t[0];
    return r === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [N(r)]: n };
  }
  const s = {};
  for (const { path: r, value: n } of t) {
    const a = N(r) || `result_${Object.keys(s).length}`;
    a in s ? s[`${a}_${Object.keys(s).length}`] = n : s[a] = n;
  }
  return s;
}
function N(i) {
  if (!i) return "";
  const e = i.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e)
    return e[1];
  const t = i.match(/\.([^.[\]]+)$/);
  return t ? t[1] : i.replace(/^\$\.?/, "");
}
const Te = () => {
  const i = S.getSortedIds();
  return i.length > 0 ? i : ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"];
}, Q = /* @__PURE__ */ new Set(["shell", "console"]), ke = (i) => S.has(i) || Q.has(i), j = {
  shell: "Shell",
  console: "Console"
}, M = (i) => {
  if (j[i])
    return j[i];
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
    const s = t, r = typeof s.command == "string" ? s.command.trim() : "";
    if (!r)
      return;
    const n = typeof s.description == "string" ? s.description.trim() : "", a = Array.isArray(s.tags) ? s.tags.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], l = Array.isArray(s.aliases) ? s.aliases.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], h = typeof s.mutates == "boolean" ? s.mutates : typeof s.read_only == "boolean" ? !s.read_only : !1;
    e.push({
      command: r,
      description: n || void 0,
      tags: a.length > 0 ? a : void 0,
      aliases: l.length > 0 ? l : void 0,
      mutates: h
    });
  }), e;
}, Ie = (i) => Array.isArray(i) && i.length > 0 ? i.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : Te(), D = (i, e) => Oe(i, e), $e = (i, e, t) => {
  if (!i || !e)
    return;
  const s = e.split(".").map((n) => n.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let r = i;
  for (let n = 0; n < s.length - 1; n += 1) {
    const a = s[n];
    (!r[a] || typeof r[a] != "object") && (r[a] = {}), r = r[a];
  }
  r[s[s.length - 1]] = t;
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), Q.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = B(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.updateSessionBanner(), this.stream = new q({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = S.subscribe((s) => this.handleRegistryChange(s)), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  /**
   * Subscribe to WebSocket events for all panels based on registry
   */
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels)
      for (const s of _e(t))
        e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  /**
   * Handle registry changes (panel registered/unregistered)
   */
  handleRegistryChange(e) {
    this.eventToPanel = B(), e.type === "register" ? (this.panels.includes(e.panelId) || this.panels.push(e.panelId), e.panel && e.panel.defaultFilters !== void 0 && !(e.panelId in this.customFilterState) && (this.customFilterState[e.panelId] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && delete this.customFilterState[e.panelId], this.subscribeToEvents(), this.renderTabs(), e.panelId === this.activePanel && this.renderActivePanel();
  }
  requireElement(e, t = this.container) {
    const s = t.querySelector(e);
    if (!s)
      throw new Error(`Missing debug element: ${e}`);
    return s;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (t) => {
      const s = t.target;
      if (!s)
        return;
      const r = s.closest("[data-panel]");
      if (!r)
        return;
      const n = r.dataset.panel || "";
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
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => `
          <button class="debug-tab ${t === this.activePanel ? "debug-tab--active" : ""}" data-panel="${m(t)}">
            <span class="debug-tab__label">${m(M(t))}</span>
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
    const s = this.panelRenderers.get(e);
    if (s?.filters)
      t = s.filters();
    else {
      const r = S.get(e);
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
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], r.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(["all", "200", "201", "204", "400", "401", "403", "404", "500"], r.status)}
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
    } else if (!s?.filters && e === "sql") {
      const r = this.filters.sql;
      t = `
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
    } else if (!s?.filters && e === "logs") {
      const r = this.filters.logs;
      t = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], r.level)}
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
    } else if (!s?.filters && e === "routes") {
      const r = this.filters.routes;
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], r.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && e === "sessions") {
      const r = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const r = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${m(r.search)}" placeholder="user.roles[0].name" />
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
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), s = S.get(e);
    if (s?.renderFilters) {
      const r = this.getPanelFilterState(e, s), n = r && typeof r == "object" && !Array.isArray(r) ? { ...r } : {};
      t.forEach((a) => {
        const l = a.dataset.filter || "";
        if (!l)
          return;
        const h = n[l];
        n[l] = this.readFilterInputValue(a, h);
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
    const s = t || S.get(e);
    return s ? (e in this.customFilterState || (this.customFilterState[e] = s.defaultFilters !== void 0 ? this.cloneFilterState(s.defaultFilters) : {}), this.customFilterState[e]) : {};
  }
  cloneFilterState(e) {
    return Array.isArray(e) ? [...e] : e && typeof e == "object" ? { ...e } : e;
  }
  readFilterInputValue(e, t) {
    if (e instanceof HTMLInputElement && e.type === "checkbox")
      return e.checked;
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
    if (e === "template")
      s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search);
    else if (e === "session")
      s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search);
    else if (e === "config")
      s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search);
    else if (e === "requests")
      s = this.renderRequests();
    else if (e === "sql")
      s = this.renderSQL();
    else if (e === "logs")
      s = this.renderLogs();
    else if (e === "routes")
      s = this.renderRoutes();
    else if (e === "sessions")
      s = this.renderSessionsPanel();
    else if (e === "custom")
      s = this.renderCustom();
    else if (e === "jserrors")
      s = X(this.state.extra.jserrors || [], x, {
        newestFirst: this.filters.logs.newestFirst,
        showSortToggle: !0
      });
    else {
      const r = S.get(e);
      if (r && (r.renderConsole || r.render)) {
        const n = k(r);
        let a = this.getStateForKey(n);
        if (r.applyFilters) {
          const h = this.getPanelFilterState(e, r);
          a = r.applyFilters(a, h);
        } else if (!r.renderFilters && r.showFilters !== !1) {
          const h = this.filters.objects.search.trim();
          h && a && typeof a == "object" && !Array.isArray(a) && (a = D(a, h));
        }
        s = (r.renderConsole || r.render)(a, x, {
          newestFirst: this.filters.logs.newestFirst
        });
      } else
        s = this.renderJSONPanel(M(e), this.state.extra[e], this.filters.objects.search);
    }
    this.panelEl.innerHTML = s, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && z(this.panelEl, this.expandedRequests), e === "sql" && this.attachSQLSelectionListeners(), e === "sessions" && this.attachSessionActions();
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
      const s = t.content_type;
      s && e.add(s.split(";")[0].trim());
    }
    return [...e].sort();
  }
  renderRequests() {
    const { method: e, status: t, search: s, newestFirst: r, hasBody: n, contentType: a } = this.filters.requests, l = s.toLowerCase(), h = this.state.requests.filter((c) => !(e !== "all" && (c.method || "").toUpperCase() !== e || t !== "all" && String(c.status || "") !== t || l && !(c.path || "").toLowerCase().includes(l) || n && !c.request_body || a !== "all" && (c.content_type || "").split(";")[0].trim() !== a));
    return h.length === 0 ? this.renderEmptyState("No requests captured yet.") : Z(h, x, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      // Console has filter bar, not inline toggle
      truncatePath: !1,
      // Console shows full paths
      expandedRequestIds: this.expandedRequests
    });
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: s, newestFirst: r } = this.filters.sql, n = e.toLowerCase(), a = this.state.sql.filter((l) => !(s && !l.error || t && !this.isSlowQuery(l) || n && !(l.query || "").toLowerCase().includes(n)));
    return a.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : W(a, x, {
      newestFirst: r,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      // Console has filter bar
      useIconCopyButton: !0
      // Console uses iconoir icons
    });
  }
  renderLogs() {
    const { level: e, search: t, newestFirst: s } = this.filters.logs, r = t.toLowerCase(), n = this.state.logs.filter((a) => {
      if (e !== "all" && (a.level || "").toLowerCase() !== e)
        return !1;
      const l = `${a.message || ""} ${a.source || ""} ${J(a.fields || {})}`.toLowerCase();
      return !(r && !l.includes(r));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : ee(n, x, {
      newestFirst: s,
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
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), r = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e)
        return !1;
      const a = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(s && !a.includes(s));
    });
    return r.length === 0 ? this.renderEmptyState("No routes captured yet.") : te(r, x, {
      showName: !0
      // Console shows name column
    });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError)
      return this.renderEmptyState(this.sessionsError);
    const e = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, t = this.filters.sessions.search.trim().toLowerCase();
    let s = [...this.sessions];
    if (t && (s = s.filter((l) => [
      l.username,
      l.user_id,
      l.session_id,
      l.ip,
      l.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), s.sort((l, h) => {
      const c = new Date(l.last_activity || l.started_at || 0).getTime();
      return new Date(h.last_activity || h.started_at || 0).getTime() - c;
    }), this.sessionsLoading && s.length === 0)
      return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const r = s.map((l) => {
      const h = l.session_id || "", c = l.username || l.user_id || "Unknown", d = se(l.last_activity || l.started_at), g = T(l.request_count ?? 0), b = !!h && h === this.activeSessionId, u = b ? "detach" : "attach", y = b ? "Detach" : "Attach", E = b ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", O = b ? "debug-session-row debug-session-row--active" : "debug-session-row", P = l.current_page || "-", R = l.ip || "-";
      return `
          <tr class="${O}">
            <td>
              <div class="debug-session-user">${m(c)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${m(h || "-")}</span>
              </div>
            </td>
            <td>${m(R)}</td>
            <td>
              <span class="debug-session-path">${m(P)}</span>
            </td>
            <td>${m(d || "-")}</td>
            <td>${m(g)}</td>
            <td>
              <button class="${E}" data-session-action="${u}" data-session-id="${m(h)}">
                ${y}
              </button>
            </td>
          </tr>
        `;
    }).join(""), n = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${T(s.length)} active`}</span>
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
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : re(this.state.custom, x, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      dataFilterFn: e ? (r) => D(r, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const r = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    return r && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !r && !n && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : ie(e, t, x, {
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      filterFn: s ? (l) => D(l, s) : void 0
    });
  }
  attachSessionActions() {
    this.panelEl.querySelectorAll("[data-session-action]").forEach((t) => {
      t.addEventListener("click", () => {
        const s = t.dataset.sessionAction || "", r = t.dataset.sessionId || "";
        switch (s) {
          case "refresh":
            this.fetchSessions(!0);
            break;
          case "attach":
            this.attachSessionByID(r);
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
    if (!t || this.activeSessionId === t)
      return;
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
    const e = this.activeSession || this.sessions.find((s) => s.session_id === this.activeSessionId) || { session_id: this.activeSessionId || void 0 };
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
        const s = k(t), r = { [s]: this.getStateForKey(s) };
        return ne(r, t);
      }
    }
    switch (e) {
      case "template":
        return v(this.state.template);
      case "session":
        return v(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return v(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return v(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return v(this.state.extra[e]);
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
    return e.map((s) => {
      const r = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${m(s)}" ${r}>${m(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), s = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      s && (s.textContent = T(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${T(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
    const t = this.eventToPanel[e.type] || e.type, s = S.get(t);
    if (s) {
      const r = k(s), n = this.getStateForKey(r), l = (s.handleEvent || ((h, c) => ae(h, c, this.maxLogEntries)))(n, e.payload);
      this.setStateForKey(r, l);
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
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = L(t.requests), this.state.sql = L(t.sql), this.state.logs = L(t.logs), this.state.config = t.config || {}, this.state.routes = L(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: L(s.logs)
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
  v as countPayload,
  Xe as defaultGetCount,
  ae as defaultHandleEvent,
  m as escapeHTML,
  ze as formatDuration,
  J as formatJSON,
  T as formatNumber,
  se as formatTimestamp,
  Ye as getLevelClass,
  ne as getPanelCount,
  Ge as getPanelData,
  k as getSnapshotKey,
  Ve as getStatusClass,
  Ze as getStyleConfig,
  qe as initDebugPanel,
  oe as isSlowDuration,
  H as normalizeEventTypes,
  S as panelRegistry,
  re as renderCustomPanel,
  ie as renderJSONPanel,
  We as renderJSONViewer,
  ee as renderLogsPanel,
  Je as renderPanelContent,
  Z as renderRequestsPanel,
  te as renderRoutesPanel,
  W as renderSQLPanel,
  et as toolbarStyles,
  tt as truncate
};
//# sourceMappingURL=index.js.map
