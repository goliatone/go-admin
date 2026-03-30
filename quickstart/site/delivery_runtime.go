package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
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

type deliveryRuntime struct {
	siteCfg        ResolvedSiteConfig
	contentSvc     admin.CMSContentService
	contentTypeSvc admin.CMSContentTypeService
	navigation     *navigationRuntime
}

func newDeliveryRuntime(
	siteCfg ResolvedSiteConfig,
	adm *admin.Admin,
	contentSvc admin.CMSContentService,
	contentTypeSvc admin.CMSContentTypeService,
) *deliveryRuntime {
	if contentSvc == nil || contentTypeSvc == nil {
		return nil
	}
	return &deliveryRuntime{
		siteCfg:        siteCfg,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
		navigation:     newNavigationRuntime(siteCfg, adm, contentSvc, contentTypeSvc),
	}
}

func (r *deliveryRuntime) listSiteContentsCached(ctx context.Context, locale string, cache *siteContentCache) ([]admin.CMSContent, error) {
	if r == nil || r.contentSvc == nil {
		return nil, nil
	}
	return cache.List(ctx, r.contentSvc, locale)
}

func (r *deliveryRuntime) Handler() router.HandlerFunc {
	if r == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		flow := r.prepareDeliveryFlow(c)
		if hasSiteRuntimeError(flow.err) {
			return renderSiteRuntimeError(c, flow.state, r.siteCfg, flow.err)
		}
		if flow.resolution == nil {
			return renderSiteRuntimeError(c, flow.state, r.siteCfg, SiteRuntimeError{
				Status:          404,
				RequestedLocale: flow.state.Locale,
			})
		}
		return r.renderResolution(c, flow.state, flow.resolution, flow.requestPath, flow.cache)
	}
}

func (r *deliveryRuntime) strictLocalizedPathsEnabled() bool {
	if r == nil {
		return false
	}
	return r.siteCfg.Features.EnableI18N && r.siteCfg.Features.StrictLocalizedPaths
}

func translationMissingSiteError(requestedLocale string, availableLocales []string, contentType, slugOrPath string) SiteRuntimeError {
	return SiteRuntimeError{
		Code:             siteErrorCodeTranslationMissing,
		Status:           404,
		Message:          "translation missing",
		RequestedLocale:  strings.TrimSpace(requestedLocale),
		AvailableLocales: cloneStrings(availableLocales),
		ContentType:      strings.TrimSpace(contentType),
		SlugOrPath:       strings.TrimSpace(slugOrPath),
	}
}

func hasSiteRuntimeError(err SiteRuntimeError) bool {
	return err.Status > 0 || strings.TrimSpace(err.Code) != "" || strings.TrimSpace(err.Message) != ""
}

func anyStringList(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			value := strings.TrimSpace(anyString(item))
			if value == "" {
				continue
			}
			out = append(out, value)
		}
		return out
	default:
		return nil
	}
}

func anyMap(raw any) map[string]any {
	if raw == nil {
		return nil
	}
	if typed, ok := raw.(map[string]any); ok {
		return typed
	}
	if typed, ok := raw.(map[string]string); ok {
		out := map[string]any{}
		for key, value := range typed {
			out[key] = value
		}
		return out
	}
	return nil
}

func anyString(raw any) string {
	switch typed := raw.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

func anyBool(raw any) bool {
	switch typed := raw.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "yes", "on":
			return true
		}
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case float64:
		return typed != 0
	}
	return false
}
