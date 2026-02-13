package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	authlib "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestParseCSVImport_NormalizesRecords(t *testing.T) {
	csvPayload := strings.Join([]string{
		"email,username,role,app_role,status,metadata",
		" alice@example.com , alice , admin , superadmin , active , {\"source\":\"bulk\"}",
		",missing,,,,",
	}, "\n")

	outcome, err := parseCSVImport(strings.NewReader(csvPayload))
	if err != nil {
		t.Fatalf("parseCSVImport error: %v", err)
	}

	if outcome.Processed != 2 {
		t.Fatalf("processed=%d, want 2", outcome.Processed)
	}
	if len(outcome.Users) != 1 {
		t.Fatalf("users=%d, want 1", len(outcome.Users))
	}
	if len(outcome.Results) != 1 {
		t.Fatalf("results=%d, want 1", len(outcome.Results))
	}

	user := outcome.Users[0]
	if user.Email != "alice@example.com" {
		t.Fatalf("email=%q, want %q", user.Email, "alice@example.com")
	}
	if user.Username != "alice" {
		t.Fatalf("username=%q, want %q", user.Username, "alice")
	}
	if user.Role != "admin" {
		t.Fatalf("role=%q, want %q", user.Role, "admin")
	}
	if user.Status != userstypes.LifecycleStateActive {
		t.Fatalf("status=%q, want %q", user.Status, userstypes.LifecycleStateActive)
	}
	if user.Metadata == nil {
		t.Fatal("metadata is nil")
	}
	if user.Metadata[appRoleMetadataKey] != "superadmin" {
		t.Fatalf("app_role=%v, want %q", user.Metadata[appRoleMetadataKey], "superadmin")
	}
	if user.Metadata["source"] != "bulk" {
		t.Fatalf("metadata.source=%v, want %q", user.Metadata["source"], "bulk")
	}

	if outcome.Results[0].Error != "email is required" {
		t.Fatalf("result error=%q, want %q", outcome.Results[0].Error, "email is required")
	}
	if outcome.Results[0].Index != 1 {
		t.Fatalf("result index=%d, want 1", outcome.Results[0].Index)
	}
}

func TestParseJSONImport_NormalizesRecords(t *testing.T) {
	payload := `[{"email":"bob@example.com","username":"bob","role":"member","app_role":"editor","status":"pending","metadata":{"team":"ops"}}, "bad"]`
	outcome, err := parseJSONImport(strings.NewReader(payload))
	if err != nil {
		t.Fatalf("parseJSONImport error: %v", err)
	}

	if outcome.Processed != 2 {
		t.Fatalf("processed=%d, want 2", outcome.Processed)
	}
	if len(outcome.Users) != 1 {
		t.Fatalf("users=%d, want 1", len(outcome.Users))
	}
	if len(outcome.Results) != 1 {
		t.Fatalf("results=%d, want 1", len(outcome.Results))
	}

	user := outcome.Users[0]
	if user.Email != "bob@example.com" {
		t.Fatalf("email=%q, want %q", user.Email, "bob@example.com")
	}
	if user.Status != userstypes.LifecycleStatePending {
		t.Fatalf("status=%q, want %q", user.Status, userstypes.LifecycleStatePending)
	}
	if user.Metadata == nil {
		t.Fatal("metadata is nil")
	}
	if user.Metadata[appRoleMetadataKey] != "editor" {
		t.Fatalf("app_role=%v, want %q", user.Metadata[appRoleMetadataKey], "editor")
	}
	if user.Metadata["team"] != "ops" {
		t.Fatalf("metadata.team=%v, want %q", user.Metadata["team"], "ops")
	}

	if outcome.Results[0].Error != "record must be an object" {
		t.Fatalf("result error=%q, want %q", outcome.Results[0].Error, "record must be an object")
	}
}

func TestImportUsersHandler_PermissionDenied(t *testing.T) {
	app := newImportTestApp(t, newTestClaims(t, "guest"), rejectAuthorizer{})

	req := httptest.NewRequest(http.MethodPost, "/admin/api/users-import", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusForbidden)
	}
}

func TestImportUsersHandler_MissingOrInvalidFile(t *testing.T) {
	app := newImportTestApp(t, newTestClaims(t, "admin"), allowAuthorizer{})

	t.Run("missing file", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/admin/api/users-import", nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusBadRequest)
		}
		payload := decodeBulkImportResponse(t, resp)
		if payload.Error != "file required" {
			t.Fatalf("error=%q, want %q", payload.Error, "file required")
		}
	})

	t.Run("invalid file type", func(t *testing.T) {
		body, contentType := buildMultipartFile(t, "users.txt", "text/plain", []byte("noop"))
		req := httptest.NewRequest(http.MethodPost, "/admin/api/users-import", body)
		req.Header.Set("Content-Type", contentType)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusBadRequest)
		}
		payload := decodeBulkImportResponse(t, resp)
		if payload.Error != "invalid file type" {
			t.Fatalf("error=%q, want %q", payload.Error, "invalid file type")
		}
	})
}

func TestImportUsersHandler_MixedResults(t *testing.T) {
	app := newImportTestApp(t, newTestClaims(t, "admin"), allowAuthorizer{})

	csvPayload := strings.Join([]string{
		"email,username,role",
		"valid@example.com,valid,admin",
		",missing,member",
	}, "\n")
	body, contentType := buildMultipartFile(t, "users.csv", "text/csv", []byte(csvPayload))
	req := httptest.NewRequest(http.MethodPost, "/admin/api/users-import", body)
	req.Header.Set("Content-Type", contentType)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if resp.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d, want %d", resp.StatusCode, http.StatusUnprocessableEntity)
	}

	payload := decodeBulkImportResponse(t, resp)
	if payload.Summary.Processed != 2 {
		t.Fatalf("processed=%d, want 2", payload.Summary.Processed)
	}
	if payload.Summary.Succeeded != 1 {
		t.Fatalf("succeeded=%d, want 1", payload.Summary.Succeeded)
	}
	if payload.Summary.Failed != 1 {
		t.Fatalf("failed=%d, want 1", payload.Summary.Failed)
	}
	if len(payload.Results) != 2 {
		t.Fatalf("results=%d, want 2", len(payload.Results))
	}

	success, ok := findResultByIndex(payload.Results, 0)
	if !ok || success.UserID == "" {
		t.Fatalf("expected success result with user_id for index 0")
	}
	failed, ok := findResultByIndex(payload.Results, 1)
	if !ok {
		t.Fatalf("expected failed result for index 1")
	}
	if failed.Error != "email is required" {
		t.Fatalf("error=%q, want %q", failed.Error, "email is required")
	}
}

func TestNewUserImportBindingRequiresBulkCommand(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{})
	if binding := newUserImportBinding(adm); binding != nil {
		t.Fatalf("expected nil binding when bulk user import command is missing")
	}
}

func newImportTestApp(t *testing.T, claims authlib.AuthClaims, authorizer Authorizer) *fiber.App {
	t.Helper()
	repo := &stubAuthRepository{}
	createCmd := command.NewUserCreateCommand(command.UserCreateCommandConfig{Repository: repo})
	bulkCmd := command.NewBulkUserImportCommand(createCmd)
	admin := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		Authorizer:     authorizer,
		BulkUserImport: bulkCmd,
	})
	handlers := newUserImportBinding(admin)

	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
		})
	})

	r := adapter.Router()
	if claims != nil {
		r.Use(withClaimsMiddleware(claims))
	}
	r.Post("/admin/api/users-import", handlers.ImportUsers)
	adapter.Init()
	return adapter.WrappedRouter()
}

func withClaimsMiddleware(claims authlib.AuthClaims) router.MiddlewareFunc {
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			ctx := c.Context()
			ctx = authlib.WithClaimsContext(ctx, claims)
			if actor := authlib.ActorContextFromClaims(claims); actor != nil {
				ctx = authlib.WithActorContext(ctx, actor)
			}
			c.SetContext(ctx)
			return next(c)
		}
	}
}

func newTestClaims(t *testing.T, role string) *authlib.JWTClaims {
	t.Helper()
	subject := uuid.NewString()
	return &authlib.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{Subject: subject},
		UID:              subject,
		UserRole:         role,
	}
}

func buildMultipartFile(t *testing.T, filename, contentType string, payload []byte) (*bytes.Buffer, string) {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filename))
	header.Set("Content-Type", contentType)
	part, err := writer.CreatePart(header)
	if err != nil {
		t.Fatalf("create part: %v", err)
	}
	if _, err := part.Write(payload); err != nil {
		t.Fatalf("write part: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	return body, writer.FormDataContentType()
}

func decodeBulkImportResponse(t *testing.T, resp *http.Response) bulkImportResponse {
	t.Helper()
	defer resp.Body.Close()
	var payload bulkImportResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return payload
}

func findResultByIndex(results []bulkImportResult, index int) (bulkImportResult, bool) {
	for _, result := range results {
		if result.Index == index {
			return result, true
		}
	}
	return bulkImportResult{}, false
}

type rejectAuthorizer struct{}

func (rejectAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return false
}

type stubAuthRepository struct{}

func (s *stubAuthRepository) GetByID(context.Context, uuid.UUID) (*userstypes.AuthUser, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *stubAuthRepository) GetByIdentifier(context.Context, string) (*userstypes.AuthUser, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *stubAuthRepository) Create(_ context.Context, input *userstypes.AuthUser) (*userstypes.AuthUser, error) {
	if input == nil {
		return nil, fmt.Errorf("user required")
	}
	copy := *input
	if copy.ID == uuid.Nil {
		copy.ID = uuid.New()
	}
	return &copy, nil
}

func (s *stubAuthRepository) Update(context.Context, *userstypes.AuthUser) (*userstypes.AuthUser, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *stubAuthRepository) UpdateStatus(context.Context, userstypes.ActorRef, uuid.UUID, userstypes.LifecycleState, ...userstypes.TransitionOption) (*userstypes.AuthUser, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *stubAuthRepository) AllowedTransitions(context.Context, uuid.UUID) ([]userstypes.LifecycleTransition, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *stubAuthRepository) ResetPassword(context.Context, uuid.UUID, string) error {
	return fmt.Errorf("not implemented")
}
