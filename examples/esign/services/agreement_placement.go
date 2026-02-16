package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	placementengine "github.com/goliatone/go-admin/pkg/placement/engine"
	placementmodels "github.com/goliatone/go-admin/pkg/placement/models"
	placementresolvers "github.com/goliatone/go-admin/pkg/placement/resolvers"
)

// AgreementPlacementOrchestrator abstracts placement orchestration runtime behavior.
type AgreementPlacementOrchestrator interface {
	Run(ctx context.Context, input placementengine.RunInput) (placementmodels.Run, error)
}

// AgreementPlacementPolicyResolver resolves effective policy for a placement run.
type AgreementPlacementPolicyResolver interface {
	Resolve(ctx context.Context, input placementengine.PolicyResolveInput) (placementmodels.Policy, error)
}

// PlacementDocumentObjectStore reads source document bytes by object key.
type PlacementDocumentObjectStore interface {
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// WithAgreementPlacementOrchestrator sets custom placement orchestration behavior.
func WithAgreementPlacementOrchestrator(orchestrator AgreementPlacementOrchestrator) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || orchestrator == nil {
			return
		}
		s.placementOrchestrator = orchestrator
	}
}

// WithAgreementPlacementPolicyResolver sets a custom policy resolver.
func WithAgreementPlacementPolicyResolver(resolver AgreementPlacementPolicyResolver) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || resolver == nil {
			return
		}
		s.placementPolicy = resolver
	}
}

// WithAgreementPlacementObjectStore configures source document retrieval for placement resolvers.
func WithAgreementPlacementObjectStore(objectStore PlacementDocumentObjectStore) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || objectStore == nil {
			return
		}
		s.placementObjectStore = objectStore
	}
}

// WithAgreementPlacementRunStore sets a custom placement run store.
func WithAgreementPlacementRunStore(store stores.PlacementRunStore) AgreementServiceOption {
	return func(s *AgreementService) {
		if s == nil || store == nil {
			return
		}
		s.placementRuns = store
		s.customPlacementRuns = true
	}
}

// PlacementPolicyOverride captures per-run policy overrides.
type PlacementPolicyOverride struct {
	EnabledResolvers []string `json:"enabled_resolvers"`
	HardOrder        []string `json:"hard_order"`
	Weights          struct {
		Accuracy float64 `json:"accuracy"`
		Cost     float64 `json:"cost"`
		Latency  float64 `json:"latency"`
	} `json:"weights"`
	MaxBudget float64 `json:"max_budget"`
	MaxTimeMS int64   `json:"max_time_ms"`
}

// NativePlacementField captures optional pre-extracted native form field metadata.
type NativePlacementField struct {
	Name          string  `json:"name"`
	FieldTypeHint string  `json:"field_type_hint"`
	PageNumber    int     `json:"page_number"`
	X             float64 `json:"x"`
	Y             float64 `json:"y"`
	Width         float64 `json:"width"`
	Height        float64 `json:"height"`
}

// AutoPlacementRunInput captures an auto-placement execution request.
type AutoPlacementRunInput struct {
	UserID         string                   `json:"user_id"`
	PolicyOverride *PlacementPolicyOverride `json:"policy_override"`
	NativeFields   []NativePlacementField   `json:"native_form_fields"`
}

// AutoPlacementRunResult contains persisted run metadata for an auto-placement execution.
type AutoPlacementRunResult struct {
	Run stores.PlacementRunRecord `json:"run"`
}

// ManuallyPlacedField captures operator overrides applied to placement results.
type ManuallyPlacedField struct {
	FieldInstanceID   string  `json:"field_instance_id"`
	FieldDefinitionID string  `json:"field_definition_id"`
	PageNumber        int     `json:"page_number"`
	X                 float64 `json:"x"`
	Y                 float64 `json:"y"`
	Width             float64 `json:"width"`
	Height            float64 `json:"height"`
	TabIndex          *int    `json:"tab_index"`
	Label             string  `json:"label"`
}

// ApplyPlacementRunInput captures suggestion selection and manual override intent.
type ApplyPlacementRunInput struct {
	UserID          string                `json:"user_id"`
	SuggestionIDs   []string              `json:"suggestion_ids"`
	ManualOverrides []ManuallyPlacedField `json:"manual_overrides"`
}

// ApplyPlacementRunResult captures resulting applied field instances and run metadata.
type ApplyPlacementRunResult struct {
	Run              stores.PlacementRunRecord    `json:"run"`
	AppliedInstances []stores.FieldInstanceRecord `json:"applied_instances"`
}

func (s *AgreementService) initPlacementDefaults() {
	if s == nil {
		return
	}
	if s.placementPolicy == nil {
		s.placementPolicy = placementengine.NewStaticPolicyResolver(placementengine.DefaultPolicy())
	}
	if s.placementOrchestrator == nil {
		registry := placementresolvers.NewDefaultRegistry()
		s.placementOrchestrator = placementengine.NewOrchestrator(registry, s.placementPolicy)
	}
}

// RunAutoPlacement runs resolver orchestration and persists the placement run.
func (s AgreementService) RunAutoPlacement(ctx context.Context, scope stores.Scope, agreementID string, input AutoPlacementRunInput) (AutoPlacementRunResult, error) {
	if s.agreements == nil {
		return AutoPlacementRunResult{}, domainValidationError("agreements", "store", "not configured")
	}
	if s.placementRuns == nil {
		return AutoPlacementRunResult{}, domainValidationError("placement_runs", "store", "not configured")
	}
	if s.placementOrchestrator == nil {
		return AutoPlacementRunResult{}, domainValidationError("placement_runs", "orchestrator", "not configured")
	}

	agreementID = strings.TrimSpace(agreementID)
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		return AutoPlacementRunResult{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return AutoPlacementRunResult{}, domainValidationError("agreements", "status", "auto-place requires draft status")
	}

	definitions, err := s.agreements.ListFieldDefinitions(ctx, scope, agreementID)
	if err != nil {
		return AutoPlacementRunResult{}, err
	}
	if len(definitions) == 0 {
		return AutoPlacementRunResult{}, domainValidationError("field_definitions", "count", "at least one field definition is required")
	}
	instances, err := s.agreements.ListFieldInstances(ctx, scope, agreementID)
	if err != nil {
		return AutoPlacementRunResult{}, err
	}

	docBytes := []byte{}
	if s.documents != nil && s.placementObjectStore != nil {
		document, docErr := s.documents.Get(ctx, scope, agreement.DocumentID)
		if docErr == nil && strings.TrimSpace(document.SourceObjectKey) != "" {
			payload, readErr := s.placementObjectStore.GetFile(ctx, strings.TrimSpace(document.SourceObjectKey))
			if readErr == nil {
				docBytes = payload
			}
		}
	}

	runInput := placementengine.RunInput{
		AgreementID:        agreementID,
		CreatedByUserID:    strings.TrimSpace(input.UserID),
		OrgID:              scope.OrgID,
		UserID:             strings.TrimSpace(input.UserID),
		PolicyOverride:     policyOverrideToModel(input.PolicyOverride),
		DocumentBytes:      docBytes,
		DocumentPageCount:  0,
		FieldDefinitions:   toPlacementDefinitions(definitions),
		ExistingPlacements: toExistingPlacements(instances),
		NativeFormFields:   toNativeFields(input.NativeFields),
	}
	if s.documents != nil {
		document, docErr := s.documents.Get(ctx, scope, agreement.DocumentID)
		if docErr == nil {
			runInput.DocumentPageCount = document.PageCount
		}
	}
	run, err := s.placementOrchestrator.Run(ctx, runInput)
	if err != nil {
		return AutoPlacementRunResult{}, err
	}
	runRecord := stores.PlacementRunRecord{
		ID:                      run.ID,
		AgreementID:             agreementID,
		Status:                  strings.TrimSpace(run.Status),
		ReasonCode:              strings.TrimSpace(run.ReasonCode),
		ResolverOrder:           append([]string{}, run.ResolverOrder...),
		ExecutedResolvers:       append([]string{}, run.ExecutedResolvers...),
		ResolverScores:          toPlacementResolverScores(run.Scores),
		Suggestions:             toPlacementSuggestions(run.Suggestions),
		UnresolvedDefinitionIDs: append([]string{}, run.UnresolvedDefinitionIDs...),
		SelectedSource:          strings.TrimSpace(run.SelectedSource),
		PolicyJSON:              marshalPlacementPolicy(run.Policy),
		MaxBudget:               run.Policy.Limits.MaxBudget,
		BudgetUsed:              run.BudgetUsed,
		MaxTimeMS:               run.Policy.Limits.MaxTime.Milliseconds(),
		ElapsedMS:               run.Elapsed.Milliseconds(),
		CreatedByUserID:         strings.TrimSpace(input.UserID),
		CompletedAt:             cloneTimePtr(&run.CompletedAt),
	}
	persisted, err := s.placementRuns.UpsertPlacementRun(ctx, scope, runRecord)
	if err != nil {
		return AutoPlacementRunResult{}, err
	}

	_ = s.appendAuditEvent(ctx, scope, agreementID, "agreement.placement_run_created", "system", strings.TrimSpace(input.UserID), map[string]any{
		"placement_run_id": persisted.ID,
		"status":           persisted.Status,
		"reason_code":      persisted.ReasonCode,
		"resolver_order":   persisted.ResolverOrder,
		"selected_source":  persisted.SelectedSource,
		"suggestion_count": len(persisted.Suggestions),
	})

	return AutoPlacementRunResult{Run: persisted}, nil
}

// ListPlacementRuns lists placement runs for a draft agreement.
func (s AgreementService) ListPlacementRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.PlacementRunRecord, error) {
	if s.placementRuns == nil {
		return nil, domainValidationError("placement_runs", "store", "not configured")
	}
	return s.placementRuns.ListPlacementRuns(ctx, scope, agreementID)
}

// GetPlacementRun returns one persisted placement run.
func (s AgreementService) GetPlacementRun(ctx context.Context, scope stores.Scope, agreementID, placementRunID string) (stores.PlacementRunRecord, error) {
	if s.placementRuns == nil {
		return stores.PlacementRunRecord{}, domainValidationError("placement_runs", "store", "not configured")
	}
	return s.placementRuns.GetPlacementRun(ctx, scope, agreementID, placementRunID)
}

// ApplyPlacementRun applies selected suggestions/manual overrides to field instances.
func (s AgreementService) ApplyPlacementRun(ctx context.Context, scope stores.Scope, agreementID, placementRunID string, input ApplyPlacementRunInput) (ApplyPlacementRunResult, error) {
	if s.placementRuns == nil {
		return ApplyPlacementRunResult{}, domainValidationError("placement_runs", "store", "not configured")
	}
	if s.agreements == nil {
		return ApplyPlacementRunResult{}, domainValidationError("agreements", "store", "not configured")
	}
	agreementID = strings.TrimSpace(agreementID)
	placementRunID = strings.TrimSpace(placementRunID)
	if agreementID == "" || placementRunID == "" {
		return ApplyPlacementRunResult{}, domainValidationError("placement_runs", "agreement_id|placement_run_id", "required")
	}

	var out ApplyPlacementRunResult
	err := s.withWriteTx(ctx, func(txSvc AgreementService) error {
		run, err := txSvc.placementRuns.GetPlacementRun(ctx, scope, agreementID, placementRunID)
		if err != nil {
			return err
		}
		agreement, err := txSvc.agreements.GetAgreement(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		if agreement.Status != stores.AgreementStatusDraft {
			return domainValidationError("agreements", "status", "placement apply requires draft status")
		}

		instances, err := txSvc.agreements.ListFieldInstances(ctx, scope, agreementID)
		if err != nil {
			return err
		}
		instanceByDefinition := map[string]stores.FieldInstanceRecord{}
		for _, instance := range instances {
			instanceByDefinition[strings.TrimSpace(instance.FieldDefinitionID)] = instance
		}

		suggestionsByID := map[string]stores.PlacementSuggestionRecord{}
		orderedSuggestionIDs := make([]string, 0, len(run.Suggestions))
		for _, suggestion := range run.Suggestions {
			sid := strings.TrimSpace(suggestion.ID)
			if sid == "" {
				continue
			}
			suggestionsByID[sid] = suggestion
			orderedSuggestionIDs = append(orderedSuggestionIDs, sid)
		}
		sort.Strings(orderedSuggestionIDs)

		selectedSuggestionIDs := normalizeSuggestionSelection(input.SuggestionIDs, suggestionsByID, orderedSuggestionIDs)
		applied := make([]stores.FieldInstanceRecord, 0, len(selectedSuggestionIDs)+len(input.ManualOverrides))
		autoSource := stores.PlacementSourceAuto
		manualSource := stores.PlacementSourceManual
		manualOverrideFlag := true
		noManualOverrideFlag := false
		runID := run.ID

		for _, suggestionID := range selectedSuggestionIDs {
			suggestion, ok := suggestionsByID[suggestionID]
			if !ok {
				continue
			}
			fieldDefinitionID := strings.TrimSpace(suggestion.FieldDefinitionID)
			if fieldDefinitionID == "" {
				continue
			}
			patch := stores.FieldInstanceDraftPatch{
				FieldDefinitionID: &fieldDefinitionID,
				PageNumber:        placementIntPtr(suggestion.PageNumber),
				X:                 placementFloatPtr(suggestion.X),
				Y:                 placementFloatPtr(suggestion.Y),
				Width:             placementFloatPtr(suggestion.Width),
				Height:            placementFloatPtr(suggestion.Height),
				PlacementSource:   &autoSource,
				ResolverID:        placementStrPtr(strings.TrimSpace(suggestion.ResolverID)),
				Confidence:        placementFloatPtr(suggestion.Confidence),
				PlacementRunID:    &runID,
				ManualOverride:    &noManualOverrideFlag,
			}
			if label := strings.TrimSpace(suggestion.Label); label != "" {
				patch.Label = &label
			}
			if existing, ok := instanceByDefinition[fieldDefinitionID]; ok {
				patch.ID = existing.ID
			}
			record, upsertErr := txSvc.agreements.UpsertFieldInstanceDraft(ctx, scope, agreementID, patch)
			if upsertErr != nil {
				return upsertErr
			}
			instanceByDefinition[fieldDefinitionID] = record
			applied = append(applied, record)
		}

		for _, manual := range input.ManualOverrides {
			fieldDefinitionID := strings.TrimSpace(manual.FieldDefinitionID)
			if fieldDefinitionID == "" {
				return domainValidationError("field_instances", "field_definition_id", "required for manual override")
			}
			patch := stores.FieldInstanceDraftPatch{
				ID:                strings.TrimSpace(manual.FieldInstanceID),
				FieldDefinitionID: &fieldDefinitionID,
				PageNumber:        placementIntPtr(manual.PageNumber),
				X:                 placementFloatPtr(manual.X),
				Y:                 placementFloatPtr(manual.Y),
				Width:             placementFloatPtr(manual.Width),
				Height:            placementFloatPtr(manual.Height),
				PlacementSource:   &manualSource,
				PlacementRunID:    &runID,
				ManualOverride:    &manualOverrideFlag,
			}
			if manual.TabIndex != nil {
				patch.TabIndex = manual.TabIndex
			}
			if label := strings.TrimSpace(manual.Label); label != "" {
				patch.Label = &label
			}
			if patch.ID == "" {
				if existing, ok := instanceByDefinition[fieldDefinitionID]; ok {
					patch.ID = existing.ID
				}
			}
			record, upsertErr := txSvc.agreements.UpsertFieldInstanceDraft(ctx, scope, agreementID, patch)
			if upsertErr != nil {
				return upsertErr
			}
			instanceByDefinition[fieldDefinitionID] = record
			applied = append(applied, record)
		}

		run.SelectedSuggestionIDs = append([]string{}, selectedSuggestionIDs...)
		run.ManualOverrideCount = len(input.ManualOverrides)
		run.Status = stores.PlacementRunStatusCompleted
		run.ReasonCode = "applied"
		now := txSvc.now()
		run.CompletedAt = &now
		run.UpdatedAt = now

		persisted, persistErr := txSvc.placementRuns.UpsertPlacementRun(ctx, scope, run)
		if persistErr != nil {
			return persistErr
		}
		_ = txSvc.appendAuditEvent(ctx, scope, agreementID, "agreement.placement_run_applied", "system", strings.TrimSpace(input.UserID), map[string]any{
			"placement_run_id":        persisted.ID,
			"applied_count":           len(applied),
			"selected_suggestion_ids": persisted.SelectedSuggestionIDs,
			"manual_override_count":   persisted.ManualOverrideCount,
		})
		out = ApplyPlacementRunResult{Run: persisted, AppliedInstances: applied}
		return nil
	})
	if err != nil {
		return ApplyPlacementRunResult{}, err
	}
	return out, nil
}

func normalizeSuggestionSelection(requested []string, available map[string]stores.PlacementSuggestionRecord, fallback []string) []string {
	if len(requested) == 0 {
		return append([]string{}, fallback...)
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(requested))
	for _, id := range requested {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}
		if _, ok := available[id]; !ok {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	if len(out) == 0 {
		return append([]string{}, fallback...)
	}
	sort.Strings(out)
	return out
}

func toPlacementDefinitions(definitions []stores.FieldDefinitionRecord) []placementmodels.FieldDefinition {
	out := make([]placementmodels.FieldDefinition, 0, len(definitions))
	for _, definition := range definitions {
		label := extractDefinitionLabel(definition.ValidationJSON)
		if label == "" {
			label = strings.TrimSpace(definition.Type)
		}
		out = append(out, placementmodels.FieldDefinition{
			ID:            strings.TrimSpace(definition.ID),
			ParticipantID: strings.TrimSpace(definition.ParticipantID),
			FieldType:     strings.TrimSpace(definition.Type),
			Label:         label,
			Required:      definition.Required,
		})
	}
	return out
}

func toExistingPlacements(instances []stores.FieldInstanceRecord) []placementmodels.ExistingPlacement {
	out := make([]placementmodels.ExistingPlacement, 0, len(instances))
	for _, instance := range instances {
		out = append(out, placementmodels.ExistingPlacement{
			FieldDefinitionID: strings.TrimSpace(instance.FieldDefinitionID),
			Geometry: placementmodels.Geometry{
				PageNumber: instance.PageNumber,
				X:          instance.X,
				Y:          instance.Y,
				Width:      instance.Width,
				Height:     instance.Height,
			},
		})
	}
	return out
}

func toNativeFields(fields []NativePlacementField) []placementmodels.NativeFormField {
	out := make([]placementmodels.NativeFormField, 0, len(fields))
	for _, field := range fields {
		out = append(out, placementmodels.NativeFormField{
			Name:          strings.TrimSpace(field.Name),
			FieldTypeHint: strings.TrimSpace(field.FieldTypeHint),
			Geometry: placementmodels.Geometry{
				PageNumber: field.PageNumber,
				X:          field.X,
				Y:          field.Y,
				Width:      field.Width,
				Height:     field.Height,
			},
		})
	}
	return out
}

func toPlacementResolverScores(in []placementmodels.ResolverScore) []stores.PlacementResolverScore {
	out := make([]stores.PlacementResolverScore, 0, len(in))
	for _, score := range in {
		out = append(out, stores.PlacementResolverScore{
			ResolverID: strings.TrimSpace(score.ResolverID),
			Accuracy:   score.Accuracy,
			Cost:       score.Cost,
			Latency:    score.Latency,
			Score:      score.Score,
			Supported:  score.Supported,
			Reason:     strings.TrimSpace(score.Reason),
		})
	}
	return out
}

func toPlacementSuggestions(in []placementmodels.Suggestion) []stores.PlacementSuggestionRecord {
	out := make([]stores.PlacementSuggestionRecord, 0, len(in))
	for _, suggestion := range in {
		out = append(out, stores.PlacementSuggestionRecord{
			ID:                strings.TrimSpace(suggestion.ID),
			FieldDefinitionID: strings.TrimSpace(suggestion.FieldDefinitionID),
			ResolverID:        strings.TrimSpace(suggestion.ResolverID),
			Confidence:        suggestion.NormalizedConfidence(),
			PageNumber:        suggestion.Geometry.PageNumber,
			X:                 suggestion.Geometry.X,
			Y:                 suggestion.Geometry.Y,
			Width:             suggestion.Geometry.Width,
			Height:            suggestion.Geometry.Height,
			Label:             strings.TrimSpace(suggestion.Label),
			MetadataJSON:      marshalAny(suggestion.Metadata),
		})
	}
	return out
}

func policyOverrideToModel(in *PlacementPolicyOverride) *placementmodels.Policy {
	if in == nil {
		return nil
	}
	out := &placementmodels.Policy{
		EnabledResolvers: append([]string{}, in.EnabledResolvers...),
		HardOrder:        append([]string{}, in.HardOrder...),
		Weights: placementmodels.ScoringWeights{
			Accuracy: in.Weights.Accuracy,
			Cost:     in.Weights.Cost,
			Latency:  in.Weights.Latency,
		},
		Limits: placementmodels.ExecutionLimits{
			MaxBudget: in.MaxBudget,
			MaxTime:   time.Duration(in.MaxTimeMS) * time.Millisecond,
		},
	}
	return out
}

func marshalPlacementPolicy(policy placementmodels.Policy) string {
	payload := map[string]any{
		"enabled_resolvers": policy.EnabledResolvers,
		"hard_order":        policy.HardOrder,
		"weights": map[string]any{
			"accuracy": policy.Weights.Accuracy,
			"cost":     policy.Weights.Cost,
			"latency":  policy.Weights.Latency,
		},
		"limits": map[string]any{
			"max_budget":  policy.Limits.MaxBudget,
			"max_time_ms": policy.Limits.MaxTime.Milliseconds(),
		},
	}
	return marshalAny(payload)
}

func marshalAny(value any) string {
	if value == nil {
		return "{}"
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

func extractDefinitionLabel(validationJSON string) string {
	validationJSON = strings.TrimSpace(validationJSON)
	if validationJSON == "" {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(validationJSON), &payload); err != nil {
		return ""
	}
	if label, ok := payload["label"].(string); ok {
		return strings.TrimSpace(label)
	}
	if displayName, ok := payload["display_name"].(string); ok {
		return strings.TrimSpace(displayName)
	}
	return ""
}

func placementStrPtr(value string) *string {
	return &value
}

func placementIntPtr(value int) *int {
	return &value
}

func placementFloatPtr(value float64) *float64 {
	return &value
}

func cloneTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	copied := src.UTC()
	return &copied
}
