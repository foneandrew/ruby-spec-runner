import * as vscode from 'vscode';
import { SpecRunner } from './SpecRunner';
import { SpecRunnerCodeLensProvider } from './SpecRunnerCodeLensProvider';
import { SpecRunnerConfig } from './SpecRunnerConfig';
import { SpecRunnerButton } from './SpecRunnerButton';
import { FailedSpecRunnerButton } from './FailedSpecRunnerButton';
import SpecResultInterpreter from './SpecResultInterpreter';
import SpecResultPresenter from './SpecResultPresenter';
import MinitestRunner from './MinitestRunner';
import MinitestRunnerCodeLensProvider from './MinitestRunnerCodeLensProvider';
import MinitestRunnerButton from './MinitestRunnerButton';

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "spec-runner" is now active!');

  const config = new SpecRunnerConfig();
  const resultPresenter = new SpecResultPresenter(context, config);
  const resultInterpreter = new SpecResultInterpreter(config, context, resultPresenter);
  const specRunner = new SpecRunner(config, resultInterpreter.outputFilePath, resultPresenter);
  const minitestRunner = new MinitestRunner(config, resultPresenter);

  const runRspecOrMinitestFile = vscode.commands.registerCommand(
    'extension.runRspecOrMinitestFile',
    async (...args) => {
      const filePath = vscode.window.activeTextEditor?.document.fileName;
      if (!filePath) {
        console.error('SpecRunner: Unable to run spec / minitest file as no editor is open.');
        vscode.window.showErrorMessage('SpecRunner: Unable to run spec / minitest file. It appears that no editor is open.');
        return;
      }

      if (filePath.match(/_test\.rb$/)) {
        minitestRunner.runTest(...args);
      } else {
        specRunner.runSpec(...args);
      }
    }
  );

  const runSpec = vscode.commands.registerCommand(
    'extension.runSpec',
    async (...args) => specRunner.runSpec(...args)
  );
  const runFailedExample = vscode.commands.registerCommand(
    'extension.runFailedExamples',
    async () => specRunner.runFailedExample()
  );
  const runMinitest = vscode.commands.registerCommand(
    'extension.runMinitest',
    async (...args) => minitestRunner.runTest(...args)
  );

  const specCodeLensProvider = new SpecRunnerCodeLensProvider(config);
  const minitestCodeLensProvider = new MinitestRunnerCodeLensProvider(config);

  const specDocSelectors: vscode.DocumentFilter[] = [
    { language: 'ruby', pattern: '**/*_spec.rb' },
  ];
  const specCodeLensProviderDisposable = vscode.languages.registerCodeLensProvider(specDocSelectors, specCodeLensProvider);
  const minitestDocSelectors: vscode.DocumentFilter[] = [
    { language: 'ruby', pattern: '**/*_test.rb' },
  ];
  const minitestCodeLensProviderDisposable = vscode.languages.registerCodeLensProvider(minitestDocSelectors, minitestCodeLensProvider);

  const failedSpecRunnerButton = new FailedSpecRunnerButton(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1), config);
  const specRunnerButton = new SpecRunnerButton(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2), config);
  const minitestRunnerButton = new MinitestRunnerButton(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2), config);

  context.subscriptions.push(runRspecOrMinitestFile);
  context.subscriptions.push(runSpec);
  context.subscriptions.push(runMinitest);
  context.subscriptions.push(runFailedExample);
  context.subscriptions.push(specCodeLensProviderDisposable);
  context.subscriptions.push(minitestCodeLensProviderDisposable);
  context.subscriptions.push(specRunnerButton.button);
  context.subscriptions.push(failedSpecRunnerButton.button);
  context.subscriptions.push(minitestRunnerButton.button);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
    failedSpecRunnerButton.update(editor);
    specRunnerButton.update(editor);
    minitestRunnerButton.update(editor);
    resultPresenter.update();
  }));

  failedSpecRunnerButton.update();
  specRunnerButton.update();
  minitestRunnerButton.update();
}

// This method is called when the extension is deactivated
export function deactivate() {}
