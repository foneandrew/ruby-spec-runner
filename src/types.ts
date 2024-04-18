/* eslint-disable @typescript-eslint/naming-convention */

export enum RspecExampleStatus {
  Passed = 'passed',
  Failed = 'failed',
  Pending = 'pending',
};

export interface RspecException {
  class: string;
  message: string;
  backtrace: string[];
}

export enum RubyDebugger {
  Rdbg = 'rdbg',
  RubyLSP = 'ruby_lsp'
}

export interface TestPathReplacementConfig {
  from: string;
  to: string;
  regex: boolean;
  exclusive: boolean;
}

interface RunRspecOrMinitestArgBase {
  name?: string;
  debugging?: boolean;
  forLines?: number[];
}

interface RunRspecOrMinitestArgForLine extends RunRspecOrMinitestArgBase {
  line: number;
  fileName: string;
}

interface RunRspecOrMinitestArgForCurrentFile extends RunRspecOrMinitestArgBase {
  line?: undefined;
  fileName?: undefined;
}

export type RunRspecOrMinitestArg = RunRspecOrMinitestArgForLine | RunRspecOrMinitestArgForCurrentFile;

type RspecExample = {
  id: string; // "./spec/unit/models/account_event_spec.rb[1:3:1]"
  description: string;
  full_description: string;
  status: RspecExampleStatus;
  file_path: string;
  line_number: number;
  run_time: number;
  pending_message?: string;
  exception?: RspecException;
};

type RspecSummary = {
  duration: number;
  example_count: number;
  failure_count: number;
  pending_count: number;
  errors_outside_of_examples_count: number;
};

export type RspecOutput = {
  version: string;
  seed: number;
  messages?: string[];
  examples: RspecExample[];
  summary: RspecSummary;
  summary_line: string;
};

export interface TestResultException {
  message: string;
  type?: string;
  line?: number;
  content?: string;
}

export interface TestResultLineResult {
  id: string; // Test id
  testRun: string;
  line: number;
  content: string;
  status: RspecExampleStatus;
  exception?: TestResultException;
  testName?: string;
  runTime?: string;
  pendingMessage?: string;
}

export interface TestResults {
  [key: string]: { // File path
    testRun: string;
    testRunPending: boolean;
    results: {
      [key: string]: TestResultLineResult; // Line number
    }
  }
}
