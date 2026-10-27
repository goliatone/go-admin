package quickstart

import (
	"strings"

	"github.com/valyala/fasthttp"
)

// resetFiberOwnedMissRepresentation discards the old payload before error
// presentation. Both native backends share this response type. Keep middleware
// headers, cookies, cache policy and connection state intact; only metadata
// describing the discarded representation must be removed.
func resetFiberOwnedMissRepresentation(response *fasthttp.Response) {
	response.ResetBody()
	representationHeaders := [...]string{
		"Content-Type", "Content-Length", "Content-Encoding", "Content-Disposition",
		"Content-Range", "Content-Language", "Content-Location", "Accept-Ranges",
		"ETag", "Last-Modified", "Content-MD5", "Digest", "Content-Digest", "Repr-Digest",
	}
	// Include the canonical names to reset dedicated fasthttp fields even when
	// they have no serialized value. Copy matching stored keys before deleting:
	// mutating headers during iteration is unsafe, and keys may alias storage.
	keys := representationHeaders[:]
	collect := func(key []byte) bool {
		for _, name := range representationHeaders {
			if strings.EqualFold(string(key), name) {
				keys = append(keys, string(key))
				return true
			}
		}
		return false
	}
	for key := range response.Header.All() {
		collect(key)
	}
	var retainedTrailers []string
	removedTrailers := false
	for key := range response.Header.Trailers() {
		if collect(key) {
			removedTrailers = true
		} else {
			retainedTrailers = append(retainedTrailers, string(key))
		}
	}
	// Del matches stored keys exactly after optional normalization. Delete the
	// copied spellings verbatim, including duplicate casing variants, then
	// restore the caller's setting for subsequent presentation and middleware.
	if !response.Header.DisableNormalizing() {
		defer response.Header.EnableNormalizing()
	}
	if removedTrailers {
		// Unannounce first: SetTrailer preserves the order of retained values,
		// while Del can reorder them. Dropped values move to ordinary headers
		// and are deleted below before presentation. Retained names are already
		// validated by fasthttp; normalization stays off to preserve spelling.
		_ = response.Header.SetTrailer(strings.Join(retainedTrailers, ", "))
	}
	for _, key := range keys {
		response.Header.Del(key)
	}
}
