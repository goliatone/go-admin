package admin

import (
	"strings"

	hashid "github.com/goliatone/hashid/pkg/hashid"
	"github.com/google/uuid"
)

func localeUUID(localeCode string) uuid.UUID {
	trimmed := strings.ToLower(strings.TrimSpace(localeCode))
	if trimmed == "" {
		return uuid.Nil
	}
	key := "go-cms:locale:" + trimmed
	if uid, err := hashid.NewUUID(key, hashid.WithHashAlgorithm(hashid.SHA256), hashid.WithNormalization(true)); err == nil && uid != uuid.Nil {
		return uid
	}
	return uuid.NewSHA1(uuid.NameSpaceOID, []byte(key))
}
