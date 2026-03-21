package admin

import (
	"context"
	"strings"
	"sync"

	cms "github.com/goliatone/go-cms"
	i18n "github.com/goliatone/go-i18n"
	"github.com/google/uuid"
)

type goCMSLocaleResolver interface {
	ResolveByCode(ctx context.Context, code string) (cms.LocaleInfo, error)
}

type goCMSActiveLocaleResolver interface {
	ActiveLocales(ctx context.Context) ([]cms.LocaleInfo, error)
}

type goCMSLocaleIDCache struct {
	resolver goCMSLocaleResolver

	mu  sync.RWMutex
	ids map[string]uuid.UUID
}

func newGoCMSLocaleIDCache(resolver goCMSLocaleResolver) *goCMSLocaleIDCache {
	if resolver == nil {
		return nil
	}
	return &goCMSLocaleIDCache{
		resolver: resolver,
		ids:      map[string]uuid.UUID{},
	}
}

func (c *goCMSLocaleIDCache) Resolve(ctx context.Context, localeCode string) (uuid.UUID, bool) {
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

func resolveActiveGoCMSLocaleCodes(ctx context.Context, resolver goCMSLocaleResolver) ([]string, error) {
	if resolver == nil {
		return nil, nil
	}
	provider, ok := resolver.(goCMSActiveLocaleResolver)
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
	return normalizeLocaleCandidates(codes...), nil
}
