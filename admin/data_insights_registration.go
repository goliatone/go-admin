package admin

import "github.com/goliatone/go-admin/data"

// Insight reads share the Data module's owned query generation; close/replacement
// cannot remove another module's handlers, and no lifecycle claim is created.
func registerDataInsightsQueries(set *CommandRegistrationSet, service *data.Service) error {
	if err := registerExplorationQuery(set, service.ExploreInsights); err != nil {
		return err
	}
	return registerExplorationQuery(set, service.CompareSelections)
}
