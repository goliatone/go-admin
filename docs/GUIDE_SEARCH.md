# Guide: Search

This guide is the canonical wiring reference for search in go-admin. It covers admin global search, public site search, `go-search` integration, search route registration, feature gates, permissions, and panel DataGrid search.

Use it when adding search to a host app, replacing legacy search adapters with `go-search`, or debugging why a search route, result, or filter is not visible.

## Table Of Contents

- [Core Model](#core-model)
- [Search Surfaces](#search-surfaces)
- [go-search Ownership](#go-search-ownership)
- [Admin Global Search](#admin-global-search)
- [go-search Admin Adapter](#go-search-admin-adapter)
- [Public Site Search](#public-site-search)
- [Site Search Request Contract](#site-search-request-contract)
- [Site Search Response Contract](#site-search-response-contract)
- [Search Bundle Wiring](#search-bundle-wiring)
- [Search Operations](#search-operations)
- [Feature Gates And Permissions](#feature-gates-and-permissions)
- [Routing And Fallback](#routing-and-fallback)
- [Panel DataGrid Search](#panel-datagrid-search)
- [Examples And Tests](#examples-and-tests)
- [Validation Checklist](#validation-checklist)

## Core Model

Search has three separate meanings in this repository:

1.  Admin global search: admin API endpoints that return cross-resource results for the admin shell and typeahead.
2.  Public site search: public HTML/API routes for site visitors, with facets, filters, pagination, suggestions, and theme-rendered pages.
3.  Panel DataGrid search: list-page text search for one CRUD resource.

Do not collapse these into one abstraction. Admin global search uses `admin.SearchEngine` and `admin.SearchAdapter`. Public site search uses `admin.SearchProvider`. Panel DataGrid search uses `admin.ListOptions.Search` inside the repository list contract.

## Search Surfaces

Default admin routes:

- `GET /admin/api/search?query=<term>&limit=10`
- `GET /admin/api/search/typeahead?query=<term>&limit=5`

Default public site routes:

- `GET /search?q=<term>`
- `GET /search/topics/:topic_slug?q=<term>`
- `GET /api/v1/site/search?q=<term>`
- `GET /api/v1/site/search/suggest?q=<term>`

Default panel list search:

- `GET /admin/api/panels/:panel?search=<term>`
- `GET /admin/api/panels/:panel?q=<term>`

Hosts can change admin roots through `admin.Config.Routing.Roots` and site search paths through `quicksite.SiteConfig.Search`.

## go-search Ownership

`go-admin` consumes `go-search`; it does not own canonical search indexing, ranking, provider behavior, schema management, or source document semantics.

go-admin owns:

- transport handlers and route registration
- feature gates
- admin permissions
- backend-neutral search contracts
- adapter translation between go-admin and `go-search`
- public site page/API rendering envelopes

Host applications own:

- constructing the `go-search` runtime
- registering `go-search` migrations and index definitions
- choosing provider/storage configuration
- indexing source documents
- deciding which indexes are exposed to admin and site search

When using the Postgres-backed `go-search` provider or SQL-backed search stores, register the canonical source-stable migration graph from `go-search/migrations` with the same persistence client used by the rest of the app:

``` go
if err := searchmigrations.Register(
    client,
    searchmigrations.WithProfile(searchmigrations.ProfilePostgresProvider),
); err != nil {
    return err
}
```

Use `ProfileExternalProvider` for external providers that only need generation or editorial store migrations. If host bootstrap owns the Postgres search schema, configure the Postgres provider with `SchemaManagementExternal` so it does not also run its internal plain migration manager.

## Admin Global Search

Admin global search is built around `admin.SearchEngine`:

``` go
type SearchAdapter interface {
    Search(ctx context.Context, query string, limit int) ([]SearchResult, error)
    Permission() string
}
```

Adapters are registered under stable keys:

``` go
engine := adm.SearchService()
engine.Register("users", usersSearchAdapter)
engine.Register("media", mediaSearchAdapter)
```

When no primary adapter is configured, `SearchEngine.Query(...)` fans out across registered adapters. If a result has no `Type`, the engine fills it from the registration key.

When a primary adapter is configured, `SearchEngine.Query(...)` calls only the primary adapter:

``` go
engine.SetPrimary(searchAdapter)
```

Use a primary adapter when `go-search` should be the canonical cross-resource admin search backend. Keep legacy fanout only for older module-local adapters or incremental migrations.

The admin handlers require `query`. They apply default limits, default locale, feature gating, and permission filtering before returning:

``` json
{
  "results": [
    {
      "type": "page",
      "id": "page-1",
      "title": "About",
      "description": "Published page",
      "url": "/about"
    }
  ]
}
```

## go-search Admin Adapter

`admin.NewGoSearchGlobalAdapter(...)` adapts a `go-search` query service into `admin.SearchAdapter`:

``` go
adapter := admin.NewGoSearchGlobalAdapter(admin.GoSearchGlobalAdapterConfig{
    Search:         runtime.SearchQuery(),
    Indexes:        []string{"site_content", "archive_media"},
    PermissionName: "admin.search.view",
    FallbackType:   "search",
})

adm.SearchService().Register("gosearch", adapter)
adm.SearchService().SetPrimary(adapter)
```

The adapter translates the admin query and limit into a `go-search` `SearchRequest`, including the configured indexes as request indexes and metadata. It then maps the `go-search` result page back into admin global `SearchResult` values.

`PermissionName` is checked by go-admin before querying the adapter. If it is empty, the adapter behaves as unprotected in the same way as other `SearchAdapter` implementations.

## Public Site Search

Public site search uses the backend-neutral `admin.SearchProvider` contract:

``` go
type SearchProvider interface {
    Search(ctx context.Context, req SearchRequest) (SearchResultPage, error)
    Suggest(ctx context.Context, req SuggestRequest) (SuggestResult, error)
}
```

`quickstart/site.RegisterSiteRoutes(...)` registers public search routes only when both conditions are true:

- `SiteConfig.Features.EnableSearch` resolves to true.
- `quicksite.WithSearchProvider(provider)` is supplied.

Minimal wiring:

``` go
provider := admin.NewGoSearchSiteProvider(admin.GoSearchSiteProviderConfig{
    Search:  runtime.SearchQuery(),
    Suggest: runtime.SuggestQuery(),
    Indexes: []string{"site_content"},
})

if err := quicksite.RegisterSiteRoutes(
    host.PublicSite(),
    adm,
    cfg,
    siteCfg,
    quicksite.WithSearchProvider(provider),
); err != nil {
    return err
}
```

If the provider is nil or search is disabled, the public search routes are not registered.

## Site Search Request Contract

Public site search accepts these query parameters:

- `q`, `query`, or `search`: text query.
- `locale`: requested locale; falls back to request state locale.
- `page`: 1-based page number.
- `per_page` or `limit`: page size.
- `sort` or `order`: provider-defined sort expression.
- `facet` or `facets`: requested facet fields.
- `index`, `indexes`, `collection`, or `collections`: requested indexes.
- `<field>=<value>`: filter value unless the field is reserved.
- `filter.<field>=<value>`, `filter_<field>=<value>`, or `filters.<field>=<value>`: explicit filter value.
- `<field>_gte=<value>` and `<field>_lte=<value>`: range filters.

Comma-separated values and repeated query parameters are normalized into deduplicated string slices.

Common filter aliases are forwarded:

- `content_type`, `content_types`, and `type` -\> `content_type`
- `tag` and `tags` -\> `tag`
- `category` and `categories` -\> `category`
- `date_from`, `from`, and `start_date` -\> `date_from`
- `date_to`, `to`, and `end_date` -\> `date_to`

The runtime also forwards actor and request metadata so providers can apply tenant, user, authorization, experiment, or observability policies without parsing the HTTP request again.

Empty public search queries return an empty page and do not call the provider
unless an explicit `FilterOnlyPolicy` is enabled. Filter-only execution requires
an eligible configured filter, range, or landing constraint, stays within the
configured page/page-size/candidate ceilings, and requires the provider to
implement `admin.FilterOnlyRequestValidator`. Unknown, stripped, ignored, or
unacknowledged constraints fail closed before `Search` is called.

Application product variants use `admin.SearchVariant`; they do not reuse
`go-search.SearchMode`, which continues to mean lexical, semantic, or hybrid
retrieval. Configure variant and presentation policies on `SiteConfig.Search`:

``` go
Search: quicksite.SiteSearchConfig{
    VariantPolicy: &quicksite.SiteSearchVariantPolicy{
        QueryParameter: "variant",
        Default:        admin.SearchVariant("metadata"),
        Allowed: []admin.SearchVariant{
            admin.SearchVariant("metadata"),
            admin.SearchVariant("transcripts"),
        },
        IncludeInSuggestions: true,
    },
    PageSizePolicy: &quicksite.SiteSearchPageSizePolicy{
        Default: 25,
        Allowed: []int{10, 25, 50},
    },
}
```

`RegisterSiteRoutes` validates explicit policies before registering routes.
`ResolveSiteConfig` remains an errorless normalization helper. A nil policy
preserves legacy behavior; a present policy must satisfy its allowlist and
ceiling rules. The configured variant parameter is reserved and can never
become a provider filter.

## Site Search Response Contract

The public API response shape is:

``` json
{
  "data": {
    "hits": [],
    "page": 1,
    "per_page": 10,
    "total": 0,
    "total_accuracy": "exact",
    "counts": []
  },
  "meta": {
    "query": "archive",
    "locale": "en",
    "sort": "",
    "filters": {},
    "ranges": [],
    "facets": [],
    "indexes": ["site_content"],
    "collections": ["site_content"],
    "landing": null,
    "variant": "metadata"
  }
}
```

Each normalized hit may include typed `evidence` plus the presentation-friendly
`found_in` collection. Named counts are ordered by key and carry `value`,
`accuracy`, and an optional diagnostic. An absent count was not requested;
`value: 0, accuracy: exact` is measured zero; `accuracy: unavailable` requires a
diagnostic and its numeric value must not be presented as a measured zero.

Primary `total_accuracy` is separate from named counts. Evidence similarly
distinguishes absent/not-requested from `complete`, `partial`, `unsupported`,
and `unavailable`; non-complete states carry a diagnostic. Highlighted snippets
are untrusted provider output and must be escaped or sanitized by custom themes.

Suggest responses use:

``` json
{
  "data": {
    "suggestions": ["Archive", "Architecture"]
  },
  "meta": {
    "query": "arc",
    "locale": "en",
    "filters": {},
    "indexes": ["site_content"],
    "collections": ["site_content"]
  }
}
```

Provider errors return HTTP 502 with:

``` json
{
  "error": {
    "code": "search_unavailable",
    "status": 502,
    "message": "provider error"
  }
}
```

The public search page renders the same request/result state into the `site/search` template by default. Site theme packages can provide a generated `site.search.page` template while preserving the runtime search contract.

## Search Bundle Wiring

`admin.NewGoSearchBundle(...)` is the preferred convenience helper when the same `go-search` runtime backs public site search, admin global search, and optional operations:

``` go
bundle := admin.NewGoSearchBundle(admin.GoSearchBundleConfig{
    Search:         runtime.SearchQuery(),
    Suggest:        runtime.SuggestQuery(),
    Health:         runtime.HealthQuery(),
    Stats:          runtime.StatsQuery(),
    EnsureIndex:    runtime.EnsureCommand(),
    Reindex:        runtime.ReindexCommand(),
    Indexes:        []string{"site_content", "archive_media"},
    PermissionName: "admin.search.view",
    FallbackType:   "search",
})

if bundle != nil {
    quicksite.RegisterSiteRoutes(
        host.PublicSite(),
        adm,
        cfg,
        siteCfg,
        quicksite.WithSearchProvider(bundle.SiteProvider),
        quicksite.WithSearchOperations(bundle.Operations),
    )

    bundle.AttachAdminSearch(adm.SearchService(), "gosearch", true)
}
```

`AttachAdminSearch(..., true)` is optional. Set it to true only when the `go-search` adapter should become the primary admin search path. Set it to false when you want to register the adapter alongside legacy fanout adapters during an incremental migration.

## Search Operations

`GoSearchOperations` exposes optional operational commands:

- `HealthStatus(ctx)` calls the configured `go-search` health query.
- `StatsSnapshot(ctx)` calls the configured stats query.
- `Ensure(ctx, definition)` calls the configured ensure-index command.
- `ReindexAll(ctx, index, batchSize)` calls the configured reindex command.

The operations object is passed to site modules through `SiteModuleContext.SearchOps`. Modules can use it for admin-only operational routes or diagnostics, but public site request handlers should normally use the `SearchProvider` contract.

## Feature Gates And Permissions

Admin search is controlled by `admin.FeatureSearch`.

The boot search handlers are registered behind the search feature gate. When the feature is disabled, the handlers return `FeatureDisabledError`, which is mapped to a 404 by default.

`Admin` also toggles `SearchEngine.Enable(...)` from the feature gate during initialization. Direct calls to `SearchEngine.Query(...)` fail with `FeatureDisabledError` when the engine is disabled.

Permissions are adapter-specific:

- Each `SearchAdapter.Permission()` returns the permission checked before that adapter is queried.
- Protected adapters fail closed when no authorizer is configured.
- Unpermitted adapters are skipped, not queried.
- A primary adapter still goes through the same permission check.

Public site search has no built-in admin permission check because it is a public site contract. Providers should enforce any tenant, visibility, locale, draft, or audience rules before returning hits.

## Routing And Fallback

Public site search participates in the routing planner. When search is enabled and a provider is supplied, `quickstart/site` declares ownership for:

- `site.search.page`
- `site.search.topic`
- `site.search.api`
- `site.search.suggest`

Site fallback policy is separate. Do not rely on fallback route registration order to protect admin, API, system, static, or internal-ops routes.

For explicit public-site fallback policies, include `/search` when search pages should be reachable as a known public route:

``` go
quicksite.SiteFallbackPolicy{
    Mode:              quicksite.SiteFallbackModeExplicitPathsOnly,
    AllowRoot:         true,
    AllowedMethods:    []router.HTTPMethod{router.GET, router.HEAD},
    AllowedExactPaths: []string{"/search"},
    ReservedPrefixes:  []string{"/admin", "/api", "/.well-known", "/static", "/assets"},
}
```

See `docs/GUIDE_ROUTING.md` for the broader route ownership and fallback contract.

## Panel DataGrid Search

Panel DataGrid search is not global search and does not use `go-search` by default. It is single-resource list filtering through `admin.ListOptions.Search`.

For panel APIs, prefer a search behavior that emits the canonical `search` parameter:

``` js
class PanelSearchBehavior {
  buildQuery(term) {
    const value = term ? term.trim() : '';
    return value ? { search: value } : {};
  }

  async onSearch(term, grid) {
    grid.resetPagination();
    await grid.refresh();
  }
}
```

The panel route parser maps `?search=term` or `?q=term` into `ListOptions.Search`. Repository adapters pass that search term into their search criteria. Custom repositories must apply `opts.Search` before pagination and return the filtered total.

`GoCrudSearchBehavior(searchableFields)` emits field predicates such as `title__ilike=%term%`. Use it only when the backing repository supports that predicate shape. For normal panel APIs, `PanelSearchBehavior` is safer because it uses the dedicated `Search` field.

See `docs/GUIDE_CRUD.md` for the full panel list, filter, sort, pagination, action, and export contract.

## Examples And Tests

Useful code references:

- `admin/search.go`: legacy/global admin search engine.
- `admin/search_gosearch.go`: `go-search` adapters and bundle.
- `admin/site_search_contracts.go`: public site search contracts.
- `admin/internal/boot/step_search.go`: admin search route handlers.
- `quickstart/site/search_request_execution_runtime.go`: site request translation and provider execution.
- `quickstart/site/search_query_parsing.go`: site query parsing.
- `quickstart/site/register_runtime_flow.go`: site route registration.
- `examples/web/site_search_provider.go`: example provider implementation that does not use `go-search`.

Focused validation commands:

``` sh
go test ./admin ./quickstart/site
```

Broader example validation:

``` sh
go test ./examples/web
```

Use the `go-search` repository's examples for provider/indexing behavior. In this repo, tests validate only the go-admin adapter, route, and contract layer.

## Validation Checklist

Before shipping search wiring:

1.  Host app constructs the `go-search` runtime or a custom `SearchProvider`.
2.  Required `go-search` migrations and index definitions are registered by the host app.
3.  `admin.FeatureSearch` is enabled where admin search routes should exist.
4.  Admin global search adapters return correct `Permission()` values.
5.  Protected admin adapters fail closed without an authorizer.
6.  `AttachAdminSearch(..., true)` is used only when `go-search` should replace legacy fanout.
7.  `quicksite.WithSearchProvider(...)` is supplied when public site search routes should exist.
8.  `SiteConfig.Features.EnableSearch` is true for public site search.
9.  Public search filters, range parameters, locale, facets, and indexes are translated into provider requests as expected.
10. Empty public search queries return empty pages without provider calls.
11. Provider errors return `search_unavailable` with HTTP 502.
12. `/search` renders with the public-site theme surface, not admin theme assets.
13. Admin, API, system, static, and internal-ops routes are protected from site fallback capture.
14. Panel DataGrid search emits `search` or `q` and repositories apply `ListOptions.Search` before pagination.
15. `go test ./admin ./quickstart/site` passes.
