package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type navigationReadOptions struct {
	Locale                   string `json:"locale"`
	IncludeContributions     bool   `json:"include_contributions"`
	IncludeDrafts            bool   `json:"include_drafts"`
	PreviewToken             string `json:"preview_token"`
	ViewProfile              string `json:"view_profile"`
	DedupPolicy              string `json:"dedup_policy"`
	ContributionLocalePolicy string `json:"contribution_locale_policy"`
}

func (o navigationReadOptions) toSiteMenuReadOptions() admin.SiteMenuReadOptions {
	return admin.SiteMenuReadOptions{
		Locale:               strings.TrimSpace(o.Locale),
		IncludeContributions: o.IncludeContributions,
		IncludeDrafts:        o.IncludeDrafts,
		PreviewToken:         strings.TrimSpace(o.PreviewToken),
		ViewProfile:          strings.TrimSpace(o.ViewProfile),
	}
}

func newNavigationRuntime(
	siteCfg ResolvedSiteConfig,
	adm *admin.Admin,
	contentSvc admin.CMSContentService,
	contentTypeSvc admin.CMSContentTypeService,
) *navigationRuntime {
	var menuSvc admin.CMSMenuService
	var authorizer admin.Authorizer
	var translator admin.Translator
	if adm != nil {
		menuSvc = adm.MenuService()
		authorizer = adm.Authorizer()
		translator = adm.Translator()
	}
	if contentSvc == nil && adm != nil {
		contentSvc = adm.ContentService()
	}
	if contentTypeSvc == nil && adm != nil {
		contentTypeSvc = adm.ContentTypeService()
	}
	if menuSvc == nil && !siteCfg.Navigation.EnableGeneratedFallback {
		return nil
	}
	return &navigationRuntime{
		siteCfg:     siteCfg,
		menuSvc:     menuSvc,
		contentSvc:  contentSvc,
		contentType: contentTypeSvc,
		authorizer:  authorizer,
		translator:  translator,
	}
}
