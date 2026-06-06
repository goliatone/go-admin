package admin

import (
	"net/url"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	TranslationSSRSurfaceDashboard    = "dashboard"
	TranslationSSRSurfaceQueue        = "queue"
	TranslationSSRSurfaceFamilyList   = "family_list"
	TranslationSSRSurfaceFamilyDetail = "family_detail"
	TranslationSSRSurfaceEditor       = "editor"
)

// TranslationSSRPresenter is the exported boundary consumed by UI route wiring.
// It keeps translation SSR hydration owned by admin, where permissions, scope,
// action-state, lifecycle, and binding contracts already live.
type TranslationSSRPresenter interface {
	Dashboard(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	FamilyList(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	FamilyDetail(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	Queue(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
	Editor(router.Context, TranslationSSRPresenterInput) (TranslationSSRPage, error)
}

type TranslationSSRPresenterInput struct {
	BasePath           string
	APIBasePath        string
	DashboardPath      string
	QueuePath          string
	FamilyListPath     string
	FamilyBasePath     string
	MatrixPath         string
	EditorBasePath     string
	ContentBasePath    string
	BulkActionAPIPath  string
	AssignmentID       string
	FamilyID           string
	Channel            string
	Query              map[string]string
	InitialPresetID    string
	SyncClientBasePath string
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

func translationSSRQueueResult(input TranslationSSRPresenterInput, payload any) TranslationSSRResourceResult {
	data, meta := translationSSRPayloadSections(payload)
	rows := translationSSRList(data, "rows", "data", "items", "assignments")
	if len(rows) > 0 {
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
	return TranslationSSRResourceResult{
		Data:     data,
		Meta:     meta,
		DataGrid: translationSSRQueueDataGrid(input, data, meta),
	}
}

func translationSSRQueueDataGrid(input TranslationSSRPresenterInput, data, meta map[string]any) map[string]any {
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
		"filters":                 translationSSRQueueFilterControls(meta["supported_filter_keys"], input.Query),
		"sort":                    map[string]any{"default": meta["default_sort"], "supported": meta["supported_sort_keys"]},
		"saved_filter_presets":    translationSSREnrichQueuePresets(input, meta["saved_filter_presets"]),
		"review_filter_presets":   translationSSREnrichQueuePresets(input, meta["saved_review_filter_presets"]),
		"grouping":                meta["grouping"],
		"bulk_selection":          meta["bulk_selection"],
		"server_family_supported": meta["server_family_grouping_supported"],
		"view_links":              translationSSRQueueViewLinks(input),
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
		"pagination": map[string]any{
			"page":     meta["page"],
			"per_page": meta["per_page"],
			"total":    meta["total"],
		},
		"url_state": map[string]any{"preserve_channel": true, "channel": strings.TrimSpace(input.Channel), "filters": cloneStringMap(input.Query)},
		"items_key": "data",
		"count":     len(translationSSRList(data)),
	}
}

func translationSSRQueueFilterControls(raw any, query map[string]string) []map[string]any {
	keys := translationSSRStringSlice(raw)
	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out = append(out, map[string]any{
			"key":   key,
			"label": translationSSRHumanLabel(key),
			"value": strings.TrimSpace(query[key]),
		})
	}
	return out
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
	return map[string]any{
		"api_base_path":          strings.TrimRight(input.APIBasePath, "/"),
		"base_path":              strings.TrimRight(input.BasePath, "/"),
		"channel":                strings.TrimSpace(input.Channel),
		"bulk_action_api_path":   strings.TrimSpace(input.BulkActionAPIPath),
		"sync_client_base_path":  strings.TrimSpace(input.SyncClientBasePath),
		"initial_preset_id":      strings.TrimSpace(input.InitialPresetID),
		"preserve_channel_query": strings.TrimSpace(input.Channel) != "",
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
	return map[string]any{
		"families": input.FamilyListPath,
		"family":   input.FamilyBasePath,
		"matrix":   translationSSRHrefWithChannel(input.MatrixPath, input.Channel),
		"queue":    translationSSRHrefWithChannel(input.QueuePath, input.Channel),
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

func translationSSREditorLinks(input TranslationSSRPresenterInput, data map[string]any) map[string]any {
	return map[string]any{
		"queue":         input.QueuePath,
		"assignment_id": firstNonEmpty(toString(data["assignment_id"]), strings.TrimSpace(input.AssignmentID)),
		"family_id":     toString(data["family_id"]),
	}
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
		"mode":              "selected-labels-with-enhancement",
		"selected":          selected,
		"relationship_type": "translation_assignee",
		"enhance":           true,
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
		nil,
		map[string]string{"channel": channel},
	)
	if strings.TrimSpace(input.MatrixPath) != "" {
		links["matrix"] = translationSSRHrefWithQuery(input.MatrixPath, nil, map[string]string{
			"family_id":       familyID,
			"channel":         channel,
			"content_type":    firstNonEmpty(toString(row["content_type"]), translationSSRQueryValue(input, "content_type")),
			"readiness_state": firstNonEmpty(toString(row["readiness_state"]), translationSSRQueryValue(input, "readiness_state")),
			"blocker_code":    translationSSRQueryValue(input, "blocker_code"),
			"missing_locale":  translationSSRQueryValue(input, "missing_locale"),
		})
	}
	if strings.TrimSpace(input.QueuePath) != "" {
		links["queue"] = translationSSRHrefWithQuery(input.QueuePath, nil, map[string]string{
			"family_id": familyID,
			"channel":   channel,
		})
	}
	return links
}

func translationSSRQueueViewLinks(input TranslationSSRPresenterInput) map[string]any {
	base := strings.TrimSpace(input.QueuePath)
	if base == "" {
		base = strings.TrimRight(strings.TrimSpace(input.BasePath), "/") + "/translations/queue"
	}
	return map[string]any{
		"current": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel": strings.TrimSpace(input.Channel),
		}),
		"clear_all": translationSSRHrefWithQuery(base, nil, map[string]string{
			"channel": strings.TrimSpace(input.Channel),
		}),
		"list": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel":        strings.TrimSpace(input.Channel),
			"group_by":       "",
			"group_strategy": "",
		}),
		"grouped": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel":        strings.TrimSpace(input.Channel),
			"group_by":       "family_id",
			"group_strategy": "page_local",
		}),
		"families": translationSSRHrefWithQuery(base, input.Query, map[string]string{
			"channel":        strings.TrimSpace(input.Channel),
			"group_by":       "family_id",
			"group_strategy": "server_family",
		}),
	}
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
	values := url.Values{}
	if id := strings.TrimSpace(toString(preset["id"])); id != "" {
		values.Set("preset", id)
	}
	if channel := strings.TrimSpace(input.Channel); channel != "" {
		values.Set("channel", channel)
	}
	for key, value := range extractMap(preset["query"]) {
		if encoded := strings.TrimSpace(toString(value)); encoded != "" {
			values.Set(key, encoded)
		}
	}
	if reviewState := strings.TrimSpace(toString(preset["review_state"])); reviewState != "" {
		values.Set("review_state", reviewState)
	}
	if encoded := values.Encode(); encoded != "" {
		return base + "?" + encoded
	}
	return base
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

func translationSSRAnyList(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, item)
		}
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
