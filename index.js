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

const randomPart = (Math.random() * 65536).toString(36);
const baseUrlOrigin = `https://does-not-exist.${randomPart}.localhost`;

const alwaysAllow = () => true;

/**
 * @typedef {{
 *   from: string,
 *   to?: string,
 *   try?: string|string[],
 *   else?: string,
 * }}
 */
export var RedirectLine;

/**
 * Removes "/" or "/index.html" from the pathname.
 *
 * @param {string} path
 * @return {string} updated path
 */
function stripSuffix(path) {
  const suffix = extractSuffix(path);
  return path.slice(0, -suffix.length);
}

/**
 * Finds the suffix from the specified pathname.
 *
 * @param {string} path
 * @return {string} suffix or the empty string
 */
function extractSuffix(path) {
  if (path.endsWith('/index.html')) {
    return '/index.html';
  } else if (path.endsWith('/')) {
    return '/';
  }
  return '';
}

function buildInterpolateIntoResult(target, checker = () => true) {
  if (target.endsWith('/...')) {
    const prefix = target.slice(0, -3);
    return match => {
      const result = prefix + match;
      return checker(result) ? result : null;
    };
  }

  return () => {
    return checker(target) ? target : null;
  };
}

/**
 * @param {RedirectLine} line
 * @param {function(string): boolean} checker
 * @return {function(string): string|null}
 */
function internalBuildSingleHandler(line, checker) {
  const matcher = (() => {
    const fromUrl = new URL(line.from, baseUrlOrigin);
    if (fromUrl.origin !== baseUrlOrigin) {
      // This is invalid, we got an external URL in the "from:" list.
      return () => null;
    }
  
    const {pathname: fromPath} = fromUrl;

    if (fromPath.endsWith('/...')) {
      // For "/foo/...": match "/foo", "/foo/whatever/zing"
      const prefix = fromPath.slice(0, -3);
      const exact = prefix.slice(0, -1);
      return s => s.startsWith(prefix) || s === exact ? s.slice(exact.length) : null;
    }

    const single = stripSuffix(fromPath);
    return s => s === single ? '' : null;
  })();

  const redirectTo = (() => {
    // Single target always wins.
    if (line.to) {
      return buildInterpolateIntoResult(line.to);
    }

    let tryValues = line.try;
    if (typeof tryValues === 'string') {
      tryValues = [tryValues];
    } else if (tryValues == null) {
      tryValues = [];
    }
    const cands = tryValues.map(tryValue => buildInterpolateIntoResult(tryValue, checker));
    if (line.else) {
      cands.push(buildInterpolateIntoResult(line.else));
    }

    return match => {
      for (const cand of cands) {
        const result = cand(match);
        if (result !== null) {
          return result;
        }
      }
      return null;
    };
  })();

  // nb. assumes normalized in internal method
  return normalized => {
    const matchPart = matcher(normalized);
    if (matchPart === null) {
      return null; // did not match this rule
    }
    return redirectTo(matchPart);
  };
}

/**
 * @param {RedirectLine[]} all
 * @param {function(string): boolean=} checker
 * @return {function(string): string|null}
 */
export function buildHandlers(all, checker = alwaysAllow) {
  const handlers = all.map(line => internalBuildSingleHandler(line, checker));

  return pathname => {
    const u = new URL(pathname, baseUrlOrigin);
    if (u.origin !== baseUrlOrigin) {
      return null;  // passed non-local URL
    }

    // We check the pathname without a suffix, but store it for later so we can add it back.
    const suffix = extractSuffix(u.pathname);
    pathname = stripSuffix(u.pathname);

    let result = null;
    for (const handler of handlers) {
      result = handler(pathname);
      if (result !== null) {
        break;
      }
    }
    if (result === null) {
      return null;
    }

    const resultUrl = new URL(result, u);
    resultUrl.pathname += suffix;

    const s = resultUrl.toString();
    if (resultUrl.origin !== baseUrlOrigin) {
      return s;  // don't include internal origin
    }
    return s.slice(baseUrlOrigin.length);
  };
}