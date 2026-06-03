import { DropTerminalSettings } from "./settings";

/**
 * The Quake-style drop-down panel. A fixed-position element appended to document.body,
 * anchored to the bottom, that slides up/down via a CSS transform transition. A WorkspaceLeaf
 * can't do this cleanly, so we own a plain DOM element instead.
 */
export class TerminalOverlay {
  readonly el: HTMLDivElement;
  readonly body: HTMLDivElement;
  private visible = false;

  constructor(
    private settings: DropTerminalSettings,
    private onEscape: () => void
  ) {
    this.el = document.createElement("div");
    this.el.addClass("drop-terminal-overlay");

    this.body = document.createElement("div");
    this.body.addClass("drop-terminal-body");
    this.el.appendChild(this.body);

    document.body.appendChild(this.el);
    this.applyAppearance();

    // Escape handling (only while focus is inside the overlay).
    this.el.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && this.settings.closeOnEsc) {
        ev.preventDefault();
        this.onEscape();
      }
    });
  }

  /** The element the terminal should mount into. */
  get mountPoint(): HTMLDivElement {
    return this.body;
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    this.visible = true;
    // Force layout so the transition runs from the hidden state.
    void this.el.offsetHeight;
    this.el.addClass("is-visible");
  }

  hide(): void {
    this.visible = false;
    this.el.removeClass("is-visible");
  }

  applyAppearance(): void {
    this.el.style.setProperty(
      "--drop-terminal-height",
      `${this.settings.heightPercent}vh`
    );
    this.el.style.setProperty(
      "--drop-terminal-width",
      `${this.settings.widthPercent}vw`
    );
    this.el.style.setProperty(
      "--drop-terminal-anim",
      `${this.settings.animationMs}ms`
    );
    this.el.style.setProperty(
      "--drop-terminal-bg",
      this.settings.background
    );
  }

  setSettings(settings: DropTerminalSettings): void {
    this.settings = settings;
    this.applyAppearance();
  }

  destroy(): void {
    this.el.remove();
  }
}
