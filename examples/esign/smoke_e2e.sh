#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8082}"
TENANT_ID="${TENANT_ID:-tenant-smoke}"
ORG_ID="${ORG_ID:-org-smoke}"
ADMIN_IDENTIFIER="${ADMIN_IDENTIFIER:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin.pwd}"
SOURCE_PDF="${SOURCE_PDF:-}"
KEEP_TMP="${KEEP_TMP:-0}"
GO_BIN="${GO_BIN:-/Users/goliatone/.g/go/bin/go}"

usage() {
  cat <<'EOF'
Reusable e-sign smoke script:
  upload doc -> create document -> create agreement -> send -> signer web/api submit -> completion artifact access

Usage:
  ./smoke_e2e.sh [options]

Options:
  --base-url URL          Base URL (default: http://localhost:8082)
  --tenant-id ID          Tenant scope (default: tenant-smoke)
  --org-id ID             Org scope (default: org-smoke)
  --identifier EMAIL      Admin login identifier (default: admin@example.com)
  --password PASSWORD     Admin login password (default: admin.pwd)
  --source-pdf PATH       Path to source PDF to upload (optional)
  --keep-tmp              Keep temp files for debugging
  -h, --help              Show this help

Environment variables (equivalent):
  BASE_URL TENANT_ID ORG_ID ADMIN_IDENTIFIER ADMIN_PASSWORD SOURCE_PDF KEEP_TMP
  GO_BIN

Prerequisites:
  - e-sign app running (for example: ./taskfile dev:serve)
  - curl
  - jq
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --tenant-id)
      TENANT_ID="$2"
      shift 2
      ;;
    --org-id)
      ORG_ID="$2"
      shift 2
      ;;
    --identifier)
      ADMIN_IDENTIFIER="$2"
      shift 2
      ;;
    --password)
      ADMIN_PASSWORD="$2"
      shift 2
      ;;
    --source-pdf)
      SOURCE_PDF="$2"
      shift 2
      ;;
    --keep-tmp)
      KEEP_TMP=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

log() {
  printf '[smoke] %s\n' "$*"
}

fail() {
  printf '[smoke][error] %s\n' "$*" >&2
  exit 1
}

extract_location() {
  awk 'tolower($1)=="location:"{print $2}' "$1" | tr -d '\r' | tail -n1
}

extract_id_from_location() {
  local kind="$1"
  local location="$2"
  case "$kind" in
    document)
      echo "$location" | sed -E 's#.*esign_documents/([^/?]+).*#\1#'
      ;;
    agreement)
      echo "$location" | sed -E 's#.*esign_agreements/([^/?]+).*#\1#'
      ;;
    *)
      return 1
      ;;
  esac
}

scope_query_string() {
  local out=""
  if [[ -n "${TENANT_ID}" ]]; then
    out="tenant_id=${TENANT_ID}"
  fi
  if [[ -n "${ORG_ID}" ]]; then
    if [[ -n "${out}" ]]; then
      out="${out}&"
    fi
    out="${out}org_id=${ORG_ID}"
  fi
  echo "${out}"
}

append_query_string() {
  local url="$1"
  local query="$2"
  if [[ -z "${query}" ]]; then
    echo "${url}"
    return
  fi
  if [[ "${url}" == *\?* ]]; then
    echo "${url}&${query}"
  else
    echo "${url}?${query}"
  fi
}

absolute_url() {
  local value="$1"
  if [[ "${value}" =~ ^https?:// ]]; then
    echo "${value}"
    return
  fi
  echo "${BASE_URL}${value}"
}

require_cmd curl
require_cmd jq

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/esign-smoke.XXXXXX")"
COOKIE_JAR="${TMP_DIR}/cookies.txt"
LOGIN_HEADERS="${TMP_DIR}/login.headers"
LOGIN_BODY="${TMP_DIR}/login.body"
UPLOAD_JSON_PATH="${TMP_DIR}/upload.json"
DOC_HEADERS="${TMP_DIR}/doc-create.headers"
DOC_BODY="${TMP_DIR}/doc-create.body"
AG_HEADERS="${TMP_DIR}/agreement-create.headers"
AG_BODY="${TMP_DIR}/agreement-create.body"
DETAIL_JSON_PATH="${TMP_DIR}/agreement-detail.json"
SEND_JSON_PATH="${TMP_DIR}/send.json"
SIGNER_SESSION_HTML="${TMP_DIR}/signer-session.html"
SIGNER_FIELDS_HTML="${TMP_DIR}/signer-fields.html"
CONSENT_JSON_PATH="${TMP_DIR}/consent.json"
SIGNATURE_JSON_PATH="${TMP_DIR}/signature.json"
SUBMIT_JSON_PATH="${TMP_DIR}/submit.json"
ASSET_CONTRACT_JSON_PATH="${TMP_DIR}/asset-contract.json"
SIGNER_ENTRY_HEADERS="${TMP_DIR}/signer-entry.headers"
SIGNER_ENTRY_BODY="${TMP_DIR}/signer-entry.body"
SIGNER_REVIEW_HTML="${TMP_DIR}/signer-review.html"
COMPLETION_PAGE_HTML="${TMP_DIR}/completion-page.html"
EXECUTED_HEADERS_PATH="${TMP_DIR}/executed.headers"
CERTIFICATE_HEADERS_PATH="${TMP_DIR}/certificate.headers"
EXECUTED_ASSET_PATH="${TMP_DIR}/executed.pdf"
CERTIFICATE_ASSET_PATH="${TMP_DIR}/certificate.pdf"
GENERATED_PDF="${TMP_DIR}/source.pdf"
REQUESTED_SCOPE_QUERY="$(scope_query_string)"
EFFECTIVE_API_SCOPE_QUERY="${REQUESTED_SCOPE_QUERY}"

cleanup() {
  if [[ "${KEEP_TMP}" == "1" ]]; then
    log "Keeping temp dir: ${TMP_DIR}"
    return
  fi
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

if [[ -n "${SOURCE_PDF}" ]]; then
  [[ -f "${SOURCE_PDF}" ]] || fail "SOURCE_PDF does not exist: ${SOURCE_PDF}"
  PDF_PATH="${SOURCE_PDF}"
else
  cat >"${GENERATED_PDF}" <<'EOF'
%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
186
%%EOF
EOF
  PDF_PATH="${GENERATED_PDF}"
fi

log "Logging in at ${BASE_URL}/admin/login"
LOGIN_STATUS="$(
  curl -sS \
    -o "${LOGIN_BODY}" \
    -D "${LOGIN_HEADERS}" \
    -c "${COOKIE_JAR}" \
    -X POST "${BASE_URL}/admin/login" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "identifier=${ADMIN_IDENTIFIER}" \
    --data-urlencode "password=${ADMIN_PASSWORD}" \
    --write-out '%{http_code}'
)"
if [[ "${LOGIN_STATUS}" != "302" ]]; then
  fail "login failed: expected HTTP 302, got ${LOGIN_STATUS}. body=$(cat "${LOGIN_BODY}")"
fi
if ! grep -q 'go_admin_' "${COOKIE_JAR}" && ! grep -q 'esign_' "${COOKIE_JAR}"; then
  log "Warning: could not detect auth cookie name in cookie jar; continuing"
fi

log "Uploading source PDF"
UPLOAD_STATUS="$(
  curl -sS \
    -o "${UPLOAD_JSON_PATH}" \
    -b "${COOKIE_JAR}" \
    -X POST "${BASE_URL}/admin/api/v1/esign/documents/upload?tenant_id=${TENANT_ID}&org_id=${ORG_ID}" \
    -F "file=@${PDF_PATH};type=application/pdf" \
    --write-out '%{http_code}'
)"
if [[ "${UPLOAD_STATUS}" != "200" ]]; then
  fail "upload failed: expected HTTP 200, got ${UPLOAD_STATUS}. body=$(cat "${UPLOAD_JSON_PATH}")"
fi
OBJECT_KEY="$(jq -r '.object_key // empty' "${UPLOAD_JSON_PATH}")"
[[ -n "${OBJECT_KEY}" ]] || fail "upload response missing object_key: $(cat "${UPLOAD_JSON_PATH}")"

log "Creating document entry"
DOC_STATUS="$(
  curl -sS \
    -o "${DOC_BODY}" \
    -D "${DOC_HEADERS}" \
    -b "${COOKIE_JAR}" \
    -X POST "${BASE_URL}/admin/content/esign_documents?tenant_id=${TENANT_ID}&org_id=${ORG_ID}" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "title=Smoke Document $(date +%s)" \
    --data-urlencode "source_object_key=${OBJECT_KEY}" \
    --write-out '%{http_code}'
)"
if [[ "${DOC_STATUS}" != "302" ]]; then
  fail "document create failed: expected HTTP 302, got ${DOC_STATUS}. body=$(cat "${DOC_BODY}")"
fi
DOC_LOCATION="$(extract_location "${DOC_HEADERS}")"
[[ -n "${DOC_LOCATION}" ]] || fail "document create missing Location header"
DOC_ID="$(extract_id_from_location document "${DOC_LOCATION}")"
if [[ -z "${DOC_ID}" || "${DOC_ID}" == "${DOC_LOCATION}" ]]; then
  fail "failed to parse document ID from Location: ${DOC_LOCATION}"
fi

log "Creating agreement entry"
AG_STATUS="$(
  curl -sS \
    -o "${AG_BODY}" \
    -D "${AG_HEADERS}" \
    -b "${COOKIE_JAR}" \
    -X POST "${BASE_URL}/admin/content/esign_agreements?tenant_id=${TENANT_ID}&org_id=${ORG_ID}" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "document_id=${DOC_ID}" \
    --data-urlencode "title=Smoke Agreement $(date +%s)" \
    --data-urlencode "message=Smoke test agreement" \
    --data-urlencode "recipients_present=1" \
    --data-urlencode "fields_present=1" \
    --data-urlencode "recipients[0].name=Smoke Signer" \
    --data-urlencode "recipients[0].email=smoke.signer@example.com" \
    --data-urlencode "recipients[0].role=signer" \
    --data-urlencode "recipients[1].name=Smoke Completion Recipient" \
    --data-urlencode "recipients[1].email=smoke.cc@example.com" \
    --data-urlencode "recipients[1].role=cc" \
    --data-urlencode "fields[0].type=signature" \
    --data-urlencode "fields[0].recipient_index=0" \
    --data-urlencode "fields[0].page=1" \
    --data-urlencode "fields[0].required=on" \
    --write-out '%{http_code}'
)"
if [[ "${AG_STATUS}" != "302" ]]; then
  fail "agreement create failed: expected HTTP 302, got ${AG_STATUS}. body=$(cat "${AG_BODY}")"
fi
AG_LOCATION="$(extract_location "${AG_HEADERS}")"
[[ -n "${AG_LOCATION}" ]] || fail "agreement create missing Location header"
AGREEMENT_ID="$(extract_id_from_location agreement "${AG_LOCATION}")"
if [[ -z "${AGREEMENT_ID}" || "${AGREEMENT_ID}" == "${AG_LOCATION}" ]]; then
  fail "failed to parse agreement ID from Location: ${AG_LOCATION}"
fi

log "Resolving recipient from agreement detail"
DETAIL_URL_BASE="${BASE_URL}/admin/api/v1/esign_agreements/${AGREEMENT_ID}"
DETAIL_URL="$(append_query_string "${DETAIL_URL_BASE}" "${REQUESTED_SCOPE_QUERY}")"
DETAIL_STATUS="$(
  curl -sS \
    -o "${DETAIL_JSON_PATH}" \
    -b "${COOKIE_JAR}" \
    "${DETAIL_URL}" \
    --write-out '%{http_code}'
)"
if [[ "${DETAIL_STATUS}" == "404" && -n "${REQUESTED_SCOPE_QUERY}" ]]; then
  if grep -q '"agreements not found"' "${DETAIL_JSON_PATH}"; then
    log "Detail lookup with tenant/org query returned 404; retrying with runtime default scope"
    EFFECTIVE_API_SCOPE_QUERY=""
    DETAIL_STATUS="$(
      curl -sS \
        -o "${DETAIL_JSON_PATH}" \
        -b "${COOKIE_JAR}" \
        "${DETAIL_URL_BASE}" \
        --write-out '%{http_code}'
    )"
  fi
fi
if [[ "${DETAIL_STATUS}" != "200" ]]; then
  fail "agreement detail failed: expected HTTP 200, got ${DETAIL_STATUS}. body=$(cat "${DETAIL_JSON_PATH}")"
fi
EFFECTIVE_SCOPE_TENANT_ID="$(jq -r '.record.tenant_id // .data.tenant_id // .tenant_id // empty' "${DETAIL_JSON_PATH}")"
EFFECTIVE_SCOPE_ORG_ID="$(jq -r '.record.org_id // .data.org_id // .org_id // empty' "${DETAIL_JSON_PATH}")"
if [[ -z "${EFFECTIVE_SCOPE_TENANT_ID}" ]]; then
  EFFECTIVE_SCOPE_TENANT_ID="${TENANT_ID}"
fi
if [[ -z "${EFFECTIVE_SCOPE_ORG_ID}" ]]; then
  EFFECTIVE_SCOPE_ORG_ID="${ORG_ID}"
fi
SIGNER_RECIPIENT_ID="$(jq -r '((.record.recipients // .data.recipients // .recipients // [])[] | select((.role // "") == "signer") | .id) // empty' "${DETAIL_JSON_PATH}" | head -n1)"
CC_RECIPIENT_ID="$(jq -r '((.record.recipients // .data.recipients // .recipients // [])[] | select((.role // "") == "cc") | .id) // empty' "${DETAIL_JSON_PATH}" | head -n1)"
SIGNATURE_FIELD_ID="$(jq -r '((.record.fields // .data.fields // .fields // [])[] | select((.type // "") == "signature") | .id) // empty' "${DETAIL_JSON_PATH}" | head -n1)"
[[ -n "${SIGNER_RECIPIENT_ID}" ]] || fail "signer recipient ID missing in agreement detail: $(cat "${DETAIL_JSON_PATH}")"
[[ -n "${CC_RECIPIENT_ID}" ]] || fail "cc recipient ID missing in agreement detail: $(cat "${DETAIL_JSON_PATH}")"
[[ -n "${SIGNATURE_FIELD_ID}" ]] || fail "signature field ID missing in agreement detail: $(cat "${DETAIL_JSON_PATH}")"

log "Sending agreement"
SEND_URL_BASE="${BASE_URL}/admin/api/v1/esign_agreements/actions/send?id=${AGREEMENT_ID}"
SEND_URL="$(append_query_string "${SEND_URL_BASE}" "${EFFECTIVE_API_SCOPE_QUERY}")"
SEND_STATUS="$(
  curl -sS \
    -o "${SEND_JSON_PATH}" \
    -b "${COOKIE_JAR}" \
    -X POST "${SEND_URL}" \
    -H 'Content-Type: application/json' \
    -d '{"idempotency_key":"smoke-send-1"}' \
    --write-out '%{http_code}'
)"
if [[ "${SEND_STATUS}" != "200" ]]; then
  fail "send action failed: expected HTTP 200, got ${SEND_STATUS}. body=$(cat "${SEND_JSON_PATH}")"
fi

log "Issuing signer token for smoke link journey"
SIGNER_TOKEN="$(
  "${GO_BIN}" run ./tools/issue_signing_token \
    --tenant-id "${EFFECTIVE_SCOPE_TENANT_ID}" \
    --org-id "${EFFECTIVE_SCOPE_ORG_ID}" \
    --agreement-id "${AGREEMENT_ID}" \
    --recipient-id "${SIGNER_RECIPIENT_ID}" \
    2>/dev/null | tr -d '\r\n'
)"
[[ -n "${SIGNER_TOKEN}" ]] || fail "failed to issue signer token for smoke flow"
SIGN_URL="${BASE_URL}/sign/${SIGNER_TOKEN}"

log "Loading signer entrypoint from recipient sign URL"
SIGNER_ENTRY_STATUS="$(
  curl -sS \
    -o "${SIGNER_ENTRY_BODY}" \
    -D "${SIGNER_ENTRY_HEADERS}" \
    "${SIGN_URL}" \
    --write-out '%{http_code}'
)"
if [[ "${SIGNER_ENTRY_STATUS}" != "302" ]]; then
  fail "signer entrypoint failed: expected HTTP 302 unified redirect, got ${SIGNER_ENTRY_STATUS}. body=$(cat "${SIGNER_ENTRY_BODY}")"
fi
SIGNER_ENTRY_LOCATION="$(extract_location "${SIGNER_ENTRY_HEADERS}")"
[[ -n "${SIGNER_ENTRY_LOCATION}" ]] || fail "signer entrypoint missing Location header"
if [[ "${SIGNER_ENTRY_LOCATION}" != *"/sign/${SIGNER_TOKEN}/review"* ]] || [[ "${SIGNER_ENTRY_LOCATION}" != *"flow=unified"* ]]; then
  fail "signer entrypoint did not resolve to unified review path: location=${SIGNER_ENTRY_LOCATION}"
fi

log "Loading unified signer review page"
SIGNER_REVIEW_STATUS="$(
  curl -sS \
    -o "${SIGNER_REVIEW_HTML}" \
    "$(absolute_url "${SIGNER_ENTRY_LOCATION}")" \
    --write-out '%{http_code}'
)"
if [[ "${SIGNER_REVIEW_STATUS}" != "200" ]]; then
  fail "signer review page failed: expected HTTP 200, got ${SIGNER_REVIEW_STATUS}. body=$(cat "${SIGNER_REVIEW_HTML}")"
fi

log "Capturing signer consent"
CONSENT_STATUS="$(
  curl -sS \
    -o "${CONSENT_JSON_PATH}" \
    -X POST "${BASE_URL}/api/v1/esign/signing/consent/${SIGNER_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"accepted":true}' \
    --write-out '%{http_code}'
)"
if [[ "${CONSENT_STATUS}" != "200" ]]; then
  fail "signer consent failed: expected HTTP 200, got ${CONSENT_STATUS}. body=$(cat "${CONSENT_JSON_PATH}")"
fi

log "Attaching signer signature"
SIGNATURE_STATUS="$(
  curl -sS \
    -o "${SIGNATURE_JSON_PATH}" \
    -X POST "${BASE_URL}/api/v1/esign/signing/field-values/signature/${SIGNER_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "{\"field_id\":\"${SIGNATURE_FIELD_ID}\",\"type\":\"typed\",\"object_key\":\"tenant/${EFFECTIVE_SCOPE_TENANT_ID}/org/${EFFECTIVE_SCOPE_ORG_ID}/agreements/${AGREEMENT_ID}/sig/smoke-signature.png\",\"sha256\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"value_text\":\"Smoke Signer\"}" \
    --write-out '%{http_code}'
)"
if [[ "${SIGNATURE_STATUS}" != "200" ]]; then
  fail "signer signature attach failed: expected HTTP 200, got ${SIGNATURE_STATUS}. body=$(cat "${SIGNATURE_JSON_PATH}")"
fi

log "Submitting signer completion"
SUBMIT_STATUS="$(
  curl -sS \
    -o "${SUBMIT_JSON_PATH}" \
    -X POST "${BASE_URL}/api/v1/esign/signing/submit/${SIGNER_TOKEN}" \
    -H 'Idempotency-Key: smoke-submit-1' \
    -H 'Content-Type: application/json' \
    -d '{}' \
    --write-out '%{http_code}'
)"
if [[ "${SUBMIT_STATUS}" != "200" ]]; then
  fail "signer submit failed: expected HTTP 200, got ${SUBMIT_STATUS}. body=$(cat "${SUBMIT_JSON_PATH}")"
fi
if [[ "$(jq -r '.submit.completed // false' "${SUBMIT_JSON_PATH}")" != "true" ]]; then
  fail "signer submit did not complete agreement: $(cat "${SUBMIT_JSON_PATH}")"
fi

log "Issuing completion-recipient token and validating actionable completion CTA"
COMPLETION_TOKEN="$(
  "${GO_BIN}" run ./tools/issue_signing_token \
    --tenant-id "${EFFECTIVE_SCOPE_TENANT_ID}" \
    --org-id "${EFFECTIVE_SCOPE_ORG_ID}" \
    --agreement-id "${AGREEMENT_ID}" \
    --recipient-id "${CC_RECIPIENT_ID}" \
    2>/dev/null | tr -d '\r\n'
)"
[[ -n "${COMPLETION_TOKEN}" ]] || fail "failed to issue completion token for artifact access check"
COMPLETION_URL="${BASE_URL}/sign/${COMPLETION_TOKEN}/complete"
if [[ "${COMPLETION_URL}" == *"/api/v1/esign/signing/assets/"* ]]; then
  fail "completion CTA must not target raw asset contract endpoint: ${COMPLETION_URL}"
fi
COMPLETION_PAGE_STATUS="$(
  curl -sS \
    -o "${COMPLETION_PAGE_HTML}" \
    "${COMPLETION_URL}" \
    --write-out '%{http_code}'
)"
if [[ "${COMPLETION_PAGE_STATUS}" != "200" ]]; then
  fail "completion page failed: expected HTTP 200, got ${COMPLETION_PAGE_STATUS}. body=$(cat "${COMPLETION_PAGE_HTML}")"
fi
if ! grep -qi 'Download Copy' "${COMPLETION_PAGE_HTML}"; then
  fail "completion page missing actionable download CTA: $(cat "${COMPLETION_PAGE_HTML}")"
fi

log "Validating artifact contract and PDF responses"
CONTRACT_STATUS="$(
  curl -sS \
    -o "${ASSET_CONTRACT_JSON_PATH}" \
    "${BASE_URL}/api/v1/esign/signing/assets/${COMPLETION_TOKEN}" \
    --write-out '%{http_code}'
)"
if [[ "${CONTRACT_STATUS}" != "200" ]]; then
  fail "asset contract request failed: expected HTTP 200, got ${CONTRACT_STATUS}. body=$(cat "${ASSET_CONTRACT_JSON_PATH}")"
fi
EXECUTED_URL="$(jq -r '.assets.executed_url // empty' "${ASSET_CONTRACT_JSON_PATH}")"
CERTIFICATE_URL="$(jq -r '.assets.certificate_url // empty' "${ASSET_CONTRACT_JSON_PATH}")"
[[ -n "${EXECUTED_URL}" ]] || fail "asset contract missing executed_url: $(cat "${ASSET_CONTRACT_JSON_PATH}")"
[[ -n "${CERTIFICATE_URL}" ]] || fail "asset contract missing certificate_url: $(cat "${ASSET_CONTRACT_JSON_PATH}")"

EXECUTED_STATUS="$(
  curl -sS \
    -D "${EXECUTED_HEADERS_PATH}" \
    -o "${EXECUTED_ASSET_PATH}" \
    "$(absolute_url "${EXECUTED_URL}")" \
    --write-out '%{http_code}'
)"
if [[ "${EXECUTED_STATUS}" != "200" ]]; then
  fail "executed artifact download failed: expected HTTP 200, got ${EXECUTED_STATUS}. body=$(cat "${EXECUTED_ASSET_PATH}")"
fi
if ! grep -qi '^Content-Type: application/pdf' "${EXECUTED_HEADERS_PATH}"; then
  fail "executed artifact response missing application/pdf content type: $(cat "${EXECUTED_HEADERS_PATH}")"
fi
if ! head -c 5 "${EXECUTED_ASSET_PATH}" | grep -q '%PDF-'; then
  fail "executed artifact payload is not PDF content"
fi

CERTIFICATE_STATUS="$(
  curl -sS \
    -D "${CERTIFICATE_HEADERS_PATH}" \
    -o "${CERTIFICATE_ASSET_PATH}" \
    "$(absolute_url "${CERTIFICATE_URL}")" \
    --write-out '%{http_code}'
)"
if [[ "${CERTIFICATE_STATUS}" != "200" ]]; then
  fail "certificate artifact download failed: expected HTTP 200, got ${CERTIFICATE_STATUS}. body=$(cat "${CERTIFICATE_ASSET_PATH}")"
fi
if ! grep -qi '^Content-Type: application/pdf' "${CERTIFICATE_HEADERS_PATH}"; then
  fail "certificate artifact response missing application/pdf content type: $(cat "${CERTIFICATE_HEADERS_PATH}")"
fi
if ! head -c 5 "${CERTIFICATE_ASSET_PATH}" | grep -q '%PDF-'; then
  fail "certificate artifact payload is not PDF content"
fi

printf '\n'
log "Smoke e2e passed"
printf '  base_url:      %s\n' "${BASE_URL}"
printf '  tenant_id:     %s\n' "${TENANT_ID}"
printf '  org_id:        %s\n' "${ORG_ID}"
printf '  api_scope:     %s\n' "${EFFECTIVE_API_SCOPE_QUERY:-default-context}"
printf '  document_id:   %s\n' "${DOC_ID}"
printf '  agreement_id:  %s\n' "${AGREEMENT_ID}"
printf '  signer_id:     %s\n' "${SIGNER_RECIPIENT_ID}"
printf '  cc_id:         %s\n' "${CC_RECIPIENT_ID}"
