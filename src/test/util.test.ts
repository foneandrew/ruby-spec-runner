import * as assert from 'assert';
import { remapPath } from '../util';
import { TestPathReplacementConfig } from '../types';

describe('Utils', () => {
	describe('remapPath', () => {
		describe('String matching', () => {
			it('Remaps paths', () => {
				const config: TestPathReplacementConfig[] = [
					{ from: 'path', to: 'new_path', regex: false, exclusive: true },
					{ from: 'file', to: 'new_file', regex: false, exclusive: true }
				];

				assert.strictEqual(remapPath('path/to/file.rb', config), 'new_path/to/file.rb');
			});

			it('Only uses the first matching rule', () => {
				const config: TestPathReplacementConfig[] = [
					{ from: 'paxth', to: 'new_path', regex: false, exclusive: true },
					{ from: 'file', to: 'new_file', regex: false, exclusive: true }
				];

				assert.strictEqual(remapPath('path/to/file.rb', config), 'path/to/new_file.rb');
			});

			describe('When exclusive is false', () => {
				it('Remaps paths using additional rules', () => {
					const config: TestPathReplacementConfig[] = [
						{ from: 'path', to: 'new_path', regex: false, exclusive: false },
						{ from: 'file', to: 'new_file', regex: false, exclusive: true },
						{ from: 'to', to: 'new_to', regex: false, exclusive: false }
					];

					assert.strictEqual(remapPath('path/to/file.rb', config), 'new_path/to/new_file.rb');
				});
			});
		});

		describe('Regex matching', () => {
			it('Remaps paths', () => {
				const config: TestPathReplacementConfig[] = [
					{ from: '^path', to: 'new_path', regex: true, exclusive: true },
					{ from: 'f..e', to: 'new_file', regex: true, exclusive: true }
				];

				assert.strictEqual(remapPath('path/to/file.rb', config), 'new_path/to/file.rb');
			});

			it('Only uses the first matching rule', () => {
				const config: TestPathReplacementConfig[] = [
					{ from: 'path$', to: 'new_path', regex: true, exclusive: true },
					{ from: 'f..e', to: 'new_file', regex: true, exclusive: true }
				];

				assert.strictEqual(remapPath('path/to/file.rb', config), 'path/to/new_file.rb');
			});

			describe('When exclusive is false', () => {
				it('Remaps paths using additional rules', () => {
					const config: TestPathReplacementConfig[] = [
						{ from: '^path', to: 'new_path', regex: true, exclusive: false },
						{ from: 'f..e', to: 'new_file', regex: true, exclusive: true },
						{ from: 'to', to: 'new_to', regex: true, exclusive: false }
					];

					assert.strictEqual(remapPath('path/to/file.rb', config), 'new_path/to/new_file.rb');
				});
			});

			describe('With group references', () => {
				it('Uses the group references in the replacement', () => {
					const config: TestPathReplacementConfig[] = [
						{ from: 'path/(\\w+)/file', to: 'one_$1_three', regex: true, exclusive: true }
					];

					assert.strictEqual(remapPath('path/to/file.rb', config), 'one_to_three.rb');
				});
			});
		});
	});
});
