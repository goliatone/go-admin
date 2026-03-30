package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type deliveryRuntimeFlow struct {
	state       RequestState
	requestPath string
	cache       *siteContentCache
	resolution  *deliveryResolution
	err         SiteRuntimeError
}

func (r *deliveryRuntime) prepareDeliveryFlow(c router.Context) deliveryRuntimeFlow {
	if r == nil {
		return deliveryRuntimeFlow{}
	}
	state := fallbackRequestState(c, r.siteCfg, "/")
	if strings.TrimSpace(state.ContentChannel) == "" {
		state.ContentChannel = r.siteCfg.ContentChannel
	}
	requestPath := r.requestPathForResolution(c)
	cache := newSiteContentCache()
	requestCtx := RequestContext(c)
	if strings.TrimSpace(state.ContentChannel) != "" {
		requestCtx = admin.WithContentChannel(requestCtx, state.ContentChannel)
	}
	resolution, siteErr := r.resolve(requestCtx, state, requestPath, cache)
	return deliveryRuntimeFlow{
		state:       state,
		requestPath: requestPath,
		cache:       cache,
		resolution:  resolution,
		err:         siteErr,
	}
}
