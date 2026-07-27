package admin

import (
	"context"
	"errors"
	"maps"
	"strings"

	debugregistry "github.com/goliatone/go-admin/debug"
)

const (
	DebugPanelCommandRuns    = "command_runs"
	commandRunReadPermission = "admin.commands.read"
	commandRunClearAttempts  = 3
)

var (
	errCommandRunAtomicClearUnsupported = errors.New("command-run store does not support atomic authorized clear")
	errCommandRunAtomicClearConflict    = errors.New("command-run atomic clear could not obtain a stable snapshot")
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
	descriptorAccess := buildCommandLauncherDescriptorAccessIndex(ctx, p.admin)
	out := make(CommandRunsSnapshot, 0, len(records))
	for index := range records {
		allowed, authorizeErr := p.authorizeRecord(ctx, selector, descriptorAccess, records[index])
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

// ClearCheck rejects scope-wide clear when any selected record is hidden.
func (p *CommandRunsDebugPanel) ClearCheck(ctx context.Context) error {
	if !p.available(ctx) {
		return ErrForbidden
	}
	selector, err := p.selector(ctx)
	if err != nil {
		return ErrForbidden
	}
	records, listErr := p.runtime.Store().List(ctx, selector)
	if listErr != nil {
		p.runtime.reportError(listErr)
		return ErrForbidden
	}
	descriptorAccess := buildCommandLauncherDescriptorAccessIndex(ctx, p.admin)
	for _, record := range records {
		allowed, authorizeErr := p.authorizeRecord(ctx, selector, descriptorAccess, record)
		if authorizeErr != nil {
			p.runtime.reportError(authorizeErr)
			return ErrForbidden
		}
		if !allowed {
			return ErrForbidden
		}
	}
	return nil
}

// Clear removes records only after repeating the complete authorization
// preflight immediately before the scope-wide store mutation.
func (p *CommandRunsDebugPanel) Clear(ctx context.Context) error {
	if !p.available(ctx) {
		return ErrForbidden
	}
	selector, err := p.selector(ctx)
	if err != nil {
		return ErrForbidden
	}
	store, ok := p.runtime.Store().(CommandRunAtomicClearStore)
	if !ok {
		p.runtime.reportError(errCommandRunAtomicClearUnsupported)
		return ErrForbidden
	}
	for attempt := 0; attempt < commandRunClearAttempts; attempt++ {
		snapshot, snapshotErr := store.SnapshotForCommandRunClear(ctx, selector)
		if snapshotErr != nil {
			p.runtime.reportError(snapshotErr)
			return ErrForbidden
		}
		descriptorAccess := buildCommandLauncherDescriptorAccessIndex(ctx, p.admin)
		for _, record := range snapshot.Records {
			allowed, authorizeErr := p.authorizeRecord(ctx, selector, descriptorAccess, record)
			if authorizeErr != nil {
				p.runtime.reportError(authorizeErr)
				return ErrForbidden
			}
			if !allowed {
				return ErrForbidden
			}
		}
		cleared, clearErr := store.ClearCommandRunsIfUnchanged(ctx, selector, snapshot.Version)
		if clearErr != nil {
			p.runtime.reportError(clearErr)
			return ErrForbidden
		}
		if cleared {
			return nil
		}
	}
	p.runtime.reportError(errCommandRunAtomicClearConflict)
	return ErrForbidden
}

// Lookup resolves an authorized row by run ID, dispatch ID, then correlation ID.
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
	descriptorAccess := buildCommandLauncherDescriptorAccessIndex(ctx, p.admin)
	authorized := make([]CommandRunRecord, 0, len(records))
	for _, record := range records {
		allowed, authorizeErr := p.authorizeRecord(ctx, selector, descriptorAccess, record)
		if authorizeErr != nil {
			p.runtime.reportError(authorizeErr)
			continue
		}
		if allowed {
			authorized = append(authorized, record)
		}
	}
	for _, record := range authorized {
		if record.RunID == id {
			return record.Clone(), true, nil
		}
	}
	for _, record := range authorized {
		if record.DispatchID == id {
			return record.Clone(), true, nil
		}
	}
	for _, record := range authorized {
		if record.CorrelationID == id {
			return record.Clone(), true, nil
		}
	}
	return CommandRunRecord{}, false, nil
}

func (p *CommandRunsDebugPanel) authorizeRecord(
	ctx context.Context,
	selector CommandRunSelector,
	descriptorAccess commandLauncherDescriptorAccessIndex,
	record CommandRunRecord,
) (bool, error) {
	if !selector.Matches(record.Scope) {
		return false, nil
	}
	if p == nil || p.runtime == nil {
		return false, nil
	}
	if authorizer := p.runtime.config.ScopeAuthorizer; authorizer != nil {
		allowed, err := authorizer.AuthorizeCommandRun(ctx, record.Scope)
		if err != nil || !allowed {
			return false, err
		}
	}
	record.RunID = strings.TrimSpace(record.RunID)
	record.CommandID = strings.TrimSpace(record.CommandID)
	if record.RunID == "" || record.CommandID == "" {
		return false, nil
	}

	known, eligible := descriptorAccess.classify(record.CommandID)
	if known && !eligible {
		return false, nil
	}
	hostPolicy := p.runtime.config.RecordAuthorizer
	if eligible {
		if hostPolicy == nil {
			return true, nil
		}
		return hostPolicy.AuthorizeCommandRunRecord(ctx, record.Clone())
	}
	if hostPolicy == nil {
		return false, nil
	}
	return hostPolicy.AuthorizeCommandRunRecord(ctx, record.Clone())
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
		Icon:        "iconoir-list",
		Span:        2,
		SnapshotKey: DebugPanelCommandRuns,
		Category:    "operations",
		EventTypes:  []string{commandRunDebugEventType},
		Snapshot: func(ctx context.Context) any {
			return panel.Snapshot(ctx)
		},
		ClearCheck: panel.ClearCheck,
		Clear:      panel.Clear,
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
			"deep_link_fallback":   "dispatch_id",
			"deep_link_keys":       []string{"run_id", "dispatch_id", "correlation_id"},
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
		{ID: "dispatch_id", Label: "Dispatch ID", Kind: debugregistry.PanelFilterSearch, Bind: "dispatch_id"},
		{ID: "correlation_id", Label: "Correlation ID", Kind: debugregistry.PanelFilterSearch, Bind: "correlation_id"},
	}
	ui.Events = &debugregistry.PanelUIEventPolicy{
		Mode: debugregistry.PanelEventUpsert, Key: "run_id", MaxEntries: maxEntries,
	}
	ui.Metadata = map[string]any{
		"deep_link_key":      "run_id",
		"deep_link_fallback": "dispatch_id",
		"deep_link_keys":     []string{"run_id", "dispatch_id", "correlation_id"},
	}
	return ui
}

func cloneCommandRunPanelMetadata(metadata map[string]any) map[string]any {
	out := make(map[string]any, len(metadata)+2)
	maps.Copy(out, metadata)
	return out
}
