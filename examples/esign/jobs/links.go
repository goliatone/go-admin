package jobs

import (
	"net/url"
	"os"
	"strings"
)

const (
	EnvPublicBaseURL     = "ESIGN_PUBLIC_BASE_URL"
	defaultPublicBaseURL = "http://localhost:8082"
)

func resolvePublicBaseURL() string {
	base := strings.TrimSpace(os.Getenv(EnvPublicBaseURL))
	if base == "" {
		base = defaultPublicBaseURL
	}
	return strings.TrimRight(base, "/")
}

func buildSignLink(rawToken string) string {
	token := strings.TrimSpace(rawToken)
	if token == "" {
		return ""
	}
	return resolvePublicBaseURL() + "/sign/" + url.PathEscape(token)
}

func buildCompletionLink(rawToken string) string {
	token := strings.TrimSpace(rawToken)
	if token == "" {
		return ""
	}
	return resolvePublicBaseURL() + "/sign/" + url.PathEscape(token) + "/complete"
}

func buildAssetContractLink(rawToken string) string {
	token := strings.TrimSpace(rawToken)
	if token == "" {
		return ""
	}
	return resolvePublicBaseURL() + "/api/v1/esign/signing/assets/" + url.PathEscape(token)
}
