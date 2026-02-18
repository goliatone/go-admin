package commands

import (
	"errors"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
)

func RegisterPageCommandFactories(bus *admin.CommandBus) error {
	if err := admin.RegisterMessageFactory(bus, pagePublishCommandName, buildPagePublishMsg); err != nil {
		return err
	}
	if err := admin.RegisterMessageFactory(bus, pageBulkPublishCommandName, buildPageBulkPublishMsg); err != nil {
		return err
	}
	return admin.RegisterMessageFactory(bus, pageBulkUnpublishCommandName, buildPageBulkUnpublishMsg)
}

func RegisterPostCommandFactories(bus *admin.CommandBus) error {
	if err := admin.RegisterMessageFactory(bus, postBulkPublishCommandName, buildPostBulkPublishMsg); err != nil {
		return err
	}
	if err := admin.RegisterMessageFactory(bus, postBulkUnpublishCommandName, buildPostBulkUnpublishMsg); err != nil {
		return err
	}
	if err := admin.RegisterMessageFactory(bus, postBulkScheduleCommandName, buildPostBulkScheduleMsg); err != nil {
		return err
	}
	return admin.RegisterMessageFactory(bus, postBulkArchiveCommandName, buildPostBulkArchiveMsg)
}

func RegisterMediaCommandFactories(bus *admin.CommandBus) error {
	return admin.RegisterMessageFactory(bus, mediaBulkDeleteCommandName, buildMediaBulkDeleteMsg)
}

func buildPagePublishMsg(payload map[string]any, ids []string) (PagePublishMsg, error) {
	msg := PagePublishMsg{IDs: commandIDsFromPayload(ids, payload)}
	if len(msg.IDs) == 0 {
		return msg, errors.New("page ids required")
	}
	return msg, nil
}

func buildPageBulkPublishMsg(payload map[string]any, ids []string) (PageBulkPublishMsg, error) {
	msg := PageBulkPublishMsg{IDs: commandIDsFromPayload(ids, payload)}
	if len(msg.IDs) == 0 {
		return msg, errors.New("page ids required")
	}
	return msg, nil
}

func buildPageBulkUnpublishMsg(payload map[string]any, ids []string) (PageBulkUnpublishMsg, error) {
	msg := PageBulkUnpublishMsg{IDs: commandIDsFromPayload(ids, payload)}
	if len(msg.IDs) == 0 {
		return msg, errors.New("page ids required")
	}
	return msg, nil
}

func buildPostBulkPublishMsg(payload map[string]any, ids []string) (PostBulkPublishMsg, error) {
	msg := PostBulkPublishMsg{IDs: commandIDsFromPayload(ids, payload)}
	if len(msg.IDs) == 0 {
		return msg, errors.New("post ids required")
	}
	return msg, nil
}

func buildPostBulkUnpublishMsg(payload map[string]any, ids []string) (PostBulkUnpublishMsg, error) {
	msg := PostBulkUnpublishMsg{IDs: commandIDsFromPayload(ids, payload)}
	if len(msg.IDs) == 0 {
		return msg, errors.New("post ids required")
	}
	return msg, nil
}

func buildPostBulkScheduleMsg(payload map[string]any, ids []string) (PostBulkScheduleMsg, error) {
	msg := PostBulkScheduleMsg{
		IDs:     commandIDsFromPayload(ids, payload),
		Payload: normalizeSchedulePayload(payload),
	}
	if len(msg.IDs) == 0 {
		return msg, errors.New("post ids required")
	}
	return msg, nil
}

func buildPostBulkArchiveMsg(payload map[string]any, ids []string) (PostBulkArchiveMsg, error) {
	msg := PostBulkArchiveMsg{IDs: commandIDsFromPayload(ids, payload)}
	if len(msg.IDs) == 0 {
		return msg, errors.New("post ids required")
	}
	return msg, nil
}

func buildMediaBulkDeleteMsg(payload map[string]any, ids []string) (MediaBulkDeleteMsg, error) {
	msg := MediaBulkDeleteMsg{IDs: commandIDsFromPayload(ids, payload)}
	return msg, nil
}

func normalizeSchedulePayload(payload map[string]any) map[string]any {
	out := cloneAnyMap(payload)
	if out == nil {
		return nil
	}
	for _, key := range []string{"publish_at", "scheduled_at"} {
		if out[key] == nil {
			if record := extractMap(payload["record"]); len(record) > 0 {
				if val, ok := record[key]; ok {
					out[key] = val
				}
			}
		}
		if out[key] == nil {
			if data := extractMap(payload["data"]); len(data) > 0 {
				if val, ok := data[key]; ok {
					out[key] = val
				}
			}
		}
	}
	return out
}

func commandIDsFromPayload(ids []string, payload map[string]any) []string {
	if payload != nil {
		if id := toString(payload["id"]); id != "" {
			ids = append(ids, id)
		}
		ids = append(ids, toStringSlice(payload["ids"])...)

		if selection := extractMap(payload["selection"]); len(selection) > 0 {
			if id := toString(selection["id"]); id != "" {
				ids = append(ids, id)
			}
			ids = append(ids, toStringSlice(selection["ids"])...)
		}
		if record := extractMap(payload["record"]); len(record) > 0 {
			if id := toString(record["id"]); id != "" {
				ids = append(ids, id)
			}
		}
	}
	return dedupeStrings(ids)
}

func toString(val any) string {
	switch v := val.(type) {
	case string:
		return strings.TrimSpace(v)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	default:
		return ""
	}
}

func toStringSlice(val any) []string {
	switch v := val.(type) {
	case []string:
		return dedupeStrings(v)
	case []any:
		out := []string{}
		for _, item := range v {
			if s := toString(item); s != "" {
				out = append(out, s)
			}
		}
		return dedupeStrings(out)
	}
	return nil
}

func extractMap(val any) map[string]any {
	if m, ok := val.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

func dedupeStrings(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}
