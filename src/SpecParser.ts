import { Position, Range, TextDocument } from "vscode";

interface SpecRegion {
  range: Range;
  name?: string;
};

export class SpecParser {
  private matcher = /(?:^\s*(?:Rspec\.)?(?:describe|it|context)\s*(['"])(?<title>.*)\1\s*(?:do|{)$)|(?:^\s*(?:Rspec\.)?describe\s*(?<describe>[\w\.]+))\s*(?:do|{$)|(?:^\s*it\s*{(?<singleLine>.*)}$)/;
  private document: TextDocument;

  constructor(document: TextDocument) {
    this.document = document;
  }

  getSpecRegions(): SpecRegion[] {
    const text = this.document.getText();
    const regions: SpecRegion[] = [];

    text.split('\n').forEach((lineContent, lineNo) => {
      const match = lineContent.match(this.matcher);
      if (match) {
        regions.push({
          range: new Range(new Position(lineNo, 0), new Position(lineNo, lineContent.length)),
          name: match.groups?.title
        });
      }
    });

    return regions;
  }
}

export default SpecParser;
