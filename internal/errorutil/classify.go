// Package errorutil classifies internal failures without depending on rendered messages.
package errorutil

import (
	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/mattn/go-sqlite3"
)

// All reports whether every branch of an error tree contains a matching node.
// A match above a join does not hide an unrelated failure inside the join.
// match must inspect the supplied node, not search its descendants.
func All(err error, match func(error) bool) bool {
	matched := false
	for err != nil {
		//nolint:errorlint // Inspect the exact unwrap shape to preserve every joined failure.
		switch wrapped := err.(type) {
		case interface{ Unwrap() []error }:
			causes := wrapped.Unwrap()
			if len(causes) == 0 {
				return false
			}
			for _, cause := range causes {
				if !All(cause, match) {
					return false
				}
			}
			return true
		case interface{ Unwrap() error }:
			matched = match(err) || matched
			err = wrapped.Unwrap()
		default:
			return match(err) || matched
		}
	}
	return matched
}

// UniqueViolation matches a single repository or database-driver error node.
// Use All to classify wrapped or joined errors. Other constraint failures do not match.
func UniqueViolation(err error) bool {
	//nolint:errorlint // All owns traversal; classify only this node's stable fields.
	switch typed := err.(type) {
	case *goerrors.Error:
		return typed != nil && typed.Category == repository.CategoryDatabaseDuplicate && typed.TextCode == "DUPLICATE_KEY"
	case interface{ SQLState() string }:
		return typed.SQLState() == "23505"
	case sqlite3.Error:
		return typed.ExtendedCode == sqlite3.ErrConstraintUnique || typed.ExtendedCode == sqlite3.ErrConstraintPrimaryKey
	case interface{ Code() int }:
		// modernc SQLite exposes extended SQLite result codes through Code.
		return typed.Code() == int(sqlite3.ErrConstraintUnique) || typed.Code() == int(sqlite3.ErrConstraintPrimaryKey)
	default:
		return false
	}
}
