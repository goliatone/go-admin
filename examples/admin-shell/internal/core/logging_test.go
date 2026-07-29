package core

import (
	"bytes"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/admin-shell/config"
	goerrors "github.com/goliatone/go-errors"
)

func TestStartupLoggingIncludesIdentityAndExcludesSecrets(t *testing.T) {
	cfg := config.Defaults()
	cfg.Auth.SigningKey = "signing-secret-value"
	cfg.Auth.DemoPassword = "password-secret-value"
	cfg.Logging.Format = "json"

	var out bytes.Buffer
	root := NewRootLogger(&out)
	root.Configure(&cfg)
	LogStartupConfig(root.GetLogger("core"), &cfg, "configured")
	logged := out.String()

	for _, expected := range []string{
		`"logger":"core"`,
		`"service":"go-admin-shell"`,
		`"environment":"development"`,
		`"app_id":"admin-shell"`,
		`"phase":"configured"`,
		`"admin_base_path":"/admin"`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("startup log missing %s: %s", expected, logged)
		}
	}
	for _, secret := range []string{cfg.Auth.SigningKey, cfg.Auth.DemoPassword} {
		if strings.Contains(logged, secret) {
			t.Fatalf("startup log exposed secret %q: %s", secret, logged)
		}
	}
}

func TestRootLoggerConfigurationPropagatesToExistingChildren(t *testing.T) {
	var out bytes.Buffer
	root := NewRootLogger(&out)
	child := root.GetLogger("config")
	child.Debug("before configuration")

	cfg := config.Defaults()
	cfg.Logging.Level = "debug"
	cfg.Logging.Format = "json"
	root.Configure(&cfg)
	child.Debug("after configuration")

	logged := out.String()
	if strings.Contains(logged, "before configuration") {
		t.Fatalf("bootstrap logger unexpectedly emitted debug output: %s", logged)
	}
	for _, expected := range []string{
		`"logger":"config"`,
		`"msg":"after configuration"`,
		`"environment":"development"`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("configured child log missing %s: %s", expected, logged)
		}
	}
}

func TestRootLoggerAddsRichGoErrorAttributes(t *testing.T) {
	var out bytes.Buffer
	root := NewRootLogger(&out)
	root.Configure(nil)
	err := goerrors.New("invalid request", goerrors.CategoryValidation).
		WithCode(422).
		WithTextCode("INVALID_REQUEST")

	root.GetLogger("core").Error("request rejected", "error", err)
	logged := out.String()
	for _, expected := range []string{
		`"text_code":"INVALID_REQUEST"`,
		`"category":"validation"`,
		`"error_code":422`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("rich error log missing %s: %s", expected, logged)
		}
	}
}

func TestRouterLoggerSupportsFormattedAndStructuredCalls(t *testing.T) {
	var out bytes.Buffer
	root := NewRootLogger(&out)
	cfg := config.Defaults()
	cfg.Logging.Format = "json"
	root.Configure(&cfg)
	adapter := newRouterLogger(root.GetLogger("router"), true)

	adapter.Warn("route conflict: %v", "duplicate")
	adapter.Info("registering route", "method", "GET", "path", "/healthz")
	logged := out.String()
	for _, expected := range []string{
		`"logger":"router"`,
		`"msg":"route conflict: duplicate"`,
		`"method":"GET"`,
		`"path":"/healthz"`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("router log missing %s: %s", expected, logged)
		}
	}
}

func TestRouterLoggerPreservesLiteralPercentAndFlattensStructuredFields(t *testing.T) {
	var out bytes.Buffer
	root := NewRootLogger(&out)
	root.Configure(nil)
	adapter := newRouterLogger(root.GetLogger("router"), true)

	adapter.Info("import is 100% complete", []any{"records", 42})
	logged := out.String()
	for _, expected := range []string{
		`"msg":"import is 100% complete"`,
		`"records":42`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("router log missing %s: %s", expected, logged)
		}
	}
	if strings.Contains(logged, "%!") {
		t.Fatalf("router log was corrupted by printf formatting: %s", logged)
	}
}

func TestRouterLoggerPreservesRichErrorsFromPrintfCalls(t *testing.T) {
	var out bytes.Buffer
	root := NewRootLogger(&out)
	root.Configure(nil)
	adapter := newRouterLogger(root.GetLogger("router"), true)
	err := goerrors.New("route conflict", goerrors.CategoryConflict).
		WithTextCode("ROUTE_CONFLICT")

	adapter.Error("route registration failed: %v", err)
	logged := out.String()
	for _, expected := range []string{
		`"msg":"route registration failed: [conflict:ROUTE_CONFLICT] The request conflicts with the current state."`,
		`"category":"conflict"`,
		`"text_code":"ROUTE_CONFLICT"`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("router error log missing %s: %s", expected, logged)
		}
	}
}

func TestRouterLoggerQuietModeSuppressesOnlyRouteRegistration(t *testing.T) {
	var out bytes.Buffer
	root := NewRootLogger(&out)
	root.Configure(nil)
	adapter := newRouterLogger(root.GetLogger("router"), false)

	adapter.Info("registering route", "method", "GET", "path", "/quiet")
	adapter.Info("router initialized", "routes", 1)
	logged := out.String()
	if strings.Contains(logged, "/quiet") {
		t.Fatalf("quiet router logger emitted route registration: %s", logged)
	}
	if !strings.Contains(logged, `"msg":"router initialized"`) {
		t.Fatalf("quiet router logger suppressed non-route record: %s", logged)
	}
}
