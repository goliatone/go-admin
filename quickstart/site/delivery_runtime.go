package site

import (
	"github.com/goliatone/go-admin/admin"
)

type deliveryResolution struct {
	Mode               string             `json:"mode"`
	Capability         deliveryCapability `json:"capability"`
	Record             *admin.CMSContent  `json:"record"`
	Records            []admin.CMSContent `json:"records"`
	RequestedLocale    string             `json:"requested_locale"`
	ResolvedLocale     string             `json:"resolved_locale"`
	AvailableLocales   []string           `json:"available_locales"`
	MissingRequested   bool               `json:"missing_requested"`
	FamilyID           string             `json:"family_id"`
	PathsByLocale      map[string]string  `json:"paths_by_locale"`
	TemplateCandidates []string           `json:"template_candidates"`
}

type localizedCapabilityRecordSet struct {
	locales  []string
	byLocale map[string][]admin.CMSContent
}
