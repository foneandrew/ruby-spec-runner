import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { MinitestParser } from '../../../minitest';

// Test is run in the out folder, so have to bust out and back into src folder
const testFileLocation = '/../../../../src/test/examples/example_test.rb';

const expectedTestCodeLensLocations = [
	6,
	10,
	14,
	18,
	23,
	28,
	33,
	37,
	44,
	49
];

const expectedContextCodeLensLocations = [
	[1, [
		6,
		10,
		14,
		18,
		23,
		28,
		33,
		37
	]],
	[22, [23, 28, 33, 37]],
	[27, [28]],
	[43, [44, 49]],
	[48, [49]]
];

describe('MinitestParser', () => {
	it('Identifies all the places to put test code lens prompts', async () => {
		// Add all the examples to test for in the test file referenced by testFileLocation
		const uri = vscode.Uri.file(
      path.join(__dirname + testFileLocation)
    );
    const document = await vscode.workspace.openTextDocument(uri);

		const testParser = new MinitestParser(document);
		const codeLensLocations = testParser.getTestRegions();
		const codeLensMatchedLines = codeLensLocations.map((location) => location.range.start.line);

		assert.deepEqual(expectedTestCodeLensLocations, codeLensMatchedLines);
	});

	it('Identifies all the places to put context code lens prompts', async () => {
		// Add all the examples to test for in the test file referenced by testFileLocation
		const uri = vscode.Uri.file(
      path.join(__dirname + testFileLocation)
    );
    const document = await vscode.workspace.openTextDocument(uri);

		const testParser = new MinitestParser(document);
		const codeLensLocations = testParser.getContextRegions();
		const codeLensMatchedLines = codeLensLocations.map((location) => [location.range.start.line, location.forTestLines]);

		assert.deepEqual(expectedContextCodeLensLocations, codeLensMatchedLines);
	});
});
