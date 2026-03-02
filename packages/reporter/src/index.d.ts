import type { TestResult } from "@mytest/core";
export interface ReporterOptions {
    outputDir?: string;
    filename?: string;
}
export declare function writeResults(results: TestResult[], options?: ReporterOptions): Promise<string>;
