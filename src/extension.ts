import * as vscode from 'vscode';
import { SpecRunner } from './SpecRunner';
import { CodeLensCommandArg, SpecRunnerCodeLensProvider } from './SpecRunnerCodeLensProvider';
import { SpecRunnerConfig } from './SpecRunnerConfig';
import { SpecRunnerButton } from './SpecRunnerButton';

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "spec-runner" is now active!');

	const config = new SpecRunnerConfig();
	const specRunner = new SpecRunner(config);

	const runSpec = vscode.commands.registerCommand(
    'extension.runSpec',
    async (...args) => specRunner.runSpec(...args)
  );

	const codeLensProvider = new SpecRunnerCodeLensProvider();

	const docSelectors: vscode.DocumentFilter[] = [
		{ pattern: '**/*_spec.rb' },
	];
	const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(docSelectors, codeLensProvider);

	const specRunnerButton = new SpecRunnerButton(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1));

	context.subscriptions.push(runSpec);
	context.subscriptions.push(codeLensProviderDisposable);
	context.subscriptions.push(specRunnerButton.button);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => { specRunnerButton.update(editor); }));

	specRunnerButton.update();
}

// This method is called when the extension is deactivated
export function deactivate() {}
