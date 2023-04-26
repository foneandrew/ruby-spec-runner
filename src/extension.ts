import * as vscode from 'vscode';
import { SpecRunnerConfig } from './SpecRunnerConfig';
import SpecResultInterpreter from './rspec/SpecResultInterpreter';
import SpecResultPresenter from './SpecResultPresenter';
import { MinitestRunner, MinitestRunnerCodeLensProvider, MinitestRunnerButton, MinitestResultInterpreter } from './minitest';
import { SpecRunner, SpecRunnerCodeLensProvider, FailedSpecRunnerButton, SpecRunnerButton } from './rspec';
import { RunRspecOrMinitestArg } from './types';

const buildFileRunnerHandler = (minitestRunner: MinitestRunner, specRunner: SpecRunner, debugging: boolean) => async (args: any) => {
  const filePath = vscode.window.activeTextEditor?.document.fileName;
  if (!filePath) {
    console.error('SpecRunner: Unable to run spec / minitest file as no editor is open.');
    vscode.window.showErrorMessage('SpecRunner: Unable to run spec / minitest file. It appears that no editor is open.');
    return;
  }

  if (filePath.match(/_test\.rb$/)) {
    if (debugging) return; // Minitest debugging does not seem to work :(
    minitestRunner.runTest({ ...args, debugging });
  } else {
    specRunner.runSpec({ ...args, debugging });
  }
};

const buildLineRunnerHandler = (minitestRunner: MinitestRunner, specRunner: SpecRunner, debugging: boolean) => async () => {
  const filePath = vscode.window.activeTextEditor?.document.fileName;
  const line = vscode.window.activeTextEditor?.selection.active.line;
  // eslint-disable-next-line eqeqeq
  if (!filePath || line == null) {
    console.error('SpecRunner: Unable to run spec / minitest file as no editor is open.');
    vscode.window.showErrorMessage('SpecRunner: Unable to run spec / minitest file. It appears that no editor is open.');
    return;
  }

  const args: RunRspecOrMinitestArg = {
    fileName: filePath,
    line: line + 1,
    debugging
  };

  if (filePath.match(/_test\.rb$/)) {
    if (debugging) return; // Minitest debugging does not seem to work :(
    minitestRunner.runTest(args);
  } else {
    specRunner.runSpec(args);
  }
};

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "spec-runner" is now active!');

  const config = new SpecRunnerConfig();

  const resultPresenter = new SpecResultPresenter(context, config);
  const resultInterpreter = new SpecResultInterpreter(config, context, resultPresenter);
  const minitestInterpreter = new MinitestResultInterpreter(config, context, resultPresenter);
  const specRunner = new SpecRunner(config, resultInterpreter.outputFilePath, resultPresenter);
  const minitestRunner = new MinitestRunner(config, minitestInterpreter.outputFilePath, resultPresenter);

  const runRspecOrMinitestFile = vscode.commands.registerCommand(
    'ruby-spec-runner.runRspecOrMinitestFile',
    buildFileRunnerHandler(minitestRunner, specRunner, false)
  );
  const debugRspecFile = vscode.commands.registerCommand(
    'ruby-spec-runner.debugRspecFile',
    buildFileRunnerHandler(minitestRunner, specRunner, true)
  );

  const runRspecOrMinitestLine = vscode.commands.registerCommand(
    'ruby-spec-runner.runRspecOrMinitestLine',
    buildLineRunnerHandler(minitestRunner, specRunner, false)
  );
  const debugRspecLine = vscode.commands.registerCommand(
    'ruby-spec-runner.debugRspecLine',
    buildLineRunnerHandler(minitestRunner, specRunner, true)
  );
  const runFailedExample = vscode.commands.registerCommand(
    'ruby-spec-runner.runFailedExamples',
    async () => specRunner.runFailedExample()
  );
  const clearResults = vscode.commands.registerCommand(
    'ruby-spec-runner.clearResults',
    async () => resultPresenter.clearTestResults()
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
  context.subscriptions.push(debugRspecFile);
  context.subscriptions.push(runRspecOrMinitestLine);
  context.subscriptions.push(debugRspecLine);
  context.subscriptions.push(clearResults);
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
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((editor) => {
    resultPresenter.update();
  }));


  failedSpecRunnerButton.update();
  specRunnerButton.update();
  minitestRunnerButton.update();
}

// This method is called when the extension is deactivated
export function deactivate() {}
