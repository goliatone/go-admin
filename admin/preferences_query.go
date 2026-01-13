package admin

import (
	"context"
	"net/http"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

type preferenceQueryOptions struct {
	Levels           []PreferenceLevel
	Keys             []string
	IncludeTraces    bool
	IncludeVersions  bool
	IncludeEffective bool
}

func preferenceQueryOptionsFromContext(ctx context.Context) (preferenceQueryOptions, error) {
	opts := preferenceQueryOptions{}
	params := queryParamsFromContext(ctx)
	if len(params) == 0 {
		return opts, nil
	}
	var err error
	if levels, ok := params["levels"]; ok {
		opts.Levels, err = parsePreferenceLevels(levels)
		if err != nil {
			return opts, err
		}
	}
	if keys, ok := params["keys"]; ok {
		opts.Keys = parsePreferenceKeys(keys)
	}
	if traces, ok := params["include_traces"]; ok {
		opts.IncludeTraces = parsePreferenceQueryBool(traces)
	}
	if versions, ok := params["include_versions"]; ok {
		opts.IncludeVersions = parsePreferenceQueryBool(versions)
	}
	opts.IncludeEffective = opts.IncludeTraces || opts.IncludeVersions || len(opts.Levels) > 0 || len(opts.Keys) > 0
	return opts, nil
}

func parsePreferenceLevels(values []string) ([]PreferenceLevel, error) {
	parts := splitPreferenceQueryValues(values)
	if len(parts) == 0 {
		return nil, nil
	}
	out := make([]PreferenceLevel, 0, len(parts))
	seen := map[PreferenceLevel]bool{}
	for _, part := range parts {
		switch strings.ToLower(part) {
		case "system":
			if !seen[PreferenceLevelSystem] {
				out = append(out, PreferenceLevelSystem)
				seen[PreferenceLevelSystem] = true
			}
		case "tenant":
			if !seen[PreferenceLevelTenant] {
				out = append(out, PreferenceLevelTenant)
				seen[PreferenceLevelTenant] = true
			}
		case "org":
			if !seen[PreferenceLevelOrg] {
				out = append(out, PreferenceLevelOrg)
				seen[PreferenceLevelOrg] = true
			}
		case "user":
			if !seen[PreferenceLevelUser] {
				out = append(out, PreferenceLevelUser)
				seen[PreferenceLevelUser] = true
			}
		default:
			return nil, goerrors.New("invalid preference level", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithMetadata(map[string]any{
					"level": part,
				})
		}
	}
	return out, nil
}

func parsePreferenceKeys(values []string) []string {
	parts := splitPreferenceQueryValues(values)
	return normalizePreferenceKeys(parts)
}

func parsePreferenceQueryBool(values []string) bool {
	for _, value := range values {
		if toBool(strings.TrimSpace(value)) {
			return true
		}
	}
	return false
}

func splitPreferenceQueryValues(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := []string{}
	for _, value := range values {
		parts := strings.FieldsFunc(value, func(r rune) bool {
			return r == ',' || r == ';' || r == ' ' || r == '\t' || r == '\n' || r == '\r'
		})
		for _, part := range parts {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return out
}
