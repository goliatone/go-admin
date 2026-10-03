package data

import "slices"

func validateExploreColumns(columns []ExploreField) error {
	if len(columns) > 32 {
		return Error(CodeProvider)
	}
	ids := map[string]bool{}
	for _, c := range columns {
		if !exploreID(c.ID) || ids[c.ID] || !slices.Contains([]string{"string", "integer", "number", "boolean", "date", "datetime"}, c.Type) {
			return Error(CodeProvider)
		}
		ids[c.ID] = true
	}
	return nil
}
