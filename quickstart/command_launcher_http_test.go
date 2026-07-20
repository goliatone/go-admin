package quickstart

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	debugregistry "github.com/goliatone/go-admin/debug"
	auth "github.com/goliatone/go-auth"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

const quickstartLauncherEchoCommandID = "quickstart.debug.echo"

type quickstartLauncherCatalog struct{}

func (quickstartLauncherCatalog) CommandDescriptors() []gocommand.CommandDescriptor {
	return []gocommand.CommandDescriptor{{
		ID:            quickstartLauncherEchoCommandID,
		Label:         "Echo",
		ExposeInAdmin: true,
		ExecutionMode: gocommand.ExecutionModeInline,
		Input: gocommand.CommandInputSchema{
			Type: "object",
			Fields: []gocommand.CommandInputField{{
				Path:     "message",
				Label:    "Message",
				Type:     "string",
				Required: true,
			}},
			Required: []string{"message"},
		},
	}}
}

type quickstartLauncherAuthenticator struct{}

func (quickstartLauncherAuthenticator) Wrap(c router.Context) error {
	actor := &auth.ActorContext{ActorID: "quickstart-debug-user", Subject: "quickstart-debug-user"}
	c.SetContext(auth.WithActorContext(c.Context(), actor))
	return nil
}

type quickstartLauncherAuthorizer struct{}

func (quickstartLauncherAuthorizer) Can(context.Context, string, string) bool {
	return true
}

type quickstartLauncherEchoMessage struct {
	Message string
}

func TestCommandLauncherDiscoveryAndDispatchThroughQuickstartFiber(t *testing.T) {
	debugregistry.UnregisterPanel(admin.DebugPanelCommands)
	t.Cleanup(func() { debugregistry.UnregisterPanel(admin.DebugPanelCommands) })

	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{
			Enabled: true,
			Panels:  []string{admin.DebugPanelCommands},
		}),
	)
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Authenticator:  quickstartLauncherAuthenticator{},
			Authorizer:     quickstartLauncherAuthorizer{},
			CommandCatalog: quickstartLauncherCatalog{},
		}),
		WithFeatureDefaults(map[string]bool{
			"commands": true,
			"debug":    true,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	dispatchedMessage := ""
	if _, err := admin.RegisterCommand(adm.Commands(), gocommand.CommandFunc[quickstartLauncherEchoMessage](func(_ context.Context, message quickstartLauncherEchoMessage) error {
		dispatchedMessage = message.Message
		return nil
	})); err != nil {
		t.Fatalf("register echo command: %v", err)
	}
	if err := admin.RegisterMessageFactory(adm.Commands(), quickstartLauncherEchoCommandID, func(payload map[string]any, _ []string) (quickstartLauncherEchoMessage, error) {
		return quickstartLauncherEchoMessage{Message: strings.TrimSpace(payload["message"].(string))}, nil
	}); err != nil {
		t.Fatalf("register echo message factory: %v", err)
	}
	if err := NewModuleRegistrar(
		adm,
		cfg,
		[]admin.Module{NewDebugModule(cfg.Debug)},
		true,
		WithSeedNavigation(false),
	); err != nil {
		t.Fatalf("register modules: %v", err)
	}

	server, fiberRouter := NewFiberServer(nil, cfg, adm, true, WithFiberLogger(false))
	if err := adm.Initialize(fiberRouter); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	server.Init()

	discoveryRequest := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/debug/api/panels", nil)
	discoveryResponse, err := server.WrappedRouter().Test(discoveryRequest, -1)
	if err != nil {
		t.Fatalf("discover debug panels: %v", err)
	}
	defer discoveryResponse.Body.Close()
	discoveryBody, err := io.ReadAll(discoveryResponse.Body)
	if err != nil {
		t.Fatalf("read discovery response: %v", err)
	}
	if discoveryResponse.StatusCode != http.StatusOK {
		t.Fatalf("expected discovery 200, got %d body=%s", discoveryResponse.StatusCode, discoveryBody)
	}
	var discovery struct {
		Panels []debugregistry.PanelDefinition `json:"panels"`
	}
	if err := json.Unmarshal(discoveryBody, &discovery); err != nil {
		t.Fatalf("decode discovery response: %v", err)
	}
	action := findQuickstartLauncherAction(t, discovery.Panels, quickstartLauncherEchoCommandID)

	payload := action.Payload
	if payload == nil {
		payload = map[string]any{}
	}
	payload["payload"] = map[string]any{"message": "end-to-end echo"}
	requestBody, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("encode dispatch request: %v", err)
	}
	dispatchPath := "/admin/debug/api/panels/commands/actions/" + action.ID
	dispatchRequest := httptest.NewRequestWithContext(context.Background(), http.MethodPost, dispatchPath, bytes.NewReader(requestBody))
	dispatchRequest.Header.Set("Content-Type", "application/json")
	dispatchResponse, err := server.WrappedRouter().Test(dispatchRequest, -1)
	if err != nil {
		t.Fatalf("dispatch echo action: %v", err)
	}
	defer dispatchResponse.Body.Close()
	dispatchBody, err := io.ReadAll(dispatchResponse.Body)
	if err != nil {
		t.Fatalf("read dispatch response: %v", err)
	}
	if dispatchResponse.StatusCode != http.StatusOK {
		t.Fatalf("expected dispatch 200, got %d body=%s", dispatchResponse.StatusCode, dispatchBody)
	}
	var dispatchResult debugregistry.PanelActionResult
	if err := json.Unmarshal(dispatchBody, &dispatchResult); err != nil {
		t.Fatalf("decode dispatch response: %v", err)
	}
	if !dispatchResult.OK {
		t.Fatalf("expected successful dispatch result, got %#v", dispatchResult)
	}
	if dispatchedMessage != "end-to-end echo" {
		t.Fatalf("expected typed echo handler execution, got %q", dispatchedMessage)
	}
}

func findQuickstartLauncherAction(t *testing.T, panels []debugregistry.PanelDefinition, commandID string) debugregistry.PanelUIAction {
	t.Helper()
	for _, panel := range panels {
		if panel.ID != admin.DebugPanelCommands || panel.UI == nil {
			continue
		}
		for _, action := range panel.UI.Actions {
			if action.Payload["command_id"] == commandID {
				return action
			}
		}
	}
	t.Fatalf("expected discovered action for command %q", commandID)
	return debugregistry.PanelUIAction{}
}
