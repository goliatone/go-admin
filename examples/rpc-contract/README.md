# Protected Go-first RPC consumer

This example combines the current admin/quickstart sources with the published
providers selected by the [module manifests](../../go.mod). It uses a small
resource service, signed bearer authentication, service authorization, owned
command registrations and an isolated query runtime. The service is shared by
direct calls, a dedicated typed endpoint and named command dispatch.

From the repository root, with dependencies cached and the client toolchain
installed from [its package manifest](../../pkg/client/assets/package.json):

```sh
python3 examples/rpc-contract/verify.py
```

The verifier runs offline. It exports fresh Go contracts twice, compares the
checked-in artifacts, builds the CLI from the selected published command module,
checks non-writing generation, compiles positive/negative strict TS cases and
invokes an ephemeral protected HTTP listener through the shipped RPC bundle.
It uses the repository workspace for the unpublished admin/quickstart candidate;
command and generator replacements are rejected. No generator runs during
ordinary `go build` or `go test`.

After intentionally changing a declaration:

```sh
go generate ./examples/rpc-contract
python3 examples/rpc-contract/verify.py
```

`go generate` explicitly exports and regenerates only. The verifier's `--write`
option regenerates and runs the full proof; its default mode compares artifacts
without writing them. `--record <path>` retains successful evidence.

To inspect the offline export or run the example manually:

```sh
go run ./examples/rpc-contract -export
go run ./examples/rpc-contract -ready /tmp/rpc-example-ready.json
```

The ready file contains the endpoint and temporary operator/denied bearer tokens.
It is owner-readable and the listener accepts loopback addresses only. Stop with
Ctrl-C. These synthetic identities and queue receipts demonstrate integration;
they are not a login flow, durable queue, or receipt database.

## Ownership and contracts

[The fixture](../../quickstart/examples/rpccontract/fixture.go) declares its input
and object result in Go. `NewRPCCommandBinding` and `ExportRPCContracts` apply the
same wire policy and reject context-owned authority fields. The fixture stages
that immutable binding with `RegisterSetTypedRPCCommand` alongside its handler, then commits
one owned registration set. The handler delegates to the service. Closing that
handle removes its decoder and dispatcher together; replacement explicitly
closes the prior generation before committing the next. It is not an atomic
hot-reload API. The fixture never resets process-global registrations.

Quickstart mounts RPC on the supplied router without bootstrapping unrelated
admin UI modules. JWT middleware authenticates, the host supplies trusted tenant
scope, and the service authorizes resource access on both direct and RPC paths.
Endpoint permission metadata and client hints do not grant access. The dedicated
update endpoint returns the domain object; named dispatch retains the complete
canonical dispatch response. The receipt-only variant and synthetic wire endpoint
exercise serialization cases beyond the domain object. The legacy factory is
intentionally absent from typed export and remains available via explicit dynamic
client calls.

Typed input uses original JSON: `dryRun`, `resource.displayName`, safe integer
counts and the quoted wide `revision` survive decoding. Authority aliases are
rejected even in unknown nested objects; other unknown fields follow Go's JSON
decoder. Declared bounds apply to typed inputs, effective dispatch options and
result egress. Legacy factories retain normalization and float64 map numbers.

## Client and outcomes

[consumer.ts](consumer.ts) binds envelope-preserving generated helpers to the
existing RPC client and wraps fetch with admin's shared `httpRequestWith` CSRF
preparation. The verifier stages the published client's declarations and the
existing admin transport source for those relative imports; application builds
resolve them from their own asset layout. Browser cookie hosts must retain their
normal credentials and server CSRF middleware. This fixture uses signed bearer
authentication; the existing browser CSRF suite separately verifies cookie-host
behavior.

Check for `data` before reading it. Present null, false, zero, empty strings,
arrays and objects are retained; fields named `data` or `result` are domain data.
Named dispatch forwards IDs, metadata and all dispatch options. Receipt members
keep Go casing (`Mode`, `Accepted`, `CommandID`, `DispatchID`, `EnqueuedAt`,
`CorrelationID`); `result`, `status_reference` and `validation_errors` remain
optional. Queued acceptance promises no completed domain result. An inline
receipt-only operation also omits `result`. Operational failure-as-data remains
a result, separate from a classified RPC error.

Trusted context wins over client identity claims. Transport tracing overrides
envelope hints; correlation falls back through envelope/options/request ID.
Direct callers must supply trusted context and the same effective options for
parity. Cancellation is preserved on direct contexts; the HTTP fixture also
checks classified cancellation errors from the service. It makes no claim that
Fiber automatically cancels work when a browser disconnects.

A lost response after commit is **unknown**, with no replay. The runtime proof
performs exactly one request, drops its successful response, and observes the
single committed effect through the query. Idempotency hints do not establish
framework deduplication. Structural compatibility classification and reusable
application helper packages remain deferred.
