import * as vscode from 'vscode';
import * as path from 'path';
import { RspecExampleStatus, TestResultException, TestResultLineResult, TestResults } from './types';
import SpecRunnerConfig from './SpecRunnerConfig';
import { DecorationRenderOptions } from 'vscode';

interface ConfigurableEditorDecorations {
  passedGutter: vscode.TextEditorDecorationType;
  stalePassedGutter: vscode.TextEditorDecorationType;
  pendingGutter: vscode.TextEditorDecorationType;
  stalePendingGutter: vscode.TextEditorDecorationType;
  failedGutter: vscode.TextEditorDecorationType;
  staleFailedGutter: vscode.TextEditorDecorationType;
};

interface ConfigurableEditorDecorationsCollection {
  left: ConfigurableEditorDecorations;
  right: ConfigurableEditorDecorations;
  center: ConfigurableEditorDecorations;
}

interface BaseGetDecorationsParameters {
  activeEditor: vscode.TextEditor;
  options: {
    forPendingTestRun: boolean;
    state?: RspecExampleStatus;
    forCurrentTestRun?: boolean;
  }
};

interface GetDecorationsParametersWithMessage extends BaseGetDecorationsParameters {
  message: string;
  messageFromTestResult?: undefined;
}

interface GetDecorationsParametersWithMessageGenerator extends BaseGetDecorationsParameters {
  message?: undefined;
  messageFromTestResult: (testResult: TestResultLineResult) => string;
}

type GetDecorationsParameters = GetDecorationsParametersWithMessage | GetDecorationsParametersWithMessageGenerator;

const hasMessage = (params: GetDecorationsParameters): params is GetDecorationsParametersWithMessage => {
  // eslint-disable-next-line eqeqeq
  return (params as GetDecorationsParametersWithMessage).message != null;
};

export class SpecResultPresenter {
  private _testResults!: TestResults;
  private config: SpecRunnerConfig;

  private _editorDecorations: ConfigurableEditorDecorationsCollection;

  private testRunPendingGutter: vscode.TextEditorDecorationType;
  private failedLine: vscode.TextEditorDecorationType;
  private staleFailedLine: vscode.TextEditorDecorationType;

  constructor(context: vscode.ExtensionContext, config: SpecRunnerConfig) {
    this._editorDecorations = this.buildConfigurableEditorDecorations();

    this.testRunPendingGutter = this.buildEditorDecoration('test_run_pending.svg');
    this.failedLine = vscode.window.createTextEditorDecorationType({
      backgroundColor: '#dc113766',
      overviewRulerColor: '#e15656ba',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });
    this.staleFailedLine = vscode.window.createTextEditorDecorationType({
      backgroundColor: '#dc113733',
      overviewRulerColor: '#dc113766',
      overviewRulerLane: vscode.OverviewRulerLane.Full,
    });

    this.config = config;

    Object.values(this._editorDecorations).forEach((decorations: ConfigurableEditorDecorations) => {
      Object.values(decorations).forEach((decoration: vscode.TextEditorDecorationType) => {
        context.subscriptions.push(decoration);
      });
    });
    context.subscriptions.push(this.testRunPendingGutter);
    context.subscriptions.push(this.failedLine);
  }

  setTestResults(testResults: TestResults) {
    Object.entries(testResults).forEach(([fileName, results]) => {
      if(!this.testResults[fileName]) {
        // New file
        this.testResults[fileName] = results;
      } else {
        // New test run for existing file
        this.testResults[fileName].testRun = results.testRun;
        this.testResults[fileName].testRunPending = results.testRunPending;
        Object.entries(results.results).forEach(([lineNumber, result]) => {
          this.testResults[fileName].results[lineNumber] = result;
        });
      }
    });

    this.update();
  }

  clearTestResults() {
    const activeEditor = vscode.window.activeTextEditor;

    if(!activeEditor?.document) {
      return;
    }

    delete this.testResults[activeEditor.document.fileName];
    this.clearGutters(activeEditor);

    this.update();
  }

  update() {
    const activeEditor = vscode.window.activeTextEditor;

    if(!activeEditor?.document || !this.testResults[activeEditor.document.fileName]) {
      return;
    }

    const isSpecFile = activeEditor?.document.fileName.match(/_spec\.rb$/);
    const isMinitestFile = activeEditor?.document.fileName.match(/_test\.rb$/);

    if (!isSpecFile && !isMinitestFile) {
      return;
    }

    if (isSpecFile && !this.config.rspecDecorateEditorWithResults) {
      return;
    }

    if (isMinitestFile && !this.config.minitestDecorateEditorWithResults) {
      return;
    }

    this.syncTestResults(activeEditor);
    this.syncTestResultExceptions(activeEditor);

    activeEditor.setDecorations(this.failedLine, this.getFailedLineDecorations(activeEditor, false, error => `Test failed: ${error}`));

    activeEditor.setDecorations(this.passedGutter, this.getDecorations({
      activeEditor,
      messageFromTestResult: testResult => ['Passed', testResult.runTime && `in ${testResult.runTime}`].filter(Boolean).join(' '),
      options: {
        state: RspecExampleStatus.Passed,
        forCurrentTestRun: true,
        forPendingTestRun: false
      }
    }));
    activeEditor.setDecorations(this.pendingGutter, this.getDecorations({
      activeEditor,
      messageFromTestResult: testResult => ['Test is skipped/pending', testResult.pendingMessage].filter(Boolean).join(': '),
      options: {
        state: RspecExampleStatus.Pending,
        forCurrentTestRun: true,
        forPendingTestRun: false
      }
    }));
    activeEditor.setDecorations(this.testRunPendingGutter, this.getDecorations({
      activeEditor,
      message: 'Awaiting test results...',
      options: {
        forPendingTestRun: true
      }
    }));
    activeEditor.setDecorations(this.failedGutter, this.getDecorations({
      activeEditor,
      messageFromTestResult: testResult => ['Failed', testResult.runTime && ` in ${testResult.runTime}`, testResult?.exception?.message && `: ${testResult.exception.message}`].filter(Boolean).join(''),
      options: {
        state: RspecExampleStatus.Failed,
        forCurrentTestRun: true,
        forPendingTestRun: false
      }
    }));

    if ((isSpecFile && this.config.rspecDecorateEditorWithStaleResults) || (isMinitestFile && this.config.minitestDecorateEditorWithStaleResults)) {
      activeEditor.setDecorations(this.stalePassedGutter, this.getDecorations({
        activeEditor,
        messageFromTestResult: testResult => ['Passed', testResult.runTime && `in ${testResult.runTime}`, '(stale)'].filter(Boolean).join(' '),
        options: {
          state: RspecExampleStatus.Passed,
          forCurrentTestRun: false,
          forPendingTestRun: false
        }
      }));
      activeEditor.setDecorations(this.stalePendingGutter, this.getDecorations({
        activeEditor,
        messageFromTestResult: testResult => ['Test is skipped/pending', testResult.pendingMessage && `: ${testResult.pendingMessage}`, ' (stale)'].filter(Boolean).join(''),
        options: {
          state: RspecExampleStatus.Pending,
          forCurrentTestRun: false,
          forPendingTestRun: false
        }
      }));
      activeEditor.setDecorations(this.staleFailedGutter, this.getDecorations({
        activeEditor,
        messageFromTestResult: testResult => ['Failed', testResult.runTime && ` in ${testResult.runTime}`, ' (stale)', testResult?.exception?.message && `: ${testResult.exception.message}`].filter(Boolean).join(''),
        options: {
          state: RspecExampleStatus.Failed,
          forCurrentTestRun: false,
          forPendingTestRun: false
        }
      }));
      activeEditor.setDecorations(this.staleFailedLine, this.getFailedLineDecorations(activeEditor, true, error => `Test failed (stale): ${error}`));
    } else {
      this.clearGutters(activeEditor, true);
    }
  }

  setPending(testFile: string) {
    if (this.testResults[testFile]) {
      this.testResults[testFile].testRunPending = true;
      this.update();
    }
  }

  private syncTestResults(activeEditor: vscode.TextEditor) {
    // [id, result, trimmedLineContent, newLineNumbers[]]
    let linesToSync: [string, TestResultLineResult, string, number[]][] = [];
    const currentFileName = activeEditor.document.fileName;
    const fileResults = this.testResults[activeEditor.document.fileName];

    // Find and remove lines that have been added or removed
    Object.entries(fileResults?.results || {}).forEach(([id, result]) => {
      const content = this.contentAtLine(activeEditor.document, result.line);

      if(!content.startsWith(result.content)) {
        linesToSync.push([id, result, result.content.trim(), []]);
        delete this.testResults[currentFileName].results[id];
      }
    });

    // Find new matching lines
    const lines = activeEditor.document.getText().split(/\r?\n/);
    lines.forEach((line, lineNumber) => {
      linesToSync.forEach(([id, result, trimmedLineContent, newLineNumbers]) => {
        if (line.trim() === trimmedLineContent) {
          newLineNumbers.push(lineNumber + 1);
        }
      });
    });

    // Update lines that have been moved
    linesToSync.forEach(([id, result, trimmedLineContent, newLineNumbers]) => {
      if (newLineNumbers.length > 0) {
        const newLine = this.selectNewLineNumber(newLineNumbers, result.line);
        const testId = newLine.toString();
        this.testResults[currentFileName].results[testId.toString()] = result;
        this.testResults[currentFileName].results[testId.toString()].line = newLine;
      }
    });
  }

  private syncTestResultExceptions(activeEditor: vscode.TextEditor) {
    // [id, exception, trimmedLineContent, newLineNumbers[]]
    let linesToSync: [string, TestResultException, string, number[]][] = [];
    const currentFileName = activeEditor.document.fileName;

    Object.entries(this.testResults[currentFileName]?.results || {})
      .filter(([_id, result]) => result.status === RspecExampleStatus.Failed && result.exception?.line && result.exception?.content)
      .forEach(([id, result]) => {
        const content = this.contentAtLine(activeEditor.document, result.exception!.line!);

        if (!content.startsWith(result.exception!.content!)) {
          linesToSync.push([id, result.exception!, result.exception!.content!.trim(), []]);
        }
      });

    // Find new matching lines
    const lines = activeEditor.document.getText().split(/\r?\n/);
    lines.forEach((line, lineNumber) => {
      linesToSync.forEach(([id, exception, trimmedLineContent, newLineNumbers]) => {
        if (line.trim() === trimmedLineContent) {
          newLineNumbers.push(lineNumber + 1);
        }
      });
    });

    // Update lines that have been moved
    linesToSync.forEach(([id, exception, trimmedLineContent, newLineNumbers]) => {
      if (newLineNumbers.length > 0) {
        const newLine = this.selectNewLineNumber(newLineNumbers, exception.line!);
        this.testResults[currentFileName].results[id.toString()].exception!.line = newLine;
      } else {
        delete this.testResults[currentFileName].results[id].exception?.line;
        delete this.testResults[currentFileName].results[id].exception?.content;
      }
    });
  }

  /**
   * Attempt to find the closest line number to the original line number
   */
  private selectNewLineNumber(newLineNumbers: number[], originalLine: number) {
    return newLineNumbers.sort((a, b) => Math.abs(a - originalLine) - Math.abs(b - originalLine))[0];
  }

  private getFailedLineDecorations(activeEditor: vscode.TextEditor, stale: boolean, message: (error?: string) => string): vscode.DecorationOptions[] {
    const currentTestRun = this.currentTestRun(activeEditor);
    const testRunPending = this.testResults[activeEditor.document.fileName].testRunPending;

    return Object.values(this.testResults[activeEditor.document.fileName]?.results || {})
      .filter(result => {
        let filter =  !testRunPending && result.status === RspecExampleStatus.Failed && !!result.exception?.line;

        const isForDesiredTestRun = stale ? (result.testRun !== currentTestRun) : (result.testRun === currentTestRun);
        filter = filter && isForDesiredTestRun;

        return filter;
      })
      .map(result => {
        const hoverMessage = message([result.exception?.type, result.exception?.message].filter(Boolean).join('\n'));

        return {
          range: new vscode.Range(result.exception!.line! - 1, 0, result.exception!.line! - 1, result.exception!.content?.length || 1000),
          hoverMessage
        };
      });
  }

  private getDecorations(params: GetDecorationsParameters): vscode.DecorationOptions[] {
    const currentTestRun = this.currentTestRun(params.activeEditor);
    const testRunPending = this.testResults[params.activeEditor.document.fileName].testRunPending;

    const decorations = Object.values(this.testResults[params.activeEditor.document.fileName]?.results || {})
      .filter(result => {
        let filter =  params.options.forPendingTestRun === testRunPending;

        if (params.options.state) {
          filter = filter && (result.status === params.options.state);
        }

        // eslint-disable-next-line eqeqeq
        if (params.options.forCurrentTestRun != undefined) {
          const isForDesiredTestRun = params.options.forCurrentTestRun ? (result.testRun === currentTestRun) : (result.testRun !== currentTestRun);
          filter = filter && isForDesiredTestRun;
        }

        return filter;
      })
      .map(result => {
        let hoverMessage;
        if (hasMessage(params)) {
          hoverMessage = params.message;
        } else {
          hoverMessage = params.messageFromTestResult(result);
        }

        const lineStart = result.content.match(/\S/)?.index ?? 0;

        return {
          range: new vscode.Range(result.line - 1, lineStart, result.line - 1, result.content.length),
          hoverMessage
        };
      });
    return decorations;
  }

  private contentAtLine(file: vscode.TextDocument, line: number) {
    // If we can't access the file we will set the content to the current time
    // which effectively means the content is unknown.
    return file?.getText(new vscode.Range(line - 1, 0, line - 1, 1000)) || Date.now().toString();
  }

  private currentTestRun(activeEditor: vscode.TextEditor) {
    return this.testResults[activeEditor.document.fileName]?.testRun;
  }

  private clearGutters(activeEditor: vscode.TextEditor, staleOnly = false) {
    if (!staleOnly) {
      activeEditor.setDecorations(this.testRunPendingGutter, []);
      activeEditor.setDecorations(this.failedLine, []);

      (['left', 'right', 'center'] as Array<'left' | 'right' | 'center'>).forEach(position => {
        activeEditor.setDecorations(this._editorDecorations[position].passedGutter, []);
        activeEditor.setDecorations(this._editorDecorations[position].pendingGutter, []);
        activeEditor.setDecorations(this._editorDecorations[position].failedGutter, []);
      });
    }

    activeEditor.setDecorations(this.staleFailedLine, []);

    (['left', 'right', 'center'] as Array<'left' | 'right' | 'center'>).forEach(position => {
      activeEditor.setDecorations(this._editorDecorations[position].stalePassedGutter, []);
      activeEditor.setDecorations(this._editorDecorations[position].stalePendingGutter, []);
      activeEditor.setDecorations(this._editorDecorations[position].staleFailedGutter, []);
    });
  }

  private get testResults() {
    return this._testResults ||= {};
  }

  private get passedGutter() {
    return this._editorDecorations[this.config.overviewHighlightPosition].passedGutter;
  }

  private get stalePassedGutter() {
    return this._editorDecorations[this.config.overviewHighlightPosition].stalePassedGutter;
  }

  private get pendingGutter() {
    return this._editorDecorations[this.config.overviewHighlightPosition].pendingGutter;
  }

  private get stalePendingGutter() {
    return this._editorDecorations[this.config.overviewHighlightPosition].stalePendingGutter;
  }

  private get failedGutter() {
    return this._editorDecorations[this.config.overviewHighlightPosition].failedGutter;
  }

  private get staleFailedGutter() {
    return this._editorDecorations[this.config.overviewHighlightPosition].staleFailedGutter;
  }


  private buildConfigurableEditorDecorations(): ConfigurableEditorDecorationsCollection {
    const decorations: Partial<ConfigurableEditorDecorationsCollection>  = {};

    ([['left', vscode.OverviewRulerLane.Left], ['right', vscode.OverviewRulerLane.Right], ['center', vscode.OverviewRulerLane.Center]] as ['left' | 'right' | 'center', vscode.OverviewRulerLane][])
      .forEach(([key, position]) => {
        decorations[key] = {
          passedGutter: this.buildEditorDecoration('passed.svg', '#69e06dba', position),
          stalePassedGutter: this.buildEditorDecoration('passed_stale.svg', '#69e06dba', position, { borderStyle: 'dashed', borderWidth: '0 0 1px 0' }),
          pendingGutter: this.buildEditorDecoration('pending.svg', '#e0be69ba', position),
          stalePendingGutter: this.buildEditorDecoration('pending_stale.svg', '#e0be69ba', position, { borderStyle: 'dashed', borderWidth: '0 0 1px 0' }),
          failedGutter: this.buildEditorDecoration('failed.svg', '#e15656ba', position),
          staleFailedGutter: this.buildEditorDecoration('failed_stale.svg', '#e15656ba', position, { borderStyle: 'dashed', borderWidth: '0 0 1px 0' })
        };
      });

    return decorations as ConfigurableEditorDecorationsCollection;
  }

  private buildEditorDecoration(icon: string, rulerColor?: string, position?: vscode.OverviewRulerLane, customisation?: Partial<DecorationRenderOptions>): vscode.TextEditorDecorationType {
    let decorationConfig: DecorationRenderOptions = {
      gutterIconPath: path.join(__dirname, '..', 'resources', icon),
      overviewRulerColor: rulerColor,
      overviewRulerLane: position
    };
    if (rulerColor) {
      decorationConfig = {
        ... decorationConfig,
        borderColor: rulerColor,
        borderStyle: 'solid',
        borderWidth: '0 0 2px 0'
      };
    }
    return vscode.window.createTextEditorDecorationType({ ...decorationConfig, ...customisation });
  }
}

export default SpecResultPresenter;
