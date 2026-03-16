package admin

import "testing"

func TestWithTranslationDatagridRecordPreservesFamilyChannelScope(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})

	record := map[string]any{
		"id":                   "page_123",
		"translation_group_id": "tg-page-123",
	}
	mapped := withTranslationDatagridRecord(adm, "staging", record)

	if got := toString(mapped["translation_family_url"]); got != "/admin/translations/families/tg-page-123?channel=staging" {
		t.Fatalf("expected channel-scoped translation_family_url, got %q", got)
	}
}

func TestWithTranslationDatagridRecordOmitsChannelWhenUnset(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})

	record := map[string]any{
		"id":                   "page_123",
		"translation_group_id": "tg-page-123",
	}
	mapped := withTranslationDatagridRecord(adm, "", record)

	if got := toString(mapped["translation_family_url"]); got != "/admin/translations/families/tg-page-123" {
		t.Fatalf("expected base translation_family_url without channel, got %q", got)
	}
}
