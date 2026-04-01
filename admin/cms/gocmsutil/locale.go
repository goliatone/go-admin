package gocmsutil

import (
	"context"
	"strings"
	"sync"

	cms "github.com/goliatone/go-cms"
	i18n "github.com/goliatone/go-i18n"
	"github.com/google/uuid"
)

type LocaleResolver interface {
	ResolveByCode(ctx context.Context, code string) (cms.LocaleInfo, error)
}

type ActiveLocaleResolver interface {
	ActiveLocales(ctx context.Context) ([]cms.LocaleInfo, error)
}

type LocaleIDCache struct {
	resolver LocaleResolver

	mu  sync.RWMutex
	ids map[string]uuid.UUID
}

func NewLocaleIDCache(resolver LocaleResolver) *LocaleIDCache {
	if resolver == nil {
		return nil
	}
	return &LocaleIDCache{
		resolver: resolver,
		ids:      map[string]uuid.UUID{},
	}
}

func (c *LocaleIDCache) Resolve(ctx context.Context, localeCode string) (uuid.UUID, bool) {
	if c == nil || c.resolver == nil {
		return uuid.Nil, false
	}
	trimmed := strings.ToLower(strings.TrimSpace(localeCode))
	if trimmed == "" {
		return uuid.Nil, false
	}

	c.mu.RLock()
	if cached, ok := c.ids[trimmed]; ok && cached != uuid.Nil {
		c.mu.RUnlock()
		return cached, true
	}
	c.mu.RUnlock()

	record, err := c.resolver.ResolveByCode(ctx, trimmed)
	if err != nil || record.ID == uuid.Nil {
		return uuid.Nil, false
	}

	c.mu.Lock()
	c.ids[trimmed] = record.ID
	c.mu.Unlock()
	return record.ID, true
}

func ResolveLocaleID(ctx context.Context, cache *LocaleIDCache, localeCode string) (uuid.UUID, bool) {
	if cache == nil {
		return uuid.Nil, false
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return cache.Resolve(ctx, localeCode)
}

func ResolveActiveLocaleCodes(ctx context.Context, resolver LocaleResolver) ([]string, error) {
	if resolver == nil {
		return nil, nil
	}
	provider, ok := resolver.(ActiveLocaleResolver)
	if !ok || provider == nil {
		return nil, nil
	}
	records, err := provider.ActiveLocales(ctx)
	if err != nil {
		return nil, err
	}
	codes := make([]string, 0, len(records))
	for _, record := range records {
		if code := i18n.NormalizeLocale(record.Code); code != "" {
			codes = append(codes, code)
		}
	}
	return normalizeLocaleCodes(codes...), nil
}

func normalizeLocaleCodes(values ...string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := i18n.NormalizeLocale(value)
		if normalized == "" {
			continue
		}
		key := strings.ToLower(normalized)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
