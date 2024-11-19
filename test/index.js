/**
 * @import {Nodes} from 'hast'
 * @import {html as Html} from 'parse5'
 * @import {VFile} from 'vfile'
 */

/**
 * @typedef Config
 * @property {VFile} file
 * @property {URL} out
 */

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import {fromParse5} from 'hast-util-from-parse5'
import {isHidden} from 'is-hidden'
import {parse, parseFragment} from 'parse5'
import {read, toVFile} from 'to-vfile'
import {visit} from 'unist-util-visit'

test('fromParse5', async function (t) {
  const file = toVFile({value: '<title>Hello!</title><h1>World!'})

  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('hast-util-from-parse5')).sort(),
      ['fromParse5']
    )
  })

  await t.test('should transform a complete document', async function () {
    assert.deepEqual(fromParse5(parse(String(file))), {
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
    })
  })

  await t.test('should transform a fragment', async function () {
    assert.deepEqual(fromParse5(parseFragment(String(file))), {
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
    })
  })

  await t.test('should support synthetic locations', async function () {
    assert.deepEqual(
      fromParse5(
        {
          nodeName: 'title',
          tagName: 'title',
          attrs: [],
          namespaceURI: /** @type {Html.NS} */ ('http://www.w3.org/1999/xhtml'),
          childNodes: [
            {
              nodeName: '#text',
              value: 'Hello!',
              // @ts-expect-error: check how the runtime handles an empty object.
              sourceCodeLocation: {}
            }
          ],
          // @ts-expect-error: check how the runtime handles partial locations.
          sourceCodeLocation: {
            startLine: 1,
            startCol: 1,
            startOffset: 0
          }
        },
        {file}
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
      }
    )
  })

  await t.test(
    'should support synthetic locations on unclosed elements',
    async function () {
      assert.deepEqual(
        fromParse5(
          {
            nodeName: 'p',
            tagName: 'p',
            attrs: [],
            namespaceURI: /** @type {Html.NS} */ (
              'http://www.w3.org/1999/xhtml'
            ),
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
            // @ts-expect-error: check how the runtime handles partial locations.
            sourceCodeLocation: {
              startLine: 1,
              startCol: 1,
              startOffset: 0
            }
          },
          {file}
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
        }
      )
    }
  )

  await t.test('should transform svg', async function () {
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
      }
    )
  })

  await t.test('should ignore prototypal props', async function () {
    assert.deepEqual(
      fromParse5(parseFragment('<x constructor y />'), {space: 'svg'}),
      {
        type: 'root',
        children: [
          {type: 'element', tagName: 'x', properties: {y: ''}, children: []}
        ],
        data: {quirksMode: false}
      }
    )
  })

  await t.test('should handle unknown attributes', async function () {
    assert.deepEqual(
      fromParse5(parseFragment('<button type="other" disabled>Hello</button>')),
      {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'button',
            properties: {
              type: 'other',
              disabled: true
            },
            children: [
              {
                type: 'text',
                value: 'Hello'
              }
            ]
          }
        ],
        data: {
          quirksMode: false
        }
      }
    )
  })
})

test('fixtures', async function (t) {
  const base = new URL('fixtures/', import.meta.url)
  const folders = await fs.readdir(base)
  let index = -1

  while (++index < folders.length) {
    const folder = folders[index]

    if (isHidden(folder)) {
      continue
    }

    await t.test(folder, async function () {
      const file = await read(new URL(folder + '/index.html', base))
      const out = new URL(folder + '/index.json', base)
      const config = {file, out}
      await checkYesYes(config)
      await checkNoYes(config)
      await checkYesNo(config)
      await checkNoNo(config)
    })
  }
})

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

/**
 * @param {Nodes} tree
 */
function clean(tree) {
  visit(tree, function (node) {
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
