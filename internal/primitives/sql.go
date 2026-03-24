package primitives

import (
	"fmt"
	"regexp"
	"strings"
)

var sqlIdentifierPattern = regexp.MustCompile(`^[a-z_][a-z0-9_]*$`)

// NormalizeSQLIdentifier lowercases, trims, and validates a SQL identifier.
func NormalizeSQLIdentifier(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if !sqlIdentifierPattern.MatchString(value) {
		return "", fmt.Errorf("invalid sql identifier %q", value)
	}
	return value, nil
}

// NormalizeSQLIdentifiers validates each SQL identifier in order.
func NormalizeSQLIdentifiers(values []string) ([]string, error) {
	if len(values) == 0 {
		return nil, nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		normalized, err := NormalizeSQLIdentifier(value)
		if err != nil {
			return nil, err
		}
		out = append(out, normalized)
	}
	return out, nil
}
