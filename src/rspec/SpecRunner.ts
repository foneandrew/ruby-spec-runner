import * as vscode from 'vscode';
import SpecRunnerConfig, { TerminalClear } from '../SpecRunnerConfig';
import { cmdJoin, quote } from '../util';
import SpecResultPresenter from '../SpecResultPresenter';
import { RunRspecOrMinitestArg } from '../types';

export class SpecRunner {
  private _term!: vscode.Terminal;
  private config: SpecRunnerConfig;
  private outputFilePath: string;
  private presenter: SpecResultPresenter;

  constructor(config: SpecRunnerConfig, outputFilePath: string, presenter: SpecResultPresenter) {
    this.config = config;
    this.outputFilePath = outputFilePath;
    this.presenter = presenter;
  }

  async runSpec(arg?: RunRspecOrMinitestArg) {
    if (this.config.saveBeforeRunning) {
      await vscode.commands.executeCommand('workbench.action.files.save');
    }

    if (arg?.fileName) {
      this.runSpecForFile(arg.fileName, false, arg.line, arg.name);
    } else {
      this.runCurrentSpec();
    }
  }

  async runFailedExample() {
    if (this.config.saveBeforeRunning) {
      await vscode.commands.executeCommand('workbench.action.files.save');
    }

    this.runCurrentSpec(true);
  }

  async runAllExamples() {
    console.log("running all specs");
  }

  async runSpecForFile(fileName: string, failedOnly:boolean, line?: number, testName?: string) {
    try {
      const command = this.buildRspecCommand(fileName, failedOnly, line, testName);
      this.runTerminalCommand(command);
      this.presenter.setPending(fileName);
    } catch (error: any) {
      if (error?.name === 'NoWorkspaceError') {
        console.error('SpecRunner: Unable to run spec as no workspace is open.', error);
        vscode.window.showErrorMessage('SpecRunner: Unable to run spec. It appears that no workspace is open.');
      } else {
        throw error;
      }
    }
  }

  async runCurrentSpec(failedOnly=false) {
    const filePath = vscode.window.activeTextEditor?.document.fileName;
    if (!filePath) {
      console.error('SpecRunner: Unable to run spec as no editor is open.');
      vscode.window.showErrorMessage('SpecRunner: Unable to run spec. It appears that no editor is open.');
      return;
    }

    await this.runSpecForFile(filePath, failedOnly);
  }

  private buildRspecCommand(fileName: string, failedOnly: boolean, line?: number, testName?: string) {
    const file = line ? [fileName, ':', line].join('') : fileName;
    const failedOnlyModifier = failedOnly ? '--only-failures' : '';
    const format = `-f ${this.config.rspecFormat}`;
    const jsonOutput = this.config.rspecDecorateEditorWithResults ? `-f j --out ${quote(this.outputFilePath)}` : '';

    const cdCommand = this.buildChangeDirectoryToWorkspaceRootCommand();
    const rspecCommand = [this.config.rspecCommand, failedOnlyModifier, format, jsonOutput, quote(file)].join(' ');
    return cmdJoin(cdCommand, rspecCommand);
  }

  private buildChangeDirectoryToWorkspaceRootCommand() {
    return this.config.changeDirectoryToWorkspaceRoot ? `cd ${quote(this.config.projectPath)}` : '';
  }

  private async runTerminalCommand(command: string) {
    this.terminal.show();

    if (this.config.clearTerminalOnTestRun === TerminalClear.Clear) {
      await vscode.commands.executeCommand('workbench.action.terminal.clear');
    }

    this.terminal.sendText(command);
  }

  private get terminal() {
    if (!this._term || this._term.exitStatus) {
      this._term = vscode.window.createTerminal('SpecRunner');
    }

    return this._term;
  }
};

export default SpecRunner;
