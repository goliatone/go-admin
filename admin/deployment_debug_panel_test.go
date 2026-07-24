package admin

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
)

func TestDeploymentDebugPanelDefaultsAndScopedSnapshots(t *testing.T) {
	if !containsDeploymentPanel(DefaultDebugPanels(), DebugPanelDeployment) {
		t.Fatal("deployment panel is not enabled by default")
	}
	if !containsDeploymentPanel(DefaultDebugToolbarPanels(), DebugPanelDeployment) {
		t.Fatal("deployment toolbar panel is not enabled by default")
	}

	start := time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC)
	first := newDeploymentPanelTestAdmin("first", start)
	second := newDeploymentPanelTestAdmin("second", start)
	RegisterDeploymentDebugPanel(first)
	RegisterDeploymentDebugPanel(second)

	firstSnapshot := first.debugCollector.SnapshotWithContext(context.Background())
	secondSnapshot := second.debugCollector.SnapshotWithContext(context.Background())
	assertDeploymentPanelInstance(t, firstSnapshot, "first")
	assertDeploymentPanelInstance(t, secondSnapshot, "second")

	definitions := first.debugCollector.PanelDefinitions()
	found := false
	for _, definition := range definitions {
		if definition.ID != DebugPanelDeployment {
			continue
		}
		found = true
		if !definition.SupportsToolbar || definition.UI == nil || definition.UI.Views.Console == nil || definition.UI.Views.Toolbar == nil {
			t.Fatalf("incomplete deployment panel definition: %+v", definition)
		}
	}
	if !found {
		t.Fatal("deployment panel definition not found")
	}
}

func TestDeploymentDebugPanelUILeadsWithIdentityAndGroupsDetail(t *testing.T) {
	adm := newDeploymentPanelTestAdmin("schema", time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC))
	RegisterDeploymentDebugPanel(adm)

	var definition debugregistry.PanelDefinition
	for _, candidate := range adm.debugCollector.PanelDefinitions() {
		if candidate.ID == DebugPanelDeployment {
			definition = candidate
		}
	}
	if definition.UI == nil {
		t.Fatal("deployment panel definition is missing its UI schema")
	}

	for name, view := range map[string]*debugregistry.PanelUIView{
		"console": definition.UI.Views.Console,
		"toolbar": definition.UI.Views.Toolbar,
	} {
		if view == nil || view.Renderer != debugregistry.PanelRendererStack || len(view.Sections) != 2 {
			t.Fatalf("%s view should stack an identity header over grouped detail, got %+v", name, view)
		}
		identity := view.Sections[0]
		if identity.Renderer != debugregistry.PanelRendererIdentity {
			t.Fatalf("%s view should lead with the identity renderer, got %q", name, identity.Renderer)
		}
		if identity.Options["color_bind"] != "environment.color" ||
			identity.Options["eyebrow_bind"] != "environment.name" ||
			identity.Options["title_bind"] != "persona.name" ||
			identity.Options["title_fallback_bind"] != "runtime.instance_name" ||
			identity.Options["avatar_bind"] != "persona.visual" ||
			identity.Options["title_format"] != "copy" {
			t.Fatalf("%s identity header lost its declared bindings: %+v", name, identity.Options)
		}
		chips, ok := identity.Options["chips"].([]any)
		if !ok || len(chips) == 0 {
			t.Fatalf("%s identity header lost its supporting chips: %+v", name, identity.Options)
		}
		detail := view.Sections[1]
		if detail.Renderer != debugregistry.PanelRendererStack || detail.Options["layout"] != debugregistry.PanelStackLayoutGrid {
			t.Fatalf("%s detail group should use the grid stack layout, got %+v", name, detail)
		}
		if len(detail.Sections) < 3 {
			t.Fatalf("%s detail group should retain grouped sections, got %+v", name, detail.Sections)
		}
		for _, section := range detail.Sections {
			if section.Renderer != debugregistry.PanelRendererKeyValue {
				t.Fatalf("%s detail section should render key/value pairs, got %q", name, section.Renderer)
			}
			fields, ok := section.Options["fields"].([]any)
			if !ok || len(fields) == 0 {
				t.Fatalf("%s %q section lost its declared fields: %+v", name, section.Title, section.Options)
			}
			for _, entry := range fields {
				field, ok := entry.(map[string]any)
				if !ok || field["label"] == "" || field["bind"] == "" || field["empty"] != "Unavailable" {
					t.Fatalf("%s %q section declared an incomplete field: %+v", name, section.Title, entry)
				}
			}
		}
	}

	console := definition.UI.Views.Console.Sections[1].Sections
	formats := map[string]string{}
	for _, section := range console {
		fields := mustAnySlice(t, section.Options["fields"], section.Title+" fields")
		for _, entry := range fields {
			field := mustMapAny(t, entry, section.Title+" field")
			bind := mustString(t, field["bind"], section.Title+" field bind")
			format := ""
			if declaredFormat, ok := field["format"].(string); ok {
				format = declaredFormat
			}
			formats[section.Title+"."+bind] = format
		}
	}
	for bind, want := range map[string]string{
		"Build.commit_sha":      "copy",
		"Build.build_time":      "datetime",
		"Build.modified":        "boolean",
		"Environment.color":     "color",
		"Runtime.instance_name": "copy",
		"Runtime.instance_id":   "copy",
		"Runtime.started_at":    "datetime",
	} {
		if formats[bind] != want {
			t.Fatalf("expected %s to declare format %q, got %q", bind, want, formats[bind])
		}
	}
}

func TestDeploymentDebugPanelDisabled(t *testing.T) {
	adm := &Admin{
		deploymentIdentity: DeploymentIdentity{InstanceName: "hidden", InstanceID: "hidden"},
		debugCollector:     NewDebugCollector(DebugConfig{Enabled: true, Panels: []string{DebugPanelRequests}}),
	}
	RegisterDeploymentDebugPanel(adm)
	if _, ok := adm.debugCollector.Snapshot()[DebugPanelDeployment]; ok {
		t.Fatal("disabled deployment panel was exposed")
	}
}

func TestDeploymentIdentityMatchesDebugAndDevelopmentErrorSurfaces(t *testing.T) {
	state, err := resolveAdminConstructorState(Config{
		Deployment: DeploymentIdentityConfig{
			AppID:        "cross-surface",
			Environment:  "staging",
			InstanceName: "steady-raven",
			InstanceID:   "instance-cross-surface",
			CommitSHA:    "abcdef0123456789",
			Persona:      DeploymentPersonaConfig{Enabled: true},
		},
		Errors: ErrorConfig{DevMode: true, ShowEnvironment: true},
	}, Dependencies{})
	if err != nil {
		t.Fatalf("resolve admin state: %v", err)
	}
	adm := newAdminFromConstructorState(state, Dependencies{})
	adm.debugCollector = NewDebugCollector(DebugConfig{Enabled: true, Panels: []string{DebugPanelDeployment}})
	RegisterDeploymentDebugPanel(adm)

	snapshot := adm.debugCollector.Snapshot()
	panel := mustMapAny(t, snapshot[DebugPanelDeployment], "deployment panel")
	runtimeData := mustMapAny(t, panel["runtime"], "deployment runtime")
	buildData := mustMapAny(t, panel["build"], "deployment build")
	personaData, ok := panel["persona"].(DeploymentPersona)
	if !ok {
		t.Fatalf("missing debug persona projection: %+v", panel["persona"])
	}
	errorContext := adm.ErrorPresenter().BuildDevErrorContext(errors.New("boom"), nil)
	if errorContext == nil || errorContext.EnvironmentInfo == nil || errorContext.EnvironmentInfo.Deployment == nil {
		t.Fatalf("missing development error deployment context: %+v", errorContext)
	}
	errorIdentity := errorContext.EnvironmentInfo.Deployment
	resolved := adm.DeploymentIdentity()
	if runtimeData["instance_name"] != resolved.InstanceName ||
		runtimeData["instance_id"] != resolved.InstanceID ||
		buildData["commit_sha"] != resolved.CommitSHA ||
		errorIdentity.InstanceName != resolved.InstanceName ||
		errorIdentity.InstanceID != resolved.InstanceID ||
		errorIdentity.CommitSHA != resolved.CommitSHA ||
		resolved.Persona == nil ||
		errorIdentity.Persona == nil ||
		personaData.Name != resolved.Persona.Name ||
		errorIdentity.Persona.Name != resolved.Persona.Name {
		t.Fatalf("cross-surface identity mismatch: resolved=%+v debug=%+v error=%+v", resolved, panel, errorIdentity)
	}
}

func newDeploymentPanelTestAdmin(instance string, startedAt time.Time) *Admin {
	collector := NewDebugCollector(DebugConfig{Enabled: true, Panels: []string{DebugPanelDeployment}})
	adm := &Admin{
		deploymentIdentity: DeploymentIdentity{
			AppID: "app", Environment: "staging", EnvironmentColor: defaultStagingColor,
			InstanceName: instance, InstanceID: "id-" + instance, CommitSHA: "abcdef0",
			CommitShort: "abcdef0", StartedAt: startedAt,
		},
		debugCollector: collector,
	}
	return adm
}

func assertDeploymentPanelInstance(t *testing.T, snapshot map[string]any, want string) {
	t.Helper()
	panel, ok := snapshot[DebugPanelDeployment].(map[string]any)
	if !ok {
		t.Fatalf("missing deployment snapshot: %+v", snapshot)
	}
	runtime, ok := panel["runtime"].(map[string]any)
	if !ok || runtime["instance_name"] != want {
		t.Fatalf("unexpected runtime identity: %+v", panel)
	}
}

func containsDeploymentPanel(values []string, expected string) bool {
	return slices.Contains(values, expected)
}
