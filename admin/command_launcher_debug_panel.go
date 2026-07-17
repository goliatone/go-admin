package admin

import (
	"context"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	gocommand "github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

const (
	DebugPanelCommandLauncher = "commands"

	commandLauncherDispatchPermission   = "admin.commands.dispatch"
	commandLauncherReadPermission       = "admin.commands.read"
	commandLauncherResolveOptionsAction = "resolve_options"
)

type CommandLauncherSnapshot struct {
	Commands    []gocommand.CommandDescriptor `json:"commands"`
	Diagnostics []CommandLauncherDiagnostic   `json:"diagnostics,omitempty"`
}

type CommandLauncherDiagnostic struct {
	Code     string         `json:"code"`
	Severity string         `json:"severity"`
	Message  string         `json:"message"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

type commandLauncherState struct {
	Registered                 []gocommand.CommandDescriptor
	Visible                    []gocommand.CommandDescriptor
	Executable                 []gocommand.CommandDescriptor
	HiddenByCommandPermissions int
	Diagnostics                []CommandLauncherDiagnostic
}

// RegisterCommandLauncherDebugPanel registers the generic command catalog
// launcher. It is inert when no command catalog provider is configured.
func RegisterCommandLauncherDebugPanel(adm *Admin) {
	if adm == nil || adm.commandCatalog == nil {
		return
	}
	RegisterCommandLauncherDoctorCheck(adm)
	debugregistry.UnregisterPanel(DebugPanelCommandLauncher)
	if err := debugregistry.RegisterPanel(DebugPanelCommandLauncher, debugregistry.PanelConfig{
		Label:       "Commands",
		Icon:        "iconoir-terminal-tag",
		Span:        2,
		SnapshotKey: DebugPanelCommandLauncher,
		Category:    "operations",
		EventTypes:  []string{commandStatusEventType},
		Snapshot: func(ctx context.Context) any {
			state := buildCommandLauncherState(ctx, adm)
			return CommandLauncherSnapshot{
				Commands:    safeCommandLauncherDescriptors(state.Visible, false),
				Diagnostics: state.Diagnostics,
			}
		},
		UI:         commandLauncherPanelUI(nil, nil, nil),
		Definition: commandLauncherDefinitionFilter(adm),
		Actions:    commandLauncherActionHandlers(adm),
	}); err != nil {
		return
	}
}

// RegisterCommandLauncherDoctorCheck exposes launcher readiness through the
// Doctor panel so an empty command launcher is not reported as healthy.
func RegisterCommandLauncherDoctorCheck(adm *Admin) {
	if adm == nil {
		return
	}
	adm.RegisterDoctorChecks(DoctorCheck{
		ID:          "command_launcher",
		Label:       "Command launcher",
		Description: "Checks go-command catalog provider and command launcher permissions.",
		Run: func(ctx context.Context, adm *Admin) DoctorCheckOutput {
			state := buildCommandLauncherState(ctx, adm)
			output := DoctorCheckOutput{
				Metadata: map[string]any{
					"registered_command_count": len(state.Registered),
					"visible_command_count":    len(state.Visible),
					"executable_command_count": len(state.Executable),
				},
			}
			if len(state.Diagnostics) == 0 {
				output.Summary = "Command launcher is ready."
				output.Findings = []DoctorFinding{{
					Severity:  DoctorSeverityOK,
					Code:      "command_launcher_ready",
					Component: DebugPanelCommands,
					Message:   "Command launcher has visible executable commands.",
				}}
				return output
			}
			output.Summary = "Command launcher has readiness or permission gaps."
			output.Findings = make([]DoctorFinding, 0, len(state.Diagnostics))
			for _, diagnostic := range state.Diagnostics {
				output.Findings = append(output.Findings, DoctorFinding{
					Severity:  commandLauncherDoctorSeverity(diagnostic.Severity),
					Code:      diagnostic.Code,
					Component: DebugPanelCommands,
					Message:   diagnostic.Message,
					Metadata:  diagnostic.Metadata,
				})
			}
			return output
		},
	})
}

func commandLauncherDefinitionFilter(adm *Admin) debugregistry.PanelDefinitionFilter {
	return func(ctx context.Context, definition debugregistry.PanelDefinition) debugregistry.PanelDefinition {
		filtered := definition
		state := buildCommandLauncherState(ctx, adm)
		diagnostics := append([]CommandLauncherDiagnostic(nil), state.Diagnostics...)
		actions := commandLauncherActions(ctx, adm, state.Executable, &diagnostics)
		if adm.commandOptionProvider != nil && commandLauncherDynamicOptionFieldCount(state.Executable) > 0 {
			actions = append(actions, commandLauncherOptionResolverAction())
		}
		filtered.UI = commandLauncherPanelUI(state.Executable, diagnostics, actions)
		return filtered
	}
}

func commandLauncherPanelUI(commands []gocommand.CommandDescriptor, diagnostics []CommandLauncherDiagnostic, actions []debugregistry.PanelUIAction) *debugregistry.PanelUI {
	ui := debugregistry.NewPanelUI(&debugregistry.PanelUIView{
		Renderer: debugregistry.PanelRendererStack,
		Sections: []debugregistry.PanelUIView{
			{
				Renderer: debugregistry.PanelRendererTable,
				Title:    "Command Catalog",
				Bind:     "commands",
				Options: map[string]any{
					"columns": []map[string]string{
						{"label": "Command", "bind": "id"},
						{"label": "Group", "bind": "group"},
						{"label": "Execution", "bind": "execution_mode"},
						{"label": "Mutating", "bind": "mutating"},
					},
				},
			},
			{
				Renderer: debugregistry.PanelRendererTable,
				Title:    "Diagnostics",
				Bind:     "diagnostics",
				Options: map[string]any{
					"columns": []map[string]string{
						{"label": "Severity", "bind": "severity"},
						{"label": "Code", "bind": "code"},
						{"label": "Message", "bind": "message"},
					},
				},
			},
		},
	}, nil)
	ui.Count = &debugregistry.PanelUICount{Bind: "commands", Mode: debugregistry.PanelCountArrayLength, Label: "commands"}
	ui.ActionLayout = &debugregistry.PanelUIActionLayout{
		Mode:        debugregistry.PanelActionLayoutSelect,
		PickerLabel: "Command",
		EmptyText:   "Select a command to run",
	}
	ui.Actions = actions
	ui.Metadata = map[string]any{
		"rpc_method":           RPCMethodCommandDispatch,
		"payload_contract":     "Submit {command_id, payload, options}; dispatch uses go-command/rpc envelopes.",
		"formgen_compatible":   true,
		"catalog_provider":     true,
		"dynamic_options":      "request_scoped",
		"diagnostics":          diagnostics,
		"action_authorization": "admin.commands.read + command-specific permission + admin.commands.dispatch",
	}
	for _, action := range actions {
		if action.ID == commandLauncherResolveOptionsAction && action.Hidden {
			ui.Metadata["option_resolver_action"] = commandLauncherResolveOptionsAction
			break
		}
	}
	return ui
}

func buildCommandLauncherState(ctx context.Context, adm *Admin) commandLauncherState {
	state := commandLauncherState{}
	if adm == nil {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("admin_unavailable", "error", "Admin instance is unavailable.", nil))
		return state
	}
	if adm.commandCatalog == nil {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("catalog_provider_unavailable", "warning", "Command catalog provider is not configured.", nil))
		return state
	}
	if !featureEnabled(adm.featureGate, FeatureCommands) {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("command_feature_disabled", "warning", "The commands feature is disabled, so command execution is unavailable.", nil))
		return state
	}
	state.Registered = adm.commandCatalog.CommandDescriptors()
	if len(state.Registered) == 0 {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("no_exposed_commands", "warning", "Command catalog provider returned no exposed commands.", nil))
		return state
	}
	if !commandLauncherAllowed(ctx, adm, commandLauncherReadPermission) {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("missing_command_read", "warning", "Command catalog is hidden because the actor lacks admin.commands.read.", nil))
		return state
	}
	uniqueDescriptors, duplicateDiagnostics := uniqueCommandLauncherActionDescriptors(state.Registered)
	state.Diagnostics = append(state.Diagnostics, duplicateDiagnostics...)
	state.Visible, state.HiddenByCommandPermissions = visibleCommandLauncherDescriptors(ctx, adm, uniqueDescriptors)
	if len(state.Visible) == 0 {
		code := "no_visible_commands"
		message := "No command descriptors are visible for this actor."
		if state.HiddenByCommandPermissions > 0 {
			code = "command_specific_permission_gaps"
			message = "No command descriptors are visible because the actor lacks command-specific permissions."
		}
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic(code, "warning", message, map[string]any{
			"registered_command_count":           len(state.Registered),
			"hidden_by_command_permission_count": state.HiddenByCommandPermissions,
		}))
		return state
	}
	if state.HiddenByCommandPermissions > 0 {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("command_specific_permission_gaps", "info", "Some command descriptors are hidden because the actor lacks command-specific permissions.", map[string]any{
			"visible_command_count":              len(state.Visible),
			"hidden_by_command_permission_count": state.HiddenByCommandPermissions,
		}))
	}
	if !commandLauncherAllowed(ctx, adm, commandLauncherDispatchPermission) {
		state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("missing_command_dispatch", "warning", "Command discovery is available, but execution requires admin.commands.dispatch.", map[string]any{"visible_command_count": len(state.Visible)}))
		return state
	}
	state.Executable = append(state.Executable, state.Visible...)
	if adm.commandOptionProvider == nil {
		if dynamicCount := commandLauncherDynamicOptionFieldCount(state.Executable); dynamicCount > 0 {
			state.Diagnostics = append(state.Diagnostics, commandLauncherDiagnostic("option_provider_unavailable", "warning", "Command option provider is not configured for dynamic command options.", map[string]any{
				"dynamic_option_field_count": dynamicCount,
			}))
		}
	}
	return state
}

func visibleCommandLauncherDescriptors(ctx context.Context, adm *Admin, registered []gocommand.CommandDescriptor) ([]gocommand.CommandDescriptor, int) {
	visible := make([]gocommand.CommandDescriptor, 0, len(registered))
	hidden := 0
	for _, descriptor := range registered {
		descriptor = normalizeCommandLauncherDescriptor(descriptor)
		if descriptor.ID == "" || !descriptor.ExposeInAdmin {
			continue
		}
		if !commandLauncherDescriptorAllowed(ctx, adm, descriptor) {
			hidden++
			continue
		}
		visible = append(visible, descriptor)
	}
	return visible, hidden
}

func commandLauncherDynamicOptionFieldCount(commands []gocommand.CommandDescriptor) int {
	count := 0
	for _, descriptor := range commands {
		for _, field := range descriptor.Input.Fields {
			if field.OptionSource != nil {
				count++
			}
		}
	}
	return count
}

func commandLauncherAllowed(ctx context.Context, adm *Admin, permission string) bool {
	return commandLauncherAllowedForResource(ctx, adm, permission, defaultRPCCommandResource)
}

func commandLauncherAllowedForResource(ctx context.Context, adm *Admin, permission string, resource string) bool {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return true
	}
	resource = strings.TrimSpace(resource)
	if resource == "" {
		resource = defaultRPCCommandResource
	}
	if adm == nil || adm.Authorizer() == nil {
		return false
	}
	return adm.Authorizer().Can(ctx, permission, resource)
}

func commandLauncherDescriptorAllowed(ctx context.Context, adm *Admin, descriptor gocommand.CommandDescriptor) bool {
	permissions := descriptor.Permissions
	if len(permissions) == 0 {
		permissions = descriptor.Exposure.Permissions
	}
	resource := commandLauncherDescriptorResource(descriptor)
	for _, permission := range permissions {
		if !commandLauncherAllowedForResource(ctx, adm, permission, resource) {
			return false
		}
	}
	return true
}

func commandLauncherDescriptorResource(descriptor gocommand.CommandDescriptor) string {
	if descriptor.DisplayHints != nil {
		if resource, ok := descriptor.DisplayHints["resource"].(string); ok {
			return strings.TrimSpace(resource)
		}
	}
	return defaultRPCCommandResource
}

func normalizeCommandLauncherDescriptor(descriptor gocommand.CommandDescriptor) gocommand.CommandDescriptor {
	descriptor.ID = strings.TrimSpace(descriptor.ID)
	descriptor.MessageType = strings.TrimSpace(descriptor.MessageType)
	if descriptor.ID == "" {
		descriptor.ID = descriptor.MessageType
	}
	if !descriptor.ExposeInAdmin {
		descriptor.ExposeInAdmin = descriptor.Exposure.ExposeInAdmin
	}
	if !descriptor.Mutating {
		descriptor.Mutating = descriptor.Exposure.Mutates
	}
	if descriptor.ExecutionMode == "" {
		descriptor.ExecutionMode = gocommand.ExecutionModeInline
	}
	if len(descriptor.Permissions) == 0 {
		descriptor.Permissions = append([]string(nil), descriptor.Exposure.Permissions...)
	}
	if len(descriptor.Roles) == 0 {
		descriptor.Roles = append([]string(nil), descriptor.Exposure.Roles...)
	}
	if len(descriptor.Tags) == 0 {
		descriptor.Tags = append([]string(nil), descriptor.Exposure.Tags...)
	}
	return descriptor
}

func safeCommandLauncherDescriptors(input []gocommand.CommandDescriptor, includeInput bool) []gocommand.CommandDescriptor {
	out := make([]gocommand.CommandDescriptor, 0, len(input))
	for _, descriptor := range input {
		descriptor = normalizeCommandLauncherDescriptor(descriptor)
		if !includeInput {
			descriptor.Input = gocommand.CommandInputSchema{}
		}
		out = append(out, descriptor)
	}
	return out
}

func commandLauncherActions(ctx context.Context, adm *Admin, commands []gocommand.CommandDescriptor, diagnostics *[]CommandLauncherDiagnostic) []debugregistry.PanelUIAction {
	if len(commands) == 0 {
		return nil
	}
	actions := make([]debugregistry.PanelUIAction, 0, len(commands))
	for _, descriptor := range commands {
		descriptor = normalizeCommandLauncherDescriptor(descriptor)
		actionID := commandLauncherActionID(descriptor.ID)
		if actionID == "" {
			continue
		}
		formSchema, formDiagnostics, err := adaptCommandLauncherFormgenSchema(descriptor)
		for _, diagnostic := range formDiagnostics {
			appendCommandLauncherDiagnostic(diagnostics, diagnostic)
		}
		if err != nil || len(formDiagnostics) > 0 {
			message := "Command form could not be generated."
			if err != nil {
				message = err.Error()
			}
			appendCommandLauncherDiagnostic(diagnostics, commandLauncherDiagnostic("formgen_render_failed", "warning", message, map[string]any{"command_id": descriptor.ID}))
			continue
		}
		formRenderer, err := sharedCommandLauncherFormgenRenderer()
		if err != nil {
			appendCommandLauncherDiagnostic(diagnostics, commandLauncherDiagnostic("formgen_render_failed", "warning", err.Error(), map[string]any{"command_id": descriptor.ID}))
			continue
		}
		formHTML, err := formRenderer.render(ctx, formSchema)
		if err != nil {
			appendCommandLauncherDiagnostic(diagnostics, commandLauncherDiagnostic("formgen_render_failed", "warning", err.Error(), map[string]any{"command_id": descriptor.ID}))
			continue
		}
		confirmText := ""
		if descriptor.Mutating {
			confirmText = fmt.Sprintf("Run %s?", commandLauncherLabel(descriptor))
		}
		actions = append(actions, debugregistry.PanelUIAction{
			ID:              actionID,
			Label:           commandLauncherLabel(descriptor),
			SubmitLabel:     "Run command",
			Kind:            "command",
			ConfirmText:     confirmText,
			RequiresConfirm: descriptor.Mutating,
			Refresh:         true,
			UpdatePolicy:    "append",
			Payload: map[string]any{
				"command_id": descriptor.ID,
				"payload":    map[string]any{},
				"options": map[string]any{
					"mode": descriptor.ExecutionMode,
				},
			},
			Form: &debugregistry.PanelUIActionForm{
				Renderer:     "formgen",
				OperationID:  formSchema.OperationID,
				HTML:         string(formHTML),
				ModelVersion: "go-formgen/v1",
				Sensitive:    formSchema.Sensitive,
			},
		})
	}
	return actions
}

func commandLauncherActionHandlers(adm *Admin) map[string]debugregistry.PanelActionHandler {
	if adm == nil || adm.commandCatalog == nil {
		return nil
	}
	handlers := map[string]debugregistry.PanelActionHandler{}
	descriptors, _ := uniqueCommandLauncherActionDescriptors(adm.commandCatalog.CommandDescriptors())
	for _, raw := range descriptors {
		descriptor := normalizeCommandLauncherDescriptor(raw)
		actionID := commandLauncherActionID(descriptor.ID)
		if actionID == "" {
			continue
		}
		commandID := descriptor.ID
		handlers[actionID] = func(ctx context.Context, req debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
			return runCommandLauncherAction(ctx, adm, commandID, req.Payload)
		}
	}
	if adm.commandOptionProvider != nil {
		handlers[commandLauncherResolveOptionsAction] = func(ctx context.Context, req debugregistry.PanelActionRequest) (debugregistry.PanelActionResult, error) {
			return runCommandLauncherOptionResolver(ctx, adm, req.Payload)
		}
	}
	return handlers
}

func commandLauncherOptionResolverAction() debugregistry.PanelUIAction {
	return debugregistry.PanelUIAction{
		ID:     commandLauncherResolveOptionsAction,
		Label:  "Resolve command options",
		Kind:   "command_options",
		Hidden: true,
	}
}

func runCommandLauncherOptionResolver(ctx context.Context, adm *Admin, payload map[string]any) (debugregistry.PanelActionResult, error) {
	if adm == nil || adm.commandOptionProvider == nil {
		return debugregistry.PanelActionResult{}, serviceNotConfiguredDomainError("command option provider", map[string]any{"component": "command_launcher"})
	}
	commandID := commandLauncherString(payload["command_id"])
	fieldPath := commandLauncherString(firstNonNil(payload["field_path"], payload["field_name"], payload["field_id"]))
	if commandID == "" || fieldPath == "" {
		return debugregistry.PanelActionResult{}, validationDomainError("command id and field path are required", map[string]any{
			"command_id": commandID,
			"field_path": fieldPath,
		})
	}

	state := buildCommandLauncherState(ctx, adm)
	descriptor := commandLauncherExecutableDescriptor(state.Executable, commandID)
	if descriptor == nil {
		return debugregistry.PanelActionResult{}, ErrForbidden
	}

	field := commandLauncherInputField(descriptor.Input.Fields, fieldPath)
	if field == nil || field.OptionSource == nil || strings.TrimSpace(field.OptionSource.ID) == "" {
		return debugregistry.PanelActionResult{}, validationDomainError("command field does not declare a dynamic option source", map[string]any{
			"command_id": commandID,
			"field_path": fieldPath,
		})
	}
	if requestedSource := commandLauncherString(payload["source_id"]); requestedSource != "" && requestedSource != strings.TrimSpace(field.OptionSource.ID) {
		return debugregistry.PanelActionResult{}, validationDomainError("command option source does not match the registered descriptor", map[string]any{
			"command_id":          commandID,
			"field_path":          fieldPath,
			"requested_source_id": requestedSource,
		})
	}

	currentPayload := commandLauncherMap(payload["payload"])
	options, err := adm.commandOptionProvider.CommandOptions(ctx, gocommand.CommandOptionRequest{
		CommandID: commandID,
		FieldID:   field.ID,
		FieldName: field.Name,
		FieldPath: field.Path,
		Source:    *field.OptionSource,
		Payload:   currentPayload,
	})
	if err != nil {
		return debugregistry.PanelActionResult{}, fmt.Errorf("resolve command options for %s.%s: %w", commandID, fieldPath, err)
	}
	items := commandLauncherPanelOptionItems(options)
	return debugregistry.PanelActionResult{
		OK:      true,
		Message: "Command options resolved",
		Data: map[string]any{
			"options":      commandLauncherOptionValues(options),
			"option_items": items,
			"empty":        len(items) == 0,
		},
	}, nil
}

func commandLauncherExecutableDescriptor(descriptors []gocommand.CommandDescriptor, commandID string) *gocommand.CommandDescriptor {
	for i := range descriptors {
		if descriptors[i].ID == commandID {
			return &descriptors[i]
		}
	}
	return nil
}

func commandLauncherInputField(fields []gocommand.CommandInputField, fieldPath string) *gocommand.CommandInputField {
	for i := range fields {
		if commandLauncherInputFieldMatches(fields[i], fieldPath) {
			return &fields[i]
		}
	}
	return nil
}

func commandLauncherInputFieldMatches(field gocommand.CommandInputField, fieldPath string) bool {
	return fieldPath == strings.TrimSpace(field.Path) ||
		fieldPath == strings.TrimSpace(field.Name) ||
		fieldPath == strings.TrimSpace(field.ID)
}

// commandStatusEventType is the debug WebSocket event type the command launcher
// subscribes to for live dispatch status (Phase 3, Option B).
const commandStatusEventType = "command_status"

// CommandStatusEvent is broadcast over the debug WebSocket when a command is
// dispatched or transitions state, so the launcher reflects live status across
// every connected debug client. Host queue/async workers may publish these
// directly (see Admin.PublishCommandStatus) to report true completion of queued
// commands, which core go-admin cannot observe on its own.
type CommandStatusEvent struct {
	CorrelationID   string `json:"correlation_id,omitempty"`
	DispatchID      string `json:"dispatch_id,omitempty"`
	CommandID       string `json:"command_id,omitempty"`
	State           string `json:"state"`
	Mode            string `json:"mode,omitempty"`
	Message         string `json:"message,omitempty"`
	Code            string `json:"code,omitempty"`
	StatusReference string `json:"status_reference,omitempty"`
	At              string `json:"at,omitempty"`
}

// PublishCommandStatus broadcasts a command status transition to connected debug
// clients over the debug WebSocket. The command launcher publishes dispatch-time
// states automatically; queue/async workers can call this when a queued command
// finishes so the launcher result panel updates live without a refresh.
func (a *Admin) PublishCommandStatus(event CommandStatusEvent) {
	if a == nil {
		return
	}
	collector := a.Debug()
	if collector == nil {
		return
	}
	if strings.TrimSpace(event.State) == "" {
		return
	}
	if strings.TrimSpace(event.At) == "" {
		event.At = time.Now().UTC().Format(time.RFC3339)
	}
	collector.PublishEvent(commandStatusEventType, event)
}

func runCommandLauncherAction(ctx context.Context, adm *Admin, commandID string, payload map[string]any) (debugregistry.PanelActionResult, error) {
	if adm == nil || adm.RPCServer() == nil {
		return debugregistry.PanelActionResult{}, serviceNotConfiguredDomainError("command launcher", map[string]any{"component": "command_launcher"})
	}
	state := buildCommandLauncherState(ctx, adm)
	var allowed bool
	for _, descriptor := range state.Executable {
		if descriptor.ID == commandID {
			allowed = true
			break
		}
	}
	if !allowed {
		return debugregistry.PanelActionResult{}, ErrForbidden
	}
	dispatchPayload := map[string]any{}
	dispatchIDs := []string{}
	dispatchOptions := gocommand.DispatchOptions{}
	if payload != nil {
		if nested, ok := payload["payload"].(map[string]any); ok {
			dispatchPayload = nested
		}
		dispatchIDs = commandLauncherStringList(payload["ids"])
		dispatchOptions = commandLauncherDispatchOptions(payload["options"])
	}
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			CommandID: commandID,
			Payload:   dispatchPayload,
			IDs:       dispatchIDs,
			Options:   dispatchOptions,
		},
	})
	if err != nil {
		return debugregistry.PanelActionResult{}, err
	}
	message, data := commandLauncherActionResultData(adm, commandID, result)
	return debugregistry.PanelActionResult{OK: true, Message: message, Data: data, Refresh: true}, nil
}

func commandLauncherActionResultData(adm *Admin, commandID string, result any) (string, any) {
	message := "Command dispatched"
	data := result
	response, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok {
		return message, data
	}
	if response.Data.Result != nil {
		message = "Command completed"
	}
	commandLauncherPublishDispatchStatus(adm, commandID, message, response.Data)
	return message, commandLauncherResponseData(response.Data)
}

func commandLauncherResponseData(response RPCCommandDispatchResponse) map[string]any {
	data := map[string]any{"receipt": response.Receipt}
	if response.Result != nil {
		data["result"] = response.Result
	}
	if response.StatusReference != "" {
		data["status_reference"] = response.StatusReference
	}
	if len(response.ValidationErrors) > 0 {
		data["validation_errors"] = response.ValidationErrors
	}
	return data
}

func commandLauncherPublishDispatchStatus(adm *Admin, commandID, message string, response RPCCommandDispatchResponse) {
	// Broadcast the dispatch-time status over the debug WebSocket so every
	// connected launcher reflects it live. Inline commands resolve to a terminal
	// state here; queued commands report "accepted" until a host worker updates.
	state := "accepted"
	switch {
	case response.Result != nil:
		state = "completed"
	case len(response.ValidationErrors) > 0 || !response.Receipt.Accepted:
		state = "failed"
	}
	adm.PublishCommandStatus(CommandStatusEvent{
		CorrelationID:   response.Receipt.CorrelationID,
		DispatchID:      response.Receipt.DispatchID,
		CommandID:       commandID,
		State:           state,
		Mode:            string(response.Receipt.Mode),
		Message:         message,
		StatusReference: response.StatusReference,
	})
}

func commandLauncherOptionValues(options []gocommand.CommandOption) []string {
	if len(options) == 0 {
		return nil
	}
	out := make([]string, 0, len(options))
	for _, option := range options {
		if value := strings.TrimSpace(option.Value); value != "" {
			out = append(out, value)
		}
	}
	return out
}

func commandLauncherPanelOptionItems(options []gocommand.CommandOption) []debugregistry.PanelUIActionOption {
	if len(options) == 0 {
		return nil
	}
	out := make([]debugregistry.PanelUIActionOption, 0, len(options))
	for _, option := range options {
		value := strings.TrimSpace(option.Value)
		if value == "" {
			continue
		}
		out = append(out, debugregistry.PanelUIActionOption{
			Value:       value,
			Label:       firstNonEmptyString(option.Label, value),
			Description: option.Description,
			Disabled:    option.Disabled,
			Metadata:    commandLauncherJSONSafeMap(option.Metadata),
		})
	}
	return out
}

func appendCommandLauncherDiagnostic(diagnostics *[]CommandLauncherDiagnostic, diagnostic CommandLauncherDiagnostic) {
	if diagnostics == nil {
		return
	}
	*diagnostics = append(*diagnostics, diagnostic)
}

func commandLauncherPresentationString(value any) string {
	switch typed := value.(type) {
	case string:
		if safe := commandLauncherSafeString(typed); safe != "" {
			return safe
		}
		return ""
	case fmt.Stringer:
		return commandLauncherSafeString(typed.String())
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return commandLauncherSafeString(fmt.Sprint(typed))
	default:
		return ""
	}
}

func commandLauncherPresentationBool(value any) (bool, bool) {
	switch typed := value.(type) {
	case bool:
		return typed, true
	case string:
		parsed, err := strconv.ParseBool(strings.TrimSpace(typed))
		return parsed, err == nil
	default:
		return false, false
	}
}

func commandLauncherJSONSafeMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := map[string]any{}
	for key, value := range input {
		key = commandLauncherSafeString(key)
		if key == "" {
			continue
		}
		if safe := commandLauncherJSONSafeValue(value); safe != nil {
			out[key] = safe
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func commandLauncherJSONSafeValue(value any) any {
	switch typed := value.(type) {
	case nil:
		return nil
	case bool, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return typed
	case float32:
		if math.IsNaN(float64(typed)) || math.IsInf(float64(typed), 0) {
			return nil
		}
		return typed
	case float64:
		if math.IsNaN(typed) || math.IsInf(typed, 0) {
			return nil
		}
		return typed
	case string:
		if safe := commandLauncherSafeString(typed); safe != "" {
			return safe
		}
		return nil
	case []string:
		return commandLauncherJSONSafeStringList(typed)
	case []any:
		return commandLauncherJSONSafeAnyList(typed)
	case map[string]any:
		return commandLauncherJSONSafeMap(typed)
	default:
		return nil
	}
}

func commandLauncherJSONSafeStringList(input []string) []any {
	out := make([]any, 0, len(input))
	for _, item := range input {
		if safe := commandLauncherSafeString(item); safe != "" {
			out = append(out, safe)
		}
	}
	return out
}

func commandLauncherJSONSafeAnyList(input []any) []any {
	out := make([]any, 0, len(input))
	for _, item := range input {
		if safe := commandLauncherJSONSafeValue(item); safe != nil {
			out = append(out, safe)
		}
	}
	return out
}

func commandLauncherSafeString(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || strings.ContainsAny(value, "<>") {
		return ""
	}
	return value
}

func commandLauncherStringList(value any) []string {
	switch typed := value.(type) {
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if item = strings.TrimSpace(item); item != "" {
				out = append(out, item)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := strings.TrimSpace(fmt.Sprint(item)); text != "" {
				out = append(out, text)
			}
		}
		return out
	default:
		return nil
	}
}

func commandLauncherDispatchOptions(value any) gocommand.DispatchOptions {
	raw, ok := value.(map[string]any)
	if !ok || len(raw) == 0 {
		return gocommand.DispatchOptions{}
	}
	opts := gocommand.DispatchOptions{
		Mode:           gocommand.ExecutionMode(commandLauncherString(raw["mode"])),
		IdempotencyKey: commandLauncherString(firstNonNil(raw["idempotency_key"], raw["idempotencyKey"])),
		DedupPolicy:    gocommand.DedupPolicy(commandLauncherString(firstNonNil(raw["dedup_policy"], raw["dedupPolicy"]))),
		CorrelationID:  commandLauncherString(firstNonNil(raw["correlation_id"], raw["correlationID"])),
		Metadata:       commandLauncherMap(raw["metadata"]),
	}
	if delay, ok := commandLauncherDuration(raw["delay"]); ok {
		opts.Delay = delay
	}
	if runAt, ok := commandLauncherTime(firstNonNil(raw["run_at"], raw["runAt"])); ok {
		opts.RunAt = &runAt
	}
	return opts
}

func commandLauncherString(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return ""
	}
}

func commandLauncherMap(value any) map[string]any {
	if typed, ok := value.(map[string]any); ok {
		out := make(map[string]any, len(typed))
		for key, item := range typed {
			if trimmed := strings.TrimSpace(key); trimmed != "" {
				out[trimmed] = item
			}
		}
		return out
	}
	return nil
}

func commandLauncherDuration(value any) (time.Duration, bool) {
	switch typed := value.(type) {
	case string:
		if strings.TrimSpace(typed) == "" {
			return 0, false
		}
		parsed, err := time.ParseDuration(strings.TrimSpace(typed))
		return parsed, err == nil
	case float64:
		return time.Duration(typed), true
	case int:
		return time.Duration(typed), true
	case int64:
		return time.Duration(typed), true
	default:
		return 0, false
	}
}

func commandLauncherTime(value any) (time.Time, bool) {
	raw := commandLauncherString(value)
	if raw == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return time.Time{}, false
	}
	return parsed, true
}

func firstNonNil(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func commandLauncherActionID(commandID string) string {
	commandID = strings.TrimSpace(commandID)
	if commandID == "" {
		return ""
	}
	return "dispatch_" + hex.EncodeToString([]byte(commandID))
}

func uniqueCommandLauncherActionDescriptors(input []gocommand.CommandDescriptor) ([]gocommand.CommandDescriptor, []CommandLauncherDiagnostic) {
	type actionIdentity struct {
		commandID string
		count     int
	}

	identities := make(map[string]actionIdentity, len(input))
	normalized := make([]gocommand.CommandDescriptor, 0, len(input))
	for _, raw := range input {
		descriptor := normalizeCommandLauncherDescriptor(raw)
		actionID := commandLauncherActionID(descriptor.ID)
		if actionID == "" {
			continue
		}
		identity := identities[actionID]
		identity.commandID = descriptor.ID
		identity.count++
		identities[actionID] = identity
		normalized = append(normalized, descriptor)
	}

	unique := make([]gocommand.CommandDescriptor, 0, len(normalized))
	diagnostics := make([]CommandLauncherDiagnostic, 0)
	reported := make(map[string]struct{})
	for _, descriptor := range normalized {
		actionID := commandLauncherActionID(descriptor.ID)
		identity := identities[actionID]
		if identity.count == 1 {
			unique = append(unique, descriptor)
			continue
		}
		if _, exists := reported[actionID]; exists {
			continue
		}
		reported[actionID] = struct{}{}
		diagnostics = append(diagnostics, commandLauncherDiagnostic(
			"duplicate_command_action_id",
			"error",
			"Command execution is disabled because the catalog contains duplicate command identity.",
			map[string]any{
				"command_id":      identity.commandID,
				"action_id":       actionID,
				"descriptor_count": identity.count,
			},
		))
	}
	return unique, diagnostics
}

func commandLauncherLabel(descriptor gocommand.CommandDescriptor) string {
	return firstNonEmptyString(descriptor.Label, descriptor.Summary, descriptor.ID)
}

func commandLauncherDiagnostic(code, severity, message string, metadata map[string]any) CommandLauncherDiagnostic {
	return CommandLauncherDiagnostic{
		Code:     code,
		Severity: severity,
		Message:  message,
		Metadata: metadata,
	}
}

func commandLauncherDoctorSeverity(severity string) DoctorSeverity {
	switch strings.ToLower(strings.TrimSpace(severity)) {
	case string(DoctorSeverityError):
		return DoctorSeverityError
	case string(DoctorSeverityInfo):
		return DoctorSeverityInfo
	case string(DoctorSeverityOK):
		return DoctorSeverityOK
	default:
		return DoctorSeverityWarn
	}
}
