async function p(r) {
  const {
    fn: e,
    until: t,
    interval: o = 2e3,
    timeout: a = 6e4,
    maxAttempts: i = 30,
    onProgress: s,
    signal: u
  } = r, m = Date.now();
  let l = 0, n;
  for (; l < i; ) {
    if (u?.aborted)
      throw new DOMException("Polling aborted", "AbortError");
    if (Date.now() - m >= a)
      return {
        result: n,
        attempts: l,
        stopped: !1,
        timedOut: !0
      };
    if (l++, n = await e(), s && s(n, l), t(n))
      return {
        result: n,
        attempts: l,
        stopped: !0,
        timedOut: !1
      };
    await d(o, u);
  }
  return {
    result: n,
    attempts: l,
    stopped: !1,
    timedOut: !1
  };
}
async function w(r) {
  const {
    fn: e,
    maxAttempts: t = 3,
    baseDelay: o = 1e3,
    maxDelay: a = 3e4,
    exponentialBackoff: i = !0,
    shouldRetry: s = () => !0,
    onRetry: u,
    signal: m
  } = r;
  let l;
  for (let n = 1; n <= t; n++) {
    if (m?.aborted)
      throw new DOMException("Retry aborted", "AbortError");
    try {
      return await e();
    } catch (c) {
      if (l = c, n >= t || !s(c, n))
        throw c;
      const f = i ? Math.min(o * Math.pow(2, n - 1), a) : o;
      u && u(c, n, f), await d(f, m);
    }
  }
  throw l;
}
function d(r, e) {
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
function T(r, e) {
  let t = 0, o = null;
  return (...a) => {
    const i = Date.now();
    i - t >= e ? (t = i, r(...a)) : o || (o = setTimeout(
      () => {
        t = Date.now(), o = null, r(...a);
      },
      e - (i - t)
    ));
  };
}
function y(r) {
  const e = new AbortController(), t = setTimeout(() => e.abort(), r);
  return {
    controller: e,
    cleanup: () => clearTimeout(t)
  };
}
async function h(r, e, t = "Operation timed out") {
  let o;
  const a = new Promise((i, s) => {
    o = setTimeout(() => {
      s(new Error(t));
    }, e);
  });
  try {
    return await Promise.race([r, a]);
  } finally {
    clearTimeout(o);
  }
}
export {
  y as c,
  b as d,
  p,
  w as r,
  d as s,
  T as t,
  h as w
};
//# sourceMappingURL=async-helpers-D7xplkWe.js.map
