package admin

import (
	"context"
	"strings"

	debugregistry "github.com/goliatone/go-admin/debug"
)

const (
	DebugPanelCommandRuns    = "command_runs"
	commandRunReadPermission = "admin.commands.read"
)

// CommandRunsSnapshot is the stable Command Runs panel snapshot payload.
// Every element is a complete row suitable for keyed replacement by run_id.
type CommandRunsSnapshot []CommandRunRecord

// CommandRunsDebugPanel exposes scoped command-run snapshots and lookup.
type CommandRunsDebugPanel struct {
	admin   *Admin
	runtime *CommandRunRuntime
}

func NewCommandRunsDebugPanel(adm *Admin) *CommandRunsDebugPanel {
	if adm == nil {
		return &CommandRunsDebugPanel{}
	}
	return &CommandRunsDebugPanel{admin: adm, runtime: adm.CommandRunRuntime()}
}

func (p *CommandRunsDebugPanel) available(ctx context.Context) bool {
	return p != nil && p.admin != nil && p.runtime != nil && p.runtime.Store() != nil &&
		p.runtime.config.Enabled && p.runtime.config.Role.Has(CommandRunRoleGateway) &&
		commandLauncherAllowed(ctx, p.admin, commandRunReadPermission)
}

func (p *CommandRunsDebugPanel) selector(ctx context.Context) (CommandRunSelector, error) {
	if p == nil || p.runtime == nil {
		return CommandRunSelector{}, ErrNotFound
	}
	if authorizer := p.runtime.config.ScopeAuthorizer; authorizer != nil {
		selector, err := authorizer.CommandRunSelector(ctx)
		if err != nil {
			return CommandRunSelector{}, err
		}
		selector = selector.Normalize()
		if err := selector.Validate(); err != nil {
			return CommandRunSelector{}, err
		}
		return selector, nil
	}
	selector := CommandRunSelector{Scope: CommandRunScope{
		ApplicationID:  p.runtime.config.ApplicationID,
		EnvironmentID:  p.runtime.config.EnvironmentID,
		TenantID:       tenantIDFromContext(ctx),
		OrganizationID: orgIDFromContext(ctx),
	}}
	return selector.Normalize(), selector.Validate()
}

// Snapshot returns only records visible to the authenticated request selector.
func (p *CommandRunsDebugPanel) Snapshot(ctx context.Context) CommandRunsSnapshot {
	if !p.available(ctx) {
		return CommandRunsSnapshot{}
	}
	selector, err := p.selector(ctx)
	if err != nil {
		p.runtime.reportError(err)
		return CommandRunsSnapshot{}
	}
	records, err := p.runtime.Store().List(ctx, selector)
	if err != nil {
		p.runtime.reportError(err)
		return CommandRunsSnapshot{}
	}
	out := make(CommandRunsSnapshot, 0, len(records))
	for index := range records {
		allowed, authorizeErr := p.authorize(ctx, selector, records[index].Scope)
		if authorizeErr != nil {
			p.runtime.reportError(authorizeErr)
			continue
		}
		if allowed {
			out = append(out, records[index].Clone())
		}
	}
	return out
}

// Clear removes only records visible to the authenticated request selector.
func (p *CommandRunsDebugPanel) Clear(ctx context.Context) error {
	if !p.available(ctx) {
		return ErrForbidden
	}
	selector, err := p.selector(ctx)
	if err != nil {
		return err
	}
	if p.runtime.config.ScopeAuthorizer != nil {
		records, listErr := p.runtime.Store().List(ctx, selector)
		if listErr != nil {
			return listErr
		}
		for _, record := range records {
			allowed, authorizeErr := p.authorize(ctx, selector, record.Scope)
			if authorizeErr != nil {
				return authorizeErr
			}
			if !allowed {
				return ErrForbidden
			}
		}
	}
	return p.runtime.Store().Clear(ctx, selector)
}

// Lookup resolves an authorized row by run ID, then correlation ID.
func (p *CommandRunsDebugPanel) Lookup(ctx context.Context, id string) (CommandRunRecord, bool, error) {
	id = strings.TrimSpace(id)
	if id == "" || !p.available(ctx) {
		return CommandRunRecord{}, false, nil
	}
	selector, err := p.selector(ctx)
	if err != nil {
		return CommandRunRecord{}, false, err
	}
	records, err := p.runtime.Store().List(ctx, selector)
	if err != nil {
		return CommandRunRecord{}, false, err
	}
	for _, record := range records {
		allowed, authorizeErr := p.authorize(ctx, selector, record.Scope)
		if authorizeErr != nil {
			return CommandRunRecord{}, false, authorizeErr
		}
		if allowed && record.RunID == id {
			return record.Clone(), true, nil
		}
	}
	for _, record := range records {
		allowed, authorizeErr := p.authorize(ctx, selector, record.Scope)
		if authorizeErr != nil {
			return CommandRunRecord{}, false, authorizeErr
		}
		if allowed && record.CorrelationID == id {
			return record.Clone(), true, nil
		}
	}
	return CommandRunRecord{}, false, nil
}

func (p *CommandRunsDebugPanel) authorize(ctx context.Context, selector CommandRunSelector, scope CommandRunScope) (bool, error) {
	if !selector.Matches(scope) {
		return false, nil
	}
	if p == nil || p.runtime == nil || p.runtime.config.ScopeAuthorizer == nil {
		return true, nil
	}
	return p.runtime.config.ScopeAuthorizer.AuthorizeCommandRun(ctx, scope)
}

// RegisterCommandRunsDebugPanel registers the stable panel only for a running
// gateway with snapshot storage. Publisher-only and disabled runtimes stay inert.
func RegisterCommandRunsDebugPanel(adm *Admin) {
	panel := NewCommandRunsDebugPanel(adm)
	if panel.admin == nil || panel.runtime == nil || panel.runtime.Store() == nil ||
		!panel.runtime.config.Enabled || !panel.runtime.config.Role.Has(CommandRunRoleGateway) {
		return
	}
	debugregistry.UnregisterPanel(DebugPanelCommandRuns)
	_ = debugregistry.RegisterPanel(DebugPanelCommandRuns, debugregistry.PanelConfig{
		Label:       "Command Runs",
		Icon:        "iconoir-play-list",
		Span:        2,
		SnapshotKey: DebugPanelCommandRuns,
		Category:    "operations",
		EventTypes:  []string{commandRunDebugEventType},
		Snapshot: func(ctx context.Context) any {
			return panel.Snapshot(ctx)
		},
		Clear: panel.Clear,
		Definition: func(ctx context.Context, definition debugregistry.PanelDefinition) debugregistry.PanelDefinition {
			definition.Metadata = cloneCommandRunPanelMetadata(definition.Metadata)
			definition.Metadata["available"] = panel.available(ctx)
			if !panel.available(ctx) {
				definition.Metadata["disabled_reason"] = "command run read permission unavailable"
				definition.EventTypes = nil
				definition.UI = nil
			}
			return definition
		},
		Metadata: map[string]any{
			"row_key":              "run_id",
			"deep_link_key":        "run_id",
			"deep_link_fallback":   "correlation_id",
			"snapshot_authorized":  true,
			"complete_upsert_rows": true,
		},
		UI: commandRunsPanelUI(panel.runtime.config.Retention),
	})
}

func commandRunsPanelUI(maxEntries int) *debugregistry.PanelUI {
	if maxEntries <= 0 {
		maxEntries = defaultCommandRunRetention
	}
	ui := debugregistry.NewPanelUI(&debugregistry.PanelUIView{
		Renderer: debugregistry.PanelRendererTable,
		Options: map[string]any{"key_bind": "run_id", "columns": []debugregistry.PanelUIColumn{
			{Label: "Command", Bind: "command_id"},
			{Label: "Status", Bind: "phase", Severity: "status"},
			{Label: "Current", Bind: "current", Format: "number"},
			{Label: "Total", Bind: "total", Format: "number"},
			{Label: "Mode", Bind: "mode"},
			{Label: "Attempt", Bind: "attempt", Format: "number"},
			{Label: "Updated", Bind: "updated_at", Format: "datetime"},
			{Label: "Duration", Bind: "duration_ms", Format: "duration_ms"},
		}},
	}, nil)
	ui.Count = &debugregistry.PanelUICount{Mode: debugregistry.PanelCountArrayLength, Label: "runs"}
	ui.Filters = []debugregistry.PanelUIFilter{
		{ID: "command_id", Label: "Command", Kind: debugregistry.PanelFilterSearch, Bind: "command_id"},
		{ID: "phase", Label: "Status", Kind: debugregistry.PanelFilterSelect, Bind: "phase", Options: []string{
			string(CommandRunPhaseSubmitted), string(CommandRunPhaseStarted), string(CommandRunPhaseCheckpoint),
			string(CommandRunPhaseProgress), string(CommandRunPhaseSucceeded), string(CommandRunPhaseFailed),
			string(CommandRunPhaseCanceled), string(CommandRunPhaseRejected),
		}},
		{ID: "mode", Label: "Mode", Kind: debugregistry.PanelFilterSelect, Bind: "mode", Options: []string{"inline", "queued"}},
		{ID: "run_id", Label: "Run ID", Kind: debugregistry.PanelFilterSearch, Bind: "run_id"},
		{ID: "correlation_id", Label: "Correlation ID", Kind: debugregistry.PanelFilterSearch, Bind: "correlation_id"},
	}
	ui.Events = &debugregistry.PanelUIEventPolicy{
		Mode: debugregistry.PanelEventUpsert, Key: "run_id", MaxEntries: maxEntries,
	}
	ui.Metadata = map[string]any{
		"deep_link_key":      "run_id",
		"deep_link_fallback": "correlation_id",
	}
	return ui
}

func cloneCommandRunPanelMetadata(metadata map[string]any) map[string]any {
	out := make(map[string]any, len(metadata)+2)
	for key, value := range metadata {
		out[key] = value
	}
	return out
}
