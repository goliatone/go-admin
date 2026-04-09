package site

import (
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// SiteOption customizes RegisterSiteRoutes behavior.
type SiteOption func(*siteRegisterOptions)

type siteRegisterOptions struct {
	searchProvider    admin.SearchProvider
	searchOperations  *admin.GoSearchOperations
	contentService    admin.CMSContentService
	contentTypeSvc    admin.CMSContentTypeService
	contentHandler    router.HandlerFunc
	searchHandler     router.HandlerFunc
	searchAPIHandler  router.HandlerFunc
	suggestAPIHandler router.HandlerFunc
	fallbackPolicy    SiteFallbackPolicy
	fallbackOverlay   siteFallbackPolicyOverlay
}

// WithSearchProvider sets the search provider for optional search route wiring.
func WithSearchProvider(provider admin.SearchProvider) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.searchProvider = provider
	}
}

// WithSearchOperations exposes optional search operations to site modules.
func WithSearchOperations(ops *admin.GoSearchOperations) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.searchOperations = ops
	}
}

// WithDeliveryServices sets explicit content/content-type services for
// capability-driven site delivery handlers.
func WithDeliveryServices(contentSvc admin.CMSContentService, contentTypeSvc admin.CMSContentTypeService) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		if contentSvc != nil {
			opts.contentService = contentSvc
		}
		if contentTypeSvc != nil {
			opts.contentTypeSvc = contentTypeSvc
		}
	}
}

// WithContentHandler overrides the default catch-all site content handler.
func WithContentHandler(handler router.HandlerFunc) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil || handler == nil {
			return
		}
		opts.contentHandler = handler
	}
}

// WithSearchHandlers overrides default search page/api handlers.
func WithSearchHandlers(pageHandler, apiHandler router.HandlerFunc) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		if pageHandler != nil {
			opts.searchHandler = pageHandler
		}
		if apiHandler != nil {
			opts.searchAPIHandler = apiHandler
		}
	}
}

// WithSuggestHandler overrides the default search suggest handler.
func WithSuggestHandler(handler router.HandlerFunc) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil || handler == nil {
			return
		}
		opts.suggestAPIHandler = handler
	}
}

func WithFallbackPolicy(policy SiteFallbackPolicy) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		policyCopy := policy
		opts.fallbackOverlay.override = &policyCopy
	}
}

func WithReservedPrefixes(prefixes ...string) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.fallbackOverlay.reservedPrefixes = cloneStrings(prefixes)
	}
}

func WithAllowedExactPaths(paths ...string) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.fallbackOverlay.allowedExactPaths = cloneStrings(paths)
	}
}

func WithAllowedPathPrefixes(prefixes ...string) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.fallbackOverlay.allowedPathPrefixes = cloneStrings(prefixes)
	}
}

func WithAllowedFallbackMethods(methods ...router.HTTPMethod) SiteOption {
	return func(opts *siteRegisterOptions) {
		if opts == nil {
			return
		}
		opts.fallbackOverlay.allowedMethods = cloneHTTPMethods(methods)
	}
}

func defaultNotFoundHandler(c router.Context) error {
	if c == nil {
		return nil
	}
	return c.SendStatus(404)
}
