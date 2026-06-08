package admin

import (
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestTranslationSSRPayloadSectionsNormalizeListPayloads(t *testing.T) {
	data, meta := translationSSRPayloadSections(map[string]any{
		"data": []any{
			map[string]any{"assignment_id": "asg-1"},
			map[string]any{"assignment_id": "asg-2"},
		},
		"meta": map[string]any{"total": 2, "channel": "staging"},
	})

	rows := translationSSRList(data, "rows")
	if len(rows) != 2 {
		t.Fatalf("expected two normalized rows, got %+v", data)
	}
	if got := toString(meta["channel"]); got != "staging" {
		t.Fatalf("expected channel metadata, got %q", got)
	}
}

func TestTranslationSSRPayloadSectionsPreserveRootDashboardPayloads(t *testing.T) {
	data, meta := translationSSRPayloadSections(map[string]any{
		"cards": []map[string]any{{"id": "my_tasks", "count": 2}},
		"tables": map[string]any{
			"top_overdue_assignments": map[string]any{"total": 1},
		},
		"meta": map[string]any{"channel": "staging"},
	})

	if len(translationSSRList(data, "cards")) != 1 {
		t.Fatalf("expected root-level cards to be preserved, got %+v", data)
	}
	if _, ok := data["tables"].(map[string]any); !ok {
		t.Fatalf("expected root-level tables to be preserved, got %+v", data)
	}
	if _, ok := data["meta"]; ok {
		t.Fatalf("expected root-level meta to stay out of data, got %+v", data)
	}
	if got := toString(meta["channel"]); got != "staging" {
		t.Fatalf("expected root-level meta to be preserved, got %+v", meta)
	}
}

func TestTranslationSSRDecorateDashboardAddsReferenceTableVariants(t *testing.T) {
	data := map[string]any{
		"generated": "2026-06-06T00:58:55Z",
		"cards": []map[string]any{
			{"id": "blocked_families", "label": "Blocked Families", "alert": map[string]any{"message": "ACTION REQUIRED"}},
		},
		"alerts": []map[string]any{
			{"message": "Action required", "card_id": "blocked_families"},
		},
		"tables": map[string]any{
			"top_overdue_assignments": map[string]any{
				"rows": []map[string]any{{
					"assignment_id":   "11111111-1111-1111-1111-111111111201",
					"source_locale":   "en",
					"target_locale":   "es",
					"priority":        "urgent",
					"status":          "in_progress",
					"overdue_minutes": 361,
					"source_title":    "Hero",
				}},
			},
			"blocked_families": map[string]any{
				"rows": []map[string]any{{
					"family_id":                     "22222222-2222-2222-2222-222222222202",
					"content_type":                  "pages",
					"blocker_codes":                 []string{"missing_locale"},
					"affected_locales":              []string{"fr", "es", "de", "it"},
					"missing_required_locale_count": 2,
					"pending_review_count":          1,
				}},
			},
		},
	}

	translationSSRDecorateDashboard(data, map[string]any{"refresh_interval_ms": 30000, "latency_target_ms": 300})

	display := extractMap(data["display"])
	if got := toString(display["refresh_interval_label"]); got != "30s" {
		t.Fatalf("expected display refresh interval, got %q", got)
	}
	if got := toString(extractMap(data["alert_summary"])["label"]); got != "1 critical" {
		t.Fatalf("expected alert summary label, got %q", got)
	}
	alerts := translationSSRAnyList(data["alerts"])
	if got := toString(alerts[0]["display_card_label"]); got != "Blocked" {
		t.Fatalf("expected alert card label to be display-safe, got %q", got)
	}
	tables := extractMap(data["tables"])
	ordered := translationSSRAnyList(data["ordered_tables"])
	if len(ordered) != 2 || toString(ordered[0]["id"]) != "blocked_families" || toString(ordered[1]["id"]) != "top_overdue_assignments" {
		t.Fatalf("expected deterministic dashboard table order, got %+v", ordered)
	}
	overdue := extractMap(tables["top_overdue_assignments"])
	if got := toString(overdue["variant"]); got != "overdue_assignments" {
		t.Fatalf("expected overdue variant, got %q", got)
	}
	overdueRows := translationSSRAnyList(overdue["rows"])
	if got := toString(overdueRows[0]["display_locale"]); got != "EN -> ES" {
		t.Fatalf("expected formatted locale route, got %q", got)
	}
	if got := toString(overdueRows[0]["display_status"]); got != "In Progress" {
		t.Fatalf("expected formatted status, got %q", got)
	}
	blocked := extractMap(tables["blocked_families"])
	if got := toString(blocked["variant"]); got != "blocked_families" {
		t.Fatalf("expected blocked variant, got %q", got)
	}
	blockedRows := translationSSRAnyList(blocked["rows"])
	chips := translationSSRAnyList(blockedRows[0]["display_blockers"])
	if got := toString(chips[0]["label"]); got != "Missing locale" {
		t.Fatalf("expected readable blocker chip, got %+v", chips)
	}
	locales := translationSSRAnyList(blockedRows[0]["display_locales"])
	if len(locales) != 4 || toString(locales[3]["label"]) != "+1" {
		t.Fatalf("expected locale overflow chip, got %+v", locales)
	}
}

func TestTranslationSSRDashboardAlertSummaryUsesHighestActualSeverity(t *testing.T) {
	data := map[string]any{
		"cards": []map[string]any{
			{"id": "needs_review"},
			{"id": "missing_required_locales"},
		},
		"alerts": []map[string]any{
			{"state": "warning", "message": "Needs attention", "card_id": "needs_review"},
			{"state": "degraded", "message": "Degraded", "card_id": "missing_required_locales"},
		},
	}

	translationSSRDecorateDashboard(data, nil)

	summary := extractMap(data["alert_summary"])
	if got := toString(summary["label"]); got != "1 warning" {
		t.Fatalf("expected warning summary from actual alert severity, got %q", got)
	}
	if got := toString(summary["status"]); got != "warning" {
		t.Fatalf("expected warning summary status, got %q", got)
	}
}

func TestTranslationSSRDecoratorsFormatTypedTimeValues(t *testing.T) {
	due := time.Date(2026, 3, 13, 15, 30, 0, 0, time.UTC)
	queue := translationSSRQueueResult(TranslationSSRPresenterInput{
		QueuePath:      "/admin/translations/queue",
		EditorBasePath: "/admin/translations/assignments",
	}, map[string]any{
		"rows": []map[string]any{{
			"assignment_id": "asg-1",
			"due_date":      &due,
		}},
	})
	rows := translationSSRList(queue.Data, "rows")
	if got := toString(rows[0]["display_due_date"]); got != "Mar 13, 2026" {
		t.Fatalf("expected typed queue due date to be formatted, got %q", got)
	}

	family := map[string]any{
		"locale_variants": []map[string]any{{"locale": "es", "updated_at": due}},
		"active_assignments": []map[string]any{{
			"assignment_id":    "asg-1",
			"status":           "pending",
			"target_locale":    "es",
			"assigner_id":      "manager-1",
			"display_assigner": "Manager One <manager.one@example.com>",
			"assignee_id":      "translator-1",
			"display_assignee": "Translator One <translator.one@example.com>",
			"assigned_at":      &due,
			"updated_at":       &due,
		}},
	}
	translationSSRDecorateFamilyDetail(family)
	variants := translationSSRAnyList(family["locale_variants"])
	if got := toString(variants[0]["display_updated"]); got != "Mar 13, 2026" {
		t.Fatalf("expected typed locale variant date to be formatted, got %q", got)
	}
	assignments := translationSSRAnyList(family["active_assignments"])
	if got := toString(assignments[0]["display_updated"]); got != "Mar 13, 2026" {
		t.Fatalf("expected typed assignment activity date to be formatted, got %q", got)
	}
	if got := toString(assignments[0]["display_assigned_at"]); got != "Mar 13, 2026" {
		t.Fatalf("expected typed assignment assigned_at to be formatted, got %q", got)
	}
	if got := toString(assignments[0]["activity_sentence"]); got != "Manager One <manager.one@example.com> assigned ES to Translator One <translator.one@example.com> on Mar 13, 2026" {
		t.Fatalf("expected assignment activity sentence, got %q", got)
	}
}

func TestTranslationSSRFamilyDetailActivitySentenceDoesNotPreferRawAssigneeLabel(t *testing.T) {
	assignedAt := time.Date(2026, 6, 7, 18, 30, 0, 0, time.UTC)
	rawID := "173c7e5b-50cb-37d0-8ced-a24b570863e6"
	family := map[string]any{
		"active_assignments": []map[string]any{{
			"assignment_id":    "asg-1",
			"status":           "in_progress",
			"target_locale":    "fr",
			"assigner_id":      "superadmin",
			"display_assigner": "superadmin",
			"assignee_id":      rawID,
			"assignee_label":   rawID,
			"assigned_at":      &assignedAt,
		}},
	}

	translationSSRDecorateFamilyDetail(family)

	assignments := translationSSRAnyList(family["active_assignments"])
	if got := toString(assignments[0]["display_assignee"]); got != "173c7e5b..." {
		t.Fatalf("expected raw assignee id to be shortened, got %q", got)
	}
	if got := toString(assignments[0]["activity_sentence"]); got != "superadmin assigned FR to 173c7e5b... on Jun 7, 2026" {
		t.Fatalf("expected shortened assignee in activity sentence, got %q", got)
	}
}

func TestTranslationSSRFamilyDetailLocaleCoverageRowsIncludeMissingRequiredLocales(t *testing.T) {
	data := map[string]any{
		"family_id":     "family-missing",
		"content_type":  "pages",
		"source_locale": "en",
		"source_variant": map[string]any{
			"fields": map[string]any{"title": "Privacy Policy"},
		},
		"locale_variants": []map[string]any{{
			"id":               "variant-en",
			"locale":           "en",
			"is_source":        true,
			"status":           "published",
			"source_record_id": "page-en",
			"fields":           map[string]any{"title": "Privacy Policy"},
		}, {
			"id":               "variant-fr",
			"locale":           "fr",
			"status":           "published",
			"source_record_id": "page-fr",
		}},
		"readiness_summary": map[string]any{
			"missing_locales": []string{"es"},
		},
		"quick_create": map[string]any{
			"enabled":            true,
			"missing_locales":    []string{"es"},
			"recommended_locale": "es",
		},
		"blockers": []map[string]any{{
			"blocker_code": "missing_locale",
			"locale":       "es",
		}},
		"locale_assignments": map[string]any{
			"en:localization": map[string]any{
				"locale": "en",
				"state":  "source_locale",
			},
			"fr:localization": map[string]any{
				"locale":        "fr",
				"work_scope":    "localization",
				"state":         "open_pool",
				"display_state": "Open Pool",
				"assignment": map[string]any{
					"assignment_id":    "asg-fr",
					"status":           "open",
					"display_status":   "Open",
					"assignee_label":   "",
					"display_assignee": "",
					"row_version":      7,
				},
				"actions": map[string]any{
					"assign_to_me": map[string]any{
						"enabled":  true,
						"endpoint": "/admin/api/translations/families/family-missing/assignments",
						"payload": map[string]any{
							"target_locale": "fr",
							"work_scope":    "localization",
							"assignee_id":   "translator-self",
						},
					},
					"assign_to_user": map[string]any{
						"enabled":  true,
						"endpoint": "/admin/api/translations/families/family-missing/assignments",
						"payload": map[string]any{
							"target_locale": "fr",
							"work_scope":    "localization",
						},
					},
					"claim": map[string]any{
						"enabled":  true,
						"endpoint": "/admin/api/translations/assignments/asg-fr/actions/claim",
					},
					"open_editor": map[string]any{
						"href": "/admin/translations/assignments/asg-fr/edit?channel=default",
					},
				},
			},
		},
	}

	translationSSRDecorateFamilyDetail(data)

	rows := translationSSRAnyList(data["locale_coverage_rows"])
	if len(rows) != 3 {
		t.Fatalf("expected source, variant, and missing locale rows, got %+v", rows)
	}
	if got := toString(rows[0]["locale"]); got != "en" {
		t.Fatalf("expected source locale first, got %+v", rows)
	}
	fr := rows[1]
	if got := toString(fr["locale_assignment_key"]); got != "fr:localization" {
		t.Fatalf("expected fr row to carry assignment key, got %+v", fr)
	}
	if !translationSSRTestBadgeLabels(fr["badges"])["Open Pool"] || !translationSSRTestBadgeLabels(fr["badges"])["Open"] {
		t.Fatalf("expected fr row to preserve assignment badges, got %+v", fr["badges"])
	}
	if got := toString(extractMap(extractMap(fr["assign_to_user_action"])["payload"])["work_scope"]); got != "localization" {
		t.Fatalf("expected assign-to-user payload work_scope localization, got %+v", fr["assign_to_user_action"])
	}
	if got := toString(fr["open_locale_href"]); got != "/admin/translations/assignments/asg-fr/edit?channel=default" {
		t.Fatalf("expected open editor href from action state, got %q", got)
	}
	missing := rows[2]
	if got := toString(missing["locale"]); got != "es" {
		t.Fatalf("expected missing locale es, got %+v", missing)
	}
	if got := toString(missing["kind"]); got != "missing_required" {
		t.Fatalf("expected missing_required row kind, got %+v", missing)
	}
	action := extractMap(missing["create_locale_action"])
	if !translationSSRTruthy(action["enabled"]) || toString(action["locale"]) != "es" {
		t.Fatalf("expected enabled create locale action for es, got %+v", action)
	}
}

func TestTranslationSSRFamilyDetailLocaleCoverageRowsReconcileActiveAssignments(t *testing.T) {
	data := map[string]any{
		"family_id":     "family-active",
		"content_type":  "pages",
		"source_locale": "en",
		"source_variant": map[string]any{
			"fields": map[string]any{"title": "Translation Demo"},
		},
		"locale_variants": []map[string]any{{
			"id":               "variant-fr",
			"locale":           "fr",
			"status":           "draft",
			"source_record_id": "page-fr",
		}},
		"active_assignments": []map[string]any{{
			"assignment_id":    "asg-fr",
			"id":               "asg-fr",
			"target_locale":    "fr",
			"work_scope":       "localization",
			"status":           "assigned",
			"assignee_id":      "translator-1",
			"display_assignee": "Maya Chen <maya@example.com>",
		}},
		"locale_assignments": map[string]any{
			"fr:localization": map[string]any{
				"locale":     "fr",
				"work_scope": "localization",
				"state":      "unassigned",
				"actions": map[string]any{
					"assign_to_me":   map[string]any{"enabled": false, "reason_code": "already_assigned", "reason": "assignment already belongs to you"},
					"assign_to_user": map[string]any{"enabled": true},
					"claim":          map[string]any{"enabled": false},
					"open_editor":    map[string]any{"href": "/admin/translations/assignments/asg-fr/edit?channel=default"},
				},
			},
		},
	}

	translationSSRDecorateFamilyDetail(data)

	rows := translationSSRAnyList(data["locale_coverage_rows"])
	if len(rows) != 1 {
		t.Fatalf("expected one locale coverage row, got %+v", rows)
	}
	row := rows[0]
	if got := toString(row["assignment_summary"]); got != "Maya Chen <maya@example.com>" {
		t.Fatalf("expected active assignment summary, got %q row=%+v", got, row)
	}
	assignment := extractMap(row["assignment"])
	if got := toString(assignment["assignment_id"]); got != "asg-fr" {
		t.Fatalf("expected reconciled assignment row, got %+v", assignment)
	}
}

func TestTranslationSSRFamilyDetailLocaleCoverageRowsReconcileEmptyLocaleAssignments(t *testing.T) {
	data := map[string]any{
		"family_id":     "family-empty-assignments",
		"content_type":  "pages",
		"source_locale": "en",
		"locale_variants": []map[string]any{{
			"id":               "variant-fr",
			"locale":           "fr",
			"status":           "draft",
			"source_record_id": "page-fr",
		}},
		"active_assignments": []map[string]any{{
			"assignment_id":    "asg-fr",
			"id":               "asg-fr",
			"target_locale":    "fr",
			"work_scope":       "localization",
			"status":           "assigned",
			"assignee_id":      "translator-1",
			"display_assignee": "Maya Chen <maya@example.com>",
		}},
		"locale_assignments": map[string]any{},
	}

	translationSSRDecorateFamilyDetail(data)

	rows := translationSSRAnyList(data["locale_coverage_rows"])
	if len(rows) != 1 {
		t.Fatalf("expected one locale coverage row, got %+v", rows)
	}
	row := rows[0]
	if got := toString(row["assignment_summary"]); got != "Maya Chen <maya@example.com>" {
		t.Fatalf("expected active assignment summary, got %q row=%+v", got, row)
	}
	if got := toString(row["locale_assignment_key"]); got != "fr:localization" {
		t.Fatalf("expected synthesized locale assignment key, got %q row=%+v", got, row)
	}
	localeAssignments := extractMap(data["locale_assignments"])
	if assignment := extractMap(extractMap(localeAssignments["fr:localization"])["assignment"]); toString(assignment["assignment_id"]) != "asg-fr" {
		t.Fatalf("expected synthesized locale assignment payload, got %+v", localeAssignments)
	}
}

func TestTranslationSSRFamilyDetailLocaleCoverageRowsDisplayCurrentAssigneeAsMe(t *testing.T) {
	data := map[string]any{
		"family_id":     "family-me",
		"content_type":  "pages",
		"source_locale": "en",
		"locale_variants": []map[string]any{{
			"id":               "variant-es",
			"locale":           "es",
			"status":           "draft",
			"source_record_id": "page-es",
		}},
		"locale_assignments": map[string]any{
			"es:localization": map[string]any{
				"locale":     "es",
				"work_scope": "localization",
				"state":      "assigned_to_me",
				"assignment": map[string]any{
					"assignment_id":    "asg-es",
					"target_locale":    "es",
					"status":           "assigned",
					"assignee_id":      "translator-1",
					"display_assignee": "Maya Chen <maya@example.com>",
				},
				"actions": map[string]any{
					"assign_to_me": map[string]any{"enabled": false, "reason_code": "already_assigned", "reason": "assignment already belongs to you"},
				},
			},
		},
	}

	translationSSRDecorateFamilyDetail(data)

	rows := translationSSRAnyList(data["locale_coverage_rows"])
	if len(rows) != 1 {
		t.Fatalf("expected one locale coverage row, got %+v", rows)
	}
	if got := toString(rows[0]["assignment_summary"]); got != "me" {
		t.Fatalf("expected current assignee summary me, got %q row=%+v", got, rows[0])
	}
}

func TestTranslationSSRFamilyDetailLocaleCoverageRowsKeepMultipleWorkScopes(t *testing.T) {
	data := map[string]any{
		"family_id":     "family-scoped",
		"content_type":  "pages",
		"source_locale": "en",
		"source_variant": map[string]any{
			"fields": map[string]any{"title": "Release Notes"},
		},
		"locale_variants": []map[string]any{{
			"id":               "variant-en",
			"locale":           "en",
			"is_source":        true,
			"source_record_id": "page-en",
		}, {
			"id":               "variant-fr",
			"locale":           "fr",
			"status":           "draft",
			"source_record_id": "page-fr",
		}},
		"locale_assignments": map[string]any{
			"fr:localization": map[string]any{
				"locale":        "fr",
				"work_scope":    "localization",
				"state":         "open_pool",
				"display_state": "Open Pool",
				"assignment": map[string]any{
					"assignment_id":  "asg-fr-localization",
					"status":         "open",
					"display_status": "Open",
				},
			},
			"fr:seo": map[string]any{
				"locale":        "fr",
				"work_scope":    "seo",
				"state":         "assigned",
				"display_state": "Assigned",
				"assignment": map[string]any{
					"assignment_id":  "asg-fr-seo",
					"status":         "in_progress",
					"display_status": "In Progress",
				},
			},
		},
	}

	translationSSRDecorateFamilyDetail(data)

	rows := translationSSRAnyList(data["locale_coverage_rows"])
	var scoped []map[string]any
	for _, row := range rows {
		if toString(row["locale"]) == "fr" {
			scoped = append(scoped, row)
		}
	}
	if len(scoped) != 2 {
		t.Fatalf("expected both fr work scopes to render, got %+v", rows)
	}
	keys := map[string]bool{}
	for _, row := range scoped {
		keys[toString(row["locale_assignment_key"])] = true
	}
	if !keys["fr:localization"] || !keys["fr:seo"] {
		t.Fatalf("expected stable assignment keys for both work scopes, got %+v", scoped)
	}
}

func TestTranslationSSRFamilyVariantHrefPreservesChannel(t *testing.T) {
	href := translationSSRFamilyVariantHref(map[string]any{
		"content_base_path": "/admin/content",
		"content_type":      "pages",
		"channel":           "staging",
	}, map[string]any{
		"id":     "page-fr",
		"locale": "fr",
	})

	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if got := parsed.Path; got != "/admin/content/pages/page-fr" {
		t.Fatalf("expected content path to be preserved, got %q", got)
	}
	if got := parsed.Query().Get("locale"); got != "fr" {
		t.Fatalf("expected locale query, got %q", got)
	}
	if got := parsed.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected channel query, got %q", got)
	}
}

func TestTranslationSSRQueueResultNormalizesQueuePayloadRows(t *testing.T) {
	result := translationSSRQueueResult(TranslationSSRPresenterInput{
		QueuePath:      "/admin/translations/queue",
		EditorBasePath: "/admin/translations/assignments",
	}, map[string]any{
		"items":    []map[string]any{{"assignment_id": "asg-1"}},
		"total":    1,
		"page":     2,
		"per_page": 25,
		"channel":  "staging",
	})

	rows := translationSSRList(result.Data, "rows")
	if len(rows) != 1 {
		t.Fatalf("expected queue rows to be normalized, got %+v", result.Data)
	}
	if got := toInt(result.Meta["total"]); got != 1 {
		t.Fatalf("expected queue total metadata, got %d", got)
	}
	if got := toString(result.Meta["channel"]); got != "staging" {
		t.Fatalf("expected queue channel metadata, got %q", got)
	}
	if got := toInt(result.DataGrid["count"]); got != 1 {
		t.Fatalf("expected queue datagrid count, got %d", got)
	}
	if presets := translationSSRList(map[string]any{"items": result.DataGrid["saved_filter_presets"]}, "items"); len(presets) == 0 {
		t.Fatalf("expected default queue preset metadata, got %+v", result.DataGrid["saved_filter_presets"])
	}
}

func TestTranslationSSRFamilyListDataGridContract(t *testing.T) {
	data := map[string]any{
		"families": []map[string]any{{"family_id": "family-1"}},
	}
	meta := map[string]any{"page": 2, "per_page": 25, "total": 51}
	grid := translationSSRFamilyListDataGrid(TranslationSSRPresenterInput{
		FamilyBasePath: "/admin/translations/families",
		Channel:        "staging",
		Query: map[string]string{
			"family_id":       "family-1",
			"readiness_state": "blocked",
		},
	}, data, meta)

	if got := toString(grid["resource"]); got != "translation_families" {
		t.Fatalf("expected family resource, got %q", got)
	}
	if got := toInt(grid["count"]); got != 1 {
		t.Fatalf("expected one row, got %d", got)
	}
	pagination := extractMap(grid["pagination"])
	if got := toInt(pagination["total"]); got != 51 {
		t.Fatalf("expected pagination total 51, got %d", got)
	}
	urlState := extractMap(grid["url_state"])
	if got := toString(urlState["channel"]); got != "staging" {
		t.Fatalf("expected channel-preserving URL state, got %+v", urlState)
	}
	filters, ok := grid["filters"].([]map[string]any)
	if !ok || len(filters) == 0 {
		t.Fatalf("expected filter contracts, got %+v", grid["filters"])
	}
	filterValues := map[string]string{}
	for _, filter := range filters {
		filterValues[toString(filter["key"])] = toString(filter["value"])
	}
	if got := filterValues["family_id"]; got != "family-1" {
		t.Fatalf("expected active family filter value, got %q", got)
	}
	if got := filterValues["readiness_state"]; got != "blocked" {
		t.Fatalf("expected active readiness filter value, got %q", got)
	}
}

func TestTranslationSSRFamilyListLinksPreserveChannel(t *testing.T) {
	links := translationSSRFamilyListLinks(TranslationSSRPresenterInput{
		FamilyListPath: "/admin/translations/families",
		FamilyBasePath: "/admin/translations/families",
		MatrixPath:     "/admin/translations/matrix",
		QueuePath:      "/admin/translations/queue?review_state=needs_review",
		Channel:        "staging",
		Query: map[string]string{
			"tenant_id":       "tenant-1",
			"org_id":          "org-1",
			"readiness_state": "blocked",
			"blocker_code":    "missing_locale",
		},
	})

	matrixURL, err := url.Parse(toString(links["matrix"]))
	if err != nil {
		t.Fatalf("parse matrix link: %v", err)
	}
	for key, want := range map[string]string{
		"channel":         "staging",
		"tenant_id":       "tenant-1",
		"org_id":          "org-1",
		"readiness_state": "blocked",
		"blocker_code":    "missing_locale",
	} {
		if got := matrixURL.Query().Get(key); got != want {
			t.Fatalf("expected matrix query %s=%q, got %q in %q", key, want, got, matrixURL.String())
		}
	}
	queueURL, err := url.Parse(toString(links["queue"]))
	if err != nil {
		t.Fatalf("parse queue link: %v", err)
	}
	for key, want := range map[string]string{
		"channel":      "staging",
		"tenant_id":    "tenant-1",
		"org_id":       "org-1",
		"review_state": "needs_review",
	} {
		if got := queueURL.Query().Get(key); got != want {
			t.Fatalf("expected queue query %s=%q, got %q in %q", key, want, got, queueURL.String())
		}
	}
}

func TestTranslationSSRFamilyListRowLinksRespectRouteAvailability(t *testing.T) {
	row := map[string]any{
		"family_id":       "family 1",
		"content_type":    "pages",
		"readiness_state": "blocked",
	}
	links := translationSSRFamilyListRowLinks(TranslationSSRPresenterInput{
		FamilyBasePath: "/admin/translations/families",
		Channel:        "staging",
		Query: map[string]string{
			"blocker_code":   "missing_locale",
			"missing_locale": "es",
			"tenant_id":      "tenant-1",
			"org_id":         "org-1",
		},
	}, row)

	if got := toString(links["detail"]); got != "/admin/translations/families/family%201?blocker_code=missing_locale&channel=staging&missing_locale=es&org_id=org-1&tenant_id=tenant-1" {
		t.Fatalf("expected detail link to preserve channel and escape family id, got %q", got)
	}
	if got := toString(links["matrix"]); got != "" {
		t.Fatalf("expected disabled matrix route to be omitted, got %q", got)
	}
	if got := toString(links["queue"]); got != "" {
		t.Fatalf("expected disabled queue route to be omitted, got %q", got)
	}

	links = translationSSRFamilyListRowLinks(TranslationSSRPresenterInput{
		FamilyBasePath: "/admin/translations/families",
		MatrixPath:     "/admin/translations/matrix?view=compact",
		QueuePath:      "/admin/translations/queue?review_state=needs_review",
		Channel:        "staging",
		Query: map[string]string{
			"blocker_code":   "missing_locale",
			"missing_locale": "es",
			"tenant_id":      "tenant-1",
			"org_id":         "org-1",
		},
	}, row)

	matrixURL, err := url.Parse(toString(links["matrix"]))
	if err != nil {
		t.Fatalf("parse matrix url: %v", err)
	}
	matrixQuery := matrixURL.Query()
	for key, want := range map[string]string{
		"family_id":       "family 1",
		"channel":         "staging",
		"content_type":    "pages",
		"readiness_state": "blocked",
		"blocker_code":    "missing_locale",
		"missing_locale":  "es",
		"tenant_id":       "tenant-1",
		"org_id":          "org-1",
		"view":            "compact",
	} {
		if got := matrixQuery.Get(key); got != want {
			t.Fatalf("expected matrix query %s=%q, got %q in %q", key, want, got, matrixURL.String())
		}
	}
	queueURL, err := url.Parse(toString(links["queue"]))
	if err != nil {
		t.Fatalf("parse queue url: %v", err)
	}
	if got := queueURL.Query().Get("family_id"); got != "family 1" {
		t.Fatalf("expected queue family filter, got %q", got)
	}
	if got := queueURL.Query().Get("review_state"); got != "needs_review" {
		t.Fatalf("expected existing queue query to be preserved, got %q", got)
	}
	if got := queueURL.Query().Get("tenant_id"); got != "tenant-1" {
		t.Fatalf("expected queue tenant scope to be preserved, got %q", got)
	}
	if got := queueURL.Query().Get("org_id"); got != "org-1" {
		t.Fatalf("expected queue org scope to be preserved, got %q", got)
	}
}

func TestTranslationSSRQueueDataGridContract(t *testing.T) {
	data := map[string]any{
		"rows": []map[string]any{{"assignment_id": "asg-1"}},
	}
	meta := map[string]any{
		"page":                             1,
		"per_page":                         50,
		"total":                            1,
		"supported_filter_keys":            []string{"status", "assignee_id"},
		"supported_sort_keys":              []string{"due_date"},
		"default_sort":                     map[string]any{"sort": "due_date", "order": "asc"},
		"saved_filter_presets":             []map[string]any{{"id": "open"}},
		"saved_review_filter_presets":      []map[string]any{{"id": "review_inbox"}},
		"server_family_grouping_supported": true,
		"bulk_selection":                   map[string]any{"mode": "current_page"},
		"grouping":                         map[string]any{"mode": "family_id"},
	}
	grid := translationSSRQueueDataGrid(TranslationSSRPresenterInput{
		EditorBasePath: "/admin/translations/assignments",
		QueuePath:      "/admin/translations/queue",
		Channel:        "staging",
		Query: map[string]string{
			"status":         "open",
			"tenant_id":      "tenant-1",
			"org_id":         "org-1",
			"group_by":       "family_id",
			"group_strategy": "server_family",
		},
	}, data, meta)

	if got := toString(grid["resource"]); got != "translation_assignments" {
		t.Fatalf("expected assignment resource, got %q", got)
	}
	if got := toInt(grid["count"]); got != 1 {
		t.Fatalf("expected one row, got %d", got)
	}
	if supported := toBool(grid["server_family_supported"]); !supported {
		t.Fatalf("expected server-family grouping support metadata")
	}
	if actions, ok := grid["row_actions"].([]map[string]any); !ok || len(actions) == 0 {
		t.Fatalf("expected row actions, got %+v", grid["row_actions"])
	}
	filters, ok := grid["filters"].([]map[string]any)
	if !ok || len(filters) == 0 || toString(filters[0]["key"]) != "status" || toString(filters[0]["value"]) != "open" {
		t.Fatalf("expected active filter metadata, got %+v", grid["filters"])
	}
	presets, ok := grid["saved_filter_presets"].([]map[string]any)
	if !ok || len(presets) != 1 {
		t.Fatalf("expected enriched saved filter presets, got %+v", grid["saved_filter_presets"])
	}
	href := toString(presets[0]["href"])
	for _, expected := range []string{
		"/admin/translations/queue?",
		"channel=staging",
		"preset=open",
	} {
		if !strings.Contains(href, expected) {
			t.Fatalf("expected preset href %q to contain %q", href, expected)
		}
	}
	viewLinks := extractMap(grid["view_links"])
	currentURL, err := url.Parse(toString(viewLinks["current"]))
	if err != nil {
		t.Fatalf("parse current view url: %v", err)
	}
	if got := currentURL.Query().Get("group_strategy"); got != "server_family" {
		t.Fatalf("expected current link to preserve active grouping, got %q", currentURL.String())
	}
	clearURL, err := url.Parse(toString(viewLinks["clear_all"]))
	if err != nil {
		t.Fatalf("parse clear-all url: %v", err)
	}
	if got := clearURL.Query().Get("status"); got != "" {
		t.Fatalf("expected clear-all link to remove filters, got %q", clearURL.String())
	}
	if got := clearURL.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected clear-all link to preserve channel, got %q", clearURL.String())
	}
	listURL, err := url.Parse(toString(viewLinks["list"]))
	if err != nil {
		t.Fatalf("parse list view url: %v", err)
	}
	if got := listURL.Query().Get("group_by"); got != "" {
		t.Fatalf("expected list view link to clear grouping, got %q", listURL.String())
	}
	for key, want := range map[string]string{"status": "open", "tenant_id": "tenant-1", "org_id": "org-1", "channel": "staging"} {
		if got := listURL.Query().Get(key); got != want {
			t.Fatalf("expected list query %s=%q, got %q in %q", key, want, got, listURL.String())
		}
	}
	groupedURL, err := url.Parse(toString(viewLinks["grouped"]))
	if err != nil {
		t.Fatalf("parse grouped view url: %v", err)
	}
	if got := groupedURL.Query().Get("group_by"); got != "family_id" {
		t.Fatalf("expected grouped view family grouping, got %q", groupedURL.String())
	}
	if got := groupedURL.Query().Get("group_strategy"); got != "page_local" {
		t.Fatalf("expected grouped view local strategy, got %q", groupedURL.String())
	}
	familiesURL, err := url.Parse(toString(viewLinks["families"]))
	if err != nil {
		t.Fatalf("parse families view url: %v", err)
	}
	if got := familiesURL.Query().Get("group_strategy"); got != "server_family" {
		t.Fatalf("expected families view server strategy, got %q", familiesURL.String())
	}
	chips := translationSSRAnyList(grid["active_filter_chips"])
	if len(chips) != 1 {
		t.Fatalf("expected only visible non-scope active filters, got %+v", chips)
	}
	if got := toString(chips[0]["value"]); got != "Open" {
		t.Fatalf("expected formatted status chip, got %+v", chips)
	}
	sort := extractMap(grid["sort"])
	if got := toString(sort["label"]); got != "Due Date ASC" {
		t.Fatalf("expected readable sort label, got %q", got)
	}
}

func TestTranslationSSRFamilyAssigneeContractUsesSelectedLabelsFallback(t *testing.T) {
	contract := translationSSRFamilyAssigneeContract(map[string]any{
		"active_assignments": []map[string]any{
			{"assignee_id": "user-1", "assignee_label": "Maya Chen", "target_locale": "es"},
		},
	})

	if got := toString(contract["mode"]); got != "formgen-relationship-typeahead" {
		t.Fatalf("expected selected label fallback mode, got %q", got)
	}
	if got := toString(contract["endpoint_url"]); got != "/api/translations/options/assignees?per_page=200" {
		t.Fatalf("expected assignee formgen endpoint, got %q", got)
	}
	if got := toString(contract["endpoint_renderer"]); got != "typeahead" {
		t.Fatalf("expected assignee formgen typeahead renderer, got %q", got)
	}
	if got := toString(contract["endpoint_mode"]); got != "" {
		t.Fatalf("expected assignee typeahead to preload options instead of search-only mode, got %q", got)
	}
	selected, ok := contract["selected"].([]map[string]any)
	if !ok || len(selected) != 1 {
		t.Fatalf("expected selected assignee label, got %+v", contract["selected"])
	}
	if got := toString(selected[0]["label"]); got != "Maya Chen" {
		t.Fatalf("expected selected assignee label, got %q", got)
	}
}

func translationSSRTestBadgeLabels(raw any) map[string]bool {
	out := map[string]bool{}
	for _, badge := range translationSSRAnyList(raw) {
		out[toString(badge["label"])] = true
	}
	return out
}
