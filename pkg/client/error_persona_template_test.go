package client

import (
	"strings"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
)

func TestDevelopmentErrorTemplateRendersPersonaVariantsAndFallback(t *testing.T) {
	set := pongo2.NewSet("client-error-persona", templateFSLoader{fsys: Templates()})
	template, err := set.FromFile("error.html")
	if err != nil {
		t.Fatal(err)
	}
	base := pongo2.Context{
		"error_title":  "Boom",
		"error_detail": "failure",
		"dev_mode":     true,
		"env_info": map[string]any{
			"debug": true,
			"deployment": map[string]any{
				"instance_name": "process-one",
				"instance_id":   "instance-one",
				"uptime":        "1m",
			},
		},
	}

	monogram := cloneTemplateContext(base)
	monogram["env_info"].(map[string]any)["deployment"].(map[string]any)["persona"] = map[string]any{
		"name": "lively-raven", "algorithm": "go-admin-monogram", "version": "v1",
		"visual": map[string]any{
			"kind": "monogram", "text": "LR", "alt": "Lively raven",
			"background": "#0f766e", "foreground": "#f0fdfa",
		},
	}
	output, err := template.Execute(monogram)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{"dev-persona-avatar", "Lively raven", "lively-raven", "go-admin-monogram / v1", "process-one"} {
		if !strings.Contains(output, expected) {
			t.Fatalf("monogram output missing %q: %s", expected, output)
		}
	}

	image := cloneTemplateContext(base)
	image["env_info"].(map[string]any)["deployment"].(map[string]any)["persona"] = map[string]any{
		"name": "image-persona", "algorithm": "go-admin-identicon", "version": "v1",
		"visual": map[string]any{
			"kind": "image", "alt": "Image persona", "media_type": "image/png", "data": "iVBORw0KGgo=",
		},
	}
	output, err = template.Execute(image)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(output, `src="data:image/png;base64,iVBORw0KGgo="`) || !strings.Contains(output, `alt="Image persona"`) {
		t.Fatalf("image persona did not render safely: %s", output)
	}

	output, err = template.Execute(base)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(output, "dev-persona-avatar") || !strings.Contains(output, "process-one") {
		t.Fatal("persona-free error page did not retain its existing deployment fields")
	}
}

func TestProductionErrorTemplateContextCannotExposePersona(t *testing.T) {
	set := pongo2.NewSet("client-error-production", templateFSLoader{fsys: Templates()})
	template, err := set.FromFile("error.html")
	if err != nil {
		t.Fatal(err)
	}
	output, err := template.Execute(pongo2.Context{"error_title": "Boom", "error_detail": "failure"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(output, "Deployment Persona") || strings.Contains(output, "dev-persona-avatar") {
		t.Fatal("persona markup rendered without developer environment context")
	}
}

func cloneTemplateContext(base pongo2.Context) pongo2.Context {
	deployment := base["env_info"].(map[string]any)["deployment"].(map[string]any)
	deploymentCopy := make(map[string]any, len(deployment))
	for key, value := range deployment {
		deploymentCopy[key] = value
	}
	envCopy := map[string]any{"debug": true, "deployment": deploymentCopy}
	return pongo2.Context{
		"error_title": base["error_title"], "error_detail": base["error_detail"],
		"dev_mode": true, "env_info": envCopy,
	}
}
