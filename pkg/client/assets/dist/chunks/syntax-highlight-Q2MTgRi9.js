const Q = (E) => {
  const c = (E || "").trim();
  return c ? c.startsWith("/") ? c.replace(/\/+$/, "") : `/${c.replace(/\/+$/, "")}` : "";
}, ee = (E) => {
  const c = window.location.protocol === "https:" ? "wss:" : "ws:", n = Q(E);
  return `${c}//${window.location.host}${n}/ws`;
};
class ie {
  constructor(c) {
    this.ws = null, this.reconnectTimer = null, this.reconnectAttempts = 0, this.manualClose = !1, this.pendingCommands = [], this.status = "disconnected", this.options = c;
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;
    this.manualClose = !1;
    const c = ee(this.options.basePath);
    this.ws = new WebSocket(c), this.ws.onopen = () => {
      this.reconnectAttempts = 0, this.setStatus("connected"), this.flushPending();
    }, this.ws.onmessage = (n) => {
      if (!(!n || typeof n.data != "string"))
        try {
          const u = JSON.parse(n.data);
          this.options.onEvent?.(u);
        } catch {
        }
    }, this.ws.onclose = () => {
      if (this.ws = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting"), this.scheduleReconnect();
    }, this.ws.onerror = (n) => {
      this.options.onError?.(n), this.setStatus("error");
    };
  }
  close() {
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.ws && this.ws.close();
  }
  sendCommand(c) {
    if (!(!c || !c.type)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(c));
        return;
      }
      this.pendingCommands.push(c);
    }
  }
  subscribe(c) {
    this.sendCommand({ type: "subscribe", panels: c });
  }
  unsubscribe(c) {
    this.sendCommand({ type: "unsubscribe", panels: c });
  }
  requestSnapshot() {
    this.sendCommand({ type: "snapshot" });
  }
  clear(c) {
    this.sendCommand({ type: "clear", panels: c });
  }
  getStatus() {
    return this.status;
  }
  setStatus(c) {
    this.status !== c && (this.status = c, this.options.onStatusChange?.(c));
  }
  flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.pendingCommands.length === 0)
      return;
    const c = [...this.pendingCommands];
    this.pendingCommands = [];
    for (const n of c)
      this.ws.send(JSON.stringify(n));
  }
  scheduleReconnect() {
    const c = this.options.maxReconnectAttempts ?? 8, n = this.options.reconnectDelayMs ?? 1e3, u = this.options.maxReconnectDelayMs ?? 12e3;
    if (this.reconnectAttempts >= c) {
      this.setStatus("disconnected");
      return;
    }
    const p = this.reconnectAttempts, T = Math.min(n * Math.pow(2, p), u), I = T * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, T + I);
  }
}
var z = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function te(E) {
  return E && E.__esModule && Object.prototype.hasOwnProperty.call(E, "default") ? E.default : E;
}
var K = { exports: {} };
(function(E) {
  var c = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
  /**
   * Prism: Lightweight, robust, elegant syntax highlighting
   *
   * @license MIT <https://opensource.org/licenses/MIT>
   * @author Lea Verou <https://lea.verou.me>
   * @namespace
   * @public
   */
  var n = function(u) {
    var p = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, T = 0, I = {}, i = {
      /**
       * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
       * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
       * additional languages or plugins yourself.
       *
       * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
       *
       * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
       * empty Prism object into the global scope before loading the Prism script like this:
       *
       * ```js
       * window.Prism = window.Prism || {};
       * Prism.manual = true;
       * // add a new <script> to load Prism's script
       * ```
       *
       * @default false
       * @type {boolean}
       * @memberof Prism
       * @public
       */
      manual: u.Prism && u.Prism.manual,
      /**
       * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
       * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
       * own worker, you don't want it to do this.
       *
       * By setting this value to `true`, Prism will not add its own listeners to the worker.
       *
       * You obviously have to change this value before Prism executes. To do this, you can add an
       * empty Prism object into the global scope before loading the Prism script like this:
       *
       * ```js
       * window.Prism = window.Prism || {};
       * Prism.disableWorkerMessageHandler = true;
       * // Load Prism's script
       * ```
       *
       * @default false
       * @type {boolean}
       * @memberof Prism
       * @public
       */
      disableWorkerMessageHandler: u.Prism && u.Prism.disableWorkerMessageHandler,
      /**
       * A namespace for utility methods.
       *
       * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
       * change or disappear at any time.
       *
       * @namespace
       * @memberof Prism
       */
      util: {
        encode: function t(e) {
          return e instanceof h ? new h(e.type, t(e.content), e.alias) : Array.isArray(e) ? e.map(t) : e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
        },
        /**
         * Returns the name of the type of the given value.
         *
         * @param {any} o
         * @returns {string}
         * @example
         * type(null)      === 'Null'
         * type(undefined) === 'Undefined'
         * type(123)       === 'Number'
         * type('foo')     === 'String'
         * type(true)      === 'Boolean'
         * type([1, 2])    === 'Array'
         * type({})        === 'Object'
         * type(String)    === 'Function'
         * type(/abc+/)    === 'RegExp'
         */
        type: function(t) {
          return Object.prototype.toString.call(t).slice(8, -1);
        },
        /**
         * Returns a unique number for the given object. Later calls will still return the same number.
         *
         * @param {Object} obj
         * @returns {number}
         */
        objId: function(t) {
          return t.__id || Object.defineProperty(t, "__id", { value: ++T }), t.__id;
        },
        /**
         * Creates a deep clone of the given object.
         *
         * The main intended use of this function is to clone language definitions.
         *
         * @param {T} o
         * @param {Record<number, any>} [visited]
         * @returns {T}
         * @template T
         */
        clone: function t(e, a) {
          a = a || {};
          var r, s;
          switch (i.util.type(e)) {
            case "Object":
              if (s = i.util.objId(e), a[s])
                return a[s];
              r = /** @type {Record<string, any>} */
              {}, a[s] = r;
              for (var l in e)
                e.hasOwnProperty(l) && (r[l] = t(e[l], a));
              return (
                /** @type {any} */
                r
              );
            case "Array":
              return s = i.util.objId(e), a[s] ? a[s] : (r = [], a[s] = r, /** @type {Array} */
              /** @type {any} */
              e.forEach(function(g, o) {
                r[o] = t(g, a);
              }), /** @type {any} */
              r);
            default:
              return e;
          }
        },
        /**
         * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
         *
         * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
         *
         * @param {Element} element
         * @returns {string}
         */
        getLanguage: function(t) {
          for (; t; ) {
            var e = p.exec(t.className);
            if (e)
              return e[1].toLowerCase();
            t = t.parentElement;
          }
          return "none";
        },
        /**
         * Sets the Prism `language-xxxx` class of the given element.
         *
         * @param {Element} element
         * @param {string} language
         * @returns {void}
         */
        setLanguage: function(t, e) {
          t.className = t.className.replace(RegExp(p, "gi"), ""), t.classList.add("language-" + e);
        },
        /**
         * Returns the script element that is currently executing.
         *
         * This does __not__ work for line script element.
         *
         * @returns {HTMLScriptElement | null}
         */
        currentScript: function() {
          if (typeof document > "u")
            return null;
          if (document.currentScript && document.currentScript.tagName === "SCRIPT")
            return (
              /** @type {any} */
              document.currentScript
            );
          try {
            throw new Error();
          } catch (r) {
            var t = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack) || [])[1];
            if (t) {
              var e = document.getElementsByTagName("script");
              for (var a in e)
                if (e[a].src == t)
                  return e[a];
            }
            return null;
          }
        },
        /**
         * Returns whether a given class is active for `element`.
         *
         * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
         * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
         * given class is just the given class with a `no-` prefix.
         *
         * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
         * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
         * ancestors have the given class or the negated version of it, then the default activation will be returned.
         *
         * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
         * version of it, the class is considered active.
         *
         * @param {Element} element
         * @param {string} className
         * @param {boolean} [defaultActivation=false]
         * @returns {boolean}
         */
        isActive: function(t, e, a) {
          for (var r = "no-" + e; t; ) {
            var s = t.classList;
            if (s.contains(e))
              return !0;
            if (s.contains(r))
              return !1;
            t = t.parentElement;
          }
          return !!a;
        }
      },
      /**
       * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
       *
       * @namespace
       * @memberof Prism
       * @public
       */
      languages: {
        /**
         * The grammar for plain, unformatted text.
         */
        plain: I,
        plaintext: I,
        text: I,
        txt: I,
        /**
         * Creates a deep copy of the language with the given id and appends the given tokens.
         *
         * If a token in `redef` also appears in the copied language, then the existing token in the copied language
         * will be overwritten at its original position.
         *
         * ## Best practices
         *
         * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
         * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
         * understand the language definition because, normally, the order of tokens matters in Prism grammars.
         *
         * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
         * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
         *
         * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
         * @param {Grammar} redef The new tokens to append.
         * @returns {Grammar} The new language created.
         * @public
         * @example
         * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
         *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
         *     // at its original position
         *     'comment': { ... },
         *     // CSS doesn't have a 'color' token, so this token will be appended
         *     'color': /\b(?:red|green|blue)\b/
         * });
         */
        extend: function(t, e) {
          var a = i.util.clone(i.languages[t]);
          for (var r in e)
            a[r] = e[r];
          return a;
        },
        /**
         * Inserts tokens _before_ another token in a language definition or any other grammar.
         *
         * ## Usage
         *
         * This helper method makes it easy to modify existing languages. For example, the CSS language definition
         * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
         * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
         * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
         * this:
         *
         * ```js
         * Prism.languages.markup.style = {
         *     // token
         * };
         * ```
         *
         * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
         * before existing tokens. For the CSS example above, you would use it like this:
         *
         * ```js
         * Prism.languages.insertBefore('markup', 'cdata', {
         *     'style': {
         *         // token
         *     }
         * });
         * ```
         *
         * ## Special cases
         *
         * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
         * will be ignored.
         *
         * This behavior can be used to insert tokens after `before`:
         *
         * ```js
         * Prism.languages.insertBefore('markup', 'comment', {
         *     'comment': Prism.languages.markup.comment,
         *     // tokens after 'comment'
         * });
         * ```
         *
         * ## Limitations
         *
         * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
         * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
         * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
         * deleting properties which is necessary to insert at arbitrary positions.
         *
         * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
         * Instead, it will create a new object and replace all references to the target object with the new one. This
         * can be done without temporarily deleting properties, so the iteration order is well-defined.
         *
         * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
         * you hold the target object in a variable, then the value of the variable will not change.
         *
         * ```js
         * var oldMarkup = Prism.languages.markup;
         * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
         *
         * assert(oldMarkup !== Prism.languages.markup);
         * assert(newMarkup === Prism.languages.markup);
         * ```
         *
         * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
         * object to be modified.
         * @param {string} before The key to insert before.
         * @param {Grammar} insert An object containing the key-value pairs to be inserted.
         * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
         * object to be modified.
         *
         * Defaults to `Prism.languages`.
         * @returns {Grammar} The new grammar object.
         * @public
         */
        insertBefore: function(t, e, a, r) {
          r = r || /** @type {any} */
          i.languages;
          var s = r[t], l = {};
          for (var g in s)
            if (s.hasOwnProperty(g)) {
              if (g == e)
                for (var o in a)
                  a.hasOwnProperty(o) && (l[o] = a[o]);
              a.hasOwnProperty(g) || (l[g] = s[g]);
            }
          var A = r[t];
          return r[t] = l, i.languages.DFS(i.languages, function(R, F) {
            F === A && R != t && (this[R] = l);
          }), l;
        },
        // Traverse a language definition with Depth First Search
        DFS: function t(e, a, r, s) {
          s = s || {};
          var l = i.util.objId;
          for (var g in e)
            if (e.hasOwnProperty(g)) {
              a.call(e, g, e[g], r || g);
              var o = e[g], A = i.util.type(o);
              A === "Object" && !s[l(o)] ? (s[l(o)] = !0, t(o, a, null, s)) : A === "Array" && !s[l(o)] && (s[l(o)] = !0, t(o, a, g, s));
            }
        }
      },
      plugins: {},
      /**
       * This is the most high-level function in Prism’s API.
       * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
       * each one of them.
       *
       * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
       *
       * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
       * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
       * @memberof Prism
       * @public
       */
      highlightAll: function(t, e) {
        i.highlightAllUnder(document, t, e);
      },
      /**
       * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
       * {@link Prism.highlightElement} on each one of them.
       *
       * The following hooks will be run:
       * 1. `before-highlightall`
       * 2. `before-all-elements-highlight`
       * 3. All hooks of {@link Prism.highlightElement} for each element.
       *
       * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
       * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
       * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
       * @memberof Prism
       * @public
       */
      highlightAllUnder: function(t, e, a) {
        var r = {
          callback: a,
          container: t,
          selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
        };
        i.hooks.run("before-highlightall", r), r.elements = Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)), i.hooks.run("before-all-elements-highlight", r);
        for (var s = 0, l; l = r.elements[s++]; )
          i.highlightElement(l, e === !0, r.callback);
      },
      /**
       * Highlights the code inside a single element.
       *
       * The following hooks will be run:
       * 1. `before-sanity-check`
       * 2. `before-highlight`
       * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
       * 4. `before-insert`
       * 5. `after-highlight`
       * 6. `complete`
       *
       * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
       * the element's language.
       *
       * @param {Element} element The element containing the code.
       * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
       * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
       * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
       * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
       *
       * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
       * asynchronous highlighting to work. You can build your own bundle on the
       * [Download page](https://prismjs.com/download.html).
       * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
       * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
       * @memberof Prism
       * @public
       */
      highlightElement: function(t, e, a) {
        var r = i.util.getLanguage(t), s = i.languages[r];
        i.util.setLanguage(t, r);
        var l = t.parentElement;
        l && l.nodeName.toLowerCase() === "pre" && i.util.setLanguage(l, r);
        var g = t.textContent, o = {
          element: t,
          language: r,
          grammar: s,
          code: g
        };
        function A(F) {
          o.highlightedCode = F, i.hooks.run("before-insert", o), o.element.innerHTML = o.highlightedCode, i.hooks.run("after-highlight", o), i.hooks.run("complete", o), a && a.call(o.element);
        }
        if (i.hooks.run("before-sanity-check", o), l = o.element.parentElement, l && l.nodeName.toLowerCase() === "pre" && !l.hasAttribute("tabindex") && l.setAttribute("tabindex", "0"), !o.code) {
          i.hooks.run("complete", o), a && a.call(o.element);
          return;
        }
        if (i.hooks.run("before-highlight", o), !o.grammar) {
          A(i.util.encode(o.code));
          return;
        }
        if (e && u.Worker) {
          var R = new Worker(i.filename);
          R.onmessage = function(F) {
            A(F.data);
          }, R.postMessage(JSON.stringify({
            language: o.language,
            code: o.code,
            immediateClose: !0
          }));
        } else
          A(i.highlight(o.code, o.grammar, o.language));
      },
      /**
       * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
       * and the language definitions to use, and returns a string with the HTML produced.
       *
       * The following hooks will be run:
       * 1. `before-tokenize`
       * 2. `after-tokenize`
       * 3. `wrap`: On each {@link Token}.
       *
       * @param {string} text A string with the code to be highlighted.
       * @param {Grammar} grammar An object containing the tokens to use.
       *
       * Usually a language definition like `Prism.languages.markup`.
       * @param {string} language The name of the language definition passed to `grammar`.
       * @returns {string} The highlighted HTML.
       * @memberof Prism
       * @public
       * @example
       * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
       */
      highlight: function(t, e, a) {
        var r = {
          code: t,
          grammar: e,
          language: a
        };
        if (i.hooks.run("before-tokenize", r), !r.grammar)
          throw new Error('The language "' + r.language + '" has no grammar.');
        return r.tokens = i.tokenize(r.code, r.grammar), i.hooks.run("after-tokenize", r), h.stringify(i.util.encode(r.tokens), r.language);
      },
      /**
       * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
       * and the language definitions to use, and returns an array with the tokenized code.
       *
       * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
       *
       * This method could be useful in other contexts as well, as a very crude parser.
       *
       * @param {string} text A string with the code to be highlighted.
       * @param {Grammar} grammar An object containing the tokens to use.
       *
       * Usually a language definition like `Prism.languages.markup`.
       * @returns {TokenStream} An array of strings and tokens, a token stream.
       * @memberof Prism
       * @public
       * @example
       * let code = `var foo = 0;`;
       * let tokens = Prism.tokenize(code, Prism.languages.javascript);
       * tokens.forEach(token => {
       *     if (token instanceof Prism.Token && token.type === 'number') {
       *         console.log(`Found numeric literal: ${token.content}`);
       *     }
       * });
       */
      tokenize: function(t, e) {
        var a = e.rest;
        if (a) {
          for (var r in a)
            e[r] = a[r];
          delete e.rest;
        }
        var s = new d();
        return y(s, s.head, t), O(t, s, e, s.head, 0), U(s);
      },
      /**
       * @namespace
       * @memberof Prism
       * @public
       */
      hooks: {
        all: {},
        /**
         * Adds the given callback to the list of callbacks for the given hook.
         *
         * The callback will be invoked when the hook it is registered for is run.
         * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
         *
         * One callback function can be registered to multiple hooks and the same hook multiple times.
         *
         * @param {string} name The name of the hook.
         * @param {HookCallback} callback The callback function which is given environment variables.
         * @public
         */
        add: function(t, e) {
          var a = i.hooks.all;
          a[t] = a[t] || [], a[t].push(e);
        },
        /**
         * Runs a hook invoking all registered callbacks with the given environment variables.
         *
         * Callbacks will be invoked synchronously and in the order in which they were registered.
         *
         * @param {string} name The name of the hook.
         * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
         * @public
         */
        run: function(t, e) {
          var a = i.hooks.all[t];
          if (!(!a || !a.length))
            for (var r = 0, s; s = a[r++]; )
              s(e);
        }
      },
      Token: h
    };
    u.Prism = i;
    function h(t, e, a, r) {
      this.type = t, this.content = e, this.alias = a, this.length = (r || "").length | 0;
    }
    h.stringify = function t(e, a) {
      if (typeof e == "string")
        return e;
      if (Array.isArray(e)) {
        var r = "";
        return e.forEach(function(A) {
          r += t(A, a);
        }), r;
      }
      var s = {
        type: e.type,
        content: t(e.content, a),
        tag: "span",
        classes: ["token", e.type],
        attributes: {},
        language: a
      }, l = e.alias;
      l && (Array.isArray(l) ? Array.prototype.push.apply(s.classes, l) : s.classes.push(l)), i.hooks.run("wrap", s);
      var g = "";
      for (var o in s.attributes)
        g += " " + o + '="' + (s.attributes[o] || "").replace(/"/g, "&quot;") + '"';
      return "<" + s.tag + ' class="' + s.classes.join(" ") + '"' + g + ">" + s.content + "</" + s.tag + ">";
    };
    function v(t, e, a, r) {
      t.lastIndex = e;
      var s = t.exec(a);
      if (s && r && s[1]) {
        var l = s[1].length;
        s.index += l, s[0] = s[0].slice(l);
      }
      return s;
    }
    function O(t, e, a, r, s, l) {
      for (var g in a)
        if (!(!a.hasOwnProperty(g) || !a[g])) {
          var o = a[g];
          o = Array.isArray(o) ? o : [o];
          for (var A = 0; A < o.length; ++A) {
            if (l && l.cause == g + "," + A)
              return;
            var R = o[A], F = R.inside, W = !!R.lookbehind, Y = !!R.greedy, V = R.alias;
            if (Y && !R.pattern.global) {
              var Z = R.pattern.toString().match(/[imsuy]*$/)[0];
              R.pattern = RegExp(R.pattern.source, Z + "g");
            }
            for (var j = R.pattern || R, N = r.next, L = s; N !== e.tail && !(l && L >= l.reach); L += N.value.length, N = N.next) {
              var w = N.value;
              if (e.length > t.length)
                return;
              if (!(w instanceof h)) {
                var M = 1, b;
                if (Y) {
                  if (b = v(j, L, t, W), !b || b.index >= t.length)
                    break;
                  var P = b.index, J = b.index + b[0].length, C = L;
                  for (C += N.value.length; P >= C; )
                    N = N.next, C += N.value.length;
                  if (C -= N.value.length, L = C, N.value instanceof h)
                    continue;
                  for (var D = N; D !== e.tail && (C < J || typeof D.value == "string"); D = D.next)
                    M++, C += D.value.length;
                  M--, w = t.slice(L, C), b.index -= L;
                } else if (b = v(j, 0, w, W), !b)
                  continue;
                var P = b.index, k = b[0], G = w.slice(0, P), X = w.slice(P + k.length), H = L + w.length;
                l && H > l.reach && (l.reach = H);
                var $ = N.prev;
                G && ($ = y(e, $, G), L += G.length), x(e, $, M);
                var q = new h(g, F ? i.tokenize(k, F) : k, V, k);
                if (N = y(e, $, q), X && y(e, N, X), M > 1) {
                  var _ = {
                    cause: g + "," + A,
                    reach: H
                  };
                  O(t, e, a, N.prev, L, _), l && _.reach > l.reach && (l.reach = _.reach);
                }
              }
            }
          }
        }
    }
    function d() {
      var t = { value: null, prev: null, next: null }, e = { value: null, prev: t, next: null };
      t.next = e, this.head = t, this.tail = e, this.length = 0;
    }
    function y(t, e, a) {
      var r = e.next, s = { value: a, prev: e, next: r };
      return e.next = s, r.prev = s, t.length++, s;
    }
    function x(t, e, a) {
      for (var r = e.next, s = 0; s < a && r !== t.tail; s++)
        r = r.next;
      e.next = r, r.prev = e, t.length -= s;
    }
    function U(t) {
      for (var e = [], a = t.head.next; a !== t.tail; )
        e.push(a.value), a = a.next;
      return e;
    }
    if (!u.document)
      return u.addEventListener && (i.disableWorkerMessageHandler || u.addEventListener("message", function(t) {
        var e = JSON.parse(t.data), a = e.language, r = e.code, s = e.immediateClose;
        u.postMessage(i.highlight(r, i.languages[a], a)), s && u.close();
      }, !1)), i;
    var S = i.util.currentScript();
    S && (i.filename = S.src, S.hasAttribute("data-manual") && (i.manual = !0));
    function f() {
      i.manual || i.highlightAll();
    }
    if (!i.manual) {
      var m = document.readyState;
      m === "loading" || m === "interactive" && S && S.defer ? document.addEventListener("DOMContentLoaded", f) : window.requestAnimationFrame ? window.requestAnimationFrame(f) : window.setTimeout(f, 16);
    }
    return i;
  }(c);
  E.exports && (E.exports = n), typeof z < "u" && (z.Prism = n), n.languages.markup = {
    comment: {
      pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
      greedy: !0
    },
    prolog: {
      pattern: /<\?[\s\S]+?\?>/,
      greedy: !0
    },
    doctype: {
      // https://www.w3.org/TR/xml/#NT-doctypedecl
      pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
      greedy: !0,
      inside: {
        "internal-subset": {
          pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
          lookbehind: !0,
          greedy: !0,
          inside: null
          // see below
        },
        string: {
          pattern: /"[^"]*"|'[^']*'/,
          greedy: !0
        },
        punctuation: /^<!|>$|[[\]]/,
        "doctype-tag": /^DOCTYPE/i,
        name: /[^\s<>'"]+/
      }
    },
    cdata: {
      pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
      greedy: !0
    },
    tag: {
      pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
      greedy: !0,
      inside: {
        tag: {
          pattern: /^<\/?[^\s>\/]+/,
          inside: {
            punctuation: /^<\/?/,
            namespace: /^[^\s>\/:]+:/
          }
        },
        "special-attr": [],
        "attr-value": {
          pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
          inside: {
            punctuation: [
              {
                pattern: /^=/,
                alias: "attr-equals"
              },
              {
                pattern: /^(\s*)["']|["']$/,
                lookbehind: !0
              }
            ]
          }
        },
        punctuation: /\/?>/,
        "attr-name": {
          pattern: /[^\s>\/]+/,
          inside: {
            namespace: /^[^\s>\/:]+:/
          }
        }
      }
    },
    entity: [
      {
        pattern: /&[\da-z]{1,8};/i,
        alias: "named-entity"
      },
      /&#x?[\da-f]{1,8};/i
    ]
  }, n.languages.markup.tag.inside["attr-value"].inside.entity = n.languages.markup.entity, n.languages.markup.doctype.inside["internal-subset"].inside = n.languages.markup, n.hooks.add("wrap", function(u) {
    u.type === "entity" && (u.attributes.title = u.content.replace(/&amp;/, "&"));
  }), Object.defineProperty(n.languages.markup.tag, "addInlined", {
    /**
     * Adds an inlined language to markup.
     *
     * An example of an inlined language is CSS with `<style>` tags.
     *
     * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
     * case insensitive.
     * @param {string} lang The language key.
     * @example
     * addInlined('style', 'css');
     */
    value: function(p, T) {
      var I = {};
      I["language-" + T] = {
        pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
        lookbehind: !0,
        inside: n.languages[T]
      }, I.cdata = /^<!\[CDATA\[|\]\]>$/i;
      var i = {
        "included-cdata": {
          pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
          inside: I
        }
      };
      i["language-" + T] = {
        pattern: /[\s\S]+/,
        inside: n.languages[T]
      };
      var h = {};
      h[p] = {
        pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
          return p;
        }), "i"),
        lookbehind: !0,
        greedy: !0,
        inside: i
      }, n.languages.insertBefore("markup", "cdata", h);
    }
  }), Object.defineProperty(n.languages.markup.tag, "addAttribute", {
    /**
     * Adds an pattern to highlight languages embedded in HTML attributes.
     *
     * An example of an inlined language is CSS with `style` attributes.
     *
     * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
     * case insensitive.
     * @param {string} lang The language key.
     * @example
     * addAttribute('style', 'css');
     */
    value: function(u, p) {
      n.languages.markup.tag.inside["special-attr"].push({
        pattern: RegExp(
          /(^|["'\s])/.source + "(?:" + u + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
          "i"
        ),
        lookbehind: !0,
        inside: {
          "attr-name": /^[^\s=]+/,
          "attr-value": {
            pattern: /=[\s\S]+/,
            inside: {
              value: {
                pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
                lookbehind: !0,
                alias: [p, "language-" + p],
                inside: n.languages[p]
              },
              punctuation: [
                {
                  pattern: /^=/,
                  alias: "attr-equals"
                },
                /"|'/
              ]
            }
          }
        }
      });
    }
  }), n.languages.html = n.languages.markup, n.languages.mathml = n.languages.markup, n.languages.svg = n.languages.markup, n.languages.xml = n.languages.extend("markup", {}), n.languages.ssml = n.languages.xml, n.languages.atom = n.languages.xml, n.languages.rss = n.languages.xml, function(u) {
    var p = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
    u.languages.css = {
      comment: /\/\*[\s\S]*?\*\//,
      atrule: {
        pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + p.source + ")*?" + /(?:;|(?=\s*\{))/.source),
        inside: {
          rule: /^@[\w-]+/,
          "selector-function-argument": {
            pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
            lookbehind: !0,
            alias: "selector"
          },
          keyword: {
            pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
            lookbehind: !0
          }
          // See rest below
        }
      },
      url: {
        // https://drafts.csswg.org/css-values-3/#urls
        pattern: RegExp("\\burl\\((?:" + p.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
        greedy: !0,
        inside: {
          function: /^url/i,
          punctuation: /^\(|\)$/,
          string: {
            pattern: RegExp("^" + p.source + "$"),
            alias: "url"
          }
        }
      },
      selector: {
        pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + p.source + ")*(?=\\s*\\{)"),
        lookbehind: !0
      },
      string: {
        pattern: p,
        greedy: !0
      },
      property: {
        pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
        lookbehind: !0
      },
      important: /!important\b/i,
      function: {
        pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
        lookbehind: !0
      },
      punctuation: /[(){};:,]/
    }, u.languages.css.atrule.inside.rest = u.languages.css;
    var T = u.languages.markup;
    T && (T.tag.addInlined("style", "css"), T.tag.addAttribute("style", "css"));
  }(n), n.languages.clike = {
    comment: [
      {
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: !0,
        greedy: !0
      },
      {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: !0,
        greedy: !0
      }
    ],
    string: {
      pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: !0
    },
    "class-name": {
      pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
      lookbehind: !0,
      inside: {
        punctuation: /[.\\]/
      }
    },
    keyword: /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
    boolean: /\b(?:false|true)\b/,
    function: /\b\w+(?=\()/,
    number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
    operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    punctuation: /[{}[\];(),.:]/
  }, n.languages.javascript = n.languages.extend("clike", {
    "class-name": [
      n.languages.clike["class-name"],
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
        lookbehind: !0
      }
    ],
    keyword: [
      {
        pattern: /((?:^|\})\s*)catch\b/,
        lookbehind: !0
      },
      {
        pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
        lookbehind: !0
      }
    ],
    // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
    function: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    number: {
      pattern: RegExp(
        /(^|[^\w$])/.source + "(?:" + // constant
        (/NaN|Infinity/.source + "|" + // binary integer
        /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
        /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
        /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
        /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
        /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
      ),
      lookbehind: !0
    },
    operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
  }), n.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, n.languages.insertBefore("javascript", "keyword", {
    regex: {
      pattern: RegExp(
        // lookbehind
        // eslint-disable-next-line regexp/no-dupe-characters-character-class
        /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + // Regex pattern:
        // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
        // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
        // with the only syntax, so we have to define 2 different regex patterns.
        /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + // `v` flag syntax. This supports 3 levels of nested character classes.
        /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + // lookahead
        /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
      ),
      lookbehind: !0,
      greedy: !0,
      inside: {
        "regex-source": {
          pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
          lookbehind: !0,
          alias: "language-regex",
          inside: n.languages.regex
        },
        "regex-delimiter": /^\/|\/$/,
        "regex-flags": /^[a-z]+$/
      }
    },
    // This must be declared before keyword because we use "function" inside the look-forward
    "function-variable": {
      pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
      alias: "function"
    },
    parameter: [
      {
        pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
        lookbehind: !0,
        inside: n.languages.javascript
      },
      {
        pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
        lookbehind: !0,
        inside: n.languages.javascript
      },
      {
        pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
        lookbehind: !0,
        inside: n.languages.javascript
      },
      {
        pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
        lookbehind: !0,
        inside: n.languages.javascript
      }
    ],
    constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
  }), n.languages.insertBefore("javascript", "string", {
    hashbang: {
      pattern: /^#!.*/,
      greedy: !0,
      alias: "comment"
    },
    "template-string": {
      pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
      greedy: !0,
      inside: {
        "template-punctuation": {
          pattern: /^`|`$/,
          alias: "string"
        },
        interpolation: {
          pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
          lookbehind: !0,
          inside: {
            "interpolation-punctuation": {
              pattern: /^\$\{|\}$/,
              alias: "punctuation"
            },
            rest: n.languages.javascript
          }
        },
        string: /[\s\S]+/
      }
    },
    "string-property": {
      pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
      lookbehind: !0,
      greedy: !0,
      alias: "property"
    }
  }), n.languages.insertBefore("javascript", "operator", {
    "literal-property": {
      pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
      lookbehind: !0,
      alias: "property"
    }
  }), n.languages.markup && (n.languages.markup.tag.addInlined("script", "javascript"), n.languages.markup.tag.addAttribute(
    /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
    "javascript"
  )), n.languages.js = n.languages.javascript, function() {
    if (typeof n > "u" || typeof document > "u")
      return;
    Element.prototype.matches || (Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
    var u = "Loading…", p = function(S, f) {
      return "✖ Error " + S + " while fetching file: " + f;
    }, T = "✖ Error: File does not exist or is empty", I = {
      js: "javascript",
      py: "python",
      rb: "ruby",
      ps1: "powershell",
      psm1: "powershell",
      sh: "bash",
      bat: "batch",
      h: "c",
      tex: "latex"
    }, i = "data-src-status", h = "loading", v = "loaded", O = "failed", d = "pre[data-src]:not([" + i + '="' + v + '"]):not([' + i + '="' + h + '"])';
    function y(S, f, m) {
      var t = new XMLHttpRequest();
      t.open("GET", S, !0), t.onreadystatechange = function() {
        t.readyState == 4 && (t.status < 400 && t.responseText ? f(t.responseText) : t.status >= 400 ? m(p(t.status, t.statusText)) : m(T));
      }, t.send(null);
    }
    function x(S) {
      var f = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(S || "");
      if (f) {
        var m = Number(f[1]), t = f[2], e = f[3];
        return t ? e ? [m, Number(e)] : [m, void 0] : [m, m];
      }
    }
    n.hooks.add("before-highlightall", function(S) {
      S.selector += ", " + d;
    }), n.hooks.add("before-sanity-check", function(S) {
      var f = (
        /** @type {HTMLPreElement} */
        S.element
      );
      if (f.matches(d)) {
        S.code = "", f.setAttribute(i, h);
        var m = f.appendChild(document.createElement("CODE"));
        m.textContent = u;
        var t = f.getAttribute("data-src"), e = S.language;
        if (e === "none") {
          var a = (/\.(\w+)$/.exec(t) || [, "none"])[1];
          e = I[a] || a;
        }
        n.util.setLanguage(m, e), n.util.setLanguage(f, e);
        var r = n.plugins.autoloader;
        r && r.loadLanguages(e), y(
          t,
          function(s) {
            f.setAttribute(i, v);
            var l = x(f.getAttribute("data-range"));
            if (l) {
              var g = s.split(/\r\n?|\n/g), o = l[0], A = l[1] == null ? g.length : l[1];
              o < 0 && (o += g.length), o = Math.max(0, Math.min(o - 1, g.length)), A < 0 && (A += g.length), A = Math.max(0, Math.min(A, g.length)), s = g.slice(o, A).join(`
`), f.hasAttribute("data-start") || f.setAttribute("data-start", String(o + 1));
            }
            m.textContent = s, n.highlightElement(m);
          },
          function(s) {
            f.setAttribute(i, O), m.textContent = s;
          }
        );
      }
    }), n.plugins.fileHighlight = {
      /**
       * Executes the File Highlight plugin for all matching `pre` elements under the given container.
       *
       * Note: Elements which are already loaded or currently loading will not be touched by this method.
       *
       * @param {ParentNode} [container=document]
       */
      highlight: function(f) {
        for (var m = (f || document).querySelectorAll(d), t = 0, e; e = m[t++]; )
          n.highlightElement(e);
      }
    };
    var U = !1;
    n.fileHighlight = function() {
      U || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), U = !0), n.plugins.fileHighlight.highlight.apply(this, arguments);
    };
  }();
})(K);
var ne = K.exports;
const B = /* @__PURE__ */ te(ne);
Prism.languages.sql = {
  comment: {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: !0
  },
  variable: [
    {
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: !0
    },
    /@[\w.$]+/
  ],
  string: {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
    greedy: !0,
    lookbehind: !0
  },
  identifier: {
    pattern: /(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,
    greedy: !0,
    lookbehind: !0,
    inside: {
      punctuation: /^`|`$/
    }
  },
  function: /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i,
  // Should we highlight user defined functions too?
  keyword: /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
  boolean: /\b(?:FALSE|NULL|TRUE)\b/i,
  number: /\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,
  operator: /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
  punctuation: /[;[\]()`,.]/
};
Prism.languages.json = {
  property: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: !0,
    greedy: !0
  },
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: !0,
    greedy: !0
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: !0
  },
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:false|true)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: "keyword"
  }
};
Prism.languages.webmanifest = Prism.languages.json;
const ae = /* @__PURE__ */ new Set([
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "ORDER",
  "GROUP",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "SET",
  "VALUES",
  "RETURNING",
  "UNION",
  "WITH"
]), re = /* @__PURE__ */ new Set(["AND", "OR"]);
function se(E) {
  if (!E || typeof E != "string")
    return "";
  let c = E.replace(/\s+/g, " ").trim();
  const n = [];
  let u = "", p = !1, T = "", I = !1;
  for (let O = 0; O < c.length; O++) {
    const d = c[O];
    p ? (u += d, d === T && c[O - 1] !== "\\" && (n.push(u), u = "", p = !1)) : I ? (u += d, d === '"' && (n.push(u), u = "", I = !1)) : d === "'" || d === '"' ? (u.trim() && (n.push(u), u = ""), u = d, d === "'" ? (p = !0, T = d) : I = !0) : d === "," || d === "(" || d === ")" ? (u.trim() && (n.push(u), u = ""), n.push(d)) : d === " " ? u.trim() && (n.push(u), u = "") : u += d;
  }
  u.trim() && n.push(u);
  const i = [];
  let h = "", v = 0;
  for (let O = 0; O < n.length; O++) {
    const d = n[O], y = d.toUpperCase();
    d === "(" ? (v++, h += d) : d === ")" ? (v--, h += d) : d === "," ? h += d : v === 0 && ae.has(y) ? (h.trim() && i.push(h.trim()), h = (re.has(y) ? "  " : "") + d) : (h && !h.endsWith("(") && !h.endsWith(",") && (h += " "), h += d);
  }
  return h.trim() && i.push(h.trim()), i.join(`
`);
}
function ue(E, c = !1) {
  if (!E || typeof E != "string")
    return "";
  const n = c ? se(E) : E;
  return B.highlight(n, B.languages.sql, "sql");
}
function oe(E, c = !0) {
  let n;
  if (typeof E == "string")
    try {
      const u = JSON.parse(E);
      n = c ? JSON.stringify(u, null, 2) : E;
    } catch {
      n = E;
    }
  else
    try {
      n = JSON.stringify(E, null, c ? 2 : 0);
    } catch {
      n = String(E ?? "");
    }
  return B.highlight(n, B.languages.json, "json");
}
export {
  ie as D,
  oe as a,
  ue as h
};
//# sourceMappingURL=syntax-highlight-Q2MTgRi9.js.map
