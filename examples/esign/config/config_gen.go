//go:generate app-config -input ./app.json -output ./config_structs.go -pkg config --struct Config -extension ./codegen.overrides.yml
//go:generate config-getters -input ./config_structs.go -output ./config_getters.go
package config
