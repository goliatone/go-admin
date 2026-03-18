package admin

import "strings"

const (
	debugReplDefaultPermission         = "admin.debug.repl"
	debugReplDefaultExecPermission     = "admin.debug.repl.exec"
	debugReplDefaultShellCommand       = "/bin/sh"
	debugReplDefaultMaxSessionSeconds  = 900
	debugReplDefaultAppEvalTimeoutMs   = 3000
	debugReplDefaultMaxSessionsPerUser = 2
)

// DebugREPLConfig controls shell + app console access.
type DebugREPLConfig struct {
	Enabled            bool                      `json:"enabled"`
	ShellEnabled       bool                      `json:"shell_enabled"`
	AppEnabled         bool                      `json:"app_enabled"`
	Permission         string                    `json:"permission"`
	ExecPermission     string                    `json:"exec_permission"`
	ReadOnly           *bool                     `json:"read_only"`
	AllowedRoles       []string                  `json:"allowed_roles"`
	AllowedIPs         []string                  `json:"allowed_i_ps"`
	ShellCommand       string                    `json:"shell_command"`
	ShellArgs          []string                  `json:"shell_args"`
	WorkingDir         string                    `json:"working_dir"`
	Environment        []string                  `json:"environment"`
	MaxSessionSeconds  int                       `json:"max_session_seconds"`
	AppEvalTimeoutMs   int                       `json:"app_eval_timeout_ms"`
	AppAllowedPackages []string                  `json:"app_allowed_packages"`
	OverrideStrategy   DebugREPLOverrideStrategy `json:"override_strategy"`
	MaxSessionsPerUser int                       `json:"max_sessions_per_user"`
}

func (cfg DebugREPLConfig) ReadOnlyEnabled() bool {
	if cfg.ReadOnly == nil {
		return true
	}
	return *cfg.ReadOnly
}

func normalizeDebugREPLConfig(cfg DebugREPLConfig) DebugREPLConfig {
	cfg.Permission = strings.TrimSpace(cfg.Permission)
	if cfg.Permission == "" {
		cfg.Permission = debugReplDefaultPermission
	}
	cfg.ExecPermission = strings.TrimSpace(cfg.ExecPermission)
	if cfg.ExecPermission == "" {
		cfg.ExecPermission = debugReplDefaultExecPermission
	}
	cfg.ShellCommand = strings.TrimSpace(cfg.ShellCommand)
	if cfg.ShellCommand == "" {
		cfg.ShellCommand = debugReplDefaultShellCommand
	}
	if cfg.MaxSessionSeconds <= 0 {
		cfg.MaxSessionSeconds = debugReplDefaultMaxSessionSeconds
	}
	if cfg.AppEvalTimeoutMs <= 0 {
		cfg.AppEvalTimeoutMs = debugReplDefaultAppEvalTimeoutMs
	}
	if cfg.ReadOnly == nil {
		cfg.ReadOnly = new(true)
	}
	if cfg.OverrideStrategy == nil {
		cfg.OverrideStrategy = DenyAllStrategy{}
	}
	if cfg.MaxSessionsPerUser <= 0 {
		cfg.MaxSessionsPerUser = debugReplDefaultMaxSessionsPerUser
	}
	cfg.AllowedRoles = normalizeDebugREPLList(cfg.AllowedRoles)
	cfg.AllowedIPs = normalizeDebugREPLList(cfg.AllowedIPs)
	cfg.AppAllowedPackages = normalizeDebugREPLList(cfg.AppAllowedPackages)
	return cfg
}

func normalizeDebugREPLList(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// BoolPtr returns a pointer to the provided boolean.
//
//go:fix inline
func BoolPtr(value bool) *bool {
	return new(value)
}
