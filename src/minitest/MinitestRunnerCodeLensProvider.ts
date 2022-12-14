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
    const specRegions = parser.getTestRegions();

    const codeLens: CodeLens[] = [];

    specRegions.forEach(testRegion => {
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

    return codeLens;
  }
}

export default MinitestRunnerCodeLensProvider;
