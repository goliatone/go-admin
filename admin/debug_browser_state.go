package admin

import (
	"encoding/json"
	"strings"

	"github.com/goliatone/go-admin/console"
	router "github.com/goliatone/go-router"
)

// debugBrowserStateNamespace scopes Debug browser state (active panel, panel
// order, toolbar layout and command recall) by console, application,
// environment, actor and tenant/org scope. Identity comes only from the trusted
// router actor or claims, never from request headers or query values.
//
// It mirrors the server-side Debug preference identity: the explicitly
// unscoped legacy adapter (no app, environment, tenant or org) returns "" so
// the browser keeps its existing keys, and those ambiguous keys are never
// copied into a configured identity.
func debugBrowserStateNamespace(cfg DebugConfig, c router.Context) string {
	if c == nil {
		return ""
	}
	var actorID, tenant, org string
	if ctx := c.Context(); ctx != nil {
		if actor := actorFromRouterOrClaims(c, ctx); actor != nil {
			actorID = strings.TrimSpace(actor.ActorID)
			if actorID == "" {
				actorID = strings.TrimSpace(actor.Subject)
			}
			tenant = strings.TrimSpace(actor.TenantID)
			org = strings.TrimSpace(actor.OrganizationID)
		}
	}
	appID := strings.TrimSpace(cfg.AppID)
	environment := strings.TrimSpace(cfg.Environment)
	if appID == "" && environment == "" && tenant == "" && org == "" {
		return ""
	}
	scope, err := json.Marshal([]string{tenant, org})
	if err != nil {
		return ""
	}
	return console.Identity{
		ConsoleID:     debugModuleID,
		ApplicationID: appID,
		EnvironmentID: environment,
		ActorID:       actorID,
		ScopeKey:      string(scope),
	}.Namespace()
}
