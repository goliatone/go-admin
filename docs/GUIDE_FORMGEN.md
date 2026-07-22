# Guide: Form Generation and Customization

This guide is the canonical reference for how go-admin turns panel and content schemas into renderable forms, how quickstart wires go-formgen, and where hosts customize fields, components, templates, and submitted payloads.

Use it when adding create/edit forms, dynamic CMS content forms, custom go-formgen components, media pickers, permission matrices, or schema-driven module forms.

## What It Provides

- Responsibility boundaries between `go-crud`, `go-admin`, and `go-formgen`.
- Panel form schema rules for `FormFields(...)` and `FormSchema(...)`.
- Quickstart renderer wiring and form HTML generation flow.
- UI schema overlay and custom component registration guidance.
- Template customization rules for resource forms and formgen components.
- Submission parsing, validation, and security expectations.
- Focused testing checklist.

## Table Of Contents

- [What It Provides](#what-it-provides)
- [Core Model](#core-model)
- [Panel Form Schema](#panel-form-schema)
- [go-formgen Rendering Pipeline](#go-formgen-rendering-pipeline)
- [UI Schema Overlays](#ui-schema-overlays)
- [Component Registration](#component-registration)
- [Template Customization](#template-customization)
- [Media Fields](#media-fields)
- [Special Components](#special-components)
- [Content Type Forms](#content-type-forms)
- [Roles And Preferences](#roles-and-preferences)
- [Submission And Parsing](#submission-and-parsing)
- [Security And Validation](#security-and-validation)
- [Testing Checklist](#testing-checklist)
- [See Also](#see-also)

## Core Model

The form stack has three separate responsibilities:

1.  `go-crud` owns CRUD service/query behavior and optional schema registry exports.
2.  `go-admin` owns panel contracts: `FormFields`, `FormSchema`, permissions, route ownership, media endpoint hints, and the JSON panel API shape.
3.  `go-formgen` owns schema normalization, UI schema overlays, component resolution, vanilla renderer templates, and generated HTML.

Do not treat `go-crud` model registration as panel form generation. A panel must still declare a renderable form contract through `FormFields(...)`, `FormSchema(...)`, or a custom UI route.

## Panel Form Schema

Panels supply form schema in two ways:

- `FormFields(...)`: concise go-admin field declarations.
- `FormSchema(...)`: explicit JSON Schema for richer forms.

`Panel.Schema()` always returns a `FormSchema`. If only `FormFields(...)` are provided, go-admin converts them into a JSON Schema object. If both are provided, go-admin starts from `FormSchema(...)` and fills missing field metadata from `FormFields(...)`.

Use `FormFields(...)` for flat CRUD forms:

``` go
builder.FormFields(
    admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
    admin.Field{Name: "status", Label: "Status", Type: "select", Required: true},
)
```

Use `FormSchema(...)` when the form needs nested objects, arrays, custom component configuration, relationship widgets, media value-mode control, or content-type authored schemas:

``` go
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
                "componentOptions": map[string]any{
                    "valueMode": "id",
                },
            },
        },
    },
})
```

The current `FormFields(...)` conversion maps:

- `Field.Required` -\> JSON Schema `required`.
- `Field.ReadOnly` -\> `readOnly` and `read_only`.
- `Field.Hidden` -\> `x-hidden`.
- `Field.Options` -\> `x-options`.
- `textarea` -\> `x-formgen:widget=textarea`.
- `media`, `media-picker`, `media-gallery` -\> `media-picker`.
- `block`, `blocks` -\> `block`.
- `block-library-picker`, `block-library` -\> `block-library-picker`.
- `jsonschema`, `json-schema`, `schema` -\> `schema-editor`.

If `Permissions.Create` is set and the panel uses canonical UI routes, the builder must have a renderable form schema. For custom-owned pages, set `WithUIRouteMode(admin.PanelUIRouteModeCustom)` and register the HTML routes yourself.

## go-formgen Rendering Pipeline

Quickstart content entry forms use `admin.FormgenSchemaValidator` by default:

1.  `quickstart.RegisterContentEntryUIRoutes(...)` creates a default renderer via `admin.NewFormgenSchemaValidatorWithAPIBase(...)` unless a host passes `quickstart.WithContentEntryFormRenderer(...)`.
2.  The route handler resolves the content type schema and UI schema.
3.  go-admin applies media schema hints when media is configured.
4.  `RenderForm(...)` wraps the JSON Schema into a go-formgen request.
5.  go-formgen normalizes the schema and renders HTML through the vanilla renderer.
6.  The generated HTML is injected into the resource form template as `form_html`.

For OpenAPI-backed forms, quickstart exposes:

``` go
formgen, err := quickstart.NewFormGenerator(
    openapiFS,
    templatesFS,
    quickstart.WithComponentRegistryMergeDefaults(registry),
)
```

`NewFormGenerator(...)` wires the go-formgen loader, parser, model builder, vanilla renderer, template fallback filesystem, and optional `uischema` subdirectory.

## UI Schema Overlays

Use UI schema overlays for layout and component overrides that should not live directly in the JSON Schema. go-admin passes content type UI schema to go-formgen as an `x-ui-overlay/v1` overlay.

Typical content type UI schema:

``` json
{
  "fields": {
    "permissions": {
      "component": "permission-matrix",
      "componentOptions": {
        "resources": ["content", "media"],
        "actions": ["view", "create", "edit", "delete"]
      }
    }
  }
}
```

For content list/detail rendering, `ui_schema.fields.<field>` also carries DataGrid renderer hints such as `renderer`, `renderer_options`, `display_key`, and `display_keys`. Those list/detail hints are consumed by go-admin templates and DataGrid code, while form component overlays are consumed by go-formgen.

## Component Registration

go-formgen resolves custom widgets through a vanilla component registry.

Use quickstart when building a host-owned form generator:

``` go
registry := components.New()
registry.MustRegister("permission-matrix", admin.PermissionMatrixDescriptor(cfg.BasePath))

formgen, err := quickstart.NewFormGenerator(
    openapiFS,
    templatesFS,
    quickstart.WithComponentRegistryMergeDefaults(registry),
)
```

Use `WithComponentRegistryMergeDefaults(...)` when you want custom components plus built-ins. Use `WithComponentRegistry(...)` only when replacing the default registry entirely.

Internal go-admin form generators also register components directly:

- `admin.NewRoleFormGenerator(...)` registers `permission-matrix`.
- `admin.NewFormgenSchemaValidatorWithAPIBase(...)` registers `schema-editor`, `block`, `block-library-picker`, and `permission-matrix`.

## Template Customization

There are two template layers:

- Admin/resource page templates, such as `resources/content/form.html`, wrap the generated form HTML and page chrome.
- go-formgen vanilla templates render individual fields and components.

Override resource page templates through the normal quickstart view filesystem stack. Preserve the embedded path, for example:

``` text
templates/resources/content/form.html
templates/resources/roles/form.html
templates/resources/preferences/form.html
```

Override formgen component templates by providing the expected partial key or a custom component descriptor. Component guides document their template keys, for example `forms.permission-matrix`.

## CMS Relationship Create/Edit Actions

Generic CMS content forms load `assets/dist/runtime/cms-relationship-actions.js`. Host apps should register delegated relationship handlers by action ID:

```js
window.GoAdminRelationshipActions.registerAction("archive_topic", {
  async onCreateAction(context, detail) {
    // Open a modal, route, or API-backed compact flow.
    // Return { value, label } to select the created option.
  },
  async onEditAction(context, detail) {
    // detail.selectedValue is the submitted relationship value.
    // Return { value, label } to refresh the selected option label.
  },
});
```

The CMS form passes passive wrappers to `window.FormgenRelationships.initRelationships(...)` when this helper is loaded. If no scoped or global handler matches an action, the wrapper re-emits go-formgen's default `formgen:relationship:create-action` or `formgen:relationship:edit-action` DOM event. Re-emitted event detail contains go-formgen's native fallback fields plus `detail.goAdmin` route context. This preserves fallback listeners and also lets hosts register handlers after field initialization, as long as registration happens before the editor clicks the action.

Use action-scoped registration for entity-specific flows. `register({ onCreateAction, onEditAction })` is still available for intentional catch-all handlers. A catch-all handler can return `window.GoAdminRelationshipActions.unhandled` to delegate that action back to the DOM fallback.

If a host needs to register before the helper asset loads, pre-seed the global:

```html
<script>
window.GoAdminRelationshipActions = {
  actions: {
    archive_topic: {
      async onCreateAction(context, detail) {},
      async onEditAction(context, detail) {}
    }
  }
};
</script>
```

Opt in per relationship field with go-formgen metadata:

```json
{
  "x-formgen": {
    "relationship.endpoint.createAction": "true",
    "relationship.endpoint.createActionId": "archive_topic",
    "relationship.endpoint.createActionLabel": "Create Topic",
    "relationship.endpoint.createActionSelect": "replace",
    "relationship.endpoint.editAction": "true",
    "relationship.endpoint.editActionId": "archive_topic",
    "relationship.endpoint.editActionLabel": "Edit Topic"
  }
}
```

UI schema overlays can use the same flat keys:

```json
{
  "fields": {
    "columns[].entries[].topic_id": {
      "metadata": {
        "relationship.endpoint.createAction": "true",
        "relationship.endpoint.createActionId": "archive_topic",
        "relationship.endpoint.createActionLabel": "Create Topic",
        "relationship.endpoint.createActionSelect": "replace",
        "relationship.endpoint.editAction": "true",
        "relationship.endpoint.editActionId": "archive_topic",
        "relationship.endpoint.editActionLabel": "Edit Topic"
      }
    }
  }
}
```

Handlers receive the original formgen context plus go-admin fields on both `context` and `context.goAdmin`: `actionId`, `fieldName`, `panel`, `contentType`, `recordId`, `locale`, `channel`, `basePath`, `endpointURL`, current URL fields, and `searchParams`. `detail` includes the formgen action payload: create actions include `query` and `selectBehavior`; edit actions include `selectedValue` and `selectedLabel`.

Returning `{ value, label }` lets go-formgen update the relationship selection. Returning `undefined` is valid for navigation-only flows where the host handles the result elsewhere.

For host apps such as Garchen Teaching Topics, the selected value may be an external taxonomy ID rather than a CMS content record ID. In that case, the `onEditAction` handler should resolve `detail.selectedValue` to the matching CMS Topic record before opening the edit UI.

## Media Fields

`go-admin` owns the media module and endpoint hints. `go-formgen` owns the field-level `media-picker` component.

For a simple panel field:

``` go
admin.Field{Name: "primary_media_id", Label: "Primary Media", Type: "media-picker"}
```

When media is enabled, go-admin enriches media fields with library, resolve, upload, presign, confirm, delivery, and capability endpoints. Prefer these generated hints over hardcoding paths in schema or templates.

For value-mode control, use JSON Schema metadata:

``` json
{
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
```

Use `valueMode: "id"` for authored content whenever possible. Use URL mode for legacy content or intentionally URL-backed fields.

## Special Components

Current admin-owned formgen components:

- `media-picker`: field-level media selection, owned by go-formgen with go-admin endpoint hints.
- `permission-matrix`: role/permission grid with additional permission chips.
- `schema-editor`: JSON schema editor for content type/schema authoring.
- `block`: block editor component.
- `block-library-picker`: block library selector/editor for content blocks.

Each component has a server descriptor that registers the renderer and required assets. If a component renders as a generic field, verify that the registry used by the active form generator includes the component name referenced in schema or UI schema.

## Content Type Forms

Dynamic CMS panels are built from content type records:

- `DynamicPanelFactory` converts the content type schema and UI schema into panel list/form/detail fields.
- The original content type JSON Schema is set as the panel `FormSchema`.
- Capabilities determine `UseBlocks`, `UseSEO`, and `TreeView`.
- Content entry UI routes render forms through `FormgenSchemaValidator`.

Schema validation and previews use the same formgen normalization path as runtime forms. Keep block and widget metadata in schema/UI schema rather than duplicating behavior in templates.

## Roles And Preferences

Roles use embedded OpenAPI and UI schema documents. `admin.NewRoleFormGenerator` loads those documents and registers the `permission-matrix` component.

Preferences use a JSON Schema document for the HTML form. Hosts can copy the embedded schema, add project-specific fields under `properties`, and point the Preferences module at the override path. New project-specific fields still need explicit read/save mapping in host code.

## Submission And Parsing

Canonical content entry new/edit pages submit against the same JSON Schema used to render the form.

Request handling:

- JSON requests are decoded directly into a map.
- Browser form posts support `application/x-www-form-urlencoded`.
- Browser form posts support `multipart/form-data`.
- Repeated form keys become arrays.
- A submitted `name[]` key maps to `name` only when the schema says the field is an array.
- Single submitted values for array fields are parsed as arrays.
- Missing boolean fields are set to `false`.
- Nested field paths are written into nested maps.
- Invalid browser form payloads return an `INVALID_FORM` validation error.

Custom widgets must submit values compatible with the schema type. If a widget posts serialized JSON for arrays or objects, normalize it before persistence or inside the repository/service layer.

### Nested Array Update Intent

Browser form parsing is value-oriented. For CMS content-entry forms, submitted
array/object values still represent replacement values unless the content type
opts into the nested-array update-intent contract.

Opt in per content type and array path through `x-go-admin.updateIntent` schema
metadata, equivalent UI schema/capability metadata, or
`quickstart.WithContentEntryUpdateIntentPolicy(...)`:

```json
{
  "x-go-admin": {
    "updateIntent": {
      "arrays": {
        "columns": {
          "mode": "patch",
          "ambiguous": "preserve",
          "allowIndexFallback": true
        },
        "columns[].entries": {
          "mode": "patch",
          "identity": ["topic_id"],
          "referenceFields": ["topic_slug"],
          "ambiguous": "preserve",
          "allowIndexFallback": true
        }
      }
    }
  }
}
```

For generated go-formgen repeatable arrays, set `updateIntent: "patch"` on the
array field metadata/UI hints so the renderer emits:

- array markers: `<path>__present`, `<path>__complete`, `<path>__clear`
- row markers: `_present`, `_row_state`, `_row_key`, and `_delete`

Custom renderers must submit equivalent markers for enabled paths. `_delete=true`
is explicit delete intent and remains active even when sibling row controls are
disabled by the client runtime. Internal markers are stripped before CMS
persistence. JSON requests keep normal behavior unless update intent is enabled
for the content type, in which case browser-form markers are required.

## Embedded Fields-Only Forms

The Debug Console command launcher is the reference host-owned-shell pattern.
The server adapts an authorized command descriptor to JSON Schema and renders it
through a shared go-formgen orchestrator with `render.RenderModeFields`. The
result is trusted server-generated field HTML; the launcher supplies the outer
form, confirmation, action bar, persistence controls, and result view.

The browser initializes each selected root with
`FormgenRelationships.initFormgenRoot`, then attaches a registry-aware
`Formgen` controller. Use controller methods for values, hydration, reset,
errors, focus, change subscription, and teardown. Protected generic option
requests should be rewritten or signed in the root's `beforeFetch` hook; keep
debounce, cancellation, stale-response rejection, cache, widget state, and DOM
updates inside formgen. Absolute synthetic endpoint schemes are preserved until
`beforeFetch`; a host that emits one must rewrite it to a real protected URL
before the request reaches `fetch`.

Do not emit both generated HTML and a host-specific field projection as a
fallback. If generation fails, keep the surrounding resource visible, disable
the action, and surface a diagnostic.

## Security And Validation

Form metadata is not a security boundary.

- `readOnly`, `read_only`, and `x-hidden` are UI hints.
- The repository, service, hooks, and command handlers remain responsible for required domain fields, ownership, workflow state, uniqueness, and server-managed values.
- Do not trust a browser to omit hidden or read-only fields.
- Validate schema changes before activating dynamic content types.
- Keep action and workflow authorization server-side even when forms hide fields or buttons.

## Testing Checklist

Before considering a form integration done:

1.  Panel registration succeeds with `FormFields(...)` or `FormSchema(...)` when create UI is canonical.
2.  `Panel.Schema().FormSchema` contains expected properties, required fields, widgets, and metadata.
3.  The active form generator registry includes every custom component referenced by schema or UI schema.
4.  UI schema overlays apply to the intended operation/form.
5.  Generated form HTML includes expected components and asset scripts.
6.  Browser form submissions parse arrays, booleans, nested paths, and multipart payloads correctly.
7.  Repository/service validation rejects invalid, forbidden, or server-managed values even if submitted manually.
8.  Media fields receive endpoint hints when media is enabled.
9.  Template overrides preserve `form_html`, CSRF fields, and expected route context.
10. Nested-array preservation is either content-type-specific or covered by an explicit opt-in update-intent contract.

Useful focused tests:

``` bash
go test ./admin -run 'TestPanelSchemaIncludesFormSchema|TestFormgenSchemaValidator|TestRolesPanelFormSchemaUsesPermissionMatrix'
go test ./quickstart -run 'TestRenderForm|TestContentTypeSchema|TestParseForm'
go test ./examples/web -run 'Test.*Form|Test.*Content.*Panel'
```

## See Also

- `docs/GUIDE_CRUD.md`: panel CRUD, DataGrid, and action contracts.
- `docs/GUIDE_VIEW_CUSTOMIZATION.md`: template layering and page-level view customization.
- `docs/GUIDE_CMS.md`: dynamic content types, content entry UI routes, and list/detail rendering.
- `docs/GUIDE_MODULE_MEDIA.md`: media module and media field integration.
- `docs/GUIDES_PERMISSION_MATRIX.md`: permission matrix component details.
- `docs/GUIDE_AUTH_PERMISSIONS.md`: auth, permission, scope, and debug workflow.
- `docs/GUIDE_MOD_PREFERENCES.md`: preferences schema override pattern.
- `quickstart/README.md`: quickstart helpers and bootstrap options.
