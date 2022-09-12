import * as vscode from 'vscode';

export class SpecRunnerConfig {
  get rspecCommand(): string | undefined {
    const command = vscode.workspace.getConfiguration().get('spec-runner.rspecCommand') as string | undefined;
    return command?.trim() || 'bundle exec rspec';
  }

  get minitestCommand(): string | undefined {
    const command = vscode.workspace.getConfiguration().get('spec-runner.minitestCommand') as string | undefined;
    return command?.trim() || 'bundle exec rails t';
  }

  get changeDirectoryToWorkspaceRoot(): boolean {
    return this.getBooleanConfig('spec-runner.changeDirectoryToWorkspaceRoot', false);
  }

  get projectPath(): string {
    const path = vscode.workspace.getConfiguration().get('spec-runner.projectPath') as string | undefined;
    return path || this.currentWorkspaceFolderPath;
  }

  get rspecFormat(): string {
    const format = vscode.workspace.getConfiguration().get('spec-runner.rspecFormat') as string | undefined;

    switch (format) {
      case 'Documentation':
        return 'd';
      default:
        return 'p';
    };
  }

  get saveBeforeRunning(): boolean {
    return this.getBooleanConfig('spec-runner.saveBeforeRunning', false);
  }

  get runAllButton(): boolean {
    return this.getBooleanConfig('spec-runner.runAllButton', true);
  }

  get runAllFailedButton(): boolean {
    return this.getBooleanConfig('spec-runner.runAllFailedButton', false);
  }

  get runAllMinitestButton(): boolean {
    return this.getBooleanConfig('spec-runner.runAllMinitestButton', true);
  }

  get codeLensPrompts(): boolean {
    return this.getBooleanConfig('spec-runner.codeLensPrompts', true);
  }

  get minitestCodeLensPrompts(): boolean {
    return this.getBooleanConfig('spec-runner.minitestCodeLensPrompts', true);
  }

  get decorateEditorWithSpecResults(): boolean {
    return this.getBooleanConfig('spec-runner.decorateEditorWithSpecResults', true);
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
