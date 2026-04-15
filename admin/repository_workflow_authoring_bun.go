package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	workflowauthoring "github.com/goliatone/go-admin/admin/internal/workflowauthoring"
	"github.com/goliatone/go-command/flow"
	"github.com/uptrace/bun"
)

const (
	workflowAuthoringMachinesTable = "workflow_authoring_machines"
	workflowAuthoringVersionsTable = "workflow_authoring_versions"
	workflowMigrationMarkersTable  = "workflow_migration_markers"
	workflowAuthoringCutoverMarker = "fsm_authoring_v1_cutover"
)

type bunWorkflowAuthoringMachineRecord = workflowauthoring.MachineRow

type bunWorkflowAuthoringVersionRecord = workflowauthoring.VersionRow

type bunWorkflowMigrationMarkerRecord struct {
	bun.BaseModel `bun:"table:workflow_migration_markers"`

	MarkerKey   string    `bun:"marker_key,pk" json:"marker_key"`
	CompletedAt time.Time `bun:"completed_at,notnull" json:"completed_at"`
	DetailsJSON string    `bun:"details_json,notnull" json:"details_json"`
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
	offset := workflowauthoring.ParseCursorOffset(opts.Cursor)
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
		rec, convErr := workflowauthoring.MachineFromRow(row)
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
	return workflowauthoring.MachineFromRow(row)
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
		current, hasCurrent, err := loadCurrentAuthoringMachineRow(ctx, tx, next.MachineID)
		if err != nil {
			return err
		}
		if err := validateExpectedAuthoringVersion(next.MachineID, expectedVersion, current, hasCurrent); err != nil {
			return err
		}
		machineRow, convErr := bunAuthoringMachineRowFromRecord(next)
		if convErr != nil {
			return convErr
		}
		versionRow, convErr := bunAuthoringVersionRowFromRecord(next)
		if convErr != nil {
			return convErr
		}
		if err := upsertAuthoringMachineRow(ctx, tx, machineRow, hasCurrent, expectedVersion); err != nil {
			return err
		}
		return upsertAuthoringVersionRow(ctx, tx, versionRow)
	}); err != nil {
		return nil, err
	}

	return s.LoadAny(ctx, next.MachineID)
}

func loadCurrentAuthoringMachineRow(ctx context.Context, tx bun.Tx, machineID string) (bunWorkflowAuthoringMachineRecord, bool, error) {
	current := bunWorkflowAuthoringMachineRecord{MachineID: machineID}
	err := tx.NewSelect().Model(&current).WherePK().Scan(ctx)
	if err == nil {
		return current, true, nil
	}
	if workflowRepoNotFound(err) {
		return bunWorkflowAuthoringMachineRecord{}, false, nil
	}
	return bunWorkflowAuthoringMachineRecord{}, false, err
}

func validateExpectedAuthoringVersion(machineID, expectedVersion string, current bunWorkflowAuthoringMachineRecord, hasCurrent bool) error {
	if expectedVersion == "" {
		return nil
	}
	actualVersion := ""
	if hasCurrent {
		actualVersion = strings.TrimSpace(current.Version)
	}
	if hasCurrent && actualVersion == expectedVersion {
		return nil
	}
	return workflowRuntimeError(flow.ErrVersionConflict, "version conflict", nil, map[string]any{
		"machineId":       machineID,
		"expectedVersion": expectedVersion,
		"actualVersion":   actualVersion,
	})
}

func upsertAuthoringMachineRow(ctx context.Context, tx bun.Tx, machineRow bunWorkflowAuthoringMachineRecord, hasCurrent bool, expectedVersion string) error {
	if hasCurrent {
		_, err := tx.NewUpdate().
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
			Exec(ctx)
		return err
	}
	if _, err := tx.NewInsert().Model(&machineRow).Exec(ctx); err != nil {
		if workflowRepoUniqueConflict(err) {
			return workflowRuntimeError(flow.ErrVersionConflict, "version conflict", err, map[string]any{
				"machineId":       machineRow.MachineID,
				"expectedVersion": expectedVersion,
			})
		}
		return err
	}
	return nil
}

func upsertAuthoringVersionRow(ctx context.Context, tx bun.Tx, versionRow bunWorkflowAuthoringVersionRecord) error {
	_, err := tx.NewInsert().
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
		Exec(ctx)
	return err
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
		rec, convErr := workflowauthoring.VersionFromRow(row)
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
	return workflowauthoring.VersionFromRow(row)
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
	if cutoverErr := runWorkflowAuthoringCutover(ctx, db); cutoverErr != nil {
		return cutoverErr
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
		workflows, revisions, bindingsCount, err := loadWorkflowAuthoringCutoverState(ctx, tx)
		if err != nil {
			return err
		}
		migratedMachines, migratedVersions, err := migrateWorkflowAuthoringCutoverCurrent(ctx, tx, workflows)
		if err != nil {
			return err
		}
		revisionVersions, err := migrateWorkflowAuthoringCutoverRevisions(ctx, tx, revisions)
		if err != nil {
			return err
		}
		migratedVersions += revisionVersions
		return writeWorkflowAuthoringCutoverMarker(ctx, tx, workflows, revisions, bindingsCount, migratedMachines, migratedVersions)
	})
}

func loadWorkflowAuthoringCutoverState(ctx context.Context, tx bun.Tx) ([]bunWorkflowRecord, []bunWorkflowRevisionRecord, int, error) {
	workflows := []bunWorkflowRecord{}
	if err := tx.NewSelect().Model(&workflows).OrderExpr("id ASC").Scan(ctx); err != nil && !workflowRepoNotFound(err) {
		return nil, nil, 0, fmt.Errorf("workflow authoring cutover: list workflows: %w", err)
	}
	revisions := []bunWorkflowRevisionRecord{}
	if err := tx.NewSelect().
		Model(&revisions).
		OrderExpr("workflow_id ASC").
		OrderExpr("version ASC").
		Scan(ctx); err != nil && !workflowRepoNotFound(err) {
		return nil, nil, 0, fmt.Errorf("workflow authoring cutover: list revisions: %w", err)
	}
	bindingsCount := 0
	if count, err := tx.NewSelect().Model((*bunWorkflowBindingRecord)(nil)).Count(ctx); err != nil {
		if !workflowRepoNotFound(err) {
			return nil, nil, 0, fmt.Errorf("workflow authoring cutover: count bindings: %w", err)
		}
	} else {
		bindingsCount = count
	}
	return workflows, revisions, bindingsCount, nil
}

func migrateWorkflowAuthoringCutoverCurrent(ctx context.Context, tx bun.Tx, workflows []bunWorkflowRecord) (int, int, error) {
	migratedMachines := 0
	migratedVersions := 0
	for _, row := range workflows {
		rec, err := workflowAuthoringRecordFromWorkflow(row)
		if err != nil {
			return 0, 0, err
		}
		if err := upsertWorkflowAuthoringMachine(ctx, tx, rec); err != nil {
			return 0, 0, err
		}
		migratedMachines++
		if err := upsertWorkflowAuthoringVersion(ctx, tx, rec, "current version"); err != nil {
			return 0, 0, err
		}
		migratedVersions++
	}
	return migratedMachines, migratedVersions, nil
}

func migrateWorkflowAuthoringCutoverRevisions(ctx context.Context, tx bun.Tx, revisions []bunWorkflowRevisionRecord) (int, error) {
	migratedVersions := 0
	for _, row := range revisions {
		rec, err := workflowAuthoringRecordFromRevision(row)
		if err != nil {
			return 0, err
		}
		if err := upsertWorkflowAuthoringVersion(ctx, tx, rec, "revision"); err != nil {
			return 0, err
		}
		migratedVersions++
	}
	return migratedVersions, nil
}

func workflowAuthoringRecordFromWorkflow(row bunWorkflowRecord) (*flow.AuthoringMachineRecord, error) {
	workflow, err := workflowFromBunRecord(row)
	if err != nil {
		return nil, err
	}
	return persistedWorkflowToAuthoringRecord(workflow)
}

func workflowAuthoringRecordFromRevision(row bunWorkflowRevisionRecord) (*flow.AuthoringMachineRecord, error) {
	workflow, err := workflowFromRevisionRecord(row)
	if err != nil {
		return nil, err
	}
	return persistedWorkflowToAuthoringRecord(workflow)
}

func upsertWorkflowAuthoringMachine(ctx context.Context, tx bun.Tx, rec *flow.AuthoringMachineRecord) error {
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
	return nil
}

func upsertWorkflowAuthoringVersion(ctx context.Context, tx bun.Tx, rec *flow.AuthoringMachineRecord, label string) error {
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
		return fmt.Errorf("workflow authoring cutover: upsert %s %s@%s: %w", label, rec.MachineID, rec.Version, err)
	}
	return nil
}

func writeWorkflowAuthoringCutoverMarker(
	ctx context.Context,
	tx bun.Tx,
	workflows []bunWorkflowRecord,
	revisions []bunWorkflowRevisionRecord,
	bindingsCount, migratedMachines, migratedVersions int,
) error {
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

func normalizeAuthoringMachineRecord(rec *flow.AuthoringMachineRecord) (*flow.AuthoringMachineRecord, error) {
	next, err := workflowauthoring.NormalizeMachineRecord(rec)
	if err == nil {
		return next, nil
	}
	switch {
	case errors.Is(err, workflowauthoring.ErrAuthoringRecordRequired):
		return nil, validationDomainError("authoring record required", nil)
	case errors.Is(err, workflowauthoring.ErrMachineIDRequired):
		return nil, requiredFieldDomainError("machine_id", nil)
	default:
		return nil, err
	}
}

func bunAuthoringMachineRowFromRecord(rec *flow.AuthoringMachineRecord) (bunWorkflowAuthoringMachineRecord, error) {
	row, err := workflowauthoring.MachineRowFromRecord(rec)
	if errors.Is(err, workflowauthoring.ErrAuthoringRecordRequired) {
		return bunWorkflowAuthoringMachineRecord{}, validationDomainError("authoring record required", nil)
	}
	return row, err
}

func bunAuthoringVersionRowFromRecord(rec *flow.AuthoringMachineRecord) (bunWorkflowAuthoringVersionRecord, error) {
	row, err := workflowauthoring.VersionRowFromRecord(rec)
	if errors.Is(err, workflowauthoring.ErrAuthoringRecordRequired) {
		return bunWorkflowAuthoringVersionRecord{}, validationDomainError("authoring record required", nil)
	}
	return row, err
}
