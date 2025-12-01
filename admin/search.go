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
	authorizer Authorizer
}

// NewSearchEngine constructs a search engine.
func NewSearchEngine(authorizer Authorizer) *SearchEngine {
	return &SearchEngine{adapters: make(map[string]SearchAdapter), authorizer: authorizer}
}

// Register registers a search adapter under a key.
func (s *SearchEngine) Register(key string, adapter SearchAdapter) {
	if key == "" || adapter == nil {
		return
	}
	s.adapters[key] = adapter
}

// Query searches all adapters respecting permissions.
func (s *SearchEngine) Query(ctx AdminContext, query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 10
	}
	results := []SearchResult{}
	for key, adapter := range s.adapters {
		if perm := adapter.Permission(); perm != "" && s.authorizer != nil {
			if !s.authorizer.Can(ctx.Context, perm, "search") {
				continue
			}
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
