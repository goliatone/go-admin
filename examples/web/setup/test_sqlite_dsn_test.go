package setup

import (
	"fmt"
	"path/filepath"
	"strings"
	"testing"
)

func testSQLiteDSN(t *testing.T) string {
	t.Helper()
	name := strings.NewReplacer("/", "_", "\\", "_", " ", "_", ":", "_").
		Replace(strings.ToLower(strings.TrimSpace(t.Name())))
	return fmt.Sprintf("file:%s?cache=shared&_fk=1", filepath.Join(t.TempDir(), name+".db"))
}
