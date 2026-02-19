package services

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	gocore "github.com/goliatone/go-services/core"
)

type workflowRuntime struct {
	mappingStore     *workflowMappingSpecStore
	syncBindingStore *workflowSyncBindingStore
	checkpointStore  *workflowSyncCheckpointStore
	changeLogStore   *workflowSyncChangeLogStore
	conflictStore    *workflowSyncConflictStore

	mappingLifecycle *gocore.MappingSpecLifecycle
	compiler         *gocore.MappingCompiler
	previewer        *gocore.MappingPreviewer
	planner          *gocore.SyncPlannerService
	runner           *gocore.SyncExecutionService
	conflicts        *gocore.SyncConflictLedgerService

	now func() time.Time

	mu              sync.Mutex
	runResults      map[string]gocore.SyncRunResult
	runRecords      map[string]workflowSyncRunRecord
	runOrder        []string
	schemaBaselines map[string]workflowSchemaBaseline
}

type workflowSyncRunRecord struct {
	RunID             string
	ProviderID        string
	Scope             gocore.ScopeRef
	SyncBindingID     string
	Mode              gocore.SyncRunMode
	Direction         gocore.SyncDirection
	Plan              gocore.SyncRunPlan
	Result            gocore.SyncRunResult
	RecordedConflicts []map[string]any
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type workflowSchemaBaseline struct {
	ID         string
	ProviderID string
	Scope      gocore.ScopeRef
	SpecID     string
	Version    int
	SchemaRef  string
	CapturedBy string
	Metadata   map[string]any
	CapturedAt time.Time
	UpdatedAt  time.Time
}

func newWorkflowRuntime() (*workflowRuntime, error) {
	mappingStore := newWorkflowMappingSpecStore()
	syncBindingStore := newWorkflowSyncBindingStore()
	checkpointStore := newWorkflowSyncCheckpointStore()
	changeLogStore := newWorkflowSyncChangeLogStore()
	conflictStore := newWorkflowSyncConflictStore()

	mappingLifecycle, err := gocore.NewMappingSpecLifecycle(mappingStore)
	if err != nil {
		return nil, err
	}
	planner, err := gocore.NewSyncPlannerService(checkpointStore)
	if err != nil {
		return nil, err
	}
	runner, err := gocore.NewSyncExecutionService(checkpointStore, changeLogStore)
	if err != nil {
		return nil, err
	}
	conflicts, err := gocore.NewSyncConflictLedgerService(conflictStore)
	if err != nil {
		return nil, err
	}

	return &workflowRuntime{
		mappingStore:     mappingStore,
		syncBindingStore: syncBindingStore,
		checkpointStore:  checkpointStore,
		changeLogStore:   changeLogStore,
		conflictStore:    conflictStore,
		mappingLifecycle: mappingLifecycle,
		compiler:         gocore.NewMappingCompiler(),
		previewer:        gocore.NewMappingPreviewer(gocore.NewMappingCompiler()),
		planner:          planner,
		runner:           runner,
		conflicts:        conflicts,
		now: func() time.Time {
			return time.Now().UTC()
		},
		runResults:      map[string]gocore.SyncRunResult{},
		runRecords:      map[string]workflowSyncRunRecord{},
		runOrder:        []string{},
		schemaBaselines: map[string]workflowSchemaBaseline{},
	}, nil
}

func (r *workflowRuntime) rememberRunResult(result gocore.SyncRunResult) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.runResults[strings.TrimSpace(result.RunID)] = result
}

func (r *workflowRuntime) runResult(runID string) (gocore.SyncRunResult, bool) {
	if r == nil {
		return gocore.SyncRunResult{}, false
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	result, ok := r.runResults[strings.TrimSpace(runID)]
	return result, ok
}

func (r *workflowRuntime) rememberSyncRun(
	plan gocore.SyncRunPlan,
	result gocore.SyncRunResult,
	recordedConflicts []map[string]any,
) workflowSyncRunRecord {
	if r == nil {
		return workflowSyncRunRecord{}
	}
	runID := strings.TrimSpace(result.RunID)
	if runID == "" {
		runID = strings.TrimSpace(plan.ID)
	}
	if runID == "" {
		return workflowSyncRunRecord{}
	}
	now := r.now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()

	record, ok := r.runRecords[runID]
	if !ok {
		record.CreatedAt = now
		r.runOrder = append(r.runOrder, runID)
	}
	record.RunID = runID
	record.ProviderID = strings.TrimSpace(plan.Checkpoint.ProviderID)
	record.Scope = gocore.ScopeRef{
		Type: strings.TrimSpace(strings.ToLower(plan.Checkpoint.Scope.Type)),
		ID:   strings.TrimSpace(plan.Checkpoint.Scope.ID),
	}
	record.SyncBindingID = strings.TrimSpace(plan.BindingID)
	record.Mode = plan.Mode
	record.Direction = plan.Checkpoint.Direction
	if record.Direction == "" && result.NextCheckpoint != nil {
		record.Direction = result.NextCheckpoint.Direction
	}
	record.Plan = plan
	record.Result = result
	record.RecordedConflicts = copyMapSlice(recordedConflicts)
	record.UpdatedAt = now

	r.runResults[runID] = result
	r.runRecords[runID] = record
	return record
}

func (r *workflowRuntime) getSyncRun(providerID string, scope gocore.ScopeRef, runID string) (workflowSyncRunRecord, bool) {
	if r == nil {
		return workflowSyncRunRecord{}, false
	}
	runID = strings.TrimSpace(runID)
	if runID == "" {
		return workflowSyncRunRecord{}, false
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	record, ok := r.runRecords[runID]
	if !ok {
		return workflowSyncRunRecord{}, false
	}
	if !sameProviderScope(record.ProviderID, record.Scope, providerID, scope) {
		return workflowSyncRunRecord{}, false
	}
	return record, true
}

func (r *workflowRuntime) listSyncRuns(
	providerID string,
	scope gocore.ScopeRef,
	syncBindingID string,
	status gocore.SyncRunStatus,
	mode gocore.SyncRunMode,
	limit int,
	offset int,
) ([]workflowSyncRunRecord, int) {
	if r == nil {
		return []workflowSyncRunRecord{}, 0
	}
	if limit <= 0 {
		limit = 25
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	filtered := make([]workflowSyncRunRecord, 0)
	for idx := len(r.runOrder) - 1; idx >= 0; idx-- {
		runID := strings.TrimSpace(r.runOrder[idx])
		record, ok := r.runRecords[runID]
		if !ok {
			continue
		}
		if !sameProviderScope(record.ProviderID, record.Scope, providerID, scope) {
			continue
		}
		if strings.TrimSpace(syncBindingID) != "" && strings.TrimSpace(record.SyncBindingID) != strings.TrimSpace(syncBindingID) {
			continue
		}
		if status != "" && record.Result.Status != status {
			continue
		}
		if mode != "" && record.Mode != mode {
			continue
		}
		filtered = append(filtered, record)
	}
	total := len(filtered)
	if offset >= total {
		return []workflowSyncRunRecord{}, total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	out := make([]workflowSyncRunRecord, 0, end-offset)
	for _, row := range filtered[offset:end] {
		out = append(out, row)
	}
	return out, total
}

func (r *workflowRuntime) schemaBaselineKey(providerID string, scope gocore.ScopeRef, specID string) string {
	return strings.TrimSpace(strings.ToLower(providerID)) + "|" + strings.TrimSpace(strings.ToLower(scope.Type)) + "|" + strings.TrimSpace(scope.ID) + "|" + strings.TrimSpace(specID)
}

func (r *workflowRuntime) upsertSchemaBaseline(input workflowSchemaBaseline) workflowSchemaBaseline {
	if r == nil {
		return workflowSchemaBaseline{}
	}
	now := r.now().UTC()
	input.ProviderID = strings.TrimSpace(input.ProviderID)
	input.Scope = gocore.ScopeRef{
		Type: strings.TrimSpace(strings.ToLower(input.Scope.Type)),
		ID:   strings.TrimSpace(input.Scope.ID),
	}
	input.SpecID = strings.TrimSpace(input.SpecID)
	input.SchemaRef = strings.TrimSpace(input.SchemaRef)
	input.CapturedBy = strings.TrimSpace(input.CapturedBy)
	key := r.schemaBaselineKey(input.ProviderID, input.Scope, input.SpecID)

	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.schemaBaselines[key]
	if ok {
		input.ID = existing.ID
		input.CapturedAt = existing.CapturedAt
	} else {
		if strings.TrimSpace(input.ID) == "" {
			input.ID = "baseline_" + strings.ReplaceAll(strings.ToLower(input.SpecID), " ", "_")
		}
		input.CapturedAt = now
	}
	input.UpdatedAt = now
	input.Metadata = copyAnyMap(input.Metadata)
	r.schemaBaselines[key] = input
	return input
}

func (r *workflowRuntime) getSchemaBaseline(providerID string, scope gocore.ScopeRef, specID string) (workflowSchemaBaseline, bool) {
	if r == nil {
		return workflowSchemaBaseline{}, false
	}
	key := r.schemaBaselineKey(providerID, scope, specID)
	r.mu.Lock()
	defer r.mu.Unlock()
	baseline, ok := r.schemaBaselines[key]
	return baseline, ok
}

func (r *workflowRuntime) listConflicts(providerID string, scope gocore.ScopeRef, bindingID string, status gocore.SyncConflictStatus) []gocore.SyncConflict {
	if r == nil || r.conflictStore == nil {
		return []gocore.SyncConflict{}
	}
	return r.conflictStore.List(providerID, scope, bindingID, status)
}

func copyMapSlice(rows []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, copyAnyMap(row))
	}
	return out
}

func workflowProviderScope(providerID string, scope gocore.ScopeRef) (string, gocore.ScopeRef, error) {
	providerID = strings.TrimSpace(providerID)
	scope = gocore.ScopeRef{Type: strings.TrimSpace(strings.ToLower(scope.Type)), ID: strings.TrimSpace(scope.ID)}
	if providerID == "" {
		return "", gocore.ScopeRef{}, fmt.Errorf("core: provider id is required")
	}
	if err := scope.Validate(); err != nil {
		return "", gocore.ScopeRef{}, err
	}
	return providerID, scope, nil
}

func sameProviderScope(
	leftProviderID string,
	leftScope gocore.ScopeRef,
	rightProviderID string,
	rightScope gocore.ScopeRef,
) bool {
	return strings.EqualFold(strings.TrimSpace(leftProviderID), strings.TrimSpace(rightProviderID)) &&
		strings.EqualFold(strings.TrimSpace(leftScope.Type), strings.TrimSpace(rightScope.Type)) &&
		strings.TrimSpace(leftScope.ID) == strings.TrimSpace(rightScope.ID)
}

type workflowMappingSpecStore struct {
	mu      sync.Mutex
	records map[string]gocore.MappingSpec
}

func newWorkflowMappingSpecStore() *workflowMappingSpecStore {
	return &workflowMappingSpecStore{records: map[string]gocore.MappingSpec{}}
}

func (s *workflowMappingSpecStore) key(providerID string, scope gocore.ScopeRef, specID string, version int) string {
	return strings.TrimSpace(strings.ToLower(providerID)) + "|" + strings.TrimSpace(strings.ToLower(scope.Type)) + "|" + strings.TrimSpace(scope.ID) + "|" + strings.TrimSpace(specID) + "|" + toString(version)
}

func (s *workflowMappingSpecStore) CreateDraft(_ context.Context, spec gocore.MappingSpec) (gocore.MappingSpec, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	if spec.ID == "" {
		spec.ID = "mapping_" + strings.ReplaceAll(strings.ToLower(spec.SpecID), " ", "_") + "_v" + toString(spec.Version)
	}
	spec.CreatedAt = now
	spec.UpdatedAt = now
	s.records[s.key(spec.ProviderID, spec.Scope, spec.SpecID, spec.Version)] = spec
	return spec, nil
}

func (s *workflowMappingSpecStore) UpdateDraft(_ context.Context, spec gocore.MappingSpec) (gocore.MappingSpec, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := s.key(spec.ProviderID, spec.Scope, spec.SpecID, spec.Version)
	existing, ok := s.records[key]
	if !ok {
		return gocore.MappingSpec{}, fmt.Errorf("core: mapping spec %s version %d not found", spec.SpecID, spec.Version)
	}
	spec.ID = existing.ID
	spec.CreatedAt = existing.CreatedAt
	spec.UpdatedAt = time.Now().UTC()
	s.records[key] = spec
	return spec, nil
}

func (s *workflowMappingSpecStore) SetStatus(
	_ context.Context,
	providerID string,
	scope gocore.ScopeRef,
	specID string,
	version int,
	status gocore.MappingSpecStatus,
	now time.Time,
) (gocore.MappingSpec, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := s.key(providerID, scope, specID, version)
	record, ok := s.records[key]
	if !ok {
		return gocore.MappingSpec{}, fmt.Errorf("core: mapping spec %s version %d not found", specID, version)
	}
	record.Status = status
	record.UpdatedAt = now.UTC()
	if status == gocore.MappingSpecStatusPublished {
		t := now.UTC()
		record.PublishedAt = &t
	} else {
		record.PublishedAt = nil
	}
	s.records[key] = record
	return record, nil
}

func (s *workflowMappingSpecStore) GetVersion(
	_ context.Context,
	providerID string,
	scope gocore.ScopeRef,
	specID string,
	version int,
) (gocore.MappingSpec, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.records[s.key(providerID, scope, specID, version)]
	return record, ok, nil
}

func (s *workflowMappingSpecStore) GetLatest(_ context.Context, providerID string, scope gocore.ScopeRef, specID string) (gocore.MappingSpec, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	latest := gocore.MappingSpec{}
	found := false
	for _, record := range s.records {
		if !strings.EqualFold(strings.TrimSpace(record.ProviderID), strings.TrimSpace(providerID)) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(record.Scope.Type), strings.TrimSpace(scope.Type)) || strings.TrimSpace(record.Scope.ID) != strings.TrimSpace(scope.ID) {
			continue
		}
		if strings.TrimSpace(record.SpecID) != strings.TrimSpace(specID) {
			continue
		}
		if !found || record.Version > latest.Version {
			latest = record
			found = true
		}
	}
	return latest, found, nil
}

func (s *workflowMappingSpecStore) ListByScope(_ context.Context, providerID string, scope gocore.ScopeRef) ([]gocore.MappingSpec, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]gocore.MappingSpec, 0)
	for _, record := range s.records {
		if !strings.EqualFold(strings.TrimSpace(record.ProviderID), strings.TrimSpace(providerID)) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(record.Scope.Type), strings.TrimSpace(scope.Type)) || strings.TrimSpace(record.Scope.ID) != strings.TrimSpace(scope.ID) {
			continue
		}
		out = append(out, record)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].SpecID != out[j].SpecID {
			return out[i].SpecID < out[j].SpecID
		}
		return out[i].Version > out[j].Version
	})
	return out, nil
}

func (s *workflowMappingSpecStore) PublishVersion(
	ctx context.Context,
	providerID string,
	scope gocore.ScopeRef,
	specID string,
	version int,
	publishedAt time.Time,
) (gocore.MappingSpec, error) {
	_, _ = ctx, publishedAt
	return s.SetStatus(context.Background(), providerID, scope, specID, version, gocore.MappingSpecStatusPublished, publishedAt)
}

func (s *workflowMappingSpecStore) UnpublishVersion(
	providerID string,
	scope gocore.ScopeRef,
	specID string,
	version int,
	now time.Time,
) (gocore.MappingSpec, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := s.key(providerID, scope, specID, version)
	record, ok := s.records[key]
	if !ok {
		return gocore.MappingSpec{}, fmt.Errorf("core: mapping spec %s version %d not found", specID, version)
	}
	record.Status = gocore.MappingSpecStatusValidated
	record.PublishedAt = nil
	record.UpdatedAt = now.UTC()
	s.records[key] = record
	return record, nil
}

type workflowSyncBindingStore struct {
	mu      sync.Mutex
	records map[string]gocore.SyncBinding
}

func newWorkflowSyncBindingStore() *workflowSyncBindingStore {
	return &workflowSyncBindingStore{records: map[string]gocore.SyncBinding{}}
}

func (s *workflowSyncBindingStore) Upsert(_ context.Context, binding gocore.SyncBinding) (gocore.SyncBinding, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	id := strings.TrimSpace(binding.ID)
	if id == "" {
		id = "binding_" + strings.ReplaceAll(strings.ToLower(strings.TrimSpace(binding.MappingSpecID)), " ", "_")
		if id == "binding_" {
			id = "binding_" + strings.ReplaceAll(strings.ToLower(strings.TrimSpace(binding.SourceObject)), " ", "_")
		}
		binding.ID = id
	}
	existing, ok := s.records[id]
	if ok {
		binding.CreatedAt = existing.CreatedAt
	} else {
		binding.CreatedAt = now
	}
	binding.UpdatedAt = now
	s.records[id] = binding
	return binding, nil
}

func (s *workflowSyncBindingStore) Get(_ context.Context, id string) (gocore.SyncBinding, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.records[strings.TrimSpace(id)]
	if !ok {
		return gocore.SyncBinding{}, fmt.Errorf("core: sync binding %q not found", strings.TrimSpace(id))
	}
	return record, nil
}

func (s *workflowSyncBindingStore) ListByConnection(_ context.Context, connectionID string) ([]gocore.SyncBinding, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]gocore.SyncBinding, 0)
	for _, record := range s.records {
		if strings.TrimSpace(record.ConnectionID) == strings.TrimSpace(connectionID) {
			out = append(out, record)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out, nil
}

func (s *workflowSyncBindingStore) UpdateStatus(_ context.Context, id string, status gocore.SyncBindingStatus, _ string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.records[strings.TrimSpace(id)]
	if !ok {
		return fmt.Errorf("core: sync binding %q not found", strings.TrimSpace(id))
	}
	record.Status = status
	record.UpdatedAt = time.Now().UTC()
	s.records[strings.TrimSpace(id)] = record
	return nil
}

type workflowSyncCheckpointStore struct {
	mu      sync.Mutex
	byID    map[string]gocore.SyncCheckpoint
	latest  map[string]string
	counter int64
}

func newWorkflowSyncCheckpointStore() *workflowSyncCheckpointStore {
	return &workflowSyncCheckpointStore{byID: map[string]gocore.SyncCheckpoint{}, latest: map[string]string{}}
}

func (s *workflowSyncCheckpointStore) latestKey(providerID string, scope gocore.ScopeRef, syncBindingID string, direction gocore.SyncDirection) string {
	return strings.TrimSpace(strings.ToLower(providerID)) + "|" + strings.TrimSpace(strings.ToLower(scope.Type)) + "|" + strings.TrimSpace(scope.ID) + "|" + strings.TrimSpace(syncBindingID) + "|" + strings.TrimSpace(string(direction))
}

func (s *workflowSyncCheckpointStore) Save(_ context.Context, checkpoint gocore.SyncCheckpoint) (gocore.SyncCheckpoint, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	checkpoint.ID = strings.TrimSpace(checkpoint.ID)
	if checkpoint.ID == "" {
		s.counter++
		checkpoint.ID = "checkpoint_" + toString(s.counter)
	}
	if checkpoint.CreatedAt.IsZero() {
		checkpoint.CreatedAt = now
	}
	checkpoint.UpdatedAt = now
	s.byID[checkpoint.ID] = checkpoint
	s.latest[s.latestKey(checkpoint.ProviderID, checkpoint.Scope, checkpoint.SyncBindingID, checkpoint.Direction)] = checkpoint.ID
	return checkpoint, nil
}

func (s *workflowSyncCheckpointStore) GetByID(_ context.Context, providerID string, scope gocore.ScopeRef, id string) (gocore.SyncCheckpoint, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	checkpoint, ok := s.byID[strings.TrimSpace(id)]
	if !ok {
		return gocore.SyncCheckpoint{}, false, nil
	}
	if !strings.EqualFold(strings.TrimSpace(checkpoint.ProviderID), strings.TrimSpace(providerID)) {
		return gocore.SyncCheckpoint{}, false, nil
	}
	if !strings.EqualFold(strings.TrimSpace(checkpoint.Scope.Type), strings.TrimSpace(scope.Type)) || strings.TrimSpace(checkpoint.Scope.ID) != strings.TrimSpace(scope.ID) {
		return gocore.SyncCheckpoint{}, false, nil
	}
	return checkpoint, true, nil
}

func (s *workflowSyncCheckpointStore) GetLatest(_ context.Context, providerID string, scope gocore.ScopeRef, syncBindingID string, direction gocore.SyncDirection) (gocore.SyncCheckpoint, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.latest[s.latestKey(providerID, scope, syncBindingID, direction)]
	if !ok {
		return gocore.SyncCheckpoint{}, false, nil
	}
	checkpoint, ok := s.byID[id]
	if !ok {
		return gocore.SyncCheckpoint{}, false, nil
	}
	return checkpoint, true, nil
}

type workflowSyncChangeLogStore struct {
	mu            sync.Mutex
	byID          map[string]gocore.SyncChangeLogEntry
	byIdempotency map[string]string
	counter       int64
}

func newWorkflowSyncChangeLogStore() *workflowSyncChangeLogStore {
	return &workflowSyncChangeLogStore{byID: map[string]gocore.SyncChangeLogEntry{}, byIdempotency: map[string]string{}}
}

func (s *workflowSyncChangeLogStore) Append(_ context.Context, entry gocore.SyncChangeLogEntry) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := strings.TrimSpace(entry.IdempotencyKey)
	if key != "" {
		if _, ok := s.byIdempotency[key]; ok {
			return false, nil
		}
	}
	s.counter++
	entry.ID = "change_" + toString(s.counter)
	if entry.OccurredAt.IsZero() {
		entry.OccurredAt = time.Now().UTC()
	}
	s.byID[entry.ID] = entry
	if key != "" {
		s.byIdempotency[key] = entry.ID
	}
	return true, nil
}

func (s *workflowSyncChangeLogStore) ListSince(_ context.Context, syncBindingID string, direction gocore.SyncDirection, cursor string, limit int) ([]gocore.SyncChangeLogEntry, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if limit <= 0 {
		limit = 100
	}
	rows := make([]gocore.SyncChangeLogEntry, 0)
	for _, entry := range s.byID {
		if strings.TrimSpace(entry.SyncBindingID) != strings.TrimSpace(syncBindingID) {
			continue
		}
		if entry.Direction != direction {
			continue
		}
		rows = append(rows, entry)
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].OccurredAt.Before(rows[j].OccurredAt) })
	start := 0
	if trimmed := strings.TrimSpace(cursor); trimmed != "" {
		for idx, row := range rows {
			if strings.TrimSpace(row.ID) == trimmed {
				start = idx + 1
				break
			}
		}
	}
	if start >= len(rows) {
		return []gocore.SyncChangeLogEntry{}, "", nil
	}
	end := start + limit
	if end > len(rows) {
		end = len(rows)
	}
	nextCursor := ""
	if end > start {
		nextCursor = rows[end-1].ID
	}
	out := make([]gocore.SyncChangeLogEntry, 0, end-start)
	for _, row := range rows[start:end] {
		out = append(out, row)
	}
	return out, nextCursor, nil
}

type workflowSyncConflictStore struct {
	mu      sync.Mutex
	records map[string]gocore.SyncConflict
	counter int64
}

func newWorkflowSyncConflictStore() *workflowSyncConflictStore {
	return &workflowSyncConflictStore{records: map[string]gocore.SyncConflict{}}
}

func (s *workflowSyncConflictStore) Append(_ context.Context, conflict gocore.SyncConflict) (gocore.SyncConflict, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	if strings.TrimSpace(conflict.ID) == "" {
		s.counter++
		conflict.ID = "conflict_" + toString(s.counter)
	}
	if conflict.CreatedAt.IsZero() {
		conflict.CreatedAt = now
	}
	conflict.UpdatedAt = now
	s.records[conflict.ID] = conflict
	return conflict, nil
}

func (s *workflowSyncConflictStore) Get(_ context.Context, providerID string, scope gocore.ScopeRef, id string) (gocore.SyncConflict, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	conflict, ok := s.records[strings.TrimSpace(id)]
	if !ok {
		return gocore.SyncConflict{}, fmt.Errorf("core: conflict %q not found", strings.TrimSpace(id))
	}
	if !strings.EqualFold(strings.TrimSpace(conflict.ProviderID), strings.TrimSpace(providerID)) ||
		!strings.EqualFold(strings.TrimSpace(conflict.Scope.Type), strings.TrimSpace(scope.Type)) ||
		strings.TrimSpace(conflict.Scope.ID) != strings.TrimSpace(scope.ID) {
		return gocore.SyncConflict{}, fmt.Errorf("core: conflict %q not found", strings.TrimSpace(id))
	}
	return conflict, nil
}

func (s *workflowSyncConflictStore) ListByBinding(
	_ context.Context,
	providerID string,
	scope gocore.ScopeRef,
	syncBindingID string,
	status gocore.SyncConflictStatus,
) ([]gocore.SyncConflict, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := make([]gocore.SyncConflict, 0)
	for _, record := range s.records {
		if !strings.EqualFold(strings.TrimSpace(record.ProviderID), strings.TrimSpace(providerID)) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(record.Scope.Type), strings.TrimSpace(scope.Type)) || strings.TrimSpace(record.Scope.ID) != strings.TrimSpace(scope.ID) {
			continue
		}
		if strings.TrimSpace(syncBindingID) != "" && strings.TrimSpace(record.SyncBindingID) != strings.TrimSpace(syncBindingID) {
			continue
		}
		if status != "" && record.Status != status {
			continue
		}
		rows = append(rows, record)
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].UpdatedAt.After(rows[j].UpdatedAt) })
	return rows, nil
}

func (s *workflowSyncConflictStore) Resolve(
	_ context.Context,
	providerID string,
	scope gocore.ScopeRef,
	id string,
	resolution gocore.SyncConflictResolution,
	resolvedAt time.Time,
) (gocore.SyncConflict, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	conflict, ok := s.records[strings.TrimSpace(id)]
	if !ok {
		return gocore.SyncConflict{}, fmt.Errorf("core: conflict %q not found", strings.TrimSpace(id))
	}
	if !strings.EqualFold(strings.TrimSpace(conflict.ProviderID), strings.TrimSpace(providerID)) ||
		!strings.EqualFold(strings.TrimSpace(conflict.Scope.Type), strings.TrimSpace(scope.Type)) ||
		strings.TrimSpace(conflict.Scope.ID) != strings.TrimSpace(scope.ID) {
		return gocore.SyncConflict{}, fmt.Errorf("core: conflict %q not found", strings.TrimSpace(id))
	}
	conflict.Resolution = copyAnyMap(resolution.Patch)
	conflict.ResolvedBy = strings.TrimSpace(resolution.ResolvedBy)
	resolved := resolvedAt.UTC()
	conflict.ResolvedAt = &resolved
	switch resolution.Action {
	case gocore.SyncConflictResolutionIgnore:
		conflict.Status = gocore.SyncConflictStatusIgnored
	case gocore.SyncConflictResolutionRetry:
		conflict.Status = gocore.SyncConflictStatusPending
	default:
		conflict.Status = gocore.SyncConflictStatusResolved
	}
	conflict.UpdatedAt = resolved
	s.records[conflict.ID] = conflict
	return conflict, nil
}

func (s *workflowSyncConflictStore) List(providerID string, scope gocore.ScopeRef, syncBindingID string, status gocore.SyncConflictStatus) []gocore.SyncConflict {
	rows, _ := s.ListByBinding(context.Background(), providerID, scope, syncBindingID, status)
	return rows
}

var _ gocore.MappingSpecStore = (*workflowMappingSpecStore)(nil)
var _ gocore.SyncBindingStore = (*workflowSyncBindingStore)(nil)
var _ gocore.SyncCheckpointStore = (*workflowSyncCheckpointStore)(nil)
var _ gocore.SyncChangeLogStore = (*workflowSyncChangeLogStore)(nil)
var _ gocore.SyncConflictStore = (*workflowSyncConflictStore)(nil)
