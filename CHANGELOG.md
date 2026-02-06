# Changelog

# [Unreleased]

## ⚠️ Breaking Changes

- Centralized error handling: API error responses now go through a shared presenter that sets `location`, `stack_trace`, and consistent `text_code`/`category` defaults.
- Stack traces are included by default in dev mode; production stack traces are opt-in.
- Translation workflow refactor: CMS read APIs now use options-based signatures and return translation metadata with nil translation payloads when missing; workflow checks now accept state/environment; writes require explicit create-translation intent.
- URL normalization cleanup: legacy path helpers were removed (`admin/internal/helpers.JoinPath`, `admin/path_helpers.go`, quickstart `joinBasePath`/`joinAdminURL`). URL generation and route registration now rely on `Config.URLs` + URLKit.
- Removed legacy URL migration fields `Config.URLs.APIPrefix` and `Config.URLs.APIVersion` (use namespace-specific `Config.URLs.Admin` / `Config.URLs.Public`).

## 🛠 Upgrade Guide

- Set `Config.Errors.DevMode = true` (or enable `Config.Debug.Enabled`) to include stack traces and internal messages in dev.
- To temporarily enable stack traces in non-dev environments, set `Config.Errors.IncludeStackTrace = true` (or `ADMIN_ERROR_STACKTRACE=true` with `quickstart.WithErrorsFromEnv()`).
- Use `admin.NewErrorPresenter(cfg.Errors, ...)` for custom handlers and call `Present` / `PresentWithContext` to produce API responses.
- Wrap origin errors with `admin.WithStack(err)` when you want precise `location` and stack capture at the source.
- Domain error codes are documented in `docs/ERROR_CODES.md` and exposed via `admin.DomainErrorCodes()`.
- CMS CRUD alignment: route list/detail reads through `AdminPageReadService` (returning `AdminPageRecord` with `RequestedLocale`/`ResolvedLocale` and include flags). Ensure any view-backed read model (e.g., `admin_page_records`) matches the admin read contract.
- For parity between HTML and JSON CRUD, split read/write services (go-crud `WithReadService`/`WithWriteService`) and centralize orchestration in `PageApplicationService`.
- To opt into go-cms admin reads, provide a go-cms container/module exposing `AdminPageReadService` via `Config.CMS.Container`/`Config.CMS.GoCMSConfig`; otherwise keep a view-backed adapter as the fallback read source.
- Translation workflow migration:
  - Update go-cms page/content services to accept `TranslationReadOptions` and return translation metadata + nil translation payloads when missing.
  - Replace locale-only reads in go-admin with options-based reads; propagate translation metadata to admin records.
  - Pass `TranslationCheckOptions` (state/environment/version) to `CheckTranslations` in workflow guards.
  - Require an explicit `CreateTranslation` flag/command for writes when the requested locale is missing.
  - Remove any legacy adapters or string-matching error handling for missing translations.
- URL normalization migration:
  - Replace any custom uses of `joinPath`/`joinAdminURL`/`joinBasePath` with URLKit route resolution (`adm.URLs().Resolve(...)`) or `RoutePath` helpers.
  - Move URL customization to `Config.URLs.Admin` and `Config.URLs.Public` (BasePath, APIPrefix, APIVersion) or supply a full `Config.URLs.URLKit` override.
  - Remove any assignments to `Config.URLs.APIPrefix` or `Config.URLs.APIVersion`; set `Config.URLs.Admin.APIPrefix` / `Config.URLs.Admin.APIVersion` instead (and `Config.URLs.Public.*` for public API overrides).

# [0.23.0](https://github.com/goliatone/go-admin/compare/v0.22.0...v0.23.0) - (2026-01-29)

## <!-- 1 -->🐛 Bug Fixes

- Clone ui schema in cms records in memory ([075d403](https://github.com/goliatone/go-admin/commit/075d403e81aa97531c7cbc683698a3bb0c16ac81))  - (goliatone)
- Block schema version in editor ([33c7a39](https://github.com/goliatone/go-admin/commit/33c7a3920b57d898244930e2961d326c29140ddf))  - (goliatone)
- Repository cms block normalize ids ([2e9cd6c](https://github.com/goliatone/go-admin/commit/2e9cd6cca46dad9597c9d0bcdeb302c973019e23))  - (goliatone)
- Block editor animation use requestAnimationFrame ([23faa58](https://github.com/goliatone/go-admin/commit/23faa58937276e8cb27bd84a501de4c27e94d249))  - (goliatone)
- Block editor TS scope issues ([fa56f36](https://github.com/goliatone/go-admin/commit/fa56f3639995655fbc960bf083dd794083cd26af))  - (goliatone)
- Function signature ([afa2b0c](https://github.com/goliatone/go-admin/commit/afa2b0c9348179af3ee17b54f611e9c895a6fe19))  - (goliatone)
- Address timeline UX issues ([e5ce88a](https://github.com/goliatone/go-admin/commit/e5ce88a62da3d2b25461214262671e94368fa55c))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.23.0 ([014f54c](https://github.com/goliatone/go-admin/commit/014f54c8f1e8986642d75bfd27178cd0efaf6570))  - (goliatone)

## <!-- 16 -->➕ Add

- Ui schema and status ([22ff0cf](https://github.com/goliatone/go-admin/commit/22ff0cf1999ac072c15b658a2468b671d5e151a1))  - (goliatone)
- Content type repository ([2a96884](https://github.com/goliatone/go-admin/commit/2a96884bc12f9c498d25eb60b2f0a946540b222b))  - (goliatone)
- Unregsiter panel support ([bb726c0](https://github.com/goliatone/go-admin/commit/bb726c07dc08e295df1232a4c979da92f50f6658))  - (goliatone)
- Schema fitler ([58b5deb](https://github.com/goliatone/go-admin/commit/58b5deb196b382fc8c98b3f8f43b79bf07a73ae9))  - (goliatone)
- Form schema to panel def ([b81d0fa](https://github.com/goliatone/go-admin/commit/b81d0fa77707821e282ee910355308299ca0aa29))  - (goliatone)
- CMS content type adapter ([cab1831](https://github.com/goliatone/go-admin/commit/cab1831005685d2b9d169b5642cb5b92642753a2))  - (goliatone)
- Unregister panel ([e317cb4](https://github.com/goliatone/go-admin/commit/e317cb496224aef87c98cbd64865e025d7367f38))  - (goliatone)
- Dynamic panel factory ([fbc5a73](https://github.com/goliatone/go-admin/commit/fbc5a73374f3a13b520c3f1f744131e3020ff850))  - (goliatone)
- Cms schema guardrails ([9b5c310](https://github.com/goliatone/go-admin/commit/9b5c3104dec21a0360b506110cb9a5136cf8f409))  - (goliatone)
- Content type builder ([5ee3f01](https://github.com/goliatone/go-admin/commit/5ee3f01fe10be48f5206cdb0b2d854c5a67c0baf))  - (goliatone)
- Block editor updates ([c0b99e2](https://github.com/goliatone/go-admin/commit/c0b99e26f3e9f2a783113c9b5fcadfdd44e9cb89))  - (goliatone)
- Refactor block editor ([724409f](https://github.com/goliatone/go-admin/commit/724409f3eb4179a4c6b845924b6b64b461773739))  - (goliatone)
- Support embedded blocks ([5284caf](https://github.com/goliatone/go-admin/commit/5284caf7c52106b5642173f85ffe13d8abb9ca43))  - (goliatone)
- Repository cms ([403f6f1](https://github.com/goliatone/go-admin/commit/403f6f14019024c20edb84072f9090520ac305ed))  - (goliatone)
- Expose public api methods ([d90b35a](https://github.com/goliatone/go-admin/commit/d90b35aba26333f724e1377a870ab2c0d062b859))  - (goliatone)
- Json schema editor ([161546c](https://github.com/goliatone/go-admin/commit/161546c15cb8f763e5fab51b048a6b2a9e3a58d3))  - (goliatone)
- Graphql schem deliver setup ([1eb082e](https://github.com/goliatone/go-admin/commit/1eb082e9644254147c185949fe888fdeb9504118))  - (goliatone)
- Expose boot schema registry ([491a78f](https://github.com/goliatone/go-admin/commit/491a78f2190584c28f46c9f19e5c00b18fcc9219))  - (goliatone)
- Block editor ([75abb37](https://github.com/goliatone/go-admin/commit/75abb373fd5a2a29880288691fc0db21c159caac))  - (goliatone)
- Boot schema registry wiring ([1b77d5f](https://github.com/goliatone/go-admin/commit/1b77d5f7b75a065df2a5901892341d633eafe66c))  - (goliatone)
- Admin schema registry ([57a9e81](https://github.com/goliatone/go-admin/commit/57a9e810fdd642319b66283e7ca6f0dd1232df34))  - (goliatone)
- Block conflict resolution ([67df577](https://github.com/goliatone/go-admin/commit/67df57707a4151c4f5741cf37c9d03ad05cc080b))  - (goliatone)
- Support for block editor ([cd10a9b](https://github.com/goliatone/go-admin/commit/cd10a9b863852767c98c797ed7216059d6a6801f))  - (goliatone)
- Error handling for frontend ([f37775c](https://github.com/goliatone/go-admin/commit/f37775cc2fc13d6789a26de09dbccc22585bdb90))  - (goliatone)
- Admin repository cms ([b8eed6f](https://github.com/goliatone/go-admin/commit/b8eed6fe96382413089db884f659bdc69306a10c))  - (goliatone)
- Cms demo updated ([910b8a8](https://github.com/goliatone/go-admin/commit/910b8a8645148365e762fd15acc90fae0f17ad75))  - (goliatone)
- Register cms routes from service ([cb8651b](https://github.com/goliatone/go-admin/commit/cb8651b3b9666891c30b52c0f8527c5b9d98ad05))  - (goliatone)
- Cms routes registered ([7d32680](https://github.com/goliatone/go-admin/commit/7d3268051b77457a13e5c9ca2c9da96596611d40))  - (goliatone)
- Expose CMS types to facade ([ac2c5f5](https://github.com/goliatone/go-admin/commit/ac2c5f532616a83254c8aa2d8a42995db4c98776))  - (goliatone)
- Wire create to cms repo ([44af078](https://github.com/goliatone/go-admin/commit/44af0789bfdcd77231996d1204e1652cbd77392e))  - (goliatone)
- Update routing for public API ([902b63b](https://github.com/goliatone/go-admin/commit/902b63b26445c622b75aa853b63c010ea93d8d9a))  - (goliatone)
- Admin cms workflow ([be21332](https://github.com/goliatone/go-admin/commit/be21332271afa38416dd0daa4d074933d80f3c49))  - (goliatone)
- Transition mangement ([d1b94d4](https://github.com/goliatone/go-admin/commit/d1b94d44cee55676ce5a613901fdebd000594ac0))  - (goliatone)
- Bootstrap gql ([0f3b30c](https://github.com/goliatone/go-admin/commit/0f3b30ca4ca2bc07539982a5850be59c7f3d5056))  - (goliatone)
- Content type model ([8580205](https://github.com/goliatone/go-admin/commit/8580205bcbb75442bc6ece8db5e2ee6faf239193))  - (goliatone)
- Updated cms demo ([5b8f9d6](https://github.com/goliatone/go-admin/commit/5b8f9d681f36ddf022883e6c9f9b37776e789407))  - (goliatone)
- Boot bindings include cms setup ([6dc373e](https://github.com/goliatone/go-admin/commit/6dc373eea5152695509c5c58ddf76c1c8e0b183d))  - (goliatone)
- Graphql management registry ([9244e1c](https://github.com/goliatone/go-admin/commit/9244e1c07676242bfd92cec2783c9acc0a7c0697))  - (goliatone)
- Graphql management services ([1cbacec](https://github.com/goliatone/go-admin/commit/1cbaceccdf093d126e51c7f3baf6a3c134d3a1bf))  - (goliatone)
- Go-cms integration ([79166bc](https://github.com/goliatone/go-admin/commit/79166bc27505bb234e9594918e9d18dadeca598c))  - (goliatone)
- Cms schema helpers ([989c6bf](https://github.com/goliatone/go-admin/commit/989c6bfadc8c7985619b62a0efc91f3956ecca55))  - (goliatone)
- Cms repository ([3d03ab1](https://github.com/goliatone/go-admin/commit/3d03ab1fd45cd557130e5df8780606a2594a9089))  - (goliatone)
- Context public ([ec81a2c](https://github.com/goliatone/go-admin/commit/ec81a2c81ecd706eda2d4bcff71b2a98cefe7981))  - (goliatone)
- Graphql support ([3bff062](https://github.com/goliatone/go-admin/commit/3bff0628762d05e5531c5979f5ca6ed23ef713c9))  - (goliatone)
- Content URL for cms content type ([e9976c1](https://github.com/goliatone/go-admin/commit/e9976c110af95b9eeea8909092d7c15a6a1c1188))  - (goliatone)
- Validation helper ([a8c9496](https://github.com/goliatone/go-admin/commit/a8c94961a55b1bdbd38edcacb8f6c3e9f5b956ee))  - (goliatone)
- CMS repository update to handle content type ([8c537f8](https://github.com/goliatone/go-admin/commit/8c537f8c90c64ef442d65d9145c821e47ef31dd6))  - (goliatone)
- Updated CMS container ([cd38c72](https://github.com/goliatone/go-admin/commit/cd38c7266eed4b39653b105fa675265f34ce8c31))  - (goliatone)
- Error helpers ([9c4c2c2](https://github.com/goliatone/go-admin/commit/9c4c2c2f0924f2832ffdef0d1f690b92e0ac4529))  - (goliatone)
- Cms memory store ([62b2ae8](https://github.com/goliatone/go-admin/commit/62b2ae85dc11a9e607e86ecfab2229f744db9496))  - (goliatone)
- Cms types ([5393ef8](https://github.com/goliatone/go-admin/commit/5393ef8efd369eda2f686cad358dd704c43f66b4))  - (goliatone)
- Content type support ([01a181e](https://github.com/goliatone/go-admin/commit/01a181eddaa34ea4d72fecbc66c6ab3ad8175120))  - (goliatone)
- Client code for activity display ([277e420](https://github.com/goliatone/go-admin/commit/277e420d872ccb6464b97c243c5078e5fd2b1704))  - (goliatone)
- Updated activity preview ([4d3a382](https://github.com/goliatone/go-admin/commit/4d3a382519338bd7e58cc8faaf02528f8f0d77d7))  - (goliatone)
- Include activity enricher to activity flow ([e7508c6](https://github.com/goliatone/go-admin/commit/e7508c662ca152a773c4f6fbdbaf5b38fe116c36))  - (goliatone)
- Include metadata key in formatter ([8d0b788](https://github.com/goliatone/go-admin/commit/8d0b788fed0dc98bf3fe93fa0bba80e08100426c))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.22.0 ([fb27852](https://github.com/goliatone/go-admin/commit/fb278528f20fe6f8cd0179a7648a846ef871ab20))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([68fa93c](https://github.com/goliatone/go-admin/commit/68fa93cacac50ebc31e2241984db1f352f82b658))  - (goliatone)
- Format ([be9a1dc](https://github.com/goliatone/go-admin/commit/be9a1dc29736335118c7074280bb8a404d7df8b2))  - (goliatone)
- Update test ([ed7f669](https://github.com/goliatone/go-admin/commit/ed7f6690ce32a004fcaa466752cc009a09f691c6))  - (goliatone)
- Update examples ([675dd8e](https://github.com/goliatone/go-admin/commit/675dd8eca36912c21e69b21dda28c8400bc11992))  - (goliatone)
- Udpate deps ([3235466](https://github.com/goliatone/go-admin/commit/3235466fefbe4fc46cb8f30df89438682402df7d))  - (goliatone)
- Udpate test ([125dee4](https://github.com/goliatone/go-admin/commit/125dee4c2532109e2c1202a5c32196fb51521522))  - (goliatone)
- Udpate testc ([0dcf602](https://github.com/goliatone/go-admin/commit/0dcf602ae74be9fc6b135a3239b0fa0fd6d77a68))  - (goliatone)
- Update depsc ([909d9a8](https://github.com/goliatone/go-admin/commit/909d9a8ced60f820906ba497c4a4ef41dc8ac406))  - (goliatone)
- Clean up ([1819e97](https://github.com/goliatone/go-admin/commit/1819e9701d9c0e30c540d1970e54eed873edf636))  - (goliatone)
- Update format ([8591cc6](https://github.com/goliatone/go-admin/commit/8591cc6743a9f1a308bba8fda6fb9691d354b4db))  - (goliatone)
- Update guides ([e1b6efb](https://github.com/goliatone/go-admin/commit/e1b6efbac6373d957824fbc91e91ff47bd49ee41))  - (goliatone)
- Update tests ([7ae5f5c](https://github.com/goliatone/go-admin/commit/7ae5f5cd4704ce6b9b597dee04683d7deefd7cf2))  - (goliatone)

# [0.22.0](https://github.com/goliatone/go-admin/compare/v0.21.1...v0.22.0) - (2026-01-26)

## <!-- 1 -->🐛 Bug Fixes

- Deadlock ([f8abe09](https://github.com/goliatone/go-admin/commit/f8abe0938d0de8360aecd34c150a5b3540cb9ac4))  - (goliatone)
- Updated activity formatter to use new actor id ([cd30966](https://github.com/goliatone/go-admin/commit/cd3096634dd25e532ca27a73dc9f3ee59cded866))  - (goliatone)
- Resolve route precedence ([d860b54](https://github.com/goliatone/go-admin/commit/d860b544489e70d356254e5757f257627b92146e))  - (goliatone)
- Style. add: descriptions to feature flags ([37866d8](https://github.com/goliatone/go-admin/commit/37866d8f21842533b94e078a5cc9e94b1949028f))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.22.0 ([79b498d](https://github.com/goliatone/go-admin/commit/79b498dced9541182aec6b1687f586a77c315631))  - (goliatone)

## <!-- 16 -->➕ Add

- Activity enrichment implementation ([578db86](https://github.com/goliatone/go-admin/commit/578db8639810e54f25dcb03d8c4b5d1ef46de8c1))  - (goliatone)
- Format group ID ([8c97196](https://github.com/goliatone/go-admin/commit/8c97196357192042c7bbb175a58e71a9d93f6148))  - (goliatone)
- Update formatting for UI dates ([c536071](https://github.com/goliatone/go-admin/commit/c536071326fa7e67defa2aa37ed2094e45956bdd))  - (goliatone)
- Activity resolvers ([1bb19bf](https://github.com/goliatone/go-admin/commit/1bb19bf52d8294cbc2f7a9593a595dd514e09353))  - (goliatone)
- Activity timeline implementation ([067a90f](https://github.com/goliatone/go-admin/commit/067a90f3408d4abf290fd7b533d97387d7234b08))  - (goliatone)
- Implement activity timeline view ([4a120a9](https://github.com/goliatone/go-admin/commit/4a120a9a602123974d366ed96bb53c25649c1859))  - (goliatone)
- Updated page resources ([96771ba](https://github.com/goliatone/go-admin/commit/96771ba656f68959c830f3bbc6a06f3bce9420f3))  - (goliatone)
- Example definition for content ([4ef4ac5](https://github.com/goliatone/go-admin/commit/4ef4ac540f86c338d996da009ec012621523bbfd))  - (goliatone)
- Updated activity preview ([9365984](https://github.com/goliatone/go-admin/commit/93659841d2c409b95806ac69ce21fb56b9c0a8c2))  - (goliatone)
- Wire workflows ([c460e8c](https://github.com/goliatone/go-admin/commit/c460e8c2911f6e691890e29d1d86fe60c9957c9b))  - (goliatone)
- Register preview routes ([c066bde](https://github.com/goliatone/go-admin/commit/c066bde7b9c447d8090ded107029bf60303d2c94))  - (goliatone)
- Generate preview ([8cb6888](https://github.com/goliatone/go-admin/commit/8cb688843d5bfcedbfd101466049016c4e67e19b))  - (goliatone)
- Worfklow integration with panel ([5237256](https://github.com/goliatone/go-admin/commit/52372564b8542422cbeead960637b299ad19f24a))  - (goliatone)
- Workflow auth to facade ([7ffbcc7](https://github.com/goliatone/go-admin/commit/7ffbcc793ba673162ecee4fe7396633cd2362328))  - (goliatone)
- Panel workflow setup ([8f35ab9](https://github.com/goliatone/go-admin/commit/8f35ab960ad87d23e66ceffe94db64b8275e1066))  - (goliatone)
- MenuByLocation to cms service ([c3a7f13](https://github.com/goliatone/go-admin/commit/c3a7f1335740dbfeb8f97b68270f01733690b115))  - (goliatone)
- Cms menu management ([1e5b1d2](https://github.com/goliatone/go-admin/commit/1e5b1d2813aa8bcb2c4cb5d71463b2e986ef0a7b))  - (goliatone)
- Integrate menu management ([90cacc5](https://github.com/goliatone/go-admin/commit/90cacc5c82bb3934fb0075d69447540df606bf10))  - (goliatone)
- Public menu get by location ([fac6ec7](https://github.com/goliatone/go-admin/commit/fac6ec7f120a5d9edfdf6434c031200565ed013e))  - (goliatone)
- Activity frontend code ([9a057cd](https://github.com/goliatone/go-admin/commit/9a057cdbce9b2165b42e5de2f814a88af53c7eb8))  - (goliatone)
- Preview panel binding ([c7d025c](https://github.com/goliatone/go-admin/commit/c7d025c0d9b34962e4a54c22e3a08d6a9f94b61a))  - (goliatone)
- Update step for routes ([5fb9ae6](https://github.com/goliatone/go-admin/commit/5fb9ae601e8389980abc20066e27d5c309ca79e8))  - (goliatone)
- Udpate translate interface ([4bf2468](https://github.com/goliatone/go-admin/commit/4bf2468cfbd6c9910705ee032467b1c4b15d3240))  - (goliatone)
- Update workflow ([4f265fd](https://github.com/goliatone/go-admin/commit/4f265fd2a3d952c005b07a90c7270493e88a5074))  - (goliatone)
- Udpated translate interface ([a558a68](https://github.com/goliatone/go-admin/commit/a558a6812a3182bccba40ed5b84267b1bca4d007))  - (goliatone)
- Workflows in deps ([4c67e32](https://github.com/goliatone/go-admin/commit/4c67e322a4bcbcbfe632d0e3355a5bb8537ea57c))  - (goliatone)
- Activity labels ([9c2fed4](https://github.com/goliatone/go-admin/commit/9c2fed42d96888c8e3dedb2f6886a8b86d6b56a8))  - (goliatone)
- Expose preview and transition to facade ([1b44f38](https://github.com/goliatone/go-admin/commit/1b44f388f3f15548b9ca44b14c9cd4d73d794d03))  - (goliatone)
- Public api ([494b440](https://github.com/goliatone/go-admin/commit/494b440dc31f2ecd25813cfba93153518fa02e9e))  - (goliatone)
- Simple workflow ([2f4c41b](https://github.com/goliatone/go-admin/commit/2f4c41b6ace0e54407501a96e57cd7ac98eba405))  - (goliatone)
- User roles context ([c141bdf](https://github.com/goliatone/go-admin/commit/c141bdf8961a1a7ba0f8809904171972d7ddc788))  - (goliatone)
- Activity action labels ([573b494](https://github.com/goliatone/go-admin/commit/573b494bd16ae2b11ea4f80b47249f2becdedeb9))  - (goliatone)
- Rewrite roles for HTML ([5b0156d](https://github.com/goliatone/go-admin/commit/5b0156d936bb44a77da91b3a39cc0699e3ed02e6))  - (goliatone)
- Templates for activity ([6c6bc20](https://github.com/goliatone/go-admin/commit/6c6bc20e9405f6845c4afb6e0622060bdbb2609e))  - (goliatone)
- Admin context include translator ([8bcc473](https://github.com/goliatone/go-admin/commit/8bcc4736bcc028e3916e98b998a4350c3fa587ac))  - (goliatone)
- Cms workflow types ([daa6e31](https://github.com/goliatone/go-admin/commit/daa6e31bc52b83703e2eef1f91e4d36f07f0e1ba))  - (goliatone)
- Boot workflow ([fd58566](https://github.com/goliatone/go-admin/commit/fd58566c560faa89e4181e473ba85a08d0c450f2))  - (goliatone)
- Enable public api ([4d3ffba](https://github.com/goliatone/go-admin/commit/4d3ffbaeb9b88a4f258f23df35de5c8194671607))  - (goliatone)
- Workflow integration for content ([3c63a54](https://github.com/goliatone/go-admin/commit/3c63a540ac1c643f1f70fa8a3f07a11c8ec18990))  - (goliatone)
- Activity frontend display ([e6c4ef6](https://github.com/goliatone/go-admin/commit/e6c4ef6e2dd8cff4f0ae21b510411d0109d56048))  - (goliatone)
- Activity widget ([6b0565a](https://github.com/goliatone/go-admin/commit/6b0565a563049ebdf0ead2a98864b3f5586ed7bc))  - (goliatone)
- Feature gate scope RBAC support ([c5585b0](https://github.com/goliatone/go-admin/commit/c5585b032ea8152c1cc0bf40830b399e7a190a19))  - (goliatone)
- Updated permission matrix ([cdf49ba](https://github.com/goliatone/go-admin/commit/cdf49ba41e51054dee0e33a1a41aabf5dedfddb9))  - (goliatone)
- Resource list for user ([a8c2af2](https://github.com/goliatone/go-admin/commit/a8c2af2746825a433b3285cc260757b7716e8584))  - (goliatone)
- Import role ([5afc1e8](https://github.com/goliatone/go-admin/commit/5afc1e84087f1c0ff2953a9cc404a9ae4dbdb345))  - (goliatone)
- Expose bulk user import ([68a2a74](https://github.com/goliatone/go-admin/commit/68a2a74b3c7e71af831f12e62c45b25e1da07d12))  - (goliatone)
- User import debug integration ([1bf3573](https://github.com/goliatone/go-admin/commit/1bf35730238921c2bec8c90fff1af43432dea6ce))  - (goliatone)
- User import step to boot ([d06de43](https://github.com/goliatone/go-admin/commit/d06de4307e088ec0417f0e4af0f1890fbf5570db))  - (goliatone)
- User import perms ([be0a940](https://github.com/goliatone/go-admin/commit/be0a9404fc7773b07bb0d8f28d24bf1ef59b9d53))  - (goliatone)
- Import for auth action ([c26b204](https://github.com/goliatone/go-admin/commit/c26b204dc4e3ed38e796ecfdd4a6d56c934830bd))  - (goliatone)
- New form generator ([801bb97](https://github.com/goliatone/go-admin/commit/801bb97d22cc501ad476719dcb5d472d25a81a26))  - (goliatone)
- Role meta to user module ([f4332e2](https://github.com/goliatone/go-admin/commit/f4332e21959e5f5c93d5d5eb5e634067258275d5))  - (goliatone)
- Integrate roles with user ([78477b7](https://github.com/goliatone/go-admin/commit/78477b7d883e10a371e182cdc18e89ac592b7270))  - (goliatone)
- Boot user import setup ([93672e5](https://github.com/goliatone/go-admin/commit/93672e5e1ca2c66e3ef647c8adaadccb9cf18a26))  - (goliatone)
- Formgen helpers ([15b6f58](https://github.com/goliatone/go-admin/commit/15b6f58a6619553581caadcd08c1235f747bba86))  - (goliatone)
- Bulk user import ([f483952](https://github.com/goliatone/go-admin/commit/f483952c028a48c4951a07d961a535581c9e88f0))  - (goliatone)
- User record and role records ([f6c0d1b](https://github.com/goliatone/go-admin/commit/f6c0d1b736aa0ba9a64593fb0b498ba20828877e))  - (goliatone)
- Permission matrix; ([ead4525](https://github.com/goliatone/go-admin/commit/ead4525b924c6bbd0b026ca34cd649085fd33a62))  - (goliatone)
- User import setup ([36beae4](https://github.com/goliatone/go-admin/commit/36beae427847591e0d1f5b13da34f99a0e14afaf))  - (goliatone)
- Roles formgen setup ([056db23](https://github.com/goliatone/go-admin/commit/056db23fddf9f9fb0fcbed2ddcdbf8518b43739c))  - (goliatone)
- Users import setup ([3da5594](https://github.com/goliatone/go-admin/commit/3da55946b12a6be6e753a39b83911fae961d543c))  - (goliatone)
- Roles UI setup ([6ad390b](https://github.com/goliatone/go-admin/commit/6ad390bbdc6cdf7a08970bac074244e7e4df6f60))  - (goliatone)
- User role routes ([e85de96](https://github.com/goliatone/go-admin/commit/e85de96c1b4ba8abef46ceb6f6639583750e0a07))  - (goliatone)
- Role management and user import ([e21c19f](https://github.com/goliatone/go-admin/commit/e21c19f693f65c9d2d0d5c68015e5308cc837157))  - (goliatone)
- Feature descriptions ([03bbfc9](https://github.com/goliatone/go-admin/commit/03bbfc91ad0b49bd4908f1ebfe88b12762c82beb))  - (goliatone)
- Feature catalog setup ([498df45](https://github.com/goliatone/go-admin/commit/498df45e45a0e42ef08ced7db5df7fb4bc127bb4))  - (goliatone)
- Feature catalog option ([2b6ba27](https://github.com/goliatone/go-admin/commit/2b6ba2763bac102d1f918eb98eaf7e2fb2ab00a0))  - (goliatone)
- Feature catalog ([c8961a2](https://github.com/goliatone/go-admin/commit/c8961a203b70b1dc7d23b57ade93ead3b4199ce1))  - (goliatone)
- Feature flags manager ([239fac1](https://github.com/goliatone/go-admin/commit/239fac10ea42de9f5ada8290040ab1c2c8326536))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Use new go-auth adapter for feature flags ([2da0be6](https://github.com/goliatone/go-admin/commit/2da0be6fd30f824b40fd1c2578a93cea79f48ade))  - (goliatone)
- Use scope chain for feat gate ([85651f2](https://github.com/goliatone/go-admin/commit/85651f215ad4351e434ad34499e1f267fdac7f7c))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.21.1 ([5b2b98f](https://github.com/goliatone/go-admin/commit/5b2b98f772cd8b79d1fea5588599ab6b68f2d5ea))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([90c82bb](https://github.com/goliatone/go-admin/commit/90c82bb7069aa7d05460e7c60d86877865a77028))  - (goliatone)
- Update tests ([769c0a4](https://github.com/goliatone/go-admin/commit/769c0a493c33d278be4178ed9ecee8debf35115a))  - (goliatone)
- Update format ([30d06ad](https://github.com/goliatone/go-admin/commit/30d06ad22d46e0daf9537719bd191854d9632722))  - (goliatone)
- Update assets ([0a8fb8e](https://github.com/goliatone/go-admin/commit/0a8fb8e93b4adcbfe9777f9d07c0db7344c14164))  - (goliatone)
- Update examples ([0300e40](https://github.com/goliatone/go-admin/commit/0300e409e5f81a765223da8f36860bb972b3bd38))  - (goliatone)
- Udpate deps ([16508a8](https://github.com/goliatone/go-admin/commit/16508a86c3d6dbe0654aa246e75a58a12210a926))  - (goliatone)
- Udpate test ([4c275ad](https://github.com/goliatone/go-admin/commit/4c275adfb144565de6b57d73736f92949bb7871b))  - (goliatone)
- Update guides ([acb6a0d](https://github.com/goliatone/go-admin/commit/acb6a0d28720877a14d9b8730326771ba5a22dc9))  - (goliatone)

# [0.21.1](https://github.com/goliatone/go-admin/compare/v0.21.0...v0.21.1) - (2026-01-23)

## <!-- 13 -->📦 Bumps

- Bump version: v0.21.1 ([212813c](https://github.com/goliatone/go-admin/commit/212813cd6534e20095d42f9433586821ee3528e7))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.21.0 ([18b6b53](https://github.com/goliatone/go-admin/commit/18b6b5336fad70d977be89fd82e958028bdb2df1))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([9a387cf](https://github.com/goliatone/go-admin/commit/9a387cf1e507d7b956b3e77bc3d6cf312e02294d))  - (goliatone)

# [0.21.0](https://github.com/goliatone/go-admin/compare/v0.20.0...v0.21.0) - (2026-01-23)

## <!-- 1 -->🐛 Bug Fixes

- Debug console styling ([b56f3b8](https://github.com/goliatone/go-admin/commit/b56f3b89a0b5efe792b81a615c18112df310e7a5))  - (goliatone)
- Dedup scopes ([7d9cc45](https://github.com/goliatone/go-admin/commit/7d9cc45235fc615b1353c480fc55f1c0f16547da))  - (goliatone)
- Admin activity enrich with tenant/org before logging ([9c6613b](https://github.com/goliatone/go-admin/commit/9c6613bdd35bf59b9ba38652d7432c0a6b4d547e))  - (goliatone)
- Icon for feature flags module ([d388681](https://github.com/goliatone/go-admin/commit/d388681ccb9082eab7176f9fbd54d538edbe3121))  - (goliatone)
- Nav helper handle active menu item ([45a97a4](https://github.com/goliatone/go-admin/commit/45a97a44a1c66c74f8d65b8ce1186a04238c3b78))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.21.0 ([ae57020](https://github.com/goliatone/go-admin/commit/ae5702020b35ad64b32ff3b6e5ab085fca9bb80e))  - (goliatone)

## <!-- 16 -->➕ Add

- Updated shell and console panels ([3281438](https://github.com/goliatone/go-admin/commit/3281438bd8db534354288394e2e082af964e3114))  - (goliatone)
- New assets for icon and logo with support for variants ([9935f77](https://github.com/goliatone/go-admin/commit/9935f771d3ba6a0fc2e079fb0c3ad31bbadeadef))  - (goliatone)
- Version to api ([bd7d46b](https://github.com/goliatone/go-admin/commit/bd7d46b91d9ef2efa700d1eeaee3ef2811b54ed4))  - (goliatone)
- New search box component ([dde861a](https://github.com/goliatone/go-admin/commit/dde861aa68992c24351acc4ebf94135af74a2e7a))  - (goliatone)
- Updated UI components ([d35d385](https://github.com/goliatone/go-admin/commit/d35d38521c9763f9c8ff79b1ace5eac3f9fd4a8e))  - (goliatone)
- Feature flag client ([93d9b1b](https://github.com/goliatone/go-admin/commit/93d9b1b3e78983a666e8bce0aa326ddcf2f05e2c))  - (goliatone)
- Routes with feature gates ([04cc70e](https://github.com/goliatone/go-admin/commit/04cc70e00e63c5fedb8681191eeb7427d1286d6d))  - (goliatone)
- Feature enabled use gate ([b749a37](https://github.com/goliatone/go-admin/commit/b749a37ef9bcbc58848a8795015d1dd208639ba7))  - (goliatone)
- Feature flags in auth ui ([d1a65b4](https://github.com/goliatone/go-admin/commit/d1a65b4aac364577731e1ee849938dd0b34d4a6e))  - (goliatone)
- Feature flag UI manager component ([d8c6b57](https://github.com/goliatone/go-admin/commit/d8c6b570664997f391de756a84e1975be563b9f1))  - (goliatone)
- URL resolver to boot ([3aace86](https://github.com/goliatone/go-admin/commit/3aace868cb98f4c6870cf5620b5915e147fa1c33))  - (goliatone)
- Updated style for feature flag UI ([80904e3](https://github.com/goliatone/go-admin/commit/80904e32a461f27d1da04f6af0c1b4005f3888b9))  - (goliatone)
- Feature flags UI ([2463f79](https://github.com/goliatone/go-admin/commit/2463f7936b59872db3a2684bf9f87baa3fa61a0e))  - (goliatone)
- URL manager to DI container ([49adf1a](https://github.com/goliatone/go-admin/commit/49adf1aa571271f293b3918312182d5f1b8ada10))  - (goliatone)
- URL config ([91f709d](https://github.com/goliatone/go-admin/commit/91f709d427b4ebb272222a67a64fb1934815939d))  - (goliatone)
- URL config defaults ([dfe21e2](https://github.com/goliatone/go-admin/commit/dfe21e27633ec60ff300ac57baf3ca0140a2e5ce))  - (goliatone)
- URL manager ([a0ece34](https://github.com/goliatone/go-admin/commit/a0ece34536607f57d610ddc0d478e51e79975fd0))  - (goliatone)
- Feature flags module ([c9f63a5](https://github.com/goliatone/go-admin/commit/c9f63a54438a8f8864449f8b07d35a19727f8677))  - (goliatone)
- List method to feature override ([f2a3bb2](https://github.com/goliatone/go-admin/commit/f2a3bb2965375630ce2b0c6b908d9a8035a71832))  - (goliatone)
- ROuteSpec for api/feature-flags ([f196bfb](https://github.com/goliatone/go-admin/commit/f196bfba34221c216bbc8f91d2c1aeb15a6c5b28))  - (goliatone)
- List feature flags ([f70698e](https://github.com/goliatone/go-admin/commit/f70698eae3570375a1b02f4774e9447d5566d5a7))  - (goliatone)
- Debug feature flag ([a01fc18](https://github.com/goliatone/go-admin/commit/a01fc187cb3e24b1ed66ed8a29b7dd07f3c92511))  - (goliatone)
- Support feature flag keys ([0bea097](https://github.com/goliatone/go-admin/commit/0bea09724377f08688bf65c117a03d0ddb6a06e5))  - (goliatone)
- Feature flags management ([79a01b8](https://github.com/goliatone/go-admin/commit/79a01b8693773d4f9db5addebf347790d6db278c))  - (goliatone)
- Feature flags ([5988e21](https://github.com/goliatone/go-admin/commit/5988e216010255878c400f4af91cf0b9663668f6))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.20.0 ([6be7ff8](https://github.com/goliatone/go-admin/commit/6be7ff807ec959a0c2b4ace84bb204f4b104ab2c))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([23cb13c](https://github.com/goliatone/go-admin/commit/23cb13c1e3c76c945eff31510c39f07784f1e459))  - (goliatone)
- Update guides ([ac1f6c4](https://github.com/goliatone/go-admin/commit/ac1f6c4db2676039eca7797ccdf4bbcf55c77ff1))  - (goliatone)
- Update tests ([da779d1](https://github.com/goliatone/go-admin/commit/da779d199314d2851f5d71a00662202d38032b04))  - (goliatone)

# [0.20.0](https://github.com/goliatone/go-admin/compare/v0.19.0...v0.20.0) - (2026-01-22)

## <!-- 1 -->🐛 Bug Fixes

- Error messages ([42e5b13](https://github.com/goliatone/go-admin/commit/42e5b1365aa210bf97c25a85ea5365313dc64363))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.20.0 ([d138066](https://github.com/goliatone/go-admin/commit/d138066cd8a07cd8bbbeee9434cb0cd00781f47f))  - (goliatone)

## <!-- 16 -->➕ Add

- Admin feature gate integration ([81b8902](https://github.com/goliatone/go-admin/commit/81b8902ecf3125b3821b9efa04a3882c76509b78))  - (goliatone)
- Runtime feature overrides ([18b0485](https://github.com/goliatone/go-admin/commit/18b04855fd0598fe4c4467bc0adcf04091d203f3))  - (goliatone)
- Quickstart use feature gate package ([11bc320](https://github.com/goliatone/go-admin/commit/11bc32016fd057895c30f97ec2e6939ee8fa6d77))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Admin feature gate management ([d416397](https://github.com/goliatone/go-admin/commit/d416397c8384f48f4bef4518985098ed06b187ec))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.19.0 ([944f076](https://github.com/goliatone/go-admin/commit/944f0767a9c41d351e3918aad3eb9cb2894cd1a2))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([6eaa536](https://github.com/goliatone/go-admin/commit/6eaa5362d9ad06ba9757b3bd9ee633db8b178ad8))  - (goliatone)
- Update deps ([a825ef0](https://github.com/goliatone/go-admin/commit/a825ef003d010d848b7ede946aade3170384a1a9))  - (goliatone)
- Update guides ([01a2ce5](https://github.com/goliatone/go-admin/commit/01a2ce5aac8ad5e875147c0d45cfaf6a9b6d8086))  - (goliatone)
- Update examples ([54ff2ad](https://github.com/goliatone/go-admin/commit/54ff2ad07cfd3e5e90c02b8435adb3e7447aa318))  - (goliatone)
- Udpate deps ([62345ea](https://github.com/goliatone/go-admin/commit/62345ea75bfa74b572e3bc2e76b4c4d997b2c9d2))  - (goliatone)
- Udpate example ([f64f1e5](https://github.com/goliatone/go-admin/commit/f64f1e5057167a7322cc481eb1ac9ac900960ca8))  - (goliatone)

# [0.19.0](https://github.com/goliatone/go-admin/compare/v0.18.0...v0.19.0) - (2026-01-21)

## <!-- 1 -->🐛 Bug Fixes

- User migrations use dialect migration option ([e930e31](https://github.com/goliatone/go-admin/commit/e930e31b9b711f3cc6de5d0b932cab12e8f82b7c))  - (goliatone)
- Use new migration setup from go-users ([92ebb64](https://github.com/goliatone/go-admin/commit/92ebb64a4bf3aab60daf4d1d54816e8025f6d876))  - (goliatone)
- Normalize templates ([e696194](https://github.com/goliatone/go-admin/commit/e6961947df5233328412ac99c7fc229008189386))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.19.0 ([5fea01c](https://github.com/goliatone/go-admin/commit/5fea01c4fe0c8fdd8284c64bec8e9181f03f3047))  - (goliatone)

## <!-- 16 -->➕ Add

- Quickstart migrations ([26c70be](https://github.com/goliatone/go-admin/commit/26c70beff2b64828472887ac2b54099e34f4f5e8))  - (goliatone)
- Update client style ([249fe6f](https://github.com/goliatone/go-admin/commit/249fe6ff6d1bcd975e6b7ffa61cfe4866a4a9c95))  - (goliatone)
- Templates updated for auth flow ([ee0c54e](https://github.com/goliatone/go-admin/commit/ee0c54e323dd5fc0c1d8d01465cf645035e23c95))  - (goliatone)
- Auth ui flow handler ([a886b9a](https://github.com/goliatone/go-admin/commit/a886b9a254f86cc81aea503e9aa5bda7088103df))  - (goliatone)
- Context for template in auth ([627067d](https://github.com/goliatone/go-admin/commit/627067ddef700d21dc05b5ef03fa5bad054a955c))  - (goliatone)
- Password reset confirmation path option ([71293dd](https://github.com/goliatone/go-admin/commit/71293dd6b167c8cddb95170f7f805a6c10c960b1))  - (goliatone)
- Secure link to quickstart ([3c438a0](https://github.com/goliatone/go-admin/commit/3c438a084b2e192d88c5ca1b30d86e0174f82988))  - (goliatone)
- Password reset confirm ([ae97ca6](https://github.com/goliatone/go-admin/commit/ae97ca6011f4de45fe7b5e841e9ea0d28c408933))  - (goliatone)
- Updated template setup for logo ([40c135e](https://github.com/goliatone/go-admin/commit/40c135ec5f88f97ef8f4b285fe8989adea7f7a09))  - (goliatone)
- Better theme support ([2847144](https://github.com/goliatone/go-admin/commit/2847144fbf4c3f4b69b49e11b921c20cb29c7480))  - (goliatone)
- Updated registration UI ([ebd5c0a](https://github.com/goliatone/go-admin/commit/ebd5c0a1b0a3aaf590b40e7523ff8460875f64f4))  - (goliatone)
- Udpated template setup ([98c5de9](https://github.com/goliatone/go-admin/commit/98c5de959fa3fea1cc4ea3eade957c89135c101f))  - (goliatone)
- Auth ui and onboarding setup ([04fac97](https://github.com/goliatone/go-admin/commit/04fac97dd825e328bfcac428783c1f850c8f58b5))  - (goliatone)
- Pwd reset template ([5300db9](https://github.com/goliatone/go-admin/commit/5300db91bab7a595ed40cad182c67a40ed20f9ab))  - (goliatone)
- Register template ([9f9569b](https://github.com/goliatone/go-admin/commit/9f9569b62b153b4d8e30cd5955e06736ed679686))  - (goliatone)
- Secure link example ([debe8ec](https://github.com/goliatone/go-admin/commit/debe8ec52ae96c23e28c80c878c040535ee0af7c))  - (goliatone)
- Client assets for login ([ce8c6e0](https://github.com/goliatone/go-admin/commit/ce8c6e0b513e2d2f983fdea27bda7280788e0c45))  - (goliatone)
- Optional auth ui flags ([71a8f94](https://github.com/goliatone/go-admin/commit/71a8f9437823e680c1fd2261a62701e91135eb2f))  - (goliatone)
- Refactor templates login to be able to have partials ([5c793a4](https://github.com/goliatone/go-admin/commit/5c793a42c9212803fe37256fb8c1ad0fad035e3e))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.18.0 ([2cdb250](https://github.com/goliatone/go-admin/commit/2cdb250796280c3d06d534fd4e1b2c435a58cbe5))  - (goliatone)

## <!-- 30 -->📝 Other

- PR [#3](https://github.com/goliatone/go-admin/pull/3): login tpl ([f76d985](https://github.com/goliatone/go-admin/commit/f76d9859286db2f4ff45c98b1c3633d947427a38))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([d0d8b58](https://github.com/goliatone/go-admin/commit/d0d8b581a60e0a6a5627e10a545e0664f73eb770))  - (goliatone)
- Udpate example ([709d75d](https://github.com/goliatone/go-admin/commit/709d75d3ab08e60fde4d5e40c76ab574509674e3))  - (goliatone)
- Update readme ([b499a11](https://github.com/goliatone/go-admin/commit/b499a11d566a41ed5e8947717df5c77d1e94ad44))  - (goliatone)
- Update tests ([e9618b2](https://github.com/goliatone/go-admin/commit/e9618b2c9fee51bbfd9f4145f0c193a5a2cab28e))  - (goliatone)
- Update examples ([6a7a922](https://github.com/goliatone/go-admin/commit/6a7a92242b1d7ebf3647955940e29ff85c6883a6))  - (goliatone)
- Update guides ([18e7c70](https://github.com/goliatone/go-admin/commit/18e7c70556aeabbe3f3db65134344aa40ea00f03))  - (goliatone)

# [0.18.0](https://github.com/goliatone/go-admin/compare/v0.17.0...v0.18.0) - (2026-01-18)

## <!-- 13 -->📦 Bumps

- Bump version: v0.18.0 ([1687a02](https://github.com/goliatone/go-admin/commit/1687a02b9b22e7aad03462468a2acd00892bbee6))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.17.0 ([b8262db](https://github.com/goliatone/go-admin/commit/b8262db6f1697904d37bfe0c2f92ca5dfe2961ec))  - (goliatone)

# [0.17.0](https://github.com/goliatone/go-admin/compare/v0.16.0...v0.17.0) - (2026-01-18)

## <!-- 1 -->🐛 Bug Fixes

- Fs setup ([f69b77e](https://github.com/goliatone/go-admin/commit/f69b77eafb33d9c034aea2161b87808baab944ef))  - (goliatone)
- Keep selve out of update ([642e30b](https://github.com/goliatone/go-admin/commit/642e30b1a8b83ec305713497a8a2903e1c8d3977))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.17.0 ([df08ed6](https://github.com/goliatone/go-admin/commit/df08ed693235acab4831505793e32398674566ff))  - (goliatone)

## <!-- 16 -->➕ Add

- Facade for export meta ([21c7d40](https://github.com/goliatone/go-admin/commit/21c7d403c7646442543e6f8567ba93ecb1c28307))  - (goliatone)
- Assets for admin ([cf97add](https://github.com/goliatone/go-admin/commit/cf97add80a0c5be2899d89883361ee8de282b08d))  - (goliatone)
- Debug panel collector and registry ([ea7faa2](https://github.com/goliatone/go-admin/commit/ea7faa207f32c9cddcf8917a11dc4f55853f5ae5))  - (goliatone)
- Updated debug panels ([c47969c](https://github.com/goliatone/go-admin/commit/c47969c1a8dfd4433df8c2d48823efb3b3d3db26))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Use CSS outside templates ([a29afca](https://github.com/goliatone/go-admin/commit/a29afcac348e7fe3671c066ad2959413e4547690))  - (goliatone)
- Debug client setup ([ae8e423](https://github.com/goliatone/go-admin/commit/ae8e4231eb929e8d7f9e768ad445d64336a53b89))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.16.0 ([f8c8ff1](https://github.com/goliatone/go-admin/commit/f8c8ff1e957fe351e384d187309c93f893e57664))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update docs ([80f415f](https://github.com/goliatone/go-admin/commit/80f415f47d79bef365e64782a5c2c7edbfbb3d93))  - (goliatone)
- Update examples ([66c2caf](https://github.com/goliatone/go-admin/commit/66c2caf3db0ddb937a05f4059135ee290a830651))  - (goliatone)
- Update gitignore ([ac3e5ed](https://github.com/goliatone/go-admin/commit/ac3e5ed2933ba44c93fca9cbc2dd5f9a56f245e8))  - (goliatone)
- Update deps ([bc23044](https://github.com/goliatone/go-admin/commit/bc230449489554aed43ff39248702875055a32bd))  - (goliatone)
- Update tests ([1dc5fd5](https://github.com/goliatone/go-admin/commit/1dc5fd57dec3d11b5557d7b542ee9b1cbe9b7a9d))  - (goliatone)

# [0.16.0](https://github.com/goliatone/go-admin/compare/v0.15.0...v0.16.0) - (2026-01-17)

## <!-- 1 -->🐛 Bug Fixes

- Udpate session per user ([0c82864](https://github.com/goliatone/go-admin/commit/0c8286453e600f02f8a84e36d0416fe1c4f6ba65))  - (goliatone)
- Connection and fallback for repl ([0582ae8](https://github.com/goliatone/go-admin/commit/0582ae807c3cac22ca44a64698306d13f930e33a))  - (goliatone)
- Use admin base path in normalzie debug config ([0d182e6](https://github.com/goliatone/go-admin/commit/0d182e6e7d5feec936c4bc2cd3c10503ff1cba75))  - (goliatone)
- Exclude floating debug button on debug page ([c8c77eb](https://github.com/goliatone/go-admin/commit/c8c77ebed73f1c0a75df436dc0adfde45a93c9a7))  - (goliatone)
- Expose debug to facade ([63d2ce3](https://github.com/goliatone/go-admin/commit/63d2ce336afe104abb85b47d06ead434876f5c15))  - (goliatone)
- Debug layout ([045f8d7](https://github.com/goliatone/go-admin/commit/045f8d7435d5f3ed79e400bd3c3e1456ed3ef8aa))  - (goliatone)
- Debug console copy to clipboard buttons ([5358572](https://github.com/goliatone/go-admin/commit/5358572ac558480878956994c5ad04d52b287388))  - (goliatone)
- Expose debug panels ([6927dda](https://github.com/goliatone/go-admin/commit/6927dda17c616602d41d68f3790a4436e57298e3))  - (goliatone)
- Use actual go-command interface ([c135ff0](https://github.com/goliatone/go-admin/commit/c135ff0a71981303180b7279bec1252f52926800))  - (goliatone)
- Typeo ([61d787d](https://github.com/goliatone/go-admin/commit/61d787d959d518dd1d05929ade5cf277d81a3d44))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.16.0 ([aabb177](https://github.com/goliatone/go-admin/commit/aabb17733b0e90d38be5882df3673ea45487d314))  - (goliatone)

## <!-- 16 -->➕ Add

- Json path search for content ([322ea4f](https://github.com/goliatone/go-admin/commit/322ea4fdddc6656f1fc24655f6b3a647d53d361c))  - (goliatone)
- Debug token filtering ([fee10e2](https://github.com/goliatone/go-admin/commit/fee10e2d91ea04432338d294e68b14d4ed333439))  - (goliatone)
- Debug base path ([5b39520](https://github.com/goliatone/go-admin/commit/5b395204e6cf50ba4dc9443d6919d7c1fa90dd7a))  - (goliatone)
- Updated placeholers ([6b831a4](https://github.com/goliatone/go-admin/commit/6b831a47be65bc333203cee8a814c9e188eb0d77))  - (goliatone)
- Hide content header ([d0be014](https://github.com/goliatone/go-admin/commit/d0be014c6726015c3a8746e1ba1313d334183120))  - (goliatone)
- Udpated debug panels ([d0e0600](https://github.com/goliatone/go-admin/commit/d0e0600f53d3c76a87d9956465b0fd820324907b))  - (goliatone)
- Debug integrations ([962c91d](https://github.com/goliatone/go-admin/commit/962c91d47530152ef661d0b6e6ff0f014a51ac31))  - (goliatone)
- Optional header rendering ([408dd89](https://github.com/goliatone/go-admin/commit/408dd89c4c422f47077b0ab4e1c99aaf015b55ae))  - (goliatone)
- Update debug toolbar ([fb540b0](https://github.com/goliatone/go-admin/commit/fb540b07b83ebd0a36a04e6af415d4e69daf2812))  - (goliatone)
- Update debug assets ([5afe449](https://github.com/goliatone/go-admin/commit/5afe449c2b8cf566447aaf143d4a3e8bfb232505))  - (goliatone)
- Demo info ([77f5584](https://github.com/goliatone/go-admin/commit/77f5584f445ce8c7f6c118efc4a3c931992d2f13))  - (goliatone)
- Debug view ([b270feb](https://github.com/goliatone/go-admin/commit/b270feba31140f556d2b406f440d75ff28695bfd))  - (goliatone)
- Debug template to respect layout options ([f08b539](https://github.com/goliatone/go-admin/commit/f08b53954459b1fc59250a03efecbe6799f9af74))  - (goliatone)
- Debug page should be optionally rendered in site ([08a0a14](https://github.com/goliatone/go-admin/commit/08a0a146f9f26a71061e71bf22fbece932251255))  - (goliatone)
- Debug index admin template ([549a0d7](https://github.com/goliatone/go-admin/commit/549a0d752bb4c0ffb42e46f1a6efdd6eeeccb259))  - (goliatone)
- Updated debug setup ([b7d3091](https://github.com/goliatone/go-admin/commit/b7d30913af926daf11b180288558ef8008d58c7d))  - (goliatone)
- Examples shown ([d5f7ee5](https://github.com/goliatone/go-admin/commit/d5f7ee5f9ee1cf569345573047ec94d3b813bfe6))  - (goliatone)
- Update toolbars and debugger ([bbe3668](https://github.com/goliatone/go-admin/commit/bbe3668394b5d1c1198f402eb11bcff480f2aaf3))  - (goliatone)
- Debug panels to facade ([d5cdef8](https://github.com/goliatone/go-admin/commit/d5cdef8f85a13847e3944753de30e97673ecff85))  - (goliatone)
- Repl update ([78d8e93](https://github.com/goliatone/go-admin/commit/78d8e9315bbbcbfacfb19feec33297dfe6e8bcb2))  - (goliatone)
- Dist output ([ae1642b](https://github.com/goliatone/go-admin/commit/ae1642b7e6fac135e0ff9805f9d6af86d2d63c1e))  - (goliatone)
- Styling ([0ef2b87](https://github.com/goliatone/go-admin/commit/0ef2b87eaa9166f7cb0cd6d571dfd79ee996f608))  - (goliatone)
- Highlighting support ([117510a](https://github.com/goliatone/go-admin/commit/117510ab547fb5c6fc106b30d4c544ff61a99636))  - (goliatone)
- RPLE catalog ([00d2db5](https://github.com/goliatone/go-admin/commit/00d2db5671b22444a7581079168d62bf9698ea46))  - (goliatone)
- Repl debug commands ([3f0527a](https://github.com/goliatone/go-admin/commit/3f0527a48312e17026f90538256af54929ce742f))  - (goliatone)
- Repl panels to debug ([9491729](https://github.com/goliatone/go-admin/commit/9491729f8551865fffc8e3124348b37d2d96794e))  - (goliatone)
- Debug repl implementation ([c61b33f](https://github.com/goliatone/go-admin/commit/c61b33fb5a332901a0e3f7a5619513cd498d998b))  - (goliatone)
- Register REPL ws routes ([e0c7992](https://github.com/goliatone/go-admin/commit/e0c7992b07e2ca831bddc28bce39920420b60f7a))  - (goliatone)
- Repl debug app ([fd6160e](https://github.com/goliatone/go-admin/commit/fd6160e3626b8c6e8f0bf86d5ee6d46493a24ad3))  - (goliatone)
- Debug REPL setup ([c27fc84](https://github.com/goliatone/go-admin/commit/c27fc84ab1d635314dcb136fb3813a0dd667039e))  - (goliatone)
- REPL module registration ([2051bc2](https://github.com/goliatone/go-admin/commit/2051bc2611f9950ee22331f6d1e49f4dd82a140c))  - (goliatone)
- Dynamic registration of debug panels ([f1a3991](https://github.com/goliatone/go-admin/commit/f1a399108a99fb0bb7fe5e2ee091f9fdb6a280d8))  - (goliatone)
- Debug page UI ([cc277dc](https://github.com/goliatone/go-admin/commit/cc277dc355d47788697707f3b18a376c220917ae))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Expose const for types ([043bb53](https://github.com/goliatone/go-admin/commit/043bb5334decdc3192a2a5023252112ca4c9bb8b))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.15.0 ([832ffc9](https://github.com/goliatone/go-admin/commit/832ffc977cd354531af710af638d8f427e23ce94))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([cd987cf](https://github.com/goliatone/go-admin/commit/cd987cf8277407b5b18db6845a22567c1e3da867))  - (goliatone)
- Update format ([db74d71](https://github.com/goliatone/go-admin/commit/db74d715684fcf5a32bbc821ee5170e03909b7ed))  - (goliatone)
- Clean up templates ([0d33a34](https://github.com/goliatone/go-admin/commit/0d33a342b8a9839b53b1aeae17a7f034ea28de89))  - (goliatone)
- Update depsc ([c65235c](https://github.com/goliatone/go-admin/commit/c65235c77ed9beb49c84f6ae731b667d5ce57a5e))  - (goliatone)
- Update deps ([e935dc5](https://github.com/goliatone/go-admin/commit/e935dc5a802cc20ada127a4c62e0b13b706d9db2))  - (goliatone)
- Update tests ([f28dacd](https://github.com/goliatone/go-admin/commit/f28dacd22eb830c6e268407ffb9d628518fea525))  - (goliatone)

# [0.15.0](https://github.com/goliatone/go-admin/compare/v0.14.0...v0.15.0) - (2026-01-16)

## <!-- 13 -->📦 Bumps

- Bump version: v0.15.0 ([8cad8a8](https://github.com/goliatone/go-admin/commit/8cad8a8252bf5afe14842a9c2f967574b0140512))  - (goliatone)

## <!-- 16 -->➕ Add

- Expose debug query hook provider ([99fbead](https://github.com/goliatone/go-admin/commit/99fbead005161497026a69f745c7a134c6846a4e))  - (goliatone)
- Debug quickstart module ([5eb58d7](https://github.com/goliatone/go-admin/commit/5eb58d79bedca342a4ec08b06935b582c44b9c8f))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.14.0 ([8db5e93](https://github.com/goliatone/go-admin/commit/8db5e93977fcdb5a9139769ec7de8a9d43295429))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([fa35b9f](https://github.com/goliatone/go-admin/commit/fa35b9f3ba2751687bf8fad2546b9cadf7c4b0a8))  - (goliatone)
- Update deps ([0b5afe0](https://github.com/goliatone/go-admin/commit/0b5afe0aa5a610adbca97d1c34cfdeda9ed0501a))  - (goliatone)
- Udpate readme ([4b88ca7](https://github.com/goliatone/go-admin/commit/4b88ca74a46e176b8cdec8f5a240dab9a339e184))  - (goliatone)
- Update tests ([762b5d9](https://github.com/goliatone/go-admin/commit/762b5d91474aed90f8f838c4efb098b011ff7b8f))  - (goliatone)

# [0.14.0](https://github.com/goliatone/go-admin/compare/v0.13.0...v0.14.0) - (2026-01-15)

## <!-- 1 -->🐛 Bug Fixes

- Include theme context with capture view context ([01126e3](https://github.com/goliatone/go-admin/commit/01126e372f57295c6a390317fc72dbb24775ce89))  - (goliatone)
- Empty activity slice ([0659b96](https://github.com/goliatone/go-admin/commit/0659b9662534d90ccd13aa0b796129c939a9f1fc))  - (goliatone)
- Debug toolbar icon alignment ([2c0b787](https://github.com/goliatone/go-admin/commit/2c0b787695e6c1a9237aebec7bcface891e1f50c))  - (goliatone)
- Root asset check ([0a760b2](https://github.com/goliatone/go-admin/commit/0a760b2741f099a1a20b2bda286d932db85492d9))  - (goliatone)
- Remove register providers ([c51a70c](https://github.com/goliatone/go-admin/commit/c51a70c54017a412b2ca09e6cf2a479333925a75))  - (goliatone)
- Use proper func syntax ([54d2678](https://github.com/goliatone/go-admin/commit/54d26780750336f390fffd85df3c9e7db20f6121))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.14.0 ([03a14a3](https://github.com/goliatone/go-admin/commit/03a14a31100c6399c692e99aaff6e041177da80d))  - (goliatone)

## <!-- 16 -->➕ Add

- Query hook for SQL for debug panel ([ff9a231](https://github.com/goliatone/go-admin/commit/ff9a231285a384914ed4a015d861f459b4fc39b0))  - (goliatone)
- Activity permission for def ([564fafc](https://github.com/goliatone/go-admin/commit/564fafc9aed605130b09b08a53d8bf6f69a6550d))  - (goliatone)
- Wire activity in boot ([86c0fb5](https://github.com/goliatone/go-admin/commit/86c0fb54ffd8f8650caa676b7f08a911082fef83))  - (goliatone)
- Integrate activity feed ([58d3f18](https://github.com/goliatone/go-admin/commit/58d3f180fc9851d71657d5191f09c22a6b6552d1))  - (goliatone)
- Activity key ([e254a5e](https://github.com/goliatone/go-admin/commit/e254a5ec4f202ad6e73223bab246e8046e896d02))  - (goliatone)
- Activity permision attr to config ([6ccb88f](https://github.com/goliatone/go-admin/commit/6ccb88f5aeec6651d123256b5a50a1c6731028c4))  - (goliatone)
- Refs to activity types ([1230111](https://github.com/goliatone/go-admin/commit/1230111b25cba383c8fb23dca18e0fe1406ec3b6))  - (goliatone)
- Tracking job activity ([60ff9a0](https://github.com/goliatone/go-admin/commit/60ff9a070b37491918e34acad45d3db0faf162d0))  - (goliatone)
- Register activity module ([ac4299a](https://github.com/goliatone/go-admin/commit/ac4299a1fe9f3e8ea0b8a39061eb70103c2572d8))  - (goliatone)
- Toolbar fab setup ([5e9b299](https://github.com/goliatone/go-admin/commit/5e9b29954b62055d273d95832d20f2b193cca47c))  - (goliatone)
- Activity UI layout ([81ef3f0](https://github.com/goliatone/go-admin/commit/81ef3f003ad7c093840ae10ae936833978bf0ef1))  - (goliatone)
- Toolbar setup ([1fbcdd5](https://github.com/goliatone/go-admin/commit/1fbcdd5b85f17929381a940ce46c25f16c84e154))  - (goliatone)
- Toolbar alignment ([6debe77](https://github.com/goliatone/go-admin/commit/6debe77f5536bd381062ff72cafc594667e32b5c))  - (goliatone)
- Updated debug toolbar ([fb1cc5d](https://github.com/goliatone/go-admin/commit/fb1cc5d9f2c1f5e14b9b1cb2fccef765b1b10b14))  - (goliatone)
- Activity routes ([4c96f01](https://github.com/goliatone/go-admin/commit/4c96f0197267959c25722433b254e8fb9c915ae5))  - (goliatone)
- Activity resource ([aa79dc5](https://github.com/goliatone/go-admin/commit/aa79dc5015c8eab3d136c1ca6fadf803940153f5))  - (goliatone)
- Activity module ([44d20ea](https://github.com/goliatone/go-admin/commit/44d20ead8ebc94448ada984f5abf8e21c3b9b3ac))  - (goliatone)
- Activity read ([1725179](https://github.com/goliatone/go-admin/commit/1725179c3f89f694be5a62ab3fe35b636e31e5ed))  - (goliatone)
- Toolbar debug floating button ([b2e9e9a](https://github.com/goliatone/go-admin/commit/b2e9e9afaf8f98c5be2e69bd661c3bd171996505))  - (goliatone)
- Check for router type ([49747b2](https://github.com/goliatone/go-admin/commit/49747b20e2087f47033462764b38d8b6bd0feadf))  - (goliatone)
- New style for debug ([d279300](https://github.com/goliatone/go-admin/commit/d279300680a6b492800b0382c8736a957ecfc362))  - (goliatone)
- Register fallback ([a79921f](https://github.com/goliatone/go-admin/commit/a79921f4de4f1355f4be785bcaf34b19323e6434))  - (goliatone)
- Inject vars to template for toolbar ([7919c0e](https://github.com/goliatone/go-admin/commit/7919c0e4d52f47c2a6f5e7c88946168895d84b17))  - (goliatone)
- Expose debug panels ([9d18fa5](https://github.com/goliatone/go-admin/commit/9d18fa57d8a11a77e0feff942b09075d202d00f6))  - (goliatone)
- Toolbar styling ([4661eab](https://github.com/goliatone/go-admin/commit/4661eab5bfd2c0bda7ceadfbe657b65d91e5c0e4))  - (goliatone)
- Toolbar debug ([38a0b42](https://github.com/goliatone/go-admin/commit/38a0b42dd170d6c48990514718a5187a8413073f))  - (goliatone)
- Debug toolbar assets ([7d050be](https://github.com/goliatone/go-admin/commit/7d050bed796023a08aebcd706f8ef5374d391c01))  - (goliatone)
- Debug toolbar ([377bd62](https://github.com/goliatone/go-admin/commit/377bd62e9fb25a0167d1e55b9d8ba4bf3b27020b))  - (goliatone)
- View perms for debug ([7ee6b2f](https://github.com/goliatone/go-admin/commit/7ee6b2f21f36769943b3993529507e25976e2cf5))  - (goliatone)
- Debug collector patch for slog ([2f13e26](https://github.com/goliatone/go-admin/commit/2f13e2628d7dd7fc99b60e8e260c54ccaa76be99))  - (goliatone)
- Debug masker integration ([3fd268c](https://github.com/goliatone/go-admin/commit/3fd268c8bbea7863ca71a212463d5bbc1121508e))  - (goliatone)
- Admin expose router ([10ba9a0](https://github.com/goliatone/go-admin/commit/10ba9a0151b6fe99c161314fb5e01e315897e69e))  - (goliatone)
- Include router in module context ([126d265](https://github.com/goliatone/go-admin/commit/126d265c7c1b50e91b046fbefcf085260125b839))  - (goliatone)
- Quickstart resolve assets dir ([cfe4484](https://github.com/goliatone/go-admin/commit/cfe4484e28d8410f27f0372db14661af30eaeb75))  - (goliatone)
- AdminRouter exposed in ModuleContext ([2d22163](https://github.com/goliatone/go-admin/commit/2d22163090a45dd6398442ef9ae4f1ee2cd112a5))  - (goliatone)
- Debug client assets ([baf4f37](https://github.com/goliatone/go-admin/commit/baf4f37d5445661673c7afdbc41beeae860dee4c))  - (goliatone)
- Debug module panel def ([2f26b51](https://github.com/goliatone/go-admin/commit/2f26b516796732eaa4f172fadbf2f3ade2be79c8))  - (goliatone)
- Admin debug collector ([06aa8bd](https://github.com/goliatone/go-admin/commit/06aa8bd41166cef2667732c86319237d2e12dea8))  - (goliatone)
- Register paths ([daad985](https://github.com/goliatone/go-admin/commit/daad98550405814934599ad17e56e72fa2bd1e61))  - (goliatone)
- Settings adapter ([63d24f0](https://github.com/goliatone/go-admin/commit/63d24f0709f180062a6a2dd4218ebd52c91e658a))  - (goliatone)
- Expose facade module ([9a2c180](https://github.com/goliatone/go-admin/commit/9a2c180a7cce8d689e5fb688e7dc59e01254127f))  - (goliatone)
- Register debug ([22c90e8](https://github.com/goliatone/go-admin/commit/22c90e8ae9a4efc2edbbf33d62f86bbe7ec65837))  - (goliatone)
- Config setup for debug ([ec8a3de](https://github.com/goliatone/go-admin/commit/ec8a3decb801369f71ab7b59b3986f5609f36978))  - (goliatone)
- Cache for settings ([3011505](https://github.com/goliatone/go-admin/commit/3011505c8387caab210bba5401ac61f03c535509))  - (goliatone)
- Ring buffer for debug ([a4e9088](https://github.com/goliatone/go-admin/commit/a4e90882cd4327477f4ba8079bcdae361239c550))  - (goliatone)
- Debug module ([15824b9](https://github.com/goliatone/go-admin/commit/15824b90c425e60d0d9c7c35ee97377577bfda79))  - (goliatone)
- Debug client ([c1a5a7d](https://github.com/goliatone/go-admin/commit/c1a5a7d90c265d03b1f7f452af17b03777fb5cb6))  - (goliatone)
- Debug panel ([a74fbb1](https://github.com/goliatone/go-admin/commit/a74fbb18386791b3b3e838c7daca3fd08756aada))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.13.0 ([d725b99](https://github.com/goliatone/go-admin/commit/d725b99a5847d02a0dd1fcf9f8bad75a714fe99b))  - (goliatone)

## <!-- 30 -->📝 Other

- PR [#2](https://github.com/goliatone/go-admin/pull/2): activity feat ([770b85c](https://github.com/goliatone/go-admin/commit/770b85c10a7950386eb68c94324e204a949d4d66))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([2d5662f](https://github.com/goliatone/go-admin/commit/2d5662fa64a626444e78e4a39192eb8948346232))  - (goliatone)
- Update changelog ([1e26264](https://github.com/goliatone/go-admin/commit/1e26264ace936d3a8bc700a13097563772cb5d0e))  - (goliatone)
- Update readme ([52be0cc](https://github.com/goliatone/go-admin/commit/52be0cc01268aec7e80a43914e98e35a80ff5011))  - (goliatone)
- Update tests ([470a98b](https://github.com/goliatone/go-admin/commit/470a98b9a3e6c92c2114377d79f22cff77c7fcb2))  - (goliatone)
- Update deps ([eb6737b](https://github.com/goliatone/go-admin/commit/eb6737b90cbac7a944a04812a6eb7f3e87ce3ce1))  - (goliatone)
- Update dev:serve task ([6f62315](https://github.com/goliatone/go-admin/commit/6f623154bcf4173819630116fd70ab6f65c8ae06))  - (goliatone)

# [0.13.0](https://github.com/goliatone/go-admin/compare/v0.12.0...v0.13.0) - (2026-01-14)

## <!-- 1 -->🐛 Bug Fixes

- Datatable should clamp results to max/total ([c232a64](https://github.com/goliatone/go-admin/commit/c232a64d484736ce1eff06052814f69ab21ef1c0))  - (goliatone)
- Template use singualr label ([6f2d7a6](https://github.com/goliatone/go-admin/commit/6f2d7a67083ef39321721a4022be922225af8682))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.13.0 ([e808bea](https://github.com/goliatone/go-admin/commit/e808beaa1f069ea40f180a57498bffa7952f44e2))  - (goliatone)

## <!-- 16 -->➕ Add

- Mock data ([1a209f6](https://github.com/goliatone/go-admin/commit/1a209f6561a241adfb35f591fdceca9af4c8f572))  - (goliatone)
- Quickstart UI routes ([732722f](https://github.com/goliatone/go-admin/commit/732722f93ccc1cd57a06634b501cdd67be22ab71))  - (goliatone)
- Quickstart theme view ([a72bafa](https://github.com/goliatone/go-admin/commit/a72bafa4fd2fbfa882dd6a4a3fc4441fda657f45))  - (goliatone)
- Quickstart export renderers ([f406da1](https://github.com/goliatone/go-admin/commit/f406da147f86274e3f87350bdec5202688e8ba50))  - (goliatone)
- Auth UI to quickstart ([b2b157f](https://github.com/goliatone/go-admin/commit/b2b157fb227839f4016f53e7fa3c4a928d22d77d))  - (goliatone)
- Asset probe for quickstart ([fe9b5f3](https://github.com/goliatone/go-admin/commit/fe9b5f36c28475b778267648a6a35f6d000ca6fa))  - (goliatone)
- Proper labels for items ([8af47b5](https://github.com/goliatone/go-admin/commit/8af47b5a80d2bc800db58bf0b1aef1b56b3e28cd))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.12.0 ([284124b](https://github.com/goliatone/go-admin/commit/284124b420e1ef8bff605b2b367f521de3e10ec1))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([8f5cb4d](https://github.com/goliatone/go-admin/commit/8f5cb4d667b1257fe223d85538c337912ae16d5b))  - (goliatone)
- Update readme ([a12e0f4](https://github.com/goliatone/go-admin/commit/a12e0f4264dfc38048e6ae6b3b232c2c7968327b))  - (goliatone)
- Update examples ([547bf30](https://github.com/goliatone/go-admin/commit/547bf30df2c1d6209488996306967a5b0ae743ee))  - (goliatone)

# [0.12.0](https://github.com/goliatone/go-admin/compare/v0.11.0...v0.12.0) - (2026-01-13)

## <!-- 1 -->🐛 Bug Fixes

- Tie quickstart to go-admin version ([432df56](https://github.com/goliatone/go-admin/commit/432df56f41fc2d0262ac4b6cdaea29f60679ecfe))  - (goliatone)
- Add new interface ([5e8d15f](https://github.com/goliatone/go-admin/commit/5e8d15fb6b3a2d95ea7a6f60caf325a6c60b4a8c))  - (goliatone)
- Include body in binding ([ecda3cc](https://github.com/goliatone/go-admin/commit/ecda3cc8e0722c1537bdc6d7d015d6acb5879ed4))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.12.0 ([4034fe7](https://github.com/goliatone/go-admin/commit/4034fe72a35c935a5ca8d23e1a3cad602e0ef958))  - (goliatone)

## <!-- 16 -->➕ Add

- View engine ([fd105e0](https://github.com/goliatone/go-admin/commit/fd105e0f55aa263f22621583a7cfd1409ac7a23f))  - (goliatone)
- Quickstart template funcs ([b969f14](https://github.com/goliatone/go-admin/commit/b969f148ec5d71d2d8cb8ce7452ae8c9fd062db1))  - (goliatone)
- Expose admin types ([75b4404](https://github.com/goliatone/go-admin/commit/75b44041f691c99bc2a631e70442cc337a2f86c6))  - (goliatone)
- Command bus udpate ([9d54bf2](https://github.com/goliatone/go-admin/commit/9d54bf24aec9fe1207b1a179c47a37e1a8325e1c))  - (goliatone)
- New command registraion flow ([2bd6904](https://github.com/goliatone/go-admin/commit/2bd6904563a69910a47559b150824fc846c37568))  - (goliatone)
- New command bus ([e0148cd](https://github.com/goliatone/go-admin/commit/e0148cd4796d93fe1e24a71e4e1f351324b49027))  - (goliatone)
- Register commands ([6a0c351](https://github.com/goliatone/go-admin/commit/6a0c35183aa69062d7c3c128a61ec2ca5171a47e))  - (goliatone)
- Task to publish quickstart ([b54e24a](https://github.com/goliatone/go-admin/commit/b54e24ae5eb2cf2a56c8b5a87858dd7605c327e0))  - (goliatone)
- CLI helpers ([2f4d126](https://github.com/goliatone/go-admin/commit/2f4d1268aff8188e070b92156c714566df22251a))  - (goliatone)
- Cli config ([ded2aa6](https://github.com/goliatone/go-admin/commit/ded2aa67178d8ebe20d7d03a8d847c5a73d69363))  - (goliatone)
- Command messages ([9ff75b4](https://github.com/goliatone/go-admin/commit/9ff75b4541bdb45533a9ec97bc6a7a0837e5435f))  - (goliatone)
- Command bus ([35aa0d8](https://github.com/goliatone/go-admin/commit/35aa0d8ded5b5df513711dc751b7f638614aac49))  - (goliatone)
- Base ([00ea34a](https://github.com/goliatone/go-admin/commit/00ea34a4c796abda3fd2c19b9e9be1a0db2e7443))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Command implementation ([084202c](https://github.com/goliatone/go-admin/commit/084202c870e5efb697b636be0ba53a5262e54fc1))  - (goliatone)
- Update command facades ([fee1534](https://github.com/goliatone/go-admin/commit/fee15340deced6b0e02b6bed614332d718a5b123))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.11.0 ([6071942](https://github.com/goliatone/go-admin/commit/60719429173c5617d1fc12afb103f3670ba581c8))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate example ([ca679ad](https://github.com/goliatone/go-admin/commit/ca679adce1c01a17438c859cc121e137ec2cb7be))  - (goliatone)
- Update deps ([04f996a](https://github.com/goliatone/go-admin/commit/04f996aa6c015a2069a2595e12b447770fdc5a38))  - (goliatone)
- Update readme ([1e325c7](https://github.com/goliatone/go-admin/commit/1e325c7c531186683e376b487f1ede2551ea06f3))  - (goliatone)
- Update tests ([5acb046](https://github.com/goliatone/go-admin/commit/5acb046a52e23f2a0af10033d59030e54d4808d5))  - (goliatone)
- Update examples ([6231d4a](https://github.com/goliatone/go-admin/commit/6231d4a8ff1d3d8d9757eb0afed1d06bbe92e052))  - (goliatone)
- Udpate deps ([27b29d1](https://github.com/goliatone/go-admin/commit/27b29d16da4a2526d1956b98658a5655ad18fe09))  - (goliatone)

# [0.11.0](https://github.com/goliatone/go-admin/compare/v0.10.0...v0.11.0) - (2026-01-13)

## <!-- 1 -->🐛 Bug Fixes

- Format ([f6e35e2](https://github.com/goliatone/go-admin/commit/f6e35e2c5641357c93b126300c142823275e12e9))  - (goliatone)
- Testing prefs ([24bdf0a](https://github.com/goliatone/go-admin/commit/24bdf0a6b562824d4524498ca47743b670fdb377))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.11.0 ([8007f8a](https://github.com/goliatone/go-admin/commit/8007f8a2521ec0d0bb814a096e8e31de71c3fce3))  - (goliatone)

## <!-- 16 -->➕ Add

- Use go-errors for prefs ([4d7b1f3](https://github.com/goliatone/go-admin/commit/4d7b1f3a3ca18dfc6ad6da2bb72dfa26045d5c40))  - (goliatone)
- Config defaults for admin prefs ([de8a97e](https://github.com/goliatone/go-admin/commit/de8a97e69532e0f21704ac3081fac485ef5a4c5e))  - (goliatone)
- Take tenant and org ID into account in contxt ([dfe77c2](https://github.com/goliatone/go-admin/commit/dfe77c23cbf48b9292ae069b9df70b15218dc5dd))  - (goliatone)
- Expose preference types ([c26f57e](https://github.com/goliatone/go-admin/commit/c26f57e1ae71960e49da1379a006bce848fed7d6))  - (goliatone)
- Upsert and delete actions to user prefs ([7a151ce](https://github.com/goliatone/go-admin/commit/7a151ce8cdf908b4d53a176b1af15c54ae8119c8))  - (goliatone)
- Preferences query and scope ([9d5e117](https://github.com/goliatone/go-admin/commit/9d5e1174ff0be37a7d8a8ce256407648a649e203))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.10.0 ([5e88824](https://github.com/goliatone/go-admin/commit/5e888240b046a7c7c6dd4e063d3c916c255943e6))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([ae1537e](https://github.com/goliatone/go-admin/commit/ae1537e3de1a567bdc81730054936d39f2d095b1))  - (goliatone)
- Update readme ([0614dfb](https://github.com/goliatone/go-admin/commit/0614dfb868f152b5a75ed4ee1c8e89e3dc30e2cb))  - (goliatone)
- Update tests ([47fd0e8](https://github.com/goliatone/go-admin/commit/47fd0e8c9d6a9f9ab5acfa346317a39401b9d0f2))  - (goliatone)

# [0.10.0](https://github.com/goliatone/go-admin/compare/v0.9.0...v0.10.0) - (2026-01-12)

## <!-- 1 -->🐛 Bug Fixes

- Test for routes ([e2ad961](https://github.com/goliatone/go-admin/commit/e2ad961a0a0467bea1d0c04bec721a6c0823bb8e))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.10.0 ([9cc7ae6](https://github.com/goliatone/go-admin/commit/9cc7ae6834710cce65bc38103f6f78741dd3e18c))  - (goliatone)

## <!-- 16 -->➕ Add

- Clear method to user preferences ([545f9b7](https://github.com/goliatone/go-admin/commit/545f9b74bc38b8aeafaad6ef8ca75d6709b61fdf))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.9.0 ([bb014e7](https://github.com/goliatone/go-admin/commit/bb014e74f1d82cca213824856400021031163271))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update style ([ad42b8a](https://github.com/goliatone/go-admin/commit/ad42b8a6939ac13dc67eeda838c81ced1d298911))  - (goliatone)
- Update deps ([c711a3d](https://github.com/goliatone/go-admin/commit/c711a3def10d644475444788170256096d44163c))  - (goliatone)
- Update tests ([e4ea429](https://github.com/goliatone/go-admin/commit/e4ea429be9e9ccb68b64841b196bea446b3731c2))  - (goliatone)
- Update readme ([1a81250](https://github.com/goliatone/go-admin/commit/1a812501eee6d4a1f50b1fffface4d25ab39552c))  - (goliatone)

# [0.9.0](https://github.com/goliatone/go-admin/compare/v0.8.0...v0.9.0) - (2026-01-12)

## <!-- 13 -->📦 Bumps

- Bump version: v0.9.0 ([10efc69](https://github.com/goliatone/go-admin/commit/10efc69620a86d19fe4b56d45d201dfaf8855142))  - (goliatone)

## <!-- 16 -->➕ Add

- With preferences setup ([5909701](https://github.com/goliatone/go-admin/commit/59097013152823a8f0c0f2589ed108edcceab039))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.8.0 ([d6aa13f](https://github.com/goliatone/go-admin/commit/d6aa13ffb74cfef22fed2796a1c27ac0bb9e56a3))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([52f4465](https://github.com/goliatone/go-admin/commit/52f44651f6dff01a428887b622e3f5117bf36223))  - (goliatone)

# [0.8.0](https://github.com/goliatone/go-admin/compare/v0.7.0...v0.8.0) - (2026-01-10)

## <!-- 13 -->📦 Bumps

- Bump version: v0.8.0 ([61250b7](https://github.com/goliatone/go-admin/commit/61250b79d9a962a6c805494a012bcd96ebba7206))  - (goliatone)

## <!-- 16 -->➕ Add

- Better error info ([e3b9e16](https://github.com/goliatone/go-admin/commit/e3b9e162078e102b91993cc2a3a870a4ab5895cb))  - (goliatone)
- Acl to panel ([005c558](https://github.com/goliatone/go-admin/commit/005c558b0a0f19a2383219b570faeabf857af7f3))  - (goliatone)
- Form generator confit ([baf5b90](https://github.com/goliatone/go-admin/commit/baf5b9058a686c170e0f1b95d8867b9f3bb60585))  - (goliatone)
- Preferences setup ([25b6998](https://github.com/goliatone/go-admin/commit/25b6998c3eec95f71a4fe69991db8e1881054d54))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.7.0 ([ca5e55d](https://github.com/goliatone/go-admin/commit/ca5e55dc4e437e623408ede668acc881c507659d))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([458bf30](https://github.com/goliatone/go-admin/commit/458bf30fd100a536b83e635ece882a6de2a9778f))  - (goliatone)
- Update readme ([06ead95](https://github.com/goliatone/go-admin/commit/06ead95634977ab7a74d6d5e0051ac3f7871951f))  - (goliatone)
- Update deps ([f165ab8](https://github.com/goliatone/go-admin/commit/f165ab8b67e3819f72d429b06a4c94c23f794b7b))  - (goliatone)

# [0.7.0](https://github.com/goliatone/go-admin/compare/v0.6.0...v0.7.0) - (2026-01-09)

## <!-- 1 -->🐛 Bug Fixes

- Typeo ([7b04a27](https://github.com/goliatone/go-admin/commit/7b04a27175ddeadfca7f1cdb1cb19a721086a981))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.7.0 ([46d5fc3](https://github.com/goliatone/go-admin/commit/46d5fc3dbda97903dfea5fdb61cbaabd29317941))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.6.0 ([65975f3](https://github.com/goliatone/go-admin/commit/65975f307e782ad8876c1b1b2b04420253c21e58))  - (goliatone)

# [0.6.0](https://github.com/goliatone/go-admin/compare/v0.5.0...v0.6.0) - (2026-01-09)

## <!-- 13 -->📦 Bumps

- Bump version: v0.6.0 ([0acff6d](https://github.com/goliatone/go-admin/commit/0acff6d1b4e2857eb00c50fa85029b6f680edda4))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.5.0 ([47dc28f](https://github.com/goliatone/go-admin/commit/47dc28fa1e37b64fcb14709849c30cb29d80b694))  - (goliatone)

# [0.5.0](https://github.com/goliatone/go-admin/compare/v0.4.0...v0.5.0) - (2026-01-09)

## <!-- 13 -->📦 Bumps

- Bump version: v0.5.0 ([9ef8aa4](https://github.com/goliatone/go-admin/commit/9ef8aa4f49eb84b8b78a762449e1bdfd65f60ec7))  - (goliatone)

## <!-- 16 -->➕ Add

- Form generator incorporate optional configuration ([cb0f24e](https://github.com/goliatone/go-admin/commit/cb0f24e45ac1f4b9f917fe0ec09520d4c82e1f69))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.4.0 ([8d82a17](https://github.com/goliatone/go-admin/commit/8d82a17861e8b9032b7eaaad9775cf0e513693ab))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update docs ([bf8de80](https://github.com/goliatone/go-admin/commit/bf8de800d43d2ae3072eb3f85a2002eda0852398))  - (goliatone)
- Update tests ([1742f70](https://github.com/goliatone/go-admin/commit/1742f70018356eb1d1236981739fa4da52fff053))  - (goliatone)
- Update deps ([394935c](https://github.com/goliatone/go-admin/commit/394935ce0ca19f7bc53a98d416e9bbb0ec5372ef))  - (goliatone)

# [0.4.0](https://github.com/goliatone/go-admin/compare/v0.3.0...v0.4.0) - (2026-01-08)

## <!-- 1 -->🐛 Bug Fixes

- Facade for area def ([f95e8f9](https://github.com/goliatone/go-admin/commit/f95e8f9d7e64069908dc2971e0493ef291b5e8a3))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.4.0 ([2cac2bf](https://github.com/goliatone/go-admin/commit/2cac2bf43c773dab732bb46ab2de8bd023151256))  - (goliatone)

## <!-- 16 -->➕ Add

- Tab rendering ([947b7fd](https://github.com/goliatone/go-admin/commit/947b7fda21272e4bfd9634f7222276378b6e56a3))  - (goliatone)
- Include templates for content ([f2f1286](https://github.com/goliatone/go-admin/commit/f2f1286348bc94455ff002e9e80b31dc4508c4ef))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.3.0 ([5174a58](https://github.com/goliatone/go-admin/commit/5174a589998890c2ddf2405b5b8fb58eb1d39fd7))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate assets ([10bae6c](https://github.com/goliatone/go-admin/commit/10bae6c43805a7065ff22fad450c32eab2536ba2))  - (goliatone)
- Update examples ([e84af0f](https://github.com/goliatone/go-admin/commit/e84af0ffa6476ba8690170db1a58af49e0c14d2b))  - (goliatone)
- Update tests ([0bd3b70](https://github.com/goliatone/go-admin/commit/0bd3b703aec2c802a3a0f830c66692fcea6eb16e))  - (goliatone)

# [0.3.0](https://github.com/goliatone/go-admin/compare/v0.2.0...v0.3.0) - (2026-01-08)

## <!-- 1 -->🐛 Bug Fixes

- Root dir to client ([874155d](https://github.com/goliatone/go-admin/commit/874155d7aa213ef20eab1c0d05a6c3076f9b66e0))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.3.0 ([6c7d6ed](https://github.com/goliatone/go-admin/commit/6c7d6ed157bc2da9b9e70468076a964a1cdc6149))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Move templates to client ([f86a97c](https://github.com/goliatone/go-admin/commit/f86a97c9eb84a2a47fb2608171b2aa6ee433f769))  - (goliatone)
- Move assets from example to package ([5716566](https://github.com/goliatone/go-admin/commit/5716566dec232517e5005bc6ce6f090ec46e8809))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.2.0 ([e6c0f9c](https://github.com/goliatone/go-admin/commit/e6c0f9c46266a38b79d2eb4d459f48778508bc86))  - (goliatone)

## <!-- 30 -->📝 Other

- PR [#1](https://github.com/goliatone/go-admin/pull/1): assets ([7ea34fc](https://github.com/goliatone/go-admin/commit/7ea34fc835088d90a4c9f3424ae72b32f7b82fd7))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update assets runtime ([5d2b8d9](https://github.com/goliatone/go-admin/commit/5d2b8d95480df5a5919a0eab23347883481c892c))  - (goliatone)
- Update task to serve assets ([72e8058](https://github.com/goliatone/go-admin/commit/72e8058bd83d96d5ce422abea37f79c0fee100a1))  - (goliatone)
- Update tests ([f405780](https://github.com/goliatone/go-admin/commit/f4057805ee988481d86d6887cb7bfa3be04069b6))  - (goliatone)

# [0.2.0](https://github.com/goliatone/go-admin/compare/v0.1.0...v0.2.0) - (2026-01-07)

## <!-- 13 -->📦 Bumps

- Bump version: v0.2.0 ([8c7a205](https://github.com/goliatone/go-admin/commit/8c7a2056249a5ada4bd62ee0c5e3286f8af13252))  - (goliatone)

## <!-- 16 -->➕ Add

- Tabs and panel support ([d126dc9](https://github.com/goliatone/go-admin/commit/d126dc903c9857e696c647ddac2163dfec46b19a))  - (goliatone)
- Role assignment lookup ([707b317](https://github.com/goliatone/go-admin/commit/707b317a20759f03e68221115f07fb1fbcda2095))  - (goliatone)
- Penal tabs support ([c8c8cdf](https://github.com/goliatone/go-admin/commit/c8c8cdf60639e6270ac7ff4164479b68ba21c04e))  - (goliatone)
- Response envelope ([15b4c8c](https://github.com/goliatone/go-admin/commit/15b4c8c544e042410d8746fe150f008b6767a5e4))  - (goliatone)
- Support for tabs in panel ([97385fc](https://github.com/goliatone/go-admin/commit/97385fcb0f1f4913dfed12144400d230cb344d8a))  - (goliatone)
- Role lookup and panel setup ([11dd17a](https://github.com/goliatone/go-admin/commit/11dd17a9fce914866381d07578b141761889da2c))  - (goliatone)
- Datatable updates ([bc7ff63](https://github.com/goliatone/go-admin/commit/bc7ff636cef84767e2afb2265200883ad29c6da9))  - (goliatone)
- Tabs panel ([b4ee541](https://github.com/goliatone/go-admin/commit/b4ee541e9bc0ce1097653fa633bcc35f14578da7))  - (goliatone)
- Tabs ([3a36da8](https://github.com/goliatone/go-admin/commit/3a36da8ac726adfdcc008d3b2423237dc5be65e1))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.1.0 ([2a749b7](https://github.com/goliatone/go-admin/commit/2a749b700883b2369bdda08cc2ea8ac5db5baa82))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate example ([95d28b8](https://github.com/goliatone/go-admin/commit/95d28b8be218fa562d3ec9fc7be5e94a854380ae))  - (goliatone)
- Update tests ([991902e](https://github.com/goliatone/go-admin/commit/991902ec603d34fa25210fe655b8595ecc79d134))  - (goliatone)
- Update examples ([aee947f](https://github.com/goliatone/go-admin/commit/aee947f656c2c6eadc274f9b9ab8ac757e1f80bd))  - (goliatone)
- Update deps ([12109d6](https://github.com/goliatone/go-admin/commit/12109d67421c2bc35db550d51b64249593f757db))  - (goliatone)

# [0.1.0](https://github.com/goliatone/go-admin/tree/v0.1.0) - (2026-01-07)

## <!-- 1 -->🐛 Bug Fixes

- Build seed menu ([f24d802](https://github.com/goliatone/go-admin/commit/f24d802161bf662afeb9a11b3ec30eb7d64c1121))  - (goliatone)
- Error mapping to normalize http messages ([2b8e7d5](https://github.com/goliatone/go-admin/commit/2b8e7d562b6c6c7714c3452e9a4522f9642a8463))  - (goliatone)
- Users edit replace id param ([cd78a80](https://github.com/goliatone/go-admin/commit/cd78a80d63487338ce0586aa7e29148b7c6ddd16))  - (goliatone)
- Use pointer position for menu item ([b65bbe3](https://github.com/goliatone/go-admin/commit/b65bbe3d03e871d1822899476689bb863106a22c))  - (goliatone)
- Navigation ordering ([5e84c75](https://github.com/goliatone/go-admin/commit/5e84c752dbd5d875987d7e3ccae7a3b1e9a210d9))  - (goliatone)
- Include locale in cms query ([9128d24](https://github.com/goliatone/go-admin/commit/9128d2429f43f657789b4b31d9e6ca7f391a33bb))  - (goliatone)
- Add parent id to main menu ([55766d1](https://github.com/goliatone/go-admin/commit/55766d1509ce37b3d711e0f0ada8f98654f74c4d))  - (goliatone)
- Quickstart menu builder ([d4a1c49](https://github.com/goliatone/go-admin/commit/d4a1c4949abf7eabccca835facb9892a56b6c0c8))  - (goliatone)
- Prevent duplicates in menus ([deff818](https://github.com/goliatone/go-admin/commit/deff818a8ce4463cc3f9abd5ca20312f31a6b27f))  - (goliatone)
- Navigation menu builder ([8f06b46](https://github.com/goliatone/go-admin/commit/8f06b464e45f13e33b9654849e86b9730e80c29c))  - (goliatone)
- Make module filtrable ([252e8a7](https://github.com/goliatone/go-admin/commit/252e8a72c8f4de2944caab6b8f97bbe5e7b33bd9))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.1.0 ([5f35d3f](https://github.com/goliatone/go-admin/commit/5f35d3f95461e8472d7c1bba2963daeed0f1b72d))  - (goliatone)

## <!-- 16 -->➕ Add

- Quickstart support config with flags ([7d1e21d](https://github.com/goliatone/go-admin/commit/7d1e21d6aaf4dafcbe490fba5f977e8f021e5ef4))  - (goliatone)
- Quickstart dashboard renderer and templates ([b5c59c1](https://github.com/goliatone/go-admin/commit/b5c59c1903e8e7845c3380cad3482b0253ee14bf))  - (goliatone)
- Quickstart feature gates ([3c3d3de](https://github.com/goliatone/go-admin/commit/3c3d3dede447ee77b000bc371c2d661ee45ddc8c))  - (goliatone)
- Ssr tempalte ([03b3d9a](https://github.com/goliatone/go-admin/commit/03b3d9a6a36098c8b5c569d198e9bb3b5c77d7fb))  - (goliatone)
- Quickstart auth setup ([1394cc4](https://github.com/goliatone/go-admin/commit/1394cc4926f240205682173aeb643c415bfb817e))  - (goliatone)
- Export service refactored ([43d9749](https://github.com/goliatone/go-admin/commit/43d974900a7cae0ec38f04b2af9a6e9950e299e4))  - (goliatone)
- Export config panel setup ([3f25c03](https://github.com/goliatone/go-admin/commit/3f25c032e46284d6d283f375f403f28e4ffa6765))  - (goliatone)
- Integrate go-export with admin ([58ac0c4](https://github.com/goliatone/go-admin/commit/58ac0c475a0e115cfad5b82ed45b58e8de624efc))  - (goliatone)
- Export registration to boot ([8066d2c](https://github.com/goliatone/go-admin/commit/8066d2c6befa017fc8a4ff67ed2aab6f29197b53))  - (goliatone)
- Export integration ([e94b9f0](https://github.com/goliatone/go-admin/commit/e94b9f0164aa8960c6b8515b544f4b9413b23e6e))  - (goliatone)
- Export setup in quickstart ([cdcb130](https://github.com/goliatone/go-admin/commit/cdcb1304d78676569a1f1507631af9ea072481fd))  - (goliatone)
- Boosted quickstart for a more batteries included setup ([df2e5e7](https://github.com/goliatone/go-admin/commit/df2e5e753073dff4fc37c83c4edf6b7dda04b5b9))  - (goliatone)
- Admin config to adapter result ([906056b](https://github.com/goliatone/go-admin/commit/906056b8b6d89dccc4ae88d74336b0ccf584eeca))  - (goliatone)
- QueryValues to crud context adapter ([ff5d8ca](https://github.com/goliatone/go-admin/commit/ff5d8ca788ab8788db0e4ca35dc925257f8e8257))  - (goliatone)
- Preference ui management ([95ebd75](https://github.com/goliatone/go-admin/commit/95ebd7562b6cbba590f40d0bf5815bba1b295233))  - (goliatone)
- In mememory notification service ([89d44b7](https://github.com/goliatone/go-admin/commit/89d44b755fa7f86e821a9ef276741bb957078cf5))  - (goliatone)
- Updated API for admin ([d8a8810](https://github.com/goliatone/go-admin/commit/d8a8810dc1de37e6d2d1ab01e28959928635b073))  - (goliatone)
- Attach tenants to default module ([aebb6fc](https://github.com/goliatone/go-admin/commit/aebb6fc732d0337ef7372cefec72598cdcd25110))  - (goliatone)
- Canonical name handling for nav ([3cab581](https://github.com/goliatone/go-admin/commit/3cab581c5063dd1c5dbd2fbf323760080429b0cc))  - (goliatone)
- Extract locale from context ([781b1bb](https://github.com/goliatone/go-admin/commit/781b1bb020a87f4718a8cdfd9858f2258b26e45c))  - (goliatone)
- Cms adapter setup ([2d2558f](https://github.com/goliatone/go-admin/commit/2d2558f805d00c2beb35d6d41babb50489850475))  - (goliatone)
- Updated quickstart setup ([488d372](https://github.com/goliatone/go-admin/commit/488d372fd53d2835a29acdeb73f5dc1fe03b771c))  - (goliatone)
- Admin pkg ([8b993b3](https://github.com/goliatone/go-admin/commit/8b993b380329ba3fd5a30bf6044d89c5141d0882))  - (goliatone)
- Admin modules ([4809cb6](https://github.com/goliatone/go-admin/commit/4809cb6ffb77ef7562b4c305f1c125c0fae8893f))  - (goliatone)
- Admin notifications ([7e32d56](https://github.com/goliatone/go-admin/commit/7e32d56b5baefd102aaa85aac97cd0d27a6f92e8))  - (goliatone)
- Admin deps ([317a485](https://github.com/goliatone/go-admin/commit/317a4851b31e10c3b744e1689d73952b22aa1ed0))  - (goliatone)
- Internal boot refactoring ([21135b9](https://github.com/goliatone/go-admin/commit/21135b9ce2c58d555630dd1688408efe1136e291))  - (goliatone)
- Dashboard godash config ([c678d38](https://github.com/goliatone/go-admin/commit/c678d385b504ded079ed4a1ebc8dfb202548db7c))  - (goliatone)
- Config defaults ([2646f90](https://github.com/goliatone/go-admin/commit/2646f9051597ccd481a62971c4c0aac18dea374b))  - (goliatone)
- Bootstrap refactoring ([ffae32e](https://github.com/goliatone/go-admin/commit/ffae32ef8baaa474df25f56447158ea6db647594))  - (goliatone)
- Template setup ([f3d904e](https://github.com/goliatone/go-admin/commit/f3d904e6fe3db88c3d96942d5524a687bddcf50c))  - (goliatone)
- Fiber eror handler ([c2e493a](https://github.com/goliatone/go-admin/commit/c2e493ae5c2a5d777c0ad0c00a6254c556e3ac75))  - (goliatone)
- Activity integration with notification ([0efa1db](https://github.com/goliatone/go-admin/commit/0efa1db897e25f0a9c34c60dc026a402e570d4a8))  - (goliatone)
- Activity panel ([893d41e](https://github.com/goliatone/go-admin/commit/893d41e20a9055068d2080de429a2da338425a82))  - (goliatone)
- Select from request in theme ([e916da4](https://github.com/goliatone/go-admin/commit/e916da413c27d3375b14f0a6c64ebf32fdfe19fa))  - (goliatone)
- Profile use persistence store ([34b55cf](https://github.com/goliatone/go-admin/commit/34b55cf471100dca3a8c1d6d797448d72050825c))  - (goliatone)
- Add repository registry ([89dbccd](https://github.com/goliatone/go-admin/commit/89dbccdce8fd2e0a108d6c924b22dbd409b21920))  - (goliatone)
- Menu and menu item name access ([e89009d](https://github.com/goliatone/go-admin/commit/e89009dc3bf0e4dcf20d4a19bb2ea07e3ec3bdd7))  - (goliatone)
- Channel support for activity ([5d1b5af](https://github.com/goliatone/go-admin/commit/5d1b5af6947d6a3e3277588d02ce1856d78abae7))  - (goliatone)
- Datatable assets for actions ([0dad11f](https://github.com/goliatone/go-admin/commit/0dad11fbbd1cc7b775f637e774503a0cdc8422a1))  - (goliatone)
- Session management ([9f11062](https://github.com/goliatone/go-admin/commit/9f11062d245adab2cc99ff1262ca27f6d8981096))  - (goliatone)
- User management commadns ([97c2487](https://github.com/goliatone/go-admin/commit/97c248756177bf03d0e3f037b2ef08f2d6f0b609))  - (goliatone)
- Quickstart support for demo ([d1d6b32](https://github.com/goliatone/go-admin/commit/d1d6b3263712bdf26b456782fc3fd44dca81a2d0))  - (goliatone)
- Quick start for demo ([c2523ac](https://github.com/goliatone/go-admin/commit/c2523acf0ab293b2363ca122e21eb52c4e6da06f))  - (goliatone)
- Settings adapter ([48e47c4](https://github.com/goliatone/go-admin/commit/48e47c4e622c6e8b509bd67f9ddb726c52b0860b))  - (goliatone)
- Tenants crud ([df25659](https://github.com/goliatone/go-admin/commit/df25659893356ec82a155110c21419063fa93faa))  - (goliatone)
- Activity record imp ([852df24](https://github.com/goliatone/go-admin/commit/852df2461ad0b4773185d7841c067fd0f605f346))  - (goliatone)
- Crud resource views ([3c48078](https://github.com/goliatone/go-admin/commit/3c4807879c87a6e0aa938c4be254a5d8e5f1ae5a))  - (goliatone)
- Sidebar setup ([97e0454](https://github.com/goliatone/go-admin/commit/97e04546690dd27ece3417d1cba7e056898e6065))  - (goliatone)
- Repository imp ([6907dde](https://github.com/goliatone/go-admin/commit/6907dde6ea894d900ddb1403c351e256e32e5cae))  - (goliatone)
- Admin users module ([e2f7e08](https://github.com/goliatone/go-admin/commit/e2f7e08badd756d2bd5da24bd2c7ba96680cb8a0))  - (goliatone)
- Admin organizations module ([170aaa3](https://github.com/goliatone/go-admin/commit/170aaa375d767ff0555b16db438cc5f948f85d52))  - (goliatone)
- Admin cms adapters ([0bd84a7](https://github.com/goliatone/go-admin/commit/0bd84a767e470173251afe1666a20e6fd7b23e92))  - (goliatone)
- Admin preferences module ([5bef561](https://github.com/goliatone/go-admin/commit/5bef561b231f3f6bcd578c322f3e06d40addcd20))  - (goliatone)
- Admin tenants module ([cb04e1a](https://github.com/goliatone/go-admin/commit/cb04e1a79257e0cd5e0097e8a7ef424a1667cbc5))  - (goliatone)
- Admin theme ([2dfcd04](https://github.com/goliatone/go-admin/commit/2dfcd04aa77f9c01cfc2190df379fac1f1dc2af6))  - (goliatone)
- Admin profile ([8094c6f](https://github.com/goliatone/go-admin/commit/8094c6f6409fc698e708a4fd9a2a73609d1e8309))  - (goliatone)
- Testdata ([75f7dad](https://github.com/goliatone/go-admin/commit/75f7dade91e97fd8b2735135d65b72a5c8b9be06))  - (goliatone)
- Media initial pass ([36ac1f1](https://github.com/goliatone/go-admin/commit/36ac1f1e2125ff93790d20d5f2219c62d80cda3f))  - (goliatone)
- Bulk and export initial pass ([a0fdf5b](https://github.com/goliatone/go-admin/commit/a0fdf5b09b5d1d32f87331e7266377cdb4c8fdad))  - (goliatone)
- Feature management to jobs ([a97835f](https://github.com/goliatone/go-admin/commit/a97835ff0d944e8825372b6b09977a7954155a30))  - (goliatone)
- Noop notification service ([f9cc161](https://github.com/goliatone/go-admin/commit/f9cc161cbfa5ce3876ecc11e134ccc2b684cdb2b))  - (goliatone)
- Handler for feature disabled ([85b4a6c](https://github.com/goliatone/go-admin/commit/85b4a6c58a7b056a1ccfdf116ea43337879e05f5))  - (goliatone)
- Normalzie error ([a742e42](https://github.com/goliatone/go-admin/commit/a742e4231828c42f7057c53bdb0427f2229b8abf))  - (goliatone)
- CMS memory repo imp ([b0e5d46](https://github.com/goliatone/go-admin/commit/b0e5d468d23d4cc103822df397469f5afdf9ee2d))  - (goliatone)
- Translator implementation ([963f4fc](https://github.com/goliatone/go-admin/commit/963f4fc1cae11b89f4836643ad3919af7f1ac5a1))  - (goliatone)
- Repository CRUD ([a7b69f4](https://github.com/goliatone/go-admin/commit/a7b69f47f01d8b4aa4f76319b248e217c16c523a))  - (goliatone)
- CMS repository ([1bf5a0a](https://github.com/goliatone/go-admin/commit/1bf5a0a2f4048d900b4bf20ceec6eeedd5c59b0b))  - (goliatone)
- Panel form adapter ([4bf8cda](https://github.com/goliatone/go-admin/commit/4bf8cdab48da4791c8462956a6459449851dbe01))  - (goliatone)
- Feature flag management ([4e0532a](https://github.com/goliatone/go-admin/commit/4e0532a74c17313fb67439f3fc9e49e463b65cc4))  - (goliatone)
- Navigation item implements requirements for menu ([30c3b25](https://github.com/goliatone/go-admin/commit/30c3b25a1f83b90e4219a66705d6175d53b8a426))  - (goliatone)
- Translation for modules ([10db282](https://github.com/goliatone/go-admin/commit/10db282044b37186f3dda3c534ec3bd932b9451e))  - (goliatone)
- Feature flag ([111c6f4](https://github.com/goliatone/go-admin/commit/111c6f4bf3fdeddc9ac04a8159774674c7af6c0a))  - (goliatone)
- Class/style to cms setup ([2ffe61e](https://github.com/goliatone/go-admin/commit/2ffe61ee754bbea98087479f3fa765a8d6e32b96))  - (goliatone)
- Feature flag setup ([e72046c](https://github.com/goliatone/go-admin/commit/e72046c087a1836988cb87b31191e92fc0f8ce42))  - (goliatone)
- Config menu code ([296e809](https://github.com/goliatone/go-admin/commit/296e809afcab3dadcf07ba12540ec30a7f1e02a3))  - (goliatone)
- Module support ([e34d24b](https://github.com/goliatone/go-admin/commit/e34d24b3f425029fcc58d4306c60e85297dc64c6))  - (goliatone)
- Activity, notifications, and settings ([7eddea7](https://github.com/goliatone/go-admin/commit/7eddea7c76923fce6f3bc8e2a8c1fd20b63f0705))  - (goliatone)
- Settings implementation ([82c05cf](https://github.com/goliatone/go-admin/commit/82c05cfd8eea69428184da92505d8416202699fc))  - (goliatone)
- Navigation setup ([d9d2a3d](https://github.com/goliatone/go-admin/commit/d9d2a3d97b3fbfe69ce2cd3b267f1b7971b9e107))  - (goliatone)
- Initial implementation ([103e028](https://github.com/goliatone/go-admin/commit/103e0281d1f7530150c7a219d16f02f016d77952))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Quickstart use go-cms built it ([4e1a49f](https://github.com/goliatone/go-admin/commit/4e1a49f96607ad71d6aa6f96413131d62d3c6dac))  - (goliatone)
- Move functionality to go-cms ([7a56366](https://github.com/goliatone/go-admin/commit/7a563662db86a558e16f94bebfe859fe4d12e141))  - (goliatone)
- Remove code that is handled by go-cms ([fac7b92](https://github.com/goliatone/go-admin/commit/fac7b921c1d6c94bc9cd0fc89eae8bc3cb315d88))  - (goliatone)
- Update our go-cms adapter for latest version ([2450228](https://github.com/goliatone/go-admin/commit/245022850a388b010afcc9fde8ea7a8dc99da9e5))  - (goliatone)
- Admin setup ([8eaa8b6](https://github.com/goliatone/go-admin/commit/8eaa8b661d76e0ba367a571b4d493160ca567c14))  - (goliatone)
- Break down admin ([205e873](https://github.com/goliatone/go-admin/commit/205e87302a9a3fe4719f4e5508da65c9a695029d))  - (goliatone)
- Settings priorities ([66de09c](https://github.com/goliatone/go-admin/commit/66de09c345529da147eae54f26d9336b1891c82d))  - (goliatone)
- Feature enabledment ([43fc0a1](https://github.com/goliatone/go-admin/commit/43fc0a1b8ebb6f1f6d84a6eac6a9183402ed41d2))  - (goliatone)
- Break down admin in smaller packages ([57945a1](https://github.com/goliatone/go-admin/commit/57945a14081a9ce083691dc4b07ea5778ce514a0))  - (goliatone)
- Move boot to package ([cec2bb0](https://github.com/goliatone/go-admin/commit/cec2bb02b70b1036b3439fcdabbd6af7fd17a7e7))  - (goliatone)
- CMS integration ([66be785](https://github.com/goliatone/go-admin/commit/66be785c289de4b6d35a29a2ff3563c86b2e557a))  - (goliatone)
- Feature management ([a51f411](https://github.com/goliatone/go-admin/commit/a51f4110a61d5e9a097db0c3e6ecda301fda28db))  - (goliatone)

## <!-- 22 -->🚧 WIP

- Support for remote checker ([9d83499](https://github.com/goliatone/go-admin/commit/9d8349995bcc344064598ae4dcee6d62eb6ccae6))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update readme ([9e0a4e5](https://github.com/goliatone/go-admin/commit/9e0a4e5cbffa9b3fb38a5acda32d7f1d2fd2e3ba))  - (goliatone)
- Udpate example ([3ce91c1](https://github.com/goliatone/go-admin/commit/3ce91c10327301f0a801c21f891b081a232fb5bb))  - (goliatone)
- Update tests ([97345d0](https://github.com/goliatone/go-admin/commit/97345d07847f38395656fa2b64ef5a8fcee2bfe3))  - (goliatone)
- Update examples ([879e690](https://github.com/goliatone/go-admin/commit/879e69049519645a480a1150199cf82337de7f89))  - (goliatone)
- Update deps ([f805112](https://github.com/goliatone/go-admin/commit/f805112de2ff97468c410b550bff652982a0cb73))  - (goliatone)
- Update example ([5da2bab](https://github.com/goliatone/go-admin/commit/5da2babae26ed86a0081c66025b170847e2cd8cc))  - (goliatone)
- Update docs ([b638295](https://github.com/goliatone/go-admin/commit/b6382959f27b4611a31a33ddd8b176c3b5dc18f0))  - (goliatone)
- Update gitignore ([db91552](https://github.com/goliatone/go-admin/commit/db91552ec1908bb91af7ca95cf1495e53b25fe5e))  - (goliatone)
- Update commerce ([7d3aea1](https://github.com/goliatone/go-admin/commit/7d3aea1b819a8125bc79d2627274954d60857c70))  - (goliatone)
- Update datagrid filters ([9248de9](https://github.com/goliatone/go-admin/commit/9248de907c1008c9ac9067be2135c6759bab4738))  - (goliatone)
- Update datatable assets ([8cd65af](https://github.com/goliatone/go-admin/commit/8cd65afc62e747b451e2ba165c95795aee56b0e1))  - (goliatone)
- Udpate test ([1e2203a](https://github.com/goliatone/go-admin/commit/1e2203a81921c2fed01ae30344d7563564f1afde))  - (goliatone)
- Update assets ([45de763](https://github.com/goliatone/go-admin/commit/45de7632ab2534588f5ee11a05ecd168abc5e128))  - (goliatone)
- Update module exmaple ([bcd6203](https://github.com/goliatone/go-admin/commit/bcd62035e2d14b09f52200d7ed28e0e0bf4ad205))  - (goliatone)
- Update example style ([e3051e7](https://github.com/goliatone/go-admin/commit/e3051e758ff328314d7aa808b5da68415814ad2e))  - (goliatone)
- Example templates ([74d23ed](https://github.com/goliatone/go-admin/commit/74d23ed807d5e312e8a61e009d19ad46d1632b5c))  - (goliatone)
- Example update ([ff16170](https://github.com/goliatone/go-admin/commit/ff16170e3c7fdf46121bd546f3f6cd43f1dcdadc))  - (goliatone)
- Initial commit ([2197564](https://github.com/goliatone/go-admin/commit/2197564725b64c8ef15d034763ee283ee95ac4ba))  - (goliatone)
