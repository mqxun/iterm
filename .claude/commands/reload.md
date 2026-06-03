Checklist for reloading the Drop Terminal plugin in Obsidian after a change:

1. Build and copy artifacts into the vault: `npm run deploy`
   (or `npm run copy` if the build is already current).
2. In Obsidian: Settings → Community plugins → toggle **Drop Terminal** off, then on
   (or use the "Reload app without saving" command).
3. Trigger the drop-down hotkey and smoke-test: a plain command (`dir`, `echo hi`) and a
   built-in like `today` or `help`. (Basic mode: no interactive TUI apps like vim.)

Do NOT run any git commands.
