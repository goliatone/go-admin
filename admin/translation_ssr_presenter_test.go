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

func TestTranslationSSRQueueInputNormalizesTypeAliases(t *testing.T) {
	input := translationSSRQueueInputWithPreset(TranslationSSRPresenterInput{
		Query: map[string]string{
			"content_type": "pages",
			"type":         "posts",
			"status":       "assigned",
		},
	})

	if got := input.Query["entity_type"]; got != "pages" {
		t.Fatalf("expected content_type alias to normalize to entity_type, got %+v", input.Query)
	}
	if _, ok := input.Query["content_type"]; ok {
		t.Fatalf("expected content_type alias to be removed from queue query, got %+v", input.Query)
	}
	if _, ok := input.Query["type"]; ok {
		t.Fatalf("expected type alias to be removed from queue query, got %+v", input.Query)
	}
	if got := input.Query["status"]; got != "assigned" {
		t.Fatalf("expected unrelated query state to be preserved, got %+v", input.Query)
	}
}

func TestTranslationSSRQueueInputKeepsCanonicalEntityTypeOverAliases(t *testing.T) {
	input := translationSSRQueueInputWithPreset(TranslationSSRPresenterInput{
		Query: map[string]string{
			"entity_type":  "pages",
			"content_type": "articles",
			"type":         "news",
		},
	})

	if got := input.Query["entity_type"]; got != "pages" {
		t.Fatalf("expected canonical entity_type to win, got %+v", input.Query)
	}
	if _, ok := input.Query["content_type"]; ok {
		t.Fatalf("expected content_type alias to be removed, got %+v", input.Query)
	}
	if _, ok := input.Query["type"]; ok {
		t.Fatalf("expected type alias to be removed, got %+v", input.Query)
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
	if got := toString(overdueRows[0]["display_locale"]); got != "EN → ES" {
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
		Channel:        "staging",
	}, map[string]any{
		"items": []map[string]any{
			{"assignment_id": "asg-1"},
			{"row_type": "family", "id": "family:fam-1", "family_id": "fam-1"},
		},
		"total":    1,
		"page":     2,
		"per_page": 25,
		"channel":  "staging",
	})

	rows := translationSSRList(result.Data, "rows")
	if len(rows) != 2 {
		t.Fatalf("expected queue rows to be normalized, got %+v", result.Data)
	}
	familyHref := toString(rows[1]["assignments_href"])
	for _, expected := range []string{"/translations/families/fam-1/assignments?", "channel=staging"} {
		if !strings.Contains(familyHref, expected) {
			t.Fatalf("expected family row assignments href %q to contain %q", familyHref, expected)
		}
	}
	if got := toInt(result.Meta["total"]); got != 1 {
		t.Fatalf("expected queue total metadata, got %d", got)
	}
	if got := toString(result.Meta["channel"]); got != "staging" {
		t.Fatalf("expected queue channel metadata, got %q", got)
	}
	if got := toInt(result.DataGrid["count"]); got != 2 {
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
		"grouping":                         map[string]any{"mode": "family_id", "enabled": true, "strategy": "server_family"},
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
	if got := toString(sort["label"]); got != "Due Date, ascending" {
		t.Fatalf("expected readable sort label, got %q", got)
	}
	if got := toString(grid["view_mode"]); got != "families" {
		t.Fatalf("expected families view mode from grouping meta, got %q", got)
	}
}

func TestTranslationSSRQueueDataGridPaginationModel(t *testing.T) {
	grid := translationSSRQueueDataGrid(TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue",
		Channel:   "staging",
		Query: map[string]string{
			"status":    "open",
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
			"page":      "2",
			"per_page":  "25",
		},
	}, map[string]any{}, map[string]any{
		"page":                  2,
		"per_page":              25,
		"total":                 76,
		"supported_filter_keys": []string{"status"},
		"default_sort":          map[string]any{"key": "updated_at", "order": "desc"},
	})

	pagination := extractMap(grid["pagination"])
	if got := toString(pagination["range_label"]); got != "Showing 26-50 of 76 assignments" {
		t.Fatalf("expected visible range label, got %q", got)
	}
	if got := toString(pagination["page_label"]); got != "Assignment page 2 of 4" {
		t.Fatalf("expected page label, got %q", got)
	}
	if toBool(pagination["previous_disabled"]) || toBool(pagination["next_disabled"]) {
		t.Fatalf("expected previous and next enabled, got %+v", pagination)
	}
	choices := translationSSRAnyList(pagination["page_size_choices"])
	if len(choices) != 3 {
		t.Fatalf("expected fixed page-size choices, got %+v", choices)
	}
	values := []string{}
	for _, choice := range choices {
		values = append(values, toString(choice["value"]))
		if toString(choice["value"]) == "50" {
			parsed, err := url.Parse(toString(choice["href"]))
			if err != nil {
				t.Fatalf("parse page-size href: %v", err)
			}
			for key, want := range map[string]string{
				"status":    "open",
				"tenant_id": "tenant-1",
				"org_id":    "org-1",
				"channel":   "staging",
				"page":      "1",
				"per_page":  "50",
			} {
				if got := parsed.Query().Get(key); got != want {
					t.Fatalf("expected page-size href %s=%q, got %q in %q", key, want, got, parsed.String())
				}
			}
		}
	}
	if strings.Join(values, ",") != "25,50,100" {
		t.Fatalf("expected page sizes 25,50,100, got %v", values)
	}
}

func TestTranslationSSRQueueDataGridEmptyPaginationModel(t *testing.T) {
	grid := translationSSRQueueDataGrid(TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue",
	}, map[string]any{}, map[string]any{
		"page":                  1,
		"per_page":              25,
		"total":                 0,
		"supported_filter_keys": []string{"status"},
		"default_sort":          map[string]any{"key": "updated_at", "order": "desc"},
	})

	pagination := extractMap(grid["pagination"])
	if got := toString(pagination["range_label"]); got != "Showing 0-0 of 0 assignments" {
		t.Fatalf("expected empty visible range label, got %q", got)
	}
	if got := toString(pagination["page_label"]); got != "Assignment page 1 of 1" {
		t.Fatalf("expected empty page label, got %q", got)
	}
	if !toBool(pagination["previous_disabled"]) || !toBool(pagination["next_disabled"]) {
		t.Fatalf("expected empty pagination controls disabled, got %+v", pagination)
	}
}

func TestTranslationSSRQueueDataGridTypeFilterControl(t *testing.T) {
	grid := translationSSRQueueDataGrid(TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue",
		Channel:   "staging",
		Query: map[string]string{
			"entity_type": "pages",
			"tenant_id":   "tenant-1",
			"page":        "3",
		},
	}, map[string]any{}, map[string]any{
		"page":                  3,
		"per_page":              25,
		"total":                 1,
		"supported_filter_keys": []string{"status", "entity_type"},
		"default_sort":          map[string]any{"key": "updated_at", "order": "desc"},
	})

	filters := translationSSRAnyList(grid["filters"])
	var typeFilter map[string]any
	for _, filter := range filters {
		if toString(filter["key"]) == "entity_type" {
			typeFilter = filter
			break
		}
	}
	if len(typeFilter) == 0 {
		t.Fatalf("expected entity_type filter control, got %+v", filters)
	}
	if toString(typeFilter["label"]) != "Type" || toString(typeFilter["name"]) != "entity_type" || toString(typeFilter["current_value"]) != "pages" {
		t.Fatalf("expected canonical Type control, got %+v", typeFilter)
	}
	chips := translationSSRAnyList(grid["active_filter_chips"])
	if len(chips) != 1 || toString(chips[0]["label"]) != "Type" || toString(chips[0]["value"]) != "Pages" {
		t.Fatalf("expected Type active chip, got %+v", chips)
	}
	clearURL, err := url.Parse(toString(chips[0]["clear_url"]))
	if err != nil {
		t.Fatalf("parse clear url: %v", err)
	}
	if got := clearURL.Query().Get("entity_type"); got != "" {
		t.Fatalf("expected clear URL to remove entity_type, got %q", clearURL.String())
	}
	if got := clearURL.Query().Get("tenant_id"); got != "tenant-1" {
		t.Fatalf("expected clear URL to preserve tenant scope, got %q", clearURL.String())
	}
	if got := clearURL.Query().Get("page"); got != "1" {
		t.Fatalf("expected clear URL to reset page, got %q", clearURL.String())
	}
}

func TestTranslationSSRQueueViewMode(t *testing.T) {
	cases := []struct {
		name string
		meta map[string]any
		want string
	}{
		{name: "missing grouping", meta: map[string]any{}, want: "list"},
		{name: "flat default", meta: map[string]any{"grouping": map[string]any{"mode": "flat"}}, want: "list"},
		{name: "disabled grouping", meta: map[string]any{"grouping": map[string]any{"enabled": false, "strategy": "page_local"}}, want: "list"},
		{name: "page local", meta: map[string]any{"grouping": map[string]any{"enabled": true, "strategy": "page_local"}}, want: "grouped"},
		{name: "default strategy", meta: map[string]any{"grouping": map[string]any{"enabled": true}}, want: "grouped"},
		{name: "server family", meta: map[string]any{"grouping": map[string]any{"enabled": true, "strategy": "server_family"}}, want: "families"},
	}
	for _, tc := range cases {
		if got := translationSSRQueueViewMode(tc.meta); got != tc.want {
			t.Fatalf("%s: expected view mode %q, got %q", tc.name, tc.want, got)
		}
	}
}

func TestTranslationSSRQueueFamilyRowsUseFamilyAssignmentsUIHref(t *testing.T) {
	rows := []map[string]any{{
		"row_type":       "family",
		"family_id":      "family-123",
		"family_label":   "Homepage",
		"target_locales": []string{"es", "fr"},
		"expansion": map[string]any{
			"href":  "/admin/api/translations/families/family-123/assignments?page=1&per_page=25",
			"route": "translations.assignments.family_assignments",
			"query": map[string]any{
				"status":       "assigned",
				"sort":         "updated_at",
				"order":        "desc",
				"page":         1,
				"per_page":     25,
				"tenant_id":    "tenant-1",
				"org_id":       "org-1",
				"review_state": "needs_review",
			},
		},
	}}

	translationSSRDecorateQueueRows(TranslationSSRPresenterInput{
		BasePath:       "/admin",
		FamilyBasePath: "/admin/translations/families",
		QueuePath:      "/admin/translations/queue",
		Channel:        "staging",
		Query:          map[string]string{"status": "open"},
	}, rows)

	href := toString(rows[0]["assignments_href"])
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse assignments href %q: %v", href, err)
	}
	if parsed.Path != "/admin/translations/families/family-123/assignments" {
		t.Fatalf("expected family assignments ui path, got %q", parsed.Path)
	}
	if strings.Contains(href, "/admin/api/") {
		t.Fatalf("expected ui href not api href, got %q", href)
	}
	for key, want := range map[string]string{
		"channel":      "staging",
		"status":       "assigned",
		"review_state": "needs_review",
		"sort":         "updated_at",
		"order":        "desc",
		"page":         "1",
		"per_page":     "25",
		"tenant_id":    "tenant-1",
		"org_id":       "org-1",
	} {
		if got := parsed.Query().Get(key); got != want {
			t.Fatalf("expected query %s=%q, got %q in %q", key, want, got, href)
		}
	}
	if expansion := extractMap(rows[0]["expansion"]); !strings.Contains(toString(expansion["href"]), "/admin/api/translations/families/family-123/assignments") {
		t.Fatalf("expected expansion href to remain api endpoint, got %+v", expansion)
	}
}

func TestTranslationSSRFamilyAssignmentsLinksPreservePaginationQuery(t *testing.T) {
	links := translationSSRFamilyAssignmentsLinks(TranslationSSRPresenterInput{
		BasePath:       "/admin",
		FamilyBasePath: "/admin/translations/families",
		QueuePath:      "/admin/translations/queue",
		EditorBasePath: "/admin/translations/assignments",
		FamilyID:       "family-123",
		Channel:        "staging",
		Query: map[string]string{
			"status":       "assigned",
			"review_state": "needs_review",
			"sort":         "updated_at",
			"order":        "desc",
			"page":         "2",
			"per_page":     "25",
			"tenant_id":    "tenant-1",
			"org_id":       "org-1",
		},
	}, map[string]any{"page": 2, "per_page": 25, "total": 75, "has_next": true})

	if got := toString(links["family_detail"]); !strings.HasPrefix(got, "/admin/translations/families/family-123?") {
		t.Fatalf("expected family detail link, got %q", got)
	}
	nextURL, err := url.Parse(toString(links["next"]))
	if err != nil {
		t.Fatalf("parse next link: %v", err)
	}
	prevURL, err := url.Parse(toString(links["previous"]))
	if err != nil {
		t.Fatalf("parse previous link: %v", err)
	}
	if nextURL.Path != "/admin/translations/families/family-123/assignments" || prevURL.Path != nextURL.Path {
		t.Fatalf("expected family assignments pagination paths, prev=%q next=%q", prevURL.String(), nextURL.String())
	}
	for _, parsed := range []*url.URL{prevURL, nextURL} {
		for key, want := range map[string]string{
			"channel":      "staging",
			"status":       "assigned",
			"review_state": "needs_review",
			"sort":         "updated_at",
			"order":        "desc",
			"per_page":     "25",
			"tenant_id":    "tenant-1",
			"org_id":       "org-1",
		} {
			if got := parsed.Query().Get(key); got != want {
				t.Fatalf("expected %s=%q in %q, got %q", key, want, parsed.String(), got)
			}
		}
	}
	if got := prevURL.Query().Get("page"); got != "1" {
		t.Fatalf("expected previous page 1, got %q", got)
	}
	if got := nextURL.Query().Get("page"); got != "3" {
		t.Fatalf("expected next page 3, got %q", got)
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

func TestTranslationSSRFamilySummaryCardsCountsStatuses(t *testing.T) {
	input := TranslationSSRPresenterInput{
		FamilyListPath: "/admin/translations/families",
		Channel:        "staging",
		Query: map[string]string{
			"family_id":    "family-1",
			"content_type": "pages",
			"blocker_code": "missing_locale",
		},
	}
	data := map[string]any{
		"families": []map[string]any{
			{"family_id": "fam-1", "readiness_state": "blocked"},
			{"family_id": "fam-2", "readiness_state": "blocked"},
			{"family_id": "fam-3", "readiness_state": "missing_locales"},
			{"family_id": "fam-4", "readiness_state": "missing_locales_and_fields"},
			{"family_id": "fam-5", "readiness_state": "ready"},
		},
	}

	cards := translationSSRFamilySummaryCards(input, data)

	if len(cards) != 4 {
		t.Fatalf("expected 4 summary cards, got %d", len(cards))
	}

	cardByKey := map[string]map[string]any{}
	for _, card := range cards {
		cardByKey[toString(card["key"])] = card
	}

	if got := toInt(cardByKey["total"]["count"]); got != 5 {
		t.Fatalf("expected total count 5, got %d", got)
	}
	if got := toInt(cardByKey["blocked"]["count"]); got != 2 {
		t.Fatalf("expected blocked count 2, got %d", got)
	}
	if got := toInt(cardByKey["missing"]["count"]); got != 2 {
		t.Fatalf("expected missing count 2 (includes missing_locales_and_fields), got %d", got)
	}
	if got := toInt(cardByKey["ready"]["count"]); got != 1 {
		t.Fatalf("expected ready count 1, got %d", got)
	}
}

func TestTranslationSSRFamilySummaryCardsPreservesChannelAndFilters(t *testing.T) {
	input := TranslationSSRPresenterInput{
		FamilyListPath: "/admin/translations/families",
		Channel:        "staging",
		Query: map[string]string{
			"family_id":    "family-1",
			"content_type": "pages",
			"blocker_code": "missing_locale",
		},
	}
	data := map[string]any{
		"families": []map[string]any{},
	}

	cards := translationSSRFamilySummaryCards(input, data)

	blockedCard := cards[1]
	href := toString(blockedCard["href"])
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if got := parsed.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected channel preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("family_id"); got != "family-1" {
		t.Fatalf("expected family_id preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("content_type"); got != "pages" {
		t.Fatalf("expected content_type preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("blocker_code"); got != "missing_locale" {
		t.Fatalf("expected blocker_code preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("readiness_state"); got != "blocked" {
		t.Fatalf("expected readiness_state filter applied, got %q in %q", got, href)
	}
}

func TestTranslationSSRQueueSummaryCardsCountsStatuses(t *testing.T) {
	input := TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue",
		Channel:   "staging",
	}
	data := map[string]any{
		"rows": []map[string]any{
			{"assignment_id": "asg-0", "status": "open", "priority": "normal"},
			{"assignment_id": "asg-1", "status": "assigned", "priority": "normal"},
			{"assignment_id": "asg-2", "status": "in_progress", "priority": "high"},
			{"assignment_id": "asg-3", "status": "in_review", "priority": "normal"},
			{"assignment_id": "asg-4", "status": "changes_requested", "priority": "urgent"},
			{"assignment_id": "asg-5", "status": "assigned", "due_state": "overdue", "priority": "normal"},
			{"row_type": "family", "family_id": "fam-1"}, // Should be skipped
		},
	}

	cards := translationSSRQueueSummaryCards(input, data)

	if len(cards) != 5 {
		t.Fatalf("expected 5 summary cards, got %d", len(cards))
	}

	cardByKey := map[string]map[string]any{}
	for _, card := range cards {
		cardByKey[toString(card["key"])] = card
	}

	if got := toInt(cardByKey["total"]["count"]); got != 6 {
		t.Fatalf("expected total count 6 (skipping family row), got %d", got)
	}
	if got := toInt(cardByKey["active"]["count"]); got != 5 {
		t.Fatalf("expected active count 5 (open, assigned, in_progress, changes_requested), got %d", got)
	}
	if got := toInt(cardByKey["review"]["count"]); got != 1 {
		t.Fatalf("expected review count 1, got %d", got)
	}
	if got := toInt(cardByKey["overdue"]["count"]); got != 1 {
		t.Fatalf("expected overdue count 1, got %d", got)
	}
	if got := toInt(cardByKey["high_priority"]["count"]); got != 2 {
		t.Fatalf("expected high_priority count 2 (high and urgent), got %d", got)
	}
}

func TestTranslationSSRQueueSummaryCardsPreservesChannel(t *testing.T) {
	input := TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue?group_strategy=server_family",
		Channel:   "staging",
		Query: map[string]string{
			"family_id":    "fam-1",
			"locale":       "fr",
			"assignee_id":  "user-1",
			"due_state":    "soon",
			"priority":     "urgent",
			"review_state": "qa_blocked",
		},
	}
	data := map[string]any{"rows": []map[string]any{}}

	cards := translationSSRQueueSummaryCards(input, data)

	activeCard := cards[1]
	href := toString(activeCard["href"])
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if got := parsed.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected channel preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("group_strategy"); got != "server_family" {
		t.Fatalf("expected existing queue path query preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("family_id"); got != "fam-1" {
		t.Fatalf("expected family_id preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("locale"); got != "fr" {
		t.Fatalf("expected locale preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("assignee_id"); got != "user-1" {
		t.Fatalf("expected assignee_id preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("preset"); got != "open" {
		t.Fatalf("expected preset filter applied, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("status"); got != "open,assigned,in_progress,changes_requested" {
		t.Fatalf("expected expanded open preset status, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("sort"); got != "updated_at" {
		t.Fatalf("expected expanded open preset sort, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("order"); got != "desc" {
		t.Fatalf("expected expanded open preset order, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("due_state"); got != "" {
		t.Fatalf("expected preset card to clear conflicting due_state, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("priority"); got != "" {
		t.Fatalf("expected preset card to clear conflicting priority, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("review_state"); got != "" {
		t.Fatalf("expected standard preset card to clear review_state, got %q in %q", got, href)
	}
}

func TestTranslationSSRQueuePresetHrefPreservesExistingBaseQuery(t *testing.T) {
	href := translationSSRQueuePresetHref(TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue?group_strategy=server_family",
		Channel:   "staging",
	}, map[string]any{
		"id": "open",
		"query": map[string]any{
			"status": "open,assigned",
			"sort":   "updated_at",
			"order":  "desc",
		},
	})

	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	for key, want := range map[string]string{
		"group_strategy": "server_family",
		"channel":        "staging",
		"preset":         "open",
		"status":         "open,assigned",
		"sort":           "updated_at",
		"order":          "desc",
	} {
		if got := parsed.Query().Get(key); got != want {
			t.Fatalf("expected query %s=%q, got %q in %q", key, want, got, href)
		}
	}
	if strings.Count(href, "?") != 1 {
		t.Fatalf("expected exactly one query separator, got %q", href)
	}
}

func TestTranslationSSRQueueInputWithPresetExpandsQueryForPresenter(t *testing.T) {
	input := translationSSRQueueInputWithPreset(TranslationSSRPresenterInput{
		Query: map[string]string{
			"preset":    "overdue",
			"family_id": "fam-1",
		},
	})

	if got := input.Query["preset"]; got != "overdue" {
		t.Fatalf("expected preset preserved, got %q", got)
	}
	if got := input.Query["due_state"]; got != "overdue" {
		t.Fatalf("expected overdue preset due_state expansion, got %+v", input.Query)
	}
	if got := input.Query["sort"]; got != "due_date" {
		t.Fatalf("expected overdue preset sort expansion, got %+v", input.Query)
	}
	if got := input.Query["family_id"]; got != "fam-1" {
		t.Fatalf("expected explicit family_id preserved, got %+v", input.Query)
	}
}

func TestTranslationSSRFamilyQuickFiltersPreservesFilters(t *testing.T) {
	input := TranslationSSRPresenterInput{
		FamilyListPath: "/admin/translations/families",
		Channel:        "staging",
		Query: map[string]string{
			"family_id":       "family-1",
			"content_type":    "pages",
			"blocker_code":    "missing_locale",
			"missing_locale":  "fr",
			"readiness_state": "blocked",
		},
	}

	filters := translationSSRFamilyQuickFilters(input)

	if len(filters) != 4 {
		t.Fatalf("expected 4 quick filters (all, blocked, missing, ready), got %d", len(filters))
	}

	blockedFilter := filters[1]
	if got := toString(blockedFilter["key"]); got != "blocked" {
		t.Fatalf("expected blocked filter key, got %q", got)
	}

	href := toString(blockedFilter["href"])
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if got := parsed.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected channel preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("family_id"); got != "family-1" {
		t.Fatalf("expected family_id preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("content_type"); got != "pages" {
		t.Fatalf("expected content_type preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("blocker_code"); got != "missing_locale" {
		t.Fatalf("expected blocker_code preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("missing_locale"); got != "fr" {
		t.Fatalf("expected missing_locale preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("readiness_state"); got != "blocked" {
		t.Fatalf("expected readiness_state replaced with filter value, got %q in %q", got, href)
	}
}

func TestTranslationSSRQueueQuickFiltersTracksActiveState(t *testing.T) {
	input := TranslationSSRPresenterInput{
		QueuePath: "/admin/translations/queue",
		Channel:   "staging",
		Query: map[string]string{
			"status":       "in_progress",
			"family_id":    "fam-1",
			"locale":       "fr",
			"due_state":    "soon",
			"review_state": "qa_blocked",
			"priority":     "high",
			"assignee_id":  "user-1",
			"reviewer_id":  "reviewer-1",
		},
	}

	filters := translationSSRQueueQuickFilters(input)

	if len(filters) != 5 {
		t.Fatalf("expected 5 quick filters, got %d", len(filters))
	}

	activeFilter := map[string]bool{}
	for _, filter := range filters {
		if toBool(filter["active"]) {
			activeFilter[toString(filter["key"])] = true
		}
	}

	if activeFilter["all"] {
		t.Fatalf("expected all filter to be inactive when status is set")
	}
	if !activeFilter["in_progress"] {
		t.Fatalf("expected in_progress filter to be active")
	}

	href := toString(filters[2]["href"])
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if got := parsed.Query().Get("family_id"); got != "fam-1" {
		t.Fatalf("expected family_id preserved, got %q in %q", got, href)
	}
	if got := parsed.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected channel preserved, got %q in %q", got, href)
	}
	for key, want := range map[string]string{
		"locale":       "fr",
		"due_state":    "soon",
		"review_state": "qa_blocked",
		"priority":     "high",
		"assignee_id":  "user-1",
		"reviewer_id":  "reviewer-1",
	} {
		if got := parsed.Query().Get(key); got != want {
			t.Fatalf("expected %s preserved as %q, got %q in %q", key, want, got, href)
		}
	}
}

func TestTranslationSSRPreserveFilterQueryReturnsNilWhenEmpty(t *testing.T) {
	if got := translationSSRPreserveFilterQuery(nil, "key1"); got != nil {
		t.Fatalf("expected nil for nil query, got %+v", got)
	}
	if got := translationSSRPreserveFilterQuery(map[string]string{}, "key1"); got != nil {
		t.Fatalf("expected nil for empty query, got %+v", got)
	}
	if got := translationSSRPreserveFilterQuery(map[string]string{"key1": "value1"}); got != nil {
		t.Fatalf("expected nil for no keys, got %+v", got)
	}
	if got := translationSSRPreserveFilterQuery(map[string]string{"key1": "value1"}, "key2"); got != nil {
		t.Fatalf("expected nil for non-matching keys, got %+v", got)
	}
}

func TestTranslationSSRPreserveFilterQueryExtractsRequestedKeys(t *testing.T) {
	query := map[string]string{
		"key1": "value1",
		"key2": "value2",
		"key3": "value3",
	}

	result := translationSSRPreserveFilterQuery(query, "key1", "key3", "key4")

	if len(result) != 2 {
		t.Fatalf("expected 2 preserved keys, got %+v", result)
	}
	if result["key1"] != "value1" {
		t.Fatalf("expected key1=value1, got %+v", result)
	}
	if result["key3"] != "value3" {
		t.Fatalf("expected key3=value3, got %+v", result)
	}
}

func TestTranslationSSRMatrixEnhancementPreservesLocaleViewport(t *testing.T) {
	input := TranslationSSRPresenterInput{
		APIBasePath:   "/admin/api",
		BasePath:      "/admin",
		MatrixPath:    "/admin/translations/matrix",
		MatrixAPIPath: "/admin/api/translations/matrix",
		Channel:       "production",
		Query: map[string]string{
			"channel":         "production",
			"family_id":       "tg-page-1",
			"readiness_state": "blocked",
			"locales":         "fr,de",
			"locale_offset":   "10",
			"locale_limit":    "5",
			"content_type":    "pages",
		},
	}
	meta := map[string]any{
		"locale_offset":        10,
		"locale_limit":         5,
		"quick_action_targets": map[string]any{"create_missing": map[string]any{"endpoint": "/admin/api/translations/matrix/actions/create-missing"}},
	}

	enhancement := translationSSRMatrixEnhancement(input, meta)
	if got := toString(enhancement["api_path"]); got != "/admin/api/translations/matrix" {
		t.Fatalf("expected matrix API path, got %q", got)
	}
	query := extractMap(enhancement["query"])
	for _, key := range []string{"family_id", "locales", "locale_offset", "locale_limit", "content_type"} {
		if query[key] == "" {
			t.Fatalf("expected query key %q to be preserved, got %+v", key, query)
		}
	}
	if toInt(enhancement["locale_offset"]) != 10 || toInt(enhancement["locale_limit"]) != 5 {
		t.Fatalf("expected locale viewport metadata, got %+v", enhancement)
	}
	links := translationSSRMatrixLinks(input)
	allHref := toString(links["matrix_all"])
	parsedAll, err := url.Parse(allHref)
	if err != nil {
		t.Fatalf("parse matrix all href %q: %v", allHref, err)
	}
	if got := parsedAll.Query().Get("readiness_state"); got != "" {
		t.Fatalf("expected all matrix link to clear readiness_state, got %q in %q", got, allHref)
	}
	if got := parsedAll.Query().Get("locales"); got != "fr,de" {
		t.Fatalf("expected all matrix link to preserve locales, got %q in %q", got, allHref)
	}
	readyHref := toString(links["matrix_ready"])
	parsedReady, err := url.Parse(readyHref)
	if err != nil {
		t.Fatalf("parse matrix ready href %q: %v", readyHref, err)
	}
	if got := parsedReady.Query().Get("readiness_state"); got != "ready" {
		t.Fatalf("expected ready matrix link to set readiness_state, got %q in %q", got, readyHref)
	}
	preserved, ok := links["preserve_query"].(map[string]string)
	if !ok {
		t.Fatalf("expected preserve_query link metadata, got %T: %+v", links["preserve_query"], links["preserve_query"])
	}
	for _, key := range []string{"locales", "locale_offset", "locale_limit"} {
		if preserved[key] == "" {
			t.Fatalf("expected preserved query key %q, got %+v", key, preserved)
		}
	}
}

func TestTranslationSSRExchangeEnhancementUsesExplicitExamplePolicy(t *testing.T) {
	input := TranslationSSRPresenterInput{
		APIBasePath:     "/admin/api",
		BasePath:        "/admin",
		ExchangeAPIPath: "/admin/api/translations/exchange",
	}
	enhancement := translationSSRExchangeEnhancement(input)
	if enhancement["include_examples"] == true {
		t.Fatalf("expected examples to be disabled by default, got %+v", enhancement)
	}
	policy := translationSSRExchangeHistoryPolicy(input)
	if got := toString(policy["source"]); got != "runtime" {
		t.Fatalf("expected runtime history source by default, got %q", got)
	}

	enabled := true
	input.ExchangeUIConfig.IncludeExamples = &enabled
	enhancement = translationSSRExchangeEnhancement(input)
	if enhancement["include_examples"] != true {
		t.Fatalf("expected configured examples to be enabled, got %+v", enhancement)
	}
	policy = translationSSRExchangeHistoryPolicy(input)
	if got := toString(policy["source"]); got != "runtime_plus_examples" {
		t.Fatalf("expected runtime_plus_examples source, got %q", got)
	}

	input.ExchangeUIConfig.IncludeExamples = nil
	input.Query = map[string]string{"include_examples": "true"}
	if !translationSSRExchangeIncludeExamples(input) {
		t.Fatalf("expected include_examples query to explicitly enable examples")
	}
}

func TestTranslationSSRExchangeTemplateUsesConfigAndFallbacks(t *testing.T) {
	input := TranslationSSRPresenterInput{
		ExchangeAPIPath: "/admin/api/translations/exchange",
		ExchangeUIConfig: TranslationExchangeUIConfig{
			Template: TranslationExchangeTemplateOption{
				Label:    "Download Package Template",
				Format:   "csv",
				Filename: "handoff.csv",
			},
		},
	}

	template := translationSSRExchangeTemplate(input)
	if got := toString(template["label"]); got != "Download Package Template" {
		t.Fatalf("expected configured template label, got %q", got)
	}
	if got := toString(template["href"]); got != "/admin/api/translations/exchange/template?format=csv" {
		t.Fatalf("expected fallback template href with configured format, got %q", got)
	}
	if got := toString(template["filename"]); got != "handoff.csv" {
		t.Fatalf("expected configured filename, got %q", got)
	}
}

func TestTranslationSSRExchangeConfigDecorationsAndActionAliases(t *testing.T) {
	enabled := true
	allowOverride := true
	dryRun := true
	config := TranslationExchangeUIConfig{
		Configured:           true,
		SourceLocale:         "en",
		SourceLocales:        []TranslationExchangeLocaleOption{{Code: "en", Label: "English"}},
		TargetLocales:        []TranslationExchangeLocaleOption{{Code: "es", Label: "Spanish"}, {Code: "fr", Label: "French"}},
		Resources:            []TranslationExchangeResourceOption{{ID: "pages", Label: "Pages"}, {ID: "posts", Label: "Posts"}},
		DefaultResources:     []string{"pages"},
		DefaultTargetLocales: []string{"fr"},
		IncludeSourceHash:    &enabled,
		Apply: TranslationExchangeApplyDefaults{
			AllowSourceHashOverride: &allowOverride,
			DryRun:                  &dryRun,
		},
	}

	resources := translationSSRExchangeResourceOptions(config)
	if len(resources) != 2 || toString(resources[0]["id"]) != "pages" || resources[0]["selected"] != true {
		t.Fatalf("expected configured resource options with selected defaults, got %+v", resources)
	}
	sourceLocales := translationSSRExchangeSourceLocaleOptions(config)
	if len(sourceLocales) != 1 || sourceLocales[0]["selected"] != true {
		t.Fatalf("expected configured source locale to be selected, got %+v", sourceLocales)
	}
	targetLocales := translationSSRExchangeTargetLocaleOptions(config)
	if len(targetLocales) != 2 || targetLocales[0]["selected"] == true || targetLocales[1]["selected"] != true {
		t.Fatalf("expected configured target locale defaults, got %+v", targetLocales)
	}
	applyDefaults := translationSSRExchangeApplyDefaults(config)
	if applyDefaults["include_source_hash"] != true || applyDefaults["allow_source_hash_override"] != true || applyDefaults["dry_run"] != true {
		t.Fatalf("expected configured apply defaults, got %+v", applyDefaults)
	}
	if applyDefaults["allow_create_missing"] != false || applyDefaults["continue_on_error"] != true {
		t.Fatalf("expected fallback apply defaults, got %+v", applyDefaults)
	}

	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureTranslationExchange),
	})
	adm.WithAuthorizer(translationPermissionAuthorizer{
		allowed: map[string]bool{
			translationExchangePermissionExport:         true,
			translationExchangePermissionImportValidate: true,
		},
	})
	actions := translationSSRExchangeActions(adm, nil)
	if extractMap(actions["export"])["enabled"] != extractMap(actions["export_action"])["enabled"] {
		t.Fatalf("expected export_action alias to mirror export action, got %+v", actions)
	}
	if extractMap(actions["import_validate"])["enabled"] != extractMap(actions["import_validate_action"])["enabled"] {
		t.Fatalf("expected import_validate_action alias to mirror import_validate action, got %+v", actions)
	}
	if extractMap(actions["import_apply"])["enabled"] != extractMap(actions["import_apply_action"])["enabled"] {
		t.Fatalf("expected import_apply_action alias to mirror import_apply action, got %+v", actions)
	}
}

func TestTranslationSSRSummaryCardHrefBuildsCorrectURL(t *testing.T) {
	href := translationSSRSummaryCardHref(
		"/admin/translations/families",
		"staging",
		map[string]string{"content_type": "pages"},
		"readiness_state",
		"blocked",
	)

	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if got := parsed.Path; got != "/admin/translations/families" {
		t.Fatalf("expected base path, got %q", got)
	}
	if got := parsed.Query().Get("channel"); got != "staging" {
		t.Fatalf("expected channel, got %q", got)
	}
	if got := parsed.Query().Get("content_type"); got != "pages" {
		t.Fatalf("expected preserved content_type, got %q", got)
	}
	if got := parsed.Query().Get("readiness_state"); got != "blocked" {
		t.Fatalf("expected filter readiness_state, got %q", got)
	}
}

func TestTranslationSSRSummaryCardHrefOmitsEmptyValues(t *testing.T) {
	href := translationSSRSummaryCardHref("/admin/path", "", nil, "", "")

	if href != "/admin/path" {
		t.Fatalf("expected clean path without query string, got %q", href)
	}
}

func TestTranslationSSRSummaryCardHrefPreservesExistingBaseQuery(t *testing.T) {
	href := translationSSRSummaryCardHref(
		"/admin/translations/queue?review_state=needs_review",
		"staging",
		map[string]string{"family_id": "fam-1"},
		"preset",
		"open",
	)

	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	for key, want := range map[string]string{
		"review_state": "needs_review",
		"channel":      "staging",
		"family_id":    "fam-1",
		"preset":       "open",
	} {
		if got := parsed.Query().Get(key); got != want {
			t.Fatalf("expected query %s=%q, got %q in %q", key, want, got, href)
		}
	}
	if strings.Count(href, "?") != 1 {
		t.Fatalf("expected exactly one query separator, got %q", href)
	}
}
