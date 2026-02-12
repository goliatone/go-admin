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
	_ = pongo2.RegisterFilter(name, fn)
}

func toJSONTemplateFilter(in *pongo2.Value, _ *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if in == nil || in.Interface() == nil {
		return pongo2.AsValue("null"), nil
	}
	raw, err := json.Marshal(in.Interface())
	if err != nil {
		return pongo2.AsValue("null"), nil
	}
	return pongo2.AsValue(string(raw)), nil
}

