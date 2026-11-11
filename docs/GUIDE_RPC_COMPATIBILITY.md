# RPC compatibility and verification

Use the coordinated admin root and quickstart artifacts and their selected RPC
providers. Current dependencies and Go requirements come from [go.mod](../go.mod)
and [quickstart/go.mod](../quickstart/go.mod); client tooling comes from the
[client package manifest](../pkg/client/assets/package.json). A newer checkout's
manifests do not change which historical combinations were verified.

The [sanitized verification snapshot](rpc-compatibility-2026-11-10.json) records
exact published module versions, tag commits, checksums, complete selected graphs,
toolchains, relative source fingerprints, normalized commands and outcomes. It is
a fixed record of completed checks, not a promise about a range of versions.
Release-specific identities live in that evidence record rather than being
duplicated as current installation requirements here.

## Verified combinations

| Proof ID in the snapshot | Combination | Result and scope |
| --- | --- | --- |
| `admin-published` | Coordinated published root/quickstart with their command, generator and router providers | PASS: 320 selected modules, zero replacements; downloaded-module checks, quickstart race tests, repeatable Go export, generation/check, strict positive/negative TypeScript, shipped client and protected HTTP. Readiness ready; 28 requests and one lost-response attempt. |
| `command-published` | Published command module and its generator dependency | PASS: 35 selected modules, zero replacements; full Go suite, focused race tests, installed CLI, actual-Go comparison and strict TypeScript/client proof. Includes unknown-canonical-reference and bounded shared-graph regressions. |
| `generator-published` | Published generator module and version-pinned CLI | PASS: reviewed source match, full Go suite, focused race checks, generation/check and comparison CLI smoke. |
| Full admin graph on its declared minimum Go toolchain | Not established by these runs | NOT_RUN. Passing on a newer toolchain is not minimum-version coverage. |
| Other TS/Node versions, operating systems or arbitrary provider mixtures | Not established by these runs | NOT_RUN. Unverified does not mean known broken. |
| Production authentication, durable receipt recovery, devices and application acceptance | Application-owned integration | NOT_RUN by these upstream proofs. |

The admin proof used an isolated consumer with `GOWORK=off`; its only main module
was the consumer. The Go fixture came from published quickstart, and the shared
browser transport came from published root. The reviewed public example driver
and golden files were copied into the consumer. Harness changes were limited to
workspace isolation, evidence scope and recording published admin identities.
The separate example module is available in the source repository; it is not
included in the root module zip.

## Support boundaries

- Full typed generation requires explicit Go declarations. Supported JSON shapes
  retain optional/null distinctions and canonical envelopes; unsupported or
  ambiguous shapes fail with diagnostics. Discovery is not a schema exporter.
- Legacy scaffold and dynamic calls remain available. Exported declarations do
  not register handlers, authorize calls or enforce service transactions.
- Native Fiber adapters and wrappers forwarding the required registration and
  startup capabilities support strict readiness. Opaque wrappers and HTTPRouter
  cannot provide that guarantee; strict startup reports unverifiable or rejects
  configuration rather than enabling exposure.
- Error classification is opt-in. See the [error contract and migration steps](GUIDE_RPC.md#error-and-validation-contract).
  Cancellation, timeout and lost responses do not prove rollback. Retry hints
  never authorize automatic replay.
- Structural comparison assesses old-client requests and new-server responses.
  A compatible result does not establish business semantics, authorization,
  durable idempotency or retry safety. Generation `--check` detects byte drift;
  comparison with `-fail-on-breaking` is a separate CI gate.
- Local workspace or replacement proofs are development evidence. Repeat checks
  against published modules before claiming published compatibility.

## Reproduce and extend verification

Select exact artifacts from the snapshot, or deliberately qualify a new graph.
Pre-cache Go dependencies and install the compiler tools identified by the
repository manifests. Follow the public [protected consumer recipe](../examples/rpc-contract/README.md)
and [command generation/comparison recipe](https://github.com/goliatone/go-command/blob/main/examples/rpc/tsgen/README.md).
The command [CLI guide](https://github.com/goliatone/go-command/blob/main/cmd/rpc-tsgen/README.md)
and generator [comparison contract](https://github.com/goliatone/go-generators#structural-rpc-comparison)
describe their flags and conservative classifications.

The admin example's default verifier checks current admin sources. To qualify
published artifacts, use an isolated consumer importing the published quickstart
fixture, disable workspace resolution, and record `go list -m -json all`; reject
module replacements. Do not label a local-source pass as publication evidence.
The snapshot's commands identify each check's working context.

On macOS, select a compiler matching the active SDK if another toolchain precedes
Xcode on PATH. The recorded successful admin run used process-local settings:

```sh
CC=/usr/bin/clang CXX=/usr/bin/clang++ SDKROOT="$(/usr/bin/xcrun --show-sdk-path)" \
  python3 examples/rpc-contract/verify.py --record /tmp/rpc-proof.json
```

Retain a new dated evidence snapshot when qualifying a different release graph;
preserve prior results and mark unexecuted checks `NOT_RUN`. Public evidence must
exclude credentials, raw HTTP exchanges, private context links and machine paths.
The current snapshot records resolved metadata-cache/toolchain issues without
exposing raw local logs. It does not imply formal feature or product acceptance.
