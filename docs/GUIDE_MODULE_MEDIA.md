# Media Module Guide

This guide explains how the built-in Media module works in go-admin and how to
connect an external asset system, such as an `Asset` table with provider refs,
so content editors can select reusable media items.

## What it provides

- A feature-gated Media module (`FeatureMedia`) with gallery and list pages.
- A media API contract backed by a host-provided `admin.MediaLibrary`.
- A `MediaItem` view model used by the media page, media picker, and content
  form schema hints.
- Optional richer interfaces for query, get, resolve, upload, presign,
  confirm, update, delete, and request-scoped capabilities.
- Media picker value modes for storing either URLs or stable media IDs.
- A simple in-memory fallback and an example Bun-backed store for demo hosts.

## Source of truth

Use these files as the runtime contract:

- `admin/media.go`: core media types and interfaces.
- `admin/media_module.go`: module-owned gallery/list UI pages.
- `admin/boot_bindings_media_notifications_activity_jobs_settings.go`: API
  binding from HTTP routes to the configured media library.
- `admin/internal/boot/step_media.go`: registered media API routes.
- `admin/admin_schema_runtime.go`: schema-level media endpoint config.
- `admin/media_schema_hints.go` and `admin/panel_action_schema_runtime.go`:
  media picker schema enrichment.
- `pkg/client/templates/resources/media/*.html` and
  `pkg/client/assets/src/media/index.ts`: browser media UI.
- `examples/web/stores/media_store.go`: example persistent implementation.

The example store is not the required data model. The required integration
point is the `admin.MediaLibrary` contract.

## Feature gate and permissions

Enable the media feature before admin initialization:

```go
// quickstart feature defaults or your runtime feature gate
featureDefaults := map[string]bool{
    string(admin.FeatureMedia): true,
}
```

Default permissions are configured on `admin.Config`:

- `Config.MediaPermission`: list, get, resolve, and page access.
- `Config.MediaCreatePermission`: legacy create, upload, presign, confirm.
- `Config.MediaUpdatePermission`: metadata updates.
- `Config.MediaDeletePermission`: deletes.

If the feature is disabled, the module and API return feature-disabled errors.
If the feature is enabled but the active actor lacks permissions, protected
routes return 403.

## Module anatomy

The Media module is implemented as a module-owned UI, not as a normal panel:

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
- `media_default_value_mode`

The browser then calls the API routes instead of embedding media data in the
initial HTML.

## API surface

The media API is registered under the admin API group:

- `GET /admin/api/media/library`
- `POST /admin/api/media/library`
- `GET /admin/api/media/library/:id`
- `PATCH /admin/api/media/library/:id`
- `DELETE /admin/api/media/library/:id`
- `POST /admin/api/media/resolve`
- `POST /admin/api/media/upload`
- `POST /admin/api/media/presign`
- `POST /admin/api/media/confirm`
- `GET /admin/api/media/capabilities`

Route paths can be customized through the routing system; callers should use the
resolved schema/media config rather than hardcoding paths in generated forms or
custom UI.

## Core contract

Every integration must implement the legacy-compatible `MediaLibrary`:

```go
type MediaLibrary interface {
    List(ctx context.Context) ([]MediaItem, error)
    Add(ctx context.Context, item MediaItem) (MediaItem, error)
}
```

New integrations should also implement the richer interfaces as needed:

```go
type MediaQueryProvider interface {
    QueryMedia(ctx context.Context, query MediaQuery) (MediaPage, error)
}

type MediaGetter interface {
    GetMedia(ctx context.Context, id string) (MediaItem, error)
}

type MediaResolver interface {
    ResolveMedia(ctx context.Context, ref MediaReference) (MediaItem, error)
}

type MediaUploader interface {
    UploadMedia(ctx context.Context, input MediaUploadInput) (MediaItem, error)
}

type MediaUpdater interface {
    UpdateMedia(ctx context.Context, id string, input MediaUpdateInput) (MediaItem, error)
}

type MediaDeleter interface {
    DeleteMedia(ctx context.Context, id string) error
}
```

Capabilities are inferred from which optional interfaces your library
implements. You can override or publish request-scoped capability data with
`MediaCapabilityProvider` or `MediaCapabilityOverrideProvider`.

## MediaItem shape

`MediaItem` is the content-facing view of a media asset:

```go
type MediaItem struct {
    ID             string
    Name           string
    URL            string
    Thumbnail      string
    Type           string
    MIMEType       string
    Size           int64
    Status         string
    WorkflowStatus string
    WorkflowError  string
    Metadata       map[string]any
    CreatedAt      time.Time
}
```

Recommended field semantics:

- `ID`: stable media identifier. Prefer the Asset ID when the asset itself is
  the publishable media item.
- `Name`: editor-friendly title, usually asset title or filename.
- `URL`: best usable delivery URL for playback/download/display.
- `Thumbnail`: preview URL for images/video/documents when available.
- `Type`: normalized kind: `image`, `vector`, `video`, `audio`, `document`, or
  `binary`.
- `MIMEType`: original or delivery MIME type.
- `Size`: trusted byte size if available.
- `Status`: coarse availability, such as `ready`, `imported`, `pending`, or
  `failed`.
- `WorkflowStatus`: processing workflow state, such as `complete`,
  `needs_processing`, `processing`, or `failed`.
- `WorkflowError`: short failure reason if applicable.
- `Metadata`: provider refs, technical metadata, captions, alt text, source
  provenance, and normalized renditions.

## Recommended Asset integration pattern

When the host already has an `Asset` table/API, do not duplicate records into
the example `media` table just to satisfy go-admin. Create an adapter:

```text
Asset table/API
  -> AssetMediaLibrary adapter
  -> admin.MediaItem contract
  -> Media module, media picker, content forms
```

This keeps `Asset` as the source/provenance record and `MediaItem` as the
go-admin view model. Content can then store stable media IDs while the adapter
continues to resolve the latest playable URL and metadata.

Use a separate `media_items` table only when editorial media state is distinct
from the source asset, for example:

- manually curated thumbnails or captions;
- publish eligibility independent from asset processing;
- replacement chains or versioning;
- multiple publishable media items derived from one asset;
- provider-independent editorial metadata that must outlive source refs.

## Asset to MediaItem mapping

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

Resolve URLs by provider priority:

1. Ready streaming provider ref, such as Mux playback HLS.
2. Ready direct rendition, such as MP4 or audio download URL.
3. Trusted CDN/source URL.
4. Source-only URL, such as Google Drive, only if the content renderer supports
   it.

Example URL mapping:

```text
Mux ready video/audio:
  URL       = mux.stream_url or metadata.urls.playback
  Thumbnail = metadata.urls.thumbnail
  Status    = ready
  Workflow  = complete

Google Drive source only:
  URL       = gdrive url if usable by the content renderer
  Thumbnail = provider/generated placeholder
  Status    = imported or pending
  Workflow  = needs_processing
```

Do not blindly mirror a stale top-level asset status when provider refs prove a
media item is usable. For example, an asset may have `overall_status = failed`
while a Mux external ref is `ready`. In that case the MediaItem can be `ready`
and should preserve the asset mismatch in `Metadata` or `WorkflowError`.

## Adapter skeleton

Use this shape for an Asset-backed media library:

```go
type AssetStore interface {
    ListMediaAssets(ctx context.Context, query admin.MediaQuery) ([]Asset, int, error)
    GetAsset(ctx context.Context, id string) (Asset, error)
    CreateAssetFromMedia(ctx context.Context, item admin.MediaItem) (Asset, error)
    UpdateAssetMedia(ctx context.Context, id string, input admin.MediaUpdateInput) (Asset, error)
    DeleteAssetMedia(ctx context.Context, id string) error
}

type AssetMediaLibrary struct {
    assets AssetStore
}

func NewAssetMediaLibrary(assets AssetStore) *AssetMediaLibrary {
    return &AssetMediaLibrary{assets: assets}
}

func (l *AssetMediaLibrary) List(ctx context.Context) ([]admin.MediaItem, error) {
    page, err := l.QueryMedia(ctx, admin.MediaQuery{Limit: 50})
    if err != nil {
        return nil, err
    }
    return page.Items, nil
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

func (l *AssetMediaLibrary) Add(ctx context.Context, item admin.MediaItem) (admin.MediaItem, error) {
    asset, err := l.assets.CreateAssetFromMedia(ctx, item)
    if err != nil {
        return admin.MediaItem{}, err
    }
    return assetToMediaItem(asset), nil
}

func (l *AssetMediaLibrary) GetMedia(ctx context.Context, id string) (admin.MediaItem, error) {
    asset, err := l.assets.GetAsset(ctx, strings.TrimSpace(id))
    if err != nil {
        return admin.MediaItem{}, err
    }
    return assetToMediaItem(asset), nil
}

func (l *AssetMediaLibrary) ResolveMedia(ctx context.Context, ref admin.MediaReference) (admin.MediaItem, error) {
    if strings.TrimSpace(ref.ID) != "" {
        return l.GetMedia(ctx, ref.ID)
    }
    // Optional: resolve by URL or name if content stores legacy URL values.
    return admin.MediaItem{}, admin.ErrNotFound
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

The example app uses the same extension point:

```go
func wirePersistentMediaLibrary(adm *admin.Admin, store *stores.MediaStore) {
    if adm == nil || store == nil {
        return
    }
    adm.WithMediaLibrary(store.MediaLibrary())
}
```

If you pass a media library through dependencies during construction, it is used
instead of the in-memory fallback.

## Content field integration

Content models should use media fields instead of plain text URL fields when the
editor should choose media from the library:

```go
admin.Field{
    Name:  "primary_media_id",
    Label: "Primary Media",
    Type:  "media-picker",
}
```

Panel `admin.Field` entries do not carry component options directly. By
default, go-admin enriches `media-picker` and `media-gallery` fields with the
current media endpoints and the default media value mode.

Use `valueMode: "id"` for authored content whenever possible. IDs survive URL
changes caused by reprocessing, CDN migration, provider replacement, or asset
metadata cleanup. Use URL mode only for legacy content or simple image fields
where storing the delivery URL is explicitly desired.

To force ID mode, provide the value mode through the JSON schema metadata that
backs the form:

```json
{
  "type": "object",
  "properties": {
    "primary_media_id": {
      "type": "string",
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

For galleries, use a media-gallery field or an array schema enriched with media
hints:

```go
admin.Field{
    Name:  "attachments",
    Label: "Attachments",
    Type:  "media-gallery",
}
```

Schema example for an ID-backed gallery:

```json
{
  "type": "object",
  "properties": {
    "attachments": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "x-formgen": {
        "widget": "media-picker",
        "componentOptions": {
          "variant": "media-gallery",
          "multiple": true,
          "valueMode": "id"
        }
      }
    }
  }
}
```

go-admin schema decoration adds the current media endpoints to media fields when
`FeatureMedia` is enabled and `Admin.MediaLibrary()` is configured.

## Status and readiness rules

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
5. Validate suspicious denormalized fields before exposing them. For example,
   a small video reporting a multi-terabyte byte size should not be trusted
   without checking the source.

## Metadata conventions

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
basic item. Put the canonical delivery URL in `MediaItem.URL` and the preview in
`MediaItem.Thumbnail`.

## Upload, presign, and confirm

If assets are imported from an external archive, the first integration can be
read-only:

- Implement `List`, `QueryMedia`, `GetMedia`, and `ResolveMedia`.
- Do not implement `UploadMedia`, `PresignMedia`, `ConfirmMedia`,
  `UpdateMedia`, or `DeleteMedia` until the host is ready to support those
  mutations.

Capabilities are inferred from implemented interfaces, so the UI can hide or
disable unsupported operations.

If direct uploads should create Assets:

1. `UploadMedia` stores the binary or forwards it to the asset ingestion
   service.
2. It creates an Asset record with source/provider metadata.
3. It returns a MediaItem immediately if the uploaded file is usable, or a
   pending MediaItem if processing is asynchronous.

If presigned uploads are used:

1. `PresignMedia` creates an upload intent and returns upload target data.
2. The browser uploads directly to storage.
3. `ConfirmMedia` finalizes the intent, creates/updates the Asset, and returns
   the resulting MediaItem.

## Search, filters, and sorting

`MediaQuery` supports:

- `Search`
- `Type`
- `MIMEFamily`
- `Status`
- `WorkflowStatus`
- `Sort`
- `Limit`
- `Offset`

Map these onto asset queries where possible:

```text
Search         -> title/name/filepath/provider ID
Type           -> asset_type
MIMEFamily     -> mime_type LIKE '<family>/%'
Status         -> normalized MediaItem.Status
WorkflowStatus -> normalized processing/workflow status
Sort           -> newest, oldest, name, size
Limit/Offset   -> database pagination
```

If a filter cannot be applied at the database layer, apply it after mapping only
when the result set is small enough. Prefer database-side filtering for the
media page.

## Testing checklist

Add tests for the adapter, not just the UI:

- Asset with ready Mux ref maps to `MediaItem.Status = "ready"` and has
  playback + thumbnail URLs.
- Asset with only Google Drive source maps to `imported` or `pending` unless
  Drive playback is intentionally supported.
- Top-level failed asset status does not override a ready provider ref.
- `QueryMedia` applies search, type, MIME family, pagination, and sorting.
- `GetMedia` returns the same mapping as `QueryMedia`.
- `ResolveMedia` supports the value modes used by content fields.
- Capabilities match implemented interfaces.
- Suspicious sizes or malformed metadata are normalized safely.
- Media picker content fields store IDs when configured with `valueMode: "id"`.

Useful package-level commands:

```sh
go test ./admin -run 'Media'
go test ./examples/web/stores -run 'Media'
go test ./pkg/client -run 'Media'
```

Add host-application tests for the Asset adapter in the package where the Asset
store lives.

## Migration notes

For projects that already store media URLs in content:

1. Implement `ResolveMedia` by URL so legacy content can still hydrate media
   previews.
2. Add new content fields with `valueMode: "id"`.
3. Backfill existing content URL values to Asset IDs where possible.
4. Keep URL resolution available until old content revisions no longer need it.

For projects that already have an Asset admin panel:

- Keep the Asset panel focused on source/provenance, processing, and operations.
- Use the Media module for editor-facing selection and reuse.
- Avoid making content depend on provider IDs directly; store MediaItem/Asset
  IDs and let the adapter resolve provider URLs.
