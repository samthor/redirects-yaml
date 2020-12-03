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

import escapeStringRegexp from 'escape-string-regexp';

const randomPart = (Math.random() * 65536).toString(36);
const baseUrlOrigin = `https://does-not-exist.${randomPart}.localhost`;

const alwaysAllow = () => true;

/**
 * @typedef {{
 *   from: string|string[],
 *   to: string|string[],
 *   always?: boolean,
 * }}
 */
var RedirectLine;

/**
 * Normalizes the passed path (not a whole URL) to ensure that it ends with a
 * simple trailing slash. Removes "index.html" if found.
 *
 * @param {string} path to normalize
 * @return {string}
 */
function ensureTrailingSlashOnly(path) {
  if (path.endsWith('/index.html')) {
    return path.slice(0, -'index.html'.length);
  } else if (!path.endsWith('/')) {
    return `${path}/`;
  }
  return path;
}

/**
 * @param {RedirectLine} line
 * @param {function(string): boolean=} checker
 * @return {function(string): string|null}
 */
export function buildSingleHandler({from, to, always}, checker = alwaysAllow) {
  if (typeof from === 'string') {
    from = [from];
  }
  if (typeof to === 'string') {
    to = [to];
  }

  const singleMatchers = new Set();
  const groupMatchers = new Set();
  from.forEach(part => {
    const u = new URL(part, baseUrlOrigin);
    if (u.origin !== baseUrlOrigin) {
      return; // got a remote URL in from: list
    }

    if (part.endsWith('/...')) {
      part = part.slice(0, -3);
      groupMatchers.add(part);
    } else {
      part = ensureTrailingSlashOnly(part);
      singleMatchers.add(part);
    }
  });

  // This matches a normalized URL against the "to:" list, returning any found
  // right-most part in the "..." position.
  /** @type {function(string): string|null} */
  const matcher = (() => {
    if (!groupMatchers.size) {
      return url => singleMatchers.has(url) ? '' : null;
    }

    const escaped = [...groupMatchers].map(escapeStringRegexp);
    const groupMatcher = new RegExp(`^(${escaped.join('|')})`);

    return url => {
      if (singleMatchers.has(url)) {
        return '';
      }

      const m = groupMatcher.exec(url);
      if (!(m && groupMatchers.has(m[1]))) {
        return null;
      }
      const base = m[1];
      return url.slice(base.length - 1); // include leading "/"
    };
  })();

  return pathname => {
    const build = new URL(pathname, baseUrlOrigin);
    if (build.origin !== baseUrlOrigin) {
      return false; // can't match non-local URLs
    }

    const normalized = ensureTrailingSlashOnly(build.pathname);

    const matchPart = matcher(normalized);
    if (matchPart === null) {
      return null; // did not match this rule
    }

    for (let i = 0; i < to.length; ++i) {
      const part = to[i];
      const isLast = (i + 1 === to.length);

      const u = new URL(part, baseUrlOrigin);
      let {pathname: check} = u;

      if (check.endsWith('/...')) {
        check = check.slice(0, -4) + (matchPart || '/');
      } else {
        check = ensureTrailingSlashOnly(check);
      }

      // Allow if this should (a) always pass, (b) on a different origin, or (c) checker passes.
      const allowed = ((always && isLast) || u.origin !== baseUrlOrigin || checker(check));
      if (!allowed) {
        continue;
      }

      // Match the final target to the source request. If it ended with "/index.html" or did
      // not have a trailing "/", match that.
      if (pathname.endsWith('/index.html')) {
        check += 'index.html';
      } else if (!pathname.endsWith('/')) {
        check = check.slice(0, -1);
      }

      u.pathname = check;

      u.search = build.search;
      u.hash = build.hash;

      const out = u.toString();
      if (u.origin !== baseUrlOrigin) {
        return out;
      }
      return out.substr(baseUrlOrigin.length); // remove "https://foo.blah"
    }

    return null;
  };
}

/**
 * @param {RedirectLine[]} all
 * @param {function(string): boolean=} checker
 * @return {function(string): string|null}
 */
export function buildHandlers(all, checker = alwaysAllow) {
  const handlers = all.map(line => buildSingleHandler(line, checker));

  return pathname => {
    for (const handler of handlers) {
      const out = handler(pathname);
      if (out !== null) {
        return out;
      }
    }
    return null;
  };
}