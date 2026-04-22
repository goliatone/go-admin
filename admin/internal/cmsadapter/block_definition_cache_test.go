package cmsadapter

import (
	"context"
	"sync"
	"testing"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
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

func TestBlockDefinitionCacheEntryCollectionNormalizesKeys(t *testing.T) {
	heroID := uuid.New()
	defs := map[string]uuid.UUID{}
	names := map[uuid.UUID]string{}

	CollectBlockDefinitionCacheEntry(defs, names, BlockDefinitionCacheEntry{
		ID:            heroID,
		Env:           " Preview ",
		Primary:       " Hero-Banner ",
		Aliases:       []string{"hero", "hero-banner"},
		IncludeGlobal: true,
	})

	if got := defs["Preview::hero-banner"]; got != heroID {
		t.Fatalf("expected Preview::hero-banner to resolve %s, got %s", heroID, got)
	}
	if got := defs["preview::hero-banner"]; got != uuid.Nil {
		t.Fatalf("expected no lowercase env key entry, got %s", got)
	}
	if got := defs["hero"]; got != heroID {
		t.Fatalf("expected global alias hero to resolve %s, got %s", heroID, got)
	}
	if got := names[heroID]; got != "Hero-Banner" {
		t.Fatalf("expected primary name Hero-Banner, got %q", got)
	}
}

func TestBlockDefinitionCacheKeyNormalizesEnvironmentAndKey(t *testing.T) {
	if got := CacheKey(" Preview ", " Hero-Banner "); got != "Preview::hero-banner" {
		t.Fatalf("expected Preview::hero-banner, got %q", got)
	}
	if got := CacheKey("", " Rich_Text "); got != "rich_text" {
		t.Fatalf("expected rich_text, got %q", got)
	}
	if got := CacheKey("", "   "); got != "" {
		t.Fatalf("expected empty key for blank input, got %q", got)
	}
}

func TestBlockDefinitionChannelHelpersPreserveLegacyEnvironmentMirror(t *testing.T) {
	def := cmsboot.CMSBlockDefinition{}
	setLegacyStringField(&def, "Environment", "legacy-preview")
	if got := BlockDefinitionChannel(def); got != "legacy-preview" {
		t.Fatalf("expected legacy-preview from deprecated environment, got %q", got)
	}

	SetBlockDefinitionChannel(&def, "preview")
	if def.Channel != "preview" || legacyStringField(def, "Environment") != "preview" {
		t.Fatalf("expected channel/environment to stay synchronized, got %+v", def)
	}
	if got := BlockDefinitionChannel(def); got != "preview" {
		t.Fatalf("expected preview after setter, got %q", got)
	}
}

func TestResolveContextChannelPrefersContentChannelThenEnvironment(t *testing.T) {
	type ctxKey string
	contentKey := ctxKey("content")
	environmentKey := ctxKey("environment")
	ctx := context.WithValue(context.Background(), environmentKey, "staging")
	ctx = context.WithValue(ctx, contentKey, "preview")

	got := ResolveContextChannel("", ctx,
		func(ctx context.Context) string {
			value, _ := ctx.Value(contentKey).(string)
			return value
		},
		func(ctx context.Context) string {
			value, _ := ctx.Value(environmentKey).(string)
			return value
		},
	)
	if got != "preview" {
		t.Fatalf("expected preview, got %q", got)
	}
}

func TestResolveContextChannelFallsBackToEnvironmentAndExplicitFallback(t *testing.T) {
	type ctxKey string
	environmentKey := ctxKey("environment")
	ctx := context.WithValue(context.Background(), environmentKey, "staging")

	got := ResolveContextChannel("", ctx,
		nil,
		func(ctx context.Context) string {
			value, _ := ctx.Value(environmentKey).(string)
			return value
		},
	)
	if got != "staging" {
		t.Fatalf("expected staging environment fallback, got %q", got)
	}

	got = ResolveContextChannel("preview", ctx,
		func(context.Context) string { return "ignored" },
		func(context.Context) string { return "ignored" },
	)
	if got != "preview" {
		t.Fatalf("expected explicit fallback preview, got %q", got)
	}
}

func TestNewBlockDefinitionCacheEntryShapesPrimaryAndAliases(t *testing.T) {
	id := uuid.New()
	def := cmsboot.CMSBlockDefinition{
		ID:   "hero",
		Name: "Hero Banner",
		Slug: "hero-banner",
	}
	entry := NewBlockDefinitionCacheEntry(def, id, "preview", true)
	if entry.ID != id || entry.Env != "preview" || !entry.IncludeGlobal {
		t.Fatalf("unexpected entry envelope %+v", entry)
	}
	if entry.Primary != "hero-banner" {
		t.Fatalf("expected primary hero-banner, got %q", entry.Primary)
	}
	if len(entry.Aliases) != 2 || entry.Aliases[0] != "Hero Banner" || entry.Aliases[1] != "hero-banner" {
		t.Fatalf("unexpected aliases %+v", entry.Aliases)
	}
}

func TestResolveBlockDefinitionCacheEnvPrefersDefinitionChannel(t *testing.T) {
	def := cmsboot.CMSBlockDefinition{Channel: "preview"}
	if got := ResolveBlockDefinitionCacheEnv(def, "staging"); got != "preview" {
		t.Fatalf("expected definition channel preview, got %q", got)
	}

	def = cmsboot.CMSBlockDefinition{}
	if got := ResolveBlockDefinitionCacheEnv(def, "staging"); got != "staging" {
		t.Fatalf("expected fallback staging, got %q", got)
	}
}

func TestBlockDefinitionCachePublishDefinitionAndLookupName(t *testing.T) {
	cache := NewBlockDefinitionCache()
	id := uuid.New()
	def := cmsboot.CMSBlockDefinition{
		Name: "Hero Banner",
		Slug: "hero-banner",
	}

	cache.PublishDefinition(def, id, "preview", true)

	if got, ok := cache.LookupName("preview", "hero-banner"); !ok || got != id {
		t.Fatalf("expected preview hero-banner lookup to resolve %s, got %s ok=%v", id, got, ok)
	}
	if got, ok := cache.LookupName("", "Hero Banner"); !ok || got != id {
		t.Fatalf("expected global Hero Banner alias lookup to resolve %s, got %s ok=%v", id, got, ok)
	}
	if got := cache.Name(id); got != "hero-banner" {
		t.Fatalf("expected primary name hero-banner, got %q", got)
	}
}

func TestBlockDefinitionCacheSupportsConcurrentReadWrite(t *testing.T) {
	cache := NewBlockDefinitionCache()
	heroID := uuid.New()

	var wg sync.WaitGroup
	for range 24 {
		wg.Go(func() {
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
		})
	}
	wg.Wait()
}
