/* eslint-disable @typescript-eslint/naming-convention */
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { SpecRunner } from '../../../rspec';
import { SpecResultPresenter } from '../../../SpecResultPresenter';
import { SpecRunnerConfig, TerminalClear } from '../../../SpecRunnerConfig';
import { RubyDebugger } from '../../../types';

// Test is run in the out folder, so have to bust out and back into src folder
const testFileLocation = 'src/test/examples/example_spec.rb';
const buildRelativeTestFileLocation = `/../../../../${testFileLocation}`;

const mockInstance: <T>(...params: Parameters<typeof sinon.createStubInstance<T>>) => (sandbox: sinon.SinonSandbox, newOverrides?: Parameters<typeof sinon.createStubInstance<T>>[1]) => sinon.SinonStubbedInstance<T> = (classToMock, defaultMockValuesForMock) => {
  return (sandbox, newOverrides = {}) => {
    return sandbox.createStubInstance(classToMock, {...defaultMockValuesForMock, ...newOverrides});
  };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('SpecRunner', () => {
  const sandbox = sinon.createSandbox();
  const createTerminalSpy = sandbox.stub(vscode.window, 'createTerminal');
  const executeCommandSpy = sandbox.stub(vscode.commands, 'executeCommand');
  const startDebuggingSpy = sandbox.stub(vscode.debug, 'startDebugging');
  const createFakePresenter = mockInstance(SpecResultPresenter, {
    setTestResults: sandbox.stub(),
  });
  const defaultConfig = {
    rspecCommand: 'bundle exec rspec',
    changeDirectoryToWorkspaceRoot: true,
    projectPath: 'current-workspace-root',
    rspecFormat: 'p',
    saveBeforeRunning: true,
    clearTerminalOnTestRun: TerminalClear.Clear,
    rspecDecorateEditorWithResults: true,
    rspecEnv: {},
    rubyDebugger: RubyDebugger.Rdbg
  } as SpecRunnerConfig;
  const sendTextFake = sandbox.fake();
  const showTerminalFake = sandbox.fake();
  const terminalFake: vscode.Terminal = {
    sendText: sendTextFake,
    name: 'SpecRunner',
    processId: Promise.resolve(42),
    creationOptions: {},
    exitStatus: undefined,
    state: { isInteractedWith: false },
    show: showTerminalFake,
    hide: () => {},
    dispose: () => {}
  };

  beforeEach(() => {
    createTerminalSpy.returns(terminalFake);
  });

  afterEach(() => {
    sandbox.resetHistory();
    // sandbox.restore();
  });

  describe('With default configuration', () => {
    it('Runs rspec for an entire file', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const uri = vscode.Uri.file(
        path.join(__dirname + buildRelativeTestFileLocation)
      );
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner(defaultConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec();
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });

    it('Runs rspec for a line in a file', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner(defaultConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('With rspecEnv set', () => {
    it('Includes the the env vars', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, rspecEnv: { TEST: true }} as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && TEST=true bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('With changeDirectoryToWorkspaceRoot disabled', () => {
    it('Omits the cd command', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, changeDirectoryToWorkspaceRoot: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('When rspecFormat is documentation', () => {
    it('Runs the rspec command with the documentation format option', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, rspecFormat: 'd' } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && bundle exec rspec -f d -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('With saveBeforeRunning disabled', () => {
    it('Does not save the file before running rspec', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, saveBeforeRunning: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(!executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('When clearTerminalOnTestRun is not set to clear', () => {
    it('Does not clear the terminal before running rspec', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, clearTerminalOnTestRun: TerminalClear.None } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(!executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('When rspecDecorateEditorWithResults is false', () => {
    it('Does not include the json output option', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, rspecDecorateEditorWithResults: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(createTerminalSpy.calledWith('SpecRunner' as any));
      assert(showTerminalFake.called);
      assert(executeCommandSpy.calledWith('workbench.action.terminal.clear'));
      assert(sendTextFake.called);
      assert(sendTextFake.getCalls()[0].args[0].match(new RegExp(`^cd 'current-workspace-root' && bundle exec rspec -f p '.*${testFileLocation}:2'$`)));
      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });

  describe('When debugging via rdbg', () => {
    it('Debugs rspec for an entire file', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const uri = vscode.Uri.file(
        path.join(__dirname + buildRelativeTestFileLocation)
      );
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner(defaultConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ debugging: true });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(startDebuggingSpy.called);

      const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
      assert.equal(debugConfig.type, 'rdbg');
      assert.equal(debugConfig.name, 'SpecRdbgDebugger');
      assert.equal(debugConfig.request, 'launch');
      assert.equal(debugConfig.command, 'bundle exec rspec');
      assert(debugConfig.script.endsWith(testFileLocation + "'"));
      assert.deepEqual(debugConfig.env, {});
      assert.deepEqual(debugConfig.args, [
        '-f p',
        "-f j --out '/tmp/test-output.json'"
      ]);
      assert.equal(debugConfig.askParameters, false);
      assert.equal(debugConfig.useTerminal, true);
      assert.equal(debugConfig.cwd, 'current-workspace-root');

      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });

    it('Debugs rspec for a line in a file', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner(defaultConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation, debugging: true });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(startDebuggingSpy.called);

      const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
      assert.equal(debugConfig.type, 'rdbg');
      assert.equal(debugConfig.name, 'SpecRdbgDebugger');
      assert.equal(debugConfig.request, 'launch');
      assert.equal(debugConfig.command, 'bundle exec rspec');
      assert(debugConfig.script.endsWith(`${testFileLocation}:2'`));
      assert.deepEqual(debugConfig.env, {});
      assert.deepEqual(debugConfig.args, [
        '-f p',
        "-f j --out '/tmp/test-output.json'"
      ]);
      assert.equal(debugConfig.askParameters, false);
      assert.equal(debugConfig.useTerminal, true);
      assert.equal(debugConfig.cwd, 'current-workspace-root');

      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });

    describe('With rspecEnv set', () => {
      it('Includes the the env vars', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const uri = vscode.Uri.file(
          path.join(__dirname + buildRelativeTestFileLocation)
        );
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rspecEnv: { TEST: true }} as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'rdbg');
        assert.equal(debugConfig.name, 'SpecRdbgDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert.equal(debugConfig.command, 'bundle exec rspec');
        assert(debugConfig.script.endsWith(testFileLocation + "'"));
        assert.deepEqual(debugConfig.env, { TEST: true });
        assert.deepEqual(debugConfig.args, [
          '-f p',
          "-f j --out '/tmp/test-output.json'"
        ]);
        assert.equal(debugConfig.askParameters, false);
        assert.equal(debugConfig.useTerminal, true);
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });

    describe('With changeDirectoryToWorkspaceRoot disabled', () => {
      it('Omits the cd command', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, changeDirectoryToWorkspaceRoot: false} as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'rdbg');
        assert.equal(debugConfig.name, 'SpecRdbgDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert.equal(debugConfig.command, 'bundle exec rspec');
        assert(debugConfig.script.endsWith(testFileLocation + "'"));
        assert.deepEqual(debugConfig.env, {});
        assert.deepEqual(debugConfig.args, [
          '-f p',
          "-f j --out '/tmp/test-output.json'"
        ]);
        assert.equal(debugConfig.askParameters, false);
        assert.equal(debugConfig.useTerminal, true);
        assert.equal(debugConfig.cwd, undefined);

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });

    describe('When rspecFormat is documentation', () => {
      it('Runs the rspec command with the documentation format option', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rspecFormat: 'd' } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'rdbg');
        assert.equal(debugConfig.name, 'SpecRdbgDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert.equal(debugConfig.command, 'bundle exec rspec');
        assert(debugConfig.script.endsWith(testFileLocation + "'"));
        assert.deepEqual(debugConfig.env, {});
        assert.deepEqual(debugConfig.args, [
          '-f d',
          "-f j --out '/tmp/test-output.json'"
        ]);
        assert.equal(debugConfig.askParameters, false);
        assert.equal(debugConfig.useTerminal, true);
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });

    describe('With saveBeforeRunning disabled', () => {
      it('Does not save the file before running rspec', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, saveBeforeRunning: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(!executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'rdbg');
        assert.equal(debugConfig.name, 'SpecRdbgDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert.equal(debugConfig.command, 'bundle exec rspec');
        assert(debugConfig.script.endsWith(testFileLocation + "'"));
        assert.deepEqual(debugConfig.env, {});
        assert.deepEqual(debugConfig.args, [
          '-f p',
          "-f j --out '/tmp/test-output.json'"
        ]);
        assert.equal(debugConfig.askParameters, false);
        assert.equal(debugConfig.useTerminal, true);
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });


  describe('When rspecDecorateEditorWithResults is false', () => {
    it('Does not include the json output option', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      await vscode.workspace.openTextDocument(uri);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, rspecDecorateEditorWithResults: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'rdbg');
        assert.equal(debugConfig.name, 'SpecRdbgDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert.equal(debugConfig.command, 'bundle exec rspec');
        assert(debugConfig.script.endsWith(testFileLocation + "'"));
        assert.deepEqual(debugConfig.env, {});
        assert.deepEqual(debugConfig.args, [
          '-f p',
        ]);
        assert.equal(debugConfig.askParameters, false);
        assert.equal(debugConfig.useTerminal, true);
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });
  });
  });

  describe('When debugging via ruby LSP', () => {
    it('Debugs rspec for an entire file', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const uri = vscode.Uri.file(
        path.join(__dirname + buildRelativeTestFileLocation)
      );
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ debugging: true });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(startDebuggingSpy.called);

      const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
      assert.equal(debugConfig.type, 'ruby_lsp');
      assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
      assert.equal(debugConfig.request, 'launch');
      assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}'$`)));
      assert.deepEqual(debugConfig.env, {});
      assert.equal(debugConfig.cwd, 'current-workspace-root');

      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });

    it('Debugs rspec for a line in a file', async () => {
      // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
      const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
      const uri = vscode.Uri.file(fileLocation);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      const presenterFake = createFakePresenter(sandbox);

      const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
      await specRunner.runSpec({ line: 2, fileName: fileLocation, debugging: true });
      await sleep(500);

      assert(executeCommandSpy.calledWith('workbench.action.files.save'));
      assert(startDebuggingSpy.called);

      const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
      assert.equal(debugConfig.type, 'ruby_lsp');
      assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
      assert.equal(debugConfig.request, 'launch');
      assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}:2'$`)));
      assert.deepEqual(debugConfig.env, {});
      assert.equal(debugConfig.cwd, 'current-workspace-root');

      assert(presenterFake.setPending.called);
      assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
    });

    describe('With rspecEnv set', () => {
      it('Includes the the env vars', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const uri = vscode.Uri.file(
          path.join(__dirname + buildRelativeTestFileLocation)
        );
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP, rspecEnv: { TEST: true } } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'ruby_lsp');
        assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}'$`)));
        assert.deepEqual(debugConfig.env, { TEST: true });
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });

    describe('With changeDirectoryToWorkspaceRoot disabled', () => {
      it('Omits the cd command', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP, changeDirectoryToWorkspaceRoot: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'ruby_lsp');
        assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}'$`)));
        assert.deepEqual(debugConfig.env, {});
        assert.equal(debugConfig.cwd, undefined);

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });

    describe('When rspecFormat is documentation', () => {
      it('Runs the rspec command with the documentation format option', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP, rspecFormat: 'd' } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'ruby_lsp');
        assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f d -f j --out '/tmp/test-output.json' '.*${testFileLocation}'$`)));
        assert.deepEqual(debugConfig.env, {});
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });

    describe('With saveBeforeRunning disabled', () => {
      it('Does not save the file before running rspec', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP, saveBeforeRunning: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(!executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'ruby_lsp');
        assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f p -f j --out '/tmp/test-output.json' '.*${testFileLocation}'$`)));
        assert.deepEqual(debugConfig.env, {});
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
        assert(presenterFake.setPending.getCalls()[0].args[0].endsWith(testFileLocation));
      });
    });


    describe('When rspecDecorateEditorWithResults is false', () => {
      it('Does not include the json output option', async () => {
        // Add all the examples to test for in the test file referenced by buildRelativeTestFileLocation
        const fileLocation = path.join(__dirname + buildRelativeTestFileLocation);
        const uri = vscode.Uri.file(fileLocation);
        await vscode.workspace.openTextDocument(uri);
        const presenterFake = createFakePresenter(sandbox);

        const specRunner = new SpecRunner({ ...defaultConfig, rubyDebugger: RubyDebugger.RubyLSP, rspecDecorateEditorWithResults: false } as SpecRunnerConfig, '/tmp/test-output.json', presenterFake);
        await specRunner.runSpec({ debugging: true });
        await sleep(500);

        assert(executeCommandSpy.calledWith('workbench.action.files.save'));
        assert(startDebuggingSpy.called);

        const debugConfig = startDebuggingSpy.getCalls()[0].args[1] as {[key: string]: any};
        assert.equal(debugConfig.type, 'ruby_lsp');
        assert.equal(debugConfig.name, 'SpecRubyLSPDebugger');
        assert.equal(debugConfig.request, 'launch');
        assert(debugConfig.program.match(new RegExp(`bundle exec rspec -f p '.*${testFileLocation}'$`)));
        assert.deepEqual(debugConfig.env, {});
        assert.equal(debugConfig.cwd, 'current-workspace-root');

        assert(presenterFake.setPending.called);
      });
    });
  });
});
