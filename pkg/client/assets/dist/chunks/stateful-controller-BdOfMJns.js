function h(t, e) {
  if (e.has(t)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function o(t, e, n) {
  h(t, e), e.set(t, n);
}
function c(t, e, n) {
  if (typeof t == "function" ? t === e : t.has(e)) return arguments.length < 3 ? e : n;
  throw new TypeError("Private element is not present on this object");
}
function i(t, e, n) {
  return t.set(c(t, e), n), n;
}
function s(t, e) {
  return t.get(c(t, e));
}
var a = /* @__PURE__ */ new WeakMap(), r = /* @__PURE__ */ new WeakMap(), l = class {
  constructor(t, e) {
    o(this, a, void 0), o(this, r, void 0), i(a, this, t), i(r, this, e);
  }
  getState() {
    return s(a, this);
  }
  setState(t) {
    i(a, this, t), s(r, this)?.call(this, t);
  }
  get state() {
    return s(a, this);
  }
  set state(t) {
    this.setState(t);
  }
};
export {
  l as t
};

//# sourceMappingURL=stateful-controller-BdOfMJns.js.map