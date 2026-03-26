package admin

import (
	"context"
	"testing"
)

func TestBuildWorkflowApplyRequestCanonicalizesAliasPayloadFields(t *testing.T) {
	ctx := context.Background()
	ctx = context.WithValue(ctx, userIDContextKey, "actor-1")
	ctx = context.WithValue(ctx, tenantIDContextKey, "tenant-1")
	ctx = context.WithValue(ctx, requestIDContextKey, "req-1")
	ctx = context.WithValue(ctx, correlationIDContextKey, "corr-1")

	req := buildWorkflowApplyRequest(ctx, "pages", "page-1", "draft", "published", map[string]any{
		"actorId":        "spoofed-actor",
		"requestId":      "req-alias",
		"correlationId":  "corr-alias",
		"idempotencyKey": "idem-1",
		"dryRun":         true,
		"policyEntity":   "pages",
	})

	if req.IdempotencyKey != "idem-1" {
		t.Fatalf("expected normalized idempotency key, got %q", req.IdempotencyKey)
	}
	if !req.DryRun {
		t.Fatalf("expected dry run alias to be honored")
	}
	if req.ExecCtx.ActorID != "actor-1" {
		t.Fatalf("expected trusted actor context, got %q", req.ExecCtx.ActorID)
	}
	if req.ExecCtx.Tenant != "tenant-1" {
		t.Fatalf("expected trusted tenant context, got %q", req.ExecCtx.Tenant)
	}
	if req.Metadata["actor_id"] != "spoofed-actor" {
		t.Fatalf("expected existing actor_id metadata to win after normalization, got %v", req.Metadata["actor_id"])
	}
	if req.Metadata["request_id"] != "req-alias" {
		t.Fatalf("expected normalized request_id alias, got %v", req.Metadata["request_id"])
	}
	if req.Metadata["correlation_id"] != "corr-alias" {
		t.Fatalf("expected normalized correlation_id alias, got %v", req.Metadata["correlation_id"])
	}
	if req.Metadata["policy_entity"] != "pages" {
		t.Fatalf("expected normalized policy_entity alias, got %v", req.Metadata["policy_entity"])
	}
	if _, ok := req.Metadata["actorId"]; ok {
		t.Fatalf("expected camelCase actorId metadata to be removed")
	}
	if _, ok := req.Metadata["requestId"]; ok {
		t.Fatalf("expected camelCase requestId metadata to be removed")
	}
	if _, ok := req.Metadata["correlationId"]; ok {
		t.Fatalf("expected camelCase correlationId metadata to be removed")
	}
	if _, ok := req.Msg.Payload["policyEntity"]; ok {
		t.Fatalf("expected camelCase policyEntity payload to be removed")
	}
	if req.Msg.Payload["policy_entity"] != "pages" {
		t.Fatalf("expected canonical policy_entity payload, got %v", req.Msg.Payload["policy_entity"])
	}
}

func TestWorkflowTransitionMetadataBackfillsCanonicalContextFields(t *testing.T) {
	ctx := context.Background()
	ctx = context.WithValue(ctx, userIDContextKey, "actor-2")
	ctx = context.WithValue(ctx, tenantIDContextKey, "tenant-2")
	ctx = context.WithValue(ctx, requestIDContextKey, "req-2")
	ctx = context.WithValue(ctx, correlationIDContextKey, "corr-2")

	metadata := workflowTransitionMetadata(ctx, "pages", "page-2", "draft", "review", map[string]any{
		"policyEntity": "pages",
	})

	if metadata["actor_id"] != "actor-2" {
		t.Fatalf("expected actor_id backfill, got %v", metadata["actor_id"])
	}
	if metadata["tenant"] != "tenant-2" {
		t.Fatalf("expected tenant backfill, got %v", metadata["tenant"])
	}
	if metadata["request_id"] != "req-2" {
		t.Fatalf("expected request_id backfill, got %v", metadata["request_id"])
	}
	if metadata["correlation_id"] != "corr-2" {
		t.Fatalf("expected correlation_id backfill, got %v", metadata["correlation_id"])
	}
	if _, ok := metadata["policyEntity"]; ok {
		t.Fatalf("expected camelCase policyEntity metadata to be removed")
	}
	if metadata["policy_entity"] != "pages" {
		t.Fatalf("expected canonical policy_entity metadata, got %v", metadata["policy_entity"])
	}
}
