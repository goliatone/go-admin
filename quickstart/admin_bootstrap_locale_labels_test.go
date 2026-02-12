package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestCreateTranslationLocaleLabelUsesCLDREnglishDisplayNames(t *testing.T) {
	if got := createTranslationLocaleLabel("es", nil); got != "Spanish" {
		t.Fatalf("expected Spanish label for es, got %q", got)
	}
	if got := createTranslationLocaleLabel("pt-br", nil); got != "Brazilian Portuguese" {
		t.Fatalf("expected Brazilian Portuguese label for pt-br, got %q", got)
	}
}

func TestCreateTranslationLocaleLabelUsesConfiguredOverrides(t *testing.T) {
	labels := normalizeTranslationLocaleLabels(map[string]string{
		" PT-BR ": "Portuguese (Brazil)",
	})
	if got := createTranslationLocaleLabel("pt-br", labels); got != "Portuguese (Brazil)" {
		t.Fatalf("expected configured pt-br label, got %q", got)
	}
}

func TestWithTranslationLocaleLabelsNormalizesKeysAndValues(t *testing.T) {
	opts := &adminOptions{}
	WithTranslationLocaleLabels(map[string]string{
		" PT-BR ": " Portuguese (Brazil) ",
		"":        "ignored",
		"de":      "",
	})(opts)

	if opts.translationLocaleLabels["pt-br"] != "Portuguese (Brazil)" {
		t.Fatalf("expected normalized locale labels, got %+v", opts.translationLocaleLabels)
	}
	if _, ok := opts.translationLocaleLabels[""]; ok {
		t.Fatalf("expected blank locale labels to be removed, got %+v", opts.translationLocaleLabels)
	}
	if _, ok := opts.translationLocaleLabels["de"]; ok {
		t.Fatalf("expected blank label values to be removed, got %+v", opts.translationLocaleLabels)
	}
}

func TestConfigureCreateTranslationActionLocaleSchemaUsesConfiguredLabels(t *testing.T) {
	action := admin.Action{
		Name: admin.CreateTranslationKey,
		PayloadSchema: map[string]any{
			"type": "object",
		},
	}
	locales := []string{"en", "pt-br"}
	labels := map[string]string{"pt-br": "Portuguese (Brazil)"}

	updated := configureCreateTranslationActionLocaleSchema(action, locales, labels)
	properties, _ := updated.PayloadSchema["properties"].(map[string]any)
	localeSchema, _ := properties["locale"].(map[string]any)
	options := optionLabelsByValue(localeSchema["x-options"])

	if options["en"] != "English" {
		t.Fatalf("expected English label for en, got %+v", options)
	}
	if options["pt-br"] != "Portuguese (Brazil)" {
		t.Fatalf("expected configured label for pt-br, got %+v", options)
	}
}

func optionLabelsByValue(value any) map[string]string {
	out := map[string]string{}
	rawOptions, ok := value.([]map[string]any)
	if !ok {
		return out
	}
	for _, option := range rawOptions {
		optionValue, _ := option["value"].(string)
		optionLabel, _ := option["label"].(string)
		if optionValue == "" {
			continue
		}
		out[optionValue] = optionLabel
	}
	return out
}
