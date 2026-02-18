package admin

import (
	"github.com/goliatone/go-admin/admin/internal/boot"
	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

type navigationBinding struct {
	admin *Admin
}

func newNavigationBinding(a *Admin) boot.NavigationBinding {
	if a == nil || a.nav == nil {
		return nil
	}
	return &navigationBinding{admin: a}
}

func (n *navigationBinding) Resolve(c router.Context, locale, code string) (any, map[string]map[string]string) {
	ctx := n.admin.adminContextFromRequest(c, locale)
	items := n.admin.nav.ResolveMenu(ctx.Context, code, locale)
	return items, n.admin.themePayload(ctx.Context)
}

type searchBinding struct {
	admin *Admin
}

func newSearchBinding(a *Admin) boot.SearchBinding {
	if a == nil || a.search == nil {
		return nil
	}
	return &searchBinding{admin: a}
}

func (s *searchBinding) Query(c router.Context, locale, query string, limit int) ([]any, error) {
	ctx := s.admin.adminContextFromRequest(c, locale)
	results, err := s.admin.search.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	out := []any{}
	for _, result := range results {
		out = append(out, result)
	}
	return out, nil
}

type bulkBinding struct {
	admin *Admin
}

func newBulkBinding(a *Admin) boot.BulkBinding {
	if a == nil || a.bulkSvc == nil {
		return nil
	}
	return &bulkBinding{admin: a}
}

func (b *bulkBinding) List(c router.Context) (map[string]any, error) {
	jobs := b.admin.bulkSvc.List(c.Context())
	return map[string]any{"jobs": jobs}, nil
}

func (b *bulkBinding) Start(c router.Context, body map[string]any) (map[string]any, error) {
	total := atoiDefault(toString(body["total"]), 0)
	req := BulkRequest{
		Name:    toString(body["name"]),
		Action:  toString(body["action"]),
		Total:   total,
		Payload: primitives.CloneAnyMap(body),
	}
	if req.Name == "" && req.Action != "" {
		req.Name = req.Action
	}
	job, err := b.admin.bulkSvc.Start(c.Context(), req)
	if err != nil {
		return nil, err
	}
	b.admin.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.trigger", "bulk_job:"+job.ID, tagActivityActorType(map[string]any{
		"name":   job.Name,
		"action": job.Action,
	}, ActivityActorTypeTask))
	return map[string]any{"job": job}, nil
}

func (b *bulkBinding) Rollback(c router.Context, id string, body map[string]any) (map[string]any, error) {
	if rollbackSvc, ok := b.admin.bulkSvc.(BulkRollbacker); ok {
		if id == "" && body != nil {
			id = toString(body["id"])
		}
		if id == "" {
			return nil, validationDomainError("id required", map[string]any{
				"field": "id",
			})
		}
		job, err := rollbackSvc.Rollback(c.Context(), id)
		if err != nil {
			return nil, err
		}
		b.admin.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.rollback", "bulk_job:"+job.ID, tagActivityActorType(map[string]any{
			"name":   job.Name,
			"action": job.Action,
		}, ActivityActorTypeTask))
		return map[string]any{"job": job}, nil
	}
	return nil, FeatureDisabledError{Feature: string(FeatureBulk)}
}
