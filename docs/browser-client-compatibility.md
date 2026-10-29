# Browser Client Compatibility

| Browser client | go-admin | quickstart | Status |
| --- | --- | --- | --- |
| `X.Y.Z` | `vX.Y.Z` | `quickstart/vX.Y.Z` | Coordinated versions must match |

`@goliatone/go-admin-client`, go-admin, and quickstart use the same version and are published together. Consumers must use declared exports and the checksummed asset attached to the matching GitHub Release; source paths and application-specific modules are unsupported. See the [changelog](../CHANGELOG.md) for release history.

Read [package.json](../pkg/client/assets/package.json) for the current source-tree browser
version; source metadata alone does not prove that an artifact was published.
Treat the matching GitHub Release manifest and checksum as the publication
source of truth rather than extending this document with an unverified
checksum for each patch. Before upgrading, confirm all three coordinates match
exactly:

```text
@goliatone/go-admin-client X.Y.Z
github.com/goliatone/go-admin vX.Y.Z
github.com/goliatone/go-admin/quickstart vX.Y.Z
```

Both normal publication and `./taskfile release:client:publish vX.Y.Z` recovery build from a temporary export of the requested root tag. Publication fails unless `vX.Y.Z` and `quickstart/vX.Y.Z` resolve to the same full source commit, which is recorded in the release manifest.

Verify the downloaded browser tarball against the checksum attached to its
matching GitHub Release. A checksum from another release does not verify the
requested artifact.

Release maintainers need the Node and npm toolchain declared in
[.node-version](../.node-version) and the browser client's
[package.json](../pkg/client/assets/package.json), `tar`, and an authenticated
`gh` session. See [release commands and prerequisites](GUIDE_DEVELOPMENT_CICD.md#64-release-commands-and-prerequisites)
for release and recovery steps.

## Public modal compatibility evidence

The modal contract is built at both `/admin/assets/components/modal.js` and
`@goliatone/go-admin-client/components/modal`. Run:

```text
cd pkg/client/assets
npm run test:public
npm run test:modal:browsers
```

The packed-package test verifies runtime exports plus declarations for
`Modal`, `ModalOptions`, `ModalSize`, `ConfirmModal`, and `TextPromptModal`.
The browser matrix serves the progressively enhanced server-form fixture and
checks desktop/mobile containment, 200% zoom, keyboard focus/trapping/return,
validation-content replacement with stable dialog identity, and reduced-motion
cleanup.

The [browser matrix runner](../pkg/client/assets/scripts/test-modal-browsers.mjs)
defines the Chrome and Safari-engine lanes. Harness dependencies come from
the package manifest and lockfile; use each run's browser identities and results
as validation evidence rather than treating an older run as current coverage.

The WebKit lanes provide automated Safari-engine compatibility evidence.
Playwright does not control the installed Safari application; release sign-off
may add a manual installed-Safari smoke test without changing the component
contract.
