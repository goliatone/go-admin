import { D as K, h as X, a as D } from "../chunks/syntax-highlight-BeUtGWoX.js";
import { DebugReplPanel as z } from "./repl.js";
class Y {
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
  add(t, e, s) {
    if (typeof arguments[0] != "string")
      for (let i in arguments[0])
        this.add(i, arguments[0][i], arguments[1]);
    else
      (Array.isArray(t) ? t : [t]).forEach(function(i) {
        this[i] = this[i] || [], e && this[i][s ? "unshift" : "push"](e);
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
  run(t, e) {
    this[t] = this[t] || [], this[t].forEach(function(s) {
      s.call(e && e.context ? e.context : e, e);
    });
  }
}
class G {
  constructor(t) {
    this.jsep = t, this.registered = {};
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
    for (var t = arguments.length, e = new Array(t), s = 0; s < t; s++)
      e[s] = arguments[s];
    e.forEach((i) => {
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
  static addUnaryOp(t) {
    return a.max_unop_len = Math.max(t.length, a.max_unop_len), a.unary_ops[t] = 1, a;
  }
  /**
   * @method jsep.addBinaryOp
   * @param {string} op_name The name of the binary op to add
   * @param {number} precedence The precedence of the binary op (can be a float). Higher number = higher precedence
   * @param {boolean} [isRightAssociative=false] whether operator is right-associative
   * @returns {Jsep}
   */
  static addBinaryOp(t, e, s) {
    return a.max_binop_len = Math.max(t.length, a.max_binop_len), a.binary_ops[t] = e, s ? a.right_associative.add(t) : a.right_associative.delete(t), a;
  }
  /**
   * @method addIdentifierChar
   * @param {string} char The additional character to treat as a valid part of an identifier
   * @returns {Jsep}
   */
  static addIdentifierChar(t) {
    return a.additional_identifier_chars.add(t), a;
  }
  /**
   * @method addLiteral
   * @param {string} literal_name The name of the literal to add
   * @param {*} literal_value The value of the literal
   * @returns {Jsep}
   */
  static addLiteral(t, e) {
    return a.literals[t] = e, a;
  }
  /**
   * @method removeUnaryOp
   * @param {string} op_name The name of the unary op to remove
   * @returns {Jsep}
   */
  static removeUnaryOp(t) {
    return delete a.unary_ops[t], t.length === a.max_unop_len && (a.max_unop_len = a.getMaxKeyLen(a.unary_ops)), a;
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
  static removeIdentifierChar(t) {
    return a.additional_identifier_chars.delete(t), a;
  }
  /**
   * @method removeBinaryOp
   * @param {string} op_name The name of the binary op to remove
   * @returns {Jsep}
   */
  static removeBinaryOp(t) {
    return delete a.binary_ops[t], t.length === a.max_binop_len && (a.max_binop_len = a.getMaxKeyLen(a.binary_ops)), a.right_associative.delete(t), a;
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
  static removeLiteral(t) {
    return delete a.literals[t], a;
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
  constructor(t) {
    this.expr = t, this.index = 0;
  }
  /**
   * static top-level parser
   * @returns {jsep.Expression}
   */
  static parse(t) {
    return new a(t).parse();
  }
  /**
   * Get the longest key length of any object
   * @param {object} obj
   * @returns {number}
   */
  static getMaxKeyLen(t) {
    return Math.max(0, ...Object.keys(t).map((e) => e.length));
  }
  /**
   * `ch` is a character code in the next three functions
   * @param {number} ch
   * @returns {boolean}
   */
  static isDecimalDigit(t) {
    return t >= 48 && t <= 57;
  }
  /**
   * Returns the precedence of a binary operator or `0` if it isn't a binary operator. Can be float.
   * @param {string} op_val
   * @returns {number}
   */
  static binaryPrecedence(t) {
    return a.binary_ops[t] || 0;
  }
  /**
   * Looks for start of identifier
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierStart(t) {
    return t >= 65 && t <= 90 || // A...Z
    t >= 97 && t <= 122 || // a...z
    t >= 128 && !a.binary_ops[String.fromCharCode(t)] || // any non-ASCII that is not an operator
    a.additional_identifier_chars.has(String.fromCharCode(t));
  }
  /**
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierPart(t) {
    return a.isIdentifierStart(t) || a.isDecimalDigit(t);
  }
  /**
   * throw error at index of the expression
   * @param {string} message
   * @throws
   */
  throwError(t) {
    const e = new Error(t + " at character " + this.index);
    throw e.index = this.index, e.description = t, e;
  }
  /**
   * Run a given hook
   * @param {string} name
   * @param {jsep.Expression|false} [node]
   * @returns {?jsep.Expression}
   */
  runHook(t, e) {
    if (a.hooks[t]) {
      const s = {
        context: this,
        node: e
      };
      return a.hooks.run(t, s), s.node;
    }
    return e;
  }
  /**
   * Runs a given hook until one returns a node
   * @param {string} name
   * @returns {?jsep.Expression}
   */
  searchHook(t) {
    if (a.hooks[t]) {
      const e = {
        context: this
      };
      return a.hooks[t].find(function(s) {
        return s.call(e.context, e), e.node;
      }), e.node;
    }
  }
  /**
   * Push `index` up to the next non-space character
   */
  gobbleSpaces() {
    let t = this.code;
    for (; t === a.SPACE_CODE || t === a.TAB_CODE || t === a.LF_CODE || t === a.CR_CODE; )
      t = this.expr.charCodeAt(++this.index);
    this.runHook("gobble-spaces");
  }
  /**
   * Top-level method to parse all expressions and returns compound or single node
   * @returns {jsep.Expression}
   */
  parse() {
    this.runHook("before-all");
    const t = this.gobbleExpressions(), e = t.length === 1 ? t[0] : {
      type: a.COMPOUND,
      body: t
    };
    return this.runHook("after-all", e);
  }
  /**
   * top-level parser (but can be reused within as well)
   * @param {number} [untilICode]
   * @returns {jsep.Expression[]}
   */
  gobbleExpressions(t) {
    let e = [], s, i;
    for (; this.index < this.expr.length; )
      if (s = this.code, s === a.SEMCOL_CODE || s === a.COMMA_CODE)
        this.index++;
      else if (i = this.gobbleExpression())
        e.push(i);
      else if (this.index < this.expr.length) {
        if (s === t)
          break;
        this.throwError('Unexpected "' + this.char + '"');
      }
    return e;
  }
  /**
   * The main parsing function.
   * @returns {?jsep.Expression}
   */
  gobbleExpression() {
    const t = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    return this.gobbleSpaces(), this.runHook("after-expression", t);
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
    let t = this.expr.substr(this.index, a.max_binop_len), e = t.length;
    for (; e > 0; ) {
      if (a.binary_ops.hasOwnProperty(t) && (!a.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + t.length))))
        return this.index += e, t;
      t = t.substr(0, --e);
    }
    return !1;
  }
  /**
   * This function is responsible for gobbling an individual expression,
   * e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
   * @returns {?jsep.BinaryExpression}
   */
  gobbleBinaryExpression() {
    let t, e, s, i, n, o, h, l, c;
    if (o = this.gobbleToken(), !o || (e = this.gobbleBinaryOp(), !e))
      return o;
    for (n = {
      value: e,
      prec: a.binaryPrecedence(e),
      right_a: a.right_associative.has(e)
    }, h = this.gobbleToken(), h || this.throwError("Expected expression after " + e), i = [o, n, h]; e = this.gobbleBinaryOp(); ) {
      if (s = a.binaryPrecedence(e), s === 0) {
        this.index -= e.length;
        break;
      }
      n = {
        value: e,
        prec: s,
        right_a: a.right_associative.has(e)
      }, c = e;
      const d = (f) => n.right_a && f.right_a ? s > f.prec : s <= f.prec;
      for (; i.length > 2 && d(i[i.length - 2]); )
        h = i.pop(), e = i.pop().value, o = i.pop(), t = {
          type: a.BINARY_EXP,
          operator: e,
          left: o,
          right: h
        }, i.push(t);
      t = this.gobbleToken(), t || this.throwError("Expected expression after " + c), i.push(n, t);
    }
    for (l = i.length - 1, t = i[l]; l > 1; )
      t = {
        type: a.BINARY_EXP,
        operator: i[l - 1].value,
        left: i[l - 2],
        right: t
      }, l -= 2;
    return t;
  }
  /**
   * An individual part of a binary expression:
   * e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
   * @returns {boolean|jsep.Expression}
   */
  gobbleToken() {
    let t, e, s, i;
    if (this.gobbleSpaces(), i = this.searchHook("gobble-token"), i)
      return this.runHook("after-token", i);
    if (t = this.code, a.isDecimalDigit(t) || t === a.PERIOD_CODE)
      return this.gobbleNumericLiteral();
    if (t === a.SQUOTE_CODE || t === a.DQUOTE_CODE)
      i = this.gobbleStringLiteral();
    else if (t === a.OBRACK_CODE)
      i = this.gobbleArray();
    else {
      for (e = this.expr.substr(this.index, a.max_unop_len), s = e.length; s > 0; ) {
        if (a.unary_ops.hasOwnProperty(e) && (!a.isIdentifierStart(this.code) || this.index + e.length < this.expr.length && !a.isIdentifierPart(this.expr.charCodeAt(this.index + e.length)))) {
          this.index += s;
          const n = this.gobbleToken();
          return n || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
            type: a.UNARY_EXP,
            operator: e,
            argument: n,
            prefix: !0
          });
        }
        e = e.substr(0, --s);
      }
      a.isIdentifierStart(t) ? (i = this.gobbleIdentifier(), a.literals.hasOwnProperty(i.name) ? i = {
        type: a.LITERAL,
        value: a.literals[i.name],
        raw: i.name
      } : i.name === a.this_str && (i = {
        type: a.THIS_EXP
      })) : t === a.OPAREN_CODE && (i = this.gobbleGroup());
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
  gobbleTokenProperty(t) {
    this.gobbleSpaces();
    let e = this.code;
    for (; e === a.PERIOD_CODE || e === a.OBRACK_CODE || e === a.OPAREN_CODE || e === a.QUMARK_CODE; ) {
      let s;
      if (e === a.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== a.PERIOD_CODE)
          break;
        s = !0, this.index += 2, this.gobbleSpaces(), e = this.code;
      }
      this.index++, e === a.OBRACK_CODE ? (t = {
        type: a.MEMBER_EXP,
        computed: !0,
        object: t,
        property: this.gobbleExpression()
      }, t.property || this.throwError('Unexpected "' + this.char + '"'), this.gobbleSpaces(), e = this.code, e !== a.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : e === a.OPAREN_CODE ? t = {
        type: a.CALL_EXP,
        arguments: this.gobbleArguments(a.CPAREN_CODE),
        callee: t
      } : (e === a.PERIOD_CODE || s) && (s && this.index--, this.gobbleSpaces(), t = {
        type: a.MEMBER_EXP,
        computed: !1,
        object: t,
        property: this.gobbleIdentifier()
      }), s && (t.optional = !0), this.gobbleSpaces(), e = this.code;
    }
    return t;
  }
  /**
   * Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
   * keep track of everything in the numeric literal and then calling `parseFloat` on that string
   * @returns {jsep.Literal}
   */
  gobbleNumericLiteral() {
    let t = "", e, s;
    for (; a.isDecimalDigit(this.code); )
      t += this.expr.charAt(this.index++);
    if (this.code === a.PERIOD_CODE)
      for (t += this.expr.charAt(this.index++); a.isDecimalDigit(this.code); )
        t += this.expr.charAt(this.index++);
    if (e = this.char, e === "e" || e === "E") {
      for (t += this.expr.charAt(this.index++), e = this.char, (e === "+" || e === "-") && (t += this.expr.charAt(this.index++)); a.isDecimalDigit(this.code); )
        t += this.expr.charAt(this.index++);
      a.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + t + this.char + ")");
    }
    return s = this.code, a.isIdentifierStart(s) ? this.throwError("Variable names cannot start with a number (" + t + this.char + ")") : (s === a.PERIOD_CODE || t.length === 1 && t.charCodeAt(0) === a.PERIOD_CODE) && this.throwError("Unexpected period"), {
      type: a.LITERAL,
      value: parseFloat(t),
      raw: t
    };
  }
  /**
   * Parses a string literal, staring with single or double quotes with basic support for escape codes
   * e.g. `"hello world"`, `'this is\nJSEP'`
   * @returns {jsep.Literal}
   */
  gobbleStringLiteral() {
    let t = "";
    const e = this.index, s = this.expr.charAt(this.index++);
    let i = !1;
    for (; this.index < this.expr.length; ) {
      let n = this.expr.charAt(this.index++);
      if (n === s) {
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
      else
        t += n;
    }
    return i || this.throwError('Unclosed quote after "' + t + '"'), {
      type: a.LITERAL,
      value: t,
      raw: this.expr.substring(e, this.index)
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
    let t = this.code, e = this.index;
    for (a.isIdentifierStart(t) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (t = this.code, a.isIdentifierPart(t)); )
      this.index++;
    return {
      type: a.IDENTIFIER,
      name: this.expr.slice(e, this.index)
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
  gobbleArguments(t) {
    const e = [];
    let s = !1, i = 0;
    for (; this.index < this.expr.length; ) {
      this.gobbleSpaces();
      let n = this.code;
      if (n === t) {
        s = !0, this.index++, t === a.CPAREN_CODE && i && i >= e.length && this.throwError("Unexpected token " + String.fromCharCode(t));
        break;
      } else if (n === a.COMMA_CODE) {
        if (this.index++, i++, i !== e.length) {
          if (t === a.CPAREN_CODE)
            this.throwError("Unexpected token ,");
          else if (t === a.CBRACK_CODE)
            for (let o = e.length; o < i; o++)
              e.push(null);
        }
      } else if (e.length !== i && i !== 0)
        this.throwError("Expected comma");
      else {
        const o = this.gobbleExpression();
        (!o || o.type === a.COMPOUND) && this.throwError("Expected comma"), e.push(o);
      }
    }
    return s || this.throwError("Expected " + String.fromCharCode(t)), e;
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
    let t = this.gobbleExpressions(a.CPAREN_CODE);
    if (this.code === a.CPAREN_CODE)
      return this.index++, t.length === 1 ? t[0] : t.length ? {
        type: a.SEQUENCE_EXP,
        expressions: t
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
const V = new Y();
Object.assign(a, {
  hooks: V,
  plugins: new G(a),
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
const w = (r) => new a(r).parse(), Z = Object.getOwnPropertyNames(class {
});
Object.getOwnPropertyNames(a).filter((r) => !Z.includes(r) && w[r] === void 0).forEach((r) => {
  w[r] = a[r];
});
w.Jsep = a;
const W = "ConditionalExpression";
var J = {
  name: "ternary",
  init(r) {
    r.hooks.add("after-expression", function(e) {
      if (e.node && this.code === r.QUMARK_CODE) {
        this.index++;
        const s = e.node, i = this.gobbleExpression();
        if (i || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === r.COLON_CODE) {
          this.index++;
          const n = this.gobbleExpression();
          if (n || this.throwError("Expected expression"), e.node = {
            type: W,
            test: s,
            consequent: i,
            alternate: n
          }, s.operator && r.binary_ops[s.operator] <= 0.9) {
            let o = s;
            for (; o.right.operator && r.binary_ops[o.right.operator] <= 0.9; )
              o = o.right;
            e.node.test = o.right, o.right = e.node, e.node = s;
          }
        } else
          this.throwError("Expected :");
      }
    });
  }
};
w.plugins.register(J);
const N = 47, tt = 92;
var et = {
  name: "regex",
  init(r) {
    r.hooks.add("gobble-token", function(e) {
      if (this.code === N) {
        const s = ++this.index;
        let i = !1;
        for (; this.index < this.expr.length; ) {
          if (this.code === N && !i) {
            const n = this.expr.slice(s, this.index);
            let o = "";
            for (; ++this.index < this.expr.length; ) {
              const l = this.code;
              if (l >= 97 && l <= 122 || l >= 65 && l <= 90 || l >= 48 && l <= 57)
                o += this.char;
              else
                break;
            }
            let h;
            try {
              h = new RegExp(n, o);
            } catch (l) {
              this.throwError(l.message);
            }
            return e.node = {
              type: r.LITERAL,
              value: h,
              raw: this.expr.slice(s - 1, this.index)
            }, e.node = this.gobbleTokenProperty(e.node), e.node;
          }
          this.code === r.OBRACK_CODE ? i = !0 : i && this.code === r.CBRACK_CODE && (i = !1), this.index += this.code === tt ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
const L = 43, st = 45, A = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [L, st],
  assignmentPrecedence: 0.9,
  init(r) {
    const t = [r.IDENTIFIER, r.MEMBER_EXP];
    A.assignmentOperators.forEach((s) => r.addBinaryOp(s, A.assignmentPrecedence, !0)), r.hooks.add("gobble-token", function(i) {
      const n = this.code;
      A.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, i.node = {
        type: "UpdateExpression",
        operator: n === L ? "++" : "--",
        argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
        prefix: !0
      }, (!i.node.argument || !t.includes(i.node.argument.type)) && this.throwError(`Unexpected ${i.node.operator}`));
    }), r.hooks.add("after-token", function(i) {
      if (i.node) {
        const n = this.code;
        A.updateOperators.some((o) => o === n && o === this.expr.charCodeAt(this.index + 1)) && (t.includes(i.node.type) || this.throwError(`Unexpected ${i.node.operator}`), this.index += 2, i.node = {
          type: "UpdateExpression",
          operator: n === L ? "++" : "--",
          argument: i.node,
          prefix: !1
        });
      }
    }), r.hooks.add("after-expression", function(i) {
      i.node && e(i.node);
    });
    function e(s) {
      A.assignmentOperators.has(s.operator) ? (s.type = "AssignmentExpression", e(s.left), e(s.right)) : s.operator || Object.values(s).forEach((i) => {
        i && typeof i == "object" && e(i);
      });
    }
  }
};
w.plugins.register(et, A);
w.addUnaryOp("typeof");
w.addLiteral("null", null);
w.addLiteral("undefined", void 0);
const rt = /* @__PURE__ */ new Set(["constructor", "__proto__", "__defineGetter__", "__defineSetter__"]), b = {
  /**
   * @param {jsep.Expression} ast
   * @param {Record<string, any>} subs
   */
  evalAst(r, t) {
    switch (r.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return b.evalBinaryExpression(r, t);
      case "Compound":
        return b.evalCompound(r, t);
      case "ConditionalExpression":
        return b.evalConditionalExpression(r, t);
      case "Identifier":
        return b.evalIdentifier(r, t);
      case "Literal":
        return b.evalLiteral(r, t);
      case "MemberExpression":
        return b.evalMemberExpression(r, t);
      case "UnaryExpression":
        return b.evalUnaryExpression(r, t);
      case "ArrayExpression":
        return b.evalArrayExpression(r, t);
      case "CallExpression":
        return b.evalCallExpression(r, t);
      case "AssignmentExpression":
        return b.evalAssignmentExpression(r, t);
      default:
        throw SyntaxError("Unexpected expression", r);
    }
  },
  evalBinaryExpression(r, t) {
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
    }[r.operator](b.evalAst(r.left, t), () => b.evalAst(r.right, t));
  },
  evalCompound(r, t) {
    let e;
    for (let s = 0; s < r.body.length; s++) {
      r.body[s].type === "Identifier" && ["var", "let", "const"].includes(r.body[s].name) && r.body[s + 1] && r.body[s + 1].type === "AssignmentExpression" && (s += 1);
      const i = r.body[s];
      e = b.evalAst(i, t);
    }
    return e;
  },
  evalConditionalExpression(r, t) {
    return b.evalAst(r.test, t) ? b.evalAst(r.consequent, t) : b.evalAst(r.alternate, t);
  },
  evalIdentifier(r, t) {
    if (Object.hasOwn(t, r.name))
      return t[r.name];
    throw ReferenceError(`${r.name} is not defined`);
  },
  evalLiteral(r) {
    return r.value;
  },
  evalMemberExpression(r, t) {
    const e = String(
      // NOTE: `String(value)` throws error when
      // value has overwritten the toString method to return non-string
      // i.e. `value = {toString: () => []}`
      r.computed ? b.evalAst(r.property) : r.property.name
      // `object.property` property is Identifier
    ), s = b.evalAst(r.object, t);
    if (s == null)
      throw TypeError(`Cannot read properties of ${s} (reading '${e}')`);
    if (!Object.hasOwn(s, e) && rt.has(e))
      throw TypeError(`Cannot read properties of ${s} (reading '${e}')`);
    const i = s[e];
    return typeof i == "function" ? i.bind(s) : i;
  },
  evalUnaryExpression(r, t) {
    return {
      "-": (s) => -b.evalAst(s, t),
      "!": (s) => !b.evalAst(s, t),
      "~": (s) => ~b.evalAst(s, t),
      // eslint-disable-next-line no-implicit-coercion -- API
      "+": (s) => +b.evalAst(s, t),
      typeof: (s) => typeof b.evalAst(s, t)
    }[r.operator](r.argument);
  },
  evalArrayExpression(r, t) {
    return r.elements.map((e) => b.evalAst(e, t));
  },
  evalCallExpression(r, t) {
    const e = r.arguments.map((i) => b.evalAst(i, t));
    return b.evalAst(r.callee, t)(...e);
  },
  evalAssignmentExpression(r, t) {
    if (r.left.type !== "Identifier")
      throw SyntaxError("Invalid left-hand side in assignment");
    const e = r.left.name, s = b.evalAst(r.right, t);
    return t[e] = s, t[e];
  }
};
class it {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(t) {
    this.code = t, this.ast = w(this.code);
  }
  /**
   * @param {object} context Object whose items will be added
   *   to evaluation
   * @returns {EvaluatedResult} Result of evaluated code
   */
  runInNewContext(t) {
    const e = Object.assign(/* @__PURE__ */ Object.create(null), t);
    return b.evalAst(this.ast, e);
  }
}
function x(r, t) {
  return r = r.slice(), r.push(t), r;
}
function _(r, t) {
  return t = t.slice(), t.unshift(r), t;
}
class nt extends Error {
  /**
   * @param {AnyResult} value The evaluated scalar value
   */
  constructor(t) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)'), this.avoidNew = !0, this.value = t, this.name = "NewError";
  }
}
function g(r, t, e, s, i) {
  if (!(this instanceof g))
    try {
      return new g(r, t, e, s, i);
    } catch (o) {
      if (!o.avoidNew)
        throw o;
      return o.value;
    }
  typeof r == "string" && (i = s, s = e, e = t, t = r, r = null);
  const n = r && typeof r == "object";
  if (r = r || {}, this.json = r.json || e, this.path = r.path || t, this.resultType = r.resultType || "value", this.flatten = r.flatten || !1, this.wrap = Object.hasOwn(r, "wrap") ? r.wrap : !0, this.sandbox = r.sandbox || {}, this.eval = r.eval === void 0 ? "safe" : r.eval, this.ignoreEvalErrors = typeof r.ignoreEvalErrors > "u" ? !1 : r.ignoreEvalErrors, this.parent = r.parent || null, this.parentProperty = r.parentProperty || null, this.callback = r.callback || s || null, this.otherTypeCallback = r.otherTypeCallback || i || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  }, r.autostart !== !1) {
    const o = {
      path: n ? r.path : t
    };
    n ? "json" in r && (o.json = r.json) : o.json = e;
    const h = this.evaluate(o);
    if (!h || typeof h != "object")
      throw new nt(h);
    return h;
  }
}
g.prototype.evaluate = function(r, t, e, s) {
  let i = this.parent, n = this.parentProperty, {
    flatten: o,
    wrap: h
  } = this;
  if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, e = e || this.callback, this.currOtherTypeCallback = s || this.otherTypeCallback, t = t || this.json, r = r || this.path, r && typeof r == "object" && !Array.isArray(r)) {
    if (!r.path && r.path !== "")
      throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    if (!Object.hasOwn(r, "json"))
      throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    ({
      json: t
    } = r), o = Object.hasOwn(r, "flatten") ? r.flatten : o, this.currResultType = Object.hasOwn(r, "resultType") ? r.resultType : this.currResultType, this.currSandbox = Object.hasOwn(r, "sandbox") ? r.sandbox : this.currSandbox, h = Object.hasOwn(r, "wrap") ? r.wrap : h, this.currEval = Object.hasOwn(r, "eval") ? r.eval : this.currEval, e = Object.hasOwn(r, "callback") ? r.callback : e, this.currOtherTypeCallback = Object.hasOwn(r, "otherTypeCallback") ? r.otherTypeCallback : this.currOtherTypeCallback, i = Object.hasOwn(r, "parent") ? r.parent : i, n = Object.hasOwn(r, "parentProperty") ? r.parentProperty : n, r = r.path;
  }
  if (i = i || null, n = n || null, Array.isArray(r) && (r = g.toPathString(r)), !r && r !== "" || !t)
    return;
  const l = g.toPathArray(r);
  l[0] === "$" && l.length > 1 && l.shift(), this._hasParentSelector = null;
  const c = this._trace(l, t, ["$"], i, n, e).filter(function(d) {
    return d && !d.isParentSelector;
  });
  return c.length ? !h && c.length === 1 && !c[0].hasArrExpr ? this._getPreferredOutput(c[0]) : c.reduce((d, f) => {
    const m = this._getPreferredOutput(f);
    return o && Array.isArray(m) ? d = d.concat(m) : d.push(m), d;
  }, []) : h ? [] : void 0;
};
g.prototype._getPreferredOutput = function(r) {
  const t = this.currResultType;
  switch (t) {
    case "all": {
      const e = Array.isArray(r.path) ? r.path : g.toPathArray(r.path);
      return r.pointer = g.toPointer(e), r.path = typeof r.path == "string" ? r.path : g.toPathString(r.path), r;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return r[t];
    case "path":
      return g.toPathString(r[t]);
    case "pointer":
      return g.toPointer(r.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
g.prototype._handleCallback = function(r, t, e) {
  if (t) {
    const s = this._getPreferredOutput(r);
    r.path = typeof r.path == "string" ? r.path : g.toPathString(r.path), t(s, e, r);
  }
};
g.prototype._trace = function(r, t, e, s, i, n, o, h) {
  let l;
  if (!r.length)
    return l = {
      path: e,
      value: t,
      parent: s,
      parentProperty: i,
      hasArrExpr: o
    }, this._handleCallback(l, n, "value"), l;
  const c = r[0], d = r.slice(1), f = [];
  function m(u) {
    Array.isArray(u) ? u.forEach((E) => {
      f.push(E);
    }) : f.push(u);
  }
  if ((typeof c != "string" || h) && t && Object.hasOwn(t, c))
    m(this._trace(d, t[c], x(e, c), t, c, n, o));
  else if (c === "*")
    this._walk(t, (u) => {
      m(this._trace(d, t[u], x(e, u), t, u, n, !0, !0));
    });
  else if (c === "..")
    m(this._trace(d, t, e, s, i, n, o)), this._walk(t, (u) => {
      typeof t[u] == "object" && m(this._trace(r.slice(), t[u], x(e, u), t, u, n, !0));
    });
  else {
    if (c === "^")
      return this._hasParentSelector = !0, {
        path: e.slice(0, -1),
        expr: d,
        isParentSelector: !0
      };
    if (c === "~")
      return l = {
        path: x(e, c),
        value: i,
        parent: s,
        parentProperty: null
      }, this._handleCallback(l, n, "property"), l;
    if (c === "$")
      m(this._trace(d, t, e, null, null, n, o));
    else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(c))
      m(this._slice(c, d, t, e, s, i, n));
    else if (c.indexOf("?(") === 0) {
      if (this.currEval === !1)
        throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      const u = c.replace(/^\?\((.*?)\)$/u, "$1"), E = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(u);
      E ? this._walk(t, (y) => {
        const S = [E[2]], P = E[1] ? t[y][E[1]] : t[y];
        this._trace(S, P, e, s, i, n, !0).length > 0 && m(this._trace(d, t[y], x(e, y), t, y, n, !0));
      }) : this._walk(t, (y) => {
        this._eval(u, t[y], y, e, s, i) && m(this._trace(d, t[y], x(e, y), t, y, n, !0));
      });
    } else if (c[0] === "(") {
      if (this.currEval === !1)
        throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      m(this._trace(_(this._eval(c, t, e.at(-1), e.slice(0, -1), s, i), d), t, e, s, i, n, o));
    } else if (c[0] === "@") {
      let u = !1;
      const E = c.slice(1, -2);
      switch (E) {
        case "scalar":
          (!t || !["object", "function"].includes(typeof t)) && (u = !0);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          typeof t === E && (u = !0);
          break;
        case "integer":
          Number.isFinite(t) && !(t % 1) && (u = !0);
          break;
        case "number":
          Number.isFinite(t) && (u = !0);
          break;
        case "nonFinite":
          typeof t == "number" && !Number.isFinite(t) && (u = !0);
          break;
        case "object":
          t && typeof t === E && (u = !0);
          break;
        case "array":
          Array.isArray(t) && (u = !0);
          break;
        case "other":
          u = this.currOtherTypeCallback(t, e, s, i);
          break;
        case "null":
          t === null && (u = !0);
          break;
        default:
          throw new TypeError("Unknown value type " + E);
      }
      if (u)
        return l = {
          path: e,
          value: t,
          parent: s,
          parentProperty: i
        }, this._handleCallback(l, n, "value"), l;
    } else if (c[0] === "`" && t && Object.hasOwn(t, c.slice(1))) {
      const u = c.slice(1);
      m(this._trace(d, t[u], x(e, u), t, u, n, o, !0));
    } else if (c.includes(",")) {
      const u = c.split(",");
      for (const E of u)
        m(this._trace(_(E, d), t, e, s, i, n, !0));
    } else !h && t && Object.hasOwn(t, c) && m(this._trace(d, t[c], x(e, c), t, c, n, o, !0));
  }
  if (this._hasParentSelector)
    for (let u = 0; u < f.length; u++) {
      const E = f[u];
      if (E && E.isParentSelector) {
        const y = this._trace(E.expr, t, E.path, s, i, n, o);
        if (Array.isArray(y)) {
          f[u] = y[0];
          const S = y.length;
          for (let P = 1; P < S; P++)
            u++, f.splice(u, 0, y[P]);
        } else
          f[u] = y;
      }
    }
  return f;
};
g.prototype._walk = function(r, t) {
  if (Array.isArray(r)) {
    const e = r.length;
    for (let s = 0; s < e; s++)
      t(s);
  } else r && typeof r == "object" && Object.keys(r).forEach((e) => {
    t(e);
  });
};
g.prototype._slice = function(r, t, e, s, i, n, o) {
  if (!Array.isArray(e))
    return;
  const h = e.length, l = r.split(":"), c = l[2] && Number.parseInt(l[2]) || 1;
  let d = l[0] && Number.parseInt(l[0]) || 0, f = l[1] && Number.parseInt(l[1]) || h;
  d = d < 0 ? Math.max(0, d + h) : Math.min(h, d), f = f < 0 ? Math.max(0, f + h) : Math.min(h, f);
  const m = [];
  for (let u = d; u < f; u += c)
    this._trace(_(u, t), e, s, i, n, o, !0).forEach((y) => {
      m.push(y);
    });
  return m;
};
g.prototype._eval = function(r, t, e, s, i, n) {
  this.currSandbox._$_parentProperty = n, this.currSandbox._$_parent = i, this.currSandbox._$_property = e, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
  const o = r.includes("@path");
  o && (this.currSandbox._$_path = g.toPathString(s.concat([e])));
  const h = this.currEval + "Script:" + r;
  if (!g.cache[h]) {
    let l = r.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (o && (l = l.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0)
      g.cache[h] = new this.safeVm.Script(l);
    else if (this.currEval === "native")
      g.cache[h] = new this.vm.Script(l);
    else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const c = this.currEval;
      g.cache[h] = new c(l);
    } else if (typeof this.currEval == "function")
      g.cache[h] = {
        runInNewContext: (c) => this.currEval(l, c)
      };
    else
      throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
  }
  try {
    return g.cache[h].runInNewContext(this.currSandbox);
  } catch (l) {
    if (this.ignoreEvalErrors)
      return !1;
    throw new Error("jsonPath: " + l.message + ": " + r);
  }
};
g.cache = {};
g.toPathString = function(r) {
  const t = r, e = t.length;
  let s = "$";
  for (let i = 1; i < e; i++)
    /^(~|\^|@.*?\(\))$/u.test(t[i]) || (s += /^[0-9*]+$/u.test(t[i]) ? "[" + t[i] + "]" : "['" + t[i] + "']");
  return s;
};
g.toPointer = function(r) {
  const t = r, e = t.length;
  let s = "";
  for (let i = 1; i < e; i++)
    /^(~|\^|@.*?\(\))$/u.test(t[i]) || (s += "/" + t[i].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
  return s;
};
g.toPathArray = function(r) {
  const {
    cache: t
  } = g;
  if (t[r])
    return t[r].concat();
  const e = [], i = r.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(n, o) {
    return "[#" + (e.push(o) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(n, o) {
    return "['" + o.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(n, o) {
    return ";" + o.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(n) {
    const o = n.match(/#(\d+)/u);
    return !o || !o[1] ? n : e[o[1]];
  });
  return t[r] = i, t[r].concat();
};
g.prototype.safeVm = {
  Script: it
};
const at = function(r, t, e) {
  const s = r.length;
  for (let i = 0; i < s; i++) {
    const n = r[i];
    e(n) && t.push(r.splice(i--, 1)[0]);
  }
};
class ot {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(t) {
    this.code = t;
  }
  /**
   * @param {object} context Object whose items will be added
   *   to evaluation
   * @returns {EvaluatedResult} Result of evaluated code
   */
  runInNewContext(t) {
    let e = this.code;
    const s = Object.keys(t), i = [];
    at(s, i, (c) => typeof t[c] == "function");
    const n = s.map((c) => t[c]);
    e = i.reduce((c, d) => {
      let f = t[d].toString();
      return /function/u.test(f) || (f = "function " + f), "var " + d + "=" + f + ";" + c;
    }, "") + e, !/(['"])use strict\1/u.test(e) && !s.includes("arguments") && (e = "var arguments = undefined;" + e), e = e.replace(/;\s*$/u, "");
    const h = e.lastIndexOf(";"), l = h !== -1 ? e.slice(0, h + 1) + " return " + e.slice(h + 1) : " return " + e;
    return new Function(...s, l)(...n);
  }
}
g.prototype.vm = {
  Script: ot
};
function lt(r) {
  return r ? !!(r.startsWith("$") || /\[\d+\]/.test(r) || /\[['"]/.test(r) || /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(r) || r.includes("..") || r.includes("*")) : !1;
}
function ct(r) {
  return r ? r.startsWith("$") ? r : `$.${r}` : "$";
}
function ht(r, t) {
  if (!r || !t) return [];
  try {
    const e = ct(t);
    return (g({
      path: e,
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
function ut(r, t) {
  if (!t || !r)
    return r || {};
  const e = lt(t);
  if (console.log("[jsonpath-search] search:", t, "isJsonPath:", e), e) {
    const i = ft(r, t);
    return console.log("[jsonpath-search] JSONPath result:", i), i;
  }
  const s = dt(r, t);
  return console.log("[jsonpath-search] key match result:", s), s;
}
function dt(r, t) {
  const e = t.toLowerCase(), s = {};
  for (const [i, n] of Object.entries(r || {}))
    i.toLowerCase().includes(e) && (s[i] = n);
  return s;
}
function ft(r, t) {
  const e = ht(r, t);
  if (e.length === 0)
    return {};
  if (e.length === 1) {
    const { path: i, value: n } = e[0];
    return i === "$" && typeof n == "object" && n !== null || typeof n == "object" && n !== null && !Array.isArray(n) ? n : { [R(i)]: n };
  }
  const s = {};
  for (const { path: i, value: n } of e) {
    const o = R(i) || `result_${Object.keys(s).length}`;
    o in s ? s[`${o}_${Object.keys(s).length}`] = n : s[o] = n;
  }
  return s;
}
function R(r) {
  if (!r) return "";
  const t = r.match(/\[['"]?([^'"[\]]+)['"]?\]$/);
  if (t)
    return t[1];
  const e = r.match(/\.([^.[\]]+)$/);
  return e ? e[1] : r.replace(/^\$\.?/, "");
}
const H = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], Q = /* @__PURE__ */ new Set(["shell", "console"]), j = /* @__PURE__ */ new Set([...H, ...Q]), q = {
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
}, pt = {
  template: "template",
  session: "session",
  requests: "request",
  sql: "sql",
  logs: "log",
  custom: "custom"
}, gt = {
  request: "requests",
  sql: "sql",
  log: "logs",
  template: "template",
  session: "session",
  custom: "custom"
}, I = (r) => {
  if (!r)
    return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}, bt = (r) => {
  if (!Array.isArray(r))
    return [];
  const t = [];
  return r.forEach((e) => {
    if (!e || typeof e != "object")
      return;
    const s = e, i = typeof s.command == "string" ? s.command.trim() : "";
    if (!i)
      return;
    const n = typeof s.description == "string" ? s.description.trim() : "", o = Array.isArray(s.tags) ? s.tags.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], h = Array.isArray(s.aliases) ? s.aliases.filter((c) => typeof c == "string" && c.trim() !== "").map((c) => c.trim()) : [], l = typeof s.mutates == "boolean" ? s.mutates : typeof s.read_only == "boolean" ? !s.read_only : !1;
    t.push({
      command: i,
      description: n || void 0,
      tags: o.length > 0 ? o : void 0,
      aliases: h.length > 0 ? h : void 0,
      mutates: l
    });
  }), t;
}, p = (r) => String(r ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), $ = (r) => {
  if (!r)
    return "";
  if (typeof r == "number")
    return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const t = new Date(r);
    return Number.isNaN(t.getTime()) ? r : t.toLocaleTimeString();
  }
  return "";
}, M = (r) => {
  if (r == null)
    return "0ms";
  if (typeof r == "string")
    return r;
  const t = Number(r);
  if (Number.isNaN(t))
    return "0ms";
  const e = t / 1e6;
  return e < 1 ? `${(t / 1e3).toFixed(1)}us` : e < 1e3 ? `${e.toFixed(2)}ms` : `${(e / 1e3).toFixed(2)}s`;
}, O = (r) => {
  if (r == null || r === "")
    return "0";
  const t = Number(r);
  return Number.isNaN(t) ? String(r) : t.toLocaleString();
}, k = (r) => {
  if (r === void 0)
    return "{}";
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r ?? "");
  }
}, mt = async (r, t) => {
  try {
    await navigator.clipboard.writeText(r);
    const e = t.innerHTML;
    t.innerHTML = '<i class="iconoir-check"></i> Copied', t.classList.add("debug-copy--success"), setTimeout(() => {
      t.innerHTML = e, t.classList.remove("debug-copy--success");
    }, 1500);
  } catch {
    t.classList.add("debug-copy--error"), setTimeout(() => {
      t.classList.remove("debug-copy--error");
    }, 1500);
  }
}, C = (r) => r == null ? 0 : Array.isArray(r) ? r.length : typeof r == "object" ? Object.keys(r).length : 1, yt = (r) => Array.isArray(r) && r.length > 0 ? r.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : [...H], U = (r) => q[r] ? q[r] : r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/i, "SQL").replace(/\b([a-z])/g, (t) => t.toUpperCase()) : "", B = (r, t) => ut(r, t), Et = (r, t, e) => {
  if (!r || !t)
    return;
  const s = t.split(".").map((n) => n.trim()).filter(Boolean);
  if (s.length === 0)
    return;
  let i = r;
  for (let n = 0; n < s.length - 1; n += 1) {
    const o = s[n];
    (!i[o] || typeof i[o] != "object") && (i[o] = {}), i = i[o];
  }
  i[s[s.length - 1]] = e;
}, v = (r) => Array.isArray(r) ? r : [], T = (r, t) => {
  if (!r)
    return t;
  const e = Number(r);
  return Number.isNaN(e) ? t : e;
};
class wt {
  constructor(t) {
    this.paused = !1, this.eventCount = 0, this.lastEventAt = null, this.container = t;
    const e = I(t.dataset.panels);
    this.panels = yt(e), this.activePanel = this.panels[0] || "template", this.debugPath = t.dataset.debugPath || "", this.maxLogEntries = T(t.dataset.maxLogEntries, 500), this.maxSQLQueries = T(t.dataset.maxSqlQueries, 200), this.slowThresholdMs = T(t.dataset.slowThresholdMs, 50), this.replCommands = bt(I(t.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), Q.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.renderTabs(), this.renderActivePanel(), this.bindActions(), this.stream = new K({
      basePath: this.debugPath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s)
    }), this.fetchSnapshot(), this.stream.connect(), this.stream.subscribe(this.panels.map((s) => pt[s] || s));
  }
  requireElement(t, e = this.container) {
    const s = e.querySelector(t);
    if (!s)
      throw new Error(`Missing debug element: ${t}`);
    return s;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (e) => {
      const s = e.target;
      if (!s)
        return;
      const i = s.closest("[data-panel]");
      if (!i)
        return;
      const n = i.dataset.panel || "";
      !n || n === this.activePanel || (this.activePanel = n, this.renderActivePanel());
    }), this.container.querySelectorAll("[data-debug-action]").forEach((e) => {
      e.addEventListener("click", () => {
        switch (e.dataset.debugAction || "") {
          case "snapshot":
            this.stream.requestSnapshot();
            break;
          case "clear":
            this.clearAll();
            break;
          case "pause":
            this.togglePause(e);
            break;
          case "clear-panel":
            this.clearActivePanel();
            break;
        }
      });
    });
  }
  renderTabs() {
    const t = this.panels.map((e) => `
          <button class="debug-tab ${e === this.activePanel ? "debug-tab--active" : ""}" data-panel="${p(e)}">
            <span class="debug-tab__label">${p(U(e))}</span>
            <span class="debug-tab__count" data-panel-count="${p(e)}">0</span>
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
    if (s?.filters)
      e = s.filters();
    else if (t === "requests") {
      const i = this.filters.requests;
      e = `
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
          <input type="search" data-filter="search" value="${p(i.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${i.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (t === "sql") {
      const i = this.filters.sql;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(i.search)}" placeholder="SELECT" />
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
    } else if (t === "logs") {
      const i = this.filters.logs;
      e = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions(["all", "debug", "info", "warn", "error"], i.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(i.search)}" placeholder="database" />
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
    } else if (t === "routes") {
      const i = this.filters.routes;
      e = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions(["all", "GET", "POST", "PUT", "PATCH", "DELETE"], i.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${p(i.search)}" placeholder="/admin" />
        </div>
      `;
    } else {
      const i = this.filters.objects;
      e = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${p(i.search)}" placeholder="user.roles[0].name" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = e || '<span class="timestamp">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((e) => {
      e.addEventListener("input", () => this.updateFiltersFromInputs()), e.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const t = this.activePanel, e = this.filtersEl.querySelectorAll("[data-filter]");
    if (t === "requests") {
      const s = { ...this.filters.requests };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "newestFirst" ? s[n] = i.checked : n && n in s && (s[n] = i.value);
      }), this.filters.requests = s;
    } else if (t === "sql") {
      const s = { ...this.filters.sql };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "slowOnly" || n === "errorOnly" || n === "newestFirst" ? s[n] = i.checked : n === "search" && (s[n] = i.value);
      }), this.filters.sql = s;
    } else if (t === "logs") {
      const s = { ...this.filters.logs };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n === "autoScroll" || n === "newestFirst" ? s[n] = i.checked : (n === "level" || n === "search") && (s[n] = i.value);
      }), this.filters.logs = s;
    } else if (t === "routes") {
      const s = { ...this.filters.routes };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in s && (s[n] = i.value);
      }), this.filters.routes = s;
    } else {
      const s = { ...this.filters.objects };
      e.forEach((i) => {
        const n = i.dataset.filter || "";
        n && n in s && (s[n] = i.value);
      }), this.filters.objects = s;
    }
    this.renderPanel();
  }
  renderPanel() {
    const t = this.activePanel, e = this.panelRenderers.get(t);
    if (e) {
      e.render();
      return;
    }
    this.panelEl.classList.remove("debug-content--repl");
    let s = "";
    t === "template" ? s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search) : t === "session" ? s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search) : t === "config" ? s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search) : t === "requests" ? s = this.renderRequests() : t === "sql" ? s = this.renderSQL() : t === "logs" ? s = this.renderLogs() : t === "routes" ? s = this.renderRoutes() : t === "custom" ? s = this.renderCustom() : s = this.renderJSONPanel(U(t), this.state.extra[t], this.filters.objects.search), this.panelEl.innerHTML = s, t === "logs" && this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight), this.attachExpandableRowListeners(), this.attachCopyButtonListeners();
  }
  attachExpandableRowListeners() {
    this.panelEl.querySelectorAll(".expandable-row").forEach((t) => {
      t.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) return;
        e.currentTarget.classList.toggle("expanded");
      });
    });
  }
  attachCopyButtonListeners() {
    this.panelEl.querySelectorAll("[data-copy-trigger]").forEach((t) => {
      t.addEventListener("click", (e) => {
        e.preventDefault(), e.stopPropagation();
        const s = t.closest("[data-copy-content]");
        if (!s) return;
        const i = s.getAttribute("data-copy-content") || "";
        mt(i, t);
      });
    });
  }
  renderReplPanel(t) {
    this.panelEl.classList.add("debug-content--repl");
    let e = this.replPanels.get(t);
    e || (e = new z({
      kind: t === "shell" ? "shell" : "console",
      debugPath: this.debugPath,
      commands: t === "console" ? this.replCommands : []
    }), this.replPanels.set(t, e)), e.attach(this.panelEl);
  }
  renderRequests() {
    const { method: t, status: e, search: s, newestFirst: i } = this.filters.requests, n = s.toLowerCase();
    let o = this.state.requests.filter((l) => !(t !== "all" && (l.method || "").toUpperCase() !== t || e !== "all" && String(l.status || "") !== e || n && !(l.path || "").toLowerCase().includes(n)));
    return o.length === 0 ? this.renderEmptyState("No requests captured yet.") : (i && (o = [...o].reverse()), `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>${o.map((l) => {
      const c = `badge--method-${(l.method || "get").toLowerCase()}`, d = l.status || 0, f = d >= 500 ? "badge--status-error" : d >= 400 ? "badge--status-warn" : "badge--status", m = d >= 400 ? "error" : "", u = l.duration || 0, y = (typeof u == "number" ? u / 1e6 : 0) >= this.slowThresholdMs ? "duration--slow" : "";
      return `
          <tr class="${m}">
            <td><span class="badge ${c}">${p(l.method || "GET")}</span></td>
            <td><span class="path">${p(l.path || "")}</span></td>
            <td><span class="badge ${f}">${p(d)}</span></td>
            <td><span class="duration ${y}">${M(l.duration)}</span></td>
            <td><span class="timestamp">${p($(l.timestamp))}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `);
  }
  renderSQL() {
    const { search: t, slowOnly: e, errorOnly: s, newestFirst: i } = this.filters.sql, n = t.toLowerCase();
    let o = this.state.sql.filter((l) => !(s && !l.error || e && !this.isSlowQuery(l) || n && !(l.query || "").toLowerCase().includes(n)));
    return o.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : (i && (o = [...o].reverse()), `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Duration</th>
            <th>Rows</th>
            <th>Time</th>
            <th>Status</th>
            <th>Query</th>
          </tr>
        </thead>
        <tbody>${o.map((l, c) => {
      const d = this.isSlowQuery(l), f = !!l.error, m = ["expandable-row"];
      f && m.push("error"), d && m.push("slow");
      const u = d ? "duration--slow" : "", E = `sql-row-${c}`, y = l.query || "", S = X(y, !0);
      return `
          <tr class="${m.join(" ")}" data-row-id="${E}">
            <td><span class="duration ${u}">${M(l.duration)}</span></td>
            <td>${p(O(l.row_count || 0))}</td>
            <td><span class="timestamp">${p($(l.timestamp))}</span></td>
            <td>${f ? '<span class="badge badge--status-error">Error</span>' : ""}</td>
            <td><span class="query-text"><span class="expand-icon">&#9654;</span>${p(y)}</span></td>
          </tr>
          <tr class="expansion-row" data-expansion-for="${E}">
            <td colspan="5">
              <div class="expanded-content" data-copy-content="${p(y)}">
                <div class="expanded-content__header">
                  <button class="debug-btn debug-copy debug-copy--sm" data-copy-trigger="${E}" title="Copy SQL">
                    <i class="iconoir-copy"></i> Copy
                  </button>
                </div>
                <pre>${S}</pre>
              </div>
            </td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `);
  }
  renderLogs() {
    const { level: t, search: e, newestFirst: s } = this.filters.logs, i = e.toLowerCase();
    let n = this.state.logs.filter((h) => {
      if (t !== "all" && (h.level || "").toLowerCase() !== t)
        return !1;
      const l = `${h.message || ""} ${h.source || ""} ${k(h.fields || {})}`.toLowerCase();
      return !(i && !l.includes(i));
    });
    return n.length === 0 ? this.renderEmptyState("No logs captured yet.") : (s && (n = [...n].reverse()), `
      <table class="debug-table">
        <thead>
          <tr>
            <th>Level</th>
            <th>Time</th>
            <th>Message</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${n.map((h) => {
      const l = (h.level || "info").toLowerCase(), c = `badge--level-${l}`;
      return `
          <tr class="${l === "error" || l === "fatal" ? "error" : ""}">
            <td><span class="badge ${c}">${p((h.level || "info").toUpperCase())}</span></td>
            <td><span class="timestamp">${p($(h.timestamp))}</span></td>
            <td><span class="message">${p(h.message || "")}</span></td>
            <td><span class="timestamp">${p(h.source || "")}</span></td>
          </tr>
        `;
    }).join("")}</tbody>
      </table>
    `);
  }
  renderRoutes() {
    const { method: t, search: e } = this.filters.routes, s = e.toLowerCase(), i = this.state.routes.filter((o) => {
      if (t !== "all" && (o.method || "").toUpperCase() !== t)
        return !1;
      const h = `${o.path || ""} ${o.handler || ""} ${o.summary || ""}`.toLowerCase();
      return !(s && !h.includes(s));
    });
    return i.length === 0 ? this.renderEmptyState("No routes captured yet.") : `
      <table class="debug-table debug-routes-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Handler</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>${i.map((o) => `
          <tr>
            <td><span class="badge ${`badge--method-${(o.method || "get").toLowerCase()}`}">${p(o.method || "")}</span></td>
            <td><span class="path">${p(o.path || "")}</span></td>
            <td><span class="timestamp">${p(o.handler || "")}</span></td>
            <td><span class="timestamp">${p(o.name || "")}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: t } = this.filters.custom, e = B(this.state.custom.data, t), s = this.state.custom.logs, i = D(e, !0), n = k(e), o = s.length ? s.map((l) => `
              <tr>
                <td><span class="badge badge--custom">${p(l.category || "custom")}</span></td>
                <td><span class="timestamp">${p($(l.timestamp))}</span></td>
                <td><span class="message">${p(l.message || "")}</span></td>
              </tr>
            `).join("") : "", h = s.length ? `
        <table class="debug-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Time</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${o}</tbody>
        </table>
      ` : this.renderEmptyState("No custom logs yet.");
    return `
      <div class="debug-json-grid">
        <div class="debug-json-panel" data-copy-content="${p(n)}">
          <div class="debug-json-header">
            <h3>Custom Data</h3>
            <div class="debug-json-actions">
              <span class="timestamp">${O(C(e))} keys</span>
              <button class="debug-btn debug-copy" data-copy-trigger="custom-data" title="Copy to clipboard">
                <i class="iconoir-copy"></i> Copy
              </button>
            </div>
          </div>
          <div class="debug-json-content">
            <pre>${i}</pre>
          </div>
        </div>
        <div class="debug-json-panel">
          <div class="debug-json-header">
            <h3>Custom Logs</h3>
            <span class="timestamp">${O(s.length)} entries</span>
          </div>
          <div class="debug-json-content">
            ${h}
          </div>
        </div>
      </div>
    `;
  }
  renderJSONPanel(t, e, s) {
    const i = e && typeof e == "object" && !Array.isArray(e), n = Array.isArray(e), o = i ? B(e || {}, s) : e ?? {}, h = C(o), l = n ? "items" : i ? "keys" : "entries", c = D(o, !0), d = k(o), f = `copy-${t.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    return `
      <section class="debug-json-panel" data-copy-content="${p(d)}">
        <div class="debug-json-header">
          <h3>${p(t)}</h3>
          <div class="debug-json-actions">
            <span class="debug-muted">${O(h)} ${l}</span>
            <button class="debug-btn debug-copy" data-copy-trigger="${f}" title="Copy to clipboard">
              <i class="iconoir-copy"></i> Copy
            </button>
          </div>
        </div>
        <pre>${c}</pre>
      </section>
    `;
  }
  panelCount(t) {
    switch (t) {
      case "template":
        return C(this.state.template);
      case "session":
        return C(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return C(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "custom":
        return C(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return C(this.state.extra[t]);
    }
  }
  renderEmptyState(t) {
    return `
      <div class="debug-empty">
        <p>${p(t)}</p>
      </div>
    `;
  }
  renderSelectOptions(t, e) {
    return t.map((s) => {
      const i = s.toLowerCase() === e.toLowerCase() ? "selected" : "";
      return `<option value="${p(s)}" ${i}>${p(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((t) => {
      const e = this.panelCount(t), s = this.tabsEl.querySelector(`[data-panel-count="${t}"]`);
      s && (s.textContent = O(e));
    });
  }
  updateConnectionStatus(t) {
    this.connectionEl.textContent = t, this.statusEl.setAttribute("data-status", t);
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${O(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(t) {
    if (!t || !t.type)
      return;
    if (t.type === "snapshot") {
      this.applySnapshot(t.payload);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused)
      return;
    const e = gt[t.type] || t.type;
    switch (t.type) {
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
        j.has(e) || (this.state.extra[e] = t.payload);
        break;
    }
    this.updateTabCounts(), e === this.activePanel && this.renderPanel();
  }
  handleCustomEvent(t) {
    if (t) {
      if (typeof t == "object" && "key" in t && "value" in t) {
        Et(this.state.custom.data, String(t.key), t.value);
        return;
      }
      if (typeof t == "object" && ("category" in t || "message" in t)) {
        this.state.custom.logs.push(t), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  applySnapshot(t) {
    const e = t || {};
    this.state.template = e.template || {}, this.state.session = e.session || {}, this.state.requests = v(e.requests), this.state.sql = v(e.sql), this.state.logs = v(e.logs), this.state.config = e.config || {}, this.state.routes = v(e.routes);
    const s = e.custom || {};
    this.state.custom = {
      data: s.data || {},
      logs: v(s.logs)
    };
    const i = {};
    this.panels.forEach((n) => {
      !j.has(n) && n in e && (i[n] = e[n]);
    }), this.state.extra = i, this.updateTabCounts(), this.renderPanel();
  }
  trim(t, e) {
    if (!(!Array.isArray(t) || e <= 0))
      for (; t.length > e; )
        t.shift();
  }
  isSlowQuery(t) {
    if (!t || t.duration === void 0 || t.duration === null)
      return !1;
    const e = Number(t.duration);
    return Number.isNaN(e) ? !1 : e / 1e6 >= this.slowThresholdMs;
  }
  async fetchSnapshot() {
    if (this.debugPath)
      try {
        const t = await fetch(`${this.debugPath}/api/snapshot`, {
          credentials: "same-origin"
        });
        if (!t.ok)
          return;
        const e = await t.json();
        this.applySnapshot(e);
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
    const t = this.activePanel;
    this.stream.clear([t]), fetch(`${this.debugPath}/api/clear/${t}`, { method: "POST", credentials: "same-origin" }).catch(() => {
    });
  }
  togglePause(t) {
    this.paused = !this.paused, t.textContent = this.paused ? "Resume" : "Pause", this.paused || this.stream.requestSnapshot();
  }
}
const xt = (r) => {
  const t = r || document.querySelector("[data-debug-console]");
  return t ? new wt(t) : null;
}, F = () => {
  xt();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", F) : F();
export {
  wt as DebugPanel,
  K as DebugStream,
  xt as initDebugPanel
};
//# sourceMappingURL=index.js.map
