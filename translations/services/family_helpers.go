package services

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"strings"

	translationcore "github.com/goliatone/go-admin/translations/core"
)

type Scope struct {
	TenantID string `json:"tenant_id,omitempty"`
	OrgID    string `json:"org_id,omitempty"`
}

func normalizeVariantStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case string(translationcore.VariantStatusDraft):
		return string(translationcore.VariantStatusDraft)
	case string(translationcore.VariantStatusInProgress):
		return string(translationcore.VariantStatusInProgress)
	case string(translationcore.VariantStatusInReview):
		return string(translationcore.VariantStatusInReview)
	case string(translationcore.VariantStatusApproved):
		return string(translationcore.VariantStatusApproved)
	case string(translationcore.VariantStatusPublished):
		return string(translationcore.VariantStatusPublished)
	case string(translationcore.VariantStatusArchived):
		return string(translationcore.VariantStatusArchived)
	default:
		return string(translationcore.VariantStatusDraft)
	}
}

func normalizedStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	set := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized := strings.TrimSpace(strings.ToLower(value))
		if normalized == "" {
			continue
		}
		if _, ok := set[normalized]; ok {
			continue
		}
		set[normalized] = struct{}{}
		out = append(out, normalized)
	}
	sort.Strings(out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizedRequiredFields(fields map[string][]string) map[string][]string {
	if len(fields) == 0 {
		return nil
	}
	out := map[string][]string{}
	for locale, values := range fields {
		normalizedLocale := strings.TrimSpace(strings.ToLower(locale))
		if normalizedLocale == "" {
			continue
		}
		normalizedValues := normalizedStringSlice(values)
		if len(normalizedValues) == 0 {
			continue
		}
		out[normalizedLocale] = normalizedValues
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func DeterministicBlockerID(scope Scope, familyID, code, locale, fieldPath string) string {
	raw := strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(familyID),
		strings.TrimSpace(strings.ToLower(code)),
		strings.TrimSpace(strings.ToLower(locale)),
		strings.TrimSpace(strings.ToLower(fieldPath)),
	}, "|")
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:16])
}
