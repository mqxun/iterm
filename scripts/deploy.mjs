import { existsSync, mkdirSync, copyFileSync, statSync } from "fs";
import { join } from "path";
import process from "process";

/**
 * Copy the built plugin artifacts into the Obsidian vault's plugin folder.
 *
 * Default target is the Windows vault as seen from WSL (/mnt/c/...). Override with the
 * OBSIDIAN_PLUGIN_DIR env var if your vault lives elsewhere.
 */
const DEFAULT_DEST =
  "/mnt/c/Users/munte/Documents/Obsidian/Vault/.obsidian/plugins/iterm";

const dest = process.env.OBSIDIAN_PLUGIN_DIR || DEFAULT_DEST;
const root = process.cwd();
const files = ["main.js", "manifest.json", "styles.css"];

// Fail loudly if the build hasn't run yet.
const missing = files.filter((f) => !existsSync(join(root, f)));
if (missing.length > 0) {
  console.error(
    `[deploy] Missing build artifact(s): ${missing.join(", ")}.\n` +
      `         Run "npm run build" first.`
  );
  process.exit(1);
}

if (!existsSync(dest)) {
  try {
    mkdirSync(dest, { recursive: true });
    console.log(`[deploy] Created plugin folder: ${dest}`);
  } catch (err) {
    console.error(
      `[deploy] Could not create destination "${dest}".\n` +
        `         Is the vault path correct / mounted? Set OBSIDIAN_PLUGIN_DIR to override.\n` +
        `         ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}

if (!statSync(dest).isDirectory()) {
  console.error(`[deploy] Destination is not a directory: ${dest}`);
  process.exit(1);
}

for (const f of files) {
  copyFileSync(join(root, f), join(dest, f));
  console.log(`[deploy] Copied ${f}`);
}

console.log(`[deploy] Done -> ${dest}`);
console.log(`[deploy] Reload the plugin in Obsidian (toggle it off/on) to pick up changes.`);
