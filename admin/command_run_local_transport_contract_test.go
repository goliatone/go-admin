package admin_test

import (
	"testing"

	admin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/commandruntest"
)

func TestLocalCommandRunTransportContract(t *testing.T) {
	commandruntest.RunTransportContract(t, func(testing.TB) admin.CommandRunTransport {
		return admin.NewLocalCommandRunTransport(admin.LocalCommandRunTransportConfig{})
	})
}
