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
	flow := r.prepareDeliveryFlow(c)
	if hasSiteRuntimeError(flow.err) {
		return renderSiteRuntimeError(c, flow.state, r.siteCfg, flow.err)
	}
	if flow.resolution == nil {
		return renderSiteRuntimeError(c, flow.state, r.siteCfg, SiteRuntimeError{
			Status:          404,
			RequestedLocale: flow.state.Locale,
		})
	}
	return r.renderResolution(c, flow.state, flow.resolution, flow.requestPath, flow.cache)
}
