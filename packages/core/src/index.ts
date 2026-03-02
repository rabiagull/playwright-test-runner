import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "fs/promises";
import path from "path";

export type TestStatus = "passed" | "failed";

export interface TestArtifacts {
  screenshot?: string;
  trace?: string;
}

export interface TestResult {
  testName: string;
  status: TestStatus;
  durationMs: number;
  errors: string[];
  artifacts: TestArtifacts;
}

export type TestFn = (page: Page) => Promise<void> | void;

function sanitizeTestName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

export async function runTest(testName: string, fn: TestFn): Promise<TestResult> {
  const startedAt = Date.now();
  const errors: string[] = [];
  const artifacts: TestArtifacts = {};
  const artifactsRoot = path.resolve(process.cwd(), "artifacts", sanitizeTestName(testName));

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();

    page.on("pageerror", (error) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as Error).message)
          : String(error);
      errors.push(`pageerror: ${message}`);
    });

    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        errors.push(`console.${type}: ${msg.text()}`);
      }
    });

    page.on("requestfailed", (request) => {
      const failure = request.failure();
      const failureText = failure?.errorText ? ` - ${failure.errorText}` : "";
      errors.push(`requestfailed: ${request.method()} ${request.url()}${failureText}`);
    });

    page.on("response", (response) => {
      const status = response.status();
      if (status >= 400) {
        errors.push(`response: ${status} ${response.url()}`);
      }
    });

    await page.exposeBinding("__mytestUnhandledRejection", (_source, reason) => {
      errors.push(`unhandledrejection: ${String(reason)}`);
    });

    await page.addInitScript({
      content: `
        window.addEventListener('unhandledrejection', function (event) {
          if (window.__mytestUnhandledRejection) {
            window.__mytestUnhandledRejection(event.reason);
          }
        });
      `
    });

    await context.tracing.start({ screenshots: true, snapshots: true });

    try {
      await Promise.resolve(fn(page));
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? `${err.name}: ${err.message}${err.stack ? "\n" + err.stack : ""}`
          : String(err);
      errors.push(`exception: ${message}`);
    }

    const failed = errors.length > 0;

    if (failed) {
      await fs.mkdir(artifactsRoot, { recursive: true });

      const screenshotPath = path.join(artifactsRoot, "failure.png");
      const tracePath = path.join(artifactsRoot, "trace.zip");

      await page.screenshot({ path: screenshotPath, fullPage: true });
      await context.tracing.stop({ path: tracePath });

      artifacts.screenshot = path.relative(process.cwd(), screenshotPath);
      artifacts.trace = path.relative(process.cwd(), tracePath);
    } else {
      await context.tracing.stop();
    }

    const durationMs = Date.now() - startedAt;

    return {
      testName,
      status: failed ? "failed" : "passed",
      durationMs,
      errors,
      artifacts
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
