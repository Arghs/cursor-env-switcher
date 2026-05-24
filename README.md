# Cursor Env Switcher

Cursor Env Switcher is a VS Code-compatible extension for Cursor. It adds a status bar button that toggles the active workspace `.env` file between development and production.

## Behavior

- `Env: dev` means `.env` is the active development file and a production backup is available.
- `Env: prod` means `.env` is the active production file and a development backup is available.
- Production backups can be named `.env.prod` or `.env.production`.
- Development backups can be named `.env.dev` or `.env.development`.
- If the workspace starts with `.env` and `.env.prod`, the first toggle stores `.env` as `.env.dev` and activates `.env.prod`.
- If the workspace starts with `.env` and `.env.production`, the first toggle stores `.env` as `.env.development` and activates `.env.production`.

The extension works on the first workspace folder open in Cursor.

## Development

```powershell
npm install
npm test
npm run compile
npm run package
```

Press `F5` from VS Code or Cursor to launch an extension development host.

`npm run package` builds `cursor-env-switcher-0.1.0.vsix` in the project root for installation through Cursor's `Install from VSIX...` command.

## GitHub Releases

Pushes and merges to `main` or `dev` run `.github/workflows/release.yml`. The workflow installs dependencies, runs `npm test`, builds the VSIX with `npm run package`, uploads the VSIX as a workflow artifact, and attaches it to a GitHub release. Releases from `dev` are marked as prereleases.
