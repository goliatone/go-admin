package admin

import (
	"context"
)

// SearchResult represents a single search hit.
type SearchResult struct {
	Type        string `json:"type"`
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	URL         string `json:"url,omitempty"`
	Icon        string `json:"icon,omitempty"`
	Thumbnail   string `json:"thumbnail,omitempty"`
}

// SearchAdapter performs a search for a specific entity type.
type SearchAdapter interface {
	Search(ctx context.Context, query string, limit int) ([]SearchResult, error)
	Permission() string
}

// SearchEngine aggregates adapters and executes queries across them.
type SearchEngine struct {
	adapters   map[string]SearchAdapter
	primary    SearchAdapter
	authorizer Authorizer
	enabled    bool
}

// NewSearchEngine constructs a search engine.
func NewSearchEngine(authorizer Authorizer) *SearchEngine {
	return &SearchEngine{adapters: make(map[string]SearchAdapter), authorizer: authorizer, enabled: true}
}

// Enable toggles whether search is available.
func (s *SearchEngine) Enable(enabled bool) {
	if s == nil {
		return
	}
	s.enabled = enabled
}

// Register registers a search adapter under a key.
func (s *SearchEngine) Register(key string, adapter SearchAdapter) {
	if key == "" || adapter == nil {
		return
	}
	s.adapters[key] = adapter
}

// SetPrimary installs the canonical search adapter. When configured, Query
// routes all requests through the primary adapter instead of fanout across the
// legacy registry.
func (s *SearchEngine) SetPrimary(adapter SearchAdapter) {
	if s == nil {
		return
	}
	s.primary = adapter
}

// Query searches all adapters respecting permissions.
func (s *SearchEngine) Query(ctx AdminContext, query string, limit int) ([]SearchResult, error) {
	if s == nil || !s.enabled {
		return nil, FeatureDisabledError{Feature: string(FeatureSearch)}
	}
	if limit <= 0 {
		limit = 10
	}
	if s.primary != nil {
		if !permissionAllowed(s.authorizer, ctx.Context, s.primary.Permission(), "search") {
			return []SearchResult{}, nil
		}
		hits, err := s.primary.Search(ctx.Context, query, limit)
		if err != nil {
			return nil, err
		}
		return hits, nil
	}
	results := []SearchResult{}
	for key, adapter := range s.adapters {
		if !permissionAllowed(s.authorizer, ctx.Context, adapter.Permission(), "search") {
			continue
		}
		hits, err := adapter.Search(ctx.Context, query, limit)
		if err != nil {
			return nil, err
		}
		for _, h := range hits {
			if h.Type == "" {
				h.Type = key
			}
			results = append(results, h)
		}
	}
	return results, nil
}
