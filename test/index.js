'use strict';

/* Dependencies. */
var fs = require('fs');
var path = require('path');
var test = require('tape');
var vfile = require('vfile');
var parse5 = require('parse5');
var fromParse5 = require('..');

/* Methods. */
var join = path.join;
var read = fs.readFileSync;
var write = fs.writeFileSync;
var dir = fs.readdirSync;

/* Fixtures. */
test('hast-util-from-parse5', function (t) {
  var input = '<title>Hello!</title><h1>World!';
  var file = vfile(input);

  t.deepEqual(
    fromParse5(parse5.parse(input)),
    {
      type: 'root',
      children: [{
        type: 'element',
        tagName: 'html',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'head',
            properties: {},
            children: [{
              type: 'element',
              tagName: 'title',
              properties: {},
              children: [{type: 'text', value: 'Hello!'}]
            }]
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
      }],
      data: {quirksMode: true}
    },
    'should transform a complete document'
  );

  t.deepEqual(
    fromParse5(parse5.parseFragment(input)),
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
  );

  t.deepEqual(
    fromParse5(parse5.parse(input, {locationInfo: true}), file),
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
  );

  t.deepEqual(
    fromParse5(parse5.parse(input), file),
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
  );

  t.deepEqual(
    fromParse5({
      nodeName: 'title',
      tagName: 'title',
      attrs: [],
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      childNodes: [{
        nodeName: '#text',
        value: 'Hello!',
        __location: {}
      }],
      __location: {
        line: 1,
        col: 1,
        startOffset: 0,
        endOffset: 21,
        startTag: {line: 1, col: 1, startOffset: 0, endOffset: null},
        endTag: {}
      }
    }, file),
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
      position: {
        start: {column: 1, line: 1, offset: 0},
        end: {column: 22, line: 1, offset: 21}
      }
    },
    'should support synthetic locations'
  );

  t.deepEqual(
    fromParse5({
      nodeName: 'p',
      tagName: 'p',
      attrs: [],
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      childNodes: [{
        nodeName: '#text',
        value: 'Hello!',
        __location: {
          line: 1,
          col: 1,
          startOffset: 0,
          endOffset: null
        }
      }],
      __location: {
        line: 1,
        col: 1,
        startOffset: 0,
        endOffset: 21,
        startTag: {line: 1, col: 1, startOffset: 0, endOffset: null}
      }
    }, file),
    {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [{
        type: 'text',
        value: 'Hello!',
        position: {
          start: {column: 1, line: 1, offset: 0},
          end: null
        }
      }],
      position: {
        start: {column: 1, line: 1, offset: 0},
        end: null
      }
    },
    'should support synthetic locations on unclosed elements'
  );

  t.end();
});

/* Fixtures. */
test('fixtures', function (t) {
  var base = join(__dirname, 'fixtures');

  dir(base)
    .filter(function (fixture) {
      return fixture.charAt(0) !== '.';
    })
    .forEach(function (fixture) {
      var filePath = join(base, fixture, 'index.json');
      var input = read(join(base, fixture, 'index.html'), 'utf8');
      var ast = parse5.parse(input, {locationInfo: true});
      var doc = fromParse5(ast, {file: vfile(input), verbose: true});
      var output;

      try {
        output = read(filePath, 'utf8');
      } catch (err) {
        /* New fixture. */
        write(filePath, JSON.stringify(doc, 0, 2) + '\n');
        return;
      }

      t.deepEqual(doc, JSON.parse(output), fixture);
    });

  t.end();
});
