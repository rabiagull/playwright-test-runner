#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@mytest/core");
const reporter_1 = require("@mytest/reporter");
async function discoverTestFiles(testsDir) {
    const entries = await fs_1.default.promises.readdir(testsDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".test.js")) {
            files.push(path_1.default.join(testsDir, entry.name));
        }
    }
    return files;
}
async function loadTestsFromFile(filePath) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(filePath);
    const rawTests = Array.isArray(mod.tests) ? mod.tests : [];
    const result = [];
    for (const t of rawTests) {
        if (!t || typeof t !== "object") {
            continue;
        }
        const anyTest = t;
        const name = anyTest.name;
        const fn = anyTest.fn;
        if (typeof name === "string" && typeof fn === "function") {
            result.push({ name, fn: fn });
        }
    }
    return result;
}
async function main() {
    const [, , command] = process.argv;
    if (command !== "run") {
        console.log("Usage: mytest run");
        process.exit(1);
    }
    const cwd = process.cwd();
    const testsDir = path_1.default.resolve(cwd, "tests");
    if (!fs_1.default.existsSync(testsDir)) {
        console.error(`Tests directory not found: ${testsDir}`);
        process.exit(1);
    }
    const testFilePaths = await discoverTestFiles(testsDir);
    if (testFilePaths.length === 0) {
        console.warn(`No test files found in ${testsDir}. Expected files matching *.test.js`);
    }
    const allResults = [];
    for (const filePath of testFilePaths) {
        const relativeFile = path_1.default.relative(cwd, filePath);
        const tests = await loadTestsFromFile(filePath);
        if (tests.length === 0) {
            console.warn(`No tests exported from ${relativeFile}. Expected: module.exports = { tests: [...] }`);
            continue;
        }
        for (const test of tests) {
            console.log(`Running ${test.name} (${relativeFile}) ...`);
            const result = await (0, core_1.runTest)(test.name, test.fn);
            allResults.push(result);
            const statusLabel = result.status === "passed" ? "PASSED" : "FAILED";
            console.log(` -> ${statusLabel} in ${result.durationMs}ms`);
            if (result.errors.length > 0) {
                for (const error of result.errors) {
                    console.error(`    ${error}`);
                }
            }
        }
    }
    await (0, reporter_1.writeResults)(allResults);
}
main().catch((err) => {
    console.error("Error running tests:", err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map