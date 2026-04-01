package admin

import (
	"context"
	"sort"
	"strings"

	router "github.com/goliatone/go-router"
)

// RegisterPanelTab attaches a tab to an existing or future panel.
func (a *Admin) RegisterPanelTab(panelName string, tab PanelTab) error {
	if a.registry == nil {
		return serviceNotConfiguredDomainError("registry", map[string]any{
			"component": "admin",
		})
	}
	if a.panelTabCollisionHandler == nil {
		return a.registry.RegisterPanelTab(panelName, tab)
	}

	tabID := strings.TrimSpace(tab.ID)
	if tabID == "" {
		tabID = derivePanelTabID(tab)
		tab.ID = tabID
	}
	if tabID == "" {
		return requiredFieldDomainError("panel tab id", map[string]any{
			"component": "admin",
		})
	}

	for _, existing := range a.registry.PanelTabs(panelName) {
		if existing.ID != tabID {
			continue
		}
		chosen, err := a.resolvePanelTabCollision(panelName, existing, tab)
		if err != nil {
			return err
		}
		chosen.ID = tabID
		chosen = normalizePanelTab(chosen)
		return a.registry.SetPanelTab(panelName, chosen)
	}

	return a.registry.RegisterPanelTab(panelName, tab)
}

// WithPanelTabPermissionEvaluator sets a custom permission evaluator for tabs.
func (a *Admin) WithPanelTabPermissionEvaluator(fn PanelTabPermissionEvaluator) *Admin {
	a.panelTabPermissionEvaluator = fn
	return a
}

// WithPanelTabCollisionHandler sets a collision handler for tab registrations.
func (a *Admin) WithPanelTabCollisionHandler(fn PanelTabCollisionHandler) *Admin {
	a.panelTabCollisionHandler = fn
	return a
}

func (a *Admin) resolvePanelTabs(ctx AdminContext, panelName string) ([]PanelTab, error) {
	if a == nil || a.registry == nil {
		return nil, nil
	}
	ownerTabs := []PanelTab{}
	if panel, ok := a.registry.Panel(panelName); ok && panel != nil {
		ownerTabs = append(ownerTabs, panel.tabs...)
	}
	registryTabs := a.registry.PanelTabs(panelName)
	return a.mergePanelTabs(ctx, panelName, ownerTabs, registryTabs)
}

// ResolvePanelTabs returns the effective tabs for a panel using the provided admin context.
func (a *Admin) ResolvePanelTabs(ctx AdminContext, panelName string) ([]PanelTab, error) {
	if a == nil {
		return nil, nil
	}
	if ctx.Context == nil {
		ctx.Context = context.Background()
	}
	if ctx.Translator == nil {
		ctx.Translator = a.translator
	}
	return a.resolvePanelTabs(a.withTheme(ctx), panelName)
}

// ResolvePanelTabsFromRequest resolves panel tabs using request-derived context and permissions.
func (a *Admin) ResolvePanelTabsFromRequest(c router.Context, panelName, locale string) ([]PanelTab, error) {
	if a == nil || c == nil {
		return nil, nil
	}
	return a.ResolvePanelTabs(a.adminContextFromRequest(c, locale), panelName)
}

func (a *Admin) mergePanelTabs(ctx AdminContext, panelName string, groups ...[]PanelTab) ([]PanelTab, error) {
	byID := map[string]PanelTab{}
	for _, group := range groups {
		for _, tab := range group {
			normalized := normalizePanelTab(tab)
			if normalized.ID == "" {
				continue
			}
			if !a.panelTabAllowed(ctx, normalized, panelName) {
				continue
			}
			if existing, ok := byID[normalized.ID]; ok {
				chosen, err := a.resolvePanelTabCollision(panelName, existing, normalized)
				if err != nil {
					return nil, err
				}
				chosen.ID = normalized.ID
				chosen = normalizePanelTab(chosen)
				if !a.panelTabAllowed(ctx, chosen, panelName) {
					continue
				}
				byID[normalized.ID] = chosen
				continue
			}
			byID[normalized.ID] = normalized
		}
	}
	if len(byID) == 0 {
		return nil, nil
	}
	out := make([]PanelTab, 0, len(byID))
	for _, tab := range byID {
		out = append(out, tab)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Position == out[j].Position {
			return out[i].ID < out[j].ID
		}
		return out[i].Position < out[j].Position
	})
	out = prependImplicitDetailTab(out)
	return out, nil
}

func normalizePanelTab(tab PanelTab) PanelTab {
	if strings.TrimSpace(tab.ID) == "" {
		tab.ID = derivePanelTabID(tab)
	}
	if tab.Scope == "" {
		tab.Scope = PanelTabScopeList
	}
	if len(tab.Contexts) == 0 {
		tab.Contexts = []string{string(tab.Scope)}
	}
	return tab
}

func prependImplicitDetailTab(tabs []PanelTab) []PanelTab {
	if len(tabs) == 0 {
		return tabs
	}
	firstDetailIdx := -1
	for i := range tabs {
		if strings.EqualFold(strings.TrimSpace(tabs[i].ID), "details") {
			return tabs
		}
		if panelTabMatchesContext(tabs[i], string(PanelTabScopeDetail)) && firstDetailIdx == -1 {
			firstDetailIdx = i
		}
	}
	if firstDetailIdx == -1 {
		return tabs
	}
	details := normalizePanelTab(PanelTab{
		ID:       "details",
		Label:    "Details",
		Scope:    PanelTabScopeDetail,
		Contexts: []string{string(PanelTabScopeDetail)},
	})
	out := make([]PanelTab, 0, len(tabs)+1)
	out = append(out, tabs[:firstDetailIdx]...)
	out = append(out, details)
	out = append(out, tabs[firstDetailIdx:]...)
	return out
}

func panelTabMatchesContext(tab PanelTab, context string) bool {
	context = strings.ToLower(strings.TrimSpace(context))
	if context == "" {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(string(tab.Scope)), context) {
		return true
	}
	for _, candidate := range tab.Contexts {
		if strings.EqualFold(strings.TrimSpace(candidate), context) {
			return true
		}
	}
	return false
}

func (a *Admin) panelTabAllowed(ctx AdminContext, tab PanelTab, panelName string) bool {
	if a == nil {
		return false
	}
	if a.panelTabPermissionEvaluator != nil {
		return a.panelTabPermissionEvaluator(ctx, tab, panelName)
	}
	perm := strings.TrimSpace(tab.Permission)
	if perm == "" {
		return true
	}
	return permissionAllowed(a.authorizer, ctx.Context, perm, "navigation")
}

func (a *Admin) resolvePanelTabCollision(panelName string, existing PanelTab, incoming PanelTab) (PanelTab, error) {
	if a != nil && a.panelTabCollisionHandler != nil {
		return a.panelTabCollisionHandler(panelName, existing, incoming)
	}
	a.loggerFor("admin.tabs").Warn("panel tab collision",
		"panel", panelName,
		"id", existing.ID,
		"existing_label", existing.Label,
		"incoming_label", incoming.Label)
	return existing, nil
}
