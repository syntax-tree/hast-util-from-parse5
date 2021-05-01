/**
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('vfile-location').Location} VFileLocation
 * @typedef {import('property-information').Schema} Schema
 * @typedef {import('unist').Position} Position
 * @typedef {import('unist').Point} Point
 * @typedef {import('hast').Parent} Parent
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').Text} Text
 * @typedef {import('hast').Comment} Comment
 * @typedef {import('hast').DocType} Doctype
 * @typedef {Parent['children'][number]} Child
 * @typedef {Element['children'][number]} ElementChild
 * @typedef {Child|Root} Node
 * @typedef {import('parse5').Document} P5Document
 * @typedef {import('parse5').DocumentType} P5Doctype
 * @typedef {import('parse5').CommentNode} P5Comment
 * @typedef {import('parse5').TextNode} P5Text
 * @typedef {import('parse5').Element} P5Element
 * @typedef {import('parse5').ElementLocation} P5ElementLocation
 * @typedef {import('parse5').Location} P5Location
 * @typedef {import('parse5').Attribute} P5Attribute
 * @typedef {import('parse5').Node} P5Node
 *
 * @typedef {'html'|'svg'} Space
 *
 * @callback Handler
 * @param {Context} ctx
 * @param {P5Node} node
 * @param {Array.<Child>} children
 * @returns {Node}
 *
 * @typedef Options
 * @property {Space} [space='html'] Whether the root of the tree is in the `'html'` or `'svg'` space. If an element in with the SVG namespace is found in `ast`, `fromParse5` automatically switches to the SVG space when entering the element, and switches back when leaving
 * @property {VFile} [file] `VFile`, used to add positional information to nodes. If given, the file should have the original HTML source as its contents
 * @property {boolean} [verbose=false] Whether to add extra positional information about starting tags, closing tags, and attributes to elements. Note: not used without `file`
 *
 * @typedef Context
 * @property {Schema} schema
 * @property {VFile} file
 * @property {boolean} verbose
 * @property {boolean} location
 */

import {h, s} from 'hastscript'
import {html, svg, find} from 'property-information'
import vfileLocation from 'vfile-location'
import {webNamespaces} from 'web-namespaces'

var own = {}.hasOwnProperty

// Handlers.
var map = {
  '#document': root,
  '#document-fragment': root,
  '#text': text,
  '#comment': comment,
  '#documentType': doctype
}

/**
 * Transform Parse5’s AST to a hast tree.
 *
 * @param {P5Node} ast
 * @param {Options|VFile} [options]
 */
export function fromParse5(ast, options = {}) {
  /** @type {Options} */
  var settings
  /** @type {VFile} */
  var file

  if (isFile(options)) {
    file = options
    settings = {}
  } else {
    file = options.file
    settings = options
  }

  return transform(
    {
      schema: settings.space === 'svg' ? svg : html,
      file,
      verbose: settings.verbose,
      location: false
    },
    ast
  )
}

/**
 * Transform children.
 *
 * @param {Context} ctx
 * @param {P5Node} ast
 * @returns {Node}
 */
function transform(ctx, ast) {
  var schema = ctx.schema
  /** @type {Handler} */
  var fn = own.call(map, ast.nodeName) ? map[ast.nodeName] : element
  /** @type {Array.<Child>} */
  var children
  /** @type {Node} */
  var result
  /** @type {Position} */
  var position

  // Element.
  if ('tagName' in ast) {
    ctx.schema = ast.namespaceURI === webNamespaces.svg ? svg : html
  }

  if ('childNodes' in ast) {
    children = nodes(ctx, ast.childNodes)
  }

  result = fn(ctx, ast, children)

  if ('sourceCodeLocation' in ast && ast.sourceCodeLocation && ctx.file) {
    // @ts-ignore It’s fine.
    position = location(ctx, result, ast.sourceCodeLocation)

    if (position) {
      ctx.location = true
      result.position = position
    }
  }

  ctx.schema = schema

  return result
}

/**
 * Transform children.
 *
 * @param {Context} ctx
 * @param {Array.<P5Node>} children
 * @returns {Array.<Child>}
 */
function nodes(ctx, children) {
  var index = -1
  /** @type {Array.<Child>} */
  var result = []

  while (++index < children.length) {
    // @ts-ignore Assume no roots in children.
    result[index] = transform(ctx, children[index])
  }

  return result
}

/**
 * Transform a document.
 * Stores `ast.quirksMode` in `node.data.quirksMode`.
 *
 * @type {Handler}
 * @param {P5Document} ast
 * @param {Array.<Child>} children
 * @returns {Root}
 */
function root(ctx, ast, children) {
  /** @type {Root} */
  var result = {
    type: 'root',
    children,
    data: {quirksMode: ast.mode === 'quirks' || ast.mode === 'limited-quirks'}
  }
  /** @type {string} */
  var doc
  /** @type {VFileLocation} */
  var location

  if (ctx.file && ctx.location) {
    doc = String(ctx.file)
    location = vfileLocation(doc)
    result.position = {
      start: location.toPoint(0),
      end: location.toPoint(doc.length)
    }
  }

  return result
}

/**
 * Transform a doctype.
 *
 * @type {Handler}
 * @returns {Doctype}
 */
function doctype() {
  // @ts-ignore Types are out of date.
  return {type: 'doctype'}
}

/**
 * Transform a text.
 *
 * @type {Handler}
 * @param {P5Text} ast
 * @returns {Text}
 */
function text(_, ast) {
  return {type: 'text', value: ast.value}
}

/**
 * Transform a comment.
 *
 * @type {Handler}
 * @param {P5Comment} ast
 * @returns {Comment}
 */
function comment(_, ast) {
  return {type: 'comment', value: ast.data}
}

/**
 * Transform an element.
 *
 * @type {Handler}
 * @param {P5Element} ast
 * @param {Array.<ElementChild>} children
 * @returns {Element}
 */
function element(ctx, ast, children) {
  var fn = ctx.schema.space === 'svg' ? s : h
  var index = -1
  /** @type {Object.<string, string>} */
  var props = {}
  /** @type {Element} */
  var result
  /** @type {P5Attribute} */
  var attribute
  /** @type {P5ElementLocation} */
  var pos
  /** @type {Point} */
  var start
  /** @type {Point} */
  var end

  while (++index < ast.attrs.length) {
    attribute = ast.attrs[index]
    props[(attribute.prefix ? attribute.prefix + ':' : '') + attribute.name] =
      attribute.value
  }

  result = fn(ast.tagName, props, children)

  if (result.tagName === 'template' && 'content' in ast) {
    // @ts-ignore Types are wrong.
    pos = ast.sourceCodeLocation
    start = pos && pos.startTag && position(pos.startTag).end
    end = pos && pos.endTag && position(pos.endTag).start

    // @ts-ignore Types are wrong.
    result.content = transform(ctx, ast.content)

    if ((start || end) && ctx.file) {
      result.content.position = {start, end}
    }
  }

  return result
}

/**
 * Create clean positional information.
 *
 * @param {Context} ctx
 * @param {Node} node
 * @param {P5ElementLocation} location
 * @returns {Position}
 */
function location(ctx, node, location) {
  var result = position(location)
  /** @type {ElementChild} */
  var tail
  /** @type {string} */
  var key
  /** @type {Object.<string, Position>} */
  var props

  if (node.type === 'element') {
    tail = node.children[node.children.length - 1]

    // Bug for unclosed with children.
    // See: <https://github.com/inikulin/parse5/issues/109>.
    if (!location.endTag && tail && tail.position && tail.position.end) {
      result.end = Object.assign({}, tail.position.end)
    }

    if (ctx.verbose) {
      props = {}

      for (key in location.attrs) {
        if (own.call(location.attrs, key)) {
          props[find(ctx.schema, key).property] = position(location.attrs[key])
        }
      }

      node.data = {
        position: {
          opening: position(location.startTag),
          closing: location.endTag ? position(location.endTag) : null,
          properties: props
        }
      }
    }
  }

  return result
}

/**
 * @param {P5Location} loc
 * @returns {Position|null}
 */
function position(loc) {
  var start = point({
    line: loc.startLine,
    column: loc.startCol,
    offset: loc.startOffset
  })
  var end = point({
    line: loc.endLine,
    column: loc.endCol,
    offset: loc.endOffset
  })
  return start || end ? {start, end} : null
}

/**
 * @param {Point} point
 * @returns {Point|null}
 */
function point(point) {
  return point.line && point.column ? point : null
}

/**
 * @param {VFile|Options} value
 * @returns {value is VFile}
 */
function isFile(value) {
  return 'messages' in value
}
