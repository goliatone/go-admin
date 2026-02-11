package main

import (
	"context"
	"log"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

func main() {
	cfg := quickstart.NewAdminConfig(
		"/admin",
		"E-Sign Admin",
		"en",
		quickstart.WithDebugFromEnv(),
		quickstart.WithErrorsFromEnv(),
		quickstart.WithScopeFromEnv(),
	)
	applyESignRuntimeDefaults(&cfg)

	// Explicit namespaces for admin and public signer API surfaces.
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true
	debugEnabled := cfg.Debug.Enabled

	featureDefaults := map[string]bool{
		"esign":        envBool("ESIGN_FEATURE_ENABLED", true),
		"esign_google": envBool("ESIGN_GOOGLE_FEATURE_ENABLED", false),
	}
	if err := validateRuntimeSecurityBaseline(); err != nil {
		log.Fatalf("runtime security baseline: %v", err)
	}

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithFeatureDefaults(featureDefaults),
	)
	if err != nil {
		log.Fatalf("new admin: %v", err)
	}

	if debugEnabled {
		if err := adm.RegisterModule(admin.NewDebugModule(cfg.Debug)); err != nil {
			log.Fatalf("register debug module: %v", err)
		}
	}

	if err := adm.RegisterModule(modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode)); err != nil {
		log.Fatalf("register module: %v", err)
	}

	authn, auther, authCookieName, err := configureESignAuth(adm, cfg)
	if err != nil {
		log.Fatalf("configure auth: %v", err)
	}

	viewEngine, err := newESignViewEngine(cfg, adm)
	if err != nil {
		log.Fatalf("initialize view engine: %v", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(fiber.Config{
			UnescapePath:      true,
			StrictRouting:     false,
			EnablePrintRoutes: true,
			PassLocalsToViews: true,
			Views:             viewEngine,
		})
		app.Use(fiberlogger.New())
		if debugEnabled && cfg.Debug.CaptureLogs {
			app.Use(func(c *fiber.Ctx) error {
				started := time.Now()
				err := c.Next()

				status := c.Response().StatusCode()
				if err != nil {
					if ferr, ok := err.(*fiber.Error); ok && ferr.Code > 0 {
						status = ferr.Code
					} else if status < fiber.StatusBadRequest {
						status = fiber.StatusInternalServerError
					}
				}
				level := slog.LevelInfo
				if err != nil || status >= fiber.StatusInternalServerError {
					level = slog.LevelError
				} else if status >= fiber.StatusBadRequest {
					level = slog.LevelWarn
				}

				requestCtx := c.UserContext()
				if requestCtx == nil {
					requestCtx = context.Background()
				}

				attrs := []any{
					"method", c.Method(),
					"path", c.Path(),
					"status", status,
					"duration_ms", time.Since(started).Milliseconds(),
					"remote_ip", c.IP(),
				}
				if userAgent := strings.TrimSpace(c.Get("User-Agent")); userAgent != "" {
					attrs = append(attrs, "user_agent", userAgent)
				}
				if err != nil {
					attrs = append(attrs, "error", err.Error())
				}

				slog.Log(requestCtx, level, "fiber request", attrs...)
				return err
			})
		}
		return app
	})
	quickstart.NewStaticAssets(server.Router(), cfg, client.Assets(), quickstart.WithDiskAssetsDir(resolveESignDiskAssetsDir()))

	if debugEnabled {
		quickstart.AttachDebugMiddleware(server.Router(), cfg, adm)
	}

	if err := adm.Initialize(server.Router()); err != nil {
		log.Fatalf("initialize admin: %v", err)
	}
	routes := handlers.BuildRouteSet(adm.URLs(), adm.BasePath(), adm.AdminAPIGroup())
	if err := registerESignWebRoutes(server.Router(), cfg, adm, authn, auther, authCookieName, routes); err != nil {
		log.Fatalf("register web routes: %v", err)
	}
	if debugEnabled {
		enableSlog := !strings.EqualFold(os.Getenv("ADMIN_DEBUG_SLOG"), "false") &&
			strings.TrimSpace(os.Getenv("ADMIN_DEBUG_SLOG")) != "0"
		if enableSlog {
			quickstart.AttachDebugLogHandler(cfg, adm)
		}
	}

	addr := listenAddr()
	log.Printf("e-sign admin ready at http://localhost%s%s", addr, adm.BasePath())
	if err := server.Serve(addr); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func listenAddr() string {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		return ":8082"
	}
	if _, err := strconv.Atoi(strings.TrimPrefix(port, ":")); err != nil {
		return ":8082"
	}
	if strings.HasPrefix(port, ":") {
		return port
	}
	return ":" + port
}

func envBool(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return parsed
}

func validateRuntimeSecurityBaseline() error {
	policy := stores.DefaultObjectStorageSecurityPolicy()
	algorithm := strings.TrimSpace(os.Getenv("ESIGN_STORAGE_ENCRYPTION_ALGORITHM"))
	if algorithm == "" {
		algorithm = "aws:kms"
	}
	keys := []string{
		"tenant/bootstrap/org/bootstrap/docs/source.pdf",
		"tenant/bootstrap/org/bootstrap/agreements/agreement-1/executed.pdf",
		"tenant/bootstrap/org/bootstrap/agreements/agreement-1/sig/artifact-1.png",
	}
	for _, key := range keys {
		if err := policy.ValidateObjectWrite(key, algorithm); err != nil {
			return err
		}
	}
	return nil
}

func resolveESignDiskAssetsDir() string {
	return quickstart.ResolveDiskAssetsDir(
		"output.css",
		"assets",
		"pkg/client/assets",
		"../pkg/client/assets",
		"../../pkg/client/assets",
	)
}
