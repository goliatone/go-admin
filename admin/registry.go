package admin

import (
	"log"
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
	panelTabs          map[string]map[string]PanelTab
}

// NewRegistry creates an empty registry.
func NewRegistry() *Registry {
	return &Registry{
		panels:             map[string]*Panel{},
		moduleIndex:        map[string]Module{},
		dashboardProviders: map[string]DashboardProviderSpec{},
		settings:           map[string]SettingDefinition{},
		panelTabs:          map[string]map[string]PanelTab{},
	}
}

// RegisterPanel stores a panel by name; duplicate names are rejected.
func (r *Registry) RegisterPanel(name string, panel *Panel) error {
	if panel == nil {
		return validationDomainError("panel cannot be nil", map[string]any{"field": "panel"})
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return requiredFieldDomainError("panel name", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.panels[name]; exists {
		return conflictDomainError("panel already registered", map[string]any{"panel": name})
	}
	r.panels[name] = panel
	return nil
}

// UnregisterPanel removes a panel by name and clears associated tab registrations.
func (r *Registry) UnregisterPanel(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return requiredFieldDomainError("panel name", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.panels[name]; !exists {
		return ErrNotFound
	}
	delete(r.panels, name)
	if r.panelTabs != nil {
		delete(r.panelTabs, name)
	}
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

// RegisterPanelTab records a panel tab for the named panel.
func (r *Registry) RegisterPanelTab(panelName string, tab PanelTab) error {
	panelName = strings.TrimSpace(panelName)
	if panelName == "" {
		return requiredFieldDomainError("panel name", nil)
	}
	tabID := strings.TrimSpace(tab.ID)
	if tabID == "" {
		tabID = derivePanelTabID(tab)
		tab.ID = tabID
	}
	if tabID == "" {
		return requiredFieldDomainError("panel tab id", nil)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.panelTabs == nil {
		r.panelTabs = map[string]map[string]PanelTab{}
	}
	panelTabs := r.panelTabs[panelName]
	if panelTabs == nil {
		panelTabs = map[string]PanelTab{}
		r.panelTabs[panelName] = panelTabs
	}
	if existing, exists := panelTabs[tabID]; exists {
		log.Printf("[admin] panel tab collision panel=%s id=%s existing_label=%s incoming_label=%s", panelName, tabID, existing.Label, tab.Label)
		return nil
	}
	panelTabs[tabID] = tab
	return nil
}

// SetPanelTab upserts a panel tab for the named panel.
func (r *Registry) SetPanelTab(panelName string, tab PanelTab) error {
	panelName = strings.TrimSpace(panelName)
	if panelName == "" {
		return requiredFieldDomainError("panel name", nil)
	}
	tabID := strings.TrimSpace(tab.ID)
	if tabID == "" {
		tabID = derivePanelTabID(tab)
		tab.ID = tabID
	}
	if tabID == "" {
		return requiredFieldDomainError("panel tab id", nil)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.panelTabs == nil {
		r.panelTabs = map[string]map[string]PanelTab{}
	}
	panelTabs := r.panelTabs[panelName]
	if panelTabs == nil {
		panelTabs = map[string]PanelTab{}
		r.panelTabs[panelName] = panelTabs
	}
	panelTabs[tabID] = tab
	return nil
}

// PanelTabs returns registered tabs for a panel, ordered by position then ID.
func (r *Registry) PanelTabs(panelName string) []PanelTab {
	panelName = strings.TrimSpace(panelName)
	if panelName == "" {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	panelTabs := r.panelTabs[panelName]
	if len(panelTabs) == 0 {
		return nil
	}
	out := make([]PanelTab, 0, len(panelTabs))
	for _, tab := range panelTabs {
		out = append(out, tab)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Position == out[j].Position {
			return out[i].ID < out[j].ID
		}
		return out[i].Position < out[j].Position
	})
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
		return validationDomainError("module cannot be nil", map[string]any{"field": "module"})
	}
	manifest := module.Manifest()
	if manifest.ID == "" {
		return requiredFieldDomainError("module id", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.moduleIndex[manifest.ID]; exists {
		return conflictDomainError("module already registered", map[string]any{"module": manifest.ID})
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
