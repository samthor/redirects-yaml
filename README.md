This is a handler for a specific type of redirects config specified in `_redirects.yaml`.
The file format looks like:

```yaml
redirects:
- from: /page
  to: /other_page
- from: /foo/bar/...
  to: /target/folder/...
- from: /to_remote
  to: https://another-domain.com
```

This package doesn't depend on a YAML parser, but expects to be passed an array of objects which contain `{from, to}`.
This is the default method exported from this package:

```js
import buildRedirects from 'redirects-yaml';

const parsedYaml = ...; // use YAML.parse
const handler = buildRedirects(parsedYaml.redirects);

const matchingOut = handler('/page');      // "/other_page"
const invalidOut = handler('/not_handled') // null
```

You can also use `require()`.

# Additional Support

This package also supports some extended config.

## Multiple From

You can match multiple source addresses at once:

```yaml
redirects:
- from:
  - /page
  - /another_page
  to: /target
```

## Multiple To &amp; Checker

You can specify multiple `to:` targets and pass a custom checker:

```yaml
redirects:
- from: /test/...
  to:
  - /target1/...
  - /target2/sub/...
```

(Multiple `to:` targets without a checker is needless, as the first choice will always be chosen.)

When you construct the handler, you can pass a second arg which is passed to check pathnames:

```js
const checker = pathname => {
  if (pathname === '/target1/exists' || pathname === '/target2/sub/foo') {
    return true;
  }
};
buildRedirects(parsedYaml.redirects, checker);
```

The first matching pathname will be returned.

⚠️ If any target is a https:// or http:// URL, it will always be returned, without being passed to the checker.

### Always Flag

As well as the specifying a checker method, you can specify `always: true` to have the last `to:` always be returned.
For example:

```yaml
redirects:
- from: /test/...
  to:
  - /target1/...
  - /fallback/...
  always: true
```

In this case, requests to /test/foo will go load /target1/foo (if the checker passes), but otherwise will always go to /fallback/foo.

# Dependencies

This depends on `escape-string-regexp` to construct complex `from:` matchers.
