.DEFAULT_GOAL := help
.PHONY: help install dev lint typecheck test audit build ci visual visual-update visual-report tauri-dev tauri-build \
        planning-skill-check planning-skill-test planning-skill-dev planning-skill-test-real \
        pages-enable pages-deploy pages-url \
        bump-patch bump-minor bump-major bump release version check-version release-version release-prepare release-publish release-retry-draft release-run release-watch release-tag release-list release-view release-download release-delete \
        runs watch logs ci-status

REPO    := $(shell gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null)
BUMP    ?= patch
TAG     ?= v$(VERSION)
RUN     ?=
EXPECTED_TAG_SHA ?=

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

## Local development

install: ## Install npm dependencies
	npm ci

dev: ## Start the Vite dev server
	npm run dev

lint: ## Run ESLint
	npm run lint

typecheck: ## Run the TypeScript type check
	npm run typecheck

test: ## Run unit tests
	npm test

audit: ## Audit production dependencies (fails on critical)
	npm audit --omit=dev --audit-level=critical

build: ## Production web build into dist/
	npm run build

ci: audit lint typecheck test build ## Run everything CI runs, locally

WAZA ?= waza
PLANNING_SKILL := .agents/skills/planning
PLANNING_EVAL := evals/planning

planning-skill-check: ## Check planning skill and all Waza specs without model calls
	$(WAZA) check $(PLANNING_SKILL)
	$(WAZA) spec verify $(PLANNING_SKILL) $(PLANNING_EVAL)/eval.yaml --fail
	$(WAZA) preflight $(PLANNING_EVAL)/eval.yaml
	$(WAZA) preflight $(PLANNING_EVAL)/routing.yaml

planning-skill-test: planning-skill-check ## Run credential-free Waza harness check
	@set -eu; tmp=$$(mktemp -d /tmp/planning-waza.XXXXXX); \
	  TMPDIR=/tmp $(WAZA) run $(PLANNING_EVAL)/mock.yaml --output-dir "$$tmp"; \
	  echo "Mock harness results: $$tmp (wiring only)"

planning-skill-dev: ## Open Waza interactive development for planning skill
	$(WAZA) dev $(PLANNING_SKILL)/SKILL.md

planning-skill-test-real: ## Run opt-in model-backed planning evals
	$(WAZA) run $(PLANNING_EVAL)/routing.yaml --no-cache --output-dir results/planning
	$(WAZA) run $(PLANNING_EVAL)/eval.yaml --baseline --no-cache --output-dir results/planning

visual: ## Run visual regression tests (PW_CHANNEL=msedge to use Edge)
	npm run test:visual

visual-update: ## Regenerate visual baselines and refresh README screenshots
	npm run test:visual:update
	npm run screenshots

visual-report: ## Open the last Playwright HTML report
	npx playwright show-report

tauri-dev: ## Run the desktop app in dev mode
	npm run tauri:dev

tauri-build: ## Build desktop installers locally (src-tauri/target/release/bundle)
	npm run tauri:build

## GitHub Pages

pages-enable: ## Enable GitHub Pages with Actions as the source (one-time)
	gh api -X POST repos/$(REPO)/pages -f build_type=workflow || gh api -X PUT repos/$(REPO)/pages -f build_type=workflow

pages-deploy: ## Trigger the Pages deploy workflow on main and watch it
	gh workflow run deploy-pages.yml --ref main
	@sleep 5
	gh run watch $$(gh run list --workflow=deploy-pages.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status

pages-url: ## Print the published site URL
	@gh api repos/$(REPO)/pages -q .html_url

## Versioning and releases

version: ## Print the project version string
	@node -p 'require("./package.json").version'

check-version: ## Validate npm, Tauri, and Cargo version metadata
	@node scripts/sync-version.mjs --check
	@cargo metadata --locked --no-deps --format-version 1 --manifest-path src-tauri/Cargo.toml >/dev/null

bump: ## Run the Version Bump workflow on GitHub (BUMP=patch|minor|major)
	gh workflow run version-bump.yml --ref main -f bump=$(BUMP)
	@sleep 5
	gh run watch $$(gh run list --workflow=version-bump.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status

bump-patch: ; $(MAKE) bump BUMP=patch ## Bump patch version via GitHub
bump-minor: ; $(MAKE) bump BUMP=minor ## Bump minor version via GitHub
bump-major: ; $(MAKE) bump BUMP=major ## Bump major version via GitHub

release: ## Bump (BUMP=patch|minor|major), then watch the desktop release build
	$(MAKE) bump BUMP=$(BUMP)
	$(MAKE) release-watch

release-version: ## Set an exact release version and verify it (VERSION=X.Y.Z)
	@test -n "$(VERSION)" || (echo 'Set VERSION=X.Y.Z' >&2; exit 1)
	npm version "$(VERSION)" --no-git-tag-version --allow-same-version
	node scripts/sync-version.mjs
	@$(MAKE) check-version

release-prepare: release-version ## Prepare an exact release version (alias for release-version)

release-publish: ## Push a clean committed version and tag to start Release (VERSION=X.Y.Z)
	@$(MAKE) check-version
	@set -eu; \
	  test "$(VERSION)" = "$$(node -p 'require("./package.json").version')"; \
	  test -z "$$(git status --porcelain)" || { echo 'Commit all release changes before publishing' >&2; exit 1; }; \
	  git push origin HEAD; \
	  if ! git show-ref --verify --quiet "refs/tags/v$(VERSION)"; then git tag "v$(VERSION)"; fi; \
	  test "$$(git rev-parse "v$(VERSION)")" = "$$(git rev-parse HEAD)" || { echo 'Tag points to a different commit' >&2; exit 1; }; \
	  git push origin "v$(VERSION)"

release-retry-draft: ## Retry an unpublished tag at HEAD with a lease (VERSION=X.Y.Z EXPECTED_TAG_SHA=...)
	@$(MAKE) check-version
	@set -eu; \
	  test -n "$(EXPECTED_TAG_SHA)" || { echo 'Set EXPECTED_TAG_SHA to the remote tag commit' >&2; exit 1; }; \
	  test "$(VERSION)" = "$$(node -p 'require("./package.json").version')"; \
	  test -z "$$(git status --porcelain)" || { echo 'Commit all release changes before retrying' >&2; exit 1; }; \
	  git push origin HEAD; \
	  git tag -f "v$(VERSION)" HEAD; \
	  git push --force-with-lease="refs/tags/v$(VERSION):$(EXPECTED_TAG_SHA)" origin "refs/tags/v$(VERSION)"

release-run: ## Start the Release workflow for an existing tag (TAG=vX.Y.Z)
	gh workflow run release.yml --ref $(TAG)

release-watch: ## Watch the latest Release workflow run
	@sleep 5
	gh run watch $$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status

release-tag: ## Tag the current package.json version and push it (starts the Release workflow)
	git tag $(TAG)
	git push origin $(TAG)

release-list: ## List GitHub releases
	gh release list

release-view: ## Show a release and its artifacts (TAG=vX.Y.Z)
	gh release view $(TAG)

release-download: ## Download release artifacts into ./release-artifacts (TAG=vX.Y.Z)
	gh release download $(TAG) --dir release-artifacts --clobber

release-delete: ## Delete a release and its tag (TAG=vX.Y.Z)
	gh release delete $(TAG) --cleanup-tag --yes

## Workflow runs

runs: ## List recent workflow runs
	gh run list --limit 10

watch: ## Watch the latest workflow run
	gh run watch $$(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status

logs: ## Show failed logs for a run (RUN=<id>, defaults to latest)
	gh run view $(if $(RUN),$(RUN),$$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')) --log-failed

ci-status: ## Show status of the CI workflow
	gh run list --workflow=ci.yml --limit 5
