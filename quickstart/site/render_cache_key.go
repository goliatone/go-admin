package site

import (
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"sort"
	"strings"
)

// HashRenderCacheCanonicalData returns a deterministic fixed-width token for
// host-owned canonical key material. Raw paths, queries, tokens, and filters do
// not need to be exposed in backend keys.
func HashRenderCacheCanonicalData(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

type renderCacheKeyInput struct {
	Policy      RenderCachePolicy
	State       RequestState
	RequestPath string
	Query       url.Values
	Generations renderCacheGenerationSnapshot
}

func buildRenderCacheKey(input renderCacheKeyInput) string {
	policy := normalizeRenderCachePolicy(input.Policy)
	state := input.State
	requestPath := normalizeLocalePath(input.RequestPath)
	if requestPath == "" {
		requestPath = "/"
	}
	environment := firstNonEmpty(policy.EnvironmentNamespace, state.Environment, "prod")
	query := cloneSortedQuery(input.Query).Encode()
	parts := []string{
		"schema=" + policy.SchemaVersion,
		"app=" + policy.ApplicationNamespace,
		"env=" + environment,
		"site=" + policy.SiteNamespace,
		"theme=" + strings.TrimSpace(state.ThemeName),
		"variant=" + strings.TrimSpace(state.ThemeVariant),
		"locale=" + strings.TrimSpace(state.Locale),
		"path=" + requestPath,
		"query=" + query,
		"channel=" + strings.TrimSpace(state.ContentChannel),
		"version=" + policy.RenderVersion,
		"generations=" + hashRenderCacheGenerationSnapshot(input.Generations),
	}
	for i, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		parts[i] = kv[0] + "=" + url.QueryEscape(kv[1])
	}
	return RenderCacheKeyPrefix + strings.Join(parts, "|")
}

func cloneSortedQuery(values url.Values) url.Values {
	out := url.Values{}
	for key, list := range values {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		copied := append([]string{}, list...)
		sort.Strings(copied)
		for _, value := range copied {
			out.Add(key, value)
		}
	}
	return out
}
