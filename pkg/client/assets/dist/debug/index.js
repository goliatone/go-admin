import { D as F, e as m, a as Q, b as H, r as K, c as O, d as X, f as z, g as Y, h as G, i as V, j as Z, k as S, l as _, m as P, n as W } from "../chunks/custom-DPYDzVjT.js";
import { DebugReplPanel as J } from "./repl.js";
class ee {
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
class te {
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
  static addBinaryOp(e, t, r) {
    return a.max_binop_len = Math.max(e.length, a.max_binop_len), a.binary_ops[e] = t, r ? a.right_associative.add(e) : a.right_associative.delete(e), a;
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
      const r = {
        context: this,
        node: t
      };
      return a.hooks.run(e, r), r.node;
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
      return a.hooks[e].find(function(r) {
        return r.call(t.context, t), t.node;
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
    let t = [], r, s;
    for (; this.index < this.expr.length; )
      if (r = this.code, r === a.SEMCOL_CODE || r === a.COMMA_CODE)
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
    let e, t, r, s, n, o, h, c, l;
    if (o = this.gobbleToken(), !o || (t = this.gobbleBinaryOp(), !t))
      return o;
    for (n = {
      value: t,
      prec: a.binaryPrecedence(t),
      right_a: a.right_associative.has(t)
    }, h = this.gobbleToken(), h || this.throwError("Expected expression after " + t), s = [o, n, h]; t = this.gobbleBinaryOp(); ) {
      if (r = a.binaryPrecedence(t), r === 0) {
        this.index -= t.length;
        break;
      }
      n = {
        value: t,
        prec: r,
        right_a: a.right_associative.has(t)
      }, l = t;
      const f = (g) => n.right_a && g.right_a ? r > g.prec : r <= g.prec;
      for (; s.length > 2 && f(s[s.length - 2]); )
        h = s.pop(), t = s.pop().value, o = s.pop(), e = {
          type: a.BINARY_EXP,
          operator: t,
          left: o,
          right: h
        }, s.push(e);
      e = this.gobbleToken(), e || this.throwError("Expected expression after " + l), s.push(n, e);
    }
    for (c = s.length - 1, e = s[c]; c > 1; )
      e = {
        type: a.BINARY_EXP,
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
    if (e = this.code, a.isDecimalDigit(e) || e === a.PERIOD_CODE)
      return this.gobbleNumericLiteral();
    if (e === a.SQUOTE_CODE || e === a.DQUOTE_CODE)
      s = this.gobbleStringLiteral();
    else if (e === a.OBRACK_CODE)
      s = this.gobbleArray();
    else {
      for (t = this.expr.substr(this.index, a.max_unop_len), r = t.length; r > 0; ) {
        if (a.unary_ops.hasOwnProperty(t) && (!a.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + t.length)))) {
          this.index += r;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: a.UNARY_EXP,
            operator: t,
            argument: n,
            prefix: !0
          });
        }
        t = t.substr(0, --r);
      }
      a.isIdentifierStart(e) ? (s = this.gobbleIdentifier(), a.literals.hasOwnProperty(s.name) ? s = {
        type: a.LITERAL,
        value: a.literals[s.name],
        raw: s.name
      } : s.name === a.this_str && (s = {
        type: a.THIS_EXP
      })) : e === a.OPAREN_CODE && (s = this.gobbleGroup());
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
    for (; t === a.PERIOD_CODE || t === a.OBRACK_CODE || t === a.OPAREN_CODE || t === a.QUMARK_CODE; ) {
      let r;
      if (t === a.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== a.PERIOD_CODE)
          break;
        r = !0, this.index += 2, this.gobbleSpaces(), t = this.code;
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
      } : (t === a.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), e = {
        type: a.MEMBER_EXP,
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
    return r = this.code, a.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + e + this.char + ")") : (r === a.PERIOD_CODE || e.length === 1 && e.charCodeAt(0) === a.PERIOD_CODE) && this.throwError("Unexpected period"), {
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
    let r = !1, s = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === e) {
        r = !0, this.index++, e === a.CPAREN_CODE && s && s >= t.length && this.throwError("Unexpected token " + String.fromCharCode(e));
        break;
      } else if (n === a.COMMA_CODE) {
        if (this.index++, s++, s !== t.length) {
          if (e === a.CPAREN_CODE)
            this.throwError("Unexpected token ,");
          else if (e === a.CBRACK_CODE)
            for (let o = t.length; o < s; o++)
              t.push(null);
        }
      } else if (t.length !== s && s !== 0)
        this.throwError("Expected comma");
      else {
        const o = this.gobbleExpression();
        (!o || o.type === a.COMPOUND) && this.throwError("Expected comma"), t.push(o);
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
const re = new ee();
Object.assign(a, {
  hooks: re,
  plugins: new te(a),
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
const x = (i) => new a(i).parse(), se = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(a).filter((i) => !se.includes(i) && x[i] === void 0).forEach((i) => {
  x[i] = a[i];
});
x.Jsep = a;
const ie = "ConditionalExpression";
var ne = {
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
            type: ie,
            test: r,
            consequent: s,
            alternate: n
          }, r.operator && i.binary_ops[r.operator] <= 0.9) {
            let o = r;
            for (; o.right.operator && i.binary_ops[o.right.operator] <= 0.9; )
              o = o.right;
            t.node.test = o.right, o.right = t.node, t.node = r;
          }
        } else
          this.throwError("Expected :");
      }
    });
  }
};
x.plugins.register(ne);
const D = 47, ae = 92;
var oe = {
  name: "regex",
  init(i) {
    i.hooks.add("gobble-token", function(t) {
      if (this.code === D) {
        const r = ++this.index;
        let s = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === D && !s) {
            const n = this.expr.slice(r, this.index);
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
              type: i.LITERAL,
              value: h,
              raw: this.expr.slice(r - 1, this.index)
            }, t.node = this.gobbleTokenProperty(t.node), t.node;
          }
          this.code === i.OBRACK_CODE ? s = !0 : s && this.code === i.CBRACK_CODE && (s = !1), this.index += this.code === ae ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
const k = 43, le = 45, C = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [k, le],
  assignmentPrecedence: 0.9,
  init(i) {
    const e = [i.IDENTIFIER, i.MEMBER_EXP];
    C.assignmentOperators.forEach((r) => i.addBinaryOp(r, C.assignmentPrecedence, !0)), i.hooks.add("gobble-token", function(s) {
      const n = this.code;
      C.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, s.node = {
        type: "UpdateExpression",
        operator: n === k ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!s.node.argument || !e.includes(s.node.argument.type)) && this.throwError(`Unexpected ${s.node.operator}`));
    }), i.hooks.add("after-token", function(s) {
      if (s.node) {
        const n = this.code;
        C.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (e.includes(s.node.type) || this.throwError(`Unexpected ${s.node.operator}`), this.index += 2, s.node = {
          type: "UpdateExpression",
          operator: n === k ? "++" : "--",
          argument: s.node,
          prefix: !1
        });
      }
    }), i.hooks.add("after-expression", function(s) {
      s.node && t(s.node);
    });
    function t(r) {
      C.assignmentOperators.has(r.operator) ? (r.type = "AssignmentExpression", t(r.left), t(r.right)) : r.operator || Object.values(r).forEach((s) => {
        s && typeof s == "object" && t(s);
      });
    }
  }
};
x.plugins.register(oe, C);
x.addUnaryOp("typeof");
x.addLiteral("null", null);
x.addLiteral("undefined", void 0);
const he = /* @__PURE__ */ new Set(["constructor", "__proto__", "__defineGetter__", "__defineSetter__"]), p = {
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
    if (!Object.hasOwn(r, t) && he.has(t))
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
class ce {
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
function w(i, e) {
  return i = i.slice(), i.push(e), i;
}
function T(i, e) {
  return e = e.slice(), e.unshift(i), e;
}
class ue extends Error {
  /**
   * @param {AnyResult} value The evaluated scalar value
   */
  constructor(e) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = e, this.name = "NewError";
  }
}
function d(i, e, t, r, s) {
  if (!(this instanceof d))
    try {
      return new d(i, e, t, r, s);
    } catch (o) {
      if (!o.avoidNew)
        throw o;
      return o.value;
    }
  typeof i == "string" && (s = r, r = t, t = e, e = i, i = null);
  const n = i && typeof i == "object";
  if (i = i || {}, this.json = i.json || t, this.path = i.path || e, this.resultType = i.resultType || "value", this.flatten = i.flatten || !1, this.wrap = Object.hasOwn(i, "wrap") ? i.wrap : !0, this.sandbox = i.sandbox || {}, this.eval = i.eval === void 0 ? "safe" : i.eval, this.ignoreEvalErrors = typeof i.ignoreEvalErrors > "u" ? !1 : i.ignoreEvalErrors, this.parent = i.parent || null, this.parentProperty = i.parentProperty || null, this.callback = i.callback || r || null, this.otherTypeCallback = i.otherTypeCallback || s || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, i.autostart !== !1) {
    const o = {
      path: n ? i.path : e
    };
    n ? "json" in i && (o.json = i.json) : o.json = t;
    const h = this.evaluate(o);
    if (!h || typeof h != "object")
      throw new ue(h);
    return h;
  }
}
d.prototype.evaluate = function(i, e, t, r) {
  let s = this.parent, n = this.parentProperty, {
    flatten: o,
    wrap: h
  } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, t = t || this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, e = e || this.json, i = i || this.path, i && typeof i == "object" && !Array.isArray(i)) {
    if (!i.path && i.path !== "")
      throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(i, "json"))
      throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({
      json: e
    } = i), o = Object.hasOwn(i, "flatten") ? i.flatten : o, this.currResultType = Object.hasOwn(i, "resultType") ? i.resultType : this.currResultType, this.currSandbox = Object.hasOwn(i, "sandbox") ? i.sandbox : this.currSandbox, h = Object.hasOwn(i, "wrap") ? i.wrap : h, this.currEval = Object.hasOwn(i, "eval") ? i.eval : this.currEval, t = Object.hasOwn(i, "callback") ? i.callback : t, this.currOtherTypeCallback = Object.hasOwn(i, "otherTypeCallback") ? i.otherTypeCallback : this.currOtherTypeCallback, s = Object.hasOwn(i, "parent") ? i.parent : s, n = Object.hasOwn(i, "parentProperty") ? i.parentProperty : n, i = i.path;
  }
  if (s = s || null, n = n || null, Array.isArray(i) && (i = d.toPathString(i)), !i && i !== "" || !e)
    return;
  const c = d.toPathArray(i);
  c[0] === "$" && c.length > 1 && c.shift(), this._hasParentSelector = null;
  const l = this._trace(c, e, ["$"], s, n, t).filter(function(f) {
    return f && !f.isParentSelector;
  });
  return l.length ? !h && l.length === 1 && !l[0].hasArrExpr ? this._getPreferredOutput(l[0]) : l.reduce((f, g) => {
    const b = this._getPreferredOutput(g);
    return o && Array.isArray(b) ? f = f.concat(b) : f.push(b), f;
  }, []) : h ? [] : void 0;
};
d.prototype._getPreferredOutput = function(i) {
  const e = this.currResultType;
  switch (e) {
    case "all": {
      const t = Array.isArray(i.path) ? i.path : d.toPathArray(i.path);
      return i.pointer = d.toPointer(t), i.path = typeof i.path == "string" ? i.path : d.toPathString(i.path), i;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return i[e];
    case "path":
      return d.toPathString(i[e]);
    case "pointer":
      return d.toPointer(i.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
d.prototype._handleCallback = function(i, e, t) {
  if (e) {
    const r = this._getPreferredOutput(i);
    i.path = typeof i.path == "string" ? i.path : d.toPathString(i.path), e(r, t, i);
  }
};
d.prototype._trace = function(i, e, t, r, s, n, o, h) {
  let c;
  if (!i.length)
    return c = {
      path: t,
      value: e,
      parent: r,
      parentProperty: s,
      hasArrExpr: o
    }, this._handleCallback(c, n, "value"), c;
  const l = i[0], f = i.slice(1), g = [];
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
    b(this._trace(f, e, t, r, s, n, o)), this._walk(e, (u) => {
      typeof e[u] == "object" && b(this._trace(i.slice(), e[u], w(t, u), e, u, n, !0));
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
        value: s,
        parent: r,
        parentProperty: null
      }, this._handleCallback(c, n, "property"), c;
    if (l === "$")
      b(this._trace(f, e, t, null, null, n, o));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(l))
      b(this._slice(l, f, e, t, r, s, n));
    else if (l.indexOf("?(") === 0) {
      if (this.currEval === !1)
        throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = l.replace(/^\?\((.*?)\)$/u, "$1"), E = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      E ? this._walk(e, (y) => {
        const v = [E[2]], A = E[1] ? e[y][E[1]] : e[y];
        this._trace(v, A, t, r, s, n, !0).length > 0 && b(this._trace(f, e[y], w(t, y), e, y, n, !0));
      }) : this._walk(e, (y) => {
        this._eval(u, e[y], y, t, r, s) && b(this._trace(f, e[y], w(t, y), e, y, n, !0));
      });
    } else if (l[0] === "(") {
      if (this.currEval === !1)
        throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      b(this._trace(T(this._eval(l, e, t.at(-1), t.slice(0, -1), r, s), f), e, t, r, s, n, o));
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
          u = this.currOtherTypeCallback(e, t, r, s);
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
          parent: r,
          parentProperty: s
        }, this._handleCallback(c, n, "value"), c;
    } else if (l[0] === "`" && e && Object.hasOwn(e, l.slice(1))) {
      const u = l.slice(1);
      b(this._trace(f, e[u], w(t, u), e, u, n, o, !0));
    } else if (l.includes(",")) {
      const u = l.split(",");
      for (const E of u)
        b(this._trace(T(E, f), e, t, r, s, n, !0));
    } else !h && e && Object.hasOwn(e, l) && b(this._trace(f, e[l], w(t, l), e, l, n, o, !0));
  }
  if (this._hasParentSelector)
    for (let u = 0; u < g.length; u++) {
      const E = g[u];
      if (E && E.isParentSelector) {
        const y = this._trace(E.expr, e, E.path, r, s, n, o);
        if (Array.isArray(y)) {
          g[u] = y[0];
          const v = y.length;
          for (let A = 1; A < v; A++)
            u++, g.splice(u, 0, y[A]);
        } else
          g[u] = y;
      }
    }
  return g;
};
d.prototype._walk = function(i, e) {
  if (Array.isArray(i)) {
    const t = i.length;
    for (let r = 0; r < t; r++)
      e(r);
  } else i && typeof i == "object" && Object.keys(i).forEach((t) => {
    e(t);
  });
};
d.prototype._slice = function(i, e, t, r, s, n, o) {
  if (!Array.isArray(t))
    return;
  const h = t.length, c = i.split(":"), l = c[2] && Number.parseInt(c[2]) || 1;
  let f = c[0] && Number.parseInt(c[0]) || 0, g = c[1] && Number.parseInt(c[1]) || h;
  f = f < 0 ? Math.max(0, f + h) : Math.min(h, f), g = g < 0 ? Math.max(0, g + h) : Math.min(h, g);
  const b = [];
  for (let u = f; u < g; u += l)
    this._trace(T(u, e), t, r, s, n, o, !0).forEach((y) => {
      b.push(y);
    });
  return b;
};
d.prototype._eval = function(i, e, t, r, s, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = s, this.currSandbox._$_property = t, this.currSandbox._$_root = this.json, this.currSandbox._$_v = e;
  const o = i.includes("@path");
  o && (this.currSandbox._$_path = d.toPathString(r.concat([t])));
  const h = this.currEval + "Script:" + i;
  if (!d.cache[h]) {
    let c = i.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
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
    throw new Error("jsonPath: " + c.message + ": " + i);
  }
};
d.cache = {};
d.toPathString = function(i) {
  const e = i, t = e.length;
  let r = "$";
  for (let s = 1; s < t; s++)
    /^(~|\^|@.*?\(\))$/u.test(e[s]) || (r += /^[0-9*]+$/u.test(e[s]) ? "[" + e[s] + "]" : "['" + e[s] + "']");
  return r;
};
d.toPointer = function(i) {
  const e = i, t = e.length;
  let r = "";
  for (let s = 1; s < t; s++)
    /^(~|\^|@.*?\(\))$/u.test(e[s]) || (r += "/" + e[s].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return r;
};
d.toPathArray = function(i) {
  const {
    cache: e
  } = d;
  if (e[i])
    return e[i].concat();
  const t = [], s = i.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(n, o) {
    return "[#" + (t.push(o) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(n, o) {
    return "['" + o.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(n, o) {
    return ";" + o.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(n) {
    const o = n.match(/#(\d+)/u);
    return !o || !o[1] ? n : t[o[1]];
  });
  return e[i] = s, e[i].concat();
};
d.prototype.safeVm = {
  Script: ce
};
const de = function(i, e, t) {
  const r = i.length;
  for (let s = 0; s < r; s++) {
    const n = i[s];
    t(n) && e.push(i.splice(s--, 1)[0]);
  }
};
class fe {
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
    de(r, s, (l) => typeof e[l] == "function");
    const n = r.map((l) => e[l]);
    t = s.reduce((l, f) => {
      let g = e[f].toString();
      return /function/u.test(g) || (g = "function " + g), "var " + f + "=" + g + ";" + l;
    }, "") + t, !/(['"])use strict\1/u.test(t) && !r.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
    const h = t.lastIndexOf(";"), c = h !== -1 ? t.slice(0, h + 1) + " return " + t.slice(h + 1) : " return " + t;
    return new Function(...r, c)(...n);
  }
}
d.prototype.vm = {
  Script: fe
};
function pe(i) {
  return i ? !!(i.startsWith("$") || /\[\d+\]/.test(i) || /\[['"]/.test(i) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(i) || i.includes("..") || i.includes("*")) : !1;
}
function ge(i) {
  return i ? i.startsWith("$") ? i : `$.${i}` : "$";
}
function be(i, e) {
  if (!i || !e) return [];
  try {
    const t = ge(e);
    return (d({
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
function Ee(i, e) {
  if (!e || !i)
    return i || {};
  const t = pe(e);
  if (console.log("[jsonpath-search] search:", e, "isJsonPath:", t), t) {
    const s = me(i, e);
    return console.log("[jsonpath-search] JSONPath result:", s), s;
  }
  const r = ye(i, e);
  return console.log("[jsonpath-search] key match result:", r), r;
}
function ye(i, e) {
  const t = e.toLowerCase(), r = {};
  for (const [s, n] of Object.entries(i || {}))
    s.toLowerCase().includes(t) && (r[s] = n);
  return r;
}
function me(i, e) {
  const t = be(i, e);
  if (t.length === 0)
    return {};
  if (t.length === 1) {
    const { path: s, value: n } = t[0];
    return s === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [$(s)]: n };
  }
  const r = {};
  for (const { path: s, value: n } of t) {
    const o = $(s) || `result_${Object.keys(r).length}`;
    o in r ? r[`${o}_${Object.keys(r).length}`] = n : r[o] = n;
  }
  return r;
}
function $(i) {
  if (!i) return "";
  const e = i.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (e)
    return e[1];
  const t = i.match(/\.([^.[\]]+)$/);
  return t ? t[1] : i.replace(/^\$\.?/, "");
}
const U = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], B = /* @__PURE__ */ new Set(["shell", "console"]), R = /* @__PURE__ */ new Set([...U, ...B]), q = {
  template: "Template",
  session: "Session",
  requests: "Requests",
  sql: "SQL Queries",
  logs: "Logs",
  config: "Config",
  routes: "Routes",
  custom: "Custom",
  shell: "Shell",
  console: "Console"
}, xe = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, we = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, I = (i) => {
  if (!i)
    return null;
  try {
    return JSON.parse(i);
  } catch {
    return null;
  }
}, Oe = (i) => {
  if (!Array.isArray(i))
    return [];
  const e = [];
  return i.forEach((t) => {
    if (!t || typeof t != "object")
      return;
    const r = t, s = typeof r.command == "string" ? r.command.trim() : "";
    if (!s)
      return;
    const n = typeof r.description == "string" ? r.description.trim() : "", o = Array.isArray(r.tags) ? r.tags.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], h = Array.isArray(r.aliases) ? r.aliases.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], c = typeof r.mutates == "boolean" ? r.mutates : typeof r.read_only == "boolean" ? !r.read_only : !1;
    e.push({
      command: s,
      description: n || void 0,
      tags: o.length > 0 ? o : void 0,
      aliases: h.length > 0 ? h : void 0,
      mutates: c
    });
  }), e;
}, Ce = (i) => Array.isArray(i) && i.length > 0 ? i.filter((e) => typeof e == "string" && e.trim()).map((e) => e.trim()) : [...U], N = (i) => q[i] ? q[i] : i ? i.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (e) => e.toUpperCase()) : "", j = (i, e) => Ee(i, e), Ae = (i, e, t) => {
  if (!i || !e)
    return;
  const r = e.split(".").map((n) => n.trim()).filter(Boolean);
  if (r.length === 0)
    return;
  let s = i;
  for (let n = 0; n < r.length - 1; n += 1) {
    const o = r[n];
    (!s[o] || typeof s[o] != "object") && (s[o] = {}), s = s[o];
  }
  s[r[r.length - 1]] = t;
}, L = (i, e) => {
  if (!i)
    return e;
  const t = Number(i);
  return Number.isNaN(t) ? e : t;
};
class Se {
  constructor(e) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = e;
    const t = I(e.dataset.panels);
    this.panels = Ce(t), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.maxLogEntries = L(e.dataset.maxLogEntries, 500), this.maxSQLQueries = L(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = L(e.dataset.slowThresholdMs, 50), this.replCommands = Oe(I(e.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), B.forEach((r) => {
      this.panelRenderers.set(r, {
        render: () => this.renderReplPanel(r),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new F({
      basePath: this.debugPath,
      onEvent: (r) => this.handleEvent(r),
      onStatusChange: (r) => this.updateConnectionStatus(r)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((r) => xe[r] || r));
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
    const r = this.panelRenderers.get(e);
    if (r?.filters)
      t = r.filters();
    else if (e === "requests") {
      const s = this.filters.requests;
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
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${m(s.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (e === "sql") {
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
    } else if (e === "logs") {
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
    } else if (e === "routes") {
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
    } else {
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
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]");
    if (e === "requests") {
      const r = { ...this.filters.requests };
      t.forEach((s) => {
        const n = s.dataset.filter || "";
        n === "newestFirst" ? r[n] = s.checked : n && n in r && (r[n] = s.value);
      }), this.filters.requests = r;
    } else if (e === "sql") {
      const r = { ...this.filters.sql };
      t.forEach((s) => {
        const n = s.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" || n === "newestFirst" ? r[n] = s.checked : n === "search" && (r[n] = s.value);
      }), this.filters.sql = r;
    } else if (e === "logs") {
      const r = { ...this.filters.logs };
      t.forEach((s) => {
        const n = s.dataset.filter || "";
        n === "autoScroll" || n === "newestFirst" ? r[n] = s.checked : (n === "level" || n === "search") && (r[n] = s.value);
      }), this.filters.logs = r;
    } else if (e === "routes") {
      const r = { ...this.filters.routes };
      t.forEach((s) => {
        const n = s.dataset.filter || "";
        n && n in r && (r[n] = s.value);
      }), this.filters.routes = r;
    } else {
      const r = { ...this.filters.objects };
      t.forEach((s) => {
        const n = s.dataset.filter || "";
        n && n in r && (r[n] = s.value);
      }), this.filters.objects = r;
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
    let r = "";
    e === "template" ? r = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : e === "session" ? r = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : e === "config" ? r = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : e === "requests" ? r = this.renderRequests() : e === "sql" ? r = this.renderSQL() : e === "logs" ? r = this.renderLogs() : e === "routes" ? r = this.renderRoutes() : e === "custom" ? r = this.renderCustom() : r = this.renderJSONPanel(N(e), this.state.extra[e], this.filters.objects.search), this.panelEl.innerHTML = r, e === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners();
  }
  attachExpandableRowListeners() {
    Q(this.panelEl);
  }
  attachCopyButtonListeners() {
    H(this.panelEl, { useIconFeedback: !0 });
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    let t = this.replPanels.get(e);
    t || (t = new J({
      kind: e === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: e === "console" ? this.replCommands : []
    }), this.replPanels.set(e, t)), t.attach(this.panelEl);
  }
  renderRequests() {
    const { method: e, status: t, search: r, newestFirst: s } = this.filters.requests, n = r.toLowerCase(), o = this.state.requests.filter((h) => !(e !== "all" && (h.method || "").toUpperCase() !== e || t !== "all" && String(h.status || "") !== t || n && !(h.path || "").toLowerCase().includes(n)));
    return o.length === 0 ? this.renderEmptyState("No requests captured yet.") : K(o, O, {
      newestFirst: s,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      // Console has filter bar, not inline toggle
      truncatePath: !1
      // Console shows full paths
    });
  }
  renderSQL() {
    const { search: e, slowOnly: t, errorOnly: r, newestFirst: s } = this.filters.sql, n = e.toLowerCase(), o = this.state.sql.filter((h) => !(r && !h.error || t && !this.isSlowQuery(h) || n && !(h.query || "").toLowerCase().includes(n)));
    return o.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : X(o, O, {
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
    const { level: e, search: t, newestFirst: r } = this.filters.logs, s = t.toLowerCase(), n = this.state.logs.filter((o) => {
      if (e !== "all" && (o.level || "").toLowerCase() !== e)
        return !1;
      const h = `${o.message || ""} ${o.source || ""} ${z(o.fields || {})}`.toLowerCase();
      return !(s && !h.includes(s));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : Y(n, O, {
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
      const o = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(r && !o.includes(r));
    });
    return s.length === 0 ? this.renderEmptyState("No routes captured yet.") : G(s, O, {
      showName: !0
      // Console shows name column
    });
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, r = this.state.custom.logs.length > 0;
    return !t && !r ? this.renderEmptyState("No custom data captured yet.") : V(this.state.custom, O, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      dataFilterFn: e ? (s) => j(s, e) : void 0
    });
  }
  renderJSONPanel(e, t, r) {
    const s = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    return s && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !s && !n && !t ? this.renderEmptyState(`No ${e.toLowerCase()} data available.`) : Z(e, t, O, {
      useIconCopyButton: !0,
      // Console uses iconoir icons
      showCount: !0,
      filterFn: r ? (h) => j(h, r) : void 0
    });
  }
  panelCount(e) {
    switch (e) {
      case "template":
        return S(this.state.template);
      case "session":
        return S(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return S(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "custom":
        return S(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return S(this.state.extra[e]);
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
      r && (r.textContent = _(t));
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
    const t = we[e.type] || e.type;
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
        R.has(t) || (this.state.extra[t] = e.payload);
        break;
    }
    this.updateTabCounts(), t === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Ae(this.state.custom.data, String(e.key), e.value);
        return;
      }
      if (typeof e == "object" && ("category" in e || "message" in e)) {
        this.state.custom.logs.push(e), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  applySnapshot(e) {
    const t = e || {};
    this.state.template = t.template || {}, this.state.session = t.session || {}, this.state.requests = P(t.requests), this.state.sql = P(t.sql), this.state.logs = P(t.logs), this.state.config = t.config || {}, this.state.routes = P(t.routes);
    const r = t.custom || {};
    this.state.custom = {
      data: r.data || {},
      logs: P(r.logs)
    };
    const s = {};
    this.panels.forEach((n) => {
      !R.has(n) && n in t && (s[n] = t[n]);
    }), this.state.extra = s, this.updateTabCounts(), this.renderPanel();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; )
        e.shift();
  }
  isSlowQuery(e) {
    return W(e?.duration, this.slowThresholdMs);
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
const Pe = (i) => {
  const e = i || document.querySelector("[data-debug-console]");
  return e ? new Se(e) : null;
}, M = () => {
  Pe();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", M) : M();
export {
  Se as DebugPanel,
  F as DebugStream,
  Pe as initDebugPanel
};
//# sourceMappingURL=index.js.map
