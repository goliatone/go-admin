package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/goliatone/go-admin/examples/admin-shell/internal/config"
	"github.com/goliatone/go-admin/examples/admin-shell/internal/core"
	apphttp "github.com/goliatone/go-admin/examples/admin-shell/internal/http"
)

func main() {
	if err := run(); err != nil {
		slog.Error("admin shell stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	appCore, err := core.New(ctx, &cfg, core.WithRouteRegistrar(apphttp.Register))
	if err != nil {
		return fmt.Errorf("initialize application: %w", err)
	}

	appCore.Logger.Info("admin shell ready",
		"address", cfg.Server.Address,
		"home", joinURL(normalizeAddress(cfg.Server.Address), "/"),
		"admin", joinURL(normalizeAddress(cfg.Server.Address), cfg.Admin.BasePath),
		"config", cfg.ConfigPath,
	)
	if appCore.DemoCredentialsVisible() {
		for _, credential := range appCore.DemoCredentials {
			appCore.Logger.Info("development demo auth credential",
				"username", credential.Username,
				"email", credential.Email,
				"password", credential.Password,
				"role", credential.Role,
			)
		}
	}

	return appCore.Run(ctx)
}

func normalizeAddress(address string) string {
	address = strings.TrimSpace(address)
	if strings.HasPrefix(address, "http://") || strings.HasPrefix(address, "https://") {
		return address
	}
	if strings.HasPrefix(address, ":") {
		return "http://localhost" + address
	}
	if address == "" {
		return "http://localhost:8383"
	}
	return "http://" + address
}

func joinURL(base, suffix string) string {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	suffix = strings.TrimSpace(suffix)
	if suffix == "" {
		return base
	}
	if strings.HasPrefix(suffix, "/") {
		return base + suffix
	}
	return base + "/" + suffix
}
