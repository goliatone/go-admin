package admin

import (
	"context"
	"strings"
)

const (
	debugSessionActivityChannel      = "debug"
	debugSessionActivityObjectPrefix = "debug_session:"
	debugSessionActivityActionAttach = "debug.session.attach"
)

func debugSessionActivityObject(sessionID string) string {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return debugSessionActivityObjectPrefix
	}
	return debugSessionActivityObjectPrefix + sessionID
}

func recordDebugSessionAttach(admin *Admin, ctx context.Context, session DebugUserSession, attachMeta map[string]any) {
	if admin == nil || admin.activity == nil {
		return
	}
	meta := map[string]any{
		"session_id": session.SessionID,
	}
	if session.UserID != "" {
		meta["user_id"] = session.UserID
	}
	if session.Username != "" {
		meta["username"] = session.Username
	}
	if session.IP != "" {
		meta["ip"] = session.IP
	}
	if session.UserAgent != "" {
		meta["user_agent"] = session.UserAgent
	}
	if session.CurrentPage != "" {
		meta["current_page"] = session.CurrentPage
	}
	if session.RequestCount > 0 {
		meta["request_count"] = session.RequestCount
	}
	for key, value := range attachMeta {
		meta[key] = value
	}

	actor := actorFromContext(ctx)
	if actor == "" {
		actor = ActivityActorTypeSystem
		meta = tagActivityActorType(meta, ActivityActorTypeSystem)
	}
	_ = admin.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   debugSessionActivityActionAttach,
		Object:   debugSessionActivityObject(session.SessionID),
		Channel:  debugSessionActivityChannel,
		Metadata: meta,
	})
}
