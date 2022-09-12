import * as vscode from 'vscode';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { RspecExampleStatus, TestResultException, TestResults } from './types';
import { SpecRunnerConfig } from './SpecRunnerConfig';
import SpecResultPresenter from './SpecResultPresenter';
import MinitestParser, { MinitestRegion } from './MinitestParser';

export class SpecResultInterpreter {
  private colorCodesMatcher = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  private summaryMatcher = /(?<tests>\d+) tests, (?<assertions>\d+) assertions, (?<failures>\d+) failures, (?<errors>\d+) errors, (?<skips>\d+) skips/;
  private skippedMatcher = /Skipped:\r?\n.+:(?<lineNumber>\d+)\]:\s*(?<message>.+)/g;
  private failureMatcher = /Failure:\r?\n.+:(?<lineNumber>\d+)\]\s*(?<message>(?:.|\r?\n[^\r\n])+)(?:\r?\n\r?\n|$)/g;
  private errorMatcher = /Error:\r?\n(?<testName>.+)\s* :\r?\n(?<errorName>.+)\r?\n(?<stackTrace>(?:.|\r?\n[^\r\n])+)(?:\r?\n\r?\n|$)/g;

  private config: SpecRunnerConfig;
  private presenter: SpecResultPresenter;
  private passedGutter: vscode.TextEditorDecorationType;
  private stalePassedGutter: vscode.TextEditorDecorationType;
  private failedGutter: vscode.TextEditorDecorationType;
  private pendingGutter: vscode.TextEditorDecorationType;
  private stalePendingGutter: vscode.TextEditorDecorationType;
  private failedLine: vscode.TextEditorDecorationType;

  private _tmpOutputFile!: tmp.FileResult;

  constructor(config: SpecRunnerConfig, context: vscode.ExtensionContext, presenter: SpecResultPresenter) {

    this.config = config;
    this.presenter = presenter;

    this.passedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'passed.svg'), overviewRulerColor: '#69e06dba', overviewRulerLane: vscode.OverviewRulerLane.Center });
    this.stalePassedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'passed_stale.svg'), overviewRulerColor: '#69e06dba', overviewRulerLane: vscode.OverviewRulerLane.Center });
    this.pendingGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'pending.svg'), overviewRulerColor: '#e0be69ba', overviewRulerLane: vscode.OverviewRulerLane.Center });
    this.stalePendingGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'pending_stale.svg'), overviewRulerColor: '#e0be69ba', overviewRulerLane: vscode.OverviewRulerLane.Center });
    this.failedGutter = vscode.window.createTextEditorDecorationType({ gutterIconPath: path.join(__dirname, '..', 'resources', 'failed.svg'), overviewRulerColor: '#e06969ba', overviewRulerLane: vscode.OverviewRulerLane.Center });
    this.failedLine = vscode.window.createTextEditorDecorationType({ backgroundColor: '#dc113766', overviewRulerColor: '#dc113766', overviewRulerLane: vscode.OverviewRulerLane.Right });

    context.subscriptions.push(this.passedGutter);
    context.subscriptions.push(this.stalePassedGutter);
    context.subscriptions.push(this.pendingGutter);
    context.subscriptions.push(this.stalePendingGutter);
    context.subscriptions.push(this.failedGutter);
    context.subscriptions.push(this.failedLine);
  }

  get outputFilePath() {
    return this.outputFile.name;
  }

  updateFromTestFileChange() {
    throw new Error('Method not implemented.');
  }

  updateFromOutputFile() {
    fs.readFile(this.outputFilePath, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        console.error('SpecRunner: Error reading minitest output file.', err);
        return;
      }

      this.updateFromMinitestOutput(data.toString());
    });
  }

  async updateFromMinitestOutput(minitestOutput: string) {
    const [fileName, line, ...otherLines] = minitestOutput.split(/\r?\n/);
    if (otherLines.length <= 1) {
      console.info('SpecRunner: minitest output file updated, but did not contain readable results.');
      return;
    }

    const file = vscode.workspace.textDocuments.find((doc) => doc.fileName === fileName);
    if (!file) {
      console.error('SpecRunner: Could not find file in workspace', fileName);
      return;
    }

    const strippedOutput = minitestOutput.replace(this.colorCodesMatcher, '');
    const regions = new MinitestParser(file).getTestRegions();
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();

    const testResults: TestResults = {};
    const testRun = Date.now().toString();

    const fileResults: TestResults['results'] = testResults[fileName] = {
      testRun,
      testRunPending: false,
      results: {}
    };

    let testFinished = false;
    const summaryMatch = strippedOutput.match(this.summaryMatcher);
    if (summaryMatch?.groups?.tests) {
      const testCount = parseInt(summaryMatch?.groups?.tests);
      if (testCount > 0) {
        testFinished = true;
      }
    }

    if (!testFinished) {
      return;
    }

    let seenLines: number[] = [];
    seenLines = seenLines.concat(this.failureMatches(strippedOutput, regions, file, testRun, fileResults));
    seenLines = seenLines.concat(this.errorMatches(strippedOutput, regions, file, testRun, fileResults));
    seenLines = seenLines.concat(this.skippedMatches(strippedOutput, regions, file, testRun, fileResults));

    if (line === 'ALL') {
      // Find the tests that didn't fail, error or skip (they must have passed)
      reversedTestLines.filter(line => !seenLines.includes(line)).forEach(line => {
        fileResults.results[line.toString()] = {
          id: '¯\\_(ツ)_/¯',
          testRun,
          content: this.contentAtLine(file, line),
          status: RspecExampleStatus.Passed,
          line: line
        };
      });
    } else if (line.match(/^\d+$/) && Object.values(fileResults.results).length === 0) {
      const lineNumber = parseInt(line);

      // Ran a single test and it didn't fail, error or skip so it must have passed
      fileResults.results[line] = {
        id: '¯\\_(ツ)_/¯',
        testRun,
        content: this.contentAtLine(file, lineNumber),
        status: RspecExampleStatus.Passed,
        line: lineNumber
      };
    }

    this.presenter.setTestResults(testResults);
  }

  private failureMatches(
    output: string,
    regions: MinitestRegion[],
    file: vscode.TextDocument,
    testRun: string,
    fileResults: TestResults['results']
  ) {
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();
    const seenLines: number[] = [];
    const failedMatches = [...output.matchAll(this.failureMatcher)];

    for (const failureMatch of failedMatches) {
      const failureLineNumber = parseInt(failureMatch.groups!.lineNumber);
      const testLine = reversedTestLines.find(r => r <= failureLineNumber);

      if (!testLine) {
        console.error('SpecRunner: Could not find region for line', failureLineNumber);
        continue;
      }

      const exception: TestResultException = {
        type: '',
        message: failureMatch.groups!.message,
        line: failureLineNumber,
        content: this.contentAtLine(file, failureLineNumber)
      };

      fileResults.results[testLine.toString()] = {
        id: '¯\\_(ツ)_/¯',
        testRun,
        content: this.contentAtLine(file, testLine),
        status: RspecExampleStatus.Failed,
        line: testLine,
        exception: exception
      };

      seenLines.push(testLine);
    }

    return seenLines;
  }

  private errorMatches(
    output: string,
    regions: MinitestRegion[],
    file: vscode.TextDocument,
    testRun: string,
    fileResults: TestResults['results']
  ) {
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();
    const seenLines: number[] = [];
    const errorMatches = [...output.matchAll(this.errorMatcher)];
    const relativePath = file.fileName.replace(this.config.projectPath, '').substring(1);

    for (const errorMatch of errorMatches) {
      const exceptionLine = errorMatch.groups!.stackTrace
        .split(/\r?\n/)
        .map(l => l.trim())
        .find(traceLine => new RegExp(`^.*${relativePath}:\\d+:in`).test(traceLine));

      if (!exceptionLine) {
        console.error('SpecRunner: Could not find exception line in stack trace', errorMatch.groups!.stackTrace);
        continue;
      }
      const lineNumMatch = exceptionLine.match(/:(\d+):in/);
      const exceptionLineNum = parseInt(lineNumMatch![1]);
      const testLine = reversedTestLines.find(r => r <= exceptionLineNum);

      if (!testLine) {
        console.error('SpecRunner: Could not find region for line', exceptionLineNum);
        continue;
      }

      fileResults.results[testLine.toString()] = {
        id: '¯\\_(ツ)_/¯',
        testRun,
        content: this.contentAtLine(file, testLine),
        status: RspecExampleStatus.Failed,
        line: testLine,
        exception: {
          message: errorMatch.groups!.errorName,
          line: exceptionLineNum,
          content: this.contentAtLine(file, exceptionLineNum)
        }
      };

      seenLines.push(testLine);
    }

    return seenLines;
  }

  private skippedMatches(
    output: string,
    regions: MinitestRegion[],
    file: vscode.TextDocument,
    testRun: string,
    fileResults: TestResults['results']
  ) {
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();
    const seenLines: number[] = [];
    const skippedMatches = [...output.matchAll(this.skippedMatcher)];

    for (const skippedMatch of skippedMatches) {
      const failureLineNumber = parseInt(skippedMatch.groups!.lineNumber);
      const testLine = reversedTestLines.find(r => r <= failureLineNumber);

      if (!testLine) {
        console.error('SpecRunner: Could not find region for line', failureLineNumber);
        continue;
      }

      fileResults.results[testLine.toString()] = {
        id: '¯\\_(ツ)_/¯',
        testRun,
        content: this.contentAtLine(file, testLine),
        status: RspecExampleStatus.Pending,
        line: testLine
      };

      seenLines.push(testLine);
    }

    return seenLines;
  }

  private contentAtLine(file: vscode.TextDocument | undefined, line: number) {
    // If we can't access the file we will set the content to the current time
    // which effectively means the content is unknown.
    return file?.getText(new vscode.Range(line - 1, 0, line - 1, 1000)) || Date.now().toString();
  }

  private get outputFile() {
    return this._tmpOutputFile ||= this.createTempFile();
  }

  private createTempFile() {
    const file = tmp.fileSync();

    chokidar.watch(file.name).on('change', (_event, _path) => this.updateFromOutputFile());

    return file;
  }
}

export default SpecResultInterpreter;
