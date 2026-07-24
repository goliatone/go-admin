package admin

import (
	"context"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
)

// DeploymentDebugPanel exposes the allowlisted identity for one Admin instance.
type DeploymentDebugPanel struct {
	admin *Admin
	now   func() time.Time
}

func NewDeploymentDebugPanel(adm *Admin) *DeploymentDebugPanel {
	return &DeploymentDebugPanel{admin: adm, now: time.Now}
}

func (p *DeploymentDebugPanel) ID() string    { return DebugPanelDeployment }
func (p *DeploymentDebugPanel) Label() string { return "Deployment" }
func (p *DeploymentDebugPanel) Icon() string  { return "iconoir-server" }
func (p *DeploymentDebugPanel) Span() int     { return debugPanelDefaultSpan }

func (p *DeploymentDebugPanel) Collect(context.Context) map[string]any {
	if p == nil || p.admin == nil {
		return map[string]any{}
	}
	now := time.Now()
	if p.now != nil {
		now = p.now()
	}
	identity := p.admin.DeploymentIdentity()
	snapshot := identity.Snapshot(now)
	payload := map[string]any{
		"application": map[string]any{
			"id":      identity.AppID,
			"name":    identity.AppName,
			"version": identity.AppVersion,
		},
		"environment": map[string]any{
			"name":  identity.Environment,
			"color": identity.EnvironmentColor,
		},
		"build": map[string]any{
			"commit_sha":   identity.CommitSHA,
			"commit_short": identity.CommitShort,
			"git_ref":      identity.GitRef,
			"build_time":   identity.BuildTime,
			"modified":     identity.BuildModified,
			"source":       identity.BuildSource,
			"go_version":   identity.GoVersion,
		},
		"runtime": map[string]any{
			"instance_name":   identity.InstanceName,
			"instance_id":     identity.InstanceID,
			"instance_source": identity.InstanceSource,
			"hostname":        identity.Hostname,
			"started_at":      identity.StartedAt,
			"uptime":          snapshot.Uptime,
		},
	}
	if identity.Persona != nil {
		payload["persona"] = identity.Persona.Clone()
	}
	return payload
}

func (p *DeploymentDebugPanel) UI() *debugregistry.PanelUI {
	field := func(label, bind string, format ...string) map[string]any {
		out := map[string]any{"label": label, "bind": bind, "empty": "Unavailable"}
		if len(format) > 0 {
			out["format"] = format[0]
		}
		return out
	}
	section := func(title, bind string, fields ...map[string]any) debugregistry.PanelUIView {
		return debugregistry.PanelUIView{
			Renderer: debugregistry.PanelRendererKeyValue,
			Title:    title,
			Bind:     bind,
			Options:  map[string]any{"fields": fields},
		}
	}
	// Primary identity: what environment this is and which process answered.
	// Everything else is secondary detail behind it.
	identity := debugregistry.IdentityView("")
	identity.Title = "Deployment persona"
	identity.Options = map[string]any{
		"color_bind":           "environment.color",
		"eyebrow_bind":         "environment.name",
		"title_bind":           "persona.name",
		"title_fallback_bind":  "runtime.instance_name",
		"title_format":         "copy",
		"title_label":          "deployment persona",
		"title_fallback_label": "instance name",
		"subtitle_bind":        "application.name",
		"avatar_bind":          "persona.visual",
		"avatar_name_bind":     "persona.name",
		"empty":                "Unnamed deployment",
		"chips": []map[string]any{
			field("Algorithm", "persona.algorithm"),
			field("Persona version", "persona.version"),
			field("Version", "application.version"),
			field("Commit", "build.commit_short", "mono"),
			field("Uptime", "runtime.uptime"),
			field("Host", "runtime.hostname"),
		},
	}
	console := debugregistry.StackView(
		*identity,
		*debugregistry.GridStackView(
			section("Application", "application",
				field("Application ID", "id"), field("Application name", "name"), field("Version", "version")),
			section("Environment", "environment",
				field("Environment", "name", "badge"), field("Color", "color", "color")),
			section("Build", "build",
				field("Commit", "commit_sha", "copy"), field("Short commit", "commit_short", "mono"), field("Source ref", "git_ref"),
				field("Build time", "build_time", "datetime"), field("Dirty build", "modified", "boolean"), field("Metadata source", "source"),
				field("Go version", "go_version")),
			section("Runtime", "runtime",
				field("Instance name", "instance_name", "copy"), field("Instance ID", "instance_id", "copy"),
				field("Identity source", "instance_source"), field("Hostname", "hostname"),
				field("Started", "started_at", "datetime"), field("Uptime", "uptime")),
		),
	)
	// The expanded toolbar shows the same identity with a narrower detail set so
	// it stays readable inside the short toolbar viewport.
	toolbar := debugregistry.StackView(
		*identity,
		*debugregistry.GridStackView(
			section("Application", "application",
				field("Application name", "name"), field("Version", "version")),
			section("Build", "build",
				field("Commit", "commit_sha", "copy"), field("Source ref", "git_ref"),
				field("Build time", "build_time", "datetime"), field("Dirty build", "modified", "boolean")),
			section("Runtime", "runtime",
				field("Instance name", "instance_name", "copy"), field("Instance ID", "instance_id", "copy"),
				field("Hostname", "hostname"), field("Uptime", "uptime")),
		),
	)
	return debugregistry.NewPanelUI(console, toolbar)
}

// RegisterDeploymentDebugPanel registers an admin-scoped snapshot provider.
// The global registry receives metadata only so multiple Admin instances never
// capture each other's identity through a process-global closure.
func RegisterDeploymentDebugPanel(adm *Admin) {
	if adm == nil || adm.debugCollector == nil {
		return
	}
	panel := NewDeploymentDebugPanel(adm)
	collector := adm.debugCollector
	collector.mu.Lock()
	if _, exists := collector.panelIndex[DebugPanelDeployment]; !exists {
		collector.panels = append(collector.panels, panel)
		collector.panelIndex[DebugPanelDeployment] = panel
	}
	collector.mu.Unlock()
	registerBuiltinDebugPanel(DebugPanelDeployment, debugregistry.PanelConfig{
		Label:           panel.Label(),
		Icon:            panel.Icon(),
		Span:            panel.Span(),
		SnapshotKey:     DebugPanelDeployment,
		SupportsToolbar: new(true),
		Order:           5,
		Category:        "system",
		UI:              panel.UI(),
	})
}
