import * as vscode from 'vscode';
import SpecRunnerConfig from './SpecRunnerConfig';

export class MinitestRunnerButton {
  button: vscode.StatusBarItem;
  private config: SpecRunnerConfig;

  constructor(button: vscode.StatusBarItem, config: SpecRunnerConfig) {
    this.button = button;
    this.config = config;
  }

  update(editor = vscode.window.activeTextEditor) {
    if (!editor || !this.config.minitestRunButton) {
      this.button.hide();
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'ruby' || !doc.fileName.match(/_test\.rb$/)) {
      this.button.hide();
      return;
    }

    this.button.text = '$(testing-run-icon) Run test';
    this.button.command = 'extension.runMinitest';
    this.button.show();
  }
}

export default MinitestRunnerButton;
