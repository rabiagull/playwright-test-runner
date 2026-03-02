"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeResults = writeResults;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const DEFAULT_RESULTS_DIR = "results";
const DEFAULT_RESULTS_FILE = "results.json";
async function writeResults(results, options = {}) {
    var _a, _b;
    const outputDir = path_1.default.resolve(process.cwd(), (_a = options.outputDir) !== null && _a !== void 0 ? _a : DEFAULT_RESULTS_DIR);
    const filename = (_b = options.filename) !== null && _b !== void 0 ? _b : DEFAULT_RESULTS_FILE;
    const filePath = path_1.default.join(outputDir, filename);
    await promises_1.default.mkdir(outputDir, { recursive: true });
    await promises_1.default.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");
    return filePath;
}
//# sourceMappingURL=index.js.map