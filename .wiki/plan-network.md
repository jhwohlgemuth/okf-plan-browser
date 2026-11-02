# Dependency network

## Plans

- [Desktop ingest](tauri-desktop-ingest.md): TD-03 requires an interactive Windows host. Linux
  `.deb` and AppImage validation is recorded in `docs/desktop-ingest.md`; `v0.0.2` artifacts are
  published, Apple Silicon is verified, and Intel macOS is unsupported.
- [Scoop Extras](scoop-extra-publication.md): SC-01 needs a Windows host for the published MSI; SC-02 needs a
  working Scoop asset and Windows native-ingest smoke evidence from TD-03.
- [WinGet](winget-publication.md): WG-01 needs Windows native-ingest smoke
  evidence from TD-03; WG-02 needs the validated manifest.
- [Homebrew cask](homebrew-cask-publication.md): HB-01 needs Apple signing/notarization credentials
  and an Apple Silicon host; HB-02 needs the resulting public DMG.
