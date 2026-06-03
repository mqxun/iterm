import { FileSystemAdapter, normalizePath, Notice, TFile } from "obsidian";
import { CommandRegistry } from "./registry";

/**
 * Register the default built-in commands. These run inside Obsidian instead of the shell.
 * Add new ones here (or via `registry.register` from anywhere) — one call each.
 */
export function registerBuiltins(registry: CommandRegistry): void {
  registry.register({
    name: "help",
    description: "List built-in commands.",
    handler: (_args, ctx) => {
      const rows = registry
        .list()
        .map((c) => `  ${c.name.padEnd(10)} ${c.description}`)
        .join("\r\n");
      ctx.print("Built-in commands (these shadow the shell):\r\n" + rows);
    },
  });

  registry.register({
    name: "open",
    description: "Open a note: open <note name or path>",
    handler: async (args, ctx) => {
      const name = args.join(" ").trim();
      if (!name) return "usage: open <note name or path>";
      await ctx.app.workspace.openLinkText(name, "", false);
      ctx.print(`Opened: ${name}`);
    },
  });

  registry.register({
    name: "new",
    description: "Create and open a note: new <name>",
    handler: async (args, ctx) => {
      const name = args.join(" ").trim();
      if (!name) return "usage: new <name>";
      const path = normalizePath(name.endsWith(".md") ? name : `${name}.md`);
      let file = ctx.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        file = await ctx.app.vault.create(path, "");
      }
      await ctx.app.workspace.openLinkText(path, "", false);
      ctx.print(`Created: ${path}`);
    },
  });

  registry.register({
    name: "today",
    description: "Open or create today's daily note.",
    handler: (_args, ctx) => {
      // Defer to the core Daily Notes plugin so the user's location/format is respected.
      const ran = (ctx.app as any).commands?.executeCommandById?.(
        "daily-notes"
      );
      if (!ran) {
        new Notice("Drop Terminal: enable the core Daily Notes plugin.");
        ctx.print("Daily Notes core plugin is not enabled.");
      } else {
        ctx.print("Opened today's daily note.");
      }
    },
  });

  registry.register({
    name: "search",
    description: "Open global search: search <query>",
    handler: (args, ctx) => {
      const query = args.join(" ").trim();
      const gs = (ctx.app as any).internalPlugins?.getPluginById?.(
        "global-search"
      );
      const instance = gs?.instance;
      if (instance?.openGlobalSearch) {
        instance.openGlobalSearch(query);
        ctx.print(`Searching: ${query}`);
      } else {
        ctx.print("Global search plugin unavailable.");
      }
    },
  });

  registry.register({
    name: "vault",
    description: "Print the vault's filesystem path.",
    handler: (_args, ctx) => {
      const adapter = ctx.app.vault.adapter;
      if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
      }
      return "Vault path unavailable (non-filesystem adapter).";
    },
  });
}
