package admin

// CMSContentListOption represents list option tokens understood by go-cms List.
// It is a string alias so options can be forwarded without importing go-cms internals.
type CMSContentListOption = string

const cmsContentListWithTranslations CMSContentListOption = "content:list:with_translations"
const cmsContentListWithDerivedFields CMSContentListOption = "content:list:projection:derived_fields"

// WithTranslations requests that list operations preload translations for CMS content.
// This opt-in token mirrors the go-cms list option of the same name.
func WithTranslations() CMSContentListOption {
	return cmsContentListWithTranslations
}

// WithDerivedFields requests canonical top-level derived content fields from go-cms.
func WithDerivedFields() CMSContentListOption {
	return cmsContentListWithDerivedFields
}
