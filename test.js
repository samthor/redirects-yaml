/**
 * Copyright 2020 Sam Thorogood
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import test from 'ava';
import {buildHandlers} from './index.js';

const buildSingleHandler = (config, checker = () => true) => buildHandlers([config], checker);

test('basic handler', t => {
  const handler = buildSingleHandler({
    from: '/foo/...',
    to: '/zing/...',
  });

  t.deepEqual(handler('/foo/hello'), '/zing/hello');
  t.deepEqual(handler('/bar/hello'), null);
});

test('multiple try handlers', t => {
  const checker = (raw, original) => {
    if (raw === 'https://example.com/supported') {
      throw new Error('url should never be passed');
    }
    if (raw === '/other/other-req') {
      t.is(original, '/foo/other-req');
      return true;
    }
    return false;
  };
  const handler = buildSingleHandler({
    from: '/foo/...',
    try: ['/zing/...', 'https://example.com/...', '/other/...'],
  }, checker);

  t.deepEqual(handler('/foo/hello'), null);
  t.deepEqual(handler('/foo/supported'), null);
  t.deepEqual(handler('/foo/other-req'), '/other/other-req');
});

test('multiple fall-through', t => {
  const checker = (pathname) => {
    if (pathname === '/bar/does-not-exist') {
      return false;
    } else if (pathname === '/bar/test') {
      return true;
    }
    throw new Error(`unexpected: ${pathname}`);
  };

  const handler = buildHandlers([
    {
      from: '/foo2/...',
      'try': '/bar/does-not-exist',
      else: '/no',
    },
    {
      from: '/foo/...',
      'try': '/bar/test',
      'else': '/oh-no',
    },
  ], checker);

  t.deepEqual(handler('/foo'), '/bar/test');
  t.deepEqual(handler('/foo2/whatever/ignored'), '/no');
});

test('persists stuff', t => {
  const handler = buildSingleHandler({
    from: '/foo',
    to: '/bar/...',
  });

  t.deepEqual(handler('/foo?arg='), '/bar?arg=')
  t.deepEqual(handler('/foo/index.html?zing#hello'), '/bar/index.html?zing#hello')
});

test('handles redirect hashes', t => {
  const handler = buildSingleHandler({
    from: '/foo',
    to: '/bar/#baz',
  });

  t.deepEqual(handler('/foo'), '/bar/#baz')
  t.deepEqual(handler('/foo?arg='), '/bar/?arg=#baz')
  t.deepEqual(handler('/foo/index.html?zing#hello'), '/bar/index.html?zing#baz')
});
