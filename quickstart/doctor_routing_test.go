package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

func TestRoutingRuntimeFindingsClassifyEquivalentSlashAliasAsWarning(t *testing.T) {
	findings := routingRuntimeFindings(&routing.RuntimeReport{
		Available: true,
		State:     router.RegistrationSealed,
		Shadows: []router.RouteShadow{{
			Method: router.GET, Path: "/admin/", ShadowedByPath: "/admin",
			Kind: router.RouteShadowTrailingSlashEquivalent,
		}},
	})
	if len(findings) != 1 {
		t.Fatalf("findings = %#v", findings)
	}
	if findings[0].Severity != admin.DoctorSeverityWarn || findings[0].Code != "quickstart.routing.trailing_slash_alias" {
		t.Fatalf("finding = %#v", findings[0])
	}
}
