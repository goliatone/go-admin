package quickstart

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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
const quickstartLauncherIndexesSourceID = "quickstart.search_indexes"

type quickstartLauncherCatalog struct {
	descriptors []gocommand.CommandDescriptor
}

func (c *quickstartLauncherCatalog) CommandDescriptors() []gocommand.CommandDescriptor {
	if c == nil {
		return nil
	}
	return append([]gocommand.CommandDescriptor(nil), c.descriptors...)
}

func quickstartLauncherEchoDescriptor() gocommand.CommandDescriptor {
	return gocommand.CommandDescriptor{
		ID:            quickstartLauncherEchoCommandID,
		Label:         "Echo",
		ExposeInAdmin: true,
		ExecutionMode: gocommand.ExecutionModeInline,
		Input: gocommand.CommandInputSchema{
			Type: "object",
			Fields: []gocommand.CommandInputField{
				{
					Path:     "message",
					Label:    "Message",
					Type:     "string",
					Required: true,
				},
				{
					Path:  "indexes",
					Label: "Indexes",
					Type:  "array",
					Kind:  "select",
					OptionSource: &gocommand.CommandOptionSourceRef{
						ID:         quickstartLauncherIndexesSourceID,
						Dynamic:    true,
						CacheScope: "request",
					},
				},
			},
			Required: []string{"message"},
		},
	}
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
	Indexes []string
}

func (quickstartLauncherEchoMessage) Type() string { return quickstartLauncherEchoCommandID }

type quickstartLauncherOptionProvider struct {
	requests []gocommand.CommandOptionRequest
}

func (p *quickstartLauncherOptionProvider) CommandOptions(_ context.Context, req gocommand.CommandOptionRequest) ([]gocommand.CommandOption, error) {
	p.requests = append(p.requests, req)
	return []gocommand.CommandOption{
		{Value: "site_content", Label: "Site content"},
		{Value: "archive_media", Label: "Archive media"},
	}, nil
}

func TestCommandLauncherDiscoveryAndDispatchThroughQuickstartFiber(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })
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
	cfg.Commands.RPC.Commands = map[string]admin.RPCCommandRule{
		quickstartLauncherEchoCommandID: {
			Permission: "admin.commands.dispatch",
			Resource:   "commands",
		},
	}
	catalog := &quickstartLauncherCatalog{}
	optionProvider := &quickstartLauncherOptionProvider{}
	adm, _, newAdminErr := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Authenticator:         quickstartLauncherAuthenticator{},
			Authorizer:            quickstartLauncherAuthorizer{},
			CommandCatalog:        catalog,
			CommandOptionProvider: optionProvider,
		}),
		WithFeatureDefaults(map[string]bool{
			"commands": true,
			"debug":    true,
		}),
	)
	if newAdminErr != nil {
		t.Fatalf("NewAdmin: %v", newAdminErr)
	}
	t.Cleanup(adm.Commands().Reset)

	dispatchedMessage := ""
	dispatchedIndexes := []string(nil)
	if _, err := admin.RegisterCommand(adm.Commands(), gocommand.CommandFunc[quickstartLauncherEchoMessage](func(_ context.Context, message quickstartLauncherEchoMessage) error {
		dispatchedMessage = message.Message
		dispatchedIndexes = append([]string(nil), message.Indexes...)
		return nil
	})); err != nil {
		t.Fatalf("register echo command: %v", err)
	}
	if err := admin.RegisterMessageFactory(adm.Commands(), quickstartLauncherEchoCommandID, func(payload map[string]any, _ []string) (quickstartLauncherEchoMessage, error) {
		message, ok := payload["message"].(string)
		if !ok {
			return quickstartLauncherEchoMessage{}, fmt.Errorf("message must be a string, got %T", payload["message"])
		}
		return quickstartLauncherEchoMessage{
			Message: strings.TrimSpace(message),
			Indexes: quickstartLauncherStringSlice(payload["indexes"]),
		}, nil
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
	registration, ok := debugregistry.Panel(admin.DebugPanelCommands)
	if !ok {
		t.Fatal("expected command launcher panel registration")
	}
	if _, ok := registration.Actions["resolve_options"]; !ok {
		t.Fatalf("expected protected option resolver handler, got %+v", registration.Actions)
	}
	catalog.descriptors = []gocommand.CommandDescriptor{quickstartLauncherEchoDescriptor()}

	discoveryRequest := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/debug/api/panels", nil)
	discoveryResponse, discoveryErr := server.WrappedRouter().Test(discoveryRequest, -1)
	if discoveryErr != nil {
		t.Fatalf("discover debug panels: %v", discoveryErr)
	}
	defer func() {
		if closeErr := discoveryResponse.Body.Close(); closeErr != nil {
			t.Errorf("close discovery response: %v", closeErr)
		}
	}()
	discoveryBody, readDiscoveryErr := io.ReadAll(discoveryResponse.Body)
	if readDiscoveryErr != nil {
		t.Fatalf("read discovery response: %v", readDiscoveryErr)
	}
	if discoveryResponse.StatusCode != http.StatusOK {
		t.Fatalf("expected discovery 200, got %d body=%s", discoveryResponse.StatusCode, discoveryBody)
	}
	var discovery struct {
		Panels []debugregistry.PanelDefinition `json:"panels"`
	}
	if decodeDiscoveryErr := json.Unmarshal(discoveryBody, &discovery); decodeDiscoveryErr != nil {
		t.Fatalf("decode discovery response: %v", decodeDiscoveryErr)
	}
	action := findQuickstartLauncherAction(t, discovery.Panels, quickstartLauncherEchoCommandID)
	resolver := findQuickstartLauncherActionByID(t, discovery.Panels, "resolve_options")
	if !resolver.Hidden || resolver.Kind != "command_options" {
		t.Fatalf("expected protected hidden option resolver, got %#v", resolver)
	}
	if action.Form == nil || !strings.Contains(action.Form.HTML, "command-options://"+quickstartLauncherEchoCommandID+"/indexes") {
		t.Fatalf("expected generated dynamic index field, got %#v", action.Form)
	}

	resolverBody, encodeResolverErr := json.Marshal(map[string]any{
		"command_id": quickstartLauncherEchoCommandID,
		"field_path": "indexes",
		"source_id":  quickstartLauncherIndexesSourceID,
		"payload":    map[string]any{"message": "current draft"},
	})
	if encodeResolverErr != nil {
		t.Fatalf("encode resolver request: %v", encodeResolverErr)
	}
	resolverPath := "/admin/debug/api/panels/commands/actions/" + resolver.ID
	resolverRequest := httptest.NewRequestWithContext(context.Background(), http.MethodPost, resolverPath, bytes.NewReader(resolverBody))
	resolverRequest.Header.Set("Content-Type", "application/json")
	resolverResponse, resolverErr := server.WrappedRouter().Test(resolverRequest, -1)
	if resolverErr != nil {
		t.Fatalf("resolve command options: %v", resolverErr)
	}
	defer func() {
		if closeErr := resolverResponse.Body.Close(); closeErr != nil {
			t.Errorf("close resolver response: %v", closeErr)
		}
	}()
	resolverResponseBody, readResolverErr := io.ReadAll(resolverResponse.Body)
	if readResolverErr != nil {
		t.Fatalf("read resolver response: %v", readResolverErr)
	}
	if resolverResponse.StatusCode != http.StatusOK {
		t.Fatalf("expected resolver 200, got %d body=%s", resolverResponse.StatusCode, resolverResponseBody)
	}
	var resolverResult debugregistry.PanelActionResult
	if decodeResolverErr := json.Unmarshal(resolverResponseBody, &resolverResult); decodeResolverErr != nil {
		t.Fatalf("decode resolver response: %v", decodeResolverErr)
	}
	resolverData, ok := resolverResult.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected resolver result map, got %#v", resolverResult.Data)
	}
	optionItems, ok := resolverData["option_items"].([]any)
	if !resolverResult.OK || !ok || len(optionItems) != 2 {
		t.Fatalf("expected two resolved index options, got %#v", resolverResult)
	}
	if len(optionProvider.requests) != 1 || optionProvider.requests[0].Payload["message"] != "current draft" {
		t.Fatalf("expected current values at provider, got %#v", optionProvider.requests)
	}

	payload := action.Payload
	if payload == nil {
		payload = map[string]any{}
	}
	payload["payload"] = map[string]any{
		"message": "end-to-end echo",
		"indexes": []string{"site_content"},
	}
	requestBody, encodeRequestErr := json.Marshal(payload)
	if encodeRequestErr != nil {
		t.Fatalf("encode dispatch request: %v", encodeRequestErr)
	}
	dispatchPath := "/admin/debug/api/panels/commands/actions/" + action.ID
	dispatchRequest := httptest.NewRequestWithContext(context.Background(), http.MethodPost, dispatchPath, bytes.NewReader(requestBody))
	dispatchRequest.Header.Set("Content-Type", "application/json")
	dispatchResponse, dispatchErr := server.WrappedRouter().Test(dispatchRequest, -1)
	if dispatchErr != nil {
		t.Fatalf("dispatch echo action: %v", dispatchErr)
	}
	defer func() {
		if closeErr := dispatchResponse.Body.Close(); closeErr != nil {
			t.Errorf("close dispatch response: %v", closeErr)
		}
	}()
	dispatchBody, readDispatchErr := io.ReadAll(dispatchResponse.Body)
	if readDispatchErr != nil {
		t.Fatalf("read dispatch response: %v", readDispatchErr)
	}
	if dispatchResponse.StatusCode != http.StatusOK {
		t.Fatalf("expected dispatch 200, got %d body=%s", dispatchResponse.StatusCode, dispatchBody)
	}
	var dispatchResult debugregistry.PanelActionResult
	if decodeDispatchErr := json.Unmarshal(dispatchBody, &dispatchResult); decodeDispatchErr != nil {
		t.Fatalf("decode dispatch response: %v", decodeDispatchErr)
	}
	if !dispatchResult.OK {
		t.Fatalf("expected successful dispatch result, got %#v", dispatchResult)
	}
	if dispatchedMessage != "end-to-end echo" {
		t.Fatalf("expected typed echo handler execution, got %q", dispatchedMessage)
	}
	if len(dispatchedIndexes) != 1 || dispatchedIndexes[0] != "site_content" {
		t.Fatalf("expected exact selected index subset, got %#v", dispatchedIndexes)
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

func findQuickstartLauncherActionByID(t *testing.T, panels []debugregistry.PanelDefinition, actionID string) debugregistry.PanelUIAction {
	t.Helper()
	for _, panel := range panels {
		if panel.ID != admin.DebugPanelCommands || panel.UI == nil {
			continue
		}
		for _, action := range panel.UI.Actions {
			if action.ID == actionID {
				return action
			}
		}
	}
	t.Fatalf("expected discovered action %q", actionID)
	return debugregistry.PanelUIAction{}
}

func quickstartLauncherStringSlice(value any) []string {
	items, ok := value.([]any)
	if !ok {
		if typed, typedOK := value.([]string); typedOK {
			return append([]string(nil), typed...)
		}
		return nil
	}
	out := make([]string, 0, len(items))
	for _, item := range items {
		if text, textOK := item.(string); textOK && strings.TrimSpace(text) != "" {
			out = append(out, strings.TrimSpace(text))
		}
	}
	return out
}
