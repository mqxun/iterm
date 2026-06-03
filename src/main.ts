import { FileSystemAdapter, Plugin } from "obsidian";
import {
  DEFAULT_SETTINGS,
  DropTerminalSettings,
  DropTerminalSettingTab,
} from "./settings";
import { TerminalOverlay } from "./overlay";
import { TerminalController } from "./terminal";
import { CommandRegistry } from "./commands/registry";
import { registerBuiltins } from "./commands/builtins";
import { homeDir } from "./shell";

export default class DropTerminalPlugin extends Plugin {
  settings!: DropTerminalSettings;
  private overlay: TerminalOverlay | null = null;
  private controller: TerminalController | null = null;
  private registry = new CommandRegistry();

  async onload(): Promise<void> {
    await this.loadSettings();
    registerBuiltins(this.registry);

    this.addSettingTab(new DropTerminalSettingTab(this.app, this));

    this.addCommand({
      id: "toggle",
      name: "Toggle",
      callback: () => this.toggle(),
      // Sensible default; the user can rebind in Settings → Hotkeys.
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "`" }],
    });

    this.addRibbonIcon("terminal-square", "Toggle Drop Terminal", () =>
      this.toggle()
    );

    // Keep the terminal sized to the panel.
    this.registerDomEvent(window, "resize", () =>
      this.controller?.fitToContainer()
    );
  }

  onunload(): void {
    this.controller?.dispose();
    this.controller = null;
    this.overlay?.destroy();
    this.overlay = null;
  }

  private ensureCreated(): void {
    if (this.overlay && this.controller) return;

    this.overlay = new TerminalOverlay(this.settings, () => this.hide());
    this.controller = new TerminalController(
      this.app,
      this.settings,
      this.registry
    );
    this.controller.mount(this.overlay.mountPoint, this.resolveCwd());
  }

  private toggle(): void {
    this.ensureCreated();
    if (!this.overlay || !this.controller) return;
    if (this.overlay.isVisible()) {
      this.hide();
    } else {
      this.overlay.show();
      // Wait for the slide transition to settle before fitting + focusing.
      window.setTimeout(() => {
        this.controller?.fitToContainer();
        this.controller?.focus();
      }, this.settings.animationMs + 20);
    }
  }

  private hide(): void {
    this.overlay?.hide();
  }

  private resolveCwd(): string {
    if (this.settings.startDir) return this.settings.startDir;
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) return adapter.getBasePath();
    return homeDir();
  }

  /** Re-apply appearance settings live to the overlay + terminal. */
  applyAppearance(): void {
    this.overlay?.setSettings(this.settings);
    this.controller?.applySettings(this.settings);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
