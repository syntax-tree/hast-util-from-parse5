/**
 * @typedef {import('tape').Test} Test
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('../lib/index.js').Node} Node
 *
 * @typedef Options
 * @property {VFile} file
 * @property {string} out
 */

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert'
import test from 'tape'
import {isHidden} from 'is-hidden'
import parse5 from 'parse5'
import {visit} from 'unist-util-visit'
import {toVFile} from 'to-vfile'
import {fromParse5} from '../index.js'

const join = path.join

test('hast-util-from-parse5', (t) => {
  const file = toVFile({value: '<title>Hello!</title><h1>World!'})

  t.deepEqual(
    fromParse5(parse5.parse(String(file))),
    {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'html',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'head',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'title',
                  properties: {},
                  children: [{type: 'text', value: 'Hello!'}]
                }
              ]
            },
            {
              type: 'element',
              tagName: 'body',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'h1',
                  properties: {},
                  children: [{type: 'text', value: 'World!'}]
                }
              ]
            }
          ]
        }
      ],
      data: {quirksMode: true}
    },
    'should transform a complete document'
  )

  t.deepEqual(
    fromParse5(parse5.parseFragment(String(file))),
    {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'title',
          properties: {},
          children: [{type: 'text', value: 'Hello!'}]
        },
        {
          type: 'element',
          tagName: 'h1',
          properties: {},
          children: [{type: 'text', value: 'World!'}]
        }
      ],
      data: {quirksMode: false}
    },
    'should transform a fragment'
  )

  t.deepEqual(
    fromParse5(
      parse5.parse(String(file), {sourceCodeLocationInfo: true}),
      file
    ),
    {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'html',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'head',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'title',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'Hello!',
                      position: {
                        start: {line: 1, column: 8, offset: 7},
                        end: {line: 1, column: 14, offset: 13}
                      }
                    }
                  ],
                  position: {
                    start: {line: 1, column: 1, offset: 0},
                    end: {line: 1, column: 22, offset: 21}
                  }
                }
              ]
            },
            {
              type: 'element',
              tagName: 'body',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'h1',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'World!',
                      position: {
                        start: {line: 1, column: 26, offset: 25},
                        end: {line: 1, column: 32, offset: 31}
                      }
                    }
                  ],
                  position: {
                    start: {line: 1, column: 22, offset: 21},
                    end: {line: 1, column: 32, offset: 31}
                  }
                }
              ]
            }
          ]
        }
      ],
      data: {quirksMode: true},
      position: {
        start: {line: 1, column: 1, offset: 0},
        end: {line: 1, column: 32, offset: 31}
      }
    },
    'should accept a file as options'
  )

  t.deepEqual(
    fromParse5(parse5.parse(String(file)), file),
    {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'html',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'head',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'title',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'Hello!'
                    }
                  ]
                }
              ]
            },
            {
              type: 'element',
              tagName: 'body',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'h1',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'World!'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      data: {quirksMode: true}
    },
    'should accept a file as options (without location info)'
  )

  t.deepEqual(
    fromParse5(
      {
        nodeName: 'title',
        tagName: 'title',
        attrs: [],
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        childNodes: [
          {
            nodeName: '#text',
            value: 'Hello!',
            // @ts-expect-error runtime.
            sourceCodeLocation: {}
          }
        ],
        // @ts-expect-error runtime.
        sourceCodeLocation: {
          startLine: 1,
          startCol: 1,
          startOffset: 0
        }
      },
      file
    ),
    {
      type: 'element',
      tagName: 'title',
      properties: {},
      children: [
        {
          type: 'text',
          value: 'Hello!'
        }
      ],
      position: {start: {line: 1, column: 1, offset: 0}, end: null}
    },
    'should support synthetic locations'
  )

  t.deepEqual(
    fromParse5(
      {
        nodeName: 'p',
        tagName: 'p',
        attrs: [],
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        childNodes: [
          // @ts-expect-error runtime.
          {
            nodeName: '#text',
            value: 'Hello!',
            sourceCodeLocation: {
              startLine: 1,
              startCol: 4,
              startOffset: 3,
              endLine: 1,
              endCol: 10,
              endOffset: 9
            }
          }
        ],
        // @ts-expect-error runtime.
        sourceCodeLocation: {
          startLine: 1,
          startCol: 1,
          startOffset: 0
        }
      },
      file
    ),
    {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [
        {
          type: 'text',
          value: 'Hello!',
          position: {
            start: {line: 1, column: 4, offset: 3},
            end: {line: 1, column: 10, offset: 9}
          }
        }
      ],
      position: {
        start: {line: 1, column: 1, offset: 0},
        end: {line: 1, column: 10, offset: 9}
      }
    },
    'should support synthetic locations on unclosed elements'
  )

  t.deepEqual(
    fromParse5(
      parse5.parseFragment(
        [
          '<svg width="230" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
          '<circle cx="60"  cy="60" r="50" fill="red"/>',
          '</svg>'
        ].join('\n')
      ),
      {space: 'svg'}
    ),
    {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'svg',
          properties: {
            width: '230',
            height: '120',
            viewBox: '0 0 200 200',
            xmlns: 'http://www.w3.org/2000/svg',
            xmlnsXLink: 'http://www.w3.org/1999/xlink'
          },
          children: [
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'circle',
              properties: {cx: '60', cy: '60', r: '50', fill: 'red'},
              children: []
            },
            {type: 'text', value: '\n'}
          ]
        }
      ],
      data: {quirksMode: false}
    },
    'should transform svg'
  )

  t.end()
})

test('fixtures', (t) => {
  const base = join('test', 'fixtures')
  const files = fs.readdirSync(base)
  let index = -1

  while (++index < files.length) {
    if (!isHidden(files[index])) {
      each(files[index])
    }
  }

  t.end()

  /**
   * @param {string} fixture
   */
  function each(fixture) {
    t.test(fixture, (st) => {
      const options = {
        file: toVFile.readSync(join(base, fixture, 'index.html')),
        out: join(base, fixture, 'index.json')
      }

      st.plan(4)

      checkYesYes(st, options)
      checkNoYes(st, options)
      checkYesNo(st, options)
      checkNoNo(st, options)
    })
  }

  /**
   * @param {Test} t
   * @param {Options} options
   */
  function checkYesYes(t, options) {
    const input = parse5.parse(String(options.file), {
      sourceCodeLocationInfo: true
    })
    const actual = fromParse5(input, {file: options.file, verbose: true})
    /** @type {Node} */
    let expected

    try {
      expected = JSON.parse(String(fs.readFileSync(options.out)))
    } catch {
      // New fixture.
      fs.writeFileSync(options.out, JSON.stringify(actual, null, 2) + '\n')
      return
    }

    log('yesyes', actual, expected)
    t.deepEqual(actual, expected, 'p5 w/ position, hast w/ intent of position')
  }

  /**
   * @param {Test} t
   * @param {Options} options
   */
  function checkNoYes(t, options) {
    const input = parse5.parse(String(options.file))
    const actual = fromParse5(input, {file: options.file, verbose: true})
    /** @type {Node} */
    const expected = JSON.parse(String(fs.readFileSync(options.out)))

    clean(expected)

    log('noyes', actual, expected)
    t.deepEqual(actual, expected, 'p5 w/o position, hast w/ intent of position')
  }

  /**
   * @param {Test} t
   * @param {Options} options
   */
  function checkYesNo(t, options) {
    const input = parse5.parse(String(options.file), {
      sourceCodeLocationInfo: true
    })
    const actual = fromParse5(input)
    /** @type {Node} */
    const expected = JSON.parse(String(fs.readFileSync(options.out)))

    clean(expected)

    log('yesno', actual, expected)
    t.deepEqual(actual, expected, 'p5 w/ position, hast w/o intent of position')
  }

  /**
   * @param {Test} t
   * @param {Options} options
   */
  function checkNoNo(t, options) {
    const input = parse5.parse(String(options.file))
    const actual = fromParse5(input)
    /** @type {Node} */
    const expected = JSON.parse(String(fs.readFileSync(options.out)))

    clean(expected)

    log('nono', actual, expected)
    t.deepEqual(
      actual,
      expected,
      'p5 w/o position, hast w/o intent of position'
    )
  }
})

/**
 * @param {Node} tree
 */
function clean(tree) {
  visit(tree, (node) => {
    delete node.position

    // Remove verbose data.
    if (node.type === 'element') {
      delete node.data

      if (node.content) {
        clean(node.content)
      }
    }
  })
}

/**
 * @param {string} label
 * @param {Node} actual
 * @param {Node} expected
 */
function log(label, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected, label)
  } catch {
    console.log('actual:%s:', label)
    console.dir(actual, {depth: null})
    console.log('expected:%s:', label)
    console.dir(expected, {depth: null})
  }
}
