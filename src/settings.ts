import { App, PluginSettingTab, Setting } from "obsidian";
import type DropTerminalPlugin from "./main";

export interface DropTerminalSettings {
  /** Panel height as a percentage of the window height. */
  heightPercent: number;
  /** Panel width as a percentage of the window width. */
  widthPercent: number;
  /** Slide animation duration in milliseconds. */
  animationMs: number;
  /** Terminal font family. */
  fontFamily: string;
  /** Terminal font size in px. */
  fontSize: number;
  /** Theme colors. */
  background: string;
  foreground: string;
  cursor: string;
  /** Override the shell executable. Empty = Windows PowerShell. */
  shellOverride: string;
  /** Starting working directory. Empty = vault root. */
  startDir: string;
  /** Hide the panel when Escape is pressed. */
  closeOnEsc: boolean;
}

export const DEFAULT_SETTINGS: DropTerminalSettings = {
  heightPercent: 35,
  widthPercent: 35,
  animationMs: 220,
  fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Courier New", monospace',
  fontSize: 13,
  background: "#1a1b26",
  foreground: "#c0caf5",
  cursor: "#c0caf5",
  shellOverride: "",
  startDir: "",
  closeOnEsc: true,
};

export class DropTerminalSettingTab extends PluginSettingTab {
  plugin: DropTerminalPlugin;

  constructor(app: App, plugin: DropTerminalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Drop Terminal" });
    containerEl.createEl("p", {
      text: "Bind a hotkey for “Drop Terminal: Toggle” in Settings → Hotkeys.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Panel height")
      .setDesc("Height of the drop-down as a percentage of the window.")
      .addSlider((s) =>
        s
          .setLimits(20, 90, 5)
          .setValue(this.plugin.settings.heightPercent)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.heightPercent = v;
            await this.plugin.saveSettings();
            this.plugin.applyAppearance();
          })
      );

    new Setting(containerEl)
      .setName("Panel width")
      .setDesc("Width of the drop-down as a percentage of the window.")
      .addSlider((s) =>
        s
          .setLimits(20, 90, 5)
          .setValue(this.plugin.settings.widthPercent)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.widthPercent = v;
            await this.plugin.saveSettings();
            this.plugin.applyAppearance();
          })
      );

    new Setting(containerEl)
      .setName("Animation duration")
      .setDesc("Slide animation length in milliseconds.")
      .addSlider((s) =>
        s
          .setLimits(0, 600, 10)
          .setValue(this.plugin.settings.animationMs)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.animationMs = v;
            await this.plugin.saveSettings();
            this.plugin.applyAppearance();
          })
      );

    new Setting(containerEl)
      .setName("Font family")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.fontFamily)
          .onChange(async (v) => {
            this.plugin.settings.fontFamily = v;
            await this.plugin.saveSettings();
            this.plugin.applyAppearance();
          })
      );

    new Setting(containerEl)
      .setName("Font size")
      .addSlider((s) =>
        s
          .setLimits(8, 28, 1)
          .setValue(this.plugin.settings.fontSize)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.fontSize = v;
            await this.plugin.saveSettings();
            this.plugin.applyAppearance();
          })
      );

    const colorRow = (
      name: string,
      key: "background" | "foreground" | "cursor"
    ) =>
      new Setting(containerEl).setName(name).addColorPicker((c) =>
        c.setValue(this.plugin.settings[key]).onChange(async (v) => {
          this.plugin.settings[key] = v;
          await this.plugin.saveSettings();
          this.plugin.applyAppearance();
        })
      );

    colorRow("Background color", "background");
    colorRow("Foreground color", "foreground");
    colorRow("Cursor color", "cursor");

    new Setting(containerEl)
      .setName("Shell override")
      .setDesc(
        "Path to the shell executable. Leave empty for Windows PowerShell. Examples: cmd.exe, pwsh.exe (PowerShell 7)."
      )
      .addText((t) =>
        t
          .setPlaceholder("auto")
          .setValue(this.plugin.settings.shellOverride)
          .onChange(async (v) => {
            this.plugin.settings.shellOverride = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Start directory")
      .setDesc("Working directory for new shells. Leave empty for the vault root.")
      .addText((t) =>
        t
          .setPlaceholder("vault root")
          .setValue(this.plugin.settings.startDir)
          .onChange(async (v) => {
            this.plugin.settings.startDir = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Close on Escape")
      .setDesc("Hide the terminal when Escape is pressed.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.closeOnEsc).onChange(async (v) => {
          this.plugin.settings.closeOnEsc = v;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("p", {
      text:
        "Note: shell override and start directory apply to the next shell session (toggle the plugin or restart Obsidian to recreate it).",
      cls: "setting-item-description",
    });
  }
}
