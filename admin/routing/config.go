package routing

import (
	"fmt"
	"slices"
	"strings"
)

var defaultReservedRoutePrefixes = []string{"/.well-known", "/assets", "/healthz", "/static", "/status"}

type ConflictPolicy string

const (
	ConflictPolicyError   ConflictPolicy = "error"
	ConflictPolicyWarn    ConflictPolicy = "warn"
	ConflictPolicyReplace ConflictPolicy = "replace"
)

type Config struct {
	Enabled                bool                    `json:"enabled"`
	EnforceRouteNamePolicy bool                    `json:"enforce_route_name_policy"`
	EnforceSlugPolicy      bool                    `json:"enforce_slug_policy"`
	ConflictPolicy         ConflictPolicy          `json:"conflict_policy"`
	ProtectedAppEnabled    bool                    `json:"protected_app_enabled,omitempty"`
	Roots                  RootsConfig             `json:"roots"`
	Modules                map[string]ModuleConfig `json:"modules"`
	Manifest               ManifestConfig          `json:"manifest"`
	ReservedPrefixes       []string                `json:"reserved_prefixes,omitempty"`
}

type RootsConfig struct {
	AdminRoot           string `json:"admin_root,omitempty"`
	APIRoot             string `json:"api_root,omitempty"`
	PublicAPIRoot       string `json:"public_api_root,omitempty"`
	ProtectedAppRoot    string `json:"protected_app_root,omitempty"`
	ProtectedAppAPIRoot string `json:"protected_app_api_root,omitempty"`
}

type ModuleConfig struct {
	Mount  ModuleMountOverride           `json:"mount"`
	Mounts map[string]NamedMountOverride `json:"mounts,omitempty"`
}

type NamedMountOverride struct {
	Surface   string `json:"surface"`
	Base      string `json:"base"`
	GroupPath string `json:"group_path,omitempty"`
}

type ModuleMountOverride struct {
	UIBase        string `json:"ui_base,omitempty"`
	APIBase       string `json:"api_base,omitempty"`
	PublicAPIBase string `json:"public_api_base,omitempty"`
}

type ManifestConfig struct {
	Enabled             bool `json:"enabled"`
	IncludeHostRoutes   bool `json:"include_host_routes"`
	IncludeModuleRoutes bool `json:"include_module_routes"`
	IncludeFallbacks    bool `json:"include_fallbacks"`
}

type URLNamespaceConfig struct {
	BasePath   string `json:"base_path"`
	APIPrefix  string `json:"api_prefix"`
	APIVersion string `json:"api_version"`
}

type URLConfig struct {
	Admin  URLNamespaceConfig `json:"admin"`
	Public URLNamespaceConfig `json:"public"`
}

type RootDerivationInput struct {
	BasePath            string    `json:"base_path"`
	URLs                URLConfig `json:"urls"`
	ProtectedAppEnabled bool      `json:"protected_app_enabled,omitempty"`
}

func DefaultConfig() Config {
	return Config{
		Enabled:                true,
		EnforceRouteNamePolicy: true,
		EnforceSlugPolicy:      true,
		ConflictPolicy:         ConflictPolicyError,
		Modules:                map[string]ModuleConfig{},
		Manifest: ManifestConfig{
			Enabled:             true,
			IncludeHostRoutes:   true,
			IncludeModuleRoutes: true,
			IncludeFallbacks:    true,
		},
	}
}

func NormalizeConfig(cfg Config, input RootDerivationInput) Config {
	cfg.Enabled = true
	cfg.EnforceRouteNamePolicy = true
	cfg.EnforceSlugPolicy = true
	if cfg.ConflictPolicy == "" {
		cfg.ConflictPolicy = ConflictPolicyError
	}
	cfg.ProtectedAppEnabled = cfg.ProtectedAppEnabled || input.ProtectedAppEnabled

	cfg.Roots = MergeRoots(DeriveDefaultRoots(input), NormalizeRoots(cfg.Roots))
	// Preserve colliding raw names long enough for NewPlanner to report them;
	// valid configurations retain the historical normalized Config contract.
	if err := validateNamedMountConfigNames(cfg.Modules); err == nil {
		cfg.Modules = normalizeModuleConfigs(cfg.Modules)
	}
	cfg.Manifest = normalizeManifestConfig(cfg.Manifest)
	cfg.ReservedPrefixes = normalizeFallbackPaths(append(append([]string{}, defaultReservedRoutePrefixes...), cfg.ReservedPrefixes...))

	return cfg
}

func MergeRoots(defaults, overrides RootsConfig) RootsConfig {
	merged := defaults
	if overrides.AdminRoot != "" {
		merged.AdminRoot = overrides.AdminRoot
	}
	if overrides.APIRoot != "" {
		merged.APIRoot = overrides.APIRoot
	}
	if overrides.PublicAPIRoot != "" {
		merged.PublicAPIRoot = overrides.PublicAPIRoot
	}
	if protectedAppRootsEnabled(defaults) && overrides.ProtectedAppRoot != "" {
		merged.ProtectedAppRoot = overrides.ProtectedAppRoot
	}
	if protectedAppRootsEnabled(defaults) && overrides.ProtectedAppAPIRoot != "" {
		merged.ProtectedAppAPIRoot = overrides.ProtectedAppAPIRoot
	}
	return merged
}

func protectedAppRootsEnabled(roots RootsConfig) bool {
	return roots.ProtectedAppRoot != "" || roots.ProtectedAppAPIRoot != ""
}

func normalizeManifestConfig(cfg ManifestConfig) ManifestConfig {
	cfg.Enabled = true
	cfg.IncludeHostRoutes = true
	cfg.IncludeModuleRoutes = true
	cfg.IncludeFallbacks = true
	return cfg
}

func normalizeModuleConfigs(cfg map[string]ModuleConfig) map[string]ModuleConfig {
	if len(cfg) == 0 {
		return map[string]ModuleConfig{}
	}

	out := make(map[string]ModuleConfig, len(cfg))
	for slug, module := range cfg {
		out[slug] = ModuleConfig{
			Mount:  NormalizeMountOverride(module.Mount),
			Mounts: normalizeNamedMountOverrides(module.Mounts),
		}
	}

	return out
}

func normalizeNamedMountOverrides(mounts map[string]NamedMountOverride) map[string]NamedMountOverride {
	if len(mounts) == 0 {
		return nil
	}
	out := make(map[string]NamedMountOverride, len(mounts))
	for name, mount := range mounts {
		out[NormalizeMountName(name)] = NamedMountOverride{
			Surface:   NormalizeRouteSurface(mount.Surface),
			Base:      normalizeAbsolutePath(mount.Base),
			GroupPath: strings.Trim(strings.TrimSpace(mount.GroupPath), "."),
		}
	}
	return out
}

func validateNamedMountConfigNames(modules map[string]ModuleConfig) error {
	moduleNames := make([]string, 0, len(modules))
	for moduleName := range modules {
		moduleNames = append(moduleNames, moduleName)
	}
	slices.Sort(moduleNames)
	for _, moduleName := range moduleNames {
		seen := map[string]string{}
		names := make([]string, 0, len(modules[moduleName].Mounts))
		for name := range modules[moduleName].Mounts {
			names = append(names, name)
		}
		slices.Sort(names)
		for _, name := range names {
			canonical := NormalizeMountName(name)
			if canonical == "" {
				return fmt.Errorf("module %q named mount name is required", moduleName)
			}
			if existing, ok := seen[canonical]; ok {
				return fmt.Errorf("module %q named mounts %q and %q normalize to the same name %q", moduleName, existing, name, canonical)
			}
			seen[canonical] = name
		}
	}
	return nil
}
