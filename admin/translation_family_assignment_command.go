package admin

import (
	"context"
	"strings"
	"time"

	gocommand "github.com/goliatone/go-command"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

// TranslationFamilyAssignInput is the transport-neutral command input for
// assigning or creating one translation-family assignment.
type TranslationFamilyAssignInput struct {
	FamilyID     string                         `json:"family_id"`
	Scope        translationservices.Scope      `json:"scope"`
	ActorID      string                         `json:"actor_id"`
	TargetLocale string                         `json:"target_locale"`
	AssigneeID   string                         `json:"assignee_id"`
	OpenPool     bool                           `json:"open_pool"`
	Priority     Priority                       `json:"priority"`
	PrioritySet  bool                           `json:"-"`
	DueDate      *time.Time                     `json:"due_date"`
	WorkScope    string                         `json:"work_scope"`
	Channel      string                         `json:"channel"`
	Result       *TranslationFamilyAssignResult `json:"-"`
}

// TranslationFamilyAssignResult contains only domain data produced by the
// command; presentation payloads are built by route responders.
type TranslationFamilyAssignResult struct {
	Family           translationservices.FamilyRecord `json:"family"`
	Assignment       TranslationAssignment            `json:"assignment"`
	AssignmentReused bool                             `json:"assignment_reused"`
}

type TranslationFamilyAssignCommand struct {
	Binding *translationFamilyBinding `json:"binding"`
}

var _ gocommand.Commander[TranslationFamilyAssignInput] = (*TranslationFamilyAssignCommand)(nil)

func (c *TranslationFamilyAssignCommand) Execute(ctx context.Context, msg TranslationFamilyAssignInput) error {
	if c == nil || c.Binding == nil || c.Binding.admin == nil {
		return serviceNotConfiguredDomainError("translation family assignment command", map[string]any{"command": "translation_family_assign"})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	msg = msg.normalized()
	runtime, err := c.Binding.runtime(ctx, msg.Channel)
	if err != nil {
		return err
	}
	family, ok, err := runtime.service.Detail(ctx, translationservices.GetFamilyInput{
		Scope:       msg.Scope,
		Environment: msg.Channel,
		FamilyID:    msg.FamilyID,
	})
	if err != nil {
		return err
	}
	if !ok {
		return notFoundDomainError("translation family not found", map[string]any{"family_id": msg.FamilyID})
	}
	if err := validateFamilyAssignmentTargetLocale(family, msg.TargetLocale); err != nil {
		return err
	}
	request := msg.createAssignmentRequest(ctx)
	outcome, err := c.Binding.createOrAssignFamilyAssignment(request, family)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = TranslationFamilyAssignResult{
			Family:           family,
			Assignment:       outcome.Assignment,
			AssignmentReused: outcome.AssignmentReused,
		}
	}
	return nil
}

func (msg TranslationFamilyAssignInput) Validate() error {
	if strings.TrimSpace(msg.FamilyID) == "" {
		return validationDomainError("family_id required", map[string]any{"field": "family_id"})
	}
	if strings.TrimSpace(msg.Scope.TenantID) == "" {
		return validationDomainError("tenant_id required", map[string]any{"field": ScopeTenantIDKey})
	}
	if strings.TrimSpace(msg.Scope.OrgID) == "" {
		return validationDomainError("org_id required", map[string]any{"field": ScopeOrgIDKey})
	}
	if strings.TrimSpace(msg.ActorID) == "" {
		return NewDomainError(string(translationcore.ErrorPermissionDenied), "family assignment creation requires an authenticated actor", map[string]any{
			"component": "translation_family_assignment_command",
		})
	}
	if normalizeCreateTranslationLocale(msg.TargetLocale) == "" {
		return validationDomainError("target_locale required", map[string]any{"field": "target_locale"})
	}
	if msg.Priority != "" && !msg.Priority.IsValid() {
		return validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	if msg.OpenPool && strings.TrimSpace(msg.AssigneeID) != "" {
		return validationDomainError("open_pool assignments cannot include assignee_id", map[string]any{
			"field": "assignee_id",
		})
	}
	if !msg.OpenPool && strings.TrimSpace(msg.AssigneeID) == "" {
		return requiredFieldDomainError("assignee_id", map[string]any{
			"hint": "set open_pool=true to create an open-pool assignment",
		})
	}
	return nil
}

func (msg TranslationFamilyAssignInput) normalized() TranslationFamilyAssignInput {
	msg.FamilyID = strings.TrimSpace(msg.FamilyID)
	msg.Scope = translationservices.Scope{
		TenantID: strings.TrimSpace(msg.Scope.TenantID),
		OrgID:    strings.TrimSpace(msg.Scope.OrgID),
	}
	msg.ActorID = strings.TrimSpace(msg.ActorID)
	msg.TargetLocale = normalizeCreateTranslationLocale(msg.TargetLocale)
	msg.AssigneeID = strings.TrimSpace(msg.AssigneeID)
	msg.WorkScope = normalizeTranslationAssignmentWorkScope(msg.WorkScope)
	msg.Channel = strings.TrimSpace(msg.Channel)
	if msg.Priority == "" {
		msg.Priority = PriorityNormal
	}
	msg.DueDate = cloneTimePtr(msg.DueDate)
	return msg
}

func (msg TranslationFamilyAssignInput) createAssignmentRequest(ctx context.Context) translationFamilyCreateAssignmentRequest {
	return translationFamilyCreateAssignmentRequest{
		AdminCtx: AdminContext{
			Context:     ctx,
			UserID:      msg.ActorID,
			TenantID:    msg.Scope.TenantID,
			OrgID:       msg.Scope.OrgID,
			Channel:     msg.Channel,
			Environment: msg.Channel,
		},
		Input: translationFamilyCreateAssignmentInput{
			TargetLocale: msg.TargetLocale,
			AssigneeID:   msg.AssigneeID,
			OpenPool:     msg.OpenPool,
			Priority:     msg.Priority,
			PrioritySet:  msg.PrioritySet,
			DueDate:      cloneTimePtr(msg.DueDate),
			WorkScope:    msg.WorkScope,
			Channel:      msg.Channel,
		},
		Scope: msg.Scope,
	}
}

func translationFamilyAssignInputFromRequest(familyID string, request translationFamilyCreateAssignmentRequest, result *TranslationFamilyAssignResult) TranslationFamilyAssignInput {
	identity := translationIdentityFromAdminContext(request.AdminCtx)
	return TranslationFamilyAssignInput{
		FamilyID:     strings.TrimSpace(familyID),
		Scope:        request.Scope,
		ActorID:      identity.ActorID,
		TargetLocale: request.Input.TargetLocale,
		AssigneeID:   request.Input.AssigneeID,
		OpenPool:     request.Input.OpenPool,
		Priority:     request.Input.Priority,
		PrioritySet:  request.Input.PrioritySet,
		DueDate:      cloneTimePtr(request.Input.DueDate),
		WorkScope:    request.Input.WorkScope,
		Channel:      request.Input.Channel,
		Result:       result,
	}
}
