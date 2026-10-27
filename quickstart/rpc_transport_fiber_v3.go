package quickstart

import (
	"github.com/gofiber/fiber/v3"
	router "github.com/goliatone/go-router"
)

func resolveRPCFiberV3Router(r any) router.Router[*fiber.App] {
	return resolveRPCFiberV3RouterDepth(r, 0)
}

func resolveRPCFiberV3RouterDepth(r any, depth int) router.Router[*fiber.App] {
	if r == nil {
		return nil
	}
	if rt, ok := r.(router.Router[*fiber.App]); ok {
		return rt
	}
	if depth >= 8 {
		return nil
	}
	underlying, ok := r.(rpcUnderlyingRouter)
	if !ok {
		return nil
	}
	return resolveRPCFiberV3RouterDepth(underlying.UnderlyingRouter(), depth+1)
}
