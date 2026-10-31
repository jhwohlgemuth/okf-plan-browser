# Execution lanes

Each phase takes its plan's primary lock; do not run phases concurrently if their exact write
sets intersect, even when their named locks differ.

| Plan | Primary lock | Phases |
|---|---|---|
| [Desktop ingest](tauri-desktop-ingest.md) | desktop application packaging | TD-03 |
| [Linux release exports](linux-release-exports.md) | Linux installer validation | LX-02 |
| [Planning skill web distribution](planning-skill-web-distribution.md) | planning-skill web distribution; plugin identity; release workflow | PSD-01; PSD-02; PSD-03 |
| [Planning skill Waza workflow](planning-skill-waza-workflow.md) | Waza runner; portfolio suite; workflow suite; skill CI | PWZ-01; PWZ-02; PWZ-03; PWZ-04 |
| [Scoop Extras](scoop-extra-publication.md) | release workflow; Scoop bucket manifest | SC-01; SC-02 |
| [WinGet](winget-publication.md) | WinGet package identity; WinGet submission | WG-01; WG-02 |
| [Homebrew cask](homebrew-cask-publication.md) | macOS release signing; Homebrew cask definition | HB-01; HB-02 |

## Write collisions

- TD-03 requires external artifacts and platform access. Do not interpret that waiting as active execution time.
- PSD-03, SC-01, and HB-01 all edit `.github/workflows/release.yml`; serialize these phases.
- PSD-03 and PWZ-01/PWZ-04 edit `CONTRIBUTING.md`; serialize those documentation updates.
- TD-03, LX-02, and the Windows package-manager validations may share interactive smoke evidence,
  but each must verify its own distribution artifact and installation path.
- Bucket and catalog review waits are external prerequisites, not active phase time.
