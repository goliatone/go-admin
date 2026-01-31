import { D as Q, p as C, e as m, a as H, b as X, c as z, r as Y, d as O, f as G, g as V, h as Z, i as W, j as J, k as ee, l as P, m as _, n as te, o as se, q as v, s as re, t as B } from "../chunks/builtin-panels-rlH6z4Rw.js";
import { H as je, I as Me, G as Ue, u as Fe, B as Be, A as Ke, F as Qe, w as He, v as Xe, E as ze, z as Ye, J as Ge, x as Ve, y as Ze, C as We } from "../chunks/builtin-panels-rlH6z4Rw.js";
import { DebugReplPanel as ie } from "./repl.js";
class ne {
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
      for (let i in arguments[0])
        this.add(i, arguments[0][i], arguments[1]);
    else
      (Array.isArray(e) ? e : [e]).forEach(function(i) {
        this[i] = this[i] || [], t && this[i][s ? "unshift" : "push"](t);
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
class ae {
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
    t.forEach((i) => {
      if (typeof i != "object" || !i.name || !i.init)
        throw new Error("Invalid JSEP plugin format");
      this.registered[i.name] || (i.init(this.jsep), this.registered[i.name] = i);
    });
  }
}
class a {
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
    return "JavaScript Expression Parser (JSEP) v" + a.version;
  }
  // ==================== CONFIG ================================
  /**
   * @method addUnaryOp
   * @param {string} op_name The name of the unary op to add
   * @returns {Jsep}
   */
  static addUnaryOp(e) {
    return a.max_unop_len = Math.max(e.length, a.max_unop_len), a.unary_ops[e] = 1, a;
  }
  /**
   * @method jsep.addBinaryOp
   * @param {string} op_name The name of the binary op to add
   * @param {number} precedence The precedence of the binary op (can be a float). Higher number = higher precedence
   * @param {boolean} [isRightAssociative=false] whether operator is right-associative
   * @returns {Jsep}
   */
  static addBinaryOp(e, t, s) {
    return a.max_binop_len = Math.max(e.length, a.max_binop_len), a.binary_ops[e] = t, s ? a.right_associative.add(e) : a.right_associative.delete(e), a;
  }
  /**
   * @method addIdentifierChar
   * @param {string} char The additional character to treat as a valid part of an identifier
   * @returns {Jsep}
   */
  static addIdentifierChar(e) {
    return a.additional_identifier_chars.add(e), a;
  }
  /**
   * @method addLiteral
   * @param {string} literal_name The name of the literal to add
   * @param {*} literal_value The value of the literal
   * @returns {Jsep}
   */
  static addLiteral(e, t) {
    return a.literals[e] = t, a;
  }
  /**
   * @method removeUnaryOp
   * @param {string} op_name The name of the unary op to remove
   * @returns {Jsep}
   */
  static removeUnaryOp(e) {
    return delete a.unary_ops[e], e.length === a.max_unop_len && (a.max_unop_len = a.getMaxKeyLen(a.unary_ops)), a;
  }
  /**
   * @method removeAllUnaryOps
   * @returns {Jsep}
   */
  static removeAllUnaryOps() {
    return a.unary_ops = {}, a.max_unop_len = 0, a;
  }
  /**
   * @method removeIdentifierChar
   * @param {string} char The additional character to stop treating as a valid part of an identifier
   * @returns {Jsep}
   */
  static removeIdentifierChar(e) {
    return a.additional_identifier_chars.delete(e), a;
  }
  /**
   * @method removeBinaryOp
   * @param {string} op_name The name of the binary op to remove
   * @returns {Jsep}
   */
  static removeBinaryOp(e) {
    return delete a.binary_ops[e], e.length === a.max_binop_len && (a.max_binop_len = a.getMaxKeyLen(a.binary_ops)), a.right_associative.delete(e), a;
  }
  /**
   * @method removeAllBinaryOps
   * @returns {Jsep}
   */
  static removeAllBinaryOps() {
    return a.binary_ops = {}, a.max_binop_len = 0, a;
  }
  /**
   * @method removeLiteral
   * @param {string} literal_name The name of the literal to remove
   * @returns {Jsep}
   */
  static removeLiteral(e) {
    return delete a.literals[e], a;
  }
  /**
   * @method removeAllLiterals
   * @returns {Jsep}
   */
  static removeAllLiterals() {
    return a.literals = {}, a;
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
    return new a(e).parse();
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
    return a.binary_ops[e] || 0;
  }
  /**
   * Looks for start of identifier
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierStart(e) {
    return e >= 65 && e <= 90 || // A...Z
    e >= 97 && e <= 122 || // a...z
    e >= 128 && !a.binary_ops[String.fromCharCode(e)] || // any non-ASCII that is not an operator
    a.additional_identifier_chars.has(String.fromCharCode(e));
  }
  /**
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierPart(e) {
    return a.isIdentifierStart(e) || a.isDecimalDigit(e);
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
    if (a.hooks[e]) {
      const s = {
        context: this,
        node: t
      };
      return a.hooks.run(e, s), s.node;
    }
    return t;
  }
  /**
   * Runs a given hook until one returns a node
   * @param {string} name
   * @returns {?jsep.Expression}
   */
  searchHook(e) {
    if (a.hooks[e]) {
      const t = {
        context: this
      };
      return a.hooks[e].find(function(s) {
        return s.call(t.context, t), t.node;
      }), t.node;
    }
  }
  /**
   * Push `index` up to the next non-space character
   */
  gobbleSpaces() {
    let e = this.code;
    for (; e === a.SPACE_CODE || e === a.TAB_CODE || e === a.LF_CODE || e === a.CR_CODE; )
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
      type: a.COMPOUND,
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
    let t = [], s, i;
    for (; this.index < this.expr.length; )
      if (s = this.code, s === a.SEMCOL_CODE || s === a.COMMA_CODE)
        this.index++;
      else if (i = this.gobbleExpression())
        t.push(i);
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
    let e = this.expr.substr(this.index, a.max_binop_len), t = e.length;
    for (; t > 0; ) {
      if (a.binary_ops.hasOwnProperty(e) && (!a.isIdentifierStart(this.code) || this.index + e.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + e.length))))
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
    let e, t, s, i, n, o, h, c, l;
    if (o = this.gobbleToken(), !o || (t = this.gobbleBinaryOp(), !t))
      return o;
    for (n = {
      value: t,
      prec: a.binaryPrecedence(t),
      right_a: a.right_associative.has(t)
    }, h = this.gobbleToken(), h || this.throwError("Expected expression after " + t), i = [o, n, h]; t = this.gobbleBinaryOp(); ) {
      if (s = a.binaryPrecedence(t), s === 0) {
        this.index -= t.length;
        break;
      }
      n = {
        value: t,
        prec: s,
        right_a: a.right_associative.has(t)
      }, l = t;
      const f = (g) => n.right_a && g.right_a ? s > g.prec : s <= g.prec;
      for (; i.length > 2 && f(i[i.length - 2]); )
        h = i.pop(), t = i.pop().value, o = i.pop(), e = {
          type: a.BINARY_EXP,
          operator: t,
          left: o,
          right: h
        }, i.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + l), i.push(n, e);
    }
    for (c = i.length - 1, e = i[c]; c > 1; )
      e = {
        type: a.BINARY_EXP,
        operator: i[c - 1].value,
        left: i[c - 2],
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
    let e, t, s, i;
    if (this.gobbleSpaces(), i = this.searchHook("gobble-token"), i)
      return this.runHook("after-token", i);
    if (e = this.code, a.isDecimalDigit(e) || e === a.PERIOD_CODE)
      return this.gobbleNumericLiteral();
    if (e === a.SQUOTE_CODE || e === a.DQUOTE_CODE)
      i = this.gobbleStringLiteral();
    else if (e === a.OBRACK_CODE)
      i = this.gobbleArray();
    else {
      for (t = this.expr.substr(this.index, a.max_unop_len), s = t.length; s > 0; ) {
        if (a.unary_ops.hasOwnProperty(t) && (!a.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + t.length)))) {
          this.index += s;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: a.UNARY_EXP,
            operator: t,
            argument: n,
            prefix: !0
          });
        }
        t = t.substr(0, --s);
      }
      a.isIdentifierStart(e) ? (i = this.gobbleIdentifier(), a.literals.hasOwnProperty(i.name) ? i = {
        type: a.LITERAL,
        value: a.literals[i.name],
        raw: i.name
      } : i.name === a.this_str && (i = {
        type: a.THIS_EXP
      })) : e === a.OPAREN_CODE && (i = this.gobbleGroup());
    }
    return i ? (i = this.gobbleTokenProperty(i), this.runHook("after-token", i)) : this.runHook("after-token", !1);
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
    for (; t === a.PERIOD_CODE || t === a.OBRACK_CODE || t === a.OPAREN_CODE || t === a.QUMARK_CODE; ) {
      let s;
      if (t === a.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== a.PERIOD_CODE)
          break;
        s = !0, this.index += 2, this.gobbleSpaces(), t = this.code;
      }
      this.index++, t === a.OBRACK_CODE ? (e = {
        type: a.MEMBER_EXP,
        computed: !0,
        object: e,
        property: this.gobbleExpression()
      }, e.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), t = this.code, t !== a.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : t === a.OPAREN_CODE ? e = {
        type: a.CALL_EXP,
        arguments: this.gobbleArguments(a.CPAREN_CODE),
        callee: e
      } : (t === a.PERIOD_CODE || s) && (s && this.index--, this.gobbleSpaces(), e = {
        type: a.MEMBER_EXP,
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
    for (; a.isDecimalDigit(this.code); )
      e += this.expr.charAt(this.index++);
    if (this.code === a.PERIOD_CODE)
      for (e += this.expr.charAt(this.index++); a.isDecimalDigit(this.code); )
        e += this.expr.charAt(this.index++);
    if (t = this.char, t === "e" || t === "E") {
      for (e += this.expr.charAt(this.index++), t = this.char, (t === "+" || t === "-") && (e += this.expr.charAt(this.index++)); a.isDecimalDigit(this.code); )
        e += this.expr.charAt(this.index++);
      a.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + e + this.char + ")");
    }
    return s = this.code, a.isIdentifierStart(s) ? this.throwError("Variable names cannot start with a number (" + e + this.char + ")") : (s === a.PERIOD_CODE || e.length === 1 && e.charCodeAt(0) === a.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: a.LITERAL,
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
    let i = !1;
    for (; this.index < this.expr.length; ) {
      let n = this.expr.charAt(this.index++);
      if (n === s) {
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
      else
        e += n;
    }
    return i || this.throwError('Unclosed quote after "' + e + '"'), {
      type: a.LITERAL,
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
    for (a.isIdentifierStart(e) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (e = this.code, a.isIdentifierPart(e)); )
      this.index++;
    return {
      type: a.IDENTIFIER,
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
    let s = !1, i = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === e) {
        s = !0, this.index++, e === a.CPAREN_CODE && i && i >= t.length && this.throwError("Unexpected token " + String.fromCharCode(e));
        break;
      } else if (n === a.COMMA_CODE) {
        if (this.index++, i++, i !== t.length) {
          if (e === a.CPAREN_CODE)
            this.throwError("Unexpected token ,");
          else if (e === a.CBRACK_CODE)
            for (let o = t.length; o < i; o++)
              t.push(null);
        }
      } else if (t.length !== i && i !== 0)
        this.throwError("Expected comma");
      else {
        const o = this.gobbleExpression();
        (!o || o.type === a.COMPOUND) && this.throwError("Expected comma"), t.push(o);
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
    let e = this.gobbleExpressions(a.CPAREN_CODE);
    if (this.code === a.CPAREN_CODE)
      return this.index++, e.length === 1 ? e[0] : e.length ? {
        type: a.SEQUENCE_EXP,
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
      type: a.ARRAY_EXP,
      elements: this.gobbleArguments(a.CBRACK_CODE)
    };
  }
}
const oe = new ne();
Object.assign(a, {
  hooks: oe,
  plugins: new ae(a),
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
a.max_unop_len = a.getMaxKeyLen(a.unary_ops);
a.max_binop_len = a.getMaxKeyLen(a.binary_ops);
const x = (r) => new a(r).parse(), le = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(a).filter((r) => !le.includes(r) && x[r] === void 0).forEach((r) => {
  x[r] = a[r];
});
x.Jsep = a;
const he = "ConditionalExpression";
var ce = {
  name: "ternary",
  init(r) {
    r.hooks.add("after-expression", function(t) {
      if (t.node && this.code === r.QUMARK_CODE) {
        this.index++;
        const s = t.node, i = this.gobbleExpression();
        if (i || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === r.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), t.node = {
            type: he,
            test: s,
            consequent: i,
            alternate: n
          }, s.operator && r.binary_ops[s.operator] <= 0.9) {
            let o = s;
            for (; o.right.operator && r.binary_ops[o.right.operator] <= 0.9; )
              o = o.right;
            t.node.test = o.right, o.right = t.node, t.node = s;
          }
        } else
          this.throwError("Expected :");
      }
    });
  }
};
x.plugins.register(ce);
const R = 47, ue = 92;
var de = {
  name: "regex",
  init(r) {
    r.hooks.add("gobble-token", function(t) {
      if (this.code === R) {
        const s = ++this.index;
        let i = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === R && !i) {
            const n = this.expr.slice(s, this.index);
            let o = "";
            for (; ++this.index < this.expr.length; ) {
              const c = this.code;
              if (c >= 97 && c <= 122 || c >= 65 && c <= 90 || c >= 48 && c <= 57)
                o += this.char;
              else
                break;
            }
            let h;
            try {
              h = new RegExp(n, o);
            } catch (c) {
              this.throwError(c.message);
            }
            return t.node = {
              type: r.LITERAL,
              value: h,
              raw: this.expr.slice(s - 1, this.index)
            }, t.node = this.gobbleTokenProperty(t.node), t.node;
          }
          this.code === r.OBRACK_CODE ? i = !0 : i && this.code === r.CBRACK_CODE && (i = !1), this.index += this.code === ue ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
const T = 43, fe = 45, S = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [T, fe],
  assignmentPrecedence: 0.9,
  init(r) {
    const e = [r.IDENTIFIER, r.MEMBER_EXP];
    S.assignmentOperators.forEach((s) => r.addBinaryOp(s, S.assignmentPrecedence, !0)), r.hooks.add("gobble-token", function(i) {
      const n = this.code;
      S.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, i.node = {
        type: "UpdateExpression",
        operator: n === T ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!i.node.argument || !e.includes(i.node.argument.type)) && this.throwError(`Unexpected ${i.node.operator}`));
    }), r.hooks.add("after-token", function(i) {
      if (i.node) {
        const n = this.code;
        S.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (e.includes(i.node.type) || this.throwError(`Unexpected ${i.node.operator}`), this.index += 2, i.node = {
          type: "UpdateExpression",
          operator: n === T ? "++" : "--",
          argument: i.node,
          prefix: !1
        });
      }
    }), r.hooks.add("after-expression", function(i) {
      i.node && t(i.node);
    });
    function t(s) {
      S.assignmentOperators.has(s.operator) ? (s.type = "AssignmentExpression", t(s.left), t(s.right)) : s.operator || Object.values(s).forEach((i) => {
        i && typeof i == "object" && t(i);
      });
    }
  }
};
x.plugins.register(de, S);
x.addUnaryOp("typeof");
x.addLiteral("null", null);
x.addLiteral("undefined", void 0);
const pe = /* @__PURE__ */ new Set(["constructor", "__proto__", "__defineGetter__", "__defineSetter__"]), p = {
  /**
   * @param {jsep.Expression} ast
   * @param {Record<string, any>} subs
   */
  evalAst(r, e) {
    switch (r.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return p.evalBinaryExpression(r, e);
      case "Compound":
        return p.evalCompound(r, e);
      case "ConditionalExpression":
        return p.evalConditionalExpression(r, e);
      case "Identifier":
        return p.evalIdentifier(r, e);
      case "Literal":
        return p.evalLiteral(r, e);
      case "MemberExpression":
        return p.evalMemberExpression(r, e);
      case "UnaryExpression":
        return p.evalUnaryExpression(r, e);
      case "ArrayExpression":
        return p.evalArrayExpression(r, e);
      case "CallExpression":
        return p.evalCallExpression(r, e);
      case "AssignmentExpression":
        return p.evalAssignmentExpression(r, e);
      default:
        throw SyntaxError("Unexpected expression", r);
    }
  },
  evalBinaryExpression(r, e) {
    return {
      "||": (s, i) => s || i(),
      "&&": (s, i) => s && i(),
      "|": (s, i) => s | i(),
      "^": (s, i) => s ^ i(),
      "&": (s, i) => s & i(),
      // eslint-disable-next-line eqeqeq -- API
      "==": (s, i) => s == i(),
      // eslint-disable-next-line eqeqeq -- API
      "!=": (s, i) => s != i(),
      "===": (s, i) => s === i(),
      "!==": (s, i) => s !== i(),
      "<": (s, i) => s < i(),
      ">": (s, i) => s > i(),
      "<=": (s, i) => s <= i(),
      ">=": (s, i) => s >= i(),
      "<<": (s, i) => s << i(),
      ">>": (s, i) => s >> i(),
      ">>>": (s, i) => s >>> i(),
      "+": (s, i) => s + i(),
      "-": (s, i) => s - i(),
      "*": (s, i) => s * i(),
      "/": (s, i) => s / i(),
      "%": (s, i) => s % i()
    }[r.operator](p.evalAst(r.left, e), () => p.evalAst(r.right, e));
  },
  evalCompound(r, e) {
    let t;
    for (let s = 0; s < r.body.length; s++) {
      r.body[s].type === "Identifier" && ["var", "let", "const"].includes(r.body[s].name) && r.body[s + 1] && r.body[s + 1].type === "AssignmentExpression" && (s += 1);
      const i = r.body[s];
      t = p.evalAst(i, e);
    }
    return t;
  },
  evalConditionalExpression(r, e) {
    return p.evalAst(r.test, e) ? p.evalAst(r.consequent, e) : p.evalAst(r.alternate, e);
  },
  evalIdentifier(r, e) {
    if (Object.hasOwn(e, r.name))
      return e[r.name];
    throw ReferenceError(`${r.name} is not defined`);
  },
  evalLiteral(r) {
    return r.value;
  },
  evalMemberExpression(r, e) {
    const t = String(
      // NOTE: `String(value)` throws error when
      // value has overwritten the toString method to return non-string
      // i.e. `value = {toString: () => []}`
      r.computed ? p.evalAst(r.property) : r.property.name
      // `object.property` property is Identifier
    ), s = p.evalAst(r.object, e);
    if (s == null)
      throw TypeError(`Cannot read properties of ${s} (reading '${t}')`);
    if (!Object.hasOwn(s, t) && pe.has(t))
      throw TypeError(`Cannot read properties of ${s} (reading '${t}')`);
    const i = s[t];
    return typeof i == "function" ? i.bind(s) : i;
  },
  evalUnaryExpression(r, e) {
    return {
      "-": (s) => -p.evalAst(s, e),
      "!": (s) => !p.evalAst(s, e),
      "~": (s) => ~p.evalAst(s, e),
      // eslint-disable-next-line no-implicit-coercion -- API
      "+": (s) => +p.evalAst(s, e),
      typeof: (s) => typeof p.evalAst(s, e)
    }[r.operator](r.argument);
  },
  evalArrayExpression(r, e) {
    return r.elements.map((t) => p.evalAst(t, e));
  },
  evalCallExpression(r, e) {
    const t = r.arguments.map((i) => p.evalAst(i, e));
    return p.evalAst(r.callee, e)(...t);
  },
  evalAssignmentExpression(r, e) {
    if (r.left.type !== "Identifier")
      throw SyntaxError("Invalid left-hand side in assignment");
    const t = r.left.name, s = p.evalAst(r.right, e);
    return e[t] = s, e[t];
  }
};
class ge {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(e) {
    this.code = e, this.ast = x(this.code);
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
function w(r, e) {
  return r = r.slice(), r.push(e), r;
}
function D(r, e) {
  return e = e.slice(), e.unshift(r), e;
}
class be extends Error {
  /**
   * @param {AnyResult} value The evaluated scalar value
   */
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
}
function d(r, e, t, s, i) {
  if (!(this instanceof d))
    try {
      return new d(r, e, t, s, i);
    } catch (o) {
      if (!o.avoidNew)
        throw o;
      return o.value;
    }
  typeof r == "string" && (i = s, s = t, t = e, e = r, r = null);
  const n = r && typeof r == "object";
  if (r = r || {}, this.json = r.json || t, this.path = r.path || e, this.resultType = r.resultType || "value", this.flatten = r.flatten || !1, this.wrap = Object.hasOwn(r, "wrap") ? r.wrap : !0, this.sandbox = r.sandbox || {}, this.eval = r.eval === void 0 ? "safe" : r.eval, this.ignoreEvalErrors = typeof r.ignoreEvalErrors > "u" ? !1 : r.ignoreEvalErrors, this.parent = r.parent || null, this.parentProperty = r.parentProperty || null, this.callback = r.callback || s || null, this.otherTypeCallback = r.otherTypeCallback || i || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, r.autostart !== !1) {
    const o = {
      path: n ? r.path : e
    };
    n ? "json" in r && (o.json = r.json) : o.json = t;
    const h = this.evaluate(o);
    if (!h || typeof h != "object")
      throw new be(h);
    return h;
  }
}
d.prototype.evaluate = function(r, e, t, s) {
  let i = this.parent, n = this.parentProperty, {
    flatten: o,
    wrap: h
  } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, t = t || this.callback, this.currOtherTypeCallback = s || this.otherTypeCallback, e = e || this.json, r = r || this.path, r && typeof r == "object" && !Array.isArray(r)) {
    if (!r.path && r.path !== "")
      throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(r, "json"))
      throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({
      json: e
    } = r), o = Object.hasOwn(r, "flatten") ? r.flatten : o, this.currResultType = Object.hasOwn(r, "resultType") ? r.resultType : this.currResultType, this.currSandbox = Object.hasOwn(r, "sandbox") ? r.sandbox : this.currSandbox, h = Object.hasOwn(r, "wrap") ? r.wrap : h, this.currEval = Object.hasOwn(r, "eval") ? r.eval : this.currEval, t = Object.hasOwn(r, "callback") ? r.callback : t, this.currOtherTypeCallback = Object.hasOwn(r, "otherTypeCallback") ? r.otherTypeCallback : this.currOtherTypeCallback, i = Object.hasOwn(r, "parent") ? r.parent : i, n = Object.hasOwn(r, "parentProperty") ? r.parentProperty : n, r = r.path;
  }
  if (i = i || null, n = n || null, Array.isArray(r) && (r = d.toPathString(r)), !r && r !== "" || !e)
    return;
  const c = d.toPathArray(r);
  c[0] === "$" && c.length > 1 && c.shift(), this._hasParentSelector = null;
  const l = this._trace(c, e, ["$"], i, n, t).filter(function(f) {
    return f && !f.isParentSelector;
  });
  return l.length ? !h && l.length === 1 && !l[0].hasArrExpr ? this._getPreferredOutput(l[0]) : l.reduce((f, g) => {
    const b = this._getPreferredOutput(g);
    return o && Array.isArray(b) ? f = f.concat(b) : f.push(b), f;
  }, []) : h ? [] : void 0;
};
d.prototype._getPreferredOutput = function(r) {
  const e = this.currResultType;
  switch (e) {
    case "all": {
      const t = Array.isArray(r.path) ? r.path : d.toPathArray(r.path);
      return r.pointer = d.toPointer(t), r.path = typeof r.path == "string" ? r.path : d.toPathString(r.path), r;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return r[e];
    case "path":
      return d.toPathString(r[e]);
    case "pointer":
      return d.toPointer(r.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
d.prototype._handleCallback = function(r, e, t) {
  if (e) {
    const s = this._getPreferredOutput(r);
    r.path = typeof r.path == "string" ? r.path : d.toPathString(r.path), e(s, t, r);
  }
};
d.prototype._trace = function(r, e, t, s, i, n, o, h) {
  let c;
  if (!r.length)
    return c = {
      path: t,
      value: e,
      parent: s,
      parentProperty: i,
      hasArrExpr: o
    }, this._handleCallback(c, n, "value"), c;
  const l = r[0], f = r.slice(1), g = [];
  function b(u) {
    Array.isArray(u) ? u.forEach((E) => {
      g.push(E);
    }) : g.push(u);
  }
  if ((typeof l != "string" || h) && e && Object.hasOwn(e, l))
    b(this._trace(f, e[l], w(t, l), e, l, n, o));
  else if (l === "*")
    this._walk(e, (u) => {
      b(this._trace(f, e[u], w(t, u), e, u, n, !0, !0));
    });
  else if (l === "..")
    b(this._trace(f, e, t, s, i, n, o)), this._walk(e, (u) => {
      typeof e[u] == "object" && b(this._trace(r.slice(), e[u], w(t, u), e, u, n, !0));
    });
  else {
    if (l === "^")
      return this._hasParentSelector = !0, {
        path: t.slice(0, -1),
        expr: f,
        isParentSelector: !0
      };
    if (l === "~")
      return c = {
        path: w(t, l),
        value: i,
        parent: s,
        parentProperty: null
      }, this._handleCallback(c, n, "property"), c;
    if (l === "$")
      b(this._trace(f, e, t, null, null, n, o));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(l))
      b(this._slice(l, f, e, t, s, i, n));
    else if (l.indexOf("?(") === 0) {
      if (this.currEval === !1)
        throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = l.replace(/^\?\((.*?)\)$/u, "$1"), E = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      E ? this._walk(e, (y) => {
        const k = [E[2]], A = E[1] ? e[y][E[1]] : e[y];
        this._trace(k, A, t, s, i, n, !0).length > 0 && b(this._trace(f, e[y], w(t, y), e, y, n, !0));
      }) : this._walk(e, (y) => {
        this._eval(u, e[y], y, t, s, i) && b(this._trace(f, e[y], w(t, y), e, y, n, !0));
      });
    } else if (l[0] === "(") {
      if (this.currEval === !1)
        throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      b(this._trace(D(this._eval(l, e, t.at(-1), t.slice(0, -1), s, i), f), e, t, s, i, n, o));
    } else if (l[0] === "@") {
      let u = !1;
      const E = l.slice(1, -2);
      switch (E) {
        case "scalar":
          (!e || !["object", "function"].includes(typeof e)) && (u = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof e === E && (u = !0);
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
          e && typeof e === E && (u = !0);
          break;
        case "array":
          Array.isArray(e) && (u = !0);
          break;
        case "other":
          u = this.currOtherTypeCallback(e, t, s, i);
          break;
        case "null":
          e === null && (u = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + E);
      }
      if (u)
        return c = {
          path: t,
          value: e,
          parent: s,
          parentProperty: i
        }, this._handleCallback(c, n, "value"), c;
    } else if (l[0] === "`" && e && Object.hasOwn(e, l.slice(1))) {
      const u = l.slice(1);
      b(this._trace(f, e[u], w(t, u), e, u, n, o, !0));
    } else if (l.includes(",")) {
      const u = l.split(",");
      for (const E of u)
        b(this._trace(D(E, f), e, t, s, i, n, !0));
    } else !h && e && Object.hasOwn(e, l) && b(this._trace(f, e[l], w(t, l), e, l, n, o, !0));
  }
  if (this._hasParentSelector)
    for (let u = 0; u < g.length; u++) {
      const E = g[u];
      if (E && E.isParentSelector) {
        const y = this._trace(E.expr, e, E.path, s, i, n, o);
        if (Array.isArray(y)) {
          g[u] = y[0];
          const k = y.length;
          for (let A = 1; A < k; A++)
            u++, g.splice(u, 0, y[A]);
        } else
          g[u] = y;
      }
    }
  return g;
};
d.prototype._walk = function(r, e) {
  if (Array.isArray(r)) {
    const t = r.length;
    for (let s = 0; s < t; s++)
      e(s);
  } else r && typeof r == "object" && Object.keys(r).forEach((t) => {
    e(t);
  });
};
d.prototype._slice = function(r, e, t, s, i, n, o) {
  if (!Array.isArray(t))
    return;
  const h = t.length, c = r.split(":"), l = c[2] && Number.parseInt(c[2]) || 1;
  let f = c[0] && Number.parseInt(c[0]) || 0, g = c[1] && Number.parseInt(c[1]) || h;
  f = f < 0 ? Math.max(0, f + h) : Math.min(h, f), g = g < 0 ? Math.max(0, g + h) : Math.min(h, g);
  const b = [];
  for (let u = f; u < g; u += l)
    this._trace(D(u, e), t, s, i, n, o, !0).forEach((y) => {
      b.push(y);
    });
  return b;
};
d.prototype._eval = function(r, e, t, s, i, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = i, this.currSandbox._$_property = t, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const o = r.includes("@path");
  o && (this.currSandbox._$_path = d.toPathString(s.concat([t])));
  const h = this.currEval + "Script:" + r;
  if (!d.cache[h]) {
    let c = r.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (o && (c = c.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0)
      d.cache[h] = new this.safeVm.Script(c);
    else if (this.currEval === "native")
      d.cache[h] = new this.vm.Script(c);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const l = this.currEval;
      d.cache[h] = new l(c);
    } else if (typeof this.currEval == "function")
      d.cache[h] = {
        runInNewContext: (l) => this.currEval(c, l)
      };
    else
      throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return d.cache[h].runInNewContext(this.currSandbox);
  } catch (c) {
    if (this.ignoreEvalErrors)
      return !1;
    throw new Error("jsonPath: " + c.message + ": " + r);
  }
};
d.cache = {};
d.toPathString = function(r) {
  const e = r, t = e.length;
  let s = "$";
  for (let i = 1; i < t; i++)
    /^(~|\^|@.*?\(\))$/u.test(e[i]) || (s += /^[0-9*]+$/u.test(e[i]) ? "[" + e[i] + "]" : "['" + e[i] + "']");
  return s;
};
d.toPointer = function(r) {
  const e = r, t = e.length;
  let s = "";
  for (let i = 1; i < t; i++)
    /^(~|\^|@.*?\(\))$/u.test(e[i]) || (s += "/" + e[i].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return s;
};
d.toPathArray = function(r) {
  const {
    cache: e
  } = d;
  if (e[r])
    return e[r].concat();
  const t = [], i = r.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(n, o) {
    return "[#" + (t.push(o) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(n, o) {
    return "['" + o.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(n, o) {
    return ";" + o.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(n) {
    const o = n.match(/#(\d+)/u);
    return !o || !o[1] ? n : t[o[1]];
  });
  return e[r] = i, e[r].concat();
};
d.prototype.safeVm = {
  Script: ge
};
const Ee = function(r, e, t) {
  const s = r.length;
  for (let i = 0; i < s; i++) {
    const n = r[i];
    t(n) && e.push(r.splice(i--, 1)[0]);
  }
};
class ye {
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
    const s = Object.keys(e), i = [];
    Ee(s, i, (l) => typeof e[l] == "function");
    const n = s.map((l) => e[l]);
    t = i.reduce((l, f) => {
      let g = e[f].toString();
      return /function/u.test(g) || (g = "function " + g), "var " + f + "=" + g + ";" + l;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !s.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const h = t.lastIndexOf(";"), c = h !== -1 ? t.slice(0, h + 1) + " return " + t.slice(h + 1) : " return " + t;
    return new Function(...s, c)(...n);
  }
}
d.prototype.vm = {
  Script: ye
};
function me(r) {
  return r ? !!(r.startsWith("$") || /\[\d+\]/.test(r) || /\[['"]/.test(r) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(r) || r.includes("..") || r.includes("*")) : !1;
}
function xe(r) {
  return r ? r.startsWith("$") ? r : `$.${r}` : "$";
}
function we(r, e) {
  if (!r || !e) return [];
  try {
    const t = xe(e);
    return (d({
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
function Ce(r, e) {
  if (!e || !r)
    return r || {};
  const t = me(e);
  if (console.log("[jsonpath-search] search:", e, "isJsonPath:", t), t) {
    const i = Se(r, e);
    return console.log("[jsonpath-search] JSONPath result:", i), i;
  }
  const s = Oe(r, e);
  return console.log("[jsonpath-search] key match result:", s), s;
}
function Oe(r, e) {
  const t = e.toLowerCase(), s = {};
  for (const [i, n] of Object.entries(r || {}))
    i.toLowerCase().includes(t) && (s[i] = n);
  return s;
}
function Se(r, e) {
  const t = we(r, e);
  if (t.length === 0)
    return {};
  if (t.length === 1) {
    const { path: i, value: n } = t[0];
    return i === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [$(i)]: n };
  }
  const s = {};
  for (const { path: i, value: n } of t) {
    const o = $(i) || `result_${Object.keys(s).length}`;
    o in s ? s[`${o}_${Object.keys(s).length}`] = n : s[o] = n;
  }
  return s;
}
function $(r) {
  if (!r) return "";
  const e = r.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e)
    return e[1];
  const t = r.match(/\.([^.[\]]+)$/);
  return t ? t[1] : r.replace(/^\$\.?/, "");
}
const Ae = () => {
  const r = C.getSortedIds();
  return r.length > 0 ? r : ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"];
}, K = /* @__PURE__ */ new Set(["shell", "console"]), I = (r) => C.has(r) || K.has(r), q = {
  shell: "Shell",
  console: "Console"
}, N = (r) => {
  if (q[r])
    return q[r];
  const e = C.get(r);
  return e ? e.label : r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "";
}, Pe = (r) => {
  const e = C.get(r);
  return e ? B(e) : [r];
}, j = () => {
  const r = {};
  for (const e of C.list())
    for (const t of B(e))
      r[t] = e.id;
  return r;
}, M = (r) => {
  if (!r)
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, ve = (r) => {
  if (!Array.isArray(r))
    return [];
  const e = [];
  return r.forEach((t) => {
    if (!t || typeof t != "object")
      return;
    const s = t, i = typeof s.command == "string" ? s.command.trim() : "";
    if (!i)
      return;
    const n = typeof s.description == "string" ? s.description.trim() : "", o = Array.isArray(s.tags) ? s.tags.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], h = Array.isArray(s.aliases) ? s.aliases.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], c = typeof s.mutates == "boolean" ? s.mutates : typeof s.read_only == "boolean" ? !s.read_only : !1;
    e.push({
      command: i,
      description: n || void 0,
      tags: o.length > 0 ? o : void 0,
      aliases: h.length > 0 ? h : void 0,
      mutates: c
    });
  }), e;
}, ke = (r) => Array.isArray(r) && r.length > 0 ? r.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : Ae(), U = (r, e) => Ce(r, e), Te = (r, e, t) => {
  if (!r || !e)
    return;
  const s = e.split(".").map((n) => n.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let i = r;
  for (let n = 0; n < s.length - 1; n += 1) {
    const o = s[n];
    (!i[o] || typeof i[o] != "object") && (i[o] = {}), i = i[o];
  }
  i[s[s.length - 1]] = t;
}, L = (r, e) => {
  if (!r)
    return e;
  const t = Number(r);
  return Number.isNaN(t) ? e : t;
};
class Le {
  constructor(e) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.unsubscribeRegistry = null, this.container = e;
    const t = M(e.dataset.panels);
    this.panels = ke(t), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.maxLogEntries = L(e.dataset.maxLogEntries, 500), this.maxSQLQueries = L(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = L(e.dataset.slowThresholdMs, 50), this.replCommands = ve(M(e.dataset.replCommands)), this.state = {
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
      requests: { method: "all", status: "all", search: "", newestFirst: !0 },
      sql: { search: "", slowOnly: !1, errorOnly: !1, newestFirst: !0 },
      logs: { level: "all", search: "", autoScroll: !0, newestFirst: !0 },
      routes: { method: "all", search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), K.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = j(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new Q({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.unsubscribeRegistry = C.subscribe((s) => this.handleRegistryChange(s)), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents();
  }
  /**
   * Subscribe to WebSocket events for all panels based on registry
   */
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels)
      for (const s of Pe(t))
        e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  /**
   * Handle registry changes (panel registered/unregistered)
   */
  handleRegistryChange(e) {
    this.eventToPanel = j(), e.type === "register" && (this.panels.includes(e.panelId) || this.panels.push(e.panelId)), this.subscribeToEvents(), this.renderTabs(), e.panelId === this.activePanel && this.renderActivePanel();
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
      const i = s.closest("[data-panel]");
      if (!i)
        return;
      const n = i.dataset.panel || "";
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
            <span class="debug-tab__label">${m(N(t))}</span>
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
    else if (e === "requests") {
      const i = this.filters.requests;
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], i.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions(["all", "200", "201", "204", "400", "401", "403", "404", "500"], i.status)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(i.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${i.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (e === "sql") {
      const i = this.filters.sql;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(i.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${i.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${i.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${i.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (e === "logs") {
      const i = this.filters.logs;
      t = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], i.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(i.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${i.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${i.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (e === "routes") {
      const i = this.filters.routes;
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], i.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(i.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const i = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${m(i.search)}" placeholder="user.roles[0].name" />
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
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]");
    if (e === "requests") {
      const s = { ...this.filters.requests };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "newestFirst" ? s[n] = i.checked : n && n in s && (s[n] = i.value);
      }), this.filters.requests = s;
    } else if (e === "sql") {
      const s = { ...this.filters.sql };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" || n === "newestFirst" ? s[n] = i.checked : n === "search" && (s[n] = i.value);
      }), this.filters.sql = s;
    } else if (e === "logs") {
      const s = { ...this.filters.logs };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "autoScroll" || n === "newestFirst" ? s[n] = i.checked : (n === "level" || n === "search") && (s[n] = i.value);
      }), this.filters.logs = s;
    } else if (e === "routes") {
      const s = { ...this.filters.routes };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in s && (s[n] = i.value);
      }), this.filters.routes = s;
    } else {
      const s = { ...this.filters.objects };
      t.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in s && (s[n] = i.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  renderPanel() {
    const e = this.activePanel, t = this.panelRenderers.get(e);
    if (t) {
      t.render();
      return;
    }
    this.panelEl.classList.remove("debug-content--repl");
    let s = "";
    e === "template" ? s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : e === "session" ? s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : e === "config" ? s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : e === "requests" ? s = this.renderRequests() : e === "sql" ? s = this.renderSQL() : e === "logs" ? s = this.renderLogs() : e === "routes" ? s = this.renderRoutes() : e === "custom" ? s = this.renderCustom() : s = this.renderJSONPanel(N(e), this.state.extra[e], this.filters.objects.search), this.panelEl.innerHTML = s, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "sql" && this.attachSQLSelectionListeners();
  }
  attachExpandableRowListeners() {
    H(this.panelEl);
  }
  attachCopyButtonListeners() {
    X(this.panelEl, { useIconFeedback: !0 });
  }
  attachSQLSelectionListeners() {
    z(this.panelEl, this.state.sql, { useIconFeedback: !0 });
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new ie({
      kind: e === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: e === "console" ? this.replCommands : []
    }), this.replPanels.set(e, t)), t.attach(this.panelEl);
  }
  renderRequests() {
    const { method: e, status: t, search: s, newestFirst: i } = this.filters.requests, n = s.toLowerCase(), o = this.state.requests.filter((h) => !(e !== "all" && (h.method || "").toUpperCase() !== e || t !== "all" && String(h.status || "") !== t || n && !(h.path || "").toLowerCase().includes(n)));
    return o.length === 0 ? this.renderEmptyState("No requests captured yet.") : Y(o, O, {
      newestFirst: i,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      // Console has filter bar, not inline toggle
      truncatePath: !1
      // Console shows full paths
    });
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: s, newestFirst: i } = this.filters.sql, n = e.toLowerCase(), o = this.state.sql.filter((h) => !(s && !h.error || t && !this.isSlowQuery(h) || n && !(h.query || "").toLowerCase().includes(n)));
    return o.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : G(o, O, {
      newestFirst: i,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      // Console has filter bar
      useIconCopyButton: !0
      // Console uses iconoir icons
    });
  }
  renderLogs() {
    const { level: e, search: t, newestFirst: s } = this.filters.logs, i = t.toLowerCase(), n = this.state.logs.filter((o) => {
      if (e !== "all" && (o.level || "").toLowerCase() !== e)
        return !1;
      const h = `${o.message || ""} ${o.source || ""} ${V(o.fields || {})}`.toLowerCase();
      return !(i && !h.includes(i));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : Z(n, O, {
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
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), i = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e)
        return !1;
      const o = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(s && !o.includes(s));
    });
    return i.length === 0 ? this.renderEmptyState("No routes captured yet.") : W(i, O, {
      showName: !0
      // Console shows name column
    });
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, s = this.state.custom.logs.length > 0;
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : J(this.state.custom, O, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      dataFilterFn: e ? (i) => U(i, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const i = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    return i && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !i && !n && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : ee(e, t, O, {
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      filterFn: s ? (h) => U(h, s) : void 0
    });
  }
  panelCount(e) {
    switch (e) {
      case "template":
        return P(this.state.template);
      case "session":
        return P(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return P(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "custom":
        return P(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return P(this.state.extra[e]);
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
      const i = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${m(s)}" ${i}>${m(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), s = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      s && (s.textContent = _(t));
    });
  }
  updateConnectionStatus(e) {
    this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${_(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
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
    const t = this.eventToPanel[e.type] || e.type, s = C.get(t);
    if (s) {
      const i = te(s), n = this.getStateForKey(i), h = (s.handleEvent || ((c, l) => se(c, l, this.maxLogEntries)))(n, e.payload);
      this.setStateForKey(i, h);
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
          I(t) || (this.state.extra[t] = e.payload);
          break;
      }
    this.updateTabCounts(), t === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Te(this.state.custom.data, String(e.key), e.value);
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
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = v(t.requests), this.state.sql = v(t.sql), this.state.logs = v(t.logs), this.state.config = t.config || {}, this.state.routes = v(t.routes);
    const s = t.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: v(s.logs)
    };
    const i = {};
    this.panels.forEach((n) => {
      !I(n) && n in t && (i[n] = t[n]);
    }), this.state.extra = i, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; )
        e.shift();
  }
  isSlowQuery(e) {
    return re(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.debugPath)
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
    this.debugPath && (this.stream.clear(), fetch(`${this.debugPath}/api/clear`, { method: "POST", credentials: "same-origin" }).catch(() => {
    }));
  }
  clearActivePanel() {
    if (!this.debugPath)
      return;
    const e = this.activePanel;
    this.stream.clear([e]), fetch(`${this.debugPath}/api/clear/${e}`, { method: "POST", credentials: "same-origin" }).catch(() => {
    });
  }
  togglePause(e) {
    this.paused = !this.paused, e.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}
const De = (r) => {
  const e = r || document.querySelector("[data-debug-console]");
  return e ? new Le(e) : null;
}, F = () => {
  De();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", F) : F();
export {
  je as DATA_ATTRS,
  Le as DebugPanel,
  Q as DebugStream,
  Me as INTERACTION_CLASSES,
  X as attachCopyListeners,
  H as attachExpandableRowListeners,
  O as consoleStyles,
  Ue as copyToClipboard,
  P as countPayload,
  Fe as defaultGetCount,
  se as defaultHandleEvent,
  m as escapeHTML,
  Be as formatDuration,
  V as formatJSON,
  _ as formatNumber,
  Ke as formatTimestamp,
  Qe as getLevelClass,
  He as getPanelCount,
  Xe as getPanelData,
  te as getSnapshotKey,
  ze as getStatusClass,
  Ye as getStyleConfig,
  De as initDebugPanel,
  re as isSlowDuration,
  B as normalizeEventTypes,
  C as panelRegistry,
  J as renderCustomPanel,
  ee as renderJSONPanel,
  Ge as renderJSONViewer,
  Z as renderLogsPanel,
  Ve as renderPanelContent,
  Y as renderRequestsPanel,
  W as renderRoutesPanel,
  G as renderSQLPanel,
  Ze as toolbarStyles,
  We as truncate
};
//# sourceMappingURL=index.js.map
