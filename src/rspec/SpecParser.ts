import { Position, Range, TextDocument } from 'vscode';

interface SpecRegion {
  range: Range;
  name?: string;
};

export class SpecParser {
  private matcher = /(?:(?:^\s*(?:RSpec\.)?(?:it|context|example)\(?\s*(?:(['"])(?<title>.*)\1)?\)?\s*(?:,\s*[\w:'"]+\s*(?:=>)?\s*['":\w]+)?\s*(?:do|{))|(?:^\s*(?:it_behaves_like|include_examples)\s*(['"])(?:.*)\3\s*(?:do|{)?)|(?:^\s*(?:RSpec\.)?describe\(?\s*(?:(?<describedClass>[\w:\.]+)|(?:(['"])(?<describedString>.*)\5))\)?\s*(?:,\s*:?['"\w]+\s*(?:=>|:)\s*['"\w:]+\s*)*\s*(?:do|{))|(?:^\s*(?:it|example)\s*{(?<singleLine>.*)}))\s*(?:#.*)?$/;
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
