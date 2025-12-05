package stores

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

// PageRepository represents the operations needed by panels, search, and commands.
type PageRepository interface {
	Seed()
	WithActivitySink(admin.ActivitySink)
	List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error)
	Get(ctx context.Context, id string) (map[string]any, error)
	Create(ctx context.Context, record map[string]any) (map[string]any, error)
	Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
	Delete(ctx context.Context, id string) error
	Publish(ctx context.Context, ids []string) ([]map[string]any, error)
	Unpublish(ctx context.Context, ids []string) ([]map[string]any, error)
}

// PostRepository captures blog post operations plus publish/archive actions.
type PostRepository interface {
	Seed()
	WithActivitySink(admin.ActivitySink)
	List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error)
	Get(ctx context.Context, id string) (map[string]any, error)
	Create(ctx context.Context, record map[string]any) (map[string]any, error)
	Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
	Delete(ctx context.Context, id string) error
	Publish(ctx context.Context, ids []string) ([]map[string]any, error)
	Archive(ctx context.Context, ids []string) ([]map[string]any, error)
}
