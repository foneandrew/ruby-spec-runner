import * as vscode from 'vscode';
import { SpecRunner } from './SpecRunner';
import { SpecRunnerCodeLensProvider } from './SpecRunnerCodeLensProvider';
import { SpecRunnerConfig } from './SpecRunnerConfig';
import { SpecRunnerButton } from './SpecRunnerButton';
import SpecResultInterpreter from './SpecResultInterpreter';
import SpecResultPresenter from './SpecResultPresenter';

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "spec-runner" is now active!');

	const config = new SpecRunnerConfig();
	const resultPresenter = new SpecResultPresenter(context);
	const resultInterpreter = new SpecResultInterpreter(config, context, resultPresenter);
	const specRunner = new SpecRunner(config, resultInterpreter.outputFilePath, resultPresenter);

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
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => { specRunnerButton.update(editor); resultPresenter.update(); }));

	specRunnerButton.update();
}

// This method is called when the extension is deactivated
export function deactivate() {}
