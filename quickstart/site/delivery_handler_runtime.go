package site

import router "github.com/goliatone/go-router"

func (r *deliveryRuntime) Handler() router.HandlerFunc {
	if r == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		return r.respondDelivery(c)
	}
}

func (r *deliveryRuntime) respondDelivery(c router.Context) error {
	state := fallbackRequestState(c, r.siteCfg, "/")
	if state.ContentChannel == "" {
		state.ContentChannel = r.siteCfg.ContentChannel
	}
	hit, decision, err := r.tryRenderCacheHit(c, state)
	if hit || err != nil {
		return err
	}
	flow := r.prepareDeliveryFlowWithState(c, state)
	if hasSiteRuntimeError(flow.err) {
		return renderSiteRuntimeError(c, flow.state, r.siteCfg, flow.err)
	}
	if flow.resolution == nil {
		if handled, err := r.respondHistoricalContentURLRedirect(c, flow.state, flow.requestPath, decision); handled || err != nil {
			return err
		}
		return renderSiteRuntimeError(c, flow.state, r.siteCfg, SiteRuntimeError{
			Status:          404,
			RequestedLocale: flow.state.Locale,
		})
	}
	return r.renderResolutionWithCache(c, flow.state, flow.resolution, flow.requestPath, flow.cache, decision)
}
