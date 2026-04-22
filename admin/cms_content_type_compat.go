package admin

import cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"

func CMSContentTypeChannel(ct CMSContentType) string {
	return cmsadapter.ContentTypeChannel(ct)
}

func CMSBlockDefinitionChannel(def CMSBlockDefinition) string {
	return cmsadapter.BlockDefinitionChannel(def)
}
