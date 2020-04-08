import * as fs from 'fs'
import * as path from 'path'
import minimatch from 'minimatch'
import ManyKeysMap from 'many-keys-map'


export class Watcher
	constructor: (@root) ->
		@cbs = [] # Array of [pred, cb]
		@deps = new ManyKeysMap # Map of [cb, path] => [path, path, ...] # TODO fix this
		@watcher = chokidar.watch @root,
			ignored: /(^|[\/\\])\../ # ignore dotfiles
			persistent: true
		@watcher.on 'all', (event, path) => @changed path, event

	when: (pattern, cb) ->
		unimplemented = -> new Error 'The first argument must be a string, a symbol, a regex, a function or an array of those'
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
				throw unimplemented()
		@cbs.push [pred, cb]

	changed: (path, event) ->
		# run cb
		for [pred, cb] in @cbs
			if pred path
				deps = []
				that =
					deps: (dependency) -> deps.push dependency
				cb.call that, path, event
				@deps.set([cb, path], deps)
		# run dependant cb
		for [[cb, dependant], deps] from @deps
			if path in deps
				@changed dependant, 'change' # most sensible choice among https://github.com/paulmillr/chokidar#methods--events


###
Utility functions
###

# Synchronous file io (string)
export read = (file, options={encoding:'utf8'}) -> fs.readFileSync file, options
export write = (file, data, options) -> fs.writeFileSync(file, data, options)


# base of filename
# https://www.gnu.org/software/emacs/manual/html_node/elisp/File-Name-Components.html
export base = (filename) ->	(path.parse filename).name

# extension of filename
export ext = (filename) -> (path.parse filename).ext
