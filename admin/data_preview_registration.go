package admin

import "github.com/goliatone/go-admin/data"

// Preview management uses the same owned typed handler/result registration as
// Data queries. The handlers delegate to the service; no lifecycle Run is used.
func registerDataPreviewCommands(set *CommandRegistrationSet, service *data.Service) error {
	if err := registerExplorationQuery(set, service.PreviewCapabilities); err != nil {
		return err
	}
	if err := registerExplorationQuery(set, service.OpenApplicationPreview); err != nil {
		return err
	}
	if err := registerExplorationQuery(set, service.ApplicationPreviewSession); err != nil {
		return err
	}
	return registerExplorationQuery(set, service.CloseApplicationPreview)
}
