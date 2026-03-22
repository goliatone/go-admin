package admin

import (
	"context"

	searchadapter "github.com/goliatone/go-search/adapters/goadmin"
	searchtypes "github.com/goliatone/go-search/pkg/types"
)

type goSearchQuerier interface {
	Query(context.Context, searchtypes.SearchRequest) (searchtypes.SearchResultPage, error)
}

type goSuggestQuerier interface {
	Query(context.Context, searchtypes.SuggestRequest) (searchtypes.SuggestResult, error)
}

type goHealthQuerier interface {
	Query(context.Context, searchtypes.HealthRequest) (searchtypes.HealthStatus, error)
}

type goStatsQuerier interface {
	Query(context.Context, searchtypes.StatsRequest) (searchtypes.StatsResult, error)
}

type goEnsureCommander interface {
	Execute(context.Context, searchtypes.EnsureIndexInput) error
}

type goReindexCommander interface {
	Execute(context.Context, searchtypes.ReindexIndexInput) error
}

type GoSearchGlobalAdapterConfig struct {
	Search         goSearchQuerier
	Indexes        []string
	PermissionName string
	FallbackType   string
}

type GoSearchGlobalAdapter struct {
	search         goSearchQuerier
	indexes        []string
	permissionName string
	fallbackType   string
}

func NewGoSearchGlobalAdapter(cfg GoSearchGlobalAdapterConfig) *GoSearchGlobalAdapter {
	if cfg.Search == nil {
		return nil
	}
	return &GoSearchGlobalAdapter{
		search:         cfg.Search,
		indexes:        append([]string(nil), cfg.Indexes...),
		permissionName: cfg.PermissionName,
		fallbackType:   cfg.FallbackType,
	}
}

func (a *GoSearchGlobalAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if a == nil || a.search == nil {
		return nil, nil
	}
	page, err := a.search.Query(ctx, searchadapter.ToSearchRequest(a.indexes, searchadapter.SiteSearchRequest{
		Query:   query,
		PerPage: limit,
		Metadata: map[string]any{
			"indexes": append([]string(nil), a.indexes...),
		},
	}))
	if err != nil {
		return nil, err
	}
	results := searchadapter.GlobalResultsFromPage(page, a.fallbackType)
	out := make([]SearchResult, 0, len(results))
	for _, result := range results {
		out = append(out, SearchResult{
			Type:        result.Type,
			ID:          result.ID,
			Title:       result.Title,
			Description: result.Description,
			URL:         result.URL,
			Icon:        result.Icon,
			Thumbnail:   result.Thumbnail,
		})
	}
	return out, nil
}

func (a *GoSearchGlobalAdapter) Permission() string {
	if a == nil {
		return ""
	}
	return a.permissionName
}

type GoSearchSiteProviderConfig struct {
	Search  goSearchQuerier
	Suggest goSuggestQuerier
	Indexes []string
}

type GoSearchSiteProvider struct {
	search  goSearchQuerier
	suggest goSuggestQuerier
	indexes []string
}

func NewGoSearchSiteProvider(cfg GoSearchSiteProviderConfig) *GoSearchSiteProvider {
	if cfg.Search == nil || cfg.Suggest == nil {
		return nil
	}
	return &GoSearchSiteProvider{
		search:  cfg.Search,
		suggest: cfg.Suggest,
		indexes: append([]string(nil), cfg.Indexes...),
	}
}

func (p *GoSearchSiteProvider) Search(ctx context.Context, req SearchRequest) (SearchResultPage, error) {
	if p == nil || p.search == nil {
		return SearchResultPage{}, nil
	}
	page, err := p.search.Query(ctx, searchadapter.ToSearchRequest(p.indexes, searchadapter.SiteSearchRequest{
		Query:    req.Query,
		Locale:   req.Locale,
		Page:     req.Page,
		PerPage:  req.PerPage,
		Sort:     req.Sort,
		Filters:  req.Filters,
		Ranges:   toAdapterSearchRanges(req.Ranges),
		Actor:    req.Actor,
		Request:  req.Request,
		Metadata: req.Metadata,
	}))
	if err != nil {
		return SearchResultPage{}, err
	}
	result := searchadapter.SiteResultFromPage(page)
	return SearchResultPage{
		Hits:     toAdminSearchHits(result.Hits),
		Facets:   toAdminSearchFacets(result.Facets),
		Page:     result.Page,
		PerPage:  result.PerPage,
		Total:    result.Total,
		Metadata: result.Metadata,
	}, nil
}

func (p *GoSearchSiteProvider) Suggest(ctx context.Context, req SuggestRequest) (SuggestResult, error) {
	if p == nil || p.suggest == nil {
		return SuggestResult{}, nil
	}
	result, err := p.suggest.Query(ctx, searchadapter.ToSuggestRequest(p.indexes, searchadapter.SiteSuggestRequest{
		Query:    req.Query,
		Locale:   req.Locale,
		Limit:    req.Limit,
		Filters:  req.Filters,
		Actor:    req.Actor,
		Request:  req.Request,
		Metadata: req.Metadata,
	}))
	if err != nil {
		return SuggestResult{}, err
	}
	suggest := searchadapter.SiteSuggestResultFromSuggest(result)
	return SuggestResult{
		Suggestions: suggest.Suggestions,
		Metadata:    suggest.Metadata,
	}, nil
}

type GoSearchOperations struct {
	Health      goHealthQuerier
	Stats       goStatsQuerier
	EnsureIndex goEnsureCommander
	Reindex     goReindexCommander
	Indexes     []string
}

func (o *GoSearchOperations) HealthStatus(ctx context.Context) (searchtypes.HealthStatus, error) {
	if o == nil || o.Health == nil {
		return searchtypes.HealthStatus{}, nil
	}
	return o.Health.Query(ctx, searchtypes.HealthRequest{Indexes: append([]string(nil), o.Indexes...)})
}

func (o *GoSearchOperations) StatsSnapshot(ctx context.Context) (searchtypes.StatsResult, error) {
	if o == nil || o.Stats == nil {
		return searchtypes.StatsResult{}, nil
	}
	return o.Stats.Query(ctx, searchtypes.StatsRequest{Indexes: append([]string(nil), o.Indexes...)})
}

func (o *GoSearchOperations) Ensure(ctx context.Context, def searchtypes.IndexDefinition) error {
	if o == nil || o.EnsureIndex == nil {
		return nil
	}
	return o.EnsureIndex.Execute(ctx, searchtypes.EnsureIndexInput{Definition: def})
}

func (o *GoSearchOperations) ReindexAll(ctx context.Context, index string, batchSize int) error {
	if o == nil || o.Reindex == nil {
		return nil
	}
	return o.Reindex.Execute(ctx, searchtypes.ReindexIndexInput{Index: index, BatchSize: batchSize})
}

func toAdminSearchHits(hits []searchadapter.SiteSearchHit) []SearchHit {
	out := make([]SearchHit, 0, len(hits))
	for _, hit := range hits {
		out = append(out, SearchHit{
			ID:              hit.ID,
			Type:            hit.Type,
			Title:           hit.Title,
			Summary:         hit.Summary,
			URL:             hit.URL,
			Locale:          hit.Locale,
			Score:           hit.Score,
			Fields:          hit.Fields,
			Snippet:         hit.Snippet,
			Highlighted:     hit.Highlighted,
			ParentID:        hit.ParentID,
			ParentTitle:     hit.ParentTitle,
			ParentURL:       hit.ParentURL,
			ParentThumbnail: hit.ParentThumbnail,
			ParentSummary:   hit.ParentSummary,
			Anchor:          hit.Anchor,
			Metadata:        hit.Metadata,
		})
	}
	return out
}

func toAdapterSearchRanges(ranges []SearchRange) []searchadapter.SiteSearchRange {
	if len(ranges) == 0 {
		return nil
	}
	out := make([]searchadapter.SiteSearchRange, 0, len(ranges))
	for _, item := range ranges {
		field := item.Field
		if field == "" || (item.GTE == nil && item.LTE == nil) {
			continue
		}
		out = append(out, searchadapter.SiteSearchRange{
			Field: field,
			GTE:   item.GTE,
			LTE:   item.LTE,
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func toAdminSearchFacets(facets []searchadapter.SiteSearchFacet) []SearchFacet {
	out := make([]SearchFacet, 0, len(facets))
	for _, facet := range facets {
		item := SearchFacet{
			Name:        facet.Name,
			Kind:        facet.Kind,
			Disjunctive: facet.Disjunctive,
			Buckets:     make([]SearchFacetTerm, 0, len(facet.Buckets)),
			Metadata:    facet.Metadata,
		}
		for _, bucket := range facet.Buckets {
			item.Buckets = append(item.Buckets, SearchFacetTerm{
				Value:       bucket.Value,
				Label:       bucket.Label,
				Count:       bucket.Count,
				Selected:    bucket.Selected,
				Path:        append([]string(nil), bucket.Path...),
				Level:       bucket.Level,
				ParentValue: bucket.ParentValue,
				Metadata:    bucket.Metadata,
			})
		}
		out = append(out, item)
	}
	return out
}
