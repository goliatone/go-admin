package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func (r *navigationRuntime) generatedFallbackMenu(ctx context.Context, state RequestState, location string) *admin.Menu {
	if r == nil || !r.siteCfg.Navigation.EnableGeneratedFallback || r.contentSvc == nil {
		return nil
	}
	records, err := listSiteContents(ctx, r.contentSvc, state.Locale)
	if err != nil || len(records) == 0 {
		return nil
	}

	pageKinds := r.pageKindByContentType(ctx)
	byIdentity := generatedFallbackGroups(records, pageKinds, state)
	if len(byIdentity) == 0 {
		return nil
	}

	menuCode := strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode)
	items := generatedFallbackItems(menuCode, location, byIdentity, state)
	if len(items) == 0 {
		return nil
	}
	return &admin.Menu{
		Code:     menuCode,
		Location: strings.TrimSpace(location),
		Items:    items,
	}
}

func (r *navigationRuntime) pageKindByContentType(ctx context.Context) map[string]bool {
	if r == nil || r.contentType == nil {
		return nil
	}
	types, err := r.contentType.ContentTypes(ctx)
	if err != nil || len(types) == 0 {
		return nil
	}
	return generatedFallbackPageKinds(types)
}
