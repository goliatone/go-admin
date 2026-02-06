package stores

import (
	auth "github.com/goliatone/go-auth"
	"golang.org/x/crypto/bcrypt"
)

func init() {
	hashPassword = func(password string) (string, error) {
		if password == "" {
			return "", auth.ErrNoEmptyString
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
		return string(hashed), err
	}
}
