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
	AssignmentID         string `json:"assignment_id"`
	ExistingAssignmentID string `json:"existing_assignment_id"`
	FamilyID             string `json:"family_id"`
	EntityType           string `json:"entity_type"`
	SourceLocale         string `json:"source_locale"`
	TargetLocale         string `json:"target_locale"`
	WorkScope            string `json:"work_scope"`
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
	AssignmentID    string `json:"assignment_id"`
	ExpectedVersion int64  `json:"expected_version"`
	ActualVersion   int64  `json:"actual_version"`
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
