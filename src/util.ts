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
 * For Fish shell, we use pushd/popd instead of parentheses grouping
 */
export function cdCommands(path: string, bashInWindowsOverride = false): [string, string | false] {
  if (isWindows() && !bashInWindowsOverride) {
    return [`pushd ${quote(path)} >nul`, 'popd >nul'];
  }

  // Check if we're using Fish shell
  if (isFishShell()) {
    // Fish shell doesn't support the parentheses grouping syntax
    // Use pushd/popd instead which works in Fish
    return [`pushd ${quote(path)}`, 'popd'];
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
