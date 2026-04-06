# Changelog

# [0.33.0](https://github.com/goliatone/go-admin/compare/v0.32.0...v0.33.0) - (2026-04-06)

## <!-- 1 -->🐛 Bug Fixes

- CSRF token handling for api calls from browser client ([7633772](https://github.com/goliatone/go-admin/commit/7633772e1b0068b0971c176b56189da7273394a6))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.33.0 ([0d66c8f](https://github.com/goliatone/go-admin/commit/0d66c8fadd64c66e7db4a9643160da23a448ebb0))  - (goliatone)

## <!-- 16 -->➕ Add

- Updated pacakge facace ([60b2b25](https://github.com/goliatone/go-admin/commit/60b2b25ae9dd05ba54768adee8fb384f2449b5e0))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Simplify code. fix: security issues ([05a679f](https://github.com/goliatone/go-admin/commit/05a679f4f550284ca1df0eb38595f67bf249096c))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.32.0 ([502df89](https://github.com/goliatone/go-admin/commit/502df8964cc350bacb33382552f71576a7200750))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Fix code ([18b78a9](https://github.com/goliatone/go-admin/commit/18b78a9b920e533f54849e54859869d24d94f633))  - (goliatone)
- Update CI setup ([8392bbc](https://github.com/goliatone/go-admin/commit/8392bbcd214d9d88e04ca983192097bfb1cb4bdf))  - (goliatone)
- Update docs ([56d3f23](https://github.com/goliatone/go-admin/commit/56d3f233e712df5b78f07f2cc46f426185340667))  - (goliatone)
- Update deps ([4b572f4](https://github.com/goliatone/go-admin/commit/4b572f48a611b775c004f9ed55618487e5a19da9))  - (goliatone)

# [0.32.0](https://github.com/goliatone/go-admin/compare/v0.31.0...v0.32.0) - (2026-04-01)

## <!-- 1 -->🐛 Bug Fixes

- Seed registration ([75371fd](https://github.com/goliatone/go-admin/commit/75371fd3f79a462c13461eab38a912ce3a6a0f9f))  - (goliatone)
- Error meta ([f67f83b](https://github.com/goliatone/go-admin/commit/f67f83b19296e05571b6b141db77c4724c1f6b36))  - (goliatone)
- Require authorizer ([13ddb71](https://github.com/goliatone/go-admin/commit/13ddb71bd78fabc461216b63f454cfbc6a7025af))  - (goliatone)
- Better CSRF implementation ([440ef8c](https://github.com/goliatone/go-admin/commit/440ef8c7007f625bc46bb3bb2df7163c34b6fecb))  - (goliatone)
- Use logger ([a994170](https://github.com/goliatone/go-admin/commit/a994170541e1914358bc8f1e5c93d3311dd0353c))  - (goliatone)
- Use string split seq ([f1c86b3](https://github.com/goliatone/go-admin/commit/f1c86b34991b7da51638b1aa0cacf0ad3d82f3ef))  - (goliatone)
- Auth redirect resolver ([370232a](https://github.com/goliatone/go-admin/commit/370232a89de0a5cbe284b0e930f907ed1992b865))  - (goliatone)
- CSRF in translation exchange ([424ff50](https://github.com/goliatone/go-admin/commit/424ff5030fc1ff90e5e66c9e5a3591a90a1de2a5))  - (goliatone)
- Translation exchange handle failing job ([087bebe](https://github.com/goliatone/go-admin/commit/087bebe75761904a113f929566d81396cb3bdb14))  - (goliatone)
- SiteViewProfileOverrideAllowed check ([19f886b](https://github.com/goliatone/go-admin/commit/19f886b6cbe4ea7c52a65e68e2c2922df185232e))  - (goliatone)
- Handle errors properly ([c8e1a54](https://github.com/goliatone/go-admin/commit/c8e1a54fa7329546af4d0f782f7552a9bec8a261))  - (goliatone)
- Data race in dashboard wiring ([38e8d03](https://github.com/goliatone/go-admin/commit/38e8d032199e122835b348c0373b18cb16c0ec6c))  - (goliatone)
- Admin user role management ([6787af0](https://github.com/goliatone/go-admin/commit/6787af0dfb11cbc1a731e0da03d658b2be597846))  - (goliatone)
- Init hooks run after running ooks ([11d7b52](https://github.com/goliatone/go-admin/commit/11d7b5289b757d7c9f39eda670b32eea0942d418))  - (goliatone)
- Bind workflow error handling ([d7d94e6](https://github.com/goliatone/go-admin/commit/d7d94e64058d8d4f6812cdd9b907faa1f08cb7ce))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.32.0 ([b49ff29](https://github.com/goliatone/go-admin/commit/b49ff292116edc9103ed5addaba4cf3ec8ffe89b))  - (goliatone)

## <!-- 16 -->➕ Add

- Translation runtime ([f75ec8c](https://github.com/goliatone/go-admin/commit/f75ec8c7f52161e109ac305b2df24fbd927401b9))  - (goliatone)
- Activity feature gates ([74d541c](https://github.com/goliatone/go-admin/commit/74d541c59e1e190b591ff911c8b9c647f16e6448))  - (goliatone)
- Debug perms ([be25053](https://github.com/goliatone/go-admin/commit/be250530fca20aaa8879534b303a2627f84e145b))  - (goliatone)
- Command registry initializer ([201f109](https://github.com/goliatone/go-admin/commit/201f109c27adb3636af745a407d3a4200d3bf510))  - (goliatone)
- Admin permission policy ([78397c7](https://github.com/goliatone/go-admin/commit/78397c71c87468f571cb54a53c613d286041257f))  - (goliatone)
- Internal url util ([0d8be28](https://github.com/goliatone/go-admin/commit/0d8be281371508e2630d652b9d125328671de94a))  - (goliatone)
- Staging router ([9a863b1](https://github.com/goliatone/go-admin/commit/9a863b15f7be783855a963b9e0bb51c1c419d730))  - (goliatone)
- Use golangci-lint ([781419f](https://github.com/goliatone/go-admin/commit/781419fe7f33abd6253eeac96c87ec3e5a943918))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Simplify code. fix: security issues ([d8bc54e](https://github.com/goliatone/go-admin/commit/d8bc54e967cb40473fc5487936709065e6f9cf45))  - (goliatone)
- Simplify code ([b04a642](https://github.com/goliatone/go-admin/commit/b04a6426a7dc6d88d60d1ca0af3ce5ca335cd0b5))  - (goliatone)
- Remove printf ([f77688c](https://github.com/goliatone/go-admin/commit/f77688c41ce6874cd8869acf4107fbbccb25f054))  - (goliatone)
- Remove runtime start from translation exchange ([2c69162](https://github.com/goliatone/go-admin/commit/2c6916238023f0e92dbd14ace32a1f80eb0ddcce))  - (goliatone)
- Frontend code ([8202d42](https://github.com/goliatone/go-admin/commit/8202d42a41a50c950c138ff6bb920680d542bd6b))  - (goliatone)
- Client code simplifiation ([296fe43](https://github.com/goliatone/go-admin/commit/296fe434ddee3e640f58c142bcd6d04a9cfdf9bd))  - (goliatone)
- Code quality improvements ([4f533c3](https://github.com/goliatone/go-admin/commit/4f533c3bf3b9c184e706275e5aa9de112711a943))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.31.0 ([605c6f6](https://github.com/goliatone/go-admin/commit/605c6f6d54cce86a8cca0495a0b164d77e365b43))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([e65135b](https://github.com/goliatone/go-admin/commit/e65135bf3a24f5d54735862b333f6502ef2add4a))  - (goliatone)
- Fix code ([d7dc950](https://github.com/goliatone/go-admin/commit/d7dc950fbebc45746551c59ad33bddbe342ed68e))  - (goliatone)
- Update deps ([dbb7045](https://github.com/goliatone/go-admin/commit/dbb7045abb0a9e1a56679c305f1d4a63ac891d9b))  - (goliatone)
- Update docs ([2ae38ff](https://github.com/goliatone/go-admin/commit/2ae38ff686e73acf2f113764f2cead00fb24c824))  - (goliatone)
- Ignore staging cnofig file ([23d9b12](https://github.com/goliatone/go-admin/commit/23d9b12c5c89017a1c34a02b9ff4c1b503bbe32d))  - (goliatone)
- Update examples ([ecb1b48](https://github.com/goliatone/go-admin/commit/ecb1b48dd54319dae06d1a42d3d1e4d66e3a37a3))  - (goliatone)
- Udpate tests ([8d3bc6d](https://github.com/goliatone/go-admin/commit/8d3bc6d1bbf802ce3cf6ad73b967a394ae5b25f3))  - (goliatone)
- Update validation tasks ([f725374](https://github.com/goliatone/go-admin/commit/f725374fe544b7485c4479757318e828a2422244))  - (goliatone)
- Udpate docs ([a8154f3](https://github.com/goliatone/go-admin/commit/a8154f3805b7391c19e5aad5afbf143cbbae8613))  - (goliatone)

# [0.31.0](https://github.com/goliatone/go-admin/compare/v0.30.0...v0.31.0) - (2026-03-25)

## <!-- 1 -->🐛 Bug Fixes

- Inject csrf token ([d1cd43d](https://github.com/goliatone/go-admin/commit/d1cd43d7696cf2b007ed710ad0047ee85773a97d))  - (goliatone)
- Move register canonical content entry routes before others ([c0570d8](https://github.com/goliatone/go-admin/commit/c0570d8d6e71daf9d7237328f0c3fe5df7ff4fa6))  - (goliatone)
- Use protected route from go-auth ([17e4f78](https://github.com/goliatone/go-admin/commit/17e4f7829984ed3c7c4d724b4eb54fd8daff4f5d))  - (goliatone)
- Indject CSRF field to form ([c38ea07](https://github.com/goliatone/go-admin/commit/c38ea07f7c4e0ce822fb326b1a3e2e22d25f8214))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.31.0 ([416ad6f](https://github.com/goliatone/go-admin/commit/416ad6fb99c85cbc36bfdcc862c6c13880223268))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.30.0 ([9e0f666](https://github.com/goliatone/go-admin/commit/9e0f66694e8f4698a723971dc33ff8c80b05e646))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deploy setup ([bc3ee1c](https://github.com/goliatone/go-admin/commit/bc3ee1c65ab949919726d3e390e24f1af43986ce))  - (goliatone)
- Update tests ([52ea287](https://github.com/goliatone/go-admin/commit/52ea28708e632e0276c2695f899e3498744e994d))  - (goliatone)
- Update docs ([3083a9b](https://github.com/goliatone/go-admin/commit/3083a9b90d7972dd294735a79d06f4c0c9542691))  - (goliatone)
- Update example ([f649bee](https://github.com/goliatone/go-admin/commit/f649bee4894f6e44d2bb29b895e678e1631af95a))  - (goliatone)

# [0.30.0](https://github.com/goliatone/go-admin/compare/v0.29.0...v0.30.0) - (2026-03-25)

## <!-- 1 -->🐛 Bug Fixes

- Static asset setup ([ad396d5](https://github.com/goliatone/go-admin/commit/ad396d5b97e6df95f2740b022384b3d6e6ed0860))  - (goliatone)
- Template logo override ([cc3968f](https://github.com/goliatone/go-admin/commit/cc3968fd3942be4241df1c771cb292493827ae47))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.30.0 ([3abc481](https://github.com/goliatone/go-admin/commit/3abc481a2b5c52b7caba17a18891e011d66a3ad8))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.29.0 ([35320da](https://github.com/goliatone/go-admin/commit/35320da616d0fee010b203fef297347472c29ea1))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([1dbb67d](https://github.com/goliatone/go-admin/commit/1dbb67d329f557302235accb37d6e8d9f75055e4))  - (goliatone)

# [0.29.0](https://github.com/goliatone/go-admin/compare/v0.28.0...v0.29.0) - (2026-03-24)

## <!-- 1 -->🐛 Bug Fixes

- CSRF token middleware use ([c87dbb9](https://github.com/goliatone/go-admin/commit/c87dbb924ef9e9bd53a8e512b2deb7ff61b42479))  - (goliatone)
- Asset building to pass test ([12ee1d2](https://github.com/goliatone/go-admin/commit/12ee1d2ddcc085af87bf2701f6e637c5831e6787))  - (goliatone)
- Route auth use protected browse func ([8f6a99a](https://github.com/goliatone/go-admin/commit/8f6a99a3d7fc454d4652b0edd7b40f147d2ab6ee))  - (goliatone)
- Missing preferences build dist ([3957bb9](https://github.com/goliatone/go-admin/commit/3957bb952c53aa4e7e09cd712495e13dbf6b15e3))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.29.0 ([acbbad9](https://github.com/goliatone/go-admin/commit/acbbad9cb850a3180951c8c13764a274ba36610b))  - (goliatone)

## <!-- 16 -->➕ Add

- Quickstart use CSRF token ([96fb16b](https://github.com/goliatone/go-admin/commit/96fb16b611bf8422f074aeb80a356390a37b1982))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.28.0 ([e80e2fa](https://github.com/goliatone/go-admin/commit/e80e2fa6e84a7f2e2cff75554820f265fdaf0f24))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([01b10cf](https://github.com/goliatone/go-admin/commit/01b10cf22e7f24f6dfe100b0b239813944d9c388))  - (goliatone)
- Update tasks ([c244358](https://github.com/goliatone/go-admin/commit/c2443582e85468606ca06c7e008e7e4f469122e2))  - (goliatone)

# [0.28.0](https://github.com/goliatone/go-admin/compare/v0.27.1...v0.28.0) - (2026-03-24)

## <!-- 1 -->🐛 Bug Fixes

- Use protected route setup ([746c2b6](https://github.com/goliatone/go-admin/commit/746c2b62938c4fd4044356f4690cb65b20d3efc9))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.28.0 ([e1576d3](https://github.com/goliatone/go-admin/commit/e1576d37e931697dba53b02a190f44634edba2aa))  - (goliatone)

## <!-- 16 -->➕ Add

- Better navigation wiring and CSRF token handling ([a3d8216](https://github.com/goliatone/go-admin/commit/a3d82161c33b6533ef071617df48d19afeb94591))  - (goliatone)
- Integreate CSRF token with login setup ([431359f](https://github.com/goliatone/go-admin/commit/431359f1ad49b8fb1a338ab99337007b547c60ce))  - (goliatone)
- Support new router cookie setup ([3e86380](https://github.com/goliatone/go-admin/commit/3e863801bcff7202b13a2690a24fc78327761572))  - (goliatone)
- HasProvider to dashboard ([c54d86a](https://github.com/goliatone/go-admin/commit/c54d86abb16b5c049e846db2e61c16aeac7d0428))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Resolve protected routes wiring ([b8c5e92](https://github.com/goliatone/go-admin/commit/b8c5e9224463e48ba96617c67ef77b2083934ff3))  - (goliatone)
- Widget default registration ([dcbc22f](https://github.com/goliatone/go-admin/commit/dcbc22fac92d1fce7b2e3f39ed0c9094a4bea804))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.27.1 ([9c8027c](https://github.com/goliatone/go-admin/commit/9c8027c28b0eac995000a5f1f7229e8e107cdb60))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update example ([2390758](https://github.com/goliatone/go-admin/commit/2390758129f09037e3cd2c6f71e5390d727f2cf1))  - (goliatone)
- Update tests ([8eb4076](https://github.com/goliatone/go-admin/commit/8eb4076a5b90354090b686b75b205741ef8c08ec))  - (goliatone)
- Update deps ([560e757](https://github.com/goliatone/go-admin/commit/560e757810a3fc94d0cd6689c96d5fcfcb382378))  - (goliatone)

# [0.27.1](https://github.com/goliatone/go-admin/compare/v0.27.0...v0.27.1) - (2026-03-24)

## <!-- 13 -->📦 Bumps

- Bump version: v0.27.1 ([45133a7](https://github.com/goliatone/go-admin/commit/45133a75d6feab874954ffc229b99ffc751723fa))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.27.0 ([c3ba509](https://github.com/goliatone/go-admin/commit/c3ba50912c0f6e03e918aa4b75ff1346c1e5f805))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([60f1274](https://github.com/goliatone/go-admin/commit/60f127485548db1348179a34a0c0338c072f6ff5))  - (goliatone)

# [0.27.0](https://github.com/goliatone/go-admin/compare/v0.26.0...v0.27.0) - (2026-03-24)

## <!-- 1 -->🐛 Bug Fixes

- Udpate templates to use adminURL ([967a88f](https://github.com/goliatone/go-admin/commit/967a88f4d81f302a474dc8a5855b6a0d9bc5329f))  - (goliatone)
- Export structs with json tags ([2306606](https://github.com/goliatone/go-admin/commit/23066061d341245ffdfa7d1a6d48adc969cf6af3))  - (goliatone)
- Typo ([946b2ed](https://github.com/goliatone/go-admin/commit/946b2ed473dfada9cec51dc3fea7d62b9f20887a))  - (goliatone)
- Logic to check draft perms ([9861218](https://github.com/goliatone/go-admin/commit/98612184946aa3af62706c1144714d5e8a6c3ff7))  - (goliatone)
- Remove in memory translation repo ([f028b98](https://github.com/goliatone/go-admin/commit/f028b989c9fbc70b90f7eaf60aec77a501a2cad8))  - (goliatone)
- Update code format ([92c6ebb](https://github.com/goliatone/go-admin/commit/92c6ebb943e2878a364ba12e9ec16e870f01c406))  - (goliatone)
- Workflow runtime ([fd96f3c](https://github.com/goliatone/go-admin/commit/fd96f3c50f50864cbc883a7577d7d9689ec830a7))  - (goliatone)
- Ui routes for exchange ([2b9aa88](https://github.com/goliatone/go-admin/commit/2b9aa887c5f6123ff8b4a27cf11c3d10f969a0a7))  - (goliatone)
- Update tools ([0316880](https://github.com/goliatone/go-admin/commit/03168807d4a27c0c52224c0719420295cc224691))  - (goliatone)
- Recovery commit replay ([086c490](https://github.com/goliatone/go-admin/commit/086c4909482da7cbdcb9d9f415ab6184d90bb20b))  - (goliatone)
- Data race and sync issues ([b1f05ed](https://github.com/goliatone/go-admin/commit/b1f05edfb95fb00040abdeafaca74b2fd3792b6f))  - (goliatone)
- Add route new api ([7b16e18](https://github.com/goliatone/go-admin/commit/7b16e18d313e9f60e08ec8b00b14b8de9ff59813))  - (goliatone)
- Rpc transport hooks ([34eff30](https://github.com/goliatone/go-admin/commit/34eff3010b6405b25ef075e7ce6087553d60a876))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.27.0 ([44323dc](https://github.com/goliatone/go-admin/commit/44323dc11ff715ac12d3e4d821eb27512367a3dc))  - (goliatone)

## <!-- 16 -->➕ Add

- Debug view ([a7579c1](https://github.com/goliatone/go-admin/commit/a7579c17db9619ae34fba320fbbfac0682a2e614))  - (goliatone)
- Ops infra ([4ba50b9](https://github.com/goliatone/go-admin/commit/4ba50b917d89787342fb86ae32e9199edc4e3492))  - (goliatone)
- Tools for code quality ([8deec35](https://github.com/goliatone/go-admin/commit/8deec352a8739352ddf2415eed630e1562e8ec9f))  - (goliatone)
- Quickstart site shared helpers ([e54a17b](https://github.com/goliatone/go-admin/commit/e54a17b2d9b3011835280d01bf5186834560e330))  - (goliatone)
- Route registration helpers ([33f5342](https://github.com/goliatone/go-admin/commit/33f5342f0d9b609939ed89ff4154b467e73c9180))  - (goliatone)
- Admin path helpers ([39092eb](https://github.com/goliatone/go-admin/commit/39092ebb56e8ede8e80e918b9b71ecd1dff631a3))  - (goliatone)
- Admin rpc transport use go-router setup ([96d9097](https://github.com/goliatone/go-admin/commit/96d9097189935b535751b89a870b40e686b43b24))  - (goliatone)
- Search work to include dedicated package ([380716a](https://github.com/goliatone/go-admin/commit/380716ac2d8425dfc711894a80bbe9261b9ba075))  - (goliatone)
- Upload helper ([aceebdd](https://github.com/goliatone/go-admin/commit/aceebdd98f7dd23d5b574969116b59a6a349cbee))  - (goliatone)
- Is loopback peer helper ([a4a9645](https://github.com/goliatone/go-admin/commit/a4a9645c8e1986770d61cedbaf3ca3b808dd1869))  - (goliatone)
- Storage bundle helper ([32406fd](https://github.com/goliatone/go-admin/commit/32406fd2eb1a53dcacb6d6b7a958c7aa58635b56))  - (goliatone)
- Admin boot seq ([946bde0](https://github.com/goliatone/go-admin/commit/946bde0856fbe823790ca640cdc5a25f417951df))  - (goliatone)
- Breadcrumpt feature ([9b21dd6](https://github.com/goliatone/go-admin/commit/9b21dd601ad3b127c08d9f00183fb0c91f3232be))  - (goliatone)
- Translation family configuration ([221fe27](https://github.com/goliatone/go-admin/commit/221fe2709cc543b7303e5699e457e4cfd5ab73e8))  - (goliatone)
- Translation fow migrations ([659754e](https://github.com/goliatone/go-admin/commit/659754eca858dbc118a7cae66cf9b050eeee9175))  - (goliatone)
- Translation runtime refactoring ([85e420f](https://github.com/goliatone/go-admin/commit/85e420f6424d1bff2d0a1781f0b686a47399a7cf))  - (goliatone)
- Translation flow migrations ([2618298](https://github.com/goliatone/go-admin/commit/26182985b33120430f654c7d51df01a4bed9960f))  - (goliatone)
- Update translation assignment and family management ([8e26563](https://github.com/goliatone/go-admin/commit/8e265633db6e67b79ed21814a4d5b7e0eee5f7e4))  - (goliatone)
- Ignore tenant assets ([b4d6921](https://github.com/goliatone/go-admin/commit/b4d6921cc1418adf2e25a4703544968da0f2d37d))  - (goliatone)
- Content entry routes query detail ([4abcac0](https://github.com/goliatone/go-admin/commit/4abcac0af12eb0f327498cb1c0145ae39baceab5))  - (goliatone)
- Content entry route from schema ([639620f](https://github.com/goliatone/go-admin/commit/639620fbbadaabaa9f983de96f20f539dfb08812))  - (goliatone)
- Content entry route translation handler ([afb78d7](https://github.com/goliatone/go-admin/commit/afb78d74963eec6e59f87053a67253d556ea1041))  - (goliatone)
- Translation datagrid integrated with current flow ([bc9a8f5](https://github.com/goliatone/go-admin/commit/bc9a8f516a3c00c092cea923433ee92a3f7063bd))  - (goliatone)
- Action scope row ([7147672](https://github.com/goliatone/go-admin/commit/714767237b056cf62a6e3888ccedf1deb559fe95))  - (goliatone)
- Translation datagrid records ([0efb088](https://github.com/goliatone/go-admin/commit/0efb0885450d6eda724d89abe1eb3a3b1a175afe))  - (goliatone)
- Translation family support ([9301264](https://github.com/goliatone/go-admin/commit/93012647371b941e62503967efda21af5c95b7f3))  - (goliatone)
- Client ui ([227268b](https://github.com/goliatone/go-admin/commit/227268b684f04af8a9b3780a83c7d032827c15a8))  - (goliatone)
- Update translation datagrid contracts ([22429a5](https://github.com/goliatone/go-admin/commit/22429a556e4fa9f58d3982a3ec6e862c472e8de6))  - (goliatone)
- Fix inline ([e0944c5](https://github.com/goliatone/go-admin/commit/e0944c599f47bbc2fe1d65d6aab0327052b44420))  - (goliatone)
- New translation flows ([e41640d](https://github.com/goliatone/go-admin/commit/e41640d6c14ec74d96721ac73d9fbb30c58cb86c))  - (goliatone)
- Resolve callback urls ([2beb228](https://github.com/goliatone/go-admin/commit/2beb228319e43ccfa6520f72b4cf946d4edaa516))  - (goliatone)
- Translations exhange ([b3f9928](https://github.com/goliatone/go-admin/commit/b3f99280eea158741e1f84c0feb0d6adb90c68bf))  - (goliatone)
- Update translations service ([386a548](https://github.com/goliatone/go-admin/commit/386a548f53e13aab364a064d8399b96edaf18320))  - (goliatone)
- Translation exchange runtime ([e124bc2](https://github.com/goliatone/go-admin/commit/e124bc25da2bfdee5a6c8d1f42e9ba02eeb20f95))  - (goliatone)
- Ui placement dashboard ([8df8f23](https://github.com/goliatone/go-admin/commit/8df8f23b37f64944c34b6d56bff46f1b9d2674ef))  - (goliatone)
- Update client code ([e8a1e7d](https://github.com/goliatone/go-admin/commit/e8a1e7d1564a3bc589a60499e39c376831709a07))  - (goliatone)
- Migrations for translation exchange ([3375384](https://github.com/goliatone/go-admin/commit/3375384adccce55b8d27eec99cb66670dceaa089))  - (goliatone)
- Bulk action state ([6a9be0e](https://github.com/goliatone/go-admin/commit/6a9be0ee162906eea7dad4b098bb70c4cd3f6c02))  - (goliatone)
- Action diagnostics ([8a7301f](https://github.com/goliatone/go-admin/commit/8a7301f92c8fc8c0c5985184a28223416e58b463))  - (goliatone)
- Translation exchange updates ([7c1c432](https://github.com/goliatone/go-admin/commit/7c1c43229d0c96424a0cf0e4874e0de61e6a185e))  - (goliatone)
- Translation assets ([f7ccade](https://github.com/goliatone/go-admin/commit/f7ccadede33c3af77880396770b3a6f33b333200))  - (goliatone)
- New actions flow, and sync primitives ([2eece7d](https://github.com/goliatone/go-admin/commit/2eece7db43927191b7b89d667ad7fc03e91823c0))  - (goliatone)
- Admin system transport adapter ([f20f120](https://github.com/goliatone/go-admin/commit/f20f1207e5bdcd61c2952d8d9cb9f74f490b2c13))  - (goliatone)
- Dashboard areas ([4638f8a](https://github.com/goliatone/go-admin/commit/4638f8a3935b93ce9abc5a0c1981bb24fa4e4131))  - (goliatone)
- Guard effects implementation ([716e46d](https://github.com/goliatone/go-admin/commit/716e46d2bd753485e85b29c63faf60a43a8cf759))  - (goliatone)
- Admin action contract and flow ([85b7668](https://github.com/goliatone/go-admin/commit/85b7668f8b493bb0169b95836bb398794ccfd607))  - (goliatone)
- Refactor translation ui ([965c121](https://github.com/goliatone/go-admin/commit/965c121ac8684d0e8d1ffe64ebd8a650b3be9abd))  - (goliatone)
- Translations services ([30afc92](https://github.com/goliatone/go-admin/commit/30afc92003f6dd831ecc834231652de079b49549))  - (goliatone)
- Guarded effects package ([15bd036](https://github.com/goliatone/go-admin/commit/15bd03603bf1296c4f50abcd67d5cdbe3b0aaff3))  - (goliatone)
- Action response ([4ca30c3](https://github.com/goliatone/go-admin/commit/4ca30c3b555702b596c91b15ea488b5d935906b7))  - (goliatone)
- Sync request identity ([487179e](https://github.com/goliatone/go-admin/commit/487179ea9c3bf3b058fec3bcf735d522dd0b8734))  - (goliatone)
- Sync recover commit implementation ([036164d](https://github.com/goliatone/go-admin/commit/036164d419253ba66b2e2bf6c871f6ca3386ff6e))  - (goliatone)
- Translation matrix and dashboard implementation ([32fbb4b](https://github.com/goliatone/go-admin/commit/32fbb4b965b2b313f52f87561d6877359d5db454))  - (goliatone)
- Test and translation ui ([31f01a0](https://github.com/goliatone/go-admin/commit/31f01a024a17b9305c18caad0402f04304af1aa9))  - (goliatone)
- Migrations for example ([765f028](https://github.com/goliatone/go-admin/commit/765f028e615f3237f3b104e4e5d4ec7d9e108929))  - (goliatone)
- Sync implementation ([74b1272](https://github.com/goliatone/go-admin/commit/74b1272b5a382deee4d07147343a15411ef9ed5c))  - (goliatone)
- Default admin features with translation ([4e2e41b](https://github.com/goliatone/go-admin/commit/4e2e41b5142a5183f50f341876d658c9d9b309f3))  - (goliatone)
- Translation workflow ([e947d72](https://github.com/goliatone/go-admin/commit/e947d72e4f7985a7485a20318cc904dc863b92c6))  - (goliatone)
- Udpate go-sync package ([3e9cd0c](https://github.com/goliatone/go-admin/commit/3e9cd0caf8c2389558446c151fa83eb09d0d7cd1))  - (goliatone)
- Translation work ([79a05c6](https://github.com/goliatone/go-admin/commit/79a05c62b3dddde8d329dcbdb2f4d8d3bce3517d))  - (goliatone)
- Register translation routes ([8cb29ba](https://github.com/goliatone/go-admin/commit/8cb29baef38ac22ad00500fbde1fbaff1bd2925a))  - (goliatone)
- Work scope error mapping ([df4de51](https://github.com/goliatone/go-admin/commit/df4de510fecf5afcff76d36ba19bd26c16558bdc))  - (goliatone)
- New error codes for translations ([0c252cd](https://github.com/goliatone/go-admin/commit/0c252cdc10a847df2836fc3dad345a13cb554c2a))  - (goliatone)
- Implement transltaion types ([bb08baa](https://github.com/goliatone/go-admin/commit/bb08baaf45f548debab07995eef33fd9667f6e40))  - (goliatone)
- Input meta tracking ([417d55a](https://github.com/goliatone/go-admin/commit/417d55aea74d8de881af423fef159e33877de52d))  - (goliatone)
- Updated translation contracts ([a867301](https://github.com/goliatone/go-admin/commit/a86730185679cee4badb653dcf9a234081e488fd))  - (goliatone)
- Boot translation families ([471217c](https://github.com/goliatone/go-admin/commit/471217ce2af52168c90ccde202f2e1ad52d82127))  - (goliatone)
- Placement editor ([6ba79a1](https://github.com/goliatone/go-admin/commit/6ba79a1885e4e9fa9066b53fccaffa78bfae0ab9))  - (goliatone)
- Translator editor binging ([87824d0](https://github.com/goliatone/go-admin/commit/87824d03f714685802064c62e5e6ce893516fe8b))  - (goliatone)
- Translator editor route ([d85a454](https://github.com/goliatone/go-admin/commit/d85a454b3c650b48a02e09be285c8fc776fce281))  - (goliatone)
- Migration grups ([542a7d3](https://github.com/goliatone/go-admin/commit/542a7d31ac46c1c105a3a07aa4eb3d40458f1030))  - (goliatone)
- Testdata for translation ([8a09ea4](https://github.com/goliatone/go-admin/commit/8a09ea417f98053c7a361921822fc4add9efa432))  - (goliatone)
- Translation queue url handling ([6b5a6de](https://github.com/goliatone/go-admin/commit/6b5a6de60bff4a198a15067c1a2a0a3de00957fb))  - (goliatone)
- Translation policy config ([b56ce9b](https://github.com/goliatone/go-admin/commit/b56ce9b0343eca4b6f702fa01b80beb7ba7b59f8))  - (goliatone)
- Translation policy ([7d689cf](https://github.com/goliatone/go-admin/commit/7d689cf063b19ad3bfd6af206d3eb5abee4fe578))  - (goliatone)
- Translation family url ([28e3219](https://github.com/goliatone/go-admin/commit/28e3219a75318240454768f924625ef0e0b67510))  - (goliatone)
- Url helpers string handling ([a2f5349](https://github.com/goliatone/go-admin/commit/a2f534938624d9692f02b558fcac46ec7615a117))  - (goliatone)
- New translation flow ([e8d4c6e](https://github.com/goliatone/go-admin/commit/e8d4c6e4297b84ef47f0f0f074916fbcf216bc95))  - (goliatone)
- Translation service test data ([73ce32f](https://github.com/goliatone/go-admin/commit/73ce32fc050dac44388c4aa1e1055749d148b219))  - (goliatone)
- Client setup ([324a44b](https://github.com/goliatone/go-admin/commit/324a44b8433b0ffc5daa12b38d7277f70165da30))  - (goliatone)
- Conntent entry routes ([e9668fb](https://github.com/goliatone/go-admin/commit/e9668fb8b815f2e149b6be34f0cd719239279ac2))  - (goliatone)
- Step translation families boot ([a68f312](https://github.com/goliatone/go-admin/commit/a68f312ec0ce55da5bcbb1f969edc37fe546d928))  - (goliatone)
- Value helpers ([55bd8a8](https://github.com/goliatone/go-admin/commit/55bd8a81449cd2dbc89c917f752ad63a6eb8adae))  - (goliatone)
- Translation binding family ([1f57114](https://github.com/goliatone/go-admin/commit/1f57114fc4c08f57a4aca09dab2602508bfe6bb5))  - (goliatone)
- Translation testing ([c3a9380](https://github.com/goliatone/go-admin/commit/c3a9380645b69e5535e645f710b52ff0be5640ac))  - (goliatone)
- Translation ui ([db4dc23](https://github.com/goliatone/go-admin/commit/db4dc235fbb64f614d731f1c0a556c444d32fb54))  - (goliatone)
- Translations module ([3d4cffa](https://github.com/goliatone/go-admin/commit/3d4cffaec54fbbe66ae97ac32ea9b1f1266a5017))  - (goliatone)
- Routing module ([67eee62](https://github.com/goliatone/go-admin/commit/67eee6207042ebc265c186174ae031c395a7ee4d))  - (goliatone)
- Admin routing package ([05cdcba](https://github.com/goliatone/go-admin/commit/05cdcbaa4b00446467ff7908ce1e06737c0f21fd))  - (goliatone)
- Translation module rework ([0caf07c](https://github.com/goliatone/go-admin/commit/0caf07c3f711bac506b01d8b8b76f45f09e1b06d))  - (goliatone)
- Migrations sql ([0c39d42](https://github.com/goliatone/go-admin/commit/0c39d4240f5032961b70ec666cefe7561601a2ad))  - (goliatone)
- New job id handling ([f99fc9c](https://github.com/goliatone/go-admin/commit/f99fc9cd9e2c26039a91b2d7de74a84b928519d8))  - (goliatone)
- Workflow authoring ([bd937b5](https://github.com/goliatone/go-admin/commit/bd937b50a550b01644839f43d80926343ce83724))  - (goliatone)
- Flow errors ([93b344a](https://github.com/goliatone/go-admin/commit/93b344a04877981dd33c5a54c711fcce6623fd48))  - (goliatone)
- Unregister workflow in cms ([24a75d9](https://github.com/goliatone/go-admin/commit/24a75d9e4f982bfaf3af66298ce6c5012be2c083))  - (goliatone)
- Admin rpc transport ([39245fb](https://github.com/goliatone/go-admin/commit/39245fb44aaed2411f3a331cbcc54e0c2b14420f))  - (goliatone)
- Repository workflow authoring ([9e5caf6](https://github.com/goliatone/go-admin/commit/9e5caf682693df39b9820a689de4efcd943698cf))  - (goliatone)
- Rpc transport ([6c9da67](https://github.com/goliatone/go-admin/commit/6c9da676c3a28d4d45f5bf85085d4425da96c6fc))  - (goliatone)
- Migrations for workflow authoring ([ea3fa73](https://github.com/goliatone/go-admin/commit/ea3fa734437f1c5d8e500d240476793ddb0bee87))  - (goliatone)
- Expose RPC server ([b0e32f8](https://github.com/goliatone/go-admin/commit/b0e32f8338ae536c0cca73013dde3bf89f3e5727))  - (goliatone)
- Rpc authenticator ([6d6e6cc](https://github.com/goliatone/go-admin/commit/6d6e6ccb341deff5bf70a368b46aef3afde40c04))  - (goliatone)
- Site router ([bd88642](https://github.com/goliatone/go-admin/commit/bd88642cf16e0aa7fb6355262a705b94cd9ffd0a))  - (goliatone)
- Content routes ([bacda13](https://github.com/goliatone/go-admin/commit/bacda1383c64e95008b554bed7c5dd1c5dd27310))  - (goliatone)
- Command bus names ([10b3f4c](https://github.com/goliatone/go-admin/commit/10b3f4c7a200ecea1068c859c395f4b08318bb27))  - (goliatone)
- Integrate command RPC ([d798776](https://github.com/goliatone/go-admin/commit/d798776a2c77fbff7e6b311e47fd38491ebd5b36))  - (goliatone)
- Udpated router interfaces ([08cc608](https://github.com/goliatone/go-admin/commit/08cc60829e5a96eda26b84a097fad54beefcaa89))  - (goliatone)
- Command routing ([84df32d](https://github.com/goliatone/go-admin/commit/84df32d0cb146f30e0266f1ad1d65c21204a5677))  - (goliatone)
- Update notifications setup ([dc02112](https://github.com/goliatone/go-admin/commit/dc02112416962353c46ddb8ecb7d6998a50b26bf))  - (goliatone)
- Command config with defaults ([d9e93f7](https://github.com/goliatone/go-admin/commit/d9e93f766c117e7575fbd94f518aa36c768f5263))  - (goliatone)
- Command config ([0e61db4](https://github.com/goliatone/go-admin/commit/0e61db4d0ffbed38efbd2f48945c7daccbe4ce28))  - (goliatone)
- Integrate command bus and queue command ([4b0d560](https://github.com/goliatone/go-admin/commit/4b0d56003a6d189191c02268c6b0bfc5b541a0fb))  - (goliatone)
- Admin command execution policy ([c41fba7](https://github.com/goliatone/go-admin/commit/c41fba7e734399049260804ac7410cc363353189))  - (goliatone)
- Cleint scripts ([a44ef73](https://github.com/goliatone/go-admin/commit/a44ef735c82a6e10db61fe93592f5b7ff6755f70))  - (goliatone)
- Default actions for panel ([4008edf](https://github.com/goliatone/go-admin/commit/4008edf60e8f6c4093a58190284cd5eea315349f))  - (goliatone)
- Context with hooks ([67b6c17](https://github.com/goliatone/go-admin/commit/67b6c17e91dbc2c400088fc3040496b78cb4d6fe))  - (goliatone)
- Debug request resolver ([8aba4fc](https://github.com/goliatone/go-admin/commit/8aba4fcb9c86ce3d42744d1290152af43467f34d))  - (goliatone)
- Updated resources ([2f88451](https://github.com/goliatone/go-admin/commit/2f884517a5676b3ee8f45272c7fc532dc1af1ffa))  - (goliatone)
- UP to context ([530b82b](https://github.com/goliatone/go-admin/commit/530b82befcd74c1e3576450d7c9aa823c1f72b38))  - (goliatone)
- Udpate migration service ([fe6ae6f](https://github.com/goliatone/go-admin/commit/fe6ae6ff43a4796d29e582e6a75dd8f45de42089))  - (goliatone)
- Udpated quickstart content entry bulk actions ([029f3b3](https://github.com/goliatone/go-admin/commit/029f3b3ee8c27dd9659dc425be3db8866b0a7e1e))  - (goliatone)
- Esign ip service and data migration ([97d7f9c](https://github.com/goliatone/go-admin/commit/97d7f9c853cb95b876fafb5ec42c08405ff7743b))  - (goliatone)
- Client assset test ([7ec349d](https://github.com/goliatone/go-admin/commit/7ec349dcc37dd44a7a1b654fdc1e1093e73b50e6))  - (goliatone)
- Quickstart migration and sql pipeline ([0501878](https://github.com/goliatone/go-admin/commit/0501878693ffa66af00bcebdb6283fd8061e414f))  - (goliatone)
- Refactored agreement form ([1d5a19a](https://github.com/goliatone/go-admin/commit/1d5a19a39ffc3b255df57cf5adf0bd855deb4ea9))  - (goliatone)
- Migration to use sql flow ([094be6e](https://github.com/goliatone/go-admin/commit/094be6eadf6e628ce1f75d19368ec212272008b2))  - (goliatone)
- Config for demo ([b458312](https://github.com/goliatone/go-admin/commit/b45831202012fd17de26600b64247fda3294dabf))  - (goliatone)
- Update signature flow ([c418588](https://github.com/goliatone/go-admin/commit/c4185886fac3e0e29ac5d327a1b302a560a64113))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Clean up our code ([1aaaf3b](https://github.com/goliatone/go-admin/commit/1aaaf3bec9e81f5c3d79ec40bd8735a5fa106bed))  - (goliatone)
- Consolidate code ([71f8136](https://github.com/goliatone/go-admin/commit/71f8136a8245f54c87d03c273ad620dbb3e4ebba))  - (goliatone)
- Search mechanics ([bb158c1](https://github.com/goliatone/go-admin/commit/bb158c19d624c1eaaeac803066ba8b6ec23b8ae4))  - (goliatone)
- Expose structs with json tags ([9e12a2d](https://github.com/goliatone/go-admin/commit/9e12a2d4781fb29fbb730a733a125d542c3b5dc9))  - (goliatone)
- Remove migration compat layer for family_id ([57349d6](https://github.com/goliatone/go-admin/commit/57349d63f4dea3ade255b4a3843130c643219eaf))  - (goliatone)
- Content type uses family_id for languages ([7fd098f](https://github.com/goliatone/go-admin/commit/7fd098fbc7320b7aa749a3eca9d969ab39e86c15))  - (goliatone)
- Navigaiton helpers ([d6f746a](https://github.com/goliatone/go-admin/commit/d6f746a6c9bdc349105e18c7d748ae66add40175))  - (goliatone)
- UI placement strategy ([6e167b2](https://github.com/goliatone/go-admin/commit/6e167b2c42ea64de75492106859fa0d421fd7005))  - (goliatone)
- Remove legacy code ([bbf71c8](https://github.com/goliatone/go-admin/commit/bbf71c8f432f89e4744fb590ce9665ba12419334))  - (goliatone)
- Module use routing report ([fc83388](https://github.com/goliatone/go-admin/commit/fc83388d6eec365c04219b29a2228814348c3a80))  - (goliatone)
- Client setup ([fb87518](https://github.com/goliatone/go-admin/commit/fb87518cd927ff3d13f5eca5531df203eb6eca12))  - (goliatone)
- Workflow routes out of boot ([d88d181](https://github.com/goliatone/go-admin/commit/d88d181e74c25ade37d5a7df13bbe95d99491314))  - (goliatone)
- Use register patch admin routes ([d4a4c2e](https://github.com/goliatone/go-admin/commit/d4a4c2ee757daa9a8a5b008f851da5bd69542e57))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.26.0 ([5eb9c1f](https://github.com/goliatone/go-admin/commit/5eb9c1f73c828651e7c198feae5bfa4c0d8dedc1))  - (goliatone)

## <!-- 30 -->📝 Other

- Remove meta key ([536f40c](https://github.com/goliatone/go-admin/commit/536f40cd13d963c60c468797ad66736e44ce2341))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([26b6bb3](https://github.com/goliatone/go-admin/commit/26b6bb37e13104c095af97b21641d1079bce3e3d))  - (goliatone)
- Update example ([e04204f](https://github.com/goliatone/go-admin/commit/e04204f089ef0f36b96a5de024818f13716d1d2d))  - (goliatone)
- Fix code ([06eb582](https://github.com/goliatone/go-admin/commit/06eb58200c98de9a47d8b707178081d890361d18))  - (goliatone)
- Update go tool tasks ([bc940ca](https://github.com/goliatone/go-admin/commit/bc940ca768e8ed75cb1ae540235b3aee3905036a))  - (goliatone)
- Update examples ([a3fa4a8](https://github.com/goliatone/go-admin/commit/a3fa4a8f5e3739ab875cf6a6a6413595df1ac446))  - (goliatone)
- Update deps ([a813e15](https://github.com/goliatone/go-admin/commit/a813e158c6b025f6710d869e2dacd7c88d1cf5ad))  - (goliatone)
- Update docs ([0b57500](https://github.com/goliatone/go-admin/commit/0b57500b37de39a730962f1a4ce5cdb2d5394780))  - (goliatone)
- Udpate example ([b765293](https://github.com/goliatone/go-admin/commit/b765293f382c32b9190f3610a2351b5d50c622d7))  - (goliatone)
- Clean up files ([78925bd](https://github.com/goliatone/go-admin/commit/78925bdfb478ed7b3890e7142161f1b4d2cbe996))  - (goliatone)
- Clean up naming files ([df751b1](https://github.com/goliatone/go-admin/commit/df751b18b06c80805aa560a7c04427fb4e1ae099))  - (goliatone)
- Udpate tests ([4edae7c](https://github.com/goliatone/go-admin/commit/4edae7cf54436ddb06e109b8ad37d5ca6bddc526))  - (goliatone)
- Update tasks ([2c3cff3](https://github.com/goliatone/go-admin/commit/2c3cff3ad7d1f1da9a3176865b573f1f23504bc3))  - (goliatone)
- Udpate docs ([bec0e22](https://github.com/goliatone/go-admin/commit/bec0e22adcef0ceef5ff9d3a56671c1028090e97))  - (goliatone)
- Update gitignore ([ef023db](https://github.com/goliatone/go-admin/commit/ef023db82eec1ed39bf4de9c1aac6b4d7b60a34b))  - (goliatone)
- Update readme ([a7244ac](https://github.com/goliatone/go-admin/commit/a7244acfd14ab0c11fe3bc436578f48254a1b9e5))  - (goliatone)
- Udpate deps ([7401f91](https://github.com/goliatone/go-admin/commit/7401f913554039881660fbc75519ed464941565b))  - (goliatone)

# [0.26.0](https://github.com/goliatone/go-admin/compare/v0.25.0...v0.26.0) - (2026-03-04)

## <!-- 1 -->🐛 Bug Fixes

- Content channel should use custom key ([c50adc8](https://github.com/goliatone/go-admin/commit/c50adc805ac066f4fb5365e37a178537a953793e))  - (goliatone)
- Client tests ([b71a4ac](https://github.com/goliatone/go-admin/commit/b71a4ac0a8d6ec833b7e3da53b5c342bc0680b7e))  - (goliatone)
- Localization for menus and content ([e64c35a](https://github.com/goliatone/go-admin/commit/e64c35a03503e19b699b26837689a51ecce80235))  - (goliatone)
- Update base template content ([89c1b85](https://github.com/goliatone/go-admin/commit/89c1b853b979e4013ed7bf9b328effef8867baed))  - (goliatone)
- Page content fallback ([e32a1b0](https://github.com/goliatone/go-admin/commit/e32a1b0cd3a7e71abe226b4868546f0362db5a95))  - (goliatone)
- Localized url fallback and runtime content channel ([03249b5](https://github.com/goliatone/go-admin/commit/03249b5a67a84f1f21b72191e688a9f57d151062))  - (goliatone)
- Incrase header size in fiber ([cd2c85b](https://github.com/goliatone/go-admin/commit/cd2c85b87bad9fdf76e736fc612c4b3695bdda2c))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.26.0 ([e35a210](https://github.com/goliatone/go-admin/commit/e35a210667232467bd91c457f31f061411cff8ec))  - (goliatone)

## <!-- 16 -->➕ Add

- Migrations for users ([c17b81f](https://github.com/goliatone/go-admin/commit/c17b81f483e713d5638cb60a972cbff8da462c01))  - (goliatone)
- Update migrations ([4f06db7](https://github.com/goliatone/go-admin/commit/4f06db771fa86b090120b8daff144ffedb510631))  - (goliatone)
- Content channel query ([a48c52c](https://github.com/goliatone/go-admin/commit/a48c52c0910f492c00cfd7bd1caa7841d65ef09f))  - (goliatone)
- Refactor localized navigation ([a77cdf1](https://github.com/goliatone/go-admin/commit/a77cdf1c301bd12d764264090a7e844ea17e0fc6))  - (goliatone)
- Content from env ([fdc8395](https://github.com/goliatone/go-admin/commit/fdc8395a48a279a2831a03fb9b310b7d5ed5ddee))  - (goliatone)
- Locale helpers ([d04028a](https://github.com/goliatone/go-admin/commit/d04028ae9ec9fca80476a4f61ebb704f4c5ad7a0))  - (goliatone)
- Updated error classifiers ([dad587c](https://github.com/goliatone/go-admin/commit/dad587c0f41e46e3cd3e2f5dd36244fccbb2a09c))  - (goliatone)
- Extract content path ([a4c33ab](https://github.com/goliatone/go-admin/commit/a4c33abde21761829c58c1b7f89b28e1d9c6fe15))  - (goliatone)
- Template site helpers ([de4353c](https://github.com/goliatone/go-admin/commit/de4353c849a2f52a29d4f9da571a821aac9a8da3))  - (goliatone)
- Menu builder, and error pages ([e587dce](https://github.com/goliatone/go-admin/commit/e587dcecc15cfed4be605e8c86f43a91fa895648))  - (goliatone)
- Quickstart site templates and loaders ([321786b](https://github.com/goliatone/go-admin/commit/321786b89913f17b68b74f54c841348081ec633e))  - (goliatone)
- Update site preview ([1f6219f](https://github.com/goliatone/go-admin/commit/1f6219fbbba8034f713a45efcea3b60551979a4f))  - (goliatone)
- Content routes for navigation and capabilities ([5691c86](https://github.com/goliatone/go-admin/commit/5691c864316c904fbe2af56ed1bc7a6db413b2f4))  - (goliatone)
- Fields to admin list contract ([aa494b0](https://github.com/goliatone/go-admin/commit/aa494b0f024f929c6321c690c8c6e7cf4c9fdc30))  - (goliatone)
- Urls for menu and menu managements ([b2dd29a](https://github.com/goliatone/go-admin/commit/b2dd29aa235ae17a9cc80d96a14437142d4a7682))  - (goliatone)
- Menu builder and menu items ([8903513](https://github.com/goliatone/go-admin/commit/8903513710650df4a9755e91f4cde0924c3b0c63))  - (goliatone)
- Quickstart sie ([30b5af0](https://github.com/goliatone/go-admin/commit/30b5af046e9e0fcbeef53f04d0d5841ea73eb500))  - (goliatone)
- Menu builder and cms pages ([9c5fa6c](https://github.com/goliatone/go-admin/commit/9c5fa6c3c826e7b4543b553e0184518851538573))  - (goliatone)
- Admin content navigation ([a11c97a](https://github.com/goliatone/go-admin/commit/a11c97a42bd74ded6147ff6197473145a690a702))  - (goliatone)
- Templates for site content ([3260254](https://github.com/goliatone/go-admin/commit/32602548d7269ea9b00d2ea937a433b30580f985))  - (goliatone)
- Build support for public site management ([b3badd9](https://github.com/goliatone/go-admin/commit/b3badd986b2bdef3abd3671a35e179cf1bd274a9))  - (goliatone)
- Support CMS menu entities ([792eb84](https://github.com/goliatone/go-admin/commit/792eb840130dcbe8b64109361239d3a54b6ec9e8))  - (goliatone)
- Udpated repository cms to handle menus ([7617714](https://github.com/goliatone/go-admin/commit/76177145f01e6e1c807dbe62f5cb415aae74b247))  - (goliatone)
- Site functionality ([fb6745b](https://github.com/goliatone/go-admin/commit/fb6745bb787421d38bd8677186db8d93066e4d6e))  - (goliatone)
- New menu builder func ([cd37107](https://github.com/goliatone/go-admin/commit/cd37107f33a4f00bd85435c58e7057c9abdf1829))  - (goliatone)
- Content type capabilities ([4edcb40](https://github.com/goliatone/go-admin/commit/4edcb40e380a5059cf9398a49a8f4a431876dc51))  - (goliatone)
- Expose FSM workflow engine ([a42248c](https://github.com/goliatone/go-admin/commit/a42248c936ecca178642e062fb2b5d3296c7106c))  - (goliatone)
- Integrate flow machine with cms ([dc9190f](https://github.com/goliatone/go-admin/commit/dc9190fb77f1e1b16585a8356217c5088becfa79))  - (goliatone)
- New error mapping ([c10ef40](https://github.com/goliatone/go-admin/commit/c10ef408456884d48cbe75a2d28c978269ce437d))  - (goliatone)
- Machine ID to panel ([9d34161](https://github.com/goliatone/go-admin/commit/9d34161beaaf920188de95a08ba3fde0d8d99c39))  - (goliatone)
- Correlation IDs to context ([9676f1e](https://github.com/goliatone/go-admin/commit/9676f1e7d59247a18002e31ca3ad4e01048f8de4))  - (goliatone)
- Integrate workflow and activity in admin ([b642ed7](https://github.com/goliatone/go-admin/commit/b642ed796fff8482790f14da9fa7d4c162357a2d))  - (goliatone)
- Integrate activity with fsm ([ef11abb](https://github.com/goliatone/go-admin/commit/ef11abb5f4e01962b753bc8f10641ff9fa5aaa12))  - (goliatone)
- Workflot fsm ([b16d733](https://github.com/goliatone/go-admin/commit/b16d73361eb2ceada761d7c2c6d7f931c706e189))  - (goliatone)
- Session claims to raduce scope ([f4c1c03](https://github.com/goliatone/go-admin/commit/f4c1c032c04761ae93026ef2fe81b65c22454fed))  - (goliatone)
- Track request IP ([d7f531c](https://github.com/goliatone/go-admin/commit/d7f531cadc89621c74fb41bd8fd533271d7a002c))  - (goliatone)
- Update toast manager ([b5f88a2](https://github.com/goliatone/go-admin/commit/b5f88a2fa211cf30db275f98b545b6f521bd1711))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Rename content type environment to channel ([bea4100](https://github.com/goliatone/go-admin/commit/bea4100a374186795dcf4e824475707b76831bdf))  - (goliatone)
- Remove old legacy code ([47a7545](https://github.com/goliatone/go-admin/commit/47a75452b595d53e0b8a3928abffac0b02c4a0fa))  - (goliatone)
- Remove use of os.Getenv from package code ([2b4f33c](https://github.com/goliatone/go-admin/commit/2b4f33c5c7afbd222ae4b8ad9e902817d5a77e92))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.25.0 ([7bc697b](https://github.com/goliatone/go-admin/commit/7bc697b25d9c0dfeb4baed190d0828d41474114d))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate docs ([fb0efe4](https://github.com/goliatone/go-admin/commit/fb0efe4291767118520711d68194ee7d2bd691a7))  - (goliatone)
- Update deps ([48b9052](https://github.com/goliatone/go-admin/commit/48b90523d5aabad2906a2bd907471eb475f43bcf))  - (goliatone)
- Update tests ([923f967](https://github.com/goliatone/go-admin/commit/923f967607f1ff9013ce6e3f8a6192f3ea31de19))  - (goliatone)
- Update examples ([0dfc904](https://github.com/goliatone/go-admin/commit/0dfc90469b1e1a85ca9f2f039338df8a20fb5aba))  - (goliatone)
- Udpate example ([c9dd0aa](https://github.com/goliatone/go-admin/commit/c9dd0aaad47b4328fa84b433dcabf28700bc5736))  - (goliatone)
- Update docs ([2cfa5a0](https://github.com/goliatone/go-admin/commit/2cfa5a02cc743e3671f58122dd9dddb739e5e91b))  - (goliatone)
- Update test ([37397ab](https://github.com/goliatone/go-admin/commit/37397ab58bf17b4c42ff9c81e19b527a1d3a52ce))  - (goliatone)
- Update format ([01c72e9](https://github.com/goliatone/go-admin/commit/01c72e964c3e514cf64dddf51debb00de34dbdf8))  - (goliatone)
- Update readme ([61ffeb3](https://github.com/goliatone/go-admin/commit/61ffeb3cd6a7e0bec6ab03cef2cf6371a96c4d3f))  - (goliatone)
- Udpate tests ([c234599](https://github.com/goliatone/go-admin/commit/c234599ff091a72328259dd24b1015e90a567743))  - (goliatone)

# [0.25.0](https://github.com/goliatone/go-admin/compare/v0.24.0...v0.25.0) - (2026-02-20)

## <!-- 1 -->🐛 Bug Fixes

- Merge panel action context ([db13902](https://github.com/goliatone/go-admin/commit/db13902a0bd780278888d0ba1ddb454025e72a7e))  - (goliatone)
- Env management in cms blocks ([ca2b841](https://github.com/goliatone/go-admin/commit/ca2b8410f7c7f31ead581234a838fdf7cf518195))  - (goliatone)
- Compact perms in session ([b754a68](https://github.com/goliatone/go-admin/commit/b754a687eaa349857983cc502653ee7b8263d520))  - (goliatone)
- Render routes using serializer ([088c662](https://github.com/goliatone/go-admin/commit/088c6620c24460b9e422ed5346bf5b9e6f914402))  - (goliatone)
- Render debug module using template view ([d0c8250](https://github.com/goliatone/go-admin/commit/d0c8250eba262a5c905c5b57dadbccda52dc8fac))  - (goliatone)
- Perms cache to prevent query amplification ([9d07222](https://github.com/goliatone/go-admin/commit/9d0722257791d47ad4e0d00f9fce6f6fa4d51e5e))  - (goliatone)
- Error messages ([4baf454](https://github.com/goliatone/go-admin/commit/4baf454c5a69e2e4e8f22297a391f26885345c60))  - (goliatone)
- Auth session setup to preven max length header error ([db96084](https://github.com/goliatone/go-admin/commit/db960848cfbecc24aa2d8a6c586ce370d58abfa7))  - (goliatone)
- Update how we loop and find block items ([d13bf43](https://github.com/goliatone/go-admin/commit/d13bf43ada12ef7e4394bec5cda8d31787bd0665))  - (goliatone)
- Explicit error ahndler and rendering ([63dd25b](https://github.com/goliatone/go-admin/commit/63dd25b8ccc721928e15a38617f609df7c1e23cc))  - (goliatone)
- Environment handling in selector ([59f4bd7](https://github.com/goliatone/go-admin/commit/59f4bd7445d4e04e42fd0c2999eae75f84c7f92e))  - (goliatone)
- Settings menu item registration ([83b48f3](https://github.com/goliatone/go-admin/commit/83b48f31183ee8e520bdf4f7c52e521d959581bb))  - (goliatone)
- Translation readiness ([4e3ad07](https://github.com/goliatone/go-admin/commit/4e3ad07a62f614cbf243a83b00b8ff942b5ca50d))  - (goliatone)
- Translation wiring ([257fd04](https://github.com/goliatone/go-admin/commit/257fd04604a80bbf5a057b520513f2527aa39948))  - (goliatone)
- Gate errors ([8d34306](https://github.com/goliatone/go-admin/commit/8d34306dca31816772ae88aa94dc5005294d5b78))  - (goliatone)
- Sync translation queue for panel ([cae2ea1](https://github.com/goliatone/go-admin/commit/cae2ea1f1c42bc1c8911bf4e66c95ad28bef1943))  - (goliatone)
- Aling UI routes with capabilities and falgs ([bca095e](https://github.com/goliatone/go-admin/commit/bca095e1644bc1801b8fa8d218a4eedaa9bacc73))  - (goliatone)
- Boot bindings for translations ([e3c919e](https://github.com/goliatone/go-admin/commit/e3c919e9d4d2c1b144d2ecc7f97af5f9df2ae982))  - (goliatone)
- Translation UI wiring ([95eab9b](https://github.com/goliatone/go-admin/commit/95eab9baf62f5dbb617aa512f975bad375f64e64))  - (goliatone)
- Include req context in ui feature context ([ec65647](https://github.com/goliatone/go-admin/commit/ec65647cd0c104ba4aaa5aafe97dbbf8022d3249))  - (goliatone)
- Translation capabilities wiring ([d58251e](https://github.com/goliatone/go-admin/commit/d58251ee35e1f0a34fbbf8dad7ec286d448a10a5))  - (goliatone)
- Translation ui ([d4341e3](https://github.com/goliatone/go-admin/commit/d4341e3107bf28c658fdb99a20272f92e4ce5944))  - (goliatone)
- Datatable translation integration ([52d3f8e](https://github.com/goliatone/go-admin/commit/52d3f8e2598917bb2b05039b68c2058e0354fc62))  - (goliatone)
- Disable tpl debug by default ([ea1f8fc](https://github.com/goliatone/go-admin/commit/ea1f8fc117d54e1b547c8351209b0be309866148))  - (goliatone)
- Coordinate system for preview ([0ae4d64](https://github.com/goliatone/go-admin/commit/0ae4d649b98f8f5f5b577f9388f5cc0357baee75))  - (goliatone)
- Parsing for content ([27bbc64](https://github.com/goliatone/go-admin/commit/27bbc64c9c950882fb0b914edd091e2b2b3e1b1d))  - (goliatone)
- Menu item prevent double parent ([66cd533](https://github.com/goliatone/go-admin/commit/66cd53352aeda98df28399c318337bdaf687779a))  - (goliatone)
- Update cms adapter ([84a1a72](https://github.com/goliatone/go-admin/commit/84a1a726bfecc36d8f097b179beb98f177830448))  - (goliatone)
- Persistence CMS error ([4397650](https://github.com/goliatone/go-admin/commit/4397650015629950623fc7e2a77b5835be407470))  - (goliatone)
- Add default content parent perms ([a1d78be](https://github.com/goliatone/go-admin/commit/a1d78beaf72bebccde8bfa6e7d5cba850283c612))  - (goliatone)
- Include ui feature context ([0cebf7e](https://github.com/goliatone/go-admin/commit/0cebf7e8100dc47523598fd8f55da9f118c2b473))  - (goliatone)
- Check for bulk user import before binding ([f664b5b](https://github.com/goliatone/go-admin/commit/f664b5bf90593b0f886957fe6fc07de56f2b8f13))  - (goliatone)
- Content type builder include env in routes ([d076aab](https://github.com/goliatone/go-admin/commit/d076aab6bac522f37dfb3924e5f76e8bf9680d0b))  - (goliatone)
- Agreemtn ([71b1108](https://github.com/goliatone/go-admin/commit/71b1108bb7e28f17a77db34deb2c642b287ca8a3))  - (goliatone)
- Content type routes ([1b43cc2](https://github.com/goliatone/go-admin/commit/1b43cc2fe3b5c9ff194e04f63b6658d2b4fefdf7))  - (goliatone)
- Biuld seed menu ([b73b33d](https://github.com/goliatone/go-admin/commit/b73b33d0926091babcc9faed80e0070b41bcb205))  - (goliatone)
- Include asset_base_path to view context ([7e66e14](https://github.com/goliatone/go-admin/commit/7e66e144168dac0be5613479a1ad5b9494c0ff40))  - (goliatone)
- Check for command bus enabled ([7d8ae3b](https://github.com/goliatone/go-admin/commit/7d8ae3b5cf626434f8671e22566e25e467f6d9dc))  - (goliatone)
- Implement route shadowing guard for dev ([c6d60b6](https://github.com/goliatone/go-admin/commit/c6d60b637bfa2d7b27e61c435b6a473ae5e749a3))  - (goliatone)
- Quickstart error fiber handler ([97fa4c0](https://github.com/goliatone/go-admin/commit/97fa4c096d7a418d193319cb43f9fed99b6f3615))  - (goliatone)
- Remove unused code ([4d80bd9](https://github.com/goliatone/go-admin/commit/4d80bd912e4bfadbae5f1352e0d584e79e5b6995))  - (goliatone)
- Use asset base path ([994c891](https://github.com/goliatone/go-admin/commit/994c891ab3ca9285d4eab70d0f2c124ff9506b11))  - (goliatone)
- Include and wire activity and preview features ([b1e30f1](https://github.com/goliatone/go-admin/commit/b1e30f1caeb8eac751f38d418e54d7a64bc68335))  - (goliatone)
- Better error codes ([bf5b130](https://github.com/goliatone/go-admin/commit/bf5b13087f35d4347bcbe4f22a572ed99063d40a))  - (goliatone)
- Prevent empty session info by adding fallback handler ([a9a617d](https://github.com/goliatone/go-admin/commit/a9a617d8afde958ee0d5abbff574466dc105805a))  - (goliatone)
- Support canonical top fields ([4f552ca](https://github.com/goliatone/go-admin/commit/4f552ca45320fd0449fe1bbc079a254ceaace3c4))  - (goliatone)
- Content route check for templates before click ([3a37c72](https://github.com/goliatone/go-admin/commit/3a37c72973a9bb9901c171198225a0791753cdf9))  - (goliatone)
- Remove merge fields from repo ([e2202d8](https://github.com/goliatone/go-admin/commit/e2202d81b829b52695ab375fd21a9b31244d22be))  - (goliatone)
- Handle fiber error and provide proper error code ([55a8386](https://github.com/goliatone/go-admin/commit/55a838699d4f621314343e2cc43ab69cba72d92f))  - (goliatone)
- Boot transition workflow handler ([9b10a61](https://github.com/goliatone/go-admin/commit/9b10a6196bbedf813d108d47052f9143ae8a1006))  - (goliatone)
- Clean up ([1f71dc5](https://github.com/goliatone/go-admin/commit/1f71dc58881a26a1cd3decda09425a1f2d7144b5))  - (goliatone)
- Content filtering wiring ([cfda1e2](https://github.com/goliatone/go-admin/commit/cfda1e26a7bc3ce9a4c46bec1a6dfca5f255b1da))  - (goliatone)
- Get user id from actor in preferences ([a3b5540](https://github.com/goliatone/go-admin/commit/a3b5540acf7a282915edf5b6174fa42c07df483a))  - (goliatone)
- Role handling in user record ([4573aa1](https://github.com/goliatone/go-admin/commit/4573aa1bdd6cdf51b69ece4689a8eae50f0ca3cf))  - (goliatone)
- Include payload, errors and other meta in bulk action ([1c62bcb](https://github.com/goliatone/go-admin/commit/1c62bcbf799e174f838afc2b5606bca6dfb4db58))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.25.0 ([d496d13](https://github.com/goliatone/go-admin/commit/d496d13b8155a24ced6b10306e99f47d43cc1392))  - (goliatone)

## <!-- 16 -->➕ Add

- Content list include translation setup ([582b573](https://github.com/goliatone/go-admin/commit/582b573dc77be60bf3d5e5e3ce0ea70000917c6b))  - (goliatone)
- User roles ([ab9c6de](https://github.com/goliatone/go-admin/commit/ab9c6de7b2bec41e5a822c47503d3404026630a8))  - (goliatone)
- Payload for matrix setup ([67b412b](https://github.com/goliatone/go-admin/commit/67b412b0ab0741e00b632e9f6f1d96b16876ee43))  - (goliatone)
- Udpated routes ([b71ea59](https://github.com/goliatone/go-admin/commit/b71ea591d9ca9ce09977ff217b8896376d7c5128))  - (goliatone)
- Permission matrix form gen component ([9b1c26c](https://github.com/goliatone/go-admin/commit/9b1c26cc4a33457c169d504bacfc3c935ad1ce7d))  - (goliatone)
- Translation binding queue ([60332ee](https://github.com/goliatone/go-admin/commit/60332eec73d4107920107607e9c5a930c648b55c))  - (goliatone)
- Translation queue updates ([48fc412](https://github.com/goliatone/go-admin/commit/48fc41200f754231daf3ca44483a8f334825fa3f))  - (goliatone)
- Formgen updates for translation and content ([b8f371d](https://github.com/goliatone/go-admin/commit/b8f371d13507b119e609891b6132ca9cccc7056c))  - (goliatone)
- Internal widget codes ([55f8c10](https://github.com/goliatone/go-admin/commit/55f8c100b79bcbc81c1c4087aa127cea66239638))  - (goliatone)
- Widget codes ([77d3c72](https://github.com/goliatone/go-admin/commit/77d3c7298e410bb315c017f8f9c3059f43c2f6ad))  - (goliatone)
- Template view helper ([cac2f0e](https://github.com/goliatone/go-admin/commit/cac2f0e7d5afb64a79889e1d7c26890de607eae1))  - (goliatone)
- Content type diagnostic for Doctor ([7f2547c](https://github.com/goliatone/go-admin/commit/7f2547c2213855f76392cb258e4c24c6a550a55f))  - (goliatone)
- Update facade to expose tpyes ([38de930](https://github.com/goliatone/go-admin/commit/38de9302670e113ff0a530aad68fafe6f5883129))  - (goliatone)
- Template render helper ([bbd6988](https://github.com/goliatone/go-admin/commit/bbd6988bd55fbdbd14b106fe6debb22a9c62b4fb))  - (goliatone)
- Service api workflow ([6812de3](https://github.com/goliatone/go-admin/commit/6812de374b66534465c762075a6cd113749e3f3a))  - (goliatone)
- Update templates to use SSR and hydration flow ([cd1a88d](https://github.com/goliatone/go-admin/commit/cd1a88dc6531c75b50e904dcf7034a9dc23d614c))  - (goliatone)
- Doctor panel and doctor helper ([63acd3a](https://github.com/goliatone/go-admin/commit/63acd3a5af516435fc9a20dfdfab89985f65a218))  - (goliatone)
- Content type builder ([a434ac6](https://github.com/goliatone/go-admin/commit/a434ac65f6eb3443162aad2c7d89396942af4ea1))  - (goliatone)
- Doctor panel ([03b9df7](https://github.com/goliatone/go-admin/commit/03b9df7b9a1b90a83e2d02df29f91b760cdff1ce))  - (goliatone)
- Cms env repository handle cases ([73c1e57](https://github.com/goliatone/go-admin/commit/73c1e57e250fee5af3a219862b669f5664d51ff8))  - (goliatone)
- Generate facade vs manual update ([041e8b4](https://github.com/goliatone/go-admin/commit/041e8b4cec7927e72b8d59e50121ca085fe8c671))  - (goliatone)
- Internal primite helpers ([f6aebaf](https://github.com/goliatone/go-admin/commit/f6aebafd843c8fbae9665cbe39c24855160d5a7c))  - (goliatone)
- Make menu collapsible ([8bd9b79](https://github.com/goliatone/go-admin/commit/8bd9b79bbb104798e8800f04597d3957f561c972))  - (goliatone)
- Resolve admin preference api ([546800c](https://github.com/goliatone/go-admin/commit/546800c4e8dadfc15d8b990dda14b0cb6eb7376e))  - (goliatone)
- State management for datable ([e4f94a0](https://github.com/goliatone/go-admin/commit/e4f94a03c53c4349576b1d6f67143de572ba114e))  - (goliatone)
- State management store ([0bc4fc2](https://github.com/goliatone/go-admin/commit/0bc4fc2985f0764f410ccd64e3051578b9c2998e))  - (goliatone)
- Translation readiness wiring ([b8a1301](https://github.com/goliatone/go-admin/commit/b8a130194e4b9aae39d1901ca3d00dcaa0a8fff4))  - (goliatone)
- Tools module ([e32aaa2](https://github.com/goliatone/go-admin/commit/e32aaa2e209153532cca4280a4cdfe795602dfe9))  - (goliatone)
- Maange translations in cms repo ([39bbd4b](https://github.com/goliatone/go-admin/commit/39bbd4b1508554a58206ba4fb412a6d599487e54))  - (goliatone)
- Updated client code ([6552c5c](https://github.com/goliatone/go-admin/commit/6552c5cf0680ac2db5dc72502388307cb583c7bf))  - (goliatone)
- Module registration for translation ([e551206](https://github.com/goliatone/go-admin/commit/e551206e3c5eb175a85f3e840b02b9f8f61e4489))  - (goliatone)
- Canonical policy for translation ([d8c4d28](https://github.com/goliatone/go-admin/commit/d8c4d28003f6d914a5365ee997d4530620cf767d))  - (goliatone)
- Validation run of translation setup ([740f2d2](https://github.com/goliatone/go-admin/commit/740f2d27fce3d8e3ae39cc7a71c400416114ffd6))  - (goliatone)
- Translation capabilities handling ([364ea10](https://github.com/goliatone/go-admin/commit/364ea10b129c45975649849c390aee08ad890684))  - (goliatone)
- Mangae disable nav items ([6290024](https://github.com/goliatone/go-admin/commit/62900247cb5e77ca96593eff8f9b04bebf8af7f8))  - (goliatone)
- Api URL helpers ([18a4140](https://github.com/goliatone/go-admin/commit/18a4140da52ff5508478a9f2a7d0dcdc7c029c68))  - (goliatone)
- Translation wiring setup ([9f0c83e](https://github.com/goliatone/go-admin/commit/9f0c83e6a5c90afbac876149cbe8fcbcd986de09))  - (goliatone)
- Translation module exposure ([490fc43](https://github.com/goliatone/go-admin/commit/490fc43309c03b10f1f1ab785e74ee7b32c73ef7))  - (goliatone)
- Updated datatable features ([31d1019](https://github.com/goliatone/go-admin/commit/31d1019dd43260f51c4b3924663d5eea29b29c0a))  - (goliatone)
- Update client setup ([93623df](https://github.com/goliatone/go-admin/commit/93623dfdb4dcb1e16ba167bb8540467455ab0161))  - (goliatone)
- Translation UI ([38ac445](https://github.com/goliatone/go-admin/commit/38ac445d37555db739adbc9b18d7dac18b89b702))  - (goliatone)
- Wire translation UI ([cf7ad89](https://github.com/goliatone/go-admin/commit/cf7ad8966d6df5d5e5474d1b0b11198ebe67ec47))  - (goliatone)
- Content translation UX routes ([5000a92](https://github.com/goliatone/go-admin/commit/5000a92e15c260f7e6610c48805f26b5dfaff925))  - (goliatone)
- Register translation dashboard ([b47c814](https://github.com/goliatone/go-admin/commit/b47c81464af2f05ab083fe8be793a1e5a54e8018))  - (goliatone)
- View capabilities ([373d915](https://github.com/goliatone/go-admin/commit/373d9151990bf0739ab55907aed0d59776ee7b4d))  - (goliatone)
- Register translation UI routes ([acd331c](https://github.com/goliatone/go-admin/commit/acd331c58c25ab77284da45e9e8f41eb890a45b7))  - (goliatone)
- Missing translation dashboard ([ab45fd0](https://github.com/goliatone/go-admin/commit/ab45fd0b3aad2a5cabc42184b903c7d81e599349))  - (goliatone)
- Translation bindings ([669410c](https://github.com/goliatone/go-admin/commit/669410cec1d51219d17b7129c0fb37262beb35f8))  - (goliatone)
- Client translation code ([0fb4b62](https://github.com/goliatone/go-admin/commit/0fb4b62db4b559eec0eda51303dd9f3472f95a7b))  - (goliatone)
- Translation urls ([ffdda62](https://github.com/goliatone/go-admin/commit/ffdda62054adc79d75df1d7708ee551ce0880431))  - (goliatone)
- Translation capabilites in context ([a2e6af6](https://github.com/goliatone/go-admin/commit/a2e6af613600148de6bfc18984eb4397cef470bb))  - (goliatone)
- Update boot sequence ([678bfce](https://github.com/goliatone/go-admin/commit/678bfce46c7d1ec2cc558b94bb193182ea0401e2))  - (goliatone)
- Translation exchange support new flow ([d0cfd51](https://github.com/goliatone/go-admin/commit/d0cfd515c5581b201d13dc278b14e50db0112695))  - (goliatone)
- Transition error mapping ([fc7a6c1](https://github.com/goliatone/go-admin/commit/fc7a6c11d43e95ee27aca5643bb9366bae5c8493))  - (goliatone)
- Auto save conflict error ([e166fd2](https://github.com/goliatone/go-admin/commit/e166fd262cfb531ba0f244e937fcc9e322ec6101))  - (goliatone)
- Add action boot setup ([6af04f5](https://github.com/goliatone/go-admin/commit/6af04f58c944b43fcfffc1bf322abe5441398a3d))  - (goliatone)
- Boot translation queue ([bf608bc](https://github.com/goliatone/go-admin/commit/bf608bc04f74e7581c59a6e9aecaf501fabb1cd8))  - (goliatone)
- Action disable reason code feature disabled ([f0761c5](https://github.com/goliatone/go-admin/commit/f0761c5dea11dcfa6e62cf65a1ef36d8206d4687))  - (goliatone)
- Datatable translation featues ([dad3c53](https://github.com/goliatone/go-admin/commit/dad3c53928eadcf9c9e19f541c98120d30b8603f))  - (goliatone)
- Admin boot translation queue step ([767fb4e](https://github.com/goliatone/go-admin/commit/767fb4e57f76061cf466004b3cef61a765baf022))  - (goliatone)
- Admin autosave conflict ([f7ceab3](https://github.com/goliatone/go-admin/commit/f7ceab3ddff87dd0dacd639eccab55a7097b4361))  - (goliatone)
- UI for translation ([6d9bc6b](https://github.com/goliatone/go-admin/commit/6d9bc6b8f1a8445ac96939a599b16e49ff3163ed))  - (goliatone)
- Module startup policy ([a7c4db1](https://github.com/goliatone/go-admin/commit/a7c4db1922ece438bed85483bb5a404de0412fba))  - (goliatone)
- Action state reason codes ([5444533](https://github.com/goliatone/go-admin/commit/544453312bdff5258b192c9491269d388de008d0))  - (goliatone)
- Oauth needs re-auth ([8b79c6b](https://github.com/goliatone/go-admin/commit/8b79c6b7b32cdd21eeccb4561ad494b41b190e18))  - (goliatone)
- Update templates ([988719b](https://github.com/goliatone/go-admin/commit/988719bd3a23787fe3a3b5d7ed92a3af4024322c))  - (goliatone)
- Oauth token policy ([841c3d3](https://github.com/goliatone/go-admin/commit/841c3d38468804be6456742ef422bebc1774ad55))  - (goliatone)
- Templates for resources ([b5a5ab0](https://github.com/goliatone/go-admin/commit/b5a5ab0e0816455097782678bf757f6582246897))  - (goliatone)
- Module service callback url ([1c98a90](https://github.com/goliatone/go-admin/commit/1c98a904fd821ebe7a6a33cfc63efdf15ef1c0f8))  - (goliatone)
- Transaction outbox ([5f598cd](https://github.com/goliatone/go-admin/commit/5f598cd483b15c882df628965e9a320eb3c87248))  - (goliatone)
- Services assets ([1ad1006](https://github.com/goliatone/go-admin/commit/1ad1006dc4b08b42fec64ad60b65fc744944adfb))  - (goliatone)
- Services module ([f3764c0](https://github.com/goliatone/go-admin/commit/f3764c02d7973647156fa4ccd244d425b49603fb))  - (goliatone)
- Flag to check persistence cms ([16ad2d4](https://github.com/goliatone/go-admin/commit/16ad2d456b6d83fe71d8f87e8536019b833c0526))  - (goliatone)
- Services UI ([d698352](https://github.com/goliatone/go-admin/commit/d698352f39e0717f12db9eef36b85d4c268fb0d6))  - (goliatone)
- Public and protected router ([3244d8b](https://github.com/goliatone/go-admin/commit/3244d8b7d6037fb44f66ffd4f518feb685932f02))  - (goliatone)
- Ensure menu integrity ([d9a5e1d](https://github.com/goliatone/go-admin/commit/d9a5e1d894b3242c5bc02207d8cdbef437cc38e7))  - (goliatone)
- Protected and public routes ([4561884](https://github.com/goliatone/go-admin/commit/4561884525fb3edbb3e5c5bf3dd86110eef0652d))  - (goliatone)
- Expose protected router ([8b48a2c](https://github.com/goliatone/go-admin/commit/8b48a2c9016a66178ec98a9d49cc1b6a8b9e20ee))  - (goliatone)
- Datatable column menu use filters and visual cues ([84ac117](https://github.com/goliatone/go-admin/commit/84ac117e01c60b398ae9aa0022480607f8b30464))  - (goliatone)
- Protected routes ([11e2a2f](https://github.com/goliatone/go-admin/commit/11e2a2f560d0049ad848107115440dbf12c6f00a))  - (goliatone)
- Menu integrity handler ([c0b6efb](https://github.com/goliatone/go-admin/commit/c0b6efb8551263a559ffed06494b163073f816d0))  - (goliatone)
- Workflow engine setup ([a475c69](https://github.com/goliatone/go-admin/commit/a475c692152573a812828e56c4507c63ee1757db))  - (goliatone)
- Panel entry mode ([ee305d7](https://github.com/goliatone/go-admin/commit/ee305d7b54f0ebb9661d6c9d727e2f33a0a5e9d7))  - (goliatone)
- Update entry model for profile for current user ([7d2aeea](https://github.com/goliatone/go-admin/commit/7d2aeea3720eb914802957af5d1cacdf661aa43b))  - (goliatone)
- Cms page record search matcher ([559ae7c](https://github.com/goliatone/go-admin/commit/559ae7ce0176a93c3d72347b311be1de8f642223))  - (goliatone)
- Settings bun repository defaults ([0522d4e](https://github.com/goliatone/go-admin/commit/0522d4e89f991a79a24592f8ceda1591e7956e2d))  - (goliatone)
- Panel tab scopes ([d72dc70](https://github.com/goliatone/go-admin/commit/d72dc7058a747f65b57ada59a5df1bf393b3ad3a))  - (goliatone)
- Debug panel for permissions ([0bad3b6](https://github.com/goliatone/go-admin/commit/0bad3b6fbb901f02bd005088091857671082ffe6))  - (goliatone)
- New workflow setup ([1cc7c99](https://github.com/goliatone/go-admin/commit/1cc7c995671b71e79df80428bd09a0895622202d))  - (goliatone)
- Workflow migraitons ([e452249](https://github.com/goliatone/go-admin/commit/e4522496f37eb6788a742e620b9845f6a5c03d68))  - (goliatone)
- Translation and permision handling work ([e5563d4](https://github.com/goliatone/go-admin/commit/e5563d42118dd6e6c43dc7e10171e8143952ed4e))  - (goliatone)
- With UI route mode to prefs module ([ad89db7](https://github.com/goliatone/go-admin/commit/ad89db799b1a917b7c162ea0048ddf3b1763f59f))  - (goliatone)
- Form fields to translation panel ([8e918b3](https://github.com/goliatone/go-admin/commit/8e918b390a24d091049dbc18f956891b9193e19e))  - (goliatone)
- Expose user panel configurator ([c3e0072](https://github.com/goliatone/go-admin/commit/c3e00725196baaa6befddcc823759385caaf7276))  - (goliatone)
- Module register for translation capabilities ([a4d0e97](https://github.com/goliatone/go-admin/commit/a4d0e978fb1f79295b1c7c8162b72e0d758d12d0))  - (goliatone)
- User import available/enabled to context ([daaf261](https://github.com/goliatone/go-admin/commit/daaf26130eb7fd362dda1532f0cdbe6b7fc684cf))  - (goliatone)
- Url helpers to resolve admin panel URL ([17bc0c7](https://github.com/goliatone/go-admin/commit/17bc0c7bfcf16f905eec9fc6bbb845284b04fdec))  - (goliatone)
- Bulk user import ([fb95c85](https://github.com/goliatone/go-admin/commit/fb95c856a90225666274c01bd29c157ea2aa728e))  - (goliatone)
- Admin translation capabilities ([f3a78a7](https://github.com/goliatone/go-admin/commit/f3a78a7bf73c30877e9b0004c1bf8499bc2e067d))  - (goliatone)
- Quickstart admin list contract ([191e578](https://github.com/goliatone/go-admin/commit/191e5788d3e44bc90eb62135ea1e93e6c479ce25))  - (goliatone)
- Quickstart view capabilities ([259a610](https://github.com/goliatone/go-admin/commit/259a610c3c4123f46dd7d985343b800301cc0b98))  - (goliatone)
- Permissions debug panel ([46f347f](https://github.com/goliatone/go-admin/commit/46f347fd3affd013a7ef43e7176686d6af70a51d))  - (goliatone)
- Filters and translations ([8aaf1c4](https://github.com/goliatone/go-admin/commit/8aaf1c4598e56d75f9ed9cac9a14f46b41c95232))  - (goliatone)
- Frontend tests ([7205028](https://github.com/goliatone/go-admin/commit/7205028cab4abdab404061ec7701f591ac121edc))  - (goliatone)
- Cms container include translations ([a9e7031](https://github.com/goliatone/go-admin/commit/a9e703105c6d1bb029488de5d725ee5bf993a8d9))  - (goliatone)
- Updated command messages ([dccbc66](https://github.com/goliatone/go-admin/commit/dccbc66202d40bfcd5edb22466ba1c8bd16a8e92))  - (goliatone)
- New translation errors ([eef55ad](https://github.com/goliatone/go-admin/commit/eef55ad6953ea804428b3d4ba2d50f697df331c2))  - (goliatone)
- CreateTranslation to admin cms ([3be1a4a](https://github.com/goliatone/go-admin/commit/3be1a4a6dc32ab3025f27818c9c1967b20767583))  - (goliatone)
- Bulk action for user module ([0aadcfe](https://github.com/goliatone/go-admin/commit/0aadcfebc99bd4630190b2787382f2e6647470bc))  - (goliatone)
- Facade expose translation service ([c9ad91d](https://github.com/goliatone/go-admin/commit/c9ad91d74e87cbef286b2385b576f35df53b93c0))  - (goliatone)
- Updae vite build ([d8e2da5](https://github.com/goliatone/go-admin/commit/d8e2da58e246a6ea585a79f5026ed511c9a54da8))  - (goliatone)
- Content entry routes ([9bc08e7](https://github.com/goliatone/go-admin/commit/9bc08e7d5912ef14bbd7843c42e2f2a1aec2d61f))  - (goliatone)
- Admin boot handle label normalizaiton ([26d25d8](https://github.com/goliatone/go-admin/commit/26d25d8cb2fdee22fe50ea234951c89c2fb35f3a))  - (goliatone)
- Route conflict support ([8f845df](https://github.com/goliatone/go-admin/commit/8f845df3c18a0c6615ae577ad6f5f3241bb073fe))  - (goliatone)
- Panel subresource ([c2860e6](https://github.com/goliatone/go-admin/commit/c2860e65f2353298df499b559ec6370884d377b4))  - (goliatone)
- Default template functions for panel URL ([3274b25](https://github.com/goliatone/go-admin/commit/3274b25a70de1667145faad7f813e86016c5ea4c))  - (goliatone)
- Resolve URL ([a0a2283](https://github.com/goliatone/go-admin/commit/a0a22836e1e7ec3041182c937069fe87147de8a1))  - (goliatone)
- Translation to panel ([46016c6](https://github.com/goliatone/go-admin/commit/46016c6d7c4650e07b98cd1fd1eca8fb6e0bd9d9))  - (goliatone)
- Check validation error for id, action, query, value ([28078c4](https://github.com/goliatone/go-admin/commit/28078c4eb8b7eaca0a9d34e908b1f9072252d7bd))  - (goliatone)
- Subresources for panel ([863a38a](https://github.com/goliatone/go-admin/commit/863a38a83de6fc375ac5ee753b7e78277a8e870b))  - (goliatone)
- Normalize create locale ([59d4113](https://github.com/goliatone/go-admin/commit/59d4113534f83a07a203cadb84a1c41b52343c8f))  - (goliatone)
- Create translation capability ([5c599d2](https://github.com/goliatone/go-admin/commit/5c599d2678933ad37b64bda062a9a0d3fb7a93b3))  - (goliatone)
- Implement translation queue ([9427bc7](https://github.com/goliatone/go-admin/commit/9427bc7a1fec49d8dc9d48a12026806a5d3ca922))  - (goliatone)
- Register template filter aliases ([fea6805](https://github.com/goliatone/go-admin/commit/fea68050aae180f33bde1d07e679d6ddf2366e0a))  - (goliatone)
- Translation auto create ([62bcdea](https://github.com/goliatone/go-admin/commit/62bcdeaf6e6440006814d4dcf4417d4b25b4b638))  - (goliatone)
- Tenant asset ([804f4b7](https://github.com/goliatone/go-admin/commit/804f4b79d5345fda29d92c3e4c40eb61a4ee1cb1))  - (goliatone)
- Object response ([67a4250](https://github.com/goliatone/go-admin/commit/67a4250ebd3a847e2a653980f87f336c5877e360))  - (goliatone)
- Template aliases ([49c79f8](https://github.com/goliatone/go-admin/commit/49c79f81c1a505b50433c7f684134b9abadc0c72))  - (goliatone)
- With path view context ([17a0391](https://github.com/goliatone/go-admin/commit/17a039198d882850cc60249d0a96e580c8534809))  - (goliatone)
- Translation detail ([72e76f5](https://github.com/goliatone/go-admin/commit/72e76f5f5a0e8996d5fa9a2f95f80a22b0fcb115))  - (goliatone)
- Admin layout view context api ([63735f7](https://github.com/goliatone/go-admin/commit/63735f777e9f6f1ba3f6e8a1d64c8f1596fe49ca))  - (goliatone)
- Helper method to commands ([01612f3](https://github.com/goliatone/go-admin/commit/01612f386f28a56522f56af2ce2881c7c3bc8eea))  - (goliatone)
- Ensure cms field projection ([705ecba](https://github.com/goliatone/go-admin/commit/705ecba0dcb56d60b50cc7400f71e227393ad96f))  - (goliatone)
- Validate panel activity wiring ([e8b31a6](https://github.com/goliatone/go-admin/commit/e8b31a6876f1ef8cac7f99fd63c42c111b85c20a))  - (goliatone)
- View context paths ([86a125f](https://github.com/goliatone/go-admin/commit/86a125fdc1ff8afb6bd4a3a4ab7edd9f9c472ea4))  - (goliatone)
- Icon service ([1649282](https://github.com/goliatone/go-admin/commit/164928259966bf12302d7234f349723f8727b5b0))  - (goliatone)
- Translation helpers ([35bd985](https://github.com/goliatone/go-admin/commit/35bd9856cd2c2e1810f14321e1a0bac4f7dc4c39))  - (goliatone)
- Cms content list ootpions using projected fields ([fca9ae5](https://github.com/goliatone/go-admin/commit/fca9ae57509a3fe21a5677f62794baa71c72bb42))  - (goliatone)
- Better error handling for translations ([e25fc52](https://github.com/goliatone/go-admin/commit/e25fc523ac37911bcdd8c265603a764e9f144b27))  - (goliatone)
- Translation templates and better layout handling ([1943202](https://github.com/goliatone/go-admin/commit/194320273bd3aa213dcf101d28c3ecf692a26fb2))  - (goliatone)
- Panel add action scope, icons ([5acdb8a](https://github.com/goliatone/go-admin/commit/5acdb8a7200358cb68ee7aa3e2b6d0af1aeb4c8f))  - (goliatone)
- Build admin layout view with context ([915afd0](https://github.com/goliatone/go-admin/commit/915afd02afa6e33246c135dbbb41ce0dc025c817))  - (goliatone)
- Activity reload enabled ([bf4eb0f](https://github.com/goliatone/go-admin/commit/bf4eb0febf1d455d6c8c89f0072ac825381a3705))  - (goliatone)
- Logger provider to boot ([f871420](https://github.com/goliatone/go-admin/commit/f871420a5588d76007f3604e2bbb9919cf584d00))  - (goliatone)
- Build debug session snapshot ([57c9dbe](https://github.com/goliatone/go-admin/commit/57c9dbee239f29f849a6f1aee3b1a62a512e1fb7))  - (goliatone)
- Build admin layout view context ([5137361](https://github.com/goliatone/go-admin/commit/51373617ffd66598d62ccc6a03fc7f755fa73fe2))  - (goliatone)
- Icon management in admin ([8ff5f0f](https://github.com/goliatone/go-admin/commit/8ff5f0ff6ab6a5f31801cd8c8e578c988d6cf147))  - (goliatone)
- Support translation boot ([f3c4f4b](https://github.com/goliatone/go-admin/commit/f3c4f4bd45ac8e25bdd5e1ddc1eda22cde362718))  - (goliatone)
- Export async use new logger API ([841c129](https://github.com/goliatone/go-admin/commit/841c129a1e7b3bb281614e84dc94ec027c4281c5))  - (goliatone)
- Support for random icons ([5e2fd34](https://github.com/goliatone/go-admin/commit/5e2fd341b81f7d25a2f942a46187b755f6a4db3f))  - (goliatone)
- Render menu icon using helper ([f32fe0c](https://github.com/goliatone/go-admin/commit/f32fe0c5cdc1a3b7f5c366f8583ad74da8390f7f))  - (goliatone)
- Include context in UI routes ([54e3bcc](https://github.com/goliatone/go-admin/commit/54e3bcc9149e29931f67de65e91ce8d578cc124d))  - (goliatone)
- Translation readiness ([31b8ced](https://github.com/goliatone/go-admin/commit/31b8cede91556e5d8812439b60308b3eb3953760))  - (goliatone)
- Admin panel action wiring ([7f1ece8](https://github.com/goliatone/go-admin/commit/7f1ece866378773bd42de0f1fa837f340cb516d6))  - (goliatone)
- Layout view context ([724fc66](https://github.com/goliatone/go-admin/commit/724fc6643dde129e93b6cc08828505f99c56812b))  - (goliatone)
- Quickstart UI feature context ([3703ba1](https://github.com/goliatone/go-admin/commit/3703ba1b861ec4053a928451bb924138f0270d33))  - (goliatone)
- Quickstart translation feature ([97427e2](https://github.com/goliatone/go-admin/commit/97427e29302aeddf5d0d1e51b531c146e513e1dc))  - (goliatone)
- Upload handler ([7a31d8e](https://github.com/goliatone/go-admin/commit/7a31d8e9c98a51afbcb55f8a32fba1d3763ec1c8))  - (goliatone)
- Update action logic in menus ([30443f1](https://github.com/goliatone/go-admin/commit/30443f122f114e5a299bdadfa8e2b6b0630caa7a))  - (goliatone)
- Scoped logging ([6ef4741](https://github.com/goliatone/go-admin/commit/6ef47413939f6cf5a2793ef4eb2c32233e45749f))  - (goliatone)
- Debug view update filters ([34cc563](https://github.com/goliatone/go-admin/commit/34cc5635c24d176261fa3c6a04a0605ae5f35d03))  - (goliatone)
- Admin scoped logger ([21ab83c](https://github.com/goliatone/go-admin/commit/21ab83cd5f24e1a41b85914dc38ede8ee6508a92))  - (goliatone)
- Logger admin setup ([5116532](https://github.com/goliatone/go-admin/commit/5116532635d1591c756e64aadc247e08ce043e5c))  - (goliatone)
- Logger to placeholders ([94e40b0](https://github.com/goliatone/go-admin/commit/94e40b06deafcf3a2e2e7df4bb51b408b2570c75))  - (goliatone)
- Logger to regsitry ([b05f6de](https://github.com/goliatone/go-admin/commit/b05f6de0c1291c118e2becbb227aac6272db706f))  - (goliatone)
- Cms list option derived fields ([6a9acfd](https://github.com/goliatone/go-admin/commit/6a9acfdbb02b1b220f5a66d7c3c0984773ab1999))  - (goliatone)
- Integrate logger in bootstrap ([ad4bdeb](https://github.com/goliatone/go-admin/commit/ad4bdeb43a6190fe6932c5b6b4c2a9e4a1e85186))  - (goliatone)
- Better error handling in auth UI ([a15646d](https://github.com/goliatone/go-admin/commit/a15646d99ea35dbd50ba05f6d02d5c86e2ca802f))  - (goliatone)
- Content type route builder ([252f43a](https://github.com/goliatone/go-admin/commit/252f43aae0c77143f435b22ca1495f33edc79ce2))  - (goliatone)
- Quickstart loggin setup ([9158f07](https://github.com/goliatone/go-admin/commit/9158f07d45b935233393eb6e63bad6a30a636ec4))  - (goliatone)
- Attach debug log bridge ([183f89a](https://github.com/goliatone/go-admin/commit/183f89a16aa1b938603f668b9e0921e5f553c98a))  - (goliatone)
- Support for content fields ([6f3fe78](https://github.com/goliatone/go-admin/commit/6f3fe786b6849c7d962d43b4f1d76027434b97b1))  - (goliatone)
- Support for centralized logging ([90cdd3f](https://github.com/goliatone/go-admin/commit/90cdd3fefa93c02479e20d2d30698c0d4e85bc88))  - (goliatone)
- Feature unavailable handler ([6ae1f6b](https://github.com/goliatone/go-admin/commit/6ae1f6b39b54837615611a904e4a13ac8a8861d9))  - (goliatone)
- Provider commands to dashboard ([9b88597](https://github.com/goliatone/go-admin/commit/9b885977ca0c120a2870ea924efa8012150d49cf))  - (goliatone)
- Refactoring logging to integrate all packages ([6f06db8](https://github.com/goliatone/go-admin/commit/6f06db8da5196c6c169e2a10bc3ac4b8cff3a206))  - (goliatone)
- Content field sortable ([58362ed](https://github.com/goliatone/go-admin/commit/58362edd611e89a900dbc22897b4a9aa522e0502))  - (goliatone)
- Logger wiring for fiber server ([26c2b40](https://github.com/goliatone/go-admin/commit/26c2b409ea99e234cb3c4e0ab0ca5a213b23d43d))  - (goliatone)
- List records to handle datagrid ([42cffff](https://github.com/goliatone/go-admin/commit/42cffff5127d909dec3496e2f8f24e3a80f99682))  - (goliatone)
- Translation exchange ([8d679db](https://github.com/goliatone/go-admin/commit/8d679db540ccdd60c44c7422d6f5cbffc6da9cfd))  - (goliatone)
- Data migration ([40f8884](https://github.com/goliatone/go-admin/commit/40f88847d6204d53037c51b5e6c9ff8f82191e35))  - (goliatone)
- Translation routes for ui ([72c848f](https://github.com/goliatone/go-admin/commit/72c848f4334042c9e6524830a0a09f1b9f75f718))  - (goliatone)
- Transltaion queue ([d61b9e4](https://github.com/goliatone/go-admin/commit/d61b9e421f30a65531e0aff2e5d10bd23876833b))  - (goliatone)
- Translation bootstrap config ([c9df5fc](https://github.com/goliatone/go-admin/commit/c9df5fcd22c47462b4c5489eb65d06d4a5653816))  - (goliatone)
- Translation queue tabs ([3490d9c](https://github.com/goliatone/go-admin/commit/3490d9c9ca8ff5fc3d3da17cf0ed72d9a37241a3))  - (goliatone)
- Translation exchange ui ([9a0a53d](https://github.com/goliatone/go-admin/commit/9a0a53d0fba051a3d73747ff485c94676050785b))  - (goliatone)
- Translation queue ([91ebd18](https://github.com/goliatone/go-admin/commit/91ebd181daa472f05de337a7e57e735221c0da9e))  - (goliatone)
- Feature gates for translation exchange ([073ddab](https://github.com/goliatone/go-admin/commit/073ddab521fee8d028cf1540105cfb83ba61cb06))  - (goliatone)
- Translation workflow ([c534a03](https://github.com/goliatone/go-admin/commit/c534a03d2e9e21574f6584bbde02e89127d2ffe3))  - (goliatone)
- Transltaion workflow ([60e9740](https://github.com/goliatone/go-admin/commit/60e97403d6c4d7b490005143ff6ceb507c616bfb))  - (goliatone)
- Register translation widget ([969a0c9](https://github.com/goliatone/go-admin/commit/969a0c9e2e355dadd34b1dad619791184371808c))  - (goliatone)
- Feature check for translation exchagne ([bb2493e](https://github.com/goliatone/go-admin/commit/bb2493e678a42b6bbaa20195fb5f95f6cc96af29))  - (goliatone)
- Udpate error codes ([4550a48](https://github.com/goliatone/go-admin/commit/4550a48cc619bebe6e7a15f19fbdfdc9f41d9ce2))  - (goliatone)
- Translation preferences ([7a71563](https://github.com/goliatone/go-admin/commit/7a71563fa14261a1768e8d1c5e21595f49bfddd4))  - (goliatone)
- Feature setup ([b966e31](https://github.com/goliatone/go-admin/commit/b966e31c552cade74c131d77282d536c770508b6))  - (goliatone)
- Translation workflow setup ([bf9f7ea](https://github.com/goliatone/go-admin/commit/bf9f7ea4a54df129b7b377c3b5cc22b40117ef1e))  - (goliatone)
- Translation queue dashboard ([53e09a1](https://github.com/goliatone/go-admin/commit/53e09a165f901e756da46d3ed9eebe747815133b))  - (goliatone)
- Permission matrix setup ([e4cfc55](https://github.com/goliatone/go-admin/commit/e4cfc558f2a3a3c0a4af488d6dd7c9cacc904062))  - (goliatone)
- Translation queue, exchange, and assignment ([23d8968](https://github.com/goliatone/go-admin/commit/23d89680db738f0af1d1136e2b39b0a9c7120663))  - (goliatone)
- Support for bulk update users ([0cfc5c2](https://github.com/goliatone/go-admin/commit/0cfc5c2806ba7311a579cf01af8f0c01267239a2))  - (goliatone)
- Translation exchnge workflow ([b247a39](https://github.com/goliatone/go-admin/commit/b247a39d9f362af080a5ddf30de921a10d3808f8))  - (goliatone)
- Translation policy ([c443c51](https://github.com/goliatone/go-admin/commit/c443c51d6e52c8ea4657a2807fbb51418748684c))  - (goliatone)
- Udpated error codes for translation workflow ([f865c89](https://github.com/goliatone/go-admin/commit/f865c8939fba4bd9bd2680d47a6607639c967b70))  - (goliatone)
- Dashboard router register ([6f39742](https://github.com/goliatone/go-admin/commit/6f39742d437d3e61f4e7aa1c376cf4b3c6b88b3c))  - (goliatone)
- Bulk actions in panel definition ([2ff9cfa](https://github.com/goliatone/go-admin/commit/2ff9cfa7ba2e9003ae24432b0d2c86ae03f701af))  - (goliatone)
- Implement actions in panels ([dd8638b](https://github.com/goliatone/go-admin/commit/dd8638b9f1f5cc8a30d527dc8c048ebaca6c069b))  - (goliatone)
- Action payload validation ([1c35770](https://github.com/goliatone/go-admin/commit/1c35770bd481ff27aa64cbf7b69bd307839a6ed3))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Use widget name const ([90d52ac](https://github.com/goliatone/go-admin/commit/90d52ac9118c336cdfd5fa2c8fcdf77a57c62828))  - (goliatone)
- Dashboard use structs for widgets ([2bedc50](https://github.com/goliatone/go-admin/commit/2bedc50beebd46b53da23df568979ff4d786a60d))  - (goliatone)
- Dashboard rendering mode, SSR default ([6aae6f4](https://github.com/goliatone/go-admin/commit/6aae6f41f119f1bf146b5f91ea33450de1b8455e))  - (goliatone)
- Clean up code ([09f3f6d](https://github.com/goliatone/go-admin/commit/09f3f6d482a59700f4350f67ad16cfab964ed258))  - (goliatone)
- Make code more compact ([9c58c2d](https://github.com/goliatone/go-admin/commit/9c58c2dfd884314920a540760ab27fe2a61354bc))  - (goliatone)
- Use tree vs concrete content types ([64f6968](https://github.com/goliatone/go-admin/commit/64f6968fef75068347f974735138420627611e4c))  - (goliatone)
- Navigation setup ([408b340](https://github.com/goliatone/go-admin/commit/408b3404a5ead8a2f3e8bfe8e4947719c27e8be3))  - (goliatone)
- State management for datagrid ([c69f2d7](https://github.com/goliatone/go-admin/commit/c69f2d749af41237f06328e78906c0e96610d05f))  - (goliatone)
- Js out of templates ([3b871ed](https://github.com/goliatone/go-admin/commit/3b871ed9ac9055892eb82ac68c682329bb37aaa8))  - (goliatone)
- Use url manager ([7952dfb](https://github.com/goliatone/go-admin/commit/7952dfba89dcfe04afe903afe63d212ce5e2be90))  - (goliatone)
- Inject paths to view context ([be0ebdc](https://github.com/goliatone/go-admin/commit/be0ebdc6c7ba3eb613a7e63088f014d557f47f77))  - (goliatone)
- Translation capabilities model ([15777b9](https://github.com/goliatone/go-admin/commit/15777b9667fca9c6ed6858d1eac786949ba6d8c7))  - (goliatone)
- Router definition ([ba899b9](https://github.com/goliatone/go-admin/commit/ba899b90b7eccfcce54d983ac41603192dfe7f13))  - (goliatone)
- Resource views to incorporate latest features ([59cab9f](https://github.com/goliatone/go-admin/commit/59cab9f36f48ec5080302aecca4cb1979c6ffeb9))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.24.0 ([ab3950f](https://github.com/goliatone/go-admin/commit/ab3950fc3d82acea13fea967c37672bc9137068c))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate tests ([e959a11](https://github.com/goliatone/go-admin/commit/e959a11ef442ff7a7f45defd75e119a93959c9c2))  - (goliatone)
- Update gitignore ([b868c32](https://github.com/goliatone/go-admin/commit/b868c32493ee1177e5f022af14e1567e94fe7bc4))  - (goliatone)
- Update guides ([d657861](https://github.com/goliatone/go-admin/commit/d6578611c44e66644b3e2d6ca76ae32c5ee98554))  - (goliatone)
- Update readme ([6f5ce11](https://github.com/goliatone/go-admin/commit/6f5ce11211254a5611b31908674df9e0caa818fe))  - (goliatone)
- Update examples ([7bfaac7](https://github.com/goliatone/go-admin/commit/7bfaac7bca6a6e30192abb30f8f6a179c77580fd))  - (goliatone)
- Update test ([acc658c](https://github.com/goliatone/go-admin/commit/acc658c77eaf05bf0656a903869c5df1c82f0d06))  - (goliatone)
- Update tasks ([f84d720](https://github.com/goliatone/go-admin/commit/f84d7203b9e1e75ad2edbc1f9e6a687dbbdfb938))  - (goliatone)
- Clean code ([e6fa5c0](https://github.com/goliatone/go-admin/commit/e6fa5c07f969fdb531d19b0d693b80f743c4a4a0))  - (goliatone)
- Update deps ([752be84](https://github.com/goliatone/go-admin/commit/752be845da069aa0e34c480437419383cb7e46f0))  - (goliatone)
- Update docs ([c8e3f41](https://github.com/goliatone/go-admin/commit/c8e3f411affac79a2b57646f52140fc94da1b908))  - (goliatone)
- Update task to check service contracts ([e0be5a4](https://github.com/goliatone/go-admin/commit/e0be5a458b138e433d4fd97fe652ff94e8ee1221))  - (goliatone)
- Udpate docs ([929bda9](https://github.com/goliatone/go-admin/commit/929bda9e5f269f8616a165f0f007e7a5948791a7))  - (goliatone)
- Update example ([1e6aad1](https://github.com/goliatone/go-admin/commit/1e6aad1fbef85d05616c442623d8102211d4b50f))  - (goliatone)
- Update format ([d39a099](https://github.com/goliatone/go-admin/commit/d39a099b8750ee8825a3709ce46d4fdb02a9a483))  - (goliatone)
- Udpate deps ([2568f43](https://github.com/goliatone/go-admin/commit/2568f43488f86f4c7abb76739e0a77c1e64d0462))  - (goliatone)
- Update tests ([75fcf6d](https://github.com/goliatone/go-admin/commit/75fcf6da3b445c6eaab6ba179a029e25c3343892))  - (goliatone)
- Ignore build hash ([9eb4936](https://github.com/goliatone/go-admin/commit/9eb4936f890ab40ac07b46ed9dc79c3629043085))  - (goliatone)
- Udpate example ([b50963e](https://github.com/goliatone/go-admin/commit/b50963ed11c8a5ca92cfc9c129f14e934a223ad6))  - (goliatone)
- Udpate readme ([7a22e77](https://github.com/goliatone/go-admin/commit/7a22e7767e3c9f4216a06c1192a714b30133178d))  - (goliatone)
- Clean up code ([7606bf1](https://github.com/goliatone/go-admin/commit/7606bf13852c43c8242ea4343a951546ac496fe7))  - (goliatone)

# [0.24.0](https://github.com/goliatone/go-admin/compare/v0.23.0...v0.24.0) - (2026-02-09)

## <!-- 1 -->🐛 Bug Fixes

- Normalize string value in blocks ([87d337f](https://github.com/goliatone/go-admin/commit/87d337f05921cefba8b6f7b171df29a1261bca7a))  - (goliatone)
- Blick item library picker ([9d5d9dd](https://github.com/goliatone/go-admin/commit/9d5d9dd4c98c5e841d525de3c92f196a0fde7213))  - (goliatone)
- Use patch options in repository ([8cf5798](https://github.com/goliatone/go-admin/commit/8cf5798c7fb49bd163335dc4d155956a2d211fc5))  - (goliatone)
- Serialize error before passing to template ([60005d6](https://github.com/goliatone/go-admin/commit/60005d6fff947587b56277067a402f2514c3d0b5))  - (goliatone)
- Use block library picker ([5fe374b](https://github.com/goliatone/go-admin/commit/5fe374b8c3dc8b7149cc1dd883d5afcb96852c16))  - (goliatone)
- Enforce preview in content routes ([3aa605d](https://github.com/goliatone/go-admin/commit/3aa605d7f835ed854e7e513570bc49070892d4bd))  - (goliatone)
- Public api path cleaning ([959feb8](https://github.com/goliatone/go-admin/commit/959feb837328042b6272b8bb7785c65ca297b67b))  - (goliatone)
- Explicit replace capabilities ([c61188f](https://github.com/goliatone/go-admin/commit/c61188f11f1f2b2d90f44b2aa7c5d724d2bf76e8))  - (goliatone)
- Filters and list setup ([a02cc0b](https://github.com/goliatone/go-admin/commit/a02cc0bf4c3fe41b482292fc778bb35c59972640))  - (goliatone)
- Dashboaard widgets ([f863f6e](https://github.com/goliatone/go-admin/commit/f863f6eb3ccb470ee003c771208c38c634f4fb88))  - (goliatone)
- Type editor item order, unified templates for resources ([3944b69](https://github.com/goliatone/go-admin/commit/3944b69d08646a9a7df82bd448e55cf566ef0339))  - (goliatone)
- Prevent multiple entries of the same widget on load ([054c364](https://github.com/goliatone/go-admin/commit/054c364a0bdcec8960e50c8ad4aa734bed69789d))  - (goliatone)
- Expose with translations and content list option in facace ([3dcd963](https://github.com/goliatone/go-admin/commit/3dcd963a18f50087066436fe1d0c73fa63deeea9))  - (goliatone)
- Use base list template ([abdb189](https://github.com/goliatone/go-admin/commit/abdb189e7020f31d2da32215fbff190aeab1f73f))  - (goliatone)
- Content build order, preview order ([c494244](https://github.com/goliatone/go-admin/commit/c4942449ab31ef122b6cbcb1108460fae9781244))  - (goliatone)
- User module icon ([ec1d4d6](https://github.com/goliatone/go-admin/commit/ec1d4d6b455a0227f7d92fb6f293dc79f3aacb30))  - (goliatone)
- Use generic route ([a2bbbb3](https://github.com/goliatone/go-admin/commit/a2bbbb336de5cc4b6ccb137c1f80f4493f0cf6a0))  - (goliatone)
- Rename menu items ([5091ce0](https://github.com/goliatone/go-admin/commit/5091ce0db9c34b496867e0eda85856754dcdb609))  - (goliatone)
- Register activity module from users module ([20a6635](https://github.com/goliatone/go-admin/commit/20a66353a85d009c880b1b320fc11db846282f68))  - (goliatone)
- Use snake_case for config ([e3ef3fc](https://github.com/goliatone/go-admin/commit/e3ef3fc7e2935334c5362c216659e05beb1d3706))  - (goliatone)
- Use api base route ([293a50b](https://github.com/goliatone/go-admin/commit/293a50b008f6a1cd9fdfc0ee9255b395b876e2c5))  - (goliatone)
- Debug console styling ([c17944b](https://github.com/goliatone/go-admin/commit/c17944b581be11bd1315126c8bcc15a7787d4977))  - (goliatone)
- Dynamic menu item position ([3204da5](https://github.com/goliatone/go-admin/commit/3204da5d0b469132120618922a19406d9743ca49))  - (goliatone)
- Update route helpers ([8e33b8a](https://github.com/goliatone/go-admin/commit/8e33b8a2c8f7462106d8261600dfeefa186561f6))  - (goliatone)
- Set base path in feature falgs module ([bfa25c4](https://github.com/goliatone/go-admin/commit/bfa25c41011320be96cfe9abf001e67b81aec888))  - (goliatone)
- Filter handling ([3129429](https://github.com/goliatone/go-admin/commit/3129429f01750a3e5a636bb1e0b7eb66a559a067))  - (goliatone)
- Run menu registration in order to catch strays ([5a2f65a](https://github.com/goliatone/go-admin/commit/5a2f65a54e09ecdd2b8c8278d6c2c10f7157ed16))  - (goliatone)
- Handling runtime assets ([3752b05](https://github.com/goliatone/go-admin/commit/3752b050eac5a94bf9d7425646275cd3b4f5981b))  - (goliatone)
- Admin handling missing menus ([585c01f](https://github.com/goliatone/go-admin/commit/585c01f321ffe3c4adb4ca3429e412fdb5e8e9a1))  - (goliatone)
- Block library picker setup ([a0d7291](https://github.com/goliatone/go-admin/commit/a0d7291f3557fb5e4b924b20419f990415657ef7))  - (goliatone)
- Error code mapping for cms content types ([3a0bd6e](https://github.com/goliatone/go-admin/commit/3a0bd6efc3a373cf7a40eb0d2d4986230c96d638))  - (goliatone)
- Check if shcmea provided in repo ([489fb11](https://github.com/goliatone/go-admin/commit/489fb11b6094b204c4b2d050ef132cfeed5b8862))  - (goliatone)
- Normalize content type errors ([29f7f7f](https://github.com/goliatone/go-admin/commit/29f7f7fde99739435a2052e71e5f02b6792a5c29))  - (goliatone)
- Expose cateogry in block editor ([a4d6285](https://github.com/goliatone/go-admin/commit/a4d628598d9fb6681f509d765fe6fa49b4bfd3f6))  - (goliatone)
- Merge schema ([67d47ac](https://github.com/goliatone/go-admin/commit/67d47acb1c323204610110146c2d0fd05470b8fe))  - (goliatone)
- Forms use json gui editor ([52b41dc](https://github.com/goliatone/go-admin/commit/52b41dcaf1737ecacebcbb7fedd3580272e5ed1b))  - (goliatone)
- Publish flow for content type ([084c923](https://github.com/goliatone/go-admin/commit/084c923f25a2d8da6514f9a13e7ceb584623a30d))  - (goliatone)
- Include base path to runtime assets ([b183d94](https://github.com/goliatone/go-admin/commit/b183d94915669aff5f2dafbeaf32f36d223e4530))  - (goliatone)
- Collector nil return view context ([def82bb](https://github.com/goliatone/go-admin/commit/def82bb8079f8280c35f32c22c71afde239847e1))  - (goliatone)
- Cms store ([348cfe2](https://github.com/goliatone/go-admin/commit/348cfe24b954466b1785ba46cf2f9eb6f481a25e))  - (goliatone)
- Cms memory store ([7f1d540](https://github.com/goliatone/go-admin/commit/7f1d540166a614ee8af50c3b6119e937c0c37352))  - (goliatone)
- Debug integration address sanitization ([9b6d9f1](https://github.com/goliatone/go-admin/commit/9b6d9f11560ca938c491975ff4de16fd5761eba5))  - (goliatone)
- Repository CMS handling of ID/slug ([738a05c](https://github.com/goliatone/go-admin/commit/738a05cf445b6d5879adb72c3029133e814c57eb))  - (goliatone)
- Resolve content type id ([ee16592](https://github.com/goliatone/go-admin/commit/ee16592fac7d7eb135fde2b90afbb98ca4be4bdc))  - (goliatone)
- Normalize seed permissions ([efd21e7](https://github.com/goliatone/go-admin/commit/efd21e76b30353476d867cd6efb86f3675b629ae))  - (goliatone)
- Fiber provides pointer strings which get corrupted ([a4c8e33](https://github.com/goliatone/go-admin/commit/a4c8e330e210559315759995835db86374dba4d1))  - (goliatone)
- Content type and block editor issues ([a164a56](https://github.com/goliatone/go-admin/commit/a164a56be64a961d52d7772ddd093b9280d80c6f))  - (goliatone)
- Strip unsupported schema keywords ([74aa026](https://github.com/goliatone/go-admin/commit/74aa026d1d38a176be45f8f8951ee5a9c996a3bd))  - (goliatone)
- Update cms types ([c070c86](https://github.com/goliatone/go-admin/commit/c070c86c201f029a98837d3bcca994086c5244ca))  - (goliatone)
- Request display in debug console ([f01cd18](https://github.com/goliatone/go-admin/commit/f01cd18ad59cb500541a9710af11cf9401e19386))  - (goliatone)
- Use route clash detection ([8e633ab](https://github.com/goliatone/go-admin/commit/8e633ab42416226f36e20cec8649396d9cdfb352))  - (goliatone)
- Content type builder use expire ts ([2773052](https://github.com/goliatone/go-admin/commit/277305280c01a037190dbc9cc82e66e73cfd3ad7))  - (goliatone)
- Content type builder block editor ([4a7626f](https://github.com/goliatone/go-admin/commit/4a7626fda71b8d9b15e1ad664cb19a53283b81aa))  - (goliatone)
- Update api client and block library for content type builder ([8cb1045](https://github.com/goliatone/go-admin/commit/8cb1045e7750fcb5f170aed11a56ee283b4887aa))  - (goliatone)
- Repository output ([eb344f5](https://github.com/goliatone/go-admin/commit/eb344f5741db7c51f1012a9e106a26c60defff40))  - (goliatone)
- Block definition filter use slug and type ([7653776](https://github.com/goliatone/go-admin/commit/7653776afef9329515ef8ccadf1e77d13d2cf550))  - (goliatone)
- Content type builder addres registry type ([62eb25f](https://github.com/goliatone/go-admin/commit/62eb25fce542e6c349c3bfd744260ea594153e7e))  - (goliatone)
- Verify identity ([3104f26](https://github.com/goliatone/go-admin/commit/3104f260585b57ccfe02f71daf093fc947703616))  - (goliatone)
- Remove duplicated case ([b14692b](https://github.com/goliatone/go-admin/commit/b14692b8805b13524427795b1c0574546f26f700))  - (goliatone)
- Schema preview action ([41dc6f5](https://github.com/goliatone/go-admin/commit/41dc6f535628aa567f95c4d2e94af3f694d31963))  - (goliatone)
- Filter locale in the go-cms adapter ([82c4c39](https://github.com/goliatone/go-admin/commit/82c4c39f8415b0f6cbbf67a9299e75ffdff00397))  - (goliatone)
- Content type builder fix actions ([d85dbc9](https://github.com/goliatone/go-admin/commit/d85dbc93f26e78154c7d34a455e35ee1f51c643b))  - (goliatone)
- Register providers ([2bd2c17](https://github.com/goliatone/go-admin/commit/2bd2c17c5370a9dc9a126df5a0380730e48ffd02))  - (goliatone)
- Panel instance tracking ([aeaa06f](https://github.com/goliatone/go-admin/commit/aeaa06f5e490f1fcb585aee71b8217b371f6008b))  - (goliatone)
- Content type module definition ([a9fd484](https://github.com/goliatone/go-admin/commit/a9fd4848b1b90908d7158f584ff6558cf0249d07))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.24.0 ([641fbcb](https://github.com/goliatone/go-admin/commit/641fbcbe92d6ebc01a3e1aa015a95ce205673da7))  - (goliatone)

## <!-- 16 -->➕ Add

- Bun patch allowed fields option ([c2915ac](https://github.com/goliatone/go-admin/commit/c2915ac4286972dbbb998caf4edee8b6633f9f71))  - (goliatone)
- Debug handle error pages ([b322182](https://github.com/goliatone/go-admin/commit/b322182c90220080cc1dabc13b48960dbddd2488))  - (goliatone)
- Replace capabilities to cms content type ([b6ffdde](https://github.com/goliatone/go-admin/commit/b6ffddedaa837c7dfaa8f7298eb67464b2c61e76))  - (goliatone)
- Parse options using generics ([7e7eac4](https://github.com/goliatone/go-admin/commit/7e7eac4567bdb67074404c4c4419d51f63a547c6))  - (goliatone)
- Include error source and other meta ([90d2b6f](https://github.com/goliatone/go-admin/commit/90d2b6fdf569bc0eeaf67d2d4487d5a208da8cf9))  - (goliatone)
- Ensure leading slash ([629e666](https://github.com/goliatone/go-admin/commit/629e6665d62bac714bd993d4df5c118db536561c))  - (goliatone)
- ActivityTabPermissionFailureMode to tab handler ([6b1a49b](https://github.com/goliatone/go-admin/commit/6b1a49b4e575d6d5c2fe20cf8e8584b6c0c3cb76))  - (goliatone)
- Error source ([66b7bc1](https://github.com/goliatone/go-admin/commit/66b7bc1790c9f79b2f4498535a141a6898d634ea))  - (goliatone)
- Content tab style ([67a9c1c](https://github.com/goliatone/go-admin/commit/67a9c1ca73ac128d07e65a544969f416b8aab0c1))  - (goliatone)
- Tabs handler ([173a2ff](https://github.com/goliatone/go-admin/commit/173a2ffbeeb685a40961921af25bdb6aea60941a))  - (goliatone)
- New profile record code ([443b18b](https://github.com/goliatone/go-admin/commit/443b18b495d8a6097f0d8fdb01a8397b7284652e))  - (goliatone)
- In memory store helper ([052dcbf](https://github.com/goliatone/go-admin/commit/052dcbf9e80d04f64866eb0041e468676c3c3a87))  - (goliatone)
- New detail view ([0ebf177](https://github.com/goliatone/go-admin/commit/0ebf177fad35c7430cc2a62247faef7b639b6ab5))  - (goliatone)
- Normalization helpers ([3034296](https://github.com/goliatone/go-admin/commit/3034296aaa503e98829dcc26bec4290dea10827c))  - (goliatone)
- Domain errors ([1abc90f](https://github.com/goliatone/go-admin/commit/1abc90f298441c69ee2d3e7d1a9dff4f6e0f776e))  - (goliatone)
- Filters to settings ui ([537e55f](https://github.com/goliatone/go-admin/commit/537e55f777236fc92704b1e2dcb2161bb91a291a))  - (goliatone)
- Filters to roles ui ([f122b10](https://github.com/goliatone/go-admin/commit/f122b105d977a9143536e8cf4d001d4b7466a1c4))  - (goliatone)
- Has instance for definition check ([8739117](https://github.com/goliatone/go-admin/commit/8739117eb02a8e563b09c44953abb0de3002a99e))  - (goliatone)
- Use predicates for list ([f073ef5](https://github.com/goliatone/go-admin/commit/f073ef5a4a95895c666f728851e52fc112b02678))  - (goliatone)
- Prepend implicit tags ([f360bb6](https://github.com/goliatone/go-admin/commit/f360bb6d57bdf3794607f3a4bdb11828554ffbd5))  - (goliatone)
- List predicates ([7be4556](https://github.com/goliatone/go-admin/commit/7be4556e6f7a9abc199ab4ecee92b2902b4a7a6b))  - (goliatone)
- Listquery helper ([a4d6d56](https://github.com/goliatone/go-admin/commit/a4d6d5601d203b419eeb14dc7ca7d201a643ac31))  - (goliatone)
- Use list content with translations ([8c8d139](https://github.com/goliatone/go-admin/commit/8c8d139beb7d4fe19b76ce100ad1bee3d6d67cec))  - (goliatone)
- Admin resolve panel tabs ([cc0e855](https://github.com/goliatone/go-admin/commit/cc0e8552c92377322a9dd93f0f448b9650d806a5))  - (goliatone)
- Content filters fallback ([c614435](https://github.com/goliatone/go-admin/commit/c6144358daeed5998606869f2e2719323d068727))  - (goliatone)
- Debug flags ([c7b956c](https://github.com/goliatone/go-admin/commit/c7b956c6b4469f889515a6bddcd4d6615671eec6))  - (goliatone)
- Debug remote handler ([51d483f](https://github.com/goliatone/go-admin/commit/51d483fc14445eb54d21e45a634e51ff00b55ed1))  - (goliatone)
- Password hash ([e18808f](https://github.com/goliatone/go-admin/commit/e18808fe045334f07dcf9c14e310950f0ce59c42))  - (goliatone)
- Debug user session store ([a735702](https://github.com/goliatone/go-admin/commit/a735702052c89a8a26405875c1ef46849bde1dc5))  - (goliatone)
- List sessions ([272fbb6](https://github.com/goliatone/go-admin/commit/272fbb63241a8ee4fbab1e3fc2f3ad86a5d2341d))  - (goliatone)
- Urls for sessions ([6cf09c5](https://github.com/goliatone/go-admin/commit/6cf09c5edcb0ca7badd5ca7fd0b32da1397a4481))  - (goliatone)
- Expose debug user session and session store in facade ([dbd500c](https://github.com/goliatone/go-admin/commit/dbd500c1d3f8b5b64a8ea21d7fd498ea6ef68889))  - (goliatone)
- Cms content list options ([327351e](https://github.com/goliatone/go-admin/commit/327351e7f3a9474ed41cb590d2caf03194142541))  - (goliatone)
- Debug panels for multi session ([b98a639](https://github.com/goliatone/go-admin/commit/b98a639839ba8cf454d3697a1f82ec299692fef5))  - (goliatone)
- Session ID from context ([3768012](https://github.com/goliatone/go-admin/commit/3768012e3581381d1e11d35b97a4f885981fb4ef))  - (goliatone)
- Debug session store ([219873a](https://github.com/goliatone/go-admin/commit/219873a0d65f8965a4e466cdbd7d4e7a955dd45a))  - (goliatone)
- Debug panel handle sessions; ([4be0b7e](https://github.com/goliatone/go-admin/commit/4be0b7eb653e97312da7676db42cc9af2f7ce1e0))  - (goliatone)
- Debug user sessions ([d99c015](https://github.com/goliatone/go-admin/commit/d99c015065eb436cfe8953f0ce4a0aba25279b51))  - (goliatone)
- New debug permission roles ([44b9006](https://github.com/goliatone/go-admin/commit/44b9006f813a15db01b12c0a44c6c0c9353847b1))  - (goliatone)
- Debug activity session ([c6b7f23](https://github.com/goliatone/go-admin/commit/c6b7f237e763d0ebe8d6d230e5adcc244bd6c2f7))  - (goliatone)
- Debug session ([e294c00](https://github.com/goliatone/go-admin/commit/e294c00a1007e258e763fac49f78dea3bc04efd5))  - (goliatone)
- Register admin roles ([ea73eb9](https://github.com/goliatone/go-admin/commit/ea73eb9d8944ceac82678aa7833122f025f563df))  - (goliatone)
- Update styles ([92a0d0c](https://github.com/goliatone/go-admin/commit/92a0d0c880f0971cef83611d6229535b0cc0ec8f))  - (goliatone)
- Expose user settings methods in facade ([ddc5c24](https://github.com/goliatone/go-admin/commit/ddc5c243ca5178bafe002ec66d896d851d6cf6c4))  - (goliatone)
- Users profile to user module ([2b290ce](https://github.com/goliatone/go-admin/commit/2b290ce14023370963ddbe5130ce29abae6d54b5))  - (goliatone)
- More managed routes ([1019514](https://github.com/goliatone/go-admin/commit/1019514aefc73d4d8268c1ad4e1ba5fd32b620d4))  - (goliatone)
- Init hooks to admin ([0509f57](https://github.com/goliatone/go-admin/commit/0509f57c5e40d309c97fe29841032757cd8295f7))  - (goliatone)
- Admin page routes ([ac89643](https://github.com/goliatone/go-admin/commit/ac8964384bb59fe023537cfa0ad616049846281c))  - (goliatone)
- Templates for settings ([6e279e9](https://github.com/goliatone/go-admin/commit/6e279e93c16581d394a5154f9bc69421a5f28143))  - (goliatone)
- Settings ui quickstart ([370a657](https://github.com/goliatone/go-admin/commit/370a6570528678a24347430c6694ed9f2bb9d771))  - (goliatone)
- Export url helpers ([c6b94a1](https://github.com/goliatone/go-admin/commit/c6b94a14edb8bbb09ae4b130ef627582dc384d98))  - (goliatone)
- User management quickstart ([23340ca](https://github.com/goliatone/go-admin/commit/23340ca90adf729e2499c0441e18903135c5f869))  - (goliatone)
- Quickstart view helpers ([49ffe91](https://github.com/goliatone/go-admin/commit/49ffe914afb95e072ea96b283eaf8f5ff5b0555c))  - (goliatone)
- Translation policy to quickstart ([9eff25a](https://github.com/goliatone/go-admin/commit/9eff25ab804772c1fdb50486a5ace176b2d5d283))  - (goliatone)
- Cms translation fallback support ([67a4802](https://github.com/goliatone/go-admin/commit/67a480285d4b1c335421b9ecd527eddc12e95321))  - (goliatone)
- Api base path helper ([ef19c48](https://github.com/goliatone/go-admin/commit/ef19c48c81ee13a2ca9749bd697908490c87df31))  - (goliatone)
- Translation policy config to quickstart ([3522898](https://github.com/goliatone/go-admin/commit/352289845e7f75f42c3d0896bb75b0d1fac30628))  - (goliatone)
- Support JS errors in debug ([f6aac90](https://github.com/goliatone/go-admin/commit/f6aac907c1187d8202e8c4c4e84a5c88ac57e7d4))  - (goliatone)
- Missing translation support ([ca9dabe](https://github.com/goliatone/go-admin/commit/ca9dabe842c538cb9bd29d4a209f92f68b871a2f))  - (goliatone)
- Cms translation support ([72443ba](https://github.com/goliatone/go-admin/commit/72443ba730ffd9d86bf0829966b887bc4a1dcfca))  - (goliatone)
- Suport for missing translation ([596bb89](https://github.com/goliatone/go-admin/commit/596bb89e3d52d0c0c8f4c30a475c58087dacd8f7))  - (goliatone)
- Tranlation policy to panel ([c8337ce](https://github.com/goliatone/go-admin/commit/c8337ce83f79999375d11f37cf034d99e977f888))  - (goliatone)
- Error code for missing translation ([dedf09c](https://github.com/goliatone/go-admin/commit/dedf09ce042d2e2306569028ce5b62b2b7f15a8d))  - (goliatone)
- Debug cofigured through quickstart ([0a3adc3](https://github.com/goliatone/go-admin/commit/0a3adc30f00f471de6a36d03df389e8098caea41))  - (goliatone)
- Translation policy to deps ([fedba3d](https://github.com/goliatone/go-admin/commit/fedba3d0c624c4e054ff7e0f8d6284a6caf0b52b))  - (goliatone)
- Allow missing translations in cms ([f936c6a](https://github.com/goliatone/go-admin/commit/f936c6abacaf406780d6208835dba6119976beb0))  - (goliatone)
- Admin base path and route ([c00a3c1](https://github.com/goliatone/go-admin/commit/c00a3c1b2c947c25f40428538b4945c09209c028))  - (goliatone)
- Translation policy ([8eb880b](https://github.com/goliatone/go-admin/commit/8eb880be2789d5e9864d44fff1f6fa532c150fc9))  - (goliatone)
- Translation helpers ([529e43b](https://github.com/goliatone/go-admin/commit/529e43b51dd43047cc12d5edd19727515ed8a8fd))  - (goliatone)
- Route paths to centralize route mangment ([1e044df](https://github.com/goliatone/go-admin/commit/1e044df2f22e0d49c2a2559308d039e7568377f3))  - (goliatone)
- Debug panels to quickstart ([bc23656](https://github.com/goliatone/go-admin/commit/bc2365694fbd24ecdba715dafc84a1b6ea76749f))  - (goliatone)
- Url helpers ([5f7f935](https://github.com/goliatone/go-admin/commit/5f7f9358412747ffe86ca3ea11b941ac6667328b))  - (goliatone)
- Expose debug panel JS errors in facade ([2bbeb61](https://github.com/goliatone/go-admin/commit/2bbeb61ee794fdd85c3c1d60bbb3aef08b43fe9b))  - (goliatone)
- Profile module enable skip menu ([74fcdde](https://github.com/goliatone/go-admin/commit/74fcdde85b882aed30915d281d113d99633f7d7f))  - (goliatone)
- Cms types include missing locale and meta info ([9acc7c9](https://github.com/goliatone/go-admin/commit/9acc7c97c9885887d1ec3c2c299cf66705e0c772))  - (goliatone)
- Feature gate preferences adapter ([5615901](https://github.com/goliatone/go-admin/commit/561590102649058c9e46d966a6186453f6283e29))  - (goliatone)
- Workflow management in panels ([03f031d](https://github.com/goliatone/go-admin/commit/03f031d52520a46c89b3f7334daefe78682f89b4))  - (goliatone)
- Enable skip menu in preferences module ([ca85d86](https://github.com/goliatone/go-admin/commit/ca85d861f77752e52012add9ca7d88de7188f3eb))  - (goliatone)
- Cms content include metadata key ([29af402](https://github.com/goliatone/go-admin/commit/29af402878165abd3fdd3b9e5873343ac353b22d))  - (goliatone)
- Dynamic panel factory use perms generator and meta ([7285b90](https://github.com/goliatone/go-admin/commit/7285b90bbc281301325f0a0bae17dd8d5fa4619e))  - (goliatone)
- Debug handle JS errors ([438ceea](https://github.com/goliatone/go-admin/commit/438ceea1fea722f7d3331303be25c18a3f195375))  - (goliatone)
- JS error panel ([5107bfb](https://github.com/goliatone/go-admin/commit/5107bfbe6c4f991785ab370b0afe6c47030a8d2e))  - (goliatone)
- Capture JS context ([ac4f27e](https://github.com/goliatone/go-admin/commit/ac4f27eaa9dee582dbb259bd9686a619d321caef))  - (goliatone)
- View path to templates, template function to work with paths ([a4e046a](https://github.com/goliatone/go-admin/commit/a4e046af66e21531bf81cd56fe003c46891b472b))  - (goliatone)
- Admin debug masker handle query string, headers etc ([812159b](https://github.com/goliatone/go-admin/commit/812159b6a59b0ddad722415260096296f4f036e2))  - (goliatone)
- Quickstart nav helpers ([602efd6](https://github.com/goliatone/go-admin/commit/602efd617527cd6b32057292dd0c824b65e77591))  - (goliatone)
- Better error fiber handling ([5ccfb0b](https://github.com/goliatone/go-admin/commit/5ccfb0bb372c399976d32b6e82055fdfcded7d0f))  - (goliatone)
- Quickstart disable tenants and orgs by default ([b6bf8f0](https://github.com/goliatone/go-admin/commit/b6bf8f07c4114b9a3d41df66aedb31f556cfa1cb))  - (goliatone)
- JS debug error collector ([1d5dc1d](https://github.com/goliatone/go-admin/commit/1d5dc1d7fae5f8ae5299ca2925b07ac51bbcc0b2))  - (goliatone)
- Cms check meta and locales ([8b1a022](https://github.com/goliatone/go-admin/commit/8b1a022de0ac25f2ca7609ad0e1dc2e8f2067970))  - (goliatone)
- Cms demo setup ([0519162](https://github.com/goliatone/go-admin/commit/0519162c611e2c5497c4afaaf808962a64017318))  - (goliatone)
- Preview handling ([6dd82f0](https://github.com/goliatone/go-admin/commit/6dd82f0d844ca5c44bee6102082863703ad3b95c))  - (goliatone)
- Register content entry alieases ([bff11d0](https://github.com/goliatone/go-admin/commit/bff11d0fbd7fd511f081983681e075dc110df76f))  - (goliatone)
- Aliased routes to admin ([b7355c6](https://github.com/goliatone/go-admin/commit/b7355c60e8e9c7babc26b6012b0d53785f09d508))  - (goliatone)
- Content routes ([254c458](https://github.com/goliatone/go-admin/commit/254c458f6e9394b4c747843a33d9675f6f9fbea0))  - (goliatone)
- Debug nonce ([7b4e803](https://github.com/goliatone/go-admin/commit/7b4e803f3cbe7fc3a853792208dd41a0fcd18320))  - (goliatone)
- Menu errors ([080c036](https://github.com/goliatone/go-admin/commit/080c0367f41a8b2625f0359ed3b437ebcc3cf99a))  - (goliatone)
- Content entries and aliases routes ([fc48e6a](https://github.com/goliatone/go-admin/commit/fc48e6a2630e641c1cc532f628918b51dc14641a))  - (goliatone)
- Client JS error collector ([4b72b61](https://github.com/goliatone/go-admin/commit/4b72b612f6b4e6a1561867e49cc82adbb15ee95c))  - (goliatone)
- Scope config and other options to admin ([979f93a](https://github.com/goliatone/go-admin/commit/979f93a27b27bb293fd04920f160942b718d388d))  - (goliatone)
- Helper to include locale in context ([ac18dff](https://github.com/goliatone/go-admin/commit/ac18dff882d5b18e12bc7abeb5d4bdcae79babf0))  - (goliatone)
- New crud context adapter ([291f905](https://github.com/goliatone/go-admin/commit/291f90510bd29bd06699e4d83a307816c6ebd0b5))  - (goliatone)
- Include scopes by default ([6e90b47](https://github.com/goliatone/go-admin/commit/6e90b47e1aacd4ab5d9f4439392a9b9c86bd91c8))  - (goliatone)
- Go-cms content adapter ([f163a68](https://github.com/goliatone/go-admin/commit/f163a68ff698c7e8cb44ba6db86ccdad790699f3))  - (goliatone)
- Apply scoped defaults to sessoin ([46d5016](https://github.com/goliatone/go-admin/commit/46d5016802e4a493cdf08ece17b8c7737414ab20))  - (goliatone)
- Config options for scope mode, default tenant id and default org id ([9b63478](https://github.com/goliatone/go-admin/commit/9b63478d6f51436381a515665fa6912ada42fd22))  - (goliatone)
- Scope debug to quickstart ([841ecaf](https://github.com/goliatone/go-admin/commit/841ecaf4db657b08af6c98cf164ba21c8e769297))  - (goliatone)
- Go cms container page service ([1e2ac04](https://github.com/goliatone/go-admin/commit/1e2ac04bc08a7d101377f899c20fadf585a41840))  - (goliatone)
- Client sql panel, debug toolbar ([ce80be1](https://github.com/goliatone/go-admin/commit/ce80be10f783569a8132abab2015a3bae8861b6f))  - (goliatone)
- Page application service ([8fa6b50](https://github.com/goliatone/go-admin/commit/8fa6b5082be8eac127af453f4582855a581278d5))  - (goliatone)
- Quickstart scope ([e4ef3ab](https://github.com/goliatone/go-admin/commit/e4ef3ab253147773bc8aa8cf07967292d0234048))  - (goliatone)
- Cms workflow check for entity workflows ([6c0670d](https://github.com/goliatone/go-admin/commit/6c0670dfd9f48800f3331370a530c33b845eabdc))  - (goliatone)
- Preferences formgenerator ([ff5beeb](https://github.com/goliatone/go-admin/commit/ff5beeb28837c14465f20326bb383738b2741d40))  - (goliatone)
- HasWorkflow method to check if entity has workflow ([9d54764](https://github.com/goliatone/go-admin/commit/9d547649cc16181edc47804463e0270e887bbc4e))  - (goliatone)
- Default workflows for cms ([9f6b3f3](https://github.com/goliatone/go-admin/commit/9f6b3f3e42d3a60631ba7353223694be9b6386bd))  - (goliatone)
- Content type builder and block picker upgrade ([6c43fa9](https://github.com/goliatone/go-admin/commit/6c43fa976ca3abfbaaa918aecb5e8b3fc1998a0f))  - (goliatone)
- Icon, confirm, varian, overflow to action panel ([d8b1bbb](https://github.com/goliatone/go-admin/commit/d8b1bbb6bffdc4f5382b243710cb23b608766c93))  - (goliatone)
- Workflows and auth flows ([e4c63a6](https://github.com/goliatone/go-admin/commit/e4c63a688508a5b36c8eee14f2a31bf4ceabb475))  - (goliatone)
- Register workflows ([1082da7](https://github.com/goliatone/go-admin/commit/1082da792cbbab099a18c1204a19181ceac51780))  - (goliatone)
- Expose content type service ([866e04d](https://github.com/goliatone/go-admin/commit/866e04df8b9c489769e26b2145a8f5fb11ca04ab))  - (goliatone)
- Block library picker component ([fc0f717](https://github.com/goliatone/go-admin/commit/fc0f717223c49eb8c0798fdaa724fdffdb166d28))  - (goliatone)
- Env from context helper ([71d2d41](https://github.com/goliatone/go-admin/commit/71d2d41713a4f7de59ce44db30a481235416f14d))  - (goliatone)
- Admin workflow auth ([f9625b4](https://github.com/goliatone/go-admin/commit/f9625b48dff0cca971371b3fedf5acb957be822f))  - (goliatone)
- Update datatable and other assets ([ab8b917](https://github.com/goliatone/go-admin/commit/ab8b917ad457a3ceabc5c2a523d20ad89938e05e))  - (goliatone)
- Error config to struct ([23e37a7](https://github.com/goliatone/go-admin/commit/23e37a7cea36776051b0db64566e3ad3207f88b9))  - (goliatone)
- Expose errors in facabe ([a7e5362](https://github.com/goliatone/go-admin/commit/a7e536205beed0afb445b017ea28fd15a6a584cb))  - (goliatone)
- Better fiber error handling ([ffa9dd6](https://github.com/goliatone/go-admin/commit/ffa9dd69ad561b23815cc8fa98dcd5aaae1aad76))  - (goliatone)
- Preferences module exposed in quickstart ([c3b5d25](https://github.com/goliatone/go-admin/commit/c3b5d255e4458c9320892c56f991680fa9ac6255))  - (goliatone)
- Consistent error management ([f56c93b](https://github.com/goliatone/go-admin/commit/f56c93bd613b58590afeb1df0eacb4529bf5c958))  - (goliatone)
- Error codes docs ([6c2b29e](https://github.com/goliatone/go-admin/commit/6c2b29e0af9f4cbf9bec7419e677c30286a9c4e0))  - (goliatone)
- Require perms on boot ([eba7431](https://github.com/goliatone/go-admin/commit/eba7431c12e5b6294d972d8b373decaf7c3a9429))  - (goliatone)
- Theme manifest to admin ([e46ba19](https://github.com/goliatone/go-admin/commit/e46ba193acdec32d98e8a175f1e7e94b745dd3d8))  - (goliatone)
- Config defaults for dashboard preferences udpate perms ([09a087d](https://github.com/goliatone/go-admin/commit/09a087d02018a26c505d4dad2dd69382da311e99))  - (goliatone)
- Normalize menu perms ([24b4d38](https://github.com/goliatone/go-admin/commit/24b4d38723933903db5b42d2dcffe43da5d72ed9))  - (goliatone)
- Preferences use new formgen setup ([f733a4e](https://github.com/goliatone/go-admin/commit/f733a4eaf41d3d269bd2466509501393bc706343))  - (goliatone)
- Uischemas shipped with the package ([79f75f9](https://github.com/goliatone/go-admin/commit/79f75f9a423750f8bdc1398a4788b83471c1b154))  - (goliatone)
- Formgen for preferences ([2abeb53](https://github.com/goliatone/go-admin/commit/2abeb532a76e9160b4036327bb7326997df186c9))  - (goliatone)
- Dashboard permissions for preferences ([524f1a7](https://github.com/goliatone/go-admin/commit/524f1a72eefefa5d07321a0ee1a6bfcf66eeec60))  - (goliatone)
- Preferences module ([5b1a895](https://github.com/goliatone/go-admin/commit/5b1a89501a92095c8bc301ef4b15e64c10cf5f04))  - (goliatone)
- Update debug panel ([c9f73e7](https://github.com/goliatone/go-admin/commit/c9f73e78a5543afb6451af6b32c6d63f3db842a0))  - (goliatone)
- Repository cms handle content ([b07efa7](https://github.com/goliatone/go-admin/commit/b07efa7cb8b07093c459de8cc52bf8f4c9345be8))  - (goliatone)
- Preferences wiring to handle theme ([ab5d8b1](https://github.com/goliatone/go-admin/commit/ab5d8b1c457efc8392de09733a806fb6187f024c))  - (goliatone)
- Theme manifest ([6090f4e](https://github.com/goliatone/go-admin/commit/6090f4ea614a54d360798fffcffd87bfe28cfeec))  - (goliatone)
- Debug http requests ([8db40c8](https://github.com/goliatone/go-admin/commit/8db40c8f7b95f89f6d122abc9935e0be97c5fd30))  - (goliatone)
- Icon picker component ([7ed24a9](https://github.com/goliatone/go-admin/commit/7ed24a9f00f7a61b0ee71191af3f3f014132d931))  - (goliatone)
- Content type fix manager ([54224c2](https://github.com/goliatone/go-admin/commit/54224c292379f69bab8adfe165966ceb48073260))  - (goliatone)
- Normalize cms blocks ([cf5db52](https://github.com/goliatone/go-admin/commit/cf5db522df28c42449584dfa1a7b3377e3c49820))  - (goliatone)
- Append zero args ([7c3c2ba](https://github.com/goliatone/go-admin/commit/7c3c2ba15236bd80a9454fdc7e979e3408a83206))  - (goliatone)
- Preferences options ([6dfe2b7](https://github.com/goliatone/go-admin/commit/6dfe2b7377a02ceee9e35c877cf4675c6e9d1ede))  - (goliatone)
- SQL export in debug panels, content type builder api ([20b744e](https://github.com/goliatone/go-admin/commit/20b744e3bb31cb1face12c269ea3c956b8d589ee))  - (goliatone)
- Session and environment routes ([69b9459](https://github.com/goliatone/go-admin/commit/69b9459403b113885b92aa93e396832850d7bd44))  - (goliatone)
- Env resolution in panel factory ([53f6413](https://github.com/goliatone/go-admin/commit/53f6413da242645aeb77f3389577706d91bbe3e9))  - (goliatone)
- Block definition cache ([d39f6f7](https://github.com/goliatone/go-admin/commit/d39f6f77519be7705814eaacd93b85e2d087dc1f))  - (goliatone)
- Cms has env ([e1a0316](https://github.com/goliatone/go-admin/commit/e1a031647b348e98b8907bb93148a3ec75fa5099))  - (goliatone)
- Cms content version block ([99f36ab](https://github.com/goliatone/go-admin/commit/99f36abe632cff828c1c600a15cdebe4a89208cc))  - (goliatone)
- Slug and env setup in content type builder ([4dbb77f](https://github.com/goliatone/go-admin/commit/4dbb77f03e3f6ac078080548eb59be1f7415bdc4))  - (goliatone)
- Quickstart session env ([e10a78e](https://github.com/goliatone/go-admin/commit/e10a78e76482e59495394b8fae28f647c7442702))  - (goliatone)
- Content type builder drag/drop setup ([c59d12b](https://github.com/goliatone/go-admin/commit/c59d12b1817b5bb5325bbced27530b675e3bd4ba))  - (goliatone)
- Block definition versions ([cce7a83](https://github.com/goliatone/go-admin/commit/cce7a8371fb4466810027c8d98133aea33b53f2b))  - (goliatone)
- Build block definition name ([18b3787](https://github.com/goliatone/go-admin/commit/18b3787307f245c9b68c3542da8c7a76fe5c67a3))  - (goliatone)
- Cms repository handle tags ([6b6c969](https://github.com/goliatone/go-admin/commit/6b6c96900028017f2c49bcfe3d7931e98c229586))  - (goliatone)
- Expose content service admin ([22dfee7](https://github.com/goliatone/go-admin/commit/22dfee77698b306d2100dfced8c4a90ddd2d6234))  - (goliatone)
- Block content type routes ([04122c5](https://github.com/goliatone/go-admin/commit/04122c550fc1f58117aa2c2fdbea2e561b9239b1))  - (goliatone)
- Block field types ([0786b63](https://github.com/goliatone/go-admin/commit/0786b63469ea8331ce9bdedca210e4cba3f9baaf))  - (goliatone)
- Content type builder ([df9b9c3](https://github.com/goliatone/go-admin/commit/df9b9c343ff728d835e96dc48944e5f8cae8e102))  - (goliatone)
- Schema preview fallback ([bafb41b](https://github.com/goliatone/go-admin/commit/bafb41bdf01117c91ea213a62573f975c8461397))  - (goliatone)
- Content type templates ([6c0b5a2](https://github.com/goliatone/go-admin/commit/6c0b5a280ada9d66ea7bcf2669886789d10721d6))  - (goliatone)
- Content type builder to quickstart ([8a797ec](https://github.com/goliatone/go-admin/commit/8a797ece0e330250a98031b84f5a3056e3bbcdc1))  - (goliatone)
- Content type builder actions ([4783807](https://github.com/goliatone/go-admin/commit/4783807259dadfd2d28150fe5fedf30b7235d231))  - (goliatone)
- Widget definition to facade ([b06fdaa](https://github.com/goliatone/go-admin/commit/b06fdaae3b3e9b40998cd21551db8ca0b6bd2fa7))  - (goliatone)
- Diagnostic service ([8f85f03](https://github.com/goliatone/go-admin/commit/8f85f03142889280ce5c29c22810d76be37e99d0))  - (goliatone)
- Debug dashboard route ([88a5e87](https://github.com/goliatone/go-admin/commit/88a5e87f42b0035825dc926c5fb208700f734975))  - (goliatone)
- Register component UI preview ([5172f84](https://github.com/goliatone/go-admin/commit/5172f8428a1d2345bbefdf270e6414d500db28fe))  - (goliatone)
- Dashboard diagnostic binding ([9b3137f](https://github.com/goliatone/go-admin/commit/9b3137fda24d71f82602a3083fff518e9b453a8a))  - (goliatone)
- Register query for dashboard diagnostics ([6c42f44](https://github.com/goliatone/go-admin/commit/6c42f44bd0d2fb8dbe4b754c6b8d48862962d30b))  - (goliatone)
- Dashboard diagnostics ([8fe7e34](https://github.com/goliatone/go-admin/commit/8fe7e342cb7bcbff6b82cb662d1a64cd3f35ae09))  - (goliatone)
- Content type builder module ([e54599b](https://github.com/goliatone/go-admin/commit/e54599b05b3740240ce367723de45dd38edc1309))  - (goliatone)
- Include items to panel ([07048af](https://github.com/goliatone/go-admin/commit/07048af99a4c6beea71c53323fa989ae6a47b62a))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Clean up integration code ([c5ace32](https://github.com/goliatone/go-admin/commit/c5ace322b1d96155439673dbc9343e91b783d4d9))  - (goliatone)
- Clean up go-cms integration code ([084f46d](https://github.com/goliatone/go-admin/commit/084f46d3f84e74cffa2b9ba9fce292d58ddb9f6b))  - (goliatone)
- Remove reflection for go-cms handling ([ce1b770](https://github.com/goliatone/go-admin/commit/ce1b770a8bc092c1ea295d8361720f708d57579c))  - (goliatone)
- Page options ([409eff4](https://github.com/goliatone/go-admin/commit/409eff4d4a21ff23495de554c3da4afc3b4b61ae))  - (goliatone)
- Use go-errors and clean code ([577610c](https://github.com/goliatone/go-admin/commit/577610c41a0f59c13bcae969f734b440b6ae0438))  - (goliatone)
- Consolidate code ([454b8d0](https://github.com/goliatone/go-admin/commit/454b8d0977b478b1d226e00ba26900d59c60523b))  - (goliatone)
- Admin dashboard use script ([357a657](https://github.com/goliatone/go-admin/commit/357a6573a42344312a65b2bb1020ecc10e10e645))  - (goliatone)
- Use URL manager paths ([dcd1395](https://github.com/goliatone/go-admin/commit/dcd1395150d2c8d05cd532d0e40ffee5764a593d))  - (goliatone)
- Shared api paths for fronte end code ([f00d207](https://github.com/goliatone/go-admin/commit/f00d20729d5f38a4bf7fd8ab36edfb92f0175a18))  - (goliatone)
- Refactor template ur URL helper ([808c8b5](https://github.com/goliatone/go-admin/commit/808c8b5f90dc682833bf079052692580fb9ecff2))  - (goliatone)
- Use content pages ([3c40e9a](https://github.com/goliatone/go-admin/commit/3c40e9a827eb115e4973f7cf34f0eb1e3afe8ea8))  - (goliatone)
- Update to use new go-cms version ([ed2b93e](https://github.com/goliatone/go-admin/commit/ed2b93ed21a1134dd4604a6a035d35bd542d5782))  - (goliatone)
- Use better error messages ([485b371](https://github.com/goliatone/go-admin/commit/485b3716462ae213b41dd13f2e50b48324824eb7))  - (goliatone)
- Content types and block editor alignment ([d6453ff](https://github.com/goliatone/go-admin/commit/d6453ff4f6ce0378e1d2f0a12b919b20714e8d62))  - (goliatone)
- Unify modal use, toast, and other client code ([f9d9202](https://github.com/goliatone/go-admin/commit/f9d9202b11a4559efa22cf35b9b1e2775c65ef50))  - (goliatone)
- Content type builder style ([e69e385](https://github.com/goliatone/go-admin/commit/e69e385c57fc9d84e99c3300400e04ee1274fb94))  - (goliatone)
- Content type builder update block editor ([b5a3a77](https://github.com/goliatone/go-admin/commit/b5a3a7734be675e96c4a124d444a60c733e8684d))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.23.0 ([cc30ada](https://github.com/goliatone/go-admin/commit/cc30adaed4822853f9d75d897037390dbceaa478))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([942656c](https://github.com/goliatone/go-admin/commit/942656ce3d1d934fd5b79dd2fe950f64afb600d1))  - (goliatone)
- Update example ([cc63bc9](https://github.com/goliatone/go-admin/commit/cc63bc9c77f55811e260b4b533e9a78083a60b80))  - (goliatone)
- Update test ([3d40d49](https://github.com/goliatone/go-admin/commit/3d40d4987e98515b578f33f1994c87e1540dd33b))  - (goliatone)
- Clean up ([23e5251](https://github.com/goliatone/go-admin/commit/23e52510fb64bcc98f840499f4282c7281af4655))  - (goliatone)
- Update docs ([9f9441b](https://github.com/goliatone/go-admin/commit/9f9441b1f6781b95229403a3cc24ea98608ec04e))  - (goliatone)
- Udpate tests ([a9dee8c](https://github.com/goliatone/go-admin/commit/a9dee8c190b0df7644fe3586b0190b6478e1668d))  - (goliatone)
- Udpate example ([66ca371](https://github.com/goliatone/go-admin/commit/66ca371960e6fddec127f84b510fb41a0ac93fe5))  - (goliatone)
- Udpate deps ([d8eb523](https://github.com/goliatone/go-admin/commit/d8eb5235a6bd3886e711a997f37f36f66359b803))  - (goliatone)
- Update readme ([fe1ddfc](https://github.com/goliatone/go-admin/commit/fe1ddfca88f270c5eeb1a67c32aa683023dce75d))  - (goliatone)
- Udpate test ([3c5175f](https://github.com/goliatone/go-admin/commit/3c5175fb0bc0fa063421e15205f74be51a622207))  - (goliatone)
- Update examples ([f0b73f8](https://github.com/goliatone/go-admin/commit/f0b73f8f4be672d3c738f6eb39dc66b5c232d710))  - (goliatone)
- Remove legacy code ([e169ef7](https://github.com/goliatone/go-admin/commit/e169ef7f68d85641bed6b100b0a25a1ff99c16f2))  - (goliatone)
- Update guides ([6a2239c](https://github.com/goliatone/go-admin/commit/6a2239cef3dd4fb120b5a0bece89c944ea5ddc32))  - (goliatone)
- Update changelog ([fb6a1f1](https://github.com/goliatone/go-admin/commit/fb6a1f1398eb88d128fbfb06eec30c0a57ddd415))  - (goliatone)
- Update format ([4a08827](https://github.com/goliatone/go-admin/commit/4a0882706ccbcb4c378d8394d4ea78b52d68bb9e))  - (goliatone)

# [0.23.0](https://github.com/goliatone/go-admin/compare/v0.22.0...v0.23.0) - (2026-01-29)

## <!-- 1 -->🐛 Bug Fixes

- Clone ui schema in cms records in memory ([acea9d4](https://github.com/goliatone/go-admin/commit/acea9d4dd92c6df0125d0d804da4229897a47175))  - (goliatone)
- Block schema version in editor ([270b5d8](https://github.com/goliatone/go-admin/commit/270b5d888e9db35f1d01e6e6e6c3655cae935f83))  - (goliatone)
- Repository cms block normalize ids ([fbfc83e](https://github.com/goliatone/go-admin/commit/fbfc83e0f1c07d80f375e43a0954a00dd84f36b8))  - (goliatone)
- Block editor animation use requestAnimationFrame ([5e530d1](https://github.com/goliatone/go-admin/commit/5e530d13ac5b14e2e87a561c4bf94353373720da))  - (goliatone)
- Block editor TS scope issues ([38c13bb](https://github.com/goliatone/go-admin/commit/38c13bb1a693db84246d4fa0471ceaa6237a028d))  - (goliatone)
- Function signature ([fdb99bf](https://github.com/goliatone/go-admin/commit/fdb99bf0eea33dfc679f946df8e8c389f86dc8ef))  - (goliatone)
- Address timeline UX issues ([9060a3a](https://github.com/goliatone/go-admin/commit/9060a3ad188e818857757c8af403ea2e304deb10))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.23.0 ([76fd6fc](https://github.com/goliatone/go-admin/commit/76fd6fcd00fc485703c0843c4c1624f00ffaf8fb))  - (goliatone)

## <!-- 16 -->➕ Add

- Ui schema and status ([8797b75](https://github.com/goliatone/go-admin/commit/8797b753c612f4175e844212526607ca00b51065))  - (goliatone)
- Content type repository ([91a63f3](https://github.com/goliatone/go-admin/commit/91a63f30e470356040a3bcd2a16933f1a43e8ede))  - (goliatone)
- Unregsiter panel support ([149e9d2](https://github.com/goliatone/go-admin/commit/149e9d244a7d2929b77a8c8a1f76d8fd905c255b))  - (goliatone)
- Schema fitler ([b626c23](https://github.com/goliatone/go-admin/commit/b626c232efa101f973db9fe49edc4a4d48c795ce))  - (goliatone)
- Form schema to panel def ([5d84881](https://github.com/goliatone/go-admin/commit/5d848816ec09285ff4927a47655791ddddbe6cb4))  - (goliatone)
- CMS content type adapter ([ed3545b](https://github.com/goliatone/go-admin/commit/ed3545bc3694ac1096f8830d97abc12e0153a6d6))  - (goliatone)
- Unregister panel ([35741f3](https://github.com/goliatone/go-admin/commit/35741f3ffa899305d7f75f818f75f95ec9af5bcd))  - (goliatone)
- Dynamic panel factory ([3d5ef58](https://github.com/goliatone/go-admin/commit/3d5ef584deeb54bb89ec5dfc6e83501ac6d42d11))  - (goliatone)
- Cms schema guardrails ([97ab554](https://github.com/goliatone/go-admin/commit/97ab5542d0c27c2767781b8f03c8aae6216284b2))  - (goliatone)
- Content type builder ([9b1c9fa](https://github.com/goliatone/go-admin/commit/9b1c9fa9c14eda8420e600037f0a2da5c5e549ec))  - (goliatone)
- Block editor updates ([02ee783](https://github.com/goliatone/go-admin/commit/02ee783fd48bd7e9904374d6739502bfd2aef05a))  - (goliatone)
- Refactor block editor ([3f0fae3](https://github.com/goliatone/go-admin/commit/3f0fae3312a13cc5941d5e0f485183c7709cc40d))  - (goliatone)
- Support embedded blocks ([04970eb](https://github.com/goliatone/go-admin/commit/04970eb0da719bf7900bc7c73688df09fa3a0478))  - (goliatone)
- Repository cms ([ddd6eea](https://github.com/goliatone/go-admin/commit/ddd6eea1accb437607580a90bbcd0409a83aa41b))  - (goliatone)
- Expose public api methods ([3cad564](https://github.com/goliatone/go-admin/commit/3cad564eeae4e4b1f63ce710a189069be9181764))  - (goliatone)
- Json schema editor ([5fadcf3](https://github.com/goliatone/go-admin/commit/5fadcf3e248a662fd94cff79920cc326b06c53aa))  - (goliatone)
- Graphql schem deliver setup ([265f660](https://github.com/goliatone/go-admin/commit/265f660d77d6f0e60dd8cf8e53c481307ac10a2a))  - (goliatone)
- Expose boot schema registry ([ff37f22](https://github.com/goliatone/go-admin/commit/ff37f22041f0ee11474e47f8045220d0ebca2cbf))  - (goliatone)
- Block editor ([1a09030](https://github.com/goliatone/go-admin/commit/1a0903041470d43676b36845f043ead27fb0132e))  - (goliatone)
- Boot schema registry wiring ([7edf213](https://github.com/goliatone/go-admin/commit/7edf21369ae65fd7626f4d7cea6a26c54880726a))  - (goliatone)
- Admin schema registry ([31eaae1](https://github.com/goliatone/go-admin/commit/31eaae192ba16d92de2e2b8ad97cab8a6f095ed7))  - (goliatone)
- Block conflict resolution ([9c7d6f7](https://github.com/goliatone/go-admin/commit/9c7d6f7565532edda65d27438a0ef4da904f8f21))  - (goliatone)
- Support for block editor ([8b4f066](https://github.com/goliatone/go-admin/commit/8b4f066e2fdc387c7f17090987fc2e4c77bc9853))  - (goliatone)
- Error handling for frontend ([1d7f495](https://github.com/goliatone/go-admin/commit/1d7f4958a10ab66b055effb882e03a914f058525))  - (goliatone)
- Admin repository cms ([16a40cd](https://github.com/goliatone/go-admin/commit/16a40cdad47b22f63a8593310f4d7060913bd634))  - (goliatone)
- Cms demo updated ([02d4cbc](https://github.com/goliatone/go-admin/commit/02d4cbc85bc2c7ff5f9a09cc31723c9c76cb88ac))  - (goliatone)
- Register cms routes from service ([bc2aaaf](https://github.com/goliatone/go-admin/commit/bc2aaaf940a839451e43741baa83eb48cc20127f))  - (goliatone)
- Cms routes registered ([2bfc25c](https://github.com/goliatone/go-admin/commit/2bfc25cbcf0894930025f72dd0b3fa46bd846ee8))  - (goliatone)
- Expose CMS types to facade ([5a6c362](https://github.com/goliatone/go-admin/commit/5a6c3624a8bc5f04b5c6e95feb9bc8d03dd9b893))  - (goliatone)
- Wire create to cms repo ([0d5531b](https://github.com/goliatone/go-admin/commit/0d5531bca5189521e1caed53648ea88ae99cf442))  - (goliatone)
- Update routing for public API ([3c2cfb7](https://github.com/goliatone/go-admin/commit/3c2cfb7e0c8a0af59686f86b4f3b34b59c5a1eb5))  - (goliatone)
- Admin cms workflow ([e6b925d](https://github.com/goliatone/go-admin/commit/e6b925dcc949a3d2dbc5bab8abae7b0862894682))  - (goliatone)
- Transition mangement ([417b3ca](https://github.com/goliatone/go-admin/commit/417b3cacfbe06dc9aa25252927fd92afa13a28f2))  - (goliatone)
- Bootstrap gql ([c178fb0](https://github.com/goliatone/go-admin/commit/c178fb0f954a1f7cfb0b0469f198037104d19b04))  - (goliatone)
- Content type model ([d6344e5](https://github.com/goliatone/go-admin/commit/d6344e5ef1a31d7a70bcd0378aae4a11a00b435d))  - (goliatone)
- Updated cms demo ([e92407d](https://github.com/goliatone/go-admin/commit/e92407d5531bc55066eb958ab7c75d533b9dd30d))  - (goliatone)
- Boot bindings include cms setup ([d118f30](https://github.com/goliatone/go-admin/commit/d118f3086c9b3ddb1858b9a728321ac3173b062d))  - (goliatone)
- Graphql management registry ([af31dc3](https://github.com/goliatone/go-admin/commit/af31dc330787eaddd4a68e635c138fddcaeaea49))  - (goliatone)
- Graphql management services ([7c4663e](https://github.com/goliatone/go-admin/commit/7c4663e23b343fa21d31a447e13050f9d3bb4581))  - (goliatone)
- Go-cms integration ([1746f27](https://github.com/goliatone/go-admin/commit/1746f27d619d7d43302c73250240623a8ea58217))  - (goliatone)
- Cms schema helpers ([725bfe2](https://github.com/goliatone/go-admin/commit/725bfe206d6e4c3a06de9f7badfc97e37c3f0a65))  - (goliatone)
- Cms repository ([9ca8dd2](https://github.com/goliatone/go-admin/commit/9ca8dd2d6148d34b16941767f5add678ef5ea5d5))  - (goliatone)
- Context public ([cc39716](https://github.com/goliatone/go-admin/commit/cc39716f41af23fa762d30d13fe381fa40f30b47))  - (goliatone)
- Graphql support ([e8060b5](https://github.com/goliatone/go-admin/commit/e8060b59d7b6d89748ca2f32d81a13939ca76df5))  - (goliatone)
- Content URL for cms content type ([ffd350c](https://github.com/goliatone/go-admin/commit/ffd350ccd439784a931416b430383dc9e82739aa))  - (goliatone)
- Validation helper ([0430596](https://github.com/goliatone/go-admin/commit/043059611e6a5058fc81945a94858d7d1942c92d))  - (goliatone)
- CMS repository update to handle content type ([9d5df8a](https://github.com/goliatone/go-admin/commit/9d5df8a1e20f5373e193d59cf884f39a0f4de658))  - (goliatone)
- Updated CMS container ([8f6ef49](https://github.com/goliatone/go-admin/commit/8f6ef491a0e94a4267bdb7fe71954e65bc53f095))  - (goliatone)
- Error helpers ([ca52ca7](https://github.com/goliatone/go-admin/commit/ca52ca791eb7c1da86be881904a2264138ed6fb8))  - (goliatone)
- Cms memory store ([4541035](https://github.com/goliatone/go-admin/commit/45410356b2925948c423a7a059af90378cd24e38))  - (goliatone)
- Cms types ([81572fc](https://github.com/goliatone/go-admin/commit/81572fcea78cd8eac00e52f037563ddb5069a79a))  - (goliatone)
- Content type support ([374d4cc](https://github.com/goliatone/go-admin/commit/374d4cc438dac2eba7e07a321a0e884758ad6b64))  - (goliatone)
- Client code for activity display ([2085dc6](https://github.com/goliatone/go-admin/commit/2085dc659f5559a6a8550b165a550760f11a621c))  - (goliatone)
- Updated activity preview ([f550edd](https://github.com/goliatone/go-admin/commit/f550edd36c3f686dae5a7a0b2bbb97a3550f52f2))  - (goliatone)
- Include activity enricher to activity flow ([f6dc63f](https://github.com/goliatone/go-admin/commit/f6dc63f42524cbe6aba5c7571cc239023649076c))  - (goliatone)
- Include metadata key in formatter ([cd1b2be](https://github.com/goliatone/go-admin/commit/cd1b2be73022eda17b6cd2f78e3d435fdc3520d4))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.22.0 ([bfe119e](https://github.com/goliatone/go-admin/commit/bfe119e637cd06cc572de097920431c3950907e7))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([9db2fc9](https://github.com/goliatone/go-admin/commit/9db2fc96085549a2696ced03e377a753ed302dd3))  - (goliatone)
- Format ([0671b7a](https://github.com/goliatone/go-admin/commit/0671b7afe12059f1278a8d420e06f50f42f9ad70))  - (goliatone)
- Update test ([9b5893b](https://github.com/goliatone/go-admin/commit/9b5893b03deb20774267729a6fdcc6520463669a))  - (goliatone)
- Update examples ([e16c829](https://github.com/goliatone/go-admin/commit/e16c829bab28b857f4d7788c65d2556680001d99))  - (goliatone)
- Udpate deps ([d36101a](https://github.com/goliatone/go-admin/commit/d36101a50a0585d04051de11f442bf5632c0b664))  - (goliatone)
- Udpate test ([daaff51](https://github.com/goliatone/go-admin/commit/daaff51e33b13db696567fc56ddbf7c70a541f60))  - (goliatone)
- Udpate testc ([55af6b2](https://github.com/goliatone/go-admin/commit/55af6b2a9887ff931187dbf824bad7822021bd41))  - (goliatone)
- Update depsc ([f7febd7](https://github.com/goliatone/go-admin/commit/f7febd746c5ff94d7d9b84dd6b46837aac458276))  - (goliatone)
- Clean up ([58ae602](https://github.com/goliatone/go-admin/commit/58ae60287a901a7aa8cd21a70541431f80c43523))  - (goliatone)
- Update format ([691bc4a](https://github.com/goliatone/go-admin/commit/691bc4afa8249b839dca0651845aa97c09fbd09d))  - (goliatone)
- Update guides ([57fe98e](https://github.com/goliatone/go-admin/commit/57fe98e0b709414c61bce38f9b6d639e85812900))  - (goliatone)
- Update tests ([f39e0f8](https://github.com/goliatone/go-admin/commit/f39e0f8da3eec8cfd712fa3d1100e4abbded9a75))  - (goliatone)

# [0.22.0](https://github.com/goliatone/go-admin/compare/v0.21.1...v0.22.0) - (2026-01-26)

## <!-- 1 -->🐛 Bug Fixes

- Deadlock ([8946004](https://github.com/goliatone/go-admin/commit/8946004a25a2af015e50351f13c47325b80375fc))  - (goliatone)
- Updated activity formatter to use new actor id ([a22d459](https://github.com/goliatone/go-admin/commit/a22d459c41906c79823ab0525fd0113692089896))  - (goliatone)
- Resolve route precedence ([9ea3e60](https://github.com/goliatone/go-admin/commit/9ea3e6028feb6adcc2366e37caf05b5a1a1c7ec3))  - (goliatone)
- Style. add: descriptions to feature flags ([4a398be](https://github.com/goliatone/go-admin/commit/4a398beb7f18811084801676b56f32298affd930))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.22.0 ([32cb4a0](https://github.com/goliatone/go-admin/commit/32cb4a042bc6e5c45ff9fa9b4b077bb353790385))  - (goliatone)

## <!-- 16 -->➕ Add

- Activity enrichment implementation ([55a1f29](https://github.com/goliatone/go-admin/commit/55a1f29521860f290bc8f8880f0a67417ef97f3e))  - (goliatone)
- Format group ID ([03d5e76](https://github.com/goliatone/go-admin/commit/03d5e76721a6a4e488331e58674f3db0ef2a0f82))  - (goliatone)
- Update formatting for UI dates ([83ba0a8](https://github.com/goliatone/go-admin/commit/83ba0a8527846cf965f990d0345c69e10b32c7a3))  - (goliatone)
- Activity resolvers ([7764e21](https://github.com/goliatone/go-admin/commit/7764e21acb6efc1531a77491aa2cc65f261fba2c))  - (goliatone)
- Activity timeline implementation ([1c570e8](https://github.com/goliatone/go-admin/commit/1c570e8f044913c4b79b592a11dd7a9f4111a669))  - (goliatone)
- Implement activity timeline view ([4460262](https://github.com/goliatone/go-admin/commit/4460262519068528f9aabed74dcf23edf32b2bb8))  - (goliatone)
- Updated page resources ([5c9915b](https://github.com/goliatone/go-admin/commit/5c9915b0f0d4cc7062cae8c9cd42900e917850df))  - (goliatone)
- Example definition for content ([1df941c](https://github.com/goliatone/go-admin/commit/1df941c0973ce42e76d09c0ca3469a8ab3ef3fb8))  - (goliatone)
- Updated activity preview ([f1dbf6f](https://github.com/goliatone/go-admin/commit/f1dbf6f7b6e1aadc0a3af311dea6ff83d27bb054))  - (goliatone)
- Wire workflows ([ab98519](https://github.com/goliatone/go-admin/commit/ab985190487a7d288dea0823d3f0ff076b18223a))  - (goliatone)
- Register preview routes ([1b2e266](https://github.com/goliatone/go-admin/commit/1b2e26636240a4d3c222074048a4cf12e1e904a4))  - (goliatone)
- Generate preview ([deb79eb](https://github.com/goliatone/go-admin/commit/deb79eb47ad25953e8e27821fbd5010d3d328886))  - (goliatone)
- Worfklow integration with panel ([c4aaa84](https://github.com/goliatone/go-admin/commit/c4aaa84c1c96315975de363f8060a92ad1957e6a))  - (goliatone)
- Workflow auth to facade ([1ce14af](https://github.com/goliatone/go-admin/commit/1ce14af292fcf3029ae75d9bd9a5780c3c405a85))  - (goliatone)
- Panel workflow setup ([abeb96f](https://github.com/goliatone/go-admin/commit/abeb96fd3d006e1cccae91cf92487a07db4d1dbb))  - (goliatone)
- MenuByLocation to cms service ([8048d96](https://github.com/goliatone/go-admin/commit/8048d962f7d2374098f08b60c615e50b0887d3f1))  - (goliatone)
- Cms menu management ([a98d541](https://github.com/goliatone/go-admin/commit/a98d5413aacaf294cd2766fdbfefc5761d4ac4d4))  - (goliatone)
- Integrate menu management ([00bb154](https://github.com/goliatone/go-admin/commit/00bb15493172bdf410a9b133f3543e23810d9c6a))  - (goliatone)
- Public menu get by location ([c19a18f](https://github.com/goliatone/go-admin/commit/c19a18fa92fecfd6915f99c74d91e11f2d6c1588))  - (goliatone)
- Activity frontend code ([7ae2083](https://github.com/goliatone/go-admin/commit/7ae2083eb8451ed19a6d695a22101838b0841dab))  - (goliatone)
- Preview panel binding ([b8411eb](https://github.com/goliatone/go-admin/commit/b8411eb1ee3dfd08550cff97b804f7ffe656f0be))  - (goliatone)
- Update step for routes ([f765a67](https://github.com/goliatone/go-admin/commit/f765a674a930408950e7187b5599df1e82aa5467))  - (goliatone)
- Udpate translate interface ([34e40e5](https://github.com/goliatone/go-admin/commit/34e40e55c40b33c83e5a0496cac5002530305e91))  - (goliatone)
- Update workflow ([c0e0e69](https://github.com/goliatone/go-admin/commit/c0e0e69915b183a31e136d5881e1023f4ddf5571))  - (goliatone)
- Udpated translate interface ([24cd94d](https://github.com/goliatone/go-admin/commit/24cd94d7e1f903172e59a903a48222369959cbef))  - (goliatone)
- Workflows in deps ([350eb8d](https://github.com/goliatone/go-admin/commit/350eb8d388fe3f67269d1449c2f61bce8a0d9191))  - (goliatone)
- Activity labels ([43336cd](https://github.com/goliatone/go-admin/commit/43336cdce773d1b0e77b40472d3b4e348370c9b0))  - (goliatone)
- Expose preview and transition to facade ([22db55b](https://github.com/goliatone/go-admin/commit/22db55b289b1f9f9c8687350fa36205fb9b7a5af))  - (goliatone)
- Public api ([ac282b1](https://github.com/goliatone/go-admin/commit/ac282b11fe1c823b356eedc828f9e3b675fe8766))  - (goliatone)
- Simple workflow ([ba3a165](https://github.com/goliatone/go-admin/commit/ba3a165bc66a087b64d44c046b25a5c99c673952))  - (goliatone)
- User roles context ([ccb8208](https://github.com/goliatone/go-admin/commit/ccb82082d80d88e28cb67058ec9a46df7db11553))  - (goliatone)
- Activity action labels ([21f92dc](https://github.com/goliatone/go-admin/commit/21f92dcd2c56fc9d164ddb95b836009a36adec21))  - (goliatone)
- Rewrite roles for HTML ([2543392](https://github.com/goliatone/go-admin/commit/2543392bcced7d9c790dec38ec1d7611b5df6a67))  - (goliatone)
- Templates for activity ([b9ade60](https://github.com/goliatone/go-admin/commit/b9ade60880a4f6777255ec20c7d78684e6060367))  - (goliatone)
- Admin context include translator ([68758e8](https://github.com/goliatone/go-admin/commit/68758e8ad3d98f48dfb463386adbb09030e3c5ea))  - (goliatone)
- Cms workflow types ([c78ea6c](https://github.com/goliatone/go-admin/commit/c78ea6cafd4949c21e51d3e56971eee46926c8c7))  - (goliatone)
- Boot workflow ([1fa83e6](https://github.com/goliatone/go-admin/commit/1fa83e696c5be852d9c0806afab0d0a900cf33ec))  - (goliatone)
- Enable public api ([9c596dd](https://github.com/goliatone/go-admin/commit/9c596ddc654416628dbaa41e748e57f4644e37a9))  - (goliatone)
- Workflow integration for content ([8a75c06](https://github.com/goliatone/go-admin/commit/8a75c06b38d04d249f1486d3730a8071c4f96b44))  - (goliatone)
- Activity frontend display ([19a6fd5](https://github.com/goliatone/go-admin/commit/19a6fd5918b575ac270edf21bd31efee9fcff7ad))  - (goliatone)
- Activity widget ([05975af](https://github.com/goliatone/go-admin/commit/05975afa5a86f341d4be33ceb5a532d58295890c))  - (goliatone)
- Feature gate scope RBAC support ([2ca9a40](https://github.com/goliatone/go-admin/commit/2ca9a403818ae0782cc7a811e854fbd30a3de6dd))  - (goliatone)
- Updated permission matrix ([51752a6](https://github.com/goliatone/go-admin/commit/51752a630e3a6876968ddc27f2f4f4bd5884768e))  - (goliatone)
- Resource list for user ([043c524](https://github.com/goliatone/go-admin/commit/043c52407eea13059854b371e24c1f3d32bf5e33))  - (goliatone)
- Import role ([430c5a3](https://github.com/goliatone/go-admin/commit/430c5a3448f866b80e86980decaca7decc062528))  - (goliatone)
- Expose bulk user import ([aaf1a1e](https://github.com/goliatone/go-admin/commit/aaf1a1e648cd67f97b6eb0e95555008a1f5b991b))  - (goliatone)
- User import debug integration ([cf11a4e](https://github.com/goliatone/go-admin/commit/cf11a4e308e341c88df132fea2326d5999efd8a3))  - (goliatone)
- User import step to boot ([9e7d829](https://github.com/goliatone/go-admin/commit/9e7d829abb027b802f65a17497bc399022166413))  - (goliatone)
- User import perms ([3ca4ab4](https://github.com/goliatone/go-admin/commit/3ca4ab458733ce131ab86ec1ec10522988ea3345))  - (goliatone)
- Import for auth action ([d7b876c](https://github.com/goliatone/go-admin/commit/d7b876c2972f5b6a9bdfe38c8c2ff82505372b7a))  - (goliatone)
- New form generator ([f321ada](https://github.com/goliatone/go-admin/commit/f321ada2ae032ebb0ce38e6a70adde5987fe435c))  - (goliatone)
- Role meta to user module ([fceef78](https://github.com/goliatone/go-admin/commit/fceef78831de01d40b07a20c817c987a0ec0614b))  - (goliatone)
- Integrate roles with user ([244586e](https://github.com/goliatone/go-admin/commit/244586ea6580ed6b57eda4a1b00f896c572c616a))  - (goliatone)
- Boot user import setup ([d7ec30d](https://github.com/goliatone/go-admin/commit/d7ec30d478a93598dbabcfd688843a1dd8d4098f))  - (goliatone)
- Formgen helpers ([58c6a4d](https://github.com/goliatone/go-admin/commit/58c6a4d005fe8d6898ae86b4afcc6c45903e816e))  - (goliatone)
- Bulk user import ([18da2c0](https://github.com/goliatone/go-admin/commit/18da2c0caeba362e132be810197d4cc6c0af6495))  - (goliatone)
- User record and role records ([bba5183](https://github.com/goliatone/go-admin/commit/bba51838e941437cc3df819d8ff3e969977e2aeb))  - (goliatone)
- Permission matrix; ([66911f8](https://github.com/goliatone/go-admin/commit/66911f809e01f32b1b918bad0def62dcd430ea8f))  - (goliatone)
- User import setup ([72ec68e](https://github.com/goliatone/go-admin/commit/72ec68eb66de88a59ea1fdf420dceb3678cbcb69))  - (goliatone)
- Roles formgen setup ([0b05c02](https://github.com/goliatone/go-admin/commit/0b05c0294954407346fd4d021d3fa67d8acb38d8))  - (goliatone)
- Users import setup ([c18de01](https://github.com/goliatone/go-admin/commit/c18de01ce51ec568cdd9611d473706cfe1458086))  - (goliatone)
- Roles UI setup ([96578a6](https://github.com/goliatone/go-admin/commit/96578a6f84d986b4a85c77133b9b777d9ad3d4c5))  - (goliatone)
- User role routes ([7a8fd94](https://github.com/goliatone/go-admin/commit/7a8fd94cc507a215be9d825053cb4671b0f0785a))  - (goliatone)
- Role management and user import ([8763467](https://github.com/goliatone/go-admin/commit/8763467b8488d23ce8029c2d0addf15936cd2f6d))  - (goliatone)
- Feature descriptions ([8f40055](https://github.com/goliatone/go-admin/commit/8f400557b80b8251015c3e05d508e8c791fd08f5))  - (goliatone)
- Feature catalog setup ([62c788d](https://github.com/goliatone/go-admin/commit/62c788d34edd5e1b038bb46526a19813900cdab4))  - (goliatone)
- Feature catalog option ([cff6b87](https://github.com/goliatone/go-admin/commit/cff6b87ff9f0e01c7a3cf8ed3739f4923a09cf24))  - (goliatone)
- Feature catalog ([33a0241](https://github.com/goliatone/go-admin/commit/33a02415164bc025dc5d6507727d22a45f4a4166))  - (goliatone)
- Feature flags manager ([a742644](https://github.com/goliatone/go-admin/commit/a7426447982accc5be7ccdbb840528f21d8b33be))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Use new go-auth adapter for feature flags ([e627983](https://github.com/goliatone/go-admin/commit/e6279839f7e46a4117175e42da684251cdb0f4b6))  - (goliatone)
- Use scope chain for feat gate ([9ebc2e3](https://github.com/goliatone/go-admin/commit/9ebc2e3fa60318431b3fa1ac2eb6c91b2fe1f582))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.21.1 ([46f5526](https://github.com/goliatone/go-admin/commit/46f55260560e32377e46555ab0ee355658704b89))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([49c8272](https://github.com/goliatone/go-admin/commit/49c8272ab4de28d518d66ba461f07a4759b2882e))  - (goliatone)
- Update tests ([c67dccd](https://github.com/goliatone/go-admin/commit/c67dccd4eb6580d7a5f4b30a414f980434d43155))  - (goliatone)
- Update format ([ee64ded](https://github.com/goliatone/go-admin/commit/ee64dedb346befb1810f7215aa98bb9ec7d03bd2))  - (goliatone)
- Update assets ([5a29817](https://github.com/goliatone/go-admin/commit/5a298179ab8f87cc0cb91d6cd3f93d9422cda0b7))  - (goliatone)
- Update examples ([54bc288](https://github.com/goliatone/go-admin/commit/54bc288529c59ee4319238aa975d072e135af4e5))  - (goliatone)
- Udpate deps ([e09f97a](https://github.com/goliatone/go-admin/commit/e09f97ad899d791b5aa5d8b6df431fae3532c220))  - (goliatone)
- Udpate test ([dd84f06](https://github.com/goliatone/go-admin/commit/dd84f061dc953541b28a5c9efb59786bbd2f3f73))  - (goliatone)
- Update guides ([a0b8a97](https://github.com/goliatone/go-admin/commit/a0b8a975e12b4e8daeae50ba15fd9ee9805774b1))  - (goliatone)

# [0.21.1](https://github.com/goliatone/go-admin/compare/v0.21.0...v0.21.1) - (2026-01-23)

## <!-- 13 -->📦 Bumps

- Bump version: v0.21.1 ([d98e5d4](https://github.com/goliatone/go-admin/commit/d98e5d414b13dca6ce30ccd80a745ae512abc972))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.21.0 ([bc57d1c](https://github.com/goliatone/go-admin/commit/bc57d1cd933d7ec98f8db4b379883c491343738b))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([c96eab2](https://github.com/goliatone/go-admin/commit/c96eab24af0b15c67e2d5e7c0cb8d92ef03acc00))  - (goliatone)

# [0.21.0](https://github.com/goliatone/go-admin/compare/v0.20.0...v0.21.0) - (2026-01-23)

## <!-- 1 -->🐛 Bug Fixes

- Debug console styling ([053565b](https://github.com/goliatone/go-admin/commit/053565b1b15b191f6d2732f086a9b49ecbf51aa8))  - (goliatone)
- Dedup scopes ([d4561c3](https://github.com/goliatone/go-admin/commit/d4561c3defc372ff4c9b3045c2bc04e58df67920))  - (goliatone)
- Admin activity enrich with tenant/org before logging ([67c0888](https://github.com/goliatone/go-admin/commit/67c08882e3c219ccfd8e5473050a378a7b4bdb54))  - (goliatone)
- Icon for feature flags module ([584c186](https://github.com/goliatone/go-admin/commit/584c18630fa3866bbb20f1c1fd3b22d8f6a2b46b))  - (goliatone)
- Nav helper handle active menu item ([08f2f29](https://github.com/goliatone/go-admin/commit/08f2f296afd7872a3afcf853d32ad790d1e0fd39))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.21.0 ([1193b34](https://github.com/goliatone/go-admin/commit/1193b34672e9521cc62e8532040e2c48fe8948bf))  - (goliatone)

## <!-- 16 -->➕ Add

- Updated shell and console panels ([3d52e0c](https://github.com/goliatone/go-admin/commit/3d52e0cebcec62fb79722d6ea0da93a1d9ccaeec))  - (goliatone)
- New assets for icon and logo with support for variants ([01b8124](https://github.com/goliatone/go-admin/commit/01b8124a601c639a994c7db75b2c6a89f4f9ee21))  - (goliatone)
- Version to api ([42415e1](https://github.com/goliatone/go-admin/commit/42415e1a0e02a489be51a0de686705b0925e66f6))  - (goliatone)
- New search box component ([417d40c](https://github.com/goliatone/go-admin/commit/417d40cc5082c3d7c3a48c19308d7c10f14606f3))  - (goliatone)
- Updated UI components ([7924bde](https://github.com/goliatone/go-admin/commit/7924bde2a34091172fd875862c58fd33ceba4d04))  - (goliatone)
- Feature flag client ([ddc3608](https://github.com/goliatone/go-admin/commit/ddc3608d79d577e7b36de4570744dfdf0ad8d5de))  - (goliatone)
- Routes with feature gates ([2648807](https://github.com/goliatone/go-admin/commit/26488076f0d6da1532917731571c9f7ce783ff5c))  - (goliatone)
- Feature enabled use gate ([79dffb4](https://github.com/goliatone/go-admin/commit/79dffb4f9030e0d0f089bacc07560f82e41ea922))  - (goliatone)
- Feature flags in auth ui ([b7dbb00](https://github.com/goliatone/go-admin/commit/b7dbb0021423e67ada70b97bfaefdeb67e4d151b))  - (goliatone)
- Feature flag UI manager component ([e1332e4](https://github.com/goliatone/go-admin/commit/e1332e48d942e4e77cc05f93850d8dc89e992ff8))  - (goliatone)
- URL resolver to boot ([c5e4ace](https://github.com/goliatone/go-admin/commit/c5e4ace50ae567419e08b2d6d98e9ad6d10667db))  - (goliatone)
- Updated style for feature flag UI ([18c0055](https://github.com/goliatone/go-admin/commit/18c0055044988cd04a73c0cd65b672e29f0a33ff))  - (goliatone)
- Feature flags UI ([f424968](https://github.com/goliatone/go-admin/commit/f42496844ed43da4fc4f03619870c51e6e7d9d84))  - (goliatone)
- URL manager to DI container ([82673bc](https://github.com/goliatone/go-admin/commit/82673bc91ae1f37c49098cf32d33591c540a2933))  - (goliatone)
- URL config ([5e66ebd](https://github.com/goliatone/go-admin/commit/5e66ebd3419286c282aeffdaf8ee51aab7e56cb0))  - (goliatone)
- URL config defaults ([c87cc69](https://github.com/goliatone/go-admin/commit/c87cc69e25238d33533555d3f626cd38ecd29b1b))  - (goliatone)
- URL manager ([f3df5b8](https://github.com/goliatone/go-admin/commit/f3df5b8c80412bf16fb31d77c45c597f78bab428))  - (goliatone)
- Feature flags module ([5fc78cd](https://github.com/goliatone/go-admin/commit/5fc78cda6af937219b2eb13df2880409d51ce0da))  - (goliatone)
- List method to feature override ([82612b3](https://github.com/goliatone/go-admin/commit/82612b3c047f43da710f39f4c825e9c8883dcb37))  - (goliatone)
- ROuteSpec for api/feature-flags ([9755370](https://github.com/goliatone/go-admin/commit/9755370de0b21a1a5da86b6d0338f10d88b6b6f3))  - (goliatone)
- List feature flags ([893fe2e](https://github.com/goliatone/go-admin/commit/893fe2e2dc7bffbf83d17f70107051de8f3ee327))  - (goliatone)
- Debug feature flag ([0480753](https://github.com/goliatone/go-admin/commit/048075363a1bb2796e6ff383a1cee7b7f2c2ee07))  - (goliatone)
- Support feature flag keys ([8ceb8b8](https://github.com/goliatone/go-admin/commit/8ceb8b8aed1edc23662ebac46c6e646befed5e47))  - (goliatone)
- Feature flags management ([296299a](https://github.com/goliatone/go-admin/commit/296299a37af97176cddf9adde002576c660ef60b))  - (goliatone)
- Feature flags ([db092f1](https://github.com/goliatone/go-admin/commit/db092f1045cb63f712df824aaae9427c84c76394))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.20.0 ([b47d3de](https://github.com/goliatone/go-admin/commit/b47d3de6d292d679742876a7d297f05a96efc96c))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([96c9ba3](https://github.com/goliatone/go-admin/commit/96c9ba3a9067f0a941ee05e5c7f61684a3080f3f))  - (goliatone)
- Update guides ([5f7211f](https://github.com/goliatone/go-admin/commit/5f7211faf45ac6680c055347a6a44eb16a1a29a1))  - (goliatone)
- Update tests ([7eb64e5](https://github.com/goliatone/go-admin/commit/7eb64e599b418da10280e60641eeee3328049720))  - (goliatone)

# [0.20.0](https://github.com/goliatone/go-admin/compare/v0.19.0...v0.20.0) - (2026-01-22)

## <!-- 1 -->🐛 Bug Fixes

- Error messages ([b01882f](https://github.com/goliatone/go-admin/commit/b01882fbecdb674f6ef499e3c600116f149a0f68))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.20.0 ([d3091b0](https://github.com/goliatone/go-admin/commit/d3091b0532e45a618f9611de4a3eca69f09c4ee2))  - (goliatone)

## <!-- 16 -->➕ Add

- Admin feature gate integration ([639531e](https://github.com/goliatone/go-admin/commit/639531e73443ec9611069b62f225acd6a123354f))  - (goliatone)
- Runtime feature overrides ([0565bf9](https://github.com/goliatone/go-admin/commit/0565bf9dbb34fdedeceff02546ab11ed0229e11e))  - (goliatone)
- Quickstart use feature gate package ([b6fb3a8](https://github.com/goliatone/go-admin/commit/b6fb3a85e7a1f65aa7f3077439b9a861172f6d74))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Admin feature gate management ([9841d7b](https://github.com/goliatone/go-admin/commit/9841d7b825a729b535957aafb325693b4e99195a))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.19.0 ([e6e1ba3](https://github.com/goliatone/go-admin/commit/e6e1ba38dc897cdf019e62a835fa3037164b9735))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([f765dc2](https://github.com/goliatone/go-admin/commit/f765dc2c96a09dc606717e36944d43e99fa34ed2))  - (goliatone)
- Update deps ([6b3b5a2](https://github.com/goliatone/go-admin/commit/6b3b5a233bac56972c01791fc53ed1a09553820c))  - (goliatone)
- Update guides ([9be76b5](https://github.com/goliatone/go-admin/commit/9be76b5b90f791cfff966f248ca8fbf0c12cb701))  - (goliatone)
- Update examples ([d63dbd3](https://github.com/goliatone/go-admin/commit/d63dbd36f5feb30ec081b5823cdd12dec5433517))  - (goliatone)
- Udpate deps ([446d385](https://github.com/goliatone/go-admin/commit/446d3856ba1a739b35fa0ad31566d2cb080cf23e))  - (goliatone)
- Udpate example ([8e56b3a](https://github.com/goliatone/go-admin/commit/8e56b3acddcd9834d0a52cd11947d463474efe58))  - (goliatone)

# [0.19.0](https://github.com/goliatone/go-admin/compare/v0.18.0...v0.19.0) - (2026-01-21)

## <!-- 1 -->🐛 Bug Fixes

- User migrations use dialect migration option ([b5d404c](https://github.com/goliatone/go-admin/commit/b5d404c1b1d0376b6ca5067a9fb5cb67539b572c))  - (goliatone)
- Use new migration setup from go-users ([fe46300](https://github.com/goliatone/go-admin/commit/fe46300ce9a513b2601405cf90ea454a0081ab1a))  - (goliatone)
- Normalize templates ([2d2338e](https://github.com/goliatone/go-admin/commit/2d2338e6ffd202eed911498f4209008e44a7e756))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.19.0 ([384be6c](https://github.com/goliatone/go-admin/commit/384be6c3b5f85dc29e63937be6064a1b41878786))  - (goliatone)

## <!-- 16 -->➕ Add

- Quickstart migrations ([ede1f61](https://github.com/goliatone/go-admin/commit/ede1f616e96a2126107f2eeadfdb64cda26e57e3))  - (goliatone)
- Update client style ([5a9e62c](https://github.com/goliatone/go-admin/commit/5a9e62c76127beeb8b389e5cb33a21f3a7e9ecc7))  - (goliatone)
- Templates updated for auth flow ([e1a0297](https://github.com/goliatone/go-admin/commit/e1a029710feb29e8b6b608bca9adcba4c77317d6))  - (goliatone)
- Auth ui flow handler ([2873158](https://github.com/goliatone/go-admin/commit/28731580c6909574564ac139101b091d02205bc8))  - (goliatone)
- Context for template in auth ([65bd19d](https://github.com/goliatone/go-admin/commit/65bd19d1fadf620e5a693ecf750cf4615448d590))  - (goliatone)
- Password reset confirmation path option ([42d6b97](https://github.com/goliatone/go-admin/commit/42d6b9767d647b051f3676286c1b3ebd8ebe3514))  - (goliatone)
- Secure link to quickstart ([ddcce66](https://github.com/goliatone/go-admin/commit/ddcce66eda202333364f1aa722889a2443d1e66b))  - (goliatone)
- Password reset confirm ([b97fc75](https://github.com/goliatone/go-admin/commit/b97fc758fbd4d8c3add749f0ec953c1669613fa4))  - (goliatone)
- Updated template setup for logo ([91d1932](https://github.com/goliatone/go-admin/commit/91d1932924aa9ac182ab9e4c6385dc237983b49a))  - (goliatone)
- Better theme support ([d281f3e](https://github.com/goliatone/go-admin/commit/d281f3e2534f07a4c49addbf4fad574ec05eafa9))  - (goliatone)
- Updated registration UI ([6273fd9](https://github.com/goliatone/go-admin/commit/6273fd98ba1de4c82614f128c5d87d535745867b))  - (goliatone)
- Udpated template setup ([0ca0cf1](https://github.com/goliatone/go-admin/commit/0ca0cf118ba3a0642d79e3d3cef238c0ea386bff))  - (goliatone)
- Auth ui and onboarding setup ([b18d95c](https://github.com/goliatone/go-admin/commit/b18d95c03d93e475a27b5fb53464630998474b11))  - (goliatone)
- Pwd reset template ([6f042f0](https://github.com/goliatone/go-admin/commit/6f042f0a2163217b73ad9c7f65ea442c9d16b60c))  - (goliatone)
- Register template ([cdeeb0b](https://github.com/goliatone/go-admin/commit/cdeeb0b7ad24a126ae131935c693becad449ea80))  - (goliatone)
- Secure link example ([977100f](https://github.com/goliatone/go-admin/commit/977100fb0153bcee3e4fa4b885b6bbe9a7593f8a))  - (goliatone)
- Client assets for login ([0876970](https://github.com/goliatone/go-admin/commit/087697047f05cb676da441bf9a7f9e2ef53e0a07))  - (goliatone)
- Optional auth ui flags ([33560ab](https://github.com/goliatone/go-admin/commit/33560ab61f9152dfdd7da5aa034c07ed39044afa))  - (goliatone)
- Refactor templates login to be able to have partials ([1b7d93a](https://github.com/goliatone/go-admin/commit/1b7d93a1d2d8ef7ff21a75dda4967e9b99e3b21d))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.18.0 ([5c885cf](https://github.com/goliatone/go-admin/commit/5c885cf4f306c11df3dd313e1e878baf6c390d6b))  - (goliatone)

## <!-- 30 -->📝 Other

- PR [#3](https://github.com/goliatone/go-admin/pull/3): login tpl ([fd15dd3](https://github.com/goliatone/go-admin/commit/fd15dd311467b1d4525661ea3aa90b7905a44d02))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([b849569](https://github.com/goliatone/go-admin/commit/b8495691d9bca74ed7bb1f6f084934b9e9e13bab))  - (goliatone)
- Udpate example ([25e84e1](https://github.com/goliatone/go-admin/commit/25e84e16b1035052302e1df46cbbc442a97c8fe0))  - (goliatone)
- Update readme ([b08254a](https://github.com/goliatone/go-admin/commit/b08254aaea05e435933464858b475cd892176993))  - (goliatone)
- Update tests ([a7876fd](https://github.com/goliatone/go-admin/commit/a7876fd9f286b059ec53112b11058c552bd48d60))  - (goliatone)
- Update examples ([427285e](https://github.com/goliatone/go-admin/commit/427285eee93c4ac00c99b66c25cb1a2cb4c55b16))  - (goliatone)
- Update guides ([490f2b2](https://github.com/goliatone/go-admin/commit/490f2b2608f229afa4ba919de94e7d23a51b6393))  - (goliatone)

# [0.18.0](https://github.com/goliatone/go-admin/compare/v0.17.0...v0.18.0) - (2026-01-18)

## <!-- 13 -->📦 Bumps

- Bump version: v0.18.0 ([6650ac5](https://github.com/goliatone/go-admin/commit/6650ac56c2e84e09bfdf210763d9d843f61e3727))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.17.0 ([75ee63d](https://github.com/goliatone/go-admin/commit/75ee63d8cabbc53a3e1f39e305135453c2126d0a))  - (goliatone)

# [0.17.0](https://github.com/goliatone/go-admin/compare/v0.16.0...v0.17.0) - (2026-01-18)

## <!-- 1 -->🐛 Bug Fixes

- Fs setup ([9f1d24a](https://github.com/goliatone/go-admin/commit/9f1d24ab2a6649555ace5c863a127d9c5ca5478d))  - (goliatone)
- Keep selve out of update ([7f5f356](https://github.com/goliatone/go-admin/commit/7f5f356c53624cf5c222995ebb6249e8477c852a))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.17.0 ([259d5b6](https://github.com/goliatone/go-admin/commit/259d5b6119cd347118826e844d6e556db3839426))  - (goliatone)

## <!-- 16 -->➕ Add

- Facade for export meta ([9c8232a](https://github.com/goliatone/go-admin/commit/9c8232aed2ade80e0f2cc7514dba6edf20e4c676))  - (goliatone)
- Assets for admin ([2652910](https://github.com/goliatone/go-admin/commit/265291056db7b8f8131d58b0eecb210411d56d55))  - (goliatone)
- Debug panel collector and registry ([1247583](https://github.com/goliatone/go-admin/commit/12475835a2305eabbe58e109798aeeea0d8299f2))  - (goliatone)
- Updated debug panels ([53d1c29](https://github.com/goliatone/go-admin/commit/53d1c2917d3a829c365e33150ad085f0f532f673))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Use CSS outside templates ([9efbfd9](https://github.com/goliatone/go-admin/commit/9efbfd9a3cdf633c5cf25dea52fe9386e6239e0b))  - (goliatone)
- Debug client setup ([5e9bb2e](https://github.com/goliatone/go-admin/commit/5e9bb2eecdfb5ba5a92299af88140fdaf8a8273d))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.16.0 ([88f8bfc](https://github.com/goliatone/go-admin/commit/88f8bfc70a255d7a8590c443d128f4bd4f139a74))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update docs ([bc4a412](https://github.com/goliatone/go-admin/commit/bc4a412b4a93892326a045ad1cac55378578f980))  - (goliatone)
- Update examples ([5f8f3d9](https://github.com/goliatone/go-admin/commit/5f8f3d98dbdee713e6276627380dce6e46de4832))  - (goliatone)
- Update gitignore ([16766e1](https://github.com/goliatone/go-admin/commit/16766e160dc9678c5ed022427b5db67c0190b17b))  - (goliatone)
- Update deps ([9d6b766](https://github.com/goliatone/go-admin/commit/9d6b7666b088276ccd84df1296a1a8f9452b9c35))  - (goliatone)
- Update tests ([5912931](https://github.com/goliatone/go-admin/commit/5912931f2b874e1bfe3ce0fec2a48430c4bb6b50))  - (goliatone)

# [0.16.0](https://github.com/goliatone/go-admin/compare/v0.15.0...v0.16.0) - (2026-01-17)

## <!-- 1 -->🐛 Bug Fixes

- Udpate session per user ([4a58654](https://github.com/goliatone/go-admin/commit/4a58654dc0d9f1fda5cdb2759de8cd59af353ad8))  - (goliatone)
- Connection and fallback for repl ([acd4bba](https://github.com/goliatone/go-admin/commit/acd4bba6b6683a60245bda4abcb51051a7fe4c0f))  - (goliatone)
- Use admin base path in normalzie debug config ([327ff0e](https://github.com/goliatone/go-admin/commit/327ff0ea6a541ccc2daf99261061c62d34a13c17))  - (goliatone)
- Exclude floating debug button on debug page ([4fa0299](https://github.com/goliatone/go-admin/commit/4fa0299f67bace4688698a3a7a5b13703a60f19a))  - (goliatone)
- Expose debug to facade ([2e265d6](https://github.com/goliatone/go-admin/commit/2e265d68c99f7e9dd57c6a69224286592c059cdd))  - (goliatone)
- Debug layout ([a947c44](https://github.com/goliatone/go-admin/commit/a947c44ba2d8da17661454a6eadac73de884dce8))  - (goliatone)
- Debug console copy to clipboard buttons ([1e37f8c](https://github.com/goliatone/go-admin/commit/1e37f8c5e87f7b722e55dfe794ce8eb7cbaf2766))  - (goliatone)
- Expose debug panels ([ba6f098](https://github.com/goliatone/go-admin/commit/ba6f098b289b7916ddb952a3c2ffafb3f438b0c9))  - (goliatone)
- Use actual go-command interface ([13a508f](https://github.com/goliatone/go-admin/commit/13a508f6d4b985b365c88f6c83dbc0136722deda))  - (goliatone)
- Typeo ([b317f31](https://github.com/goliatone/go-admin/commit/b317f31c80afffb0868aecc57ebdad9dd45d0709))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.16.0 ([c1f0e5e](https://github.com/goliatone/go-admin/commit/c1f0e5e0803638570a8c55cdbe7fa6d263a78d25))  - (goliatone)

## <!-- 16 -->➕ Add

- Json path search for content ([905feab](https://github.com/goliatone/go-admin/commit/905feabf063abfb7d2aa76e16f92e16ac14befa2))  - (goliatone)
- Debug token filtering ([b6eb93c](https://github.com/goliatone/go-admin/commit/b6eb93c1b23fe5e393c384d6f3c2eb0514f8a078))  - (goliatone)
- Debug base path ([ebfd0d4](https://github.com/goliatone/go-admin/commit/ebfd0d460aa0056853629ba944d0e8497603e139))  - (goliatone)
- Updated placeholers ([c509387](https://github.com/goliatone/go-admin/commit/c50938741f5655cc2c77cdbba3757f8a8aa6be1e))  - (goliatone)
- Hide content header ([955cbf7](https://github.com/goliatone/go-admin/commit/955cbf71856e56b51178302f758cd04d4c0acca4))  - (goliatone)
- Udpated debug panels ([ea82081](https://github.com/goliatone/go-admin/commit/ea820817276cf48e3b58570933387f981828a240))  - (goliatone)
- Debug integrations ([f20f034](https://github.com/goliatone/go-admin/commit/f20f034dfd2136897b9b5c11c8cb739ac0163423))  - (goliatone)
- Optional header rendering ([f11ea80](https://github.com/goliatone/go-admin/commit/f11ea809410a49dcbacb3e1af8951b9248c39a36))  - (goliatone)
- Update debug toolbar ([3ae4ce6](https://github.com/goliatone/go-admin/commit/3ae4ce6d1c30af358fd4efce1080d0d1e74351dc))  - (goliatone)
- Update debug assets ([4d64fff](https://github.com/goliatone/go-admin/commit/4d64fffd204411746ccb1a87188fe8c7da733181))  - (goliatone)
- Demo info ([5e769fa](https://github.com/goliatone/go-admin/commit/5e769fad3b9ca6b46b7189b643695b183e7cf03a))  - (goliatone)
- Debug view ([017da23](https://github.com/goliatone/go-admin/commit/017da2364e35df9c774017eedd9699cc2921f997))  - (goliatone)
- Debug template to respect layout options ([b0a6312](https://github.com/goliatone/go-admin/commit/b0a6312197d3d01144edde2db7da1f9cb480c294))  - (goliatone)
- Debug page should be optionally rendered in site ([4fe6d8b](https://github.com/goliatone/go-admin/commit/4fe6d8b561ae5adb0395d0e04979374832a55c1e))  - (goliatone)
- Debug index admin template ([2142fec](https://github.com/goliatone/go-admin/commit/2142fec922ce4bd006003e7de9bbee6308e926ea))  - (goliatone)
- Updated debug setup ([d27397d](https://github.com/goliatone/go-admin/commit/d27397d369194d8e2e69bd1820231b62a19e5f96))  - (goliatone)
- Examples shown ([570f8cb](https://github.com/goliatone/go-admin/commit/570f8cb91caa2e63742197fb744b82286b67392d))  - (goliatone)
- Update toolbars and debugger ([134f4b9](https://github.com/goliatone/go-admin/commit/134f4b91dd27611c978af80b8e938519681412f6))  - (goliatone)
- Debug panels to facade ([9e4c20f](https://github.com/goliatone/go-admin/commit/9e4c20f5e8332cefbd1ebb2e6904498d880dbcd1))  - (goliatone)
- Repl update ([77f0e1d](https://github.com/goliatone/go-admin/commit/77f0e1d6a927ccc88cf8a2c6648aa53204bce762))  - (goliatone)
- Dist output ([fb98f59](https://github.com/goliatone/go-admin/commit/fb98f5953d64de947915590e7c0a03df199929c9))  - (goliatone)
- Styling ([41e3bd6](https://github.com/goliatone/go-admin/commit/41e3bd6de80176dc481c9b91fa03657967355c77))  - (goliatone)
- Highlighting support ([286c15f](https://github.com/goliatone/go-admin/commit/286c15fecf8b729fb386ad75336238049e52b7ae))  - (goliatone)
- RPLE catalog ([a3c884f](https://github.com/goliatone/go-admin/commit/a3c884f36c8479aca8ecb60c235a170ef4d5788f))  - (goliatone)
- Repl debug commands ([b422839](https://github.com/goliatone/go-admin/commit/b422839e02ab24ca9c977b101440e029a4949ab4))  - (goliatone)
- Repl panels to debug ([733b8f2](https://github.com/goliatone/go-admin/commit/733b8f229314deefee1e1b80e0f37f51fcbaac1a))  - (goliatone)
- Debug repl implementation ([e378c98](https://github.com/goliatone/go-admin/commit/e378c986e27637a27d776aed52c4fd7865fb0434))  - (goliatone)
- Register REPL ws routes ([1b3f452](https://github.com/goliatone/go-admin/commit/1b3f4528c777be32e0d1ec87659dcf2eed4af92e))  - (goliatone)
- Repl debug app ([3270015](https://github.com/goliatone/go-admin/commit/3270015c527283880aed85f100257d006df2780f))  - (goliatone)
- Debug REPL setup ([12615b2](https://github.com/goliatone/go-admin/commit/12615b241c9013946d2e8eda4ec2e36bba08d616))  - (goliatone)
- REPL module registration ([9b4e62f](https://github.com/goliatone/go-admin/commit/9b4e62f6b650e25e43ac06a2db885f4a8d1288e0))  - (goliatone)
- Dynamic registration of debug panels ([551adbe](https://github.com/goliatone/go-admin/commit/551adbe03f33b138f00fdef6a129326345a166b8))  - (goliatone)
- Debug page UI ([8075931](https://github.com/goliatone/go-admin/commit/80759315ea76b9d0b8f2d1c2483ad7401b25a90d))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Expose const for types ([33b9df3](https://github.com/goliatone/go-admin/commit/33b9df332e4f25eaebafa16f21672f95c34281e2))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.15.0 ([0a6369a](https://github.com/goliatone/go-admin/commit/0a6369ae0071884e610ffeabc5a270e3c4834e90))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([c69e6db](https://github.com/goliatone/go-admin/commit/c69e6dbcac2a01d944e8a4ab634c068991321b50))  - (goliatone)
- Update format ([d31cbb8](https://github.com/goliatone/go-admin/commit/d31cbb8ccbb41de338e2c5bf827e815b1daed8a5))  - (goliatone)
- Clean up templates ([b58231e](https://github.com/goliatone/go-admin/commit/b58231ed95ad9be37c50a76480af6f29eb234d05))  - (goliatone)
- Update depsc ([e452649](https://github.com/goliatone/go-admin/commit/e452649aa3356a58a7f42cf6a53fdb2c86cf024d))  - (goliatone)
- Update deps ([7a85acb](https://github.com/goliatone/go-admin/commit/7a85acbf914f86a13bd0f928ad759f3d22c3a71b))  - (goliatone)
- Update tests ([9c796f0](https://github.com/goliatone/go-admin/commit/9c796f0abada6a566447538c126ca6729a3daf6a))  - (goliatone)

# [0.15.0](https://github.com/goliatone/go-admin/compare/v0.14.0...v0.15.0) - (2026-01-16)

## <!-- 13 -->📦 Bumps

- Bump version: v0.15.0 ([c122dfc](https://github.com/goliatone/go-admin/commit/c122dfc4ace2a2498062e2cd443d18c76499fe45))  - (goliatone)

## <!-- 16 -->➕ Add

- Expose debug query hook provider ([81b5f9b](https://github.com/goliatone/go-admin/commit/81b5f9bcfa577f94c4d3259ae4ec285def5ef742))  - (goliatone)
- Debug quickstart module ([a30912d](https://github.com/goliatone/go-admin/commit/a30912d1e335a259c3f61bcb28446aa838ab3fb8))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.14.0 ([d975242](https://github.com/goliatone/go-admin/commit/d975242164052b5465d0941fd7c5ad02695252de))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([3be9031](https://github.com/goliatone/go-admin/commit/3be9031d099c777ea0dc98c0c3e8a12c2c7ad613))  - (goliatone)
- Update deps ([ab4e31e](https://github.com/goliatone/go-admin/commit/ab4e31e1192727757c325d56836ee51a7fb708ec))  - (goliatone)
- Udpate readme ([8ee2437](https://github.com/goliatone/go-admin/commit/8ee2437af335b6d8fa2857f1811440b87475ec9e))  - (goliatone)
- Update tests ([4d60a57](https://github.com/goliatone/go-admin/commit/4d60a579a43abf980accb0a3acdc60f7aa0278dd))  - (goliatone)

# [0.14.0](https://github.com/goliatone/go-admin/compare/v0.13.0...v0.14.0) - (2026-01-15)

## <!-- 1 -->🐛 Bug Fixes

- Include theme context with capture view context ([b2c9b8e](https://github.com/goliatone/go-admin/commit/b2c9b8e881bc4bd75d666db6cc684dd74f969781))  - (goliatone)
- Empty activity slice ([b98f252](https://github.com/goliatone/go-admin/commit/b98f2521036ecc2fca2cbc21cae14b47aeed7cad))  - (goliatone)
- Debug toolbar icon alignment ([6e5f68d](https://github.com/goliatone/go-admin/commit/6e5f68decaf278a19b84d7a00516efe481814031))  - (goliatone)
- Root asset check ([f5979d4](https://github.com/goliatone/go-admin/commit/f5979d4600883e43614d88532ccb2f2a74c429cb))  - (goliatone)
- Remove register providers ([0ab9234](https://github.com/goliatone/go-admin/commit/0ab92341748423333d1b46c3852fde88681ae0f0))  - (goliatone)
- Use proper func syntax ([aca3b11](https://github.com/goliatone/go-admin/commit/aca3b11ddc1065d7d79697feb8e0db6180fc953c))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.14.0 ([c8ae63b](https://github.com/goliatone/go-admin/commit/c8ae63be14bcf9bbc4494310008cc998aab14761))  - (goliatone)

## <!-- 16 -->➕ Add

- Query hook for SQL for debug panel ([d160325](https://github.com/goliatone/go-admin/commit/d160325a72cea7511a842dbeb1c9c1b1dbde61d4))  - (goliatone)
- Activity permission for def ([e2dce04](https://github.com/goliatone/go-admin/commit/e2dce040b9053c748770787ab7303bc3381ed870))  - (goliatone)
- Wire activity in boot ([8763877](https://github.com/goliatone/go-admin/commit/876387775a4fc2cf6b41689e3a2b247eb9bd688a))  - (goliatone)
- Integrate activity feed ([5a23072](https://github.com/goliatone/go-admin/commit/5a23072594ec44c9e4f2c9ad98d12e17065cb9e1))  - (goliatone)
- Activity key ([7234079](https://github.com/goliatone/go-admin/commit/7234079b35f5bbaa00afbab5ac4c558e5a575840))  - (goliatone)
- Activity permision attr to config ([62991ae](https://github.com/goliatone/go-admin/commit/62991ae3945766adf7137557a5b16bd7335ac8db))  - (goliatone)
- Refs to activity types ([87655ac](https://github.com/goliatone/go-admin/commit/87655ac957aed7e2f46947b94a614810b758a41e))  - (goliatone)
- Tracking job activity ([c69171f](https://github.com/goliatone/go-admin/commit/c69171f98b5ac846ca9bca7231a2a61926378e49))  - (goliatone)
- Register activity module ([a4e7202](https://github.com/goliatone/go-admin/commit/a4e72022af6a8922e42ba797fbdfe206051c9eea))  - (goliatone)
- Toolbar fab setup ([9ed012c](https://github.com/goliatone/go-admin/commit/9ed012c84bc4eebeb84fa398ad82f9d4640b05ec))  - (goliatone)
- Activity UI layout ([0f3a97a](https://github.com/goliatone/go-admin/commit/0f3a97a6b49801d4bcfba449fb6400f1d2c9f071))  - (goliatone)
- Toolbar setup ([5c5ea78](https://github.com/goliatone/go-admin/commit/5c5ea78b888e610b9ae3b139564cc3e67eaf79e9))  - (goliatone)
- Toolbar alignment ([01eb391](https://github.com/goliatone/go-admin/commit/01eb391cab3a5d3148d0a540977b7c887704d9f4))  - (goliatone)
- Updated debug toolbar ([dc1138a](https://github.com/goliatone/go-admin/commit/dc1138ab2680f6423d628ec53159cc4a41d0a123))  - (goliatone)
- Activity routes ([892cff6](https://github.com/goliatone/go-admin/commit/892cff691fd5edd60ed9daa1da563f60910f0d80))  - (goliatone)
- Activity resource ([462120f](https://github.com/goliatone/go-admin/commit/462120ff413efa5a8ae6d10b0430ad2c216801db))  - (goliatone)
- Activity module ([622f948](https://github.com/goliatone/go-admin/commit/622f948640ddedfee34589db65e2eeed8c842966))  - (goliatone)
- Activity read ([4662444](https://github.com/goliatone/go-admin/commit/46624448b0ebf4da8fb1bb7130f4aa2549a5d135))  - (goliatone)
- Toolbar debug floating button ([d2e1d5c](https://github.com/goliatone/go-admin/commit/d2e1d5c33023f4012ba3f1afb581a07bb54b348b))  - (goliatone)
- Check for router type ([ef76599](https://github.com/goliatone/go-admin/commit/ef76599beea298c26e94c90a076296b223740124))  - (goliatone)
- New style for debug ([aa6acc4](https://github.com/goliatone/go-admin/commit/aa6acc47552ba88dd4b9e42f7f19f27079a9af65))  - (goliatone)
- Register fallback ([904f2e5](https://github.com/goliatone/go-admin/commit/904f2e5f2337351fa9b7e3e88e315072e3f9897b))  - (goliatone)
- Inject vars to template for toolbar ([39e3844](https://github.com/goliatone/go-admin/commit/39e384442e3bf7cee542e4e62b16195a4f505fe7))  - (goliatone)
- Expose debug panels ([12e6533](https://github.com/goliatone/go-admin/commit/12e6533a4013923de896e9abc2947f9926273421))  - (goliatone)
- Toolbar styling ([a388be9](https://github.com/goliatone/go-admin/commit/a388be96d6508a154069708974f39fbf9b8fcfe6))  - (goliatone)
- Toolbar debug ([d84c97c](https://github.com/goliatone/go-admin/commit/d84c97cefcedea69b210b8758eee99d064e03205))  - (goliatone)
- Debug toolbar assets ([aa20992](https://github.com/goliatone/go-admin/commit/aa209926197a4ff663339c01fc04753342c10cd4))  - (goliatone)
- Debug toolbar ([5afff62](https://github.com/goliatone/go-admin/commit/5afff62e5972321a78603b756118480eb44ef30b))  - (goliatone)
- View perms for debug ([4d05772](https://github.com/goliatone/go-admin/commit/4d05772fb1ee89c1df62ed809e6a0c7573fc3516))  - (goliatone)
- Debug collector patch for slog ([f43a843](https://github.com/goliatone/go-admin/commit/f43a843d6165c0eb602349c504cfe90d58671cbf))  - (goliatone)
- Debug masker integration ([fb47090](https://github.com/goliatone/go-admin/commit/fb470904a73429b14852d02cd83df54a960f8ff4))  - (goliatone)
- Admin expose router ([fd80dc8](https://github.com/goliatone/go-admin/commit/fd80dc80fab424bbd5734dadac6f812035c60fa4))  - (goliatone)
- Include router in module context ([adc5f27](https://github.com/goliatone/go-admin/commit/adc5f27e1232382f17b18302ef71e0c25f8a66a0))  - (goliatone)
- Quickstart resolve assets dir ([fea4e30](https://github.com/goliatone/go-admin/commit/fea4e30d7c3f43a15c3d7bc50009dd4eb6e645b6))  - (goliatone)
- AdminRouter exposed in ModuleContext ([af185a3](https://github.com/goliatone/go-admin/commit/af185a3cbaa90c30703c6fcd9a009fa5c8050acc))  - (goliatone)
- Debug client assets ([802b257](https://github.com/goliatone/go-admin/commit/802b257575a7a385542fa4f2537132fe3c223c47))  - (goliatone)
- Debug module panel def ([85b41b7](https://github.com/goliatone/go-admin/commit/85b41b7ae7782564629def86173997c4e54bee7c))  - (goliatone)
- Admin debug collector ([37d9401](https://github.com/goliatone/go-admin/commit/37d9401e3efac6cbe89eb690e3a89fd1f4318d26))  - (goliatone)
- Register paths ([ab77fec](https://github.com/goliatone/go-admin/commit/ab77fecbd883f4b57d689e206fe18d3b8217ea0d))  - (goliatone)
- Settings adapter ([46893b3](https://github.com/goliatone/go-admin/commit/46893b3597ef5b207ffcf60e28886c29fc30574c))  - (goliatone)
- Expose facade module ([eba4b72](https://github.com/goliatone/go-admin/commit/eba4b72ad5dae095bb767f800dca46c41aeccc95))  - (goliatone)
- Register debug ([c788c57](https://github.com/goliatone/go-admin/commit/c788c577bff195652231df3368a7d6e200f10799))  - (goliatone)
- Config setup for debug ([ca25ca3](https://github.com/goliatone/go-admin/commit/ca25ca3be959ec030f263997d7bb1c55de33f65a))  - (goliatone)
- Cache for settings ([3b0ee7a](https://github.com/goliatone/go-admin/commit/3b0ee7a54c9150a27f18ae6d50238bc8d25b97b9))  - (goliatone)
- Ring buffer for debug ([fe65c7a](https://github.com/goliatone/go-admin/commit/fe65c7a06bc1d6c756599aaa91959a4e6c6ca60c))  - (goliatone)
- Debug module ([1e13160](https://github.com/goliatone/go-admin/commit/1e1316018b736552a63d9bc1aa208aa63dda1b23))  - (goliatone)
- Debug client ([81545f8](https://github.com/goliatone/go-admin/commit/81545f83a7d8628aa3adc323fe5016d4e57e4125))  - (goliatone)
- Debug panel ([6cab077](https://github.com/goliatone/go-admin/commit/6cab0770bb32fcb8baa800b7fecc82953468e559))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.13.0 ([849c7f6](https://github.com/goliatone/go-admin/commit/849c7f67275dc897719203fd13ad0f873028b437))  - (goliatone)

## <!-- 30 -->📝 Other

- PR [#2](https://github.com/goliatone/go-admin/pull/2): activity feat ([e4b5887](https://github.com/goliatone/go-admin/commit/e4b58873f77ec6bcebec351db31a9b8b025dd4d5))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([73039d3](https://github.com/goliatone/go-admin/commit/73039d3fdc06091a348c8e2e32716d9f4263f041))  - (goliatone)
- Update changelog ([be8e965](https://github.com/goliatone/go-admin/commit/be8e9651a3555629d0cfd83ee70ed02f995efdb9))  - (goliatone)
- Update readme ([82dd66c](https://github.com/goliatone/go-admin/commit/82dd66cffbdb21ee3cb1e0a42c4b3934ed5a94f3))  - (goliatone)
- Update tests ([957f920](https://github.com/goliatone/go-admin/commit/957f920e8ef665cb166523d7a0f7a252cf136dde))  - (goliatone)
- Update deps ([1693019](https://github.com/goliatone/go-admin/commit/169301918945ab435df39f7bcae2721ff61de3d4))  - (goliatone)
- Update dev:serve task ([a74d953](https://github.com/goliatone/go-admin/commit/a74d95376382a50749db4a874bcd9076d5529827))  - (goliatone)

# [0.13.0](https://github.com/goliatone/go-admin/compare/v0.12.0...v0.13.0) - (2026-01-14)

## <!-- 1 -->🐛 Bug Fixes

- Datatable should clamp results to max/total ([4e40ff8](https://github.com/goliatone/go-admin/commit/4e40ff89a459ded9e706160dc508d21bb56f16aa))  - (goliatone)
- Template use singualr label ([fe60afb](https://github.com/goliatone/go-admin/commit/fe60afb6e7ccf9cce1332543d40bb380125dc517))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.13.0 ([4b1c515](https://github.com/goliatone/go-admin/commit/4b1c5157404b9ca7bd7efdbfe3dcc8aaf9bb4f04))  - (goliatone)

## <!-- 16 -->➕ Add

- Mock data ([5e93f9b](https://github.com/goliatone/go-admin/commit/5e93f9bba20094c3cffeb42fb93ad8ad6a323dec))  - (goliatone)
- Quickstart UI routes ([a1cb6dd](https://github.com/goliatone/go-admin/commit/a1cb6dd28b7c202fc1259bdf40071abd53ed5f9e))  - (goliatone)
- Quickstart theme view ([286ade6](https://github.com/goliatone/go-admin/commit/286ade6ef819c96d9a9a550b575cb59dfc17cd60))  - (goliatone)
- Quickstart export renderers ([f97d50b](https://github.com/goliatone/go-admin/commit/f97d50b58329accf49502e8b04283b31905ccb96))  - (goliatone)
- Auth UI to quickstart ([f57d3b6](https://github.com/goliatone/go-admin/commit/f57d3b63cda38be96bd1c72a62605688aa5acbc6))  - (goliatone)
- Asset probe for quickstart ([93dfc83](https://github.com/goliatone/go-admin/commit/93dfc838ce8c4ffba35cf9579adfa44d1931a3e6))  - (goliatone)
- Proper labels for items ([59976dc](https://github.com/goliatone/go-admin/commit/59976dc254540b6dc2f3e3755a1b94186a4a613f))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.12.0 ([3449b05](https://github.com/goliatone/go-admin/commit/3449b05bfcd5f40a65ccb6fa33c3c45ebc15b8a0))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([7ecf488](https://github.com/goliatone/go-admin/commit/7ecf488d7f47d08d181e59917f6ced3e630ce2d0))  - (goliatone)
- Update readme ([2df05c8](https://github.com/goliatone/go-admin/commit/2df05c8c57bb5017e3885e8981e6b6275422f47a))  - (goliatone)
- Update examples ([95dda31](https://github.com/goliatone/go-admin/commit/95dda3163456291243c3fc26eb1f335db5526436))  - (goliatone)

# [0.12.0](https://github.com/goliatone/go-admin/compare/v0.11.0...v0.12.0) - (2026-01-13)

## <!-- 1 -->🐛 Bug Fixes

- Tie quickstart to go-admin version ([6a3e314](https://github.com/goliatone/go-admin/commit/6a3e31471f163d9f4638fc14438d9d7179932542))  - (goliatone)
- Add new interface ([6390c8e](https://github.com/goliatone/go-admin/commit/6390c8e6b04489952d93bc86e870e16ab8aaca65))  - (goliatone)
- Include body in binding ([7436b86](https://github.com/goliatone/go-admin/commit/7436b86ad217ee39b2496dac743eb040ba631924))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.12.0 ([d3e6a59](https://github.com/goliatone/go-admin/commit/d3e6a5970bb7f0ddf29e4a97ed0b9d9840ca3e40))  - (goliatone)

## <!-- 16 -->➕ Add

- View engine ([035dd48](https://github.com/goliatone/go-admin/commit/035dd48304d9d61f81c4d2196ac7eeca07390179))  - (goliatone)
- Quickstart template funcs ([b931418](https://github.com/goliatone/go-admin/commit/b9314187262a9ff35b7e679330b6f5947906a714))  - (goliatone)
- Expose admin types ([08a720a](https://github.com/goliatone/go-admin/commit/08a720a6f8947e04bcf839dfc0046de6e9cf39ef))  - (goliatone)
- Command bus udpate ([2ff009e](https://github.com/goliatone/go-admin/commit/2ff009ea1259d14ba2954cd99f7c41d9f1cb52db))  - (goliatone)
- New command registraion flow ([66cec4f](https://github.com/goliatone/go-admin/commit/66cec4f9dc3f5cd5a2f1561c85be6011dab9ac59))  - (goliatone)
- New command bus ([9f8d8e8](https://github.com/goliatone/go-admin/commit/9f8d8e8068a00cc6cd9441d3ecd12870fe341a2b))  - (goliatone)
- Register commands ([b021fd2](https://github.com/goliatone/go-admin/commit/b021fd25e594d84c5fa71a3158e273f2cfd1767b))  - (goliatone)
- Task to publish quickstart ([905d499](https://github.com/goliatone/go-admin/commit/905d499296c5aaed84b131dae43704268a4fbae9))  - (goliatone)
- CLI helpers ([d8d4ef9](https://github.com/goliatone/go-admin/commit/d8d4ef91bcd4f5761fd0ee9b0d2de6d31b00283f))  - (goliatone)
- Cli config ([28e0980](https://github.com/goliatone/go-admin/commit/28e09801378420f008fb29a3ee2f8547f0c2435b))  - (goliatone)
- Command messages ([92f934f](https://github.com/goliatone/go-admin/commit/92f934ffe523a32a7cc88f387cfeef564bb9be80))  - (goliatone)
- Command bus ([5c29185](https://github.com/goliatone/go-admin/commit/5c29185345b015727d1405e20eed67830f1141ce))  - (goliatone)
- Base ([bfab648](https://github.com/goliatone/go-admin/commit/bfab6489f98eaa614b72911e0f2e2f2b8efbe5bf))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Command implementation ([c047cc3](https://github.com/goliatone/go-admin/commit/c047cc32005a160715e4eed51d68da69daa73989))  - (goliatone)
- Update command facades ([8613d49](https://github.com/goliatone/go-admin/commit/8613d4916f05b660bc9d116c3205a1bde1482a84))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.11.0 ([a8019a4](https://github.com/goliatone/go-admin/commit/a8019a4be073855b785395cc1cc8032b4e0aec28))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate example ([b69e987](https://github.com/goliatone/go-admin/commit/b69e9877c3b3b05caf48d4c4f5ab7d17b8266658))  - (goliatone)
- Update deps ([7b290be](https://github.com/goliatone/go-admin/commit/7b290bef9405ed029cd8b425b14c1de8a6ceb554))  - (goliatone)
- Update readme ([4fa92c6](https://github.com/goliatone/go-admin/commit/4fa92c6bc11fd80088a7a5413bcad50d2988bc53))  - (goliatone)
- Update tests ([c8d97ae](https://github.com/goliatone/go-admin/commit/c8d97ae03b7b37d6ce80ea76014ee4d25a22909b))  - (goliatone)
- Update examples ([b94aa83](https://github.com/goliatone/go-admin/commit/b94aa8352b791c86ed8d011690a25c08ef5068ce))  - (goliatone)
- Udpate deps ([43aceba](https://github.com/goliatone/go-admin/commit/43acebac2b1b37b49479857ddf53f090f50897a7))  - (goliatone)

# [0.11.0](https://github.com/goliatone/go-admin/compare/v0.10.0...v0.11.0) - (2026-01-13)

## <!-- 1 -->🐛 Bug Fixes

- Format ([8806cde](https://github.com/goliatone/go-admin/commit/8806cdeeb7fde7f89dfc9f557607fbda15b51144))  - (goliatone)
- Testing prefs ([c4f745f](https://github.com/goliatone/go-admin/commit/c4f745f1b8b272960263538d7edd151c938a35fd))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.11.0 ([12c6205](https://github.com/goliatone/go-admin/commit/12c620509c2a86099cf62f53133a67252277209e))  - (goliatone)

## <!-- 16 -->➕ Add

- Use go-errors for prefs ([845eac4](https://github.com/goliatone/go-admin/commit/845eac4e4f886d59d28de80b752465d47b8fde2c))  - (goliatone)
- Config defaults for admin prefs ([d635ed1](https://github.com/goliatone/go-admin/commit/d635ed1292bc6a1ddbfe29f19383273de8b87b42))  - (goliatone)
- Take tenant and org ID into account in contxt ([46c7cee](https://github.com/goliatone/go-admin/commit/46c7cee0ed98cd71f7bdff21c3837718c66758bd))  - (goliatone)
- Expose preference types ([e86eb1f](https://github.com/goliatone/go-admin/commit/e86eb1f999c414a3bf2a87936f698bd82308ff4c))  - (goliatone)
- Upsert and delete actions to user prefs ([84dd3ac](https://github.com/goliatone/go-admin/commit/84dd3ac1213b4a7d9b67f11e07c334f62c869f2c))  - (goliatone)
- Preferences query and scope ([e68ce24](https://github.com/goliatone/go-admin/commit/e68ce24806f96e34b7dfdbcbbb32ad33c76db082))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.10.0 ([ded70f4](https://github.com/goliatone/go-admin/commit/ded70f47ea09ff90d2a0001d480904efdb05a5bd))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update examples ([d551528](https://github.com/goliatone/go-admin/commit/d551528c0161470cbd2a5d2fef94c88a2fb6ed47))  - (goliatone)
- Update readme ([0595483](https://github.com/goliatone/go-admin/commit/059548371e91d5d2233ed380b9b1964375e74e49))  - (goliatone)
- Update tests ([d6a8e6b](https://github.com/goliatone/go-admin/commit/d6a8e6b925402499313e87826439d591579e6e6f))  - (goliatone)

# [0.10.0](https://github.com/goliatone/go-admin/compare/v0.9.0...v0.10.0) - (2026-01-12)

## <!-- 1 -->🐛 Bug Fixes

- Test for routes ([132f093](https://github.com/goliatone/go-admin/commit/132f093d9317b51fef7db64271a9067b4384be91))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.10.0 ([310e24e](https://github.com/goliatone/go-admin/commit/310e24eaa77413e1dbeb2e952f2338dedd4fcca7))  - (goliatone)

## <!-- 16 -->➕ Add

- Clear method to user preferences ([5fd367f](https://github.com/goliatone/go-admin/commit/5fd367f7c10727149726df9fbd6d2d1d1679faf3))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.9.0 ([65e6061](https://github.com/goliatone/go-admin/commit/65e60617c36488c11957fdb2685e5cf426539d18))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update style ([c8f2cd0](https://github.com/goliatone/go-admin/commit/c8f2cd0f517daede7705f2b39c848e83564e968e))  - (goliatone)
- Update deps ([574413e](https://github.com/goliatone/go-admin/commit/574413e522ae122a715952c9b2e5b78a48e11336))  - (goliatone)
- Update tests ([b95e093](https://github.com/goliatone/go-admin/commit/b95e0931eee0ae07e127490bb0032260d9a219c7))  - (goliatone)
- Update readme ([c1577fd](https://github.com/goliatone/go-admin/commit/c1577fddcf2109782ebbb645f525f215d510be6b))  - (goliatone)

# [0.9.0](https://github.com/goliatone/go-admin/compare/v0.8.0...v0.9.0) - (2026-01-12)

## <!-- 13 -->📦 Bumps

- Bump version: v0.9.0 ([bef6be8](https://github.com/goliatone/go-admin/commit/bef6be80b9ed0fd42972061d7a92ef910b3eda14))  - (goliatone)

## <!-- 16 -->➕ Add

- With preferences setup ([fcb894e](https://github.com/goliatone/go-admin/commit/fcb894ee364960eb462f6bd8cf60f73be0dc7d09))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.8.0 ([aaf8ae2](https://github.com/goliatone/go-admin/commit/aaf8ae2aa5c5cb5ef6b928168c2488872021deb8))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update deps ([57d3ce6](https://github.com/goliatone/go-admin/commit/57d3ce601ebea357c1677944add0d743ab2064f6))  - (goliatone)

# [0.8.0](https://github.com/goliatone/go-admin/compare/v0.7.0...v0.8.0) - (2026-01-10)

## <!-- 13 -->📦 Bumps

- Bump version: v0.8.0 ([a2c463a](https://github.com/goliatone/go-admin/commit/a2c463ae39fed11e50bc1fd568ba102167c93d42))  - (goliatone)

## <!-- 16 -->➕ Add

- Better error info ([490684c](https://github.com/goliatone/go-admin/commit/490684cec573d29ad40573772d5c624cb7253afc))  - (goliatone)
- Acl to panel ([c02337d](https://github.com/goliatone/go-admin/commit/c02337d284eba1b8113320c81c90f508b1758507))  - (goliatone)
- Form generator confit ([907eaaa](https://github.com/goliatone/go-admin/commit/907eaaaa93cd7bbc595720d6e4e9a92e14395e19))  - (goliatone)
- Preferences setup ([b7cf9fc](https://github.com/goliatone/go-admin/commit/b7cf9fcb4b7e1edd6e06960852c3da891db2edb8))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.7.0 ([015c223](https://github.com/goliatone/go-admin/commit/015c2238d8754a3e2f2ca609b34d5797fe14ebf4))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update tests ([1d136e9](https://github.com/goliatone/go-admin/commit/1d136e992c5406d36a8ccbd574b188107dd3f82a))  - (goliatone)
- Update readme ([b3641ec](https://github.com/goliatone/go-admin/commit/b3641ec7d9492cf5ebb7422bcc731429f42042c4))  - (goliatone)
- Update deps ([6ec8f9e](https://github.com/goliatone/go-admin/commit/6ec8f9efa18a8fdbd99b28a3de8f0004d0b5db98))  - (goliatone)

# [0.7.0](https://github.com/goliatone/go-admin/compare/v0.6.0...v0.7.0) - (2026-01-09)

## <!-- 1 -->🐛 Bug Fixes

- Typeo ([ffaa2b6](https://github.com/goliatone/go-admin/commit/ffaa2b69a023839a5ea5749788b22db1d0bfc819))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.7.0 ([d67df54](https://github.com/goliatone/go-admin/commit/d67df544c34bda8d660e3077abd0d187066ddbd5))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.6.0 ([07007e7](https://github.com/goliatone/go-admin/commit/07007e7167616d5ed0154ed0a8043aadbc07cbc4))  - (goliatone)

# [0.6.0](https://github.com/goliatone/go-admin/compare/v0.5.0...v0.6.0) - (2026-01-09)

## <!-- 13 -->📦 Bumps

- Bump version: v0.6.0 ([9b8366c](https://github.com/goliatone/go-admin/commit/9b8366c71ed1cf19eb79afea9ad61becb966e627))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.5.0 ([13a6a18](https://github.com/goliatone/go-admin/commit/13a6a18c7f9c76f728861093876d1828ce8f6b6f))  - (goliatone)

# [0.5.0](https://github.com/goliatone/go-admin/compare/v0.4.0...v0.5.0) - (2026-01-09)

## <!-- 13 -->📦 Bumps

- Bump version: v0.5.0 ([1505ca2](https://github.com/goliatone/go-admin/commit/1505ca25559037c15c3f264bf86897ec3129566f))  - (goliatone)

## <!-- 16 -->➕ Add

- Form generator incorporate optional configuration ([b3799d2](https://github.com/goliatone/go-admin/commit/b3799d29762b16c602449063eae6446b4801040c))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.4.0 ([d367e49](https://github.com/goliatone/go-admin/commit/d367e49c081b963939eecb42de3aa04181d7c5e4))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Update docs ([b7586c1](https://github.com/goliatone/go-admin/commit/b7586c1c07c73f252faacd26a3be3b44d0ca31d1))  - (goliatone)
- Update tests ([407824e](https://github.com/goliatone/go-admin/commit/407824e0b3a7db6b867884c77bde4c974fb4b7ef))  - (goliatone)
- Update deps ([eb2ebe2](https://github.com/goliatone/go-admin/commit/eb2ebe25f43ddcf55ea49a767e6c45bae5aa826b))  - (goliatone)

# [0.4.0](https://github.com/goliatone/go-admin/compare/v0.3.0...v0.4.0) - (2026-01-08)

## <!-- 1 -->🐛 Bug Fixes

- Facade for area def ([59f6fb2](https://github.com/goliatone/go-admin/commit/59f6fb247bb88f0194a6d83b181c28d0996091c1))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.4.0 ([19ef68f](https://github.com/goliatone/go-admin/commit/19ef68fa8967ae42ab9323e2988f7d2671a2e854))  - (goliatone)

## <!-- 16 -->➕ Add

- Tab rendering ([ccd1f32](https://github.com/goliatone/go-admin/commit/ccd1f327bb68da7be393ce185a679ef6b354c37b))  - (goliatone)
- Include templates for content ([5e9e2c5](https://github.com/goliatone/go-admin/commit/5e9e2c5d8bc8dba7ce67f5bf9d7d7dace3fea01b))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.3.0 ([82884c3](https://github.com/goliatone/go-admin/commit/82884c3c9ea76760758b9c9c73306f85c6de6a53))  - (goliatone)

## <!-- 7 -->⚙️ Miscellaneous Tasks

- Udpate assets ([1436868](https://github.com/goliatone/go-admin/commit/1436868bfdae3fb6b8f684e42967e2a02798adca))  - (goliatone)
- Update examples ([f82e394](https://github.com/goliatone/go-admin/commit/f82e39480ba96af03ad982ec09fb901b80427e2f))  - (goliatone)
- Update tests ([ec11d1c](https://github.com/goliatone/go-admin/commit/ec11d1ceee86c342e859fa3c9c9772ad3bdd00fb))  - (goliatone)

# [0.3.0](https://github.com/goliatone/go-admin/compare/v0.2.0...v0.3.0) - (2026-01-08)

## <!-- 1 -->🐛 Bug Fixes

- Root dir to client ([874155d](https://github.com/goliatone/go-admin/commit/874155d7aa213ef20eab1c0d05a6c3076f9b66e0))  - (goliatone)

## <!-- 13 -->📦 Bumps

- Bump version: v0.3.0 ([db1e217](https://github.com/goliatone/go-admin/commit/db1e217c41d7a6151225994205eafd6c62b4f9ff))  - (goliatone)

## <!-- 2 -->🚜 Refactor

- Move templates to client ([f86a97c](https://github.com/goliatone/go-admin/commit/f86a97c9eb84a2a47fb2608171b2aa6ee433f769))  - (goliatone)
- Move assets from example to package ([5716566](https://github.com/goliatone/go-admin/commit/5716566dec232517e5005bc6ce6f090ec46e8809))  - (goliatone)

## <!-- 3 -->📚 Documentation

- Update changelog for v0.2.0 ([e6c0f9c](https://github.com/goliatone/go-admin/commit/e6c0f9c46266a38b79d2eb4d459f48778508bc86))  - (goliatone)

## <!-- 30 -->📝 Other

- PR [#1](https://github.com/goliatone/go-admin/pull/1): assets ([c4538d1](https://github.com/goliatone/go-admin/commit/c4538d10f118880325afaa1e352f3ea7706f90d8))  - (goliatone)

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


