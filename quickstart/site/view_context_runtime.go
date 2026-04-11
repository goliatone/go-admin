package site

import (
	"strings"

	router "github.com/goliatone/go-router"
)

func newRuntimeViewContext(state RequestState) router.ViewContext {
	return cloneViewContext(state.ViewContext)
}

func applyResolvedLocaleViewContext(
	viewCtx router.ViewContext,
	requestedLocale string,
	resolvedLocale string,
	availableLocales []string,
	missingRequested bool,
) router.ViewContext {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	viewCtx["requested_locale"] = strings.TrimSpace(requestedLocale)
	viewCtx["resolved_locale"] = strings.TrimSpace(resolvedLocale)
	viewCtx["locale"] = strings.TrimSpace(resolvedLocale)
	viewCtx["available_locales"] = cloneStrings(availableLocales)
	viewCtx["missing_requested_locale"] = missingRequested
	return viewCtx
}

func applyContentTypeViewContext(viewCtx router.ViewContext, typeSlug string) router.ViewContext {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	typeSlug = strings.TrimSpace(typeSlug)
	viewCtx["content_type"] = typeSlug
	viewCtx["content_type_slug"] = typeSlug
	return applySiteContentAwareViewContext(viewCtx)
}
