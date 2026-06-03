import { App } from "obsidian";

/** Context handed to every built-in command handler. */
export interface CommandContext {
  app: App;
  /** Write a line of text back to the terminal (a trailing newline is added). */
  print: (text: string) => void;
}

/**
 * A built-in command handler. Return value (if any) is printed to the terminal.
 * Throwing is fine — the error message is printed in red by the caller.
 */
export type CommandHandler = (
  args: string[],
  ctx: CommandContext
) => void | string | Promise<void | string>;

export interface BuiltinCommand {
  name: string;
  description: string;
  handler: CommandHandler;
}

/**
 * Registry of built-in commands that "shadow" the shell. Adding a new command is a single
 * `registry.register({...})` call.
 */
export class CommandRegistry {
  private commands = new Map<string, BuiltinCommand>();

  register(cmd: BuiltinCommand): void {
    this.commands.set(cmd.name, cmd);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  get(name: string): BuiltinCommand | undefined {
    return this.commands.get(name);
  }

  list(): BuiltinCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Parse a raw input line into a command name + args. Returns null if the first token is
   * not a registered built-in (so the caller forwards the line to the shell instead).
   */
  match(line: string): { cmd: BuiltinCommand; args: string[] } | null {
    const tokens = tokenize(line.trim());
    if (tokens.length === 0) return null;
    const cmd = this.commands.get(tokens[0]);
    if (!cmd) return null;
    return { cmd, args: tokens.slice(1) };
  }
}

/** Minimal shell-ish tokenizer: splits on whitespace, respects single/double quotes. */
export function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return out;
}
