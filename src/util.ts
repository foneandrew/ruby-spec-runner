import { RspecOutput } from "./types";

export function isWindows(): boolean {
  return process.platform.includes('win32');
}

export function quote(s: string): string {
  const q = isWindows() ? '"' : `'`;
  return [q, s, q].join('');
}

// Windows will still execute second command even if first command fails.
export function cmdJoin(...args: string[]): string {
  return args.filter(Boolean).join(isWindows() ? '; ' : ' && ');
}

export function isRspecOutput(output: any): output is RspecOutput {
  return !!output?.version && !!output?.examples && !!output?.summary?.duration;
}
