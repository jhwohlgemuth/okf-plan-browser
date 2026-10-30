# Dependency network

## Plans

- [Desktop ingest](tauri-desktop-ingest.md): TD-03 requires draft release artifacts and interactive
  Windows and Linux hosts; Apple Silicon is verified and Intel macOS is unsupported.
- [Linux release exports](linux-release-exports.md): LX-01 can begin now; LX-02 requires its draft
  `.deb` and `.AppImage` plus an interactive Linux host. Its folder-import observation supplies the
  Linux evidence for TD-03.
- [Scoop Extras](scoop-extra-publication.md): SC-01 needs a Windows build and host; SC-02 needs a
  working Scoop asset and Windows native-ingest smoke evidence from TD-03.
- [WinGet](winget-publication.md): WG-01 needs a published MSI and Windows native-ingest smoke
  evidence from TD-03; WG-02 needs the validated manifest.
- [Homebrew cask](homebrew-cask-publication.md): HB-01 needs Apple signing/notarization credentials
  and an Apple Silicon host; HB-02 needs the resulting public DMG.
