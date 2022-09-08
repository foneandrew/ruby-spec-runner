import * as vscode from 'vscode';

export class SpecRunnerConfig {
  get rspecCommand(): string | undefined {
    const command = vscode.workspace.getConfiguration().get('spec-runner.rspecCommand') as string | undefined;
    return command?.trim() || 'bundle exec rspec';
  }

  get changeDirectoryToWorkspaceRoot(): boolean {
    const result = vscode.workspace.getConfiguration().get('spec-runner.changeDirectoryToWorkspaceRoot') as boolean | undefined;
    // eslint-disable-next-line eqeqeq
    if (result == null) { return false; }
    return result;
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
    const result = vscode.workspace.getConfiguration().get('spec-runner.saveBeforeRunning') as boolean | undefined;
    // eslint-disable-next-line eqeqeq
    if (result == null) { return false; }
    return result;
  }

  private get currentWorkspaceFolderPath(): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor?.document.uri || !vscode.workspace.getWorkspaceFolder(editor.document.uri)) {
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
