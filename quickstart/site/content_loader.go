package site

import (
	"context"
	"errors"

	"github.com/goliatone/go-admin/admin"
)

type siteContentListOptionsService interface {
	ContentsWithOptions(ctx context.Context, locale string, opts ...admin.CMSContentListOption) ([]admin.CMSContent, error)
}

func listSiteContents(ctx context.Context, contentSvc admin.CMSContentService, locale string) ([]admin.CMSContent, error) {
	if contentSvc == nil {
		return nil, admin.ErrNotFound
	}
	if withOptions, ok := contentSvc.(siteContentListOptionsService); ok && withOptions != nil {
		items, err := withOptions.ContentsWithOptions(ctx, locale, admin.WithTranslations(), admin.WithDerivedFields())
		if err == nil {
			return items, nil
		}
		// Option-capable wrappers may return not found when option tokens are unsupported.
		// Fall back to the legacy list method in that case.
		if !errors.Is(err, admin.ErrNotFound) {
			return nil, err
		}
	}
	return contentSvc.Contents(ctx, locale)
}
