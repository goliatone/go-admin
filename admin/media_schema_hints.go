package admin

import "strings"

// ApplyMediaSchemaHints enriches plain JSON Schema media fields with the
// endpoint contract expected by go-formgen's media picker component.
func (a *Admin) ApplyMediaSchemaHints(schema map[string]any) int {
	if a == nil || schema == nil {
		return 0
	}
	if !featureEnabled(a.featureGate, FeatureMedia) || a.mediaLibrary == nil {
		return 0
	}
	return applyMediaSchemaHints(schema, a.resolveMediaSchemaConfig())
}

func applyMediaSchemaHints(schema map[string]any, media *MediaConfig) int {
	if schema == nil || media == nil || strings.TrimSpace(media.LibraryPath) == "" {
		return 0
	}
	return walkMediaSchemaProperties(schema, media)
}

func walkMediaSchemaProperties(schema map[string]any, media *MediaConfig) int {
	if schema == nil {
		return 0
	}
	enriched := 0
	props, _ := schema["properties"].(map[string]any)
	for _, raw := range props {
		prop, ok := raw.(map[string]any)
		if !ok || prop == nil {
			continue
		}
		if kind := detectMediaSchemaKind(prop); kind != "" {
			applyMediaSchemaPropertyHints(prop, media, kind)
			enriched++
		}
		if mediaSchemaHasObjectProperties(prop) {
			enriched += walkMediaSchemaProperties(prop, media)
			continue
		}
		if strings.EqualFold(strings.TrimSpace(toString(prop["type"])), "array") {
			items, _ := prop["items"].(map[string]any)
			if mediaSchemaHasObjectProperties(items) {
				enriched += walkMediaSchemaProperties(items, media)
			}
		}
	}
	return enriched
}

func mediaSchemaHasObjectProperties(schema map[string]any) bool {
	if schema == nil {
		return false
	}
	props, ok := schema["properties"].(map[string]any)
	return ok && len(props) > 0
}

func detectMediaSchemaKind(prop map[string]any) string {
	if prop == nil {
		return ""
	}
	for _, candidate := range mediaSchemaKindCandidates(prop) {
		if kind := canonicalMediaSchemaKind(candidate); kind != "" {
			if kind == "media-picker" && mediaSchemaIsGallery(prop) {
				return "media-gallery"
			}
			return kind
		}
	}
	if mediaSchemaHasAdminMedia(prop) {
		if mediaSchemaIsGallery(prop) {
			return "media-gallery"
		}
		return "media-picker"
	}
	return ""
}

func mediaSchemaKindCandidates(prop map[string]any) []string {
	if prop == nil {
		return nil
	}
	candidates := []string{
		toString(prop["x-formgen:widget"]),
		toString(prop["x-formgen-widget"]),
		toString(prop["x-admin:widget"]),
		toString(prop["x-admin-widget"]),
		toString(prop["x-formgen:type"]),
		toString(prop["x-admin:type"]),
		toString(prop["field_type"]),
		toString(prop["fieldType"]),
		toString(prop["widget"]),
	}
	if formgen, ok := prop["x-formgen"].(map[string]any); ok {
		candidates = append(candidates,
			toString(formgen["widget"]),
			toString(formgen["type"]),
			toString(formgen["component"]),
			toString(formgen["component.name"]),
		)
		if opts, ok := formgen["componentOptions"].(map[string]any); ok {
			candidates = append(candidates,
				toString(opts["variant"]),
				toString(opts["widget"]),
				toString(opts["type"]),
			)
		}
		if opts, ok := formgen["component.config"].(map[string]any); ok {
			candidates = append(candidates,
				toString(opts["variant"]),
				toString(opts["widget"]),
				toString(opts["type"]),
			)
		}
	}
	if adminMeta, ok := prop["x-admin"].(map[string]any); ok {
		candidates = append(candidates,
			toString(adminMeta["widget"]),
			toString(adminMeta["type"]),
			toString(adminMeta["field_type"]),
			toString(adminMeta["fieldType"]),
		)
		if mediaMeta, ok := adminMeta["media"].(map[string]any); ok {
			candidates = append(candidates,
				toString(mediaMeta["variant"]),
				toString(mediaMeta["widget"]),
				toString(mediaMeta["type"]),
				toString(mediaMeta["field_type"]),
				toString(mediaMeta["fieldType"]),
			)
		}
	}
	return candidates
}

func canonicalMediaSchemaKind(raw string) string {
	normalized := normalizeFieldTypeKey(raw)
	switch normalized {
	case "media", "media-picker":
		return "media-picker"
	case "media-gallery":
		return "media-gallery"
	case "file-upload", "file-uploader":
		return "file-upload"
	case "media-picker-gallery":
		return "media-gallery"
	default:
		return ""
	}
}

func mediaSchemaHasAdminMedia(prop map[string]any) bool {
	adminMeta, ok := prop["x-admin"].(map[string]any)
	if !ok || adminMeta == nil {
		return false
	}
	mediaMeta, ok := adminMeta["media"].(map[string]any)
	return ok && mediaMeta != nil
}

func mediaSchemaIsGallery(prop map[string]any) bool {
	if prop == nil {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(toString(prop["type"])), "array") {
		return true
	}
	formgen, _ := prop["x-formgen"].(map[string]any)
	if mediaSchemaOptionsMultiple(formgen) {
		return true
	}
	adminMeta, _ := prop["x-admin"].(map[string]any)
	if mediaSchemaOptionsMultiple(adminMeta) {
		return true
	}
	if mediaMeta, _ := adminMeta["media"].(map[string]any); mediaSchemaOptionsMultiple(mediaMeta) {
		return true
	}
	return false
}

func mediaSchemaOptionsMultiple(meta map[string]any) bool {
	if meta == nil {
		return false
	}
	if toBool(meta["multiple"]) {
		return true
	}
	if opts, ok := meta["componentOptions"].(map[string]any); ok && toBool(opts["multiple"]) {
		return true
	}
	if opts, ok := meta["component.config"].(map[string]any); ok && toBool(opts["multiple"]) {
		return true
	}
	return false
}

func applyMediaSchemaPropertyHints(prop map[string]any, media *MediaConfig, kind string) {
	if prop == nil || media == nil {
		return
	}
	if _, ok := prop["x-formgen:widget"]; !ok {
		switch kind {
		case "file-upload":
			prop["x-formgen:widget"] = "file_uploader"
		default:
			prop["x-formgen:widget"] = "media-picker"
		}
	}
	valueMode := applyFormgenMediaHints(prop, media, kind)
	if kind == "media-gallery" || mediaSchemaIsGallery(prop) {
		if formgenMeta, _ := prop["x-formgen"].(map[string]any); formgenMeta != nil {
			if componentOptions, _ := formgenMeta["componentOptions"].(map[string]any); componentOptions != nil {
				componentOptions["multiple"] = true
			}
		}
	}
	applyAdminMediaHints(prop, media, valueMode)
}
