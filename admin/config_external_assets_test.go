package admin

import (
	"errors"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

func TestExternalAssetConfigValidate(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		value   string
		wantErr bool
	}{
		{name: "empty uses packaged default"},
		{name: "origin relative", value: "/admin/assets/vendor/iconoir.css"},
		{name: "path relative", value: "assets/vendor/iconoir.css?v=1"},
		{name: "https absolute", value: "https://assets.example.com/iconoir.css"},
		{name: "http absolute", value: "http://localhost:3000/iconoir.css"},
		{name: "javascript scheme", value: "javascript:alert(1)", wantErr: true},
		{name: "data scheme", value: "data:text/css,body{}", wantErr: true},
		{name: "scheme relative", value: "//assets.example.com/iconoir.css", wantErr: true},
		{name: "fragment only", value: "#iconoir", wantErr: true},
		{name: "credentials", value: "https://user:secret@assets.example.com/iconoir.css", wantErr: true},
		{name: "backslash", value: `https:\assets.example.com\iconoir.css`, wantErr: true},
		{name: "control character", value: "https://assets.example.com/iconoir.css\nscript", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := (ExternalAssetConfig{IconoirCSS: tt.value}).Validate()
			if tt.wantErr && err == nil {
				t.Fatal("Validate() error = nil, want error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("Validate() error = %v, want nil", err)
			}
		})
	}
}

func TestValidateConfigRejectsUnsafeExternalAssetOverride(t *testing.T) {
	t.Parallel()

	adm := mustNewAdmin(t, Config{
		ExternalAssets: ExternalAssetConfig{EChartsJS: "javascript:alert(1)"},
	}, Dependencies{})

	err := adm.validateConfig()
	if err == nil {
		t.Fatal("validateConfig() error = nil, want error")
	}
	var domainErr *goerrors.Error
	if !errors.As(err, &domainErr) {
		t.Fatalf("validateConfig() error = %T, want *goerrors.Error", err)
	}
	if domainErr.TextCode != TextCodeValidationError {
		t.Fatalf("validateConfig() text code = %q, want %q", domainErr.TextCode, TextCodeValidationError)
	}
}
