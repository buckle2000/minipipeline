import * as fs from 'fs-extra'
import * as path from 'path'
import minimatch from 'minimatch'
import ManyKeysMap from 'many-keys-map'
import * as chokidar from 'chokidar'

export class Watcher
	constructor: (@root) ->
		@cbs = [] # Array of [pred, cb]
		@deps = new ManyKeysMap # Map of [cb, abspath] => [abspath, abspath, ...]
		@watcher = chokidar.watch @root,
			ignored: /(^|[\/\\])\../ # ignore dotfiles
			persistent: true
		@watcher.on 'all', (event, path_) => @changed path_, event

	when: (pattern, cb) ->
		if pattern instanceof Array
			for g in pattern
				@when g, cb
			return
		switch
			when typeof pattern is 'function' # path -> boolean
				pred = pattern
			when typeof pattern is 'symbol' # programmatic trigger; not triggered by file system
				pred = (s) -> s is pattern
			when typeof pattern is 'string' # glob
				pred = (s) -> minimatch s, pattern
			when pattern instanceof RegExp
				pred = (s) -> pattern.test s
			else
				throw new Error 'The first argument must be a string, a symbol, a regex, a function or an array of those'
		@cbs.push [pred, cb]

	changed: (path_, event) ->
		abspath_ = path.abspath path_
		# run cb
		for [pred, cb] in @cbs
			if pred path_
				deps = []
				that = # inner API
					depend: (dependency) -> deps.push path.abspath dependency
				await cb.call that, (path.relative '.', path_), event
				@deps.set([cb, abspath_], deps)
		# run dependant cb
		for [[cb, dependant], deps] from @deps
			if abspath_ in deps
				await @changed dependant, 'change' # most sensible choice among https://github.com/paulmillr/chokidar#methods--events


###
Utility functions
###

# Synchronous file io (string)
export read = (file, options={encoding:'utf8'}) ->
	await fs.readFile file, options

export write = (file, data, options) ->
	await fs.outputFile file, data, options


# base of filename
# https://www.gnu.org/software/emacs/manual/html_node/elisp/File-Name-Components.html
export base = (filename) ->	(path.parse filename).name

# extension of filename
export ext = (filename) -> (path.parse filename).ext
