package boot

// DefaultBootSteps returns the built-in boot pipeline in registration order.
func DefaultBootSteps() []Step {
	return []Step{
		PrepareStep,
		DynamicCMSReconcileStep,
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
		TranslationFamiliesRouteStep,
		TranslationExchangeRouteStep,
		TranslationQueueRouteStep,
		NotificationsRouteStep,
		ActivityRouteStep,
		JobsStep,
		SettingsRouteStep,
		FeatureOverridesRouteStep,
	}
}
