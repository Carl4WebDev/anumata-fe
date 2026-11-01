/**
 * Copy MediaPipe's face-detection WASM runtime from node_modules into
 * public/mediapipe/wasm, so the interview room loads it from our own site
 * (no request to Google's CDN during an interview).
 *
 * Runs after `npm install`. The files are ~25 MB, so they're git-ignored and
 * re-created here instead of committed. Only the two variants the library
 * actually loads are copied (with and without SIMD, for older devices).
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "mediapipe", "wasm");
const FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

if (!existsSync(from)) {
  console.warn("[copy-mediapipe] @mediapipe/tasks-vision is not installed — skipping.");
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const file of FILES) copyFileSync(join(from, file), join(to, file));
console.log(`[copy-mediapipe] Copied ${FILES.length} files to public/mediapipe/wasm`);
