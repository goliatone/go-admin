package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"time"
)

// PageApplicationService orchestrates admin page reads/writes plus mapping/workflow.
type PageApplicationService struct {
	Read              AdminPageReadService  `json:"read"`
	Write             AdminPageWriteService `json:"write"`
	Mapper            PageMapper            `json:"mapper"`
	Workflow          WorkflowEngine        `json:"workflow"`
	TranslationPolicy TranslationPolicy     `json:"translation_policy"`
	IncludeDefaults   *PageReadDefaults     `json:"include_defaults"`
}

// AdminPageRecord mirrors the admin read model contract for page data.
type AdminPageRecord struct {
	ID                 string                                `json:"id"`
	ContentID          string                                `json:"content_id"`
	FamilyID           string                                `json:"family_id"`
	RouteKey           string                                `json:"route_key"`
	TemplateID         string                                `json:"template_id"`
	Title              string                                `json:"title"`
	Slug               string                                `json:"slug"`
	Path               string                                `json:"path"`
	RequestedLocale    string                                `json:"requested_locale"`
	ResolvedLocale     string                                `json:"resolved_locale"`
	Translation        TranslationBundle[PageTranslation]    `json:"translation"`
	ContentTranslation TranslationBundle[ContentTranslation] `json:"content_translation"`
	Status             string                                `json:"status"`
	ParentID           string                                `json:"parent_id"`
	MetaTitle          string                                `json:"meta_title"`
	MetaDescription    string                                `json:"meta_description"`
	Summary            *string                               `json:"summary"`
	Tags               []string                              `json:"tags"`
	SchemaVersion      string                                `json:"schema_version"`
	Data               map[string]any                        `json:"data"`
	Content            any                                   `json:"content"`
	Blocks             any                                   `json:"blocks"`
	PreviewURL         string                                `json:"preview_url"`
	PublishedAt        *time.Time                            `json:"published_at"`
	CreatedAt          *time.Time                            `json:"created_at"`
	UpdatedAt          *time.Time                            `json:"updated_at"`
}

// AdminPageListOptions configures admin page list reads.
type AdminPageListOptions struct {
	Locale                    string         `json:"locale"`
	FallbackLocale            string         `json:"fallback_locale"`
	AllowMissingTranslations  bool           `json:"allow_missing_translations"`
	ExpandTranslationFamilies bool           `json:"expand_translation_families"`
	IncludeContent            bool           `json:"include_content"`
	IncludeBlocks             bool           `json:"include_blocks"`
	IncludeData               bool           `json:"include_data"`
	EnvironmentKey            string         `json:"environment_key"`
	Page                      int            `json:"page"`
	PerPage                   int            `json:"per_page"`
	SortBy                    string         `json:"sort_by"`
	SortDesc                  bool           `json:"sort_desc"`
	Search                    string         `json:"search"`
	Filters                   map[string]any `json:"filters"`
}

// AdminPageGetOptions configures admin page detail reads.
type AdminPageGetOptions struct {
	Locale                   string `json:"locale"`
	FallbackLocale           string `json:"fallback_locale"`
	AllowMissingTranslations bool   `json:"allow_missing_translations"`
	IncludeContent           bool   `json:"include_content"`
	IncludeBlocks            bool   `json:"include_blocks"`
	IncludeData              bool   `json:"include_data"`
	EnvironmentKey           string `json:"environment_key"`
}

// AdminPageReadService provides list/detail admin read operations.
type AdminPageReadService interface {
	List(ctx context.Context, opts AdminPageListOptions) ([]AdminPageRecord, int, error)
	Get(ctx context.Context, id string, opts AdminPageGetOptions) (*AdminPageRecord, error)
}

// AdminPageWriteService provides admin write operations for pages.
type AdminPageWriteService interface {
	Create(ctx context.Context, payload map[string]any) (*AdminPageRecord, error)
	Update(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error)
	Delete(ctx context.Context, id string) error
	Publish(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error)
	Unpublish(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error)
}

// PageMapper centralizes mapping between admin read models and form values.
type PageMapper interface {
	ToFormValues(record AdminPageRecord) map[string]any
}

// PageIncludeDefaults defines default include flags for read operations.
type PageIncludeDefaults struct {
	IncludeContent bool `json:"include_content"`
	IncludeBlocks  bool `json:"include_blocks"`
	IncludeData    bool `json:"include_data"`
}

// PageReadDefaults captures include defaults for list/get endpoints.
type PageReadDefaults struct {
	List PageIncludeDefaults `json:"list"`
	Get  PageIncludeDefaults `json:"get"`
}

// PageReadOptions captures caller overrides for read behavior.
type PageReadOptions struct {
	Locale                   string `json:"locale"`
	FallbackLocale           string `json:"fallback_locale"`
	AllowMissingTranslations bool   `json:"allow_missing_translations"`
	IncludeContent           *bool  `json:"include_content"`
	IncludeBlocks            *bool  `json:"include_blocks"`
	IncludeData              *bool  `json:"include_data"`
	EnvironmentKey           string `json:"environment_key"`
}

// PageListOptions captures list options plus read overrides.
type PageListOptions struct {
	PageReadOptions
	Page     int            `json:"page"`
	PerPage  int            `json:"per_page"`
	SortBy   string         `json:"sort_by"`
	SortDesc bool           `json:"sort_desc"`
	Search   string         `json:"search"`
	Filters  map[string]any `json:"filters"`
}

// PageGetOptions captures get options plus read overrides.
type PageGetOptions struct {
	PageReadOptions
}

// DefaultPageMapper provides a baseline mapping of admin read models to form values.
type DefaultPageMapper struct{}

const pageWorkflowEntityType = "content"

// List returns admin page records using list include defaults.
func (s PageApplicationService) List(ctx context.Context, opts PageListOptions) ([]AdminPageRecord, int, error) {
	if s.Read == nil {
		return nil, 0, ErrNotFound
	}
	allowMissing := true
	readOpts := AdminPageListOptions{
		Locale:                   resolveLocale(opts.Locale, localeFromContext(ctx)),
		FallbackLocale:           opts.FallbackLocale,
		AllowMissingTranslations: allowMissing,
		EnvironmentKey:           resolveChannel(opts.EnvironmentKey, environmentFromContext(ctx)),
		Page:                     opts.Page,
		PerPage:                  opts.PerPage,
		SortBy:                   opts.SortBy,
		SortDesc:                 opts.SortDesc,
		Search:                   opts.Search,
		Filters:                  opts.Filters,
	}
	expansionFilters := primitives.CloneAnyMap(opts.Filters)
	if expansionFilters == nil {
		expansionFilters = map[string]any{}
	}
	if strings.TrimSpace(readOpts.Locale) != "" {
		expansionFilters["locale"] = readOpts.Locale
	}
	readOpts.ExpandTranslationFamilies = shouldExpandTranslationFamilyRowsForContext(ctx, ListOptions{
		Filters: expansionFilters,
	})
	includes := s.applyIncludeDefaults(true, opts.PageReadOptions)
	readOpts.IncludeContent = includes.IncludeContent
	readOpts.IncludeBlocks = includes.IncludeBlocks
	readOpts.IncludeData = includes.IncludeData
	return s.Read.List(ctx, readOpts)
}

// Get retrieves a single admin page record using get include defaults.
func (s PageApplicationService) Get(ctx context.Context, id string, opts PageGetOptions) (*AdminPageRecord, error) {
	if s.Read == nil {
		return nil, ErrNotFound
	}
	allowMissing := true
	readOpts := AdminPageGetOptions{
		Locale:                   resolveLocale(opts.Locale, localeFromContext(ctx)),
		FallbackLocale:           opts.FallbackLocale,
		AllowMissingTranslations: allowMissing,
		EnvironmentKey:           resolveChannel(opts.EnvironmentKey, environmentFromContext(ctx)),
	}
	includes := s.applyIncludeDefaults(false, opts.PageReadOptions)
	readOpts.IncludeContent = includes.IncludeContent
	readOpts.IncludeBlocks = includes.IncludeBlocks
	readOpts.IncludeData = includes.IncludeData
	return s.Read.Get(ctx, id, readOpts)
}

// Create writes a new page record, applying workflow transitions when configured.
func (s PageApplicationService) Create(ctx context.Context, payload map[string]any) (*AdminPageRecord, error) {
	if s.Write == nil {
		return nil, ErrNotFound
	}
	update := primitives.CloneAnyMap(payload)
	if update == nil {
		update = map[string]any{}
	}
	if err := s.applyWorkflowTransition(ctx, "", "", update); err != nil {
		return nil, err
	}
	return s.Write.Create(ctx, update)
}

// Update writes an existing page record, applying workflow transitions when configured.
func (s PageApplicationService) Update(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error) {
	if s.Write == nil {
		return nil, ErrNotFound
	}
	update := primitives.CloneAnyMap(payload)
	if update == nil {
		update = map[string]any{}
	}
	if err := s.hydrateUpdatePayload(ctx, id, update); err != nil {
		return nil, err
	}
	if err := s.applyWorkflowWithCurrent(ctx, id, update); err != nil {
		return nil, err
	}
	return s.Write.Update(ctx, id, update)
}

// Delete removes a page record.
func (s PageApplicationService) Delete(ctx context.Context, id string) error {
	if s.Write == nil {
		return ErrNotFound
	}
	return s.Write.Delete(ctx, id)
}

// Publish applies the publish transition before delegating to the write service.
func (s PageApplicationService) Publish(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error) {
	if s.Write == nil {
		return nil, ErrNotFound
	}
	update := primitives.CloneAnyMap(payload)
	if update == nil {
		update = map[string]any{}
	}
	update["status"] = "published"
	if err := s.hydrateUpdatePayload(ctx, id, update); err != nil {
		return nil, err
	}
	if err := s.applyWorkflowWithCurrent(ctx, id, update); err != nil {
		return nil, err
	}
	return s.Write.Publish(ctx, id, update)
}

// Unpublish applies the unpublish transition before delegating to the write service.
func (s PageApplicationService) Unpublish(ctx context.Context, id string, payload map[string]any) (*AdminPageRecord, error) {
	if s.Write == nil {
		return nil, ErrNotFound
	}
	update := primitives.CloneAnyMap(payload)
	if update == nil {
		update = map[string]any{}
	}
	update["status"] = "draft"
	if err := s.hydrateUpdatePayload(ctx, id, update); err != nil {
		return nil, err
	}
	if err := s.applyWorkflowWithCurrent(ctx, id, update); err != nil {
		return nil, err
	}
	return s.Write.Unpublish(ctx, id, update)
}

// ToFormValues maps an admin record into form values.
func (s PageApplicationService) ToFormValues(record AdminPageRecord) map[string]any {
	if s.Mapper != nil {
		return s.Mapper.ToFormValues(record)
	}
	return DefaultPageMapper{}.ToFormValues(record)
}

// ToFormValues maps an admin record into form values.
func (DefaultPageMapper) ToFormValues(record AdminPageRecord) map[string]any {
	values := map[string]any{}
	setValue(values, "title", pageFormTitle(record))
	setValue(values, "slug", strings.TrimSpace(record.Slug))
	setValue(values, "path", pageFormPath(record))
	locale := resolveLocale(record.RequestedLocale, record.ResolvedLocale)
	setValue(values, "locale", locale)
	setValue(values, "requested_locale", strings.TrimSpace(record.RequestedLocale))
	setValue(values, "resolved_locale", strings.TrimSpace(record.ResolvedLocale))
	applyPageTranslationMeta(values, record)
	setValue(values, "status", strings.TrimSpace(record.Status))
	metaTitle, metaDescription := pageFormMeta(record)
	setValue(values, "meta_title", metaTitle)
	setValue(values, "meta_description", metaDescription)
	if metaTitle != "" || metaDescription != "" {
		values["meta"] = map[string]any{
			"title":       metaTitle,
			"description": metaDescription,
		}
	}

	if record.Summary != nil && strings.TrimSpace(*record.Summary) != "" {
		values["summary"] = strings.TrimSpace(*record.Summary)
	} else if summary := strings.TrimSpace(toString(extractDataValue(record.Data, "summary"))); summary != "" {
		values["summary"] = summary
	}

	if len(record.Tags) > 0 {
		values["tags"] = append([]string{}, record.Tags...)
	} else if tags := extractDataValue(record.Data, "tags"); tags != nil {
		values["tags"] = tags
	}
	if content := pageFormValue(record.Content, record.Data, "content"); content != nil {
		values["content"] = content
	}
	if blocks := pageFormValue(record.Blocks, record.Data, "blocks"); blocks != nil {
		values["blocks"] = blocks
	}
	schema := strings.TrimSpace(firstNonEmpty(record.SchemaVersion, toString(extractDataValue(record.Data, "_schema"))))
	setValue(values, "schema", schema)
	setValue(values, "_schema", schema)

	if data := primitives.CloneAnyMap(record.Data); data != nil {
		values["data"] = data
	} else {
		values["data"] = map[string]any{}
	}

	setValue(values, "content_id", strings.TrimSpace(record.ContentID))
	setValue(values, "template_id", strings.TrimSpace(record.TemplateID))
	setValue(values, "parent_id", strings.TrimSpace(record.ParentID))
	setValue(values, "family_id", strings.TrimSpace(record.FamilyID))
	routeKey := strings.TrimSpace(record.RouteKey)
	if routeKey == "" {
		routeKey = strings.TrimSpace(toString(extractDataValue(record.Data, "route_key")))
	}
	setValue(values, "route_key", routeKey)
	setValue(values, "preview_url", strings.TrimSpace(record.PreviewURL))
	if record.PublishedAt != nil {
		values["published_at"] = record.PublishedAt
	}
	if record.CreatedAt != nil {
		values["created_at"] = record.CreatedAt
	}
	if record.UpdatedAt != nil {
		values["updated_at"] = record.UpdatedAt
	}

	return values
}

func pageFormTitle(record AdminPageRecord) string {
	title := strings.TrimSpace(record.Title)
	if title != "" {
		return title
	}
	if title = strings.TrimSpace(toString(extractDataValue(record.Data, "title"))); title != "" {
		return title
	}
	return strings.TrimSpace(record.MetaTitle)
}

func pageFormPath(record AdminPageRecord) string {
	path := strings.TrimSpace(record.Path)
	if path == "" {
		path = strings.TrimSpace(toString(extractDataValue(record.Data, "path")))
	}
	if path == "" {
		path = strings.TrimSpace(record.PreviewURL)
	}
	if path == "" && strings.TrimSpace(record.Slug) != "" {
		path = "/" + strings.TrimPrefix(strings.TrimSpace(record.Slug), "/")
	}
	return path
}

func pageFormMeta(record AdminPageRecord) (string, string) {
	metaTitle := strings.TrimSpace(record.MetaTitle)
	if metaTitle == "" {
		metaTitle = strings.TrimSpace(toString(extractDataValue(record.Data, "meta_title")))
	}
	metaDescription := strings.TrimSpace(record.MetaDescription)
	if metaDescription == "" {
		metaDescription = strings.TrimSpace(toString(extractDataValue(record.Data, "meta_description")))
	}
	return metaTitle, metaDescription
}

func pageFormValue(current any, data map[string]any, key string) any {
	if current != nil {
		return current
	}
	return extractDataValue(data, key)
}

func applyPageTranslationMeta(values map[string]any, record AdminPageRecord) {
	if values == nil {
		return
	}
	if record.Translation.Meta.MissingRequestedLocale {
		values["missing_requested_locale"] = true
	}
	if record.Translation.Meta.FallbackUsed {
		values["fallback_used"] = true
	}
	if len(record.Translation.Meta.AvailableLocales) > 0 {
		values["available_locales"] = append([]string{}, record.Translation.Meta.AvailableLocales...)
	}
}

func (s PageApplicationService) applyIncludeDefaults(isList bool, opts PageReadOptions) PageIncludeDefaults {
	defaults := PageIncludeDefaults{}
	if s.IncludeDefaults != nil {
		if isList {
			defaults = s.IncludeDefaults.List
		} else {
			defaults = s.IncludeDefaults.Get
		}
	} else if !isList {
		defaults = PageIncludeDefaults{
			IncludeContent: true,
			IncludeBlocks:  true,
			IncludeData:    true,
		}
	}
	if opts.IncludeContent != nil {
		defaults.IncludeContent = *opts.IncludeContent
	}
	if opts.IncludeBlocks != nil {
		defaults.IncludeBlocks = *opts.IncludeBlocks
	}
	if opts.IncludeData != nil {
		defaults.IncludeData = *opts.IncludeData
	}
	return defaults
}

func (s PageApplicationService) applyWorkflowWithCurrent(ctx context.Context, id string, payload map[string]any) error {
	if s.Workflow == nil || payload == nil {
		return nil
	}
	target := strings.TrimSpace(toString(payload["status"]))
	if target == "" {
		return nil
	}
	current, err := s.currentPageStatus(ctx, id, payload)
	if err != nil {
		return err
	}
	return s.applyWorkflowTransition(ctx, id, current, payload)
}

func (s PageApplicationService) applyWorkflowTransition(ctx context.Context, id, current string, payload map[string]any) error {
	if s.Workflow == nil || payload == nil {
		return nil
	}
	target := strings.TrimSpace(toString(payload["status"]))
	current = strings.TrimSpace(current)
	if current == "" || target == "" || strings.EqualFold(current, target) {
		return nil
	}
	input := buildWorkflowApplyRequest(ctx, pageWorkflowEntityType, id, current, target, payload)
	if transition := strings.TrimSpace(toString(payload["transition"])); transition != "" {
		input.Event = transition
	}
	if input.Event == "" {
		snapshot, err := s.Workflow.Snapshot(ctx, WorkflowSnapshotRequest{
			MachineID: pageWorkflowEntityType,
			EntityID:  id,
			Msg: WorkflowMessage{
				EntityID:     id,
				EntityType:   pageWorkflowEntityType,
				CurrentState: current,
				TargetState:  target,
				Payload:      primitives.CloneAnyMapNilOnEmpty(payload),
			},
			ExecCtx:        input.ExecCtx,
			EvaluateGuards: true,
			IncludeBlocked: true,
		})
		if err == nil {
			input.Event = workflowEventForTargetState(snapshot, target)
		}
	}
	policyInput := buildTranslationPolicyInput(ctx, pageWorkflowEntityType, id, current, input.Event, payload)
	if err := applyTranslationPolicy(ctx, s.TranslationPolicy, policyInput); err != nil {
		return err
	}
	result, err := s.Workflow.ApplyEvent(ctx, input)
	if err != nil {
		return err
	}
	if next := workflowCurrentStateFromResponse(result); next != "" {
		payload["status"] = next
	}
	return nil
}

func (s PageApplicationService) currentPageStatus(ctx context.Context, id string, payload map[string]any) (string, error) {
	if s.Read == nil {
		return "", ErrNotFound
	}
	locale := strings.TrimSpace(toString(payload["locale"]))
	channel := strings.TrimSpace(toString(payload["channel"]))
	opts := AdminPageGetOptions{
		Locale:                   resolveLocale(locale, localeFromContext(ctx)),
		FallbackLocale:           "",
		AllowMissingTranslations: true,
		IncludeContent:           false,
		IncludeBlocks:            false,
		IncludeData:              true,
		EnvironmentKey:           resolveChannel(channel, environmentFromContext(ctx)),
	}
	record, err := s.Read.Get(ctx, id, opts)
	if err != nil {
		return "", err
	}
	if record == nil {
		return "", ErrNotFound
	}
	if record.Data != nil {
		if status := strings.TrimSpace(toString(record.Data["workflow_status"])); status != "" {
			return status, nil
		}
	}
	return strings.TrimSpace(record.Status), nil
}

func resolveLocale(preferred, fallback string) string {
	if loc := strings.TrimSpace(preferred); loc != "" {
		return loc
	}
	return strings.TrimSpace(fallback)
}

func resolveChannel(preferred, fallback string) string {
	if channel := strings.TrimSpace(preferred); channel != "" {
		return channel
	}
	return strings.TrimSpace(fallback)
}

func extractDataValue(data map[string]any, key string) any {
	if data == nil || key == "" {
		return nil
	}
	if val, ok := data[key]; ok {
		return val
	}
	return nil
}

func setValue(values map[string]any, key, value string) {
	if values == nil || strings.TrimSpace(key) == "" {
		return
	}
	if strings.TrimSpace(value) == "" {
		return
	}
	values[key] = value
}

func (s PageApplicationService) hydrateUpdatePayload(ctx context.Context, id string, payload map[string]any) error {
	if s.Read == nil || payload == nil {
		return nil
	}
	if strings.TrimSpace(id) == "" {
		return nil
	}
	if !payloadNeedsHydration(payload) {
		return nil
	}
	locale := resolveLocale(payloadString(payload, "locale"), localeFromContext(ctx))
	if locale == "" {
		locale = strings.TrimSpace(payloadString(payload, "requested_locale"))
	}
	channel := resolveChannel(payloadString(payload, "channel"), environmentFromContext(ctx))
	record, err := s.Read.Get(ctx, id, AdminPageGetOptions{
		Locale:                   locale,
		FallbackLocale:           strings.TrimSpace(payloadString(payload, "fallback_locale")),
		AllowMissingTranslations: true,
		IncludeContent:           false,
		IncludeBlocks:            false,
		IncludeData:              true,
		EnvironmentKey:           channel,
	})
	if err != nil || record == nil {
		return err
	}
	applyRecordDefaults(payload, *record)
	return nil
}

func payloadNeedsHydration(payload map[string]any) bool {
	return isBlankPayloadValue(payload["title"]) ||
		isBlankPayloadValue(payload["path"]) ||
		isBlankPayloadValue(payload["locale"])
}

func payloadString(payload map[string]any, key string) string {
	if payload == nil || key == "" {
		return ""
	}
	return strings.TrimSpace(toString(payload[key]))
}

func isBlankPayloadValue(val any) bool {
	switch v := val.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(v) == ""
	default:
		return false
	}
}

func applyRecordDefaults(payload map[string]any, record AdminPageRecord) {
	if payload == nil {
		return
	}
	setIfBlank(payload, "title", pageRecordTitle(record))
	setIfBlank(payload, "slug", strings.TrimSpace(record.Slug))
	setIfBlank(payload, "path", pageRecordPath(record))
	setIfBlank(payload, "locale", resolveLocale(record.RequestedLocale, record.ResolvedLocale))
	applyPageRecordStringDefaults(payload, record)
	applyPageRecordOptionalDefaults(payload, record)
}

func pageRecordTitle(record AdminPageRecord) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(record.Title, record.MetaTitle, record.Slug))
}

func pageRecordPath(record AdminPageRecord) string {
	path := strings.TrimSpace(primitives.FirstNonEmptyRaw(record.Path, record.PreviewURL))
	if path != "" || strings.TrimSpace(record.Slug) == "" {
		return path
	}
	return "/" + strings.TrimPrefix(strings.TrimSpace(record.Slug), "/")
}

func applyPageRecordStringDefaults(payload map[string]any, record AdminPageRecord) {
	setIfBlank(payload, "meta_title", strings.TrimSpace(record.MetaTitle))
	setIfBlank(payload, "meta_description", strings.TrimSpace(record.MetaDescription))
	setIfBlank(payload, "template_id", strings.TrimSpace(record.TemplateID))
	setIfBlank(payload, "parent_id", strings.TrimSpace(record.ParentID))
	setIfBlank(payload, "family_id", strings.TrimSpace(record.FamilyID))
	setIfBlank(payload, "route_key", pageRecordRouteKey(record))
	setIfBlank(payload, "content_id", strings.TrimSpace(record.ContentID))
}

func pageRecordRouteKey(record AdminPageRecord) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(record.RouteKey, toString(extractDataValue(record.Data, "route_key"))))
}

func applyPageRecordOptionalDefaults(payload map[string]any, record AdminPageRecord) {
	if _, ok := payload["summary"]; !ok && record.Summary != nil {
		if summary := strings.TrimSpace(*record.Summary); summary != "" {
			payload["summary"] = summary
		}
	}
	if _, ok := payload["tags"]; !ok && len(record.Tags) > 0 {
		payload["tags"] = append([]string{}, record.Tags...)
	}
	if _, ok := payload["content"]; !ok && record.Content != nil {
		payload["content"] = record.Content
	}
	if _, ok := payload["blocks"]; !ok && record.Blocks != nil {
		payload["blocks"] = record.Blocks
	}
}

func setIfBlank(payload map[string]any, key, value string) {
	if payload == nil || strings.TrimSpace(key) == "" {
		return
	}
	if !isBlankPayloadValue(payload[key]) {
		return
	}
	if strings.TrimSpace(value) == "" {
		return
	}
	payload[key] = value
}
