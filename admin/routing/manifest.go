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
	leftMap, rightMap := manifestEntryMaps(left.Entries, right.Entries)
	leftFallbacks, rightFallbacks := fallbackEntryMaps(left.Fallbacks, right.Fallbacks)

	diff := ManifestDiff{}
	appendDiffEntries(manifestDiffKeys(leftMap, rightMap), leftMap, rightMap,
		func(key string, entry ManifestEntry) {
			diff.Removed = append(diff.Removed, ManifestDiffEntry{
				Kind:   ManifestDiffRemoved,
				Key:    key,
				Before: &entry,
			})
		},
		func(key string, entry ManifestEntry) {
			diff.Added = append(diff.Added, ManifestDiffEntry{
				Kind:  ManifestDiffAdded,
				Key:   key,
				After: &entry,
			})
		},
		func(key string, beforeEntry ManifestEntry, afterEntry ManifestEntry) {
			diff.Changed = append(diff.Changed, ManifestDiffEntry{
				Kind:   ManifestDiffChanged,
				Key:    key,
				Before: &beforeEntry,
				After:  &afterEntry,
			})
		},
	)
	appendDiffEntries(manifestDiffKeys(leftFallbacks, rightFallbacks), leftFallbacks, rightFallbacks,
		func(key string, entry FallbackEntry) {
			diff.FallbackRemoved = append(diff.FallbackRemoved, FallbackDiffEntry{
				Kind:   ManifestDiffRemoved,
				Key:    key,
				Before: &entry,
			})
		},
		func(key string, entry FallbackEntry) {
			diff.FallbackAdded = append(diff.FallbackAdded, FallbackDiffEntry{
				Kind:  ManifestDiffAdded,
				Key:   key,
				After: &entry,
			})
		},
		func(key string, beforeEntry FallbackEntry, afterEntry FallbackEntry) {
			diff.FallbackChanged = append(diff.FallbackChanged, FallbackDiffEntry{
				Kind:   ManifestDiffChanged,
				Key:    key,
				Before: &beforeEntry,
				After:  &afterEntry,
			})
		},
	)

	return diff
}

func manifestEntryMaps(left []ManifestEntry, right []ManifestEntry) (map[string]ManifestEntry, map[string]ManifestEntry) {
	return keyedEntries(left, manifestIdentityKey), keyedEntries(right, manifestIdentityKey)
}

func fallbackEntryMaps(left []FallbackEntry, right []FallbackEntry) (map[string]FallbackEntry, map[string]FallbackEntry) {
	return keyedEntries(left, fallbackScopeKey), keyedEntries(right, fallbackScopeKey)
}

func keyedEntries[Entry any](entries []Entry, key func(Entry) string) map[string]Entry {
	out := make(map[string]Entry, len(entries))
	for _, entry := range entries {
		out[key(entry)] = entry
	}
	return out
}

func manifestDiffKeys[Entry any](leftMap map[string]Entry, rightMap map[string]Entry) []string {
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
	return keys
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

func appendDiffEntries[Entry any](
	keys []string,
	leftMap map[string]Entry,
	rightMap map[string]Entry,
	appendRemoved func(string, Entry),
	appendAdded func(string, Entry),
	appendChanged func(string, Entry, Entry),
) {
	for _, key := range keys {
		leftEntry, leftOK := leftMap[key]
		rightEntry, rightOK := rightMap[key]
		switch {
		case leftOK && !rightOK:
			appendRemoved(key, leftEntry)
		case !leftOK && rightOK:
			appendAdded(key, rightEntry)
		case leftOK && rightOK && !reflect.DeepEqual(leftEntry, rightEntry):
			appendChanged(key, leftEntry, rightEntry)
		}
	}
}

func manifestIdentityKey(entry ManifestEntry) string {
	entry = normalizeManifestEntry(entry)
	return entry.Owner + "|" + entry.Surface + "|" + entry.RouteKey
}
