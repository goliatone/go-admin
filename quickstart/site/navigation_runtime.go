package site

import "github.com/goliatone/go-admin/admin"

const (
	menuDedupByURL    = "by_url"
	menuDedupByTarget = "by_target"
	menuDedupNone     = "none"
)

type navigationRuntime struct {
	siteCfg     ResolvedSiteConfig
	menuSvc     admin.CMSMenuService
	contentSvc  admin.CMSContentService
	contentType admin.CMSContentTypeService
	authorizer  admin.Authorizer
	translator  admin.Translator
}
