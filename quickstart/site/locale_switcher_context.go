package site

import (
	"strings"

	router "github.com/goliatone/go-router"
)

func localeSwitcherQueryFromRequestState(state RequestState) map[string]string {
	token := strings.TrimSpace(state.PreviewToken)
	if token == "" {
		return nil
	}
	return map[string]string{
		"preview_token": token,
	}
}

func applyLocaleSwitcherViewContext(
	viewCtx router.ViewContext,
	cfg ResolvedSiteConfig,
	activePath string,
	requestedLocale string,
	resolvedLocale string,
	translationGroupID string,
	availableLocales []string,
	pathsByLocale map[string]string,
	state RequestState,
) router.ViewContext {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	viewCtx["locale_switcher"] = BuildLocaleSwitcherContract(
		cfg,
		activePath,
		requestedLocale,
		resolvedLocale,
		translationGroupID,
		availableLocales,
		pathsByLocale,
		localeSwitcherQueryFromRequestState(state),
	)
	return viewCtx
}
