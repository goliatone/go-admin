package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type previewResolution struct {
	Present    bool   `json:"present"`
	Valid      bool   `json:"valid"`
	Token      string `json:"token"`
	EntityType string `json:"entity_type"`
	ContentID  string `json:"content_id"`
	Channel    string `json:"channel"`
}

func resolveRequestPreview(c router.Context, adm *admin.Admin, enabled bool) previewResolution {
	if c == nil || !enabled {
		return previewResolution{}
	}
	token := strings.TrimSpace(c.Query("preview_token"))
	if token == "" {
		return previewResolution{}
	}
	out := previewResolution{Present: true, Token: token}
	if adm == nil || adm.Preview() == nil {
		return out
	}
	validated, err := adm.Preview().Validate(token)
	if err != nil || validated == nil {
		return out
	}
	entityType, entityChannel := splitPreviewEntityType(validated.EntityType)
	contentID := strings.TrimSpace(validated.ContentID)
	if entityType == "" || contentID == "" {
		return out
	}
	out.Valid = true
	out.EntityType = entityType
	out.ContentID = contentID
	entityChannel = strings.TrimSpace(entityChannel)
	if entityChannel != "" {
		out.Channel = normalizeContentChannel(entityChannel)
	}
	return out
}

func splitPreviewEntityType(raw string) (string, string) {
	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" {
		return "", ""
	}
	idx := strings.LastIndex(raw, "@")
	if idx <= 0 || idx+1 >= len(raw) {
		return raw, ""
	}
	entityType := strings.TrimSpace(raw[:idx])
	channel := strings.TrimSpace(raw[idx+1:])
	return entityType, channel
}
