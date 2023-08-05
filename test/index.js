/**
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('hast').Nodes} Nodes
 *
 * @typedef Config
 * @property {VFile} file
 * @property {URL} out
 */

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import {isHidden} from 'is-hidden'
import {parse, parseFragment} from 'parse5'
import {visit} from 'unist-util-visit'
import {read, toVFile} from 'to-vfile'
import {fromParse5} from '../index.js'
import * as mod from '../index.js'

test('fromParse5', () => {
  assert.deepEqual(
    Object.keys(mod).sort(),
    ['fromParse5'],
    'should expose the public api'
  )

  const file = toVFile({value: '<title>Hello!</title><h1>World!'})

  assert.deepEqual(
    fromParse5(parse(String(file))),
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

  assert.deepEqual(
    fromParse5(parseFragment(String(file))),
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

  assert.deepEqual(
    fromParse5(parse(String(file), {sourceCodeLocationInfo: true}), file),
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

  assert.deepEqual(
    fromParse5(parse(String(file)), file),
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

  assert.deepEqual(
    fromParse5(
      {
        nodeName: 'title',
        tagName: 'title',
        attrs: [],
        // @ts-expect-error: fine.
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        childNodes: [
          {
            nodeName: '#text',
            value: 'Hello!',
            // @ts-expect-error: fine.
            sourceCodeLocation: {}
          }
        ],
        // @ts-expect-error: fine.
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
      position: {start: {line: 1, column: 1, offset: 0}, end: undefined}
    },
    'should support synthetic locations'
  )

  assert.deepEqual(
    fromParse5(
      {
        nodeName: 'p',
        tagName: 'p',
        attrs: [],
        // @ts-expect-error: fine.
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        childNodes: [
          {
            nodeName: '#text',
            value: 'Hello!',
            parentNode: null,
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
        // @ts-expect-error: fine.
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

  assert.deepEqual(
    fromParse5(
      parseFragment(
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

  assert.deepEqual(
    fromParse5(parseFragment('<x constructor y />'), {space: 'svg'}),
    {
      type: 'root',
      children: [
        {type: 'element', tagName: 'x', properties: {y: ''}, children: []}
      ],
      data: {quirksMode: false}
    },
    'should ignore prototypal props'
  )
})

test('fixtures', async () => {
  const base = new URL('fixtures/', import.meta.url)
  const folders = await fs.readdir(base)
  let index = -1

  while (++index < folders.length) {
    const folder = folders[index]

    if (isHidden(folder)) {
      continue
    }

    const file = await read(new URL(folder + '/index.html', base))
    const out = new URL(folder + '/index.json', base)
    const config = {file, out}
    await checkYesYes(config)
    await checkNoYes(config)
    await checkYesNo(config)
    await checkNoNo(config)
  }

  /**
   * @param {Config} options
   */
  async function checkYesYes(options) {
    const input = parse(String(options.file), {
      sourceCodeLocationInfo: true
    })
    const actual = fromParse5(input, {file: options.file, verbose: true})
    /** @type {Nodes} */
    let expected

    try {
      expected = JSON.parse(String(await fs.readFile(options.out)))
    } catch {
      // New fixture.
      await fs.writeFile(options.out, JSON.stringify(actual, null, 2) + '\n')
      return
    }

    assert.deepEqual(
      actual,
      expected,
      'p5 w/ position, hast w/ intent of position'
    )
  }

  /**
   * @param {Config} options
   */
  async function checkNoYes(options) {
    const input = parse(String(options.file))
    const actual = fromParse5(input, {file: options.file, verbose: true})
    /** @type {Nodes} */
    const expected = JSON.parse(String(await fs.readFile(options.out)))

    clean(expected)

    assert.deepEqual(
      actual,
      expected,
      'p5 w/o position, hast w/ intent of position'
    )
  }

  /**
   * @param {Config} options
   */
  async function checkYesNo(options) {
    const input = parse(String(options.file), {
      sourceCodeLocationInfo: true
    })
    const actual = fromParse5(input)
    /** @type {Nodes} */
    const expected = JSON.parse(String(await fs.readFile(options.out)))

    clean(expected)

    assert.deepEqual(
      actual,
      expected,
      'p5 w/ position, hast w/o intent of position'
    )
  }

  /**
   * @param {Config} options
   */
  async function checkNoNo(options) {
    const input = parse(String(options.file))
    const actual = fromParse5(input)
    /** @type {Nodes} */
    const expected = JSON.parse(String(await fs.readFile(options.out)))

    clean(expected)

    assert.deepEqual(
      actual,
      expected,
      'p5 w/o position, hast w/o intent of position'
    )
  }
})

/**
 * @param {Nodes} tree
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
