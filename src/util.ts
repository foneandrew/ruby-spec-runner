import { RspecOutput, TestPathReplacementConfig } from './types';

export function isWindows(): boolean {
  return process.platform.includes('win32');
}

export function quote(s: string): string {
  const q = isWindows() ? '"' : "'";
  return [q, s, q].join('');
}

export function teeCommand(outputFile: string, append = false, bashInWindowsOverride = false): string {
  const command =  isWindows() && !bashInWindowsOverride
    ? ['Tee-Object', append ? '-Append' : null, `-FilePath ${quote(outputFile)}`].filter(Boolean)
    : ['tee', append ? '-a' : null, quote(outputFile)].filter(Boolean);
  return command.join(' ');
}

/**
 * Detect if the current shell is Fish
 */
export function isFishShell(): boolean {
  const shell = process.env.SHELL;
  return shell ? shell.endsWith('/fish') : false;
}

/**
 * Returns two commands, the cdCommand and the returnCommand.
 *
 * If the returnCommand is false, then that means we should use a subshell to handle
 * returning to the current directory.
 *
 * For shells that are incompatible with () style subshells we use pushd/popd as a fallback.
 * Subshells are generally preferred as they more resilient to a command failing inside the
 * subshell (with pushd/popd the command may exit before reaching popd).
 */
export function cdCommands(path: string, bashInWindowsOverride = false): [string, string | false] {
  if (isWindows() && !bashInWindowsOverride) {
    return [`pushd ${quote(path)} >nul`, 'popd >nul'];
  }

  if (isFishShell()) {
    // Use pushd/popd fallback for shells that do not support () style subshells.
    return [`pushd ${quote(path)} >/dev/null`, 'popd >/dev/null'];
  }

  return [`cd ${quote(path)}`, false];
}

export function cmdJoin(...args: Array<string>): string {
  return args
    .filter(Boolean)
    .join(isWindows() ? '; ' : ' && ');
}

export function isRspecOutput(output: any): output is RspecOutput {
  return !!output?.version && !!output?.examples && !!output?.summary?.duration;
}

export function stringifyEnvs(envs: {[key: string]: any}): string {
  return Object.keys(envs).map((key) => `${key}=${envs[key]}`).join(' ');
}

export function remapPath(filePath: string, rewriteTestPaths: TestPathReplacementConfig[]): string {
  let remappedPath = filePath;

  rewriteTestPaths.every(({ from, to, regex, exclusive }) => {
    let match = false;

    if (regex) {
      const regex = new RegExp(from, 'g');
      match = regex.test(remappedPath);
      remappedPath = remappedPath.replace(regex, to);
    } else {
      match = remappedPath.includes(from);
      remappedPath = remappedPath.replace(from, to);
    }

    return !exclusive || !match;
  });

  return remappedPath;
}
