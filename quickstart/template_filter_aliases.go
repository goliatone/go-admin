package quickstart

import (
	"encoding/json"
	"strings"
	"sync"

	"github.com/flosch/pongo2/v6"
)

var registerTemplateFilterAliasesOnce sync.Once

func registerTemplateFilterAliases() {
	registerTemplateFilterAliasesOnce.Do(func() {
		registerTemplateFilterAlias("tojson", toJSONTemplateFilter)
	})
}

func registerTemplateFilterAlias(name string, fn pongo2.FilterFunction) {
	name = strings.TrimSpace(name)
	if name == "" || fn == nil {
		return
	}
	if pongo2.FilterExists(name) {
		return
	}
	if err := pongo2.RegisterFilter(name, fn); err != nil {
		return
	}
}

func toJSONTemplateFilter(in *pongo2.Value, _ *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if in == nil || in.Interface() == nil {
		return pongo2.AsValue("null"), nil
	}
	return pongo2.AsValue(templateJSONString(in.Interface())), nil
}

func templateJSONString(value any) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return "null"
	}
	return string(raw)
}
