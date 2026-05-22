package admin

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

func TestBuildDevErrorContextSkipsPresenterForRouteBoundary(t *testing.T) {
	root := t.TempDir()
	presenterFile := writeSourceFile(t, root, "admin/error_presenter.go")
	routeFile := writeSourceFile(t, root, "quickstart/content_entry_routes_crud.go")

	err := &stackError{
		err: errors.New("pq: invalid input syntax for type uuid"),
		stack: goerrors.StackTrace{
			{Function: "github.com/goliatone/go-admin/admin.ErrorPresenter.Present", File: presenterFile, Line: 1},
			{Function: "github.com/goliatone/go-admin/quickstart.(*contentEntryHandlers).editForPanel", File: routeFile, Line: 1},
		},
	}

	ctx := NewErrorPresenter(ErrorConfig{DevMode: true}).BuildDevErrorContext(err, nil)
	if ctx == nil || ctx.PrimarySource == nil {
		t.Fatalf("expected primary source")
	}
	if ctx.PrimarySource.File != routeFile {
		t.Fatalf("primary source = %q, want %q", ctx.PrimarySource.File, routeFile)
	}
}

func TestBuildDevErrorContextPrefersAppRoots(t *testing.T) {
	root := t.TempDir()
	appRoot := filepath.Join(root, "hostapp")
	hostFile := writeSourceFile(t, appRoot, "pkg/repository.go")
	routeFile := writeSourceFile(t, root, "github.com/goliatone/go-admin/admin/internal/boot/step_panels.go")

	err := &stackError{
		err: errors.New("repository failed"),
		stack: goerrors.StackTrace{
			{Function: "github.com/goliatone/go-admin/admin/internal/boot.panelListRoute.func1", File: routeFile, Line: 1},
			{Function: "example.com/hostapp/pkg.(*Repository).List", File: hostFile, Line: 1},
		},
	}

	ctx := NewErrorPresenter(ErrorConfig{DevMode: true, AppRoots: []string{appRoot}}).BuildDevErrorContext(err, nil)
	if ctx == nil || ctx.PrimarySource == nil {
		t.Fatalf("expected primary source")
	}
	if ctx.PrimarySource.File != hostFile {
		t.Fatalf("primary source = %q, want %q", ctx.PrimarySource.File, hostFile)
	}
}

func TestBuildDevErrorContextUsesAppRootOrderAndSkipsModuleCache(t *testing.T) {
	root := t.TempDir()
	firstRoot := filepath.Join(root, "first")
	secondRoot := filepath.Join(root, "second")
	firstFile := writeSourceFile(t, firstRoot, "service.go")
	secondFile := writeSourceFile(t, secondRoot, "service.go")
	modFile := writeSourceFile(t, root, "go/pkg/mod/github.com/goliatone/go-router@v1.2.3/router.go")

	err := &stackError{
		err: errors.New("service failed"),
		stack: goerrors.StackTrace{
			{Function: "github.com/goliatone/go-router.(*Router).Serve", File: modFile, Line: 1},
			{Function: "example.com/app/second.Service", File: secondFile, Line: 1},
			{Function: "example.com/app/first.Service", File: firstFile, Line: 1},
		},
	}

	ctx := NewErrorPresenter(ErrorConfig{
		DevMode:  true,
		AppRoots: []string{firstRoot, secondRoot},
	}).BuildDevErrorContext(err, nil)
	if ctx == nil || ctx.PrimarySource == nil {
		t.Fatalf("expected primary source")
	}
	if ctx.PrimarySource.File != firstFile {
		t.Fatalf("primary source = %q, want earlier app root %q", ctx.PrimarySource.File, firstFile)
	}
}

func TestBuildDevErrorContextPrefersRouteBoundaryOverGenericGoAdminCheckout(t *testing.T) {
	root := t.TempDir()
	genericFile := writeSourceFile(t, root, "github.com/goliatone/go-admin/admin/error_source.go")
	routeFile := writeSourceFile(t, root, "github.com/goliatone/go-admin/admin/internal/boot/step_panels.go")

	err := &stackError{
		err: errors.New("binding failed"),
		stack: goerrors.StackTrace{
			{Function: "github.com/goliatone/go-admin/admin.SelectPrimarySource", File: genericFile, Line: 1},
			{Function: "github.com/goliatone/go-admin/admin/internal/boot.panelDetailRoute.func1", File: routeFile, Line: 1},
		},
	}

	ctx := NewErrorPresenter(ErrorConfig{DevMode: true}).BuildDevErrorContext(err, nil)
	if ctx == nil || ctx.PrimarySource == nil {
		t.Fatalf("expected primary source")
	}
	if ctx.PrimarySource.File != routeFile {
		t.Fatalf("primary source = %q, want %q", ctx.PrimarySource.File, routeFile)
	}
}

func writeSourceFile(t *testing.T, root string, rel string) string {
	t.Helper()
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir source dir: %v", err)
	}
	if err := os.WriteFile(path, []byte("package fixture\n"), 0o644); err != nil {
		t.Fatalf("write source file: %v", err)
	}
	return path
}
