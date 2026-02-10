package admin

import (
	"errors"
	"fmt"
	"strings"
)

var (
	// ErrTranslationAssignmentConflict indicates an active assignment uniqueness conflict.
	ErrTranslationAssignmentConflict = errors.New("translation assignment conflict")
	// ErrTranslationAssignmentVersionConflict indicates optimistic locking/version mismatch.
	ErrTranslationAssignmentVersionConflict = errors.New("translation assignment version conflict")
)

// TranslationAssignmentConflictError captures active uniqueness conflicts.
type TranslationAssignmentConflictError struct {
	AssignmentID         string
	ExistingAssignmentID string
	TranslationGroupID   string
	EntityType           string
	SourceLocale         string
	TargetLocale         string
}

func (e TranslationAssignmentConflictError) Error() string {
	if id := strings.TrimSpace(e.ExistingAssignmentID); id != "" {
		return fmt.Sprintf("translation assignment conflict with existing id %q", id)
	}
	return ErrTranslationAssignmentConflict.Error()
}

func (e TranslationAssignmentConflictError) Unwrap() error {
	return ErrTranslationAssignmentConflict
}

// TranslationAssignmentVersionConflictError captures optimistic locking conflicts.
type TranslationAssignmentVersionConflictError struct {
	AssignmentID    string
	ExpectedVersion int64
	ActualVersion   int64
}

func (e TranslationAssignmentVersionConflictError) Error() string {
	if id := strings.TrimSpace(e.AssignmentID); id != "" {
		return fmt.Sprintf("translation assignment %q version conflict", id)
	}
	return ErrTranslationAssignmentVersionConflict.Error()
}

func (e TranslationAssignmentVersionConflictError) Unwrap() error {
	return ErrTranslationAssignmentVersionConflict
}
