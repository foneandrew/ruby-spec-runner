import * as vscode from 'vscode';
import SpecRunnerConfig from '../SpecRunnerConfig';

export class FailedSpecRunnerButton {
  button: vscode.StatusBarItem;
  private config: SpecRunnerConfig;

  constructor(button: vscode.StatusBarItem, config: SpecRunnerConfig) {
    this.button = button;
    this.config = config;
  }

  update(editor = vscode.window.activeTextEditor) {
    if (!editor || !this.config.rspecRunAllFailedButton) {
      this.button.hide();
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'ruby' || !doc.fileName.match(/_spec\.rb$/)) {
      this.button.hide();
      return;
    }

    this.button.text = '$(testing-run-icon) Run failed examples';
    this.button.command = 'ruby-spec-runner.runFailedExamples';
    this.button.show();
  }
}

export default FailedSpecRunnerButton;
