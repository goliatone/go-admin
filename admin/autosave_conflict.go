package admin

import (
	"errors"
	"fmt"
	"strings"
)

// ErrAutosaveConflict marks optimistic concurrency conflicts reported by autosave-aware updates.
var ErrAutosaveConflict = errors.New("autosave conflict")

// AutosaveConflictError captures the typed autosave conflict contract returned to clients.
type AutosaveConflictError struct {
	Panel             string         `json:"panel"`
	EntityID          string         `json:"entity_id"`
	Version           string         `json:"version"`
	ExpectedVersion   string         `json:"expected_version"`
	LatestStatePath   string         `json:"latest_state_path"`
	LatestServerState map[string]any `json:"latest_server_state"`
}

func (e AutosaveConflictError) Error() string {
	id := strings.TrimSpace(e.EntityID)
	if id == "" {
		return ErrAutosaveConflict.Error()
	}
	return fmt.Sprintf("autosave conflict for entity %q", id)
}

func (e AutosaveConflictError) Unwrap() error {
	return ErrAutosaveConflict
}
