package contracts

import "strings"

// CMSContentListOption represents list option tokens understood by go-cms List.
// It is a string alias so options can be forwarded without importing go-cms internals.
type CMSContentListOption = string

const ContentListWithTranslations CMSContentListOption = "content:list:with_translations"
const ContentListWithDerivedFields CMSContentListOption = "content:list:projection:derived_fields"
const ContentListWithLocaleVariants CMSContentListOption = "content:list:with_locale_variants"
const contentListContentTypePrefix CMSContentListOption = "content:list:content_type:"
const contentListFamilyPrefix CMSContentListOption = "content:list:family:"
const contentListFamiliesPrefix CMSContentListOption = "content:list:families:"

func WithTranslations() CMSContentListOption {
	return ContentListWithTranslations
}

func WithDerivedFields() CMSContentListOption {
	return ContentListWithDerivedFields
}

func WithLocaleVariants() CMSContentListOption {
	return ContentListWithLocaleVariants
}

func WithContentTypeID(id string) CMSContentListOption {
	if id == "" {
		return ""
	}
	return contentListContentTypePrefix + id
}

func WithFamilyID(id string) CMSContentListOption {
	if id == "" {
		return ""
	}
	return contentListFamilyPrefix + id
}

func WithFamilyIDs(ids ...string) CMSContentListOption {
	values := make([]string, 0, len(ids))
	seen := map[string]struct{}{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		key := strings.ToLower(id)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		values = append(values, id)
	}
	if len(values) == 0 {
		return ""
	}
	return contentListFamiliesPrefix + strings.Join(values, ",")
}
