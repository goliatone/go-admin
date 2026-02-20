# Tab Widget Guide

This guide documents how to add a new widget-backed tab in a panel detail view, using the Users detail view (`/admin/users/:id`) and its `Profile` and `Activity` tabs as the reference implementation.

## Terms used in this guide

- `Panel`: a CRUD resource registered in go-admin (for example, `users`, `user-profiles`).
- `PanelTab`: tab metadata attached to a panel (`admin.PanelTab`).
- `Detail view`: the panel record page (`/admin/users/:id`).
- `Tab content`: the resolved content kind for a tab (`details`, `dashboard_area`, `cms_area`, `panel`, `template`).
- `Widget area`: named placement bucket for widgets (`admin.WidgetAreaDefinition`), e.g. `admin.users.detail.profile`.
- `Widget provider`: widget definition + handler (`admin.DashboardProviderSpec`).
- `Widget instance`: placed widget (usually created automatically when `DefaultArea` is set).

## End-to-end flow

1. Register a `PanelTab` on the panel (Users).
2. Resolve that tab to a `TabContentSpec` (`dashboard_area`/`cms_area`) with an area code.
3. Register the area and provider on the dashboard.
4. Render the tab panel (SSR/hybrid/client) in the users detail template.
5. (Optional) apply record-specific widget data overrides per user.

The existing `Profile` and `Activity` tabs follow this exact flow.

## Existing Users example (Profile + Activity)

### 1) Register tabs on the Users panel

In the users module wiring, tabs are attached with `WithUserPanelTabs(...)`:

- `ID`: `profile`, `activity`
- `Scope`: `admin.PanelTabScopeDetail`
- `Target`: logical destination (`panel` or `path`)
- `Filters` / `Query`: tokenized with `{{record.id}}`

See `examples/web/main.go`.

### 2) Resolve each tab to an inline tab content spec

In `NewUserHandlers`, tab IDs are mapped to content kinds:

- `profile` -> `TabContentCMS` + area `admin.users.detail.profile`
- `activity` -> `TabContentDashboard` + area `admin.users.detail.activity`

See `examples/web/handlers/users.go` and constants in `examples/web/helpers/tab_rendering.go`.

### 3) Choose per-tab render mode

Render mode decides how tab content loads:

- `ssr`: full page navigation
- `hybrid`: fetch server-rendered HTML (`GET /admin/users/:id/tabs/:tab`)
- `client`: fetch JSON and render in browser (`GET /admin/api/users/:id/tabs/:tab`)

Current example:

- `profile` uses `client`
- `activity` uses `hybrid`

See `examples/web/handlers/users.go` and `pkg/client/templates/resources/users/detail.html`.

### 4) Register widget areas and providers

In dashboard setup:

- Register areas:
  - `admin.users.detail.profile` (scope `users.detail`)
  - `admin.users.detail.activity` (scope `users.detail`)
- Register providers:
  - `admin.widget.user_profile_overview` in profile area
  - `admin.widget.user_activity_feed` in activity area

Because `DefaultArea` is set, a default widget instance is created.

See `examples/web/setup/dashboard.go`.

### 5) Build tab panel payload

`buildTabPanel(...)` resolves widgets for `dashboard_area` / `cms_area` and sends:

- `kind`
- `area_code`
- `widgets`
- fallback `empty_message`

See `examples/web/handlers/users.go`.

### 6) Render in template

- Server partial: `pkg/client/templates/partials/tab-panel.html`
- Client/hybrid controller: `pkg/client/templates/resources/users/detail.html`

Widget cards are rendered through `dashboard_widget.html` and `dashboard_widget_content.html`, with fallback JSON for unknown widget definitions.

## How to add your own widget-backed tab

Use this checklist to add, for example, a `Security` tab.

### 1) Add a new panel tab registration

In your module registration (or via `adm.RegisterPanelTab("users", ...)`), add:

- `ID`: `security`
- `Label`: `Security`
- `Scope`: `admin.PanelTabScopeDetail`
- `Position`: after existing tabs
- `Permission`: appropriate users permission
- `Target`: either related panel/path (still useful as canonical destination)

### 2) Add a tab content mapping

In the users tab resolver (`TabContentRegistry`), map:

- key: `users:security`
- kind: `TabContentDashboard` (or `TabContentCMS`)
- area: `admin.users.detail.security`

### 3) Set render mode for the new tab

In `TabRenderModeSelector.Overrides`, set:

- `client` if you want JS-only rendering
- `hybrid` if you want server partial rendering over AJAX
- `ssr` if full navigation is enough

### 4) Register widget area

During dashboard setup, register:

- `Code`: `admin.users.detail.security`
- `Name`: `User Security`
- `Scope`: `users.detail`

### 5) Register widget provider

Add `DashboardProviderSpec`:

- `Code`: e.g. `admin.widget.user_security_summary`
- `Name`: display name
- `DefaultArea`: `admin.users.detail.security`
- `DefaultConfig`: widget settings
- `Handler`: returns widget data map
- `Permission` (optional): gate this widget independently

Important:

- Keep widget codes stable once persisted.
- If overriding an existing provider and you do not want a default instance auto-created, omit `DefaultArea`.

### 6) Add presentation for the new widget type

If the current JSON fallback is enough, no template change is required.

If you want custom UI:

- Add a new branch in `dashboard_widget_content.html` for your definition code.
- If using client mode rendering in `users/detail.html`, mirror the same definition branch in `renderWidgetContent(...)`.

### 7) Optional: inject per-user data before render

If widget config is generic but content must be user-specific, follow the `ApplyUserProfileWidgetOverrides(...)` pattern:

- read the resolved widgets for the area
- locate your widget by `definition`
- inject user-derived values into `widget.data`

See `examples/web/helpers/tab_rendering.go`.

### 8) Ensure routes exist for selected render mode

For `hybrid` and `client`, users tab endpoints must be registered:

- `GET /admin/users/:id/tabs/:tab` (HTML)
- `GET /admin/api/users/:id/tabs/:tab` (JSON)

See route registration in `examples/web/main.go`.

### 9) Validate behavior

Minimum checks:

- Tab appears in `/admin/users/:id`.
- Clicking tab loads correct panel mode (SSR/hybrid/client).
- Correct widget(s) resolve in the intended area.
- Empty state shows when no widgets are available.
- Permission-gated tabs/widgets are hidden for unauthorized users.
- Existing tabs (`details`, `profile`, `activity`) remain unaffected.

## Concrete implementation skeleton (Security tab)

### A) Register the new Users detail tab

In `examples/web/main.go` (inside `admin.WithUserPanelTabs(...)`):

```go
admin.PanelTab{
	ID:         "security",
	Label:      "Security",
	Icon:       "shield-check",
	Position:   30,
	Scope:      admin.PanelTabScopeDetail,
	Permission: cfg.UsersPermission,
	Target:     admin.PanelTabTarget{Type: "path", Path: path.Join(cfg.BasePath, "users")},
	Query:      map[string]string{"tab": "security"},
},
```

### B) Add area/widget constants

In `examples/web/helpers/tab_rendering.go`:

```go
const (
	UserSecurityAreaCode    = "admin.users.detail.security"
	UserSecurityWidgetCode  = "admin.widget.user_security_summary"
	UserSecurityWidgetLabel = "Security Summary"
)
```

### C) Map tab ID to inline content + render mode

In `examples/web/handlers/users.go` (`NewUserHandlers`):

```go
tabResolver.Register("users", "security", helpers.TabContentSpec{
	Kind:     helpers.TabContentDashboard,
	AreaCode: helpers.UserSecurityAreaCode,
})

tabMode := helpers.TabRenderModeSelector{
	Default: helpers.TabRenderModeSSR,
	Overrides: map[string]helpers.TabRenderMode{
		helpers.TabKey("users", "security"): helpers.TabRenderModeClient,
	},
}
```

### D) Register widget area + provider

In `examples/web/setup/dashboard.go`:

```go
dash.RegisterArea(admin.WidgetAreaDefinition{
	Code:  helpers.UserSecurityAreaCode,
	Name:  "User Security",
	Scope: helpers.UserDetailAreaScope,
})

dash.RegisterProvider(admin.DashboardProviderSpec{
	Code:        helpers.UserSecurityWidgetCode,
	Name:        helpers.UserSecurityWidgetLabel,
	DefaultArea: helpers.UserSecurityAreaCode,
	DefaultConfig: map[string]any{
		"show_mfa": true,
	},
	Permission: "admin.users.view",
	Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
		type securityPayload struct {
			MFAEnabled     bool   `json:"mfa_enabled"`
			ActiveSessions int    `json:"active_sessions"`
			LastPasswordAt string `json:"last_password_at"`
		}
		return admin.WidgetPayloadOf(securityPayload{
			MFAEnabled:     false,
			ActiveSessions: 2,
			LastPasswordAt: "2026-01-12T09:30:00Z",
		}), nil
	},
})
```

### E) Add widget-specific rendering (optional)

In `pkg/client/templates/dashboard_widget_content.html`:

```django
{% elif widget.definition == "admin.widget.user_security_summary" %}
  <dl class="space-y-2">
    <div class="flex justify-between"><dt>MFA</dt><dd>{{ widget.data.mfa_enabled }}</dd></div>
    <div class="flex justify-between"><dt>Active Sessions</dt><dd>{{ widget.data.active_sessions }}</dd></div>
    <div class="flex justify-between"><dt>Password Updated</dt><dd>{{ widget.data.last_password_at }}</dd></div>
  </dl>
```

If your tab uses `client` mode, add the same branch in `renderWidgetContent(...)` inside `pkg/client/templates/resources/users/detail.html` so browser-side rendering matches SSR output.

## File map (where to change what)

- Tab registration: `examples/web/main.go`
- Tab content + area constants: `examples/web/helpers/tab_rendering.go`
- Tab resolver/render mode/panel payload: `examples/web/handlers/users.go`
- Widget area/provider registration: `examples/web/setup/dashboard.go`
- Tab panel server partial: `pkg/client/templates/partials/tab-panel.html`
- Users detail tab loader (hybrid/client): `pkg/client/templates/resources/users/detail.html`
- Widget template rendering: `pkg/client/templates/dashboard_widget.html`
- Widget content branches: `pkg/client/templates/dashboard_widget_content.html`
