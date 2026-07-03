package admin

import (
	"context"
	"maps"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

const (
	TranslationSSRSurfaceDashboard         = "dashboard"
	TranslationSSRSurfaceQueue             = "queue"
	TranslationSSRSurfaceFamilyList        = "family_list"
	TranslationSSRSurfaceFamilyDetail      = "family_detail"
	TranslationSSRSurfaceFamilyAssignments = "family_assignments"
	TranslationSSRSurfaceEditor            = "editor"
	TranslationSSRSurfaceMatrix            = "matrix"
	TranslationSSRSurfaceExchange          = "exchange"
)

// TranslationSSRPresenter is the exported boundary consumed by UI route wiring.
// It keeps translation SSR hydration owned by admin, where permissions, scope,
// action-state, lifecycle, and binding contracts already live.
type TranslationSSRPresenter interface {
	Dashboard(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	FamilyList(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	FamilyDetail(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	FamilyAssignments(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	Queue(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	Editor(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	Matrix(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	Exchange(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
}

type TranslationSSRPresenterInput struct {
	BasePath           string
	APIBasePath        string
	DashboardPath      string
	QueuePath          string
	FamilyListPath     string
	FamilyBasePath     string
	MatrixPath         string
	ExchangePath       string
	EditorBasePath     string
	ContentBasePath    string
	MatrixAPIPath      string
	ExchangeAPIPath    string
	BulkActionAPIPath  string
	AssignmentID       string
	FamilyID           string
	Channel            string
	Query              map[string]string
	ExchangeUIConfig   TranslationExchangeUIConfig
	InitialPresetID    string
	SyncClientBasePath string
	EnhancedAction     EnhancedActionRuntimeOptions
}

type TranslationSSRPage struct {
	Surface      string         `json:"surface"`
	Title        string         `json:"title,omitempty"`
	Data         map[string]any `json:"data,omitempty"`
	Meta         map[string]any `json:"meta,omitempty"`
	DataGrid     map[string]any `json:"datagrid,omitempty"`
	Actions      map[string]any `json:"actions,omitempty"`
	Links        map[string]any `json:"links,omitempty"`
	Enhancement  map[string]any `json:"enhancement,omitempty"`
	Assignee     map[string]any `json:"assignee,omitempty"`
	EmptyState   map[string]any `json:"empty_state,omitempty"`
	ErrorState   map[string]any `json:"error_state,omitempty"`
	ResourceName string         `json:"resource_name,omitempty"`
}

type TranslationSSRResourceResult struct {
	Data     map[string]any `json:"data,omitempty"`
	Meta     map[string]any `json:"meta,omitempty"`
	DataGrid map[string]any `json:"datagrid,omitempty"`
}

type TranslationFamilyResourceAdapter struct {
	binding *translationFamilyBinding
}

func NewTranslationFamilyResourceAdapter(a *Admin) *TranslationFamilyResourceAdapter {
	return &TranslationFamilyResourceAdapter{binding: newTranslationFamilyBinding(a)}
}

func (a *TranslationFamilyResourceAdapter) Index(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRResourceResult, error) {
	if a == nil || a.binding == nil {
		return TranslationSSRResourceResult{}, serviceNotConfiguredDomainError("translation family resource adapter", nil)
	}
	payload, err := a.binding.List(c)
	if err != nil {
		return TranslationSSRResourceResult{}, err
	}
	data, meta := translationSSRPayloadSections(payload)
	translationSSRAttachFamilyListRowLinks(input, data)
	data["summary_cards"] = translationSSRFamilySummaryCards(input, data)
	// Include current filter values in meta for quick filter active state detection
	if readinessState := translationSSRQueryValue(input, "readiness_state"); readinessState != "" {
		meta["readiness_state"] = readinessState
	}
	return TranslationSSRResourceResult{
		Data:     data,
		Meta:     meta,
		DataGrid: translationSSRFamilyListDataGrid(input, data, meta),
	}, nil
}

func (a *TranslationFamilyResourceAdapter) Show(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRResourceResult, error) {
	if a == nil || a.binding == nil {
		return TranslationSSRResourceResult{}, serviceNotConfiguredDomainError("translation family resource adapter", nil)
	}
	payload, err := a.binding.Detail(c, strings.TrimSpace(input.FamilyID))
	if err != nil {
		return TranslationSSRResourceResult{}, err
	}
	data, meta := translationSSRPayloadSections(payload)
	return TranslationSSRResourceResult{Data: data, Meta: meta}, nil
}

type TranslationAssignmentResourceAdapter struct {
	binding *translationQueueBinding
}

func NewTranslationAssignmentResourceAdapter(a *Admin) *TranslationAssignmentResourceAdapter {
	return &TranslationAssignmentResourceAdapter{binding: newTranslationQueueBinding(a)}
}

func (a *TranslationAssignmentResourceAdapter) Index(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRResourceResult, error) {
	if a == nil || a.binding == nil {
		return TranslationSSRResourceResult{}, serviceNotConfiguredDomainError("translation assignment resource adapter", nil)
	}
	payload, err := a.binding.Assignments(c)
	if err != nil {
		return TranslationSSRResourceResult{}, err
	}
	return translationSSRQueueResult(input, payload), nil
}

func (a *TranslationAssignmentResourceAdapter) FamilyAssignments(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRResourceResult, error) {
	if a == nil || a.binding == nil {
		return TranslationSSRResourceResult{}, serviceNotConfiguredDomainError("translation assignment resource adapter", nil)
	}
	payload, err := a.binding.FamilyAssignments(c, strings.TrimSpace(input.FamilyID))
	if err != nil {
		return TranslationSSRResourceResult{}, err
	}
	return translationSSRQueueResult(input, payload), nil
}

func (a *TranslationAssignmentResourceAdapter) Show(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRResourceResult, error) {
	if a == nil || a.binding == nil {
		return TranslationSSRResourceResult{}, serviceNotConfiguredDomainError("translation assignment resource adapter", nil)
	}
	payload, err := a.binding.AssignmentDetail(c, strings.TrimSpace(input.AssignmentID))
	if err != nil {
		return TranslationSSRResourceResult{}, err
	}
	data, meta := translationSSRPayloadSections(payload)
	return TranslationSSRResourceResult{Data: data, Meta: meta}, nil
}

func NewTranslationSSRPresenter(a *Admin) TranslationSSRPresenter {
	return &translationSSRPresenter{
		admin:       a,
		families:    NewTranslationFamilyResourceAdapter(a),
		assignments: NewTranslationAssignmentResourceAdapter(a),
	}
}

type translationSSRPresenter struct {
	admin       *Admin
	families    *TranslationFamilyResourceAdapter
	assignments *TranslationAssignmentResourceAdapter
}

func (p *translationSSRPresenter) Dashboard(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	binding := newTranslationQueueBinding(p.admin)
	payload, err := binding.Dashboard(c)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	data, meta := translationSSRPayloadSections(payload)
	translationSSRDecorateDashboard(data, meta)
	return TranslationSSRPage{
		Surface:     TranslationSSRSurfaceDashboard,
		Title:       "Translation Dashboard",
		Data:        data,
		Meta:        meta,
		Links:       translationSSRDashboardLinks(input),
		Enhancement: translationSSREnhancement(input),
		EmptyState:  translationSSREmptyState("No translation dashboard activity", "Queue and family metrics will appear after translation work is available."),
	}, nil
}

func (p *translationSSRPresenter) FamilyList(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	result, err := p.families.Index(c, input)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	return TranslationSSRPage{
		Surface:      TranslationSSRSurfaceFamilyList,
		Title:        "Translation Families",
		ResourceName: "translation_families",
		Data:         result.Data,
		Meta:         result.Meta,
		DataGrid:     result.DataGrid,
		Links:        translationSSRFamilyListLinks(input),
		Enhancement:  translationSSREnhancement(input),
		EmptyState:   translationSSREmptyState("No translation families", "Families will appear after content has translation readiness metadata."),
	}, nil
}

func (p *translationSSRPresenter) FamilyDetail(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	result, err := p.families.Show(c, input)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	translationSSRDecorateFamilyDetail(result.Data)
	return TranslationSSRPage{
		Surface:      TranslationSSRSurfaceFamilyDetail,
		Title:        "Translation Family",
		ResourceName: "translation_family",
		Data:         result.Data,
		Meta:         result.Meta,
		Actions:      translationSSRFamilyDetailActions(result.Data),
		Links:        translationSSRFamilyDetailLinks(input, result.Data),
		Assignee:     translationSSRFamilyAssigneeContract(result.Data),
		Enhancement:  translationSSREnhancement(input),
		EmptyState:   translationSSREmptyState("Translation family unavailable", "This family has no locale or assignment data to display."),
	}, nil
}

func (p *translationSSRPresenter) Queue(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	input = translationSSRQueueInputWithPreset(input)
	result, err := p.assignments.Index(c, input)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	return TranslationSSRPage{
		Surface:      TranslationSSRSurfaceQueue,
		Title:        "Translation Queue",
		ResourceName: "translation_assignments",
		Data:         result.Data,
		Meta:         result.Meta,
		DataGrid:     result.DataGrid,
		Actions:      translationSSRQueueActions(input, result.Meta),
		Links:        translationSSRQueueLinks(input),
		Enhancement:  translationSSREnhancement(input),
		EmptyState:   translationSSREmptyState("No assignments in this queue", "Adjust filters or create translation assignments to populate the queue."),
	}, nil
}

func (p *translationSSRPresenter) FamilyAssignments(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	result, err := p.assignments.FamilyAssignments(c, input)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	familyID := strings.TrimSpace(input.FamilyID)
	if result.Data == nil {
		result.Data = map[string]any{}
	}
	if result.Meta == nil {
		result.Meta = map[string]any{}
	}
	result.Data["family_id"] = familyID
	result.Meta["family_id"] = familyID
	return TranslationSSRPage{
		Surface:      TranslationSSRSurfaceFamilyAssignments,
		Title:        "Family Assignments",
		ResourceName: "translation_family_assignments",
		Data:         result.Data,
		Meta:         result.Meta,
		DataGrid:     result.DataGrid,
		Actions:      translationSSRQueueActions(input, result.Meta),
		Links:        translationSSRFamilyAssignmentsLinks(input, result.Meta),
		Enhancement:  translationSSREnhancement(input),
		EmptyState:   translationSSREmptyState("No assignments for this family", "Assignments for this translation family will appear here when available."),
	}, nil
}

func (p *translationSSRPresenter) Editor(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	result, err := p.assignments.Show(c, input)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	return TranslationSSRPage{
		Surface:      TranslationSSRSurfaceEditor,
		Title:        "Translation Editor",
		ResourceName: "translation_assignment",
		Data:         result.Data,
		Meta:         result.Meta,
		Actions:      translationSSREditorActions(result.Data),
		Links:        translationSSREditorLinks(input, result.Data),
		Enhancement:  translationSSREnhancement(input),
		EmptyState:   translationSSREmptyState("Assignment unavailable", "This assignment has no editable translation fields to display."),
	}, nil
}

func (p *translationSSRPresenter) Matrix(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	binding := newTranslationFamilyBinding(p.admin)
	payload, err := binding.Matrix(c)
	if err != nil {
		return TranslationSSRPage{}, err
	}
	data, meta := translationSSRPayloadSections(payload)
	return TranslationSSRPage{
		Surface:      TranslationSSRSurfaceMatrix,
		Title:        "Translation Matrix",
		ResourceName: "translation_matrix",
		Data:         data,
		Meta:         meta,
		Actions:      translationSSRMatrixActions(data, meta),
		Links:        translationSSRMatrixLinks(input),
		Enhancement:  translationSSRMatrixEnhancement(input, meta),
		EmptyState:   translationSSREmptyState("No matrix rows", "Adjust filters or widen the locale window to inspect family coverage."),
	}, nil
}

func (p *translationSSRPresenter) Exchange(c router.Context, input TranslationSSRPresenterInput) (TranslationSSRPage, error) {
	history, meta, historyErr := p.translationExchangeHistory(c, input)
	data := map[string]any{
		"ui_config":             input.ExchangeUIConfig,
		"template":              translationSSRExchangeTemplate(input),
		"history":               history,
		"resource_options":      translationSSRExchangeResourceOptions(input.ExchangeUIConfig),
		"source_locale_options": translationSSRExchangeSourceLocaleOptions(input.ExchangeUIConfig),
		"target_locale_options": translationSSRExchangeTargetLocaleOptions(input.ExchangeUIConfig),
		"apply_defaults":        translationSSRExchangeApplyDefaults(input.ExchangeUIConfig),
	}
	exchangeMeta := map[string]any{
		"contracts":             TranslationExchangeContractPayload(),
		"history_source_policy": translationSSRExchangeHistoryPolicy(input),
	}
	maps.Copy(exchangeMeta, meta)
	page := TranslationSSRPage{
		Surface:      TranslationSSRSurfaceExchange,
		Title:        "Translation Exchange",
		ResourceName: "translation_exchange",
		Data:         data,
		Meta:         exchangeMeta,
		Actions:      translationSSRExchangeActions(p.admin, c),
		Links:        translationSSRExchangeLinks(input),
		Enhancement:  translationSSRExchangeEnhancement(input),
		EmptyState:   translationSSREmptyState("No exchange jobs", "Recent import and export jobs will appear after translation exchange activity."),
	}
	if historyErr != nil {
		page.ErrorState = map[string]any{
			"title":       "Exchange history unavailable",
			"description": historyErr.Error(),
		}
	}
	return page, nil
}

func (p *translationSSRPresenter) translationExchangeHistory(c router.Context, input TranslationSSRPresenterInput) (map[string]any, map[string]any, error) {
	binding := newTranslationExchangeBinding(p.admin)
	if binding == nil || binding.admin == nil {
		return nil, nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{"component": "translation_exchange_binding"})
	}
	if binding.runtime == nil {
		return nil, nil, serviceNotConfiguredDomainError("translation exchange runtime", map[string]any{"component": "translation_exchange_binding"})
	}
	adminCtx := binding.admin.adminContextFromRequest(c, binding.admin.config.DefaultLocale)
	if permissionErr := binding.requireHistoryPermission(adminCtx); permissionErr != nil {
		return nil, nil, permissionErr
	}
	page := clampInt(atoiDefault(translationSSRQueryValue(input, "page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(translationSSRQueryValue(input, "per_page"), 20), 1, 100)
	includeExamples := translationSSRExchangeIncludeExamples(input)
	kindFilter := translationExchangeHistoryJobKind(translationSSRQueryValue(input, "kind"))
	statusFilter := translationExchangeHistoryJobStatus(translationSSRQueryValue(input, "status"))
	identity := translationIdentityFromAdminContext(adminCtx)
	jobs, _, err := binding.runtime.ListJobs(adminCtx.Context, translationExchangeJobQuery{
		Identity: identity,
		Page:     1,
		PerPage:  10_000,
		Kind:     kindFilter,
		Status:   statusFilter,
	})
	if err != nil {
		return nil, nil, err
	}
	if includeExamples {
		jobs = append(jobs, translationExchangeHistoryExampleJobs(identity.ActorID)...)
	}
	filtered := make([]translationExchangeAsyncJob, 0, len(jobs))
	for _, job := range jobs {
		if !translationExchangeJobVisibleToIdentity(job, identity) {
			continue
		}
		if !binding.canViewHistoryJob(adminCtx, job) {
			continue
		}
		if kindFilter != "" && !strings.EqualFold(strings.TrimSpace(job.Kind), kindFilter) {
			continue
		}
		if statusFilter != "" && !strings.EqualFold(normalizeTranslationExchangeJobStatus(job.Status), statusFilter) {
			continue
		}
		filtered = append(filtered, job)
	}
	return translationExchangeHistoryPayload(filtered, page, perPage), translationExchangeHistoryMetaPayload(includeExamples), nil
}

func translationSSRPayloadSections(payload any) (map[string]any, map[string]any) {
	root := extractMap(payload)
	rawData, hasRawData := root["data"]
	data := extractMap(rawData)
	meta := extractMap(root["meta"])
	_, rawDataIsMap := rawData.(map[string]any)
	if !hasRawData && len(root) > 0 {
		data = map[string]any{}
		for key, value := range root {
			if key == "meta" {
				continue
			}
			data[key] = value
		}
	}
	if data == nil || (len(data) == 0 && hasRawData && !rawDataIsMap) {
		data = map[string]any{}
		if hasRawData && rawData != nil {
			data["items"] = rawData
			data["rows"] = rawData
		}
	}
	if meta == nil {
		meta = map[string]any{}
	}
	return data, meta
}

func translationSSRFamilyListDataGrid(input TranslationSSRPresenterInput, data, meta map[string]any) map[string]any {
	return map[string]any{
		"resource": "translation_families",
		"columns": []map[string]any{
			{"key": "family_id", "label": "Family", "sortable": true},
			{"key": "content_type", "label": "Content type", "sortable": true},
			{"key": "source_locale", "label": "Source", "sortable": true},
			{"key": "readiness_state", "label": "Readiness", "sortable": true},
			{"key": "missing_required_locale_count", "label": "Missing", "sortable": true},
			{"key": "pending_review_count", "label": "Review", "sortable": true},
			{"key": "updated_at", "label": "Updated", "sortable": true},
		},
		"filters": []map[string]any{
			{"key": "family_id", "label": "Family", "value": translationSSRQueryValue(input, "family_id")},
			{"key": "content_type", "label": "Content type", "value": translationSSRQueryValue(input, "content_type")},
			{"key": "readiness_state", "label": "Readiness", "value": translationSSRQueryValue(input, "readiness_state")},
			{"key": "blocker_code", "label": "Blocker", "value": translationSSRQueryValue(input, "blocker_code")},
			{"key": "missing_locale", "label": "Missing locale", "value": translationSSRQueryValue(input, "missing_locale")},
		},
		"quick_filters": translationSSRFamilyQuickFilters(input),
		"row_actions": []map[string]any{
			{"key": "open", "label": "Open family", "href_base": strings.TrimRight(input.FamilyBasePath, "/")},
		},
		"sort": map[string]any{"default": "updated_at", "supported": []string{"family_id", "content_type", "readiness_state", "updated_at"}},
		"pagination": map[string]any{
			"page":     meta["page"],
			"per_page": meta["per_page"],
			"total":    meta["total"],
		},
		"url_state": map[string]any{"preserve_channel": true, "channel": strings.TrimSpace(input.Channel), "filters": cloneStringMap(input.Query)},
		"items_key": "families",
		"count":     len(translationSSRList(data, "families", "items")),
	}
}

func translationSSRFamilyQuickFilters(input TranslationSSRPresenterInput) []map[string]any {
	channel := strings.TrimSpace(input.Channel)
	basePath := strings.TrimSpace(input.FamilyListPath)
	preservedFilters := translationSSRPreserveFilterQuery(input.Query, translationSSRFamilyStatusFilterPreserveKeys()...)
	return []map[string]any{
		{
			"key":   "all",
			"label": "All",
			"field": "",
			"value": "",
			"tone":  "neutral",
			"href":  translationSSRSummaryCardHref(basePath, channel, preservedFilters, "", ""),
		},
		{
			"key":   "blocked",
			"label": "Blocked",
			"field": "readiness_state",
			"value": "blocked",
			"tone":  "error",
			"href":  translationSSRSummaryCardHref(basePath, channel, preservedFilters, "readiness_state", "blocked"),
		},
		{
			"key":   "missing",
			"label": "Missing Locales",
			"field": "readiness_state",
			"value": "missing_locales",
			"tone":  "warning",
			"href":  translationSSRSummaryCardHref(basePath, channel, preservedFilters, "readiness_state", "missing_locales"),
		},
		{
			"key":   "ready",
			"label": "Ready",
			"field": "readiness_state",
			"value": "ready",
			"tone":  "success",
			"href":  translationSSRSummaryCardHref(basePath, channel, preservedFilters, "readiness_state", "ready"),
		},
	}
}

func translationSSRFamilySummaryCards(input TranslationSSRPresenterInput, data map[string]any) []map[string]any {
	families := translationSSRList(data, "families", "items")
	var total, blocked, missing, ready int
	for _, fam := range families {
		total++
		state := strings.ToLower(strings.TrimSpace(toString(fam["readiness_state"])))
		switch state {
		case "blocked":
			blocked++
		case "missing_locales", "missing_locales_and_fields":
			missing++
		case "ready":
			ready++
		}
	}
	channel := strings.TrimSpace(input.Channel)
	baseQuery := translationSSRPreserveFilterQuery(input.Query, translationSSRFamilyStatusFilterPreserveKeys()...)
	return []map[string]any{
		{
			"key":   "total",
			"label": "Total Families",
			"count": total,
			"tone":  "neutral",
			"href":  translationSSRSummaryCardHref(input.FamilyListPath, channel, baseQuery, "", ""),
		},
		{
			"key":          "blocked",
			"label":        "Blocked",
			"count":        blocked,
			"tone":         "error",
			"filter_key":   "readiness_state",
			"filter_value": "blocked",
			"href":         translationSSRSummaryCardHref(input.FamilyListPath, channel, baseQuery, "readiness_state", "blocked"),
		},
		{
			"key":          "missing",
			"label":        "Missing Locales",
			"count":        missing,
			"tone":         "warning",
			"filter_key":   "readiness_state",
			"filter_value": "missing_locales",
			"href":         translationSSRSummaryCardHref(input.FamilyListPath, channel, baseQuery, "readiness_state", "missing_locales"),
		},
		{
			"key":          "ready",
			"label":        "Ready",
			"count":        ready,
			"tone":         "success",
			"filter_key":   "readiness_state",
			"filter_value": "ready",
			"href":         translationSSRSummaryCardHref(input.FamilyListPath, channel, baseQuery, "readiness_state", "ready"),
		},
	}
}

func translationSSRQueueSummaryCards(input TranslationSSRPresenterInput, data map[string]any) []map[string]any {
	rows := translationSSRList(data, "rows", "data", "items", "assignments")
	var total, active, review, overdue, highPri int
	for _, row := range rows {
		// Skip family/group rows
		if rowType := strings.TrimSpace(toString(row["row_type"])); rowType == "family" || rowType == "group" {
			continue
		}
		total++
		status := strings.ToLower(strings.TrimSpace(toString(row["status"])))
		switch status {
		case "open", "assigned", "in_progress", "changes_requested":
			active++
		case "in_review":
			review++
		}
		if strings.ToLower(strings.TrimSpace(toString(row["due_state"]))) == "overdue" {
			overdue++
		}
		priority := strings.ToLower(strings.TrimSpace(toString(row["priority"])))
		if priority == "high" || priority == "urgent" {
			highPri++
		}
	}
	channel := strings.TrimSpace(input.Channel)
	basePath := strings.TrimSpace(input.QueuePath)
	if basePath == "" {
		basePath = strings.TrimRight(input.BasePath, "/") + "/translations/queue"
	}
	totalHrefSet := map[string]string{}
	if channel != "" {
		totalHrefSet["channel"] = channel
	}
	return []map[string]any{
		{
			"key":   "total",
			"label": "Total",
			"count": total,
			"tone":  "neutral",
			"href": translationSSRHrefWithQuery(
				basePath,
				translationSSRPreserveFilterQuery(input.Query, translationSSRQueuePresetContextFilterPreserveKeys(nil)...),
				totalHrefSet,
			),
		},
		{
			"key":    "active",
			"label":  "Active",
			"count":  active,
			"tone":   "info",
			"preset": "open",
			"href":   translationSSRQueuePresetCardHref(input, basePath, channel, "open"),
		},
		{
			"key":    "review",
			"label":  "Awaiting Review",
			"count":  review,
			"tone":   "warning",
			"preset": "needs_review",
			"href":   translationSSRQueuePresetCardHref(input, basePath, channel, "needs_review"),
		},
		{
			"key":    "overdue",
			"label":  "Overdue",
			"count":  overdue,
			"tone":   "error",
			"preset": "overdue",
			"href":   translationSSRQueuePresetCardHref(input, basePath, channel, "overdue"),
		},
		{
			"key":    "high_priority",
			"label":  "High Priority",
			"count":  highPri,
			"tone":   "warning",
			"preset": "high_priority",
			"href":   translationSSRQueuePresetCardHref(input, basePath, channel, "high_priority"),
		},
	}
}

func translationSSRQueueResult(input TranslationSSRPresenterInput, payload any) TranslationSSRResourceResult {
	data, meta := translationSSRPayloadSections(payload)
	rows := translationSSRList(data, "rows", "data", "items", "assignments")
	if len(rows) > 0 {
		translationSSRDecorateQueueRows(input, rows)
		data["rows"] = rows
		data["items"] = rows
	}
	for _, key := range []string{"total", "page", "per_page", "channel", "updated_at", "summary"} {
		if _, exists := meta[key]; !exists {
			if value, ok := data[key]; ok {
				meta[key] = value
			}
		}
	}
	if _, exists := meta["supported_sort_keys"]; !exists {
		meta["supported_sort_keys"] = TranslationQueueSupportedSortKeys()
	}
	if _, exists := meta["supported_filter_keys"]; !exists {
		meta["supported_filter_keys"] = TranslationQueueSupportedFilterKeys()
	}
	if _, exists := meta["supported_review_states"]; !exists {
		meta["supported_review_states"] = TranslationQueueSupportedReviewStates()
	}
	if _, exists := meta["default_sort"]; !exists {
		meta["default_sort"] = translationQueueDefaultSortContract()
	}
	if _, exists := meta["saved_filter_presets"]; !exists {
		meta["saved_filter_presets"] = TranslationQueueSavedFilterPresets()
	}
	if _, exists := meta["saved_review_filter_presets"]; !exists {
		meta["saved_review_filter_presets"] = TranslationQueueSavedReviewFilterPresets()
	}
	if _, exists := meta["grouping"]; !exists {
		meta["grouping"] = map[string]any{"mode": "flat"}
	}
	if _, exists := meta["bulk_selection"]; !exists {
		meta["bulk_selection"] = map[string]any{"mode": "current_page"}
	}
	// Add summary cards for queue overview
	data["summary_cards"] = translationSSRQueueSummaryCards(input, data)
	return TranslationSSRResourceResult{
		Data:     data,
		Meta:     meta,
		DataGrid: translationSSRQueueDataGrid(input, data, meta),
	}
}

func translationSSRQueueDataGrid(input TranslationSSRPresenterInput, data, meta map[string]any) map[string]any {
	filters := translationSSRQueueFilterControls(meta["supported_filter_keys"], input)
	activeFilterChips := translationSSRQueueActiveFilterChips(input.Query, filters, input)
	return map[string]any{
		"resource": "translation_assignments",
		"columns": []map[string]any{
			{"key": "assignment_id", "label": "Assignment", "sortable": true},
			{"key": "family_id", "label": "Family", "sortable": true},
			{"key": "target_locale", "label": "Locale", "sortable": true},
			{"key": "status", "label": "Status", "sortable": true},
			{"key": "priority", "label": "Priority", "sortable": true},
			{"key": "due_date", "label": "Due", "sortable": true},
			{"key": "updated_at", "label": "Updated", "sortable": true},
		},
		"filters":                 filters,
		"filter_action":           translationSSRQueueFilterAction(input),
		"quick_filters":           translationSSRQueueQuickFilters(input),
		"active_filter_chips":     activeFilterChips,
		"active_filter_count":     len(activeFilterChips),
		"sort":                    translationSSRQueueSortModel(input, meta),
		"saved_filter_presets":    translationSSREnrichQueuePresets(input, meta["saved_filter_presets"]),
		"review_filter_presets":   translationSSREnrichQueuePresets(input, meta["saved_review_filter_presets"]),
		"grouping":                meta["grouping"],
		"bulk_selection":          meta["bulk_selection"],
		"server_family_supported": meta["server_family_grouping_supported"],
		"view_links":              translationSSRQueueViewLinks(input),
		"view_mode":               translationSSRQueueViewMode(meta),
		"row_actions": []map[string]any{
			{"key": "open_editor", "label": "Open editor", "href_base": strings.TrimRight(input.EditorBasePath, "/")},
			{"key": "claim", "label": "Claim", "action_state": "actions.claim"},
			{"key": "release", "label": "Release", "action_state": "actions.release"},
		},
		"bulk_actions": []map[string]any{
			{"key": "claim", "label": "Claim selected"},
			{"key": "release", "label": "Release selected"},
			{"key": "archive", "label": "Archive selected"},
		},
		"pagination": translationSSRQueuePagination(input, meta),
		"url_state":  map[string]any{"preserve_channel": true, "channel": strings.TrimSpace(input.Channel), "filters": cloneStringMap(input.Query)},
		"items_key":  "data",
		"count":      len(translationSSRList(data)),
	}
}

func translationSSRQueuePagination(input TranslationSSRPresenterInput, meta map[string]any) map[string]any {
	page := clampInt(atoiDefault(toString(meta["page"]), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(toString(meta["per_page"]), 25), 1, 200)
	total := max(0, atoiDefault(toString(meta["total"]), 0))
	pageCount := 1
	if total > 0 && perPage > 0 {
		pageCount = (total + perPage - 1) / perPage
	}
	page = clampInt(page, 1, pageCount)
	rangeStart := 0
	rangeEnd := 0
	if total > 0 {
		start := (page-1)*perPage + 1
		if start <= total {
			rangeStart = start
			rangeEnd = min(start+perPage-1, total)
		}
	}
	previousDisabled := page <= 1
	nextDisabled := page >= pageCount
	choices := []map[string]any{}
	for _, choice := range []int{25, 50, 100} {
		choices = append(choices, map[string]any{
			"value":   choice,
			"label":   strconv.Itoa(choice),
			"active":  perPage == choice,
			"href":    translationSSRQueuePaginationHref(input, map[string]string{"page": "1", "per_page": strconv.Itoa(choice)}),
			"current": perPage == choice,
		})
	}
	return map[string]any{
		"page":              page,
		"per_page":          perPage,
		"total":             total,
		"page_count":        pageCount,
		"range_start":       rangeStart,
		"range_end":         rangeEnd,
		"range_label":       "Showing " + strconv.Itoa(rangeStart) + "-" + strconv.Itoa(rangeEnd) + " of " + strconv.Itoa(total) + " assignments",
		"page_label":        "Assignment page " + strconv.Itoa(page) + " of " + strconv.Itoa(pageCount),
		"previous_disabled": previousDisabled,
		"next_disabled":     nextDisabled,
		"previous_href":     translationSSRQueuePaginationHref(input, map[string]string{"page": strconv.Itoa(max(1, page-1)), "per_page": strconv.Itoa(perPage)}),
		"next_href":         translationSSRQueuePaginationHref(input, map[string]string{"page": strconv.Itoa(min(pageCount, page+1)), "per_page": strconv.Itoa(perPage)}),
		"page_size_choices": choices,
	}
}

func translationSSRQueuePaginationHref(input TranslationSSRPresenterInput, set map[string]string) string {
	base := translationSSRQueueBasePath(input)
	next := cloneStringMap(set)
	if next == nil {
		next = map[string]string{}
	}
	if channel := strings.TrimSpace(input.Channel); channel != "" {
		next["channel"] = channel
	}
	return translationSSRHrefWithQuery(base, input.Query, next)
}

func translationSSRQueueInputWithPreset(input TranslationSSRPresenterInput) TranslationSSRPresenterInput {
	input.Query = translationSSRQueueNormalizeQuery(input.Query)
	presetID := strings.TrimSpace(input.Query["preset"])
	if presetID == "" {
		return input
	}
	presetQuery := TranslationQueuePresetQuery(presetID)
	if len(presetQuery) == 0 {
		return input
	}
	expanded := cloneStringMap(presetQuery)
	if expanded == nil {
		expanded = map[string]string{}
	}
	for key, value := range input.Query {
		if key = strings.TrimSpace(key); key == "" {
			continue
		}
		if value = strings.TrimSpace(value); value != "" {
			expanded[key] = value
		}
	}
	expanded["preset"] = presetID
	input.Query = expanded
	return input
}

func translationSSRQueueNormalizeQuery(query map[string]string) map[string]string {
	if len(query) == 0 {
		return query
	}
	normalized := cloneStringMap(query)
	if normalized == nil {
		normalized = map[string]string{}
	}
	if strings.TrimSpace(normalized["entity_type"]) == "" {
		if value := firstNonEmpty(normalized["content_type"], normalized["type"]); strings.TrimSpace(value) != "" {
			normalized["entity_type"] = strings.TrimSpace(value)
		}
	}
	delete(normalized, "content_type")
	delete(normalized, "type")
	return normalized
}

func translationSSRQueueQuickFilters(input TranslationSSRPresenterInput) []map[string]any {
	channel := strings.TrimSpace(input.Channel)
	basePath := strings.TrimSpace(input.QueuePath)
	if basePath == "" {
		basePath = strings.TrimRight(input.BasePath, "/") + "/translations/queue"
	}
	preservedFilters := translationSSRPreserveFilterQuery(input.Query, translationSSRQueueStatusFilterPreserveKeys()...)
	currentStatus := strings.ToLower(strings.TrimSpace(input.Query["status"]))
	return []map[string]any{
		{
			"key":    "all",
			"label":  "All",
			"field":  "",
			"value":  "",
			"tone":   "neutral",
			"href":   translationSSRSummaryCardHref(basePath, channel, preservedFilters, "", ""),
			"active": currentStatus == "",
		},
		{
			"key":    "assigned",
			"label":  "Assigned",
			"field":  "status",
			"value":  "assigned",
			"tone":   "info",
			"href":   translationSSRSummaryCardHref(basePath, channel, preservedFilters, "status", "assigned"),
			"active": currentStatus == "assigned",
		},
		{
			"key":    "in_progress",
			"label":  "In Progress",
			"field":  "status",
			"value":  "in_progress",
			"tone":   "info",
			"href":   translationSSRSummaryCardHref(basePath, channel, preservedFilters, "status", "in_progress"),
			"active": currentStatus == "in_progress",
		},
		{
			"key":    "in_review",
			"label":  "In Review",
			"field":  "status",
			"value":  "in_review",
			"tone":   "warning",
			"href":   translationSSRSummaryCardHref(basePath, channel, preservedFilters, "status", "in_review"),
			"active": currentStatus == "in_review",
		},
		{
			"key":    "changes_requested",
			"label":  "Changes Requested",
			"field":  "status",
			"value":  "changes_requested",
			"tone":   "error",
			"href":   translationSSRSummaryCardHref(basePath, channel, preservedFilters, "status", "changes_requested"),
			"active": currentStatus == "changes_requested",
		},
	}
}

func translationSSRQueueFilterControls(raw any, input TranslationSSRPresenterInput) []map[string]any {
	keys := translationSSRStringSlice(raw)
	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		value := translationSSRQueueFilterValue(input.Query, key)
		label := translationSSRQueueFilterLabel(key)
		control := map[string]any{
			"key":           key,
			"name":          key,
			"label":         label,
			"value":         value,
			"current_value": value,
			"placeholder":   "All " + strings.ToLower(label),
			"clear_url":     translationSSRQueueClearFilterHref(input, key),
		}
		if options := translationSSRQueueFilterOptions(key); len(options) > 0 {
			control["type"] = "select"
			control["options"] = options
		}
		out = append(out, map[string]any{
			"key":           control["key"],
			"name":          control["name"],
			"label":         control["label"],
			"value":         control["value"],
			"current_value": control["current_value"],
			"placeholder":   control["placeholder"],
			"clear_url":     control["clear_url"],
			"type":          control["type"],
			"options":       control["options"],
		})
	}
	return out
}

func translationSSRQueueFilterValue(query map[string]string, key string) string {
	key = strings.TrimSpace(key)
	if len(query) == 0 || key == "" {
		return ""
	}
	switch key {
	case "entity_type":
		return strings.TrimSpace(firstNonEmpty(query["entity_type"], query["content_type"], query["type"]))
	case "locale":
		return strings.TrimSpace(firstNonEmpty(query["locale"], query["target_locale"]))
	default:
		return strings.TrimSpace(query[key])
	}
}

func translationSSRQueueFilterLabel(key string) string {
	switch strings.TrimSpace(key) {
	case "entity_type":
		return "Type"
	case "locale", "target_locale":
		return "Target Locale"
	case "review_state":
		return "Review State"
	default:
		return translationSSRHumanLabel(key)
	}
}

func translationSSRQueueFilterOptions(key string) []map[string]any {
	values := []string{}
	switch strings.TrimSpace(key) {
	case "status":
		values = []string{"open", "assigned", "in_progress", "in_review", "changes_requested", "approved", "archived"}
	case "priority":
		values = []string{"low", "normal", "high", "urgent"}
	case "review_state":
		values = TranslationQueueSupportedReviewStates()
	}
	if len(values) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(values))
	for _, value := range values {
		out = append(out, map[string]any{"value": value, "label": translationSSRFormatFilterValue(value)})
	}
	return out
}

func translationSSRQueueClearFilterHref(input TranslationSSRPresenterInput, key string) string {
	remove := []string{strings.TrimSpace(key), "page"}
	switch strings.TrimSpace(key) {
	case "entity_type":
		remove = append(remove, "content_type", "type")
	case "locale":
		remove = append(remove, "target_locale")
	}
	return translationSSRHrefWithQuery(
		translationSSRQueueBasePath(input),
		input.Query,
		map[string]string{"channel": strings.TrimSpace(input.Channel), "page": "1"},
		remove...,
	)
}

func translationSSRQueueFilterAction(input TranslationSSRPresenterInput) string {
	return translationSSRHrefWithQuery(
		translationSSRQueueBasePath(input),
		input.Query,
		map[string]string{"channel": strings.TrimSpace(input.Channel), "page": "1"},
		"page",
	)
}

func translationSSRDecorateDashboard(data, meta map[string]any) {
	if data == nil {
		return
	}
	cardLabels := translationSSRDecorateDashboardCards(data)
	translationSSRDecorateDashboardDisplay(data, meta)
	translationSSRDecorateDashboardAlerts(data, cardLabels)
	translationSSRDecorateDashboardTables(data)
}

func translationSSRDecorateDashboardDisplay(data, meta map[string]any) {
	display := extractMap(data["display"])
	if display == nil {
		display = map[string]any{}
	}
	generated := translationSSRFirstPresentValue(meta["generated_at"], data["generated"], data["generated_at"])
	display["generated_label"] = translationSSRFormatTimestamp(generated)
	display["refresh_interval_label"] = translationSSRFormatMilliseconds(firstNonEmpty(toString(meta["refresh_interval_ms"]), toString(data["refresh_interval_ms"])))
	display["latency_target_label"] = translationSSRFormatMilliseconds(firstNonEmpty(toString(meta["latency_target_ms"]), toString(data["latency_target_ms"]), "300"))
	data["display"] = display
}

func translationSSRDecorateDashboardCards(data map[string]any) map[string]string {
	cards := translationSSRList(data, "cards")
	cardLabels := map[string]string{}
	for _, card := range cards {
		label := translationSSRDashboardCardLabel(card)
		card["display_label"] = label
		card["display_status"] = translationSSRAlertLabel(extractMap(card["alert"]))
		cardLabels[strings.TrimSpace(toString(card["id"]))] = label
	}
	if len(cards) > 0 {
		data["cards"] = cards
	}
	return cardLabels
}

func translationSSRDecorateDashboardAlerts(data map[string]any, cardLabels map[string]string) {
	alerts := translationSSRAnyList(data["alerts"])
	for _, alert := range alerts {
		alert["display_label"] = translationSSRAlertLabel(alert)
		cardID := firstNonEmpty(toString(alert["card_id"]), toString(alert["cardId"]))
		alert["display_card_label"] = firstNonEmpty(cardLabels[cardID], translationSSRHumanLabel(cardID))
	}
	if len(alerts) > 0 {
		data["alerts"] = alerts
		data["alert_summary"] = translationSSRDashboardAlertSummary(alerts, cardLabels)
	}
}

func translationSSRDecorateDashboardTables(data map[string]any) {
	tables := extractMap(data["tables"])
	for key, raw := range tables {
		table := extractMap(raw)
		if len(table) == 0 {
			continue
		}
		tableID := firstNonEmpty(toString(table["id"]), key)
		table["id"] = tableID
		switch tableID {
		case "blocked_families":
			table["variant"] = "blocked_families"
			table["display_label"] = "Blocked"
			table["columns"] = []map[string]any{
				{"key": "family", "label": "Family"},
				{"key": "blockers", "label": "Blockers"},
				{"key": "affected", "label": "Affected"},
				{"key": "missing", "label": "Missing"},
				{"key": "review", "label": "Review"},
				{"key": "actions", "label": "Actions"},
			}
			rows := translationSSRAnyList(table["rows"])
			for _, row := range rows {
				translationSSRDecorateDashboardBlockedRow(row)
			}
			table["rows"] = rows
		case "top_overdue_assignments":
			table["variant"] = "overdue_assignments"
			table["display_label"] = "Overdue"
			table["columns"] = []map[string]any{
				{"key": "assignment", "label": "Assignment"},
				{"key": "locale", "label": "Locale"},
				{"key": "priority", "label": "Priority"},
				{"key": "status", "label": "Status"},
				{"key": "overdue", "label": "Overdue"},
				{"key": "actions", "label": "Actions"},
			}
			rows := translationSSRAnyList(table["rows"])
			for _, row := range rows {
				translationSSRDecorateDashboardOverdueRow(row)
			}
			table["rows"] = rows
		default:
			table["variant"] = "generic"
			table["display_label"] = translationSSRHumanLabel(firstNonEmpty(toString(table["label"]), tableID))
		}
		tables[key] = table
	}
	if len(tables) > 0 {
		data["tables"] = tables
		data["ordered_tables"] = translationSSRDashboardOrderedTables(tables)
	}
}

func translationSSRDashboardOrderedTables(tables map[string]any) []map[string]any {
	if len(tables) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(tables))
	seen := map[string]bool{}
	appendTable := func(key string) {
		if seen[key] {
			return
		}
		table := extractMap(tables[key])
		if len(table) == 0 {
			return
		}
		seen[key] = true
		out = append(out, table)
	}
	for _, key := range []string{"blocked_families", "top_overdue_assignments"} {
		appendTable(key)
	}
	extras := make([]string, 0, len(tables))
	for key := range tables {
		if !seen[key] {
			extras = append(extras, key)
		}
	}
	sort.Strings(extras)
	for _, key := range extras {
		appendTable(key)
	}
	return out
}

func translationSSRDashboardCardLabel(card map[string]any) string {
	id := strings.TrimSpace(toString(card["id"]))
	switch id {
	case "my_tasks":
		return "Tasks"
	case "needs_review":
		return "Review"
	case "overdue_assignments":
		return "Overdue"
	case "blocked_families":
		return "Blocked"
	case "missing_required_locales":
		return "Missing"
	default:
		return firstNonEmpty(toString(card["short_label"]), toString(card["label"]), translationSSRHumanLabel(id), "Metric")
	}
}

func translationSSRDashboardAlertSummary(alerts []map[string]any, cardLabels map[string]string) map[string]any {
	chips := []map[string]any{}
	seen := map[string]bool{}
	severityCounts := map[string]int{}
	for _, alert := range alerts {
		cardID := firstNonEmpty(toString(alert["card_id"]), toString(alert["cardId"]))
		label := firstNonEmpty(cardLabels[cardID], translationSSRAlertLabel(alert))
		severity := translationSSRAlertSeverity(alert)
		if severity != "" {
			severityCounts[severity]++
		}
		key := strings.ToLower(label)
		if label == "" || seen[key] {
			continue
		}
		seen[key] = true
		chips = append(chips, map[string]any{"label": label, "card_id": cardID})
	}
	status := "alert"
	count := len(alerts)
	labelSeverity := "alert"
	for _, severity := range []string{"critical", "warning", "degraded", "info"} {
		if severityCounts[severity] == 0 {
			continue
		}
		status = severity
		count = severityCounts[severity]
		labelSeverity = severity
		break
	}
	return map[string]any{
		"count":  len(alerts),
		"label":  strconv.Itoa(count) + " " + translationSSRAlertSummaryNoun(labelSeverity, count),
		"chips":  chips,
		"status": status,
	}
}

func translationSSRAlertSeverity(alert map[string]any) string {
	state := strings.ToLower(strings.TrimSpace(firstNonEmpty(toString(alert["state"]), toString(alert["severity"]), toString(alert["status"]))))
	switch state {
	case "critical", "warning", "degraded", "info":
		return state
	case "healthy", "ok", "success":
		return ""
	}
	message := strings.ToLower(strings.TrimSpace(firstNonEmpty(toString(alert["message"]), toString(alert["code"]))))
	switch {
	case strings.Contains(message, "critical"), strings.Contains(message, "action required"), strings.Contains(message, "blocked"):
		return "critical"
	case strings.Contains(message, "warning"), strings.Contains(message, "attention"), strings.Contains(message, "overdue"):
		return "warning"
	case strings.Contains(message, "degraded"):
		return "degraded"
	default:
		return "info"
	}
}

func translationSSRAlertSummaryNoun(severity string, count int) string {
	switch severity {
	case "critical":
		return "critical"
	case "warning":
		if count == 1 {
			return "warning"
		}
		return "warnings"
	case "degraded":
		return "degraded"
	case "info":
		return "info"
	default:
		if count == 1 {
			return "alert"
		}
		return "alerts"
	}
}

func translationSSRDecorateDashboardOverdueRow(row map[string]any) {
	row["display_title"] = firstNonEmpty(toString(row["source_title"]), toString(row["title"]), toString(row["assignment_id"]), "Assignment")
	row["display_identifier"] = translationSSRShortID(firstNonEmpty(toString(row["assignment_id"]), toString(row["id"])))
	row["display_locale"] = translationSSRLocaleRoute(toString(row["source_locale"]), toString(row["target_locale"]))
	row["display_priority"] = translationSSRHumanLabel(toString(row["priority"]))
	row["display_status"] = translationSSRHumanLabel(firstNonEmpty(toString(row["status"]), toString(row["queue_state"])))
	row["display_overdue"] = translationSSRMinutesLabel(row["overdue_minutes"])
}

func translationSSRDecorateDashboardBlockedRow(row map[string]any) {
	row["display_title"] = firstNonEmpty(toString(row["source_title"]), toString(row["content_type"]), toString(row["family_id"]), "Family")
	row["display_identifier"] = translationSSRShortID(firstNonEmpty(toString(row["family_id"]), toString(row["id"])))
	row["display_missing"] = toString(row["missing_required_locale_count"])
	row["display_review"] = toString(row["pending_review_count"])
	row["display_blockers"] = translationSSRBlockerChips(row)
	locales := row["affected_locales"]
	if locales == nil {
		locales = row["affectedLocales"]
	}
	row["display_locales"] = translationSSRLocaleChips(locales)
}

func translationSSRDecorateQueueRows(input TranslationSSRPresenterInput, rows []map[string]any) {
	for _, row := range rows {
		if translationSSRQueueRowIsFamily(row) {
			translationSSRDecorateQueueFamilyRow(input, row)
			continue
		}
		row["display_title"] = firstNonEmpty(toString(row["source_title"]), toString(row["source_path"]), toString(row["assignment_id"]), toString(row["id"]))
		row["display_type"] = translationSSRHumanLabel(firstNonEmpty(toString(row["entity_type"]), "content"))
		row["display_identifier"] = translationSSRShortID(firstNonEmpty(toString(row["family_id"]), toString(row["assignment_id"]), toString(row["id"])))
		row["display_locale"] = translationSSRLocaleRoute(toString(row["source_locale"]), toString(row["target_locale"]))
		row["display_status"] = translationSSRHumanLabel(firstNonEmpty(toString(row["status"]), toString(row["queue_state"]), "unknown"))
		row["display_priority"] = translationSSRHumanLabel(toString(row["priority"]))
		row["display_due_state"] = translationSSRHumanLabel(toString(row["due_state"]))
		row["display_due_date"] = translationSSRFormatDate(row["due_date"])
		row["display_assignee"] = firstNonEmpty(toString(row["assignee_label"]), translationSSRActorFallback(toString(row["assignee_id"])), "Unassigned")
		row["display_reviewer"] = firstNonEmpty(toString(row["reviewer_label"]), translationSSRActorFallback(toString(row["reviewer_id"])))
		row["editor_href"] = translationSSRHrefWithQuery(
			strings.TrimRight(strings.TrimSpace(input.EditorBasePath), "/")+"/"+url.PathEscape(firstNonEmpty(toString(row["assignment_id"]), toString(row["id"])))+"/edit",
			nil,
			map[string]string{"channel": strings.TrimSpace(input.Channel)},
		)
	}
}

func translationSSRQueueRowIsFamily(row map[string]any) bool {
	rowType := strings.TrimSpace(toString(row["row_type"]))
	return rowType == "family" || rowType == "group"
}

func translationSSRDecorateQueueFamilyRow(input TranslationSSRPresenterInput, row map[string]any) {
	row["display_due"] = translationSSRHumanLabel(firstNonEmpty(toString(row["due_state"]), toString(row["family_blocker_count"])))
	row["display_locales"] = translationSSRLocaleChips(row["target_locales"])

	// UI drill-down to this family's assignments; expansion.href stays the JSON
	// child-assignments endpoint for client-side expansion.
	familyID := strings.TrimSpace(toString(row["family_id"]))
	if familyID == "" {
		return
	}

	base := strings.TrimSpace(input.FamilyBasePath)
	if base == "" {
		base = strings.TrimRight(strings.TrimSpace(input.BasePath), "/") + "/translations/families"
	}

	query := cloneStringMap(input.Query)
	expansionQuery := translationSSRStringMap(extractMap(extractMap(row["expansion"])["query"]))
	if len(expansionQuery) > 0 {
		query = expansionQuery
	}

	row["assignments_href"] = translationSSRHrefWithQuery(
		strings.TrimRight(base, "/")+"/"+url.PathEscape(familyID)+"/assignments",
		query,
		map[string]string{"channel": strings.TrimSpace(input.Channel)},
	)
}

func translationSSRQueueActiveFilterChips(query map[string]string, controls []map[string]any, input TranslationSSRPresenterInput) []map[string]any {
	visible := map[string]map[string]any{}
	orderedKeys := []string{}
	for _, control := range controls {
		key := strings.TrimSpace(toString(control["key"]))
		if key == "" {
			continue
		}
		visible[key] = control
		orderedKeys = append(orderedKeys, key)
	}
	chips := []map[string]any{}
	seen := map[string]bool{}
	appendChip := func(key string) {
		key = strings.TrimSpace(key)
		value := translationSSRQueueFilterValue(query, key)
		if key == "" || value == "" || translationSSRQueueFilterChipHidden(key) {
			return
		}
		if seen[key] {
			return
		}
		seen[key] = true
		label := translationSSRHumanLabel(key)
		clearURL := translationSSRQueueClearFilterHref(input, key)
		if control, ok := visible[key]; ok {
			label = firstNonEmpty(toString(control["label"]), label)
			clearURL = firstNonEmpty(toString(control["clear_url"]), clearURL)
		}
		chips = append(chips, map[string]any{
			"key":       key,
			"label":     label,
			"value":     translationSSRFormatFilterValue(value),
			"clear_url": clearURL,
		})
	}
	for _, key := range orderedKeys {
		appendChip(key)
	}
	extraKeys := make([]string, 0, len(query))
	for key := range query {
		if _, ok := visible[key]; ok {
			continue
		}
		extraKeys = append(extraKeys, key)
	}
	sort.Strings(extraKeys)
	for _, key := range extraKeys {
		appendChip(key)
	}
	return chips
}

func translationSSRQueueFilterChipHidden(key string) bool {
	switch strings.TrimSpace(key) {
	case "channel", "tenant_id", "org_id", "group_by", "group_strategy", "page", "per_page", "sort", "order", "sort_by", "sort_desc", "preset":
		return true
	default:
		return false
	}
}

func translationSSRQueueSortLabel(raw any) string {
	sort := "due_date"
	order := "asc"
	values := extractMap(raw)
	if len(values) > 0 {
		sort = firstNonEmpty(toString(values["sort"]), sort)
		order = firstNonEmpty(toString(values["order"]), order)
	}
	direction := "ascending"
	if strings.EqualFold(strings.TrimSpace(order), "desc") {
		direction = "descending"
	}
	return strings.TrimSpace(translationSSRHumanLabel(sort) + ", " + direction)
}

func translationSSRQueueSortModel(input TranslationSSRPresenterInput, meta map[string]any) map[string]any {
	defaultSort := extractMap(meta["default_sort"])
	defaultKey := firstNonEmpty(toString(defaultSort["key"]), toString(defaultSort["sort"]), "updated_at")
	defaultOrder := firstNonEmpty(toString(defaultSort["order"]), "desc")
	key := firstNonEmpty(input.Query["sort"], input.Query["sort_by"], defaultKey)
	order := firstNonEmpty(input.Query["order"], input.Query["direction"], defaultOrder)
	if !strings.EqualFold(strings.TrimSpace(order), "asc") {
		order = "desc"
	}
	return map[string]any{
		"default":   defaultSort,
		"key":       strings.TrimSpace(key),
		"order":     strings.TrimSpace(order),
		"label":     translationSSRQueueSortLabel(map[string]any{"sort": key, "order": order}),
		"supported": meta["supported_sort_keys"],
	}
}

func translationSSRDecorateFamilyDetail(data map[string]any) {
	if data == nil {
		return
	}
	data["display_family_identifier"] = translationSSRShortID(toString(data["family_id"]))
	blockers := translationSSRAnyList(data["blockers"])
	for _, blocker := range blockers {
		blocker["display_label"] = translationSSRBlockerLabel(firstNonEmpty(toString(blocker["blocker_code"]), toString(blocker["code"])))
	}
	if len(blockers) > 0 {
		data["blockers"] = blockers
	}
	variants := translationSSRAnyList(data["locale_variants"])
	for _, variant := range variants {
		variant["display_status"] = translationSSRHumanLabel(firstNonEmpty(toString(variant["status"]), "unknown"))
		variant["display_updated"] = translationSSRFormatDate(variant["updated_at"])
	}
	if len(variants) > 0 {
		data["locale_variants"] = variants
	}
	assignments := translationSSRAnyList(data["active_assignments"])
	for _, assignment := range assignments {
		assignment["display_status"] = translationSSRHumanLabel(firstNonEmpty(toString(assignment["status"]), "open"))
		assignment["display_priority"] = translationSSRHumanLabel(firstNonEmpty(toString(assignment["priority"]), "normal"))
		assignment["display_assignee"] = translationFamilyDisplayActorLabel(
			toString(assignment["display_assignee"]),
			toString(assignment["assignee_label"]),
			toString(assignment["assignee_id"]),
			"Unassigned",
		)
		assignment["display_assigner"] = firstNonEmpty(toString(assignment["display_assigner"]), translationFamilyActorFallback(toString(assignment["assigner_id"]), "System"))
		assignment["display_assigned_at"] = firstNonEmpty(toString(assignment["display_assigned_at"]), translationSSRFormatDate(assignment["assigned_at"]))
		if sentence := translationFamilyAssignmentActivitySentence(assignment); sentence != "" {
			assignment["activity_sentence"] = sentence
		}
		assignment["display_updated"] = translationSSRFormatDate(assignment["updated_at"])
	}
	if len(assignments) > 0 {
		data["active_assignments"] = assignments
	}
	localeAssignments := extractMap(data["locale_assignments"])
	translationSSRReconcileFamilyLocaleAssignments(localeAssignments, assignments)
	for key, raw := range localeAssignments {
		item := extractMap(raw)
		if len(item) == 0 {
			continue
		}
		item["display_state"] = translationSSRHumanLabel(firstNonEmpty(toString(item["state"]), "unassigned"))
		assignment := extractMap(item["assignment"])
		if len(assignment) > 0 {
			assignment["display_status"] = translationSSRHumanLabel(toString(assignment["status"]))
			displayAssignee := translationFamilyDisplayActorLabel(
				toString(assignment["display_assignee"]),
				toString(assignment["assignee_label"]),
				toString(assignment["assignee_id"]),
				"No active assignment",
			)
			if strings.EqualFold(strings.TrimSpace(toString(item["state"])), "assigned_to_me") {
				displayAssignee = "me"
			}
			assignment["display_assignee"] = displayAssignee
			item["assignment"] = assignment
		}
		localeAssignments[key] = item
	}
	if len(localeAssignments) > 0 {
		data["locale_assignments"] = localeAssignments
	}
	translationSSRDecorateFamilyLocaleCoverageRows(data, variants, localeAssignments)
}

func translationSSRReconcileFamilyLocaleAssignments(localeAssignments map[string]any, assignments []map[string]any) {
	if len(assignments) == 0 {
		return
	}
	for _, assignment := range assignments {
		locale := translationSSRNormalizeLocale(toString(assignment["target_locale"]))
		if locale == "" {
			continue
		}
		workScope := normalizeTranslationAssignmentWorkScope(toString(assignment["work_scope"]))
		key := translationFamilyLocaleAssignmentKey(locale, workScope)
		item, itemKey := translationSSRFindLocaleAssignmentEntry(localeAssignments, key, locale, workScope)
		if len(item) == 0 {
			item = map[string]any{
				"locale":     locale,
				"work_scope": workScope,
			}
			itemKey = key
		}
		if len(extractMap(item["assignment"])) == 0 {
			item["assignment"] = assignment
		}
		if strings.TrimSpace(toString(item["state"])) == "" || strings.EqualFold(strings.TrimSpace(toString(item["state"])), "unassigned") {
			item["state"] = translationSSRFamilyLocaleAssignmentStateFromAssignment(assignment)
		}
		if strings.TrimSpace(toString(item["locale"])) == "" {
			item["locale"] = locale
		}
		if strings.TrimSpace(toString(item["work_scope"])) == "" {
			item["work_scope"] = workScope
		}
		localeAssignments[itemKey] = item
	}
}

func translationSSRFindLocaleAssignmentEntry(localeAssignments map[string]any, exactKey, locale, workScope string) (map[string]any, string) {
	if item := extractMap(localeAssignments[exactKey]); len(item) > 0 {
		return item, exactKey
	}
	prefix := translationSSRNormalizeLocale(locale) + ":"
	normalizedScope := normalizeTranslationAssignmentWorkScope(workScope)
	genericScope := translationSSRFamilyGenericAssignmentWorkScope(normalizedScope)
	for key, raw := range localeAssignments {
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(key)), prefix) {
			item := extractMap(raw)
			if genericScope && len(item) > 0 {
				return item, key
			}
			itemScope := normalizeTranslationAssignmentWorkScope(firstNonEmpty(toString(item["work_scope"]), translationSSRFamilyAssignmentWorkScopeFromKey(key)))
			if len(item) > 0 && len(extractMap(item["assignment"])) == 0 && strings.EqualFold(itemScope, normalizedScope) {
				return item, key
			}
		}
	}
	return nil, exactKey
}

func translationSSRFamilyGenericAssignmentWorkScope(workScope string) bool {
	workScope = strings.TrimSpace(strings.ToLower(workScope))
	return workScope == "" || workScope == "__all__"
}

func translationSSRFamilyLocaleAssignmentStateFromAssignment(assignment map[string]any) string {
	switch strings.ToLower(strings.TrimSpace(toString(assignment["status"]))) {
	case string(AssignmentStatusOpen):
		return "open_pool"
	case string(AssignmentStatusAssigned), string(AssignmentStatusChangesRequested):
		return "assigned_to_other"
	case string(AssignmentStatusInProgress):
		return "in_progress"
	case string(AssignmentStatusInReview):
		return "in_review"
	default:
		return "terminal"
	}
}

type translationSSRLocaleAssignmentEntry struct {
	key        string
	locale     string
	workScope  string
	assignment map[string]any
}

func translationSSRDecorateFamilyLocaleCoverageRows(data map[string]any, variants []map[string]any, localeAssignments map[string]any) {
	if data == nil {
		return
	}
	if len(variants) == 0 {
		variants = translationSSRAnyList(data["locale_variants"])
	}
	if len(localeAssignments) == 0 {
		localeAssignments = extractMap(data["locale_assignments"])
	}

	assignmentsByLocale := translationSSRFamilyLocaleAssignmentsByLocale(localeAssignments)
	sourceLocale := translationSSRNormalizeLocale(firstNonEmpty(toString(data["source_locale"]), toString(extractMap(data["policy"])["source_locale"])))
	rows, seen := translationSSRFamilyLocaleCoverageVariantRows(data, variants, assignmentsByLocale, sourceLocale, len(localeAssignments))
	rows = translationSSRAppendFamilyLocaleCoverageAssignmentRows(data, rows, seen, assignmentsByLocale)
	rows = translationSSRAppendFamilyLocaleCoverageMissingRows(data, rows, seen)
	if len(rows) > 0 {
		data["locale_coverage_rows"] = rows
	}
}

func translationSSRFamilyLocaleAssignmentsByLocale(localeAssignments map[string]any) map[string][]translationSSRLocaleAssignmentEntry {
	assignmentsByLocale := map[string][]translationSSRLocaleAssignmentEntry{}
	for assignmentKey, raw := range localeAssignments {
		item := extractMap(raw)
		locale := translationSSRNormalizeLocale(firstNonEmpty(toString(item["locale"]), strings.Split(assignmentKey, ":")[0]))
		if locale == "" {
			continue
		}
		workScope := firstNonEmpty(toString(item["work_scope"]), translationSSRFamilyAssignmentWorkScopeFromKey(assignmentKey))
		assignmentsByLocale[locale] = append(assignmentsByLocale[locale], translationSSRLocaleAssignmentEntry{
			key:        assignmentKey,
			locale:     locale,
			workScope:  workScope,
			assignment: item,
		})
	}
	for locale, entries := range assignmentsByLocale {
		sort.SliceStable(entries, func(i, j int) bool {
			return translationSSRFamilyLocaleAssignmentEntryLess(entries[i], entries[j])
		})
		assignmentsByLocale[locale] = entries
	}
	return assignmentsByLocale
}

func translationSSRFamilyLocaleAssignmentEntryLess(left, right translationSSRLocaleAssignmentEntry) bool {
	leftRank := translationSSRFamilyLocaleAssignmentStateRank(left.assignment)
	rightRank := translationSSRFamilyLocaleAssignmentStateRank(right.assignment)
	if leftRank != rightRank {
		return leftRank < rightRank
	}
	if !strings.EqualFold(left.workScope, right.workScope) {
		return strings.ToLower(left.workScope) < strings.ToLower(right.workScope)
	}
	return left.key < right.key
}

func translationSSRFamilyLocaleCoverageVariantRows(
	data map[string]any,
	variants []map[string]any,
	assignmentsByLocale map[string][]translationSSRLocaleAssignmentEntry,
	sourceLocale string,
	assignmentCount int,
) ([]map[string]any, map[string]bool) {
	rows := make([]map[string]any, 0, len(variants)+assignmentCount)
	seen := map[string]bool{}
	for _, variant := range variants {
		locale := translationSSRNormalizeLocale(toString(variant["locale"]))
		if locale == "" {
			continue
		}
		rows = translationSSRAppendFamilyLocaleCoverageVariantRow(data, rows, locale, variant, assignmentsByLocale[locale], sourceLocale)
		seen[locale] = true
	}
	return rows, seen
}

func translationSSRAppendFamilyLocaleCoverageVariantRow(
	data map[string]any,
	rows []map[string]any,
	locale string,
	variant map[string]any,
	entries []translationSSRLocaleAssignmentEntry,
	sourceLocale string,
) []map[string]any {
	var primary translationSSRLocaleAssignmentEntry
	if len(entries) > 0 {
		primary = entries[0]
	}
	rows = append(rows, translationSSRFamilyLocaleCoverageVariantRow(data, variant, primary.assignment, primary.key, sourceLocale))
	if len(entries) <= 1 {
		return rows
	}
	for _, extra := range entries[1:] {
		if toString(extra.assignment["state"]) == "source_locale" {
			continue
		}
		rows = append(rows, translationSSRFamilyLocaleCoverageAssignmentOnlyRow(data, locale, extra.assignment, extra.key))
	}
	return rows
}

func translationSSRAppendFamilyLocaleCoverageAssignmentRows(
	data map[string]any,
	rows []map[string]any,
	seen map[string]bool,
	assignmentsByLocale map[string][]translationSSRLocaleAssignmentEntry,
) []map[string]any {
	assignmentLocales := make([]string, 0, len(assignmentsByLocale))
	for locale := range assignmentsByLocale {
		if !seen[locale] {
			assignmentLocales = append(assignmentLocales, locale)
		}
	}
	sort.Strings(assignmentLocales)
	for _, locale := range assignmentLocales {
		for _, entry := range assignmentsByLocale[locale] {
			if toString(entry.assignment["state"]) == "source_locale" {
				continue
			}
			rows = append(rows, translationSSRFamilyLocaleCoverageAssignmentOnlyRow(data, locale, entry.assignment, entry.key))
		}
		seen[locale] = true
	}
	return rows
}

func translationSSRAppendFamilyLocaleCoverageMissingRows(data map[string]any, rows []map[string]any, seen map[string]bool) []map[string]any {
	for _, locale := range translationSSRFamilyMissingRequiredLocales(data) {
		if seen[locale] {
			continue
		}
		rows = append(rows, translationSSRFamilyLocaleCoverageMissingRow(data, locale))
		seen[locale] = true
	}
	return rows
}

func translationSSRFamilyLocaleCoverageVariantRow(data map[string]any, variant, assignment map[string]any, assignmentKey, sourceLocale string) map[string]any {
	locale := translationSSRNormalizeLocale(toString(variant["locale"]))
	isSource := translationSSRTruthy(variant["is_source"]) || (sourceLocale != "" && locale == sourceLocale)
	row := map[string]any{
		"locale":                locale,
		"display_locale":        strings.ToUpper(locale),
		"kind":                  "variant",
		"tone":                  "neutral",
		"title":                 firstNonEmpty(toString(extractMap(variant["fields"])["title"]), toString(extractMap(extractMap(data["source_variant"])["fields"])["title"]), translationSSRShortID(toString(data["family_id"]))),
		"updated_label":         firstNonEmpty(toString(variant["display_updated"]), translationSSRFormatDate(variant["updated_at"])),
		"locale_assignment":     assignment,
		"locale_assignment_key": assignmentKey,
		"open_locale_href":      translationSSRFamilyVariantHref(data, variant),
	}
	badges := []map[string]any{}
	if isSource {
		row["kind"] = "source"
		row["tone"] = "source"
		badges = append(badges, map[string]any{"label": "Source", "tone": "source"})
	}
	status := firstNonEmpty(toString(variant["display_status"]), translationSSRHumanLabel(toString(variant["status"])), "Unknown")
	if status != "" {
		// status carries the raw code so the status badge partial resolves the
		// canonical registry tone; label keeps the humanized form.
		badges = append(badges, map[string]any{"status": strings.ToLower(strings.TrimSpace(toString(variant["status"]))), "label": status})
	}
	row["badges"] = badges
	translationSSRApplyLocaleAssignmentToRow(row, assignment, assignmentKey)
	return row
}

func translationSSRFamilyLocaleCoverageAssignmentOnlyRow(data map[string]any, locale string, assignment map[string]any, assignmentKey string) map[string]any {
	row := map[string]any{
		"locale":                locale,
		"display_locale":        strings.ToUpper(locale),
		"kind":                  "assignment",
		"tone":                  "neutral",
		"title":                 firstNonEmpty(toString(extractMap(extractMap(data["source_variant"])["fields"])["title"]), translationSSRShortID(toString(data["family_id"]))),
		"updated_label":         "",
		"locale_assignment":     assignment,
		"locale_assignment_key": assignmentKey,
		"badges":                []map[string]any{},
	}
	translationSSRApplyLocaleAssignmentToRow(row, assignment, assignmentKey)
	return row
}

func translationSSRFamilyLocaleCoverageMissingRow(data map[string]any, locale string) map[string]any {
	quickCreate := extractMap(data["quick_create"])
	enabled := translationSSRTruthy(quickCreate["enabled"])
	reason := firstNonEmpty(toString(quickCreate["disabled_reason"]), toString(quickCreate["reason"]))
	return map[string]any{
		"locale":         locale,
		"display_locale": strings.ToUpper(locale),
		"kind":           "missing_required",
		"tone":           "danger",
		"title":          "This locale is required by policy before the family is publish-ready.",
		"badges": []map[string]any{{
			"status": "missing_locale",
			"label":  "Missing required locale",
		}},
		"create_locale_action": map[string]any{
			"enabled": enabled,
			"locale":  locale,
			"label":   "Create locale",
			"reason":  reason,
		},
	}
}

func translationSSRApplyLocaleAssignmentToRow(row, assignment map[string]any, assignmentKey string) {
	if row == nil || len(assignment) == 0 {
		return
	}
	row["locale_assignment"] = assignment
	row["locale_assignment_key"] = assignmentKey
	row["assignment"] = extractMap(assignment["assignment"])
	actions := extractMap(assignment["actions"])
	row["assign_to_me_action"] = extractMap(actions["assign_to_me"])
	row["assign_to_user_action"] = extractMap(actions["assign_to_user"])
	row["claim_action"] = extractMap(actions["claim"])
	openAction := extractMap(actions["open_editor"])
	row["open_locale_action"] = openAction
	if href := toString(openAction["href"]); href != "" {
		row["open_locale_href"] = href
	}
	row["assignment_summary"] = firstNonEmpty(
		toString(extractMap(assignment["assignment"])["display_assignee"]),
		toString(extractMap(assignment["assignment"])["assignee_label"]),
		toString(extractMap(assignment["assignment"])["assignee_id"]),
		"No active assignment",
	)
	state := firstNonEmpty(toString(assignment["display_state"]), translationSSRHumanLabel(toString(assignment["state"])))
	if state == "" {
		return
	}
	// Deduplicate badge labels: variant status, assignment state, and
	// assignment status frequently coincide ("In Progress" three times).
	badges := translationSSRAnyList(row["badges"])
	seenLabels := map[string]bool{}
	for _, badge := range badges {
		seenLabels[strings.ToLower(strings.TrimSpace(toString(badge["label"])))] = true
	}
	appendBadge := func(rawCode, label string) {
		key := strings.ToLower(strings.TrimSpace(label))
		if key == "" || seenLabels[key] {
			return
		}
		seenLabels[key] = true
		badges = append(badges, map[string]any{"status": strings.ToLower(strings.TrimSpace(rawCode)), "label": label})
	}
	if toString(assignment["state"]) != "source_locale" {
		appendBadge(toString(assignment["state"]), state)
	}
	if status := firstNonEmpty(toString(extractMap(assignment["assignment"])["display_status"]), translationSSRHumanLabel(toString(extractMap(assignment["assignment"])["status"]))); status != "" {
		appendBadge(toString(extractMap(assignment["assignment"])["status"]), status)
	}
	row["badges"] = badges
}

func translationSSRFamilyMissingRequiredLocales(data map[string]any) []string {
	seen := map[string]bool{}
	out := []string{}
	appendLocale := func(raw string) {
		locale := translationSSRNormalizeLocale(raw)
		if locale == "" || seen[locale] {
			return
		}
		seen[locale] = true
		out = append(out, locale)
	}
	for _, container := range []map[string]any{data, extractMap(data["readiness_summary"]), extractMap(data["quick_create"])} {
		for _, key := range []string{"missing_locales", "missing_required_locales"} {
			for _, locale := range translationSSRStringSlice(container[key]) {
				appendLocale(locale)
			}
		}
	}
	for _, blocker := range translationSSRAnyList(data["blockers"]) {
		code := firstNonEmpty(toString(blocker["blocker_code"]), toString(blocker["code"]))
		if strings.EqualFold(strings.TrimSpace(code), "missing_locale") {
			appendLocale(toString(blocker["locale"]))
		}
	}
	sort.Strings(out)
	return out
}

func translationSSRFamilyVariantHref(data map[string]any, variant map[string]any) string {
	base := firstNonEmpty(toString(data["content_base_path"]), "/admin/content")
	contentType := firstNonEmpty(toString(data["content_type"]), toString(extractMap(data["policy"])["content_type"]), "content")
	recordID := firstNonEmpty(toString(variant["source_record_id"]), toString(variant["id"]))
	if recordID == "" {
		return ""
	}
	href := strings.TrimRight(base, "/") + "/" + contentType + "/" + recordID
	return translationSSRHrefWithQuery(href, nil, map[string]string{
		"locale":  toString(variant["locale"]),
		"channel": translationSSRFamilyChannel(data),
	})
}

func translationSSRFamilyChannel(data map[string]any) string {
	return firstNonEmpty(
		toString(data["channel"]),
		toString(extractMap(data["meta"])["channel"]),
		toString(extractMap(data["request"])["channel"]),
	)
}

func translationSSRFamilyAssignmentWorkScopeFromKey(key string) string {
	parts := strings.SplitN(strings.TrimSpace(key), ":", 2)
	if len(parts) != 2 {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func translationSSRFamilyLocaleAssignmentStateRank(assignment map[string]any) int {
	state := strings.ToLower(strings.TrimSpace(toString(assignment["state"])))
	switch state {
	case "source_locale":
		return 0
	case "assigned", "in_progress", "review", "in_review", "open_pool", "open":
		return 1
	case "unassigned", "":
		return 3
	default:
		return 2
	}
}

func translationSSRNormalizeLocale(locale string) string {
	return strings.ToLower(strings.TrimSpace(locale))
}

func translationSSRTruthy(raw any) bool {
	switch value := raw.(type) {
	case bool:
		return value
	case string:
		switch strings.ToLower(strings.TrimSpace(value)) {
		case "true", "1", "yes", "y", "enabled":
			return true
		}
	}
	return false
}

func translationSSRAlertLabel(alert map[string]any) string {
	message := strings.TrimSpace(firstNonEmpty(toString(alert["display_label"]), toString(alert["message"]), toString(alert["code"])))
	switch strings.ToLower(strings.ReplaceAll(message, "_", " ")) {
	case "action required":
		return "Action"
	case "needs attention":
		return "Attention"
	case "healthy":
		return "Healthy"
	}
	return firstNonEmpty(translationSSRHumanLabel(message), "Action")
}

func translationSSRBlockerChips(row map[string]any) []map[string]any {
	codes := translationSSRStringSlice(row["blocker_codes"])
	if len(codes) == 0 {
		codes = translationSSRStringSlice(row["blockerCodes"])
	}
	labels := extractMap(row["blocker_labels"])
	if len(labels) == 0 {
		labels = extractMap(row["blockerLabels"])
	}
	out := make([]map[string]any, 0, len(codes)+len(labels))
	seen := map[string]bool{}
	for _, code := range codes {
		label := firstNonEmpty(toString(labels[code]), translationSSRBlockerLabel(code))
		key := strings.ToLower(label)
		if label == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, map[string]any{"code": code, "label": label, "tone": translationSSRBlockerTone(code)})
	}
	for code, rawLabel := range labels {
		label := firstNonEmpty(toString(rawLabel), translationSSRBlockerLabel(code))
		key := strings.ToLower(label)
		if label == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, map[string]any{"code": code, "label": label, "tone": translationSSRBlockerTone(code)})
	}
	return out
}

func translationSSRLocaleChips(raw any) []map[string]any {
	locales := translationSSRStringSlice(raw)
	out := make([]map[string]any, 0, len(locales))
	for i, locale := range locales {
		if i >= 3 {
			out = append(out, map[string]any{"label": "+" + strconv.Itoa(len(locales)-i), "overflow": true})
			break
		}
		out = append(out, map[string]any{"label": strings.ToUpper(strings.TrimSpace(locale))})
	}
	return out
}

func translationSSRBlockerLabel(code string) string {
	switch strings.ToLower(strings.TrimSpace(code)) {
	case "missing_locale":
		return "Missing locale"
	case "pending_review":
		return "Pending review"
	case "outdated_source":
		return "Outdated source"
	case "qa_blocked":
		return "QA blocked"
	default:
		return translationSSRHumanLabel(code)
	}
}

// translationSSRBlockerTone mirrors the canonical status registry
// (pkg/client/assets/src/shared/status-vocabulary.ts): pending_review is
// warning everywhere, not info.
func translationSSRBlockerTone(code string) string {
	switch strings.ToLower(strings.TrimSpace(code)) {
	case "missing_locale", "pending_review":
		return "warning"
	case "outdated_source", "qa_blocked":
		return "danger"
	default:
		return "neutral"
	}
}

func translationSSRActorFallback(id string) string {
	id = strings.TrimSpace(id)
	if id == "" || id == "__me__" || id == "__missing_actor__" {
		return ""
	}
	return id
}

func translationSSRFormatFilterValue(value string) string {
	parts := strings.Split(value, ",")
	formatted := make([]string, 0, len(parts))
	for _, part := range parts {
		if text := translationSSRHumanLabel(part); text != "" {
			formatted = append(formatted, text)
		}
	}
	return strings.Join(formatted, ", ")
}

func translationSSRLocaleRoute(source, target string) string {
	source = strings.ToUpper(strings.TrimSpace(source))
	target = strings.ToUpper(strings.TrimSpace(target))
	if source == "" {
		source = "-"
	}
	if target == "" {
		target = "-"
	}
	return source + " → " + target
}

func translationSSRShortID(id string) string {
	id = strings.TrimSpace(id)
	if len(id) <= 12 {
		return id
	}
	return id[:8] + "..." + id[len(id)-4:]
}

func translationSSRMinutesLabel(raw any) string {
	value := strings.TrimSpace(toString(raw))
	if value == "" {
		return "-"
	}
	return value + "m"
}

func translationSSRFormatMilliseconds(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	ms, err := strconv.Atoi(value)
	if err != nil {
		return value
	}
	if ms > 0 && ms%1000 == 0 {
		return strconv.Itoa(ms/1000) + "s"
	}
	return strconv.Itoa(ms) + "ms"
}

func translationSSRFormatTimestamp(value any) string {
	if parsed, ok := translationSSRTimeFromAny(value); ok {
		return parsed.Local().Format("1/2/2006, 3:04:05 PM")
	}
	text := strings.TrimSpace(toString(value))
	if text == "" {
		return "now"
	}
	return text
}

func translationSSRFormatDate(value any) string {
	if parsed, ok := translationSSRTimeFromAny(value); ok {
		return parsed.Local().Format("Jan 2, 2006")
	}
	text := strings.TrimSpace(toString(value))
	if text == "" || strings.HasPrefix(text, "0001-01-01") {
		// Zero-value Go timestamps must never leak into the UI.
		return ""
	}
	return text
}

func translationSSRFirstPresentValue(values ...any) any {
	for _, value := range values {
		if t, ok := value.(time.Time); ok && !t.IsZero() {
			return value
		}
		if t, ok := value.(*time.Time); ok && t != nil && !t.IsZero() {
			return value
		}
		if strings.TrimSpace(toString(value)) != "" {
			return value
		}
	}
	return nil
}

func translationSSRTimeFromAny(value any) (time.Time, bool) {
	switch typed := value.(type) {
	case time.Time:
		if typed.IsZero() {
			return time.Time{}, false
		}
		return typed, true
	case *time.Time:
		if typed == nil || typed.IsZero() {
			return time.Time{}, false
		}
		return *typed, true
	}
	text := strings.TrimSpace(toString(value))
	if text == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05 -0700 MST",
		"2006-01-02",
	} {
		if parsed, err := time.Parse(layout, text); err == nil {
			if parsed.IsZero() {
				return time.Time{}, false
			}
			return parsed, true
		}
	}
	return time.Time{}, false
}

func translationSSRHumanLabel(key string) string {
	key = strings.TrimSpace(strings.ReplaceAll(key, "_", " "))
	if key == "" {
		return ""
	}
	parts := strings.Fields(key)
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func translationSSRStringSlice(raw any) []string {
	switch value := raw.(type) {
	case []string:
		return append([]string{}, value...)
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			if text := strings.TrimSpace(toString(item)); text != "" {
				out = append(out, text)
			}
		}
		return out
	case []map[string]any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			if text := strings.TrimSpace(toString(item["key"])); text != "" {
				out = append(out, text)
			}
		}
		return out
	default:
		return nil
	}
}

func translationSSREnhancement(input TranslationSSRPresenterInput) map[string]any {
	enhancedAction := input.EnhancedAction
	if enhancedAction == (EnhancedActionRuntimeOptions{}) {
		enhancedAction = EnhancedActionRuntimeOptionsFromConfig(DefaultEnhancedActionNegotiationConfig())
	}
	return map[string]any{
		"api_base_path":          strings.TrimRight(input.APIBasePath, "/"),
		"base_path":              strings.TrimRight(input.BasePath, "/"),
		"channel":                strings.TrimSpace(input.Channel),
		"bulk_action_api_path":   strings.TrimSpace(input.BulkActionAPIPath),
		"sync_client_base_path":  strings.TrimSpace(input.SyncClientBasePath),
		"initial_preset_id":      strings.TrimSpace(input.InitialPresetID),
		"preserve_channel_query": strings.TrimSpace(input.Channel) != "",
		"enhanced_action":        enhancedAction,
	}
}

func translationSSRDashboardLinks(input TranslationSSRPresenterInput) map[string]any {
	return map[string]any{
		"dashboard": translationSSRHrefWithQuery(input.DashboardPath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}),
		"queue":     translationSSRHrefWithQuery(input.QueuePath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}),
		"families":  translationSSRHrefWithQuery(input.FamilyListPath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}),
	}
}

func translationSSRFamilyListLinks(input TranslationSSRPresenterInput) map[string]any {
	filterQuery := map[string]string{
		"channel":         strings.TrimSpace(input.Channel),
		"content_type":    translationSSRQueryValue(input, "content_type"),
		"readiness_state": translationSSRQueryValue(input, "readiness_state"),
		"blocker_code":    translationSSRQueryValue(input, "blocker_code"),
		"missing_locale":  translationSSRQueryValue(input, "missing_locale"),
	}
	return map[string]any{
		"families": input.FamilyListPath,
		"family":   input.FamilyBasePath,
		"matrix":   translationSSRHrefWithQuery(input.MatrixPath, input.Query, filterQuery),
		"queue":    translationSSRHrefWithQuery(input.QueuePath, input.Query, filterQuery),
	}
}

func translationSSRFamilyDetailLinks(input TranslationSSRPresenterInput, data map[string]any) map[string]any {
	return map[string]any{
		"family":       input.FamilyBasePath,
		"content_base": input.ContentBasePath,
		"family_id":    firstNonEmpty(toString(data["family_id"]), strings.TrimSpace(input.FamilyID)),
	}
}

func translationSSRQueueLinks(input TranslationSSRPresenterInput) map[string]any {
	return map[string]any{
		"queue":       input.QueuePath,
		"editor_base": input.EditorBasePath,
	}
}

func translationSSRFamilyAssignmentsLinks(input TranslationSSRPresenterInput, meta map[string]any) map[string]any {
	familyID := strings.TrimSpace(input.FamilyID)
	familyDetail := ""
	if strings.TrimSpace(input.FamilyBasePath) != "" && familyID != "" {
		familyDetail = translationSSRHrefWithQuery(
			strings.TrimRight(strings.TrimSpace(input.FamilyBasePath), "/")+"/"+url.PathEscape(familyID),
			input.Query,
			map[string]string{"channel": strings.TrimSpace(input.Channel)},
		)
	}
	links := map[string]any{
		"queue":         translationSSRHrefWithQuery(input.QueuePath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}),
		"family_detail": familyDetail,
		"family_id":     familyID,
		"editor_base":   input.EditorBasePath,
	}
	page := atoiDefault(toString(meta["page"]), 1)
	if page <= 0 {
		page = 1
	}
	if page > 1 {
		links["previous"] = translationSSRFamilyAssignmentsPageLink(input, page-1)
	}
	if toBool(meta["has_next"]) {
		links["next"] = translationSSRFamilyAssignmentsPageLink(input, page+1)
	}
	return links
}

func translationSSRFamilyAssignmentsPageLink(input TranslationSSRPresenterInput, page int) string {
	familyID := strings.TrimSpace(input.FamilyID)
	base := strings.TrimSpace(input.FamilyBasePath)
	if base == "" {
		base = strings.TrimRight(strings.TrimSpace(input.BasePath), "/") + "/translations/families"
	}
	return translationSSRHrefWithQuery(
		strings.TrimRight(base, "/")+"/"+url.PathEscape(familyID)+"/assignments",
		input.Query,
		map[string]string{
			"channel": strings.TrimSpace(input.Channel),
			"page":    strconv.Itoa(page),
		},
	)
}

func translationSSREditorLinks(input TranslationSSRPresenterInput, data map[string]any) map[string]any {
	return map[string]any{
		"queue":         input.QueuePath,
		"assignment_id": firstNonEmpty(toString(data["assignment_id"]), strings.TrimSpace(input.AssignmentID)),
		"family_id":     toString(data["family_id"]),
	}
}

func translationSSRMatrixLinks(input TranslationSSRPresenterInput) map[string]any {
	return map[string]any{
		"matrix":         translationSSRHrefWithQuery(input.MatrixPath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}),
		"matrix_all":     translationSSRHrefWithQuery(input.MatrixPath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}, "readiness_state"),
		"matrix_ready":   translationSSRMatrixReadinessLink(input, "ready"),
		"matrix_blocked": translationSSRMatrixReadinessLink(input, "blocked"),
		"api":            strings.TrimSpace(input.MatrixAPIPath),
		"family":         strings.TrimSpace(input.FamilyBasePath),
		"queue":          strings.TrimSpace(input.QueuePath),
		"preserve_query": translationSSRMatrixPreservedQuery(input),
	}
}

func translationSSRMatrixReadinessLink(input TranslationSSRPresenterInput, state string) string {
	return translationSSRHrefWithQuery(input.MatrixPath, input.Query, map[string]string{
		"channel":         strings.TrimSpace(input.Channel),
		"readiness_state": strings.TrimSpace(state),
		"page":            "1",
	})
}

func translationSSRMatrixPreservedQuery(input TranslationSSRPresenterInput) map[string]string {
	return translationSSRPreserveFilterQuery(input.Query,
		"channel",
		ScopeTenantIDKey,
		ScopeOrgIDKey,
		"locale",
		"locales",
		"page",
		"per_page",
		"locale_offset",
		"locale_limit",
	)
}

func translationSSRExchangeLinks(input TranslationSSRPresenterInput) map[string]any {
	exchangePath := strings.TrimSpace(input.ExchangePath)
	if exchangePath == "" {
		exchangePath = strings.TrimRight(strings.TrimSpace(input.BasePath), "/") + "/translations/exchange"
	}
	return map[string]any{
		"exchange": translationSSRHrefWithQuery(exchangePath, input.Query, map[string]string{"channel": strings.TrimSpace(input.Channel)}),
		"api":      strings.TrimSpace(input.ExchangeAPIPath),
		"history":  strings.TrimRight(strings.TrimSpace(input.ExchangeAPIPath), "/") + "/jobs",
		"template": translationSSRExchangeTemplate(input),
	}
}

func translationSSRMatrixActions(data, meta map[string]any) map[string]any {
	selection := extractMap(data["selection"])
	return map[string]any{
		"bulk_actions":         selection["bulk_actions"],
		"quick_action_targets": meta["quick_action_targets"],
	}
}

func translationSSRMatrixEnhancement(input TranslationSSRPresenterInput, meta map[string]any) map[string]any {
	out := translationSSREnhancement(input)
	out["api_path"] = strings.TrimSpace(input.MatrixAPIPath)
	out["query"] = translationSSRPreserveFilterQuery(input.Query,
		"channel",
		ScopeTenantIDKey,
		ScopeOrgIDKey,
		"family_id",
		"content_type",
		"readiness_state",
		"blocker_code",
		"locale",
		"locales",
		"page",
		"per_page",
		"locale_offset",
		"locale_limit",
	)
	out["locale_offset"] = meta["locale_offset"]
	out["locale_limit"] = meta["locale_limit"]
	out["quick_action_targets"] = meta["quick_action_targets"]
	return out
}

func translationSSRExchangeActions(adm *Admin, c router.Context) map[string]any {
	ctx := contextFromRouterContext(c)
	if adm != nil && c != nil {
		ctx = adm.adminContextFromRequest(c, adm.config.DefaultLocale).Context
	}
	exportAction := translationMatrixActionState(adm, ctx, translationExchangePermissionExport)
	importViewAction := translationMatrixActionState(adm, ctx, translationExchangePermissionImportView)
	importValidateAction := translationMatrixActionState(adm, ctx, translationExchangePermissionImportValidate)
	importApplyAction := translationMatrixActionState(adm, ctx, translationExchangePermissionImportApply)
	return map[string]any{
		"export":                 exportAction,
		"export_action":          exportAction,
		"import_view":            importViewAction,
		"import_view_action":     importViewAction,
		"import_validate":        importValidateAction,
		"import_validate_action": importValidateAction,
		"import_apply":           importApplyAction,
		"import_apply_action":    importApplyAction,
	}
}

func contextFromRouterContext(c router.Context) context.Context {
	if c == nil || c.Context() == nil {
		return context.Background()
	}
	return c.Context()
}

func translationSSRExchangeEnhancement(input TranslationSSRPresenterInput) map[string]any {
	out := translationSSREnhancement(input)
	out["api_path"] = strings.TrimSpace(input.ExchangeAPIPath)
	out["history_path"] = strings.TrimRight(strings.TrimSpace(input.ExchangeAPIPath), "/") + "/jobs"
	out["ui_config"] = input.ExchangeUIConfig
	out["include_examples"] = translationSSRExchangeIncludeExamples(input)
	return out
}

func translationSSRExchangeTemplate(input TranslationSSRPresenterInput) map[string]any {
	template := input.ExchangeUIConfig.Template
	format := strings.TrimSpace(template.Format)
	if format == "" {
		format = "json"
	}
	href := strings.TrimSpace(template.Href)
	if href == "" {
		href = strings.TrimRight(strings.TrimSpace(input.ExchangeAPIPath), "/") + "/template?format=" + url.QueryEscape(format)
	}
	label := firstNonEmpty(template.Label, "Download JSON Template")
	filename := firstNonEmpty(template.Filename, "translation_exchange_template."+format)
	return map[string]any{
		"href":     href,
		"format":   format,
		"label":    label,
		"filename": filename,
	}
}

func translationSSRExchangeHistoryPolicy(input TranslationSSRPresenterInput) map[string]any {
	includeExamples := translationSSRExchangeIncludeExamples(input)
	source := "runtime"
	if includeExamples {
		source = "runtime_plus_examples"
	}
	return map[string]any{
		"source":           source,
		"include_examples": includeExamples,
		"empty_state":      "authored",
	}
}

func translationSSRExchangeIncludeExamples(input TranslationSSRPresenterInput) bool {
	if input.ExchangeUIConfig.IncludeExamples != nil {
		return *input.ExchangeUIConfig.IncludeExamples
	}
	return toBool(translationSSRQueryValue(input, "include_examples"))
}

func translationSSRExchangeResourceOptions(config TranslationExchangeUIConfig) []map[string]any {
	selected := map[string]bool{}
	for _, id := range config.DefaultResources {
		id = strings.TrimSpace(id)
		if id != "" {
			selected[id] = true
		}
	}
	out := make([]map[string]any, 0, len(config.Resources))
	for _, resource := range config.Resources {
		id := strings.TrimSpace(resource.ID)
		if id == "" {
			continue
		}
		out = append(out, map[string]any{
			"id":       id,
			"label":    firstNonEmpty(strings.TrimSpace(resource.Label), id),
			"selected": selected[id],
		})
	}
	return out
}

func translationSSRExchangeSourceLocaleOptions(config TranslationExchangeUIConfig) []map[string]any {
	selected := strings.TrimSpace(config.SourceLocale)
	if selected == "" && len(config.SourceLocales) > 0 {
		selected = strings.TrimSpace(config.SourceLocales[0].Code)
	}
	return translationSSRExchangeLocaleOptions(config.SourceLocales, selected)
}

func translationSSRExchangeTargetLocaleOptions(config TranslationExchangeUIConfig) []map[string]any {
	selected := map[string]bool{}
	for _, locale := range config.DefaultTargetLocales {
		locale = strings.TrimSpace(locale)
		if locale != "" {
			selected[locale] = true
		}
	}
	out := make([]map[string]any, 0, len(config.TargetLocales))
	for _, locale := range config.TargetLocales {
		code := strings.TrimSpace(locale.Code)
		if code == "" {
			continue
		}
		out = append(out, map[string]any{
			"code":     code,
			"label":    firstNonEmpty(strings.TrimSpace(locale.Label), strings.ToUpper(code)),
			"selected": selected[code],
		})
	}
	return out
}

func translationSSRExchangeLocaleOptions(locales []TranslationExchangeLocaleOption, selected string) []map[string]any {
	selected = strings.TrimSpace(selected)
	out := make([]map[string]any, 0, len(locales))
	for _, locale := range locales {
		code := strings.TrimSpace(locale.Code)
		if code == "" {
			continue
		}
		out = append(out, map[string]any{
			"code":     code,
			"label":    firstNonEmpty(strings.TrimSpace(locale.Label), strings.ToUpper(code)),
			"selected": code == selected,
		})
	}
	return out
}

func translationSSRExchangeApplyDefaults(config TranslationExchangeUIConfig) map[string]any {
	return map[string]any{
		"allow_create_missing":       boolPtrDefault(config.Apply.AllowCreateMissing, false),
		"allow_source_hash_override": boolPtrDefault(config.Apply.AllowSourceHashOverride, false),
		"continue_on_error":          boolPtrDefault(config.Apply.ContinueOnError, true),
		"dry_run":                    boolPtrDefault(config.Apply.DryRun, false),
		"include_source_hash":        boolPtrDefault(config.IncludeSourceHash, true),
	}
}

func boolPtrDefault(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func translationSSRFamilyDetailActions(data map[string]any) map[string]any {
	return map[string]any{
		"quick_create":       data["quick_create"],
		"publish_gate":       data["publish_gate"],
		"locale_assignments": data["locale_assignments"],
		"active_assignments": data["active_assignments"],
	}
}

func translationSSRQueueActions(input TranslationSSRPresenterInput, meta map[string]any) map[string]any {
	return map[string]any{
		"bulk_action_api_path": strings.TrimSpace(input.BulkActionAPIPath),
		"bulk_selection":       meta["bulk_selection"],
	}
}

func translationSSREditorActions(data map[string]any) map[string]any {
	return map[string]any{
		"assignment": data["assignment_action_states"],
		"review":     data["review_action_states"],
		"preview":    data["preview_action"],
	}
}

func translationSSRFamilyAssigneeContract(data map[string]any) map[string]any {
	assignments := translationSSRList(data, "active_assignments")
	selected := []map[string]any{}
	for _, row := range assignments {
		assigneeID := strings.TrimSpace(toString(row["assignee_id"]))
		if assigneeID == "" {
			continue
		}
		selected = append(selected, map[string]any{
			"id":     assigneeID,
			"label":  firstNonEmpty(toString(row["assignee_label"]), assigneeID),
			"locale": toString(row["target_locale"]),
		})
	}
	return map[string]any{
		"mode":               "formgen-relationship-typeahead",
		"selected":           selected,
		"relationship_type":  "translation_assignee",
		"enhance":            true,
		"endpoint_url":       "/api/translations/options/assignees?per_page=200",
		"endpoint_method":    "GET",
		"endpoint_renderer":  "typeahead",
		"endpoint_mode":      "",
		"endpoint_search":    "q",
		"endpoint_value":     "value",
		"endpoint_label":     "label",
		"placeholder":        "Select assignee",
		"search_placeholder": "Search assignees",
	}
}

func translationSSREmptyState(title, description string) map[string]any {
	return map[string]any{"title": title, "description": description}
}

func translationSSRList(data map[string]any, keys ...string) []map[string]any {
	if len(keys) == 0 {
		keys = []string{"items", "families", "rows"}
	}
	for _, key := range keys {
		switch typed := data[key].(type) {
		case []map[string]any:
			return typed
		case []any:
			out := make([]map[string]any, 0, len(typed))
			for _, item := range typed {
				if row := extractMap(item); len(row) > 0 {
					out = append(out, row)
				}
			}
			return out
		}
	}
	return nil
}

func translationSSRQueryValue(input TranslationSSRPresenterInput, key string) string {
	if len(input.Query) == 0 {
		return ""
	}
	return strings.TrimSpace(input.Query[strings.TrimSpace(key)])
}

func translationSSRAttachFamilyListRowLinks(input TranslationSSRPresenterInput, data map[string]any) {
	rows := translationSSRList(data, "families", "items")
	if len(rows) == 0 {
		return
	}
	for _, row := range rows {
		row["ssr_links"] = translationSSRFamilyListRowLinks(input, row)
		familyID := firstNonEmpty(toString(row["family_id"]), toString(row["id"]))
		row["display_identifier"] = translationSSRShortID(familyID)
		row["display_title"] = firstNonEmpty(toString(row["source_title"]), translationSSRShortID(familyID), "Family")
	}
	data["families"] = rows
	if _, ok := data["items"]; ok {
		data["items"] = rows
	}
}

func translationSSRFamilyListRowLinks(input TranslationSSRPresenterInput, row map[string]any) map[string]any {
	familyID := strings.TrimSpace(toString(row["family_id"]))
	if familyID == "" {
		familyID = strings.TrimSpace(toString(row["id"]))
	}
	links := map[string]any{}
	if familyID == "" {
		return links
	}
	channel := strings.TrimSpace(input.Channel)
	links["detail"] = translationSSRHrefWithQuery(
		strings.TrimRight(strings.TrimSpace(input.FamilyBasePath), "/")+"/"+url.PathEscape(familyID),
		input.Query,
		map[string]string{"channel": channel},
	)
	if strings.TrimSpace(input.MatrixPath) != "" {
		links["matrix"] = translationSSRHrefWithQuery(input.MatrixPath, input.Query, map[string]string{
			"family_id":       familyID,
			"channel":         channel,
			"content_type":    firstNonEmpty(toString(row["content_type"]), translationSSRQueryValue(input, "content_type")),
			"readiness_state": firstNonEmpty(toString(row["readiness_state"]), translationSSRQueryValue(input, "readiness_state")),
			"blocker_code":    translationSSRQueryValue(input, "blocker_code"),
			"missing_locale":  translationSSRQueryValue(input, "missing_locale"),
		})
	}
	if strings.TrimSpace(input.QueuePath) != "" {
		links["queue"] = translationSSRHrefWithQuery(input.QueuePath, input.Query, map[string]string{
			"family_id": familyID,
			"channel":   channel,
		})
	}
	return links
}

func translationSSRQueueViewLinks(input TranslationSSRPresenterInput) map[string]any {
	base := translationSSRQueueBasePath(input)
	return map[string]any{
		"current": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel": strings.TrimSpace(input.Channel),
		}),
		"clear_all": translationSSRHrefWithQuery(base, translationSSRQueueClearAllPreserveQuery(input.Query), map[string]string{
			"channel": strings.TrimSpace(input.Channel),
			"page":    "1",
		}),
		"list": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel":        strings.TrimSpace(input.Channel),
			"page":           "1",
			"group_by":       "",
			"group_strategy": "",
		}),
		"grouped": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel":        strings.TrimSpace(input.Channel),
			"page":           "1",
			"group_by":       "family_id",
			"group_strategy": "page_local",
		}),
		"families": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel":        strings.TrimSpace(input.Channel),
			"page":           "1",
			"group_by":       "family_id",
			"group_strategy": "server_family",
		}),
	}
}

func translationSSRQueueBasePath(input TranslationSSRPresenterInput) string {
	base := strings.TrimSpace(input.QueuePath)
	if base == "" {
		base = strings.TrimRight(strings.TrimSpace(input.BasePath), "/") + "/translations/queue"
	}
	return base
}

func translationSSRQueueClearAllPreserveQuery(query map[string]string) map[string]string {
	return translationSSRPreserveFilterQuery(query,
		"tenant_id",
		"org_id",
		"channel",
		"group_by",
		"group_strategy",
		"sort",
		"order",
		"per_page",
	)
}

// translationSSRQueueViewMode resolves the active queue view ("list",
// "grouped", or "families") from the grouping contract the binding actually
// applied, so the toggle reflects fallbacks rather than raw query params.
func translationSSRQueueViewMode(meta map[string]any) string {
	grouping, ok := meta["grouping"].(map[string]any)
	if !ok || grouping == nil {
		return "list"
	}
	enabled, ok := grouping["enabled"].(bool)
	if !ok || !enabled {
		return "list"
	}
	strategy, ok := grouping["strategy"].(string)
	if ok && strings.EqualFold(strings.TrimSpace(strategy), "server_family") {
		return "families"
	}
	return "grouped"
}

func translationSSRHrefWithQuery(href string, preserve map[string]string, set map[string]string, remove ...string) string {
	href = strings.TrimSpace(href)
	if href == "" {
		return ""
	}
	parsed, err := url.Parse(href)
	if err != nil {
		return href
	}
	query := parsed.Query()
	for key, value := range preserve {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		query.Set(key, value)
	}
	for _, key := range remove {
		if key = strings.TrimSpace(key); key != "" {
			query.Del(key)
		}
	}
	for key, value := range set {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" {
			continue
		}
		if value == "" {
			query.Del(key)
			continue
		}
		query.Set(key, value)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func translationSSRStringMap(input map[string]any) map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]string, len(input))
	for key, raw := range input {
		key = strings.TrimSpace(key)
		value := strings.TrimSpace(toString(raw))
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationSSREnrichQueuePresets(input TranslationSSRPresenterInput, raw any) []map[string]any {
	presets := translationSSRAnyList(raw)
	if len(presets) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(presets))
	for _, preset := range presets {
		next := cloneAnyMap(preset)
		next["href"] = translationSSRQueuePresetHref(input, next)
		out = append(out, next)
	}
	return out
}

func translationSSRQueuePresetHref(input TranslationSSRPresenterInput, preset map[string]any) string {
	base := strings.TrimSpace(input.QueuePath)
	if base == "" {
		base = strings.TrimRight(input.BasePath, "/") + "/translations/queue"
	}
	set := translationSSRQueuePresetMapQuery(preset)
	if id := strings.TrimSpace(toString(preset["id"])); id != "" {
		set["preset"] = id
	}
	if channel := strings.TrimSpace(input.Channel); channel != "" {
		set["channel"] = channel
	}
	return translationSSRHrefWithQuery(base, nil, set)
}

func translationSSRHrefWithChannel(href, channel string) string {
	href = strings.TrimSpace(href)
	channel = strings.TrimSpace(channel)
	if href == "" || channel == "" {
		return href
	}
	parsed, err := url.Parse(href)
	if err != nil {
		separator := "?"
		if strings.Contains(href, "?") {
			separator = "&"
		}
		return href + separator + "channel=" + url.QueryEscape(channel)
	}
	query := parsed.Query()
	query.Set("channel", channel)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

// translationSSRPreserveFilterQuery extracts specified filter keys from query to preserve them in links.
func translationSSRPreserveFilterQuery(query map[string]string, keys ...string) map[string]string {
	if len(query) == 0 || len(keys) == 0 {
		return nil
	}
	out := map[string]string{}
	for _, key := range keys {
		if value := strings.TrimSpace(query[key]); value != "" {
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationSSRFamilyStatusFilterPreserveKeys() []string {
	return []string{
		"family_id",
		"content_type",
		"blocker_code",
		"missing_locale",
	}
}

func translationSSRQueueStatusFilterPreserveKeys() []string {
	return []string{
		"family_id",
		"locale",
		"target_locale",
		"priority",
		"entity_type",
		"due_state",
		"review_state",
		"assignee_id",
		"reviewer_id",
	}
}

func translationSSRQueuePresetFilterPreserveKeys() []string {
	return []string{
		"family_id",
		"locale",
		"target_locale",
		"entity_type",
		"assignee_id",
		"reviewer_id",
	}
}

func translationSSRQueuePresetContextFilterPreserveKeys(presetQuery map[string]string) []string {
	keys := translationSSRQueuePresetFilterPreserveKeys()
	if len(presetQuery) == 0 {
		return keys
	}
	out := make([]string, 0, len(keys))
	for _, key := range keys {
		if _, owned := presetQuery[key]; owned {
			continue
		}
		out = append(out, key)
	}
	return out
}

func translationSSRQueuePresetCardHref(input TranslationSSRPresenterInput, basePath, channel, presetID string) string {
	presetID = strings.TrimSpace(presetID)
	presetQuery := TranslationQueuePresetQuery(presetID)
	set := cloneStringMap(presetQuery)
	if set == nil {
		set = map[string]string{}
	}
	if presetID != "" {
		set["preset"] = presetID
	}
	if channel = strings.TrimSpace(channel); channel != "" {
		set["channel"] = channel
	}
	return translationSSRHrefWithQuery(
		basePath,
		translationSSRPreserveFilterQuery(input.Query, translationSSRQueuePresetContextFilterPreserveKeys(presetQuery)...),
		set,
	)
}

func translationSSRQueuePresetMapQuery(preset map[string]any) map[string]string {
	out := map[string]string{}
	for key, value := range extractMap(preset["query"]) {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if encoded := strings.TrimSpace(toString(value)); encoded != "" {
			out[key] = encoded
		}
	}
	if reviewState := strings.TrimSpace(toString(preset["review_state"])); reviewState != "" {
		out["review_state"] = reviewState
	}
	return out
}

// translationSSRSummaryCardHref builds a URL for a summary card with channel, preserved filters, and an optional filter.
func translationSSRSummaryCardHref(basePath, channel string, preservedFilters map[string]string, filterKey, filterValue string) string {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		return ""
	}
	set := map[string]string{}
	if channel = strings.TrimSpace(channel); channel != "" {
		set["channel"] = channel
	}
	if filterKey = strings.TrimSpace(filterKey); filterKey != "" {
		if filterValue = strings.TrimSpace(filterValue); filterValue != "" {
			set[filterKey] = filterValue
		}
	}
	return translationSSRHrefWithQuery(basePath, preservedFilters, set)
}

func translationSSRAnyList(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		out := make([]map[string]any, 0, len(typed))
		out = append(out, typed...)
		return out
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if mapped := extractMap(item); len(mapped) > 0 {
				out = append(out, mapped)
			}
		}
		return out
	default:
		return nil
	}
}
