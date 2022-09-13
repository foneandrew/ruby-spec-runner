import { CodeLens, CodeLensProvider, Event, ProviderResult, TextDocument } from 'vscode';
import MinitestParser from './MinitestParser';
import SpecRunnerConfig from '../SpecRunnerConfig';

export type CodeLensCommandArg = {
  line: number;
  fileName: string;
  name?: string;
};

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
      codeLens.push(new CodeLens(
        testRegion.range,
        {
          title: '$(testing-run-icon) Run',
          arguments: [{
            fileName: document.fileName,
            name: testRegion.name,
            line: testRegion.range.start.line + 1
          }],
          command: 'extension.runMinitest',
          tooltip: 'Run this test in minitest'
        }
      ));
    });

    return codeLens;
  }
}

export default MinitestRunnerCodeLensProvider;
