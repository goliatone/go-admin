package admin

import "strings"

func hiddenRouteKeyField() Field {
	return Field{
		Name:   "route_key",
		Label:  "Route Key",
		Type:   "hidden",
		Hidden: true,
	}
}

func ensureFormField(fields []Field, field Field) []Field {
	target := strings.TrimSpace(field.Name)
	if target == "" {
		return fields
	}
	for _, existing := range fields {
		if strings.EqualFold(strings.TrimSpace(existing.Name), target) {
			return fields
		}
	}
	return append(fields, field)
}
