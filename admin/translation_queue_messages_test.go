package admin

import "testing"

func TestTranslationQueueMessageTypesAreStable(t *testing.T) {
	tests := []struct {
		name string
		got  string
		want string
	}{
		{name: "claim", got: (TranslationQueueClaimInput{}).Type(), want: translationQueueClaimCommandName},
		{name: "assign", got: (TranslationQueueAssignInput{}).Type(), want: translationQueueAssignCommandName},
		{name: "release", got: (TranslationQueueReleaseInput{}).Type(), want: translationQueueReleaseCommandName},
		{name: "submit", got: (TranslationQueueSubmitInput{}).Type(), want: translationQueueSubmitCommandName},
		{name: "approve", got: (TranslationQueueApproveInput{}).Type(), want: translationQueueApproveCommandName},
		{name: "reject", got: (TranslationQueueRejectInput{}).Type(), want: translationQueueRejectCommandName},
		{name: "archive", got: (TranslationQueueArchiveInput{}).Type(), want: translationQueueArchiveCommandName},
		{name: "bulk_assign", got: (TranslationQueueBulkAssignInput{}).Type(), want: translationQueueBulkAssignCommandName},
		{name: "bulk_release", got: (TranslationQueueBulkReleaseInput{}).Type(), want: translationQueueBulkReleaseCommandName},
		{name: "bulk_priority", got: (TranslationQueueBulkPriorityInput{}).Type(), want: translationQueueBulkPriorityCommandName},
		{name: "bulk_archive", got: (TranslationQueueBulkArchiveInput{}).Type(), want: translationQueueBulkArchiveCommandName},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if tc.got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, tc.got)
			}
		})
	}
}

func TestTranslationQueueMessageValidate(t *testing.T) {
	if err := (TranslationQueueClaimInput{AssignmentID: "a1", ClaimerID: "u1", ExpectedVersion: 1}).Validate(); err != nil {
		t.Fatalf("expected valid claim input, got %v", err)
	}
	if err := (TranslationQueueRejectInput{AssignmentID: "a1", ReviewerID: "u1", Reason: "needs changes", ExpectedVersion: 1}).Validate(); err != nil {
		t.Fatalf("expected valid reject input, got %v", err)
	}
	if err := (TranslationQueueBulkPriorityInput{AssignmentIDs: []string{"a1"}, Priority: PriorityHigh, ActorID: "u1"}).Validate(); err != nil {
		t.Fatalf("expected valid bulk priority input, got %v", err)
	}

	invalid := []struct {
		name string
		err  error
	}{
		{name: "claim missing version", err: (TranslationQueueClaimInput{AssignmentID: "a1", ClaimerID: "u1"}).Validate()},
		{name: "assign missing assignee", err: (TranslationQueueAssignInput{AssignmentID: "a1", AssignerID: "u1", ExpectedVersion: 1}).Validate()},
		{name: "reject missing reason", err: (TranslationQueueRejectInput{AssignmentID: "a1", ReviewerID: "u1", ExpectedVersion: 1}).Validate()},
		{name: "bulk release missing ids", err: (TranslationQueueBulkReleaseInput{ActorID: "u1"}).Validate()},
		{name: "bulk priority invalid", err: (TranslationQueueBulkPriorityInput{AssignmentIDs: []string{"a1"}, Priority: Priority(""), ActorID: "u1"}).Validate()},
	}

	for _, tc := range invalid {
		t.Run(tc.name, func(t *testing.T) {
			if tc.err == nil {
				t.Fatalf("expected validation error")
			}
		})
	}
}
