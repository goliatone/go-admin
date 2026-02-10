package admin

// RegisterTranslationQueueTabs attaches translation queue tabs to pages/posts detail views.
func RegisterTranslationQueueTabs(admin *Admin) error {
	if admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "translation_queue_tabs"})
	}

	tab := PanelTab{
		ID:         "translations",
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

	for _, panelName := range []string{"pages", "posts"} {
		if err := admin.RegisterPanelTab(panelName, tab); err != nil {
			return err
		}
	}
	return nil
}
