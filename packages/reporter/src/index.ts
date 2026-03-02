import fs from "fs/promises";
import path from "path";
import type { TestResult } from "@mytest/core";

export interface ReporterOptions {
  outputDir?: string;
  filename?: string;
}

const DEFAULT_RESULTS_DIR = "results";
const DEFAULT_RESULTS_FILE = "results.json";

export async function writeResults(
  results: TestResult[],
  options: ReporterOptions = {}
): Promise<string> {
  const outputDir = path.resolve(process.cwd(), options.outputDir ?? DEFAULT_RESULTS_DIR);
  const filename = options.filename ?? DEFAULT_RESULTS_FILE;
  const filePath = path.join(outputDir, filename);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");

  return filePath;
}
