# Changelog

## [1.1.1](https://github.com/he3-org/concert/compare/v1.1.0...v1.1.1) (2026-03-29)


### Bug Fixes

* install commands to .claude/commands/concert/ not root level ([ec4e01d](https://github.com/he3-org/concert/commit/ec4e01d49d473da9caf847ab60f008915c88d7ce))

## [1.1.0](https://github.com/he3-org/concert/compare/v1.0.10...v1.1.0) (2026-03-29)


### Features

* build-time template sync, archive old mission, prep for dogfooding ([d5440e8](https://github.com/he3-org/concert/commit/d5440e8e67054801ead56fe0736c16c96696e300))

## [1.0.10](https://github.com/he3-org/concert/compare/v1.0.9...v1.0.10) (2026-03-28)


### Bug Fixes

* switch to NPM_TOKEN auth for publishing, drop OIDC ([d378c08](https://github.com/he3-org/concert/commit/d378c0826b9d842252ad3615c7e0e1157a3b7a0f))

## [1.0.9](https://github.com/he3-org/concert/compare/v1.0.8...v1.0.9) (2026-03-28)


### Bug Fixes

* add publishConfig to package.json for public access ([4a49abc](https://github.com/he3-org/concert/commit/4a49abc9aa759e0c6f1ea2a9f7a55edbfb650552))
* restore --access public flag on npm publish ([dd10b09](https://github.com/he3-org/concert/commit/dd10b09fe029e8979b72b6726e3bcdc1ae321078))
* use publishConfig for registry, unset NPM_CONFIG_USERCONFIG before publish ([d32e092](https://github.com/he3-org/concert/commit/d32e0921e68b7e1acbf4290cc824946b6f91caec))

## [1.0.8](https://github.com/he3-org/concert/compare/v1.0.7...v1.0.8) (2026-03-28)


### Bug Fixes

* restore registry-url for OIDC publish test ([ae97cbc](https://github.com/he3-org/concert/commit/ae97cbc98c485ecff9c50a99fa1e094290726b49))

## [1.0.7](https://github.com/he3-org/concert/compare/v1.0.6...v1.0.7) (2026-03-28)


### Bug Fixes

* remove environment from publish job for OIDC test ([9721548](https://github.com/he3-org/concert/commit/9721548d82076ca190c98ec0199d182d2e6331a6))

## [1.0.6](https://github.com/he3-org/concert/compare/v1.0.5...v1.0.6) (2026-03-28)


### Bug Fixes

* remove registry-url for OIDC publish test ([5bb0860](https://github.com/he3-org/concert/commit/5bb086060530e05b365c306c3ddf5f12ef75994b))

## [1.0.5](https://github.com/he3-org/concert/compare/v1.0.4...v1.0.5) (2026-03-28)


### Bug Fixes

* restore pure OIDC publish without token ([87be2cd](https://github.com/he3-org/concert/commit/87be2cd88b31db490d2eaa2708e99437c2e823db))
* use standard npm token + provenance publish approach ([3a0ab57](https://github.com/he3-org/concert/commit/3a0ab574d7317a7010ebdf15f954c31d4de01f5b))

## [1.0.4](https://github.com/he3-org/concert/compare/v1.0.3...v1.0.4) (2026-03-28)


### Bug Fixes

* restore registry-url for npm ci but remove .npmrc before OIDC publish ([97dcfb1](https://github.com/he3-org/concert/commit/97dcfb187f729478f49303907a0e43691508ca5d))

## [1.0.3](https://github.com/he3-org/concert/compare/v1.0.2...v1.0.3) (2026-03-28)


### Bug Fixes

* remove registry-url from setup-node to prevent OIDC token conflict ([0b56781](https://github.com/he3-org/concert/commit/0b56781fdde9bf1f65256a1a24f44896a8d60b91))

## [1.0.3](https://github.com/he3-org/concert/compare/v1.0.2...v1.0.3) (2026-03-28)


### Bug Fixes

* remove registry-url from setup-node to prevent OIDC token conflict ([0b56781](https://github.com/he3-org/concert/commit/0b56781fdde9bf1f65256a1a24f44896a8d60b91))

## [1.0.2](https://github.com/he3-org/concert/compare/v1.0.1...v1.0.2) (2026-03-28)


### Bug Fixes

* bump publish job to Node 22 for OIDC compatibility ([9dd47a2](https://github.com/he3-org/concert/commit/9dd47a2a457d377925b39ee04b410641524191ed))

## [1.0.1](https://github.com/he3-org/concert/compare/v1.0.0...v1.0.1) (2026-03-28)


### Bug Fixes

* clarify npm OIDC setup docs in README ([0dcad9b](https://github.com/he3-org/concert/commit/0dcad9b8f7aa32e3fa6ef034ad2751da37f2c001))
* fall back to NPM_TOKEN for publish instead of OIDC ([941366a](https://github.com/he3-org/concert/commit/941366a45706bf06161b1aacd1a7c38b69ce653d))
* remove --provenance from npm publish to fix OIDC conflict with token auth ([354c36e](https://github.com/he3-org/concert/commit/354c36edb262058a19992f626318af81f3467469))
* restore OIDC provenance publishing for npm ([2a8a426](https://github.com/he3-org/concert/commit/2a8a426c9cfb17c2bf69fb42020c01bbca6e0b9c))

## 1.0.0 (2026-03-28)


### Features

* Concert 2 v1 — full pipeline implementation ([0a050f4](https://github.com/he3-org/concert/commit/0a050f47fb0384fbd4bc2ce50a06502d3526980b))
* concert2 v1 — complete npm package rewrite ([#4](https://github.com/he3-org/concert/issues/4)) ([a597f10](https://github.com/he3-org/concert/commit/a597f10eb351b82acc3aeb5c68827d3122f93ad3))
* install concert ([e258c9d](https://github.com/he3-org/concert/commit/e258c9d9d84263f3e50ca77c8fc0cfcf8e64176c))
* install concert and add CLAUDE.md ([cb14848](https://github.com/he3-org/concert/commit/cb148483f949354a52bfe1345e1d155e95fa368c))


### Bug Fixes

* concert1 updates — agent.md naming, commands to concert/ subdir, workflow fixes ([2fc1f89](https://github.com/he3-org/concert/commit/2fc1f898ba2bb040cbf24bd0a1bf72ae7ec1c509))
* correct github skills path to .github/skills/ ([f8ff411](https://github.com/he3-org/concert/commit/f8ff411854b32f825c469efce0ccbd9432849fa3))
* decouple accept from stage advancement — require explicit /concert:continue ([46aab80](https://github.com/he3-org/concert/commit/46aab802f92861f0c10c08321a39974a37f67d1d))
* github agent stubs use *.agent.md naming and name+description frontmatter ([51960e7](https://github.com/he3-org/concert/commit/51960e7ae6f4167401fa282119211c59e5b011aa))
