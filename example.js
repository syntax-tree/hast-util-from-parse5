// Dependencies:
var parse5 = require('parse5');
var inspect = require('unist-util-inspect');
var vfile = require('vfile');
var fromParse5 = require('./index.js');

// Fixture:
var doc = '<!doctype html><title>Hello!</title><h1 id="world">World!<!--after-->';

// Parse:
var ast = parse5.parse(doc, {locationInfo: true});

// Transform:
var hast = fromParse5(ast, vfile(doc));

// Yields:
console.log('txt', inspect.noColor(hast));
