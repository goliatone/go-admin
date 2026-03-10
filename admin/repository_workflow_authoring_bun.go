package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-command/flow"
	"github.com/uptrace/bun"
)

const (
	workflowAuthoringMachinesTable = "workflow_authoring_machines"
	workflowAuthoringVersionsTable = "workflow_authoring_versions"
	workflowMigrationMarkersTable  = "workflow_migration_markers"
	workflowAuthoringCutoverMarker = "fsm_authoring_v1_cutover"
)

type bunWorkflowAuthoringMachineRecord struct {
	bun.BaseModel `bun:"table:workflow_authoring_machines"`

	MachineID           string     `bun:"machine_id,pk"`
	Name                string     `bun:"name,notnull"`
	Version             string     `bun:"version,notnull"`
	ETag                string     `bun:"etag,notnull"`
	Draft               string     `bun:"draft,notnull"`
	Diagnostics         string     `bun:"diagnostics,notnull"`
	UpdatedAt           time.Time  `bun:"updated_at,notnull"`
	PublishedAt         *time.Time `bun:"published_at"`
	PublishedDefinition string     `bun:"published_definition"`
	DeletedAt           *time.Time `bun:"deleted_at"`
}

type bunWorkflowAuthoringVersionRecord struct {
	bun.BaseModel `bun:"table:workflow_authoring_versions"`

	MachineID           string     `bun:"machine_id,pk"`
	Version             string     `bun:"version,pk"`
	Name                string     `bun:"name,notnull"`
	ETag                string     `bun:"etag,notnull"`
	Draft               string     `bun:"draft,notnull"`
	Diagnostics         string     `bun:"diagnostics,notnull"`
	UpdatedAt           time.Time  `bun:"updated_at,notnull"`
	PublishedAt         *time.Time `bun:"published_at"`
	PublishedDefinition string     `bun:"published_definition"`
	DeletedAt           *time.Time `bun:"deleted_at"`
}

type bunWorkflowMigrationMarkerRecord struct {
	bun.BaseModel `bun:"table:workflow_migration_markers"`

	MarkerKey   string    `bun:"marker_key,pk"`
	CompletedAt time.Time `bun:"completed_at,notnull"`
	DetailsJSON string    `bun:"details_json,notnull"`
}

// WorkflowAuthoringVersionStore extends flow.AuthoringStore with version-history lookup.
type WorkflowAuthoringVersionStore interface {
	flow.AuthoringStore
	ListVersions(ctx context.Context, machineID string, limit int, offset int) ([]*flow.AuthoringMachineRecord, bool, error)
	LoadVersion(ctx context.Context, machineID string, version string) (*flow.AuthoringMachineRecord, error)
}

// BunWorkflowAuthoringStore persists flow authoring state and version history.
type BunWorkflowAuthoringStore struct {
	db *bun.DB
}

func NewBunWorkflowAuthoringStore(db *bun.DB) *BunWorkflowAuthoringStore {
	return &BunWorkflowAuthoringStore{db: db}
}

func (s *BunWorkflowAuthoringStore) List(ctx context.Context, opts flow.AuthoringListOptions) (*flow.AuthoringListResult, error) {
	if s == nil || s.db == nil {
		return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
	}
	includeDrafts := true
	if opts.IncludeDrafts != nil {
		includeDrafts = *opts.IncludeDrafts
	}
	limit := 50
	if opts.Limit != nil && *opts.Limit > 0 {
		limit = *opts.Limit
	}
	offset := parseCursorOffset(opts.Cursor)
	query := strings.ToLower(strings.TrimSpace(opts.Query))

	rows := []bunWorkflowAuthoringMachineRecord{}
	q := s.db.NewSelect().Model(&rows)
	if !includeDrafts {
		q = q.Where("published_definition <> ''")
	}
	if query != "" {
		pattern := "%" + query + "%"
		q = q.Where("(LOWER(machine_id) LIKE ? OR LOWER(name) LIKE ?)", pattern, pattern)
	}
	if err := q.OrderExpr("machine_id ASC").Limit(limit).Offset(offset).Scan(ctx); err != nil {
		return nil, err
	}

	totalQ := s.db.NewSelect().Model((*bunWorkflowAuthoringMachineRecord)(nil))
	if !includeDrafts {
		totalQ = totalQ.Where("published_definition <> ''")
	}
	if query != "" {
		pattern := "%" + query + "%"
		totalQ = totalQ.Where("(LOWER(machine_id) LIKE ? OR LOWER(name) LIKE ?)", pattern, pattern)
	}
	total, err := totalQ.Count(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]*flow.AuthoringMachineRecord, 0, len(rows))
	for _, row := range rows {
		rec, convErr := authoringMachineFromBunRow(row)
		if convErr != nil {
			return nil, convErr
		}
		items = append(items, rec)
	}
	nextCursor := ""
	if offset+len(items) < total {
		nextCursor = strconv.Itoa(offset + len(items))
	}
	return &flow.AuthoringListResult{
		Items:      items,
		NextCursor: nextCursor,
	}, nil
}

func (s *BunWorkflowAuthoringStore) Load(ctx context.Context, machineID string) (*flow.AuthoringMachineRecord, error) {
	if s == nil || s.db == nil {
		return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
	}
	machineID = strings.TrimSpace(machineID)
	if machineID == "" {
		return nil, nil
	}
	row := bunWorkflowAuthoringMachineRecord{MachineID: machineID}
	if err := s.db.NewSelect().Model(&row).WherePK().Scan(ctx); err != nil {
		if workflowRepoNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	if row.DeletedAt != nil {
		return nil, nil
	}
	return authoringMachineFromBunRow(row)
}

func (s *BunWorkflowAuthoringStore) Save(ctx context.Context, rec *flow.AuthoringMachineRecord, expectedVersion string) (*flow.AuthoringMachineRecord, error) {
	if s == nil || s.db == nil {
		return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
	}
	next, err := normalizeAuthoringMachineRecord(rec)
	if err != nil {
		return nil, err
	}
	expectedVersion = strings.TrimSpace(expectedVersion)

	if err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		current := bunWorkflowAuthoringMachineRecord{MachineID: next.MachineID}
		currentErr := tx.NewSelect().Model(&current).WherePK().Scan(ctx)
		hasCurrent := currentErr == nil
		if currentErr != nil && !workflowRepoNotFound(currentErr) {
			return currentErr
		}

		if expectedVersion != "" {
			actualVersion := ""
			if hasCurrent {
				actualVersion = strings.TrimSpace(current.Version)
			}
			if !hasCurrent || actualVersion != expectedVersion {
				return workflowRuntimeError(flow.ErrVersionConflict, "version conflict", nil, map[string]any{
					"machineId":       next.MachineID,
					"expectedVersion": expectedVersion,
					"actualVersion":   actualVersion,
				})
			}
		}

		machineRow, convErr := bunAuthoringMachineRowFromRecord(next)
		if convErr != nil {
			return convErr
		}
		versionRow, convErr := bunAuthoringVersionRowFromRecord(next)
		if convErr != nil {
			return convErr
		}

		if hasCurrent {
			if _, execErr := tx.NewUpdate().
				Model(&machineRow).
				WherePK().
				Column(
					"name",
					"version",
					"etag",
					"draft",
					"diagnostics",
					"updated_at",
					"published_at",
					"published_definition",
					"deleted_at",
				).
				Exec(ctx); execErr != nil {
				return execErr
			}
		} else {
			if _, execErr := tx.NewInsert().Model(&machineRow).Exec(ctx); execErr != nil {
				if workflowRepoUniqueConflict(execErr) {
					return workflowRuntimeError(flow.ErrVersionConflict, "version conflict", execErr, map[string]any{
						"machineId":       next.MachineID,
						"expectedVersion": expectedVersion,
					})
				}
				return execErr
			}
		}

		if _, execErr := tx.NewInsert().
			Model(&versionRow).
			On("CONFLICT (machine_id, version) DO UPDATE").
			Set("name = EXCLUDED.name").
			Set("etag = EXCLUDED.etag").
			Set("draft = EXCLUDED.draft").
			Set("diagnostics = EXCLUDED.diagnostics").
			Set("updated_at = EXCLUDED.updated_at").
			Set("published_at = EXCLUDED.published_at").
			Set("published_definition = EXCLUDED.published_definition").
			Set("deleted_at = EXCLUDED.deleted_at").
			Exec(ctx); execErr != nil {
			return execErr
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return s.LoadAny(ctx, next.MachineID)
}

func (s *BunWorkflowAuthoringStore) Delete(ctx context.Context, machineID string, expectedVersion string, hardDelete bool) (bool, error) {
	if s == nil || s.db == nil {
		return false, serviceNotConfiguredDomainError("workflow authoring store", nil)
	}
	machineID = strings.TrimSpace(machineID)
	if machineID == "" {
		return false, requiredFieldDomainError("machine_id", nil)
	}
	expectedVersion = strings.TrimSpace(expectedVersion)

	var deleted bool
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		current := bunWorkflowAuthoringMachineRecord{MachineID: machineID}
		if selectErr := tx.NewSelect().Model(&current).WherePK().Scan(ctx); selectErr != nil {
			if workflowRepoNotFound(selectErr) {
				deleted = false
				return nil
			}
			return selectErr
		}
		if expectedVersion != "" && strings.TrimSpace(current.Version) != expectedVersion {
			return workflowRuntimeError(flow.ErrVersionConflict, "version conflict", nil, map[string]any{
				"machineId":       machineID,
				"expectedVersion": expectedVersion,
				"actualVersion":   strings.TrimSpace(current.Version),
			})
		}

		if hardDelete {
			if _, execErr := tx.NewDelete().
				Model((*bunWorkflowAuthoringVersionRecord)(nil)).
				Where("machine_id = ?", machineID).
				Exec(ctx); execErr != nil {
				return execErr
			}
			if _, execErr := tx.NewDelete().
				Model((*bunWorkflowAuthoringMachineRecord)(nil)).
				Where("machine_id = ?", machineID).
				Exec(ctx); execErr != nil {
				return execErr
			}
			deleted = true
			return nil
		}

		now := time.Now().UTC()
		current.DeletedAt = &now
		current.UpdatedAt = now
		if _, execErr := tx.NewUpdate().
			Model(&current).
			WherePK().
			Column("updated_at", "deleted_at").
			Exec(ctx); execErr != nil {
			return execErr
		}
		deleted = true
		return nil
	})
	if err != nil {
		return false, err
	}
	return deleted, nil
}

func (s *BunWorkflowAuthoringStore) ListVersions(ctx context.Context, machineID string, limit int, offset int) ([]*flow.AuthoringMachineRecord, bool, error) {
	if s == nil || s.db == nil {
		return nil, false, serviceNotConfiguredDomainError("workflow authoring store", nil)
	}
	machineID = strings.TrimSpace(machineID)
	if machineID == "" {
		return nil, false, requiredFieldDomainError("machine_id", nil)
	}
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows := []bunWorkflowAuthoringVersionRecord{}
	if err := s.db.NewSelect().
		Model(&rows).
		Where("machine_id = ?", machineID).
		OrderExpr("updated_at DESC").
		OrderExpr("version DESC").
		Limit(limit).
		Offset(offset).
		Scan(ctx); err != nil {
		return nil, false, err
	}

	total, err := s.db.NewSelect().
		Model((*bunWorkflowAuthoringVersionRecord)(nil)).
		Where("machine_id = ?", machineID).
		Count(ctx)
	if err != nil {
		return nil, false, err
	}

	items := make([]*flow.AuthoringMachineRecord, 0, len(rows))
	for _, row := range rows {
		rec, convErr := authoringVersionFromBunRow(row)
		if convErr != nil {
			return nil, false, convErr
		}
		items = append(items, rec)
	}
	return items, offset+len(items) < total, nil
}

func (s *BunWorkflowAuthoringStore) LoadVersion(ctx context.Context, machineID string, version string) (*flow.AuthoringMachineRecord, error) {
	if s == nil || s.db == nil {
		return nil, serviceNotConfiguredDomainError("workflow authoring store", nil)
	}
	machineID = strings.TrimSpace(machineID)
	version = strings.TrimSpace(version)
	if machineID == "" || version == "" {
		return nil, requiredFieldDomainError("machine_id/version", nil)
	}
	row := bunWorkflowAuthoringVersionRecord{
		MachineID: machineID,
		Version:   version,
	}
	if err := s.db.NewSelect().Model(&row).WherePK().Scan(ctx); err != nil {
		if workflowRepoNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	return authoringVersionFromBunRow(row)
}

func (s *BunWorkflowAuthoringStore) LoadAny(ctx context.Context, machineID string) (*flow.AuthoringMachineRecord, error) {
	rec, err := s.Load(ctx, machineID)
	if err != nil || rec != nil {
		return rec, err
	}
	versions, _, listErr := s.ListVersions(ctx, machineID, 1, 0)
	if listErr != nil {
		return nil, listErr
	}
	if len(versions) == 0 {
		return nil, nil
	}
	return versions[0], nil
}

// EnsureWorkflowAuthoringCutover migrates legacy workflow rows into canonical authoring stores and
// hard-fails when required schema objects are missing.
func EnsureWorkflowAuthoringCutover(ctx context.Context, db *bun.DB) error {
	if db == nil {
		return serviceNotConfiguredDomainError("workflow authoring cutover", nil)
	}
	if ctx == nil {
		ctx = context.Background()
	}
	required := []string{
		workflowAuthoringMachinesTable,
		workflowAuthoringVersionsTable,
		workflowMigrationMarkersTable,
	}
	for _, table := range required {
		exists, err := workflowCutoverTableExists(ctx, db, table)
		if err != nil {
			return err
		}
		if !exists {
			return validationDomainError("workflow authoring cutover schema missing", map[string]any{
				"table":  table,
				"marker": workflowAuthoringCutoverMarker,
			})
		}
	}
	done, err := workflowCutoverMarkerExists(ctx, db)
	if err != nil {
		return err
	}
	if done {
		return nil
	}
	if err := runWorkflowAuthoringCutover(ctx, db); err != nil {
		return err
	}
	done, err = workflowCutoverMarkerExists(ctx, db)
	if err != nil {
		return err
	}
	if !done {
		return validationDomainError("workflow authoring cutover marker missing", map[string]any{
			"marker": workflowAuthoringCutoverMarker,
		})
	}
	return nil
}

func runWorkflowAuthoringCutover(ctx context.Context, db *bun.DB) error {
	return db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		workflows := []bunWorkflowRecord{}
		if err := tx.NewSelect().Model(&workflows).OrderExpr("id ASC").Scan(ctx); err != nil {
			if !workflowRepoNotFound(err) {
				return fmt.Errorf("workflow authoring cutover: list workflows: %w", err)
			}
		}

		revisions := []bunWorkflowRevisionRecord{}
		if err := tx.NewSelect().
			Model(&revisions).
			OrderExpr("workflow_id ASC").
			OrderExpr("version ASC").
			Scan(ctx); err != nil {
			if !workflowRepoNotFound(err) {
				return fmt.Errorf("workflow authoring cutover: list revisions: %w", err)
			}
		}

		bindingsCount := 0
		if count, err := tx.NewSelect().Model((*bunWorkflowBindingRecord)(nil)).Count(ctx); err != nil {
			if !workflowRepoNotFound(err) {
				return fmt.Errorf("workflow authoring cutover: count bindings: %w", err)
			}
		} else {
			bindingsCount = count
		}

		migratedMachines := 0
		migratedVersions := 0
		for _, row := range workflows {
			workflow, err := workflowFromBunRecord(row)
			if err != nil {
				return err
			}
			rec, err := persistedWorkflowToAuthoringRecord(workflow)
			if err != nil {
				return err
			}
			machineRow, err := bunAuthoringMachineRowFromRecord(rec)
			if err != nil {
				return err
			}
			if _, err := tx.NewInsert().
				Model(&machineRow).
				On("CONFLICT (machine_id) DO UPDATE").
				Set("name = EXCLUDED.name").
				Set("version = EXCLUDED.version").
				Set("etag = EXCLUDED.etag").
				Set("draft = EXCLUDED.draft").
				Set("diagnostics = EXCLUDED.diagnostics").
				Set("updated_at = EXCLUDED.updated_at").
				Set("published_at = EXCLUDED.published_at").
				Set("published_definition = EXCLUDED.published_definition").
				Set("deleted_at = EXCLUDED.deleted_at").
				Exec(ctx); err != nil {
				return fmt.Errorf("workflow authoring cutover: upsert machine %s: %w", rec.MachineID, err)
			}
			migratedMachines++

			versionRow, err := bunAuthoringVersionRowFromRecord(rec)
			if err != nil {
				return err
			}
			if _, err := tx.NewInsert().
				Model(&versionRow).
				On("CONFLICT (machine_id, version) DO UPDATE").
				Set("name = EXCLUDED.name").
				Set("etag = EXCLUDED.etag").
				Set("draft = EXCLUDED.draft").
				Set("diagnostics = EXCLUDED.diagnostics").
				Set("updated_at = EXCLUDED.updated_at").
				Set("published_at = EXCLUDED.published_at").
				Set("published_definition = EXCLUDED.published_definition").
				Set("deleted_at = EXCLUDED.deleted_at").
				Exec(ctx); err != nil {
				return fmt.Errorf("workflow authoring cutover: upsert current version %s@%s: %w", rec.MachineID, rec.Version, err)
			}
			migratedVersions++
		}

		for _, row := range revisions {
			workflow, err := workflowFromRevisionRecord(row)
			if err != nil {
				return err
			}
			rec, err := persistedWorkflowToAuthoringRecord(workflow)
			if err != nil {
				return err
			}
			versionRow, err := bunAuthoringVersionRowFromRecord(rec)
			if err != nil {
				return err
			}
			if _, err := tx.NewInsert().
				Model(&versionRow).
				On("CONFLICT (machine_id, version) DO UPDATE").
				Set("name = EXCLUDED.name").
				Set("etag = EXCLUDED.etag").
				Set("draft = EXCLUDED.draft").
				Set("diagnostics = EXCLUDED.diagnostics").
				Set("updated_at = EXCLUDED.updated_at").
				Set("published_at = EXCLUDED.published_at").
				Set("published_definition = EXCLUDED.published_definition").
				Set("deleted_at = EXCLUDED.deleted_at").
				Exec(ctx); err != nil {
				return fmt.Errorf("workflow authoring cutover: upsert revision %s@%s: %w", rec.MachineID, rec.Version, err)
			}
			migratedVersions++
		}

		details, _ := json.Marshal(map[string]any{
			"legacy_workflows":         len(workflows),
			"legacy_revisions":         len(revisions),
			"legacy_bindings":          bindingsCount,
			"migrated_authoring":       migratedMachines,
			"migrated_authoringEvents": migratedVersions,
		})
		marker := bunWorkflowMigrationMarkerRecord{
			MarkerKey:   workflowAuthoringCutoverMarker,
			CompletedAt: time.Now().UTC(),
			DetailsJSON: string(details),
		}
		if _, err := tx.NewInsert().
			Model(&marker).
			On("CONFLICT (marker_key) DO UPDATE").
			Set("completed_at = EXCLUDED.completed_at").
			Set("details_json = EXCLUDED.details_json").
			Exec(ctx); err != nil {
			return fmt.Errorf("workflow authoring cutover: write marker: %w", err)
		}
		return nil
	})
}

func workflowCutoverTableExists(ctx context.Context, db bun.IDB, table string) (bool, error) {
	var probe int
	err := db.NewSelect().TableExpr(table).ColumnExpr("1").Limit(1).Scan(ctx, &probe)
	if err == nil || err == sql.ErrNoRows {
		return true, nil
	}
	if workflowRepoNotFound(err) {
		return false, nil
	}
	lower := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(lower, "does not exist") || strings.Contains(lower, "no such table") {
		return false, nil
	}
	return false, err
}

func workflowCutoverMarkerExists(ctx context.Context, db bun.IDB) (bool, error) {
	count, err := db.NewSelect().
		Model((*bunWorkflowMigrationMarkerRecord)(nil)).
		Where("marker_key = ?", workflowAuthoringCutoverMarker).
		Count(ctx)
	if err != nil {
		if workflowRepoNotFound(err) {
			return false, nil
		}
		return false, err
	}
	return count > 0, nil
}

func bunAuthoringMachineRowFromRecord(rec *flow.AuthoringMachineRecord) (bunWorkflowAuthoringMachineRecord, error) {
	if rec == nil {
		return bunWorkflowAuthoringMachineRecord{}, validationDomainError("authoring record required", nil)
	}
	draftRaw, err := json.Marshal(rec.Draft)
	if err != nil {
		return bunWorkflowAuthoringMachineRecord{}, err
	}
	diagsRaw, err := json.Marshal(rec.Diagnostics)
	if err != nil {
		return bunWorkflowAuthoringMachineRecord{}, err
	}
	publishedRaw := ""
	if rec.PublishedDefinition != nil {
		publishedBytes, publishedErr := json.Marshal(rec.PublishedDefinition)
		if publishedErr != nil {
			return bunWorkflowAuthoringMachineRecord{}, publishedErr
		}
		publishedRaw = string(publishedBytes)
	}
	return bunWorkflowAuthoringMachineRecord{
		MachineID:           strings.TrimSpace(rec.MachineID),
		Name:                strings.TrimSpace(rec.Name),
		Version:             strings.TrimSpace(rec.Version),
		ETag:                strings.TrimSpace(rec.ETag),
		Draft:               string(draftRaw),
		Diagnostics:         string(diagsRaw),
		UpdatedAt:           rec.UpdatedAt.UTC(),
		PublishedAt:         cloneAuthoringTimePtr(rec.PublishedAt),
		PublishedDefinition: publishedRaw,
		DeletedAt:           cloneAuthoringTimePtr(rec.DeletedAt),
	}, nil
}

func bunAuthoringVersionRowFromRecord(rec *flow.AuthoringMachineRecord) (bunWorkflowAuthoringVersionRecord, error) {
	if rec == nil {
		return bunWorkflowAuthoringVersionRecord{}, validationDomainError("authoring record required", nil)
	}
	draftRaw, err := json.Marshal(rec.Draft)
	if err != nil {
		return bunWorkflowAuthoringVersionRecord{}, err
	}
	diagsRaw, err := json.Marshal(rec.Diagnostics)
	if err != nil {
		return bunWorkflowAuthoringVersionRecord{}, err
	}
	publishedRaw := ""
	if rec.PublishedDefinition != nil {
		publishedBytes, publishedErr := json.Marshal(rec.PublishedDefinition)
		if publishedErr != nil {
			return bunWorkflowAuthoringVersionRecord{}, publishedErr
		}
		publishedRaw = string(publishedBytes)
	}
	return bunWorkflowAuthoringVersionRecord{
		MachineID:           strings.TrimSpace(rec.MachineID),
		Version:             strings.TrimSpace(rec.Version),
		Name:                strings.TrimSpace(rec.Name),
		ETag:                strings.TrimSpace(rec.ETag),
		Draft:               string(draftRaw),
		Diagnostics:         string(diagsRaw),
		UpdatedAt:           rec.UpdatedAt.UTC(),
		PublishedAt:         cloneAuthoringTimePtr(rec.PublishedAt),
		PublishedDefinition: publishedRaw,
		DeletedAt:           cloneAuthoringTimePtr(rec.DeletedAt),
	}, nil
}

func authoringMachineFromBunRow(row bunWorkflowAuthoringMachineRecord) (*flow.AuthoringMachineRecord, error) {
	draft := flow.DraftMachineDocument{}
	if err := json.Unmarshal([]byte(row.Draft), &draft); err != nil {
		return nil, err
	}
	diags := []flow.ValidationDiagnostic{}
	if strings.TrimSpace(row.Diagnostics) != "" {
		if err := json.Unmarshal([]byte(row.Diagnostics), &diags); err != nil {
			return nil, err
		}
	}
	var published *flow.MachineDefinition
	if strings.TrimSpace(row.PublishedDefinition) != "" {
		value := &flow.MachineDefinition{}
		if err := json.Unmarshal([]byte(row.PublishedDefinition), value); err != nil {
			return nil, err
		}
		published = value
	}
	return &flow.AuthoringMachineRecord{
		MachineID:           strings.TrimSpace(row.MachineID),
		Name:                strings.TrimSpace(row.Name),
		Version:             strings.TrimSpace(row.Version),
		ETag:                strings.TrimSpace(row.ETag),
		Draft:               draft,
		Diagnostics:         append([]flow.ValidationDiagnostic(nil), diags...),
		UpdatedAt:           row.UpdatedAt.UTC(),
		PublishedAt:         cloneAuthoringTimePtr(row.PublishedAt),
		PublishedDefinition: published,
		DeletedAt:           cloneAuthoringTimePtr(row.DeletedAt),
	}, nil
}

func authoringVersionFromBunRow(row bunWorkflowAuthoringVersionRecord) (*flow.AuthoringMachineRecord, error) {
	draft := flow.DraftMachineDocument{}
	if err := json.Unmarshal([]byte(row.Draft), &draft); err != nil {
		return nil, err
	}
	diags := []flow.ValidationDiagnostic{}
	if strings.TrimSpace(row.Diagnostics) != "" {
		if err := json.Unmarshal([]byte(row.Diagnostics), &diags); err != nil {
			return nil, err
		}
	}
	var published *flow.MachineDefinition
	if strings.TrimSpace(row.PublishedDefinition) != "" {
		value := &flow.MachineDefinition{}
		if err := json.Unmarshal([]byte(row.PublishedDefinition), value); err != nil {
			return nil, err
		}
		published = value
	}
	return &flow.AuthoringMachineRecord{
		MachineID:           strings.TrimSpace(row.MachineID),
		Name:                strings.TrimSpace(row.Name),
		Version:             strings.TrimSpace(row.Version),
		ETag:                strings.TrimSpace(row.ETag),
		Draft:               draft,
		Diagnostics:         append([]flow.ValidationDiagnostic(nil), diags...),
		UpdatedAt:           row.UpdatedAt.UTC(),
		PublishedAt:         cloneAuthoringTimePtr(row.PublishedAt),
		PublishedDefinition: published,
		DeletedAt:           cloneAuthoringTimePtr(row.DeletedAt),
	}, nil
}

func normalizeAuthoringMachineRecord(rec *flow.AuthoringMachineRecord) (*flow.AuthoringMachineRecord, error) {
	next, err := cloneAuthoringMachine(rec)
	if err != nil {
		return nil, err
	}
	if next == nil {
		return nil, validationDomainError("authoring record required", nil)
	}
	next.MachineID = strings.TrimSpace(next.MachineID)
	if next.MachineID == "" {
		return nil, requiredFieldDomainError("machine_id", nil)
	}
	next.Version = strings.TrimSpace(next.Version)
	if next.Version == "" {
		next.Version = "1"
	}
	next.Name = strings.TrimSpace(next.Name)
	if next.Name == "" {
		if next.Draft.Definition != nil {
			next.Name = strings.TrimSpace(next.Draft.Definition.Name)
		}
	}
	if next.Name == "" {
		next.Name = next.MachineID
	}
	next.ETag = strings.TrimSpace(next.ETag)
	if next.ETag == "" {
		next.ETag = authoringRecordETag(next.MachineID, next.Version)
	}
	if next.UpdatedAt.IsZero() {
		next.UpdatedAt = time.Now().UTC()
	} else {
		next.UpdatedAt = next.UpdatedAt.UTC()
	}
	if next.PublishedAt != nil {
		value := next.PublishedAt.UTC()
		next.PublishedAt = &value
	}
	if next.DeletedAt != nil {
		value := next.DeletedAt.UTC()
		next.DeletedAt = &value
	}
	sort.SliceStable(next.Diagnostics, func(i, j int) bool {
		return strings.TrimSpace(next.Diagnostics[i].Path) < strings.TrimSpace(next.Diagnostics[j].Path)
	})
	return next, nil
}

func cloneAuthoringMachine(rec *flow.AuthoringMachineRecord) (*flow.AuthoringMachineRecord, error) {
	if rec == nil {
		return nil, nil
	}
	raw, err := json.Marshal(rec)
	if err != nil {
		return nil, err
	}
	out := &flow.AuthoringMachineRecord{}
	if err := json.Unmarshal(raw, out); err != nil {
		return nil, err
	}
	return out, nil
}

func cloneAuthoringTimePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	normalized := value.UTC()
	return &normalized
}
