# Admin Temporary Password Guide

This guide documents the bootstrap-user flow for `go-admin` hosts that need an
initial account with a password that expires after 24 hours and must be
replaced.

## Contract

Temporary passwords use existing auth/user storage. No migration is required.

The cross-package metadata keys are:

- `password_temporary`
- `password_change_required`
- `password_temporary_issued_at`
- `password_temporary_expires_at`

Ownership is split intentionally:

- `go-users` owns command orchestration and audit activity.
- `go-auth` owns local password verification and expiry enforcement.
- `go-admin` and quickstart own host wiring, route protection, and UI behavior.

## Package Responsibilities

### go-users

Use `service.Commands().UserBootstrapPassword` to create or refresh a
bootstrap user.

The command:

- creates the user when missing through `UserCreateCommand`
- applies temporary-password metadata before resetting the password
- resets the password through `UserPasswordResetCommand`
- defaults expiry to `24h`
- returns the affected user and `ExpiresAt`

Normal password reset/change clears temporary-password metadata as part of the
password update when the repository implements
`types.TemporaryPasswordResetRepository`. The go-auth backed adapter uses a
transactional reset-and-clear primitive when the user currently carries
temporary-password metadata. Repositories without that optional primitive still
allow ordinary password resets for users without temporary markers, while
temporary-password users fail closed until atomic cleanup is available.
Bootstrap reset preserves temporary metadata so a temporary bootstrap password
cannot be active without the required change marker.

### go-auth

`auth.NewUserProvider(repoManager.Users())` reads the metadata from local
`go-auth` users.

Login behavior:

- if the password does not match, login fails normally
- if the password matches and the temporary-password expiry is in the past,
  missing, or malformed, login fails with `auth.ErrTemporaryPasswordExpired`
- if the password matches and the temporary password has not expired, login
  succeeds so the host can route the user to password change

Use `auth.TemporaryPasswordClaimsDecorator()` when the admin UI or shell needs
compact session/JWT hints.

### go-admin

The admin host should:

- register user migrations before creating repositories
- wire `go-users` repositories with `WithGoUsersUserManagement`
- wire session auth with `WithGoAuth`
- register auth UI routes with `RegisterAuthUIRoutes`
- add `quickstart.TemporaryPasswordGate` or
  `quickstart.TemporaryPasswordGateForAdmin` after auth middleware to redirect
  users with `password_change_required` session/JWT metadata to a password
  change screen

## Provisioning Flow

1. Generate a random temporary password.
2. Hash it with `auth.HashPassword`.
3. Execute `UserBootstrapPassword`.
4. Store or display the generated password through the host's secure
   provisioning channel.
5. Let the user log in before `ExpiresAt`.
6. Force password change before granting normal admin navigation.
7. Apply the permanent password through the normal reset/change path.
8. The reset token is claimed before the password change so concurrent consumers cannot apply a second password.
9. If the password change fails, the claim is released and the same token can be retried.
10. After a successful password change, the token is finalized as used/changed in one repository operation.
11. Temporary metadata is cleared.

## Example

```go
package setup

import (
	"context"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
)

func BootstrapAdminPassword(
	ctx context.Context,
	userService *userssvc.Service,
	systemActorID uuid.UUID,
	generatedPassword string,
) (*command.UserBootstrapPasswordResult, error) {
	hash, err := auth.HashPassword(generatedPassword)
	if err != nil {
		return nil, err
	}

	result := &command.UserBootstrapPasswordResult{}
	err = userService.Commands().UserBootstrapPassword.Execute(ctx, command.UserBootstrapPasswordInput{
		User: &types.AuthUser{
			Email:    "admin@example.com",
			Username: "admin",
			Role:     "admin",
		},
		PasswordHash: hash,
		Actor:        types.ActorRef{ID: systemActorID, Type: "system"},
		Result:       result,
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
```

## Auth Wiring

```go
provider := auth.NewUserProvider(repoManager.Users())

auther := auth.NewAuthenticator(provider, authConfig).
	WithClaimsDecorator(auth.TemporaryPasswordClaimsDecorator())

routeAuth, err := auth.NewHTTPAuthenticator(auther, authConfig)
if err != nil {
	return err
}

quickstart.WithGoAuth(
	adm,
	routeAuth,
	authConfig,
	admin.GoAuthAuthorizerConfig{DefaultResource: "admin"},
	&admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	},
)
```

If the host already uses a custom claims decorator, compose the temporary
password decorator with the existing decorator and call both from one
`auth.ClaimsDecoratorFunc`.

## Password Change Gate

Treat `password_change_required` as a route gate, not just a visual warning.

Recommended behavior:

- allow `/admin/login`, `/admin/logout`, and password-change routes
- block normal admin UI and unsafe admin API routes until the password is
  changed
- show the expiry timestamp when available
- do not accept actor or user identifiers from the password-change payload; use
  the authenticated session

After the user submits a permanent password, execute the normal password
reset/change command. For `go-auth` backed repositories, the password hash
update and temporary-metadata cleanup happen in one repository operation. The
confirm flow claims the reset token before the password update, releases that
claim on password-update failure, and finalizes the token as used/changed in
one repository operation after the password update succeeds.

Quickstart provides a reusable gate:

```go
adminUI := host.AdminUI()
adminUI.Use(quickstart.TemporaryPasswordGateForAdmin(cfg, authConfig.GetContextKey()))
```

For custom routes:

```go
api.Use(quickstart.TemporaryPasswordGate(quickstart.TemporaryPasswordGateConfig{
	SessionContextKey: authConfig.GetContextKey(),
	ChangePath:        "/admin/profile",
	AllowPaths:        []string{"/admin/logout", "/admin/password-reset"},
}))
```

The gate redirects browser requests and returns `403` JSON responses for API
requests that send `Accept: application/json` or `Content-Type:
application/json`.

## Expired Temporary Passwords

When the 24-hour window has passed, or temporary-password expiry metadata is
missing/malformed, local password auth returns `auth.ErrTemporaryPasswordExpired`.

Host error handling should map this to an operator-friendly recovery path, for
example:

- show a generic login failure to the user
- tell the operator to re-run bootstrap password provisioning
- call `UserBootstrapPassword` again to refresh the temporary password and
  expiry

Refreshing an existing user still uses `UserPasswordResetCommand`, so audit
activity remains consistent with other password reset flows.

## Security Notes

- Never ship a default production password in code or config.
- Generate the temporary password at instance creation time.
- Deliver the password through a secure one-time channel.
- Keep the TTL short; the default is 24 hours.
- Prefer session/JWT metadata only for routing hints, not authorization.
- Use admin permissions and `GoAuthAuthorizer` for authorization decisions.
- External identity providers must implement their own equivalent policy; this
  flow enforces expiry for local `go-auth` password verification.

## Verification

Focused checks:

```sh
go test ./quickstart -run 'Auth|Users|UserMigrations|Profile|TemporaryPasswordGate'
go test ./admin -run 'Auth|Profile'
```

Package-level checks in sibling repos:

```sh
cd ../go-auth && go test ./... -run 'TemporaryPassword|UserProvider'
cd ../go-users && go test ./command ./adapter/goauth ./service -run 'BootstrapPassword|PasswordReset|UserCreate|UsersAdapter'
```
