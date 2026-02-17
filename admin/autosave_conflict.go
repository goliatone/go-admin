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
	Panel             string
	EntityID          string
	Version           string
	ExpectedVersion   string
	LatestStatePath   string
	LatestServerState map[string]any
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
