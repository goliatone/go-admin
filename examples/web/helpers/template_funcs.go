package helpers

import "github.com/goliatone/go-admin/quickstart"

// TemplateFuncOptions returns example-specific template function options.
func TemplateFuncOptions() []quickstart.TemplateFuncOption {
	return []quickstart.TemplateFuncOption{
		quickstart.WithWidgetTitleOverrides(map[string]string{
			UserProfileWidgetCode:  UserProfileWidgetLabel,
			UserActivityWidgetCode: UserActivityWidgetLabel,
		}),
	}
}
