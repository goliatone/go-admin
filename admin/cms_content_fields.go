package admin

import "strings"

// MergeCMSMarkdownDerivedFields projects canonical top-level content fields from
// markdown/frontmatter/custom payloads when those fields are missing.
func MergeCMSMarkdownDerivedFields(values map[string]any) {
	if values == nil {
		return
	}
	setCMSFieldIfMissing(values, "summary", firstNonEmptyCMSString(values["excerpt"]))
	setCMSFieldIfMissing(values, "excerpt", firstNonEmptyCMSString(values["summary"]))
	baseSEO := firstNonEmptyCMSMap(values["seo"])
	setCMSFieldIfMissing(values, "meta_title", firstNonEmptyCMSString(baseSEO["title"]))
	setCMSFieldIfMissing(values, "meta_description", firstNonEmptyCMSString(baseSEO["description"]))

	markdown := cmsFieldsMap(values["markdown"])
	if len(markdown) == 0 {
		return
	}
	custom := cmsFieldsMap(markdown["custom"])
	frontmatter := cmsFieldsMap(markdown["frontmatter"])
	nestedFrontmatter := map[string]any{}
	if nestedMarkdown := cmsFieldsMap(custom["markdown"]); len(nestedMarkdown) > 0 {
		nestedFrontmatter = cmsFieldsMap(nestedMarkdown["frontmatter"])
	}

	setCMSFieldIfMissing(values, "content", firstNonEmptyCMSString(markdown["body"]))
	setCMSFieldIfMissing(values, "summary",
		firstNonEmptyCMSString(
			values["excerpt"],
			custom["summary"],
			frontmatter["summary"],
			nestedFrontmatter["summary"],
		),
	)
	setCMSFieldIfMissing(values, "excerpt",
		firstNonEmptyCMSString(
			values["summary"],
			custom["summary"],
			frontmatter["summary"],
			nestedFrontmatter["summary"],
		),
	)
	setCMSFieldIfMissing(values, "path",
		firstNonEmptyCMSString(
			custom["path"],
			frontmatter["path"],
			nestedFrontmatter["path"],
		),
	)
	setCMSFieldIfMissing(values, "published_at",
		firstNonEmptyCMSString(
			custom["published_at"],
			frontmatter["published_at"],
			nestedFrontmatter["published_at"],
		),
	)
	setCMSFieldIfMissing(values, "featured_image",
		firstNonEmptyCMSString(
			custom["featured_image"],
			frontmatter["featured_image"],
			nestedFrontmatter["featured_image"],
		),
	)
	setCMSFieldIfMissing(values, "meta", firstNonEmptyCMSValue(custom["meta"]))
	setCMSFieldIfMissing(values, "tags",
		firstNonEmptyCMSValue(
			custom["tags"],
			frontmatter["tags"],
			nestedFrontmatter["tags"],
		),
	)
	setCMSFieldIfMissing(values, "template_id",
		firstNonEmptyCMSString(
			custom["template_id"],
			frontmatter["template_id"],
			nestedFrontmatter["template_id"],
		),
	)
	setCMSFieldIfMissing(values, "parent_id",
		firstNonEmptyCMSString(
			custom["parent_id"],
			frontmatter["parent_id"],
			nestedFrontmatter["parent_id"],
		),
	)
	setCMSFieldIfMissing(values, "blocks",
		firstNonEmptyCMSValue(
			custom["blocks"],
			frontmatter["blocks"],
			nestedFrontmatter["blocks"],
		),
	)

	seoMap := firstNonEmptyCMSMap(
		values["seo"],
		custom["seo"],
		frontmatter["seo"],
		nestedFrontmatter["seo"],
	)
	setCMSFieldIfMissing(values, "seo", seoMap)
	setCMSFieldIfMissing(values, "meta_title",
		firstNonEmptyCMSString(
			custom["meta_title"],
			frontmatter["meta_title"],
			nestedFrontmatter["meta_title"],
			seoMap["title"],
		),
	)
	setCMSFieldIfMissing(values, "meta_description",
		firstNonEmptyCMSString(
			custom["meta_description"],
			frontmatter["meta_description"],
			nestedFrontmatter["meta_description"],
			seoMap["description"],
		),
	)
}

func cmsFieldsMap(value any) map[string]any {
	mapped, ok := value.(map[string]any)
	if !ok || len(mapped) == 0 {
		return nil
	}
	return mapped
}

func firstNonEmptyCMSString(values ...any) string {
	for _, value := range values {
		if text := strings.TrimSpace(toString(value)); text != "" {
			return text
		}
	}
	return ""
}

func firstNonEmptyCMSValue(values ...any) any {
	for _, value := range values {
		switch typed := value.(type) {
		case nil:
			continue
		case string:
			if strings.TrimSpace(typed) == "" {
				continue
			}
			return typed
		case []string:
			if len(typed) == 0 {
				continue
			}
			return append([]string{}, typed...)
		case []any:
			if len(typed) == 0 {
				continue
			}
			return append([]any{}, typed...)
		case map[string]any:
			if len(typed) == 0 {
				continue
			}
			return cloneAnyMap(typed)
		default:
			return typed
		}
	}
	return nil
}

func firstNonEmptyCMSMap(values ...any) map[string]any {
	for _, value := range values {
		if mapped := cmsFieldsMap(value); len(mapped) > 0 {
			return cloneAnyMap(mapped)
		}
	}
	return nil
}

func setCMSFieldIfMissing(values map[string]any, key string, value any) {
	if values == nil || strings.TrimSpace(key) == "" {
		return
	}
	if isEmptyCMSFieldValue(value) {
		return
	}
	if existing, ok := values[key]; ok && !isEmptyCMSFieldValue(existing) {
		return
	}
	values[key] = value
}

func isEmptyCMSFieldValue(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(typed) == ""
	case []string:
		return len(typed) == 0
	case []any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	default:
		return false
	}
}
