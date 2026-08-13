var u = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}, t = {
  sink: null,
  level: "debug"
};
function o(r, n, e) {
  const i = t;
  if (!i.sink || u[r] < u[i.level]) return;
  const l = i.sink[r];
  if (typeof l != "function") return;
  const c = n ? [`[${n}]`, ...e] : e;
  try {
    l(...c);
  } catch {
  }
}
function f(r = "") {
  const n = r.trim();
  return Object.freeze({
    debug: (...e) => o("debug", n, e),
    info: (...e) => o("info", n, e),
    warn: (...e) => o("warn", n, e),
    error: (...e) => o("error", n, e)
  });
}
function s(r) {
  const n = t;
  t = {
    sink: Object.prototype.hasOwnProperty.call(r, "sink") ? r.sink ?? null : n.sink,
    level: r.level ?? n.level
  };
  let e = !1;
  return () => {
    e || (e = !0, t = n);
  };
}
function g(r) {
  return s({ sink: r });
}
function a(r = "debug") {
  const n = globalThis.console;
  return s({
    level: r,
    sink: {
      debug: (...e) => n.debug(...e),
      info: (...e) => n.info(...e),
      warn: (...e) => n.warn(...e),
      error: (...e) => n.error(...e)
    }
  });
}
export {
  s as configureLogging,
  f as createLogger,
  a as enableConsoleLogging,
  g as setLoggerSink
};

//# sourceMappingURL=logger.js.map