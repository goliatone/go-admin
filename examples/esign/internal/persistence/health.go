package persistence

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	persistence "github.com/goliatone/go-persistence-bun"
)

// CheckConnectivity validates DB connectivity through the persistence client.
func CheckConnectivity(ctx context.Context, client *persistence.Client) error {
	if client == nil {
		return fmt.Errorf("persistence health: client is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := client.Ping(ctx); err != nil {
		return fmt.Errorf("persistence health: ping failed: %w", err)
	}
	return nil
}

// CheckMigrationReadiness verifies migration metadata table presence and dialect contract validation.
func CheckMigrationReadiness(ctx context.Context, client *persistence.Client) error {
	if client == nil {
		return fmt.Errorf("persistence health: client is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := client.ValidateDialects(ctx); err != nil {
		return fmt.Errorf("persistence health: dialect validation failed: %w", err)
	}
	var applied int
	if err := client.DB().NewRaw(`SELECT COUNT(1) FROM bun_migrations`).Scan(ctx, &applied); err != nil {
		return fmt.Errorf("persistence health: migration state query failed: %w", err)
	}
	return nil
}

// CheckReadiness runs connectivity and migration readiness checks.
func CheckReadiness(ctx context.Context, client *persistence.Client) error {
	if err := CheckConnectivity(ctx, client); err != nil {
		return err
	}
	if err := CheckMigrationReadiness(ctx, client); err != nil {
		return err
	}
	if err := CheckLineageIntegrity(ctx, client); err != nil {
		return err
	}
	return nil
}

func CheckLineageIntegrity(ctx context.Context, client *persistence.Client) error {
	if client == nil {
		return fmt.Errorf("persistence health: client is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	db := client.DB()
	if db == nil {
		return fmt.Errorf("persistence health: bun db is required")
	}

	type countRow struct {
		Count int `bun:"count"`
	}

	duplicateHandles := countRow{}
	if err := db.NewRaw(`
SELECT COUNT(1) AS count
FROM (
    SELECT tenant_id, org_id, provider_kind, external_file_id, account_id
    FROM source_handles
    WHERE handle_status = 'active' AND valid_to IS NULL
    GROUP BY tenant_id, org_id, provider_kind, external_file_id, account_id
    HAVING COUNT(1) > 1
) dup`).Scan(ctx, &duplicateHandles); err != nil {
		return fmt.Errorf("persistence health: lineage duplicate active handle check failed: %w", err)
	}
	if duplicateHandles.Count > 0 {
		return fmt.Errorf("persistence health: lineage duplicate active handles detected")
	}

	orphanedDocs := countRow{}
	if err := db.NewRaw(`
SELECT COUNT(1) AS count
FROM documents d
LEFT JOIN source_documents sd
  ON sd.tenant_id = d.tenant_id AND sd.org_id = d.org_id AND sd.id = d.source_document_id
LEFT JOIN source_revisions sr
  ON sr.tenant_id = d.tenant_id AND sr.org_id = d.org_id AND sr.id = d.source_revision_id
LEFT JOIN source_artifacts sa
  ON sa.tenant_id = d.tenant_id AND sa.org_id = d.org_id AND sa.id = d.source_artifact_id
WHERE (TRIM(COALESCE(d.source_document_id, '')) <> '' AND sd.id IS NULL)
   OR (TRIM(COALESCE(d.source_revision_id, '')) <> '' AND sr.id IS NULL)
   OR (TRIM(COALESCE(d.source_artifact_id, '')) <> '' AND sa.id IS NULL)
`).Scan(ctx, &orphanedDocs); err != nil {
		return fmt.Errorf("persistence health: lineage orphaned document reference check failed: %w", err)
	}
	if orphanedDocs.Count > 0 {
		return fmt.Errorf("persistence health: orphaned document lineage references detected")
	}

	orphanedAgreements := countRow{}
	if err := db.NewRaw(`
SELECT COUNT(1) AS count
FROM agreements a
LEFT JOIN source_revisions sr
  ON sr.tenant_id = a.tenant_id AND sr.org_id = a.org_id AND sr.id = a.source_revision_id
WHERE TRIM(COALESCE(a.source_revision_id, '')) <> '' AND sr.id IS NULL
`).Scan(ctx, &orphanedAgreements); err != nil {
		return fmt.Errorf("persistence health: lineage orphaned agreement reference check failed: %w", err)
	}
	if orphanedAgreements.Count > 0 {
		return fmt.Errorf("persistence health: orphaned agreement lineage references detected")
	}

	type metadataRow struct {
		ID           string `bun:"id"`
		MetadataJSON string `bun:"metadata_json"`
	}
	var metadataRows []metadataRow
	if err := db.NewRaw(`
SELECT sr.id, sr.metadata_json
FROM source_revisions sr
JOIN source_handles sh
  ON sh.tenant_id = sr.tenant_id AND sh.org_id = sr.org_id AND sh.id = sr.source_handle_id
WHERE sh.provider_kind = 'google_drive'
`).Scan(ctx, &metadataRows); err != nil {
		return fmt.Errorf("persistence health: lineage google metadata read failed: %w", err)
	}
	for _, row := range metadataRows {
		raw := strings.TrimSpace(row.MetadataJSON)
		if raw == "" || !json.Valid([]byte(raw)) {
			return fmt.Errorf("persistence health: malformed google lineage metadata for source_revision %s", strings.TrimSpace(row.ID))
		}
	}

	scopeViolations := countRow{}
	if err := db.NewRaw(`
SELECT COUNT(1) AS count
FROM source_revisions sr
JOIN source_documents sd ON sd.id = sr.source_document_id
JOIN source_handles sh ON sh.id = sr.source_handle_id
WHERE sr.tenant_id <> sd.tenant_id
   OR sr.org_id <> sd.org_id
   OR sr.tenant_id <> sh.tenant_id
   OR sr.org_id <> sh.org_id
`).Scan(ctx, &scopeViolations); err != nil {
		return fmt.Errorf("persistence health: lineage scope validation failed: %w", err)
	}
	if scopeViolations.Count > 0 {
		return fmt.Errorf("persistence health: lineage scope violations detected")
	}
	return nil
}
