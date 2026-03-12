package services

import "context"

type Identity struct {
	ActorID  string
	TenantID string
	OrgID    string
}

type IdentityResolver interface {
	ResolveIdentity(context.Context) Identity
}

type Clock interface {
	NowUnix() int64
}

type OpenAPISpecProvider interface {
	OpenAPISpec() ([]byte, error)
}
