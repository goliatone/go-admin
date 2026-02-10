package admin

import "testing"

func TestAssignmentTypeIsValid(t *testing.T) {
	if !AssignmentTypeDirect.IsValid() {
		t.Fatalf("expected direct assignment type to be valid")
	}
	if !AssignmentTypeOpenPool.IsValid() {
		t.Fatalf("expected open_pool assignment type to be valid")
	}
	if AssignmentType("bogus").IsValid() {
		t.Fatalf("expected unknown assignment type to be invalid")
	}
}

func TestAssignmentStatusValidationAndTerminalState(t *testing.T) {
	if !AssignmentStatusPending.IsValid() {
		t.Fatalf("expected pending status to be valid")
	}
	if AssignmentStatus("invalid").IsValid() {
		t.Fatalf("expected unknown status to be invalid")
	}
	if !AssignmentStatusPublished.IsTerminal() {
		t.Fatalf("expected published status to be terminal")
	}
	if !AssignmentStatusArchived.IsTerminal() {
		t.Fatalf("expected archived status to be terminal")
	}
	if AssignmentStatusReview.IsTerminal() {
		t.Fatalf("expected review status to be non-terminal")
	}
}

func TestAssignmentPriorityIsValid(t *testing.T) {
	if !PriorityNormal.IsValid() {
		t.Fatalf("expected normal priority to be valid")
	}
	if Priority("invalid").IsValid() {
		t.Fatalf("expected unknown priority to be invalid")
	}
}

func TestTranslationAssignmentActiveUniquenessKeyNormalizesInput(t *testing.T) {
	assignment := TranslationAssignment{
		TranslationGroupID: " TG_123 ",
		EntityType:         " Pages ",
		SourceLocale:       " EN ",
		TargetLocale:       " ES ",
	}
	if got := assignment.ActiveUniquenessKey(); got != "tg_123:pages:en:es" {
		t.Fatalf("expected normalized active key, got %q", got)
	}
}

func TestTranslationAssignmentValidate(t *testing.T) {
	valid := TranslationAssignment{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		SourceRecordID:     "page_123",
		SourceLocale:       "en",
		TargetLocale:       "es",
		AssignmentType:     AssignmentTypeOpenPool,
		Status:             AssignmentStatusPending,
		Priority:           PriorityNormal,
		Version:            0,
	}

	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid assignment, got %v", err)
	}

	cases := []struct {
		name       string
		assignment TranslationAssignment
	}{
		{
			name: "missing translation group id",
			assignment: func() TranslationAssignment {
				a := valid
				a.TranslationGroupID = ""
				return a
			}(),
		},
		{
			name: "invalid assignment type",
			assignment: func() TranslationAssignment {
				a := valid
				a.AssignmentType = AssignmentType("invalid")
				return a
			}(),
		},
		{
			name: "invalid status",
			assignment: func() TranslationAssignment {
				a := valid
				a.Status = AssignmentStatus("invalid")
				return a
			}(),
		},
		{
			name: "invalid priority",
			assignment: func() TranslationAssignment {
				a := valid
				a.Priority = Priority("invalid")
				return a
			}(),
		},
		{
			name: "negative version",
			assignment: func() TranslationAssignment {
				a := valid
				a.Version = -1
				return a
			}(),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := tc.assignment.Validate(); err == nil {
				t.Fatalf("expected validation error")
			}
		})
	}
}
