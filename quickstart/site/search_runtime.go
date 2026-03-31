package site

const (
	searchUnavailableErrorCode = "search_unavailable"
	searchTemplate             = "site/search"
)

type searchLandingState struct {
	Slug       string
	Title      string
	Breadcrumb string
}
