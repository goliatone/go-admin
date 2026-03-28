package cmsadapter

import (
	"sync"
	"testing"

	"github.com/google/uuid"
)

func TestBlockDefinitionCachePublishLookupAndName(t *testing.T) {
	cache := NewBlockDefinitionCache()
	heroID := uuid.New()
	richTextID := uuid.New()

	cache.Publish(
		map[string]uuid.UUID{
			"preview::hero-banner": heroID,
			"hero-banner":          heroID,
			"rich_text":            richTextID,
		},
		map[uuid.UUID]string{
			heroID:     "hero-banner",
			richTextID: "rich_text",
		},
	)

	if got, ok := cache.Lookup("preview::hero-banner", "hero-banner"); !ok || got != heroID {
		t.Fatalf("expected preview hero lookup to resolve %s, got %s ok=%v", heroID, got, ok)
	}
	if got, ok := cache.Lookup("preview::missing", "rich_text"); !ok || got != richTextID {
		t.Fatalf("expected global rich_text lookup to resolve %s, got %s ok=%v", richTextID, got, ok)
	}
	if got := cache.Name(heroID); got != "hero-banner" {
		t.Fatalf("expected hero name hero-banner, got %q", got)
	}
}

func TestBlockDefinitionCacheSupportsConcurrentReadWrite(t *testing.T) {
	cache := NewBlockDefinitionCache()
	heroID := uuid.New()

	var wg sync.WaitGroup
	for range 24 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for range 100 {
				cache.Publish(
					map[string]uuid.UUID{
						"preview::hero-banner": heroID,
						"hero-banner":          heroID,
					},
					map[uuid.UUID]string{heroID: "hero-banner"},
				)
				if got, ok := cache.Lookup("preview::hero-banner", "hero-banner"); !ok || got != heroID {
					t.Errorf("expected concurrent lookup to resolve %s, got %s ok=%v", heroID, got, ok)
					return
				}
				if got := cache.Name(heroID); got != "hero-banner" {
					t.Errorf("expected concurrent name hero-banner, got %q", got)
					return
				}
			}
		}()
	}
	wg.Wait()
}
