package admin

import (
	"errors"
	"fmt"
	fiber "github.com/gofiber/fiber/v3"
	router "github.com/goliatone/go-router"
	"net/http"
	"testing"
)

func TestFiberV3NativeErrorMapping(t *testing.T) {
	for _, status := range []int{400, 401, 403, 404, 429, 500} {
		native := fiber.NewError(status, "native failure")
		mapped, got := NewErrorPresenter(ErrorConfig{DevMode: true}).Present(WithStack(fmt.Errorf("boundary: %w", native)))
		if got != status || mapped.Code != status {
			t.Fatalf("status=%d mapped=%+v", got, mapped)
		}
		if !errors.Is(mapped, native) {
			t.Fatal("native cause lost")
		}
	}
}

func TestFiberV3DashboardRegistrationDispatch(t *testing.T) {
	server := router.NewFiberV3Adapter()
	sentinel := errors.New("registration failure")
	matched, err := registerDashboardRoutesByRouterType(server.Router(), dashboardRouteRegistrars{
		FiberV3: func(rt router.Router[*fiber.App]) error {
			rt.Get("/probe", func(c router.Context) error { return c.SendStatus(http.StatusOK) })
			return sentinel
		},
	})
	if !matched || !errors.Is(err, sentinel) {
		t.Fatalf("matched=%v err=%v", matched, err)
	}
	matched, err = registerDashboardRoutesByRouterType(server.Router(), dashboardRouteRegistrars{FiberV3: func(router.Router[*fiber.App]) error { return nil }})
	if !matched || err != nil {
		t.Fatalf("matched=%v err=%v", matched, err)
	}
}
