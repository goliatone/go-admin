# Media Module Guide

This guide explains the current Media module contract in go-admin and how to
connect it to a host asset system. The module is editor-facing: it lets
operators browse, preview, select, upload, resolve, and manage reusable media
without requiring content forms to know provider-specific asset details.

## What It Provides

- A feature-gated Media module (`FeatureMedia`) with gallery and list views.
- A query-aware media API backed by a host-provided `admin.MediaLibrary`.
- A `MediaItem` view model used by the media page, media picker, media gallery,
  and content form schema hints.
- Optional interfaces for get, resolve, upload, presign, confirm, update,
  delete, and request-scoped capabilities.
- Native image, vector, audio, and video previews. Audio and video playback is
  limited to the selected detail panel; grid and list previews remain static.
- Media picker value modes for storing either stable media IDs or URLs.
- An in-memory fallback for simple demos and a Bun-backed example store in
  `examples/web`.

## Source Of Truth

Use these files as the runtime contract:

- `admin/media.go`: core media types and interfaces.
- `admin/media_module.go`: module-owned media UI, JSON API, and delivery
  routes.
- `admin/boot_bindings_media_notifications_activity_jobs_settings.go`: HTTP
  binding from routes to the configured media library.
- `admin/media_activity.go`: default mutation activity events and extension
  hook.
- `admin/admin_schema_runtime.go`: schema-level media endpoint config.
- `admin/media_schema_hints.go` and `admin/panel_action_schema_runtime.go`:
  media picker and gallery schema enrichment.
- `pkg/client/templates/resources/media/*.html` and
  `pkg/client/assets/src/media/index.ts`: browser media UI.
- `examples/web/stores/media_store.go`: example persistent implementation.

The example store is not the required data model. The required integration
point is the modern `admin.MediaLibrary` contract.

## Feature Gate And Permissions

Enable the media feature before admin initialization:

```go
featureDefaults := map[string]bool{
    string(admin.FeatureMedia): true,
}
```

Default permissions are configured on `admin.Config`:

- `Config.MediaPermission`: list, get, resolve, page access, and capabilities.
- `Config.MediaCreatePermission`: upload, presign, and confirm.
- `Config.MediaUpdatePermission`: metadata updates.
- `Config.MediaDeletePermission`: deletes.

If the feature is disabled, the module and API return feature-disabled errors.
If the feature is enabled but the actor lacks permissions, protected routes
return 403.

## Module Anatomy

The Media module is module-owned UI, not a normal CRUD panel:

- Module ID: `media`
- Gallery route key: `media.index`
- List route key: `media.list`
- Default UI routes:
  - `/admin/media`
  - `/admin/media/list`

The module renders page templates and passes media endpoint paths into the view
context:

- `media_library_path`
- `media_item_path`
- `media_resolve_path`
- `media_upload_path`
- `media_presign_path`
- `media_confirm_path`
- `media_capabilities_path`
- `media_asset_url_template`
- `media_stream_url_template`
- `media_poster_url_template`
- `media_download_url_template`
- `media_default_value_mode`

The browser calls API routes after page load instead of embedding media data in
the initial HTML.

## API Surface

The media API is registered under the admin API group:

- `GET /admin/api/media/assets`
- `GET /admin/api/media/assets/:id`
- `PATCH /admin/api/media/assets/:id`
- `DELETE /admin/api/media/assets/:id`
- `POST /admin/api/media/resolve`
- `POST /admin/api/media/upload`
- `POST /admin/api/media/presign`
- `POST /admin/api/media/confirm`
- `GET /admin/api/media/capabilities`
- `GET /admin/api/media/delivery/:id/asset`
- `GET /admin/api/media/delivery/:id/stream`
- `GET /admin/api/media/delivery/:id/poster`
- `GET /admin/api/media/delivery/:id/download`

There is no legacy `POST /admin/api/media/assets` create path. Creation flows
through direct upload, presign plus confirm, or a host-specific route outside the
media module.

Route paths can be customized through the routing system. Generated forms and
custom UI should use the resolved schema/media config rather than hardcoding
paths.

## Core Contract

Every configured media library must implement query-aware listing:

```go
type MediaLibrary interface {
    MediaQueryProvider
}

type MediaQueryProvider interface {
    QueryMedia(ctx context.Context, query MediaQuery) (MediaPage, error)
}
```

The legacy `List(ctx)` and `Add(ctx, item)` contract has been removed. The
route layer no longer adapts legacy list results into paginated pages, no longer
creates media with `Add`, and no longer scans list results to implement get or
resolve.

Implement these optional interfaces as your host supports them:

```go
type MediaGetter interface {
    GetMedia(ctx context.Context, id string) (MediaItem, error)
}

type MediaResolver interface {
    ResolveMedia(ctx context.Context, ref MediaReference) (MediaItem, error)
}

type MediaUploader interface {
    UploadMedia(ctx context.Context, input MediaUploadInput) (MediaItem, error)
}

type MediaPresigner interface {
    PresignMedia(ctx context.Context, req MediaPresignRequest) (MediaPresignResponse, error)
}

type MediaConfirmer interface {
    ConfirmMedia(ctx context.Context, req MediaConfirmRequest) (MediaItem, error)
}

type MediaUpdater interface {
    UpdateMedia(ctx context.Context, id string, input MediaUpdateInput) (MediaItem, error)
}

type MediaDeleter interface {
    DeleteMedia(ctx context.Context, id string) error
}
```

Capabilities are inferred from implemented interfaces and the active actor's
permissions. You can publish an authoritative capability payload with
`MediaCapabilityProvider`, or layer partial request-scoped changes with
`MediaCapabilityOverrideProvider`. Capability claims are clamped to the
interfaces and permissions that are actually available.

## MediaItem Shape

`MediaItem` is the content-facing view of a media asset:

```go
type MediaItem struct {
    ID             string
    Name           string
    URL            string
    AssetURL       string
    StreamURL      string
    PosterURL      string
    DownloadURL    string
    Thumbnail      string
    Type           string
    MIMEType       string
    Size           int64
    Status         string
    WorkflowStatus string
    WorkflowError  string
    Delivery       MediaDeliveryInfo
    Metadata       map[string]any
    CreatedAt      time.Time
}
```

Recommended field semantics:

- `ID`: stable media identifier. Prefer the source Asset ID when the asset is
  the publishable media item.
- `Name`: editor-friendly title, usually asset title, filename, or path.
- `AssetURL`, `StreamURL`, `PosterURL`, and `DownloadURL`: app-owned delivery
  URLs emitted by go-admin for browser use.
- `URL`: legacy alias for `AssetURL` when present; do not use it for raw
  provider URLs.
- `Thumbnail`: real image/poster preview URL. Do not copy playable video,
  audio, document, or binary URLs into `Thumbnail`.
- `Type`: normalized kind such as `image`, `vector`, `video`, `audio`,
  `document`, or `binary`.
- `MIMEType`: original or delivery MIME type.
- `Size`: trusted byte size if available.
- `Status`: coarse availability, such as `ready`, `imported`, `pending`, or
  `failed`.
- `WorkflowStatus`: processing state, such as `complete`, `needs_processing`,
  `processing`, or `failed`.
- `WorkflowError`: short failure reason when applicable.
- `Delivery`: safe state and capability information for the admin UI.
- `Metadata`: safe captions, alt text, and technical metadata. Provider
  provenance such as raw URLs, external IDs, storage keys, and signed URLs stays
  server-side or diagnostic-only and is redacted from normal JSON payloads.

## Preview Semantics

The client resolves an effective media family from `Type` and `MIMEType`:

- Explicit `image`, `vector`, `video`, and `audio` types are authoritative.
- Empty or generic values such as `asset`, `file`, `binary`, `document`, and
  unknown values may be upgraded by specific MIME types.
- `image/svg+xml` resolves to `vector`; other `image/*` MIME types resolve to
  `image`; `video/*` resolves to `video`; `audio/*` resolves to `audio`.
- Unsupported or URL-less items render the icon fallback.

Grid and list previews are intentionally cheap:

- Images and vectors render image previews.
- Videos render a thumbnail image only when `Thumbnail` is a real image/poster
  URL, otherwise the video fallback icon.
- Audio and other assets render fallback icons.

The selected detail panel renders native controls:

- Video uses `<video controls preload="metadata" playsInline>`.
- Audio uses `<audio controls preload="metadata">`.
- Browser playback failures caused by CORS, signed URL expiry, codecs, content
  type, or range support stay contained in the preview area. They do not change
  metadata, copy URL, delete, upload, or save behavior.

## Query, Filters, And Sorting

`MediaQuery` supports:

- `Search`
- `Type`
- `MIMEFamily`
- `Status`
- `WorkflowStatus`
- `Sort`
- `Limit`
- `Offset`

Map these onto host asset queries where possible:

```text
Search         -> title/name/filepath/provider ID
Type           -> exact stored media type when that distinction matters
MIMEFamily     -> effective preview family, not only mime_type LIKE '<family>/%'
Status         -> normalized MediaItem.Status
WorkflowStatus -> normalized processing/workflow status
Sort           -> newest, oldest, name, size
Limit/Offset   -> database pagination
```

For preview-family filters, match the same effective family rules as the client.
This matters for generic media records:

- `MIMEFamily: "audio"` should include `type=binary, mime_type=audio/mpeg`.
- `MIMEFamily: "video"` should include `type=file, mime_type=video/mp4`.
- `MIMEFamily: "vector"` should include `image/svg+xml` records even when type
  is `asset` or empty.
- When Images and Vectors are separate filters, generic SVG records belong under
  Vectors, not only under Images.

Prefer database-side filtering for the media page. Apply filters after mapping
only when the result set is known to be small enough.

## Recommended Asset Integration Pattern

When the host already has an Asset table or service, do not duplicate records
into the example `media` table just to satisfy go-admin. Create an adapter:

```text
Asset table/API
  -> AssetMediaLibrary adapter
  -> admin.MediaItem contract
  -> Media module, media picker, media gallery, content forms
```

This keeps Asset as the source/provenance record and `MediaItem` as the
go-admin view model. Content can store stable media IDs while the adapter
continues to resolve current playable URLs and metadata.

Use a separate `media_items` table only when editorial media state is distinct
from the source asset, for example:

- manually curated thumbnails or captions;
- publish eligibility independent from asset processing;
- replacement chains or versioning;
- multiple publishable media items derived from one asset;
- provider-independent editorial metadata that must outlive source refs.

## Asset To MediaItem Mapping

For an Asset-shaped record with provider refs:

```text
MediaItem.ID             = asset.id
MediaItem.Name           = first(asset.title, asset.name, asset.filepath)
MediaItem.Type           = normalized asset.asset_type or MIME family
MediaItem.MIMEType       = asset.mime_type
MediaItem.Size           = validated asset.file_size_bytes
MediaItem.CreatedAt      = asset.created_at
MediaItem.Metadata       = normalized provider/source/technical metadata
```

Resolve delivery behavior by provider priority:

1. Ready streaming provider ref, such as Mux playback HLS, projected into an
   internal delivery reference.
2. Ready direct rendition, such as MP4 or audio download URL, redirected or
   proxied through a delivery adapter.
3. Trusted CDN/source URL, signed by host policy and returned as a redirect.
4. Source-only URL, such as Google Drive, treated as server-side provenance
   unless a host adapter can safely proxy or redirect it.

Example URL mapping:

```text
Mux ready video/audio:
  MediaItem.Metadata.provider    = "mux"
  server-side reference source   = mux playback id
  delivery adapter behavior      = redirect to signed playback/thumbnail URL
  Status                         = ready
  Workflow                       = complete

Google Drive source only:
  MediaItem.Metadata.provider    = "drive"
  server-side reference source   = Drive file id/source URL
  delivery adapter behavior      = proxy with host-resolved OAuth token, or unavailable
  Status                         = imported or pending
  Workflow                       = needs_processing
```

Do not blindly mirror stale aggregate status when provider refs prove a media
item is usable. For example, an asset may have `overall_status = failed` while
a Mux external ref is `ready`. In that case the `MediaItem` can be `ready` and
should preserve the asset mismatch in `Metadata` or `WorkflowError`.

## Adapter Skeleton

Use this shape for an Asset-backed media library:

```go
type AssetStore interface {
    ListMediaAssets(ctx context.Context, query admin.MediaQuery) ([]Asset, int, error)
    GetAsset(ctx context.Context, id string) (Asset, error)
    ResolveAsset(ctx context.Context, ref admin.MediaReference) (Asset, error)
    StoreUpload(ctx context.Context, input admin.MediaUploadInput) (Asset, error)
    UpdateAssetMedia(ctx context.Context, id string, input admin.MediaUpdateInput) (Asset, error)
    DeleteAssetMedia(ctx context.Context, id string) error
}

type AssetMediaLibrary struct {
    assets AssetStore
}

func NewAssetMediaLibrary(assets AssetStore) *AssetMediaLibrary {
    return &AssetMediaLibrary{assets: assets}
}

func (l *AssetMediaLibrary) QueryMedia(ctx context.Context, query admin.MediaQuery) (admin.MediaPage, error) {
    assets, total, err := l.assets.ListMediaAssets(ctx, query)
    if err != nil {
        return admin.MediaPage{}, err
    }

    items := make([]admin.MediaItem, 0, len(assets))
    for _, asset := range assets {
        items = append(items, assetToMediaItem(asset))
    }

    return admin.MediaPage{
        Items:  items,
        Total:  total,
        Limit:  query.Limit,
        Offset: query.Offset,
    }, nil
}

func (l *AssetMediaLibrary) GetMedia(ctx context.Context, id string) (admin.MediaItem, error) {
    asset, err := l.assets.GetAsset(ctx, strings.TrimSpace(id))
    if err != nil {
        return admin.MediaItem{}, err
    }
    return assetToMediaItem(asset), nil
}

func (l *AssetMediaLibrary) ResolveMedia(ctx context.Context, ref admin.MediaReference) (admin.MediaItem, error) {
    asset, err := l.assets.ResolveAsset(ctx, ref)
    if err != nil {
        return admin.MediaItem{}, err
    }
    return assetToMediaItem(asset), nil
}

func (l *AssetMediaLibrary) UploadMedia(ctx context.Context, input admin.MediaUploadInput) (admin.MediaItem, error) {
    asset, err := l.assets.StoreUpload(ctx, input)
    if err != nil {
        return admin.MediaItem{}, err
    }
    return assetToMediaItem(asset), nil
}

func (l *AssetMediaLibrary) UpdateMedia(ctx context.Context, id string, input admin.MediaUpdateInput) (admin.MediaItem, error) {
    asset, err := l.assets.UpdateAssetMedia(ctx, strings.TrimSpace(id), input)
    if err != nil {
        return admin.MediaItem{}, err
    }
    return assetToMediaItem(asset), nil
}

func (l *AssetMediaLibrary) DeleteMedia(ctx context.Context, id string) error {
    return l.assets.DeleteAssetMedia(ctx, strings.TrimSpace(id))
}
```

Keep `assetToMediaItem` deterministic and side-effect free. It should normalize
an Asset into the current best media view; it should not trigger processing jobs
or mutate records.

## Wiring

Install the adapter before admin initialization or before routes are booted:

```go
assetLibrary := media.NewAssetMediaLibrary(assetStore)
adm.WithMediaLibrary(assetLibrary)
```

You can also provide the media library in dependencies during construction:

```go
adm, err := admin.New(cfg, admin.Dependencies{
    MediaLibrary: assetLibrary,
})
```

The example app uses the same extension point, with upload support:

```go
func wirePersistentMediaLibrary(adm *admin.Admin, store *stores.MediaStore, uploadCfg stores.MediaLibraryUploadConfig) {
    if adm == nil || store == nil {
        return
    }
    adm.WithMediaLibrary(store.MediaLibraryWithUploads(uploadCfg))
}
```

If the feature is enabled but no library is configured, go-admin uses an
in-memory demo library. If the feature is disabled, it uses the disabled media
library and routes return feature-disabled errors.

## Content Field Integration

Content models should use media fields instead of plain text URL fields when
the editor should choose media from the library:

For the broader form generation pipeline, component registration, and schema
metadata conventions, see `docs/GUIDE_FORMGEN.md`.

```go
admin.Field{
    Name:  "primary_media_id",
    Label: "Primary Media",
    Type:  "media-picker",
}
```

Panel `admin.Field` entries do not carry component options directly. By
default, go-admin enriches `media-picker` and `media-gallery` fields with the
current media endpoints and default value mode.

Use `valueMode: "id"` for authored content whenever possible. IDs survive URL
changes caused by reprocessing, CDN migration, provider replacement, or asset
metadata cleanup. Use URL mode for legacy content or simple fields where storing
the delivery URL is intentional.

To force ID mode, provide the value mode through the JSON schema metadata that
backs the form:

```json
{
  "type": "object",
  "properties": {
    "primary_media_id": {
      "type": "string",
      "format": "uuid",
      "x-formgen": {
        "widget": "media-picker",
        "componentOptions": {
          "valueMode": "id"
        }
      },
      "x-admin": {
        "media_value_mode": "id"
      }
    }
  }
}
```

For URL mode, use URI-reference semantics so local admin asset paths such as
`/admin/assets/uploads/media/showcase/product-demo.mp4` are valid:

```json
{
  "type": "object",
  "properties": {
    "hero_media": {
      "type": "string",
      "format": "uri-reference",
      "x-formgen": {
        "widget": "media-picker",
        "componentOptions": {
          "valueMode": "url"
        }
      }
    }
  }
}
```

For galleries, use a media-gallery field or an array schema enriched with media
hints:

```go
admin.Field{
    Name:  "attachments",
    Label: "Attachments",
    Type:  "media-gallery",
}
```

Schema example for a URL-backed gallery:

```json
{
  "type": "object",
  "properties": {
    "attachments": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri-reference"
      },
      "x-formgen": {
        "widget": "media-picker",
        "componentOptions": {
          "variant": "media-gallery",
          "multiple": true,
          "valueMode": "url"
        }
      },
      "x-admin": {
        "media": {
          "valueMode": "url"
        }
      }
    }
  }
}
```

Content-type builder URL-mode media picker and media gallery fields serialize
and import as `format: "uri-reference"`. ID-mode fields serialize as
`format: "uuid"`. Existing `format: "uri"` schemas remain import-compatible for
legacy content, but new URL-mode schema output should use URI-reference.

go-admin schema decoration adds current media endpoints to media fields when
`FeatureMedia` is enabled and `Admin.MediaLibrary()` is configured.

## Status And Readiness Rules

Use status fields consistently:

```text
ready
  Media is usable by content renderers now.

imported
  Source exists, but may not have streaming/CDN renditions yet.

pending or processing
  A processing job is expected or in progress.

failed
  Media cannot currently be used; preserve error details.
```

Recommended readiness logic:

1. Prefer provider-specific readiness over stale aggregate status.
2. A ready Mux playback ref usually means video/audio is ready.
3. Google Drive source refs alone are source provenance unless the frontend can
   safely play or download them.
4. Preserve original asset status, processing status, and provider status in
   metadata for debugging.
5. Validate suspicious denormalized fields before exposing them. For example, a
   small video reporting a multi-terabyte byte size should not be trusted
   without checking the source.

## Metadata Conventions

Keep metadata useful but predictable. Suggested keys:

```json
{
  "source": {
    "asset_id": "asset uuid",
    "metadata_source": "gdrive",
    "filepath": "archive/path/file.mp4",
    "original_status": "failed"
  },
  "providers": {
    "gdrive": {
      "file_id": "drive id",
      "url": "https://drive.google.com/file/d/..."
    },
    "mux": {
      "asset_id": "mux asset id",
      "playback_id": "mux playback id",
      "status": "ready"
    }
  },
  "technical": {
    "duration_seconds": 2124.5,
    "resolution": "640x360",
    "video_codec": "h264",
    "audio_codec": "aac"
  },
  "renditions": {
    "hls": "https://stream.mux.com/...m3u8",
    "mp4_medium": "https://stream.mux.com/.../medium.mp4",
    "thumbnail": "https://image.mux.com/.../thumbnail.jpg"
  }
}
```

Do not require clients to parse provider-specific nested metadata to render a
basic item. Normal JSON payloads should expose app-owned `asset_url`,
`stream_url`, `poster_url`, `download_url`, and `delivery`; provider-specific
URLs stay in delivery references, adapter configuration, or privileged
diagnostics.

## Upload, Presign, And Confirm

If assets are imported from an external archive, the first integration can be
read-only:

- Implement `QueryMedia`.
- Implement `GetMedia` and `ResolveMedia` if content fields store IDs or need
  picker hydration.
- Do not implement `UploadMedia`, `PresignMedia`, `ConfirmMedia`,
  `UpdateMedia`, or `DeleteMedia` until the host is ready to support those
  mutations.

Capabilities are inferred from implemented interfaces, so the UI can hide or
disable unsupported operations.

If direct uploads should create Assets:

1. `UploadMedia` stores the binary or forwards it to the asset ingestion
   service.
2. It creates an Asset record with source/provider metadata.
3. It returns a `MediaItem` immediately if the uploaded file is usable, or a
   pending `MediaItem` if processing is asynchronous.

If presigned uploads are used:

1. `PresignMedia` creates an upload intent and returns upload target data.
2. The browser uploads directly to storage.
3. `ConfirmMedia` finalizes the intent, creates or updates the Asset, and
   returns the resulting `MediaItem`.

The media routes emit default activity events for upload, confirm, update, and
delete. Use the media activity hook if the host needs to suppress, replace, or
augment those entries.

## Example Web Showcase

`examples/web` demonstrates the modern media integration:

- The persistent media store implements query, get, resolve, upload, update,
  delete, and capability reporting.
- Showcase records include raster image, SVG/vector, video, audio, document,
  and generic-type SVG media.
- Local showcase files live under `pkg/client/assets/uploads/media/showcase`
  and are served by the existing `/admin/assets` mount.
- Seeded content exercises media picker, media gallery, block editor media
  fields, and normal content editing flows.
- Persistent CMS fixtures are the canonical block-editor showcase path.
- Startup and persistent setup run bounded media showcase reconciliation so old
  local `/static/media/logo.png` and `/static/media/banner.jpg` rows converge to
  current `/admin/assets/...` showcase rows without adding a `/static/media`
  route or deleting unrelated user media.

## Delivery Credential Seam

OAuth-backed delivery providers should keep token ownership in the host app.
Implement `admin.MediaDeliveryCredentialResolver` with `modules/services` or
`go-services`, then register it with the admin delivery wiring. The media module
asks for short-lived provider credentials by provider, media ID, intent, and
delivery reference; it does not store refresh tokens or own OAuth lifecycle.

When the resolver depends on `modules/services`, keep services migrations in the
host persistence bootstrap and validate the OAuth storage schema before provider
callbacks or media delivery requests run. `modules/services` exposes
`VerifyServicesOAuthStorageSchema(...)`, backed by `go-services/migrations`, so
missing tables such as `service_connections`, `service_credentials`,
`service_grant_events`, and `service_grant_snapshots` fail with migration
composition guidance instead of surfacing as generic authorization errors.

## Optional Provider Adapter Examples

These examples show host-owned adapter shapes. They are not required core
providers, and production signing, OAuth, storage policy, and observability stay
in the host application.

Google Drive through `modules/services` or `go-services`:

```go
type DriveDeliveryAdapter struct {
    Drive       DriveContentClient
}

func (a DriveDeliveryAdapter) ResolveMediaDelivery(ctx context.Context, req admin.MediaDeliveryRequest) (admin.MediaDeliveryResponse, error) {
    credential, err := req.ResolveCredential(ctx, "https://www.googleapis.com/auth/drive.readonly")
    if err != nil {
        return admin.MediaDeliveryResponse{}, err
    }
    reader, size, contentType, err := a.Drive.Open(ctx, credential, req.Reference.ExternalID)
    if err != nil {
        return admin.MediaDeliveryResponse{
            Mode: admin.MediaDeliveryModeUnavailable,
            Unavailable: &admin.MediaDeliveryUnavailable{
                State:  admin.MediaDeliveryStateUnavailable,
                Reason: "drive content unavailable",
                Code:   503,
            },
        }, nil
    }
    return admin.MediaDeliveryResponse{
        Mode: admin.MediaDeliveryModeProxy,
        Proxy: &admin.MediaDeliveryProxy{
            Reader:        reader,
            ContentType:   contentType,
            ContentLength: size,
            FileName:      req.Reference.Name,
            Range:         true,
        },
    }, nil
}
```

Mux redirect-first delivery:

```go
type MuxDeliveryAdapter struct {
    Signer MuxPlaybackSigner
}

func (a MuxDeliveryAdapter) ResolveMediaDelivery(ctx context.Context, req admin.MediaDeliveryRequest) (admin.MediaDeliveryResponse, error) {
    playbackID := req.Reference.ExternalID
    target, err := a.Signer.SignedPlaybackURL(ctx, playbackID, string(req.Intent))
    if err != nil {
        return admin.MediaDeliveryResponse{}, err
    }
    return admin.MediaDeliveryResponse{
        Mode: admin.MediaDeliveryModeRedirect,
        Redirect: &admin.MediaDeliveryRedirect{
            URL:    target,
            Status: 302,
            Cache:  "private, max-age=60",
        },
    }, nil
}
```

S3 or CDN delivery can often use the built-in redirect adapter after the host
projects a signed URL into the delivery reference:

```go
registry := admin.NewMediaDeliveryRegistry()
_ = registry.Register("cdn", admin.MediaRedirectDeliveryAdapter{
    AllowedHosts: []string{"media.example.com"},
    Cache:        "private, max-age=60",
})

adm.WithMediaDeliveryRegistry(registry)
adm.WithMediaDeliveryReferenceProjector(admin.MediaDeliveryReferenceProjectorFunc(
    func(ctx context.Context, item admin.MediaItem) (admin.MediaDeliveryReference, error) {
        ref, err := admin.DefaultMediaDeliveryReferenceProjector{}.ProjectMediaDeliveryReference(ctx, item)
        if err != nil {
            return admin.MediaDeliveryReference{}, err
        }
        ref.Provider = "cdn"
        ref.SourceURL = signCDNURL(ref.StorageKey)
        return ref, nil
    },
))
```

For local development and small deployments, use `MediaLocalFileDeliveryAdapter`
with explicit roots:

```go
registry := admin.NewMediaDeliveryRegistry()
_ = registry.Register("local", admin.MediaLocalFileDeliveryAdapter{
    Roots: []string{"/srv/go-admin/media"},
})
adm.WithMediaDeliveryRegistry(registry)
```

## Testing Checklist

Add tests for the adapter and host wiring, not just the UI:

- The media library contract requires `QueryMedia`; legacy `List` and `Add` are
  not part of `admin.MediaLibrary`.
- Asset with ready Mux ref maps to `MediaItem.Status = "ready"` and has
  playback plus thumbnail URLs.
- Asset with only Google Drive source maps to `imported` or `pending` unless
  Drive playback is intentionally supported.
- Top-level failed asset status does not override a ready provider ref.
- `QueryMedia` applies search, exact type, effective MIME family, pagination,
  and sorting.
- `GetMedia` returns the same mapping as `QueryMedia`.
- `ResolveMedia` supports the value modes used by content fields.
- Capabilities match implemented interfaces and active permissions.
- Suspicious sizes or malformed metadata are normalized safely.
- Media picker content fields store IDs when configured with `valueMode: "id"`.
- URL-mode media picker and gallery schemas use `format: "uri-reference"`.
- Detail previews render native audio/video controls, while grid/list previews
  stay static.
- Existing local example databases with known stale `/static/media/...` rows
  converge through startup/setup.

Useful package-level commands:

```sh
go test ./admin -run 'Media'
go test ./examples/web/stores -run 'Media'
go test ./examples/web/setup -run 'Media|PersistentCMSReconcilesStaleMediaShowcaseRows'
go test ./examples/web -run 'TestEmbeddedAssetsServed|TestWirePersistentMediaLibraryUsesStoreAdapter'
go test ./pkg/client -run 'Media'
cd pkg/client/assets && npm test -- media_player_preview.test.mjs
```

Add host-application tests for the Asset adapter in the package where the Asset
store lives.

## Migration Notes

For projects that still implement the old legacy media contract:

1. Replace `List(ctx)` with `QueryMedia(ctx, query)` and return a `MediaPage`.
2. Move route-layer create behavior to `UploadMedia`, `PresignMedia` plus
   `ConfirmMedia`, or a host-owned mutation route.
3. Implement `GetMedia` for item detail and ID-backed picker hydration.
4. Implement `ResolveMedia` for the value modes your content stores.
5. Implement `UpdateMedia` and `DeleteMedia` only when the host owns those
   mutations.
6. Publish or override capabilities when operations vary by request, provider,
   tenant, or actor.

For projects that hardcode old route names or paths:

1. Replace `media.library` with `media.assets.list`.
2. Replace `media.item` with `media.assets.item`.
3. Use `/admin/api/media/assets` and `/admin/api/media/assets/:id` for JSON
   list/detail calls.
4. Use `/admin/api/media/delivery/:id/asset`, `/stream`, `/poster`, and
   `/download` for browser-embeddable media URLs.
5. Remove assumptions that `url` is a raw provider URL; normal payloads make it
   an alias of `asset_url`.

For projects that already store media URLs in content:

1. Treat URL-mode values as app-owned delivery URLs going forward.
2. Implement `ResolveMedia` by ID and by app-owned delivery URL so content can
   hydrate media previews.
3. Add new content fields with `valueMode: "id"` whenever durable references are
   better than persisted URLs.
4. Backfill existing raw provider or static asset URL values to Media IDs or
   app-owned delivery URLs where possible.
5. Keep legacy URL resolution available only as long as old content revisions
   need it.

For projects that already have an Asset admin panel:

- Keep the Asset panel focused on source/provenance, processing, and operations.
- Use the Media module for editor-facing selection and reuse.
- Avoid making content depend on provider IDs directly; store MediaItem or Asset
  IDs and let the adapter resolve provider URLs.
