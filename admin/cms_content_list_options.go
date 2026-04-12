package admin

import cmscontracts "github.com/goliatone/go-admin/admin/cms/contracts"

// CMSContentListOption represents list option tokens understood by go-cms List.
// It remains re-exported from the root package for compatibility.
type CMSContentListOption = cmscontracts.CMSContentListOption

const cmsContentListWithTranslations CMSContentListOption = cmscontracts.ContentListWithTranslations
const cmsContentListWithDerivedFields CMSContentListOption = cmscontracts.ContentListWithDerivedFields
const cmsContentListWithLocaleVariants CMSContentListOption = cmscontracts.ContentListWithLocaleVariants

// WithTranslations requests that list operations preload translations for CMS content.
// This opt-in token mirrors the go-cms list option of the same name.
func WithTranslations() CMSContentListOption {
	return cmscontracts.WithTranslations()
}

// WithDerivedFields requests canonical top-level derived content fields from go-cms.
func WithDerivedFields() CMSContentListOption {
	return cmscontracts.WithDerivedFields()
}

// WithLocaleVariants requests one list item per locale sibling for translation-enabled content.
// This is handled inside go-admin's CMS adapter and is not forwarded to go-cms.
func WithLocaleVariants() CMSContentListOption {
	return cmscontracts.WithLocaleVariants()
}
