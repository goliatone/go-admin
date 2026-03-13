package data

import (
	"embed"
	"io/fs"
)

//go:embed client
var embeddedFS embed.FS

var (
	clientFS         = mustSubFS(embeddedFS, "client")
	clientSyncCoreFS = mustSubFS(embeddedFS, "client/sync-core")
)

// ClientFS returns embedded sync client artifacts rooted at `data/client`.
func ClientFS() fs.FS {
	return clientFS
}

// ClientSyncCoreFS returns embedded sync-core artifacts rooted at `data/client/sync-core`.
func ClientSyncCoreFS() fs.FS {
	return clientSyncCoreFS
}

func mustSubFS(root fs.FS, path string) fs.FS {
	sub, err := fs.Sub(root, path)
	if err != nil {
		panic(err)
	}
	return sub
}
