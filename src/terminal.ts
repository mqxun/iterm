import { App } from "obsidian";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { DropTerminalSettings } from "./settings";
import { createSession, ShellSession } from "./shell";
import { CommandRegistry } from "./commands/registry";

const CTRL_U = "\x15"; // kill-line: clears the shell's pending input line
const ENTER = "\r";

/**
 * Owns the xterm.js instance and its shell session, and implements the "built-in names shadow
 * the shell" behavior via a shadow line buffer (see CLAUDE.md).
 */
export class TerminalController {
  readonly term: Terminal;
  private fit: FitAddon;
  private session: ShellSession | null = null;
  private disposers: Array<() => void> = [];

  /** Shadow copy of the line the user is currently typing. */
  private lineBuf = "";

  constructor(
    private app: App,
    private settings: DropTerminalSettings,
    private registry: CommandRegistry
  ) {
    this.term = new Terminal({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      cursorBlink: true,
      allowProposedApi: true,
      theme: this.themeFromSettings(),
    });
    this.fit = new FitAddon();
    this.term.loadAddon(this.fit);
  }

  /** Mount into a container and start the shell session. */
  mount(container: HTMLElement, cwd: string): void {
    this.term.open(container);
    this.fit.fit();

    this.session = createSession(this.settings, cwd);

    // Shell output -> terminal.
    this.disposers.push(
      this.session.onData((d) => this.term.write(d))
    );
    this.disposers.push(
      this.session.onExit(() =>
        this.term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n")
      )
    );

    // Terminal input -> our interception layer -> shell.
    const inputSub = this.term.onData((d) => this.handleInput(d));
    this.disposers.push(() => inputSub.dispose());
  }

  /**
   * Process raw keystrokes. Printable keys are forwarded to the shell immediately (so it
   * echoes and line-edits) while we keep a shadow buffer. On Enter we decide whether the line
   * is a built-in (handle in Obsidian) or a shell command (forward the newline).
   */
  private handleInput(data: string): void {
    if (!this.session) return;
    for (const ch of data) {
      if (ch === ENTER || ch === "\n") {
        this.submitLine();
      } else if (ch === "\x7f" || ch === "\b") {
        if (this.lineBuf.length > 0) this.lineBuf = this.lineBuf.slice(0, -1);
        this.session.write(ch);
      } else if (ch === "\x03" || ch === CTRL_U) {
        // Ctrl-C / Ctrl-U abandon the current line.
        this.lineBuf = "";
        this.session.write(ch);
      } else if (ch >= " ") {
        this.lineBuf += ch;
        this.session.write(ch);
      } else {
        // Other control sequences (arrows, tab, etc.): forward untouched.
        this.session.write(ch);
      }
    }
  }

  private submitLine(): void {
    if (!this.session) return;
    const match = this.registry.match(this.lineBuf);
    if (!match) {
      // Not a built-in: let the shell run it.
      this.lineBuf = "";
      this.session.write(ENTER);
      return;
    }

    // Built-in shadows the shell. Clear the echoed line from the shell's input buffer,
    // run the handler, then nudge a fresh prompt.
    const session = this.session;
    session.write(CTRL_U);
    this.term.write("\r\n");
    this.lineBuf = "";

    const ctx = {
      app: this.app,
      print: (text: string) => this.term.write(text + "\r\n"),
    };

    Promise.resolve()
      .then(() => match.cmd.handler(match.args, ctx))
      .then((ret) => {
        if (typeof ret === "string" && ret.length > 0) ctx.print(ret);
      })
      .catch((err) => {
        this.term.write(
          `\x1b[31m${err?.message ?? String(err)}\x1b[0m\r\n`
        );
      })
      .finally(() => {
        // Empty line to the shell -> fresh prompt under the built-in output.
        session.write(ENTER);
      });
  }

  fitToContainer(): void {
    try {
      this.fit.fit();
      if (this.session) this.session.resize(this.term.cols, this.term.rows);
    } catch {
      /* container not laid out yet */
    }
  }

  focus(): void {
    this.term.focus();
  }

  applySettings(settings: DropTerminalSettings): void {
    this.settings = settings;
    this.term.options.fontFamily = settings.fontFamily;
    this.term.options.fontSize = settings.fontSize;
    this.term.options.theme = this.themeFromSettings();
    this.fitToContainer();
  }

  private themeFromSettings() {
    return {
      background: this.settings.background,
      foreground: this.settings.foreground,
      cursor: this.settings.cursor,
    };
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.session?.kill();
    this.session = null;
    this.term.dispose();
  }
}
