package stores

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// FixtureSet identifies seeded phase-1 records used by integration tests.
type FixtureSet struct {
	DocumentID              string
	AgreementID             string
	RecipientID             string
	SigningTokenID          string
	FieldID                 string
	FieldValueID            string
	SignatureArtifactID     string
	AuditEventID            string
	EmailLogID              string
	IntegrationCredentialID string
}

// SeedCoreFixtures inserts one scope-bound record for each phase-1 core table.
func SeedCoreFixtures(ctx context.Context, db *bun.DB, scope Scope) (FixtureSet, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if db == nil {
		return FixtureSet{}, invalidRecordError("fixtures", "db", "required")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return FixtureSet{}, err
	}

	now := time.Now().UTC()
	fx := FixtureSet{
		DocumentID:              uuid.NewString(),
		AgreementID:             uuid.NewString(),
		RecipientID:             uuid.NewString(),
		SigningTokenID:          uuid.NewString(),
		FieldID:                 uuid.NewString(),
		FieldValueID:            uuid.NewString(),
		SignatureArtifactID:     uuid.NewString(),
		AuditEventID:            uuid.NewString(),
		EmailLogID:              uuid.NewString(),
		IntegrationCredentialID: uuid.NewString(),
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_object_key, source_sha256, size_bytes, page_count, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.DocumentID, scope.TenantID, scope.OrgID, "Fixture Document", "fixtures/documents/source.pdf", strings.Repeat("a", 64), 1024, 1, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, created_at, updated_at)
VALUES (?, ?, ?, ?, 'draft', ?, ?, 1, ?, ?)
`, fx.AgreementID, scope.TenantID, scope.OrgID, fx.DocumentID, "Fixture Agreement", "Fixture message", now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO recipients (id, tenant_id, org_id, agreement_id, email, name, role, signing_order, first_view_at, last_view_at, decline_reason, version, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, 'signer', 1, ?, ?, '', 1, ?, ?)
`, fx.RecipientID, scope.TenantID, scope.OrgID, fx.AgreementID, "signer@example.com", "Fixture Signer", now, now, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO signing_tokens (id, tenant_id, org_id, agreement_id, recipient_id, token_hash, status, expires_at, created_at)
VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
`, fx.SigningTokenID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, strings.Repeat("b", 64), now.Add(24*time.Hour), now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO fields (id, tenant_id, org_id, agreement_id, recipient_id, field_type, page_number, pos_x, pos_y, width, height, required, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'signature', 1, 10, 10, 100, 40, 1, ?, ?)
`, fx.FieldID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO signature_artifacts (id, tenant_id, org_id, agreement_id, recipient_id, artifact_type, object_key, sha256, created_at)
VALUES (?, ?, ?, ?, ?, 'typed', ?, ?, ?)
`, fx.SignatureArtifactID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, "fixtures/signatures/signature.png", strings.Repeat("c", 64), now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO field_values (id, tenant_id, org_id, agreement_id, recipient_id, field_id, value_text, signature_artifact_id, version, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`, fx.FieldValueID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, fx.FieldID, "Fixture Signature", fx.SignatureArtifactID, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO audit_events (id, tenant_id, org_id, agreement_id, event_type, actor_type, actor_id, ip_address, user_agent, metadata_json, created_at)
VALUES (?, ?, ?, ?, 'agreement.created', 'user', 'fixture-user', '127.0.0.1', 'fixture-agent', '{}', ?)
`, fx.AuditEventID, scope.TenantID, scope.OrgID, fx.AgreementID, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO email_logs (id, tenant_id, org_id, agreement_id, recipient_id, template_code, provider_message_id, status, created_at)
VALUES (?, ?, ?, ?, ?, 'esign.sign_request', ?, 'queued', ?)
`, fx.EmailLogID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, "provider-message-id", now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO integration_credentials (id, tenant_id, org_id, user_id, provider, encrypted_access_token, encrypted_refresh_token, scopes_json, expires_at, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google', ?, ?, ?, ?, ?, ?)
`, fx.IntegrationCredentialID, scope.TenantID, scope.OrgID, "fixture-user", "enc-access", "enc-refresh", `["https://www.googleapis.com/auth/drive.readonly"]`, now.Add(24*time.Hour), now, now); err != nil {
		return FixtureSet{}, err
	}

	return fx, nil
}
