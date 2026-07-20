package site

import (
	"fmt"
	"slices"
	"strings"
	"unicode"

	"github.com/goliatone/go-admin/admin"
)

// ValidateSiteConfig validates explicit optional policies before route registration.
// ResolveSiteConfig intentionally remains normalization-only for source compatibility.
func ValidateSiteConfig(_ admin.Config, input SiteConfig) error {
	if err := validateSearchVariantPolicy(input.Search.VariantPolicy); err != nil {
		return err
	}
	if err := validateSearchPageSizePolicy(input.Search.PageSizePolicy); err != nil {
		return err
	}
	if err := validateSearchFilterOnlyPolicy(input.Search.FilterOnlyPolicy); err != nil {
		return err
	}
	return validateSearchFacetExpansionPolicy(input.Search.FacetExpansionPolicy)
}

func validateSearchVariantPolicy(policy *SiteSearchVariantPolicy) error {
	if policy == nil {
		return nil
	}
	parameter := strings.TrimSpace(policy.QueryParameter)
	if parameter == "" {
		parameter = "variant"
	}
	for index, r := range parameter {
		if !unicode.IsLetter(r) && r != '_' && (index == 0 || !unicode.IsDigit(r)) {
			return fmt.Errorf("search variant query parameter %q is invalid", parameter)
		}
	}
	allowed := make([]string, 0, len(policy.Allowed))
	for _, value := range policy.Allowed {
		value := strings.TrimSpace(string(value))
		if value == "" {
			return fmt.Errorf("search variant allowlist contains an empty value")
		}
		if slices.Contains(allowed, value) {
			return fmt.Errorf("search variant allowlist contains duplicate %q", value)
		}
		allowed = append(allowed, value)
	}
	if len(allowed) == 0 {
		return fmt.Errorf("search variant policy requires a nonempty allowlist")
	}
	if value := strings.TrimSpace(string(policy.Default)); value != "" && !slices.Contains(allowed, value) {
		return fmt.Errorf("default search variant %q is not allowed", value)
	}
	return nil
}

func validateSearchPageSizePolicy(policy *SiteSearchPageSizePolicy) error {
	if policy == nil {
		return nil
	}
	if len(policy.Allowed) == 0 {
		return fmt.Errorf("search page-size policy requires a nonempty allowlist")
	}
	previous := 0
	for _, value := range policy.Allowed {
		if value <= 0 || value > 100 {
			return fmt.Errorf("search page size %d must be in 1..100", value)
		}
		if value <= previous {
			return fmt.Errorf("search page sizes must be strictly increasing without duplicates")
		}
		previous = value
	}
	if policy.Default <= 0 || !slices.Contains(policy.Allowed, policy.Default) {
		return fmt.Errorf("default search page size %d is not allowed", policy.Default)
	}
	return nil
}

func validateSearchFilterOnlyPolicy(policy *SiteSearchFilterOnlyPolicy) error {
	if policy == nil || !policy.Enabled {
		return nil
	}
	allowlists := []struct {
		label  string
		values []string
	}{
		{label: "eligible filter fields", values: policy.EligibleFilterFields},
		{label: "eligible range fields", values: policy.EligibleRangeFields},
		{label: "eligible landing constraints", values: policy.EligibleLandingConstraints},
	}
	for _, allowlist := range allowlists {
		if err := validateSearchStringAllowlist(allowlist.label, allowlist.values); err != nil {
			return err
		}
	}
	if len(searchDedupeStrings(policy.EligibleFilterFields))+len(searchDedupeStrings(policy.EligibleRangeFields))+len(searchDedupeStrings(policy.EligibleLandingConstraints)) == 0 {
		return fmt.Errorf("filter-only search requires at least one eligible constraint")
	}
	if policy.MaxPage < 1 || policy.MaxPage > 10 {
		return fmt.Errorf("filter-only max page must be in 1..10")
	}
	if policy.MaxPageSize < 1 || policy.MaxPageSize > 100 {
		return fmt.Errorf("filter-only max page size must be in 1..100")
	}
	if policy.MaxCandidates < 1 || policy.MaxCandidates > 1000 {
		return fmt.Errorf("filter-only max candidates must be in 1..1000")
	}
	if policy.MaxPage*policy.MaxPageSize > policy.MaxCandidates {
		return fmt.Errorf("filter-only page window exceeds max candidates")
	}
	return nil
}

func validateSearchStringAllowlist(label string, values []string) error {
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			return fmt.Errorf("search %s contains an empty value", label)
		}
		if _, ok := seen[value]; ok {
			return fmt.Errorf("search %s contains duplicate %q", label, value)
		}
		seen[value] = struct{}{}
	}
	return nil
}

func validateSearchFacetExpansionPolicy(policy *SiteSearchFacetExpansionPolicy) error {
	if policy == nil {
		return nil
	}
	seen := map[string]struct{}{}
	for _, field := range policy.Fields {
		field = strings.TrimSpace(field)
		if field == "" {
			return fmt.Errorf("facet expansion policy contains an empty field")
		}
		if _, ok := seen[field]; ok {
			return fmt.Errorf("facet expansion policy contains duplicate %q", field)
		}
		seen[field] = struct{}{}
	}
	return nil
}
