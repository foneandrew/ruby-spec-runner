# Ruby spec runner

Run ruby rspec specs and minitest tests from vscode.

This extension is very heavily inspired by the [vscode-jest-runner](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner) and [ruby-test-runner](https://marketplace.visualstudio.com/items?itemName=MateuszDrewniak.ruby-test-runner) extensions. ruby-test-runner didn't quite meet my needs to I decided to try and build my own version. `¯\_(ツ)_/¯`

## Features

![screenshot of an example spec](images/screenshot.png)

- Run prompts next to contexts and examples in rspec allows you to run single test or group of tests within the test file
- A "run spec" button in the status bar to quickly run the test file
- `Ctrl+Alt+/` (mac: `Ctrl+Cmd+/`) will also run tests for the current file
- Tests are run inside a terminal in vscode
- Decorates the editor with the test results (hover over a marked line for more info)
- Supports Rspec
- Also has some limited support for minitest -- see [Known Issues](#known-issues)

## Extension Commands

- **Ruby Spec Runner: Run this spec/minitest line** (`ruby-spec-runner.runRspecOrMinitestLine`): Run current line in minitest/rspec. Shortcut: `Ctrl+Alt+/` (mac: `Ctrl+Cmd+/`)
- **Ruby Spec Runner: Debug this spec/minitest line** (`ruby-spec-runner.debugRspecLine`): Debug current line in rspec with your configured debugger. See [Debugging a test](#debugging-a-test) for more info. Shortcut: `Ctrl+K Ctrl+Alt+/` (mac: `Cmd+K Ctrl+Cmd+/`)
- **Ruby Spec Runner: Run this spec/minitest file** (`ruby-spec-runner.runRspecOrMinitestFile`): Run whole current minitest/rspec file. Shortcut: `Ctrl+Shift+Alt+/` (mac: `Ctrl+Shift+Cmd+/`)
- **Ruby Spec Runner: Debug this spec/minitest file** (`ruby-spec-runner.debugRspecFile`): Debug whole current rspec file with your configured debugger. See [Debugging a test](#debugging-a-test) for more info. Shortcut: `Ctrl+K Ctrl+Shift+Alt+/` (mac: `Cmd+K Ctrl+Shift+Cmd+/`)
- **Ruby Spec Runner: Clear test results for this file** (`ruby-spec-runner.clearResults`): Clear test results for the current file (sometimes the extension can get confused if edits are made while tests are running and this command can be used to clear up mistakes)
- **Ruby Spec Runner: Re-run failed examples** (`ruby-spec-runner.runFailedExamples`): Re-run failed rspec tests

## Debugging a test

The following ruby debugging extensions are supported for rspec.

- **Rdbg:** The [ruby debug vscode extension](https://marketplace.visualstudio.com/items?itemName=KoichiSasada.vscode-rdbg)
- **RubyLSP:** The [ruby-lsp vscode extension](https://marketplace.visualstudio.com/items?itemName=Shopify.ruby-lsp)",

Make sure one of these is installed (and any required setup has been done). Then configure the one you are using via the `rubyDebugger` setting for this extension.

I have not had any luck getting minitest working with these debuggers. Help is welcome.

## Extension Settings

This extension contributes the following settings:

- `ruby-spec-runner.rspecCommand`: Override the rspec command
- `ruby-spec-runner.rspecEnv`: Pass env vars to the rspec command
- `ruby-spec-runner.rspecDebugEnv`: Additional env vars to the rspec command when debugging. Merges into and overrides env vars set via "rspecEnv"
- `ruby-spec-runner.minitestCommand`: Override the minitest command
- `ruby-spec-runner.minitestEnv`: Pass env vars to the minitest command
- `ruby-spec-runner.changeDirectoryToWorkspaceRoot`: When true the test command will cd to workspace root first
- `ruby-spec-runner.projectPath`: Override the root project path
- `ruby-spec-runner.rspecFormat`: Configure rspec's terminal output format
- `ruby-spec-runner.saveBeforeRunning`: When true the test file is saved before it is run
- `ruby-spec-runner.rspecRunButton`: Show a run button in the status bar
- `ruby-spec-runner.rspecDebugButton`: Show a debug button in the status bar
- `ruby-spec-runner.rspecRunAllFailedButton`: Show a button to re-run failed tests in the status bar (disabled by default)
- `ruby-spec-runner.minitestRunButton`: Show a run button in the status bar
- `ruby-spec-runner.rspecCodeLensPrompts`: Show prompts in the editor to run an rspec test
- `ruby-spec-runner.rspecCodeLensDebugPrompts`: Show prompts in the editor to debug an rspec test
- `ruby-spec-runner.minitestCodeLensPrompts`: Show prompts in the editor to run a minitest test
- `ruby-spec-runner.rspecDecorateEditorWithResults`: Show the results of rspec test runs in the editor
- `ruby-spec-runner.rspecDecorateEditorWithStaleResults`: Show stale results of rspec test runs in the editor
- `ruby-spec-runner.minitestDecorateEditorWithResults`: Show the results of minitest runs in the editor
- `ruby-spec-runner.minitestDecorateEditorWithStaleResults`: Show stale results of minitest runs in the editor
- `ruby-spec-runner.windowsTerminalType`: For windows users that are using bash instead of powershell
- `ruby-spec-runner.overviewHighlightPosition`: Configure the position of result highlights in the overview ruler
- `ruby-spec-runner.clearTerminalOnTestRun`: Clear the terminal before running a test command
- `ruby-spec-runner.rubyDebugger`: Select which debugging extension to use
- `ruby-spec-runner.rewriteTestPaths`: Change the test path that is run. See [Rewriting the test file path](#rewriting-the-test-file-path) for more info.

### Rewriting the test file path

If you're running tests inside a docker container you may need to rewrite the test file path. You can do this with the `ruby-spec-runner.rewriteTestPaths` setting. At the moment vscode will only let you edit it via the json file.

Each entry takes 2-4 fields:

- `from` This is the string to match
- `to` This is the string to replace the match with. When using a regex can reference group constructs like "$1" [(see mdn docs for capabilities)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement)
- `regex` _(Optional, default: false)_ treat "from" as a regex. Regexs are applied with global flag. `\` characters will need to be escaped.
- `exclusive` _(Optional, default: true)_ if this entry produces a match, stop looking for other matches

#### Simple example

```json
{
  "ruby-spec-runner.rewriteTestPaths": [
    {
      "from": "/Users/me/dev/my_project",
      "to": "/app"
    },
    {
      "from": "/Users/me/dev/my_other_project",
      "to": ""
    },
  ],
}
```

#### Complex example

For more complex re-mappings regex can use regex, regex groups, and combine entries together.

```json
{
  // For path "/Users/me/dev/my_project/spec/models/model_spec.rb"
  "ruby-spec-runner.rewriteTestPaths": [
    {
      "from": "me/",
      "to": "someone/",
      "exclusive": false
      // Result is "/Users/someone/dev/my_project/spec/models/model_spec.rb"
    },
    {
      "from": "^.*/my_project",
      "to": "/app",
      "regex": true
      // Result is "/app/spec/models/model_spec.rb"
    },
    {
      "from": "^/Users/(\\w+)/dev/",
      "to": "devs/$1_home/",
      "regex": true
      // Result is "devs/someone_home/my_project/spec/models/model_spec.rb"
      // (as "me" is replaced with "someone" by the first entry )
    },
  ],
}
```

## Known Issues

- I don't have access to a windows machine so I can only hope that it works there.
- Minitest support is janky as the default output isn't ideal for parsing, and there is limited support for running tests via line numbers. We are relying heavily on regex shenanigans to match results with lines in the test file.
  - The extension can get confused when an error occurs outside of the test example (setup blocks, helper methods etc). When this happens the test could be marked as passing when it actually failed.
  - Editing a test file while tests are running can result in editor decorations appearing in the incorrect location
  - Running all tests in a context can be a bit hit and miss.
  - As minitest does not support running tests for line numbers outside of a test example, the "Run this spec/minitest line" command will search for and run the test or context found at or above the currently selected line
  - Debugging minitest files is currently unsupported cause I can't get it working :(

## Release Notes

... Are found in the `Changelog` page (under "Resources").
