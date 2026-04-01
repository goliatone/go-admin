package admin

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"
)

// WorkflowDefinitionRepository stores persisted workflow definitions.
type WorkflowDefinitionRepository interface {
	List(ctx context.Context, opts PersistedWorkflowListOptions) ([]PersistedWorkflow, int, error)
	Get(ctx context.Context, id string) (PersistedWorkflow, error)
	GetVersion(ctx context.Context, id string, version int) (PersistedWorkflow, error)
	Create(ctx context.Context, workflow PersistedWorkflow) (PersistedWorkflow, error)
	Update(ctx context.Context, workflow PersistedWorkflow, expectedVersion int) (PersistedWorkflow, error)
}

// WorkflowBindingRepository stores workflow scope bindings.
type WorkflowBindingRepository interface {
	List(ctx context.Context, opts WorkflowBindingListOptions) ([]WorkflowBinding, int, error)
	ListByScope(ctx context.Context, scopeType WorkflowBindingScopeType, scopeRef string, status WorkflowBindingStatus) ([]WorkflowBinding, error)
	Get(ctx context.Context, id string) (WorkflowBinding, error)
	Create(ctx context.Context, binding WorkflowBinding) (WorkflowBinding, error)
	Update(ctx context.Context, binding WorkflowBinding, expectedVersion int) (WorkflowBinding, error)
	Delete(ctx context.Context, id string) error
}

// InMemoryWorkflowDefinitionRepository stores workflows with revision snapshots.
type InMemoryWorkflowDefinitionRepository struct {
	mu        sync.RWMutex
	nextID    int64
	byID      map[string]PersistedWorkflow
	revisions map[string]map[int]PersistedWorkflow
}

// NewInMemoryWorkflowDefinitionRepository constructs an empty workflow definition store.
func NewInMemoryWorkflowDefinitionRepository() *InMemoryWorkflowDefinitionRepository {
	return &InMemoryWorkflowDefinitionRepository{
		nextID:    1,
		byID:      map[string]PersistedWorkflow{},
		revisions: map[string]map[int]PersistedWorkflow{},
	}
}

func (r *InMemoryWorkflowDefinitionRepository) List(_ context.Context, opts PersistedWorkflowListOptions) ([]PersistedWorkflow, int, error) {
	if r == nil {
		return nil, 0, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	r.mu.RLock()
	defer r.mu.RUnlock()

	status := PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(string(opts.Status))))
	environment := strings.TrimSpace(strings.ToLower(opts.Environment))

	out := make([]PersistedWorkflow, 0, len(r.byID))
	for _, workflow := range r.byID {
		if status != "" && workflow.Status != status {
			continue
		}
		if environment != "" && strings.ToLower(strings.TrimSpace(workflow.Environment)) != environment {
			continue
		}
		out = append(out, workflowcore.ClonePersistedWorkflow(workflow))
	}

	sort.SliceStable(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		if left.ID == right.ID {
			return left.Version > right.Version
		}
		return left.ID < right.ID
	})

	return out, len(out), nil
}

func (r *InMemoryWorkflowDefinitionRepository) Get(_ context.Context, id string) (PersistedWorkflow, error) {
	if r == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	workflow, ok := r.byID[id]
	if !ok {
		return PersistedWorkflow{}, ErrNotFound
	}
	return workflowcore.ClonePersistedWorkflow(workflow), nil
}

func (r *InMemoryWorkflowDefinitionRepository) GetVersion(_ context.Context, id string, version int) (PersistedWorkflow, error) {
	if r == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}
	if version <= 0 {
		return PersistedWorkflow{}, validationDomainError("version must be > 0", map[string]any{"field": "version"})
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	versions := r.revisions[id]
	if len(versions) == 0 {
		return PersistedWorkflow{}, ErrNotFound
	}
	workflow, ok := versions[version]
	if !ok {
		return PersistedWorkflow{}, ErrNotFound
	}
	return workflowcore.ClonePersistedWorkflow(workflow), nil
}

func (r *InMemoryWorkflowDefinitionRepository) Create(_ context.Context, workflow PersistedWorkflow) (PersistedWorkflow, error) {
	if r == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	next := workflowcore.NormalizePersistedWorkflow(workflow)
	if next.ID == "" {
		next.ID = "wf_" + strconv.FormatInt(r.nextID, 10)
		r.nextID++
	}
	if _, exists := r.byID[next.ID]; exists {
		return PersistedWorkflow{}, conflictDomainError("workflow already exists", map[string]any{"id": next.ID})
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
	next.Definition = workflowcore.CloneWorkflowDefinition(next.Definition)
	r.byID[next.ID] = workflowcore.ClonePersistedWorkflow(next)
	r.recordRevisionLocked(next)
	return workflowcore.ClonePersistedWorkflow(next), nil
}

func (r *InMemoryWorkflowDefinitionRepository) Update(_ context.Context, workflow PersistedWorkflow, expectedVersion int) (PersistedWorkflow, error) {
	if r == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow definition repository", nil)
	}
	if expectedVersion <= 0 {
		return PersistedWorkflow{}, validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := strings.TrimSpace(workflow.ID)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}
	current, ok := r.byID[id]
	if !ok {
		return PersistedWorkflow{}, ErrNotFound
	}
	if current.Version != expectedVersion {
		return PersistedWorkflow{}, WorkflowVersionConflictError{
			WorkflowID:      current.ID,
			ExpectedVersion: expectedVersion,
			ActualVersion:   current.Version,
		}
	}

	next := workflowcore.NormalizePersistedWorkflow(workflow)
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
		next.Definition = workflowcore.CloneWorkflowDefinition(current.Definition)
	}

	r.byID[id] = workflowcore.ClonePersistedWorkflow(next)
	r.recordRevisionLocked(next)
	return workflowcore.ClonePersistedWorkflow(next), nil
}

func (r *InMemoryWorkflowDefinitionRepository) recordRevisionLocked(workflow PersistedWorkflow) {
	if r.revisions == nil {
		r.revisions = map[string]map[int]PersistedWorkflow{}
	}
	if r.revisions[workflow.ID] == nil {
		r.revisions[workflow.ID] = map[int]PersistedWorkflow{}
	}
	r.revisions[workflow.ID][workflow.Version] = workflowcore.ClonePersistedWorkflow(workflow)
}

// InMemoryWorkflowBindingRepository stores scope bindings with active uniqueness.
type InMemoryWorkflowBindingRepository struct {
	mu     sync.RWMutex
	nextID int64
	byID   map[string]WorkflowBinding
}

// NewInMemoryWorkflowBindingRepository constructs an empty binding store.
func NewInMemoryWorkflowBindingRepository() *InMemoryWorkflowBindingRepository {
	return &InMemoryWorkflowBindingRepository{
		nextID: 1,
		byID:   map[string]WorkflowBinding{},
	}
}

func (r *InMemoryWorkflowBindingRepository) List(_ context.Context, opts WorkflowBindingListOptions) ([]WorkflowBinding, int, error) {
	if r == nil {
		return nil, 0, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	r.mu.RLock()
	defer r.mu.RUnlock()

	scopeType := WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(string(opts.ScopeType))))
	scopeRef := strings.ToLower(strings.TrimSpace(opts.ScopeRef))
	environment := strings.ToLower(strings.TrimSpace(opts.Environment))
	status := WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(string(opts.Status))))

	out := make([]WorkflowBinding, 0, len(r.byID))
	for _, binding := range r.byID {
		if scopeType != "" && binding.ScopeType != scopeType {
			continue
		}
		if scopeRef != "" && strings.ToLower(strings.TrimSpace(binding.ScopeRef)) != scopeRef {
			continue
		}
		if environment != "" && strings.ToLower(strings.TrimSpace(binding.Environment)) != environment {
			continue
		}
		if status != "" && binding.Status != status {
			continue
		}
		out = append(out, workflowcore.CloneWorkflowBinding(binding))
	}

	workflowcore.SortWorkflowBindingsForResolution(out)
	return out, len(out), nil
}

func (r *InMemoryWorkflowBindingRepository) ListByScope(_ context.Context, scopeType WorkflowBindingScopeType, scopeRef string, status WorkflowBindingStatus) ([]WorkflowBinding, error) {
	if r == nil {
		return nil, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	r.mu.RLock()
	defer r.mu.RUnlock()

	scopeType = WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(string(scopeType))))
	scopeRef = strings.ToLower(strings.TrimSpace(scopeRef))
	status = WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(string(status))))

	out := []WorkflowBinding{}
	for _, binding := range r.byID {
		if scopeType != "" && binding.ScopeType != scopeType {
			continue
		}
		if scopeRef != "" && strings.ToLower(strings.TrimSpace(binding.ScopeRef)) != scopeRef {
			continue
		}
		if status != "" && binding.Status != status {
			continue
		}
		out = append(out, workflowcore.CloneWorkflowBinding(binding))
	}
	workflowcore.SortWorkflowBindingsForResolution(out)
	return out, nil
}

func (r *InMemoryWorkflowBindingRepository) Get(_ context.Context, id string) (WorkflowBinding, error) {
	if r == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return WorkflowBinding{}, requiredFieldDomainError("id", nil)
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	binding, ok := r.byID[id]
	if !ok {
		return WorkflowBinding{}, ErrNotFound
	}
	return workflowcore.CloneWorkflowBinding(binding), nil
}

func (r *InMemoryWorkflowBindingRepository) Create(_ context.Context, binding WorkflowBinding) (WorkflowBinding, error) {
	if r == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	next := workflowcore.NormalizeWorkflowBinding(binding)
	if next.ID == "" {
		next.ID = "wfb_" + strconv.FormatInt(r.nextID, 10)
		r.nextID++
	}
	if _, exists := r.byID[next.ID]; exists {
		return WorkflowBinding{}, conflictDomainError("workflow binding already exists", map[string]any{"id": next.ID})
	}
	if err := r.ensureNoActiveBindingConflictLocked(next, ""); err != nil {
		return WorkflowBinding{}, err
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
	r.byID[next.ID] = workflowcore.CloneWorkflowBinding(next)
	return workflowcore.CloneWorkflowBinding(next), nil
}

func (r *InMemoryWorkflowBindingRepository) Update(_ context.Context, binding WorkflowBinding, expectedVersion int) (WorkflowBinding, error) {
	if r == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	if expectedVersion <= 0 {
		return WorkflowBinding{}, validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	id := strings.TrimSpace(binding.ID)
	if id == "" {
		return WorkflowBinding{}, requiredFieldDomainError("id", nil)
	}
	current, ok := r.byID[id]
	if !ok {
		return WorkflowBinding{}, ErrNotFound
	}
	if current.Version != expectedVersion {
		return WorkflowBinding{}, WorkflowBindingVersionConflictError{
			BindingID:       current.ID,
			ExpectedVersion: expectedVersion,
			ActualVersion:   current.Version,
		}
	}

	next := workflowcore.NormalizeWorkflowBinding(binding)
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
	if next.Priority == 0 {
		next.Priority = current.Priority
	}
	if next.Status == "" {
		next.Status = current.Status
	}
	if strings.TrimSpace(next.Environment) == "" {
		next.Environment = current.Environment
	}

	if err := r.ensureNoActiveBindingConflictLocked(next, current.ID); err != nil {
		return WorkflowBinding{}, err
	}
	r.byID[id] = workflowcore.CloneWorkflowBinding(next)
	return workflowcore.CloneWorkflowBinding(next), nil
}

func (r *InMemoryWorkflowBindingRepository) Delete(_ context.Context, id string) error {
	if r == nil {
		return serviceNotConfiguredDomainError("workflow binding repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return requiredFieldDomainError("id", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.byID[id]; !exists {
		return ErrNotFound
	}
	delete(r.byID, id)
	return nil
}

func (r *InMemoryWorkflowBindingRepository) ensureNoActiveBindingConflictLocked(binding WorkflowBinding, skipID string) error {
	if binding.Status != WorkflowBindingStatusActive {
		return nil
	}
	key := workflowcore.WorkflowBindingConflictKey(binding)
	for id, existing := range r.byID {
		if id == skipID {
			continue
		}
		if existing.Status != WorkflowBindingStatusActive {
			continue
		}
		if workflowcore.WorkflowBindingConflictKey(existing) != key {
			continue
		}
		return WorkflowBindingConflictError{
			BindingID:         binding.ID,
			ExistingBindingID: existing.ID,
			ScopeType:         binding.ScopeType,
			ScopeRef:          binding.ScopeRef,
			Environment:       binding.Environment,
			Priority:          binding.Priority,
		}
	}
	return nil
}
