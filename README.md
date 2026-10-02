# Uriel

> Ephemeral encrypted scratchpad for Windows.

Uriel is a compact tray-first notebook for temporary secrets, logs, commands, and code fragments. It keeps the workflow close at hand, encrypts sensitive content locally, and lets notes disappear on a short lifetime.

## Features

- Windows tray flyout with a global `Alt + Space` shortcut.
- Fixed-size, always-on-top capable borderless window.
- Local AES-256-GCM encryption with Argon2id key derivation in Rust.
- Ephemeral lifetimes: 10 minutes, 1 hour, 24 hours, or burn on copy.
- Clipboard cleanup after 30 seconds.
- RU/EN interface switcher.
- Scrollable note list with a focused editor surface.
- Tray context menu for opening and closing Uriel.
- NSIS installer for Windows x64.

## Screenshots

The application uses an obsidian black and silver monochrome interface designed for quick keyboard-first capture from the Windows tray.

## Download

Open the [Releases](../../releases) page and download the latest `Uriel_*_x64-setup.exe` installer.

## Development

### Requirements

- Windows 10 or Windows 11
- Node.js 20+
- Rust stable with the MSVC toolchain
- WebView2 Runtime

### Run locally

```powershell
npm install
npm run tauri dev
```

The Vite preview is also available with:

```powershell
npm run dev
```

### Build

```powershell
npm run build
npm run tauri build
```

The executable is written to `src-tauri/target/release/uriel.exe`. The NSIS installer is written to `src-tauri/target/release/bundle/nsis/`.

## Architecture

```text
src/                 React UI and interaction state
src-tauri/src/       Rust commands, crypto, clipboard, tray, and hotkey
src-tauri/capabilities/  Tauri v2 permissions
src-tauri/tauri.conf.json  Windows window and installer configuration
```

The frontend never needs to access encrypted files directly. Native operations are exposed through narrowly scoped Tauri commands.

## Security notes

Uriel is designed for local, short-lived scratch data. AES-GCM provides authenticated encryption and Argon2id derives encryption keys from a password. Clipboard contents are cleared after 30 seconds when possible.

No application can guarantee physical deletion from SSD wear-leveling, filesystem snapshots, backups, or clipboard managers. Treat the ephemeral timer as a cleanup control, not as a forensic deletion guarantee.

## License

MIT. See [LICENSE](LICENSE).
