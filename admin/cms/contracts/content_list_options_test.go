package contracts

import "testing"

func TestContentListOptionsExposeCanonicalTokens(t *testing.T) {
	if WithTranslations() != ContentListWithTranslations {
		t.Fatalf("expected translations token %q, got %q", ContentListWithTranslations, WithTranslations())
	}
	if WithDerivedFields() != ContentListWithDerivedFields {
		t.Fatalf("expected derived-fields token %q, got %q", ContentListWithDerivedFields, WithDerivedFields())
	}
	if WithLocaleVariants() != ContentListWithLocaleVariants {
		t.Fatalf("expected locale-variants token %q, got %q", ContentListWithLocaleVariants, WithLocaleVariants())
	}
	const id = "00000000-0000-0000-0000-000000000123"
	expected := CMSContentListOption("content:list:content_type:" + id)
	if WithContentTypeID(id) != expected {
		t.Fatalf("expected content type token %q, got %q", expected, WithContentTypeID(id))
	}
}
