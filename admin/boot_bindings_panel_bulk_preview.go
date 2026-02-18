package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"net/url"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

func isBulkCreateMissingTranslationsAction(action string) bool {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case bulkCreateMissingTranslationsAction, bulkCreateMissingTranslationsActionAlias:
		return true
	default:
		return false
	}
}

func (p *panelBinding) bulkCreateMissingTranslations(c router.Context, ctx AdminContext, locale string, body map[string]any, ids []string) (map[string]any, error) {
	if len(ids) == 0 {
		return nil, validationDomainError("bulk create missing translations requires ids", map[string]any{
			"field": "ids",
		})
	}
	if _, ok := p.panel.findAction(CreateTranslationKey); !ok {
		return nil, validationDomainError("create_translation action is not configured for this panel", map[string]any{
			"panel": p.name,
		})
	}

	environment := resolvePolicyEnvironment(body, environmentFromContext(ctx.Context))
	policyEntity := resolvePolicyEntity(body, p.name)
	results := make([]map[string]any, 0, len(ids))
	summary := map[string]int{
		"total":             0,
		"succeeded":         0,
		"partial":           0,
		"failed":            0,
		"skipped":           0,
		"created_locales":   0,
		"failed_locales":    0,
		"requested_locales": 0,
	}

	for _, id := range dedupeStrings(ids) {
		recordResult := map[string]any{
			"id": strings.TrimSpace(id),
		}
		source, err := p.panel.Get(ctx, id)
		if err != nil {
			recordResult["status"] = "failed"
			recordResult["failures"] = []map[string]any{bulkCreateMissingTranslationsError("", err)}
			results = append(results, recordResult)
			summary["total"]++
			summary["failed"]++
			summary["failed_locales"]++
			continue
		}

		sourceWithReadiness := p.withTranslationReadinessRecord(ctx, source, map[string]any{
			"environment": environment,
		})
		readiness := extractMap(sourceWithReadiness["translation_readiness"])
		missingLocales := normalizedLocaleList(readiness["missing_required_locales"])
		if len(missingLocales) == 0 {
			missingLocales = normalizedLocaleList(readiness["missing_locales"])
		}
		recordResult["missing_locales"] = append([]string{}, missingLocales...)
		recordResult["translation_group_id"] = strings.TrimSpace(translationGroupIDFromRecord(sourceWithReadiness))
		recordResult["source_locale"] = strings.TrimSpace(toString(sourceWithReadiness["locale"]))

		if len(missingLocales) == 0 {
			recordResult["status"] = "skipped"
			recordResult["reason_code"] = bulkCreateMissingTranslationReasonNoLocale
			recordResult["reason"] = "record has no missing required locales"
			recordResult["created"] = []map[string]any{}
			recordResult["failures"] = []map[string]any{}
			results = append(results, recordResult)
			summary["total"]++
			summary["skipped"]++
			continue
		}

		created := make([]map[string]any, 0, len(missingLocales))
		failures := make([]map[string]any, 0)
		for _, targetLocale := range missingLocales {
			summary["requested_locales"]++
			payload := map[string]any{
				"id":            strings.TrimSpace(id),
				"locale":        targetLocale,
				"environment":   environment,
				"policy_entity": primitives.FirstNonEmptyRaw(policyEntity, resolvePolicyEntity(sourceWithReadiness, p.name)),
			}
			createdData, createErr := p.Action(c, locale, CreateTranslationKey, payload)
			if createErr != nil {
				failures = append(failures, bulkCreateMissingTranslationsError(targetLocale, createErr))
				continue
			}
			entry := map[string]any{
				"locale": targetLocale,
				"status": strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(createdData["status"]), "created")),
			}
			if createdID := strings.TrimSpace(toString(createdData["id"])); createdID != "" {
				entry["id"] = createdID
			}
			if groupID := strings.TrimSpace(toString(createdData["translation_group_id"])); groupID != "" {
				entry["translation_group_id"] = groupID
			}
			created = append(created, entry)
		}

		recordResult["created"] = created
		recordResult["failures"] = failures
		summary["total"]++
		summary["created_locales"] += len(created)
		summary["failed_locales"] += len(failures)

		switch {
		case len(created) > 0 && len(failures) == 0:
			recordResult["status"] = "ok"
			summary["succeeded"]++
		case len(created) > 0 && len(failures) > 0:
			recordResult["status"] = "partial"
			summary["partial"]++
		default:
			recordResult["status"] = "failed"
			summary["failed"]++
		}
		results = append(results, recordResult)
	}

	return map[string]any{
		"action":  bulkCreateMissingTranslationsAction,
		"panel":   p.name,
		"results": results,
		"summary": summary,
	}, nil
}

func bulkCreateMissingTranslationsError(locale string, err error) map[string]any {
	failure := map[string]any{
		"locale": strings.TrimSpace(locale),
	}
	mapped, status := DefaultErrorPresenter().Present(err)
	if mapped != nil {
		failure["text_code"] = strings.TrimSpace(mapped.TextCode)
		failure["message"] = strings.TrimSpace(mapped.Message)
		if len(mapped.Metadata) > 0 {
			failure["metadata"] = primitives.CloneAnyMap(mapped.Metadata)
		}
		failure["status"] = mapped.Code
		return failure
	}
	failure["status"] = status
	failure["message"] = strings.TrimSpace(err.Error())
	return failure
}

func (p *panelBinding) Preview(c router.Context, locale, id string) (map[string]any, error) {
	if p.admin.preview == nil {
		return nil, FeatureDisabledError{Feature: "preview"}
	}
	format := strings.ToLower(strings.TrimSpace(c.Query("format")))
	if format == "" {
		format = strings.ToLower(strings.TrimSpace(c.Query("token_type")))
	}
	var (
		token string
		err   error
	)
	if format == "jwt" {
		token, err = p.admin.preview.GenerateJWT(p.name, id, 1*time.Hour)
	} else {
		token, err = p.admin.preview.Generate(p.name, id, 1*time.Hour)
	}
	if err != nil {
		return nil, err
	}
	query := url.Values{}
	if strings.TrimSpace(locale) != "" {
		query.Set("locale", locale)
	}

	params := map[string]string{"token": token}
	previewURL := resolveURLWith(p.admin.urlManager, publicAPIGroupName(p.admin.config), "preview", params, query)
	adminURL := resolveURLWith(p.admin.urlManager, adminAPIGroupName(p.admin.config), "preview", params, query)
	return map[string]any{
		"token":     token,
		"url":       previewURL,
		"admin_url": adminURL,
		"format":    format,
	}, nil
}

func (p *panelBinding) Subresources() []boot.PanelSubresourceSpec {
	if p == nil || p.panel == nil {
		return nil
	}
	declared := p.panel.Subresources()
	if len(declared) == 0 {
		return nil
	}
	out := make([]boot.PanelSubresourceSpec, 0, len(declared))
	for _, subresource := range declared {
		out = append(out, boot.PanelSubresourceSpec{
			Name:   strings.TrimSpace(subresource.Name),
			Method: strings.TrimSpace(subresource.Method),
		})
	}
	return out
}

func (p *panelBinding) HandleSubresource(c router.Context, locale, id, subresource, value string) error {
	if p == nil || p.panel == nil {
		return ErrNotFound
	}
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.ServeSubresource(ctx, c, id, subresource, value)
}
