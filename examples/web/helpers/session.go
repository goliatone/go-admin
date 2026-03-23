package helpers

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/goliatone/go-admin/quickstart"
	fggate "github.com/goliatone/go-featuregate/gate"
)

// SessionUser captures session metadata to expose in templates and APIs.
type SessionUser = quickstart.SessionUser

// BuildSessionUser extracts actor/claims data from the request context.
func BuildSessionUser(ctx context.Context) SessionUser {
	session := quickstart.BuildSessionUser(ctx)
	session.Subtitle = buildSubtitle(session)
	session.Initial = strings.ToUpper(initialRune(session.DisplayName))
	return session
}

// FilterSessionUser hides tenant/org data when those features are disabled.
func FilterSessionUser(session SessionUser, gate fggate.FeatureGate) SessionUser {
	session = quickstart.FilterSessionUser(session, gate)
	session.Subtitle = buildSubtitle(session)
	session.Initial = strings.ToUpper(initialRune(session.DisplayName))
	return session
}

func buildSubtitle(session SessionUser) string {
	parts := []string{}
	if session.Email != "" && session.Email != session.DisplayName {
		parts = append(parts, session.Email)
	} else if session.Subject != "" && session.Subject != session.DisplayName {
		parts = append(parts, session.Subject)
	}

	rolePart := strings.TrimSpace(session.Role)
	tenantPart := strings.TrimSpace(session.TenantID)

	if rolePart != "" && tenantPart != "" {
		parts = append(parts, fmt.Sprintf("%s · %s", rolePart, tenantPart))
	} else {
		if rolePart != "" {
			parts = append(parts, rolePart)
		}
		if tenantPart != "" {
			parts = append(parts, tenantPart)
		}
	}

	if len(parts) == 0 && !session.IsAuthenticated {
		return ""
	}

	return strings.Join(parts, " · ")
}

func initialRune(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "?"
	}
	r, _ := utf8.DecodeRuneInString(value)
	if r == utf8.RuneError {
		return "?"
	}
	return string(r)
}
