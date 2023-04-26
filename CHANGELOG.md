# Change Log

All notable changes to the "spec-runner" extension will be documented in this file.

## [3.6.0]

- Add support for debugging via rdbg or ruby-lsp vscode extensions
  - Only working for rspec unfortunately
- Add configuration for env vars `ruby-spec-runner.rspecEnv`. Having env vars separate from the command allows us to pass them through to rbdg
- Add configuration for showing debug code lens prompts in editor for rspec files `ruby-spec-runner.rspecCodeLensDebugPrompts`
- Add configuration for which ruby debugger to use `ruby-spec-runner.rubyDebugger`
- Add configuration for showing a debug button in the status bar `ruby-spec-runner.rspecDebugButton`
- Add command for debugging rspec file `ruby-spec-runner.debugRspecFile`
- Add command for debugging current rspec line `ruby-spec-runner.debugRspecLine`

## [3.5.1]

- Add missing code lens support for `Rspec.describe Class::Name, "string" do` syntax (thanks [steveclarke](https://github.com/steveclarke))

## [3.5.0]

- Add support for capybara's `scenario`, `specify`, and `feature` (thanks [steveclarke](https://github.com/steveclarke))

## [3.4.0]

- Codelens support for running more types of examples
- End of line comments shouldn't break codelens support

## [3.3.0]

- Improvements for rspec:
  - Include test run time in the hover messages for test results
  - Attempt to put test results in the right place if the file was edited between starting the test and the test finishing

## [3.2.1]

- Acknowledge that a pending test could be pending (previously the hover message only mentioned that the test was skipped)

## [3.2.0]

- Add configuration for clearing the terminal before running test commands

## [3.1.2]

- Fixed issue with multiple results (current and stale results) showing up for a single line

## [3.1.1]

- Fixed Run Spec / Run Minitest buttons that were relying on the commands removed in the previous release (－‸ლ)

## [3.1.0]

- Restrict keyboard shortcuts to ruby files only
- Add code lens support for more rspec line types

## [3.0.0]

- **BREAKING** Removed `ruby-spec-runner.runSpec` & `ruby-spec-runner.runMinitest` commands as they were superfluous.
- **BREAKING** Changed keyboard shortcut for running entire spec (now uses shift)
- Add new command for running just the current line (uses the old shortcut)
- Add code lens support for more rspec line types

## [2.2.1]

- When a file is changed the extension will try and be a bit smarter about how it figures out where the decorated lines have moved to. It's still using a dumb solution and will sometimes get it wrong, but hopefully less wrong than before.

## [2.2.0]

- Add option to configure the position of results highlighting in the overview ruler

## [2.1.0]

- Clarify the confusing wording for pending and skipped tests in the editor decorations

## [2.0.0]

- **BREAKING** Rename extension commands. Any customised keyboard shortcuts for this extension will no longer work
- Add command to clear test results
- Add configuration to hide stale results

## [1.1.7]

- Bug fix (was unable to reopen SpecRunner and MinitestRunner terminals if they were closed)

## [1.1.6]

- Bug fix (was sometimes accessing property of undefined (－‸ლ))

## [1.1.5]

- Code lens support for rspec describe blocks with modules (eg. "describe MyModule::MyClass")

## [1.1.4]

- Minitest interpreter is slightly better at figuring out which test failed when the failure occurred in a setup block

## [1.1.3]

- Minitest interpreter is slightly better at figuring out which test failed for single test runs

## [1.1.2]

- Editor decorations for test results are better at staying up to date with changes

## [1.1.1]

- Better detection for when minitest fails to finish

## [1.1.0]

- Support minitest error results

## [1.0.0]

- Initial release
