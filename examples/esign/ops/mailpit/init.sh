#!/usr/bin/env bash

set -u

mailpit_dir="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

if ! mkdir -p "$mailpit_dir"; then
    printf 'mailpit init: unable to create %s\n' "$mailpit_dir" >&2
    exit 1
fi

(
    set -e
    umask 077

    temp_dir="$(mktemp -d "$mailpit_dir/.tls.XXXXXX")"
    # shellcheck disable=SC2329 # Invoked indirectly by the EXIT trap.
    cleanup() {
        if [[ -n "${temp_dir:-}" && "$temp_dir" == "$mailpit_dir"/.tls.* ]]; then
            rm -rf -- "$temp_dir"
        fi
    }
    trap cleanup EXIT
    trap 'exit 1' HUP INT TERM

    openssl req -x509 -newkey rsa:4096 -nodes \
        -keyout "$temp_dir/priv_key.pem" \
        -out "$temp_dir/pub_cert.pem" \
        -sha256 -days 3650 \
        -subj "/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    chmod 0600 "$temp_dir/priv_key.pem"
    chmod 0644 "$temp_dir/pub_cert.pem"
    # shellcheck disable=SC2016 # Preserve the literal bcrypt dollar signs.
    printf '%s\n' 'User1:$2y$05$lvT6Z111jzakwt2mmmmeZOi64AqK3vpzilT5mRYTzXHxLZgSfe4Pm' > "$temp_dir/development.txt"

    # Publish the key last so normal startup cannot mistake a partial install
    # for a complete certificate set.
    mv "$temp_dir/development.txt" "$mailpit_dir/development.txt"
    mv "$temp_dir/pub_cert.pem" "$mailpit_dir/pub_cert.pem"
    mv "$temp_dir/priv_key.pem" "$mailpit_dir/priv_key.pem"
)
status=$?
if ((status != 0)); then
    printf 'mailpit init: unable to generate or install TLS material\n' >&2
    exit 1
fi

printf 'mailpit init: generated local TLS material in %s\n' "$mailpit_dir"
