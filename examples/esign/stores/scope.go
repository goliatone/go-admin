package stores

import "strings"

// Scope captures tenant and organization context required by e-sign stores.
type Scope struct {
	TenantID string
	OrgID    string
}

func (s Scope) normalize() Scope {
	return Scope{
		TenantID: strings.TrimSpace(s.TenantID),
		OrgID:    strings.TrimSpace(s.OrgID),
	}
}

func (s Scope) key() string {
	n := s.normalize()
	return n.TenantID + "|" + n.OrgID
}

func validateScope(scope Scope) (Scope, error) {
	scope = scope.normalize()
	if scope.TenantID == "" || scope.OrgID == "" {
		return Scope{}, scopeRequiredError()
	}
	return scope, nil
}

func normalizeID(id string) string {
	return strings.TrimSpace(id)
}
