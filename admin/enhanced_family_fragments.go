package admin

import (
	"fmt"
	htmltemplate "html/template"
	"strings"

	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
)

type FamilyDetailFragmentTarget string

const (
	FamilyDetailFragmentLocaleCoverage FamilyDetailFragmentTarget = "locale_coverage"
	FamilyDetailFragmentAssignments    FamilyDetailFragmentTarget = "assignments"
	FamilyDetailFragmentPublishGate    FamilyDetailFragmentTarget = "publish_gate"
	FamilyDetailFragmentActivity       FamilyDetailFragmentTarget = "activity"
)

var familyDetailFragmentSelectors = map[FamilyDetailFragmentTarget]string{
	FamilyDetailFragmentLocaleCoverage: "[data-family-locale-coverage]",
	FamilyDetailFragmentAssignments:    "[data-family-assignments]",
	FamilyDetailFragmentPublishGate:    "[data-family-publish-gate]",
	FamilyDetailFragmentActivity:       "[data-family-activity]",
}

type FamilyDetailFragmentRenderer func(FamilyDetailFragmentTarget) (string, error)

func FamilyDetailFragmentSelector(target FamilyDetailFragmentTarget) (string, bool) {
	selector, ok := familyDetailFragmentSelectors[target]
	return selector, ok
}

func FamilyDetailFragmentTargets() []FamilyDetailFragmentTarget {
	return []FamilyDetailFragmentTarget{
		FamilyDetailFragmentLocaleCoverage,
		FamilyDetailFragmentAssignments,
		FamilyDetailFragmentPublishGate,
		FamilyDetailFragmentActivity,
	}
}

// RenderFamilyDetailFragments renders server-authored family detail fragments.
// The first enhanced SSR convention supports only known targets and replace mode.
func RenderFamilyDetailFragments(targets []FamilyDetailFragmentTarget, renderer FamilyDetailFragmentRenderer) ([]EnhancedFragment, error) {
	if renderer == nil {
		return nil, fmt.Errorf("family detail fragment renderer required")
	}
	fragments := make([]EnhancedFragment, 0, len(targets))
	for _, target := range targets {
		selector, ok := FamilyDetailFragmentSelector(target)
		if !ok {
			return nil, fmt.Errorf("unknown family detail fragment target %q", target)
		}
		html, err := renderer(target)
		if err != nil {
			return nil, err
		}
		html = strings.TrimSpace(html)
		if html == "" {
			continue
		}
		fragments = append(fragments, EnhancedFragment{
			Selector: selector,
			Mode:     EnhancedFragmentModeReplace,
			HTML:     html,
		})
	}
	return fragments, nil
}

func RenderFamilyDetailFragmentsFromData(data map[string]any) ([]EnhancedFragment, error) {
	return RenderFamilyDetailFragments(FamilyDetailFragmentTargets(), func(target FamilyDetailFragmentTarget) (string, error) {
		return renderFamilyDetailFragmentFromData(target, data), nil
	})
}

func renderFamilyDetailFragmentFromData(target FamilyDetailFragmentTarget, data map[string]any) string {
	switch target {
	case FamilyDetailFragmentLocaleCoverage:
		return renderFamilyDetailLocaleCoverageFragment(data)
	case FamilyDetailFragmentAssignments:
		return renderFamilyDetailAssignmentsFragment(data)
	case FamilyDetailFragmentPublishGate:
		return renderFamilyDetailPublishGateFragment(data)
	case FamilyDetailFragmentActivity:
		return renderFamilyDetailActivityFragment(data)
	default:
		return ""
	}
}

func renderFamilyDetailLocaleCoverageFragment(data map[string]any) string {
	var b strings.Builder
	b.WriteString(`<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-locales" data-family-locale-coverage>`)
	b.WriteString(`<div><h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>`)
	b.WriteString(`<p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p></div>`)
	rows := translationSSRAnyList(data["locale_coverage_rows"])
	if len(rows) == 0 {
		b.WriteString(`<p class="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">No locale variants are available for this family.</p></section>`)
		return b.String()
	}
	b.WriteString(`<ul class="mt-5 space-y-3" role="list">`)
	for _, row := range rows {
		renderFamilyDetailLocaleCoverageRow(&b, data, row)
	}
	b.WriteString(`</ul></section>`)
	return b.String()
}

func renderFamilyDetailLocaleCoverageRow(b *strings.Builder, data map[string]any, row map[string]any) {
	locale := strings.TrimSpace(toString(row["locale"]))
	key := strings.TrimSpace(toString(row["locale_assignment_key"]))
	tone := strings.TrimSpace(toString(row["tone"]))
	border := "border-gray-200 bg-white"
	if tone == "danger" {
		border = "border-rose-200 bg-rose-50"
	}
	b.WriteString(`<li class="grid gap-4 rounded-xl border p-5 ` + border + ` lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start" data-locale="` + escapeFamilyFragmentAttr(locale) + `" data-locale-coverage-kind="` + escapeFamilyFragmentAttr(toString(row["kind"])) + `" data-locale-assignment-key="` + escapeFamilyFragmentAttr(key) + `">`)
	b.WriteString(`<div><div class="flex flex-wrap items-center gap-2"><span class="text-sm font-semibold uppercase text-gray-900">` + escapeFamilyFragmentText(firstNonEmpty(toString(row["display_locale"]), locale, "-")) + `</span>`)
	for _, badge := range translationSSRAnyList(row["badges"]) {
		b.WriteString(`<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">` + escapeFamilyFragmentText(toString(badge["label"])) + `</span>`)
	}
	b.WriteString(`</div><p class="mt-2 text-sm text-gray-600">` + escapeFamilyFragmentText(firstNonEmpty(toString(row["title"]), toString(extractMap(extractMap(data["source_variant"])["fields"])["title"]), toString(data["family_id"]))) + `</p>`)
	if strings.TrimSpace(toString(row["kind"])) != "missing_required" {
		b.WriteString(`<p class="mt-1 text-xs text-gray-500">` + escapeFamilyFragmentText(firstNonEmpty(toString(row["assignment_summary"]), "No active assignment")) + `</p>`)
		b.WriteString(`<p class="mt-1 text-xs text-gray-500">Updated ` + escapeFamilyFragmentText(firstNonEmpty(toString(row["updated_label"]), "n/a")) + `</p>`)
	}
	b.WriteString(`</div><div class="flex flex-wrap items-center gap-2 lg:justify-end" data-family-locale-actions="true">`)
	if strings.TrimSpace(toString(row["kind"])) != "missing_required" {
		renderFamilyDetailAssignToMeForm(b, data, row)
		renderFamilyDetailAssignToUserForm(b, data, row)
	}
	if href := strings.TrimSpace(toString(row["open_locale_href"])); href != "" {
		b.WriteString(`<a class="btn btn-secondary h-12" href="` + escapeFamilyFragmentAttr(href) + `">Open locale</a>`)
	}
	b.WriteString(`</div></li>`)
}

func renderFamilyDetailAssignToMeForm(b *strings.Builder, data map[string]any, row map[string]any) {
	action := extractMap(row["assign_to_me_action"])
	if !toBool(action["enabled"]) {
		if reason := strings.TrimSpace(toString(action["reason"])); reason != "" {
			b.WriteString(`<span class="text-xs text-gray-500">` + escapeFamilyFragmentText(reason) + `</span>`)
		}
		return
	}
	payload := extractMap(action["payload"])
	endpoint := strings.TrimSpace(toString(action["endpoint"]))
	key := strings.TrimSpace(toString(row["locale_assignment_key"]))
	b.WriteString(`<form method="post" action="` + escapeFamilyFragmentAttr(endpoint) + `" data-enhance-action="true" data-enhance-error-target="[data-family-assignment-error-for='` + escapeFamilyFragmentAttr(key) + `']">`)
	renderFamilyDetailCSRFInput(b, data)
	renderFamilyDetailHiddenInput(b, "target_locale", firstNonEmpty(toString(payload["target_locale"]), toString(row["locale"])))
	renderFamilyDetailHiddenInput(b, "work_scope", firstNonEmpty(toString(payload["work_scope"]), toString(extractMap(row["locale_assignment"])["work_scope"])))
	renderFamilyDetailHiddenInput(b, "assignee_id", toString(payload["assignee_id"]))
	renderFamilyDetailHiddenInput(b, "channel", toString(extractMap(data["meta"])["channel"]))
	b.WriteString(`<button type="submit" class="btn btn-secondary h-12">Assign to me</button><div class="w-full text-xs text-rose-600" data-family-assignment-error-for="` + escapeFamilyFragmentAttr(key) + `" hidden></div></form>`)
}

func renderFamilyDetailAssignToUserForm(b *strings.Builder, data map[string]any, row map[string]any) {
	action := extractMap(row["assign_to_user_action"])
	if !toBool(action["enabled"]) {
		if reason := strings.TrimSpace(toString(action["reason"])); reason != "" {
			b.WriteString(`<span class="text-xs text-gray-500">` + escapeFamilyFragmentText(reason) + `</span>`)
		}
		return
	}
	key := strings.TrimSpace(toString(row["locale_assignment_key"]))
	payload := extractMap(action["payload"])
	endpoint := strings.TrimSpace(toString(action["endpoint"]))
	assignee := extractMap(data["assignee"])
	current := extractMap(row["assignment"])
	currentID := strings.TrimSpace(toString(current["assignee_id"]))
	b.WriteString(`<form class="flex min-w-64 flex-1 flex-wrap items-center gap-2 sm:w-80 sm:flex-none lg:w-96" method="post" action="` + escapeFamilyFragmentAttr(endpoint) + `" data-enhance-action="true" data-enhance-error-target="[data-family-assignment-error-for='` + escapeFamilyFragmentAttr(key) + `']">`)
	renderFamilyDetailCSRFInput(b, data)
	renderFamilyDetailHiddenInput(b, "target_locale", firstNonEmpty(toString(payload["target_locale"]), toString(row["locale"])))
	renderFamilyDetailHiddenInput(b, "work_scope", firstNonEmpty(toString(payload["work_scope"]), toString(extractMap(row["locale_assignment"])["work_scope"])))
	renderFamilyDetailHiddenInput(b, "channel", toString(extractMap(data["meta"])["channel"]))
	b.WriteString(`<select class="block h-12 min-w-56 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" name="assignee_id" data-family-assignee-select="` + escapeFamilyFragmentAttr(key) + `" data-formgen-managed="true" data-formgen-relationship="true" data-endpoint-url="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["endpoint_url"]), "/api/translations/options/assignees?per_page=200")) + `" data-endpoint-method="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["endpoint_method"]), "GET")) + `" data-endpoint-renderer="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["endpoint_renderer"]), "typeahead")) + `" data-endpoint-search-param="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["endpoint_search"]), "q")) + `" data-endpoint-value-field="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["endpoint_value"]), "value")) + `" data-endpoint-label-field="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["endpoint_label"]), "label")) + `" data-endpoint-placeholder="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["placeholder"]), "Select assignee")) + `" data-endpoint-search-placeholder="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignee["search_placeholder"]), "Search assignees")) + `" data-relationship-type="belongsTo" data-relationship-target="#/components/schemas/User" data-relationship-cardinality="one" aria-label="Assignee">`)
	b.WriteString(`<option value="">` + escapeFamilyFragmentText(firstNonEmpty(toString(assignee["placeholder"]), "Select assignee")) + `</option>`)
	if currentID != "" {
		b.WriteString(`<option value="` + escapeFamilyFragmentAttr(currentID) + `" selected>` + escapeFamilyFragmentText(firstNonEmpty(toString(current["display_assignee"]), toString(current["assignee_label"]), currentID)) + `</option>`)
	}
	b.WriteString(`</select><button type="submit" class="btn btn-primary h-12">Assign</button><div class="w-full text-xs text-rose-600" data-family-assignment-error-for="` + escapeFamilyFragmentAttr(key) + `" hidden></div></form>`)
}

func renderFamilyDetailAssignmentsFragment(data map[string]any) string {
	var b strings.Builder
	b.WriteString(`<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments" data-family-assignments>`)
	b.WriteString(`<h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>`)
	assignments := translationSSRAnyList(data["active_assignments"])
	if len(assignments) == 0 {
		b.WriteString(`<p class="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">No active assignments are attached to this family.</p></section>`)
		return b.String()
	}
	b.WriteString(`<div class="mt-5 grid gap-3">`)
	for _, assignment := range assignments {
		id := firstNonEmpty(toString(assignment["assignment_id"]), toString(assignment["id"]))
		b.WriteString(`<article class="rounded-xl border border-gray-200 bg-gray-50 p-5" data-assignment-id="` + escapeFamilyFragmentAttr(id) + `" data-row-version="` + escapeFamilyFragmentAttr(firstNonEmpty(toString(assignment["row_version"]), toString(assignment["version"]))) + `"><div class="flex flex-wrap items-center justify-between gap-3"><div>`)
		b.WriteString(`<div class="flex flex-wrap items-center gap-2"><span class="text-sm font-semibold uppercase text-gray-900">` + escapeFamilyFragmentText(firstNonEmpty(toString(assignment["target_locale"]), "-")) + `</span>`)
		b.WriteString(`<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">` + escapeFamilyFragmentText(firstNonEmpty(toString(assignment["display_status"]), toString(assignment["status"]), "Open")) + `</span>`)
		b.WriteString(`<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">` + escapeFamilyFragmentText(firstNonEmpty(toString(assignment["display_priority"]), toString(assignment["priority"]), "Normal")) + `</span></div>`)
		b.WriteString(`<p class="mt-2 text-sm text-gray-600">` + escapeFamilyFragmentText(firstNonEmpty(toString(assignment["display_assignee"]), toString(assignment["assignee_label"]), toString(assignment["assignee_id"]), "Unassigned")) + `</p></div><div class="flex flex-wrap items-center gap-2">`)
		if href := strings.TrimSpace(toString(extractMap(extractMap(assignment["links"])["editor"])["href"])); href != "" {
			b.WriteString(`<a class="btn btn-secondary" href="` + escapeFamilyFragmentAttr(href) + `">Open editor</a>`)
		}
		b.WriteString(`</div></div></article>`)
	}
	b.WriteString(`</div></section>`)
	return b.String()
}

func renderFamilyDetailPublishGateFragment(data map[string]any) string {
	gate := extractMap(data["publish_gate"])
	allowed := toBool(gate["allowed"])
	tone := "border-amber-200 bg-amber-50 text-amber-800"
	label := "Blocked"
	message := "Publishing is blocked until blockers are cleared."
	if allowed {
		tone = "border-emerald-200 bg-emerald-50 text-emerald-800"
		label = "Ready"
		message = "Publishing can proceed for this family."
	}
	return `<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-publish-gate" data-family-publish-gate><h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2><div class="mt-4 rounded-lg border ` + tone + ` p-4"><p class="font-semibold">` + label + `</p><p class="mt-2 text-sm">` + message + `</p></div></section>`
}

func renderFamilyDetailActivityFragment(data map[string]any) string {
	var b strings.Builder
	b.WriteString(`<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-activity" data-family-activity><h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>`)
	assignments := translationSSRAnyList(data["active_assignments"])
	if len(assignments) == 0 {
		b.WriteString(`<p class="mt-3 text-sm text-gray-500">No recent assignment activity is available.</p></section>`)
		return b.String()
	}
	b.WriteString(`<ol class="mt-4 space-y-3 text-sm text-gray-600">`)
	for _, assignment := range assignments {
		sentence := firstNonEmpty(toString(assignment["activity_sentence"]), firstNonEmpty(toString(assignment["target_locale"]), "-")+" assignment "+firstNonEmpty(toString(assignment["display_status"]), toString(assignment["status"]), "Updated"))
		b.WriteString(`<li class="rounded-md border border-gray-100 bg-gray-50 p-3">` + escapeFamilyFragmentText(sentence) + `</li>`)
	}
	b.WriteString(`</ol></section>`)
	return b.String()
}

func renderFamilyDetailHiddenInput(b *strings.Builder, name, value string) {
	if strings.TrimSpace(value) == "" {
		return
	}
	b.WriteString(`<input type="hidden" name="` + escapeFamilyFragmentAttr(name) + `" value="` + escapeFamilyFragmentAttr(value) + `">`)
}

func renderFamilyDetailCSRFInput(b *strings.Builder, data map[string]any) {
	if field := strings.TrimSpace(toString(data["csrf_field"])); field != "" {
		b.WriteString(field)
		return
	}
	token := strings.TrimSpace(toString(data["csrf_token"]))
	if token == "" {
		return
	}
	fieldName := firstNonEmpty(toString(data["csrf_field_name"]), csrfmw.DefaultFormFieldName)
	b.WriteString(`<input type="hidden" name="` + escapeFamilyFragmentAttr(fieldName) + `" value="` + escapeFamilyFragmentAttr(token) + `">`)
}

func escapeFamilyFragmentText(value string) string {
	return htmltemplate.HTMLEscapeString(strings.TrimSpace(value))
}

func escapeFamilyFragmentAttr(value string) string {
	return htmltemplate.HTMLEscapeString(strings.TrimSpace(value))
}
