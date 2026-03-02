# mytest – Minimal Playwright Test Runner

`mytest` is a **Cypress‑like test runner** built on top of **Playwright + TypeScript**, packaged as a small monorepo:

- `packages/core` – Playwright wrapper that runs a test function and captures browser errors.
- `packages/reporter` – Writes structured JSON results.
- `packages/runner` – CLI that discovers and runs tests from `./tests`.

You write your tests in **plain JavaScript** (`*.test.js`) using Playwright's `page` API.

---

## Project structure

```text
mytest/
  package.json
  tsconfig.base.json
  packages/
    core/
    reporter/
    runner/
  tests/
    example.test.js
```

---

## Installation

From the project root (`mytest`):

```bash
npm install
npx playwright install
npm run build
```

---

## Running tests

Discover and run all tests under `./tests`:

```bash
npm run mytest:run
```

This is equivalent to:

```bash
mytest run
```

### What it does

For each test:

- Creates a **fresh browser context and page**.
- Captures:
  - `pageerror`
  - `unhandledrejection`
  - `console.error` / `console.warn`
  - `requestfailed`
  - `response` with status `>= 400`
- On **failure** (any captured error or thrown exception):
  - Saves screenshot to `./artifacts/<testName>/failure.png`
  - Saves Playwright trace to `./artifacts/<testName>/trace.zip`
- Always appends a result entry to `./results/results.json`:

```jsonc
[
  {
    "testName": "example: inline page content",
    "status": "passed",
    "durationMs": 1234,
    "errors": [],
    "artifacts": {
      "screenshot": "artifacts/example___inline_page_content/failure.png",
      "trace": "artifacts/example___inline_page_content/trace.zip"
    }
  }
]
```

---

## Writing tests

Tests live in the `tests/` folder and must match `*.test.js`.  
Each file should export a `tests` array via CommonJS:

```js
// tests/example.test.js
module.exports = {
  tests: [
    {
      name: "example: inline page content",
      fn: async (page) => {
        await page.setContent(`
          <html>
            <head>
              <title>MyTest Example</title>
            </head>
            <body>
              <h1 id="greeting">Hello from MyTest</h1>
            </body>
          </html>
        `);

        const text = await page.textContent("#greeting");
        if (text !== "Hello from MyTest") {
          throw new Error(`Unexpected greeting text: ${text}`);
        }
      }
    }
  ]
};
```

### Test function signature

Each test is an object:

```ts
{
  name: string;          // Name in logs & results.json
  fn: (page) => Promise<void> | void;  // Playwright Page instance
}
```

Inside `fn`, you can use any Playwright `page` APIs:

```js
await page.goto("https://example.com");
await page.click("text=Login");
```

Throwing an error (or any of the captured events firing) will mark the test as **failed** and trigger screenshot + trace collection.

---

## Monorepo packages

- **`@mytest/core`**
  - Exposes `runTest(testName, fn)` which:
    - Sets up Playwright browser/context/page
    - Attaches listeners for browser errors/logs/requests
    - Collects artifacts on failure
    - Returns a `TestResult` object

- **`@mytest/reporter`**
  - Exposes `writeResults(results)` which writes `results/results.json`.

- **`@mytest/runner`**
  - CLI entrypoint (`mytest run`)
  - Discovers `./tests/*.test.js`
  - Loads `module.exports.tests`
  - Runs each test via `@mytest/core`
  - Persists results via `@mytest/reporter`

---

## Development

Build all packages:

```bash
npm run build
```

Watch / edit TypeScript (typical workflow):

```bash
cd packages/core
npm run build

cd ../reporter
npm run build

cd ../runner
npm run build
```

Then rerun:

```bash
cd ../../..
npm run mytest:run
```

---

## Configuration

`playwright-test-runner` reads options from `mytest.config.json` in the project root:

```json
{
  "baseUrl": "http://localhost:3000",
  "browser": "chromium",
  "headless": true,
  "defaultTimeoutMs": 10000,
  "resultsDir": "results",
  "artifactsDir": "artifacts"
}
```

You can override the config file path via:

```bash
mytest run --config mytest.config.json
```

---

## Tagging & filtering tests

Each test can have `description` and `tags`:

```js
module.exports = {
  tests: [
    {
      name: "example: inline page content",
      description: "Simple inline HTML check",
      tags: ["smoke"],
      fn: async (page) => {
        // ...
      }
    }
  ]
};
```

Run only tests with a specific tag:

```bash
npm run mytest:run -- --tag smoke
# or
mytest run --tag smoke
```

---

## CLI options

```bash
mytest run [--config mytest.config.json] \
           [--browser chromium|firefox|webkit] \
           [--headless true|false] \
           [--tag <tag>]
```

At the end of a run, a summary is printed, e.g.:

```text
Summary: 5 passed, 1 failed, 6 total.
```

