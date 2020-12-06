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

// test('external handler always wins', t => {
//   const checker = () => false;
//   const handler = buildSingleHandler({
//     from: ['/foo/...'],
//     to: ['/zing/...', 'https://example.com/...', '/other/...'],
//     always: true,
//   }, checker);

//   t.deepEqual(handler('/foo/hello'), 'https://example.com/hello');
// });

// test('multiple fall-through', t => {
//   const checker = (pathname) => {
//     if (pathname === '/bar/does-not-exist/') {
//       return false;
//     } else if (pathname === '/bar/test/') {
//       return true;
//     }
//     throw new Error(`unexpected: ${pathname}`);
//   };

//   const handler = buildHandlers([
//     {
//       from: '/foo',
//       to: '/bar/does-not-exist',
//     },
//     {
//       from: '/foo/...',
//       to: '/bar/test',
//     },
//   ], checker);

//   t.deepEqual(handler('/foo'), '/bar/test');
//   t.deepEqual(handler('/foo/whatever/ignored'), '/bar/test');
// });

test('persists stuff', t => {
  const handler = buildSingleHandler({
    from: '/foo',
    to: '/bar/...',
  });

  t.deepEqual(handler('/foo?arg'), '/bar?arg')
});