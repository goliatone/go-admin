package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/goliatone/go-admin/data"
)

// RegisterDataMaintenanceCommands registers optional native maintenance without
// enabling it or granting domain permissions. Factories accept no actor/scope.
func RegisterDataMaintenanceCommands(bus *CommandBus, service *data.MaintenanceService) (CommandRegistrationHandle, error) {
	if bus == nil || service == nil {
		return nil, data.Error(data.CodeInvalid)
	}
	set, e := bus.NewRegistrationSet("admin.data.maintenance")
	if e != nil {
		return nil, e
	}
	if e = RegisterSetCommand(set, &data.MaintenanceConfigureCommand{Service: service}); e != nil {
		return nil, e
	}
	if e = RegisterSetCommand(set, &data.MaintenanceEnsureCommand{Service: service}); e != nil {
		return nil, e
	}
	if e = RegisterSetCommand(set, &data.MaintenanceStatusHandler{Service: service}); e != nil {
		return nil, e
	}
	if e = RegisterSetContextMessageResultFactory[data.MaintenanceConfigureRequest, data.MaintenanceResult](set, data.MaintenanceConfigureCommandID, maintenanceFactory[data.MaintenanceConfigureRequest](service)); e != nil {
		return nil, e
	}
	if e = RegisterSetContextMessageResultFactory[data.MaintenanceEnsureRequest, data.MaintenanceResult](set, data.MaintenanceEnsureCommandID, maintenanceFactory[data.MaintenanceEnsureRequest](service)); e != nil {
		return nil, e
	}
	if e = RegisterSetContextMessageResultFactory[data.MaintenanceStatusQuery, data.MaintenanceResult](set, data.MaintenanceStatusQueryID, func(ctx context.Context, payload map[string]any, ids []string) (data.MaintenanceStatusQuery, error) {
		if len(payload) != 0 || len(ids) != 0 {
			return data.MaintenanceStatusQuery{}, data.Error(data.CodeInvalid)
		}
		return data.MaintenanceStatusQuery{}, service.Authorize(ctx, false)
	}); e != nil {
		return nil, e
	}
	return set.Commit()
}
func maintenanceFactory[T interface{ Validate() error }](service *data.MaintenanceService) func(context.Context, map[string]any, []string) (T, error) {
	return func(ctx context.Context, payload map[string]any, ids []string) (r T, e error) {
		if len(ids) != 0 {
			return r, data.Error(data.CodeInvalid)
		}
		raw, e := json.Marshal(payload)
		if e != nil || len(raw) > 4096 {
			return r, data.Error(data.CodeInvalid)
		}
		dec := json.NewDecoder(bytes.NewReader(raw))
		dec.DisallowUnknownFields()
		if e = dec.Decode(&r); e != nil {
			return r, data.Error(data.CodeInvalid)
		}
		if e = r.Validate(); e != nil {
			return r, e
		}
		return r, service.Authorize(ctx, true)
	}
}
