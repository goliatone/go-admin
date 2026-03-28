package admin

import (
	"context"
	"strings"

	"github.com/google/uuid"
)

func actorUUID(ctx context.Context) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(actorFromContext(ctx))); err == nil {
		return parsed
	}
	return uuid.New()
}
