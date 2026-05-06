package admin

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sort"
	"strconv"
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
	if m.admin.mediaLibrary == nil {
		return nil, serviceUnavailableDomainError("media library not configured", map[string]any{
			"component": "media",
			"route":     "media.library",
		})
	}
	return m.admin.mediaLibrary.QueryMedia(adminCtx.Context, mediaQueryFromRequest(c))
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
	return nil, serviceUnavailableDomainError("media resolver not configured", map[string]any{
		"component": "media",
		"route":     "media.resolve",
	})
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
	uploaded, err := uploader.UploadMedia(adminCtx.Context, MediaUploadInput{
		MediaUploadRequest: MediaUploadRequest{
			Name:        firstNonEmpty(toString(body["name"]), file.FileName),
			FileName:    firstNonEmpty(toString(body["file_name"]), file.FileName),
			ContentType: firstNonEmpty(toString(body["content_type"]), file.ContentType),
			Size:        file.Size,
			Metadata:    extractMap(body["metadata"]),
		},
		Reader: file.Reader,
	})
	if err != nil {
		return nil, err
	}
	m.admin.recordMediaMutationActivity(adminCtx.Context, MediaMutationEvent{
		Operation: MediaMutationUpload,
		MediaID:   strings.TrimSpace(uploaded.ID),
		Reference: MediaReference{ID: uploaded.ID, URL: uploaded.URL, Name: uploaded.Name},
		After:     cloneMediaItem(uploaded),
		Request:   map[string]any{"request_kind": "upload"},
	})
	return uploaded, nil
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
	confirmed, err := confirmer.ConfirmMedia(adminCtx.Context, MediaConfirmRequest{
		UploadID:    toString(body["upload_id"]),
		Name:        toString(body["name"]),
		URL:         toString(body["url"]),
		FileName:    toString(body["file_name"]),
		ContentType: toString(body["content_type"]),
		Size:        toInt64(body["size"]),
		Metadata:    extractMap(body["metadata"]),
	})
	if err != nil {
		return nil, err
	}
	m.admin.recordMediaMutationActivity(adminCtx.Context, MediaMutationEvent{
		Operation: MediaMutationConfirm,
		MediaID:   strings.TrimSpace(confirmed.ID),
		Reference: MediaReference{ID: confirmed.ID, URL: confirmed.URL, Name: confirmed.Name},
		After:     cloneMediaItem(confirmed),
		Request:   map[string]any{"request_kind": "confirm"},
	})
	return confirmed, nil
}

func (m *mediaBinding) Update(c router.Context, id string, body map[string]any) (any, error) {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaUpdatePermission, "media"); err != nil {
		return nil, err
	}
	before, beforeErr := m.getMedia(adminCtx.Context, strings.TrimSpace(id))
	if beforeErr != nil {
		before = MediaItem{}
	}
	updater, ok := m.admin.mediaLibrary.(MediaUpdater)
	if !ok {
		return nil, serviceUnavailableDomainError("media updater not configured", map[string]any{
			"component": "media",
			"route":     "media.item",
		})
	}
	updated, err := updater.UpdateMedia(adminCtx.Context, strings.TrimSpace(id), MediaUpdateInput{
		Name:           toString(body["name"]),
		Thumbnail:      toString(body["thumbnail"]),
		Type:           toString(body["type"]),
		MIMEType:       toString(body["mime_type"]),
		Status:         toString(body["status"]),
		WorkflowStatus: toString(body["workflow_status"]),
		WorkflowError:  toString(body["workflow_error"]),
		Metadata:       extractMap(body["metadata"]),
	})
	if err != nil {
		return nil, err
	}
	m.admin.recordMediaMutationActivity(adminCtx.Context, MediaMutationEvent{
		Operation: MediaMutationUpdate,
		MediaID:   strings.TrimSpace(updated.ID),
		Reference: MediaReference{ID: updated.ID, URL: updated.URL, Name: updated.Name},
		Before:    optionalMediaItem(before),
		After:     cloneMediaItem(updated),
		Request:   map[string]any{"request_kind": "update"},
	})
	return updated, nil
}

func (m *mediaBinding) Delete(c router.Context, id string) error {
	adminCtx := m.admin.adminContextFromRequest(c, m.admin.config.DefaultLocale)
	if err := m.admin.requirePermission(adminCtx, m.admin.config.MediaDeletePermission, "media"); err != nil {
		return err
	}
	before, beforeErr := m.getMedia(adminCtx.Context, strings.TrimSpace(id))
	if beforeErr != nil {
		before = MediaItem{}
	}
	deleter, ok := m.admin.mediaLibrary.(MediaDeleter)
	if !ok {
		return serviceUnavailableDomainError("media deleter not configured", map[string]any{
			"component": "media",
			"route":     "media.item",
		})
	}
	if err := deleter.DeleteMedia(adminCtx.Context, strings.TrimSpace(id)); err != nil {
		return err
	}
	m.admin.recordMediaMutationActivity(adminCtx.Context, MediaMutationEvent{
		Operation: MediaMutationDelete,
		MediaID:   strings.TrimSpace(id),
		Reference: MediaReference{ID: strings.TrimSpace(id), URL: before.URL, Name: before.Name},
		Before:    optionalMediaItem(before),
		Request:   map[string]any{"request_kind": "delete"},
	})
	return nil
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
	return MediaItem{}, serviceUnavailableDomainError("media getter not configured", map[string]any{
		"component": "media",
		"route":     "media.item",
		"id":        strings.TrimSpace(id),
	})
}

func cloneMediaItem(item MediaItem) *MediaItem {
	cloned := item
	if len(item.Metadata) > 0 {
		cloned.Metadata = extractMap(item.Metadata)
	}
	return &cloned
}

func optionalMediaItem(item MediaItem) *MediaItem {
	if strings.TrimSpace(item.ID) == "" && strings.TrimSpace(item.URL) == "" && strings.TrimSpace(item.Name) == "" {
		return nil
	}
	return cloneMediaItem(item)
}

func (m *mediaBinding) effectiveCapabilities(adminCtx AdminContext) (MediaCapabilities, error) {
	supported := MediaCapabilities{
		Operations: MediaOperationCapabilities{
			List:    m.admin.mediaLibrary != nil,
			Get:     implementsMediaGetter(m.admin.mediaLibrary),
			Resolve: implementsMediaResolver(m.admin.mediaLibrary),
			Upload:  m.can(adminCtx, m.admin.config.MediaCreatePermission) && implementsMediaUploader(m.admin.mediaLibrary),
			Presign: m.can(adminCtx, m.admin.config.MediaCreatePermission) && implementsMediaPresigner(m.admin.mediaLibrary),
			Confirm: m.can(adminCtx, m.admin.config.MediaCreatePermission) && implementsMediaConfirmer(m.admin.mediaLibrary),
			Update:  m.can(adminCtx, m.admin.config.MediaUpdatePermission) && implementsMediaUpdater(m.admin.mediaLibrary),
			Delete:  m.can(adminCtx, m.admin.config.MediaDeletePermission) && implementsMediaDeleter(m.admin.mediaLibrary),
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

func implementsMediaGetter(lib MediaLibrary) bool {
	_, ok := lib.(MediaGetter)
	return ok
}

func implementsMediaResolver(lib MediaLibrary) bool {
	_, ok := lib.(MediaResolver)
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
	applyMediaOperationOverrides(&base.Operations, override.Operations)
	applyMediaUploadOverrides(&base.Upload, override.Upload)
	applyMediaPickerOverrides(&base.Picker, override.Picker)
	return base
}

func clampMediaCapabilities(base, supported MediaCapabilities) MediaCapabilities {
	clampMediaOperationCapabilities(&base.Operations, supported.Operations)
	clampMediaUploadCapabilities(&base.Upload, supported.Upload)
	clampMediaPickerCapabilities(&base.Picker, supported.Picker)
	return base
}

func applyMediaOperationOverrides(base *MediaOperationCapabilities, override MediaOperationCapabilityOverrides) {
	applyBoolOverride(&base.List, override.List)
	applyBoolOverride(&base.Get, override.Get)
	applyBoolOverride(&base.Resolve, override.Resolve)
	applyBoolOverride(&base.Upload, override.Upload)
	applyBoolOverride(&base.Presign, override.Presign)
	applyBoolOverride(&base.Confirm, override.Confirm)
	applyBoolOverride(&base.Update, override.Update)
	applyBoolOverride(&base.Delete, override.Delete)
}

func applyMediaUploadOverrides(base *MediaUploadCapabilities, override MediaUploadCapabilityOverrides) {
	applyBoolOverride(&base.DirectUpload, override.DirectUpload)
	applyBoolOverride(&base.Presign, override.Presign)
	applyInt64Override(&base.MaxSize, override.MaxSize)
	applyStringSliceOverride(&base.AcceptedKinds, override.AcceptedKinds)
	applyStringSliceOverride(&base.AcceptedMIMETypes, override.AcceptedMIMETypes)
}

func applyMediaPickerOverrides(base *MediaPickerCapabilities, override MediaPickerCapabilityOverrides) {
	applyMediaValueModeSliceOverride(&base.ValueModes, override.ValueModes)
	applyMediaValueModeOverride(&base.DefaultValueMode, override.DefaultValueMode)
}

func clampMediaOperationCapabilities(base *MediaOperationCapabilities, supported MediaOperationCapabilities) {
	base.List = base.List && supported.List
	base.Get = base.Get && supported.Get
	base.Resolve = base.Resolve && supported.Resolve
	base.Upload = base.Upload && supported.Upload
	base.Presign = base.Presign && supported.Presign
	base.Confirm = base.Confirm && supported.Confirm
	base.Update = base.Update && supported.Update
	base.Delete = base.Delete && supported.Delete
}

func clampMediaUploadCapabilities(base *MediaUploadCapabilities, supported MediaUploadCapabilities) {
	base.DirectUpload = base.DirectUpload && supported.DirectUpload
	base.Presign = base.Presign && supported.Presign

	if supported.MaxSize > 0 && (base.MaxSize <= 0 || base.MaxSize > supported.MaxSize) {
		base.MaxSize = supported.MaxSize
	}
	if len(supported.AcceptedKinds) > 0 {
		base.AcceptedKinds = intersectStrings(base.AcceptedKinds, supported.AcceptedKinds)
	}
	if len(supported.AcceptedMIMETypes) > 0 {
		base.AcceptedMIMETypes = intersectStrings(base.AcceptedMIMETypes, supported.AcceptedMIMETypes)
	}
}

func clampMediaPickerCapabilities(base *MediaPickerCapabilities, supported MediaPickerCapabilities) {
	if len(supported.ValueModes) > 0 {
		base.ValueModes = intersectMediaValueModes(base.ValueModes, supported.ValueModes)
	}
}

func applyBoolOverride(target *bool, override *bool) {
	if override != nil {
		*target = *override
	}
}

func applyInt64Override(target *int64, override *int64) {
	if override != nil {
		*target = *override
	}
}

func applyStringSliceOverride(target *[]string, override *[]string) {
	if override != nil {
		*target = append([]string{}, (*override)...)
	}
}

func applyMediaValueModeSliceOverride(target *[]MediaValueMode, override *[]MediaValueMode) {
	if override != nil {
		*target = append([]MediaValueMode{}, (*override)...)
	}
}

func applyMediaValueModeOverride(target *MediaValueMode, override *MediaValueMode) {
	if override != nil {
		*target = *override
	}
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
	return slices.Contains(values, candidate)
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

func mediaPageFromItems(items []MediaItem, query MediaQuery) MediaPage {
	filtered := make([]MediaItem, 0, len(items))
	filters := normalizeMediaQueryFilters(query)

	for _, item := range items {
		if !mediaItemMatchesQuery(item, filters) {
			continue
		}
		filtered = append(filtered, item)
	}
	sortMediaItems(filtered, query.Sort)

	total := len(filtered)
	start := min(max(query.Offset, 0), total)
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

func sortMediaItems(items []MediaItem, sortBy string) {
	switch strings.ToLower(strings.TrimSpace(sortBy)) {
	case "filename", "name":
		sort.SliceStable(items, func(i, j int) bool {
			left := strings.ToLower(strings.TrimSpace(items[i].Name))
			right := strings.ToLower(strings.TrimSpace(items[j].Name))
			if left == right {
				return newerMediaItem(items[i], items[j])
			}
			return left < right
		})
	case "size":
		sort.SliceStable(items, func(i, j int) bool {
			if items[i].Size == items[j].Size {
				return newerMediaItem(items[i], items[j])
			}
			return items[i].Size > items[j].Size
		})
	case "oldest":
		sort.SliceStable(items, func(i, j int) bool {
			return olderMediaItem(items[i], items[j])
		})
	default:
		sort.SliceStable(items, func(i, j int) bool {
			return newerMediaItem(items[i], items[j])
		})
	}
}

func newerMediaItem(left, right MediaItem) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return strings.TrimSpace(left.ID) > strings.TrimSpace(right.ID)
	}
	return left.CreatedAt.After(right.CreatedAt)
}

func olderMediaItem(left, right MediaItem) bool {
	if left.CreatedAt.Equal(right.CreatedAt) {
		return strings.TrimSpace(left.ID) < strings.TrimSpace(right.ID)
	}
	return left.CreatedAt.Before(right.CreatedAt)
}

type mediaQueryFilters struct {
	search         string
	typeFilter     string
	statusFilter   string
	workflowFilter string
	mimeFamily     string
}

func normalizeMediaQueryFilters(query MediaQuery) mediaQueryFilters {
	return mediaQueryFilters{
		search:         strings.ToLower(strings.TrimSpace(query.Search)),
		typeFilter:     strings.ToLower(strings.TrimSpace(query.Type)),
		statusFilter:   strings.ToLower(strings.TrimSpace(query.Status)),
		workflowFilter: strings.ToLower(strings.TrimSpace(query.WorkflowStatus)),
		mimeFamily:     strings.ToLower(strings.TrimSpace(query.MIMEFamily)),
	}
}

func mediaItemMatchesQuery(item MediaItem, filters mediaQueryFilters) bool {
	if filters.search != "" {
		haystack := strings.ToLower(strings.Join([]string{item.ID, item.Name, item.URL, item.Type, item.MIMEType}, " "))
		if !strings.Contains(haystack, filters.search) {
			return false
		}
	}
	if filters.typeFilter != "" && strings.ToLower(strings.TrimSpace(item.Type)) != filters.typeFilter {
		return false
	}
	if filters.statusFilter != "" && strings.ToLower(strings.TrimSpace(item.Status)) != filters.statusFilter {
		return false
	}
	if filters.workflowFilter != "" && strings.ToLower(strings.TrimSpace(item.WorkflowStatus)) != filters.workflowFilter {
		return false
	}
	if filters.mimeFamily != "" && !mediaItemMatchesMIMEFamily(item, filters.mimeFamily) {
		return false
	}
	return true
}

func mediaItemMatchesMIMEFamily(item MediaItem, family string) bool {
	normalized := strings.ToLower(strings.Trim(strings.TrimSpace(family), "/"))
	if normalized == "" {
		return true
	}
	return effectiveMediaItemFamily(item) == normalized
}

func effectiveMediaItemFamily(item MediaItem) string {
	mediaType := strings.ToLower(strings.TrimSpace(item.Type))
	mimeFamily := mediaFamilyFromMIME(item.MIMEType)
	if isPreviewMediaFamily(mediaType) {
		return mediaType
	}
	if isPreviewMediaFamily(mimeFamily) {
		return mimeFamily
	}
	if mediaType == "document" || mediaType == "text" {
		return mediaType
	}
	if mimeFamily == "document" || mimeFamily == "text" {
		return mimeFamily
	}
	return "asset"
}

func isPreviewMediaFamily(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "image", "vector", "video", "audio":
		return true
	default:
		return false
	}
}

func mediaFamilyFromMIME(mimeType string) string {
	value := strings.ToLower(strings.TrimSpace(strings.Split(strings.TrimSpace(mimeType), ";")[0]))
	switch {
	case value == "image/svg+xml":
		return "vector"
	case strings.HasPrefix(value, "image/"):
		return "image"
	case strings.HasPrefix(value, "video/"):
		return "video"
	case strings.HasPrefix(value, "audio/"):
		return "audio"
	case strings.HasPrefix(value, "text/"):
		return "text"
	case strings.Contains(value, "pdf") || strings.Contains(value, "document"):
		return "document"
	default:
		return ""
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
		result, err := strconv.ParseInt(strings.TrimSpace(typed), 10, 64)
		if err != nil {
			return 0
		}
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
	if err := s.applySettingsBundle(ctx, bundle, valuesRaw); err != nil {
		return nil, err
	}
	return map[string]any{
		"status": "ok",
		"values": s.admin.settings.ResolveAll(ctx.UserID),
	}, nil
}

func (s *settingsBinding) applySettingsBundle(ctx AdminContext, bundle SettingsBundle, valuesRaw map[string]any) error {
	if s.admin.commandBus != nil {
		payload := map[string]any{
			"values":  valuesRaw,
			"scope":   string(bundle.Scope),
			"user_id": bundle.UserID,
		}
		return s.admin.commandBus.DispatchByName(ctx.Context, settingsUpdateCommandName, payload, nil)
	}
	if s.admin.settingsCommand != nil {
		return s.admin.settingsCommand.Execute(ctx.Context, SettingsUpdateMsg{Bundle: bundle})
	}
	if s.admin.settings != nil {
		return s.admin.settings.Apply(ctx.Context, bundle)
	}
	return nil
}
