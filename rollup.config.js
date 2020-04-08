import coffee from 'rollup-plugin-coffee-script';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import builtins from 'builtin-modules'
import config from './package.json'

export default {
	input: 'index.coffee',
	external: [...builtins, ...Object.keys(config.dependencies)],
	plugins: [
		nodeResolve({ extensions: ['.js', '.coffee'] }),
		coffee(),
		commonjs({ extensions: ['.js', '.coffee'] }),
	],
	output: {
		file: 'index.js',
		format: 'cjs'
	},
}