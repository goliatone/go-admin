package boot

// NotificationsWidgetStep registers the notifications dashboard provider.
func NotificationsWidgetStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	return ctx.NotificationsWidget()
}
