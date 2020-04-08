'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs-extra');
var path = require('path');
var minimatch = _interopDefault(require('minimatch'));
var ManyKeysMap = _interopDefault(require('many-keys-map'));
var chokidar = require('chokidar');

var indexOf = [].indexOf;

var Watcher = class Watcher {
  constructor(root) {
    this.root = root;
    this.cbs = []; // Array of [pred, cb]
    this.deps = new ManyKeysMap(); // Map of [cb, abspath] => [abspath, abspath, ...]
    this.watcher = chokidar.watch(this.root, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });
    this.watcher.on('all', (event, path_) => {
      return this.changed(path_, event);
    });
  }

  when(pattern, cb) {
    var g, i, len, pred;
    if (pattern instanceof Array) {
      for (i = 0, len = pattern.length; i < len; i++) {
        g = pattern[i];
        this.when(g, cb);
      }
      return;
    }
    switch (false) {
      case typeof pattern !== 'function': // path -> boolean
        pred = pattern;
        break;
      case typeof pattern !== 'symbol': // programmatic trigger; not triggered by file system
        pred = function(s) {
          return s === pattern;
        };
        break;
      case typeof pattern !== 'string': // glob
        pred = function(s) {
          return minimatch(s, pattern);
        };
        break;
      case !(pattern instanceof RegExp):
        pred = function(s) {
          return pattern.test(s);
        };
        break;
      default:
        throw new Error('The first argument must be a string, a symbol, a regex, a function or an array of those');
    }
    return this.cbs.push([pred, cb]);
  }

  async changed(path_, event) {
    var abspath_, cb, dependant, deps, i, len, pred, ref, ref1, results, that, x;
    abspath_ = path.abspath(path_);
    ref = this.cbs;
    // run cb
    for (i = 0, len = ref.length; i < len; i++) {
      [pred, cb] = ref[i];
      if (pred(path_)) {
        deps = [];
        that = { // inner API
          depend: function(dependency) {
            return deps.push(path.abspath(dependency));
          }
        };
        await cb.call(that, path.relative('.', path_), event);
        this.deps.set([cb, abspath_], deps);
      }
    }
    ref1 = this.deps;
    // run dependant cb
    results = [];
    for (x of ref1) {
      [[cb, dependant], deps] = x;
      if (indexOf.call(deps, abspath_) >= 0) {
        results.push((await this.changed(dependant, 'change'))); // most sensible choice among https://github.com/paulmillr/chokidar#methods--events
      } else {
        results.push(void 0);
      }
    }
    return results;
  }

};

/*
Utility functions
*/
// Synchronous file io (string)
var read = async function(file, options = {
    encoding: 'utf8'
  }) {
  return (await fs.readFile(file, options));
};

var write = async function(file, data, options) {
  return (await fs.outputFile(file, data, options));
};

// base of filename
// https://www.gnu.org/software/emacs/manual/html_node/elisp/File-Name-Components.html
var base = function(filename) {
  return (path.parse(filename)).name;
};

// extension of filename
var ext = function(filename) {
  return (path.parse(filename)).ext;
};

exports.Watcher = Watcher;
exports.base = base;
exports.ext = ext;
exports.read = read;
exports.write = write;
