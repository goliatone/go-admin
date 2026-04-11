package routing

import (
	"reflect"
	"sort"
	"strings"
)

const (
	ManifestMethodUnknown = "UNKNOWN"
	ManifestDiffAdded     = "added"
	ManifestDiffRemoved   = "removed"
	ManifestDiffChanged   = "changed"
)

type Manifest struct {
	Entries   []ManifestEntry `json:"entries,omitempty"`
	Fallbacks []FallbackEntry `json:"fallbacks,omitempty"`
}

type ManifestEntry struct {
	Owner     string `json:"owner"`
	Surface   string `json:"surface"`
	Domain    string `json:"domain,omitempty"`
	RouteKey  string `json:"route_key"`
	RouteName string `json:"route_name"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	GroupPath string `json:"group_path"`
}

type ManifestDiff struct {
	Added           []ManifestDiffEntry `json:"added,omitempty"`
	Removed         []ManifestDiffEntry `json:"removed,omitempty"`
	Changed         []ManifestDiffEntry `json:"changed,omitempty"`
	FallbackAdded   []FallbackDiffEntry `json:"fallback_added,omitempty"`
	FallbackRemoved []FallbackDiffEntry `json:"fallback_removed,omitempty"`
	FallbackChanged []FallbackDiffEntry `json:"fallback_changed,omitempty"`
}

type ManifestDiffEntry struct {
	Kind   string         `json:"kind"`
	Key    string         `json:"key"`
	Before *ManifestEntry `json:"before,omitempty"`
	After  *ManifestEntry `json:"after,omitempty"`
}

type FallbackDiffEntry struct {
	Kind   string         `json:"kind"`
	Key    string         `json:"key"`
	Before *FallbackEntry `json:"before,omitempty"`
	After  *FallbackEntry `json:"after,omitempty"`
}

func NormalizeManifest(manifest Manifest) Manifest {
	entries := make([]ManifestEntry, 0, len(manifest.Entries))
	for _, entry := range manifest.Entries {
		entries = append(entries, normalizeManifestEntry(entry))
	}
	fallbacks := make([]FallbackEntry, 0, len(manifest.Fallbacks))
	for _, entry := range manifest.Fallbacks {
		fallbacks = append(fallbacks, NormalizeFallbackEntry(entry))
	}
	sortManifestEntries(entries)
	sortFallbackEntries(fallbacks)
	return Manifest{
		Entries:   entries,
		Fallbacks: fallbacks,
	}
}

func (m Manifest) SortedEntries() []ManifestEntry {
	normalized := NormalizeManifest(m)
	return normalized.Entries
}

func (m ManifestDiff) HasChanges() bool {
	return len(m.Added) > 0 || len(m.Removed) > 0 || len(m.Changed) > 0 ||
		len(m.FallbackAdded) > 0 || len(m.FallbackRemoved) > 0 || len(m.FallbackChanged) > 0
}

func DiffManifests(before, after Manifest) ManifestDiff {
	left := NormalizeManifest(before)
	right := NormalizeManifest(after)

	leftMap := make(map[string]ManifestEntry, len(left.Entries))
	rightMap := make(map[string]ManifestEntry, len(right.Entries))
	leftFallbacks := make(map[string]FallbackEntry, len(left.Fallbacks))
	rightFallbacks := make(map[string]FallbackEntry, len(right.Fallbacks))

	for _, entry := range left.Entries {
		leftMap[manifestIdentityKey(entry)] = entry
	}
	for _, entry := range right.Entries {
		rightMap[manifestIdentityKey(entry)] = entry
	}
	for _, entry := range left.Fallbacks {
		leftFallbacks[fallbackScopeKey(entry)] = entry
	}
	for _, entry := range right.Fallbacks {
		rightFallbacks[fallbackScopeKey(entry)] = entry
	}

	diff := ManifestDiff{}
	keys := make([]string, 0, len(leftMap)+len(rightMap))
	seen := map[string]struct{}{}
	for key := range leftMap {
		keys = append(keys, key)
		seen[key] = struct{}{}
	}
	for key := range rightMap {
		if _, ok := seen[key]; ok {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	for _, key := range keys {
		leftEntry, leftOK := leftMap[key]
		rightEntry, rightOK := rightMap[key]
		switch {
		case leftOK && !rightOK:
			entry := leftEntry
			diff.Removed = append(diff.Removed, ManifestDiffEntry{
				Kind:   ManifestDiffRemoved,
				Key:    key,
				Before: &entry,
			})
		case !leftOK && rightOK:
			entry := rightEntry
			diff.Added = append(diff.Added, ManifestDiffEntry{
				Kind:  ManifestDiffAdded,
				Key:   key,
				After: &entry,
			})
		case leftOK && rightOK && !reflect.DeepEqual(leftEntry, rightEntry):
			beforeEntry := leftEntry
			afterEntry := rightEntry
			diff.Changed = append(diff.Changed, ManifestDiffEntry{
				Kind:   ManifestDiffChanged,
				Key:    key,
				Before: &beforeEntry,
				After:  &afterEntry,
			})
		}
	}

	fallbackKeys := make([]string, 0, len(leftFallbacks)+len(rightFallbacks))
	seen = map[string]struct{}{}
	for key := range leftFallbacks {
		fallbackKeys = append(fallbackKeys, key)
		seen[key] = struct{}{}
	}
	for key := range rightFallbacks {
		if _, ok := seen[key]; ok {
			continue
		}
		fallbackKeys = append(fallbackKeys, key)
	}
	sort.Strings(fallbackKeys)

	for _, key := range fallbackKeys {
		leftEntry, leftOK := leftFallbacks[key]
		rightEntry, rightOK := rightFallbacks[key]
		switch {
		case leftOK && !rightOK:
			entry := leftEntry
			diff.FallbackRemoved = append(diff.FallbackRemoved, FallbackDiffEntry{
				Kind:   ManifestDiffRemoved,
				Key:    key,
				Before: &entry,
			})
		case !leftOK && rightOK:
			entry := rightEntry
			diff.FallbackAdded = append(diff.FallbackAdded, FallbackDiffEntry{
				Kind:  ManifestDiffAdded,
				Key:   key,
				After: &entry,
			})
		case leftOK && rightOK && !reflect.DeepEqual(leftEntry, rightEntry):
			beforeEntry := leftEntry
			afterEntry := rightEntry
			diff.FallbackChanged = append(diff.FallbackChanged, FallbackDiffEntry{
				Kind:   ManifestDiffChanged,
				Key:    key,
				Before: &beforeEntry,
				After:  &afterEntry,
			})
		}
	}

	return diff
}

func normalizeManifestEntry(entry ManifestEntry) ManifestEntry {
	entry.Owner = strings.TrimSpace(entry.Owner)
	entry.Surface = NormalizeRouteSurface(entry.Surface)
	entry.Domain = NormalizeRouteDomain(entry.Domain)
	if entry.Surface == "" {
		entry.Surface = DefaultRouteSurfaceForDomain(entry.Domain)
	}
	if entry.Domain == "" {
		entry.Domain = DefaultRouteDomainForSurface(entry.Surface)
	}
	entry.RouteKey = strings.TrimSpace(entry.RouteKey)
	entry.RouteName = strings.TrimSpace(entry.RouteName)
	entry.Method = strings.ToUpper(strings.TrimSpace(entry.Method))
	if entry.Method == "" {
		entry.Method = ManifestMethodUnknown
	}
	entry.Path = normalizeAbsolutePath(entry.Path)
	entry.GroupPath = strings.TrimSpace(entry.GroupPath)
	return entry
}

func manifestIdentityKey(entry ManifestEntry) string {
	entry = normalizeManifestEntry(entry)
	return entry.Owner + "|" + entry.Surface + "|" + entry.RouteKey
}
