package admin

import "strings"

// TODO: Should this be part of CMSContentType itself? or a proper helper?
func contentTypePublished(contentType *CMSContentType) bool {
	if contentType == nil {
		return false
	}
	status := strings.ToLower(strings.TrimSpace(contentType.Status))
	return status == "active" || status == "published"
}
