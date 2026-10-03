package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/goliatone/go-admin/data"
	gocommand "github.com/goliatone/go-command"
)

type exploreQuery interface {
	Type() string
	Validate() error
}

// Read queries use the bus's owned handler/result-factory generation, ensuring
// module Close/replacement cannot unsubscribe another Data instance's handlers.
// No lifecycle command, operation claim or mutation is dispatched by these reads.
type explorationHandler[Q exploreQuery, R any] struct {
	read func(context.Context, Q) (R, error)
}

func (h *explorationHandler[Q, R]) Run(ctx context.Context, q Q) (R, error) {
	var zero R
	if err := q.Validate(); err != nil {
		return zero, err
	}
	return h.read(ctx, q)
}
func (h *explorationHandler[Q, R]) Execute(ctx context.Context, q Q) error {
	out, err := h.Run(ctx, q)
	if result := gocommand.ResultFromContext[R](ctx); result != nil {
		if err != nil {
			result.StoreError(err)
		} else {
			result.Store(out)
		}
	}
	return err
}
func RegisterDataExplorationQueries(bus *CommandBus, service *data.Service) (CommandRegistrationHandle, error) {
	if bus == nil || service == nil {
		return nil, data.Error(data.CodeUnavailable)
	}
	set, err := bus.NewRegistrationSet("admin.data.explore")
	if err != nil {
		return nil, err
	}
	if err = registerExplorationQuery(set, service.ExploreMetadata); err != nil {
		return nil, err
	}
	if err = registerExplorationQuery(set, service.ExploreSamples); err != nil {
		return nil, err
	}
	if err = registerExplorationQuery(set, service.ExploreRelated); err != nil {
		return nil, err
	}
	if err = registerDataInsightsQueries(set, service); err != nil {
		return nil, err
	}
	if err = registerDataPreviewCommands(set, service); err != nil {
		return nil, err
	}
	return set.Commit()
}
func registerExplorationQuery[Q exploreQuery, R any](set *CommandRegistrationSet, read func(context.Context, Q) (R, error)) error {
	if err := RegisterSetCommand(set, &explorationHandler[Q, R]{read: read}); err != nil {
		return err
	}
	var q Q
	return RegisterSetContextMessageResultFactory[Q, R](set, q.Type(), func(_ context.Context, payload map[string]any, ids []string) (Q, error) {
		var message Q
		if len(ids) != 0 {
			return message, data.Error(data.CodeInvalid)
		}
		encoded, err := json.Marshal(payload)
		if err != nil || len(encoded) > 8<<10 {
			return message, data.Error(data.CodeInvalid)
		}
		decoder := json.NewDecoder(bytes.NewReader(encoded))
		decoder.DisallowUnknownFields()
		if err = decoder.Decode(&message); err != nil {
			return message, data.Error(data.CodeInvalid)
		}
		return message, message.Validate()
	})
}
