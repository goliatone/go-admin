package handlers

import (
	"testing"

	urlkit "github.com/goliatone/go-urlkit"
)

func TestBuildRouteSetUsesResolverNamespaces(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/suite",
				Routes: map[string]string{
					"dashboard": "/",
				},
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Groups: []urlkit.GroupConfig{
							{
								Name: "v9",
								Path: "/v9",
								Routes: map[string]string{
									"errors": "/errors",
								},
							},
						},
					},
				},
			},
			{
				Name: "public",
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Groups: []urlkit.GroupConfig{
							{
								Name: "v3",
								Path: "/v3",
								Routes: map[string]string{
									"preview": "/preview/:token",
								},
							},
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	routes := BuildRouteSet(manager, "/admin-fallback", "admin.api.v9")

	if routes.AdminHome != "/suite/esign" {
		t.Fatalf("expected admin home /suite/esign, got %q", routes.AdminHome)
	}
	if routes.AdminStatus != "/suite/esign/status" {
		t.Fatalf("expected admin status route /suite/esign/status, got %q", routes.AdminStatus)
	}
	if routes.AdminAPIStatus != "/suite/api/v9/esign/status" {
		t.Fatalf("expected admin api route /suite/api/v9/esign/status, got %q", routes.AdminAPIStatus)
	}
	if routes.AdminAgreementsStats != "/suite/api/v9/esign/agreements/stats" {
		t.Fatalf("expected admin agreement stats route /suite/api/v9/esign/agreements/stats, got %q", routes.AdminAgreementsStats)
	}
	if routes.AdminDocumentsUpload != "/suite/api/v9/esign/documents/upload" {
		t.Fatalf("expected admin document upload route /suite/api/v9/esign/documents/upload, got %q", routes.AdminDocumentsUpload)
	}
	if routes.SignerSession != "/api/v1/esign/signing/session/:token" {
		t.Fatalf("expected signer route fallback /api/v1/esign/signing/session/:token, got %q", routes.SignerSession)
	}
	if routes.SignerFieldValues != "/api/v1/esign/signing/field-values/:token" {
		t.Fatalf("expected signer field-values route fallback /api/v1/esign/signing/field-values/:token, got %q", routes.SignerFieldValues)
	}
	if routes.SignerSignature != "/api/v1/esign/signing/field-values/signature/:token" {
		t.Fatalf("expected signer signature route fallback /api/v1/esign/signing/field-values/signature/:token, got %q", routes.SignerSignature)
	}
	if routes.SignerSignatureUpload != "/api/v1/esign/signing/signature-upload/:token" {
		t.Fatalf("expected signer signature-upload route fallback /api/v1/esign/signing/signature-upload/:token, got %q", routes.SignerSignatureUpload)
	}
	if routes.SignerSignatureObject != "/api/v1/esign/signing/signature-upload/object" {
		t.Fatalf("expected signer signature-upload object route fallback /api/v1/esign/signing/signature-upload/object, got %q", routes.SignerSignatureObject)
	}
	if routes.SignerTelemetry != "/api/v1/esign/signing/telemetry/:token" {
		t.Fatalf("expected signer telemetry route fallback /api/v1/esign/signing/telemetry/:token, got %q", routes.SignerTelemetry)
	}
	if routes.SignerSubmit != "/api/v1/esign/signing/submit/:token" {
		t.Fatalf("expected signer submit route fallback /api/v1/esign/signing/submit/:token, got %q", routes.SignerSubmit)
	}
	if routes.SignerDecline != "/api/v1/esign/signing/decline/:token" {
		t.Fatalf("expected signer decline route fallback /api/v1/esign/signing/decline/:token, got %q", routes.SignerDecline)
	}
	if routes.SignerAssets != "/api/v1/esign/signing/assets/:token" {
		t.Fatalf("expected signer assets route fallback /api/v1/esign/signing/assets/:token, got %q", routes.SignerAssets)
	}
	if routes.AdminGoogleOAuthStatus != "/suite/api/v9/esign/integrations/google/status" {
		t.Fatalf("expected google oauth status route /suite/api/v9/esign/integrations/google/status, got %q", routes.AdminGoogleOAuthStatus)
	}
	if routes.AdminGoogleOAuthRotate != "/suite/api/v9/esign/integrations/google/rotate-credentials" {
		t.Fatalf("expected google oauth rotate route /suite/api/v9/esign/integrations/google/rotate-credentials, got %q", routes.AdminGoogleOAuthRotate)
	}
	if routes.AdminGoogleDriveImport != "/suite/api/v9/esign/google-drive/import" {
		t.Fatalf("expected google import route /suite/api/v9/esign/google-drive/import, got %q", routes.AdminGoogleDriveImport)
	}
}

func TestBuildRouteSetFallbacksWhenResolverMissing(t *testing.T) {
	routes := BuildRouteSet(nil, "/admin", "admin.api.v1")

	if routes.AdminHome != "/admin/esign" {
		t.Fatalf("expected /admin/esign, got %q", routes.AdminHome)
	}
	if routes.AdminStatus != "/admin/esign/status" {
		t.Fatalf("expected /admin/esign/status, got %q", routes.AdminStatus)
	}
	if routes.AdminAPIStatus != "/admin/api/v1/esign/status" {
		t.Fatalf("expected /admin/api/v1/esign/status, got %q", routes.AdminAPIStatus)
	}
	if routes.AdminAgreementsStats != "/admin/api/v1/esign/agreements/stats" {
		t.Fatalf("expected /admin/api/v1/esign/agreements/stats, got %q", routes.AdminAgreementsStats)
	}
	if routes.AdminDocumentsUpload != "/admin/api/v1/esign/documents/upload" {
		t.Fatalf("expected /admin/api/v1/esign/documents/upload, got %q", routes.AdminDocumentsUpload)
	}
	if routes.SignerSession != "/api/v1/esign/signing/session/:token" {
		t.Fatalf("expected /api/v1/esign/signing/session/:token, got %q", routes.SignerSession)
	}
	if routes.SignerFieldValues != "/api/v1/esign/signing/field-values/:token" {
		t.Fatalf("expected /api/v1/esign/signing/field-values/:token, got %q", routes.SignerFieldValues)
	}
	if routes.SignerSignature != "/api/v1/esign/signing/field-values/signature/:token" {
		t.Fatalf("expected /api/v1/esign/signing/field-values/signature/:token, got %q", routes.SignerSignature)
	}
	if routes.SignerSignatureUpload != "/api/v1/esign/signing/signature-upload/:token" {
		t.Fatalf("expected /api/v1/esign/signing/signature-upload/:token, got %q", routes.SignerSignatureUpload)
	}
	if routes.SignerSignatureObject != "/api/v1/esign/signing/signature-upload/object" {
		t.Fatalf("expected /api/v1/esign/signing/signature-upload/object, got %q", routes.SignerSignatureObject)
	}
	if routes.SignerTelemetry != "/api/v1/esign/signing/telemetry/:token" {
		t.Fatalf("expected /api/v1/esign/signing/telemetry/:token, got %q", routes.SignerTelemetry)
	}
	if routes.SignerSubmit != "/api/v1/esign/signing/submit/:token" {
		t.Fatalf("expected /api/v1/esign/signing/submit/:token, got %q", routes.SignerSubmit)
	}
	if routes.SignerDecline != "/api/v1/esign/signing/decline/:token" {
		t.Fatalf("expected /api/v1/esign/signing/decline/:token, got %q", routes.SignerDecline)
	}
	if routes.SignerAssets != "/api/v1/esign/signing/assets/:token" {
		t.Fatalf("expected /api/v1/esign/signing/assets/:token, got %q", routes.SignerAssets)
	}
	if routes.AdminGoogleOAuthConnect != "/admin/api/v1/esign/integrations/google/connect" {
		t.Fatalf("expected /admin/api/v1/esign/integrations/google/connect, got %q", routes.AdminGoogleOAuthConnect)
	}
	if routes.AdminGoogleDriveSearch != "/admin/api/v1/esign/google-drive/search" {
		t.Fatalf("expected /admin/api/v1/esign/google-drive/search, got %q", routes.AdminGoogleDriveSearch)
	}
	if routes.AdminGoogleOAuthRotate != "/admin/api/v1/esign/integrations/google/rotate-credentials" {
		t.Fatalf("expected /admin/api/v1/esign/integrations/google/rotate-credentials, got %q", routes.AdminGoogleOAuthRotate)
	}
}
