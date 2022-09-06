import { CodeLens, CodeLensProvider, Event, Position, ProviderResult, Range, TextDocument } from 'vscode';
import { SpecParser } from './SpecParser';

export type CodeLensCommandArg = {
  line: number;
  fileName: string;
  name?: string;
};

export class SpecRunnerCodeLensProvider implements CodeLensProvider {
  onDidChangeCodeLenses?: Event<void> | undefined;

  provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
    const parser = new SpecParser(document);
    const specRegions = parser.getSpecRegions();

    const codeLens: CodeLens[] = [];

    specRegions.forEach(specRegion => {
      codeLens.push(new CodeLens(
        specRegion.range,
        {
          title: 'Run spec',
          arguments: [{
            fileName: document.fileName,
            name: specRegion.name,
            line: specRegion.range.start.line + 1
          }],
          command: 'extension.runSpec',
          tooltip: 'Run this spec'
        }
      ));
    });

    return codeLens;
  }
}

export default SpecRunnerCodeLensProvider;
