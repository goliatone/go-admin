package admin

import (
	"context"
	"strings"

	router "github.com/goliatone/go-router"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

type translationFamilyCatalog interface {
	Load(context.Context, string) (*translationFamilyRuntime, error)
}

type translationFamilyBackfillCatalog struct {
	admin *Admin
}

func newTranslationFamilyCatalog(a *Admin) translationFamilyCatalog {
	if a == nil {
		return nil
	}
	return translationFamilyBackfillCatalog{admin: a}
}

func (c translationFamilyBackfillCatalog) Load(ctx context.Context, channel string) (*translationFamilyRuntime, error) {
	if c.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation family catalog", map[string]any{"component": "translation_catalog"})
	}
	binding := &translationFamilyBinding{admin: c.admin}
	input, familyPolicies, err := binding.collectBackfillInput(ctx, channel)
	if err != nil {
		return nil, err
	}
	plan, err := translationservices.NewBackfillRunner().BuildPlan(ctx, input)
	if err != nil {
		return nil, err
	}
	store := translationservices.NewInMemoryFamilyStore()
	if err := store.LoadBackfillPlan(plan); err != nil {
		return nil, err
	}
	if assignments := binding.collectAssignments(ctx); len(assignments) > 0 {
		if err := store.ReplaceAssignments(assignments); err != nil {
			return nil, err
		}
	}
	service := &translationservices.FamilyService{
		Store: store,
		Policies: translationservices.PolicyService{
			Resolver: translationservices.StaticPolicyResolver{Policies: familyPolicies},
		},
	}
	if _, err := service.RecomputeAll(ctx, channel); err != nil {
		return nil, err
	}
	return &translationFamilyRuntime{
		service: service,
		report:  translationservices.BuildBackfillReport(plan),
	}, nil
}

func translationChannel(values ...string) string {
	return strings.TrimSpace(firstNonEmpty(values...))
}

func translationChannelFromRequest(c router.Context, adminCtx AdminContext, body map[string]any, values ...string) string {
	resolved := make([]string, 0, len(values)+3)
	resolved = append(resolved, values...)
	if len(body) > 0 {
		resolved = append(resolved, toString(body["channel"]))
	}
	if c != nil {
		resolved = append(resolved, c.Query("channel"))
	}
	resolved = append(resolved, adminCtx.Channel)
	return translationChannel(resolved...)
}

func translationChannelContract(channel string) map[string]any {
	channel = strings.TrimSpace(channel)
	return map[string]any{
		"channel": channel,
	}
}

func mergeTranslationChannelContract(payload map[string]any, channel string) map[string]any {
	if payload == nil {
		payload = map[string]any{}
	}
	for key, value := range translationChannelContract(channel) {
		payload[key] = value
	}
	return payload
}

func requireCanonicalFamilyID(familyID, entityType, recordID string) error {
	familyID = strings.TrimSpace(familyID)
	if familyID != "" {
		return nil
	}
	return validationDomainError("translation-enabled record missing canonical family_id", map[string]any{
		"family_id":   familyID,
		"entity_type": strings.TrimSpace(entityType),
		"record_id":   strings.TrimSpace(recordID),
	})
}
