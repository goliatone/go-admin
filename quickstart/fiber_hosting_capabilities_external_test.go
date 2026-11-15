package quickstart_test

import (
	"github.com/goliatone/go-admin/admin"
	quickstart "github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
	"testing"
)

func TestPublicFiberHostingCapabilities(t *testing.T) {
	v2, _ := quickstart.NewFiberServer(nil, admin.Config{}, nil, false, quickstart.WithFiberLogger(false))
	v3, _ := quickstart.NewFiberV3Server(nil, admin.Config{}, nil, false, quickstart.WithFiberV3Logger(false))
	for name, server := range map[string]any{"v2": v2, "v3": v3} {
		t.Run(name, func(t *testing.T) {
			if _, ok := server.(router.StartupInitializer); !ok {
				t.Fatal("StartupInitializer hidden")
			}
			if _, ok := server.(router.ManagedServer); !ok {
				t.Fatal("ManagedServer hidden")
			}
			if _, ok := server.(router.BoundedIngressServer); !ok {
				t.Fatal("BoundedIngressServer hidden")
			}
			if _, ok := server.(router.BoundedIngressValidator); !ok {
				t.Fatal("BoundedIngressValidator hidden")
			}
		})
	}
}
