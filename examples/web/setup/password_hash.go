package setup

import (
	"flag"
	"os"
	"strings"

	auth "github.com/goliatone/go-auth"
	"golang.org/x/crypto/bcrypt"
)

var hashPassword = auth.HashPassword

func init() {
	if isTestRun() {
		hashPassword = fastHashPassword
	}
}

func fastHashPassword(password string) (string, error) {
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
