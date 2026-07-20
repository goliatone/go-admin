package main

import (
	"context"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	gocommand "github.com/goliatone/go-command"
	commandregistry "github.com/goliatone/go-command/registry"
)

func TestExampleDebugCommandCatalogCoversLauncherFlows(t *testing.T) {
	descriptors := (exampleDebugCommandCatalog{}).CommandDescriptors()
	if len(descriptors) != 3 {
		t.Fatalf("descriptor count = %d, want 3", len(descriptors))
	}

	byID := make(map[string]gocommand.CommandDescriptor, len(descriptors))
	for _, descriptor := range descriptors {
		if descriptor.ID == "" || byID[descriptor.ID].ID != "" {
			t.Fatalf("catalog contains an empty or duplicate id: %#v", descriptor)
		}
		if !descriptor.ExposeInAdmin || descriptor.ExecutionMode != gocommand.ExecutionModeInline {
			t.Fatalf("descriptor is not launcher-ready: %#v", descriptor)
		}
		byID[descriptor.ID] = descriptor
	}

	echo := byID[exampleEchoCommandID]
	if echo.Mutating || !echo.Result.Inline || len(echo.Input.Fields) != 4 {
		t.Fatalf("unexpected echo descriptor: %#v", echo)
	}
	message := commandFieldByPath(t, echo, "message")
	if !message.Required || message.Validation["minLength"] != 1 || message.DisplayHints["section"] != "Message" {
		t.Fatalf("unexpected message field: %#v", message)
	}
	tone := commandFieldByPath(t, echo, "tone")
	if tone.Kind != "select" || tone.Default != "friendly" || len(tone.StaticOptions) != 3 {
		t.Fatalf("unexpected tone field: %#v", tone)
	}

	maintenance := byID[exampleMaintenanceCommandID]
	if !maintenance.Mutating || !maintenance.Result.Inline {
		t.Fatalf("unexpected maintenance descriptor: %#v", maintenance)
	}
	if notes := commandFieldByPath(t, maintenance, "notes"); notes.Kind != "textarea" || notes.DisplayHints["advanced"] != true {
		t.Fatalf("unexpected notes field: %#v", notes)
	}

	health := byID[exampleHealthCommandID]
	if !health.Input.NoInput || health.Mutating || !health.Result.Inline {
		t.Fatalf("unexpected health descriptor: %#v", health)
	}
}

func TestConfigureExampleDebugCommandRPCAddsSafeRulesWithoutOverwritingHostRules(t *testing.T) {
	cfg := coreadmin.Config{
		Commands: coreadmin.CommandConfig{
			RPC: coreadmin.RPCCommandConfig{
				Commands: map[string]coreadmin.RPCCommandRule{
					exampleEchoCommandID: {Permission: "example.custom.permission", Resource: "custom"},
				},
			},
		},
	}

	configureExampleDebugCommandRPC(&cfg)

	if len(cfg.Commands.RPC.Commands) != 3 {
		t.Fatalf("RPC command rule count = %d, want 3", len(cfg.Commands.RPC.Commands))
	}
	if rule := cfg.Commands.RPC.Commands[exampleEchoCommandID]; rule.Permission != "example.custom.permission" || rule.Resource != "custom" {
		t.Fatalf("existing host rule was overwritten: %#v", rule)
	}
	for _, commandID := range []string{exampleMaintenanceCommandID, exampleHealthCommandID} {
		rule, ok := cfg.Commands.RPC.Commands[commandID]
		if !ok || rule.Permission != exampleDebugCommandPermission || rule.Resource != "commands" {
			t.Fatalf("unexpected RPC rule for %s: %#v", commandID, rule)
		}
	}
}

func TestExampleDebugCommandsDispatchInlineResults(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := coreadmin.NewCommandBus(true)
		var logs []string
		if err := registerDebugConsoleCommands(bus, func(format string, args ...any) {
			logs = append(logs, format)
		}); err != nil {
			t.Fatalf("register commands: %v", err)
		}
		if err := commandregistry.Start(context.Background()); err != nil {
			t.Fatalf("start command registry: %v", err)
		}

		echoOutcome, err := bus.DispatchByNameWithOutcome(context.Background(), exampleEchoCommandID, map[string]any{
			"message":   "launcher ready",
			"tone":      "urgent",
			"repeat":    2,
			"uppercase": true,
		}, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
		if err != nil {
			t.Fatalf("dispatch echo: %v", err)
		}
		echo, ok := echoOutcome.Result.(exampleEchoResult)
		if !ok {
			t.Fatalf("echo result type = %T", echoOutcome.Result)
		}
		if echo.Output != "URGENT: LAUNCHER READY\nURGENT: LAUNCHER READY" || echo.Repeat != 2 || echo.ExecutedAt == "" {
			t.Fatalf("unexpected echo result: %#v", echo)
		}

		maintenanceOutcome, err := bus.DispatchByNameWithOutcome(context.Background(), exampleMaintenanceCommandID, map[string]any{
			"environment":      "production",
			"duration_minutes": 30,
			"notify_team":      false,
		}, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
		if err != nil {
			t.Fatalf("dispatch maintenance: %v", err)
		}
		maintenance, ok := maintenanceOutcome.Result.(exampleMaintenanceResult)
		if !ok || maintenance.Status != "simulated" || maintenance.Environment != "production" || maintenance.Notification != "skipped" {
			t.Fatalf("unexpected maintenance result: %#v", maintenanceOutcome.Result)
		}

		healthOutcome, err := bus.DispatchByNameWithOutcome(context.Background(), exampleHealthCommandID, nil, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
		if err != nil {
			t.Fatalf("dispatch health: %v", err)
		}
		health, ok := healthOutcome.Result.(exampleHealthResult)
		if !ok || health.Status != "ok" || health.CheckedAt == "" {
			t.Fatalf("unexpected health result: %#v", healthOutcome.Result)
		}
		if len(logs) != 3 {
			t.Fatalf("log call count = %d, want 3", len(logs))
		}
	})
}

func TestExampleDebugCommandFactoriesRejectInvalidInput(t *testing.T) {
	if _, err := buildExampleEchoMessage(map[string]any{"message": "", "repeat": 1}, nil); err == nil || !strings.Contains(err.Error(), "message is required") {
		t.Fatalf("expected required message error, got %v", err)
	}
	if _, err := buildExampleEchoMessage(map[string]any{"message": "hello", "repeat": 6}, nil); err == nil || !strings.Contains(err.Error(), "repeat") {
		t.Fatalf("expected repeat range error, got %v", err)
	}
	if _, err := buildExampleMaintenanceMessage(map[string]any{"environment": "unknown", "duration_minutes": 15}, nil); err == nil || !strings.Contains(err.Error(), "environment") {
		t.Fatalf("expected environment error, got %v", err)
	}
	if _, err := buildExampleMaintenanceMessage(map[string]any{"environment": "staging", "duration_minutes": 2}, nil); err == nil || !strings.Contains(err.Error(), "duration_minutes") {
		t.Fatalf("expected duration range error, got %v", err)
	}
}

func commandFieldByPath(t *testing.T, descriptor gocommand.CommandDescriptor, path string) gocommand.CommandInputField {
	t.Helper()
	for _, field := range descriptor.Input.Fields {
		if field.Path == path {
			return field
		}
	}
	t.Fatalf("field %q not found in descriptor %q", path, descriptor.ID)
	return gocommand.CommandInputField{}
}
