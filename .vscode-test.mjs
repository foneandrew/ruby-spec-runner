import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	mocha: {
		ui: 'bdd',
		color: true,
		timeout: 20000
	}
});
