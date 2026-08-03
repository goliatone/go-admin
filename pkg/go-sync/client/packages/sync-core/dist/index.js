//#region src/metadata.ts
var e = "@goliatone/sync-core", t = "0.0.0-phase5";
//#endregion
//#region src/internal/clone.ts
function n(e) {
	return e == null ? e : typeof structuredClone == "function" ? structuredClone(e) : r(e);
}
function r(e) {
	if (Array.isArray(e)) return e.map((e) => r(e));
	if (e instanceof Date) return new Date(e.getTime());
	if (i(e)) {
		let t = {};
		for (let [n, i] of Object.entries(e)) t[n] = r(i);
		return t;
	}
	return e;
}
function i(e) {
	return !!e && typeof e == "object" && !Array.isArray(e);
}
//#endregion
//#region src/runtime.ts
var a = /* @__PURE__ */ new Set([
	"RATE_LIMITED",
	"TEMPORARY_FAILURE",
	"TRANSPORT_UNAVAILABLE"
]), o = {
	maxAttempts: 3,
	baseDelayMs: 100,
	maxDelayMs: 2e3,
	jitterRatio: .2
};
function s(e) {
	let t = e.cache ?? l(), n = g(e.retry), r = e.random ?? Math.random, i = e.wait ?? A, a = /* @__PURE__ */ new Map();
	return {
		resource(e) {
			let t = o(e);
			return {
				getSnapshot() {
					return D(t.state.snapshot);
				},
				getState() {
					return C(t.state);
				},
				subscribe(e) {
					return t.listeners.add(e), e(C(t.state)), () => {
						t.listeners.delete(e);
					};
				},
				async load() {
					return t.state.snapshot && !t.state.invalidated ? E(t.state.snapshot) : c(t, "load", !1);
				},
				async mutate(e) {
					return f(t, e);
				},
				invalidate(e) {
					s(t, e);
				},
				async refresh(e) {
					return c(t, "refresh", e?.force ?? !1);
				}
			};
		},
		getState(e) {
			let t = a.get(u(e));
			return t ? C(t.state) : null;
		},
		invalidate(e, t) {
			s(o(e), t);
		}
	};
	function o(e) {
		let n = u(e), r = a.get(n);
		if (r) return r;
		let i = t.get(e), o = {
			ref: O(e),
			key: n,
			state: {
				ref: O(e),
				status: i?.snapshot ? "ready" : "idle",
				snapshot: D(i?.snapshot ?? null),
				invalidated: i?.invalidated ?? !1,
				invalidationReason: i?.invalidationReason,
				queueDepth: 0,
				error: null,
				conflict: null
			},
			listeners: /* @__PURE__ */ new Set(),
			inFlightLoad: null,
			loadRequestID: 0,
			queue: [],
			processingQueue: !1
		};
		return a.set(n, o), o;
	}
	function s(e, n) {
		let r = t.invalidate(e.ref, n);
		e.state = {
			...e.state,
			invalidated: r.invalidated,
			invalidationReason: r.invalidationReason
		}, b(e);
	}
	async function c(n, r, i) {
		if (n.inFlightLoad && !i) return n.inFlightLoad;
		let a = n.loadRequestID + 1;
		n.loadRequestID = a, n.state = {
			...n.state,
			status: n.state.snapshot ? "refreshing" : "loading",
			error: null,
			conflict: null
		}, b(n);
		let o = e.transport.load(O(n.ref)).then((e) => {
			let r = E(e);
			return a === n.loadRequestID ? (t.set(n.ref, r), n.state = {
				...n.state,
				status: "ready",
				snapshot: r,
				invalidated: !1,
				invalidationReason: void 0,
				error: null,
				conflict: null
			}, b(n), E(r)) : n.inFlightLoad ? n.inFlightLoad : E(n.state.snapshot ?? r);
		}).catch((e) => {
			let t = d(n.ref, e, n.state.snapshot);
			if (a !== n.loadRequestID) {
				if (n.inFlightLoad) return n.inFlightLoad;
				if (n.state.snapshot && !n.state.invalidated) return E(n.state.snapshot);
				throw t;
			}
			throw n.state = {
				...n.state,
				status: t.conflict ? "conflict" : "error",
				error: t,
				conflict: t.conflict ?? null
			}, b(n), t;
		}).finally(() => {
			n.inFlightLoad === o && (n.inFlightLoad = null);
		});
		return n.inFlightLoad = o, o;
	}
	async function f(a, o) {
		let s = S();
		return a.queue.push({
			input: o,
			resolve: s.resolve,
			reject: s.reject
		}), a.state = {
			...a.state,
			queueDepth: a.queue.length
		}, b(a), p(a, e.transport, t, n, r, i), s.promise;
	}
}
function c(e) {
	return s(e).resource(e.ref);
}
function l() {
	let e = /* @__PURE__ */ new Map();
	return {
		get(t) {
			let n = e.get(u(t));
			return n ? {
				ref: O(n.ref),
				snapshot: D(n.snapshot),
				invalidated: n.invalidated,
				invalidationReason: n.invalidationReason
			} : null;
		},
		set(t, n) {
			let r = u(t), i = {
				ref: O(t),
				snapshot: D(n),
				invalidated: !1,
				invalidationReason: void 0
			};
			return e.set(r, i), {
				ref: O(i.ref),
				snapshot: D(i.snapshot),
				invalidated: i.invalidated,
				invalidationReason: i.invalidationReason
			};
		},
		invalidate(t, n) {
			let r = u(t), i = e.get(r), a = {
				ref: O(t),
				snapshot: D(i?.snapshot ?? null),
				invalidated: !0,
				invalidationReason: n
			};
			return e.set(r, a), {
				ref: O(a.ref),
				snapshot: D(a.snapshot),
				invalidated: a.invalidated,
				invalidationReason: a.invalidationReason
			};
		},
		clear(t) {
			e.delete(u(t));
		}
	};
}
function u(e) {
	return [
		encodeURIComponent(e.kind),
		encodeURIComponent(e.id),
		x(e.scope)
	].join("::");
}
function d(e, t, r) {
	if (f(t)) {
		let e = y(t, r);
		return {
			code: t.code,
			message: t.message,
			details: n(t.details),
			currentRevision: t.currentRevision,
			resource: D(t.resource ?? null) ?? void 0,
			retriable: !e && a.has(t.code),
			cause: t,
			conflict: e ?? void 0
		};
	}
	return {
		code: "TEMPORARY_FAILURE",
		message: t instanceof Error ? t.message : "sync operation failed",
		retriable: !0,
		cause: t
	};
}
function f(e) {
	return !!e && typeof e == "object" && typeof e.code == "string";
}
async function p(e, t, n, r, i, a) {
	if (!e.processingQueue) {
		e.processingQueue = !0;
		try {
			for (; e.queue.length > 0;) {
				let o = e.queue[0];
				e.state = {
					...e.state,
					status: "saving",
					error: null,
					conflict: null,
					queueDepth: e.queue.length
				}, b(e);
				try {
					let s = await m(e, t, _(e, o.input), r, i, a), c = E(s.snapshot);
					h(n, e, c), e.queue.shift(), e.state = {
						...e.state,
						status: e.queue.length > 0 ? "saving" : "ready",
						snapshot: c,
						invalidated: !1,
						invalidationReason: void 0,
						queueDepth: e.queue.length,
						error: null,
						conflict: null
					}, b(e), o.resolve({
						snapshot: E(c),
						applied: s.applied,
						replay: s.replay
					});
					continue;
				} catch (t) {
					let n = d(e.ref, t, e.state.snapshot), r = n.conflict ? "conflict" : "error";
					e.state = {
						...e.state,
						status: r,
						queueDepth: 0,
						error: n,
						conflict: n.conflict ?? null
					};
					let i = e.queue.splice(0);
					b(e);
					for (let e of i) e.reject(n);
				}
			}
		} finally {
			e.processingQueue = !1;
		}
	}
}
async function m(e, t, n, r, i, a) {
	let o = 0, s;
	for (; o < r.maxAttempts;) try {
		return await t.mutate(n);
	} catch (t) {
		let n = d(e.ref, t, e.state.snapshot);
		if (s = n, o += 1, !n.retriable || o >= r.maxAttempts) throw n;
		await a(v(o, r, i));
	}
	throw s ?? /* @__PURE__ */ Error("mutation queue exhausted retries");
}
function h(e, t, n) {
	let r = e.set(t.ref, n);
	t.state = {
		...t.state,
		snapshot: D(r.snapshot),
		invalidated: !1,
		invalidationReason: void 0
	};
}
function g(e) {
	return {
		maxAttempts: e?.maxAttempts ?? o.maxAttempts,
		baseDelayMs: e?.baseDelayMs ?? o.baseDelayMs,
		maxDelayMs: e?.maxDelayMs ?? o.maxDelayMs,
		jitterRatio: e?.jitterRatio ?? o.jitterRatio
	};
}
function _(e, t) {
	if (u("ref" in t && t.ref ? t.ref : e.ref) !== e.key) throw j("mutation request ref must match the bound sync resource");
	let r = t.expectedRevision ?? e.state.snapshot?.revision;
	if (r === void 0) throw j("resource must be loaded before mutate unless expectedRevision is provided");
	return {
		ref: O(e.ref),
		operation: t.operation,
		payload: n(t.payload),
		expectedRevision: r,
		idempotencyKey: t.idempotencyKey,
		metadata: t.metadata ? n(t.metadata) : void 0
	};
}
function v(e, t, n) {
	let r = Math.min(t.maxDelayMs, t.baseDelayMs * 2 ** Math.max(0, e - 1));
	if (t.jitterRatio <= 0) return r;
	let i = r * t.jitterRatio, a = (n() * 2 - 1) * i;
	return Math.max(0, Math.round(r + a));
}
function y(e, t) {
	return e.code === "STALE_REVISION" ? {
		code: "STALE_REVISION",
		message: e.message,
		currentRevision: e.currentRevision,
		latestSnapshot: D(e.resource ?? null),
		staleSnapshot: D(t)
	} : null;
}
function b(e) {
	let t = C(e.state);
	for (let n of e.listeners) n(t);
}
function x(e) {
	return e ? Object.keys(e).sort().map((t) => `${encodeURIComponent(t)}=${encodeURIComponent(e[t] ?? "")}`).join("&") : "";
}
function S() {
	let e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
function C(e) {
	return {
		ref: O(e.ref),
		status: e.status,
		snapshot: D(e.snapshot),
		invalidated: e.invalidated,
		invalidationReason: e.invalidationReason,
		queueDepth: e.queueDepth,
		error: w(e.error),
		conflict: T(e.conflict)
	};
}
function w(e) {
	return e ? {
		code: e.code,
		message: e.message,
		details: k(e.details) ? { ...e.details } : e.details,
		currentRevision: e.currentRevision,
		resource: D(e.resource ?? null) ?? void 0,
		retriable: e.retriable,
		cause: e.cause,
		conflict: T(e.conflict ?? null) ?? void 0
	} : null;
}
function T(e) {
	return e ? {
		code: e.code,
		message: e.message,
		currentRevision: e.currentRevision,
		latestSnapshot: D(e.latestSnapshot),
		staleSnapshot: D(e.staleSnapshot)
	} : null;
}
function E(e) {
	return D(e);
}
function D(e) {
	return e ? {
		ref: O(e.ref),
		data: n(e.data),
		revision: e.revision,
		updatedAt: e.updatedAt,
		metadata: k(e.metadata) ? n(e.metadata) : e.metadata
	} : null;
}
function O(e) {
	return {
		kind: e.kind,
		id: e.id,
		scope: e.scope ? { ...e.scope } : void 0
	};
}
function k(e) {
	return !!e && typeof e == "object" && !Array.isArray(e);
}
function A(e) {
	return new Promise((t) => {
		setTimeout(t, e);
	});
}
function j(e) {
	return {
		code: "INVALID_MUTATION",
		message: e
	};
}
//#endregion
//#region src/http.ts
function M(e, t) {
	return F(e, L(t, "read envelope"));
}
function N(e, t) {
	let n = L(t, "mutation envelope");
	if (typeof n.applied != "boolean") throw TypeError("mutation envelope must include boolean applied");
	if (typeof n.replay != "boolean") throw TypeError("mutation envelope must include boolean replay");
	return {
		snapshot: F(e, n),
		applied: n.applied,
		replay: n.replay
	};
}
function P(e, t) {
	let r = L(L(t, "error envelope").error, "error envelope.error");
	if (typeof r.code != "string" || r.code.trim() === "") throw TypeError("error envelope must include string code");
	if (typeof r.message != "string" || r.message.trim() === "") throw TypeError("error envelope must include string message");
	let i = R(r.details) ? r.details : void 0, a = i?.resource, o = typeof i?.current_revision == "number" ? i.current_revision : void 0;
	return {
		code: r.code,
		message: r.message,
		details: n(i),
		currentRevision: o,
		resource: a ? F(e, a) : void 0
	};
}
function F(e, t) {
	if (typeof t.revision != "number" || Number.isNaN(t.revision)) throw TypeError("read envelope must include numeric revision");
	if (typeof t.updated_at != "string" || t.updated_at.trim() === "") throw TypeError("read envelope must include string updated_at");
	return {
		ref: I(e),
		data: n(t.data),
		revision: t.revision,
		updatedAt: t.updated_at,
		metadata: R(t.metadata) ? n(t.metadata) : void 0
	};
}
function I(e) {
	return {
		kind: e.kind,
		id: e.id,
		scope: e.scope ? { ...e.scope } : void 0
	};
}
function L(e, t) {
	if (!R(e)) throw TypeError(`${t} must be an object`);
	return e;
}
function R(e) {
	return !!e && typeof e == "object" && !Array.isArray(e);
}
//#endregion
//#region src/transport.ts
function z(e = {}) {
	let t = B(e.fetch);
	return {
		async load(t) {
			return M(t, await n(t, "GET", U(t, e.baseURL), void 0));
		},
		async mutate(t) {
			let r = q(t, e.actionOperations) ? "POST" : "PATCH", i = await n(t.ref, r, W(t.ref, t.operation, r, e.baseURL), {
				operation: r === "PATCH" ? t.operation : void 0,
				payload: t.payload ?? null,
				expected_revision: t.expectedRevision,
				idempotency_key: t.idempotencyKey,
				metadata: t.metadata
			}, t);
			return N(t.ref, i);
		}
	};
	async function n(n, r, i, a, o) {
		let s = {
			requestKind: o ? "mutate" : "load",
			method: r,
			ref: Y(n),
			input: o ? X(o) : void 0
		}, c = await V(e.headers, s), l = {
			method: r,
			credentials: e.credentials,
			headers: c
		};
		a !== void 0 && (l.body = JSON.stringify(a), l.headers = {
			...c,
			"Content-Type": "application/json"
		});
		let u;
		try {
			u = await t(i, l);
		} catch (e) {
			throw {
				code: "TRANSPORT_UNAVAILABLE",
				message: e instanceof Error ? e.message : "sync transport unavailable"
			};
		}
		let d = await H(u);
		if (u.ok) return d;
		if (d !== void 0) try {
			throw P(n, d);
		} catch (e) {
			if (Z(e)) throw e;
		}
		throw {
			code: J(u.status),
			message: `sync request failed with status ${u.status}`
		};
	}
}
function B(e) {
	if (e) return e;
	if (typeof globalThis.fetch == "function") return globalThis.fetch.bind(globalThis);
	throw TypeError("createFetchSyncTransport requires a fetch implementation");
}
async function V(e, t) {
	return {
		Accept: "application/json",
		...typeof e == "function" ? await e(t) : e ?? {}
	};
}
async function H(e) {
	let t = await e.text();
	if (t.trim()) try {
		return JSON.parse(t);
	} catch {
		return;
	}
}
function U(e, t = "") {
	return G(K(t, "sync", "resources", e.kind, e.id), e.scope);
}
function W(e, t, n, r = "") {
	return n === "POST" ? G(K(r, "sync", "resources", e.kind, e.id, "actions", t), e.scope) : U(e, r);
}
function G(e, t) {
	let n = Object.entries(t ?? {}).map(([e, t]) => [e.trim(), t.trim()]).filter(([e, t]) => e !== "" && t !== "").sort(([e], [t]) => e.localeCompare(t));
	if (n.length === 0) return e;
	let r = n.map(([e, t]) => `${encodeURIComponent(e)}=${encodeURIComponent(t)}`).join("&");
	return `${e}${e.includes("?") ? "&" : "?"}${r}`;
}
function K(e, ...t) {
	let n = e.replace(/\/+$/, ""), r = t.map((e) => encodeURIComponent(e.trim())).join("/");
	return n ? `${n}/${r}` : `/${r}`;
}
function q(e, t) {
	return typeof t == "function" ? t(X(e)) : Array.isArray(t) && t.length > 0 ? t.includes(e.operation) : typeof e.idempotencyKey == "string" && e.idempotencyKey.trim() !== "";
}
function J(e) {
	return e === 400 ? "INVALID_MUTATION" : e === 404 ? "NOT_FOUND" : e === 409 ? "STALE_REVISION" : e === 429 ? "RATE_LIMITED" : "TEMPORARY_FAILURE";
}
function Y(e) {
	return {
		kind: e.kind,
		id: e.id,
		scope: e.scope ? { ...e.scope } : void 0
	};
}
function X(e) {
	return {
		ref: Y(e.ref),
		operation: e.operation,
		payload: e.payload,
		expectedRevision: e.expectedRevision,
		idempotencyKey: e.idempotencyKey,
		metadata: e.metadata ? { ...e.metadata } : void 0
	};
}
function Z(e) {
	return !!e && typeof e == "object" && typeof e.code == "string" && typeof e.message == "string";
}
//#endregion
//#region src/refresh.ts
function Q(e, t = {}) {
	let n = t.focusTarget ?? $(), r = t.visibilityTarget ?? ee(), i = { force: t.refreshOptions?.force ?? !0 }, a = !1, o = null, s = () => {
		!a || !te(r) || c("window_focus").catch(() => {});
	};
	return {
		async start() {
			return !a && n && n.addEventListener("focus", s), a = !0, c("initial_load");
		},
		stop() {
			a && n && n.removeEventListener("focus", s), a = !1;
		},
		trigger(e) {
			return c(e);
		},
		refreshOnRouteReentry() {
			return c("route_reentry");
		},
		refreshOnFocus() {
			return c("window_focus");
		},
		refreshAfterConflictAcknowledgement() {
			return c("conflict_acknowledged");
		}
	};
	function c(e) {
		return o || (o = l(e).catch((n) => {
			throw t.onError?.(n, e), n;
		}).finally(() => {
			o = null;
		}), o);
	}
	async function l(t) {
		let n = e.getSnapshot() !== null;
		return t === "initial_load" && !n || !n ? e.load() : e.refresh(i);
	}
}
function $() {
	return globalThis.window ?? null;
}
function ee() {
	return globalThis.document ?? null;
}
function te(e) {
	return !e || typeof e.visibilityState != "string" || e.visibilityState !== "hidden";
}
//#endregion
export { o as DEFAULT_RETRY_POLICY, e as SYNC_CORE_PACKAGE_NAME, t as SYNC_CORE_PACKAGE_VERSION, z as createFetchSyncTransport, l as createInMemoryCache, Q as createRefreshPolicy, u as createResourceKey, s as createSyncEngine, c as createSyncResource, f as isSyncEnvelopeError, d as normalizeSyncError, P as parseErrorEnvelope, N as parseMutationEnvelope, M as parseReadEnvelope };
