package quickstart

import (
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func contentEntryRouteError(panelName, operation, id string, err error) error {
	if err == nil {
		return nil
	}
	message := "content route"
	if panelName = strings.TrimSpace(panelName); panelName != "" {
		message += " panel " + panelName
	}
	if operation = strings.TrimSpace(operation); operation != "" {
		message += " " + operation
	}
	if id = strings.TrimSpace(id); id != "" {
		message += " id " + id
	}
	return admin.WithStack(fmt.Errorf("%s: %w", message, err))
}
