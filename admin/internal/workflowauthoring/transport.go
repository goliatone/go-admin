package workflowauthoring

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-command/flow"
)

type UnavailableStore struct {
	Err error
}

func NewUnavailableStore(err error) UnavailableStore {
	return UnavailableStore{Err: err}
}

func (s UnavailableStore) List(context.Context, flow.AuthoringListOptions) (*flow.AuthoringListResult, error) {
	return nil, s.Err
}

func (s UnavailableStore) Load(context.Context, string) (*flow.AuthoringMachineRecord, error) {
	return nil, s.Err
}

func (s UnavailableStore) Save(context.Context, *flow.AuthoringMachineRecord, string) (*flow.AuthoringMachineRecord, error) {
	return nil, s.Err
}

func (s UnavailableStore) Delete(context.Context, string, string, bool) (bool, error) {
	return false, s.Err
}

func ParseAuthoringVersion(value string) int {
	parsed, _ := strconv.Atoi(strings.TrimSpace(value))
	return parsed
}

func VersionSummary(record *flow.AuthoringMachineRecord) flow.FSMAuthoringVersionSummary {
	if record == nil {
		return flow.FSMAuthoringVersionSummary{}
	}
	publishedAt := ""
	if record.PublishedAt != nil {
		publishedAt = record.PublishedAt.UTC().Format(time.RFC3339)
	}
	return flow.FSMAuthoringVersionSummary{
		Version:     strings.TrimSpace(record.Version),
		ETag:        strings.TrimSpace(record.ETag),
		UpdatedAt:   record.UpdatedAt.UTC().Format(time.RFC3339),
		PublishedAt: publishedAt,
		IsDraft:     record.PublishedDefinition == nil || record.DeletedAt != nil,
	}
}

func DiffMachineDefinitions(base, target *flow.MachineDefinition) []flow.FSMAuthoringDiffChange {
	baseRaw, _ := json.Marshal(base)
	targetRaw, _ := json.Marshal(target)
	baseMap := map[string]any{}
	targetMap := map[string]any{}
	_ = json.Unmarshal(baseRaw, &baseMap)
	_ = json.Unmarshal(targetRaw, &targetMap)
	changes := []flow.FSMAuthoringDiffChange{}
	collectDiffChanges("$", baseMap, targetMap, &changes)
	sort.SliceStable(changes, func(i, j int) bool {
		return changes[i].Path < changes[j].Path
	})
	return changes
}

func collectDiffChanges(path string, base, target any, changes *[]flow.FSMAuthoringDiffChange) {
	switch b := base.(type) {
	case map[string]any:
		t, ok := target.(map[string]any)
		if !ok {
			*changes = append(*changes, flow.FSMAuthoringDiffChange{Path: path, ChangeType: "modified"})
			return
		}
		keys := map[string]struct{}{}
		for key := range b {
			keys[key] = struct{}{}
		}
		for key := range t {
			keys[key] = struct{}{}
		}
		names := make([]string, 0, len(keys))
		for key := range keys {
			names = append(names, key)
		}
		sort.Strings(names)
		for _, key := range names {
			collectDiffChanges(path+"."+key, b[key], t[key], changes)
		}
	case []any:
		t, ok := target.([]any)
		if !ok {
			*changes = append(*changes, flow.FSMAuthoringDiffChange{Path: path, ChangeType: "modified"})
			return
		}
		maxLen := max(len(t), len(b))
		for index := range maxLen {
			var left any
			if index < len(b) {
				left = b[index]
			}
			var right any
			if index < len(t) {
				right = t[index]
			}
			collectDiffChanges(fmt.Sprintf("%s[%d]", path, index), left, right, changes)
		}
	default:
		if fmt.Sprint(base) == fmt.Sprint(target) {
			return
		}
		changeType := "modified"
		if base == nil {
			changeType = "added"
		} else if target == nil {
			changeType = "removed"
		}
		*changes = append(*changes, flow.FSMAuthoringDiffChange{
			Path:       path,
			ChangeType: changeType,
		})
	}
}
