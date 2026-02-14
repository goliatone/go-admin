package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type bunWorkflowRecord struct {
	bun.BaseModel `bun:"table:workflows"`

	ID          string    `bun:"id,pk"`
	Name        string    `bun:"name,notnull"`
	Definition  string    `bun:"definition,notnull"`
	Status      string    `bun:"status,notnull"`
	Version     int       `bun:"version,notnull"`
	Environment string    `bun:"environment,notnull"`
	CreatedAt   time.Time `bun:"created_at,notnull"`
	UpdatedAt   time.Time `bun:"updated_at,notnull"`
}

type bunWorkflowRevisionRecord struct {
	bun.BaseModel `bun:"table:workflow_revisions"`

	WorkflowID  string    `bun:"workflow_id,pk"`
	Version     int       `bun:"version,pk"`
	Name        string    `bun:"name,notnull"`
	Definition  string    `bun:"definition,notnull"`
	Status      string    `bun:"status,notnull"`
	Environment string    `bun:"environment,notnull"`
	CreatedAt   time.Time `bun:"created_at,notnull"`
	UpdatedAt   time.Time `bun:"updated_at,notnull"`
}

type bunWorkflowBindingRecord struct {
	bun.BaseModel `bun:"table:workflow_bindings"`

	ID          string    `bun:"id,pk"`
	ScopeType   string    `bun:"scope_type,notnull"`
	ScopeRef    string    `bun:"scope_ref,notnull"`
	WorkflowID  string    `bun:"workflow_id,notnull"`
	Priority    int       `bun:"priority,notnull"`
	Status      string    `bun:"status,notnull"`
	Environment string    `bun:"environment,notnull"`
	Version     int       `bun:"version,notnull"`
	CreatedAt   time.Time `bun:"created_at,notnull"`
	UpdatedAt   time.Time `bun:"updated_at,notnull"`
}

// BunWorkflowDefinitionRepository persists workflow definitions and version snapshots.
type BunWorkflowDefinitionRepository struct {
	db *bun.DB
}

// NewBunWorkflowDefinitionRepository constructs a Bun-backed workflow repository.
func NewBunWorkflowDefinitionRepository(db *bun.DB) *BunWorkflowDefinitionRepository {
	return &BunWorkflowDefinitionRepository{db: db}
}

func (r *BunWorkflowDefinitionRepository) List(ctx context.Context, opts PersistedWorkflowListOptions) ([]PersistedWorkflow, int, error) {
	if r == nil || r.db == nil {
		return nil, 0, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	status := strings.ToLower(strings.TrimSpace(string(opts.Status)))
	environment := strings.ToLower(strings.TrimSpace(opts.Environment))

	rows := []bunWorkflowRecord{}
	q := r.db.NewSelect().Model(&rows)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if environment != "" {
		q = q.Where("LOWER(environment) = ?", environment)
	}
	if err := q.OrderExpr("id ASC").Scan(ctx); err != nil {
		return nil, 0, err
	}

	out := make([]PersistedWorkflow, 0, len(rows))
	for _, row := range rows {
		workflow, err := workflowFromBunRecord(row)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, workflow)
	}
	return out, len(out), nil
}

func (r *BunWorkflowDefinitionRepository) Get(ctx context.Context, id string) (PersistedWorkflow, error) {
	if r == nil || r.db == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}

	row := bunWorkflowRecord{ID: id}
	if err := r.db.NewSelect().Model(&row).WherePK().Scan(ctx); err != nil {
		if workflowRepoNotFound(err) {
			return PersistedWorkflow{}, ErrNotFound
		}
		return PersistedWorkflow{}, err
	}
	return workflowFromBunRecord(row)
}

func (r *BunWorkflowDefinitionRepository) GetVersion(ctx context.Context, id string, version int) (PersistedWorkflow, error) {
	if r == nil || r.db == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}
	if version <= 0 {
		return PersistedWorkflow{}, validationDomainError("version must be > 0", map[string]any{"field": "version"})
	}

	row := bunWorkflowRevisionRecord{
		WorkflowID: id,
		Version:    version,
	}
	if err := r.db.NewSelect().Model(&row).WherePK().Scan(ctx); err != nil {
		if workflowRepoNotFound(err) {
			current, getErr := r.Get(ctx, id)
			if getErr == nil && current.Version == version {
				return current, nil
			}
			return PersistedWorkflow{}, ErrNotFound
		}
		return PersistedWorkflow{}, err
	}
	return workflowFromRevisionRecord(row)
}

func (r *BunWorkflowDefinitionRepository) Create(ctx context.Context, workflow PersistedWorkflow) (PersistedWorkflow, error) {
	if r == nil || r.db == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	next := normalizePersistedWorkflow(workflow)
	if next.ID == "" {
		next.ID = "wf_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	now := time.Now().UTC()
	if next.CreatedAt.IsZero() {
		next.CreatedAt = now
	}
	next.UpdatedAt = now
	if next.Version <= 0 {
		next.Version = 1
	}
	if next.Status == "" {
		next.Status = WorkflowStatusDraft
	}

	created := next
	if err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		record, err := workflowToBunRecord(next)
		if err != nil {
			return err
		}
		if _, err := tx.NewInsert().Model(&record).Exec(ctx); err != nil {
			if workflowRepoUniqueConflict(err) {
				return conflictDomainError("workflow already exists", map[string]any{"id": next.ID})
			}
			return err
		}
		return insertWorkflowRevisionTx(ctx, tx, created)
	}); err != nil {
		return PersistedWorkflow{}, err
	}
	return clonePersistedWorkflow(created), nil
}

func (r *BunWorkflowDefinitionRepository) Update(ctx context.Context, workflow PersistedWorkflow, expectedVersion int) (PersistedWorkflow, error) {
	if r == nil || r.db == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	if expectedVersion <= 0 {
		return PersistedWorkflow{}, validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	id := strings.TrimSpace(workflow.ID)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}

	updated := PersistedWorkflow{}
	if err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		currentRec := bunWorkflowRecord{ID: id}
		if err := tx.NewSelect().Model(&currentRec).WherePK().Scan(ctx); err != nil {
			if workflowRepoNotFound(err) {
				return ErrNotFound
			}
			return err
		}
		current, err := workflowFromBunRecord(currentRec)
		if err != nil {
			return err
		}
		if current.Version != expectedVersion {
			return WorkflowVersionConflictError{
				WorkflowID:      current.ID,
				ExpectedVersion: expectedVersion,
				ActualVersion:   current.Version,
			}
		}

		next := normalizePersistedWorkflow(workflow)
		next.ID = current.ID
		next.CreatedAt = current.CreatedAt
		next.UpdatedAt = time.Now().UTC()
		next.Version = current.Version + 1
		if next.Status == "" {
			next.Status = current.Status
		}
		if next.Name == "" {
			next.Name = current.Name
		}
		if strings.TrimSpace(next.Environment) == "" {
			next.Environment = current.Environment
		}
		if strings.TrimSpace(next.Definition.InitialState) == "" && len(next.Definition.Transitions) == 0 {
			next.Definition = cloneWorkflowDefinition(current.Definition)
		}

		record, err := workflowToBunRecord(next)
		if err != nil {
			return err
		}
		if _, err := tx.NewUpdate().
			Model(&record).
			WherePK().
			Column("name", "definition", "status", "version", "environment", "updated_at").
			Exec(ctx); err != nil {
			return err
		}
		if err := insertWorkflowRevisionTx(ctx, tx, next); err != nil {
			return err
		}
		updated = clonePersistedWorkflow(next)
		return nil
	}); err != nil {
		return PersistedWorkflow{}, err
	}
	return updated, nil
}

// BunWorkflowBindingRepository persists workflow bindings with active uniqueness checks.
type BunWorkflowBindingRepository struct {
	db *bun.DB
}

// NewBunWorkflowBindingRepository constructs a Bun-backed binding repository.
func NewBunWorkflowBindingRepository(db *bun.DB) *BunWorkflowBindingRepository {
	return &BunWorkflowBindingRepository{db: db}
}

func (r *BunWorkflowBindingRepository) List(ctx context.Context, opts WorkflowBindingListOptions) ([]WorkflowBinding, int, error) {
	if r == nil || r.db == nil {
		return nil, 0, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	scopeType := strings.ToLower(strings.TrimSpace(string(opts.ScopeType)))
	scopeRef := strings.ToLower(strings.TrimSpace(opts.ScopeRef))
	environment := strings.ToLower(strings.TrimSpace(opts.Environment))
	status := strings.ToLower(strings.TrimSpace(string(opts.Status)))

	rows := []bunWorkflowBindingRecord{}
	q := r.db.NewSelect().Model(&rows)
	if scopeType != "" {
		q = q.Where("scope_type = ?", scopeType)
	}
	if scopeRef != "" {
		q = q.Where("LOWER(scope_ref) = ?", scopeRef)
	}
	if environment != "" {
		q = q.Where("LOWER(environment) = ?", environment)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if err := q.
		OrderExpr("CASE WHEN COALESCE(environment, '') = '' THEN 1 ELSE 0 END ASC").
		OrderExpr("priority ASC").
		OrderExpr("scope_type ASC").
		OrderExpr("scope_ref ASC").
		OrderExpr("id ASC").
		Scan(ctx); err != nil {
		return nil, 0, err
	}
	out := make([]WorkflowBinding, 0, len(rows))
	for _, row := range rows {
		out = append(out, bindingFromBunRecord(row))
	}
	return out, len(out), nil
}

func (r *BunWorkflowBindingRepository) ListByScope(ctx context.Context, scopeType WorkflowBindingScopeType, scopeRef string, status WorkflowBindingStatus) ([]WorkflowBinding, error) {
	if r == nil || r.db == nil {
		return nil, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	opts := WorkflowBindingListOptions{
		ScopeType: scopeType,
		ScopeRef:  scopeRef,
		Status:    status,
	}
	bindings, _, err := r.List(ctx, opts)
	return bindings, err
}

func (r *BunWorkflowBindingRepository) Get(ctx context.Context, id string) (WorkflowBinding, error) {
	if r == nil || r.db == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return WorkflowBinding{}, requiredFieldDomainError("id", nil)
	}
	row := bunWorkflowBindingRecord{ID: id}
	if err := r.db.NewSelect().Model(&row).WherePK().Scan(ctx); err != nil {
		if workflowRepoNotFound(err) {
			return WorkflowBinding{}, ErrNotFound
		}
		return WorkflowBinding{}, err
	}
	return bindingFromBunRecord(row), nil
}

func (r *BunWorkflowBindingRepository) Create(ctx context.Context, binding WorkflowBinding) (WorkflowBinding, error) {
	if r == nil || r.db == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	next := normalizeWorkflowBinding(binding)
	if next.ID == "" {
		next.ID = "wfb_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	now := time.Now().UTC()
	if next.CreatedAt.IsZero() {
		next.CreatedAt = now
	}
	next.UpdatedAt = now
	if next.Version <= 0 {
		next.Version = 1
	}
	if next.Status == "" {
		next.Status = WorkflowBindingStatusActive
	}

	created := next
	if err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		conflictID, err := findWorkflowBindingConflict(ctx, tx, next, "")
		if err != nil {
			return err
		}
		if conflictID != "" {
			return WorkflowBindingConflictError{
				BindingID:         next.ID,
				ExistingBindingID: conflictID,
				ScopeType:         next.ScopeType,
				ScopeRef:          next.ScopeRef,
				Environment:       next.Environment,
				Priority:          next.Priority,
			}
		}

		record := bindingToBunRecord(next)
		if _, err := tx.NewInsert().Model(&record).Exec(ctx); err != nil {
			if workflowRepoUniqueConflict(err) {
				return conflictDomainError("workflow binding already exists", map[string]any{"id": next.ID})
			}
			if workflowBindingUniqueConstraintConflict(err) {
				existingID, _ := findWorkflowBindingConflict(ctx, tx, next, "")
				return WorkflowBindingConflictError{
					BindingID:         next.ID,
					ExistingBindingID: existingID,
					ScopeType:         next.ScopeType,
					ScopeRef:          next.ScopeRef,
					Environment:       next.Environment,
					Priority:          next.Priority,
				}
			}
			return err
		}
		return nil
	}); err != nil {
		return WorkflowBinding{}, err
	}
	return cloneWorkflowBinding(created), nil
}

func (r *BunWorkflowBindingRepository) Update(ctx context.Context, binding WorkflowBinding, expectedVersion int) (WorkflowBinding, error) {
	if r == nil || r.db == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	if expectedVersion <= 0 {
		return WorkflowBinding{}, validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	id := strings.TrimSpace(binding.ID)
	if id == "" {
		return WorkflowBinding{}, requiredFieldDomainError("id", nil)
	}

	updated := WorkflowBinding{}
	if err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		currentRec := bunWorkflowBindingRecord{ID: id}
		if err := tx.NewSelect().Model(&currentRec).WherePK().Scan(ctx); err != nil {
			if workflowRepoNotFound(err) {
				return ErrNotFound
			}
			return err
		}
		current := bindingFromBunRecord(currentRec)
		if current.Version != expectedVersion {
			return WorkflowBindingVersionConflictError{
				BindingID:       current.ID,
				ExpectedVersion: expectedVersion,
				ActualVersion:   current.Version,
			}
		}

		next := normalizeWorkflowBinding(binding)
		next.ID = current.ID
		next.CreatedAt = current.CreatedAt
		next.UpdatedAt = time.Now().UTC()
		next.Version = current.Version + 1
		if next.ScopeType == "" {
			next.ScopeType = current.ScopeType
		}
		if next.ScopeRef == "" {
			next.ScopeRef = current.ScopeRef
		}
		if next.WorkflowID == "" {
			next.WorkflowID = current.WorkflowID
		}
		if next.Priority == 100 && binding.Priority == 0 {
			next.Priority = current.Priority
		}
		if next.Status == "" {
			next.Status = current.Status
		}
		if strings.TrimSpace(next.Environment) == "" {
			next.Environment = current.Environment
		}

		conflictID, err := findWorkflowBindingConflict(ctx, tx, next, current.ID)
		if err != nil {
			return err
		}
		if conflictID != "" {
			return WorkflowBindingConflictError{
				BindingID:         next.ID,
				ExistingBindingID: conflictID,
				ScopeType:         next.ScopeType,
				ScopeRef:          next.ScopeRef,
				Environment:       next.Environment,
				Priority:          next.Priority,
			}
		}

		record := bindingToBunRecord(next)
		if _, err := tx.NewUpdate().
			Model(&record).
			WherePK().
			Column("scope_type", "scope_ref", "workflow_id", "priority", "status", "environment", "version", "updated_at").
			Exec(ctx); err != nil {
			if workflowBindingUniqueConstraintConflict(err) {
				existingID, _ := findWorkflowBindingConflict(ctx, tx, next, current.ID)
				return WorkflowBindingConflictError{
					BindingID:         next.ID,
					ExistingBindingID: existingID,
					ScopeType:         next.ScopeType,
					ScopeRef:          next.ScopeRef,
					Environment:       next.Environment,
					Priority:          next.Priority,
				}
			}
			return err
		}
		updated = cloneWorkflowBinding(next)
		return nil
	}); err != nil {
		return WorkflowBinding{}, err
	}
	return updated, nil
}

func (r *BunWorkflowBindingRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.db == nil {
		return serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return requiredFieldDomainError("id", nil)
	}
	res, err := r.db.NewDelete().Model((*bunWorkflowBindingRecord)(nil)).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func workflowToBunRecord(workflow PersistedWorkflow) (bunWorkflowRecord, error) {
	definitionJSON, err := json.Marshal(cloneWorkflowDefinition(workflow.Definition))
	if err != nil {
		return bunWorkflowRecord{}, err
	}
	return bunWorkflowRecord{
		ID:          workflow.ID,
		Name:        workflow.Name,
		Definition:  string(definitionJSON),
		Status:      string(workflow.Status),
		Version:     workflow.Version,
		Environment: workflow.Environment,
		CreatedAt:   workflow.CreatedAt,
		UpdatedAt:   workflow.UpdatedAt,
	}, nil
}

func workflowFromBunRecord(row bunWorkflowRecord) (PersistedWorkflow, error) {
	definition := WorkflowDefinition{}
	if trimmed := strings.TrimSpace(row.Definition); trimmed != "" {
		if err := json.Unmarshal([]byte(trimmed), &definition); err != nil {
			return PersistedWorkflow{}, err
		}
	}
	out := PersistedWorkflow{
		ID:          strings.TrimSpace(row.ID),
		Name:        strings.TrimSpace(row.Name),
		Definition:  cloneWorkflowDefinition(definition),
		Status:      PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(row.Status))),
		Version:     row.Version,
		Environment: strings.ToLower(strings.TrimSpace(row.Environment)),
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
	return normalizePersistedWorkflow(out), nil
}

func workflowFromRevisionRecord(row bunWorkflowRevisionRecord) (PersistedWorkflow, error) {
	definition := WorkflowDefinition{}
	if trimmed := strings.TrimSpace(row.Definition); trimmed != "" {
		if err := json.Unmarshal([]byte(trimmed), &definition); err != nil {
			return PersistedWorkflow{}, err
		}
	}
	out := PersistedWorkflow{
		ID:          strings.TrimSpace(row.WorkflowID),
		Name:        strings.TrimSpace(row.Name),
		Definition:  cloneWorkflowDefinition(definition),
		Status:      PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(row.Status))),
		Version:     row.Version,
		Environment: strings.ToLower(strings.TrimSpace(row.Environment)),
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
	return normalizePersistedWorkflow(out), nil
}

func insertWorkflowRevisionTx(ctx context.Context, tx bun.Tx, workflow PersistedWorkflow) error {
	definitionJSON, err := json.Marshal(cloneWorkflowDefinition(workflow.Definition))
	if err != nil {
		return err
	}
	revision := bunWorkflowRevisionRecord{
		WorkflowID:  workflow.ID,
		Version:     workflow.Version,
		Name:        workflow.Name,
		Definition:  string(definitionJSON),
		Status:      string(workflow.Status),
		Environment: workflow.Environment,
		CreatedAt:   workflow.CreatedAt,
		UpdatedAt:   workflow.UpdatedAt,
	}
	_, err = tx.NewInsert().Model(&revision).Exec(ctx)
	if workflowRepoUniqueConflict(err) {
		_, err = tx.NewUpdate().
			Model(&revision).
			Where("workflow_id = ?", revision.WorkflowID).
			Where("version = ?", revision.Version).
			Column("name", "definition", "status", "environment", "created_at", "updated_at").
			Exec(ctx)
	}
	return err
}

func bindingToBunRecord(binding WorkflowBinding) bunWorkflowBindingRecord {
	return bunWorkflowBindingRecord{
		ID:          binding.ID,
		ScopeType:   string(binding.ScopeType),
		ScopeRef:    binding.ScopeRef,
		WorkflowID:  binding.WorkflowID,
		Priority:    binding.Priority,
		Status:      string(binding.Status),
		Environment: binding.Environment,
		Version:     binding.Version,
		CreatedAt:   binding.CreatedAt,
		UpdatedAt:   binding.UpdatedAt,
	}
}

func bindingFromBunRecord(row bunWorkflowBindingRecord) WorkflowBinding {
	out := WorkflowBinding{
		ID:          strings.TrimSpace(row.ID),
		ScopeType:   WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(row.ScopeType))),
		ScopeRef:    strings.ToLower(strings.TrimSpace(row.ScopeRef)),
		WorkflowID:  strings.TrimSpace(row.WorkflowID),
		Priority:    row.Priority,
		Status:      WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(row.Status))),
		Environment: strings.ToLower(strings.TrimSpace(row.Environment)),
		Version:     row.Version,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
	return normalizeWorkflowBinding(out)
}

func findWorkflowBindingConflict(ctx context.Context, db bun.IDB, binding WorkflowBinding, skipID string) (string, error) {
	if binding.Status != WorkflowBindingStatusActive {
		return "", nil
	}
	scopeType := strings.ToLower(strings.TrimSpace(string(binding.ScopeType)))
	scopeRef := strings.ToLower(strings.TrimSpace(binding.ScopeRef))
	environment := strings.ToLower(strings.TrimSpace(binding.Environment))
	priority := binding.Priority
	if scopeType == "" {
		return "", nil
	}
	if scopeType == string(WorkflowBindingScopeGlobal) && scopeRef == "" {
		scopeRef = "global"
	}

	conflictingID := ""
	q := db.NewSelect().
		Model((*bunWorkflowBindingRecord)(nil)).
		Column("id").
		Where("scope_type = ?", scopeType).
		Where("scope_ref = ?", scopeRef).
		Where("environment = ?", environment).
		Where("priority = ?", priority).
		Where("status = ?", string(WorkflowBindingStatusActive)).
		Limit(1)
	if strings.TrimSpace(skipID) != "" {
		q = q.Where("id <> ?", strings.TrimSpace(skipID))
	}
	if err := q.Scan(ctx, &conflictingID); err != nil {
		if workflowRepoNotFound(err) {
			return "", nil
		}
		return "", err
	}
	return conflictingID, nil
}

func workflowRepoNotFound(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, sql.ErrNoRows) {
		return true
	}
	return strings.Contains(strings.ToLower(err.Error()), "no rows in result set")
}

func workflowRepoUniqueConflict(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique violation")
}

func workflowBindingUniqueConstraintConflict(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "uq_workflow_bindings_active_scope_priority") {
		return true
	}
	sqliteSignature := "workflow_bindings.scope_type, workflow_bindings.scope_ref, workflow_bindings.environment, workflow_bindings.priority"
	return strings.Contains(msg, sqliteSignature)
}
