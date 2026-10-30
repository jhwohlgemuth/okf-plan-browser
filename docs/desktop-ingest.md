# Desktop folder ingest

Verified 2026-10-30 from `bd33614` plus the uncommitted TD-02 implementation.

## TD-01 baseline

The packaged shell previously had no native folder-ingest command. `FolderPicker` chose between
`window.showDirectoryPicker` and an `<input webkitdirectory>` fallback before calling
`useFileSystem.openFolder`.

| Packaged target | `showDirectoryPicker` | `webkitdirectory` fallback | User-visible result before TD-02 |
|---|---|---|---|
| macOS, Apple Silicon | Absent in the packaged WKWebView | The system folder chooser opens, but selecting a project folder omits its hidden `.wiki` directory | Verified failure: the app eventually reports that no plans were found |
| Windows | Not run | Not run | Awaiting a Windows release artifact and host |
| Linux | Not run | Not run | Awaiting a Linux release artifact and host |

The Apple Silicon failure is sufficient to require the native path under the plan's decision rule.
It also explains why selecting `.wiki` itself could appear to work while the advertised project-folder
selection failed: the browser file input does not return the hidden child directory.

## TD-02 implementation

The desktop shell now always takes one native route behind the existing `useFileSystem` contract:

1. Tauri's built-in `dialog.open` selects one directory with recursive scope.
2. `read_wiki_folder` verifies that the selected path is in the picker-granted filesystem scope.
3. The Rust reader selects a nested `.wiki` directory when present, walks at most six levels,
   skips `.git` and `node_modules`, and returns Markdown plus the paths of supported image/PDF assets.
4. Existing `parseWikiTexts`, project naming, commit, and progress behavior parse the returned files.
5. `read_wiki_asset` loads an asset only when it is viewed, after scope, containment, extension,
   and regular-file checks.

Browser builds retain the File System Access API and `webkitdirectory` paths. No frontend file
branches on the operating system; the only runtime distinction is whether Tauri's `__TAURI__`
bridge is present.

Resolved components:

- Rust crate: Tauri 1.8.3, selected by the existing `version = "1.6"` constraint.
- JavaScript API/CLI: `@tauri-apps/api` 1.6.0 and `@tauri-apps/cli` 1.6.3.
- Built-in capability: `dialog-open`; no external Tauri plugin or framework migration.
- Registered application commands: `read_wiki_folder` and `read_wiki_asset` alongside the existing
  credential and forge commands.

Focused validation:

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test -- src/lib/wikiIngest.test.ts` — 12 passed.
- `npm test -- src/lib/wikiAssets.test.ts` — 1 passed.
- `npm test` — 116 passed across 14 files.
- `npx playwright test e2e/integrity.spec.ts` — 26 passed, 16 expected viewport skips.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml` — 6 passed.
- `npm run tauri:build` — passed; produced the Apple Silicon `.app` and DMG.

## TD-03 packaged interaction

| Target | Artifact | Launch | Native folder import | Status |
|---|---|---|---|---|
| macOS, Apple Silicon | `OKF Plan Browser_1.0.0_aarch64.dmg` | Launched from the mounted DMG | Native `Open .wiki Folder` dialog loaded this repository as 3 plans and 1 Epic with 0 warnings | Verified |
| Windows | Published `v0.0.1` `okf-plan-browser_0.0.1_windows-x64.msi` | Not run | Not run | Blocked on interactive Windows host |
| Linux | Published `v0.0.1` `okf-plan-browser_0.0.1_linux-x64.deb` and `.AppImage` | Not run | Not run | Blocked on interactive Linux host |

Intel macOS is not supported and is omitted from the validation matrix. The release workflow still
contains a legacy `x86_64-apple-darwin` job, but that job does not make Intel a supported TD-03 target.
The Windows, AppImage, and Debian packages are available from the [v0.0.1 release](https://github.com/jhwohlgemuth/okf-plan-browser/releases/tag/v0.0.1). A passing build job is not a substitute for launching each artifact and exercising its folder dialog.
