package admin

import (
	"context"
	"slices"
	"time"
)

// ActionDiagnosticsDebugPanel exposes recent action-state and action-failure
// diagnostics in the debug dashboard.
type ActionDiagnosticsDebugPanel struct {
	admin *Admin
}

func NewActionDiagnosticsDebugPanel(admin *Admin) *ActionDiagnosticsDebugPanel {
	return &ActionDiagnosticsDebugPanel{admin: admin}
}

func (p *ActionDiagnosticsDebugPanel) ID() string {
	return DebugPanelActions
}

func (p *ActionDiagnosticsDebugPanel) Label() string {
	return "Actions"
}

func (p *ActionDiagnosticsDebugPanel) Icon() string {
	return "iconoir-flash"
}

func (p *ActionDiagnosticsDebugPanel) Span() int {
	return 2
}

func (p *ActionDiagnosticsDebugPanel) Collect(context.Context) map[string]any {
	if p == nil || p.admin == nil || p.admin.actionDiagnostics == nil {
		return map[string]any{
			"generated_at": time.Now().UTC(),
			"summary": map[string]any{
				"total":               0,
				"disablements":        0,
				"availability_errors": 0,
				"execution_failures":  0,
			},
			"entries": []ActionDiagnosticEntry{},
		}
	}

	entries := p.admin.actionDiagnostics.Entries()
	recent := append([]ActionDiagnosticEntry{}, entries...)
	slices.Reverse(recent)

	summary := map[string]any{
		"total":               len(entries),
		"disablements":        0,
		"availability_errors": 0,
		"execution_failures":  0,
	}
	for _, entry := range entries {
		switch entry.Kind {
		case actionDiagnosticKindDisablement:
			summary["disablements"] = summary["disablements"].(int) + 1
		case actionDiagnosticKindAvailabilityErr:
			summary["availability_errors"] = summary["availability_errors"].(int) + 1
		case actionDiagnosticKindExecutionErr:
			summary["execution_failures"] = summary["execution_failures"].(int) + 1
		}
	}

	return map[string]any{
		"generated_at": time.Now().UTC(),
		"summary":      summary,
		"entries":      recent,
	}
}

func RegisterActionDiagnosticsDebugPanel(admin *Admin) {
	if admin == nil || admin.debugCollector == nil {
		return
	}
	registerDebugPanelFromInterface(NewActionDiagnosticsDebugPanel(admin))
}
