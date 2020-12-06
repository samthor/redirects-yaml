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

# Try/Else Support

This package also supports some extended config.
You can _try_ possible redirect handlers with an optional default fallback:

```html
redirects:
- from: /page/...
  try:
  - /foo/...
  else: /bar/...
```

In this case, you'll match URLs under "/page".
This will then check to see whether the same URL under "/foo" exists.

* If it does, a URL under "/foo" will be returned.

* If it does not match, then we'll always redirect to the page under "/bar".

* ⚠️ External URLs will never pass `try:` checks and won't be passed to your checker.

You have to specify a `checker` function for `try:` to work:

```js
const checker = (pathname, original) => {
  // You can check any way you like, but checking whether the file exists makes the most sense.
  // pathname can be blank (exact match), or it will start with "/" and have a longer path.
  // You MUST ALWAYS use `path.join` to combine it with a real root.
  const check = path.join('/your/root', pathname);
  return fs.existsSync(check); // cannot be async

  // If you're on Windows, be sure to control for URL-style slashes "/" with your filesystem
  // which will have "\" slashes.
};
const handler = buildRedirects(parsedYaml.redirects, checker);
```

Note that the `else:` default fallback is optional.
If none of your `try:` candidates pass your checker, this will continue stepping through other redirect options.

# Dependencies

This has no dependencies. 🍩