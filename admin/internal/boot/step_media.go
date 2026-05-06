package boot

import (
	"encoding/json"
	"strings"

	router "github.com/goliatone/go-router"
)

// MediaStep registers media routes.
func MediaStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootMedia()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	routes := mediaRoutes(ctx, responder, binding)
	return applyRoutes(ctx, routes)
}

type mediaRoutePaths struct {
	library      string
	item         string
	resolve      string
	upload       string
	presign      string
	confirm      string
	capabilities string
}

func newMediaRoutePaths(ctx BootCtx) mediaRoutePaths {
	return mediaRoutePaths{
		library:      routePath(ctx, ctx.AdminAPIGroup(), "media.library"),
		item:         routePath(ctx, ctx.AdminAPIGroup(), "media.item"),
		resolve:      routePath(ctx, ctx.AdminAPIGroup(), "media.resolve"),
		upload:       routePath(ctx, ctx.AdminAPIGroup(), "media.upload"),
		presign:      routePath(ctx, ctx.AdminAPIGroup(), "media.presign"),
		confirm:      routePath(ctx, ctx.AdminAPIGroup(), "media.confirm"),
		capabilities: routePath(ctx, ctx.AdminAPIGroup(), "media.capabilities"),
	}
}

func mediaRoutes(ctx BootCtx, responder Responder, binding MediaBinding) []RouteSpec {
	paths := newMediaRoutePaths(ctx)
	gates := ctx.Gates()
	return []RouteSpec{
		{Method: "GET", Path: paths.library, Handler: withFeatureGate(responder, gates, FeatureMedia, mediaListHandler(responder, binding))},
		{Method: "GET", Path: paths.item, Handler: withFeatureGate(responder, gates, FeatureMedia, mediaGetHandler(responder, binding))},
		{Method: "PATCH", Path: paths.item, Handler: withFeatureGate(responder, gates, FeatureMedia, withParsedBody(ctx, responder, mediaUpdateHandler(responder, binding)))},
		{Method: "DELETE", Path: paths.item, Handler: withFeatureGate(responder, gates, FeatureMedia, mediaDeleteHandler(responder, binding))},
		{Method: "POST", Path: paths.resolve, Handler: withFeatureGate(responder, gates, FeatureMedia, withParsedBody(ctx, responder, mediaResolveHandler(responder, binding)))},
		{Method: "POST", Path: paths.upload, Handler: withFeatureGate(responder, gates, FeatureMedia, mediaUploadHandler(responder, binding))},
		{Method: "POST", Path: paths.presign, Handler: withFeatureGate(responder, gates, FeatureMedia, withParsedBody(ctx, responder, mediaPresignHandler(responder, binding)))},
		{Method: "POST", Path: paths.confirm, Handler: withFeatureGate(responder, gates, FeatureMedia, withParsedBody(ctx, responder, mediaConfirmHandler(responder, binding)))},
		{Method: "GET", Path: paths.capabilities, Handler: withFeatureGate(responder, gates, FeatureMedia, mediaCapabilitiesHandler(responder, binding))},
	}
}

func mediaListHandler(responder Responder, binding MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		payload, err := binding.List(c)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaGetHandler(responder Responder, binding MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		payload, err := binding.Get(c, c.Param("id"))
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaUpdateHandler(responder Responder, binding MediaBinding) func(router.Context, map[string]any) error {
	return func(c router.Context, body map[string]any) error {
		payload, err := binding.Update(c, c.Param("id"), body)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaDeleteHandler(responder Responder, binding MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		if err := binding.Delete(c, c.Param("id")); err != nil {
			return writeJSONOrError(responder, c, nil, err)
		}
		return responder.WriteJSON(c, map[string]any{"status": "ok"})
	}
}

func mediaResolveHandler(responder Responder, binding MediaBinding) func(router.Context, map[string]any) error {
	return func(c router.Context, body map[string]any) error {
		payload, err := binding.Resolve(c, body)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaUploadHandler(responder Responder, binding MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		body, file, err := parseMediaUploadRequest(c)
		if err != nil {
			return writeJSONOrError(responder, c, nil, err)
		}
		if file.Reader != nil {
			defer func() {
				_ = file.Reader.Close()
			}()
		}
		payload, err := binding.Upload(c, body, file)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaPresignHandler(responder Responder, binding MediaBinding) func(router.Context, map[string]any) error {
	return func(c router.Context, body map[string]any) error {
		payload, err := binding.Presign(c, body)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaConfirmHandler(responder Responder, binding MediaBinding) func(router.Context, map[string]any) error {
	return func(c router.Context, body map[string]any) error {
		payload, err := binding.Confirm(c, body)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func mediaCapabilitiesHandler(responder Responder, binding MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		payload, err := binding.Capabilities(c)
		return writeJSONOrError(responder, c, payload, err)
	}
}

func parseMediaUploadRequest(c router.Context) (map[string]any, MultipartFile, error) {
	header, err := c.FormFile("file")
	if err != nil || header == nil {
		return nil, MultipartFile{}, bootValidationError("file", "file required")
	}

	body := map[string]any{}
	if value := strings.TrimSpace(c.FormValue("name")); value != "" {
		body["name"] = value
	}
	if value := strings.TrimSpace(c.FormValue("file_name")); value != "" {
		body["file_name"] = value
	}
	if value := strings.TrimSpace(c.FormValue("content_type")); value != "" {
		body["content_type"] = value
	}
	if raw := strings.TrimSpace(c.FormValue("metadata")); raw != "" {
		var metadata map[string]any
		err = json.Unmarshal([]byte(raw), &metadata)
		if err != nil {
			return nil, MultipartFile{}, bootValidationError("metadata", "metadata must be valid JSON")
		}
		body["metadata"] = metadata
	}

	file, err := header.Open()
	if err != nil {
		return nil, MultipartFile{}, bootValidationError("file", "file required")
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = strings.TrimSpace(toString(body["content_type"]))
	}

	return body, MultipartFile{
		FileName:    header.Filename,
		ContentType: contentType,
		Size:        header.Size,
		Reader:      file,
	}, nil
}
