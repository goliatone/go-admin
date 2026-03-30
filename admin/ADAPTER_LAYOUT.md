# Admin Adapter Layout

This note records the current adapter-layout direction for `admin/`.

## Current Direction

- Keep method-bound adapter files in `admin/` until a later change explicitly moves the receiver types and call sites with them.
- Use explicit helper naming for stabilized adapter support files:
  - repository helpers: `repository_adapter_*`
  - CMS helpers: `cms_adapter_*`
- Use `admin/internal/cmsadapter` as the target package for CMS helper families that do not depend on `admin` receiver-private state or admin-only DTO ownership.
- Use `admin/internal/cmsadapter` for extracted CMS state containers as well when they can be expressed without pulling `admin` receiver methods or DTO ownership with them.
- Treat broader subdirectory package moves as a separate refactor step once those receiver/type ownership constraints are actually removed.

## Current Layout

### Repository Adapters

- Live adapter entrypoints stay in:
  - `admin/repository_bun.go`
  - `admin/repository_crud.go`
- Shared repository helper files currently live in:
  - `admin/repository_adapter_list_query.go`
  - `admin/repository_adapter_baseline.go`

### CMS Adapters

- Method-bound CMS adapters stay in:
  - `admin/cms_gocms_menu_adapter.go`
  - `admin/cms_gocms_admin_read_adapter.go`
  - `admin/cms_gocms_content_adapter.go`
  - `admin/cms_gocms_contenttype_adapter.go`
  - `admin/cms_gocms_translation_adapter.go`
  - `admin/cms_gocms_widget_adapter.go`
- Shared CMS helper and mapping files currently live in:
  - `admin/cms_content_type_compat.go`
  - `admin/cms_adapter_translation_mapping.go`
  - `admin/cms_adapter_admin_read_mapping.go`
  - `admin/cms_adapter_content_read.go`
  - `admin/cms_adapter_content_write.go`
  - `admin/cms_adapter_actor_context.go`
- CMS helper families already moved into the concrete internal adapter package now live in:
  - `admin/internal/cmsadapter/channel_scope.go`
  - `admin/internal/cmsadapter/widget_mapping.go`
  - `admin/internal/cmsadapter/block_definition_cache.go`
  - `admin/internal/cmsadapter/content_type_channel.go`
- The single admin-owned CMS channel/context bridge now lives in:
  - `admin/cms_channel_context.go`
- The generic block-definition cache pipeline now also lives there:
  - key normalization in `admin/internal/cmsadapter/block_definition_cache.go`
  - cache-entry collection in `admin/internal/cmsadapter/block_definition_cache.go`
  - block-definition channel getter/setter compatibility helpers in `admin/internal/cmsadapter/block_definition_cache.go`
  - generic cache-entry shaping in `admin/internal/cmsadapter/block_definition_cache.go`
  - content-channel/environment fallback sequencing in `admin/internal/cmsadapter/block_definition_cache.go`
  - block-definition cache environment resolution in `admin/internal/cmsadapter/block_definition_cache.go`
  while `admin/` now owns only the concrete context accessors passed into that sequencing bridge.
  The older private block-definition compatibility wrapper layer in `admin/repository_cms_environment.go` has been removed, so admin call sites now route to the internal helper family directly.
- The content-type channel compatibility helper family now also lives there:
  - content-type channel getter/setter compatibility helpers in `admin/internal/cmsadapter/content_type_channel.go`
  - content-type channel resolution with fallback in `admin/internal/cmsadapter/content_type_channel.go`
  and the direct in-memory CMS, dynamic-panel, content-navigation, and shared record-mapping callers now route through that helper family as well.
  `admin/` now keeps only the exported `CMSContentTypeChannel(...)` compatibility shim in `admin/cms_content_type_compat.go`, and that shim delegates directly into the internal helper family.
- The generic CMS channel-scope helpers also now live there:
  - channel normalization in `admin/internal/cmsadapter/channel_scope.go`
  - channel matching in `admin/internal/cmsadapter/channel_scope.go`
  - generic context-channel resolution in `admin/internal/cmsadapter/channel_scope.go`
  while `admin/cms_channel_context.go` owns the single admin-specific bridge that passes `ContentChannelFromContext(...)` and `EnvironmentFromContext(...)` into that internal helper.
- The explicit internal CMS type boundaries now live inside:
  - `admin/cms_adapter_content_read.go`
  - `admin/cms_adapter_content_write.go`
  where `goCMSContentReadBoundary` owns the read-side flow and `goCMSContentWriteBoundary` owns the mutation/block-definition flow while `GoCMSContentAdapter` delegates through both seams.
- The first extracted CMS state container now lives in:
  - `admin/internal/cmsadapter/block_definition_cache.go`
  and `GoCMSContentAdapter` now delegates block-definition cache publication and lookup into that helper instead of owning the maps and mutex directly.

## Follow-On Work

- If a later slice wants real package moves, it should first identify which receiver-bound files must move together.
- If a helper family still depends on `admin`-owned DTOs or unexported adapter state, it should stay in `admin/` until that ownership is removed.
- If a later slice only improves discoverability, prefer updating this note and naming alignment over widening into a type-boundary refactor.
- If a later slice touches the remaining compatibility residue in this area, the active target is now `admin/cms_content_type_compat.go`; `admin/repository_cms_environment.go` and the temporary `admin/cms_value_helpers.go` residue are both gone.
