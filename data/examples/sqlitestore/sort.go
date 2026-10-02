package sqlitestore

import (
	"github.com/goliatone/go-admin/data"
	"sort"
)

func sortOperations(ops []data.Operation) {
	sort.Slice(ops, func(i, j int) bool {
		if ops[i].CreatedAt.Equal(ops[j].CreatedAt) {
			return ops[i].Result.OperationID < ops[j].Result.OperationID
		}
		return ops[i].CreatedAt.After(ops[j].CreatedAt)
	})
}
