import * as vscode from 'vscode';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as chokidar from 'chokidar';
import { isRspecOutput } from '../util';
import { RspecException, RspecOutput, TestResultException, TestResults } from '../types';
import { SpecRunnerConfig } from '../SpecRunnerConfig';
import SpecResultPresenter from '../SpecResultPresenter';

export class SpecResultInterpreter {
  private config: SpecRunnerConfig;
  private presenter: SpecResultPresenter;

  private _tmpOutputFile!: tmp.FileResult;

  constructor(config: SpecRunnerConfig, context: vscode.ExtensionContext, presenter: SpecResultPresenter) {
    this.config = config;
    this.presenter = presenter;
  }

  get outputFilePath() {
    return this.outputFile.name;
  }

  updateFromOutputFile() {
    fs.readFile(this.outputFilePath, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        console.error('SpecRunner: Error reading rspec output file.', err);
        return;
      }

      this.updateFromOutputJson(data.toString());
    });
  }

  async updateFromOutputJson(json: string) {
    try {
      const results = JSON.parse(json);
      if (isRspecOutput(results)) {
        await this.updateFromRspecOutput(results);
        return;
      }

      console.info('SpecRunner: Rspec output file updated, but did not contain readable results.');
    } catch (error: any) {
      console.error('SpecRunner: Error parsing rspec output file.', error);
    }
  }

  async updateFromRspecOutput(output: RspecOutput) {
    const { examples } = output;
    const testRun = Date.now().toString();
    const testResults: TestResults = {};

    // eslint-disable-next-line @typescript-eslint/naming-convention
    await Promise.all(examples.map(async ({ file_path, line_number, id, status, exception, description, run_time, pending_message }) => {
      const absoluteFilePath = await this.testFilePath(file_path);
      const fileResults = testResults[absoluteFilePath] ||= {
        testRun,
        testRunPending: false,
        results: {}
      };

      const file = vscode.workspace.textDocuments.find((doc) => doc.fileName === absoluteFilePath);

      const adjustedLine = this.checkAndAdjustLine(line_number, description, file);

      fileResults.results[adjustedLine.toString()] = {
        id,
        testRun,
        line: adjustedLine,
        content: this.contentAtLine(file, adjustedLine),
        status,
        exception: this.exceptionContent(exception, file),
        testName: description,
        runTime: run_time ? `${run_time.toFixed(1)} seconds` : undefined,
        pendingMessage: pending_message,
      };
    }));

    this.presenter.setTestResults(testResults);
  }

  /**
   * The file may have been edited between the test starting and the test
   * finishing, potentially moving the tests around. So we need to check
   * if any lines need adjusting.
   * Rspec gives us the test name so we can use that to find the line.
   */
  private checkAndAdjustLine(line: number, testName: string, file?: vscode.TextDocument) {
    if (!file) { return line; }

    const lineContent = this.contentAtLine(file, line);
    if (lineContent.includes(testName)) { return line; }

    const matchingLines = file.getText().split(/\r?\n/).map<[string, number]>((line, i) => [line, i]).filter(([line]) => line.includes(testName));
    if (matchingLines.length === 0) { return line; } // Potentially generated title, fallback to original line
    if (matchingLines.length === 1) {
      return matchingLines[0][1] + 1;
    }

    return matchingLines.sort(([_lineA, lineANum], [_lineB, lineBNum]) => Math.abs(line - lineANum) > Math.abs(line - lineBNum) ? 1 : -1)[0][1];
  }

  private exceptionContent(exception?: RspecException, file?: vscode.TextDocument): TestResultException | undefined {
    if (!exception) { return undefined; }

    const testException: TestResultException = {
      type: exception.class,
      message: exception.message
    };

    if (!file) { return testException; }

    const exceptionLine = exception.backtrace.find(traceLine => new RegExp(`^${file.fileName}:\\d+:in`).test(traceLine));
    if (!exceptionLine) { return testException; }

    const match = exceptionLine.match(/:(\d+):in/);
    testException.line = parseInt(match![1]);
    testException.content = this.contentAtLine(file, testException.line);

    return testException;
  }

  private contentAtLine(file: vscode.TextDocument | undefined, line: number) {
    // If we can't access the file we will set the content to the current time
    // which effectively means the content is unknown.
    return file?.getText(new vscode.Range(line - 1, 0, line - 1, 1000)) || Date.now().toString();
  }

  private async testFilePath(maybeARelativeFilePath: string) {
    if (maybeARelativeFilePath.startsWith('.')) {
      try {
        // attempt to replace the relative path with an absolute path using the workspace root
        return maybeARelativeFilePath.replace(/^\./, this.config.projectPath);
      } catch (error: any) {
        if (error?.name === 'NoWorkspaceError') {
          // We are unable to figure out the workspace root so we will try and find the file
          const files = await vscode.workspace.findFiles(maybeARelativeFilePath.replace(/^\.[\/\\]/, ''));

          if (files.length) {
            return files[0].fsPath;
          }
        }

        throw error;
      }
    }

    return maybeARelativeFilePath;
  }

  private get outputFile() {
    return this._tmpOutputFile ||= this.createTempFile();
  }

  private createTempFile() {
    const file = tmp.fileSync({ postfix: '.json' });

    chokidar.watch(file.name).on('change', (_event, _path) => this.updateFromOutputFile());

    return file;
  }
}

export default SpecResultInterpreter;
