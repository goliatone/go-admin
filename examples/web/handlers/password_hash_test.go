package handlers

import (
	authlib "github.com/goliatone/go-auth"
	"golang.org/x/crypto/bcrypt"
)

func init() {
	hashPassword = func(password string) (string, error) {
		if password == "" {
			return "", authlib.ErrNoEmptyString
		}
		hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
		return string(hashed), err
	}
}
