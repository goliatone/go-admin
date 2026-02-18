package admin

import (
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/authctx"
	usertypes "github.com/goliatone/go-users/pkg/types"
)

type mediaBinding struct {
	admin *Admin
}

func newMediaBinding(a *Admin) boot.MediaBinding {
	if a == nil || a.mediaLibrary == nil {
		return nil
	}
	return &mediaBinding{admin: a}
}

func (m *mediaBinding) List(c router.Context) (map[string]any, error) {
	items, err := m.admin.mediaLibrary.List(c.Context())
	if err != nil {
		return nil, err
	}
	return map[string]any{"items": items}, nil
}

func (m *mediaBinding) Add(c router.Context, body map[string]any) (any, error) {
	item := MediaItem{
		ID:        toString(body["id"]),
		Name:      toString(body["name"]),
		URL:       toString(body["url"]),
		Thumbnail: toString(body["thumbnail"]),
		Metadata:  extractMap(body["metadata"]),
	}
	created, err := m.admin.mediaLibrary.Add(c.Context(), item)
	if err != nil {
		return nil, err
	}
	return created, nil
}

type notificationsBinding struct {
	admin *Admin
}

func newNotificationsBinding(a *Admin) boot.NotificationsBinding {
	if a == nil || a.notifications == nil {
		return nil
	}
	return &notificationsBinding{admin: a}
}

func (n *notificationsBinding) List(c router.Context) (map[string]any, error) {
	ctx := n.admin.adminContextFromRequest(c, n.admin.config.DefaultLocale)
	if err := n.admin.requirePermission(ctx, n.admin.config.NotificationsPermission, "notifications"); err != nil {
		return nil, err
	}
	items, err := n.admin.notifications.List(ctx.Context)
	if err != nil {
		return nil, err
	}
	unread := 0
	for _, item := range items {
		if !item.Read {
			unread++
		}
	}
	return map[string]any{
		"notifications": items,
		"unread_count":  unread,
	}, nil
}

func (n *notificationsBinding) Mark(c router.Context, body map[string]any) error {
	rawIDs, ok := body["ids"].([]any)
	if !ok {
		return validationDomainError("ids must be array", map[string]any{
			"field": "ids",
		})
	}
	read := true
	if r, ok := body["read"].(bool); ok {
		read = r
	}
	ids := []string{}
	for _, v := range rawIDs {
		if s, ok := v.(string); ok {
			ids = append(ids, s)
		}
	}
	adminCtx := n.admin.adminContextFromRequest(c, n.admin.config.DefaultLocale)
	if err := n.admin.requirePermission(adminCtx, n.admin.config.NotificationsUpdatePermission, "notifications"); err != nil {
		return err
	}
	if n.admin.notifications != nil {
		return n.admin.notifications.Mark(adminCtx.Context, ids, read)
	}
	return FeatureDisabledError{Feature: string(FeatureNotifications)}
}

type activityBinding struct {
	admin *Admin
}

func newActivityBinding(a *Admin) boot.ActivityBinding {
	if a == nil {
		return nil
	}
	return &activityBinding{admin: a}
}

func (aBinding *activityBinding) List(c router.Context) (map[string]any, error) {
	adminCtx := aBinding.admin.adminContextFromRequest(c, aBinding.admin.config.DefaultLocale)
	actorCtx, err := authctx.ResolveActorContext(adminCtx.Context)
	if err != nil {
		return nil, err
	}
	actorRef, err := authctx.ActorRefFromActorContext(actorCtx)
	if err != nil {
		if isActivityActorContextInvalid(err) {
			return nil, invalidActivityActorContextDomainError(actorCtx, err)
		}
		return nil, err
	}
	if err := aBinding.admin.requirePermission(adminCtx, aBinding.admin.config.ActivityPermission, "activity"); err != nil {
		return nil, err
	}
	if aBinding.admin.activityFeed == nil {
		return nil, FeatureDisabledError{Feature: "activity"}
	}
	filter, err := parseActivityFilter(c, actorRef, authctx.ScopeFromActorContext(actorCtx))
	if err != nil {
		return nil, err
	}
	page, err := aBinding.admin.activityFeed.Query(adminCtx.Context, filter)
	if err != nil {
		if isActivityActorContextInvalid(err) {
			return nil, invalidActivityActorContextDomainError(actorCtx, err)
		}
		if errors.Is(err, usertypes.ErrMissingActivityRepository) {
			return nil, FeatureDisabledError{Feature: "activity"}
		}
		return nil, err
	}
	return map[string]any{
		"entries":     entriesFromUsersRecords(page.Records),
		"total":       page.Total,
		"next_offset": page.NextOffset,
		"has_more":    page.HasMore,
	}, nil
}

func isActivityActorContextInvalid(err error) bool {
	var typed *goerrors.Error
	if !goerrors.As(err, &typed) || typed == nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(typed.TextCode), "ACTOR_CONTEXT_INVALID")
}

func invalidActivityActorContextDomainError(actorCtx *auth.ActorContext, cause error) error {
	actorID := ""
	role := ""
	subject := ""
	if actorCtx != nil {
		actorID = strings.TrimSpace(actorCtx.ActorID)
		role = strings.TrimSpace(actorCtx.Role)
		subject = strings.TrimSpace(actorCtx.Subject)
	}
	message := "activity requires auth actor_id to be a UUID string"
	if actorID != "" {
		message = fmt.Sprintf("activity requires auth actor_id to be a UUID string; got %q", actorID)
	}
	meta := map[string]any{
		"component":           "activity",
		"field":               "actor_id",
		"actor_id":            actorID,
		"role":                role,
		"subject":             subject,
		"expected_format":     "uuid",
		"source_text_code":    "ACTOR_CONTEXT_INVALID",
		"source_error":        strings.TrimSpace(cause.Error()),
		"resolution":          "Set auth actor_id/user_id to a UUID value in the auth middleware claims mapping.",
		"integration_surface": "authctx.ActorRefFromActorContext",
	}
	return NewDomainError(TextCodeActivityActorContextInvalid, message, meta)
}

type jobsBinding struct {
	admin *Admin
}

func newJobsBinding(a *Admin) boot.JobsBinding {
	if a == nil || a.jobs == nil {
		return nil
	}
	return &jobsBinding{admin: a}
}

func (j *jobsBinding) List(c router.Context) (map[string]any, error) {
	adminCtx := j.admin.adminContextFromRequest(c, j.admin.config.DefaultLocale)
	if err := j.admin.requirePermission(adminCtx, j.admin.config.JobsPermission, "jobs"); err != nil {
		return nil, err
	}
	return map[string]any{"jobs": j.admin.jobs.List()}, nil
}

func (j *jobsBinding) Trigger(c router.Context, body map[string]any) error {
	name, _ := body["name"].(string)
	if name == "" {
		return validationDomainError("name required", map[string]any{
			"field": "name",
		})
	}
	adminCtx := j.admin.adminContextFromRequest(c, j.admin.config.DefaultLocale)
	if err := j.admin.requirePermission(adminCtx, j.admin.config.JobsTriggerPermission, "jobs"); err != nil {
		return err
	}
	return j.admin.jobs.Trigger(adminCtx, name)
}

type settingsBinding struct {
	admin *Admin
}

func newSettingsBinding(a *Admin) boot.SettingsBinding {
	if a == nil || a.settings == nil {
		return nil
	}
	return &settingsBinding{admin: a}
}

func (s *settingsBinding) Values(c router.Context) (map[string]any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsPermission, "settings"); err != nil {
		return nil, err
	}
	return map[string]any{"values": s.admin.settings.ResolveAll(ctx.UserID)}, nil
}

func (s *settingsBinding) Form(c router.Context) (any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsPermission, "settings"); err != nil {
		return nil, err
	}
	form := s.admin.settingsForm.FormWithContext(ctx.Context, ctx.UserID)
	return form, nil
}

func (s *settingsBinding) Save(c router.Context, body map[string]any) (map[string]any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsUpdatePermission, "settings"); err != nil {
		return nil, err
	}
	valuesRaw, ok := body["values"].(map[string]any)
	if !ok {
		return nil, validationDomainError("values must be an object", map[string]any{
			"field": "values",
		})
	}
	scope := SettingsScopeSite
	if str, ok := body["scope"].(string); ok && str != "" {
		scope = SettingsScope(str)
	}
	bundle := SettingsBundle{
		Scope:  scope,
		UserID: ctx.UserID,
		Values: valuesRaw,
	}
	if s.admin.commandBus != nil {
		payload := map[string]any{
			"values":  valuesRaw,
			"scope":   string(scope),
			"user_id": ctx.UserID,
		}
		if err := s.admin.commandBus.DispatchByName(ctx.Context, settingsUpdateCommandName, payload, nil); err != nil {
			return nil, err
		}
	} else if s.admin.settingsCommand != nil {
		if err := s.admin.settingsCommand.Execute(ctx.Context, SettingsUpdateMsg{Bundle: bundle}); err != nil {
			return nil, err
		}
	} else if s.admin.settings != nil {
		if err := s.admin.settings.Apply(ctx.Context, bundle); err != nil {
			return nil, err
		}
	}
	return map[string]any{
		"status": "ok",
		"values": s.admin.settings.ResolveAll(ctx.UserID),
	}, nil
}
