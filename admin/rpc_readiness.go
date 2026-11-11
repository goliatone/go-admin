package admin

import (
	"context"
	"fmt"
	"reflect"
	"sort"
	"strings"

	cmdrpc "github.com/goliatone/go-command/rpc"
	router "github.com/goliatone/go-router"
)

// RPCExposureConfig describes the transport actually configured by the host.
// Configure it during startup. Snapshot must be side-effect free; nil means the
// transport cannot supply finalized mount evidence. It must never seal routes.
type RPCExposureConfig struct {
	Enabled          bool
	RequireAuth      bool
	DiscoveryEnabled bool
	InvokePath       string
	Snapshot         func() (router.RegistrationSnapshot, bool)
	MountError       string
}

type RPCReadinessState string

const (
	RPCReadinessDisabled     RPCReadinessState = "disabled"
	RPCReadinessPending      RPCReadinessState = "pending"
	RPCReadinessReady        RPCReadinessState = "ready"
	RPCReadinessInvalid      RPCReadinessState = "invalid"
	RPCReadinessUnverifiable RPCReadinessState = "unverifiable"
)

type RPCReadinessIssue struct {
	Code    string            `json:"code"`
	Target  string            `json:"target,omitempty"`
	State   RPCReadinessState `json:"state"`
	Message string            `json:"message"`
}

type RPCExposureReport struct {
	State     RPCReadinessState       `json:"state"`
	Ready     bool                    `json:"ready"`
	Issues    []RPCReadinessIssue     `json:"issues,omitempty"`
	Endpoints cmdrpc.ValidationReport `json:"endpoints"`
}

// ConfigureRPCExposure installs transport evidence without changing policy or
// mounting routes. Configure before serving; reports take an owned config copy.
func (a *Admin) ConfigureRPCExposure(cfg RPCExposureConfig) {
	a.rpcExposureMu.Lock()
	a.rpcExposure = cfg
	a.rpcExposureMu.Unlock()
}

// RPCExposureReadiness checks structure and wiring, never an actor's grants.
// Pending takes precedence until route finalization, even when issues are known.
// Endpoint permissions remain declarative; hosts still own endpoint guards.
func (a *Admin) RPCExposureReadiness() (report RPCExposureReport) {
	report.State = RPCReadinessDisabled
	if a == nil {
		return report
	}
	a.rpcExposureMu.RLock()
	cfg := a.rpcExposure
	a.rpcExposureMu.RUnlock()
	if !cfg.Enabled {
		return report
	}
	report.State = RPCReadinessReady
	add := func(code, target string, state RPCReadinessState, message string) {
		report.Issues = append(report.Issues, RPCReadinessIssue{code, target, state, message})
	}
	// An opaque host callback must not turn a diagnostics read into a panic.
	defer func() {
		if recover() != nil {
			add("rpc_readiness_unverifiable", "", RPCReadinessUnverifiable, "Host readiness evidence panicked.")
			report.State = RPCReadinessUnverifiable
		}
		sort.Slice(report.Issues, func(i, j int) bool {
			a, b := report.Issues[i], report.Issues[j]
			if a.Code != b.Code {
				return a.Code < b.Code
			}
			if a.Target != b.Target {
				return a.Target < b.Target
			}
			return a.Message < b.Message
		})
		if report.State != RPCReadinessPending {
			for _, issue := range report.Issues {
				if issue.State == RPCReadinessInvalid {
					report.State = RPCReadinessInvalid
					break
				}
				if issue.State == RPCReadinessUnverifiable {
					report.State = RPCReadinessUnverifiable
				}
			}
		}
		report.Ready = report.State == RPCReadinessReady
	}()
	if cfg.RequireAuth && rpcNil(a.authenticator) {
		add("rpc_authenticator_missing", "", RPCReadinessInvalid, "Configure an authenticator for protected RPC transport.")
	}
	rules := a.config.Commands.RPC
	intended := map[string]bool{}
	for name := range rules.Commands {
		intended[name] = true
	}
	if a.commandCatalog != nil {
		for _, descriptor := range a.commandCatalog.CommandDescriptors() {
			d := normalizeCommandLauncherDescriptor(descriptor)
			if d.ExposeInAdmin && d.ID != "" {
				intended[d.ID] = true
			}
		}
	}
	needsAuthz := cfg.DiscoveryEnabled
	needsExact := needsAuthz && rules.PermissionMode == RPCCommandPermissionModeExact
	for name := range intended {
		rule, ok := rules.ResolveRule(name)
		if !ok {
			add("rpc_command_rule_gaps", name, RPCReadinessInvalid, "Add an explicit RPC command rule or remove the exposure declaration.")
		}
		if !a.commandBus.CommandRegistration(name).CanDispatch() {
			add("command_registration_gaps", name, RPCReadinessInvalid, "Register a handler and named dispatcher for the intended command.")
		}
		if ok && cfg.RequireAuth {
			needsAuthz = true
		}
		if ok && !rule.AllowUnauthenticated {
			needsAuthz = true
			if !cfg.RequireAuth {
				add("rpc_authentication_not_enforced", name, RPCReadinessInvalid, "Protect the transport for commands requiring an authenticated actor.")
			}
		}
		if ok && (cfg.RequireAuth || !rule.AllowUnauthenticated) && (rule.PermissionMode == RPCCommandPermissionModeExact || rules.PermissionMode == RPCCommandPermissionModeExact) {
			needsExact = true
		}
	}
	if needsAuthz && rpcNil(a.authorizer) {
		add("rpc_authorizer_missing", "", RPCReadinessInvalid, "Configure an authorizer for protected RPC exposure.")
	}
	if needsExact && !rpcSupportsExactPermissions(a.authorizer) {
		add("rpc_exact_permission_resolver_missing", "", RPCReadinessInvalid, "Configure a resolved-permission provider; startup does not evaluate actor grants.")
	}
	if a.rpcServer == nil {
		add("rpc_server_missing", "", RPCReadinessInvalid, "Configure the RPC server.")
	} else {
		report.Endpoints = a.rpcServer.ValidateEndpoints()
		appendIssue := func(issue cmdrpc.ValidationIssue) {
			state := RPCReadinessInvalid
			if issue.Status == cmdrpc.ValidationUnverifiable {
				state = RPCReadinessUnverifiable
			}
			add("rpc_endpoint_"+issue.Code, issue.Method, state, issue.Message)
		}
		for _, endpoint := range report.Endpoints.Endpoints {
			for _, issue := range endpoint.Issues {
				appendIssue(issue)
			}
		}
		for _, issue := range report.Endpoints.RegistrationIssues {
			appendIssue(issue)
		}
	}
	if cfg.MountError != "" {
		add("rpc_mount_conflict", cfg.InvokePath, RPCReadinessInvalid, cfg.MountError)
	}
	if cfg.Snapshot == nil {
		add("rpc_mount_unverifiable", "", RPCReadinessUnverifiable, "Transport does not expose a route snapshot.")
		return
	}
	snapshot, available := cfg.Snapshot()
	if !available {
		add("rpc_mount_unverifiable", "", RPCReadinessUnverifiable, "Transport does not expose a route snapshot.")
		return
	}
	switch snapshot.State {
	case router.RegistrationCollecting, router.RegistrationFinalizing:
		report.State = RPCReadinessPending
		return
	case router.RegistrationSealed:
	default:
		add("rpc_mount_unverifiable", "", RPCReadinessUnverifiable, "Transport lifecycle state is unavailable.")
		return
	}
	if snapshot.StartupValidationError != "" {
		add("rpc_startup_rejected", "", RPCReadinessInvalid, "Router startup was rejected; correct the configuration and construct a new server.")
	}
	discovery := strings.TrimRight(cfg.InvokePath, "/") + "/endpoints"
	check := func(method router.HTTPMethod, path string, wanted bool) {
		count := 0
		for _, route := range snapshot.MountedRoutes {
			if route.Method == method && route.Path == path {
				count++
			}
		}
		if (wanted && count != 1) || (!wanted && count != 0) {
			add("rpc_mount_mismatch", string(method)+" "+path, RPCReadinessInvalid, fmt.Sprintf("Expected mounted=%t; found %d matching routes.", wanted, count))
		}
	}
	check(router.POST, cfg.InvokePath, true)
	check(router.GET, discovery, cfg.DiscoveryEnabled)
	for _, shadow := range router.AnalyzeRouteShadowsWithSemantics(snapshot.MountedRoutes, snapshot.MatchingSemantics) {
		if (shadow.Method == router.POST && shadow.Path == cfg.InvokePath) || (cfg.DiscoveryEnabled && shadow.Method == router.GET && shadow.Path == discovery) {
			add("rpc_mount_shadowed", shadow.Path, RPCReadinessInvalid, "RPC route is shadowed by "+shadow.ShadowedByPath)
		}
	}
	return
}

func rpcNil(value any) bool {
	if value == nil {
		return true
	}
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.Pointer, reflect.Interface, reflect.Func, reflect.Map, reflect.Slice, reflect.Chan:
		return v.IsNil()
	}
	return false
}

func rpcSupportsExactPermissions(authorizer Authorizer) bool {
	if rpcNil(authorizer) {
		return false
	}
	if builtin, ok := authorizer.(*GoAuthAuthorizer); ok {
		return builtin.resolvePerms != nil
	}
	_, ok := authorizer.(interface {
		ResolvedPermissions(context.Context) []string
	})
	return ok
}

// ValidateRPCExposure is the strict startup gate and shares its report with Doctor.
func (a *Admin) ValidateRPCExposure() error {
	report := a.RPCExposureReadiness()
	if report.State == RPCReadinessDisabled || report.Ready {
		return nil
	}
	return &RPCExposureError{Report: report}
}

type RPCExposureError struct{ Report RPCExposureReport }

func (e *RPCExposureError) Error() string {
	parts := []string{"RPC exposure " + string(e.Report.State)}
	for _, issue := range e.Report.Issues {
		parts = append(parts, issue.Code+" "+issue.Target+": "+issue.Message)
	}
	return strings.Join(parts, "; ")
}

// RegisterRPCExposureDoctorCheck reuses the same report as strict startup.
func RegisterRPCExposureDoctorCheck(a *Admin) {
	if a == nil {
		return
	}
	a.RegisterDoctorChecks(DoctorCheck{ID: "rpc_exposure", Label: "RPC exposure", Description: "Checks endpoint, command, policy and finalized transport wiring.", Run: func(_ context.Context, adm *Admin) DoctorCheckOutput {
		report := adm.RPCExposureReadiness()
		out := DoctorCheckOutput{Summary: "RPC exposure: " + string(report.State), Metadata: map[string]any{"report": report}}
		for _, issue := range report.Issues {
			severity := DoctorSeverityError
			if issue.State == RPCReadinessUnverifiable || report.State == RPCReadinessPending {
				severity = DoctorSeverityWarn
			}
			out.Findings = append(out.Findings, DoctorFinding{Severity: severity, Code: issue.Code, Component: "rpc", Message: issue.Message, Metadata: map[string]any{"target": issue.Target}})
		}
		if len(out.Findings) == 0 {
			severity := DoctorSeverityOK
			if report.State == RPCReadinessPending {
				severity = DoctorSeverityWarn
			}
			out.Findings = []DoctorFinding{{Severity: severity, Code: "rpc_exposure_" + string(report.State), Component: "rpc", Message: out.Summary}}
		}
		return out
	}})
}
