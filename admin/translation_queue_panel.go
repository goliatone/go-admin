package admin

import (
	"context"
	"strings"
	"time"
)

const translationQueuePanelID = "translations"

// NewTranslationQueuePanel builds the translation queue panel schema and actions.
func NewTranslationQueuePanel(repo Repository) *PanelBuilder {
	return (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(
			Field{Name: "source_title", Label: "Content", Type: "text"},
			Field{Name: "entity_type", Label: "Type", Type: "text"},
			Field{Name: "source_locale", Label: "From", Type: "text"},
			Field{Name: "target_locale", Label: "To", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select", Options: assignmentStatusOptions()},
			Field{Name: "assignee_id", Label: "Translator", Type: "text"},
			Field{Name: "priority", Label: "Priority", Type: "select", Options: assignmentPriorityOptions()},
			Field{Name: "due_date", Label: "Due", Type: "datetime"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			Field{Name: "translation_group_id", Label: "Translation Group", Type: "text", ReadOnly: true},
			Field{Name: "source_record_id", Label: "Source Record", Type: "text", ReadOnly: true},
			Field{Name: "source_title", Label: "Source Title", Type: "text", ReadOnly: true},
			Field{Name: "source_path", Label: "Source Path", Type: "text", ReadOnly: true},
			Field{Name: "status", Label: "Status", Type: "select", Options: assignmentStatusOptions(), ReadOnly: true},
			Field{Name: "assignee_id", Label: "Assignee", Type: "text", ReadOnly: true},
			Field{Name: "priority", Label: "Priority", Type: "select", Options: assignmentPriorityOptions(), ReadOnly: true},
			Field{Name: "version", Label: "Version", Type: "number", ReadOnly: true},
		).
		Filters(
			Filter{Name: "status", Type: "select", Options: assignmentStatusOptions()},
			Filter{Name: "target_locale", Type: "select", Label: "Target Locale"},
			Filter{Name: "assignee_id", Type: "select", Label: "Translator"},
			Filter{Name: "assignment_type", Type: "select", Options: assignmentTypeOptions()},
			Filter{Name: "entity_type", Type: "select", Label: "Entity"},
			Filter{Name: "priority", Type: "select", Options: assignmentPriorityOptions()},
			Filter{Name: "overdue", Type: "boolean"},
		).
		Actions(
			Action{Name: "claim", Label: "Claim", CommandName: translationQueueClaimCommandName, Permission: PermAdminTranslationsClaim},
			Action{Name: "assign", Label: "Assign", CommandName: translationQueueAssignCommandName, Permission: PermAdminTranslationsAssign, PayloadRequired: []string{"assignee_id"}},
			Action{Name: "release", Label: "Release to Pool", CommandName: translationQueueReleaseCommandName, Permission: PermAdminTranslationsAssign},
			Action{Name: "submit_review", Label: "Submit for Review", CommandName: translationQueueSubmitCommandName, Permission: PermAdminTranslationsEdit},
			Action{Name: "approve", Label: "Approve", CommandName: translationQueueApproveCommandName, Permission: PermAdminTranslationsApprove},
			Action{Name: "reject", Label: "Request Changes", CommandName: translationQueueRejectCommandName, Permission: PermAdminTranslationsApprove, PayloadRequired: []string{"reason"}},
			Action{Name: "archive", Label: "Archive", CommandName: translationQueueArchiveCommandName, Permission: PermAdminTranslationsManage},
		).
		BulkActions(
			Action{Name: "bulk_assign", Label: "Assign Selected", CommandName: translationQueueBulkAssignCommandName, Permission: PermAdminTranslationsAssign, PayloadRequired: []string{"assignee_id"}},
			Action{Name: "bulk_release", Label: "Release to Pool", CommandName: translationQueueBulkReleaseCommandName, Permission: PermAdminTranslationsAssign},
			Action{Name: "bulk_priority", Label: "Set Priority", CommandName: translationQueueBulkPriorityCommandName, Permission: PermAdminTranslationsManage, PayloadRequired: []string{"priority"}},
			Action{Name: "bulk_archive", Label: "Archive Selected", CommandName: translationQueueBulkArchiveCommandName, Permission: PermAdminTranslationsManage},
		).
		Permissions(PanelPermissions{
			View:   PermAdminTranslationsView,
			Create: PermAdminTranslationsAssign,
			Edit:   PermAdminTranslationsEdit,
			Delete: PermAdminTranslationsManage,
		})
}

// RegisterTranslationQueuePanel registers the translation queue panel.
func RegisterTranslationQueuePanel(admin *Admin, repo TranslationAssignmentRepository) (*Panel, error) {
	if admin == nil {
		return nil, serviceNotConfiguredDomainError("admin", map[string]any{"component": "translation_queue_panel"})
	}
	if repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{"component": "translation_queue_panel"})
	}
	return admin.RegisterPanel(translationQueuePanelID, NewTranslationQueuePanel(NewTranslationAssignmentPanelRepository(repo)))
}

// TranslationAssignmentPanelRepository adapts typed queue storage to panel CRUD contracts.
type TranslationAssignmentPanelRepository struct {
	repo TranslationAssignmentRepository
}

// NewTranslationAssignmentPanelRepository wraps a typed assignment repository for panel usage.
func NewTranslationAssignmentPanelRepository(repo TranslationAssignmentRepository) *TranslationAssignmentPanelRepository {
	return &TranslationAssignmentPanelRepository{repo: repo}
}

func (r *TranslationAssignmentPanelRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r == nil || r.repo == nil {
		return nil, 0, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	items, total, err := r.repo.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	rows := make([]map[string]any, 0, len(items))
	for _, item := range items {
		rows = append(rows, translationAssignmentToMap(item))
	}
	return rows, total, nil
}

func (r *TranslationAssignmentPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r == nil || r.repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	item, err := r.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return translationAssignmentToMap(item), nil
}

func (r *TranslationAssignmentPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r == nil || r.repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	assignment := translationAssignmentFromMap(record)
	created, _, err := r.repo.CreateOrReuseActive(ctx, assignment)
	if err != nil {
		return nil, err
	}
	return translationAssignmentToMap(created), nil
}

func (r *TranslationAssignmentPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r == nil || r.repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	assignment := translationAssignmentFromMap(record)
	assignment.ID = strings.TrimSpace(firstNonEmpty(id, assignment.ID))
	expected := queueExpectedVersion(record)
	if expected <= 0 {
		expected = assignment.Version
	}
	if expected <= 0 {
		current, err := r.repo.Get(ctx, assignment.ID)
		if err != nil {
			return nil, err
		}
		expected = current.Version
	}
	updated, err := r.repo.Update(ctx, assignment, expected)
	if err != nil {
		return nil, err
	}
	return translationAssignmentToMap(updated), nil
}

func (r *TranslationAssignmentPanelRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.repo == nil {
		return serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	assignment, err := r.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if assignment.Status == AssignmentStatusArchived {
		return nil
	}
	assignment.Status = AssignmentStatusArchived
	now := time.Now().UTC()
	assignment.ArchivedAt = &now
	_, err = r.repo.Update(ctx, assignment, assignment.Version)
	return err
}

func assignmentStatusOptions() []Option {
	statuses := []AssignmentStatus{
		AssignmentStatusPending,
		AssignmentStatusAssigned,
		AssignmentStatusInProgress,
		AssignmentStatusReview,
		AssignmentStatusRejected,
		AssignmentStatusApproved,
		AssignmentStatusPublished,
		AssignmentStatusArchived,
	}
	options := make([]Option, 0, len(statuses))
	for _, status := range statuses {
		options = append(options, Option{Value: string(status), Label: strings.ReplaceAll(strings.Title(string(status)), "_", " ")})
	}
	return options
}

func assignmentTypeOptions() []Option {
	return []Option{
		{Value: string(AssignmentTypeDirect), Label: "Assigned"},
		{Value: string(AssignmentTypeOpenPool), Label: "Open Pool"},
	}
}

func assignmentPriorityOptions() []Option {
	return []Option{
		{Value: string(PriorityLow), Label: "Low"},
		{Value: string(PriorityNormal), Label: "Normal"},
		{Value: string(PriorityHigh), Label: "High"},
		{Value: string(PriorityUrgent), Label: "Urgent"},
	}
}

func translationAssignmentFromMap(record map[string]any) TranslationAssignment {
	if len(record) == 0 {
		return TranslationAssignment{}
	}
	return TranslationAssignment{
		ID:                  strings.TrimSpace(toString(record["id"])),
		TranslationGroupID:  strings.TrimSpace(toString(record["translation_group_id"])),
		EntityType:          strings.TrimSpace(toString(record["entity_type"])),
		SourceRecordID:      strings.TrimSpace(toString(record["source_record_id"])),
		SourceLocale:        strings.TrimSpace(toString(record["source_locale"])),
		TargetLocale:        strings.TrimSpace(toString(record["target_locale"])),
		TargetRecordID:      strings.TrimSpace(toString(record["target_record_id"])),
		SourceTitle:         strings.TrimSpace(toString(record["source_title"])),
		SourcePath:          strings.TrimSpace(toString(record["source_path"])),
		AssignmentType:      AssignmentType(strings.TrimSpace(toString(record["assignment_type"]))),
		Status:              AssignmentStatus(strings.TrimSpace(toString(record["status"]))),
		Priority:            Priority(strings.TrimSpace(toString(record["priority"]))),
		DueDate:             queueTimePtr(record["due_date"]),
		AssigneeID:          strings.TrimSpace(toString(record["assignee_id"])),
		AssignerID:          strings.TrimSpace(toString(record["assigner_id"])),
		LastReviewerID:      strings.TrimSpace(toString(record["last_reviewer_id"])),
		LastRejectionReason: strings.TrimSpace(toString(record["last_rejection_reason"])),
		Version:             queueExpectedVersion(map[string]any{"expected_version": record["version"]}),
		CreatedAt:           queueTime(record["created_at"]),
		UpdatedAt:           queueTime(record["updated_at"]),
		ClaimedAt:           queueTimePtr(record["claimed_at"]),
		SubmittedAt:         queueTimePtr(record["submitted_at"]),
		ApprovedAt:          queueTimePtr(record["approved_at"]),
		PublishedAt:         queueTimePtr(record["published_at"]),
		ArchivedAt:          queueTimePtr(record["archived_at"]),
	}
}

func translationAssignmentToMap(assignment TranslationAssignment) map[string]any {
	out := map[string]any{
		"id":                    assignment.ID,
		"translation_group_id":  assignment.TranslationGroupID,
		"entity_type":           assignment.EntityType,
		"source_record_id":      assignment.SourceRecordID,
		"source_locale":         assignment.SourceLocale,
		"target_locale":         assignment.TargetLocale,
		"target_record_id":      assignment.TargetRecordID,
		"source_title":          assignment.SourceTitle,
		"source_path":           assignment.SourcePath,
		"assignment_type":       string(assignment.AssignmentType),
		"status":                string(assignment.Status),
		"priority":              string(assignment.Priority),
		"assignee_id":           assignment.AssigneeID,
		"assigner_id":           assignment.AssignerID,
		"last_reviewer_id":      assignment.LastReviewerID,
		"last_rejection_reason": assignment.LastRejectionReason,
		"version":               assignment.Version,
		"created_at":            assignment.CreatedAt,
		"updated_at":            assignment.UpdatedAt,
		"claimed_at":            assignment.ClaimedAt,
		"submitted_at":          assignment.SubmittedAt,
		"approved_at":           assignment.ApprovedAt,
		"published_at":          assignment.PublishedAt,
		"archived_at":           assignment.ArchivedAt,
	}
	if assignment.DueDate != nil {
		out["due_date"] = assignment.DueDate
	}
	return out
}

func queueTime(value any) time.Time {
	if value == nil {
		return time.Time{}
	}
	switch typed := value.(type) {
	case time.Time:
		return typed
	case *time.Time:
		if typed != nil {
			return *typed
		}
	case string:
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(typed))
		if err == nil {
			return parsed
		}
	}
	return time.Time{}
}

func queueTimePtr(value any) *time.Time {
	t := queueTime(value)
	if t.IsZero() {
		return nil
	}
	return &t
}
