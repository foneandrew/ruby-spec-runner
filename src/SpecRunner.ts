import * as vscode from 'vscode';
import { CodeLensCommandArg } from './SpecRunnerCodeLensProvider';
import SpecRunnerConfig from './SpecRunnerConfig';
import { cmdJoin, quote } from './util';

export class SpecRunner {
  private _term!: vscode.Terminal;
  private config: SpecRunnerConfig;

  constructor(config: SpecRunnerConfig) {
    this.config = config;
  }

  async runSpec(arg?: CodeLensCommandArg) {
    if (arg?.fileName) {
      this.runSpecForFile(arg.fileName, arg.line, arg.name);
    } else {
      this.runCurrentSpec();
    }
  }

  async runSpecForFile(fileName: string, line?: number, testName?: string) {
    try {
      const command = this.buildRspecCommand(fileName, line, testName);
      this.runTerminalCommand(command);
    } catch (error: any) {
      if (error?.name === 'NoWorkspaceError') {
        console.error('SpecRunner: Unable to run spec as no workspace is open.', error);
        vscode.window.showErrorMessage('SpecRunner: Unable to run spec. It appears that no workspace is open.');
      } else {
        throw error;
      }
    }
  }

  async runCurrentSpec() {
    const filePath = vscode.window.activeTextEditor?.document.fileName;
    if (!filePath) {
      console.error('SpecRunner: Unable to run spec as no editor is open.');
      vscode.window.showErrorMessage('SpecRunner: Unable to run spec. It appears that no editor is open.');
      return;
    }

    await this.runSpecForFile(filePath);
  }

  private buildRspecCommand(fileName: string, line?: number, testName?: string) {
    const cdCommand = this.buildChangeDirectoryToWorkspaceRootCommand();
    const file = line ? [fileName, ':', line].join('') : fileName;
    const format = `-f ${this.config.rspecFormat}`;
    const rspecCommand = `${this.config.rspecCommand} ${format} ${quote(file)}`;
    // return `${this.config.rspecCommand} -f d -f j --out results.json ${quote(file)}`;

    return cmdJoin(cdCommand, rspecCommand);
  }

  private buildChangeDirectoryToWorkspaceRootCommand() {
    return this.config.changeDirectoryToWorkspaceRoot ? `cd ${quote(this.config.projectPath)}` : '';
  }

  private async runTerminalCommand(command: string) {
    this.terminal.show();
    await vscode.commands.executeCommand('workbench.action.terminal.clear');
    this.terminal.sendText(command);
  }

  private get terminal() {
    return this._term ||= vscode.window.createTerminal('SpecRunner');
  }
};

export default SpecRunner;
