import * as os from "os";
import { DropTerminalSettings } from "./settings";

/** A running shell session that the terminal reads from / writes to. */
export interface ShellSession {
  /** Raw bytes/keystrokes from the terminal. */
  write(data: string): void;
  /** Resize hint (no-op in basic mode, kept for a uniform interface). */
  resize(cols: number, rows: number): void;
  /** Subscribe to output. Returns a disposer. */
  onData(cb: (data: string) => void): () => void;
  /** Subscribe to exit. */
  onExit(cb: (code: number) => void): () => void;
  /** Tear down the session. */
  kill(): void;
}

/**
 * Pick the shell executable used to run each command. Windows-only plugin: defaults to native
 * PowerShell; honor an explicit override (e.g. cmd.exe, pwsh.exe).
 */
export function resolveShell(settings: DropTerminalSettings): string {
  if (settings.shellOverride) return settings.shellOverride;
  return (
    process.env.POWERSHELL_PATH ||
    `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
  );
}

/** Create the shell session. */
export function createSession(
  settings: DropTerminalSettings,
  cwd: string
): ShellSession {
  return new BasicShell(resolveShell(settings), cwd);
}

/**
 * A small line-buffered shell. It shows a prompt, echoes input, runs each completed line via
 * child_process, and streams output back. No TUI / interactive prompts (no vim/htop) — just a
 * clean, dependency-free command runner.
 */
class BasicShell implements ShellSession {
  private dataCbs: Array<(d: string) => void> = [];
  private exitCbs: Array<(c: number) => void> = [];
  private line = "";
  private running = false;

  constructor(private shellFile: string, private cwd: string) {
    queueMicrotask(() => {
      this.emit(
        "\x1b[2mDrop Terminal — type a command, or 'help' for built-ins.\x1b[0m\r\n"
      );
      this.prompt();
    });
  }

  private emit(d: string) {
    for (const cb of this.dataCbs) cb(d);
  }

  private prompt() {
    this.emit(`\x1b[36m${this.cwd}\x1b[0m$ `);
  }

  write(data: string): void {
    if (this.running) return; // ignore input while a command runs
    for (const ch of data) {
      if (ch === "\r" || ch === "\n") {
        this.emit("\r\n");
        this.run(this.line);
        this.line = "";
      } else if (ch === "\x7f" || ch === "\b") {
        if (this.line.length > 0) {
          this.line = this.line.slice(0, -1);
          this.emit("\b \b");
        }
      } else if (ch === "\x15") {
        // Ctrl-U: clear current line (used when a built-in shadows the shell).
        this.emit("\r\x1b[2K");
        this.line = "";
        this.prompt();
      } else if (ch === "\x03") {
        // Ctrl-C: abandon the line.
        this.emit("^C\r\n");
        this.line = "";
        this.prompt();
      } else if (ch >= " ") {
        this.line += ch;
        this.emit(ch);
      }
    }
  }

  private run(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) {
      this.prompt();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cp = require("child_process");
    this.running = true;
    const child = cp.spawn(trimmed, {
      cwd: this.cwd,
      shell: this.shellFile || true,
      env: process.env,
    });
    child.stdout?.on("data", (b: Buffer) =>
      this.emit(b.toString().replace(/\r?\n/g, "\r\n"))
    );
    child.stderr?.on("data", (b: Buffer) =>
      this.emit(b.toString().replace(/\r?\n/g, "\r\n"))
    );
    child.on("close", () => {
      this.running = false;
      this.prompt();
    });
    child.on("error", (e: Error) => {
      this.running = false;
      this.emit(`\x1b[31m${e.message}\x1b[0m\r\n`);
      this.prompt();
    });
  }

  resize(): void {
    /* no concept of size in basic mode */
  }

  onData(cb: (data: string) => void): () => void {
    this.dataCbs.push(cb);
    return () => {
      this.dataCbs = this.dataCbs.filter((c) => c !== cb);
    };
  }

  onExit(cb: (code: number) => void): () => void {
    this.exitCbs.push(cb);
    return () => {
      this.exitCbs = this.exitCbs.filter((c) => c !== cb);
    };
  }

  kill(): void {
    this.dataCbs = [];
    this.exitCbs = [];
  }
}

/** The OS home directory, used as a last-resort cwd. */
export function homeDir(): string {
  return os.homedir();
}
