import * as vscode from 'vscode';
import SpecRunnerConfig from '../SpecRunnerConfig';

export class SpecDebugButton {
  button: vscode.StatusBarItem;
  private config: SpecRunnerConfig;

  constructor(button: vscode.StatusBarItem, config: SpecRunnerConfig) {
    this.button = button;
    this.config = config;
  }

  update(editor = vscode.window.activeTextEditor) {
    if (!editor || !this.config.rspecDebugButton) {
      this.button.hide();
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'ruby' || !doc.fileName.match(/_spec\.rb$/)) {
      this.button.hide();
      return;
    }

    this.button.text = '$(testing-debug-icon) Debug spec';
    this.button.command = 'ruby-spec-runner.debugRspecFile';
    this.button.show();
  }
}

export default SpecDebugButton;
