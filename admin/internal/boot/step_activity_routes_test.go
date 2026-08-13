package boot

import (
	"testing"

	router "github.com/goliatone/go-router"
)

type activityBindingStub struct{}

func (activityBindingStub) List(router.Context) (map[string]any, error) { return map[string]any{}, nil }
func (activityBindingStub) FilterOptions(router.Context) (any, error)   { return map[string]any{}, nil }

func TestActivityRouteStepRegistersFilterOptionsRoute(t *testing.T) {
	r := &recordRouter{}
	ctx := &stubCtx{
		router:    r,
		basePath:  "/admin",
		responder: &stubResponder{},
		activity:  activityBindingStub{},
	}
	if err := ActivityRouteStep(ctx); err != nil {
		t.Fatalf("ActivityRouteStep() error = %v", err)
	}
	want := map[string]bool{
		"GET /admin/api/activity":                false,
		"GET /admin/api/activity/filter-options": false,
	}
	for _, call := range r.calls {
		key := call.method + " " + call.path
		if _, ok := want[key]; ok {
			want[key] = true
		}
	}
	for route, found := range want {
		if !found {
			t.Fatalf("route %s was not registered; calls=%#v", route, r.calls)
		}
	}
}
