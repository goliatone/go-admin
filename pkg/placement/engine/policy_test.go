package engine

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

func TestStaticPolicyResolverPrecedence(t *testing.T) {
	resolver := NewStaticPolicyResolver(models.Policy{
		EnabledResolvers: []string{"native_pdf_forms_resolver", "text_anchor_resolver"},
		Weights:          models.ScoringWeights{Accuracy: 0.6, Cost: 0.25, Latency: 0.15},
		Limits:           models.ExecutionLimits{MaxBudget: 10},
	})
	resolver.SetOrgPolicy("org-1", models.Policy{
		Weights: models.ScoringWeights{Accuracy: 0.8},
		Limits:  models.ExecutionLimits{MaxBudget: 5},
	})
	resolver.SetUserPolicy("user-1", models.Policy{
		EnabledResolvers: []string{"text_anchor_resolver", "native_pdf_forms_resolver"},
		Weights:          models.ScoringWeights{Cost: 0.5},
	})

	effective, err := resolver.Resolve(context.Background(), PolicyResolveInput{
		OrgID:           "org-1",
		UserID:          "user-1",
		RegisteredOrder: []string{"native_pdf_forms_resolver", "text_anchor_resolver", "ocr_anchor_resolver"},
		PerRunOverride: &models.Policy{
			HardOrder: []string{"ocr_anchor_resolver", "native_pdf_forms_resolver"},
			Weights:   models.ScoringWeights{Latency: 0.9},
			Limits:    models.ExecutionLimits{MaxTime: 3 * time.Second},
		},
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if len(effective.HardOrder) != 2 || effective.HardOrder[0] != "ocr_anchor_resolver" {
		t.Fatalf("expected per-run hard order override, got %+v", effective.HardOrder)
	}
	if effective.Weights.Accuracy != 0.8 {
		t.Fatalf("expected org-level accuracy weight, got %.2f", effective.Weights.Accuracy)
	}
	if effective.Weights.Cost != 0.5 {
		t.Fatalf("expected user-level cost weight, got %.2f", effective.Weights.Cost)
	}
	if effective.Weights.Latency != 0.9 {
		t.Fatalf("expected per-run latency weight, got %.2f", effective.Weights.Latency)
	}
	if effective.Limits.MaxBudget != 5 {
		t.Fatalf("expected org-level max budget, got %.2f", effective.Limits.MaxBudget)
	}
	if effective.Limits.MaxTime != 3*time.Second {
		t.Fatalf("expected per-run max time, got %s", effective.Limits.MaxTime)
	}
}
