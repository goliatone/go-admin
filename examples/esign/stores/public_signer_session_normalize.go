package stores

import "strings"

func NormalizePublicSignerSessionSubjectKind(kind string) string {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case PublicSignerSessionSubjectKindSigning:
		return PublicSignerSessionSubjectKindSigning
	case PublicSignerSessionSubjectKindReview:
		return PublicSignerSessionSubjectKindReview
	default:
		return ""
	}
}

func NormalizePublicSignerSessionTokenStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", PublicSignerSessionTokenStatusActive:
		return PublicSignerSessionTokenStatusActive
	case PublicSignerSessionTokenStatusRevoked:
		return PublicSignerSessionTokenStatusRevoked
	default:
		return ""
	}
}
