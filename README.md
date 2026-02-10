# Go Admin

The core `github.com/goliatone/go-admin` module stays dependency-light and focused on the admin orchestrator. The optional quickstart submodule (`github.com/goliatone/go-admin/quickstart`) bundles heavier integrations (Fiber, go-dashboard, go-formgen, go-theme) and turnkey bootstrap helpers. Import core packages for minimal deps; import quickstart when you want the defaults and adapters.

- Quickstart docs: `quickstart/README.md`
- Translation operations guide: `docs/GUIDE_CMS.md#17-translation-workflow-operations`
- Design notes: `QUICKBOOT_TDD.md`
- Task plan: `QUICKBOOT_TSK.md`
- Export refactor design: `EXPORT_REF_TDD.md`
- Export refactor plan: `EXPORT_REF_TSK.md`

## URL Configuration

`Config.URLs` is the canonical URL surface. It exposes separate namespaces for
admin and public URLs, each with its own base path, API prefix, and version.
Defaults preserve `/admin` for the admin UI and `/api/v1` for the public API.
If you need full control, set `Config.URLs.URLKit` to a custom URLKit config.

Example:

```go
cfg := admin.Config{
	BasePath: "/admin", // legacy fallback + theme tokens
	URLs: admin.URLConfig{
		Admin: admin.URLNamespaceConfig{
			BasePath:   "/admin",
			APIPrefix:  "api",
			APIVersion: "",
		},
		Public: admin.URLNamespaceConfig{
			BasePath:   "",
			APIPrefix:  "api",
			APIVersion: "v1",
		},
	},
}
```

## CMS CRUD Alignment (Read/Write Split)

Admin page CRUD now uses an explicit admin read model (`AdminPageRecord`) plus split read/write services. List and detail reads go through `AdminPageReadService`, while writes (create/update/delete/publish) use `AdminPageWriteService` via `PageApplicationService` so HTML and JSON paths stay aligned.

See `docs/GUIDE_CMS.md` for include flags, locale resolution, blocks payload rules, and view-backed fallback guidance. Migration notes live in `CHANGELOG.md`.

## Commands (go-command)

Commands are message-driven: define a message type with a stable `Type()` string, implement a `command.Commander[Msg]`, and register a message factory for name-based dispatch from HTTP/panels.

```go
type PublishPageMsg struct {
	IDs []string
}

func (PublishPageMsg) Type() string { return "pages.publish" }

type PublishPageCommand struct {
	store *Store
}

func (c *PublishPageCommand) Execute(ctx context.Context, msg PublishPageMsg) error {
	return c.store.Publish(ctx, msg.IDs)
}

adm.Commands().Register(&PublishPageCommand{store: store})
admin.RegisterMessageFactory(adm.Commands(), "pages.publish", func(payload map[string]any, ids []string) (PublishPageMsg, error) {
	return PublishPageMsg{IDs: ids}, nil
})
```

CLI/cron metadata is optional via `command.CLICommand` (`CLIOptions`) and `command.CronCommand` (`CronOptions`).
