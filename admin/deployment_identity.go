package admin

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"runtime"
	runtimedebug "runtime/debug"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
	"unicode"
	"unicode/utf8"

	deploymentidentity "github.com/goliatone/go-admin/pkg/go-deployment-identity"
)

const (
	defaultDevelopmentColor = "#ef4444"
	defaultStagingColor     = "#f97316"
	defaultProductionColor  = "#22c55e"
	defaultEnvironmentColor = "#64748b"
)

var (
	deploymentAdjectives = []string{"brisk", "calm", "clever", "gentle", "lively", "lucid", "steady", "swift"}
	deploymentNouns      = []string{"badger", "falcon", "heron", "lynx", "otter", "panda", "raven", "turtle"}
	fallbackSequence     atomic.Uint64
)

// DeploymentIdentityConfig configures application, build, environment, and
// process identity metadata. Empty fields are resolved independently.
type DeploymentIdentityConfig struct {
	AppID             string                  `json:"app_id"`
	AppName           string                  `json:"app_name"`
	AppVersion        string                  `json:"app_version"`
	Environment       string                  `json:"environment"`
	EnvironmentColors map[string]string       `json:"environment_colors,omitempty"`
	FallbackColor     string                  `json:"fallback_color,omitempty"`
	InstanceName      string                  `json:"instance_name,omitempty"`
	InstanceID        string                  `json:"instance_id,omitempty"`
	CommitSHA         string                  `json:"commit_sha,omitempty"`
	GitRef            string                  `json:"git_ref,omitempty"`
	BuildTime         string                  `json:"build_time,omitempty"`
	Persona           DeploymentPersonaConfig `json:"persona"`
}

// DeploymentPersonaConfig opts into a deterministic artifact persona.
// Namespace nil defaults to AppID; a non-nil empty value explicitly disables
// namespacing.
type DeploymentPersonaConfig struct {
	Enabled   bool    `json:"enabled,omitempty"`
	Seed      string  `json:"seed,omitempty"`
	Namespace *string `json:"namespace,omitempty"`
	Name      string  `json:"name,omitempty"`
}

// DeploymentIdentity is the immutable deployment identity resolved for one
// Admin instance.
type DeploymentIdentity struct {
	AppID            string                      `json:"app_id,omitempty"`
	AppName          string                      `json:"app_name,omitempty"`
	AppVersion       string                      `json:"app_version,omitempty"`
	Environment      string                      `json:"environment,omitempty"`
	EnvironmentColor string                      `json:"environment_color,omitempty"`
	InstanceName     string                      `json:"instance_name"`
	InstanceID       string                      `json:"instance_id"`
	Hostname         string                      `json:"hostname,omitempty"`
	CommitSHA        string                      `json:"commit_sha,omitempty"`
	CommitShort      string                      `json:"commit_short,omitempty"`
	GitRef           string                      `json:"git_ref,omitempty"`
	BuildTime        *time.Time                  `json:"build_time,omitempty"`
	BuildModified    bool                        `json:"build_modified,omitempty"`
	BuildSource      string                      `json:"build_source,omitempty"`
	InstanceSource   string                      `json:"instance_source,omitempty"`
	StartedAt        time.Time                   `json:"started_at"`
	GoVersion        string                      `json:"go_version,omitempty"`
	Persona          *deploymentidentity.Persona `json:"persona,omitempty"`
}

// DeploymentIdentitySnapshot is the JSON-safe diagnostic view of an identity.
type DeploymentIdentitySnapshot struct {
	DeploymentIdentity
	Uptime string `json:"uptime"`
}

func (i DeploymentIdentity) clone() DeploymentIdentity {
	if i.BuildTime != nil {
		buildTime := *i.BuildTime
		i.BuildTime = &buildTime
	}
	if i.Persona != nil {
		persona := i.Persona.Clone()
		i.Persona = &persona
	}
	return i
}

// Snapshot derives time-varying display fields without mutating the identity.
func (i DeploymentIdentity) Snapshot(now time.Time) DeploymentIdentitySnapshot {
	uptime := time.Duration(0)
	if !i.StartedAt.IsZero() && now.After(i.StartedAt) {
		uptime = now.Sub(i.StartedAt).Round(time.Second)
	}
	return DeploymentIdentitySnapshot{DeploymentIdentity: i.clone(), Uptime: uptime.String()}
}

// DeploymentBuildInfo is the bounded build metadata consumed by the resolver.
type DeploymentBuildInfo struct {
	MainVersion string
	GoVersion   string
	VCSRevision string
	VCSTime     string
	VCSModified bool
}

type deploymentIdentityResolver struct {
	lookupEnv        func(string) (string, bool)
	hostname         func() (string, error)
	now              func() time.Time
	random           io.Reader
	buildInfo        func() (DeploymentBuildInfo, bool)
	personaGenerator deploymentidentity.Generator
}

// DeploymentIdentityResolverOption makes resolver dependencies deterministic
// for hosts and tests without changing the default runtime behavior.
type DeploymentIdentityResolverOption func(*deploymentIdentityResolver)

func WithDeploymentEnvironmentLookup(lookup func(string) (string, bool)) DeploymentIdentityResolverOption {
	return func(r *deploymentIdentityResolver) {
		if lookup != nil {
			r.lookupEnv = lookup
		}
	}
}

func WithDeploymentHostnameLookup(lookup func() (string, error)) DeploymentIdentityResolverOption {
	return func(r *deploymentIdentityResolver) {
		if lookup != nil {
			r.hostname = lookup
		}
	}
}

func WithDeploymentClock(now func() time.Time) DeploymentIdentityResolverOption {
	return func(r *deploymentIdentityResolver) {
		if now != nil {
			r.now = now
		}
	}
}

func WithDeploymentRandomSource(source io.Reader) DeploymentIdentityResolverOption {
	return func(r *deploymentIdentityResolver) {
		if source != nil {
			r.random = source
		}
	}
}

func WithDeploymentBuildInfo(lookup func() (DeploymentBuildInfo, bool)) DeploymentIdentityResolverOption {
	return func(r *deploymentIdentityResolver) {
		if lookup != nil {
			r.buildInfo = lookup
		}
	}
}

// WithDeploymentPersonaGenerator supplies an application-defined generator.
func WithDeploymentPersonaGenerator(generator deploymentidentity.Generator) DeploymentIdentityResolverOption {
	return func(r *deploymentIdentityResolver) {
		r.personaGenerator = generator
	}
}

// ResolveDeploymentIdentity resolves allowlisted metadata using field-level
// precedence: typed config, compatibility config, APP_* environment, build
// information, then safe generated/runtime fallbacks.
func ResolveDeploymentIdentity(cfg Config, options ...DeploymentIdentityResolverOption) DeploymentIdentity {
	resolver := deploymentIdentityResolver{
		lookupEnv: os.LookupEnv,
		hostname:  os.Hostname,
		now:       time.Now,
		random:    rand.Reader,
		buildInfo: readDeploymentBuildInfo,
	}
	for _, option := range options {
		if option != nil {
			option(&resolver)
		}
	}
	return resolver.resolve(cfg)
}

func (r deploymentIdentityResolver) resolve(cfg Config) DeploymentIdentity {
	startedAt := r.now().UTC()
	build, hasBuild := r.buildInfo()
	env := func(key string) string {
		value, _ := r.lookupEnv(key)
		return boundedPrintable(value, 256)
	}
	explicit := cfg.Deployment
	identity := newDeploymentIdentity(cfg, startedAt, env)
	if hostname, err := r.hostname(); err == nil {
		identity.Hostname = boundedPrintable(hostname, 255)
	}
	applyDeploymentBuildInfo(&identity, build, hasBuild)
	applyDeploymentCommit(&identity, explicit.CommitSHA, env, build.VCSRevision)
	applyDeploymentBuildTime(&identity, explicit.BuildTime, env("APP_BUILD_TIME"), build.VCSTime)
	identity.EnvironmentColor = resolveEnvironmentColor(
		identity.Environment,
		explicit.EnvironmentColors,
		firstText(16, env("APP_ENV_COLOR")),
		explicit.FallbackColor,
	)
	resolveDeploymentInstance(&identity, r.random, startedAt)
	identity.Persona = r.resolvePersona(explicit.Persona, identity, env("APP_DEPLOYMENT_SEED"))
	return identity
}

func newDeploymentIdentity(cfg Config, startedAt time.Time, env func(string) string) DeploymentIdentity {
	explicit := cfg.Deployment
	return DeploymentIdentity{
		AppID:        firstText(128, explicit.AppID, cfg.Debug.AppID, env("APP_ID")),
		AppName:      firstText(128, explicit.AppName, cfg.Debug.AppName, env("APP_NAME")),
		AppVersion:   firstText(128, explicit.AppVersion, cfg.Errors.AppVersion, env("APP_VERSION")),
		Environment:  normalizeEnvironment(firstText(64, explicit.Environment, cfg.Debug.Environment, env("APP_ENV"))),
		InstanceName: firstText(128, explicit.InstanceName, env("APP_INSTANCE_NAME")),
		InstanceID:   firstText(128, explicit.InstanceID, env("APP_INSTANCE_ID")),
		GitRef:       firstText(256, explicit.GitRef, env("APP_GIT_REF")),
		StartedAt:    startedAt,
	}
}

func applyDeploymentBuildInfo(identity *DeploymentIdentity, build DeploymentBuildInfo, hasBuild bool) {
	if !hasBuild {
		identity.GoVersion = boundedPrintable(runtime.Version(), 64)
		return
	}
	identity.GoVersion = boundedPrintable(build.GoVersion, 64)
	if identity.GoVersion == "" {
		identity.GoVersion = boundedPrintable(runtime.Version(), 64)
	}
	if identity.AppVersion == "" && build.MainVersion != "(devel)" {
		identity.AppVersion = boundedPrintable(build.MainVersion, 128)
	}
	identity.BuildModified = build.VCSModified
}

func applyDeploymentCommit(
	identity *DeploymentIdentity,
	explicitCommit string,
	env func(string) string,
	buildCommitValue string,
) {
	configCommit := normalizeCommit(explicitCommit)
	appCommit := normalizeCommit(env("APP_COMMIT_SHA"))
	githubCommit := normalizeCommit(env("GITHUB_SHA"))
	buildCommit := normalizeCommit(buildCommitValue)
	switch {
	case configCommit != "":
		identity.CommitSHA, identity.BuildSource = configCommit, "config"
	case appCommit != "":
		identity.CommitSHA, identity.BuildSource = appCommit, "environment"
	case githubCommit != "":
		identity.CommitSHA, identity.BuildSource = githubCommit, "provider_environment"
	case buildCommit != "":
		identity.CommitSHA, identity.BuildSource = buildCommit, "go_build_info"
	}
	identity.CommitShort = shortCommit(identity.CommitSHA)
}

func applyDeploymentBuildTime(identity *DeploymentIdentity, configValue, envValue, buildValue string) {
	configBuildTime, configBuildTimeOK := parseBuildTime(configValue)
	envBuildTime, envBuildTimeOK := parseBuildTime(envValue)
	buildTime, buildTimeOK := parseBuildTime(buildValue)
	switch {
	case configBuildTimeOK:
		identity.BuildTime = &configBuildTime
	case envBuildTimeOK:
		identity.BuildTime = &envBuildTime
	case buildTimeOK:
		identity.BuildTime = &buildTime
	}
}

func resolveDeploymentInstance(identity *DeploymentIdentity, source io.Reader, startedAt time.Time) {
	nameGenerated, nameFallback := resolveDeploymentInstanceName(identity, source, startedAt)
	idGenerated, idFallback := resolveDeploymentInstanceID(identity, source, startedAt)
	switch {
	case nameFallback || idFallback:
		identity.InstanceSource = "fallback"
	case nameGenerated && idGenerated:
		identity.InstanceSource = "generated"
	case !nameGenerated && !idGenerated:
		identity.InstanceSource = "configured"
	default:
		identity.InstanceSource = "mixed"
	}
}

func resolveDeploymentInstanceName(identity *DeploymentIdentity, source io.Reader, startedAt time.Time) (bool, bool) {
	if identity.InstanceName != "" {
		return false, false
	}
	if name, ok := randomDeploymentName(source); ok {
		identity.InstanceName = name
		return true, false
	}
	identity.InstanceName = fallbackDeploymentName(identity.Hostname, startedAt)
	return false, true
}

func resolveDeploymentInstanceID(identity *DeploymentIdentity, source io.Reader, startedAt time.Time) (bool, bool) {
	if identity.InstanceID != "" {
		return false, false
	}
	if id, ok := randomUUID(source); ok {
		identity.InstanceID = id
		return true, false
	}
	identity.InstanceID = fallbackInstanceID(identity.Hostname, startedAt)
	return false, true
}

func (r deploymentIdentityResolver) resolvePersona(
	cfg DeploymentPersonaConfig,
	identity DeploymentIdentity,
	environmentSeed string,
) *deploymentidentity.Persona {
	if !cfg.Enabled {
		return nil
	}
	seed := deploymentidentity.NormalizeText(cfg.Seed, deploymentidentity.MaxSeedBytes)
	if seed == "" {
		seed = deploymentidentity.NormalizeText(environmentSeed, deploymentidentity.MaxSeedBytes)
	}
	if seed == "" {
		seed = deploymentidentity.NormalizeText(identity.CommitSHA, deploymentidentity.MaxSeedBytes)
	}
	if seed == "" {
		return nil
	}
	namespace := identity.AppID
	if cfg.Namespace != nil {
		namespace = *cfg.Namespace
	}
	input := deploymentidentity.Input{
		Seed:        seed,
		Namespace:   deploymentidentity.NormalizeText(namespace, deploymentidentity.MaxNamespaceBytes),
		CommitSHA:   identity.CommitSHA,
		AppID:       identity.AppID,
		AppName:     identity.AppName,
		Environment: identity.Environment,
	}
	generator := r.personaGenerator
	source := "custom"
	if generator == nil {
		generator = deploymentidentity.NewDefaultGenerator()
		source = "default"
	}
	persona, err := generator.Generate(input)
	if err == nil {
		persona.Source = source
		applyPersonaNameOverride(&persona, cfg.Name)
		if validated, validationErr := deploymentidentity.Validate(persona); validationErr == nil {
			return personaPointer(validated)
		}
	}
	if source == "custom" {
		fallback, fallbackErr := deploymentidentity.NewDefaultGenerator().Generate(input)
		if fallbackErr == nil {
			fallback.Source = "fallback"
			applyPersonaNameOverride(&fallback, cfg.Name)
			if validated, validationErr := deploymentidentity.Validate(fallback); validationErr == nil {
				return personaPointer(validated)
			}
		}
	}
	return nil
}

func applyPersonaNameOverride(persona *deploymentidentity.Persona, name string) {
	if persona == nil {
		return
	}
	if override := deploymentidentity.NormalizeText(name, deploymentidentity.MaxNameBytes); override != "" {
		persona.Name = override
		persona.Visual.Alt = override + " deployment persona"
	}
}

func personaPointer(persona deploymentidentity.Persona) *deploymentidentity.Persona {
	cloned := persona.Clone()
	return &cloned
}

func readDeploymentBuildInfo() (DeploymentBuildInfo, bool) {
	info, ok := runtimedebug.ReadBuildInfo()
	if !ok || info == nil {
		return DeploymentBuildInfo{}, false
	}
	out := DeploymentBuildInfo{MainVersion: info.Main.Version, GoVersion: info.GoVersion}
	for _, setting := range info.Settings {
		switch setting.Key {
		case "vcs.revision":
			out.VCSRevision = setting.Value
		case "vcs.time":
			out.VCSTime = setting.Value
		case "vcs.modified":
			if modified, err := strconv.ParseBool(setting.Value); err == nil {
				out.VCSModified = modified
			}
		}
	}
	return out, true
}

func boundedPrintable(value string, limit int) string {
	value = strings.TrimSpace(value)
	if value == "" || limit <= 0 {
		return ""
	}
	var out strings.Builder
	for _, char := range value {
		if unicode.IsPrint(char) && !unicode.IsControl(char) {
			if out.Len()+utf8.RuneLen(char) > limit {
				break
			}
			out.WriteRune(char)
		}
	}
	return strings.TrimSpace(out.String())
}

func firstText(limit int, values ...string) string {
	for _, value := range values {
		if normalized := boundedPrintable(value, limit); normalized != "" {
			return normalized
		}
	}
	return ""
}

func normalizeCommit(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) < 7 || len(value) > 64 {
		return ""
	}
	for _, char := range value {
		if (char < '0' || char > '9') && (char < 'a' || char > 'f') {
			return ""
		}
	}
	return value
}

func shortCommit(commit string) string {
	if len(commit) <= 12 {
		return commit
	}
	return commit[:12]
}

func parseBuildTime(value string) (time.Time, bool) {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, false
	}
	return parsed.UTC(), true
}

func normalizeEnvironment(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "dev", "development":
		return "development"
	case "stage", "staging":
		return "staging"
	case "prod", "production":
		return "production"
	default:
		return strings.ToLower(boundedPrintable(value, 64))
	}
}

func normalizeHexColor(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) == 4 && value[0] == '#' {
		value = fmt.Sprintf("#%c%c%c%c%c%c", value[1], value[1], value[2], value[2], value[3], value[3])
	}
	if len(value) != 7 || value[0] != '#' {
		return ""
	}
	if _, err := hex.DecodeString(value[1:]); err != nil {
		return ""
	}
	return value
}

func resolveEnvironmentColor(environment string, overrides map[string]string, environmentColor, fallback string) string {
	canonicalEnvironment := normalizeEnvironment(environment)
	colors := map[string]string{
		"development": defaultDevelopmentColor,
		"staging":     defaultStagingColor,
		"production":  defaultProductionColor,
	}
	explicitColor := ""
	for name, color := range overrides {
		if normalized := normalizeHexColor(color); normalized != "" {
			normalizedName := normalizeEnvironment(name)
			colors[normalizedName] = normalized
			if normalizedName == canonicalEnvironment {
				explicitColor = normalized
			}
		}
	}
	if explicitColor != "" {
		return explicitColor
	}
	if normalized := normalizeHexColor(environmentColor); normalized != "" {
		return normalized
	}
	if color := colors[canonicalEnvironment]; color != "" {
		return color
	}
	if normalized := normalizeHexColor(fallback); normalized != "" {
		return normalized
	}
	return defaultEnvironmentColor
}

func randomDeploymentName(source io.Reader) (string, bool) {
	adjective, ok := randomIndex(source, len(deploymentAdjectives))
	if !ok {
		return "", false
	}
	noun, ok := randomIndex(source, len(deploymentNouns))
	if !ok {
		return "", false
	}
	return deploymentAdjectives[adjective] + "-" + deploymentNouns[noun], true
}

func randomIndex(source io.Reader, size int) (int, bool) {
	if size <= 0 || size > 256 {
		return 0, false
	}
	limit := 256 - (256 % size)
	var value [1]byte
	for range 128 {
		if _, err := io.ReadFull(source, value[:]); err != nil {
			return 0, false
		}
		if int(value[0]) < limit {
			return int(value[0]) % size, true
		}
	}
	return 0, false
}

func randomUUID(source io.Reader) (string, bool) {
	var value [16]byte
	if _, err := io.ReadFull(source, value[:]); err != nil {
		return "", false
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		value[0:4], value[4:6], value[6:8], value[8:10], value[10:16]), true
}

func fallbackDeploymentName(hostname string, startedAt time.Time) string {
	sum := sha256.Sum256(fmt.Appendf(nil, "%s:%d:%d", hostname, startedAt.UnixNano(), fallbackSequence.Add(1)))
	return deploymentAdjectives[int(sum[0])%len(deploymentAdjectives)] + "-" +
		deploymentNouns[int(sum[1])%len(deploymentNouns)]
}

func fallbackInstanceID(hostname string, startedAt time.Time) string {
	sum := sha256.Sum256(fmt.Appendf(nil, "%s:%d:%d:%d", hostname, os.Getpid(), startedAt.UnixNano(), fallbackSequence.Add(1)))
	value := sum[:16]
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		value[0:4], value[4:6], value[6:8], value[8:10], value[10:16])
}
