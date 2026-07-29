package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/goliatone/go-admin/examples/admin-shell/config"
	"github.com/goliatone/go-admin/examples/admin-shell/internal/core"
	apphttp "github.com/goliatone/go-admin/examples/admin-shell/internal/http"
)

func main() {
	logger := core.NewRootLogger(os.Stdout)
	if err := run(logger); err != nil {
		logger.GetLogger("command").Error("admin shell stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *core.RootLogger) error {
	if logger == nil {
		return fmt.Errorf("root logger is required")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.LoadWithLogger(logger.GetLogger("config"))
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	logger.Configure(&cfg)

	appCore, err := core.New(
		ctx,
		&cfg,
		core.WithLoggerProvider(logger),
		core.WithRouteRegistrar(apphttp.Register),
	)
	if err != nil {
		if appCore != nil {
			err = errors.Join(err, appCore.Shutdown(context.Background()))
		}
		return fmt.Errorf("initialize application: %w", err)
	}

	appCore.Logger.Info("admin shell ready",
		"address", cfg.Server.Address,
		"home", joinURL(normalizeAddress(cfg.Server.Address), "/"),
		"admin", joinURL(normalizeAddress(cfg.Server.Address), cfg.Admin.BasePath),
		"config", cfg.ConfigPath,
	)
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
