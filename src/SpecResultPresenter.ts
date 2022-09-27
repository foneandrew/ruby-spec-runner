import * as vscode from 'vscode';
import * as path from 'path';
import { RspecExampleStatus, TestResultException, TestResultLineResult, TestResults } from './types';
import SpecRunnerConfig from './SpecRunnerConfig';

export class SpecResultPresenter {
  private _testResults!: TestResults;
  private config: SpecRunnerConfig;

  private passedGutter: vscode.TextEditorDecorationType;
  private stalePassedGutter: vscode.TextEditorDecorationType;
  private pendingGutter: vscode.TextEditorDecorationType;
  private stalePendingGutter: vscode.TextEditorDecorationType;
  private testRunPendingGutter: vscode.TextEditorDecorationType;
  private failedGutter: vscode.TextEditorDecorationType;
  private staleFailedGutter: vscode.TextEditorDecorationType;
  private failedLine: vscode.TextEditorDecorationType;
  private staleFailedLine: vscode.TextEditorDecorationType;

  constructor(context: vscode.ExtensionContext, config: SpecRunnerConfig) {
    this.passedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'passed.svg'), overviewRulerColor: '#69e06dba', overviewRulerLane: vscode.OverviewRulerLane.Left });
    this.stalePassedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'passed_stale.svg'), overviewRulerColor: '#69e06dba', overviewRulerLane: vscode.OverviewRulerLane.Left });
    this.pendingGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'pending.svg'), overviewRulerColor: '#e0be69ba', overviewRulerLane: vscode.OverviewRulerLane.Left });
    this.stalePendingGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'pending_stale.svg'), overviewRulerColor: '#e0be69ba', overviewRulerLane: vscode.OverviewRulerLane.Left });
    this.testRunPendingGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'test_run_pending.svg') });
    this.failedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'failed.svg'), overviewRulerColor: '#e15656ba', overviewRulerLane: vscode.OverviewRulerLane.Left });
    this.staleFailedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'failed_stale.svg'), overviewRulerColor: '#e15656ba', overviewRulerLane: vscode.OverviewRulerLane.Left });
    this.failedLine = vscode.window.createTextEditorDecorationType({ backgroundColor: '#dc113766', overviewRulerColor: '#e15656ba', overviewRulerLane: vscode.OverviewRulerLane.Full });
    this.staleFailedLine = vscode.window.createTextEditorDecorationType({ backgroundColor: '#dc113733', overviewRulerColor: '#dc113766', overviewRulerLane: vscode.OverviewRulerLane.Full });

    this.config = config;

    context.subscriptions.push(this.passedGutter);
    context.subscriptions.push(this.stalePassedGutter);
    context.subscriptions.push(this.pendingGutter);
    context.subscriptions.push(this.stalePendingGutter);
    context.subscriptions.push(this.testRunPendingGutter);
    context.subscriptions.push(this.failedGutter);
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

    activeEditor.setDecorations(this.passedGutter, this.getDecorations(
      activeEditor,
      'Passed',
      {
        state: RspecExampleStatus.Passed,
        forCurrentTestRun: true,
        forPendingTestRun: false
      }
    ));
    activeEditor.setDecorations(this.pendingGutter, this.getDecorations(
      activeEditor,
      'Pending',
      {
        state: RspecExampleStatus.Pending,
        forCurrentTestRun: true,
        forPendingTestRun: false
      }
    ));
    activeEditor.setDecorations(this.testRunPendingGutter, this.getDecorations(
      activeEditor,
      'Tests are running...',
      {
        forPendingTestRun: true
      }
    ));
    activeEditor.setDecorations(this.failedGutter, this.getDecorations(
      activeEditor,
      exception => `Failed: ${exception?.message}`,
      {
        state: RspecExampleStatus.Failed,
        forCurrentTestRun: true,
        forPendingTestRun: false
      }
    ));

    if ((isSpecFile && this.config.rspecDecorateEditorWithStaleResults) || (isMinitestFile && this.config.minitestDecorateEditorWithStaleResults)) {
      activeEditor.setDecorations(this.stalePassedGutter, this.getDecorations(
        activeEditor,
        'Passed (stale)',
        {
          state: RspecExampleStatus.Passed,
          forCurrentTestRun: false,
          forPendingTestRun: false
        }
      ));
      activeEditor.setDecorations(this.stalePendingGutter, this.getDecorations(
        activeEditor,
        'Pending (stale)',
        {
          state: RspecExampleStatus.Pending,
          forCurrentTestRun: false,
          forPendingTestRun: false
        }
      ));
      activeEditor.setDecorations(this.staleFailedGutter, this.getDecorations(
        activeEditor,
        exception => `Failed (stale): ${exception?.message}`,
        {
          state: RspecExampleStatus.Failed,
          forCurrentTestRun: false,
          forPendingTestRun: false
        }
      ));
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
    let linesToSync: [string, TestResultLineResult][] = [];
    const currentFileName = activeEditor.document.fileName;
    const fileResults = this.testResults[activeEditor.document.fileName];

    // Find and remove lines that have been added or removed
    Object.entries(fileResults?.results || {}).forEach(([id, result]) => {
      const content = this.contentAtLine(activeEditor.document, result.line);

      if(!content.startsWith(result.content)) {
        linesToSync.push([id, result]);
        delete this.testResults[currentFileName].results[id];
      }
    });

    // Attempt to re-add changed lines
    linesToSync.forEach(([id, result]) => {
      this.syncTestResult(activeEditor, currentFileName, result);
    });
  }

  private syncTestResultExceptions(activeEditor: vscode.TextEditor) {
    Object.entries(this.testResults[activeEditor.document.fileName]?.results || {})
      .filter(([_id, result]) => result.status === RspecExampleStatus.Failed && result.exception?.line && result.exception?.content)
      .forEach(([id, result]) => {
        const content = this.contentAtLine(activeEditor.document, result.exception!.line!);

        if (!content.startsWith(result.exception!.content!)) {
          this.syncTestResultException(activeEditor, activeEditor.document.fileName, id, result.exception!.content!);
        }
      });
  }

  private syncTestResult(activeEditor: vscode.TextEditor, fileName: string, result: TestResultLineResult) {
    const lines = activeEditor.document.getText().split(/\r?\n/);
    const trimmedContent = result.content.trim();
    const foundAtLine = lines.findIndex(line => line.trim().startsWith(trimmedContent));

    if (foundAtLine >= 0) {
      const testId = (foundAtLine + 1).toString();
      this.testResults[fileName].results[testId.toString()] = result;
      this.testResults[fileName].results[testId.toString()].line = foundAtLine + 1;
    }
  }

  private syncTestResultException(activeEditor: vscode.TextEditor, fileName: string, testId: string, content: string) {
    const lines = activeEditor.document.getText().split(/\r?\n/);
    const trimmedContent = content.trim();
    const foundAtLine = lines.findIndex(line => line.trim().startsWith(trimmedContent));

    if (foundAtLine >= 0) {
      this.testResults[fileName].results[testId].exception!.line = foundAtLine + 1;
    } else {
      delete this.testResults[fileName].results[testId].exception?.line;
      delete this.testResults[fileName].results[testId].exception?.content;
    }
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

  private getDecorations(activeEditor: vscode.TextEditor, message: string | ((exception?: TestResultException) => string), options: {
    forPendingTestRun: boolean;
    state?: RspecExampleStatus;
    forCurrentTestRun?: boolean;
  }): vscode.DecorationOptions[] {
    const currentTestRun = this.currentTestRun(activeEditor);
    const testRunPending = this.testResults[activeEditor.document.fileName].testRunPending;

    const thing = Object.values(this.testResults[activeEditor.document.fileName]?.results || {})
      .filter(result => {
        let filter =  options.forPendingTestRun === testRunPending;

        if (options.state) {
          filter = filter && (result.status === options.state);
        }

        // eslint-disable-next-line eqeqeq
        if (options.forCurrentTestRun != undefined) {
          const isForDesiredTestRun = options.forCurrentTestRun ? (result.testRun === currentTestRun) : (result.testRun !== currentTestRun);
          filter = filter && isForDesiredTestRun;
        }

        return filter;
      })
      .map(result => ({
        range: new vscode.Range(result.line - 1, 0, result.line - 1, result.content.length),
        hoverMessage: typeof message === 'string' ? message : message(result.exception)
      }));
    return thing;
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
      activeEditor.setDecorations(this.passedGutter, []);
      activeEditor.setDecorations(this.pendingGutter, []);
      activeEditor.setDecorations(this.testRunPendingGutter, []);
      activeEditor.setDecorations(this.failedGutter, []);
      activeEditor.setDecorations(this.failedLine, []);
    }

    activeEditor.setDecorations(this.stalePassedGutter, []);
    activeEditor.setDecorations(this.stalePendingGutter, []);
    activeEditor.setDecorations(this.staleFailedGutter, []);
    activeEditor.setDecorations(this.staleFailedLine, []);
  }

  private get testResults() {
    return this._testResults ||= {};
  }
}

export default SpecResultPresenter;
