package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"strconv"
	"strings"
	"time"
)

// RegisterTranslationQueueCommandFactories installs name-based message factories for queue commands.
func RegisterTranslationQueueCommandFactories(bus *CommandBus) error {
	if err := RegisterMessageFactory(bus, translationQueueClaimCommandName, buildTranslationQueueClaimInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueAssignCommandName, buildTranslationQueueAssignInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueReleaseCommandName, buildTranslationQueueReleaseInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueSubmitCommandName, buildTranslationQueueSubmitInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueApproveCommandName, buildTranslationQueueApproveInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueRejectCommandName, buildTranslationQueueRejectInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueArchiveCommandName, buildTranslationQueueArchiveInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueBulkAssignCommandName, buildTranslationQueueBulkAssignInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueBulkReleaseCommandName, buildTranslationQueueBulkReleaseInput); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, translationQueueBulkPriorityCommandName, buildTranslationQueueBulkPriorityInput); err != nil {
		return err
	}
	return RegisterMessageFactory(bus, translationQueueBulkArchiveCommandName, buildTranslationQueueBulkArchiveInput)
}

func buildTranslationQueueClaimInput(payload map[string]any, ids []string) (TranslationQueueClaimInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueClaimInput{}, err
	}
	msg := TranslationQueueClaimInput{
		AssignmentID:    assignmentID,
		ClaimerID:       strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["claimer_id"]), toString(payload["user_id"]), toString(payload["actor_id"]))),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueAssignInput(payload map[string]any, ids []string) (TranslationQueueAssignInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueAssignInput{}, err
	}
	msg := TranslationQueueAssignInput{
		AssignmentID:    assignmentID,
		AssigneeID:      strings.TrimSpace(toString(payload["assignee_id"])),
		AssignerID:      strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["assigner_id"]), toString(payload["actor_id"]))),
		Priority:        queuePriority(payload),
		DueDate:         queueDueDate(payload),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueReleaseInput(payload map[string]any, ids []string) (TranslationQueueReleaseInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueReleaseInput{}, err
	}
	msg := TranslationQueueReleaseInput{
		AssignmentID:    assignmentID,
		ActorID:         strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["actor_id"]), toString(payload["assigner_id"]), toString(payload["user_id"]))),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueSubmitInput(payload map[string]any, ids []string) (TranslationQueueSubmitInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueSubmitInput{}, err
	}
	msg := TranslationQueueSubmitInput{
		AssignmentID:    assignmentID,
		TranslatorID:    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["translator_id"]), toString(payload["actor_id"]), toString(payload["user_id"]))),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueApproveInput(payload map[string]any, ids []string) (TranslationQueueApproveInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueApproveInput{}, err
	}
	msg := TranslationQueueApproveInput{
		AssignmentID:    assignmentID,
		ReviewerID:      strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["reviewer_id"]), toString(payload["actor_id"]), toString(payload["user_id"]))),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueRejectInput(payload map[string]any, ids []string) (TranslationQueueRejectInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueRejectInput{}, err
	}
	msg := TranslationQueueRejectInput{
		AssignmentID:    assignmentID,
		ReviewerID:      strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["reviewer_id"]), toString(payload["actor_id"]), toString(payload["user_id"]))),
		Reason:          strings.TrimSpace(toString(payload["reason"])),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueArchiveInput(payload map[string]any, ids []string) (TranslationQueueArchiveInput, error) {
	assignmentID, err := queueAssignmentIDFromPayload(payload, ids)
	if err != nil {
		return TranslationQueueArchiveInput{}, err
	}
	msg := TranslationQueueArchiveInput{
		AssignmentID:    assignmentID,
		ActorID:         strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["actor_id"]), toString(payload["user_id"]))),
		ExpectedVersion: queueExpectedVersion(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueBulkAssignInput(payload map[string]any, ids []string) (TranslationQueueBulkAssignInput, error) {
	msg := TranslationQueueBulkAssignInput{
		AssignmentIDs: queueIDsFromPayload(payload, ids),
		AssigneeID:    strings.TrimSpace(toString(payload["assignee_id"])),
		AssignerID:    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["assigner_id"]), toString(payload["actor_id"]))),
		Priority:      queuePriority(payload),
		DueDate:       queueDueDate(payload),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueBulkReleaseInput(payload map[string]any, ids []string) (TranslationQueueBulkReleaseInput, error) {
	msg := TranslationQueueBulkReleaseInput{
		AssignmentIDs: queueIDsFromPayload(payload, ids),
		ActorID:       strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["actor_id"]), toString(payload["user_id"]))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueBulkPriorityInput(payload map[string]any, ids []string) (TranslationQueueBulkPriorityInput, error) {
	msg := TranslationQueueBulkPriorityInput{
		AssignmentIDs: queueIDsFromPayload(payload, ids),
		Priority:      queuePriority(payload),
		ActorID:       strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["actor_id"]), toString(payload["user_id"]))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func buildTranslationQueueBulkArchiveInput(payload map[string]any, ids []string) (TranslationQueueBulkArchiveInput, error) {
	msg := TranslationQueueBulkArchiveInput{
		AssignmentIDs: queueIDsFromPayload(payload, ids),
		ActorID:       strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["actor_id"]), toString(payload["user_id"]))),
	}
	if err := msg.Validate(); err != nil {
		return msg, err
	}
	return msg, nil
}

func queueAssignmentIDFromPayload(payload map[string]any, ids []string) (string, error) {
	allIDs := queueIDsFromPayload(payload, ids)
	if len(allIDs) == 0 {
		return "", requiredFieldDomainError("assignment_id", nil)
	}
	return allIDs[0], nil
}

func queueIDsFromPayload(payload map[string]any, ids []string) []string {
	resolved := commandIDsFromPayload(ids, payload)
	if len(resolved) > 0 {
		return resolved
	}
	if payload == nil {
		return nil
	}
	resolved = append(resolved, toStringSlice(payload["assignment_ids"])...)
	if id := strings.TrimSpace(toString(payload["assignment_id"])); id != "" {
		resolved = append(resolved, id)
	}
	return dedupeStrings(resolved)
}

func queuePriority(payload map[string]any) Priority {
	if payload == nil {
		return ""
	}
	value := strings.TrimSpace(strings.ToLower(toString(payload["priority"])))
	if value == "" {
		return ""
	}
	return Priority(value)
}

func queueExpectedVersion(payload map[string]any) int64 {
	if payload == nil {
		return 0
	}
	raw := payload["expected_version"]
	switch value := raw.(type) {
	case int:
		return int64(value)
	case int32:
		return int64(value)
	case int64:
		return value
	case float64:
		return int64(value)
	case float32:
		return int64(value)
	case string:
		parsed, _ := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
		return parsed
	default:
		return 0
	}
}

func queueDueDate(payload map[string]any) *time.Time {
	if payload == nil {
		return nil
	}
	raw := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(payload["due_date"]), toString(payload["due_at"])))
	if raw == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil
	}
	return &parsed
}
