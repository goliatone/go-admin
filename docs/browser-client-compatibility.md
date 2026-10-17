# Browser Client Compatibility

| Browser client | go-admin | quickstart | Status |
| --- | --- | --- | --- |
| `0.1.0` | `v0.126.9`–`v0.126.11` | `v0.126.9`–`v0.126.11` | Transitional local artifact; superseded |
| `0.126.12` | `v0.126.12` | `v0.126.12` | Published and remotely verified at `0ef3f7629c70a2e8647903c6c68b09e7c2ea334f` |
| `X.Y.Z` (`>=0.126.12`) | `vX.Y.Z` | `quickstart/vX.Y.Z` | Coordinated versions must match |

Starting with `v0.126.12`, `@goliatone/go-admin-client`, go-admin, and quickstart use the same version and are published together. Consumers must use declared exports and the checksummed asset attached to the matching GitHub Release; source paths and application-specific modules are unsupported.

Read `pkg/client/assets/package.json` for the current source-tree browser
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

The independently recorded `0.126.12` browser tarball is
`goliatone-go-admin-client-0.126.12.tgz` with SHA-256
`233a28e16d576377f6b19bd09c82a7415baa258339bd1b1f554ba4244b037822`.
That checksum applies only to the immutable `0.126.12` artifact.

Release maintainers need Node `>=22.12.0`, npm `>=11.17.0`, `tar`, and an
authenticated `gh` session. See `GUIDE_DEVELOPMENT_CICD.md#64-release-commands-and-prerequisites`
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

Evidence recorded 2026-08-08 America/Los_Angeles (2026-08-09 UTC):

| Lane | Harness/browser | Result |
| --- | --- | --- |
| Current Chrome | System Chrome 151 (`HeadlessChrome/151.0.0.0`) | Pass |
| Previous Chrome | Playwright Chromium 145 (`HeadlessChrome/145.0.7632.6`) | Pass |
| Current Safari engine | Playwright 1.58.2 WebKit revision 2248 (`Version/26.0 Safari/605.1.15`) | Pass |
| Previous Safari engine | Playwright 1.56.0 WebKit revision 2215 (`Version/26.0 Safari/605.1.15`) | Pass |

The WebKit lanes are automated Safari-engine compatibility evidence, not a
claim that Playwright controls the installed Safari application. The host probe
also reported Safari 26.6; release sign-off may add a manual installed-Safari
smoke test without changing the component contract.
