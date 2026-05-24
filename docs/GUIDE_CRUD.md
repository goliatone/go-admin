# Guide: CRUD, DataGrid, and Workflow Actions

This guide is the canonical wiring reference for panel CRUD resources, list
DataGrid screens, and command actions attached to rows and bulk selection. For
workflow/state-machine details, see `docs/GUIDE_WORKFLOW.md`.

Use it when adding a new admin resource or when replacing custom list/action
code with the shared panel contracts.

## Table Of Contents

- [Core Model](#core-model)
- [Panel CRUD Backend](#panel-crud-backend)
- [Repository List Contract](#repository-list-contract)
- [DataGrid Filters And Sorting](#datagrid-filters-and-sorting)
- [DataGrid Search](#datagrid-search)
- [Canonical Panel API](#canonical-panel-api)
- [Preview And Subresources](#preview-and-subresources)
- [Error and Validation Contract](#error-and-validation-contract)
- [DataGrid Wiring](#datagrid-wiring)
- [DataGrid Export](#datagrid-export)
- [DataGrid State And Preferences](#datagrid-state-and-preferences)
- [Detail, New, and Edit Pages](#detail-new-and-edit-pages)
- [Detail Page Tabs](#detail-page-tabs)
- [Form Generator Contract](#form-generator-contract)
- [Form Submission Contract](#form-submission-contract)
- [Actions From DataGrid](#actions-from-datagrid)
- [Action Payloads And Selection](#action-payloads-and-selection)
- [Workflow Action Availability](#workflow-action-availability)
- [Workflow Transitions](#workflow-transitions)
- [Validation Checklist](#validation-checklist)

## Core Model

A CRUD resource has three layers:

1. Panel backend: `admin.PanelBuilder` plus an `admin.Repository`.
2. JSON API: canonical panel routes under the configured admin API base, for
   example `/admin/api/panels/:panel`.
3. HTML list/detail/forms: quickstart routes and templates that consume
   `datagrid_config`, `schema`, `records`, and action state.

The panel is the source of truth. Templates and DataGrid should consume the
schema/action contracts emitted by the panel API instead of hardcoding action
availability.

## Panel CRUD Backend

The panel runtime is map-shaped. `PanelBuilder.WithRepository(...)` accepts the
`admin.Repository` adapter contract:

```go
type Repository interface {
    List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error)
    Get(ctx context.Context, id string) (map[string]any, error)
    Create(ctx context.Context, record map[string]any) (map[string]any, error)
    Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
    Delete(ctx context.Context, id string) error
}
```

That interface is not the typed persistence interface from `go-crud` or
`go-repository-bun`. It is the admin-panel boundary after records have been
projected to template/API maps.

For typed stores, keep the typed package interface and use an adapter at the
panel boundary:

- `go-repository-bun`: `repository.Repository[T]` -> `admin.NewBunRepositoryAdapter[T](repo, ...)` -> `admin.Repository`.
- `go-crud`: `crud.Service[map[string]any]` -> `admin.NewCRUDRepositoryAdapter(service)` or `PanelBuilder.WithCRUDService(service)` -> `admin.Repository`.

Current admin adapters:

- Native panel repository: implement `admin.Repository` directly when the
  resource is already map/projector oriented.
- Typed Bun repository: wrap with `admin.NewBunRepositoryAdapter[T](repo, ...)`.
- Map go-crud service: wire with
  `(&admin.PanelBuilder{}).WithCRUDService(service)`.
- In-memory/testing: use `admin.NewMemoryRepository()`.

Do not force typed domain stores to implement `admin.Repository` directly unless
the store is intentionally part of the admin projection layer.

Minimal panel:

```go
builder := (&admin.PanelBuilder{}).
    WithRepository(repo).
    WithActionDefaults(admin.PanelActionDefaultsModeCRUD).
    ListFields(
        admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
        admin.Field{Name: "title", Label: "Title", Type: "text"},
        admin.Field{Name: "status", Label: "Status", Type: "select"},
    ).
    FormFields(
        admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
        admin.Field{Name: "status", Label: "Status", Type: "select", Required: true},
    ).
    DetailFields(
        admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
        admin.Field{Name: "title", Label: "Title", Type: "text"},
        admin.Field{Name: "status", Label: "Status", Type: "text"},
    ).
    Filters(
        admin.Filter{Name: "status", Label: "Status", Type: "select"},
    ).
    Permissions(admin.PanelPermissions{
        View:   "admin.articles.view",
        Create: "admin.articles.create",
        Edit:   "admin.articles.edit",
        Delete: "admin.articles.delete",
    })

if _, err := adm.RegisterPanel("articles", builder); err != nil {
    return err
}
```

`PanelActionDefaultsModeCRUD` adds implicit `view`, `edit`, `delete`, and bulk
`delete` actions. Use `PanelActionDefaultsModeConservative` for `view`/`edit`
only, or `PanelActionDefaultsModeNone` when the panel must emit only explicit
actions.

If `Permissions.Create` is set and the panel uses canonical UI routes, the
builder must provide `FormFields(...)` or `FormSchema(...)`. Otherwise mark the
panel as custom-owned with `WithUIRouteMode(admin.PanelUIRouteModeCustom)` and
register the HTML routes yourself.

## Repository List Contract

`Repository.List(...)` receives `admin.ListOptions` from DataGrid and panel API
queries:

```go
type ListOptions struct {
    Page       int
    PerPage    int
    SortBy     string
    SortDesc   bool
    Filters    map[string]any
    Predicates []admin.ListPredicate
    Fields     []string
    Search     string
}
```

Repositories must return the requested page slice plus the total count after
search/filter predicates are applied. `total` must be stable across pages for
the same query, including out-of-range pages.

Use these conventions:

- `Page` is 1-based. Treat invalid page/per-page input conservatively in the
  adapter or repository.
- `Search` is the global text query from the list UI.
- `Filters` are simple field filters.
- `Predicates` are operator-aware filters with field/operator/values.
- `SortBy` and `SortDesc` describe the requested sort.
- `Fields` can be used as a projection hint, but records still need every field
  required by rendered columns and action state.

Every listed record must expose a stable `id` value. The same ID is used for row
actions, detail/edit routes, delete, bulk selection, and record-scoped tab
filters such as `{{record.id}}`.

## DataGrid Filters And Sorting

DataGrid filtering and sorting work only when all three layers agree:

1. The panel schema declares visible list fields and filter controls.
2. The HTML/DataGrid configuration marks the matching columns as sortable or
   filterable and uses the shared go-crud behaviors.
3. The repository or adapter applies `ListOptions` before pagination and returns
   the filtered total.

`admin.Filter` configures the list UI and schema. It does not, by itself,
implement repository filtering. Custom repositories must read `opts.Filters`,
`opts.Predicates`, `opts.SortBy`, and `opts.SortDesc`.

Panel setup:

```go
builder := (&admin.PanelBuilder{}).
    WithRepository(repo).
    ListFields(
        admin.Field{Name: "title", Label: "Title", Type: "text"},
        admin.Field{Name: "status", Label: "Status", Type: "select"},
        admin.Field{Name: "created_at", Label: "Created", Type: "datetime"},
    ).
    FormFields(
        admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
        admin.Field{
            Name:  "status",
            Label: "Status",
            Type:  "select",
            Options: []admin.Option{
                {Label: "Draft", Value: "draft"},
                {Label: "Published", Value: "published"},
            },
        },
    ).
    Filters(
        admin.Filter{
            Name:            "title",
            Label:           "Title",
            Type:            "text",
            Operators:       []string{"eq", "ilike", "in"},
            DefaultOperator: "ilike",
        },
        admin.Filter{
            Name:            "status",
            Label:           "Status",
            Type:            "select",
            Operators:       []string{"eq", "in"},
            DefaultOperator: "eq",
            Options: []admin.Option{
                {Label: "Draft", Value: "draft"},
                {Label: "Published", Value: "published"},
            },
        },
    )
```

For content-entry screens, `contentEntryColumns(...)` marks a column filterable
when its field is declared in `schema.Filters`. Columns are sortable by default
unless the field is hidden or a large/nested type such as `textarea`, `json`,
`object`, `array`, `block-library-picker`, or `blocks`. If no explicit filters
are configured, content-entry routes create fallback filters from visible list
fields; option-backed fields become select filters with `eq`/`in`, while text
fields default to `ilike`.

The shared client behaviors emit these list query parameters:

```text
?page=1&per_page=10
?order=title asc
?order=created_at desc
?status=published
?status__in=draft,published
?title__ilike=home
```

`GoCrudSortBehavior` sends `order=<field> <asc|desc>`. The panel route parser
also accepts the legacy shape `sort=<field>&sort_desc=true`, but new DataGrid
templates should use `GoCrudSortBehavior`.

`GoCrudFilterBehavior` sends simple equality as `field=value`; non-equality
operators use `field__operator=value`; multiple values for the same equality
filter become `field__in=a,b`. The panel API parser converts those query
parameters into both:

- `ListOptions.Filters`, the original map shape, for simple repositories.
- `ListOptions.Predicates`, normalized `{Field, Operator, Values}` entries, for
  operator-aware repositories.

Common operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`,
`ilike`, and `contains`. Adapters and repositories may support a subset, but
they should ignore empty filters and handle unsupported operators
conservatively.

Backend setup depends on the repository type:

- `admin.NewBunRepositoryAdapter[T](...)` translates pagination, search,
  `SortBy`/`SortDesc`, and predicates into repository criteria. Use custom
  filter builders when a UI field does not map directly to a database column.
- `admin.NewCRUDRepositoryAdapter(...)` translates the same list options into
  go-crud `ListQueryOptions` and preserves query values for services that still
  inspect the request context.
- Custom `admin.Repository` implementations must apply search and filters before
  sorting and pagination, then return the page slice plus the total after
  filtering.

Minimal custom repository pattern:

```go
func (r *ArticleRepository) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
    records, err := r.loadRecords(ctx)
    if err != nil {
        return nil, 0, err
    }

    predicates := admin.NormalizeListPredicates(opts)
    filtered := applyArticleSearch(records, opts.Search)
    filtered = applyArticlePredicates(filtered, predicates)
    sortArticleRecords(filtered, opts.SortBy, opts.SortDesc)

    total := len(filtered)
    page := max(opts.Page, 1)
    perPage := opts.PerPage
    if perPage <= 0 {
        perPage = 10
    }
    start := min((page-1)*perPage, total)
    end := min(start+perPage, total)
    return articleMaps(filtered[start:end]), total, nil
}
```

Do not paginate before applying filters or custom sorting. Otherwise page totals
will drift, sorted page two can repeat or skip rows, and the DataGrid pagination
normalizer will keep correcting the browser state.

## DataGrid Search

Global search is separate from column filters. The search box only affects API
requests when the DataGrid has a `search` behavior wired.

For panel APIs, prefer a search behavior that emits the canonical `search`
parameter:

```js
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

Then include it in the DataGrid behaviors:

```js
behaviors: {
  search: new PanelSearchBehavior(),
  filter: new GoCrudFilterBehavior(),
  pagination: new GoCrudPaginationBehavior(),
  sort: new GoCrudSortBehavior(),
}
```

The panel route parser maps `?search=term` or `?q=term` into
`ListOptions.Search`. Repository adapters pass that search term into their
search criteria. Custom repositories must apply `opts.Search` before pagination
and return the filtered total.

`GoCrudSearchBehavior(searchableFields)` emits field predicates such as
`title__ilike=%term%`. Use it only when the backing repository supports that
predicate shape for global search. For normal panel APIs, `PanelSearchBehavior`
is the safer default because it uses the dedicated `Search` field.

## Canonical Panel API

Registered panels expose these JSON routes through the admin API group. The
default examples below use `/admin/api`, but apps can configure a different API
base such as `/admin/api/v1`.

- `GET /admin/api/panels/:panel`: list records.
- `GET /admin/api/panels/:panel/:id`: detail record.
- `POST /admin/api/panels/:panel`: create record.
- `PUT /admin/api/panels/:panel/:id`: update record.
- `DELETE /admin/api/panels/:panel?id=:id` or
  `DELETE /admin/api/panels/:panel/:id`: delete record.
- `POST /admin/api/panels/:panel/actions/:action`: row/detail action.
- `POST /admin/api/panels/:panel/bulk/:action`: bulk action.
- `POST /admin/api/panels/:panel/bulk-actions/state`: refresh
  selection-sensitive bulk state.
- `GET /admin/api/panels/:panel/:id/preview`: preview payload when preview is
  configured.
- `GET /admin/api/panels/:panel/:id/:subresource/:value`: panel subresource
  payloads for declared `PanelSubresource` entries. The method can be changed
  per subresource.

List responses include:

- `records` / `items`: list rows.
- `total`: total row count.
- `schema`: fields, filters, row actions, bulk actions, and optional bulk action
  state config.
- `form`: form schema payload when available.
- `$meta.count`: same count as `total`.
- `$meta.bulk_action_state`: static list-level bulk action state when available.

Detail responses include:

- `data`: the detail record.
- `schema`: detail-scoped fields/actions and decorated schema metadata.
- `form`: form schema payload when available.
- `siblings`: translation sibling context for content panels.

Row and detail action availability is server-authored:

- list row: `record._action_state`
- detail payload: `data._action_state`
- bulk list state: `$meta.bulk_action_state`
- selected-row bulk refresh: `bulk_action_state` from the bulk state endpoint

Do not invent per-resource action-state endpoints.

## Preview And Subresources

Preview and subresource routes are optional panel API extensions. Do not expose
buttons or links for them unless the panel and backing services are configured.

Preview route:

```text
GET /admin/api/panels/:panel/:id/preview
```

The default panel preview binding generates a short-lived preview token through
the admin preview service and returns a URL payload. Quickstart edit pages also
build a site preview URL when a record has enough path information. For content
entries, the path is resolved from record fields in this order:

- top-level `path` or `preview_url`
- nested `data.path` or `data.preview_url`
- `slug` as a fallback

Preview requires `Config.PreviewSecret` and a configured preview service. Site
delivery must validate the `preview_token` query parameter before showing draft
content. Repositories should return the record fields needed to build the
preview path on edit/detail payloads.

Subresource route:

```text
GET /admin/api/panels/:panel/:id/:subresource/:value
```

Declare subresources on the panel:

```go
builder.Subresources(
    admin.PanelSubresource{
        Name:       "source",
        Method:     "GET",
        Permission: "admin.documents.view",
    },
)
```

Then implement subresource serving on the repository or panel binding path used
by the resource. A subresource handler receives the current admin context, HTTP
context, record ID, subresource name, and route value. It should enforce the
same ownership and permission assumptions as normal detail/download routes and
return `admin.ErrNotFound` or `admin.ErrForbidden` when appropriate.

Use subresources for record-owned streams or side payloads such as source files,
artifacts, or generated previews. Keep CRUD JSON under the normal detail route.

## Error and Validation Contract

CRUD and action handlers should return typed errors that the shared error
presenter can map into consistent JSON/HTML responses.

Use the common sentinels and domain errors:

- `admin.ErrNotFound`: missing panel or record; renders 404.
- `admin.ErrForbidden`: permission or ownership failure; renders 403.
- `admin.NewDomainError(admin.TextCodeValidationError, ...)`: invalid
  create/update/action payloads; renders 400. Code inside the `admin` package
  can use `validationDomainError(...)`.
- `admin.NewDomainError(admin.TextCodeConflict, ...)` or a more specific
  registered domain code: stale workflow state, uniqueness conflicts, in-use
  resources, and other domain conflicts. Code inside the `admin` package can
  use helpers such as `conflictDomainError(...)` and
  `resourceInUseDomainError(...)`.
- `admin.NewDomainError(admin.TextCodeInvalidSelection, ...)`: invalid or
  empty bulk action selection. Code inside the `admin` package can use
  `invalidSelectionDomainError(...)`.
- `admin.NewDomainError(admin.TextCodeServiceUnavailable, ...)`: missing
  runtime dependency. Code inside the `admin` package can use
  `serviceNotConfiguredDomainError(...)`.

Do not return only ad hoc strings from repositories, commands, or handlers when
the client needs to distinguish validation, permission, conflict, stale state,
or missing dependency. Attach metadata such as `field`, `id`, `panel`,
`action`, `expected_version`, or `current_state` when it helps the UI render a
specific message.

Runtime enforcement must still happen in repositories, command handlers, or
hooks even when `_action_state` already disabled the button. Action state is a
client affordance, not the source of authorization.

## DataGrid Wiring

Quickstart list routes inject `datagrid_config`. New templates should read this
object first and use legacy keys only as fallback.

Current keys:

- `table_id`: base ID; append `-datatable` for the table DOM ID.
- `api_endpoint`: canonical list API, usually `/admin/api/panels/:panel`.
- `action_base`: HTML action base for navigation, usually
  `/admin/content/:panel` for content-entry screens.
- `preferences_endpoint`: optional preferences panel API path.
- `column_storage_key`: stable column-visibility storage key.
- `translation_ux_enabled`: content translation UI opt-in.
- `enable_grouped_mode`, `default_view_mode`, `group_by_field`: grouped/matrix
  translation list options.
- `state_store`: optional `{mode, resource, sync_debounce_ms,
  hydrate_timeout_ms, max_share_entries}`.
- `url_state`: optional `{max_url_length, max_filters_length,
  enable_state_token}`.
- `export_config`: optional export endpoint/definition payload.

Recommended template pattern:

```js
const dataGridConfig = {{ toJSON(datagrid_config)|safe }} || {};
const tableBaseId = dataGridConfig.table_id || '{{ datatable_id|default:resource }}';
const tableId = `${tableBaseId}-datatable`;
const apiEndpoint = dataGridConfig.api_endpoint || '{{ list_api|default:"" }}';
const actionBasePath = dataGridConfig.action_base || '{{ action_base|default:"" }}';
const exportConfig = dataGridConfig.export_config || {{ toJSON(export_config)|safe }};
```

Initialize DataGrid with the shared go-crud behaviors unless the resource has a
specific reason to override them:

```js
const grid = new DataGrid({
  tableId,
  apiEndpoint,
  actionBasePath,
  columns,
  perPage: 10,
  behaviors: {
    search: new PanelSearchBehavior(),
    filter: new GoCrudFilterBehavior(),
    pagination: new GoCrudPaginationBehavior(),
    sort: new GoCrudSortBehavior(),
    export: exportConfig ? new GoCrudExportBehavior(exportConfig) : undefined,
    columnVisibility: columnVisibilityBehavior,
  },
  selectors: {
    searchInput: '#table-search',
    perPageSelect: '#table-per-page',
    filterRow: '[data-filter-column]',
    paginationContainer: '#table-pagination',
    selectAllCheckbox: '#table-checkbox-all',
    rowCheckboxes: '.table-checkbox',
    bulkActionsBar: '#bulk-actions-overlay',
    selectedCount: '#selected-count',
  },
});
```

Column definitions should use field names that the repository can filter and
sort. Mark a column `filterable` only when a matching `admin.Filter` exists or
the backing repository handles that field. Mark a column `sortable` only when
`opts.SortBy` for that field is supported. A sortable or filterable column is a
UI promise that the list API can honor the emitted query parameters.

Column visibility should use `datagrid_config.column_storage_key`. If
`state_store.mode` is `preferences`, also provide `preferences_endpoint` so the
client can hydrate/sync user state with local fallback.

Content-entry templates currently use the richer content DataGrid implementation
in `pkg/client/templates/resources/content/list.html`. Roles use a smaller
reference implementation in `pkg/client/templates/resources/roles/list.html`.

## DataGrid Export

`GoCrudExportBehavior` requires a usable `export_config`; otherwise the
constructor fails. Quickstart builds this from panel view capabilities:

```go
exportConfig := quickstart.BuildPanelExportConfig(cfg, quickstart.PanelViewCapabilityOptions{
    Definition:     "articles",
    Variant:        "default",
    ExportEndpoint: "/admin/exports",
})
```

The resulting template payload must include:

- `endpoint`: POST target for export requests.
- `definition` or `resource`: export definition name.
- `variant` or `sourceVariant`: optional export variant.
- `delivery`: optional `auto`, `sync`, or `async`; PDF defaults to async.
- `columns`: optional explicit columns. Otherwise visible DataGrid columns are
  exported.
- `selection`: optional explicit selection. Otherwise selected rows are exported
  when any are selected; if none are selected, mode is `all`.

The client posts this payload:

```json
{
  "definition": "articles",
  "format": "csv",
  "delivery": "auto",
  "columns": ["title", "status", "created_at"],
  "selection": {"mode": "ids", "ids": ["article_1"]},
  "query": {
    "filters": [{"field": "status", "op": "eq", "value": "published"}],
    "sort": [{"field": "created_at", "desc": true}]
  }
}
```

The export backend must register the named definition and honor the `query`,
`selection`, and `columns` values. The query is derived from the current
DataGrid search, filters, sorting, and pagination behaviors, so export results
should match what the user is viewing unless the export definition intentionally
expands scope.

If export is not configured for a resource, omit the export behavior and export
buttons from the template instead of passing an empty config.

## DataGrid State And Preferences

DataGrid has two related state channels:

- URL state: shareable/search state such as page, per-page, filters, and sort.
- Persisted state: user preferences such as view mode, group expansion, hidden
  columns, and column order.

Use `datagrid_config.column_storage_key` for column visibility. It defaults from
the table ID when quickstart builds `datagrid_config`, but resource-specific
templates should pass the configured key to the column visibility behavior so
renaming DOM IDs does not lose user preferences.

Use `datagrid_config.state_store` when the resource should persist richer grid
state:

```json
{
  "mode": "preferences",
  "resource": "articles",
  "sync_debounce_ms": 500,
  "hydrate_timeout_ms": 1500,
  "max_share_entries": 20
}
```

When `state_store.mode` is `preferences`, also provide
`datagrid_config.preferences_endpoint`. The client hydrates from preferences
with local fallback. Use `mode: "local"` for browser-local persistence only.

Use `datagrid_config.url_state` to constrain shareable URL state:

```json
{
  "max_url_length": 1800,
  "max_filters_length": 600,
  "enable_state_token": true
}
```

If filters or share state exceed the configured URL limits and state tokens are
enabled, the client stores a compact share token instead of overlong query
parameters.

## Detail, New, and Edit Pages

Panel route ownership has two separate settings:

- `PanelUIRouteModeCanonical`: quickstart owns the HTML list/detail/new/edit
  routes for the panel.
- `PanelUIRouteModeCustom`: the module owns the HTML routes and must register
  them itself.
- `PanelEntryModeList`: `/admin/<panel>` renders the list/DataGrid entry.
- `PanelEntryModeDetailCurrentUser`: `/admin/<panel>` resolves the current user
  and renders their detail page.

`PanelUIRouteModeCustom` only changes HTML route ownership. The registered
panel still exposes canonical JSON API routes unless the module chooses not to
register a panel.

Canonical panel UI routes are registered when the panel uses
`PanelUIRouteModeCanonical` and the URL manager has a concrete admin route for
the panel. Route aliases are resolved from registered admin routes such as
`users`, `user-profiles`, or their dash/underscore variants. Panels without a
concrete route still use the generic content-entry fallback under
`/admin/content/:panel`.

For a concrete panel route such as `/admin/users`, quickstart registers:

- `GET /admin/<panel>`: list/datagrid, unless `EntryMode` overrides it.
- `GET /admin/<panel>/new`: create form.
- `POST /admin/<panel>`: create record.
- `GET /admin/<panel>/:id`: detail page.
- `GET /admin/<panel>/:id/edit`: edit form.
- `POST /admin/<panel>/:id`: update record.
- `POST /admin/<panel>/:id/delete`: delete record.

The generic `/admin/content/:panel` content-entry handler resolves panel
context, applies panel permissions, then renders the shared templates. It does
not serve panels marked `PanelUIRouteModeCustom`.

Detail pages call `panel.Get(...)`, hydrate relation/translation links, and pass
these view keys:

- `resource_item`: the record map.
- `fields`: detail fields resolved from `DetailFields(...)`, content type
  schema, and record values.
- `routes`: `index`, `new`, and `create` helpers. Detail templates can use the
  record `actions` map for `edit` and `delete` links.
- `content_type`, `panel_name`, `resource_label`, `base_path`.

Default content detail rendering lives in
`pkg/client/templates/resources/content/detail.html`, backed by
`pkg/client/templates/resources/shared/detail-base.html`. Resource-specific
templates can override blocks for identity/header/field presentation, but they
should keep `resource_item` and `fields` as the contract.

New and edit pages both render through go-formgen. The handler builds:

- `form_action`: collection create URL for new records, record update URL for
  edits.
- `form_html`: generated HTML from the form renderer.
- `resource_item`: existing record for edit pages; nil/empty for new pages.
- `is_edit`: `false` for new, `true` for edit.
- `preview_url`: optional edit-page preview link.

The default template is `pkg/client/templates/resources/content/form.html`,
which renders `{{ form_html|safe }}` and loads:

- `runtime/formgen-behaviors.min.js`
- `runtime/formgen-relationships.min.js`

Create and update submissions are parsed against the same schema used to render
the form. JSON requests are accepted directly; browser form submissions are
converted from form values, with arrays and booleans normalized from the schema.

## Detail Page Tabs

Detail pages can expose record-scoped tabs through the panel tab contract. Use
tabs for related records, secondary dashboards, activity feeds, or alternate
detail presentations that should stay attached to one record URL.

Register detail tabs on the panel with `Scope: admin.PanelTabScopeDetail`:

```go
admin.WithUserPanelTabs(
    admin.PanelTab{
        ID:         "profile",
        Label:      "Profile",
        Icon:       "user-circle",
        Position:   10,
        Scope:      admin.PanelTabScopeDetail,
        Permission: cfg.UsersPermission,
        Target:     admin.PanelTabTarget{Type: "panel", Panel: "user-profiles"},
        Filters:    map[string]string{"user_id": "{{record.id}}"},
    },
    admin.PanelTab{
        ID:         "activity",
        Label:      "Activity",
        Icon:       "clock",
        Position:   20,
        Scope:      admin.PanelTabScopeDetail,
        Permission: cfg.UsersPermission,
        Target:     admin.PanelTabTarget{Type: "path", Path: path.Join(cfg.BasePath, "activity")},
        Query:      map[string]string{"user_id": "{{record.id}}"},
    },
)
```

`PanelTabTarget.Type` supports:

- `panel`: link the tab to another registered panel, usually with `Filters`
  resolved from the current record.
- `path`: link the tab to an app route, usually with `Query` resolved from the
  current record.
- `external`: link outside the admin app.

`Filters` and `Query` values can use record templates such as
`{{record.id}}`. Tabs are merged into the panel schema and filtered by their
`Permission` before rendering.

The detail route owns the active tab state. The canonical URL shape is:

```text
/admin/users/:id?tab=details
```

Use `details` as the default tab. For custom detail pages, resolve the active
tab from `?tab=...`, build tab view models, and pass these keys to the template:

- `tabs`: tab view models for `partials/panel-tabs.html`.
- `active_tab`: selected tab ID, defaulting to `details`.
- `tab_panel`: resolved inline content for the selected tab.

The users example uses a custom detail handler and routes because the users
HTML pages are custom-owned:

```go
adminUI.Get(path.Join(cfg.BasePath, "users/:id/tabs/:tab"), wrapAuthed(userHandlers.TabHTML))
adminAPI.Get(path.Join(adminAPIBasePath, "users", ":id", "tabs", ":tab"), wrapAuthed(userHandlers.TabJSON))
```

The template renders the shared tab strip from `detail-base.html`, adds a
`data-tab-panel-container`, includes `partials/tab-panel.html` for the current
tab, and initializes `initTabsController()` from `assets/dist/tabs/index.js`.

Inline tab render modes:

- `ssr`: resolve content during the initial detail page render.
- `hybrid`: render the initial page, then refresh tab content from the HTML tab
  partial route.
- `client`: fetch tab content from the JSON tab route and let the browser render
  it.

Non-inline tabs should navigate to their target URL. If a requested inline tab
does not exist or the user cannot access it, fall back to `details` or return a
permission error before loading tab data.

For widget-backed tabs, keep this guide as the CRUD contract and use
`docs/GUIDE_TAB_WIDGETS.md` for the full area/provider/widget rendering flow.

## Form Generator Contract

Panels can supply form schema two ways:

- `FormFields(...)`: concise panel fields converted into JSON Schema.
- `FormSchema(...)`: explicit JSON Schema, optionally merged with
  `FormFields(...)`.

`FormFields(...)` are converted by `buildFormSchema(...)`:

- `Field.Required` contributes to `required`.
- `Field.ReadOnly` emits `readOnly` and `read_only`.
- `Field.Hidden` emits `x-hidden`.
- `Field.Options` emits `x-options`.
- common field types map to formgen widgets, for example `textarea`,
  `media-picker`, `block`, `block-library-picker`, and `schema-editor`.

Use `FormSchema(...)` when the form needs nested objects, arrays, custom
widgets, custom component config, relationship widgets, or content-type authored
schemas. Formgen metadata should stay on the schema properties, for example:

```go
builder.FormSchema(map[string]any{
    "type": "object",
    "required": []string{"title"},
    "properties": map[string]any{
        "title": map[string]any{
            "type":  "string",
            "title": "Title",
        },
        "hero_image": map[string]any{
            "type":             "string",
            "title":            "Hero Image",
            "x-formgen:widget": "media-picker",
            "x-formgen": map[string]any{
                "component.config": map[string]any{
                    "variant": "media-picker",
                },
            },
        },
    },
})
```

Media fields receive admin media endpoint hints automatically when media
configuration is available. Prefer those generated hints over hardcoding upload
or resolve paths in templates.

If a panel sets `Permissions.Create` and uses canonical UI routes, it must have
a renderable form schema from `FormFields(...)` or `FormSchema(...)`; otherwise
registration fails. Panels that own a fully custom create/edit UI should use
`WithUIRouteMode(admin.PanelUIRouteModeCustom)` and register their own handlers.

## Form Submission Contract

Canonical new/edit pages submit against the same schema used to render the
form. JSON requests are decoded directly. Browser form submissions support
`application/x-www-form-urlencoded` and `multipart/form-data`, then coerce values
from the JSON Schema.

Important parsing behavior:

- Repeated form keys become arrays.
- A field submitted as `name[]` maps to `name` only when the schema says the
  field type is `array`.
- Single submitted values for array fields are parsed as array values.
- Missing boolean fields are set to `false`, which keeps unchecked checkboxes
  from disappearing.
- Nested field paths are supported by the form parser and are written back into
  nested maps.
- Invalid form payloads return a validation-style `INVALID_FORM` error.

`FormFields(...)` and `FormSchema(...)` describe rendering and parsing, but the
repository remains the authority for create/update validation. Repositories and
services should still enforce required domain fields, uniqueness, ownership,
workflow state, and read-only server-managed values.

Read-only and hidden form metadata are UI hints, not a security boundary.
Quickstart removes unsupported `readOnly` keywords before rendering content
entry forms so the form generator can render consistently. Do not trust a
browser to omit hidden or read-only fields; ignore or overwrite server-managed
values in repository code.

For custom widgets, keep submitted values aligned with the schema type. If a
widget posts JSON strings for arrays or objects, make sure the parser or
repository normalizes those values before persistence.

## Actions From DataGrid

Define actions on the panel, not in the template:

```go
builder.Actions(
    admin.Action{
        Name:        "publish",
        Label:       "Publish",
        CommandName: "articles.publish",
        Permission:  "admin.articles.publish",
        Scope:       admin.ActionScopeAny,
        Icon:        "check-circle",
    },
)

builder.BulkActions(
    admin.Action{
        Name:        "publish",
        Label:       "Publish",
        CommandName: "articles.bulk_publish",
        Permission:  "admin.articles.publish",
        Scope:       admin.ActionScopeBulk,
        Confirm:     "Publish {count} article(s)?",
    },
)
```

Register the matching command and message factory:

```go
type ArticlePublishMsg struct {
    IDs []string `json:"ids"`
}

func (ArticlePublishMsg) Type() string { return "articles.publish" }

if err := admin.RegisterMessageFactory(adm.Commands(), "articles.publish",
    func(payload map[string]any, ids []string) (ArticlePublishMsg, error) {
        return ArticlePublishMsg{IDs: ids}, nil
    },
); err != nil {
    return err
}

if _, err := admin.RegisterCommand(adm.Commands(), NewArticlePublishCommand(repo)); err != nil {
    return err
}
```

Execution flow:

1. DataGrid renders `schema.actions` and `schema.bulk_actions`.
2. User triggers an action.
3. Client posts to `/admin/api/panels/:panel/actions/:action` or
   `/admin/api/panels/:panel/bulk/:action`.
4. `Panel.RunActionResponse` / `Panel.RunBulkAction` dispatches the configured
   `CommandName` through the admin command bus.
5. The client refreshes the grid or detail payload after success or structured
   domain failure.

Use `SchemaActionBuilder` for row/detail action rendering. It understands
`_action_state`, keeps disabled actions visible, formats structured failures,
and supports reconciliation hooks.

## Action Payloads And Selection

The panel action routes resolve target IDs from query parameters and JSON body.
Factories should accept the `ids []string` argument from
`RegisterMessageFactory(...)`, then merge any extra payload fields they need.

ID sources are deduped from:

- `?id=...`
- `?ids=a,b` or `?ids=a;b`
- body `id`
- body `ids`
- body `selection.id`
- body `selection.ids`
- body `record.id`

Typical row action payload:

```json
{
  "id": "article_123",
  "record": {"id": "article_123"}
}
```

Typical bulk action payload:

```json
{
  "selection": {
    "mode": "ids",
    "ids": ["article_123", "article_456"]
  }
}
```

Action definitions can require additional payload fields:

```go
admin.Action{
    Name:            "schedule",
    Label:           "Schedule",
    CommandName:     "articles.schedule",
    Scope:           admin.ActionScopeBulk,
    PayloadRequired: []string{"publish_at"},
    PayloadSchema: map[string]any{
        "type": "object",
        "properties": map[string]any{
            "publish_at": map[string]any{"type": "string", "format": "date-time"},
        },
    },
}
```

`PayloadRequired` is checked before command dispatch. `PayloadSchema`, when
present, is compiled as JSON Schema and validates the normalized payload.
Idempotent actions can set `Idempotent: true` and optionally
`IdempotencyField`; the route fills a missing idempotency field from the action
name and target ID.

Message factories should validate domain-specific payload rules and return
typed validation/domain errors when selection or required fields are invalid:

```go
func buildArticleScheduleMsg(payload map[string]any, ids []string) (ArticleScheduleMsg, error) {
    publishAt, _ := payload["publish_at"].(string)
    msg := ArticleScheduleMsg{
        IDs:       append([]string{}, ids...),
        PublishAt: strings.TrimSpace(publishAt),
    }
    if len(msg.IDs) == 0 {
        return msg, admin.NewDomainError(admin.TextCodeInvalidSelection, "article ids required", nil)
    }
    if msg.PublishAt == "" {
        return msg, admin.NewDomainError(
            admin.TextCodeValidationError,
            "publish_at required",
            map[string]any{"field": "publish_at"},
        )
    }
    return msg, nil
}
```

Command handlers must still enforce authorization, ownership, workflow state,
and stale-state checks. Disabled action state and payload validation are client
and route affordances, not the final security layer.

## Workflow Action Availability

Workflow and business-rule availability should be server-authored.

Use `Action.Guard` when a decision is cheap and record-local:

```go
admin.Action{
    Name:        "publish",
    CommandName: "articles.publish",
    Scope:       admin.ActionScopeAny,
    Guard: func(ctx admin.ActionGuardContext) admin.ActionState {
        if ctx.Record["status"] == "draft" {
            return admin.ActionState{Enabled: true}
        }
        return admin.ActionState{
            Enabled:    false,
            ReasonCode: admin.ActionDisabledReasonCodeInvalidStatus,
            Reason:     "Only draft articles can be published.",
            Kind:       "workflow",
            Severity:   "info",
        }
    },
}
```

Use `WithActionStateResolver(...)` when availability needs batch lookup or I/O:

```go
builder.WithActionStateResolver(func(
    ctx admin.AdminContext,
    records []map[string]any,
    actions []admin.Action,
    scope admin.ActionScope,
) (map[string]map[string]admin.ActionState, error) {
    out := map[string]map[string]admin.ActionState{}
    // Key by canonical record ID, then action name.
    out["article_123"] = map[string]admin.ActionState{
        "publish": {
            Enabled:    false,
            ReasonCode: admin.ActionDisabledReasonCodePreconditionFailed,
            Reason:     "Article has unresolved review comments.",
            Kind:       "business_rule",
        },
    }
    return out, nil
})
```

Use `WithBulkActionStateResolver(...)` for static list-level bulk state. If a
bulk action also has guards or an action-state resolver, the schema advertises
`bulk_action_state_config.selection_sensitive=true`, and DataGrid should call
`/admin/api/panels/:panel/bulk-actions/state` when the selected rows change.

Runtime enforcement must still live in command handlers, repository methods, or
hooks. Action state is an affordance contract, not the only security layer.

## Workflow Transitions

For CMS-style workflow transitions, attach a workflow engine to the panel with
`WithWorkflow(...)` or configure the admin-level workflow defaults. Actions with
names matching available workflow events can be evaluated and executed through
the panel action route.

Typical content panels combine:

- explicit actions (`publish`, `unpublish`, `approve`, `reject`, etc.)
- `Action.Guard` for cheap status checks
- `WithActionStateResolver(...)` for cross-record or domain lookups
- command-backed actions for side effects and activity emission
- translation policy hooks when publish transitions require localized content

The examples in `examples/web/setup/panels.go`,
`examples/web/setup/content_action_state.go`, and
`examples/web/content_panels.go` are the current reference for pages/posts.

For workflow definitions, runtime bindings, dynamic content type resolution,
action execution, and persistence details, see `docs/GUIDE_WORKFLOW.md`.

## Validation Checklist

Before considering a CRUD resource done:

1. Panel is registered with repository, fields, filters, permissions, and route
   mode.
2. List API returns `records`, `total`, `schema`, and expected action contracts.
3. HTML list uses `datagrid_config` first.
4. Filterable and sortable columns match fields the repository actually handles.
5. Repository list logic applies search, filters, and sorting before pagination.
6. Search input has a `search` behavior when the template renders search UI.
7. Export UI is rendered only when `export_config` and a backend export
   definition are configured.
8. Preview and subresource links are rendered only when the panel/service can
   serve the corresponding route.
9. Row/detail/bulk actions use server-authored action state.
10. Action command names have matching commands and message factories.
11. Action payload requirements and command factories agree on ID and selection
    shape.
12. Runtime handlers enforce the same rules advertised in `_action_state`.
13. List tests verify total/page semantics, filtering, sorting, search, and no
   duplicate IDs across pages.
14. Form tests verify schema rendering, create/update parsing, validation
   failures, and browser form submissions.
15. Tabbed detail tests verify `?tab=details`, permission-filtered tabs, invalid
   tab fallback or denial, and HTML/JSON tab routes for hybrid/client modes.
16. Focused tests cover list, create/update/delete, action success, disabled
   state, and stale action failure.

Useful focused tests:

```bash
go test ./admin -run 'TestPanelRoutesCRUDAndActions|TestActionPhase8|TestPanelBuilderWithActionStateResolvers'
go test ./quickstart -run 'TestBuildPanelDataGridConfig|TestPanelListTemplatesUseDataGridConfigContract|TestCanonicalPanelRouteBindingsIncludesEntryModes'
go test ./examples/web -run 'TestActionPhase8|TestContentActionContractsPhase5|TestContentBulkActionsPhase7'
```
