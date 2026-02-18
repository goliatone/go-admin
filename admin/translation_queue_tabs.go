package admin

import (
	"sort"
	"strings"
)

// RegisterTranslationQueueTabs attaches translation queue tabs to translation-enabled detail views.
func RegisterTranslationQueueTabs(admin *Admin) error {
	if admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "translation_queue_tabs"})
	}
	return registerTranslationQueueTabsForRegisteredPanels(admin)
}

func registerTranslationQueueTabsForRegisteredPanels(admin *Admin) error {
	if admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "translation_queue_tabs"})
	}
	if admin.registry == nil {
		return serviceNotConfiguredDomainError("registry", map[string]any{"component": "translation_queue_tabs"})
	}
	panelNames := make([]string, 0, len(admin.registry.Panels()))
	for panelName := range admin.registry.Panels() {
		panelNames = append(panelNames, panelName)
	}
	sort.Strings(panelNames)
	for _, panelName := range panelNames {
		panel, ok := admin.registry.Panel(panelName)
		if !ok || panel == nil {
			continue
		}
		if err := syncTranslationQueueTabForPanel(admin, panelName, panel); err != nil {
			return err
		}
	}
	return nil
}

func syncTranslationQueueTabForPanel(admin *Admin, panelName string, panel *Panel) error {
	if admin == nil || admin.registry == nil {
		return nil
	}
	if _, ok := admin.registry.Panel(translationQueuePanelID); !ok {
		return nil
	}
	if !panelSupportsTranslationQueueTab(panelName, panel) {
		return nil
	}
	if translationQueueTabAlreadyRegistered(admin, panelName) {
		return nil
	}
	return admin.RegisterPanelTab(panelName, translationQueuePanelTab())
}

func panelSupportsTranslationQueueTab(panelName string, panel *Panel) bool {
	if panel == nil {
		return false
	}
	normalizedPanelName := strings.TrimSpace(panelName)
	if normalizedPanelName == "" {
		return false
	}
	if strings.EqualFold(normalizedPanelName, translationQueuePanelID) {
		return false
	}
	_, hasCreateTranslation := panel.findAction(CreateTranslationKey)
	return hasCreateTranslation
}

func translationQueueTabAlreadyRegistered(admin *Admin, panelName string) bool {
	if admin == nil || admin.registry == nil {
		return false
	}
	for _, tab := range admin.registry.PanelTabs(panelName) {
		if strings.EqualFold(strings.TrimSpace(tab.Target.Type), "panel") &&
			strings.EqualFold(strings.TrimSpace(tab.Target.Panel), translationQueuePanelID) {
			return true
		}
	}
	return false
}

func translationQueuePanelTab() PanelTab {
	return PanelTab{
		ID:         "translations.queue",
		Label:      "Translations",
		LabelKey:   "panel.tab.translations",
		Permission: PermAdminTranslationsView,
		Scope:      PanelTabScopeDetail,
		Target: PanelTabTarget{
			Type:  "panel",
			Panel: translationQueuePanelID,
		},
		Filters: map[string]string{
			"translation_group_id": "{{record.translation_group_id}}",
		},
		Query: map[string]string{
			"entity_type": "{{panel.name}}",
		},
	}
}
