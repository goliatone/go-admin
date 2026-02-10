package admin

import (
	"context"
	"testing"
)

func TestDefaultTranslationQueueServiceLifecycleApprove(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	svc := &DefaultTranslationQueueService{Repository: repo}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_1",
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

	claimed, err := svc.Claim(ctx, TranslationQueueClaimInput{AssignmentID: created.ID, ClaimerID: "translator_1", ExpectedVersion: created.Version})
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	if claimed.Status != AssignmentStatusInProgress {
		t.Fatalf("expected in_progress, got %q", claimed.Status)
	}

	submitted, err := svc.SubmitReview(ctx, TranslationQueueSubmitInput{AssignmentID: claimed.ID, TranslatorID: "translator_1", ExpectedVersion: claimed.Version})
	if err != nil {
		t.Fatalf("submit_review: %v", err)
	}
	if submitted.Status != AssignmentStatusReview {
		t.Fatalf("expected review, got %q", submitted.Status)
	}

	approved, err := svc.Approve(ctx, TranslationQueueApproveInput{AssignmentID: submitted.ID, ReviewerID: "reviewer_1", ExpectedVersion: submitted.Version})
	if err != nil {
		t.Fatalf("approve: %v", err)
	}
	if approved.Status != AssignmentStatusApproved {
		t.Fatalf("expected approved, got %q", approved.Status)
	}

	archived, err := svc.Archive(ctx, TranslationQueueArchiveInput{AssignmentID: approved.ID, ActorID: "manager_1", ExpectedVersion: approved.Version})
	if err != nil {
		t.Fatalf("archive: %v", err)
	}
	if archived.Status != AssignmentStatusArchived {
		t.Fatalf("expected archived, got %q", archived.Status)
	}
}

func TestDefaultTranslationQueueServiceRejectAndResume(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	svc := &DefaultTranslationQueueService{Repository: repo}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_2",
		EntityType:         "pages",
		SourceRecordID:     "page_2",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	claimed, err := svc.Claim(ctx, TranslationQueueClaimInput{AssignmentID: created.ID, ClaimerID: "translator_1", ExpectedVersion: created.Version})
	if err != nil {
		t.Fatalf("claim: %v", err)
	}
	submitted, err := svc.SubmitReview(ctx, TranslationQueueSubmitInput{AssignmentID: claimed.ID, TranslatorID: "translator_1", ExpectedVersion: claimed.Version})
	if err != nil {
		t.Fatalf("submit_review: %v", err)
	}
	rejected, err := svc.Reject(ctx, TranslationQueueRejectInput{AssignmentID: submitted.ID, ReviewerID: "reviewer_1", Reason: "missing glossary", ExpectedVersion: submitted.Version})
	if err != nil {
		t.Fatalf("reject: %v", err)
	}
	if rejected.Status != AssignmentStatusRejected {
		t.Fatalf("expected rejected, got %q", rejected.Status)
	}

	resumed, err := svc.Claim(ctx, TranslationQueueClaimInput{AssignmentID: rejected.ID, ClaimerID: "translator_1", ExpectedVersion: rejected.Version})
	if err != nil {
		t.Fatalf("claim after reject: %v", err)
	}
	if resumed.Status != AssignmentStatusInProgress {
		t.Fatalf("expected in_progress after reject->claim, got %q", resumed.Status)
	}
}

func TestDefaultTranslationQueueServiceAssignRelease(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	svc := &DefaultTranslationQueueService{Repository: repo}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_3",
		EntityType:         "posts",
		SourceRecordID:     "post_1",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	assigned, err := svc.Assign(ctx, TranslationQueueAssignInput{
		AssignmentID:    created.ID,
		AssigneeID:      "translator_2",
		AssignerID:      "manager_1",
		Priority:        PriorityHigh,
		ExpectedVersion: created.Version,
	})
	if err != nil {
		t.Fatalf("assign: %v", err)
	}
	if assigned.Status != AssignmentStatusAssigned || assigned.AssignmentType != AssignmentTypeDirect {
		t.Fatalf("expected assigned/direct, got status=%q type=%q", assigned.Status, assigned.AssignmentType)
	}

	released, err := svc.Release(ctx, TranslationQueueReleaseInput{AssignmentID: assigned.ID, ActorID: "manager_1", ExpectedVersion: assigned.Version})
	if err != nil {
		t.Fatalf("release: %v", err)
	}
	if released.Status != AssignmentStatusPending || released.AssignmentType != AssignmentTypeOpenPool {
		t.Fatalf("expected pending/open_pool, got status=%q type=%q", released.Status, released.AssignmentType)
	}
	if released.AssigneeID != "" {
		t.Fatalf("expected assignee cleared on release, got %q", released.AssigneeID)
	}
}

func TestDefaultTranslationQueueServiceRejectRequiresReviewState(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	svc := &DefaultTranslationQueueService{Repository: repo}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_4",
		EntityType:         "pages",
		SourceRecordID:     "page_4",
		SourceLocale:       "en",
		TargetLocale:       "de",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	_, err = svc.Reject(ctx, TranslationQueueRejectInput{AssignmentID: created.ID, ReviewerID: "reviewer_1", Reason: "nope", ExpectedVersion: created.Version})
	if err == nil {
		t.Fatalf("expected invalid transition error")
	}
}
