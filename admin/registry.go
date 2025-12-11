package admin

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
)

// Registry stores registered panels, modules, dashboard providers, and settings.
type Registry struct {
	mu                 sync.RWMutex
	panels             map[string]*Panel
	modules            []Module
	moduleIndex        map[string]Module
	dashboardProviders map[string]DashboardProviderSpec
	settings           map[string]SettingDefinition
}

// NewRegistry creates an empty registry.
func NewRegistry() *Registry {
	return &Registry{
		panels:             map[string]*Panel{},
		moduleIndex:        map[string]Module{},
		dashboardProviders: map[string]DashboardProviderSpec{},
		settings:           map[string]SettingDefinition{},
	}
}

// RegisterPanel stores a panel by name; duplicate names are rejected.
func (r *Registry) RegisterPanel(name string, panel *Panel) error {
	if panel == nil {
		return errors.New("panel cannot be nil")
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("panel name cannot be empty")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.panels[name]; exists {
		return fmt.Errorf("panel already registered: %s", name)
	}
	r.panels[name] = panel
	return nil
}

// Panels returns a copy of registered panels keyed by name.
func (r *Registry) Panels() map[string]*Panel {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make(map[string]*Panel, len(r.panels))
	for name, panel := range r.panels {
		out[name] = panel
	}
	return out
}

// Panel returns a single panel by name.
func (r *Registry) Panel(name string) (*Panel, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	panel, ok := r.panels[name]
	return panel, ok
}

// RegisterModule records a module in registration order; duplicate IDs are rejected.
func (r *Registry) RegisterModule(module Module) error {
	if module == nil {
		return errors.New("module cannot be nil")
	}
	manifest := module.Manifest()
	if manifest.ID == "" {
		return errors.New("module ID cannot be empty")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.moduleIndex[manifest.ID]; exists {
		return fmt.Errorf("module already registered: %s", manifest.ID)
	}
	r.modules = append(r.modules, module)
	r.moduleIndex[manifest.ID] = module
	return nil
}

// Modules returns modules in registration order.
func (r *Registry) Modules() []Module {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Module, 0, len(r.modules))
	out = append(out, r.modules...)
	return out
}

// Module returns a module by ID when present.
func (r *Registry) Module(id string) (Module, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	module, ok := r.moduleIndex[id]
	return module, ok
}

// RegisterDashboardProvider records a provider manifest for discovery/lookups.
func (r *Registry) RegisterDashboardProvider(spec DashboardProviderSpec) {
	if spec.Code == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.dashboardProviders[spec.Code] = spec
}

// DashboardProviders returns provider specs sorted by code.
func (r *Registry) DashboardProviders() []DashboardProviderSpec {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]DashboardProviderSpec, 0, len(r.dashboardProviders))
	for _, spec := range r.dashboardProviders {
		out = append(out, spec)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Code < out[j].Code
	})
	return out
}

// RegisterSetting tracks a setting definition for lookups.
func (r *Registry) RegisterSetting(def SettingDefinition) {
	if def.Key == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.settings[def.Key] = def
}

// Settings returns registered setting definitions sorted by key.
func (r *Registry) Settings() []SettingDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()
	keys := make([]string, 0, len(r.settings))
	for key := range r.settings {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]SettingDefinition, 0, len(keys))
	for _, key := range keys {
		out = append(out, r.settings[key])
	}
	return out
}
