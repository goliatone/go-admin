package admin

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
)

func TestDefaultTranslationQueueAutoCreateHookCreatesAssignmentsForMissingLocales(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: repo,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	input := TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		EntityID:           "page_123",
		SourceLocale:       "en",
		MissingLocales:     []string{"es", "fr"},
		Transition:         "publish",
		Environment:        "production",
		SourceTitle:        "Test Page",
		SourcePath:         "/test",
		Priority:           PriorityNormal,
	}

	result := hook.OnTranslationBlocker(context.Background(), input)

	if result.Created != 2 {
		t.Fatalf("expected 2 created assignments, got %d", result.Created)
	}
	if result.Reused != 0 {
		t.Fatalf("expected 0 reused assignments, got %d", result.Reused)
	}
	if result.Failed != 0 {
		t.Fatalf("expected 0 failed assignments, got %d", result.Failed)
	}
	if len(result.Assignments) != 2 {
		t.Fatalf("expected 2 assignments, got %d", len(result.Assignments))
	}

	// Verify assignments are in pending status with open pool type
	for _, a := range result.Assignments {
		if a.Status != AssignmentStatusPending {
			t.Errorf("expected pending status, got %s", a.Status)
		}
		if a.AssignmentType != AssignmentTypeOpenPool {
			t.Errorf("expected open_pool type, got %s", a.AssignmentType)
		}
		if a.TranslationGroupID != "tg_123" {
			t.Errorf("expected translation_group_id tg_123, got %s", a.TranslationGroupID)
		}
	}
}

func TestDefaultTranslationQueueAutoCreateHookReusesExistingActiveAssignment(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: repo,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	input := TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		EntityID:           "page_123",
		SourceLocale:       "en",
		MissingLocales:     []string{"es"},
		Transition:         "publish",
		SourceTitle:        "Test Page",
	}

	// First call creates
	result1 := hook.OnTranslationBlocker(context.Background(), input)
	if result1.Created != 1 {
		t.Fatalf("expected 1 created, got %d", result1.Created)
	}

	// Second call should reuse
	result2 := hook.OnTranslationBlocker(context.Background(), input)
	if result2.Reused != 1 {
		t.Fatalf("expected 1 reused, got %d", result2.Reused)
	}
	if result2.Created != 0 {
		t.Fatalf("expected 0 created on reuse, got %d", result2.Created)
	}

	// Verify same assignment ID
	if result1.Assignments[0].ID != result2.Assignments[0].ID {
		t.Fatalf("expected same assignment ID, got %s vs %s",
			result1.Assignments[0].ID, result2.Assignments[0].ID)
	}
}

func TestDefaultTranslationQueueAutoCreateHookSkipsEmptyInput(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: repo,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	// Missing translation_group_id
	result := hook.OnTranslationBlocker(context.Background(), TranslationQueueAutoCreateInput{
		EntityType:     "pages",
		EntityID:       "page_123",
		MissingLocales: []string{"es"},
	})
	if result.Created != 0 || result.Reused != 0 {
		t.Fatalf("expected no operations for empty group ID, got created=%d reused=%d",
			result.Created, result.Reused)
	}

	// Missing entity_id
	result = hook.OnTranslationBlocker(context.Background(), TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		MissingLocales:     []string{"es"},
	})
	if result.Created != 0 || result.Reused != 0 {
		t.Fatalf("expected no operations for empty entity ID, got created=%d reused=%d",
			result.Created, result.Reused)
	}

	// Missing locales
	result = hook.OnTranslationBlocker(context.Background(), TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		EntityID:           "page_123",
	})
	if result.Created != 0 || result.Reused != 0 {
		t.Fatalf("expected no operations for empty missing locales, got created=%d reused=%d",
			result.Created, result.Reused)
	}
}

func TestDefaultTranslationQueueAutoCreateHookSkipsSourceLocale(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: repo,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	// Source locale "en" should be skipped when it appears in missing locales
	result := hook.OnTranslationBlocker(context.Background(), TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		EntityID:           "page_123",
		SourceLocale:       "en",
		MissingLocales:     []string{"en", "es"},
	})

	if result.Created != 1 {
		t.Fatalf("expected 1 created (es only), got %d", result.Created)
	}
	if result.Assignments[0].TargetLocale != "es" {
		t.Fatalf("expected target locale 'es', got %s", result.Assignments[0].TargetLocale)
	}
}

func TestDefaultTranslationQueueAutoCreateHookNilRepositoryNoOp(t *testing.T) {
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: nil,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	result := hook.OnTranslationBlocker(context.Background(), TranslationQueueAutoCreateInput{
		TranslationGroupID: "tg_123",
		EntityType:         "pages",
		EntityID:           "page_123",
		MissingLocales:     []string{"es"},
	})

	if result.Created != 0 || result.Reused != 0 || result.Failed != 0 {
		t.Fatalf("expected no operations for nil repository")
	}
}

func TestTranslationQueueAutoCreateHookFromErrorExtractsInput(t *testing.T) {
	err := MissingTranslationsError{
		EntityType:      "pages",
		EntityID:        "page_123",
		Transition:      "publish",
		Environment:     "production",
		RequestedLocale: "en",
		MissingLocales:  []string{"es", "fr"},
	}

	record := map[string]any{
		"translation_group_id": "tg_123",
		"title":                "Test Page",
		"path":                 "/test",
	}

	policyInput := TranslationPolicyInput{
		EntityType:  "pages",
		EntityID:    "page_123",
		Transition:  "publish",
		Environment: "production",
	}

	input, ok := translationQueueAutoCreateHookFromError(err, policyInput, record)

	if !ok {
		t.Fatal("expected extraction to succeed")
	}
	if input.TranslationGroupID != "tg_123" {
		t.Errorf("expected group ID tg_123, got %s", input.TranslationGroupID)
	}
	if input.EntityType != "pages" {
		t.Errorf("expected entity type pages, got %s", input.EntityType)
	}
	if input.SourceLocale != "en" {
		t.Errorf("expected source locale en, got %s", input.SourceLocale)
	}
	if len(input.MissingLocales) != 2 {
		t.Errorf("expected 2 missing locales, got %d", len(input.MissingLocales))
	}
}

func TestTranslationQueueAutoCreateHookFromErrorRejectsNonTranslationError(t *testing.T) {
	err := errors.New("generic error")
	record := map[string]any{"translation_group_id": "tg_123"}
	policyInput := TranslationPolicyInput{}

	_, ok := translationQueueAutoCreateHookFromError(err, policyInput, record)
	if ok {
		t.Fatal("expected extraction to fail for non-translation error")
	}
}

func TestTranslationQueueAutoCreateHookFromErrorRejectsEmptyMissingLocales(t *testing.T) {
	err := MissingTranslationsError{
		EntityType:     "pages",
		MissingLocales: []string{},
	}
	record := map[string]any{"translation_group_id": "tg_123"}
	policyInput := TranslationPolicyInput{}

	_, ok := translationQueueAutoCreateHookFromError(err, policyInput, record)
	if ok {
		t.Fatal("expected extraction to fail for empty missing locales")
	}
}

func TestTranslationQueueAutoCreateHookFromErrorRejectsMissingGroupID(t *testing.T) {
	err := MissingTranslationsError{
		EntityType:     "pages",
		MissingLocales: []string{"es"},
	}
	record := map[string]any{} // no translation_group_id
	policyInput := TranslationPolicyInput{}

	_, ok := translationQueueAutoCreateHookFromError(err, policyInput, record)
	if ok {
		t.Fatal("expected extraction to fail for missing group ID")
	}
}

func TestApplyTranslationPolicyWithQueueHookTriggersHookOnBlocker(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: repo,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	policy := TranslationPolicyFunc(func(_ context.Context, _ TranslationPolicyInput) error {
		return MissingTranslationsError{
			EntityType:      "pages",
			EntityID:        "page_123",
			Transition:      "publish",
			RequestedLocale: "en",
			MissingLocales:  []string{"es", "fr"},
		}
	})

	record := map[string]any{
		"id":                   "page_123",
		"translation_group_id": "tg_123",
		"title":                "Test",
	}

	input := TranslationPolicyInput{
		EntityType: "pages",
		EntityID:   "page_123",
		Transition: "publish",
	}

	err := applyTranslationPolicyWithQueueHook(context.Background(), policy, input, record, hook)

	// Error should still be returned
	if err == nil {
		t.Fatal("expected error to be returned")
	}
	var missing MissingTranslationsError
	if !errors.As(err, &missing) {
		t.Fatal("expected MissingTranslationsError")
	}

	// But queue items should have been created
	assignments, count, _ := repo.List(context.Background(), ListOptions{PerPage: 100})
	if count != 2 {
		t.Fatalf("expected 2 queue assignments, got %d", count)
	}

	locales := map[string]bool{}
	for _, a := range assignments {
		locales[a.TargetLocale] = true
	}
	if !locales["es"] || !locales["fr"] {
		t.Fatalf("expected queue assignments for es and fr, got %v", locales)
	}
}

func TestApplyTranslationPolicyWithQueueHookNoHookPassesThrough(t *testing.T) {
	policy := TranslationPolicyFunc(func(_ context.Context, _ TranslationPolicyInput) error {
		return MissingTranslationsError{
			EntityType:     "pages",
			MissingLocales: []string{"es"},
		}
	})

	record := map[string]any{"translation_group_id": "tg_123"}
	input := TranslationPolicyInput{EntityType: "pages", EntityID: "page_123"}

	// nil hook should not panic
	err := applyTranslationPolicyWithQueueHook(context.Background(), policy, input, record, nil)

	if err == nil {
		t.Fatal("expected error to be returned")
	}
}

func TestApplyTranslationPolicyWithQueueHookSuccessNoHookTrigger(t *testing.T) {
	repo := NewInMemoryTranslationAssignmentRepository()
	hook := &DefaultTranslationQueueAutoCreateHook{
		Repository: repo,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	policy := TranslationPolicyFunc(func(_ context.Context, _ TranslationPolicyInput) error {
		return nil // success
	})

	record := map[string]any{"translation_group_id": "tg_123"}
	input := TranslationPolicyInput{EntityType: "pages", EntityID: "page_123"}

	err := applyTranslationPolicyWithQueueHook(context.Background(), policy, input, record, hook)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// No queue items should be created on success
	_, count, _ := repo.List(context.Background(), ListOptions{PerPage: 100})
	if count != 0 {
		t.Fatalf("expected 0 queue assignments on success, got %d", count)
	}
}
