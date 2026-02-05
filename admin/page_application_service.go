package admin

import (
	"context"
	"strings"
	"time"
)

// PageApplicationService orchestrates admin page reads/writes plus mapping/workflow.
type PageApplicationService struct {
	Read            AdminPageReadService
	Write           AdminPageWriteService
	Mapper          PageMapper
	Workflow        WorkflowEngine
	IncludeDefaults *PageReadDefaults
}

// AdminPageRecord mirrors the admin read model contract for page data.
type AdminPageRecord struct {
	ID                 string
	ContentID          string
	TranslationGroupID string
	TemplateID         string
	Title              string
	Slug               string
	Path               string
	RequestedLocale    string
	ResolvedLocale     string
	Status             string
	ParentID           string
	MetaTitle          string
	MetaDescription    string
	Summary            *string
	Tags               []string
	SchemaVersion      string
	Data               map[string]any
	Content            any
	Blocks             any
	PreviewURL         string
	PublishedAt        *time.Time
	CreatedAt          *time.Time
	UpdatedAt          *time.Time
}

// AdminPageListOptions configures admin page list reads.
type AdminPageListOptions struct {
	Locale                   string
	FallbackLocale           string
	AllowMissingTranslations bool
	IncludeContent           bool
	IncludeBlocks            bool
	IncludeData              bool
	EnvironmentKey           string
	Page                     int
	PerPage                  int
	SortBy                   string
	SortDesc                 bool
	Search                   string
	Filters                  map[string]any
}

// AdminPageGetOptions configures admin page detail reads.
type AdminPageGetOptions struct {
	Locale                   string
	FallbackLocale           string
	AllowMissingTranslations bool
	IncludeContent           bool
	IncludeBlocks            bool
	IncludeData              bool
	EnvironmentKey           string
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
	IncludeContent bool
	IncludeBlocks  bool
	IncludeData    bool
}

// PageReadDefaults captures include defaults for list/get endpoints.
type PageReadDefaults struct {
	List PageIncludeDefaults
	Get  PageIncludeDefaults
}

// PageReadOptions captures caller overrides for read behavior.
type PageReadOptions struct {
	Locale                   string
	FallbackLocale           string
	AllowMissingTranslations bool
	IncludeContent           *bool
	IncludeBlocks            *bool
	IncludeData              *bool
	EnvironmentKey           string
}

// PageListOptions captures list options plus read overrides.
type PageListOptions struct {
	PageReadOptions
	Page     int
	PerPage  int
	SortBy   string
	SortDesc bool
	Search   string
	Filters  map[string]any
}

// PageGetOptions captures get options plus read overrides.
type PageGetOptions struct {
	PageReadOptions
}

// DefaultPageMapper provides a baseline mapping of admin read models to form values.
type DefaultPageMapper struct{}

const pageWorkflowEntityType = "pages"

// List returns admin page records using list include defaults.
func (s PageApplicationService) List(ctx context.Context, opts PageListOptions) ([]AdminPageRecord, int, error) {
	if s.Read == nil {
		return nil, 0, ErrNotFound
	}
	readOpts := AdminPageListOptions{
		Locale:                   resolveLocale(opts.Locale, localeFromContext(ctx)),
		FallbackLocale:           opts.FallbackLocale,
		AllowMissingTranslations: opts.AllowMissingTranslations,
		EnvironmentKey:           resolveEnvironment(opts.EnvironmentKey, environmentFromContext(ctx)),
		Page:                     opts.Page,
		PerPage:                  opts.PerPage,
		SortBy:                   opts.SortBy,
		SortDesc:                 opts.SortDesc,
		Search:                   opts.Search,
		Filters:                  opts.Filters,
	}
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
	readOpts := AdminPageGetOptions{
		Locale:                   resolveLocale(opts.Locale, localeFromContext(ctx)),
		FallbackLocale:           opts.FallbackLocale,
		AllowMissingTranslations: opts.AllowMissingTranslations,
		EnvironmentKey:           resolveEnvironment(opts.EnvironmentKey, environmentFromContext(ctx)),
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
	update := cloneAnyMap(payload)
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
	update := cloneAnyMap(payload)
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
	update := cloneAnyMap(payload)
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
	update := cloneAnyMap(payload)
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

	title := strings.TrimSpace(record.Title)
	if title == "" {
		title = strings.TrimSpace(toString(extractDataValue(record.Data, "title")))
		if title == "" {
			title = strings.TrimSpace(record.MetaTitle)
		}
	}
	setValue(values, "title", title)
	setValue(values, "slug", strings.TrimSpace(record.Slug))

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
	setValue(values, "path", path)

	locale := resolveLocale(record.RequestedLocale, record.ResolvedLocale)
	setValue(values, "locale", locale)
	setValue(values, "requested_locale", strings.TrimSpace(record.RequestedLocale))
	setValue(values, "resolved_locale", strings.TrimSpace(record.ResolvedLocale))
	setValue(values, "status", strings.TrimSpace(record.Status))

	metaTitle := strings.TrimSpace(record.MetaTitle)
	if metaTitle == "" {
		metaTitle = strings.TrimSpace(toString(extractDataValue(record.Data, "meta_title")))
	}
	metaDescription := strings.TrimSpace(record.MetaDescription)
	if metaDescription == "" {
		metaDescription = strings.TrimSpace(toString(extractDataValue(record.Data, "meta_description")))
	}
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

	content := record.Content
	if content == nil {
		content = extractDataValue(record.Data, "content")
	}
	if content != nil {
		values["content"] = content
	}

	blocks := record.Blocks
	if blocks == nil {
		blocks = extractDataValue(record.Data, "blocks")
	}
	if blocks != nil {
		values["blocks"] = blocks
	}

	schema := strings.TrimSpace(record.SchemaVersion)
	if schema == "" {
		schema = strings.TrimSpace(toString(extractDataValue(record.Data, "_schema")))
	}
	setValue(values, "schema", schema)
	setValue(values, "_schema", schema)

	if data := cloneAnyMap(record.Data); data != nil {
		values["data"] = data
	} else {
		values["data"] = map[string]any{}
	}

	setValue(values, "content_id", strings.TrimSpace(record.ContentID))
	setValue(values, "template_id", strings.TrimSpace(record.TemplateID))
	setValue(values, "parent_id", strings.TrimSpace(record.ParentID))
	setValue(values, "translation_group_id", strings.TrimSpace(record.TranslationGroupID))
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
	if shouldSkipWorkflow(payload) {
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
	if shouldSkipWorkflow(payload) {
		return nil
	}
	target := strings.TrimSpace(toString(payload["status"]))
	current = strings.TrimSpace(current)
	if current == "" || target == "" || strings.EqualFold(current, target) {
		return nil
	}
	input := TransitionInput{
		EntityID:     id,
		EntityType:   pageWorkflowEntityType,
		CurrentState: current,
		TargetState:  target,
		ActorID:      userIDFromContext(ctx),
	}
	if transition := strings.TrimSpace(toString(payload["transition"])); transition != "" {
		input.Transition = transition
	}
	if input.Transition == "" {
		if transitions, err := s.Workflow.AvailableTransitions(ctx, pageWorkflowEntityType, current); err == nil {
			for _, t := range transitions {
				if strings.EqualFold(strings.TrimSpace(t.To), target) {
					input.Transition = t.Name
					break
				}
			}
		}
	}
	result, err := s.Workflow.Transition(ctx, input)
	if err != nil {
		return err
	}
	if result != nil && strings.TrimSpace(result.ToState) != "" {
		payload["status"] = result.ToState
	}
	return nil
}

func (s PageApplicationService) currentPageStatus(ctx context.Context, id string, payload map[string]any) (string, error) {
	if s.Read == nil {
		return "", ErrNotFound
	}
	locale := strings.TrimSpace(toString(payload["locale"]))
	env := strings.TrimSpace(toString(payload["environment"]))
	opts := AdminPageGetOptions{
		Locale:                   resolveLocale(locale, localeFromContext(ctx)),
		FallbackLocale:           "",
		AllowMissingTranslations: true,
		IncludeContent:           false,
		IncludeBlocks:            false,
		IncludeData:              true,
		EnvironmentKey:           resolveEnvironment(env, environmentFromContext(ctx)),
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

func resolveEnvironment(preferred, fallback string) string {
	if env := strings.TrimSpace(preferred); env != "" {
		return env
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
	env := resolveEnvironment(payloadString(payload, "environment"), environmentFromContext(ctx))
	if env == "" {
		env = strings.TrimSpace(payloadString(payload, "env"))
	}
	record, err := s.Read.Get(ctx, id, AdminPageGetOptions{
		Locale:                   locale,
		FallbackLocale:           strings.TrimSpace(payloadString(payload, "fallback_locale")),
		AllowMissingTranslations: true,
		IncludeContent:           false,
		IncludeBlocks:            false,
		IncludeData:              true,
		EnvironmentKey:           env,
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
	title := strings.TrimSpace(record.Title)
	if title == "" {
		title = strings.TrimSpace(record.MetaTitle)
	}
	if title == "" {
		title = strings.TrimSpace(record.Slug)
	}
	setIfBlank(payload, "title", title)
	setIfBlank(payload, "slug", strings.TrimSpace(record.Slug))

	path := strings.TrimSpace(record.Path)
	if path == "" {
		path = strings.TrimSpace(record.PreviewURL)
	}
	if path == "" && strings.TrimSpace(record.Slug) != "" {
		path = "/" + strings.TrimPrefix(strings.TrimSpace(record.Slug), "/")
	}
	setIfBlank(payload, "path", path)

	locale := resolveLocale(record.ResolvedLocale, record.RequestedLocale)
	setIfBlank(payload, "locale", locale)

	setIfBlank(payload, "meta_title", strings.TrimSpace(record.MetaTitle))
	setIfBlank(payload, "meta_description", strings.TrimSpace(record.MetaDescription))
	setIfBlank(payload, "template_id", strings.TrimSpace(record.TemplateID))
	setIfBlank(payload, "parent_id", strings.TrimSpace(record.ParentID))
	setIfBlank(payload, "translation_group_id", strings.TrimSpace(record.TranslationGroupID))
	setIfBlank(payload, "content_id", strings.TrimSpace(record.ContentID))

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
