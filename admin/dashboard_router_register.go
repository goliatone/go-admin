package admin

import (
	"github.com/gofiber/fiber/v2"
	fiber3 "github.com/gofiber/fiber/v3"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type dashboardRouteRegistrars struct {
	FiberV3 func(router.Router[*fiber3.App]) error        `json:"fiber_v3"`
	HTTP    func(router.Router[*httprouter.Router]) error `json:"http"`
	Fiber   func(router.Router[*fiber.App]) error         `json:"fiber"`
}

// registerDashboardRoutesByRouterType tries supported concrete router backends.
// It returns on first success and preserves the first registration error when all matches fail.
func registerDashboardRoutesByRouterType(r AdminRouter, registrars dashboardRouteRegistrars) (bool, error) {
	if r == nil {
		return false, nil
	}

	var firstErr error
	matched := false

	if registrars.HTTP != nil {
		if rt, ok := r.(router.Router[*httprouter.Router]); ok {
			matched = true
			if err := registrars.HTTP(rt); err == nil {
				return true, nil
			} else if firstErr == nil {
				firstErr = err
			}
		}
	}

	if registrars.Fiber != nil {
		if rt, ok := r.(router.Router[*fiber.App]); ok {
			matched = true
			if err := registrars.Fiber(rt); err == nil {
				return true, nil
			} else if firstErr == nil {
				firstErr = err
			}
		}
	}

	if registrars.FiberV3 != nil {
		if rt, ok := r.(router.Router[*fiber3.App]); ok {
			matched = true
			if err := registrars.FiberV3(rt); err == nil {
				return true, nil
			} else if firstErr == nil {
				firstErr = err
			}
		}
	}

	if firstErr != nil {
		return true, firstErr
	}

	return matched, nil
}
