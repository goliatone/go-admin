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
	Entries []ManifestEntry `json:"entries,omitempty"`
}

type ManifestEntry struct {
	Owner     string `json:"owner"`
	Surface   string `json:"surface"`
	RouteKey  string `json:"route_key"`
	RouteName string `json:"route_name"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	GroupPath string `json:"group_path"`
}

type ManifestDiff struct {
	Added   []ManifestDiffEntry `json:"added,omitempty"`
	Removed []ManifestDiffEntry `json:"removed,omitempty"`
	Changed []ManifestDiffEntry `json:"changed,omitempty"`
}

type ManifestDiffEntry struct {
	Kind   string         `json:"kind"`
	Key    string         `json:"key"`
	Before *ManifestEntry `json:"before,omitempty"`
	After  *ManifestEntry `json:"after,omitempty"`
}

func NormalizeManifest(manifest Manifest) Manifest {
	entries := make([]ManifestEntry, 0, len(manifest.Entries))
	for _, entry := range manifest.Entries {
		entries = append(entries, normalizeManifestEntry(entry))
	}
	sortManifestEntries(entries)
	return Manifest{Entries: entries}
}

func (m Manifest) SortedEntries() []ManifestEntry {
	normalized := NormalizeManifest(m)
	return normalized.Entries
}

func (m ManifestDiff) HasChanges() bool {
	return len(m.Added) > 0 || len(m.Removed) > 0 || len(m.Changed) > 0
}

func DiffManifests(before, after Manifest) ManifestDiff {
	left := NormalizeManifest(before)
	right := NormalizeManifest(after)

	leftMap := make(map[string]ManifestEntry, len(left.Entries))
	rightMap := make(map[string]ManifestEntry, len(right.Entries))

	for _, entry := range left.Entries {
		leftMap[manifestIdentityKey(entry)] = entry
	}
	for _, entry := range right.Entries {
		rightMap[manifestIdentityKey(entry)] = entry
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

	return diff
}

func normalizeManifestEntry(entry ManifestEntry) ManifestEntry {
	entry.Owner = strings.TrimSpace(entry.Owner)
	entry.Surface = strings.TrimSpace(entry.Surface)
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
