import coffee from 'rollup-plugin-coffee-script';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import builtins from 'builtin-modules'
export default {
	input: 'index.coffee',
	external: builtins,
	plugins: [
		coffee(),
		nodeResolve({ extensions: ['.js', '.coffee'] }),
		commonjs({
			extensions: ['.js', '.coffee']
		})
	],
	output: {
		file: 'index.js',
		format: 'cjs'
	},
}