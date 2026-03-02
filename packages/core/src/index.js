"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTest = runTest;
const playwright_1 = require("playwright");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
function sanitizeTestName(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}
async function runTest(testName, fn) {
    const startedAt = Date.now();
    const errors = [];
    const artifacts = {};
    const artifactsRoot = path_1.default.resolve(process.cwd(), "artifacts", sanitizeTestName(testName));
    let browser;
    let context;
    let page;
    try {
        browser = await playwright_1.chromium.launch();
        context = await browser.newContext();
        page = await context.newPage();
        page.on("pageerror", (error) => {
            const message = error && typeof error === "object" && "message" in error
                ? String(error.message)
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
            const failureText = (failure === null || failure === void 0 ? void 0 : failure.errorText) ? ` - ${failure.errorText}` : "";
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
        }
        catch (err) {
            const message = err instanceof Error
                ? `${err.name}: ${err.message}${err.stack ? "\n" + err.stack : ""}`
                : String(err);
            errors.push(`exception: ${message}`);
        }
        const failed = errors.length > 0;
        if (failed) {
            await promises_1.default.mkdir(artifactsRoot, { recursive: true });
            const screenshotPath = path_1.default.join(artifactsRoot, "failure.png");
            const tracePath = path_1.default.join(artifactsRoot, "trace.zip");
            await page.screenshot({ path: screenshotPath, fullPage: true });
            await context.tracing.stop({ path: tracePath });
            artifacts.screenshot = path_1.default.relative(process.cwd(), screenshotPath);
            artifacts.trace = path_1.default.relative(process.cwd(), tracePath);
        }
        else {
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
    }
    finally {
        if (page) {
            await page.close().catch(() => { });
        }
        if (context) {
            await context.close().catch(() => { });
        }
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
}
//# sourceMappingURL=index.js.map