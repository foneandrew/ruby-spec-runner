import * as vscode from 'vscode';

export class SpecRunnerConfig {
  get rspecCommand(): string | undefined {
    const command = vscode.workspace.getConfiguration().get('ruby-spec-runner.rspecCommand') as string | undefined;
    return command?.trim() || 'bundle exec rspec';
  }

  get minitestCommand(): string | undefined {
    const command = vscode.workspace.getConfiguration().get('ruby-spec-runner.minitestCommand') as string | undefined;
    return command?.trim() || 'bundle exec rails t';
  }

  get changeDirectoryToWorkspaceRoot(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.changeDirectoryToWorkspaceRoot', false);
  }

  get projectPath(): string {
    const path = vscode.workspace.getConfiguration().get('ruby-spec-runner.projectPath') as string | undefined;
    return path || this.currentWorkspaceFolderPath;
  }

  get rspecFormat(): string {
    const format = vscode.workspace.getConfiguration().get('ruby-spec-runner.rspecFormat') as string | undefined;

    switch (format) {
      case 'Documentation':
        return 'd';
      default:
        return 'p';
    };
  }

  get usingBashInWindows(): boolean {
    const format = vscode.workspace.getConfiguration().get('ruby-spec-runner.windowsTerminalType') as string | undefined;

    switch (format) {
      case 'Bash':
        return true;
      default:
        return false;
    };
  }

  get saveBeforeRunning(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.saveBeforeRunning', false);
  }

  get rspecRunButton(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.rspecRunButton', true);
  }

  get rspecRunAllFailedButton(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.rspecRunAllFailedButton', false);
  }

  get minitestRunButton(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.minitestRunButton', true);
  }

  get rspecCodeLensPrompts(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.rspecCodeLensPrompts', true);
  }

  get minitestCodeLensPrompts(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.minitestCodeLensPrompts', true);
  }

  get rspecDecorateEditorWithResults(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.rspecDecorateEditorWithResults', true);
  }

  get minitestDecorateEditorWithResults(): boolean {
    return this.getBooleanConfig('ruby-spec-runner.minitestDecorateEditorWithResults', true);
  }

  private getBooleanConfig(key: string, defaultValue: boolean) {
    const result = vscode.workspace.getConfiguration().get(key) as boolean | undefined;
    // eslint-disable-next-line eqeqeq
    if (result == null) { return defaultValue; }
    return result;
  }

  private get currentWorkspaceFolderPath(): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor?.document.uri || !vscode.workspace.getWorkspaceFolder(editor.document.uri)) {
      // Fallback to using the only workspace folder if there is no active editor
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length === 0) {
        return workspaceFolders[0].uri.fsPath;
      }

      throw new NoWorkspaceError();
    }

    return vscode.workspace.getWorkspaceFolder(editor.document.uri)!.uri.fsPath;
  }
}

export class NoWorkspaceError extends Error {
  constructor() {
    super('Unable to determine workspace folder. It appears that no workspace folder is open.');
    this.name = 'NoWorkspaceError';
  }
}

export default SpecRunnerConfig;
