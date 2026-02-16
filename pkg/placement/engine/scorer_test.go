package engine

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

func TestRankScoresDeterministicTieBreak(t *testing.T) {
	estimates := []models.Estimate{
		{ResolverID: "z_resolver", Accuracy: 0.8, Cost: 0.3, Latency: 0.2, Supported: true},
		{ResolverID: "a_resolver", Accuracy: 0.8, Cost: 0.3, Latency: 0.2, Supported: true},
	}
	weights := models.ScoringWeights{Accuracy: 0.6, Cost: 0.25, Latency: 0.15}
	ranked := RankScores(estimates, weights)
	if len(ranked) != 2 {
		t.Fatalf("expected 2 scores, got %d", len(ranked))
	}
	if ranked[0].ResolverID != "a_resolver" {
		t.Fatalf("expected lexical tie-break, got %+v", ranked)
	}
}
