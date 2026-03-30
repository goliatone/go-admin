package cmsadapter

import (
	"maps"
	"strings"
	"sync"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/google/uuid"
)

type BlockDefinitionCache struct {
	mu    sync.RWMutex
	defs  map[string]uuid.UUID
	names map[uuid.UUID]string
}

type BlockDefinitionCacheEntry struct {
	ID            uuid.UUID
	Env           string
	Primary       string
	Aliases       []string
	IncludeGlobal bool
}

func NewBlockDefinitionCache() *BlockDefinitionCache {
	return &BlockDefinitionCache{
		defs:  map[string]uuid.UUID{},
		names: map[uuid.UUID]string{},
	}
}

func (c *BlockDefinitionCache) Publish(defs map[string]uuid.UUID, names map[uuid.UUID]string) {
	if c == nil || (len(defs) == 0 && len(names) == 0) {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	maps.Copy(c.defs, defs)
	maps.Copy(c.names, names)
}

func (c *BlockDefinitionCache) Lookup(envKey, globalKey string) (uuid.UUID, bool) {
	if c == nil {
		return uuid.Nil, false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	if envKey != "" {
		if defID, ok := c.defs[envKey]; ok {
			return defID, true
		}
	}
	if globalKey != "" {
		if defID, ok := c.defs[globalKey]; ok {
			return defID, true
		}
	}
	return uuid.Nil, false
}

func (c *BlockDefinitionCache) Name(id uuid.UUID) string {
	if c == nil || id == uuid.Nil {
		return ""
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.names[id]
}

func CacheKey(env, key string) string {
	normalized := strings.ToLower(strings.TrimSpace(key))
	if normalized == "" {
		return ""
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return normalized
	}
	return env + "::" + normalized
}

func BlockDefinitionChannel(def cmsboot.CMSBlockDefinition) string {
	//lint:ignore SA1019 compatibility bridge for legacy CMS block definitions that still populate Environment.
	return strings.TrimSpace(firstNonEmptyRaw(def.Channel, def.Environment))
}

func SetBlockDefinitionChannel(def *cmsboot.CMSBlockDefinition, channel string) {
	if def == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	def.Channel = channel
	//lint:ignore SA1019 keep legacy Environment synchronized while older persisted records still depend on it.
	def.Environment = channel
}

func NewBlockDefinitionCacheEntry(def cmsboot.CMSBlockDefinition, id uuid.UUID, env string, includeGlobal bool) BlockDefinitionCacheEntry {
	return BlockDefinitionCacheEntry{
		ID:            id,
		Env:           strings.TrimSpace(env),
		Primary:       strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Slug, def.ID, def.Name)),
		Aliases:       []string{def.Name, def.Slug},
		IncludeGlobal: includeGlobal,
	}
}

func ResolveBlockDefinitionCacheEnv(def cmsboot.CMSBlockDefinition, fallback string) string {
	if channel := strings.TrimSpace(BlockDefinitionChannel(def)); channel != "" {
		return channel
	}
	return strings.TrimSpace(fallback)
}

func CollectBlockDefinitionCacheEntry(target map[string]uuid.UUID, names map[uuid.UUID]string, entry BlockDefinitionCacheEntry) {
	if entry.ID == uuid.Nil {
		return
	}
	primary := strings.TrimSpace(primitives.FirstNonEmptyRaw(entry.Primary))
	if primary != "" {
		storeBlockDefinitionCacheKey(target, entry.Env, primary, entry.ID)
		if entry.IncludeGlobal {
			storeBlockDefinitionCacheKey(target, "", primary, entry.ID)
		}
		names[entry.ID] = primary
	}
	for _, key := range entry.Aliases {
		if strings.TrimSpace(key) == "" {
			continue
		}
		storeBlockDefinitionCacheKey(target, entry.Env, key, entry.ID)
		if entry.IncludeGlobal {
			storeBlockDefinitionCacheKey(target, "", key, entry.ID)
		}
	}
}

func storeBlockDefinitionCacheKey(target map[string]uuid.UUID, env, key string, id uuid.UUID) {
	cacheKey := CacheKey(env, key)
	if cacheKey == "" {
		return
	}
	target[cacheKey] = id
}

func firstNonEmptyRaw(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
