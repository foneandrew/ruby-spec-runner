import * as vscode from 'vscode';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as chokidar from 'chokidar';
import { RspecExampleStatus, TestResultException, TestResults } from '../types';
import { SpecRunnerConfig } from '../SpecRunnerConfig';
import SpecResultPresenter from '../SpecResultPresenter';
import MinitestParser, { MinitestRegion } from './MinitestParser';

export class MinitestResultInterpreter {
  private colorCodesMatcher = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  private summaryMatcher = /(?<tests>\d+) tests, (?<assertions>\d+) assertions, (?<failures>\d+) failures, (?<errors>\d+) errors, (?<skips>\d+) skips/;
  private skippedMatcher = /Skipped:\r?\n.+:(?<lineNumber>\d+)\]:\s*(?<message>.+)/g;
  private failureMatcher = /Failure:\r?\n(?<testName>.+)\[.+:(?<lineNumber>\d+)\]\s*(?<message>(?:.|\r?\n[^\r\n])+)(?:\r?\n\r?\n|$)/g;
  private errorMatcher = /Error:\r?\n(?<testName>.+)\s* :\r?\n(?<errorName>.+)\r?\n(?<stackTrace>(?:.|\r?\n[^\r\n])+)(?:\r?\n\r?\n|$)/g;

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

    const match = line.match(/^(?<lineNumber>\d+)\s?(?<fromCodeLens>true)?$/);
    let testRunLineNumber = match?.groups?.lineNumber ? parseInt(match?.groups?.lineNumber) : undefined;
    const fromCodeLens = match?.groups?.fromCodeLens;

    const strippedOutput = minitestOutput.replace(this.colorCodesMatcher, '');
    const regions = new MinitestParser(file).getTestRegions();
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();

    // eslint-disable-next-line eqeqeq
    if (testRunLineNumber != null && !fromCodeLens) {
      // Keyboard shortcut was used to run the test
      // Need to find the line of the test that was run
      // Will probably be the first test line above the line that was run
      testRunLineNumber = reversedTestLines.filter(line => line <= testRunLineNumber!)[0];
    }

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
    seenLines = seenLines.concat(this.failureMatches(strippedOutput, regions, file, testRun, fileResults, testRunLineNumber));
    seenLines = seenLines.concat(this.errorMatches(strippedOutput, regions, file, testRun, fileResults, testRunLineNumber));
    seenLines = seenLines.concat(this.skippedMatches(strippedOutput, regions, file, testRun, fileResults, testRunLineNumber));

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
    } else if (testRunLineNumber && Object.values(fileResults.results).length === 0) {
      // Ran a single test and it didn't fail, error or skip so it must have passed
      fileResults.results[line] = {
        id: '¯\\_(ツ)_/¯',
        testRun,
        content: this.contentAtLine(file, testRunLineNumber),
        status: RspecExampleStatus.Passed,
        line: testRunLineNumber
      };
    }

    this.presenter.setTestResults(testResults);
  }

  private failureMatches(
    output: string,
    regions: MinitestRegion[],
    file: vscode.TextDocument,
    testRun: string,
    fileResults: TestResults['results'],
    testRunLineNumber?: number
  ) {
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();
    const seenLines: number[] = [];
    const failedMatches = [...output.matchAll(this.failureMatcher)];

    for (const failureMatch of failedMatches) {
      const failureLineNumber = parseInt(failureMatch.groups!.lineNumber);
      const testName = failureMatch.groups!.testName;

      // Attempt to find the test line by matching the test name
      const matchingTestRanges = regions.filter(r => r.name && testName?.includes(r.name.replace(/^["']|["']$/g, '')));
      let testNameMatchedLine: number | undefined;
      if (matchingTestRanges.length === 1) {
        testNameMatchedLine = matchingTestRanges[0].range.start.line + 1;
      }

      // If we are given a testRunLineNumber we will use it
      const testLine = testRunLineNumber || testNameMatchedLine || reversedTestLines.find(r => r <= failureLineNumber);

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
    fileResults: TestResults['results'],
    testRunLineNumber?: number
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
      const testName = errorMatch.groups!.testName;

      // Attempt to find the test line by matching the test name
      const matchingTestRanges = regions.filter(r => r.name && testName?.includes(r.name.replace(/^["']|["']$/g, '')));
      let testNameMatchedLine: number | undefined;
      if (matchingTestRanges.length === 1) {
        testNameMatchedLine = matchingTestRanges[0].range.start.line + 1;
      }

      // If we are given a testRunLineNumber we will use it
      const testLine = testRunLineNumber || testNameMatchedLine || reversedTestLines.find(r => r <= exceptionLineNum);

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
    fileResults: TestResults['results'],
    testRunLineNumber?: number
  ) {
    const reversedTestLines = regions.map(r => r.range.start.line + 1).reverse();
    const seenLines: number[] = [];
    const skippedMatches = [...output.matchAll(this.skippedMatcher)];

    for (const skippedMatch of skippedMatches) {
      const failureLineNumber = parseInt(skippedMatch.groups!.lineNumber);
      // If we are given a testRunLineNumber we will use it
      const testLine = testRunLineNumber || reversedTestLines.find(r => r <= failureLineNumber);

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

export default MinitestResultInterpreter;
