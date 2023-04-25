import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { SpecParser } from '../../../rspec';

// Test is run in the out folder, so have to bust out and back into src folder
const testFileLocation = '/../../../../src/test/examples/example_spec.rb';

const expectedCodeLensLocations = [
	0,
	1,
	5,
	9,
	13,
	15,
	16,
	19,
	20,
	25,
	29,
	32,
	33,
	37,
	40,
	41,
	42,
	46,
	50,
	51,
	52
];

describe('SpecParser', () => {
	it('Identifies all the places to put code lens prompts', async () => {
		// Add all the examples to test for in the test file referenced by testFileLocation
		const uri = vscode.Uri.file(
      path.join(__dirname + testFileLocation)
    );
    const document = await vscode.workspace.openTextDocument(uri);

		const specParser = new SpecParser(document);
		const codeLensLocations = specParser.getSpecRegions();
		const codeLensMatchedLines = codeLensLocations.map((location) => location.range.start.line);

		assert.deepEqual(expectedCodeLensLocations, codeLensMatchedLines);
	});
});
