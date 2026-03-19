package services

import "context"

type Identity struct {
	ActorID  string `json:"actor_id"`
	TenantID string `json:"tenant_id"`
	OrgID    string `json:"org_id"`
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
