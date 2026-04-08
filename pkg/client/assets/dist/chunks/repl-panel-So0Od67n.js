import { t as pe } from "./chunk-BUbnbzFL.js";
import { escapeHTML as ve } from "../shared/html.js";
import { normalizeDebugBasePath as Se } from "../debug/shared/path-helpers.js";
var Ce = /* @__PURE__ */ pe(((A, U) => {
  (function(j, q) {
    if (typeof A == "object" && typeof U == "object") U.exports = q();
    else if (typeof define == "function" && define.amd) define([], q);
    else {
      var V = q();
      for (var Z in V) (typeof A == "object" ? A : j)[Z] = V[Z];
    }
  })(self, (() => (() => {
    "use strict";
    var j = {
      4567: function(O, r, a) {
        var c = this && this.__decorate || function(i, o, l, v) {
          var d, h = arguments.length, m = h < 3 ? o : v === null ? v = Object.getOwnPropertyDescriptor(o, l) : v;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") m = Reflect.decorate(i, o, l, v);
          else for (var E = i.length - 1; E >= 0; E--) (d = i[E]) && (m = (h < 3 ? d(m) : h > 3 ? d(o, l, m) : d(o, l)) || m);
          return h > 3 && m && Object.defineProperty(o, l, m), m;
        }, f = this && this.__param || function(i, o) {
          return function(l, v) {
            o(l, v, i);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.AccessibilityManager = void 0;
        const n = a(9042), u = a(6114), p = a(9924), g = a(844), _ = a(5596), e = a(4725), s = a(3656);
        let t = r.AccessibilityManager = class extends g.Disposable {
          constructor(i, o) {
            super(), this._terminal = i, this._renderService = o, this._liveRegionLineCount = 0, this._charsToConsume = [], this._charsToAnnounce = "", this._accessibilityContainer = document.createElement("div"), this._accessibilityContainer.classList.add("xterm-accessibility"), this._rowContainer = document.createElement("div"), this._rowContainer.setAttribute("role", "list"), this._rowContainer.classList.add("xterm-accessibility-tree"), this._rowElements = [];
            for (let l = 0; l < this._terminal.rows; l++) this._rowElements[l] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[l]);
            if (this._topBoundaryFocusListener = (l) => this._handleBoundaryFocus(l, 0), this._bottomBoundaryFocusListener = (l) => this._handleBoundaryFocus(l, 1), this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions(), this._accessibilityContainer.appendChild(this._rowContainer), this._liveRegion = document.createElement("div"), this._liveRegion.classList.add("live-region"), this._liveRegion.setAttribute("aria-live", "assertive"), this._accessibilityContainer.appendChild(this._liveRegion), this._liveRegionDebouncer = this.register(new p.TimeBasedDebouncer(this._renderRows.bind(this))), !this._terminal.element) throw new Error("Cannot enable accessibility before Terminal.open");
            this._terminal.element.insertAdjacentElement("afterbegin", this._accessibilityContainer), this.register(this._terminal.onResize(((l) => this._handleResize(l.rows)))), this.register(this._terminal.onRender(((l) => this._refreshRows(l.start, l.end)))), this.register(this._terminal.onScroll((() => this._refreshRows()))), this.register(this._terminal.onA11yChar(((l) => this._handleChar(l)))), this.register(this._terminal.onLineFeed((() => this._handleChar(`
`)))), this.register(this._terminal.onA11yTab(((l) => this._handleTab(l)))), this.register(this._terminal.onKey(((l) => this._handleKey(l.key)))), this.register(this._terminal.onBlur((() => this._clearLiveRegion()))), this.register(this._renderService.onDimensionsChange((() => this._refreshRowsDimensions()))), this._screenDprMonitor = new _.ScreenDprMonitor(window), this.register(this._screenDprMonitor), this._screenDprMonitor.setListener((() => this._refreshRowsDimensions())), this.register((0, s.addDisposableDomListener)(window, "resize", (() => this._refreshRowsDimensions()))), this._refreshRows(), this.register((0, g.toDisposable)((() => {
              this._accessibilityContainer.remove(), this._rowElements.length = 0;
            })));
          }
          _handleTab(i) {
            for (let o = 0; o < i; o++) this._handleChar(" ");
          }
          _handleChar(i) {
            this._liveRegionLineCount < 21 && (this._charsToConsume.length > 0 ? this._charsToConsume.shift() !== i && (this._charsToAnnounce += i) : this._charsToAnnounce += i, i === `
` && (this._liveRegionLineCount++, this._liveRegionLineCount === 21 && (this._liveRegion.textContent += n.tooMuchOutput)), u.isMac && this._liveRegion.textContent && this._liveRegion.textContent.length > 0 && !this._liveRegion.parentNode && setTimeout((() => {
              this._accessibilityContainer.appendChild(this._liveRegion);
            }), 0));
          }
          _clearLiveRegion() {
            this._liveRegion.textContent = "", this._liveRegionLineCount = 0, u.isMac && this._liveRegion.remove();
          }
          _handleKey(i) {
            this._clearLiveRegion(), /\p{Control}/u.test(i) || this._charsToConsume.push(i);
          }
          _refreshRows(i, o) {
            this._liveRegionDebouncer.refresh(i, o, this._terminal.rows);
          }
          _renderRows(i, o) {
            const l = this._terminal.buffer, v = l.lines.length.toString();
            for (let d = i; d <= o; d++) {
              const h = l.translateBufferLineToString(l.ydisp + d, !0), m = (l.ydisp + d + 1).toString(), E = this._rowElements[d];
              E && (h.length === 0 ? E.innerText = " " : E.textContent = h, E.setAttribute("aria-posinset", m), E.setAttribute("aria-setsize", v));
            }
            this._announceCharacters();
          }
          _announceCharacters() {
            this._charsToAnnounce.length !== 0 && (this._liveRegion.textContent += this._charsToAnnounce, this._charsToAnnounce = "");
          }
          _handleBoundaryFocus(i, o) {
            const l = i.target, v = this._rowElements[o === 0 ? 1 : this._rowElements.length - 2];
            if (l.getAttribute("aria-posinset") === (o === 0 ? "1" : `${this._terminal.buffer.lines.length}`) || i.relatedTarget !== v) return;
            let d, h;
            if (o === 0 ? (d = l, h = this._rowElements.pop(), this._rowContainer.removeChild(h)) : (d = this._rowElements.shift(), h = l, this._rowContainer.removeChild(d)), d.removeEventListener("focus", this._topBoundaryFocusListener), h.removeEventListener("focus", this._bottomBoundaryFocusListener), o === 0) {
              const m = this._createAccessibilityTreeNode();
              this._rowElements.unshift(m), this._rowContainer.insertAdjacentElement("afterbegin", m);
            } else {
              const m = this._createAccessibilityTreeNode();
              this._rowElements.push(m), this._rowContainer.appendChild(m);
            }
            this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._terminal.scrollLines(o === 0 ? -1 : 1), this._rowElements[o === 0 ? 1 : this._rowElements.length - 2].focus(), i.preventDefault(), i.stopImmediatePropagation();
          }
          _handleResize(i) {
            this._rowElements[this._rowElements.length - 1].removeEventListener("focus", this._bottomBoundaryFocusListener);
            for (let o = this._rowContainer.children.length; o < this._terminal.rows; o++) this._rowElements[o] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[o]);
            for (; this._rowElements.length > i; ) this._rowContainer.removeChild(this._rowElements.pop());
            this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions();
          }
          _createAccessibilityTreeNode() {
            const i = document.createElement("div");
            return i.setAttribute("role", "listitem"), i.tabIndex = -1, this._refreshRowDimensions(i), i;
          }
          _refreshRowsDimensions() {
            if (this._renderService.dimensions.css.cell.height) {
              this._accessibilityContainer.style.width = `${this._renderService.dimensions.css.canvas.width}px`, this._rowElements.length !== this._terminal.rows && this._handleResize(this._terminal.rows);
              for (let i = 0; i < this._terminal.rows; i++) this._refreshRowDimensions(this._rowElements[i]);
            }
          }
          _refreshRowDimensions(i) {
            i.style.height = `${this._renderService.dimensions.css.cell.height}px`;
          }
        };
        r.AccessibilityManager = t = c([f(1, e.IRenderService)], t);
      },
      3614: (O, r) => {
        function a(u) {
          return u.replace(/\r?\n/g, "\r");
        }
        function c(u, p) {
          return p ? "\x1B[200~" + u + "\x1B[201~" : u;
        }
        function f(u, p, g, _) {
          u = c(u = a(u), g.decPrivateModes.bracketedPasteMode && _.rawOptions.ignoreBracketedPasteMode !== !0), g.triggerDataEvent(u, !0), p.value = "";
        }
        function n(u, p, g) {
          const _ = g.getBoundingClientRect(), e = u.clientX - _.left - 10, s = u.clientY - _.top - 10;
          p.style.width = "20px", p.style.height = "20px", p.style.left = `${e}px`, p.style.top = `${s}px`, p.style.zIndex = "1000", p.focus();
        }
        Object.defineProperty(r, "__esModule", { value: !0 }), r.rightClickHandler = r.moveTextAreaUnderMouseCursor = r.paste = r.handlePasteEvent = r.copyHandler = r.bracketTextForPaste = r.prepareTextForTerminal = void 0, r.prepareTextForTerminal = a, r.bracketTextForPaste = c, r.copyHandler = function(u, p) {
          u.clipboardData && u.clipboardData.setData("text/plain", p.selectionText), u.preventDefault();
        }, r.handlePasteEvent = function(u, p, g, _) {
          u.stopPropagation(), u.clipboardData && f(u.clipboardData.getData("text/plain"), p, g, _);
        }, r.paste = f, r.moveTextAreaUnderMouseCursor = n, r.rightClickHandler = function(u, p, g, _, e) {
          n(u, p, g), e && _.rightClickSelect(u), p.value = _.selectionText, p.select();
        };
      },
      7239: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.ColorContrastCache = void 0;
        const c = a(1505);
        r.ColorContrastCache = class {
          constructor() {
            this._color = new c.TwoKeyMap(), this._css = new c.TwoKeyMap();
          }
          setCss(f, n, u) {
            this._css.set(f, n, u);
          }
          getCss(f, n) {
            return this._css.get(f, n);
          }
          setColor(f, n, u) {
            this._color.set(f, n, u);
          }
          getColor(f, n) {
            return this._color.get(f, n);
          }
          clear() {
            this._color.clear(), this._css.clear();
          }
        };
      },
      3656: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.addDisposableDomListener = void 0, r.addDisposableDomListener = function(a, c, f, n) {
          a.addEventListener(c, f, n);
          let u = !1;
          return { dispose: () => {
            u || (u = !0, a.removeEventListener(c, f, n));
          } };
        };
      },
      6465: function(O, r, a) {
        var c = this && this.__decorate || function(e, s, t, i) {
          var o, l = arguments.length, v = l < 3 ? s : i === null ? i = Object.getOwnPropertyDescriptor(s, t) : i;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") v = Reflect.decorate(e, s, t, i);
          else for (var d = e.length - 1; d >= 0; d--) (o = e[d]) && (v = (l < 3 ? o(v) : l > 3 ? o(s, t, v) : o(s, t)) || v);
          return l > 3 && v && Object.defineProperty(s, t, v), v;
        }, f = this && this.__param || function(e, s) {
          return function(t, i) {
            s(t, i, e);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Linkifier2 = void 0;
        const n = a(3656), u = a(8460), p = a(844), g = a(2585);
        let _ = r.Linkifier2 = class extends p.Disposable {
          get currentLink() {
            return this._currentLink;
          }
          constructor(e) {
            super(), this._bufferService = e, this._linkProviders = [], this._linkCacheDisposables = [], this._isMouseOut = !0, this._wasResized = !1, this._activeLine = -1, this._onShowLinkUnderline = this.register(new u.EventEmitter()), this.onShowLinkUnderline = this._onShowLinkUnderline.event, this._onHideLinkUnderline = this.register(new u.EventEmitter()), this.onHideLinkUnderline = this._onHideLinkUnderline.event, this.register((0, p.getDisposeArrayDisposable)(this._linkCacheDisposables)), this.register((0, p.toDisposable)((() => {
              this._lastMouseEvent = void 0;
            }))), this.register(this._bufferService.onResize((() => {
              this._clearCurrentLink(), this._wasResized = !0;
            })));
          }
          registerLinkProvider(e) {
            return this._linkProviders.push(e), { dispose: () => {
              const s = this._linkProviders.indexOf(e);
              s !== -1 && this._linkProviders.splice(s, 1);
            } };
          }
          attachToDom(e, s, t) {
            this._element = e, this._mouseService = s, this._renderService = t, this.register((0, n.addDisposableDomListener)(this._element, "mouseleave", (() => {
              this._isMouseOut = !0, this._clearCurrentLink();
            }))), this.register((0, n.addDisposableDomListener)(this._element, "mousemove", this._handleMouseMove.bind(this))), this.register((0, n.addDisposableDomListener)(this._element, "mousedown", this._handleMouseDown.bind(this))), this.register((0, n.addDisposableDomListener)(this._element, "mouseup", this._handleMouseUp.bind(this)));
          }
          _handleMouseMove(e) {
            if (this._lastMouseEvent = e, !this._element || !this._mouseService) return;
            const s = this._positionFromMouseEvent(e, this._element, this._mouseService);
            if (!s) return;
            this._isMouseOut = !1;
            const t = e.composedPath();
            for (let i = 0; i < t.length; i++) {
              const o = t[i];
              if (o.classList.contains("xterm")) break;
              if (o.classList.contains("xterm-hover")) return;
            }
            this._lastBufferCell && s.x === this._lastBufferCell.x && s.y === this._lastBufferCell.y || (this._handleHover(s), this._lastBufferCell = s);
          }
          _handleHover(e) {
            if (this._activeLine !== e.y || this._wasResized) return this._clearCurrentLink(), this._askForLink(e, !1), void (this._wasResized = !1);
            this._currentLink && this._linkAtPosition(this._currentLink.link, e) || (this._clearCurrentLink(), this._askForLink(e, !0));
          }
          _askForLink(e, s) {
            var t, i;
            this._activeProviderReplies && s || ((t = this._activeProviderReplies) === null || t === void 0 || t.forEach(((l) => {
              l?.forEach(((v) => {
                v.link.dispose && v.link.dispose();
              }));
            })), this._activeProviderReplies = /* @__PURE__ */ new Map(), this._activeLine = e.y);
            let o = !1;
            for (const [l, v] of this._linkProviders.entries()) s ? !((i = this._activeProviderReplies) === null || i === void 0) && i.get(l) && (o = this._checkLinkProviderResult(l, e, o)) : v.provideLinks(e.y, ((d) => {
              var h, m;
              if (this._isMouseOut) return;
              const E = d?.map(((x) => ({ link: x })));
              (h = this._activeProviderReplies) === null || h === void 0 || h.set(l, E), o = this._checkLinkProviderResult(l, e, o), ((m = this._activeProviderReplies) === null || m === void 0 ? void 0 : m.size) === this._linkProviders.length && this._removeIntersectingLinks(e.y, this._activeProviderReplies);
            }));
          }
          _removeIntersectingLinks(e, s) {
            const t = /* @__PURE__ */ new Set();
            for (let i = 0; i < s.size; i++) {
              const o = s.get(i);
              if (o) for (let l = 0; l < o.length; l++) {
                const v = o[l], d = v.link.range.start.y < e ? 0 : v.link.range.start.x, h = v.link.range.end.y > e ? this._bufferService.cols : v.link.range.end.x;
                for (let m = d; m <= h; m++) {
                  if (t.has(m)) {
                    o.splice(l--, 1);
                    break;
                  }
                  t.add(m);
                }
              }
            }
          }
          _checkLinkProviderResult(e, s, t) {
            var i;
            if (!this._activeProviderReplies) return t;
            const o = this._activeProviderReplies.get(e);
            let l = !1;
            for (let v = 0; v < e; v++) this._activeProviderReplies.has(v) && !this._activeProviderReplies.get(v) || (l = !0);
            if (!l && o) {
              const v = o.find(((d) => this._linkAtPosition(d.link, s)));
              v && (t = !0, this._handleNewLink(v));
            }
            if (this._activeProviderReplies.size === this._linkProviders.length && !t) for (let v = 0; v < this._activeProviderReplies.size; v++) {
              const d = (i = this._activeProviderReplies.get(v)) === null || i === void 0 ? void 0 : i.find(((h) => this._linkAtPosition(h.link, s)));
              if (d) {
                t = !0, this._handleNewLink(d);
                break;
              }
            }
            return t;
          }
          _handleMouseDown() {
            this._mouseDownLink = this._currentLink;
          }
          _handleMouseUp(e) {
            if (!this._element || !this._mouseService || !this._currentLink) return;
            const s = this._positionFromMouseEvent(e, this._element, this._mouseService);
            s && this._mouseDownLink === this._currentLink && this._linkAtPosition(this._currentLink.link, s) && this._currentLink.link.activate(e, this._currentLink.link.text);
          }
          _clearCurrentLink(e, s) {
            this._element && this._currentLink && this._lastMouseEvent && (!e || !s || this._currentLink.link.range.start.y >= e && this._currentLink.link.range.end.y <= s) && (this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent), this._currentLink = void 0, (0, p.disposeArray)(this._linkCacheDisposables));
          }
          _handleNewLink(e) {
            if (!this._element || !this._lastMouseEvent || !this._mouseService) return;
            const s = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
            s && this._linkAtPosition(e.link, s) && (this._currentLink = e, this._currentLink.state = {
              decorations: {
                underline: e.link.decorations === void 0 || e.link.decorations.underline,
                pointerCursor: e.link.decorations === void 0 || e.link.decorations.pointerCursor
              },
              isHovered: !0
            }, this._linkHover(this._element, e.link, this._lastMouseEvent), e.link.decorations = {}, Object.defineProperties(e.link.decorations, {
              pointerCursor: {
                get: () => {
                  var t, i;
                  return (i = (t = this._currentLink) === null || t === void 0 ? void 0 : t.state) === null || i === void 0 ? void 0 : i.decorations.pointerCursor;
                },
                set: (t) => {
                  var i, o;
                  !((i = this._currentLink) === null || i === void 0) && i.state && this._currentLink.state.decorations.pointerCursor !== t && (this._currentLink.state.decorations.pointerCursor = t, this._currentLink.state.isHovered && ((o = this._element) === null || o === void 0 || o.classList.toggle("xterm-cursor-pointer", t)));
                }
              },
              underline: {
                get: () => {
                  var t, i;
                  return (i = (t = this._currentLink) === null || t === void 0 ? void 0 : t.state) === null || i === void 0 ? void 0 : i.decorations.underline;
                },
                set: (t) => {
                  var i, o, l;
                  !((i = this._currentLink) === null || i === void 0) && i.state && ((l = (o = this._currentLink) === null || o === void 0 ? void 0 : o.state) === null || l === void 0 ? void 0 : l.decorations.underline) !== t && (this._currentLink.state.decorations.underline = t, this._currentLink.state.isHovered && this._fireUnderlineEvent(e.link, t));
                }
              }
            }), this._renderService && this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange(((t) => {
              if (!this._currentLink) return;
              const i = t.start === 0 ? 0 : t.start + 1 + this._bufferService.buffer.ydisp, o = this._bufferService.buffer.ydisp + 1 + t.end;
              if (this._currentLink.link.range.start.y >= i && this._currentLink.link.range.end.y <= o && (this._clearCurrentLink(i, o), this._lastMouseEvent && this._element)) {
                const l = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
                l && this._askForLink(l, !1);
              }
            }))));
          }
          _linkHover(e, s, t) {
            var i;
            !((i = this._currentLink) === null || i === void 0) && i.state && (this._currentLink.state.isHovered = !0, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(s, !0), this._currentLink.state.decorations.pointerCursor && e.classList.add("xterm-cursor-pointer")), s.hover && s.hover(t, s.text);
          }
          _fireUnderlineEvent(e, s) {
            const t = e.range, i = this._bufferService.buffer.ydisp, o = this._createLinkUnderlineEvent(t.start.x - 1, t.start.y - i - 1, t.end.x, t.end.y - i - 1, void 0);
            (s ? this._onShowLinkUnderline : this._onHideLinkUnderline).fire(o);
          }
          _linkLeave(e, s, t) {
            var i;
            !((i = this._currentLink) === null || i === void 0) && i.state && (this._currentLink.state.isHovered = !1, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(s, !1), this._currentLink.state.decorations.pointerCursor && e.classList.remove("xterm-cursor-pointer")), s.leave && s.leave(t, s.text);
          }
          _linkAtPosition(e, s) {
            const t = e.range.start.y * this._bufferService.cols + e.range.start.x, i = e.range.end.y * this._bufferService.cols + e.range.end.x, o = s.y * this._bufferService.cols + s.x;
            return t <= o && o <= i;
          }
          _positionFromMouseEvent(e, s, t) {
            const i = t.getCoords(e, s, this._bufferService.cols, this._bufferService.rows);
            if (i) return {
              x: i[0],
              y: i[1] + this._bufferService.buffer.ydisp
            };
          }
          _createLinkUnderlineEvent(e, s, t, i, o) {
            return {
              x1: e,
              y1: s,
              x2: t,
              y2: i,
              cols: this._bufferService.cols,
              fg: o
            };
          }
        };
        r.Linkifier2 = _ = c([f(0, g.IBufferService)], _);
      },
      9042: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.tooMuchOutput = r.promptLabel = void 0, r.promptLabel = "Terminal input", r.tooMuchOutput = "Too much output to announce, navigate to rows manually to read";
      },
      3730: function(O, r, a) {
        var c = this && this.__decorate || function(_, e, s, t) {
          var i, o = arguments.length, l = o < 3 ? e : t === null ? t = Object.getOwnPropertyDescriptor(e, s) : t;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") l = Reflect.decorate(_, e, s, t);
          else for (var v = _.length - 1; v >= 0; v--) (i = _[v]) && (l = (o < 3 ? i(l) : o > 3 ? i(e, s, l) : i(e, s)) || l);
          return o > 3 && l && Object.defineProperty(e, s, l), l;
        }, f = this && this.__param || function(_, e) {
          return function(s, t) {
            e(s, t, _);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.OscLinkProvider = void 0;
        const n = a(511), u = a(2585);
        let p = r.OscLinkProvider = class {
          constructor(_, e, s) {
            this._bufferService = _, this._optionsService = e, this._oscLinkService = s;
          }
          provideLinks(_, e) {
            var s;
            const t = this._bufferService.buffer.lines.get(_ - 1);
            if (!t) return void e(void 0);
            const i = [], o = this._optionsService.rawOptions.linkHandler, l = new n.CellData(), v = t.getTrimmedLength();
            let d = -1, h = -1, m = !1;
            for (let E = 0; E < v; E++) if (h !== -1 || t.hasContent(E)) {
              if (t.loadCell(E, l), l.hasExtendedAttrs() && l.extended.urlId) {
                if (h === -1) {
                  h = E, d = l.extended.urlId;
                  continue;
                }
                m = l.extended.urlId !== d;
              } else h !== -1 && (m = !0);
              if (m || h !== -1 && E === v - 1) {
                const x = (s = this._oscLinkService.getLinkData(d)) === null || s === void 0 ? void 0 : s.uri;
                if (x) {
                  const b = {
                    start: {
                      x: h + 1,
                      y: _
                    },
                    end: {
                      x: E + (m || E !== v - 1 ? 0 : 1),
                      y: _
                    }
                  };
                  let k = !1;
                  if (!o?.allowNonHttpProtocols) try {
                    const R = new URL(x);
                    ["http:", "https:"].includes(R.protocol) || (k = !0);
                  } catch {
                    k = !0;
                  }
                  k || i.push({
                    text: x,
                    range: b,
                    activate: (R, H) => o ? o.activate(R, H, b) : g(0, H),
                    hover: (R, H) => {
                      var P;
                      return (P = o?.hover) === null || P === void 0 ? void 0 : P.call(o, R, H, b);
                    },
                    leave: (R, H) => {
                      var P;
                      return (P = o?.leave) === null || P === void 0 ? void 0 : P.call(o, R, H, b);
                    }
                  });
                }
                m = !1, l.hasExtendedAttrs() && l.extended.urlId ? (h = E, d = l.extended.urlId) : (h = -1, d = -1);
              }
            }
            e(i);
          }
        };
        function g(_, e) {
          if (confirm(`Do you want to navigate to ${e}?

WARNING: This link could potentially be dangerous`)) {
            const s = window.open();
            if (s) {
              try {
                s.opener = null;
              } catch {
              }
              s.location.href = e;
            } else console.warn("Opening link blocked as opener could not be cleared");
          }
        }
        r.OscLinkProvider = p = c([
          f(0, u.IBufferService),
          f(1, u.IOptionsService),
          f(2, u.IOscLinkService)
        ], p);
      },
      6193: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.RenderDebouncer = void 0, r.RenderDebouncer = class {
          constructor(a, c) {
            this._parentWindow = a, this._renderCallback = c, this._refreshCallbacks = [];
          }
          dispose() {
            this._animationFrame && (this._parentWindow.cancelAnimationFrame(this._animationFrame), this._animationFrame = void 0);
          }
          addRefreshCallback(a) {
            return this._refreshCallbacks.push(a), this._animationFrame || (this._animationFrame = this._parentWindow.requestAnimationFrame((() => this._innerRefresh()))), this._animationFrame;
          }
          refresh(a, c, f) {
            this._rowCount = f, a = a !== void 0 ? a : 0, c = c !== void 0 ? c : this._rowCount - 1, this._rowStart = this._rowStart !== void 0 ? Math.min(this._rowStart, a) : a, this._rowEnd = this._rowEnd !== void 0 ? Math.max(this._rowEnd, c) : c, this._animationFrame || (this._animationFrame = this._parentWindow.requestAnimationFrame((() => this._innerRefresh())));
          }
          _innerRefresh() {
            if (this._animationFrame = void 0, this._rowStart === void 0 || this._rowEnd === void 0 || this._rowCount === void 0) return void this._runRefreshCallbacks();
            const a = Math.max(this._rowStart, 0), c = Math.min(this._rowEnd, this._rowCount - 1);
            this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(a, c), this._runRefreshCallbacks();
          }
          _runRefreshCallbacks() {
            for (const a of this._refreshCallbacks) a(0);
            this._refreshCallbacks = [];
          }
        };
      },
      5596: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.ScreenDprMonitor = void 0;
        const c = a(844);
        class f extends c.Disposable {
          constructor(u) {
            super(), this._parentWindow = u, this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this.register((0, c.toDisposable)((() => {
              this.clearListener();
            })));
          }
          setListener(u) {
            this._listener && this.clearListener(), this._listener = u, this._outerListener = () => {
              this._listener && (this._listener(this._parentWindow.devicePixelRatio, this._currentDevicePixelRatio), this._updateDpr());
            }, this._updateDpr();
          }
          _updateDpr() {
            var u;
            this._outerListener && ((u = this._resolutionMediaMatchList) === null || u === void 0 || u.removeListener(this._outerListener), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._resolutionMediaMatchList = this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`), this._resolutionMediaMatchList.addListener(this._outerListener));
          }
          clearListener() {
            this._resolutionMediaMatchList && this._listener && this._outerListener && (this._resolutionMediaMatchList.removeListener(this._outerListener), this._resolutionMediaMatchList = void 0, this._listener = void 0, this._outerListener = void 0);
          }
        }
        r.ScreenDprMonitor = f;
      },
      3236: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Terminal = void 0;
        const c = a(3614), f = a(3656), n = a(6465), u = a(9042), p = a(3730), g = a(1680), _ = a(3107), e = a(5744), s = a(2950), t = a(1296), i = a(428), o = a(4269), l = a(5114), v = a(8934), d = a(3230), h = a(9312), m = a(4725), E = a(6731), x = a(8055), b = a(8969), k = a(8460), R = a(844), H = a(6114), P = a(8437), M = a(2584), S = a(7399), y = a(5941), w = a(9074), L = a(2585), I = a(5435), F = a(4567), N = typeof window < "u" ? window.document : null;
        class $ extends b.CoreTerminal {
          get onFocus() {
            return this._onFocus.event;
          }
          get onBlur() {
            return this._onBlur.event;
          }
          get onA11yChar() {
            return this._onA11yCharEmitter.event;
          }
          get onA11yTab() {
            return this._onA11yTabEmitter.event;
          }
          get onWillOpen() {
            return this._onWillOpen.event;
          }
          constructor(C = {}) {
            super(C), this.browser = H, this._keyDownHandled = !1, this._keyDownSeen = !1, this._keyPressHandled = !1, this._unprocessedDeadKey = !1, this._accessibilityManager = this.register(new R.MutableDisposable()), this._onCursorMove = this.register(new k.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onKey = this.register(new k.EventEmitter()), this.onKey = this._onKey.event, this._onRender = this.register(new k.EventEmitter()), this.onRender = this._onRender.event, this._onSelectionChange = this.register(new k.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onTitleChange = this.register(new k.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onBell = this.register(new k.EventEmitter()), this.onBell = this._onBell.event, this._onFocus = this.register(new k.EventEmitter()), this._onBlur = this.register(new k.EventEmitter()), this._onA11yCharEmitter = this.register(new k.EventEmitter()), this._onA11yTabEmitter = this.register(new k.EventEmitter()), this._onWillOpen = this.register(new k.EventEmitter()), this._setup(), this.linkifier2 = this.register(this._instantiationService.createInstance(n.Linkifier2)), this.linkifier2.registerLinkProvider(this._instantiationService.createInstance(p.OscLinkProvider)), this._decorationService = this._instantiationService.createInstance(w.DecorationService), this._instantiationService.setService(L.IDecorationService, this._decorationService), this.register(this._inputHandler.onRequestBell((() => this._onBell.fire()))), this.register(this._inputHandler.onRequestRefreshRows(((D, T) => this.refresh(D, T)))), this.register(this._inputHandler.onRequestSendFocus((() => this._reportFocus()))), this.register(this._inputHandler.onRequestReset((() => this.reset()))), this.register(this._inputHandler.onRequestWindowsOptionsReport(((D) => this._reportWindowsOptions(D)))), this.register(this._inputHandler.onColor(((D) => this._handleColorEvent(D)))), this.register((0, k.forwardEvent)(this._inputHandler.onCursorMove, this._onCursorMove)), this.register((0, k.forwardEvent)(this._inputHandler.onTitleChange, this._onTitleChange)), this.register((0, k.forwardEvent)(this._inputHandler.onA11yChar, this._onA11yCharEmitter)), this.register((0, k.forwardEvent)(this._inputHandler.onA11yTab, this._onA11yTabEmitter)), this.register(this._bufferService.onResize(((D) => this._afterResize(D.cols, D.rows)))), this.register((0, R.toDisposable)((() => {
              var D, T;
              this._customKeyEventHandler = void 0, (T = (D = this.element) === null || D === void 0 ? void 0 : D.parentNode) === null || T === void 0 || T.removeChild(this.element);
            })));
          }
          _handleColorEvent(C) {
            if (this._themeService) for (const D of C) {
              let T, B = "";
              switch (D.index) {
                case 256:
                  T = "foreground", B = "10";
                  break;
                case 257:
                  T = "background", B = "11";
                  break;
                case 258:
                  T = "cursor", B = "12";
                  break;
                default:
                  T = "ansi", B = "4;" + D.index;
              }
              switch (D.type) {
                case 0:
                  const z = x.color.toColorRGB(T === "ansi" ? this._themeService.colors.ansi[D.index] : this._themeService.colors[T]);
                  this.coreService.triggerDataEvent(`${M.C0.ESC}]${B};${(0, y.toRgbString)(z)}${M.C1_ESCAPED.ST}`);
                  break;
                case 1:
                  if (T === "ansi") this._themeService.modifyColors(((W) => W.ansi[D.index] = x.rgba.toColor(...D.color)));
                  else {
                    const W = T;
                    this._themeService.modifyColors(((G) => G[W] = x.rgba.toColor(...D.color)));
                  }
                  break;
                case 2:
                  this._themeService.restoreColor(D.index);
              }
            }
          }
          _setup() {
            super._setup(), this._customKeyEventHandler = void 0;
          }
          get buffer() {
            return this.buffers.active;
          }
          focus() {
            this.textarea && this.textarea.focus({ preventScroll: !0 });
          }
          _handleScreenReaderModeOptionChange(C) {
            C ? !this._accessibilityManager.value && this._renderService && (this._accessibilityManager.value = this._instantiationService.createInstance(F.AccessibilityManager, this)) : this._accessibilityManager.clear();
          }
          _handleTextAreaFocus(C) {
            this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(M.C0.ESC + "[I"), this.updateCursorStyle(C), this.element.classList.add("focus"), this._showCursor(), this._onFocus.fire();
          }
          blur() {
            var C;
            return (C = this.textarea) === null || C === void 0 ? void 0 : C.blur();
          }
          _handleTextAreaBlur() {
            this.textarea.value = "", this.refresh(this.buffer.y, this.buffer.y), this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(M.C0.ESC + "[O"), this.element.classList.remove("focus"), this._onBlur.fire();
          }
          _syncTextArea() {
            if (!this.textarea || !this.buffer.isCursorInViewport || this._compositionHelper.isComposing || !this._renderService) return;
            const C = this.buffer.ybase + this.buffer.y, D = this.buffer.lines.get(C);
            if (!D) return;
            const T = Math.min(this.buffer.x, this.cols - 1), B = this._renderService.dimensions.css.cell.height, z = D.getWidth(T), W = this._renderService.dimensions.css.cell.width * z, G = this.buffer.y * this._renderService.dimensions.css.cell.height, Y = T * this._renderService.dimensions.css.cell.width;
            this.textarea.style.left = Y + "px", this.textarea.style.top = G + "px", this.textarea.style.width = W + "px", this.textarea.style.height = B + "px", this.textarea.style.lineHeight = B + "px", this.textarea.style.zIndex = "-5";
          }
          _initGlobal() {
            this._bindKeys(), this.register((0, f.addDisposableDomListener)(this.element, "copy", ((D) => {
              this.hasSelection() && (0, c.copyHandler)(D, this._selectionService);
            })));
            const C = (D) => (0, c.handlePasteEvent)(D, this.textarea, this.coreService, this.optionsService);
            this.register((0, f.addDisposableDomListener)(this.textarea, "paste", C)), this.register((0, f.addDisposableDomListener)(this.element, "paste", C)), H.isFirefox ? this.register((0, f.addDisposableDomListener)(this.element, "mousedown", ((D) => {
              D.button === 2 && (0, c.rightClickHandler)(D, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
            }))) : this.register((0, f.addDisposableDomListener)(this.element, "contextmenu", ((D) => {
              (0, c.rightClickHandler)(D, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
            }))), H.isLinux && this.register((0, f.addDisposableDomListener)(this.element, "auxclick", ((D) => {
              D.button === 1 && (0, c.moveTextAreaUnderMouseCursor)(D, this.textarea, this.screenElement);
            })));
          }
          _bindKeys() {
            this.register((0, f.addDisposableDomListener)(this.textarea, "keyup", ((C) => this._keyUp(C)), !0)), this.register((0, f.addDisposableDomListener)(this.textarea, "keydown", ((C) => this._keyDown(C)), !0)), this.register((0, f.addDisposableDomListener)(this.textarea, "keypress", ((C) => this._keyPress(C)), !0)), this.register((0, f.addDisposableDomListener)(this.textarea, "compositionstart", (() => this._compositionHelper.compositionstart()))), this.register((0, f.addDisposableDomListener)(this.textarea, "compositionupdate", ((C) => this._compositionHelper.compositionupdate(C)))), this.register((0, f.addDisposableDomListener)(this.textarea, "compositionend", (() => this._compositionHelper.compositionend()))), this.register((0, f.addDisposableDomListener)(this.textarea, "input", ((C) => this._inputEvent(C)), !0)), this.register(this.onRender((() => this._compositionHelper.updateCompositionElements())));
          }
          open(C) {
            var D;
            if (!C) throw new Error("Terminal requires a parent element.");
            C.isConnected || this._logService.debug("Terminal.open was called on an element that was not attached to the DOM"), this._document = C.ownerDocument, this.element = this._document.createElement("div"), this.element.dir = "ltr", this.element.classList.add("terminal"), this.element.classList.add("xterm"), C.appendChild(this.element);
            const T = N.createDocumentFragment();
            this._viewportElement = N.createElement("div"), this._viewportElement.classList.add("xterm-viewport"), T.appendChild(this._viewportElement), this._viewportScrollArea = N.createElement("div"), this._viewportScrollArea.classList.add("xterm-scroll-area"), this._viewportElement.appendChild(this._viewportScrollArea), this.screenElement = N.createElement("div"), this.screenElement.classList.add("xterm-screen"), this._helperContainer = N.createElement("div"), this._helperContainer.classList.add("xterm-helpers"), this.screenElement.appendChild(this._helperContainer), T.appendChild(this.screenElement), this.textarea = N.createElement("textarea"), this.textarea.classList.add("xterm-helper-textarea"), this.textarea.setAttribute("aria-label", u.promptLabel), H.isChromeOS || this.textarea.setAttribute("aria-multiline", "false"), this.textarea.setAttribute("autocorrect", "off"), this.textarea.setAttribute("autocapitalize", "off"), this.textarea.setAttribute("spellcheck", "false"), this.textarea.tabIndex = 0, this._coreBrowserService = this._instantiationService.createInstance(l.CoreBrowserService, this.textarea, (D = this._document.defaultView) !== null && D !== void 0 ? D : window), this._instantiationService.setService(m.ICoreBrowserService, this._coreBrowserService), this.register((0, f.addDisposableDomListener)(this.textarea, "focus", ((B) => this._handleTextAreaFocus(B)))), this.register((0, f.addDisposableDomListener)(this.textarea, "blur", (() => this._handleTextAreaBlur()))), this._helperContainer.appendChild(this.textarea), this._charSizeService = this._instantiationService.createInstance(i.CharSizeService, this._document, this._helperContainer), this._instantiationService.setService(m.ICharSizeService, this._charSizeService), this._themeService = this._instantiationService.createInstance(E.ThemeService), this._instantiationService.setService(m.IThemeService, this._themeService), this._characterJoinerService = this._instantiationService.createInstance(o.CharacterJoinerService), this._instantiationService.setService(m.ICharacterJoinerService, this._characterJoinerService), this._renderService = this.register(this._instantiationService.createInstance(d.RenderService, this.rows, this.screenElement)), this._instantiationService.setService(m.IRenderService, this._renderService), this.register(this._renderService.onRenderedViewportChange(((B) => this._onRender.fire(B)))), this.onResize(((B) => this._renderService.resize(B.cols, B.rows))), this._compositionView = N.createElement("div"), this._compositionView.classList.add("composition-view"), this._compositionHelper = this._instantiationService.createInstance(s.CompositionHelper, this.textarea, this._compositionView), this._helperContainer.appendChild(this._compositionView), this.element.appendChild(T);
            try {
              this._onWillOpen.fire(this.element);
            } catch {
            }
            this._renderService.hasRenderer() || this._renderService.setRenderer(this._createRenderer()), this._mouseService = this._instantiationService.createInstance(v.MouseService), this._instantiationService.setService(m.IMouseService, this._mouseService), this.viewport = this._instantiationService.createInstance(g.Viewport, this._viewportElement, this._viewportScrollArea), this.viewport.onRequestScrollLines(((B) => this.scrollLines(B.amount, B.suppressScrollEvent, 1))), this.register(this._inputHandler.onRequestSyncScrollBar((() => this.viewport.syncScrollArea()))), this.register(this.viewport), this.register(this.onCursorMove((() => {
              this._renderService.handleCursorMove(), this._syncTextArea();
            }))), this.register(this.onResize((() => this._renderService.handleResize(this.cols, this.rows)))), this.register(this.onBlur((() => this._renderService.handleBlur()))), this.register(this.onFocus((() => this._renderService.handleFocus()))), this.register(this._renderService.onDimensionsChange((() => this.viewport.syncScrollArea()))), this._selectionService = this.register(this._instantiationService.createInstance(h.SelectionService, this.element, this.screenElement, this.linkifier2)), this._instantiationService.setService(m.ISelectionService, this._selectionService), this.register(this._selectionService.onRequestScrollLines(((B) => this.scrollLines(B.amount, B.suppressScrollEvent)))), this.register(this._selectionService.onSelectionChange((() => this._onSelectionChange.fire()))), this.register(this._selectionService.onRequestRedraw(((B) => this._renderService.handleSelectionChanged(B.start, B.end, B.columnSelectMode)))), this.register(this._selectionService.onLinuxMouseSelection(((B) => {
              this.textarea.value = B, this.textarea.focus(), this.textarea.select();
            }))), this.register(this._onScroll.event(((B) => {
              this.viewport.syncScrollArea(), this._selectionService.refresh();
            }))), this.register((0, f.addDisposableDomListener)(this._viewportElement, "scroll", (() => this._selectionService.refresh()))), this.linkifier2.attachToDom(this.screenElement, this._mouseService, this._renderService), this.register(this._instantiationService.createInstance(_.BufferDecorationRenderer, this.screenElement)), this.register((0, f.addDisposableDomListener)(this.element, "mousedown", ((B) => this._selectionService.handleMouseDown(B)))), this.coreMouseService.areMouseEventsActive ? (this._selectionService.disable(), this.element.classList.add("enable-mouse-events")) : this._selectionService.enable(), this.options.screenReaderMode && (this._accessibilityManager.value = this._instantiationService.createInstance(F.AccessibilityManager, this)), this.register(this.optionsService.onSpecificOptionChange("screenReaderMode", ((B) => this._handleScreenReaderModeOptionChange(B)))), this.options.overviewRulerWidth && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(e.OverviewRulerRenderer, this._viewportElement, this.screenElement))), this.optionsService.onSpecificOptionChange("overviewRulerWidth", ((B) => {
              !this._overviewRulerRenderer && B && this._viewportElement && this.screenElement && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(e.OverviewRulerRenderer, this._viewportElement, this.screenElement)));
            })), this._charSizeService.measure(), this.refresh(0, this.rows - 1), this._initGlobal(), this.bindMouse();
          }
          _createRenderer() {
            return this._instantiationService.createInstance(t.DomRenderer, this.element, this.screenElement, this._viewportElement, this.linkifier2);
          }
          bindMouse() {
            const C = this, D = this.element;
            function T(W) {
              const G = C._mouseService.getMouseReportCoords(W, C.screenElement);
              if (!G) return !1;
              let Y, Q;
              switch (W.overrideType || W.type) {
                case "mousemove":
                  Q = 32, W.buttons === void 0 ? (Y = 3, W.button !== void 0 && (Y = W.button < 3 ? W.button : 3)) : Y = 1 & W.buttons ? 0 : 4 & W.buttons ? 1 : 2 & W.buttons ? 2 : 3;
                  break;
                case "mouseup":
                  Q = 0, Y = W.button < 3 ? W.button : 3;
                  break;
                case "mousedown":
                  Q = 1, Y = W.button < 3 ? W.button : 3;
                  break;
                case "wheel":
                  if (C.viewport.getLinesScrolled(W) === 0) return !1;
                  Q = W.deltaY < 0 ? 0 : 1, Y = 4;
                  break;
                default:
                  return !1;
              }
              return !(Q === void 0 || Y === void 0 || Y > 4) && C.coreMouseService.triggerMouseEvent({
                col: G.col,
                row: G.row,
                x: G.x,
                y: G.y,
                button: Y,
                action: Q,
                ctrl: W.ctrlKey,
                alt: W.altKey,
                shift: W.shiftKey
              });
            }
            const B = {
              mouseup: null,
              wheel: null,
              mousedrag: null,
              mousemove: null
            }, z = {
              mouseup: (W) => (T(W), W.buttons || (this._document.removeEventListener("mouseup", B.mouseup), B.mousedrag && this._document.removeEventListener("mousemove", B.mousedrag)), this.cancel(W)),
              wheel: (W) => (T(W), this.cancel(W, !0)),
              mousedrag: (W) => {
                W.buttons && T(W);
              },
              mousemove: (W) => {
                W.buttons || T(W);
              }
            };
            this.register(this.coreMouseService.onProtocolChange(((W) => {
              W ? (this.optionsService.rawOptions.logLevel === "debug" && this._logService.debug("Binding to mouse events:", this.coreMouseService.explainEvents(W)), this.element.classList.add("enable-mouse-events"), this._selectionService.disable()) : (this._logService.debug("Unbinding from mouse events."), this.element.classList.remove("enable-mouse-events"), this._selectionService.enable()), 8 & W ? B.mousemove || (D.addEventListener("mousemove", z.mousemove), B.mousemove = z.mousemove) : (D.removeEventListener("mousemove", B.mousemove), B.mousemove = null), 16 & W ? B.wheel || (D.addEventListener("wheel", z.wheel, { passive: !1 }), B.wheel = z.wheel) : (D.removeEventListener("wheel", B.wheel), B.wheel = null), 2 & W ? B.mouseup || (D.addEventListener("mouseup", z.mouseup), B.mouseup = z.mouseup) : (this._document.removeEventListener("mouseup", B.mouseup), D.removeEventListener("mouseup", B.mouseup), B.mouseup = null), 4 & W ? B.mousedrag || (B.mousedrag = z.mousedrag) : (this._document.removeEventListener("mousemove", B.mousedrag), B.mousedrag = null);
            }))), this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol, this.register((0, f.addDisposableDomListener)(D, "mousedown", ((W) => {
              if (W.preventDefault(), this.focus(), this.coreMouseService.areMouseEventsActive && !this._selectionService.shouldForceSelection(W)) return T(W), B.mouseup && this._document.addEventListener("mouseup", B.mouseup), B.mousedrag && this._document.addEventListener("mousemove", B.mousedrag), this.cancel(W);
            }))), this.register((0, f.addDisposableDomListener)(D, "wheel", ((W) => {
              if (!B.wheel) {
                if (!this.buffer.hasScrollback) {
                  const G = this.viewport.getLinesScrolled(W);
                  if (G === 0) return;
                  const Y = M.C0.ESC + (this.coreService.decPrivateModes.applicationCursorKeys ? "O" : "[") + (W.deltaY < 0 ? "A" : "B");
                  let Q = "";
                  for (let re = 0; re < Math.abs(G); re++) Q += Y;
                  return this.coreService.triggerDataEvent(Q, !0), this.cancel(W, !0);
                }
                return this.viewport.handleWheel(W) ? this.cancel(W) : void 0;
              }
            }), { passive: !1 })), this.register((0, f.addDisposableDomListener)(D, "touchstart", ((W) => {
              if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchStart(W), this.cancel(W);
            }), { passive: !0 })), this.register((0, f.addDisposableDomListener)(D, "touchmove", ((W) => {
              if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchMove(W) ? void 0 : this.cancel(W);
            }), { passive: !1 }));
          }
          refresh(C, D) {
            var T;
            (T = this._renderService) === null || T === void 0 || T.refreshRows(C, D);
          }
          updateCursorStyle(C) {
            var D;
            !((D = this._selectionService) === null || D === void 0) && D.shouldColumnSelect(C) ? this.element.classList.add("column-select") : this.element.classList.remove("column-select");
          }
          _showCursor() {
            this.coreService.isCursorInitialized || (this.coreService.isCursorInitialized = !0, this.refresh(this.buffer.y, this.buffer.y));
          }
          scrollLines(C, D, T = 0) {
            var B;
            T === 1 ? (super.scrollLines(C, D, T), this.refresh(0, this.rows - 1)) : (B = this.viewport) === null || B === void 0 || B.scrollLines(C);
          }
          paste(C) {
            (0, c.paste)(C, this.textarea, this.coreService, this.optionsService);
          }
          attachCustomKeyEventHandler(C) {
            this._customKeyEventHandler = C;
          }
          registerLinkProvider(C) {
            return this.linkifier2.registerLinkProvider(C);
          }
          registerCharacterJoiner(C) {
            if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
            const D = this._characterJoinerService.register(C);
            return this.refresh(0, this.rows - 1), D;
          }
          deregisterCharacterJoiner(C) {
            if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
            this._characterJoinerService.deregister(C) && this.refresh(0, this.rows - 1);
          }
          get markers() {
            return this.buffer.markers;
          }
          registerMarker(C) {
            return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + C);
          }
          registerDecoration(C) {
            return this._decorationService.registerDecoration(C);
          }
          hasSelection() {
            return !!this._selectionService && this._selectionService.hasSelection;
          }
          select(C, D, T) {
            this._selectionService.setSelection(C, D, T);
          }
          getSelection() {
            return this._selectionService ? this._selectionService.selectionText : "";
          }
          getSelectionPosition() {
            if (this._selectionService && this._selectionService.hasSelection) return {
              start: {
                x: this._selectionService.selectionStart[0],
                y: this._selectionService.selectionStart[1]
              },
              end: {
                x: this._selectionService.selectionEnd[0],
                y: this._selectionService.selectionEnd[1]
              }
            };
          }
          clearSelection() {
            var C;
            (C = this._selectionService) === null || C === void 0 || C.clearSelection();
          }
          selectAll() {
            var C;
            (C = this._selectionService) === null || C === void 0 || C.selectAll();
          }
          selectLines(C, D) {
            var T;
            (T = this._selectionService) === null || T === void 0 || T.selectLines(C, D);
          }
          _keyDown(C) {
            if (this._keyDownHandled = !1, this._keyDownSeen = !0, this._customKeyEventHandler && this._customKeyEventHandler(C) === !1) return !1;
            const D = this.browser.isMac && this.options.macOptionIsMeta && C.altKey;
            if (!D && !this._compositionHelper.keydown(C)) return this.options.scrollOnUserInput && this.buffer.ybase !== this.buffer.ydisp && this.scrollToBottom(), !1;
            D || C.key !== "Dead" && C.key !== "AltGraph" || (this._unprocessedDeadKey = !0);
            const T = (0, S.evaluateKeyboardEvent)(C, this.coreService.decPrivateModes.applicationCursorKeys, this.browser.isMac, this.options.macOptionIsMeta);
            if (this.updateCursorStyle(C), T.type === 3 || T.type === 2) {
              const B = this.rows - 1;
              return this.scrollLines(T.type === 2 ? -B : B), this.cancel(C, !0);
            }
            return T.type === 1 && this.selectAll(), !!this._isThirdLevelShift(this.browser, C) || (T.cancel && this.cancel(C, !0), !T.key || !!(C.key && !C.ctrlKey && !C.altKey && !C.metaKey && C.key.length === 1 && C.key.charCodeAt(0) >= 65 && C.key.charCodeAt(0) <= 90) || (this._unprocessedDeadKey ? (this._unprocessedDeadKey = !1, !0) : (T.key !== M.C0.ETX && T.key !== M.C0.CR || (this.textarea.value = ""), this._onKey.fire({
              key: T.key,
              domEvent: C
            }), this._showCursor(), this.coreService.triggerDataEvent(T.key, !0), !this.optionsService.rawOptions.screenReaderMode || C.altKey || C.ctrlKey ? this.cancel(C, !0) : void (this._keyDownHandled = !0))));
          }
          _isThirdLevelShift(C, D) {
            const T = C.isMac && !this.options.macOptionIsMeta && D.altKey && !D.ctrlKey && !D.metaKey || C.isWindows && D.altKey && D.ctrlKey && !D.metaKey || C.isWindows && D.getModifierState("AltGraph");
            return D.type === "keypress" ? T : T && (!D.keyCode || D.keyCode > 47);
          }
          _keyUp(C) {
            this._keyDownSeen = !1, this._customKeyEventHandler && this._customKeyEventHandler(C) === !1 || ((function(D) {
              return D.keyCode === 16 || D.keyCode === 17 || D.keyCode === 18;
            })(C) || this.focus(), this.updateCursorStyle(C), this._keyPressHandled = !1);
          }
          _keyPress(C) {
            let D;
            if (this._keyPressHandled = !1, this._keyDownHandled || this._customKeyEventHandler && this._customKeyEventHandler(C) === !1) return !1;
            if (this.cancel(C), C.charCode) D = C.charCode;
            else if (C.which === null || C.which === void 0) D = C.keyCode;
            else {
              if (C.which === 0 || C.charCode === 0) return !1;
              D = C.which;
            }
            return !(!D || (C.altKey || C.ctrlKey || C.metaKey) && !this._isThirdLevelShift(this.browser, C) || (D = String.fromCharCode(D), this._onKey.fire({
              key: D,
              domEvent: C
            }), this._showCursor(), this.coreService.triggerDataEvent(D, !0), this._keyPressHandled = !0, this._unprocessedDeadKey = !1, 0));
          }
          _inputEvent(C) {
            if (C.data && C.inputType === "insertText" && (!C.composed || !this._keyDownSeen) && !this.optionsService.rawOptions.screenReaderMode) {
              if (this._keyPressHandled) return !1;
              this._unprocessedDeadKey = !1;
              const D = C.data;
              return this.coreService.triggerDataEvent(D, !0), this.cancel(C), !0;
            }
            return !1;
          }
          resize(C, D) {
            C !== this.cols || D !== this.rows ? super.resize(C, D) : this._charSizeService && !this._charSizeService.hasValidSize && this._charSizeService.measure();
          }
          _afterResize(C, D) {
            var T, B;
            (T = this._charSizeService) === null || T === void 0 || T.measure(), (B = this.viewport) === null || B === void 0 || B.syncScrollArea(!0);
          }
          clear() {
            var C;
            if (this.buffer.ybase !== 0 || this.buffer.y !== 0) {
              this.buffer.clearAllMarkers(), this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y)), this.buffer.lines.length = 1, this.buffer.ydisp = 0, this.buffer.ybase = 0, this.buffer.y = 0;
              for (let D = 1; D < this.rows; D++) this.buffer.lines.push(this.buffer.getBlankLine(P.DEFAULT_ATTR_DATA));
              this._onScroll.fire({
                position: this.buffer.ydisp,
                source: 0
              }), (C = this.viewport) === null || C === void 0 || C.reset(), this.refresh(0, this.rows - 1);
            }
          }
          reset() {
            var C, D;
            this.options.rows = this.rows, this.options.cols = this.cols;
            const T = this._customKeyEventHandler;
            this._setup(), super.reset(), (C = this._selectionService) === null || C === void 0 || C.reset(), this._decorationService.reset(), (D = this.viewport) === null || D === void 0 || D.reset(), this._customKeyEventHandler = T, this.refresh(0, this.rows - 1);
          }
          clearTextureAtlas() {
            var C;
            (C = this._renderService) === null || C === void 0 || C.clearTextureAtlas();
          }
          _reportFocus() {
            var C;
            !((C = this.element) === null || C === void 0) && C.classList.contains("focus") ? this.coreService.triggerDataEvent(M.C0.ESC + "[I") : this.coreService.triggerDataEvent(M.C0.ESC + "[O");
          }
          _reportWindowsOptions(C) {
            if (this._renderService) switch (C) {
              case I.WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:
                const D = this._renderService.dimensions.css.canvas.width.toFixed(0), T = this._renderService.dimensions.css.canvas.height.toFixed(0);
                this.coreService.triggerDataEvent(`${M.C0.ESC}[4;${T};${D}t`);
                break;
              case I.WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:
                const B = this._renderService.dimensions.css.cell.width.toFixed(0), z = this._renderService.dimensions.css.cell.height.toFixed(0);
                this.coreService.triggerDataEvent(`${M.C0.ESC}[6;${z};${B}t`);
            }
          }
          cancel(C, D) {
            if (this.options.cancelEvents || D) return C.preventDefault(), C.stopPropagation(), !1;
          }
        }
        r.Terminal = $;
      },
      9924: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.TimeBasedDebouncer = void 0, r.TimeBasedDebouncer = class {
          constructor(a, c = 1e3) {
            this._renderCallback = a, this._debounceThresholdMS = c, this._lastRefreshMs = 0, this._additionalRefreshRequested = !1;
          }
          dispose() {
            this._refreshTimeoutID && clearTimeout(this._refreshTimeoutID);
          }
          refresh(a, c, f) {
            this._rowCount = f, a = a !== void 0 ? a : 0, c = c !== void 0 ? c : this._rowCount - 1, this._rowStart = this._rowStart !== void 0 ? Math.min(this._rowStart, a) : a, this._rowEnd = this._rowEnd !== void 0 ? Math.max(this._rowEnd, c) : c;
            const n = Date.now();
            if (n - this._lastRefreshMs >= this._debounceThresholdMS) this._lastRefreshMs = n, this._innerRefresh();
            else if (!this._additionalRefreshRequested) {
              const u = n - this._lastRefreshMs, p = this._debounceThresholdMS - u;
              this._additionalRefreshRequested = !0, this._refreshTimeoutID = window.setTimeout((() => {
                this._lastRefreshMs = Date.now(), this._innerRefresh(), this._additionalRefreshRequested = !1, this._refreshTimeoutID = void 0;
              }), p);
            }
          }
          _innerRefresh() {
            if (this._rowStart === void 0 || this._rowEnd === void 0 || this._rowCount === void 0) return;
            const a = Math.max(this._rowStart, 0), c = Math.min(this._rowEnd, this._rowCount - 1);
            this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(a, c);
          }
        };
      },
      1680: function(O, r, a) {
        var c = this && this.__decorate || function(s, t, i, o) {
          var l, v = arguments.length, d = v < 3 ? t : o === null ? o = Object.getOwnPropertyDescriptor(t, i) : o;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") d = Reflect.decorate(s, t, i, o);
          else for (var h = s.length - 1; h >= 0; h--) (l = s[h]) && (d = (v < 3 ? l(d) : v > 3 ? l(t, i, d) : l(t, i)) || d);
          return v > 3 && d && Object.defineProperty(t, i, d), d;
        }, f = this && this.__param || function(s, t) {
          return function(i, o) {
            t(i, o, s);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Viewport = void 0;
        const n = a(3656), u = a(4725), p = a(8460), g = a(844), _ = a(2585);
        let e = r.Viewport = class extends g.Disposable {
          constructor(s, t, i, o, l, v, d, h) {
            super(), this._viewportElement = s, this._scrollArea = t, this._bufferService = i, this._optionsService = o, this._charSizeService = l, this._renderService = v, this._coreBrowserService = d, this.scrollBarWidth = 0, this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._wheelPartialScroll = 0, this._refreshAnimationFrame = null, this._ignoreNextScrollEvent = !1, this._smoothScrollState = {
              startTime: 0,
              origin: -1,
              target: -1
            }, this._onRequestScrollLines = this.register(new p.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this.scrollBarWidth = this._viewportElement.offsetWidth - this._scrollArea.offsetWidth || 15, this.register((0, n.addDisposableDomListener)(this._viewportElement, "scroll", this._handleScroll.bind(this))), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate(((m) => this._activeBuffer = m.activeBuffer))), this._renderDimensions = this._renderService.dimensions, this.register(this._renderService.onDimensionsChange(((m) => this._renderDimensions = m))), this._handleThemeChange(h.colors), this.register(h.onChangeColors(((m) => this._handleThemeChange(m)))), this.register(this._optionsService.onSpecificOptionChange("scrollback", (() => this.syncScrollArea()))), setTimeout((() => this.syncScrollArea()));
          }
          _handleThemeChange(s) {
            this._viewportElement.style.backgroundColor = s.background.css;
          }
          reset() {
            this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._coreBrowserService.window.requestAnimationFrame((() => this.syncScrollArea()));
          }
          _refresh(s) {
            if (s) return this._innerRefresh(), void (this._refreshAnimationFrame !== null && this._coreBrowserService.window.cancelAnimationFrame(this._refreshAnimationFrame));
            this._refreshAnimationFrame === null && (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame((() => this._innerRefresh())));
          }
          _innerRefresh() {
            if (this._charSizeService.height > 0) {
              this._currentRowHeight = this._renderService.dimensions.device.cell.height / this._coreBrowserService.dpr, this._currentDeviceCellHeight = this._renderService.dimensions.device.cell.height, this._lastRecordedViewportHeight = this._viewportElement.offsetHeight;
              const t = Math.round(this._currentRowHeight * this._lastRecordedBufferLength) + (this._lastRecordedViewportHeight - this._renderService.dimensions.css.canvas.height);
              this._lastRecordedBufferHeight !== t && (this._lastRecordedBufferHeight = t, this._scrollArea.style.height = this._lastRecordedBufferHeight + "px");
            }
            const s = this._bufferService.buffer.ydisp * this._currentRowHeight;
            this._viewportElement.scrollTop !== s && (this._ignoreNextScrollEvent = !0, this._viewportElement.scrollTop = s), this._refreshAnimationFrame = null;
          }
          syncScrollArea(s = !1) {
            if (this._lastRecordedBufferLength !== this._bufferService.buffer.lines.length) return this._lastRecordedBufferLength = this._bufferService.buffer.lines.length, void this._refresh(s);
            this._lastRecordedViewportHeight === this._renderService.dimensions.css.canvas.height && this._lastScrollTop === this._activeBuffer.ydisp * this._currentRowHeight && this._renderDimensions.device.cell.height === this._currentDeviceCellHeight || this._refresh(s);
          }
          _handleScroll(s) {
            if (this._lastScrollTop = this._viewportElement.scrollTop, !this._viewportElement.offsetParent) return;
            if (this._ignoreNextScrollEvent) return this._ignoreNextScrollEvent = !1, void this._onRequestScrollLines.fire({
              amount: 0,
              suppressScrollEvent: !0
            });
            const t = Math.round(this._lastScrollTop / this._currentRowHeight) - this._bufferService.buffer.ydisp;
            this._onRequestScrollLines.fire({
              amount: t,
              suppressScrollEvent: !0
            });
          }
          _smoothScroll() {
            if (this._isDisposed || this._smoothScrollState.origin === -1 || this._smoothScrollState.target === -1) return;
            const s = this._smoothScrollPercent();
            this._viewportElement.scrollTop = this._smoothScrollState.origin + Math.round(s * (this._smoothScrollState.target - this._smoothScrollState.origin)), s < 1 ? this._coreBrowserService.window.requestAnimationFrame((() => this._smoothScroll())) : this._clearSmoothScrollState();
          }
          _smoothScrollPercent() {
            return this._optionsService.rawOptions.smoothScrollDuration && this._smoothScrollState.startTime ? Math.max(Math.min((Date.now() - this._smoothScrollState.startTime) / this._optionsService.rawOptions.smoothScrollDuration, 1), 0) : 1;
          }
          _clearSmoothScrollState() {
            this._smoothScrollState.startTime = 0, this._smoothScrollState.origin = -1, this._smoothScrollState.target = -1;
          }
          _bubbleScroll(s, t) {
            const i = this._viewportElement.scrollTop + this._lastRecordedViewportHeight;
            return !(t < 0 && this._viewportElement.scrollTop !== 0 || t > 0 && i < this._lastRecordedBufferHeight) || (s.cancelable && s.preventDefault(), !1);
          }
          handleWheel(s) {
            const t = this._getPixelsScrolled(s);
            return t !== 0 && (this._optionsService.rawOptions.smoothScrollDuration ? (this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, this._smoothScrollState.target === -1 ? this._smoothScrollState.target = this._viewportElement.scrollTop + t : this._smoothScrollState.target += t, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState()) : this._viewportElement.scrollTop += t, this._bubbleScroll(s, t));
          }
          scrollLines(s) {
            if (s !== 0) if (this._optionsService.rawOptions.smoothScrollDuration) {
              const t = s * this._currentRowHeight;
              this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, this._smoothScrollState.target = this._smoothScrollState.origin + t, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState();
            } else this._onRequestScrollLines.fire({
              amount: s,
              suppressScrollEvent: !1
            });
          }
          _getPixelsScrolled(s) {
            if (s.deltaY === 0 || s.shiftKey) return 0;
            let t = this._applyScrollModifier(s.deltaY, s);
            return s.deltaMode === WheelEvent.DOM_DELTA_LINE ? t *= this._currentRowHeight : s.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t *= this._currentRowHeight * this._bufferService.rows), t;
          }
          getBufferElements(s, t) {
            var i;
            let o, l = "";
            const v = [], d = t ?? this._bufferService.buffer.lines.length, h = this._bufferService.buffer.lines;
            for (let m = s; m < d; m++) {
              const E = h.get(m);
              if (!E) continue;
              const x = (i = h.get(m + 1)) === null || i === void 0 ? void 0 : i.isWrapped;
              if (l += E.translateToString(!x), !x || m === h.length - 1) {
                const b = document.createElement("div");
                b.textContent = l, v.push(b), l.length > 0 && (o = b), l = "";
              }
            }
            return {
              bufferElements: v,
              cursorElement: o
            };
          }
          getLinesScrolled(s) {
            if (s.deltaY === 0 || s.shiftKey) return 0;
            let t = this._applyScrollModifier(s.deltaY, s);
            return s.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? (t /= this._currentRowHeight + 0, this._wheelPartialScroll += t, t = Math.floor(Math.abs(this._wheelPartialScroll)) * (this._wheelPartialScroll > 0 ? 1 : -1), this._wheelPartialScroll %= 1) : s.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t *= this._bufferService.rows), t;
          }
          _applyScrollModifier(s, t) {
            const i = this._optionsService.rawOptions.fastScrollModifier;
            return i === "alt" && t.altKey || i === "ctrl" && t.ctrlKey || i === "shift" && t.shiftKey ? s * this._optionsService.rawOptions.fastScrollSensitivity * this._optionsService.rawOptions.scrollSensitivity : s * this._optionsService.rawOptions.scrollSensitivity;
          }
          handleTouchStart(s) {
            this._lastTouchY = s.touches[0].pageY;
          }
          handleTouchMove(s) {
            const t = this._lastTouchY - s.touches[0].pageY;
            return this._lastTouchY = s.touches[0].pageY, t !== 0 && (this._viewportElement.scrollTop += t, this._bubbleScroll(s, t));
          }
        };
        r.Viewport = e = c([
          f(2, _.IBufferService),
          f(3, _.IOptionsService),
          f(4, u.ICharSizeService),
          f(5, u.IRenderService),
          f(6, u.ICoreBrowserService),
          f(7, u.IThemeService)
        ], e);
      },
      3107: function(O, r, a) {
        var c = this && this.__decorate || function(e, s, t, i) {
          var o, l = arguments.length, v = l < 3 ? s : i === null ? i = Object.getOwnPropertyDescriptor(s, t) : i;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") v = Reflect.decorate(e, s, t, i);
          else for (var d = e.length - 1; d >= 0; d--) (o = e[d]) && (v = (l < 3 ? o(v) : l > 3 ? o(s, t, v) : o(s, t)) || v);
          return l > 3 && v && Object.defineProperty(s, t, v), v;
        }, f = this && this.__param || function(e, s) {
          return function(t, i) {
            s(t, i, e);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferDecorationRenderer = void 0;
        const n = a(3656), u = a(4725), p = a(844), g = a(2585);
        let _ = r.BufferDecorationRenderer = class extends p.Disposable {
          constructor(e, s, t, i) {
            super(), this._screenElement = e, this._bufferService = s, this._decorationService = t, this._renderService = i, this._decorationElements = /* @__PURE__ */ new Map(), this._altBufferIsActive = !1, this._dimensionsChanged = !1, this._container = document.createElement("div"), this._container.classList.add("xterm-decoration-container"), this._screenElement.appendChild(this._container), this.register(this._renderService.onRenderedViewportChange((() => this._doRefreshDecorations()))), this.register(this._renderService.onDimensionsChange((() => {
              this._dimensionsChanged = !0, this._queueRefresh();
            }))), this.register((0, n.addDisposableDomListener)(window, "resize", (() => this._queueRefresh()))), this.register(this._bufferService.buffers.onBufferActivate((() => {
              this._altBufferIsActive = this._bufferService.buffer === this._bufferService.buffers.alt;
            }))), this.register(this._decorationService.onDecorationRegistered((() => this._queueRefresh()))), this.register(this._decorationService.onDecorationRemoved(((o) => this._removeDecoration(o)))), this.register((0, p.toDisposable)((() => {
              this._container.remove(), this._decorationElements.clear();
            })));
          }
          _queueRefresh() {
            this._animationFrame === void 0 && (this._animationFrame = this._renderService.addRefreshCallback((() => {
              this._doRefreshDecorations(), this._animationFrame = void 0;
            })));
          }
          _doRefreshDecorations() {
            for (const e of this._decorationService.decorations) this._renderDecoration(e);
            this._dimensionsChanged = !1;
          }
          _renderDecoration(e) {
            this._refreshStyle(e), this._dimensionsChanged && this._refreshXPosition(e);
          }
          _createElement(e) {
            var s, t;
            const i = document.createElement("div");
            i.classList.add("xterm-decoration"), i.classList.toggle("xterm-decoration-top-layer", ((s = e?.options) === null || s === void 0 ? void 0 : s.layer) === "top"), i.style.width = `${Math.round((e.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`, i.style.height = (e.options.height || 1) * this._renderService.dimensions.css.cell.height + "px", i.style.top = (e.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height + "px", i.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`;
            const o = (t = e.options.x) !== null && t !== void 0 ? t : 0;
            return o && o > this._bufferService.cols && (i.style.display = "none"), this._refreshXPosition(e, i), i;
          }
          _refreshStyle(e) {
            const s = e.marker.line - this._bufferService.buffers.active.ydisp;
            if (s < 0 || s >= this._bufferService.rows) e.element && (e.element.style.display = "none", e.onRenderEmitter.fire(e.element));
            else {
              let t = this._decorationElements.get(e);
              t || (t = this._createElement(e), e.element = t, this._decorationElements.set(e, t), this._container.appendChild(t), e.onDispose((() => {
                this._decorationElements.delete(e), t.remove();
              }))), t.style.top = s * this._renderService.dimensions.css.cell.height + "px", t.style.display = this._altBufferIsActive ? "none" : "block", e.onRenderEmitter.fire(t);
            }
          }
          _refreshXPosition(e, s = e.element) {
            var t;
            if (!s) return;
            const i = (t = e.options.x) !== null && t !== void 0 ? t : 0;
            (e.options.anchor || "left") === "right" ? s.style.right = i ? i * this._renderService.dimensions.css.cell.width + "px" : "" : s.style.left = i ? i * this._renderService.dimensions.css.cell.width + "px" : "";
          }
          _removeDecoration(e) {
            var s;
            (s = this._decorationElements.get(e)) === null || s === void 0 || s.remove(), this._decorationElements.delete(e), e.dispose();
          }
        };
        r.BufferDecorationRenderer = _ = c([
          f(1, g.IBufferService),
          f(2, g.IDecorationService),
          f(3, u.IRenderService)
        ], _);
      },
      5871: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.ColorZoneStore = void 0, r.ColorZoneStore = class {
          constructor() {
            this._zones = [], this._zonePool = [], this._zonePoolIndex = 0, this._linePadding = {
              full: 0,
              left: 0,
              center: 0,
              right: 0
            };
          }
          get zones() {
            return this._zonePool.length = Math.min(this._zonePool.length, this._zones.length), this._zones;
          }
          clear() {
            this._zones.length = 0, this._zonePoolIndex = 0;
          }
          addDecoration(a) {
            if (a.options.overviewRulerOptions) {
              for (const c of this._zones) if (c.color === a.options.overviewRulerOptions.color && c.position === a.options.overviewRulerOptions.position) {
                if (this._lineIntersectsZone(c, a.marker.line)) return;
                if (this._lineAdjacentToZone(c, a.marker.line, a.options.overviewRulerOptions.position)) return void this._addLineToZone(c, a.marker.line);
              }
              if (this._zonePoolIndex < this._zonePool.length) return this._zonePool[this._zonePoolIndex].color = a.options.overviewRulerOptions.color, this._zonePool[this._zonePoolIndex].position = a.options.overviewRulerOptions.position, this._zonePool[this._zonePoolIndex].startBufferLine = a.marker.line, this._zonePool[this._zonePoolIndex].endBufferLine = a.marker.line, void this._zones.push(this._zonePool[this._zonePoolIndex++]);
              this._zones.push({
                color: a.options.overviewRulerOptions.color,
                position: a.options.overviewRulerOptions.position,
                startBufferLine: a.marker.line,
                endBufferLine: a.marker.line
              }), this._zonePool.push(this._zones[this._zones.length - 1]), this._zonePoolIndex++;
            }
          }
          setPadding(a) {
            this._linePadding = a;
          }
          _lineIntersectsZone(a, c) {
            return c >= a.startBufferLine && c <= a.endBufferLine;
          }
          _lineAdjacentToZone(a, c, f) {
            return c >= a.startBufferLine - this._linePadding[f || "full"] && c <= a.endBufferLine + this._linePadding[f || "full"];
          }
          _addLineToZone(a, c) {
            a.startBufferLine = Math.min(a.startBufferLine, c), a.endBufferLine = Math.max(a.endBufferLine, c);
          }
        };
      },
      5744: function(O, r, a) {
        var c = this && this.__decorate || function(o, l, v, d) {
          var h, m = arguments.length, E = m < 3 ? l : d === null ? d = Object.getOwnPropertyDescriptor(l, v) : d;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") E = Reflect.decorate(o, l, v, d);
          else for (var x = o.length - 1; x >= 0; x--) (h = o[x]) && (E = (m < 3 ? h(E) : m > 3 ? h(l, v, E) : h(l, v)) || E);
          return m > 3 && E && Object.defineProperty(l, v, E), E;
        }, f = this && this.__param || function(o, l) {
          return function(v, d) {
            l(v, d, o);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.OverviewRulerRenderer = void 0;
        const n = a(5871), u = a(3656), p = a(4725), g = a(844), _ = a(2585), e = {
          full: 0,
          left: 0,
          center: 0,
          right: 0
        }, s = {
          full: 0,
          left: 0,
          center: 0,
          right: 0
        }, t = {
          full: 0,
          left: 0,
          center: 0,
          right: 0
        };
        let i = r.OverviewRulerRenderer = class extends g.Disposable {
          get _width() {
            return this._optionsService.options.overviewRulerWidth || 0;
          }
          constructor(o, l, v, d, h, m, E) {
            var x;
            super(), this._viewportElement = o, this._screenElement = l, this._bufferService = v, this._decorationService = d, this._renderService = h, this._optionsService = m, this._coreBrowseService = E, this._colorZoneStore = new n.ColorZoneStore(), this._shouldUpdateDimensions = !0, this._shouldUpdateAnchor = !0, this._lastKnownBufferLength = 0, this._canvas = document.createElement("canvas"), this._canvas.classList.add("xterm-decoration-overview-ruler"), this._refreshCanvasDimensions(), (x = this._viewportElement.parentElement) === null || x === void 0 || x.insertBefore(this._canvas, this._viewportElement);
            const b = this._canvas.getContext("2d");
            if (!b) throw new Error("Ctx cannot be null");
            this._ctx = b, this._registerDecorationListeners(), this._registerBufferChangeListeners(), this._registerDimensionChangeListeners(), this.register((0, g.toDisposable)((() => {
              var k;
              (k = this._canvas) === null || k === void 0 || k.remove();
            })));
          }
          _registerDecorationListeners() {
            this.register(this._decorationService.onDecorationRegistered((() => this._queueRefresh(void 0, !0)))), this.register(this._decorationService.onDecorationRemoved((() => this._queueRefresh(void 0, !0))));
          }
          _registerBufferChangeListeners() {
            this.register(this._renderService.onRenderedViewportChange((() => this._queueRefresh()))), this.register(this._bufferService.buffers.onBufferActivate((() => {
              this._canvas.style.display = this._bufferService.buffer === this._bufferService.buffers.alt ? "none" : "block";
            }))), this.register(this._bufferService.onScroll((() => {
              this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length && (this._refreshDrawHeightConstants(), this._refreshColorZonePadding());
            })));
          }
          _registerDimensionChangeListeners() {
            this.register(this._renderService.onRender((() => {
              this._containerHeight && this._containerHeight === this._screenElement.clientHeight || (this._queueRefresh(!0), this._containerHeight = this._screenElement.clientHeight);
            }))), this.register(this._optionsService.onSpecificOptionChange("overviewRulerWidth", (() => this._queueRefresh(!0)))), this.register((0, u.addDisposableDomListener)(this._coreBrowseService.window, "resize", (() => this._queueRefresh(!0)))), this._queueRefresh(!0);
          }
          _refreshDrawConstants() {
            const o = Math.floor(this._canvas.width / 3), l = Math.ceil(this._canvas.width / 3);
            s.full = this._canvas.width, s.left = o, s.center = l, s.right = o, this._refreshDrawHeightConstants(), t.full = 0, t.left = 0, t.center = s.left, t.right = s.left + s.center;
          }
          _refreshDrawHeightConstants() {
            e.full = Math.round(2 * this._coreBrowseService.dpr);
            const o = this._canvas.height / this._bufferService.buffer.lines.length, l = Math.round(Math.max(Math.min(o, 12), 6) * this._coreBrowseService.dpr);
            e.left = l, e.center = l, e.right = l;
          }
          _refreshColorZonePadding() {
            this._colorZoneStore.setPadding({
              full: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * e.full),
              left: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * e.left),
              center: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * e.center),
              right: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * e.right)
            }), this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length;
          }
          _refreshCanvasDimensions() {
            this._canvas.style.width = `${this._width}px`, this._canvas.width = Math.round(this._width * this._coreBrowseService.dpr), this._canvas.style.height = `${this._screenElement.clientHeight}px`, this._canvas.height = Math.round(this._screenElement.clientHeight * this._coreBrowseService.dpr), this._refreshDrawConstants(), this._refreshColorZonePadding();
          }
          _refreshDecorations() {
            this._shouldUpdateDimensions && this._refreshCanvasDimensions(), this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height), this._colorZoneStore.clear();
            for (const l of this._decorationService.decorations) this._colorZoneStore.addDecoration(l);
            this._ctx.lineWidth = 1;
            const o = this._colorZoneStore.zones;
            for (const l of o) l.position !== "full" && this._renderColorZone(l);
            for (const l of o) l.position === "full" && this._renderColorZone(l);
            this._shouldUpdateDimensions = !1, this._shouldUpdateAnchor = !1;
          }
          _renderColorZone(o) {
            this._ctx.fillStyle = o.color, this._ctx.fillRect(t[o.position || "full"], Math.round((this._canvas.height - 1) * (o.startBufferLine / this._bufferService.buffers.active.lines.length) - e[o.position || "full"] / 2), s[o.position || "full"], Math.round((this._canvas.height - 1) * ((o.endBufferLine - o.startBufferLine) / this._bufferService.buffers.active.lines.length) + e[o.position || "full"]));
          }
          _queueRefresh(o, l) {
            this._shouldUpdateDimensions = o || this._shouldUpdateDimensions, this._shouldUpdateAnchor = l || this._shouldUpdateAnchor, this._animationFrame === void 0 && (this._animationFrame = this._coreBrowseService.window.requestAnimationFrame((() => {
              this._refreshDecorations(), this._animationFrame = void 0;
            })));
          }
        };
        r.OverviewRulerRenderer = i = c([
          f(2, _.IBufferService),
          f(3, _.IDecorationService),
          f(4, p.IRenderService),
          f(5, _.IOptionsService),
          f(6, p.ICoreBrowserService)
        ], i);
      },
      2950: function(O, r, a) {
        var c = this && this.__decorate || function(_, e, s, t) {
          var i, o = arguments.length, l = o < 3 ? e : t === null ? t = Object.getOwnPropertyDescriptor(e, s) : t;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") l = Reflect.decorate(_, e, s, t);
          else for (var v = _.length - 1; v >= 0; v--) (i = _[v]) && (l = (o < 3 ? i(l) : o > 3 ? i(e, s, l) : i(e, s)) || l);
          return o > 3 && l && Object.defineProperty(e, s, l), l;
        }, f = this && this.__param || function(_, e) {
          return function(s, t) {
            e(s, t, _);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CompositionHelper = void 0;
        const n = a(4725), u = a(2585), p = a(2584);
        let g = r.CompositionHelper = class {
          get isComposing() {
            return this._isComposing;
          }
          constructor(_, e, s, t, i, o) {
            this._textarea = _, this._compositionView = e, this._bufferService = s, this._optionsService = t, this._coreService = i, this._renderService = o, this._isComposing = !1, this._isSendingComposition = !1, this._compositionPosition = {
              start: 0,
              end: 0
            }, this._dataAlreadySent = "";
          }
          compositionstart() {
            this._isComposing = !0, this._compositionPosition.start = this._textarea.value.length, this._compositionView.textContent = "", this._dataAlreadySent = "", this._compositionView.classList.add("active");
          }
          compositionupdate(_) {
            this._compositionView.textContent = _.data, this.updateCompositionElements(), setTimeout((() => {
              this._compositionPosition.end = this._textarea.value.length;
            }), 0);
          }
          compositionend() {
            this._finalizeComposition(!0);
          }
          keydown(_) {
            if (this._isComposing || this._isSendingComposition) {
              if (_.keyCode === 229 || _.keyCode === 16 || _.keyCode === 17 || _.keyCode === 18) return !1;
              this._finalizeComposition(!1);
            }
            return _.keyCode !== 229 || (this._handleAnyTextareaChanges(), !1);
          }
          _finalizeComposition(_) {
            if (this._compositionView.classList.remove("active"), this._isComposing = !1, _) {
              const e = {
                start: this._compositionPosition.start,
                end: this._compositionPosition.end
              };
              this._isSendingComposition = !0, setTimeout((() => {
                if (this._isSendingComposition) {
                  let s;
                  this._isSendingComposition = !1, e.start += this._dataAlreadySent.length, s = this._isComposing ? this._textarea.value.substring(e.start, e.end) : this._textarea.value.substring(e.start), s.length > 0 && this._coreService.triggerDataEvent(s, !0);
                }
              }), 0);
            } else {
              this._isSendingComposition = !1;
              const e = this._textarea.value.substring(this._compositionPosition.start, this._compositionPosition.end);
              this._coreService.triggerDataEvent(e, !0);
            }
          }
          _handleAnyTextareaChanges() {
            const _ = this._textarea.value;
            setTimeout((() => {
              if (!this._isComposing) {
                const e = this._textarea.value, s = e.replace(_, "");
                this._dataAlreadySent = s, e.length > _.length ? this._coreService.triggerDataEvent(s, !0) : e.length < _.length ? this._coreService.triggerDataEvent(`${p.C0.DEL}`, !0) : e.length === _.length && e !== _ && this._coreService.triggerDataEvent(e, !0);
              }
            }), 0);
          }
          updateCompositionElements(_) {
            if (this._isComposing) {
              if (this._bufferService.buffer.isCursorInViewport) {
                const e = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1), s = this._renderService.dimensions.css.cell.height, t = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height, i = e * this._renderService.dimensions.css.cell.width;
                this._compositionView.style.left = i + "px", this._compositionView.style.top = t + "px", this._compositionView.style.height = s + "px", this._compositionView.style.lineHeight = s + "px", this._compositionView.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._compositionView.style.fontSize = this._optionsService.rawOptions.fontSize + "px";
                const o = this._compositionView.getBoundingClientRect();
                this._textarea.style.left = i + "px", this._textarea.style.top = t + "px", this._textarea.style.width = Math.max(o.width, 1) + "px", this._textarea.style.height = Math.max(o.height, 1) + "px", this._textarea.style.lineHeight = o.height + "px";
              }
              _ || setTimeout((() => this.updateCompositionElements(!0)), 0);
            }
          }
        };
        r.CompositionHelper = g = c([
          f(2, u.IBufferService),
          f(3, u.IOptionsService),
          f(4, u.ICoreService),
          f(5, n.IRenderService)
        ], g);
      },
      9806: (O, r) => {
        function a(c, f, n) {
          const u = n.getBoundingClientRect(), p = c.getComputedStyle(n), g = parseInt(p.getPropertyValue("padding-left")), _ = parseInt(p.getPropertyValue("padding-top"));
          return [f.clientX - u.left - g, f.clientY - u.top - _];
        }
        Object.defineProperty(r, "__esModule", { value: !0 }), r.getCoords = r.getCoordsRelativeToElement = void 0, r.getCoordsRelativeToElement = a, r.getCoords = function(c, f, n, u, p, g, _, e, s) {
          if (!g) return;
          const t = a(c, f, n);
          return t ? (t[0] = Math.ceil((t[0] + (s ? _ / 2 : 0)) / _), t[1] = Math.ceil(t[1] / e), t[0] = Math.min(Math.max(t[0], 1), u + (s ? 1 : 0)), t[1] = Math.min(Math.max(t[1], 1), p), t) : void 0;
        };
      },
      9504: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.moveToCellSequence = void 0;
        const c = a(2584);
        function f(e, s, t, i) {
          const o = e - n(e, t), l = s - n(s, t);
          return _(Math.abs(o - l) - (function(v, d, h) {
            let m = 0;
            const E = v - n(v, h), x = d - n(d, h);
            for (let b = 0; b < Math.abs(E - x); b++) {
              const k = u(v, d) === "A" ? -1 : 1, R = h.buffer.lines.get(E + k * b);
              R != null && R.isWrapped && m++;
            }
            return m;
          })(e, s, t), g(u(e, s), i));
        }
        function n(e, s) {
          let t = 0, i = s.buffer.lines.get(e), o = i?.isWrapped;
          for (; o && e >= 0 && e < s.rows; ) t++, i = s.buffer.lines.get(--e), o = i?.isWrapped;
          return t;
        }
        function u(e, s) {
          return e > s ? "A" : "B";
        }
        function p(e, s, t, i, o, l) {
          let v = e, d = s, h = "";
          for (; v !== t || d !== i; ) v += o ? 1 : -1, o && v > l.cols - 1 ? (h += l.buffer.translateBufferLineToString(d, !1, e, v), v = 0, e = 0, d++) : !o && v < 0 && (h += l.buffer.translateBufferLineToString(d, !1, 0, e + 1), v = l.cols - 1, e = v, d--);
          return h + l.buffer.translateBufferLineToString(d, !1, e, v);
        }
        function g(e, s) {
          const t = s ? "O" : "[";
          return c.C0.ESC + t + e;
        }
        function _(e, s) {
          e = Math.floor(e);
          let t = "";
          for (let i = 0; i < e; i++) t += s;
          return t;
        }
        r.moveToCellSequence = function(e, s, t, i) {
          const o = t.buffer.x, l = t.buffer.y;
          if (!t.buffer.hasScrollback) return (function(h, m, E, x, b, k) {
            return f(m, x, b, k).length === 0 ? "" : _(p(h, m, h, m - n(m, b), !1, b).length, g("D", k));
          })(o, l, 0, s, t, i) + f(l, s, t, i) + (function(h, m, E, x, b, k) {
            let R;
            R = f(m, x, b, k).length > 0 ? x - n(x, b) : m;
            const H = x, P = (function(M, S, y, w, L, I) {
              let F;
              return F = f(y, w, L, I).length > 0 ? w - n(w, L) : S, M < y && F <= w || M >= y && F < w ? "C" : "D";
            })(h, m, E, x, b, k);
            return _(p(h, R, E, H, P === "C", b).length, g(P, k));
          })(o, l, e, s, t, i);
          let v;
          if (l === s) return v = o > e ? "D" : "C", _(Math.abs(o - e), g(v, i));
          v = l > s ? "D" : "C";
          const d = Math.abs(l - s);
          return _((function(h, m) {
            return m.cols - h;
          })(l > s ? e : o, t) + (d - 1) * t.cols + 1 + ((l > s ? o : e) - 1), g(v, i));
        };
      },
      1296: function(O, r, a) {
        var c = this && this.__decorate || function(b, k, R, H) {
          var P, M = arguments.length, S = M < 3 ? k : H === null ? H = Object.getOwnPropertyDescriptor(k, R) : H;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") S = Reflect.decorate(b, k, R, H);
          else for (var y = b.length - 1; y >= 0; y--) (P = b[y]) && (S = (M < 3 ? P(S) : M > 3 ? P(k, R, S) : P(k, R)) || S);
          return M > 3 && S && Object.defineProperty(k, R, S), S;
        }, f = this && this.__param || function(b, k) {
          return function(R, H) {
            k(R, H, b);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.DomRenderer = void 0;
        const n = a(3787), u = a(2550), p = a(2223), g = a(6171), _ = a(4725), e = a(8055), s = a(8460), t = a(844), i = a(2585), o = "xterm-dom-renderer-owner-", l = "xterm-rows", v = "xterm-fg-", d = "xterm-bg-", h = "xterm-focus", m = "xterm-selection";
        let E = 1, x = r.DomRenderer = class extends t.Disposable {
          constructor(b, k, R, H, P, M, S, y, w, L) {
            super(), this._element = b, this._screenElement = k, this._viewportElement = R, this._linkifier2 = H, this._charSizeService = M, this._optionsService = S, this._bufferService = y, this._coreBrowserService = w, this._themeService = L, this._terminalClass = E++, this._rowElements = [], this.onRequestRedraw = this.register(new s.EventEmitter()).event, this._rowContainer = document.createElement("div"), this._rowContainer.classList.add(l), this._rowContainer.style.lineHeight = "normal", this._rowContainer.setAttribute("aria-hidden", "true"), this._refreshRowElements(this._bufferService.cols, this._bufferService.rows), this._selectionContainer = document.createElement("div"), this._selectionContainer.classList.add(m), this._selectionContainer.setAttribute("aria-hidden", "true"), this.dimensions = (0, g.createRenderDimensions)(), this._updateDimensions(), this.register(this._optionsService.onOptionChange((() => this._handleOptionsChanged()))), this.register(this._themeService.onChangeColors(((I) => this._injectCss(I)))), this._injectCss(this._themeService.colors), this._rowFactory = P.createInstance(n.DomRendererRowFactory, document), this._element.classList.add(o + this._terminalClass), this._screenElement.appendChild(this._rowContainer), this._screenElement.appendChild(this._selectionContainer), this.register(this._linkifier2.onShowLinkUnderline(((I) => this._handleLinkHover(I)))), this.register(this._linkifier2.onHideLinkUnderline(((I) => this._handleLinkLeave(I)))), this.register((0, t.toDisposable)((() => {
              this._element.classList.remove(o + this._terminalClass), this._rowContainer.remove(), this._selectionContainer.remove(), this._widthCache.dispose(), this._themeStyleElement.remove(), this._dimensionsStyleElement.remove();
            }))), this._widthCache = new u.WidthCache(document), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
          }
          _updateDimensions() {
            const b = this._coreBrowserService.dpr;
            this.dimensions.device.char.width = this._charSizeService.width * b, this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * b), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.left = 0, this.dimensions.device.char.top = 0, this.dimensions.device.canvas.width = this.dimensions.device.cell.width * this._bufferService.cols, this.dimensions.device.canvas.height = this.dimensions.device.cell.height * this._bufferService.rows, this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / b), this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / b), this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols, this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
            for (const R of this._rowElements) R.style.width = `${this.dimensions.css.canvas.width}px`, R.style.height = `${this.dimensions.css.cell.height}px`, R.style.lineHeight = `${this.dimensions.css.cell.height}px`, R.style.overflow = "hidden";
            this._dimensionsStyleElement || (this._dimensionsStyleElement = document.createElement("style"), this._screenElement.appendChild(this._dimensionsStyleElement));
            const k = `${this._terminalSelector} .${l} span { display: inline-block; height: 100%; vertical-align: top;}`;
            this._dimensionsStyleElement.textContent = k, this._selectionContainer.style.height = this._viewportElement.style.height, this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
          }
          _injectCss(b) {
            this._themeStyleElement || (this._themeStyleElement = document.createElement("style"), this._screenElement.appendChild(this._themeStyleElement));
            let k = `${this._terminalSelector} .${l} { color: ${b.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
            k += `${this._terminalSelector} .${l} .xterm-dim { color: ${e.color.multiplyOpacity(b.foreground, 0.5).css};}`, k += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`, k += "@keyframes blink_box_shadow_" + this._terminalClass + " { 50% {  border-bottom-style: hidden; }}", k += "@keyframes blink_block_" + this._terminalClass + ` { 0% {  background-color: ${b.cursor.css};  color: ${b.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${b.cursor.css}; }}`, k += `${this._terminalSelector} .${l}.${h} .xterm-cursor.xterm-cursor-blink:not(.xterm-cursor-block) { animation: blink_box_shadow_` + this._terminalClass + ` 1s step-end infinite;}${this._terminalSelector} .${l}.${h} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: blink_block_` + this._terminalClass + ` 1s step-end infinite;}${this._terminalSelector} .${l} .xterm-cursor.xterm-cursor-block { background-color: ${b.cursor.css}; color: ${b.cursorAccent.css};}${this._terminalSelector} .${l} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${b.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${l} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${b.cursor.css} inset;}${this._terminalSelector} .${l} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${b.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`, k += `${this._terminalSelector} .${m} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${m} div { position: absolute; background-color: ${b.selectionBackgroundOpaque.css};}${this._terminalSelector} .${m} div { position: absolute; background-color: ${b.selectionInactiveBackgroundOpaque.css};}`;
            for (const [R, H] of b.ansi.entries()) k += `${this._terminalSelector} .${v}${R} { color: ${H.css}; }${this._terminalSelector} .${v}${R}.xterm-dim { color: ${e.color.multiplyOpacity(H, 0.5).css}; }${this._terminalSelector} .${d}${R} { background-color: ${H.css}; }`;
            k += `${this._terminalSelector} .${v}${p.INVERTED_DEFAULT_COLOR} { color: ${e.color.opaque(b.background).css}; }${this._terminalSelector} .${v}${p.INVERTED_DEFAULT_COLOR}.xterm-dim { color: ${e.color.multiplyOpacity(e.color.opaque(b.background), 0.5).css}; }${this._terminalSelector} .${d}${p.INVERTED_DEFAULT_COLOR} { background-color: ${b.foreground.css}; }`, this._themeStyleElement.textContent = k;
          }
          _setDefaultSpacing() {
            const b = this.dimensions.css.cell.width - this._widthCache.get("W", !1, !1);
            this._rowContainer.style.letterSpacing = `${b}px`, this._rowFactory.defaultSpacing = b;
          }
          handleDevicePixelRatioChange() {
            this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
          }
          _refreshRowElements(b, k) {
            for (let R = this._rowElements.length; R <= k; R++) {
              const H = document.createElement("div");
              this._rowContainer.appendChild(H), this._rowElements.push(H);
            }
            for (; this._rowElements.length > k; ) this._rowContainer.removeChild(this._rowElements.pop());
          }
          handleResize(b, k) {
            this._refreshRowElements(b, k), this._updateDimensions();
          }
          handleCharSizeChanged() {
            this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
          }
          handleBlur() {
            this._rowContainer.classList.remove(h);
          }
          handleFocus() {
            this._rowContainer.classList.add(h), this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y);
          }
          handleSelectionChanged(b, k, R) {
            if (this._selectionContainer.replaceChildren(), this._rowFactory.handleSelectionChanged(b, k, R), this.renderRows(0, this._bufferService.rows - 1), !b || !k) return;
            const H = b[1] - this._bufferService.buffer.ydisp, P = k[1] - this._bufferService.buffer.ydisp, M = Math.max(H, 0), S = Math.min(P, this._bufferService.rows - 1);
            if (M >= this._bufferService.rows || S < 0) return;
            const y = document.createDocumentFragment();
            if (R) {
              const w = b[0] > k[0];
              y.appendChild(this._createSelectionElement(M, w ? k[0] : b[0], w ? b[0] : k[0], S - M + 1));
            } else {
              const w = H === M ? b[0] : 0, L = M === P ? k[0] : this._bufferService.cols;
              y.appendChild(this._createSelectionElement(M, w, L));
              const I = S - M - 1;
              if (y.appendChild(this._createSelectionElement(M + 1, 0, this._bufferService.cols, I)), M !== S) {
                const F = P === S ? k[0] : this._bufferService.cols;
                y.appendChild(this._createSelectionElement(S, 0, F));
              }
            }
            this._selectionContainer.appendChild(y);
          }
          _createSelectionElement(b, k, R, H = 1) {
            const P = document.createElement("div");
            return P.style.height = H * this.dimensions.css.cell.height + "px", P.style.top = b * this.dimensions.css.cell.height + "px", P.style.left = k * this.dimensions.css.cell.width + "px", P.style.width = this.dimensions.css.cell.width * (R - k) + "px", P;
          }
          handleCursorMove() {
          }
          _handleOptionsChanged() {
            this._updateDimensions(), this._injectCss(this._themeService.colors), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
          }
          clear() {
            for (const b of this._rowElements) b.replaceChildren();
          }
          renderRows(b, k) {
            const R = this._bufferService.buffer, H = R.ybase + R.y, P = Math.min(R.x, this._bufferService.cols - 1), M = this._optionsService.rawOptions.cursorBlink, S = this._optionsService.rawOptions.cursorStyle, y = this._optionsService.rawOptions.cursorInactiveStyle;
            for (let w = b; w <= k; w++) {
              const L = w + R.ydisp, I = this._rowElements[w], F = R.lines.get(L);
              if (!I || !F) break;
              I.replaceChildren(...this._rowFactory.createRow(F, L, L === H, S, y, P, M, this.dimensions.css.cell.width, this._widthCache, -1, -1));
            }
          }
          get _terminalSelector() {
            return `.${o}${this._terminalClass}`;
          }
          _handleLinkHover(b) {
            this._setCellUnderline(b.x1, b.x2, b.y1, b.y2, b.cols, !0);
          }
          _handleLinkLeave(b) {
            this._setCellUnderline(b.x1, b.x2, b.y1, b.y2, b.cols, !1);
          }
          _setCellUnderline(b, k, R, H, P, M) {
            R < 0 && (b = 0), H < 0 && (k = 0);
            const S = this._bufferService.rows - 1;
            R = Math.max(Math.min(R, S), 0), H = Math.max(Math.min(H, S), 0), P = Math.min(P, this._bufferService.cols);
            const y = this._bufferService.buffer, w = y.ybase + y.y, L = Math.min(y.x, P - 1), I = this._optionsService.rawOptions.cursorBlink, F = this._optionsService.rawOptions.cursorStyle, N = this._optionsService.rawOptions.cursorInactiveStyle;
            for (let $ = R; $ <= H; ++$) {
              const X = $ + y.ydisp, C = this._rowElements[$], D = y.lines.get(X);
              if (!C || !D) break;
              C.replaceChildren(...this._rowFactory.createRow(D, X, X === w, F, N, L, I, this.dimensions.css.cell.width, this._widthCache, M ? $ === R ? b : 0 : -1, M ? ($ === H ? k : P) - 1 : -1));
            }
          }
        };
        r.DomRenderer = x = c([
          f(4, i.IInstantiationService),
          f(5, _.ICharSizeService),
          f(6, i.IOptionsService),
          f(7, i.IBufferService),
          f(8, _.ICoreBrowserService),
          f(9, _.IThemeService)
        ], x);
      },
      3787: function(O, r, a) {
        var c = this && this.__decorate || function(v, d, h, m) {
          var E, x = arguments.length, b = x < 3 ? d : m === null ? m = Object.getOwnPropertyDescriptor(d, h) : m;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") b = Reflect.decorate(v, d, h, m);
          else for (var k = v.length - 1; k >= 0; k--) (E = v[k]) && (b = (x < 3 ? E(b) : x > 3 ? E(d, h, b) : E(d, h)) || b);
          return x > 3 && b && Object.defineProperty(d, h, b), b;
        }, f = this && this.__param || function(v, d) {
          return function(h, m) {
            d(h, m, v);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.DomRendererRowFactory = void 0;
        const n = a(2223), u = a(643), p = a(511), g = a(2585), _ = a(8055), e = a(4725), s = a(4269), t = a(6171), i = a(3734);
        let o = r.DomRendererRowFactory = class {
          constructor(v, d, h, m, E, x, b) {
            this._document = v, this._characterJoinerService = d, this._optionsService = h, this._coreBrowserService = m, this._coreService = E, this._decorationService = x, this._themeService = b, this._workCell = new p.CellData(), this._columnSelectMode = !1, this.defaultSpacing = 0;
          }
          handleSelectionChanged(v, d, h) {
            this._selectionStart = v, this._selectionEnd = d, this._columnSelectMode = h;
          }
          createRow(v, d, h, m, E, x, b, k, R, H, P) {
            const M = [], S = this._characterJoinerService.getJoinedCharacters(d), y = this._themeService.colors;
            let w, L = v.getNoBgTrimmedLength();
            h && L < x + 1 && (L = x + 1);
            let I = 0, F = "", N = 0, $ = 0, X = 0, C = !1, D = 0, T = !1, B = 0;
            const z = [], W = H !== -1 && P !== -1;
            for (let G = 0; G < L; G++) {
              v.loadCell(G, this._workCell);
              let Y = this._workCell.getWidth();
              if (Y === 0) continue;
              let Q = !1, re = G, K = this._workCell;
              if (S.length > 0 && G === S[0][0]) {
                Q = !0;
                const J = S.shift();
                K = new s.JoinedCellData(this._workCell, v.translateToString(!0, J[0], J[1]), J[1] - J[0]), re = J[1] - 1, Y = K.getWidth();
              }
              const ne = this._isCellInSelection(G, d), ce = h && G === x, de = W && G >= H && G <= P;
              let _e = !1;
              this._decorationService.forEachDecorationAtCell(G, d, void 0, ((J) => {
                _e = !0;
              }));
              let le = K.getChars() || u.WHITESPACE_CELL_CHAR;
              if (le === " " && (K.isUnderline() || K.isOverline()) && (le = " "), B = Y * k - R.get(le, K.isBold(), K.isItalic()), w) {
                if (I && (ne && T || !ne && !T && K.bg === N) && (ne && T && y.selectionForeground || K.fg === $) && K.extended.ext === X && de === C && B === D && !ce && !Q && !_e) {
                  F += le, I++;
                  continue;
                }
                I && (w.textContent = F), w = this._document.createElement("span"), I = 0, F = "";
              } else w = this._document.createElement("span");
              if (N = K.bg, $ = K.fg, X = K.extended.ext, C = de, D = B, T = ne, Q && x >= G && x <= re && (x = G), !this._coreService.isCursorHidden && ce) {
                if (z.push("xterm-cursor"), this._coreBrowserService.isFocused) b && z.push("xterm-cursor-blink"), z.push(m === "bar" ? "xterm-cursor-bar" : m === "underline" ? "xterm-cursor-underline" : "xterm-cursor-block");
                else if (E) switch (E) {
                  case "outline":
                    z.push("xterm-cursor-outline");
                    break;
                  case "block":
                    z.push("xterm-cursor-block");
                    break;
                  case "bar":
                    z.push("xterm-cursor-bar");
                    break;
                  case "underline":
                    z.push("xterm-cursor-underline");
                }
              }
              if (K.isBold() && z.push("xterm-bold"), K.isItalic() && z.push("xterm-italic"), K.isDim() && z.push("xterm-dim"), F = K.isInvisible() ? u.WHITESPACE_CELL_CHAR : K.getChars() || u.WHITESPACE_CELL_CHAR, K.isUnderline() && (z.push(`xterm-underline-${K.extended.underlineStyle}`), F === " " && (F = " "), !K.isUnderlineColorDefault())) if (K.isUnderlineColorRGB()) w.style.textDecorationColor = `rgb(${i.AttributeData.toColorRGB(K.getUnderlineColor()).join(",")})`;
              else {
                let J = K.getUnderlineColor();
                this._optionsService.rawOptions.drawBoldTextInBrightColors && K.isBold() && J < 8 && (J += 8), w.style.textDecorationColor = y.ansi[J].css;
              }
              K.isOverline() && (z.push("xterm-overline"), F === " " && (F = " ")), K.isStrikethrough() && z.push("xterm-strikethrough"), de && (w.style.textDecoration = "underline");
              let ee = K.getFgColor(), oe = K.getFgColorMode(), te = K.getBgColor(), ae = K.getBgColorMode();
              const ue = !!K.isInverse();
              if (ue) {
                const J = ee;
                ee = te, te = J;
                const me = oe;
                oe = ae, ae = me;
              }
              let ie, fe, se, he = !1;
              switch (this._decorationService.forEachDecorationAtCell(G, d, void 0, ((J) => {
                J.options.layer !== "top" && he || (J.backgroundColorRGB && (ae = 50331648, te = J.backgroundColorRGB.rgba >> 8 & 16777215, ie = J.backgroundColorRGB), J.foregroundColorRGB && (oe = 50331648, ee = J.foregroundColorRGB.rgba >> 8 & 16777215, fe = J.foregroundColorRGB), he = J.options.layer === "top");
              })), !he && ne && (ie = this._coreBrowserService.isFocused ? y.selectionBackgroundOpaque : y.selectionInactiveBackgroundOpaque, te = ie.rgba >> 8 & 16777215, ae = 50331648, he = !0, y.selectionForeground && (oe = 50331648, ee = y.selectionForeground.rgba >> 8 & 16777215, fe = y.selectionForeground)), he && z.push("xterm-decoration-top"), ae) {
                case 16777216:
                case 33554432:
                  se = y.ansi[te], z.push(`xterm-bg-${te}`);
                  break;
                case 50331648:
                  se = _.rgba.toColor(te >> 16, te >> 8 & 255, 255 & te), this._addStyle(w, `background-color:#${l((te >>> 0).toString(16), "0", 6)}`);
                  break;
                default:
                  ue ? (se = y.foreground, z.push(`xterm-bg-${n.INVERTED_DEFAULT_COLOR}`)) : se = y.background;
              }
              switch (ie || K.isDim() && (ie = _.color.multiplyOpacity(se, 0.5)), oe) {
                case 16777216:
                case 33554432:
                  K.isBold() && ee < 8 && this._optionsService.rawOptions.drawBoldTextInBrightColors && (ee += 8), this._applyMinimumContrast(w, se, y.ansi[ee], K, ie, void 0) || z.push(`xterm-fg-${ee}`);
                  break;
                case 50331648:
                  const J = _.rgba.toColor(ee >> 16 & 255, ee >> 8 & 255, 255 & ee);
                  this._applyMinimumContrast(w, se, J, K, ie, fe) || this._addStyle(w, `color:#${l(ee.toString(16), "0", 6)}`);
                  break;
                default:
                  this._applyMinimumContrast(w, se, y.foreground, K, ie, void 0) || ue && z.push(`xterm-fg-${n.INVERTED_DEFAULT_COLOR}`);
              }
              z.length && (w.className = z.join(" "), z.length = 0), ce || Q || _e ? w.textContent = F : I++, B !== this.defaultSpacing && (w.style.letterSpacing = `${B}px`), M.push(w), G = re;
            }
            return w && I && (w.textContent = F), M;
          }
          _applyMinimumContrast(v, d, h, m, E, x) {
            if (this._optionsService.rawOptions.minimumContrastRatio === 1 || (0, t.excludeFromContrastRatioDemands)(m.getCode())) return !1;
            const b = this._getContrastCache(m);
            let k;
            if (E || x || (k = b.getColor(d.rgba, h.rgba)), k === void 0) {
              const R = this._optionsService.rawOptions.minimumContrastRatio / (m.isDim() ? 2 : 1);
              k = _.color.ensureContrastRatio(E || d, x || h, R), b.setColor((E || d).rgba, (x || h).rgba, k ?? null);
            }
            return !!k && (this._addStyle(v, `color:${k.css}`), !0);
          }
          _getContrastCache(v) {
            return v.isDim() ? this._themeService.colors.halfContrastCache : this._themeService.colors.contrastCache;
          }
          _addStyle(v, d) {
            v.setAttribute("style", `${v.getAttribute("style") || ""}${d};`);
          }
          _isCellInSelection(v, d) {
            const h = this._selectionStart, m = this._selectionEnd;
            return !(!h || !m) && (this._columnSelectMode ? h[0] <= m[0] ? v >= h[0] && d >= h[1] && v < m[0] && d <= m[1] : v < h[0] && d >= h[1] && v >= m[0] && d <= m[1] : d > h[1] && d < m[1] || h[1] === m[1] && d === h[1] && v >= h[0] && v < m[0] || h[1] < m[1] && d === m[1] && v < m[0] || h[1] < m[1] && d === h[1] && v >= h[0]);
          }
        };
        function l(v, d, h) {
          for (; v.length < h; ) v = d + v;
          return v;
        }
        r.DomRendererRowFactory = o = c([
          f(1, e.ICharacterJoinerService),
          f(2, g.IOptionsService),
          f(3, e.ICoreBrowserService),
          f(4, g.ICoreService),
          f(5, g.IDecorationService),
          f(6, e.IThemeService)
        ], o);
      },
      2550: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.WidthCache = void 0, r.WidthCache = class {
          constructor(a) {
            this._flat = new Float32Array(256), this._font = "", this._fontSize = 0, this._weight = "normal", this._weightBold = "bold", this._measureElements = [], this._container = a.createElement("div"), this._container.style.position = "absolute", this._container.style.top = "-50000px", this._container.style.width = "50000px", this._container.style.whiteSpace = "pre", this._container.style.fontKerning = "none";
            const c = a.createElement("span"), f = a.createElement("span");
            f.style.fontWeight = "bold";
            const n = a.createElement("span");
            n.style.fontStyle = "italic";
            const u = a.createElement("span");
            u.style.fontWeight = "bold", u.style.fontStyle = "italic", this._measureElements = [
              c,
              f,
              n,
              u
            ], this._container.appendChild(c), this._container.appendChild(f), this._container.appendChild(n), this._container.appendChild(u), a.body.appendChild(this._container), this.clear();
          }
          dispose() {
            this._container.remove(), this._measureElements.length = 0, this._holey = void 0;
          }
          clear() {
            this._flat.fill(-9999), this._holey = /* @__PURE__ */ new Map();
          }
          setFont(a, c, f, n) {
            a === this._font && c === this._fontSize && f === this._weight && n === this._weightBold || (this._font = a, this._fontSize = c, this._weight = f, this._weightBold = n, this._container.style.fontFamily = this._font, this._container.style.fontSize = `${this._fontSize}px`, this._measureElements[0].style.fontWeight = `${f}`, this._measureElements[1].style.fontWeight = `${n}`, this._measureElements[2].style.fontWeight = `${f}`, this._measureElements[3].style.fontWeight = `${n}`, this.clear());
          }
          get(a, c, f) {
            let n = 0;
            if (!c && !f && a.length === 1 && (n = a.charCodeAt(0)) < 256) return this._flat[n] !== -9999 ? this._flat[n] : this._flat[n] = this._measure(a, 0);
            let u = a;
            c && (u += "B"), f && (u += "I");
            let p = this._holey.get(u);
            if (p === void 0) {
              let g = 0;
              c && (g |= 1), f && (g |= 2), p = this._measure(a, g), this._holey.set(u, p);
            }
            return p;
          }
          _measure(a, c) {
            const f = this._measureElements[c];
            return f.textContent = a.repeat(32), f.offsetWidth / 32;
          }
        };
      },
      2223: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.TEXT_BASELINE = r.DIM_OPACITY = r.INVERTED_DEFAULT_COLOR = void 0;
        const c = a(6114);
        r.INVERTED_DEFAULT_COLOR = 257, r.DIM_OPACITY = 0.5, r.TEXT_BASELINE = c.isFirefox || c.isLegacyEdge ? "bottom" : "ideographic";
      },
      6171: (O, r) => {
        function a(c) {
          return 57508 <= c && c <= 57558;
        }
        Object.defineProperty(r, "__esModule", { value: !0 }), r.createRenderDimensions = r.excludeFromContrastRatioDemands = r.isRestrictedPowerlineGlyph = r.isPowerlineGlyph = r.throwIfFalsy = void 0, r.throwIfFalsy = function(c) {
          if (!c) throw new Error("value must not be falsy");
          return c;
        }, r.isPowerlineGlyph = a, r.isRestrictedPowerlineGlyph = function(c) {
          return 57520 <= c && c <= 57527;
        }, r.excludeFromContrastRatioDemands = function(c) {
          return a(c) || (function(f) {
            return 9472 <= f && f <= 9631;
          })(c);
        }, r.createRenderDimensions = function() {
          return {
            css: {
              canvas: {
                width: 0,
                height: 0
              },
              cell: {
                width: 0,
                height: 0
              }
            },
            device: {
              canvas: {
                width: 0,
                height: 0
              },
              cell: {
                width: 0,
                height: 0
              },
              char: {
                width: 0,
                height: 0,
                left: 0,
                top: 0
              }
            }
          };
        };
      },
      456: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.SelectionModel = void 0, r.SelectionModel = class {
          constructor(a) {
            this._bufferService = a, this.isSelectAllActive = !1, this.selectionStartLength = 0;
          }
          clearSelection() {
            this.selectionStart = void 0, this.selectionEnd = void 0, this.isSelectAllActive = !1, this.selectionStartLength = 0;
          }
          get finalSelectionStart() {
            return this.isSelectAllActive ? [0, 0] : this.selectionEnd && this.selectionStart && this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
          }
          get finalSelectionEnd() {
            if (this.isSelectAllActive) return [this._bufferService.cols, this._bufferService.buffer.ybase + this._bufferService.rows - 1];
            if (this.selectionStart) {
              if (!this.selectionEnd || this.areSelectionValuesReversed()) {
                const a = this.selectionStart[0] + this.selectionStartLength;
                return a > this._bufferService.cols ? a % this._bufferService.cols == 0 ? [this._bufferService.cols, this.selectionStart[1] + Math.floor(a / this._bufferService.cols) - 1] : [a % this._bufferService.cols, this.selectionStart[1] + Math.floor(a / this._bufferService.cols)] : [a, this.selectionStart[1]];
              }
              if (this.selectionStartLength && this.selectionEnd[1] === this.selectionStart[1]) {
                const a = this.selectionStart[0] + this.selectionStartLength;
                return a > this._bufferService.cols ? [a % this._bufferService.cols, this.selectionStart[1] + Math.floor(a / this._bufferService.cols)] : [Math.max(a, this.selectionEnd[0]), this.selectionEnd[1]];
              }
              return this.selectionEnd;
            }
          }
          areSelectionValuesReversed() {
            const a = this.selectionStart, c = this.selectionEnd;
            return !(!a || !c) && (a[1] > c[1] || a[1] === c[1] && a[0] > c[0]);
          }
          handleTrim(a) {
            return this.selectionStart && (this.selectionStart[1] -= a), this.selectionEnd && (this.selectionEnd[1] -= a), this.selectionEnd && this.selectionEnd[1] < 0 ? (this.clearSelection(), !0) : (this.selectionStart && this.selectionStart[1] < 0 && (this.selectionStart[1] = 0), !1);
          }
        };
      },
      428: function(O, r, a) {
        var c = this && this.__decorate || function(e, s, t, i) {
          var o, l = arguments.length, v = l < 3 ? s : i === null ? i = Object.getOwnPropertyDescriptor(s, t) : i;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") v = Reflect.decorate(e, s, t, i);
          else for (var d = e.length - 1; d >= 0; d--) (o = e[d]) && (v = (l < 3 ? o(v) : l > 3 ? o(s, t, v) : o(s, t)) || v);
          return l > 3 && v && Object.defineProperty(s, t, v), v;
        }, f = this && this.__param || function(e, s) {
          return function(t, i) {
            s(t, i, e);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CharSizeService = void 0;
        const n = a(2585), u = a(8460), p = a(844);
        let g = r.CharSizeService = class extends p.Disposable {
          get hasValidSize() {
            return this.width > 0 && this.height > 0;
          }
          constructor(e, s, t) {
            super(), this._optionsService = t, this.width = 0, this.height = 0, this._onCharSizeChange = this.register(new u.EventEmitter()), this.onCharSizeChange = this._onCharSizeChange.event, this._measureStrategy = new _(e, s, this._optionsService), this.register(this._optionsService.onMultipleOptionChange(["fontFamily", "fontSize"], (() => this.measure())));
          }
          measure() {
            const e = this._measureStrategy.measure();
            e.width === this.width && e.height === this.height || (this.width = e.width, this.height = e.height, this._onCharSizeChange.fire());
          }
        };
        r.CharSizeService = g = c([f(2, n.IOptionsService)], g);
        class _ {
          constructor(s, t, i) {
            this._document = s, this._parentElement = t, this._optionsService = i, this._result = {
              width: 0,
              height: 0
            }, this._measureElement = this._document.createElement("span"), this._measureElement.classList.add("xterm-char-measure-element"), this._measureElement.textContent = "W".repeat(32), this._measureElement.setAttribute("aria-hidden", "true"), this._measureElement.style.whiteSpace = "pre", this._measureElement.style.fontKerning = "none", this._parentElement.appendChild(this._measureElement);
          }
          measure() {
            this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`;
            const s = {
              height: Number(this._measureElement.offsetHeight),
              width: Number(this._measureElement.offsetWidth)
            };
            return s.width !== 0 && s.height !== 0 && (this._result.width = s.width / 32, this._result.height = Math.ceil(s.height)), this._result;
          }
        }
      },
      4269: function(O, r, a) {
        var c = this && this.__decorate || function(s, t, i, o) {
          var l, v = arguments.length, d = v < 3 ? t : o === null ? o = Object.getOwnPropertyDescriptor(t, i) : o;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") d = Reflect.decorate(s, t, i, o);
          else for (var h = s.length - 1; h >= 0; h--) (l = s[h]) && (d = (v < 3 ? l(d) : v > 3 ? l(t, i, d) : l(t, i)) || d);
          return v > 3 && d && Object.defineProperty(t, i, d), d;
        }, f = this && this.__param || function(s, t) {
          return function(i, o) {
            t(i, o, s);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CharacterJoinerService = r.JoinedCellData = void 0;
        const n = a(3734), u = a(643), p = a(511), g = a(2585);
        class _ extends n.AttributeData {
          constructor(t, i, o) {
            super(), this.content = 0, this.combinedData = "", this.fg = t.fg, this.bg = t.bg, this.combinedData = i, this._width = o;
          }
          isCombined() {
            return 2097152;
          }
          getWidth() {
            return this._width;
          }
          getChars() {
            return this.combinedData;
          }
          getCode() {
            return 2097151;
          }
          setFromCharData(t) {
            throw new Error("not implemented");
          }
          getAsCharData() {
            return [
              this.fg,
              this.getChars(),
              this.getWidth(),
              this.getCode()
            ];
          }
        }
        r.JoinedCellData = _;
        let e = r.CharacterJoinerService = class ge {
          constructor(t) {
            this._bufferService = t, this._characterJoiners = [], this._nextCharacterJoinerId = 0, this._workCell = new p.CellData();
          }
          register(t) {
            const i = {
              id: this._nextCharacterJoinerId++,
              handler: t
            };
            return this._characterJoiners.push(i), i.id;
          }
          deregister(t) {
            for (let i = 0; i < this._characterJoiners.length; i++) if (this._characterJoiners[i].id === t) return this._characterJoiners.splice(i, 1), !0;
            return !1;
          }
          getJoinedCharacters(t) {
            if (this._characterJoiners.length === 0) return [];
            const i = this._bufferService.buffer.lines.get(t);
            if (!i || i.length === 0) return [];
            const o = [], l = i.translateToString(!0);
            let v = 0, d = 0, h = 0, m = i.getFg(0), E = i.getBg(0);
            for (let x = 0; x < i.getTrimmedLength(); x++) if (i.loadCell(x, this._workCell), this._workCell.getWidth() !== 0) {
              if (this._workCell.fg !== m || this._workCell.bg !== E) {
                if (x - v > 1) {
                  const b = this._getJoinedRanges(l, h, d, i, v);
                  for (let k = 0; k < b.length; k++) o.push(b[k]);
                }
                v = x, h = d, m = this._workCell.fg, E = this._workCell.bg;
              }
              d += this._workCell.getChars().length || u.WHITESPACE_CELL_CHAR.length;
            }
            if (this._bufferService.cols - v > 1) {
              const x = this._getJoinedRanges(l, h, d, i, v);
              for (let b = 0; b < x.length; b++) o.push(x[b]);
            }
            return o;
          }
          _getJoinedRanges(t, i, o, l, v) {
            const d = t.substring(i, o);
            let h = [];
            try {
              h = this._characterJoiners[0].handler(d);
            } catch (m) {
              console.error(m);
            }
            for (let m = 1; m < this._characterJoiners.length; m++) try {
              const E = this._characterJoiners[m].handler(d);
              for (let x = 0; x < E.length; x++) ge._mergeRanges(h, E[x]);
            } catch (E) {
              console.error(E);
            }
            return this._stringRangesToCellRanges(h, l, v), h;
          }
          _stringRangesToCellRanges(t, i, o) {
            let l = 0, v = !1, d = 0, h = t[l];
            if (h) {
              for (let m = o; m < this._bufferService.cols; m++) {
                const E = i.getWidth(m), x = i.getString(m).length || u.WHITESPACE_CELL_CHAR.length;
                if (E !== 0) {
                  if (!v && h[0] <= d && (h[0] = m, v = !0), h[1] <= d) {
                    if (h[1] = m, h = t[++l], !h) break;
                    h[0] <= d ? (h[0] = m, v = !0) : v = !1;
                  }
                  d += x;
                }
              }
              h && (h[1] = this._bufferService.cols);
            }
          }
          static _mergeRanges(t, i) {
            let o = !1;
            for (let l = 0; l < t.length; l++) {
              const v = t[l];
              if (o) {
                if (i[1] <= v[0]) return t[l - 1][1] = i[1], t;
                if (i[1] <= v[1]) return t[l - 1][1] = Math.max(i[1], v[1]), t.splice(l, 1), t;
                t.splice(l, 1), l--;
              } else {
                if (i[1] <= v[0]) return t.splice(l, 0, i), t;
                if (i[1] <= v[1]) return v[0] = Math.min(i[0], v[0]), t;
                i[0] < v[1] && (v[0] = Math.min(i[0], v[0]), o = !0);
              }
            }
            return o ? t[t.length - 1][1] = i[1] : t.push(i), t;
          }
        };
        r.CharacterJoinerService = e = c([f(0, g.IBufferService)], e);
      },
      5114: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CoreBrowserService = void 0, r.CoreBrowserService = class {
          constructor(a, c) {
            this._textarea = a, this.window = c, this._isFocused = !1, this._cachedIsFocused = void 0, this._textarea.addEventListener("focus", (() => this._isFocused = !0)), this._textarea.addEventListener("blur", (() => this._isFocused = !1));
          }
          get dpr() {
            return this.window.devicePixelRatio;
          }
          get isFocused() {
            return this._cachedIsFocused === void 0 && (this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus(), queueMicrotask((() => this._cachedIsFocused = void 0))), this._cachedIsFocused;
          }
        };
      },
      8934: function(O, r, a) {
        var c = this && this.__decorate || function(g, _, e, s) {
          var t, i = arguments.length, o = i < 3 ? _ : s === null ? s = Object.getOwnPropertyDescriptor(_, e) : s;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(g, _, e, s);
          else for (var l = g.length - 1; l >= 0; l--) (t = g[l]) && (o = (i < 3 ? t(o) : i > 3 ? t(_, e, o) : t(_, e)) || o);
          return i > 3 && o && Object.defineProperty(_, e, o), o;
        }, f = this && this.__param || function(g, _) {
          return function(e, s) {
            _(e, s, g);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.MouseService = void 0;
        const n = a(4725), u = a(9806);
        let p = r.MouseService = class {
          constructor(g, _) {
            this._renderService = g, this._charSizeService = _;
          }
          getCoords(g, _, e, s, t) {
            return (0, u.getCoords)(window, g, _, e, s, this._charSizeService.hasValidSize, this._renderService.dimensions.css.cell.width, this._renderService.dimensions.css.cell.height, t);
          }
          getMouseReportCoords(g, _) {
            const e = (0, u.getCoordsRelativeToElement)(window, g, _);
            if (this._charSizeService.hasValidSize) return e[0] = Math.min(Math.max(e[0], 0), this._renderService.dimensions.css.canvas.width - 1), e[1] = Math.min(Math.max(e[1], 0), this._renderService.dimensions.css.canvas.height - 1), {
              col: Math.floor(e[0] / this._renderService.dimensions.css.cell.width),
              row: Math.floor(e[1] / this._renderService.dimensions.css.cell.height),
              x: Math.floor(e[0]),
              y: Math.floor(e[1])
            };
          }
        };
        r.MouseService = p = c([f(0, n.IRenderService), f(1, n.ICharSizeService)], p);
      },
      3230: function(O, r, a) {
        var c = this && this.__decorate || function(o, l, v, d) {
          var h, m = arguments.length, E = m < 3 ? l : d === null ? d = Object.getOwnPropertyDescriptor(l, v) : d;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") E = Reflect.decorate(o, l, v, d);
          else for (var x = o.length - 1; x >= 0; x--) (h = o[x]) && (E = (m < 3 ? h(E) : m > 3 ? h(l, v, E) : h(l, v)) || E);
          return m > 3 && E && Object.defineProperty(l, v, E), E;
        }, f = this && this.__param || function(o, l) {
          return function(v, d) {
            l(v, d, o);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.RenderService = void 0;
        const n = a(3656), u = a(6193), p = a(5596), g = a(4725), _ = a(8460), e = a(844), s = a(7226), t = a(2585);
        let i = r.RenderService = class extends e.Disposable {
          get dimensions() {
            return this._renderer.value.dimensions;
          }
          constructor(o, l, v, d, h, m, E, x) {
            if (super(), this._rowCount = o, this._charSizeService = d, this._renderer = this.register(new e.MutableDisposable()), this._pausedResizeTask = new s.DebouncedIdleTask(), this._isPaused = !1, this._needsFullRefresh = !1, this._isNextRenderRedrawOnly = !0, this._needsSelectionRefresh = !1, this._canvasWidth = 0, this._canvasHeight = 0, this._selectionState = {
              start: void 0,
              end: void 0,
              columnSelectMode: !1
            }, this._onDimensionsChange = this.register(new _.EventEmitter()), this.onDimensionsChange = this._onDimensionsChange.event, this._onRenderedViewportChange = this.register(new _.EventEmitter()), this.onRenderedViewportChange = this._onRenderedViewportChange.event, this._onRender = this.register(new _.EventEmitter()), this.onRender = this._onRender.event, this._onRefreshRequest = this.register(new _.EventEmitter()), this.onRefreshRequest = this._onRefreshRequest.event, this._renderDebouncer = new u.RenderDebouncer(E.window, ((b, k) => this._renderRows(b, k))), this.register(this._renderDebouncer), this._screenDprMonitor = new p.ScreenDprMonitor(E.window), this._screenDprMonitor.setListener((() => this.handleDevicePixelRatioChange())), this.register(this._screenDprMonitor), this.register(m.onResize((() => this._fullRefresh()))), this.register(m.buffers.onBufferActivate((() => {
              var b;
              return (b = this._renderer.value) === null || b === void 0 ? void 0 : b.clear();
            }))), this.register(v.onOptionChange((() => this._handleOptionsChanged()))), this.register(this._charSizeService.onCharSizeChange((() => this.handleCharSizeChanged()))), this.register(h.onDecorationRegistered((() => this._fullRefresh()))), this.register(h.onDecorationRemoved((() => this._fullRefresh()))), this.register(v.onMultipleOptionChange([
              "customGlyphs",
              "drawBoldTextInBrightColors",
              "letterSpacing",
              "lineHeight",
              "fontFamily",
              "fontSize",
              "fontWeight",
              "fontWeightBold",
              "minimumContrastRatio"
            ], (() => {
              this.clear(), this.handleResize(m.cols, m.rows), this._fullRefresh();
            }))), this.register(v.onMultipleOptionChange(["cursorBlink", "cursorStyle"], (() => this.refreshRows(m.buffer.y, m.buffer.y, !0)))), this.register((0, n.addDisposableDomListener)(E.window, "resize", (() => this.handleDevicePixelRatioChange()))), this.register(x.onChangeColors((() => this._fullRefresh()))), "IntersectionObserver" in E.window) {
              const b = new E.window.IntersectionObserver(((k) => this._handleIntersectionChange(k[k.length - 1])), { threshold: 0 });
              b.observe(l), this.register({ dispose: () => b.disconnect() });
            }
          }
          _handleIntersectionChange(o) {
            this._isPaused = o.isIntersecting === void 0 ? o.intersectionRatio === 0 : !o.isIntersecting, this._isPaused || this._charSizeService.hasValidSize || this._charSizeService.measure(), !this._isPaused && this._needsFullRefresh && (this._pausedResizeTask.flush(), this.refreshRows(0, this._rowCount - 1), this._needsFullRefresh = !1);
          }
          refreshRows(o, l, v = !1) {
            this._isPaused ? this._needsFullRefresh = !0 : (v || (this._isNextRenderRedrawOnly = !1), this._renderDebouncer.refresh(o, l, this._rowCount));
          }
          _renderRows(o, l) {
            this._renderer.value && (o = Math.min(o, this._rowCount - 1), l = Math.min(l, this._rowCount - 1), this._renderer.value.renderRows(o, l), this._needsSelectionRefresh && (this._renderer.value.handleSelectionChanged(this._selectionState.start, this._selectionState.end, this._selectionState.columnSelectMode), this._needsSelectionRefresh = !1), this._isNextRenderRedrawOnly || this._onRenderedViewportChange.fire({
              start: o,
              end: l
            }), this._onRender.fire({
              start: o,
              end: l
            }), this._isNextRenderRedrawOnly = !0);
          }
          resize(o, l) {
            this._rowCount = l, this._fireOnCanvasResize();
          }
          _handleOptionsChanged() {
            this._renderer.value && (this.refreshRows(0, this._rowCount - 1), this._fireOnCanvasResize());
          }
          _fireOnCanvasResize() {
            this._renderer.value && (this._renderer.value.dimensions.css.canvas.width === this._canvasWidth && this._renderer.value.dimensions.css.canvas.height === this._canvasHeight || this._onDimensionsChange.fire(this._renderer.value.dimensions));
          }
          hasRenderer() {
            return !!this._renderer.value;
          }
          setRenderer(o) {
            this._renderer.value = o, this._renderer.value.onRequestRedraw(((l) => this.refreshRows(l.start, l.end, !0))), this._needsSelectionRefresh = !0, this._fullRefresh();
          }
          addRefreshCallback(o) {
            return this._renderDebouncer.addRefreshCallback(o);
          }
          _fullRefresh() {
            this._isPaused ? this._needsFullRefresh = !0 : this.refreshRows(0, this._rowCount - 1);
          }
          clearTextureAtlas() {
            var o, l;
            this._renderer.value && ((l = (o = this._renderer.value).clearTextureAtlas) === null || l === void 0 || l.call(o), this._fullRefresh());
          }
          handleDevicePixelRatioChange() {
            this._charSizeService.measure(), this._renderer.value && (this._renderer.value.handleDevicePixelRatioChange(), this.refreshRows(0, this._rowCount - 1));
          }
          handleResize(o, l) {
            this._renderer.value && (this._isPaused ? this._pausedResizeTask.set((() => this._renderer.value.handleResize(o, l))) : this._renderer.value.handleResize(o, l), this._fullRefresh());
          }
          handleCharSizeChanged() {
            var o;
            (o = this._renderer.value) === null || o === void 0 || o.handleCharSizeChanged();
          }
          handleBlur() {
            var o;
            (o = this._renderer.value) === null || o === void 0 || o.handleBlur();
          }
          handleFocus() {
            var o;
            (o = this._renderer.value) === null || o === void 0 || o.handleFocus();
          }
          handleSelectionChanged(o, l, v) {
            var d;
            this._selectionState.start = o, this._selectionState.end = l, this._selectionState.columnSelectMode = v, (d = this._renderer.value) === null || d === void 0 || d.handleSelectionChanged(o, l, v);
          }
          handleCursorMove() {
            var o;
            (o = this._renderer.value) === null || o === void 0 || o.handleCursorMove();
          }
          clear() {
            var o;
            (o = this._renderer.value) === null || o === void 0 || o.clear();
          }
        };
        r.RenderService = i = c([
          f(2, t.IOptionsService),
          f(3, g.ICharSizeService),
          f(4, t.IDecorationService),
          f(5, t.IBufferService),
          f(6, g.ICoreBrowserService),
          f(7, g.IThemeService)
        ], i);
      },
      9312: function(O, r, a) {
        var c = this && this.__decorate || function(d, h, m, E) {
          var x, b = arguments.length, k = b < 3 ? h : E === null ? E = Object.getOwnPropertyDescriptor(h, m) : E;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") k = Reflect.decorate(d, h, m, E);
          else for (var R = d.length - 1; R >= 0; R--) (x = d[R]) && (k = (b < 3 ? x(k) : b > 3 ? x(h, m, k) : x(h, m)) || k);
          return b > 3 && k && Object.defineProperty(h, m, k), k;
        }, f = this && this.__param || function(d, h) {
          return function(m, E) {
            h(m, E, d);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.SelectionService = void 0;
        const n = a(9806), u = a(9504), p = a(456), g = a(4725), _ = a(8460), e = a(844), s = a(6114), t = a(4841), i = a(511), o = a(2585), l = new RegExp(" ", "g");
        let v = r.SelectionService = class extends e.Disposable {
          constructor(d, h, m, E, x, b, k, R, H) {
            super(), this._element = d, this._screenElement = h, this._linkifier = m, this._bufferService = E, this._coreService = x, this._mouseService = b, this._optionsService = k, this._renderService = R, this._coreBrowserService = H, this._dragScrollAmount = 0, this._enabled = !0, this._workCell = new i.CellData(), this._mouseDownTimeStamp = 0, this._oldHasSelection = !1, this._oldSelectionStart = void 0, this._oldSelectionEnd = void 0, this._onLinuxMouseSelection = this.register(new _.EventEmitter()), this.onLinuxMouseSelection = this._onLinuxMouseSelection.event, this._onRedrawRequest = this.register(new _.EventEmitter()), this.onRequestRedraw = this._onRedrawRequest.event, this._onSelectionChange = this.register(new _.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onRequestScrollLines = this.register(new _.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this._mouseMoveListener = (P) => this._handleMouseMove(P), this._mouseUpListener = (P) => this._handleMouseUp(P), this._coreService.onUserInput((() => {
              this.hasSelection && this.clearSelection();
            })), this._trimListener = this._bufferService.buffer.lines.onTrim(((P) => this._handleTrim(P))), this.register(this._bufferService.buffers.onBufferActivate(((P) => this._handleBufferActivate(P)))), this.enable(), this._model = new p.SelectionModel(this._bufferService), this._activeSelectionMode = 0, this.register((0, e.toDisposable)((() => {
              this._removeMouseDownListeners();
            })));
          }
          reset() {
            this.clearSelection();
          }
          disable() {
            this.clearSelection(), this._enabled = !1;
          }
          enable() {
            this._enabled = !0;
          }
          get selectionStart() {
            return this._model.finalSelectionStart;
          }
          get selectionEnd() {
            return this._model.finalSelectionEnd;
          }
          get hasSelection() {
            const d = this._model.finalSelectionStart, h = this._model.finalSelectionEnd;
            return !(!d || !h || d[0] === h[0] && d[1] === h[1]);
          }
          get selectionText() {
            const d = this._model.finalSelectionStart, h = this._model.finalSelectionEnd;
            if (!d || !h) return "";
            const m = this._bufferService.buffer, E = [];
            if (this._activeSelectionMode === 3) {
              if (d[0] === h[0]) return "";
              const x = d[0] < h[0] ? d[0] : h[0], b = d[0] < h[0] ? h[0] : d[0];
              for (let k = d[1]; k <= h[1]; k++) {
                const R = m.translateBufferLineToString(k, !0, x, b);
                E.push(R);
              }
            } else {
              const x = d[1] === h[1] ? h[0] : void 0;
              E.push(m.translateBufferLineToString(d[1], !0, d[0], x));
              for (let b = d[1] + 1; b <= h[1] - 1; b++) {
                const k = m.lines.get(b), R = m.translateBufferLineToString(b, !0);
                k?.isWrapped ? E[E.length - 1] += R : E.push(R);
              }
              if (d[1] !== h[1]) {
                const b = m.lines.get(h[1]), k = m.translateBufferLineToString(h[1], !0, 0, h[0]);
                b && b.isWrapped ? E[E.length - 1] += k : E.push(k);
              }
            }
            return E.map(((x) => x.replace(l, " "))).join(s.isWindows ? `\r
` : `
`);
          }
          clearSelection() {
            this._model.clearSelection(), this._removeMouseDownListeners(), this.refresh(), this._onSelectionChange.fire();
          }
          refresh(d) {
            this._refreshAnimationFrame || (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame((() => this._refresh()))), s.isLinux && d && this.selectionText.length && this._onLinuxMouseSelection.fire(this.selectionText);
          }
          _refresh() {
            this._refreshAnimationFrame = void 0, this._onRedrawRequest.fire({
              start: this._model.finalSelectionStart,
              end: this._model.finalSelectionEnd,
              columnSelectMode: this._activeSelectionMode === 3
            });
          }
          _isClickInSelection(d) {
            const h = this._getMouseBufferCoords(d), m = this._model.finalSelectionStart, E = this._model.finalSelectionEnd;
            return !!(m && E && h) && this._areCoordsInSelection(h, m, E);
          }
          isCellInSelection(d, h) {
            const m = this._model.finalSelectionStart, E = this._model.finalSelectionEnd;
            return !(!m || !E) && this._areCoordsInSelection([d, h], m, E);
          }
          _areCoordsInSelection(d, h, m) {
            return d[1] > h[1] && d[1] < m[1] || h[1] === m[1] && d[1] === h[1] && d[0] >= h[0] && d[0] < m[0] || h[1] < m[1] && d[1] === m[1] && d[0] < m[0] || h[1] < m[1] && d[1] === h[1] && d[0] >= h[0];
          }
          _selectWordAtCursor(d, h) {
            var m, E;
            const x = (E = (m = this._linkifier.currentLink) === null || m === void 0 ? void 0 : m.link) === null || E === void 0 ? void 0 : E.range;
            if (x) return this._model.selectionStart = [x.start.x - 1, x.start.y - 1], this._model.selectionStartLength = (0, t.getRangeLength)(x, this._bufferService.cols), this._model.selectionEnd = void 0, !0;
            const b = this._getMouseBufferCoords(d);
            return !!b && (this._selectWordAt(b, h), this._model.selectionEnd = void 0, !0);
          }
          selectAll() {
            this._model.isSelectAllActive = !0, this.refresh(), this._onSelectionChange.fire();
          }
          selectLines(d, h) {
            this._model.clearSelection(), d = Math.max(d, 0), h = Math.min(h, this._bufferService.buffer.lines.length - 1), this._model.selectionStart = [0, d], this._model.selectionEnd = [this._bufferService.cols, h], this.refresh(), this._onSelectionChange.fire();
          }
          _handleTrim(d) {
            this._model.handleTrim(d) && this.refresh();
          }
          _getMouseBufferCoords(d) {
            const h = this._mouseService.getCoords(d, this._screenElement, this._bufferService.cols, this._bufferService.rows, !0);
            if (h) return h[0]--, h[1]--, h[1] += this._bufferService.buffer.ydisp, h;
          }
          _getMouseEventScrollAmount(d) {
            let h = (0, n.getCoordsRelativeToElement)(this._coreBrowserService.window, d, this._screenElement)[1];
            const m = this._renderService.dimensions.css.canvas.height;
            return h >= 0 && h <= m ? 0 : (h > m && (h -= m), h = Math.min(Math.max(h, -50), 50), h /= 50, h / Math.abs(h) + Math.round(14 * h));
          }
          shouldForceSelection(d) {
            return s.isMac ? d.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection : d.shiftKey;
          }
          handleMouseDown(d) {
            if (this._mouseDownTimeStamp = d.timeStamp, (d.button !== 2 || !this.hasSelection) && d.button === 0) {
              if (!this._enabled) {
                if (!this.shouldForceSelection(d)) return;
                d.stopPropagation();
              }
              d.preventDefault(), this._dragScrollAmount = 0, this._enabled && d.shiftKey ? this._handleIncrementalClick(d) : d.detail === 1 ? this._handleSingleClick(d) : d.detail === 2 ? this._handleDoubleClick(d) : d.detail === 3 && this._handleTripleClick(d), this._addMouseDownListeners(), this.refresh(!0);
            }
          }
          _addMouseDownListeners() {
            this._screenElement.ownerDocument && (this._screenElement.ownerDocument.addEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.addEventListener("mouseup", this._mouseUpListener)), this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval((() => this._dragScroll()), 50);
          }
          _removeMouseDownListeners() {
            this._screenElement.ownerDocument && (this._screenElement.ownerDocument.removeEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.removeEventListener("mouseup", this._mouseUpListener)), this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer), this._dragScrollIntervalTimer = void 0;
          }
          _handleIncrementalClick(d) {
            this._model.selectionStart && (this._model.selectionEnd = this._getMouseBufferCoords(d));
          }
          _handleSingleClick(d) {
            if (this._model.selectionStartLength = 0, this._model.isSelectAllActive = !1, this._activeSelectionMode = this.shouldColumnSelect(d) ? 3 : 0, this._model.selectionStart = this._getMouseBufferCoords(d), !this._model.selectionStart) return;
            this._model.selectionEnd = void 0;
            const h = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
            h && h.length !== this._model.selectionStart[0] && h.hasWidth(this._model.selectionStart[0]) === 0 && this._model.selectionStart[0]++;
          }
          _handleDoubleClick(d) {
            this._selectWordAtCursor(d, !0) && (this._activeSelectionMode = 1);
          }
          _handleTripleClick(d) {
            const h = this._getMouseBufferCoords(d);
            h && (this._activeSelectionMode = 2, this._selectLineAt(h[1]));
          }
          shouldColumnSelect(d) {
            return d.altKey && !(s.isMac && this._optionsService.rawOptions.macOptionClickForcesSelection);
          }
          _handleMouseMove(d) {
            if (d.stopImmediatePropagation(), !this._model.selectionStart) return;
            const h = this._model.selectionEnd ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;
            if (this._model.selectionEnd = this._getMouseBufferCoords(d), !this._model.selectionEnd) return void this.refresh(!0);
            this._activeSelectionMode === 2 ? this._model.selectionEnd[1] < this._model.selectionStart[1] ? this._model.selectionEnd[0] = 0 : this._model.selectionEnd[0] = this._bufferService.cols : this._activeSelectionMode === 1 && this._selectToWordAt(this._model.selectionEnd), this._dragScrollAmount = this._getMouseEventScrollAmount(d), this._activeSelectionMode !== 3 && (this._dragScrollAmount > 0 ? this._model.selectionEnd[0] = this._bufferService.cols : this._dragScrollAmount < 0 && (this._model.selectionEnd[0] = 0));
            const m = this._bufferService.buffer;
            if (this._model.selectionEnd[1] < m.lines.length) {
              const E = m.lines.get(this._model.selectionEnd[1]);
              E && E.hasWidth(this._model.selectionEnd[0]) === 0 && this._model.selectionEnd[0]++;
            }
            h && h[0] === this._model.selectionEnd[0] && h[1] === this._model.selectionEnd[1] || this.refresh(!0);
          }
          _dragScroll() {
            if (this._model.selectionEnd && this._model.selectionStart && this._dragScrollAmount) {
              this._onRequestScrollLines.fire({
                amount: this._dragScrollAmount,
                suppressScrollEvent: !1
              });
              const d = this._bufferService.buffer;
              this._dragScrollAmount > 0 ? (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = this._bufferService.cols), this._model.selectionEnd[1] = Math.min(d.ydisp + this._bufferService.rows, d.lines.length - 1)) : (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = 0), this._model.selectionEnd[1] = d.ydisp), this.refresh();
            }
          }
          _handleMouseUp(d) {
            const h = d.timeStamp - this._mouseDownTimeStamp;
            if (this._removeMouseDownListeners(), this.selectionText.length <= 1 && h < 500 && d.altKey && this._optionsService.rawOptions.altClickMovesCursor) {
              if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
                const m = this._mouseService.getCoords(d, this._element, this._bufferService.cols, this._bufferService.rows, !1);
                if (m && m[0] !== void 0 && m[1] !== void 0) {
                  const E = (0, u.moveToCellSequence)(m[0] - 1, m[1] - 1, this._bufferService, this._coreService.decPrivateModes.applicationCursorKeys);
                  this._coreService.triggerDataEvent(E, !0);
                }
              }
            } else this._fireEventIfSelectionChanged();
          }
          _fireEventIfSelectionChanged() {
            const d = this._model.finalSelectionStart, h = this._model.finalSelectionEnd, m = !(!d || !h || d[0] === h[0] && d[1] === h[1]);
            m ? d && h && (this._oldSelectionStart && this._oldSelectionEnd && d[0] === this._oldSelectionStart[0] && d[1] === this._oldSelectionStart[1] && h[0] === this._oldSelectionEnd[0] && h[1] === this._oldSelectionEnd[1] || this._fireOnSelectionChange(d, h, m)) : this._oldHasSelection && this._fireOnSelectionChange(d, h, m);
          }
          _fireOnSelectionChange(d, h, m) {
            this._oldSelectionStart = d, this._oldSelectionEnd = h, this._oldHasSelection = m, this._onSelectionChange.fire();
          }
          _handleBufferActivate(d) {
            this.clearSelection(), this._trimListener.dispose(), this._trimListener = d.activeBuffer.lines.onTrim(((h) => this._handleTrim(h)));
          }
          _convertViewportColToCharacterIndex(d, h) {
            let m = h;
            for (let E = 0; h >= E; E++) {
              const x = d.loadCell(E, this._workCell).getChars().length;
              this._workCell.getWidth() === 0 ? m-- : x > 1 && h !== E && (m += x - 1);
            }
            return m;
          }
          setSelection(d, h, m) {
            this._model.clearSelection(), this._removeMouseDownListeners(), this._model.selectionStart = [d, h], this._model.selectionStartLength = m, this.refresh(), this._fireEventIfSelectionChanged();
          }
          rightClickSelect(d) {
            this._isClickInSelection(d) || (this._selectWordAtCursor(d, !1) && this.refresh(!0), this._fireEventIfSelectionChanged());
          }
          _getWordAt(d, h, m = !0, E = !0) {
            if (d[0] >= this._bufferService.cols) return;
            const x = this._bufferService.buffer, b = x.lines.get(d[1]);
            if (!b) return;
            const k = x.translateBufferLineToString(d[1], !1);
            let R = this._convertViewportColToCharacterIndex(b, d[0]), H = R;
            const P = d[0] - R;
            let M = 0, S = 0, y = 0, w = 0;
            if (k.charAt(R) === " ") {
              for (; R > 0 && k.charAt(R - 1) === " "; ) R--;
              for (; H < k.length && k.charAt(H + 1) === " "; ) H++;
            } else {
              let F = d[0], N = d[0];
              b.getWidth(F) === 0 && (M++, F--), b.getWidth(N) === 2 && (S++, N++);
              const $ = b.getString(N).length;
              for ($ > 1 && (w += $ - 1, H += $ - 1); F > 0 && R > 0 && !this._isCharWordSeparator(b.loadCell(F - 1, this._workCell)); ) {
                b.loadCell(F - 1, this._workCell);
                const X = this._workCell.getChars().length;
                this._workCell.getWidth() === 0 ? (M++, F--) : X > 1 && (y += X - 1, R -= X - 1), R--, F--;
              }
              for (; N < b.length && H + 1 < k.length && !this._isCharWordSeparator(b.loadCell(N + 1, this._workCell)); ) {
                b.loadCell(N + 1, this._workCell);
                const X = this._workCell.getChars().length;
                this._workCell.getWidth() === 2 ? (S++, N++) : X > 1 && (w += X - 1, H += X - 1), H++, N++;
              }
            }
            H++;
            let L = R + P - M + y, I = Math.min(this._bufferService.cols, H - R + M + S - y - w);
            if (h || k.slice(R, H).trim() !== "") {
              if (m && L === 0 && b.getCodePoint(0) !== 32) {
                const F = x.lines.get(d[1] - 1);
                if (F && b.isWrapped && F.getCodePoint(this._bufferService.cols - 1) !== 32) {
                  const N = this._getWordAt([this._bufferService.cols - 1, d[1] - 1], !1, !0, !1);
                  if (N) {
                    const $ = this._bufferService.cols - N.start;
                    L -= $, I += $;
                  }
                }
              }
              if (E && L + I === this._bufferService.cols && b.getCodePoint(this._bufferService.cols - 1) !== 32) {
                const F = x.lines.get(d[1] + 1);
                if (F?.isWrapped && F.getCodePoint(0) !== 32) {
                  const N = this._getWordAt([0, d[1] + 1], !1, !1, !0);
                  N && (I += N.length);
                }
              }
              return {
                start: L,
                length: I
              };
            }
          }
          _selectWordAt(d, h) {
            const m = this._getWordAt(d, h);
            if (m) {
              for (; m.start < 0; ) m.start += this._bufferService.cols, d[1]--;
              this._model.selectionStart = [m.start, d[1]], this._model.selectionStartLength = m.length;
            }
          }
          _selectToWordAt(d) {
            const h = this._getWordAt(d, !0);
            if (h) {
              let m = d[1];
              for (; h.start < 0; ) h.start += this._bufferService.cols, m--;
              if (!this._model.areSelectionValuesReversed()) for (; h.start + h.length > this._bufferService.cols; ) h.length -= this._bufferService.cols, m++;
              this._model.selectionEnd = [this._model.areSelectionValuesReversed() ? h.start : h.start + h.length, m];
            }
          }
          _isCharWordSeparator(d) {
            return d.getWidth() !== 0 && this._optionsService.rawOptions.wordSeparator.indexOf(d.getChars()) >= 0;
          }
          _selectLineAt(d) {
            const h = this._bufferService.buffer.getWrappedRangeForLine(d), m = {
              start: {
                x: 0,
                y: h.first
              },
              end: {
                x: this._bufferService.cols - 1,
                y: h.last
              }
            };
            this._model.selectionStart = [0, h.first], this._model.selectionEnd = void 0, this._model.selectionStartLength = (0, t.getRangeLength)(m, this._bufferService.cols);
          }
        };
        r.SelectionService = v = c([
          f(3, o.IBufferService),
          f(4, o.ICoreService),
          f(5, g.IMouseService),
          f(6, o.IOptionsService),
          f(7, g.IRenderService),
          f(8, g.ICoreBrowserService)
        ], v);
      },
      4725: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.IThemeService = r.ICharacterJoinerService = r.ISelectionService = r.IRenderService = r.IMouseService = r.ICoreBrowserService = r.ICharSizeService = void 0;
        const c = a(8343);
        r.ICharSizeService = (0, c.createDecorator)("CharSizeService"), r.ICoreBrowserService = (0, c.createDecorator)("CoreBrowserService"), r.IMouseService = (0, c.createDecorator)("MouseService"), r.IRenderService = (0, c.createDecorator)("RenderService"), r.ISelectionService = (0, c.createDecorator)("SelectionService"), r.ICharacterJoinerService = (0, c.createDecorator)("CharacterJoinerService"), r.IThemeService = (0, c.createDecorator)("ThemeService");
      },
      6731: function(O, r, a) {
        var c = this && this.__decorate || function(d, h, m, E) {
          var x, b = arguments.length, k = b < 3 ? h : E === null ? E = Object.getOwnPropertyDescriptor(h, m) : E;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") k = Reflect.decorate(d, h, m, E);
          else for (var R = d.length - 1; R >= 0; R--) (x = d[R]) && (k = (b < 3 ? x(k) : b > 3 ? x(h, m, k) : x(h, m)) || k);
          return b > 3 && k && Object.defineProperty(h, m, k), k;
        }, f = this && this.__param || function(d, h) {
          return function(m, E) {
            h(m, E, d);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.ThemeService = r.DEFAULT_ANSI_COLORS = void 0;
        const n = a(7239), u = a(8055), p = a(8460), g = a(844), _ = a(2585), e = u.css.toColor("#ffffff"), s = u.css.toColor("#000000"), t = u.css.toColor("#ffffff"), i = u.css.toColor("#000000"), o = {
          css: "rgba(255, 255, 255, 0.3)",
          rgba: 4294967117
        };
        r.DEFAULT_ANSI_COLORS = Object.freeze((() => {
          const d = [
            u.css.toColor("#2e3436"),
            u.css.toColor("#cc0000"),
            u.css.toColor("#4e9a06"),
            u.css.toColor("#c4a000"),
            u.css.toColor("#3465a4"),
            u.css.toColor("#75507b"),
            u.css.toColor("#06989a"),
            u.css.toColor("#d3d7cf"),
            u.css.toColor("#555753"),
            u.css.toColor("#ef2929"),
            u.css.toColor("#8ae234"),
            u.css.toColor("#fce94f"),
            u.css.toColor("#729fcf"),
            u.css.toColor("#ad7fa8"),
            u.css.toColor("#34e2e2"),
            u.css.toColor("#eeeeec")
          ], h = [
            0,
            95,
            135,
            175,
            215,
            255
          ];
          for (let m = 0; m < 216; m++) {
            const E = h[m / 36 % 6 | 0], x = h[m / 6 % 6 | 0], b = h[m % 6];
            d.push({
              css: u.channels.toCss(E, x, b),
              rgba: u.channels.toRgba(E, x, b)
            });
          }
          for (let m = 0; m < 24; m++) {
            const E = 8 + 10 * m;
            d.push({
              css: u.channels.toCss(E, E, E),
              rgba: u.channels.toRgba(E, E, E)
            });
          }
          return d;
        })());
        let l = r.ThemeService = class extends g.Disposable {
          get colors() {
            return this._colors;
          }
          constructor(d) {
            super(), this._optionsService = d, this._contrastCache = new n.ColorContrastCache(), this._halfContrastCache = new n.ColorContrastCache(), this._onChangeColors = this.register(new p.EventEmitter()), this.onChangeColors = this._onChangeColors.event, this._colors = {
              foreground: e,
              background: s,
              cursor: t,
              cursorAccent: i,
              selectionForeground: void 0,
              selectionBackgroundTransparent: o,
              selectionBackgroundOpaque: u.color.blend(s, o),
              selectionInactiveBackgroundTransparent: o,
              selectionInactiveBackgroundOpaque: u.color.blend(s, o),
              ansi: r.DEFAULT_ANSI_COLORS.slice(),
              contrastCache: this._contrastCache,
              halfContrastCache: this._halfContrastCache
            }, this._updateRestoreColors(), this._setTheme(this._optionsService.rawOptions.theme), this.register(this._optionsService.onSpecificOptionChange("minimumContrastRatio", (() => this._contrastCache.clear()))), this.register(this._optionsService.onSpecificOptionChange("theme", (() => this._setTheme(this._optionsService.rawOptions.theme))));
          }
          _setTheme(d = {}) {
            const h = this._colors;
            if (h.foreground = v(d.foreground, e), h.background = v(d.background, s), h.cursor = v(d.cursor, t), h.cursorAccent = v(d.cursorAccent, i), h.selectionBackgroundTransparent = v(d.selectionBackground, o), h.selectionBackgroundOpaque = u.color.blend(h.background, h.selectionBackgroundTransparent), h.selectionInactiveBackgroundTransparent = v(d.selectionInactiveBackground, h.selectionBackgroundTransparent), h.selectionInactiveBackgroundOpaque = u.color.blend(h.background, h.selectionInactiveBackgroundTransparent), h.selectionForeground = d.selectionForeground ? v(d.selectionForeground, u.NULL_COLOR) : void 0, h.selectionForeground === u.NULL_COLOR && (h.selectionForeground = void 0), u.color.isOpaque(h.selectionBackgroundTransparent) && (h.selectionBackgroundTransparent = u.color.opacity(h.selectionBackgroundTransparent, 0.3)), u.color.isOpaque(h.selectionInactiveBackgroundTransparent) && (h.selectionInactiveBackgroundTransparent = u.color.opacity(h.selectionInactiveBackgroundTransparent, 0.3)), h.ansi = r.DEFAULT_ANSI_COLORS.slice(), h.ansi[0] = v(d.black, r.DEFAULT_ANSI_COLORS[0]), h.ansi[1] = v(d.red, r.DEFAULT_ANSI_COLORS[1]), h.ansi[2] = v(d.green, r.DEFAULT_ANSI_COLORS[2]), h.ansi[3] = v(d.yellow, r.DEFAULT_ANSI_COLORS[3]), h.ansi[4] = v(d.blue, r.DEFAULT_ANSI_COLORS[4]), h.ansi[5] = v(d.magenta, r.DEFAULT_ANSI_COLORS[5]), h.ansi[6] = v(d.cyan, r.DEFAULT_ANSI_COLORS[6]), h.ansi[7] = v(d.white, r.DEFAULT_ANSI_COLORS[7]), h.ansi[8] = v(d.brightBlack, r.DEFAULT_ANSI_COLORS[8]), h.ansi[9] = v(d.brightRed, r.DEFAULT_ANSI_COLORS[9]), h.ansi[10] = v(d.brightGreen, r.DEFAULT_ANSI_COLORS[10]), h.ansi[11] = v(d.brightYellow, r.DEFAULT_ANSI_COLORS[11]), h.ansi[12] = v(d.brightBlue, r.DEFAULT_ANSI_COLORS[12]), h.ansi[13] = v(d.brightMagenta, r.DEFAULT_ANSI_COLORS[13]), h.ansi[14] = v(d.brightCyan, r.DEFAULT_ANSI_COLORS[14]), h.ansi[15] = v(d.brightWhite, r.DEFAULT_ANSI_COLORS[15]), d.extendedAnsi) {
              const m = Math.min(h.ansi.length - 16, d.extendedAnsi.length);
              for (let E = 0; E < m; E++) h.ansi[E + 16] = v(d.extendedAnsi[E], r.DEFAULT_ANSI_COLORS[E + 16]);
            }
            this._contrastCache.clear(), this._halfContrastCache.clear(), this._updateRestoreColors(), this._onChangeColors.fire(this.colors);
          }
          restoreColor(d) {
            this._restoreColor(d), this._onChangeColors.fire(this.colors);
          }
          _restoreColor(d) {
            if (d !== void 0) switch (d) {
              case 256:
                this._colors.foreground = this._restoreColors.foreground;
                break;
              case 257:
                this._colors.background = this._restoreColors.background;
                break;
              case 258:
                this._colors.cursor = this._restoreColors.cursor;
                break;
              default:
                this._colors.ansi[d] = this._restoreColors.ansi[d];
            }
            else for (let h = 0; h < this._restoreColors.ansi.length; ++h) this._colors.ansi[h] = this._restoreColors.ansi[h];
          }
          modifyColors(d) {
            d(this._colors), this._onChangeColors.fire(this.colors);
          }
          _updateRestoreColors() {
            this._restoreColors = {
              foreground: this._colors.foreground,
              background: this._colors.background,
              cursor: this._colors.cursor,
              ansi: this._colors.ansi.slice()
            };
          }
        };
        function v(d, h) {
          if (d !== void 0) try {
            return u.css.toColor(d);
          } catch {
          }
          return h;
        }
        r.ThemeService = l = c([f(0, _.IOptionsService)], l);
      },
      6349: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CircularList = void 0;
        const c = a(8460), f = a(844);
        class n extends f.Disposable {
          constructor(p) {
            super(), this._maxLength = p, this.onDeleteEmitter = this.register(new c.EventEmitter()), this.onDelete = this.onDeleteEmitter.event, this.onInsertEmitter = this.register(new c.EventEmitter()), this.onInsert = this.onInsertEmitter.event, this.onTrimEmitter = this.register(new c.EventEmitter()), this.onTrim = this.onTrimEmitter.event, this._array = new Array(this._maxLength), this._startIndex = 0, this._length = 0;
          }
          get maxLength() {
            return this._maxLength;
          }
          set maxLength(p) {
            if (this._maxLength === p) return;
            const g = new Array(p);
            for (let _ = 0; _ < Math.min(p, this.length); _++) g[_] = this._array[this._getCyclicIndex(_)];
            this._array = g, this._maxLength = p, this._startIndex = 0;
          }
          get length() {
            return this._length;
          }
          set length(p) {
            if (p > this._length) for (let g = this._length; g < p; g++) this._array[g] = void 0;
            this._length = p;
          }
          get(p) {
            return this._array[this._getCyclicIndex(p)];
          }
          set(p, g) {
            this._array[this._getCyclicIndex(p)] = g;
          }
          push(p) {
            this._array[this._getCyclicIndex(this._length)] = p, this._length === this._maxLength ? (this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1)) : this._length++;
          }
          recycle() {
            if (this._length !== this._maxLength) throw new Error("Can only recycle when the buffer is full");
            return this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1), this._array[this._getCyclicIndex(this._length - 1)];
          }
          get isFull() {
            return this._length === this._maxLength;
          }
          pop() {
            return this._array[this._getCyclicIndex(this._length-- - 1)];
          }
          splice(p, g, ..._) {
            if (g) {
              for (let e = p; e < this._length - g; e++) this._array[this._getCyclicIndex(e)] = this._array[this._getCyclicIndex(e + g)];
              this._length -= g, this.onDeleteEmitter.fire({
                index: p,
                amount: g
              });
            }
            for (let e = this._length - 1; e >= p; e--) this._array[this._getCyclicIndex(e + _.length)] = this._array[this._getCyclicIndex(e)];
            for (let e = 0; e < _.length; e++) this._array[this._getCyclicIndex(p + e)] = _[e];
            if (_.length && this.onInsertEmitter.fire({
              index: p,
              amount: _.length
            }), this._length + _.length > this._maxLength) {
              const e = this._length + _.length - this._maxLength;
              this._startIndex += e, this._length = this._maxLength, this.onTrimEmitter.fire(e);
            } else this._length += _.length;
          }
          trimStart(p) {
            p > this._length && (p = this._length), this._startIndex += p, this._length -= p, this.onTrimEmitter.fire(p);
          }
          shiftElements(p, g, _) {
            if (!(g <= 0)) {
              if (p < 0 || p >= this._length) throw new Error("start argument out of range");
              if (p + _ < 0) throw new Error("Cannot shift elements in list beyond index 0");
              if (_ > 0) {
                for (let s = g - 1; s >= 0; s--) this.set(p + s + _, this.get(p + s));
                const e = p + g + _ - this._length;
                if (e > 0) for (this._length += e; this._length > this._maxLength; ) this._length--, this._startIndex++, this.onTrimEmitter.fire(1);
              } else for (let e = 0; e < g; e++) this.set(p + e + _, this.get(p + e));
            }
          }
          _getCyclicIndex(p) {
            return (this._startIndex + p) % this._maxLength;
          }
        }
        r.CircularList = n;
      },
      1439: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.clone = void 0, r.clone = function a(c, f = 5) {
          if (typeof c != "object") return c;
          const n = Array.isArray(c) ? [] : {};
          for (const u in c) n[u] = f <= 1 ? c[u] : c[u] && a(c[u], f - 1);
          return n;
        };
      },
      8055: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.contrastRatio = r.toPaddedHex = r.rgba = r.rgb = r.css = r.color = r.channels = r.NULL_COLOR = void 0;
        const c = a(6114);
        let f = 0, n = 0, u = 0, p = 0;
        var g, _, e, s, t;
        function i(l) {
          const v = l.toString(16);
          return v.length < 2 ? "0" + v : v;
        }
        function o(l, v) {
          return l < v ? (v + 0.05) / (l + 0.05) : (l + 0.05) / (v + 0.05);
        }
        r.NULL_COLOR = {
          css: "#00000000",
          rgba: 0
        }, (function(l) {
          l.toCss = function(v, d, h, m) {
            return m !== void 0 ? `#${i(v)}${i(d)}${i(h)}${i(m)}` : `#${i(v)}${i(d)}${i(h)}`;
          }, l.toRgba = function(v, d, h, m = 255) {
            return (v << 24 | d << 16 | h << 8 | m) >>> 0;
          };
        })(g || (r.channels = g = {})), (function(l) {
          function v(d, h) {
            return p = Math.round(255 * h), [f, n, u] = t.toChannels(d.rgba), {
              css: g.toCss(f, n, u, p),
              rgba: g.toRgba(f, n, u, p)
            };
          }
          l.blend = function(d, h) {
            if (p = (255 & h.rgba) / 255, p === 1) return {
              css: h.css,
              rgba: h.rgba
            };
            const m = h.rgba >> 24 & 255, E = h.rgba >> 16 & 255, x = h.rgba >> 8 & 255, b = d.rgba >> 24 & 255, k = d.rgba >> 16 & 255, R = d.rgba >> 8 & 255;
            return f = b + Math.round((m - b) * p), n = k + Math.round((E - k) * p), u = R + Math.round((x - R) * p), {
              css: g.toCss(f, n, u),
              rgba: g.toRgba(f, n, u)
            };
          }, l.isOpaque = function(d) {
            return (255 & d.rgba) == 255;
          }, l.ensureContrastRatio = function(d, h, m) {
            const E = t.ensureContrastRatio(d.rgba, h.rgba, m);
            if (E) return t.toColor(E >> 24 & 255, E >> 16 & 255, E >> 8 & 255);
          }, l.opaque = function(d) {
            const h = (255 | d.rgba) >>> 0;
            return [f, n, u] = t.toChannels(h), {
              css: g.toCss(f, n, u),
              rgba: h
            };
          }, l.opacity = v, l.multiplyOpacity = function(d, h) {
            return p = 255 & d.rgba, v(d, p * h / 255);
          }, l.toColorRGB = function(d) {
            return [
              d.rgba >> 24 & 255,
              d.rgba >> 16 & 255,
              d.rgba >> 8 & 255
            ];
          };
        })(_ || (r.color = _ = {})), (function(l) {
          let v, d;
          if (!c.isNode) {
            const h = document.createElement("canvas");
            h.width = 1, h.height = 1;
            const m = h.getContext("2d", { willReadFrequently: !0 });
            m && (v = m, v.globalCompositeOperation = "copy", d = v.createLinearGradient(0, 0, 1, 1));
          }
          l.toColor = function(h) {
            if (h.match(/#[\da-f]{3,8}/i)) switch (h.length) {
              case 4:
                return f = parseInt(h.slice(1, 2).repeat(2), 16), n = parseInt(h.slice(2, 3).repeat(2), 16), u = parseInt(h.slice(3, 4).repeat(2), 16), t.toColor(f, n, u);
              case 5:
                return f = parseInt(h.slice(1, 2).repeat(2), 16), n = parseInt(h.slice(2, 3).repeat(2), 16), u = parseInt(h.slice(3, 4).repeat(2), 16), p = parseInt(h.slice(4, 5).repeat(2), 16), t.toColor(f, n, u, p);
              case 7:
                return {
                  css: h,
                  rgba: (parseInt(h.slice(1), 16) << 8 | 255) >>> 0
                };
              case 9:
                return {
                  css: h,
                  rgba: parseInt(h.slice(1), 16) >>> 0
                };
            }
            const m = h.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
            if (m) return f = parseInt(m[1]), n = parseInt(m[2]), u = parseInt(m[3]), p = Math.round(255 * (m[5] === void 0 ? 1 : parseFloat(m[5]))), t.toColor(f, n, u, p);
            if (!v || !d) throw new Error("css.toColor: Unsupported css format");
            if (v.fillStyle = d, v.fillStyle = h, typeof v.fillStyle != "string") throw new Error("css.toColor: Unsupported css format");
            if (v.fillRect(0, 0, 1, 1), [f, n, u, p] = v.getImageData(0, 0, 1, 1).data, p !== 255) throw new Error("css.toColor: Unsupported css format");
            return {
              rgba: g.toRgba(f, n, u, p),
              css: h
            };
          };
        })(e || (r.css = e = {})), (function(l) {
          function v(d, h, m) {
            const E = d / 255, x = h / 255, b = m / 255;
            return 0.2126 * (E <= 0.03928 ? E / 12.92 : Math.pow((E + 0.055) / 1.055, 2.4)) + 0.7152 * (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)) + 0.0722 * (b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4));
          }
          l.relativeLuminance = function(d) {
            return v(d >> 16 & 255, d >> 8 & 255, 255 & d);
          }, l.relativeLuminance2 = v;
        })(s || (r.rgb = s = {})), (function(l) {
          function v(h, m, E) {
            const x = h >> 24 & 255, b = h >> 16 & 255, k = h >> 8 & 255;
            let R = m >> 24 & 255, H = m >> 16 & 255, P = m >> 8 & 255, M = o(s.relativeLuminance2(R, H, P), s.relativeLuminance2(x, b, k));
            for (; M < E && (R > 0 || H > 0 || P > 0); ) R -= Math.max(0, Math.ceil(0.1 * R)), H -= Math.max(0, Math.ceil(0.1 * H)), P -= Math.max(0, Math.ceil(0.1 * P)), M = o(s.relativeLuminance2(R, H, P), s.relativeLuminance2(x, b, k));
            return (R << 24 | H << 16 | P << 8 | 255) >>> 0;
          }
          function d(h, m, E) {
            const x = h >> 24 & 255, b = h >> 16 & 255, k = h >> 8 & 255;
            let R = m >> 24 & 255, H = m >> 16 & 255, P = m >> 8 & 255, M = o(s.relativeLuminance2(R, H, P), s.relativeLuminance2(x, b, k));
            for (; M < E && (R < 255 || H < 255 || P < 255); ) R = Math.min(255, R + Math.ceil(0.1 * (255 - R))), H = Math.min(255, H + Math.ceil(0.1 * (255 - H))), P = Math.min(255, P + Math.ceil(0.1 * (255 - P))), M = o(s.relativeLuminance2(R, H, P), s.relativeLuminance2(x, b, k));
            return (R << 24 | H << 16 | P << 8 | 255) >>> 0;
          }
          l.ensureContrastRatio = function(h, m, E) {
            const x = s.relativeLuminance(h >> 8), b = s.relativeLuminance(m >> 8);
            if (o(x, b) < E) {
              if (b < x) {
                const H = v(h, m, E), P = o(x, s.relativeLuminance(H >> 8));
                if (P < E) {
                  const M = d(h, m, E);
                  return P > o(x, s.relativeLuminance(M >> 8)) ? H : M;
                }
                return H;
              }
              const k = d(h, m, E), R = o(x, s.relativeLuminance(k >> 8));
              if (R < E) {
                const H = v(h, m, E);
                return R > o(x, s.relativeLuminance(H >> 8)) ? k : H;
              }
              return k;
            }
          }, l.reduceLuminance = v, l.increaseLuminance = d, l.toChannels = function(h) {
            return [
              h >> 24 & 255,
              h >> 16 & 255,
              h >> 8 & 255,
              255 & h
            ];
          }, l.toColor = function(h, m, E, x) {
            return {
              css: g.toCss(h, m, E, x),
              rgba: g.toRgba(h, m, E, x)
            };
          };
        })(t || (r.rgba = t = {})), r.toPaddedHex = i, r.contrastRatio = o;
      },
      8969: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CoreTerminal = void 0;
        const c = a(844), f = a(2585), n = a(4348), u = a(7866), p = a(744), g = a(7302), _ = a(6975), e = a(8460), s = a(1753), t = a(1480), i = a(7994), o = a(9282), l = a(5435), v = a(5981), d = a(2660);
        let h = !1;
        class m extends c.Disposable {
          get onScroll() {
            return this._onScrollApi || (this._onScrollApi = this.register(new e.EventEmitter()), this._onScroll.event(((x) => {
              var b;
              (b = this._onScrollApi) === null || b === void 0 || b.fire(x.position);
            }))), this._onScrollApi.event;
          }
          get cols() {
            return this._bufferService.cols;
          }
          get rows() {
            return this._bufferService.rows;
          }
          get buffers() {
            return this._bufferService.buffers;
          }
          get options() {
            return this.optionsService.options;
          }
          set options(x) {
            for (const b in x) this.optionsService.options[b] = x[b];
          }
          constructor(x) {
            super(), this._windowsWrappingHeuristics = this.register(new c.MutableDisposable()), this._onBinary = this.register(new e.EventEmitter()), this.onBinary = this._onBinary.event, this._onData = this.register(new e.EventEmitter()), this.onData = this._onData.event, this._onLineFeed = this.register(new e.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onResize = this.register(new e.EventEmitter()), this.onResize = this._onResize.event, this._onWriteParsed = this.register(new e.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event, this._onScroll = this.register(new e.EventEmitter()), this._instantiationService = new n.InstantiationService(), this.optionsService = this.register(new g.OptionsService(x)), this._instantiationService.setService(f.IOptionsService, this.optionsService), this._bufferService = this.register(this._instantiationService.createInstance(p.BufferService)), this._instantiationService.setService(f.IBufferService, this._bufferService), this._logService = this.register(this._instantiationService.createInstance(u.LogService)), this._instantiationService.setService(f.ILogService, this._logService), this.coreService = this.register(this._instantiationService.createInstance(_.CoreService)), this._instantiationService.setService(f.ICoreService, this.coreService), this.coreMouseService = this.register(this._instantiationService.createInstance(s.CoreMouseService)), this._instantiationService.setService(f.ICoreMouseService, this.coreMouseService), this.unicodeService = this.register(this._instantiationService.createInstance(t.UnicodeService)), this._instantiationService.setService(f.IUnicodeService, this.unicodeService), this._charsetService = this._instantiationService.createInstance(i.CharsetService), this._instantiationService.setService(f.ICharsetService, this._charsetService), this._oscLinkService = this._instantiationService.createInstance(d.OscLinkService), this._instantiationService.setService(f.IOscLinkService, this._oscLinkService), this._inputHandler = this.register(new l.InputHandler(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.coreMouseService, this.unicodeService)), this.register((0, e.forwardEvent)(this._inputHandler.onLineFeed, this._onLineFeed)), this.register(this._inputHandler), this.register((0, e.forwardEvent)(this._bufferService.onResize, this._onResize)), this.register((0, e.forwardEvent)(this.coreService.onData, this._onData)), this.register((0, e.forwardEvent)(this.coreService.onBinary, this._onBinary)), this.register(this.coreService.onRequestScrollToBottom((() => this.scrollToBottom()))), this.register(this.coreService.onUserInput((() => this._writeBuffer.handleUserInput()))), this.register(this.optionsService.onMultipleOptionChange(["windowsMode", "windowsPty"], (() => this._handleWindowsPtyOptionChange()))), this.register(this._bufferService.onScroll(((b) => {
              this._onScroll.fire({
                position: this._bufferService.buffer.ydisp,
                source: 0
              }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
            }))), this.register(this._inputHandler.onScroll(((b) => {
              this._onScroll.fire({
                position: this._bufferService.buffer.ydisp,
                source: 0
              }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
            }))), this._writeBuffer = this.register(new v.WriteBuffer(((b, k) => this._inputHandler.parse(b, k)))), this.register((0, e.forwardEvent)(this._writeBuffer.onWriteParsed, this._onWriteParsed));
          }
          write(x, b) {
            this._writeBuffer.write(x, b);
          }
          writeSync(x, b) {
            this._logService.logLevel <= f.LogLevelEnum.WARN && !h && (this._logService.warn("writeSync is unreliable and will be removed soon."), h = !0), this._writeBuffer.writeSync(x, b);
          }
          resize(x, b) {
            isNaN(x) || isNaN(b) || (x = Math.max(x, p.MINIMUM_COLS), b = Math.max(b, p.MINIMUM_ROWS), this._bufferService.resize(x, b));
          }
          scroll(x, b = !1) {
            this._bufferService.scroll(x, b);
          }
          scrollLines(x, b, k) {
            this._bufferService.scrollLines(x, b, k);
          }
          scrollPages(x) {
            this.scrollLines(x * (this.rows - 1));
          }
          scrollToTop() {
            this.scrollLines(-this._bufferService.buffer.ydisp);
          }
          scrollToBottom() {
            this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
          }
          scrollToLine(x) {
            const b = x - this._bufferService.buffer.ydisp;
            b !== 0 && this.scrollLines(b);
          }
          registerEscHandler(x, b) {
            return this._inputHandler.registerEscHandler(x, b);
          }
          registerDcsHandler(x, b) {
            return this._inputHandler.registerDcsHandler(x, b);
          }
          registerCsiHandler(x, b) {
            return this._inputHandler.registerCsiHandler(x, b);
          }
          registerOscHandler(x, b) {
            return this._inputHandler.registerOscHandler(x, b);
          }
          _setup() {
            this._handleWindowsPtyOptionChange();
          }
          reset() {
            this._inputHandler.reset(), this._bufferService.reset(), this._charsetService.reset(), this.coreService.reset(), this.coreMouseService.reset();
          }
          _handleWindowsPtyOptionChange() {
            let x = !1;
            const b = this.optionsService.rawOptions.windowsPty;
            b && b.buildNumber !== void 0 && b.buildNumber !== void 0 ? x = b.backend === "conpty" && b.buildNumber < 21376 : this.optionsService.rawOptions.windowsMode && (x = !0), x ? this._enableWindowsWrappingHeuristics() : this._windowsWrappingHeuristics.clear();
          }
          _enableWindowsWrappingHeuristics() {
            if (!this._windowsWrappingHeuristics.value) {
              const x = [];
              x.push(this.onLineFeed(o.updateWindowsModeWrappedState.bind(null, this._bufferService))), x.push(this.registerCsiHandler({ final: "H" }, (() => ((0, o.updateWindowsModeWrappedState)(this._bufferService), !1)))), this._windowsWrappingHeuristics.value = (0, c.toDisposable)((() => {
                for (const b of x) b.dispose();
              }));
            }
          }
        }
        r.CoreTerminal = m;
      },
      8460: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.forwardEvent = r.EventEmitter = void 0, r.EventEmitter = class {
          constructor() {
            this._listeners = [], this._disposed = !1;
          }
          get event() {
            return this._event || (this._event = (a) => (this._listeners.push(a), { dispose: () => {
              if (!this._disposed) {
                for (let c = 0; c < this._listeners.length; c++) if (this._listeners[c] === a) return void this._listeners.splice(c, 1);
              }
            } })), this._event;
          }
          fire(a, c) {
            const f = [];
            for (let n = 0; n < this._listeners.length; n++) f.push(this._listeners[n]);
            for (let n = 0; n < f.length; n++) f[n].call(void 0, a, c);
          }
          dispose() {
            this.clearListeners(), this._disposed = !0;
          }
          clearListeners() {
            this._listeners && (this._listeners.length = 0);
          }
        }, r.forwardEvent = function(a, c) {
          return a(((f) => c.fire(f)));
        };
      },
      5435: function(O, r, a) {
        var c = this && this.__decorate || function(M, S, y, w) {
          var L, I = arguments.length, F = I < 3 ? S : w === null ? w = Object.getOwnPropertyDescriptor(S, y) : w;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") F = Reflect.decorate(M, S, y, w);
          else for (var N = M.length - 1; N >= 0; N--) (L = M[N]) && (F = (I < 3 ? L(F) : I > 3 ? L(S, y, F) : L(S, y)) || F);
          return I > 3 && F && Object.defineProperty(S, y, F), F;
        }, f = this && this.__param || function(M, S) {
          return function(y, w) {
            S(y, w, M);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.InputHandler = r.WindowsOptionsReportType = void 0;
        const n = a(2584), u = a(7116), p = a(2015), g = a(844), _ = a(482), e = a(8437), s = a(8460), t = a(643), i = a(511), o = a(3734), l = a(2585), v = a(6242), d = a(6351), h = a(5941), m = {
          "(": 0,
          ")": 1,
          "*": 2,
          "+": 3,
          "-": 1,
          ".": 2
        }, E = 131072;
        function x(M, S) {
          if (M > 24) return S.setWinLines || !1;
          switch (M) {
            case 1:
              return !!S.restoreWin;
            case 2:
              return !!S.minimizeWin;
            case 3:
              return !!S.setWinPosition;
            case 4:
              return !!S.setWinSizePixels;
            case 5:
              return !!S.raiseWin;
            case 6:
              return !!S.lowerWin;
            case 7:
              return !!S.refreshWin;
            case 8:
              return !!S.setWinSizeChars;
            case 9:
              return !!S.maximizeWin;
            case 10:
              return !!S.fullscreenWin;
            case 11:
              return !!S.getWinState;
            case 13:
              return !!S.getWinPosition;
            case 14:
              return !!S.getWinSizePixels;
            case 15:
              return !!S.getScreenSizePixels;
            case 16:
              return !!S.getCellSizePixels;
            case 18:
              return !!S.getWinSizeChars;
            case 19:
              return !!S.getScreenSizeChars;
            case 20:
              return !!S.getIconTitle;
            case 21:
              return !!S.getWinTitle;
            case 22:
              return !!S.pushTitle;
            case 23:
              return !!S.popTitle;
            case 24:
              return !!S.setWinLines;
          }
          return !1;
        }
        var b;
        (function(M) {
          M[M.GET_WIN_SIZE_PIXELS = 0] = "GET_WIN_SIZE_PIXELS", M[M.GET_CELL_SIZE_PIXELS = 1] = "GET_CELL_SIZE_PIXELS";
        })(b || (r.WindowsOptionsReportType = b = {}));
        let k = 0;
        class R extends g.Disposable {
          getAttrData() {
            return this._curAttrData;
          }
          constructor(S, y, w, L, I, F, N, $, X = new p.EscapeSequenceParser()) {
            super(), this._bufferService = S, this._charsetService = y, this._coreService = w, this._logService = L, this._optionsService = I, this._oscLinkService = F, this._coreMouseService = N, this._unicodeService = $, this._parser = X, this._parseBuffer = new Uint32Array(4096), this._stringDecoder = new _.StringToUtf32(), this._utf8Decoder = new _.Utf8ToUtf32(), this._workCell = new i.CellData(), this._windowTitle = "", this._iconName = "", this._windowTitleStack = [], this._iconNameStack = [], this._curAttrData = e.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = e.DEFAULT_ATTR_DATA.clone(), this._onRequestBell = this.register(new s.EventEmitter()), this.onRequestBell = this._onRequestBell.event, this._onRequestRefreshRows = this.register(new s.EventEmitter()), this.onRequestRefreshRows = this._onRequestRefreshRows.event, this._onRequestReset = this.register(new s.EventEmitter()), this.onRequestReset = this._onRequestReset.event, this._onRequestSendFocus = this.register(new s.EventEmitter()), this.onRequestSendFocus = this._onRequestSendFocus.event, this._onRequestSyncScrollBar = this.register(new s.EventEmitter()), this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event, this._onRequestWindowsOptionsReport = this.register(new s.EventEmitter()), this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event, this._onA11yChar = this.register(new s.EventEmitter()), this.onA11yChar = this._onA11yChar.event, this._onA11yTab = this.register(new s.EventEmitter()), this.onA11yTab = this._onA11yTab.event, this._onCursorMove = this.register(new s.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onLineFeed = this.register(new s.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onScroll = this.register(new s.EventEmitter()), this.onScroll = this._onScroll.event, this._onTitleChange = this.register(new s.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onColor = this.register(new s.EventEmitter()), this.onColor = this._onColor.event, this._parseStack = {
              paused: !1,
              cursorStartX: 0,
              cursorStartY: 0,
              decodedLength: 0,
              position: 0
            }, this._specialColors = [
              256,
              257,
              258
            ], this.register(this._parser), this._dirtyRowTracker = new H(this._bufferService), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate(((C) => this._activeBuffer = C.activeBuffer))), this._parser.setCsiHandlerFallback(((C, D) => {
              this._logService.debug("Unknown CSI code: ", {
                identifier: this._parser.identToString(C),
                params: D.toArray()
              });
            })), this._parser.setEscHandlerFallback(((C) => {
              this._logService.debug("Unknown ESC code: ", { identifier: this._parser.identToString(C) });
            })), this._parser.setExecuteHandlerFallback(((C) => {
              this._logService.debug("Unknown EXECUTE code: ", { code: C });
            })), this._parser.setOscHandlerFallback(((C, D, T) => {
              this._logService.debug("Unknown OSC code: ", {
                identifier: C,
                action: D,
                data: T
              });
            })), this._parser.setDcsHandlerFallback(((C, D, T) => {
              D === "HOOK" && (T = T.toArray()), this._logService.debug("Unknown DCS code: ", {
                identifier: this._parser.identToString(C),
                action: D,
                payload: T
              });
            })), this._parser.setPrintHandler(((C, D, T) => this.print(C, D, T))), this._parser.registerCsiHandler({ final: "@" }, ((C) => this.insertChars(C))), this._parser.registerCsiHandler({
              intermediates: " ",
              final: "@"
            }, ((C) => this.scrollLeft(C))), this._parser.registerCsiHandler({ final: "A" }, ((C) => this.cursorUp(C))), this._parser.registerCsiHandler({
              intermediates: " ",
              final: "A"
            }, ((C) => this.scrollRight(C))), this._parser.registerCsiHandler({ final: "B" }, ((C) => this.cursorDown(C))), this._parser.registerCsiHandler({ final: "C" }, ((C) => this.cursorForward(C))), this._parser.registerCsiHandler({ final: "D" }, ((C) => this.cursorBackward(C))), this._parser.registerCsiHandler({ final: "E" }, ((C) => this.cursorNextLine(C))), this._parser.registerCsiHandler({ final: "F" }, ((C) => this.cursorPrecedingLine(C))), this._parser.registerCsiHandler({ final: "G" }, ((C) => this.cursorCharAbsolute(C))), this._parser.registerCsiHandler({ final: "H" }, ((C) => this.cursorPosition(C))), this._parser.registerCsiHandler({ final: "I" }, ((C) => this.cursorForwardTab(C))), this._parser.registerCsiHandler({ final: "J" }, ((C) => this.eraseInDisplay(C, !1))), this._parser.registerCsiHandler({
              prefix: "?",
              final: "J"
            }, ((C) => this.eraseInDisplay(C, !0))), this._parser.registerCsiHandler({ final: "K" }, ((C) => this.eraseInLine(C, !1))), this._parser.registerCsiHandler({
              prefix: "?",
              final: "K"
            }, ((C) => this.eraseInLine(C, !0))), this._parser.registerCsiHandler({ final: "L" }, ((C) => this.insertLines(C))), this._parser.registerCsiHandler({ final: "M" }, ((C) => this.deleteLines(C))), this._parser.registerCsiHandler({ final: "P" }, ((C) => this.deleteChars(C))), this._parser.registerCsiHandler({ final: "S" }, ((C) => this.scrollUp(C))), this._parser.registerCsiHandler({ final: "T" }, ((C) => this.scrollDown(C))), this._parser.registerCsiHandler({ final: "X" }, ((C) => this.eraseChars(C))), this._parser.registerCsiHandler({ final: "Z" }, ((C) => this.cursorBackwardTab(C))), this._parser.registerCsiHandler({ final: "`" }, ((C) => this.charPosAbsolute(C))), this._parser.registerCsiHandler({ final: "a" }, ((C) => this.hPositionRelative(C))), this._parser.registerCsiHandler({ final: "b" }, ((C) => this.repeatPrecedingCharacter(C))), this._parser.registerCsiHandler({ final: "c" }, ((C) => this.sendDeviceAttributesPrimary(C))), this._parser.registerCsiHandler({
              prefix: ">",
              final: "c"
            }, ((C) => this.sendDeviceAttributesSecondary(C))), this._parser.registerCsiHandler({ final: "d" }, ((C) => this.linePosAbsolute(C))), this._parser.registerCsiHandler({ final: "e" }, ((C) => this.vPositionRelative(C))), this._parser.registerCsiHandler({ final: "f" }, ((C) => this.hVPosition(C))), this._parser.registerCsiHandler({ final: "g" }, ((C) => this.tabClear(C))), this._parser.registerCsiHandler({ final: "h" }, ((C) => this.setMode(C))), this._parser.registerCsiHandler({
              prefix: "?",
              final: "h"
            }, ((C) => this.setModePrivate(C))), this._parser.registerCsiHandler({ final: "l" }, ((C) => this.resetMode(C))), this._parser.registerCsiHandler({
              prefix: "?",
              final: "l"
            }, ((C) => this.resetModePrivate(C))), this._parser.registerCsiHandler({ final: "m" }, ((C) => this.charAttributes(C))), this._parser.registerCsiHandler({ final: "n" }, ((C) => this.deviceStatus(C))), this._parser.registerCsiHandler({
              prefix: "?",
              final: "n"
            }, ((C) => this.deviceStatusPrivate(C))), this._parser.registerCsiHandler({
              intermediates: "!",
              final: "p"
            }, ((C) => this.softReset(C))), this._parser.registerCsiHandler({
              intermediates: " ",
              final: "q"
            }, ((C) => this.setCursorStyle(C))), this._parser.registerCsiHandler({ final: "r" }, ((C) => this.setScrollRegion(C))), this._parser.registerCsiHandler({ final: "s" }, ((C) => this.saveCursor(C))), this._parser.registerCsiHandler({ final: "t" }, ((C) => this.windowOptions(C))), this._parser.registerCsiHandler({ final: "u" }, ((C) => this.restoreCursor(C))), this._parser.registerCsiHandler({
              intermediates: "'",
              final: "}"
            }, ((C) => this.insertColumns(C))), this._parser.registerCsiHandler({
              intermediates: "'",
              final: "~"
            }, ((C) => this.deleteColumns(C))), this._parser.registerCsiHandler({
              intermediates: '"',
              final: "q"
            }, ((C) => this.selectProtected(C))), this._parser.registerCsiHandler({
              intermediates: "$",
              final: "p"
            }, ((C) => this.requestMode(C, !0))), this._parser.registerCsiHandler({
              prefix: "?",
              intermediates: "$",
              final: "p"
            }, ((C) => this.requestMode(C, !1))), this._parser.setExecuteHandler(n.C0.BEL, (() => this.bell())), this._parser.setExecuteHandler(n.C0.LF, (() => this.lineFeed())), this._parser.setExecuteHandler(n.C0.VT, (() => this.lineFeed())), this._parser.setExecuteHandler(n.C0.FF, (() => this.lineFeed())), this._parser.setExecuteHandler(n.C0.CR, (() => this.carriageReturn())), this._parser.setExecuteHandler(n.C0.BS, (() => this.backspace())), this._parser.setExecuteHandler(n.C0.HT, (() => this.tab())), this._parser.setExecuteHandler(n.C0.SO, (() => this.shiftOut())), this._parser.setExecuteHandler(n.C0.SI, (() => this.shiftIn())), this._parser.setExecuteHandler(n.C1.IND, (() => this.index())), this._parser.setExecuteHandler(n.C1.NEL, (() => this.nextLine())), this._parser.setExecuteHandler(n.C1.HTS, (() => this.tabSet())), this._parser.registerOscHandler(0, new v.OscHandler(((C) => (this.setTitle(C), this.setIconName(C), !0)))), this._parser.registerOscHandler(1, new v.OscHandler(((C) => this.setIconName(C)))), this._parser.registerOscHandler(2, new v.OscHandler(((C) => this.setTitle(C)))), this._parser.registerOscHandler(4, new v.OscHandler(((C) => this.setOrReportIndexedColor(C)))), this._parser.registerOscHandler(8, new v.OscHandler(((C) => this.setHyperlink(C)))), this._parser.registerOscHandler(10, new v.OscHandler(((C) => this.setOrReportFgColor(C)))), this._parser.registerOscHandler(11, new v.OscHandler(((C) => this.setOrReportBgColor(C)))), this._parser.registerOscHandler(12, new v.OscHandler(((C) => this.setOrReportCursorColor(C)))), this._parser.registerOscHandler(104, new v.OscHandler(((C) => this.restoreIndexedColor(C)))), this._parser.registerOscHandler(110, new v.OscHandler(((C) => this.restoreFgColor(C)))), this._parser.registerOscHandler(111, new v.OscHandler(((C) => this.restoreBgColor(C)))), this._parser.registerOscHandler(112, new v.OscHandler(((C) => this.restoreCursorColor(C)))), this._parser.registerEscHandler({ final: "7" }, (() => this.saveCursor())), this._parser.registerEscHandler({ final: "8" }, (() => this.restoreCursor())), this._parser.registerEscHandler({ final: "D" }, (() => this.index())), this._parser.registerEscHandler({ final: "E" }, (() => this.nextLine())), this._parser.registerEscHandler({ final: "H" }, (() => this.tabSet())), this._parser.registerEscHandler({ final: "M" }, (() => this.reverseIndex())), this._parser.registerEscHandler({ final: "=" }, (() => this.keypadApplicationMode())), this._parser.registerEscHandler({ final: ">" }, (() => this.keypadNumericMode())), this._parser.registerEscHandler({ final: "c" }, (() => this.fullReset())), this._parser.registerEscHandler({ final: "n" }, (() => this.setgLevel(2))), this._parser.registerEscHandler({ final: "o" }, (() => this.setgLevel(3))), this._parser.registerEscHandler({ final: "|" }, (() => this.setgLevel(3))), this._parser.registerEscHandler({ final: "}" }, (() => this.setgLevel(2))), this._parser.registerEscHandler({ final: "~" }, (() => this.setgLevel(1))), this._parser.registerEscHandler({
              intermediates: "%",
              final: "@"
            }, (() => this.selectDefaultCharset())), this._parser.registerEscHandler({
              intermediates: "%",
              final: "G"
            }, (() => this.selectDefaultCharset()));
            for (const C in u.CHARSETS) this._parser.registerEscHandler({
              intermediates: "(",
              final: C
            }, (() => this.selectCharset("(" + C))), this._parser.registerEscHandler({
              intermediates: ")",
              final: C
            }, (() => this.selectCharset(")" + C))), this._parser.registerEscHandler({
              intermediates: "*",
              final: C
            }, (() => this.selectCharset("*" + C))), this._parser.registerEscHandler({
              intermediates: "+",
              final: C
            }, (() => this.selectCharset("+" + C))), this._parser.registerEscHandler({
              intermediates: "-",
              final: C
            }, (() => this.selectCharset("-" + C))), this._parser.registerEscHandler({
              intermediates: ".",
              final: C
            }, (() => this.selectCharset("." + C))), this._parser.registerEscHandler({
              intermediates: "/",
              final: C
            }, (() => this.selectCharset("/" + C)));
            this._parser.registerEscHandler({
              intermediates: "#",
              final: "8"
            }, (() => this.screenAlignmentPattern())), this._parser.setErrorHandler(((C) => (this._logService.error("Parsing error: ", C), C))), this._parser.registerDcsHandler({
              intermediates: "$",
              final: "q"
            }, new d.DcsHandler(((C, D) => this.requestStatusString(C, D))));
          }
          _preserveStack(S, y, w, L) {
            this._parseStack.paused = !0, this._parseStack.cursorStartX = S, this._parseStack.cursorStartY = y, this._parseStack.decodedLength = w, this._parseStack.position = L;
          }
          _logSlowResolvingAsync(S) {
            this._logService.logLevel <= l.LogLevelEnum.WARN && Promise.race([S, new Promise(((y, w) => setTimeout((() => w("#SLOW_TIMEOUT")), 5e3)))]).catch(((y) => {
              if (y !== "#SLOW_TIMEOUT") throw y;
              console.warn("async parser handler taking longer than 5000 ms");
            }));
          }
          _getCurrentLinkId() {
            return this._curAttrData.extended.urlId;
          }
          parse(S, y) {
            let w, L = this._activeBuffer.x, I = this._activeBuffer.y, F = 0;
            const N = this._parseStack.paused;
            if (N) {
              if (w = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, y)) return this._logSlowResolvingAsync(w), w;
              L = this._parseStack.cursorStartX, I = this._parseStack.cursorStartY, this._parseStack.paused = !1, S.length > E && (F = this._parseStack.position + E);
            }
            if (this._logService.logLevel <= l.LogLevelEnum.DEBUG && this._logService.debug("parsing data" + (typeof S == "string" ? ` "${S}"` : ` "${Array.prototype.map.call(S, (($) => String.fromCharCode($))).join("")}"`), typeof S == "string" ? S.split("").map((($) => $.charCodeAt(0))) : S), this._parseBuffer.length < S.length && this._parseBuffer.length < E && (this._parseBuffer = new Uint32Array(Math.min(S.length, E))), N || this._dirtyRowTracker.clearRange(), S.length > E) for (let $ = F; $ < S.length; $ += E) {
              const X = $ + E < S.length ? $ + E : S.length, C = typeof S == "string" ? this._stringDecoder.decode(S.substring($, X), this._parseBuffer) : this._utf8Decoder.decode(S.subarray($, X), this._parseBuffer);
              if (w = this._parser.parse(this._parseBuffer, C)) return this._preserveStack(L, I, C, $), this._logSlowResolvingAsync(w), w;
            }
            else if (!N) {
              const $ = typeof S == "string" ? this._stringDecoder.decode(S, this._parseBuffer) : this._utf8Decoder.decode(S, this._parseBuffer);
              if (w = this._parser.parse(this._parseBuffer, $)) return this._preserveStack(L, I, $, 0), this._logSlowResolvingAsync(w), w;
            }
            this._activeBuffer.x === L && this._activeBuffer.y === I || this._onCursorMove.fire(), this._onRequestRefreshRows.fire(this._dirtyRowTracker.start, this._dirtyRowTracker.end);
          }
          print(S, y, w) {
            let L, I;
            const F = this._charsetService.charset, N = this._optionsService.rawOptions.screenReaderMode, $ = this._bufferService.cols, X = this._coreService.decPrivateModes.wraparound, C = this._coreService.modes.insertMode, D = this._curAttrData;
            let T = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._activeBuffer.x && w - y > 0 && T.getWidth(this._activeBuffer.x - 1) === 2 && T.setCellFromCodePoint(this._activeBuffer.x - 1, 0, 1, D.fg, D.bg, D.extended);
            for (let B = y; B < w; ++B) {
              if (L = S[B], I = this._unicodeService.wcwidth(L), L < 127 && F) {
                const z = F[String.fromCharCode(L)];
                z && (L = z.charCodeAt(0));
              }
              if (N && this._onA11yChar.fire((0, _.stringFromCodePoint)(L)), this._getCurrentLinkId() && this._oscLinkService.addLineToLink(this._getCurrentLinkId(), this._activeBuffer.ybase + this._activeBuffer.y), I || !this._activeBuffer.x) {
                if (this._activeBuffer.x + I - 1 >= $) {
                  if (X) {
                    for (; this._activeBuffer.x < $; ) T.setCellFromCodePoint(this._activeBuffer.x++, 0, 1, D.fg, D.bg, D.extended);
                    this._activeBuffer.x = 0, this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData(), !0)) : (this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = !0), T = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
                  } else if (this._activeBuffer.x = $ - 1, I === 2) continue;
                }
                if (C && (T.insertCells(this._activeBuffer.x, I, this._activeBuffer.getNullCell(D), D), T.getWidth($ - 1) === 2 && T.setCellFromCodePoint($ - 1, t.NULL_CELL_CODE, t.NULL_CELL_WIDTH, D.fg, D.bg, D.extended)), T.setCellFromCodePoint(this._activeBuffer.x++, L, I, D.fg, D.bg, D.extended), I > 0) for (; --I; ) T.setCellFromCodePoint(this._activeBuffer.x++, 0, 0, D.fg, D.bg, D.extended);
              } else T.getWidth(this._activeBuffer.x - 1) ? T.addCodepointToCell(this._activeBuffer.x - 1, L) : T.addCodepointToCell(this._activeBuffer.x - 2, L);
            }
            w - y > 0 && (T.loadCell(this._activeBuffer.x - 1, this._workCell), this._workCell.getWidth() === 2 || this._workCell.getCode() > 65535 ? this._parser.precedingCodepoint = 0 : this._workCell.isCombined() ? this._parser.precedingCodepoint = this._workCell.getChars().charCodeAt(0) : this._parser.precedingCodepoint = this._workCell.content), this._activeBuffer.x < $ && w - y > 0 && T.getWidth(this._activeBuffer.x) === 0 && !T.hasContent(this._activeBuffer.x) && T.setCellFromCodePoint(this._activeBuffer.x, 0, 1, D.fg, D.bg, D.extended), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
          }
          registerCsiHandler(S, y) {
            return S.final !== "t" || S.prefix || S.intermediates ? this._parser.registerCsiHandler(S, y) : this._parser.registerCsiHandler(S, ((w) => !x(w.params[0], this._optionsService.rawOptions.windowOptions) || y(w)));
          }
          registerDcsHandler(S, y) {
            return this._parser.registerDcsHandler(S, new d.DcsHandler(y));
          }
          registerEscHandler(S, y) {
            return this._parser.registerEscHandler(S, y);
          }
          registerOscHandler(S, y) {
            return this._parser.registerOscHandler(S, new v.OscHandler(y));
          }
          bell() {
            return this._onRequestBell.fire(), !0;
          }
          lineFeed() {
            return this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._optionsService.rawOptions.convertEol && (this._activeBuffer.x = 0), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows ? this._activeBuffer.y = this._bufferService.rows - 1 : this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = !1, this._activeBuffer.x >= this._bufferService.cols && this._activeBuffer.x--, this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._onLineFeed.fire(), !0;
          }
          carriageReturn() {
            return this._activeBuffer.x = 0, !0;
          }
          backspace() {
            var S;
            if (!this._coreService.decPrivateModes.reverseWraparound) return this._restrictCursor(), this._activeBuffer.x > 0 && this._activeBuffer.x--, !0;
            if (this._restrictCursor(this._bufferService.cols), this._activeBuffer.x > 0) this._activeBuffer.x--;
            else if (this._activeBuffer.x === 0 && this._activeBuffer.y > this._activeBuffer.scrollTop && this._activeBuffer.y <= this._activeBuffer.scrollBottom && (!((S = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)) === null || S === void 0) && S.isWrapped)) {
              this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = !1, this._activeBuffer.y--, this._activeBuffer.x = this._bufferService.cols - 1;
              const y = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
              y.hasWidth(this._activeBuffer.x) && !y.hasContent(this._activeBuffer.x) && this._activeBuffer.x--;
            }
            return this._restrictCursor(), !0;
          }
          tab() {
            if (this._activeBuffer.x >= this._bufferService.cols) return !0;
            const S = this._activeBuffer.x;
            return this._activeBuffer.x = this._activeBuffer.nextStop(), this._optionsService.rawOptions.screenReaderMode && this._onA11yTab.fire(this._activeBuffer.x - S), !0;
          }
          shiftOut() {
            return this._charsetService.setgLevel(1), !0;
          }
          shiftIn() {
            return this._charsetService.setgLevel(0), !0;
          }
          _restrictCursor(S = this._bufferService.cols - 1) {
            this._activeBuffer.x = Math.min(S, Math.max(0, this._activeBuffer.x)), this._activeBuffer.y = this._coreService.decPrivateModes.origin ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y)) : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y)), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
          }
          _setCursor(S, y) {
            this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._coreService.decPrivateModes.origin ? (this._activeBuffer.x = S, this._activeBuffer.y = this._activeBuffer.scrollTop + y) : (this._activeBuffer.x = S, this._activeBuffer.y = y), this._restrictCursor(), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
          }
          _moveCursor(S, y) {
            this._restrictCursor(), this._setCursor(this._activeBuffer.x + S, this._activeBuffer.y + y);
          }
          cursorUp(S) {
            const y = this._activeBuffer.y - this._activeBuffer.scrollTop;
            return y >= 0 ? this._moveCursor(0, -Math.min(y, S.params[0] || 1)) : this._moveCursor(0, -(S.params[0] || 1)), !0;
          }
          cursorDown(S) {
            const y = this._activeBuffer.scrollBottom - this._activeBuffer.y;
            return y >= 0 ? this._moveCursor(0, Math.min(y, S.params[0] || 1)) : this._moveCursor(0, S.params[0] || 1), !0;
          }
          cursorForward(S) {
            return this._moveCursor(S.params[0] || 1, 0), !0;
          }
          cursorBackward(S) {
            return this._moveCursor(-(S.params[0] || 1), 0), !0;
          }
          cursorNextLine(S) {
            return this.cursorDown(S), this._activeBuffer.x = 0, !0;
          }
          cursorPrecedingLine(S) {
            return this.cursorUp(S), this._activeBuffer.x = 0, !0;
          }
          cursorCharAbsolute(S) {
            return this._setCursor((S.params[0] || 1) - 1, this._activeBuffer.y), !0;
          }
          cursorPosition(S) {
            return this._setCursor(S.length >= 2 ? (S.params[1] || 1) - 1 : 0, (S.params[0] || 1) - 1), !0;
          }
          charPosAbsolute(S) {
            return this._setCursor((S.params[0] || 1) - 1, this._activeBuffer.y), !0;
          }
          hPositionRelative(S) {
            return this._moveCursor(S.params[0] || 1, 0), !0;
          }
          linePosAbsolute(S) {
            return this._setCursor(this._activeBuffer.x, (S.params[0] || 1) - 1), !0;
          }
          vPositionRelative(S) {
            return this._moveCursor(0, S.params[0] || 1), !0;
          }
          hVPosition(S) {
            return this.cursorPosition(S), !0;
          }
          tabClear(S) {
            const y = S.params[0];
            return y === 0 ? delete this._activeBuffer.tabs[this._activeBuffer.x] : y === 3 && (this._activeBuffer.tabs = {}), !0;
          }
          cursorForwardTab(S) {
            if (this._activeBuffer.x >= this._bufferService.cols) return !0;
            let y = S.params[0] || 1;
            for (; y--; ) this._activeBuffer.x = this._activeBuffer.nextStop();
            return !0;
          }
          cursorBackwardTab(S) {
            if (this._activeBuffer.x >= this._bufferService.cols) return !0;
            let y = S.params[0] || 1;
            for (; y--; ) this._activeBuffer.x = this._activeBuffer.prevStop();
            return !0;
          }
          selectProtected(S) {
            const y = S.params[0];
            return y === 1 && (this._curAttrData.bg |= 536870912), y !== 2 && y !== 0 || (this._curAttrData.bg &= -536870913), !0;
          }
          _eraseInBufferLine(S, y, w, L = !1, I = !1) {
            const F = this._activeBuffer.lines.get(this._activeBuffer.ybase + S);
            F.replaceCells(y, w, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData(), I), L && (F.isWrapped = !1);
          }
          _resetBufferLine(S, y = !1) {
            const w = this._activeBuffer.lines.get(this._activeBuffer.ybase + S);
            w && (w.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), y), this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + S), w.isWrapped = !1);
          }
          eraseInDisplay(S, y = !1) {
            let w;
            switch (this._restrictCursor(this._bufferService.cols), S.params[0]) {
              case 0:
                for (w = this._activeBuffer.y, this._dirtyRowTracker.markDirty(w), this._eraseInBufferLine(w++, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, y); w < this._bufferService.rows; w++) this._resetBufferLine(w, y);
                this._dirtyRowTracker.markDirty(w);
                break;
              case 1:
                for (w = this._activeBuffer.y, this._dirtyRowTracker.markDirty(w), this._eraseInBufferLine(w, 0, this._activeBuffer.x + 1, !0, y), this._activeBuffer.x + 1 >= this._bufferService.cols && (this._activeBuffer.lines.get(w + 1).isWrapped = !1); w--; ) this._resetBufferLine(w, y);
                this._dirtyRowTracker.markDirty(0);
                break;
              case 2:
                for (w = this._bufferService.rows, this._dirtyRowTracker.markDirty(w - 1); w--; ) this._resetBufferLine(w, y);
                this._dirtyRowTracker.markDirty(0);
                break;
              case 3:
                const L = this._activeBuffer.lines.length - this._bufferService.rows;
                L > 0 && (this._activeBuffer.lines.trimStart(L), this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - L, 0), this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - L, 0), this._onScroll.fire(0));
            }
            return !0;
          }
          eraseInLine(S, y = !1) {
            switch (this._restrictCursor(this._bufferService.cols), S.params[0]) {
              case 0:
                this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, y);
                break;
              case 1:
                this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, !1, y);
                break;
              case 2:
                this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, !0, y);
            }
            return this._dirtyRowTracker.markDirty(this._activeBuffer.y), !0;
          }
          insertLines(S) {
            this._restrictCursor();
            let y = S.params[0] || 1;
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
            const w = this._activeBuffer.ybase + this._activeBuffer.y, L = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, I = this._bufferService.rows - 1 + this._activeBuffer.ybase - L + 1;
            for (; y--; ) this._activeBuffer.lines.splice(I - 1, 1), this._activeBuffer.lines.splice(w, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, !0;
          }
          deleteLines(S) {
            this._restrictCursor();
            let y = S.params[0] || 1;
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
            const w = this._activeBuffer.ybase + this._activeBuffer.y;
            let L;
            for (L = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, L = this._bufferService.rows - 1 + this._activeBuffer.ybase - L; y--; ) this._activeBuffer.lines.splice(w, 1), this._activeBuffer.lines.splice(L, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, !0;
          }
          insertChars(S) {
            this._restrictCursor();
            const y = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            return y && (y.insertCells(this._activeBuffer.x, S.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), !0;
          }
          deleteChars(S) {
            this._restrictCursor();
            const y = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            return y && (y.deleteCells(this._activeBuffer.x, S.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), !0;
          }
          scrollUp(S) {
            let y = S.params[0] || 1;
            for (; y--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
          }
          scrollDown(S) {
            let y = S.params[0] || 1;
            for (; y--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(e.DEFAULT_ATTR_DATA));
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
          }
          scrollLeft(S) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
            const y = S.params[0] || 1;
            for (let w = this._activeBuffer.scrollTop; w <= this._activeBuffer.scrollBottom; ++w) {
              const L = this._activeBuffer.lines.get(this._activeBuffer.ybase + w);
              L.deleteCells(0, y, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), L.isWrapped = !1;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
          }
          scrollRight(S) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
            const y = S.params[0] || 1;
            for (let w = this._activeBuffer.scrollTop; w <= this._activeBuffer.scrollBottom; ++w) {
              const L = this._activeBuffer.lines.get(this._activeBuffer.ybase + w);
              L.insertCells(0, y, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), L.isWrapped = !1;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
          }
          insertColumns(S) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
            const y = S.params[0] || 1;
            for (let w = this._activeBuffer.scrollTop; w <= this._activeBuffer.scrollBottom; ++w) {
              const L = this._activeBuffer.lines.get(this._activeBuffer.ybase + w);
              L.insertCells(this._activeBuffer.x, y, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), L.isWrapped = !1;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
          }
          deleteColumns(S) {
            if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return !0;
            const y = S.params[0] || 1;
            for (let w = this._activeBuffer.scrollTop; w <= this._activeBuffer.scrollBottom; ++w) {
              const L = this._activeBuffer.lines.get(this._activeBuffer.ybase + w);
              L.deleteCells(this._activeBuffer.x, y, this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), L.isWrapped = !1;
            }
            return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), !0;
          }
          eraseChars(S) {
            this._restrictCursor();
            const y = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            return y && (y.replaceCells(this._activeBuffer.x, this._activeBuffer.x + (S.params[0] || 1), this._activeBuffer.getNullCell(this._eraseAttrData()), this._eraseAttrData()), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), !0;
          }
          repeatPrecedingCharacter(S) {
            if (!this._parser.precedingCodepoint) return !0;
            const y = S.params[0] || 1, w = new Uint32Array(y);
            for (let L = 0; L < y; ++L) w[L] = this._parser.precedingCodepoint;
            return this.print(w, 0, w.length), !0;
          }
          sendDeviceAttributesPrimary(S) {
            return S.params[0] > 0 || (this._is("xterm") || this._is("rxvt-unicode") || this._is("screen") ? this._coreService.triggerDataEvent(n.C0.ESC + "[?1;2c") : this._is("linux") && this._coreService.triggerDataEvent(n.C0.ESC + "[?6c")), !0;
          }
          sendDeviceAttributesSecondary(S) {
            return S.params[0] > 0 || (this._is("xterm") ? this._coreService.triggerDataEvent(n.C0.ESC + "[>0;276;0c") : this._is("rxvt-unicode") ? this._coreService.triggerDataEvent(n.C0.ESC + "[>85;95;0c") : this._is("linux") ? this._coreService.triggerDataEvent(S.params[0] + "c") : this._is("screen") && this._coreService.triggerDataEvent(n.C0.ESC + "[>83;40003;0c")), !0;
          }
          _is(S) {
            return (this._optionsService.rawOptions.termName + "").indexOf(S) === 0;
          }
          setMode(S) {
            for (let y = 0; y < S.length; y++) switch (S.params[y]) {
              case 4:
                this._coreService.modes.insertMode = !0;
                break;
              case 20:
                this._optionsService.options.convertEol = !0;
            }
            return !0;
          }
          setModePrivate(S) {
            for (let y = 0; y < S.length; y++) switch (S.params[y]) {
              case 1:
                this._coreService.decPrivateModes.applicationCursorKeys = !0;
                break;
              case 2:
                this._charsetService.setgCharset(0, u.DEFAULT_CHARSET), this._charsetService.setgCharset(1, u.DEFAULT_CHARSET), this._charsetService.setgCharset(2, u.DEFAULT_CHARSET), this._charsetService.setgCharset(3, u.DEFAULT_CHARSET);
                break;
              case 3:
                this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(132, this._bufferService.rows), this._onRequestReset.fire());
                break;
              case 6:
                this._coreService.decPrivateModes.origin = !0, this._setCursor(0, 0);
                break;
              case 7:
                this._coreService.decPrivateModes.wraparound = !0;
                break;
              case 12:
                this._optionsService.options.cursorBlink = !0;
                break;
              case 45:
                this._coreService.decPrivateModes.reverseWraparound = !0;
                break;
              case 66:
                this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = !0, this._onRequestSyncScrollBar.fire();
                break;
              case 9:
                this._coreMouseService.activeProtocol = "X10";
                break;
              case 1e3:
                this._coreMouseService.activeProtocol = "VT200";
                break;
              case 1002:
                this._coreMouseService.activeProtocol = "DRAG";
                break;
              case 1003:
                this._coreMouseService.activeProtocol = "ANY";
                break;
              case 1004:
                this._coreService.decPrivateModes.sendFocus = !0, this._onRequestSendFocus.fire();
                break;
              case 1005:
                this._logService.debug("DECSET 1005 not supported (see #2507)");
                break;
              case 1006:
                this._coreMouseService.activeEncoding = "SGR";
                break;
              case 1015:
                this._logService.debug("DECSET 1015 not supported (see #2507)");
                break;
              case 1016:
                this._coreMouseService.activeEncoding = "SGR_PIXELS";
                break;
              case 25:
                this._coreService.isCursorHidden = !1;
                break;
              case 1048:
                this.saveCursor();
                break;
              case 1049:
                this.saveCursor();
              case 47:
              case 1047:
                this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()), this._coreService.isCursorInitialized = !0, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
                break;
              case 2004:
                this._coreService.decPrivateModes.bracketedPasteMode = !0;
            }
            return !0;
          }
          resetMode(S) {
            for (let y = 0; y < S.length; y++) switch (S.params[y]) {
              case 4:
                this._coreService.modes.insertMode = !1;
                break;
              case 20:
                this._optionsService.options.convertEol = !1;
            }
            return !0;
          }
          resetModePrivate(S) {
            for (let y = 0; y < S.length; y++) switch (S.params[y]) {
              case 1:
                this._coreService.decPrivateModes.applicationCursorKeys = !1;
                break;
              case 3:
                this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(80, this._bufferService.rows), this._onRequestReset.fire());
                break;
              case 6:
                this._coreService.decPrivateModes.origin = !1, this._setCursor(0, 0);
                break;
              case 7:
                this._coreService.decPrivateModes.wraparound = !1;
                break;
              case 12:
                this._optionsService.options.cursorBlink = !1;
                break;
              case 45:
                this._coreService.decPrivateModes.reverseWraparound = !1;
                break;
              case 66:
                this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = !1, this._onRequestSyncScrollBar.fire();
                break;
              case 9:
              case 1e3:
              case 1002:
              case 1003:
                this._coreMouseService.activeProtocol = "NONE";
                break;
              case 1004:
                this._coreService.decPrivateModes.sendFocus = !1;
                break;
              case 1005:
                this._logService.debug("DECRST 1005 not supported (see #2507)");
                break;
              case 1006:
              case 1016:
                this._coreMouseService.activeEncoding = "DEFAULT";
                break;
              case 1015:
                this._logService.debug("DECRST 1015 not supported (see #2507)");
                break;
              case 25:
                this._coreService.isCursorHidden = !0;
                break;
              case 1048:
                this.restoreCursor();
                break;
              case 1049:
              case 47:
              case 1047:
                this._bufferService.buffers.activateNormalBuffer(), S.params[y] === 1049 && this.restoreCursor(), this._coreService.isCursorInitialized = !0, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
                break;
              case 2004:
                this._coreService.decPrivateModes.bracketedPasteMode = !1;
            }
            return !0;
          }
          requestMode(S, y) {
            const w = this._coreService.decPrivateModes, { activeProtocol: L, activeEncoding: I } = this._coreMouseService, F = this._coreService, { buffers: N, cols: $ } = this._bufferService, { active: X, alt: C } = N, D = this._optionsService.rawOptions, T = (G) => G ? 1 : 2, B = S.params[0];
            return z = B, W = y ? B === 2 ? 4 : B === 4 ? T(F.modes.insertMode) : B === 12 ? 3 : B === 20 ? T(D.convertEol) : 0 : B === 1 ? T(w.applicationCursorKeys) : B === 3 ? D.windowOptions.setWinLines ? $ === 80 ? 2 : $ === 132 ? 1 : 0 : 0 : B === 6 ? T(w.origin) : B === 7 ? T(w.wraparound) : B === 8 ? 3 : B === 9 ? T(L === "X10") : B === 12 ? T(D.cursorBlink) : B === 25 ? T(!F.isCursorHidden) : B === 45 ? T(w.reverseWraparound) : B === 66 ? T(w.applicationKeypad) : B === 67 ? 4 : B === 1e3 ? T(L === "VT200") : B === 1002 ? T(L === "DRAG") : B === 1003 ? T(L === "ANY") : B === 1004 ? T(w.sendFocus) : B === 1005 ? 4 : B === 1006 ? T(I === "SGR") : B === 1015 ? 4 : B === 1016 ? T(I === "SGR_PIXELS") : B === 1048 ? 1 : B === 47 || B === 1047 || B === 1049 ? T(X === C) : B === 2004 ? T(w.bracketedPasteMode) : 0, F.triggerDataEvent(`${n.C0.ESC}[${y ? "" : "?"}${z};${W}$y`), !0;
            var z, W;
          }
          _updateAttrColor(S, y, w, L, I) {
            return y === 2 ? (S |= 50331648, S &= -16777216, S |= o.AttributeData.fromColorRGB([
              w,
              L,
              I
            ])) : y === 5 && (S &= -50331904, S |= 33554432 | 255 & w), S;
          }
          _extractColor(S, y, w) {
            const L = [
              0,
              0,
              -1,
              0,
              0,
              0
            ];
            let I = 0, F = 0;
            do {
              if (L[F + I] = S.params[y + F], S.hasSubParams(y + F)) {
                const N = S.getSubParams(y + F);
                let $ = 0;
                do
                  L[1] === 5 && (I = 1), L[F + $ + 1 + I] = N[$];
                while (++$ < N.length && $ + F + 1 + I < L.length);
                break;
              }
              if (L[1] === 5 && F + I >= 2 || L[1] === 2 && F + I >= 5) break;
              L[1] && (I = 1);
            } while (++F + y < S.length && F + I < L.length);
            for (let N = 2; N < L.length; ++N) L[N] === -1 && (L[N] = 0);
            switch (L[0]) {
              case 38:
                w.fg = this._updateAttrColor(w.fg, L[1], L[3], L[4], L[5]);
                break;
              case 48:
                w.bg = this._updateAttrColor(w.bg, L[1], L[3], L[4], L[5]);
                break;
              case 58:
                w.extended = w.extended.clone(), w.extended.underlineColor = this._updateAttrColor(w.extended.underlineColor, L[1], L[3], L[4], L[5]);
            }
            return F;
          }
          _processUnderline(S, y) {
            y.extended = y.extended.clone(), (!~S || S > 5) && (S = 1), y.extended.underlineStyle = S, y.fg |= 268435456, S === 0 && (y.fg &= -268435457), y.updateExtended();
          }
          _processSGR0(S) {
            S.fg = e.DEFAULT_ATTR_DATA.fg, S.bg = e.DEFAULT_ATTR_DATA.bg, S.extended = S.extended.clone(), S.extended.underlineStyle = 0, S.extended.underlineColor &= -67108864, S.updateExtended();
          }
          charAttributes(S) {
            if (S.length === 1 && S.params[0] === 0) return this._processSGR0(this._curAttrData), !0;
            const y = S.length;
            let w;
            const L = this._curAttrData;
            for (let I = 0; I < y; I++) w = S.params[I], w >= 30 && w <= 37 ? (L.fg &= -50331904, L.fg |= 16777216 | w - 30) : w >= 40 && w <= 47 ? (L.bg &= -50331904, L.bg |= 16777216 | w - 40) : w >= 90 && w <= 97 ? (L.fg &= -50331904, L.fg |= 16777224 | w - 90) : w >= 100 && w <= 107 ? (L.bg &= -50331904, L.bg |= 16777224 | w - 100) : w === 0 ? this._processSGR0(L) : w === 1 ? L.fg |= 134217728 : w === 3 ? L.bg |= 67108864 : w === 4 ? (L.fg |= 268435456, this._processUnderline(S.hasSubParams(I) ? S.getSubParams(I)[0] : 1, L)) : w === 5 ? L.fg |= 536870912 : w === 7 ? L.fg |= 67108864 : w === 8 ? L.fg |= 1073741824 : w === 9 ? L.fg |= 2147483648 : w === 2 ? L.bg |= 134217728 : w === 21 ? this._processUnderline(2, L) : w === 22 ? (L.fg &= -134217729, L.bg &= -134217729) : w === 23 ? L.bg &= -67108865 : w === 24 ? (L.fg &= -268435457, this._processUnderline(0, L)) : w === 25 ? L.fg &= -536870913 : w === 27 ? L.fg &= -67108865 : w === 28 ? L.fg &= -1073741825 : w === 29 ? L.fg &= 2147483647 : w === 39 ? (L.fg &= -67108864, L.fg |= 16777215 & e.DEFAULT_ATTR_DATA.fg) : w === 49 ? (L.bg &= -67108864, L.bg |= 16777215 & e.DEFAULT_ATTR_DATA.bg) : w === 38 || w === 48 || w === 58 ? I += this._extractColor(S, I, L) : w === 53 ? L.bg |= 1073741824 : w === 55 ? L.bg &= -1073741825 : w === 59 ? (L.extended = L.extended.clone(), L.extended.underlineColor = -1, L.updateExtended()) : w === 100 ? (L.fg &= -67108864, L.fg |= 16777215 & e.DEFAULT_ATTR_DATA.fg, L.bg &= -67108864, L.bg |= 16777215 & e.DEFAULT_ATTR_DATA.bg) : this._logService.debug("Unknown SGR attribute: %d.", w);
            return !0;
          }
          deviceStatus(S) {
            switch (S.params[0]) {
              case 5:
                this._coreService.triggerDataEvent(`${n.C0.ESC}[0n`);
                break;
              case 6:
                const y = this._activeBuffer.y + 1, w = this._activeBuffer.x + 1;
                this._coreService.triggerDataEvent(`${n.C0.ESC}[${y};${w}R`);
            }
            return !0;
          }
          deviceStatusPrivate(S) {
            if (S.params[0] === 6) {
              const y = this._activeBuffer.y + 1, w = this._activeBuffer.x + 1;
              this._coreService.triggerDataEvent(`${n.C0.ESC}[?${y};${w}R`);
            }
            return !0;
          }
          softReset(S) {
            return this._coreService.isCursorHidden = !1, this._onRequestSyncScrollBar.fire(), this._activeBuffer.scrollTop = 0, this._activeBuffer.scrollBottom = this._bufferService.rows - 1, this._curAttrData = e.DEFAULT_ATTR_DATA.clone(), this._coreService.reset(), this._charsetService.reset(), this._activeBuffer.savedX = 0, this._activeBuffer.savedY = this._activeBuffer.ybase, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, this._coreService.decPrivateModes.origin = !1, !0;
          }
          setCursorStyle(S) {
            const y = S.params[0] || 1;
            switch (y) {
              case 1:
              case 2:
                this._optionsService.options.cursorStyle = "block";
                break;
              case 3:
              case 4:
                this._optionsService.options.cursorStyle = "underline";
                break;
              case 5:
              case 6:
                this._optionsService.options.cursorStyle = "bar";
            }
            const w = y % 2 == 1;
            return this._optionsService.options.cursorBlink = w, !0;
          }
          setScrollRegion(S) {
            const y = S.params[0] || 1;
            let w;
            return (S.length < 2 || (w = S.params[1]) > this._bufferService.rows || w === 0) && (w = this._bufferService.rows), w > y && (this._activeBuffer.scrollTop = y - 1, this._activeBuffer.scrollBottom = w - 1, this._setCursor(0, 0)), !0;
          }
          windowOptions(S) {
            if (!x(S.params[0], this._optionsService.rawOptions.windowOptions)) return !0;
            const y = S.length > 1 ? S.params[1] : 0;
            switch (S.params[0]) {
              case 14:
                y !== 2 && this._onRequestWindowsOptionsReport.fire(b.GET_WIN_SIZE_PIXELS);
                break;
              case 16:
                this._onRequestWindowsOptionsReport.fire(b.GET_CELL_SIZE_PIXELS);
                break;
              case 18:
                this._bufferService && this._coreService.triggerDataEvent(`${n.C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
                break;
              case 22:
                y !== 0 && y !== 2 || (this._windowTitleStack.push(this._windowTitle), this._windowTitleStack.length > 10 && this._windowTitleStack.shift()), y !== 0 && y !== 1 || (this._iconNameStack.push(this._iconName), this._iconNameStack.length > 10 && this._iconNameStack.shift());
                break;
              case 23:
                y !== 0 && y !== 2 || this._windowTitleStack.length && this.setTitle(this._windowTitleStack.pop()), y !== 0 && y !== 1 || this._iconNameStack.length && this.setIconName(this._iconNameStack.pop());
            }
            return !0;
          }
          saveCursor(S) {
            return this._activeBuffer.savedX = this._activeBuffer.x, this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, !0;
          }
          restoreCursor(S) {
            return this._activeBuffer.x = this._activeBuffer.savedX || 0, this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0), this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg, this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg, this._charsetService.charset = this._savedCharset, this._activeBuffer.savedCharset && (this._charsetService.charset = this._activeBuffer.savedCharset), this._restrictCursor(), !0;
          }
          setTitle(S) {
            return this._windowTitle = S, this._onTitleChange.fire(S), !0;
          }
          setIconName(S) {
            return this._iconName = S, !0;
          }
          setOrReportIndexedColor(S) {
            const y = [], w = S.split(";");
            for (; w.length > 1; ) {
              const L = w.shift(), I = w.shift();
              if (/^\d+$/.exec(L)) {
                const F = parseInt(L);
                if (P(F)) if (I === "?") y.push({
                  type: 0,
                  index: F
                });
                else {
                  const N = (0, h.parseColor)(I);
                  N && y.push({
                    type: 1,
                    index: F,
                    color: N
                  });
                }
              }
            }
            return y.length && this._onColor.fire(y), !0;
          }
          setHyperlink(S) {
            const y = S.split(";");
            return !(y.length < 2) && (y[1] ? this._createHyperlink(y[0], y[1]) : !y[0] && this._finishHyperlink());
          }
          _createHyperlink(S, y) {
            this._getCurrentLinkId() && this._finishHyperlink();
            const w = S.split(":");
            let L;
            const I = w.findIndex(((F) => F.startsWith("id=")));
            return I !== -1 && (L = w[I].slice(3) || void 0), this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = this._oscLinkService.registerLink({
              id: L,
              uri: y
            }), this._curAttrData.updateExtended(), !0;
          }
          _finishHyperlink() {
            return this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = 0, this._curAttrData.updateExtended(), !0;
          }
          _setOrReportSpecialColor(S, y) {
            const w = S.split(";");
            for (let L = 0; L < w.length && !(y >= this._specialColors.length); ++L, ++y) if (w[L] === "?") this._onColor.fire([{
              type: 0,
              index: this._specialColors[y]
            }]);
            else {
              const I = (0, h.parseColor)(w[L]);
              I && this._onColor.fire([{
                type: 1,
                index: this._specialColors[y],
                color: I
              }]);
            }
            return !0;
          }
          setOrReportFgColor(S) {
            return this._setOrReportSpecialColor(S, 0);
          }
          setOrReportBgColor(S) {
            return this._setOrReportSpecialColor(S, 1);
          }
          setOrReportCursorColor(S) {
            return this._setOrReportSpecialColor(S, 2);
          }
          restoreIndexedColor(S) {
            if (!S) return this._onColor.fire([{ type: 2 }]), !0;
            const y = [], w = S.split(";");
            for (let L = 0; L < w.length; ++L) if (/^\d+$/.exec(w[L])) {
              const I = parseInt(w[L]);
              P(I) && y.push({
                type: 2,
                index: I
              });
            }
            return y.length && this._onColor.fire(y), !0;
          }
          restoreFgColor(S) {
            return this._onColor.fire([{
              type: 2,
              index: 256
            }]), !0;
          }
          restoreBgColor(S) {
            return this._onColor.fire([{
              type: 2,
              index: 257
            }]), !0;
          }
          restoreCursorColor(S) {
            return this._onColor.fire([{
              type: 2,
              index: 258
            }]), !0;
          }
          nextLine() {
            return this._activeBuffer.x = 0, this.index(), !0;
          }
          keypadApplicationMode() {
            return this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = !0, this._onRequestSyncScrollBar.fire(), !0;
          }
          keypadNumericMode() {
            return this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = !1, this._onRequestSyncScrollBar.fire(), !0;
          }
          selectDefaultCharset() {
            return this._charsetService.setgLevel(0), this._charsetService.setgCharset(0, u.DEFAULT_CHARSET), !0;
          }
          selectCharset(S) {
            return S.length !== 2 ? (this.selectDefaultCharset(), !0) : (S[0] === "/" || this._charsetService.setgCharset(m[S[0]], u.CHARSETS[S[1]] || u.DEFAULT_CHARSET), !0);
          }
          index() {
            return this._restrictCursor(), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._restrictCursor(), !0;
          }
          tabSet() {
            return this._activeBuffer.tabs[this._activeBuffer.x] = !0, !0;
          }
          reverseIndex() {
            if (this._restrictCursor(), this._activeBuffer.y === this._activeBuffer.scrollTop) {
              const S = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
              this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, S, 1), this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData())), this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
            } else this._activeBuffer.y--, this._restrictCursor();
            return !0;
          }
          fullReset() {
            return this._parser.reset(), this._onRequestReset.fire(), !0;
          }
          reset() {
            this._curAttrData = e.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = e.DEFAULT_ATTR_DATA.clone();
          }
          _eraseAttrData() {
            return this._eraseAttrDataInternal.bg &= -67108864, this._eraseAttrDataInternal.bg |= 67108863 & this._curAttrData.bg, this._eraseAttrDataInternal;
          }
          setgLevel(S) {
            return this._charsetService.setgLevel(S), !0;
          }
          screenAlignmentPattern() {
            const S = new i.CellData();
            S.content = 4194373, S.fg = this._curAttrData.fg, S.bg = this._curAttrData.bg, this._setCursor(0, 0);
            for (let y = 0; y < this._bufferService.rows; ++y) {
              const w = this._activeBuffer.ybase + this._activeBuffer.y + y, L = this._activeBuffer.lines.get(w);
              L && (L.fill(S), L.isWrapped = !1);
            }
            return this._dirtyRowTracker.markAllDirty(), this._setCursor(0, 0), !0;
          }
          requestStatusString(S, y) {
            const w = this._bufferService.buffer, L = this._optionsService.rawOptions;
            return ((I) => (this._coreService.triggerDataEvent(`${n.C0.ESC}${I}${n.C0.ESC}\\`), !0))(S === '"q' ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q` : S === '"p' ? 'P1$r61;1"p' : S === "r" ? `P1$r${w.scrollTop + 1};${w.scrollBottom + 1}r` : S === "m" ? "P1$r0m" : S === " q" ? `P1$r${{
              block: 2,
              underline: 4,
              bar: 6
            }[L.cursorStyle] - (L.cursorBlink ? 1 : 0)} q` : "P0$r");
          }
          markRangeDirty(S, y) {
            this._dirtyRowTracker.markRangeDirty(S, y);
          }
        }
        r.InputHandler = R;
        let H = class {
          constructor(M) {
            this._bufferService = M, this.clearRange();
          }
          clearRange() {
            this.start = this._bufferService.buffer.y, this.end = this._bufferService.buffer.y;
          }
          markDirty(M) {
            M < this.start ? this.start = M : M > this.end && (this.end = M);
          }
          markRangeDirty(M, S) {
            M > S && (k = M, M = S, S = k), M < this.start && (this.start = M), S > this.end && (this.end = S);
          }
          markAllDirty() {
            this.markRangeDirty(0, this._bufferService.rows - 1);
          }
        };
        function P(M) {
          return 0 <= M && M < 256;
        }
        H = c([f(0, l.IBufferService)], H);
      },
      844: (O, r) => {
        function a(c) {
          for (const f of c) f.dispose();
          c.length = 0;
        }
        Object.defineProperty(r, "__esModule", { value: !0 }), r.getDisposeArrayDisposable = r.disposeArray = r.toDisposable = r.MutableDisposable = r.Disposable = void 0, r.Disposable = class {
          constructor() {
            this._disposables = [], this._isDisposed = !1;
          }
          dispose() {
            this._isDisposed = !0;
            for (const c of this._disposables) c.dispose();
            this._disposables.length = 0;
          }
          register(c) {
            return this._disposables.push(c), c;
          }
          unregister(c) {
            const f = this._disposables.indexOf(c);
            f !== -1 && this._disposables.splice(f, 1);
          }
        }, r.MutableDisposable = class {
          constructor() {
            this._isDisposed = !1;
          }
          get value() {
            return this._isDisposed ? void 0 : this._value;
          }
          set value(c) {
            var f;
            this._isDisposed || c === this._value || ((f = this._value) === null || f === void 0 || f.dispose(), this._value = c);
          }
          clear() {
            this.value = void 0;
          }
          dispose() {
            var c;
            this._isDisposed = !0, (c = this._value) === null || c === void 0 || c.dispose(), this._value = void 0;
          }
        }, r.toDisposable = function(c) {
          return { dispose: c };
        }, r.disposeArray = a, r.getDisposeArrayDisposable = function(c) {
          return { dispose: () => a(c) };
        };
      },
      1505: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.FourKeyMap = r.TwoKeyMap = void 0;
        class a {
          constructor() {
            this._data = {};
          }
          set(f, n, u) {
            this._data[f] || (this._data[f] = {}), this._data[f][n] = u;
          }
          get(f, n) {
            return this._data[f] ? this._data[f][n] : void 0;
          }
          clear() {
            this._data = {};
          }
        }
        r.TwoKeyMap = a, r.FourKeyMap = class {
          constructor() {
            this._data = new a();
          }
          set(c, f, n, u, p) {
            this._data.get(c, f) || this._data.set(c, f, new a()), this._data.get(c, f).set(n, u, p);
          }
          get(c, f, n, u) {
            var p;
            return (p = this._data.get(c, f)) === null || p === void 0 ? void 0 : p.get(n, u);
          }
          clear() {
            this._data.clear();
          }
        };
      },
      6114: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.isChromeOS = r.isLinux = r.isWindows = r.isIphone = r.isIpad = r.isMac = r.getSafariVersion = r.isSafari = r.isLegacyEdge = r.isFirefox = r.isNode = void 0, r.isNode = typeof navigator > "u";
        const a = r.isNode ? "node" : navigator.userAgent, c = r.isNode ? "node" : navigator.platform;
        r.isFirefox = a.includes("Firefox"), r.isLegacyEdge = a.includes("Edge"), r.isSafari = /^((?!chrome|android).)*safari/i.test(a), r.getSafariVersion = function() {
          if (!r.isSafari) return 0;
          const f = a.match(/Version\/(\d+)/);
          return f === null || f.length < 2 ? 0 : parseInt(f[1]);
        }, r.isMac = [
          "Macintosh",
          "MacIntel",
          "MacPPC",
          "Mac68K"
        ].includes(c), r.isIpad = c === "iPad", r.isIphone = c === "iPhone", r.isWindows = [
          "Windows",
          "Win16",
          "Win32",
          "WinCE"
        ].includes(c), r.isLinux = c.indexOf("Linux") >= 0, r.isChromeOS = /\bCrOS\b/.test(a);
      },
      6106: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.SortedList = void 0;
        let a = 0;
        r.SortedList = class {
          constructor(c) {
            this._getKey = c, this._array = [];
          }
          clear() {
            this._array.length = 0;
          }
          insert(c) {
            this._array.length !== 0 ? (a = this._search(this._getKey(c)), this._array.splice(a, 0, c)) : this._array.push(c);
          }
          delete(c) {
            if (this._array.length === 0) return !1;
            const f = this._getKey(c);
            if (f === void 0 || (a = this._search(f), a === -1) || this._getKey(this._array[a]) !== f) return !1;
            do
              if (this._array[a] === c) return this._array.splice(a, 1), !0;
            while (++a < this._array.length && this._getKey(this._array[a]) === f);
            return !1;
          }
          *getKeyIterator(c) {
            if (this._array.length !== 0 && (a = this._search(c), !(a < 0 || a >= this._array.length) && this._getKey(this._array[a]) === c)) do
              yield this._array[a];
            while (++a < this._array.length && this._getKey(this._array[a]) === c);
          }
          forEachByKey(c, f) {
            if (this._array.length !== 0 && (a = this._search(c), !(a < 0 || a >= this._array.length) && this._getKey(this._array[a]) === c)) do
              f(this._array[a]);
            while (++a < this._array.length && this._getKey(this._array[a]) === c);
          }
          values() {
            return [...this._array].values();
          }
          _search(c) {
            let f = 0, n = this._array.length - 1;
            for (; n >= f; ) {
              let u = f + n >> 1;
              const p = this._getKey(this._array[u]);
              if (p > c) n = u - 1;
              else {
                if (!(p < c)) {
                  for (; u > 0 && this._getKey(this._array[u - 1]) === c; ) u--;
                  return u;
                }
                f = u + 1;
              }
            }
            return f;
          }
        };
      },
      7226: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.DebouncedIdleTask = r.IdleTaskQueue = r.PriorityTaskQueue = void 0;
        const c = a(6114);
        class f {
          constructor() {
            this._tasks = [], this._i = 0;
          }
          enqueue(p) {
            this._tasks.push(p), this._start();
          }
          flush() {
            for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
            this.clear();
          }
          clear() {
            this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = void 0), this._i = 0, this._tasks.length = 0;
          }
          _start() {
            this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
          }
          _process(p) {
            this._idleCallback = void 0;
            let g = 0, _ = 0, e = p.timeRemaining(), s = 0;
            for (; this._i < this._tasks.length; ) {
              if (g = Date.now(), this._tasks[this._i]() || this._i++, g = Math.max(1, Date.now() - g), _ = Math.max(g, _), s = p.timeRemaining(), 1.5 * _ > s) return e - g < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(e - g))}ms`), void this._start();
              e = s;
            }
            this.clear();
          }
        }
        class n extends f {
          _requestCallback(p) {
            return setTimeout((() => p(this._createDeadline(16))));
          }
          _cancelCallback(p) {
            clearTimeout(p);
          }
          _createDeadline(p) {
            const g = Date.now() + p;
            return { timeRemaining: () => Math.max(0, g - Date.now()) };
          }
        }
        r.PriorityTaskQueue = n, r.IdleTaskQueue = !c.isNode && "requestIdleCallback" in window ? class extends f {
          _requestCallback(u) {
            return requestIdleCallback(u);
          }
          _cancelCallback(u) {
            cancelIdleCallback(u);
          }
        } : n, r.DebouncedIdleTask = class {
          constructor() {
            this._queue = new r.IdleTaskQueue();
          }
          set(u) {
            this._queue.clear(), this._queue.enqueue(u);
          }
          flush() {
            this._queue.flush();
          }
        };
      },
      9282: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.updateWindowsModeWrappedState = void 0;
        const c = a(643);
        r.updateWindowsModeWrappedState = function(f) {
          const n = f.buffer.lines.get(f.buffer.ybase + f.buffer.y - 1), u = n?.get(f.cols - 1), p = f.buffer.lines.get(f.buffer.ybase + f.buffer.y);
          p && u && (p.isWrapped = u[c.CHAR_DATA_CODE_INDEX] !== c.NULL_CELL_CODE && u[c.CHAR_DATA_CODE_INDEX] !== c.WHITESPACE_CELL_CODE);
        };
      },
      3734: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.ExtendedAttrs = r.AttributeData = void 0;
        class a {
          constructor() {
            this.fg = 0, this.bg = 0, this.extended = new c();
          }
          static toColorRGB(n) {
            return [
              n >>> 16 & 255,
              n >>> 8 & 255,
              255 & n
            ];
          }
          static fromColorRGB(n) {
            return (255 & n[0]) << 16 | (255 & n[1]) << 8 | 255 & n[2];
          }
          clone() {
            const n = new a();
            return n.fg = this.fg, n.bg = this.bg, n.extended = this.extended.clone(), n;
          }
          isInverse() {
            return 67108864 & this.fg;
          }
          isBold() {
            return 134217728 & this.fg;
          }
          isUnderline() {
            return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0 ? 1 : 268435456 & this.fg;
          }
          isBlink() {
            return 536870912 & this.fg;
          }
          isInvisible() {
            return 1073741824 & this.fg;
          }
          isItalic() {
            return 67108864 & this.bg;
          }
          isDim() {
            return 134217728 & this.bg;
          }
          isStrikethrough() {
            return 2147483648 & this.fg;
          }
          isProtected() {
            return 536870912 & this.bg;
          }
          isOverline() {
            return 1073741824 & this.bg;
          }
          getFgColorMode() {
            return 50331648 & this.fg;
          }
          getBgColorMode() {
            return 50331648 & this.bg;
          }
          isFgRGB() {
            return (50331648 & this.fg) == 50331648;
          }
          isBgRGB() {
            return (50331648 & this.bg) == 50331648;
          }
          isFgPalette() {
            return (50331648 & this.fg) == 16777216 || (50331648 & this.fg) == 33554432;
          }
          isBgPalette() {
            return (50331648 & this.bg) == 16777216 || (50331648 & this.bg) == 33554432;
          }
          isFgDefault() {
            return (50331648 & this.fg) == 0;
          }
          isBgDefault() {
            return (50331648 & this.bg) == 0;
          }
          isAttributeDefault() {
            return this.fg === 0 && this.bg === 0;
          }
          getFgColor() {
            switch (50331648 & this.fg) {
              case 16777216:
              case 33554432:
                return 255 & this.fg;
              case 50331648:
                return 16777215 & this.fg;
              default:
                return -1;
            }
          }
          getBgColor() {
            switch (50331648 & this.bg) {
              case 16777216:
              case 33554432:
                return 255 & this.bg;
              case 50331648:
                return 16777215 & this.bg;
              default:
                return -1;
            }
          }
          hasExtendedAttrs() {
            return 268435456 & this.bg;
          }
          updateExtended() {
            this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
          }
          getUnderlineColor() {
            if (268435456 & this.bg && ~this.extended.underlineColor) switch (50331648 & this.extended.underlineColor) {
              case 16777216:
              case 33554432:
                return 255 & this.extended.underlineColor;
              case 50331648:
                return 16777215 & this.extended.underlineColor;
              default:
                return this.getFgColor();
            }
            return this.getFgColor();
          }
          getUnderlineColorMode() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
          }
          isUnderlineColorRGB() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 50331648 : this.isFgRGB();
          }
          isUnderlineColorPalette() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 16777216 || (50331648 & this.extended.underlineColor) == 33554432 : this.isFgPalette();
          }
          isUnderlineColorDefault() {
            return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 0 : this.isFgDefault();
          }
          getUnderlineStyle() {
            return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
          }
        }
        r.AttributeData = a;
        class c {
          get ext() {
            return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
          }
          set ext(n) {
            this._ext = n;
          }
          get underlineStyle() {
            return this._urlId ? 5 : (469762048 & this._ext) >> 26;
          }
          set underlineStyle(n) {
            this._ext &= -469762049, this._ext |= n << 26 & 469762048;
          }
          get underlineColor() {
            return 67108863 & this._ext;
          }
          set underlineColor(n) {
            this._ext &= -67108864, this._ext |= 67108863 & n;
          }
          get urlId() {
            return this._urlId;
          }
          set urlId(n) {
            this._urlId = n;
          }
          constructor(n = 0, u = 0) {
            this._ext = 0, this._urlId = 0, this._ext = n, this._urlId = u;
          }
          clone() {
            return new c(this._ext, this._urlId);
          }
          isEmpty() {
            return this.underlineStyle === 0 && this._urlId === 0;
          }
        }
        r.ExtendedAttrs = c;
      },
      9092: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Buffer = r.MAX_BUFFER_SIZE = void 0;
        const c = a(6349), f = a(7226), n = a(3734), u = a(8437), p = a(4634), g = a(511), _ = a(643), e = a(4863), s = a(7116);
        r.MAX_BUFFER_SIZE = 4294967295, r.Buffer = class {
          constructor(t, i, o) {
            this._hasScrollback = t, this._optionsService = i, this._bufferService = o, this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.tabs = {}, this.savedY = 0, this.savedX = 0, this.savedCurAttrData = u.DEFAULT_ATTR_DATA.clone(), this.savedCharset = s.DEFAULT_CHARSET, this.markers = [], this._nullCell = g.CellData.fromCharData([
              0,
              _.NULL_CELL_CHAR,
              _.NULL_CELL_WIDTH,
              _.NULL_CELL_CODE
            ]), this._whitespaceCell = g.CellData.fromCharData([
              0,
              _.WHITESPACE_CELL_CHAR,
              _.WHITESPACE_CELL_WIDTH,
              _.WHITESPACE_CELL_CODE
            ]), this._isClearing = !1, this._memoryCleanupQueue = new f.IdleTaskQueue(), this._memoryCleanupPosition = 0, this._cols = this._bufferService.cols, this._rows = this._bufferService.rows, this.lines = new c.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
          }
          getNullCell(t) {
            return t ? (this._nullCell.fg = t.fg, this._nullCell.bg = t.bg, this._nullCell.extended = t.extended) : (this._nullCell.fg = 0, this._nullCell.bg = 0, this._nullCell.extended = new n.ExtendedAttrs()), this._nullCell;
          }
          getWhitespaceCell(t) {
            return t ? (this._whitespaceCell.fg = t.fg, this._whitespaceCell.bg = t.bg, this._whitespaceCell.extended = t.extended) : (this._whitespaceCell.fg = 0, this._whitespaceCell.bg = 0, this._whitespaceCell.extended = new n.ExtendedAttrs()), this._whitespaceCell;
          }
          getBlankLine(t, i) {
            return new u.BufferLine(this._bufferService.cols, this.getNullCell(t), i);
          }
          get hasScrollback() {
            return this._hasScrollback && this.lines.maxLength > this._rows;
          }
          get isCursorInViewport() {
            const t = this.ybase + this.y - this.ydisp;
            return t >= 0 && t < this._rows;
          }
          _getCorrectBufferLength(t) {
            if (!this._hasScrollback) return t;
            const i = t + this._optionsService.rawOptions.scrollback;
            return i > r.MAX_BUFFER_SIZE ? r.MAX_BUFFER_SIZE : i;
          }
          fillViewportRows(t) {
            if (this.lines.length === 0) {
              t === void 0 && (t = u.DEFAULT_ATTR_DATA);
              let i = this._rows;
              for (; i--; ) this.lines.push(this.getBlankLine(t));
            }
          }
          clear() {
            this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.lines = new c.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
          }
          resize(t, i) {
            const o = this.getNullCell(u.DEFAULT_ATTR_DATA);
            let l = 0;
            const v = this._getCorrectBufferLength(i);
            if (v > this.lines.maxLength && (this.lines.maxLength = v), this.lines.length > 0) {
              if (this._cols < t) for (let h = 0; h < this.lines.length; h++) l += +this.lines.get(h).resize(t, o);
              let d = 0;
              if (this._rows < i) for (let h = this._rows; h < i; h++) this.lines.length < i + this.ybase && (this._optionsService.rawOptions.windowsMode || this._optionsService.rawOptions.windowsPty.backend !== void 0 || this._optionsService.rawOptions.windowsPty.buildNumber !== void 0 ? this.lines.push(new u.BufferLine(t, o)) : this.ybase > 0 && this.lines.length <= this.ybase + this.y + d + 1 ? (this.ybase--, d++, this.ydisp > 0 && this.ydisp--) : this.lines.push(new u.BufferLine(t, o)));
              else for (let h = this._rows; h > i; h--) this.lines.length > i + this.ybase && (this.lines.length > this.ybase + this.y + 1 ? this.lines.pop() : (this.ybase++, this.ydisp++));
              if (v < this.lines.maxLength) {
                const h = this.lines.length - v;
                h > 0 && (this.lines.trimStart(h), this.ybase = Math.max(this.ybase - h, 0), this.ydisp = Math.max(this.ydisp - h, 0), this.savedY = Math.max(this.savedY - h, 0)), this.lines.maxLength = v;
              }
              this.x = Math.min(this.x, t - 1), this.y = Math.min(this.y, i - 1), d && (this.y += d), this.savedX = Math.min(this.savedX, t - 1), this.scrollTop = 0;
            }
            if (this.scrollBottom = i - 1, this._isReflowEnabled && (this._reflow(t, i), this._cols > t)) for (let d = 0; d < this.lines.length; d++) l += +this.lines.get(d).resize(t, o);
            this._cols = t, this._rows = i, this._memoryCleanupQueue.clear(), l > 0.1 * this.lines.length && (this._memoryCleanupPosition = 0, this._memoryCleanupQueue.enqueue((() => this._batchedMemoryCleanup())));
          }
          _batchedMemoryCleanup() {
            let t = !0;
            this._memoryCleanupPosition >= this.lines.length && (this._memoryCleanupPosition = 0, t = !1);
            let i = 0;
            for (; this._memoryCleanupPosition < this.lines.length; ) if (i += this.lines.get(this._memoryCleanupPosition++).cleanupMemory(), i > 100) return !0;
            return t;
          }
          get _isReflowEnabled() {
            const t = this._optionsService.rawOptions.windowsPty;
            return t && t.buildNumber ? this._hasScrollback && t.backend === "conpty" && t.buildNumber >= 21376 : this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
          }
          _reflow(t, i) {
            this._cols !== t && (t > this._cols ? this._reflowLarger(t, i) : this._reflowSmaller(t, i));
          }
          _reflowLarger(t, i) {
            const o = (0, p.reflowLargerGetLinesToRemove)(this.lines, this._cols, t, this.ybase + this.y, this.getNullCell(u.DEFAULT_ATTR_DATA));
            if (o.length > 0) {
              const l = (0, p.reflowLargerCreateNewLayout)(this.lines, o);
              (0, p.reflowLargerApplyNewLayout)(this.lines, l.layout), this._reflowLargerAdjustViewport(t, i, l.countRemoved);
            }
          }
          _reflowLargerAdjustViewport(t, i, o) {
            const l = this.getNullCell(u.DEFAULT_ATTR_DATA);
            let v = o;
            for (; v-- > 0; ) this.ybase === 0 ? (this.y > 0 && this.y--, this.lines.length < i && this.lines.push(new u.BufferLine(t, l))) : (this.ydisp === this.ybase && this.ydisp--, this.ybase--);
            this.savedY = Math.max(this.savedY - o, 0);
          }
          _reflowSmaller(t, i) {
            const o = this.getNullCell(u.DEFAULT_ATTR_DATA), l = [];
            let v = 0;
            for (let d = this.lines.length - 1; d >= 0; d--) {
              let h = this.lines.get(d);
              if (!h || !h.isWrapped && h.getTrimmedLength() <= t) continue;
              const m = [h];
              for (; h.isWrapped && d > 0; ) h = this.lines.get(--d), m.unshift(h);
              const E = this.ybase + this.y;
              if (E >= d && E < d + m.length) continue;
              const x = m[m.length - 1].getTrimmedLength(), b = (0, p.reflowSmallerGetNewLineLengths)(m, this._cols, t), k = b.length - m.length;
              let R;
              R = this.ybase === 0 && this.y !== this.lines.length - 1 ? Math.max(0, this.y - this.lines.maxLength + k) : Math.max(0, this.lines.length - this.lines.maxLength + k);
              const H = [];
              for (let L = 0; L < k; L++) {
                const I = this.getBlankLine(u.DEFAULT_ATTR_DATA, !0);
                H.push(I);
              }
              H.length > 0 && (l.push({
                start: d + m.length + v,
                newLines: H
              }), v += H.length), m.push(...H);
              let P = b.length - 1, M = b[P];
              M === 0 && (P--, M = b[P]);
              let S = m.length - k - 1, y = x;
              for (; S >= 0; ) {
                const L = Math.min(y, M);
                if (m[P] === void 0) break;
                if (m[P].copyCellsFrom(m[S], y - L, M - L, L, !0), M -= L, M === 0 && (P--, M = b[P]), y -= L, y === 0) {
                  S--;
                  const I = Math.max(S, 0);
                  y = (0, p.getWrappedLineTrimmedLength)(m, I, this._cols);
                }
              }
              for (let L = 0; L < m.length; L++) b[L] < t && m[L].setCell(b[L], o);
              let w = k - R;
              for (; w-- > 0; ) this.ybase === 0 ? this.y < i - 1 ? (this.y++, this.lines.pop()) : (this.ybase++, this.ydisp++) : this.ybase < Math.min(this.lines.maxLength, this.lines.length + v) - i && (this.ybase === this.ydisp && this.ydisp++, this.ybase++);
              this.savedY = Math.min(this.savedY + k, this.ybase + i - 1);
            }
            if (l.length > 0) {
              const d = [], h = [];
              for (let P = 0; P < this.lines.length; P++) h.push(this.lines.get(P));
              const m = this.lines.length;
              let E = m - 1, x = 0, b = l[x];
              this.lines.length = Math.min(this.lines.maxLength, this.lines.length + v);
              let k = 0;
              for (let P = Math.min(this.lines.maxLength - 1, m + v - 1); P >= 0; P--) if (b && b.start > E + k) {
                for (let M = b.newLines.length - 1; M >= 0; M--) this.lines.set(P--, b.newLines[M]);
                P++, d.push({
                  index: E + 1,
                  amount: b.newLines.length
                }), k += b.newLines.length, b = l[++x];
              } else this.lines.set(P, h[E--]);
              let R = 0;
              for (let P = d.length - 1; P >= 0; P--) d[P].index += R, this.lines.onInsertEmitter.fire(d[P]), R += d[P].amount;
              const H = Math.max(0, m + v - this.lines.maxLength);
              H > 0 && this.lines.onTrimEmitter.fire(H);
            }
          }
          translateBufferLineToString(t, i, o = 0, l) {
            const v = this.lines.get(t);
            return v ? v.translateToString(i, o, l) : "";
          }
          getWrappedRangeForLine(t) {
            let i = t, o = t;
            for (; i > 0 && this.lines.get(i).isWrapped; ) i--;
            for (; o + 1 < this.lines.length && this.lines.get(o + 1).isWrapped; ) o++;
            return {
              first: i,
              last: o
            };
          }
          setupTabStops(t) {
            for (t != null ? this.tabs[t] || (t = this.prevStop(t)) : (this.tabs = {}, t = 0); t < this._cols; t += this._optionsService.rawOptions.tabStopWidth) this.tabs[t] = !0;
          }
          prevStop(t) {
            for (t ?? (t = this.x); !this.tabs[--t] && t > 0; ) ;
            return t >= this._cols ? this._cols - 1 : t < 0 ? 0 : t;
          }
          nextStop(t) {
            for (t ?? (t = this.x); !this.tabs[++t] && t < this._cols; ) ;
            return t >= this._cols ? this._cols - 1 : t < 0 ? 0 : t;
          }
          clearMarkers(t) {
            this._isClearing = !0;
            for (let i = 0; i < this.markers.length; i++) this.markers[i].line === t && (this.markers[i].dispose(), this.markers.splice(i--, 1));
            this._isClearing = !1;
          }
          clearAllMarkers() {
            this._isClearing = !0;
            for (let t = 0; t < this.markers.length; t++) this.markers[t].dispose(), this.markers.splice(t--, 1);
            this._isClearing = !1;
          }
          addMarker(t) {
            const i = new e.Marker(t);
            return this.markers.push(i), i.register(this.lines.onTrim(((o) => {
              i.line -= o, i.line < 0 && i.dispose();
            }))), i.register(this.lines.onInsert(((o) => {
              i.line >= o.index && (i.line += o.amount);
            }))), i.register(this.lines.onDelete(((o) => {
              i.line >= o.index && i.line < o.index + o.amount && i.dispose(), i.line > o.index && (i.line -= o.amount);
            }))), i.register(i.onDispose((() => this._removeMarker(i)))), i;
          }
          _removeMarker(t) {
            this._isClearing || this.markers.splice(this.markers.indexOf(t), 1);
          }
        };
      },
      8437: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferLine = r.DEFAULT_ATTR_DATA = void 0;
        const c = a(3734), f = a(511), n = a(643), u = a(482);
        r.DEFAULT_ATTR_DATA = Object.freeze(new c.AttributeData());
        let p = 0;
        class g {
          constructor(e, s, t = !1) {
            this.isWrapped = t, this._combined = {}, this._extendedAttrs = {}, this._data = new Uint32Array(3 * e);
            const i = s || f.CellData.fromCharData([
              0,
              n.NULL_CELL_CHAR,
              n.NULL_CELL_WIDTH,
              n.NULL_CELL_CODE
            ]);
            for (let o = 0; o < e; ++o) this.setCell(o, i);
            this.length = e;
          }
          get(e) {
            const s = this._data[3 * e + 0], t = 2097151 & s;
            return [
              this._data[3 * e + 1],
              2097152 & s ? this._combined[e] : t ? (0, u.stringFromCodePoint)(t) : "",
              s >> 22,
              2097152 & s ? this._combined[e].charCodeAt(this._combined[e].length - 1) : t
            ];
          }
          set(e, s) {
            this._data[3 * e + 1] = s[n.CHAR_DATA_ATTR_INDEX], s[n.CHAR_DATA_CHAR_INDEX].length > 1 ? (this._combined[e] = s[1], this._data[3 * e + 0] = 2097152 | e | s[n.CHAR_DATA_WIDTH_INDEX] << 22) : this._data[3 * e + 0] = s[n.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | s[n.CHAR_DATA_WIDTH_INDEX] << 22;
          }
          getWidth(e) {
            return this._data[3 * e + 0] >> 22;
          }
          hasWidth(e) {
            return 12582912 & this._data[3 * e + 0];
          }
          getFg(e) {
            return this._data[3 * e + 1];
          }
          getBg(e) {
            return this._data[3 * e + 2];
          }
          hasContent(e) {
            return 4194303 & this._data[3 * e + 0];
          }
          getCodePoint(e) {
            const s = this._data[3 * e + 0];
            return 2097152 & s ? this._combined[e].charCodeAt(this._combined[e].length - 1) : 2097151 & s;
          }
          isCombined(e) {
            return 2097152 & this._data[3 * e + 0];
          }
          getString(e) {
            const s = this._data[3 * e + 0];
            return 2097152 & s ? this._combined[e] : 2097151 & s ? (0, u.stringFromCodePoint)(2097151 & s) : "";
          }
          isProtected(e) {
            return 536870912 & this._data[3 * e + 2];
          }
          loadCell(e, s) {
            return p = 3 * e, s.content = this._data[p + 0], s.fg = this._data[p + 1], s.bg = this._data[p + 2], 2097152 & s.content && (s.combinedData = this._combined[e]), 268435456 & s.bg && (s.extended = this._extendedAttrs[e]), s;
          }
          setCell(e, s) {
            2097152 & s.content && (this._combined[e] = s.combinedData), 268435456 & s.bg && (this._extendedAttrs[e] = s.extended), this._data[3 * e + 0] = s.content, this._data[3 * e + 1] = s.fg, this._data[3 * e + 2] = s.bg;
          }
          setCellFromCodePoint(e, s, t, i, o, l) {
            268435456 & o && (this._extendedAttrs[e] = l), this._data[3 * e + 0] = s | t << 22, this._data[3 * e + 1] = i, this._data[3 * e + 2] = o;
          }
          addCodepointToCell(e, s) {
            let t = this._data[3 * e + 0];
            2097152 & t ? this._combined[e] += (0, u.stringFromCodePoint)(s) : (2097151 & t ? (this._combined[e] = (0, u.stringFromCodePoint)(2097151 & t) + (0, u.stringFromCodePoint)(s), t &= -2097152, t |= 2097152) : t = s | 4194304, this._data[3 * e + 0] = t);
          }
          insertCells(e, s, t, i) {
            if ((e %= this.length) && this.getWidth(e - 1) === 2 && this.setCellFromCodePoint(e - 1, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs()), s < this.length - e) {
              const o = new f.CellData();
              for (let l = this.length - e - s - 1; l >= 0; --l) this.setCell(e + s + l, this.loadCell(e + l, o));
              for (let l = 0; l < s; ++l) this.setCell(e + l, t);
            } else for (let o = e; o < this.length; ++o) this.setCell(o, t);
            this.getWidth(this.length - 1) === 2 && this.setCellFromCodePoint(this.length - 1, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs());
          }
          deleteCells(e, s, t, i) {
            if (e %= this.length, s < this.length - e) {
              const o = new f.CellData();
              for (let l = 0; l < this.length - e - s; ++l) this.setCell(e + l, this.loadCell(e + s + l, o));
              for (let l = this.length - s; l < this.length; ++l) this.setCell(l, t);
            } else for (let o = e; o < this.length; ++o) this.setCell(o, t);
            e && this.getWidth(e - 1) === 2 && this.setCellFromCodePoint(e - 1, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs()), this.getWidth(e) !== 0 || this.hasContent(e) || this.setCellFromCodePoint(e, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs());
          }
          replaceCells(e, s, t, i, o = !1) {
            if (o) for (e && this.getWidth(e - 1) === 2 && !this.isProtected(e - 1) && this.setCellFromCodePoint(e - 1, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs()), s < this.length && this.getWidth(s - 1) === 2 && !this.isProtected(s) && this.setCellFromCodePoint(s, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs()); e < s && e < this.length; ) this.isProtected(e) || this.setCell(e, t), e++;
            else for (e && this.getWidth(e - 1) === 2 && this.setCellFromCodePoint(e - 1, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs()), s < this.length && this.getWidth(s - 1) === 2 && this.setCellFromCodePoint(s, 0, 1, i?.fg || 0, i?.bg || 0, i?.extended || new c.ExtendedAttrs()); e < s && e < this.length; ) this.setCell(e++, t);
          }
          resize(e, s) {
            if (e === this.length) return 4 * this._data.length * 2 < this._data.buffer.byteLength;
            const t = 3 * e;
            if (e > this.length) {
              if (this._data.buffer.byteLength >= 4 * t) this._data = new Uint32Array(this._data.buffer, 0, t);
              else {
                const i = new Uint32Array(t);
                i.set(this._data), this._data = i;
              }
              for (let i = this.length; i < e; ++i) this.setCell(i, s);
            } else {
              this._data = this._data.subarray(0, t);
              const i = Object.keys(this._combined);
              for (let l = 0; l < i.length; l++) {
                const v = parseInt(i[l], 10);
                v >= e && delete this._combined[v];
              }
              const o = Object.keys(this._extendedAttrs);
              for (let l = 0; l < o.length; l++) {
                const v = parseInt(o[l], 10);
                v >= e && delete this._extendedAttrs[v];
              }
            }
            return this.length = e, 4 * t * 2 < this._data.buffer.byteLength;
          }
          cleanupMemory() {
            if (4 * this._data.length * 2 < this._data.buffer.byteLength) {
              const e = new Uint32Array(this._data.length);
              return e.set(this._data), this._data = e, 1;
            }
            return 0;
          }
          fill(e, s = !1) {
            if (s) for (let t = 0; t < this.length; ++t) this.isProtected(t) || this.setCell(t, e);
            else {
              this._combined = {}, this._extendedAttrs = {};
              for (let t = 0; t < this.length; ++t) this.setCell(t, e);
            }
          }
          copyFrom(e) {
            this.length !== e.length ? this._data = new Uint32Array(e._data) : this._data.set(e._data), this.length = e.length, this._combined = {};
            for (const s in e._combined) this._combined[s] = e._combined[s];
            this._extendedAttrs = {};
            for (const s in e._extendedAttrs) this._extendedAttrs[s] = e._extendedAttrs[s];
            this.isWrapped = e.isWrapped;
          }
          clone() {
            const e = new g(0);
            e._data = new Uint32Array(this._data), e.length = this.length;
            for (const s in this._combined) e._combined[s] = this._combined[s];
            for (const s in this._extendedAttrs) e._extendedAttrs[s] = this._extendedAttrs[s];
            return e.isWrapped = this.isWrapped, e;
          }
          getTrimmedLength() {
            for (let e = this.length - 1; e >= 0; --e) if (4194303 & this._data[3 * e + 0]) return e + (this._data[3 * e + 0] >> 22);
            return 0;
          }
          getNoBgTrimmedLength() {
            for (let e = this.length - 1; e >= 0; --e) if (4194303 & this._data[3 * e + 0] || 50331648 & this._data[3 * e + 2]) return e + (this._data[3 * e + 0] >> 22);
            return 0;
          }
          copyCellsFrom(e, s, t, i, o) {
            const l = e._data;
            if (o) for (let d = i - 1; d >= 0; d--) {
              for (let h = 0; h < 3; h++) this._data[3 * (t + d) + h] = l[3 * (s + d) + h];
              268435456 & l[3 * (s + d) + 2] && (this._extendedAttrs[t + d] = e._extendedAttrs[s + d]);
            }
            else for (let d = 0; d < i; d++) {
              for (let h = 0; h < 3; h++) this._data[3 * (t + d) + h] = l[3 * (s + d) + h];
              268435456 & l[3 * (s + d) + 2] && (this._extendedAttrs[t + d] = e._extendedAttrs[s + d]);
            }
            const v = Object.keys(e._combined);
            for (let d = 0; d < v.length; d++) {
              const h = parseInt(v[d], 10);
              h >= s && (this._combined[h - s + t] = e._combined[h]);
            }
          }
          translateToString(e = !1, s = 0, t = this.length) {
            e && (t = Math.min(t, this.getTrimmedLength()));
            let i = "";
            for (; s < t; ) {
              const o = this._data[3 * s + 0], l = 2097151 & o;
              i += 2097152 & o ? this._combined[s] : l ? (0, u.stringFromCodePoint)(l) : n.WHITESPACE_CELL_CHAR, s += o >> 22 || 1;
            }
            return i;
          }
        }
        r.BufferLine = g;
      },
      4841: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.getRangeLength = void 0, r.getRangeLength = function(a, c) {
          if (a.start.y > a.end.y) throw new Error(`Buffer range end (${a.end.x}, ${a.end.y}) cannot be before start (${a.start.x}, ${a.start.y})`);
          return c * (a.end.y - a.start.y) + (a.end.x - a.start.x + 1);
        };
      },
      4634: (O, r) => {
        function a(c, f, n) {
          if (f === c.length - 1) return c[f].getTrimmedLength();
          const u = !c[f].hasContent(n - 1) && c[f].getWidth(n - 1) === 1, p = c[f + 1].getWidth(0) === 2;
          return u && p ? n - 1 : n;
        }
        Object.defineProperty(r, "__esModule", { value: !0 }), r.getWrappedLineTrimmedLength = r.reflowSmallerGetNewLineLengths = r.reflowLargerApplyNewLayout = r.reflowLargerCreateNewLayout = r.reflowLargerGetLinesToRemove = void 0, r.reflowLargerGetLinesToRemove = function(c, f, n, u, p) {
          const g = [];
          for (let _ = 0; _ < c.length - 1; _++) {
            let e = _, s = c.get(++e);
            if (!s.isWrapped) continue;
            const t = [c.get(_)];
            for (; e < c.length && s.isWrapped; ) t.push(s), s = c.get(++e);
            if (u >= _ && u < e) {
              _ += t.length - 1;
              continue;
            }
            let i = 0, o = a(t, i, f), l = 1, v = 0;
            for (; l < t.length; ) {
              const h = a(t, l, f), m = h - v, E = n - o, x = Math.min(m, E);
              t[i].copyCellsFrom(t[l], v, o, x, !1), o += x, o === n && (i++, o = 0), v += x, v === h && (l++, v = 0), o === 0 && i !== 0 && t[i - 1].getWidth(n - 1) === 2 && (t[i].copyCellsFrom(t[i - 1], n - 1, o++, 1, !1), t[i - 1].setCell(n - 1, p));
            }
            t[i].replaceCells(o, n, p);
            let d = 0;
            for (let h = t.length - 1; h > 0 && (h > i || t[h].getTrimmedLength() === 0); h--) d++;
            d > 0 && (g.push(_ + t.length - d), g.push(d)), _ += t.length - 1;
          }
          return g;
        }, r.reflowLargerCreateNewLayout = function(c, f) {
          const n = [];
          let u = 0, p = f[u], g = 0;
          for (let _ = 0; _ < c.length; _++) if (p === _) {
            const e = f[++u];
            c.onDeleteEmitter.fire({
              index: _ - g,
              amount: e
            }), _ += e - 1, g += e, p = f[++u];
          } else n.push(_);
          return {
            layout: n,
            countRemoved: g
          };
        }, r.reflowLargerApplyNewLayout = function(c, f) {
          const n = [];
          for (let u = 0; u < f.length; u++) n.push(c.get(f[u]));
          for (let u = 0; u < n.length; u++) c.set(u, n[u]);
          c.length = f.length;
        }, r.reflowSmallerGetNewLineLengths = function(c, f, n) {
          const u = [], p = c.map(((s, t) => a(c, t, f))).reduce(((s, t) => s + t));
          let g = 0, _ = 0, e = 0;
          for (; e < p; ) {
            if (p - e < n) {
              u.push(p - e);
              break;
            }
            g += n;
            const s = a(c, _, f);
            g > s && (g -= s, _++);
            const t = c[_].getWidth(g - 1) === 2;
            t && g--;
            const i = t ? n - 1 : n;
            u.push(i), e += i;
          }
          return u;
        }, r.getWrappedLineTrimmedLength = a;
      },
      5295: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferSet = void 0;
        const c = a(8460), f = a(844), n = a(9092);
        class u extends f.Disposable {
          constructor(g, _) {
            super(), this._optionsService = g, this._bufferService = _, this._onBufferActivate = this.register(new c.EventEmitter()), this.onBufferActivate = this._onBufferActivate.event, this.reset(), this.register(this._optionsService.onSpecificOptionChange("scrollback", (() => this.resize(this._bufferService.cols, this._bufferService.rows)))), this.register(this._optionsService.onSpecificOptionChange("tabStopWidth", (() => this.setupTabStops())));
          }
          reset() {
            this._normal = new n.Buffer(!0, this._optionsService, this._bufferService), this._normal.fillViewportRows(), this._alt = new n.Buffer(!1, this._optionsService, this._bufferService), this._activeBuffer = this._normal, this._onBufferActivate.fire({
              activeBuffer: this._normal,
              inactiveBuffer: this._alt
            }), this.setupTabStops();
          }
          get alt() {
            return this._alt;
          }
          get active() {
            return this._activeBuffer;
          }
          get normal() {
            return this._normal;
          }
          activateNormalBuffer() {
            this._activeBuffer !== this._normal && (this._normal.x = this._alt.x, this._normal.y = this._alt.y, this._alt.clearAllMarkers(), this._alt.clear(), this._activeBuffer = this._normal, this._onBufferActivate.fire({
              activeBuffer: this._normal,
              inactiveBuffer: this._alt
            }));
          }
          activateAltBuffer(g) {
            this._activeBuffer !== this._alt && (this._alt.fillViewportRows(g), this._alt.x = this._normal.x, this._alt.y = this._normal.y, this._activeBuffer = this._alt, this._onBufferActivate.fire({
              activeBuffer: this._alt,
              inactiveBuffer: this._normal
            }));
          }
          resize(g, _) {
            this._normal.resize(g, _), this._alt.resize(g, _), this.setupTabStops(g);
          }
          setupTabStops(g) {
            this._normal.setupTabStops(g), this._alt.setupTabStops(g);
          }
        }
        r.BufferSet = u;
      },
      511: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CellData = void 0;
        const c = a(482), f = a(643), n = a(3734);
        class u extends n.AttributeData {
          constructor() {
            super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new n.ExtendedAttrs(), this.combinedData = "";
          }
          static fromCharData(g) {
            const _ = new u();
            return _.setFromCharData(g), _;
          }
          isCombined() {
            return 2097152 & this.content;
          }
          getWidth() {
            return this.content >> 22;
          }
          getChars() {
            return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, c.stringFromCodePoint)(2097151 & this.content) : "";
          }
          getCode() {
            return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
          }
          setFromCharData(g) {
            this.fg = g[f.CHAR_DATA_ATTR_INDEX], this.bg = 0;
            let _ = !1;
            if (g[f.CHAR_DATA_CHAR_INDEX].length > 2) _ = !0;
            else if (g[f.CHAR_DATA_CHAR_INDEX].length === 2) {
              const e = g[f.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
              if (55296 <= e && e <= 56319) {
                const s = g[f.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
                56320 <= s && s <= 57343 ? this.content = 1024 * (e - 55296) + s - 56320 + 65536 | g[f.CHAR_DATA_WIDTH_INDEX] << 22 : _ = !0;
              } else _ = !0;
            } else this.content = g[f.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | g[f.CHAR_DATA_WIDTH_INDEX] << 22;
            _ && (this.combinedData = g[f.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | g[f.CHAR_DATA_WIDTH_INDEX] << 22);
          }
          getAsCharData() {
            return [
              this.fg,
              this.getChars(),
              this.getWidth(),
              this.getCode()
            ];
          }
        }
        r.CellData = u;
      },
      643: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.WHITESPACE_CELL_CODE = r.WHITESPACE_CELL_WIDTH = r.WHITESPACE_CELL_CHAR = r.NULL_CELL_CODE = r.NULL_CELL_WIDTH = r.NULL_CELL_CHAR = r.CHAR_DATA_CODE_INDEX = r.CHAR_DATA_WIDTH_INDEX = r.CHAR_DATA_CHAR_INDEX = r.CHAR_DATA_ATTR_INDEX = r.DEFAULT_EXT = r.DEFAULT_ATTR = r.DEFAULT_COLOR = void 0, r.DEFAULT_COLOR = 0, r.DEFAULT_ATTR = 256 | r.DEFAULT_COLOR << 9, r.DEFAULT_EXT = 0, r.CHAR_DATA_ATTR_INDEX = 0, r.CHAR_DATA_CHAR_INDEX = 1, r.CHAR_DATA_WIDTH_INDEX = 2, r.CHAR_DATA_CODE_INDEX = 3, r.NULL_CELL_CHAR = "", r.NULL_CELL_WIDTH = 1, r.NULL_CELL_CODE = 0, r.WHITESPACE_CELL_CHAR = " ", r.WHITESPACE_CELL_WIDTH = 1, r.WHITESPACE_CELL_CODE = 32;
      },
      4863: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Marker = void 0;
        const c = a(8460), f = a(844);
        class n {
          get id() {
            return this._id;
          }
          constructor(p) {
            this.line = p, this.isDisposed = !1, this._disposables = [], this._id = n._nextId++, this._onDispose = this.register(new c.EventEmitter()), this.onDispose = this._onDispose.event;
          }
          dispose() {
            this.isDisposed || (this.isDisposed = !0, this.line = -1, this._onDispose.fire(), (0, f.disposeArray)(this._disposables), this._disposables.length = 0);
          }
          register(p) {
            return this._disposables.push(p), p;
          }
        }
        r.Marker = n, n._nextId = 1;
      },
      7116: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.DEFAULT_CHARSET = r.CHARSETS = void 0, r.CHARSETS = {}, r.DEFAULT_CHARSET = r.CHARSETS.B, r.CHARSETS[0] = {
          "`": "◆",
          a: "▒",
          b: "␉",
          c: "␌",
          d: "␍",
          e: "␊",
          f: "°",
          g: "±",
          h: "␤",
          i: "␋",
          j: "┘",
          k: "┐",
          l: "┌",
          m: "└",
          n: "┼",
          o: "⎺",
          p: "⎻",
          q: "─",
          r: "⎼",
          s: "⎽",
          t: "├",
          u: "┤",
          v: "┴",
          w: "┬",
          x: "│",
          y: "≤",
          z: "≥",
          "{": "π",
          "|": "≠",
          "}": "£",
          "~": "·"
        }, r.CHARSETS.A = { "#": "£" }, r.CHARSETS.B = void 0, r.CHARSETS[4] = {
          "#": "£",
          "@": "¾",
          "[": "ij",
          "\\": "½",
          "]": "|",
          "{": "¨",
          "|": "f",
          "}": "¼",
          "~": "´"
        }, r.CHARSETS.C = r.CHARSETS[5] = {
          "[": "Ä",
          "\\": "Ö",
          "]": "Å",
          "^": "Ü",
          "`": "é",
          "{": "ä",
          "|": "ö",
          "}": "å",
          "~": "ü"
        }, r.CHARSETS.R = {
          "#": "£",
          "@": "à",
          "[": "°",
          "\\": "ç",
          "]": "§",
          "{": "é",
          "|": "ù",
          "}": "è",
          "~": "¨"
        }, r.CHARSETS.Q = {
          "@": "à",
          "[": "â",
          "\\": "ç",
          "]": "ê",
          "^": "î",
          "`": "ô",
          "{": "é",
          "|": "ù",
          "}": "è",
          "~": "û"
        }, r.CHARSETS.K = {
          "@": "§",
          "[": "Ä",
          "\\": "Ö",
          "]": "Ü",
          "{": "ä",
          "|": "ö",
          "}": "ü",
          "~": "ß"
        }, r.CHARSETS.Y = {
          "#": "£",
          "@": "§",
          "[": "°",
          "\\": "ç",
          "]": "é",
          "`": "ù",
          "{": "à",
          "|": "ò",
          "}": "è",
          "~": "ì"
        }, r.CHARSETS.E = r.CHARSETS[6] = {
          "@": "Ä",
          "[": "Æ",
          "\\": "Ø",
          "]": "Å",
          "^": "Ü",
          "`": "ä",
          "{": "æ",
          "|": "ø",
          "}": "å",
          "~": "ü"
        }, r.CHARSETS.Z = {
          "#": "£",
          "@": "§",
          "[": "¡",
          "\\": "Ñ",
          "]": "¿",
          "{": "°",
          "|": "ñ",
          "}": "ç"
        }, r.CHARSETS.H = r.CHARSETS[7] = {
          "@": "É",
          "[": "Ä",
          "\\": "Ö",
          "]": "Å",
          "^": "Ü",
          "`": "é",
          "{": "ä",
          "|": "ö",
          "}": "å",
          "~": "ü"
        }, r.CHARSETS["="] = {
          "#": "ù",
          "@": "à",
          "[": "é",
          "\\": "ç",
          "]": "ê",
          "^": "î",
          _: "è",
          "`": "ô",
          "{": "ä",
          "|": "ö",
          "}": "ü",
          "~": "û"
        };
      },
      2584: (O, r) => {
        var a, c, f;
        Object.defineProperty(r, "__esModule", { value: !0 }), r.C1_ESCAPED = r.C1 = r.C0 = void 0, (function(n) {
          n.NUL = "\0", n.SOH = "", n.STX = "", n.ETX = "", n.EOT = "", n.ENQ = "", n.ACK = "", n.BEL = "\x07", n.BS = "\b", n.HT = "	", n.LF = `
`, n.VT = "\v", n.FF = "\f", n.CR = "\r", n.SO = "", n.SI = "", n.DLE = "", n.DC1 = "", n.DC2 = "", n.DC3 = "", n.DC4 = "", n.NAK = "", n.SYN = "", n.ETB = "", n.CAN = "", n.EM = "", n.SUB = "", n.ESC = "\x1B", n.FS = "", n.GS = "", n.RS = "", n.US = "", n.SP = " ", n.DEL = "";
        })(a || (r.C0 = a = {})), (function(n) {
          n.PAD = "", n.HOP = "", n.BPH = "", n.NBH = "", n.IND = "", n.NEL = "", n.SSA = "", n.ESA = "", n.HTS = "", n.HTJ = "", n.VTS = "", n.PLD = "", n.PLU = "", n.RI = "", n.SS2 = "", n.SS3 = "", n.DCS = "", n.PU1 = "", n.PU2 = "", n.STS = "", n.CCH = "", n.MW = "", n.SPA = "", n.EPA = "", n.SOS = "", n.SGCI = "", n.SCI = "", n.CSI = "", n.ST = "", n.OSC = "", n.PM = "", n.APC = "";
        })(c || (r.C1 = c = {})), (function(n) {
          n.ST = `${a.ESC}\\`;
        })(f || (r.C1_ESCAPED = f = {}));
      },
      7399: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.evaluateKeyboardEvent = void 0;
        const c = a(2584), f = {
          48: ["0", ")"],
          49: ["1", "!"],
          50: ["2", "@"],
          51: ["3", "#"],
          52: ["4", "$"],
          53: ["5", "%"],
          54: ["6", "^"],
          55: ["7", "&"],
          56: ["8", "*"],
          57: ["9", "("],
          186: [";", ":"],
          187: ["=", "+"],
          188: [",", "<"],
          189: ["-", "_"],
          190: [".", ">"],
          191: ["/", "?"],
          192: ["`", "~"],
          219: ["[", "{"],
          220: ["\\", "|"],
          221: ["]", "}"],
          222: ["'", '"']
        };
        r.evaluateKeyboardEvent = function(n, u, p, g) {
          const _ = {
            type: 0,
            cancel: !1,
            key: void 0
          }, e = (n.shiftKey ? 1 : 0) | (n.altKey ? 2 : 0) | (n.ctrlKey ? 4 : 0) | (n.metaKey ? 8 : 0);
          switch (n.keyCode) {
            case 0:
              n.key === "UIKeyInputUpArrow" ? _.key = u ? c.C0.ESC + "OA" : c.C0.ESC + "[A" : n.key === "UIKeyInputLeftArrow" ? _.key = u ? c.C0.ESC + "OD" : c.C0.ESC + "[D" : n.key === "UIKeyInputRightArrow" ? _.key = u ? c.C0.ESC + "OC" : c.C0.ESC + "[C" : n.key === "UIKeyInputDownArrow" && (_.key = u ? c.C0.ESC + "OB" : c.C0.ESC + "[B");
              break;
            case 8:
              if (n.altKey) {
                _.key = c.C0.ESC + c.C0.DEL;
                break;
              }
              _.key = c.C0.DEL;
              break;
            case 9:
              if (n.shiftKey) {
                _.key = c.C0.ESC + "[Z";
                break;
              }
              _.key = c.C0.HT, _.cancel = !0;
              break;
            case 13:
              _.key = n.altKey ? c.C0.ESC + c.C0.CR : c.C0.CR, _.cancel = !0;
              break;
            case 27:
              _.key = c.C0.ESC, n.altKey && (_.key = c.C0.ESC + c.C0.ESC), _.cancel = !0;
              break;
            case 37:
              if (n.metaKey) break;
              e ? (_.key = c.C0.ESC + "[1;" + (e + 1) + "D", _.key === c.C0.ESC + "[1;3D" && (_.key = c.C0.ESC + (p ? "b" : "[1;5D"))) : _.key = u ? c.C0.ESC + "OD" : c.C0.ESC + "[D";
              break;
            case 39:
              if (n.metaKey) break;
              e ? (_.key = c.C0.ESC + "[1;" + (e + 1) + "C", _.key === c.C0.ESC + "[1;3C" && (_.key = c.C0.ESC + (p ? "f" : "[1;5C"))) : _.key = u ? c.C0.ESC + "OC" : c.C0.ESC + "[C";
              break;
            case 38:
              if (n.metaKey) break;
              e ? (_.key = c.C0.ESC + "[1;" + (e + 1) + "A", p || _.key !== c.C0.ESC + "[1;3A" || (_.key = c.C0.ESC + "[1;5A")) : _.key = u ? c.C0.ESC + "OA" : c.C0.ESC + "[A";
              break;
            case 40:
              if (n.metaKey) break;
              e ? (_.key = c.C0.ESC + "[1;" + (e + 1) + "B", p || _.key !== c.C0.ESC + "[1;3B" || (_.key = c.C0.ESC + "[1;5B")) : _.key = u ? c.C0.ESC + "OB" : c.C0.ESC + "[B";
              break;
            case 45:
              n.shiftKey || n.ctrlKey || (_.key = c.C0.ESC + "[2~");
              break;
            case 46:
              _.key = e ? c.C0.ESC + "[3;" + (e + 1) + "~" : c.C0.ESC + "[3~";
              break;
            case 36:
              _.key = e ? c.C0.ESC + "[1;" + (e + 1) + "H" : u ? c.C0.ESC + "OH" : c.C0.ESC + "[H";
              break;
            case 35:
              _.key = e ? c.C0.ESC + "[1;" + (e + 1) + "F" : u ? c.C0.ESC + "OF" : c.C0.ESC + "[F";
              break;
            case 33:
              n.shiftKey ? _.type = 2 : n.ctrlKey ? _.key = c.C0.ESC + "[5;" + (e + 1) + "~" : _.key = c.C0.ESC + "[5~";
              break;
            case 34:
              n.shiftKey ? _.type = 3 : n.ctrlKey ? _.key = c.C0.ESC + "[6;" + (e + 1) + "~" : _.key = c.C0.ESC + "[6~";
              break;
            case 112:
              _.key = e ? c.C0.ESC + "[1;" + (e + 1) + "P" : c.C0.ESC + "OP";
              break;
            case 113:
              _.key = e ? c.C0.ESC + "[1;" + (e + 1) + "Q" : c.C0.ESC + "OQ";
              break;
            case 114:
              _.key = e ? c.C0.ESC + "[1;" + (e + 1) + "R" : c.C0.ESC + "OR";
              break;
            case 115:
              _.key = e ? c.C0.ESC + "[1;" + (e + 1) + "S" : c.C0.ESC + "OS";
              break;
            case 116:
              _.key = e ? c.C0.ESC + "[15;" + (e + 1) + "~" : c.C0.ESC + "[15~";
              break;
            case 117:
              _.key = e ? c.C0.ESC + "[17;" + (e + 1) + "~" : c.C0.ESC + "[17~";
              break;
            case 118:
              _.key = e ? c.C0.ESC + "[18;" + (e + 1) + "~" : c.C0.ESC + "[18~";
              break;
            case 119:
              _.key = e ? c.C0.ESC + "[19;" + (e + 1) + "~" : c.C0.ESC + "[19~";
              break;
            case 120:
              _.key = e ? c.C0.ESC + "[20;" + (e + 1) + "~" : c.C0.ESC + "[20~";
              break;
            case 121:
              _.key = e ? c.C0.ESC + "[21;" + (e + 1) + "~" : c.C0.ESC + "[21~";
              break;
            case 122:
              _.key = e ? c.C0.ESC + "[23;" + (e + 1) + "~" : c.C0.ESC + "[23~";
              break;
            case 123:
              _.key = e ? c.C0.ESC + "[24;" + (e + 1) + "~" : c.C0.ESC + "[24~";
              break;
            default:
              if (!n.ctrlKey || n.shiftKey || n.altKey || n.metaKey) if (p && !g || !n.altKey || n.metaKey) !p || n.altKey || n.ctrlKey || n.shiftKey || !n.metaKey ? n.key && !n.ctrlKey && !n.altKey && !n.metaKey && n.keyCode >= 48 && n.key.length === 1 ? _.key = n.key : n.key && n.ctrlKey && (n.key === "_" && (_.key = c.C0.US), n.key === "@" && (_.key = c.C0.NUL)) : n.keyCode === 65 && (_.type = 1);
              else {
                const s = f[n.keyCode], t = s?.[n.shiftKey ? 1 : 0];
                if (t) _.key = c.C0.ESC + t;
                else if (n.keyCode >= 65 && n.keyCode <= 90) {
                  const i = n.ctrlKey ? n.keyCode - 64 : n.keyCode + 32;
                  let o = String.fromCharCode(i);
                  n.shiftKey && (o = o.toUpperCase()), _.key = c.C0.ESC + o;
                } else if (n.keyCode === 32) _.key = c.C0.ESC + (n.ctrlKey ? c.C0.NUL : " ");
                else if (n.key === "Dead" && n.code.startsWith("Key")) {
                  let i = n.code.slice(3, 4);
                  n.shiftKey || (i = i.toLowerCase()), _.key = c.C0.ESC + i, _.cancel = !0;
                }
              }
              else n.keyCode >= 65 && n.keyCode <= 90 ? _.key = String.fromCharCode(n.keyCode - 64) : n.keyCode === 32 ? _.key = c.C0.NUL : n.keyCode >= 51 && n.keyCode <= 55 ? _.key = String.fromCharCode(n.keyCode - 51 + 27) : n.keyCode === 56 ? _.key = c.C0.DEL : n.keyCode === 219 ? _.key = c.C0.ESC : n.keyCode === 220 ? _.key = c.C0.FS : n.keyCode === 221 && (_.key = c.C0.GS);
          }
          return _;
        };
      },
      482: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Utf8ToUtf32 = r.StringToUtf32 = r.utf32ToString = r.stringFromCodePoint = void 0, r.stringFromCodePoint = function(a) {
          return a > 65535 ? (a -= 65536, String.fromCharCode(55296 + (a >> 10)) + String.fromCharCode(a % 1024 + 56320)) : String.fromCharCode(a);
        }, r.utf32ToString = function(a, c = 0, f = a.length) {
          let n = "";
          for (let u = c; u < f; ++u) {
            let p = a[u];
            p > 65535 ? (p -= 65536, n += String.fromCharCode(55296 + (p >> 10)) + String.fromCharCode(p % 1024 + 56320)) : n += String.fromCharCode(p);
          }
          return n;
        }, r.StringToUtf32 = class {
          constructor() {
            this._interim = 0;
          }
          clear() {
            this._interim = 0;
          }
          decode(a, c) {
            const f = a.length;
            if (!f) return 0;
            let n = 0, u = 0;
            if (this._interim) {
              const p = a.charCodeAt(u++);
              56320 <= p && p <= 57343 ? c[n++] = 1024 * (this._interim - 55296) + p - 56320 + 65536 : (c[n++] = this._interim, c[n++] = p), this._interim = 0;
            }
            for (let p = u; p < f; ++p) {
              const g = a.charCodeAt(p);
              if (55296 <= g && g <= 56319) {
                if (++p >= f) return this._interim = g, n;
                const _ = a.charCodeAt(p);
                56320 <= _ && _ <= 57343 ? c[n++] = 1024 * (g - 55296) + _ - 56320 + 65536 : (c[n++] = g, c[n++] = _);
              } else g !== 65279 && (c[n++] = g);
            }
            return n;
          }
        }, r.Utf8ToUtf32 = class {
          constructor() {
            this.interim = new Uint8Array(3);
          }
          clear() {
            this.interim.fill(0);
          }
          decode(a, c) {
            const f = a.length;
            if (!f) return 0;
            let n, u, p, g, _ = 0, e = 0, s = 0;
            if (this.interim[0]) {
              let o = !1, l = this.interim[0];
              l &= (224 & l) == 192 ? 31 : (240 & l) == 224 ? 15 : 7;
              let v, d = 0;
              for (; (v = 63 & this.interim[++d]) && d < 4; ) l <<= 6, l |= v;
              const h = (224 & this.interim[0]) == 192 ? 2 : (240 & this.interim[0]) == 224 ? 3 : 4, m = h - d;
              for (; s < m; ) {
                if (s >= f) return 0;
                if (v = a[s++], (192 & v) != 128) {
                  s--, o = !0;
                  break;
                }
                this.interim[d++] = v, l <<= 6, l |= 63 & v;
              }
              o || (h === 2 ? l < 128 ? s-- : c[_++] = l : h === 3 ? l < 2048 || l >= 55296 && l <= 57343 || l === 65279 || (c[_++] = l) : l < 65536 || l > 1114111 || (c[_++] = l)), this.interim.fill(0);
            }
            const t = f - 4;
            let i = s;
            for (; i < f; ) {
              for (; !(!(i < t) || 128 & (n = a[i]) || 128 & (u = a[i + 1]) || 128 & (p = a[i + 2]) || 128 & (g = a[i + 3])); ) c[_++] = n, c[_++] = u, c[_++] = p, c[_++] = g, i += 4;
              if (n = a[i++], n < 128) c[_++] = n;
              else if ((224 & n) == 192) {
                if (i >= f) return this.interim[0] = n, _;
                if (u = a[i++], (192 & u) != 128) {
                  i--;
                  continue;
                }
                if (e = (31 & n) << 6 | 63 & u, e < 128) {
                  i--;
                  continue;
                }
                c[_++] = e;
              } else if ((240 & n) == 224) {
                if (i >= f) return this.interim[0] = n, _;
                if (u = a[i++], (192 & u) != 128) {
                  i--;
                  continue;
                }
                if (i >= f) return this.interim[0] = n, this.interim[1] = u, _;
                if (p = a[i++], (192 & p) != 128) {
                  i--;
                  continue;
                }
                if (e = (15 & n) << 12 | (63 & u) << 6 | 63 & p, e < 2048 || e >= 55296 && e <= 57343 || e === 65279) continue;
                c[_++] = e;
              } else if ((248 & n) == 240) {
                if (i >= f) return this.interim[0] = n, _;
                if (u = a[i++], (192 & u) != 128) {
                  i--;
                  continue;
                }
                if (i >= f) return this.interim[0] = n, this.interim[1] = u, _;
                if (p = a[i++], (192 & p) != 128) {
                  i--;
                  continue;
                }
                if (i >= f) return this.interim[0] = n, this.interim[1] = u, this.interim[2] = p, _;
                if (g = a[i++], (192 & g) != 128) {
                  i--;
                  continue;
                }
                if (e = (7 & n) << 18 | (63 & u) << 12 | (63 & p) << 6 | 63 & g, e < 65536 || e > 1114111) continue;
                c[_++] = e;
              }
            }
            return _;
          }
        };
      },
      225: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.UnicodeV6 = void 0;
        const a = [
          [768, 879],
          [1155, 1158],
          [1160, 1161],
          [1425, 1469],
          [1471, 1471],
          [1473, 1474],
          [1476, 1477],
          [1479, 1479],
          [1536, 1539],
          [1552, 1557],
          [1611, 1630],
          [1648, 1648],
          [1750, 1764],
          [1767, 1768],
          [1770, 1773],
          [1807, 1807],
          [1809, 1809],
          [1840, 1866],
          [1958, 1968],
          [2027, 2035],
          [2305, 2306],
          [2364, 2364],
          [2369, 2376],
          [2381, 2381],
          [2385, 2388],
          [2402, 2403],
          [2433, 2433],
          [2492, 2492],
          [2497, 2500],
          [2509, 2509],
          [2530, 2531],
          [2561, 2562],
          [2620, 2620],
          [2625, 2626],
          [2631, 2632],
          [2635, 2637],
          [2672, 2673],
          [2689, 2690],
          [2748, 2748],
          [2753, 2757],
          [2759, 2760],
          [2765, 2765],
          [2786, 2787],
          [2817, 2817],
          [2876, 2876],
          [2879, 2879],
          [2881, 2883],
          [2893, 2893],
          [2902, 2902],
          [2946, 2946],
          [3008, 3008],
          [3021, 3021],
          [3134, 3136],
          [3142, 3144],
          [3146, 3149],
          [3157, 3158],
          [3260, 3260],
          [3263, 3263],
          [3270, 3270],
          [3276, 3277],
          [3298, 3299],
          [3393, 3395],
          [3405, 3405],
          [3530, 3530],
          [3538, 3540],
          [3542, 3542],
          [3633, 3633],
          [3636, 3642],
          [3655, 3662],
          [3761, 3761],
          [3764, 3769],
          [3771, 3772],
          [3784, 3789],
          [3864, 3865],
          [3893, 3893],
          [3895, 3895],
          [3897, 3897],
          [3953, 3966],
          [3968, 3972],
          [3974, 3975],
          [3984, 3991],
          [3993, 4028],
          [4038, 4038],
          [4141, 4144],
          [4146, 4146],
          [4150, 4151],
          [4153, 4153],
          [4184, 4185],
          [4448, 4607],
          [4959, 4959],
          [5906, 5908],
          [5938, 5940],
          [5970, 5971],
          [6002, 6003],
          [6068, 6069],
          [6071, 6077],
          [6086, 6086],
          [6089, 6099],
          [6109, 6109],
          [6155, 6157],
          [6313, 6313],
          [6432, 6434],
          [6439, 6440],
          [6450, 6450],
          [6457, 6459],
          [6679, 6680],
          [6912, 6915],
          [6964, 6964],
          [6966, 6970],
          [6972, 6972],
          [6978, 6978],
          [7019, 7027],
          [7616, 7626],
          [7678, 7679],
          [8203, 8207],
          [8234, 8238],
          [8288, 8291],
          [8298, 8303],
          [8400, 8431],
          [12330, 12335],
          [12441, 12442],
          [43014, 43014],
          [43019, 43019],
          [43045, 43046],
          [64286, 64286],
          [65024, 65039],
          [65056, 65059],
          [65279, 65279],
          [65529, 65531]
        ], c = [
          [68097, 68099],
          [68101, 68102],
          [68108, 68111],
          [68152, 68154],
          [68159, 68159],
          [119143, 119145],
          [119155, 119170],
          [119173, 119179],
          [119210, 119213],
          [119362, 119364],
          [917505, 917505],
          [917536, 917631],
          [917760, 917999]
        ];
        let f;
        r.UnicodeV6 = class {
          constructor() {
            if (this.version = "6", !f) {
              f = new Uint8Array(65536), f.fill(1), f[0] = 0, f.fill(0, 1, 32), f.fill(0, 127, 160), f.fill(2, 4352, 4448), f[9001] = 2, f[9002] = 2, f.fill(2, 11904, 42192), f[12351] = 1, f.fill(2, 44032, 55204), f.fill(2, 63744, 64256), f.fill(2, 65040, 65050), f.fill(2, 65072, 65136), f.fill(2, 65280, 65377), f.fill(2, 65504, 65511);
              for (let n = 0; n < a.length; ++n) f.fill(0, a[n][0], a[n][1] + 1);
            }
          }
          wcwidth(n) {
            return n < 32 ? 0 : n < 127 ? 1 : n < 65536 ? f[n] : (function(u, p) {
              let g, _ = 0, e = p.length - 1;
              if (u < p[0][0] || u > p[e][1]) return !1;
              for (; e >= _; ) if (g = _ + e >> 1, u > p[g][1]) _ = g + 1;
              else {
                if (!(u < p[g][0])) return !0;
                e = g - 1;
              }
              return !1;
            })(n, c) ? 0 : n >= 131072 && n <= 196605 || n >= 196608 && n <= 262141 ? 2 : 1;
          }
        };
      },
      5981: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.WriteBuffer = void 0;
        const c = a(8460), f = a(844);
        class n extends f.Disposable {
          constructor(p) {
            super(), this._action = p, this._writeBuffer = [], this._callbacks = [], this._pendingData = 0, this._bufferOffset = 0, this._isSyncWriting = !1, this._syncCalls = 0, this._didUserInput = !1, this._onWriteParsed = this.register(new c.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event;
          }
          handleUserInput() {
            this._didUserInput = !0;
          }
          writeSync(p, g) {
            if (g !== void 0 && this._syncCalls > g) return void (this._syncCalls = 0);
            if (this._pendingData += p.length, this._writeBuffer.push(p), this._callbacks.push(void 0), this._syncCalls++, this._isSyncWriting) return;
            let _;
            for (this._isSyncWriting = !0; _ = this._writeBuffer.shift(); ) {
              this._action(_);
              const e = this._callbacks.shift();
              e && e();
            }
            this._pendingData = 0, this._bufferOffset = 2147483647, this._isSyncWriting = !1, this._syncCalls = 0;
          }
          write(p, g) {
            if (this._pendingData > 5e7) throw new Error("write data discarded, use flow control to avoid losing data");
            if (!this._writeBuffer.length) {
              if (this._bufferOffset = 0, this._didUserInput) return this._didUserInput = !1, this._pendingData += p.length, this._writeBuffer.push(p), this._callbacks.push(g), void this._innerWrite();
              setTimeout((() => this._innerWrite()));
            }
            this._pendingData += p.length, this._writeBuffer.push(p), this._callbacks.push(g);
          }
          _innerWrite(p = 0, g = !0) {
            const _ = p || Date.now();
            for (; this._writeBuffer.length > this._bufferOffset; ) {
              const e = this._writeBuffer[this._bufferOffset], s = this._action(e, g);
              if (s) {
                const i = (o) => Date.now() - _ >= 12 ? setTimeout((() => this._innerWrite(0, o))) : this._innerWrite(_, o);
                s.catch(((o) => (queueMicrotask((() => {
                  throw o;
                })), Promise.resolve(!1)))).then(i);
                return;
              }
              const t = this._callbacks[this._bufferOffset];
              if (t && t(), this._bufferOffset++, this._pendingData -= e.length, Date.now() - _ >= 12) break;
            }
            this._writeBuffer.length > this._bufferOffset ? (this._bufferOffset > 50 && (this._writeBuffer = this._writeBuffer.slice(this._bufferOffset), this._callbacks = this._callbacks.slice(this._bufferOffset), this._bufferOffset = 0), setTimeout((() => this._innerWrite()))) : (this._writeBuffer.length = 0, this._callbacks.length = 0, this._pendingData = 0, this._bufferOffset = 0), this._onWriteParsed.fire();
          }
        }
        r.WriteBuffer = n;
      },
      5941: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.toRgbString = r.parseColor = void 0;
        const a = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/, c = /^[\da-f]+$/;
        function f(n, u) {
          const p = n.toString(16), g = p.length < 2 ? "0" + p : p;
          switch (u) {
            case 4:
              return p[0];
            case 8:
              return g;
            case 12:
              return (g + g).slice(0, 3);
            default:
              return g + g;
          }
        }
        r.parseColor = function(n) {
          if (!n) return;
          let u = n.toLowerCase();
          if (u.indexOf("rgb:") === 0) {
            u = u.slice(4);
            const p = a.exec(u);
            if (p) {
              const g = p[1] ? 15 : p[4] ? 255 : p[7] ? 4095 : 65535;
              return [
                Math.round(parseInt(p[1] || p[4] || p[7] || p[10], 16) / g * 255),
                Math.round(parseInt(p[2] || p[5] || p[8] || p[11], 16) / g * 255),
                Math.round(parseInt(p[3] || p[6] || p[9] || p[12], 16) / g * 255)
              ];
            }
          } else if (u.indexOf("#") === 0 && (u = u.slice(1), c.exec(u) && [
            3,
            6,
            9,
            12
          ].includes(u.length))) {
            const p = u.length / 3, g = [
              0,
              0,
              0
            ];
            for (let _ = 0; _ < 3; ++_) {
              const e = parseInt(u.slice(p * _, p * _ + p), 16);
              g[_] = p === 1 ? e << 4 : p === 2 ? e : p === 3 ? e >> 4 : e >> 8;
            }
            return g;
          }
        }, r.toRgbString = function(n, u = 16) {
          const [p, g, _] = n;
          return `rgb:${f(p, u)}/${f(g, u)}/${f(_, u)}`;
        };
      },
      5770: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.PAYLOAD_LIMIT = void 0, r.PAYLOAD_LIMIT = 1e7;
      },
      6351: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.DcsHandler = r.DcsParser = void 0;
        const c = a(482), f = a(8742), n = a(5770), u = [];
        r.DcsParser = class {
          constructor() {
            this._handlers = /* @__PURE__ */ Object.create(null), this._active = u, this._ident = 0, this._handlerFb = () => {
            }, this._stack = {
              paused: !1,
              loopPosition: 0,
              fallThrough: !1
            };
          }
          dispose() {
            this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
            }, this._active = u;
          }
          registerHandler(g, _) {
            this._handlers[g] === void 0 && (this._handlers[g] = []);
            const e = this._handlers[g];
            return e.push(_), { dispose: () => {
              const s = e.indexOf(_);
              s !== -1 && e.splice(s, 1);
            } };
          }
          clearHandler(g) {
            this._handlers[g] && delete this._handlers[g];
          }
          setHandlerFallback(g) {
            this._handlerFb = g;
          }
          reset() {
            if (this._active.length) for (let g = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; g >= 0; --g) this._active[g].unhook(!1);
            this._stack.paused = !1, this._active = u, this._ident = 0;
          }
          hook(g, _) {
            if (this.reset(), this._ident = g, this._active = this._handlers[g] || u, this._active.length) for (let e = this._active.length - 1; e >= 0; e--) this._active[e].hook(_);
            else this._handlerFb(this._ident, "HOOK", _);
          }
          put(g, _, e) {
            if (this._active.length) for (let s = this._active.length - 1; s >= 0; s--) this._active[s].put(g, _, e);
            else this._handlerFb(this._ident, "PUT", (0, c.utf32ToString)(g, _, e));
          }
          unhook(g, _ = !0) {
            if (this._active.length) {
              let e = !1, s = this._active.length - 1, t = !1;
              if (this._stack.paused && (s = this._stack.loopPosition - 1, e = _, t = this._stack.fallThrough, this._stack.paused = !1), !t && e === !1) {
                for (; s >= 0 && (e = this._active[s].unhook(g), e !== !0); s--) if (e instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = s, this._stack.fallThrough = !1, e;
                s--;
              }
              for (; s >= 0; s--) if (e = this._active[s].unhook(!1), e instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = s, this._stack.fallThrough = !0, e;
            } else this._handlerFb(this._ident, "UNHOOK", g);
            this._active = u, this._ident = 0;
          }
        };
        const p = new f.Params();
        p.addParam(0), r.DcsHandler = class {
          constructor(g) {
            this._handler = g, this._data = "", this._params = p, this._hitLimit = !1;
          }
          hook(g) {
            this._params = g.length > 1 || g.params[0] ? g.clone() : p, this._data = "", this._hitLimit = !1;
          }
          put(g, _, e) {
            this._hitLimit || (this._data += (0, c.utf32ToString)(g, _, e), this._data.length > n.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = !0));
          }
          unhook(g) {
            let _ = !1;
            if (this._hitLimit) _ = !1;
            else if (g && (_ = this._handler(this._data, this._params), _ instanceof Promise)) return _.then(((e) => (this._params = p, this._data = "", this._hitLimit = !1, e)));
            return this._params = p, this._data = "", this._hitLimit = !1, _;
          }
        };
      },
      2015: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.EscapeSequenceParser = r.VT500_TRANSITION_TABLE = r.TransitionTable = void 0;
        const c = a(844), f = a(8742), n = a(6242), u = a(6351);
        class p {
          constructor(s) {
            this.table = new Uint8Array(s);
          }
          setDefault(s, t) {
            this.table.fill(s << 4 | t);
          }
          add(s, t, i, o) {
            this.table[t << 8 | s] = i << 4 | o;
          }
          addMany(s, t, i, o) {
            for (let l = 0; l < s.length; l++) this.table[t << 8 | s[l]] = i << 4 | o;
          }
        }
        r.TransitionTable = p;
        const g = 160;
        r.VT500_TRANSITION_TABLE = (function() {
          const e = new p(4095), s = Array.apply(null, Array(256)).map(((d, h) => h)), t = (d, h) => s.slice(d, h), i = t(32, 127), o = t(0, 24);
          o.push(25), o.push.apply(o, t(28, 32));
          const l = t(0, 14);
          let v;
          for (v in e.setDefault(1, 0), e.addMany(i, 0, 2, 0), l) e.addMany([
            24,
            26,
            153,
            154
          ], v, 3, 0), e.addMany(t(128, 144), v, 3, 0), e.addMany(t(144, 152), v, 3, 0), e.add(156, v, 0, 0), e.add(27, v, 11, 1), e.add(157, v, 4, 8), e.addMany([
            152,
            158,
            159
          ], v, 0, 7), e.add(155, v, 11, 3), e.add(144, v, 11, 9);
          return e.addMany(o, 0, 3, 0), e.addMany(o, 1, 3, 1), e.add(127, 1, 0, 1), e.addMany(o, 8, 0, 8), e.addMany(o, 3, 3, 3), e.add(127, 3, 0, 3), e.addMany(o, 4, 3, 4), e.add(127, 4, 0, 4), e.addMany(o, 6, 3, 6), e.addMany(o, 5, 3, 5), e.add(127, 5, 0, 5), e.addMany(o, 2, 3, 2), e.add(127, 2, 0, 2), e.add(93, 1, 4, 8), e.addMany(i, 8, 5, 8), e.add(127, 8, 5, 8), e.addMany([
            156,
            27,
            24,
            26,
            7
          ], 8, 6, 0), e.addMany(t(28, 32), 8, 0, 8), e.addMany([
            88,
            94,
            95
          ], 1, 0, 7), e.addMany(i, 7, 0, 7), e.addMany(o, 7, 0, 7), e.add(156, 7, 0, 0), e.add(127, 7, 0, 7), e.add(91, 1, 11, 3), e.addMany(t(64, 127), 3, 7, 0), e.addMany(t(48, 60), 3, 8, 4), e.addMany([
            60,
            61,
            62,
            63
          ], 3, 9, 4), e.addMany(t(48, 60), 4, 8, 4), e.addMany(t(64, 127), 4, 7, 0), e.addMany([
            60,
            61,
            62,
            63
          ], 4, 0, 6), e.addMany(t(32, 64), 6, 0, 6), e.add(127, 6, 0, 6), e.addMany(t(64, 127), 6, 0, 0), e.addMany(t(32, 48), 3, 9, 5), e.addMany(t(32, 48), 5, 9, 5), e.addMany(t(48, 64), 5, 0, 6), e.addMany(t(64, 127), 5, 7, 0), e.addMany(t(32, 48), 4, 9, 5), e.addMany(t(32, 48), 1, 9, 2), e.addMany(t(32, 48), 2, 9, 2), e.addMany(t(48, 127), 2, 10, 0), e.addMany(t(48, 80), 1, 10, 0), e.addMany(t(81, 88), 1, 10, 0), e.addMany([
            89,
            90,
            92
          ], 1, 10, 0), e.addMany(t(96, 127), 1, 10, 0), e.add(80, 1, 11, 9), e.addMany(o, 9, 0, 9), e.add(127, 9, 0, 9), e.addMany(t(28, 32), 9, 0, 9), e.addMany(t(32, 48), 9, 9, 12), e.addMany(t(48, 60), 9, 8, 10), e.addMany([
            60,
            61,
            62,
            63
          ], 9, 9, 10), e.addMany(o, 11, 0, 11), e.addMany(t(32, 128), 11, 0, 11), e.addMany(t(28, 32), 11, 0, 11), e.addMany(o, 10, 0, 10), e.add(127, 10, 0, 10), e.addMany(t(28, 32), 10, 0, 10), e.addMany(t(48, 60), 10, 8, 10), e.addMany([
            60,
            61,
            62,
            63
          ], 10, 0, 11), e.addMany(t(32, 48), 10, 9, 12), e.addMany(o, 12, 0, 12), e.add(127, 12, 0, 12), e.addMany(t(28, 32), 12, 0, 12), e.addMany(t(32, 48), 12, 9, 12), e.addMany(t(48, 64), 12, 0, 11), e.addMany(t(64, 127), 12, 12, 13), e.addMany(t(64, 127), 10, 12, 13), e.addMany(t(64, 127), 9, 12, 13), e.addMany(o, 13, 13, 13), e.addMany(i, 13, 13, 13), e.add(127, 13, 0, 13), e.addMany([
            27,
            156,
            24,
            26
          ], 13, 14, 0), e.add(g, 0, 2, 0), e.add(g, 8, 5, 8), e.add(g, 6, 0, 6), e.add(g, 11, 0, 11), e.add(g, 13, 13, 13), e;
        })();
        class _ extends c.Disposable {
          constructor(s = r.VT500_TRANSITION_TABLE) {
            super(), this._transitions = s, this._parseStack = {
              state: 0,
              handlers: [],
              handlerPos: 0,
              transition: 0,
              chunkPos: 0
            }, this.initialState = 0, this.currentState = this.initialState, this._params = new f.Params(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0, this._printHandlerFb = (t, i, o) => {
            }, this._executeHandlerFb = (t) => {
            }, this._csiHandlerFb = (t, i) => {
            }, this._escHandlerFb = (t) => {
            }, this._errorHandlerFb = (t) => t, this._printHandler = this._printHandlerFb, this._executeHandlers = /* @__PURE__ */ Object.create(null), this._csiHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null), this.register((0, c.toDisposable)((() => {
              this._csiHandlers = /* @__PURE__ */ Object.create(null), this._executeHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null);
            }))), this._oscParser = this.register(new n.OscParser()), this._dcsParser = this.register(new u.DcsParser()), this._errorHandler = this._errorHandlerFb, this.registerEscHandler({ final: "\\" }, (() => !0));
          }
          _identifier(s, t = [64, 126]) {
            let i = 0;
            if (s.prefix) {
              if (s.prefix.length > 1) throw new Error("only one byte as prefix supported");
              if (i = s.prefix.charCodeAt(0), i && 60 > i || i > 63) throw new Error("prefix must be in range 0x3c .. 0x3f");
            }
            if (s.intermediates) {
              if (s.intermediates.length > 2) throw new Error("only two bytes as intermediates are supported");
              for (let l = 0; l < s.intermediates.length; ++l) {
                const v = s.intermediates.charCodeAt(l);
                if (32 > v || v > 47) throw new Error("intermediate must be in range 0x20 .. 0x2f");
                i <<= 8, i |= v;
              }
            }
            if (s.final.length !== 1) throw new Error("final must be a single byte");
            const o = s.final.charCodeAt(0);
            if (t[0] > o || o > t[1]) throw new Error(`final must be in range ${t[0]} .. ${t[1]}`);
            return i <<= 8, i |= o, i;
          }
          identToString(s) {
            const t = [];
            for (; s; ) t.push(String.fromCharCode(255 & s)), s >>= 8;
            return t.reverse().join("");
          }
          setPrintHandler(s) {
            this._printHandler = s;
          }
          clearPrintHandler() {
            this._printHandler = this._printHandlerFb;
          }
          registerEscHandler(s, t) {
            const i = this._identifier(s, [48, 126]);
            this._escHandlers[i] === void 0 && (this._escHandlers[i] = []);
            const o = this._escHandlers[i];
            return o.push(t), { dispose: () => {
              const l = o.indexOf(t);
              l !== -1 && o.splice(l, 1);
            } };
          }
          clearEscHandler(s) {
            this._escHandlers[this._identifier(s, [48, 126])] && delete this._escHandlers[this._identifier(s, [48, 126])];
          }
          setEscHandlerFallback(s) {
            this._escHandlerFb = s;
          }
          setExecuteHandler(s, t) {
            this._executeHandlers[s.charCodeAt(0)] = t;
          }
          clearExecuteHandler(s) {
            this._executeHandlers[s.charCodeAt(0)] && delete this._executeHandlers[s.charCodeAt(0)];
          }
          setExecuteHandlerFallback(s) {
            this._executeHandlerFb = s;
          }
          registerCsiHandler(s, t) {
            const i = this._identifier(s);
            this._csiHandlers[i] === void 0 && (this._csiHandlers[i] = []);
            const o = this._csiHandlers[i];
            return o.push(t), { dispose: () => {
              const l = o.indexOf(t);
              l !== -1 && o.splice(l, 1);
            } };
          }
          clearCsiHandler(s) {
            this._csiHandlers[this._identifier(s)] && delete this._csiHandlers[this._identifier(s)];
          }
          setCsiHandlerFallback(s) {
            this._csiHandlerFb = s;
          }
          registerDcsHandler(s, t) {
            return this._dcsParser.registerHandler(this._identifier(s), t);
          }
          clearDcsHandler(s) {
            this._dcsParser.clearHandler(this._identifier(s));
          }
          setDcsHandlerFallback(s) {
            this._dcsParser.setHandlerFallback(s);
          }
          registerOscHandler(s, t) {
            return this._oscParser.registerHandler(s, t);
          }
          clearOscHandler(s) {
            this._oscParser.clearHandler(s);
          }
          setOscHandlerFallback(s) {
            this._oscParser.setHandlerFallback(s);
          }
          setErrorHandler(s) {
            this._errorHandler = s;
          }
          clearErrorHandler() {
            this._errorHandler = this._errorHandlerFb;
          }
          reset() {
            this.currentState = this.initialState, this._oscParser.reset(), this._dcsParser.reset(), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0, this._parseStack.state !== 0 && (this._parseStack.state = 2, this._parseStack.handlers = []);
          }
          _preserveStack(s, t, i, o, l) {
            this._parseStack.state = s, this._parseStack.handlers = t, this._parseStack.handlerPos = i, this._parseStack.transition = o, this._parseStack.chunkPos = l;
          }
          parse(s, t, i) {
            let o, l = 0, v = 0, d = 0;
            if (this._parseStack.state) if (this._parseStack.state === 2) this._parseStack.state = 0, d = this._parseStack.chunkPos + 1;
            else {
              if (i === void 0 || this._parseStack.state === 1) throw this._parseStack.state = 1, /* @__PURE__ */ new Error("improper continuation due to previous async handler, giving up parsing");
              const h = this._parseStack.handlers;
              let m = this._parseStack.handlerPos - 1;
              switch (this._parseStack.state) {
                case 3:
                  if (i === !1 && m > -1) {
                    for (; m >= 0 && (o = h[m](this._params), o !== !0); m--) if (o instanceof Promise) return this._parseStack.handlerPos = m, o;
                  }
                  this._parseStack.handlers = [];
                  break;
                case 4:
                  if (i === !1 && m > -1) {
                    for (; m >= 0 && (o = h[m](), o !== !0); m--) if (o instanceof Promise) return this._parseStack.handlerPos = m, o;
                  }
                  this._parseStack.handlers = [];
                  break;
                case 6:
                  if (l = s[this._parseStack.chunkPos], o = this._dcsParser.unhook(l !== 24 && l !== 26, i), o) return o;
                  l === 27 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
                  break;
                case 5:
                  if (l = s[this._parseStack.chunkPos], o = this._oscParser.end(l !== 24 && l !== 26, i), o) return o;
                  l === 27 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
              }
              this._parseStack.state = 0, d = this._parseStack.chunkPos + 1, this.precedingCodepoint = 0, this.currentState = 15 & this._parseStack.transition;
            }
            for (let h = d; h < t; ++h) {
              switch (l = s[h], v = this._transitions.table[this.currentState << 8 | (l < 160 ? l : g)], v >> 4) {
                case 2:
                  for (let k = h + 1; ; ++k) {
                    if (k >= t || (l = s[k]) < 32 || l > 126 && l < g) {
                      this._printHandler(s, h, k), h = k - 1;
                      break;
                    }
                    if (++k >= t || (l = s[k]) < 32 || l > 126 && l < g) {
                      this._printHandler(s, h, k), h = k - 1;
                      break;
                    }
                    if (++k >= t || (l = s[k]) < 32 || l > 126 && l < g) {
                      this._printHandler(s, h, k), h = k - 1;
                      break;
                    }
                    if (++k >= t || (l = s[k]) < 32 || l > 126 && l < g) {
                      this._printHandler(s, h, k), h = k - 1;
                      break;
                    }
                  }
                  break;
                case 3:
                  this._executeHandlers[l] ? this._executeHandlers[l]() : this._executeHandlerFb(l), this.precedingCodepoint = 0;
                  break;
                case 0:
                  break;
                case 1:
                  if (this._errorHandler({
                    position: h,
                    code: l,
                    currentState: this.currentState,
                    collect: this._collect,
                    params: this._params,
                    abort: !1
                  }).abort) return;
                  break;
                case 7:
                  const m = this._csiHandlers[this._collect << 8 | l];
                  let E = m ? m.length - 1 : -1;
                  for (; E >= 0 && (o = m[E](this._params), o !== !0); E--) if (o instanceof Promise) return this._preserveStack(3, m, E, v, h), o;
                  E < 0 && this._csiHandlerFb(this._collect << 8 | l, this._params), this.precedingCodepoint = 0;
                  break;
                case 8:
                  do
                    switch (l) {
                      case 59:
                        this._params.addParam(0);
                        break;
                      case 58:
                        this._params.addSubParam(-1);
                        break;
                      default:
                        this._params.addDigit(l - 48);
                    }
                  while (++h < t && (l = s[h]) > 47 && l < 60);
                  h--;
                  break;
                case 9:
                  this._collect <<= 8, this._collect |= l;
                  break;
                case 10:
                  const x = this._escHandlers[this._collect << 8 | l];
                  let b = x ? x.length - 1 : -1;
                  for (; b >= 0 && (o = x[b](), o !== !0); b--) if (o instanceof Promise) return this._preserveStack(4, x, b, v, h), o;
                  b < 0 && this._escHandlerFb(this._collect << 8 | l), this.precedingCodepoint = 0;
                  break;
                case 11:
                  this._params.reset(), this._params.addParam(0), this._collect = 0;
                  break;
                case 12:
                  this._dcsParser.hook(this._collect << 8 | l, this._params);
                  break;
                case 13:
                  for (let k = h + 1; ; ++k) if (k >= t || (l = s[k]) === 24 || l === 26 || l === 27 || l > 127 && l < g) {
                    this._dcsParser.put(s, h, k), h = k - 1;
                    break;
                  }
                  break;
                case 14:
                  if (o = this._dcsParser.unhook(l !== 24 && l !== 26), o) return this._preserveStack(6, [], 0, v, h), o;
                  l === 27 && (v |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0;
                  break;
                case 4:
                  this._oscParser.start();
                  break;
                case 5:
                  for (let k = h + 1; ; k++) if (k >= t || (l = s[k]) < 32 || l > 127 && l < g) {
                    this._oscParser.put(s, h, k), h = k - 1;
                    break;
                  }
                  break;
                case 6:
                  if (o = this._oscParser.end(l !== 24 && l !== 26), o) return this._preserveStack(5, [], 0, v, h), o;
                  l === 27 && (v |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingCodepoint = 0;
              }
              this.currentState = 15 & v;
            }
          }
        }
        r.EscapeSequenceParser = _;
      },
      6242: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.OscHandler = r.OscParser = void 0;
        const c = a(5770), f = a(482), n = [];
        r.OscParser = class {
          constructor() {
            this._state = 0, this._active = n, this._id = -1, this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
            }, this._stack = {
              paused: !1,
              loopPosition: 0,
              fallThrough: !1
            };
          }
          registerHandler(u, p) {
            this._handlers[u] === void 0 && (this._handlers[u] = []);
            const g = this._handlers[u];
            return g.push(p), { dispose: () => {
              const _ = g.indexOf(p);
              _ !== -1 && g.splice(_, 1);
            } };
          }
          clearHandler(u) {
            this._handlers[u] && delete this._handlers[u];
          }
          setHandlerFallback(u) {
            this._handlerFb = u;
          }
          dispose() {
            this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
            }, this._active = n;
          }
          reset() {
            if (this._state === 2) for (let u = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; u >= 0; --u) this._active[u].end(!1);
            this._stack.paused = !1, this._active = n, this._id = -1, this._state = 0;
          }
          _start() {
            if (this._active = this._handlers[this._id] || n, this._active.length) for (let u = this._active.length - 1; u >= 0; u--) this._active[u].start();
            else this._handlerFb(this._id, "START");
          }
          _put(u, p, g) {
            if (this._active.length) for (let _ = this._active.length - 1; _ >= 0; _--) this._active[_].put(u, p, g);
            else this._handlerFb(this._id, "PUT", (0, f.utf32ToString)(u, p, g));
          }
          start() {
            this.reset(), this._state = 1;
          }
          put(u, p, g) {
            if (this._state !== 3) {
              if (this._state === 1) for (; p < g; ) {
                const _ = u[p++];
                if (_ === 59) {
                  this._state = 2, this._start();
                  break;
                }
                if (_ < 48 || 57 < _) return void (this._state = 3);
                this._id === -1 && (this._id = 0), this._id = 10 * this._id + _ - 48;
              }
              this._state === 2 && g - p > 0 && this._put(u, p, g);
            }
          }
          end(u, p = !0) {
            if (this._state !== 0) {
              if (this._state !== 3) if (this._state === 1 && this._start(), this._active.length) {
                let g = !1, _ = this._active.length - 1, e = !1;
                if (this._stack.paused && (_ = this._stack.loopPosition - 1, g = p, e = this._stack.fallThrough, this._stack.paused = !1), !e && g === !1) {
                  for (; _ >= 0 && (g = this._active[_].end(u), g !== !0); _--) if (g instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = _, this._stack.fallThrough = !1, g;
                  _--;
                }
                for (; _ >= 0; _--) if (g = this._active[_].end(!1), g instanceof Promise) return this._stack.paused = !0, this._stack.loopPosition = _, this._stack.fallThrough = !0, g;
              } else this._handlerFb(this._id, "END", u);
              this._active = n, this._id = -1, this._state = 0;
            }
          }
        }, r.OscHandler = class {
          constructor(u) {
            this._handler = u, this._data = "", this._hitLimit = !1;
          }
          start() {
            this._data = "", this._hitLimit = !1;
          }
          put(u, p, g) {
            this._hitLimit || (this._data += (0, f.utf32ToString)(u, p, g), this._data.length > c.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = !0));
          }
          end(u) {
            let p = !1;
            if (this._hitLimit) p = !1;
            else if (u && (p = this._handler(this._data), p instanceof Promise)) return p.then(((g) => (this._data = "", this._hitLimit = !1, g)));
            return this._data = "", this._hitLimit = !1, p;
          }
        };
      },
      8742: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.Params = void 0;
        const a = 2147483647;
        class c {
          static fromArray(n) {
            const u = new c();
            if (!n.length) return u;
            for (let p = Array.isArray(n[0]) ? 1 : 0; p < n.length; ++p) {
              const g = n[p];
              if (Array.isArray(g)) for (let _ = 0; _ < g.length; ++_) u.addSubParam(g[_]);
              else u.addParam(g);
            }
            return u;
          }
          constructor(n = 32, u = 32) {
            if (this.maxLength = n, this.maxSubParamsLength = u, u > 256) throw new Error("maxSubParamsLength must not be greater than 256");
            this.params = new Int32Array(n), this.length = 0, this._subParams = new Int32Array(u), this._subParamsLength = 0, this._subParamsIdx = new Uint16Array(n), this._rejectDigits = !1, this._rejectSubDigits = !1, this._digitIsSub = !1;
          }
          clone() {
            const n = new c(this.maxLength, this.maxSubParamsLength);
            return n.params.set(this.params), n.length = this.length, n._subParams.set(this._subParams), n._subParamsLength = this._subParamsLength, n._subParamsIdx.set(this._subParamsIdx), n._rejectDigits = this._rejectDigits, n._rejectSubDigits = this._rejectSubDigits, n._digitIsSub = this._digitIsSub, n;
          }
          toArray() {
            const n = [];
            for (let u = 0; u < this.length; ++u) {
              n.push(this.params[u]);
              const p = this._subParamsIdx[u] >> 8, g = 255 & this._subParamsIdx[u];
              g - p > 0 && n.push(Array.prototype.slice.call(this._subParams, p, g));
            }
            return n;
          }
          reset() {
            this.length = 0, this._subParamsLength = 0, this._rejectDigits = !1, this._rejectSubDigits = !1, this._digitIsSub = !1;
          }
          addParam(n) {
            if (this._digitIsSub = !1, this.length >= this.maxLength) this._rejectDigits = !0;
            else {
              if (n < -1) throw new Error("values lesser than -1 are not allowed");
              this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength, this.params[this.length++] = n > a ? a : n;
            }
          }
          addSubParam(n) {
            if (this._digitIsSub = !0, this.length) if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) this._rejectSubDigits = !0;
            else {
              if (n < -1) throw new Error("values lesser than -1 are not allowed");
              this._subParams[this._subParamsLength++] = n > a ? a : n, this._subParamsIdx[this.length - 1]++;
            }
          }
          hasSubParams(n) {
            return (255 & this._subParamsIdx[n]) - (this._subParamsIdx[n] >> 8) > 0;
          }
          getSubParams(n) {
            const u = this._subParamsIdx[n] >> 8, p = 255 & this._subParamsIdx[n];
            return p - u > 0 ? this._subParams.subarray(u, p) : null;
          }
          getSubParamsAll() {
            const n = {};
            for (let u = 0; u < this.length; ++u) {
              const p = this._subParamsIdx[u] >> 8, g = 255 & this._subParamsIdx[u];
              g - p > 0 && (n[u] = this._subParams.slice(p, g));
            }
            return n;
          }
          addDigit(n) {
            let u;
            if (this._rejectDigits || !(u = this._digitIsSub ? this._subParamsLength : this.length) || this._digitIsSub && this._rejectSubDigits) return;
            const p = this._digitIsSub ? this._subParams : this.params, g = p[u - 1];
            p[u - 1] = ~g ? Math.min(10 * g + n, a) : n;
          }
        }
        r.Params = c;
      },
      5741: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.AddonManager = void 0, r.AddonManager = class {
          constructor() {
            this._addons = [];
          }
          dispose() {
            for (let a = this._addons.length - 1; a >= 0; a--) this._addons[a].instance.dispose();
          }
          loadAddon(a, c) {
            const f = {
              instance: c,
              dispose: c.dispose,
              isDisposed: !1
            };
            this._addons.push(f), c.dispose = () => this._wrappedAddonDispose(f), c.activate(a);
          }
          _wrappedAddonDispose(a) {
            if (a.isDisposed) return;
            let c = -1;
            for (let f = 0; f < this._addons.length; f++) if (this._addons[f] === a) {
              c = f;
              break;
            }
            if (c === -1) throw new Error("Could not dispose an addon that has not been loaded");
            a.isDisposed = !0, a.dispose.apply(a.instance), this._addons.splice(c, 1);
          }
        };
      },
      8771: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferApiView = void 0;
        const c = a(3785), f = a(511);
        r.BufferApiView = class {
          constructor(n, u) {
            this._buffer = n, this.type = u;
          }
          init(n) {
            return this._buffer = n, this;
          }
          get cursorY() {
            return this._buffer.y;
          }
          get cursorX() {
            return this._buffer.x;
          }
          get viewportY() {
            return this._buffer.ydisp;
          }
          get baseY() {
            return this._buffer.ybase;
          }
          get length() {
            return this._buffer.lines.length;
          }
          getLine(n) {
            const u = this._buffer.lines.get(n);
            if (u) return new c.BufferLineApiView(u);
          }
          getNullCell() {
            return new f.CellData();
          }
        };
      },
      3785: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferLineApiView = void 0;
        const c = a(511);
        r.BufferLineApiView = class {
          constructor(f) {
            this._line = f;
          }
          get isWrapped() {
            return this._line.isWrapped;
          }
          get length() {
            return this._line.length;
          }
          getCell(f, n) {
            if (!(f < 0 || f >= this._line.length)) return n ? (this._line.loadCell(f, n), n) : this._line.loadCell(f, new c.CellData());
          }
          translateToString(f, n, u) {
            return this._line.translateToString(f, n, u);
          }
        };
      },
      8285: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferNamespaceApi = void 0;
        const c = a(8771), f = a(8460), n = a(844);
        class u extends n.Disposable {
          constructor(g) {
            super(), this._core = g, this._onBufferChange = this.register(new f.EventEmitter()), this.onBufferChange = this._onBufferChange.event, this._normal = new c.BufferApiView(this._core.buffers.normal, "normal"), this._alternate = new c.BufferApiView(this._core.buffers.alt, "alternate"), this._core.buffers.onBufferActivate((() => this._onBufferChange.fire(this.active)));
          }
          get active() {
            if (this._core.buffers.active === this._core.buffers.normal) return this.normal;
            if (this._core.buffers.active === this._core.buffers.alt) return this.alternate;
            throw new Error("Active buffer is neither normal nor alternate");
          }
          get normal() {
            return this._normal.init(this._core.buffers.normal);
          }
          get alternate() {
            return this._alternate.init(this._core.buffers.alt);
          }
        }
        r.BufferNamespaceApi = u;
      },
      7975: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.ParserApi = void 0, r.ParserApi = class {
          constructor(a) {
            this._core = a;
          }
          registerCsiHandler(a, c) {
            return this._core.registerCsiHandler(a, ((f) => c(f.toArray())));
          }
          addCsiHandler(a, c) {
            return this.registerCsiHandler(a, c);
          }
          registerDcsHandler(a, c) {
            return this._core.registerDcsHandler(a, ((f, n) => c(f, n.toArray())));
          }
          addDcsHandler(a, c) {
            return this.registerDcsHandler(a, c);
          }
          registerEscHandler(a, c) {
            return this._core.registerEscHandler(a, c);
          }
          addEscHandler(a, c) {
            return this.registerEscHandler(a, c);
          }
          registerOscHandler(a, c) {
            return this._core.registerOscHandler(a, c);
          }
          addOscHandler(a, c) {
            return this.registerOscHandler(a, c);
          }
        };
      },
      7090: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.UnicodeApi = void 0, r.UnicodeApi = class {
          constructor(a) {
            this._core = a;
          }
          register(a) {
            this._core.unicodeService.register(a);
          }
          get versions() {
            return this._core.unicodeService.versions;
          }
          get activeVersion() {
            return this._core.unicodeService.activeVersion;
          }
          set activeVersion(a) {
            this._core.unicodeService.activeVersion = a;
          }
        };
      },
      744: function(O, r, a) {
        var c = this && this.__decorate || function(e, s, t, i) {
          var o, l = arguments.length, v = l < 3 ? s : i === null ? i = Object.getOwnPropertyDescriptor(s, t) : i;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") v = Reflect.decorate(e, s, t, i);
          else for (var d = e.length - 1; d >= 0; d--) (o = e[d]) && (v = (l < 3 ? o(v) : l > 3 ? o(s, t, v) : o(s, t)) || v);
          return l > 3 && v && Object.defineProperty(s, t, v), v;
        }, f = this && this.__param || function(e, s) {
          return function(t, i) {
            s(t, i, e);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.BufferService = r.MINIMUM_ROWS = r.MINIMUM_COLS = void 0;
        const n = a(8460), u = a(844), p = a(5295), g = a(2585);
        r.MINIMUM_COLS = 2, r.MINIMUM_ROWS = 1;
        let _ = r.BufferService = class extends u.Disposable {
          get buffer() {
            return this.buffers.active;
          }
          constructor(e) {
            super(), this.isUserScrolling = !1, this._onResize = this.register(new n.EventEmitter()), this.onResize = this._onResize.event, this._onScroll = this.register(new n.EventEmitter()), this.onScroll = this._onScroll.event, this.cols = Math.max(e.rawOptions.cols || 0, r.MINIMUM_COLS), this.rows = Math.max(e.rawOptions.rows || 0, r.MINIMUM_ROWS), this.buffers = this.register(new p.BufferSet(e, this));
          }
          resize(e, s) {
            this.cols = e, this.rows = s, this.buffers.resize(e, s), this._onResize.fire({
              cols: e,
              rows: s
            });
          }
          reset() {
            this.buffers.reset(), this.isUserScrolling = !1;
          }
          scroll(e, s = !1) {
            const t = this.buffer;
            let i;
            i = this._cachedBlankLine, i && i.length === this.cols && i.getFg(0) === e.fg && i.getBg(0) === e.bg || (i = t.getBlankLine(e, s), this._cachedBlankLine = i), i.isWrapped = s;
            const o = t.ybase + t.scrollTop, l = t.ybase + t.scrollBottom;
            if (t.scrollTop === 0) {
              const v = t.lines.isFull;
              l === t.lines.length - 1 ? v ? t.lines.recycle().copyFrom(i) : t.lines.push(i.clone()) : t.lines.splice(l + 1, 0, i.clone()), v ? this.isUserScrolling && (t.ydisp = Math.max(t.ydisp - 1, 0)) : (t.ybase++, this.isUserScrolling || t.ydisp++);
            } else {
              const v = l - o + 1;
              t.lines.shiftElements(o + 1, v - 1, -1), t.lines.set(l, i.clone());
            }
            this.isUserScrolling || (t.ydisp = t.ybase), this._onScroll.fire(t.ydisp);
          }
          scrollLines(e, s, t) {
            const i = this.buffer;
            if (e < 0) {
              if (i.ydisp === 0) return;
              this.isUserScrolling = !0;
            } else e + i.ydisp >= i.ybase && (this.isUserScrolling = !1);
            const o = i.ydisp;
            i.ydisp = Math.max(Math.min(i.ydisp + e, i.ybase), 0), o !== i.ydisp && (s || this._onScroll.fire(i.ydisp));
          }
        };
        r.BufferService = _ = c([f(0, g.IOptionsService)], _);
      },
      7994: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CharsetService = void 0, r.CharsetService = class {
          constructor() {
            this.glevel = 0, this._charsets = [];
          }
          reset() {
            this.charset = void 0, this._charsets = [], this.glevel = 0;
          }
          setgLevel(a) {
            this.glevel = a, this.charset = this._charsets[a];
          }
          setgCharset(a, c) {
            this._charsets[a] = c, this.glevel === a && (this.charset = c);
          }
        };
      },
      1753: function(O, r, a) {
        var c = this && this.__decorate || function(i, o, l, v) {
          var d, h = arguments.length, m = h < 3 ? o : v === null ? v = Object.getOwnPropertyDescriptor(o, l) : v;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") m = Reflect.decorate(i, o, l, v);
          else for (var E = i.length - 1; E >= 0; E--) (d = i[E]) && (m = (h < 3 ? d(m) : h > 3 ? d(o, l, m) : d(o, l)) || m);
          return h > 3 && m && Object.defineProperty(o, l, m), m;
        }, f = this && this.__param || function(i, o) {
          return function(l, v) {
            o(l, v, i);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CoreMouseService = void 0;
        const n = a(2585), u = a(8460), p = a(844), g = {
          NONE: {
            events: 0,
            restrict: () => !1
          },
          X10: {
            events: 1,
            restrict: (i) => i.button !== 4 && i.action === 1 && (i.ctrl = !1, i.alt = !1, i.shift = !1, !0)
          },
          VT200: {
            events: 19,
            restrict: (i) => i.action !== 32
          },
          DRAG: {
            events: 23,
            restrict: (i) => i.action !== 32 || i.button !== 3
          },
          ANY: {
            events: 31,
            restrict: (i) => !0
          }
        };
        function _(i, o) {
          let l = (i.ctrl ? 16 : 0) | (i.shift ? 4 : 0) | (i.alt ? 8 : 0);
          return i.button === 4 ? (l |= 64, l |= i.action) : (l |= 3 & i.button, 4 & i.button && (l |= 64), 8 & i.button && (l |= 128), i.action === 32 ? l |= 32 : i.action !== 0 || o || (l |= 3)), l;
        }
        const e = String.fromCharCode, s = {
          DEFAULT: (i) => {
            const o = [
              _(i, !1) + 32,
              i.col + 32,
              i.row + 32
            ];
            return o[0] > 255 || o[1] > 255 || o[2] > 255 ? "" : `\x1B[M${e(o[0])}${e(o[1])}${e(o[2])}`;
          },
          SGR: (i) => {
            const o = i.action === 0 && i.button !== 4 ? "m" : "M";
            return `\x1B[<${_(i, !0)};${i.col};${i.row}${o}`;
          },
          SGR_PIXELS: (i) => {
            const o = i.action === 0 && i.button !== 4 ? "m" : "M";
            return `\x1B[<${_(i, !0)};${i.x};${i.y}${o}`;
          }
        };
        let t = r.CoreMouseService = class extends p.Disposable {
          constructor(i, o) {
            super(), this._bufferService = i, this._coreService = o, this._protocols = {}, this._encodings = {}, this._activeProtocol = "", this._activeEncoding = "", this._lastEvent = null, this._onProtocolChange = this.register(new u.EventEmitter()), this.onProtocolChange = this._onProtocolChange.event;
            for (const l of Object.keys(g)) this.addProtocol(l, g[l]);
            for (const l of Object.keys(s)) this.addEncoding(l, s[l]);
            this.reset();
          }
          addProtocol(i, o) {
            this._protocols[i] = o;
          }
          addEncoding(i, o) {
            this._encodings[i] = o;
          }
          get activeProtocol() {
            return this._activeProtocol;
          }
          get areMouseEventsActive() {
            return this._protocols[this._activeProtocol].events !== 0;
          }
          set activeProtocol(i) {
            if (!this._protocols[i]) throw new Error(`unknown protocol "${i}"`);
            this._activeProtocol = i, this._onProtocolChange.fire(this._protocols[i].events);
          }
          get activeEncoding() {
            return this._activeEncoding;
          }
          set activeEncoding(i) {
            if (!this._encodings[i]) throw new Error(`unknown encoding "${i}"`);
            this._activeEncoding = i;
          }
          reset() {
            this.activeProtocol = "NONE", this.activeEncoding = "DEFAULT", this._lastEvent = null;
          }
          triggerMouseEvent(i) {
            if (i.col < 0 || i.col >= this._bufferService.cols || i.row < 0 || i.row >= this._bufferService.rows || i.button === 4 && i.action === 32 || i.button === 3 && i.action !== 32 || i.button !== 4 && (i.action === 2 || i.action === 3) || (i.col++, i.row++, i.action === 32 && this._lastEvent && this._equalEvents(this._lastEvent, i, this._activeEncoding === "SGR_PIXELS")) || !this._protocols[this._activeProtocol].restrict(i)) return !1;
            const o = this._encodings[this._activeEncoding](i);
            return o && (this._activeEncoding === "DEFAULT" ? this._coreService.triggerBinaryEvent(o) : this._coreService.triggerDataEvent(o, !0)), this._lastEvent = i, !0;
          }
          explainEvents(i) {
            return {
              down: !!(1 & i),
              up: !!(2 & i),
              drag: !!(4 & i),
              move: !!(8 & i),
              wheel: !!(16 & i)
            };
          }
          _equalEvents(i, o, l) {
            if (l) {
              if (i.x !== o.x || i.y !== o.y) return !1;
            } else if (i.col !== o.col || i.row !== o.row) return !1;
            return i.button === o.button && i.action === o.action && i.ctrl === o.ctrl && i.alt === o.alt && i.shift === o.shift;
          }
        };
        r.CoreMouseService = t = c([f(0, n.IBufferService), f(1, n.ICoreService)], t);
      },
      6975: function(O, r, a) {
        var c = this && this.__decorate || function(t, i, o, l) {
          var v, d = arguments.length, h = d < 3 ? i : l === null ? l = Object.getOwnPropertyDescriptor(i, o) : l;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") h = Reflect.decorate(t, i, o, l);
          else for (var m = t.length - 1; m >= 0; m--) (v = t[m]) && (h = (d < 3 ? v(h) : d > 3 ? v(i, o, h) : v(i, o)) || h);
          return d > 3 && h && Object.defineProperty(i, o, h), h;
        }, f = this && this.__param || function(t, i) {
          return function(o, l) {
            i(o, l, t);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.CoreService = void 0;
        const n = a(1439), u = a(8460), p = a(844), g = a(2585), _ = Object.freeze({ insertMode: !1 }), e = Object.freeze({
          applicationCursorKeys: !1,
          applicationKeypad: !1,
          bracketedPasteMode: !1,
          origin: !1,
          reverseWraparound: !1,
          sendFocus: !1,
          wraparound: !0
        });
        let s = r.CoreService = class extends p.Disposable {
          constructor(t, i, o) {
            super(), this._bufferService = t, this._logService = i, this._optionsService = o, this.isCursorInitialized = !1, this.isCursorHidden = !1, this._onData = this.register(new u.EventEmitter()), this.onData = this._onData.event, this._onUserInput = this.register(new u.EventEmitter()), this.onUserInput = this._onUserInput.event, this._onBinary = this.register(new u.EventEmitter()), this.onBinary = this._onBinary.event, this._onRequestScrollToBottom = this.register(new u.EventEmitter()), this.onRequestScrollToBottom = this._onRequestScrollToBottom.event, this.modes = (0, n.clone)(_), this.decPrivateModes = (0, n.clone)(e);
          }
          reset() {
            this.modes = (0, n.clone)(_), this.decPrivateModes = (0, n.clone)(e);
          }
          triggerDataEvent(t, i = !1) {
            if (this._optionsService.rawOptions.disableStdin) return;
            const o = this._bufferService.buffer;
            i && this._optionsService.rawOptions.scrollOnUserInput && o.ybase !== o.ydisp && this._onRequestScrollToBottom.fire(), i && this._onUserInput.fire(), this._logService.debug(`sending data "${t}"`, (() => t.split("").map(((l) => l.charCodeAt(0))))), this._onData.fire(t);
          }
          triggerBinaryEvent(t) {
            this._optionsService.rawOptions.disableStdin || (this._logService.debug(`sending binary "${t}"`, (() => t.split("").map(((i) => i.charCodeAt(0))))), this._onBinary.fire(t));
          }
        };
        r.CoreService = s = c([
          f(0, g.IBufferService),
          f(1, g.ILogService),
          f(2, g.IOptionsService)
        ], s);
      },
      9074: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.DecorationService = void 0;
        const c = a(8055), f = a(8460), n = a(844), u = a(6106);
        let p = 0, g = 0;
        class _ extends n.Disposable {
          get decorations() {
            return this._decorations.values();
          }
          constructor() {
            super(), this._decorations = new u.SortedList(((t) => t?.marker.line)), this._onDecorationRegistered = this.register(new f.EventEmitter()), this.onDecorationRegistered = this._onDecorationRegistered.event, this._onDecorationRemoved = this.register(new f.EventEmitter()), this.onDecorationRemoved = this._onDecorationRemoved.event, this.register((0, n.toDisposable)((() => this.reset())));
          }
          registerDecoration(t) {
            if (t.marker.isDisposed) return;
            const i = new e(t);
            if (i) {
              const o = i.marker.onDispose((() => i.dispose()));
              i.onDispose((() => {
                i && (this._decorations.delete(i) && this._onDecorationRemoved.fire(i), o.dispose());
              })), this._decorations.insert(i), this._onDecorationRegistered.fire(i);
            }
            return i;
          }
          reset() {
            for (const t of this._decorations.values()) t.dispose();
            this._decorations.clear();
          }
          *getDecorationsAtCell(t, i, o) {
            var l, v, d;
            let h = 0, m = 0;
            for (const E of this._decorations.getKeyIterator(i)) h = (l = E.options.x) !== null && l !== void 0 ? l : 0, m = h + ((v = E.options.width) !== null && v !== void 0 ? v : 1), t >= h && t < m && (!o || ((d = E.options.layer) !== null && d !== void 0 ? d : "bottom") === o) && (yield E);
          }
          forEachDecorationAtCell(t, i, o, l) {
            this._decorations.forEachByKey(i, ((v) => {
              var d, h, m;
              p = (d = v.options.x) !== null && d !== void 0 ? d : 0, g = p + ((h = v.options.width) !== null && h !== void 0 ? h : 1), t >= p && t < g && (!o || ((m = v.options.layer) !== null && m !== void 0 ? m : "bottom") === o) && l(v);
            }));
          }
        }
        r.DecorationService = _;
        class e extends n.Disposable {
          get isDisposed() {
            return this._isDisposed;
          }
          get backgroundColorRGB() {
            return this._cachedBg === null && (this.options.backgroundColor ? this._cachedBg = c.css.toColor(this.options.backgroundColor) : this._cachedBg = void 0), this._cachedBg;
          }
          get foregroundColorRGB() {
            return this._cachedFg === null && (this.options.foregroundColor ? this._cachedFg = c.css.toColor(this.options.foregroundColor) : this._cachedFg = void 0), this._cachedFg;
          }
          constructor(t) {
            super(), this.options = t, this.onRenderEmitter = this.register(new f.EventEmitter()), this.onRender = this.onRenderEmitter.event, this._onDispose = this.register(new f.EventEmitter()), this.onDispose = this._onDispose.event, this._cachedBg = null, this._cachedFg = null, this.marker = t.marker, this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position && (this.options.overviewRulerOptions.position = "full");
          }
          dispose() {
            this._onDispose.fire(), super.dispose();
          }
        }
      },
      4348: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.InstantiationService = r.ServiceCollection = void 0;
        const c = a(2585), f = a(8343);
        class n {
          constructor(...p) {
            this._entries = /* @__PURE__ */ new Map();
            for (const [g, _] of p) this.set(g, _);
          }
          set(p, g) {
            const _ = this._entries.get(p);
            return this._entries.set(p, g), _;
          }
          forEach(p) {
            for (const [g, _] of this._entries.entries()) p(g, _);
          }
          has(p) {
            return this._entries.has(p);
          }
          get(p) {
            return this._entries.get(p);
          }
        }
        r.ServiceCollection = n, r.InstantiationService = class {
          constructor() {
            this._services = new n(), this._services.set(c.IInstantiationService, this);
          }
          setService(u, p) {
            this._services.set(u, p);
          }
          getService(u) {
            return this._services.get(u);
          }
          createInstance(u, ...p) {
            const g = (0, f.getServiceDependencies)(u).sort(((s, t) => s.index - t.index)), _ = [];
            for (const s of g) {
              const t = this._services.get(s.id);
              if (!t) throw new Error(`[createInstance] ${u.name} depends on UNKNOWN service ${s.id}.`);
              _.push(t);
            }
            const e = g.length > 0 ? g[0].index : p.length;
            if (p.length !== e) throw new Error(`[createInstance] First service dependency of ${u.name} at position ${e + 1} conflicts with ${p.length} static arguments`);
            return new u(...p, ..._);
          }
        };
      },
      7866: function(O, r, a) {
        var c = this && this.__decorate || function(e, s, t, i) {
          var o, l = arguments.length, v = l < 3 ? s : i === null ? i = Object.getOwnPropertyDescriptor(s, t) : i;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") v = Reflect.decorate(e, s, t, i);
          else for (var d = e.length - 1; d >= 0; d--) (o = e[d]) && (v = (l < 3 ? o(v) : l > 3 ? o(s, t, v) : o(s, t)) || v);
          return l > 3 && v && Object.defineProperty(s, t, v), v;
        }, f = this && this.__param || function(e, s) {
          return function(t, i) {
            s(t, i, e);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.traceCall = r.setTraceLogger = r.LogService = void 0;
        const n = a(844), u = a(2585), p = {
          trace: u.LogLevelEnum.TRACE,
          debug: u.LogLevelEnum.DEBUG,
          info: u.LogLevelEnum.INFO,
          warn: u.LogLevelEnum.WARN,
          error: u.LogLevelEnum.ERROR,
          off: u.LogLevelEnum.OFF
        };
        let g, _ = r.LogService = class extends n.Disposable {
          get logLevel() {
            return this._logLevel;
          }
          constructor(e) {
            super(), this._optionsService = e, this._logLevel = u.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", (() => this._updateLogLevel()))), g = this;
          }
          _updateLogLevel() {
            this._logLevel = p[this._optionsService.rawOptions.logLevel];
          }
          _evalLazyOptionalParams(e) {
            for (let s = 0; s < e.length; s++) typeof e[s] == "function" && (e[s] = e[s]());
          }
          _log(e, s, t) {
            this._evalLazyOptionalParams(t), e.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + s, ...t);
          }
          trace(e, ...s) {
            var t, i;
            this._logLevel <= u.LogLevelEnum.TRACE && this._log((i = (t = this._optionsService.options.logger) === null || t === void 0 ? void 0 : t.trace.bind(this._optionsService.options.logger)) !== null && i !== void 0 ? i : console.log, e, s);
          }
          debug(e, ...s) {
            var t, i;
            this._logLevel <= u.LogLevelEnum.DEBUG && this._log((i = (t = this._optionsService.options.logger) === null || t === void 0 ? void 0 : t.debug.bind(this._optionsService.options.logger)) !== null && i !== void 0 ? i : console.log, e, s);
          }
          info(e, ...s) {
            var t, i;
            this._logLevel <= u.LogLevelEnum.INFO && this._log((i = (t = this._optionsService.options.logger) === null || t === void 0 ? void 0 : t.info.bind(this._optionsService.options.logger)) !== null && i !== void 0 ? i : console.info, e, s);
          }
          warn(e, ...s) {
            var t, i;
            this._logLevel <= u.LogLevelEnum.WARN && this._log((i = (t = this._optionsService.options.logger) === null || t === void 0 ? void 0 : t.warn.bind(this._optionsService.options.logger)) !== null && i !== void 0 ? i : console.warn, e, s);
          }
          error(e, ...s) {
            var t, i;
            this._logLevel <= u.LogLevelEnum.ERROR && this._log((i = (t = this._optionsService.options.logger) === null || t === void 0 ? void 0 : t.error.bind(this._optionsService.options.logger)) !== null && i !== void 0 ? i : console.error, e, s);
          }
        };
        r.LogService = _ = c([f(0, u.IOptionsService)], _), r.setTraceLogger = function(e) {
          g = e;
        }, r.traceCall = function(e, s, t) {
          if (typeof t.value != "function") throw new Error("not supported");
          const i = t.value;
          t.value = function(...o) {
            if (g.logLevel !== u.LogLevelEnum.TRACE) return i.apply(this, o);
            g.trace(`GlyphRenderer#${i.name}(${o.map(((v) => JSON.stringify(v))).join(", ")})`);
            const l = i.apply(this, o);
            return g.trace(`GlyphRenderer#${i.name} return`, l), l;
          };
        };
      },
      7302: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.OptionsService = r.DEFAULT_OPTIONS = void 0;
        const c = a(8460), f = a(844);
        r.DEFAULT_OPTIONS = {
          cols: 80,
          rows: 24,
          cursorBlink: !1,
          cursorStyle: "block",
          cursorWidth: 1,
          cursorInactiveStyle: "outline",
          customGlyphs: !0,
          drawBoldTextInBrightColors: !0,
          fastScrollModifier: "alt",
          fastScrollSensitivity: 5,
          fontFamily: "courier-new, courier, monospace",
          fontSize: 15,
          fontWeight: "normal",
          fontWeightBold: "bold",
          ignoreBracketedPasteMode: !1,
          lineHeight: 1,
          letterSpacing: 0,
          linkHandler: null,
          logLevel: "info",
          logger: null,
          scrollback: 1e3,
          scrollOnUserInput: !0,
          scrollSensitivity: 1,
          screenReaderMode: !1,
          smoothScrollDuration: 0,
          macOptionIsMeta: !1,
          macOptionClickForcesSelection: !1,
          minimumContrastRatio: 1,
          disableStdin: !1,
          allowProposedApi: !1,
          allowTransparency: !1,
          tabStopWidth: 8,
          theme: {},
          rightClickSelectsWord: a(6114).isMac,
          windowOptions: {},
          windowsMode: !1,
          windowsPty: {},
          wordSeparator: " ()[]{}',\"`",
          altClickMovesCursor: !0,
          convertEol: !1,
          termName: "xterm",
          cancelEvents: !1,
          overviewRulerWidth: 0
        };
        const n = [
          "normal",
          "bold",
          "100",
          "200",
          "300",
          "400",
          "500",
          "600",
          "700",
          "800",
          "900"
        ];
        class u extends f.Disposable {
          constructor(g) {
            super(), this._onOptionChange = this.register(new c.EventEmitter()), this.onOptionChange = this._onOptionChange.event;
            const _ = Object.assign({}, r.DEFAULT_OPTIONS);
            for (const e in g) if (e in _) try {
              const s = g[e];
              _[e] = this._sanitizeAndValidateOption(e, s);
            } catch (s) {
              console.error(s);
            }
            this.rawOptions = _, this.options = Object.assign({}, _), this._setupOptions();
          }
          onSpecificOptionChange(g, _) {
            return this.onOptionChange(((e) => {
              e === g && _(this.rawOptions[g]);
            }));
          }
          onMultipleOptionChange(g, _) {
            return this.onOptionChange(((e) => {
              g.indexOf(e) !== -1 && _();
            }));
          }
          _setupOptions() {
            const g = (e) => {
              if (!(e in r.DEFAULT_OPTIONS)) throw new Error(`No option with key "${e}"`);
              return this.rawOptions[e];
            }, _ = (e, s) => {
              if (!(e in r.DEFAULT_OPTIONS)) throw new Error(`No option with key "${e}"`);
              s = this._sanitizeAndValidateOption(e, s), this.rawOptions[e] !== s && (this.rawOptions[e] = s, this._onOptionChange.fire(e));
            };
            for (const e in this.rawOptions) {
              const s = {
                get: g.bind(this, e),
                set: _.bind(this, e)
              };
              Object.defineProperty(this.options, e, s);
            }
          }
          _sanitizeAndValidateOption(g, _) {
            switch (g) {
              case "cursorStyle":
                if (_ || (_ = r.DEFAULT_OPTIONS[g]), !/* @__PURE__ */ (function(e) {
                  return e === "block" || e === "underline" || e === "bar";
                })(_)) throw new Error(`"${_}" is not a valid value for ${g}`);
                break;
              case "wordSeparator":
                _ || (_ = r.DEFAULT_OPTIONS[g]);
                break;
              case "fontWeight":
              case "fontWeightBold":
                if (typeof _ == "number" && 1 <= _ && _ <= 1e3) break;
                _ = n.includes(_) ? _ : r.DEFAULT_OPTIONS[g];
                break;
              case "cursorWidth":
                _ = Math.floor(_);
              case "lineHeight":
              case "tabStopWidth":
                if (_ < 1) throw new Error(`${g} cannot be less than 1, value: ${_}`);
                break;
              case "minimumContrastRatio":
                _ = Math.max(1, Math.min(21, Math.round(10 * _) / 10));
                break;
              case "scrollback":
                if ((_ = Math.min(_, 4294967295)) < 0) throw new Error(`${g} cannot be less than 0, value: ${_}`);
                break;
              case "fastScrollSensitivity":
              case "scrollSensitivity":
                if (_ <= 0) throw new Error(`${g} cannot be less than or equal to 0, value: ${_}`);
                break;
              case "rows":
              case "cols":
                if (!_ && _ !== 0) throw new Error(`${g} must be numeric, value: ${_}`);
                break;
              case "windowsPty":
                _ = _ ?? {};
            }
            return _;
          }
        }
        r.OptionsService = u;
      },
      2660: function(O, r, a) {
        var c = this && this.__decorate || function(p, g, _, e) {
          var s, t = arguments.length, i = t < 3 ? g : e === null ? e = Object.getOwnPropertyDescriptor(g, _) : e;
          if (typeof Reflect == "object" && typeof Reflect.decorate == "function") i = Reflect.decorate(p, g, _, e);
          else for (var o = p.length - 1; o >= 0; o--) (s = p[o]) && (i = (t < 3 ? s(i) : t > 3 ? s(g, _, i) : s(g, _)) || i);
          return t > 3 && i && Object.defineProperty(g, _, i), i;
        }, f = this && this.__param || function(p, g) {
          return function(_, e) {
            g(_, e, p);
          };
        };
        Object.defineProperty(r, "__esModule", { value: !0 }), r.OscLinkService = void 0;
        const n = a(2585);
        let u = r.OscLinkService = class {
          constructor(p) {
            this._bufferService = p, this._nextId = 1, this._entriesWithId = /* @__PURE__ */ new Map(), this._dataByLinkId = /* @__PURE__ */ new Map();
          }
          registerLink(p) {
            const g = this._bufferService.buffer;
            if (p.id === void 0) {
              const o = g.addMarker(g.ybase + g.y), l = {
                data: p,
                id: this._nextId++,
                lines: [o]
              };
              return o.onDispose((() => this._removeMarkerFromLink(l, o))), this._dataByLinkId.set(l.id, l), l.id;
            }
            const _ = p, e = this._getEntryIdKey(_), s = this._entriesWithId.get(e);
            if (s) return this.addLineToLink(s.id, g.ybase + g.y), s.id;
            const t = g.addMarker(g.ybase + g.y), i = {
              id: this._nextId++,
              key: this._getEntryIdKey(_),
              data: _,
              lines: [t]
            };
            return t.onDispose((() => this._removeMarkerFromLink(i, t))), this._entriesWithId.set(i.key, i), this._dataByLinkId.set(i.id, i), i.id;
          }
          addLineToLink(p, g) {
            const _ = this._dataByLinkId.get(p);
            if (_ && _.lines.every(((e) => e.line !== g))) {
              const e = this._bufferService.buffer.addMarker(g);
              _.lines.push(e), e.onDispose((() => this._removeMarkerFromLink(_, e)));
            }
          }
          getLinkData(p) {
            var g;
            return (g = this._dataByLinkId.get(p)) === null || g === void 0 ? void 0 : g.data;
          }
          _getEntryIdKey(p) {
            return `${p.id};;${p.uri}`;
          }
          _removeMarkerFromLink(p, g) {
            const _ = p.lines.indexOf(g);
            _ !== -1 && (p.lines.splice(_, 1), p.lines.length === 0 && (p.data.id !== void 0 && this._entriesWithId.delete(p.key), this._dataByLinkId.delete(p.id)));
          }
        };
        r.OscLinkService = u = c([f(0, n.IBufferService)], u);
      },
      8343: (O, r) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.createDecorator = r.getServiceDependencies = r.serviceRegistry = void 0;
        const a = "di$target", c = "di$dependencies";
        r.serviceRegistry = /* @__PURE__ */ new Map(), r.getServiceDependencies = function(f) {
          return f[c] || [];
        }, r.createDecorator = function(f) {
          if (r.serviceRegistry.has(f)) return r.serviceRegistry.get(f);
          const n = function(u, p, g) {
            if (arguments.length !== 3) throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
            (function(_, e, s) {
              e[a] === e ? e[c].push({
                id: _,
                index: s
              }) : (e[c] = [{
                id: _,
                index: s
              }], e[a] = e);
            })(n, u, g);
          };
          return n.toString = () => f, r.serviceRegistry.set(f, n), n;
        };
      },
      2585: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.IDecorationService = r.IUnicodeService = r.IOscLinkService = r.IOptionsService = r.ILogService = r.LogLevelEnum = r.IInstantiationService = r.ICharsetService = r.ICoreService = r.ICoreMouseService = r.IBufferService = void 0;
        const c = a(8343);
        var f;
        r.IBufferService = (0, c.createDecorator)("BufferService"), r.ICoreMouseService = (0, c.createDecorator)("CoreMouseService"), r.ICoreService = (0, c.createDecorator)("CoreService"), r.ICharsetService = (0, c.createDecorator)("CharsetService"), r.IInstantiationService = (0, c.createDecorator)("InstantiationService"), (function(n) {
          n[n.TRACE = 0] = "TRACE", n[n.DEBUG = 1] = "DEBUG", n[n.INFO = 2] = "INFO", n[n.WARN = 3] = "WARN", n[n.ERROR = 4] = "ERROR", n[n.OFF = 5] = "OFF";
        })(f || (r.LogLevelEnum = f = {})), r.ILogService = (0, c.createDecorator)("LogService"), r.IOptionsService = (0, c.createDecorator)("OptionsService"), r.IOscLinkService = (0, c.createDecorator)("OscLinkService"), r.IUnicodeService = (0, c.createDecorator)("UnicodeService"), r.IDecorationService = (0, c.createDecorator)("DecorationService");
      },
      1480: (O, r, a) => {
        Object.defineProperty(r, "__esModule", { value: !0 }), r.UnicodeService = void 0;
        const c = a(8460), f = a(225);
        r.UnicodeService = class {
          constructor() {
            this._providers = /* @__PURE__ */ Object.create(null), this._active = "", this._onChange = new c.EventEmitter(), this.onChange = this._onChange.event;
            const n = new f.UnicodeV6();
            this.register(n), this._active = n.version, this._activeProvider = n;
          }
          dispose() {
            this._onChange.dispose();
          }
          get versions() {
            return Object.keys(this._providers);
          }
          get activeVersion() {
            return this._active;
          }
          set activeVersion(n) {
            if (!this._providers[n]) throw new Error(`unknown Unicode version "${n}"`);
            this._active = n, this._activeProvider = this._providers[n], this._onChange.fire(n);
          }
          register(n) {
            this._providers[n.version] = n;
          }
          wcwidth(n) {
            return this._activeProvider.wcwidth(n);
          }
          getStringCellWidth(n) {
            let u = 0;
            const p = n.length;
            for (let g = 0; g < p; ++g) {
              let _ = n.charCodeAt(g);
              if (55296 <= _ && _ <= 56319) {
                if (++g >= p) return u + this.wcwidth(_);
                const e = n.charCodeAt(g);
                56320 <= e && e <= 57343 ? _ = 1024 * (_ - 55296) + e - 56320 + 65536 : u += this.wcwidth(e);
              }
              u += this.wcwidth(_);
            }
            return u;
          }
        };
      }
    }, q = {};
    function V(O) {
      var r = q[O];
      if (r !== void 0) return r.exports;
      var a = q[O] = { exports: {} };
      return j[O].call(a.exports, a, a.exports, V), a.exports;
    }
    var Z = {};
    return (() => {
      var O = Z;
      Object.defineProperty(O, "__esModule", { value: !0 }), O.Terminal = void 0;
      const r = V(9042), a = V(3236), c = V(844), f = V(5741), n = V(8285), u = V(7975), p = V(7090), g = ["cols", "rows"];
      class _ extends c.Disposable {
        constructor(s) {
          super(), this._core = this.register(new a.Terminal(s)), this._addonManager = this.register(new f.AddonManager()), this._publicOptions = Object.assign({}, this._core.options);
          const t = (o) => this._core.options[o], i = (o, l) => {
            this._checkReadonlyOptions(o), this._core.options[o] = l;
          };
          for (const o in this._core.options) {
            const l = {
              get: t.bind(this, o),
              set: i.bind(this, o)
            };
            Object.defineProperty(this._publicOptions, o, l);
          }
        }
        _checkReadonlyOptions(s) {
          if (g.includes(s)) throw new Error(`Option "${s}" can only be set in the constructor`);
        }
        _checkProposedApi() {
          if (!this._core.optionsService.rawOptions.allowProposedApi) throw new Error("You must set the allowProposedApi option to true to use proposed API");
        }
        get onBell() {
          return this._core.onBell;
        }
        get onBinary() {
          return this._core.onBinary;
        }
        get onCursorMove() {
          return this._core.onCursorMove;
        }
        get onData() {
          return this._core.onData;
        }
        get onKey() {
          return this._core.onKey;
        }
        get onLineFeed() {
          return this._core.onLineFeed;
        }
        get onRender() {
          return this._core.onRender;
        }
        get onResize() {
          return this._core.onResize;
        }
        get onScroll() {
          return this._core.onScroll;
        }
        get onSelectionChange() {
          return this._core.onSelectionChange;
        }
        get onTitleChange() {
          return this._core.onTitleChange;
        }
        get onWriteParsed() {
          return this._core.onWriteParsed;
        }
        get element() {
          return this._core.element;
        }
        get parser() {
          return this._parser || (this._parser = new u.ParserApi(this._core)), this._parser;
        }
        get unicode() {
          return this._checkProposedApi(), new p.UnicodeApi(this._core);
        }
        get textarea() {
          return this._core.textarea;
        }
        get rows() {
          return this._core.rows;
        }
        get cols() {
          return this._core.cols;
        }
        get buffer() {
          return this._buffer || (this._buffer = this.register(new n.BufferNamespaceApi(this._core))), this._buffer;
        }
        get markers() {
          return this._checkProposedApi(), this._core.markers;
        }
        get modes() {
          const s = this._core.coreService.decPrivateModes;
          let t = "none";
          switch (this._core.coreMouseService.activeProtocol) {
            case "X10":
              t = "x10";
              break;
            case "VT200":
              t = "vt200";
              break;
            case "DRAG":
              t = "drag";
              break;
            case "ANY":
              t = "any";
          }
          return {
            applicationCursorKeysMode: s.applicationCursorKeys,
            applicationKeypadMode: s.applicationKeypad,
            bracketedPasteMode: s.bracketedPasteMode,
            insertMode: this._core.coreService.modes.insertMode,
            mouseTrackingMode: t,
            originMode: s.origin,
            reverseWraparoundMode: s.reverseWraparound,
            sendFocusMode: s.sendFocus,
            wraparoundMode: s.wraparound
          };
        }
        get options() {
          return this._publicOptions;
        }
        set options(s) {
          for (const t in s) this._publicOptions[t] = s[t];
        }
        blur() {
          this._core.blur();
        }
        focus() {
          this._core.focus();
        }
        resize(s, t) {
          this._verifyIntegers(s, t), this._core.resize(s, t);
        }
        open(s) {
          this._core.open(s);
        }
        attachCustomKeyEventHandler(s) {
          this._core.attachCustomKeyEventHandler(s);
        }
        registerLinkProvider(s) {
          return this._core.registerLinkProvider(s);
        }
        registerCharacterJoiner(s) {
          return this._checkProposedApi(), this._core.registerCharacterJoiner(s);
        }
        deregisterCharacterJoiner(s) {
          this._checkProposedApi(), this._core.deregisterCharacterJoiner(s);
        }
        registerMarker(s = 0) {
          return this._verifyIntegers(s), this._core.registerMarker(s);
        }
        registerDecoration(s) {
          var t, i, o;
          return this._checkProposedApi(), this._verifyPositiveIntegers((t = s.x) !== null && t !== void 0 ? t : 0, (i = s.width) !== null && i !== void 0 ? i : 0, (o = s.height) !== null && o !== void 0 ? o : 0), this._core.registerDecoration(s);
        }
        hasSelection() {
          return this._core.hasSelection();
        }
        select(s, t, i) {
          this._verifyIntegers(s, t, i), this._core.select(s, t, i);
        }
        getSelection() {
          return this._core.getSelection();
        }
        getSelectionPosition() {
          return this._core.getSelectionPosition();
        }
        clearSelection() {
          this._core.clearSelection();
        }
        selectAll() {
          this._core.selectAll();
        }
        selectLines(s, t) {
          this._verifyIntegers(s, t), this._core.selectLines(s, t);
        }
        dispose() {
          super.dispose();
        }
        scrollLines(s) {
          this._verifyIntegers(s), this._core.scrollLines(s);
        }
        scrollPages(s) {
          this._verifyIntegers(s), this._core.scrollPages(s);
        }
        scrollToTop() {
          this._core.scrollToTop();
        }
        scrollToBottom() {
          this._core.scrollToBottom();
        }
        scrollToLine(s) {
          this._verifyIntegers(s), this._core.scrollToLine(s);
        }
        clear() {
          this._core.clear();
        }
        write(s, t) {
          this._core.write(s, t);
        }
        writeln(s, t) {
          this._core.write(s), this._core.write(`\r
`, t);
        }
        paste(s) {
          this._core.paste(s);
        }
        refresh(s, t) {
          this._verifyIntegers(s, t), this._core.refresh(s, t);
        }
        reset() {
          this._core.reset();
        }
        clearTextureAtlas() {
          this._core.clearTextureAtlas();
        }
        loadAddon(s) {
          this._addonManager.loadAddon(this, s);
        }
        static get strings() {
          return r;
        }
        _verifyIntegers(...s) {
          for (const t of s) if (t === 1 / 0 || isNaN(t) || t % 1 != 0) throw new Error("This API only accepts integers");
        }
        _verifyPositiveIntegers(...s) {
          for (const t of s) if (t && (t === 1 / 0 || isNaN(t) || t % 1 != 0 || t < 0)) throw new Error("This API only accepts positive integers");
        }
      }
      O.Terminal = _;
    })(), Z;
  })()));
})), be = /* @__PURE__ */ pe(((A, U) => {
  (function(j, q) {
    typeof A == "object" && typeof U == "object" ? U.exports = q() : typeof define == "function" && define.amd ? define([], q) : typeof A == "object" ? A.FitAddon = q() : j.FitAddon = q();
  })(self, (() => (() => {
    "use strict";
    var j = {};
    return (() => {
      var q = j;
      Object.defineProperty(q, "__esModule", { value: !0 }), q.FitAddon = void 0, q.FitAddon = class {
        activate(V) {
          this._terminal = V;
        }
        dispose() {
        }
        fit() {
          const V = this.proposeDimensions();
          if (!V || !this._terminal || isNaN(V.cols) || isNaN(V.rows)) return;
          const Z = this._terminal._core;
          this._terminal.rows === V.rows && this._terminal.cols === V.cols || (Z._renderService.clear(), this._terminal.resize(V.cols, V.rows));
        }
        proposeDimensions() {
          if (!this._terminal || !this._terminal.element || !this._terminal.element.parentElement) return;
          const V = this._terminal._core, Z = V._renderService.dimensions;
          if (Z.css.cell.width === 0 || Z.css.cell.height === 0) return;
          const O = this._terminal.options.scrollback === 0 ? 0 : V.viewport.scrollBarWidth, r = window.getComputedStyle(this._terminal.element.parentElement), a = parseInt(r.getPropertyValue("height")), c = Math.max(0, parseInt(r.getPropertyValue("width"))), f = window.getComputedStyle(this._terminal.element), n = a - (parseInt(f.getPropertyValue("padding-top")) + parseInt(f.getPropertyValue("padding-bottom"))), u = c - (parseInt(f.getPropertyValue("padding-right")) + parseInt(f.getPropertyValue("padding-left"))) - O;
          return {
            cols: Math.max(2, Math.floor(u / Z.css.cell.width)),
            rows: Math.max(1, Math.floor(n / Z.css.cell.height))
          };
        }
      };
    })(), j;
  })()));
})), ye = ".xterm{cursor:text;-webkit-user-select:none;user-select:none;position:relative}.xterm.focus,.xterm:focus{outline:none}.xterm .xterm-helpers{z-index:5;position:absolute;top:0}.xterm .xterm-helper-textarea{opacity:0;z-index:-5;white-space:nowrap;resize:none;border:0;width:0;height:0;margin:0;padding:0;position:absolute;top:0;left:-9999em;overflow:hidden}.xterm .composition-view{color:#fff;white-space:nowrap;z-index:1;background:#000;display:none;position:absolute}.xterm .composition-view.active{display:block}.xterm .xterm-viewport{cursor:default;background-color:#000;position:absolute;top:0;bottom:0;left:0;right:0;overflow-y:scroll}.xterm .xterm-screen{position:relative}.xterm .xterm-screen canvas{position:absolute;top:0;left:0}.xterm .xterm-scroll-area{visibility:hidden}.xterm-char-measure-element{visibility:hidden;line-height:normal;display:inline-block;position:absolute;top:0;left:-9999em}.xterm.enable-mouse-events{cursor:default}.xterm.xterm-cursor-pointer,.xterm .xterm-cursor-pointer{cursor:pointer}.xterm.column-select.focus{cursor:crosshair}.xterm .xterm-accessibility,.xterm .xterm-message{z-index:10;color:#0000;pointer-events:none;position:absolute;top:0;bottom:0;left:0;right:0}.xterm .live-region{width:1px;height:1px;position:absolute;left:-9999px;overflow:hidden}.xterm-dim{opacity:1!important}.xterm-underline-1{text-decoration:underline}.xterm-underline-2{-webkit-text-decoration:underline double;text-decoration:underline double}.xterm-underline-3{-webkit-text-decoration:underline wavy;text-decoration:underline wavy}.xterm-underline-4{-webkit-text-decoration:underline dotted;text-decoration:underline dotted}.xterm-underline-5{-webkit-text-decoration:underline dashed;text-decoration:underline dashed}.xterm-overline{text-decoration:overline}.xterm-overline.xterm-underline-1{text-decoration:underline overline}.xterm-overline.xterm-underline-2{-webkit-text-decoration:overline double underline;-webkit-text-decoration:overline double underline;text-decoration:overline double underline}.xterm-overline.xterm-underline-3{-webkit-text-decoration:overline wavy underline;-webkit-text-decoration:overline wavy underline;text-decoration:overline wavy underline}.xterm-overline.xterm-underline-4{-webkit-text-decoration:overline dotted underline;-webkit-text-decoration:overline dotted underline;text-decoration:overline dotted underline}.xterm-overline.xterm-underline-5{-webkit-text-decoration:overline dashed underline;-webkit-text-decoration:overline dashed underline;text-decoration:overline dashed underline}.xterm-strikethrough{text-decoration:line-through}.xterm-screen .xterm-decoration-container .xterm-decoration{z-index:6;position:absolute}.xterm-screen .xterm-decoration-container .xterm-decoration.xterm-decoration-top-layer{z-index:7}.xterm-decoration-overview-ruler{z-index:8;pointer-events:none;position:absolute;top:0;right:0}.xterm-decoration-top{z-index:2;position:relative}", we = Ce(), Ee = be(), ke = 1e3, Le = 12e3, xe = 8, De = (A) => A === "shell" ? "repl/shell/ws" : "repl/app/ws", Re = (A, U) => {
  const j = window.location.protocol === "https:" ? "wss:" : "ws:", q = Se(A), V = De(U);
  return `${j}//${window.location.host}${q}/${V}`;
}, Ae = /* @__PURE__ */ (() => {
  let A = !1;
  return () => {
    if (A) return;
    const U = document.createElement("style");
    U.setAttribute("data-debug-repl-xterm", "true"), U.textContent = ye, document.head.appendChild(U), A = !0;
  };
})(), Be = class {
  constructor(A) {
    this.socket = null, this.status = "disconnected", this.reconnectAttempts = 0, this.reconnectTimer = null, this.manualClose = !1, this.resetOnOpen = !1, this.resizeObserver = null, this.lineBuffer = "", this.skipEscape = !1, this.prompt = ">>> ", this.awaitingPrompt = !0, this.options = A, Ae(), this.terminal = new we.Terminal({
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.3,
      convertEol: !0,
      cursorBlink: !0,
      scrollback: 2e3,
      theme: {
        background: "#181825",
        foreground: "#cdd6f4",
        cursor: "#f5e0dc",
        selectionBackground: "rgba(137, 180, 250, 0.35)"
      }
    }), this.fitAddon = new Ee.FitAddon(), this.terminal.loadAddon(this.fitAddon), this.terminal.open(A.container), this.fitAddon.fit(), this.terminal.focus(), this.bindTerminal(), this.observeResize(A.container), A.autoConnect !== !1 && this.connect();
  }
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.manualClose = !1, this.setStatus("connecting");
    const A = Re(this.options.debugPath, this.options.kind);
    this.socket = new WebSocket(A), this.socket.onopen = () => {
      this.reconnectAttempts = 0, this.resetOnOpen && (this.resetOnOpen = !1, this.resetTerminal()), this.setStatus("connected"), this.awaitingPrompt = !0, this.options.kind === "console" && this.writePrompt(), this.sendResize();
    }, this.socket.onmessage = (U) => {
      !U || typeof U.data != "string" || this.handleMessage(U.data);
    }, this.socket.onclose = () => {
      if (this.socket = null, this.manualClose) {
        this.setStatus("disconnected");
        return;
      }
      this.setStatus("reconnecting"), this.scheduleReconnect();
    }, this.socket.onerror = () => {
      this.setStatus("error");
    };
  }
  reconnect() {
    this.resetOnOpen = !0, this.manualClose = !0, this.socket && this.socket.close(), this.manualClose = !1, this.reconnectAttempts = 0, this.connect();
  }
  disconnect() {
    this.manualClose = !0, this.reconnectTimer !== null && (window.clearTimeout(this.reconnectTimer), this.reconnectTimer = null), this.socket && this.socket.close();
  }
  kill() {
    this.sendCommand({ type: "close" }), this.disconnect();
  }
  clear() {
    this.terminal.clear(), this.options.kind === "console" && (this.lineBuffer = "", this.writePrompt(!0));
  }
  refresh() {
    this.fitAddon.fit(), this.sendResize();
  }
  focus() {
    this.terminal.focus();
  }
  paste(A) {
    A && (this.handlePaste(A), this.terminal.focus());
  }
  bindTerminal() {
    if (this.terminal.attachCustomKeyEventHandler((A) => this.handleKeyEvent(A)), this.options.kind === "shell") {
      this.terminal.onData((A) => {
        this.sendCommand({
          type: "input",
          data: A
        });
      });
      return;
    }
    this.terminal.onData((A) => this.handleConsoleInput(A));
  }
  handleKeyEvent(A) {
    if (!A) return !0;
    const U = A.metaKey || A.ctrlKey;
    if (U && A.shiftKey && A.code === "KeyC") {
      const j = this.terminal.getSelection();
      return j ? (navigator.clipboard?.writeText(j).catch(() => null), !1) : !0;
    }
    return U && A.shiftKey && A.code === "KeyV" ? (navigator.clipboard?.readText().then((j) => {
      j && this.handlePaste(j);
    }).catch(() => null), !1) : !0;
  }
  handlePaste(A) {
    if (A) {
      if (this.options.kind === "shell") {
        this.sendCommand({
          type: "input",
          data: A
        });
        return;
      }
      this.handleConsoleInput(A);
    }
  }
  handleConsoleInput(A) {
    if (!A) return;
    const U = A.replace(/\r\n/g, `
`);
    for (const j of U) {
      if (this.skipEscape) {
        j >= "@" && j <= "~" && (this.skipEscape = !1);
        continue;
      }
      if (j === `
` || j === "\r") {
        this.submitLine();
        continue;
      }
      if (j === "") {
        this.terminal.write(`^C\r
`), this.lineBuffer = "", this.writePrompt(!0);
        continue;
      }
      if (j === "" || j === "\b") {
        this.lineBuffer.length > 0 && (this.lineBuffer = this.lineBuffer.slice(0, -1), this.terminal.write("\b \b"));
        continue;
      }
      if (j === "\x1B") {
        this.skipEscape = !0;
        continue;
      }
      this.lineBuffer += j, this.terminal.write(j);
    }
  }
  submitLine() {
    const A = this.lineBuffer.trim();
    if (this.lineBuffer = "", this.terminal.write(`\r
`), !A) {
      this.writePrompt(!0);
      return;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.terminal.write(`[disconnected]\r
`), this.writePrompt(!0);
      return;
    }
    this.sendCommand({
      type: "eval",
      code: A
    }), this.awaitingPrompt = !0;
  }
  handleMessage(A) {
    let U;
    try {
      U = JSON.parse(A);
    } catch {
      return;
    }
    !U || !U.type || (this.options.kind === "shell" ? this.handleShellEvent(U) : this.handleConsoleEvent(U));
  }
  handleShellEvent(A) {
    if (A.type === "output" && typeof A.data == "string") {
      this.terminal.write(A.data);
      return;
    }
    if (A.type === "exit") {
      const U = Number(A.code ?? 0);
      this.terminal.write(`\r
[session closed: ${U}]\r
`);
    }
  }
  handleConsoleEvent(A) {
    if (A.type === "result") {
      const U = typeof A.output == "string" ? A.output : String(A.output ?? "");
      U && this.writeLine(U), this.writePrompt();
      return;
    }
    if (A.type === "error") {
      const U = typeof A.output == "string" ? A.output : String(A.output ?? "");
      U && this.terminal.write(`\x1B[31m${U}\x1B[0m\r
`), this.writePrompt();
    }
  }
  writeLine(A) {
    const U = A.replace(/\r?\n/g, `\r
`);
    this.terminal.write(`${U}\r
`);
  }
  writePrompt(A = !1) {
    this.options.kind === "console" && (!A && !this.awaitingPrompt || (this.awaitingPrompt = !1, this.terminal.write(this.prompt)));
  }
  sendResize() {
    this.options.kind === "shell" && (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.terminal.cols || !this.terminal.rows || this.sendCommand({
      type: "resize",
      cols: this.terminal.cols,
      rows: this.terminal.rows
    }));
  }
  sendCommand(A) {
    !A || !A.type || !this.socket || this.socket.readyState !== WebSocket.OPEN || this.socket.send(JSON.stringify(A));
  }
  setStatus(A) {
    this.status !== A && (this.status = A, this.options.onStatusChange?.(A));
  }
  scheduleReconnect() {
    if (this.manualClose) return;
    if (this.reconnectAttempts >= xe) {
      this.setStatus("disconnected");
      return;
    }
    const A = this.reconnectAttempts, U = Math.min(ke * Math.pow(2, A), Le), j = U * (0.2 + Math.random() * 0.3);
    this.reconnectAttempts += 1, this.resetOnOpen = !0, this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, U + j);
  }
  resetTerminal() {
    this.lineBuffer = "", this.skipEscape = !1, this.awaitingPrompt = !0, this.terminal.reset();
  }
  observeResize(A) {
    !A || typeof ResizeObserver > "u" || (this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon.fit(), this.sendResize();
    }), this.resizeObserver.observe(A));
  }
}, Te = {
  shell: "Shell Console",
  console: "App Console"
}, Me = {
  shell: "Copy with Ctrl+Shift+C. Paste with Ctrl+Shift+V.",
  console: "Copy with Ctrl+Shift+C. Paste with Ctrl+Shift+V. Enter submits. Click a command to insert."
}, Oe = {
  disconnected: "disconnected",
  connecting: "connecting",
  connected: "connected",
  reconnecting: "reconnecting",
  error: "error"
}, Pe = '<i class="iconoir-terminal debug-repl__overlay-icon"></i>', Ie = '<span class="debug-repl__overlay-text">Session not connected. Click the button below to start a terminal session.</span>', He = '<button class="debug-repl__overlay-btn" data-overlay-connect><i class="iconoir-play"></i> Connect</button>', Ne = class {
  constructor(A) {
    this.commandsEl = null, this.connectButton = null, this.options = A, this.commands = Array.isArray(A.commands) ? A.commands : [], this.root = document.createElement("section"), this.root.className = "debug-repl", this.root.dataset.replKind = A.kind;
    const U = A.kind === "console" ? this.renderCommands() : "";
    this.root.innerHTML = `
      <div class="debug-repl__header">
        <div class="debug-repl__title">
          <span class="debug-repl__label">${Te[A.kind]}</span>
          <div class="debug-repl__status" data-repl-status="disconnected">
            <span class="debug-repl__dot"></span>
            <span data-repl-status-text>disconnected</span>
          </div>
        </div>
        <div class="debug-repl__actions">
          <button class="debug-btn" data-repl-action="reconnect"><i class="iconoir-refresh"></i> Reconnect</button>
          <button class="debug-btn" data-repl-action="clear"><i class="iconoir-erase"></i> Clear</button>
          <button class="debug-btn debug-btn--danger" data-repl-action="kill"><i class="iconoir-trash"></i> Kill</button>
        </div>
      </div>
      <div class="debug-repl__body">
        <div class="debug-repl__terminal" data-repl-terminal data-terminal-disconnected="true">
          <div class="debug-repl__overlay" data-repl-overlay>
            ${Pe}
            ${Ie}
            ${He}
          </div>
        </div>
        ${U}
      </div>
      <div class="debug-repl__footer">
        <span class="debug-repl__hint">${Me[A.kind]}</span>
      </div>
    `, this.statusEl = this.requireElement("[data-repl-status]", this.root), this.statusTextEl = this.requireElement("[data-repl-status-text]", this.root), this.terminalEl = this.requireElement("[data-repl-terminal]", this.root), this.overlayEl = this.requireElement("[data-repl-overlay]", this.root), this.actionsEl = this.requireElement(".debug-repl__actions", this.root), this.commandsEl = this.root.querySelector("[data-repl-commands]"), this.connectButton = this.actionsEl.querySelector('[data-repl-action="reconnect"]'), this.terminal = new Be({
      kind: A.kind,
      debugPath: A.debugPath,
      container: this.terminalEl,
      autoConnect: !1,
      onStatusChange: (j) => this.updateStatus(j)
    }), this.bindActions(), this.bindCommandActions(), this.bindOverlayConnect(), this.updateStatus("disconnected");
  }
  attach(A) {
    A && (A.innerHTML = "", A.appendChild(this.root), this.terminal.refresh(), this.terminal.focus());
  }
  bindActions() {
    this.actionsEl.addEventListener("click", (A) => {
      const U = A.target;
      if (!U) return;
      const j = U.closest("[data-repl-action]");
      if (j)
        switch (j.dataset.replAction || "") {
          case "reconnect":
            this.terminal.reconnect();
            break;
          case "clear":
            this.terminal.clear();
            break;
          case "kill":
            this.terminal.kill();
            break;
          default:
            break;
        }
    });
  }
  bindCommandActions() {
    !this.commandsEl || this.options.kind !== "console" || this.commandsEl.addEventListener("click", (A) => {
      const U = A.target;
      if (!U) return;
      const j = U.closest("[data-repl-command]");
      if (!j) return;
      const q = j.dataset.replCommand || "";
      q && (this.terminal.paste(`${q} `), this.terminal.focus());
    });
  }
  bindOverlayConnect() {
    const A = this.overlayEl.querySelector("[data-overlay-connect]");
    A && A.addEventListener("click", () => {
      this.terminal.connect();
    });
  }
  updateStatus(A) {
    const U = Oe[A] || A;
    this.statusEl.dataset.replStatus = A, this.statusTextEl.textContent = U;
    const j = A === "disconnected" || A === "error";
    if (this.overlayEl.hidden = !j, this.terminalEl.dataset.terminalDisconnected = j ? "true" : "false", this.connectButton) {
      const q = j ? "Connect" : "Reconnect";
      this.connectButton.innerHTML = `<i class="iconoir-refresh"></i> ${q}`;
    }
  }
  renderCommands() {
    if (this.options.kind !== "console") return "";
    const A = this.commands, U = A.length, j = A.map((q) => {
      const V = ve(q.command), Z = q.description ? `<div class="debug-repl__command-desc">${ve(q.description)}</div>` : "", O = Array.isArray(q.tags) && q.tags.length > 0 ? `<div class="debug-repl__command-tags">${q.tags.map((r) => `<span class="debug-repl__command-tag">${ve(r)}</span>`).join("")}</div>` : "";
      return `
          <button class="debug-repl__command" type="button" data-repl-command="${V}">
            <div class="debug-repl__command-title">
              <span class="debug-repl__command-name">${V}</span>
              <span class="debug-repl__command-badge ${q.mutates ? "debug-repl__command-badge--exec" : ""}">${q.mutates ? "exec" : "read-only"}</span>
            </div>
            ${Z}
            ${O}
          </button>
        `;
    }).join("");
    return `
      <aside class="debug-repl__commands" data-repl-commands>
        <div class="debug-repl__commands-header">
          <span>Commands</span>
          <span class="debug-repl__commands-count">${U}</span>
        </div>
        <div class="debug-repl__commands-list">
          ${U > 0 ? j : '<div class="debug-repl__commands-empty">No exposed commands.</div>'}
        </div>
      </aside>
    `;
  }
  requireElement(A, U) {
    const j = U.querySelector(A);
    if (!j) throw new Error(`Missing debug repl element: ${A}`);
    return j;
  }
};
export {
  Be as n,
  Ne as t
};

//# sourceMappingURL=repl-panel-So0Od67n.js.map