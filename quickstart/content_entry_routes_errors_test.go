package quickstart

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func TestContentEntryRouteErrorWrapsWithStackAndContext(t *testing.T) {
	base := errors.New("repository failed")

	got := contentEntryRouteError("pages", "load record", "42", base)
	if got == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(got, base) {
		t.Fatalf("expected errors.Is to reach base error")
	}
	if !strings.Contains(got.Error(), "content route panel pages load record id 42") {
		t.Fatalf("unexpected error context: %v", got)
	}
	if stack := adminStackTrace(got); len(stack) == 0 {
		t.Fatalf("expected stack trace")
	}
}

func TestContentEntryRouteErrorPreservesExistingStack(t *testing.T) {
	base := admin.WithStack(errors.New("repository failed"))
	baseStack := adminStackTrace(base)

	got := contentEntryRouteError("pages", "load record", "42", base)
	gotStack := adminStackTrace(got)
	if len(gotStack) != len(baseStack) {
		t.Fatalf("expected existing stack to be preserved, got %d frames want %d", len(gotStack), len(baseStack))
	}
	if len(gotStack) > 0 && gotStack[0] != baseStack[0] {
		t.Fatalf("expected original first stack frame to be preserved")
	}
}

func TestContentEntryEditRawRepositoryFailureGetsRouteBoundaryStack(t *testing.T) {
	rawErr := errors.New("pq: invalid input syntax for type uuid")
	fixture := newContentEntryAdminFixture(t)
	_, err := fixture.Admin.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(failingContentEntryRepo{getErr: rawErr}).
		FormFields(admin.Field{Name: "title", Label: "Title", Type: "text"}))
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handler := &contentEntryHandlers{admin: fixture.Admin, cfg: fixture.Config}
	ctx := router.NewMockContext()
	ctx.ParamsM["name"] = "pages"
	ctx.ParamsM["id"] = "bad-id"
	ctx.On("Context").Return(context.Background())

	got := handler.editForPanel(ctx, "")
	if got == nil {
		t.Fatal("expected repository error")
	}
	if !errors.Is(got, rawErr) {
		t.Fatalf("expected errors.Is to reach raw error")
	}
	if !strings.Contains(got.Error(), "content route panel pages load record") {
		t.Fatalf("missing route context: %v", got)
	}

	devCtx := admin.NewErrorPresenter(admin.ErrorConfig{DevMode: true}).BuildDevErrorContext(got, nil)
	if devCtx == nil || devCtx.PrimarySource == nil {
		t.Fatalf("expected dev primary source")
	}
	if strings.HasSuffix(devCtx.PrimarySource.File, "/admin/error_presenter.go") {
		t.Fatalf("primary source should not be presenter: %s", devCtx.PrimarySource.File)
	}
	if !strings.HasSuffix(devCtx.PrimarySource.File, "/quickstart/content_entry_routes_crud.go") {
		t.Fatalf("primary source = %s, want content entry route", devCtx.PrimarySource.File)
	}
}

type testStackCarrier interface {
	StackTrace() goerrors.StackTrace
}

func adminStackTrace(err error) goerrors.StackTrace {
	var carrier testStackCarrier
	if errors.As(err, &carrier) {
		return carrier.StackTrace()
	}
	return nil
}

type failingContentEntryRepo struct {
	getErr    error
	createErr error
	updateErr error
	deleteErr error
}

func (r failingContentEntryRepo) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (r failingContentEntryRepo) Get(context.Context, string) (map[string]any, error) {
	return nil, r.getErr
}

func (r failingContentEntryRepo) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, r.createErr
}

func (r failingContentEntryRepo) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, r.updateErr
}

func (r failingContentEntryRepo) Delete(context.Context, string) error {
	return r.deleteErr
}
