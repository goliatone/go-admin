package site

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"sync"

	vk "github.com/valkey-io/valkey-go"
)

// ErrRenderCacheGenerationUnavailable identifies a missing or unusable
// generation fence. Callers may use errors.Is to distinguish this from a
// backend operation failure.
var ErrRenderCacheGenerationUnavailable = errors.New("site render cache generation fence is unavailable")

// RenderCacheSharedFenceScope is the generation shared by every public HTML
// surface that renders common site chrome such as navigation, theme, widgets,
// or locale catalogs.
const RenderCacheSharedFenceScope = "site:shared"

const maxRenderCacheGenerationScopes = 8

type renderCacheGenerationEntry struct {
	Scope      string
	Generation uint64
}

type renderCacheGenerationSnapshot []renderCacheGenerationEntry

func normalizeRenderCacheGenerationScopes(scopes ...string) ([]string, error) {
	out := make([]string, 0, len(scopes))
	seen := map[string]struct{}{}
	for _, scope := range scopes {
		normalized, err := normalizeRenderCacheGenerationScope(scope)
		if err != nil {
			return nil, err
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("%w: invalid scope", ErrRenderCacheGenerationUnavailable)
	}
	if len(out) > maxRenderCacheGenerationScopes {
		return nil, fmt.Errorf("%w: too many scopes", ErrRenderCacheGenerationUnavailable)
	}
	slices.Sort(out)
	return out, nil
}

func readRenderCacheGenerationSnapshot(ctx context.Context, runtime *RenderCacheRuntime, scopes []string) (renderCacheGenerationSnapshot, error) {
	if runtime == nil || runtime.Generations == nil {
		return nil, ErrRenderCacheGenerationUnavailable
	}
	normalized, err := normalizeRenderCacheGenerationScopes(scopes...)
	if err != nil {
		return nil, err
	}
	snapshot := make(renderCacheGenerationSnapshot, 0, len(normalized))
	for _, scope := range normalized {
		generation, readErr := runtime.Generations.ReadGeneration(normalizeRenderCacheContext(ctx), scope)
		if readErr != nil {
			return nil, readErr
		}
		snapshot = append(snapshot, renderCacheGenerationEntry{Scope: scope, Generation: generation})
	}
	return snapshot, nil
}

func renderCacheGenerationSnapshotsEqual(left, right renderCacheGenerationSnapshot) bool {
	return slices.Equal(left, right)
}

func hashRenderCacheGenerationSnapshot(snapshot renderCacheGenerationSnapshot) string {
	parts := make([]string, 0, len(snapshot))
	for _, entry := range snapshot {
		parts = append(parts, entry.Scope+"="+strconv.FormatUint(entry.Generation, 10))
	}
	return HashRenderCacheCanonicalData([]byte(strings.Join(parts, "\n")))
}

// RenderCacheGenerationStore provides the mutation generation used to keep an
// in-flight pre-mutation fill from becoming visible after a mutation completes.
// Shared reports whether every serving process can observe the same generation.
type RenderCacheGenerationStore interface {
	ReadGeneration(ctx context.Context, scope string) (uint64, error)
	AdvanceGeneration(ctx context.Context, scope string) (uint64, error)
	Shared() bool
}

// ReadRenderCacheGeneration reads a runtime generation while preserving a
// stable errors.Is contract when the capability is unavailable.
func ReadRenderCacheGeneration(ctx context.Context, runtime *RenderCacheRuntime, scope string) (uint64, error) {
	if runtime == nil || runtime.Generations == nil {
		return 0, ErrRenderCacheGenerationUnavailable
	}
	return runtime.Generations.ReadGeneration(ctx, scope)
}

// AdvanceRenderCacheGeneration advances a runtime generation atomically.
func AdvanceRenderCacheGeneration(ctx context.Context, runtime *RenderCacheRuntime, scope string) (uint64, error) {
	if runtime == nil || runtime.Generations == nil {
		return 0, ErrRenderCacheGenerationUnavailable
	}
	return runtime.Generations.AdvanceGeneration(ctx, scope)
}

// RenderCacheGenerationIsShared reports whether a runtime fence is visible to
// every process using the configured backend.
func RenderCacheGenerationIsShared(runtime *RenderCacheRuntime) bool {
	return runtime != nil && runtime.Generations != nil && runtime.Generations.Shared()
}

type memoryRenderCacheGenerationStore struct {
	mu          sync.RWMutex
	generations map[string]uint64
}

func newMemoryRenderCacheGenerationStore() RenderCacheGenerationStore {
	return &memoryRenderCacheGenerationStore{generations: map[string]uint64{}}
}

func (s *memoryRenderCacheGenerationStore) ReadGeneration(_ context.Context, scope string) (uint64, error) {
	scope, err := normalizeRenderCacheGenerationScope(scope)
	if err != nil {
		return 0, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.generations[scope], nil
}

func (s *memoryRenderCacheGenerationStore) AdvanceGeneration(_ context.Context, scope string) (uint64, error) {
	scope, err := normalizeRenderCacheGenerationScope(scope)
	if err != nil {
		return 0, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.generations[scope]++
	return s.generations[scope], nil
}

func (*memoryRenderCacheGenerationStore) Shared() bool { return false }

type valkeyRenderCacheGenerationStore struct {
	client    vk.Client
	namespace string
}

func (s *valkeyRenderCacheGenerationStore) ReadGeneration(ctx context.Context, scope string) (uint64, error) {
	key, err := s.key(scope)
	if err != nil {
		return 0, err
	}
	result := s.client.Do(normalizeRenderCacheContext(ctx), s.client.B().Get().Key(key).Build())
	value, err := result.AsUint64()
	if vk.IsValkeyNil(err) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("read site render cache generation: %w", err)
	}
	return value, nil
}

func (s *valkeyRenderCacheGenerationStore) AdvanceGeneration(ctx context.Context, scope string) (uint64, error) {
	key, err := s.key(scope)
	if err != nil {
		return 0, err
	}
	value, err := s.client.Do(normalizeRenderCacheContext(ctx), s.client.B().Incr().Key(key).Build()).AsUint64()
	if err != nil {
		return 0, fmt.Errorf("advance site render cache generation: %w", err)
	}
	return value, nil
}

func (*valkeyRenderCacheGenerationStore) Shared() bool { return true }

func (s *valkeyRenderCacheGenerationStore) key(scope string) (string, error) {
	if s == nil || s.client == nil {
		return "", ErrRenderCacheGenerationUnavailable
	}
	scope, err := normalizeRenderCacheGenerationScope(scope)
	if err != nil {
		return "", err
	}
	namespace := strings.TrimSpace(s.namespace)
	if namespace == "" {
		return "", ErrRenderCacheGenerationUnavailable
	}
	return namespace + ":generation:" + HashRenderCacheCanonicalData([]byte(scope)), nil
}

func normalizeRenderCacheGenerationScope(scope string) (string, error) {
	scope = strings.TrimSpace(scope)
	if scope == "" || len(scope) > 128 {
		return "", fmt.Errorf("%w: invalid scope", ErrRenderCacheGenerationUnavailable)
	}
	for i := 0; i < len(scope); i++ {
		char := scope[i]
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == ':' || char == '.' || char == '_' || char == '-' {
			continue
		}
		return "", fmt.Errorf("%w: invalid scope", ErrRenderCacheGenerationUnavailable)
	}
	return scope, nil
}

func normalizeRenderCacheContext(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}
	return ctx
}
