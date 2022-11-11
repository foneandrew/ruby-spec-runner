import { CodeLens, CodeLensProvider, Event, ProviderResult, TextDocument } from 'vscode';
import { SpecParser } from './SpecParser';
import SpecRunnerConfig from '../SpecRunnerConfig';
import { RunRspecOrMinitestArg } from '../types';

export class SpecRunnerCodeLensProvider implements CodeLensProvider {
  onDidChangeCodeLenses?: Event<void> | undefined;
  private config: SpecRunnerConfig;

  constructor(config: SpecRunnerConfig) {
    this.config = config;
  }

  provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
    if (!this.config.rspecCodeLensPrompts) {
      return [];
    }

    const parser = new SpecParser(document);
    const specRegions = parser.getSpecRegions();

    const codeLens: CodeLens[] = [];

    specRegions.forEach(specRegion => {
      const args: RunRspecOrMinitestArg = {
        fileName: document.fileName,
        name: specRegion.name,
        line: specRegion.range.start.line + 1,
        fromCodeLens: true
      };
      codeLens.push(new CodeLens(
        specRegion.range,
        {
          title: '$(testing-run-icon) Run',
          arguments: [args],
          command: 'ruby-spec-runner.runRspecOrMinitestFile',
          tooltip: 'Run this example/context'
        }
      ));
    });

    return codeLens;
  }
}

export default SpecRunnerCodeLensProvider;
