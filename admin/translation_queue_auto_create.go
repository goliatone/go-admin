package admin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"time"
)

// TranslationQueueAutoCreateHook handles automatic queue item creation
// when translation policy blocks a transition due to missing locales.
type TranslationQueueAutoCreateHook interface {
	// OnTranslationBlocker is called when a workflow transition is blocked
	// due to missing required translations. It creates or reuses queue assignments
	// for each missing locale. This is a side-effect hook that must not alter
	// the primary policy response - errors are logged but not returned.
	OnTranslationBlocker(ctx context.Context, input TranslationQueueAutoCreateInput) TranslationQueueAutoCreateResult
}

// TranslationQueueAutoCreateInput captures the context needed to create queue items.
type TranslationQueueAutoCreateInput struct {
	FamilyID       string   `json:"family_id"`
	EntityType     string   `json:"entity_type"`
	EntityID       string   `json:"entity_id"`
	SourceLocale   string   `json:"source_locale"`
	MissingLocales []string `json:"missing_locales"`
	Transition     string   `json:"transition"`
	Environment    string   `json:"environment"`
	SourceTitle    string   `json:"source_title"`
	SourcePath     string   `json:"source_path"`
	ActorID        string   `json:"actor_id"`
	Priority       Priority `json:"priority"`
}

// TranslationQueueAutoCreateResult captures the outcome of auto-create operations.
type TranslationQueueAutoCreateResult struct {
	Created     int                     `json:"created"`
	Reused      int                     `json:"reused"`
	Failed      int                     `json:"failed"`
	Errors      []error                 `json:"errors"`
	Assignments []TranslationAssignment `json:"assignments"`
}

// DefaultTranslationQueueAutoCreateHook implements auto-create using the assignment repository.
type DefaultTranslationQueueAutoCreateHook struct {
	Repository TranslationAssignmentRepository `json:"repository"`
	Logger     Logger                          `json:"logger"`
}

// OnTranslationBlocker creates or reuses queue assignments for missing locales.
// Errors are logged but not propagated to preserve primary policy response.
func (h *DefaultTranslationQueueAutoCreateHook) OnTranslationBlocker(ctx context.Context, input TranslationQueueAutoCreateInput) TranslationQueueAutoCreateResult {
	result := TranslationQueueAutoCreateResult{}

	if h == nil || h.Repository == nil {
		return result
	}

	if strings.TrimSpace(input.FamilyID) == "" {
		return result
	}
	if strings.TrimSpace(input.EntityID) == "" {
		return result
	}
	if len(input.MissingLocales) == 0 {
		return result
	}

	logger := h.Logger
	if logger == nil {
		logger = resolveNamedLogger("admin.translation.queue", nil, getTranslationObservabilityLogger())
	}

	sourceLocale := strings.TrimSpace(strings.ToLower(input.SourceLocale))
	if sourceLocale == "" {
		sourceLocale = "en"
	}

	priority := input.Priority
	if !priority.IsValid() {
		priority = PriorityNormal
	}

	for _, targetLocale := range input.MissingLocales {
		targetLocale = strings.TrimSpace(strings.ToLower(targetLocale))
		if targetLocale == "" || targetLocale == sourceLocale {
			continue
		}

		assignment := TranslationAssignment{
			FamilyID:       strings.TrimSpace(input.FamilyID),
			EntityType:     strings.TrimSpace(strings.ToLower(input.EntityType)),
			SourceRecordID: strings.TrimSpace(input.EntityID),
			SourceLocale:   sourceLocale,
			TargetLocale:   targetLocale,
			SourceTitle:    strings.TrimSpace(input.SourceTitle),
			SourcePath:     strings.TrimSpace(input.SourcePath),
			AssignmentType: AssignmentTypeOpenPool,
			Status:         AssignmentStatusOpen,
			Priority:       priority,
			CreatedAt:      time.Now().UTC(),
			UpdatedAt:      time.Now().UTC(),
		}

		created, isNew, err := h.Repository.CreateOrReuseActive(ctx, assignment)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, err)
			logger.Warn("translation queue auto-create failed",
				"event", "translation.queue.auto_create.error",
				"family_id", assignment.FamilyID,
				"entity_type", assignment.EntityType,
				"source_locale", assignment.SourceLocale,
				"target_locale", assignment.TargetLocale,
				"error", err.Error(),
			)
			continue
		}

		result.Assignments = append(result.Assignments, created)
		if isNew {
			result.Created++
			logger.Info("translation queue auto-create success",
				"event", "translation.queue.auto_create.created",
				"assignment_id", created.ID,
				"family_id", created.FamilyID,
				"entity_type", created.EntityType,
				"source_locale", created.SourceLocale,
				"target_locale", created.TargetLocale,
			)
		} else {
			result.Reused++
			logger.Info("translation queue auto-create reused existing",
				"event", "translation.queue.auto_create.reused",
				"assignment_id", created.ID,
				"family_id", created.FamilyID,
				"entity_type", created.EntityType,
				"source_locale", created.SourceLocale,
				"target_locale", created.TargetLocale,
			)
		}
	}

	return result
}

// translationQueueAutoCreateHookFromError extracts auto-create input from a policy error.
func translationQueueAutoCreateHookFromError(err error, policyInput TranslationPolicyInput, record map[string]any) (TranslationQueueAutoCreateInput, bool) {
	var missing MissingTranslationsError
	if !errors.As(err, &missing) {
		return TranslationQueueAutoCreateInput{}, false
	}

	if len(missing.MissingLocales) == 0 {
		return TranslationQueueAutoCreateInput{}, false
	}

	groupID := strings.TrimSpace(toString(record["family_id"]))
	if groupID == "" {
		return TranslationQueueAutoCreateInput{}, false
	}

	return TranslationQueueAutoCreateInput{
		FamilyID:       groupID,
		EntityType:     primitives.FirstNonEmptyRaw(missing.PolicyEntity, missing.EntityType, policyInput.PolicyEntity, policyInput.EntityType),
		EntityID:       primitives.FirstNonEmptyRaw(missing.EntityID, policyInput.EntityID),
		SourceLocale:   primitives.FirstNonEmptyRaw(missing.RequestedLocale, policyInput.RequestedLocale),
		MissingLocales: missing.MissingLocales,
		Transition:     primitives.FirstNonEmptyRaw(missing.Transition, policyInput.Transition),
		Environment:    primitives.FirstNonEmptyRaw(missing.Environment, policyInput.Environment),
		SourceTitle:    strings.TrimSpace(toString(record["title"])),
		SourcePath:     strings.TrimSpace(toString(record["path"])),
		Priority:       PriorityNormal,
	}, true
}

// applyTranslationPolicyWithQueueHook extends applyTranslationPolicy to trigger
// queue auto-create when configured and a translation blocker is detected.
func applyTranslationPolicyWithQueueHook(
	ctx context.Context,
	policy TranslationPolicy,
	input TranslationPolicyInput,
	record map[string]any,
	queueHook TranslationQueueAutoCreateHook,
) error {
	err := applyTranslationPolicy(ctx, policy, input)
	if err == nil {
		return nil
	}

	// If queue hook is configured and error is a translation blocker,
	// trigger queue auto-create as a non-blocking side-effect.
	if queueHook != nil {
		if autoInput, ok := translationQueueAutoCreateHookFromError(err, input, record); ok {
			// Fire and forget - do not block primary error response
			queueHook.OnTranslationBlocker(ctx, autoInput)
		}
	}

	return err
}
