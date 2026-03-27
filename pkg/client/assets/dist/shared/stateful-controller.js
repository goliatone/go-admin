var S = (e) => {
  throw TypeError(e);
};
var l = (e, t, s) => t.has(e) || S("Cannot " + s);
var h = (e, t, s) => (l(e, t, "read from private field"), s ? s.call(e) : t.get(e)), n = (e, t, s) => t.has(e) ? S("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), i = (e, t, s, o) => (l(e, t, "write to private field"), o ? o.call(e, s) : t.set(e, s), s);
var a, r;
class c {
  constructor(t, s) {
    n(this, a);
    n(this, r);
    i(this, a, t), i(this, r, s);
  }
  getState() {
    return h(this, a);
  }
  setState(t) {
    var s;
    i(this, a, t), (s = h(this, r)) == null || s.call(this, t);
  }
  get state() {
    return h(this, a);
  }
  set state(t) {
    this.setState(t);
  }
}
a = new WeakMap(), r = new WeakMap();
export {
  c as StatefulController
};
//# sourceMappingURL=stateful-controller.js.map
