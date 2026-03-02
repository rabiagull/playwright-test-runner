import { type Page } from "playwright";
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
export declare function runTest(testName: string, fn: TestFn): Promise<TestResult>;
