package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type templateTranslatorStub struct {
	values      map[string]string
	countValues map[string]string
}

func (s templateTranslatorStub) Translate(locale, key string, args ...any) (string, error) {
	if value, ok := s.values[locale+":"+key]; ok {
		return value, nil
	}
	return key, nil
}

func (s templateTranslatorStub) TranslateCount(locale, key string, count int, args ...any) (string, error) {
	if value, ok := s.countValues[locale+":"+key+":"+templateTranslateCountKey(count)]; ok {
		return value, nil
	}
	return key, nil
}

func templateTranslateCountKey(count int) string {
	if count < 0 {
		return "neg"
	}
	return anyToString(count)
}

func TestDefaultTemplateFuncsExposeTranslationHelpers(t *testing.T) {
	funcs := DefaultTemplateFuncs(
		WithTemplateTranslator(templateTranslatorStub{
			values: map[string]string{
				"en:menu.home": "Home",
				"es:menu.home": "Inicio",
			},
			countValues: map[string]string{
				"es:items.count:2": "2 articulos",
			},
		}),
		WithTemplateDefaultLocale("en"),
	)

	translate, ok := funcs["translate"].(func(...any) string)
	if !ok {
		t.Fatalf("expected translate helper, got %T", funcs["translate"])
	}
	translateCount, ok := funcs["translate_count"].(func(...any) string)
	if !ok {
		t.Fatalf("expected translate_count helper, got %T", funcs["translate_count"])
	}
	currentLocale, ok := funcs["current_locale"].(func(...any) string)
	if !ok {
		t.Fatalf("expected current_locale helper, got %T", funcs["current_locale"])
	}

	if got := translate("menu.home"); got != "Home" {
		t.Fatalf("expected default-locale translation Home, got %q", got)
	}
	if got := translate(map[string]any{"resolved_locale": "es"}, "menu.home"); got != "Inicio" {
		t.Fatalf("expected request-locale translation Inicio, got %q", got)
	}
	if got := translateCount(map[string]any{"locale": "es"}, "items.count", 2); got != "2 articulos" {
		t.Fatalf("expected translated pluralized value, got %q", got)
	}
	if got := currentLocale(map[string]any{"site_runtime": map[string]any{"locale": "bo"}}); got != "bo" {
		t.Fatalf("expected current locale bo, got %q", got)
	}
}

func TestDefaultTemplateFuncsTranslationHelpersDegradeSafelyWithoutTranslator(t *testing.T) {
	funcs := DefaultTemplateFuncs(WithTemplateDefaultLocale("en"))

	translate := funcs["translate"].(func(...any) string)
	currentLocale := funcs["current_locale"].(func(...any) string)

	if got := translate("menu.home"); got != "menu.home" {
		t.Fatalf("expected raw key fallback without translator, got %q", got)
	}
	if got := currentLocale(); got != "en" {
		t.Fatalf("expected default current locale en, got %q", got)
	}
}

func TestDefaultTemplateFuncsTreatBareShortStringsAsKeys(t *testing.T) {
	funcs := DefaultTemplateFuncs(
		WithTemplateTranslator(templateTranslatorStub{
			values: map[string]string{
				"en:seo": "SEO",
			},
			countValues: map[string]string{
				"en:qty:2": "2 items",
			},
		}),
		WithTemplateDefaultLocale("en"),
	)

	translate := funcs["translate"].(func(...any) string)
	translateCount := funcs["translate_count"].(func(...any) string)

	if got := translate("seo"); got != "SEO" {
		t.Fatalf("expected bare short key to resolve as translation key, got %q", got)
	}
	if got := translateCount("qty", 2); got != "2 items" {
		t.Fatalf("expected bare short count key to resolve as translation key, got %q", got)
	}
}

func TestTemplateLocaleFromSubjectRecognizesViewContextMaps(t *testing.T) {
	locale, ok := templateLocaleFromSubject(map[string]any{
		"site_runtime": map[string]any{"locale": "es"},
	}, "en")
	if !ok || locale != "es" {
		t.Fatalf("expected locale es from site runtime map, got %q ok=%v", locale, ok)
	}
}

var _ admin.CountTranslator = templateTranslatorStub{}
