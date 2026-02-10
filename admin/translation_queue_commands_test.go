package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command/registry"
)

type stubTranslationQueueService struct {
	claimResult      TranslationAssignment
	bulkAssignResult []TranslationAssignment

	claimCalls      int
	bulkAssignCalls int
}

func (s *stubTranslationQueueService) Claim(_ context.Context, _ TranslationQueueClaimInput) (TranslationAssignment, error) {
	s.claimCalls++
	return s.claimResult, nil
}

func (s *stubTranslationQueueService) Assign(_ context.Context, _ TranslationQueueAssignInput) (TranslationAssignment, error) {
	return TranslationAssignment{}, nil
}

func (s *stubTranslationQueueService) Release(_ context.Context, _ TranslationQueueReleaseInput) (TranslationAssignment, error) {
	return TranslationAssignment{}, nil
}

func (s *stubTranslationQueueService) SubmitReview(_ context.Context, _ TranslationQueueSubmitInput) (TranslationAssignment, error) {
	return TranslationAssignment{}, nil
}

func (s *stubTranslationQueueService) Approve(_ context.Context, _ TranslationQueueApproveInput) (TranslationAssignment, error) {
	return TranslationAssignment{}, nil
}

func (s *stubTranslationQueueService) Reject(_ context.Context, _ TranslationQueueRejectInput) (TranslationAssignment, error) {
	return TranslationAssignment{}, nil
}

func (s *stubTranslationQueueService) Archive(_ context.Context, _ TranslationQueueArchiveInput) (TranslationAssignment, error) {
	return TranslationAssignment{}, nil
}

func (s *stubTranslationQueueService) BulkAssign(_ context.Context, _ TranslationQueueBulkAssignInput) ([]TranslationAssignment, error) {
	s.bulkAssignCalls++
	return s.bulkAssignResult, nil
}

func (s *stubTranslationQueueService) BulkRelease(_ context.Context, _ TranslationQueueBulkReleaseInput) ([]TranslationAssignment, error) {
	return nil, nil
}

func (s *stubTranslationQueueService) BulkPriority(_ context.Context, _ TranslationQueueBulkPriorityInput) ([]TranslationAssignment, error) {
	return nil, nil
}

func (s *stubTranslationQueueService) BulkArchive(_ context.Context, _ TranslationQueueBulkArchiveInput) ([]TranslationAssignment, error) {
	return nil, nil
}

func TestTranslationQueueClaimCommandPopulatesResult(t *testing.T) {
	service := &stubTranslationQueueService{claimResult: TranslationAssignment{ID: "tqa_1", Status: AssignmentStatusInProgress}}
	cmd := &TranslationQueueClaimCommand{Service: service}

	var out TranslationAssignment
	err := cmd.Execute(context.Background(), TranslationQueueClaimInput{
		AssignmentID:    "tqa_1",
		ClaimerID:       "user_1",
		ExpectedVersion: 1,
		Result:          &out,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if service.claimCalls != 1 {
		t.Fatalf("expected claim to be called once, got %d", service.claimCalls)
	}
	if out.ID != "tqa_1" || out.Status != AssignmentStatusInProgress {
		t.Fatalf("unexpected output assignment: %+v", out)
	}
}

func TestTranslationQueueBulkAssignCommandPopulatesResult(t *testing.T) {
	service := &stubTranslationQueueService{bulkAssignResult: []TranslationAssignment{{ID: "tqa_1"}, {ID: "tqa_2"}}}
	cmd := &TranslationQueueBulkAssignCommand{Service: service}

	var out []TranslationAssignment
	err := cmd.Execute(context.Background(), TranslationQueueBulkAssignInput{
		AssignmentIDs: []string{"tqa_1", "tqa_2"},
		AssigneeID:    "translator_1",
		AssignerID:    "manager_1",
		Result:        &out,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if service.bulkAssignCalls != 1 {
		t.Fatalf("expected bulk assign to be called once, got %d", service.bulkAssignCalls)
	}
	if len(out) != 2 {
		t.Fatalf("expected two output assignments, got %d", len(out))
	}
}

func TestRegisterTranslationQueueCommandsDispatchesClaim(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		repo := NewInMemoryTranslationAssignmentRepository()
		svc := &DefaultTranslationQueueService{Repository: repo}
		ctx := context.Background()
		created, err := repo.Create(ctx, TranslationAssignment{
			TranslationGroupID: "tg_cmd_1",
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

		if err := RegisterTranslationQueueCommands(bus, svc); err != nil {
			t.Fatalf("register queue commands: %v", err)
		}
		if err := registry.Start(ctx); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		if err := bus.DispatchByName(ctx, translationQueueClaimCommandName, map[string]any{
			"assignment_id":    created.ID,
			"claimer_id":       "translator_1",
			"expected_version": created.Version,
		}, nil); err != nil {
			t.Fatalf("dispatch claim: %v", err)
		}

		updated, err := repo.Get(ctx, created.ID)
		if err != nil {
			t.Fatalf("get updated assignment: %v", err)
		}
		if updated.Status != AssignmentStatusInProgress {
			t.Fatalf("expected in_progress status, got %q", updated.Status)
		}
	})
}
