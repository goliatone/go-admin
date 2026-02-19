package admin

import "context"

// DoctorDebugPanel implements the DebugPanel interface for setup diagnostics.
type DoctorDebugPanel struct {
	admin *Admin
}

// NewDoctorDebugPanel creates a new doctor debug panel.
func NewDoctorDebugPanel(admin *Admin) *DoctorDebugPanel {
	return &DoctorDebugPanel{admin: admin}
}

// ID returns the panel identifier.
func (p *DoctorDebugPanel) ID() string {
	return DebugPanelDoctor
}

// Label returns the panel display label.
func (p *DoctorDebugPanel) Label() string {
	return "Doctor"
}

// Icon returns the panel icon class.
func (p *DoctorDebugPanel) Icon() string {
	return "iconoir-heartbeat"
}

// Span returns the panel grid span.
func (p *DoctorDebugPanel) Span() int {
	return 2
}

// Collect gathers doctor diagnostics for the current request context.
func (p *DoctorDebugPanel) Collect(ctx context.Context) map[string]any {
	if p == nil || p.admin == nil {
		return map[string]any{
			"verdict": "error",
			"summary": map[string]any{
				"checks": 0,
				"ok":     0,
				"info":   0,
				"warn":   0,
				"error":  1,
			},
			"checks": []any{},
			"findings": []map[string]any{
				{
					"severity": "error",
					"message":  "admin instance unavailable",
					"hint":     "ensure debug module registers after admin initialization",
				},
			},
			"next_actions": []string{"Initialize admin before collecting doctor diagnostics"},
		}
	}

	report := p.admin.RunDoctor(ctx)
	return map[string]any{
		"generated_at": report.GeneratedAt,
		"verdict":      report.Verdict,
		"summary":      report.Summary,
		"checks":       report.Checks,
		"findings":     report.Findings,
		"next_actions": report.NextActions,
	}
}

// RegisterDoctorDebugPanel registers the doctor panel with the debug collector.
func RegisterDoctorDebugPanel(admin *Admin) {
	if admin == nil || admin.debugCollector == nil {
		return
	}
	panel := NewDoctorDebugPanel(admin)
	registerDebugPanelFromInterface(panel)
}
