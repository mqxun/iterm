# Drop Terminal — Obsidian plugin

A minimal, customizable **Quake/iTerm-style drop-down terminal** for Obsidian. It slides up
from the bottom of the Obsidian window on a hotkey with a smooth animation, runs shell
commands via a simple line-based runner, and supports **built-in commands** that integrate
with Obsidian (e.g. open a note, jump to today's daily note).

**Target: Windows 11 only — native PowerShell/cmd, NO WSL, NO Linux/macOS.** (Development may
happen on WSL/Linux, but the plugin only needs to run in Obsidian on Windows 11.)

**No native modules.** The terminal runs in "basic mode": each entered line is executed with
Node's `child_process` and the output is streamed back. This is intentional and is the only
mode — there is **no `node-pty`/PTY**, so there is nothing to compile or rebuild against
Electron. The trade-off: no full-screen/interactive TUI apps (no `vim`, `htop`, interactive
prompts). Plain commands, pipes, and the Obsidian built-ins work great.

---

## ⛔ Hard rules (read first)

- **NEVER run `git add`, `git commit`, or `git push`.** Do not stage, commit, amend, or push
  under any circumstances. All version control is the user's job. (Also enforced by deny
  rules in `.claude/settings.json`.)
- This is a **desktop-only** plugin (`"isDesktopOnly": true`). Never assume mobile APIs are
  available — it uses Node `child_process` and `os`.
- **Do not reintroduce `node-pty` or any native module.** Basic mode is the intended design.
- Keep the UI **minimal and theme-able**. Prefer settings + CSS variables over hard-coded
  styling.

---

## Architecture

```
manifest.json          Plugin metadata (id: drop-terminal, isDesktopOnly)
esbuild.config.mjs     Bundles src/main.ts -> main.js (obsidian/electron/builtins external)
styles.css             Overlay, slide animation, vendored xterm base CSS
src/
  main.ts              Entry: load settings, register toggle command + default hotkey
  overlay.ts           The drop-down panel: fixed div on document.body, slide animation
  terminal.ts          xterm.js + FitAddon; wires keystrokes <-> shell; built-in interception
  shell.ts             BasicShell: prompt, echo, run each line via child_process, stream output
  settings.ts          DropTerminalSettings + SettingTab
  commands/
    registry.ts        Map<name, handler> + parse/dispatch
    builtins.ts        open, today, new, search, vault, help
```

### How built-in commands "shadow" the shell
`terminal.ts` keeps a **shadow buffer** of the current input line by listening to
`term.onData`. Printable keys are forwarded to the shell (which echoes them) while we mirror
them locally. On **Enter**, the first token is checked against `commands/registry.ts`:
- match → send `Ctrl-U` to clear the shell's pending line, run the handler in Obsidian, print
  output to xterm; the newline is **not** forwarded.
- no match → forward the newline; `BasicShell` runs the line via `child_process`.

Keep this layer small and well-commented — it is the trickiest part of the plugin.

### Basic mode notes (`shell.ts`)
- Each command line is spawned independently with `child_process.spawn(line, { shell, cwd })`,
  so there is no persistent shell state between lines (e.g. `cd` does not carry over). The
  shell executable comes from `resolveShell` (PowerShell by default, overridable in settings).
- `BasicShell` owns its own prompt + line editing (echo, Backspace, Ctrl-U, Ctrl-C).

---

## Build & dev

```bash
npm install          # install deps (no native build — plain install just works)
npm run dev          # esbuild watch mode
npm run build        # one-off production build -> main.js
npm run deploy       # build, then copy main.js/manifest.json/styles.css into the vault
npm run copy         # copy artifacts only (no build)
```

### Deploying to the Obsidian vault
`npm run deploy` builds and copies `main.js`, `manifest.json`, `styles.css` into the vault's
plugin folder. The default target (set in `scripts/deploy.mjs`) is the Windows vault as seen
from WSL:
`/mnt/c/Users/munte/Documents/Obsidian/Vault/.obsidian/plugins/iterm`.
Override it without editing code via the `OBSIDIAN_PLUGIN_DIR` env var:
`OBSIDIAN_PLUGIN_DIR=/path/to/vault/.obsidian/plugins/iterm npm run deploy`.
After deploying, reload the plugin in Obsidian (toggle off/on) to pick up changes.

### Loading into a vault for testing
Run `npm run deploy`, then enable **Drop Terminal** in Obsidian → Settings → Community
plugins. The vault's plugin folder is named `iterm` while the manifest id is `drop-terminal`
— Obsidian keys off the manifest id, so the folder name doesn't matter.
