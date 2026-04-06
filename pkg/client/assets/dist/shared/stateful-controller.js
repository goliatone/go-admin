import { i as r, n as s, t as a } from "../chunks/classPrivateFieldGet2-dZB8y7sE.js";
var e = /* @__PURE__ */ new WeakMap(), i = /* @__PURE__ */ new WeakMap(), n = class {
  constructor(t, l) {
    r(this, e, void 0), r(this, i, void 0), s(e, this, t), s(i, this, l);
  }
  getState() {
    return a(e, this);
  }
  setState(t) {
    s(e, this, t), a(i, this)?.call(this, t);
  }
  get state() {
    return a(e, this);
  }
  set state(t) {
    this.setState(t);
  }
};
export {
  n as StatefulController
};

//# sourceMappingURL=stateful-controller.js.map