package admin

import (
	"context"
	"strconv"
	"strings"

	workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"
	"github.com/goliatone/go-command/flow"
)

// WorkflowRuntime exposes persisted workflow definition/binding operations.
type WorkflowRuntime interface {
	ListWorkflows(ctx context.Context, opts PersistedWorkflowListOptions) ([]PersistedWorkflow, int, error)
	CreateWorkflow(ctx context.Context, workflow PersistedWorkflow) (PersistedWorkflow, error)
	UpdateWorkflow(ctx context.Context, workflow PersistedWorkflow, expectedVersion int) (PersistedWorkflow, error)
	RollbackWorkflow(ctx context.Context, id string, targetVersion, expectedVersion int) (PersistedWorkflow, error)

	ListBindings(ctx context.Context, opts WorkflowBindingListOptions) ([]WorkflowBinding, int, error)
	CreateBinding(ctx context.Context, binding WorkflowBinding) (WorkflowBinding, error)
	UpdateBinding(ctx context.Context, binding WorkflowBinding, expectedVersion int) (WorkflowBinding, error)
	DeleteBinding(ctx context.Context, id string) error

	ResolveBinding(ctx context.Context, input WorkflowBindingResolveInput) (WorkflowBindingResolution, error)
	BindWorkflowEngine(engine WorkflowEngine) error
}

// WorkflowRuntimeService orchestrates persisted workflow definitions + bindings.
type WorkflowRuntimeService struct {
	workflows WorkflowDefinitionRepository
	bindings  WorkflowBindingRepository
	registrar WorkflowRegistrar
	authoring flow.AuthoringStore
}

// NewWorkflowRuntimeService constructs a runtime service (in-memory when nil repos are passed).
func NewWorkflowRuntimeService(workflows WorkflowDefinitionRepository, bindings WorkflowBindingRepository) *WorkflowRuntimeService {
	if workflows == nil {
		workflows = NewInMemoryWorkflowDefinitionRepository()
	}
	if bindings == nil {
		bindings = NewInMemoryWorkflowBindingRepository()
	}
	authoring := flow.AuthoringStore(flow.NewInMemoryAuthoringStore())
	if bunRepo, ok := workflows.(*BunWorkflowDefinitionRepository); ok && bunRepo != nil && bunRepo.db != nil {
		authoring = NewBunWorkflowAuthoringStore(bunRepo.db)
	}
	return &WorkflowRuntimeService{
		workflows: workflows,
		bindings:  bindings,
		authoring: authoring,
	}
}

// AuthoringStore exposes the canonical authoring persistence backend used by RPC authoring APIs.
func (s *WorkflowRuntimeService) AuthoringStore() flow.AuthoringStore {
	if s == nil {
		return nil
	}
	return s.authoring
}

// SetAuthoringStore overrides the authoring store implementation.
func (s *WorkflowRuntimeService) SetAuthoringStore(store flow.AuthoringStore) {
	if s == nil {
		return
	}
	s.authoring = store
}

func (s *WorkflowRuntimeService) ListWorkflows(ctx context.Context, opts PersistedWorkflowListOptions) ([]PersistedWorkflow, int, error) {
	if s == nil || s.workflows == nil {
		return nil, 0, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	return s.workflows.List(ctx, opts)
}

func (s *WorkflowRuntimeService) CreateWorkflow(ctx context.Context, workflow PersistedWorkflow) (PersistedWorkflow, error) {
	if s == nil || s.workflows == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	next, validationErr := s.normalizeAndValidateWorkflow(workflow)
	if validationErr != nil {
		return PersistedWorkflow{}, validationErr
	}

	created, err := s.workflows.Create(ctx, next)
	if err != nil {
		return PersistedWorkflow{}, err
	}
	s.registerActiveWorkflow(created)
	return created, nil
}

func (s *WorkflowRuntimeService) UpdateWorkflow(ctx context.Context, workflow PersistedWorkflow, expectedVersion int) (PersistedWorkflow, error) {
	if s == nil || s.workflows == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	if expectedVersion <= 0 {
		return PersistedWorkflow{}, validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}

	id := strings.TrimSpace(workflow.ID)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}
	current, err := s.workflows.Get(ctx, id)
	if err != nil {
		return PersistedWorkflow{}, err
	}

	next := workflowcore.NormalizePersistedWorkflow(workflow)
	next.ID = current.ID
	if next.Name == "" {
		next.Name = current.Name
	}
	if next.Status == "" {
		next.Status = current.Status
	}
	if strings.TrimSpace(next.Environment) == "" {
		next.Environment = current.Environment
	}
	if strings.TrimSpace(next.Definition.InitialState) == "" && len(next.Definition.Transitions) == 0 {
		next.Definition = workflowcore.CloneWorkflowDefinition(current.Definition)
	}

	next, validationErr := s.normalizeAndValidateWorkflow(next)
	if validationErr != nil {
		return PersistedWorkflow{}, validationErr
	}

	updated, err := s.workflows.Update(ctx, next, expectedVersion)
	if err != nil {
		return PersistedWorkflow{}, err
	}
	s.registerActiveWorkflow(updated)
	return updated, nil
}

func (s *WorkflowRuntimeService) RollbackWorkflow(ctx context.Context, id string, targetVersion, expectedVersion int) (PersistedWorkflow, error) {
	if s == nil || s.workflows == nil {
		return PersistedWorkflow{}, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return PersistedWorkflow{}, requiredFieldDomainError("id", nil)
	}
	if targetVersion <= 0 {
		return PersistedWorkflow{}, validationDomainError("target_version must be > 0", map[string]any{"field": "target_version"})
	}

	current, err := s.workflows.Get(ctx, id)
	if err != nil {
		return PersistedWorkflow{}, err
	}
	if expectedVersion <= 0 {
		expectedVersion = current.Version
	}

	target, err := s.workflows.GetVersion(ctx, id, targetVersion)
	if err != nil {
		if err == ErrNotFound {
			return PersistedWorkflow{}, ErrWorkflowRollbackVersionNotFound
		}
		return PersistedWorkflow{}, err
	}

	restored := current
	restored.Name = target.Name
	restored.Definition = workflowcore.CloneWorkflowDefinition(target.Definition)
	restored.Status = target.Status
	restored.Environment = target.Environment

	updated, err := s.workflows.Update(ctx, restored, expectedVersion)
	if err != nil {
		return PersistedWorkflow{}, err
	}
	s.registerActiveWorkflow(updated)
	return updated, nil
}

func (s *WorkflowRuntimeService) ListBindings(ctx context.Context, opts WorkflowBindingListOptions) ([]WorkflowBinding, int, error) {
	if s == nil || s.bindings == nil {
		return nil, 0, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	return s.bindings.List(ctx, opts)
}

func (s *WorkflowRuntimeService) CreateBinding(ctx context.Context, binding WorkflowBinding) (WorkflowBinding, error) {
	if s == nil || s.bindings == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	next, validationErr := s.normalizeAndValidateBinding(ctx, binding)
	if validationErr != nil {
		return WorkflowBinding{}, validationErr
	}
	return s.bindings.Create(ctx, next)
}

func (s *WorkflowRuntimeService) UpdateBinding(ctx context.Context, binding WorkflowBinding, expectedVersion int) (WorkflowBinding, error) {
	if s == nil || s.bindings == nil {
		return WorkflowBinding{}, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	if expectedVersion <= 0 {
		return WorkflowBinding{}, validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	id := strings.TrimSpace(binding.ID)
	if id == "" {
		return WorkflowBinding{}, requiredFieldDomainError("id", nil)
	}
	current, err := s.bindings.Get(ctx, id)
	if err != nil {
		return WorkflowBinding{}, err
	}

	next := normalizeWorkflowBinding(binding)
	next.ID = current.ID
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

	next, validationErr := s.normalizeAndValidateBinding(ctx, next)
	if validationErr != nil {
		return WorkflowBinding{}, validationErr
	}
	return s.bindings.Update(ctx, next, expectedVersion)
}

func (s *WorkflowRuntimeService) DeleteBinding(ctx context.Context, id string) error {
	if s == nil || s.bindings == nil {
		return serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	return s.bindings.Delete(ctx, id)
}

func (s *WorkflowRuntimeService) ResolveBinding(ctx context.Context, input WorkflowBindingResolveInput) (WorkflowBindingResolution, error) {
	if s == nil || s.bindings == nil || s.workflows == nil {
		return WorkflowBindingResolution{}, serviceNotConfiguredDomainError("workflow runtime", nil)
	}
	contentType := strings.ToLower(strings.TrimSpace(input.ContentType))
	environment := strings.ToLower(strings.TrimSpace(input.Environment))
	traits := workflowcore.NormalizeBindingTraits(input.Traits)

	activeBindings, _, err := s.bindings.List(ctx, WorkflowBindingListOptions{
		Status: WorkflowBindingStatusActive,
	})
	if err != nil {
		return WorkflowBindingResolution{}, err
	}

	if contentType != "" {
		candidates := workflowcore.BindingCandidates(activeBindings, WorkflowBindingScopeContentType, contentType, environment)
		if resolution, ok, err := s.resolveFirstActiveBinding(ctx, candidates, workflowcore.ResolutionSourceBindingContentType); err != nil {
			return WorkflowBindingResolution{}, err
		} else if ok {
			return resolution, nil
		}
	}
	for _, trait := range traits {
		candidates := workflowcore.BindingCandidates(activeBindings, WorkflowBindingScopeTrait, trait, environment)
		if resolution, ok, err := s.resolveFirstActiveBinding(ctx, candidates, workflowcore.ResolutionSourceBindingTrait); err != nil {
			return WorkflowBindingResolution{}, err
		} else if ok {
			return resolution, nil
		}
	}
	if candidates := workflowcore.BindingCandidates(activeBindings, WorkflowBindingScopeGlobal, "", environment); len(candidates) > 0 {
		if resolution, ok, err := s.resolveFirstActiveBinding(ctx, candidates, workflowcore.ResolutionSourceBindingGlobal); err != nil {
			return WorkflowBindingResolution{}, err
		} else if ok {
			return resolution, nil
		}
	}

	return WorkflowBindingResolution{}, nil
}

func (s *WorkflowRuntimeService) BindWorkflowEngine(engine WorkflowEngine) error {
	if s == nil {
		return nil
	}
	if engine == nil {
		s.registrar = nil
		return nil
	}
	registrar, ok := engine.(WorkflowRegistrar)
	if !ok {
		return validationDomainError("workflow runtime requires a registrar-capable engine", map[string]any{
			"field": "workflow_engine",
		})
	}
	s.registrar = registrar
	return s.syncActiveDefinitions(context.Background())
}

func (s *WorkflowRuntimeService) syncActiveDefinitions(ctx context.Context) error {
	if s == nil || s.registrar == nil || s.workflows == nil {
		return nil
	}
	workflows, _, err := s.workflows.List(ctx, PersistedWorkflowListOptions{Status: WorkflowStatusActive})
	if err != nil {
		return err
	}
	for _, workflow := range workflows {
		s.registerActiveWorkflow(workflow)
	}
	return nil
}

func (s *WorkflowRuntimeService) registerActiveWorkflow(workflow PersistedWorkflow) {
	if s == nil || s.registrar == nil || workflow.Status != WorkflowStatusActive {
		return
	}
	def := workflowcore.CloneWorkflowDefinition(workflow.Definition)
	def.EntityType = workflowcore.CanonicalMachineIDForWorkflow(workflow)
	def.MachineVersion = workflowcore.CanonicalMachineVersionForWorkflow(workflow)
	_ = s.registrar.RegisterWorkflow(def.EntityType, def)
}

func (s *WorkflowRuntimeService) normalizeAndValidateWorkflow(workflow PersistedWorkflow) (PersistedWorkflow, error) {
	next := workflowcore.NormalizePersistedWorkflow(workflow)
	if next.Status == "" {
		next.Status = WorkflowStatusDraft
	}
	if next.Version <= 0 {
		next.Version = 1
	}
	next.MachineID = workflowcore.CanonicalMachineIDForWorkflow(next)
	next.MachineVersion = workflowcore.CanonicalMachineVersionForWorkflow(next)
	next.Definition.EntityType = next.MachineID
	next.Definition.MachineVersion = next.MachineVersion

	fields := map[string]string{}
	if next.ID == "" {
		fields["id"] = "required"
	}
	if next.Name == "" {
		fields["name"] = "required"
	}
	if !next.Status.IsValid() {
		fields["status"] = "must be one of draft|active|deprecated"
	}
	if next.Version <= 0 {
		fields["version"] = "must be > 0"
	}
	if strings.TrimSpace(next.Definition.InitialState) == "" {
		fields["definition.initial_state"] = "required"
	}
	if len(next.Definition.Transitions) == 0 {
		fields["definition.transitions"] = "must include at least one transition"
	}
	names := map[string]struct{}{}
	for i, transition := range next.Definition.Transitions {
		prefix := "definition.transitions[" + strconv.Itoa(i) + "]"
		if strings.TrimSpace(transition.Name) == "" {
			fields[prefix+".name"] = "required"
		}
		if strings.TrimSpace(transition.From) == "" {
			fields[prefix+".from"] = "required"
		}
		to := strings.TrimSpace(transition.To)
		dynamicTo := strings.TrimSpace(transition.DynamicTo)
		if to == "" && dynamicTo == "" {
			fields[prefix+".to"] = "required when dynamic_to is empty"
		}
		if to != "" && dynamicTo != "" {
			fields[prefix+".to"] = "cannot be set with dynamic_to"
		}
		name := strings.ToLower(strings.TrimSpace(transition.Name))
		if name == "" {
			continue
		}
		if _, exists := names[name]; exists {
			fields[prefix+".name"] = "must be unique within workflow"
			continue
		}
		names[name] = struct{}{}
	}
	if len(fields) > 0 {
		return PersistedWorkflow{}, WorkflowValidationErrors{Fields: fields}
	}
	return next, nil
}

func (s *WorkflowRuntimeService) normalizeAndValidateBinding(ctx context.Context, binding WorkflowBinding) (WorkflowBinding, error) {
	next := workflowcore.NormalizeWorkflowBinding(binding)
	if next.Status == "" {
		next.Status = WorkflowBindingStatusActive
	}
	if next.Version <= 0 {
		next.Version = 1
	}
	fields := map[string]string{}
	if next.ScopeType == "" {
		fields["scope_type"] = "required"
	} else if !next.ScopeType.IsValid() {
		fields["scope_type"] = "must be one of trait|content_type|global"
	}
	if next.ScopeType == WorkflowBindingScopeTrait || next.ScopeType == WorkflowBindingScopeContentType {
		if strings.TrimSpace(next.ScopeRef) == "" {
			fields["scope_ref"] = "required for scope_type " + string(next.ScopeType)
		}
	}
	if next.ScopeType == WorkflowBindingScopeGlobal && strings.TrimSpace(next.ScopeRef) == "" {
		next.ScopeRef = "global"
	}
	if strings.TrimSpace(next.WorkflowID) == "" {
		fields["workflow_id"] = "required"
	}
	if next.Priority < 0 {
		fields["priority"] = "must be >= 0"
	}
	if !next.Status.IsValid() {
		fields["status"] = "must be one of active|inactive"
	}

	if len(fields) == 0 && strings.TrimSpace(next.WorkflowID) != "" {
		workflow, err := s.workflows.Get(ctx, next.WorkflowID)
		if err != nil {
			fields["workflow_id"] = "unknown workflow id"
		} else if next.Status == WorkflowBindingStatusActive && workflow.Status != WorkflowStatusActive {
			fields["workflow_id"] = "must reference an active workflow for active bindings"
		}
	}

	if len(fields) > 0 {
		return WorkflowBinding{}, WorkflowValidationErrors{Fields: fields}
	}
	return next, nil
}

func (s *WorkflowRuntimeService) resolveFirstActiveBinding(ctx context.Context, candidates []WorkflowBinding, source string) (WorkflowBindingResolution, bool, error) {
	for _, binding := range candidates {
		workflow, err := s.workflows.Get(ctx, binding.WorkflowID)
		if err != nil {
			if err == ErrNotFound {
				continue
			}
			return WorkflowBindingResolution{}, false, err
		}
		if workflow.Status != WorkflowStatusActive {
			continue
		}
		return workflowcore.BindingResolutionFrom(binding, workflow, source), true, nil
	}
	return WorkflowBindingResolution{}, false, nil
}
