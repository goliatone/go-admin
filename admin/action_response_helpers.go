package admin

import "github.com/goliatone/go-admin/internal/primitives"

func normalizeActionResponse(response ActionResponse) ActionResponse {
	if response.StatusCode < 200 || response.StatusCode >= 600 {
		response.StatusCode = 200
	}
	response.Data = primitives.CloneAnyMapNilOnEmpty(response.Data)
	return response
}
