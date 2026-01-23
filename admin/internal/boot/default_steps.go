package boot

// DefaultBootSteps returns the built-in boot pipeline in registration order.
func DefaultBootSteps() []Step {
	return []Step{
		PrepareStep,
		HealthStep,
		PanelStep,
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
		MediaStep,
		NotificationsRouteStep,
		ActivityRouteStep,
		JobsStep,
		SettingsRouteStep,
		FeatureOverridesRouteStep,
	}
}
