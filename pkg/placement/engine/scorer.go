package engine

import (
	"sort"
	"strings"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

// Score returns weighted utility (maximize accuracy, minimize cost/latency).
func Score(estimate models.Estimate, weights models.ScoringWeights) float64 {
	return (weights.Accuracy * estimate.Accuracy) -
		(weights.Cost * estimate.Cost) -
		(weights.Latency * estimate.Latency)
}

// RankScores derives deterministic resolver scores from estimates and weights.
func RankScores(estimates []models.Estimate, weights models.ScoringWeights) []models.ResolverScore {
	scores := make([]models.ResolverScore, 0, len(estimates))
	for _, estimate := range estimates {
		score := models.ResolverScore{
			ResolverID: estimate.ResolverID,
			Accuracy:   estimate.Accuracy,
			Cost:       estimate.Cost,
			Latency:    estimate.Latency,
			Supported:  estimate.Supported,
			Reason:     estimate.Reason,
			Score:      Score(estimate, weights),
		}
		scores = append(scores, score)
	}
	sort.Slice(scores, func(i, j int) bool {
		left := scores[i]
		right := scores[j]
		if left.Score != right.Score {
			return left.Score > right.Score
		}
		if left.Accuracy != right.Accuracy {
			return left.Accuracy > right.Accuracy
		}
		if left.Cost != right.Cost {
			return left.Cost < right.Cost
		}
		if left.Latency != right.Latency {
			return left.Latency < right.Latency
		}
		return strings.Compare(left.ResolverID, right.ResolverID) < 0
	})
	return scores
}
