package contracts

import "testing"

func TestContentListOptionsExposeCanonicalTokens(t *testing.T) {
	if WithTranslations() != ContentListWithTranslations {
		t.Fatalf("expected translations token %q, got %q", ContentListWithTranslations, WithTranslations())
	}
	if WithDerivedFields() != ContentListWithDerivedFields {
		t.Fatalf("expected derived-fields token %q, got %q", ContentListWithDerivedFields, WithDerivedFields())
	}
}
