import * as vscode from 'vscode';

export class SpecRunnerButton {
  button: vscode.StatusBarItem;

  constructor(button: vscode.StatusBarItem) {
    this.button = button;
  }

  update(editor = vscode.window.activeTextEditor) {
    if (!editor) {
      this.button.hide();
      return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'ruby' || !doc.fileName.match(/_spec\.rb$/)) {
      this.button.hide();
      return;
    }

    this.button.text = '$(testing-run-icon) Run spec';
    this.button.command = 'extension.runSpec';
    this.button.show();
  }
}

export default SpecRunnerButton;
