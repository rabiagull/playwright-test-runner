#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { runTest, type TestFn, type TestResult } from "@mytest/core";
import { writeResults } from "@mytest/reporter";

interface DiscoveredTest {
  name: string;
  fn: TestFn;
}

async function discoverTestFiles(testsDir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(testsDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(path.join(testsDir, entry.name));
    }
  }

  return files;
}

async function loadTestsFromFile(filePath: string): Promise<DiscoveredTest[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(filePath) as { tests?: unknown };
  const rawTests = Array.isArray(mod.tests) ? mod.tests : [];
  const result: DiscoveredTest[] = [];

  for (const t of rawTests) {
    if (!t || typeof t !== "object") {
      continue;
    }

    const anyTest = t as { name?: unknown; fn?: unknown };
    const name = anyTest.name;
    const fn = anyTest.fn;

    if (typeof name === "string" && typeof fn === "function") {
      result.push({ name, fn: fn as TestFn });
    }
  }

  return result;
}

async function main(): Promise<void> {
  const [, , command] = process.argv;

  if (command !== "run") {
    console.log("Usage: mytest run");
    process.exit(1);
  }

  const cwd = process.cwd();
  const testsDir = path.resolve(cwd, "tests");

  if (!fs.existsSync(testsDir)) {
    console.error(`Tests directory not found: ${testsDir}`);
    process.exit(1);
  }

  const testFilePaths = await discoverTestFiles(testsDir);

  if (testFilePaths.length === 0) {
    console.warn(`No test files found in ${testsDir}. Expected files matching *.test.js`);
  }

  const allResults: TestResult[] = [];

  for (const filePath of testFilePaths) {
    const relativeFile = path.relative(cwd, filePath);
    const tests = await loadTestsFromFile(filePath);

    if (tests.length === 0) {
      console.warn(
        `No tests exported from ${relativeFile}. Expected: module.exports = { tests: [...] }`
      );
      continue;
    }

    for (const test of tests) {
      console.log(`Running ${test.name} (${relativeFile}) ...`);
      const result = await runTest(test.name, test.fn);
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

  await writeResults(allResults);
}

main().catch((err: unknown) => {
  console.error("Error running tests:", err);
  process.exit(1);
});

