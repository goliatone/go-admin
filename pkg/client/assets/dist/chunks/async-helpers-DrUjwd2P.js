async function d(r) {
  const { fn: e, until: t, interval: o = 2e3, timeout: a = 6e4, maxAttempts: i = 30, onProgress: u, signal: s } = r, c = Date.now();
  let l = 0, n;
  for (; l < i; ) {
    if (s?.aborted) throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - c >= a) return {
      result: n,
      attempts: l,
      stopped: !1,
      timedOut: !0
    };
    if (l++, n = await e(), u && u(n, l), t(n)) return {
      result: n,
      attempts: l,
      stopped: !0,
      timedOut: !1
    };
    await w(o, s);
  }
  return {
    result: n,
    attempts: l,
    stopped: !1,
    timedOut: !1
  };
}
async function p(r) {
  const { fn: e, maxAttempts: t = 3, baseDelay: o = 1e3, maxDelay: a = 3e4, exponentialBackoff: i = !0, shouldRetry: u = () => !0, onRetry: s, signal: c } = r;
  let l;
  for (let n = 1; n <= t; n++) {
    if (c?.aborted) throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (m) {
      if (l = m, n >= t || !u(m, n)) throw m;
      const f = i ? Math.min(o * Math.pow(2, n - 1), a) : o;
      s && s(m, n, f), await w(f, c);
    }
  }
  throw l;
}
function w(r, e) {
  return new Promise((t, o) => {
    if (e?.aborted) {
      o(new DOMException("Sleep aborted", "AbortError"));
      return;
    }
    const a = setTimeout(t, r);
    if (e) {
      const i = () => {
        clearTimeout(a), o(new DOMException("Sleep aborted", "AbortError"));
      };
      e.addEventListener("abort", i, { once: !0 });
    }
  });
}
function b(r, e) {
  let t = null;
  return (...o) => {
    t && clearTimeout(t), t = setTimeout(() => {
      r(...o), t = null;
    }, e);
  };
}
function y(r, e) {
  let t = 0, o = null;
  return (...a) => {
    const i = Date.now();
    i - t >= e ? (t = i, r(...a)) : o || (o = setTimeout(() => {
      t = Date.now(), o = null, r(...a);
    }, e - (i - t)));
  };
}
function T(r) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), r);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function h(r, e, t = "Operation timed out") {
  let o;
  const a = new Promise((i, u) => {
    o = setTimeout(() => {
      u(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([r, a]);
  } finally {
    clearTimeout(o);
  }
}
export {
  w as a,
  p as i,
  b as n,
  y as o,
  d as r,
  h as s,
  T as t
};

//# sourceMappingURL=async-helpers-DrUjwd2P.js.map