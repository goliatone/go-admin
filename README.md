# Go Admin

The core `github.com/goliatone/go-admin` module stays dependency-light and focused on the admin orchestrator. The optional quickstart submodule (`github.com/goliatone/go-admin/quickstart`) bundles heavier integrations (Fiber, go-dashboard, go-formgen, go-theme) and turnkey bootstrap helpers. Import core packages for minimal deps; import quickstart when you want the defaults and adapters.

- Quickstart docs: `quickstart/README.md`
- Design notes: `QUICKBOOT_TDD.md`
- Task plan: `QUICKBOOT_TSK.md`
- Export refactor design: `EXPORT_REF_TDD.md`
- Export refactor plan: `EXPORT_REF_TSK.md`

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
