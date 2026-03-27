package admin

import "context"

func assignActivitySink(target *ActivitySink, sink ActivitySink) {
	if target != nil && sink != nil {
		*target = sink
	}
}

func recordEntityActivity(
	ctx context.Context,
	sink ActivitySink,
	action, object string,
	metadata map[string]any,
) {
	if sink == nil {
		return
	}
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = userIDFromContext(ctx)
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	_ = sink.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   object,
		Metadata: metadata,
	})
}
