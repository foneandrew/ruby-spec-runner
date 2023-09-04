import { Position, Range, TextDocument } from 'vscode';

export interface MinitestRegion {
  range: Range;
  name?: string;
  forTestLines?: number[];
};

export class MinitestParser {
  private testMatcher = /(?:(?:^\s*(?:it|should)\(?\s*(?<title>(['"]).*\2)\)?\s*(?:do|{))|(?:^\s*def\s*(?<unit_def>test_\w+)(?:\(\))?\s*))\s*(?:#.*)?$/;
  // private testMatcher = (indent = '\\s*') => new RegExp(`(?:(?:^${indent}(?:it|should)\\(?\\s*(?<title>(['"]).*\\2)\\)?\\s*(?:do|{))|(?:^${indent}def\\s*(?<unit_def>test_\\w+)(?:\\(\\))?\\s*))\\s*(?:#.*)?$`);
  private contextMatcher = /^\s*(?:(?:class)\s+(?<className>\w+).*)|(?:(?:context|describe)\(?\s*(['"])(?<contextName>.*)\2\s*\)?\s*(?:do|{))/;
  private indentMatcher = /^(?<indent>\s*)/;
  private indentIsLargerMatcher = (indent: string) => new RegExp(`(?:^${indent}\\s+[^\s])|(?:^\s*$)`);
  private document: TextDocument;

  constructor(document: TextDocument) {
    this.document = document;
  }

  getTestRegions(): MinitestRegion[] {
    const lines = this.document.getText().split('\n');
    const regions: MinitestRegion[] = [];

    lines.forEach((lineContent, lineNo) => {
      const match = lineContent.match(this.testMatcher);
      if (match) {
        regions.push({
          range: new Range(new Position(lineNo, 0), new Position(lineNo, lineContent.length)),
          name: match.groups?.title || match.groups?.unitDef
        });
      }
    });

    return regions;
  }

  getContextRegions(): MinitestRegion[] {
    const lines = this.document.getText().split('\n');
    const regions: MinitestRegion[] = [];

    lines.forEach((lineContent, lineNo) => {
      const match = lineContent.match(this.contextMatcher);
      if (match) {
        regions.push({
          range: new Range(new Position(lineNo, 0), new Position(lineNo, lineContent.length)),
          name: match.groups?.className || match.groups?.contextName
        });
      }
    });

    regions.forEach(region => {
      region.forTestLines = this.getSubTests(region.range.start.line, lines);
    });

    return regions;
  }

  /**
   * Figure out the test lines within a context by matching test lines with a
   * greater indent than the contextLineNo.
   */
  private getSubTests(contextLineNo: number, textLines: string[]): number[] {
    const regions: number[] = [];
    const indent = textLines[contextLineNo].match(this.indentMatcher)?.groups?.indent;

    // eslint-disable-next-line eqeqeq
    if (indent == null) { return []; }

    textLines.slice(contextLineNo + 1).every((line, i) => {
      const indentIsLargerMatch = line.match(this.indentIsLargerMatcher(indent));
      if (!indentIsLargerMatch) { return false; } // Stop iterating

      const match = line.match(this.testMatcher);
      if (match) {
        regions.push(i + contextLineNo + 1);
      }

      return true; // Continue iterating
    });

    return regions;
  }
}

export default MinitestParser;
