import vfile = require('vfile')
import parse5 = require('parse5')
import fromParse5 = require('hast-util-from-parse5')

const file = vfile()
const ast = parse5.parse('', {sourceCodeLocationInfo: true})
fromParse5(ast, file)
fromParse5(ast, {file})
fromParse5(ast, {space: 'html'})
fromParse5(ast, {space: 'svg'})
fromParse5(ast, {verbose: true})
