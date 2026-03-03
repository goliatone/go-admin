package main

import (
	"context"
	"strconv"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-crud"
)

type testCRUDContext struct {
	userCtx context.Context
	query   map[string]string
	status  int
}

func (c *testCRUDContext) UserContext() context.Context {
	return c.userCtx
}

func (c *testCRUDContext) SetUserContext(ctx context.Context) {
	c.userCtx = ctx
}

func (c *testCRUDContext) Params(key string, defaultValue ...string) string {
	if len(defaultValue) > 0 {
		return defaultValue[0]
	}
	return ""
}

func (c *testCRUDContext) BodyParser(_ any) error {
	return nil
}

func (c *testCRUDContext) Query(key string, defaultValue ...string) string {
	if c.query != nil {
		if value, ok := c.query[key]; ok {
			return value
		}
	}
	if len(defaultValue) > 0 {
		return defaultValue[0]
	}
	return ""
}

func (c *testCRUDContext) QueryValues(key string) []string {
	if value := c.Query(key); value != "" {
		return []string{value}
	}
	return nil
}

func (c *testCRUDContext) QueryInt(key string, defaultValue ...int) int {
	if raw := c.Query(key); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			return parsed
		}
	}
	if len(defaultValue) > 0 {
		return defaultValue[0]
	}
	return 0
}

func (c *testCRUDContext) Queries() map[string]string {
	if c.query == nil {
		return map[string]string{}
	}
	return c.query
}

func (c *testCRUDContext) Body() []byte {
	return nil
}

func (c *testCRUDContext) Status(status int) crud.Response {
	c.status = status
	return c
}

func (c *testCRUDContext) JSON(_ any, _ ...string) error {
	return nil
}

func (c *testCRUDContext) SendStatus(status int) error {
	c.status = status
	return nil
}

func TestContentCRUDContextFactoryUsesChannelQueryFirst(t *testing.T) {
	factory := contentCRUDContextFactory("en")
	base := coreadmin.WithContentChannel(context.Background(), "from-context")
	ctx := &testCRUDContext{
		userCtx: base,
		query: map[string]string{
			"locale":  "es",
			"channel": "preview",
		},
	}

	out := factory(ctx)
	got := out.(*testCRUDContext).UserContext()
	if channel := coreadmin.ContentChannelFromContext(got); channel != "preview" {
		t.Fatalf("expected channel from query to win, got %q", channel)
	}
	if locale := coreadmin.LocaleFromContext(got); locale != "es" {
		t.Fatalf("expected locale from query, got %q", locale)
	}
}

func TestContentCRUDContextFactoryFallsBackToLegacyEnvQuery(t *testing.T) {
	factory := contentCRUDContextFactory("en")
	ctx := &testCRUDContext{
		userCtx: context.Background(),
		query: map[string]string{
			"env": "legacy-preview",
		},
	}

	out := factory(ctx)
	got := out.(*testCRUDContext).UserContext()
	if channel := coreadmin.ContentChannelFromContext(got); channel != "legacy-preview" {
		t.Fatalf("expected legacy env query fallback, got %q", channel)
	}
	if locale := coreadmin.LocaleFromContext(got); locale != "en" {
		t.Fatalf("expected default locale fallback en, got %q", locale)
	}
}

func TestContentCRUDContextFactoryFallsBackToContextChannel(t *testing.T) {
	factory := contentCRUDContextFactory("en")
	base := coreadmin.WithContentChannel(context.Background(), "ctx-channel")
	ctx := &testCRUDContext{
		userCtx: base,
		query:   map[string]string{},
	}

	out := factory(ctx)
	got := out.(*testCRUDContext).UserContext()
	if channel := coreadmin.ContentChannelFromContext(got); channel != "ctx-channel" {
		t.Fatalf("expected channel from context fallback, got %q", channel)
	}
}
