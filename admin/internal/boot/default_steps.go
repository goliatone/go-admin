package boot

// DefaultBootSteps returns the built-in boot pipeline in registration order.
func DefaultBootSteps() []Step {
	return []Step{
		PrepareStep,
		HealthStep,
		PanelStep,
		SchemaRegistryStep,
		IconsRouteStep,
		WidgetAreasStep,
		WidgetDefinitionsStep,
		DashboardProvidersStep,
		SettingsWidgetStep,
		ActivityWidgetStep,
		NotificationsWidgetStep,
		DashboardStep,
		NavigationStep,
		SearchStep,
		ExportRegistrarStep,
		BulkStep,
		UserImportRouteStep,
		TranslationExchangeRouteStep,
		TranslationQueueRouteStep,
		MediaStep,
		NotificationsRouteStep,
		ActivityRouteStep,
		JobsStep,
		SettingsRouteStep,
		WorkflowRouteStep,
		FeatureOverridesRouteStep,
	}
}
