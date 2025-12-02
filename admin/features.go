package admin

import (
	"errors"
	"fmt"
	"sort"
	"strings"
)

// FeatureKey enumerates supported feature flag keys.
type FeatureKey string

const (
	FeatureDashboard     FeatureKey = "dashboard"
	FeatureSearch        FeatureKey = "search"
	FeatureExport        FeatureKey = "export"
	FeatureCMS           FeatureKey = "cms"
	FeatureJobs          FeatureKey = "jobs"
	FeatureCommands      FeatureKey = "commands"
	FeatureSettings      FeatureKey = "settings"
	FeatureNotifications FeatureKey = "notifications"
	FeatureMedia         FeatureKey = "media"
	FeatureBulk          FeatureKey = "bulk"
)

// Features captures typed feature toggles used across the admin surface.
type Features struct {
	Dashboard     bool
	Search        bool
	Export        bool
	CMS           bool
	Jobs          bool
	Commands      bool
	Settings      bool
	Notifications bool
	Media         bool
	Bulk          bool
}

// flagMap returns the typed feature toggles as a string-keyed map.
func (f Features) flagMap() map[string]bool {
	return map[string]bool{
		string(FeatureDashboard):     f.Dashboard,
		string(FeatureSearch):        f.Search,
		string(FeatureExport):        f.Export,
		string(FeatureCMS):           f.CMS,
		string(FeatureJobs):          f.Jobs,
		string(FeatureCommands):      f.Commands,
		string(FeatureSettings):      f.Settings,
		string(FeatureNotifications): f.Notifications,
		string(FeatureMedia):         f.Media,
		string(FeatureBulk):          f.Bulk,
	}
}

// applyLegacy merges legacy boolean fields into the typed feature struct.
func (f Features) applyLegacy(cfg Config) Features {
	if cfg.EnableDashboard {
		f.Dashboard = true
	}
	if cfg.EnableSearch {
		f.Search = true
	}
	if cfg.EnableExport {
		f.Export = true
	}
	if cfg.EnableCMS {
		f.CMS = true
	}
	if cfg.EnableJobs {
		f.Jobs = true
	}
	if cfg.EnableCommands {
		f.Commands = true
	}
	if cfg.EnableSettings {
		f.Settings = true
	}
	if cfg.EnableNotifications {
		f.Notifications = true
	}
	if cfg.FeatureFlags != nil {
		if enabled, ok := cfg.FeatureFlags[string(FeatureMedia)]; ok && enabled {
			f.Media = true
		}
		if enabled, ok := cfg.FeatureFlags[string(FeatureBulk)]; ok && enabled {
			f.Bulk = true
		}
	}
	return f
}

// mergedFlags combines typed features with user-provided flag overrides.
func (f Features) mergedFlags(overrides map[string]bool) map[string]bool {
	flags := f.flagMap()
	for k, v := range overrides {
		if current, ok := flags[k]; ok {
			if !current && v {
				flags[k] = true
			}
			continue
		}
		flags[k] = v
	}
	return flags
}

// FeatureGates evaluates feature enablement consistently across handlers.
type FeatureGates struct {
	flags map[string]bool
}

// NewFeatureGates constructs a feature gate set from a map of flags.
func NewFeatureGates(flags map[string]bool) FeatureGates {
	cloned := map[string]bool{}
	for k, v := range flags {
		cloned[k] = v
	}
	return FeatureGates{flags: cloned}
}

// Enabled checks if a typed feature key is active.
func (g FeatureGates) Enabled(feature FeatureKey) bool {
	return g.flags[string(feature)]
}

// EnabledKey checks if an arbitrary string feature key is active.
func (g FeatureGates) EnabledKey(feature string) bool {
	return g.flags[feature]
}

// Require returns an error when a typed feature is disabled.
func (g FeatureGates) Require(feature FeatureKey) error {
	return g.RequireKey(string(feature))
}

// RequireKey returns an error when an arbitrary feature key is disabled.
func (g FeatureGates) RequireKey(feature string) error {
	if g.EnabledKey(feature) {
		return nil
	}
	return FeatureDisabledError{Feature: feature}
}

// Flags returns a shallow copy of the underlying flags map.
func (g FeatureGates) Flags() map[string]bool {
	out := map[string]bool{}
	for k, v := range g.flags {
		out[k] = v
	}
	return out
}

// ErrFeatureDisabled signals a disabled feature gate.
var ErrFeatureDisabled = errors.New("feature disabled")

// ErrInvalidFeatureConfig signals invalid or conflicting feature selections.
var ErrInvalidFeatureConfig = errors.New("invalid feature configuration")

// FeatureDisabledError includes the specific feature name and optional reason.
type FeatureDisabledError struct {
	Feature string
	Reason  string
}

func (e FeatureDisabledError) Error() string {
	if e.Reason != "" {
		return fmt.Sprintf("%s feature disabled: %s", e.Feature, e.Reason)
	}
	return fmt.Sprintf("%s feature disabled", e.Feature)
}

func (e FeatureDisabledError) Unwrap() error {
	return ErrFeatureDisabled
}

// FeatureDependencyError captures missing dependencies for an enabled feature.
type FeatureDependencyError struct {
	Feature string
	Missing []string
}

func (e FeatureDependencyError) Error() string {
	missing := append([]string{}, e.Missing...)
	sort.Strings(missing)
	return fmt.Sprintf("%s feature requires %s", e.Feature, strings.Join(missing, ", "))
}

func (e FeatureDependencyError) Unwrap() error {
	return ErrInvalidFeatureConfig
}

// InvalidFeatureConfigError aggregates dependency validation failures.
type InvalidFeatureConfigError struct {
	Issues []FeatureDependencyError
}

func (e InvalidFeatureConfigError) Error() string {
	if len(e.Issues) == 0 {
		return ErrInvalidFeatureConfig.Error()
	}
	parts := []string{}
	for _, issue := range e.Issues {
		parts = append(parts, issue.Error())
	}
	return fmt.Sprintf("feature configuration invalid: %s", strings.Join(parts, "; "))
}

func (e InvalidFeatureConfigError) Unwrap() error {
	return ErrInvalidFeatureConfig
}
