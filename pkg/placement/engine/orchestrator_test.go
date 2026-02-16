package engine

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/placement/models"
	"github.com/goliatone/go-admin/pkg/placement/resolvers"
)

type stubResolver struct {
	id            string
	estimate      models.Estimate
	result        models.ResolveResult
	sleep         time.Duration
	ignoreContext bool
}

func (s stubResolver) ID() string { return s.id }

func (s stubResolver) Estimate(_ context.Context, _ resolvers.ResolveInput) (models.Estimate, error) {
	est := s.estimate
	est.ResolverID = s.id
	if est.Reason == "" {
		est.Reason = "stub"
	}
	if !est.Supported {
		est.Supported = true
	}
	return est, nil
}

func (s stubResolver) Resolve(ctx context.Context, _ resolvers.ResolveInput) (models.ResolveResult, error) {
	if s.sleep > 0 {
		if s.ignoreContext {
			time.Sleep(s.sleep)
		} else {
			select {
			case <-time.After(s.sleep):
			case <-ctx.Done():
				return models.ResolveResult{}, ctx.Err()
			}
		}
	}
	return s.result, nil
}

func TestOrchestratorMergesAndRanksDeterministically(t *testing.T) {
	registry := resolvers.NewRegistry()
	registry.Register(stubResolver{
		id:       "low_accuracy",
		estimate: models.Estimate{Accuracy: 0.4, Cost: 0.1, Latency: 0.1, Supported: true},
		result: models.ResolveResult{Suggestions: []models.Suggestion{{
			FieldDefinitionID: "field-1",
			ResolverID:        "low_accuracy",
			Confidence:        0.35,
			Geometry:          models.Geometry{PageNumber: 1, X: 10, Y: 10, Width: 120, Height: 30},
		}}},
	}, resolvers.ResolverCapability{})
	registry.Register(stubResolver{
		id:       "high_accuracy",
		estimate: models.Estimate{Accuracy: 0.9, Cost: 0.2, Latency: 0.2, Supported: true},
		result: models.ResolveResult{Suggestions: []models.Suggestion{{
			FieldDefinitionID: "field-1",
			ResolverID:        "high_accuracy",
			Confidence:        0.9,
			Geometry:          models.Geometry{PageNumber: 1, X: 20, Y: 20, Width: 120, Height: 30},
		}}},
	}, resolvers.ResolverCapability{})

	orchestrator := NewOrchestrator(registry, NewStaticPolicyResolver(models.Policy{
		EnabledResolvers: []string{"low_accuracy", "high_accuracy"},
		Weights:          models.ScoringWeights{Accuracy: 1, Cost: 0.1, Latency: 0.1},
	}))

	run, err := orchestrator.Run(context.Background(), RunInput{
		AgreementID: "agreement-1",
		FieldDefinitions: []models.FieldDefinition{{
			ID:        "field-1",
			FieldType: "signature",
			Required:  true,
		}},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if run.Status != models.RunStatusCompleted {
		t.Fatalf("expected completed run, got %q (%s)", run.Status, run.ReasonCode)
	}
	if len(run.Suggestions) != 1 {
		t.Fatalf("expected merged suggestion count 1, got %d", len(run.Suggestions))
	}
	if run.Suggestions[0].ResolverID != "high_accuracy" {
		t.Fatalf("expected highest-confidence suggestion selected, got %+v", run.Suggestions[0])
	}
}

func TestOrchestratorEnforcesBudgetWithDeterministicReason(t *testing.T) {
	registry := resolvers.NewRegistry()
	registry.Register(stubResolver{
		id:       "first",
		estimate: models.Estimate{Accuracy: 0.5, Cost: 0.6, Latency: 0.1, Supported: true},
		result: models.ResolveResult{Suggestions: []models.Suggestion{{
			FieldDefinitionID: "field-1",
			ResolverID:        "first",
			Confidence:        0.6,
			Geometry:          models.Geometry{PageNumber: 1, X: 10, Y: 10, Width: 120, Height: 30},
		}}},
	}, resolvers.ResolverCapability{})
	registry.Register(stubResolver{
		id:       "second",
		estimate: models.Estimate{Accuracy: 0.9, Cost: 0.6, Latency: 0.1, Supported: true},
		result: models.ResolveResult{Suggestions: []models.Suggestion{{
			FieldDefinitionID: "field-2",
			ResolverID:        "second",
			Confidence:        0.8,
			Geometry:          models.Geometry{PageNumber: 1, X: 20, Y: 20, Width: 120, Height: 30},
		}}},
	}, resolvers.ResolverCapability{})

	orchestrator := NewOrchestrator(registry, NewStaticPolicyResolver(models.Policy{
		EnabledResolvers: []string{"first", "second"},
		Weights:          models.ScoringWeights{Accuracy: 1, Cost: 0.1, Latency: 0.1},
		Limits:           models.ExecutionLimits{MaxBudget: 0.7},
	}))

	run, err := orchestrator.Run(context.Background(), RunInput{
		AgreementID: "agreement-1",
		FieldDefinitions: []models.FieldDefinition{
			{ID: "field-1", FieldType: "signature", Required: true},
			{ID: "field-2", FieldType: "signature", Required: true},
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if run.Status != models.RunStatusPartial {
		t.Fatalf("expected partial run on budget short-circuit, got %q", run.Status)
	}
	if run.ReasonCode != models.RunReasonBudgetExhausted {
		t.Fatalf("expected budget reason, got %q", run.ReasonCode)
	}
	if len(run.Suggestions) != 1 {
		t.Fatalf("expected one partial suggestion, got %d", len(run.Suggestions))
	}
	if len(run.UnresolvedDefinitionIDs) != 1 {
		t.Fatalf("expected one unresolved field, got %+v", run.UnresolvedDefinitionIDs)
	}
}

func TestOrchestratorShortCircuitReasonCodes(t *testing.T) {
	registry := resolvers.NewRegistry()
	registry.Register(stubResolver{
		id:       "short_stop",
		estimate: models.Estimate{Accuracy: 0.8, Cost: 0.1, Latency: 0.1, Supported: true},
		result: models.ResolveResult{
			Suggestions: []models.Suggestion{{
				FieldDefinitionID: "field-1",
				ResolverID:        "short_stop",
				Confidence:        0.8,
				Geometry:          models.Geometry{PageNumber: 1, X: 10, Y: 10, Width: 120, Height: 30},
			}},
			Terminate:         true,
			TerminationReason: "resolver_policy_short_circuit",
		},
	}, resolvers.ResolverCapability{})
	registry.Register(stubResolver{
		id:       "should_not_execute",
		estimate: models.Estimate{Accuracy: 0.9, Cost: 0.1, Latency: 0.1, Supported: true},
	}, resolvers.ResolverCapability{})

	orchestrator := NewOrchestrator(registry, NewStaticPolicyResolver(models.Policy{
		EnabledResolvers: []string{"short_stop", "should_not_execute"},
		HardOrder:        []string{"short_stop", "should_not_execute"},
		Weights:          models.ScoringWeights{Accuracy: 1, Cost: 0.1, Latency: 0.1},
	}))
	run, err := orchestrator.Run(context.Background(), RunInput{
		AgreementID: "agreement-1",
		FieldDefinitions: []models.FieldDefinition{
			{ID: "field-1", FieldType: "signature", Required: true},
			{ID: "field-2", FieldType: "signature", Required: true},
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if run.ReasonCode != "resolver_policy_short_circuit" {
		t.Fatalf("expected short-circuit reason code, got %q", run.ReasonCode)
	}
	if len(run.ExecutedResolvers) != 1 || run.ExecutedResolvers[0] != "short_stop" {
		t.Fatalf("expected short-circuit to stop subsequent resolvers, got %+v", run.ExecutedResolvers)
	}
	if len(run.Suggestions) != 1 {
		t.Fatalf("expected partial suggestion from short-circuit run, got %d", len(run.Suggestions))
	}
}

func TestOrchestratorEnforcesMaxTimeWithPartialOutcome(t *testing.T) {
	registry := resolvers.NewRegistry()
	registry.Register(stubResolver{
		id:            "slow_first",
		estimate:      models.Estimate{Accuracy: 0.7, Cost: 0.2, Latency: 0.9, Supported: true},
		sleep:         5 * time.Millisecond,
		ignoreContext: true,
		result: models.ResolveResult{Suggestions: []models.Suggestion{{
			FieldDefinitionID: "field-1",
			ResolverID:        "slow_first",
			Confidence:        0.7,
			Geometry:          models.Geometry{PageNumber: 1, X: 10, Y: 10, Width: 120, Height: 30},
		}}},
	}, resolvers.ResolverCapability{})
	registry.Register(stubResolver{
		id:       "second",
		estimate: models.Estimate{Accuracy: 0.8, Cost: 0.2, Latency: 0.1, Supported: true},
		result: models.ResolveResult{Suggestions: []models.Suggestion{{
			FieldDefinitionID: "field-2",
			ResolverID:        "second",
			Confidence:        0.7,
			Geometry:          models.Geometry{PageNumber: 1, X: 20, Y: 20, Width: 120, Height: 30},
		}}},
	}, resolvers.ResolverCapability{})

	orchestrator := NewOrchestrator(registry, NewStaticPolicyResolver(models.Policy{
		EnabledResolvers: []string{"slow_first", "second"},
		HardOrder:        []string{"slow_first", "second"},
		Weights:          models.ScoringWeights{Accuracy: 1, Cost: 0.1, Latency: 0.1},
		Limits:           models.ExecutionLimits{MaxTime: 2 * time.Millisecond},
	}))

	run, err := orchestrator.Run(context.Background(), RunInput{
		AgreementID: "agreement-1",
		FieldDefinitions: []models.FieldDefinition{
			{ID: "field-1", FieldType: "signature", Required: true},
			{ID: "field-2", FieldType: "signature", Required: true},
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if run.Status != models.RunStatusPartial {
		t.Fatalf("expected partial run when max_time exceeded, got %q", run.Status)
	}
	if run.ReasonCode != models.RunReasonTimedOut {
		t.Fatalf("expected timed-out reason code, got %q", run.ReasonCode)
	}
	if len(run.Suggestions) != 1 {
		t.Fatalf("expected one partial suggestion, got %d", len(run.Suggestions))
	}
}
