# Changelog

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
