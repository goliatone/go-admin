package admin

import "strings"

const (
	// CMSPagePolicyEntity is the translation-policy and family entity for the
	// first-class go-cms Pages service. It is plural because policy inputs and
	// family records identify the service surface, not the backing content type.
	CMSPagePolicyEntity = "pages"

	// CMSPageContentTypeSlug is the backing go-cms content type slug used by
	// Pages service records when they are bridged through generic content APIs.
	CMSPageContentTypeSlug = "page"
)

// IsCMSPagePolicyEntity reports whether value identifies the go-cms Pages
// service entity used by policy and translation-family code.
func IsCMSPagePolicyEntity(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), CMSPagePolicyEntity)
}

// IsCMSPageContentTypeSlug reports whether value identifies the backing
// content type slug used by go-cms page records.
func IsCMSPageContentTypeSlug(value string) bool {
	return strings.EqualFold(strings.TrimSpace(value), CMSPageContentTypeSlug)
}

// IsCMSPageContentRecord reports whether either content type field identifies a
// generic content record that should be treated as a CMS page bridge record.
func IsCMSPageContentRecord(contentType, contentTypeSlug string) bool {
	return IsCMSPageContentTypeSlug(contentType) || IsCMSPageContentTypeSlug(contentTypeSlug)
}
