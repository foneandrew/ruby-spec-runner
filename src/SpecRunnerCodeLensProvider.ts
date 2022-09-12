import { CodeLens, CodeLensProvider, Event, Position, ProviderResult, Range, TextDocument } from 'vscode';
import { SpecParser } from './SpecParser';
import SpecRunnerConfig from './SpecRunnerConfig';

export type CodeLensCommandArg = {
  line: number;
  fileName: string;
  name?: string;
};

export class SpecRunnerCodeLensProvider implements CodeLensProvider {
  onDidChangeCodeLenses?: Event<void> | undefined;
  private config: SpecRunnerConfig;

  constructor(config: SpecRunnerConfig) {
    this.config = config;
  }

  provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
    if (!this.config.codeLensPrompts) {
      return [];
    }

    const parser = new SpecParser(document);
    const specRegions = parser.getSpecRegions();

    const codeLens: CodeLens[] = [];

    specRegions.forEach(specRegion => {
      codeLens.push(new CodeLens(
        specRegion.range,
        {
          title: '$(testing-run-icon) Run',
          arguments: [{
            fileName: document.fileName,
            name: specRegion.name,
            line: specRegion.range.start.line + 1
          }],
          command: 'extension.runSpec',
          tooltip: 'Run this example/context in rspec'
        }
      ));
    });

    return codeLens;
  }
}

export default SpecRunnerCodeLensProvider;
