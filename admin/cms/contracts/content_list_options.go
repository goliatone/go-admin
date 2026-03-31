package contracts

// CMSContentListOption represents list option tokens understood by go-cms List.
// It is a string alias so options can be forwarded without importing go-cms internals.
type CMSContentListOption = string

const ContentListWithTranslations CMSContentListOption = "content:list:with_translations"
const ContentListWithDerivedFields CMSContentListOption = "content:list:projection:derived_fields"

func WithTranslations() CMSContentListOption {
	return ContentListWithTranslations
}

func WithDerivedFields() CMSContentListOption {
	return ContentListWithDerivedFields
}
