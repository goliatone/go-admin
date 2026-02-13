package admin

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
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

func TestDefaultTranslationQueueServiceEmitsQueueActivityAndNotificationHooks(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	activity := NewActivityFeed()
	notifications := NewInMemoryNotificationService()
	cfg := applyConfigDefaults(Config{BasePath: "/admin", DefaultLocale: "en"})
	urls, err := newURLManager(cfg)
	if err != nil {
		t.Fatalf("new url manager: %v", err)
	}
	svc := &DefaultTranslationQueueService{
		Repository:    repo,
		Activity:      activity,
		Notifications: notifications,
		URLs:          urls,
	}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_5",
		EntityType:         "pages",
		SourceRecordID:     "page_5",
		SourceLocale:       "en",
		TargetLocale:       "es",
		SourceTitle:        "Home",
		SourcePath:         "/home",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	_, err = svc.Assign(ctx, TranslationQueueAssignInput{
		AssignmentID:    created.ID,
		AssigneeID:      "translator_5",
		AssignerID:      "manager_5",
		ExpectedVersion: created.Version,
	})
	if err != nil {
		t.Fatalf("assign: %v", err)
	}

	entries, err := activity.List(ctx, 10)
	if err != nil {
		t.Fatalf("activity list: %v", err)
	}
	if len(entries) == 0 {
		t.Fatalf("expected at least one activity entry")
	}
	if entries[0].Action != "translation.queue.assigned" {
		t.Fatalf("expected translation.queue.assigned activity, got %q", entries[0].Action)
	}
	if entries[0].Metadata["resolver_key"] != translationQueueResolverKey {
		t.Fatalf("expected resolver metadata key, got %+v", entries[0].Metadata)
	}
	if entries[0].Metadata["source_title"] != "Home" || entries[0].Metadata["source_path"] != "/home" {
		t.Fatalf("expected source snapshot metadata, got %+v", entries[0].Metadata)
	}

	items, err := notifications.List(ctx)
	if err != nil {
		t.Fatalf("notifications list: %v", err)
	}
	if len(items) == 0 {
		t.Fatalf("expected assignment notification")
	}
	if items[0].UserID != "translator_5" {
		t.Fatalf("expected notification user translator_5, got %q", items[0].UserID)
	}
	if !strings.HasPrefix(items[0].ActionURL, "/admin/content/translations") {
		t.Fatalf("expected resolver-based queue URL, got %q", items[0].ActionURL)
	}
	if items[0].Metadata["resolver_key"] != translationQueueResolverKey {
		t.Fatalf("expected resolver metadata on notification, got %+v", items[0].Metadata)
	}
}

func TestDefaultTranslationQueueServiceClaimRejectResumeApprovePublishFlow(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	svc := &DefaultTranslationQueueService{Repository: repo}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_flow",
		EntityType:         "pages",
		SourceRecordID:     "page_flow",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	claimed, err := svc.Claim(ctx, TranslationQueueClaimInput{
		AssignmentID:    created.ID,
		ClaimerID:       "translator_1",
		ExpectedVersion: created.Version,
	})
	if err != nil {
		t.Fatalf("claim: %v", err)
	}

	submitted, err := svc.SubmitReview(ctx, TranslationQueueSubmitInput{
		AssignmentID:    claimed.ID,
		TranslatorID:    "translator_1",
		ExpectedVersion: claimed.Version,
	})
	if err != nil {
		t.Fatalf("submit review: %v", err)
	}

	rejected, err := svc.Reject(ctx, TranslationQueueRejectInput{
		AssignmentID:    submitted.ID,
		ReviewerID:      "reviewer_1",
		Reason:          "style guide mismatch",
		ExpectedVersion: submitted.Version,
	})
	if err != nil {
		t.Fatalf("reject: %v", err)
	}

	resumed, err := svc.Claim(ctx, TranslationQueueClaimInput{
		AssignmentID:    rejected.ID,
		ClaimerID:       "translator_1",
		ExpectedVersion: rejected.Version,
	})
	if err != nil {
		t.Fatalf("resume claim: %v", err)
	}

	resubmitted, err := svc.SubmitReview(ctx, TranslationQueueSubmitInput{
		AssignmentID:    resumed.ID,
		TranslatorID:    "translator_1",
		ExpectedVersion: resumed.Version,
	})
	if err != nil {
		t.Fatalf("resubmit review: %v", err)
	}

	approved, err := svc.Approve(ctx, TranslationQueueApproveInput{
		AssignmentID:    resubmitted.ID,
		ReviewerID:      "reviewer_1",
		ExpectedVersion: resubmitted.Version,
	})
	if err != nil {
		t.Fatalf("approve: %v", err)
	}
	if approved.Status != AssignmentStatusApproved {
		t.Fatalf("expected approved status, got %q", approved.Status)
	}

	approved.PublishedAt = func() *time.Time { now := time.Now().UTC(); return &now }()
	approved.Status = AssignmentStatusPublished
	published, err := repo.Update(ctx, approved, approved.Version)
	if err != nil {
		t.Fatalf("publish status update: %v", err)
	}
	if published.Status != AssignmentStatusPublished {
		t.Fatalf("expected published status, got %q", published.Status)
	}
	if !published.Status.IsTerminal() {
		t.Fatalf("expected published status to be terminal")
	}
}

func TestDefaultTranslationQueueServiceClaimDetectsOptimisticLockRace(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	svc := &DefaultTranslationQueueService{Repository: repo}
	ctx := context.Background()

	created, err := repo.Create(ctx, TranslationAssignment{
		TranslationGroupID: "tg_race",
		EntityType:         "pages",
		SourceRecordID:     "page_race",
		SourceLocale:       "en",
		TargetLocale:       "fr",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
	})
	if err != nil {
		t.Fatalf("create assignment: %v", err)
	}

	created.SourceTitle = "stale-write"
	if _, err := repo.Update(ctx, created, created.Version); err != nil {
		t.Fatalf("seed optimistic lock change: %v", err)
	}

	_, err = svc.Claim(ctx, TranslationQueueClaimInput{
		AssignmentID:    created.ID,
		ClaimerID:       "translator_1",
		ExpectedVersion: created.Version,
	})
	if err == nil {
		t.Fatalf("expected optimistic lock conflict on stale claim")
	}
	if !errors.Is(err, ErrTranslationAssignmentVersionConflict) {
		t.Fatalf("expected ErrTranslationAssignmentVersionConflict, got %v", err)
	}
}
