import { CodeLens, CodeLensProvider, Event, ProviderResult, TextDocument } from 'vscode';
import MinitestParser from './MinitestParser';
import SpecRunnerConfig from '../SpecRunnerConfig';
import { RunRspecOrMinitestArg } from '../types';

export class MinitestRunnerCodeLensProvider implements CodeLensProvider {
  onDidChangeCodeLenses?: Event<void> | undefined;
  private config: SpecRunnerConfig;

  constructor(config: SpecRunnerConfig) {
    this.config = config;
  }

  provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
    if (!this.config.minitestCodeLensPrompts) {
      return [];
    }

    const parser = new MinitestParser(document);
    const testRegions = parser.getTestRegions();
    const contextRegions = parser.getContextRegions();

    const codeLens: CodeLens[] = [];

    testRegions.forEach(testRegion => {
      const args: RunRspecOrMinitestArg = {
        fileName: document.fileName,
        name: testRegion.name,
        line: testRegion.range.start.line + 1,
        fromCodeLens: true
      };
      codeLens.push(new CodeLens(
        testRegion.range,
        {
          title: '$(testing-run-icon) Run',
          arguments: [args],
          command: 'ruby-spec-runner.runRspecOrMinitestFile',
          tooltip: 'Run this test'
        }
      ));
    });

    contextRegions.forEach(contextRegion => {
      const args: RunRspecOrMinitestArg = {
        fileName: document.fileName,
        name: contextRegion.name,
        line: contextRegion.range.start.line + 1,
        fromCodeLens: true,
        forLines: contextRegion.forTestLines?.map(line => line + 1)
      };
      codeLens.push(new CodeLens(
        contextRegion.range,
        {
          title: '$(testing-run-icon) Run',
          arguments: [args],
          command: 'ruby-spec-runner.runRspecOrMinitestFile',
          tooltip: 'Run this test'
        }
      ));
    });

    return codeLens;
  }
}

export default MinitestRunnerCodeLensProvider;
