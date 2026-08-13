// Package passwordhash owns password hashing policy for the example application.
package passwordhash

import (
	"flag"
	"os"
	"strings"

	auth "github.com/goliatone/go-auth"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword uses the production authenticator outside tests and minimum-cost
// bcrypt during tests so example package suites remain fast.
func HashPassword(password string) (string, error) {
	if !isTestRun() {
		return auth.HashPassword(password)
	}
	if password == "" {
		return "", auth.ErrNoEmptyString
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	return string(hashed), err
}

func isTestRun() bool {
	if flag.Lookup("test.v") != nil {
		return true
	}
	for _, arg := range os.Args {
		if strings.HasPrefix(arg, "-test.") {
			return true
		}
	}
	return strings.HasSuffix(os.Args[0], ".test")
}
