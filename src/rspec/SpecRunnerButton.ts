import * as vscode from 'vscode';
import SpecRunnerConfig from '../SpecRunnerConfig';

export class SpecRunnerButton {
  button: vscode.StatusBarItem;
  private config: SpecRunnerConfig;

  constructor(button: vscode.StatusBarItem, config: SpecRunnerConfig) {
    this.button = button;
    this.config = config;
  }

  update(editor = vscode.window.activeTextEditor) {
    if (!editor || !this.config.rspecRunButton) {
      this.button.hide();
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'ruby' || !doc.fileName.match(/_spec\.rb$/)) {
      this.button.hide();
      return;
    }

    this.button.text = '$(testing-run-icon) Run spec';
    this.button.command = 'ruby-spec-runner.runRspecOrMinitestFile';
    this.button.show();
  }
}

export default SpecRunnerButton;
