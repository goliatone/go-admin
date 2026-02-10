package admin

import (
	"context"
	"errors"
	"testing"
)

func TestInMemoryTranslationAssignmentRepositoryCreateEnforcesActiveUniqueness(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create first assignment: %v", err)
	}

	_, err = repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		SourceRecordID:     "page_2",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusAssigned,
		Priority:           PriorityHigh,
	})
	if err == nil {
		t.Fatalf("expected uniqueness conflict")
	}

	if !errors.Is(err, ErrTranslationAssignmentConflict) {
		t.Fatalf("expected ErrTranslationAssignmentConflict, got %v", err)
	}

	var conflict TranslationAssignmentConflictError
	if !errors.As(err, &conflict) {
		t.Fatalf("expected TranslationAssignmentConflictError, got %T", err)
	}
	if conflict.ExistingAssignmentID != created.ID {
		t.Fatalf("expected existing id %q, got %q", created.ID, conflict.ExistingAssignmentID)
	}
}

func TestInMemoryTranslationAssignmentRepositoryCreateOrReuseActiveIsIdempotent(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	first, created, err := repo.CreateOrReuseActive(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		SourceTitle:        "First title",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create/reuse first assignment: %v", err)
	}
	if !created {
		t.Fatalf("expected first create/reuse call to create a record")
	}

	second, created, err := repo.CreateOrReuseActive(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		SourceTitle:        "Updated title",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityHigh,
	})
	if err != nil {
		t.Fatalf("create/reuse duplicate assignment: %v", err)
	}
	if created {
		t.Fatalf("expected second create/reuse call to reuse existing record")
	}
	if second.ID != first.ID {
		t.Fatalf("expected reused id %q, got %q", first.ID, second.ID)
	}
	if second.SourceTitle != "Updated title" {
		t.Fatalf("expected refreshed source title, got %q", second.SourceTitle)
	}
	if second.Priority != PriorityHigh {
		t.Fatalf("expected refreshed priority high, got %q", second.Priority)
	}
	if second.Version <= first.Version {
		t.Fatalf("expected reused assignment version to increment, got first=%d second=%d", first.Version, second.Version)
	}
}

func TestInMemoryTranslationAssignmentRepositoryUpdateVersionConflict(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		SourceRecordID:     "page_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	created.Status = AssignmentStatusInProgress
	_, err = repo.Update(ctx, created, created.Version-1)
	if err == nil {
		t.Fatalf("expected version conflict")
	}
	if !errors.Is(err, ErrTranslationAssignmentVersionConflict) {
		t.Fatalf("expected ErrTranslationAssignmentVersionConflict, got %v", err)
	}
}

func TestInMemoryTranslationAssignmentRepositoryArchiveReleasesActiveKey(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "posts",
		SourceRecordID:     "post_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeDirect,
		Status:             AssignmentStatusAssigned,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	created.Status = AssignmentStatusArchived
	archived, err := repo.Update(ctx, created, created.Version)
	if err != nil {
		t.Fatalf("archive assignment: %v", err)
	}
	if archived.Status != AssignmentStatusArchived {
		t.Fatalf("expected archived status, got %q", archived.Status)
	}

	_, err = repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "posts",
		SourceRecordID:     "post_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("expected new active assignment after archive, got %v", err)
	}
}
