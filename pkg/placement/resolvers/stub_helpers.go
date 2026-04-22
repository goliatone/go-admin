package resolvers

import "github.com/goliatone/go-admin/pkg/placement/models"

func unsupportedEstimate(resolverID string, accuracy, cost, latency float64) models.Estimate {
	return models.Estimate{
		ResolverID: resolverID,
		Accuracy:   accuracy,
		Cost:       cost,
		Latency:    latency,
		Supported:  false,
		Reason:     "stub_not_enabled",
	}
}

func unresolvedDefinitions(input ResolveInput) models.ResolveResult {
	unresolved := make([]string, 0, len(input.FieldDefinitions))
	for _, definition := range input.FieldDefinitions {
		unresolved = append(unresolved, definition.ID)
	}
	return models.ResolveResult{UnresolvedDefinitionIDs: unresolved}
}
