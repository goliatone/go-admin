package modules

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestLandingOverviewBuildsStatsAndRecentRows(t *testing.T) {
	ctx := context.Background()
	scope := defaultModuleScope
	store := stores.NewInMemoryStore()

	module := &ESignModule{
		store:        store,
		defaultScope: scope,
	}

	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                 "doc-landing-overview",
		Title:              "Landing Overview Source",
		SourceObjectKey:    "tenant/tenant-bootstrap/org/org-bootstrap/docs/landing-overview.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SizeBytes:          1024,
		PageCount:          1,
	})
	if err != nil {
		t.Fatalf("create document: %v", err)
	}

	oldDraft, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:         "agreement-landing-old-draft",
		DocumentID: document.ID,
		Title:      "Old Draft",
	})
	if err != nil {
		t.Fatalf("create old draft: %v", err)
	}
	addRecipientToAgreement(t, store, scope, oldDraft.ID, "old-draft@example.com", "Old Draft Signer")

	pending, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:         "agreement-landing-pending",
		DocumentID: document.ID,
		Title:      "Pending Agreement",
	})
	if err != nil {
		t.Fatalf("create pending draft: %v", err)
	}
	addRecipientToAgreement(t, store, scope, pending.ID, "pending@example.com", "Pending Signer")
	_, transitionErr := store.Transition(ctx, scope, pending.ID, stores.AgreementTransitionInput{
		ToStatus: stores.AgreementStatusSent,
	})
	if transitionErr != nil {
		t.Fatalf("transition pending agreement to sent: %v", transitionErr)
	}

	completed, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:         "agreement-landing-completed",
		DocumentID: document.ID,
		Title:      "Completed Agreement",
	})
	if err != nil {
		t.Fatalf("create completed draft: %v", err)
	}
	addRecipientToAgreement(t, store, scope, completed.ID, "completed.one@example.com", "Completed One")
	addRecipientToAgreement(t, store, scope, completed.ID, "completed.two@example.com", "Completed Two")
	_, transitionErr = store.Transition(ctx, scope, completed.ID, stores.AgreementTransitionInput{
		ToStatus: stores.AgreementStatusCompleted,
	})
	if transitionErr != nil {
		t.Fatalf("transition completed agreement to completed: %v", transitionErr)
	}

	stats, recent, err := module.LandingOverview(ctx, scope, 2)
	if err != nil {
		t.Fatalf("LandingOverview: %v", err)
	}

	if got := stats["total"]; got != 3 {
		t.Fatalf("expected total=3, got %d", got)
	}
	if got := stats["draft"]; got != 1 {
		t.Fatalf("expected draft=1, got %d", got)
	}
	if got := stats["pending"]; got != 1 {
		t.Fatalf("expected pending=1, got %d", got)
	}
	if got := stats["completed"]; got != 1 {
		t.Fatalf("expected completed=1, got %d", got)
	}
	if got := stats["action_required"]; got != 1 {
		t.Fatalf("expected action_required=1, got %d", got)
	}

	if len(recent) != 2 {
		t.Fatalf("expected 2 recent agreements, got %d (%+v)", len(recent), recent)
	}
	if got := strings.TrimSpace(toString(recent[0]["id"])); got != completed.ID {
		t.Fatalf("expected first recent agreement id %q, got %q", completed.ID, got)
	}
	if got := strings.TrimSpace(toString(recent[0]["title"])); got != completed.Title {
		t.Fatalf("expected first recent agreement title %q, got %q", completed.Title, got)
	}
	if got := toInt(recent[0]["recipient_count"]); got != 2 {
		t.Fatalf("expected first recent agreement recipient_count=2, got %d", got)
	}
	if got := strings.TrimSpace(toString(recent[1]["id"])); got != pending.ID {
		t.Fatalf("expected second recent agreement id %q, got %q", pending.ID, got)
	}
	if got := toInt(recent[1]["recipient_count"]); got != 1 {
		t.Fatalf("expected second recent agreement recipient_count=1, got %d", got)
	}
}

func TestLandingOverviewUsesReviewPresentationStatusForRecentRows(t *testing.T) {
	ctx := context.Background()
	scope := defaultModuleScope
	store := stores.NewInMemoryStore()

	module := &ESignModule{
		store:        store,
		defaultScope: scope,
	}

	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                 "doc-landing-review-status",
		Title:              "Landing Review Status Source",
		SourceObjectKey:    "tenant/tenant-bootstrap/org/org-bootstrap/docs/landing-review-status.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("b", 64),
		SizeBytes:          1024,
		PageCount:          1,
	})
	if err != nil {
		t.Fatalf("create document: %v", err)
	}

	reviewStatus := stores.AgreementReviewStatusChangesRequested
	agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:           "agreement-landing-changes-requested",
		DocumentID:   document.ID,
		Title:        "Needs Review Updates",
		ReviewStatus: reviewStatus,
	})
	if err != nil {
		t.Fatalf("create agreement: %v", err)
	}
	addRecipientToAgreement(t, store, scope, agreement.ID, "reviewer@example.com", "Reviewer")

	_, recent, err := module.LandingOverview(ctx, scope, 1)
	if err != nil {
		t.Fatalf("LandingOverview: %v", err)
	}
	if len(recent) != 1 {
		t.Fatalf("expected 1 recent agreement, got %d (%+v)", len(recent), recent)
	}
	if got := strings.TrimSpace(toString(recent[0]["status"])); got != stores.AgreementStatusDraft {
		t.Fatalf("expected raw status %q, got %q", stores.AgreementStatusDraft, got)
	}
	if got := strings.TrimSpace(toString(recent[0]["presentation_status"])); got != stores.AgreementReviewStatusChangesRequested {
		t.Fatalf("expected presentation_status %q, got %q", stores.AgreementReviewStatusChangesRequested, got)
	}
	if got := toInt(statsValueForTest(t, module, ctx, scope, "action_required")); got != 1 {
		t.Fatalf("expected action_required=1 for changes requested agreement, got %d", got)
	}
}

func statsValueForTest(t *testing.T, module *ESignModule, ctx context.Context, scope stores.Scope, key string) any {
	t.Helper()
	stats, _, err := module.LandingOverview(ctx, scope, 1)
	if err != nil {
		t.Fatalf("LandingOverview stats: %v", err)
	}
	return stats[key]
}

func addRecipientToAgreement(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, agreementID, email, name string) {
	t.Helper()
	role := stores.RecipientRoleSigner
	if _, err := store.UpsertRecipientDraft(context.Background(), scope, agreementID, stores.RecipientDraftPatch{
		Email: &email,
		Name:  &name,
		Role:  &role,
	}, 0); err != nil {
		t.Fatalf("upsert recipient for agreement %q: %v", agreementID, err)
	}
}

func toInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}
