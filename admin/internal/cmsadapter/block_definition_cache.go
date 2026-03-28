package cmsadapter

import (
	"maps"
	"sync"

	"github.com/google/uuid"
)

type BlockDefinitionCache struct {
	mu    sync.RWMutex
	defs  map[string]uuid.UUID
	names map[uuid.UUID]string
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
