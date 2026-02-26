package admin

import "context"

// SiteRouteKey constants map to URL manager route keys for normalized site endpoints.
const (
	SiteRouteContentList      = "site.content.type"
	SiteRouteContentDetail    = "site.content.item"
	SiteRouteNavigationLegacy = "site.navigation"
	SiteRouteMenuByLocation   = "site.menus.location"
	SiteRouteMenuByCode       = "site.menus.code"
)

// SiteQuery defines normalized site endpoint query parameters.
type SiteQuery struct {
	Locale               string              `json:"locale,omitempty"`
	Page                 int                 `json:"page,omitempty"`
	PerPage              int                 `json:"per_page,omitempty"`
	Sort                 string              `json:"sort,omitempty"`
	SortDesc             bool                `json:"sort_desc,omitempty"`
	Fields               []string            `json:"fields,omitempty"`
	Filters              map[string][]string `json:"filters,omitempty"`
	Q                    string              `json:"q,omitempty"`
	IncludeDrafts        bool                `json:"include_drafts,omitempty"`
	IncludeContributions bool                `json:"include_contributions,omitempty"`
	PreviewToken         string              `json:"preview_token,omitempty"`
	ViewProfile          string              `json:"view_profile,omitempty"`
}

// SiteMenuReadOptions captures menu-specific query options.
type SiteMenuReadOptions struct {
	Locale               string `json:"locale,omitempty"`
	IncludeDrafts        bool   `json:"include_drafts,omitempty"`
	IncludeContributions bool   `json:"include_contributions,omitempty"`
	PreviewToken         string `json:"preview_token,omitempty"`
	ViewProfile          string `json:"view_profile,omitempty"`
}

// SiteResponseMeta provides stable response metadata for site endpoints.
type SiteResponseMeta struct {
	RequestedLocale string    `json:"requested_locale,omitempty"`
	ResolvedLocale  string    `json:"resolved_locale,omitempty"`
	Page            int       `json:"page,omitempty"`
	PerPage         int       `json:"per_page,omitempty"`
	Total           int       `json:"total,omitempty"`
	Query           SiteQuery `json:"query"`
}

// SiteContentListResponse is the normalized list response for site content routes.
type SiteContentListResponse struct {
	Data []map[string]any `json:"data"`
	Meta SiteResponseMeta `json:"meta"`
}

// SiteContentDetailResponse is the normalized detail response for site content routes.
type SiteContentDetailResponse struct {
	Data map[string]any   `json:"data"`
	Meta SiteResponseMeta `json:"meta"`
}

// SiteMenuResponse is the normalized response for site menu routes.
type SiteMenuResponse struct {
	Data *Menu            `json:"data"`
	Meta SiteResponseMeta `json:"meta"`
}

// SiteAPIError mirrors machine-readable error payloads consumed by clients.
type SiteAPIError struct {
	Code     int            `json:"code,omitempty"`
	TextCode string         `json:"text_code,omitempty"`
	Message  string         `json:"message,omitempty"`
	Category string         `json:"category,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// SiteAPIErrorResponse wraps SiteAPIError payloads.
type SiteAPIErrorResponse struct {
	Error SiteAPIError `json:"error"`
}

// SiteTranslationMissingDetails exposes structured metadata for translation_missing errors.
type SiteTranslationMissingDetails struct {
	RequestedLocale  string   `json:"requested_locale,omitempty"`
	AvailableLocales []string `json:"available_locales,omitempty"`
	ContentType      string   `json:"content_type,omitempty"`
	Slug             string   `json:"slug,omitempty"`
}

// SiteAPIClient defines typed client methods for normalized site endpoints.
type SiteAPIClient interface {
	ContentList(ctx context.Context, contentType string, query SiteQuery) (*SiteContentListResponse, error)
	ContentDetail(ctx context.Context, contentType, slug string, query SiteQuery) (*SiteContentDetailResponse, error)
	MenuByLocation(ctx context.Context, location string, query SiteQuery) (*SiteMenuResponse, error)
	MenuByCode(ctx context.Context, code string, query SiteQuery) (*SiteMenuResponse, error)
}
