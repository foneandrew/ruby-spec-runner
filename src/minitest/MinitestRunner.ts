import * as vscode from 'vscode';
import SpecRunnerConfig, { TerminalClear } from '../SpecRunnerConfig';
import { cdCommands, cmdJoin, quote, remapPath, stringifyEnvs, teeCommand } from '../util';
import SpecResultPresenter from '../SpecResultPresenter';
import { RubyDebugger, RunRspecOrMinitestArg } from '../types';

export class MinitestRunner {
  private _term!: vscode.Terminal;
  private config: SpecRunnerConfig;
  private outputFilePath: string;
  private presenter: SpecResultPresenter;

  constructor(config: SpecRunnerConfig, outputFilePath: string, presenter: SpecResultPresenter) {
    this.config = config;
    this.outputFilePath = outputFilePath;
    this.presenter = presenter;
  }

  async runTest(arg?: RunRspecOrMinitestArg) {
    if (this.config.saveBeforeRunning) {
      await vscode.commands.executeCommand('workbench.action.files.save');
    }

    if (arg?.fileName) {
      this.runTestForFile(arg.fileName, arg.line, arg.name, arg.debugging, arg.forLines);
    } else {
      this.runCurrentTest(arg?.debugging);
    }
  }

  async runTestForFile(fileName: string, line?: number, testName?: string, debugging?: boolean, forLines?: number[]) {
    try {
      if (debugging) {
        const debugConfig = this.buildMinitestDebugConfig(this.remappedPath(fileName), this.config.rubyDebugger, line, testName, forLines);
        if (debugConfig) {
          vscode.debug.startDebugging(undefined, debugConfig);
        }
      } else {
        const command = this.buildMinitestCommand(this.remappedPath(fileName), line, testName, forLines);
        this.runTerminalCommand(command);
      }
      this.presenter.setPending(fileName);
    } catch (error: any) {
      if (error?.name === 'NoWorkspaceError') {
        console.error('SpecRunner: Unable to run test as no workspace is open.', error);
        vscode.window.showErrorMessage('SpecRunner: Unable to run test. It appears that no workspace is open.');
      } else {
        throw error;
      }
    }
  }

  async runCurrentTest(debugging?: boolean) {
    const filePath = vscode.window.activeTextEditor?.document.fileName;
    if (!filePath) {
      console.error('SpecRunner: Unable to run test as no editor is open.');
      vscode.window.showErrorMessage('SpecRunner: Unable to run test. It appears that no editor is open.');
      return;
    }

    await this.runTestForFile(filePath, undefined, undefined, debugging);
  }

  private buildMinitestDebugConfig(fileName: string, rubyDebugger: RubyDebugger, line?: number, testName?: string, forLines?: number[]) {
    let testFile = fileName;
    let testNameFilter;

    if (testName && forLines?.length) {
      // For a context
      testNameFilter = `-n ${this.testNameFilterRegex(testName)}`;
    // eslint-disable-next-line eqeqeq
    } else if (line != null) {
      // For a single test line
      testFile = [fileName, ':', line].join('');
    }
    const minitestArgs = [quote(testFile), testNameFilter].filter(Boolean).join(' -- ');


    switch (rubyDebugger) {
      case (RubyDebugger.Rdbg): {
        return {
          type: 'rdbg',
          name: 'MinitestRdbgDebugger',
          request: 'launch',
          command: this.config.minitestCommand,
          script: minitestArgs,
          env: this.config.minitestEnv,
          askParameters: false,
          useTerminal: true,
          cwd: this.config.changeDirectoryToWorkspaceRoot ? this.config.projectPath : undefined
        };
      }
      case (RubyDebugger.RubyLSP): {
        return {
          type: 'ruby_lsp',
          name: 'MinitestRubyLSPDebugger',
          request: 'launch',
          program: [this.config.minitestCommand, minitestArgs].filter(Boolean).join(' '),
          env: this.config.minitestEnv,
          cwd: this.config.changeDirectoryToWorkspaceRoot ? this.config.projectPath : undefined
        };
      }
      default: {
        console.error('SpecRunner: Unable to generate debug config. Unknown configured debugger option: ', rubyDebugger);
        vscode.window.showErrorMessage(`SpecRunner: Unable to debug spec. Unknown configured debugger option: ${rubyDebugger}`);
      }
    }
  }

  private buildMinitestCommand(fileName: string, line?: number, testName?: string, forLines?: number[]) {
    let lines = [line].filter(Boolean);
    let testFile = fileName;
    let testNameFilter;

    if (testName && forLines?.length) {
      // For a context
      lines = forLines;
      testNameFilter = `-n ${this.testNameFilterRegex(testName)}`;
    } else if (lines.length === 1) {
      // For a single test line
      testFile = [fileName, ':', line].join('');
    }
    const minitestArgs = [quote(testFile), testNameFilter].filter(Boolean).join(' -- ');

    const [cdCommand, returnCommand] = this.buildChangeDirectoryToWorkspaceRootCommand();
    const minitestCommand = [stringifyEnvs(this.config.minitestEnv), this.config.minitestCommand, minitestArgs].filter(Boolean).join(' ');

    const lineNumber = lines.length ? JSON.stringify(lines) : 'ALL';
    const saveRunOptions = cmdJoin(`echo ${fileName} > ${this.outputFilePath}`, `echo ${quote(lineNumber)} >> ${this.outputFilePath}`);
    const outputRedirect = `| ${teeCommand(this.outputFilePath, true, this.config.usingBashInWindows)}`;

    let fullCommand;
    if (this.config.minitestDecorateEditorWithResults) {
      fullCommand = cmdJoin(cdCommand, saveRunOptions, [minitestCommand, outputRedirect].filter(Boolean).join(' '));
    } else {
      fullCommand = cmdJoin(cdCommand, minitestCommand);
    }

    if (returnCommand === false) {
      return `(${fullCommand})`;
    } else {
      return cmdJoin(fullCommand, returnCommand);
    }
  }

  private buildChangeDirectoryToWorkspaceRootCommand() {
    if (!this.config.changeDirectoryToWorkspaceRoot) {
      return ['', ''];
    }

    return cdCommands(this.config.projectPath, this.config.usingBashInWindows);
  }

  private remappedPath(filePath: string) {
    return remapPath(filePath, this.config.rewriteTestPaths);
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
      this._term = vscode.window.createTerminal('MinitestRunner');
    }

    return this._term;
  }

  private testNameFilterRegex(s: string): string {
    return `"/${s.replace(/(?<!\\)"/g, '\\"')}/"`;
  }
};

export default MinitestRunner;
