# Dependency network

## Plans

- [Desktop ingest](tauri-desktop-ingest.md): TD-03 requires interactive Windows and Linux hosts;
  `v0.0.1` artifacts are published. Apple Silicon is verified and Intel macOS is unsupported.
- [Linux release exports](linux-release-exports.md): LX-01 is complete; LX-02 requires an
  interactive Linux host for the published `.deb` and `.AppImage`. Its folder-import observation supplies the
  Linux evidence for TD-03.
- [Planning skill web distribution](planning-skill-web-distribution.md): PSD-01 publishes the
  latest raw tree, ZIP, and OpenCode HTTP catalog; PSD-02 packages that source as a Codex plugin.
  PSD-03 requires PSD-01 before it edits and externally validates the release workflow; LX-01 is complete.
- [Planning skill Waza workflow](planning-skill-waza-workflow.md): PWZ-01 establishes the runner;
  PWZ-02 and PWZ-03 can then build independent behavior suites. PWZ-04 requires both suites to pass
  offline checks. Model-backed runs require explicit authorization and provider access.
- [Scoop Extras](scoop-extra-publication.md): SC-01 needs a Windows host for the published MSI; SC-02 needs a
  working Scoop asset and Windows native-ingest smoke evidence from TD-03.
- [WinGet](winget-publication.md): WG-01 needs Windows native-ingest smoke
  evidence from TD-03; WG-02 needs the validated manifest.
- [Homebrew cask](homebrew-cask-publication.md): HB-01 needs Apple signing/notarization credentials
  and an Apple Silicon host; HB-02 needs the resulting public DMG.

PSD-03 and PWZ-01/PWZ-04 all update `CONTRIBUTING.md`; integrate those phase edits sequentially.
