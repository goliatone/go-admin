package ui

import _ "embed"

//go:embed openapi/translations.json
var translationsOpenAPISpec []byte

func OpenAPISpec() []byte {
	return append([]byte{}, translationsOpenAPISpec...)
}
