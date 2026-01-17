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
	Enabled            bool
	ShellEnabled       bool
	AppEnabled         bool
	Permission         string
	ExecPermission     string
	ReadOnly           *bool
	AllowedRoles       []string
	AllowedIPs         []string
	ShellCommand       string
	ShellArgs          []string
	WorkingDir         string
	Environment        []string
	MaxSessionSeconds  int
	AppEvalTimeoutMs   int
	AppAllowedPackages []string
	OverrideStrategy   DebugREPLOverrideStrategy
	MaxSessionsPerUser int
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
		cfg.ReadOnly = BoolPtr(true)
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
func BoolPtr(value bool) *bool {
	return &value
}
