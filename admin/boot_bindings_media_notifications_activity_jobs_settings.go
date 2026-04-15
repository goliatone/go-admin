package admin

import (
	"context"
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
	if a == nil {
		return nil
	}
	return &mediaBinding{admin: a}
}

func (m *mediaBinding) List(c router.Context) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaPermission, "media"); err != nil {
		return nil, err
	}
	if provider, ok := m.admin.mediaLibrary.(MediaQueryProvider); ok {
		return provider.QueryMedia(adminCtx.Context, mediaQueryFromRequest(c))
	}
	items, err := m.admin.mediaLibrary.List(adminCtx.Context)
	if err != nil {
		return nil, err
	}
	return mediaPageFromLegacy(items, mediaQueryFromRequest(c)), nil
}

func (m *mediaBinding) Add(c router.Context, body map[string]any) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaCreatePermission, "media"); err != nil {
		return nil, err
	}
	item := MediaItem{
		ID:        toString(body["id"]),
		Name:      toString(body["name"]),
		URL:       toString(body["url"]),
		Thumbnail: toString(body["thumbnail"]),
		Type:      toString(body["type"]),
		MIMEType:  toString(body["mime_type"]),
		Status:    toString(body["status"]),
		Metadata:  extractMap(body["metadata"]),
	}
	created, err := m.admin.mediaLibrary.Add(adminCtx.Context, item)
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (m *mediaBinding) Get(c router.Context, id string) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaPermission, "media"); err != nil {
		return nil, err
	}
	return m.getMedia(adminCtx.Context, strings.TrimSpace(id))
}

func (m *mediaBinding) Resolve(c router.Context, body map[string]any) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaPermission, "media"); err != nil {
		return nil, err
	}
	ref := MediaReference{
		ID:   toString(body["id"]),
		URL:  toString(body["url"]),
		Name: toString(body["name"]),
	}
	if resolver, ok := m.admin.mediaLibrary.(MediaResolver); ok {
		return resolver.ResolveMedia(adminCtx.Context, ref)
	}
	return m.resolveLegacyMedia(adminCtx.Context, ref)
}

func (m *mediaBinding) Upload(c router.Context, body map[string]any, file boot.MultipartFile) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaCreatePermission, "media"); err != nil {
		return nil, err
	}
	uploader, ok := m.admin.mediaLibrary.(MediaUploader)
	if !ok {
		return nil, serviceUnavailableDomainError("media uploader not configured", map[string]any{
			"component": "media",
			"route":     "media.upload",
		})
	}
	return uploader.UploadMedia(adminCtx.Context, MediaUploadInput{
		MediaUploadRequest: MediaUploadRequest{
			Name:        firstNonEmpty(toString(body["name"]), file.FileName),
			FileName:    firstNonEmpty(toString(body["file_name"]), file.FileName),
			ContentType: firstNonEmpty(toString(body["content_type"]), file.ContentType),
			Size:        file.Size,
			Metadata:    extractMap(body["metadata"]),
		},
		Reader: file.Reader,
	})
}

func (m *mediaBinding) Presign(c router.Context, body map[string]any) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaCreatePermission, "media"); err != nil {
		return nil, err
	}
	presigner, ok := m.admin.mediaLibrary.(MediaPresigner)
	if !ok {
		return nil, serviceUnavailableDomainError("media presigner not configured", map[string]any{
			"component": "media",
			"route":     "media.presign",
		})
	}
	return presigner.PresignMedia(adminCtx.Context, MediaPresignRequest{
		Name:        toString(body["name"]),
		FileName:    toString(body["file_name"]),
		ContentType: toString(body["content_type"]),
		Size:        toInt64(body["size"]),
		Metadata:    extractMap(body["metadata"]),
	})
}

func (m *mediaBinding) Confirm(c router.Context, body map[string]any) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaCreatePermission, "media"); err != nil {
		return nil, err
	}
	confirmer, ok := m.admin.mediaLibrary.(MediaConfirmer)
	if !ok {
		return nil, serviceUnavailableDomainError("media confirmer not configured", map[string]any{
			"component": "media",
			"route":     "media.confirm",
		})
	}
	return confirmer.ConfirmMedia(adminCtx.Context, MediaConfirmRequest{
		UploadID:    toString(body["upload_id"]),
		Name:        toString(body["name"]),
		URL:         toString(body["url"]),
		FileName:    toString(body["file_name"]),
		ContentType: toString(body["content_type"]),
		Size:        toInt64(body["size"]),
		Metadata:    extractMap(body["metadata"]),
	})
}

func (m *mediaBinding) Update(c router.Context, id string, body map[string]any) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaUpdatePermission, "media"); err != nil {
		return nil, err
	}
	updater, ok := m.admin.mediaLibrary.(MediaUpdater)
	if !ok {
		return nil, serviceUnavailableDomainError("media updater not configured", map[string]any{
			"component": "media",
			"route":     "media.item",
		})
	}
	return updater.UpdateMedia(adminCtx.Context, strings.TrimSpace(id), MediaUpdateInput{
		Name:           toString(body["name"]),
		Thumbnail:      toString(body["thumbnail"]),
		Type:           toString(body["type"]),
		MIMEType:       toString(body["mime_type"]),
		Status:         toString(body["status"]),
		WorkflowStatus: toString(body["workflow_status"]),
		WorkflowError:  toString(body["workflow_error"]),
		Metadata:       extractMap(body["metadata"]),
	})
}

func (m *mediaBinding) Delete(c router.Context, id string) error {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaDeletePermission, "media"); err != nil {
		return err
	}
	deleter, ok := m.admin.mediaLibrary.(MediaDeleter)
	if !ok {
		return serviceUnavailableDomainError("media deleter not configured", map[string]any{
			"component": "media",
			"route":     "media.item",
		})
	}
	return deleter.DeleteMedia(adminCtx.Context, strings.TrimSpace(id))
}

func (m *mediaBinding) Capabilities(c router.Context) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaPermission, "media"); err != nil {
		return nil, err
	}
	return m.effectiveCapabilities(adminCtx)
}

func (m *mediaBinding) getMedia(ctx context.Context, id string) (MediaItem, error) {
	if getter, ok := m.admin.mediaLibrary.(MediaGetter); ok {
		return getter.GetMedia(ctx, id)
	}
	return m.resolveLegacyMedia(ctx, MediaReference{ID: id})
}

func (m *mediaBinding) resolveLegacyMedia(ctx context.Context, ref MediaReference) (MediaItem, error) {
	items, err := m.admin.mediaLibrary.List(ctx)
	if err != nil {
		return MediaItem{}, err
	}
	id := strings.TrimSpace(ref.ID)
	url := strings.TrimSpace(ref.URL)
	for _, item := range items {
		if id != "" && strings.TrimSpace(item.ID) == id {
			return item, nil
		}
		if url != "" && strings.TrimSpace(item.URL) == url {
			return item, nil
		}
	}
	return MediaItem{}, notFoundDomainError("media item not found", map[string]any{
		"id":  id,
		"url": url,
	})
}

func (m *mediaBinding) effectiveCapabilities(adminCtx AdminContext) (MediaCapabilities, error) {
	supported := MediaCapabilities{
		Operations: MediaOperationCapabilities{
			List:         true,
			Get:          true,
			Resolve:      true,
			Upload:       m.can(adminCtx, m.admin.config.MediaCreatePermission) && implementsMediaUploader(m.admin.mediaLibrary),
			Presign:      m.can(adminCtx, m.admin.config.MediaCreatePermission) && implementsMediaPresigner(m.admin.mediaLibrary),
			Confirm:      m.can(adminCtx, m.admin.config.MediaCreatePermission) && implementsMediaConfirmer(m.admin.mediaLibrary),
			Update:       m.can(adminCtx, m.admin.config.MediaUpdatePermission) && implementsMediaUpdater(m.admin.mediaLibrary),
			Delete:       m.can(adminCtx, m.admin.config.MediaDeletePermission) && implementsMediaDeleter(m.admin.mediaLibrary),
			LegacyCreate: m.can(adminCtx, m.admin.config.MediaCreatePermission) && m.admin.mediaLibrary != nil,
		},
		Upload: MediaUploadCapabilities{
			DirectUpload: implementsMediaUploader(m.admin.mediaLibrary),
			Presign:      implementsMediaPresigner(m.admin.mediaLibrary),
		},
		Picker: MediaPickerCapabilities{
			ValueModes:       []MediaValueMode{MediaValueModeURL, MediaValueModeID},
			DefaultValueMode: MediaValueModeURL,
		},
	}
	base := supported
	if provider, ok := m.admin.mediaLibrary.(MediaCapabilityProvider); ok {
		authoritative, err := provider.MediaCapabilities(adminCtx.Context)
		if err != nil {
			return MediaCapabilities{}, err
		}
		base = authoritative
	}
	if provider, ok := m.admin.mediaLibrary.(MediaCapabilityOverrideProvider); ok {
		overrides, err := provider.MediaCapabilityOverrides(adminCtx.Context)
		if err != nil {
			return MediaCapabilities{}, err
		}
		base = applyMediaCapabilityOverrides(base, overrides)
	}
	base = clampMediaCapabilities(base, supported)
	return normalizeMediaCapabilities(base, supported), nil
}

func (m *mediaBinding) can(adminCtx AdminContext, permission string) bool {
	return m.admin.requirePermission(adminCtx, permission, "media") == nil
}

func implementsMediaUploader(lib MediaLibrary) bool {
	_, ok := lib.(MediaUploader)
	return ok
}

func implementsMediaPresigner(lib MediaLibrary) bool {
	_, ok := lib.(MediaPresigner)
	return ok
}

func implementsMediaConfirmer(lib MediaLibrary) bool {
	_, ok := lib.(MediaConfirmer)
	return ok
}

func implementsMediaUpdater(lib MediaLibrary) bool {
	_, ok := lib.(MediaUpdater)
	return ok
}

func implementsMediaDeleter(lib MediaLibrary) bool {
	_, ok := lib.(MediaDeleter)
	return ok
}

func applyMediaCapabilityOverrides(base MediaCapabilities, override MediaCapabilityOverrides) MediaCapabilities {
	if override.Operations.List != nil {
		base.Operations.List = *override.Operations.List
	}
	if override.Operations.Get != nil {
		base.Operations.Get = *override.Operations.Get
	}
	if override.Operations.Resolve != nil {
		base.Operations.Resolve = *override.Operations.Resolve
	}
	if override.Operations.Upload != nil {
		base.Operations.Upload = *override.Operations.Upload
	}
	if override.Operations.Presign != nil {
		base.Operations.Presign = *override.Operations.Presign
	}
	if override.Operations.Confirm != nil {
		base.Operations.Confirm = *override.Operations.Confirm
	}
	if override.Operations.Update != nil {
		base.Operations.Update = *override.Operations.Update
	}
	if override.Operations.Delete != nil {
		base.Operations.Delete = *override.Operations.Delete
	}
	if override.Operations.LegacyCreate != nil {
		base.Operations.LegacyCreate = *override.Operations.LegacyCreate
	}
	if override.Upload.DirectUpload != nil {
		base.Upload.DirectUpload = *override.Upload.DirectUpload
	}
	if override.Upload.Presign != nil {
		base.Upload.Presign = *override.Upload.Presign
	}
	if override.Upload.MaxSize != nil {
		base.Upload.MaxSize = *override.Upload.MaxSize
	}
	if override.Upload.AcceptedKinds != nil {
		base.Upload.AcceptedKinds = append([]string{}, (*override.Upload.AcceptedKinds)...)
	}
	if override.Upload.AcceptedMIMETypes != nil {
		base.Upload.AcceptedMIMETypes = append([]string{}, (*override.Upload.AcceptedMIMETypes)...)
	}
	if override.Picker.ValueModes != nil {
		base.Picker.ValueModes = append([]MediaValueMode{}, (*override.Picker.ValueModes)...)
	}
	if override.Picker.DefaultValueMode != nil {
		base.Picker.DefaultValueMode = *override.Picker.DefaultValueMode
	}
	return base
}

func clampMediaCapabilities(base, supported MediaCapabilities) MediaCapabilities {
	base.Operations.List = base.Operations.List && supported.Operations.List
	base.Operations.Get = base.Operations.Get && supported.Operations.Get
	base.Operations.Resolve = base.Operations.Resolve && supported.Operations.Resolve
	base.Operations.Upload = base.Operations.Upload && supported.Operations.Upload
	base.Operations.Presign = base.Operations.Presign && supported.Operations.Presign
	base.Operations.Confirm = base.Operations.Confirm && supported.Operations.Confirm
	base.Operations.Update = base.Operations.Update && supported.Operations.Update
	base.Operations.Delete = base.Operations.Delete && supported.Operations.Delete
	base.Operations.LegacyCreate = base.Operations.LegacyCreate && supported.Operations.LegacyCreate

	base.Upload.DirectUpload = base.Upload.DirectUpload && supported.Upload.DirectUpload
	base.Upload.Presign = base.Upload.Presign && supported.Upload.Presign

	if supported.Upload.MaxSize > 0 && (base.Upload.MaxSize <= 0 || base.Upload.MaxSize > supported.Upload.MaxSize) {
		base.Upload.MaxSize = supported.Upload.MaxSize
	}
	if len(supported.Upload.AcceptedKinds) > 0 {
		base.Upload.AcceptedKinds = intersectStrings(base.Upload.AcceptedKinds, supported.Upload.AcceptedKinds)
	}
	if len(supported.Upload.AcceptedMIMETypes) > 0 {
		base.Upload.AcceptedMIMETypes = intersectStrings(base.Upload.AcceptedMIMETypes, supported.Upload.AcceptedMIMETypes)
	}
	if len(supported.Picker.ValueModes) > 0 {
		base.Picker.ValueModes = intersectMediaValueModes(base.Picker.ValueModes, supported.Picker.ValueModes)
	}
	return base
}

func normalizeMediaCapabilities(base, supported MediaCapabilities) MediaCapabilities {
	base.Upload.DirectUpload = base.Upload.DirectUpload && base.Operations.Upload
	base.Upload.Presign = base.Upload.Presign && base.Operations.Presign

	if len(base.Picker.ValueModes) == 0 {
		base.Picker.ValueModes = append([]MediaValueMode{}, supported.Picker.ValueModes...)
	}
	if !base.Operations.Get && !base.Operations.Resolve {
		base.Picker.ValueModes = []MediaValueMode{MediaValueModeURL}
	}
	base.Picker.ValueModes = dedupeMediaValueModes(base.Picker.ValueModes)
	if len(base.Picker.ValueModes) == 0 {
		base.Picker.ValueModes = []MediaValueMode{MediaValueModeURL}
	}
	if !containsMediaValueMode(base.Picker.ValueModes, base.Picker.DefaultValueMode) {
		base.Picker.DefaultValueMode = firstMediaValueMode(base.Picker.ValueModes, supported.Picker.DefaultValueMode, MediaValueModeURL)
	}
	return base
}

func intersectStrings(values, allowed []string) []string {
	if len(values) == 0 {
		return append([]string{}, allowed...)
	}
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, value := range allowed {
		allowedSet[strings.TrimSpace(value)] = struct{}{}
	}
	filtered := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if _, ok := allowedSet[trimmed]; ok {
			filtered = append(filtered, trimmed)
		}
	}
	return filtered
}

func intersectMediaValueModes(values, allowed []MediaValueMode) []MediaValueMode {
	if len(values) == 0 {
		return append([]MediaValueMode{}, allowed...)
	}
	allowedSet := make(map[MediaValueMode]struct{}, len(allowed))
	for _, value := range allowed {
		allowedSet[value] = struct{}{}
	}
	filtered := make([]MediaValueMode, 0, len(values))
	for _, value := range values {
		if _, ok := allowedSet[value]; ok {
			filtered = append(filtered, value)
		}
	}
	return filtered
}

func dedupeMediaValueModes(values []MediaValueMode) []MediaValueMode {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[MediaValueMode]struct{}, len(values))
	deduped := make([]MediaValueMode, 0, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		deduped = append(deduped, value)
	}
	return deduped
}

func containsMediaValueMode(values []MediaValueMode, candidate MediaValueMode) bool {
	if candidate == "" {
		return false
	}
	for _, value := range values {
		if value == candidate {
			return true
		}
	}
	return false
}

func firstMediaValueMode(values []MediaValueMode, candidates ...MediaValueMode) MediaValueMode {
	for _, candidate := range candidates {
		if containsMediaValueMode(values, candidate) {
			return candidate
		}
	}
	if len(values) > 0 {
		return values[0]
	}
	return ""
}

func mediaQueryFromRequest(c router.Context) MediaQuery {
	return MediaQuery{
		Search:         strings.TrimSpace(c.Query("search")),
		Type:           strings.TrimSpace(c.Query("type")),
		MIMEFamily:     strings.TrimSpace(c.Query("mime_family")),
		Status:         strings.TrimSpace(c.Query("status")),
		WorkflowStatus: strings.TrimSpace(c.Query("workflow_status")),
		Sort:           strings.TrimSpace(c.Query("sort")),
		Limit:          intQuery(c, "limit"),
		Offset:         intQuery(c, "offset"),
	}
}

func mediaPageFromLegacy(items []MediaItem, query MediaQuery) MediaPage {
	filtered := make([]MediaItem, 0, len(items))
	search := strings.ToLower(strings.TrimSpace(query.Search))
	typeFilter := strings.ToLower(strings.TrimSpace(query.Type))
	statusFilter := strings.ToLower(strings.TrimSpace(query.Status))
	workflowFilter := strings.ToLower(strings.TrimSpace(query.WorkflowStatus))
	mimeFamily := strings.ToLower(strings.TrimSpace(query.MIMEFamily))

	for _, item := range items {
		if search != "" {
			haystack := strings.ToLower(strings.Join([]string{item.ID, item.Name, item.URL, item.Type, item.MIMEType}, " "))
			if !strings.Contains(haystack, search) {
				continue
			}
		}
		if typeFilter != "" && strings.ToLower(strings.TrimSpace(item.Type)) != typeFilter {
			continue
		}
		if statusFilter != "" && strings.ToLower(strings.TrimSpace(item.Status)) != statusFilter {
			continue
		}
		if workflowFilter != "" && strings.ToLower(strings.TrimSpace(item.WorkflowStatus)) != workflowFilter {
			continue
		}
		if mimeFamily != "" && !strings.HasPrefix(strings.ToLower(strings.TrimSpace(item.MIMEType)), mimeFamily+"/") {
			continue
		}
		filtered = append(filtered, item)
	}

	total := len(filtered)
	start := query.Offset
	if start < 0 {
		start = 0
	}
	if start > total {
		start = total
	}
	end := total
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}
	return MediaPage{
		Items:  append([]MediaItem{}, filtered[start:end]...),
		Total:  total,
		Limit:  query.Limit,
		Offset: query.Offset,
	}
}

func intQuery(c router.Context, key string) int {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return 0
	}
	return int(toInt64(raw))
}

func toInt64(value any) int64 {
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int64:
		return typed
	case float64:
		return int64(typed)
	case string:
		var result int64
		fmt.Sscan(strings.TrimSpace(typed), &result)
		return result
	default:
		return 0
	}
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
	if permissionErr := aBinding.admin.requirePermission(adminCtx, aBinding.admin.config.ActivityPermission, "activity"); permissionErr != nil {
		return nil, permissionErr
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
