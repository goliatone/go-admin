#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
frontend_root="${repo_root}/pkg/client/assets/src/services"
client_file="${frontend_root}/api-client.ts"

if [[ ! -f "${client_file}" ]]; then
  echo "services frontend API client not found: ${client_file}"
  exit 1
fi

echo "Checking services frontend source for deprecated route usage..."
if rg -n "/admin/api/services/v2|/v2/" "${frontend_root}" -g'*.ts' -g'*.tsx'; then
  echo "Found deprecated /v2 route usage in services frontend source."
  exit 1
fi

if rg -n "/connections/candidates" "${frontend_root}" -g'*.ts' -g'*.tsx'; then
  echo "Found deprecated /connections/candidates usage (use /connection-candidates)."
  exit 1
fi

echo "Checking canonical workflow endpoints in services API client..."
required_literals=(
  "/mappings"
  "/mappings/spec/"
  "/sync/plan"
  "/sync/run"
  "/sync/runs"
  "/sync/checkpoints"
  "/sync/conflicts"
  "/sync/schema-drift"
  "/connection-candidates"
  "/callbacks/diagnostics/status"
  "/callbacks/diagnostics/preview"
  "/sync/connections/\${encodeURIComponent(connectionId)}/run"
  "/sync/connections/\${encodeURIComponent(connectionId)}/status"
  "/capabilities/\${encodeURIComponent(providerId)}/\${encodeURIComponent(capability)}/invoke"
)

for literal in "${required_literals[@]}"; do
  if ! rg -F -q "${literal}" "${client_file}"; then
    echo "Missing required canonical endpoint literal in api client: ${literal}"
    exit 1
  fi
done

echo "Services frontend contract checks passed."
