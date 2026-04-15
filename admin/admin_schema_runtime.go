package admin

import urlkit "github.com/goliatone/go-urlkit"

func (a *Admin) decorateSchema(schema *Schema, panelName string) {
	if schema == nil {
		return
	}
	if featureEnabled(a.featureGate, FeatureExport) {
		exportURL := resolveURLWith(a.urlManager, "admin", "exports", nil, nil)
		schema.Export = &ExportConfig{
			Definition: panelName,
			Endpoint:   exportURL,
		}
	}
	if featureEnabled(a.featureGate, FeatureBulk) && a.bulkSvc != nil {
		bulkURL := resolveURLWith(a.urlManager, adminAPIGroupName(a.config), "bulk", nil, nil)
		schema.Bulk = &BulkConfig{
			Endpoint:         bulkURL,
			SupportsRollback: supportsBulkRollback(a.bulkSvc),
		}
	}
	if featureEnabled(a.featureGate, FeatureMedia) && a.mediaLibrary != nil {
		schema.Media = a.resolveMediaSchemaConfig()
		applyMediaHints(schema, schema.Media)
	}
}

func (a *Admin) resolveMediaSchemaConfig() *MediaConfig {
	if a == nil {
		return nil
	}
	apiGroup := adminAPIGroupName(a.config)
	return &MediaConfig{
		LibraryPath:      resolveURLWith(a.urlManager, apiGroup, "media.library", nil, nil),
		ItemPath:         mediaItemSchemaPath(a.urlManager, apiGroup),
		ResolvePath:      resolveURLWith(a.urlManager, apiGroup, "media.resolve", nil, nil),
		UploadPath:       resolveURLWith(a.urlManager, apiGroup, "media.upload", nil, nil),
		PresignPath:      resolveURLWith(a.urlManager, apiGroup, "media.presign", nil, nil),
		ConfirmPath:      resolveURLWith(a.urlManager, apiGroup, "media.confirm", nil, nil),
		CapabilitiesPath: resolveURLWith(a.urlManager, apiGroup, "media.capabilities", nil, nil),
		DefaultValueMode: MediaValueModeURL,
	}
}

func mediaItemSchemaPath(urls urlkit.Resolver, apiGroup string) string {
	if path := routePathRaw(urls, apiGroup, "media.item"); path != "" {
		return path
	}
	return resolveURLWith(urls, apiGroup, "media.item", map[string]any{"id": ":id"}, nil)
}

func (a *Admin) decorateSchemaFor(ctx AdminContext, schema *Schema, panelName string) error {
	if schema == nil {
		return nil
	}
	a.decorateSchema(schema, panelName)
	tabs, err := a.resolvePanelTabs(ctx, panelName)
	if err != nil {
		return err
	}
	if len(tabs) > 0 {
		schema.Tabs = tabs
	} else {
		schema.Tabs = nil
	}

	if ctx.Translator != nil && ctx.Locale != "" {
		a.translateSchema(ctx, schema)
	}

	return nil
}

func (a *Admin) translateSchema(ctx AdminContext, schema *Schema) {
	t := ctx.Translator
	locale := ctx.Locale

	translate := func(label, key string) string {
		if key == "" {
			return label
		}
		res, err := t.Translate(locale, key)
		if err != nil || res == "" || res == key {
			return label
		}
		return res
	}

	translateField := func(f *Field) {
		f.Label = translate(f.Label, f.LabelKey)
		for i := range f.Options {
			f.Options[i].Label = translate(f.Options[i].Label, f.Options[i].LabelKey)
		}
	}

	for i := range schema.ListFields {
		translateField(&schema.ListFields[i])
	}
	for i := range schema.FormFields {
		translateField(&schema.FormFields[i])
	}
	for i := range schema.DetailFields {
		translateField(&schema.DetailFields[i])
	}
	for i := range schema.Filters {
		schema.Filters[i].Label = translate(schema.Filters[i].Label, schema.Filters[i].LabelKey)
	}
	for i := range schema.Actions {
		schema.Actions[i].Label = translate(schema.Actions[i].Label, schema.Actions[i].LabelKey)
	}
	for i := range schema.BulkActions {
		schema.BulkActions[i].Label = translate(schema.BulkActions[i].Label, schema.BulkActions[i].LabelKey)
	}
	for i := range schema.Tabs {
		schema.Tabs[i].Label = translate(schema.Tabs[i].Label, schema.Tabs[i].LabelKey)
	}
}
