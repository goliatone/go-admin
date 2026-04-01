package quickstart

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	i18n "github.com/goliatone/go-i18n"
	router "github.com/goliatone/go-router"
)

func parseJSONBody(c router.Context, target any) error {
	if c == nil || target == nil {
		return nil
	}
	body := c.Body()
	if len(body) == 0 {
		return nil
	}
	if err := json.Unmarshal(body, target); err != nil {
		return goerrors.New("invalid json payload", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_JSON")
	}
	return nil
}

func normalizeCookieChannel(value string) (string, bool) {
	channel := strings.ToLower(strings.TrimSpace(value))
	if channel == "" {
		return "", true
	}
	if len(channel) > 64 {
		return "", false
	}
	for i, ch := range channel {
		isLowerAlpha := ch >= 'a' && ch <= 'z'
		isDigit := ch >= '0' && ch <= '9'
		isPunctuation := ch == '-' || ch == '_'
		if !isLowerAlpha && !isDigit && !isPunctuation {
			return "", false
		}
		if i == 0 && !isLowerAlpha && !isDigit {
			return "", false
		}
	}
	return channel, true
}

func resolveContentChannel(c router.Context) string {
	if c == nil {
		return ""
	}
	candidates := []string{
		c.Query(admin.ContentChannelScopeQueryParam),
		c.Query("channel"),
		c.Query("content_channel"),
		c.Header("X-Admin-Channel"),
		c.Header("X-Content-Channel"),
		c.Cookies(channelCookieName),
	}
	for _, candidate := range candidates {
		if channel, ok := normalizeCookieChannel(candidate); ok && channel != "" {
			return channel
		}
	}
	return ""
}

func resolveLocaleFromRequest(adm *admin.Admin, c router.Context, fallback string) string {
	if adm != nil {
		return adm.ResolveLocaleFromRequest(c, fallback)
	}
	fallback = i18n.NormalizeLocale(fallback)
	if c == nil {
		return fallback
	}
	if locale := i18n.NormalizeLocale(c.Query("locale")); locale != "" {
		return locale
	}
	if locale := i18n.NormalizeLocale(c.Query("requested_locale")); locale != "" {
		return locale
	}
	if locale := i18n.NormalizeLocale(admin.LocaleFromContext(c.Context())); locale != "" {
		return locale
	}
	return fallback
}

func adminContextFromRequest(adm *admin.Admin, c router.Context, locale string) admin.AdminContext {
	if c == nil {
		return admin.AdminContext{Locale: i18n.NormalizeLocale(locale)}
	}
	ctx := c.Context()
	locale = resolveLocaleFromRequest(adm, c, locale)
	userID := strings.TrimSpace(c.Header("X-User-ID"))
	tenantID := ""
	orgID := ""
	if actor, ok := authlib.ActorFromRouterContext(c); ok && actor != nil {
		if actor.ActorID != "" {
			userID = actor.ActorID
		} else if actor.Subject != "" {
			userID = actor.Subject
		}
		if actor.TenantID != "" {
			tenantID = actor.TenantID
		}
		if actor.OrganizationID != "" {
			orgID = actor.OrganizationID
		}
		ctx = authlib.WithActorContext(ctx, actor)
	}
	channel := resolveContentChannel(c)
	if channel != "" {
		ctx = admin.WithContentChannel(ctx, channel)
	}
	if locale != "" {
		ctx = admin.WithLocale(ctx, locale)
	}
	return admin.AdminContext{
		Context:     ctx,
		UserID:      userID,
		TenantID:    tenantID,
		OrgID:       orgID,
		Channel:     channel,
		Environment: channel,
		Locale:      locale,
	}
}
