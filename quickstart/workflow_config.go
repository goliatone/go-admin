package quickstart

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"gopkg.in/yaml.v3"
)

// ErrWorkflowConfig indicates workflow config parsing/normalization issues.
var ErrWorkflowConfig = errors.New("workflow config invalid")

// WorkflowConfigSchemaVersionCurrent is the current schema version for external workflow config.
const WorkflowConfigSchemaVersionCurrent = 1

// WorkflowConfigSchemaVersionMinimumSupported is the oldest accepted schema version.
const WorkflowConfigSchemaVersionMinimumSupported = 0

// WorkflowConfig captures external workflow definitions and trait workflow defaults.
type WorkflowConfig struct {
	SchemaVersion int                               `json:"schema_version,omitempty" yaml:"schema_version,omitempty"`
	Workflows     map[string]WorkflowDefinitionSpec `json:"workflows,omitempty" yaml:"workflows,omitempty"`
	TraitDefaults map[string]string                 `json:"trait_defaults,omitempty" yaml:"trait_defaults,omitempty"`
}

// WorkflowDefinitionSpec describes one workflow definition declared in config.
// The map key under WorkflowConfig.Workflows is treated as workflow ID unless ID is set.
type WorkflowDefinitionSpec struct {
	ID           string                   `json:"id,omitempty" yaml:"id,omitempty"`
	InitialState string                   `json:"initial_state,omitempty" yaml:"initial_state,omitempty"`
	Transitions  []WorkflowTransitionSpec `json:"transitions,omitempty" yaml:"transitions,omitempty"`
}

// WorkflowTransitionSpec describes one workflow transition in external config.
type WorkflowTransitionSpec struct {
	Name        string `json:"name,omitempty" yaml:"name,omitempty"`
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
	From        string `json:"from,omitempty" yaml:"from,omitempty"`
	To          string `json:"to,omitempty" yaml:"to,omitempty"`
	Guard       string `json:"guard,omitempty" yaml:"guard,omitempty"`
}

type workflowConfigWire struct {
	SchemaVersion         int                               `json:"schema_version,omitempty" yaml:"schema_version,omitempty"`
	Workflows             map[string]WorkflowDefinitionSpec `json:"workflows,omitempty" yaml:"workflows,omitempty"`
	TraitDefaults         map[string]string                 `json:"trait_defaults,omitempty" yaml:"trait_defaults,omitempty"`
	TraitWorkflowDefaults map[string]string                 `json:"trait_workflow_defaults,omitempty" yaml:"trait_workflow_defaults,omitempty"`
}

// WorkflowConfigValidationIssue reports one actionable field-level validation issue.
type WorkflowConfigValidationIssue struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// WorkflowConfigValidationError aggregates config validation issues.
type WorkflowConfigValidationError struct {
	Issues []WorkflowConfigValidationIssue `json:"issues"`
}

func (e WorkflowConfigValidationError) Error() string {
	if len(e.Issues) == 0 {
		return ErrWorkflowConfig.Error()
	}
	parts := make([]string, 0, len(e.Issues))
	for _, issue := range e.Issues {
		field := strings.TrimSpace(issue.Field)
		message := strings.TrimSpace(issue.Message)
		if field == "" {
			parts = append(parts, message)
			continue
		}
		parts = append(parts, fmt.Sprintf("%s: %s", field, message))
	}
	return fmt.Sprintf("%s (%s)", ErrWorkflowConfig.Error(), strings.Join(parts, "; "))
}

func (e WorkflowConfigValidationError) Is(target error) bool {
	return target == ErrWorkflowConfig
}

type workflowConfigError struct {
	Reason string
	Cause  error
}

func (e workflowConfigError) Error() string {
	reason := strings.TrimSpace(e.Reason)
	if reason == "" && e.Cause != nil {
		reason = e.Cause.Error()
	}
	if reason == "" {
		return ErrWorkflowConfig.Error()
	}
	return fmt.Sprintf("%s (%s)", ErrWorkflowConfig.Error(), reason)
}

func (e workflowConfigError) Unwrap() error {
	if e.Cause != nil {
		return e.Cause
	}
	return ErrWorkflowConfig
}

func (e workflowConfigError) Is(target error) bool {
	return target == ErrWorkflowConfig || errors.Is(e.Cause, target)
}

// DefaultWorkflowConfig returns an empty config with current schema version.
func DefaultWorkflowConfig() WorkflowConfig {
	return WorkflowConfig{
		SchemaVersion: WorkflowConfigSchemaVersionCurrent,
	}
}

// MergeWorkflowConfigs merges two configs where override values win.
func MergeWorkflowConfigs(base WorkflowConfig, override WorkflowConfig) WorkflowConfig {
	base = NormalizeWorkflowConfig(base)
	override = NormalizeWorkflowConfig(override)

	merged := WorkflowConfig{
		SchemaVersion: base.SchemaVersion,
		Workflows:     map[string]WorkflowDefinitionSpec{},
		TraitDefaults: map[string]string{},
	}
	if override.SchemaVersion != 0 {
		merged.SchemaVersion = override.SchemaVersion
	}
	for _, key := range sortedKeys(base.Workflows) {
		merged.Workflows[key] = base.Workflows[key]
	}
	for _, key := range sortedKeys(override.Workflows) {
		merged.Workflows[key] = override.Workflows[key]
	}
	for _, key := range sortedKeys(base.TraitDefaults) {
		merged.TraitDefaults[key] = base.TraitDefaults[key]
	}
	for _, key := range sortedKeys(override.TraitDefaults) {
		merged.TraitDefaults[key] = override.TraitDefaults[key]
	}

	if len(merged.Workflows) == 0 {
		merged.Workflows = nil
	}
	if len(merged.TraitDefaults) == 0 {
		merged.TraitDefaults = nil
	}

	return NormalizeWorkflowConfig(merged)
}

// LoadWorkflowConfigFile parses a JSON/YAML workflow config file.
func LoadWorkflowConfigFile(path string) (WorkflowConfig, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return DefaultWorkflowConfig(), nil
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return WorkflowConfig{}, err
	}
	return ParseWorkflowConfigContents(raw, strings.ToLower(filepath.Ext(path)))
}

// ParseWorkflowConfigContents parses JSON/YAML workflow config contents.
func ParseWorkflowConfigContents(raw []byte, ext string) (WorkflowConfig, error) {
	wire := workflowConfigWire{}
	switch strings.ToLower(strings.TrimSpace(ext)) {
	case ".yaml", ".yml":
		if err := yaml.Unmarshal(raw, &wire); err != nil {
			return WorkflowConfig{}, workflowConfigError{Reason: "yaml parse failed", Cause: err}
		}
	case ".json":
		if err := json.Unmarshal(raw, &wire); err != nil {
			return WorkflowConfig{}, workflowConfigError{Reason: "json parse failed", Cause: err}
		}
	default:
		return WorkflowConfig{}, workflowConfigError{Reason: "file extension not supported"}
	}
	return NormalizeWorkflowConfig(WorkflowConfig{
		SchemaVersion: normalizeWorkflowConfigSchemaVersion(wire.SchemaVersion),
		Workflows:     wire.Workflows,
		TraitDefaults: normalizeWorkflowTraitDefaults(wire.TraitDefaults, wire.TraitWorkflowDefaults),
	}), nil
}

// ValidateWorkflowConfig validates external workflow config structure and constraints.
func ValidateWorkflowConfig(cfg WorkflowConfig) error {
	cfg = NormalizeWorkflowConfig(cfg)
	issues := []WorkflowConfigValidationIssue{}
	if cfg.SchemaVersion > WorkflowConfigSchemaVersionCurrent {
		issues = append(issues, WorkflowConfigValidationIssue{
			Field:   "schema_version",
			Message: fmt.Sprintf("unsupported version %d (max %d)", cfg.SchemaVersion, WorkflowConfigSchemaVersionCurrent),
		})
	}

	for _, workflowID := range sortedKeys(cfg.Workflows) {
		spec := cfg.Workflows[workflowID]
		prefix := "workflows." + workflowID
		if strings.TrimSpace(spec.InitialState) == "" {
			issues = append(issues, WorkflowConfigValidationIssue{
				Field:   prefix + ".initial_state",
				Message: "required",
			})
		}
		if len(spec.Transitions) == 0 {
			issues = append(issues, WorkflowConfigValidationIssue{
				Field:   prefix + ".transitions",
				Message: "at least one transition is required",
			})
			continue
		}
		seenTransitions := map[string]struct{}{}
		for i, transition := range spec.Transitions {
			path := fmt.Sprintf("%s.transitions[%d]", prefix, i)
			name := strings.TrimSpace(transition.Name)
			from := strings.TrimSpace(transition.From)
			to := strings.TrimSpace(transition.To)

			if name == "" {
				issues = append(issues, WorkflowConfigValidationIssue{
					Field:   path + ".name",
					Message: "required",
				})
			}
			if from == "" {
				issues = append(issues, WorkflowConfigValidationIssue{
					Field:   path + ".from",
					Message: "required",
				})
			}
			if to == "" {
				issues = append(issues, WorkflowConfigValidationIssue{
					Field:   path + ".to",
					Message: "required",
				})
			}
			if name != "" {
				normalized := normalizeLookupKey(name)
				if _, exists := seenTransitions[normalized]; exists {
					issues = append(issues, WorkflowConfigValidationIssue{
						Field:   path + ".name",
						Message: fmt.Sprintf("duplicate transition name %q", name),
					})
				}
				seenTransitions[normalized] = struct{}{}
			}
		}
	}

	if len(issues) > 0 {
		return WorkflowConfigValidationError{Issues: issues}
	}
	return nil
}

// NormalizeWorkflowConfig normalizes config maps and scalar fields.
func NormalizeWorkflowConfig(cfg WorkflowConfig) WorkflowConfig {
	cfg.SchemaVersion = normalizeWorkflowConfigSchemaVersion(cfg.SchemaVersion)
	cfg.Workflows = normalizeWorkflowDefinitions(cfg.Workflows)
	cfg.TraitDefaults = normalizeWorkflowTraitDefaults(cfg.TraitDefaults, nil)
	return cfg
}

// WorkflowDefinitionsFromConfig converts workflow config into admin workflow definitions.
func WorkflowDefinitionsFromConfig(cfg WorkflowConfig) map[string]admin.WorkflowDefinition {
	cfg = NormalizeWorkflowConfig(cfg)
	if len(cfg.Workflows) == 0 {
		return nil
	}
	out := map[string]admin.WorkflowDefinition{}
	for _, key := range sortedKeys(cfg.Workflows) {
		spec := cfg.Workflows[key]
		id := strings.TrimSpace(spec.ID)
		if id == "" {
			id = strings.TrimSpace(key)
		}
		if id == "" {
			continue
		}
		transitions := make([]admin.WorkflowTransition, 0, len(spec.Transitions))
		for _, transition := range spec.Transitions {
			transitions = append(transitions, admin.WorkflowTransition{
				Name:        strings.TrimSpace(transition.Name),
				Description: strings.TrimSpace(transition.Description),
				From:        strings.TrimSpace(transition.From),
				To:          strings.TrimSpace(transition.To),
				Guard:       strings.TrimSpace(transition.Guard),
			})
		}
		out[id] = admin.WorkflowDefinition{
			EntityType:   id,
			InitialState: strings.TrimSpace(spec.InitialState),
			Transitions:  transitions,
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// WorkflowTraitDefaultsFromConfig returns a cloned trait->workflow default map.
func WorkflowTraitDefaultsFromConfig(cfg WorkflowConfig) map[string]string {
	cfg = NormalizeWorkflowConfig(cfg)
	if len(cfg.TraitDefaults) == 0 {
		return nil
	}
	out := map[string]string{}
	for _, key := range sortedKeys(cfg.TraitDefaults) {
		value := strings.TrimSpace(cfg.TraitDefaults[key])
		if value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func validateWorkflowTraitDefaultsReferences(defaults map[string]string, definitions map[string]admin.WorkflowDefinition, engine admin.WorkflowEngine) error {
	defaults = normalizeWorkflowTraitDefaults(defaults, nil)
	if len(defaults) == 0 {
		return nil
	}
	known := map[string]struct{}{}
	for key := range definitions {
		normalized := strings.TrimSpace(key)
		if normalized == "" {
			continue
		}
		known[normalized] = struct{}{}
	}
	checker, hasChecker := engine.(admin.WorkflowDefinitionChecker)
	issues := []WorkflowConfigValidationIssue{}
	for _, trait := range sortedKeys(defaults) {
		workflowID := strings.TrimSpace(defaults[trait])
		if workflowID == "" {
			continue
		}
		if _, ok := known[workflowID]; ok {
			continue
		}
		if hasChecker && checker.HasWorkflow(workflowID) {
			continue
		}
		issues = append(issues, WorkflowConfigValidationIssue{
			Field:   "trait_defaults." + trait,
			Message: fmt.Sprintf("references unknown workflow_id %q", workflowID),
		})
	}
	if len(issues) > 0 {
		return WorkflowConfigValidationError{Issues: issues}
	}
	return nil
}

func normalizeWorkflowConfigSchemaVersion(version int) int {
	if version < WorkflowConfigSchemaVersionMinimumSupported {
		return WorkflowConfigSchemaVersionCurrent
	}
	if version == 0 {
		return WorkflowConfigSchemaVersionCurrent
	}
	return version
}

func normalizeWorkflowDefinitions(values map[string]WorkflowDefinitionSpec) map[string]WorkflowDefinitionSpec {
	if len(values) == 0 {
		return nil
	}
	out := map[string]WorkflowDefinitionSpec{}
	for _, rawKey := range sortedKeys(values) {
		spec := values[rawKey]
		key := strings.TrimSpace(rawKey)
		id := strings.TrimSpace(spec.ID)
		if id == "" {
			id = key
		}
		if id == "" {
			continue
		}
		normalized := WorkflowDefinitionSpec{
			ID:           id,
			InitialState: strings.TrimSpace(spec.InitialState),
			Transitions:  normalizeWorkflowTransitions(spec.Transitions),
		}
		out[id] = normalized
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeWorkflowTransitions(values []WorkflowTransitionSpec) []WorkflowTransitionSpec {
	if len(values) == 0 {
		return nil
	}
	out := make([]WorkflowTransitionSpec, 0, len(values))
	for _, transition := range values {
		out = append(out, WorkflowTransitionSpec{
			Name:        strings.TrimSpace(transition.Name),
			Description: strings.TrimSpace(transition.Description),
			From:        strings.TrimSpace(transition.From),
			To:          strings.TrimSpace(transition.To),
			Guard:       strings.TrimSpace(transition.Guard),
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeWorkflowTraitDefaults(primary map[string]string, legacy map[string]string) map[string]string {
	out := map[string]string{}
	appendDefaults := func(values map[string]string) {
		for _, rawTrait := range sortedKeys(values) {
			workflowID := strings.TrimSpace(values[rawTrait])
			trait := normalizeLookupKey(rawTrait)
			if trait == "" || workflowID == "" {
				continue
			}
			out[trait] = workflowID
		}
	}
	appendDefaults(legacy)
	appendDefaults(primary)
	if len(out) == 0 {
		return nil
	}
	return out
}
